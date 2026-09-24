namespace vanstock;

entity ChangeLogs {
    key ID              : UUID;
        changeDate      : Date;
        changeTime      : Time;
        userId          : String(40);
        engineerId      : String(20);
        transactionType : String(2);

        beforeBusinessUnit  : String(10);
        beforeProductGroup  : String(10);
        beforeProductStatus : String(10);
        beforePartNumber    : String(40);
        beforeQuantity      : Decimal(13,3);
        beforeBaseUOM       : String(3);
        beforeValue         : Decimal(15,2);

        afterBusinessUnit   : String(10);
        afterProductGroup   : String(10);
        afterProductStatus  : String(10);
        afterPartNumber     : String(40);
        afterQuantity       : Decimal(13,3);
        afterBaseUOM         : String(3);
        afterValue          : Decimal(15,2);
}