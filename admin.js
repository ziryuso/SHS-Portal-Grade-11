import {S,act,chg,$,esc,v,list,count,db,doc,getDoc,setDoc,addDoc,updateDoc,deleteDoc,collection,where,orderBy,limit,serverTimestamp,toast,ask,go,refresh,fdate,ts,badge,stat,tbl,head,empty,btn,log,greet,fday,annHtml,ic} from "./core.js";

export const nav=()=>[
  {k:"home",l:"Dashboard",i:"home"},
  {k:"approvals",l:"Approvals",i:"check"},
  {k:"accounts",l:"Accounts",i:"users"},
  {k:"curriculum",l:"Curriculum",i:"book"},
  {k:"loads",l:"Sections & Loads",i:"grid"},
  {k:"announcements",l:"News",i:"bell"},
  {k:"settings",l:"Settings",i:"settings"},
  {k:"logs",l:"Logs & Storage",i:"shield"}];
import {generalProfile} from "./profile.js";
export const pages={profile:generalProfile};
const byName=(a,b)=>(a.name||"").localeCompare(b.name||"");
const SB={approved:["Approved","ok"],pending:["Pending","warn"],inactive:["Inactive","bad"]};

/* ---------- calendar (stored in settings/calendar) ---------- */
const MN=["January","February","March","April","May","June","July","August","September","October","November","December"];
const CT={activity:["Activity","info"],reminder:["Reminder","warn"],note:["Note","mut"]};
const pad=n=>String(n).padStart(2,"0"),dkey=(y,m,d)=>`${y}-${pad(m+1)}-${pad(d)}`;
const cal={y:0,m:0,sel:"",ev:[]};
const calReset=()=>{const n=new Date();cal.y=n.getFullYear();cal.m=n.getMonth();cal.sel=dkey(cal.y,cal.m,n.getDate())};
const calRef=()=>doc(db,"settings","calendar");
const loadCal=async()=>{try{const s=await getDoc(calRef());return s.exists()?(s.data().items||[]):[]}catch{return[]}};
const calSave=async items=>{await setDoc(calRef(),{items,updatedAt:serverTimestamp()});cal.ev=items};
const calHtml=()=>{
  const {y,m,sel,ev}=cal,first=new Date(y,m,1).getDay(),days=new Date(y,m+1,0).getDate(),n=new Date(),today=dkey(n.getFullYear(),n.getMonth(),n.getDate());
  const by={};ev.forEach(e=>(by[e.date]||(by[e.date]=[])).push(e));
  let cells="";for(let i=0;i<first;i++)cells+=`<span class="cd off"></span>`;
  for(let d=1;d<=days;d++){const k=dkey(y,m,d),L=by[k]||[];
    cells+=`<button type="button" class="cd${k===today?" today":""}${k===sel?" sel":""}" data-a="calday" data-id="${k}" aria-label="${MN[m]} ${d}${L.length?", "+L.length+" item(s)":""}"><b>${d}</b>${L.length?`<span class="dots">${L.slice(0,3).map(e=>`<i class="${esc(e.type)}"></i>`).join("")}${L.length>3?"+":""}</span>`:""}</button>`}
  const day=(by[sel]||[]).slice().sort((a,b)=>(a.time||"").localeCompare(b.time||"")),dt=new Date(sel+"T00:00:00");
  return `<div class="calw"><div><div class="calh"><div class="row">${btn("calprev","‹","","",'aria-label="Previous month"')}<b class="calt">${MN[m]} ${y}</b>${btn("calnext","›","","",'aria-label="Next month"')}</div>${btn("caltoday","Today")}</div>
  <div class="calg">${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(x=>`<span class="cw">${x}</span>`).join("")}${cells}</div>
  <div class="legend"><span><i class="activity"></i>Activity</span><span><i class="reminder"></i>Reminder</span><span><i class="note"></i>Note</span></div></div>
  <div class="cald"><h3>${esc(dt.toLocaleDateString("en-PH",{weekday:"long",month:"long",day:"numeric",year:"numeric"}))}</h3>
  ${day.length?day.map(e=>{const [lb,k]=CT[e.type]||CT.note;return `<div class="cev"><div class="row between"><div>${badge(lb,k)} ${e.time?`<span class="mut sm">${esc(e.time)}</span> `:""}<b>${esc(e.title)}</b></div>${btn("caldel","Delete",e.id,"danger")}</div>${e.note?`<p class="mut sm">${esc(e.note).replace(/\n/g,"<br>")}</p>`:""}</div>`}).join(""):`<p class="mut sm">Nothing scheduled for this day.</p>`}
  <div class="cadd"><input id="ce_t" placeholder="Title" aria-label="Title"><div class="g2"><select id="ce_ty" aria-label="Type"><option value="activity">Activity</option><option value="reminder">Reminder</option><option value="note">Note</option></select><input id="ce_tm" type="time" aria-label="Time (optional)"></div>
  <textarea id="ce_n" rows="2" placeholder="Details (optional)" aria-label="Details"></textarea><div><button class="btn" data-a="caladd">Add to calendar</button></div></div></div></div>`;
};
const calDraw=()=>{const el=$("#cal");if(el)el.innerHTML=calHtml()};
act.calprev=()=>{cal.m--;if(cal.m<0){cal.m=11;cal.y--}calDraw()};
act.calnext=()=>{cal.m++;if(cal.m>11){cal.m=0;cal.y++}calDraw()};
act.caltoday=()=>{calReset();calDraw()};
act.calday=el=>{cal.sel=el.dataset.id;calDraw()};
act.caladd=async()=>{
  const t=v("ce_t");if(!t)return toast("Enter a title.","bad");
  const s=await getDoc(calRef()),cur=s.exists()?(s.data().items||[]):[];
  const e={id:Date.now().toString(36)+Math.random().toString(36).slice(2,6),date:cal.sel,time:v("ce_tm"),type:v("ce_ty")||"note",title:t,note:v("ce_n")};
  await calSave([...cur,e]);log("added calendar "+e.type);toast("Added to calendar.");calDraw();
};
act.caldel=async el=>{
  if(!await ask("Delete this calendar item?","Delete",true))return;
  const s=await getDoc(calRef());await calSave((s.exists()?(s.data().items||[]):[]).filter(x=>x.id!==el.dataset.id));toast("Deleted.");calDraw();
};

