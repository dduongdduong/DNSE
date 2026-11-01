// Gọi Gemini từ phía server: API key nằm trong server/.env, trình duyệt không bao giờ thấy.
// Lỗi mạng / hết quota / thiếu key => tự chuyển sang bộ trả lời có sẵn để giao diện không bị trống.

const DEFAULT_MODEL = 'gemini-2.5-flash';
const TIMEOUT_MS = 20000;

const TAGS = ['ESSENTIAL', 'RECOMMENDED', 'OPTIONAL'];
const TYPES = ['hardware', 'software', 'accessory'];

// ---------------------------------------------------------------- gọi Gemini

async function callGemini({ system, prompt, json = false, maxTokens = 1024, temperature = 0.8 }) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error('Chưa cấu hình GEMINI_API_KEY trong server/.env');

    const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
            signal: ctrl.signal,
            body: JSON.stringify({
                systemInstruction: { parts: [{ text: system }] },
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature,
                    maxOutputTokens: maxTokens,
                    ...(json ? { responseMimeType: 'application/json' } : {})
                }
            })
        });

        const data = await res.json().catch(() => null);
        if (!res.ok) {
            const msg = data && data.error && data.error.message ? data.error.message : res.statusText;
            throw new Error(`Gemini ${res.status}: ${msg} (model: ${model})`);
        }

        const cand = data && data.candidates && data.candidates[0];
        const text = ((cand && cand.content && cand.content.parts) || []).map(p => p.text || '').join('').trim();
        if (!text) {
            const why = (cand && cand.finishReason) || (data && data.promptFeedback && data.promptFeedback.blockReason) || 'không rõ lý do';
            throw new Error(`Gemini không trả nội dung (${why})`);
        }
        return text;
    } finally {
        clearTimeout(timer);
    }
}

// Dữ liệu người dùng đi vào prompt: bỏ xuống dòng, cắt độ dài để không "chèn lệnh" vào system prompt
function clean(value, max = 100) {
    return String(value == null ? '' : value).replace(/[\r\n]+/g, ' ').trim().slice(0, max);
}

// ---------------------------------------------------------------- chat

const UNI_SPOTS = {
    DUT: 'Ngô Văn Sở, Phan Văn Định, Chợ Hòa Khánh',
    DUE: 'Phan Tứ, Châu Thị Vĩnh Tế, Ngũ Hành Sơn',
    VKU: 'khu Làng Đại học, Chợ đêm Làng Đại học Hòa Hải',
    UED: 'Tôn Đức Thắng, Phạm Như Xương, chợ Hòa Khánh',
    UFLS: 'Lương Nhữ Hộc, Lê Đình Lý, khu chợ Nguyễn Tri Phương',
    DDY: 'Khu đô thị Làng Đại học Hòa Quý, Nam Kỳ Khởi Nghĩa'
};

function chatSystem(p) {
    return `
# ROLE:
Bạn là DNSE AI - "Chiến thần" thông thái của Bách Khoa Toàn Thư Sinh Viên Đà Nẵng.
Bạn không phải là bot vô hồn, bạn là một người bạn cùng khóa năng động, hiểu biết và cực kỳ "local".

# CONTEXT:
- User: ${clean(p.name)}
- Trường: ${clean(p.university, 10)}
- Ngành: ${clean(p.major)}
- Địa điểm: Đà Nẵng.

# RULES (BẮT BUỘC):
1. PHONG CÁCH: Ngôn ngữ Gen Z Đà Nẵng năng động. Dùng icon phù hợp nhưng không lạm dụng. Trả lời ngắn gọn, tối đa khoảng 150 từ.
2. ĐỌC KỸ VÀ TRẢ LỜI TRỰC TIẾP vào yêu cầu hiện tại của người dùng. Không đánh trống lảng.
3. TƯ DUY LOCAL: Khi user hỏi về ăn uống/vui chơi/đói bụng, ưu tiên gợi ý quán "ngon - bổ - rẻ" đúng chất sinh viên gần ${clean(p.university, 10)}. Không gợi ý chỗ sang chảnh trừ khi được hỏi. Không bịa số điện thoại hay địa chỉ chi tiết nếu không chắc.
4. KHÔNG CHÀO HỎI THỪA THÃI: Chỉ chào nếu user chào trước.
5. ĐA DẠNG HÓA: Biến hóa câu trả lời theo ngành ${clean(p.major)} để tạo sự gần gũi.
6. Không dùng markdown đậm (**), có thể dùng gạch đầu dòng "-".

# KHU VỰC THAM KHẢO THEO TRƯỜNG:
${Object.entries(UNI_SPOTS).map(([k, v]) => `- ${k}: ${v}.`).join('\n')}
`;
}

