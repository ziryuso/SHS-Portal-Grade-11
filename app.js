import {auth,db,S,act,chg,$,$$,esc,avatar,doc,getDoc,setDoc,list,where,serverTimestamp,toast,errMsg,ic,SCHOOL,ADMIN_EMAILS} from "./core.js";
import {onAuthStateChanged} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {loginView,registerView,waitView,errorView,autoRegister,verifyView} from "./auth.js";
import * as student from "./student.js";
import * as teacher from "./teacher.js";
import * as admin from "./admin.js";
import {openProf,tryClose,profOpen} from "./profile.js";

const roles={student,teacher,admin};
let booted=false,tok=0;

/* loading feedback: top progress bar + busy buttons */
document.head.insertAdjacentHTML("beforeend",`<style>
html.loading body::before{content:"";position:fixed;top:0;left:0;height:3px;width:35%;background:#1d4ed8;z-index:9999;animation:ldbar 1s ease-in-out infinite}
@keyframes ldbar{0%{left:-35%}100%{left:100%}}
[data-a].is-busy,[data-c].is-busy{opacity:.55;pointer-events:none;cursor:progress}
button.is-busy::after{content:"";display:inline-block;width:.9em;height:.9em;margin-left:.5em;vertical-align:-.1em;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;animation:spn .7s linear infinite}
@keyframes spn{to{transform:rotate(360deg)}}
</style>`);
const loading=on=>document.documentElement.classList.toggle("loading",on);
/* show something right away while Firebase checks the login */
$("#app").innerHTML=`<div class="skel" style="max-width:420px;margin:60px auto"></div>`;

/* ---------- auth ---------- */
onAuthStateChanged(auth,async u=>{
  if(!u){S.me=null;return loginView()}
  if(u.providerData.some(p=>p.providerId==="password")&&!u.emailVerified)return verifyView(u);
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
  /* these three lookups don't depend on each other, so run them together */
  await Promise.all([
    getDoc(doc(db,"settings","school")).then(s=>{if(s.exists())S.set={schoolYear:s.data().schoolYear||"",term:s.data().term||""}}).catch(()=>{}),
    S.me.role==="teacher"?list("sections",where("adviserUid","==",S.me.uid)).then(r=>{S.advSecs=r}).catch(()=>{S.advSecs=[]}):null,
    S.me.role==="student"?getDoc(doc(db,"sections",S.me.sectionId)).then(r=>{S.secName=r.data()?.name||""}).catch(()=>{S.secName=""}):null
  ]);
  document.body.classList.toggle("is-student",S.me.role==="student");
  buildShell();
  if(!booted){booted=true;addEventListener("hashchange",render)}
  if(location.hash.length<3)location.hash="#/home";else render();
}

/* ---------- shell ---------- */
const TITLE=`<span class="t1">TTVHS</span> <span class="t2">SHS Student Portal</span>`;
function buildShell(){
  const R=roles[S.me.role],items=R.nav();
  const links=items.map(n=>`<a href="#/${n.k}" data-k="${n.k}" data-m="${(n.m||[]).join(",")}">${ic(n.i)}<span>${esc(n.l)}</span></a>`).join("");
  $("#app").innerHTML=`<div class="app"><aside class="side"><div class="brand"><img class="logo-img" src="logo.jpg" alt=""><b>TTVHS</b></div>
  <nav aria-label="Main">${links}</nav><div class="foot">${S.set.schoolYear?"SY "+esc(S.set.schoolYear):""} ${esc(S.set.term)}</div></aside>
  <div class="main-col"><header class="top"><div class="ttl"><img class="logo-img sm m-only" src="logo.jpg" alt="">${TITLE}</div>
  <div class="pm"><button class="chipu" data-a="pmenu" aria-haspopup="dialog" aria-expanded="false" aria-label="My profile"><div class="who"><b>${esc(S.me.name)}</b></div>${avatar(S.me)}</button>
  <div class="pback" id="pback" hidden></div><div class="pprof" id="pprof" hidden></div></div></header>
  <main id="main" tabindex="-1"></main></div></div><nav class="bottom" aria-label="Main">${links}</nav>`;
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
  loading(true);
  try{
    const html=await R.pages[name](parts.slice(1));
    if(my!==tok)return;loading(false);
    main.innerHTML=html;scrollTo(0,0);S.after?.();
    document.title=(name==="home"?"Dashboard":name[0].toUpperCase()+name.slice(1))+" · TTVHS SHS Portal";main.focus({preventScroll:true});
  }catch(e){
    if(my!==tok)return;loading(false);console.error(e);
    main.innerHTML=`<div class="card"><h3>Something went wrong</h3><p>${esc(errMsg(e))}</p><p><button class="btn" data-a="reload">Reload</button> <a class="btn ghost" href="#/home">Dashboard</a></p></div>`;
  }
}

/* ---------- global events ---------- */
document.addEventListener("click",async e=>{
  const el=e.target.closest("[data-a]");if(!el)return;
  const f=act[el.dataset.a];if(!f)return;
  e.preventDefault();if(el.dataset.busy)return;
  try{el.dataset.busy="1";el.classList.add("is-busy");await f(el,e)}catch(err){console.error(err);toast(errMsg(err),"bad")}finally{delete el.dataset.busy;el.classList.remove("is-busy")}
});
document.addEventListener("change",e=>{const el=e.target.closest("[data-c]");if(el&&chg[el.dataset.c])chg[el.dataset.c](el,e)});

/* ---------- floating profile card: click the profile to open; click it again, click outside or press Esc to close.
   While editing, clicks inside never close it; closing with unsaved changes asks first. ---------- */
act.pmenu=()=>profOpen()?tryClose():openProf();
/* composedPath still works when the clicked button was re-rendered away by its own handler */
const inside=e=>e.composedPath().some(n=>n instanceof Element&&n.matches("#pprof,.chipu,dialog.modal"));
document.addEventListener("click",e=>{if(profOpen()&&!inside(e))tryClose()});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&profOpen()&&!document.querySelector("dialog.modal[open]"))tryClose()});
