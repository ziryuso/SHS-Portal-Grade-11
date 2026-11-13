import {S,act,chg,$,esc,v,list,count,db,auth,doc,setDoc,addDoc,updateDoc,deleteDoc,collection,where,orderBy,limit,serverTimestamp,writeBatch,toast,errMsg,ask,go,refresh,fdate,ts,badge,bar,pct,saveCsv,stat,tbl,head,empty,btn,log,greet,fday,annHtml,ic} from "./core.js";
import {sendPasswordResetEmail} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

/* sidebar: "g" starts a new group heading (shown in the desktop sidebar only) */
export const nav=()=>[
  {g:"Overview",k:"home",l:"Dashboard",i:"dash"},
  {g:"Administration",k:"approvals",l:"Account Approvals",i:"usercheck"},
  {k:"accounts",l:"User Accounts",i:"users"},
  {g:"Academics",k:"curriculum",l:"Subjects & Curriculum",i:"book"},
  {k:"loads",l:"Sections & Loads",i:"layers"},
  {g:"Communication",k:"announcements",l:"Announcements",i:"megaphone"},
  {g:"System",k:"settings",l:"School Settings",i:"sliders"},
  {k:"logs",l:"Audit Log & Storage",i:"database"}];
import {generalProfile} from "./profile.js";
export const pages={profile:generalProfile};
const byName=(a,b)=>(a.name||"").localeCompare(b.name||"");
const SB={approved:["Approved","ok"],pending:["Pending","warn"],inactive:["Inactive","bad"]};
const filterRows=(inputs,test)=>()=>document.querySelectorAll("tbody tr[data-s]").forEach(r=>r.style.display=test(r)?"":"none");

/* ---------- dashboard ---------- */
pages.home=async()=>{
  const [stu,tea,pend,secs,acts,subs,reqs,logs,pending,loads,tch]=await Promise.all([
    count("users",where("role","==","student"),where("status","==","approved")),count("users",where("role","==","teacher"),where("status","==","approved")),
    count("users",where("status","==","pending")),list("sections"),count("activities"),count("submissions"),
    list("requests",where("done","==",false)),list("logs",orderBy("at","desc"),limit(6)),list("users",where("status","==","pending")),
    list("loads"),list("users",where("role","==","teacher"))]);
  secs.sort(byName);
  const enr=await Promise.all(secs.map(s=>count("users",where("sectionId","==",s.id),where("role","==","student"),where("status","==","approved"))));
  const max=Math.max(1,...enr),tn=id=>esc(tch.find(t=>t.id===id)?.name||"No adviser assigned");
  const alerts=[];
  if(pend)alerts.push(["clock",`${pend} account(s) waiting for approval`,"#/approvals"]);
  if(reqs.length)alerts.push(["bell",`${reqs.length} open student request(s)`,"#/approvals"]);
  if(!secs.length)alerts.push(["grid","No sections created yet","#/loads"]);
  const noAdv=secs.filter(s=>!s.adviserUid),noLoad=secs.filter(s=>!loads.some(l=>l.sectionId===s.id));
  if(noAdv.length)alerts.push(["users","No adviser yet: "+noAdv.map(s=>s.name).join(", "),"#/loads"]);
  if(noLoad.length)alerts.push(["layers","No subjects assigned yet: "+noLoad.map(s=>s.name).join(", "),"#/loads"]);
  const attention=alerts.length?alerts.map(a=>`<a class="arow" href="${a[2]}">${ic(a[0])}<span>${esc(a[1])}</span></a>`).join(""):`<p class="mut"><b class="ok">✓</b> Everything is in order.</p>`;
  const enroll=secs.length?secs.map((s,i)=>`<div class="item"><div style="flex:1;min-width:150px"><b>${esc(s.name)}</b><div class="mut sm">${tn(s.adviserUid)}</div>${bar(pct(enr[i],max))}</div><b>${enr[i]}</b></div>`).join(""):empty("No sections yet.","grid");
  return `<div class="banner"><h1>${greet()}, Administrator</h1><p>${fday(Date.now())}</p></div>
  <div class="row qa"><a class="btn sm" href="#/approvals">${ic("usercheck")} Review approvals</a><a class="btn sm ghost" href="#/announcements">${ic("megaphone")} Post announcement</a><a class="btn sm ghost" href="#/loads">${ic("layers")} Manage sections</a><button class="btn sm ghost" data-a="expstu">${ic("download")} Export student list</button></div>
  <div class="cards">${stat("Students",stu,"Approved","users")}${stat("Teachers",tea,"Approved","users","ok")}${stat("Sections",secs.length,"","layers")}
  ${stat("Pending approvals",pend,"Students and teachers","clock",pend?"warn":"ok")}${stat("Open requests",reqs.length,"From students","bell",reqs.length?"warn":"ok")}${stat("Activities / Submissions",`${acts} / ${subs}`,"All time","chart")}</div>
  <div class="cols"><div class="card"><h3>Needs attention</h3>${attention}</div><div class="card"><h3>Enrollment by section</h3>${enroll}</div></div>
  <div class="cols" style="margin-top:10px"><div class="card"><h3>Waiting for approval</h3>${tbl(["Name","Role",""],pending.slice(0,6).map(x=>[esc(x.name),esc(x.role),btn("apv","Approve",x.id,"ok")]),"Nobody is waiting.")}${pending.length>6?`<p><a href="#/approvals">See all ${pending.length}</a></p>`:""}</div>
  <div class="card"><h3>Recent activity</h3>${tbl(["When","Who","Action"],logs.map(x=>[fdate(ts(x.at)),esc(x.by),esc(x.action)]),"No activity logged yet.")}</div></div>
  <h2>Latest announcements</h2>${await annHtml(2)}`;
};
act.expstu=()=>act.expacc({dataset:{id:"student"}});

