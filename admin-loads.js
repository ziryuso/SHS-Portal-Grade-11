/**
 * admin-loads.js - sections and teacher subject loads.
 */
import {
    $, S, act, addDoc, ask, badge, btn, chg,
    collection, count, db, deleteDoc, doc, esc, head, list,
    log, refresh, serverTimestamp, setDoc, tbl, toast, updateDoc, v,
    where
} from "./core.js";
import { byName, pages } from "./admin-shared.js";
import { syncNames } from "./admin-people.js";

/* ---------- sections & loads ---------- */
const TERMS = ["Term 1", "Term 2", "Term 3"];
const inTerm = (l, sy, tm) => (l.schoolYear || S.set.schoolYear || "") === sy && (l.term || S.set.term || TERMS[0]) === tm;
pages.loads = async ([syP, tmP]) => {
    const sy = syP || S.set.schoolYear || "", tm = tmP || S.set.term || TERMS[0];
    const [secs, tch, subs, loads] = await Promise.all([list("sections"), list("users", where("role", "==", "teacher")), list("subjects"), list("loads")]);
    await syncNames(tch, loads).catch(() => 0);
    const T = tch.filter(t => t.status === "approved").sort(byName);
    secs.sort(byName);
    subs.sort(byName);
    const advOf = {};
    secs.forEach(s => { if (s.adviserUid)
        advOf[s.adviserUid] = s.id; });
    const o = (a, f) => a.map(x => `<option value="${x.id}">${esc(f(x))}</option>`).join("");
    const nm = (a, id) => esc(a.find(x => x.id === id)?.name || "?");
    const years = [...new Set([S.set.schoolYear, sy, ...loads.map(l => l.schoolYear)].filter(Boolean))].sort();
    const terms = TERMS.includes(tm) ? TERMS : [...TERMS, tm];
    const shown = loads.filter(l => inTerm(l, sy, tm));
    const isCur = sy === S.set.schoolYear && tm === S.set.term;
    const advCell = s => `<select id="adv_${s.id}" aria-label="Adviser for ${esc(s.name)}" ${s.adviserUid ? "disabled" : ""}><option value="">— none —</option>${T.map(t => {
        const other = advOf[t.id] && advOf[t.id] !== s.id, on = secs.find(x => x.id === advOf[t.id]);
        return `<option value="${t.id}" ${s.adviserUid === t.id ? "selected" : ""} ${other ? "disabled" : ""}>${esc(t.name)}${other ? " (adviser of " + esc(on?.name || "another section") + ")" : ""}</option>`;
    }).join("")}</select>`;
    return head("Sections & subject loads") + `<div class="card"><h3>School year &amp; term</h3><div class="g2">
  <div><label class="f" for="vsy">School year</label><input id="vsy" list="syl" value="${esc(sy)}" placeholder="2026–2027" data-c="loadview"><datalist id="syl">${years.map(y => `<option value="${esc(y)}">`).join("")}</datalist></div>
  <div><label class="f" for="vtm">Term</label><select id="vtm" data-c="loadview">${terms.map(t => `<option ${t === tm ? "selected" : ""}>${esc(t)}</option>`).join("")}</select></div></div>
  <div class="row" style="margin-top:10px">${isCur ? badge("Current term", "ok") : btn("setcur", "Set as current")}${btn("syncnames", "Refresh teacher names", "", "ghost")}<span class="hint">Subject loads below belong to ${esc(sy || "—")} · ${esc(tm)}.</span></div></div>
  <div class="card"><h3>Grade 11 sections</h3><div class="row"><input id="scn" placeholder="e.g. ASSH A" style="max-width:260px"><select id="sct" aria-label="Track" style="max-width:140px"><option>Academic</option><option>TVL</option></select><button class="btn" data-a="addsec">Create section</button></div>
  ${tbl(["Section", "Track", "Adviser", ""], secs.map(s => [esc(s.name), `<select data-c="sectrack" data-id="${s.id}" aria-label="Track for ${esc(s.name)}"><option value="">Not set</option>${["Academic", "TVL"].map(t => `<option ${s.track === t ? "selected" : ""}>${t}</option>`).join("")}</select>`, advCell(s), `<div class="row">${s.adviserUid ? btn("unlockadv", "Reassign", s.id) : btn("setadv", "Save adviser", s.id)}${btn("delsec", "Delete", s.id, "danger")}</div>`]), "No sections yet.", "nw")}
  <p class="hint">Each teacher can advise only one section. Once assigned, use Reassign only to correct a mistake.</p></div>
  <div class="card"><h3>Assign subject load</h3><div class="g2"><div><label class="f" for="ls">Subject</label><select id="ls">${o(subs, x => x.name)}</select></div><div><label class="f" for="lc">Section</label><select id="lc">${o(secs, x => x.name)}</select></div><div><label class="f" for="lt">Teacher</label><select id="lt">${o(T, x => x.name)}</select></div></div>
  <p><button class="btn" data-a="addload">Assign</button></p>
  ${tbl(["Subject", "Section", "Teacher", ""], shown.map(l => [nm(subs, l.subjectId), nm(secs, l.sectionId), nm(tch, l.teacherUid), btn("delload", "Remove", l.id, "danger")]), "No loads assigned for this school year and term.", "nw")}</div>`;
};
chg.loadview = () => { const y = v("vsy"), t = v("vtm"); if (!y)
    return; location.hash = `#/loads/${encodeURIComponent(y)}/${encodeURIComponent(t)}`; };
