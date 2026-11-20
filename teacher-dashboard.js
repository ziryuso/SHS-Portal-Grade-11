/**
 * teacher-dashboard.js - teacher dashboard (customizable widgets).
 */
import {
    S, act, annHtml, bar, db, doc, empty, errMsg,
    esc, fdate, fday, greet, list, refresh, tbl, toast,
    ts, updateDoc, where
} from "./core.js";
import { counted, fm, inQ, mean, mini, myLoads, pages, sp, studentsFor, subsFor } from "./teacher-shared.js";

/* ---------- dashboard ---------- */
pages.home = async () => {
    const loads = await myLoads(), ids = loads.map(l => l.id), secIds = loads.map(l => l.sectionId);
    const [acts0, subs, studs] = await Promise.all([ids.length ? list("activities", where("by", "==", S.me.uid)) : [], subsFor(ids), studentsFor(secIds)]);
    const acts = acts0.filter(a => a.v === 2), actOf = id => acts.find(a => a.id === id), nameOf = uid => studs.find(s => s.id === uid)?.name || "Student";
    const toGrade = subs.filter(s => s.graded === false && actOf(s.actId));
    const gs = subs.filter(counted);
    let adv = "";
    if (S.advSecs.length) {
        const p = (await inQ("users", "sectionId", S.advSecs.map(s => s.id))).filter(u => u.role === "student" && u.status === "pending");
        adv = p.length ? `<div class="card" style="border-color:var(--pri)"><div class="row between"><div><b>${p.length} student${p.length > 1 ? "s" : ""} waiting for your approval</b><div class="mut sm">Advisory: ${esc(S.advSecs.map(s => s.name).join(", "))}</div></div><a class="btn" href="#/advisory">Review</a></div></div>` : "";
    }
    const recent = [...subs].sort((a, b) => ts(b.at) - ts(a.at)).slice(0, 6);
    const { order, hide } = dashPrefs(), show = id => !hide.includes(id);
    const P = {
        overview: `<div class="card"><h3>Overview</h3><div class="statgrp">${mini("My classes", loads.length, "book")}${mini("Students", studs.length, "users")}${mini("Activities", acts.length, "list")}${mini("Submissions", subs.length, "check", "ok")}${mini("To grade", toGrade.length, "clock", toGrade.length ? "warn" : "ok")}${mini("Average score", fm(mean(gs.map(sp))), "star")}</div></div>`,
        perf: `<div class="card"><h3>Class performance</h3>${loads.map(l => {
            const ss = subs.filter(s => s.loadId === l.id && counted(s)), a = mean(ss.map(sp));
            return `<div class="item"><div style="flex:1;min-width:160px"><b>${esc(l.sn)}</b> <span class="mut sm">${esc(l.sec)}</span>${bar(a || 0, a != null && a < 75 ? "warn" : "ok")}</div><b>${fm(a)}</b></div>`;
        }).join("") || empty("No classes assigned yet.", "book")}</div>`,
        grade: `<div class="card"><h3>Needs grading</h3>${toGrade.slice(0, 6).map(s => `<div class="item"><div><b>${esc(nameOf(s.uid))}</b><div class="mut sm">${esc(actOf(s.actId)?.title || "")}</div></div><a class="btn sm" href="#/grade/${s.actId}">Grade</a></div>`).join("") || empty("Nothing to grade.", "check")}</div>`,
        recent: `<div class="card"><h3>Recent submissions</h3>${tbl(["Student", "Activity", "Score", "When"], recent.map(s => [esc(nameOf(s.uid)), esc(actOf(s.actId)?.title || "—"), counted(s) ? sp(s) + "%" : "pending", fdate(ts(s.at))]), "No submissions yet.", "nw")}</div>`,
        ann: show("ann") ? `<h2>Announcements</h2>${await annHtml(3)}` : ""
    };
    const parts = order.filter(show).map(id => `<div class="wd ${WID.find(w => w[0] === id)[2] ? "full" : ""}">${P[id]}</div>`).join("");
    return `<div class="banner"><h1>${greet()}, ${esc(S.me.name.split(",").pop().trim().split(" ")[0])}!</h1><p>${fday(Date.now())}</p></div>${adv}
  <div class="row between noprint" style="margin-bottom:10px"><span class="mut sm">${hide.length ? hide.length + " section(s) hidden" : ""}</span><button class="btn sm ghost" data-a="t_custom">⚙ Customize</button></div>
  <div class="wgrid">${parts || `<div class="card wd full">${empty("All sections hidden. Tap Customize to show them.", "grid")}</div>`}</div>`;
};
/* dashboard sections the teacher can reorder / hide (saved on the teacher's own profile so it follows them to any device) */
const WID = [["overview", "Overview", 1], ["perf", "Class performance", 0], ["grade", "Needs grading", 0], ["recent", "Recent submissions", 1], ["ann", "Announcements", 1]];
const dashPrefs = () => {
    const d = S.me.dash || {}, ids = WID.map(w => w[0]), o = (d.order || []).filter(x => ids.includes(x));
    return { order: [...o, ...ids.filter(x => !o.includes(x))], hide: (d.hide || []).filter(x => ids.includes(x)) };
};
act.t_custom = () => {
    let { order } = dashPrefs();
    const hs = new Set(dashPrefs().hide), d = document.createElement("dialog");
    d.className = "modal";
    const draw = () => {
        d.innerHTML = `<h3>Customize dashboard</h3><p class="mut sm">Reorder, or untick to hide.</p><div class="wl">${order.map((id, i) => `<div class="wr"><label><input type="checkbox" data-g="vis" data-id="${id}" ${hs.has(id) ? "" : "checked"}> ${esc(WID.find(w => w[0] === id)[1])}</label><span><button class="btn sm ghost" data-g="up" data-id="${id}" ${i ? "" : "disabled"} aria-label="Move up">↑</button><button class="btn sm ghost" data-g="dn" data-id="${id}" ${i < order.length - 1 ? "" : "disabled"} aria-label="Move down">↓</button></span></div>`).join("")}</div>
    <div class="end"><button class="btn ghost" data-g="reset">Reset</button><button class="btn ghost" data-g="x">Cancel</button><button class="btn" data-g="ok">Save</button></div>`;
    };
    const fin = () => { d.close(); d.remove(); };
    d.addEventListener("click", async (e) => {
        const el = e.target.closest("[data-g]");
        if (!el)
            return;
        const g = el.dataset.g, id = el.dataset.id, i = order.indexOf(id);
        if (g === "vis") {
            el.checked ? hs.delete(id) : hs.add(id);
            return;
        }
        if (g === "up" && i > 0)
            [order[i - 1], order[i]] = [order[i], order[i - 1]];
        if (g === "dn" && i > -1 && i < order.length - 1)
            [order[i + 1], order[i]] = [order[i], order[i + 1]];
        if (g === "reset") {
            order = WID.map(w => w[0]);
            hs.clear();
        }
        if (g === "x")
            return fin();
        if (g === "ok") {
            const dash = { order, hide: [...hs] };
            try {
                await updateDoc(doc(db, "users", S.me.uid), { dash });
                S.me.dash = dash;
                fin();
                toast("Dashboard saved.");
                refresh();
            }
            catch (err) {
                toast(errMsg(err), "bad");
            }
            return;
        }
        draw();
    });
    d.addEventListener("cancel", e => { e.preventDefault(); fin(); });
    draw();
    document.body.append(d);
    d.showModal();
};
