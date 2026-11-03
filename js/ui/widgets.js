import { state, actions, inputs, esc, icon, toast, addScheduleItem, occurrences, renderCurrent } from './core.js';
import { DAY_LABEL, todayNumber, toMinutes, pad } from './time.js';
import { barChart, lineChart, radarChart, gaugeChart } from './charts.js';

// =====================================================================
// 1. Tiến độ học tập (số liệu thật từ Schedules + ScheduleDone)
// =====================================================================
let chartType = 'bar';
actions['chart-type'] = (el) => { chartType = el.dataset.type; renderCurrent(); };

export function progressWidget() {
    const u = state.user;
    const days = [1, 2, 3, 4, 5, 6, 7].map(d => {
        const occ = occurrences(d);
        return { label: d === 7 ? 'CN' : `Thứ ${d + 1}`, planned: occ.length, done: occ.filter(o => o.completed).length, hours: occ.filter(o => o.completed).reduce((h, o) => h + (toMinutes(o.endTime) - toMinutes(o.startTime)) / 60, 0) };
    });
    const planned = days.reduce((a, d) => a + d.planned, 0);
    const done = days.reduce((a, d) => a + d.done, 0);
    const hours = days.reduce((a, d) => a + d.hours, 0);
    const rate = Math.round((done / (planned || 1)) * 100);
    const left = occurrences(todayNumber()).filter(o => !o.completed).length;

    const weeks = (state.stats || []).map((w, i, arr) => {
        const d = new Date(w.weekStart + 'T00:00:00');
        return { label: i === arr.length - 1 ? 'Tuần này' : `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`, planned: w.planned, done: w.done, rate: Math.min(100, Math.round((w.done / (w.planned || 1)) * 100)) };
    });

    const seg = (id, label, ic) => `<button data-action="chart-type" data-type="${id}" class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${chartType === id ? 'bg-white text-[#133924] shadow-xs' : 'text-slate-600 hover:text-slate-900'}">${icon(ic, 'w-3.5 h-3.5 text-[#2D8A56]')}<span>${label}</span></button>`;
    const kpi = (ic, label, val, cls = 'text-[#133924]') => `<div class="p-3 bg-[#F8FAF9] border border-[#E2ECE5] rounded-xl flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-[#E3F3EA] text-[#2D8A56] flex items-center justify-center shrink-0">${icon(ic, 'w-4 h-4')}</div>
        <div><div class="text-[11px] text-slate-400 font-medium">${label}</div><div class="text-sm sm:text-base font-bold font-mono ${cls}">${val}</div></div></div>`;

    return `
    <div class="p-5 md:p-6 bg-white border border-[#E2ECE5] rounded-2xl shadow-2xs">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-100">
        <div>
          <div class="flex items-center gap-2 flex-wrap">
            <h3 class="text-base font-bold text-[#133924] flex items-center gap-2">${icon('trending-up', 'w-4 h-4 text-[#2D8A56]')}Tiến Độ Học Tập & Hoàn Thành Thời Khóa Biểu</h3>
            <span class="text-[10px] font-bold text-[#1B5836] bg-[#E3F3EA] px-2 py-0.5 rounded-md uppercase">Kỳ I 2026-27</span>
          </div>
          <p class="text-xs text-slate-500 mt-0.5">Theo dõi tỷ lệ hoàn thành ca học và số giờ tham gia của ${esc(u.name)}</p>
        </div>
        <div class="flex items-center gap-1 p-1 bg-[#F0F6F2] rounded-xl self-start sm:self-auto">
          ${seg('bar', 'Theo Thứ Trong Tuần', 'chart-column')}${seg('line', 'Xu Hướng Các Tuần', 'chart-line')}
        </div>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4 mb-5">
        ${kpi('circle-check', 'Hoàn thành tuần', `${done}/${planned} Ca (${rate}%)`)}
        ${kpi('clock', 'Thời lượng đã học', `${hours.toFixed(1).replace(/\.0$/, '')} Giờ / Tuần`)}
        ${kpi('award', 'Còn lại hôm nay', `${left} Ca`, 'text-[#1B5836]')}
      </div>
      <div class="w-full h-64 sm:h-72">${chartType === 'bar' ? barChart(days, { height: 280 }) : lineChart(weeks.length ? weeks : [{ label: 'Tuần này', planned, done, rate }], { height: 280 })}</div>
      <div class="mt-3 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-500 gap-1.5">
        <span class="flex items-center gap-1.5 text-[#133924]"><span class="w-2 h-2 rounded-full bg-[#2D8A56]"></span>Dữ liệu đồng bộ trực tiếp từ bảng Schedules và ScheduleDone trong SQL Server</span>
        <span class="text-[11px] text-slate-400">Cập nhật lúc ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    </div>`;
}

