import {S,act,$,$$,esc,v,list,db,doc,getDoc,setDoc,addDoc,updateDoc,deleteDoc,collection,where,writeBatch,serverTimestamp,toast,ask,go,fdate,ts,pct,bar,badge,stat,tbl,head,empty,btn,ic,sha,newSalt,shuffle,qMax,norm,annHtml,log,greet,fday,saveCsv,toLocalInput,fromLocalInput,errMsg,refresh} from "./core.js";

export const nav=()=>[
  {k:"home",l:"Dashboard",i:"home"},
  {k:"classes",l:"My Classes",i:"book",m:["load","editor","grade"]},
  ...(S.advSecs.length?[{k:"advisory",l:"Advisory",i:"users"}]:[]),
  {k:"announcements",l:"News",i:"bell"}];
import {generalProfile} from "./profile.js";
export const pages={profile:generalProfile};

/* ---------- helpers ---------- */
const chunk=(a,n)=>{const r=[];for(let i=0;i<a.length;i+=n)r.push(a.slice(i,i+n));return r};
const inQ=async(c,field,ids,...extra)=>(await Promise.all(chunk(ids,10).map(k=>list(c,where(field,"in",k),...extra)))).flat();
const sp=s=>pct((s.best||0)+(s.manualTotal||0),s.total);
const counted=s=>s.graded!==false;
const mean=a=>a.length?Math.round(a.reduce((x,y)=>x+y,0)/a.length):null;
const fm=x=>x==null?"–":x+"%";
const byName=(a,b)=>(a.name||"").localeCompare(b.name||"");
async function myLoads(){
  const [loads,subs,secs]=await Promise.all([list("loads",where("teacherUid","==",S.me.uid)),list("subjects"),list("sections")]);
  return loads.map(l=>({...l,sn:subs.find(x=>x.id===l.subjectId)?.name||"?",sec:secs.find(x=>x.id===l.sectionId)?.name||"?"}));
}
const subsFor=ids=>ids.length?inQ("submissions","loadId",ids):[];
const studentsFor=async secIds=>secIds.length?(await inQ("users","sectionId",[...new Set(secIds)])).filter(u=>u.role==="student"&&u.status==="approved").sort(byName):[];

/* ---------- dashboard ---------- */
pages.home=async()=>{
  const loads=await myLoads(),ids=loads.map(l=>l.id),secIds=loads.map(l=>l.sectionId);
  const [acts0,subs,studs]=await Promise.all([ids.length?list("activities",where("by","==",S.me.uid)):[],subsFor(ids),studentsFor(secIds)]);
  const acts=acts0.filter(a=>a.v===2),actOf=id=>acts.find(a=>a.id===id),nameOf=uid=>studs.find(s=>s.id===uid)?.name||"Student";
  const toGrade=subs.filter(s=>s.graded===false&&actOf(s.actId));
  const gs=subs.filter(counted);
  let adv="";
  if(S.advSecs.length){const p=(await inQ("users","sectionId",S.advSecs.map(s=>s.id))).filter(u=>u.role==="student"&&u.status==="pending");
    adv=p.length?`<div class="card" style="border-color:var(--pri)"><div class="row between"><div><b>${p.length} student${p.length>1?"s":""} waiting for your approval</b><div class="mut sm">Advisory: ${esc(S.advSecs.map(s=>s.name).join(", "))}</div></div><a class="btn" href="#/advisory">Review</a></div></div>`:""}
  const recent=[...subs].sort((a,b)=>ts(b.at)-ts(a.at)).slice(0,6);
  return `<div class="banner"><h1>${greet()}, ${esc(S.me.name.split(",").pop().trim().split(" ")[0])}!</h1><p>${fday(Date.now())}</p></div>${adv}
  <div class="cards">${stat("My classes",loads.length,`${new Set(secIds).size} section(s)`,"book")}${stat("Students",studs.length,"In my sections","users")}
  ${stat("Activities posted",acts.length,"","list")}${stat("Submissions",subs.length,"All time","check","ok")}
  ${stat("To grade",toGrade.length,"Essay answers waiting","clock",toGrade.length?"warn":"ok")}${stat("Average score",fm(mean(gs.map(sp))),"All my classes","star")}</div>
  <div class="cols"><div class="card"><h3>Class performance</h3>${loads.map(l=>{const ss=subs.filter(s=>s.loadId===l.id&&counted(s)),a=mean(ss.map(sp));
    return `<div class="item"><div style="flex:1;min-width:160px"><b>${esc(l.sn)}</b> <span class="mut sm">${esc(l.sec)}</span>${bar(a||0,a!=null&&a<75?"warn":"ok")}</div><b>${fm(a)}</b></div>`}).join("")||empty("No subject loads yet. The administrator assigns loads.","book")}</div>
  <div class="card"><h3>Needs grading</h3>${toGrade.slice(0,6).map(s=>`<div class="item"><div><b>${esc(nameOf(s.uid))}</b><div class="mut sm">${esc(actOf(s.actId)?.title||"")}</div></div><a class="btn sm" href="#/grade/${s.actId}">Grade</a></div>`).join("")||empty("Nothing to grade.","check")}</div></div>
  <div class="card" style="margin-top:14px"><h3>Recent submissions</h3>${tbl(["Student","Activity","Score","When"],recent.map(s=>[esc(nameOf(s.uid)),esc(actOf(s.actId)?.title||"—"),counted(s)?sp(s)+"%":"pending",fdate(ts(s.at))]),"No submissions yet.")}</div>
  <h2>Announcements</h2>${await annHtml(3)}`;
};

