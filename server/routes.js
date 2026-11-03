const express = require('express');
const { sql, getPool } = require('./db');
const ai = require('./ai');

const router = express.Router();

const POST_CATEGORIES = ['Học tập', 'Việc làm', 'Sự kiện', 'Review giảng viên', 'Confession', 'Mua bán đồ cũ', 'Đời sống', 'Hỏi đáp', 'Khảo sát', 'Đồ thất lạc'];
const PLACE_CATEGORIES = ['food', 'study', 'coffee', 'store', 'hostel'];

const wrap = fn => (req, res, next) => fn(req, res, next).catch(next);

class HttpError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

function toInt(value, label = 'id') {
    const n = Number.parseInt(value, 10);
    if (!Number.isInteger(n) || n <= 0) throw new HttpError(400, `${label} không hợp lệ`);
    return n;
}

function optionalInt(value) {
    if (value === undefined || value === null || value === '') return null;
    return toInt(value, 'userId');
}

function cleanText(value, max, label) {
    const text = typeof value === 'string' ? value.trim() : '';
    if (!text) throw new HttpError(400, `${label} không được để trống`);
    if (text.length > max) throw new HttpError(400, `${label} tối đa ${max} ký tự`);
    return text;
}

// Trường không bắt buộc: trống thì trả null
function optionalText(value, max, label) {
    const text = typeof value === 'string' ? value.trim() : '';
    if (!text) return null;
    if (text.length > max) throw new HttpError(400, `${label} tối đa ${max} ký tự`);
    return text;
}

function parseTime(value, label) {
    const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(typeof value === 'string' ? value.trim() : '');
    if (!m) throw new HttpError(400, `${label} không hợp lệ (định dạng HH:mm)`);
    return `${m[1]}:${m[2]}`;
}

function toMinutes(hhmm) {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
}

// Chỉ nhận chuỗi YYYY-MM-DD hợp lệ; ngày được truyền dưới dạng chuỗi để không bị lệch múi giờ
function parseDateStr(value, label) {
    const s = typeof value === 'string' ? value.trim() : '';
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    const d = m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null;
    if (!d || d.getUTCFullYear() !== +m[1] || d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) {
        throw new HttpError(400, `${label} không hợp lệ (định dạng YYYY-MM-DD)`);
    }
    return s;
}

// Giới hạn số lần gọi AI trên mỗi IP để không cạn quota của API key
function rateLimit({ windowMs, max }) {
    const hits = new Map();
    setInterval(() => {
        const now = Date.now();
        for (const [k, v] of hits) if (v.reset <= now) hits.delete(k);
    }, windowMs).unref();

    return (req, res, next) => {
        const now = Date.now();
        let h = hits.get(req.ip);
        if (!h || h.reset <= now) {
            h = { count: 0, reset: now + windowMs };
            hits.set(req.ip, h);
        }
        if (++h.count > max) return res.status(429).json({ error: 'Bạn hỏi nhanh quá, đợi một chút rồi thử lại nhé' });
        next();
    };
}


router.get('/universities', wrap(async (req, res) => {
    const pool = await getPool();
    const r = await pool.request().query(
        'SELECT Code, FullName, ShortName, Address, Website, Lat, Lng FROM dbo.Universities ORDER BY Code'
    );
    res.json(r.recordset.map(u => ({
        code: u.Code,
        fullName: u.FullName,
        shortName: u.ShortName,
        address: u.Address,
        website: u.Website,
        lat: u.Lat,
        lng: u.Lng
    })));
}));

router.get('/universities/:code/majors', wrap(async (req, res) => {
    const pool = await getPool();
    const r = await pool.request()
        .input('code', sql.NVarChar(10), req.params.code)
        .query('SELECT Code, Name FROM dbo.Majors WHERE UniversityCode = @code ORDER BY Id');
    res.json(r.recordset.map(m => ({ code: m.Code, name: m.Name })));
}));


function mapUser(row) {
    return {
        id: row.Id,
        name: row.Name,
        university: row.UniversityCode,
        major: row.MajorName,
        majorCode: row.MajorCode
    };
}

async function resolveMajor(pool, university, majorCode) {
    const r = await pool.request()
        .input('u', sql.NVarChar(10), String(university || ''))
        .input('c', sql.NVarChar(20), String(majorCode || ''))
        .query('SELECT Name FROM dbo.Majors WHERE UniversityCode = @u AND Code = @c');
    if (!r.recordset.length) throw new HttpError(400, 'Trường hoặc chuyên ngành không hợp lệ');
    return r.recordset[0].Name;
}

