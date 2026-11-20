/**
 * core.js - shared foundation for every page module.
 *   1. Firebase setup      4. Firestore helpers (cached reads)
 *   2. App state/registries 5. Formatting + answer hashing
 *   3. DOM helpers          6. UI building blocks
 */
import {firebaseConfig, ADMIN_EMAILS, SCHOOL} from "./firebase-config.js";
import {initializeApp} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {getAuth} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  initializeFirestore, collection, doc, getDoc, getDocs, query, queryEqual, where, orderBy, limit,
  serverTimestamp, getCountFromServer,
  setDoc as _setDoc, addDoc as _addDoc, updateDoc as _updateDoc, deleteDoc as _deleteDoc, writeBatch as _writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export {ADMIN_EMAILS, SCHOOL, collection, doc, getDoc, getDocs, query, where, orderBy, limit, serverTimestamp};

/* ============ 1. Firebase ============ */
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
/* Auto-detect long-polling: fixes requests that hang on school/proxy networks where WebSockets stall. */
export const db = initializeFirestore(app, {experimentalAutoDetectLongPolling: true});

/* ============ 2. Shared state + action registries ============
   Page modules register click handlers in `act` (data-a) and change handlers in `chg` (data-c). */
export const S = {me: null, set: {schoolYear: "", term: ""}, advSecs: [], after: null, cleanup: null, tmp: null};
export const act = {};
export const chg = {};

/* ============ 3. DOM helpers ============ */
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const v = id => ($("#" + id)?.value || "").trim();

const HTML_ENTITIES = {"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"};
export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => HTML_ENTITIES[c]);

export const refresh = () => dispatchEvent(new Event("hashchange"));
export const go = path => (location.hash === "#/" + path ? refresh() : (location.hash = "#/" + path));

/* ============ 4. Firestore helpers ============
   list() results are kept for 20s and in-flight requests are shared.
   Every write clears the cache, so data never looks stale after a change. */
const QUERY_TIMEOUT = 8_000;   // a stalled request is abandoned after 8s and retried once

const timeout = (promise, ms) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(Object.assign(new Error("Taking too long. Check your connection and try again."), {code: "unavailable"})), ms);
  promise.then(r => { clearTimeout(timer); resolve(r); }, e => { clearTimeout(timer); reject(e); });
});
const fetchDocs = async q => {
  try { return await timeout(getDocs(q), QUERY_TIMEOUT); }
  catch (e) { if (e.code !== "unavailable") throw e; return timeout(getDocs(q), QUERY_TIMEOUT); }
};

const CACHE = [];
const CACHE_TTL = 20_000;
const CACHE_MAX = 60;
const bust = () => { CACHE.length = 0; };
const invalidating = fn => async (...args) => { bust(); try { return await fn(...args); } finally { bust(); } };

export const setDoc = invalidating(_setDoc);
export const addDoc = invalidating(_addDoc);
export const updateDoc = invalidating(_updateDoc);
export const deleteDoc = invalidating(_deleteDoc);
export const writeBatch = database => {
  const batch = _writeBatch(database);
  batch.commit = invalidating(batch.commit.bind(batch));
  return batch;
};

export const list = (name, ...constraints) => {
  const q = query(collection(db, name), ...constraints), now = Date.now();
  let hit = CACHE.find(e => now - e.t < CACHE_TTL && queryEqual(e.q, q));
  if (!hit) {
    hit = {q, t: now, p: fetchDocs(q).then(s => s.docs.map(d => ({id: d.id, ...d.data()})))};
    CACHE.push(hit);
    if (CACHE.length > CACHE_MAX) CACHE.shift();
    hit.p.catch(() => { const i = CACHE.indexOf(hit); if (i > -1) CACHE.splice(i, 1); });
  }
  return hit.p.then(rows => rows.map(r => ({...r})));
};

export const count = async (name, ...constraints) => {
  try { return (await getCountFromServer(query(collection(db, name), ...constraints))).data().count; }
  catch { return 0; }
};

export const log = action =>
  addDoc(collection(db, "logs"), {by: S.me?.email || "", action, at: serverTimestamp()}).catch(() => {});