/* ---------- approvals ---------- */
pages.approvals=async()=>{
  const [users,reqs,secs]=await Promise.all([list("users",where("status","==","pending")),list("requests",where("done","==",false)),list("sections")]);
  const sn=id=>esc(secs.find(s=>s.id===id)?.name||"–"),T=users.filter(u=>u.role==="teacher"),St=users.filter(u=>u.role==="student");
  const all=(role,n)=>n?btn("apvall","Approve all ("+n+")",role,"ok"):"";
  return head("Account Approvals","Review new registrations")+`<div class="card"><div class="row between"><h3>Teacher accounts</h3>${all("teacher",T.length)}</div>${tbl(["Name","Email",""],T.map(x=>[esc(x.name),esc(x.email),btn("apv","Approve",x.id,"ok")]),"No teachers waiting.")}</div>
  <div class="card"><div class="row between"><h3>Student accounts</h3>${all("student",St.length)}</div><p class="hint">Advisers normally approve their own students. You can approve any student here.</p>${tbl(["Name","LRN","Section","Email",""],St.map(x=>[esc(x.name),esc(x.lrn||"–"),sn(x.sectionId),esc(x.email),btn("apv","Approve",x.id,"ok")]),"No students waiting.")}</div>
  <div class="card"><h3>Student requests</h3>${tbl(["From","Request","When",""],reqs.map(x=>[esc(x.email),esc(x.type),fdate(ts(x.at)),btn("reqdone","Mark done",x.id)]),"No open requests.")}</div>`;
};
act.apv=async el=>{await updateDoc(doc(db,"users",el.dataset.id),{status:"approved"});log("approved user "+el.dataset.id);toast("Account approved.");refresh()};
act.apvall=async el=>{
  const role=el.dataset.id,us=await list("users",where("status","==","pending"),where("role","==",role));
  if(!us.length)return toast("Nobody is waiting.");
  if(!await ask(`Approve all ${us.length} pending ${role} account(s)?`,"Approve all"))return;
  for(let i=0;i<us.length;i+=400){const b=writeBatch(db);us.slice(i,i+400).forEach(u=>b.update(doc(db,"users",u.id),{status:"approved"}));await b.commit()}
  log(`approved ${us.length} ${role} accounts`);toast(`${us.length} account(s) approved.`);refresh();
};
act.reqdone=async el=>{await updateDoc(doc(db,"requests",el.dataset.id),{done:true});toast("Marked as done.");refresh()};

