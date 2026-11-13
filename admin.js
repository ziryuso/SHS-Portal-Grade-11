import {S,act,$,$$,esc,v,list,count,db,doc,getDoc,setDoc,addDoc,updateDoc,deleteDoc,collection,where,orderBy,limit,serverTimestamp,toast,ask,refresh,fdate,ts,badge,stat,tbl,head,empty,btn,log,greet,fday,annHtml,errMsg} from "./core.js";
import {generalProfile} from "./profile.js";

export const nav=()=>[
  {k:"home",l:"Dashboard",i:"home"},
  {k:"approvals",l:"Approvals",i:"check"},
  {k:"accounts",l:"Accounts",i:"users"},
  {k:"curriculum",l:"Curriculum",i:"book"},
  {k:"loads",l:"Loads",i:"grid"},
  {k:"announcements",l:"News",i:"bell"},
  {k:"settings",l:"Settings",i:"cog"},
  {k:"logs",l:"Logs",i:"shield"}];
export const pages={profile:generalProfile};

const byName=(a,b)=>(a.name||"").localeCompare(b.name||"");
const SB={approved:["Approved","ok"],pending:["Pending","warn"],inactive:["Inactive","bad"]};
const GR=[["11","Grade 11"],["12","Grade 12"]];
const TERMS=[["1","Term 1"],["2","Term 2"],["3","Term 3"],["all","All terms"]];
const TYPES=[["core","Core"],["elective","Elective"]];
const TRACKS=["All tracks","Academic","TVL"];
const lab=(a,k)=>a.find(x=>x[0]===String(k))?.[1]||k||"–";
const opts=(a,sel)=>a.map(([k,l])=>`<option value="${esc(k)}" ${String(sel)===k?"selected":""}>${esc(l)}</option>`).join("");
const da=o=>Object.entries(o).map(([k,x])=>`data-${k}="${esc(x)}"`).join(" ");
const teachers=async()=>(await list("users",where("role","==","teacher"))).filter(t=>t.status==="approved").sort(byName);
const finMap=async()=>{const s=await getDoc(doc(db,"settings","school"));return s.exists()?(s.data().finalSections||{}):{}};

/* ---------- shared UI: form sheet, filter bar, responsive table ---------- */
const sheet=(title,body,saveLabel,onSave)=>new Promise(res=>{
  const d=document.createElement("dialog");d.className="modal sheet";
  d.innerHTML=`<div class="sh"><h3>${esc(title)}</h3><button class="btn ghost sm" data-x>Close</button></div><div class="sb">${body}</div><p class="err" hidden></p><div class="end"><button class="btn ghost" data-x>Cancel</button><button class="btn pri" data-s>${esc(saveLabel)}</button></div>`;
  let done=false;const fin=r=>{if(done)return;done=true;d.close();d.remove();res(r)};
  d.addEventListener("click",async e=>{
    const b=e.target.closest("button");if(!b)return;
    if(b.hasAttribute("data-x"))return fin(false);
    if(b.hasAttribute("data-s")){
      const er=d.querySelector(".err");er.hidden=true;b.disabled=true;
      try{await onSave();fin(true)}catch(x){er.textContent=x.message||errMsg(x);er.hidden=false;b.disabled=false}
    }
  });
  d.addEventListener("cancel",e=>{e.preventDefault();fin(false)});
  document.body.append(d);d.showModal();d.querySelector("input,select")?.focus();
});

