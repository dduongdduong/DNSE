/* =====================================================
   DNSE - Dữ liệu ban đầu (chuyển từ data.js sang SQL Server)
   Chạy sau schema.sql. Bảng nào đã có dữ liệu thì bỏ qua.
   ===================================================== */
USE DNSE;
GO

/* ---------- Trường ---------- */
IF NOT EXISTS (SELECT 1 FROM dbo.Universities)
INSERT INTO dbo.Universities (Code, FullName, ShortName, Address, Website, Lat, Lng) VALUES
(N'VKU',  N'ĐH CNTT và Truyền thông Việt - Hàn', N'VKU',  N'470 Trần Đại Nghĩa, Ngũ Hành Sơn, Đà Nẵng',            N'https://vku.udn.vn/',  15.975298, 108.252355),
(N'DUT',  N'Đại học Bách Khoa - ĐHĐN',           N'DUT',  N'54 Nguyễn Lương Bằng, Liên Chiểu, Đà Nẵng',            N'http://dut.udn.vn/',   16.073801, 108.149914),
(N'DUE',  N'Đại học Kinh tế - ĐHĐN',             N'DUE',  N'71 Ngũ Hành Sơn, Ngũ Hành Sơn, Đà Nẵng',               N'https://due.udn.vn/',  16.047165, 108.237827),
(N'UED',  N'Đại học Sư phạm - ĐHĐN',             N'UED',  N'459 Tôn Đức Thắng, Liên Chiểu, Đà Nẵng',               N'https://ued.udn.vn/',  16.060599, 108.155797),
(N'UFLS', N'Đại học Ngoại ngữ - ĐHĐN',           N'UFLS', N'131 Lương Nhữ Hộc, Cẩm Lệ, Đà Nẵng',                   N'https://ufl.udn.vn/',  16.039239, 108.219808),
(N'DDY',  N'Khoa Y Dược - ĐHĐN',                 N'DDY',  N'Khu đô thị Đại học Đà Nẵng, Ngũ Hành Sơn, Đà Nẵng',    N'http://smp.udn.vn/',   15.976822, 108.248674);
GO

/* ---------- Chuyên ngành ---------- */
IF NOT EXISTS (SELECT 1 FROM dbo.Majors)
INSERT INTO dbo.Majors (UniversityCode, Code, Name) VALUES
(N'VKU',  N'CNTT',   N'Công nghệ thông tin'),
(N'VKU',  N'MKT',    N'Marketing'),
(N'VKU',  N'QTKD',   N'Quản trị kinh doanh'),
(N'VKU',  N'TKVMBD', N'Thiết kế vi mạch bán dẫn'),
(N'VKU',  N'TTNT',   N'Trí tuệ nhân tạo'),
(N'VKU',  N'PTDL',   N'Phân tích dữ liệu'),
(N'VKU',  N'CNTC',   N'Công nghệ tài chính'),
(N'VKU',  N'QTDL',   N'Quản trị du lịch & lữ hành'),
(N'DUT',  N'CDT',    N'Cơ điện tử'),
(N'DUT',  N'KT',     N'Kiến trúc'),
(N'DUT',  N'XD',     N'Kỹ thuật xây dựng'),
(N'DUE',  N'KT',     N'Kế toán'),
(N'DUE',  N'TCNH',   N'Tài chính ngân hàng'),
(N'DUE',  N'MKT',    N'Marketing'),
(N'UED',  N'GD',     N'Giáo dục'),
(N'UED',  N'SP',     N'Sư phạm'),
(N'UFLS', N'ANH',    N'Tiếng Anh'),
(N'UFLS', N'PHAP',   N'Tiếng Pháp'),
(N'DDY',  N'Y',      N'Y học'),
(N'DDY',  N'DƯỢC',   N'Dược học');
GO

