/**
 * teacher-grading.js - manual grading of essays, advisory approvals, announcements.
 */
import {
    $, S, act, annHtml, badge, btn, db, doc,
    empty, esc, getDoc, go, head, ic, list, log,
    qMax, refresh, serverTimestamp, tbl, toast, updateDoc, where
} from "./core.js";
import { consolidated } from "./grades.js";
import { byName, counted, fm, mean, pages, sp, studentsFor } from "./teacher-shared.js";

/* ---------- manual grading (essays) ---------- */
pages.grade = async ([id]) => {
    const as = await getDoc(doc(db, "activities", id));
    if (!as.exists() || as.data().by !== S.me.uid)
        return `<div class="card">${empty("Activity not found.")}</div>`;
    const a = { id, ...as.data() }, [subs, ks, studs] = await Promise.all([list("submissions", where("actId", "==", id)), getDoc(doc(db, "keys", id)), studentsFor([a.sectionId])]);
    const key = ks.exists() ? ks.data().ans : {}, ess = a.questions.map((q, i) => ({ q, i })).filter(x => x.q.t === "es");
    subs.sort((x, y) => (x.graded === false ? 0 : 1) - (y.graded === false ? 0 : 1));
    return head("Grade: " + a.title, `${subs.length} submission(s)`, `<a class="btn ghost" href="#/load/${a.loadId}/activities">← Back</a>`) +
        (ess.length ? subs.map(s => `<div class="card" data-sub="${s.id}"><div class="row between"><b>${esc(studs.find(u => u.id === s.uid)?.name || s.alias || "Student")}</b>${s.graded === false ? badge("Needs grading", "warn") : badge("Graded: " + (s.manualTotal || 0) + "/" + a.manualMax, "ok")}</div>
    <p class="mut sm">Auto-scored: ${s.best}/${a.autoTotal} · Tab switches: ${s.tabSwitches || 0}</p>
    ${ess.map(({ q, i }) => `<div class="item" style="align-items:flex-start"><div style="flex:1;min-width:240px"><b>${i + 1}. ${esc(q.p)}</b>${q.img ? `<img class="qimg thumb" src="${q.img}" alt="">` : ""}<p style="white-space:pre-wrap">${esc(s.answers?.[i] || "(blank)")}</p>${key[i] ? `<div class="mut sm">Rubric: ${esc(key[i])}</div>` : ""}</div>
    <div style="width:120px"><label class="f" for="g_${s.id}_${i}">Points / ${qMax(q)}</label><input id="g_${s.id}_${i}" type="number" min="0" max="${qMax(q)}" step="0.5" value="${s.manual?.[i] ?? ""}"></div></div>`).join("")}
    <p><button class="btn" data-a="savegrade" data-id="${s.id}" data-act="${id}">Save grade</button></p></div>`).join("") || `<div class="card">${empty("No submissions yet.")}</div>` : `<div class="card">${empty("This activity has no essay items.")}</div>`);
};
act.savegrade = async (el) => {
    const sid = el.dataset.id, a = (await getDoc(doc(db, "activities", el.dataset.act))).data(), manual = {};
    let sum = 0;
    for (let i = 0; i < a.questions.length; i++) {
        const q = a.questions[i];
        if (q.t !== "es")
            continue;
        const raw = $(`#g_${sid}_${i}`).value;
        if (raw === "")
            return toast("Enter points for every essay item (0 if none).", "bad");
        const p = +raw;
        if (isNaN(p) || p < 0 || p > qMax(q))
            return toast(`Points for item ${i + 1} must be between 0 and ${qMax(q)}.`, "bad");
        manual[i] = p;
        sum += p;
    }
    await updateDoc(doc(db, "submissions", sid), { manual, manualTotal: sum, graded: true, gradedAt: serverTimestamp() });
    log("graded submission " + sid);
    toast("Grade saved.");
    refreshGrade(el.dataset.act);
};
const refreshGrade = id => go("grade/" + id);
/* ---------- advisory ---------- */
pages.advisory = async ([sid]) => {
    if (!S.advSecs.length)
        return `<div class="card">${empty("No advisory section assigned.", "users")}</div>`;
    const sec = S.advSecs.find(s => s.id === sid) || S.advSecs[0];
    const [users, loads, subjects, subs] = await Promise.all([list("users", where("sectionId", "==", sec.id)), list("loads", where("sectionId", "==", sec.id)), list("subjects"), list("submissions", where("sectionId", "==", sec.id))]);
    const studs = users.filter(u => u.role === "student"), pending = studs.filter(u => u.status === "pending"), ok = studs.filter(u => u.status === "approved").sort(byName);
    const cols = loads.map(l => ({ id: l.id, n: subjects.find(s => s.id === l.subjectId)?.name || "?" }));
    const av = (uid, lid) => mean(subs.filter(s => s.uid === uid && s.loadId === lid && counted(s)).map(sp));
    const rows = ok.map(s => { const vals = cols.map(c => av(s.id, c.id)), got = vals.filter(x => x != null); return { s, vals, gen: mean(got) }; });
    S.tmp = { name: `${sec.name}-consolidated-grades.csv`, rows: [["Student", "LRN", ...cols.map(c => c.n), "General average"], ...rows.map(r => [r.s.name, r.s.lrn || "", ...r.vals.map(x => x ?? ""), r.gen ?? ""])] };
    return head("Advisory – " + sec.name, `${ok.length} enrolled student(s)`) +
        (S.advSecs.length > 1 ? `<div class="row" style="margin-bottom:12px">${S.advSecs.map(s => `<a class="btn sm ${s.id === sec.id ? "" : "ghost"}" href="#/advisory/${s.id}">${esc(s.name)}</a>`).join("")}</div>` : "") +
        `<div class="card"><h3>Pending student approvals</h3>${tbl(["Name", "LRN", "Email", ""], pending.map(x => [esc(x.name), esc(x.lrn || "–"), esc(x.email), btn("apvstu", "Approve", x.id, "ok")]), "No pending students.")}</div>
  ${await consolidated(sec, ok)}<div class="card"><div class="row between"><h3>Activity averages</h3><button class="btn ghost" data-a="csvrec">${ic("file")} Export CSV</button></div>
  ${tbl(["Student", ...cols.map(c => esc(c.n)), "General avg"], rows.map(r => [esc(r.s.name), ...r.vals.map(fm), `<b>${fm(r.gen)}</b>`]), "No approved students yet.", "rec nw")}
  <p class="hint">Best graded score per activity. Missing work isn't counted as zero.</p></div>`;
};
act.apvstu = async (el) => { await updateDoc(doc(db, "users", el.dataset.id), { status: "approved" }); log("approved student " + el.dataset.id); toast("Student approved."); refresh(); };
pages.announcements = async () => head("Announcements") + await annHtml(30);
