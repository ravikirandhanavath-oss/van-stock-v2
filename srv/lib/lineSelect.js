const cds = require("@sap/cds");

/**
 * Enable On Select for Object Page line items (23-Sep call).
 *  - Edit:        all copied lines start locked   (selected=false, FC=1)
 *  - New line:    starts selected and editable     (selected=true,  FC=7)
 *  - Tick/untick: FC follows the tick box; untick keeps edits, just locks
 *  - Server-side: changes to a line that is not selected are rejected
 *  - Save:        tick boxes are reset so the active data stays clean
 */
const EDITABLE = 7, READONLY = 1;
const LINE_FIELDS = ['partNumber', 'productGroup', 'productStatus', 'quantity', 'baseUOM', 'value'];

module.exports = function registerLineSelect(srv) {
    const { ProfileHeader, ProfileLine } = srv.entities;

    // Edit pressed: lock every line of the new draft
    srv.after('EDIT', ProfileHeader, async (res) => {
        const sId = res && res.ID;
        if (!sId) return;
        await UPDATE(ProfileLine.drafts)
            .set({ selected: false, lineFieldControl: READONLY })
            .where({ header_ID: sId });
    });

    // New line added in the draft: editable straight away
    srv.before('NEW', ProfileLine.drafts, (req) => {
        req.data.selected = true;
        req.data.lineFieldControl = EDITABLE;
    });

    // Changes to a draft line
    srv.before('UPDATE', ProfileLine.drafts, async (req) => {
        const d = req.data || {};
        if ('selected' in d) {
            d.lineFieldControl = d.selected ? EDITABLE : READONLY;
        }
        const bTouchesFields = LINE_FIELDS.some(f => f in d);
        if (!bTouchesFields) return;

        let bSelected = d.selected;
        if (bSelected === undefined) {
            const sId = d.ID || (req.params && req.params[req.params.length - 1] &&
                (req.params[req.params.length - 1].ID || req.params[req.params.length - 1]));
            const oRow = sId ? await SELECT.one.from(ProfileLine.drafts).columns('selected').where({ ID: sId }) : null;
            bSelected = !!(oRow && oRow.selected);
        }
        if (!bSelected) {
            req.error(400, 'Select the line before changing it');
        }
    });

    // Save: clear the tick boxes so the active record never carries them
    srv.before('SAVE', ProfileHeader, (req) => {
        for (const l of (req.data && req.data.lines) || []) {
            l.selected = false;
            l.lineFieldControl = READONLY;
        }
    });
};
