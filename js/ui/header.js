import { state, views, actions, esc, icon, setTab, renderCurrent } from './core.js';

export const NAV = [
    { id: 'dashboard', label: 'Tổng quan', short: 'Tổng quan', icon: 'layout-dashboard' },
    { id: 'map', label: 'Bản đồ số Campus', short: 'Bản đồ', icon: 'map-pin' },
    { id: 'forum', label: 'Diễn đàn Sinh viên', short: 'Diễn đàn', icon: 'message-square' },
    { id: 'schedule', label: 'Lịch học thông minh', short: 'Lịch học', icon: 'calendar-days' },
    { id: 'advisor', label: 'Cố vấn & Dụng cụ', short: 'Cố vấn', icon: 'graduation-cap' }
];

let mobileOpen = false;
const SEEN_KEY = 'dnse_notif_seen';

export function hasUnread() {
    const latest = state.dashboard.news.reduce((m, n) => Math.max(m, new Date(n.createdAt).getTime() || 0), 0);
    return latest > Number(localStorage.getItem(SEEN_KEY) || 0);
}
export function markSeen() {
    const latest = state.dashboard.news.reduce((m, n) => Math.max(m, new Date(n.createdAt).getTime() || 0), 0);
    localStorage.setItem(SEEN_KEY, String(latest));
}

views.header = {
    render(root) {
        const u = state.user;
        const avatar = (u.name || 'D').trim().charAt(0).toUpperCase();
        root.innerHTML = `
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between h-16 gap-2 sm:gap-4">
            <div data-action="tab" data-tab="dashboard" class="flex items-center gap-3 cursor-pointer shrink-0 group select-none">
              <div class="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1B5836] to-[#2D8A56] flex items-center justify-center text-white font-extrabold text-lg shadow-2xs tracking-tighter group-hover:scale-105 transition-transform">D</div>
              <div>
                <div class="flex items-center gap-1.5">
                  <span class="font-extrabold text-[#133924] text-lg tracking-tight">DNSE</span>
                  <span class="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#E3F3EA] text-[#1B5836]">Portal</span>
                </div>
                <p class="text-[10px] font-semibold tracking-wider text-slate-400 uppercase hidden sm:block">Bách Khoa Toàn Thư Sinh Viên</p>
              </div>
            </div>

            <nav class="hidden md:flex items-center gap-1 lg:gap-2">
              ${NAV.map(n => {
                  const a = state.tab === n.id;
                  return `<button data-action="tab" data-tab="${n.id}" class="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer relative ${a ? 'text-[#133924] bg-[#E3F3EA]/70 font-bold' : 'text-slate-600 hover:text-slate-900 hover:bg-[#F2F9F5]'}">
                    ${icon(n.icon, `w-4 h-4 transition-colors ${a ? 'text-[#2D8A56]' : 'text-slate-400'}`)}<span>${n.label}</span>
                    ${a ? '<span class="absolute bottom-0 left-3 right-3 h-0.5 bg-[#2D8A56] rounded-full"></span>' : ''}
                  </button>`;
              }).join('')}
            </nav>

            <div class="flex items-center gap-2 sm:gap-2.5">
              <button data-action="open-db" class="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold rounded-xl border border-[#C7E6D4] bg-[#F2F9F5] text-[#1B5836] hover:bg-[#E3F3EA] transition-all cursor-pointer shadow-2xs" title="Quản lý và kiểm tra kết nối CSDL SQL Server">
                <span class="relative flex h-2 w-2"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span></span>
                ${icon('database', 'w-3.5 h-3.5 hidden sm:inline')}<span class="font-bold hidden sm:inline">SQL Server</span>
              </button>
              <button data-action="open-notif" class="relative p-2 rounded-xl text-slate-600 hover:text-[#133924] hover:bg-[#F2F9F5] border border-slate-200 transition-colors cursor-pointer" title="Thông báo đào tạo & sự kiện">
                ${icon('bell', 'w-4 h-4')}
                ${hasUnread() ? '<span class="absolute top-1.5 right-1.5 w-2 h-2 bg-[#2D8A56] rounded-full"></span>' : ''}
              </button>
              <button data-action="open-profile" class="flex items-center gap-2 p-1.5 sm:pl-2 sm:pr-2.5 rounded-xl border border-[#E2ECE5] hover:border-[#C7E6D4] hover:bg-[#F2F9F5] transition-all cursor-pointer" title="Thay đổi trường học & chuyên ngành">
                <div class="w-7 h-7 rounded-full bg-[#2D8A56] text-white flex items-center justify-center font-bold text-xs shadow-2xs">${esc(avatar)}</div>
                <div class="hidden lg:block text-left text-xs">
                  <div class="font-bold text-slate-800 leading-tight truncate max-w-[110px]">${esc(u.name)}</div>
                  <div class="text-[10px] text-slate-500 font-medium">${esc(u.university)} · ${esc(u.majorCode || 'SV')}</div>
                </div>
                ${icon('chevron-down', 'w-3.5 h-3.5 text-slate-400 hidden sm:block')}
              </button>
              <button data-action="toggle-mobile-menu" class="md:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-[#F2F9F5] border border-slate-200 transition-colors" aria-label="Menu">
                ${icon(mobileOpen ? 'x' : 'menu', 'w-5 h-5')}
              </button>
            </div>
          </div>

          ${mobileOpen ? `
          <div class="md:hidden py-3 border-t border-[#E2ECE5] space-y-1 dnse-slide">
            ${NAV.map(n => {
                const a = state.tab === n.id;
                return `<button data-action="tab" data-tab="${n.id}" class="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${a ? 'bg-[#E3F3EA] text-[#133924] font-bold' : 'text-slate-600 hover:bg-[#F8FAF9]'}">
                  ${icon(n.icon, `w-4 h-4 ${a ? 'text-[#2D8A56]' : 'text-slate-400'}`)}<span>${n.label}</span></button>`;
            }).join('')}
            <div class="pt-2 px-3 flex items-center justify-between text-xs text-slate-500 border-t border-slate-100">
              <span>${esc(u.university)} · ${esc(u.major)}</span>
              <span class="flex items-center gap-3">
                <button data-action="open-profile" class="text-[#2D8A56] font-semibold">Đổi trường</button>
                <button data-action="logout" class="text-rose-600 font-semibold">Đăng xuất</button>
              </span>
            </div>
          </div>` : ''}
        </div>`;
    }
};

views.mobileNav = {
    render(root) {
        root.innerHTML = NAV.map(n => {
            const a = state.tab === n.id;
            return `<button data-action="tab" data-tab="${n.id}" class="flex flex-col items-center justify-center min-w-[56px] py-1 px-1 rounded-xl transition-all cursor-pointer ${a ? 'text-[#1B5836] font-semibold' : 'text-slate-500 hover:text-slate-800'}">
              <div class="p-1 rounded-lg transition-colors ${a ? 'bg-[#E3F3EA] text-[#2D8A56]' : 'text-slate-500'}">${icon(n.icon, 'w-5 h-5')}</div>
              <span class="text-[11px] mt-0.5 tracking-tight">${n.short}</span></button>`;
        }).join('');
    }
};

actions['tab'] = (el) => { mobileOpen = false; setTab(el.dataset.tab); };
actions['toggle-mobile-menu'] = () => { mobileOpen = !mobileOpen; views.header.render(document.getElementById('app-header')); };
