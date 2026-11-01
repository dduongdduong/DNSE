import { state, actions, esc, enc, api, icon, openModal, closeModal, modalHeader, toast, setTab, views } from './core.js';
import { timeAgo } from './time.js';
import { markSeen } from './header.js';
import { handleLogout } from '../modules/auth.js';

// ---------------------------------------------------------------- Thông báo
actions['open-notif'] = () => {
    const { news, events } = state.dashboard;
    markSeen();
    views.header.render(document.getElementById('app-header'));
    openModal(`
    ${modalHeader('Thông Báo & Sự Kiện Mới', '', 'bell')}
    <div class="mt-4 space-y-4 max-h-[60vh] overflow-y-auto pr-1">
      <div>
        <h4 class="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">${icon('circle-alert', 'w-3.5 h-3.5 text-[#2D8A56]')}Tin Đào Tạo & Học Bổng</h4>
        <div class="space-y-2">${news.length ? news.map(n => `
          <div class="p-3 bg-[#F8FAF9] border border-[#E2ECE5] rounded-xl text-xs">
            <div class="flex items-center justify-between text-[10px] text-slate-400 mb-1">
              <span class="font-bold text-[#1B5836] bg-[#E3F3EA] px-1.5 py-0.5 rounded">${esc(n.category)}</span><span>${timeAgo(n.createdAt)}</span></div>
            <p class="font-semibold text-slate-800 leading-snug">${esc(n.title)}</p></div>`).join('') : '<p class="text-xs text-slate-400">Chưa có tin mới.</p>'}</div>
      </div>
      <div>
        <h4 class="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">${icon('calendar', 'w-3.5 h-3.5 text-[#2D8A56]')}Sự Kiện Sắp Tới</h4>
        <div class="space-y-2">${events.length ? events.map(ev => `
          <div class="p-3 bg-[#F8FAF9] border border-[#E2ECE5] rounded-xl text-xs">
            <div class="flex items-center justify-between text-[10px] text-slate-400 mb-1">
              <span class="font-bold text-[#2D8A56]">${esc(ev.typeName)}</span><span class="font-mono">${esc(ev.day)}/${esc(String(ev.month).replace(/\D/g, ''))}</span></div>
            <h5 class="font-bold text-slate-800">${esc(ev.title)}</h5>
            <p class="text-[11px] text-slate-500 mt-1 line-clamp-2">${esc(ev.desc)}</p></div>`).join('') : '<p class="text-xs text-slate-400">Chưa có sự kiện sắp tới.</p>'}</div>
      </div>
    </div>
    <div class="mt-4 pt-3 border-t border-[#E2ECE5] flex justify-end">
      <button data-action="close-modal" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer">Đóng</button>
    </div>`);
};

// ---------------------------------------------------------------- Kết nối CSDL
async function loadDb() {
    const box = document.getElementById('db-box');
    if (!box) return;
    box.innerHTML = '<p class="text-xs text-slate-500 flex items-center gap-2"><span class="w-4 h-4 border-2 border-[#2D8A56] border-t-transparent rounded-full animate-spin"></span>Đang kiểm tra kết nối...</p>';
    try {
        const s = await api.get('/status');
        if (!s.connected) {
            box.innerHTML = `<div class="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800"><b>Chưa kết nối được SQL Server.</b><br>${esc(s.error)}<br>Kiểm tra file <code>server/.env</code> và SQL Server đã bật TCP/IP chưa.</div>`;
            return;
        }
        const missing = s.tables.filter(t => t.rows === null);
        box.innerHTML = `
          <div class="p-3.5 bg-[#F2F9F5] border border-[#C7E6D4] rounded-xl flex items-start gap-3">
            <div class="w-9 h-9 rounded-xl bg-white text-[#2D8A56] flex items-center justify-center shrink-0">${icon('shield-check', 'w-5 h-5')}</div>
            <div class="text-xs text-slate-700 leading-relaxed">
              <div class="font-bold text-[#133924] text-sm">Đã kết nối SQL Server</div>
              <div>Máy chủ: <span class="font-mono font-semibold">${esc(s.server)}</span></div>
              <div>CSDL: <span class="font-mono font-semibold">${esc(s.database)}</span> · Phiên bản <span class="font-mono">${esc(s.version)}</span></div>
            </div>
          </div>
          <div class="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-xs">
            ${s.tables.map(t => t.rows === null
                ? `<div class="flex justify-between border-b border-dashed border-rose-200 py-1 text-rose-600"><span>${esc(t.name)}</span><span>chưa có bảng</span></div>`
                : `<div class="flex justify-between border-b border-dashed border-slate-200 py-1"><span class="text-slate-600">${esc(t.name)}</span><span class="font-mono font-bold text-[#133924]">${t.rows}</span></div>`).join('')}
          </div>
          ${missing.length ? '<p class="mt-3 text-xs text-rose-600 font-semibold">Có bảng chưa tồn tại: hãy chạy database/upgrade_v2.sql trong SSMS.</p>' : ''}`;
    } catch (err) {
        box.innerHTML = `<div class="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">${esc(err.message)}</div>`;
    }
}