const ERROR_TEXT = {
  "permission-denied": "Not allowed: you don't have permission for this action. (If this is unexpected, publish the latest firestore.rules.)",
  unavailable: "Network problem. Check your connection and try again."
};
export const errMsg = e => ERROR_TEXT[e?.code] || e?.message || "Something went wrong.";

/* ============ 5. Formatting + answer hashing ============ */
const LOCALE = "en-PH";
export const ts = x => (x?.toMillis ? x.toMillis() : typeof x === "number" ? x : 0);
export const fdate = ms => ms
  ? new Date(ms).toLocaleString(LOCALE, {month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit"})
  : "\u2014";
export const fday = ms => ms
  ? new Date(ms).toLocaleDateString(LOCALE, {weekday: "long", month: "long", day: "numeric", year: "numeric"})
  : "";
export const pct = (n, d) => (d ? Math.round(100 * n / d) : 0);
export const greet = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
};
export const toLocalInput = ms => (ms ? new Date(ms - new Date(ms).getTimezoneOffset() * 6e4).toISOString().slice(0, 16) : "");
export const fromLocalInput = s => (s ? new Date(s).getTime() : 0);
export const mmss = ms => {
  const t = Math.max(0, Math.floor(ms / 1000)), pad = n => String(n).padStart(2, "0");
  const h = Math.floor(t / 3600), m = Math.floor(t % 3600 / 60), s = t % 60;
  return (h ? h + ":" : "") + pad(m) + ":" + pad(s);
};

const hex = bytes => [...new Uint8Array(bytes)].map(x => x.toString(16).padStart(2, "0")).join("");
export const norm = s => String(s ?? "").toLowerCase().replace(/\s+/g, " ").trim().replace(/\.+$/, "");
export const sha = async (salt, s) => hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(salt + "|" + norm(s))));
export const newSalt = () => hex(crypto.getRandomValues(new Uint8Array(12)));
export const shuffle = arr => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
export const qMax = q => (q.t === "mt" ? q.l.length : 1) * (q.pts || 1);

/* ============ 6. UI building blocks ============ */
const ICONS={
settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
home:'<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
book:'<path d="M4 4h12a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4z"/><path d="M4 16a4 4 0 0 1 4-4h12"/>',
check:'<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>',
users:'<circle cx="9" cy="8" r="3"/><path d="M3 20c0-4 3-6 6-6s6 2 6 6"/><circle cx="17" cy="9" r="2"/><path d="M17 14c2.5 0 4 1.5 4 4"/>',
bell:'<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>',
chart:'<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>',
file:'<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>',
cog:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
out:'<path d="M9 4H5v16h4M16 8l4 4-4 4M20 12H9"/>',
clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
grid:'<rect x="4" y="4" width="7" height="7"/><rect x="13" y="4" width="7" height="7"/><rect x="4" y="13" width="7" height="7"/><rect x="13" y="13" width="7" height="7"/>',
shield:'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.500-1-8-4-8-9V6z"/>',
list:'<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
star:'<path d="M12 3l2.800 5.700 6.200.9-4.500 4.400 1.100 6.200L12 17.200 6.400 20.200l1.100-6.200L3 9.600l6.200-.9z"/>'};

export const ic = name =>
  `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ""}</svg>`;

export const badge = (text, kind = "") => `<span class="badge ${kind}">${esc(text)}</span>`;

export const bar = (p, kind = "") =>
  `<div class="bar" role="progressbar" aria-valuenow="${p}" aria-valuemin="0" aria-valuemax="100"><i class="${kind}" style="width:${Math.max(0, Math.min(100, p))}%"></i></div>`;

export const stat = (label, value, sub = "", icon = "chart", tone = "") =>
  `<div class="card"><div class="stat ${tone}"><div class="si">${ic(icon)}</div><div><div class="sv">${value}</div><div class="sl">${esc(label)}</div>${sub ? `<div class="ss">${esc(sub)}</div>` : ""}</div></div></div>`;

