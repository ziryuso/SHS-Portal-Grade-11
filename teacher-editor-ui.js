/**
 * teacher-editor-ui.js
 *
 * Look and feel of the activity editor:
 *   1. Test kinds and parts (data/config)
 *   2. Editor styles (injected once)
 *   3. Test document renderer (live preview + printable PDF copy)
 */
import { esc } from "./core.js";

/* ==========================================================================
 * 1. Test kinds and parts
 * ======================================================================== */

export const TYPE_LABEL = Object.freeze({
    mc: "Multiple choice",
    tf: "True / False",
    id: "Identification",
    sa: "Essay (auto-graded)",
    es: "Essay (manual grade)",
    mt: "Matching",
});

export const PARTS = Object.freeze({
    mc: { label: "Multiple choice", types: ["mc", "tf"], dir: "Choose the letter of the correct answer." },
    id: { label: "Identification", types: ["id"], dir: "Write the correct answer on the blank." },
    es: { label: "Essay", types: ["es", "sa"], dir: "Answer in complete sentences." },
    mt: { label: "Matching", types: ["mt"], dir: "Match each item in Column A with its answer in Column B." },
});

export const PART_ORDER = Object.freeze(["mc", "id", "es", "mt"]);
export const ROMAN = Object.freeze(["I", "II", "III", "IV", "V"]);

export const KINDS = Object.freeze({
    mc: { label: "Multiple choice", desc: "Auto-graded. Options with one correct answer.", parts: ["mc"], icon: "check" },
    id: { label: "Identification", desc: "Auto-graded. Students type the answer.", parts: ["id"], icon: "list" },
    es: { label: "Essay", desc: "Grade by hand, or auto-grade by accepted answers.", parts: ["es"], icon: "file" },
    mixed: { label: "Mixed (by parts)", desc: "Part I, II, III… combine several kinds in one test.", parts: [...PART_ORDER], icon: "grid" },
});

/** Part key a question type belongs to (falls back to multiple choice). */
export const partOf = type => PART_ORDER.find(key => PARTS[key].types.includes(type)) ?? "mc";

/** Position of a question type's part in the test (used for sorting). */
export const partRank = type => PART_ORDER.indexOf(partOf(type));

/* ==========================================================================
 * 2. Styles (injected once)
 * ======================================================================== */

const STYLE_ID = "ed-css";

const CSS_LAYOUT = `
.ed{display:grid;gap:8px;grid-template-columns:minmax(0,1fr);padding:8px;border-radius:14px;background:linear-gradient(180deg,color-mix(in srgb,var(--pri) 6%,#fff),color-mix(in srgb,var(--vio) 5%,#fff))}
@media(min-width:1100px){
  .ed{grid-template-columns:minmax(0,1fr) 380px;align-items:start}
  .ed.pvc{grid-template-columns:minmax(0,1fr) 170px}
}
.ed-main{display:grid;gap:8px;min-width:0}
.ed-card{border:1px solid var(--line);border-radius:var(--r);padding:8px 12px;background:var(--card);box-shadow:0 1px 2px rgba(16,24,40,.04)}
.ed-card>h3{margin:0 0 4px;font-size:14px;display:flex;align-items:center;gap:8px}
.ed-card>h3 .step{flex:none;width:22px;height:22px;border-radius:50%;display:grid;place-items:center;font-size:12px;color:#fff;background:var(--pri)}
.ed-card>h3 .sp{flex:1}
.ed .hint{margin:1px 0}
`;

const CSS_CARD_THEMES = `
.t-setup{background:color-mix(in srgb,var(--pri) 5%,#fff);border-color:color-mix(in srgb,var(--pri) 20%,var(--line))}
.t-build{background:color-mix(in srgb,var(--tea) 7%,#fff);border-color:color-mix(in srgb,var(--tea) 35%,var(--line));box-shadow:0 0 0 3px color-mix(in srgb,var(--tea) 12%,transparent)}
.t-build>h3{color:var(--tea)}
.t-build>h3 .step{background:var(--tea)}
.t-items{background:#fbfcfe;border-left:4px solid var(--vio)}
.t-items>h3{color:var(--vio)}
.t-items>h3 .step{background:var(--vio)}
.t-fin{background:color-mix(in srgb,var(--warn) 6%,#fff);border-color:color-mix(in srgb,var(--warn) 25%,var(--line))}
.t-fin>h3 .step{background:var(--warn)}
`;

