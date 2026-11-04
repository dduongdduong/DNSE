import { state, views, actions, esc, icon, toast, openModal, closeModal, toggleDone, occurrences, api, enc, addScheduleItem, renderCurrent } from './core.js';
import { DAY_LABEL, todayNumber, toMinutes, formatDuration } from './time.js';

let sel = null;   
const current = () => (sel === null ? (sel = todayNumber()) : sel);

actions['sch-day'] = (el) => { sel = el.dataset.day === 'all' ? 'all' : Number(el.dataset.day); renderCurrent(); };
actions['sch-toggle'] = (el) => toggleDone(Number(el.dataset.id), Number(el.dataset.day));

actions['sch-delete'] = async (el) => {
    if (!confirm('Xóa lịch cá nhân này?')) return;
    try {
        await api.del(`/schedule/${el.dataset.id}?userId=${enc(state.user.id)}`);
        state.week = state.week.filter(i => i.id !== Number(el.dataset.id));
        renderCurrent(); toast('Đã xóa lịch');
    } catch (err) { toast(err.message, 'error'); }
};

function nextUpcoming() {
    const now = new Date(), nowMin = now.getHours() * 60 + now.getMinutes();
    return occurrences(todayNumber()).find(o => !o.completed && toMinutes(o.endTime) > nowMin) || null;
}

function rows() {
    const day = current();
    if (day === 'all') {
        return state.week.map(i => { const d = i.dayOfWeek || todayNumber(); return { ...i, day: d, completed: occurrences(d).find(o => o.id === i.id)?.completed }; });
    }
    return occurrences(day);
}

