import { checkOnboardingStatus } from './modules/auth.js';
import { api, getUniversities, enc } from './modules/api-client.js';
import { state, views, initDelegation, setTab, renderCurrent, loadSchedule, toast } from './ui/core.js';
import './ui/header.js';
import './ui/modals.js';
import './ui/dashboard.js';
import './ui/map.js';
import './ui/forum.js';
import './ui/schedule.js';
import './ui/advisor.js';
import { loadPlaces } from './ui/map.js';
import { loadPosts } from './ui/forum.js';
import { initChartTips } from './ui/charts.js';

const ALIAS = { community: 'forum', tools: 'advisor', settings: 'dashboard' };
const TABS = ['dashboard', 'map', 'forum', 'schedule', 'advisor'];

function saveLocalProfile(user) {
    const profile = { ...user, onboardingCompleted: true };
    localStorage.setItem('dnse_user', JSON.stringify(profile));
    return profile;
}

// Hồ sơ cũ (chưa có id, hoặc id không còn trong DB) sẽ được đăng ký lại tự động
async function ensureUser(stored) {
    if (stored.id) {
        try { return saveLocalProfile(await api.get(`/users/${stored.id}`)); }
        catch (err) { if (err.status !== 404) throw err; }
    }
    return saveLocalProfile(await api.post('/users', { name: stored.name, university: stored.university, majorCode: stored.majorCode }));
}

function showFatal(message) {
    document.getElementById('app-loading').innerHTML = `
      <div class="max-w-md text-center p-6">
        <p class="text-sm font-bold text-[#133924]">Không tải được dữ liệu</p>
        <p class="text-xs text-slate-500 mt-2">${message.replace(/</g, '&lt;')}</p>
        <button onclick="location.reload()" class="mt-4 px-4 py-2 bg-[#2D8A56] text-white text-xs font-bold rounded-xl cursor-pointer">Thử lại</button>
      </div>`;
}

document.addEventListener('DOMContentLoaded', async () => {
    const stored = checkOnboardingStatus();
    if (!stored) return;

    try {
        state.user = await ensureUser(stored);
        const [dashboard, universities] = await Promise.all([
            api.get(`/dashboard?major=${enc(state.user.majorCode)}`),
            getUniversities()
        ]);
        state.dashboard = { widget: dashboard.widget, events: dashboard.events, news: dashboard.news, hotPosts: dashboard.hotPosts || [] };
        state.universities = universities;
    } catch (err) {
        if (err.status === 400) {
            localStorage.removeItem('dnse_user');
            window.location.replace('onboarding.html');
            return;
        }
        console.error('Lỗi tải dữ liệu:', err);
        showFatal(err.message);
        return;
    }

    initDelegation();
    initChartTips();
    document.getElementById('app-loading').remove();
    document.getElementById('app-shell').classList.remove('hidden');

    const hash = location.hash.replace('#', '');
    setTab(TABS.includes(ALIAS[hash] || hash) ? (ALIAS[hash] || hash) : 'dashboard');

    // Dữ liệu nặng tải nền, xong tới đâu vẽ lại tới đó
    Promise.all([loadSchedule(), loadPlaces(), loadPosts()]).then(renderCurrent);

    // Cập nhật ca học kế tiếp / đếm ngược mỗi phút
    setInterval(() => { if (state.tab === 'schedule') renderCurrent(); }, 60000);
    window.addEventListener('hashchange', () => {
        const h = location.hash.replace('#', ''), t = ALIAS[h] || h;
        if (TABS.includes(t) && t !== state.tab) setTab(t);
    });
});
