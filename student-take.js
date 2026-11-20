/**
 * student-take.js - taking an activity: timer, anti-cheat guards, draft saving, submit and scoring.
 */
import {
    $, $$, S, act, ask, db, doc, empty,
    errMsg, esc, fdate, getDoc, go, ic, mmss, pct,
    qMax, serverTimestamp, setDoc, sha, shuffle, toast
} from "./core.js";
import { injectEditorCss, testDoc } from "./teacher-editor-ui.js";
import { dropDraft, getDraft, linksHtml, pages, putDraft, status } from "./student-shared.js";

/* ---------- take an activity ---------- */
const RUN = { cur: 0, busy: false, iv: 0 };
const newDraft = a => {
    const idx = a.questions.map((_, i) => i), d = { t0: Date.now(), ord: a.shuffle ? shuffle(idx) : idx, opt: {}, mo: {}, ans: {}, sw: 0 };
    a.questions.forEach((q, i) => { if (a.shuffle && q.t === "mc")
        d.opt[i] = shuffle(q.o.map((_, k) => k)); if (q.t === "mt")
        d.mo[i] = shuffle(q.r.map((_, k) => k)); });
    return d;
};
const isDone = (q, x) => q.t === "mt" ? Array.isArray(x) && x.length === q.l.length && x.every(Boolean) : !!(x && String(x).trim());
export const gate = (msg, back = "#/subjects") => `<div class="card">${empty(msg, "clock")}<p class="right"><a class="btn" href="${back}">Back</a></p></div>`;
function qCard(a, qi, pos, dr) {
    const q = a.questions[qi], x = dr.ans[qi];
    let inp = "";
    if (q.t === "mc" || q.t === "tf") {
        const ord = dr.opt?.[qi] || q.o.map((_, k) => k);
        inp = ord.map(k => `<label class="opt"><input type="radio" name="q${qi}" data-q="${qi}" value="${esc(q.o[k])}" ${x === q.o[k] ? "checked" : ""}><span>${esc(q.o[k])}</span></label>`).join("");
    }
    else if (q.t === "mt") {
        const rs = dr.mo?.[qi] || q.r.map((_, k) => k);
        inp = q.l.map((l, j) => `<div class="mrow"><span>${esc(l)}</span><select data-q="${qi}" data-j="${j}"><option value="">Choose…</option>${rs.map(k => `<option value="${esc(q.r[k])}" ${Array.isArray(x) && x[j] === q.r[k] ? "selected" : ""}>${esc(q.r[k])}</option>`).join("")}</select></div>`).join("");
    }
    else if (q.t === "es")
        inp = `<textarea data-q="${qi}" rows="6" placeholder="Write your answer here">${esc(x || "")}</textarea>`;
    else
        inp = `<input data-q="${qi}" value="${esc(x || "")}" placeholder="Type your answer" autocomplete="off">`;
    return `<section class="card qc" data-i="${pos}"><div class="row between"><b>Question ${pos + 1}</b><span class="mut sm">${qMax(q)} pt${qMax(q) > 1 ? "s" : ""}</span></div><p class="qp">${esc(q.p)}</p>${q.img ? `<img class="qimg" src="${q.img}" alt="Picture for question ${pos + 1}">` : ""}${inp}</section>`;
}
pages.take = async ([id]) => {
    const snap = await getDoc(doc(db, "activities", id));
    if (!snap.exists())
        return gate("Activity not found.");
    const a = { id, ...snap.data() };
    if (a.v !== 2 || a.sectionId !== S.me.sectionId)
        return gate("This activity is not available to you.");
    const ss = await getDoc(doc(db, "submissions", id + "_" + S.me.uid)), s = ss.exists() ? ss.data() : null, st = status(a, s);
    const back = "#/subject/" + a.loadId;
    if (st === "soon")
        return gate("This activity opens on " + fdate(a.opens) + ".", back);
    if (st === "missed")
        return gate("This activity is already closed.", back);
    if (st === "done")
        return gate("You have used all attempts for this activity.", back);
    let dr = getDraft(id);
    if (!dr || dr.ord?.length !== a.questions.length)
        dr = newDraft(a);
    putDraft(id, dr);
    const total = a.questions.length, mode = localStorage.getItem("runMode") || "all";
    const dl = () => Math.min(a.timeLimit ? dr.t0 + a.timeLimit * 6e4 : Infinity, a.closes || Infinity);
    RUN.cur = 0;
    RUN.busy = false;
    S.after = () => {
        const root = $("#run");
        const upd = () => {
            const n = a.questions.filter((q, i) => isDone(q, dr.ans[i])).length;
            $("#pgt").textContent = `${n} of ${total} answered`;
            $("#pgb").style.width = pct(n, total) + "%";
            $$(".chipq").forEach(c => c.classList.toggle("on", isDone(a.questions[+c.dataset.q], dr.ans[+c.dataset.q])));
        };
        const show = i => { RUN.cur = Math.max(0, Math.min(total - 1, i)); $$(".qc").forEach(c => c.classList.toggle("cur", +c.dataset.i === RUN.cur)); if (root.classList.contains("one"))
            scrollTo(0, 0); };
        root.addEventListener("input", ev => {
            const el = ev.target.closest("[data-q]");
            if (!el)
                return;
            const qi = +el.dataset.q;
            if (el.dataset.j !== undefined) {
                const n = a.questions[qi].l.length;
                if (!Array.isArray(dr.ans[qi]))
                    dr.ans[qi] = Array(n).fill("");
                dr.ans[qi][+el.dataset.j] = el.value;
            }
            else
                dr.ans[qi] = el.value;
            putDraft(id, dr);
            upd();
        });
        act.qgo = el => show(RUN.cur + +el.dataset.d);
        act.qjump = el => { const i = +el.dataset.i; if (root.classList.contains("one"))
            show(i);
        else
            $$(".qc")[i]?.scrollIntoView({ behavior: "smooth", block: "center" }); };
        act.qmode = () => { const one = root.classList.toggle("one"); localStorage.setItem("runMode", one ? "one" : "all"); $("#qpn").style.display = one ? "flex" : "none"; $("#qmode").textContent = one ? "Show all questions" : "One question at a time"; show(RUN.cur); };
        act.runSubmit = () => submitRun(a, dr, false);
        act.runPdf = () => {   // printable, answer-free copy; only offered when the teacher allowed it
            injectEditorCss();
            let sheet = $("#print-root");
            if (!sheet) {
                sheet = document.createElement("div");
                sheet.id = "print-root";
                document.body.append(sheet);
            }
            sheet.innerHTML = testDoc({ meta: { title: a.title, instr: a.instructions || "", topic: a.topic || "", term: a.term || 1, week: a.week || 1, timeLimit: a.timeLimit || 0, attempts: a.attempts || 1 }, qs: a.questions }, { sheet: true });
            document.body.classList.add("pp");
            const done = () => { document.body.classList.remove("pp"); removeEventListener("afterprint", done); };
            addEventListener("afterprint", done);
            print();
        };
        show(0);
        upd();
        if (isFinite(dl())) {
            const tick = () => { const r = dl() - Date.now(); $("#tm").textContent = mmss(r); $("#tmw").classList.toggle("warn", r < 6e4); if (r <= 0) {
                clearInterval(RUN.iv);
                submitRun(a, dr, true);
            } };
            tick();
            RUN.iv = setInterval(tick, 1000);
        }
        const vis = () => { if (document.hidden) {
            dr.sw = (dr.sw || 0) + 1;
            putDraft(id, dr);
        } };
        document.addEventListener("visibilitychange", vis);
        /* Test shield. A web page cannot truly block screenshots or screen recording (the phone or computer does that outside the page),
           so this makes capturing hard, useless and traceable: the questions hide whenever the window loses focus or a capture key is pressed,
           copy/right-click/print are off, and every screen carries a faint watermark with the student's name. */
        const shield = document.createElement("div");
        shield.id = "shield";
        shield.innerHTML = `<div><b>Test hidden</b><p>Come back to this window to continue.<br>Screenshots and screen recording are not allowed during a test.</p></div>`;
        document.body.append(shield);
        const wm = `<svg xmlns="http://www.w3.org/2000/svg" width="260" height="150"><text x="20" y="90" transform="rotate(-25 130 75)" font-family="Arial" font-size="15" fill="rgba(100,100,100,.16)">${esc((S.me.alias || "") + " · " + (S.me.name || ""))}</text></svg>`;
        document.body.style.setProperty("--wm", `url("data:image/svg+xml,${encodeURIComponent(wm)}")`);
        document.body.classList.add("testing");
        const hide = on => shield.classList.toggle("on", on), strike = () => { dr.sw = (dr.sw || 0) + 1; putDraft(id, dr); };
        const onBlur = () => hide(true), onFocus = () => hide(false);
        const onKey = e => {
            const k = (e.key || "").toLowerCase();
            if (k === "printscreen" || (e.metaKey && e.shiftKey && ["3", "4", "5"].includes(e.key)) || (e.ctrlKey && ["p", "s"].includes(k)) || (e.ctrlKey && e.shiftKey && k === "s")) {
                e.preventDefault();
                hide(true);
                try {
                    navigator.clipboard.writeText(" ");
                }
                catch { }
                if (k === "printscreen")
                    strike();
                setTimeout(() => { if (document.hasFocus())
                    hide(false); }, 1500);
            }
        };
        const block = e => { if (!e.target.closest?.("input,textarea") || e.type === "contextmenu")
            e.preventDefault(); };
        addEventListener("blur", onBlur);
        addEventListener("focus", onFocus);
        addEventListener("keydown", onKey);
        addEventListener("keyup", onKey);
        ["contextmenu", "copy", "cut", "dragstart"].forEach(t => document.addEventListener(t, block));
        S.cleanup = () => {
            clearInterval(RUN.iv);
            document.removeEventListener("visibilitychange", vis);
            removeEventListener("blur", onBlur);
            removeEventListener("focus", onFocus);
            removeEventListener("keydown", onKey);
            removeEventListener("keyup", onKey);
            ["contextmenu", "copy", "cut", "dragstart"].forEach(t => document.removeEventListener(t, block));
            shield.remove();
            document.body.classList.remove("testing");
            document.body.style.removeProperty("--wm");
        };
    };
    return `<div class="card runhead"><div class="row between"><div><b>${esc(a.title)}</b><div class="mut sm">${total} items · ${a.totalPts} points${a.shuffle ? " · shuffled" : ""}</div></div>
  <div class="row">${isFinite(dl()) ? `<span class="timer" id="tmw">${ic("clock")}<span id="tm">--:--</span></span>` : ""}${a.allowPdf ? `<button class="btn ghost" data-a="runPdf">${ic("file")} PDF</button>` : ""}<button class="btn" id="sbtn" data-a="runSubmit">Submit</button></div></div>
  <div class="bar"><i id="pgb" style="width:0"></i></div><div class="row between sm"><span id="pgt"></span><button class="btn ghost sm" id="qmode" data-a="qmode">${mode === "one" ? "Show all questions" : "One question at a time"}</button></div>
  <div class="qnav">${dr.ord.map((qi, pos) => `<button class="chipq" data-q="${qi}" data-a="qjump" data-i="${pos}" aria-label="Go to question ${pos + 1}">${pos + 1}</button>`).join("")}</div></div>
  ${a.instructions || (a.links || []).length ? `<div class="card"><b>Instructions</b>${a.instructions ? `<p style="white-space:pre-wrap">${esc(a.instructions)}</p>` : ""}${linksHtml(a)}</div>` : ""}
  <div id="run" class="${mode === "one" ? "one" : ""}">${dr.ord.map((qi, pos) => qCard(a, qi, pos, dr)).join("")}
  <div id="qpn" class="row between" style="display:${mode === "one" ? "flex" : "none"}"><button class="btn ghost" data-a="qgo" data-d="-1">← Previous</button><button class="btn ghost" data-a="qgo" data-d="1">Next →</button></div></div>
  <div class="card"><button class="btn" data-a="runSubmit">Submit answers</button> <a class="btn ghost" href="${back}">Save &amp; leave (answers are autosaved)</a></div>`;
};
async function submitRun(a, dr, auto) {
    if (RUN.busy)
        return;
    RUN.busy = true;
    const blanks = a.questions.filter((q, i) => !isDone(q, dr.ans[i])).length;
    if (!auto) {
        const ok = await ask(blanks ? `You have ${blanks} unanswered item(s). Submit anyway? You cannot change your answers afterwards.` : "Submit your answers now? You cannot change them afterwards.", "Submit");
        if (!ok) {
            RUN.busy = false;
            return;
        }
    }
    else
        toast("Time is up — submitting your answers.", "bad");
    $$("[data-a=runSubmit],#sbtn").forEach(b => b.disabled = true);
    try {
        let score = 0;
        const qres = [], answers = {};
        for (let i = 0; i < a.questions.length; i++) {
            const q = a.questions[i], x = dr.ans[i];
            answers[i] = q.t === "mt" ? (Array.isArray(x) ? x : Array(q.l.length).fill("")).map(z => z || "") : (x || "");
            if (q.t === "es") {
                qres.push(0);
                continue;
            }
            if (q.t === "mt") {
                let c = 0;
                for (let j = 0; j < q.l.length; j++)
                    if (answers[i][j] && await sha(a.salt, answers[i][j]) === q.h[j])
                        c++;
                score += c * (q.pts || 1);
                qres.push(c / q.l.length);
            }
            else {
                const ok = !!answers[i] && q.h.includes(await sha(a.salt, answers[i]));
                if (ok)
                    score += (q.pts || 1);
                qres.push(ok ? 1 : 0);
            }
        }
        const ref = doc(db, "submissions", a.id + "_" + S.me.uid), old = await getDoc(ref), o = old.exists() ? old.data() : {};
        if ((o.attempts || 0) >= a.attempts) {
            toast("No attempts left.", "bad");
            return go("subject/" + a.loadId);
        }
        const better = score >= (o.best || 0);
        await setDoc(ref, { uid: S.me.uid, alias: S.me.alias, actId: a.id, loadId: a.loadId, sectionId: a.sectionId, total: a.totalPts,
            best: Math.max(o.best || 0, score), manualTotal: 0, graded: !a.hasEssay, attempts: (o.attempts || 0) + 1,
            answers: better ? answers : (o.answers || answers), qres: better ? qres : (o.qres || qres),
            scores: [...(o.scores || []), { s: score, t: Date.now() }], tabSwitches: (o.tabSwitches || 0) + (dr.sw || 0), at: serverTimestamp() });
        dropDraft(a.id);
        S.cleanup?.();
        S.cleanup = null;
        toast("Submitted!");
        go("result/" + a.id);
    }
    catch (e) {
        toast(errMsg(e), "bad");
        $$("[data-a=runSubmit],#sbtn").forEach(b => b.disabled = false);
        RUN.busy = false;
    }
}
