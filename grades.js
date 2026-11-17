/* Term grades: Core + Elective subjects from the admin's curriculum.
   Flow: subject teacher (or the adviser, when a subject has no teacher) types grades -> saves a draft -> submits ->
   administrator approves & finalizes -> students and the adviser see the final grades.
   After that a teacher can ask the administrator to reopen a sheet (grade change request). */
import {S,act,chg,$,$$,esc,list,db,doc,getDoc,setDoc,updateDoc,writeBatch,where,serverTimestamp,toast,ask,refresh,fdate,ts,head,empty,badge,btn,tbl,errMsg,log} from "./core.js";

const syKey=sy=>String(sy||"SY").replace(/[^A-Za-z0-9]+/g,"-");
const sheetId=(sid,sub,t,sy=S.set.schoolYear)=>`${sid}_${sub}_${t}_${syKey(sy)}`;
/* subject order: the admin can number subjects (1 = first); otherwise the DepEd order of the core subjects is used */
const DEPED=["effective communication/mabisang komunikasyon","effective communication","mabisang komunikasyon","general mathematics","general science","life and career skills","pag-aaral ng kasaysayan at lipunang pilipino"];
const ordOf=s=>{if(s.order!==undefined&&s.order!==null&&s.order!=="")return +s.order;const i=DEPED.indexOf((s.name||"").toLowerCase().replace(/\s+/g," ").trim());return i>=0?i+1:999};
export const subjectSort=(a,b)=>ordOf(a)-ordOf(b)||(a.name||"").localeCompare(b.name||"");
const byName=(a,b)=>(a.name||"").localeCompare(b.name||"");
const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;
const gradeOf=sec=>sec.grade||(/\b12\b|XII/i.test(sec.name||"")?"Grade 12":"Grade 11");
/* a "combined" subject (e.g. Effective Communication/Mabisang Komunikasyon) has no teacher of its own:
   its grade is the average of its parts, and each part is taught and graded separately */
export const termsOf=s=>s.combo?(s.parts?.length?[...new Set(s.parts.flatMap(termsOf))].sort():[1,2,3]):(!s.term||s.term==="all"?[1,2,3]:[+s.term]);
const flat=c=>[...c.core,...c.elective].flatMap(s=>s.combo?[s,...(s.parts||[])]:[s]);
export function curriculumFor(sec,subjects){
  const sy=S.set.schoolYear,g=gradeOf(sec);
  const ok=subjects.filter(x=>(!x.schoolYear||!sy||x.schoolYear===sy)&&(x.grade||"Grade 11")===g&&(!sec.track||!x.track||x.track==="All tracks"||x.track===sec.track));
  const combos=new Set(ok.filter(x=>x.combo).map(x=>x.id)),parts=ok.filter(x=>x.parentId&&combos.has(x.parentId));
  const top=ok.filter(x=>!parts.includes(x)).map(x=>x.combo?{...x,parts:parts.filter(p=>p.parentId===x.id).sort(subjectSort)}:x);
  return {core:top.filter(x=>x.type!=="elective").sort(subjectSort),elective:top.filter(x=>x.type==="elective").sort(subjectSort)};
}
const toMap=docs=>{const g={};docs.forEach(x=>{(g[x.subjectId]??={})[x.term]=x.grade});return g};
const gradeAt=(s,g,t)=>{if(!s.combo)return g[s.id]?.[t];
  const v=(s.parts||[]).filter(p=>termsOf(p).includes(t)).map(p=>g[p.id]?.[t]);return v.length&&v.every(x=>x!=null)?Math.round(avg(v)):undefined};
const finalOf=(s,g)=>{const v=termsOf(s).map(t=>gradeAt(s,g,t));return v.every(x=>x!=null)?Math.round(avg(v)):null};
const genAvg=(subs,g)=>{const f=subs.map(s=>finalOf(s,g)).filter(x=>x!=null);return f.length?Math.round(avg(f)):null};

