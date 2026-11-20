/**
 * admin-curriculum.js - curriculum: subjects per grade and track.
 */
import {
    S, act, addDoc, ask, badge, btn, chg, collection,
    db, deleteDoc, doc, esc, head, list, log, refresh,
    tbl, toast, updateDoc
} from "./core.js";
import { subjectSort } from "./grades.js";
import { byName, pages } from "./admin-shared.js";

/* ---------- curriculum ---------- */
const CF = { sy: "", grade: "", term: "", track: "" }, CUR = { subs: [] };
const sGrade = x => x.grade || "Grade 11", sYear = x => x.schoolYear || S.set.schoolYear || "";
const termTxt = t => !t || t === "all" ? "All terms" : "Term " + t;
const curRows = () => CUR.subs.filter(x => (!CF.sy || sYear(x) === CF.sy) && (!CF.grade || sGrade(x) === CF.grade)
    && (!CF.term || !x.term || x.term === "all" || String(x.term) === CF.term) && (!CF.track || !x.track || x.track === "All tracks" || x.track === CF.track));
const curList = () => {
    const r = curRows();
    return `<div class="muted sm mut" style="margin-bottom:6px">${r.length} of ${CUR.subs.length} subject(s)</div>` +
        tbl(["Subject", "Grade", "School year", "Type", "Term", "Track", ""], r.map(x => [esc(x.name) + (x.type === "elective" && x.sectionIds?.length ? ` <span class="mut sm">· only ${x.sectionIds.map(i => esc(CUR.secs.find(c => c.id === i)?.name || "?")).join(", ")}</span>` : "") + (x.combo ? ` ${badge("combined", "info")}` : "") + (x.parentId ? ` <span class="mut sm">↳ part of ${esc(CUR.subs.find(c => c.id === x.parentId)?.name || "?")}</span>` : ""), esc(sGrade(x)), esc(sYear(x) || "–"), esc(x.type), termTxt(x.term), esc(x.track),
            `<div class="row">${btn("editsub", "Edit", x.id, "ghost")}${btn("delsub", "Delete", x.id, "danger")}</div>`]), "No subjects match these filters.");
};
pages.curriculum = async () => {
    CUR.subs = (await list("subjects")).sort(subjectSort);
    CUR.secs = (await list("sections")).sort(byName);
    const years = [...new Set([S.set.schoolYear, ...CUR.subs.map(sYear)].filter(Boolean))].sort().reverse();
    const sel = (f, id, label, opts) => `<div><label class="f" for="${id}">${label}</label><select id="${id}" data-c="cf" data-f="${f}"><option value="">All</option>${opts.map(([v, t]) => `<option value="${esc(v)}" ${CF[f] === v ? "selected" : ""}>${esc(t)}</option>`).join("")}</select></div>`;
    return head("SHS Curriculum", "Subjects offered", `<button class="btn" data-a="addsub">+ Add subject</button>`) +
        `<div class="card"><div class="g2">${sel("sy", "cf_sy", "School year", years.map(y => [y, y]))}${sel("grade", "cf_gr", "Grade", [["Grade 11", "Grade 11"], ["Grade 12", "Grade 12"]])}
  ${sel("term", "cf_tm", "Term", [["1", "Term 1"], ["2", "Term 2"], ["3", "Term 3"]])}${sel("track", "cf_tk", "Track", [["Academic", "Academic"], ["TVL", "TVL"]])}</div></div>
  <div class="card" id="curlist">${curList()}</div>`;
};
chg.cf = el => { CF[el.dataset.f] = el.value; const c = document.getElementById("curlist"); if (c)
    c.innerHTML = curList(); };