/* ---------- classes ---------- */
pages.classes=async()=>{
  const loads=await myLoads(),ids=loads.map(l=>l.id);
  const [acts0,subs,studs]=await Promise.all([ids.length?list("activities",where("by","==",S.me.uid)):[],subsFor(ids),studentsFor(loads.map(l=>l.sectionId))]);
  const acts=acts0.filter(a=>a.v===2);
  return head("My classes",`${loads.length} subject load(s)`)+`<div class="cards">${loads.map(l=>{
    const n=studs.filter(s=>s.sectionId===l.sectionId).length,as=acts.filter(a=>a.loadId===l.id),ss=subs.filter(s=>s.loadId===l.id),avg=mean(ss.filter(counted).map(sp)),comp=pct(ss.length,n*as.length);
    return `<div class="card subj"><span class="chip">${esc(l.sec)}</span><h3>${esc(l.sn)}</h3><div class="mut sm">${n} students · ${as.length} activities</div>
    <div class="row between sm" style="margin-top:8px"><span>Completion</span><b>${comp}%</b></div>${bar(comp)}<div class="row between sm"><span>Class average</span><b>${fm(avg)}</b></div>
    <p><a class="btn" href="#/load/${l.id}">Open class</a></p></div>`}).join("")||`<div class="card">${empty("No subject loads yet. The administrator assigns loads.","book")}</div>`}</div>`;
};

/* ---------- one class ---------- */
async function ctx(id){
  const ls=await getDoc(doc(db,"loads",id));
  if(!ls.exists())return null;const ld={id,...ls.data()};
  if(ld.teacherUid!==S.me.uid)return null;
  const [subj,sec,studs,acts,subs]=await Promise.all([getDoc(doc(db,"subjects",ld.subjectId)),getDoc(doc(db,"sections",ld.sectionId)),studentsFor([ld.sectionId]),
    list("activities",where("loadId","==",id)),list("submissions",where("loadId","==",id))]);
  return {ld,sn:subj.data()?.name||"Subject",secName:sec.data()?.name||"Section",studs,acts:acts.filter(a=>a.v===2).sort((a,b)=>ts(a.at)-ts(b.at)),subs};
}
const tabs=(id,cur)=>`<div class="tabs">${[["activities","Activities"],["materials","Materials"],["record","Class record"],["analysis","Item analysis"]].map(([k,l])=>`<a class="${k===cur?"on":""}" href="#/load/${id}/${k}">${l}</a>`).join("")}</div>`;

