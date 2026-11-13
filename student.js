import {photoCard} from "./profile.js";
import {S,act,$,$$,esc,list,db,doc,getDoc,setDoc,addDoc,updateDoc,collection,where,serverTimestamp,toast,ask,go,fdate,pct,bar,badge,stat,tbl,head,empty,ic,sha,shuffle,qMax,annHtml,greet,fday,mmss,errMsg,ts,norm} from "./core.js";

export const nav=()=>[
  {k:"home",l:"Dashboard",i:"home"},
  {k:"subjects",l:"Subjects",i:"book",m:["subject","take"]},
  {k:"grades",l:"My Grades",i:"chart",m:["result"]},
  {k:"announcements",l:"News",i:"bell"},
  {k:"profile",l:"Profile",i:"users"}];
export const pages={};

/* ---------- data + status helpers ---------- */
async function data(){
  const sid=S.me.sectionId;
  const [loads,subjects,acts,subs,secs]=await Promise.all([
    list("loads",where("sectionId","==",sid)),list("subjects"),
    list("activities",where("sectionId","==",sid)),
    list("submissions",where("uid","==",S.me.uid)),list("sections")]);
  const A=acts.filter(a=>a.v===2&&!a.draft).sort((a,b)=>(a.closes||9e15)-(b.closes||9e15));
  return {loads,subjects,acts:A,subs,sm:Object.fromEntries(subs.map(x=>[x.actId,x])),sec:secs.find(x=>x.id===sid)};
}
const linksHtml=a=>(a.links||[]).length?`<div class="row" style="margin-top:6px">${a.links.map(l=>`<a class="btn sm ghost" href="${esc(l.u)}" target="_blank" rel="noopener noreferrer">${ic("file")} ${esc(l.t||"Open file")}</a>`).join("")}</div>`:"";
const dkey=id=>"draft2:"+S.me.uid+":"+id;
const getDraft=id=>{try{return JSON.parse(localStorage.getItem(dkey(id)))}catch{return null}};
const putDraft=(id,d)=>{try{localStorage.setItem(dkey(id),JSON.stringify(d))}catch{}};
const dropDraft=id=>{try{localStorage.removeItem(dkey(id))}catch{}};
function status(a,s){
  const n=Date.now(),used=s?.attempts||0;
  if(used>=a.attempts)return "done";
  if(a.opens&&n<a.opens)return "soon";
  if(a.closes&&n>a.closes)return used?"done":"missed";
  return used?"retake":(getDraft(a.id)?"progress":"open");
}
const SB={done:["Completed","ok"],retake:["Completed · retake open","ok"],progress:["In progress","warn"],open:["Not started","info"],soon:["Not yet open","mut"],missed:["Missed","bad"]};
const sp=s=>pct((s.best||0)+(s.manualTotal||0),s.total);
const pend=s=>s.graded===false;
const scoreTxt=s=>pend(s)?`${s.best}/${s.total} so far · awaiting teacher grading`:`${(s.best||0)+(s.manualTotal||0)}/${s.total} (${sp(s)}%)`;
const subjName=(d,l)=>d.subjects.find(x=>x.id===l?.subjectId)?.name||"Subject";
const loadOf=(d,a)=>d.loads.find(l=>l.id===a.loadId);
const dueTxt=a=>a.closes?"Due "+fdate(a.closes):"No deadline";

function progressOf(d,loadId){const as=d.acts.filter(a=>a.loadId===loadId),done=as.filter(a=>d.sm[a.id]).length;return {n:as.length,done,p:pct(done,as.length)}}
const subjCard=(d,l)=>{const s=d.subjects.find(x=>x.id===l.subjectId)||{},pr=progressOf(d,l.id);
  return `<div class="card subj"><span class="chip">${esc(s.type||"core")}</span><h3>${esc(s.name||"Subject")}</h3>
  <p class="mut sm">${esc(s.description||"")}</p>${l.teacherName?`<div class="mut sm">Teacher: ${esc(l.teacherName)}</div>`:""}
  <div class="row between sm" style="margin-top:10px"><span>${pr.done}/${pr.n} activities done</span><b>${pr.p}%</b></div>${bar(pr.p,pr.p==100?"ok":"")}
  <p><a class="btn" href="#/subject/${l.id}">Open</a></p></div>`};

