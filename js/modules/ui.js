
import { renderAISuggestions } from './map.js';

/**
 * Hàm khởi tạo chính cho UI
 * @param {Object} userProfile - Dữ liệu người dùng để phục vụ gợi ý AI
 */
export function initUI(userProfile) {
    initNavigation(userProfile);
    initStudyTimer();
    initMobileMenu(); // Hỗ trợ cho thiết bị di động
}


function initNavigation(userProfile) {
    // Sidebar (desktop), thanh dưới (điện thoại) và các link "xem thêm" trong trang đều dùng chung một bộ điều hướng
    const navLinks = document.querySelectorAll('.sidebar-menu a, .mobile-nav a, a.link-action[href^="#"]');
    const pages = document.querySelectorAll('.page-view');

    function setActiveNav(href) {
        document.querySelectorAll('.sidebar-menu li').forEach(li => {
            const a = li.querySelector('a');
            li.classList.toggle('active', !!a && a.getAttribute('href') === href);
        });
        document.querySelectorAll('.mobile-nav a').forEach(a => {
            a.classList.toggle('active', a.getAttribute('href') === href);
        });
    }

    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const targetHref = this.getAttribute('href');
            if (!targetHref.startsWith('#')) return;

            e.preventDefault();
            setActiveNav(targetHref);

            const targetId = `view-${targetHref.replace('#', '')}`;
            pages.forEach(page => {
                page.classList.toggle('active', page.id === targetId);
            });

            if (targetHref === '#map') {
                renderAISuggestions(userProfile);
            }

            document.querySelector('.main-content').scrollTop = 0;
        });
    });

    setActiveNav('#dashboard');
}


function initStudyTimer() {
    const timerDisplay = document.getElementById('study-timer-display');
    if (!timerDisplay) return;

    let totalSeconds = (4 * 3600) + (29 * 60) + 53;

    const interval = setInterval(() => {
        if (totalSeconds <= 0) {
            clearInterval(interval);
            timerDisplay.textContent = "00:00:00 - Nghỉ ngơi thôi!";
            return;
        }

        totalSeconds--;

        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;

        timerDisplay.innerHTML = `${h} giờ ${m} phút <span style="font-size: 0.8em; opacity: 0.7;">${s}s</span>`;
    }, 1000);
}


function initMobileMenu() {
    const sidebar = document.getElementById('sidebar');
}


export function animateProgressBars() {
    const bars = document.querySelectorAll('.progress-bar');
    bars.forEach(bar => {
        const targetWidth = bar.style.width;
        bar.style.width = '0';
        setTimeout(() => {
            bar.style.transition = 'width 1.5s cubic-bezier(0.165, 0.84, 0.44, 1)';
            bar.style.width = targetWidth;
        }, 300);
    });
}