pages.load=async([id,tab="activities",extra])=>{
  const c=await ctx(id);if(!c)return `<div class="card">${empty("Class not found.")}<p class="right"><a class="btn" href="#/classes">Back</a></p></div>`;
  const hd=head(c.sn,`${c.secName} · ${c.studs.length} students`,`<a class="btn ghost" href="#/classes">← Classes</a>`)+tabs(id,tab);
  if(tab==="materials"){
    const mats=(await list("materials",where("loadId","==",id))).sort((a,b)=>ts(b.at)-ts(a.at));
    return hd+`<div class="card"><h3>Post a learning material</h3><div class="g2"><div><label class="f" for="mt_t">Title</label><input id="mt_t" placeholder="e.g. Module 3 – Trigonometry"></div>
    <div><label class="f" for="mt_u">Link (Google Drive, etc.)</label><input id="mt_u" type="url" placeholder="https://drive.google.com/…"></div></div>
    <label class="f" for="mt_n">Note (optional)</label><input id="mt_n"><p class="hint">Tip: in Google Drive set sharing to “Anyone with the link can view” so students can open it.</p>
    <p><button class="btn" data-a="addmat" data-id="${id}">Post material</button></p></div>
    <div class="card"><h3>Posted materials</h3>${mats.map(m=>`<div class="item"><div><b>${esc(m.title)}</b>${m.note?`<div class="mut sm">${esc(m.note)}</div>`:""}<div class="mut sm">${fdate(ts(m.at))}</div></div><div class="row"><a class="btn sm ghost" href="${esc(m.url)}" target="_blank" rel="noopener noreferrer">Open</a>${btn("delmat","Delete",m.id,"danger")}</div></div>`).join("")||empty("No materials yet.")}</div>`;
  }
  const subOf=(uid,aid)=>c.subs.find(s=>s.uid===uid&&s.actId===aid);
  if(tab==="record"){
    const cols=c.acts,rows=c.studs.map(s=>{const mine=cols.map(a=>subOf(s.id,a.id)),done=mine.filter(Boolean),av=mean(done.filter(counted).map(sp));
      return {s,mine,av,comp:pct(done.length,cols.length)}});
    S.tmp={name:`${c.sn}-${c.secName}-class-record.csv`,rows:[["Student","LRN",...cols.map(a=>`${a.title} (${a.totalPts})`),"Average %","Completion %"],
      ...rows.map(r=>[r.s.name,r.s.lrn||"",...r.mine.map(x=>x?(counted(x)?sp(x)+"%":"pending"):""),r.av??"",r.comp])]};
    return hd+`<div class="card"><div class="row between"><h3>Class record</h3><button class="btn ghost" data-a="csvrec">${ic("file")} Export CSV</button></div>
    ${tbl(["Student",...cols.map(a=>esc(a.title)),"Avg","Done"],[...rows.map(r=>[esc(r.s.name),...r.mine.map(x=>x?(counted(x)?sp(x)+"%":`<span class="mut">…</span>`):`<span class="mut">–</span>`),`<b>${fm(r.av)}</b>`,r.comp+"%"]),
      {c:[`<b>Class average</b>`,...cols.map(a=>`<b>${fm(mean(c.subs.filter(s=>s.actId===a.id&&counted(s)).map(sp)))}</b>`),`<b>${fm(mean(rows.map(r=>r.av).filter(x=>x!=null)))}</b>`,""]}],"No students in this section yet.","rec")}
    <p class="hint">“…” means an essay is waiting to be graded. Averages use graded submissions only.</p></div>`;
  }
  if(tab==="analysis"){
    const a=c.acts.find(x=>x.id===extra)||c.acts[0];
    if(!a)return hd+`<div class="card">${empty("Post an activity first.","chart")}</div>`;
    const ss=c.subs.filter(s=>s.actId===a.id),gs=ss.filter(counted).map(sp);
    const dist=[["90–100%",x=>x>=90],["75–89%",x=>x>=75&&x<90],["60–74%",x=>x>=60&&x<75],["Below 60%",x=>x<60]];
    const qa=a.questions.map((q,i)=>{if(q.t==="es")return {i,q,es:true};
      const r=ss.map(s=>s.qres?.[i]).filter(x=>x!=null),p=r.length?Math.round(100*r.reduce((x,y)=>x+y,0)/r.length):null;
      const wrong={};ss.forEach(s=>{if((s.qres?.[i]??1)<1&&s.answers?.[i]&&typeof s.answers[i]==="string"){const k=s.answers[i];wrong[k]=(wrong[k]||0)+1}});
      const top=Object.entries(wrong).sort((x,y)=>y[1]-x[1])[0];return {i,q,p,top}});
    const hardest=qa.filter(x=>x.p!=null).sort((x,y)=>x.p-y.p)[0];
    return hd+`<div class="row" style="margin-bottom:12px">${c.acts.map(x=>`<a class="btn sm ${x.id===a.id?"":"ghost"}" href="#/load/${id}/analysis/${x.id}">${esc(x.title)}</a>`).join("")}</div>
    <div class="cards">${stat("Submitted",`${new Set(ss.map(s=>s.uid)).size}/${c.studs.length}`,"Students","users")}${stat("Mean score",fm(mean(gs)),"","star")}${stat("Highest",gs.length?Math.max(...gs)+"%":"–","","chart","ok")}${stat("Lowest",gs.length?Math.min(...gs)+"%":"–","","chart","bad")}</div>
    <div class="cols"><div class="card"><h3>Score distribution</h3>${dist.map(([l,f])=>{const n=gs.filter(f).length;return `<div class="sm row between"><span>${l}</span><b>${n}</b></div>${bar(pct(n,gs.length))}`}).join("")}</div>
    <div class="card"><h3>Hardest item</h3>${hardest?`<p><b>Q${hardest.i+1}</b> — only ${hardest.p}% got it right.</p><p class="mut">${esc(hardest.q.p)}</p>`:empty("No data yet.")}</div></div>
    <div class="card" style="margin-top:14px"><h3>Item analysis</h3>${qa.map(x=>`<div class="item"><div style="flex:1;min-width:220px"><b>Q${x.i+1}.</b> ${esc(x.q.p)}${x.es?`<div class="mut sm">Essay — graded manually</div>`:`${bar(x.p||0,x.p!=null&&x.p<50?"bad":x.p<75?"warn":"ok")}${x.top?`<div class="mut sm">Most common wrong answer: “${esc(x.top[0])}” (${x.top[1]})</div>`:""}`}</div>${x.es?"":`<b>${fm(x.p)}</b>`}</div>`).join("")}</div>`;
  }
  /* activities tab */
  return hd+`<div class="card"><div class="row between"><h3>Activities</h3><a class="btn" href="#/editor/${id}">+ New activity</a></div>
  ${tbl(["Activity","Schedule","Settings","Submitted","Avg","Answers",""],c.acts.map(a=>{const ss=c.subs.filter(s=>s.actId===a.id),tg=ss.filter(s=>s.graded===false).length;
    return [`<b>${esc(a.title)}</b><div class="mut sm">${a.questions.length} items · ${a.totalPts} pts</div>`,`<div class="sm">${a.opens?"Opens "+fdate(a.opens):"Open now"}<br>${a.closes?"Closes "+fdate(a.closes):"No deadline"}</div>`,
      `<div class="sm">${a.attempts} attempt(s)${a.timeLimit?" · "+a.timeLimit+" min":""}${a.shuffle?" · shuffled":""}</div>`,
      `${new Set(ss.map(s=>s.uid)).size}/${c.studs.length}${tg?`<br><a href="#/grade/${a.id}">${badge(tg+" to grade","warn")}</a>`:""}`,fm(mean(ss.filter(counted).map(sp))),
      a.release?badge("Released","ok"):badge("Hidden","mut"),
      `<div class="row">${btn("relact",a.release?"Hide answers":"Release answers",a.id,"ghost")}<a class="btn sm ghost" href="#/editor/${id}/${a.id}">Edit</a>${btn("dupact","Duplicate",a.id,"ghost")}${a.hasEssay?`<a class="btn sm ghost" href="#/grade/${a.id}">Grade</a>`:""}${btn("delact","Delete",a.id,"danger")}</div>`]}),"No activities yet. Click “New activity”.")}
  <p class="hint">Old activities created with the previous version of the portal are not shown here; please recreate them with the new editor.</p></div>`;
};

