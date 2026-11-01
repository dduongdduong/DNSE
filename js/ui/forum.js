import { state, views, actions, inputs, esc, enc, api, icon, toast, openModal, closeModal, renderView } from './core.js';
import { timeAgo } from './time.js';

const CATS = ['Tất cả', 'Học tập', 'Việc làm', 'Confession', 'Mua bán đồ cũ', 'Đời sống', 'Hỏi đáp', 'Khảo sát', 'Đồ thất lạc', 'Sự kiện', 'Review giảng viên'];
const F = { cat: 'Tất cả', q: '', openComments: null, commentText: '', commentAnon: false, newAnon: false };
const norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase();

export async function loadPosts() {
    try { state.posts = await api.get(`/posts?userId=${enc(state.user.id)}`); }
    catch (err) { toast(err.message, 'error'); }
    state.ready.posts = true;
}

function visible() {
    const q = norm(F.q.trim());
    return state.posts.filter(p => (F.cat === 'Tất cả' || p.category === F.cat) &&
        (!q || norm([p.content, p.author, p.tags.join(' ')].join(' ')).includes(q)));
}

function commentsHtml(p) {
    const list = state.comments[p.id];
    return `
    <div class="mt-4 pt-4 border-t border-slate-100 space-y-3">
      ${!list ? '<p class="text-xs text-slate-400">Đang tải bình luận...</p>' : list.length ? `<div class="space-y-2.5">${list.map(c => `
        <div class="p-3 bg-[#F8FAF9] rounded-xl text-xs"><div class="flex items-center justify-between mb-1"><span class="font-bold text-slate-800">${esc(c.author)}</span>
          <span class="flex items-center gap-2"><span class="text-[10px] text-slate-400">${timeAgo(c.createdAt)}</span>${c.isMine ? `<button data-action="forum-del-comment" data-id="${c.id}" data-post="${p.id}" class="text-slate-300 hover:text-rose-600 cursor-pointer" title="Xóa bình luận">${icon('trash-2', 'w-3 h-3')}</button>` : ''}</span></div>
          <p class="text-slate-700 leading-relaxed whitespace-pre-line">${esc(c.content)}</p></div>`).join('')}</div>`
        : '<p class="text-xs text-slate-400 italic">Chưa có bình luận nào. Hãy là người đầu tiên!</p>'}
      <div class="pt-2 flex flex-col sm:flex-row gap-2">
        <input id="cm-input" type="text" maxlength="2000" value="${esc(F.commentText)}" data-input="forum-comment" data-enter="forum-send" data-post="${p.id}" placeholder="Bình luận với tư cách ${F.commentAnon ? 'Ẩn danh' : esc(state.user.name)}..." class="flex-1 px-3 py-2 bg-[#F8FAF9] border border-[#E2ECE5] focus:border-[#2D8A56] rounded-xl text-xs outline-none">
        <div class="flex items-center gap-1.5 self-end sm:self-auto">
          <button type="button" data-action="forum-anon" class="px-2.5 py-2 text-[11px] font-semibold rounded-xl border transition-colors cursor-pointer ${F.commentAnon ? 'bg-slate-200 border-slate-300 text-slate-800' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}" title="Bật/Tắt chế độ ẩn danh">${F.commentAnon ? 'Ẩn danh: Bật' : 'Ẩn danh: Tắt'}</button>
          <button data-action="forum-send" data-post="${p.id}" class="px-3.5 py-2 bg-[#2D8A56] hover:bg-[#227044] text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer">${icon('send', 'w-3.5 h-3.5')}Gửi</button>
        </div>
      </div>
    </div>`;
}