/* ---------- dashboard ---------- */
pages.home=async()=>{
  const d=await data(),m=S.me;
  const items=d.acts.map(a=>({a,s:d.sm[a.id],st:status(a,d.sm[a.id])}));
  const todo=items.filter(x=>x.st==="open"||x.st==="progress");
  const graded=d.subs.filter(s=>!pend(s)),avg=graded.length?Math.round(graded.reduce((n,s)=>n+sp(s),0)/graded.length):null;
  const left=items.filter(x=>["open","progress","retake"].includes(x.st)).reduce((n,x)=>n+x.a.attempts-(x.s?.attempts||0),0);
  const recent=[...d.subs].sort((a,b)=>ts(b.at)-ts(a.at)).slice(0,5);
  const actOf=id=>d.acts.find(a=>a.id===id);
  const minor=m.minor===undefined?`<div class="card"><h3>Are you a minor (under 18)?</h3><p class="mut">If yes, a parent or guardian must give permission to use this portal.</p>
    <button class="btn" data-a="minor" data-id="1">Yes</button> <button class="btn ghost" data-a="minor" data-id="0">No</button></div>`:"";
  return `<div class="banner"><h1>${greet()}, ${esc(m.name.split(",").pop().trim().split(" ")[0])}!</h1>
  <p>${fday(Date.now())}${d.sec?.name?" · "+esc(d.sec.name):""}</p></div>
  ${minor}
  <div class="cards">${stat("Activities to do",todo.length,todo.length?"Start with the earliest deadline":"You're all caught up","clock",todo.length?"warn":"ok")}
  ${stat("Completed",`${d.subs.length}/${d.acts.length}`,"Activities answered","check","ok")}
  ${stat("Average score",avg==null?"–":avg+"%","Across graded activities","star")}
  ${stat("Attempts left",left,"On open activities","list")}</div>
  <div class="cols"><div class="card"><h3>Due soon</h3>${todo.slice(0,5).map(x=>`<div class="item"><div><b>${esc(x.a.title)}</b><div class="mut sm">${esc(subjName(d,loadOf(d,x.a)))} · ${dueTxt(x.a)}</div></div><a class="btn sm" href="#/take/${x.a.id}">${x.st==="progress"?"Resume":"Start"}</a></div>`).join("")||empty("Nothing due right now.","check")}</div>
  <div class="card"><h3>Recent scores</h3>${recent.map(s=>`<div class="item"><div><b>${esc(actOf(s.actId)?.title||"Activity")}</b><div class="mut sm">${pend(s)?"Awaiting grading":""}</div></div><div style="min-width:110px"><b>${pend(s)?"…":sp(s)+"%"}</b>${bar(pend(s)?0:sp(s),sp(s)<75?"warn":"ok")}</div></div>`).join("")||empty("No scores yet.","chart")}</div></div>
  <h2>My subjects</h2><div class="cards">${d.loads.map(l=>subjCard(d,l)).join("")||`<div class="card">${empty("No subjects assigned to your section yet.","book")}</div>`}</div>
  <h2>Latest announcements</h2>${await annHtml(3)}`;
};
act.minor=async el=>{const m=el.dataset.id==="1";await updateDoc(doc(db,"users",S.me.uid),{minor:m,parentOk:!m});S.me.minor=m;toast(m?"Please have your parent/guardian confirm with your adviser.":"Saved.");go("home")};

