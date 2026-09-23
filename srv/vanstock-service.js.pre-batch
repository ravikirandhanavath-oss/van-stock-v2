const cds = require("@sap/cds");
const ExcelJS = require('exceljs');
const { Readable } = require('stream');
const { loadLookups, validateRow } = require('./lib/validation');
const { upsertProfileLine } = require('./lib/profileWriter');

const RESULT_SET_SIZE = 10000; // collect exactly this many rows before processing

/**
 * Streams the Excel file and processes it in fixed-size result sets:
 *   1. Collect up to RESULT_SET_SIZE rows into a result set (array)
 *   2. Validate + insert that result set into UploadLog
 *   3. CLEAR the result set completely
 *   4. Continue collecting the NEXT RESULT_SET_SIZE rows from the stream
 * At no point does the full file sit in memory — only one result set
 * (max 10,000 rows) exists at any given moment.
 */
//uploading data first to upload log table and then on button click upload to main table
async function processExcelStream(buffer, oLookups, UploadLog, ProfileHeader, ProfileLine, ChangeLog, sUploadedBy) {
    const oStream = Readable.from(buffer);

    const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(oStream, {
        entries: 'emit',
        sharedStrings: 'cache',
        hyperlinks: 'ignore',
        styles: 'ignore'
    });

    let iTotalRows = 0;
    let iSuccessCount = 0;
    let iFailCount = 0;
    const dUploadedOn = new Date();

    let aResultSet = [];

    async function processAndClearResultSet() {
        if (aResultSet.length === 0) {
            return;
        }
        await INSERT.into(UploadLog).entries(aResultSet);
        aResultSet = [];
    }

    for await (const worksheetReader of workbookReader) {
        let iRowNumber = 0;

        for await (const row of worksheetReader) {
            iRowNumber++;

            if (iRowNumber === 1) {
                continue;
            }

            const engineerId = row.getCell(1).value;
            const profitCenter = row.getCell(2).value;
            const partNumber = row.getCell(3).value;
            const quantity = row.getCell(4).value;
            const value = row.getCell(5).value;

            if (!engineerId && !profitCenter && !partNumber && !quantity && !value) {
                continue;
            }

            const oRawRow = { rowNumber: iRowNumber, engineerId, profitCenter, partNumber, quantity, value };
            const oResult = validateRow(oRawRow, oLookups);

            if (oResult.isValid) {
                iSuccessCount++;
                await upsertProfileLine({
                    ProfileHeader, ProfileLine, ChangeLog,
                    engineerId: String(engineerId),
                    businessUnit: String(profitCenter),
                    productGroup: '', productStatus: '',
                    partNumber: String(partNumber),
                    quantity: Number(quantity), baseUOM: '',
                    value: Number(value),
                    userId: sUploadedBy
                });
            } else {
                iFailCount++;
            }

            aResultSet.push({
                ID: cds.utils.uuid(),
                uploadedOn: dUploadedOn,
                uploadedBy: sUploadedBy,
                rowNumber: iRowNumber,
                engineerId: engineerId ? String(engineerId) : null,
                profitCenter: profitCenter ? String(profitCenter) : null,
                partNumber: partNumber ? String(partNumber) : null,
                quantity: isNaN(Number(quantity)) ? null : Number(quantity),
                value: isNaN(Number(value)) ? null : Number(value),
                status: oResult.isValid ? 'Success' : 'Failed',
                remark: oResult.isValid ? '' : oResult.errors.join('; '),
                posted: false
            });

            iTotalRows++;

            if (aResultSet.length >= RESULT_SET_SIZE) {
                await processAndClearResultSet();
            }
        }
    }

    await processAndClearResultSet();

    return { iTotalRows, iSuccessCount, iFailCount };
}

//uploading data directly to main vanstock table and upload log table using batch

