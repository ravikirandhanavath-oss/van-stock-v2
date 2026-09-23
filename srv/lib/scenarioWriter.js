const cds = require("@sap/cds");

/**
 * Bulk RETURN and LEAVER uploads - FS "Van Stock Profiles (R2R.04.05) v2",
 * section 2.5.2 Returns, plus the 03-Sep clarification call.
 *
 * FS 2.5.2 step 5: "The file should indicate whether it relates to a leaver
 * or not" -> the Return / Leaver radio button on the upload dialog.
 *
 * RETURN (not a leaver), step 6:
 *   Decrement the engineer's existing profile lines per the Excel, write the
 *   change log. Errors (row goes to the upload/error log, others continue):
 *     - blank engineer / part / quantity, quantity <= 0
 *     - no profile for engineer, or profile is Leaver/Closed
 *     - part not in the engineer's existing inventory
 *     - quantity exceeds available stock
 *   Value: the value column if given (Finance adds it at current MAP, step 3),
 *   otherwise MAP of the profile line (value / quantity) x returned quantity.
 *
 * LEAVER, steps 7-9 (+ "100% write-off for leavers", v2 change history):
 *   7. Status -> Leaver, archive snapshot of the profile
 *   8. Decrement parts and quantities per Excel -> change log
 *   9. Write off whatever remains (100%) -> change log, status -> Closed,
 *      archive final snapshot
 *   A row with just an Engineer ID (no part) is allowed: it triggers 7 + 9
 *   with no returned parts, i.e. a full write-off.
 *
 * Everything is set-based (a fixed number of statements per request) so it
 * cannot hit the HANA "exceed maximum number of prepared statements" limit.
 * Every input row gets an UploadLog entry, posted = true so "Post All" never
 * re-adds returned stock as a profile addition.
 */

const TX_RETURN = 'RE';
const TX_LEAVER = 'LV';
const CLOSED_STATUSES = ['Leaver', 'Closed'];

function db() {
    // DB-level entities - bypasses the draft layer on ProfileHeader
    const e = cds.entities('vanstock');
    return {
        Header: e.VanStockProfileHeader,
        Line: e.VanStockProfileLine,
        ArchiveHeader: e.ArchiveHeaders,
        ArchiveLine: e.ArchiveLines,
        ChangeLog: e.ChangeLogs,
        UploadLog: e.UploadLogs
    };
}

function stamp() {
    const d = new Date();
    return { dNow: d, sDate: d.toISOString().slice(0, 10), sTime: d.toISOString().slice(11, 19) };
}

const str = v => (v === null || v === undefined ? '' : String(v).trim());
const isBlank = v => v === null || v === undefined || String(v).trim() === '';
const round2 = n => Math.round((Number(n) || 0) * 100) / 100;

function logEntry(oRow, dNow, sUser, sError, sOkRemark) {
    return {
        ID: cds.utils.uuid(),
        uploadedOn: dNow,
        uploadedBy: sUser,
        rowNumber: oRow.rowNumber,
        engineerId: oRow.engineerId || null,
        profitCenter: oRow.profitCenter || null,
        partNumber: oRow.partNumber || null,
        quantity: oRow.quantity,
        value: oRow.value,
        status: sError ? 'Failed' : 'Success',
        remark: (sError || sOkRemark || '').slice(0, 200),
        posted: true
    };
}

/** Load headers + lines for the engineers in the file (2 statements). */
async function loadProfiles(E, rows) {
    const aEngineerIds = [...new Set(rows.map(r => str(r.engineerId)).filter(Boolean))];
    const aHeaders = aEngineerIds.length
        ? await SELECT.from(E.Header).where({ engineerId: { in: aEngineerIds } })
        : [];
    const aLines = aHeaders.length
        ? await SELECT.from(E.Line).where({ header_ID: { in: aHeaders.map(h => h.ID) } })
        : [];
    return {
        mHeader: new Map(aHeaders.map(h => [str(h.engineerId), h])),
        mLine: new Map(aLines.map(l => [l.header_ID + '|' + str(l.partNumber), l])),
        aLines
    };
}

/**
 * Validate one return row against the running balance and apply it in memory.
 * Returns an error string, or null on success (and pushes the change log).
 */
