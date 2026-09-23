const cds = require("@sap/cds");

/**
 * Batched upsert of profile lines.
 *
 * The previous per-row implementation issued 4-5 awaited statements for EVERY
 * row, which on HANA blows the per-connection prepared-statement cap:
 *   "exceed maximum number of prepared statements"
 *
 * This version folds the whole batch in memory and issues a small, fixed
 * number of statements regardless of how many rows come in:
 *   1 SELECT  - all headers for the distinct engineer ids
 *   1 INSERT  - any missing headers
 *   1 SELECT  - all existing lines belonging to those headers
 *   1 INSERT  - all new lines
 *   n UPDATE  - only lines that already existed in the DB (same statement
 *               shape each time, so the driver reuses one prepared statement)
 *   1 INSERT  - all change-log entries
 *
 * Rows arriving in the same batch for the same engineer + part number are
 * accumulated in memory first, so the totals match the old row-by-row
 * behaviour exactly.
 *
 * @param {object}  args
 * @param {object}  args.ProfileHeader  CDS entity
 * @param {object}  args.ProfileLine    CDS entity
 * @param {object}  args.ChangeLog      CDS entity
 * @param {Array}   args.rows           [{ engineerId, businessUnit, productGroup,
 *                                         productStatus, partNumber, quantity,
 *                                         baseUOM, value }]
 * @param {string}  args.userId
 */
async function upsertProfileLines({ ProfileHeader, ProfileLine, ChangeLog, rows, userId }) {
    if (!rows || rows.length === 0) return;

    const dNow = new Date();
    const sDate = dNow.toISOString().slice(0, 10);
    const sTime = dNow.toISOString().slice(11, 19);

    // ---------------------------------------------------- 1. headers: read
    const aEngineerIds = [...new Set(rows.map(r => String(r.engineerId)))];

    const aExistingHeaders = await SELECT.from(ProfileHeader)
        .where({ engineerId: { in: aEngineerIds } });

    const mHeaderByEngineer = new Map(
        aExistingHeaders.map(h => [String(h.engineerId), h])
    );

    // --------------------------------------------------- 2. headers: create
    const aNewHeaders = [];
    for (const sEngineerId of aEngineerIds) {
        if (mHeaderByEngineer.has(sEngineerId)) continue;

        const oFirstRow = rows.find(r => String(r.engineerId) === sEngineerId);
        const oHeader = {
            ID: cds.utils.uuid(),
            engineerId: sEngineerId,
            businessUnit: oFirstRow && oFirstRow.businessUnit != null
                ? String(oFirstRow.businessUnit)
                : '',
            dateCreated: sDate,
            status: 'Active'
        };
        aNewHeaders.push(oHeader);
        mHeaderByEngineer.set(sEngineerId, oHeader);
    }
    if (aNewHeaders.length > 0) {
        await INSERT.into(ProfileHeader).entries(aNewHeaders);
    }

    // ------------------------------------------------------ 3. lines: read
    const aHeaderIds = [...mHeaderByEngineer.values()].map(h => h.ID);

    const aExistingLines = await SELECT.from(ProfileLine)
        .where({ header_ID: { in: aHeaderIds } });

    const mLineByKey = new Map(
        aExistingLines.map(l => [l.header_ID + '|' + String(l.partNumber), l])
    );

    // --------------------------------------------- 4. fold the batch in RAM
    const aNewLines = [];
    const setNewLineIds = new Set();
    const mUpdates = new Map();       // existing line ID -> { quantity, value }
    const aChangeLogs = [];

    for (const r of rows) {
        const sEngineerId = String(r.engineerId);
        const oHeader = mHeaderByEngineer.get(sEngineerId);
        if (!oHeader) continue;

        const sPartNumber = String(r.partNumber);
        const sKey = oHeader.ID + '|' + sPartNumber;

        const nQty = Number(r.quantity);
        const nVal = Number(r.value);

        const oExisting = mLineByKey.get(sKey);

        if (!oExisting) {
            const oLine = {
                ID: cds.utils.uuid(),
                header_ID: oHeader.ID,
                productGroup: r.productGroup || '',
                productStatus: r.productStatus || '',
                partNumber: sPartNumber,
                quantity: nQty,
                baseUOM: r.baseUOM || '',
                value: nVal
            };
            aNewLines.push(oLine);
            setNewLineIds.add(oLine.ID);
            mLineByKey.set(sKey, oLine);   // later rows accumulate onto it

            aChangeLogs.push({
                ID: cds.utils.uuid(),
                changeDate: sDate, changeTime: sTime, userId, engineerId: sEngineerId,
                transactionType: 'AD',
                beforeQuantity: 0, beforeValue: 0,
                afterQuantity: nQty, afterValue: nVal,
                afterBusinessUnit: oHeader.businessUnit,
                afterProductGroup: oLine.productGroup,
                afterProductStatus: oLine.productStatus,
                afterPartNumber: sPartNumber,
                afterBaseUOM: oLine.baseUOM
            });
        } else {
            const nBeforeQty = Number(oExisting.quantity) || 0;
            const nBeforeVal = Number(oExisting.value) || 0;
            const nNewQty = nBeforeQty + nQty;
            const nNewVal = nBeforeVal + nVal;

            oExisting.quantity = nNewQty;
            oExisting.value = nNewVal;

            // Lines created in THIS batch are still pending insert - their
            // accumulated values go in with the INSERT, so no UPDATE needed.
            if (!setNewLineIds.has(oExisting.ID)) {
                mUpdates.set(oExisting.ID, { quantity: nNewQty, value: nNewVal });
            }

            aChangeLogs.push({
                ID: cds.utils.uuid(),
                changeDate: sDate, changeTime: sTime, userId, engineerId: sEngineerId,
                transactionType: 'AD',
                beforeBusinessUnit: oHeader.businessUnit,
                beforeProductGroup: oExisting.productGroup,
                beforeProductStatus: oExisting.productStatus,
                beforePartNumber: sPartNumber,
                beforeQuantity: nBeforeQty, beforeValue: nBeforeVal,
                beforeBaseUOM: oExisting.baseUOM,
                afterBusinessUnit: oHeader.businessUnit,
                afterProductGroup: oExisting.productGroup,
                afterProductStatus: oExisting.productStatus,
                afterPartNumber: sPartNumber,
                afterQuantity: nNewQty, afterValue: nNewVal,
                afterBaseUOM: oExisting.baseUOM
            });
        }
    }

    // ------------------------------------------------------- 5. bulk writes
    if (aNewLines.length > 0) {
        await INSERT.into(ProfileLine).entries(aNewLines);
    }

    for (const [sId, oVals] of mUpdates) {
        await UPDATE(ProfileLine).set(oVals).where({ ID: sId });
    }

    if (aChangeLogs.length > 0) {
        await INSERT.into(ChangeLog).entries(aChangeLogs);
    }
}

/**
 * Backwards-compatible single-row wrapper. Prefer upsertProfileLines() -
 * calling this in a loop reintroduces the prepared-statement problem.
 */
async function upsertProfileLine({
    ProfileHeader, ProfileLine, ChangeLog,
    engineerId, businessUnit, productGroup, productStatus,
    partNumber, quantity, baseUOM, value, userId
}) {
    return upsertProfileLines({
        ProfileHeader, ProfileLine, ChangeLog,
        userId,
        rows: [{
            engineerId, businessUnit, productGroup, productStatus,
            partNumber, quantity, baseUOM, value
        }]
    });
}

module.exports = { upsertProfileLine, upsertProfileLines };
