require('dotenv').config();
const sql = require('mssql');

const config = {
    server: process.env.DB_SERVER || 'localhost',
    port: parseInt(process.env.DB_PORT || '1433', 10),
    database: process.env.DB_NAME || 'DNSE',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    options: {
        instanceName: process.env.DB_INSTANCE || undefined,
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_CERT !== 'false'
    },
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 }
};

let poolPromise = null;

// Dùng chung 1 connection pool cho toàn server; nếu kết nối lỗi thì lần gọi sau sẽ thử lại
function getPool() {
    if (!poolPromise) {
        poolPromise = new sql.ConnectionPool(config).connect().catch(err => {
            poolPromise = null;
            throw err;
        });
    }
    return poolPromise;
}

module.exports = { sql, getPool };
