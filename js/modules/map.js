import { api, getUniversities, escapeHtml as esc, enc } from './api-client.js';
import { openModal, closeModal } from './modal.js';

function buildMapIframe(lat, lng, zoom) {
    return iframeFor(`${lat},${lng}`, zoom);
}

function iframeFor(query, zoom) {
    const mapUrl = `https://maps.google.com/maps?q=${enc(query)}&t=&z=${zoom}&ie=UTF8&iwloc=&output=embed`;
    return `<iframe src="${mapUrl}" width="100%" height="100%" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`;
}

export async function loadCampusMap(userProfile) {
    let uniData;
    try {
        const universities = await getUniversities();
        uniData = universities.find(u => u.code === userProfile.university) || universities.find(u => u.code === "VKU");
    } catch (err) {
        console.error('Lỗi tải vị trí trường:', err);
        return;
    }
    if (!uniData || uniData.lat == null || uniData.lng == null) return;

    const iframeHTML = buildMapIframe(uniData.lat, uniData.lng, 17);

    const smallMapContainer = document.getElementById('google-map-container');
    if (smallMapContainer) {
        smallMapContainer.innerHTML = iframeHTML;
    }

    const bigMapContainer = document.getElementById('big-map-container');
    if (bigMapContainer) {
        bigMapContainer.innerHTML = iframeHTML;
    }
}

// ---------------------------------------------------------------- danh sách địa điểm

const state = { uni: null, cat: 'all', q: '', radius: 0 };
const placesCache = {};     // theo mã trường
let user = null;
let universities = [];
let controlsReady = false;

const $ = id => document.getElementById(id);

function normalize(s) {
    return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase();
}

// "250m" -> 250, "1.2km" -> 1200, không đọc được -> null
function parseMeters(text) {
    const m = /^(\d+(?:[.,]\d+)?)\s*(km|m)$/i.exec(String(text || '').trim());
    if (!m) return null;
    const n = parseFloat(m[1].replace(',', '.'));
    return m[2].toLowerCase() === 'km' ? n * 1000 : n;
}

// Ưu tiên theo giờ trong ngày: sáng cafe, trưa cơm, chiều chỗ học
function timeScore(p, hour) {
    if (hour < 10 && p.category === 'coffee') return 1;
    if (hour >= 11 && hour <= 13 && p.category === 'food') return 1;
    if (hour >= 14 && p.category === 'study') return 1;
    return 0;
}

async function fetchPlaces(uniCode) {
    if (!placesCache[uniCode]) {
        placesCache[uniCode] = await api.get(`/places?university=${enc(uniCode)}&userId=${enc(user.id)}`);
    }
    return placesCache[uniCode];
}

function panTo(place) {
    // Địa điểm do sinh viên thêm chưa có tọa độ thật: tìm theo tên + địa chỉ
    const html = place.isCommunity
        ? iframeFor(`${place.name}, ${place.address}, Đà Nẵng`, 17)
        : buildMapIframe(place.lat, place.lng, 18);
    const big = $('big-map-container');
    const small = $('google-map-container');
    if (big) big.innerHTML = html;
    if (small) small.innerHTML = html;
}

function directionsUrl(p) {
    const dest = p.isCommunity ? `${p.name}, ${p.address}, Đà Nẵng` : `${p.lat},${p.lng}`;
    return `https://www.google.com/maps/dir/?api=1&destination=${enc(dest)}`;
}

function renderList() {
    const list = $('ai-places-list');
    if (!list) return;

    const all = placesCache[state.uni] || [];
    const q = normalize(state.q);
    const hour = new Date().getHours();

    const shown = all
        .filter(p => state.cat === 'all' || p.category === state.cat)
        .filter(p => !q || normalize([p.name, p.tags.join(' '), p.aiNote, p.address].join(' ')).includes(q))
        .filter(p => {
            if (!state.radius) return true;
            const m = parseMeters(p.distance);
            return m !== null && m <= state.radius;
        })
        .map((p, i) => ({ p, i, s: timeScore(p, hour) }))
        .sort((a, b) => b.s - a.s || a.i - b.i)
        .map(x => x.p);

    const count = $('places-count');
    if (count) count.textContent = `(${shown.length})`;

    if (all.length === 0) {
        list.innerHTML = '<div class="list-empty">Chưa có địa điểm nào quanh trường này. Bạn có thể là người đầu tiên thêm!</div>';
        return;
    }
    if (shown.length === 0) {
        list.innerHTML = '<div class="list-empty">Không có địa điểm nào khớp bộ lọc hiện tại.</div>';
        return;
    }

    list.innerHTML = shown.map(p => `
        <div class="place-card" data-place-id="${esc(p.id)}">
            <div class="place-header">
                <h5>${esc(p.name)}</h5>
                <span class="rating-tag">${p.rating != null ? '⭐ ' + Number(p.rating).toFixed(1) : 'Mới'}</span>
            </div>
            <p>${p.tags.map(esc).join(' • ')}</p>
            <div class="place-meta">
                ${p.distance ? `<span>📍 Cách trường ${esc(p.distance)}</span>` : ''}
                ${p.address ? `<span>🏠 ${esc(p.address)}</span>` : ''}
                ${p.time ? `<span>🕒 Mở cửa: ${esc(p.time)}</span>` : ''}
            </div>
            ${p.aiNote ? `<div class="ai-note-box">✨ ${esc(p.aiNote)}</div>` : ''}
            <div class="place-actions">
                <a class="place-link" href="${directionsUrl(p)}" target="_blank" rel="noopener noreferrer">Chỉ đường ↗</a>
                ${p.isCommunity ? '<span class="place-note">Sinh viên đóng góp</span>' : ''}
                ${p.isMine ? `<button type="button" class="place-delete" data-delete-id="${esc(p.id)}">Xóa</button>` : ''}
            </div>
        </div>
    `).join('');
}