act.csvrec=()=>S.tmp&&saveCsv(S.tmp.name,S.tmp.rows);
act.addmat=async el=>{
  const t=v("mt_t"),u=v("mt_u");if(!t)return toast("Enter a title.","bad");
  if(!/^https?:\/\//i.test(u))return toast("Enter a valid link starting with http:// or https://","bad");
  const ld=(await getDoc(doc(db,"loads",el.dataset.id))).data();
  await addDoc(collection(db,"materials"),{loadId:el.dataset.id,sectionId:ld.sectionId,title:t,url:u,note:v("mt_n"),by:S.me.uid,at:serverTimestamp()});
  log("posted material "+t);toast("Material posted.");go(`load/${el.dataset.id}/materials`);
};
act.delmat=async el=>{if(await ask("Delete this material?","Delete",true)){await deleteDoc(doc(db,"materials",el.dataset.id));toast("Deleted.");location.reload()}};
act.relact=async el=>{const r=doc(db,"activities",el.dataset.id),cur=(await getDoc(r)).data().release;await updateDoc(r,{release:!cur});toast(cur?"Answers hidden from students.":"Answers released to students.");location.reload()};
act.delact=async el=>{
  if(!await ask("Delete this activity and ALL student submissions for it? This cannot be undone.","Delete",true))return;
  const id=el.dataset.id,subs=await list("submissions",where("actId","==",id));
  for(const part of chunk(subs,400)){const b=writeBatch(db);part.forEach(s=>b.delete(doc(db,"submissions",s.id)));await b.commit()}
  const b=writeBatch(db);b.delete(doc(db,"keys",id));b.delete(doc(db,"activities",id));await b.commit();
  log("deleted activity "+id);toast("Activity deleted.");location.reload();
};
act.dupact=async el=>{
  const id=el.dataset.id,[a,k]=await Promise.all([getDoc(doc(db,"activities",id)),getDoc(doc(db,"keys",id))]);
  if(!k.exists())return toast("The answer key for this activity is missing, so it cannot be duplicated.","bad");
  const ref=doc(collection(db,"activities")),b=writeBatch(db);
  b.set(ref,{...a.data(),title:a.data().title+" (copy)",opens:0,closes:0,release:false,at:serverTimestamp(),updatedAt:serverTimestamp()});
  b.set(doc(db,"keys",ref.id),k.data());await b.commit();toast("Duplicated. Edit the copy to set its schedule.");location.reload();
};

/* ---------- activity editor ---------- */
let E=null;
const TYPES={mc:"Multiple choice",tf:"True / False",id:"Identification",sa:"Short answer",mt:"Matching",es:"Essay (teacher graded)"};
const dkey=lid=>"edraft2:"+S.me.uid+":"+lid;

function mk(t,p,pts,{o=[],a="",pairs=[]}){
  if(!p)throw new Error("Type the question first.");
  const q={t,p,pts:Math.max(1,Math.min(100,parseInt(pts)||1))};
  if(t==="mc"){o=[...new Set(o.map(s=>s.trim()).filter(Boolean))];if(o.length<2||o.length>8)throw new Error("Multiple choice needs 2–8 different options.");
    let c=a.trim();if(/^\d+$/.test(c)&&+c>=1&&+c<=o.length)c=o[+c-1];
    const f=o.find(x=>norm(x)===norm(c));if(!f)throw new Error("The correct option must match one of the options.");q.o=o;q.a=f}
  else if(t==="tf"){const x=norm(a);q.a=x==="true"||x==="t"?"True":x==="false"||x==="f"?"False":"";if(!q.a)throw new Error("Choose True or False.");q.o=["True","False"]}
  else if(t==="id"||t==="sa"){const alts=a.split("|").map(s=>s.trim()).filter(Boolean);if(!alts.length)throw new Error("Enter at least one accepted answer.");q.a=alts.join("|")}
  else if(t==="mt"){pairs=pairs.filter(x=>x[0]&&x[1]);if(pairs.length<2)throw new Error("Matching needs at least 2 pairs written as left=right.");q.pairs=pairs}
  else q.a=a.trim();
  return q;
}
const pairsOf=txt=>txt.split(/\n|;/).map(l=>{const i=l.indexOf("=");return i<0?["",""]:[l.slice(0,i).trim(),l.slice(i+1).trim()]});
const sumQ=q=>q.t==="mc"?q.o.map(o=>o===q.a?`<b class="ok">${esc(o)} ✓</b>`:esc(o)).join(" · "):q.t==="tf"?"Answer: "+q.a:q.t==="mt"?q.pairs.map(p=>esc(p[0])+" → "+esc(p[1])).join(" · "):q.t==="es"?"Graded by you"+(q.a?" · rubric saved":""):"Accepted: "+esc(q.a.split("|").join(" / "));

function qform(){
  const q=E.keep||(E.edit>=0?E.qs[E.edit]:{}),t=E.qt;E.keep=null;
  let x="";
  if(t==="mc")x=`<label class="f" for="qo">Options (one per line, 2–8)</label><textarea id="qo" rows="4">${esc((q.o||[]).join("\n"))}</textarea><label class="f" for="qa">Correct option (its number or exact text)</label><input id="qa" value="${esc(q.t==="mc"?q.a||"":"")}">`;
  else if(t==="tf")x=`<label class="f" for="qa">Correct answer</label><select id="qa"><option>True</option><option ${q.a==="False"?"selected":""}>False</option></select>`;
  else if(t==="id"||t==="sa")x=`<label class="f" for="qa">Accepted answer(s) — separate alternatives with |</label><input id="qa" value="${esc(q.t==="id"||q.t==="sa"?q.a||"":"")}" placeholder="Manila|Maynila"><p class="hint">Answers are not case-sensitive and extra spaces are ignored.</p>`;
  else if(t==="mt")x=`<label class="f" for="qm">Pairs (one per line: left=right)</label><textarea id="qm" rows="4" placeholder="Sine=opposite/hypotenuse&#10;Cosine=adjacent/hypotenuse">${esc((q.pairs||[]).map(p=>p.join("=")).join("\n"))}</textarea><p class="hint">Students see the right-hand items shuffled in a dropdown.</p>`;
  else x=`<label class="f" for="qa">Model answer / rubric (optional, shown to students when you release answers)</label><textarea id="qa" rows="3">${esc(q.t==="es"?q.a||"":"")}</textarea><p class="hint">Essay items are graded by you. Activities with essays allow only 1 attempt.</p>`;
  return `<div class="g2"><div><label class="f" for="qt">Type</label><select id="qt">${Object.entries(TYPES).map(([k,l])=>`<option value="${k}" ${k===t?"selected":""}>${l}</option>`).join("")}</select></div>
  <div><label class="f" for="qpts">Points${t==="mt"?" (per pair)":""}</label><input id="qpts" type="number" min="1" max="100" value="${q.pts||1}"></div></div>
  <label class="f" for="qp">Question</label><textarea id="qp" rows="2">${esc(q.p||"")}</textarea>${x}
  <p class="row"><button class="btn" data-a="qadd">${E.edit>=0?"Update question":"Add question"}</button>${E.edit>=0?`<button class="btn ghost" data-a="qcancel">Cancel edit</button>`:""}</p>`;
}
function readQ(){
  const t=E.qt,raw={};
  if(t==="mc"){raw.o=$("#qo").value.split("\n");raw.a=v("qa")}
  else if(t==="mt")raw.pairs=pairsOf($("#qm").value);
  else raw.a=t==="es"?$("#qa").value:v("qa");
  return mk(t,v("qp"),v("qpts"),raw);
}
function readMeta(){
  const m=E.meta;m.title=v("m_title");m.instr=$("#m_instr").value.trim();m.attempts=+v("m_att")||1;m.opens=fromLocalInput(v("m_open"));m.closes=fromLocalInput(v("m_close"));
  m.timeLimit=Math.max(0,parseInt(v("m_time"))||0);m.shuffle=$("#m_shuf").checked;m.release=$("#m_rel").checked;
}
const persist=()=>{if(E.actId)return;try{readMeta();localStorage.setItem(dkey(E.loadId),JSON.stringify({meta:E.meta,qs:E.qs}))}catch{}};
function drawList(){
  const tot=E.qs.reduce((n,q)=>n+qMax(q),0);
  $("#qlist").innerHTML=`<div class="row between"><h3>Questions (${E.qs.length}) · ${tot} points</h3></div>`+(E.qs.map((q,i)=>`<div class="qrow"><div class="txt"><b>${i+1}.</b> ${badge(TYPES[q.t],"info")} ${badge(qMax(q)+" pt","mut")}<div>${esc(q.p)}</div><div class="mut sm">${sumQ(q)}</div></div>
  <div class="acts">${btn("qup","↑",i,"ghost",i?"":"disabled")}${btn("qdown","↓",i,"ghost",i<E.qs.length-1?"":"disabled")}${btn("qedit","Edit",i,"ghost")}${btn("qdup","Copy",i,"ghost")}${btn("qdel","Delete",i,"danger")}</div></div>`).join("")||empty("No questions yet. Add them above or import a ready-made test.","list"));
}
const redraw=()=>{$("#qf").innerHTML=qform();drawList();persist()};

pages.editor=async([loadId,actId])=>{
  const ls=await getDoc(doc(db,"loads",loadId));
  if(!ls.exists()||ls.data().teacherUid!==S.me.uid)return `<div class="card">${empty("Class not found.")}</div>`;
  const ld=ls.data();
  E={loadId,actId:actId||"",sectionId:ld.sectionId,qt:"mc",edit:-1,keep:null,subs:0,meta:{title:"",instr:"",attempts:1,opens:0,closes:0,timeLimit:0,shuffle:true,release:false},qs:[]};
  if(actId){
    const [as,ks,ss]=await Promise.all([getDoc(doc(db,"activities",actId)),getDoc(doc(db,"keys",actId)),list("submissions",where("actId","==",actId))]);
    if(!as.exists()||!ks.exists()||as.data().by!==S.me.uid||as.data().v!==2)return `<div class="card">${empty("This activity cannot be edited (it may be from the old version). Create a new one.")}</div>`;
    const a=as.data(),key=ks.data().ans;E.subs=ss.length;
    E.meta={title:a.title,instr:a.instructions||"",attempts:a.attempts,opens:a.opens||0,closes:a.closes||0,timeLimit:a.timeLimit||0,shuffle:!!a.shuffle,release:!!a.release};
    E.qs=a.questions.map((q,i)=>{const k=key[i],o={t:q.t,p:q.p,pts:q.pts||1};
      if(q.t==="mc"){o.o=q.o;o.a=k}else if(q.t==="tf")o.a=k;else if(q.t==="mt")o.pairs=q.l.map((l,j)=>[l,k[j]]);else o.a=k||"";return o});
  }else{try{const d=JSON.parse(localStorage.getItem(dkey(loadId)));if(d){E.meta={...E.meta,...d.meta};E.qs=d.qs||[]}}catch{}}
  const m=E.meta;
  S.after=()=>{
    const root=$("#ed");
    root.addEventListener("input",persist);
    root.addEventListener("change",ev=>{
      if(ev.target.id==="qt"){E.keep={p:v("qp"),pts:+v("qpts")||1};E.qt=ev.target.value;$("#qf").innerHTML=qform()}
      persist();
    });
    drawList();$("#qf").innerHTML=qform();
  };
  const mv=(id,l,inner)=>`<div><label class="f" for="${id}">${l}</label>${inner}</div>`;
  return head(actId?"Edit activity":"New activity",`${ld.teacherName||""}`,`<a class="btn ghost" href="#/load/${loadId}/activities">← Cancel</a>`)+`<div id="ed">
  ${actId&&E.subs?`<div class="card" style="border-color:#d97706"><b>${E.subs} student(s) have already submitted.</b><p class="mut sm">Their recorded scores will NOT be recalculated if you change questions or answers.</p></div>`:""}
  <div class="card"><h3>Activity settings</h3><div class="g2">
  ${mv("m_title","Title",`<input id="m_title" value="${esc(m.title)}" placeholder="e.g. Quiz 1 – Trigonometric Ratios">`)}
  ${mv("m_att","Attempts allowed (best score kept)",`<select id="m_att">${[1,2,3].map(n=>`<option ${m.attempts==n?"selected":""}>${n}</option>`).join("")}</select>`)}
  ${mv("m_open","Opens (optional)",`<input id="m_open" type="datetime-local" value="${toLocalInput(m.opens)}">`)}
  ${mv("m_close","Closes / deadline (optional)",`<input id="m_close" type="datetime-local" value="${toLocalInput(m.closes)}">`)}
  ${mv("m_time","Time limit in minutes (0 = none)",`<input id="m_time" type="number" min="0" max="300" value="${m.timeLimit}">`)}</div>
  <label class="f" for="m_instr">Instructions for students (optional)</label><textarea id="m_instr" rows="2">${esc(m.instr)}</textarea>
  <label class="f inline"><input type="checkbox" id="m_shuf" ${m.shuffle?"checked":""}> Shuffle questions and choices for each student</label>
  <label class="f inline"><input type="checkbox" id="m_rel" ${m.release?"checked":""}> Show correct answers to students after they submit (you can change this later)</label></div>
  <div class="card"><h3 id="qh">Add a question</h3><div id="qf"></div></div>
  <div class="card"><div id="qlist"></div></div>
  <div class="card"><h3>Import a ready-made test</h3><p class="hint">One question per line: <code>type|question|options|answer|points</code> (points optional). Types: mc, tf, id, sa, mt, es. Separate options and alternative answers with <code>;</code>. For matching, put <code>left=right;left=right</code> in the options part.</p>
  <textarea id="bulk" rows="5" placeholder="mc|Capital of the Philippines?|Manila;Cebu;Davao|Manila&#10;tf|The sum of angles in a triangle is 180°.||True&#10;id|Largest ocean?||Pacific;Pacific Ocean&#10;mt|Match the ratio|Sine=opp/hyp;Cosine=adj/hyp&#10;es|Explain how you solved problem 3."></textarea>
  <p><button class="btn ghost" data-a="qimport">Import questions</button></p></div>
  <div class="card"><h3>Paste a multiple-choice test (auto-graded)</h3>
  <p class="hint">Paste a ready-made test straight from Word or Google Docs. Number each question, label choices A, B, C, D, and give the answer either under each question (<code>Answer: B</code>), by marking the correct choice with *, or in an <code>Answer key:</code> list at the end (<code>1.B 2.C 3.A</code>). Students' answers are checked automatically.</p>
  <textarea id="mcbulk" rows="8" placeholder="1. What is 2 + 2?&#10;A. 3&#10;B. 4&#10;C. 5&#10;Answer: B&#10;&#10;2. Which is a prime number?&#10;A. 9&#10;B. 15&#10;*C. 7&#10;D. 21&#10;&#10;Answer key: 1.B 2.C"></textarea>
  <div class="g2"><div><label class="f" for="mcpts">Points per question</label><input id="mcpts" type="number" min="1" max="100" value="1"></div></div>
  <p><button class="btn" data-a="qmcimport">Add multiple-choice questions</button></p></div>
  <div class="sticky-save"><span class="mut sm" style="flex:1;align-self:center">${actId?"Changes are saved only when you click Save.":"Your draft is kept on this device while you work."}</span><button class="btn" data-a="esave">Save &amp; publish</button></div></div>`;
};

act.qadd=()=>{try{const q=readQ();if(E.edit>=0){E.qs[E.edit]=q;E.edit=-1}else E.qs.push(q);E.keep=null;redraw();toast("Question saved to the list.")}catch(e){toast(e.message,"bad")}};
act.qcancel=()=>{E.edit=-1;redraw()};
act.qedit=el=>{E.edit=+el.dataset.id;E.qt=E.qs[E.edit].t;E.keep=null;$("#qf").innerHTML=qform();$("#qh").scrollIntoView({behavior:"smooth"})};
act.qdel=async el=>{if(await ask("Delete this question?","Delete",true)){E.qs.splice(+el.dataset.id,1);E.edit=-1;redraw()}};
act.qdup=el=>{const i=+el.dataset.id;E.qs.splice(i+1,0,structuredClone(E.qs[i]));redraw()};
act.qup=el=>{const i=+el.dataset.id;if(i>0){[E.qs[i-1],E.qs[i]]=[E.qs[i],E.qs[i-1]];E.edit=-1;redraw()}};
act.qdown=el=>{const i=+el.dataset.id;if(i<E.qs.length-1){[E.qs[i+1],E.qs[i]]=[E.qs[i],E.qs[i+1]];E.edit=-1;redraw()}};
act.qimport=()=>{
  const lines=$("#bulk").value.split("\n").map(s=>s.trim()).filter(Boolean),bad=[];let n=0;
  lines.forEach((l,i)=>{try{
    const [t0,p,o="",a="",pts="1"]=l.split("|").map(s=>s.trim()),t=(t0||"").toLowerCase();
    if(!TYPES[t])throw new Error("unknown type");
    const raw=t==="mc"?{o:o.split(";"),a}:t==="mt"?{pairs:pairsOf(o)}:{a:(t==="id"||t==="sa")?a.split(";").join("|"):a};
    E.qs.push(mk(t,p,pts,raw));n++;
  }catch(e){bad.push(i+1)}});
  $("#bulk").value=bad.length?lines.filter((_,i)=>bad.includes(i+1)).join("\n"):"";
  redraw();toast(`${n} question(s) imported${bad.length?`. Line(s) ${bad.join(", ")} had problems and were left in the box.`:"."}`,bad.length?"bad":"ok");
};

/* parse a pasted multiple-choice test into auto-graded questions */
function parseMC(text,pts){
  const lines=text.replace(/\r/g,"").split("\n").map(s=>s.trim());
  const qs=[],errs=[];let cur=null,keys={},inKey=false;
  const L=c=>c.toUpperCase().charCodeAt(0)-64;
  const flush=()=>{if(!cur)return;qs.push(cur);cur=null};
  for(const l of lines){
    if(!l)continue;
    const km=l.match(/^(?:answer\s*keys?|keys?|answers)\s*[:\-]?\s*(.*)$/i);
    if(km&&(inKey||!cur||!/^answer\s*[:=-]\s*\(?[A-Ha-h]\)?\s*$/i.test(l))&&!/^(?:answer|ans)\s*[:=-]\s*\(?[A-Ha-h]\)?\s*$/i.test(l)){flush();inKey=true;l.replace(/^[^:\-]*[:\-]?/,"");}
    if(inKey){for(const m of l.matchAll(/(\d+)\s*[.):\-]?\s*\(?([A-Ha-h])\)?(?![A-Za-z])/g))keys[+m[1]]=m[2].toUpperCase();continue}
    const am=l.match(/^(?:answer|ans|correct(?:\s*answer)?)\s*[:=-]\s*\(?([A-Ha-h])\)?\b/i);
    if(am&&cur){cur.ans=am[1].toUpperCase();continue}
    const om=l.match(/^(\*?)\s*\(?([A-Ha-h])[.)]\s*(.+?)(\s*(?:\*|✓|✔))?$/);
    if(om&&cur){cur.opts.push(om[3].trim());if(om[1]||om[4])cur.ans=om[2].toUpperCase();cur.letters.push(om[2].toUpperCase());continue}
    const qm=l.match(/^(\d+)\s*[.)]\s*(.+)$/);
    if(qm){flush();cur={n:+qm[1],p:qm[2].trim(),opts:[],letters:[],ans:""};continue}
    if(cur&&!cur.opts.length)cur.p+="\n"+l;
    else if(cur&&cur.opts.length)cur.opts[cur.opts.length-1]+=" "+l;
  }
  flush();
  const out=[];
  qs.forEach((q,i)=>{
    const a=q.ans||keys[q.n]||keys[i+1]||"";
    try{
      if(!a)throw new Error("no answer given");
      const idx=q.letters.indexOf(a);if(idx<0)throw new Error("answer letter not among choices");
      out.push(mk("mc",q.p,pts,{o:q.opts,a:String(idx+1)}));
    }catch(e){errs.push(`Q${q.n}: ${e.message}`)}
  });
  return {out,errs};
}
act.qmcimport=()=>{
  const txt=$("#mcbulk").value.trim();if(!txt)return toast("Paste your test first.","bad");
  const {out,errs}=parseMC(txt,+v("mcpts")||1);
  if(!out.length)return toast(errs.length?"Nothing imported — "+errs.slice(0,3).join("; "):"No questions found. Number each question like “1.” and label choices A, B, C, D.","bad");
  E.qs.push(...out);if(!errs.length)$("#mcbulk").value="";redraw();
  toast(`${out.length} multiple-choice question(s) added${errs.length?`. Skipped: ${errs.slice(0,4).join("; ")}`:""}.`,errs.length?"bad":"ok");
};

