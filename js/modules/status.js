import { api, escapeHtml as esc } from './api-client.js';

// Thẻ "Kết nối cơ sở dữ liệu" trong Cài đặt: kiểm tra SQL Server và số dòng của từng bảng
export function initDbStatus() {
    const btn = document.getElementById('btn-check-db');
    const out = document.getElementById('db-status-content');
    if (!btn || !out) return;

    btn.addEventListener('click', async () => {
        btn.disabled = true;
        out.textContent = 'Đang kiểm tra...';
        try {
            const s = await api.get('/status');
            if (!s.connected) {
                out.innerHTML = `<span class="db-bad">Chưa kết nối được SQL Server.</span><br>${esc(s.error)}<br>Kiểm tra file server/.env, SQL Server đã bật TCP/IP chưa.`;
                return;
            }
            const missing = s.tables.filter(t => t.rows === null).map(t => t.name);
            out.innerHTML = `
                <span class="db-ok"><span class="live-dot" style="display:inline-block;margin-right:6px"></span>Đã kết nối.</span>
                Máy chủ ${esc(s.server)} · CSDL ${esc(s.database)} · SQL Server ${esc(s.version)}
                <div class="db-tables">
                    ${s.tables.map(t => t.rows === null
                        ? `<div class="db-missing"><span>${esc(t.name)}</span><span>chưa có bảng</span></div>`
                        : `<div><span>${esc(t.name)}</span><span>${t.rows} dòng</span></div>`).join('')}
                </div>
                ${missing.length ? '<p style="margin-top:12px;color:var(--status-danger)">Có bảng chưa tồn tại: hãy chạy database/upgrade_v2.sql.</p>' : ''}`;
        } catch (err) {
            out.innerHTML = `<span class="db-bad">${esc(err.message)}</span>`;
        } finally {
            btn.disabled = false;
        }
    });
}
