import { escapeHtml as esc } from './api-client.js';
import { openModal } from './modal.js';

const SEEN_KEY = 'dnse_notif_seen';

export function timeAgo(iso) {
    const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (minutes < 1) return 'vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    return `${Math.floor(hours / 24)} ngày trước`;
}

function latestNewsTime(news) {
    return news.reduce((max, n) => Math.max(max, new Date(n.createdAt).getTime() || 0), 0);
}

// Chuông thông báo: tin mới + sự kiện sắp tới (lấy từ /api/dashboard). Chấm đỏ chỉ hiện khi có tin mới hơn lần xem trước.
export function initNotifications({ news, events }) {
    const btn = document.getElementById('btn-notification');
    const body = document.getElementById('notif-body');
    if (!btn || !body) return;

    const items = news || [];
    const latest = latestNewsTime(items);
    const seen = Number(localStorage.getItem(SEEN_KEY) || 0);
    btn.classList.toggle('has-unread', latest > seen);

    const newsHtml = items.length
        ? items.map(n => `
            <div class="notif-item">
                <div class="notif-meta"><strong>${esc(n.category)}</strong><span>${timeAgo(n.createdAt)}</span></div>
                <p>${esc(n.title)}</p>
            </div>`).join('')
        : '<div class="notif-empty">Chưa có tin mới.</div>';

    const eventsHtml = (events && events.length)
        ? events.map(ev => `
            <div class="notif-item">
                <div class="notif-meta"><strong>${esc(ev.typeName)}</strong><span>${esc(ev.day)}/${esc(String(ev.month).replace(/\D/g, ''))} · ${esc(ev.time)}</span></div>
                <p>${esc(ev.title)}</p>
                <small>📍 ${esc(ev.location)}</small>
            </div>`).join('')
        : '<div class="notif-empty">Chưa có sự kiện sắp tới.</div>';

    body.innerHTML = `
        <div class="notif-section-title">TIN MỚI</div>
        ${newsHtml}
        <div class="notif-section-title">SỰ KIỆN SẮP TỚI</div>
        ${eventsHtml}`;

    btn.addEventListener('click', () => {
        openModal('notif-modal');
        localStorage.setItem(SEEN_KEY, String(latest));
        btn.classList.remove('has-unread');
    });
}
