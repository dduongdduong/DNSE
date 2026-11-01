// Hộp thoại dùng chung: đóng khi bấm nền tối, nút [data-close-modal] hoặc phím Esc

export function openModal(id) {
    const overlay = document.getElementById(id);
    if (!overlay) return;
    overlay.classList.remove('hidden');
    const first = overlay.querySelector('input:not([type="hidden"]), select, textarea');
    if (first) first.focus();
}

export function closeModal(id) {
    const overlay = document.getElementById(id);
    if (overlay) overlay.classList.add('hidden');
}

export function initModals() {
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay || e.target.closest('[data-close-modal]')) {
                overlay.classList.add('hidden');
            }
        });
    });

    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        document.querySelectorAll('.modal-overlay:not(.hidden)').forEach(o => o.classList.add('hidden'));
    });
}
