/**
 * sf9-page.js - SF9 (Learner's Performance Report) for one learner, route: #/sf9/<sectionId>/<studentUid>
 * Who can open it: the section's adviser (teacher) and the administrator.
 * Data: user profile + section + curriculum + finalGrades (only grades the admin has approved).
 */
import { S, act, db, doc, empty, esc, getDoc, list, where } from "./core.js";
import { curriculumFor, termsOf } from "./grades.js";
import { sf9Html, SF9_CORE } from "./sf9.js";
import { pages as teacherPages } from "./teacher-shared.js";
import { pages as adminPages } from "./admin-shared.js";

const norm = s => String(s || "").toLowerCase().replace(/\s+/g, " ").trim();
const gradeNo = sec => String(sec.grade || (/\b12\b|XII/i.test(sec.name || "") ? "Grade 12" : "Grade 11")).replace(/\D+/g, "") || "11";
const bar = `<div class="row between noprint" style="margin-bottom:10px"><button class="btn ghost" data-a="sf9back">← Back</button><button class="btn" data-a="print">Print SF9</button></div>`;
const note = msg => `<div class="card">${empty(msg, "file")}<p class="right"><button class="btn" data-a="sf9back">Back</button></p></div>`;

function ensureCss() {
    if (document.querySelector("link[data-sf9]")) return;
    const l = document.createElement("link");
    l.rel = "stylesheet"; l.href = "sf9.css"; l.dataset.sf9 = "1";
    document.head.append(l);
}

async function sf9Page([sid, uid]) {
    ensureCss();
    if (!sid || !uid) return note("Choose a learner first.");
    if (S.me.role === "teacher" && !S.advSecs.some(s => s.id === sid)) return note("Only the section adviser can open the SF9.");
    const sy = S.set.schoolYear;
    const [ss, users, subjects, fg] = await Promise.all([
        getDoc(doc(db, "sections", sid)), list("users", where("sectionId", "==", sid)),
        list("subjects"), list("finalGrades", where("sectionId", "==", sid))
    ]);
    const stu = users.find(u => u.id === uid && u.role === "student");
    if (!ss.exists() || !stu) return note("Learner not found in this section.");
    const sec = { id: sid, ...ss.data() }, cur = curriculumFor(sec, subjects);

    /* per-subject, per-term grades of this learner (final grades only) */
    const g = {};
    fg.filter(x => x.uid === uid && (!sy || x.schoolYear === sy)).forEach(x => { (g[x.subjectId] ??= {})[x.term] = x.grade; });
    const core = cur.core.flatMap(s => s.combo ? [s, ...(s.parts || [])] : [s]);
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

    return bar + `<div class="sf9-wrap">${sf9Html({
        name: stu.name, lrn: stu.lrn, age: stu.age, sex: stu.sex,
        grade: gradeNo(sec), section: sec.name, track: sec.track || "",
        schoolYear: sy, grades, electives
    })}</div>`;
}

act.sf9back = () => history.back();
teacherPages.sf9 = sf9Page;
adminPages.sf9 = sf9Page;
