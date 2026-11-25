/**
 * student-subjects.js - dashboard, subject list and the subject page (timeline, classwork, materials).
 */
import {
    S, act, annHtml, badge, bar, db, doc, empty,
    esc, fdate, fday, go, greet, head, ic, list,
    stat, toast, ts, updateDoc, where
} from "./core.js";
import {
    SB, colorOf, curTerm, data, dueTxt, linksHtml, loadOf, pages,
    pend, scoreTxt, sp, status, subjCard, subjName
} from "./student-shared.js";

/* ---------- dashboard ---------- */
pages.home = async () => {
    const d = await data(), m = S.me;
    const items = d.acts.map(a => ({ a, s: d.sm[a.id], st: status(a, d.sm[a.id]) }));
    const todo = items.filter(x => x.st === "open" || x.st === "progress");
    const graded = d.subs.filter(s => !pend(s)), avg = graded.length ? Math.round(graded.reduce((n, s) => n + sp(s), 0) / graded.length) : null;
    const left = items.filter(x => ["open", "progress", "retake"].includes(x.st)).reduce((n, x) => n + x.a.attempts - (x.s?.attempts || 0), 0);
    const recent = [...d.subs].sort((a, b) => ts(b.at) - ts(a.at)).slice(0, 5);
    const actOf = id => d.acts.find(a => a.id === id);
    const minor = m.minor === undefined ? `<div class="card"><h3>Are you a minor (under 18)?</h3><p class="mut">If yes, a parent or guardian must give permission to use this portal.</p>
    <button class="btn" data-a="minor" data-id="1">Yes</button> <button class="btn ghost" data-a="minor" data-id="0">No</button></div>` : "";
    return `<div class="banner"><h1>${greet()}, ${esc(m.name.split(",").pop().trim().split(" ")[0])}!</h1>
  <p>${d.sec?.name ? "Section " + esc(d.sec.name) : ""}${S.set.term ? " · " + esc(S.set.term) : ""} · ${fday(Date.now())}</p></div>
  ${minor}
  ${todo[0] ? `<div class="dueb"><div><small>Due next</small><b>${esc(todo[0].a.title)}</b><span>${esc(subjName(d, loadOf(d, todo[0].a)))} · ${todo[0].a.closes ? "closes " + fdate(todo[0].a.closes) : "no deadline"}</span></div><a class="btn" href="#/take/${todo[0].a.id}">${todo[0].st === "progress" ? "Resume" : "Start"}</a></div>` : ""}
  <div class="cards stats4">${stat("Activities to do", todo.length, todo.length ? "Start with the earliest deadline" : "You're all caught up", "clock", todo.length ? "warn" : "ok")}
  ${stat("Completed", `${d.subs.length}/${d.acts.length}`, "Activities answered", "check", "ok")}
  ${stat("Average score", avg == null ? "–" : avg + "%", "Across graded activities", "star")}
  ${stat("Attempts left", left, "On open activities", "list")}</div>
  <div class="cols dash2"><div class="card"><h3>Due soon</h3>${todo.slice(0, 5).map(x => `<div class="item"><div><b>${esc(x.a.title)}</b><div class="mut sm">${esc(subjName(d, loadOf(d, x.a)))} · ${dueTxt(x.a)}</div></div><a class="btn sm" href="#/take/${x.a.id}">${x.st === "progress" ? "Resume" : "Start"}</a></div>`).join("") || empty("Nothing due right now.", "check")}</div>
  <div class="card"><h3>Recent scores</h3>${recent.map(s => `<div class="item"><div><b>${esc(actOf(s.actId)?.title || "Activity")}</b><div class="mut sm">${pend(s) ? "Awaiting grading" : ""}</div></div><div style="min-width:110px"><b>${pend(s) ? "…" : sp(s) + "%"}</b>${bar(pend(s) ? 0 : sp(s), sp(s) < 75 ? "warn" : "ok")}</div></div>`).join("") || empty("No scores yet.", "chart")}</div></div>
  <h2>My subjects</h2><div class="cards">${d.loads.map(l => subjCard(d, l)).join("") || `<div class="card">${empty("No subjects assigned to your section yet.", "book")}</div>`}</div>
  <h2>Latest announcements</h2>${await annHtml(3)}`;
};
act.minor = async (el) => { const m = el.dataset.id === "1"; await updateDoc(doc(db, "users", S.me.uid), { minor: m, parentOk: !m }); S.me.minor = m; toast(m ? "Please have your parent/guardian confirm with your adviser." : "Saved."); go("home"); };
/* ---------- subjects ---------- */
pages.subjects = async () => {
    const d = await data();
    return head("My subjects", `${d.sec?.name || ""}`) + `<div class="sjgrid">${d.loads.map(l => subjCard(d, l)).join("") || `<div class="card">${empty("No subjects assigned to your section yet.", "book")}</div>`}</div>`;
};
/* one subject = Term filter > Week strip > Timeline | Classwork | Learning Materials (all filtering happens on the phone, no reloading) */
const V = {};
const NOTEXT = { mat: "book", ann: "bell", act: "list" };
const itemsOf = () => [...V.mats.map(x => ({ k: "mat", x })), ...V.anns.map(x => ({ k: "ann", x })), ...V.as.map(x => ({ k: "act", x }))].map(i => ({ ...i, term: i.x.term || 0, week: i.x.week || 0, at: ts(i.x.at) }));
/* posts that have no term/week yet (older ones) show under "All" weeks of every term, at the bottom */
const inView = i => V.week === 0 ? (i.term === V.term || i.term === 0) : (i.term === V.term && i.week === V.week);
const matRow = m => `<div class="item"><div><b>${esc(m.title)}</b>${m.note ? `<div class="mut sm">${esc(m.note)}</div>` : ""}<div class="mut sm">${fdate(ts(m.at))}</div></div><a class="btn sm" href="${esc(m.url)}" target="_blank" rel="noopener noreferrer">Open</a></div>`;
const annRow = x => `<div class="item"><div><b>${esc(x.title || "Announcement")}</b><p>${esc(x.text).replace(/\n/g, "<br>")}</p><div class="mut sm">${fdate(ts(x.at))}</div></div></div>`;
const actRow = a => {
    const s = V.d.sm[a.id], st = status(a, s), [lb, k] = SB[st], used = s?.attempts || 0;
    return `<div class="item"><div style="min-width:0"><b>${esc(a.title)}</b> ${badge(lb, k)}
  <div class="mut sm">${a.opens && Date.now() < a.opens ? "Opens " + fdate(a.opens) + " · " : ""}${dueTxt(a)} · ${a.questions.length} items · ${a.totalPts} pts · ${a.timeLimit ? a.timeLimit + " min · " : ""}${Math.max(0, a.attempts - used)} attempt(s) left</div>
  ${s ? `<div class="sm"><b>Score:</b> ${scoreTxt(s)}</div>` : ""}${linksHtml(a)}</div>
  <div class="row">${st === "open" || st === "progress" || st === "retake" ? `<a class="btn sm" href="#/take/${a.id}">${st === "progress" ? "Resume" : st === "retake" ? "Retake" : "Start"}</a>` : ""}${s ? `<a class="btn sm ghost" href="#/result/${a.id}">Result</a>` : ""}</div></div>`;
};
const rowOf = i => i.k === "act" ? actRow(i.x) : i.k === "mat" ? matRow(i.x) : annRow(i.x);
const groupBy = (arr, f) => { const g = {}; arr.forEach(i => (g[f(i)] ??= []).push(i)); return g; };
const byTopic = (arr, cls) => {
    const g = groupBy(arr, i => i.x.topic || ""), ks = Object.keys(g).sort((a, b) => !a ? 1 : !b ? -1 : a.localeCompare(b));
    return ks.map(t => `<div class="card"><h3>${t ? esc(t) : "Other"}</h3>${g[t].map(rowOf).join("")}</div>`).join("");
};
function sjView() {
    const all = itemsOf();
    const inTerm = all.filter(i => i.term === V.term), maxW = Math.max(10, ...inTerm.map(i => i.week));
    const todoAct = i => i.k === "act" && ["open", "progress"].includes(status(i.x, V.d.sm[i.x.id]));
    const weeks = [0, ...Array.from({ length: maxW }, (_, i) => i + 1)];
    const wk = weeks.map(w => {
        const its = inTerm.filter(i => w === 0 || i.week === w), hot = its.some(todoAct);
        return `<button class="wk ${V.week === w ? "on" : ""}" data-a="sj_week" data-w="${w}">${w ? "Wk " + w : "All"}${hot ? `<i class="dot hot"></i>` : its.length && w ? `<i class="dot"></i>` : ""}</button>`;
    }).join("");
    const vis = all.filter(inView).sort((a, b) => b.at - a.at), acts = vis.filter(i => i.k === "act").sort((a, b) => (a.x.closes || 9e15) - (b.x.closes || 9e15)), mats = vis.filter(i => i.k === "mat");
    const cnt = { timeline: vis.length, work: acts.length, mats: mats.length };
    const tab = (k, l) => `<button class="seg ${V.tab === k ? "on" : ""}" data-a="sj_tab" data-k="${k}">${l}<span class="n">${cnt[k]}</span></button>`;
    let body = "";
    if (V.tab === "timeline") {
        const due = V.as.filter(a => a.closes && ["open", "progress", "retake"].includes(status(a, V.d.sm[a.id]))).sort((a, b) => a.closes - b.closes).slice(0, 3);
        const g = groupBy(vis, i => i.week), ks = Object.keys(g).map(Number).sort((a, b) => b - a);
        body = (due.length ? `<div class="card due"><h3>Due soon</h3>${due.map(a => `<div class="item"><div><b>${esc(a.title)}</b><div class="mut sm">${dueTxt(a)}</div></div><a class="btn sm" href="#/take/${a.id}">Open</a></div>`).join("")}</div>` : "") +
            (ks.map(w => `<div class="tlg"><div class="tlh">${w ? "Week " + w : "Earlier posts"}</div>${g[w].map(i => `<div class="tl"><span class="tli">${ic(NOTEXT[i.k])}</span><div class="tlb">${rowOf(i)}</div></div>`).join("")}</div>`).join("") || `<div class="card">${empty("Nothing posted for this selection yet.", "clock")}</div>`);
    }
    else if (V.tab === "work") {
        const F = { all: "All", todo: "To do", done: "Done", missed: "Missed" }, stOf = i => status(i.x, V.d.sm[i.x.id]);
        const ok = i => V.f === "all" || (V.f === "todo" && ["open", "progress", "retake"].includes(stOf(i))) || (V.f === "done" && ["done", "retake"].includes(stOf(i))) || (V.f === "missed" && stOf(i) === "missed");
        const list = acts.filter(ok);
        body = `<div class="fchips">${Object.entries(F).map(([k, l]) => `<button class="wk ${V.f === k ? "on" : ""}" data-a="sj_f" data-k="${k}">${l}</button>`).join("")}</div>` + (byTopic(list) || `<div class="card">${empty("No classwork here.", "list")}</div>`);
    }
    else
        body = byTopic(mats) || `<div class="card">${empty("No learning materials here.", "book")}</div>`;
    return `<div class="sjnav"><div class="termwrap"><button class="termbtn" data-a="sj_menu" aria-haspopup="listbox" aria-expanded="${V.menu ? "true" : "false"}">${ic("clock")}<span>Term ${V.term}</span><i class="caret">▾</i></button>
  ${V.menu ? `<div class="termmenu" role="listbox">${[1, 2, 3].map(t => `<button class="${V.term === t ? "on" : ""}" role="option" aria-selected="${V.term === t}" data-a="sj_term" data-t="${t}">Term ${t}${V.term === t ? " ✓" : ""}</button>`).join("")}</div>` : ""}</div>
  <div class="wks" aria-label="Week">${wk}</div>
  <div class="tabs">${tab("timeline", "Timeline")}${tab("work", "Classwork")}${tab("mats", "Learning Materials")}</div></div>${body}`;
}
const sjDraw = () => { const w = document.getElementById("sjw"); if (w)
    w.innerHTML = sjView(); };