/* rows carry data-* attributes; selects with class "fl" filter by data-<k>; #srt sorts; #q searches */
const wire=()=>{
  const rows=$$("tr[data-r]");if(!rows.length)return;
  const body=rows[0].parentNode,cnt=$("#cnt"),none=$("#none");
  const ord=(r,k)=>k==="term"&&r.dataset.term==="all"?"9":(r.dataset[k]||"");
  const run=()=>{
    const q=($("#q")?.value||"").toLowerCase().trim(),fl=$$(".fl").map(s=>[s.dataset.k,s.value]);let n=0;
    rows.forEach(r=>{const ok=r.dataset.s.includes(q)&&fl.every(([k,x])=>!x||r.dataset[k]===x||(k==="term"&&r.dataset.term==="all"));r.hidden=!ok;if(ok)n++});
    const k=$("#srt")?.value||"n";
    [...rows].sort((a,b)=>ord(a,k).localeCompare(ord(b,k),undefined,{numeric:true})||(a.dataset.n||"").localeCompare(b.dataset.n||"")).forEach(r=>body.append(r));
    if(cnt)cnt.textContent=`Showing ${n} of ${rows.length}`;if(none)none.hidden=n>0;
  };
  $$(".fl,#srt").forEach(e=>e.addEventListener("change",run));$("#q")?.addEventListener("input",run);run();
};
const fsel=(k,all,o)=>`<select class="fl" data-k="${k}" aria-label="${esc(all)}"><option value="">${esc(all)}</option>${o}</select>`;
const srt=a=>`<select id="srt" aria-label="Sort by">${a.map(([k,l])=>`<option value="${k}">Sort: ${l}</option>`).join("")}</select>`;
const dt=(heads,rows,emptyMsg)=>rows.length?`<div class="tw rtw"><table class="rt"><thead><tr>${heads.map(h=>`<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr data-r ${r.a}>${r.c.map((c,i)=>`<td data-l="${esc(heads[i])}" class="${i===0?"nm":""}${heads[i]===""?" act":""}">${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div><p id="none" class="empty" hidden>No matches. Clear a filter.</p>`:empty(emptyMsg);

/* ---------- dashboard ---------- */
pages.home=async()=>{
  const [stu,tea,pend,secs,acts,subs,reqs,logs,pending]=await Promise.all([
    count("users",where("role","==","student"),where("status","==","approved")),count("users",where("role","==","teacher"),where("status","==","approved")),
    count("users",where("status","==","pending")),count("sections"),count("activities"),count("submissions"),
    list("requests",where("done","==",false)),list("logs",orderBy("at","desc"),limit(6)),list("users",where("status","==","pending"))]);
  return `<div class="banner"><h1>${greet()}, Administrator</h1><p>${fday(Date.now())}</p></div>
  <div class="cards">${stat("Students",stu,"","users")}${stat("Teachers",tea,"","users","ok")}${stat("Sections",secs,"","grid")}
  ${stat("Pending",pend,"","clock",pend?"warn":"ok")}${stat("Requests",reqs.length,"","bell",reqs.length?"warn":"ok")}${stat("Acts / Subs",`${acts} / ${subs}`,"","chart")}</div>
  <div class="cols"><div class="card"><h3>Waiting for approval</h3>${tbl(["Name","Role",""],pending.slice(0,6).map(x=>[esc(x.name),esc(x.role),btn("apv","Approve",x.id)]),"Nobody is waiting.","dense")}${pending.length>6?`<p class="sm"><a href="#/approvals">See all ${pending.length}</a></p>`:""}</div>
  <div class="card"><h3>Recent activity</h3>${tbl(["When","Who","Action"],logs.map(x=>[fdate(ts(x.at)),esc(x.by),esc(x.action)]),"No activity yet.","dense")}</div></div>
  <h2>Latest news</h2>${await annHtml(2)}`;
};

/* ---------- approvals ---------- */
pages.approvals=async()=>{
  const [users,reqs,secs]=await Promise.all([list("users",where("status","==","pending")),list("requests",where("done","==",false)),list("sections")]);
  const sn=id=>esc(secs.find(s=>s.id===id)?.name||"–"),T=users.filter(u=>u.role==="teacher"),St=users.filter(u=>u.role==="student");
  return head("Approvals")+`<div class="card"><h3>Teachers (${T.length})</h3>${tbl(["Name","Email",""],T.map(x=>[esc(x.name),esc(x.email),btn("apv","Approve",x.id)]),"No teachers waiting.","dense")}</div>
  <div class="card"><h3>Students (${St.length})</h3><p class="hint">Advisers usually approve their own students.</p>${tbl(["Name","LRN","Section","Email",""],St.map(x=>[esc(x.name),esc(x.lrn||"–"),sn(x.sectionId),esc(x.email),btn("apv","Approve",x.id)]),"No students waiting.","dense")}</div>
  <div class="card"><h3>Requests (${reqs.length})</h3>${tbl(["From","Request","When",""],reqs.map(x=>[esc(x.email),esc(x.type),fdate(ts(x.at)),btn("reqdone","Done",x.id)]),"No open requests.","dense")}</div>`;
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
  <div class="card"><input id="q" placeholder="Search name or email…" aria-label="Search accounts" style="max-width:360px;margin-bottom:8px">
  ${tbl(role==="student"?["Name","LRN","Section","Email","Status",""]:["Name","Email","Status",""],users.map(x=>{const [lb,k]=SB[x.status]||[x.status,""];
    const actions=`<div class="row">${x.status!=="approved"?btn("apv","Approve",x.id):btn("deact","Deactivate",x.id)}${btn("delprof","Delete",x.id)}</div>`;
    return {attr:`data-s="${esc((x.name+" "+x.email+" "+(x.lrn||"")).toLowerCase())}"`,c:role==="student"?[esc(x.name),esc(x.lrn||"–"),sn(x.sectionId),esc(x.email),badge(lb,k),actions]:[esc(x.name),esc(x.email),badge(lb,k),actions]}}),"No accounts yet.","dense")}
  <p class="hint">Delete removes the portal record only. The person can register again.</p></div>`;
};
act.deact=async el=>{if(!await ask("Deactivate this account? They will not be able to use the portal.","Deactivate",true))return;await updateDoc(doc(db,"users",el.dataset.id),{status:"inactive"});log("deactivated user "+el.dataset.id);toast("Account deactivated.");refresh()};
act.delprof=async el=>{if(!await ask("Delete this profile? Their submissions stay in the database.","Delete",true))return;await deleteDoc(doc(db,"users",el.dataset.id));log("deleted profile "+el.dataset.id);toast("Profile deleted.");refresh()};

/* ---------- curriculum ---------- */
pages.curriculum=async()=>{
  const s=(await list("subjects")).sort(byName);S.after=wire;
  const core=s.filter(x=>(x.type||"core")==="core").length;
  const rows=s.map(x=>{const g=x.grade||"11",t=x.term||"all",ty=x.type||"core";
    return {a:da({s:((x.name||"")+" "+(x.code||"")+" "+(x.track||"")).toLowerCase(),grade:g,term:t,type:ty,n:(x.name||"").toLowerCase()}),
    c:[`<b>${esc(x.name)}</b>${x.code?`<div class="mut sm">${esc(x.code)}</div>`:""}`,"Grade "+esc(g),esc(lab(TERMS,t)),badge(lab(TYPES,ty),ty==="core"?"info":"mut"),esc(x.track||"–"),x.hours?esc(x.hours):"–",`<div class="row">${btn("editsub","Edit",x.id)}${btn("delsub","Delete",x.id)}</div>`]}});
  return head("Curriculum",`${s.length} subjects · ${core} core · ${s.length-core} elective`,`<button class="btn pri" data-a="addsub">Add subject</button>`)+
  `<div class="card"><div class="tb"><input id="q" class="grow" placeholder="Search subject, code or track…" aria-label="Search subjects">
  ${fsel("grade","All grades",opts(GR))}${fsel("term","All terms",opts(TERMS.slice(0,3)))}${fsel("type","Core + elective",opts(TYPES))}${srt([["n","Name"],["grade","Grade"],["term","Term"],["type","Type"]])}</div>
  <div class="mut sm" id="cnt"></div>${dt(["Subject","Grade","Term","Type","Track","Hrs/wk",""],rows,"No subjects yet. Click Add subject.")}</div>`;
};
const subForm=x=>`<div class="g2">
  <div><label class="f" for="sn">Subject name *</label><input id="sn" value="${esc(x.name||"")}" placeholder="e.g. General Mathematics"></div>
  <div><label class="f" for="sc">Code</label><input id="sc" value="${esc(x.code||"")}" placeholder="e.g. GENMATH"></div>
  <div><label class="f" for="sg">Grade level</label><select id="sg">${opts(GR,x.grade||"11")}</select></div>
  <div><label class="f" for="stm">Term</label><select id="stm">${opts(TERMS,x.term||"all")}</select></div>
  <div><label class="f" for="st">Type</label><select id="st">${opts(TYPES,x.type||"core")}</select></div>
  <div><label class="f" for="stk">Track</label><select id="stk">${TRACKS.map(t=>`<option ${x.track===t?"selected":""}>${t}</option>`).join("")}</select></div>
  <div><label class="f" for="sh">Hours per week</label><input id="sh" type="number" min="0" max="40" step="0.5" value="${esc(x.hours||"")}" placeholder="e.g. 4"></div></div>
  <label class="f" for="sd">Description</label><textarea id="sd" rows="2">${esc(x.description||"")}</textarea>`;
const openSub=async(id,x={})=>{
  const ok=await sheet(id?"Edit subject":"Add subject",subForm(x),"Save",async()=>{
    const d={name:v("sn"),code:v("sc"),grade:v("sg"),term:v("stm"),type:v("st"),track:v("stk"),hours:+v("sh")||0,description:v("sd")};
    if(!d.name)throw new Error("Enter the subject name.");
    if(d.hours<0||d.hours>40)throw new Error("Hours per week must be 0 to 40.");
    const all=await list("subjects");
    if(all.some(s=>s.id!==id&&(s.name||"").toLowerCase()===d.name.toLowerCase()&&(s.grade||"11")===d.grade&&(s.term||"all")===d.term))throw new Error("That subject already exists for this grade and term.");
    if(id)await updateDoc(doc(db,"subjects",id),d);else await addDoc(collection(db,"subjects"),d);
    log((id?"edited":"added")+" subject "+d.name);
  });
  if(ok){toast("Subject saved.");refresh()}
};
act.addsub=()=>openSub();
act.editsub=async el=>{const s=await getDoc(doc(db,"subjects",el.dataset.id));openSub(el.dataset.id,s.data()||{})};
act.delsub=async el=>{
  const n=await count("loads",where("subjectId","==",el.dataset.id));
  if(n)return toast(`This subject is assigned in ${n} section(s). Remove those loads first.`,"bad");
  if(await ask("Delete this subject?","Delete",true)){await deleteDoc(doc(db,"subjects",el.dataset.id));log("deleted subject "+el.dataset.id);toast("Deleted.");refresh()}
};

/* ---------- sections & loads ---------- */
pages.loads=async([tab="sections"])=>{
  const tabs=`<div class="tabs"><a class="${tab==="sections"?"on":""}" href="#/loads/sections">Sections</a><a class="${tab==="loads"?"on":""}" href="#/loads/loads">Teacher loads</a></div>`;
  return tab==="loads"?await loadsTab(tabs):await sectionsTab(tabs);
};
const ysy=x=>x.schoolYear||S.set.schoolYear||"";

async function sectionsTab(tabs){
  const [secs,tch,fin]=await Promise.all([list("sections"),teachers(),finMap()]);
  S.after=wire;secs.sort(byName);
  const sy=S.set.schoolYear,years=[...new Set([sy,...secs.map(ysy)].filter(Boolean))].sort().reverse(),defSY=years.includes(sy)?sy:"";
  const adv=id=>esc(tch.find(t=>t.id===id)?.name||"–");
  const strips=years.length?years.map(y=>{const n=secs.filter(s=>ysy(s)===y).length,f=!!fin[y];
    return `<div class="strip">${badge(f?"Finalized":"Open",f?"ok":"warn")}<b>SY ${esc(y)}</b><span class="mut sm">${n} section${n===1?"":"s"}</span><span class="sp"></span>${f?btn("reopen","Reopen",y):btn("finsec","Finalize",y,"pri")}</div>`}).join(""):`<p class="hint">Set the school year in Settings, then add sections.</p>`;
  const rows=secs.map(x=>{const y=ysy(x),g=x.grade||"11",lock=!!fin[y];
    return {a:da({s:((x.name||"")+" "+y).toLowerCase(),grade:g,sy:y,n:(x.name||"").toLowerCase()}),
    c:[`<b>${esc(x.name)}</b>`,"Grade "+esc(g),esc(y||"–"),adv(x.adviserUid),lock?badge("Final","ok"):"",`<div class="row">${lock?"":btn("editsec","Edit",x.id)+btn("delsec","Delete",x.id)}</div>`]}});
  return head("Sections & Loads","Grade 11 and 12 sections by school year",`<button class="btn pri" data-a="addsec">Add section</button>`)+tabs+
  `<div class="card">${strips}</div><div class="card"><div class="tb"><input id="q" class="grow" placeholder="Search section…" aria-label="Search sections">
  ${fsel("sy","All years",years.map(y=>`<option value="${esc(y)}" ${y===defSY?"selected":""}>SY ${esc(y)}</option>`).join(""))}${fsel("grade","All grades",opts(GR))}${srt([["n","Name"],["grade","Grade"],["sy","School year"]])}</div>
  <div class="mut sm" id="cnt"></div>${dt(["Section","Grade","School year","Adviser","",""],rows,"No sections yet. Click Add section.")}</div>`;
}
const secForm=(x,T)=>`<div class="g2">
  <div><label class="f" for="scn">Section name *</label><input id="scn" value="${esc(x.name||"")}" placeholder="e.g. ASSH A"></div>
  <div><label class="f" for="scg">Grade level</label><select id="scg">${opts(GR,x.grade||"11")}</select></div>
  <div><label class="f" for="scy">School year *</label><input id="scy" value="${esc(x.schoolYear||S.set.schoolYear||"")}" placeholder="2026–2027"></div>
  <div><label class="f" for="sca">Adviser</label><select id="sca"><option value="">— none —</option>${T.map(t=>`<option value="${t.id}" ${x.adviserUid===t.id?"selected":""}>${esc(t.name)}</option>`).join("")}</select></div></div>`;
const openSec=async(id,x={})=>{
  const [T,fin]=await Promise.all([teachers(),finMap()]);
  const ok=await sheet(id?"Edit section":"Add section",secForm(x,T),"Save",async()=>{
    const d={name:v("scn"),grade:v("scg"),schoolYear:v("scy"),adviserUid:v("sca")};
    if(!d.name)throw new Error("Enter the section name.");
    if(!d.schoolYear)throw new Error("Enter the school year.");
    if(fin[d.schoolYear])throw new Error(`SY ${d.schoolYear} is finalized. Reopen it first.`);
    const all=await list("sections");
    if(all.some(s=>s.id!==id&&(s.name||"").toLowerCase()===d.name.toLowerCase()&&(s.grade||"11")===d.grade&&ysy(s)===d.schoolYear))throw new Error("That section already exists.");
    if(id)await updateDoc(doc(db,"sections",id),d);else await addDoc(collection(db,"sections"),d);
    log((id?"edited":"created")+" section "+d.name);
  });
  if(ok){toast("Section saved.");refresh()}
};
act.addsec=()=>openSec();
act.editsec=async el=>{const s=await getDoc(doc(db,"sections",el.dataset.id));openSec(el.dataset.id,s.data()||{})};
act.delsec=async el=>{
  const id=el.dataset.id,st=await count("users",where("sectionId","==",id));
  if(st)return toast(`This section still has ${st} student profile(s). Move or delete them first.`,"bad");
  if(!await ask("Delete this section and its teacher loads?","Delete",true))return;
  for(const l of await list("loads",where("sectionId","==",id)))await deleteDoc(doc(db,"loads",l.id));
  await deleteDoc(doc(db,"sections",id));log("deleted section "+id);toast("Section deleted.");refresh();
};
act.finsec=async el=>{
  const y=el.dataset.id,mine=(await list("sections")).filter(s=>ysy(s)===y);
  if(!mine.length)return toast("Add at least one section first.","bad");
  const none=mine.filter(s=>!s.adviserUid).length;
  if(!await ask(`Finalize ${mine.length} section(s) for SY ${y}? They will be locked.${none?` ${none} still have no adviser.`:""}`,"Finalize"))return;
  await setDoc(doc(db,"settings","school"),{finalSections:{[y]:true}},{merge:true});log("finalized sections "+y);toast("Sections finalized.");refresh();
};
act.reopen=async el=>{
  if(!await ask(`Reopen sections for SY ${el.dataset.id}?`,"Reopen"))return;
  await setDoc(doc(db,"settings","school"),{finalSections:{[el.dataset.id]:false}},{merge:true});log("reopened sections "+el.dataset.id);toast("Reopened.");refresh();
};

async function loadsTab(tabs){
  const [secs,tch,subs,loads,fin]=await Promise.all([list("sections"),teachers(),list("subjects"),list("loads"),finMap()]);
  S.after=wire;secs.sort(byName);subs.sort(byName);
  const sy=S.set.schoolYear,years=[...new Set([sy,...secs.map(ysy)].filter(Boolean))].sort().reverse(),defSY=years.includes(sy)?sy:"";
  const tn=id=>tch.find(t=>t.id===id)?.name||loads.find(l=>l.teacherUid===id)?.teacherName||"";
  const advs=[...new Set(secs.map(s=>s.adviserUid).filter(Boolean))].map(id=>[id,tn(id)||"Adviser"]);
  const rows=[];let done=0;
  for(const s of secs){const g=s.grade||"11",y=ysy(s);
    for(const b of subs.filter(b=>(b.grade||"11")===g)){
      const l=loads.find(l=>l.sectionId===s.id&&l.subjectId===b.id),t=l?tn(l.teacherUid)||l.teacherName||"?":"",id=s.id+"|"+b.id;if(l)done++;
      rows.push({a:da({s:((b.name||"")+" "+(b.code||"")+" "+s.name+" "+t).toLowerCase(),grade:g,term:b.term||"all",sy:y,adv:s.adviserUid||"",st:l?"assigned":"open",n:(b.name||"").toLowerCase(),tch:t.toLowerCase(),sec:(s.name||"").toLowerCase()}),
      c:[`<b>${esc(b.name)}</b>${b.code?`<div class="mut sm">${esc(b.code)}</div>`:""}`,"Grade "+esc(g),esc(lab(TERMS,b.term||"all")),esc(s.name),l?esc(t):badge("Unassigned","warn"),esc(tn(s.adviserUid)||"–"),
      `<div class="row">${fin[y]?"":btn("assign",l?"Change":"Assign",id,"pri")+(l?btn("delload","Remove",l.id):"")}</div>`]});
    }}
  return head("Sections & Loads",`${done} of ${rows.length} subjects have a teacher`)+tabs+
  `<div class="card"><div class="tb"><input id="q" class="grow" placeholder="Search subject, section or teacher…" aria-label="Search loads">
  ${fsel("sy","All years",years.map(y=>`<option value="${esc(y)}" ${y===defSY?"selected":""}>SY ${esc(y)}</option>`).join(""))}${fsel("grade","All grades",opts(GR))}${fsel("term","All terms",opts(TERMS.slice(0,3)))}${fsel("adv","All advisers",advs.map(([i,n])=>`<option value="${esc(i)}">${esc(n)}</option>`).join(""))}${fsel("st","All status",opts([["assigned","Assigned"],["open","Unassigned"]]))}${srt([["n","Subject"],["sec","Section"],["tch","Teacher"],["term","Term"],["grade","Grade"]])}</div>
  <div class="mut sm" id="cnt"></div>${dt(["Subject","Grade","Term","Section","Teacher","Adviser",""],rows,"Add sections and subjects first, then assign teachers here.")}</div>`;
}
act.assign=async el=>{
  const [secId,subId]=el.dataset.id.split("|");
  const [T,sd,bd,ex]=await Promise.all([teachers(),getDoc(doc(db,"sections",secId)),getDoc(doc(db,"subjects",subId)),list("loads",where("sectionId","==",secId),where("subjectId","==",subId))]);
  const cur=ex[0];
  const body=`<p class="mut">${esc(bd.data()?.name||"")} · ${esc(sd.data()?.name||"")}</p><label class="f" for="lt">Teacher</label><select id="lt"><option value="">Select teacher…</option>${T.map(t=>`<option value="${t.id}" ${cur?.teacherUid===t.id?"selected":""}>${esc(t.name)}</option>`).join("")}</select>`;
  const ok=await sheet(cur?"Change teacher":"Assign teacher",body,"Save",async()=>{
    const t=v("lt");if(!t)throw new Error("Choose a teacher.");
    const d={teacherUid:t,teacherName:T.find(x=>x.id===t)?.name||""};
    if(cur)await updateDoc(doc(db,"loads",cur.id),d);else await addDoc(collection(db,"loads"),{subjectId:subId,sectionId:secId,...d});
    log("assigned load");
  });
  if(ok){toast("Load saved.");refresh()}
};
act.delload=async el=>{if(await ask("Remove this teacher from the subject? Activities already posted stay in the database.","Remove",true)){await deleteDoc(doc(db,"loads",el.dataset.id));toast("Removed.");refresh()}};

/* ---------- announcements ---------- */
pages.announcements=async()=>head("News","Visible to all students and teachers")+
  `<div class="card"><h3>Post announcement</h3><label class="f" for="an_t">Title</label><input id="an_t" placeholder="e.g. Exam schedule"><label class="f" for="an">Message</label><textarea id="an" rows="3"></textarea><p><button class="btn pri" data-a="post">Post</button></p></div>`+await annHtml(30,true);
act.post=async()=>{if(!v("an"))return toast("Write a message first.","bad");await addDoc(collection(db,"announcements"),{title:v("an_t")||"Announcement",text:v("an"),by:S.me.email,at:serverTimestamp()});log("posted announcement");toast("Posted.");refresh()};
act.delann=async el=>{if(await ask("Delete this announcement?","Delete",true)){await deleteDoc(doc(db,"announcements",el.dataset.id));toast("Deleted.");refresh()}};

/* ---------- settings ---------- */
pages.settings=async()=>head("Settings","Shown on every dashboard")+`<div class="card"><div class="g2">
  <div><label class="f" for="sy">School year</label><input id="sy" value="${esc(S.set.schoolYear)}" placeholder="2026–2027"></div>
  <div><label class="f" for="tm">Current term / quarter</label><input id="tm" list="terms" value="${esc(S.set.term)}" placeholder="Term 2"><datalist id="terms"><option>Term 1</option><option>Term 2</option><option>Term 3</option><option>Quarter 1</option><option>Quarter 2</option><option>Quarter 3</option><option>Quarter 4</option></datalist></div></div>
  <p><button class="btn pri" data-a="saveset">Save</button></p></div>`;
act.saveset=async()=>{const d={schoolYear:v("sy"),term:v("tm"),updatedAt:serverTimestamp()};await setDoc(doc(db,"settings","school"),d,{merge:true});S.set={schoolYear:d.schoolYear,term:d.term};log("updated school settings");toast("Settings saved.");refresh()};

/* ---------- logs ---------- */
pages.logs=async()=>{
  const [l,u,a,s,sub,k]=await Promise.all([list("logs",orderBy("at","desc"),limit(100)),count("users"),count("activities"),count("submissions"),count("materials"),count("logs")]);
  return head("Logs & storage")+`<div class="cards">${stat("Users",u,"","users")}${stat("Activities",a,"","list")}${stat("Submissions",s,"","check")}${stat("Materials",sub,"","file")}${stat("Log entries",k,"","shield")}</div>
  <div class="card"><h3>Storage (free plan)</h3><p class="mut sm">Counts use cheap aggregate queries. Exact usage: Firebase Console → Firestore → Usage. Free quota: 1 GiB stored, 50k reads/day, 20k writes/day.</p></div>
  <div class="card"><h3>Activity log (latest 100)</h3>${tbl(["When","Who","Action"],l.map(x=>[fdate(ts(x.at)),esc(x.by),esc(x.action)]),"No log entries.","dense")}</div>`;
};
