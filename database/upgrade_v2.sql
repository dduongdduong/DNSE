/* =====================================================
   DNSE - Nâng cấp v2 (SQL Server)
   - Chạy được trên DB đang dùng, không xóa dữ liệu cũ.
   - Chạy lại nhiều lần vẫn an toàn.
   - DB mới: chạy schema.sql -> seed.sql -> upgrade_v2.sql
   ===================================================== */
USE DNSE;
GO

/* ---------- 1. Lịch học: thứ trong tuần + lịch cá nhân ---------- */

-- 1 = Thứ 2 ... 6 = Thứ 7, 7 = Chủ nhật; NULL = áp dụng mọi ngày (đúng như routes.js đang dùng)
IF COL_LENGTH(N'dbo.Schedules', N'DayOfWeek') IS NULL
    ALTER TABLE dbo.Schedules ADD DayOfWeek TINYINT NULL;
GO

-- UserId có giá trị = lịch cá nhân do sinh viên tự thêm
IF COL_LENGTH(N'dbo.Schedules', N'UserId') IS NULL
    ALTER TABLE dbo.Schedules ADD UserId INT NULL
        CONSTRAINT FK_Schedules_Users REFERENCES dbo.Users(Id) ON DELETE CASCADE;
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = N'IX_Schedules_UserId')
    CREATE INDEX IX_Schedules_UserId ON dbo.Schedules(UserId);
GO

-- Đánh dấu "đã học" theo từng người và từng ngày
IF OBJECT_ID(N'dbo.ScheduleDone', N'U') IS NULL
CREATE TABLE dbo.ScheduleDone (
    ScheduleId INT  NOT NULL REFERENCES dbo.Schedules(Id) ON DELETE CASCADE,
    UserId     INT  NOT NULL REFERENCES dbo.Users(Id),
    DoneOn     DATE NOT NULL,
    CONSTRAINT PK_ScheduleDone PRIMARY KEY (ScheduleId, UserId, DoneOn)
);
GO

/* ---------- 2. Bản đồ: địa chỉ + địa điểm do sinh viên đóng góp ---------- */

IF COL_LENGTH(N'dbo.Places', N'Address') IS NULL
    ALTER TABLE dbo.Places ADD Address NVARCHAR(300) NULL;
GO

-- CreatedByUserId có giá trị = địa điểm do sinh viên thêm (chủ bài mới được xóa)
IF COL_LENGTH(N'dbo.Places', N'CreatedByUserId') IS NULL
    ALTER TABLE dbo.Places ADD CreatedByUserId INT NULL
        CONSTRAINT FK_Places_Users REFERENCES dbo.Users(Id);
GO

/* ---------- 3. Dữ liệu bổ sung (bỏ qua nếu đã có) ---------- */

-- Chuyên ngành còn thiếu
INSERT INTO dbo.Majors (UniversityCode, Code, Name)
SELECT v.U, v.C, v.N
FROM (VALUES
    (N'DUT',  N'CNTT',  N'Công nghệ thông tin'),
    (N'DUT',  N'DDT',   N'Điện - Điện tử'),
    (N'DUE',  N'QTKD',  N'Quản trị kinh doanh'),
    (N'UED',  N'NV',    N'Sư phạm Ngữ văn'),
    (N'UFLS', N'TRUNG', N'Tiếng Trung'),
    (N'UFLS', N'NHAT',  N'Tiếng Nhật'),
    (N'UFLS', N'HAN',   N'Tiếng Hàn'),
    (N'DDY',  N'RHM',   N'Răng Hàm Mặt')
) AS v(U, C, N)
WHERE NOT EXISTS (SELECT 1 FROM dbo.Majors m WHERE m.UniversityCode = v.U AND m.Code = v.C);
GO

