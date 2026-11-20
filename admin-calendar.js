/**
 * admin-calendar.js - school calendar (stored in settings/calendar).
 */
import {
    $, act, ask, badge, btn, db, doc, esc,
    getDoc, log, serverTimestamp, setDoc, toast, v
} from "./core.js";

/* ---------- calendar (stored in settings/calendar) ---------- */
const MN = [
    "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"
];
const CT = {
    activity: ["Activity", "info"], reminder: ["Reminder", "warn"], note: ["Note", "mut"]
};
const pad = n => String(n).padStart(2, "0"), dkey = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
export const cal = { y: 0, m: 0, sel: "", ev: [] };
export const calReset = () => { const n = new Date(); cal.y = n.getFullYear(); cal.m = n.getMonth(); cal.sel = dkey(cal.y, cal.m, n.getDate()); };
const calRef = () => doc(db, "settings", "calendar");
export const loadCal = async () => { try {
    const s = await getDoc(calRef());
    return s.exists() ? (s.data().items || []) : [];
}
catch {
    return [];
} };
const calSave = async (items) => { await setDoc(calRef(), { items, updatedAt: serverTimestamp() }); cal.ev = items; };
export const calHtml = () => {
    const { y, m, sel, ev } = cal, first = new Date(y, m, 1).getDay(), days = new Date(y, m + 1, 0).getDate(), n = new Date(), today = dkey(n.getFullYear(), n.getMonth(), n.getDate());
    const by = {};
    ev.forEach(e => (by[e.date] || (by[e.date] = [])).push(e));
    let cells = "";
    for (let i = 0; i < first; i++)
        cells += `<span class="cd off"></span>`;
    for (let d = 1; d <= days; d++) {
        const k = dkey(y, m, d), L = by[k] || [];
        cells += `<button type="button" class="cd${k === today ? " today" : ""}${k === sel ? " sel" : ""}" data-a="calday" data-id="${k}" aria-label="${MN[m]} ${d}${L.length ? ", " + L.length + " item(s)" : ""}"><b>${d}</b>${L.length ? `<span class="dots">${L.slice(0, 3).map(e => `<i class="${esc(e.type)}"></i>`).join("")}${L.length > 3 ? "+" : ""}</span>` : ""}</button>`;
    }
    const day = (by[sel] || []).slice().sort((a, b) => (a.time || "").localeCompare(b.time || "")), dt = new Date(sel + "T00:00:00");
    return `<div class="calw"><div><div class="calh"><div class="row">${btn("calprev", "‹", "", "", 'aria-label="Previous month"')}<b class="calt">${MN[m]} ${y}</b>${btn("calnext", "›", "", "", 'aria-label="Next month"')}</div>${btn("caltoday", "Today")}</div>
  <div class="calg">${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(x => `<span class="cw">${x}</span>`).join("")}${cells}</div>
  <div class="legend"><span><i class="activity"></i>Activity</span><span><i class="reminder"></i>Reminder</span><span><i class="note"></i>Note</span></div></div>
  <div class="cald"><h3>${esc(dt.toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric", year: "numeric" }))}</h3>
  ${day.length ? day.map(e => { const [lb, k] = CT[e.type] || CT.note; return `<div class="cev"><div class="row between"><div>${badge(lb, k)} ${e.time ? `<span class="mut sm">${esc(e.time)}</span> ` : ""}<b>${esc(e.title)}</b></div>${btn("caldel", "Delete", e.id, "danger")}</div>${e.note ? `<p class="mut sm">${esc(e.note).replace(/\n/g, "<br>")}</p>` : ""}</div>`; }).join("") : `<p class="mut sm">Nothing scheduled for this day.</p>`}
  <div class="cadd"><input id="ce_t" placeholder="Title" aria-label="Title"><div class="g2"><select id="ce_ty" aria-label="Type"><option value="activity">Activity</option><option value="reminder">Reminder</option><option value="note">Note</option></select><input id="ce_tm" type="time" aria-label="Time (optional)"></div>
  <textarea id="ce_n" rows="2" placeholder="Details (optional)" aria-label="Details"></textarea><div><button class="btn" data-a="caladd">Add to calendar</button></div></div></div></div>`;
};
const calDraw = () => { const el = $("#cal"); if (el)
    el.innerHTML = calHtml(); };
act.calprev = () => { cal.m--; if (cal.m < 0) {
    cal.m = 11;
    cal.y--;
} calDraw(); };
act.calnext = () => { cal.m++; if (cal.m > 11) {
    cal.m = 0;
    cal.y++;
} calDraw(); };
act.caltoday = () => { calReset(); calDraw(); };
act.calday = el => { cal.sel = el.dataset.id; calDraw(); };
act.caladd = async () => {
    const t = v("ce_t");
    if (!t)
        return toast("Enter a title.", "bad");
    const s = await getDoc(calRef()), cur = s.exists() ? (s.data().items || []) : [];
    const e = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), date: cal.sel, time: v("ce_tm"), type: v("ce_ty") || "note", title: t, note: v("ce_n") };
    await calSave([...cur, e]);
    log("added calendar " + e.type);
    toast("Added to calendar.");
    calDraw();
};
act.caldel = async (el) => {
    if (!await ask("Delete this calendar item?", "Delete", true))
        return;
    const s = await getDoc(calRef());
    await calSave((s.exists() ? (s.data().items || []) : []).filter(x => x.id !== el.dataset.id));
    toast("Deleted.");
    calDraw();
};