/* ---------- subjects ---------- */
pages.subjects=async()=>{const d=await data();
  return head("My subjects",`${d.sec?.name||""}`)+`<div class="cards">${d.loads.map(l=>subjCard(d,l)).join("")||`<div class="card">${empty("No subjects assigned to your section yet.","book")}</div>`}</div>`};

pages.subject=async([id])=>{
  const d=await data(),l=d.loads.find(x=>x.id===id);
  if(!l)return `<div class="card">${empty("Subject not found.")}<p class="right"><a class="btn" href="#/subjects">Back</a></p></div>`;
  const mats=(await list("materials",where("loadId","==",id))).sort((a,b)=>ts(b.at)-ts(a.at));
  const as=d.acts.filter(a=>a.loadId===id);
  return head(subjName(d,l),l.teacherName?"Teacher: "+l.teacherName:"",`<a class="btn ghost" href="#/subjects">← Subjects</a>`)+
  `<div class="card"><h3>Learning materials</h3>${mats.map(m=>`<div class="item"><div><b>${esc(m.title)}</b>${m.note?`<div class="mut sm">${esc(m.note)}</div>`:""}<div class="mut sm">${fdate(ts(m.at))}</div></div><a class="btn sm" href="${esc(m.url)}" target="_blank" rel="noopener noreferrer">Open / Download</a></div>`).join("")||empty("No materials posted yet.")}</div>
  ${(()=>{if(!as.length)return `<div class="card"><h3>Classwork</h3>${empty("No activities posted yet.","list")}</div>`;
    const groups={};as.forEach(a=>(groups[a.topic||""]??=[]).push(a));
    const keys=Object.keys(groups).sort((x,y)=>!x?1:!y?-1:x.localeCompare(y));
    return keys.map(t=>`<div class="card"><h3>${t?esc(t):"Classwork"}</h3>${groups[t].map(a=>{const s=d.sm[a.id],st=status(a,s),[lb,k]=SB[st],used=s?.attempts||0;
    return `<div class="item"><div style="min-width:0"><b>${esc(a.title)}</b> ${badge(lb,k)}
    <div class="mut sm">${a.opens&&Date.now()<a.opens?"Opens "+fdate(a.opens)+" · ":""}${dueTxt(a)} · ${a.questions.length} items · ${a.totalPts} pts · ${a.timeLimit?a.timeLimit+" min · ":""}${Math.max(0,a.attempts-used)} attempt(s) left</div>
    ${s?`<div class="sm"><b>Score:</b> ${scoreTxt(s)}</div>`:""}${linksHtml(a)}</div>
    <div class="row">${st==="open"||st==="progress"||st==="retake"?`<a class="btn sm" href="#/take/${a.id}">${st==="progress"?"Resume":st==="retake"?"Retake":"Start"}</a>`:""}${s?`<a class="btn sm ghost" href="#/result/${a.id}">Result</a>`:""}</div></div>`}).join("")}</div>`).join("")})()}`;
};

/* ---------- take an activity ---------- */
const RUN={cur:0,busy:false,iv:0};
const newDraft=a=>{const idx=a.questions.map((_,i)=>i),d={t0:Date.now(),ord:a.shuffle?shuffle(idx):idx,opt:{},mo:{},ans:{},sw:0};
  a.questions.forEach((q,i)=>{if(a.shuffle&&q.t==="mc")d.opt[i]=shuffle(q.o.map((_,k)=>k));if(q.t==="mt")d.mo[i]=shuffle(q.r.map((_,k)=>k))});return d};
const isDone=(q,x)=>q.t==="mt"?Array.isArray(x)&&x.length===q.l.length&&x.every(Boolean):!!(x&&String(x).trim());
const gate=(msg,back="#/subjects")=>`<div class="card">${empty(msg,"clock")}<p class="right"><a class="btn" href="${back}">Back</a></p></div>`;