act.esave=async el=>{
  readMeta();const m=E.meta;
  if(!m.title)return toast("Give the activity a title.","bad");
  if(!E.qs.length)return toast("Add at least one question.","bad");
  if(m.opens&&m.closes&&m.closes<=m.opens)return toast("The deadline must be after the opening time.","bad");
  el.disabled=true;
  try{
    const salt=newSalt(),questions=[],ans={};
    for(let i=0;i<E.qs.length;i++){const q=E.qs[i],b={t:q.t,p:q.p,pts:q.pts};
      if(q.t==="mc"||q.t==="tf"){b.o=q.o;b.h=[await sha(salt,q.a)];ans[i]=q.a}
      else if(q.t==="id"||q.t==="sa"){const alts=q.a.split("|");b.h=await Promise.all(alts.map(x=>sha(salt,x)));ans[i]=q.a}
      else if(q.t==="mt"){b.l=q.pairs.map(p=>p[0]);b.r=shuffle([...new Set(q.pairs.map(p=>p[1]))]);b.h=await Promise.all(q.pairs.map(p=>sha(salt,p[1])));ans[i]=q.pairs.map(p=>p[1])}
      else ans[i]=q.a||"";
      questions.push(b)}
    const hasEssay=E.qs.some(q=>q.t==="es"),autoTotal=E.qs.filter(q=>q.t!=="es").reduce((n,q)=>n+qMax(q),0),manualMax=E.qs.filter(q=>q.t==="es").reduce((n,q)=>n+qMax(q),0);
    const data={v:2,loadId:E.loadId,sectionId:E.sectionId,title:m.title,instructions:m.instr,attempts:hasEssay?1:m.attempts,opens:m.opens,closes:m.closes,timeLimit:m.timeLimit,shuffle:m.shuffle,release:m.release,
      questions,salt,totalPts:autoTotal+manualMax,autoTotal,manualMax,hasEssay,updatedAt:serverTimestamp()};
    const ref=E.actId?doc(db,"activities",E.actId):doc(collection(db,"activities")),b=writeBatch(db);
    if(E.actId)b.update(ref,data);else b.set(ref,{...data,by:S.me.uid,at:serverTimestamp()});
    b.set(doc(db,"keys",ref.id),{by:S.me.uid,loadId:E.loadId,sectionId:E.sectionId,ans});
    await b.commit();
    try{localStorage.removeItem(dkey(E.loadId))}catch{}
    log((E.actId?"updated":"posted")+" activity "+m.title);toast(E.actId?"Activity updated.":"Activity published to students.");go(`load/${E.loadId}/activities`);
  }catch(e){el.disabled=false;toast(errMsg(e),"bad")}
};

