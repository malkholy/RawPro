-- ============================================================================
-- SQL Structure and Migration Script for Vendor & Customer Master with IDs
-- (Using Dynamic SQL to prevent compilation errors in single-batch execution)
-- ============================================================================

USE [Finance];
GO

-- 1. Create Vendor Master Table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Vendor]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Vendor] (
        [VendorID] INT IDENTITY(1,1) PRIMARY KEY,
        [VendorName] NVARCHAR(500) NOT NULL UNIQUE,
        [CreatedBy] NVARCHAR(100) NULL,
        [CreatedDate] DATETIME DEFAULT GETDATE() NULL
    );
END
GO

-- 2. Create Customer Master Table
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[Customer]') AND type in (N'U'))
BEGIN
    CREATE TABLE [dbo].[Customer] (
        [CustomerID] INT IDENTITY(1,1) PRIMARY KEY,
        [CustomerName] NVARCHAR(500) NOT NULL UNIQUE,
        [CreatedBy] NVARCHAR(100) NULL,
        [CreatedDate] DATETIME DEFAULT GETDATE() NULL
    );
END
GO

-- 3. Populate Vendor Master with distinct existing Vendor Names
INSERT INTO [dbo].[Vendor] (VendorName, CreatedBy)
SELECT DISTINCT TRIM(Name), 'MigrationSystem'
FROM (
    SELECT VendorName AS Name FROM [dbo].[VendorInvoice] WHERE VendorName IS NOT NULL AND TRIM(VendorName) <> ''
    UNION
    SELECT Party AS Name FROM [dbo].[TreasuryTransaction] WHERE TxType = 'Payment' AND Party IS NOT NULL AND TRIM(Party) <> ''
) t
WHERE NOT EXISTS (SELECT 1 FROM [dbo].[Vendor] v WHERE v.VendorName = TRIM(t.Name));
GO

-- 4. Populate Customer Master with distinct existing Customer Names
INSERT INTO [dbo].[Customer] (CustomerName, CreatedBy)
SELECT DISTINCT TRIM(Name), 'MigrationSystem'
FROM (
    SELECT CustomerName AS Name FROM [dbo].[CustomerInvoice] WHERE CustomerName IS NOT NULL AND TRIM(CustomerName) <> ''
    UNION
    SELECT Party AS Name FROM [dbo].[TreasuryTransaction] WHERE TxType = 'Receipt' AND Party IS NOT NULL AND TRIM(Party) <> ''
) t
WHERE NOT EXISTS (SELECT 1 FROM [dbo].[Customer] c WHERE c.CustomerName = TRIM(t.Name));
GO

-- 5. Add VendorID and CustomerID columns to Transaction Tables (if they don't exist)
IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[VendorInvoice]') AND name = N'VendorID')
BEGIN
    ALTER TABLE [dbo].[VendorInvoice] ADD [VendorID] INT NULL;
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[CustomerInvoice]') AND name = N'CustomerID')
BEGIN
    ALTER TABLE [dbo].[CustomerInvoice] ADD [CustomerID] INT NULL;
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[TreasuryTransaction]') AND name = N'VendorID')
BEGIN
    ALTER TABLE [dbo].[TreasuryTransaction] ADD [VendorID] INT NULL;
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[TreasuryTransaction]') AND name = N'CustomerID')
BEGIN
    ALTER TABLE [dbo].[TreasuryTransaction] ADD [CustomerID] INT NULL;
END
GO

IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID(N'[dbo].[TreasuryTransaction]') AND name = N'PartyType')
BEGIN
    ALTER TABLE [dbo].[TreasuryTransaction] ADD [PartyType] NVARCHAR(50) NULL;
END
GO

-- 6. Update current transactional data with the matching Master IDs (using dynamic SQL to prevent compilation errors)
EXEC sp_executesql N'
UPDATE vi
SET vi.VendorID = v.VendorID
FROM [dbo].[VendorInvoice] vi
INNER JOIN [dbo].[Vendor] v ON TRIM(vi.VendorName) = v.VendorName;
';
GO

EXEC sp_executesql N'
UPDATE ci
SET ci.CustomerID = c.CustomerID
FROM [dbo].[CustomerInvoice] ci
INNER JOIN [dbo].[Customer] c ON TRIM(ci.CustomerName) = c.CustomerName;
';
GO

EXEC sp_executesql N'
UPDATE tt
SET tt.VendorID = v.VendorID,
    tt.PartyType = ''Vendor''
FROM [dbo].[TreasuryTransaction] tt
INNER JOIN [dbo].[Vendor] v ON TRIM(tt.Party) = v.VendorName
WHERE tt.TxType = ''Payment'';
';
GO

EXEC sp_executesql N'
UPDATE tt
SET tt.CustomerID = c.CustomerID,
    tt.PartyType = ''Customer''
FROM [dbo].[TreasuryTransaction] tt
INNER JOIN [dbo].[Customer] c ON TRIM(tt.Party) = c.CustomerName
WHERE tt.TxType = ''Receipt'';
';
GO

-- 7. Add Foreign Key constraints for referential integrity
IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[FK_VendorInvoice_Vendor]') AND type = 'F')
    ALTER TABLE [dbo].[VendorInvoice] DROP CONSTRAINT [FK_VendorInvoice_Vendor];

EXEC sp_executesql N'
ALTER TABLE [dbo].[VendorInvoice] WITH CHECK ADD CONSTRAINT [FK_VendorInvoice_Vendor] FOREIGN KEY([VendorID])
REFERENCES [dbo].[Vendor] ([VendorID]);
';
GO

IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[FK_CustomerInvoice_Customer]') AND type = 'F')
    ALTER TABLE [dbo].[CustomerInvoice] DROP CONSTRAINT [FK_CustomerInvoice_Customer];

EXEC sp_executesql N'
ALTER TABLE [dbo].[CustomerInvoice] WITH CHECK ADD CONSTRAINT [FK_CustomerInvoice_Customer] FOREIGN KEY([CustomerID])
REFERENCES [dbo].[Customer] ([CustomerID]);
';
GO

IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[FK_TreasuryTransaction_Vendor]') AND type = 'F')
    ALTER TABLE [dbo].[TreasuryTransaction] DROP CONSTRAINT [FK_TreasuryTransaction_Vendor];

EXEC sp_executesql N'
ALTER TABLE [dbo].[TreasuryTransaction] WITH CHECK ADD CONSTRAINT [FK_TreasuryTransaction_Vendor] FOREIGN KEY([VendorID])
REFERENCES [dbo].[Vendor] ([VendorID]);
';
GO

IF EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'[dbo].[FK_TreasuryTransaction_Customer]') AND type = 'F')
    ALTER TABLE [dbo].[TreasuryTransaction] DROP CONSTRAINT [FK_TreasuryTransaction_Customer];

EXEC sp_executesql N'
ALTER TABLE [dbo].[TreasuryTransaction] WITH CHECK ADD CONSTRAINT [FK_TreasuryTransaction_Customer] FOREIGN KEY([CustomerID])
REFERENCES [dbo].[Customer] ([CustomerID]);
';
GO
