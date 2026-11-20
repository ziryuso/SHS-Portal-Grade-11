import {auth,S,act,chg,SCHOOL,$,v,esc,list,db,doc,setDoc,serverTimestamp,toast,errMsg} from "./core.js";
import {GoogleAuthProvider,signInWithPopup,signOut,signInWithEmailAndPassword,createUserWithEmailAndPassword,sendPasswordResetEmail,sendEmailVerification,setPersistence,browserLocalPersistence,browserSessionPersistence} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const PEND="portal:pending";
const ini=esc(SCHOOL.split(/\s+/).map(w=>w[0]).join("").slice(0,3).toUpperCase());
const wrap=(inner,cls="")=>`<div class="auth1"><div class="authw"><div class="brandh"><img class="logo-img big" src="logo.jpg" alt="TTVHS logo"><h1><span class="t1">TTVHS</span> <span class="t2">SHS Student Portal</span></h1></div><div class="card authc ${cls}">${inner}</div></div></div>`;
const PRIV=`<label class="chk"><input type="checkbox" id="priv"><span>I agree to the terms: the school may keep my name, email and scores in this portal for class use (Data Privacy Act of 2012, RA 10173).</span></label>`;
const G_ICON=`<svg class="gi" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.800 2.400 30.300 0 24 0 14.600 0 6.500 5.400 2.600 13.200l7.900 6.100C12.400 13.600 17.700 9.500 24 9.500z"/><path fill="#4285F4" d="M46.500 24.500c0-1.600-.1-3.100-.4-4.500H24v9h12.700c-.6 3-2.300 5.500-4.800 7.200l7.500 5.800c4.400-4.100 7.100-10.100 7.100-17.500z"/><path fill="#FBBC05" d="M10.500 28.700c-.5-1.400-.8-3-.8-4.700s.3-3.200.8-4.700l-7.900-6.100C.9 16.400 0 20.100 0 24s.9 7.600 2.600 10.800l7.900-6.100z"/><path fill="#34A853" d="M24 48c6.500 0 11.900-2.100 15.900-5.800l-7.500-5.800c-2.100 1.400-4.800 2.300-8.400 2.300-6.300 0-11.600-4.100-13.500-9.800l-7.900 6.100C6.500 42.600 14.600 48 24 48z"/></svg>`;
const MAIL_ICON=`<svg class="fic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>`;
const LOCK_ICON=`<svg class="fic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>`;
const IN_ICON=`<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/><path d="M15 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4"/></svg>`;
const googleBtn=(a,t)=>`<button type="button" class="gbtn glg" data-a="${a}">${G_ICON}<span>${t}</span></button>`;
const persist=async(keep)=>{try{await setPersistence(auth,keep?browserLocalPersistence:browserSessionPersistence)}catch{}};
const secOpts=secs=>`<option value="" selected disabled>Section</option>`+secs.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join("");
const profileFields=secs=>`<select id="role" data-c="role" aria-label="I am a"><option value="" selected disabled>I am a</option><option value="teacher">Teacher</option><option value="student">Student</option></select>
    <div id="stuf" style="display:none"><select id="sec" aria-label="Section">${secs.length?secOpts(secs):`<option value="" selected disabled>No sections yet</option>`}</select></div>
    <input id="nm" autocomplete="name" placeholder="Name" aria-label="Name">`;
const GMAIL=/^[^\s@]+@gmail\.com$/i;
const alias=()=>"S-"+[...crypto.getRandomValues(new Uint8Array(6))].map(x=>x.toString(36)).join("").slice(0,6).toUpperCase();
const authErr=e=>({
  "auth/invalid-credential":"Wrong email or password.","auth/wrong-password":"Wrong email or password.","auth/user-not-found":"Wrong email or password.",
  "auth/email-already-in-use":"That email already has an account. Use the Sign in tab.","auth/weak-password":"Password must be at least 6 characters.",
  "auth/invalid-email":"That email address is not valid.","auth/too-many-requests":"Too many attempts. Please wait a few minutes and try again.",
  "auth/operation-not-allowed":"Email/password sign-in is not turned on yet. In Firebase Console → Authentication → Sign-in method, enable Email/Password.",
  "auth/popup-blocked":"Your browser blocked the sign-in window. Allow pop-ups and try again."
}[e?.code]||errMsg(e));
const UA=navigator.userAgent,inApp=/FBAN|FBAV|FB_IAB|FB4A|FBIOS|FBSS|Messenger|Instagram|Line\/|Snapchat|TikTok|musical_ly|Twitter/i.test(UA),isAndroid=/Android/i.test(UA);
/* Android: ask Chrome to open this same page (falls back to staying here if Chrome is missing) */
const chromeUrl=()=>`intent://${location.host}${location.pathname}${location.search}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(location.href)};end`;
act.openext=()=>{location.href=chromeUrl()};
const inAppMsg="Google sign-in is blocked inside Messenger/Facebook. Use email and password, or open this page in Safari/Chrome.";
act.copylink=async()=>{try{await navigator.clipboard.writeText(location.origin+location.pathname);toast("Link copied. Paste it in Safari or Chrome.")}catch{toast("Copy the address manually and open it in Safari or Chrome.","bad")}};
const quiet=e=>e?.code==="auth/popup-closed-by-user"||e?.code==="auth/cancelled-popup-request";

