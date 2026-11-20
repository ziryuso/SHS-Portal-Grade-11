/**
 * teacher-theme.js
 *
 * Minimalist, compact look for the teacher area. Everything is scoped to
 * `body.is-teacher` (set by teacher.js), so student pages are never affected.
 *
 *   1. Surface + colour tokens      4. Compact page header, cards, tables
 *   2. Navigation (one accent/tab)  5. Stat cards
 *   3. In-page tabs                 6. Mobile
 */
const STYLE_ID = "teacher-theme";

/** Accent colour per navigation tab, so each section has its own identity. */
const NAV_ACCENTS = {
    home: "#60a5fa",          // Dashboard
    classes: "#2dd4bf",       // My Classes
    grades: "#a78bfa",        // Term Grades
    advisory: "#fbbf24",      // Advisory
    announcements: "#fb7185", // News
};

const navAccentCss = Object.entries(NAV_ACCENTS)
    .map(([key, color]) => `body.is-teacher :is(.side,.bottom) a[href^="#/${key}"]{--tab:${color}}`)
    .join("\n");

const CSS = `
/* ---------- 1. surface + tokens ---------- */
html:has(body.is-teacher){background:#f3f6fb}
body.is-teacher{
  --bg:#f3f6fb;--soft:#e8f0ff;--line:#e2e8f2;--th-bg:#eef2fa;--row-hover:#f5f8ff;
  --sh:0 1px 2px rgba(16,24,40,.05);
  background:linear-gradient(180deg,#f3f6fb 0%,#eef2f9 55%,#f5f2fb 100%) fixed;
}
body.is-teacher .main-col{background:transparent}
body.is-teacher .top{background:rgba(255,255,255,.9)}

/* ---------- 2. navigation: one accent per tab ---------- */
${navAccentCss}
body.is-teacher .side a{--tab:#93c5fd;padding:8px 11px;gap:10px;font-size:14px;border-radius:8px;border-left:3px solid transparent}
body.is-teacher .side a .ic{color:var(--tab);opacity:.85}
body.is-teacher .side a.on{background:color-mix(in srgb,var(--tab) 20%,transparent);border-left-color:var(--tab);color:#fff}
body.is-teacher .side a.on .ic{opacity:1}
body.is-teacher .bottom a{--tab:var(--pri)}
body.is-teacher .bottom a.on{background:color-mix(in srgb,var(--tab) 12%,#fff);border-top-color:var(--tab);color:var(--tab)}

/* ---------- 3. in-page tabs: segmented control, own colour per tab ---------- */
body.is-teacher .tabs{display:flex;gap:3px;padding:3px;margin:6px 0 10px;border:0;border-radius:10px;background:#e6ecf6;overflow-x:auto;scrollbar-width:none}
body.is-teacher .tabs>a,body.is-teacher .tabs>.seg{flex:1 0 auto;padding:6px 12px;border:0;border-radius:8px;background:transparent;color:var(--mut);font-size:13.5px;font-weight:600;text-align:center}
body.is-teacher .tabs>a:hover,body.is-teacher .tabs>.seg:hover{color:var(--ink)}
body.is-teacher .tabs>a.on,body.is-teacher .tabs>.seg.on{background:#fff;color:var(--tab,var(--pri));box-shadow:0 1px 3px rgba(16,24,40,.14)}
body.is-teacher .tabs>:nth-child(1){--tab:#1d4ed8}
body.is-teacher .tabs>:nth-child(2){--tab:#0f766e}
body.is-teacher .tabs>:nth-child(3){--tab:#6d28d9}
body.is-teacher .tabs>:nth-child(4){--tab:#b45309}
body.is-teacher .tabs>:nth-child(5){--tab:#be185d}
body.is-teacher .tabs>:nth-child(6){--tab:#0369a1}
body.is-teacher .segs{gap:4px;margin-bottom:8px}
body.is-teacher .seg{padding:5px 12px;font-size:13px}

/* ---------- 4. compact, narrower centre ---------- */
body.is-teacher #main{max-width:1000px;padding:10px clamp(10px,2vw,22px) 80px}
body.is-teacher #main:has(.ed){max-width:1180px}
body.is-teacher #main:has(table.nw){max-width:1280px}
body.is-teacher .ph{margin-bottom:8px;gap:8px}
body.is-teacher .ph h1{font-size:1.25rem}
body.is-teacher h2{margin:10px 0 6px;font-size:1rem}
body.is-teacher h3{font-size:.98rem}
body.is-teacher .card{padding:10px 12px;border-radius:12px;box-shadow:var(--sh)}
body.is-teacher .row{gap:6px}
body.is-teacher .btn{border-radius:8px}
body.is-teacher .btn.sm{min-height:26px}
body.is-teacher th,body.is-teacher td{padding:7px 10px}
body.is-teacher th{font-size:11.5px;letter-spacing:.04em;text-transform:uppercase;color:#5b6b8f}
body.is-teacher tbody tr:hover{background:var(--row-hover)}
body.is-teacher .tw{border-radius:12px}

/* ---------- 4b. My Classes cards + topic accordions ---------- */
body.is-teacher .cards{grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:10px}
body.is-teacher .cards>.subj{border-top:3px solid var(--pri);transition:box-shadow .15s,transform .15s}
body.is-teacher .cards>.subj:hover{box-shadow:0 4px 14px rgba(16,24,40,.1);transform:translateY(-1px)}
body.is-teacher .cards>.subj:nth-child(4n+2){border-top-color:var(--tea)}
body.is-teacher .cards>.subj:nth-child(4n+3){border-top-color:var(--vio)}
body.is-teacher .cards>.subj:nth-child(4n+4){border-top-color:#d97706}
body.is-teacher .tpc.open{border-color:color-mix(in srgb,var(--pri) 35%,var(--line))}
body.is-teacher .tpc .tn{font-weight:700}
body.is-teacher .item{padding:7px 0}

/* ---------- 5. stat cards: flat, one accent edge each ---------- */
body.is-teacher .stats4>.card{background:#fff;border:1px solid var(--line);border-left:3px solid var(--pri)}
body.is-teacher .stats4>.card:nth-child(2){border-left-color:var(--ok)}
body.is-teacher .stats4>.card:nth-child(3){border-left-color:var(--tea)}
body.is-teacher .stats4>.card:nth-child(4){border-left-color:var(--vio)}

/* ---------- 6. mobile ---------- */
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