const CSS_FORM = `
.ed label.f{margin:5px 0 2px;font-size:12px;color:var(--mut)}
.ed label.f.inline{color:var(--ink);font-size:13px;margin:4px 0}
.ed input,.ed select,.ed textarea{min-height:32px;padding:4px 8px}
.ed textarea{min-height:52px}
.egrid{display:grid;gap:6px 10px;grid-template-columns:repeat(auto-fit,minmax(min(100%,140px),1fr))}
.egrid .full{grid-column:1/-1}
.eflags{display:flex;flex-wrap:wrap;gap:4px 18px;margin-top:4px}
.ed details.more{margin-top:6px}
.ed details.more summary{cursor:pointer;font-size:12px;color:var(--pri);font-weight:600}
.etop{display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:12px;color:var(--mut)}
.etop .ok{color:var(--ok);font-weight:600}
.orow{display:flex;align-items:center;gap:6px;margin:3px 0}
.orow input[type=radio]{accent-color:var(--ok);width:18px;height:18px;flex:none}
.orow input[type=text]{flex:1;min-width:0}
.ed .fbar{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:8px}
.efoot{display:flex;flex-wrap:wrap;gap:8px 10px;align-items:center;margin-top:8px}
.efoot .sp{flex:1}
`;

const CSS_KIND_PICKER = `
.kinds{display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(min(100%,170px),1fr))}
.kind{text-align:left;border:1px solid var(--line);background:#fff;border-radius:var(--r);padding:12px;cursor:pointer;font:inherit;color:inherit;display:grid;gap:3px}
.kind:hover{border-color:var(--tea);background:color-mix(in srgb,var(--tea) 6%,#fff)}
.kind .ic{width:20px;height:20px;color:var(--tea)}
.kind b{font-size:14px}
.kind span{font-size:12px;color:var(--mut)}
`;

const CSS_TABS_AND_LIST = `
.ptabs{display:flex;flex-wrap:wrap;gap:6px;margin:2px 0 8px}
.pt{border:1px solid var(--line);background:#fff;border-radius:99px;padding:5px 11px;font:inherit;font-size:13px;cursor:pointer;color:var(--ink)}
.pt.on{background:var(--tea);border-color:var(--tea);color:#fff}
.pt .n{display:inline-block;min-width:18px;margin-left:5px;padding:0 5px;border-radius:99px;background:rgba(0,0,0,.08);font-size:11px;text-align:center}
.sub{display:inline-flex;gap:0;margin:0 0 6px;border:1px solid var(--line);border-radius:8px;overflow:hidden}
.sub button{border:0;background:#fff;padding:5px 11px;font:inherit;font-size:12px;cursor:pointer;color:var(--mut)}
.sub button.on{background:var(--soft);color:var(--pri);font-weight:700}
.ph2{margin:10px 0 4px;font-size:12px;font-weight:700;color:var(--vio);text-transform:uppercase;letter-spacing:.03em}
.qi{display:grid;grid-template-columns:26px minmax(0,1fr) auto;gap:6px;align-items:center;padding:3px 6px;margin:2px 0;border:1px solid var(--line);border-radius:8px;background:#fff}
.qi.sel{border-color:var(--tea);box-shadow:0 0 0 2px color-mix(in srgb,var(--tea) 18%,transparent)}
.qi .nm{font-weight:700;color:var(--pri);text-align:center}
.qi .tx{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px}
.qi .tx small{color:var(--mut);margin-left:6px}
.qi .ac{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:0}
`;

const CSS_ICON_BUTTONS = `
.ib{width:30px;height:30px;display:inline-grid;place-items:center;border-radius:8px;border:1px solid transparent;background:transparent;color:var(--mut);cursor:pointer;padding:0}
.ib:hover:not(:disabled){background:var(--soft);color:var(--pri)}
.ib:disabled{opacity:.35;cursor:default}
.ib .ic{width:16px;height:16px}
.ib.eye{color:var(--pri)}
.ib.del:hover{background:var(--badb);color:var(--bad)}
`;