async function refresh() {
    const list = $('ai-places-list');
    try {
        await fetchPlaces(state.uni);
    } catch (err) {
        console.error('Lỗi tải địa điểm:', err);
        if (list) list.innerHTML = `<div class="list-empty">${esc(err.message)}</div>`;
        return;
    }
    renderList();
}

function updateUniLabel() {
    const label = $('current-uni-label');
    const uni = universities.find(u => u.code === state.uni);
    if (label) label.textContent = uni ? uni.fullName : 'Đại học của bạn';
    const addBtn = $('btn-open-add-place');
    if (addBtn) addBtn.hidden = state.uni !== user.university;   // chỉ thêm địa điểm cho trường của mình
}

async function initControls() {
    controlsReady = true;

    try { universities = await getUniversities(); } catch (err) { console.error(err); }

    const uniSelect = $('map-uni-select');
    if (uniSelect) {
        uniSelect.innerHTML = universities
            .map(u => `<option value="${esc(u.code)}">${esc(u.shortName)}${u.code === user.university ? ' (trường của bạn)' : ''}</option>`)
            .join('');
        uniSelect.value = state.uni;
        uniSelect.addEventListener('change', async () => {
            state.uni = uniSelect.value;
            updateUniLabel();
            const uni = universities.find(u => u.code === state.uni);
            const big = $('big-map-container');
            if (uni && big) big.innerHTML = buildMapIframe(uni.lat, uni.lng, 17);
            await refresh();
        });
    }

    document.querySelectorAll('.map-filters .filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.map-filters .filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.cat = btn.getAttribute('data-cat');
            renderList();
        });
    });

    const search = $('map-search');
    if (search) search.addEventListener('input', () => { state.q = search.value; renderList(); });

    const radius = $('map-radius');
    if (radius) radius.addEventListener('change', () => { state.radius = Number(radius.value); renderList(); });

    const list = $('ai-places-list');
    if (list) {
        list.addEventListener('click', async (e) => {
            if (e.target.closest('a')) return;      // "Chỉ đường" mở tab mới, không di chuyển bản đồ

            const del = e.target.closest('.place-delete');
            if (del) {
                if (!confirm('Xóa địa điểm này khỏi bản đồ?')) return;
                try {
                    await api.del(`/places/${enc(del.getAttribute('data-delete-id'))}?userId=${enc(user.id)}`);
                    delete placesCache[state.uni];
                    await refresh();
                } catch (err) {
                    alert(err.message);
                }
                return;
            }

            const card = e.target.closest('.place-card');
            if (!card) return;
            const place = (placesCache[state.uni] || []).find(p => p.id === card.getAttribute('data-place-id'));
            if (place) panTo(place);
        });
    }

    initAddPlace();
    updateUniLabel();
}

function initAddPlace() {
    const openBtn = $('btn-open-add-place');
    const saveBtn = $('btn-save-place');
    const err = $('place-error');
    if (!openBtn || !saveBtn) return;

    openBtn.addEventListener('click', () => {
        err.textContent = '';
        openModal('place-modal');
    });

    saveBtn.addEventListener('click', async () => {
        err.textContent = '';
        const name = $('place-name').value.trim();
        const address = $('place-address').value.trim();
        if (!name) { err.textContent = 'Nhập tên địa điểm nhé.'; return; }
        if (!address) { err.textContent = 'Nhập địa chỉ để mọi người tìm được trên bản đồ.'; return; }

        saveBtn.disabled = true;
        try {
            await api.post('/places', {
                userId: user.id,
                name,
                category: $('place-category').value,
                address,
                distance: $('place-distance').value,
                openHours: $('place-hours').value,
                tags: $('place-tags').value,
                note: $('place-note').value
            });
            ['place-name', 'place-address', 'place-distance', 'place-hours', 'place-tags', 'place-note']
                .forEach(id => { $(id).value = ''; });
            closeModal('place-modal');
            delete placesCache[user.university];
            state.cat = 'all';
            document.querySelectorAll('.map-filters .filter-btn').forEach(b => b.classList.toggle('active', b.getAttribute('data-cat') === 'all'));
            await refresh();
        } catch (e) {
            err.textContent = e.message;
        } finally {
            saveBtn.disabled = false;
        }
    });
}

// Được gọi mỗi lần mở trang Bản đồ
export async function renderAISuggestions(userProfile) {
    user = userProfile;
    if (!state.uni) state.uni = userProfile.university;
    if (!controlsReady) await initControls();
    updateUniLabel();
    await refresh();
}
