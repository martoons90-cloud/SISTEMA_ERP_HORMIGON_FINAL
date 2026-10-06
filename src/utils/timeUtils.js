// src/utils/timeUtils.js

export const timeToMinutes = (time) => {
    if (!time || typeof time !== 'string' || !time.includes(':')) return null;
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
};

export const minutesToTime = (mins) => {
    if (mins === null || isNaN(mins)) return null;
    const h = Math.floor(mins / 60) % 24;
    const m = mins % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

export const addMinutes = (time, mins) => {
    if (!time || typeof time !== 'string' || !time.includes(':')) return '00:00';
    const [h, m] = time.split(':').map(Number);
    const totalMins = Math.round(h * 60 + m + mins);
    const newH = Math.floor(totalMins / 60) % 24;
    const newM = totalMins % 60;
    return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
};

export const subtractMinutes = (time, mins) => {
    if (!time || typeof time !== 'string' || !time.includes(':')) return '00:00';
    const [h, m] = time.split(':').map(Number);
    let totalMins = Math.round(h * 60 + m - mins);
    if (totalMins < 0) totalMins = 0;
    const newH = Math.floor(totalMins / 60) % 24;
    const newM = totalMins % 60;
    return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
};