const CSS_PREVIEW_PANEL = `
.pv{border:1px solid color-mix(in srgb,var(--vio) 28%,var(--line));background:color-mix(in srgb,var(--vio) 4%,#fff);border-radius:var(--r);overflow:hidden}
@media(min-width:1100px){.pv{position:sticky;top:calc(var(--top-h,56px) + 10px)}}
.pv-head{width:100%;display:flex;align-items:center;gap:8px;padding:10px 12px;border:0;background:color-mix(in srgb,var(--vio) 10%,#fff);color:var(--vio);font:inherit;font-weight:700;cursor:pointer;text-align:left}
.pv-head .ic{width:16px;height:16px}
.pv-head .sp{flex:1}
.pv-head small{font-weight:500;color:var(--mut)}
.pv-tools{display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:7px 12px;border-bottom:1px solid var(--line);font-size:12px}
.pv-tools label{display:flex;align-items:center;gap:5px;cursor:pointer}
.pv-scroll{max-height:calc(100vh - var(--top-h,56px) - 150px);overflow:auto;padding:12px 14px;background:#fff;overscroll-behavior:contain}
.pv.closed .pv-body{display:none}
.pv-fab,.pv-back{display:none}
@media(max-width:1099px){
  .pv{position:fixed;left:0;right:0;bottom:0;z-index:70;border-radius:16px 16px 0 0;transform:translateY(110%);transition:transform .22s ease;box-shadow:0 -8px 30px rgba(16,24,40,.2);max-height:88vh;display:flex;flex-direction:column}
  .pv.open{transform:none}
  .pv.closed .pv-body{display:flex}
  .pv-body{flex-direction:column;min-height:0;flex:1}
  .pv-scroll{max-height:none;flex:1}
  .pv-back{position:fixed;inset:0;z-index:65;background:rgba(15,27,61,.38)}
  .pv-back.on{display:block}
  .pv-fab{display:inline-flex;align-items:center;gap:6px;position:fixed;right:14px;bottom:calc(70px + env(safe-area-inset-bottom));z-index:30;border:0;border-radius:99px;padding:10px 16px;background:var(--vio);color:#fff;font:inherit;font-weight:700;box-shadow:0 6px 18px rgba(109,40,217,.35);cursor:pointer}
  .pv-fab .ic{width:16px;height:16px}
  .pv.open~.pv-fab{display:none}
}
`;

const CSS_TEST_DOCUMENT = `
.td-h h2{margin:0 0 3px;font-size:18px}
.td-meta{color:var(--mut);font-size:12px}
.td-ins{font-size:13px;margin:6px 0;white-space:pre-wrap}
.td-sheet{display:flex;flex-wrap:wrap;gap:6px 16px;margin:10px 0 2px;font-size:13px}
.td-sheet span{flex:1 1 150px;border-bottom:1px solid #666;padding-bottom:2px}
.td-part{margin-top:14px}
.td-part h3{margin:0;display:flex;justify-content:space-between;gap:8px;font-size:13px;color:var(--vio);text-transform:uppercase;letter-spacing:.03em;border-bottom:2px solid var(--viob);padding-bottom:3px}
.td-part h3 span{font-weight:500;text-transform:none;color:var(--mut);letter-spacing:0}
.td-dir{margin:4px 0;font-size:12px;font-style:italic;color:var(--mut)}
.td-q{padding:7px 8px;margin:2px 0;border-radius:8px;border:1px solid transparent}
.pv .td-q{cursor:pointer}
.pv .td-q:hover{background:var(--soft);border-color:color-mix(in srgb,var(--pri) 25%,transparent)}
.td-q.flash{animation:tdflash 1.6s ease}
@keyframes tdflash{0%,65%{background:#fff0b8}100%{background:transparent}}
.td-qh em{font-size:11px;font-style:normal;color:var(--mut);margin-left:4px}
.td-o{list-style:upper-alpha;margin:4px 0 0 24px;padding:0;font-size:14px}
.td-o li.ok{color:var(--ok);font-weight:700}
.td-line{border-bottom:1px solid #888;min-height:20px;margin:6px 0 0 20px;max-width:75%;font-size:14px}
.td-line b{color:var(--ok)}
.td-lines{margin:4px 0 0 20px}
.td-lines i{display:block;border-bottom:1px solid #bbb;height:22px}
.td-key{margin:4px 0 0 20px;font-size:12px;color:var(--ok)}
.td-mt{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:4px 0 0 20px;font-size:14px}
.td-mt ol{margin:0;padding-left:18px}
.td-mt ol.l{list-style:decimal}
.td-mt ol.r{list-style:upper-alpha}
.td-img{display:block;max-width:100%;max-height:190px;margin:4px 0 0 20px}
`;