export const head = (title, sub = "", actions = "") =>
  `<div class="ph"><div><h1>${esc(title)}</h1>${sub ? `<p class="mut">${esc(sub)}</p>` : ""}</div><div class="row noprint">${actions}</div></div>`;

export const empty = (msg, icon = "file") => `<div class="empty">${ic(icon)}<p>${esc(msg)}</p></div>`;

/** rows: arrays of cell HTML, or {c: [cells], attr: "extra tr attributes"} */
export const tbl = (heads, rows, emptyMsg = "No records yet.", cls = "") => {
  if (!rows.length) return empty(emptyMsg);
  const tr = r => {
    const plain = Array.isArray(r);
    return `<tr ${plain ? "" : r.attr || ""}>${(plain ? r : r.c).map(c => `<td>${c}</td>`).join("")}</tr>`;
  };
  return `<div class="tw"><table class="${cls}"><thead><tr>${heads.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map(tr).join("")}</tbody></table></div>`;
};

export const btn = (action, label, id = "", cls = "", extra = "") =>
  `<button class="btn sm ${cls}" data-a="${action}" data-id="${esc(id)}" ${extra}>${label}</button>`;

export function toast(msg, kind = "ok") {
  let box = $("#toasts");
  if (!box) {
    box = document.createElement("div");
    box.id = "toasts";
    box.setAttribute("role", "status");
    document.body.append(box);
  }
  const t = document.createElement("div");
  t.className = "toast " + kind;
  t.textContent = msg;
  box.append(t);
  setTimeout(() => t.classList.add("out"), 3600);
  setTimeout(() => t.remove(), 4000);
}

/** Confirm dialog -> Promise<boolean> */
export const ask = (msg, ok = "Confirm", danger = false) => new Promise(resolve => {
  const d = document.createElement("dialog");
  d.className = "modal";
  d.innerHTML = `<p>${esc(msg)}</p><div class="end"><button class="btn ghost" value="0">Cancel</button><button class="btn ${danger ? "danger" : ""}" value="1">${esc(ok)}</button></div>`;
  let done = false;
  const finish = result => { if (done) return; done = true; d.close(); d.remove(); resolve(result); };
  d.addEventListener("click", e => { const b = e.target.closest("button"); if (b) finish(b.value === "1"); });
  d.addEventListener("cancel", e => { e.preventDefault(); finish(false); });
  document.body.append(d);
  d.showModal();
});

/** Download rows as CSV (formula-looking cells are neutralised against spreadsheet injection) */
export function saveCsv(name, rows) {
  const cell = c => {
    let s = String(c ?? "");
    if (/^[=+@]/.test(s) || /^-[^0-9]/.test(s)) s = "'" + s;
    return `"${s.replace(/"/g, '""')}"`;
  };
  const blob = new Blob(["\ufeff" + rows.map(r => r.map(cell).join(",")).join("\r\n")], {type: "text/csv;charset=utf-8"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
}

/** Announcements list shared by all roles */
export async function annHtml(n = 20, manage = false) {
  const items = await list("announcements", orderBy("at", "desc"), limit(n));
  if (!items.length) return `<div class="card">${empty("No announcements yet.", "bell")}</div>`;
  return items.map(x => `<div class="card ann"><div class="row between"><b>${esc(x.title || "Announcement")}</b>${manage ? btn("delann", "Delete", x.id, "danger") : ""}</div><p>${esc(x.text).replace(/\n/g, "<br>")}</p><div class="mut sm">${fdate(ts(x.at))}${x.by ? " \u00b7 " + esc(x.by) : ""}</div></div>`).join("");
}

/** Profile picture, or the first letter of the name */
export const avatar = (m, size = "") => m.photo && /^data:image\//.test(m.photo)
  ? `<img class="avatar ${size}" data-avatar data-size="${size}" src="${esc(m.photo)}" alt="">`
  : `<span class="avatar ${size}" data-avatar data-size="${size}">${esc((m.name || "?").trim()[0] || "?")}</span>`;
export const refreshAvatars = () => $$("[data-avatar]").forEach(el => { el.outerHTML = avatar(S.me, el.dataset.size || ""); });
