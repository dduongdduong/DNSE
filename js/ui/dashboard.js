import { state, views, actions, esc, icon, toggleDone, todaySchedules } from './core.js';
import { timeAgo, todayNumber, toMinutes, formatDuration } from './time.js';
import { progressWidget, gpaWidget, pomodoroWidget } from './widgets.js';

export const CAT_LABEL = { coffee: 'Cà phê', food: 'Quán ăn', study: 'In ấn', store: 'Cửa hàng', hostel: 'Nhà trọ' };
export const ratingText = r => (r != null ? `★ ${Number(r).toFixed(1)}` : 'Mới');

let showAllToday = false;
actions['today-all'] = () => { showAllToday = !showAllToday; refreshToday(); };

// Trạng thái từng ca so với giờ hiện tại: đang diễn ra / sắp tới / đã qua / đã học xong
function classify(list) {
    const now = new Date(), nowMin = now.getHours() * 60 + now.getMinutes();
    let nextFound = false;
    return list.map(i => {
        const s = toMinutes(i.startTime), e = toMinutes(i.endTime);
        if (i.completed) return { ...i, st: 'done' };
        if (nowMin >= s && nowMin < e) return { ...i, st: 'live', note: `còn ${formatDuration(e - nowMin)}` };
        if (nowMin < s) { const st = nextFound ? 'later' : 'next'; nextFound = true; return { ...i, st, note: `sau ${formatDuration(s - nowMin)}` }; }
        return { ...i, st: 'past' };
    });
}

function todayPanel() {
    const all = classify(todaySchedules());
    const active = all.filter(i => i.st === 'live' || i.st === 'next' || i.st === 'later');
    const rest = all.filter(i => !active.includes(i));
    const list = showAllToday ? all : active.slice(0, 4);
    const hidden = showAllToday ? 0 : all.length - list.length;

    const card = i => {
        const live = i.st === 'live', next = i.st === 'next', done = i.st === 'done', past = i.st === 'past';
        const box = live ? 'bg-[#E3F3EA] border-[#2D8A56] ring-2 ring-[#2D8A56]/20 shadow-sm'
            : next ? 'bg-[#F2F9F5] border-[#C7E6D4]'
            : done ? 'bg-slate-50 border-slate-200 opacity-60'
            : past ? 'bg-slate-50 border-slate-200 opacity-70' : 'bg-[#F8FAF9] border-[#E2ECE5] hover:border-[#C7E6D4]';
        const badge = live ? `<span class="inline-flex items-center gap-1.5 text-[10px] font-extrabold text-white bg-[#2D8A56] px-2 py-0.5 rounded-full uppercase tracking-wide"><span class="relative flex h-1.5 w-1.5"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span><span class="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span></span>Đang diễn ra · ${i.note}</span>`
            : next ? `<span class="text-[10px] font-bold text-[#1B5836] bg-white border border-[#C7E6D4] px-2 py-0.5 rounded-full uppercase tracking-wide">Sắp tới · ${i.note}</span>`
            : past ? '<span class="text-[10px] font-semibold text-slate-500 bg-slate-200/70 px-2 py-0.5 rounded-full uppercase">Đã qua</span>'
            : done ? '<span class="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full uppercase">Đã học xong</span>' : '';
        return `
        <div class="relative p-3 rounded-xl border transition-all flex items-start justify-between gap-2 ${box}">
          ${live ? '<span class="absolute left-0 top-3 bottom-3 w-1 rounded-r-full bg-[#2D8A56]"></span>' : ''}
          <div class="min-w-0 ${live ? 'pl-1.5' : ''}">
            ${badge ? `<div class="mb-1.5">${badge}</div>` : ''}
            <div class="flex items-center gap-2 flex-wrap"><span class="text-xs font-bold font-mono ${live ? 'text-white bg-[#2D8A56]' : 'text-[#2D8A56] bg-[#E3F3EA]'} px-2 py-0.5 rounded-md">${esc(i.startTime)} - ${esc(i.endTime)}</span><span class="text-xs ${live ? 'text-slate-700 font-bold' : 'text-slate-500 font-semibold'}">${esc(i.room)}</span></div>
            <h4 class="mt-1.5 ${live ? 'text-sm md:text-base font-extrabold text-[#133924]' : 'text-xs md:text-sm font-bold text-slate-800'} ${done ? 'line-through text-slate-500' : ''}">${esc(i.subject)}</h4>
            <p class="text-[11px] ${live ? 'text-slate-600' : 'text-slate-400'} mt-0.5 flex items-center gap-1">${icon('building', 'w-3 h-3')}${esc(i.building)}</p>
          </div>
          <button data-action="toggle-today" data-id="${i.id}" class="p-1 rounded-lg transition-colors cursor-pointer shrink-0 ${i.completed ? 'text-emerald-600' : live ? 'text-[#2D8A56] hover:text-[#1B5836]' : 'text-slate-300 hover:text-slate-500'}" title="${i.completed ? 'Bỏ đánh dấu' : 'Đánh dấu đã học'}">${icon('circle-check', 'w-5 h-5')}</button>
        </div>`;
    };

    return `
    <div class="flex items-center justify-between mb-4">
      <h3 class="text-base font-bold text-[#133924] flex items-center gap-2">${icon('clock', 'w-4 h-4 text-[#2D8A56]')}Lịch Học Hôm Nay</h3>
      <button data-action="tab" data-tab="schedule" class="text-xs font-semibold text-[#2D8A56] hover:text-[#1B5836] cursor-pointer">Toàn bộ lịch ↗</button>
    </div>
    ${all.length === 0 ? '<p class="text-xs text-slate-500 py-4 text-center">Hôm nay không có lịch học!</p>'
      : list.length === 0 ? '<p class="text-xs text-emerald-700 py-3 text-center font-semibold">Bạn đã xong hoặc đã qua hết các ca hôm nay 🎉</p>'
      : `<div class="space-y-2.5">${list.map(card).join('')}</div>`}
    ${all.length && (hidden > 0 || showAllToday) ? `<button data-action="today-all" class="w-full text-center text-[11px] font-semibold text-[#2D8A56] pt-2.5 cursor-pointer">${showAllToday ? 'Chỉ xem ca đang và sắp diễn ra' : `Xem cả ${hidden} ca đã qua / đã xong`}</button>` : ''}`;
}