const CSS_PRINT = `
#print-root{display:none}
@media print{
  body.pp>*:not(#print-root){display:none!important}
  body.pp #print-root{display:block;color:#000;font-size:13px}
  body.pp .td-q{break-inside:avoid}
}
`;


const CSS_QUICKBAR = `
.ed-quick{position:sticky;top:calc(var(--top-h,56px) + 6px);z-index:20;display:flex;flex-wrap:wrap;align-items:center;gap:4px 12px;padding:6px 10px;border:1px solid color-mix(in srgb,var(--pri) 22%,var(--line));border-radius:10px;background:#fff;box-shadow:0 2px 8px rgba(16,24,40,.07)}
.ed-quick label{display:flex;align-items:center;gap:5px;font-size:12px;color:var(--mut)}
.ed-quick input,.ed-quick select{min-height:30px;width:auto;max-width:150px}
.ed-quick .sp{flex:1}
.save-ind{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--mut)}
.save-ind::before{content:"";width:8px;height:8px;border-radius:50%;background:var(--mut)}
.save-ind.saving::before{background:var(--warn)}
.save-ind.saved{color:var(--ok)}
.save-ind.saved::before{background:var(--ok)}
`;

const CSS_FINISH = `
.pdf-opt{display:flex;align-items:center;gap:8px;padding:7px 10px;border:1px dashed color-mix(in srgb,var(--warn) 45%,var(--line));border-radius:10px;background:#fff;font-size:13px;cursor:pointer}
.pdf-opt input{width:18px;height:18px;min-height:0;accent-color:var(--warn);flex:none}
.pdf-opt small{color:var(--mut)}
`;

const EDITOR_CSS = [
    CSS_LAYOUT,
    CSS_CARD_THEMES,
    CSS_FORM,
    CSS_KIND_PICKER,
    CSS_TABS_AND_LIST,
    CSS_ICON_BUTTONS,
    CSS_PREVIEW_PANEL,
    CSS_TEST_DOCUMENT,
    CSS_QUICKBAR,
    CSS_FINISH,
    CSS_PRINT,
].join("");

/** Injects the editor stylesheet once; safe to call repeatedly. */
export function injectEditorCss() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = EDITOR_CSS;
    document.head.append(style);
}

/* ==========================================================================
 * 3. Test document (live preview + print copy)
 * ======================================================================== */

/* ---------- small helpers ---------- */

/** Points for a question. Matching counts pairs (editor) or left items (published). */
export const qPts = q => (q.t === "mt" ? (q.pairs ?? q.l ?? []).length : 1) * (q.pts || 1);

const plural = (count, word) => `${count} ${word}${count === 1 ? "" : "s"}`;
const escapeWithBreaks = value => esc(value).replace(/\n/g, "<br>");
const sumPoints = questions => questions.reduce((sum, q) => sum + qPts(q), 0);
const letterFor = index => String.fromCharCode(65 + index);
const listItems = (items, render) => items.map(render).join("");

/* ---------- question body renderers (one per answer style) ---------- */

function renderOptions(q, showAnswers) {
    const items = listItems(q.o, option => {
        const isCorrect = showAnswers && option === q.a;
        return `<li class="${isCorrect ? "ok" : ""}">${esc(option)}${isCorrect ? " ✓" : ""}</li>`;
    });
    return `<ol class="td-o">${items}</ol>`;
}

