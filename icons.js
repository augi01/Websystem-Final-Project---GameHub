// ==========================================
// ICONS: cartoon game icons as inline SVG (48x48 grid).
// In JS:   ico("coin")  or  ico("arrowup", "flip")
// In HTML: <i data-ico="coin"></i>
// ==========================================
const INK = "#2B2540";

const heartSvg = (fill, shine) =>
    `<path d="M24 41S6 30 6 18a9.5 9.5 0 0 1 18-4.5A9.5 9.5 0 0 1 42 18c0 12-18 23-18 23z" fill="${fill}"/>` +
    `<path d="M12 17q1-4 5-4.5" stroke="${shine}" stroke-width="3" fill="none"/>`;

const trophySvg = (gold, dark) =>
    `<path d="M14 11H7v3a7 7 0 0 0 7 7M34 11h7v3a7 7 0 0 1-7 7" fill="none"/>` +
    `<path d="M14 7h20v12a10 10 0 0 1-20 0z" fill="${gold}"/>` +
    `<path d="M21 28h6v6h-6z" fill="${dark}"/>` +
    `<path d="M13 34h22v8H13z" fill="${dark}"/>` +
    `<path d="M18 11v8" stroke="#FFF6CC" stroke-width="2.5" fill="none"/>`;

const ICONS = {
    coin: `<circle cx="24" cy="24" r="18" fill="#FFB800"/><circle cx="24" cy="24" r="11" fill="#FFD84A" stroke="#E08A00" stroke-width="2.5"/><path d="M17 20a8 8 0 0 1 5-5" stroke="#FFF6C8" stroke-width="2.5" fill="none"/>`,

    star: `<path d="M24 5l5.8 12.2 13.4 1.7-9.8 9.3 2.5 13.3L24 34.9 12.1 41.5l2.5-13.3-9.8-9.3 13.4-1.7z" fill="#FFC21A"/><path d="M19 17l3-6" stroke="#FFF3B0" stroke-width="2.5" fill="none"/>`,

    trophy: trophySvg("#FFC21A", "#E08A00"),

    game: `<path d="M13 13h22c5 0 10 4 10 10v6c0 4-3 7-7 7-3 0-5-2-7-5H17c-2 3-4 5-7 5-4 0-7-3-7-7v-6c0-6 5-10 10-10z" fill="#5B8DEF"/><path d="M14 19v10M9 24h10" stroke="#fff" stroke-width="3.5" fill="none"/><circle cx="33" cy="21" r="2.8" fill="#FFD84A" stroke="none"/><circle cx="38" cy="26" r="2.8" fill="#FF6B6B" stroke="none"/>`,

    basket: `<path d="M17 19c0-9 14-9 14 0" fill="none"/><path d="M5 19h38l-4 21a3 3 0 0 1-3 2.5H12a3 3 0 0 1-3-2.5z" fill="#E4533F"/><path d="M18 26v10M24 26v10M30 26v10" stroke="#8E2415" stroke-width="3" fill="none"/>`,

    scroll: `<path d="M15 10h24v28c0 3 2 4 4 4H19c-3 0-4-2-4-4z" fill="#F7E6B6"/><path d="M9 5h22a4.5 4.5 0 0 1 0 9H9a4.5 4.5 0 0 1 0-9z" fill="#E9C77B"/><path d="M22 22h11M22 28h11" stroke="#B8893A" stroke-width="3" fill="none"/>`,

    face: `<circle cx="24" cy="24" r="18" fill="#FFC21A"/><circle cx="17.5" cy="21" r="2.6" fill="#2B2540" stroke="none"/><circle cx="30.5" cy="21" r="2.6" fill="#2B2540" stroke="none"/><path d="M16 28c3 6 13 6 16 0" stroke-width="3" fill="none"/><circle cx="12.5" cy="28" r="2.5" fill="#FF8FA3" stroke="none"/><circle cx="35.5" cy="28" r="2.5" fill="#FF8FA3" stroke="none"/>`,

    heart: heartSvg("#F0364B", "#FFB3BC"),
    heartDark: heartSvg("#4B4563", "#7E779C"),

    gem: `<path d="M14 8h20l9 11-19 22L5 19z" fill="#B24BF3"/><path d="M14 8h20l-3 11H17z" fill="#DE9BFF"/><path d="M5 19h38M17 19l7 22 7-22" stroke-width="2.5" fill="none"/>`,

    chest: `<path d="M7 24v-6a9 9 0 0 1 9-9h16a9 9 0 0 1 9 9v6z" fill="#FF7A59"/><path d="M7 24h34v16a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2z" fill="#D6402B"/><path d="M19 9h10v33H19z" fill="#FFC21A"/><rect x="21.5" y="26" width="5" height="7" rx="2" fill="#FFF3B0" stroke-width="2.5"/>`,

    key: `<path d="M22 22L40 40M32 32l5-5" stroke-width="11" fill="none"/><path d="M22 22L40 40M32 32l5-5" stroke="#FFC21A" stroke-width="4.5" fill="none"/><circle cx="14" cy="14" r="9" fill="#FFC21A"/><circle cx="14" cy="14" r="3.5" fill="#FFF3B0" stroke-width="2.5"/>`,

    sword: `<g transform="rotate(45 24 24)"><path d="M21 31V10l3-6 3 6v21z" fill="#DDE7F3"/><path d="M13 31h22v5H13z" fill="#3FA7E0"/><path d="M21 36h6v8h-6z" fill="#B0702E"/></g>`,

    bolt: `<path d="M28 4L10 27h11l-3 17 20-25H26z" fill="#FFC21A"/>`,

    clock: `<circle cx="24" cy="24" r="18" fill="#3FA7E0"/><circle cx="24" cy="24" r="12" fill="#fff" stroke-width="2.5"/><path d="M24 17v8l5 3" stroke-width="3" fill="none"/>`,

    cross: `<circle cx="24" cy="24" r="18" fill="#E4533F"/><path d="M17 17l14 14M31 17L17 31" stroke="#fff" stroke-width="5" fill="none"/>`,

    ring: `<circle cx="24" cy="24" r="12.5" stroke-width="13" fill="none"/><circle cx="24" cy="24" r="12.5" stroke="#3FA7E0" stroke-width="6.5" fill="none"/>`,

    check: `<circle cx="24" cy="24" r="18" fill="#5BBF4A"/><path d="M15 25l6 6 12-13" stroke="#fff" stroke-width="5" fill="none"/>`,

    crown: `<path d="M6 36V15l9.5 9L24 10l8.5 14 9.5-9v21z" fill="#FFC21A"/><path d="M6 36h36v5H6z" fill="#E08A00"/><circle cx="24" cy="29" r="2.8" fill="#E4533F" stroke-width="2.5"/>`,

    fire: `<path d="M24 4c2 9 13 12 13 25a13 13 0 0 1-26 0c0-6 3-9 6-12 0 4 2 6 4 6-1-7 0-13 3-19z" fill="#FF7A1A"/><path d="M24 42a6.5 6.5 0 0 1-6.5-6.5c0-4 3.5-6 6.5-11 3 5 6.5 7 6.5 11A6.5 6.5 0 0 1 24 42z" fill="#FFD84A" stroke="none"/>`,

    orb: `<circle cx="24" cy="24" r="18" fill="#3FA7E0"/><path d="M15 17a10 10 0 0 1 8-5" stroke="#CFF0FF" stroke-width="3" fill="none"/><path d="M19 20a5 5 0 1 1 7 4.6c-1.6 1-2 1.8-2 3.4" stroke="#fff" stroke-width="3.6" fill="none"/><circle cx="24" cy="33.5" r="2.2" fill="#fff" stroke="none"/>`,

    cards: `<rect x="7" y="9" width="22" height="29" rx="4" fill="#9B6BDF" transform="rotate(-12 18 23)"/><rect x="19" y="10" width="22" height="29" rx="4" fill="#fff" transform="rotate(10 30 24)"/><circle cx="30" cy="24" r="4" fill="#E4533F" stroke="none"/>`,

    dice: `<rect x="7" y="7" width="34" height="34" rx="8" fill="#F4F7FF"/><g fill="#2B2540" stroke="none"><circle cx="17" cy="17" r="3"/><circle cx="31" cy="17" r="3"/><circle cx="24" cy="24" r="3"/><circle cx="17" cy="31" r="3"/><circle cx="31" cy="31" r="3"/></g>`,

    lock: `<path d="M15 22v-6a9 9 0 0 1 18 0v6" stroke-width="4" fill="none"/><rect x="9" y="21" width="30" height="22" rx="5" fill="#FFC21A"/><circle cx="24" cy="30.5" r="3" fill="#2B2540" stroke="none"/><path d="M24 31v5" stroke-width="3" fill="none"/>`,

    medal: `<path d="M13 4h9l3 14h-8zM35 4h-9l-3 14h8z" fill="#3FA7E0"/><circle cx="24" cy="31" r="12" fill="#FFC21A"/><circle cx="24" cy="31" r="7" fill="#FFD84A" stroke="#E08A00" stroke-width="2.5"/>`,

    arrowup: `<path d="M24 5L8 23h9v18h14V23h9z" fill="#3FA7E0"/><path d="M18 27v10" stroke="#A5DDFA" stroke-width="2.5" fill="none"/>`,

    cash: `<path d="M5 14h38v22H5z" fill="#5BBF4A"/><circle cx="24" cy="25" r="6" fill="#B9F09A" stroke-width="3"/><path d="M10 20v10M38 20v10" stroke-width="3" fill="none"/>`,

    map: `<path d="M7 11l11-4 12 4 11-4v30l-11 4-12-4-11 4z" fill="#F2DDA0"/><path d="M18 7v30M30 11v30" stroke-width="2.5" fill="none"/><path d="M22 22l8 8M30 22l-8 8" stroke="#E4533F" stroke-width="3.5" fill="none"/>`,

    skull: `<path d="M24 6c-9 0-15 6-15 14 0 5 3 8 6 10v7h18v-7c3-2 6-5 6-10 0-8-6-14-15-14z" fill="#F1E2BC"/><circle cx="17" cy="23" r="4" fill="#2B2540" stroke="none"/><circle cx="31" cy="23" r="4" fill="#2B2540" stroke="none"/><path d="M24 28v4M20 37v-4M28 37v-4" stroke-width="2.5" fill="none"/>`
};

// Returns an <svg> string. Size follows the surrounding font-size (1em).
function ico(name, extra = "") {
    const body = ICONS[name] || ICONS.star;
    return `<svg class="ico ${extra}" viewBox="0 0 48 48" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">${body}</svg>`;
}

// Gold / silver / bronze trophies for the top 3
function rankIcon(n) {
    const colors = { 1: ["#FFC21A", "#E08A00"], 2: ["#DDE3EC", "#8F9BAE"], 3: ["#F2A86B", "#B0622B"] };
    const c = colors[n] || colors[1];
    return `<svg class="ico" viewBox="0 0 48 48" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">${trophySvg(c[0], c[1])}</svg>`;
}

// Fills every <i data-ico="name"></i> in the page
function hydrateIcons(root = document) {
    root.querySelectorAll("[data-ico]").forEach(el => {
        el.innerHTML = ico(el.dataset.ico, el.dataset.icoClass || "");
    });
}
document.addEventListener("DOMContentLoaded", () => hydrateIcons());