// =====================================================================
// 2. Dự báo GPA (bảng điểm do sinh viên tự nhập, lưu trong trình duyệt)
// =====================================================================
const LETTERS = { A: 4.0, 'B+': 3.5, B: 3.0, 'C+': 2.5, C: 2.0, 'D+': 1.5, D: 1.0, F: 0 };
const LETTER_LABEL = { A: 'A (4.0 - Xuất sắc)', 'B+': 'B+ (3.5 - Giỏi)', B: 'B (3.0 - Khá)', 'C+': 'C+ (2.5 - TB Khá)', C: 'C (2.0 - Trung bình)', 'D+': 'D+ (1.5 - TB Yếu)', D: 'D (1.0 - Đạt)', F: 'F (0.0 - Trượt)' };
const letterFor = s => (s >= 3.7 ? 'A' : s >= 3.3 ? 'B+' : s >= 2.8 ? 'B' : s >= 2.3 ? 'C+' : s >= 1.8 ? 'C' : s >= 1.3 ? 'D+' : s >= 0.8 ? 'D' : 'F');
const GOOD = 3.2;   // ngưỡng loại Giỏi, dùng làm đường tham chiếu trên radar

let gpaTab = 'overview', effort = 1.0, subjects = null, gpaNotice = '';
const gpaKey = () => `dnse_gpa_${state.user.id}`;

function defaultSubjects() {
    const names = [...new Set(state.week.map(s => s.subject))].map(n => (n.includes('(') ? n.split('(')[0].trim() : n));
    const list = names.slice(0, 6);
    while (list.length < 5) list.push(`Môn học ${list.length + 1}`);
    return list.map((name, i) => ({ id: `s${i}`, name: name.slice(0, 40), credits: 3, score: 3.5, letter: 'B+' }));
}
function loadSubjects() {
    if (subjects) return subjects;
    try { const s = JSON.parse(localStorage.getItem(gpaKey())); if (Array.isArray(s) && s.length >= 3) return (subjects = s); } catch (e) { /* dùng mặc định */ }
    return (subjects = defaultSubjects());
}

