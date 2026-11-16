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
const mini=(label,value,icon,tone="")=>`<div class="stat ${tone}"><div class="si">${ic(icon)}</div><div><div class="sv">${value}</div><div class="sl">${esc(label)}</div></div></div>`;
/* small pop-up form used for topics, announcements and materials */
const fdlg=(title,fields,ok="Save",chk)=>new Promise(res=>{
  const d=document.createElement("dialog");d.className="modal";
  d.innerHTML=`<h3>${esc(title)}</h3>${fields.map(f=>`<label class="f" for="fd_${f.k}">${esc(f.l)}</label>${f.ta?`<textarea id="fd_${f.k}" rows="3"></textarea>`:`<input id="fd_${f.k}" ${f.type?`type="${f.type}"`:""} placeholder="${esc(f.ph||"")}">`}`).join("")}<p class="bad sm" id="fd_err" role="alert"></p><div class="end"><button class="btn ghost" value="0">Cancel</button><button class="btn" value="1">${esc(ok)}</button></div>`;
  let done=false;const fin=r=>{if(done)return;done=true;d.close();d.remove();res(r)};
  d.addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;
    if(b.value!=="1")return fin(null);
    const o={};for(const f of fields)o[f.k]=d.querySelector("#fd_"+f.k).value.trim();
    const bad=fields.find(f=>f.req&&!o[f.k]);const m=bad?bad.l+" is required.":(chk?chk(o):"");
    if(m){d.querySelector("#fd_err").textContent=m;return}
    fin(o)});
  d.addEventListener("cancel",e=>{e.preventDefault();fin(null)});
  document.body.append(d);d.showModal();d.querySelector("input,textarea")?.focus();
});
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
  <div class="card"><h3>Overview</h3><div class="statgrp">${mini("My classes",loads.length,"book")}${mini("Students",studs.length,"users")}${mini("Activities",acts.length,"list")}${mini("Submissions",subs.length,"check","ok")}${mini("To grade",toGrade.length,"clock",toGrade.length?"warn":"ok")}${mini("Average score",fm(mean(gs.map(sp))),"star")}</div></div>
  <div class="cols"><div class="card"><h3>Class performance</h3>${loads.map(l=>{const ss=subs.filter(s=>s.loadId===l.id&&counted(s)),a=mean(ss.map(sp));
    return `<div class="item"><div style="flex:1;min-width:160px"><b>${esc(l.sn)}</b> <span class="mut sm">${esc(l.sec)}</span>${bar(a||0,a!=null&&a<75?"warn":"ok")}</div><b>${fm(a)}</b></div>`}).join("")||empty("No subject loads yet. The administrator assigns loads.","book")}</div>
  <div class="card"><h3>Needs grading</h3>${toGrade.slice(0,6).map(s=>`<div class="item"><div><b>${esc(nameOf(s.uid))}</b><div class="mut sm">${esc(actOf(s.actId)?.title||"")}</div></div><a class="btn sm" href="#/grade/${s.actId}">Grade</a></div>`).join("")||empty("Nothing to grade.","check")}</div></div>
  <div class="card" style="margin-top:14px"><h3>Recent submissions</h3>${tbl(["Student","Activity","Score","When"],recent.map(s=>[esc(nameOf(s.uid)),esc(actOf(s.actId)?.title||"—"),counted(s)?sp(s)+"%":"pending",fdate(ts(s.at))]),"No submissions yet.","nw")}</div>
  <h2>Announcements</h2>${await annHtml(3)}`;
};

/* ---------- classes (each class card opens the class) ---------- */
pages.classes=async()=>{
  const loads=await myLoads(),ids=loads.map(l=>l.id);
  const [acts0,subs,studs]=await Promise.all([ids.length?list("activities",where("by","==",S.me.uid)):[],subsFor(ids),studentsFor(loads.map(l=>l.sectionId))]);
  const acts=acts0.filter(a=>a.v===2);
  return head("My classes",`${loads.length} subject load(s)`)+`<div class="cards">${loads.map(l=>{
    const n=studs.filter(s=>s.sectionId===l.sectionId).length,as=acts.filter(a=>a.loadId===l.id&&!a.draft),ss=subs.filter(s=>s.loadId===l.id),avg=mean(ss.filter(counted).map(sp)),comp=pct(ss.length,n*as.length);
    return `<a class="card subj clk" href="#/load/${l.id}" aria-label="Open ${esc(l.sn)}, ${esc(l.sec)}"><span class="chip">${esc(l.sec)}</span><h3>${esc(l.sn)}</h3><div class="mut sm">${n} students · ${as.length} activities</div>
    <div class="row between sm" style="margin-top:8px"><span>Completion</span><b>${comp}%</b></div>${bar(comp)}<div class="row between sm"><span>Class average</span><b>${fm(avg)}</b></div></a>`}).join("")||`<div class="card">${empty("No subject loads yet. The administrator assigns loads.","book")}</div>`}</div>`;
};

/* ---------- one class ---------- */
async function ctx(id){
  const ls=await getDoc(doc(db,"loads",id));
  if(!ls.exists())return null;const ld={id,...ls.data()};
  if(ld.teacherUid!==S.me.uid)return null;
  const safe=p=>p.catch(()=>[]),byAt=(x,y)=>ts(x.at)-ts(y.at);
  const [subj,sec,studs,acts,subs,topics,mats,anns]=await Promise.all([getDoc(doc(db,"subjects",ld.subjectId)),getDoc(doc(db,"sections",ld.sectionId)),studentsFor([ld.sectionId]),
    list("activities",where("loadId","==",id)),list("submissions",where("loadId","==",id)),
    safe(list("topics",where("loadId","==",id))),safe(list("materials",where("loadId","==",id))),safe(list("classAnn",where("loadId","==",id)))]);
  return {ld,sn:subj.data()?.name||"Subject",secName:sec.data()?.name||"Section",studs,acts:acts.filter(a=>a.v===2).sort(byAt),subs,topics:topics.sort(byAt),mats:mats.sort((x,y)=>byAt(y,x)),anns:anns.sort((x,y)=>byAt(y,x))};
}
const tabs=(id,cur)=>`<div class="tabs">${[["activities","Classwork"],["record","Class record"],["students","Students"],["analysis","Item analysis"]].map(([k,l])=>`<a class="${k===cur?"on":""}" href="#/load/${id}/${k}">${l}</a>`).join("")}</div>`;

pages.load=async([id,tab="activities",extra])=>{
  const c=await ctx(id);if(!c)return `<div class="card">${empty("Class not found.")}<p class="right"><a class="btn" href="#/classes">Back</a></p></div>`;
  const cur=tab==="results"?"activities":tab==="student"?"students":tab;
  const hd=head(c.sn,`${c.secName} · ${c.studs.length} students`,`<a class="btn ghost" href="#/classes">← Classes</a>`)+tabs(id,cur);
  const subOf=(uid,aid)=>c.subs.find(s=>s.uid===uid&&s.actId===aid);
  const pub=c.acts.filter(a=>!a.draft);
  const rankRows=()=>{const r=c.studs.map(s=>{const mine=pub.map(a=>subOf(s.id,a.id)).filter(Boolean),gr=mine.filter(counted);return {s,n:mine.length,av:mean(gr.map(sp)),comp:pct(mine.length,pub.length),pend:mine.length-gr.length}})
      .sort((x,y)=>(y.av??-1)-(x.av??-1)||y.comp-x.comp||byName(x.s,y.s));let last=null;r.forEach((x,i)=>{x.rank=last&&last.av===x.av&&last.comp===x.comp?last.rank:i+1;last=x});return r};

  /* who turned in / attempted / not started, for one activity */
  if(tab==="results"){
    const a=c.acts.find(x=>x.id===extra);
    if(!a)return hd+`<div class="card">${empty("Activity not found.")}</div>`;
    const rows=c.studs.map(s=>{const x=subOf(s.id,a.id),n=x?.attempts||0;return {s,x,n,st:!x?"Not started":n>=a.attempts?"Completed":"Attempted"}})
      .sort((p,q)=>["Completed","Attempted","Not started"].indexOf(p.st)-["Completed","Attempted","Not started"].indexOf(q.st)||byName(p.s,q.s));
    const cnt=k=>rows.filter(r=>r.st===k).length,tone={Completed:"ok",Attempted:"warn","Not started":"mut"};
    S.tmp={name:`${a.title}-students.csv`,rows:[["Student","LRN","Status","Score %","Attempts","Last submitted"],...rows.map(r=>[r.s.name,r.s.lrn||"",r.st,r.x?(counted(r.x)?sp(r.x):"pending"):"",r.n,r.x?fdate(ts(r.x.at)):""])]};
    return hd+`<div class="card"><div class="row between"><div><h3>${esc(a.title)}</h3><div class="mut sm">${a.topic?esc(a.topic)+" · ":""}${a.attempts} attempt(s) allowed</div></div><div class="row"><a class="btn ghost" href="#/load/${id}/activities">← Classwork</a><button class="btn ghost" data-a="csvrec">${ic("file")} Export CSV</button></div></div>
    <div class="statgrp" style="margin-top:10px">${mini("Completed",cnt("Completed"),"check","ok")}${mini("Attempted",cnt("Attempted"),"clock","warn")}${mini("Not started",cnt("Not started"),"users")}</div></div>
    <div class="card">${tbl(["Student","Status","Score","Attempts","Last submitted","Tab switches"],rows.map(r=>[esc(r.s.name),badge(r.st,tone[r.st]),r.x?(counted(r.x)?`<b>${sp(r.x)}%</b>`:"pending"):"–",r.x?`${r.n}/${a.attempts}`:"–",r.x?fdate(ts(r.x.at)):"–",r.x?(r.x.tabSwitches||0):"–"]),"No students in this section yet.","rec nw")}
    <p class="hint">Attempted = submitted at least once and still has attempts left. Completed = all attempts used.</p></div>`;
  }

  /* ranking of students */
  if(tab==="students"){
    const rk=rankRows(),top=rk.filter(r=>r.av!=null).slice(0,3);
    S.tmp={name:`${c.sn}-${c.secName}-ranking.csv`,rows:[["Rank","Student","LRN","Average %","Completion %","Turned in"],...rk.map(r=>[r.rank,r.s.name,r.s.lrn||"",r.av??"",r.comp,r.n+"/"+pub.length])]};
    return hd+`<div class="card"><div class="row between"><h3>Student ranking</h3><button class="btn ghost" data-a="csvrec">${ic("file")} Export CSV</button></div>
    ${top.length?`<div class="statgrp" style="margin:6px 0 12px">${top.map(r=>`<a class="stat" href="#/load/${id}/student/${r.s.id}"><div class="si">${r.rank}</div><div><div class="sv">${fm(r.av)}</div><div class="sl">${esc(r.s.name)}</div></div></a>`).join("")}</div>`:""}
    ${tbl(["Student","Rank","Average","Completion","Turned in","To grade"],rk.map(r=>[`<a href="#/load/${id}/student/${r.s.id}">${esc(r.s.name)}</a>`,r.av==null?"–":"#"+r.rank,r.av==null?"–":`<b>${r.av}%</b>${r.av<75?" "+badge("Below 75","warn"):""}`,r.comp+"%",`${r.n}/${pub.length}`,r.pend||"–"]),"No students in this section yet.","rec nw")}
    <p class="hint">Ranked by average of graded scores, then by completion. Missing work is not counted as zero.</p></div>`;
  }

  /* one student's report */
  if(tab==="student"){
    const s=c.studs.find(x=>x.id===extra);if(!s)return hd+`<div class="card">${empty("Student not found.","users")}</div>`;
    const r=rankRows().find(x=>x.s.id===s.id);
    return hd+`<div class="card"><div class="row between"><div><h3>${esc(s.name)}</h3><div class="mut sm">${esc(s.email||"")}${s.lrn?" · LRN "+esc(s.lrn):""}</div></div><a class="btn ghost" href="#/load/${id}/students">← Ranking</a></div>
    <div class="statgrp" style="margin-top:10px">${mini("Rank",r.av==null?"–":"#"+r.rank,"star")}${mini("Average",fm(r.av),"chart")}${mini("Completion",r.comp+"%","check","ok")}${mini("Turned in",`${r.n}/${pub.length}`,"list")}</div></div>
    <div class="card">${tbl(["Activity","Topic","Status","Score","Attempts"],pub.map(a=>{const x=subOf(s.id,a.id),n=x?.attempts||0;return [esc(a.title),esc(a.topic||"–"),x?badge(n>=a.attempts?"Completed":"Attempted",n>=a.attempts?"ok":"warn"):badge("Not started","mut"),x?(counted(x)?`<b>${sp(x)}%</b>`:"pending"):"–",x?`${n}/${a.attempts}`:"–"]}),"No activities posted yet.","rec nw")}</div>`;
  }

  if(tab==="record"){
    const cols=pub,rows=c.studs.map(s=>{const mine=cols.map(a=>subOf(s.id,a.id)),done=mine.filter(Boolean),av=mean(done.filter(counted).map(sp));
      return {s,mine,av,comp:pct(done.length,cols.length)}});
    const rep=cols.map(a=>{const ss=c.subs.filter(s=>s.actId===a.id),n=new Set(ss.map(s=>s.uid)).size;return {a,n,p:pct(n,c.studs.length),avg:mean(ss.filter(counted).map(sp))}});
    S.tmp={name:`${c.sn}-${c.secName}-class-record.csv`,rows:[["Student","LRN",...cols.map(a=>`${a.title} (${a.totalPts})`),"Average %","Completion %"],
      ...rows.map(r=>[r.s.name,r.s.lrn||"",...r.mine.map(x=>x?(counted(x)?sp(x)+"%":"pending"):""),r.av??"",r.comp])]};
    return hd+`<div class="card"><h3>Activity reports</h3>${tbl(["Activity","Topic","Turned in","% answered","Class avg",""],rep.map(r=>[esc(r.a.title),esc(r.a.topic||"–"),`${r.n}/${c.studs.length}`,`<div style="min-width:110px"><b>${r.p}%</b>${bar(r.p)}</div>`,fm(r.avg),`<a class="btn sm ghost" href="#/load/${id}/results/${r.a.id}">Students</a>`]),"No activities posted yet.","rec nw")}
    <p class="hint">% answered = students who turned in the activity. For per-question results see Item analysis.</p></div>
    <div class="card"><div class="row between"><h3>Scores per student</h3><button class="btn ghost" data-a="csvrec">${ic("file")} Export CSV</button></div>
    ${tbl(["Student",...cols.map(a=>esc(a.title)),"Avg","Done"],[...rows.map(r=>[esc(r.s.name),...r.mine.map(x=>x?(counted(x)?sp(x)+"%":`<span class="mut">…</span>`):`<span class="mut">–</span>`),`<b>${fm(r.av)}</b>`,r.comp+"%"]),
      {c:[`<b>Class average</b>`,...cols.map(a=>`<b>${fm(mean(c.subs.filter(s=>s.actId===a.id&&counted(s)).map(sp)))}</b>`),`<b>${fm(mean(rows.map(r=>r.av).filter(x=>x!=null)))}</b>`,""]}],"No students in this section yet.","rec nw")}
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
  /* classwork: topic first, each topic holds Announcements, Materials and Tests */
  const state=a=>a.draft?["Draft","mut"]:a.opens&&Date.now()<a.opens?["Scheduled","info"]:a.closes&&Date.now()>a.closes?["Closed","bad"]:["Open","ok"];
  const testItem=a=>{const ss=c.subs.filter(s=>s.actId===a.id),tg=ss.filter(s=>s.graded===false).length,[sl,sk]=state(a);
    return `<div class="item tst"><div style="flex:1;min-width:220px"><b>${esc(a.title)}</b> ${badge(sl,sk)}${a.release?" "+badge("Answers released","ok"):""}
    <div class="mut sm">${a.questions.length} items · ${a.totalPts} pts · ${a.attempts} attempt(s)${a.timeLimit?" · "+a.timeLimit+" min":""} · ${a.closes?"Due "+fdate(a.closes):"No deadline"}${a.opens&&Date.now()<a.opens?" · Opens "+fdate(a.opens):""}</div>
    ${a.draft?"":`<div class="sm"><b>${new Set(ss.map(s=>s.uid)).size}</b> of ${c.studs.length} turned in · Avg <b>${fm(mean(ss.filter(counted).map(sp)))}</b>${tg?` · <a href="#/grade/${a.id}">${badge(tg+" to grade","warn")}</a>`:""}</div>`}</div>
    <div class="row">${a.draft?"":`<a class="btn sm" href="#/load/${id}/results/${a.id}">Students</a>`}<a class="btn sm ghost" href="#/editor/${id}/${a.id}">Edit</a>${a.hasEssay?`<a class="btn sm ghost" href="#/grade/${a.id}">Grade</a>`:""}${btn("relact",a.release?"Hide answers":"Release answers",a.id,"ghost")}${btn("dupact","Duplicate",a.id,"ghost")}${btn("delact","Delete",a.id,"danger")}</div></div>`};
  const annItem=x=>`<div class="item"><div><b>${esc(x.title||"Announcement")}</b><p>${esc(x.text).replace(/\n/g,"<br>")}</p><div class="mut sm">${fdate(ts(x.at))}</div></div>${btn("t_delann","Delete",x.id,"danger")}</div>`;
  const matItem=m=>`<div class="item"><div><b>${esc(m.title)}</b>${m.note?`<div class="mut sm">${esc(m.note)}</div>`:""}<div class="mut sm">${fdate(ts(m.at))}</div></div><div class="row"><a class="btn sm ghost" href="${esc(m.url)}" target="_blank" rel="noopener noreferrer">Open</a>${btn("t_delmat","Delete",m.id,"danger")}</div></div>`;
  const fold=(t,n,add,items)=>`<details class="fold" open><summary><span class="sp">${t}</span><span class="badge mut">${n}</span>${add}</summary>${items.join("")||`<p class="mut sm">Nothing yet.</p>`}</details>`;
  const docNames=new Set(c.topics.map(t=>t.name));
  const legacy=[...new Set([...c.acts.map(a=>a.topic),...c.mats.map(m=>m.topic),...c.anns.map(x=>x.topic)].filter(n=>n&&!docNames.has(n)))].sort();
  const names=[...c.topics.map(t=>t.name),...legacy];
  const sortT=l=>[...l].sort((x,y)=>(x.draft?0:1)-(y.draft?0:1)||ts(y.at)-ts(x.at));
  const topicCard=t=>{const td=c.topics.find(x=>x.name===t),e=esc(t),ex=`data-topic="${e}"`;
    return `<div class="card topic"><div class="row between"><h3>${e}</h3>${td?btn("t_deltopic","Delete topic",td.id,"ghost",`data-lid="${id}" ${ex}`):""}</div>
    ${fold("Announcements",c.anns.filter(x=>x.topic===t).length,btn("t_addann","+ Add",id,"ghost",ex),c.anns.filter(x=>x.topic===t).map(annItem))}
    ${fold("Materials",c.mats.filter(m=>m.topic===t).length,btn("t_addmat","+ Add",id,"ghost",ex),c.mats.filter(m=>m.topic===t).map(matItem))}
    ${fold("Tests",c.acts.filter(a=>a.topic===t).length,btn("t_newtest","+ New test",id,"",ex),sortT(c.acts.filter(a=>a.topic===t)).map(testItem))}</div>`};
  const loose={a:c.acts.filter(a=>!a.topic),m:c.mats.filter(m=>!m.topic)};
  return hd+`<div class="row between" style="margin-bottom:10px"><span class="mut sm">${names.length} topic(s) · ${c.acts.filter(a=>a.draft).length} draft(s)</span>${btn("t_addtopic","+ New topic",id)}</div>`+
  (names.map(topicCard).join("")+(loose.a.length||loose.m.length?`<div class="card"><h3>No topic</h3><p class="hint">Older items. Edit a test to move it into a topic.</p>${loose.m.map(matItem).join("")}${sortT(loose.a).map(testItem).join("")}</div>`:"")
  ||`<div class="card">${empty("No topics yet. Create a topic first, then add announcements, materials and tests inside it.","list")}</div>`);
};

