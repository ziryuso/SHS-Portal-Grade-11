/**
 * teacher-editor.js - activity editor: build questions by hand, paste, import from Word; save as draft or publish.
 */
import {
    $, $$, S, act, ask, collection, db,
    doc, empty, errMsg, esc, fromLocalInput, getDoc, go, head,
    ic, list, log, newSalt, norm, serverTimestamp, sha,
    shuffle, toLocalInput, toast, ts, v, where, writeBatch
} from "./core.js";
import { imgToData, readDocx } from "./docx.js";
import { curTerm, ensureTopic, newXid, pages, siblingLoads } from "./teacher-shared.js";
import {
    EYE_ICON, KINDS, PARTS, PART_ORDER, TYPE_LABEL, bindPreviewToggle, createDraftStore,
    finishPanelHtml, iconBtn, injectEditorCss, kindPickerHtml, partOf, partRank, qPts,
    setPreviewOpen, testDoc
} from "./teacher-editor-ui.js";

act.t_newtest = el => { PRE = el.dataset.topic || ""; location.hash = `#/editor/${el.dataset.id}`; };
/* ---------- activity editor ---------- */
let E = null, PRE = "", DRAFT = null;
const TYPES = TYPE_LABEL;
const isMobile = () => matchMedia("(max-width:1099px)").matches;
const dkey = lid => "edraft2:" + S.me.uid + ":" + lid;
function mk(t, p, pts, { o = [], a = "", pairs = [], img = "" }) {
    if (!p)
        throw new Error("Type the question first.");
    const q = { t, p, pts: Math.max(1, Math.min(100, parseInt(pts) || 1)) };
    if (t === "mc") {
        o = [...new Set(o.map(s => s.trim()).filter(Boolean))];
        if (o.length < 2 || o.length > 8)
            throw new Error("Multiple choice needs 2–8 different options.");
        let c = a.trim();
        if (/^\d+$/.test(c) && +c >= 1 && +c <= o.length)
            c = o[+c - 1];
        const f = o.find(x => norm(x) === norm(c));
        if (!f)
            throw new Error("The correct option must match one of the options.");
        q.o = o;
        q.a = f;
    }
    else if (t === "tf") {
        const x = norm(a);
        q.a = x === "true" || x === "t" ? "True" : x === "false" || x === "f" ? "False" : "";
        if (!q.a)
            throw new Error("Choose True or False.");
        q.o = ["True", "False"];
    }
    else if (t === "id" || t === "sa") {
        const alts = a.split("|").map(s => s.trim()).filter(Boolean);
        if (!alts.length)
            throw new Error("Enter at least one accepted answer.");
        q.a = alts.join("|");
    }
    else if (t === "mt") {
        pairs = pairs.filter(x => x[0] && x[1]);
        if (pairs.length < 2)
            throw new Error("Matching needs at least 2 pairs written as left=right.");
        q.pairs = pairs;
    }
    else
        q.a = a.trim();
    if (img)
        q.img = img;
    return q;
}
const pairsOf = txt => txt.split(/\n|;/).map(l => { const i = l.indexOf("="); return i < 0 ? ["", ""] : [l.slice(0, i).trim(), l.slice(i + 1).trim()]; });
const imgBox = () => `<div id="qimgbox" class="imgbox">${E.qimg ? `<img class="qimg" src="${E.qimg}" alt=""><button class="btn sm danger" data-a="qimgrm" type="button">Remove picture</button>` : `<label class="btn sm ghost" for="qimgf">${ic("file")} Add picture</label>`}<input id="qimgf" type="file" accept="image/*" hidden></div>`;
function qform() {
    const q = E.keep || (E.edit >= 0 ? E.qs[E.edit] : {}), t = E.qt;
    E.keep = null;
    E.qimg = q.img || "";
    let x = "";
    if (t === "mc")
        x = `<label class="f" for="qo">Options (one per line)</label><textarea id="qo" rows="4">${esc((q.o || []).join("\n"))}</textarea><label class="f" for="qa">Correct option</label><input id="qa" value="${esc(q.t === "mc" ? q.a || "" : "")}">`;
    else if (t === "tf")
        x = `<label class="f" for="qa">Correct answer</label><select id="qa"><option>True</option><option ${q.a === "False" ? "selected" : ""}>False</option></select>`;
    else if (t === "id" || t === "sa")
        x = `<label class="f" for="qa">Accepted answers (separate with |)</label><input id="qa" value="${esc(q.t === "id" || q.t === "sa" ? q.a || "" : "")}" placeholder="Manila|Maynila">`;
    else if (t === "mt")
        x = `<label class="f" for="qm">Pairs (left=right, one per line)</label><textarea id="qm" rows="4" placeholder="Sine=opposite/hypotenuse&#10;Cosine=adjacent/hypotenuse">${esc((q.pairs || []).map(p => p.join("=")).join("\n"))}</textarea>`;
    else
        x = `<label class="f" for="qa">Model answer / rubric</label><textarea id="qa" rows="3">${esc(q.t === "es" ? q.a || "" : "")}</textarea><p class="hint">Graded by you. Essays allow 1 attempt.</p>`;
    const allowed = PARTS[E.part]?.types || Object.keys(TYPES), shown = allowed.includes(t) ? allowed : [...allowed, t];
    return `<div class="g2"><div><label class="f" for="qt">Type</label><select id="qt">${shown.map(k => `<option value="${k}" ${k === t ? "selected" : ""}>${TYPES[k]}</option>`).join("")}</select></div>
  <div><label class="f" for="qpts">Points${t === "mt" ? " (per pair)" : ""}</label><input id="qpts" type="number" min="1" max="100" value="${q.pts || 1}"></div></div>
  <label class="f" for="qp">Question</label><textarea id="qp" rows="2">${esc(q.p || "")}</textarea>${imgBox()}${x}
  <p class="row"><button class="btn" data-a="qadd">${E.edit >= 0 ? "Update question" : "Add question"}</button>${E.edit >= 0 ? `<button class="btn ghost" data-a="qcancel">Cancel edit</button>` : ""}</p>`;
}
function readQ() {
    const t = E.qt, raw = {};
    if (t === "mc") {
        raw.o = $("#qo").value.split("\n");
        raw.a = v("qa");
    }
    else if (t === "mt")
        raw.pairs = pairsOf($("#qm").value);
    else
        raw.a = t === "es" ? $("#qa").value : v("qa");
    raw.img = E.qimg;
    return mk(t, v("qp"), v("qpts"), raw);
}
function readMeta() {
    const m = E.meta;
    m.title = v("m_title");
    m.instr = $("#m_instr").value.trim();
    m.attempts = +v("m_att") || 1;
    m.opens = fromLocalInput(v("m_open"));
    m.closes = fromLocalInput(v("m_close"));
    m.timeLimit = Math.max(0, parseInt(v("m_time")) || 0);
    m.shuffle = $("#m_shuf").checked;
    m.release = $("#m_rel").checked;
    m.topic = v("m_topic");
    m.term = +v("m_term") || 1;
    m.week = +v("m_week") || 1;
    m.links = parseLinks($("#m_links").value);
    m.pdf = $("#m_pdf").checked;
}
const parseLinks = t => t.split("\n").map(l => l.trim()).filter(Boolean).map(l => { const m = l.match(/^(.*?)[\s|]*(https?:\/\/\S+)$/); return m ? { t: m[1].trim().slice(0, 80), u: m[2] } : null; }).filter(Boolean).slice(0, 6);
/** Autosaves a new draft and refreshes the running preview. */
function persist(preview = true) {
    try {
        readMeta();
        if (!E.actId) DRAFT?.save({ kind: E.kind, meta: E.meta, qs: E.qs });
    } catch { /* page not ready yet */ }
    if (preview) drawPreview();
}