export function gpaWidget() {
    const subs = loadSubjects();
    const eff = subs.map(s => ({ name: s.name, score: Math.min(4, +(s.score * effort).toFixed(2)), avg: GOOD }));
    const credits = subs.reduce((a, s) => a + s.credits, 0);
    const gpa = +(subs.reduce((a, s, i) => a + eff[i].score * s.credits, 0) / (credits || 1)).toFixed(2);
    const cls = gpa >= 3.6 ? { l: 'Xuất Sắc', c: 'text-emerald-700 bg-emerald-100/70 border-emerald-300', a: 'Đủ điều kiện nhận Học bổng Khuyến khích Tài năng!' }
        : gpa >= 3.2 ? { l: 'Giỏi', c: 'text-[#1B5836] bg-[#E3F3EA] border-[#C7E6D4]', a: 'Phong độ học tập tốt, tiệm cận ngưỡng học bổng.' }
        : gpa >= 2.5 ? { l: 'Khá', c: 'text-amber-800 bg-amber-100/70 border-amber-300', a: 'Cần nâng thêm các môn 3-4 tín chỉ để đạt loại Giỏi.' }
        : { l: 'Trung Bình', c: 'text-slate-700 bg-slate-100 border-slate-300', a: 'Cần tăng cường tự học Pomodoro để cải thiện điểm số.' };

    const tabBtn = (id, label, ic) => `<button data-action="gpa-tab" data-tab-id="${id}" class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${gpaTab === id ? 'bg-white text-[#133924] shadow-xs' : 'text-slate-600 hover:text-slate-900'}">${icon(ic, 'w-3.5 h-3.5 text-[#2D8A56]')}${label}</button>`;

    const tone = v => (v >= 3.6 ? { bar: 'bg-emerald-600', txt: 'text-emerald-700' } : v >= 3.2 ? { bar: 'bg-[#2D8A56]', txt: 'text-[#1B5836]' } : v >= 2.5 ? { bar: 'bg-amber-500', txt: 'text-amber-700' } : { bar: 'bg-rose-500', txt: 'text-rose-600' });
    const slider = `
      <div>
        <label class="flex items-center justify-between text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1"><span>Nỗ lực học kỳ tới</span><span id="gpa-effort-label" class="font-mono text-[#2D8A56]">${effort >= 1 ? '+' : ''}${Math.round((effort - 1) * 100)}%</span></label>
        <input type="range" min="0.8" max="1.15" step="0.01" value="${effort}" data-input="gpa-effort-live" data-change="gpa-effort" class="w-full accent-[#2D8A56] cursor-pointer">
        <div class="flex justify-between text-[10px] text-slate-400 font-mono"><span>-20%</span><span>0</span><span>+15%</span></div>
      </div>`;

    const overview = `
      <div class="grid grid-cols-1 md:grid-cols-5 gap-5 items-start">
        <div class="md:col-span-2 p-4 rounded-2xl bg-[#F2F9F5] border border-[#C7E6D4] space-y-3">
          <div class="text-[11px] font-bold text-[#1B5836] uppercase tracking-wider text-center">GPA dự báo (thang 4)</div>
          <div class="w-full max-w-[260px] mx-auto">${gaugeChart(gpa)}</div>
          <div class="text-center -mt-1">
            <span class="inline-block px-3 py-1 rounded-lg border text-xs font-bold ${cls.c}">${cls.l}</span>
            <p class="text-[11px] text-slate-600 mt-2 leading-relaxed">${cls.a}</p>
            <p class="text-[11px] text-slate-400 mt-1 font-mono">≈ ${(gpa * 2.5).toFixed(2)} / 10 · ${credits} tín chỉ</p>
          </div>
          ${slider}
        </div>
        <div class="md:col-span-3 space-y-3">
          <div class="flex items-center justify-between text-[11px] text-slate-500"><span class="font-bold uppercase tracking-wider text-slate-600">Điểm từng môn (thang 4)</span>
            <span class="flex items-center gap-1.5"><span class="inline-block w-0.5 h-3 bg-slate-700"></span>Ngưỡng Giỏi ${GOOD}</span></div>
          ${subs.map((s, i) => { const v = eff[i].score, tn = tone(v); return `
          <div>
            <div class="flex items-center justify-between gap-2 text-xs mb-1">
              <span class="font-semibold text-slate-800 truncate">${esc(s.name)} <span class="text-slate-400 font-normal">· ${s.credits} TC</span></span>
              <span class="font-mono font-bold ${tn.txt} shrink-0">${letterFor(v)} · ${v.toFixed(2)}</span>
            </div>
            <div class="relative h-3 rounded-full bg-[#E9F1EC] overflow-hidden"><div class="h-full rounded-full ${tn.bar} transition-all duration-500" style="width:${(v / 4) * 100}%"></div>
              <span class="absolute top-0 bottom-0 w-0.5 bg-slate-700/70" style="left:${(GOOD / 4) * 100}%"></span></div>
          </div>`; }).join('')}
          <div class="flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 text-[10px] text-slate-500">
            <span class="flex items-center gap-1"><i class="w-2.5 h-2.5 rounded-sm bg-emerald-600 inline-block"></i>≥ 3.6 Xuất sắc</span><span class="flex items-center gap-1"><i class="w-2.5 h-2.5 rounded-sm bg-[#2D8A56] inline-block"></i>3.2 - 3.59 Giỏi</span><span class="flex items-center gap-1"><i class="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block"></i>2.5 - 3.19 Khá</span><span class="flex items-center gap-1"><i class="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block"></i>&lt; 2.5</span>
          </div>
        </div>
      </div>
      <p class="mt-4 text-[11px] text-slate-400">Điểm đang là điểm mẫu. Mở tab "Bảng điểm" để nhập điểm thật của từng môn, GPA sẽ tự tính lại.</p>`;

    const radar = subs.length < 4
        ? `<div class="py-10 text-center text-xs text-slate-500">Biểu đồ radar cần từ 4 môn trở lên mới dễ đọc. Hãy thêm môn ở tab "Bảng điểm".</div>`
        : `<div class="grid grid-cols-1 md:grid-cols-5 gap-5 items-center"><div class="md:col-span-3 h-80">${radarChart(eff)}</div>
           <div class="md:col-span-2 space-y-3">${slider}<div class="flex items-center gap-3 text-[11px] text-slate-500"><span class="flex items-center gap-1.5"><span class="w-3 h-0.5 bg-[#2D8A56] inline-block"></span>Điểm của bạn</span><span class="flex items-center gap-1.5"><span class="w-3 border-t border-dashed border-slate-400 inline-block"></span>Ngưỡng Giỏi (${GOOD})</span></div></div></div>`;

    const table = `
      <div class="overflow-x-auto"><table class="w-full text-xs"><thead><tr class="text-left text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-100"><th class="py-2 px-3">Môn học</th><th class="py-2 px-2 text-center">Tín chỉ</th><th class="py-2 px-3 text-center">Điểm chữ</th><th class="py-2 px-3 text-center">Hệ 4</th><th class="py-2 px-2 text-center">Đóng góp</th><th></th></tr></thead>
      <tbody class="divide-y divide-slate-100">${subs.map(s => `<tr class="hover:bg-[#F2F9F5]/40 transition-colors">
        <td class="py-2 px-3"><input type="text" value="${esc(s.name)}" maxlength="40" data-input="gpa-name" data-id="${s.id}" class="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-[#2D8A56] px-1 py-0.5 outline-none font-semibold text-slate-800"></td>
        <td class="py-2 px-2 text-center"><select data-change="gpa-credits" data-id="${s.id}" class="bg-[#F8FAF9] border border-slate-200 rounded px-2 py-1 text-xs font-mono font-bold outline-none cursor-pointer">${[1, 2, 3, 4, 5, 6].map(c => `<option value="${c}" ${c === s.credits ? 'selected' : ''}>${c} TC</option>`).join('')}</select></td>
        <td class="py-2 px-3 text-center"><select data-change="gpa-letter" data-id="${s.id}" class="bg-[#F8FAF9] border border-[#C7E6D4] text-[#1B5836] font-bold rounded-lg px-2.5 py-1 text-xs outline-none cursor-pointer">${Object.keys(LETTERS).map(l => `<option value="${l}" ${l === s.letter ? 'selected' : ''}>${LETTER_LABEL[l]}</option>`).join('')}</select></td>
        <td class="py-2 px-3 text-center"><input type="number" step="0.1" min="0" max="4" value="${s.score}" data-change="gpa-score" data-id="${s.id}" class="w-16 text-center bg-[#F8FAF9] border border-slate-200 rounded px-1.5 py-1 font-mono font-bold text-slate-800 outline-none"></td>
        <td class="py-2 px-2 text-center font-mono font-bold text-[#133924]">+${(s.score * s.credits / (credits || 1)).toFixed(2)}</td>
        <td class="py-2 px-2 text-center"><button data-action="gpa-remove" data-id="${s.id}" class="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer" title="Xóa môn">${icon('trash-2', 'w-3.5 h-3.5')}</button></td></tr>`).join('')}</tbody></table></div>
      <div class="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3">
        <div class="flex items-center gap-2">
          <button data-action="gpa-save" class="flex items-center gap-1.5 px-4 py-2 bg-[#2D8A56] hover:bg-[#227044] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer">${icon('check', 'w-3.5 h-3.5')}Lưu Bảng Điểm</button>
          <button data-action="gpa-add" class="flex items-center gap-1.5 px-3 py-2 bg-[#F2F9F5] border border-[#C7E6D4] text-[#1B5836] text-xs font-semibold rounded-xl hover:bg-[#E3F3EA] cursor-pointer">${icon('plus', 'w-3.5 h-3.5')}Thêm môn</button>
          <button data-action="gpa-reset" class="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100 cursor-pointer" title="Khôi phục mặc định">${icon('rotate-ccw', 'w-3.5 h-3.5')}</button>
          ${gpaNotice ? `<span class="text-xs text-emerald-700 font-semibold">✓ ${gpaNotice}</span>` : ''}
        </div>
        <span class="text-xs font-mono text-slate-500">${credits} tín chỉ · GPA <b class="text-[#133924]">${gpa.toFixed(2)}</b></span>
      </div>`;

    return `
    <div class="p-5 md:p-6 bg-white border border-[#E2ECE5] rounded-2xl shadow-2xs">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-100">
        <div>
          <h3 class="text-base font-bold text-[#133924] flex items-center gap-2">${icon('award', 'w-4 h-4 text-[#2D8A56]')}Dự Báo GPA & Radar Năng Lực Môn Học</h3>
          <p class="text-xs text-slate-500 mt-0.5">Nhập điểm từng môn để xem GPA dự báo và học bổng có thể đạt</p>
        </div>
        <div class="flex items-center gap-1 p-1 bg-[#F0F6F2] rounded-xl self-start sm:self-auto">${tabBtn('overview', 'Tổng Quan', 'chart-column')}${tabBtn('radar', 'Radar', 'radar')}${tabBtn('table', 'Bảng Điểm', 'calculator')}</div>
      </div>
      ${gpaTab === 'radar' ? radar : gpaTab === 'table' ? table : overview}
    </div>`;
}