views.schedule = {
    render(root) {
        const u = state.user, next = nextUpcoming(), day = current(), list = rows();
        const days = [{ id: 'all', label: 'Tất cả' }, ...[1, 2, 3, 4, 5, 6, 7].map(d => ({ id: d, label: DAY_LABEL(d) }))];
        const nowMin = (() => { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); })();
        const status = next ? (nowMin >= toMinutes(next.startTime) ? `Đang diễn ra, còn ${formatDuration(toMinutes(next.endTime) - nowMin)}` : `Bắt đầu sau ${formatDuration(toMinutes(next.startTime) - nowMin)}`) : '';

        root.innerHTML = `
        <div class="space-y-6 pb-20 md:pb-8">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div><h2 class="text-xl md:text-2xl font-black text-[#133924] flex items-center gap-2">${icon('calendar-days', 'w-6 h-6 text-[#2D8A56]')}Lịch Học Thông Minh & Thời Khóa Biểu</h2>
            <p class="text-xs md:text-sm text-slate-500 mt-1">Quản lý ca học, phòng thực hành và đếm ngược tiết học theo chuyên ngành ${esc(u.major)}</p></div>
            <button data-action="sch-add" class="flex items-center gap-2 px-4 py-2.5 bg-[#2D8A56] hover:bg-[#227044] text-white rounded-xl text-xs md:text-sm font-bold shadow-xs transition-all cursor-pointer self-start sm:self-auto">${icon('plus', 'w-4 h-4')}Thêm Môn Học Mới</button>
          </div>

          ${next ? `<div class="p-5 rounded-2xl bg-gradient-to-r from-[#F2F9F5] via-[#E8F5EE] to-[#E3F3EA] border border-[#C7E6D4] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div class="flex items-center gap-3 min-w-0"><div class="w-12 h-12 rounded-2xl bg-white text-[#2D8A56] flex items-center justify-center font-bold shadow-2xs shrink-0">${icon('clock', 'w-6 h-6')}</div>
              <div class="min-w-0"><span class="text-[11px] font-bold text-[#1B5836] uppercase tracking-wider">Ca học kế tiếp sắp diễn ra</span>
              <h3 class="text-base md:text-lg font-bold text-[#133924] mt-0.5">${esc(next.subject)}</h3>
              <div class="flex items-center gap-2 text-xs text-slate-600 mt-1 font-mono flex-wrap"><span class="font-bold text-[#2D8A56]">${esc(next.startTime)} - ${esc(next.endTime)}</span><span>·</span><span>Phòng ${esc(next.room)}</span><span>·</span><span>${esc(next.building)}</span></div>
              <div class="text-[11px] text-[#1B5836] font-semibold mt-1">${status}</div></div></div>
            <button data-action="sch-toggle" data-id="${next.id}" data-day="${next.day}" class="px-4 py-2 bg-[#2D8A56] hover:bg-[#227044] text-white text-xs font-semibold rounded-xl shadow-2xs transition-all cursor-pointer self-start sm:self-auto">Đánh Dấu Hoàn Thành</button></div>` : ''}

          <div class="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            ${days.map(d => `<button data-action="sch-day" data-day="${d.id}" class="px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${day === d.id ? 'bg-[#133924] text-white shadow-2xs' : 'bg-white border border-[#E2ECE5] text-slate-600 hover:bg-[#F2F9F5]'}">${d.label}${d.id === todayNumber() ? ' · Hôm nay' : ''}</button>`).join('')}
          </div>

          <div class="space-y-3">
            ${!state.ready.schedule ? '<div class="p-8 text-center text-xs text-slate-400">Đang tải lịch học...</div>' : list.length === 0 ? `
              <div class="p-8 text-center bg-white rounded-2xl border border-[#E2ECE5]">${icon('calendar', 'w-8 h-8 text-slate-300 mx-auto mb-2')}<p class="text-sm font-semibold text-slate-700">Không có lịch học cho ngày đã chọn</p><p class="text-xs text-slate-400 mt-1">Bạn có thể thêm lịch học cá nhân hoặc lịch học bù!</p></div>` :
              list.map(i => `
              <div class="p-4 md:p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${i.completed ? 'bg-slate-50/80 border-slate-200 opacity-60' : 'bg-white border-[#E2ECE5] hover:border-[#C7E6D4] shadow-2xs'}">
                <div class="flex items-start gap-4 min-w-0">
                  <div class="p-3 bg-[#F2F9F5] border border-[#E2ECE5] rounded-xl text-center shrink-0 min-w-[90px]"><div class="text-sm font-black font-mono text-[#1B5836]">${esc(i.startTime)}</div><div class="text-[10px] text-slate-400 font-mono mt-0.5">đến ${esc(i.endTime)}</div></div>
                  <div class="min-w-0">
                    <div class="flex items-center gap-2 flex-wrap"><span class="text-xs font-bold text-[#1B5836] bg-[#E3F3EA] px-2 py-0.5 rounded">${i.dayOfWeek ? DAY_LABEL(i.dayOfWeek) : 'Mọi ngày'}</span><span class="text-xs font-bold text-slate-700">Phòng ${esc(i.room)}</span></div>
                    <h4 class="text-base font-bold mt-1.5 break-words ${i.completed ? 'line-through text-slate-500' : 'text-slate-900'}">${esc(i.subject)}</h4>
                    <p class="text-xs text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">${icon('building', 'w-3.5 h-3.5 text-slate-400')}<span>${esc(i.building)}</span><span>·</span><span class="text-slate-400">${i.isMine ? 'Lịch cá nhân' : `Chuyên ngành ${esc(u.majorCode)} / môn chung`}</span></p>
                  </div>
                </div>
                <div class="flex items-center gap-2 self-end sm:self-auto shrink-0">
                  ${i.isMine ? `<button data-action="sch-delete" data-id="${i.id}" class="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer" title="Xóa lịch cá nhân">${icon('trash-2', 'w-4 h-4')}</button>` : ''}
                  <button data-action="sch-toggle" data-id="${i.id}" data-day="${i.day}" class="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${i.completed ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 hover:bg-[#E3F3EA] hover:text-[#133924] text-slate-600'}">${icon('circle-check', `w-4 h-4 ${i.completed ? 'text-emerald-600' : 'text-slate-400'}`)}<span>${i.completed ? 'Đã học xong' : 'Chưa hoàn thành'}</span></button>
                </div>
              </div>`).join('')}
          </div>
        </div>`;
    }
};

