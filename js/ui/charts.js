// Biểu đồ SVG thuần (thay cho Recharts / D3 của bản AI Studio)
import { escapeHtml as esc } from '../modules/api-client.js';

const GREEN = '#2D8A56', LIGHT = '#C7E6D4';

function niceMax(v) { return Math.max(3, Math.ceil(v)); }

// Cột: planned (xanh nhạt) và done (xanh đậm) theo nhóm
export function barChart(rows, { height = 260 } = {}) {
    const W = 560, H = height, L = 30, R = 8, T = 34, B = 28;
    const max = niceMax(Math.max(...rows.map(r => Math.max(r.planned, r.done)), 1));
    const gw = (W - L - R) / rows.length;
    const bw = Math.min(26, gw / 3);
    const y = v => T + (H - T - B) * (1 - v / max);
    let s = `<svg viewBox="0 0 ${W} ${H}" class="w-full h-full" role="img" aria-label="Biểu đồ ca học theo thứ">`;
    for (let i = 0; i <= max; i++) {
        s += `<line x1="${L}" x2="${W - R}" y1="${y(i)}" y2="${y(i)}" stroke="#EDF4F0" stroke-dasharray="3 3"/><text x="${L - 8}" y="${y(i) + 4}" text-anchor="end" font-size="11" fill="#64748B">${i}</text>`;
    }
    rows.forEach((r, i) => {
        const cx = L + gw * i + gw / 2;
        s += `<g class="chart-hit" data-tip="${r.label}|Ca học dự kiến: ${r.planned} ca|Đã hoàn thành: ${r.done} ca">
            <rect x="${cx - gw / 2}" y="${T}" width="${gw}" height="${H - T - B}" fill="transparent"/>
            <rect x="${cx - bw - 2}" y="${y(r.planned)}" width="${bw}" height="${H - B - y(r.planned)}" rx="6" fill="${LIGHT}"/>
            <rect x="${cx + 2}" y="${y(r.done)}" width="${bw}" height="${H - B - y(r.done)}" rx="6" fill="${GREEN}"/></g>
            <text x="${cx}" y="${H - 8}" text-anchor="middle" font-size="12" fill="#64748B">${r.label}</text>`;
    });
    s += `<g font-size="12" fill="#475569"><circle cx="${W - 250}" cy="12" r="5" fill="${LIGHT}"/><text x="${W - 240}" y="16">Ca học dự kiến</text><circle cx="${W - 120}" cy="12" r="5" fill="${GREEN}"/><text x="${W - 110}" y="16">Đã hoàn thành</text></g></svg>`;
    return s;
}