function applyReturn(r, oHeader, mLine, mChanged, aChangeLogs, ctx, sTx) {
    const sEng = str(r.engineerId);
    const sPart = str(r.partNumber);
    const nQty = Number(r.quantity);

    if (isBlank(r.quantity) || isNaN(nQty)) return 'Quantity is blank';
    if (nQty <= 0) return 'Quantity must be greater than 0';

    const oLine = mLine.get(oHeader.ID + '|' + sPart);
    if (!oLine) return `Part ${sPart} not in engineer ${sEng}'s inventory`;

    const nBeforeQty = Number(oLine.quantity) || 0;
    const nBeforeVal = Number(oLine.value) || 0;
    if (nQty > nBeforeQty) return `Quantity ${nQty} exceeds available stock ${nBeforeQty} for part ${sPart}`;

    // Value: from the file (Finance, at MAP) or MAP of the line x qty
    let nVal;
    if (!isBlank(r.value) && !isNaN(Number(r.value))) {
        nVal = Number(r.value);
    } else {
        nVal = nBeforeQty > 0 ? (nBeforeVal / nBeforeQty) * nQty : 0;
    }

    const nAfterQty = nBeforeQty - nQty;
    const nAfterVal = nAfterQty === 0 ? 0 : Math.max(0, round2(nBeforeVal - nVal));

    oLine.quantity = nAfterQty;
    oLine.value = nAfterVal;
    mChanged.set(oLine.ID, oLine);

    aChangeLogs.push({
        ID: cds.utils.uuid(),
        changeDate: ctx.sDate, changeTime: ctx.sTime, userId: ctx.userId, engineerId: sEng,
        transactionType: sTx,
        beforePartNumber: sPart, beforeQuantity: nBeforeQty, beforeValue: nBeforeVal,
        beforeProductGroup: oLine.productGroup, beforeProductStatus: oLine.productStatus,
        beforeBaseUOM: oLine.baseUOM,
        afterPartNumber: sPart, afterQuantity: nAfterQty, afterValue: nAfterVal,
        afterProductGroup: oLine.productGroup, afterProductStatus: oLine.productStatus,
        afterBaseUOM: oLine.baseUOM
    });
    return null;
}

function linesToUpsert(mChanged) {
    return [...mChanged.values()].map(l => ({
        ID: l.ID,
        header_ID: l.header_ID,
        productGroup: l.productGroup,
        productStatus: l.productStatus,
        partNumber: l.partNumber,
        quantity: l.quantity,
        baseUOM: l.baseUOM,
        value: l.value
    }));
}

// ================================================================= RETURNS
async function processReturns({ rows, userId }) {
    const E = db();
    const ctx = { ...stamp(), userId };
    const { mHeader, mLine } = await loadProfiles(E, rows);

    const mChanged = new Map();
    const aChangeLogs = [];
    const aLogs = [];
    let iOk = 0;

    for (const r of rows) {
        const sEng = str(r.engineerId);
        const oHeader = mHeader.get(sEng);
        let sErr = null;

        if (!sEng) sErr = 'Engineer ID is blank';
        else if (isBlank(r.partNumber)) sErr = 'Part number is blank';
        else if (!oHeader) sErr = `No profile found for engineer ${sEng}`;
        else if (CLOSED_STATUSES.includes(oHeader.status))
            sErr = `Engineer ${sEng} profile is ${oHeader.status} (leaver) - returns not allowed`;
        else sErr = applyReturn(r, oHeader, mLine, mChanged, aChangeLogs, ctx, TX_RETURN);

        if (!sErr) iOk++;
        aLogs.push(logEntry(r, ctx.dNow, userId, sErr, `Return: ${Number(r.quantity)} of ${str(r.partNumber)} decremented`));
    }

    if (mChanged.size) await UPSERT.into(E.Line).entries(linesToUpsert(mChanged));
    if (aChangeLogs.length) await INSERT.into(E.ChangeLog).entries(aChangeLogs);
    if (aLogs.length) await INSERT.into(E.UploadLog).entries(aLogs);

    return { successCount: iOk, failCount: rows.length - iOk };
}

// ================================================================= LEAVERS
function archiveSnapshot(oHeader, aLines, sStatus, ctx, aArchiveHeaders, aArchiveLines) {
    const sId = cds.utils.uuid();
    aArchiveHeaders.push({
        ID: sId,
        dateArchived: ctx.sDate, timeArchived: ctx.sTime,
        dateCreated: oHeader.dateCreated, engineerId: oHeader.engineerId,
        businessUnit: oHeader.businessUnit, status: sStatus
    });
    for (const l of aLines) {
        aArchiveLines.push({
            ID: cds.utils.uuid(),
            archiveHeader_ID: sId,
            productGroup: l.productGroup, productStatus: l.productStatus,
            partNumber: l.partNumber, quantity: l.quantity,
            baseUOM: l.baseUOM, value: l.value
        });
    }
}

