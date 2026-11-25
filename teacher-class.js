/**
 * teacher-class.js - My Classes list and the class page: classwork, class record, students, item analysis, topics, materials, announcements.
 */
import {
    S, act, addDoc, ask, badge, bar, btn, collection,
    db, deleteDoc, doc, empty, errMsg, esc, fdate, getDoc,
    head, ic, list, log, pct, refresh, saveCsv, serverTimestamp,
    stat, tbl, toast, ts, updateDoc, where, writeBatch
} from "./core.js";
import {
    TW, XF, byName, chunk, counted, ensureTopic, fdlg, fm, mean, mini,
    myLoads, newXid, pages, siblingLoads, sp, studentsFor, subsFor, twBadge, xBadge
} from "./teacher-shared.js";

/* ---------- classes (each class card opens the class) ---------- */
pages.classes = async () => {
    const loads = await myLoads(), ids = loads.map(l => l.id);
    const [acts0, subs, studs] = await Promise.all([ids.length ? list("activities", where("by", "==", S.me.uid)) : [], subsFor(ids), studentsFor(loads.map(l => l.sectionId))]);
    const acts = acts0.filter(a => a.v === 2);
    return head("My classes") + `<div class="cards">${loads.map(l => {
        const n = studs.filter(s => s.sectionId === l.sectionId).length, as = acts.filter(a => a.loadId === l.id && !a.draft), ss = subs.filter(s => s.loadId === l.id), avg = mean(ss.filter(counted).map(sp)), comp = pct(ss.length, n * as.length);
        return `<a class="card subj clk" href="#/load/${l.id}" aria-label="Open ${esc(l.sn)}, ${esc(l.sec)}"><span class="chip">${esc(l.sec)}</span><h3>${esc(l.sn)}</h3><div class="mut sm">${n} students · ${as.length} activities</div>
    <div class="row between sm" style="margin-top:8px"><span>Completion</span><b>${comp}%</b></div>${bar(comp)}<div class="row between sm"><span>Class average</span><b>${fm(avg)}</b></div></a>`;
    }).join("") || `<div class="card">${empty("No classes assigned yet.", "book")}</div>`}</div>`;
};
/* ---------- one class ---------- */
async function ctx(id) {
    const ls = await getDoc(doc(db, "loads", id));
    if (!ls.exists())
        return null;
    const ld = { id, ...ls.data() };
    if (ld.teacherUid !== S.me.uid)
        return null;
    const safe = p => p.catch(() => []), byAt = (x, y) => ts(x.at) - ts(y.at);
    const [subj, sec, studs, acts, subs, topics, mats, anns] = await Promise.all([getDoc(doc(db, "subjects", ld.subjectId)), getDoc(doc(db, "sections", ld.sectionId)), studentsFor([ld.sectionId]),
        list("activities", where("loadId", "==", id)), list("submissions", where("loadId", "==", id)),
        safe(list("topics", where("loadId", "==", id))), safe(list("materials", where("loadId", "==", id))), safe(list("classAnn", where("loadId", "==", id)))]);
    return { ld, sn: subj.data()?.name || "Subject", secName: sec.data()?.name || "Section", studs, acts: acts.filter(a => a.v === 2).sort(byAt), subs, topics: topics.sort(byAt), mats: mats.sort((x, y) => byAt(y, x)), anns: anns.sort((x, y) => byAt(y, x)) };
}
const tabs = (id, cur) => `<div class="tabs">${[["activities", "Classwork"], ["record", "Class record"], ["students", "Students"], ["analysis", "Item analysis"]].map(([k, l]) => `<a class="${k === cur ? "on" : ""}" href="#/load/${id}/${k}">${l}</a>`).join("")}</div>`;
pages.load = async ([id, tab = "activities", extra]) => {
    const c = await ctx(id);
    if (!c)
        return `<div class="card">${empty("Class not found.")}<p class="right"><a class="btn" href="#/classes">Back</a></p></div>`;
    const cur = tab === "results" ? "activities" : tab === "student" ? "students" : tab;
    const hd = head(c.sn, `${c.secName} · ${c.studs.length} students`, `<a class="btn ghost" href="#/classes">← Classes</a>`) + tabs(id, cur);
    const subOf = (uid, aid) => c.subs.find(s => s.uid === uid && s.actId === aid);
    const pub = c.acts.filter(a => !a.draft);
    const rankRows = () => {
        const r = c.studs.map(s => { const mine = pub.map(a => subOf(s.id, a.id)).filter(Boolean), gr = mine.filter(counted); return { s, n: mine.length, av: mean(gr.map(sp)), comp: pct(mine.length, pub.length), pend: mine.length - gr.length }; })
            .sort((x, y) => (y.av ?? -1) - (x.av ?? -1) || y.comp - x.comp || byName(x.s, y.s));
        let last = null;
        r.forEach((x, i) => { x.rank = last && last.av === x.av && last.comp === x.comp ? last.rank : i + 1; last = x; });
        return r;
    };
    /* who turned in / attempted / not started, for one activity */
    if (tab === "results") {
        const a = c.acts.find(x => x.id === extra);
        if (!a)
            return hd + `<div class="card">${empty("Activity not found.")}</div>`;
        const rows = c.studs.map(s => { const x = subOf(s.id, a.id), n = x?.attempts || 0; return { s, x, n, st: !x ? "Not started" : n >= a.attempts ? "Completed" : "Attempted" }; })
            .sort((p, q) => ["Completed", "Attempted", "Not started"].indexOf(p.st) - ["Completed", "Attempted", "Not started"].indexOf(q.st) || byName(p.s, q.s));
        const cnt = k => rows.filter(r => r.st === k).length, tone = { Completed: "ok", Attempted: "warn", "Not started": "mut" };
        S.tmp = { name: `${a.title}-students.csv`, rows: [["Student", "LRN", "Status", "Score %", "Attempts", "Last submitted"], ...rows.map(r => [r.s.name, r.s.lrn || "", r.st, r.x ? (counted(r.x) ? sp(r.x) : "pending") : "", r.n, r.x ? fdate(ts(r.x.at)) : ""])] };
        return hd + `<div class="card"><div class="row between"><div><h3>${esc(a.title)}</h3><div class="mut sm">${a.topic ? esc(a.topic) + " · " : ""}${a.attempts} attempt(s) allowed</div></div><div class="row"><a class="btn ghost" href="#/load/${id}/activities">← Classwork</a><button class="btn ghost" data-a="csvrec">${ic("file")} Export CSV</button></div></div>
    <div class="statgrp" style="margin-top:10px">${mini("Completed", cnt("Completed"), "check", "ok")}${mini("Attempted", cnt("Attempted"), "clock", "warn")}${mini("Not started", cnt("Not started"), "users")}</div></div>
    <div class="card">${tbl(["Student", "Status", "Score", "Attempts", "Last submitted", "Tab switches"], rows.map(r => [esc(r.s.name), badge(r.st, tone[r.st]), r.x ? (counted(r.x) ? `<b>${sp(r.x)}%</b>` : "pending") : "–", r.x ? `${r.n}/${a.attempts}` : "–", r.x ? fdate(ts(r.x.at)) : "–", r.x ? (r.x.tabSwitches || 0) : "–"]), "No students in this section yet.", "rec nw")}
    <p class="hint">Attempted: attempts left. Completed: all attempts used.</p></div>`;
    }
    /* ranking of students */
    if (tab === "students") {
        const rk = rankRows(), top = rk.filter(r => r.av != null).slice(0, 3);
        S.tmp = { name: `${c.sn}-${c.secName}-ranking.csv`, rows: [["Rank", "Student", "LRN", "Average %", "Completion %", "Turned in"], ...rk.map(r => [r.rank, r.s.name, r.s.lrn || "", r.av ?? "", r.comp, r.n + "/" + pub.length])] };
        return hd + `<div class="card"><div class="row between"><h3>Student ranking</h3><button class="btn ghost" data-a="csvrec">${ic("file")} Export CSV</button></div>
    ${top.length ? `<div class="statgrp" style="margin:6px 0 12px">${top.map(r => `<a class="stat" href="#/load/${id}/student/${r.s.id}"><div class="si">${r.rank}</div><div><div class="sv">${fm(r.av)}</div><div class="sl">${esc(r.s.name)}</div></div></a>`).join("")}</div>` : ""}
    ${tbl(["Student", "Rank", "Average", "Completion", "Turned in", "To grade"], rk.map(r => [`<a href="#/load/${id}/student/${r.s.id}">${esc(r.s.name)}</a>`, r.av == null ? "–" : "#" + r.rank, r.av == null ? "–" : `<b>${r.av}%</b>${r.av < 75 ? " " + badge("Below 75", "warn") : ""}`, r.comp + "%", `${r.n}/${pub.length}`, r.pend || "–"]), "No students in this section yet.", "rec nw")}
    <p class="hint">Ranked by average, then completion. Missing work isn't counted as zero.</p></div>`;
    }
    /* one student's report */
    if (tab === "student") {
        const s = c.studs.find(x => x.id === extra);
        if (!s)
            return hd + `<div class="card">${empty("Student not found.", "users")}</div>`;
        const r = rankRows().find(x => x.s.id === s.id);
        return hd + `<div class="card"><div class="row between"><div><h3>${esc(s.name)}</h3><div class="mut sm">${esc(s.email || "")}${s.lrn ? " · LRN " + esc(s.lrn) : ""}</div></div><a class="btn ghost" href="#/load/${id}/students">← Ranking</a></div>
    <div class="statgrp" style="margin-top:10px">${mini("Rank", r.av == null ? "–" : "#" + r.rank, "star")}${mini("Average", fm(r.av), "chart")}${mini("Completion", r.comp + "%", "check", "ok")}${mini("Turned in", `${r.n}/${pub.length}`, "list")}</div></div>
    <div class="card">${tbl(["Activity", "Topic", "Status", "Score", "Attempts"], pub.map(a => { const x = subOf(s.id, a.id), n = x?.attempts || 0; return [esc(a.title), esc(a.topic || "–"), x ? badge(n >= a.attempts ? "Completed" : "Attempted", n >= a.attempts ? "ok" : "warn") : badge("Not started", "mut"), x ? (counted(x) ? `<b>${sp(x)}%</b>` : "pending") : "–", x ? `${n}/${a.attempts}` : "–"]; }), "No activities posted yet.", "rec nw")}</div>`;
    }
    if (tab === "record") {
        const cols = pub, rows = c.studs.map(s => {
            const mine = cols.map(a => subOf(s.id, a.id)), done = mine.filter(Boolean), av = mean(done.filter(counted).map(sp));
            return { s, mine, av, comp: pct(done.length, cols.length) };
        });
        const rep = cols.map(a => { const ss = c.subs.filter(s => s.actId === a.id), n = new Set(ss.map(s => s.uid)).size; return { a, n, p: pct(n, c.studs.length), avg: mean(ss.filter(counted).map(sp)) }; });
        S.tmp = { name: `${c.sn}-${c.secName}-class-record.csv`, rows: [["Student", "LRN", ...cols.map(a => `${a.title} (${a.totalPts})`), "Average %", "Completion %"],
                ...rows.map(r => [r.s.name, r.s.lrn || "", ...r.mine.map(x => x ? (counted(x) ? sp(x) + "%" : "pending") : ""), r.av ?? "", r.comp])] };
        return hd + `<div class="card"><h3>Activity reports</h3>${tbl(["Activity", "Topic", "Turned in", "% answered", "Class avg", ""], rep.map(r => [esc(r.a.title), esc(r.a.topic || "–"), `${r.n}/${c.studs.length}`, `<div style="min-width:110px"><b>${r.p}%</b>${bar(r.p)}</div>`, fm(r.avg), `<a class="btn sm ghost" href="#/load/${id}/results/${r.a.id}">Students</a>`]), "No activities posted yet.", "rec nw")}
    </div>
    <div class="card"><div class="row between"><h3>Scores per student</h3><button class="btn ghost" data-a="csvrec">${ic("file")} Export CSV</button></div>
    ${tbl(["Student", ...cols.map(a => esc(a.title)), "Avg", "Done"], [...rows.map(r => [esc(r.s.name), ...r.mine.map(x => x ? (counted(x) ? sp(x) + "%" : `<span class="mut">…</span>`) : `<span class="mut">–</span>`), `<b>${fm(r.av)}</b>`, r.comp + "%"]),
            { c: [`<b>Class average</b>`, ...cols.map(a => `<b>${fm(mean(c.subs.filter(s => s.actId === a.id && counted(s)).map(sp)))}</b>`), `<b>${fm(mean(rows.map(r => r.av).filter(x => x != null)))}</b>`, ""] }], "No students in this section yet.", "rec nw")}
    <p class="hint">“…” = essay waiting to be graded.</p></div>`;
    }
    if (tab === "analysis") {
        const a = c.acts.find(x => x.id === extra) || c.acts[0];
        if (!a)
            return hd + `<div class="card">${empty("Post an activity first.", "chart")}</div>`;
        const ss = c.subs.filter(s => s.actId === a.id), gs = ss.filter(counted).map(sp);
        const dist = [["90–100%", x => x >= 90], ["75–89%", x => x >= 75 && x < 90], ["60–74%", x => x >= 60 && x < 75], ["Below 60%", x => x < 60]];
        const qa = a.questions.map((q, i) => {
            if (q.t === "es")
                return { i, q, es: true };
            const r = ss.map(s => s.qres?.[i]).filter(x => x != null), p = r.length ? Math.round(100 * r.reduce((x, y) => x + y, 0) / r.length) : null;
            const wrong = {};
            ss.forEach(s => { if ((s.qres?.[i] ?? 1) < 1 && s.answers?.[i] && typeof s.answers[i] === "string") {
                const k = s.answers[i];
                wrong[k] = (wrong[k] || 0) + 1;
            } });
            const top = Object.entries(wrong).sort((x, y) => y[1] - x[1])[0];
            return { i, q, p, top };
        });
        const hardest = qa.filter(x => x.p != null).sort((x, y) => x.p - y.p)[0];
        return hd + `<div class="row" style="margin-bottom:12px">${c.acts.map(x => `<a class="btn sm ${x.id === a.id ? "" : "ghost"}" href="#/load/${id}/analysis/${x.id}">${esc(x.title)}</a>`).join("")}</div>
    <div class="cards">${stat("Submitted", `${new Set(ss.map(s => s.uid)).size}/${c.studs.length}`, "Students", "users")}${stat("Mean score", fm(mean(gs)), "", "star")}${stat("Highest", gs.length ? Math.max(...gs) + "%" : "–", "", "chart", "ok")}${stat("Lowest", gs.length ? Math.min(...gs) + "%" : "–", "", "chart", "bad")}</div>
    <div class="cols"><div class="card"><h3>Score distribution</h3>${dist.map(([l, f]) => { const n = gs.filter(f).length; return `<div class="sm row between"><span>${l}</span><b>${n}</b></div>${bar(pct(n, gs.length))}`; }).join("")}</div>
    <div class="card"><h3>Hardest item</h3>${hardest ? `<p><b>Q${hardest.i + 1}</b> — only ${hardest.p}% got it right.</p><p class="mut">${esc(hardest.q.p)}</p>` : empty("No data yet.")}</div></div>
    <div class="card" style="margin-top:14px"><h3>Item analysis</h3>${qa.map(x => `<div class="item"><div style="flex:1;min-width:220px"><b>Q${x.i + 1}.</b> ${esc(x.q.p)}${x.es ? `<div class="mut sm">Essay — graded manually</div>` : `${bar(x.p || 0, x.p != null && x.p < 50 ? "bad" : x.p < 75 ? "warn" : "ok")}${x.top ? `<div class="mut sm">Most common wrong answer: “${esc(x.top[0])}” (${x.top[1]})</div>` : ""}`}</div>${x.es ? "" : `<b>${fm(x.p)}</b>`}</div>`).join("")}</div>`;
    }
    /* classwork: topic first, each topic holds Announcements, Materials and Tests */
    const state = a => a.draft ? ["Draft", "mut"] : a.opens && Date.now() < a.opens ? ["Scheduled", "info"] : a.closes && Date.now() > a.closes ? ["Closed", "bad"] : ["Open", "ok"];
    const testItem = a => {
        const ss = c.subs.filter(s => s.actId === a.id), tg = ss.filter(s => s.graded === false).length, [sl, sk] = state(a);
        return `<div class="item tst"><div style="flex:1;min-width:220px"><b>${esc(a.title)}</b> ${badge(sl, sk)}${twBadge(a)}${xBadge(a)}${a.release ? " " + badge("Answers released", "ok") : ""}
    <div class="mut sm">${[`${a.questions.length} items`, `${a.totalPts} pts`, `${a.attempts} attempt${a.attempts > 1 ? "s" : ""}`, a.timeLimit ? a.timeLimit + " min" : "", a.closes ? "Due " + fdate(a.closes) : "", a.opens && Date.now() < a.opens ? "Opens " + fdate(a.opens) : ""].filter(Boolean).join(" · ")}</div>
    ${a.draft ? "" : `<div class="sm"><b>${new Set(ss.map(s => s.uid)).size}</b> of ${c.studs.length} turned in · Avg <b>${fm(mean(ss.filter(counted).map(sp)))}</b>${tg ? ` · <a href="#/grade/${a.id}">${badge(tg + " to grade", "warn")}</a>` : ""}</div>`}</div>
    <div class="row">${a.draft ? "" : `<a class="btn sm" href="#/load/${id}/results/${a.id}">Students</a>`}${a.hasEssay ? `<a class="btn sm ghost" href="#/grade/${a.id}">Grade</a>` : ""}${ED ? `<a class="btn sm ghost" href="#/editor/${id}/${a.id}">Edit</a>${btn("relact", a.release ? "Hide answers" : "Release answers", a.id, "ghost")}${btn("dupact", "Duplicate", a.id, "ghost")}${btn("delact", "Delete", a.id, "danger")}` : ""}</div></div>`;
    };
    const annItem = x => `<div class="item"><div><b>${esc(x.title || "Announcement")}</b>${twBadge(x)}${xBadge(x)}<p>${esc(x.text).replace(/\n/g, "<br>")}</p><div class="mut sm">${fdate(ts(x.at))}</div></div>${ED ? `<div class="row">${btn("t_tag", "Term/Week", x.id, "ghost", `data-col="classAnn" data-t="${x.term || ""}" data-w="${x.week || ""}"`)}${btn("t_delann", "Delete", x.id, "danger")}</div>` : ""}</div>`;
    const matItem = m => `<div class="item"><div><b>${esc(m.title)}</b>${twBadge(m)}${xBadge(m)}${m.note ? `<div class="mut sm">${esc(m.note)}</div>` : ""}<div class="mut sm">${fdate(ts(m.at))}</div></div><div class="row"><a class="btn sm ghost" href="${esc(m.url)}" target="_blank" rel="noopener noreferrer">Open</a>${ED ? btn("t_tag", "Term/Week", m.id, "ghost", `data-col="materials" data-t="${m.term || ""}" data-w="${m.week || ""}"`) + btn("t_delmat", "Delete", m.id, "danger") : ""}</div></div>`;
    const fold = (t, n, items) => `<div class="fold2"><div class="fh"><span class="sp">${t}</span><span class="badge mut">${n}</span></div>${items.join("") || `<p class="mut sm">Nothing yet.</p>`}</div>`;
    const docNames = new Set(c.topics.map(t => t.name));
    const legacy = [...new Set([...c.acts.map(a => a.topic), ...c.mats.map(m => m.topic), ...c.anns.map(x => x.topic)].filter(n => n && !docNames.has(n)))];
    const sortT = l => [...l].sort((x, y) => (x.draft ? 0 : 1) - (y.draft ? 0 : 1) || ts(y.at) - ts(x.at));
    const recent = l => [...l].sort((x, y) => ts(y.at) - ts(x.at));
    /* most recently touched topic first */
    const lastOf = t => Math.max(ts(c.topics.find(x => x.name === t)?.at), ...[...c.acts, ...c.mats, ...c.anns].filter(x => x.topic === t).map(x => ts(x.at)), 0);
    const names = [...c.topics.map(t => t.name), ...legacy].sort((x, y) => lastOf(y) - lastOf(x));
    const topicCard = t => {
        const td = c.topics.find(x => x.name === t), e = esc(t), ex = `data-topic="${e}"`, ed = EDIT.has(t), open = OPEN.has(t);
        ED = ed;
        const an = recent(c.anns.filter(x => x.topic === t)), ma = recent(c.mats.filter(m => m.topic === t)), te = sortT(c.acts.filter(a => a.topic === t));
        const html = `<div class="card tpc ${open ? "open" : ""}"><div class="tph"><button class="tpt" data-a="t_tog" data-topic="${e}" aria-expanded="${open}"><span class="car" aria-hidden="true">▸</span><span class="tn">${e}</span><span class="mut sm">${an.length} news · ${ma.length} materials · ${te.length} tests</span></button>
      <button class="btn sm" data-a="t_create" data-id="${id}" ${ex}>+ Create</button></div>
      <div class="tpb"><div class="row between tpbar"><span class="mut sm">${ed ? "Edit mode" : ""}</span>
      <div class="row">${ed ? `${td ? btn("t_deltopic", "Delete topic", td.id, "ghost", `data-lid="${id}" ${ex}`) : ""}${btn("t_save", "Save", "", "", ex)}` : btn("t_edit", "Edit", "", "ghost", ex)}</div></div>
      ${fold("Announcements", an.length, an.map(annItem))}${fold("Materials", ma.length, ma.map(matItem))}${fold("Tests", te.length, te.map(testItem))}</div></div>`;
        ED = false;
        return html;
    };
    const loose = { a: c.acts.filter(a => !a.topic), m: c.mats.filter(m => !m.topic) };
    ED = true;
    const looseHtml = loose.a.length || loose.m.length ? `<div class="card"><h3>No topic</h3><p class="hint">Older items. Edit a test to give it a topic.</p>${loose.m.map(matItem).join("")}${sortT(loose.a).map(testItem).join("")}</div>` : "";
    ED = false;
    return hd + `<div class="row between" style="margin-bottom:10px"><span class="mut sm">${names.length} topics · ${c.acts.filter(a => a.draft).length} drafts</span>${btn("t_addtopic", "+ New topic", id)}</div>` +
        (names.map(topicCard).join("") + looseHtml
            || `<div class="card">${empty("No topics yet. Create one to start.", "list")}</div>`);
};
/* topic accordion state survives page refreshes; Edit mode is per topic */
let ED = false;
const OPEN = new Set(), EDIT = new Set();
act.t_tog = el => { const t = el.dataset.topic, card = el.closest(".tpc"), o = !card.classList.contains("open"); card.classList.toggle("open", o); el.setAttribute("aria-expanded", o); o ? OPEN.add(t) : OPEN.delete(t); };
act.t_edit = el => { EDIT.add(el.dataset.topic); OPEN.add(el.dataset.topic); refresh(); };
act.t_save = el => { EDIT.delete(el.dataset.topic); toast("Saved."); refresh(); };
/* one "+ Create" button: pick announcement, material or test */
act.t_create = el => {
    const topic = el.dataset.topic, id = el.dataset.id, d = document.createElement("dialog");
    d.className = "modal";
    d.innerHTML = `<h3>Create in “${esc(topic)}”</h3><div class="cr"><button class="btn" data-g="t_addann">Announcement</button><button class="btn" data-g="t_addmat">Material</button><button class="btn" data-g="t_newtest">Test</button></div><div class="end"><button class="btn ghost" data-g="x">Cancel</button></div>`;
    const fin = () => { d.close(); d.remove(); };
    d.addEventListener("click", async (e) => {
        const b = e.target.closest("[data-g]");
        if (!b)
            return;
        fin();
        if (b.dataset.g === "x")
            return;
        OPEN.add(topic);
        try {
            await act[b.dataset.g]({ dataset: { id, topic } });
        }
        catch (err) {
            toast(errMsg(err), "bad");
        }
    });
    d.addEventListener("cancel", e => { e.preventDefault(); fin(); });
    document.body.append(d);
    d.showModal();
};
act.csvrec = () => S.tmp && saveCsv(S.tmp.name, S.tmp.rows);
const loadOf = async (lid) => (await getDoc(doc(db, "loads", lid))).data();
act.t_addtopic = async (el) => {
    const lid = el.dataset.id, old = await list("topics", where("loadId", "==", lid)).catch(() => []);
    const r = await fdlg("New topic", [{ k: "n", l: "Topic name", ph: "e.g. Unit 7 – Trigonometry", req: 1 }], "Create", o => old.some(t => t.name.toLowerCase() === o.n.toLowerCase()) ? "That topic already exists." : "");
    if (!r)
        return;
    const ld = await loadOf(lid);
    await addDoc(collection(db, "topics"), { loadId: lid, sectionId: ld.sectionId, name: r.n.slice(0, 80), by: S.me.uid, at: serverTimestamp() });
    log("created topic " + r.n);
    toast("Topic created.");
    refresh();
};
act.t_deltopic = async (el) => {
    const lid = el.dataset.lid, name = el.dataset.topic;
    const [as, ms, ns] = await Promise.all([list("activities", where("loadId", "==", lid)), list("materials", where("loadId", "==", lid)), list("classAnn", where("loadId", "==", lid))]);
    if (as.some(a => a.topic === name))
        return toast("Delete this topic's tests first.", "bad");
    if (!await ask(`Delete the topic “${name}” with its announcements and materials?`, "Delete", true))
        return;
    const b = writeBatch(db);
    ms.filter(m => m.topic === name).forEach(m => b.delete(doc(db, "materials", m.id)));
    ns.filter(x => x.topic === name).forEach(x => b.delete(doc(db, "classAnn", x.id)));
    b.delete(doc(db, "topics", el.dataset.id));
    await b.commit();
    toast("Topic deleted.");
    refresh();
};
act.t_addann = async (el) => {
    const sibs = await siblingLoads(el.dataset.id);
    const r = await fdlg("New announcement", [{ k: "t", l: "Title", req: 1 }, { k: "x", l: "Message", ta: 1, req: 1 }, ...TW(), ...XF(sibs)], "Post");
    if (!r)
        return;
    const ld = await loadOf(el.dataset.id), xs = sibs.filter(l => (r.xs || []).includes(l.id)), xid = xs.length ? newXid() : "";
    const base = { topic: el.dataset.topic, term: +r.term, week: +r.week, title: r.t, text: r.x, by: S.me.uid, at: serverTimestamp(), ...(xid ? { xid } : {}) };
    const b = writeBatch(db);
    b.set(doc(collection(db, "classAnn")), { ...base, loadId: el.dataset.id, sectionId: ld.sectionId });
    for (const l of xs) {
        await ensureTopic(b, l, el.dataset.topic);
        b.set(doc(collection(db, "classAnn")), { ...base, loadId: l.id, sectionId: l.sectionId });
    }
    await b.commit();
    log("class announcement " + r.t);
    toast(xs.length ? `Announcement posted to ${xs.length + 1} sections.` : "Announcement posted.");
    refresh();
};
act.t_tag = async (el) => {
    const r = await fdlg("Move to term / week", TW(+el.dataset.t || 0, +el.dataset.w || 0), "Save");
    if (!r)
        return;
    await updateDoc(doc(db, el.dataset.col, el.dataset.id), { term: +r.term, week: +r.week });
    toast("Moved.");
    refresh();
};
act.t_delann = async (el) => { if (await ask("Delete this announcement?", "Delete", true)) {
    await deleteDoc(doc(db, "classAnn", el.dataset.id));
    toast("Deleted.");
    refresh();
} };
act.t_addmat = async (el) => {
    const sibs = await siblingLoads(el.dataset.id);
    const r = await fdlg("New material", [{ k: "t", l: "Title", ph: "e.g. Module 3", req: 1 }, { k: "u", l: "Link (Google Drive, etc.)", type: "url", ph: "https://", req: 1 }, { k: "n", l: "Note" }, ...TW(), ...XF(sibs)], "Post", o => /^https?:\/\//i.test(o.u) ? "" : "The link must start with http:// or https://");
    if (!r)
        return;
    const ld = await loadOf(el.dataset.id), xs = sibs.filter(l => (r.xs || []).includes(l.id)), xid = xs.length ? newXid() : "";
    const base = { topic: el.dataset.topic, term: +r.term, week: +r.week, title: r.t, url: r.u, note: r.n, by: S.me.uid, at: serverTimestamp(), ...(xid ? { xid } : {}) };
    const b = writeBatch(db);
    b.set(doc(collection(db, "materials")), { ...base, loadId: el.dataset.id, sectionId: ld.sectionId });
    for (const l of xs) {
        await ensureTopic(b, l, el.dataset.topic);
        b.set(doc(collection(db, "materials")), { ...base, loadId: l.id, sectionId: l.sectionId });
    }
    await b.commit();
    log("posted material " + r.t);
    toast(xs.length ? `Material posted to ${xs.length + 1} sections.` : "Material posted.");
    refresh();
};
act.t_delmat = async (el) => { if (await ask("Delete this material?", "Delete", true)) {
    await deleteDoc(doc(db, "materials", el.dataset.id));
    toast("Deleted.");
    refresh();
} };
act.relact = async (el) => { const r = doc(db, "activities", el.dataset.id), cur = (await getDoc(r)).data().release; await updateDoc(r, { release: !cur }); toast(cur ? "Answers hidden from students." : "Answers released to students."); location.reload(); };
act.delact = async (el) => {
    if (!await ask("Delete this activity and ALL student submissions for it? This cannot be undone.", "Delete", true))
        return;
    const id = el.dataset.id, subs = await list("submissions", where("actId", "==", id));
    for (const part of chunk(subs, 400)) {
        const b = writeBatch(db);
        part.forEach(s => b.delete(doc(db, "submissions", s.id)));
        await b.commit();
    }
    const b = writeBatch(db);
    b.delete(doc(db, "keys", id));
    b.delete(doc(db, "activities", id));
    await b.commit();
    log("deleted activity " + id);
    toast("Activity deleted.");
    location.reload();
};
act.dupact = async (el) => {
    const id = el.dataset.id, [a, k] = await Promise.all([getDoc(doc(db, "activities", id)), getDoc(doc(db, "keys", id))]);
    if (!k.exists())
        return toast("The answer key for this activity is missing, so it cannot be duplicated.", "bad");
    const ref = doc(collection(db, "activities")), b = writeBatch(db);
    b.set(ref, { ...a.data(), title: a.data().title + " (copy)", draft: true, opens: 0, closes: 0, release: false, at: serverTimestamp(), updatedAt: serverTimestamp() });
    b.set(doc(db, "keys", ref.id), k.data());
    await b.commit();
    toast("Duplicated. It is saved as a draft — edit it to publish.");
    location.reload();
};