export async function loginView(){
  let secs=[];
  const note=inApp?`<div class="note big"><b>You are inside Messenger/Facebook.</b> Google sign-in is blocked in this window.<br>${isAndroid?`Tap <b>Open in Chrome</b> to continue the normal way.`:`Tap the <b>•••</b> menu (or the Safari icon) and choose <b>Open in Browser / Open in Safari</b>, or copy the link and paste it in your browser.`}<div class="row" style="margin-top:8px">${isAndroid?`<button type="button" class="btn sm" data-a="openext">Open in Chrome</button>`:""}<button type="button" class="btn sm ghost" data-a="copylink">Copy link</button></div><div class="hint">You can also sign in or register right here with email and password.</div></div>`:"";
  $("#app").innerHTML=wrap(`<div id="p_in">
    <div class="ac-h">Sign in to start your session</div>
    <div class="ac-b lg">${note}
      <div class="fi">${MAIL_ICON}<input id="em" type="email" autocomplete="username" placeholder="Email" aria-label="Email"></div>
      <div class="fi">${LOCK_ICON}<input id="pw" type="password" autocomplete="current-password" placeholder="Password" aria-label="Password"></div>
      <div class="lg-row"><label class="lg-rm"><input type="checkbox" id="rem"><span>Remember me</span></label>
        <button type="button" class="btn lg-sm" data-a="emlogin"><span>Sign in</span>${IN_ICON}</button></div>
    </div>
    <div class="ac-f"><div class="lg-links"><a href="#" data-a="forgot">I forgot my password</a><a href="#" data-a="authtab" data-id="up">Register New Account</a></div>
      ${inApp?"":`<div class="or"><span>or</span></div>${googleBtn("login","Sign in with Google")}`}</div>
  </div>
  <div id="p_up" style="display:none">
    <div class="ac-h">Register New Account</div>
    <div class="ac-b lg">${profileFields(secs)}${PRIV}
      ${inApp?`<div class="fi">${MAIL_ICON}<input id="em2" type="email" autocomplete="username" placeholder="Email" aria-label="Email"></div><div class="fi">${LOCK_ICON}<input id="pw2" type="password" autocomplete="new-password" placeholder="Password (6+ characters)" aria-label="Password"></div><button type="button" class="btn lg-sm lg-wide" data-a="upemail">Create account</button>`:googleBtn("upgoogle","Sign up with Google")}
    </div>
    <div class="ac-f"><p class="hint" style="text-align:center;margin:0 0 6px">Your account will wait for approval by your teacher adviser or the administrator.</p>
      <div class="lg-links"><a href="#" data-a="authtab" data-id="in">Back to sign in</a></div></div>
  </div>`,"acard");
  if(inApp&&isAndroid&&!sessionStorage.getItem("portal:ext")){sessionStorage.setItem("portal:ext","1");setTimeout(()=>{location.href=chromeUrl()},400)}
  $("#pw")?.addEventListener("keydown",e=>{if(e.key==="Enter")$("[data-a=emlogin]")?.click()});
  /* sections load in the background so the sign-in form appears instantly */
  list("sections").then(r=>{const sel=$("#sec");if(!sel||!r.length)return;sel.innerHTML=secOpts(r.sort((a,b)=>a.name.localeCompare(b.name)))}).catch(()=>{});
}
act.authtab=el=>{const up=el.dataset.id==="up";$("#p_in").style.display=up?"none":"";$("#p_up").style.display=up?"":"none"};
chg.role=el=>{$("#stuf").style.display=el.value==="student"?"":"none"};
act.reload=()=>location.reload();;