function feed() {
    const list = visible();
    if (!state.ready.posts) return '<div class="p-8 text-center text-xs text-slate-400">Đang tải bài viết...</div>';
    if (!list.length) return `<div class="p-8 text-center bg-white rounded-2xl border border-[#E2ECE5]">${icon('message-square', 'w-8 h-8 text-slate-300 mx-auto mb-2')}<p class="text-sm font-semibold text-slate-700">${F.q ? 'Không tìm thấy bài viết phù hợp' : 'Chưa có bài viết nào trong danh mục này'}</p><p class="text-xs text-slate-400 mt-1">Hãy là người đầu tiên chia sẻ bài viết mới nhé!</p></div>`;
    return list.map(p => `
    <article class="p-5 bg-white border border-[#E2ECE5] rounded-2xl shadow-2xs hover:border-[#C7E6D4] transition-all">
      <div class="flex items-start justify-between gap-2">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${p.isAnonymous ? 'bg-slate-100 text-slate-500' : 'bg-[#E3F3EA] text-[#2D8A56]'}">${p.isAnonymous ? '?' : esc(p.author.charAt(0).toUpperCase())}</div>
          <div class="min-w-0"><div class="flex items-center gap-2 flex-wrap"><span class="font-bold text-sm text-slate-800">${esc(p.author)}</span>
            ${p.isAnonymous ? '<span class="text-[10px] text-slate-400 font-medium">(Ẩn danh)</span>' : '<span class="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">Verified</span>'}</div>
            <div class="flex items-center gap-2 text-xs text-slate-400 mt-0.5 flex-wrap"><span>${esc(p.university)}</span><span>·</span><span>${timeAgo(p.createdAt)}</span></div></div>
        </div>
        <span class="text-xs font-semibold text-[#1B5836] bg-[#F2F9F5] px-2.5 py-1 rounded-lg shrink-0">${esc(p.category)}</span>
      </div>
      <p class="mt-3.5 text-sm md:text-base text-slate-800 leading-relaxed whitespace-pre-line break-words">${esc(p.content)}</p>
      ${p.tags.length ? `<div class="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">${p.tags.map(t => `<span class="hover:text-[#2D8A56] cursor-pointer transition-colors font-medium">#${esc(t)}</span>`).join('')}</div>` : ''}
      <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <button data-action="forum-like" data-id="${p.id}" class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${p.likedByMe ? 'bg-rose-50 text-rose-600' : 'text-slate-600 hover:bg-slate-50'}">${icon('heart', `w-4 h-4 transition-transform ${p.likedByMe ? 'fill-rose-500 text-rose-500 scale-110' : ''}`)}<span>${p.likes}</span></button>
          <button data-action="forum-comments" data-id="${p.id}" class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer">${icon('message-circle', 'w-4 h-4 text-slate-400')}<span>${p.commentCount} bình luận</span></button>
        </div>
        <span class="flex items-center gap-1">
          ${p.isMine ? `<button data-action="forum-delete" data-id="${p.id}" class="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer" title="Xóa bài viết">${icon('trash-2', 'w-4 h-4')}</button>` : ''}
          <button data-action="forum-share" data-id="${p.id}" class="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer" title="Chia sẻ">${icon('share-2', 'w-4 h-4')}</button></span>
      </div>
      ${F.openComments === p.id ? commentsHtml(p) : ''}
    </article>`).join('');
}

function catBar() {
    return CATS.map(c => `<button data-action="forum-cat" data-cat="${esc(c)}" class="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${F.cat === c ? 'bg-[#E3F3EA] text-[#133924]' : 'text-slate-600 hover:text-slate-900 hover:bg-[#F8FAF9]'}">${esc(c)}</button>`).join('');
}

views.forum = {
    onEnter() { loadPosts().then(() => renderView('forum')); },
    render(root) {
        root.innerHTML = `
        <div class="space-y-6 pb-20 md:pb-8">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div><h2 class="text-xl md:text-2xl font-black text-[#133924] flex items-center gap-2">${icon('message-square', 'w-6 h-6 text-[#2D8A56]')}Diễn Đàn Sinh Viên Đà Nẵng</h2>
            <p class="text-xs md:text-sm text-slate-500 mt-1">Không gian trao đổi học tập, kết nối đồng đội làm đồ án và confession sinh viên</p></div>
            <button data-action="forum-new" class="flex items-center gap-2 px-4 py-2.5 bg-[#2D8A56] hover:bg-[#227044] text-white rounded-xl text-xs md:text-sm font-bold shadow-xs transition-all cursor-pointer self-start sm:self-auto">${icon('plus', 'w-4 h-4')}Đăng Bài Viết Mới</button>
          </div>
          <div class="bg-white p-3 rounded-2xl border border-[#E2ECE5] shadow-2xs space-y-3">
            <div id="forum-cats" class="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">${catBar()}</div>
            <div class="relative">${icon('search', 'w-4 h-4 text-slate-400 absolute left-3 top-2.5')}
              <input type="text" value="${esc(F.q)}" data-input="forum-search" placeholder="Tìm kiếm bài viết theo từ khóa, môn học, giáo trình..." class="w-full pl-9 pr-3.5 py-2 text-xs bg-[#F8FAF9] border border-[#E2ECE5] focus:border-[#2D8A56] focus:bg-white rounded-xl outline-none transition-all"></div>
          </div>
          <div id="forum-feed" class="space-y-4">${feed()}</div>
        </div>`;
    }
};

