// Gọi backend (Express + SQL Server). Mở qua http://localhost:3000 thì dùng đường dẫn tương đối;
// mở bằng Live Server / file thì trỏ thẳng về cổng 3000.
const API_BASE = location.port === '3000' ? '/api' : 'http://localhost:3000/api';

async function request(path, method = 'GET', body) {
    const options = { method, headers: { 'Content-Type': 'application/json' } };
    if (body !== undefined) options.body = JSON.stringify(body);

    let res;
    try {
        res = await fetch(API_BASE + path, options);
    } catch (e) {
        const err = new Error('Không kết nối được máy chủ. Hãy chạy server (npm start) rồi tải lại trang.');
        err.status = 0;
        throw err;
    }

    let data = null;
    try { data = await res.json(); } catch (e) { /* phản hồi không có nội dung */ }

    if (!res.ok) {
        const err = new Error((data && data.error) || `Lỗi máy chủ (${res.status})`);
        err.status = res.status;
        throw err;
    }
    return data;
}

export const api = {
    get: (path) => request(path),
    post: (path, body) => request(path, 'POST', body || {}),
    put: (path, body) => request(path, 'PUT', body || {}),
    del: (path) => request(path, 'DELETE')
};

// Danh sách trường ít thay đổi nên chỉ tải một lần
let universitiesCache = null;
export async function getUniversities() {
    if (!universitiesCache) universitiesCache = await api.get('/universities');
    return universitiesCache;
}

// Dữ liệu từ DB / người dùng đều đi qua hàm này trước khi chèn vào innerHTML
export function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function enc(value) {
    return encodeURIComponent(value ?? '');
}
