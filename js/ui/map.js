import { state, views, actions, inputs, esc, enc, api, icon, toast, openModal, closeModal, modalHeader } from './core.js';
import { CAT_LABEL, ratingText } from './dashboard.js';

const CATS = [
    { id: 'all', label: 'Tất cả tiện ích', icon: 'compass' },
    { id: 'coffee', label: 'Cafe học bài', icon: 'coffee' },
    { id: 'food', label: 'Quán ăn sinh viên', icon: 'utensils' },
    { id: 'study', label: 'In ấn & Đồ án', icon: 'book-open' },
    { id: 'store', label: 'Nhà thuốc & Tiện lợi', icon: 'store' },
    { id: 'hostel', label: 'Nhà trọ', icon: 'house' }
];

const M = { uni: null, cat: 'all', q: '', selected: null, loaded: false };

const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase();

export async function loadPlaces() {
    try {
        state.places = await api.get(`/places?university=ALL&userId=${enc(state.user.id)}`);
    } catch (err) {
        toast(err.message, 'error');
    }
    state.ready.places = true;
}

function mapsUrl(p) {
    return `https://www.google.com/maps/search/?api=1&query=${enc(p.isCommunity ? `${p.name}, ${p.address}, Đà Nẵng` : `${p.name} ${p.address || ''} Đà Nẵng`)}`;
}

function filtered() {
    const q = norm(M.q.trim());
    return state.places.filter(p =>
        (M.uni === 'ALL' || p.universityCode === M.uni) &&
        (M.cat === 'all' || p.category === M.cat) &&
        (!q || norm([p.name, p.tags.join(' '), p.aiNote, p.address].join(' ')).includes(q)));
}

function pills() {
    return `
    <div class="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
      <button data-action="map-uni" data-code="ALL" class="px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${M.uni === 'ALL' ? 'bg-[#133924] text-white shadow-2xs' : 'bg-white border border-[#E2ECE5] text-slate-600 hover:bg-[#F2F9F5]'}">Tất cả các trường (Đà Nẵng)</button>
      ${state.universities.map(u => `<button data-action="map-uni" data-code="${esc(u.code)}" class="px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${M.uni === u.code ? 'bg-[#2D8A56] text-white shadow-2xs' : 'bg-white border border-[#E2ECE5] text-slate-600 hover:bg-[#F2F9F5]'}">${esc(u.code)} - ${esc(u.shortName)}</button>`).join('')}
    </div>`;
}

function catBar() {
    return CATS.map(c => {
        const a = M.cat === c.id;
        return `<button data-action="map-cat" data-cat="${c.id}" class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${a ? 'bg-[#E3F3EA] text-[#133924]' : 'text-slate-600 hover:text-slate-900 hover:bg-[#F8FAF9]'}">${icon(c.icon, `w-3.5 h-3.5 ${a ? 'text-[#2D8A56]' : 'text-slate-400'}`)}${c.label}</button>`;
    }).join('');
}

// Google Maps nhúng: mặc định hiện khu vực trường đang chọn, bấm vào địa điểm thì bản đồ dời tới đó
function embedQuery() {
    const sel = state.places.find(p => p.id === M.selected);
    if (sel) {
        return {
            q: sel.isCommunity ? `${sel.name}, ${sel.address}, Đà Nẵng` : `${sel.lat},${sel.lng}`,
            zoom: sel.isCommunity ? 17 : 18
        };
    }
    const uni = state.universities.find(u => u.code === M.uni);
    if (uni && uni.lat != null && uni.lng != null) return { q: `${uni.lat},${uni.lng}`, zoom: 17 };
    return { q: 'Đà Nẵng, Việt Nam', zoom: 12 };
}