/* the report-card style table */
export function gradeTable(cur,g){
  const row=(s,sub)=>{const T=termsOf(s),f=finalOf(s,g);
    return `<tr><td class="la ${sub?"sub":""}">${esc(s.name)}</td>${[1,2,3].map(t=>T.includes(t)?`<td class="gc">${gradeAt(s,g,t)??""}</td>`:`<td class="na"></td>`).join("")}<td class="gc fg">${f??""}</td><td class="gc ${f==null?"":f>=75?"okc":"badc"}">${f==null?"":f>=75?"Passed":"Failed"}</td></tr>`+(s.parts||[]).map(p=>row(p,true)).join("")};
  const band=t=>`<tr class="band"><td colspan="6">${t}</td></tr>`,none=`<tr><td colspan="6" class="mut">No subjects in the curriculum for this grade yet.</td></tr>`;
  return `<div class="tw"><table class="gt"><thead><tr><th rowspan="2">Learning Areas</th><th colspan="3">TERM</th><th rowspan="2">Final Grade</th><th rowspan="2">Remarks</th></tr><tr><th>1</th><th>2</th><th>3</th></tr></thead><tbody>
  ${band("Core Subjects")}${cur.core.map(row).join("")||none}${band("Elective Subjects")}${cur.elective.map(row).join("")||none}
  <tr><td class="la"><i><b>General Average</b></i></td><td colspan="3"></td><td class="gc fg">${genAvg([...cur.core,...cur.elective],g)??""}</td><td></td></tr></tbody></table></div>`;
}

/* ---------- student: Term Grade ---------- */
export const termGradeStudent=async()=>{
  const m=S.me,sy=S.set.schoolYear;
  const [subjects,fg,ss]=await Promise.all([list("subjects"),list("finalGrades",where("uid","==",m.uid)),getDoc(doc(db,"sections",m.sectionId))]);
  const sec={id:ss.id,...(ss.exists()?ss.data():{})},cur=curriculumFor(sec,subjects),g=toMap(fg.filter(x=>!sy||x.schoolYear===sy));
  const ga=genAvg([...cur.core,...cur.elective],g);
  return head("Term Grade",`${m.name} · ${sec.name||""}${sy?" · SY "+sy:""}`,`<button class="btn ghost" data-a="print">Print</button>`)+
  `<div class="card tg-top"><div><div class="sl">General average</div><div class="tg-big">${ga??"–"}</div></div><p class="mut sm" style="margin:0;max-width:420px">Grades appear here after your teachers submit them and the administrator approves them. A blank cell means it has not been released yet.</p></div>`+gradeTable(cur,g);
};

/* ---------- small text pop-up ---------- */
const askText=(title,label)=>new Promise(res=>{
  const d=document.createElement("dialog");d.className="modal";
  d.innerHTML=`<h3>${esc(title)}</h3><label class="f" for="at_t">${esc(label)}</label><textarea id="at_t" rows="3" maxlength="300"></textarea><div class="end"><button class="btn ghost" value="0">Cancel</button><button class="btn" value="1">Send</button></div>`;
  let done=false;const fin=r=>{if(done)return;done=true;d.close();d.remove();res(r)};
  d.addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;if(b.value!=="1")return fin(null);const t=d.querySelector("#at_t").value.trim();if(!t)return;fin(t)});
  d.addEventListener("cancel",e=>{e.preventDefault();fin(null)});document.body.append(d);d.showModal();d.querySelector("#at_t").focus();
});