async function processExcelFullStream(buffer, oLookups, UploadLog, ProfileHeader, ProfileLine, ChangeLog, sUploadedBy) {
    const oStream = Readable.from(buffer);

    const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(oStream, {
        entries: 'emit',
        sharedStrings: 'cache',
        hyperlinks: 'ignore',
        styles: 'ignore'
    });

    let iTotalRows = 0;
    let iSuccessCount = 0;
    let iFailCount = 0;
    const dUploadedOn = new Date();

    let aLogResultSet = [];
    //let aProfileResultSet = [];removed — no longer batching into flat table

    async function flushResultSets() {
        if (aLogResultSet.length > 0) {
            await INSERT.into(UploadLog).entries(aLogResultSet);
            aLogResultSet = [];
        }
        // if (aProfileResultSet.length > 0) {
        //     await INSERT.into(VanStockProfile).entries(aProfileResultSet);
        //     aProfileResultSet = [];
        // }
    }

    for await (const worksheetReader of workbookReader) {
        let iRowNumber = 0;

        for await (const row of worksheetReader) {
            iRowNumber++;

            if (iRowNumber === 1) {
                continue;
            }

            const engineerId = row.getCell(1).value;
            const profitCenter = row.getCell(2).value;
            const partNumber = row.getCell(3).value;
            const quantity = row.getCell(4).value;
            const value = row.getCell(5).value;

            if (!engineerId && !profitCenter && !partNumber && !quantity && !value) {
                continue;
            }

            const oRawRow = { rowNumber: iRowNumber, engineerId, profitCenter, partNumber, quantity, value };
            const oResult = validateRow(oRawRow, oLookups);

            if (oResult.isValid) {
                iSuccessCount++;
                 await upsertProfileLine({
                    ProfileHeader, ProfileLine, ChangeLog,
                    engineerId: String(engineerId),
                    businessUnit: String(profitCenter),
                    productGroup: '', productStatus: '',
                    partNumber: String(partNumber),
                    quantity: Number(quantity), baseUOM: '',
                    value: Number(value),
                    userId: sUploadedBy
                });
            } else {
                iFailCount++;
            }

            aLogResultSet.push({
                ID: cds.utils.uuid(),
                uploadedOn: dUploadedOn,
                uploadedBy: sUploadedBy,
                rowNumber: iRowNumber,
                engineerId: engineerId ? String(engineerId) : null,
                profitCenter: profitCenter ? String(profitCenter) : null,
                partNumber: partNumber ? String(partNumber) : null,
                quantity: isNaN(Number(quantity)) ? null : Number(quantity),
                value: isNaN(Number(value)) ? null : Number(value),
                status: oResult.isValid ? 'Success' : 'Failed',
                remark: oResult.isValid ? '' : oResult.errors.join('; '),
                posted: oResult.isValid
            });

            // if (oResult.isValid) {
            //     aProfileResultSet.push({
            //         ID: cds.utils.uuid(),
            //         createdOn: new Date(),
            //         engineerId: String(engineerId),
            //         profitCenter: String(profitCenter),
            //         partNumber: String(partNumber),
            //         quantity: Number(quantity),
            //         value: Number(value)
            //     });
            // }

            iTotalRows++;

            if (aLogResultSet.length >= RESULT_SET_SIZE) {
                await flushResultSets();
            }
        }
    }

    await flushResultSets();

    return { iTotalRows, iSuccessCount, iFailCount };
}