-- Lịch học theo thứ (1 = Thứ 2 ... 7 = Chủ nhật)
INSERT INTO dbo.Schedules (MajorCode, DayOfWeek, StartTime, EndTime, Subject, Room, Building)
SELECT v.M, v.D, v.S, v.E, v.Sub, v.R, v.B
FROM (VALUES
    (N'CNTT', 1, '07:30', '09:30', N'Kỹ thuật lập trình nâng cao (React & Node.js)', N'A201',     N'Khu Công nghệ A'),
    (N'CNTT', 1, '09:45', '11:45', N'Hệ quản trị Cơ sở dữ liệu SQL Server',          N'Lab B102',  N'Tòa nhà Kỹ thuật B'),
    (N'CNTT', 3, '13:30', '15:30', N'Thiết kế giao diện UI/UX',                       N'F304',      N'Khu Sáng tạo F'),
    (N'CNTT', 4, '15:45', '17:45', N'Tiếng Anh chuyên ngành CNTT',                    N'C202',      N'Khu Ngoại ngữ C'),
    (NULL,    2, '07:30', '09:30', N'Triết học Mác - Lênin',                          N'Hội trường', N'Tòa nhà Điều hành')
) AS v(M, D, S, E, Sub, R, B)
WHERE NOT EXISTS (
    SELECT 1 FROM dbo.Schedules s
    WHERE s.Subject = v.Sub AND s.DayOfWeek = v.D AND s.UserId IS NULL
);
GO

-- Sự kiện sắp tới (các sự kiện cũ trong seed.sql đã qua ngày, trang tổng quan chỉ hiển thị sự kiện từ hôm nay trở đi)
INSERT INTO dbo.Events (EventDate, TimeText, Type, TypeName, Title, Description, Location)
SELECT CAST(v.D AS DATE), v.T, v.Ty, v.TN, v.Ti, v.De, v.Lo
FROM (VALUES
    ('2026-11-05', N'08:00 - 16:30', N'career',   N'SỰ NGHIỆP', N'Ngày hội Việc làm & Thực tập Đà Nẵng 2026',
        N'Gặp trực tiếp các doanh nghiệp công nghệ tại Đà Nẵng, nhận góp ý CV và phỏng vấn thử ngay tại sự kiện.',
        N'Hội trường A - ĐH Bách Khoa Đà Nẵng'),
    ('2026-11-12', N'14:00 - 17:30', N'academic', N'HỌC THUẬT', N'Hội thảo: AI và ứng dụng trong thiết kế vi mạch',
        N'Chia sẻ về xu hướng trí tuệ nhân tạo và vi mạch bán dẫn, cơ hội nghề nghiệp cho sinh viên tại Đà Nẵng.',
        N'Hội trường - ĐH CNTT & TT Việt - Hàn'),
    ('2026-11-20', N'07:30 - 11:30', N'sports',   N'THỂ THAO',  N'Giải bóng đá Sinh viên ĐH Đà Nẵng - Cup Mùa Thu 2026',
        N'Vòng chung kết giữa các đội tuyển đến từ các trường thành viên Đại học Đà Nẵng.',
        N'Sân vận động Đà Nẵng')
) AS v(D, T, Ty, TN, Ti, De, Lo)
WHERE NOT EXISTS (SELECT 1 FROM dbo.Events e WHERE e.Title = v.Ti);
GO

-- Tin mới (thời gian tính từ lúc chạy script)
INSERT INTO dbo.News (Category, Title, CreatedAt)
SELECT v.C, v.T, DATEADD(HOUR, v.H, SYSUTCDATETIME())
FROM (VALUES
    (N'HỌC BỔNG',  N'Thông báo nộp hồ sơ xét học bổng khuyến khích học tập kỳ I năm học 2026 - 2027', -3),
    (N'ĐÀO TẠO',   N'Mở cổng đăng ký môn học và điều chỉnh thời khóa biểu đợt 2',                      -20),
    (N'KÝ TÚC XÁ', N'Hướng dẫn gia hạn chỗ ở ký túc xá học kỳ mới',                                    -48)
) AS v(C, T, H)
WHERE NOT EXISTS (SELECT 1 FROM dbo.News n WHERE n.Title = v.T);
GO

PRINT N'Nâng cấp v2 hoàn tất.';
GO
