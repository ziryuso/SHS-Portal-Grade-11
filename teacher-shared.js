/**
 * teacher-shared.js - shared helpers: query chunking, stats, pop-up form, term/week fields, loads and students lookups.
 */
import { S, collection, db, doc, esc, ic, list, pct, serverTimestamp, where } from "./core.js";
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
    d.innerHTML = `<h3>${esc(title)}</h3>${fields.map(f => `<label class="f" for="fd_${f.k}">${esc(f.l)}</label>${f.cb ? f.cb.map(([x, t]) => `<label class="f inline"><input type="checkbox" class="fd_cb_${f.k}" value="${esc(x)}"> ${esc(t)}</label>`).join("") : f.sel ? `<select id="fd_${f.k}">${f.sel.map(([x, t]) => `<option value="${x}" ${x == f.def ? "selected" : ""}>${esc(t)}</option>`).join("")}</select>` : f.ta ? `<textarea id="fd_${f.k}" rows="3"></textarea>` : `<input id="fd_${f.k}" ${f.type ? `type="${f.type}"` : ""} placeholder="${esc(f.ph || "")}">`}`).join("")}<p class="bad sm" id="fd_err" role="alert"></p><div class="end"><button class="btn ghost" value="0">Cancel</button><button class="btn" value="1">${esc(ok)}</button></div>`;
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
            o[f.k] = f.cb ? [...d.querySelectorAll(".fd_cb_" + f.k + ":checked")].map(x => x.value) : d.querySelector("#fd_" + f.k).value.trim();
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
/* ---------- crossposting: same teacher, same subject, different sections ---------- */
export async function siblingLoads(loadId) {
    const all = await myLoads(), me = all.find(l => l.id === loadId);
    return me ? all.filter(l => l.id !== loadId && l.subjectId === me.subjectId).sort((a, b) => a.sec.localeCompare(b.sec)) : [];
}
/* checkbox group for fdlg(): "also post to my other sections" */
export const XF = sibs => sibs.length ? [{ k: "xs", l: "Also post to my other sections of this subject", cb: sibs.map(l => [l.id, l.sec]) }] : [];
/* make sure the target class has a topic with this name (adds the create to the batch if missing) */
export async function ensureTopic(b, l, name) {
    const t = await list("topics", where("loadId", "==", l.id)).catch(() => []);
    if (!t.some(x => x.name === name))
        b.set(doc(collection(db, "topics")), { loadId: l.id, sectionId: l.sectionId, name, by: S.me.uid, at: serverTimestamp() });
}
export const newXid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
export const xBadge = x => x.xid ? ` <span class="badge info" title="Posted to several of your sections">Crossposted</span>` : "";
