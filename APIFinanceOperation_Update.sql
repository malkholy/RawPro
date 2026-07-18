USE [Finance]
GO
/****** Object:  StoredProcedure [dbo].[APIFinanceOperation] ******/
SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
GO

ALTER procedure [dbo].[APIFinanceOperation]
    @Operation          nvarchar(100),
    @LineData           nvarchar(max)  = null,
    @User               nvarchar(100)  = null,
    @FireBaseToken      nvarchar(500)  = null,
    @AppVersionWeb      nvarchar(50)   = null,
    @AppVersionAndroid  nvarchar(50)   = null,
    @AppVersionIos      nvarchar(50)   = null,
    @AppVersionDesktop  nvarchar(50)   = null,
    @PlatForm           nvarchar(50)   = null,
    @SqlStatement       nvarchar(max)  = null,
    @State              int              out,
    @Message            nvarchar(500)   out
as
begin
    set nocount on
	set @state=0
	set @message ='' 
	insert into SPLog
	(SPOperation , SqlStatment )
	values
	( @operation , @SqlStatement)

    -- ========================================================
    -- LOOKUPS (distinct from transactions)
    -- ========================================================
	-- ============================================================
-- PATCH: Add to dbo.APIFinanceOperation
-- Paste this block right before:
--   -- ========================================================
--   -- CUSTOMER INVOICES
-- ============================================================

     if @Operation = 'Pay Vendor Invoice'
    begin
        declare @PayInvID   int           = cast(JSON_VALUE(@LineData, '$.InvoiceID')  as int)
        declare @PayAmount  decimal(18,2) = cast(JSON_VALUE(@LineData, '$.Amount')     as decimal(18,2))
        declare @PayDate    date          = cast(JSON_VALUE(@LineData, '$.PayDate')     as date)
        declare @PayNotes   nvarchar(1000)= JSON_VALUE(@LineData, '$.Notes')
        declare @PayVendor  nvarchar(500)
        declare @PayBalance decimal(18,2)
        declare @PaySubTotal decimal(18,2)
        declare @PayPaid    decimal(18,2)
        declare @PayInvNo   nvarchar(50)

        select @PayVendor   = VendorName,
               @PayBalance  = Balance,
               @PaySubTotal = SubTotal,
               @PayPaid     = PaidAmount,
               @PayInvNo    = InvoiceNo
        from [dbo].[VendorInvoice] where InvoiceID = @PayInvID

        if @PayInvID is null
        begin set @State = 1 set @Message = 'Invoice not found' return end

        if exists (select 1 from [dbo].[VendorInvoice] where InvoiceID = @PayInvID and Status = 'Locked')
        begin set @State = 1 set @Message = 'Invoice is locked and cannot be paid' return end

        if @PayAmount <= 0
        begin set @State = 1 set @Message = 'Payment amount must be greater than zero' return end

        if @PayAmount > @PayBalance
        begin set @State = 1 set @Message = 'Payment amount exceeds invoice balance' return end

        -- Calculate available cash/payments for this vendor
        declare @VendorPayments decimal(18,2)
        declare @VendorReceipts decimal(18,2)
        declare @VendorPaidInvoices decimal(18,2)
        declare @AvailablePayments decimal(18,2)

        select @VendorPayments = isnull(sum(Amount), 0)
        from [dbo].[TreasuryTransaction]
        where TxType = 'Payment' and replace(Party, ' ', '') = replace(@PayVendor, ' ', '')

        select @VendorReceipts = isnull(sum(Amount), 0)
        from [dbo].[TreasuryTransaction]
        where TxType = 'Receipt' and replace(Party, ' ', '') = replace(@PayVendor, ' ', '')

        select @VendorPaidInvoices = isnull(sum(PaidAmount), 0)
        from [dbo].[VendorInvoice]
        where replace(VendorName, ' ', '') = replace(@PayVendor, ' ', '')

        set @AvailablePayments = @VendorPayments - @VendorReceipts - @VendorPaidInvoices

        if @PayAmount > @AvailablePayments
        begin
            set @State = 1
            set @Message = 'Payment amount exceeds available vendor payments (' + format(isnull(@AvailablePayments, 0), 'N2') + ')'
            return
        end

        -- Update invoice PaidAmount + Status
        declare @NewPaid    decimal(18,2) = @PayPaid + @PayAmount
        declare @NewBalance decimal(18,2) = @PaySubTotal - @NewPaid
        declare @NewStatus  nvarchar(50)  = case
            when @NewBalance <= 0 then 'Paid'
            when @NewPaid    >  0 then 'Partial'
            else 'Pending'
        end

        update [dbo].[VendorInvoice]
        set PaidAmount    = @NewPaid,
            Status        = @NewStatus,
            LastMaintBy   = @User,
            LastMaintDate = GETDATE()
        where InvoiceID = @PayInvID

        /* 
        -- Removed: Do not automatically create Treasury Payment
        -- Create Treasury Payment transaction
        declare @TRRef nvarchar(50) = 'TR-P' + right('000' + convert(nvarchar,
            isnull((select max(TxID) from [dbo].[TreasuryTransaction]), 0) + 1), 3)

        insert into [dbo].[TreasuryTransaction]
            (Reference, TxType, Party, Amount, TxDate, Purpose, Status, CreatedBy, CreatedDate)
        values (
            @TRRef, 'Payment', @PayVendor, @PayAmount, @PayDate,
            isnull(@PayNotes, 'Payment for invoice ' + @PayInvNo),
            'Posted', @User, GETDATE()
        )
        */

        -- Return updated invoice
        select InvoiceID, InvoiceNo, VendorName, InvoiceDate, DueDate,
               SubTotal, PaidAmount, Balance, Status, Notes
        from [dbo].[VendorInvoice] where InvoiceID = @PayInvID

        set @State = 0 set @Message = 'Payment recorded successfully'
		return
    end

    if @Operation = 'Reset Vendor Invoice Payment'
    begin
        declare @ResetInvID int = cast(JSON_VALUE(@LineData, '$.InvoiceID') as int)
        if @ResetInvID is null
        begin set @State = 1 set @Message = 'Invoice ID is required' return end

        if exists (select 1 from [dbo].[VendorInvoice] where InvoiceID = @ResetInvID and Status = 'Locked')
        begin set @State = 1 set @Message = 'Invoice is locked and payment cannot be reset' return end

        update [dbo].[VendorInvoice]
        set PaidAmount = 0,
            Status = 'Pending',
            LastMaintBy = @User,
            LastMaintDate = GETDATE()
        where InvoiceID = @ResetInvID

        select InvoiceID, InvoiceNo, VendorName, VendorID, InvoiceDate, DueDate,
               SubTotal, PaidAmount, Balance, Status, Notes
        from [dbo].[VendorInvoice] where InvoiceID = @ResetInvID

        set @State = 0 set @Message = 'Invoice payment reset successfully'
        return
    end

    if @Operation = 'Lock Vendor Invoice'
    begin
        declare @LockInvID int = cast(JSON_VALUE(@LineData, '$.InvoiceID') as int)
        if @LockInvID is null
        begin set @State = 1 set @Message = 'Invoice ID is required' return end

        update [dbo].[VendorInvoice]
        set Status = 'Locked',
            LastMaintBy = @User,
            LastMaintDate = GETDATE()
        where InvoiceID = @LockInvID

        select InvoiceID, InvoiceNo, VendorName, VendorID, InvoiceDate, DueDate,
               SubTotal, PaidAmount, Balance, Status, Notes
        from [dbo].[VendorInvoice] where InvoiceID = @LockInvID

        set @State = 0 set @Message = 'Invoice locked successfully'
        return
    end

    if @Operation = 'Lock Customer Invoice'
    begin
        declare @LockCustInvID int = cast(JSON_VALUE(@LineData, '$.InvoiceID') as int)
        if @LockCustInvID is null
        begin set @State = 1 set @Message = 'Invoice ID is required' return end

        update [dbo].[CustomerInvoice]
        set Status = 'Locked',
            LastMaintBy = @User,
            LastMaintDate = GETDATE()
        where InvoiceID = @LockCustInvID

        select InvoiceID, InvoiceNo, CustomerName, CustomerID, InvoiceDate, DueDate,
               SubTotal, CollectedAmount, Balance, Status, Notes
        from [dbo].[CustomerInvoice] where InvoiceID = @LockCustInvID

        set @State = 0 set @Message = 'Invoice locked successfully'
        return
    end

	 if @Operation = 'Collect Customer Invoice'
    begin
        declare @ColInvID     int           = cast(JSON_VALUE(@LineData, '$.InvoiceID') as int)
        declare @ColAmount    decimal(18,2) = cast(JSON_VALUE(@LineData, '$.Amount')    as decimal(18,2))
        declare @ColDate      date          = cast(JSON_VALUE(@LineData, '$.PayDate')   as date)
        declare @ColNotes     nvarchar(1000)= JSON_VALUE(@LineData, '$.Notes')
        declare @ColCust      nvarchar(500)
        declare @ColBalance   decimal(18,2)
        declare @ColSubTotal  decimal(18,2)
        declare @ColCollected decimal(18,2)
        declare @ColInvNo     nvarchar(50)
 
        select @ColCust      = CustomerName,
               @ColBalance   = Balance,
               @ColSubTotal  = SubTotal,
               @ColCollected = CollectedAmount,
               @ColInvNo     = InvoiceNo
        from [dbo].[CustomerInvoice] where InvoiceID = @ColInvID
 
        if @ColInvID is null
        begin set @State = 1 set @Message = 'Invoice not found' return end

        if exists (select 1 from [dbo].[CustomerInvoice] where InvoiceID = @ColInvID and Status = 'Locked')
        begin set @State = 1 set @Message = 'Invoice is locked and cannot be collected' return end
 
        if @ColAmount <= 0
        begin set @State = 1 set @Message = 'Collection amount must be greater than zero' return end
 
        if @ColAmount > @ColBalance
        begin set @State = 1 set @Message = 'Collection amount exceeds invoice balance' return end
 
        declare @NewCollected decimal(18,2) = @ColCollected + @ColAmount
        declare @NewColBal    decimal(18,2) = @ColSubTotal  - @NewCollected
        declare @NewColStatus nvarchar(50)  = case
            when @NewColBal    <= 0 then 'Paid'
            when @NewCollected >  0 then 'Partial'
            else 'Pending'
        end
 
        update [dbo].[CustomerInvoice]
        set CollectedAmount = @NewCollected,
            Status          = @NewColStatus,
            LastMaintBy     = @User,
            LastMaintDate   = GETDATE()
        where InvoiceID = @ColInvID
 
        /*
        -- Removed: Do not automatically create Treasury Receipt
        declare @TRRRef nvarchar(50) = 'TR-R' + right('000' + convert(nvarchar,
            isnull((select max(TxID) from [dbo].[TreasuryTransaction]), 0) + 1), 3)
 
        insert into [dbo].[TreasuryTransaction]
            (Reference, TxType, Party, Amount, TxDate, Purpose, Status, CreatedBy, CreatedDate)
        values (
            @TRRRef, 'Receipt', @ColCust, @ColAmount, @ColDate,
            isnull(@ColNotes, 'Collection for invoice ' + @ColInvNo),
            'Posted', @User, GETDATE()
        )
        */
 
        select InvoiceID, InvoiceNo, CustomerName, InvoiceDate, DueDate,
               SubTotal, CollectedAmount, Balance, Status, Notes
        from [dbo].[CustomerInvoice] where InvoiceID = @ColInvID
 
        set @State = 0 set @Message = 'Collection recorded successfully'
		return
    end

    if @Operation = 'Reset Customer Invoice Collection'
    begin
        declare @ResetCustInvID int = cast(JSON_VALUE(@LineData, '$.InvoiceID') as int)
        if @ResetCustInvID is null
        begin set @State = 1 set @Message = 'Invoice ID is required' return end

        if exists (select 1 from [dbo].[CustomerInvoice] where InvoiceID = @ResetCustInvID and Status = 'Locked')
        begin set @State = 1 set @Message = 'Invoice is locked and collection cannot be reset' return end

        update [dbo].[CustomerInvoice]
        set CollectedAmount = 0,
            Status = 'Pending',
            LastMaintBy = @User,
            LastMaintDate = GETDATE()
        where InvoiceID = @ResetCustInvID

        select InvoiceID, InvoiceNo, CustomerName, CustomerID, InvoiceDate, DueDate,
               SubTotal, CollectedAmount, Balance, Status, Notes
        from [dbo].[CustomerInvoice] where InvoiceID = @ResetCustInvID

        set @State = 0 set @Message = 'Invoice collection reset successfully'
        return
    end

    if @Operation = 'Get Vendor List'
    begin
        select VendorID, VendorName from [dbo].[Vendor] order by VendorName
        set @State = 0 set @Message = 'Success'
    end

    else if @Operation = 'Get Customer List'
    begin
        select CustomerID, CustomerName from [dbo].[Customer] order by CustomerName
        set @State = 0 set @Message = 'Success'
    end

    else if @Operation = 'Add Vendor'
    begin
        declare @AddVendorName nvarchar(500) = JSON_VALUE(@LineData, '$.VendorName')
        if @AddVendorName is null or trim(@AddVendorName) = ''
        begin
            set @State = 1 set @Message = 'Vendor name is required' return
        end
        if exists (select 1 from [dbo].[Vendor] where VendorName = trim(@AddVendorName))
        begin
            set @State = 1 set @Message = 'Vendor already exists' return
        end
        insert into [dbo].[Vendor] (VendorName, CreatedBy)
        values (trim(@AddVendorName), @User)
        
        select VendorID, VendorName from [dbo].[Vendor] where VendorID = SCOPE_IDENTITY()
        set @State = 0 set @Message = 'Vendor added successfully'
    end

    else if @Operation = 'Add Customer'
    begin
        declare @AddCustomerName nvarchar(500) = JSON_VALUE(@LineData, '$.CustomerName')
        if @AddCustomerName is null or trim(@AddCustomerName) = ''
        begin
            set @State = 1 set @Message = 'Customer name is required' return
        end
        if exists (select 1 from [dbo].[Customer] where CustomerName = trim(@AddCustomerName))
        begin
            set @State = 1 set @Message = 'Customer already exists' return
        end
        insert into [dbo].[Customer] (CustomerName, CreatedBy)
        values (trim(@AddCustomerName), @User)
        
        select CustomerID, CustomerName from [dbo].[Customer] where CustomerID = SCOPE_IDENTITY()
        set @State = 0 set @Message = 'Customer added successfully'
    end

    else if @Operation = 'Get Partner List'
    begin
        select distinct PartnerName from [dbo].[CapitalTransaction] order by PartnerName
        set @State = 0 set @Message = 'Success'
    end

    -- ========================================================
    -- TREASURY TRANSACTIONS
    -- ========================================================
    else if @Operation = 'Get Treasury Transactions'
    begin
        declare @TxTypeFilter nvarchar(50) = JSON_VALUE(@LineData, '$.TxType')
        select TxID, Reference, TxType, Party, PartyType, VendorID, CustomerID, Amount, TxDate, Purpose, Status, CreatedBy, CreatedDate
        from [dbo].[TreasuryTransaction]
        where @TxTypeFilter is null or TxType = @TxTypeFilter
        order by TxDate desc
        set @State = 0 set @Message = 'Success'
    end

    else if @Operation = 'Add Treasury Transaction'
    begin
        create table #TempTT (
            TxType  nvarchar(50),  PartyType nvarchar(50), Party   nvarchar(500),
            Amount  decimal(18,2), TxDate  date,
            Purpose nvarchar(1000), Status nvarchar(50)
        )
        insert into #TempTT
        select TxType, PartyType, Party, Amount, TxDate, Purpose, Status
        from openjson(@LineData) with (
            TxType  nvarchar(50)   '$.TxType',
            PartyType nvarchar(50) '$.PartyType',
            Party   nvarchar(500)  '$.Party',
            Amount  decimal(18,2)  '$.Amount',
            TxDate  date           '$.TxDate',
            Purpose nvarchar(1000) '$.Purpose',
            Status  nvarchar(50)   '$.Status'
        )
        declare @TTType nvarchar(10) = (select TxType from #TempTT)
        declare @TTPrefix nvarchar(10) = case @TTType when 'Receipt' then 'TR-R' else 'TR-P' end
        declare @TTRef nvarchar(50) = @TTPrefix + right('000' + convert(nvarchar,
            isnull((select max(TxID) from [dbo].[TreasuryTransaction]), 0) + 1), 3)

        declare @TTPartyType nvarchar(50) = (select PartyType from #TempTT)
        declare @TTParty     nvarchar(500) = (select Party from #TempTT)
        declare @TTVendorID  int = null
        declare @TTCustomerID int = null

        if @TTPartyType = 'Vendor'
            select @TTVendorID = VendorID from [dbo].[Vendor] where VendorName = trim(@TTParty)
        else if @TTPartyType = 'Customer'
            select @TTCustomerID = CustomerID from [dbo].[Customer] where CustomerName = trim(@TTParty)

        insert into [dbo].[TreasuryTransaction]
            (Reference, TxType, Party, PartyType, VendorID, CustomerID, Amount, TxDate, Purpose, Status, CreatedBy, CreatedDate)
        select @TTRef, TxType, Party, PartyType, @TTVendorID, @TTCustomerID, Amount, TxDate, Purpose, isnull(Status,'Posted'), @User, GETDATE()
        from #TempTT

        declare @NewTTID int = SCOPE_IDENTITY()
        select TxID, Reference, TxType, Party, PartyType, Amount, TxDate, Purpose, Status, CreatedBy, CreatedDate
        from [dbo].[TreasuryTransaction] where TxID = @NewTTID
        set @State = 0 set @Message = 'Transaction saved successfully'
        drop table #TempTT
    end

    else if @Operation = 'Edit Treasury Transaction'
    begin
        create table #TempTTE (
            TxID    int,           TxType  nvarchar(50),
            PartyType nvarchar(50), Party   nvarchar(500),
            Amount  decimal(18,2), TxDate  date,
            Purpose nvarchar(1000), Status nvarchar(50)
        )
        insert into #TempTTE
        select TxID, TxType, PartyType, Party, Amount, TxDate, Purpose, Status
        from openjson(@LineData) with (
            TxID    int            '$.TxID',
            TxType  nvarchar(50)   '$.TxType',
            PartyType nvarchar(50) '$.PartyType',
            Party   nvarchar(500)  '$.Party',
            Amount  decimal(18,2)  '$.Amount',
            TxDate  date           '$.TxDate',
            Purpose nvarchar(1000) '$.Purpose',
            Status  nvarchar(50)   '$.Status'
        )

        declare @TTEPartyType nvarchar(50) = (select PartyType from #TempTTE)
        declare @TTEParty     nvarchar(500) = (select Party from #TempTTE)
        declare @TTEVendorID  int = null
        declare @TTECustomerID int = null

        if @TTEPartyType = 'Vendor'
            select @TTEVendorID = VendorID from [dbo].[Vendor] where VendorName = trim(@TTEParty)
        else if @TTEPartyType = 'Customer'
            select @TTECustomerID = CustomerID from [dbo].[Customer] where CustomerName = trim(@TTEParty)

        update t set
            TxType        = e.TxType,
            Party         = e.Party,
            PartyType     = e.PartyType,
            VendorID      = @TTEVendorID,
            CustomerID    = @TTECustomerID,
            Amount        = e.Amount,
            TxDate        = e.TxDate,
            Purpose       = e.Purpose,
            Status        = e.Status,
            LastMaintBy   = @User,
            LastMaintDate = GETDATE()
        from [dbo].[TreasuryTransaction] t inner join #TempTTE e on t.TxID = e.TxID

        declare @EditTTID int = (select TxID from #TempTTE)
        select TxID, Reference, TxType, Party, PartyType, Amount, TxDate, Purpose, Status, CreatedBy, CreatedDate
        from [dbo].[TreasuryTransaction] where TxID = @EditTTID
        set @State = 0 set @Message = 'Transaction updated successfully'
        drop table #TempTTE
    end

    else if @Operation = 'Delete Treasury Transaction'
    begin
        declare @DelTTID int = cast(JSON_VALUE(@LineData, '$.TxID') as int)
        delete from [dbo].[TreasuryTransaction] where TxID = @DelTTID
        set @State = 0 set @Message = 'Transaction deleted successfully'
    end

    -- ========================================================
    -- CAPITAL TRANSACTIONS
    -- ========================================================
    else if @Operation = 'Get Capital Transactions'
    begin
        select TransactionID, Reference, PartnerName, TxType, Amount,
               TxDate, Notes, Status, CreatedBy, CreatedDate
        from [dbo].[CapitalTransaction]
        order by TxDate desc
        set @State = 0 set @Message = 'Success'
    end

    else if @Operation = 'Add Capital Transaction'
    begin
        create table #TempCap (
            PartnerName nvarchar(500), TxType  nvarchar(50),
            Amount      decimal(18,2), TxDate  date,
            Notes       nvarchar(1000), Status nvarchar(50)
        )
        insert into #TempCap
        select PartnerName, TxType, Amount, TxDate, Notes, Status
        from openjson(@LineData) with (
            PartnerName nvarchar(500)  '$.PartnerName',
            TxType      nvarchar(50)   '$.TxType',
            Amount      decimal(18,2)  '$.Amount',
            TxDate      date           '$.TxDate',
            Notes       nvarchar(1000) '$.Notes',
            Status      nvarchar(50)   '$.Status'
        )
        declare @CapRef nvarchar(50) = 'CAP-' + right('0000' + convert(nvarchar,
            isnull((select max(TransactionID) from [dbo].[CapitalTransaction]), 0) + 1), 4)

        insert into [dbo].[CapitalTransaction]
            (Reference, PartnerName, TxType, Amount, TxDate, Notes, Status, CreatedBy, CreatedDate)
        select @CapRef, PartnerName, TxType, Amount, TxDate, Notes, isnull(Status,'Posted'), @User, GETDATE()
        from #TempCap

        declare @NewCapID int = SCOPE_IDENTITY()
        select TransactionID, Reference, PartnerName, TxType, Amount, TxDate, Notes, Status, CreatedBy, CreatedDate
        from [dbo].[CapitalTransaction] where TransactionID = @NewCapID
        set @State = 0 set @Message = 'Capital transaction added successfully'
        drop table #TempCap
    end

    else if @Operation = 'Edit Capital Transaction'
    begin
        create table #TempCapE (
            TransactionID int,            PartnerName nvarchar(500),
            TxType        nvarchar(50),   Amount      decimal(18,2),
            TxDate        date,           Notes       nvarchar(1000), Status nvarchar(50)
        )
        insert into #TempCapE
        select TransactionID, PartnerName, TxType, Amount, TxDate, Notes, Status
        from openjson(@LineData) with (
            TransactionID int            '$.TransactionID',
            PartnerName   nvarchar(500)  '$.PartnerName',
            TxType        nvarchar(50)   '$.TxType',
            Amount        decimal(18,2)  '$.Amount',
            TxDate        date           '$.TxDate',
            Notes         nvarchar(1000) '$.Notes',
            Status        nvarchar(50)   '$.Status'
        )
        update c set
            PartnerName   = e.PartnerName,
            TxType        = e.TxType,
            Amount        = e.Amount,
            TxDate        = e.TxDate,
            Notes         = e.Notes,
            Status        = e.Status,
            LastMaintBy   = @User,
            LastMaintDate = GETDATE()
        from [dbo].[CapitalTransaction] c inner join #TempCapE e on c.TransactionID = e.TransactionID

        declare @EditCapID int = (select TransactionID from #TempCapE)
        select TransactionID, Reference, PartnerName, TxType, Amount, TxDate, Notes, Status, CreatedBy, CreatedDate
        from [dbo].[CapitalTransaction] where TransactionID = @EditCapID
        set @State = 0 set @Message = 'Capital transaction updated successfully'
        drop table #TempCapE
    end

    else if @Operation = 'Delete Capital Transaction'
    begin
        declare @DelCapID int = cast(JSON_VALUE(@LineData, '$.TransactionID') as int)
        delete from [dbo].[CapitalTransaction] where TransactionID = @DelCapID
        set @State = 0 set @Message = 'Transaction deleted successfully'
    end

    -- ========================================================
    -- VENDOR INVOICES
    -- ========================================================
    else if @Operation = 'Get Vendor Invoices'
    begin
        select InvoiceID, InvoiceNo, VendorName, VendorID, InvoiceDate, DueDate,
               SubTotal, PaidAmount, Balance, Status, Notes, CreatedBy, CreatedDate
        from [dbo].[VendorInvoice]
        order by InvoiceDate desc
        set @State = 0 set @Message = 'Success'
    end

    else if @Operation = 'Get Vendor Invoice Lines'
    begin
        declare @VIID int = cast(JSON_VALUE(@LineData, '$.InvoiceID') as int)
        select LineID, InvoiceID, Line, ItemDescription, Qty, UnitPrice, LineTotal
        from [dbo].[VendorInvoiceLine]
        where InvoiceID = @VIID
        order by Line
        set @State = 0 set @Message = 'Success'
    end

    else if @Operation = 'Save Vendor Invoice'
    begin
        create table #TempVI (
            VendorName nvarchar(500), InvoiceNo   nvarchar(50),
            InvoiceDate date,         DueDate     date,          Notes nvarchar(1000)
        )
        insert into #TempVI
        select VendorName, InvoiceNo, InvoiceDate, DueDate, Notes
        from openjson(@LineData) with (
            VendorName  nvarchar(500)  '$.VendorName',
            InvoiceNo   nvarchar(50)   '$.InvoiceNo',
            InvoiceDate date           '$.InvoiceDate',
            DueDate     date           '$.DueDate',
            Notes       nvarchar(1000) '$.Notes'
        )
        create table #TempVIL (
            Line int, ItemDescription nvarchar(500), Qty decimal(18,4), UnitPrice decimal(18,4)
        )
        insert into #TempVIL
        select Line, ItemDescription, Qty, UnitPrice
        from openjson(JSON_QUERY(@LineData, '$.Lines')) with (
            Line          int            '$.Line',
            ItemDescription nvarchar(500)  '$.ItemDescription',
            Qty             decimal(18,4)  '$.Qty',
            UnitPrice       decimal(18,4)  '$.UnitPrice'
        )
        declare @VISubTotal decimal(18,2) = (select isnull(sum(Qty * UnitPrice), 0) from #TempVIL)

        declare @VIVendorName nvarchar(500) = (select VendorName from #TempVI)
        declare @VIVendorID int = null
        select @VIVendorID = VendorID from [dbo].[Vendor] where VendorName = trim(@VIVendorName)

        insert into [dbo].[VendorInvoice]
            (InvoiceNo, VendorName, VendorID, InvoiceDate, DueDate, SubTotal, PaidAmount, Status, Notes, CreatedBy, CreatedDate)
        select InvoiceNo, VendorName, @VIVendorID, InvoiceDate, DueDate, @VISubTotal, 0, 'Pending', Notes, @User, GETDATE()
        from #TempVI

        declare @NewVIID int = SCOPE_IDENTITY()
        insert into [dbo].[VendorInvoiceLine]
            (InvoiceID, Line, ItemDescription, Qty, UnitPrice, CreatedBy, CreatedDate)
        select @NewVIID, Line, ItemDescription, Qty, UnitPrice, @User, GETDATE()
        from #TempVIL

        select vi.InvoiceID, vi.InvoiceNo, vi.VendorName, vi.VendorID, vi.InvoiceDate, vi.DueDate, vi.SubTotal, vi.PaidAmount, vi.Balance, vi.Status, vi.Notes
        from [dbo].[VendorInvoice] vi where vi.InvoiceID = @NewVIID
        set @State = 0 set @Message = 'Vendor invoice saved successfully'
        drop table #TempVI drop table #TempVIL
    end

    else if @Operation = 'Update Vendor Invoice'
    begin
        create table #TempVIU (
            InvoiceID int,  VendorName  nvarchar(500), InvoiceNo nvarchar(50),
            InvoiceDate date, DueDate   date,          Notes     nvarchar(1000)
        )
        insert into #TempVIU
        select InvoiceID, VendorName, InvoiceNo, InvoiceDate, DueDate, Notes
        from openjson(@LineData) with (
            InvoiceID   int            '$.InvoiceID',
            VendorName  nvarchar(500)  '$.VendorName',
            InvoiceNo   nvarchar(50)   '$.InvoiceNo',
            InvoiceDate date           '$.InvoiceDate',
            DueDate     date           '$.DueDate',
            Notes       nvarchar(1000) '$.Notes'
        )
        create table #TempVILU (
            Line int, ItemDescription nvarchar(500), Qty decimal(18,4), UnitPrice decimal(18,4)
        )
        insert into #TempVILU
        select Line, ItemDescription, Qty, UnitPrice
        from openjson(JSON_QUERY(@LineData, '$.Lines')) with (
            Line          int            '$.Line',
            ItemDescription nvarchar(500)  '$.ItemDescription',
            Qty             decimal(18,4)  '$.Qty',
            UnitPrice       decimal(18,4)  '$.UnitPrice'
        )
        declare @VIUSubTotal decimal(18,2) = (select isnull(sum(Qty * UnitPrice), 0) from #TempVILU)
        declare @VIUInvID    int           = (select InvoiceID from #TempVIU)

        if exists (select 1 from [dbo].[VendorInvoice] where InvoiceID = @VIUInvID and Status = 'Locked')
        begin set @State = 1 set @Message = 'Invoice is locked and cannot be edited' return end

        declare @VIUVendorName nvarchar(500) = (select VendorName from #TempVIU)
        declare @VIUVendorID int = null
        select @VIUVendorID = VendorID from [dbo].[Vendor] where VendorName = trim(@VIUVendorName)

        update vi set
            VendorName    = t.VendorName,    
            VendorID      = @VIUVendorID,
            InvoiceNo     = t.InvoiceNo,
            InvoiceDate   = t.InvoiceDate,   DueDate     = t.DueDate,
            SubTotal      = @VIUSubTotal,     Notes       = t.Notes,
            LastMaintBy   = @User,            LastMaintDate = GETDATE()
        from [dbo].[VendorInvoice] vi inner join #TempVIU t on vi.InvoiceID = t.InvoiceID

        delete from [dbo].[VendorInvoiceLine] where InvoiceID = @VIUInvID
        insert into [dbo].[VendorInvoiceLine]
            (InvoiceID, Line, ItemDescription, Qty, UnitPrice, CreatedBy, CreatedDate)
        select @VIUInvID, Line, ItemDescription, Qty, UnitPrice, @User, GETDATE()
        from #TempVILU

        select vi.InvoiceID, vi.InvoiceNo, vi.VendorName, vi.VendorID, vi.InvoiceDate, vi.DueDate, vi.SubTotal, vi.PaidAmount, vi.Balance, vi.Status, vi.Notes
        from [dbo].[VendorInvoice] vi where vi.InvoiceID = @VIUInvID
        set @State = 0 set @Message = 'Vendor invoice updated successfully'
        drop table #TempVIU drop table #TempVILU
    end

    else if @Operation = 'Delete Vendor Invoice'
    begin
        declare @DelVIID int = cast(JSON_VALUE(@LineData, '$.InvoiceID') as int)

        if exists (select 1 from [dbo].[VendorInvoice] where InvoiceID = @DelVIID and Status = 'Locked')
        begin set @State = 1 set @Message = 'Invoice is locked and cannot be deleted' return end

        delete from [dbo].[VendorInvoice] where InvoiceID = @DelVIID
        set @State = 0 set @Message = 'Vendor invoice deleted successfully'
    end

    -- ========================================================
    -- CUSTOMER INVOICES
    -- ========================================================
    else if @Operation = 'Get Customer Invoices'
    begin
        select InvoiceID, InvoiceNo, CustomerName, CustomerID, InvoiceDate, DueDate,
               SubTotal, CollectedAmount, Balance, Status, Notes, CreatedBy, CreatedDate
        from [dbo].[CustomerInvoice]
        order by InvoiceDate desc
        set @State = 0 set @Message = 'Success'
    end

    else if @Operation = 'Get Customer Invoice Lines'
    begin
        declare @CIID int = cast(JSON_VALUE(@LineData, '$.InvoiceID') as int)
        select LineID, InvoiceID, Line, ItemDescription, Qty, UnitPrice, LineTotal
        from [dbo].[CustomerInvoiceLine]
        where InvoiceID = @CIID
        order by Line
        set @State = 0 set @Message = 'Success'
    end

    else if @Operation = 'Save Customer Invoice'
    begin
        create table #TempCI (
            CustomerName nvarchar(500), InvoiceNo   nvarchar(50),
            InvoiceDate  date,          DueDate     date,          Notes nvarchar(1000)
        )
        insert into #TempCI
        select CustomerName, InvoiceNo, InvoiceDate, DueDate, Notes
        from openjson(@LineData) with (
            CustomerName nvarchar(500)  '$.CustomerName',
            InvoiceNo    nvarchar(50)   '$.InvoiceNo',
            InvoiceDate  date           '$.InvoiceDate',
            DueDate      date           '$.DueDate',
            Notes        nvarchar(1000) '$.Notes'
        )
        create table #TempCIL (
            Line int, ItemDescription nvarchar(500), Qty decimal(18,4), UnitPrice decimal(18,4)
        )
        insert into #TempCIL
        select Line, ItemDescription, Qty, UnitPrice
        from openjson(JSON_QUERY(@LineData, '$.Lines')) with (
            Line          int            '$.Line',
            ItemDescription nvarchar(500)  '$.ItemDescription',
            Qty             decimal(18,4)  '$.Qty',
            UnitPrice       decimal(18,4)  '$.UnitPrice'
        )
        declare @CISubTotal decimal(18,2) = (select isnull(sum(Qty * UnitPrice), 0) from #TempCIL)

        declare @CICustomerName nvarchar(500) = (select CustomerName from #TempCI)
        declare @CICustomerID int = null
        select @CICustomerID = CustomerID from [dbo].[Customer] where CustomerName = trim(@CICustomerName)

        insert into [dbo].[CustomerInvoice]
            (InvoiceNo, CustomerName, CustomerID, InvoiceDate, DueDate, SubTotal, CollectedAmount, Status, Notes, CreatedBy, CreatedDate)
        select InvoiceNo, CustomerName, @CICustomerID, InvoiceDate, DueDate, @CISubTotal, 0, 'Pending', Notes, @User, GETDATE()
        from #TempCI

        declare @NewCIID int = SCOPE_IDENTITY()
        insert into [dbo].[CustomerInvoiceLine]
            (InvoiceID, Line, ItemDescription, Qty, UnitPrice, CreatedBy, CreatedDate)
        select @NewCIID, Line, ItemDescription, Qty, UnitPrice, @User, GETDATE()
        from #TempCIL

        select ci.InvoiceID, ci.InvoiceNo, ci.CustomerName, ci.CustomerID, ci.InvoiceDate, ci.DueDate, ci.SubTotal, ci.CollectedAmount, ci.Balance, ci.Status, ci.Notes
        from [dbo].[CustomerInvoice] ci where ci.InvoiceID = @NewCIID
        set @State = 0 set @Message = 'Customer invoice saved successfully'
        drop table #TempCI drop table #TempCIL
    end

    else if @Operation = 'Update Customer Invoice'
    begin
        create table #TempCIU (
            InvoiceID int,  CustomerName nvarchar(500), InvoiceNo nvarchar(50),
            InvoiceDate date, DueDate    date,          Notes     nvarchar(1000)
        )
        insert into #TempCIU
        select InvoiceID, CustomerName, InvoiceNo, InvoiceDate, DueDate, Notes
        from openjson(@LineData) with (
            InvoiceID    int            '$.InvoiceID',
            CustomerName nvarchar(500)  '$.CustomerName',
            InvoiceNo    nvarchar(50)   '$.InvoiceNo',
            InvoiceDate  date           '$.InvoiceDate',
            DueDate      date           '$.DueDate',
            Notes        nvarchar(1000) '$.Notes'
        )
        create table #TempCILU (
            Line int, ItemDescription nvarchar(500), Qty decimal(18,4), UnitPrice decimal(18,4)
        )
        insert into #TempCILU
        select Line, ItemDescription, Qty, UnitPrice
        from openjson(JSON_QUERY(@LineData, '$.Lines')) with (
            Line          int            '$.Line',
            ItemDescription nvarchar(500)  '$.ItemDescription',
            Qty             decimal(18,4)  '$.Qty',
            UnitPrice       decimal(18,4)  '$.UnitPrice'
        )
        declare @CIUSubTotal decimal(18,2) = (select isnull(sum(Qty * UnitPrice), 0) from #TempCILU)
        declare @CIUInvID    int           = (select InvoiceID from #TempCIU)

        if exists (select 1 from [dbo].[CustomerInvoice] where InvoiceID = @CIUInvID and Status = 'Locked')
        begin set @State = 1 set @Message = 'Invoice is locked and cannot be edited' return end

        declare @CIUCustomerName nvarchar(500) = (select CustomerName from #TempCIU)
        declare @CIUCustomerID int = null
        select @CIUCustomerID = CustomerID from [dbo].[Customer] where CustomerName = trim(@CIUCustomerName)

        update ci set
            CustomerName  = t.CustomerName,  
            CustomerID    = @CIUCustomerID,
            InvoiceNo     = t.InvoiceNo,
            InvoiceDate   = t.InvoiceDate,   DueDate     = t.DueDate,
            SubTotal      = @CIUSubTotal,     Notes       = t.Notes,
            LastMaintBy   = @User,            LastMaintDate = GETDATE()
        from [dbo].[CustomerInvoice] ci inner join #TempCIU t on ci.InvoiceID = t.InvoiceID

        delete from [dbo].[CustomerInvoiceLine] where InvoiceID = @CIUInvID
        insert into [dbo].[CustomerInvoiceLine]
            (InvoiceID, Line, ItemDescription, Qty, UnitPrice, CreatedBy, CreatedDate)
        select @CIUInvID, Line, ItemDescription, Qty, UnitPrice, @User, GETDATE()
        from #TempCILU

        select ci.InvoiceID, ci.InvoiceNo, ci.CustomerName, ci.CustomerID, ci.InvoiceDate, ci.DueDate, ci.SubTotal, ci.CollectedAmount, ci.Balance, ci.Status, ci.Notes
        from [dbo].[CustomerInvoice] ci where ci.InvoiceID = @CIUInvID
        set @State = 0 set @Message = 'Customer invoice updated successfully'
        drop table #TempCIU drop table #TempCILU
    end

    else if @Operation = 'Delete Customer Invoice'
    begin
        declare @DelCIID int = cast(JSON_VALUE(@LineData, '$.InvoiceID') as int)

        if exists (select 1 from [dbo].[CustomerInvoice] where InvoiceID = @DelCIID and Status = 'Locked')
        begin set @State = 1 set @Message = 'Invoice is locked and cannot be deleted' return end

        delete from [dbo].[CustomerInvoice] where InvoiceID = @DelCIID
        set @State = 0 set @Message = 'Customer invoice deleted successfully'
    end

    -- ========================================================
    -- STATEMENTS
    -- ========================================================
    else if @Operation = 'Get Vendor Statement'
    begin
        declare @StmtVendor nvarchar(500) = JSON_VALUE(@LineData, '$.VendorName')
        declare @StmtVFrom  date          = cast(JSON_VALUE(@LineData, '$.FromDate') as date)
        declare @StmtVTo    date          = cast(JSON_VALUE(@LineData, '$.ToDate')   as date)

        select 'Invoice' as TxCategory, InvoiceDate as TxDate, DueDate,
               InvoiceNo as Reference, 'Purchase Invoice' as Description,
               SubTotal as Debit, 0 as Credit
        from [dbo].[VendorInvoice]
        where VendorName = @StmtVendor
          and InvoiceDate between @StmtVFrom and @StmtVTo

        union all

        select 'Payment' as TxCategory, TxDate, null as DueDate,
               Reference, isnull(Purpose, 'Payment') as Description,
               0 as Debit, Amount as Credit
        from [dbo].[TreasuryTransaction]
        where TxType = 'Payment' and Party = @StmtVendor
          and TxDate between @StmtVFrom and @StmtVTo

        order by TxDate, TxCategory desc
        set @State = 0 set @Message = 'Success'
    end

    else if @Operation = 'Get Customer Statement'
    begin
        declare @StmtCust  nvarchar(500) = JSON_VALUE(@LineData, '$.CustomerName')
        declare @StmtCFrom date          = cast(JSON_VALUE(@LineData, '$.FromDate') as date)
        declare @StmtCTo   date          = cast(JSON_VALUE(@LineData, '$.ToDate')   as date)

        select 'Invoice' as TxCategory, InvoiceDate as TxDate, DueDate,
               InvoiceNo as Reference, 'Sales Invoice' as Description,
               SubTotal as Debit, 0 as Credit
        from [dbo].[CustomerInvoice]
        where CustomerName = @StmtCust
          and InvoiceDate between @StmtCFrom and @StmtCTo

        union all

        select 'Collection' as TxCategory, TxDate, null as DueDate,
               Reference, isnull(Purpose, 'Collection') as Description,
               0 as Debit, Amount as Credit
        from [dbo].[TreasuryTransaction]
        where TxType = 'Receipt' and Party = @StmtCust
          and TxDate between @StmtCFrom and @StmtCTo

        order by TxDate, TxCategory desc
        set @State = 0 set @Message = 'Success'
    end

    else
    begin
        set @State   = 1
        set @Message = 'Unknown operation: ' + isnull(@Operation, 'NULL')
    end

end