act.setcur = async () => {
    const y = v("vsy"), t = v("vtm");
    if (!y)
        return toast("Enter the school year first.", "bad");
    await setDoc(doc(db, "settings", "school"), { schoolYear: y, term: t, updatedAt: serverTimestamp() });
    S.set = { schoolYear: y, term: t };
    const f = $(".foot");
    if (f)
        f.textContent = `SY ${y} ${t}`;
    log("set current term " + y + " " + t);
    toast("Current school year and term saved.");
    refresh();
};
act.addsec = async () => { if (!v("scn"))
    return toast("Enter a section name.", "bad"); await addDoc(collection(db, "sections"), { name: v("scn"), track: v("sct") || "Academic" }); log("created section " + v("scn")); toast("Section created."); refresh(); };
act.unlockadv = async (el) => {
    if (!await ask("Reassign this adviser? Only do this to correct a mistake.", "Reassign"))
        return;
    const s = $("#adv_" + el.dataset.id);
    s.disabled = false;
    s.focus();
    el.textContent = "Save adviser";
    el.dataset.a = "setadv";
};
act.setadv = async (el) => {
    const id = el.dataset.id, uid = v("adv_" + id), secs = await list("sections"), cur = secs.find(x => x.id === id);
    if ((cur?.adviserUid || "") === uid)
        return toast("No change to save.");
    if (uid) {
        const o = secs.find(x => x.id !== id && x.adviserUid === uid);
        if (o)
            return toast(`That teacher already advises ${o.name}. One teacher can advise only one section.`, "bad");
    }
    await updateDoc(doc(db, "sections", id), { adviserUid: uid });
    log("set adviser for " + id);
    toast("Adviser saved.");
    refresh();
};
act.delsec = async (el) => {
    const st = await count("users", where("sectionId", "==", el.dataset.id));
    if (st)
        return toast(`This section still has ${st} student profile(s). Move or delete them first.`, "bad");
    if (await ask("Delete this section?", "Delete", true)) {
        await deleteDoc(doc(db, "sections", el.dataset.id));
        toast("Section deleted.");
        refresh();
    }
};
act.addload = async () => {
    const sub = v("ls"), sec = v("lc"), t = v("lt"), sy = v("vsy"), tm = v("vtm");
    if (!sub || !sec || !t)
        return toast("Choose a subject, section and teacher.", "bad");
    if (!sy)
        return toast("Enter the school year first.", "bad");
    const dup = (await list("loads", where("sectionId", "==", sec), where("subjectId", "==", sub))).filter(l => inTerm(l, sy, tm));
    if (dup.length)
        return toast("That subject is already assigned to this section for this term.", "bad");
    const tn = (await list("users", where("role", "==", "teacher"))).find(x => x.id === t)?.name || "";
    await addDoc(collection(db, "loads"), { subjectId: sub, sectionId: sec, teacherUid: t, teacherName: tn, schoolYear: sy, term: tm });
    log("assigned load");
    toast("Load assigned.");
    refresh();
};
act.delload = async (el) => { if (await ask("Remove this load? Activities already posted stay in the database.", "Remove", true)) {
    await deleteDoc(doc(db, "loads", el.dataset.id));
    toast("Removed.");
    refresh();
} };