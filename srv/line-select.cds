using { vanstock } from '../db/vanstock-header';

// Enable On Select (23-Sep call): a line on the Object Page is read-only in
// edit mode until the user ticks its "Select" box.
//   selected         - the tick box (draft only, reset to false on Save)
//   lineFieldControl - 1 = read-only, 7 = editable (Common.FieldControl)
extend vanstock.VanStockProfileLine with {
    selected         : Boolean default false;
    lineFieldControl : Integer default 1;
}