module.exports = cds.service.impl(function () {
    const { VanStockProfile, UploadLog, ProfileHeader, ProfileLine, ChangeLog, ArchiveHeader, ArchiveLine } = this.entities;
    // const { VanStockProfile, UploadLog } = this.entities;
    //commented code without batchId
    this.on('uploadProfile', (req) => {
        const { file } = req.data;

        if (!file) {
            req.error(400, "No file provided");
            return Promise.resolve();
        }

        let buffer;
        try {
            buffer = Buffer.from(file, 'base64');
        } catch (oError) {
            req.error(400, "Could not read the uploaded file");
            return Promise.resolve();
        }

        const sUploadedBy = req.user ? req.user.id : 'unknown';

        return loadLookups()
            .then((oLookups) => {
                return processExcelStream(buffer, oLookups, UploadLog, ProfileHeader, ProfileLine, ChangeLog, sUploadedBy);
            })
            .then((oSummary) => {
                if (oSummary.iTotalRows === 0) {
                    req.error(400, 'Excel file does not contain any data rows');
                    return;
                }

                return {
                    message: `Processed ${oSummary.iTotalRows} rows: ${oSummary.iSuccessCount} passed, ${oSummary.iFailCount} failed. Review and confirm to post.`,
                    totalRows: oSummary.iTotalRows,
                    successCount: oSummary.iSuccessCount,
                    failCount: oSummary.iFailCount
                };
            })
            .catch((oError) => {
                req.error(500, `Upload failed: ${oError.message}`);
            });
    });
    this.on('uploadProfileFull', (req) => {
        const { file } = req.data;

        if (!file) {
            req.error(400, "No file provided");
            return Promise.resolve();
        }

        let buffer;
        try {
            buffer = Buffer.from(file, 'base64');
        } catch (oError) {
            req.error(400, "Could not read the uploaded file");
            return Promise.resolve();
        }

        const sUploadedBy = req.user ? req.user.id : 'unknown';

       return loadLookups()
    .then((oLookups) => processExcelFullStream(buffer, oLookups, UploadLog, ProfileHeader, ProfileLine, ChangeLog, sUploadedBy))
            .then((oSummary) => {
                if (oSummary.iTotalRows === 0) {
                    req.error(400, 'Excel file does not contain any data rows');
                    return;
                }
                return {
                    message: `Processed ${oSummary.iTotalRows} rows: ${oSummary.iSuccessCount} passed, ${oSummary.iFailCount} failed.`,
                    totalRows: oSummary.iTotalRows,
                    successCount: oSummary.iSuccessCount,
                    failCount: oSummary.iFailCount
                };
            })
            .catch((oError) => {
                req.error(500, `Upload failed: ${oError.message}`);
            });
    });
  this.on('postProfiles', async (req) => {
    const { logIds } = req.data;

    if (!logIds || logIds.length === 0) {
        req.error(400, "No rows selected to post");
        return;
    }

    try {
        const aSelectedLogs = await SELECT.from(UploadLog).where({ ID: { in: logIds } });

        const aAlreadyPosted = aSelectedLogs.filter(e => e.posted);
        const aFailedRows = aSelectedLogs.filter(e => e.status !== 'Success');
        const aToPost = aSelectedLogs.filter(e => e.status === 'Success' && !e.posted);

        if (aAlreadyPosted.length > 0) {
            req.error(400, `${aAlreadyPosted.length} selected row(s) were already posted`);
            return;
        }
        if (aFailedRows.length > 0) {
            req.error(400, `${aFailedRows.length} selected row(s) failed validation and cannot be posted`);
            return;
        }
        if (aToPost.length === 0) {
            req.error(400, "No valid rows to post");
            return;
        }

        for (const oLog of aToPost) {
            await upsertProfileLine({
                ProfileHeader, ProfileLine, ChangeLog,
                engineerId: oLog.engineerId,
                businessUnit: oLog.profitCenter,
                productGroup: '', productStatus: '',
                partNumber: oLog.partNumber,
                quantity: oLog.quantity, baseUOM: '',
                value: oLog.value,
                userId: req.user ? req.user.id : 'unknown'
            });
        }

        await UPDATE(UploadLog).set({ posted: true }).where({ ID: { in: aToPost.map(e => e.ID) } });

        return {
            message: `${aToPost.length} record(s) posted to Van Stock Profile`,
            postedCount: aToPost.length
        };
    } catch (oError) {
        req.error(400, oError.message);
    }
});
    this.on('uploadProfileChunk', async (req) => {
        const { rows } = req.data;

        if (!rows || rows.length === 0) {
            req.error(400, "No rows provided");
            return;
        }

        const sUploadedBy = req.user ? req.user.id : 'unknown';
        const dUploadedOn = new Date();

        try {
            const oLookups = await loadLookups();
            const aLogEntries = [];

            for (const oRawRow of rows) {
                const oResult = validateRow(oRawRow, oLookups);

                aLogEntries.push({
                    ID: cds.utils.uuid(),
                    uploadedOn: dUploadedOn,
                    uploadedBy: sUploadedBy,
                    rowNumber: oRawRow.rowNumber,
                    engineerId: oRawRow.engineerId || null,
                    profitCenter: oRawRow.profitCenter || null,
                    partNumber: oRawRow.partNumber || null,
                    quantity: oRawRow.quantity,
                    value: oRawRow.value,
                    status: oResult.isValid ? 'Success' : 'Failed',
                    remark: oResult.isValid ? '' : oResult.errors.join('; '),
                    posted: oResult.isValid
                });

                if (oResult.isValid) {
                    await upsertProfileLine({
                        ProfileHeader, ProfileLine, ChangeLog,
                        engineerId: oRawRow.engineerId,
                        businessUnit: oRawRow.profitCenter,
                        productGroup: '',
                        productStatus: '',
                        partNumber: oRawRow.partNumber,
                        quantity: oRawRow.quantity,
                        baseUOM: '',
                        value: oRawRow.value,
                        userId: sUploadedBy
                    });
                }
            }

            await INSERT.into(UploadLog).entries(aLogEntries);

            const iSuccessCount = aLogEntries.filter(e => e.status === 'Success').length;
            return {
                successCount: iSuccessCount,
                failCount: aLogEntries.length - iSuccessCount
            };
        } catch (oError) {
            req.error(500, `Chunk upload failed: ${oError.message}`);
        }
    });

    // ============================
    // NEW — Post ALL unposted successful rows at once, no manual selection
    // (avoids the 200-item UI selection limit at large scale)
    // ============================
   this.on('postAllProfiles', async (req) => {
    try {
        const aToPost = await SELECT.from(UploadLog).where({ status: 'Success', posted: false });

        if (aToPost.length === 0) {
            return { message: "No unposted successful rows found", postedCount: 0 };
        }

        for (const oLog of aToPost) {
            await upsertProfileLine({
                ProfileHeader, ProfileLine, ChangeLog,
                engineerId: oLog.engineerId,
                businessUnit: oLog.profitCenter,
                productGroup: '', productStatus: '',
                partNumber: oLog.partNumber,
                quantity: oLog.quantity, baseUOM: '',
                value: oLog.value,
                userId: req.user ? req.user.id : 'unknown'
            });
        }

        await UPDATE(UploadLog).set({ posted: true }).where({ status: 'Success', posted: false });

        return {
            message: `${aToPost.length} record(s) posted to Van Stock Profile`,
            postedCount: aToPost.length
        };
    } catch (oError) {
        req.error(500, `Post all failed: ${oError.message}`);
    }
});
    //Procedure
    this.on('uploadProfileChunkViaProcedure', (req) => {
        const { rows } = req.data;

        if (!rows || rows.length === 0) {
            req.error(400, "No rows provided");
            return Promise.resolve();
        }

        const sUploadedBy = req.user ? req.user.id : 'unknown';
        const ltt = `#TEMP_VANSTOCK_${cds.utils.uuid().replace(/-/g, '')}`;

        return cds.run(`
        CREATE LOCAL TEMPORARY TABLE ${ltt} (
            ROWNUMBER INTEGER, ENGINEERID NVARCHAR(20), PROFITCENTER NVARCHAR(10),
            PARTNUMBER NVARCHAR(40), QUANTITY DECIMAL(13,3), VALUE DECIMAL(15,2)
        )
    `).then(() => {
            // Batch insert: array of parameter-arrays, one per row —
            // this is cds.run's documented way to do multi-row inserts.
            const aParamRows = rows.map((r) => [
                r.rowNumber, r.engineerId, r.profitCenter, r.partNumber, r.quantity, r.value
            ]);

            return cds.run(
                `INSERT INTO ${ltt} (ROWNUMBER, ENGINEERID, PROFITCENTER, PARTNUMBER, QUANTITY, VALUE) VALUES (?, ?, ?, ?, ?, ?)`,
                aParamRows
            );
        }).then(() => {
            // No JS Date passed as a parameter — HANA generates the
            // timestamp itself via CURRENT_TIMESTAMP, avoiding any
            // JS-to-TIMESTAMP type mismatch entirely.
            return cds.run(
                `CALL VALIDATE_AND_LOG_VANSTOCK(IT_ROWS => ${ltt}, UPLOADED_BY => ?, UPLOADED_ON => CURRENT_TIMESTAMP, ET_SUMMARY => ?)`,
                [sUploadedBy]
            );
        }).then((oResult) => {
            return cds.run(`DROP TABLE ${ltt}`).then(() => oResult);
        }).then((oResult) => {
            const oSummary = oResult.ET_SUMMARY[0];
            return {
                successCount: Number(oSummary.SUCCESS_COUNT || 0),
                failCount: Number(oSummary.FAIL_COUNT || 0)
            };
        }).catch((oError) => {
            req.error(500, `Procedure chunk upload failed: ${oError.message}`);
        });
    });
    //Process Return
    this.on('processReturn', async (req) => {
        const { engineerId, partNumber, quantity } = req.data;
        const sUserId = req.user ? req.user.id : 'unknown';

        const oHeader = await SELECT.one.from(ProfileHeader).where({ engineerId });
        if (!oHeader) {
            req.error(400, `No profile found for engineer ${engineerId}`);
            return;
        }

        const oLine = await SELECT.one.from(ProfileLine)
            .where({ header_ID: oHeader.ID, partNumber });

        if (!oLine) {
            req.error(400, `Part ${partNumber} not found in engineer ${engineerId}'s inventory`);
            return;
        }

        const nNewQty = Number(oLine.quantity) - Number(quantity);
        if (nNewQty < 0) {
            req.error(400, `Return would result in negative quantity for part ${partNumber}`);
            return;
        }

        const dNow = new Date();
        await UPDATE(ProfileLine).set({ quantity: nNewQty }).where({ ID: oLine.ID });

        await INSERT.into(ChangeLog).entries({
            ID: cds.utils.uuid(),
            changeDate: dNow.toISOString().slice(0, 10),
            changeTime: dNow.toISOString().slice(11, 19),
            userId: sUserId, engineerId, transactionType: 'RE',
            beforePartNumber: partNumber, beforeQuantity: oLine.quantity,
            afterPartNumber: partNumber, afterQuantity: nNewQty
        });

        return { message: `Returned ${quantity} of ${partNumber} for ${engineerId}` };
    });

    this.on('processLeaver', async (req) => {
        const { engineerId } = req.data;
        const sUserId = req.user ? req.user.id : 'unknown';

        const oHeader = await SELECT.one.from(ProfileHeader).where({ engineerId });
        if (!oHeader) {
            req.error(400, `No profile found for engineer ${engineerId}`);
            return;
        }

        const aLines = await SELECT.from(ProfileLine).where({ header_ID: oHeader.ID });
        const dNow = new Date();
        const sDate = dNow.toISOString().slice(0, 10);
        const sTime = dNow.toISOString().slice(11, 19);

        await UPDATE(ProfileHeader).set({ status: 'Leaver' }).where({ ID: oHeader.ID });

        const sArchiveId = cds.utils.uuid();
        await INSERT.into(ArchiveHeader).entries({
            ID: sArchiveId,
            dateArchived: sDate, timeArchived: sTime,
            dateCreated: oHeader.dateCreated, engineerId,
            businessUnit: oHeader.businessUnit, status: 'Leaver'
        });

        for (const oLine of aLines) {
            await INSERT.into(ArchiveLine).entries({
                ID: cds.utils.uuid(),
                archiveHeader_ID: sArchiveId,
                productGroup: oLine.productGroup, productStatus: oLine.productStatus,
                partNumber: oLine.partNumber, quantity: oLine.quantity,
                baseUOM: oLine.baseUOM, value: oLine.value
            });
        }

        for (const oLine of aLines) {
            await UPDATE(ProfileLine).set({ quantity: 0, value: 0 }).where({ ID: oLine.ID });

            await INSERT.into(ChangeLog).entries({
                ID: cds.utils.uuid(),
                changeDate: sDate, changeTime: sTime, userId: sUserId, engineerId,
                transactionType: 'LV',
                beforePartNumber: oLine.partNumber, beforeQuantity: oLine.quantity, beforeValue: oLine.value,
                afterPartNumber: oLine.partNumber, afterQuantity: 0, afterValue: 0
            });
        }

        await UPDATE(ProfileHeader).set({ status: 'Closed' }).where({ ID: oHeader.ID });

        return { message: `Engineer ${engineerId} processed as leaver, profile archived and closed` };
    });
});