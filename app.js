import {firebaseConfig,ADMIN_EMAILS,SCHOOL} from "./firebase-config.js";
import {initializeApp} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {getAuth,GoogleAuthProvider,signInWithPopup,signOut,onAuthStateChanged} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {getFirestore,collection,doc,getDoc,getDocs,setDoc,addDoc,updateDoc,deleteDoc,query,where,orderBy,limit,serverTimestamp} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const fb=initializeApp(firebaseConfig),auth=getAuth(fb),db=getFirestore(fb);
const $=s=>document.querySelector(s),v=id=>($("#"+id)?.value||"").trim();
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const list=async(c,...q)=>(await getDocs(query(collection(db,c),...q))).docs.map(d=>({id:d.id,...d.data()}));
const log=a=>addDoc(collection(db,"logs"),{by:me.email,action:a,at:serverTimestamp()}).catch(()=>{});
let me=null,act={},tab=0,tabs=[];

/* ---- screenshot deterrent (best effort: browsers cannot fully block it) ---- */
const guard=()=>{
  if(me?.role!=="student")return;
  addEventListener("keyup",e=>{if(e.key==="PrintScreen"){navigator.clipboard?.writeText("");alert("Screenshots are not allowed.")}});
  addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&["p","s"].includes(e.key.toLowerCase()))e.preventDefault()});
  addEventListener("contextmenu",e=>e.preventDefault());
  document.addEventListener("visibilitychange",()=>$("main")?.classList.toggle("blur",document.hidden));
};

/* ---- auth ---- */
onAuthStateChanged(auth,async u=>{
  if(!u)return loginView();
  const s=await getDoc(doc(db,"users",u.uid));
  if(s.exists())me={uid:u.uid,...s.data()};
  else if(ADMIN_EMAILS.includes(u.email)){
    me={uid:u.uid,email:u.email,name:u.displayName,role:"admin",status:"approved"};
    await setDoc(doc(db,"users",u.uid),me);
  }else return registerView(u);
  guard();route();
});
const shell=(title,body)=>$("#app").innerHTML=`<header><b>${esc(SCHOOL)}</b><span>${esc(title)} <button class="d" data-a="out">Log out</button></span></header>${body}`;
function loginView(){
  $("#app").innerHTML=`<div class="login card"><h2>${esc(SCHOOL)}</h2>
  <p class="mut">Students, Teachers and Admin sign in with Google.</p>
  <button class="b" data-a="login">Sign in with Google</button></div>`;
}
act.login=()=>signInWithPopup(auth,new GoogleAuthProvider()).catch(e=>alert(e.message));
act.out=()=>signOut(auth).then(()=>{me=null});

async function registerView(u){
  const secs=await list("sections");
  $("#app").innerHTML=`<div class="login card" style="text-align:left"><h2>Create account</h2>
  <p class="mut">${esc(u.email)}</p>
  <label>I am a</label><select id="role"><option value="student">Student</option><option value="teacher">Teacher</option></select>
  <label>Full name</label><input id="nm" value="${esc(u.displayName)}">
  <div id="secw"><label>Section enrolled</label><select id="sec">${secs.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join("")}</select></div>
  <p></p><button class="b" data-a="reg">Submit for approval</button></div>`;
  $("#role").onchange=e=>$("#secw").style.display=e.target.value==="student"?"":"none";
  act.reg=async()=>{
    const role=v("role"),d={email:u.email,name:v("nm"),role,status:"pending",createdAt:serverTimestamp()};
    if(role==="student"){d.sectionId=v("sec");d.alias="S-"+Math.random().toString(36).slice(2,8).toUpperCase()}
    await setDoc(doc(db,"users",u.uid),d);location.reload();
  };
}