/* ---------- dashboard ---------- */
/* the teacher's name is copied into every load; keep those copies in step with the teacher's account */
async function syncNames(tch,loads){
  tch=tch||await list("users",where("role","==","teacher"));loads=loads||await list("loads");
  const nm=Object.fromEntries(tch.map(t=>[t.id,t.name])),stale=loads.filter(l=>nm[l.teacherUid]&&nm[l.teacherUid]!==l.teacherName);
  await Promise.all(stale.map(l=>updateDoc(doc(db,"loads",l.id),{teacherName:nm[l.teacherUid]}).then(()=>{l.teacherName=nm[l.teacherUid]})));
  return stale.length;
}
act.syncnames=async()=>{const n=await syncNames();toast(n?`Updated the teacher name on ${n} subject load(s).`:"Teacher names are already up to date.");refresh()};
pages.home=async()=>{
  syncNames().catch(()=>{});
  const [stu,tea,pend,secs,acts,subs,reqs,logs,pending,calItems]=await Promise.all([
    count("users",where("role","==","student"),where("status","==","approved")),count("users",where("role","==","teacher"),where("status","==","approved")),
    count("users",where("status","==","pending")),count("sections"),count("activities"),count("submissions"),
    list("requests",where("done","==",false)),list("logs",orderBy("at","desc"),limit(6)),list("users",where("status","==","pending")),loadCal()]);
  cal.ev=calItems;calReset();
  return `<div class="banner"><h1>${greet()}, Administrator</h1><p>${fday(Date.now())}</p></div>
  <div class="cards">${stat("Students",stu,"Approved","users")}${stat("Teachers",tea,"Approved","users","ok")}${stat("Sections",secs,"","grid")}
  ${stat("Pending approvals",pend,"Students and teachers","clock",pend?"warn":"ok")}${stat("Open requests",reqs.length,"From students","bell",reqs.length?"warn":"ok")}${stat("Activities / Submissions",`${acts} / ${subs}`,"All time","chart")}</div>
  <div class="card"><h3>Calendar</h3><div id="cal">${calHtml()}</div></div>
  <div class="cols"><div class="card"><h3>Waiting for approval</h3>${tbl(["Name","Role",""],pending.slice(0,6).map(x=>[esc(x.name),esc(x.role),btn("apv","Approve",x.id,"ok")]),"Nobody is waiting.","nw")}${pending.length>6?`<p><a href="#/approvals">See all ${pending.length}</a></p>`:""}</div>
  <div class="card"><h3>Recent activity</h3>${tbl(["When","Who","Action"],logs.map(x=>[fdate(ts(x.at)),esc(x.by),esc(x.action)]),"No activity logged yet.","nw")}</div></div>
  <h2>Latest announcements</h2>${await annHtml(2)}`;
};

