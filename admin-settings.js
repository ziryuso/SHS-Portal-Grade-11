/**
 * admin-settings.js - announcements, school settings, logs and storage.
 */
import {
    S, act, addDoc, annHtml, ask, chg, collection, count,
    db, deleteDoc, doc, esc, fdate, head, limit, list,
    log, orderBy, refresh, serverTimestamp, setDoc, stat, tbl, toast,
    ts, updateDoc, v
} from "./core.js";
import { pages } from "./admin-shared.js";

/* ---------- announcements ---------- */
pages.announcements = async () => head("Announcements", "Visible to all students and teachers") +
    `<div class="card"><h3>Post announcement</h3><label class="f" for="an_t">Title</label><input id="an_t" placeholder="e.g. Exam schedule"><label class="f" for="an">Message</label><textarea id="an" rows="3"></textarea><p><button class="btn" data-a="post">Post</button></p></div>` + await annHtml(30, true);
act.post = async () => { if (!v("an"))
    return toast("Write a message first.", "bad"); await addDoc(collection(db, "announcements"), { title: v("an_t") || "Announcement", text: v("an"), by: S.me.email, at: serverTimestamp() }); log("posted announcement"); toast("Posted."); refresh(); };
act.delann = async (el) => { if (await ask("Delete this announcement?", "Delete", true)) {
    await deleteDoc(doc(db, "announcements", el.dataset.id));
    toast("Deleted.");
    refresh();
} };
/* ---------- settings ---------- */
pages.settings = async () => head("School settings", "Shown on every dashboard") + `<div class="card"><div class="g2">
  <div><label class="f" for="sy">School year</label><input id="sy" value="${esc(S.set.schoolYear)}" placeholder="2026–2027"></div>
  <div><label class="f" for="tm">Current term</label><select id="tm">${["Term 1", "Term 2", "Term 3"].map(t => `<option ${t === S.set.term ? "selected" : ""}>${t}</option>`).join("")}</select></div></div>
  <p><button class="btn" data-a="saveset">Save settings</button></p></div>`;
act.saveset = async () => { const d = { schoolYear: v("sy"), term: v("tm"), updatedAt: serverTimestamp() }; await setDoc(doc(db, "settings", "school"), d); S.set = { schoolYear: d.schoolYear, term: d.term }; log("updated school settings"); toast("Settings saved."); refresh(); };
/* ---------- logs & storage ---------- */
pages.logs = async () => {
    const [l, u, a, s, sub, k] = await Promise.all([list("logs", orderBy("at", "desc"), limit(100)), count("users"), count("activities"), count("submissions"), count("materials"), count("logs")]);
    return head("Logs & storage") + `<div class="cards">${stat("Users", u, "", "users")}${stat("Activities", a, "", "list")}${stat("Submissions", s, "", "check")}${stat("Materials", sub, "", "file")}${stat("Log entries", k, "", "shield")}</div>
  <div class="card"><h3>Storage monitor (free plan)</h3><p class="mut">Counts use cheap aggregate queries. Exact usage: Firebase Console → Firestore → Usage. Free quota: 1 GiB stored, 50k reads/day, 20k writes/day.</p></div>
  <div class="card"><h3>Activity log (latest 100)</h3>${tbl(["When", "Who", "Action"], l.map(x => [fdate(ts(x.at)), esc(x.by), esc(x.action)]), "No log entries.", "nw")}</div>`;
};
chg.sectrack = async (el) => { await updateDoc(doc(db, "sections", el.dataset.id), { track: el.value }); toast("Track saved."); };