/**
 * xmas.js - optional Philippine Christmas theme for the whole portal (login, admin, teacher, student).
 *
 * - Turned on/off from the profile card (top-right avatar) or the Profile page.
 * - The choice is remembered on this device, so the login page shows it too.
 * - Only colours + decoration change: the 60-30-10 layout stays the same
 *   (60% warm cream background, 30% white cards/sidebar, 10% parol red accent).
 * - Decorations: swaying parol (star lanterns), twinkling "Christmas lights" string,
 *   golden sparkles, a mini parol on the school logo and a "Maligayang Pasko" greeting on login.
 * - Everything decorative is hidden while a test is running and when printing.
 */
const KEY = "ttvhs-xmas";
const ROOT = document.documentElement;

export const isXmas = () => { try { return localStorage.getItem(KEY) === "1"; } catch { return false; } };

export function setXmas(on) {
    try { localStorage.setItem(KEY, on ? "1" : "0"); } catch { /* private mode: still works for this visit */ }
    ROOT.classList.toggle("xmas", !!on);
}

/* A parol: 5-point star lantern with an inner glowing star and tassels. c1 = outer colour, c2 = inner glow colour */
const parol = (c1, c2, c3) => encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 160">
<path d="M50 0V26" stroke="#8d6e63" stroke-width="2"/>
<g stroke="${c3}" stroke-width="3" stroke-linecap="round" fill="none">
<path d="M75.9 105.6L84 148M24.1 105.6L16 148M50 89V152"/>
</g>
<g fill="${c3}"><circle cx="84" cy="150" r="4"/><circle cx="16" cy="150" r="4"/><circle cx="50" cy="154" r="4.5"/></g>
<polygon points="50,26 61.2,54.6 91.8,56.4 68.1,75.9 75.9,105.6 50,89 24.1,105.6 31.9,75.9 8.2,56.4 38.8,54.6" fill="${c1}" stroke="${c3}" stroke-width="3" stroke-linejoin="round"/>
<polygon points="50,26 61.2,54.6 91.8,56.4 68.1,75.9 75.9,105.6 50,89 24.1,105.6 31.9,75.9 8.2,56.4 38.8,54.6" fill="${c2}" transform="translate(50 70) scale(.55) translate(-50 -70)"/>
<circle cx="50" cy="70" r="7" fill="#fff" opacity=".85"/>
<circle cx="50" cy="22" r="4" fill="${c3}"/>
</svg>`);

const PAROL_RED = parol("#e53935", "#ffd54f", "#f9a825");
const PAROL_BLUE = parol("#1e66c9", "#ffee58", "#f9a825");
const PAROL_GOLD = parol("#f9a825", "#fff59d", "#c62828");

/* faint capiz-diamond + star tile for the page background */
const TILE = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160">
<g fill="none" stroke="#e6d3a3" stroke-width="1.4" stroke-linejoin="round">
<path d="M40 14l26 26-26 26-26-26z"/><path d="M120 94l26 26-26 26-26-26z"/>
</g>
<polygon points="124,18 127,27 136,27 129,32 132,41 124,36 116,41 119,32 112,27 121,27" fill="#f3dc9a"/>
<polygon points="40,104 42,110 48,110 43,114 45,120 40,116 35,120 37,114 32,110 38,110" fill="#f3dc9a"/>
<circle cx="80" cy="80" r="2" fill="#efc7c7"/><circle cx="12" cy="150" r="2" fill="#bcd6c0"/><circle cx="150" cy="10" r="2" fill="#bcd6c0"/>
</svg>`);