/* ---------- approvals ---------- */
pages.approvals=async()=>{
  const [users,reqs,secs]=await Promise.all([list("users",where("status","==","pending")),list("requests",where("done","==",false)),list("sections")]);
  const sn=id=>esc(secs.find(s=>s.id===id)?.name||"–"),T=users.filter(u=>u.role==="teacher"),St=users.filter(u=>u.role==="student");
  return head("Approvals")+`<div class="card"><h3>Teacher accounts</h3>${tbl(["Name","Email",""],T.map(x=>[esc(x.name),esc(x.email),btn("apv","Approve",x.id,"ok")]),"No teachers waiting.","nw")}</div>
  <div class="card"><h3>Student accounts</h3><p class="hint">Advisers normally approve their own students. You can approve any student here.</p>${tbl(["Name","LRN","Section","Email",""],St.map(x=>[esc(x.name),esc(x.lrn||"–"),sn(x.sectionId),esc(x.email),btn("apv","Approve",x.id,"ok")]),"No students waiting.","nw")}</div>
  <div class="card"><h3>Student requests</h3>${tbl(["From","Request","When",""],reqs.map(x=>[esc(x.email),esc(x.type),fdate(ts(x.at)),btn("reqdone","Mark done",x.id)]),"No open requests.","nw")}</div>`;
};
act.apv=async el=>{await updateDoc(doc(db,"users",el.dataset.id),{status:"approved"});log("approved user "+el.dataset.id);toast("Account approved.");refresh()};
act.reqdone=async el=>{await updateDoc(doc(db,"requests",el.dataset.id),{done:true});toast("Marked as done.");refresh()};

/* ---------- accounts ---------- */
pages.accounts=async([role="student"])=>{
  const [users,secs]=await Promise.all([list("users",where("role","==",role)),list("sections")]);
  users.sort(byName);
  const sn=id=>esc(secs.find(s=>s.id===id)?.name||"–");
  S.after=()=>$("#q")?.addEventListener("input",e=>{const q=e.target.value.toLowerCase();document.querySelectorAll("tbody tr[data-s]").forEach(r=>r.style.display=r.dataset.s.includes(q)?"":"none")});
  return head("Accounts",`${users.length} ${role}(s)`)+`<div class="tabs"><a class="${role==="student"?"on":""}" href="#/accounts/student">Students</a><a class="${role==="teacher"?"on":""}" href="#/accounts/teacher">Teachers</a></div>
  <div class="card"><input id="q" placeholder="Search name or email…" aria-label="Search accounts" style="max-width:360px;margin-bottom:12px">
  ${tbl(role==="student"?["Name","LRN","Section","Email","Status",""]:["Name","Email","Status",""],users.map(x=>{const [lb,k]=SB[x.status]||[x.status,""];
    const actions=`<div class="row">${x.status!=="approved"?btn("apv","Approve",x.id,"ok"):btn("deact","Deactivate",x.id,"ghost")}${btn("delprof","Delete profile",x.id,"danger")}</div>`;
    return {attr:`data-s="${esc((x.name+" "+x.email+" "+(x.lrn||"")).toLowerCase())}"`,c:role==="student"?[esc(x.name),esc(x.lrn||"–"),sn(x.sectionId),esc(x.email),badge(lb,k),actions]:[esc(x.name),esc(x.email),badge(lb,k),actions]}}),"No accounts yet.","nw")}
  <p class="hint">Deleting a profile removes the portal record only. The person can sign in again and re-register.</p></div>`;
};
act.deact=async el=>{if(!await ask("Deactivate this account? They will not be able to use the portal.","Deactivate",true))return;await updateDoc(doc(db,"users",el.dataset.id),{status:"inactive"});log("deactivated user "+el.dataset.id);toast("Account deactivated.");refresh()};
act.delprof=async el=>{if(!await ask("Delete this profile? Their submissions stay in the database.","Delete",true))return;await deleteDoc(doc(db,"users",el.dataset.id));log("deleted profile "+el.dataset.id);toast("Profile deleted.");refresh()};