act.csvrec=()=>S.tmp&&saveCsv(S.tmp.name,S.tmp.rows);
const loadOf=async lid=>(await getDoc(doc(db,"loads",lid))).data();
act.t_addtopic=async el=>{
  const lid=el.dataset.id,old=await list("topics",where("loadId","==",lid)).catch(()=>[]);
  const r=await fdlg("New topic",[{k:"n",l:"Topic name",ph:"e.g. Unit 7 – Trigonometry",req:1}],"Create",o=>old.some(t=>t.name.toLowerCase()===o.n.toLowerCase())?"That topic already exists.":"");
  if(!r)return;const ld=await loadOf(lid);
  await addDoc(collection(db,"topics"),{loadId:lid,sectionId:ld.sectionId,name:r.n.slice(0,80),by:S.me.uid,at:serverTimestamp()});
  log("created topic "+r.n);toast("Topic created.");refresh();
};
act.t_deltopic=async el=>{
  const lid=el.dataset.lid,name=el.dataset.topic;
  const [as,ms,ns]=await Promise.all([list("activities",where("loadId","==",lid)),list("materials",where("loadId","==",lid)),list("classAnn",where("loadId","==",lid))]);
  if(as.some(a=>a.topic===name))return toast("Delete this topic's tests first.","bad");
  if(!await ask(`Delete the topic “${name}” with its announcements and materials?`,"Delete",true))return;
  const b=writeBatch(db);ms.filter(m=>m.topic===name).forEach(m=>b.delete(doc(db,"materials",m.id)));ns.filter(x=>x.topic===name).forEach(x=>b.delete(doc(db,"classAnn",x.id)));b.delete(doc(db,"topics",el.dataset.id));
  await b.commit();toast("Topic deleted.");refresh();
};
act.t_addann=async el=>{
  const r=await fdlg("New announcement",[{k:"t",l:"Title",req:1},{k:"x",l:"Message",ta:1,req:1}],"Post");if(!r)return;
  const ld=await loadOf(el.dataset.id);
  await addDoc(collection(db,"classAnn"),{loadId:el.dataset.id,sectionId:ld.sectionId,topic:el.dataset.topic,title:r.t,text:r.x,by:S.me.uid,at:serverTimestamp()});
  log("class announcement "+r.t);toast("Announcement posted.");refresh();
};
act.t_delann=async el=>{if(await ask("Delete this announcement?","Delete",true)){await deleteDoc(doc(db,"classAnn",el.dataset.id));toast("Deleted.");refresh()}};
act.t_addmat=async el=>{
  const r=await fdlg("New material",[{k:"t",l:"Title",ph:"e.g. Module 3",req:1},{k:"u",l:"Link (Google Drive, etc.)",type:"url",ph:"https://",req:1},{k:"n",l:"Note"}],"Post",o=>/^https?:\/\//i.test(o.u)?"":"The link must start with http:// or https://");
  if(!r)return;const ld=await loadOf(el.dataset.id);
  await addDoc(collection(db,"materials"),{loadId:el.dataset.id,sectionId:ld.sectionId,topic:el.dataset.topic,title:r.t,url:r.u,note:r.n,by:S.me.uid,at:serverTimestamp()});
  log("posted material "+r.t);toast("Material posted.");refresh();
};
act.t_delmat=async el=>{if(await ask("Delete this material?","Delete",true)){await deleteDoc(doc(db,"materials",el.dataset.id));toast("Deleted.");refresh()}};
act.t_newtest=el=>{PRE=el.dataset.topic||"";location.hash=`#/editor/${el.dataset.id}`};
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
let E=null,PRE="";
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

const imgBox=()=>`<div id="qimgbox" class="imgbox">${E.qimg?`<img class="qimg" src="${E.qimg}" alt=""><button class="btn sm danger" data-a="qimgrm" type="button">Remove picture</button>`:`<label class="btn sm ghost" for="qimgf">${ic("file")} Add picture</label>`}<input id="qimgf" type="file" accept="image/*" hidden></div>`;
function qform(){
  const q=E.keep||(E.edit>=0?E.qs[E.edit]:{}),t=E.qt;E.keep=null;E.qimg=q.img||"";
  let x="";
  if(t==="mc")x=`<label class="f" for="qo">Options (one per line)</label><textarea id="qo" rows="4">${esc((q.o||[]).join("\n"))}</textarea><label class="f" for="qa">Correct option</label><input id="qa" value="${esc(q.t==="mc"?q.a||"":"")}">`;
  else if(t==="tf")x=`<label class="f" for="qa">Correct answer</label><select id="qa"><option>True</option><option ${q.a==="False"?"selected":""}>False</option></select>`;
  else if(t==="id"||t==="sa")x=`<label class="f" for="qa">Accepted answers (separate with |)</label><input id="qa" value="${esc(q.t==="id"||q.t==="sa"?q.a||"":"")}" placeholder="Manila|Maynila">`;
  else if(t==="mt")x=`<label class="f" for="qm">Pairs (left=right, one per line)</label><textarea id="qm" rows="4" placeholder="Sine=opposite/hypotenuse&#10;Cosine=adjacent/hypotenuse">${esc((q.pairs||[]).map(p=>p.join("=")).join("\n"))}</textarea>`;
  else x=`<label class="f" for="qa">Model answer / rubric</label><textarea id="qa" rows="3">${esc(q.t==="es"?q.a||"":"")}</textarea><p class="hint">Graded by you. Essays allow 1 attempt.</p>`;
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
  if(PRE&&!actId)E.meta.topic=PRE;PRE="";
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
  const [tp,ac]=await Promise.all([list("topics",where("loadId","==",loadId)).catch(()=>[]),list("activities",where("loadId","==",loadId))]);
  const topics=[...tp.sort((x,y)=>ts(x.at)-ts(y.at)).map(t=>t.name),...[...new Set(ac.map(a=>a.topic).filter(Boolean))].filter(n=>!tp.some(t=>t.name===n)).sort()];
  if(m.topic&&!topics.includes(m.topic))topics.push(m.topic);
  const pane=(k,l)=>`<button type="button" id="tab_${k}" class="seg ${E.tab===k?"on":""}" data-a="etab" data-id="${k}">${l}</button>`;
  return head(actId?"Edit activity":"Create activity","",`<a class="btn ghost" href="#/load/${loadId}/activities">← Back</a>`)+`<div id="ed">
  ${actId&&E.subs?`<div class="card" style="border-color:#d97706"><b>${E.subs} student(s) already submitted.</b><p class="mut sm">Recorded scores are not recalculated if you change questions or answers.</p></div>`:""}
  <div class="card"><h3>Details</h3>
  ${mv("m_title","Title",`<input id="m_title" value="${esc(m.title)}" placeholder="e.g. Quiz 1 – Trigonometric Ratios">`)}
  <div class="g2">${mv("m_topic","Topic",`<select id="m_topic"><option value="" disabled ${m.topic?"":"selected"}>Select topic</option>${topics.map(t=>`<option ${t===m.topic?"selected":""}>${esc(t)}</option>`).join("")}</select>${topics.length?"":`<p class="hint"><a href="#/load/${loadId}/activities">Create a topic</a> first.</p>`}`)}
  ${mv("m_att","Attempts",`<select id="m_att">${[1,2,3].map(n=>`<option ${m.attempts==n?"selected":""}>${n}</option>`).join("")}</select>`)}</div>
  <label class="f" for="m_instr">Instructions</label><textarea id="m_instr" rows="2">${esc(m.instr)}</textarea>
  <label class="f" for="m_links">Attached files <span class="mut">(Title link, one per line)</span></label><textarea id="m_links" rows="2" placeholder="Module 3 https://drive.google.com/…">${esc((m.links||[]).map(l=>(l.t?l.t+" ":"")+l.u).join("\n"))}</textarea></div>
  <div class="card"><h3>Questions</h3>
  <div class="segs">${pane("type","Type")}${pane("word","Word file")}${pane("paste","Paste")}</div>
  <div id="pane_type" ${E.tab==="type"?"":"hidden"}><div id="qf"></div></div>
  <div id="pane_word" ${E.tab==="word"?"":"hidden"}>
    <p class="hint">Use a <b>.docx</b>: number questions (1. 2. 3.), label choices A–D, and mark the correct one in <b>bold</b>, underline, <code>*</code>, an <code>Answer: B</code> line, or an <code>Answer key:</code> list. Pictures are kept.</p>
    <div class="g2"><div><label class="f" for="docpts">Points each</label><input id="docpts" type="number" min="1" max="100" value="1"></div>
    <div><label class="f" for="docf">File</label><input id="docf" type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"></div></div>
    <p id="docmsg" class="sm" aria-live="polite"></p></div>
  <div id="pane_paste" ${E.tab==="paste"?"":"hidden"}>
    <textarea id="mcbulk" rows="8" aria-label="Pasted test" placeholder="1. What is 2 + 2?&#10;A. 3&#10;B. 4&#10;C. 5&#10;Answer: B&#10;&#10;2. Which is a prime number?&#10;A. 9&#10;B. 15&#10;*C. 7&#10;D. 21"></textarea>
    <div class="g2"><div><label class="f" for="mcpts">Points each</label><input id="mcpts" type="number" min="1" max="100" value="1"></div></div>
    <p><button class="btn" data-a="qmcimport">Add questions</button></p>
    <details class="alt"><summary>Other question types (one line each)</summary><p class="hint"><code>type|question|options|answer|points</code> — types: mc, tf, id, sa, mt, es. Separate options and alternatives with <code>;</code>. Matching: <code>left=right;left=right</code>.</p>
    <textarea id="bulk" rows="4" aria-label="One-line questions" placeholder="mc|Capital of the Philippines?|Manila;Cebu;Davao|Manila&#10;tf|The sum of angles in a triangle is 180°.||True&#10;id|Largest ocean?||Pacific;Pacific Ocean"></textarea><p><button class="btn ghost" data-a="qimport">Import lines</button></p></details></div>
  <div id="qlist" style="margin-top:14px"></div></div>
  <div class="card"><h3>Settings</h3><div class="g2">
  ${mv("m_open","Opens",`<input id="m_open" type="datetime-local" value="${toLocalInput(m.opens)}">`)}
  ${mv("m_close","Due",`<input id="m_close" type="datetime-local" value="${toLocalInput(m.closes)}">`)}
  ${mv("m_time","Time limit (minutes, 0 = none)",`<input id="m_time" type="number" min="0" max="300" value="${m.timeLimit}">`)}</div>
  <label class="f inline"><input type="checkbox" id="m_shuf" ${m.shuffle?"checked":""}> Shuffle questions and choices</label>
  <label class="f inline"><input type="checkbox" id="m_rel" ${m.release?"checked":""}> Show correct answers after submit</label></div>
  <div class="sticky-save">${actId&&!m.draft?`<button class="btn ghost" data-a="esave" data-draft="1">Move to drafts</button><button class="btn" data-a="esave" data-draft="0">Save changes</button>`:`<button class="btn ghost" data-a="esave" data-draft="1">Save draft</button><button class="btn" data-a="esave" data-draft="0">Publish</button>`}</div></div>`;
};

act.qadd=()=>{try{const q=readQ();if(E.edit>=0){E.qs[E.edit]=q;E.edit=-1}else E.qs.push(q);E.keep=null;redraw();toast("Question saved to the list.")}catch(e){toast(e.message,"bad")}};
act.qcancel=()=>{E.edit=-1;redraw()};
act.qedit=el=>{E.edit=+el.dataset.id;E.qt=E.qs[E.edit].t;E.keep=null;$("#qf").innerHTML=qform();$("#qf").scrollIntoView({behavior:"smooth"})};
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
  if(!m.topic)return toast("Choose a topic. Create topics in the Classwork tab.","bad");
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
  ${tbl(["Student",...cols.map(c=>esc(c.n)),"General avg"],rows.map(r=>[esc(r.s.name),...r.vals.map(fm),`<b>${fm(r.gen)}</b>`]),"No approved students yet.","rec nw")}
  <p class="hint">Averages use each student's best graded score per activity. Missing work is not counted as zero.</p></div>`;
};
act.apvstu=async el=>{await updateDoc(doc(db,"users",el.dataset.id),{status:"approved"});log("approved student "+el.dataset.id);toast("Student approved.");refresh()};

pages.announcements=async()=>head("Announcements","From the school administration")+await annHtml(30);
