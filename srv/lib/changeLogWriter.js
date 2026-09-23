const cds = require("@sap/cds");

/**
 * Change log for edits made on the Object Page (draft Edit -> Save) and for
 * profile deletes.
 *
 * The change log is APPEND-ONLY: every change becomes a new row; nothing is
 * ever updated or deleted. The profile tables keep one current record per
 * engineer/part, the change log keeps the full history (03-Sep / 23-Sep calls).
 *
 * Transaction types written here:
 *   AD  line added (same code as profile additions from upload)
 *   ED  line or header changed (quantity, value, product group/status, UoM,
 *       part number, business unit, status)
 *   DL  line removed, or whole profile deleted
 * Upload/Return/Leaver keep their own codes (AD / RE / LV).
 */

const LINE_FIELDS = ['partNumber', 'productGroup', 'productStatus', 'quantity', 'baseUOM', 'value'];
const NUMERIC = new Set(['quantity', 'value']);

function stamp() {
    const d = new Date();
    return { sDate: d.toISOString().slice(0, 10), sTime: d.toISOString().slice(11, 19) };
}

function norm(sField, v) {
    if (v === null || v === undefined || v === '') return NUMERIC.has(sField) ? 0 : '';
    return NUMERIC.has(sField) ? Number(v) : String(v);
}

function lineChanged(a, b) {
    return LINE_FIELDS.some(f => norm(f, a[f]) !== norm(f, b[f]));
}

function before(l, sBU) {
    return {
        beforeBusinessUnit: sBU,
        beforeProductGroup: l.productGroup, beforeProductStatus: l.productStatus,
        beforePartNumber: l.partNumber, beforeQuantity: l.quantity,
        beforeBaseUOM: l.baseUOM, beforeValue: l.value
    };
}

function after(l, sBU) {
    return {
        afterBusinessUnit: sBU,
        afterProductGroup: l.productGroup, afterProductStatus: l.productStatus,
        afterPartNumber: l.partNumber, afterQuantity: l.quantity,
        afterBaseUOM: l.baseUOM, afterValue: l.value
    };
}

function db() {
    const e = cds.entities('vanstock');
    return { Header: e.VanStockProfileHeader, Line: e.VanStockProfileLine, ChangeLog: e.ChangeLogs };
}

/**
 * Compare the draft being activated (req.data, deep incl. lines) with the
 * active record currently in the DB and write one change log row per
 * difference. Call from before('SAVE', ProfileHeader).
 */
async function logDraftActivate(req) {
    const E = db();
    const oNew = req.data || {};
    if (!oNew.ID) return;

    const oOld = await SELECT.one.from(E.Header).where({ ID: oNew.ID });
    const aOldLines = oOld ? await SELECT.from(E.Line).where({ header_ID: oNew.ID }) : [];

    // lines may be missing from req.data if the composition was not touched
    let aNewLines = oNew.lines;
    if (!Array.isArray(aNewLines)) aNewLines = aOldLines;

    const userId = req.user ? req.user.id : 'unknown';
    const { sDate, sTime } = stamp();
    const sEngineer = String(oNew.engineerId ?? (oOld && oOld.engineerId) ?? '');
    const sNewBU = oNew.businessUnit ?? (oOld && oOld.businessUnit) ?? '';
    const sOldBU = oOld ? oOld.businessUnit : '';
    const base = tx => ({
        ID: cds.utils.uuid(), changeDate: sDate, changeTime: sTime,
        userId, engineerId: sEngineer, transactionType: tx
    });

    const aLogs = [];

    // ---- header-level changes (business unit / status) on an existing profile
    if (oOld) {
        const bBU = norm('x', oOld.businessUnit) !== norm('x', sNewBU);
        const bStatus = oNew.status !== undefined && norm('x', oOld.status) !== norm('x', oNew.status);
        if (bBU || bStatus) {
            aLogs.push({
                ...base('ED'),
                beforeBusinessUnit: oOld.businessUnit, afterBusinessUnit: sNewBU,
                // status has no dedicated column - recorded in product status
                // fields only when it is the thing that changed
                ...(bStatus ? { beforeProductStatus: oOld.status, afterProductStatus: oNew.status } : {})
            });
        }
    }

    // ---- line-level changes
    const mOld = new Map(aOldLines.map(l => [l.ID, l]));
    const setSeen = new Set();

    for (const l of aNewLines) {
        const oPrev = l.ID ? mOld.get(l.ID) : undefined;
        if (!oPrev) {
            aLogs.push({ ...base('AD'), beforeQuantity: 0, beforeValue: 0, ...after(l, sNewBU) });
        } else {
            setSeen.add(l.ID);
            if (lineChanged(oPrev, l)) {
                aLogs.push({ ...base('ED'), ...before(oPrev, sOldBU), ...after(l, sNewBU) });
            }
        }
    }
    for (const oPrev of aOldLines) {
        if (!setSeen.has(oPrev.ID)) {
            aLogs.push({ ...base('DL'), ...before(oPrev, sOldBU), afterQuantity: 0, afterValue: 0 });
        }
    }

    if (aLogs.length) await INSERT.into(E.ChangeLog).entries(aLogs);
}

/** Deleting an active profile: log every line as DL. Call from before('DELETE'). */
async function logProfileDelete(req) {
    const E = db();
    const sId = req.data && req.data.ID;
    if (!sId) return;
    const oOld = await SELECT.one.from(E.Header).where({ ID: sId });
    if (!oOld) return;
    const aOldLines = await SELECT.from(E.Line).where({ header_ID: sId });
    const userId = req.user ? req.user.id : 'unknown';
    const { sDate, sTime } = stamp();

    const aLogs = (aOldLines.length ? aOldLines : [{}]).map(l => ({
        ID: cds.utils.uuid(), changeDate: sDate, changeTime: sTime,
        userId, engineerId: oOld.engineerId, transactionType: 'DL',
        ...before(l, oOld.businessUnit), afterQuantity: 0, afterValue: 0
    }));
    await INSERT.into(E.ChangeLog).entries(aLogs);
}

module.exports = { logDraftActivate, logProfileDelete };