function localChatReply(prompt, p) {
    const q = prompt.toLowerCase();
    const name = clean(p.name) || 'bạn';
    const uni = clean(p.university, 10).toUpperCase() || 'trường mình';
    const spot = UNI_SPOTS[uni] || 'khu vực quanh trường';

    if (/(^|[^\p{L}])(ăn|đói|quán|cơm|bún|mì)([^\p{L}]|$)/u.test(q)) {
        return `Mạng mẽo hơi lag tí nhưng cái bụng ${name} không thể đợi! Dân ${uni} thì cứ triển quanh ${spot} là chuẩn bài. Vào mục Bản đồ số để xem quán cụ thể nha 🍜`;
    }
    if (/(cafe|cà phê|học bài|deadline|đồ án)/.test(q)) {
        return `Cần chỗ cày deadline thì ${name} vào Bản đồ số, lọc "Giải trí" hoặc "Học tập" để xem quán có wifi, ổ điện quanh ${uni} nhé. Thư viện trường cũng là lựa chọn yên tĩnh và miễn phí 📚`;
    }
    if (/(tín chỉ|đăng ký|sập web)/.test(q)) {
        return `Mẹo săn tín chỉ: lên sẵn kế hoạch A/B với mã học phần, dùng mạng dây hoặc 4G ổn định, bấm đăng ký một lần rồi đợi hệ thống phản hồi, đừng F5 liên tục kẻo bị khóa phiên 🙏`;
    }
    return `Úi, AI đang "đi tắm biển Mỹ Khê" tí rồi. ${name} thử lại sau ít phút, hoặc xem Bản đồ số và Diễn đàn trong lúc chờ nhé! 🌊`;
}

async function chat(message, profile) {
    try {
        const text = await callGemini({
            system: chatSystem(profile),
            prompt: message,
            maxTokens: 1024,
            temperature: 0.85
        });
        return { reply: text.replace(/\*\*/g, '').trim(), source: 'ai' };
    } catch (err) {
        console.warn('[AI] chat dùng câu trả lời có sẵn:', err.message);
        return { reply: localChatReply(message, profile), source: 'local' };
    }
}

// ---------------------------------------------------------------- dụng cụ học tập

const UNI_CONTEXT = {
    DUT: 'Trường kỹ thuật, công nghệ hàng đầu. Ưu tiên laptop cấu hình mạnh (chip H, card rời) để chạy AutoCAD, SolidWorks, phần mềm lập trình nặng. Cần chuột tốt, sổ tay kỹ thuật.',
    DUE: 'Trường Kinh tế. Ưu tiên kỹ năng thuyết trình, phân tích dữ liệu (Excel, SPSS, PowerBI). Cần laptop mỏng nhẹ, pin trâu để đi học nhóm.',
    VKU: 'Trường Việt - Hàn mạnh về CNTT và Truyền thông. Cần thiết bị học code, thiết kế đồ họa, làm media: laptop RAM lớn, màn hình chuẩn màu, ổ cứng lưu trữ nhiều.',
    UED: 'Trường Sư phạm. Trọng tâm là kỹ năng giảng dạy, soạn giáo án, thuyết trình. Cần thiết bị văn phòng cơ bản, bút chỉ laser, laptop giá hợp lý.',
    UFLS: 'Trường Ngoại ngữ. Trọng tâm là Nghe - Nói - Đọc - Viết. Cần tai nghe tốt để luyện nghe, app từ điển/flashcard, laptop cơ bản là đủ.',
    DDY: 'Trường Y Dược. Khối lượng kiến thức khổng lồ. Cần máy tính bảng để đọc PDF/slide dày, bút cảm ứng, mô hình giải phẫu, áo blouse trắng.'
};