act.sj_menu = () => { V.menu = !V.menu; sjDraw(); };
act.sj_term = el => { V.term = +el.dataset.t; V.week = 0; V.menu = false; sjDraw(); };
document.addEventListener("click", e => { if (V.menu && !e.composedPath().some(n => n instanceof Element && n.matches(".termwrap"))) {
    V.menu = false;
    sjDraw();
} });
act.sj_week = el => { V.week = +el.dataset.w; sjDraw(); };
act.sj_tab = el => { V.tab = el.dataset.k; sjDraw(); };
act.sj_f = el => { V.f = el.dataset.k; sjDraw(); };
pages.subject = async ([id, tab0]) => {
    const d = await data(), l = d.loads.find(x => x.id === id);
    if (!l)
        return `<div class="card">${empty("Subject not found.")}<p class="right"><a class="btn" href="#/subjects">Back</a></p></div>`;
    /* Ask Firestore only for this student's section (what the rules allow), then pick this subject here. */
    const sid = S.me.sectionId;
    const [mats, anns] = await Promise.all([list("materials", where("sectionId", "==", sid)).catch(() => []), list("classAnn", where("sectionId", "==", sid)).catch(() => [])]);
    Object.assign(V, { d, l, mats: mats.filter(m => m.loadId === id), anns: anns.filter(x => x.loadId === id), as: d.acts.filter(a => a.loadId === id), week: 0, menu: false, tab: tab0 === "mats" ? "mats" : "timeline", f: "all", term: curTerm() });
    const all = itemsOf();
    if (!all.some(i => i.term === V.term) && all.length)
        V.term = [1, 2, 3].find(t => all.some(i => i.term === t)) ?? V.term;
    const s = d.subjects.find(x => x.id === l.subjectId) || {};
    return `<div class="sjtop" style="--c:${colorOf(s.name || l.id)}"><a class="back" href="#/subjects">← Subjects</a><h1>${esc(subjName(d, l))}</h1>${l.teacherName ? `<div>Teacher: ${esc(l.teacherName)}</div>` : ""}</div><div id="sjw">${sjView()}</div>`;
};