const sub = id => loadSubjects().find(s => s.id === id);
actions['gpa-tab'] = (el) => { gpaTab = el.dataset.tabId; renderCurrent(); };
inputs['gpa-effort-live'] = (el) => { const v = Math.round((parseFloat(el.value) - 1) * 100); const l = document.getElementById('gpa-effort-label'); if (l) l.textContent = `${v >= 0 ? '+' : ''}${v}%`; };
inputs['gpa-effort'] = (el) => { effort = parseFloat(el.value); renderCurrent(); };
inputs['gpa-name'] = (el) => { const s = sub(el.dataset.id); if (s) s.name = el.value; };
inputs['gpa-credits'] = (el) => { const s = sub(el.dataset.id); if (s) { s.credits = +el.value; renderCurrent(); } };
inputs['gpa-letter'] = (el) => { const s = sub(el.dataset.id); if (s) { s.letter = el.value; s.score = LETTERS[el.value]; renderCurrent(); } };
inputs['gpa-score'] = (el) => { const s = sub(el.dataset.id); if (s) { s.score = Math.max(0, Math.min(4, +(parseFloat(el.value) || 0).toFixed(2))); s.letter = letterFor(s.score); renderCurrent(); } };
actions['gpa-add'] = () => { const n = loadSubjects().length + 1; subjects.push({ id: `c${Date.now()}`, name: `Môn tự chọn ${n}`, credits: 3, score: 3.5, letter: 'B+' }); renderCurrent(); };
actions['gpa-remove'] = (el) => { if (loadSubjects().length <= 3) { toast('Biểu đồ radar cần tối thiểu 3 môn học.', 'error'); return; } subjects = subjects.filter(s => s.id !== el.dataset.id); renderCurrent(); };
actions['gpa-save'] = () => { try { localStorage.setItem(gpaKey(), JSON.stringify(loadSubjects())); gpaNotice = 'Đã lưu bảng điểm'; } catch (e) { toast('Không lưu được bảng điểm', 'error'); } renderCurrent(); setTimeout(() => { gpaNotice = ''; renderCurrent(); }, 2200); };
actions['gpa-reset'] = () => { subjects = defaultSubjects(); localStorage.removeItem(gpaKey()); gpaNotice = 'Đã khôi phục danh sách mặc định'; renderCurrent(); setTimeout(() => { gpaNotice = ''; renderCurrent(); }, 2200); };