function qCard(a,qi,pos,dr){
  const q=a.questions[qi],x=dr.ans[qi];let inp="";
  if(q.t==="mc"||q.t==="tf"){const ord=dr.opt?.[qi]||q.o.map((_,k)=>k);
    inp=ord.map(k=>`<label class="opt"><input type="radio" name="q${qi}" data-q="${qi}" value="${esc(q.o[k])}" ${x===q.o[k]?"checked":""}><span>${esc(q.o[k])}</span></label>`).join("")}
  else if(q.t==="mt"){const rs=dr.mo?.[qi]||q.r.map((_,k)=>k);
    inp=q.l.map((l,j)=>`<div class="mrow"><span>${esc(l)}</span><select data-q="${qi}" data-j="${j}"><option value="">Choose…</option>${rs.map(k=>`<option value="${esc(q.r[k])}" ${Array.isArray(x)&&x[j]===q.r[k]?"selected":""}>${esc(q.r[k])}</option>`).join("")}</select></div>`).join("")}
  else if(q.t==="es")inp=`<textarea data-q="${qi}" rows="6" placeholder="Write your answer here">${esc(x||"")}</textarea>`;
  else inp=`<input data-q="${qi}" value="${esc(x||"")}" placeholder="Type your answer" autocomplete="off">`;
  return `<section class="card qc" data-i="${pos}"><div class="row between"><b>Question ${pos+1}</b><span class="mut sm">${qMax(q)} pt${qMax(q)>1?"s":""}</span></div><p class="qp">${esc(q.p)}</p>${q.img?`<img class="qimg" src="${q.img}" alt="Picture for question ${pos+1}">`:""}${inp}</section>`;
}