async function processLeavers({ rows, userId }) {
    const E = db();
    const ctx = { ...stamp(), userId };
    const { mHeader, mLine, aLines } = await loadProfiles(E, rows);

    // Engineers that can be processed as leavers in this file
    const mLeaver = new Map();          // engineerId -> header
    const mEngError = new Map();        // engineerId -> error for all its rows
    for (const r of rows) {
        const sEng = str(r.engineerId);
        if (!sEng || mLeaver.has(sEng) || mEngError.has(sEng)) continue;
        const oHeader = mHeader.get(sEng);
        if (!oHeader) mEngError.set(sEng, `No profile found for engineer ${sEng}`);
        else if (CLOSED_STATUSES.includes(oHeader.status))
            mEngError.set(sEng, `Engineer ${sEng} is already ${oHeader.status}`);
        else mLeaver.set(sEng, oHeader);
    }

    const mLinesByHeader = new Map();
    for (const l of aLines) {
        if (!mLinesByHeader.has(l.header_ID)) mLinesByHeader.set(l.header_ID, []);
        mLinesByHeader.get(l.header_ID).push(l);
    }

    const aArchiveHeaders = [];
    const aArchiveLines = [];

    // ---- Step 7: status Leaver + archive snapshot (before any change)
    for (const oHeader of mLeaver.values()) {
        archiveSnapshot(oHeader, (mLinesByHeader.get(oHeader.ID) || []).map(l => ({ ...l })),
            'Leaver', ctx, aArchiveHeaders, aArchiveLines);
    }

    // ---- Step 8: decrement parts and quantities per Excel
    const mChanged = new Map();
    const aChangeLogs = [];
    const aLogs = [];
    let iOk = 0;

    for (const r of rows) {
        const sEng = str(r.engineerId);
        let sErr = null;
        let sOk;

        if (!sEng) sErr = 'Engineer ID is blank';
        else if (mEngError.has(sEng)) sErr = mEngError.get(sEng);
        else if (isBlank(r.partNumber)) {
            sOk = 'Leaver: profile archived, stock written off and closed';
        } else {
            sErr = applyReturn(r, mLeaver.get(sEng), mLine, mChanged, aChangeLogs, ctx, TX_LEAVER);
            sOk = `Leaver: ${Number(r.quantity)} of ${str(r.partNumber)} returned`;
        }

        if (!sErr) iOk++;
        aLogs.push(logEntry(r, ctx.dNow, userId, sErr, sOk));
    }

    // ---- Step 9: write off the remainder (100%), archive final, close
    for (const oHeader of mLeaver.values()) {
        const aHeaderLines = mLinesByHeader.get(oHeader.ID) || [];
        // Final snapshot = residual being written off
        archiveSnapshot(oHeader, aHeaderLines.map(l => ({ ...l })), 'Closed', ctx, aArchiveHeaders, aArchiveLines);

        for (const l of aHeaderLines) {
            const nQty = Number(l.quantity) || 0;
            const nVal = Number(l.value) || 0;
            if (nQty === 0 && nVal === 0) continue;
            aChangeLogs.push({
                ID: cds.utils.uuid(),
                changeDate: ctx.sDate, changeTime: ctx.sTime, userId, engineerId: oHeader.engineerId,
                transactionType: TX_LEAVER,
                beforePartNumber: l.partNumber, beforeQuantity: nQty, beforeValue: nVal,
                beforeProductGroup: l.productGroup, beforeProductStatus: l.productStatus,
                beforeBaseUOM: l.baseUOM,
                afterPartNumber: l.partNumber, afterQuantity: 0, afterValue: 0,
                afterProductGroup: l.productGroup, afterProductStatus: l.productStatus,
                afterBaseUOM: l.baseUOM
            });
        }
    }

    const aHeaderIds = [...mLeaver.values()].map(h => h.ID);
    if (aArchiveHeaders.length) await INSERT.into(E.ArchiveHeader).entries(aArchiveHeaders);
    if (aArchiveLines.length) await INSERT.into(E.ArchiveLine).entries(aArchiveLines);
    if (aHeaderIds.length) {
        // step 8 + 9 net effect: every line of a leaver ends at 0 / 0
        await UPDATE(E.Line).set({ quantity: 0, value: 0 }).where({ header_ID: { in: aHeaderIds } });
        await UPDATE(E.Header).set({ status: 'Closed' }).where({ ID: { in: aHeaderIds } });
    }
    if (aChangeLogs.length) await INSERT.into(E.ChangeLog).entries(aChangeLogs);
    if (aLogs.length) await INSERT.into(E.UploadLog).entries(aLogs);

    return { successCount: iOk, failCount: rows.length - iOk };
}

module.exports = { processReturns, processLeavers };