/* ---------- accounts ---------- */
pages.accounts=async([role="student"])=>{
  const [users,secs]=await Promise.all([list("users",where("role","==",role)),list("sections")]);
  users.sort(byName);secs.sort(byName);
  const isS=role==="student";
  const secOpts=sel=>`<option value="">–</option>`+secs.map(s=>`<option value="${s.id}" ${s.id===sel?"selected":""}>${esc(s.name)}</option>`).join("");
  S.after=()=>{
    const run=()=>{const q=($("#q")?.value||"").toLowerCase(),st=$("#fst")?.value||"",sc=$("#fsc")?.value||"";
      document.querySelectorAll("tbody tr[data-s]").forEach(r=>r.style.display=(r.dataset.s.includes(q)&&(!st||r.dataset.st===st)&&(!sc||r.dataset.sec===sc))?"":"none")};
    ["q","fst","fsc"].forEach(id=>$("#"+id)?.addEventListener("input",run));
  };
  const rows=users.map(x=>{const [lb,k]=SB[x.status]||[x.status,""];
    const actions=`<div class="row">${x.status!=="approved"?btn("apv","Approve",x.id,"ok"):btn("deact","Deactivate",x.id,"ghost")}${btn("pwreset","Reset password",x.id,"ghost",`data-em="${esc(x.email)}"`)}${btn("delprof","Delete profile",x.id,"danger")}</div>`;
    const secCell=`<select data-c="setsec" data-id="${x.id}" aria-label="Section for ${esc(x.name)}" style="min-width:110px">${secOpts(x.sectionId)}</select>`;
    return {attr:`data-s="${esc((x.name+" "+x.email+" "+(x.lrn||"")).toLowerCase())}" data-st="${esc(x.status)}" data-sec="${esc(x.sectionId||"")}"`,
      c:isS?[esc(x.name),esc(x.lrn||"–"),secCell,esc(x.email),badge(lb,k),actions]:[esc(x.name),esc(x.email),badge(lb,k),actions]}});
  return head("User Accounts",`${users.length} ${role}(s)`,`<button class="btn sm ghost" data-a="expacc" data-id="${role}">${ic("download")} Export CSV</button>`)+`<div class="tabs"><a class="${isS?"on":""}" href="#/accounts/student">Students</a><a class="${!isS?"on":""}" href="#/accounts/teacher">Teachers</a></div>
  <div class="card"><div class="filters"><input id="q" placeholder="Search name, email or LRN…" aria-label="Search accounts" style="max-width:320px">
  <select id="fst" aria-label="Filter by status"><option value="">All statuses</option><option value="approved">Approved</option><option value="pending">Pending</option><option value="inactive">Inactive</option></select>
  ${isS?`<select id="fsc" aria-label="Filter by section"><option value="">All sections</option>${secs.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join("")}</select>`:""}</div>
  ${tbl(isS?["Name","LRN","Section","Email","Status",""]:["Name","Email","Status",""],rows,"No accounts yet.")}
  <p class="hint">Reset password emails a reset link (works for Gmail-and-password accounts). Deleting a profile removes the portal record only. The person can sign in again and re-register.</p></div>`;
};
act.deact=async el=>{if(!await ask("Deactivate this account? They will not be able to use the portal.","Deactivate",true))return;await updateDoc(doc(db,"users",el.dataset.id),{status:"inactive"});log("deactivated user "+el.dataset.id);toast("Account deactivated.");refresh()};
act.delprof=async el=>{if(!await ask("Delete this profile? Their submissions stay in the database.","Delete",true))return;await deleteDoc(doc(db,"users",el.dataset.id));log("deleted profile "+el.dataset.id);toast("Profile deleted.");refresh()};
act.pwreset=async el=>{const em=el.dataset.em;if(!em)return;if(!await ask(`Send a password reset link to ${em}?`,"Send link"))return;await sendPasswordResetEmail(auth,em);log("sent password reset to "+em);toast("Reset link sent.")};
chg.setsec=async el=>{try{await updateDoc(doc(db,"users",el.dataset.id),{sectionId:el.value});log("moved student "+el.dataset.id+" to another section");toast("Section updated.");refresh()}catch(e){toast(errMsg(e),"bad")}};
act.expacc=async el=>{
  const role=el.dataset.id,[u,s]=await Promise.all([list("users",where("role","==",role)),list("sections")]);u.sort(byName);
  saveCsv(`${role}s.csv`,[["Name","Email","LRN","Section","Status"],...u.map(x=>[x.name,x.email,x.lrn||"",s.find(z=>z.id===x.sectionId)?.name||"",x.status])]);
  log("exported "+role+" list");toast("List exported.");
};

