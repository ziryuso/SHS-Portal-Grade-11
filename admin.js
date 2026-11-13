import {S,act,$,esc,v,list,count,db,doc,setDoc,addDoc,updateDoc,deleteDoc,collection,where,orderBy,limit,serverTimestamp,toast,ask,go,refresh,fdate,ts,badge,stat,tbl,head,empty,btn,log,greet,fday,annHtml,ic} from "./core.js";

export const nav=()=>[
  {k:"home",l:"Dashboard",i:"home"},
  {k:"approvals",l:"Approvals",i:"check"},
  {k:"accounts",l:"Accounts",i:"users"},
  {k:"curriculum",l:"Curriculum",i:"book"},
  {k:"loads",l:"Sections & Loads",i:"grid"},
  {k:"announcements",l:"News",i:"bell"},
  {k:"settings",l:"Settings",i:"cog"},
  {k:"logs",l:"Logs & Storage",i:"shield"}];
import {generalProfile} from "./profile.js";
export const pages={profile:generalProfile};
const byName=(a,b)=>(a.name||"").localeCompare(b.name||"");
const SB={approved:["Approved","ok"],pending:["Pending","warn"],inactive:["Inactive","bad"]};

/* ---------- dashboard ---------- */
pages.home=async()=>{
  const [stu,tea,pend,secs,acts,subs,reqs,logs,pending]=await Promise.all([
    count("users",where("role","==","student"),where("status","==","approved")),count("users",where("role","==","teacher"),where("status","==","approved")),
    count("users",where("status","==","pending")),count("sections"),count("activities"),count("submissions"),
    list("requests",where("done","==",false)),list("logs",orderBy("at","desc"),limit(6)),list("users",where("status","==","pending"))]);
  return `<div class="banner"><h1>${greet()}, Administrator</h1><p>${fday(Date.now())}</p></div>
  <div class="cards">${stat("Students",stu,"Approved","users")}${stat("Teachers",tea,"Approved","users","ok")}${stat("Sections",secs,"","grid")}
  ${stat("Pending approvals",pend,"Students and teachers","clock",pend?"warn":"ok")}${stat("Open requests",reqs.length,"From students","bell",reqs.length?"warn":"ok")}${stat("Activities / Submissions",`${acts} / ${subs}`,"All time","chart")}</div>
  <div class="cols"><div class="card"><h3>Waiting for approval</h3>${tbl(["Name","Role",""],pending.slice(0,6).map(x=>[esc(x.name),esc(x.role),btn("apv","Approve",x.id,"ok")]),"Nobody is waiting.")}${pending.length>6?`<p><a href="#/approvals">See all ${pending.length}</a></p>`:""}</div>
  <div class="card"><h3>Recent activity</h3>${tbl(["When","Who","Action"],logs.map(x=>[fdate(ts(x.at)),esc(x.by),esc(x.action)]),"No activity logged yet.")}</div></div>
  <h2>Latest announcements</h2>${await annHtml(2)}`;
};

