import { getSmartToolsAdvice } from './api.js';
import { escapeHtml as esc, enc } from './api-client.js';

const TAG_CLASS = { ESSENTIAL: 'tag-essential', RECOMMENDED: 'tag-recommended', OPTIONAL: 'tag-optional' };
const TYPE_LABEL = { hardware: 'Phần cứng', software: 'Phần mềm / App', accessory: 'Phụ kiện' };

export async function initToolsView(userProfile) {
    const toolsContainer = document.getElementById('tools-list-container');
    const adviceContainer = document.getElementById('ai-advice-content');
    const docsContainer = document.getElementById('docs-list-container');
    const refreshBtn = document.getElementById('btn-refresh-advice');

    if (!toolsContainer || !adviceContainer || !docsContainer) return;

    const loadToolsData = async (refresh = false) => {
        toolsContainer.innerHTML = '<div style="text-align:center; padding: 40px; color: #666;">⏳ Đang phân tích ngành học...</div>';
        adviceContainer.innerHTML = 'AI đang suy nghĩ lời khuyên tốt nhất cho bạn...';
        docsContainer.innerHTML = '';

        if (refreshBtn) refreshBtn.disabled = true;

        const data = await getSmartToolsAdvice(userProfile, refresh);

        if (data) {
            renderToolsList(data.essential_tools, toolsContainer);
            renderAIAdvice(data.advice_sections, adviceContainer, userProfile, data.source);
            renderDocsList(data.study_links, docsContainer);
        } else {
            toolsContainer.innerHTML = '<div style="color: red;">🚨 Không thể tải dữ liệu dụng cụ lúc này.</div>';
            adviceContainer.innerHTML = 'Không kết nối được máy chủ, vui lòng thử lại sau nhé!';
        }

        if (refreshBtn) refreshBtn.disabled = false;
    };

    await loadToolsData();

    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => loadToolsData(true));
    }
}

function renderToolsList(toolsArray, container) {
    if (!toolsArray || toolsArray.length === 0) return;

    container.innerHTML = toolsArray.map(tool => {
        const tag = String(tool.tag || 'OPTIONAL').toUpperCase();
        const meta = [TYPE_LABEL[tool.type], tool.approxPrice].filter(Boolean).map(esc).join(' · ');
        const searchUrl = `https://www.google.com/search?q=${enc(tool.item + ' mua ở Đà Nẵng')}`;
        return `
            <div class="tool-item">
                <div class="tool-item-header">
                    <div class="tool-title">
                        <span class="check-icon">◎</span>
                        ${esc(tool.item)}
                    </div>
                    <span class="tool-tag ${TAG_CLASS[tag] || 'tag-optional'}">${esc(tag)}</span>
                </div>
                <div class="tool-desc">${esc(tool.reason)}</div>
                ${meta ? `<div class="tool-meta">${meta}</div>` : ''}
                <a class="tool-buy-link" href="${searchUrl}" target="_blank" rel="noopener noreferrer">Mua ở đâu? ></a>
            </div>
        `;
    }).join('');
}

function renderAIAdvice(adviceSections, container, userProfile, source) {
    if (!adviceSections) return;

    const rawText = typeof adviceSections === 'string' ? adviceSections : adviceSections.join('\n\n');

    // Escape trước, rồi mới đổi markdown đơn giản sang HTML
    const formattedHTML = esc(rawText)
        .replace(/### (.*)/g, '<h3>$1</h3>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\n\* (.*)/g, '<br>• $1')
        .replace(/\n/g, '<br>');

    const greeting = `<p>Chào bạn, một <strong>${esc(userProfile.university)}-er</strong> đầy bản lĩnh! Với tư cách là trợ lý ảo từ <strong>DNSE</strong>, mình rất hào hứng được đồng hành cùng bạn trên con đường chinh phục chuyên ngành <strong>${esc(userProfile.major)}</strong>.</p><br>`;
    const note = source === 'local'
        ? '<div class="ai-source-note">Đang hiển thị bộ gợi ý có sẵn vì AI chưa sẵn sàng. Bấm "Làm mới lời khuyên" để thử lại.</div>'
        : '';

    container.innerHTML = greeting + formattedHTML + note;
}

function renderDocsList(linksArray, container) {
    // Chỉ cho phép link http/https
    const safe = (linksArray || []).filter(l => l && /^https?:\/\//i.test(l.url));
    if (safe.length === 0) {
        container.innerHTML = '<div style="color:#666; font-size:13px;">Chưa có tài liệu tham khảo nào được đóng góp.</div>';
        return;
    }

    container.innerHTML = safe.map(link => `
        <a href="${esc(link.url)}" target="_blank" rel="noopener noreferrer" class="doc-link-item">
            ${esc(link.label)}
            <span class="ext-icon">↗</span>
        </a>
    `).join('');
}