/* ---------- Lịch học ---------- */
IF NOT EXISTS (SELECT 1 FROM dbo.Schedules)
INSERT INTO dbo.Schedules (MajorCode, StartTime, EndTime, Subject, Room, Building) VALUES
(NULL, '07:30', '09:30', N'Kỹ thuật lập trình',      N'A201', N'Khu A'),
(NULL, '09:45', '11:45', N'Cơ sở dữ liệu',           N'A302', N'Khu A'),
(NULL, '13:30', '15:30', N'Thiết kế Web',            N'F203', N'Khu A'),
(NULL, '15:45', '17:45', N'Tiếng Anh chuyên ngành',  N'B101', N'Khu B');
GO

/* ---------- Sự kiện ---------- */
IF NOT EXISTS (SELECT 1 FROM dbo.Events)
INSERT INTO dbo.Events (EventDate, TimeText, Type, TypeName, Title, Description, Location) VALUES
('2026-05-15', N'08:00 - 16:00', N'career',   N'SỰ NGHIỆP', N'Ngày hội Việc làm Bách khoa 2026',
    N'Sự kiện kết nối sinh viên với hơn 50 doanh nghiệp lớn trong và ngoài nước. Cơ hội phỏng vấn trực tiếp, nhận học bổng.',
    N'Hội trường A, ĐH Bách khoa Đà Nẵng'),
('2026-05-20', N'14:57',         N'academic', N'HỌC THUẬT', N'Robocon 2026 - Vòng sơ khảo miền Trung',
    N'Cuộc thi robot quốc tế dành cho sinh viên đại học kỹ thuật. Các đội thi trình diễn khả năng sáng tạo robot tự động.',
    N'Nhà thi đấu ĐH Bách khoa, Liên Chiểu'),
('2026-05-25', N'07:00',         N'sports',   N'THỂ THAO',  N'Đại hội Thể thao Sinh viên Đà Nẵng',
    N'Giải đấu thể thao quy mô lớn dành cho sinh viên toàn thành phố với các môn bóng đá, bóng rổ và điền kinh.',
    N'Sân vận động Hòa Xuân');
GO

/* ---------- Tin mới ---------- */
IF NOT EXISTS (SELECT 1 FROM dbo.News)
INSERT INTO dbo.News (Category, Title, CreatedAt) VALUES
(N'HỌC BỔNG', N'Thông báo nộp hồ sơ xét học bổng học kỳ II 2025-2026', DATEADD(HOUR,  -2, SYSUTCDATETIME())),
(N'LỊCH HỌC', N'Thay đổi phòng học môn Tư tưởng HCM nhóm 2',            DATEADD(HOUR,  -5, SYSUTCDATETIME())),
(N'SỰ KIỆN',  N'Khai mạc giải bóng đá Student Cup 2026',                DATEADD(HOUR, -24, SYSUTCDATETIME()));
GO

/* ---------- Widget tổng quan theo ngành ---------- */
IF NOT EXISTS (SELECT 1 FROM dbo.DashboardWidgets)
INSERT INTO dbo.DashboardWidgets (MajorCode, DocTitle, DocDesc, Forum1Title, Forum1Comments, Forum2Title, Forum2Comments) VALUES
(N'CNTT', N'Bí kíp qua môn Lập trình',
    N'Tổng hợp source code, đề thi thuật toán & CSDL các năm trước.',
    N'Review giảng viên Lập trình Web thầy A...', 42,
    N'Cần tìm đồng đội làm đồ án ReactJS HKII', 15),
(N'CDT', N'Bản vẽ Cơ lý thuyết & AutoCAD',
    N'Bộ tài liệu bản vẽ và thuyết minh mẫu đạt điểm A+ các khóa trước.',
    N'Hỏi đáp bài tập Sức bền vật liệu tuần 3', 28,
    N'Gom đơn mua chung linh kiện làm Robot dò line', 10),
