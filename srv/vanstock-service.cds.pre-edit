using {vanstock} from '../db/schema';
using from '../db/vanstock-header';
using from '../db/vanstock-changelog';
using from '../db/vanstock-archive';
using from '../db/uploadlog';

service VanStockProfile {
    entity VanStockProfile as projection on vanstock.VanStockProfiles;
    entity UploadLog       as projection on vanstock.UploadLogs;
    entity ProfileHeader   as projection on vanstock.VanStockProfileHeader;
    entity ProfileLine     as projection on vanstock.VanStockProfileLine;
    entity ChangeLog       as projection on vanstock.ChangeLogs;
    entity ArchiveHeader   as projection on vanstock.ArchiveHeaders;
    entity ArchiveLine     as projection on vanstock.ArchiveLines;

    action processReturn(
        engineerId: String, partNumber: String, quantity: Decimal
    ) returns { message: String };

    action processLeaver(engineerId: String) returns { message: String };
    
    action uploadProfile(file: LargeBinary, mimetype: String)         returns {
        message      : String;
        totalRows    : Integer;
        successCount : Integer;
        failCount    : Integer;
    };

    action uploadProfileFull(file: LargeBinary, mimetype: String)     returns {
        message      : String;
        totalRows    : Integer;
        successCount : Integer;
        failCount    : Integer;
    };

    action postProfiles(logIds: array of UUID)                        returns {
        message     : String;
        postedCount : Integer;
    };

    action postAllProfiles()                                          returns {
        message     : String;
        postedCount : Integer;
    };

    type VanStockRow {
        rowNumber    : Integer;
        engineerId   : String(20);
        profitCenter : String(10);
        partNumber   : String(40);
        quantity     : Decimal(13, 3);
        value        : Decimal(15, 2);
    };

    action uploadProfileChunk(rows: array of VanStockRow)             returns {
        successCount : Integer;
        failCount    : Integer;
    };

    //Procedural
    action uploadProfileChunkViaProcedure(rows: array of VanStockRow) returns {
        successCount : Integer;
        failCount    : Integer;
    };

};