/* ---------- curriculum ---------- */
pages.curriculum=async()=>{
  const s=(await list("subjects")).sort(byName);
  return head("Subjects & Curriculum","Subjects offered in Grade 11")+`<div class="card"><h3>Add a subject</h3><div class="g2">
  <div><label class="f" for="sn">Subject name</label><input id="sn" placeholder="e.g. General Mathematics"></div>
  <div><label class="f" for="st">Type</label><select id="st"><option>core</option><option>elective</option></select></div>
  <div><label class="f" for="stm">Term</label><select id="stm"><option value="all">All terms</option><option>1</option><option>2</option><option>3</option></select></div>
  <div><label class="f" for="stk">Track</label><select id="stk"><option>All tracks</option><option>Academic</option><option>TVL</option></select></div></div>
  <label class="f" for="sd">Description</label><textarea id="sd" rows="2"></textarea><p><button class="btn" data-a="addsub">Add subject</button></p></div>
  <div class="card">${tbl(["Subject","Type","Term","Track",""],s.map(x=>[esc(x.name),esc(x.type),esc(x.term),esc(x.track),btn("delsub","Delete",x.id,"danger")]),"No subjects yet.")}</div>`;
};
act.addsub=async()=>{if(!v("sn"))return toast("Enter the subject name.","bad");await addDoc(collection(db,"subjects"),{name:v("sn"),type:v("st"),term:v("stm"),track:v("stk"),description:v("sd")});log("added subject "+v("sn"));toast("Subject added.");refresh()};
act.delsub=async el=>{if(await ask("Delete this subject?","Delete",true)){await deleteDoc(doc(db,"subjects",el.dataset.id));toast("Deleted.");refresh()}};

/* ---------- sections & loads ---------- */
pages.loads=async()=>{
  const [secs,tch,subs,loads]=await Promise.all([list("sections"),list("users",where("role","==","teacher")),list("subjects"),list("loads")]);
  const T=tch.filter(t=>t.status==="approved").sort(byName);secs.sort(byName);subs.sort(byName);
  const cnt=await Promise.all(secs.map(s=>count("users",where("sectionId","==",s.id),where("role","==","student"))));
  const o=(a,f)=>a.map(x=>`<option value="${x.id}">${esc(f(x))}</option>`).join("");
  const nm=(a,id)=>esc(a.find(x=>x.id===id)?.name||"?");
  const wl=T.map(t=>[esc(t.name),loads.filter(l=>l.teacherUid===t.id).length,esc(secs.filter(s=>s.adviserUid===t.id).map(s=>s.name).join(", ")||"–")]);
  return head("Sections & Teaching Loads")+`<div class="card"><h3>Grade 11 sections</h3><div class="row"><input id="scn" placeholder="e.g. ASSH A" style="max-width:260px"><button class="btn" data-a="addsec">Create section</button></div>
  ${tbl(["Section","Students","Adviser",""],secs.map((s,i)=>[`<input id="nm_${s.id}" value="${esc(s.name)}" aria-label="Section name" style="max-width:200px">`,cnt[i],`<select id="adv_${s.id}" aria-label="Adviser for ${esc(s.name)}"><option value="">— none —</option>${T.map(t=>`<option value="${t.id}" ${s.adviserUid===t.id?"selected":""}>${esc(t.name)}</option>`).join("")}</select>`,`<div class="row">${btn("setadv","Save",s.id)}${btn("delsec","Delete",s.id,"danger")}</div>`]),"No sections yet.")}</div>
  <div class="card"><h3>Assign subject load</h3><div class="g2"><div><label class="f" for="ls">Subject</label><select id="ls">${o(subs,x=>x.name)}</select></div><div><label class="f" for="lc">Section</label><select id="lc">${o(secs,x=>x.name)}</select></div><div><label class="f" for="lt">Teacher</label><select id="lt">${o(T,x=>x.name)}</select></div></div>
  <p><button class="btn" data-a="addload">Assign</button></p>
  ${tbl(["Subject","Section","Teacher",""],loads.map(l=>[nm(subs,l.subjectId),nm(secs,l.sectionId),nm(tch,l.teacherUid),btn("delload","Remove",l.id,"danger")]),"No loads assigned yet.")}</div>
  <div class="card"><h3>Teacher workload</h3>${tbl(["Teacher","Subject loads","Adviser of"],wl,"No approved teachers yet.")}</div>`;
};
act.addsec=async()=>{if(!v("scn"))return toast("Enter a section name.","bad");await addDoc(collection(db,"sections"),{name:v("scn")});log("created section "+v("scn"));toast("Section created.");refresh()};
act.setadv=async el=>{const id=el.dataset.id,name=v("nm_"+id);if(!name)return toast("Section name cannot be empty.","bad");await updateDoc(doc(db,"sections",id),{name,adviserUid:v("adv_"+id)});log("updated section "+name);toast("Section saved.");refresh()};
act.delsec=async el=>{
  const st=await count("users",where("sectionId","==",el.dataset.id));
  if(st)return toast(`This section still has ${st} student profile(s). Move or delete them first.`,"bad");
  if(await ask("Delete this section?","Delete",true)){await deleteDoc(doc(db,"sections",el.dataset.id));toast("Section deleted.");refresh()}
};
act.addload=async()=>{
  const sub=v("ls"),sec=v("lc"),t=v("lt");if(!sub||!sec||!t)return toast("Choose a subject, section and teacher.","bad");
  const dup=await list("loads",where("sectionId","==",sec),where("subjectId","==",sub));
  if(dup.length)return toast("That subject is already assigned to this section.","bad");
  const tn=(await list("users",where("role","==","teacher"))).find(x=>x.id===t)?.name||"";
  await addDoc(collection(db,"loads"),{subjectId:sub,sectionId:sec,teacherUid:t,teacherName:tn});log("assigned load");toast("Load assigned.");refresh();
};
act.delload=async el=>{if(await ask("Remove this load? Activities already posted stay in the database.","Remove",true)){await deleteDoc(doc(db,"loads",el.dataset.id));toast("Removed.");refresh()}};