// =====================================================================
// 3. Pomodoro (tự ghi nhận ca học vào Lịch học thật trong SQL Server)
// =====================================================================
const MODES = {
    pomodoro25: { label: '25m Tập trung', minutes: 25, brk: false },
    pomodoro50: { label: '50m Chuyên sâu', minutes: 50, brk: false },
    shortBreak: { label: '5m Nghỉ ngắn', minutes: 5, brk: true },
    longBreak: { label: '15m Nghỉ dài', minutes: 15, brk: true }
};
const P = { mode: 'pomodoro25', left: 25 * 60, running: false, subject: '', autoLog: true, last: null, timer: null };
const statKey = () => `dnse_pomodoro_${state.user.id}`;
function pStats() {
    try { const s = JSON.parse(localStorage.getItem(statKey())); if (s && s.date === new Date().toDateString()) return s; } catch (e) { /* mới */ }
    return { date: new Date().toDateString(), sessions: 0, minutes: 0 };
}
const fmt = () => `${pad(Math.floor(P.left / 60))}:${pad(P.left % 60)}`;
const pct = () => Math.round(((MODES[P.mode].minutes * 60 - P.left) / (MODES[P.mode].minutes * 60)) * 100);

function updateDisplay() {
    const t = document.getElementById('pomo-time'), b = document.getElementById('pomo-bar'), p = document.getElementById('pomo-pct');
    if (t) t.textContent = fmt();
    if (b) b.style.width = pct() + '%';
    if (p) p.textContent = `Tiến độ: ${pct()}%`;
}

