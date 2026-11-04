export const DAY_LABEL = n => (n === 7 ? 'Chủ nhật' : `Thứ ${n + 1}`);
export const pad = n => String(n).padStart(2, '0');

export function todayNumber() {
    const d = new Date().getDay();
    return d === 0 ? 7 : d;
}

export function dateKey(d) {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function mondayOfThisWeek() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return d;
}

export function dateOfDay(monday, day) {
    const d = new Date(monday);
    d.setDate(d.getDate() + day - 1);
    return d;
}

export function toMinutes(hhmm) {
    const [h, m] = String(hhmm).split(':').map(Number);
    return h * 60 + m;
}

export function formatDuration(mins) {
    const h = Math.floor(mins / 60), m = mins % 60;
    return h > 0 ? `${h} giờ ${m} phút` : `${m} phút`;
}

export function timeAgo(iso) {
    const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (minutes < 1) return 'vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    return `${Math.floor(hours / 24)} ngày trước`;
}