const refreshFeed = () => { const el = document.getElementById('forum-feed'); if (el) el.innerHTML = feed(); };
const post = id => state.posts.find(p => p.id === Number(id));

actions['forum-cat'] = (el) => { F.cat = el.dataset.cat; document.getElementById('forum-cats').innerHTML = catBar(); refreshFeed(); };
inputs['forum-search'] = (el) => { F.q = el.value; refreshFeed(); };
inputs['forum-comment'] = (el) => { F.commentText = el.value; };

actions['forum-like'] = async (el) => {
    const p = post(el.dataset.id); if (!p) return;
    p.likedByMe = !p.likedByMe; p.likes += p.likedByMe ? 1 : -1; refreshFeed();
    try { const r = await api.post(`/posts/${p.id}/like`, { userId: state.user.id }); p.likes = r.likes; p.likedByMe = r.liked; refreshFeed(); }
    catch (err) { p.likedByMe = !p.likedByMe; p.likes += p.likedByMe ? 1 : -1; refreshFeed(); toast(err.message, 'error'); }
};

actions['forum-comments'] = async (el) => {
    const id = Number(el.dataset.id);
    if (F.openComments === id) { F.openComments = null; refreshFeed(); return; }
    F.openComments = id; F.commentText = ''; refreshFeed();
    try { state.comments[id] = await api.get(`/posts/${id}/comments?userId=${enc(state.user.id)}`); refreshFeed(); }
    catch (err) { toast(err.message, 'error'); }
};

actions['forum-anon'] = () => { F.commentAnon = !F.commentAnon; refreshFeed(); document.getElementById('cm-input')?.focus(); };

actions['forum-send'] = async (el) => {
    const id = Number(el.dataset.post || F.openComments);
    const text = F.commentText.trim(); if (!text) return;
    try {
        const c = await api.post(`/posts/${id}/comments`, { userId: state.user.id, content: text, isAnonymous: F.commentAnon });
        (state.comments[id] = state.comments[id] || []).push(c);
        const p = post(id); if (p) p.commentCount += 1;
        F.commentText = ''; refreshFeed(); document.getElementById('cm-input')?.focus();
    } catch (err) { toast(err.message, 'error'); }
};

actions['forum-del-comment'] = async (el) => {
    if (!confirm('Xóa bình luận này?')) return;
    const pid = Number(el.dataset.post);
    try { await api.del(`/comments/${el.dataset.id}?userId=${enc(state.user.id)}`); state.comments[pid] = state.comments[pid].filter(c => c.id !== Number(el.dataset.id)); const p = post(pid); if (p) p.commentCount -= 1; refreshFeed(); }
    catch (err) { toast(err.message, 'error'); }
};

actions['forum-delete'] = async (el) => {
    if (!confirm('Xóa bài viết này?')) return;
    try { await api.del(`/posts/${el.dataset.id}?userId=${enc(state.user.id)}`); state.posts = state.posts.filter(p => p.id !== Number(el.dataset.id)); refreshFeed(); toast('Đã xóa bài viết'); }
    catch (err) { toast(err.message, 'error'); }
};

actions['forum-share'] = async (el) => {
    const p = post(el.dataset.id); if (!p) return;
    if (navigator.share) { try { await navigator.share({ title: 'DNSE Forum', text: p.content, url: location.href }); } catch (e) { /* người dùng hủy */ } }
    else { try { await navigator.clipboard.writeText(p.content); toast('Đã sao chép nội dung bài viết!'); } catch (e) { toast('Không sao chép được', 'error'); } }
};

