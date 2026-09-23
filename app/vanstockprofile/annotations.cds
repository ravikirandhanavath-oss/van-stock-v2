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
    UI.HeaderInfo : {
        $Type          : 'UI.HeaderInfoType',
        TypeName       : 'Van Stock Profile',
        TypeNamePlural : 'Van Stock Profiles',
        Title          : { $Type: 'UI.DataField', Value: engineerId },
        Description    : { $Type: 'UI.DataField', Value: businessUnit }
    },

    UI.SelectionFields : [ engineerId, businessUnit, status ],

    UI.LineItem : [
        { $Type: 'UI.DataField', Value: engineerId,   Label: 'Engineer ID' },
        { $Type: 'UI.DataField', Value: businessUnit, Label: 'Business Unit' },
        { $Type: 'UI.DataField', Value: status,       Label: 'Status' },
        { $Type: 'UI.DataField', Value: dateCreated,  Label: 'Date Created' }
    ],

    UI.FieldGroup #HeaderData : {
        $Type : 'UI.FieldGroupType',
        Data  : [
            { $Type: 'UI.DataField', Value: engineerId,   Label: 'Engineer ID' },
            { $Type: 'UI.DataField', Value: businessUnit, Label: 'Business Unit' },
            { $Type: 'UI.DataField', Value: status,       Label: 'Status' },
            { $Type: 'UI.DataField', Value: dateCreated,  Label: 'Date Created' }
        ]
    },

    UI.Facets : [
        {
            $Type  : 'UI.ReferenceFacet',
            ID     : 'GeneralInfoFacet',
            Label  : 'General Information',
            Target : '@UI.FieldGroup#HeaderData'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID     : 'LineItemsFacet',
            Label  : 'Line Items',
            Target : 'lines/@UI.LineItem'
        },
        {
            $Type  : 'UI.ReferenceFacet',
            ID     : 'ChangeLogFacet',
            Label  : 'Change Log',
            Target : 'changeLogs/@UI.LineItem'
        }
    ]
);

annotate service.ProfileHeader with {
    ID           @UI.Hidden;
    engineerId   @title: 'Engineer ID' @mandatory;
    businessUnit @title: 'Business Unit';
    dateCreated  @title: 'Date Created';
    status       @title: 'Status';
};

annotate service.ProfileLine with @(
    UI.LineItem : [
        { $Type: 'UI.DataField', Value: partNumber,    Label: 'Part Number' },
        { $Type: 'UI.DataField', Value: productGroup,  Label: 'Product Group' },
        { $Type: 'UI.DataField', Value: productStatus, Label: 'Status' },
        { $Type: 'UI.DataField', Value: quantity,      Label: 'Quantity' },
        { $Type: 'UI.DataField', Value: baseUOM,       Label: 'UOM' },
        { $Type: 'UI.DataField', Value: value,         Label: 'Value' }
    ],

    UI.FieldGroup #LineData : {
        $Type : 'UI.FieldGroupType',
        Data  : [
            { $Type: 'UI.DataField', Value: partNumber,    Label: 'Part Number' },
            { $Type: 'UI.DataField', Value: productGroup,  Label: 'Product Group' },
            { $Type: 'UI.DataField', Value: productStatus, Label: 'Status' },
            { $Type: 'UI.DataField', Value: quantity,      Label: 'Quantity' },
            { $Type: 'UI.DataField', Value: baseUOM,       Label: 'UOM' },
            { $Type: 'UI.DataField', Value: value,         Label: 'Value' }
        ]
    }
);

annotate service.ProfileLine with {
    ID            @UI.Hidden;
    partNumber    @title: 'Part Number' @mandatory;
    productGroup  @title: 'Product Group';
    productStatus @title: 'Status';
    quantity      @title: 'Quantity';
    baseUOM       @title: 'UOM';
    value         @title: 'Value';
};
