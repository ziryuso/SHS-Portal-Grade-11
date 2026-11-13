import {auth,S,act,SCHOOL,$,v,esc,list,db,doc,setDoc,serverTimestamp,toast,errMsg} from "./core.js";
import {GoogleAuthProvider,signInWithPopup,signOut,signInWithEmailAndPassword,createUserWithEmailAndPassword,sendPasswordResetEmail} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const PEND="portal:pending";
const ini=esc(SCHOOL.split(/\s+/).map(w=>w[0]).join("").slice(0,3).toUpperCase());
const wrap=inner=>`<div class="auth1"><div class="authw"><div class="brandh"><img class="logo-img big" src="logo.jpg" alt="TTVHS logo"><h1><span class="t1">TTVHS</span> <span class="t2">SHS Student Portal</span></h1></div><div class="card authc">${inner}</div></div></div>`;
const GMAIL=/^[^\s@]+@gmail\.com$/i;
const alias=()=>"S-"+[...crypto.getRandomValues(new Uint8Array(6))].map(x=>x.toString(36)).join("").slice(0,6).toUpperCase();
const authErr=e=>({
  "auth/invalid-credential":"Wrong email or password.","auth/wrong-password":"Wrong email or password.","auth/user-not-found":"Wrong email or password.",
  "auth/email-already-in-use":"That email already has an account. Use the Sign in tab.","auth/weak-password":"Password must be at least 6 characters.",
  "auth/invalid-email":"That email address is not valid.","auth/too-many-requests":"Too many attempts. Please wait a few minutes and try again.",
  "auth/operation-not-allowed":"Email/password sign-in is not turned on yet. In Firebase Console → Authentication → Sign-in method, enable Email/Password.",
  "auth/popup-blocked":"Your browser blocked the sign-in window. Allow pop-ups and try again."
}[e?.code]||errMsg(e));
const quiet=e=>e?.code==="auth/popup-closed-by-user"||e?.code==="auth/cancelled-popup-request";

export async function loginView(){
  let secs=[];try{secs=(await list("sections")).sort((a,b)=>a.name.localeCompare(b.name))}catch{}
  $("#app").innerHTML=wrap(`<div class="tabs" role="tablist"><a href="#" id="t_in" class="on" data-a="authtab" data-id="in">Sign in</a><a href="#" id="t_up" data-a="authtab" data-id="up">Create account</a></div>
  <div id="p_in">
    <button class="btn gbtn" data-a="login"><b>G</b> Continue with Google</button>
    <div class="or"><span>or use your Gmail and password</span></div>
    <label class="f" for="em">Gmail address</label><input id="em" type="email" autocomplete="username" placeholder="name@gmail.com">
    <label class="f" for="pw">Password</label><input id="pw" type="password" autocomplete="current-password">
    <p><button class="btn gbtn" data-a="emlogin">Sign in</button></p>
    <p class="right sm"><a href="#" data-a="forgot">Forgot password?</a></p>
  </div>
  <div id="p_up" style="display:none">
    <div class="g2c"><div><label class="f" for="role">I am a</label><select id="role" onchange="document.getElementById('stuf').style.display=this.value==='student'?'':'none'"><option value="student">Student</option><option value="teacher">Teacher</option></select></div>
    <div id="stuf"><label class="f" for="sec">Section</label><select id="sec">${secs.length?secs.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join(""):`<option value="">No sections yet</option>`}</select></div></div>
    <label class="f" for="nm">Full name (Last, First M.I.)</label><input id="nm" autocomplete="name">
    <p style="margin-top:14px"><button class="btn gbtn" data-a="upgoogle"><b>G</b> Sign up with Google</button></p>
    <details class="alt"><summary>Use Gmail and password instead</summary>
      <input id="em2" type="email" autocomplete="username" placeholder="name@gmail.com" aria-label="Gmail address">
      <input id="pw2" type="password" autocomplete="new-password" placeholder="Password (6+ characters)" aria-label="Password">
      <button class="btn ghost gbtn" data-a="upemail">Create account</button></details>
    <p class="hint" style="text-align:center">Your adviser or the administrator will approve your account.</p>
  </div>`);
}
act.authtab=el=>{const up=el.dataset.id==="up";$("#p_in").style.display=up?"none":"";$("#p_up").style.display=up?"":"none";$("#t_in").classList.toggle("on",!up);$("#t_up").classList.toggle("on",up)};