actions['forum-new'] = () => {
    F.newAnon = false;
    openModal(`
    <div class="flex items-center justify-between pb-3 border-b border-[#E2ECE5]"><h3 class="font-bold text-base text-[#133924]">Đăng Bài Viết Lên Diễn Đàn</h3>
      <button data-action="close-modal" class="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer" aria-label="Đóng">${icon('x', 'w-5 h-5')}</button></div>
    <div class="mt-4 space-y-4">
      <div><label class="block text-xs font-semibold text-slate-700 mb-1">Chủ Đề & Danh Mục</label>
        <select id="fp-cat" class="w-full px-3 py-2 bg-[#F8FAF9] border border-[#E2ECE5] rounded-xl text-xs outline-none">
          <option value="Học tập">Học tập & Giáo trình</option><option value="Việc làm">Việc làm & Tuyển dụng đồ án</option><option value="Confession">Confession & Tâm sự</option><option value="Mua bán đồ cũ">Mua bán & Pass đồ cũ</option><option value="Đời sống">Đời sống & Trọ sinh viên</option><option value="Hỏi đáp">Hỏi đáp</option><option value="Khảo sát">Khảo sát</option><option value="Đồ thất lạc">Tìm đồ thất lạc</option><option value="Sự kiện">Sự kiện & Câu lạc bộ</option><option value="Review giảng viên">Review giảng viên</option></select></div>
      <div><label class="block text-xs font-semibold text-slate-700 mb-1">Nội Dung Bài Viết</label>
        <textarea id="fp-content" rows="4" maxlength="4000" placeholder="Chia sẻ câu hỏi, kinh nghiệm, thông tin tìm bạn cùng nhóm..." class="w-full px-3 py-2.5 bg-[#F8FAF9] border border-[#E2ECE5] focus:border-[#2D8A56] rounded-xl text-xs md:text-sm outline-none resize-none leading-relaxed"></textarea></div>
      <div><label class="block text-xs font-semibold text-slate-700 mb-1">Thẻ Hashtag (Ngăn cách bởi dấu phẩy)</label>
        <input id="fp-tags" type="text" placeholder="VD: CNTT, GIẢI TÍCH, ${esc(state.user.university)}" class="w-full px-3 py-2 bg-[#F8FAF9] border border-[#E2ECE5] rounded-xl text-xs outline-none"></div>
      <div class="p-3 bg-[#F8FAF9] border border-slate-200 rounded-xl flex items-center justify-between">
        <div><div class="text-xs font-bold text-slate-800">Chế độ đăng ẩn danh</div><div class="text-[11px] text-slate-400">Ẩn họ tên thật của bạn trên bài viết</div></div>
        <button id="fp-anon" type="button" data-action="forum-toggle-anon" class="w-11 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer bg-slate-300" aria-pressed="false"><div class="bg-white w-4 h-4 rounded-full shadow-md transform transition-transform translate-x-0"></div></button></div>
      <div class="pt-2 flex justify-end gap-2">
        <button data-action="close-modal" class="px-4 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 rounded-xl cursor-pointer">Hủy</button>
        <button data-action="forum-publish" class="px-5 py-2 bg-[#2D8A56] hover:bg-[#227044] text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer">Đăng Bài Ngay</button></div>
    </div>`, { size: 'max-w-lg' });
};

actions['forum-toggle-anon'] = (el) => {
    F.newAnon = !F.newAnon;
    el.classList.toggle('bg-[#2D8A56]', F.newAnon); el.classList.toggle('bg-slate-300', !F.newAnon);
    el.firstElementChild.classList.toggle('translate-x-5', F.newAnon); el.firstElementChild.classList.toggle('translate-x-0', !F.newAnon);
};

actions['forum-publish'] = async (el) => {
    const content = document.getElementById('fp-content').value.trim();
    if (!content) { toast('Nhập nội dung bài viết nhé.', 'error'); return; }
    const tags = document.getElementById('fp-tags').value.split(',').map(t => t.trim()).filter(Boolean);
    el.disabled = true; el.textContent = 'Đang đăng...';
    try {
        const p = await api.post('/posts', { userId: state.user.id, content, category: document.getElementById('fp-cat').value, isAnonymous: F.newAnon, tags });
        state.posts.unshift(p); closeModal(); F.cat = 'Tất cả'; renderView('forum'); toast('Đã đăng bài lên diễn đàn');
    } catch (err) { toast(err.message, 'error'); el.disabled = false; el.textContent = 'Đăng Bài Ngay'; }
};
