import { state, views, actions, inputs, esc, enc, icon, setTab, renderCurrent, toast } from './core.js';
import { askDNSEAI, getSmartToolsAdvice } from '../modules/api.js';

const A = { tab: 'advisor', input: '', loading: false, tools: null, toolsLoading: false, messages: [] };
const TYPE_LABEL = { hardware: 'Phần cứng', software: 'Phần mềm / App', accessory: 'Phụ kiện' };
const hhmm = () => new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
const plain = s => String(s || '').replace(/\*\*/g, '').replace(/^#+\s*/gm, '').replace(/\n\* /g, '\n• ');

function ensureGreeting() {
    if (A.messages.length) return;
    const u = state.user;
    A.messages.push({ sender: 'ai', text: `Chào ${u.name}! Mình là DNSE AI, cố vấn cho sinh viên ${u.university} - ngành ${u.major}. Bạn muốn hỏi về quán ăn, chỗ học bài, mẹo đăng ký tín chỉ hay chọn dụng cụ học tập?`, time: hhmm() });
}

async function loadTools(refresh = false) {
    A.toolsLoading = true; renderCurrent();
    const data = await getSmartToolsAdvice(state.user, refresh);
    A.toolsLoading = false;
    if (data) A.tools = data; else toast('Không tải được gợi ý dụng cụ, thử lại sau nhé.', 'error');
    renderCurrent();
}

function scrollChat() { const c = document.getElementById('chat-flow'); if (c) c.scrollTop = c.scrollHeight; }

views.advisor = {
    onEnter() { if (A.tab === 'tools' && !A.tools && !A.toolsLoading) loadTools(); },
    render(root) {
        ensureGreeting();
        const u = state.user, tools = A.tools ? A.tools.essential_tools : [];
        const tab = (id, label, ic) => `<button data-action="adv-tab" data-tab-id="${id}" class="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${A.tab === id ? 'bg-[#E3F3EA] text-[#133924] shadow-2xs' : 'text-slate-600 hover:text-slate-900 hover:bg-[#F8FAF9]'}">${icon(ic, 'w-4 h-4 text-[#2D8A56]')}${label}</button>`;
        const quick = [`Quán cơm trưa ngon bổ rẻ gần ${u.university}`, `Bí kíp học tốt ngành ${u.major}`, 'Mẹo đăng ký tín chỉ không bị nghẽn mạng', `Tìm phòng trọ sinh viên gần ${u.university}`];

        let body = '';
        if (A.tab === 'advisor') {
            body = `
            <div class="bg-white border border-[#E2ECE5] rounded-2xl shadow-2xs flex flex-col h-[580px] overflow-hidden">
              <div class="px-5 py-3 border-b border-[#E2ECE5] bg-[#F8FAF9] flex items-center justify-between gap-2">
                <div class="flex items-center gap-2.5"><div class="w-8 h-8 rounded-xl bg-[#2D8A56] text-white flex items-center justify-center">${icon('bot', 'w-4 h-4')}</div>
                  <div><h4 class="text-xs font-bold text-slate-800">DNSE AI Assistant</h4><p class="text-[10px] text-emerald-700 font-medium">Sẵn sàng cố vấn theo ngữ cảnh Đà Nẵng</p></div></div>
                <span class="text-[11px] text-slate-400 font-mono hidden sm:block truncate">Trường: ${esc(u.university)} · ${esc(u.major)}</span>
              </div>
              <div class="px-4 py-2.5 bg-[#F2F9F5] border-b border-[#E2ECE5] flex items-center gap-2 overflow-x-auto no-scrollbar">
                <span class="text-[11px] font-semibold text-[#1B5836] shrink-0 flex items-center gap-1">${icon('lightbulb', 'w-3.5 h-3.5')} Gợi ý hỏi:</span>
                ${quick.map(q => `<button data-action="adv-quick" data-text="${esc(q)}" class="px-2.5 py-1 bg-white border border-[#C7E6D4] hover:bg-[#E3F3EA] text-slate-700 text-[11px] font-medium rounded-lg whitespace-nowrap transition-colors cursor-pointer shrink-0">${esc(q)}</button>`).join('')}
              </div>
              <div id="chat-flow" class="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
                ${A.messages.map(m => `
                <div class="flex items-start gap-3 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}">
                  ${m.sender === 'ai' ? `<div class="w-8 h-8 rounded-xl bg-[#E3F3EA] text-[#2D8A56] flex items-center justify-center shrink-0 mt-0.5">${icon('sparkles', 'w-4 h-4')}</div>` : ''}
                  <div class="max-w-[85%] md:max-w-[75%] rounded-2xl p-4 text-xs md:text-sm leading-relaxed whitespace-pre-line shadow-2xs break-words ${m.sender === 'user' ? 'bg-[#2D8A56] text-white rounded-tr-none' : 'bg-[#F8FAF9] border border-[#E2ECE5] text-slate-800 rounded-tl-none'}">${esc(m.text)}
                    <div class="text-[10px] mt-2 text-right ${m.sender === 'user' ? 'text-emerald-100' : 'text-slate-400'}">${m.time}${m.local ? ' · trả lời có sẵn' : ''}</div></div>
                  ${m.sender === 'user' ? `<div class="w-8 h-8 rounded-xl bg-slate-800 text-white flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">${esc((u.name || 'U').charAt(0).toUpperCase())}</div>` : ''}
                </div>`).join('')}
                ${A.loading ? `<div class="flex items-center gap-3"><div class="w-8 h-8 rounded-xl bg-[#E3F3EA] text-[#2D8A56] flex items-center justify-center animate-pulse">${icon('bot', 'w-4 h-4')}</div>
                  <div class="p-3 bg-[#F8FAF9] border border-[#E2ECE5] rounded-2xl text-xs text-slate-500 flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-[#2D8A56] animate-bounce"></span><span class="w-2 h-2 rounded-full bg-[#2D8A56] animate-bounce [animation-delay:0.2s]"></span><span class="w-2 h-2 rounded-full bg-[#2D8A56] animate-bounce [animation-delay:0.4s]"></span><span>DNSE AI đang soạn câu trả lời tốt nhất...</span></div></div>` : ''}
              </div>
              <div class="p-3 bg-white border-t border-[#E2ECE5] flex items-center gap-2">
                <input id="adv-input" type="text" maxlength="1000" value="${esc(A.input)}" data-input="adv-input" data-enter="adv-send" placeholder="Đặt câu hỏi cho chuyên ngành ${esc(u.major)} hoặc địa điểm Đà Nẵng..." class="flex-1 min-w-0 px-4 py-2.5 bg-[#F8FAF9] border border-[#E2ECE5] focus:border-[#2D8A56] focus:bg-white rounded-xl text-xs md:text-sm outline-none transition-all">
                <button data-action="adv-send" ${A.loading ? 'disabled' : ''} class="px-4 py-2.5 bg-[#2D8A56] hover:bg-[#227044] disabled:opacity-50 text-white rounded-xl text-xs md:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs">${icon('send', 'w-4 h-4')}Gửi</button>
              </div>
            </div>`;
        } else if (A.tab === 'tools') {
            const advice = A.tools ? plain(A.tools.advice_sections.slice(0, 2).join(' ')) : '';
            body = `
            <div class="space-y-4">
              <div class="p-5 rounded-2xl bg-gradient-to-r from-[#F2F9F5] to-[#E3F3EA] border border-[#C7E6D4]">
                <div class="flex items-start justify-between gap-3">
                  <div><span class="text-[11px] font-bold text-[#1B5836] uppercase tracking-wider">Cố Vấn Thiết Bị & Dụng Cụ Ngành ${esc(u.major)}</span>
                  <p class="text-xs md:text-sm text-slate-700 mt-1 max-w-2xl leading-relaxed">${A.toolsLoading ? 'AI đang phân tích ngành học của bạn...' : esc(advice || 'Lựa chọn dụng cụ phù hợp giúp bạn tối ưu chi phí và tăng tốc hiệu quả học tập trong 4 năm đại học.')}</p>
                  ${A.tools && A.tools.source === 'local' ? '<p class="text-[11px] text-slate-400 mt-2">Đang hiển thị bộ gợi ý có sẵn vì AI chưa sẵn sàng. Bấm làm mới để thử lại.</p>' : ''}</div>
                  <button data-action="adv-refresh" class="p-2 rounded-xl bg-white text-[#2D8A56] border border-[#C7E6D4] hover:bg-emerald-50 transition-colors cursor-pointer shrink-0" title="Làm mới phân tích">${icon('refresh-cw', `w-4 h-4 ${A.toolsLoading ? 'animate-spin' : ''}`)}</button>
                </div>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                ${tools.map(t => `
                <div class="p-5 bg-white border border-[#E2ECE5] hover:border-[#C7E6D4] rounded-2xl shadow-2xs transition-all flex flex-col justify-between">
                  <div><div class="flex items-start justify-between gap-2">
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${t.tag === 'ESSENTIAL' ? 'bg-rose-100 text-rose-800' : t.tag === 'RECOMMENDED' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}">${t.tag === 'ESSENTIAL' ? 'BẮT BUỘC CÓ' : t.tag === 'RECOMMENDED' ? 'NÊN CÓ' : 'TÙY CHỌN'}</span>
                    <span class="text-xs font-mono font-bold text-slate-500 text-right">${esc(t.approxPrice || 'Tham khảo')}</span></div>
                  <h4 class="font-bold text-base text-slate-900 mt-3">${esc(t.item)}</h4>
                  <p class="text-xs text-slate-600 mt-1.5 leading-relaxed">${esc(t.reason)}</p></div>
                  <div class="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span class="text-slate-400">Phân loại: ${esc(TYPE_LABEL[t.type] || t.type)}</span>
                    <a href="${t.type === 'software' ? `https://www.google.com/search?q=${enc(t.item)}` : `https://shopee.vn/search?keyword=${enc(t.item)}`}" target="_blank" rel="noopener noreferrer" class="font-semibold text-[#2D8A56] hover:underline flex items-center gap-1">${t.type === 'software' ? 'Tìm hiểu ↗' : 'Xem điểm bán ↗'}</a></div>
                </div>`).join('')}
              </div>
              ${!tools.length && !A.toolsLoading ? '<div class="p-8 text-center text-xs text-slate-400 bg-white rounded-2xl border border-[#E2ECE5]">Chưa có gợi ý dụng cụ. Bấm nút làm mới ở trên.</div>' : ''}
            </div>`;
        } else {
            const w = state.dashboard.widget, links = A.tools ? A.tools.study_links : [];
            body = `
            <div class="space-y-4"><div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="p-5 bg-white border border-[#E2ECE5] rounded-2xl shadow-2xs">
                <div class="w-10 h-10 rounded-xl bg-[#E3F3EA] text-[#2D8A56] flex items-center justify-center mb-3">${icon('file-text', 'w-5 h-5')}</div>
                <h4 class="font-bold text-base text-slate-900">${esc((w && w.docTitle) || 'Sổ Tay Sinh Viên & Ngân Hàng Đề Thi')}</h4>
                <p class="text-xs text-slate-500 mt-1 leading-relaxed">${esc((w && w.docDesc) || 'Tài liệu tổng hợp dành cho sinh viên.')}</p>
                <p class="mt-4 text-[11px] text-slate-400">Tài liệu ngành ${esc(u.major)} · hỏi thêm anh chị khóa trên trong Diễn đàn</p></div>
              ${links.map((l, i) => `
              <div class="p-5 bg-white border border-[#E2ECE5] rounded-2xl shadow-2xs">
                <div class="w-10 h-10 rounded-xl bg-[#E3F3EA] text-[#2D8A56] flex items-center justify-center mb-3">${icon(i === 0 ? 'school' : 'book-open', 'w-5 h-5')}</div>
                <h4 class="font-bold text-base text-slate-900">${esc(l.label)}</h4>
                <p class="text-xs text-slate-500 mt-1 leading-relaxed break-all">${esc(l.url)}</p>
                <div class="mt-4 flex justify-end"><a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer" class="px-3.5 py-1.5 bg-[#2D8A56] hover:bg-[#227044] text-white rounded-lg text-xs font-semibold shadow-2xs">Mở liên kết ↗</a></div></div>`).join('')}
            </div>${!links.length ? '<p class="text-xs text-slate-400">Mở tab "Dụng Cụ Học Tập" một lần để tải danh sách liên kết tham khảo.</p>' : ''}</div>`;
        }

        root.innerHTML = `
        <div class="space-y-6 pb-20 md:pb-8">
          <div><h2 class="text-xl md:text-2xl font-black text-[#133924] flex items-center gap-2">${icon('graduation-cap', 'w-6 h-6 text-[#2D8A56]')}Cố Vấn Học Tập & Bộ Dụng Cụ Sinh Viên</h2>
          <p class="text-xs md:text-sm text-slate-500 mt-1">Trợ lý thông thái đồng hành cùng sinh viên ${esc(u.university)} trong học tập và đời sống</p></div>
          <div class="flex items-center gap-2 border-b border-[#E2ECE5] pb-2 overflow-x-auto no-scrollbar">${tab('advisor', 'Trợ Lý AI DNSE', 'sparkles')}${tab('tools', `Dụng Cụ Học Tập${A.tools ? ` (${tools.length})` : ''}`, 'laptop')}${tab('docs', 'Kho Cẩm Nang & Đề Thi', 'book-open')}</div>
          ${body}
        </div>`;
        if (A.tab === 'advisor') scrollChat();
    }
};

actions['adv-tab'] = (el) => {
    A.tab = el.dataset.tabId; renderCurrent();
    if ((A.tab === 'tools' || A.tab === 'docs') && !A.tools && !A.toolsLoading) loadTools();
};
actions['advisor-docs'] = () => { A.tab = 'docs'; setTab('advisor'); if (!A.tools && !A.toolsLoading) loadTools(); };
actions['adv-refresh'] = () => loadTools(true);
inputs['adv-input'] = (el) => { A.input = el.value; };
actions['adv-quick'] = (el) => send(el.dataset.text);
actions['adv-send'] = () => send(A.input);

async function send(text) {
    text = String(text || '').trim();
    if (!text || A.loading) return;
    A.messages.push({ sender: 'user', text, time: hhmm() });
    A.input = ''; A.loading = true; renderCurrent();
    const { reply, source } = await askDNSEAI(text, state.user);
    A.messages.push({ sender: 'ai', text: reply, time: hhmm(), local: source === 'local' });
    A.loading = false; renderCurrent();
    document.getElementById('adv-input')?.focus();
}