function refreshToday() { const el = document.getElementById('today-panel'); if (el) el.innerHTML = todayPanel(); }
setInterval(() => { if (state.tab === 'dashboard') refreshToday(); }, 30000);   // cập nhật "đang diễn ra" theo giờ

actions['toggle-today'] = (el) => toggleDone(Number(el.dataset.id), todayNumber());

function metric(label, ic, value, sub, mono = true) {
    return `<div class="p-4 bg-white border border-[#E2ECE5] rounded-xl shadow-2xs">
      <div class="flex items-center justify-between text-slate-500 mb-2"><span class="text-xs font-semibold uppercase tracking-wider">${label}</span>
        <div class="p-1.5 rounded-lg bg-[#E3F3EA] text-[#2D8A56]">${icon(ic, 'w-4 h-4')}</div></div>
      <div class="text-xl md:text-2xl font-black text-[#133924] ${mono ? 'font-mono' : ''}">${value}</div>
      <p class="text-[11px] text-slate-400 mt-1">${sub}</p></div>`;
}

function hotPosts() {
    const score = p => p.likes * 2 + p.commentCount;
    return [...state.posts].sort((a, b) => score(b) - score(a) || new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 3);
}

views.dashboard = {
    render(root) {
        const u = state.user, d = state.dashboard, w = d.widget;
        const today = todaySchedules();
        const myPlaces = state.places.filter(p => p.universityCode === u.university);
        const nearby = myPlaces.slice(0, 3);
        const hot = hotPosts();

        root.innerHTML = `
        <div class="space-y-6 pb-20 md:pb-8">
          <div class="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1B5836] via-[#227044] to-[#2D8A56] text-white p-6 md:p-8 shadow-sm">
            <div class="relative z-10 max-w-2xl">
              <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-xs font-semibold backdrop-blur-xs text-[#E3F3EA] mb-3">${icon('sparkles', 'w-3.5 h-3.5')}Bách Khoa Toàn Thư Sinh Viên Đà Nẵng</div>
              <h1 class="text-2xl md:text-3xl font-extrabold tracking-tight">Chào mừng ${esc(u.name)} đến với DNSE</h1>
              <p class="mt-2 text-sm md:text-base text-emerald-100/90 leading-relaxed">Cổng thông tin hỗ trợ sinh viên <span class="font-bold underline decoration-emerald-300 underline-offset-2">${esc(u.university)}</span> tra cứu địa điểm ăn uống - học tập gần trường, theo dõi thời khóa biểu thông minh và nhận cố vấn chuyên ngành.</p>
              <div class="mt-5 flex flex-wrap items-center gap-3">
                <button data-action="tab" data-tab="map" class="flex items-center gap-2 px-4 py-2.5 bg-white text-[#133924] rounded-xl text-xs md:text-sm font-bold shadow-sm hover:bg-emerald-50 transition-all cursor-pointer">${icon('map-pin', 'w-4 h-4 text-[#2D8A56]')}Khám phá Campus Map</button>
                <button data-action="tab" data-tab="advisor" class="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-xs md:text-sm font-semibold backdrop-blur-xs transition-all cursor-pointer">${icon('sparkles', 'w-4 h-4')}Tư vấn dụng cụ & AI</button>
              </div>
            </div>
            <div class="absolute -right-10 -bottom-10 w-64 h-64 rounded-full bg-white/5 pointer-events-none"></div>
          </div>

          <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            ${metric('Học Kỳ', 'calendar', 'Kỳ I (2026-27)', 'Đại học Đà Nẵng', false)}
            ${metric('Tiết Học Hôm Nay', 'clock', `${today.filter(s => !s.completed).length} Ca`, `${today.length} môn trong thời khóa biểu`)}
            ${metric('Tiện Ích Quanh Trường', 'map-pin', `${myPlaces.length} Địa Điểm`, 'Quán ăn, cafe & photocopy')}
            ${metric('Thảo Luận Sinh Viên', 'message-square', `${state.posts.length}${state.posts.length >= 100 ? '+' : ''} Chủ Đề`, 'Hỏi đáp & Trao đổi tài liệu')}
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="lg:col-span-2 space-y-6 min-w-0">
              ${progressWidget()}
              ${gpaWidget()}

              <div class="p-5 bg-white border border-[#E2ECE5] rounded-2xl shadow-2xs">
                <div class="flex items-center justify-between mb-4 gap-2">
                  <div><h3 class="text-base font-bold text-[#133924] flex items-center gap-2">${icon('map-pin', 'w-4 h-4 text-[#2D8A56]')}Campus Navigator - Tiện Ích Gần ${esc(u.university)}</h3>
                  <p class="text-xs text-slate-500 mt-0.5">Các quán ăn, cafe học bài và tiệm in ấn được sinh viên đánh giá cao nhất</p></div>
                  <button data-action="tab" data-tab="map" class="text-xs font-semibold text-[#2D8A56] hover:text-[#1B5836] flex items-center gap-1 cursor-pointer shrink-0">Xem tất cả ${icon('arrow-right', 'w-3.5 h-3.5')}</button>
                </div>
                ${nearby.length ? `<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">${nearby.map(p => `
                  <div data-action="tab" data-tab="map" class="p-3.5 rounded-xl border border-[#E2ECE5] hover:border-[#C7E6D4] bg-[#F8FAF9] hover:bg-[#F2F9F5] transition-all cursor-pointer group">
                    <div class="flex items-start justify-between"><span class="text-[11px] font-semibold text-[#1B5836] bg-[#E3F3EA] px-2 py-0.5 rounded-md uppercase">${CAT_LABEL[p.category] || 'Cửa hàng'}</span><span class="text-xs font-bold text-amber-600">${ratingText(p.rating)}</span></div>
                    <h4 class="font-bold text-sm text-slate-800 mt-2 group-hover:text-[#2D8A56] transition-colors line-clamp-1">${esc(p.name)}</h4>
                    <p class="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">${esc(p.aiNote || p.address || '')}</p>
                    <div class="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500"><span class="font-medium text-slate-700">${p.distance ? `Cách ${esc(p.distance)}` : 'Gần trường'}</span><span class="text-[#2D8A56] group-hover:underline">Chi tiết ↗</span></div>
                  </div>`).join('')}</div>` : '<p class="text-xs text-slate-500 py-4 text-center">Chưa có địa điểm nào quanh trường. Hãy vào Bản đồ để đóng góp!</p>'}
              </div>

              <div class="p-6 rounded-2xl bg-gradient-to-br from-[#F2F9F5] to-[#E3F3EA] border border-[#C7E6D4]">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0"><span class="text-[11px] font-bold text-[#1B5836] uppercase tracking-wider">📂 Tài Liệu Nổi Bật Dành Riêng Cho Ngành ${esc(u.major)}</span>
                  <h3 class="text-lg font-bold text-[#133924] mt-1">${esc((w && w.docTitle) || 'Sổ Tay Sinh Viên & Ngân Hàng Đề Thi')}</h3>
                  <p class="text-xs md:text-sm text-slate-600 mt-1 max-w-xl leading-relaxed">${esc((w && w.docDesc) || 'Bộ sưu tập slide bài giảng, đề thi qua các năm và tài liệu mẫu tổng hợp từ sinh viên đạt điểm A+.')}</p></div>
                  <div class="hidden sm:block p-3 rounded-2xl bg-white text-[#2D8A56] shadow-sm">${icon('book-open', 'w-6 h-6')}</div>
                </div>
                <div class="mt-4 flex items-center gap-3 flex-wrap">
                  <button data-action="advisor-docs" class="flex items-center gap-2 px-4 py-2 bg-[#2D8A56] hover:bg-[#227044] text-white rounded-xl text-xs font-bold shadow-2xs transition-all cursor-pointer">${icon('download', 'w-3.5 h-3.5')}Truy cập Thư Viện Tài Liệu</button>
                  <button data-action="open-profile" class="text-xs font-semibold text-slate-600 hover:text-slate-900 underline underline-offset-2 cursor-pointer">Đổi ngành khác</button>
                </div>
              </div>

              <div class="p-5 bg-white border border-[#E2ECE5] rounded-2xl shadow-2xs">
                <div class="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                  <h3 class="text-base font-bold text-[#133924] flex items-center gap-2">${icon('message-square', 'w-4 h-4 text-[#2D8A56]')}Thảo Luận Hot Trong Giới Sinh Viên</h3>
                  <button data-action="tab" data-tab="forum" class="text-xs font-semibold text-[#2D8A56] hover:text-[#1B5836] flex items-center gap-1 cursor-pointer">Vào Diễn Đàn ${icon('chevron-right', 'w-3.5 h-3.5')}</button>
                </div>
                ${hot.length ? `<div class="divide-y divide-slate-100">${hot.map(p => `
                  <div data-action="tab" data-tab="forum" class="py-3 hover:bg-[#F8FAF9] px-2 rounded-xl transition-colors cursor-pointer">
                    <div class="flex items-center gap-2 text-xs text-slate-500 mb-1 flex-wrap"><span class="font-semibold text-slate-800">${esc(p.author)}</span><span>·</span><span>${esc(p.university)}</span><span>·</span><span>${timeAgo(p.createdAt)}</span></div>
                    <h4 class="text-sm font-semibold text-slate-800 line-clamp-2">${esc(p.content)}</h4>
                    <div class="mt-2 flex items-center gap-3 text-xs text-slate-500"><span class="flex items-center gap-1 text-emerald-700 font-medium">♥ ${p.likes} Yêu thích</span><span>💬 ${p.commentCount} Bình luận</span><span class="text-[11px] text-slate-400"># ${esc(p.category)}</span></div>
                  </div>`).join('')}</div>` : '<p class="text-xs text-slate-500 py-4 text-center">Chưa có bài viết nào. Hãy vào Diễn đàn để mở chủ đề đầu tiên!</p>'}
              </div>
            </div>

            <div class="space-y-6 min-w-0">
              ${pomodoroWidget()}

              <div id="today-panel" class="p-5 bg-white border border-[#E2ECE5] rounded-2xl shadow-2xs">${todayPanel()}</div>

              <div class="p-5 bg-white border border-[#E2ECE5] rounded-2xl shadow-2xs">
                <h3 class="text-base font-bold text-[#133924] flex items-center gap-2 mb-3">${icon('calendar', 'w-4 h-4 text-[#2D8A56]')}Sự Kiện Nổi Bật Sắp Tới</h3>
                ${d.events.length ? `<div class="space-y-3">${d.events.slice(0, 4).map(ev => `
                  <div class="p-3 rounded-xl border border-slate-100 bg-[#F8FAF9]">
                    <div class="flex items-center justify-between text-[11px] text-slate-500 mb-1"><span class="font-bold text-[#1B5836] bg-[#E3F3EA] px-2 py-0.5 rounded">${esc(ev.typeName)}</span><span class="font-mono text-slate-500">${esc(ev.day)}/${esc(String(ev.month).replace(/\D/g, ''))}</span></div>
                    <h4 class="text-xs md:text-sm font-bold text-slate-800 mt-1">${esc(ev.title)}</h4>
                    <p class="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">${esc(ev.desc)}</p>
                    <div class="mt-2 text-[10px] text-slate-400 flex items-center gap-1">${icon('map-pin', 'w-3 h-3 text-slate-400')}${esc(ev.location)}</div>
                  </div>`).join('')}</div>` : '<p class="text-xs text-slate-500 py-2">Chưa có sự kiện sắp tới.</p>'}
              </div>

              <div class="p-5 bg-white border border-[#E2ECE5] rounded-2xl shadow-2xs">
                <h3 class="text-base font-bold text-[#133924] flex items-center gap-2 mb-3">${icon('bell', 'w-4 h-4 text-[#2D8A56]')}Tin Đào Tạo & Học Bổng</h3>
                ${d.news.length ? `<div class="divide-y divide-slate-100">${d.news.map(n => `
                  <div class="py-2.5"><span class="text-[10px] font-bold text-[#2D8A56] uppercase tracking-wider">${esc(n.category)}</span>
                  <p data-action="open-notif" class="text-xs font-semibold text-slate-800 hover:text-[#1B5836] transition-colors mt-0.5 cursor-pointer">${esc(n.title)}</p>
                  <span class="text-[10px] text-slate-400 mt-1 block">${timeAgo(n.createdAt)}</span></div>`).join('')}</div>` : '<p class="text-xs text-slate-500 py-2">Chưa có tin mới.</p>'}
              </div>
            </div>
          </div>
        </div>`;
    }
};