function canvas() {
    const sel = state.places.find(p => p.id === M.selected);
    const { q, zoom } = embedQuery();
    const src = `https://maps.google.com/maps?q=${enc(q)}&t=&z=${zoom}&ie=UTF8&iwloc=&output=embed`;
    return `
    <div class="relative h-72 md:h-[420px] w-full rounded-xl border border-[#C7E6D4] overflow-hidden bg-[#E8F3EC]">
      <iframe src="${src}" width="100%" height="100%" style="border:0;" allowfullscreen loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="Bản đồ Google Maps khu vực trường"></iframe>
      ${sel ? `<div class="absolute bottom-4 left-1/2 -translate-x-1/2 max-w-sm w-[calc(100%-2rem)] bg-white/95 backdrop-blur-md p-3 rounded-xl border border-[#2D8A56] shadow-xl z-20 flex items-center justify-between gap-3 dnse-slide">
        <div class="min-w-0"><div class="text-xs font-bold text-slate-900 truncate">${esc(sel.name)}</div><div class="text-[11px] text-slate-500">${sel.distance ? `Cách trường ${esc(sel.distance)} · ` : ''}${ratingText(sel.rating)}</div></div>
        <a href="${mapsUrl(sel)}" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 bg-[#2D8A56] text-white text-xs font-semibold rounded-lg flex items-center gap-1 shadow-2xs shrink-0">Chỉ đường ${icon('external-link', 'w-3 h-3')}</a></div>` : ''}
    </div>`;
}

function results() {
    const list = filtered();
    const grid = list.length === 0
        ? `<div class="p-8 text-center bg-white rounded-2xl border border-[#E2ECE5]">${icon('compass', 'w-8 h-8 text-slate-300 mx-auto mb-2')}<p class="text-sm font-semibold text-slate-700">Không tìm thấy địa điểm phù hợp</p><p class="text-xs text-slate-400 mt-1">Hãy thử đổi trường học hoặc đóng góp quán ăn mới nhé!</p></div>`
        : `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">${list.map(p => `
          <div data-action="map-select" data-id="${esc(p.id)}" class="p-4 bg-white border rounded-2xl transition-all cursor-pointer shadow-2xs hover:shadow-sm flex flex-col justify-between ${M.selected === p.id ? 'border-[#2D8A56] ring-2 ring-[#E3F3EA]' : 'border-[#E2ECE5] hover:border-[#C7E6D4]'}">
            <div>
              <div class="flex items-start justify-between"><span class="text-[11px] font-bold text-[#1B5836] bg-[#E3F3EA] px-2.5 py-0.5 rounded-md uppercase">${CAT_LABEL[p.category] || 'Cửa hàng'}</span>
                <div class="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">${icon('star', 'w-3.5 h-3.5 fill-amber-500 text-amber-500')}${p.rating != null ? Number(p.rating).toFixed(1) : 'Mới'}</div></div>
              <h4 class="font-bold text-base text-slate-800 mt-2.5">${esc(p.name)}</h4>
              <div class="mt-1 flex items-center gap-1.5 text-xs text-slate-500">${icon('map-pin', 'w-3.5 h-3.5 text-slate-400 shrink-0')}<span class="truncate">${esc(p.address || `Gần trường ${p.universityCode}`)}</span></div>
              <div class="mt-1 flex items-center gap-1.5 text-xs text-slate-500">${icon('clock', 'w-3.5 h-3.5 text-slate-400 shrink-0')}<span>${esc(p.time || 'Chưa cập nhật giờ')}</span>${p.distance ? `<span>·</span><span class="font-semibold text-[#2D8A56]">Cách ${esc(p.distance)}</span>` : ''}</div>
              ${p.aiNote ? `<div class="mt-3 p-2.5 rounded-xl bg-[#F2F9F5] border border-[#E2ECE5] text-xs text-slate-600 leading-relaxed"><div class="flex items-center gap-1 text-[11px] font-bold text-[#1B5836] mb-0.5">${icon('sparkles', 'w-3 h-3 text-[#2D8A56]')}Gợi ý sinh viên:</div>${esc(p.aiNote)}</div>` : ''}
            </div>
            <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <span class="text-[11px] text-slate-400">Trường: ${esc(p.universityCode)}${p.isCommunity ? ' · SV đóng góp' : ''}</span>
              <span class="flex items-center gap-1">
                ${p.isMine ? `<button data-action="map-delete" data-id="${esc(p.id)}" class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer" title="Xóa địa điểm của bạn">${icon('trash-2', 'w-3.5 h-3.5')}</button>` : ''}
                <a href="${mapsUrl(p)}" target="_blank" rel="noopener noreferrer" data-stop class="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#1B5836] hover:bg-[#E3F3EA] rounded-lg transition-colors cursor-pointer">Mở Google Maps ${icon('external-link', 'w-3 h-3')}</a></span>
            </div>
          </div>`).join('')}</div>`;
    return `
    <div class="flex items-center justify-between mb-3"><h3 class="text-sm font-bold text-slate-700 uppercase tracking-wider">Kết Quả Tiện Ích (${list.length} địa điểm)</h3>
      <span class="text-xs text-slate-400">${M.uni === 'ALL' ? 'Toàn bộ Đà Nẵng' : `Khu vực trường ${esc(M.uni)}`}</span></div>${grid}`;
}

function refreshParts({ map = false } = {}) {
    const set = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
    set('map-pills', pills()); set('map-cats', catBar()); set('map-results', results());
    if (map) set('map-canvas', canvas());
}

views.map = {
    onEnter() { if (!M.uni) M.uni = state.user.university; },
    render(root) {
        if (!M.uni) M.uni = state.user.university;
        root.innerHTML = `
        <div class="space-y-6 pb-20 md:pb-8">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div><h2 class="text-xl md:text-2xl font-black text-[#133924] flex items-center gap-2">${icon('map-pin', 'w-6 h-6 text-[#2D8A56]')}Bản Đồ Số Campus Navigator</h2>
            <p class="text-xs md:text-sm text-slate-500 mt-1">Khám phá trọn vẹn tiện ích quanh 6 cụm trường đại học thành viên tại Đà Nẵng</p></div>
            <button data-action="map-add" class="flex items-center gap-2 px-4 py-2.5 bg-[#2D8A56] hover:bg-[#227044] text-white rounded-xl text-xs md:text-sm font-bold shadow-xs transition-all cursor-pointer self-start sm:self-auto">${icon('plus', 'w-4 h-4')}Đóng Góp Địa Điểm Mới</button>
          </div>
          <div id="map-pills"></div>
          <div class="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#E2ECE5] shadow-2xs">
            <div id="map-cats" class="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 no-scrollbar"></div>
            <div class="relative min-w-[240px]">${icon('search', 'w-4 h-4 text-slate-400 absolute left-3 top-2.5')}
              <input type="text" value="${esc(M.q)}" data-input="map-search" placeholder="Tìm theo tên quán, món ăn..." class="w-full pl-9 pr-3.5 py-2 text-xs bg-[#F8FAF9] border border-[#E2ECE5] focus:border-[#2D8A56] focus:bg-white rounded-xl outline-none transition-all"></div>
          </div>
          <div class="relative overflow-hidden rounded-2xl border border-[#C7E6D4] bg-[#F2F9F5] p-5 shadow-2xs">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-4">
              <div><h3 class="text-sm font-bold text-[#133924] flex items-center gap-2">${icon('compass', 'w-4 h-4 text-[#2D8A56]')}Bản Đồ Google Maps Khu Vực Campus</h3>
              <p class="text-xs text-slate-500">Chọn trường ở trên hoặc bấm vào một địa điểm để bản đồ di chuyển tới đó</p></div>
              <div class="flex items-center gap-3 text-xs text-slate-600"><span class="flex items-center gap-1.5">Dữ liệu bản đồ: Google Maps</span></div>
            </div>
            <div id="map-canvas"></div>
          </div>
          <div id="map-results"></div>
        </div>`;
        refreshParts({ map: true });
    }
};

actions['map-uni'] = (el) => { M.uni = el.dataset.code; M.selected = null; refreshParts({ map: true }); };
actions['map-cat'] = (el) => { M.cat = el.dataset.cat; refreshParts(); };
actions['map-select'] = (el, e) => { if (e.target.closest('a,button')) return; M.selected = el.dataset.id; refreshParts({ map: true }); };
inputs['map-search'] = (el) => { M.q = el.value; document.getElementById('map-results').innerHTML = results(); };

actions['map-delete'] = async (el) => {
    if (!confirm('Xóa địa điểm này khỏi bản đồ?')) return;
    try { await api.del(`/places/${enc(el.dataset.id)}?userId=${enc(state.user.id)}`); await loadPlaces(); refreshParts(); toast('Đã xóa địa điểm'); }
    catch (err) { toast(err.message, 'error'); }
};

actions['map-add'] = () => {
    const u = state.user;
    openModal(`
    <div class="flex items-center justify-between pb-3 border-b border-[#E2ECE5]"><h3 class="font-bold text-base text-[#133924]">Đóng Góp Địa Điểm Sinh Viên</h3>
      <button data-action="close-modal" class="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer" aria-label="Đóng">${icon('x', 'w-5 h-5')}</button></div>
    <div class="mt-4 space-y-3.5">
      <p class="text-[11px] text-slate-500">Địa điểm sẽ được thêm vào khu vực trường <b>${esc(u.university)}</b> của bạn.</p>
      <div><label class="block text-xs font-semibold text-slate-700 mb-1">Tên Quán / Địa Điểm</label>
        <input id="np-name" type="text" maxlength="150" placeholder="VD: Cơm Tấm Sườn Cọng Cô Ba" class="w-full px-3 py-2 bg-[#F8FAF9] border border-[#E2ECE5] focus:border-[#2D8A56] rounded-xl text-sm outline-none"></div>
      <div class="grid grid-cols-2 gap-2">
        <div><label class="block text-xs font-semibold text-slate-700 mb-1">Loại Tiện Ích</label>
          <select id="np-cat" class="w-full px-3 py-2 bg-[#F8FAF9] border border-[#E2ECE5] rounded-xl text-xs outline-none"><option value="food">Quán ăn sinh viên</option><option value="coffee">Cà phê học bài</option><option value="study">In ấn / Photo / Sách</option><option value="store">Nhà thuốc / Tiện lợi</option><option value="hostel">Nhà trọ</option></select></div>
        <div><label class="block text-xs font-semibold text-slate-700 mb-1">Khoảng Cách Ước Tính</label>
          <input id="np-dist" type="text" maxlength="20" placeholder="VD: 150m, 1.2km" class="w-full px-3 py-2 bg-[#F8FAF9] border border-[#E2ECE5] rounded-xl text-xs outline-none"></div>
      </div>
      <div><label class="block text-xs font-semibold text-slate-700 mb-1">Địa Chỉ / Khu Vực</label>
        <input id="np-addr" type="text" maxlength="300" placeholder="VD: 45 Ngô Văn Sở, Liên Chiểu" class="w-full px-3 py-2 bg-[#F8FAF9] border border-[#E2ECE5] rounded-xl text-sm outline-none"></div>
      <div><label class="block text-xs font-semibold text-slate-700 mb-1">Giờ Mở Cửa</label>
        <input id="np-hours" type="text" maxlength="30" placeholder="VD: 07:00 - 22:00" class="w-full px-3 py-2 bg-[#F8FAF9] border border-[#E2ECE5] rounded-xl text-xs outline-none"></div>
      <div><label class="block text-xs font-semibold text-slate-700 mb-1">Gợi Ý / Review Sinh Viên</label>
        <textarea id="np-note" rows="2" maxlength="300" placeholder="Món nên thử, ổ cắm điện, wifi, giá cả..." class="w-full px-3 py-2 bg-[#F8FAF9] border border-[#E2ECE5] rounded-xl text-xs outline-none resize-none"></textarea></div>
      <div class="pt-2 flex justify-end gap-2">
        <button data-action="close-modal" class="px-3.5 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-xl cursor-pointer">Hủy</button>
        <button data-action="map-save" class="px-4 py-2 bg-[#2D8A56] hover:bg-[#227044] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer">Thêm Địa Điểm</button></div>
    </div>`);
};

actions['map-save'] = async (el) => {
    const v = id => document.getElementById(id).value.trim();
    if (!v('np-name')) { toast('Nhập tên địa điểm nhé.', 'error'); return; }
    if (!v('np-addr')) { toast('Nhập địa chỉ để mọi người tìm được trên bản đồ.', 'error'); return; }
    el.disabled = true; el.textContent = 'Đang lưu...';
    try {
        await api.post('/places', { userId: state.user.id, name: v('np-name'), category: v('np-cat'), address: v('np-addr'), distance: v('np-dist'), openHours: v('np-hours'), note: v('np-note'), tags: `${v('np-cat')},sinh viên` });
        closeModal();
        M.uni = state.user.university; M.cat = 'all'; M.q = '';
        await loadPlaces();
        views.map.render(document.getElementById('view-map'));
        toast('Đã thêm địa điểm, cảm ơn bạn!');
    } catch (err) {
        toast(err.message, 'error'); el.disabled = false; el.textContent = 'Thêm Địa Điểm';
    }
};