/* ---- routing / tabs ---- */
function route(){
  if(me.status!=="approved")return shell("Pending",`<main><div class="card"><h3>Waiting for approval</h3><p>${me.role==="teacher"?"The admin must approve your account.":"Your adviser must approve your enrollment."} Come back and log in again once approved.</p></div></main>`);
  tabs=({admin:adminTabs,teacher:teacherTabs,student:studentTabs})[me.role]();
  draw();
}
async function draw(){
  shell(`${me.name} (${me.role})`,`<nav>${tabs.map((t,i)=>`<button class="${i==tab?"on":""}" data-a="tab" data-i="${i}">${t[0]}</button>`).join("")}</nav><main id="m">Loading…</main>`);
  $("#m").innerHTML=await tabs[tab][1]();
}
act.tab=e=>{tab=+e.dataset.i;draw()};
const refresh=()=>draw();
document.addEventListener("click",e=>{const el=e.target.closest("[data-a]");if(el&&act[el.dataset.a])act[el.dataset.a](el)});
const table=(h,rows)=>`<table><tr>${h.map(x=>`<th>${x}</th>`).join("")}</tr>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join("")}</tr>`).join("")}</table>`;
const btn=(a,l,id,cls="b")=>`<button class="${cls}" data-a="${a}" data-id="${id}">${l}</button>`;

/* ================= ADMIN ================= */
const adminTabs=()=>[["Approvals",adminApprovals],["Curriculum",adminCurr],["Sections & Loads",adminLoads],["Announcements",annView],["Logs & Storage",adminLogs]];
async function adminApprovals(){
  const t=await list("users",where("status","==","pending"),where("role","==","teacher"));
  const r=await list("requests",where("done","==",false));
  return `<div class="card"><h3>Teacher accounts</h3>${t.length?table(["Name","Email",""],t.map(x=>[esc(x.name),esc(x.email),btn("apv",x.name&&"Approve",x.id)])):"<p class=mut>None pending.</p>"}</div>
  <div class="card"><h3>Requests (delete account / change password)</h3>${r.length?table(["From","Type",""],r.map(x=>[esc(x.email),esc(x.type),btn("reqdone","Mark done",x.id)])):"<p class=mut>None.</p>"}</div>`;
}
act.apv=async e=>{await updateDoc(doc(db,"users",e.dataset.id),{status:"approved"});log("approved user "+e.dataset.id);refresh()};
act.reqdone=async e=>{await updateDoc(doc(db,"requests",e.dataset.id),{done:true});refresh()};

async function adminCurr(){
  const s=await list("subjects",orderBy("name"));
  return `<div class="card"><h3>SHS Curriculum – Annex</h3><div class="row">
  <input id="sn" placeholder="Subject name"><select id="st"><option>core</option><option>elective</option></select>
  <select id="stm"><option value="all">All terms</option><option>1</option><option>2</option><option>3</option></select>
  <select id="stk"><option>All tracks</option><option>Academic</option><option>TVL</option></select></div>
  <textarea id="sd" placeholder="Subject description"></textarea><p><button class="b" data-a="addsub">Add subject</button></p></div>
  <div class="card">${table(["Subject","Type","Term","Track",""],s.map(x=>[esc(x.name),x.type,x.term,x.track,btn("delsub","Delete",x.id,"d")]))}</div>`;
}
act.addsub=async()=>{if(!v("sn"))return;await addDoc(collection(db,"subjects"),{name:v("sn"),type:v("st"),term:v("stm"),track:v("stk"),description:v("sd")});log("added subject "+v("sn"));refresh()};
act.delsub=async e=>{if(confirm("Delete subject?")){await deleteDoc(doc(db,"subjects",e.dataset.id));refresh()}};

async function adminLoads(){
  const [secs,tch,subs,loads]=await Promise.all([list("sections"),list("users",where("role","==","teacher"),where("status","==","approved")),list("subjects"),list("loads")]);
  const o=(a,f)=>a.map(x=>`<option value="${x.id}">${esc(f(x))}</option>`).join("");
  const nm=(a,id)=>esc(a.find(x=>x.id==id)?.name||"?");
  return `<div class="card"><h3>Grade 11 sections</h3><div class="row"><input id="scn" placeholder="e.g. ASSH A"><button class="b" data-a="addsec">Create</button></div>
  ${table(["Section","Adviser",""],secs.map(s=>[esc(s.name),`<select data-a="adv" data-id="${s.id}" onchange="this.dataset.v=this.value"><option value="">— none —</option>${tch.map(t=>`<option value="${t.id}" ${s.adviserUid==t.id?"selected":""}>${esc(t.name)}</option>`).join("")}</select>`,btn("setadv","Save adviser",s.id)]))}</div>
  <div class="card"><h3>Assign subject load</h3><div class="row"><select id="ls">${o(subs,x=>x.name)}</select><select id="lc">${o(secs,x=>x.name)}</select><select id="lt">${o(tch,x=>x.name)}</select><button class="b" data-a="addload">Assign</button></div>
  ${table(["Subject","Section","Teacher",""],loads.map(l=>[nm(subs,l.subjectId),nm(secs,l.sectionId),nm(tch,l.teacherUid),btn("delload","Remove",l.id,"d")]))}</div>`;
}
act.addsec=async()=>{if(v("scn")){await addDoc(collection(db,"sections"),{name:v("scn")});refresh()}};
act.setadv=async e=>{const sel=e.closest("tr").querySelector("select");await updateDoc(doc(db,"sections",e.dataset.id),{adviserUid:sel.value});log("set adviser");refresh()};
act.addload=async()=>{await addDoc(collection(db,"loads"),{subjectId:v("ls"),sectionId:v("lc"),teacherUid:v("lt")});refresh()};
act.delload=async e=>{await deleteDoc(doc(db,"loads",e.dataset.id));refresh()};

async function adminLogs(){
  const [l,u,a,s]=await Promise.all([list("logs",orderBy("at","desc"),limit(50)),list("users"),list("activities"),list("submissions")]);
  return `<div class="card"><h3>Storage monitor (free plan)</h3><p>Users: ${u.length} · Activities: ${a.length} · Submissions: ${s.length}</p>
  <p class="mut">Exact usage: Firebase Console → Firestore → Usage. Free quota: 1 GiB stored, 50k reads/day, 20k writes/day.</p></div>
  <div class="card"><h3>Activity logs</h3>${table(["When","Who","Action"],l.map(x=>[x.at?.toDate?.().toLocaleString()||"",esc(x.by),esc(x.action)]))}</div>`;
}

/* ================= ANNOUNCEMENTS (admin) ================= */
async function annView(){
  const a=await list("announcements",orderBy("at","desc"),limit(30));
  const post=me.role==="admin"?`<div class="card"><h3>Post announcement</h3><textarea id="an"></textarea><p><button class="b" data-a="post">Post to students & teachers</button></p></div>`:"";
  return post+a.map(x=>`<div class="card"><b>${esc(x.title||"Announcement")}</b><p>${esc(x.text)}</p><span class="mut">${x.at?.toDate?.().toLocaleString()||""}</span></div>`).join("");
}
act.post=async()=>{if(v("an")){await addDoc(collection(db,"announcements"),{text:v("an"),by:me.email,at:serverTimestamp()});refresh()}};

/* ================= TEACHER ================= */
const teacherTabs=()=>[["Notifications",tNotif],["Subject Loads",tLoads],["Grades",tGrades]];
async function tNotif(){
  const secs=await list("sections",where("adviserUid","==",me.uid));
  if(!secs.length)return "<div class=card>You are not an adviser. Admin assigns advisers.</div>";
  const p=await list("users",where("role","==","student"),where("status","==","pending"),where("sectionId","==",secs[0].id));
  return `<div class="card"><h3>Student approvals – ${esc(secs[0].name)}</h3>${p.length?table(["Name","Email",""],p.map(x=>[esc(x.name),esc(x.email),btn("apv","Approve",x.id)])):"<p class=mut>None pending.</p>"}</div>`+await annView();
}
async function tLoads(){
  const [l,subs,secs]=await Promise.all([list("loads",where("teacherUid","==",me.uid)),list("subjects"),list("sections")]);
  const nm=(a,id)=>esc(a.find(x=>x.id==id)?.name||"?");
  return `<div class="grid">${l.map(x=>`<div class="card"><b>${nm(subs,x.subjectId)}</b><div class=mut>${nm(secs,x.sectionId)}</div><p>${btn("openload","Open",x.id)}</p></div>`).join("")||"No subject loads yet."}</div>`;
}
let draft=[];
act.openload=async e=>{
  const id=e.dataset.id,ld=(await getDoc(doc(db,"loads",id))).data();
  const st=await list("users",where("sectionId","==",ld.sectionId),where("status","==","approved"));
  const ac=await list("activities",where("loadId","==",id));
  draft=[];
  $("#m").innerHTML=`<div class="card"><h3>Students</h3>${st.map(s=>esc(s.alias)+(s.offline?" (offline module)":"")).join(", ")||"None"}</div>
  <div class="card"><h3>Activities</h3>${table(["Title","Attempts",""],ac.map(a=>[esc(a.title),a.attempts,btn("delact","Delete",a.id,"d")]))}</div>
  <div class="card"><h3>New activity</h3><div class="row"><input id="at" placeholder="Title"><select id="aa"><option value="1">1 attempt</option><option value="2">2 attempts (best score kept)</option></select></div>
  <input id="am" placeholder="Optional: downloadable module link (Drive URL)" style="margin-top:8px">
  <h4>Add question</h4><div class="row"><select id="qt"><option value="mc">Multiple choice</option><option value="id">Identification</option><option value="sa">Short answer</option><option value="mt">Matching</option></select><input id="qp" placeholder="Question"></div>
  <input id="qo" placeholder="MC: options separated by ;  |  Matching: left=right; left=right" style="margin-top:8px">
  <input id="qa" placeholder="Correct answer (MC: exact option; short answer: use | for alternatives)" style="margin-top:8px">
  <p><button class="b" data-a="addq">Add question</button></p><div id="dq"></div>
  <h4>Or paste a ready-made test</h4><textarea id="bulk" placeholder="One per line:  type|question|options;separated|answer&#10;mc|Capital of PH?|Manila;Cebu;Davao|Manila&#10;id|Largest ocean?||Pacific"></textarea>
  <p><button class="b" data-a="bulk">Import test</button> <button class="b" data-a="saveact" data-id="${id}">Post activity</button></p></div>`;
  $("#m").dataset.load=id;$("#m").dataset.sec=ld.sectionId;
};
const showDraft=()=>$("#dq").innerHTML=draft.map((q,i)=>`<div>${i+1}. [${q.t}] ${esc(q.p)}</div>`).join("")+`<p class=mut>${draft.length} question(s)</p>`;
act.addq=()=>{
  const t=v("qt"),q={t,p:v("qp"),o:v("qo"),a:v("qa")};
  if(!q.p)return;
  if(t==="mc")q.o=q.o.split(";").map(s=>s.trim());
  if(t==="mt"){q.pairs=q.o.split(";").map(s=>s.split("=").map(x=>x.trim()));delete q.o;delete q.a}
  draft.push(q);showDraft();
};
act.bulk=()=>{
  v("bulk").split("\n").forEach(l=>{const [t,p,o,a]=l.split("|").map(s=>s?.trim());if(!p)return;
    draft.push({t,p,o:t==="mc"?(o||"").split(";").map(s=>s.trim()):o,a})});showDraft();
};
act.saveact=async e=>{
  if(!v("at")||!draft.length)return alert("Add a title and at least one question.");
  const ld=(await getDoc(doc(db,"loads",e.dataset.id))).data();
  await addDoc(collection(db,"activities"),{loadId:e.dataset.id,sectionId:ld.sectionId,title:v("at"),attempts:+v("aa"),moduleUrl:v("am"),questions:draft,by:me.uid,at:serverTimestamp()});
  log("posted activity "+v("at"));alert("Posted.");tab=1;refresh();
};
act.delact=async e=>{if(confirm("Delete activity?")){await deleteDoc(doc(db,"activities",e.dataset.id));tab=1;refresh()}};

async function tGrades(){
  const secs=await list("sections",where("adviserUid","==",me.uid));
  if(!secs.length)return "<div class=card>Only advisers see consolidated grades.</div>";
  const sid=secs[0].id;
  const [st,sub,subs,loads]=await Promise.all([list("users",where("sectionId","==",sid),where("status","==","approved")),list("submissions",where("sectionId","==",sid)),list("subjects"),list("loads",where("sectionId","==",sid))]);
  const cols=loads.map(l=>({id:l.id,n:subs.find(s=>s.id==l.subjectId)?.name||"?"}));
  const avg=(uid,lid)=>{const r=sub.filter(x=>x.uid==uid&&x.loadId==lid);return r.length?Math.round(r.reduce((a,x)=>a+100*x.best/x.total,0)/r.length)+"%":"–"};
  return `<div class="card"><h3>Consolidated grades – ${esc(secs[0].name)}</h3>${table(["Student",...cols.map(c=>esc(c.n))],st.map(s=>[esc(s.name),...cols.map(c=>avg(s.id,c.id))]))}</div>`;
}

/* ================= STUDENT ================= */
const studentTabs=()=>[["Home",sHome],["Subjects",sSubjects]];
async function sHome(){
  let ask="";
  if(me.minor===undefined)ask=`<div class="card"><h3>Are you a minor (under 18)?</h3><p class=mut>If yes, a parent/guardian must give permission.</p>
  <button class="b" data-a="minor" data-id="1">Yes</button> <button class="b" data-a="minor" data-id="0">No</button></div>`;
  return ask+`<div class="card"><b>Your alias: ${esc(me.alias)}</b><div class=mut>Classmates see only this alias.</div>
  <p>${btn("reqpw","Request password change",1)} ${btn("reqdel","Request account deletion",1,"d")}</p></div>`+await annView();
}
act.minor=async e=>{const m=e.dataset.id==="1";await updateDoc(doc(db,"users",me.uid),{minor:m,parentOk:!m});me.minor=m;
  if(m)alert("Please have your parent/guardian confirm with your adviser.");refresh()};
const req=type=>addDoc(collection(db,"requests"),{uid:me.uid,email:me.email,type,done:false}).then(()=>alert("Request sent to admin."));
act.reqpw=()=>req("change password");act.reqdel=()=>req("delete account");

async function sSubjects(){
  const [l,subs]=await Promise.all([list("loads",where("sectionId","==",me.sectionId)),list("subjects")]);
  return `<div class="grid">${l.map(x=>{const s=subs.find(z=>z.id==x.subjectId);return `<div class="card"><b>${esc(s?.name)}</b><div class=mut>${esc(s?.description||"")}</div><p>${btn("opensub","Open",x.id)}</p></div>`}).join("")||"No subjects assigned to your section yet."}</div>`;
}
act.opensub=async e=>{
  const [ac,sb]=await Promise.all([list("activities",where("loadId","==",e.dataset.id)),list("submissions",where("uid","==",me.uid))]);
  $("#m").innerHTML=`<div class="card"><button class="b" data-a="tab" data-i="1">← Back</button></div>`+(ac.map(a=>{
    const s=sb.find(x=>x.id==a.id+"_"+me.uid),left=a.attempts-(s?.attempts||0);
    return `<div class="card"><b>${esc(a.title)}</b> <span class="${s?"ok":"bad"}">${s?"Done":"Undone"}</span>
    <div class=mut>${s?`Best score: ${s.best}/${s.total} · `:""}Attempts left: ${left}</div>
    <p>${left>0?btn("take","Take activity",a.id):""} ${a.moduleUrl?`<a href="${esc(a.moduleUrl)}" target="_blank" rel="noopener">Download module</a>`:""}</p></div>`}).join("")||"<div class=card>No activities posted yet.</div>");
};
act.take=async e=>{
  const a=(await getDoc(doc(db,"activities",e.dataset.id))).data();a.id=e.dataset.id;
  $("#m").innerHTML=`<div class="card"><h3>${esc(a.title)}</h3><p class=mut>Answer every item. No blanks allowed.</p>${a.questions.map((q,i)=>`<div class="card"><b>${i+1}. ${esc(q.p)}</b><p>`+
  (q.t==="mc"?q.o.map(o=>`<label><input type="radio" name="q${i}" value="${esc(o)}" style="width:auto"> ${esc(o)}</label><br>`).join(""):
   q.t==="mt"?q.pairs.map((p,j)=>`<div class="row"><span>${esc(p[0])}</span><select data-mt="${i}-${j}"><option value="">choose…</option>${q.pairs.map(z=>`<option>${esc(z[1])}</option>`).join("")}</select></div>`).join(""):
   `<input id="q${i}">`)+`</p></div>`).join("")}<button class="b" data-a="submit" data-id="${a.id}">Submit</button></div>`;
  window._act=a;
};
act.submit=async()=>{
  const a=window._act;let score=0,blank=false;
  a.questions.forEach((q,i)=>{
    if(q.t==="mt"){q.pairs.forEach((p,j)=>{const x=document.querySelector(`[data-mt="${i}-${j}"]`).value;if(!x)blank=true;if(x===p[1])score++});return}
    const x=q.t==="mc"?(document.querySelector(`input[name=q${i}]:checked`)?.value||""):v("q"+i);
    if(!x)blank=true;
    if(String(q.a).toLowerCase().split("|").map(s=>s.trim()).includes(x.toLowerCase().trim()))score++;
  });
  if(blank)return alert("Please answer all items before submitting.");
  const total=a.questions.reduce((n,q)=>n+(q.t==="mt"?q.pairs.length:1),0);
  const ref=doc(db,"submissions",a.id+"_"+me.uid),old=await getDoc(ref),o=old.data()||{};
  if((o.attempts||0)>=a.attempts)return alert("No attempts left.");
  await setDoc(ref,{uid:me.uid,alias:me.alias,actId:a.id,loadId:a.loadId,sectionId:a.sectionId,total,best:Math.max(o.best||0,score),attempts:(o.attempts||0)+1,at:serverTimestamp()});
  alert(`Score: ${score}/${total}`);tab=1;refresh();
};