/* ---------- manual grading (essays) ---------- */
pages.grade=async([id])=>{
  const as=await getDoc(doc(db,"activities",id));
  if(!as.exists()||as.data().by!==S.me.uid)return `<div class="card">${empty("Activity not found.")}</div>`;
  const a={id,...as.data()},[subs,ks,studs]=await Promise.all([list("submissions",where("actId","==",id)),getDoc(doc(db,"keys",id)),studentsFor([a.sectionId])]);
  const key=ks.exists()?ks.data().ans:{},ess=a.questions.map((q,i)=>({q,i})).filter(x=>x.q.t==="es");
  subs.sort((x,y)=>(x.graded===false?0:1)-(y.graded===false?0:1));
  return head("Grade: "+a.title,`${subs.length} submission(s)`,`<a class="btn ghost" href="#/load/${a.loadId}/activities">← Back</a>`)+
  (ess.length?subs.map(s=>`<div class="card" data-sub="${s.id}"><div class="row between"><b>${esc(studs.find(u=>u.id===s.uid)?.name||s.alias||"Student")}</b>${s.graded===false?badge("Needs grading","warn"):badge("Graded: "+(s.manualTotal||0)+"/"+a.manualMax,"ok")}</div>
    <p class="mut sm">Auto-scored part: ${s.best}/${a.autoTotal} · switched tabs ${s.tabSwitches||0} time(s)</p>
    ${ess.map(({q,i})=>`<div class="item" style="align-items:flex-start"><div style="flex:1;min-width:240px"><b>${i+1}. ${esc(q.p)}</b><p style="white-space:pre-wrap">${esc(s.answers?.[i]||"(blank)")}</p>${key[i]?`<div class="mut sm">Rubric: ${esc(key[i])}</div>`:""}</div>
    <div style="width:120px"><label class="f" for="g_${s.id}_${i}">Points / ${qMax(q)}</label><input id="g_${s.id}_${i}" type="number" min="0" max="${qMax(q)}" step="0.5" value="${s.manual?.[i]??""}"></div></div>`).join("")}
    <p><button class="btn" data-a="savegrade" data-id="${s.id}" data-act="${id}">Save grade</button></p></div>`).join("")||`<div class="card">${empty("No submissions yet.")}</div>`:`<div class="card">${empty("This activity has no essay items.")}</div>`);
};
act.savegrade=async el=>{
  const sid=el.dataset.id,a=(await getDoc(doc(db,"activities",el.dataset.act))).data(),manual={};let sum=0;
  for(let i=0;i<a.questions.length;i++){const q=a.questions[i];if(q.t!=="es")continue;
    const raw=$(`#g_${sid}_${i}`).value;if(raw==="")return toast("Enter points for every essay item (0 if none).","bad");
    const p=+raw;if(isNaN(p)||p<0||p>qMax(q))return toast(`Points for item ${i+1} must be between 0 and ${qMax(q)}.`,"bad");manual[i]=p;sum+=p}
  await updateDoc(doc(db,"submissions",sid),{manual,manualTotal:sum,graded:true,gradedAt:serverTimestamp()});
  log("graded submission "+sid);toast("Grade saved.");refreshGrade(el.dataset.act);
};
const refreshGrade=id=>go("grade/"+id);