function drawPreview() {
    const box = $("#pvdoc");
    if (!box) return;
    box.innerHTML = testDoc(E, { answers: !!$("#pvans")?.checked });
    const n = $("#pvsum");
    if (n) n.textContent = `${E.qs.length} item${E.qs.length === 1 ? "" : "s"}`;
}

function drawParts() {
    const box = $("#ptabs");
    if (!box) return;
    box.innerHTML = E.kind !== "mixed" ? "" : PART_ORDER.map(k =>
        `<button type="button" class="pt ${E.part === k ? "on" : ""}" data-a="epart" data-id="${k}">${PARTS[k].label}<span class="n">${E.qs.filter(q => partOf(q.t) === k).length}</span></button>`).join("");
}

function drawList() {
    const total = E.qs.reduce((n, q) => n + qPts(q), 0), tot = $("#totpts");
    if (tot) tot.textContent = `${E.qs.length} item${E.qs.length === 1 ? "" : "s"} · ${total} pts`;
    let lastPart = "";
    $("#qlist").innerHTML = E.qs.map((q, i) => {
        const part = partOf(q.t), pts = qPts(q);
        const heading = part !== lastPart ? `<div class="ph2">${PARTS[part].label}</div>` : "";
        lastPart = part;
        const canUp = i > 0 && partOf(E.qs[i - 1].t) === part;
        const canDown = i < E.qs.length - 1 && partOf(E.qs[i + 1].t) === part;
        return heading + `<div class="qi ${E.edit === i ? "sel" : ""}"><span class="nm">${i + 1}</span>`
            + `<div class="tx">${esc(q.p)}<small>${TYPES[q.t]} · ${pts} pt${pts > 1 ? "s" : ""}${q.img ? " · picture" : ""}</small></div>`
            + `<div class="ac">${iconBtn("qview", i, "Review in preview", EYE_ICON, { cls: "eye" })}`
            + `${iconBtn("qup", i, "Move up", "↑", { disabled: !canUp })}${iconBtn("qdown", i, "Move down", "↓", { disabled: !canDown })}`
            + `${iconBtn("qedit", i, "Edit", "✎")}${iconBtn("qdup", i, "Duplicate", "⧉")}${iconBtn("qdel", i, "Delete", "✕", { cls: "del" })}</div></div>`;
    }).join("") || empty("No questions yet. Add them above or import a ready-made test.", "list");
}