const KITS = {
    it: {
        tools: [
            { item: 'Laptop Core i5 / Ryzen 5, RAM 16GB trở lên', type: 'hardware', tag: 'ESSENTIAL', reason: 'Chạy mượt Docker, VS Code, Android Studio và máy ảo.', approxPrice: '15 - 20 triệu' },
            { item: 'VS Code + GitHub Student Developer Pack', type: 'software', tag: 'ESSENTIAL', reason: 'Bộ công cụ lập trình miễn phí dành cho sinh viên.', approxPrice: 'Miễn phí cho sinh viên' },
            { item: 'Chuột công thái học & bàn phím cơ', type: 'accessory', tag: 'RECOMMENDED', reason: 'Bảo vệ cổ tay khi gõ code nhiều giờ liền.', approxPrice: '400k - 1,2 triệu' },
            { item: 'Ổ cứng SSD gắn ngoài 500GB - 1TB', type: 'hardware', tag: 'RECOMMENDED', reason: 'Sao lưu source code, máy ảo và tài liệu đồ án an toàn.', approxPrice: '1,2 - 1,8 triệu' },
            { item: 'Tai nghe chống ồn over-ear', type: 'accessory', tag: 'OPTIONAL', reason: 'Giữ tập trung khi ngồi thư viện hoặc quán cafe.', approxPrice: '600k - 2 triệu' }
        ],
        studyAdvice: 'Hãy làm các dự án nhỏ trên GitHub ngay từ năm nhất và tham gia các hội nhóm công nghệ ở Đà Nẵng để có portfolio khi xin thực tập.',
        extraLinks: [{ label: 'GitHub Student Developer Pack', url: 'https://education.github.com/pack' }]
    },
    electronics: {
        tools: [
            { item: 'Laptop chip H, card đồ họa rời', type: 'hardware', tag: 'ESSENTIAL', reason: 'Chạy mô phỏng Cadence, Quartus, SolidWorks và MATLAB.', approxPrice: '18 - 25 triệu' },
            { item: 'Kit vi điều khiển (STM32 / Arduino / ESP32)', type: 'hardware', tag: 'ESSENTIAL', reason: 'Thực hành lập trình nhúng và lắp mạch thực tế.', approxPrice: '150k - 450k' },
            { item: 'Đồng hồ vạn năng số', type: 'hardware', tag: 'RECOMMENDED', reason: 'Đo điện áp, dòng điện và kiểm tra linh kiện khi lắp mạch.', approxPrice: '250k - 600k' },
            { item: 'Phần mềm mô phỏng Proteus / Altium Designer', type: 'software', tag: 'ESSENTIAL', reason: 'Vẽ sơ đồ nguyên lý và thiết kế mạch in (PCB).', approxPrice: 'Bản quyền giáo dục của trường' },
            { item: 'Máy tính cầm tay Casio fx-580VN X', type: 'accessory', tag: 'ESSENTIAL', reason: 'Tính ma trận, số phức, phương trình nhanh trong phòng thi.', approxPrice: '650k - 750k' }
        ],
        studyAdvice: 'Vi mạch bán dẫn đang là hướng phát triển lớn của Đà Nẵng: hãy chắc kiến thức điện tử cơ bản và làm quen Verilog/VHDL sớm.'
    },
    engineering: {
        tools: [
            { item: 'Laptop chip H, RAM 16GB, card rời', type: 'hardware', tag: 'ESSENTIAL', reason: 'Chạy AutoCAD, Revit, SketchUp, SolidWorks mà không giật.', approxPrice: '18 - 28 triệu' },
            { item: 'AutoCAD / Revit bản sinh viên', type: 'software', tag: 'ESSENTIAL', reason: 'Phần mềm bắt buộc cho bản vẽ kỹ thuật và mô hình hóa công trình.', approxPrice: 'Miễn phí cho sinh viên (đăng ký Autodesk Education)' },
            { item: 'Bộ dụng cụ vẽ kỹ thuật (thước, compa, bảng vẽ A3)', type: 'accessory', tag: 'RECOMMENDED', reason: 'Dùng cho các môn vẽ kỹ thuật, hình họa năm đầu.', approxPrice: '300k - 800k' },
            { item: 'Chuột có độ chính xác cao', type: 'accessory', tag: 'RECOMMENDED', reason: 'Thao tác dựng hình và chỉnh bản vẽ chính xác hơn touchpad.', approxPrice: '250k - 600k' },
            { item: 'Ổ cứng gắn ngoài 1TB', type: 'hardware', tag: 'OPTIONAL', reason: 'Lưu file đồ án nặng và sao lưu trước ngày nộp.', approxPrice: '1,2 - 1,8 triệu' }
        ],
        studyAdvice: 'Tập thói quen sao lưu file đồ án nhiều nơi và học phím tắt của phần mềm thiết kế sớm để tiết kiệm rất nhiều thời gian.'
    },
    medical: {
        tools: [
            { item: 'Ống nghe y tế hai mặt', type: 'accessory', tag: 'ESSENTIAL', reason: 'Dụng cụ khám lâm sàng dùng suốt các năm đi viện.', approxPrice: '1,2 - 2,5 triệu' },
            { item: 'Áo blouse trắng đúng quy định', type: 'accessory', tag: 'ESSENTIAL', reason: 'Trang phục khi thực hành, vào viện và phòng thí nghiệm.', approxPrice: '180k - 300k' },
            { item: 'Máy tính bảng kèm bút cảm ứng', type: 'hardware', tag: 'RECOMMENDED', reason: 'Đọc atlas giải phẫu, giáo trình PDF dày và ghi chú trực tiếp.', approxPrice: '8 - 14 triệu' },
            { item: 'Ứng dụng Anki (flashcard)', type: 'software', tag: 'ESSENTIAL', reason: 'Học thuộc tên giải phẫu, cơ chế bệnh học theo lặp lại ngắt quãng.', approxPrice: 'Miễn phí (bản Android)' },
            { item: 'Búa phản xạ & đèn soi đồng tử', type: 'accessory', tag: 'RECOMMENDED', reason: 'Thực hành khám tiền lâm sàng.', approxPrice: '200k - 400k' }
        ],
        studyAdvice: 'Nắm chắc giải phẫu và sinh lý ngay từ năm nhất, năm hai - phần nền này quyết định bạn có tự tin khi đi lâm sàng không.'
    },
    economics: {
        tools: [
            { item: 'Laptop mỏng nhẹ, pin trâu', type: 'hardware', tag: 'ESSENTIAL', reason: 'Dễ mang đi học nhóm, quán cafe và thuyết trình cả ngày.', approxPrice: '14 - 22 triệu' },
            { item: 'Microsoft 365 + Power BI / SPSS', type: 'software', tag: 'ESSENTIAL', reason: 'Excel nâng cao và phân tích dữ liệu cho bài tập, nghiên cứu.', approxPrice: 'Thường có tài khoản trường cấp' },
            { item: 'Bút trình chiếu (presenter remote)', type: 'accessory', tag: 'RECOMMENDED', reason: 'Tự tin điều khiển slide khi thuyết trình.', approxPrice: '150k - 300k' },
            { item: 'Chuột không dây yên tĩnh', type: 'accessory', tag: 'RECOMMENDED', reason: 'Không gây tiếng ồn khi làm việc trong thư viện.', approxPrice: '200k - 500k' },
            { item: 'Canva / Notion cho sinh viên', type: 'software', tag: 'OPTIONAL', reason: 'Thiết kế slide, ấn phẩm và quản lý dự án nhóm.', approxPrice: 'Có gói miễn phí' }
        ],
        studyAdvice: 'Luyện Excel nâng cao và kỹ năng thuyết trình từ sớm - hai thứ này được nhà tuyển dụng thực tập để ý nhiều nhất.'
    },
    education: {
        tools: [
            { item: 'Laptop văn phòng mỏng nhẹ', type: 'hardware', tag: 'ESSENTIAL', reason: 'Soạn giáo án điện tử, slide và dạy học trực tuyến.', approxPrice: '11 - 16 triệu' },
            { item: 'Bút chỉ laser kiêm điều khiển slide', type: 'accessory', tag: 'ESSENTIAL', reason: 'Dụng cụ trợ giảng cần cho các buổi kiến tập.', approxPrice: '150k - 250k' },
            { item: 'Bảng vẽ điện tử cỡ nhỏ', type: 'hardware', tag: 'RECOMMENDED', reason: 'Viết công thức, vẽ sơ đồ tư duy khi dạy online.', approxPrice: '700k - 1,5 triệu' },
            { item: 'Micro cài áo không dây', type: 'accessory', tag: 'RECOMMENDED', reason: 'Bảo vệ giọng khi giảng ở phòng lớn.', approxPrice: '300k - 700k' }
        ],
        studyAdvice: 'Tập giảng thử trước gương hoặc quay video bản thân thường xuyên để chuẩn bị cho các đợt kiến tập, thực tập sư phạm.'
    },
    language: {
        tools: [
            { item: 'Tai nghe chống ồn chủ động', type: 'accessory', tag: 'ESSENTIAL', reason: 'Luyện nghe phản xạ cho IELTS, TOPIK, HSK, JLPT.', approxPrice: '600k - 2 triệu' },
            { item: 'Ứng dụng từ điển có phát âm bản ngữ', type: 'software', tag: 'ESSENTIAL', reason: 'Tra từ, ngữ pháp và ví dụ thực tế theo ngôn ngữ bạn học.', approxPrice: 'Miễn phí - có gói trả phí' },
            { item: 'Laptop nhỏ gọn hoặc iPad kèm bàn phím', type: 'hardware', tag: 'ESSENTIAL', reason: 'Gõ văn bản ngoại ngữ, dịch tài liệu và học online.', approxPrice: '10 - 18 triệu' },
            { item: 'Sổ tay từ vựng & bút highlight nhiều màu', type: 'accessory', tag: 'RECOMMENDED', reason: 'Ghi từ mới theo ngữ cảnh để nhớ lâu.', approxPrice: '80k - 150k' }
        ],
        studyAdvice: 'Đặt mục tiêu giao tiếp mỗi tuần: tham gia câu lạc bộ ngoại ngữ hoặc tìm bạn luyện nói để không bị "mất phản xạ".'
    },
    general: {
        tools: [
            { item: 'Laptop đa nhiệm ổn định', type: 'hardware', tag: 'ESSENTIAL', reason: 'Soạn thảo, làm slide và tra cứu tài liệu hằng ngày.', approxPrice: '10 - 15 triệu' },
            { item: 'Tài khoản Cloud (Google Drive / OneDrive)', type: 'software', tag: 'ESSENTIAL', reason: 'Lưu dữ liệu an toàn, không sợ mất file phút 89.', approxPrice: 'Miễn phí' },
            { item: 'Balo chống sốc', type: 'accessory', tag: 'RECOMMENDED', reason: 'Bảo vệ laptop mỗi ngày đến trường.', approxPrice: '300k - 800k' },
            { item: 'Sổ tay & bút highlight', type: 'accessory', tag: 'RECOMMENDED', reason: 'Ghi nhanh trên lớp và đánh dấu các deadline quan trọng.', approxPrice: '50k - 150k' }
        ],
        studyAdvice: 'Tận dụng thư viện và nguồn tài liệu số của trường để xây nền kiến thức vững ngay từ năm đầu.'
    }
};

