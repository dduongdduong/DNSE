import { api, escapeHtml, enc } from '../modules/api-client.js';
import { dateKey, dateOfDay, mondayOfThisWeek, todayNumber } from './time.js';
import { icon } from './icons.js';

export const esc = escapeHtml;
export { enc, api, icon };

// ------------------------------------------------------------ trạng thái dùng chung
export const state = {
    user: null,
    tab: 'dashboard',
    universities: [],
    dashboard: { widget: null, events: [], news: [], hotPosts: [] },
    week: [],              // lịch cả tuần của người dùng (kèm doneDates)
    stats: [],             // 5 tuần gần nhất cho biểu đồ
    places: [],            // địa điểm của mọi trường
    posts: [],
    comments: {},          // postId -> bình luận đã tải
    ready: { schedule: false, places: false, posts: false }
};

export const views = {};                    // tên tab -> { render() }
export const actions = {};                  // data-action -> hàm xử lý
export const inputs = {};                   // data-input -> hàm xử lý

export function renderView(name) {
    const v = views[name];
    const root = document.getElementById(`view-${name}`);
    if (v && root && state.tab === name) v.render(root);
}

export function renderCurrent() { renderView(state.tab); }

export function setTab(tab) {
    state.tab = tab;
    document.querySelectorAll('.dnse-view').forEach(v => v.classList.toggle('hidden', v.id !== `view-${tab}`));
    document.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('is-active', b.dataset.tab === tab));
    if (views.header) views.header.render(document.getElementById('app-header'));
    if (views.mobileNav) views.mobileNav.render(document.getElementById('mobile-nav'));
    renderCurrent();
    if (views[tab] && views[tab].onEnter) views[tab].onEnter();
    window.scrollTo({ top: 0 });
    history.replaceState(null, '', `#${tab}`);
}

// ------------------------------------------------------------ Thông báo nhỏ + hộp thoại
export function toast(message, type = 'info') {
    const root = document.getElementById('toast-root');
    if (!root) return;
    const el = document.createElement('div');
    el.className = `dnse-pop px-4 py-2.5 rounded-xl text-xs font-semibold shadow-lg border ${type === 'error' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-white text-[#133924] border-[#C7E6D4]'}`;
    el.textContent = message;
    root.appendChild(el);
    setTimeout(() => el.remove(), 3200);
}

export function openModal(innerHtml, { size = 'max-w-md', id = 'modal' } = {}) {
    closeModal();
    const root = document.getElementById('modal-root');
    root.innerHTML = `
        <div data-modal-backdrop class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs dnse-fade">
            <div id="${id}" role="dialog" aria-modal="true" class="bg-white rounded-2xl ${size} w-full p-6 border border-[#E2ECE5] shadow-2xl max-h-[90vh] overflow-y-auto dnse-pop">${innerHtml}</div>
        </div>`;
    const first = root.querySelector('input:not([type=hidden]),textarea,select');
    if (first) first.focus();
}

export function closeModal() {
    const root = document.getElementById('modal-root');
    if (root) root.innerHTML = '';
}

export function modalHeader(title, subtitle = '', iconName = '') {
    return `
    <div class="flex items-center justify-between pb-3 border-b border-[#E2ECE5]">
        <div class="flex items-center gap-2.5">
            ${iconName ? `<div class="w-9 h-9 rounded-xl bg-[#E3F3EA] text-[#2D8A56] flex items-center justify-center">${icon(iconName, 'w-5 h-5')}</div>` : ''}
            <div>
                <h3 class="font-bold text-base text-[#133924]">${title}</h3>
                ${subtitle ? `<p class="text-xs text-slate-500">${subtitle}</p>` : ''}
            </div>
        </div>
        <button data-action="close-modal" class="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer" aria-label="Đóng">${icon('x', 'w-5 h-5')}</button>
    </div>`;
}

actions['close-modal'] = () => closeModal();

export function initDelegation() {
    document.addEventListener('click', (e) => {
        if (e.target.matches('[data-modal-backdrop]')) { closeModal(); return; }
        const el = e.target.closest('[data-action]');
        if (el && actions[el.dataset.action]) actions[el.dataset.action](el, e);
    });
    document.addEventListener('input', (e) => {
        const el = e.target.closest('[data-input]');
        if (el && inputs[el.dataset.input]) inputs[el.dataset.input](el, e);
    });
    document.addEventListener('change', (e) => {
        const el = e.target.closest('[data-change]');
        if (el && inputs[el.dataset.change]) inputs[el.dataset.change](el, e);
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
        if (e.key === 'Enter') {
            const el = e.target.closest('[data-enter]');
            if (el && actions[el.dataset.enter]) { e.preventDefault(); actions[el.dataset.enter](el, e); }
        }
    });
}

// ------------------------------------------------------------ lịch học: dữ liệu dùng chung
export function weekMonday() { return mondayOfThisWeek(); }

export function occurrences(day) {
    const key = dateKey(dateOfDay(mondayOfThisWeek(), day));
    return state.week
        .filter(i => i.dayOfWeek === null || i.dayOfWeek === day)
        .map(i => ({ ...i, completed: i.doneDates.includes(key), dateKey: key, day }));
}

export function todaySchedules() { return occurrences(todayNumber()); }

export async function loadSchedule() {
    const u = state.user;
    const ws = dateKey(mondayOfThisWeek());
    try {
        const [week, stats] = await Promise.all([
            api.get(`/schedule/week?major=${enc(u.majorCode)}&userId=${enc(u.id)}&weekStart=${ws}`),
            api.get(`/schedule/stats?major=${enc(u.majorCode)}&userId=${enc(u.id)}&weekStart=${ws}`)
        ]);
        state.week = week;
        state.stats = stats;
    } catch (err) {
        console.error('Lỗi tải lịch:', err);
        toast(err.message, 'error');
    }
    state.ready.schedule = true;
}

export async function toggleDone(id, day) {
    const item = state.week.find(i => i.id === id);
    if (!item) return;
    const key = dateKey(dateOfDay(mondayOfThisWeek(), day));
    const was = item.doneDates.includes(key);
    item.doneDates = was ? item.doneDates.filter(d => d !== key) : [...item.doneDates, key];
    refreshSchedulePanels();
    try {
        await api.post(`/schedule/${id}/done`, { userId: state.user.id, date: key });
        loadStats();
    } catch (err) {
        item.doneDates = was ? [...item.doneDates, key] : item.doneDates.filter(d => d !== key);
        refreshSchedulePanels();
        toast(err.message, 'error');
    }
}

async function loadStats() {
    try {
        state.stats = await api.get(`/schedule/stats?major=${enc(state.user.majorCode)}&userId=${enc(state.user.id)}&weekStart=${dateKey(mondayOfThisWeek())}`);
        if (state.tab === 'dashboard') renderCurrent();
    } catch (e) { /* biểu đồ giữ số cũ */ }
}

export function refreshSchedulePanels() { renderCurrent(); }

export async function addScheduleItem(data, { markDone = false } = {}) {
    const created = await api.post('/schedule', { userId: state.user.id, ...data });
    state.week.push(created);
    state.week.sort((a, b) => (a.dayOfWeek || 0) - (b.dayOfWeek || 0) || a.startTime.localeCompare(b.startTime));
    if (markDone) await toggleDone(created.id, created.dayOfWeek || todayNumber());
    else refreshSchedulePanels();
    return created;
}
