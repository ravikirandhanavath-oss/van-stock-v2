using { VanStockProfile } from './vanstock-service';

// Bulk Return / Leaver scenarios, fed from the Upload Profile dialog.
// Rows use the same Excel layout as the profile upload:
//   Engineer ID | Profit Center | Part Number | Quantity | Value
//   - Return : Engineer ID, Part Number, Quantity (= quantity returned)
//   - Leaver : Engineer ID only
extend service VanStockProfile with {

    action uploadReturns(rows : array of VanStockProfile.VanStockRow) returns {
        successCount : Integer;
        failCount    : Integer;
    };

    action uploadLeavers(rows : array of VanStockProfile.VanStockRow) returns {
        successCount : Integer;
        failCount    : Integer;
    };
}