// Chọn bộ gợi ý: ưu tiên (trường:ngành), rồi mã ngành, rồi trường. Mã ngành như "KT" bị trùng giữa các trường nên cần xét theo trường.
const KIT_BY_UNI_MAJOR = { 'DUT:KT': 'engineering', 'DUT:XD': 'engineering', 'DUT:CNTT': 'it', 'DUT:CDT': 'electronics', 'DUT:DDT': 'electronics' };
const KIT_BY_MAJOR = {
    CNTT: 'it', TTNT: 'it', PTDL: 'it',
    TKVMBD: 'electronics', CDT: 'electronics', DDT: 'electronics',
    Y: 'medical', 'DƯỢC': 'medical', RHM: 'medical',
    KT: 'economics', TCNH: 'economics', MKT: 'economics', QTKD: 'economics', CNTC: 'economics', QTDL: 'economics',
    GD: 'education', SP: 'education', NV: 'education',
    ANH: 'language', PHAP: 'language', TRUNG: 'language', NHAT: 'language', HAN: 'language'
};
const KIT_BY_UNI = { VKU: 'it', DUT: 'engineering', DUE: 'economics', UED: 'education', UFLS: 'language', DDY: 'medical' };

function curatedKit(p) {
    const uni = clean(p.university, 10).toUpperCase();
    const code = clean(p.majorCode, 20).toUpperCase();
    const key = KIT_BY_UNI_MAJOR[`${uni}:${code}`] || KIT_BY_MAJOR[code] || KIT_BY_UNI[uni] || 'general';
    const kit = KITS[key];
    return {
        roadmap_title: `Hành trang cho ngành ${clean(p.major)} - ${uni}`,
        advice_sections: [
            UNI_CONTEXT[uni] || 'Ưu tiên các công cụ học tập phổ thông và tiết kiệm nhất.',
            kit.studyAdvice,
            'Mẹo mua sắm: dạo quanh khu Lê Thanh Nghị hoặc Hàm Nghi (Đà Nẵng) để so giá thiết bị. Mức giá trên chỉ là tham khảo, hãy hỏi thêm anh chị khóa trên và xem chương trình ưu đãi sinh viên trước khi mua.'
        ],
        essential_tools: kit.tools.map(t => ({ ...t })),
        extraLinks: kit.extraLinks || []
    };
}