/* add / edit in a pop-up: Save stores it and closes */
function subDialog(x) {
    const o = (arr, cur) => arr.map(([v, t]) => `<option value="${esc(v)}" ${String(cur) === v ? "selected" : ""}>${esc(t)}</option>`).join("");
    const d = document.createElement("dialog");
    d.className = "modal";
    d.innerHTML = `<h3>${x ? "Edit subject" : "Add subject"}</h3>
  <label class="f" for="d_sn">Subject name</label><input id="d_sn" value="${esc(x?.name || "")}" placeholder="e.g. General Mathematics">
  <div class="g2"><div><label class="f" for="d_gr">Grade</label><select id="d_gr">${o([["Grade 11", "Grade 11"], ["Grade 12", "Grade 12"]], x ? sGrade(x) : "Grade 11")}</select></div>
  <div><label class="f" for="d_sy">School year</label><input id="d_sy" value="${esc(x ? sYear(x) : S.set.schoolYear)}" placeholder="2026–2027"></div>
  <div><label class="f" for="d_st">Type</label><select id="d_st">${o([["core", "core"], ["elective", "elective"]], x?.type || "core")}</select></div>
  <div><label class="f" for="d_tm">Term</label><select id="d_tm">${o([["all", "All terms"], ["1", "Term 1"], ["2", "Term 2"], ["3", "Term 3"]], x?.term || "all")}</select></div></div>
  <label class="f" for="d_tk">Track</label><select id="d_tk">${o([["All tracks", "All tracks"], ["Academic", "Academic"], ["TVL", "TVL"]], x?.track || "All tracks")}</select>
  <div class="g2"><div><label class="f" for="d_kd">Kind</label><select id="d_kd">${o([["regular", "Regular subject"], ["combined", "Combined (average of its parts)"]], x?.combo ? "combined" : "regular")}</select></div>
  <div><label class="f" for="d_pa">Part of</label><select id="d_pa"><option value="">None</option>${CUR.subs.filter(c => c.combo && (!x || c.id !== x.id)).map(c => `<option value="${esc(c.id)}" ${x?.parentId === c.id ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></div></div>
  <p class="hint">Combined subject: create it first with no teacher. Then add each part (for example Effective Communication and Mabisang Komunikasyon), set “Part of” to the combined subject, and assign each part to its own teacher.</p>
  <div id="d_secs" style="display:${(x?.type || "core") === "elective" ? "block" : "none"}"><label class="f">Offered to (electives)</label>
  <div class="row" style="margin-bottom:6px"><button type="button" class="btn sm ghost" data-q="Academic">All Academic</button><button type="button" class="btn sm ghost" data-q="TVL">All TVL</button><button type="button" class="btn sm ghost" data-q="none">Clear</button></div>
  <div class="wl" style="max-height:150px;overflow:auto">${CUR.secs.map(c => `<label class="wr" style="justify-content:flex-start;gap:8px"><input type="checkbox" class="d_sc" value="${esc(c.id)}" data-t="${esc(c.track || "")}" ${x?.sectionIds?.includes(c.id) ? "checked" : ""}> ${esc(c.name)} <span class="mut sm">${esc(c.track || "track not set")}</span></label>`).join("") || `<p class="mut sm">No sections yet.</p>`}</div>
  <p class="hint">Only the ticked sections will have this elective. Tick none to offer it to every section. Set each section's track in Sections &amp; Loads.</p></div>
  <label class="f" for="d_or">Display order (1 = first, leave blank for the DepEd order)</label><input id="d_or" type="number" min="1" max="99" value="${x?.order ?? ""}" placeholder="Auto">
  <label class="f" for="d_sd">Description</label><textarea id="d_sd" rows="2">${esc(x?.description || "")}</textarea>
  <p class="bad sm" id="d_err" role="alert"></p><div class="end"><button class="btn ghost" value="0">Cancel</button><button class="btn" value="1">Save</button></div>`;
    return new Promise(res => {
        let done = false;
        const fin = r => { if (done)
            return; done = true; d.close(); d.remove(); res(r); };
        d.addEventListener("change", e => { if (e.target.id === "d_st")
            d.querySelector("#d_secs").style.display = e.target.value === "elective" ? "block" : "none"; });
        d.addEventListener("click", e => {
            const b = e.target.closest("button");
            if (!b)
                return;
            if (b.dataset.q) {
                d.querySelectorAll(".d_sc").forEach(c => c.checked = b.dataset.q !== "none" && c.dataset.t === b.dataset.q);
                return;
            }
            if (b.value !== "1")
                return fin(null);
            const g = i => d.querySelector("#d_" + i).value.trim(), r = { name: g("sn"), grade: g("gr"), schoolYear: g("sy"), type: g("st"), term: g("tm"), track: g("tk"), description: g("sd"), order: g("or") ? +g("or") : null, sectionIds: g("st") === "elective" ? [...d.querySelectorAll(".d_sc:checked")].map(c => c.value) : [], combo: g("kd") === "combined", parentId: g("kd") === "combined" ? "" : g("pa") };
            if (!r.name) {
                d.querySelector("#d_err").textContent = "Enter the subject name.";
                return;
            }
            fin(r);
        });
        d.addEventListener("cancel", e => { e.preventDefault(); fin(null); });
        document.body.append(d);
        d.showModal();
        d.querySelector("#d_sn").focus();
    });
}
act.addsub = async () => { const r = await subDialog(); if (!r)
    return; await addDoc(collection(db, "subjects"), r); log("added subject " + r.name); toast("Subject added."); refresh(); };
act.editsub = async (el) => {
    const x = CUR.subs.find(s => s.id === el.dataset.id);
    if (!x)
        return;
    const r = await subDialog(x);
    if (!r)
        return;
    await updateDoc(doc(db, "subjects", x.id), r);
    log("edited subject " + r.name);
    toast("Subject saved.");
    refresh();
};
act.delsub = async (el) => { if (await ask("Delete this subject?", "Delete", true)) {
    await deleteDoc(doc(db, "subjects", el.dataset.id));
    toast("Deleted.");
    refresh();
} };