/* string of colourful Christmas lights (bumbilya) */
const LIGHTS = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="18" viewBox="0 0 96 18">
<path d="M0 3Q12 9 24 3T48 3T72 3T96 3" stroke="#355e3b" stroke-width="1.6" fill="none"/>
<g>
<ellipse cx="12" cy="9.5" rx="3.4" ry="4.6" fill="#e53935"/>
<ellipse cx="36" cy="9.5" rx="3.4" ry="4.6" fill="#fbc02d"/>
<ellipse cx="60" cy="9.5" rx="3.4" ry="4.6" fill="#43a047"/>
<ellipse cx="84" cy="9.5" rx="3.4" ry="4.6" fill="#1e88e5"/>
</g>
<g fill="#5d4037"><rect x="10" y="4" width="4" height="2.5" rx="1"/><rect x="34" y="4" width="4" height="2.5" rx="1"/><rect x="58" y="4" width="4" height="2.5" rx="1"/><rect x="82" y="4" width="4" height="2.5" rx="1"/></g>
</svg>`);

const CSS = `
/* ---------- always available: the on/off switch row ---------- */
.pp-xm{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:10px 0 0;padding:8px 10px;border:1px solid var(--line);border-radius:10px;background:var(--card);font-size:14px;font-weight:600;cursor:pointer}
.pp-xm input[type=checkbox]{appearance:none;-webkit-appearance:none;flex:none;position:relative;width:38px;height:22px;min-height:0;margin:0;padding:0;border:0;border-radius:99px;background:#cbd5e1;cursor:pointer;transition:background .15s}
.pp-xm input[type=checkbox]::after{content:"";position:absolute;top:2px;left:2px;width:18px;height:18px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .15s}
.pp-xm input[type=checkbox]:checked{background:var(--pri)}
.pp-xm input[type=checkbox]:checked::after{transform:translateX(16px)}

/* ---------- Philippine Christmas theme ---------- */
html.xmas{
  --pri:#c62828;--pri2:#a61e1e;--soft:#fdecec;
  --bg:#fbf5e6;
  background:var(--bg) url("data:image/svg+xml,${TILE}") fixed;
}
html.xmas body{background:transparent}
html.xmas .main-col{background:transparent}

/* twinkling string of lights along the top edge */
html.xmas body::before{content:"";position:fixed;top:0;left:0;right:0;height:18px;z-index:60;pointer-events:none;
  background:url("data:image/svg+xml,${LIGHTS}") repeat-x left top/96px 18px;
  animation:xm-twinkle 1.6s ease-in-out infinite alternate}
@keyframes xm-twinkle{from{opacity:.62;filter:saturate(.8)}to{opacity:1;filter:saturate(1.3) drop-shadow(0 0 3px rgba(255,214,79,.9))}}

/* golden sparkles (no snow in the Philippines!) */
html.xmas body::after{content:"";position:fixed;inset:0;z-index:50;pointer-events:none;
  background-image:
    radial-gradient(3px 3px at 30px 40px,#ffd54f 45%,rgba(255,213,79,.4) 75%,transparent),
    radial-gradient(2.2px 2.2px at 150px 110px,#ffe082 45%,rgba(255,224,130,.4) 75%,transparent),
    radial-gradient(2.6px 2.6px at 70px 170px,#ffca28 45%,rgba(255,202,40,.4) 75%,transparent),
    radial-gradient(2px 2px at 240px 60px,#fff3b0 45%,rgba(255,243,176,.4) 75%,transparent);
  background-size:210px 210px,310px 310px,260px 260px,330px 330px;
  animation:xm-spark 3.2s ease-in-out infinite alternate}
@keyframes xm-spark{from{opacity:.25}to{opacity:.95}}

/* sidebar logo gets a little parol; footer + active item pick up the red accent automatically */
html.xmas .side .brand{position:relative}
html.xmas .side .brand::before{content:"";position:absolute;left:4px;top:-10px;z-index:2;width:22px;height:34px;pointer-events:none;
  transform-origin:50% 0;animation:xm-sway 3.4s ease-in-out infinite alternate;
  background:url("data:image/svg+xml,${PAROL_GOLD}") center/contain no-repeat}

/* login: warm tint over the school photo + Filipino greeting */
html.xmas .auth1{background:
  linear-gradient(rgba(255,251,240,.55),rgba(255,251,240,.55)),
  radial-gradient(circle at 12% 8%,rgba(198,40,40,.16),transparent 42%),
  radial-gradient(circle at 88% 92%,rgba(249,168,37,.2),transparent 44%),
  url("login-bg.jpg") center bottom/cover no-repeat fixed,var(--bg)}
html.xmas .authw::before{content:"Maligayang Pasko mula sa TTVHS \\1F31F";display:block;margin-bottom:8px;text-align:center;font-weight:700;color:var(--pri)}
html.xmas .acard::before{background:repeating-linear-gradient(90deg,#c62828 0 20px,#f9a825 20px 40px,#1e66c9 40px 60px)}

/* big swaying parol: red one (::after) and blue one (::before) hang from the lights */
html.xmas::after,html.xmas::before{content:"";position:fixed;top:10px;z-index:55;pointer-events:none;
  width:64px;height:102px;transform-origin:50% 0;
  filter:drop-shadow(0 4px 6px rgba(0,0,0,.2)) drop-shadow(0 0 8px rgba(255,214,79,.55))}
html.xmas::after{right:190px;background:url("data:image/svg+xml,${PAROL_RED}") center/contain no-repeat;animation:xm-sway 3s ease-in-out infinite alternate}
html.xmas::before{left:46%;background:url("data:image/svg+xml,${PAROL_BLUE}") center/contain no-repeat;animation:xm-sway 3.8s ease-in-out -1.2s infinite alternate}
@keyframes xm-sway{from{transform:rotate(-7deg)}to{transform:rotate(7deg)}}
@media(max-width:640px){
  html.xmas::after{width:44px;height:70px;right:84px;top:8px}
  html.xmas::before{display:none}
}

/* never distract during a test, and keep prints clean */
html.xmas body.testing::after,html.xmas body.testing::before,html.xmas:has(body.testing)::after,html.xmas:has(body.testing)::before{display:none}
@media print{html.xmas body::after,html.xmas body::before,html.xmas::after,html.xmas::before{display:none}html.xmas{background:#fff}}
@media (prefers-reduced-motion:reduce){
  html.xmas body::after,html.xmas body::before,html.xmas::after,html.xmas::before,html.xmas .side .brand::before{animation:none}
}
`;

const style = document.createElement("style");
style.id = "xmas-theme";
style.textContent = CSS;
document.head.append(style);

/* apply immediately so the login page already shows it */
ROOT.classList.toggle("xmas", isXmas());