function stripFences(text) {
    return text.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
}

// Kiểm tra JSON do AI trả về: sai cấu trúc thì ném lỗi để rơi về bộ gợi ý có sẵn
function normalizeTools(raw, p) {
    const toolsIn = Array.isArray(raw && raw.essential_tools) ? raw.essential_tools : [];
    const tools = toolsIn
        .filter(t => t && typeof t.item === 'string' && typeof t.reason === 'string')
        .slice(0, 6)
        .map((t, i) => ({
            item: t.item.trim().slice(0, 120),
            reason: t.reason.trim().slice(0, 300),
            type: TYPES.includes(t.type) ? t.type : 'accessory',
            tag: TAGS.includes(String(t.tag).toUpperCase()) ? String(t.tag).toUpperCase() : TAGS[Math.min(i, 2)],
            approxPrice: typeof t.approxPrice === 'string' && t.approxPrice.trim() ? t.approxPrice.trim().slice(0, 60) : null
        }));
    if (tools.length < 3) throw new Error('AI trả về quá ít dụng cụ');

    let sections = raw.advice_sections;
    if (typeof sections === 'string') sections = [sections];
    sections = (Array.isArray(sections) ? sections : [])
        .filter(s => typeof s === 'string' && s.trim())
        .slice(0, 3)
        .map(s => s.trim().slice(0, 1500));
    if (!sections.length) throw new Error('AI thiếu phần lời khuyên');

    return {
        roadmap_title: typeof raw.roadmap_title === 'string' ? raw.roadmap_title.trim().slice(0, 150) : `Hành trang cho ngành ${clean(p.major)}`,
        advice_sections: sections,
        essential_tools: tools,
        extraLinks: []
    };
}