/* ---------- teacher: list of grade sheets ---------- */
const ST={none:["Not started","mut"],draft:["Draft","warn"],submitted:["Submitted","info"],final:["Final","ok"],req:["Change requested","bad"]};
const stOf=x=>!x?"none":x.status==="final"&&x.changeReq?"req":x.status;
export const gradesTeacher=async()=>{
  const me=S.me,sy=S.set.schoolYear;
  const [secs,subjects,l0]=await Promise.all([list("sections"),list("subjects"),list("loads",where("teacherUid","==",me.uid))]);
  const loads=l0.filter(l=>!l.schoolYear||!sy||l.schoolYear===sy),adv=S.advSecs.map(s=>s.id);
  const ids=[...new Set([...loads.map(l=>l.sectionId),...adv])];
  const [sheets,advLoads]=await Promise.all([Promise.all(ids.map(i=>list("gradeSheets",where("sectionId","==",i)))).then(a=>a.flat()),Promise.all(adv.map(i=>list("loads",where("sectionId","==",i)))).then(a=>a.flat())]);
  const chips=(sec,sub)=>termsOf(sub).map(t=>{const x=sheets.find(s=>s.id===sheetId(sec.id,sub.id,t)),[lb,k]=ST[stOf(x)];
    return `<a class="tgc ${k}" href="#/gradesheet/${sec.id}/${sub.id}/${t}">Term ${t} · ${lb}</a>`}).join("");
  const line=(sec,sub)=>`<div class="item"><div style="min-width:160px"><b>${esc(sub.name)}</b><div class="mut sm">${esc(sec.name)}</div></div><div class="row">${chips(sec,sub)}</div></div>`;
  const mine=loads.map(l=>{const sec=secs.find(s=>s.id===l.sectionId),sub=subjects.find(s=>s.id===l.subjectId);return sec&&sub?line(sec,sub):""}).join("");
  const advBlocks=S.advSecs.map(a=>{const sec=secs.find(s=>s.id===a.id)||a,c=curriculumFor(sec,subjects),all=flat(c).filter(s=>!s.combo);
    const free=all.filter(s=>!advLoads.some(l=>l.sectionId===sec.id&&l.subjectId===s.id));
    return `<div class="card"><h3>${esc(sec.name)}: subjects with no teacher yet</h3><p class="hint">As adviser you can type these grades yourself. Once a teacher is assigned to a subject, that teacher enters it instead.</p>${free.map(s=>line(sec,s)).join("")||empty("Every subject in this section has a teacher.","check")}</div>`}).join("");
  return head("Term Grades","Type the grades, save as draft, then submit for the administrator's approval")+
  `<div class="card"><h3>My subjects</h3>${mine||empty("No subject loads yet. The administrator assigns loads.","book")}</div>${advBlocks}
  <p class="hint">Draft = only you can edit. Submitted = waiting for the administrator. Final = approved; students and the adviser can see it.</p>`;
};