/* ---------- curriculum ---------- */
const CF={sy:"",grade:"",term:"",track:""},CUR={subs:[]};
const sGrade=x=>x.grade||"Grade 11",sYear=x=>x.schoolYear||S.set.schoolYear||"";
const termTxt=t=>!t||t==="all"?"All terms":"Term "+t;
const curRows=()=>CUR.subs.filter(x=>(!CF.sy||sYear(x)===CF.sy)&&(!CF.grade||sGrade(x)===CF.grade)
  &&(!CF.term||!x.term||x.term==="all"||String(x.term)===CF.term)&&(!CF.track||!x.track||x.track==="All tracks"||x.track===CF.track));
const curList=()=>{const r=curRows();return `<div class="muted sm mut" style="margin-bottom:6px">${r.length} of ${CUR.subs.length} subject(s)</div>`+
  tbl(["Subject","Grade","School year","Type","Term","Track",""],r.map(x=>[esc(x.name),esc(sGrade(x)),esc(sYear(x)||"–"),esc(x.type),termTxt(x.term),esc(x.track),
    `<div class="row">${btn("editsub","Edit",x.id,"ghost")}${btn("delsub","Delete",x.id,"danger")}</div>`]),"No subjects match these filters.")};
pages.curriculum=async()=>{
  CUR.subs=(await list("subjects")).sort(byName);
  const years=[...new Set([S.set.schoolYear,...CUR.subs.map(sYear)].filter(Boolean))].sort().reverse();
  const sel=(f,id,label,opts)=>`<div><label class="f" for="${id}">${label}</label><select id="${id}" data-c="cf" data-f="${f}"><option value="">All</option>${opts.map(([v,t])=>`<option value="${esc(v)}" ${CF[f]===v?"selected":""}>${esc(t)}</option>`).join("")}</select></div>`;
  return head("SHS Curriculum","Subjects offered",`<button class="btn" data-a="addsub">+ Add subject</button>`)+
  `<div class="card"><div class="g2">${sel("sy","cf_sy","School year",years.map(y=>[y,y]))}${sel("grade","cf_gr","Grade",[["Grade 11","Grade 11"],["Grade 12","Grade 12"]])}
  ${sel("term","cf_tm","Term",[["1","Term 1"],["2","Term 2"],["3","Term 3"]])}${sel("track","cf_tk","Track",[["Academic","Academic"],["TVL","TVL"]])}</div></div>
  <div class="card" id="curlist">${curList()}</div>`;
};
chg.cf=el=>{CF[el.dataset.f]=el.value;const c=document.getElementById("curlist");if(c)c.innerHTML=curList()};
/* add / edit in a pop-up: Save stores it and closes */
function subDialog(x){
  const o=(arr,cur)=>arr.map(([v,t])=>`<option value="${esc(v)}" ${String(cur)===v?"selected":""}>${esc(t)}</option>`).join("");
  const d=document.createElement("dialog");d.className="modal";
  d.innerHTML=`<h3>${x?"Edit subject":"Add subject"}</h3>
  <label class="f" for="d_sn">Subject name</label><input id="d_sn" value="${esc(x?.name||"")}" placeholder="e.g. General Mathematics">
  <div class="g2"><div><label class="f" for="d_gr">Grade</label><select id="d_gr">${o([["Grade 11","Grade 11"],["Grade 12","Grade 12"]],x?sGrade(x):"Grade 11")}</select></div>
  <div><label class="f" for="d_sy">School year</label><input id="d_sy" value="${esc(x?sYear(x):S.set.schoolYear)}" placeholder="2026–2027"></div>
  <div><label class="f" for="d_st">Type</label><select id="d_st">${o([["core","core"],["elective","elective"]],x?.type||"core")}</select></div>
  <div><label class="f" for="d_tm">Term</label><select id="d_tm">${o([["all","All terms"],["1","Term 1"],["2","Term 2"],["3","Term 3"]],x?.term||"all")}</select></div></div>
  <label class="f" for="d_tk">Track</label><select id="d_tk">${o([["All tracks","All tracks"],["Academic","Academic"],["TVL","TVL"]],x?.track||"All tracks")}</select>
  <label class="f" for="d_sd">Description</label><textarea id="d_sd" rows="2">${esc(x?.description||"")}</textarea>
  <p class="bad sm" id="d_err" role="alert"></p><div class="end"><button class="btn ghost" value="0">Cancel</button><button class="btn" value="1">Save</button></div>`;
  return new Promise(res=>{let done=false;const fin=r=>{if(done)return;done=true;d.close();d.remove();res(r)};
    d.addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;if(b.value!=="1")return fin(null);
      const g=i=>d.querySelector("#d_"+i).value.trim(),r={name:g("sn"),grade:g("gr"),schoolYear:g("sy"),type:g("st"),term:g("tm"),track:g("tk"),description:g("sd")};
      if(!r.name){d.querySelector("#d_err").textContent="Enter the subject name.";return}fin(r)});
    d.addEventListener("cancel",e=>{e.preventDefault();fin(null)});
    document.body.append(d);d.showModal();d.querySelector("#d_sn").focus()});
}
act.addsub=async()=>{const r=await subDialog();if(!r)return;await addDoc(collection(db,"subjects"),r);log("added subject "+r.name);toast("Subject added.");refresh()};
act.editsub=async el=>{const x=CUR.subs.find(s=>s.id===el.dataset.id);if(!x)return;const r=await subDialog(x);if(!r)return;
  await updateDoc(doc(db,"subjects",x.id),r);log("edited subject "+r.name);toast("Subject saved.");refresh()};
