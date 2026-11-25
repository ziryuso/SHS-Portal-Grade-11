/**
 * student-shared.js - shared data loading and activity status helpers.
 */
import { S, badge, bar, esc, fdate, ic, list, pct, where } from "./core.js";
export const pages = {};

/* ---------- data + status helpers ---------- */
export async function data() {
    const sid = S.me.sectionId;
    const [loads, subjects, acts, subs, secs] = await Promise.all([
        list("loads", where("sectionId", "==", sid)), list("subjects"),
        list("activities", where("sectionId", "==", sid)),
        list("submissions", where("uid", "==", S.me.uid)), list("sections")
    ]);
    const A = acts.filter(a => a.v === 2 && !a.draft).sort((a, b) => (a.closes || 9e15) - (b.closes || 9e15));
    return { loads, subjects, acts: A, subs, sm: Object.fromEntries(subs.map(x => [x.actId, x])), sec: secs.find(x => x.id === sid) };
}
export const linksHtml = a => (a.links || []).length ? `<div class="row" style="margin-top:6px">${a.links.map(l => `<a class="btn sm ghost" href="${esc(l.u)}" target="_blank" rel="noopener noreferrer">${ic("file")} ${esc(l.t || "Open file")}</a>`).join("")}</div>` : "";
const dkey = id => "draft2:" + S.me.uid + ":" + id;
export const getDraft = id => { try {
    return JSON.parse(localStorage.getItem(dkey(id)));
}
catch {
    return null;
} };
export const putDraft = (id, d) => { try {
    localStorage.setItem(dkey(id), JSON.stringify(d));
}
catch { } };
export const dropDraft = id => { try {
    localStorage.removeItem(dkey(id));
}
catch { } };
export function status(a, s) {
    const n = Date.now(), used = s?.attempts || 0;
    if (used >= a.attempts)
        return "done";
    if (a.opens && n < a.opens)
        return "soon";
    if (a.closes && n > a.closes)
        return used ? "done" : "missed";
    return used ? "retake" : (getDraft(a.id) ? "progress" : "open");
}
export const SB = { done: ["Completed", "ok"], retake: ["Completed · retake open", "ok"], progress: ["In progress", "warn"], open: ["Not started", "info"], soon: ["Not yet open", "mut"], missed: ["Missed", "bad"] };
export const sp = s => pct((s.best || 0) + (s.manualTotal || 0), s.total);
export const pend = s => s.graded === false;
export const scoreTxt = s => pend(s) ? `${s.best}/${s.total} so far · awaiting teacher grading` : `${(s.best || 0) + (s.manualTotal || 0)}/${s.total} (${sp(s)}%)`;
export const subjName = (d, l) => d.subjects.find(x => x.id === l?.subjectId)?.name || "Subject";
export const loadOf = (d, a) => d.loads.find(l => l.id === a.loadId);
export const dueTxt = a => a.closes ? "Due " + fdate(a.closes) : "No deadline";
function progressOf(d, loadId) { const as = d.acts.filter(a => a.loadId === loadId), done = as.filter(a => d.sm[a.id]).length; return { n: as.length, done, p: pct(done, as.length) }; }
export const curTerm = () => { const n = +((S.set.term || "").match(/\d/) || [1])[0]; return n >= 1 && n <= 3 ? n : 1; };
const COLORS = ["#1d4ed8", "#0f766e", "#6d28d9", "#b45309", "#be185d", "#0369a1"];
export const colorOf = id => COLORS[[...String(id)].reduce((n, c) => n + c.charCodeAt(0), 0) % COLORS.length];
const ring = (p, c) => `<div class="ring"><svg viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="15.5" fill="none" stroke="var(--line)" stroke-width="4"/><circle cx="18" cy="18" r="15.5" fill="none" stroke="${c}" stroke-width="4" stroke-linecap="round" pathLength="100" stroke-dasharray="${p} 100"/></svg><i>${p}%</i></div>`;
export const subjCard = (d, l) => {
    const s = d.subjects.find(x => x.id === l.subjectId) || {}, pr = progressOf(d, l.id), as = d.acts.filter(a => a.loadId === l.id), c = colorOf(s.name || l.id);
    const sts = as.map(a => status(a, d.sm[a.id])), todo = sts.filter(x => x === "open" || x === "progress").length, miss = sts.filter(x => x === "missed").length;
    const next = as.filter((a, i) => ["open", "progress", "retake"].includes(sts[i]) && a.closes)[0];
    const nextTxt = next ? " · next due " + new Date(next.closes).toLocaleDateString("en-PH", { weekday: "short" }) : miss ? " · overdue" : "";
    return `<div class="sjcard" style="--c:${c}"><div class="bar4"></div><div class="in"><div class="hd">${ring(pr.p, c)}<div><h3>${esc(s.name || "Subject")}</h3>${l.teacherName ? `<div class="t">Teacher: ${esc(l.teacherName)}</div>` : ""}</div></div>
  <div>${todo ? badge(todo + " to do", "warn") : ""}${miss ? badge(miss + " missed", "bad") : ""}${!todo && !miss ? badge(pr.n ? "All caught up" : "No activities yet", "ok") : ""}</div>
  <div class="mut sm">${pr.done} of ${pr.n} done${nextTxt}</div>
  <div class="btns"><a class="btn" href="#/subject/${l.id}">Open</a><a class="btn ghost" href="#/subject/${l.id}/mats">Materials</a></div></div></div>`;
};
