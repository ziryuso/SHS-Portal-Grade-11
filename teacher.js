import {imgToData,readDocx} from "./docx.js";
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
  /* classwork tab: grouped by topic, like Google Classroom */
  const state=a=>a.draft?["Draft","mut"]:a.opens&&Date.now()<a.opens?["Scheduled","info"]:a.closes&&Date.now()>a.closes?["Closed","bad"]:["Open","ok"];
  const groups={};c.acts.forEach(a=>(groups[a.topic||""]??=[]).push(a));
  const tkeys=Object.keys(groups).sort((x,y)=>!x?1:!y?-1:x.localeCompare(y));
  const card=a=>{const ss=c.subs.filter(s=>s.actId===a.id),tg=ss.filter(s=>s.graded===false).length,[sl,sk]=state(a);
    return `<div class="item cw"><div style="flex:1;min-width:220px"><b>${esc(a.title)}</b> ${badge(sl,sk)}${a.release?" "+badge("Answers released","ok"):""}
    <div class="mut sm">${a.questions.length} items · ${a.totalPts} pts · ${a.attempts} attempt(s)${a.timeLimit?" · "+a.timeLimit+" min":""} · ${a.closes?"Due "+fdate(a.closes):"No deadline"}${a.opens&&Date.now()<a.opens?" · Opens "+fdate(a.opens):""}</div>
    ${a.draft?"":`<div class="sm"><b>${new Set(ss.map(s=>s.uid)).size}</b> of ${c.studs.length} turned in · Avg <b>${fm(mean(ss.filter(counted).map(sp)))}</b>${tg?` · <a href="#/grade/${a.id}">${badge(tg+" to grade","warn")}</a>`:""}</div>`}</div>
    <div class="row"><a class="btn sm" href="#/editor/${id}/${a.id}">Edit</a>${a.hasEssay?`<a class="btn sm ghost" href="#/grade/${a.id}">Grade</a>`:""}${btn("relact",a.release?"Hide answers":"Release answers",a.id,"ghost")}${btn("dupact","Duplicate",a.id,"ghost")}${btn("delact","Delete",a.id,"danger")}</div></div>`};
  return hd+`<div class="row between" style="margin-bottom:10px"><span class="mut sm">${c.acts.length} item(s) · ${c.acts.filter(a=>a.draft).length} draft(s)</span><a class="btn" href="#/editor/${id}">+ Create activity</a></div>`+
  (tkeys.map(t=>`<div class="card"><h3>${t?esc(t):"No topic"}</h3>${groups[t].sort((x,y)=>(x.draft?0:1)-(y.draft?0:1)||ts(y.at)-ts(x.at)).map(card).join("")}</div>`).join("")||`<div class="card">${empty("No activities yet. Click “Create activity”.")}</div>`);
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
  b.set(ref,{...a.data(),title:a.data().title+" (copy)",draft:true,opens:0,closes:0,release:false,at:serverTimestamp(),updatedAt:serverTimestamp()});
  b.set(doc(db,"keys",ref.id),k.data());await b.commit();toast("Duplicated. It is saved as a draft — edit it to publish.");location.reload();
};

/* ---------- activity editor ---------- */
let E=null;
const TYPES={mc:"Multiple choice",tf:"True / False",id:"Identification",sa:"Short answer",mt:"Matching",es:"Essay (teacher graded)"};
const dkey=lid=>"edraft2:"+S.me.uid+":"+lid;

