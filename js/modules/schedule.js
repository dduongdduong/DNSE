import { api, escapeHtml as esc, enc } from './api-client.js';
import { openModal, closeModal } from './modal.js';

const TICK_MS = 15 * 1000;      
const REFRESH_MS = 60 * 1000;   
function todayNumber() {
    const d = new Date().getDay();
    return d === 0 ? 7 : d;
}

function toMinutes(hhmm) {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
}

function formatDuration(totalMinutes) {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    if (h === 0) return `${m} phút`;
    return m === 0 ? `${h} giờ` : `${h} giờ ${m} phút`;
}

export function buildScheduleHtml(items, nowMin) {
    if (!items || items.length === 0) {
        return '<div style="font-size: 13px; color: #666;">Hôm nay chưa có lịch học.</div>';
    }

    let nextShown = false;

    return items.map(item => {
        const start = toMinutes(item.startTime);
        const end = toMinutes(item.endTime);

        let status = 'upcoming';
        if (nowMin >= end) status = 'past';
        else if (nowMin >= start) status = 'active';

        let badge = '';
        if (status === 'active') {
            badge = `<span class="status-badge">⚡ Đang diễn ra • còn ${formatDuration(end - nowMin)}</span>`;
        } else if (status === 'upcoming' && !nextShown) {
            nextShown = true;
            badge = `<span class="status-badge">⏳ Bắt đầu sau ${formatDuration(start - nowMin)}</span>`;
        }

        return `
        <div class="timeline-item ${status}">
            <span class="time">${esc(item.startTime)} - ${esc(item.endTime)}</span>
            <h4>${esc(item.subject)}</h4>
            <span class="location">${esc(item.room)} • ${esc(item.building)}</span>
            ${badge}
        </div>`;
    }).join('');
}

export function initSchedule(userProfile) {
    const container = document.getElementById('schedule-timeline');
    if (!container) return;

    let items = [];
    let loadedDay = null;
    let lastHtml = '';

    function draw() {
        if (loadedDay !== null && todayNumber() !== loadedDay) {
            load();
            return;
        }
        const now = new Date();
        const html = buildScheduleHtml(items, now.getHours() * 60 + now.getMinutes());
        if (html !== lastHtml) {
            container.innerHTML = html;
            lastHtml = html;
        }
    }

    async function load() {
        const day = todayNumber();
        try {
            items = await api.get(`/schedule?major=${enc(userProfile.majorCode)}&day=${day}&userId=${enc(userProfile.id)}`);
            loadedDay = day;
            draw();
        } catch (err) {
            console.error('Lỗi tải lịch học:', err);
            if (loadedDay === null) {
                container.innerHTML = `<div style="font-size: 13px; color: #666;">${esc(err.message)}</div>`;
            }
        }
    }

    load();
    setInterval(draw, TICK_MS);
    setInterval(load, REFRESH_MS);

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) load();
    });

    document.addEventListener('dnse:schedule-changed', load);
}

// ======================================================================
// Trang "Lịch học": xem theo thứ / cả tuần, thêm lịch cá nhân, đánh dấu đã học
// ======================================================================

const DAY_LABEL = n => (n === 7 ? 'Chủ nhật' : `Thứ ${n + 1}`);   // 1 = Thứ 2 ... 7 = Chủ nhật

function pad(n) { return String(n).padStart(2, '0'); }

function dateKey(d) {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// Thứ 2 của tuần hiện tại (giờ máy người dùng)
function mondayOfThisWeek() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return d;
}

function dateOfDay(monday, day) {
    const d = new Date(monday);
    d.setDate(d.getDate() + day - 1);
    return d;
}

