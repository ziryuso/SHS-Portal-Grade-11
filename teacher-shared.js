/**
 * teacher-shared.js - shared helpers: query chunking, stats, pop-up form, term/week fields, loads and students lookups.
 */
import { $, S, esc, fromLocalInput, ic, list, pct, where } from "./core.js";
export const pages = {};

/* ---------- helpers ---------- */
export const chunk = (a, n) => { const r = []; for (let i = 0; i < a.length; i += n)
    r.push(a.slice(i, i + n)); return r; };
export const inQ = async (c, field, ids, ...extra) => (await Promise.all(chunk(ids, 10).map(k => list(c, where(field, "in", k), ...extra)))).flat();
export const sp = s => pct((s.best || 0) + (s.manualTotal || 0), s.total);
export const counted = s => s.graded !== false;
export const mean = a => a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : null;
export const fm = x => x == null ? "–" : x + "%";
export const byName = (a, b) => (a.name || "").localeCompare(b.name || "");
export const mini = (label, value, icon, tone = "") => `<div class="stat ${tone}"><div class="si">${ic(icon)}</div><div><div class="sv">${value}</div><div class="sl">${esc(label)}</div></div></div>`;
/* small pop-up form used for topics, announcements and materials */
export const fdlg = (title, fields, ok = "Save", chk) => new Promise(res => {
    const d = document.createElement("dialog");
    d.className = "modal";
    d.innerHTML = `<h3>${esc(title)}</h3>${fields.map(f => `<label class="f" for="fd_${f.k}">${esc(f.l)}</label>${f.multi ? `<div id="fd_${f.k}">${f.multi.map(([x, t]) => `<label class="f inline"><input type="checkbox" value="${esc(x)}"> ${esc(t)}</label>`).join("")}</div>` : f.sel ? `<select id="fd_${f.k}">${f.sel.map(([x, t]) => `<option value="${x}" ${x == f.def ? "selected" : ""}>${esc(t)}</option>`).join("")}</select>` : f.ta ? `<textarea id="fd_${f.k}" rows="3"></textarea>` : `<input id="fd_${f.k}" ${f.type ? `type="${f.type}"` : ""} placeholder="${esc(f.ph || "")}">`}`).join("")}<p class="bad sm" id="fd_err" role="alert"></p><div class="end"><button class="btn ghost" value="0">Cancel</button><button class="btn" value="1">${esc(ok)}</button></div>`;
    let done = false;
    const fin = r => { if (done)
        return; done = true; d.close(); d.remove(); res(r); };
    d.addEventListener("click", e => {
        const b = e.target.closest("button");
        if (!b)
            return;
        if (b.value !== "1")
            return fin(null);
        const o = {};
        for (const f of fields)
            o[f.k] = f.multi ? [...d.querySelectorAll(`#fd_${f.k} input:checked`)].map(i => i.value) : d.querySelector("#fd_" + f.k).value.trim();
        const bad = fields.find(f => f.req && !o[f.k]);
        const m = bad ? bad.l + " is required." : (chk ? chk(o) : "");
        if (m) {
            d.querySelector("#fd_err").textContent = m;
            return;
        }
        fin(o);
    });
    d.addEventListener("cancel", e => { e.preventDefault(); fin(null); });
    document.body.append(d);
    d.showModal();
    d.querySelector("input,textarea")?.focus();
});
/* term + week: every post is filed under a Term (1-3) and a Week (1-20) so students see it on the right tab */
export const curTerm = () => { const n = +((S.set.term || "").match(/\d/) || [1])[0]; return n >= 1 && n <= 3 ? n : 1; };
export const TW = (t, w) => [{ k: "term", l: "Term", sel: [[1, "Term 1"], [2, "Term 2"], [3, "Term 3"]], def: t || curTerm() }, { k: "week", l: "Week", sel: Array.from({ length: 20 }, (_, i) => [i + 1, "Week " + (i + 1)]), def: w || 1 }];
export const twBadge = x => x.term ? ` <span class="badge mut">T${x.term} · W${x.week}</span>` : ` <span class="badge warn">No week</span>`;
export async function myLoads() {
    const [loads, subs, secs] = await Promise.all([list("loads", where("teacherUid", "==", S.me.uid)), list("subjects"), list("sections")]);
    return loads.map(l => ({ ...l, sn: subs.find(x => x.id === l.subjectId)?.name || "?", sec: secs.find(x => x.id === l.sectionId)?.name || "?" }));
}
export const subsFor = ids => ids.length ? inQ("submissions", "loadId", ids) : [];
export const studentsFor = async (secIds) => secIds.length ? (await inQ("users", "sectionId", [...new Set(secIds)])).filter(u => u.role === "student" && u.status === "approved").sort(byName) : [];

/* ---------- cross-posting: other sections of the SAME subject handled by this teacher ---------- */
export async function siblingLoads(loadId) {
    const all = await myLoads(), cur = all.find(l => l.id === loadId);
    return cur ? all.filter(l => l.id !== loadId && l.subjectId === cur.subjectId) : [];
}
/* checklist shown in a composer; each section can optionally get its own due date */
export const crossPostHtml = (sibs, what = "activity") => sibs.length ? `<div class="ed-card" id="xpost" style="margin-top:12px"><b>Also post this ${esc(what)} to my other sections</b>
  <p class="hint">Each section gets its own copy, so deadlines, submissions and grades stay separate. Leave the due date blank to use the same one.</p>
  ${sibs.map(l => `<div class="row" style="align-items:center;gap:12px;flex-wrap:wrap;margin:6px 0"><label class="f inline" style="min-width:160px"><input type="checkbox" id="xp_${l.id}"> ${esc(l.sec)}</label><input type="datetime-local" id="xpd_${l.id}" aria-label="Due date for ${esc(l.sec)}"></div>`).join("")}</div>` : "";
/* returns the ticked sections as [{...load, due}] (due = 0 when blank) */
export const pickedLoads = sibs => sibs.filter(l => $("#xp_" + l.id)?.checked).map(l => ({ ...l, due: fromLocalInput($("#xpd_" + l.id)?.value) }));
