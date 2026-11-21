/**
 * xmas.js - optional Philippine Christmas (Pasko) theme for the whole portal (login, admin, teacher, student).
 *
 * - Turned on/off from the profile card (top-right avatar) or the Profile page.
 * - The choice is remembered on this device, so the login page shows it too.
 * - Only colours + decoration change: the 60-30-10 layout stays the same
 *   (60% warm cream background, 30% white cards/sidebar, 10% parol red accent).
 * - All artwork is vector (SVG + CSS gradients), so it stays sharp ("HD") on any screen, including 4K/retina.
 * - Realistic details: shaded fabric banderitas, glass bulbs with glow, needle-textured pine trees,
 *   glossy ornaments, capiz-style parols, wrapped gifts and soft bokeh lights.
 * - Everything is hidden while a test is running and when printing.
 */
const KEY = "ttvhs-xmas";
const ROOT = document.documentElement;

export const isXmas = () => { try { return localStorage.getItem(KEY) === "1"; } catch { return false; } };

export function setXmas(on) {
    try { localStorage.setItem(KEY, on ? "1" : "0"); } catch { /* private mode: still works for this visit */ }
    ROOT.classList.toggle("xmas", !!on);
}

/* ---------- shared artwork helpers ---------- */
const STAR = "50,10 59.4,35.1 86.1,36.3 65.2,52.9 72.3,78.7 50,64 27.7,78.7 34.8,52.9 13.9,36.3 40.6,35.1";
const OUTER = [[50,10],[86.1,36.3],[72.3,78.7],[27.7,78.7],[13.9,36.3]];

/* bulb palette: base, light, dark */
const COLS  = ["#ff4d4d", "#ffe08a", "#4dd16a", "#5ab0ff", "#ff8ad8"];
const LIGHT = ["#ff9a9a", "#fff6c9", "#a6f0b4", "#b4dbff", "#ffc9ee"];
const DARK  = ["#a80f0f", "#d99a00", "#16782f", "#1259b8", "#b0155f"];

/* gradients: g = glass bulb, h = glow halo, b = glossy ornament ball */
const GRAD = COLS.map((c, i) => `
<radialGradient id="g${i}" cx=".42" cy=".35" r=".75"><stop offset="0" stop-color="#fff"/><stop offset=".28" stop-color="${LIGHT[i]}"/><stop offset=".62" stop-color="${c}"/><stop offset="1" stop-color="${DARK[i]}"/></radialGradient>
<radialGradient id="h${i}"><stop offset="0" stop-color="${c}" stop-opacity=".8"/><stop offset=".45" stop-color="${c}" stop-opacity=".28"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>
<radialGradient id="b${i}" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="${LIGHT[i]}"/><stop offset=".45" stop-color="${c}"/><stop offset="1" stop-color="${DARK[i]}"/></radialGradient>`).join("");

/* realistic hanging glass bulb with metal cap, glossy highlight and glow */
const bulb = (x, y, k, d = 0) => `
<g class="b d${d}"><circle cx="${x}" cy="${y + 8}" r="17" fill="url(#h${k})"/>
<path d="M${x - 3.4} ${y + 3}h6.8c2 2.4 3.4 5.6 2.4 9.4-.9 3.4-3.8 5.2-5.8 5.2s-4.9-1.8-5.8-5.2c-1-3.8.4-7 2.4-9.4z" fill="url(#g${k})"/>
<ellipse cx="${x - 1.7}" cy="${y + 9}" rx="1.1" ry="3" fill="#fff" opacity=".8"/></g>
<rect x="${x - 3.8}" y="${y - 1.5}" width="7.6" height="5" rx="1" fill="#8a8f98"/><rect x="${x - 3.8}" y="${y - 1.5}" width="7.6" height="1.6" fill="#c9ced6"/>`;