const toolsCache = new Map();   // key -> { at, ttl, data }
const OK_TTL = 6 * 60 * 60 * 1000;     // kết quả AI giữ 6 giờ
const LOCAL_TTL = 60 * 1000;           // kết quả dự phòng chỉ giữ 1 phút để AI hồi lại là dùng được ngay
const REFRESH_COOLDOWN = 20 * 1000;    // bấm "Làm mới" liên tục thì trả lại kết quả vừa có

async function toolsAdvice(profile, { refresh = false } = {}) {
    const key = `${clean(profile.university, 10)}|${clean(profile.majorCode, 20)}`;
    const cached = toolsCache.get(key);
    const age = cached ? Date.now() - cached.at : Infinity;
    if (cached && !refresh && age < cached.ttl) return cached.data;
    if (cached && refresh && age < REFRESH_COOLDOWN) return cached.data;

    let data;
    try {
        const uni = clean(profile.university, 10);
        const raw = await callGemini({
            system: `
Bạn là chuyên gia tư vấn đồ dùng học tập cho sinh viên Đà Nẵng.
THÔNG TIN: ngành ${clean(profile.major)} tại ${uni}.
ĐẶC THÙ TRƯỜNG: ${UNI_CONTEXT[uni.toUpperCase()] || 'Ưu tiên công cụ phổ thông, tiết kiệm.'}

QUY TẮC:
- Chỉ trả về JSON hợp lệ, không thêm văn bản ngoài JSON.
- "essential_tools": 4 đến 5 món thực tế, gồm cả phần cứng và phần mềm/app. Mỗi món có "item", "type" (hardware | software | accessory), "tag" (ESSENTIAL | RECOMMENDED | OPTIONAL), "reason" (1 câu), "approxPrice" (giá tham khảo bằng VNĐ, hoặc "Miễn phí").
- "advice_sections": đúng 3 đoạn ngắn (định hướng học, mẹo tiết kiệm khi mua sắm tại Đà Nẵng, lưu ý riêng của ngành).
- Không tạo đường link.

CẤU TRÚC:
{"roadmap_title":"...","advice_sections":["...","...","..."],"essential_tools":[{"item":"...","type":"hardware","tag":"ESSENTIAL","reason":"...","approxPrice":"..."}]}`,
            prompt: `Tư vấn dụng cụ học tập cho ngành ${clean(profile.major)} trường ${uni}.`,
            json: true,
            maxTokens: 2500,
            temperature: 0.7
        });
        data = normalizeTools(JSON.parse(stripFences(raw)), profile);
        data.source = 'ai';
        toolsCache.set(key, { at: Date.now(), ttl: OK_TTL, data });
    } catch (err) {
        console.warn('[AI] tools-advice dùng bộ gợi ý có sẵn:', err.message);
        data = curatedKit(profile);
        data.source = 'local';
        toolsCache.set(key, { at: Date.now(), ttl: LOCAL_TTL, data });
    }
    return data;
}

module.exports = { chat, toolsAdvice };