function mk(t,p,pts,{o=[],a="",pairs=[],img=""}){
  if(!p)throw new Error("Type the question first.");
  const q={t,p,pts:Math.max(1,Math.min(100,parseInt(pts)||1))};
  if(t==="mc"){o=[...new Set(o.map(s=>s.trim()).filter(Boolean))];if(o.length<2||o.length>8)throw new Error("Multiple choice needs 2–8 different options.");
    let c=a.trim();if(/^\d+$/.test(c)&&+c>=1&&+c<=o.length)c=o[+c-1];
    const f=o.find(x=>norm(x)===norm(c));if(!f)throw new Error("The correct option must match one of the options.");q.o=o;q.a=f}
  else if(t==="tf"){const x=norm(a);q.a=x==="true"||x==="t"?"True":x==="false"||x==="f"?"False":"";if(!q.a)throw new Error("Choose True or False.");q.o=["True","False"]}
  else if(t==="id"||t==="sa"){const alts=a.split("|").map(s=>s.trim()).filter(Boolean);if(!alts.length)throw new Error("Enter at least one accepted answer.");q.a=alts.join("|")}
  else if(t==="mt"){pairs=pairs.filter(x=>x[0]&&x[1]);if(pairs.length<2)throw new Error("Matching needs at least 2 pairs written as left=right.");q.pairs=pairs}
  else q.a=a.trim();
  if(img)q.img=img;
  return q;
}
const pairsOf=txt=>txt.split(/\n|;/).map(l=>{const i=l.indexOf("=");return i<0?["",""]:[l.slice(0,i).trim(),l.slice(i+1).trim()]});
const sumQ=q=>q.t==="mc"?q.o.map(o=>o===q.a?`<b class="ok">${esc(o)} ✓</b>`:esc(o)).join(" · "):q.t==="tf"?"Answer: "+q.a:q.t==="mt"?q.pairs.map(p=>esc(p[0])+" → "+esc(p[1])).join(" · "):q.t==="es"?"Graded by you"+(q.a?" · rubric saved":""):"Accepted: "+esc(q.a.split("|").join(" / "));

