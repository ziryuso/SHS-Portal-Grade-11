import {auth,S,act,SCHOOL,$,v,esc,list,db,doc,setDoc,serverTimestamp,toast,errMsg,ic} from "./core.js";
import {GoogleAuthProvider,signInWithPopup,signOut} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const hero=`<div class="hero"><div class="logo" style="width:56px;height:56px;font-size:22px">${esc(SCHOOL.split(/\s+/).map(w=>w[0]).join("").slice(0,3).toUpperCase())}</div>
<h1>${esc(SCHOOL)}</h1><p>Learning portal for Senior High School — activities, materials and grades in one place.</p>
<ul><li>Answer activities online and see your score right away</li><li>Download learning modules from your teachers</li><li>Track your progress in every subject</li></ul></div>`;

export function loginView(){
  $("#app").innerHTML=`<div class="auth">${hero}<div class="box"><div class="card">
  <h2>Sign in</h2><p class="mut">Students, teachers and administrators sign in with their Google account.</p>
  <button class="btn gbtn" data-a="login">${ic("shield")} Continue with Google</button>
  <p class="hint">First time here? After signing in you will be asked to create your profile. Students are approved by their class adviser; teachers are approved by the administrator.</p></div></div></div>`;
}
act.login=async()=>{try{await signInWithPopup(auth,new GoogleAuthProvider())}catch(e){if(e.code!=="auth/popup-closed-by-user"&&e.code!=="auth/cancelled-popup-request")toast(e.code==="auth/popup-blocked"?"Your browser blocked the sign-in window. Allow pop-ups and try again.":errMsg(e),"bad")}};
act.out=async()=>{await signOut(auth);S.me=null;location.hash=""};

export async function registerView(u){
  let secs=[];try{secs=await list("sections")}catch(e){toast(errMsg(e),"bad")}
  secs.sort((a,b)=>a.name.localeCompare(b.name));
  $("#app").innerHTML=`<div class="auth">${hero}<div class="box"><div class="card">
  <h2>Create your profile</h2><p class="mut">${esc(u.email)}</p>
  <label class="f" for="role">I am a</label><select id="role"><option value="student">Student</option><option value="teacher">Teacher</option></select>
  <label class="f" for="nm">Full name (Last name, First name M.I.)</label><input id="nm" value="${esc(u.displayName)}" autocomplete="name">
  <div id="stuf"><label class="f" for="sec">Section enrolled</label>
  <select id="sec">${secs.length?secs.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join(""):`<option value="">No sections yet — ask your adviser</option>`}</select>
  <label class="f" for="lrn">LRN (12 digits, optional)</label><input id="lrn" inputmode="numeric" maxlength="12" placeholder="e.g. 123456789012"></div>
  <p><button class="btn" data-a="reg" style="width:100%">Submit for approval</button></p>
  <p><button class="btn ghost" data-a="out" style="width:100%">Cancel and sign out</button></p></div></div></div>`;
  $("#role").onchange=e=>$("#stuf").style.display=e.target.value==="student"?"":"none";
  act.reg=async el=>{
    const role=v("role"),name=v("nm"),d={email:u.email,name,role,status:"pending",createdAt:serverTimestamp()};
    if(name.length<4)return toast("Please type your full name.","bad");
    if(role==="student"){
      if(!v("sec"))return toast("Choose your section.","bad");
      if(v("lrn")&&!/^\d{12}$/.test(v("lrn")))return toast("LRN must be exactly 12 digits.","bad");
      d.sectionId=v("sec");d.alias="S-"+[...crypto.getRandomValues(new Uint8Array(4))].map(x=>x.toString(36)).join("").slice(0,6).toUpperCase();
      if(v("lrn"))d.lrn=v("lrn");
    }
    el.disabled=true;
    try{await setDoc(doc(db,"users",u.uid),d);location.reload()}catch(e){el.disabled=false;toast(errMsg(e),"bad")}
  };
}

export function waitView(me){
  const inactive=me.status==="inactive";
  $("#app").innerHTML=`<div class="auth">${hero}<div class="box"><div class="card"><h2>${inactive?"Account deactivated":"Waiting for approval"}</h2>
  <p>${inactive?"Your account is currently inactive. Please contact the school administrator.":me.role==="teacher"?"The administrator needs to approve your teacher account.":"Your class adviser needs to approve your enrollment."}</p>
  <p class="mut sm">${esc(me.email)}</p>
  ${inactive?"":`<p><button class="btn" onclick="location.reload()" style="width:100%">Check again</button></p>`}
  <p><button class="btn ghost" data-a="out" style="width:100%">Sign out</button></p></div></div></div>`;
}

export function errorView(e){
  $("#app").innerHTML=`<div class="auth"><div class="box" style="grid-column:1/-1"><div class="card"><h2>Could not load the portal</h2><p>${esc(errMsg(e))}</p>
  <p><button class="btn" onclick="location.reload()">Reload</button> <button class="btn ghost" data-a="out">Sign out</button></p></div></div></div>`;
}