(N'KT', N'Case Study & Slide Kinh tế vĩ mô',
    N'Bộ đề thi trắc nghiệm và tiểu luận mẫu các môn chuyên ngành.',
    N'Xin tips chạy Ads Facebook đồ án Marketing', 56,
    N'Tìm nhóm học chung môn Kế toán doanh nghiệp', 22),
(N'Y', N'Atlas Giải phẫu & Sinh lý học',
    N'Ngân hàng câu hỏi trắc nghiệm Y khoa và flashcard ghi nhớ nhanh.',
    N'Kinh nghiệm đi lâm sàng bệnh viện cho năm 3', 89,
    N'Pass lại bộ xương mô hình còn mới 99%', 12),
(N'DEFAULT', N'Sổ tay Tân Sinh viên',
    N'Cẩm nang kỹ năng mềm và bí kíp sống sót qua 4 năm Đại học.',
    N'Góc tâm sự: Chuyện tìm trọ và ở ghép', 104,
    N'Làm sao đăng ký tín chỉ không bị sập web?', 88);
GO

/* ---------- Địa điểm quanh trường ---------- */
IF NOT EXISTS (SELECT 1 FROM dbo.Places)
INSERT INTO dbo.Places (Id, UniversityCode, Name, Category, Rating, Distance, OpenHours, Tags, Lat, Lng, AiNote) VALUES
(N'vku_1', N'VKU', N'Highlands Coffee Làng Đại Học', N'coffee', 4.2, N'250m', N'7:00 - 22:00', N'cà phê,wifi,ngồi học', 15.973000, 108.251000, N'Thích hợp ngồi học và làm bài tập nhóm sáng nay.'),
(N'vku_2', N'VKU', N'In ấn Minh Khoa',              N'study',  4.4, N'100m', N'7:00 - 21:00', N'in ấn,photocopy,đóng sách', 15.976500, 108.253000, N'Bạn có lịch nộp đồ án vào ngày mai, đừng quên in tài liệu nhé!'),
(N'vku_3', N'VKU', N'Cơm tấm Bà Năm',              N'food',   4.6, N'200m', N'6:00 - 14:00', N'cơm tấm,bình dân,ngon', 15.974000, 108.251500, N'Đã đến giờ trưa, quán này đang có đánh giá tốt từ sinh viên VKU.'),

(N'dut_1', N'DUT', N'The Coffee House Nguyễn Lương Bằng', N'coffee', 4.3, N'400m', N'07:00 - 22:00', N'wifi,cà phê,học bài', 16.074500, 108.149200, N'Điểm học nhóm quen thuộc sinh viên Bách khoa.'),
(N'dut_2', N'DUT', N'Bún Chả Cá Bà Lữ',              N'food',   4.5, N'850m', N'06:00 - 21:00', N'ăn sáng,đặc sản Đà Nẵng', 16.072000, 108.151000, N'Quán ăn nổi tiếng khu Liên Chiểu.'),
(N'dut_3', N'DUT', N'Tiệm Photo Sinh Viên BK',      N'study',  4.6, N'120m', N'07:00 - 19:00', N'in đồ án,photo,bản vẽ', 16.074000, 108.150500, N'Tiệm này in khổ lớn A0, A1 cực kỳ chuẩn nét.'),

(N'due_1', N'DUE', N'Roost Coffee Roasters', N'coffee', 4.7, N'550m', N'07:00 - 22:00', N'specialty coffee,study', 16.045500, 108.238000, N'Không gian yên tĩnh, bàn rộng, cực kỳ phù hợp học bài.'),
(N'due_2', N'DUE', N'Trà sữa Xian Môi',    N'coffee', 4.2, N'700m', N'06:00 - 22:30', N'trà sữa,đi nhóm,rẻ', 16.048000, 108.237000, N'Được sinh viên Kinh tế ghé rất nhiều vào buổi tối.'),
(N'due_3', N'DUE', N'Mì Quảng Thi',         N'food',   4.4, N'800m', N'06:00 - 13:00', N'mì quảng,ăn sáng', 16.048500, 108.236500, N'Nạp năng lượng sáng với tô mì quảng đậm chất Đà Thành.'),

