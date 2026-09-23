using VanStockProfile as service from '../../srv/vanstock-service';
using from '../../srv/line-select';

annotate service.ProfileLine with @(
    // ticking "Select" re-reads the field control -> fields unlock / lock
    Common.SideEffects #LineSelect : {
        SourceProperties : [ selected ],
        TargetProperties : [ 'lineFieldControl' ]
    }
);

annotate service.ProfileLine with {
    selected         @title: 'Select';
    lineFieldControl @UI.Hidden @Core.Computed;
    partNumber       @Common.FieldControl: lineFieldControl;
    productGroup     @Common.FieldControl: lineFieldControl;
    productStatus    @Common.FieldControl: lineFieldControl;
    quantity         @Common.FieldControl: lineFieldControl;
    baseUOM          @Common.FieldControl: lineFieldControl;
    value            @Common.FieldControl: lineFieldControl;
};
