/**
 * xmas.js - optional Christmas theme for the whole portal (login, admin, teacher, student).
 *
 * - Turned on/off from the profile card (top-right avatar) or the Profile page.
 * - The choice is remembered on this device, so the login page shows it too.
 * - Only colours + decoration change: the 60-30-10 layout stays the same
 *   (60% warm snow background, 30% white cards/sidebar, 10% Christmas red accent).
 * - Santa's sleigh flies across the screen every so often.
 * - Snow, garland and Santa are hidden while a test is running and when printing.
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


/* Santa's sleigh with two reindeer, flying to the right */
const SANTA = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 110">
<defs><g id="r">
<path d="M52 62l6 20M46 64l-4 20M20 62l-8 18M14 60l-10 14" stroke="#6d4c2a" stroke-width="4" stroke-linecap="round"/>
<ellipse cx="32" cy="58" rx="25" ry="12" fill="#8b5a2b"/>
<path d="M54 52l12-10" stroke="#8b5a2b" stroke-width="9" stroke-linecap="round"/>
<circle cx="68" cy="40" r="9" fill="#8b5a2b"/><ellipse cx="76" cy="44" rx="6" ry="4.5" fill="#a9743b"/>
<circle cx="81" cy="43" r="3.4" fill="#e53935"/><circle cx="70" cy="37" r="1.5" fill="#222"/>
<path d="M64 32l-4-12M60 20l-5-3M60 20l1-7M70 31l3-12M73 19l5-3M73 19l-1-7" stroke="#5d4037" stroke-width="2.2" fill="none" stroke-linecap="round"/>
<path d="M8 54c-4 0-6 2-6 5" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/>
<path d="M48 50q8 4 14-2" stroke="#d4a017" stroke-width="2" fill="none"/>
</g></defs>
<path d="M110 66L150 62M190 62L214 60" stroke="#d4a017" stroke-width="1.6"/>
<use href="#r" x="118" y="2"/><use href="#r" x="186" y="-2"/>
<path d="M6 46c2 24 12 38 30 38h66c5 0 8-4 5-9l-7-24z" fill="#c62828"/>
<path d="M6 46c2 4 8 6 14 6" stroke="#8e1b1b" stroke-width="2" fill="none"/>
<path d="M4 94h98c10 0 16-6 13-15" stroke="#d4a017" stroke-width="4" fill="none" stroke-linecap="round"/>
<path d="M22 86v8M60 86v8M92 86v8" stroke="#d4a017" stroke-width="3"/>
<ellipse cx="22" cy="46" rx="14" ry="15" fill="#2e7d32"/><path d="M13 34l9-6 9 6z" fill="#1b5e20"/>
<rect x="68" y="44" width="16" height="14" fill="#f9a825"/><path d="M76 44v14M68 51h16" stroke="#c62828" stroke-width="2.5"/>
<path d="M44 66q2-26 17-26 15 0 17 26z" fill="#e53935"/><rect x="44" y="58" width="34" height="4" fill="#fff"/>
<circle cx="61" cy="32" r="9" fill="#f5cba7"/><ellipse cx="61" cy="40" rx="9" ry="7" fill="#fff"/>
<circle cx="64" cy="31" r="1.4" fill="#222"/>
<path d="M51 28q8-24 26-10-10 0-14 10z" fill="#e53935"/><rect x="51" y="25" width="19" height="4" rx="2" fill="#fff"/><circle cx="78" cy="17" r="4.5" fill="#fff"/>
</svg>`);

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


/* Santa flies across the top of the page now and then (a few seconds after loading, then every 45s) */
html.xmas::after{content:"";position:fixed;top:6px;left:0;width:150px;height:55px;z-index:55;pointer-events:none;
  background:url("data:image/svg+xml,${SANTA}") center/contain no-repeat;
  filter:drop-shadow(0 3px 3px rgba(0,0,0,.18));
  transform:translateX(-230px);
  animation:xm-santa 45s linear 3s infinite}
@keyframes xm-santa{
  0%{transform:translate(-230px,10px) rotate(2deg)}
  6%{transform:translate(18vw,-6px) rotate(-3deg)}
  12%{transform:translate(36vw,16px) rotate(3deg)}
  18%{transform:translate(54vw,-8px) rotate(-3deg)}
  24%{transform:translate(72vw,14px) rotate(3deg)}
  30%,100%{transform:translate(calc(100vw + 230px),0) rotate(0deg)}
}
@media(max-width:640px){html.xmas::after{width:110px;height:40px;top:8px}}

/* never distract during a test, and keep prints clean */
html.xmas body.testing::after,html.xmas body.testing::before,html.xmas:has(body.testing)::after{display:none}
@media print{html.xmas body::after,html.xmas body::before,html.xmas::after{display:none}html.xmas{background:#fff}}
@media (prefers-reduced-motion:reduce){html.xmas body::after,html.xmas::after{display:none}}
`;

const style = document.createElement("style");
style.id = "xmas-theme";
style.textContent = CSS;
document.head.append(style);

/* apply immediately so the login page already shows it */
ROOT.classList.toggle("xmas", isXmas());