/* ---------- announcements ---------- */
pages.announcements=async()=>head("Announcements","Visible to all students and teachers")+
  `<div class="card"><h3>Post announcement</h3><label class="f" for="an_t">Title</label><input id="an_t" placeholder="e.g. Exam schedule"><label class="f" for="an">Message</label><textarea id="an" rows="3"></textarea><p><button class="btn" data-a="post">Post</button></p></div>`+await annHtml(30,true);
act.post=async()=>{if(!v("an"))return toast("Write a message first.","bad");await addDoc(collection(db,"announcements"),{title:v("an_t")||"Announcement",text:v("an"),by:S.me.email,at:serverTimestamp()});log("posted announcement");toast("Posted.");refresh()};
act.delann=async el=>{if(await ask("Delete this announcement?","Delete",true)){await deleteDoc(doc(db,"announcements",el.dataset.id));toast("Deleted.");refresh()}};

/* ---------- settings ---------- */
pages.settings=async()=>head("School Settings","Shown on every dashboard")+`<div class="card"><div class="g2">
  <div><label class="f" for="sy">School year</label><input id="sy" value="${esc(S.set.schoolYear)}" placeholder="2026–2027"></div>
  <div><label class="f" for="tm">Current term / quarter</label><input id="tm" list="terms" value="${esc(S.set.term)}" placeholder="Term 2"><datalist id="terms"><option>Term 1</option><option>Term 2</option><option>Term 3</option><option>Quarter 1</option><option>Quarter 2</option><option>Quarter 3</option><option>Quarter 4</option></datalist></div></div>
  <p><button class="btn" data-a="saveset">Save settings</button></p></div>`;
act.saveset=async()=>{const d={schoolYear:v("sy"),term:v("tm"),updatedAt:serverTimestamp()};await setDoc(doc(db,"settings","school"),d);S.set={schoolYear:d.schoolYear,term:d.term};log("updated school settings");toast("Settings saved.");refresh()};

/* ---------- audit log & storage ---------- */
pages.logs=async()=>{
  const [l,u,a,s,sub,k]=await Promise.all([list("logs",orderBy("at","desc"),limit(100)),count("users"),count("activities"),count("submissions"),count("materials"),count("logs")]);
  S.after=()=>$("#lq")?.addEventListener("input",e=>{const q=e.target.value.toLowerCase();document.querySelectorAll("tbody tr[data-s]").forEach(r=>r.style.display=r.dataset.s.includes(q)?"":"none")});
  return head("Audit Log & Storage","",btn("explog","Export log (CSV)","","ghost"))+`<div class="cards">${stat("Users",u,"","users")}${stat("Activities",a,"","list")}${stat("Submissions",s,"","check")}${stat("Materials",sub,"","file")}${stat("Log entries",k,"","shield")}</div>
  <div class="card"><h3>Storage monitor (free plan)</h3><p class="mut">Counts use cheap aggregate queries. Exact usage: Firebase Console → Firestore → Usage. Free quota: 1 GiB stored, 50k reads/day, 20k writes/day.</p></div>
  <div class="card"><h3>Activity log (latest 100)</h3><input id="lq" placeholder="Filter by person or action…" aria-label="Filter log" style="max-width:320px;margin-bottom:10px">
  ${tbl(["When","Who","Action"],l.map(x=>({attr:`data-s="${esc(((x.by||"")+" "+(x.action||"")).toLowerCase())}"`,c:[fdate(ts(x.at)),esc(x.by),esc(x.action)]})),"No log entries.")}</div>`;
};
act.explog=async()=>{
  const l=await list("logs",orderBy("at","desc"),limit(500));
  saveCsv("audit-log.csv",[["When","Who","Action"],...l.map(x=>[fdate(ts(x.at)),x.by||"",x.action||""])]);toast("Log exported.");
};
