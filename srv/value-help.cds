using { vanstock.VanStockProfileHeader, vanstock.VanStockProfileLine } from '../db/vanstock-header';
using { VanStockProfile } from './vanstock-service';

/**
 * Temporary-reporting value helps.
 * Distinct values taken from the TRANSACTION tables (profile header/lines),
 * not the master data - so they only offer values that actually occur.
 */
extend service VanStockProfile with {

    @readonly
    @cds.redirection.target: false
    @title: 'Engineer ID'
    entity EngineerValueHelp as select from VanStockProfileHeader distinct {
        key engineerId
    } where engineerId is not null;

    @readonly
    @cds.redirection.target: false
    @title: 'Business Unit'
    entity BusinessUnitValueHelp as select from VanStockProfileHeader distinct {
        key businessUnit
    } where businessUnit is not null;

    @readonly
    @cds.redirection.target: false
    @title: 'Material'
    entity MaterialValueHelp as select from VanStockProfileLine distinct {
        key partNumber as material
    } where partNumber is not null;
}
