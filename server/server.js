require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const { getPool } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const WEB_ROOT = path.join(__dirname, '..');

app.use(cors());
app.use(express.json({ limit: '100kb' }));

app.use('/api', routes);

['css', 'js', 'assets'].forEach(dir => {
    app.use('/' + dir, express.static(path.join(WEB_ROOT, dir)));
});
app.get('/', (req, res) => res.sendFile(path.join(WEB_ROOT, 'index.html')));
app.get('/index.html', (req, res) => res.sendFile(path.join(WEB_ROOT, 'index.html')));
app.get('/onboarding.html', (req, res) => res.sendFile(path.join(WEB_ROOT, 'onboarding.html')));

app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON không hợp lệ' });
    if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Dữ liệu gửi lên quá lớn' });
    console.error(err);
    res.status(500).json({ error: 'Lỗi máy chủ' });
});

app.listen(PORT, async () => {
    console.log(`DNSE chạy tại http://localhost:${PORT}`);
    if (!process.env.GEMINI_API_KEY) {
        console.warn('Chưa có GEMINI_API_KEY trong server/.env: chat AI và gợi ý dụng cụ sẽ dùng nội dung có sẵn.');
    }
    try {
        await getPool();
        console.log('Đã kết nối SQL Server.');
    } catch (err) {
        console.error('Chưa kết nối được SQL Server:', err.message);
        console.error('Kiểm tra lại file .env, SQL Server đã bật TCP/IP chưa, và đã chạy schema.sql + seed.sql chưa.');
    }
});
