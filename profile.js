/**
 * profile.js - profile photo/bio: the plain profile page and the floating profile card (all roles).
 */
import {isXmas, setXmas} from "./xmas.js";
import {S, act, chg, $, esc, db, doc, updateDoc, toast, errMsg, ask, head, tbl, avatar, refreshAvatars, refresh} from "./core.js";

const BIO_MAX = 150;
const THUMB_SIZE = 192;
const roleLabel = r => (r ? r[0].toUpperCase() + r.slice(1) : "");
const xmasRow = () => `<label class="pp-xm"><span>\u{1F384} Christmas theme</span><input type="checkbox" role="switch" data-c="xmas" aria-label="Christmas theme" ${isXmas() ? "checked" : ""}></label>`;
const saveUser = fields => updateDoc(doc(db, "users", S.me.uid), fields);

/** Crops the chosen picture to a small centred square JPEG data-URL (stored inside the user's profile). */
const toThumb = file => new Promise((resolve, reject) => {
  const img = new Image(), url = URL.createObjectURL(file);
  img.onload = () => {
    const side = Math.min(img.width, img.height), canvas = document.createElement("canvas");
    canvas.width = canvas.height = THUMB_SIZE;
    canvas.getContext("2d").drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, THUMB_SIZE, THUMB_SIZE);
    URL.revokeObjectURL(url);
    resolve(canvas.toDataURL("image/jpeg", 0.82));
  };
  img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Could not read that image.")); };
  img.src = url;
});

/** Returns a thumbnail for the picked file input, or null if nothing valid was chosen. */
async function pickThumb(input) {
  const file = input.files[0];
  input.value = "";
  if (!file) return null;
  if (!file.type.startsWith("image/")) { toast("Please choose an image file.", "bad"); return null; }
  return toThumb(file);
}

/* ============ plain profile page (photo saves immediately) ============ */
export const photoCard = () => `<div class="card row" style="gap:14px">${avatar(S.me, "xl")}
  <div style="flex:1;min-width:180px"><b>${esc(S.me.name)}</b><div class="mut sm">${esc(S.me.email)}</div>
    ${S.me.bio ? `<p class="sm">${esc(S.me.bio)}</p>` : ""}
    <div class="row" style="margin-top:8px"><button class="btn sm" data-a="pickphoto">${S.me.photo ? "Change photo" : "Upload photo"}</button>${S.me.photo ? `<button class="btn sm ghost" data-a="rmphoto">Remove</button>` : ""}</div>
    ${xmasRow()}
    <input type="file" id="photoin" accept="image/*" data-c="photo" hidden>
  </div></div>`;

const applyPhoto = async (photo, message) => {
  await saveUser({photo});
  S.me.photo = photo;
  refreshAvatars();
  toast(message);
  refresh();
};

chg.xmas = el => { setXmas(el.checked); toast(el.checked ? "Christmas theme is on. Merry Christmas! \u{1F384}" : "Christmas theme is off."); };
act.pickphoto = () => $("#photoin").click();
act.rmphoto = () => applyPhoto("", "Photo removed.");
chg.photo = async el => {
  try { const url = await pickThumb(el); if (url) await applyPhoto(url, "Photo updated."); }
  catch (e) { toast(errMsg(e), "bad"); }
};

/* ============ floating profile card ============
   View mode: shows what is saved. Click the avatar again / outside / Esc to close.
   Edit mode: photo + bio are editable; Save closes it, Cancel asks before discarding changes. */
export const P = {edit: false, pd: null};     // pd = draft {photo, bio} while editing

const infoRows = m => {
  const rows = [["Role", roleLabel(m.role)], ["Email", m.email || "\u2013"]];
  if (m.role === "student") rows.push(["Section", S.secName || "\u2013"], ["LRN", m.lrn || "Not provided"], ["Alias", m.alias || "\u2013"]);
  if (m.role === "teacher" && S.advSecs.length) rows.push(["Advisory", S.advSecs.map(s => s.name).join(", ")]);
  if (S.set.schoolYear) rows.push(["School year", S.set.schoolYear]);
  return rows;
};
const infoList = m => `<dl class="pp-dl">${infoRows(m).map(([k, x]) => `<dt>${esc(k)}</dt><dd>${esc(x)}</dd>`).join("")}</dl>`;
const topRow = m => `<div class="pp-top">${avatar(m, "xl")}<div class="pp-i"><b>${esc(S.me.name)}</b><span class="badge">${esc(roleLabel(S.me.role))}</span></div></div>`;