/* ---------- approvals ---------- */
pages.approvals=async()=>{
  const [users,reqs,secs]=await Promise.all([list("users",where("status","==","pending")),list("requests",where("done","==",false)),list("sections")]);
  const sn=id=>esc(secs.find(s=>s.id===id)?.name||"–"),T=users.filter(u=>u.role==="teacher"),St=users.filter(u=>u.role==="student");
  return head("Approvals")+`<div class="card"><h3>Teacher accounts</h3>${tbl(["Name","Email",""],T.map(x=>[esc(x.name),esc(x.email),btn("apv","Approve",x.id,"ok")]),"No teachers waiting.")}</div>
  <div class="card"><h3>Student accounts</h3><p class="hint">Advisers normally approve their own students. You can approve any student here.</p>${tbl(["Name","LRN","Section","Email",""],St.map(x=>[esc(x.name),esc(x.lrn||"–"),sn(x.sectionId),esc(x.email),btn("apv","Approve",x.id,"ok")]),"No students waiting.")}</div>
  <div class="card"><h3>Student requests</h3>${tbl(["From","Request","When",""],reqs.map(x=>[esc(x.email),esc(x.type),fdate(ts(x.at)),btn("reqdone","Mark done",x.id)]),"No open requests.")}</div>`;
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
    return {attr:`data-s="${esc((x.name+" "+x.email+" "+(x.lrn||"")).toLowerCase())}"`,c:role==="student"?[esc(x.name),esc(x.lrn||"–"),sn(x.sectionId),esc(x.email),badge(lb,k),actions]:[esc(x.name),esc(x.email),badge(lb,k),actions]}}),"No accounts yet.")}
  <p class="hint">Deleting a profile removes the portal record only. The person can sign in again and re-register.</p></div>`;
};
act.deact=async el=>{if(!await ask("Deactivate this account? They will not be able to use the portal.","Deactivate",true))return;await updateDoc(doc(db,"users",el.dataset.id),{status:"inactive"});log("deactivated user "+el.dataset.id);toast("Account deactivated.");refresh()};
act.delprof=async el=>{if(!await ask("Delete this profile? Their submissions stay in the database.","Delete",true))return;await deleteDoc(doc(db,"users",el.dataset.id));log("deleted profile "+el.dataset.id);toast("Profile deleted.");refresh()};

/* ---------- curriculum ---------- */
pages.curriculum=async()=>{
  const s=(await list("subjects")).sort(byName);
  return head("SHS Curriculum","Subjects offered in Grade 11")+`<div class="card"><h3>Add a subject</h3><div class="g2">
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
  const o=(a,f)=>a.map(x=>`<option value="${x.id}">${esc(f(x))}</option>`).join("");
  const nm=(a,id)=>esc(a.find(x=>x.id===id)?.name||"?");
  return head("Sections & subject loads")+`<div class="card"><h3>Grade 11 sections</h3><div class="row"><input id="scn" placeholder="e.g. ASSH A" style="max-width:260px"><button class="btn" data-a="addsec">Create section</button></div>
  ${tbl(["Section","Adviser",""],secs.map(s=>[esc(s.name),`<select id="adv_${s.id}" aria-label="Adviser for ${esc(s.name)}"><option value="">— none —</option>${T.map(t=>`<option value="${t.id}" ${s.adviserUid===t.id?"selected":""}>${esc(t.name)}</option>`).join("")}</select>`,`<div class="row">${btn("setadv","Save adviser",s.id)}${btn("delsec","Delete",s.id,"danger")}</div>`]),"No sections yet.")}</div>
  <div class="card"><h3>Assign subject load</h3><div class="g2"><div><label class="f" for="ls">Subject</label><select id="ls">${o(subs,x=>x.name)}</select></div><div><label class="f" for="lc">Section</label><select id="lc">${o(secs,x=>x.name)}</select></div><div><label class="f" for="lt">Teacher</label><select id="lt">${o(T,x=>x.name)}</select></div></div>
  <p><button class="btn" data-a="addload">Assign</button></p>
  ${tbl(["Subject","Section","Teacher",""],loads.map(l=>[nm(subs,l.subjectId),nm(secs,l.sectionId),nm(tch,l.teacherUid),btn("delload","Remove",l.id,"danger")]),"No loads assigned yet.")}</div>`;
};
act.addsec=async()=>{if(!v("scn"))return toast("Enter a section name.","bad");await addDoc(collection(db,"sections"),{name:v("scn")});log("created section "+v("scn"));toast("Section created.");refresh()};
act.setadv=async el=>{await updateDoc(doc(db,"sections",el.dataset.id),{adviserUid:v("adv_"+el.dataset.id)});log("set adviser for "+el.dataset.id);toast("Adviser saved.");refresh()};
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
pages.settings=async()=>head("School settings","Shown on every dashboard")+`<div class="card"><div class="g2">
  <div><label class="f" for="sy">School year</label><input id="sy" value="${esc(S.set.schoolYear)}" placeholder="2026–2027"></div>
  <div><label class="f" for="tm">Current term / quarter</label><input id="tm" list="terms" value="${esc(S.set.term)}" placeholder="Term 2"><datalist id="terms"><option>Term 1</option><option>Term 2</option><option>Term 3</option><option>Quarter 1</option><option>Quarter 2</option><option>Quarter 3</option><option>Quarter 4</option></datalist></div></div>
  <p><button class="btn" data-a="saveset">Save settings</button></p></div>`;
act.saveset=async()=>{const d={schoolYear:v("sy"),term:v("tm"),updatedAt:serverTimestamp()};await setDoc(doc(db,"settings","school"),d);S.set={schoolYear:d.schoolYear,term:d.term};log("updated school settings");toast("Settings saved.");refresh()};

/* ---------- logs & storage ---------- */
pages.logs=async()=>{
  const [l,u,a,s,sub,k]=await Promise.all([list("logs",orderBy("at","desc"),limit(100)),count("users"),count("activities"),count("submissions"),count("materials"),count("logs")]);
  return head("Logs & storage")+`<div class="cards">${stat("Users",u,"","users")}${stat("Activities",a,"","list")}${stat("Submissions",s,"","check")}${stat("Materials",sub,"","file")}${stat("Log entries",k,"","shield")}</div>
  <div class="card"><h3>Storage monitor (free plan)</h3><p class="mut">Counts use cheap aggregate queries. Exact usage: Firebase Console → Firestore → Usage. Free quota: 1 GiB stored, 50k reads/day, 20k writes/day.</p></div>
  <div class="card"><h3>Activity log (latest 100)</h3>${tbl(["When","Who","Action"],l.map(x=>[fdate(ts(x.at)),esc(x.by),esc(x.action)]),"No log entries.")}</div>`;
};