router.post('/users', wrap(async (req, res) => {
    const pool = await getPool();
    const name = cleanText(req.body.name, 100, 'Tên');
    const majorName = await resolveMajor(pool, req.body.university, req.body.majorCode);

    const r = await pool.request()
        .input('name', sql.NVarChar(100), name)
        .input('uni', sql.NVarChar(10), req.body.university)
        .input('mc', sql.NVarChar(20), req.body.majorCode)
        .input('mn', sql.NVarChar(100), majorName)
        .query(`INSERT INTO dbo.Users (Name, UniversityCode, MajorCode, MajorName)
                OUTPUT INSERTED.Id, INSERTED.Name, INSERTED.UniversityCode, INSERTED.MajorCode, INSERTED.MajorName
                VALUES (@name, @uni, @mc, @mn)`);
    res.status(201).json(mapUser(r.recordset[0]));
}));

router.get('/users/:id', wrap(async (req, res) => {
    const pool = await getPool();
    const r = await pool.request()
        .input('id', sql.Int, toInt(req.params.id))
        .query('SELECT Id, Name, UniversityCode, MajorCode, MajorName FROM dbo.Users WHERE Id = @id');
    if (!r.recordset.length) throw new HttpError(404, 'Không tìm thấy người dùng');
    res.json(mapUser(r.recordset[0]));
}));

router.put('/users/:id', wrap(async (req, res) => {
    const pool = await getPool();
    const id = toInt(req.params.id);
    const name = cleanText(req.body.name, 100, 'Tên');
    const majorName = await resolveMajor(pool, req.body.university, req.body.majorCode);

    const r = await pool.request()
        .input('id', sql.Int, id)
        .input('name', sql.NVarChar(100), name)
        .input('uni', sql.NVarChar(10), req.body.university)
        .input('mc', sql.NVarChar(20), req.body.majorCode)
        .input('mn', sql.NVarChar(100), majorName)
        .query(`UPDATE dbo.Users
                SET Name = @name, UniversityCode = @uni, MajorCode = @mc, MajorName = @mn
                OUTPUT INSERTED.Id, INSERTED.Name, INSERTED.UniversityCode, INSERTED.MajorCode, INSERTED.MajorName
                WHERE Id = @id`);
    if (!r.recordset.length) throw new HttpError(404, 'Không tìm thấy người dùng');
    res.json(mapUser(r.recordset[0]));
}));


router.get('/dashboard', wrap(async (req, res) => {
    const pool = await getPool();
    const major = String(req.query.major || 'DEFAULT');

    const [widgetRes, eventRes, newsRes, hotRes] = await Promise.all([
        pool.request().input('major', sql.NVarChar(20), major).query(`
            SELECT TOP 1 DocTitle, DocDesc, Forum1Title, Forum1Comments, Forum2Title, Forum2Comments
            FROM dbo.DashboardWidgets
            WHERE MajorCode IN (@major, N'DEFAULT')
            ORDER BY CASE WHEN MajorCode = @major THEN 0 ELSE 1 END`),
        pool.request().query(`
            SELECT TOP 6 DAY(EventDate) AS Day, MONTH(EventDate) AS Month, TimeText, Type, TypeName, Title, Description, Location
            FROM dbo.Events
            WHERE EventDate >= CAST(GETDATE() AS DATE)
            ORDER BY EventDate, Id`),
        pool.request().query(`
            SELECT TOP 5 Category, Title, CreatedAt
            FROM dbo.News
            ORDER BY CreatedAt DESC`),
        // Bài nổi bật = nhiều tim + bình luận thật; bài chưa có tương tác thì không được gọi là "hot"
        pool.request().query(`
            SELECT TOP 2 Id, Title, Likes, CommentCount FROM (
                SELECT p.Id, p.CreatedAt, LEFT(p.Content, 160) AS Title,
                       (SELECT COUNT(*) FROM dbo.PostLikes l WHERE l.PostId = p.Id) AS Likes,
                       (SELECT COUNT(*) FROM dbo.ForumComments c WHERE c.PostId = p.Id) AS CommentCount
                FROM dbo.ForumPosts p
            ) x
            WHERE Likes + CommentCount > 0
            ORDER BY Likes * 2 + CommentCount DESC, CreatedAt DESC`)
    ]);

    const w = widgetRes.recordset[0];
    res.json({
        widget: w ? {
            docTitle: w.DocTitle,
            docDesc: w.DocDesc,
            forum1Title: w.Forum1Title,
            forum1Comments: w.Forum1Comments,
            forum2Title: w.Forum2Title,
            forum2Comments: w.Forum2Comments
        } : null,
        events: eventRes.recordset.map(e => ({
            day: String(e.Day),
            month: `THÁNG ${e.Month}`,
            time: e.TimeText,
            type: e.Type,
            typeName: e.TypeName,
            title: e.Title,
            desc: e.Description,
            location: e.Location
        })),
        news: newsRes.recordset.map(n => ({
            category: n.Category,
            title: n.Title,
            createdAt: n.CreatedAt
        })),
        hotPosts: hotRes.recordset.map(h => ({
            id: h.Id,
            title: h.Title,
            likes: h.Likes,
            comments: h.CommentCount
        }))
    });
}));