pages.take=async([id])=>{
  const snap=await getDoc(doc(db,"activities",id));
  if(!snap.exists())return gate("Activity not found.");
  const a={id,...snap.data()};
  if(a.v!==2||a.sectionId!==S.me.sectionId)return gate("This activity is not available to you.");
  const ss=await getDoc(doc(db,"submissions",id+"_"+S.me.uid)),s=ss.exists()?ss.data():null,st=status(a,s);
  const back="#/subject/"+a.loadId;
  if(st==="soon")return gate("This activity opens on "+fdate(a.opens)+".",back);
  if(st==="missed")return gate("This activity is already closed.",back);
  if(st==="done")return gate("You have used all attempts for this activity.",back);
  let dr=getDraft(id);if(!dr||dr.ord?.length!==a.questions.length)dr=newDraft(a);putDraft(id,dr);
  const total=a.questions.length,mode=localStorage.getItem("runMode")||"all";
  const dl=()=>Math.min(a.timeLimit?dr.t0+a.timeLimit*6e4:Infinity,a.closes||Infinity);
  RUN.cur=0;RUN.busy=false;

  S.after=()=>{
    const root=$("#run");
    const upd=()=>{const n=a.questions.filter((q,i)=>isDone(q,dr.ans[i])).length;
      $("#pgt").textContent=`${n} of ${total} answered`;$("#pgb").style.width=pct(n,total)+"%";
      $$(".chipq").forEach(c=>c.classList.toggle("on",isDone(a.questions[+c.dataset.q],dr.ans[+c.dataset.q])))};
    const show=i=>{RUN.cur=Math.max(0,Math.min(total-1,i));$$(".qc").forEach(c=>c.classList.toggle("cur",+c.dataset.i===RUN.cur));if(root.classList.contains("one"))scrollTo(0,0)};
    root.addEventListener("input",ev=>{
      const el=ev.target.closest("[data-q]");if(!el)return;const qi=+el.dataset.q;
      if(el.dataset.j!==undefined){const n=a.questions[qi].l.length;if(!Array.isArray(dr.ans[qi]))dr.ans[qi]=Array(n).fill("");dr.ans[qi][+el.dataset.j]=el.value}
      else dr.ans[qi]=el.value;
      putDraft(id,dr);upd();
    });
    act.qgo=el=>show(RUN.cur+ +el.dataset.d);
    act.qjump=el=>{const i=+el.dataset.i;if(root.classList.contains("one"))show(i);else $$(".qc")[i]?.scrollIntoView({behavior:"smooth",block:"center"})};
    act.qmode=()=>{const one=root.classList.toggle("one");localStorage.setItem("runMode",one?"one":"all");$("#qpn").style.display=one?"flex":"none";$("#qmode").textContent=one?"Show all questions":"One question at a time";show(RUN.cur)};
    act.runSubmit=()=>submitRun(a,dr,false);
    show(0);upd();
    if(isFinite(dl())){
      const tick=()=>{const r=dl()-Date.now();$("#tm").textContent=mmss(r);$("#tmw").classList.toggle("warn",r<6e4);if(r<=0){clearInterval(RUN.iv);submitRun(a,dr,true)}};
      tick();RUN.iv=setInterval(tick,1000);
    }
    const vis=()=>{if(document.hidden){dr.sw=(dr.sw||0)+1;putDraft(id,dr)}};
    document.addEventListener("visibilitychange",vis);
    S.cleanup=()=>{clearInterval(RUN.iv);document.removeEventListener("visibilitychange",vis)};
  };
  return `<div class="card runhead"><div class="row between"><div><b>${esc(a.title)}</b><div class="mut sm">${total} items · ${a.totalPts} points${a.shuffle?" · shuffled":""}</div></div>
  <div class="row">${isFinite(dl())?`<span class="timer" id="tmw">${ic("clock")}<span id="tm">--:--</span></span>`:""}<button class="btn" id="sbtn" data-a="runSubmit">Submit</button></div></div>
  <div class="bar"><i id="pgb" style="width:0"></i></div><div class="row between sm"><span id="pgt"></span><button class="btn ghost sm" id="qmode" data-a="qmode">${mode==="one"?"Show all questions":"One question at a time"}</button></div>
  <div class="qnav">${dr.ord.map((qi,pos)=>`<button class="chipq" data-q="${qi}" data-a="qjump" data-i="${pos}" aria-label="Go to question ${pos+1}">${pos+1}</button>`).join("")}</div></div>
  ${a.instructions||(a.links||[]).length?`<div class="card"><b>Instructions</b>${a.instructions?`<p style="white-space:pre-wrap">${esc(a.instructions)}</p>`:""}${linksHtml(a)}</div>`:""}
  <div id="run" class="${mode==="one"?"one":""}">${dr.ord.map((qi,pos)=>qCard(a,qi,pos,dr)).join("")}
  <div id="qpn" class="row between" style="display:${mode==="one"?"flex":"none"}"><button class="btn ghost" data-a="qgo" data-d="-1">← Previous</button><button class="btn ghost" data-a="qgo" data-d="1">Next →</button></div></div>
  <div class="card"><button class="btn" data-a="runSubmit">Submit answers</button> <a class="btn ghost" href="${back}">Save &amp; leave (answers are autosaved)</a></div>`;
};

