sap.ui.define([
    "sap/ui/core/mvc/ControllerExtension"
], function (ControllerExtension) {
    "use strict";

    /**
     * Enable On Select (23-Sep call).
     * In edit mode a line item is read-only until its row checkbox is ticked.
     * Ticking / unticking the standard table selection writes the draft field
     * "selected"; the backend turns that into the line's field control
     * (7 = editable, 1 = read-only) and the side effect refreshes the fields.
     */
    return ControllerExtension.extend("com.vanstockv2.ext.controller.ObjectPageExt", {
        override: {
            onAfterRendering: function () { this._hookLineTable(); },
            routing: {
                onAfterBinding: function () { this._hookLineTable(); }
            }
        },

        _hookLineTable: function () {
            var oView = this.base.getView();
            var aTables = oView.findAggregatedObjects(true, function (oCtrl) {
                return oCtrl.isA && oCtrl.isA("sap.ui.mdc.Table") && oCtrl.getId().indexOf("lines") !== -1;
            });
            aTables.forEach(function (oTable) {
                if (oTable.data("vsLineSelectHooked")) { return; }
                oTable.data("vsLineSelectHooked", true);
                oTable.attachSelectionChange(this._onLineSelectionChange, this);
            }, this);
        },

        _onLineSelectionChange: function (oEvent) {
            var oTable = oEvent.getSource();
            var oBinding = oTable.getRowBinding && oTable.getRowBinding();
            if (!oBinding) { return; }
            var aSelected = oTable.getSelectedContexts();

            oBinding.getAllCurrentContexts().forEach(function (oCtx) {
                if (oCtx.getProperty("IsActiveEntity") !== false) { return; }   // edit mode only
                var bSelected = aSelected.indexOf(oCtx) !== -1;
                if (!!oCtx.getProperty("selected") === bSelected) { return; }
                oCtx.setProperty("selected", bSelected).then(function () {
                    return oCtx.requestSideEffects([{ $PropertyPath: "lineFieldControl" }]);
                }).catch(function () { /* message shown by FE */ });
            });
        }
    });
});