/* a droopy string of bulbs: wire + 4 bulbs per 120px tile */
const lightsTile = (order, shift) => encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="56" viewBox="0 0 120 56">
<style>.b{animation:t 1.2s ease-in-out infinite alternate}.d1{animation-delay:.3s}.d2{animation-delay:.6s}.d3{animation-delay:.9s}@keyframes t{0%{opacity:.35}100%{opacity:1}}</style>
<defs>${GRAD}</defs>
<path d="M0 4Q60 30 120 4" stroke="#1f3d2a" stroke-width="2" fill="none"/>
${[[15, 9.7], [45, 16.2], [75, 16.2], [105, 9.7]].map(([x, y], i) => bulb(x, y, order[i], (i + shift) % 4)).join("")}
</svg>`);
const LIGHTS_A = lightsTile([0, 1, 2, 3], 0);
const LIGHTS_B = lightsTile([3, 4, 1, 0], 2);

/* banderitas: shaded fabric pennants on a rope */
const PEN = [["#e53935", "#8e1b1b"], ["#ffca28", "#c68a00"], ["#43a047", "#1b5e20"], ["#1e88e5", "#0d47a1"]];
const BUNTING = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="26" viewBox="0 0 160 26">
<defs>${PEN.map(([a, b], i) => `<linearGradient id="f${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`).join("")}</defs>
<path d="M0 2.5h160" stroke="#6d4c2a" stroke-width="2.4"/><path d="M0 1.8h160" stroke="#c49a6c" stroke-width=".8"/>
${PEN.map((p, i) => { const x = 3 + i * 40; return `<path d="M${x} 3Q${x + 16} 6 ${x + 32} 3L${x + 16} 23z" fill="url(#f${i})"/><path d="M${x + 16} 5V23M${x + 8} 4.6L${x + 16} 23M${x + 24} 4.6L${x + 16} 23" stroke="#000" stroke-opacity=".12" stroke-width="1" fill="none"/><path d="M${x + 4} 4.2Q${x + 16} 7 ${x + 28} 4.2" stroke="#fff" stroke-opacity=".35" fill="none"/>`; }).join("")}
</svg>`);

/* faint parol stars + capiz diamonds tile for the page background */
const TILE = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160">
<polygon points="${STAR}" fill="#f3d98b" transform="translate(30 30) scale(.32) translate(-50 -48)"/>
<polygon points="${STAR}" fill="#eebcbc" transform="translate(116 112) scale(.26) translate(-50 -48)"/>
<g fill="none" stroke="#e6d3a3" stroke-width="1.3" stroke-linejoin="round"><path d="M116 22l8 8-8 8-8-8z"/><path d="M36 112l7 7-7 7-7-7z"/></g>
<circle cx="80" cy="76" r="2" fill="#b9d3bd"/><circle cx="150" cy="60" r="1.8" fill="#f3d98b"/><circle cx="8" cy="70" r="1.8" fill="#eebcbc"/>
</svg>`);