function renderBlank(q, showAnswers) {
    const accepted = (q.a || "").split("|").join(" / ");
    return `<div class="td-line">${showAnswers ? `<b>${esc(accepted)}</b>` : ""}</div>`;
}

function renderMatching(q, showAnswers) {
    // Editor questions carry `pairs`; published ones carry `l` (left) and `r` (shuffled right column).
    const left = q.pairs ? q.pairs.map(([prompt]) => prompt) : q.l;
    const columnB = q.pairs ? [...new Set(q.pairs.map(([, right]) => right))] : q.r;

    const leftHtml = listItems(left, (prompt, j) => {
        const key = showAnswers && q.pairs ? ` → <b class="ok">${letterFor(columnB.indexOf(q.pairs[j][1]))}</b>` : "";
        return `<li>${esc(prompt)}${key}</li>`;
    });
    const rightHtml = listItems(columnB, item => `<li>${esc(item)}</li>`);

    return `<div class="td-mt"><ol class="l">${leftHtml}</ol><ol class="r">${rightHtml}</ol></div>`;
}

function renderEssay(q, showAnswers) {
    const lines = `<div class="td-lines"><i></i><i></i><i></i></div>`;
    const rubric = showAnswers && q.a
        ? `<div class="td-key">Rubric / model answer: ${escapeWithBreaks(q.a)}</div>`
        : "";
    return lines + rubric;
}

const BODY_RENDERERS = {
    mc: renderOptions,
    tf: renderOptions,
    id: renderBlank,
    sa: renderBlank,
    mt: renderMatching,
};

const renderBody = (q, showAnswers) => (BODY_RENDERERS[q.t] ?? renderEssay)(q, showAnswers);

/* ---------- document sections ---------- */

function renderQuestion({ q, index }, { answers, sheet }) {
    const clickable = sheet ? "" : `data-a="pvitem" data-id="${index}"`;
    const image = q.img ? `<img class="td-img" src="${esc(q.img)}" alt="">` : "";

    return `<article class="td-q" ${clickable} data-qi="${index}">`
        + `<div class="td-qh"><b>${index + 1}.</b> ${escapeWithBreaks(q.p)}<em>(${plural(qPts(q), "pt")})</em></div>`
        + image
        + renderBody(q, answers)
        + `</article>`;
}

function renderPart(group, number, options) {
    const { key, items } = group;
    const part = PARTS[key];
    const summary = `${plural(items.length, "item")} · ${sumPoints(items.map(x => x.q))} pts`;

    return `<section class="td-part">`
        + `<h3>Part ${ROMAN[number]}. ${part.label}<span>${summary}</span></h3>`
        + `<p class="td-dir">${part.dir}</p>`
        + listItems(items, item => renderQuestion(item, options))
        + `</section>`;
}

function renderHeader(meta, totalPoints) {
    const details = [
        meta.topic,
        `Term ${meta.term} · Week ${meta.week}`,
        meta.timeLimit ? `${meta.timeLimit} min` : "",
        plural(meta.attempts, "attempt"),
        plural(totalPoints, "point"),
    ].filter(Boolean);

    return `<div class="td-h">`
        + `<h2>${esc(meta.title || "Untitled test")}</h2>`
        + `<div class="td-meta">${details.map(esc).join(" · ")}</div>`
        + `</div>`;
}

const renderInstructions = instr => (instr ? `<div class="td-ins">${escapeWithBreaks(instr)}</div>` : "");

const renderStudentSheet = () =>
    `<div class="td-sheet"><span>Name:</span><span>Section:</span><span>Date:</span><span>Score:</span></div>`;

const renderEmptyState = () =>
    `<p class="hint" style="margin-top:14px">Your questions appear here as you add them. Click a question to edit it.</p>`;

/** Groups questions by part, keeping each question's original index; empty parts are dropped. */
function groupByPart(questions) {
    const indexed = questions.map((q, index) => ({ q, index }));
    return PART_ORDER
        .map(key => ({ key, items: indexed.filter(({ q }) => partOf(q.t) === key) }))
        .filter(group => group.items.length > 0);
}