// Lịch của một người = lịch chung theo ngành (UserId NULL) + lịch cá nhân tự thêm
const SCHEDULE_VISIBLE = `((UserId IS NULL AND (MajorCode IS NULL OR MajorCode = @major)) OR UserId = @uid)`;

function mapSchedule(s) {
    return {
        id: s.Id,
        dayOfWeek: s.DayOfWeek,          // 1 = Thứ 2 ... 6 = Thứ 7, 7 = Chủ nhật, null = mọi ngày
        startTime: s.StartTime,
        endTime: s.EndTime,
        subject: s.Subject,
        room: s.Room,
        building: s.Building,
        isMine: !!s.IsMine
    };
}

router.get('/schedule', wrap(async (req, res) => {
    const pool = await getPool();
    let day = null;
    if (req.query.day !== undefined) {
        day = toInt(req.query.day, 'day');
        if (day > 7) throw new HttpError(400, 'day không hợp lệ');
    }

    const r = await pool.request()
        .input('major', sql.NVarChar(20), String(req.query.major || ''))
        .input('day', sql.Int, day)
        .input('uid', sql.Int, optionalInt(req.query.userId))
        .query(`SELECT Id, DayOfWeek, StartTime, EndTime, Subject, Room, Building,
                       CASE WHEN UserId IS NOT NULL THEN 1 ELSE 0 END AS IsMine
                FROM dbo.Schedules
                WHERE ${SCHEDULE_VISIBLE}
                  AND (@day IS NULL OR DayOfWeek IS NULL OR DayOfWeek = @day)
                ORDER BY StartTime, Id`);

    res.set('Cache-Control', 'no-store');
    res.json(r.recordset.map(mapSchedule));
}));

// Cả tuần + các ngày đã đánh dấu "đã học" trong tuần bắt đầu từ weekStart (thứ 2, do trình duyệt gửi lên)
router.get('/schedule/week', wrap(async (req, res) => {
    const pool = await getPool();
    const weekStart = parseDateStr(req.query.weekStart, 'weekStart');
    const uid = optionalInt(req.query.userId);

    const items = await pool.request()
        .input('major', sql.NVarChar(20), String(req.query.major || ''))
        .input('uid', sql.Int, uid)
        .query(`SELECT Id, DayOfWeek, StartTime, EndTime, Subject, Room, Building,
                       CASE WHEN UserId IS NOT NULL THEN 1 ELSE 0 END AS IsMine
                FROM dbo.Schedules
                WHERE ${SCHEDULE_VISIBLE}
                ORDER BY ISNULL(DayOfWeek, 0), StartTime, Id`);

    const doneByItem = {};
    if (uid !== null) {
        const done = await pool.request()
            .input('uid', sql.Int, uid)
            .input('ws', sql.VarChar(10), weekStart)
            .query(`SELECT ScheduleId, CONVERT(CHAR(10), DoneOn, 23) AS D
                    FROM dbo.ScheduleDone
                    WHERE UserId = @uid
                      AND DoneOn BETWEEN CAST(@ws AS DATE) AND DATEADD(DAY, 6, CAST(@ws AS DATE))`);
        done.recordset.forEach(d => {
            (doneByItem[d.ScheduleId] = doneByItem[d.ScheduleId] || []).push(d.D);
        });
    }

    res.set('Cache-Control', 'no-store');
    res.json(items.recordset.map(s => ({ ...mapSchedule(s), doneDates: doneByItem[s.Id] || [] })));
}));

