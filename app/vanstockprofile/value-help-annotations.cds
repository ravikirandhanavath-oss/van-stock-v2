using VanStockProfile as service from '../../srv/value-help';

// ---------------------------------------------------- value-help entities
annotate service.EngineerValueHelp with {
    engineerId @title: 'Engineer ID';
};
annotate service.BusinessUnitValueHelp with {
    businessUnit @title: 'Business Unit';
};
annotate service.MaterialValueHelp with {
    material @title: 'Material';
};

// ------------------------------------------------ wire them to the fields
annotate service.ProfileHeader with {
    engineerId @Common.ValueList: {
        $Type          : 'Common.ValueListType',
        CollectionPath : 'EngineerValueHelp',
        Label          : 'Engineer ID',
        Parameters     : [{
            $Type             : 'Common.ValueListParameterInOut',
            LocalDataProperty : engineerId,
            ValueListProperty : 'engineerId'
        }]
    };
    businessUnit @Common.ValueList: {
        $Type          : 'Common.ValueListType',
        CollectionPath : 'BusinessUnitValueHelp',
        Label          : 'Business Unit',
        Parameters     : [{
            $Type             : 'Common.ValueListParameterInOut',
            LocalDataProperty : businessUnit,
            ValueListProperty : 'businessUnit'
        }]
    };
};

annotate service.ProfileLine with {
    partNumber @Common.ValueList: {
        $Type          : 'Common.ValueListType',
        CollectionPath : 'MaterialValueHelp',
        Label          : 'Material',
        Parameters     : [{
            $Type             : 'Common.ValueListParameterInOut',
            LocalDataProperty : partNumber,
            ValueListProperty : 'material'
        }]
    };
};