/**
 * Builds the HTML for the test document.
 *
 * @param {{meta: object, qs: object[]}} editorState
 * @param {object}  [options]
 * @param {boolean} [options.answers=false] Show the answer key.
 * @param {boolean} [options.sheet=false]   Student copy (name/date lines, items not clickable).
 * @returns {string}
 */
export function testDoc({ meta, qs }, { answers = false, sheet = false } = {}) {
    const groups = groupByPart(qs);
    const options = { answers, sheet };

    return renderHeader(meta, sumPoints(qs))
        + renderInstructions(meta.instr)
        + (sheet ? renderStudentSheet() : "")
        + (groups.length
            ? listItems(groups, (group, n) => renderPart(group, n, options))
            : renderEmptyState());
}


/* ==========================================================================
 * 4. Editor helpers: kind picker, autosave, preview toggle, finish panel
 * ======================================================================== */

/** "What kind of test?" cards shown first. `icon(name)` returns SVG markup from the app's icon set. */
export const kindPickerHtml = (icon = () => "") =>
    `<div class="kinds">${Object.entries(KINDS).map(([key, kind]) =>
        `<button type="button" class="kind" data-a="pickkind" data-kind="${key}">${icon(kind.icon)}<b>${esc(kind.label)}</b><span>${esc(kind.desc)}</span></button>`
    ).join("")}</div>`;

/** Last-step panel: the teacher decides whether students may download the test as PDF. */
export const finishPanelHtml = ({ pdf = false } = {}) =>
    `<label class="pdf-opt"><input type="checkbox" id="m_pdf" ${pdf ? "checked" : ""}> <span>Allow PDF download <small>(students can save a printable copy)</small></span></label>`;

/**
 * Autosaves a draft to localStorage so the teacher never starts over.
 * const draft = createDraftStore("test-draft:" + activityId, statusEl);
 * draft.load() -> saved state or null; draft.save(state) debounced; draft.clear() after final save.
 */
export function createDraftStore(key, statusEl = null, delay = 250) {
    let timer = null;
    const show = (cls, label) => {
        if (!statusEl) return;
        statusEl.className = `save-ind ${cls}`;
        statusEl.textContent = label;
    };
    return {
        load() {
            try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
        },
        save(state) {
            show("saving", "Saving draft…");
            clearTimeout(timer);
            timer = setTimeout(() => {
                try {
                    localStorage.setItem(key, JSON.stringify(state));
                    show("saved", "Draft saved");
                } catch { show("", "Could not save draft"); }
            }, delay);
        },
        clear() {
            clearTimeout(timer);
            try { localStorage.removeItem(key); } catch { /* storage unavailable */ }
            show("", "");
        },
    };
}

/**
 * Wires the preview panel: header click opens/closes it (bottom sheet on mobile),
 * the floating button and backdrop work on small screens. Returns an unbind function.
 */
export function setPreviewOpen(root, open) {
    const panel = root.querySelector(".pv");
    if (!panel) return;
    panel.classList.toggle("open", open);
    panel.classList.toggle("closed", !open);
    root.querySelector(".pv-back")?.classList.toggle("on", open && matchMedia("(max-width:1099px)").matches);
}

export function bindPreviewToggle(root = document) {
    const panel = root.querySelector(".pv");
    if (!panel) return () => {};
    const mobile = () => matchMedia("(max-width:1099px)").matches;
    const onClick = e => {
        if (e.target.closest(".pv-head"))
            setPreviewOpen(root, mobile() ? !panel.classList.contains("open") : panel.classList.contains("closed"));
        else if (e.target.closest(".pv-fab")) setPreviewOpen(root, true);
        else if (e.target.closest(".pv-back")) setPreviewOpen(root, false);
    };
    root.addEventListener("click", onClick);
    return () => root.removeEventListener("click", onClick);
}

/* ---------- small icon button used in the item list ---------- */
export const EYE_ICON = `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>`;

export const iconBtn = (action, id, title, inner, { cls = "", disabled = false } = {}) =>
    `<button type="button" class="ib ${cls}" data-a="${action}" data-id="${esc(id)}" title="${esc(title)}" aria-label="${esc(title)}"${disabled ? " disabled" : ""}>${inner}</button>`;
