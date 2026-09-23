using VanStockProfile as service from '../../srv/vanstock-service';
using from '../../srv/changelog';

annotate service.ChangeLog with @(
    UI.PresentationVariant : {
        SortOrder      : [
            { Property: changeDate, Descending: true },
            { Property: changeTime, Descending: true }
        ],
        Visualizations : [ '@UI.LineItem' ]
    },
    UI.LineItem : [
        { Value: changeDate,         Label: 'Date' },
        { Value: changeTime,         Label: 'Time' },
        { Value: userId,             Label: 'User' },
        { Value: transactionType,    Label: 'Type' },
        { Value: beforePartNumber,   Label: 'Part (Before)' },
        { Value: afterPartNumber,    Label: 'Part (After)' },
        { Value: beforeQuantity,     Label: 'Qty (Before)' },
        { Value: afterQuantity,      Label: 'Qty (After)' },
        { Value: beforeValue,        Label: 'Value (Before)' },
        { Value: afterValue,         Label: 'Value (After)' },
        { Value: beforeBusinessUnit, Label: 'BU (Before)' },
        { Value: afterBusinessUnit,  Label: 'BU (After)' },
        { Value: beforeProductGroup, Label: 'Prod Grp (Before)' },
        { Value: afterProductGroup,  Label: 'Prod Grp (After)' },
        { Value: beforeProductStatus, Label: 'Prod Sts (Before)' },
        { Value: afterProductStatus,  Label: 'Prod Sts (After)' }
    ]
);

annotate service.ChangeLog with {
    ID @UI.Hidden;
};
