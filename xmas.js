/**
 * xmas.js - optional Christmas theme for the whole portal (login, admin, teacher, student).
 *
 * - Turned on/off from the profile card (top-right avatar) or the Profile page.
 * - The choice is remembered on this device, so the login page shows it too.
 * - Only colours + decoration change: the 60-30-10 layout stays the same
 *   (60% warm snow background, 30% white cards/sidebar, 10% Christmas red accent).
 * - Snow and garland are hidden while a test is running and when printing.
 */
const KEY = "ttvhs-xmas";
const ROOT = document.documentElement;

export const isXmas = () => { try { return localStorage.getItem(KEY) === "1"; } catch { return false; } };

export function setXmas(on) {
    try { localStorage.setItem(KEY, on ? "1" : "0"); } catch { /* private mode: still works for this visit */ }
    ROOT.classList.toggle("xmas", !!on);
}

/* faint snowflakes + berries tile for the page background */
const TILE = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160">
<g stroke="#c8d3e4" stroke-width="1.4" stroke-linecap="round" fill="none">
<path d="M26 14v24M14 26h24M17.5 17.5l17 17M34.5 17.5l-17 17"/>
<path d="M112 96v18M103 105h18M105.6 98.6l12.8 12.8M118.4 98.6l-12.8 12.8"/>
</g>
<circle cx="118" cy="30" r="3.2" fill="#e8b4b4"/><circle cx="124" cy="34" r="3.2" fill="#e8b4b4"/>
<path d="M112 30c4-8 10-8 12-2" stroke="#b9d3bd" stroke-width="2" fill="none" stroke-linecap="round"/>
<circle cx="40" cy="118" r="2.6" fill="#b9d3bd"/><circle cx="46" cy="122" r="2.6" fill="#e8b4b4"/>
</svg>`);

/* little Santa hat for the school logo */
const HAT = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 32"><path d="M4 26C6 10 16 2 30 4c-6 4-8 10-8 16z" fill="#c62828"/><path d="M2 24c6 4 22 6 34 0l1 6C26 34 10 33 1 30z" fill="#fff" stroke="#e5e7eb"/><circle cx="31" cy="5" r="4.2" fill="#fff" stroke="#e5e7eb"/></svg>`);

const CSS = `
/* ---------- always available: the on/off switch row ---------- */
.pp-xm{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:10px 0 0;padding:8px 10px;border:1px solid var(--line);border-radius:10px;background:var(--card);font-size:14px;font-weight:600;cursor:pointer}
.pp-xm input[type=checkbox]{appearance:none;-webkit-appearance:none;flex:none;position:relative;width:38px;height:22px;min-height:0;margin:0;padding:0;border:0;border-radius:99px;background:#cbd5e1;cursor:pointer;transition:background .15s}
.pp-xm input[type=checkbox]::after{content:"";position:absolute;top:2px;left:2px;width:18px;height:18px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform .15s}
.pp-xm input[type=checkbox]:checked{background:var(--pri)}
.pp-xm input[type=checkbox]:checked::after{transform:translateX(16px)}

/* ---------- Christmas theme ---------- */
html.xmas{
  --pri:#c62828;--pri2:#a61e1e;--soft:#fdecec;
  --bg:#f5f2ec;
  background:var(--bg) url("data:image/svg+xml,${TILE}") fixed;
}
html.xmas body{background:transparent}
html.xmas .main-col{background:transparent}

/* garland along the top edge */
html.xmas body::before{content:"";position:fixed;top:0;left:0;right:0;height:5px;z-index:60;pointer-events:none;
  background:repeating-linear-gradient(90deg,#c62828 0 20px,#2e7d32 20px 40px,#f9a825 40px 46px,#2e7d32 46px 66px)}

/* falling snow (three layers, seamless loop) */
html.xmas body::after{content:"";position:fixed;inset:0;z-index:50;pointer-events:none;
  background-image:
    radial-gradient(3.5px 3.5px at 24px 36px,#e4ecf9 55%,rgba(255,255,255,.55) 80%,transparent),
    radial-gradient(2.5px 2.5px at 140px 90px,#e4ecf9 55%,rgba(255,255,255,.55) 80%,transparent),
    radial-gradient(3px 3px at 60px 150px,#e4ecf9 55%,rgba(255,255,255,.55) 80%,transparent),
    radial-gradient(2.5px 2.5px at 230px 40px,#e4ecf9 55%,rgba(255,255,255,.55) 80%,transparent);
  background-size:200px 200px,300px 300px,250px 250px,320px 320px;
  animation:xm-snow 16s linear infinite}
@keyframes xm-snow{to{background-position:30px 600px,-60px 600px,20px 500px,-40px 640px}}

/* sidebar logo wears a Santa hat; footer + active item pick up the red accent automatically */
html.xmas .side .brand{position:relative}
html.xmas .side .brand::before{content:"";position:absolute;left:7px;top:-8px;z-index:2;width:34px;height:27px;transform:rotate(-16deg);pointer-events:none;
  background:url("data:image/svg+xml,${HAT}") center/contain no-repeat}

/* login: warm tint over the school photo + greeting */
html.xmas .auth1{background:
  linear-gradient(rgba(255,255,255,.55),rgba(255,255,255,.55)),
  radial-gradient(circle at 12% 8%,rgba(198,40,40,.16),transparent 42%),
  radial-gradient(circle at 88% 92%,rgba(46,125,50,.18),transparent 44%),
  url("login-bg.jpg") center bottom/cover no-repeat fixed,var(--bg)}
html.xmas .authw::before{content:"Merry Christmas from TTVHS \\1F384";display:block;margin-bottom:8px;text-align:center;font-weight:700;color:var(--pri)}
html.xmas .acard::before{background:repeating-linear-gradient(90deg,#c62828 0 20px,#2e7d32 20px 40px)}

/* never distract during a test, and keep prints clean */
html.xmas body.testing::after,html.xmas body.testing::before{display:none}
@media print{html.xmas body::after,html.xmas body::before{display:none}html.xmas{background:#fff}}
@media (prefers-reduced-motion:reduce){html.xmas body::after{display:none}}
`;

const style = document.createElement("style");
style.id = "xmas-theme";
style.textContent = CSS;
document.head.append(style);

/* apply immediately so the login page already shows it */
ROOT.classList.toggle("xmas", isXmas());