// Tỷ lệ hoàn thành 5 tuần gần nhất (tuần cuối = tuần chứa weekStart) cho biểu đồ ở trang tổng quan
router.get('/schedule/stats', wrap(async (req, res) => {
    const pool = await getPool();
    const weekStart = parseDateStr(req.query.weekStart, 'weekStart');
    const uid = toInt(req.query.userId, 'userId');

    const items = await pool.request()
        .input('major', sql.NVarChar(20), String(req.query.major || ''))
        .input('uid', sql.Int, uid)
        .query(`SELECT DayOfWeek FROM dbo.Schedules WHERE ${SCHEDULE_VISIBLE}`);
    const planned = items.recordset.reduce((n, s) => n + (s.DayOfWeek === null ? 7 : 1), 0);

    const done = await pool.request()
        .input('uid', sql.Int, uid)
        .input('ws', sql.VarChar(10), weekStart)
        .query(`SELECT CONVERT(CHAR(10), DoneOn, 23) AS D
                FROM dbo.ScheduleDone
                WHERE UserId = @uid
                  AND DoneOn >= DATEADD(DAY, -28, CAST(@ws AS DATE))
                  AND DoneOn <= DATEADD(DAY, 6, CAST(@ws AS DATE))`);

    const base = Date.parse(weekStart + 'T00:00:00Z');
    const weeks = [0, 1, 2, 3, 4].map(i => ({ weekStart: new Date(base - (4 - i) * 7 * 864e5).toISOString().slice(0, 10), planned, done: 0 }));
    done.recordset.forEach(r => {
        const idx = 4 + Math.floor((Date.parse(r.D + 'T00:00:00Z') - base) / (7 * 864e5));
        if (idx >= 0 && idx <= 4) weeks[idx].done += 1;
    });
    res.set('Cache-Control', 'no-store');
    res.json(weeks);
}));

router.post('/schedule', wrap(async (req, res) => {
    const pool = await getPool();
    const userId = toInt(req.body.userId, 'userId');
    await getUserOrFail(pool, userId);

    const subject = cleanText(req.body.subject, 150, 'Tên môn học');
    const room = cleanText(req.body.room, 30, 'Phòng học');
    const building = optionalText(req.body.building, 50, 'Khu / tòa nhà') || 'Chưa cập nhật';
    const startTime = parseTime(req.body.startTime, 'Giờ bắt đầu');
    const endTime = parseTime(req.body.endTime, 'Giờ kết thúc');
    if (toMinutes(endTime) <= toMinutes(startTime)) throw new HttpError(400, 'Giờ kết thúc phải sau giờ bắt đầu');
    const day = toInt(req.body.dayOfWeek, 'Thứ trong tuần');
    if (day > 7) throw new HttpError(400, 'Thứ trong tuần không hợp lệ');

    const count = await pool.request()
        .input('uid', sql.Int, userId)
        .query('SELECT COUNT(*) AS n FROM dbo.Schedules WHERE UserId = @uid');
    if (count.recordset[0].n >= 100) throw new HttpError(400, 'Bạn đã đạt giới hạn 100 lịch cá nhân');

    const r = await pool.request()
        .input('uid', sql.Int, userId)
        .input('day', sql.Int, day)
        .input('start', sql.Char(5), startTime)
        .input('end', sql.Char(5), endTime)
        .input('subject', sql.NVarChar(150), subject)
        .input('room', sql.NVarChar(30), room)
        .input('building', sql.NVarChar(50), building)
        .query(`INSERT INTO dbo.Schedules (MajorCode, UserId, DayOfWeek, StartTime, EndTime, Subject, Room, Building)
                OUTPUT INSERTED.Id, INSERTED.DayOfWeek, INSERTED.StartTime, INSERTED.EndTime,
                       INSERTED.Subject, INSERTED.Room, INSERTED.Building, 1 AS IsMine
                VALUES (NULL, @uid, @day, @start, @end, @subject, @room, @building)`);
    res.status(201).json({ ...mapSchedule(r.recordset[0]), doneDates: [] });
}));

router.delete('/schedule/:id', wrap(async (req, res) => {
    const pool = await getPool();
    const r = await pool.request()
        .input('id', sql.Int, toInt(req.params.id))
        .input('uid', sql.Int, toInt(req.query.userId, 'userId'))
        .query('DELETE FROM dbo.Schedules WHERE Id = @id AND UserId = @uid');
    if (!r.rowsAffected[0]) throw new HttpError(403, 'Bạn chỉ xóa được lịch cá nhân của chính mình');
    res.json({ ok: true });
}));

// Bật / tắt "đã học" cho một buổi trong một ngày cụ thể
router.post('/schedule/:id/done', wrap(async (req, res) => {
    const pool = await getPool();
    const id = toInt(req.params.id);
    const uid = toInt(req.body.userId, 'userId');
    const date = parseDateStr(req.body.date, 'date');

    const own = await pool.request()
        .input('id', sql.Int, id)
        .input('uid', sql.Int, uid)
        .query('SELECT 1 AS ok FROM dbo.Schedules WHERE Id = @id AND (UserId IS NULL OR UserId = @uid)');
    if (!own.recordset.length) throw new HttpError(404, 'Không tìm thấy buổi học');

    const r = await pool.request()
        .input('id', sql.Int, id)
        .input('uid', sql.Int, uid)
        .input('d', sql.VarChar(10), date)
        .query(`
            IF EXISTS (SELECT 1 FROM dbo.ScheduleDone WHERE ScheduleId = @id AND UserId = @uid AND DoneOn = CAST(@d AS DATE))
            BEGIN
                DELETE FROM dbo.ScheduleDone WHERE ScheduleId = @id AND UserId = @uid AND DoneOn = CAST(@d AS DATE);
                SELECT 0 AS Done;
            END
            ELSE
            BEGIN
                INSERT INTO dbo.ScheduleDone (ScheduleId, UserId, DoneOn) VALUES (@id, @uid, CAST(@d AS DATE));
                SELECT 1 AS Done;
            END`);
    res.json({ done: !!r.recordset[0].Done });
}));

