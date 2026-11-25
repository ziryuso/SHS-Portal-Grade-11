/**
 * sf9-page.js - "SF9 Report Card" section (own menu item).
 * Route: #/sf9  or  #/sf9/<sectionId>  or  #/sf9/<sectionId>/<studentUid>
 * Pick a section, then a learner, to view and print their SF9 (Learner's Performance Report).
 * Who: the administrator (any section) and teachers who are advisers (their advisory sections only).
 * Data: user profile + section + curriculum + finalGrades (only grades the administrator has approved).
 */
import { S, chg, db, doc, empty, esc, getDoc, head, list, where } from "./core.js";
import { curriculumFor, termsOf } from "./grades.js";
import { sf9Html, fitSF9, SF9_CORE } from "./sf9.js";

const byName = (a, b) => (a.name || "").localeCompare(b.name || "");
const norm = s => String(s || "").toLowerCase().replace(/\s+/g, " ").trim();
const gradeNo = sec => String(sec.grade || (/\b12\b|XII/i.test(sec.name || "") ? "Grade 12" : "Grade 11")).replace(/\D+/g, "") || "11";
const note = msg => `${head("SF9 Report Card")}<div class="card">${empty(msg, "file")}</div>`;

/* menu entry used by app.js: admin always, teachers only when they are an adviser */
export const sf9Nav = () => (S.me.role === "admin" || (S.me.role === "teacher" && S.advSecs.length)) ? [{ k: "sf9", l: "SF9 Report Card", i: "file" }] : [];

function ensureCss() {
    if (document.querySelector("link[data-sf9]")) return;
    const l = document.createElement("link");
    l.rel = "stylesheet"; l.href = "sf9.css"; l.dataset.sf9 = "1";
    document.head.append(l);
}

export async function sf9Page([sid, uid]) {
    ensureCss();
    if (S.me.role !== "admin" && !(S.me.role === "teacher" && S.advSecs.length))
        return note("The SF9 can be opened by the section adviser or the administrator.");
    const secs = (S.me.role === "admin" ? await list("sections") : [...S.advSecs]).sort(byName);
    if (!secs.length) return note("No sections yet.");
    sid = secs.some(s => s.id === sid) ? sid : secs[0].id;
    const sy = S.set.schoolYear;
    const [ss, users, subjects, fg] = await Promise.all([
        getDoc(doc(db, "sections", sid)), list("users", where("sectionId", "==", sid)),
        list("subjects"), list("finalGrades", where("sectionId", "==", sid))
    ]);
    const sec = { id: sid, ...(ss.exists() ? ss.data() : {}) };
    const studs = users.filter(u => u.role === "student" && u.status === "approved").sort(byName);
    const idx = Math.max(0, studs.findIndex(u => u.id === uid)), stu = studs[idx];

    const secOpts = secs.map(s => `<option value="${esc(s.id)}" ${s.id === sid ? "selected" : ""}>${esc(s.name)}</option>`).join("");
    const stuOpts = studs.map(u => `<option value="${esc(u.id)}" ${u.id === stu?.id ? "selected" : ""}>${esc(u.name)}</option>`).join("");
    const link = (u, label) => u ? `<a class="btn ghost" href="#/sf9/${sid}/${u.id}">${label}</a>` : `<button class="btn ghost" disabled>${label}</button>`;
    const bar = `<div class="card noprint"><div class="row" style="gap:14px;align-items:flex-end;flex-wrap:wrap">
      <div><label class="f" for="sf9s">Section</label><select id="sf9s" data-c="sf9sec" style="min-width:200px">${secOpts}</select></div>
      <div><label class="f" for="sf9u">Student</label><select id="sf9u" data-c="sf9stu" data-sid="${esc(sid)}" style="min-width:280px" ${studs.length ? "" : "disabled"}>${stuOpts || "<option>No approved students</option>"}</select></div>
      ${link(studs[idx - 1], "← Previous")}${link(studs[idx + 1], "Next →")}
      <span style="flex:1"></span>${stu ? `<button class="btn" data-a="print">Print SF9</button>` : ""}</div>
      ${stu ? `<p class="hint" style="margin:8px 0 0">Student ${idx + 1} of ${studs.length}. Only grades finalized by the administrator appear. Print on A4 landscape with background graphics on.</p>` : ""}</div>`;
    const top = head("SF9 Report Card", "Learner's Performance Report" + (sy ? " · SY " + sy : "")) + bar;
    if (!stu) return top + `<div class="card">${empty("No approved students in this section yet.", "users")}</div>`;

    /* this learner's grades per subject and term (final grades only) */
    const g = {};
    fg.filter(x => x.uid === stu.id && (!sy || x.schoolYear === sy)).forEach(x => { (g[x.subjectId] ??= {})[x.term] = x.grade; });
    const cur = curriculumFor(sec, subjects), core = cur.core.flatMap(s => s.combo ? [s, ...(s.parts || [])] : [s]);
    const grades = {};
    SF9_CORE.forEach(label => {
        const s = core.find(x => norm(x.name) === norm(label));
        if (s) grades[label] = { 1: g[s.id]?.[1], 2: g[s.id]?.[2], 3: g[s.id]?.[3] };
    });
    /* the SF9 has three elective rows: one per term */
    const electives = [1, 2, 3].map(t => {
        const s = cur.elective.find(x => { const T = termsOf(x); return T.length === 1 && T[0] === t; });
        return s ? { name: s.name, grade: g[s.id]?.[t] } : {};
    });

    S.after = () => { S.cleanup = fitSF9(document.querySelector(".sf9-wrap")); };
    return top + `<div class="sf9-wrap">${sf9Html({
        name: stu.name, lrn: stu.lrn, age: stu.age, sex: stu.sex,
        grade: gradeNo(sec), section: sec.name, track: sec.track || "",
        schoolYear: sy, grades, electives
    })}</div>`;
}

chg.sf9sec = el => { location.hash = "#/sf9/" + el.value; };
chg.sf9stu = el => { location.hash = `#/sf9/${el.dataset.sid}/${el.value}`; };