/* parol: capiz-style star lantern. id = unique gradient id, c/light/dark = star colours, tail = ribbon colour */
const parolDefs = (id, c, light, dark) => `<radialGradient id="${id}" cx=".5" cy=".42" r=".62"><stop offset="0" stop-color="#fffbe6"/><stop offset=".22" stop-color="${light}"/><stop offset=".6" stop-color="${c}"/><stop offset="1" stop-color="${dark}"/></radialGradient>`;
const parolBody = (id, tail) => `
<path d="M72 78L84 120M28 78L16 120M50 64v58" stroke="${tail}" stroke-width="5" stroke-linecap="round"/>
<circle cx="84" cy="122" r="3.2" fill="${tail}"/><circle cx="16" cy="122" r="3.2" fill="${tail}"/><circle cx="50" cy="124" r="3.2" fill="${tail}"/>
<polygon points="${STAR}" fill="url(#${id})" stroke="#ffe9a8" stroke-width="2.6" stroke-linejoin="round"/>
<path d="${OUTER.map(([x, y]) => `M50 48L${x} ${y}`).join("")}" stroke="#ffe9a8" stroke-opacity=".7" stroke-width="1.1"/>
<polygon points="${STAR}" fill="#fff6cf" opacity=".4" transform="translate(50 48) scale(.5) translate(-50 -48)"/>
<circle cx="50" cy="48" r="8" fill="#fffdf0"/><circle cx="50" cy="48" r="13" fill="#fff3b0" opacity=".45"/>`;
const parol = (c, light, dark, tail) => encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 132"><defs>${parolDefs("p", c, light, dark)}</defs>
<path d="M50 0v10" stroke="#8d6e63" stroke-width="2"/>${parolBody("p", tail)}</svg>`);
const PAROL_RED = parol("#d32f2f", "#ff8a80", "#7f0000", "#f9a825");
const PAROL_GOLD = parol("#f9a825", "#fff2a8", "#b26a00", "#c62828");

/* ---------- login page: needle-textured pine trees topped with a parol, ornaments, gifts and glowing lights ---------- */
let seed = 11;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const f1 = n => Math.round(n * 10) / 10;
const TIERS = [[40, 110, 38], [70, 150, 55], [105, 195, 72], [140, 238, 88], [175, 282, 100]];
const NEEDLE = ["#4fbf68", "#2f9547", "#1f7a36", "#8fdc98", "#135a27"];

const tiers = [...TIERS].reverse().map(([y0, y1, hw]) => {
    const k = Math.round(hw / 3.2), pts = [`100,${y0}`, `${100 - hw},${y1 - 6}`];
    for (let i = 0; i <= k; i++) pts.push(`${f1(100 - hw + (2 * hw * i) / k)},${f1(i % 2 ? y1 - 9 : y1 + rnd() * 4)}`);
    const paths = NEEDLE.map(() => "");
    for (let j = 0, n = Math.round(hw * 1.5); j < n; j++) {
        const y = y0 + 4 + rnd() * (y1 - y0 - 6), half = (hw * (y - y0)) / (y1 - y0);
        const x = 100 + (rnd() * 2 - 1) * half * 0.97, side = x < 100 ? -1 : 1;
        paths[j % 5] += `M${f1(x)} ${f1(y)}l${f1(side * (3 + rnd() * 8))} ${f1(5 + rnd() * 9)}`;
    }
    return `<polygon points="${pts.join(" ")}" fill="url(#tg)"/>` +
        paths.map((d, i) => `<path d="${d}" stroke="${NEEDLE[i]}" stroke-width="1.5" stroke-linecap="round" opacity=".85"/>`).join("");
}).join("");

const garland = TIERS.slice(2).map(([y0, y1, hw]) => {
    const y = y0 + (y1 - y0) * 0.6, w = hw * 0.78;
    return `<path d="M${100 - w} ${y}Q100 ${y + 24} ${100 + w} ${y}" stroke="#f6c445" stroke-width="3.4" stroke-dasharray=".2 7" stroke-linecap="round" fill="none"/>`;
}).join("");

const ball = (x, y, r, k) => `<rect x="${x - 1.6}" y="${y - r - 3}" width="3.2" height="3.4" fill="#d9b44a"/><circle cx="${x}" cy="${y}" r="${r}" fill="url(#b${k})"/><ellipse cx="${x - r * .35}" cy="${y - r * .4}" rx="${r * .28}" ry="${r * .16}" fill="#fff" opacity=".85" transform="rotate(-30 ${x} ${y})"/>`;
const BALLS = [[84, 128, 6, 0], [120, 152, 6, 1], [68, 184, 6.5, 3], [132, 198, 6.5, 0], [100, 218, 7, 1], [58, 240, 7, 0], [146, 242, 7, 3], [100, 266, 7, 3], [74, 268, 6.5, 1], [128, 268, 6.5, 0]];

let li = 0;
const leds = TIERS.map(([y0, y1, hw], ti) => {
    let s = "";
    for (let j = 0, n = 4 + ti * 2; j < n; j++, li++) {
        const y = y0 + 16 + rnd() * (y1 - y0 - 28), half = (hw * (y - y0)) / (y1 - y0), x = 100 + (rnd() * 2 - 1) * half * 0.85, k = li % 5;
        s += `<g class="b d${li % 4}"><circle cx="${f1(x)}" cy="${f1(y)}" r="11" fill="url(#h${k})"/><circle cx="${f1(x)}" cy="${f1(y)}" r="3" fill="${COLS[k]}"/><circle cx="${f1(x)}" cy="${f1(y)}" r="1.3" fill="#fff"/></g>`;
    }
    return s;
}).join("");

const gift = (x, y, w, h, a, b, rib) => `<ellipse cx="${x + w / 2}" cy="${y + h}" rx="${w * .62}" ry="3" fill="#000" opacity=".22"/><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${a})"/><rect x="${x + w * .42}" y="${y}" width="${w * .16}" height="${h}" fill="${rib}"/><rect x="${x}" y="${y + h * .4}" width="${w}" height="${h * .16}" fill="${rib}"/><path d="M${x + w / 2} ${y}c-8-9-14-3-9 1zM${x + w / 2} ${y}c8-9 14-3 9 1z" fill="${rib}" stroke="#0003" stroke-width=".6"/>`;

