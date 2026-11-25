/**
 * student-subjects.js - dashboard, subject list and the subject page (timeline, classwork, materials).
 */
import {
    S, act, chg, annHtml, badge, bar, db, doc, empty,
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
/* one subject = hero, "Coming up", then ONE feed (filter by term, week, topic or type; all on the phone, no reloading) */
const V = {};
const itemsOf = () => [...V.mats.map(x => ({ k: "mat", x })), ...V.anns.map(x => ({ k: "ann", x })), ...V.as.map(x => ({ k: "act", x }))].map(i => ({ ...i, term: i.x.term || 0, week: i.x.week || 0, at: ts(i.x.at) }));
/* older posts without a term show under every term */
const inTerm = i => i.term === V.term || i.term === 0;
const sd = ms => ms ? new Date(ms).toLocaleString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "";
const ICON = { act: ["quiz", "QUIZ"], mat: ["mat", "MAT"], ann: ["news", "NEWS"] };
const fRow = i => {
    const x = i.x, [cls, lb] = ICON[i.k], wk = x.week ? " · Wk " + x.week : "";
    let title = esc(x.title || "Announcement"), meta = "", acts = "";
    if (i.k === "act") {
        const s = V.d.sm[x.id], st = status(x, s), [sl, sk] = SB[st], used = s?.attempts || 0, left = Math.max(0, x.attempts - used);
        title += " " + badge(sl, sk);
        meta = `Test · ${x.questions.length} items · ${x.totalPts} pts${x.timeLimit ? " · " + x.timeLimit + " min" : ""} · ${left} attempt${left === 1 ? "" : "s"} left${x.closes ? " · " + dueTxt(x) : ""}${x.opens && Date.now() < x.opens ? " · Opens " + fdate(x.opens) : ""}${s ? `<br><b>Score:</b> ${scoreTxt(s)}` : ""}`;
        acts = (["open", "progress", "retake"].includes(st) ? `<a class="btn sm" href="#/take/${x.id}">${st === "progress" ? "Resume" : st === "retake" ? "Retake" : "Start"}</a>` : "") + (s ? `<a class="btn sm ghost" href="#/result/${x.id}">Result</a>` : "");
        meta += linksHtml(x);
    }
    else if (i.k === "mat") {
        meta = `Material${wk} · ${sd(i.at)}${x.note ? `<br>${esc(x.note)}` : ""}`;
        acts = `<a class="btn sm ghost" href="${esc(x.url)}" target="_blank" rel="noopener noreferrer">Open</a>`;
    }
    else
        meta = `Announcement${wk} · ${sd(i.at)}<br>${esc(x.text).replace(/\n/g, "<br>")}`;
    return `<div class="fitem"><span class="fi ${cls}">${lb}</span><div class="fb"><b>${title}</b><span>${meta}</span></div><div class="fa">${acts}</div></div>`;
};
function sjView() {
    const all = itemsOf(), base = all.filter(inTerm), weeks = [...new Set(base.map(i => i.week).filter(Boolean))].sort((p, q) => p - q);
    const topics = [...new Set(base.map(i => i.x.topic).filter(Boolean))].sort((p, q) => p.localeCompare(q));
    const vis = base.filter(i => (!V.week || i.week === V.week) && (!V.topic || i.x.topic === V.topic) && (V.type === "all" || (V.type === "work" ? i.k === "act" : i.k === "mat"))).sort((p, q) => q.at - p.at);
    const nxt = V.as.filter(a => ["open", "progress", "retake"].includes(status(a, V.d.sm[a.id]))).sort((p, q) => (p.closes || 9e15) - (q.closes || 9e15))[0];
    const chip = (a, k, val, on, l) => `<a href="#/subject/${V.l.id}" class="${on ? "on" : ""}" data-a="${a}" data-${k}="${esc(val)}">${l}</a>`;
    return `<div class="row" style="margin-bottom:10px"><select data-c="sj_term" aria-label="Term">${[1, 2, 3].map(t => `<option value="${t}" ${V.term === t ? "selected" : ""}>Term ${t}</option>`).join("")}</select></div>
  <div class="wchips">${chip("sj_week", "w", 0, !V.week, "All")}${weeks.map(w => chip("sj_week", "w", w, V.week === w, "Wk " + w)).join("")}</div>
  <div class="feedgrid"><div class="side2">
    <div class="card"><h3>Coming up</h3>${nxt ? `<b>${esc(nxt.title)}</b><p class="mut sm">${nxt.closes ? "Closes " + fdate(nxt.closes) : "No deadline"}</p><a class="btn" style="width:100%;justify-content:center" href="#/take/${nxt.id}">${V.d.sm[nxt.id] && status(nxt, V.d.sm[nxt.id]) === "progress" ? "Resume" : "Start"}</a>` : `<p class="mut sm">You're all caught up.</p>`}</div>
    ${topics.length ? `<div class="card"><h3>Topics</h3>${chip("sj_topic", "t", "", !V.topic, "All topics").replace('class="', 'class="tp ')}${topics.map(t => chip("sj_topic", "t", t, V.topic === t, esc(t) + `<span>${base.filter(i => i.x.topic === t).length}</span>`).replace('class="', 'class="tp ')).join("")}</div>` : ""}
  </div><div>
    <div class="wchips">${chip("sj_type", "k", "all", V.type === "all", "All")}${chip("sj_type", "k", "work", V.type === "work", "Classwork")}${chip("sj_type", "k", "mats", V.type === "mats", "Materials")}</div>
    ${vis.map(fRow).join("") || `<div class="card">${empty("Nothing posted for this selection yet.", "clock")}</div>`}
  </div></div>`;
}
const sjDraw = () => { const w = document.getElementById("sjw"); if (w)
    w.innerHTML = sjView(); };
act.sj_week = el => { V.week = +el.dataset.w; sjDraw(); };
act.sj_topic = el => { V.topic = el.dataset.t || ""; sjDraw(); };
act.sj_type = el => { V.type = el.dataset.k; sjDraw(); };
chg.sj_term = el => { V.term = +el.value; V.week = 0; V.topic = ""; sjDraw(); };
pages.subject = async ([id, tab0]) => {
    const d = await data(), l = d.loads.find(x => x.id === id);
    if (!l)
        return `<div class="card">${empty("Subject not found.")}<p class="right"><a class="btn" href="#/subjects">Back</a></p></div>`;
    /* Ask Firestore only for this student's section (what the rules allow), then pick this subject here. */
    const sid = S.me.sectionId;
    const [mats, anns] = await Promise.all([list("materials", where("sectionId", "==", sid)).catch(() => []), list("classAnn", where("sectionId", "==", sid)).catch(() => [])]);
    Object.assign(V, { d, l, mats: mats.filter(m => m.loadId === id), anns: anns.filter(x => x.loadId === id), as: d.acts.filter(a => a.loadId === id), week: 0, topic: "", type: tab0 === "mats" ? "mats" : "all", term: curTerm() });
    const all = itemsOf();
    if (!all.some(i => i.term === V.term) && all.length)
        V.term = [1, 2, 3].find(t => all.some(i => i.term === t)) ?? V.term;
    return `<div class="hero"><a class="back" href="#/subjects">← Subjects</a><h1>${esc(subjName(d, l))}</h1><p>${l.teacherName ? "Teacher: " + esc(l.teacherName) + " · " : ""}${d.sec?.name ? "Section " + esc(d.sec.name) : ""}${S.set.term ? " · " + esc(S.set.term) : ""}</p></div><div id="sjw">${sjView()}</div>`;
};