act.login=async()=>{sessionStorage.removeItem(PEND);try{await signInWithPopup(auth,new GoogleAuthProvider())}catch(e){if(!quiet(e))toast(authErr(e),"bad")}};
act.emlogin=async()=>{
  const em=v("em"),pw=$("#pw").value;if(!em||!pw)return toast("Enter your Gmail address and password.","bad");
  sessionStorage.removeItem(PEND);
  try{await signInWithEmailAndPassword(auth,em,pw)}catch(e){toast(authErr(e),"bad")}
};
act.forgot=async()=>{
  const em=v("em");if(!em)return toast("Type your Gmail address above first.","bad");
  try{await sendPasswordResetEmail(auth,em)}catch(e){if(e.code==="auth/invalid-email")return toast(authErr(e),"bad")}
  toast("If that address has an account, a reset link was sent. Check your inbox and spam folder.");
};
function readProfile(){
  const role=v("role"),name=v("nm"),p={role,name};
  if(name.length<4)throw new Error("Please type your full name.");
  if(role==="student"){
    if(!v("sec"))throw new Error("Choose your section.");
    if(v("lrn")&&!/^\d{12}$/.test(v("lrn")))throw new Error("LRN must be exactly 12 digits.");
    p.sectionId=v("sec");if(v("lrn"))p.lrn=v("lrn");
  }
  return p;
}
act.upgoogle=async()=>{
  let p;try{p=readProfile()}catch(e){return toast(e.message,"bad")}
  sessionStorage.setItem(PEND,JSON.stringify(p));
  try{await signInWithPopup(auth,new GoogleAuthProvider())}catch(e){sessionStorage.removeItem(PEND);if(!quiet(e))toast(authErr(e),"bad")}
};
act.upemail=async()=>{
  let p;try{p=readProfile()}catch(e){return toast(e.message,"bad")}
  const em=v("em2"),pw=$("#pw2").value;
  if(!GMAIL.test(em))return toast("Please use a Gmail address (name@gmail.com).","bad");
  if(pw.length<6)return toast("Password must be at least 6 characters.","bad");
  sessionStorage.setItem(PEND,JSON.stringify(p));
  try{await createUserWithEmailAndPassword(auth,em,pw)}catch(e){sessionStorage.removeItem(PEND);toast(authErr(e),"bad")}
};
act.out=async()=>{await signOut(auth);S.me=null;location.hash=""};

/* profile saved from the Create-account tab; returns null if the user came another way */
export async function autoRegister(u){
  let p=null;try{p=JSON.parse(sessionStorage.getItem(PEND))}catch{}
  if(!p)return null;sessionStorage.removeItem(PEND);
  const d={email:u.email,name:p.name||u.displayName||"",role:p.role,status:"pending"};
  if(p.role==="student"){d.sectionId=p.sectionId;d.alias=alias();if(p.lrn)d.lrn=p.lrn}
  await setDoc(doc(db,"users",u.uid),{...d,createdAt:serverTimestamp()});
  return d;
}

/* fallback: signed in but no profile yet (e.g. used Google on the Sign in tab) */
export async function registerView(u){
  let secs=[];try{secs=(await list("sections")).sort((a,b)=>a.name.localeCompare(b.name))}catch(e){toast(errMsg(e),"bad")}
  $("#app").innerHTML=wrap(`<h2>Finish your profile</h2><p class="mut">${esc(u.email)}</p>
  <label class="f" for="role">I am a</label><select id="role" onchange="document.getElementById('stuf').style.display=this.value==='student'?'':'none'"><option value="student">Student</option><option value="teacher">Teacher</option></select>
  <label class="f" for="nm">Full name (Last name, First name M.I.)</label><input id="nm" value="${esc(u.displayName||"")}" autocomplete="name">
  <div id="stuf"><label class="f" for="sec">Section enrolled</label>
  <select id="sec">${secs.length?secs.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join(""):`<option value="">No sections yet — ask your adviser</option>`}</select>
  </div>
  <p><button class="btn gbtn" data-a="reg">Submit for approval</button></p>
  <p><button class="btn ghost gbtn" data-a="out">Cancel and sign out</button></p>`);
  act.reg=async el=>{
    let p;try{p=readProfile()}catch(e){return toast(e.message,"bad")}
    const d={email:u.email,name:p.name,role:p.role,status:"pending",createdAt:serverTimestamp()};
    if(p.role==="student"){d.sectionId=p.sectionId;d.alias=alias();if(p.lrn)d.lrn=p.lrn}
    el.disabled=true;
    try{await setDoc(doc(db,"users",u.uid),d);location.reload()}catch(e){el.disabled=false;toast(errMsg(e),"bad")}
  };
}

export function waitView(me){
  const inactive=me.status==="inactive";
  $("#app").innerHTML=wrap(`<h2>${inactive?"Account deactivated":"Waiting for approval"}</h2>
  <p>${inactive?"Your account is inactive. Please contact the school administrator.":me.role==="teacher"?"The administrator needs to approve your teacher account.":"Your class adviser needs to approve your enrollment."}</p>
  <p class="mut sm">${esc(me.email)}</p>
  ${inactive?"":`<p><button class="btn gbtn" onclick="location.reload()">Check again</button></p>`}
  <p><button class="btn ghost gbtn" data-a="out">Sign out</button></p>`);
}
export function errorView(e){
  $("#app").innerHTML=wrap(`<h2>Could not load the portal</h2><p>${esc(errMsg(e))}</p>
  <p><button class="btn gbtn" onclick="location.reload()">Reload</button></p><p><button class="btn ghost gbtn" data-a="out">Sign out</button></p>`);
}