const imgBox=()=>`<div id="qimgbox" class="imgbox">${E.qimg?`<img class="qimg" src="${E.qimg}" alt=""><button class="btn sm danger" data-a="qimgrm" type="button">Remove picture</button>`:`<label class="btn sm ghost" for="qimgf">${ic("file")} Add picture (shown above the choices)</label>`}<input id="qimgf" type="file" accept="image/*" hidden></div>`;
function qform(){
  const q=E.keep||(E.edit>=0?E.qs[E.edit]:{}),t=E.qt;E.keep=null;E.qimg=q.img||"";
  let x="";
  if(t==="mc")x=`<label class="f" for="qo">Options (one per line, 2–8)</label><textarea id="qo" rows="4">${esc((q.o||[]).join("\n"))}</textarea><label class="f" for="qa">Correct option (its number or exact text)</label><input id="qa" value="${esc(q.t==="mc"?q.a||"":"")}">`;
  else if(t==="tf")x=`<label class="f" for="qa">Correct answer</label><select id="qa"><option>True</option><option ${q.a==="False"?"selected":""}>False</option></select>`;
  else if(t==="id"||t==="sa")x=`<label class="f" for="qa">Accepted answer(s) — separate alternatives with |</label><input id="qa" value="${esc(q.t==="id"||q.t==="sa"?q.a||"":"")}" placeholder="Manila|Maynila"><p class="hint">Answers are not case-sensitive and extra spaces are ignored.</p>`;
  else if(t==="mt")x=`<label class="f" for="qm">Pairs (one per line: left=right)</label><textarea id="qm" rows="4" placeholder="Sine=opposite/hypotenuse&#10;Cosine=adjacent/hypotenuse">${esc((q.pairs||[]).map(p=>p.join("=")).join("\n"))}</textarea><p class="hint">Students see the right-hand items shuffled in a dropdown.</p>`;
  else x=`<label class="f" for="qa">Model answer / rubric (optional, shown to students when you release answers)</label><textarea id="qa" rows="3">${esc(q.t==="es"?q.a||"":"")}</textarea><p class="hint">Essay items are graded by you. Activities with essays allow only 1 attempt.</p>`;
  return `<div class="g2"><div><label class="f" for="qt">Type</label><select id="qt">${Object.entries(TYPES).map(([k,l])=>`<option value="${k}" ${k===t?"selected":""}>${l}</option>`).join("")}</select></div>
  <div><label class="f" for="qpts">Points${t==="mt"?" (per pair)":""}</label><input id="qpts" type="number" min="1" max="100" value="${q.pts||1}"></div></div>
  <label class="f" for="qp">Question</label><textarea id="qp" rows="2">${esc(q.p||"")}</textarea>${imgBox()}${x}
  <p class="row"><button class="btn" data-a="qadd">${E.edit>=0?"Update question":"Add question"}</button>${E.edit>=0?`<button class="btn ghost" data-a="qcancel">Cancel edit</button>`:""}</p>`;
}
function readQ(){
  const t=E.qt,raw={};
  if(t==="mc"){raw.o=$("#qo").value.split("\n");raw.a=v("qa")}
  else if(t==="mt")raw.pairs=pairsOf($("#qm").value);
  else raw.a=t==="es"?$("#qa").value:v("qa");
  raw.img=E.qimg;return mk(t,v("qp"),v("qpts"),raw);
}
function readMeta(){
  const m=E.meta;m.title=v("m_title");m.instr=$("#m_instr").value.trim();m.attempts=+v("m_att")||1;m.opens=fromLocalInput(v("m_open"));m.closes=fromLocalInput(v("m_close"));
  m.timeLimit=Math.max(0,parseInt(v("m_time"))||0);m.shuffle=$("#m_shuf").checked;m.release=$("#m_rel").checked;m.topic=v("m_topic");m.links=parseLinks($("#m_links").value);
}
const parseLinks=t=>t.split("\n").map(l=>l.trim()).filter(Boolean).map(l=>{const m=l.match(/^(.*?)[\s|]*(https?:\/\/\S+)$/);return m?{t:m[1].trim().slice(0,80),u:m[2]}:null}).filter(Boolean).slice(0,6);
const persist=()=>{if(E.actId)return;try{readMeta();localStorage.setItem(dkey(E.loadId),JSON.stringify({meta:E.meta,qs:E.qs}))}catch{}};
function drawList(){
  const tot=E.qs.reduce((n,q)=>n+qMax(q),0);
  $("#qlist").innerHTML=`<div class="row between"><h3>Questions (${E.qs.length}) · ${tot} points</h3></div>`+(E.qs.map((q,i)=>`<div class="qrow"><div class="txt"><b>${i+1}.</b> ${badge(TYPES[q.t],"info")} ${badge(qMax(q)+" pt","mut")}<div>${esc(q.p)}</div>${q.img?`<img class="qimg thumb" src="${q.img}" alt="">`:""}<div class="mut sm">${sumQ(q)}</div></div>
  <div class="acts">${btn("qup","↑",i,"ghost",i?"":"disabled")}${btn("qdown","↓",i,"ghost",i<E.qs.length-1?"":"disabled")}${btn("qedit","Edit",i,"ghost")}${btn("qdup","Copy",i,"ghost")}${btn("qdel","Delete",i,"danger")}</div></div>`).join("")||empty("No questions yet. Add them above or import a ready-made test.","list"));
}
async function loadImg(inp){
  const f=inp.files[0];if(!f)return;
  try{const d=await imgToData(f,800);if(d.length>260000)throw new Error("That picture is too big. Use a smaller one.");E.qimg=d;$("#qimgbox").outerHTML=imgBox()}
  catch(e){toast(e.message||"Could not read that picture.","bad");inp.value=""}
}
act.qimgrm=()=>{E.qimg="";$("#qimgbox").outerHTML=imgBox()};
const redraw=()=>{$("#qf").innerHTML=qform();drawList();persist()};