act.login=async()=>{if(inApp)return toast(inAppMsg,"bad");sessionStorage.removeItem(PEND);await persist($("#rem")?.checked);try{await signInWithPopup(auth,new GoogleAuthProvider())}catch(e){if(!quiet(e))toast(authErr(e),"bad")}};
act.emlogin=async()=>{
  const em=v("em"),pw=$("#pw").value;if(!em||!pw)return toast("Enter your email and password.","bad");
  sessionStorage.removeItem(PEND);await persist($("#rem")?.checked);
  try{await signInWithEmailAndPassword(auth,em,pw)}catch(e){toast(authErr(e),"bad")}
};
act.forgot=async()=>{
  const em=v("em");if(!em)return toast("Type your email above first.","bad");
  try{await sendPasswordResetEmail(auth,em)}catch(e){if(e.code==="auth/invalid-email")return toast(authErr(e),"bad")}
  toast("If that address has an account, a reset link was sent. Check your inbox and spam folder.");
};
function readProfile(){
  const role=v("role"),name=v("nm"),p={role,name};
  if(!role)throw new Error("Choose Teacher or Student.");
  if(role==="student"&&!v("sec"))throw new Error("Choose your section.");
  if(name.length<4)throw new Error("Please type your full name.");
  if(!$("#priv")?.checked)throw new Error("Please tick the agreement to continue.");
  if(role==="student"){
    if(!v("sec"))throw new Error("Choose your section.");
    if(v("lrn")&&!/^\d{12}$/.test(v("lrn")))throw new Error("LRN must be exactly 12 digits.");
    p.sectionId=v("sec");if(v("lrn"))p.lrn=v("lrn");
  }
  return p;
}
act.upgoogle=async()=>{if(inApp)return toast(inAppMsg,"bad");
  let p;try{p=readProfile()}catch(e){return toast(e.message,"bad")}
  sessionStorage.setItem(PEND,JSON.stringify(p));await persist(true);
  try{await signInWithPopup(auth,new GoogleAuthProvider())}catch(e){sessionStorage.removeItem(PEND);if(!quiet(e))toast(authErr(e),"bad")}
};
act.upemail=async()=>{
  let p;try{p=readProfile()}catch(e){return toast(e.message,"bad")}
  const em=v("em2"),pw=$("#pw2").value;
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em))return toast("Enter a valid email address.","bad");
  if(pw.length<6)return toast("Password must be at least 6 characters.","bad");
  sessionStorage.setItem(PEND,JSON.stringify(p));await persist(true);
  try{const c=await createUserWithEmailAndPassword(auth,em,pw);sendEmailVerification(c.user).catch(()=>{})}catch(e){sessionStorage.removeItem(PEND);toast(authErr(e),"bad")}
};
act.out=async()=>{await signOut(auth);S.me=null;location.hash=""};

/* profile saved from the Create-account tab; returns null if the user came another way */
export async function autoRegister(u){
  let p=null;try{p=JSON.parse(sessionStorage.getItem(PEND))}catch{}
  if(!p)return null;sessionStorage.removeItem(PEND);
  const d={email:u.email,name:p.name||u.displayName||"",role:p.role,status:"pending",consent:true};
  if(p.role==="student"){d.sectionId=p.sectionId;d.alias=alias();if(p.lrn)d.lrn=p.lrn}
  await setDoc(doc(db,"users",u.uid),{...d,createdAt:serverTimestamp()});
  return d;
}

/* fallback: signed in but no profile yet (e.g. used Google on the Sign in tab) */
export async function registerView(u){
  let secs=[];try{secs=(await list("sections")).sort((a,b)=>a.name.localeCompare(b.name))}catch(e){toast(errMsg(e),"bad")}
  $("#app").innerHTML=wrap(`<div class="lg"><h2 class="lg-h">Finish your profile</h2><p class="mut sm" style="text-align:center;margin:0">${esc(u.email)}</p>
  ${profileFields(secs)}
  ${PRIV}<button type="button" class="btn lg-sm lg-wide" data-a="reg">Submit for approval</button>
  <p class="lg-links" style="justify-content:center"><a href="#" data-a="out">Cancel and sign out</a></p></div>`);
  const nm=$("#nm");if(nm&&u.displayName)nm.value=u.displayName;
  act.reg=async el=>{
    let p;try{p=readProfile()}catch(e){return toast(e.message,"bad")}
    const d={email:u.email,name:p.name,role:p.role,status:"pending",consent:true,createdAt:serverTimestamp()};
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
  ${inactive?"":`<p><button class="btn gbtn" data-a="reload">Check again</button></p>`}
  <p><button class="btn ghost gbtn" data-a="out">Sign out</button></p>`);
}
export function errorView(e){
  $("#app").innerHTML=wrap(`<h2>Could not load the portal</h2><p>${esc(errMsg(e))}</p>
  <p><button class="btn gbtn" data-a="reload">Reload</button></p><p><button class="btn ghost gbtn" data-a="out">Sign out</button></p>`);
}

/* email/password accounts must prove they own the address (stops someone registering with another person's Gmail) */
export function verifyView(u){
  $("#app").innerHTML=wrap(`<h2>Verify your email</h2><p>We sent a link to <b>${esc(u.email)}</b>. Open it, then press the button below.</p>
  <p><button class="btn gbtn" data-a="verified">I have verified</button></p><p><button class="btn ghost gbtn" data-a="resend">Send the link again</button></p><p><button class="btn ghost gbtn" data-a="out">Sign out</button></p>`);
}
act.verified=async()=>{await auth.currentUser.reload();location.reload()};
act.resend=async()=>{try{await sendEmailVerification(auth.currentUser);toast("Link sent. Check your inbox and spam folder.")}catch(e){toast(authErr(e),"bad")}};