actions['sch-add'] = () => {
    const t = todayNumber();
    openModal(`
    <div class="flex items-center justify-between pb-3 border-b border-[#E2ECE5]"><h3 class="font-bold text-base text-[#133924]">Thêm Môn Học / Lịch Cá Nhân</h3>
      <button data-action="close-modal" class="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer" aria-label="Đóng">${icon('x', 'w-5 h-5')}</button></div>
    <div class="mt-4 space-y-3.5">
      <div><label class="block text-xs font-semibold text-slate-700 mb-1">Tên Môn Học</label>
        <input id="ns-subject" type="text" maxlength="150" placeholder="VD: Cấu trúc Dữ liệu & Giải thuật" class="w-full px-3 py-2 bg-[#F8FAF9] border border-[#E2ECE5] focus:border-[#2D8A56] rounded-xl text-sm outline-none"></div>
      <div class="grid grid-cols-2 gap-2">
        <div><label class="block text-xs font-semibold text-slate-700 mb-1">Phòng Học</label><input id="ns-room" type="text" maxlength="30" placeholder="VD: A205, Lab C1" class="w-full px-3 py-2 bg-[#F8FAF9] border border-[#E2ECE5] rounded-xl text-xs outline-none"></div>
        <div><label class="block text-xs font-semibold text-slate-700 mb-1">Tòa Nhà / Khu</label><input id="ns-building" type="text" maxlength="50" placeholder="VD: Khu A, Khu F" class="w-full px-3 py-2 bg-[#F8FAF9] border border-[#E2ECE5] rounded-xl text-xs outline-none"></div>
      </div>
      <div class="grid grid-cols-3 gap-2">
        <div><label class="block text-xs font-semibold text-slate-700 mb-1">Thứ Trong Tuần</label>
          <select id="ns-day" class="w-full px-2.5 py-2 bg-[#F8FAF9] border border-[#E2ECE5] rounded-xl text-xs outline-none">${[1, 2, 3, 4, 5, 6, 7].map(d => `<option value="${d}" ${d === t ? 'selected' : ''}>${DAY_LABEL(d)}</option>`).join('')}</select></div>
        <div><label class="block text-xs font-semibold text-slate-700 mb-1">Bắt Đầu</label><input id="ns-start" type="time" value="07:30" class="w-full px-2 py-2 bg-[#F8FAF9] border border-[#E2ECE5] rounded-xl text-xs outline-none font-mono"></div>
        <div><label class="block text-xs font-semibold text-slate-700 mb-1">Kết Thúc</label><input id="ns-end" type="time" value="09:30" class="w-full px-2 py-2 bg-[#F8FAF9] border border-[#E2ECE5] rounded-xl text-xs outline-none font-mono"></div>
      </div>
      <div class="pt-2 flex justify-end gap-2">
        <button data-action="close-modal" class="px-3.5 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-xl cursor-pointer">Hủy</button>
        <button data-action="sch-save" class="px-4 py-2 bg-[#2D8A56] hover:bg-[#227044] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer">Lưu Vào Thời Khóa Biểu</button></div>
    </div>`);
};

actions['sch-save'] = async (el) => {
    const v = id => document.getElementById(id).value.trim();
    const [subject, room, start, end] = [v('ns-subject'), v('ns-room'), v('ns-start'), v('ns-end')];
    if (!subject) return toast('Nhập tên môn học nhé.', 'error');
    if (!room) return toast('Nhập phòng học nhé.', 'error');
    if (!start || !end || toMinutes(end) <= toMinutes(start)) return toast('Giờ kết thúc phải sau giờ bắt đầu.', 'error');
    el.disabled = true; el.textContent = 'Đang lưu...';
    try {
        const created = await addScheduleItem({ subject, room, building: v('ns-building'), dayOfWeek: Number(v('ns-day')), startTime: start, endTime: end });
        sel = created.dayOfWeek; closeModal(); renderCurrent(); toast('Đã lưu vào thời khóa biểu');
    } catch (err) { toast(err.message, 'error'); el.disabled = false; el.textContent = 'Lưu Vào Thời Khóa Biểu'; }
};