function mapPlace(p) {
    return {
        id: p.Id,
        name: p.Name,
        category: p.Category,
        rating: p.Rating,
        distance: p.Distance,
        time: p.OpenHours,
        tags: p.Tags ? p.Tags.split(',') : [],
        lat: p.Lat,
        lng: p.Lng,
        aiNote: p.AiNote,
        address: p.Address,
        universityCode: p.UniversityCode,
        isCommunity: p.CreatedByUserId !== null && p.CreatedByUserId !== undefined,
        isMine: !!p.IsMine
    };
}

const PLACE_SELECT = `SELECT Id, UniversityCode, Name, Category, Rating, Distance, OpenHours, Tags, Lat, Lng, AiNote, Address, CreatedByUserId,
                             CASE WHEN @uid IS NOT NULL AND CreatedByUserId = @uid THEN 1 ELSE 0 END AS IsMine
                      FROM dbo.Places`;

router.get('/places', wrap(async (req, res) => {
    const pool = await getPool();
    const r = await pool.request()
        .input('uni', sql.NVarChar(10), String(req.query.university || ''))
        .input('uid', sql.Int, optionalInt(req.query.userId))
                .query(`${PLACE_SELECT} WHERE (@uni = 'ALL' OR UniversityCode = @uni) ORDER BY UniversityCode, Id`);
    res.json(r.recordset.map(mapPlace));
}));

// Sinh viên đóng góp địa điểm cho trường của mình. Chưa có tọa độ chính xác nên ghim tạm ở trường,
// giao diện sẽ tìm theo tên + địa chỉ khi mở bản đồ.
router.post('/places', wrap(async (req, res) => {
    const pool = await getPool();
    const userId = toInt(req.body.userId, 'userId');
    const user = await getUserOrFail(pool, userId);

    const name = cleanText(req.body.name, 150, 'Tên địa điểm');
    const category = PLACE_CATEGORIES.includes(req.body.category) ? req.body.category : null;
    if (!category) throw new HttpError(400, 'Loại địa điểm không hợp lệ');
    const address = cleanText(req.body.address, 300, 'Địa chỉ');
    const distance = optionalText(req.body.distance, 20, 'Khoảng cách');
    if (distance && !/^\d+([.,]\d+)?\s?(m|km)$/i.test(distance)) {
        throw new HttpError(400, 'Khoảng cách nhập dạng 250m hoặc 1.2km');
    }
    const openHours = optionalText(req.body.openHours, 30, 'Giờ mở cửa');
    const note = optionalText(req.body.note, 300, 'Ghi chú');
    const tags = optionalText(req.body.tags, 200, 'Từ khóa');

    const count = await pool.request()
        .input('uid', sql.Int, userId)
        .query('SELECT COUNT(*) AS n FROM dbo.Places WHERE CreatedByUserId = @uid');
    if (count.recordset[0].n >= 30) throw new HttpError(400, 'Bạn đã đạt giới hạn 30 địa điểm đóng góp');

    const uni = await pool.request()
        .input('code', sql.NVarChar(10), user.UniversityCode)
        .query('SELECT Lat, Lng FROM dbo.Universities WHERE Code = @code');
    if (!uni.recordset.length) throw new HttpError(400, 'Không tìm thấy trường của bạn');

    const id = 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 4);   // tối đa 20 ký tự

    await pool.request()
        .input('id', sql.NVarChar(20), id)
        .input('uni', sql.NVarChar(10), user.UniversityCode)
        .input('name', sql.NVarChar(200), name)
        .input('cat', sql.NVarChar(20), category)
        .input('dist', sql.NVarChar(20), distance ? distance.replace(',', '.').replace(/\s/g, '') : null)
        .input('hours', sql.NVarChar(30), openHours)
        .input('tags', sql.NVarChar(200), tags)
        .input('lat', sql.Decimal(9, 6), uni.recordset[0].Lat)
        .input('lng', sql.Decimal(9, 6), uni.recordset[0].Lng)
        .input('note', sql.NVarChar(300), note)
        .input('addr', sql.NVarChar(300), address)
        .input('uid', sql.Int, userId)
        .query(`INSERT INTO dbo.Places (Id, UniversityCode, Name, Category, Rating, Distance, OpenHours, Tags, Lat, Lng, AiNote, Address, CreatedByUserId)
                VALUES (@id, @uni, @name, @cat, NULL, @dist, @hours, @tags, @lat, @lng, @note, @addr, @uid)`);

    const created = await pool.request()
        .input('id', sql.NVarChar(20), id)
        .input('uid', sql.Int, userId)
        .query(`${PLACE_SELECT} WHERE Id = @id`);
    res.status(201).json(mapPlace(created.recordset[0]));
}));