export function initSchedulePage(userProfile) {
    const list = document.getElementById('schedule-list');
    const tabs = document.getElementById('schedule-day-tabs');
    const banner = document.getElementById('schedule-next-banner');
    if (!list || !tabs || !banner) return;

    let monday = mondayOfThisWeek();
    let items = [];
    let selected = todayNumber();          // 1..7 hoặc 'all'
    let loaded = false;

    const isDone = (item, day) => item.doneDates.includes(dateKey(dateOfDay(monday, day)));
    const forDay = day => items.filter(i => i.dayOfWeek === null || i.dayOfWeek === day);

    function renderTabs() {
        const today = todayNumber();
        const all = [{ id: 'all', label: 'Cả tuần', sub: '' }];
        for (let d = 1; d <= 7; d++) {
            const date = dateOfDay(monday, d);
            all.push({ id: d, label: DAY_LABEL(d), sub: `${pad(date.getDate())}/${pad(date.getMonth() + 1)}` });
        }
        tabs.innerHTML = all.map(t => `
            <button type="button" class="day-tab ${t.id === selected ? 'active' : ''} ${t.id === today ? 'is-today' : ''}"
                    data-day="${t.id}" role="tab" aria-selected="${t.id === selected}">
                ${t.label}${t.sub ? `<small>${t.sub}</small>` : ''}
            </button>`).join('');
    }

    function itemHtml(item, day) {
        const done = isDone(item, day);
        return `
        <div class="sch-item ${done ? 'is-done' : ''}" data-id="${item.id}" data-day="${day}">
            <button type="button" class="sch-check" aria-pressed="${done}" title="${done ? 'Bỏ đánh dấu' : 'Đánh dấu đã học'}">✓</button>
            <div class="sch-time">${esc(item.startTime)}<small>${esc(item.endTime)}</small></div>
            <div class="sch-main">
                <h4>${esc(item.subject)}</h4>
                <p>${esc(item.room)} • ${esc(item.building)}${item.isMine ? ' • Lịch cá nhân' : ''}</p>
            </div>
            ${item.isMine ? '<button type="button" class="sch-del" title="Xóa lịch này">🗑️</button>' : ''}
        </div>`;
    }

    function renderList() {
        if (!loaded) return;
        if (selected === 'all') {
            list.innerHTML = [1, 2, 3, 4, 5, 6, 7].map(d => {
                const date = dateOfDay(monday, d);
                const rows = forDay(d);
                return `<div class="sch-day-title">${DAY_LABEL(d).toUpperCase()} · ${pad(date.getDate())}/${pad(date.getMonth() + 1)}</div>`
                    + (rows.length ? rows.map(i => itemHtml(i, d)).join('') : '<div class="sch-empty">Không có lịch</div>');
            }).join('');
            return;
        }
        const rows = forDay(selected);
        list.innerHTML = rows.length
            ? rows.map(i => itemHtml(i, selected)).join('')
            : '<div class="sch-empty">Không có lịch học cho ngày này.<br>Bấm "Thêm lịch" để tự thêm môn hoặc buổi học nhóm.</div>';
    }

    function renderBanner() {
        if (!loaded) return;
        const now = new Date();
        const nowMin = now.getHours() * 60 + now.getMinutes();
        const today = todayNumber();

        const next = forDay(today).find(i => !isDone(i, today) && toMinutes(i.endTime) > nowMin);
        if (!next) {
            banner.className = 'next-class is-empty';
            banner.innerHTML = '<div><div class="nc-label">HÔM NAY</div><h3>Bạn đã xong lịch hôm nay 🎉</h3><p>Hoặc hôm nay chưa có lịch nào chưa hoàn thành.</p></div>';
            return;
        }
        const start = toMinutes(next.startTime);
        const status = nowMin >= start
            ? `⚡ Đang diễn ra, còn ${formatDuration(toMinutes(next.endTime) - nowMin)}`
            : `⏳ Bắt đầu sau ${formatDuration(start - nowMin)}`;
        banner.className = 'next-class';
        banner.innerHTML = `<div>
            <div class="nc-label">CA HỌC KẾ TIẾP</div>
            <h3>${esc(next.subject)}</h3>
            <p>${esc(next.startTime)} - ${esc(next.endTime)} · ${esc(next.room)} · ${esc(next.building)} · ${status}</p>
        </div>`;
    }

    function renderAll() {
        renderTabs();
        renderList();
        renderBanner();
    }

    async function load() {
        monday = mondayOfThisWeek();
        try {
            items = await api.get(`/schedule/week?major=${enc(userProfile.majorCode)}&userId=${enc(userProfile.id)}&weekStart=${dateKey(monday)}`);
            loaded = true;
            renderAll();
        } catch (err) {
            console.error('Lỗi tải lịch tuần:', err);
            if (!loaded) list.innerHTML = `<div class="sch-empty">${esc(err.message)}</div>`;
        }
    }

    tabs.addEventListener('click', (e) => {
        const btn = e.target.closest('.day-tab');
        if (!btn) return;
        const v = btn.getAttribute('data-day');
        selected = v === 'all' ? 'all' : Number(v);
        renderTabs();
        renderList();
    });

    list.addEventListener('click', async (e) => {
        const row = e.target.closest('.sch-item');
        if (!row) return;
        const id = Number(row.getAttribute('data-id'));
        const day = Number(row.getAttribute('data-day'));
        const item = items.find(i => i.id === id);
        if (!item) return;

        if (e.target.closest('.sch-check')) {
            const key = dateKey(dateOfDay(monday, day));
            const wasDone = item.doneDates.includes(key);
            // Cập nhật ngay, lỗi thì hoàn lại
            item.doneDates = wasDone ? item.doneDates.filter(d => d !== key) : [...item.doneDates, key];
            renderAll();
            try {
                await api.post(`/schedule/${id}/done`, { userId: userProfile.id, date: key });
            } catch (err) {
                item.doneDates = wasDone ? [...item.doneDates, key] : item.doneDates.filter(d => d !== key);
                renderAll();
                alert(err.message);
            }
            return;
        }

        if (e.target.closest('.sch-del')) {
            if (!confirm(`Xóa lịch "${item.subject}"?`)) return;
            try {
                await api.del(`/schedule/${id}?userId=${enc(userProfile.id)}`);
                items = items.filter(i => i.id !== id);
                renderAll();
                document.dispatchEvent(new CustomEvent('dnse:schedule-changed'));
            } catch (err) {
                alert(err.message);
            }
        }
    });

    // ---- thêm lịch cá nhân
    const openBtn = document.getElementById('btn-open-add-schedule');
    const saveBtn = document.getElementById('btn-save-schedule');
    const errBox = document.getElementById('sch-error');
    const val = id => document.getElementById(id).value.trim();

    if (openBtn && saveBtn) {
        openBtn.addEventListener('click', () => {
            errBox.textContent = '';
            document.getElementById('sch-day').value = String(selected === 'all' ? todayNumber() : selected);
            openModal('schedule-modal');
        });

        saveBtn.addEventListener('click', async () => {
            errBox.textContent = '';
            const subject = val('sch-subject');
            const room = val('sch-room');
            const start = val('sch-start');
            const end = val('sch-end');
            if (!subject) { errBox.textContent = 'Nhập tên môn học hoặc hoạt động nhé.'; return; }
            if (!room) { errBox.textContent = 'Nhập phòng học nhé.'; return; }
            if (!start || !end || toMinutes(end) <= toMinutes(start)) { errBox.textContent = 'Giờ kết thúc phải sau giờ bắt đầu.'; return; }

            saveBtn.disabled = true;
            try {
                const created = await api.post('/schedule', {
                    userId: userProfile.id,
                    subject,
                    room,
                    building: val('sch-building'),
                    dayOfWeek: Number(document.getElementById('sch-day').value),
                    startTime: start,
                    endTime: end
                });
                items.push(created);
                items.sort((a, b) => (a.dayOfWeek || 0) - (b.dayOfWeek || 0) || a.startTime.localeCompare(b.startTime));
                selected = created.dayOfWeek;
                ['sch-subject', 'sch-room', 'sch-building'].forEach(id => { document.getElementById(id).value = ''; });
                closeModal('schedule-modal');
                renderAll();
                document.dispatchEvent(new CustomEvent('dnse:schedule-changed'));
            } catch (err) {
                errBox.textContent = err.message;
            } finally {
                saveBtn.disabled = false;
            }
        });
    }

    load();
    setInterval(() => {
        if (mondayOfThisWeek().getTime() !== monday.getTime()) load();   // sang tuần mới
        else renderBanner();
    }, TICK_MS * 2);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) load(); });
}