act.delsub=async el=>{if(await ask("Delete this subject?","Delete",true)){await deleteDoc(doc(db,"subjects",el.dataset.id));toast("Deleted.");refresh()}};

/* ---------- sections & loads ---------- */
const TERMS=["Term 1","Term 2","Term 3"];
const inTerm=(l,sy,tm)=>(l.schoolYear||S.set.schoolYear||"")===sy&&(l.term||S.set.term||TERMS[0])===tm;
pages.loads=async([syP,tmP])=>{
  const sy=syP||S.set.schoolYear||"",tm=tmP||S.set.term||TERMS[0];
  const [secs,tch,subs,loads]=await Promise.all([list("sections"),list("users",where("role","==","teacher")),list("subjects"),list("loads")]);
  await syncNames(tch,loads).catch(()=>0);
  const T=tch.filter(t=>t.status==="approved").sort(byName);secs.sort(byName);subs.sort(byName);
  const advOf={};secs.forEach(s=>{if(s.adviserUid)advOf[s.adviserUid]=s.id});
  const o=(a,f)=>a.map(x=>`<option value="${x.id}">${esc(f(x))}</option>`).join("");
  const nm=(a,id)=>esc(a.find(x=>x.id===id)?.name||"?");
  const years=[...new Set([S.set.schoolYear,sy,...loads.map(l=>l.schoolYear)].filter(Boolean))].sort();
  const terms=TERMS.includes(tm)?TERMS:[...TERMS,tm];
  const shown=loads.filter(l=>inTerm(l,sy,tm));
  const isCur=sy===S.set.schoolYear&&tm===S.set.term;
  const advCell=s=>`<select id="adv_${s.id}" aria-label="Adviser for ${esc(s.name)}" ${s.adviserUid?"disabled":""}><option value="">— none —</option>${T.map(t=>{
    const other=advOf[t.id]&&advOf[t.id]!==s.id,on=secs.find(x=>x.id===advOf[t.id]);
    return `<option value="${t.id}" ${s.adviserUid===t.id?"selected":""} ${other?"disabled":""}>${esc(t.name)}${other?" (adviser of "+esc(on?.name||"another section")+")":""}</option>`}).join("")}</select>`;
  return head("Sections & subject loads")+`<div class="card"><h3>School year &amp; term</h3><div class="g2">
  <div><label class="f" for="vsy">School year</label><input id="vsy" list="syl" value="${esc(sy)}" placeholder="2026–2027" data-c="loadview"><datalist id="syl">${years.map(y=>`<option value="${esc(y)}">`).join("")}</datalist></div>
  <div><label class="f" for="vtm">Term</label><select id="vtm" data-c="loadview">${terms.map(t=>`<option ${t===tm?"selected":""}>${esc(t)}</option>`).join("")}</select></div></div>
  <div class="row" style="margin-top:10px">${isCur?badge("Current term","ok"):btn("setcur","Set as current")}${btn("syncnames","Refresh teacher names","","ghost")}<span class="hint">Subject loads below belong to ${esc(sy||"—")} · ${esc(tm)}.</span></div></div>
  <div class="card"><h3>Grade 11 sections</h3><div class="row"><input id="scn" placeholder="e.g. ASSH A" style="max-width:260px"><button class="btn" data-a="addsec">Create section</button></div>
  ${tbl(["Section","Adviser",""],secs.map(s=>[esc(s.name),advCell(s),`<div class="row">${s.adviserUid?btn("unlockadv","Reassign",s.id):btn("setadv","Save adviser",s.id)}${btn("delsec","Delete",s.id,"danger")}</div>`]),"No sections yet.","nw")}
  <p class="hint">Each teacher can advise only one section. Once assigned, use Reassign only to correct a mistake.</p></div>
  <div class="card"><h3>Assign subject load</h3><div class="g2"><div><label class="f" for="ls">Subject</label><select id="ls">${o(subs,x=>x.name)}</select></div><div><label class="f" for="lc">Section</label><select id="lc">${o(secs,x=>x.name)}</select></div><div><label class="f" for="lt">Teacher</label><select id="lt">${o(T,x=>x.name)}</select></div></div>
  <p><button class="btn" data-a="addload">Assign</button></p>
  ${tbl(["Subject","Section","Teacher",""],shown.map(l=>[nm(subs,l.subjectId),nm(secs,l.sectionId),nm(tch,l.teacherUid),btn("delload","Remove",l.id,"danger")]),"No loads assigned for this school year and term.","nw")}</div>`;
};
chg.loadview=()=>{const y=v("vsy"),t=v("vtm");if(!y)return;location.hash=`#/loads/${encodeURIComponent(y)}/${encodeURIComponent(t)}`};
act.setcur=async()=>{
  const y=v("vsy"),t=v("vtm");if(!y)return toast("Enter the school year first.","bad");
  await setDoc(doc(db,"settings","school"),{schoolYear:y,term:t,updatedAt:serverTimestamp()});
  S.set={schoolYear:y,term:t};const f=$(".foot");if(f)f.textContent=`SY ${y} ${t}`;
  log("set current term "+y+" "+t);toast("Current school year and term saved.");refresh();
};
act.addsec=async()=>{if(!v("scn"))return toast("Enter a section name.","bad");await addDoc(collection(db,"sections"),{name:v("scn")});log("created section "+v("scn"));toast("Section created.");refresh()};
act.unlockadv=async el=>{
  if(!await ask("Reassign this adviser? Only do this to correct a mistake.","Reassign"))return;
  const s=$("#adv_"+el.dataset.id);s.disabled=false;s.focus();el.textContent="Save adviser";el.dataset.a="setadv";
};
act.setadv=async el=>{
  const id=el.dataset.id,uid=v("adv_"+id),secs=await list("sections"),cur=secs.find(x=>x.id===id);
  if((cur?.adviserUid||"")===uid)return toast("No change to save.");
  if(uid){const o=secs.find(x=>x.id!==id&&x.adviserUid===uid);if(o)return toast(`That teacher already advises ${o.name}. One teacher can advise only one section.`,"bad")}
  await updateDoc(doc(db,"sections",id),{adviserUid:uid});log("set adviser for "+id);toast("Adviser saved.");refresh();
};
act.delsec=async el=>{
  const st=await count("users",where("sectionId","==",el.dataset.id));
  if(st)return toast(`This section still has ${st} student profile(s). Move or delete them first.`,"bad");
  if(await ask("Delete this section?","Delete",true)){await deleteDoc(doc(db,"sections",el.dataset.id));toast("Section deleted.");refresh()}
};
act.addload=async()=>{
  const sub=v("ls"),sec=v("lc"),t=v("lt"),sy=v("vsy"),tm=v("vtm");
  if(!sub||!sec||!t)return toast("Choose a subject, section and teacher.","bad");
  if(!sy)return toast("Enter the school year first.","bad");
  const dup=(await list("loads",where("sectionId","==",sec),where("subjectId","==",sub))).filter(l=>inTerm(l,sy,tm));
  if(dup.length)return toast("That subject is already assigned to this section for this term.","bad");
  const tn=(await list("users",where("role","==","teacher"))).find(x=>x.id===t)?.name||"";
  await addDoc(collection(db,"loads"),{subjectId:sub,sectionId:sec,teacherUid:t,teacherName:tn,schoolYear:sy,term:tm});log("assigned load");toast("Load assigned.");refresh();
};
act.delload=async el=>{if(await ask("Remove this load? Activities already posted stay in the database.","Remove",true)){await deleteDoc(doc(db,"loads",el.dataset.id));toast("Removed.");refresh()}};