router.delete('/places/:id', wrap(async (req, res) => {
    const pool = await getPool();
    const id = String(req.params.id || '');
    if (!/^[A-Za-z0-9_]{1,20}$/.test(id)) throw new HttpError(400, 'id không hợp lệ');
    const r = await pool.request()
        .input('id', sql.NVarChar(20), id)
        .input('uid', sql.Int, toInt(req.query.userId, 'userId'))
        .query('DELETE FROM dbo.Places WHERE Id = @id AND CreatedByUserId = @uid');
    if (!r.rowsAffected[0]) throw new HttpError(403, 'Bạn chỉ xóa được địa điểm do chính mình đóng góp');
    res.json({ ok: true });
}));

const POST_SELECT = `
    SELECT p.Id, p.AuthorName, p.IsAnonymous, p.UniversityLabel, p.Content, p.Category, p.Tags, p.CreatedAt,
           (SELECT COUNT(*) FROM dbo.PostLikes l WHERE l.PostId = p.Id) AS Likes,
           (SELECT COUNT(*) FROM dbo.ForumComments c WHERE c.PostId = p.Id) AS CommentCount,
           CASE WHEN @uid IS NOT NULL AND EXISTS (SELECT 1 FROM dbo.PostLikes l WHERE l.PostId = p.Id AND l.UserId = @uid)
                THEN 1 ELSE 0 END AS LikedByMe,
           CASE WHEN @uid IS NOT NULL AND p.UserId = @uid THEN 1 ELSE 0 END AS IsMine
    FROM dbo.ForumPosts p`;

function mapPost(row) {
    return {
        id: row.Id,
        author: row.AuthorName,
        isAnonymous: !!row.IsAnonymous,
        university: row.UniversityLabel,
        content: row.Content,
        category: row.Category,
        tags: row.Tags ? row.Tags.split('|') : [],
        createdAt: row.CreatedAt,
        likes: row.Likes,
        commentCount: row.CommentCount,
        likedByMe: !!row.LikedByMe,
        isMine: !!row.IsMine
    };
}

function mapComment(row) {
    return {
        id: row.Id,
        postId: row.PostId,
        author: row.AuthorName,
        isAnonymous: !!row.IsAnonymous,
        content: row.Content,
        createdAt: row.CreatedAt,
        isMine: !!row.IsMine
    };
}

async function getUserOrFail(pool, userId) {
    const r = await pool.request()
        .input('id', sql.Int, userId)
        .query('SELECT Id, Name, UniversityCode, MajorCode, MajorName FROM dbo.Users WHERE Id = @id');
    if (!r.recordset.length) throw new HttpError(401, 'Người dùng không tồn tại, hãy đăng nhập lại');
    return r.recordset[0];
}

function authorNameFor(user, isAnonymous) {
    return isAnonymous ? `Ninja ${user.MajorCode}` : user.Name;
}

router.get('/posts', wrap(async (req, res) => {
    const pool = await getPool();
    const r = await pool.request()
        .input('uid', sql.Int, optionalInt(req.query.userId))
        .query(`${POST_SELECT} ORDER BY p.CreatedAt DESC, p.Id DESC OFFSET 0 ROWS FETCH NEXT 100 ROWS ONLY`);
    res.json(r.recordset.map(mapPost));
}));