(N'ufls_1', N'UFLS', N'Kojin Coffee & Tea Lương Nhữ Hộc', N'coffee', 4.5, N'150m', N'07:30 - 22:30', N'view đẹp,chụp ảnh,học bài', 16.039500, 108.218500, N'Quán cà phê xinh xắn ngay sát trường Ngoại ngữ.'),
(N'ufls_2', N'UFLS', N'Bánh Tráng Kẹp Dì Hoa',          N'food',   4.6, N'400m', N'15:00 - 22:00', N'ăn vặt,bánh tráng kẹp,sinh viên', 16.037000, 108.220500, N'Chiều tan học mà rủ bạn bè ra đây là chuẩn bài!'),
(N'ufls_3', N'UFLS', N'Nhà sách Ngoại Ngữ',              N'study',  4.8, N'100m', N'07:00 - 21:00', N'giáo trình,từ điển,sổ tay', 16.038000, 108.219000, N'Đầy đủ các loại giáo trình chuyên ngành tiếng Anh, Nhật, Hàn.'),

(N'ued_1', N'UED', N'TocoToco Tôn Đức Thắng', N'coffee', 4.3, N'250m', N'08:00 - 22:30', N'trà sữa,wifi,học nhóm', 16.061000, 108.155500, N'Chỗ ngồi rộng, hợp để họp nhóm làm tiểu luận.'),
(N'ued_2', N'UED', N'Cơm Gà Hồng Ngọc',      N'food',   4.2, N'300m', N'10:00 - 21:00', N'cơm gà quay,no bụng', 16.059500, 108.157000, N'Bữa trưa chất lượng cho những ngày học Full ca.'),
(N'ued_3', N'UED', N'Photo Sư Phạm',         N'study',  4.5, N'50m',  N'06:30 - 20:00', N'in màu,đóng bìa mạ vàng', 16.060000, 108.155000, N'Giá cực mềm cho sinh viên Sư phạm.'),

(N'ddy_1', N'DDY', N'Nhà thuốc Pharmacity Nam Kỳ Khởi Nghĩa', N'store',  4.8, N'400m', N'06:00 - 23:30', N'thuốc men,vật tư y tế', 15.977000, 108.249000, N'Tiện lợi mua thêm dụng cụ y tế dự phòng.'),
(N'ddy_2', N'DDY', N'Cafe Sinh Viên Y Khoa',                   N'coffee', 4.5, N'300m', N'06:30 - 22:00', N'thức khuya,yên tĩnh,cà phê đậm', 15.975500, 108.248000, N'Nơi lý tưởng để ''cày'' cuốc mùa thi trắc nghiệm.'),
(N'ddy_3', N'DDY', N'Cơm chay Tịnh Tâm',                       N'food',   4.7, N'600m', N'10:00 - 20:00', N'ăn chay,thanh đạm,sạch sẽ', 15.978000, 108.251000, N'Thay đổi khẩu vị với bữa trưa nhẹ nhàng, thanh lọc cơ thể.');
GO

/* ---------- Bài viết diễn đàn mẫu ----------
   Thời gian ghi theo giờ Việt Nam (UTC+7), lưu vào DB dưới dạng UTC.
   Số like / bình luận bắt đầu từ 0 và tăng theo thao tác thật của người dùng. */