actions['open-db'] = () => {
    openModal(`
    ${modalHeader('Kết Nối Cơ Sở Dữ Liệu', 'Kiểm tra SQL Server và số dòng của từng bảng', 'database')}
    <div id="db-box" class="mt-4"></div>
    <div class="mt-4 pt-3 border-t border-[#E2ECE5] flex justify-end gap-2">
      <button data-action="db-refresh" class="flex items-center gap-1.5 px-3.5 py-2 bg-[#F2F9F5] border border-[#C7E6D4] text-[#1B5836] text-xs font-semibold rounded-xl hover:bg-[#E3F3EA] cursor-pointer">${icon('refresh-cw', 'w-3.5 h-3.5')}Kiểm tra lại</button>
      <button data-action="close-modal" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl cursor-pointer">Đóng</button>
    </div>`, { size: 'max-w-lg' });
    loadDb();
};
actions['db-refresh'] = () => loadDb();

// ---------------------------------------------------------------- Hồ sơ sinh viên
let pickUni = null;
let majors = [];

async function loadMajors(code, selected) {
    const sel = document.getElementById('pf-major');
    if (!sel) return;
    try {
        majors = await api.get(`/universities/${enc(code)}/majors`);
        sel.innerHTML = majors.map(m => `<option value="${esc(m.code)}">${esc(m.name)} (${esc(m.code)})</option>`).join('');
        if (selected && majors.some(m => m.code === selected)) sel.value = selected;
    } catch (err) { toast(err.message, 'error'); }
}

function uniGrid() {
    return state.universities.map(u => {
        const s = u.code === pickUni;
        return `<button type="button" data-action="pf-uni" data-code="${esc(u.code)}" class="p-2.5 rounded-xl border text-left transition-all cursor-pointer ${s ? 'border-[#2D8A56] bg-[#E3F3EA] text-[#133924] shadow-2xs font-semibold' : 'border-[#E2ECE5] bg-[#F8FAF9] text-slate-600 hover:border-slate-300'}">
          <div class="flex items-center justify-between"><span class="font-bold text-sm">${esc(u.code)}</span>${s ? icon('check', 'w-3.5 h-3.5 text-[#2D8A56]') : ''}</div>
          <p class="text-[10px] text-slate-500 mt-0.5 line-clamp-1">${esc(u.shortName)}</p></button>`;
    }).join('');
}

actions['open-profile'] = () => {
    const u = state.user;
    pickUni = u.university;
    openModal(`
    ${modalHeader('Hồ Sơ Sinh Viên DNSE', 'Cá nhân hóa tài liệu, lịch học và địa điểm theo trường của bạn', 'school')}
    <div class="mt-5 space-y-4">
      <div>
        <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Họ và Tên Sinh Viên</label>
        <div class="relative">${icon('user', 'w-4 h-4 text-slate-400 absolute left-3.5 top-3')}
          <input id="pf-name" type="text" maxlength="100" value="${esc(u.name)}" placeholder="VD: Nguyễn Văn An" class="w-full pl-10 pr-3.5 py-2.5 bg-[#F8FAF9] border border-[#E2ECE5] focus:border-[#2D8A56] focus:bg-white rounded-xl text-sm outline-none transition-all"></div>
      </div>
      <div>
        <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Trường Đại Học Thành Viên</label>
        <div id="pf-unis" class="grid grid-cols-2 sm:grid-cols-3 gap-2">${uniGrid()}</div>
      </div>
      <div>
        <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Chuyên Ngành Học Tập</label>
        <div class="relative">${icon('book-open', 'w-4 h-4 text-slate-400 absolute left-3.5 top-3')}
          <select id="pf-major" class="w-full pl-10 pr-8 py-2.5 bg-[#F8FAF9] border border-[#E2ECE5] focus:border-[#2D8A56] focus:bg-white rounded-xl text-sm outline-none transition-all appearance-none cursor-pointer"></select></div>
      </div>
      <div class="pt-3 flex items-center justify-between gap-2.5">
        <button data-action="logout" class="px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl cursor-pointer">Đăng xuất</button>
        <div class="flex items-center gap-2.5">
          <button data-action="close-modal" class="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer">Hủy</button>
          <button id="pf-save" data-action="pf-save" class="flex items-center gap-1.5 px-5 py-2.5 bg-[#2D8A56] hover:bg-[#227044] text-white text-xs font-semibold rounded-xl shadow-xs transition-all cursor-pointer">${icon('check', 'w-4 h-4')}Cập Nhật Hồ Sơ</button>
        </div>
      </div>
    </div>`, { size: 'max-w-lg' });
    loadMajors(pickUni, u.majorCode);
};

actions['pf-uni'] = (el) => {
    pickUni = el.dataset.code;
    document.getElementById('pf-unis').innerHTML = uniGrid();
    loadMajors(pickUni);
};

actions['pf-save'] = async (el) => {
    const name = document.getElementById('pf-name').value.trim();
    const majorCode = document.getElementById('pf-major').value;
    if (!name) { toast('Tên không được để trống nhé!', 'error'); return; }
    el.disabled = true;
    try {
        const updated = await api.put(`/users/${state.user.id}`, { name, university: pickUni, majorCode });
        localStorage.setItem('dnse_user', JSON.stringify({ ...updated, onboardingCompleted: true }));
        location.reload();
    } catch (err) {
        toast(err.message, 'error');
        el.disabled = false;
    }
};

actions['logout'] = () => handleLogout();