/* ---------- announcements ---------- */
pages.announcements=async()=>head("Announcements","Visible to all students and teachers")+
  `<div class="card"><h3>Post announcement</h3><label class="f" for="an_t">Title</label><input id="an_t" placeholder="e.g. Exam schedule"><label class="f" for="an">Message</label><textarea id="an" rows="3"></textarea><p><button class="btn" data-a="post">Post</button></p></div>`+await annHtml(30,true);
act.post=async()=>{if(!v("an"))return toast("Write a message first.","bad");await addDoc(collection(db,"announcements"),{title:v("an_t")||"Announcement",text:v("an"),by:S.me.email,at:serverTimestamp()});log("posted announcement");toast("Posted.");refresh()};
act.delann=async el=>{if(await ask("Delete this announcement?","Delete",true)){await deleteDoc(doc(db,"announcements",el.dataset.id));toast("Deleted.");refresh()}};

/* ---------- settings ---------- */
pages.settings=async()=>head("School settings","Shown on every dashboard")+`<div class="card"><div class="g2">
  <div><label class="f" for="sy">School year</label><input id="sy" value="${esc(S.set.schoolYear)}" placeholder="2026–2027"></div>
  <div><label class="f" for="tm">Current term</label><select id="tm">${["Term 1","Term 2","Term 3"].map(t=>`<option ${t===S.set.term?"selected":""}>${t}</option>`).join("")}</select></div></div>
  <p><button class="btn" data-a="saveset">Save settings</button></p></div>`;
