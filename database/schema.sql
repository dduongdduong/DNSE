/* =====================================================
   DNSE - Tạo cơ sở dữ liệu và các bảng (SQL Server)
   Chạy file này trước, sau đó chạy seed.sql.
   An toàn khi chạy lại: bảng nào có rồi thì bỏ qua.
   ===================================================== */

IF DB_ID(N'DNSE') IS NULL
    CREATE DATABASE DNSE;
GO

USE DNSE;
GO

/* ---------- Trường & chuyên ngành ---------- */
IF OBJECT_ID(N'dbo.Universities', N'U') IS NULL
CREATE TABLE dbo.Universities (
    Code      NVARCHAR(10)  NOT NULL PRIMARY KEY,
    FullName  NVARCHAR(200) NOT NULL,
    ShortName NVARCHAR(20)  NOT NULL,
    Address   NVARCHAR(300) NULL,
    Website   NVARCHAR(200) NULL,
    Lat       DECIMAL(9,6)  NULL,
    Lng       DECIMAL(9,6)  NULL
);
GO

IF OBJECT_ID(N'dbo.Majors', N'U') IS NULL
CREATE TABLE dbo.Majors (
    Id             INT IDENTITY(1,1) PRIMARY KEY,
    UniversityCode NVARCHAR(10)  NOT NULL REFERENCES dbo.Universities(Code),
    Code           NVARCHAR(20)  NOT NULL,
    Name           NVARCHAR(100) NOT NULL,
    CONSTRAINT UQ_Majors UNIQUE (UniversityCode, Code)
);
GO

/* ---------- Người dùng (thay cho localStorage) ---------- */
IF OBJECT_ID(N'dbo.Users', N'U') IS NULL
CREATE TABLE dbo.Users (
    Id             INT IDENTITY(1,1) PRIMARY KEY,
    Name           NVARCHAR(100) NOT NULL,
    UniversityCode NVARCHAR(10)  NOT NULL REFERENCES dbo.Universities(Code),
    MajorCode      NVARCHAR(20)  NOT NULL,
    MajorName      NVARCHAR(100) NOT NULL,
    CreatedAt      DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

/* ---------- Nội dung trang tổng quan ---------- */
IF OBJECT_ID(N'dbo.Schedules', N'U') IS NULL
CREATE TABLE dbo.Schedules (
    Id        INT IDENTITY(1,1) PRIMARY KEY,
    MajorCode NVARCHAR(20)  NULL,            -- NULL = áp dụng cho mọi ngành
    StartTime CHAR(5)       NOT NULL,        -- 'HH:mm'
    EndTime   CHAR(5)       NOT NULL,
    Subject   NVARCHAR(150) NOT NULL,
    Room      NVARCHAR(30)  NOT NULL,
    Building  NVARCHAR(50)  NOT NULL
);
GO

IF OBJECT_ID(N'dbo.Events', N'U') IS NULL
CREATE TABLE dbo.Events (
    Id          INT IDENTITY(1,1) PRIMARY KEY,
    EventDate   DATE           NOT NULL,
    TimeText    NVARCHAR(30)   NOT NULL,
    Type        NVARCHAR(20)   NOT NULL,     -- career | academic | sports ...
    TypeName    NVARCHAR(30)   NOT NULL,
    Title       NVARCHAR(200)  NOT NULL,
    Description NVARCHAR(500)  NULL,
    Location    NVARCHAR(200)  NULL
);
GO

IF OBJECT_ID(N'dbo.News', N'U') IS NULL
CREATE TABLE dbo.News (
    Id        INT IDENTITY(1,1) PRIMARY KEY,
    Category  NVARCHAR(30)  NOT NULL,
    Title     NVARCHAR(300) NOT NULL,
    CreatedAt DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

IF OBJECT_ID(N'dbo.DashboardWidgets', N'U') IS NULL
CREATE TABLE dbo.DashboardWidgets (
    MajorCode      NVARCHAR(20)  NOT NULL PRIMARY KEY,   -- 'DEFAULT' là mặc định
    DocTitle       NVARCHAR(150) NOT NULL,
    DocDesc        NVARCHAR(300) NOT NULL,
    Forum1Title    NVARCHAR(200) NOT NULL,
    Forum1Comments INT           NOT NULL DEFAULT 0,
    Forum2Title    NVARCHAR(200) NOT NULL,
    Forum2Comments INT           NOT NULL DEFAULT 0
);
GO

/* ---------- Bản đồ số ---------- */
IF OBJECT_ID(N'dbo.Places', N'U') IS NULL
CREATE TABLE dbo.Places (
    Id             NVARCHAR(20)  NOT NULL PRIMARY KEY,
    UniversityCode NVARCHAR(10)  NOT NULL REFERENCES dbo.Universities(Code),
    Name           NVARCHAR(200) NOT NULL,
    Category       NVARCHAR(20)  NOT NULL,   -- food | study | coffee | store
    Rating         DECIMAL(2,1)  NULL,
    Distance       NVARCHAR(20)  NULL,
    OpenHours      NVARCHAR(30)  NULL,
    Tags           NVARCHAR(200) NULL,       -- ngăn cách bằng dấu phẩy
    Lat            DECIMAL(9,6)  NOT NULL,
    Lng            DECIMAL(9,6)  NOT NULL,
    AiNote         NVARCHAR(300) NULL
);
GO

/* ---------- Diễn đàn ---------- */
IF OBJECT_ID(N'dbo.ForumPosts', N'U') IS NULL
CREATE TABLE dbo.ForumPosts (
    Id              INT IDENTITY(1,1) PRIMARY KEY,
    UserId          INT           NULL REFERENCES dbo.Users(Id),   -- NULL = bài mẫu
    AuthorName      NVARCHAR(100) NOT NULL,
    IsAnonymous     BIT           NOT NULL DEFAULT 0,
    UniversityLabel NVARCHAR(200) NOT NULL,
    Content         NVARCHAR(MAX) NOT NULL,    -- văn bản thuần, xuống dòng bằng \n
    Category        NVARCHAR(50)  NOT NULL,
    Tags            NVARCHAR(300) NULL,        -- ngăn cách bằng dấu |
    CreatedAt       DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

IF OBJECT_ID(N'dbo.ForumComments', N'U') IS NULL
CREATE TABLE dbo.ForumComments (
    Id          INT IDENTITY(1,1) PRIMARY KEY,
    PostId      INT           NOT NULL REFERENCES dbo.ForumPosts(Id) ON DELETE CASCADE,
    UserId      INT           NULL REFERENCES dbo.Users(Id),
    AuthorName  NVARCHAR(100) NOT NULL,
    IsAnonymous BIT           NOT NULL DEFAULT 0,
    Content     NVARCHAR(MAX) NOT NULL,
    CreatedAt   DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME()
);
GO

IF OBJECT_ID(N'dbo.PostLikes', N'U') IS NULL
CREATE TABLE dbo.PostLikes (
    PostId INT NOT NULL REFERENCES dbo.ForumPosts(Id) ON DELETE CASCADE,
    UserId INT NOT NULL REFERENCES dbo.Users(Id),
    CONSTRAINT PK_PostLikes PRIMARY KEY (PostId, UserId)
);
GO

/* ---------- Index ---------- */
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ForumPosts_CreatedAt')
    CREATE INDEX IX_ForumPosts_CreatedAt ON dbo.ForumPosts(CreatedAt DESC);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_ForumComments_PostId')
    CREATE INDEX IX_ForumComments_PostId ON dbo.ForumComments(PostId, CreatedAt);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Places_University')
    CREATE INDEX IX_Places_University ON dbo.Places(UniversityCode);
GO