async function submitRun(a,dr,auto){
  if(RUN.busy)return;RUN.busy=true;
  const blanks=a.questions.filter((q,i)=>!isDone(q,dr.ans[i])).length;
  if(!auto){
    const ok=await ask(blanks?`You have ${blanks} unanswered item(s). Submit anyway? You cannot change your answers afterwards.`:"Submit your answers now? You cannot change them afterwards.","Submit");
    if(!ok){RUN.busy=false;return}
  }else toast("Time is up — submitting your answers.","bad");
  $$("[data-a=runSubmit],#sbtn").forEach(b=>b.disabled=true);
  try{
    let score=0;const qres=[],answers={};
    for(let i=0;i<a.questions.length;i++){
      const q=a.questions[i],x=dr.ans[i];
      answers[i]=q.t==="mt"?(Array.isArray(x)?x:Array(q.l.length).fill("")).map(z=>z||""):(x||"");
      if(q.t==="es"){qres.push(0);continue}
      if(q.t==="mt"){let c=0;for(let j=0;j<q.l.length;j++)if(answers[i][j]&&await sha(a.salt,answers[i][j])===q.h[j])c++;score+=c*(q.pts||1);qres.push(c/q.l.length)}
      else{const ok=!!answers[i]&&q.h.includes(await sha(a.salt,answers[i]));if(ok)score+=(q.pts||1);qres.push(ok?1:0)}
    }
    const ref=doc(db,"submissions",a.id+"_"+S.me.uid),old=await getDoc(ref),o=old.exists()?old.data():{};
    if((o.attempts||0)>=a.attempts){toast("No attempts left.","bad");return go("subject/"+a.loadId)}
    const better=score>=(o.best||0);
    await setDoc(ref,{uid:S.me.uid,alias:S.me.alias,actId:a.id,loadId:a.loadId,sectionId:a.sectionId,total:a.totalPts,
      best:Math.max(o.best||0,score),manualTotal:0,graded:!a.hasEssay,attempts:(o.attempts||0)+1,
      answers:better?answers:(o.answers||answers),qres:better?qres:(o.qres||qres),
      scores:[...(o.scores||[]),{s:score,t:Date.now()}],tabSwitches:(o.tabSwitches||0)+(dr.sw||0),at:serverTimestamp()});
    dropDraft(a.id);S.cleanup?.();S.cleanup=null;
    toast("Submitted!");go("result/"+a.id);
  }catch(e){toast(errMsg(e),"bad");$$("[data-a=runSubmit],#sbtn").forEach(b=>b.disabled=false);RUN.busy=false}
}

/* ---------- result + review ---------- */
pages.result=async([id])=>{
  const [as,ss]=await Promise.all([getDoc(doc(db,"activities",id)),getDoc(doc(db,"submissions",id+"_"+S.me.uid))]);
  if(!as.exists()||!ss.exists())return gate("No result found for this activity.");
  const a={id,...as.data()},s=ss.data(),st=status(a,s),back="#/subject/"+a.loadId;
  let review=`<div class="card"><b>Answer review</b><p class="mut">Your teacher has not released the answer key yet. It will appear here once released.</p></div>`;
  if(a.release){
    let key=null;try{const k=await getDoc(doc(db,"keys",id));key=k.exists()?k.data().ans:null}catch{}
    if(key)review=`<h2>Answer review</h2>`+a.questions.map((q,i)=>{
      const x=s.answers?.[i],r=s.qres?.[i]??0,k=key[i];let body="",cls="rv ";
      if(q.t==="es"){const p=s.manual?.[i];cls+=p==null?"":p>=qMax(q)?"good":p>0?"part":"wrong";
        body=`<div><b>Your answer:</b><p style="white-space:pre-wrap">${esc(x||"(blank)")}</p></div>${k?`<div><b>Model answer / rubric:</b><p style="white-space:pre-wrap">${esc(k)}</p></div>`:""}<div class="sm">Points: ${p==null?"awaiting grading":p+" / "+qMax(q)}</div>`}
      else if(q.t==="mt"){cls+=r===1?"good":r>0?"part":"wrong";
        body=q.l.map((l,j)=>{const ok=norm(x?.[j])===norm(k?.[j]);return `<div class="sm ${ok?"ok":"bad"}">${esc(l)} → ${esc(x?.[j]||"(blank)")}${ok?" ✓":` ✗ (correct: ${esc(k?.[j]||"")})`}</div>`}).join("")}
      else{cls+=r===1?"good":"wrong";body=`<div>Your answer: <b class="${r===1?"ok":"bad"}">${esc(x||"(blank)")}</b></div>${r===1?"":`<div>Correct answer: <b>${esc(String(k||"").split("|").join(" / "))}</b></div>`}`}
      return `<div class="card ${cls}"><b>${i+1}. ${esc(q.p)}</b>${q.img?`<img class="qimg" src="${q.img}" alt="">`:""}${body}</div>`}).join("");
  }
  const left=Math.max(0,a.attempts-s.attempts);
  return head(a.title,"",`<a class="btn ghost" href="${back}">← Back to subject</a>`)+
  `<div class="card"><div class="row" style="gap:24px"><div><div class="big ${pend(s)?"":sp(s)>=75?"ok":"bad"}">${pend(s)?"…":sp(s)+"%"}</div><div class="mut">${pend(s)?"Pending teacher grading":"Your best score"}</div></div>
  <div><p><b>${scoreTxt(s)}</b></p><p class="mut">Attempts used: ${s.attempts} of ${a.attempts}${s.scores?.length>1?" · Scores: "+s.scores.map(x=>x.s).join(", "):""}</p>
  <p class="mut sm">Submitted ${fdate(ts(s.at))}</p></div></div>${st==="retake"?`<p><a class="btn" href="#/take/${id}">Retake (${left} left)</a></p>`:""}</div>`+review;
};