function chime() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)(), o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine'; o.frequency.setValueAtTime(587.33, ctx.currentTime); o.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3);
        g.gain.setValueAtTime(0.15, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
        o.connect(g); g.connect(ctx.destination); o.start(); o.stop(ctx.currentTime + 0.8);
    } catch (e) { /* trình duyệt chặn âm thanh */ }
}

async function logSession(minutes) {
    const now = new Date(), start = new Date(now.getTime() - minutes * 60000);
    const hhmm = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    if (hhmm(start) >= hhmm(now)) start.setTime(now.getTime() - 60000);   // phiên vắt qua nửa đêm
    const task = P.subject.trim() || `Tự học ${state.user.major || 'chuyên ngành'}`;
    try {
        await addScheduleItem({ subject: `🎯 [Pomodoro] ${task}`.slice(0, 150), room: `Thư viện ${state.user.university} / Góc tự học`.slice(0, 30), building: 'Phiên Tập Trung', dayOfWeek: todayNumber(), startTime: hhmm(start), endTime: hhmm(now) }, { markDone: true });
        P.last = { task, minutes, time: `${hhmm(start)} - ${hhmm(now)}` };
    } catch (err) { toast(err.message, 'error'); }
}

function addStats(minutes) {
    const s = pStats(); s.sessions += 1; s.minutes += minutes;
    try { localStorage.setItem(statKey(), JSON.stringify(s)); } catch (e) { /* bỏ qua */ }
}

async function complete() {
    clearInterval(P.timer); P.running = false; chime();
    const cfg = MODES[P.mode];
    if (!cfg.brk) { addStats(cfg.minutes); if (P.autoLog) await logSession(cfg.minutes); }
    P.mode = cfg.brk ? 'pomodoro25' : 'shortBreak'; P.left = MODES[P.mode].minutes * 60;
    renderCurrent();
}