/* ---------- teacher: one sheet (section + subject + term) ---------- */
let G=null;
export const gradeSheet=async([sid,subId,term])=>{
  term=+term;const me=S.me,id=sheetId(sid,subId,term);
  const [ss,bs,sh,users,loads]=await Promise.all([getDoc(doc(db,"sections",sid)),getDoc(doc(db,"subjects",subId)),getDoc(doc(db,"gradeSheets",id)),list("users",where("sectionId","==",sid)),list("loads",where("sectionId","==",sid),where("subjectId","==",subId))]);
  const sec={id:sid,...ss.data()},sub={id:subId,...bs.data()},sheet=sh.exists()?{id,...sh.data()}:null;
  const isAdv=S.advSecs.some(s=>s.id===sid),mineLoad=loads.some(l=>l.teacherUid===me.uid),mine=mineLoad||(!loads.length&&isAdv);
  if(!mine)return `<div class="card">${empty("You are not assigned to this subject.","book")}<p class="right"><a class="btn" href="#/grades">Back</a></p></div>`;
  const studs=users.filter(u=>u.role==="student"&&u.status==="approved").sort(byName),status=stOf(sheet),canEdit=!sheet||(sheet.by===me.uid&&sheet.status==="draft");
  G={sid,subId,term,id,sheet,adv:!mineLoad,sec,sub};
  const [lb,k]=ST[status];
  return `<div class="ph"><div><h1>${esc(sub.name)} · Term ${term}</h1><p class="mut">${esc(sec.name)}${S.set.schoolYear?" · SY "+esc(S.set.schoolYear):""}</p></div><div class="row"><a class="btn ghost" href="#/grades">← Back</a></div></div>
  <div class="card"><div class="row between"><span>${badge(lb,k)}${sheet?.byName?` <span class="mut sm">Entered by ${esc(sheet.byName)}${sheet.byRole==="adviser"?" (adviser)":""}</span>`:""}</span></div>
  ${sheet?.note?`<div class="note" style="margin-top:8px"><b>Message from the administrator:</b> ${esc(sheet.note)}</div>`:""}
  ${sheet?.changeReq?`<div class="note" style="margin-top:8px"><b>Change requested:</b> ${esc(sheet.changeReq.reason)}<br><span class="mut sm">Waiting for the administrator.</span></div>`:""}
  ${canEdit?"":`<p class="hint">${status==="submitted"?"This sheet is waiting for the administrator.":status==="final"||status==="req"?"Approved and final.":"This sheet was started by another user."}</p>`}</div>
  <div class="card">${tbl(["#","Student","LRN","Grade (0 to 100)"],studs.map((u,i)=>[i+1,esc(u.name),esc(u.lrn||"–"),canEdit?`<input class="gin" type="number" inputmode="numeric" min="0" max="100" step="1" data-u="${u.id}" value="${sheet?.grades?.[u.id]??""}" aria-label="Grade for ${esc(u.name)}">`:`<b>${sheet?.grades?.[u.id]??"–"}</b>`]),"No approved students in this section yet.","gsheet")}
  <div class="row" style="margin-top:12px">${canEdit?`<button class="btn ghost" data-a="gs_save">Save draft</button><button class="btn" data-a="gs_submit">Submit for approval</button>`:""}
  ${(status==="final")&&sheet.by===me.uid?`<button class="btn ghost" data-a="gs_req">Request grade change</button>`:""}</div></div>`;
};
const readGrades=()=>{const g={};let blanks=0;$$(".gin").forEach(i=>{const t=i.value.trim();if(t===""){blanks++;return}const n=Number(t);if(!Number.isFinite(n)||n<0||n>100)throw new Error("Grades must be between 0 and 100.");g[i.dataset.u]=Math.round(n)});return {g,blanks}};
const saveSheet=async submit=>{
  let r;try{r=readGrades()}catch(e){return toast(e.message,"bad")}
  if(submit){const msg=r.blanks?`${r.blanks} student(s) have no grade yet. Submit anyway? You cannot edit after submitting.`:"Submit these grades to the administrator? You cannot edit after submitting.";if(!await ask(msg,"Submit"))return}
  const me=S.me,ref=doc(db,"gradeSheets",G.id);
  const f={grades:r.g,status:submit?"submitted":"draft",by:me.uid,byName:me.name,byRole:G.adv?"adviser":"teacher",note:"",updatedAt:serverTimestamp(),...(submit?{submittedAt:serverTimestamp()}:{})};
  if(G.sheet)await updateDoc(ref,f);else await setDoc(ref,{...f,sectionId:G.sid,subjectId:G.subId,term:G.term,schoolYear:S.set.schoolYear||"",changeReq:null});
  log((submit?"submitted":"saved draft")+" grades "+G.id);toast(submit?"Submitted to the administrator.":"Draft saved.");
  if(submit)location.hash="#/grades";else refresh();
};
act.gs_save=()=>saveSheet(false);act.gs_submit=()=>saveSheet(true);
act.gs_req=async()=>{const t=await askText("Request a grade change","Tell the administrator what needs to change and why");if(!t)return;
  await updateDoc(doc(db,"gradeSheets",G.id),{changeReq:{reason:t,at:Date.now(),by:S.me.uid,byName:S.me.name}});toast("Request sent to the administrator.");refresh()};