/** Shows the kind picker until a kind is chosen, then the builder. */
function syncKind() {
    const k = E.kind;
    $("#kindwrap").hidden = !!k;
    $("#buildwrap").hidden = !k;
    $("#kindchip").textContent = k ? KINDS[k].label : "not chosen yet";
    const canImport = k === "mc" || k === "mixed";
    $("#segs").hidden = !canImport;
    if (!canImport && E.tab !== "type") act.etab({ dataset: { id: "type" } });
    $("#qf").innerHTML = qform();
    drawParts();
}

async function loadImg(inp) {
    const f = inp.files[0];
    if (!f)
        return;
    try {
        const d = await imgToData(f, 800);
        if (d.length > 260000)
            throw new Error("That picture is too big. Use a smaller one.");
        E.qimg = d;
        $("#qimgbox").outerHTML = imgBox();
    }
    catch (e) {
        toast(e.message || "Could not read that picture.", "bad");
        inp.value = "";
    }
}
act.qimgrm = () => { E.qimg = ""; $("#qimgbox").outerHTML = imgBox(); };
const redraw = () => {
    const editing = E.edit >= 0 ? E.qs[E.edit] : null;
    E.qs.sort((x, y) => partRank(x.t) - partRank(y.t));   // keep items grouped by part
    E.edit = editing ? E.qs.indexOf(editing) : -1;
    $("#qf").innerHTML = qform();
    drawParts();
    drawList();
    persist();
};
pages.editor = async ([loadId, actId]) => {
    const ls = await getDoc(doc(db, "loads", loadId));
    if (!ls.exists() || ls.data().teacherUid !== S.me.uid)
        return `<div class="card">${empty("Class not found.")}</div>`;
    const ld = ls.data(), sibs = await siblingLoads(loadId);
    E = { sibs, xdone: new Set(), xid: "", loadId, actId: actId || "", sectionId: ld.sectionId, qt: "mc", edit: -1, keep: null, subs: 0, meta: { title: "", instr: "", attempts: 1, opens: 0, closes: 0, timeLimit: 0, shuffle: true, release: false, topic: "", term: curTerm(), week: 1, links: [], draft: false, pdf: false }, qs: [], qimg: "", tab: "type", kind: null, part: "mc" };
    if (actId) {
        const [as, ks, ss] = await Promise.all([getDoc(doc(db, "activities", actId)), getDoc(doc(db, "keys", actId)), list("submissions", where("actId", "==", actId))]);
        if (!as.exists() || !ks.exists() || as.data().by !== S.me.uid || as.data().v !== 2)
            return `<div class="card">${empty("This activity cannot be edited (it may be from the old version). Create a new one.")}</div>`;
        const a = as.data(), key = ks.data().ans;
        E.xid = a.xid || "";
        if (E.xid)
            (await list("activities", where("xid", "==", E.xid), where("by", "==", S.me.uid))).forEach(x => E.xdone.add(x.loadId));
        E.subs = ss.length;
        E.meta = { title: a.title, instr: a.instructions || "", attempts: a.attempts, opens: a.opens || 0, closes: a.closes || 0, timeLimit: a.timeLimit || 0, shuffle: !!a.shuffle, release: !!a.release, topic: a.topic || "", term: a.term || curTerm(), week: a.week || 1, links: a.links || [], draft: !!a.draft, pdf: !!a.allowPdf };
        E.qs = a.questions.map((q, i) => {
            const k = key[i], o = { t: q.t, p: q.p, pts: q.pts || 1 };
            if (q.img)
                o.img = q.img;
            if (q.t === "mc") {
                o.o = q.o;
                o.a = k;
            }
            else if (q.t === "tf")
                o.a = k;
            else if (q.t === "mt")
                o.pairs = q.l.map((l, j) => [l, k[j]]);
            else
                o.a = k || "";
            return o;
        });
    }
    else {
        try {
            const d = JSON.parse(localStorage.getItem(dkey(loadId)));
            if (d) {
                E.meta = { ...E.meta, ...d.meta };
                E.qs = d.qs || [];
                E.kind = d.kind || null;
            }
        }
        catch { }
    }
    if (actId || !KINDS[E.kind]) E.kind = actId || E.qs.length ? "mixed" : null;
    E.part = E.kind && E.kind !== "mixed" ? KINDS[E.kind].parts[0] : partOf(E.qs[0]?.t || "mc");
    E.qt = PARTS[E.part].types[0];
    injectEditorCss();
    if (PRE && !actId)
        E.meta.topic = PRE;
    PRE = "";
    const m = E.meta;
    S.after = () => {
        const root = $("#ed");
        DRAFT = createDraftStore(dkey(loadId), $("#savestat"));
        if (E.actId) $("#savestat").textContent = "Editing a saved activity";
        root.addEventListener("input", ev => persist(!ev.target.closest("#qf")));
        root.addEventListener("change", ev => {
            const id = ev.target.id;
            if (id === "qt") {
                E.keep = { p: v("qp"), pts: +v("qpts") || 1, img: E.qimg };
                E.qt = ev.target.value;
                $("#qf").innerHTML = qform();
            }
            if (id === "qimgf") return loadImg(ev.target);
            if (id === "docf") return importDoc(ev.target);
            if (id === "pvans") return drawPreview();
            persist();
        });
        bindPreviewToggle(root);
        syncKind();
        drawList();
        drawPreview();
    };
    const mv = (id, l, inner, cls = "") => `<div class="${cls}"><label class="f" for="${id}">${l}</label>${inner}</div>`;
    const [tp, ac] = await Promise.all([list("topics", where("loadId", "==", loadId)).catch(() => []), list("activities", where("loadId", "==", loadId))]);
    const topics = [...tp.sort((x, y) => ts(x.at) - ts(y.at)).map(t => t.name), ...[...new Set(ac.map(a => a.topic).filter(Boolean))].filter(n => !tp.some(t => t.name === n)).sort()];
    if (m.topic && !topics.includes(m.topic))
        topics.push(m.topic);
    const pane = (k, l) => `<button type="button" id="tab_${k}" class="seg ${E.tab === k ? "on" : ""}" data-a="etab" data-id="${k}">${l}</button>`;
    const step = (n, title, extra = "") => `<h3><span class="step">${n}</span>${title}${extra}</h3>`;
    const saveBtns = actId && !m.draft
        ? `<button class="btn ghost" data-a="esave" data-draft="1">Move to drafts</button><button class="btn" data-a="esave" data-draft="0">Save changes</button>`
        : `<button class="btn ghost" data-a="esave" data-draft="1">Save draft</button><button class="btn" data-a="esave" data-draft="0">Publish</button>`;
    return head(actId ? "Edit activity" : "Create activity", "", `<a class="btn ghost" href="#/load/${loadId}/activities">← Back</a>`) + `<div id="ed" class="ed">
  <div class="ed-main">
  ${actId && E.subs ? `<div class="ed-card" style="border-color:#d97706"><b>${E.subs} student(s) already submitted.</b><p class="mut sm">Recorded scores are not recalculated if you change questions or answers.</p></div>` : ""}
  <div class="ed-quick"><span class="etop">Test kind: <b id="kindchip"></b> <button type="button" class="btn sm ghost" data-a="changekind">Change</button></span><span class="sp"></span><span id="totpts" class="etop"></span><span id="savestat" class="save-ind"></span></div>

  <section class="ed-card t-setup">${step(1, "Test setup")}
  <div class="egrid">
  ${mv("m_title", "Title", `<input id="m_title" value="${esc(m.title)}" placeholder="e.g. Quiz 1 – Trigonometric Ratios">`, "full")}
  ${mv("m_topic", "Topic", `<select id="m_topic"><option value="" disabled ${m.topic ? "" : "selected"}>Select topic</option>${topics.map(t => `<option ${t === m.topic ? "selected" : ""}>${esc(t)}</option>`).join("")}</select>${topics.length ? "" : `<p class="hint"><a href="#/load/${loadId}/activities">Create a topic</a> first.</p>`}`)}
  ${mv("m_term", "Term", `<select id="m_term">${[1, 2, 3].map(n => `<option value="${n}" ${m.term == n ? "selected" : ""}>Term ${n}</option>`).join("")}</select>`)}
  ${mv("m_week", "Week", `<select id="m_week">${Array.from({ length: 20 }, (_, i) => `<option value="${i + 1}" ${m.week == i + 1 ? "selected" : ""}>Week ${i + 1}</option>`).join("")}</select>`)}
  ${mv("m_att", "Attempts", `<select id="m_att">${[1, 2, 3].map(n => `<option ${m.attempts == n ? "selected" : ""}>${n}</option>`).join("")}</select>`)}
  ${mv("m_time", "Time limit (min, 0 = none)", `<input id="m_time" type="number" min="0" max="300" value="${m.timeLimit}">`)}
  ${mv("m_open", "Opens", `<input id="m_open" type="datetime-local" value="${toLocalInput(m.opens)}">`)}
  ${mv("m_close", "Due", `<input id="m_close" type="datetime-local" value="${toLocalInput(m.closes)}">`)}</div>
  <div class="eflags"><label class="f inline"><input type="checkbox" id="m_shuf" ${m.shuffle ? "checked" : ""}> Shuffle questions and choices</label>
  <label class="f inline"><input type="checkbox" id="m_rel" ${m.release ? "checked" : ""}> Show correct answers after submit</label></div>
  ${E.sibs.length ? `<div class="eflags xpost"><b>Also post to my other sections of this subject</b>${E.sibs.map(l => `<label class="f inline"><input type="checkbox" class="xs" value="${l.id}" ${E.xdone.has(l.id) ? "checked disabled" : ""}> ${esc(l.sec)}${E.xdone.has(l.id) ? " (already posted)" : ""}</label>`).join("")}<p class="hint">Each section gets its own copy with the same questions, term/week, open and due dates. Submissions and scores stay separate per section.</p></div>` : ""}
  <details class="more" ${m.instr || (m.links || []).length ? "open" : ""}><summary>Instructions and attached files</summary>
  <label class="f" for="m_instr">Instructions</label><textarea id="m_instr" rows="2">${esc(m.instr)}</textarea>
  <label class="f" for="m_links">Attached files <span class="mut">(Title link, one per line)</span></label><textarea id="m_links" rows="2" placeholder="Module 3 https://drive.google.com/…">${esc((m.links || []).map(l => (l.t ? l.t + " " : "") + l.u).join("\n"))}</textarea></details></section>

  <section class="ed-card t-build" id="kindwrap">${step(2, "What kind of test are you making?")}<p class="hint">Pick one to start. The builder adapts to it, and you can change it later.</p>${kindPickerHtml(ic)}</section>

  <section class="ed-card t-build" id="buildwrap" hidden>${step(2, "Build the test")}
  <div id="ptabs" class="ptabs"></div>
  <div id="segs" class="segs">${pane("type", "Type")}${pane("word", "Word file")}${pane("paste", "Paste")}</div>
  <div id="pane_type" ${E.tab === "type" ? "" : "hidden"}><div id="qf"></div></div>
  <div id="pane_word" ${E.tab === "word" ? "" : "hidden"}>
    <p class="hint">Use a <b>.docx</b>: number questions (1. 2. 3.), label choices A–D, and mark the correct one in <b>bold</b>, underline, <code>*</code>, an <code>Answer: B</code> line, or an <code>Answer key:</code> list. Pictures are kept.</p>
    <div class="g2"><div><label class="f" for="docpts">Points each</label><input id="docpts" type="number" min="1" max="100" value="1"></div>
    <div><label class="f" for="docf">File</label><input id="docf" type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"></div></div>
    <p id="docmsg" class="sm" aria-live="polite"></p></div>
  <div id="pane_paste" ${E.tab === "paste" ? "" : "hidden"}>
    <textarea id="mcbulk" rows="8" aria-label="Pasted test" placeholder="1. What is 2 + 2?&#10;A. 3&#10;B. 4&#10;C. 5&#10;Answer: B&#10;&#10;2. Which is a prime number?&#10;A. 9&#10;B. 15&#10;*C. 7&#10;D. 21"></textarea>
    <div class="g2"><div><label class="f" for="mcpts">Points each</label><input id="mcpts" type="number" min="1" max="100" value="1"></div></div>
    <p><button class="btn" data-a="qmcimport">Add questions</button></p>
    <details class="alt"><summary>Other question types (one line each)</summary><p class="hint"><code>type|question|options|answer|points</code> — types: mc, tf, id, sa, mt, es. Separate options and alternatives with <code>;</code>. Matching: <code>left=right;left=right</code>.</p>
    <textarea id="bulk" rows="4" aria-label="One-line questions" placeholder="mc|Capital of the Philippines?|Manila;Cebu;Davao|Manila&#10;tf|The sum of angles in a triangle is 180°.||True&#10;id|Largest ocean?||Pacific;Pacific Ocean"></textarea><p><button class="btn ghost" data-a="qimport">Import lines</button></p></details></div>
  </section>

  <section class="ed-card t-items">${step(3, "Test items", `<span class="sp"></span>`)}<div id="qlist"></div></section>

  <section class="ed-card t-fin">${step(4, "Finish")}
  ${finishPanelHtml({ pdf: m.pdf })}
  <div class="efoot"><span class="sp"></span>${saveBtns}</div></section>
  </div>

  <aside class="pv" aria-label="Live preview of the test">
    <button type="button" class="pv-head">${ic("file")}<span>Live preview</span><span class="sp"></span><small id="pvsum"></small></button>
    <div class="pv-body">
      <div class="pv-tools"><label><input type="checkbox" id="pvans"> Show answers</label><span class="sp"></span><button type="button" class="btn sm ghost" data-a="eprint">Print / PDF</button></div>
      <div class="pv-scroll"><div id="pvdoc"></div></div>
    </div>
  </aside>
  <button type="button" class="pv-fab">${ic("file")} Preview</button>
  <div class="pv-back"></div></div>`;
};
act.qadd = () => { try {
    const q = readQ();
    if (E.edit >= 0) {
        E.qs[E.edit] = q;
        E.edit = -1;
    }
    else
        E.qs.push(q);
    E.keep = null;
    redraw();
    toast("Question saved to the list.");
}
catch (e) {
    toast(e.message, "bad");
} };
act.qcancel = () => { E.edit = -1; redraw(); };
act.qedit = el => {
    E.edit = +el.dataset.id;
    E.qt = E.qs[E.edit].t;
    E.part = partOf(E.qt);
    E.keep = null;
    if (E.tab !== "type") act.etab({ dataset: { id: "type" } });
    $("#qf").innerHTML = qform();
    drawParts();
    drawList();
    $("#qf").scrollIntoView({ behavior: "smooth" });
};
act.pvitem = el => { if (isMobile()) setPreviewOpen($("#ed"), false); act.qedit(el); };
act.qview = el => {
    setPreviewOpen($("#ed"), true);
    const node = $(`#pvdoc [data-qi="${+el.dataset.id}"]`);
    if (!node) return;
    node.scrollIntoView({ behavior: "smooth", block: "center" });
    node.classList.remove("flash");
    void node.offsetWidth;
    node.classList.add("flash");
};
act.pickkind = el => {
    E.kind = el.dataset.kind;
    E.part = KINDS[E.kind].parts[0];
    E.qt = PARTS[E.part].types[0];
    E.keep = null;
    syncKind();
    persist();
};
act.changekind = () => { E.kind = null; syncKind(); };
act.epart = el => {
    E.keep = { p: v("qp"), pts: +v("qpts") || 1, img: E.qimg };
    E.part = el.dataset.id;
    E.qt = PARTS[E.part].types[0];
    E.edit = -1;
    $("#qf").innerHTML = qform();
    drawParts();
    drawList();
};
act.eprint = () => {
    readMeta();
    let root = $("#print-root");
    if (!root) {
        root = document.createElement("div");
        root.id = "print-root";
        document.body.append(root);
    }
    root.innerHTML = testDoc(E, { sheet: true, answers: !!$("#pvans")?.checked });
    document.body.classList.add("pp");
    const done = () => { document.body.classList.remove("pp"); removeEventListener("afterprint", done); };
    addEventListener("afterprint", done);
    print();
};
act.qdel = async (el) => { if (await ask("Delete this question?", "Delete", true)) {
    E.qs.splice(+el.dataset.id, 1);
    E.edit = -1;
    redraw();
} };
act.qdup = el => { const i = +el.dataset.id; E.qs.splice(i + 1, 0, structuredClone(E.qs[i])); redraw(); };
act.qup = el => { const i = +el.dataset.id; if (i > 0 && partOf(E.qs[i - 1].t) === partOf(E.qs[i].t)) {
    [E.qs[i - 1], E.qs[i]] = [E.qs[i], E.qs[i - 1]];
    E.edit = -1;
    redraw();
} };
act.qdown = el => { const i = +el.dataset.id; if (i < E.qs.length - 1 && partOf(E.qs[i + 1].t) === partOf(E.qs[i].t)) {
    [E.qs[i + 1], E.qs[i]] = [E.qs[i], E.qs[i + 1]];
    E.edit = -1;
    redraw();
} };
act.qimport = () => {
    const lines = $("#bulk").value.split("\n").map(s => s.trim()).filter(Boolean), bad = [];
    let n = 0;
    lines.forEach((l, i) => {
        try {
            const [t0, p, o = "", a = "", pts = "1"] = l.split("|").map(s => s.trim()), t = (t0 || "").toLowerCase();
            if (!TYPES[t])
                throw new Error("unknown type");
            const raw = t === "mc" ? { o: o.split(";"), a } : t === "mt" ? { pairs: pairsOf(o) } : { a: (t === "id" || t === "sa") ? a.split(";").join("|") : a };
            E.qs.push(mk(t, p, pts, raw));
            n++;
        }
        catch (e) {
            bad.push(i + 1);
        }
    });
    $("#bulk").value = bad.length ? lines.filter((_, i) => bad.includes(i + 1)).join("\n") : "";
    redraw();
    toast(`${n} question(s) imported${bad.length ? `. Line(s) ${bad.join(", ")} had problems and were left in the box.` : "."}`, bad.length ? "bad" : "ok");
};
/* parse a pasted multiple-choice test into auto-graded questions */
function parseMC(input, pts) {
    const lines = (typeof input === "string" ? input.replace(/\r/g, "").split("\n").map(t => ({ text: t.trim() })) : input.map(o => ({ ...o, text: o.text.trim() })));
    const qs = [], errs = [];
    let cur = null, keys = {}, inKey = false, pend = "";
    const L = c => c.toUpperCase().charCodeAt(0) - 64;
    const flush = () => { if (!cur)
        return; qs.push(cur); cur = null; };
    for (const ln of lines) {
        const l = ln.text;
        if (ln.imgs?.length) {
            const startsQ = /^\d+\s*[.)]\s*\S/.test(l);
            if (!startsQ && cur && !cur.opts.length && !cur.img)
                cur.img = ln.imgs[0];
            else
                pend = ln.imgs[0];
        }
        if (!l)
            continue;
        const km = l.match(/^(?:answer\s*keys?|keys?|answers)\s*[:\-]?\s*(.*)$/i);
        if (km && (inKey || !cur || !/^answer\s*[:=-]\s*\(?[A-Ha-h]\)?\s*$/i.test(l)) && !/^(?:answer|ans)\s*[:=-]\s*\(?[A-Ha-h]\)?\s*$/i.test(l)) {
            flush();
            inKey = true;
            l.replace(/^[^:\-]*[:\-]?/, "");
        }
        if (inKey) {
            for (const m of l.matchAll(/(\d+)\s*[.):\-]?\s*\(?([A-Ha-h])\)?(?![A-Za-z])/g))
                keys[+m[1]] = m[2].toUpperCase();
            continue;
        }
        const am = l.match(/^(?:answer|ans|correct(?:\s*answer)?)\s*[:=-]\s*\(?([A-Ha-h])\)?\b/i);
        if (am && cur) {
            cur.ans = am[1].toUpperCase();
            continue;
        }
        const om = l.match(/^(\*?)\s*\(?([A-Ha-h])[.)]\s*(.+?)(\s*(?:\*|✓|✔))?$/);
        if (om && cur) {
            cur.opts.push(om[3].trim());
            if (om[1] || om[4])
                cur.ans = om[2].toUpperCase();
            else if (ln.hl)
                cur.hl.push(om[2].toUpperCase());
            cur.letters.push(om[2].toUpperCase());
            continue;
        }
        const qm = l.match(/^(\d+)\s*[.)]\s*(.+)$/);
        if (qm) {
            flush();
            cur = { n: +qm[1], p: qm[2].trim(), opts: [], letters: [], ans: "", hl: [], img: pend };
            pend = "";
            continue;
        }
        if (cur && !cur.opts.length)
            cur.p += "\n" + l;
        else if (cur && cur.opts.length)
            cur.opts[cur.opts.length - 1] += " " + l;
    }
    flush();
    const out = [];
    qs.forEach((q, i) => {
        const a = q.ans || keys[q.n] || keys[i + 1] || (q.hl.length === 1 ? q.hl[0] : "");
        try {
            if (!a)
                throw new Error("no answer given");
            const idx = q.letters.indexOf(a);
            if (idx < 0)
                throw new Error("answer letter not among choices");
            out.push(mk("mc", q.p, pts, { o: q.opts, a: String(idx + 1), img: q.img }));
        }
        catch (e) {
            errs.push(`Q${q.n} (${e.message})`);
        }
    });
    return { out, errs };
}
act.qmcimport = () => {
    const txt = $("#mcbulk").value.trim();
    if (!txt)
        return toast("Paste your test first.", "bad");
    const { out, errs } = parseMC(txt, +v("mcpts") || 1);
    if (!out.length)
        return toast(errs.length ? "Nothing imported — " + errs.slice(0, 3).join("; ") : "No questions found. Number each question like “1.” and label choices A, B, C, D.", "bad");
    E.qs.push(...out);
    if (!errs.length)
        $("#mcbulk").value = "";
    redraw();
    toast(`${out.length} multiple-choice question(s) added${errs.length ? `. Skipped: ${errs.slice(0, 4).join("; ")}` : ""}.`, errs.length ? "bad" : "ok");
};
async function importDoc(inp) {
    const f = inp.files[0];
    inp.value = "";
    if (!f)
        return;
    const msg = $("#docmsg");
    if (!/\.docx$/i.test(f.name)) {
        msg.innerHTML = `<span class="bad">Please choose a .docx file. In Word: File → Save As → Word Document (.docx).</span>`;
        return;
    }
    msg.textContent = "Reading your Word file…";
    try {
        const { lines, warns } = await readDocx(f), { out, errs } = parseMC(lines, Math.max(1, +v("docpts") || 1));
        if (!out.length) {
            msg.innerHTML = `<span class="bad">No questions found. Number each question (1. 2. 3.), label choices A–D, and mark the correct choice (bold, underline, *, or an Answer line).</span>${errs.length ? `<div class="sm">${esc(errs.slice(0, 4).join("; "))}</div>` : ""}`;
            return;
        }
        E.qs.push(...out);
        redraw();
        msg.innerHTML = `<b class="ok">${out.length} question(s) added</b> (${out.filter(q => q.img).length} with pictures). Review them in the list below.${errs.length ? `<div class="bad sm">Not added — no answer found: ${esc(errs.join("; "))}. Mark the answer in your Word file and upload again, or type those items manually.</div>` : ""}${warns.length ? `<div class="sm">${esc(warns.join(" "))}</div>` : ""}`;
    }
    catch (e) {
        msg.innerHTML = `<span class="bad">${esc(e.message || "Could not read that file.")}</span>`;
    }
}
act.etab = el => { E.tab = el.dataset.id; ["type", "word", "paste"].forEach(k => { $("#pane_" + k).hidden = k !== E.tab; $("#tab_" + k).classList.toggle("on", k === E.tab); }); };
act.esave = async (el) => {
    readMeta();
    const m = E.meta;
    if (!m.title)
        return toast("Give the activity a title.", "bad");
    if (!m.topic)
        return toast("Choose a topic. Create topics in the Classwork tab.", "bad");
    const draft = el.dataset.draft === "1";
    if (!E.qs.length && !draft)
        return toast("Add at least one question.", "bad");
    if (m.opens && m.closes && m.closes <= m.opens)
        return toast("The deadline must be after the opening time.", "bad");
    el.disabled = true;
    try {
        const salt = newSalt(), questions = [], ans = {};
        for (let i = 0; i < E.qs.length; i++) {
            const q = E.qs[i], b = { t: q.t, p: q.p, pts: q.pts };
            if (q.img)
                b.img = q.img;
            if (q.t === "mc" || q.t === "tf") {
                b.o = q.o;
                b.h = [await sha(salt, q.a)];
                ans[i] = q.a;
            }
            else if (q.t === "id" || q.t === "sa") {
                const alts = q.a.split("|");
                b.h = await Promise.all(alts.map(x => sha(salt, x)));
                ans[i] = q.a;
            }
            else if (q.t === "mt") {
                b.l = q.pairs.map(p => p[0]);
                b.r = shuffle([...new Set(q.pairs.map(p => p[1]))]);
                b.h = await Promise.all(q.pairs.map(p => sha(salt, p[1])));
                ans[i] = q.pairs.map(p => p[1]);
            }
            else
                ans[i] = q.a || "";
            questions.push(b);
        }
        const hasEssay = E.qs.some(q => q.t === "es"), autoTotal = E.qs.filter(q => q.t !== "es").reduce((n, q) => n + qPts(q), 0), manualMax = E.qs.filter(q => q.t === "es").reduce((n, q) => n + qPts(q), 0);
        const data = { v: 2, loadId: E.loadId, sectionId: E.sectionId, title: m.title, instructions: m.instr, attempts: hasEssay ? 1 : m.attempts, opens: m.opens, closes: m.closes, timeLimit: m.timeLimit, shuffle: m.shuffle, release: m.release, topic: m.topic, term: m.term, week: m.week, links: m.links, allowPdf: !!m.pdf, draft,
            questions, salt, totalPts: autoTotal + manualMax, autoTotal, manualMax, hasEssay, updatedAt: serverTimestamp() };
        if (JSON.stringify(data).length > 900000)
            throw new Error("This activity has too many or too large pictures. Remove a few pictures or use smaller ones.");
        const ref = E.actId ? doc(db, "activities", E.actId) : doc(collection(db, "activities")), b = writeBatch(db);
        const xs = E.sibs.filter(l => !E.xdone.has(l.id) && $$(".xpost .xs:checked").some(c => c.value === l.id)), xid = E.xid || (xs.length ? newXid() : "");
        if (xid)
            data.xid = xid;
        if (E.actId)
            b.update(ref, data);
        else
            b.set(ref, { ...data, by: S.me.uid, at: serverTimestamp() });
        b.set(doc(db, "keys", ref.id), { by: S.me.uid, loadId: E.loadId, sectionId: E.sectionId, ans });
        await b.commit();
        const failed = [];
        for (const l of xs) {
            try {
                const b2 = writeBatch(db), r2 = doc(collection(db, "activities"));
                await ensureTopic(b2, l, m.topic);
                b2.set(r2, { ...data, loadId: l.id, sectionId: l.sectionId, by: S.me.uid, at: serverTimestamp() });
                b2.set(doc(db, "keys", r2.id), { by: S.me.uid, loadId: l.id, sectionId: l.sectionId, ans });
                await b2.commit();
            }
            catch {
                failed.push(l.sec);
            }
        }
        try {
            DRAFT?.clear();
            localStorage.removeItem(dkey(E.loadId));
        }
        catch { }
        log((E.actId ? "updated" : "posted") + " activity " + m.title);
        const more = xs.length - failed.length;
        if (failed.length)
            toast("Saved here, but could not post to: " + failed.join(", ") + ". Open that class and try again.", "bad");
        else
            toast((draft ? "Saved as draft. Students cannot see it yet." : E.actId ? "Activity updated." : "Activity published to students.") + (more ? ` Also posted to ${more} other section${more > 1 ? "s" : ""}.` : ""));
        go(`load/${E.loadId}/activities`);
    }
    catch (e) {
        el.disabled = false;
        toast(errMsg(e), "bad");
    }
};