router.post('/posts', wrap(async (req, res) => {
    const pool = await getPool();
    const userId = toInt(req.body.userId, 'userId');
    const user = await getUserOrFail(pool, userId);

    const content = cleanText(req.body.content, 4000, 'Nội dung');
    const category = POST_CATEGORIES.includes(req.body.category) ? req.body.category : null;
    if (!category) throw new HttpError(400, 'Chủ đề không hợp lệ');
    const isAnonymous = req.body.isAnonymous === true;

    const uni = await pool.request()
        .input('code', sql.NVarChar(10), user.UniversityCode)
        .query('SELECT FullName FROM dbo.Universities WHERE Code = @code');
    const label = (uni.recordset[0] ? uni.recordset[0].FullName : user.UniversityCode).toUpperCase();
    const customTags = (Array.isArray(req.body.tags) ? req.body.tags : [])
        .map(x => String(x).replace(/[|#\r\n]/g, '').trim().toUpperCase().slice(0, 24))
        .filter(Boolean)
        .slice(0, 5);
    const tags = (customTags.length ? customTags : [category.toUpperCase(), isAnonymous ? 'CONFESSION' : user.MajorCode]).join('|');

    const ins = await pool.request()
        .input('uid', sql.Int, userId)
        .input('author', sql.NVarChar(100), authorNameFor(user, isAnonymous))
        .input('anon', sql.Bit, isAnonymous)
        .input('label', sql.NVarChar(200), label)
        .input('content', sql.NVarChar(sql.MAX), content)
        .input('cat', sql.NVarChar(50), category)
        .input('tags', sql.NVarChar(300), tags)
        .query(`INSERT INTO dbo.ForumPosts (UserId, AuthorName, IsAnonymous, UniversityLabel, Content, Category, Tags)
                OUTPUT INSERTED.Id
                VALUES (@uid, @author, @anon, @label, @content, @cat, @tags)`);

    const created = await pool.request()
        .input('uid', sql.Int, userId)
        .input('id', sql.Int, ins.recordset[0].Id)
        .query(`${POST_SELECT} WHERE p.Id = @id`);
    res.status(201).json(mapPost(created.recordset[0]));
}));

router.delete('/posts/:id', wrap(async (req, res) => {
    const pool = await getPool();
    const r = await pool.request()
        .input('id', sql.Int, toInt(req.params.id))
        .input('uid', sql.Int, toInt(req.query.userId, 'userId'))
        .query('DELETE FROM dbo.ForumPosts WHERE Id = @id AND UserId = @uid');
    if (!r.rowsAffected[0]) throw new HttpError(403, 'Bạn chỉ xóa được bài viết của chính mình');
    res.json({ ok: true });
}));

router.post('/posts/:id/like', wrap(async (req, res) => {
    const pool = await getPool();
    const r = await pool.request()
        .input('id', sql.Int, toInt(req.params.id))
        .input('uid', sql.Int, toInt(req.body.userId, 'userId'))
        .query(`
            IF EXISTS (SELECT 1 FROM dbo.PostLikes WHERE PostId = @id AND UserId = @uid)
            BEGIN
                DELETE FROM dbo.PostLikes WHERE PostId = @id AND UserId = @uid;
            END
            ELSE
            BEGIN
                INSERT INTO dbo.PostLikes (PostId, UserId) VALUES (@id, @uid);
            END

            SELECT (SELECT COUNT(*) FROM dbo.PostLikes WHERE PostId = @id) AS Likes,
                   CASE WHEN EXISTS (SELECT 1 FROM dbo.PostLikes WHERE PostId = @id AND UserId = @uid)
                        THEN 1 ELSE 0 END AS Liked`);
    res.json({ likes: r.recordset[0].Likes, liked: !!r.recordset[0].Liked });
}));

router.get('/posts/:id/comments', wrap(async (req, res) => {
    const pool = await getPool();
    const r = await pool.request()
        .input('id', sql.Int, toInt(req.params.id))
        .input('uid', sql.Int, optionalInt(req.query.userId))
        .query(`SELECT Id, PostId, AuthorName, IsAnonymous, Content, CreatedAt,
                       CASE WHEN @uid IS NOT NULL AND UserId = @uid THEN 1 ELSE 0 END AS IsMine
                FROM dbo.ForumComments
                WHERE PostId = @id
                ORDER BY CreatedAt, Id`);
    res.json(r.recordset.map(mapComment));
}));

router.post('/posts/:id/comments', wrap(async (req, res) => {
    const pool = await getPool();
    const postId = toInt(req.params.id);
    const userId = toInt(req.body.userId, 'userId');
    const user = await getUserOrFail(pool, userId);
    const content = cleanText(req.body.content, 2000, 'Bình luận');
    const isAnonymous = req.body.isAnonymous === true;

    const r = await pool.request()
        .input('pid', sql.Int, postId)
        .input('uid', sql.Int, userId)
        .input('author', sql.NVarChar(100), authorNameFor(user, isAnonymous))
        .input('anon', sql.Bit, isAnonymous)
        .input('content', sql.NVarChar(sql.MAX), content)
        .query(`INSERT INTO dbo.ForumComments (PostId, UserId, AuthorName, IsAnonymous, Content)
                OUTPUT INSERTED.Id, INSERTED.PostId, INSERTED.AuthorName, INSERTED.IsAnonymous,
                       INSERTED.Content, INSERTED.CreatedAt, 1 AS IsMine
                VALUES (@pid, @uid, @author, @anon, @content)`);
    res.status(201).json(mapComment(r.recordset[0]));
}));

router.delete('/comments/:id', wrap(async (req, res) => {
    const pool = await getPool();
    const r = await pool.request()
        .input('id', sql.Int, toInt(req.params.id))
        .input('uid', sql.Int, toInt(req.query.userId, 'userId'))
        .query('DELETE FROM dbo.ForumComments WHERE Id = @id AND UserId = @uid');
    if (!r.rowsAffected[0]) throw new HttpError(403, 'Bạn chỉ xóa được bình luận của chính mình');
    res.json({ ok: true });
}));


// ---------- AI (key Gemini nằm ở server/.env, không gửi xuống trình duyệt)

const aiLimiter = rateLimit({ windowMs: 60 * 1000, max: 15 });

function aiProfile(user) {
    return { name: user.Name, university: user.UniversityCode, major: user.MajorName, majorCode: user.MajorCode };
}

router.post('/ai/chat', aiLimiter, wrap(async (req, res) => {
    const pool = await getPool();
    const user = await getUserOrFail(pool, toInt(req.body.userId, 'userId'));
    const message = cleanText(req.body.message, 1000, 'Câu hỏi');
    res.json(await ai.chat(message, aiProfile(user)));
}));

router.post('/ai/tools-advice', aiLimiter, wrap(async (req, res) => {
    const pool = await getPool();
    const user = await getUserOrFail(pool, toInt(req.body.userId, 'userId'));
    const data = await ai.toolsAdvice(aiProfile(user), { refresh: req.body.refresh === true });

    const uni = await pool.request()
        .input('code', sql.NVarChar(10), user.UniversityCode)
        .query('SELECT ShortName, Website FROM dbo.Universities WHERE Code = @code');
    const studyLinks = [];
    if (uni.recordset[0] && uni.recordset[0].Website) {
        studyLinks.push({ label: `Website ${uni.recordset[0].ShortName}`, url: uni.recordset[0].Website });
    }
    studyLinks.push(...(data.extraLinks || []), { label: 'Google Scholar', url: 'https://scholar.google.com/' });

    res.json({
        roadmap_title: data.roadmap_title,
        advice_sections: data.advice_sections,
        essential_tools: data.essential_tools,
        study_links: studyLinks,
        source: data.source
    });
}));

const STATUS_TABLES = ['Universities', 'Majors', 'Users', 'Schedules', 'ScheduleDone', 'Events', 'News',
                       'DashboardWidgets', 'Places', 'ForumPosts', 'ForumComments', 'PostLikes'];

router.get('/status', wrap(async (req, res) => {
    if (!/^(::1|127\.0\.0\.1|::ffff:127\.0\.0\.1)$/.test(req.ip || '')) {
        throw new HttpError(403, 'Trạng thái CSDL chỉ xem được trên máy đang chạy server');
    }
    try {
        const pool = await getPool();
        const info = await pool.request().query(
            `SELECT @@SERVERNAME AS Server, DB_NAME() AS Db, CAST(SERVERPROPERTY('ProductVersion') AS NVARCHAR(50)) AS Version`);
        const tables = [];
        for (const name of STATUS_TABLES) {
            try {
                const c = await pool.request().query(`SELECT COUNT(*) AS n FROM dbo.${name}`);
                tables.push({ name, rows: c.recordset[0].n });
            } catch (e) {
                tables.push({ name, rows: null });   // bảng chưa tồn tại: chưa chạy upgrade_v2.sql
            }
        }
        const i = info.recordset[0];
        res.json({ connected: true, server: i.Server, database: i.Db, version: i.Version, tables });
    } catch (err) {
        res.json({ connected: false, error: err.message });
    }
}));

router.get('/health', wrap(async (req, res) => {
    const pool = await getPool();
    await pool.request().query('SELECT 1 AS ok');
    res.json({ ok: true });
}));

router.use((req, res) => res.status(404).json({ error: 'Không tìm thấy API' }));

router.use((err, req, res, next) => {
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });

    if (err.number === 547) return res.status(404).json({ error: 'Dữ liệu liên quan không còn tồn tại' });
    if (err.number === 2627 || err.number === 2601) return res.status(409).json({ error: 'Dữ liệu này đã tồn tại' });
    if (err.number === 207) {
        console.error('Thiếu cột trong CSDL, hãy chạy database/upgrade_v2.sql:', err.message);
        return res.status(500).json({ error: 'CSDL chưa được nâng cấp (chạy database/upgrade_v2.sql)' });
    }

    if (err.code === 'ESOCKET' || err.code === 'ELOGIN' || err.code === 'ETIMEOUT') {
        console.error('Lỗi kết nối SQL Server:', err.message);
        return res.status(503).json({ error: 'Không kết nối được cơ sở dữ liệu' });
    }

    console.error(err);
    res.status(500).json({ error: 'Lỗi máy chủ' });
});

module.exports = router;