const cds = require("@sap/cds");

async function upsertProfileLine({
    ProfileHeader, ProfileLine, ChangeLog,
    engineerId, businessUnit, productGroup, productStatus,
    partNumber, quantity, baseUOM, value, userId
}) {
    const dNow = new Date();
    const sDate = dNow.toISOString().slice(0, 10);
    const sTime = dNow.toISOString().slice(11, 19);

    let oHeader = await SELECT.one.from(ProfileHeader).where({ engineerId });

    if (!oHeader) {
        oHeader = {
            ID: cds.utils.uuid(),
            engineerId,
            businessUnit,
            dateCreated: sDate,
            status: 'Active'
        };
        await INSERT.into(ProfileHeader).entries(oHeader);
    }

    const oExistingLine = await SELECT.one.from(ProfileLine)
        .where({ header_ID: oHeader.ID, partNumber });

    if (!oExistingLine) {
        await INSERT.into(ProfileLine).entries({
            ID: cds.utils.uuid(),
            header_ID: oHeader.ID,
            productGroup, productStatus, partNumber,
            quantity, baseUOM, value
        });

        await INSERT.into(ChangeLog).entries({
            ID: cds.utils.uuid(),
            changeDate: sDate, changeTime: sTime, userId, engineerId,
            transactionType: 'AD',
            beforeQuantity: 0, beforeValue: 0,
            afterQuantity: quantity, afterValue: value,
            afterBusinessUnit: businessUnit, afterProductGroup: productGroup,
            afterProductStatus: productStatus, afterPartNumber: partNumber,
            afterBaseUOM: baseUOM
        });
    } else {
        const nNewQty = Number(oExistingLine.quantity) + Number(quantity);
        const nNewVal = Number(oExistingLine.value) + Number(value);

        await UPDATE(ProfileLine).set({ quantity: nNewQty, value: nNewVal })
            .where({ ID: oExistingLine.ID });

        await INSERT.into(ChangeLog).entries({
            ID: cds.utils.uuid(),
            changeDate: sDate, changeTime: sTime, userId, engineerId,
            transactionType: 'AD',
            beforeQuantity: oExistingLine.quantity, beforeValue: oExistingLine.value,
            beforePartNumber: partNumber,
            afterQuantity: nNewQty, afterValue: nNewVal,
            afterPartNumber: partNumber
        });
    }
}

module.exports = { upsertProfileLine };