act.saveset=async()=>{const d={schoolYear:v("sy"),term:v("tm"),updatedAt:serverTimestamp()};await setDoc(doc(db,"settings","school"),d);S.set={schoolYear:d.schoolYear,term:d.term};log("updated school settings");toast("Settings saved.");refresh()};

/* ---------- logs & storage ---------- */
pages.logs=async()=>{
  const [l,u,a,s,sub,k]=await Promise.all([list("logs",orderBy("at","desc"),limit(100)),count("users"),count("activities"),count("submissions"),count("materials"),count("logs")]);
  return head("Logs & storage")+`<div class="cards">${stat("Users",u,"","users")}${stat("Activities",a,"","list")}${stat("Submissions",s,"","check")}${stat("Materials",sub,"","file")}${stat("Log entries",k,"","shield")}</div>
  <div class="card"><h3>Storage monitor (free plan)</h3><p class="mut">Counts use cheap aggregate queries. Exact usage: Firebase Console → Firestore → Usage. Free quota: 1 GiB stored, 50k reads/day, 20k writes/day.</p></div>
  <div class="card"><h3>Activity log (latest 100)</h3>${tbl(["When","Who","Action"],l.map(x=>[fdate(ts(x.at)),esc(x.by),esc(x.action)]),"No log entries.","nw")}</div>`;
};