export const profDirty = () => !!(P.edit && P.pd && (P.pd.photo !== (S.me.photo || "") || P.pd.bio !== (S.me.bio || "")));

const viewHtml = m => `${topRow(m)}
  <p class="pp-bio ${m.bio ? "" : "mut"}">${m.bio ? esc(m.bio) : "No bio yet. Tap Edit to add one."}</p>${infoList(m)}${xmasRow()}
  <div class="pp-act"><button class="btn sm" data-a="pedit">Edit profile</button><button class="btn sm ghost" data-a="out">Log out</button></div>`;

const editHtml = (m, d) => `${topRow({...m, photo: d.photo})}
  <div class="pp-act" style="margin-top:10px"><button class="btn sm" data-a="pphoto">${d.photo ? "Change photo" : "Upload photo"}</button>${d.photo ? `<button class="btn sm ghost" data-a="prmphoto">Remove</button>` : ""}</div>
  <input type="file" id="photoin2" accept="image/*" data-c="pphoto" hidden>
  <label class="f" for="pbio">Bio</label><textarea id="pbio" rows="3" maxlength="${BIO_MAX}" placeholder="Tell your classmates or teachers a little about you">${esc(d.bio)}</textarea>
  <div class="mut sm right" id="pbioc">${d.bio.length}/${BIO_MAX}</div>${infoList(m)}
  <p class="mut sm">Name, email and section can only be changed by the administrator.</p>
  <div class="pp-act"><button class="btn sm" data-a="psave">Save</button><button class="btn sm ghost" data-a="pcancel">Cancel</button></div>`;

export const profInner = () => (P.edit ? editHtml(S.me, P.pd) : viewHtml(S.me));

const rerender = () => { const el = $("#pprof"); if (el && !el.hidden) el.innerHTML = profInner(); };
const keepBio = () => { const t = $("#pbio"); if (t && P.pd) P.pd.bio = t.value; };   // preserve typing before a re-render
const confirmDiscard = async () => !profDirty() || ask("Discard your unsaved profile changes?", "Discard", true);

export const profOpen = () => { const el = $("#pprof"); return !!el && !el.hidden; };

const setPanel = open => {
  const panel = $("#pprof"), back = $("#pback");
  if (panel) panel.hidden = !open;
  if (back) back.hidden = !open;
  $(".chipu")?.setAttribute("aria-expanded", String(open));
};
export const closeProf = () => { P.edit = false; P.pd = null; setPanel(false); };
export const openProf = () => {
  const panel = $("#pprof");
  if (!panel) return;
  P.edit = false;
  P.pd = null;
  panel.innerHTML = profInner();
  setPanel(true);
};
/** Close, but never lose unsaved edits silently */
export const tryClose = async () => { if (await confirmDiscard()) closeProf(); };

document.addEventListener("input", e => {
  if (e.target.id !== "pbio" || !P.pd) return;
  P.pd.bio = e.target.value;
  const counter = $("#pbioc");
  if (counter) counter.textContent = `${e.target.value.length}/${BIO_MAX}`;
});

act.pedit = () => { P.edit = true; P.pd = {photo: S.me.photo || "", bio: S.me.bio || ""}; rerender(); };
act.pcancel = async () => { if (await confirmDiscard()) { P.edit = false; P.pd = null; rerender(); } };
act.pphoto = () => $("#photoin2").click();
act.prmphoto = () => { keepBio(); P.pd.photo = ""; rerender(); };
chg.pphoto = async el => {
  if (!P.pd) return;
  try { const url = await pickThumb(el); if (url) { keepBio(); P.pd.photo = url; rerender(); } }
  catch (e) { toast(errMsg(e), "bad"); }
};
act.psave = async () => {
  keepBio();
  const {photo} = P.pd, bio = P.pd.bio.trim().slice(0, BIO_MAX);
  await saveUser({photo, bio});
  Object.assign(S.me, {photo, bio});
  refreshAvatars();
  closeProf();
  toast("Profile saved.");
};

/* ============ profile page for teachers and admin (students have their own, with section details) ============ */
export const generalProfile = async () => {
  const m = S.me, rows = [["Role", esc(roleLabel(m.role))], ["Email", esc(m.email)]];
  if (m.role === "teacher" && S.advSecs.length) rows.push(["Advisory", esc(S.advSecs.map(s => s.name).join(", "))]);
  return head("Profile") + photoCard() + `<div class="card">${tbl(["Field", "Details"], rows)}</div><div class="card"><button class="btn ghost" data-a="out">Log out</button></div>`;
};