// Đường: tỷ lệ hoàn thành (%) theo tuần
export function lineChart(rows, { height = 260 } = {}) {
    const W = 560, H = height, L = 36, R = 16, T = 34, B = 28;
    const x = i => L + (W - L - R) * (rows.length === 1 ? 0.5 : i / (rows.length - 1));
    const y = v => T + (H - T - B) * (1 - v / 100);
    let s = `<svg viewBox="0 0 ${W} ${H}" class="w-full h-full" role="img" aria-label="Xu hướng hoàn thành theo tuần">`;
    [0, 25, 50, 75, 100].forEach(v => {
        s += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="#EDF4F0" stroke-dasharray="3 3"/><text x="${L - 8}" y="${y(v) + 4}" text-anchor="end" font-size="11" fill="#64748B">${v}%</text>`;
    });
    const pts = rows.map((r, i) => `${x(i)},${y(r.rate)}`).join(' ');
    s += `<polyline points="${pts}" fill="none" stroke="${GREEN}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>`;
    rows.forEach((r, i) => {
        s += `<g class="chart-hit" data-tip="${r.label}|Tỷ lệ hoàn thành: ${r.rate}%|${r.done}/${r.planned} ca">
            <rect x="${x(i) - 28}" y="${T}" width="56" height="${H - T - B}" fill="transparent"/>
            <circle cx="${x(i)}" cy="${y(r.rate)}" r="4.5" fill="${GREEN}" stroke="#fff" stroke-width="2"/></g>
            <text x="${x(i)}" y="${H - 8}" text-anchor="middle" font-size="12" fill="#64748B">${r.label}</text>`;
    });
    s += `<g font-size="12" fill="#475569"><circle cx="${W - 190}" cy="12" r="5" fill="${GREEN}"/><text x="${W - 180}" y="16">Tỷ lệ hoàn thành ca học</text></g></svg>`;
    return s;
}

// Radar: mỗi môn một trục, thang 0 - 4 (điểm sinh viên so với trung bình ngành)
export function radarChart(subjects) {
    const W = 340, H = 310, M = 46, cx = W / 2, cy = H / 2, R = Math.min(W, H) / 2 - M;
    const n = subjects.length, step = (Math.PI * 2) / n;
    const pt = (i, v) => { const a = step * i - Math.PI / 2; return [cx + R * (v / 4) * Math.cos(a), cy + R * (v / 4) * Math.sin(a)]; };
    let s = `<svg viewBox="0 0 ${W} ${H}" class="w-full h-full" role="img" aria-label="Biểu đồ radar năng lực">`;
    [1, 2, 3, 4].forEach(l => {
        s += `<polygon points="${subjects.map((_, i) => pt(i, l).join(',')).join(' ')}" fill="none" stroke="#DCEAE1" stroke-width="1"/>`;
        s += `<text x="${cx + 3}" y="${cy - R * l / 4 + 10}" font-size="9" fill="#94A3B8">${l}.0</text>`;
    });
    subjects.forEach((sub, i) => {
        const [ex, ey] = pt(i, 4), [lx, ly] = pt(i, 4.7);
        s += `<line x1="${cx}" y1="${cy}" x2="${ex}" y2="${ey}" stroke="#DCEAE1"/>`;
        s += `<text x="${lx}" y="${ly}" text-anchor="${lx < cx - 8 ? 'end' : lx > cx + 8 ? 'start' : 'middle'}" font-size="10" fill="#475569" font-weight="600">${esc(sub.name.length > 14 ? sub.name.slice(0, 13) + '…' : sub.name)}</text>`;
    });
    s += `<polygon points="${subjects.map((x, i) => pt(i, x.avg).join(',')).join(' ')}" fill="rgba(148,163,184,.15)" stroke="#94A3B8" stroke-width="1.5" stroke-dasharray="4 4"/>`;
    s += `<polygon points="${subjects.map((x, i) => pt(i, x.score).join(',')).join(' ')}" fill="rgba(45,138,86,.25)" stroke="${GREEN}" stroke-width="2.5"/>`;
    subjects.forEach((x, i) => {
        const [px, py] = pt(i, x.score);
        s += `<g class="chart-hit" data-tip="${esc(x.name)}|Điểm của bạn: ${x.score.toFixed(2)}|Trung bình ngành: ${x.avg.toFixed(2)}"><circle cx="${px}" cy="${py}" r="9" fill="transparent"/><circle cx="${px}" cy="${py}" r="4" fill="${GREEN}" stroke="#fff" stroke-width="2"/></g>`;
    });
    return s + '</svg>';
}

// Tooltip dùng chung cho mọi .chart-hit
export function initChartTips() {
    let tip = document.getElementById('chart-tip');
    if (!tip) {
        tip = document.createElement('div');
        tip.id = 'chart-tip';
        tip.className = 'hidden fixed z-[60] pointer-events-none bg-white/95 backdrop-blur-md p-3 rounded-xl border border-[#C7E6D4] shadow-lg text-xs';
        document.body.appendChild(tip);
    }
    document.addEventListener('mousemove', (e) => {
        const hit = e.target.closest && e.target.closest('.chart-hit');
        if (!hit) { tip.classList.add('hidden'); return; }
        const [title, ...lines] = hit.dataset.tip.split('|');
        tip.textContent = '';
        const h = document.createElement('p');
        h.className = 'font-bold text-[#133924] mb-1.5';
        h.textContent = title;
        tip.appendChild(h);
        lines.forEach(l => { const d = document.createElement('div'); d.className = 'text-slate-600'; d.textContent = l; tip.appendChild(d); });
        tip.classList.remove('hidden');
        tip.style.left = Math.min(e.clientX + 14, window.innerWidth - 200) + 'px';
        tip.style.top = (e.clientY + 14) + 'px';
    });
}

// Đồng hồ nửa vòng cho GPA (thang 4) với các mốc Khá / Giỏi / Xuất sắc
export function gaugeChart(gpa) {
    const cx = 120, cy = 112, r = 88, len = Math.PI * r;
    const color = gpa >= 3.6 ? '#059669' : gpa >= 3.2 ? GREEN : gpa >= 2.5 ? '#F59E0B' : '#F43F5E';
    const pos = (v, rad) => { const a = Math.PI * (1 - v / 4); return [cx + rad * Math.cos(a), cy - rad * Math.sin(a)]; };
    let s = `<svg viewBox="0 0 240 142" class="w-full" role="img" aria-label="GPA dự báo ${gpa.toFixed(2)} trên thang 4">`;
    s += `<path d="M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}" fill="none" stroke="#DDEBE2" stroke-width="16" stroke-linecap="round"/>`;
    s += `<path d="M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}" fill="none" stroke="${color}" stroke-width="16" stroke-linecap="round" stroke-dasharray="${(len * Math.min(gpa, 4)) / 4} ${len}" style="transition:stroke-dasharray .6s ease"/>`;
    [[2.5, 'Khá'], [3.2, 'Giỏi'], [3.6, 'XS']].forEach(([v, label]) => {
        const [x1, y1] = pos(v, r - 13), [x2, y2] = pos(v, r + 13), [tx, ty] = pos(v, r + 22);
        s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#fff" stroke-width="2"/><text x="${tx}" y="${ty + 3}" text-anchor="middle" font-size="9" fill="#64748B" font-weight="600">${label}</text>`;
    });
    s += `<text x="${cx}" y="${cy - 14}" text-anchor="middle" font-size="40" font-weight="800" fill="#133924" font-family="JetBrains Mono, monospace">${gpa.toFixed(2)}</text>`;
    s += `<text x="${cx}" y="${cy + 6}" text-anchor="middle" font-size="11" fill="#64748B">trên thang 4.0</text>`;
    s += `<text x="${cx - r}" y="${cy + 22}" text-anchor="middle" font-size="9" fill="#94A3B8">0</text><text x="${cx + r}" y="${cy + 22}" text-anchor="middle" font-size="9" fill="#94A3B8">4.0</text>`;
    return s + '</svg>';
}