/* ---------- advisory ---------- */
pages.advisory=async([sid])=>{
  if(!S.advSecs.length)return `<div class="card">${empty("You are not an adviser. The administrator assigns advisers.","users")}</div>`;
  const sec=S.advSecs.find(s=>s.id===sid)||S.advSecs[0];
  const [users,loads,subjects,subs]=await Promise.all([list("users",where("sectionId","==",sec.id)),list("loads",where("sectionId","==",sec.id)),list("subjects"),list("submissions",where("sectionId","==",sec.id))]);
  const studs=users.filter(u=>u.role==="student"),pending=studs.filter(u=>u.status==="pending"),ok=studs.filter(u=>u.status==="approved").sort(byName);
  const cols=loads.map(l=>({id:l.id,n:subjects.find(s=>s.id===l.subjectId)?.name||"?"}));
  const av=(uid,lid)=>mean(subs.filter(s=>s.uid===uid&&s.loadId===lid&&counted(s)).map(sp));
  const rows=ok.map(s=>{const vals=cols.map(c=>av(s.id,c.id)),got=vals.filter(x=>x!=null);return {s,vals,gen:mean(got)}});
  S.tmp={name:`${sec.name}-consolidated-grades.csv`,rows:[["Student","LRN",...cols.map(c=>c.n),"General average"],...rows.map(r=>[r.s.name,r.s.lrn||"",...r.vals.map(x=>x??""),r.gen??""])]};
  return head("Advisory – "+sec.name,`${ok.length} enrolled student(s)`)+
  (S.advSecs.length>1?`<div class="row" style="margin-bottom:12px">${S.advSecs.map(s=>`<a class="btn sm ${s.id===sec.id?"":"ghost"}" href="#/advisory/${s.id}">${esc(s.name)}</a>`).join("")}</div>`:"")+
  `<div class="card"><h3>Pending student approvals</h3>${tbl(["Name","LRN","Email",""],pending.map(x=>[esc(x.name),esc(x.lrn||"–"),esc(x.email),btn("apvstu","Approve",x.id,"ok")]),"No pending students.")}</div>
  <div class="card"><div class="row between"><h3>Consolidated grades</h3><button class="btn ghost" data-a="csvrec">${ic("file")} Export CSV</button></div>
  ${tbl(["Student",...cols.map(c=>esc(c.n)),"General avg"],rows.map(r=>[esc(r.s.name),...r.vals.map(fm),`<b>${fm(r.gen)}</b>`]),"No approved students yet.","rec")}
  <p class="hint">Averages use each student's best graded score per activity. Missing work is not counted as zero.</p></div>`;
};
act.apvstu=async el=>{await updateDoc(doc(db,"users",el.dataset.id),{status:"approved"});log("approved student "+el.dataset.id);toast("Student approved.");refresh()};

pages.announcements=async()=>head("Announcements","From the school administration")+await annHtml(30);