/* ---------- adviser: consolidated grades ---------- */
let CONS=null;
export async function consolidated(sec,studs){
  const [subjects,fg]=await Promise.all([list("subjects"),list("finalGrades",where("sectionId","==",sec.id))]);const sy=S.set.schoolYear;
  CONS={sec,studs,cur:curriculumFor(sec,subjects),fg:fg.filter(x=>!sy||x.schoolYear===sy),view:"final",pick:studs[0]?.id||""};
  return `<div class="card" id="consol">${consBody()}</div>`;
}
const consBody=()=>{
  const {cur,studs,fg,view,pick}=CONS,subs=flat(cur),top=[...cur.core,...cur.elective];
  const cell=(u,s)=>{const g=toMap(fg.filter(x=>x.uid===u.id));if(view==="final")return finalOf(s,g);const t=+view;return termsOf(s).includes(t)?(gradeAt(s,g,t)??null):"–"};
  const rows=studs.map(u=>{const g=toMap(fg.filter(x=>x.uid===u.id)),vals=subs.map(s=>cell(u,s));
    const ga=view==="final"?genAvg(top,g):(()=>{const n=top.map(s=>cell(u,s)).filter(x=>typeof x==="number");return n.length?Math.round(avg(n)):null})();
    return [`<button class="linkb" data-a="cons_pick" data-id="${u.id}">${esc(u.name)}</button>`,...vals.map(x=>x??""),`<b>${ga??""}</b>`]});
  const sel=`<select data-c="cons_view" aria-label="Show">${[["final","Final grade"],["1","Term 1"],["2","Term 2"],["3","Term 3"]].map(([v,t])=>`<option value="${v}" ${view===v?"selected":""}>${t}</option>`).join("")}</select>`;
  const u=studs.find(x=>x.id===pick);
  return `<div class="row between"><h3>Consolidated term grades</h3>${sel}</div>
  ${tbl(["Student",...subs.map(s=>esc(s.name)),"General avg"],rows,"No approved students yet.","rec nw")}
  <p class="hint">Only grades approved and finalized by the administrator appear here. Tap a student's name to see the full grade sheet.</p>
  ${u?`<h3 style="margin-top:14px">${esc(u.name)}</h3>${gradeTable(cur,toMap(fg.filter(x=>x.uid===u.id)))}`:""}`;
};
const consDraw=()=>{const e=document.getElementById("consol");if(e)e.innerHTML=consBody()};
chg.cons_view=el=>{CONS.view=el.value;consDraw()};
act.cons_pick=el=>{CONS.pick=el.dataset.id;consDraw()};

