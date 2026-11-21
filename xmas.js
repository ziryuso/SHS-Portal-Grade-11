/**
 * xmas.js - optional Philippine Christmas (Pasko) theme for the whole portal (login, admin, teacher, student).
 *
 * - Turned on/off from the profile card (top-right avatar) or the Profile page.
 * - The choice is remembered on this device, so the login page shows it too.
 * - Only colours + decoration change: the 60-30-10 layout stays the same
 *   (60% warm cream background, 30% white cards/sidebar, 10% parol red accent).
 * - Decorations: banderitas (festive bunting) on top, swaying parols (star lanterns),
 *   twinkling Christmas lights, and a small parol on the school logo.
 * - Everything is hidden while a test is running and when printing.
 */
const KEY = "ttvhs-xmas";
const ROOT = document.documentElement;

export const isXmas = () => { try { return localStorage.getItem(KEY) === "1"; } catch { return false; } };

export function setXmas(on) {
    try { localStorage.setItem(KEY, on ? "1" : "0"); } catch { /* private mode: still works for this visit */ }
    ROOT.classList.toggle("xmas", !!on);
}

/* five-point parol star (shared by the tile, the logo parol and the hanging parols) */
const STAR = "50,10 59.4,35.1 86.1,36.3 65.2,52.9 72.3,78.7 50,64 27.7,78.7 34.8,52.9 13.9,36.3 40.6,35.1";

/* faint parol stars + capiz diamonds tile for the page background */
const TILE = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160">
<polygon points="${STAR}" fill="#f3d98b" transform="translate(30 30) scale(.32) translate(-50 -48)"/>
<polygon points="${STAR}" fill="#eebcbc" transform="translate(116 112) scale(.26) translate(-50 -48)"/>
<g fill="none" stroke="#e6d3a3" stroke-width="1.3" stroke-linejoin="round">
<path d="M116 22l8 8-8 8-8-8z"/><path d="M36 112l7 7-7 7-7-7z"/>
</g>
<circle cx="80" cy="76" r="2" fill="#b9d3bd"/><circle cx="150" cy="60" r="1.8" fill="#f3d98b"/><circle cx="8" cy="70" r="1.8" fill="#eebcbc"/>
</svg>`);

/* banderitas: colourful bunting strip */
const BUNTING = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="18" viewBox="0 0 160 18">
<path d="M0 1.5h160" stroke="#8d6e63" stroke-width="1.5"/>
<polygon points="3,1.5 35,1.5 19,16" fill="#c62828"/>
<polygon points="43,1.5 75,1.5 59,16" fill="#f9a825"/>
<polygon points="83,1.5 115,1.5 99,16" fill="#2e7d32"/>
<polygon points="123,1.5 155,1.5 139,16" fill="#1565c0"/>
</svg>`);

/* parol: star lantern with tail; c = star colour, c2 = tail colour */
const parol = (c, c2) => encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 132">
<path d="M50 0v10" stroke="#8d6e63" stroke-width="2"/>
<path d="M72 78L82 124M28 78L18 124M50 64v64" stroke="${c2}" stroke-width="5" stroke-linecap="round"/>
<polygon points="${STAR}" fill="${c}" stroke="#fff3c4" stroke-width="2.5" stroke-linejoin="round"/>
<polygon points="${STAR}" fill="#fff3c4" opacity=".35" transform="translate(50 48) scale(.5) translate(-50 -48)"/>
<circle cx="50" cy="48" r="7" fill="#fff8dc"/>
</svg>`);
const PAROL_RED = parol("#d32f2f", "#f9a825");
const PAROL_GOLD = parol("#f9a825", "#c62828");

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
  background:var(--bg) url("data:image/svg+xml,${TILE}") fixed;
}
html.xmas body{background:transparent}
html.xmas .main-col{background:transparent}

/* banderitas along the top edge */
html.xmas body::before{content:"";position:fixed;top:0;left:0;right:0;height:18px;z-index:60;pointer-events:none;
  background:url("data:image/svg+xml,${BUNTING}") 0 0/160px 18px repeat-x;
  filter:drop-shadow(0 1px 1px rgba(0,0,0,.15))}

/* twinkling Christmas lights / sparkles (gold, red, green, blue) */
html.xmas body::after{content:"";position:fixed;inset:0;z-index:50;pointer-events:none;
  background-image:
    radial-gradient(3.5px 3.5px at 24px 36px,#ffd54f 50%,rgba(255,213,79,.4) 80%,transparent),
    radial-gradient(3px 3px at 140px 90px,#ef5350 50%,rgba(239,83,80,.4) 80%,transparent),
    radial-gradient(3px 3px at 60px 150px,#66bb6a 50%,rgba(102,187,106,.4) 80%,transparent),
    radial-gradient(3px 3px at 230px 40px,#42a5f5 50%,rgba(66,165,245,.4) 80%,transparent);
  background-size:260px 220px,340px 300px,300px 260px,380px 340px;
  animation:xm-twinkle 3.2s ease-in-out infinite alternate}
@keyframes xm-twinkle{0%{opacity:.15}100%{opacity:.75}}

/* sidebar logo gets a little parol; footer + active item pick up the red accent automatically */
html.xmas .side .brand{position:relative}
html.xmas .side .brand::before{content:"";position:absolute;left:8px;top:-10px;z-index:2;width:24px;height:31px;pointer-events:none;
  background:url("data:image/svg+xml,${PAROL_GOLD}") center/contain no-repeat;
  transform-origin:50% 0;animation:xm-sway 4s ease-in-out infinite alternate}

/* login: warm tint over the school photo + Filipino greeting */
html.xmas .auth1{background:
  linear-gradient(rgba(255,255,255,.55),rgba(255,255,255,.55)),
  radial-gradient(circle at 12% 8%,rgba(198,40,40,.16),transparent 42%),
  radial-gradient(circle at 88% 92%,rgba(249,168,37,.22),transparent 44%),
  url("login-bg.jpg") center bottom/cover no-repeat fixed,var(--bg)}
html.xmas .authw::before{content:"Maligayang Pasko from TTVHS \\1F31F";display:block;margin-bottom:8px;text-align:center;font-weight:700;color:var(--pri)}
html.xmas .acard::before{background:repeating-linear-gradient(90deg,#c62828 0 20px,#f9a825 20px 40px,#2e7d32 40px 60px,#1565c0 60px 80px)}

/* two parols hang from the bunting and sway gently */
html.xmas::before,html.xmas::after{content:"";position:fixed;top:14px;z-index:55;pointer-events:none;
  transform-origin:50% 0;animation:xm-sway 4s ease-in-out infinite alternate;
  filter:drop-shadow(0 0 8px rgba(249,168,37,.55)) drop-shadow(0 3px 3px rgba(0,0,0,.18))}
html.xmas::before{right:210px;width:44px;height:58px;background:url("data:image/svg+xml,${PAROL_RED}") center/contain no-repeat}
html.xmas::after{right:150px;width:36px;height:48px;animation-delay:-1.8s;background:url("data:image/svg+xml,${PAROL_GOLD}") center/contain no-repeat}
@keyframes xm-sway{0%{transform:rotate(-7deg)}100%{transform:rotate(7deg)}}
@media(max-width:900px){html.xmas::before{right:92px;width:34px;height:45px}html.xmas::after{display:none}}

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