/* ---------- grades ---------- */
pages.grades=async()=>{
  const d=await data();
  const rows=d.loads.map(l=>{const as=d.acts.filter(a=>a.loadId===l.id);
    const ss=as.map(a=>d.sm[a.id]).filter(s=>s&&!pend(s)),avg=ss.length?Math.round(ss.reduce((n,s)=>n+sp(s),0)/ss.length):null;
    return {l,as,avg}});
  const all=rows.filter(r=>r.avg!=null);
  return head("My grades",`${d.sec?.name||""}${S.set.schoolYear?" · SY "+S.set.schoolYear:""}`,`<button class="btn ghost" onclick="print()">Print</button>`)+
  `<div class="cards">${stat("Overall average",all.length?Math.round(all.reduce((n,r)=>n+r.avg,0)/all.length)+"%":"–","Across subjects with graded work","star","ok")}${stat("Activities done",`${d.subs.length}/${d.acts.length}`,"","check")}</div>`+
  rows.map(r=>`<div class="card"><div class="row between"><h3>${esc(subjName(d,r.l))}</h3><b>${r.avg==null?"–":r.avg+"%"}</b></div>
  ${tbl(["Activity","Status","Score","%"],r.as.map(a=>{const s=d.sm[a.id],[lb,k]=SB[status(a,s)];return [esc(a.title),badge(lb,k),s?`${(s.best||0)+(s.manualTotal||0)}/${s.total}`:"–",s?(pend(s)?"…":sp(s)+"%"):"–"]}),"No activities yet.")}</div>`).join("")||`<div class="card">${empty("No subjects yet.")}</div>`;
};

pages.announcements=async()=>head("Announcements","From the school administration")+await annHtml(30);

/* ---------- profile ---------- */
pages.profile=async()=>{
  const m=S.me,secs=await list("sections"),sec=secs.find(x=>x.id===m.sectionId);
  return head("My profile")+`${photoCard()}<div class="card">${tbl(["Field","Details"],[["Section",esc(sec?.name||"–")],["LRN",esc(m.lrn||"Not provided")],["Alias",`${esc(m.alias)} <span class="mut sm">(classmates see only this)</span>`],["School year",esc(S.set.schoolYear||"–")],["Account status",badge("Approved","ok")]])}</div>
  <div class="card"><h3>Need a change?</h3><p class="mut">Requests are sent to the administrator.</p>
  <button class="btn ghost" data-a="reqfix">Request name / section correction</button> <button class="btn danger" data-a="reqdel">Request account deletion</button></div>
  <div class="card"><button class="btn ghost" data-a="out">Log out</button></div>`;
};
const req=async type=>{if(!await ask("Send this request to the administrator?","Send"))return;
  await addDoc(collection(db,"requests"),{uid:S.me.uid,email:S.me.email,type,done:false,at:serverTimestamp()});toast("Request sent to the administrator.")};
act.reqfix=()=>req("name/section correction");act.reqdel=()=>req("delete account");
