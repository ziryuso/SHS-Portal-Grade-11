/**
 * teacher-theme.js
 *
 * Compact layout for the teacher area. Colours now come from the shared
 * 60-30-10 tokens in style.css, so this file only adjusts spacing and sizing:
 *   60%  background            --bg
 *   30%  cards, sidebar, top   --card
 *   10%  accent                --pri
 * Everything is scoped to `body.is-teacher` (set by teacher.js), so student
 * pages are never affected.
 */
const STYLE_ID = "teacher-theme";

const CSS = `
/* ---------- 1. navigation: neutral icons, accent only on the active tab ---------- */
body.is-teacher .main-col{background:transparent}
body.is-teacher .side a{padding:8px 11px;gap:10px;font-size:14px;border-radius:8px;border-left:3px solid transparent}
body.is-teacher .side a .ic{opacity:.8}
body.is-teacher .side a.on{border-left-color:var(--pri)}
body.is-teacher .side a.on .ic{opacity:1}

/* ---------- 2. in-page tabs: segmented control, accent on the active tab ---------- */
body.is-teacher .tabs{display:flex;gap:3px;padding:3px;margin:6px 0 10px;border:0;border-radius:10px;background:var(--line);overflow-x:auto;scrollbar-width:none}
body.is-teacher .tabs>a,body.is-teacher .tabs>.seg{flex:1 0 auto;padding:6px 12px;border:0;border-radius:8px;background:transparent;color:var(--mut);font-size:13.5px;font-weight:600;text-align:center}
body.is-teacher .tabs>a:hover,body.is-teacher .tabs>.seg:hover{color:var(--ink)}
body.is-teacher .tabs>a.on,body.is-teacher .tabs>.seg.on{background:var(--card);color:var(--pri);box-shadow:0 1px 3px rgba(16,24,40,.14)}
body.is-teacher .segs{gap:4px;margin-bottom:8px}
body.is-teacher .seg{padding:5px 12px;font-size:13px}

/* ---------- 3. compact, narrower centre ---------- */
body.is-teacher #main{max-width:1000px;padding:10px clamp(10px,2vw,22px) 80px}
body.is-teacher #main:has(.ed){max-width:1180px}
body.is-teacher #main:has(table.nw){max-width:1280px}
body.is-teacher .ph{margin-bottom:8px;gap:8px}
body.is-teacher .ph h1{font-size:1.25rem}
body.is-teacher h2{margin:10px 0 6px;font-size:1rem}
body.is-teacher h3{font-size:.98rem}
body.is-teacher .card{padding:10px 12px;border-radius:12px}
body.is-teacher .row{gap:6px}
body.is-teacher .btn{border-radius:8px}
body.is-teacher .btn.sm{min-height:26px}
body.is-teacher th,body.is-teacher td{padding:7px 10px}
body.is-teacher th{font-size:11.5px;letter-spacing:.04em;text-transform:uppercase;color:var(--mut)}
body.is-teacher tbody tr:hover{background:var(--row-hover)}
body.is-teacher .tw{border-radius:12px}

/* ---------- 4. My Classes cards + topic accordions (one accent edge) ---------- */
body.is-teacher .cards{grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px}
body.is-teacher .cards>.subj{border-top:3px solid var(--pri);transition:box-shadow .15s,transform .15s}
body.is-teacher .cards>.subj:hover{box-shadow:0 4px 14px rgba(16,24,40,.1);transform:translateY(-1px)}
body.is-teacher .tpc.open{border-color:color-mix(in srgb,var(--pri) 35%,var(--line))}
body.is-teacher .tpc .tn{font-weight:700}
body.is-teacher .item{padding:7px 0}

/* ---------- 5. mobile ---------- */
@media(max-width:640px){
  body.is-teacher #main{padding:8px 10px 84px}
  body.is-teacher .card{padding:9px 10px}
}
`;

export function injectTeacherTheme() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = CSS;
    document.head.append(style);
}

injectTeacherTheme();
