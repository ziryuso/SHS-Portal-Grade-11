import {auth,db,S,act,chg,$,$$,esc,avatar,doc,getDoc,setDoc,list,where,serverTimestamp,toast,errMsg,ic,SCHOOL,ADMIN_EMAILS} from "./core.js";
import {onAuthStateChanged} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {loginView,registerView,waitView,errorView,autoRegister} from "./auth.js";
import * as student from "./student.js";
import * as teacher from "./teacher.js";
import * as admin from "./admin.js";

const roles={student,teacher,admin};
let booted=false,tok=0;

/* ---------- auth ---------- */
onAuthStateChanged(auth,async u=>{
  if(!u){S.me=null;return loginView()}
  try{
    const s=await getDoc(doc(db,"users",u.uid));
    if(s.exists())S.me={uid:u.uid,...s.data()};
    else if(ADMIN_EMAILS.includes(u.email)&&u.emailVerified){
      const d={email:u.email,name:u.displayName||"Administrator",role:"admin",status:"approved",createdAt:serverTimestamp()};
      await setDoc(doc(db,"users",u.uid),d);S.me={uid:u.uid,...d};
    }else{
      const d=await autoRegister(u);
      if(!d)return registerView(u);
      S.me={uid:u.uid,...d};
    }
    if(S.me.status!=="approved")return waitView(S.me);
    await boot();
  }catch(e){console.error(e);errorView(e)}
});

async function boot(){
  try{const s=await getDoc(doc(db,"settings","school"));if(s.exists())S.set={schoolYear:s.data().schoolYear||"",term:s.data().term||""}}catch{}
  if(S.me.role==="teacher")try{S.advSecs=await list("sections",where("adviserUid","==",S.me.uid))}catch{S.advSecs=[]}
  document.body.classList.toggle("is-student",S.me.role==="student");
  buildShell();
  if(!booted){booted=true;addEventListener("hashchange",render)}
  if(location.hash.length<3)location.hash="#/home";else render();
}

/* ---------- shell ---------- */
const TITLE=`<span class="t1">TTVHS</span> <span class="t2"><span class="xs-hide">Senior High School </span>Student Portal</span>`;
function buildShell(){
  const R=roles[S.me.role],items=R.nav();
  const links=items.map(n=>`<a href="#/${n.k}" data-k="${n.k}" data-m="${(n.m||[]).join(",")}">${ic(n.i)}<span>${esc(n.l)}</span></a>`).join("");
  const out=`<a href="#" data-a="out">${ic("out")}<span>Log out</span></a>`;
  $("#app").innerHTML=`<div class="app"><aside class="side"><div class="brand"><img class="logo-img" src="logo.jpg" alt=""><b>TTVHS</b></div>
  <nav aria-label="Main">${links}</nav><nav>${out}</nav><div class="foot">${S.set.schoolYear?"SY "+esc(S.set.schoolYear):""} ${esc(S.set.term)}</div></aside>
  <div class="main-col"><header class="top"><div class="ttl"><img class="logo-img sm m-only" src="logo.jpg" alt="">${TITLE}</div>
  <a class="chipu" href="#/profile" aria-label="My profile"><div class="who"><b>${esc(S.me.name)}</b></div>${avatar(S.me)}</a></header>
  <main id="main" tabindex="-1"></main></div></div><nav class="bottom" aria-label="Main">${links}${out}</nav>`;
}
function markNav(name){
  $$("[data-k]").forEach(a=>{const on=a.dataset.k===name||a.dataset.m.split(",").includes(name);a.classList.toggle("on",on);if(on)a.setAttribute("aria-current","page");else a.removeAttribute("aria-current")});
}

/* ---------- router ---------- */
async function render(){
  if(!S.me||S.me.status!=="approved"||!$("#main"))return;
  const my=++tok;
  try{S.cleanup?.()}catch{}S.cleanup=null;S.after=null;
  const R=roles[S.me.role],parts=location.hash.replace(/^#\/?/,"").split("/").filter(Boolean).map(decodeURIComponent);
  const name=R.pages[parts[0]]?parts[0]:"home";
  markNav(name);
  const main=$("#main");main.innerHTML=`<div class="skel"></div><div class="skel"></div><div class="skel"></div>`;
  try{
    const html=await R.pages[name](parts.slice(1));
    if(my!==tok)return;
    main.innerHTML=html;scrollTo(0,0);S.after?.();
  }catch(e){
    if(my!==tok)return;console.error(e);
    main.innerHTML=`<div class="card"><h3>Something went wrong</h3><p>${esc(errMsg(e))}</p><p><button class="btn" onclick="location.reload()">Reload</button> <a class="btn ghost" href="#/home">Dashboard</a></p></div>`;
  }
}

/* ---------- global events ---------- */
document.addEventListener("click",async e=>{
  const el=e.target.closest("[data-a]");if(!el)return;
  const f=act[el.dataset.a];if(!f)return;
  e.preventDefault();if(el.dataset.busy)return;
  try{el.dataset.busy="1";await f(el,e)}catch(err){console.error(err);toast(errMsg(err),"bad")}finally{delete el.dataset.busy}
});
document.addEventListener("change",e=>{const el=e.target.closest("[data-c]");if(el&&chg[el.dataset.c])chg[el.dataset.c](el,e)});