pages.editor=async([loadId,actId])=>{
  const ls=await getDoc(doc(db,"loads",loadId));
  if(!ls.exists()||ls.data().teacherUid!==S.me.uid)return `<div class="card">${empty("Class not found.")}</div>`;
  const ld=ls.data();
  E={loadId,actId:actId||"",sectionId:ld.sectionId,qt:"mc",edit:-1,keep:null,subs:0,meta:{title:"",instr:"",attempts:1,opens:0,closes:0,timeLimit:0,shuffle:true,release:false,topic:"",links:[],draft:false},qs:[],qimg:"",tab:"type"};
  if(actId){
    const [as,ks,ss]=await Promise.all([getDoc(doc(db,"activities",actId)),getDoc(doc(db,"keys",actId)),list("submissions",where("actId","==",actId))]);
    if(!as.exists()||!ks.exists()||as.data().by!==S.me.uid||as.data().v!==2)return `<div class="card">${empty("This activity cannot be edited (it may be from the old version). Create a new one.")}</div>`;
    const a=as.data(),key=ks.data().ans;E.subs=ss.length;
    E.meta={title:a.title,instr:a.instructions||"",attempts:a.attempts,opens:a.opens||0,closes:a.closes||0,timeLimit:a.timeLimit||0,shuffle:!!a.shuffle,release:!!a.release,topic:a.topic||"",links:a.links||[],draft:!!a.draft};
    E.qs=a.questions.map((q,i)=>{const k=key[i],o={t:q.t,p:q.p,pts:q.pts||1};if(q.img)o.img=q.img;
      if(q.t==="mc"){o.o=q.o;o.a=k}else if(q.t==="tf")o.a=k;else if(q.t==="mt")o.pairs=q.l.map((l,j)=>[l,k[j]]);else o.a=k||"";return o});
  }else{try{const d=JSON.parse(localStorage.getItem(dkey(loadId)));if(d){E.meta={...E.meta,...d.meta};E.qs=d.qs||[]}}catch{}}
  const m=E.meta;
  S.after=()=>{
    const root=$("#ed");
    root.addEventListener("input",persist);
    root.addEventListener("change",ev=>{
      if(ev.target.id==="qt"){E.keep={p:v("qp"),pts:+v("qpts")||1,img:E.qimg};E.qt=ev.target.value;$("#qf").innerHTML=qform()}
      if(ev.target.id==="qimgf")return loadImg(ev.target);
      if(ev.target.id==="docf")return importDoc(ev.target);
      persist();
    });
    drawList();$("#qf").innerHTML=qform();
  };
  const mv=(id,l,inner)=>`<div><label class="f" for="${id}">${l}</label>${inner}</div>`;
  const topics=[...new Set((await list("activities",where("loadId","==",loadId))).map(a=>a.topic).filter(Boolean))].sort();
  const pane=(k,l)=>`<button type="button" id="tab_${k}" class="seg ${E.tab===k?"on":""}" data-a="etab" data-id="${k}">${l}</button>`;
  return head(actId?"Edit activity":"Create activity",`${ld.teacherName||""}`,`<a class="btn ghost" href="#/load/${loadId}/activities">← Back</a>`)+`<div id="ed">
  ${actId&&E.subs?`<div class="card" style="border-color:#d97706"><b>${E.subs} student(s) have already submitted.</b><p class="mut sm">Their recorded scores will NOT be recalculated if you change questions or answers.</p></div>`:""}
  <div class="card"><h3>1 · Details</h3>
  ${mv("m_title","Title",`<input id="m_title" value="${esc(m.title)}" placeholder="e.g. Quiz 1 – Trigonometric Ratios">`)}
  <div class="g2">${mv("m_topic","Topic (groups activities, optional)",`<input id="m_topic" list="topics" value="${esc(m.topic)}" placeholder="e.g. Unit 7 – Trigonometry"><datalist id="topics">${topics.map(t=>`<option value="${esc(t)}">`).join("")}</datalist>`)}
  ${mv("m_att","Attempts allowed (best score kept)",`<select id="m_att">${[1,2,3].map(n=>`<option ${m.attempts==n?"selected":""}>${n}</option>`).join("")}</select>`)}</div>
  <label class="f" for="m_instr">Instructions (optional)</label><textarea id="m_instr" rows="2">${esc(m.instr)}</textarea>
  <label class="f" for="m_links">Attach modules / Learning Activity Sheets (optional — one per line: Title https://drive.google.com/…)</label><textarea id="m_links" rows="2" placeholder="Module 3 https://drive.google.com/…">${esc((m.links||[]).map(l=>(l.t?l.t+" ":"")+l.u).join("\n"))}</textarea>
  <p class="hint">In Google Drive set sharing to “Anyone with the link can view”.</p></div>
  <div class="card"><h3>2 · Questions</h3>
  <div class="segs">${pane("type","Type questions")}${pane("word","Upload Word file")}${pane("paste","Paste text")}</div>
  <div id="pane_type" ${E.tab==="type"?"":"hidden"}><div id="qf"></div></div>
  <div id="pane_word" ${E.tab==="word"?"":"hidden"}>
    <p class="hint">Upload a <b>.docx</b> test. Number each question (1. 2. 3.), label choices A, B, C, D, and show the answer by making the correct choice <b>bold or underlined</b>, putting <code>*</code> before it, writing <code>Answer: B</code> under the question, or adding an <code>Answer key: 1.B 2.C</code> list at the end. Pictures placed with a question are kept and shown above its choices.</p>
    <div class="g2"><div><label class="f" for="docpts">Points per question</label><input id="docpts" type="number" min="1" max="100" value="1"></div>
    <div><label class="f" for="docf">Word file</label><input id="docf" type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"></div></div>
    <p id="docmsg" class="sm" aria-live="polite"></p></div>
  <div id="pane_paste" ${E.tab==="paste"?"":"hidden"}>
    <p class="hint">Paste from Word or Google Docs. Number each question, label choices A, B, C, D, and give the answer under each question (<code>Answer: B</code>), mark the correct choice with *, or add an <code>Answer key:</code> list at the end.</p>
    <textarea id="mcbulk" rows="8" placeholder="1. What is 2 + 2?&#10;A. 3&#10;B. 4&#10;C. 5&#10;Answer: B&#10;&#10;2. Which is a prime number?&#10;A. 9&#10;B. 15&#10;*C. 7&#10;D. 21"></textarea>
    <div class="g2"><div><label class="f" for="mcpts">Points per question</label><input id="mcpts" type="number" min="1" max="100" value="1"></div></div>
    <p><button class="btn" data-a="qmcimport">Add multiple-choice questions</button></p>
    <details class="alt"><summary>Advanced: one-line format for other question types</summary><p class="hint"><code>type|question|options|answer|points</code>. Types: mc, tf, id, sa, mt, es. Separate options and alternative answers with <code>;</code>. Matching: <code>left=right;left=right</code>.</p>
    <textarea id="bulk" rows="4" placeholder="mc|Capital of the Philippines?|Manila;Cebu;Davao|Manila&#10;tf|The sum of angles in a triangle is 180°.||True&#10;id|Largest ocean?||Pacific;Pacific Ocean"></textarea><p><button class="btn ghost" data-a="qimport">Import lines</button></p></details></div>
  <div id="qlist" style="margin-top:14px"></div></div>
  <div class="card"><h3>3 · Schedule &amp; settings</h3><div class="g2">
  ${mv("m_open","Opens (optional)",`<input id="m_open" type="datetime-local" value="${toLocalInput(m.opens)}">`)}
  ${mv("m_close","Due / closes (optional)",`<input id="m_close" type="datetime-local" value="${toLocalInput(m.closes)}">`)}
  ${mv("m_time","Time limit in minutes (0 = none)",`<input id="m_time" type="number" min="0" max="300" value="${m.timeLimit}">`)}</div>
  <label class="f inline"><input type="checkbox" id="m_shuf" ${m.shuffle?"checked":""}> Shuffle questions and choices for each student</label>
  <label class="f inline"><input type="checkbox" id="m_rel" ${m.release?"checked":""}> Show correct answers to students after they submit (changeable later)</label></div>
  <div class="sticky-save"><span class="mut sm" style="flex:1;align-self:center">${actId?"Changes are saved only when you click a button.":"Your draft is also kept on this device while you work."}</span>
  ${actId&&!m.draft?`<button class="btn ghost" data-a="esave" data-draft="1">Move to drafts</button><button class="btn" data-a="esave" data-draft="0">Save changes</button>`:`<button class="btn ghost" data-a="esave" data-draft="1">Save draft</button><button class="btn" data-a="esave" data-draft="0">Publish</button>`}</div></div>`;
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
function parseMC(input,pts){
  const lines=(typeof input==="string"?input.replace(/\r/g,"").split("\n").map(t=>({text:t.trim()})):input.map(o=>({...o,text:o.text.trim()})));
  const qs=[],errs=[];let cur=null,keys={},inKey=false,pend="";
  const L=c=>c.toUpperCase().charCodeAt(0)-64;
  const flush=()=>{if(!cur)return;qs.push(cur);cur=null};
  for(const ln of lines){
    const l=ln.text;
    if(ln.imgs?.length){const startsQ=/^\d+\s*[.)]\s*\S/.test(l);if(!startsQ&&cur&&!cur.opts.length&&!cur.img)cur.img=ln.imgs[0];else pend=ln.imgs[0]}
    if(!l)continue;
    const km=l.match(/^(?:answer\s*keys?|keys?|answers)\s*[:\-]?\s*(.*)$/i);
    if(km&&(inKey||!cur||!/^answer\s*[:=-]\s*\(?[A-Ha-h]\)?\s*$/i.test(l))&&!/^(?:answer|ans)\s*[:=-]\s*\(?[A-Ha-h]\)?\s*$/i.test(l)){flush();inKey=true;l.replace(/^[^:\-]*[:\-]?/,"");}
    if(inKey){for(const m of l.matchAll(/(\d+)\s*[.):\-]?\s*\(?([A-Ha-h])\)?(?![A-Za-z])/g))keys[+m[1]]=m[2].toUpperCase();continue}
    const am=l.match(/^(?:answer|ans|correct(?:\s*answer)?)\s*[:=-]\s*\(?([A-Ha-h])\)?\b/i);
    if(am&&cur){cur.ans=am[1].toUpperCase();continue}
    const om=l.match(/^(\*?)\s*\(?([A-Ha-h])[.)]\s*(.+?)(\s*(?:\*|✓|✔))?$/);
    if(om&&cur){cur.opts.push(om[3].trim());if(om[1]||om[4])cur.ans=om[2].toUpperCase();else if(ln.hl)cur.hl.push(om[2].toUpperCase());cur.letters.push(om[2].toUpperCase());continue}
    const qm=l.match(/^(\d+)\s*[.)]\s*(.+)$/);
    if(qm){flush();cur={n:+qm[1],p:qm[2].trim(),opts:[],letters:[],ans:"",hl:[],img:pend};pend="";continue}
    if(cur&&!cur.opts.length)cur.p+="\n"+l;
    else if(cur&&cur.opts.length)cur.opts[cur.opts.length-1]+=" "+l;
  }
  flush();
  const out=[];
  qs.forEach((q,i)=>{
    const a=q.ans||keys[q.n]||keys[i+1]||(q.hl.length===1?q.hl[0]:"");
    try{
      if(!a)throw new Error("no answer given");
      const idx=q.letters.indexOf(a);if(idx<0)throw new Error("answer letter not among choices");
      out.push(mk("mc",q.p,pts,{o:q.opts,a:String(idx+1),img:q.img}));
    }catch(e){errs.push(`Q${q.n} (${e.message})`)}
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

async function importDoc(inp){
  const f=inp.files[0];inp.value="";if(!f)return;
  const msg=$("#docmsg");
  if(!/\.docx$/i.test(f.name)){msg.innerHTML=`<span class="bad">Please choose a .docx file. In Word: File → Save As → Word Document (.docx).</span>`;return}
  msg.textContent="Reading your Word file…";
  try{
    const {lines,warns}=await readDocx(f),{out,errs}=parseMC(lines,Math.max(1,+v("docpts")||1));
    if(!out.length){msg.innerHTML=`<span class="bad">No questions found. Number each question (1. 2. 3.), label choices A–D, and mark the correct choice (bold, underline, *, or an Answer line).</span>${errs.length?`<div class="sm">${esc(errs.slice(0,4).join("; "))}</div>`:""}`;return}
    E.qs.push(...out);redraw();
    msg.innerHTML=`<b class="ok">${out.length} question(s) added</b> (${out.filter(q=>q.img).length} with pictures). Review them in the list below.${errs.length?`<div class="bad sm">Not added — no answer found: ${esc(errs.join("; "))}. Mark the answer in your Word file and upload again, or type those items manually.</div>`:""}${warns.length?`<div class="sm">${esc(warns.join(" "))}</div>`:""}`;
  }catch(e){msg.innerHTML=`<span class="bad">${esc(e.message||"Could not read that file.")}</span>`}
}
act.etab=el=>{E.tab=el.dataset.id;["type","word","paste"].forEach(k=>{$("#pane_"+k).hidden=k!==E.tab;$("#tab_"+k).classList.toggle("on",k===E.tab)})};
act.esave=async el=>{
  readMeta();const m=E.meta;
  if(!m.title)return toast("Give the activity a title.","bad");
  const draft=el.dataset.draft==="1";
  if(!E.qs.length&&!draft)return toast("Add at least one question.","bad");
  if(m.opens&&m.closes&&m.closes<=m.opens)return toast("The deadline must be after the opening time.","bad");
  el.disabled=true;
  try{
    const salt=newSalt(),questions=[],ans={};
    for(let i=0;i<E.qs.length;i++){const q=E.qs[i],b={t:q.t,p:q.p,pts:q.pts};if(q.img)b.img=q.img;
      if(q.t==="mc"||q.t==="tf"){b.o=q.o;b.h=[await sha(salt,q.a)];ans[i]=q.a}
      else if(q.t==="id"||q.t==="sa"){const alts=q.a.split("|");b.h=await Promise.all(alts.map(x=>sha(salt,x)));ans[i]=q.a}
      else if(q.t==="mt"){b.l=q.pairs.map(p=>p[0]);b.r=shuffle([...new Set(q.pairs.map(p=>p[1]))]);b.h=await Promise.all(q.pairs.map(p=>sha(salt,p[1])));ans[i]=q.pairs.map(p=>p[1])}
      else ans[i]=q.a||"";
      questions.push(b)}
    const hasEssay=E.qs.some(q=>q.t==="es"),autoTotal=E.qs.filter(q=>q.t!=="es").reduce((n,q)=>n+qMax(q),0),manualMax=E.qs.filter(q=>q.t==="es").reduce((n,q)=>n+qMax(q),0);
    const data={v:2,loadId:E.loadId,sectionId:E.sectionId,title:m.title,instructions:m.instr,attempts:hasEssay?1:m.attempts,opens:m.opens,closes:m.closes,timeLimit:m.timeLimit,shuffle:m.shuffle,release:m.release,topic:m.topic,links:m.links,draft,
      questions,salt,totalPts:autoTotal+manualMax,autoTotal,manualMax,hasEssay,updatedAt:serverTimestamp()};
    if(JSON.stringify(data).length>900000)throw new Error("This activity has too many or too large pictures. Remove a few pictures or use smaller ones.");
    const ref=E.actId?doc(db,"activities",E.actId):doc(collection(db,"activities")),b=writeBatch(db);
    if(E.actId)b.update(ref,data);else b.set(ref,{...data,by:S.me.uid,at:serverTimestamp()});
    b.set(doc(db,"keys",ref.id),{by:S.me.uid,loadId:E.loadId,sectionId:E.sectionId,ans});
    await b.commit();
    try{localStorage.removeItem(dkey(E.loadId))}catch{}
    log((E.actId?"updated":"posted")+" activity "+m.title);toast(draft?"Saved as draft. Students cannot see it yet.":E.actId?"Activity updated.":"Activity published to students.");go(`load/${E.loadId}/activities`);
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
    ${ess.map(({q,i})=>`<div class="item" style="align-items:flex-start"><div style="flex:1;min-width:240px"><b>${i+1}. ${esc(q.p)}</b>${q.img?`<img class="qimg thumb" src="${q.img}" alt="">`:""}<p style="white-space:pre-wrap">${esc(s.answers?.[i]||"(blank)")}</p>${key[i]?`<div class="mut sm">Rubric: ${esc(key[i])}</div>`:""}</div>
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
