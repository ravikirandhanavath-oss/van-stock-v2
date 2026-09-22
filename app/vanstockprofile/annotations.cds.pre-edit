using VanStockProfile as service from '../../srv/vanstock-service';

annotate service.VanStockProfile with @(
    UI.FieldGroup #GeneratedGroup : {
        $Type : 'UI.FieldGroupType',
        Data : [
            {
                $Type : 'UI.DataField',
                Label : 'createdOn',
                Value : createdOn,
            },
            {
                $Type : 'UI.DataField',
                Label : 'engineerId',
                Value : engineerId,
            },
            {
                $Type : 'UI.DataField',
                Label : 'profitCenter',
                Value : profitCenter,
            },
            {
                $Type : 'UI.DataField',
                Label : 'partNumber',
                Value : partNumber,
            },
            {
                $Type : 'UI.DataField',
                Label : 'quantity',
                Value : quantity,
            },
            {
                $Type : 'UI.DataField',
                Label : 'value',
                Value : value,
            },
        ],
    },
    UI.Facets : [
        {
            $Type : 'UI.ReferenceFacet',
            ID : 'GeneratedFacet1',
            Label : 'General Information',
            Target : '@UI.FieldGroup#GeneratedGroup',
        },
    ],
    UI.LineItem : [
        {
            $Type : 'UI.DataField',
            Label : 'createdOn',
            Value : createdOn,
        },
        {
            $Type : 'UI.DataField',
            Label : 'engineerId',
            Value : engineerId,
        },
        {
            $Type : 'UI.DataField',
            Label : 'profitCenter',
            Value : profitCenter,
        },
        {
            $Type : 'UI.DataField',
            Label : 'partNumber',
            Value : partNumber,
        },
        {
            $Type : 'UI.DataField',
            Label : 'quantity',
            Value : quantity,
        },
    ],
);
annotate service.ProfileHeader with @(
    UI.LineItem: [
        { Value: engineerId,   Label: 'Engineer ID' },
        { Value: businessUnit, Label: 'Business Unit' },
        { Value: status,       Label: 'Status' },
        { Value: dateCreated,  Label: 'Date Created' }
    ],
    UI.Facets: [{
        $Type: 'UI.ReferenceFacet',
        Label: 'Line Items',
        Target: 'lines/@UI.LineItem'
    }],
);

annotate service.ProfileLine with @(
    UI.LineItem: [
        { Value: partNumber,    Label: 'Part Number' },
        { Value: productGroup,  Label: 'Product Group' },
        { Value: productStatus, Label: 'Status' },
        { Value: quantity,      Label: 'Quantity' },
        { Value: baseUOM,       Label: 'UOM' },
        { Value: value,         Label: 'Value' }
    ]
);