const treesSvg = flip => encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 340 300">
<style>.b{animation:t 1.3s ease-in-out infinite alternate}.d1{animation-delay:.35s}.d2{animation-delay:.7s}.d3{animation-delay:1s}@keyframes t{0%{opacity:.3}100%{opacity:1}}</style>
<defs>${GRAD}
<linearGradient id="tg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f8f46"/><stop offset=".6" stop-color="#16602c"/><stop offset="1" stop-color="#0b3a1a"/></linearGradient>
<linearGradient id="tk" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#4a2f18"/><stop offset=".5" stop-color="#8a5a30"/><stop offset="1" stop-color="#4a2f18"/></linearGradient>
<linearGradient id="gA" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e53935"/><stop offset="1" stop-color="#8e1b1b"/></linearGradient>
<linearGradient id="gB" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#42a5f5"/><stop offset="1" stop-color="#0d47a1"/></linearGradient>
<linearGradient id="gC" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#66bb6a"/><stop offset="1" stop-color="#1b5e20"/></linearGradient>
${parolDefs("pt", "#d32f2f", "#ff8a80", "#7f0000")}
<radialGradient id="halo"><stop offset="0" stop-color="#ffe082" stop-opacity=".85"/><stop offset="1" stop-color="#ffe082" stop-opacity="0"/></radialGradient>
<g id="tr"><rect x="91" y="270" width="18" height="28" fill="url(#tk)"/>${tiers}${garland}${BALLS.map(a => ball(...a)).join("")}${leds}
<g transform="translate(100 38) scale(.64) translate(-50 -48)"><circle cx="50" cy="48" r="58" fill="url(#halo)" class="b d1"/>${parolBody("pt", "#f9a825")}</g></g>
</defs>
<g${flip ? ' transform="matrix(-1 0 0 1 340 0)"' : ""}>
<ellipse cx="100" cy="296" rx="110" ry="6" fill="#000" opacity=".18"/>
<use href="#tr" xlink:href="#tr"/>
<use href="#tr" xlink:href="#tr" transform="translate(212 132) scale(.55)"/>
${gift(150, 268, 30, 26, "gA", "", "#ffd54f")}${gift(184, 276, 24, 18, "gB", "", "#fff3b0")}${gift(14, 274, 26, 20, "gC", "", "#ffd54f")}${gift(300, 278, 26, 16, "gA", "", "#fff3b0")}
</g>
</svg>`);
const TREES = treesSvg(false), TREES_R = treesSvg(true);

const CSS = `
/* ---------- always available: the on/off switch row ---------- */
.pp-xm{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:10px 0 0;padding:8px 10px;border:1px solid var(--line);border-radius:10px;background:var(--card);font-size:14px;font-weight:600;cursor:pointer}
.pp-xm input[type=checkbox]{appearance:none;-webkit-appearance:none;flex:none;position:relative;width:38px;height:22px;min-height:0;margin:0;padding:0;border:0;border-radius:99px;background:#cbd5e1;cursor:pointer;transition:background .15s}
.pp-xm input[type=checkbox]::after{content:"";position:absolute;top:2px;left:2px;width:18px;height:18px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .15s}
.pp-xm input[type=checkbox]:checked{background:var(--pri)}
.pp-xm input[type=checkbox]:checked::after{transform:translateX(16px)}

/* ---------- Philippine Christmas theme ---------- */
html.xmas{
  --pri:#c62828;--pri2:#a61e1e;--soft:#fdecd2;
  --bg:#fbf5e6;
  --tw:clamp(220px,27vw,380px);
  --trees:url("data:image/svg+xml,${TREES}");
  --trees-r:url("data:image/svg+xml,${TREES_R}");
  background:var(--bg) url("data:image/svg+xml,${TILE}") fixed;
}
html.xmas body{background:transparent}
html.xmas .main-col{background:transparent}

/* banderitas (shaded fabric pennants) along the top edge */
html.xmas body::before{content:"";position:fixed;top:0;left:0;right:0;height:26px;z-index:60;pointer-events:none;
  background:url("data:image/svg+xml,${BUNTING}") 0 0/160px 26px repeat-x;
  filter:drop-shadow(0 2px 2px rgba(0,0,0,.22))}

/* soft glowing bokeh lights (gold, red, green, blue) */
html.xmas body::after{content:"";position:fixed;inset:0;z-index:50;pointer-events:none;
  background-image:
    radial-gradient(9px 9px at 24px 36px,rgba(255,213,79,.95),rgba(255,213,79,.35) 55%,transparent),
    radial-gradient(8px 8px at 140px 90px,rgba(239,83,80,.9),rgba(239,83,80,.3) 55%,transparent),
    radial-gradient(8px 8px at 60px 150px,rgba(102,187,106,.9),rgba(102,187,106,.3) 55%,transparent),
    radial-gradient(8px 8px at 230px 40px,rgba(66,165,245,.9),rgba(66,165,245,.3) 55%,transparent);
  background-size:260px 220px,340px 300px,300px 260px,380px 340px;
  animation:xm-twinkle 3.2s ease-in-out infinite alternate}
@keyframes xm-twinkle{0%{opacity:.12}100%{opacity:.7}}

/* sidebar logo gets a little parol; footer + active item pick up the red accent automatically */
html.xmas .side .brand{position:relative}
html.xmas .side .brand::before{content:"";position:absolute;left:8px;top:-10px;z-index:2;width:26px;height:34px;pointer-events:none;
  background:url("data:image/svg+xml,${PAROL_GOLD}") center/contain no-repeat;
  filter:drop-shadow(0 0 5px rgba(249,168,37,.7));
  transform-origin:50% 0;animation:xm-sway 4s ease-in-out infinite alternate}

/* login: warm bokeh over the school photo + Filipino greeting */
html.xmas .auth1{background:
  var(--trees) left 1vw bottom/var(--tw) auto no-repeat fixed,
  var(--trees-r) right 1vw bottom/var(--tw) auto no-repeat fixed,
  radial-gradient(circle at 16% 20%,rgba(255,214,102,.42),transparent 6%),
  radial-gradient(circle at 27% 66%,rgba(255,90,90,.30),transparent 5%),
  radial-gradient(circle at 36% 12%,rgba(120,180,255,.28),transparent 5%),
  radial-gradient(circle at 64% 16%,rgba(255,214,102,.34),transparent 6%),
  radial-gradient(circle at 78% 24%,rgba(90,200,120,.30),transparent 6%),
  radial-gradient(circle at 84% 64%,rgba(255,214,102,.36),transparent 7%),
  radial-gradient(circle at 70% 80%,rgba(255,90,90,.26),transparent 5%),
  linear-gradient(rgba(255,255,255,.55),rgba(255,255,255,.55)),
  radial-gradient(circle at 12% 8%,rgba(198,40,40,.16),transparent 42%),
  radial-gradient(circle at 88% 92%,rgba(249,168,37,.22),transparent 44%),
  url("login-bg.jpg") center bottom/cover no-repeat fixed,var(--bg)}
html.xmas .authw::before{content:"Maligayang Pasko from TTVHS \\1F31F";display:block;position:relative;z-index:70;width:fit-content;max-width:92%;
  margin:84px auto 12px;padding:5px 16px;border-radius:99px;text-align:center;font-weight:700;color:var(--pri);
  background:rgba(255,255,255,.92);box-shadow:0 2px 12px rgba(198,40,40,.22),0 0 0 1px rgba(249,168,37,.5)}
html.xmas .acard{box-shadow:0 12px 40px rgba(198,40,40,.18),0 0 0 1px rgba(249,168,37,.4)}
html.xmas .acard::before{background:repeating-linear-gradient(90deg,#c62828 0 20px,#f9a825 20px 40px,#2e7d32 40px 60px,#1565c0 60px 80px)}

/* login: two strings of glass lights under the bunting (the trees are background layers of .auth1 above) */
html.xmas:has(.auth1) body::before{height:84px;
  background:url("data:image/svg+xml,${BUNTING}") 0 0/160px 26px repeat-x,
             url("data:image/svg+xml,${LIGHTS_A}") 0 18px/120px 56px repeat-x,
             url("data:image/svg+xml,${LIGHTS_B}") 60px 30px/120px 56px repeat-x}

/* two parols hang from the bunting and sway gently */
html.xmas::before,html.xmas::after{content:"";position:fixed;top:20px;z-index:55;pointer-events:none;
  transform-origin:50% 0;animation:xm-sway 4s ease-in-out infinite alternate;
  filter:drop-shadow(0 0 10px rgba(249,168,37,.65)) drop-shadow(0 3px 3px rgba(0,0,0,.2))}
html.xmas::before{right:210px;width:46px;height:61px;background:url("data:image/svg+xml,${PAROL_RED}") center/contain no-repeat}
html.xmas::after{right:150px;width:38px;height:50px;animation-delay:-1.8s;background:url("data:image/svg+xml,${PAROL_GOLD}") center/contain no-repeat}
@keyframes xm-sway{0%{transform:rotate(-7deg)}100%{transform:rotate(7deg)}}
/* ---------- phones and small tablets ---------- */
@media(max-width:900px){
  html.xmas{--tw:clamp(120px,38vw,260px)}
  /* hanging parols and the top bunting would cover the app header: keep the bunting for the login page only */
  html.xmas::before,html.xmas::after{display:none}
  html.xmas body::before{display:none}
  html.xmas:has(.auth1) body::before{display:block;height:58px;
    background:url("data:image/svg+xml,${BUNTING}") 0 0/112px 18px repeat-x,
               url("data:image/svg+xml,${LIGHTS_A}") 0 12px/84px 39px repeat-x}
  html.xmas .authw::before{font-size:14px;margin-top:66px}
  html.xmas body::after{background-size:200px 170px,260px 230px,230px 200px,290px 260px}
}

/* never distract during a test, and keep prints clean */
html.xmas body.testing::after,html.xmas body.testing::before,html.xmas:has(body.testing)::after,html.xmas:has(body.testing)::before{display:none}
@media print{html.xmas body::after,html.xmas body::before,html.xmas::after,html.xmas::before{display:none}html.xmas{background:#fff}}
@media (prefers-reduced-motion:reduce){html.xmas body::after,html.xmas::after,html.xmas::before,html.xmas .side .brand::before{animation:none}}
`;

const style = document.createElement("style");
style.id = "xmas-theme";
style.textContent = CSS;
document.head.append(style);

/* apply immediately so the login page already shows it */
ROOT.classList.toggle("xmas", isXmas());
