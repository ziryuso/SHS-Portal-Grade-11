/**
 * admin-people.js - dashboard, approvals and accounts.
 */
import {
    $, S, act, annHtml, ask, badge, btn, count,
    db, deleteDoc, doc, esc, fdate, fday, greet, head,
    limit, list, log, orderBy, refresh, stat, tbl, toast,
    ts, updateDoc, where
} from "./core.js";
import { SB, byName, pages } from "./admin-shared.js";
import { cal, calHtml, calReset, loadCal } from "./admin-calendar.js";

/* ---------- dashboard ---------- */
/* the teacher's name is copied into every load; keep those copies in step with the teacher's account */
export async function syncNames(tch, loads) {
    tch = tch || await list("users", where("role", "==", "teacher"));
    loads = loads || await list("loads");
    const nm = Object.fromEntries(tch.map(t => [t.id, t.name])), stale = loads.filter(l => nm[l.teacherUid] && nm[l.teacherUid] !== l.teacherName);
    await Promise.all(stale.map(l => updateDoc(doc(db, "loads", l.id), { teacherName: nm[l.teacherUid] }).then(() => { l.teacherName = nm[l.teacherUid]; })));
    return stale.length;
}
act.syncnames = async () => { const n = await syncNames(); toast(n ? `Updated the teacher name on ${n} subject load(s).` : "Teacher names are already up to date."); refresh(); };
pages.home = async () => {
    syncNames().catch(() => { });
    const [stu, tea, pend, secs, acts, subs, reqs, logs, pending, calItems] = await Promise.all([
        count("users", where("role", "==", "student"), where("status", "==", "approved")), count("users", where("role", "==", "teacher"), where("status", "==", "approved")),
        count("users", where("status", "==", "pending")), count("sections"), count("activities"), count("submissions"),
        list("requests", where("done", "==", false)), list("logs", orderBy("at", "desc"), limit(6)), list("users", where("status", "==", "pending")), loadCal()
    ]);
    cal.ev = calItems;
    calReset();
    return `<div class="banner"><h1>${greet()}, Administrator</h1><p>${fday(Date.now())}</p></div>
  <div class="cards">${stat("Students", stu, "Approved", "users")}${stat("Teachers", tea, "Approved", "users", "ok")}${stat("Sections", secs, "", "grid")}
  ${stat("Pending approvals", pend, "Students and teachers", "clock", pend ? "warn" : "ok")}${stat("Open requests", reqs.length, "From students", "bell", reqs.length ? "warn" : "ok")}${stat("Activities / Submissions", `${acts} / ${subs}`, "All time", "chart")}</div>
  <div class="card"><h3>Calendar</h3><div id="cal">${calHtml()}</div></div>
  <div class="cols"><div class="card"><h3>Waiting for approval</h3>${tbl(["Name", "Role", ""], pending.slice(0, 6).map(x => [esc(x.name), esc(x.role), btn("apv", "Approve", x.id, "ok")]), "Nobody is waiting.", "nw")}${pending.length > 6 ? `<p><a href="#/approvals">See all ${pending.length}</a></p>` : ""}</div>
  <div class="card"><h3>Recent activity</h3>${tbl(["When", "Who", "Action"], logs.map(x => [fdate(ts(x.at)), esc(x.by), esc(x.action)]), "No activity logged yet.", "nw")}</div></div>
  <h2>Latest announcements</h2>${await annHtml(2)}`;
};
/* ---------- approvals ---------- */
pages.approvals = async () => {
    const [users, reqs, secs] = await Promise.all([list("users", where("status", "==", "pending")), list("requests", where("done", "==", false)), list("sections")]);
    const sn = id => esc(secs.find(s => s.id === id)?.name || "–"), T = users.filter(u => u.role === "teacher"), St = users.filter(u => u.role === "student");
    return head("Approvals") + `<div class="card"><h3>Teacher accounts</h3>${tbl(["Name", "Email", ""], T.map(x => [esc(x.name), esc(x.email), btn("apv", "Approve", x.id, "ok")]), "No teachers waiting.", "nw")}</div>
  <div class="card"><h3>Student accounts</h3><p class="hint">Advisers normally approve their own students. You can approve any student here.</p>${tbl(["Name", "LRN", "Section", "Email", ""], St.map(x => [esc(x.name), esc(x.lrn || "–"), sn(x.sectionId), esc(x.email), btn("apv", "Approve", x.id, "ok")]), "No students waiting.", "nw")}</div>
  <div class="card"><h3>Student requests</h3>${tbl(["From", "Request", "When", ""], reqs.map(x => [esc(x.email), esc(x.type), fdate(ts(x.at)), btn("reqdone", "Mark done", x.id)]), "No open requests.", "nw")}</div>`;
};
act.apv = async (el) => { await updateDoc(doc(db, "users", el.dataset.id), { status: "approved" }); log("approved user " + el.dataset.id); toast("Account approved."); refresh(); };
act.reqdone = async (el) => { await updateDoc(doc(db, "requests", el.dataset.id), { done: true }); toast("Marked as done."); refresh(); };
/* ---------- accounts ---------- */
pages.accounts = async ([role = "student"]) => {
    const [users, secs] = await Promise.all([list("users", where("role", "==", role)), list("sections")]);
    users.sort(byName);
    const sn = id => esc(secs.find(s => s.id === id)?.name || "–");
    S.after = () => $("#q")?.addEventListener("input", e => { const q = e.target.value.toLowerCase(); document.querySelectorAll("tbody tr[data-s]").forEach(r => r.style.display = r.dataset.s.includes(q) ? "" : "none"); });
    return head("Accounts", `${users.length} ${role}(s)`) + `<div class="tabs"><a class="${role === "student" ? "on" : ""}" href="#/accounts/student">Students</a><a class="${role === "teacher" ? "on" : ""}" href="#/accounts/teacher">Teachers</a></div>
  <div class="card"><input id="q" placeholder="Search name or email…" aria-label="Search accounts" style="max-width:360px;margin-bottom:12px">
  ${tbl(role === "student" ? ["Name", "LRN", "Section", "Email", "Status", ""] : ["Name", "Email", "Status", ""], users.map(x => {
        const [lb, k] = SB[x.status] || [x.status, ""];
        const actions = `<div class="row">${x.status !== "approved" ? btn("apv", "Approve", x.id, "ok") : btn("deact", "Deactivate", x.id, "ghost")}${btn("delprof", "Delete profile", x.id, "danger")}</div>`;
        return { attr: `data-s="${esc((x.name + " " + x.email + " " + (x.lrn || "")).toLowerCase())}"`, c: role === "student" ? [esc(x.name), esc(x.lrn || "–"), sn(x.sectionId), esc(x.email), badge(lb, k), actions] : [esc(x.name), esc(x.email), badge(lb, k), actions] };
    }), "No accounts yet.", "nw")}
  <p class="hint">Deleting a profile removes the portal record only. The person can sign in again and re-register.</p></div>`;
};
act.deact = async (el) => { if (!await ask("Deactivate this account? They will not be able to use the portal.", "Deactivate", true))
    return; await updateDoc(doc(db, "users", el.dataset.id), { status: "inactive" }); log("deactivated user " + el.dataset.id); toast("Account deactivated."); refresh(); };
act.delprof = async (el) => { if (!await ask("Delete this profile? Their submissions stay in the database.", "Delete", true))
    return; await deleteDoc(doc(db, "users", el.dataset.id)); log("deleted profile " + el.dataset.id); toast("Profile deleted."); refresh(); };