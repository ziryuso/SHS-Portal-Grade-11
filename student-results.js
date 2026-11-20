/**
 * student-results.js - result review, term grades, announcements, profile.
 */
import {
    S, act, addDoc, annHtml, ask, badge, collection, db,
    doc, esc, fdate, getDoc, head, list, norm, qMax,
    serverTimestamp, tbl, toast, ts
} from "./core.js";
import { termGradeStudent } from "./grades.js";
import { photoCard } from "./profile.js";
import { pages, pend, scoreTxt, sp, status } from "./student-shared.js";
import { gate } from "./student-take.js";

/* ---------- result + review ---------- */
pages.result = async ([id]) => {
    const [as, ss] = await Promise.all([getDoc(doc(db, "activities", id)), getDoc(doc(db, "submissions", id + "_" + S.me.uid))]);
    if (!as.exists() || !ss.exists())
        return gate("No result found for this activity.");
    const a = { id, ...as.data() }, s = ss.data(), st = status(a, s), back = "#/subject/" + a.loadId;
    let review = `<div class="card"><b>Answer review</b><p class="mut">Your teacher has not released the answer key yet. It will appear here once released.</p></div>`;
    if (a.release) {
        let key = null;
        try {
            const k = await getDoc(doc(db, "keys", id));
            key = k.exists() ? k.data().ans : null;
        }
        catch { }
        if (key)
            review = `<h2>Answer review</h2>` + a.questions.map((q, i) => {
                const x = s.answers?.[i], r = s.qres?.[i] ?? 0, k = key[i];
                let body = "", cls = "rv ";
                if (q.t === "es") {
                    const p = s.manual?.[i];
                    cls += p == null ? "" : p >= qMax(q) ? "good" : p > 0 ? "part" : "wrong";
                    body = `<div><b>Your answer:</b><p style="white-space:pre-wrap">${esc(x || "(blank)")}</p></div>${k ? `<div><b>Model answer / rubric:</b><p style="white-space:pre-wrap">${esc(k)}</p></div>` : ""}<div class="sm">Points: ${p == null ? "awaiting grading" : p + " / " + qMax(q)}</div>`;
                }
                else if (q.t === "mt") {
                    cls += r === 1 ? "good" : r > 0 ? "part" : "wrong";
                    body = q.l.map((l, j) => { const ok = norm(x?.[j]) === norm(k?.[j]); return `<div class="sm ${ok ? "ok" : "bad"}">${esc(l)} → ${esc(x?.[j] || "(blank)")}${ok ? " ✓" : ` ✗ (correct: ${esc(k?.[j] || "")})`}</div>`; }).join("");
                }
                else {
                    cls += r === 1 ? "good" : "wrong";
                    body = `<div>Your answer: <b class="${r === 1 ? "ok" : "bad"}">${esc(x || "(blank)")}</b></div>${r === 1 ? "" : `<div>Correct answer: <b>${esc(String(k || "").split("|").join(" / "))}</b></div>`}`;
                }
                return `<div class="card ${cls}"><b>${i + 1}. ${esc(q.p)}</b>${q.img ? `<img class="qimg" src="${q.img}" alt="">` : ""}${body}</div>`;
            }).join("");
    }
    const left = Math.max(0, a.attempts - s.attempts);
    return head(a.title, "", `<a class="btn ghost" href="${back}">← Back to subject</a>`) +
        `<div class="card"><div class="row" style="gap:24px"><div><div class="big ${pend(s) ? "" : sp(s) >= 75 ? "ok" : "bad"}">${pend(s) ? "…" : sp(s) + "%"}</div><div class="mut">${pend(s) ? "Pending teacher grading" : "Your best score"}</div></div>
  <div><p><b>${scoreTxt(s)}</b></p><p class="mut">Attempts used: ${s.attempts} of ${a.attempts}${s.scores?.length > 1 ? " · Scores: " + s.scores.map(x => x.s).join(", ") : ""}</p>
  <p class="mut sm">Submitted ${fdate(ts(s.at))}</p></div></div>${st === "retake" ? `<p><a class="btn" href="#/take/${id}">Retake (${left} left)</a></p>` : ""}</div>` + review;
};
/* ---------- grades ---------- */
pages.grades = termGradeStudent;
pages.announcements = async () => head("Announcements", "From the school administration") + await annHtml(30);
/* ---------- profile ---------- */
pages.profile = async () => {
    const m = S.me, secs = await list("sections"), sec = secs.find(x => x.id === m.sectionId);
    return head("My profile") + `${photoCard()}<div class="card">${tbl(["Field", "Details"], [["Section", esc(sec?.name || "–")], ["LRN", esc(m.lrn || "Not provided")], ["Alias", `${esc(m.alias)} <span class="mut sm">(classmates see only this)</span>`], ["School year", esc(S.set.schoolYear || "–")], ["Account status", badge("Approved", "ok")]])}</div>
  <div class="card"><h3>Need a change?</h3><p class="mut">Requests are sent to the administrator.</p>
  <button class="btn ghost" data-a="reqfix">Request name / section correction</button> <button class="btn danger" data-a="reqdel">Request account deletion</button></div>
  <div class="card"><button class="btn ghost" data-a="out">Log out</button></div>`;
};
const req = async (type) => {
    if (!await ask("Send this request to the administrator?", "Send"))
        return;
    await addDoc(collection(db, "requests"), { uid: S.me.uid, email: S.me.email, type, done: false, at: serverTimestamp() });
    toast("Request sent to the administrator.");
};
act.reqfix = () => req("name/section correction");
act.reqdel = () => req("delete account");
act.print = () => print();