IF NOT EXISTS (SELECT 1 FROM dbo.ForumPosts)
INSERT INTO dbo.ForumPosts (AuthorName, IsAnonymous, UniversityLabel, Content, Category, Tags, CreatedAt)
SELECT AuthorName, IsAnonymous, UniversityLabel, Content, Category, Tags, DATEADD(HOUR, -7, LocalTime)
FROM (VALUES
(N'Hoàng Nam', 0, N'ĐẠI HỌC DUY TÂN',
    N'Có ai biết quán cafe nào yên tĩnh gần trường để học bài không?' + CHAR(10) + CHAR(10) + N'Quán nào có ổ điện và wifi mạnh xíu ạ. Cảm ơn mọi người!',
    N'Học tập', N'ĐỜI SỐNG|CAFE|HỌC TẬP', CAST('2026-05-10 16:00' AS DATETIME2)),
(N'Sinh viên ẩn danh', 1, N'ĐẠI HỌC BÁCH KHOA ĐÀ NẴNG',
    N'Thú nhận thật: mình ghét môn Giải tích.' + CHAR(10) + CHAR(10) + N'Học năm nhất ĐH Bách khoa mà môn Giải tích làm mình muốn bỏ học. Thầy giảng quá nhanh, bài tập khó vô cùng. Có ai cảm thấy như mình không?',
    N'Confession', N'CONFESSION|TÂM SỰ & CONFESSION', CAST('2026-05-10 14:30' AS DATETIME2)),
(N'Trần Minh Tâm', 0, N'ĐẠI HỌC KINH TẾ ĐÀ NẴNG',
    N'Mình pass lại giáo trình Kinh tế vi mô bản mới nhất nha. Sách còn mới tinh 99%, có highlight xíu ở chương 1 thôi. Pass rẻ nửa giá cho sinh viên K49. Ai cần inbox mình nha!',
    N'Mua bán đồ cũ', N'GIÁO TRÌNH|PASS ĐỒ', CAST('2026-05-09 09:15' AS DATETIME2)),
(N'Ninja IT', 1, N'ĐẠI HỌC CNTT & TT VIỆT - HÀN',
    N'Sắp tới có cuộc thi Hackathon ở trường, nhóm mình (hiện có 2 dev Web) đang tìm kiếm 1 bạn rành về UI/UX Design hoặc AI (Python). Ai đam mê chạy deadline 48h thì ping mình nhé, giải thưởng to lắm á!',
    N'Việc làm', N'HACKATHON|TÌM ĐỒNG ĐỘI|SỰ KIỆN', CAST('2026-05-08 22:00' AS DATETIME2)),
(N'Mai Linh', 0, N'ĐẠI HỌC NGOẠI NGỮ ĐÀ NẴNG',
    N'Chào mọi người, mình đang tìm partner để luyện Speaking IELTS mục tiêu 7.0+. Mình rảnh vào các buổi tối thứ 3, 5, 7. Cần một bạn nghiêm túc và có kỷ luật xíu ạ. Ai có cùng mục tiêu thì inbox mình nhé!',
    N'Học tập', N'IELTS|TÌM ĐỒNG ĐỘI|NGOẠI NGỮ', CAST('2026-05-11 08:00' AS DATETIME2)),
(N'Bs. Tương Lai', 1, N'TRƯỜNG Y DƯỢC - ĐẠI HỌC ĐÀ NẴNG',
    N'Mai thi Giải phẫu mà giờ này mình vẫn chưa thuộc nổi tên các chi tiết xương sọ. Cứu bé với!!! 😭' + CHAR(10) + CHAR(10) + N'Có tiền bối nào có tips học Giải phẫu dễ nhớ hoặc có đề cương tóm tắt không ạ? Thức trắng đêm nay chắc luôn...',
    N'Hỏi đáp', N'GIẢI PHẪU|HỌC TẬP|THI CỬ', CAST('2026-05-12 23:45' AS DATETIME2)),
(N'Thầy giáo mầm non', 1, N'ĐẠI HỌC SƯ PHẠM ĐÀ NẴNG',
    N'Cho mình hỏi khu vực Liên Chiểu có gia đình nào cần tìm gia sư môn Toán hoặc KHTN cấp 2 không ạ? Mình là sinh viên năm 3 khoa Toán, đã có kinh nghiệm đi dạy trung tâm 2 năm. Giọng chuẩn, dễ nghe, nhiệt tình ạ.',
    N'Việc làm', N'GIA SƯ|VIỆC LÀM THÊM', CAST('2026-05-13 10:20' AS DATETIME2)),
(N'Lê Văn Hùng', 0, N'ĐẠI HỌC BÁCH KHOA ĐÀ NẴNG',
    N'Góc pass đồ: Mình cần pass lại bộ dụng cụ vẽ kỹ thuật (thước chữ T, compa, bảng vẽ A3) giá siêu hạt dẻ cho các bạn tân sinh viên cơ khí, kiến trúc. Mới dùng qua môn đúng 1 kỳ nên còn rất xịn, tặng kèm luôn xấp giấy A3 còn dư.',
    N'Mua bán đồ cũ', N'PASS ĐỒ|VẼ KỸ THUẬT', CAST('2026-05-13 15:10' AS DATETIME2)),
(N'Marketing Chúa tể', 1, N'ĐẠI HỌC KINH TẾ ĐÀ NẴNG',
    N'Mọi người ơi, xin hãy cứu rỗi nhóm làm tiểu luận của mình! 🙏' + CHAR(10) + CHAR(10) + N'Nhóm mình đang làm khảo sát về ''Thói quen chi tiêu và sử dụng ví điện tử của sinh viên Đà Nẵng''. Chỉ mất 2 phút tick bừa... à nhầm tick thật tâm thôi. Ai đi qua đi lại điền giúp mình chiếc form này với ạ. Mình xin hậu tạ bằng ngàn lời cảm ơn!',
    N'Khảo sát', N'TIỂU LUẬN|ĐỜI SỐNG|KHẢO SÁT', CAST('2026-05-13 19:00' AS DATETIME2)),
(N'Phạm Hải Yến', 0, N'ĐẠI HỌC CNTT & TRUYỀN THÔNG VIỆT - HÀN',
    N'Cuối tuần này CLB Nhiếp ảnh VKU tổ chức buổi photowalk dạo quanh bờ sông Hàn và cầu Rồng. Bạn nào không thuộc CLB nhưng đam mê chụp ảnh bằng điện thoại hay máy cơ đều có thể join chung cho vui nhé! Giao lưu kết bạn là chính ạ.',
    N'Sự kiện', N'CÂU LẠC BỘ|SỰ KIỆN|ĐỜI SỐNG', CAST('2026-05-14 09:30' AS DATETIME2)),
(N'Wibu chúa', 1, N'ĐẠI HỌC NGOẠI NGỮ ĐÀ NẴNG',
    N'Học tiếng Nhật đến N3 rồi mà sao phần Choukai (nghe hiểu) vẫn như vịt nghe sấm vậy mọi người 😭' + CHAR(10) + CHAR(10) + N'Có ai rảnh rỗi xem anime chung rồi luyện dịch không, học một mình trầm cảm quá. Mình bao trà sữa!',
    N'Confession', N'TÂM SỰ & CONFESSION|NGOẠI NGỮ', CAST('2026-05-12 21:15' AS DATETIME2)),
(N'Lê Nhật Ánh', 0, N'TRƯỜNG Y DƯỢC - ĐẠI HỌC ĐÀ NẴNG',
    N'GÓC CẢNH BÁO / TÌM ĐỒ THẤT LẠC!' + CHAR(10) + CHAR(10) + N'Sáng nay đi trực tại bệnh viện Đà Nẵng (hành lang khoa Nội), mình có đánh rơi một thẻ sinh viên tên Lê Nhật Ánh và một chiếc ống nghe kẹp thẻ. Ai nhặt được cho mình xin lại với ạ, không có đồ là không vào thực tập được hix hix. Mình xin hậu tạ!',
    N'Đồ thất lạc', N'TÌM ĐỒ|CẤP CỨU', CAST('2026-05-14 06:00' AS DATETIME2))
) AS v(AuthorName, IsAnonymous, UniversityLabel, Content, Category, Tags, LocalTime);
GO