/* ---------- admin: approve, return, change requests ---------- */
let AD=[];
export const gradesAdmin=async()=>{
  const [sheets,secs,subjects]=await Promise.all([list("gradeSheets"),list("sections"),list("subjects")]);const sy=S.set.schoolYear;
  AD=sheets.filter(x=>!sy||!x.schoolYear||x.schoolYear===sy).sort((a,b)=>ts(b.updatedAt)-ts(a.updatedAt));
  const nm=(a,i)=>esc(a.find(x=>x.id===i)?.name||"?"),n=x=>Object.keys(x.grades||{}).length;
  const base=x=>[nm(secs,x.sectionId),nm(subjects,x.subjectId),"Term "+x.term,esc(x.byName||"")+(x.byRole==="adviser"?" (adviser)":""),n(x)+" grade(s)"];
  const view=x=>btn("gs_view","View",x.id,"ghost");
  const sub=AD.filter(x=>x.status==="submitted"),req=AD.filter(x=>x.status==="final"&&x.changeReq),dr=AD.filter(x=>x.status==="draft"),fin=AD.filter(x=>x.status==="final"&&!x.changeReq);
  return head("Grades","Approve submitted term grades and handle change requests")+
  `<div class="card"><h3>Waiting for approval ${sub.length?badge(sub.length,"warn"):""}</h3>${tbl(["Section","Subject","Term","Entered by","Grades",""],sub.map(x=>[...base(x),`<div class="row">${view(x)}${btn("gs_fin","Approve & finalize",x.id,"ok")}${btn("gs_ret","Return",x.id,"ghost")}</div>`]),"Nothing is waiting for approval.","nw")}</div>
  <div class="card"><h3>Grade change requests ${req.length?badge(req.length,"bad"):""}</h3>${tbl(["Section","Subject","Term","Teacher","Reason",""],req.map(x=>[...base(x).slice(0,4),esc(x.changeReq.reason),`<div class="row">${view(x)}${btn("gs_reopen","Reopen for editing",x.id,"ok")}${btn("gs_dismiss","Dismiss",x.id,"ghost")}</div>`]),"No change requests.","nw")}</div>
  <div class="card"><h3>Finalized (${fin.length}) and drafts in progress (${dr.length})</h3>${tbl(["Section","Subject","Term","Entered by","Status",""],[...fin.map(x=>[...base(x).slice(0,4),badge("Final","ok"),view(x)]),...dr.map(x=>[...base(x).slice(0,4),badge("Draft","warn"),view(x)])],"Nothing yet.","nw")}</div>`;
};
const findSheet=id=>AD.find(x=>x.id===id);
act.gs_view=async el=>{
  const x=findSheet(el.dataset.id);if(!x)return;
  const us=(await list("users",where("sectionId","==",x.sectionId))).filter(u=>u.role==="student").sort(byName);
  const d=document.createElement("dialog");d.className="modal";
  d.innerHTML=`<h3>Grades</h3><div class="tw" style="max-height:55vh;overflow:auto">${tbl(["Student","Grade"],us.map(u=>[esc(u.name),`<b>${x.grades?.[u.id]??"–"}</b>`]),"No students.")}</div><div class="end"><button class="btn">Close</button></div>`;
  d.addEventListener("click",e=>{if(e.target.closest("button")){d.close();d.remove()}});d.addEventListener("cancel",()=>d.remove());document.body.append(d);d.showModal();
};
act.gs_fin=async el=>{
  const x=findSheet(el.dataset.id);if(!x)return;if(!await ask("Approve and finalize these grades? Students and the adviser will see them.","Finalize"))return;
  const b=writeBatch(db);
  Object.entries(x.grades||{}).forEach(([uid,g])=>b.set(doc(db,"finalGrades",`${uid}_${x.subjectId}_${x.term}_${syKey(x.schoolYear)}`),{uid,sectionId:x.sectionId,subjectId:x.subjectId,term:x.term,schoolYear:x.schoolYear||"",grade:g,at:serverTimestamp()}));
  b.update(doc(db,"gradeSheets",x.id),{status:"final",changeReq:null,note:"",finalizedAt:serverTimestamp()});
  await b.commit();log("finalized grades "+x.id);toast("Grades finalized.");refresh();
};
act.gs_ret=async el=>{const x=findSheet(el.dataset.id);if(!x)return;const t=await askText("Return to the teacher","What should be corrected?");if(!t)return;
  await updateDoc(doc(db,"gradeSheets",x.id),{status:"draft",note:t,updatedAt:serverTimestamp()});toast("Returned to the teacher.");refresh()};
act.gs_reopen=async el=>{const x=findSheet(el.dataset.id);if(!x)return;if(!await ask("Reopen this sheet so the teacher can edit and submit it again? Students keep seeing the current grades until you finalize again.","Reopen"))return;
  await updateDoc(doc(db,"gradeSheets",x.id),{status:"draft",note:"Reopened: "+x.changeReq.reason,changeReq:null,updatedAt:serverTimestamp()});toast("Sheet reopened.");refresh()};
act.gs_dismiss=async el=>{if(!await ask("Dismiss this change request?","Dismiss"))return;await updateDoc(doc(db,"gradeSheets",el.dataset.id),{changeReq:null});toast("Request dismissed.");refresh()};