function tick() { P.left -= 1; if (P.left <= 0) { P.left = 0; updateDisplay(); complete(); } else updateDisplay(); }

actions['pomo-mode'] = (el) => { clearInterval(P.timer); P.running = false; P.mode = el.dataset.mode; P.left = MODES[P.mode].minutes * 60; renderCurrent(); };
actions['pomo-toggle'] = () => { P.running = !P.running; clearInterval(P.timer); if (P.running) P.timer = setInterval(tick, 1000); renderCurrent(); };
actions['pomo-reset'] = () => { clearInterval(P.timer); P.running = false; P.left = MODES[P.mode].minutes * 60; renderCurrent(); };
actions['pomo-save'] = async () => {
    const total = MODES[P.mode].minutes * 60;
    const minutes = Math.max(Math.round((total - P.left) / 60), 5);
    clearInterval(P.timer); P.running = false;
    await logSession(minutes); addStats(minutes);
    P.left = total; chime(); renderCurrent();
};
actions['pomo-pick'] = (el) => { P.subject = el.dataset.subject; renderCurrent(); };
inputs['pomo-subject'] = (el) => { P.subject = el.value; };
inputs['pomo-auto'] = (el) => { P.autoLog = el.checked; };

export function pomodoroWidget() {
    const u = state.user, cfg = MODES[P.mode], st = pStats(), total = cfg.minutes * 60;
    if (!P.subject) { const a = state.week.find(s => !s.subject.startsWith('🎯')); if (a) P.subject = a.subject; }
    const sugg = [...new Set(state.week.map(s => s.subject))].slice(0, 4);
    return `
    <div class="p-5 bg-white border border-[#E2ECE5] rounded-2xl shadow-2xs">
      <div class="flex items-center justify-between mb-4 pb-2 border-b border-slate-100 gap-2">
        <div class="flex items-center gap-2 min-w-0">
          <div class="w-8 h-8 rounded-xl bg-[#E3F3EA] text-[#2D8A56] flex items-center justify-center shrink-0">${icon('clock', 'w-4 h-4')}</div>
          <div class="min-w-0"><h3 class="text-base font-bold text-[#133924] flex items-center gap-1.5 flex-wrap">Pomodoro Focus Timer<span class="text-[10px] font-bold text-[#1B5836] bg-[#E3F3EA] px-1.5 py-0.5 rounded">Tự động đồng bộ</span></h3>
          <p class="text-[11px] text-slate-500">Tập trung học và tự ghi ca học vào Thời khóa biểu</p></div>
        </div>
        <div class="flex items-center gap-1.5 px-2.5 py-1 bg-[#F2F9F5] rounded-xl border border-[#C7E6D4] text-xs font-bold text-[#1B5836] shrink-0">${icon('flame', 'w-3.5 h-3.5 text-amber-500')}<span>${st.sessions} phiên (${st.minutes}p)</span></div>
      </div>
      <div class="grid grid-cols-4 gap-1 p-1 bg-[#F0F6F2] rounded-xl mb-4 text-xs font-semibold">
        ${Object.entries(MODES).map(([k, c]) => `<button data-action="pomo-mode" data-mode="${k}" class="py-1.5 px-1 rounded-lg text-center transition-all cursor-pointer truncate ${P.mode === k ? 'bg-white text-[#133924] shadow-xs font-bold' : 'text-slate-600 hover:text-slate-900'}">${c.label}</button>`).join('')}
      </div>
      <div class="mb-4">
        <label class="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">Nội dung / Môn học đang tập trung:</label>
        <input type="text" value="${esc(P.subject)}" maxlength="100" data-input="pomo-subject" placeholder="VD: Ôn tập ${esc(u.major || 'môn chuyên ngành')}..." class="w-full px-3 py-2 text-xs bg-[#F8FAF9] border border-[#E2ECE5] focus:border-[#2D8A56] focus:bg-white rounded-xl outline-none font-medium text-slate-800 transition-all">
        ${sugg.length ? `<div class="mt-1.5 flex flex-wrap items-center gap-1.5"><span class="text-[10px] text-slate-400">Gợi ý từ lịch:</span>${sugg.map(s => `<button type="button" data-action="pomo-pick" data-subject="${esc(s)}" title="${esc(s)}" class="text-[10px] px-2 py-0.5 rounded-md border transition-colors cursor-pointer truncate max-w-[140px] ${P.subject === s ? 'bg-[#E3F3EA] text-[#133924] border-[#2D8A56] font-semibold' : 'bg-white border-slate-200 text-slate-600 hover:bg-[#F2F9F5]'}">${esc(s)}</button>`).join('')}</div>` : ''}
      </div>
      <div class="relative p-6 rounded-2xl bg-gradient-to-br from-[#F8FAF9] via-[#F2F9F5] to-[#E3F3EA] border border-[#C7E6D4] text-center overflow-hidden mb-4">
        <div class="text-[11px] font-bold uppercase tracking-wider text-[#1B5836] mb-1 truncate">${cfg.brk ? '☕ Thời gian thư giãn' : `🎯 Đang rèn luyện: ${esc(P.subject || 'Tự học')}`}</div>
        <div id="pomo-time" class="text-4xl md:text-5xl font-black font-mono tracking-tight text-[#133924] my-2 select-none">${fmt()}</div>
        <div class="w-full bg-slate-200/80 rounded-full h-2 mt-3 overflow-hidden"><div id="pomo-bar" class="bg-[#2D8A56] h-full rounded-full transition-all duration-1000 ease-linear" style="width:${pct()}%"></div></div>
        <div class="flex items-center justify-between text-[10px] text-slate-500 mt-1 font-mono"><span id="pomo-pct">Tiến độ: ${pct()}%</span><span>${cfg.minutes} phút</span></div>
      </div>
      <div class="flex items-center justify-center gap-2.5">
        <button data-action="pomo-toggle" class="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs md:text-sm font-bold shadow-2xs transition-all cursor-pointer text-white ${P.running ? 'bg-amber-600 hover:bg-amber-700' : 'bg-[#2D8A56] hover:bg-[#227044]'}">${P.running ? `${icon('pause', 'w-4 h-4')}<span>Tạm Dừng</span>` : `${icon('play', 'w-4 h-4')}<span>${P.left < total ? 'Tiếp Tục' : 'Bắt Đầu Tập Trung'}</span>`}</button>
        <button data-action="pomo-reset" class="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer" title="Đặt lại thời gian">${icon('rotate-ccw', 'w-4 h-4')}</button>
        ${cfg.brk ? '' : `<button data-action="pomo-save" ${P.left === total ? 'disabled' : ''} class="px-3 py-2.5 rounded-xl border border-[#C7E6D4] bg-[#F2F9F5] text-[#1B5836] hover:bg-[#E3F3EA] text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer" title="Ghi nhận ngay số phút đã học vào thời khóa biểu">Lưu ca học</button>`}
      </div>
      <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
        <label class="flex items-center gap-2 text-slate-600 cursor-pointer select-none"><input type="checkbox" ${P.autoLog ? 'checked' : ''} data-change="pomo-auto" class="w-3.5 h-3.5 accent-[#2D8A56] rounded"><span class="text-[11px]">Tự động ghi nhận ca học vào Thời khóa biểu</span></label>
        <button data-action="tab" data-tab="schedule" class="text-[11px] font-semibold text-[#2D8A56] hover:underline flex items-center gap-0.5 cursor-pointer">Xem lịch ${icon('arrow-right', 'w-3 h-3')}</button>
      </div>
      ${P.last ? `<div class="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start gap-2 dnse-slide">${icon('circle-check', 'w-4 h-4 text-emerald-600 shrink-0 mt-0.5')}<div><span class="font-bold">Đã ghi nhận vào Lịch học:</span><div class="text-[11px] text-emerald-800">${esc(P.last.task)} (${P.last.minutes} phút · ${P.last.time})</div></div></div>` : ''}
    </div>`;
}
