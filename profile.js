import {S,act,chg,$,v,esc,auth,db,doc,updateDoc,toast,errMsg,head,tbl,avatar,refreshAvatars,refresh,ic} from "./core.js";
import {EmailAuthProvider,reauthenticateWithCredential,updateEmail,updatePassword,verifyBeforeUpdateEmail} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

/* resize the chosen picture to a small square and keep it inside the user's profile (no extra storage service needed) */
const toThumb=file=>new Promise((res,rej)=>{
  const img=new Image(),u=URL.createObjectURL(file);
  img.onload=()=>{const s=Math.min(img.width,img.height),c=document.createElement("canvas");c.width=c.height=192;
    c.getContext("2d").drawImage(img,(img.width-s)/2,(img.height-s)/2,s,s,0,0,192,192);URL.revokeObjectURL(u);res(c.toDataURL("image/jpeg",.82))};
  img.onerror=()=>{URL.revokeObjectURL(u);rej(new Error("Could not read that image."))};
  img.src=u;
});

/* ---------- full-page pieces (still used by the student profile page) ---------- */
export const photoCard=()=>`<div class="card row" style="gap:14px">${avatar(S.me,"xl")}<div style="flex:1;min-width:180px"><b>${esc(S.me.name)}</b><div class="mut sm">${esc(S.me.email)}</div>
  <div class="row" style="margin-top:8px"><button class="btn sm" data-a="pickphoto">${S.me.photo?"Change photo":"Upload photo"}</button>${S.me.photo?`<button class="btn sm ghost" data-a="rmphoto">Remove</button>`:""}</div>
  <input type="file" id="photoin" accept="image/*" data-c="photo" hidden></div></div>`;
act.pickphoto=()=>document.getElementById("photoin").click();
chg.photo=async el=>{
  const f=el.files[0];el.value="";if(!f)return;
  if(!f.type.startsWith("image/"))return toast("Please choose an image file.","bad");
  try{const url=await toThumb(f);await updateDoc(doc(db,"users",S.me.uid),{photo:url});S.me.photo=url;refreshAvatars();toast("Photo updated.");refresh()}
  catch(e){toast(errMsg(e),"bad")}
};
act.rmphoto=async()=>{await updateDoc(doc(db,"users",S.me.uid),{photo:""});S.me.photo="";refreshAvatars();toast("Photo removed.");refresh()};

/* profile page for teachers and admin (students have their own, with section details) */
export const generalProfile=async()=>{
  const m=S.me,rows=[["Role",esc(m.role[0].toUpperCase()+m.role.slice(1))],["Email",esc(m.email)]];
  if(m.role==="teacher"&&S.advSecs.length)rows.push(["Advisory",esc(S.advSecs.map(s=>s.name).join(", "))]);
  return head("Profile")+photoCard()+`<div class="card">${tbl(["Field","Details"],rows)}</div><div class="card"><button class="btn ghost" data-a="out">Log out</button></div>`;
};

/* ---------- floating profile panel (opened from the top-right avatar in app.js) ---------- */
let pend; /* undefined = photo untouched, "" = remove, data-url = new photo; applied only when Save is clicked */
const EMAIL=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const hasPw=()=>!!auth.currentUser?.providerData.some(p=>p.providerId==="password");
const pErr=e=>({
  "auth/wrong-password":"Current password is wrong.","auth/invalid-credential":"Current password is wrong.",
  "auth/email-already-in-use":"That email already has an account.","auth/invalid-email":"That email address is not valid.",
  "auth/weak-password":"New password must be at least 6 characters.","auth/too-many-requests":"Too many attempts. Please wait a few minutes and try again.",
  "auth/requires-recent-login":"Please log out, sign in again, then retry."
}[e?.code]||errMsg(e));
export const closePanel=()=>{const m=$("#pmenu");if(m)m.hidden=true;$(".chipu")?.setAttribute("aria-expanded","false")};

const pic=m=>`<img class="avatar xl" id="pfimg" alt="" ${m.photo?`src="${esc(m.photo)}"`:"hidden"}><span class="avatar xl" id="pfini" ${m.photo?"hidden":""}>${esc((m.name||"?").trim()[0]||"?")}</span>`;
const setPrev=url=>{
  const i=$("#pfimg"),s=$("#pfini");
  if(url){i.src=url;i.hidden=false;s.hidden=true}else{i.hidden=true;i.removeAttribute("src");s.hidden=false}
  $("#pfrm").hidden=!url;$("#pfpick").textContent=url?"Change photo":"Upload photo";
};

export const panelHtml=()=>{
  pend=undefined;const m=S.me,pw=hasPw();
  return `<div class="pfh">${pic(m)}<div class="pfw"><b>${esc(m.name)}</b><span class="mut sm">${esc(m.email||"")}</span><span class="mut sm">${esc(m.role[0].toUpperCase()+m.role.slice(1))}</span></div></div>
  <div class="row pfb"><button class="btn sm" data-a="pfpick" id="pfpick">${m.photo?"Change photo":"Upload photo"}</button><button class="btn sm ghost" data-a="pfrm" id="pfrm" ${m.photo?"":"hidden"}>Remove</button></div>
  <input type="file" id="pfphotoin" accept="image/*" data-c="pfphoto" hidden>
  <div class="pfs"><h4>Update profile</h4>
  ${pw?`<label class="f" for="pf_em">Email</label><input id="pf_em" type="email" value="${esc(m.email||"")}" autocomplete="off">
  <label class="f" for="pf_np">New password <span class="mut">(leave blank to keep)</span></label><input id="pf_np" type="password" autocomplete="new-password">
  <label class="f" for="pf_np2">Confirm new password</label><input id="pf_np2" type="password" autocomplete="new-password">
  <label class="f" for="pf_cp">Current password <span class="mut">(needed to change email or password)</span></label><input id="pf_cp" type="password" autocomplete="current-password">`
  :`<p class="hint">You signed in with Google, so your email and password are managed in your Google account. You can still change your photo.</p>`}
  <div class="row pfe"><button class="btn ghost" data-a="pfcancel">Cancel</button><button class="btn" data-a="pfsave">Save</button></div></div>
  <div class="pfl">${m.role==="student"?`<a href="#/profile" data-a="pfgo">${ic("users")}<span>Section details</span></a>`:""}<a href="#" data-a="out">${ic("out")}<span>Log out</span></a></div>`;
};

act.pfpick=()=>$("#pfphotoin").click();
chg.pfphoto=async el=>{
  const f=el.files[0];el.value="";if(!f)return;
  if(!f.type.startsWith("image/"))return toast("Please choose an image file.","bad");
  try{pend=await toThumb(f);setPrev(pend);toast("Photo ready. Click Save to apply it.")}catch(e){toast(errMsg(e),"bad")}
};
act.pfrm=()=>{pend="";setPrev("");toast("Photo will be removed when you click Save.")};
act.pfcancel=()=>closePanel();
act.pfgo=()=>{closePanel();location.hash="#/profile"};

act.pfsave=async el=>{
  const u=auth.currentUser,m=S.me;if(!u||!m)return;
  const pw=hasPw(),em=pw?v("pf_em"):"",np=pw?$("#pf_np").value:"",np2=pw?$("#pf_np2").value:"",cp=pw?$("#pf_cp").value:"";
  const mailCh=pw&&em&&em.toLowerCase()!==(u.email||"").toLowerCase(),passCh=pw&&!!np,photoCh=pend!==undefined;
  if(!mailCh&&!passCh&&!photoCh)return closePanel();
  if(mailCh&&!EMAIL.test(em))return toast("That email address is not valid.","bad");
  if(passCh&&np.length<6)return toast("New password must be at least 6 characters.","bad");
  if(passCh&&np!==np2)return toast("The two new passwords do not match.","bad");
  if((mailCh||passCh)&&!cp)return toast("Enter your current password to change your email or password.","bad");
  el.disabled=true;
  const patch={};let err=null,note="";
  try{
    if(mailCh||passCh)await reauthenticateWithCredential(u,EmailAuthProvider.credential(u.email,cp));
    if(mailCh){
      try{await updateEmail(u,em);patch.email=em}
      catch(e){
        if(e.code!=="auth/operation-not-allowed")throw e;
        await verifyBeforeUpdateEmail(u,em);note=" A confirmation link was sent to the new email. It changes after you click it."; /* project requires email verification first */
      }
    }
    if(passCh)await updatePassword(u,np);
  }catch(e){err=e}
  if(!err&&photoCh)patch.photo=pend;
  try{if(Object.keys(patch).length){await updateDoc(doc(db,"users",m.uid),patch);Object.assign(S.me,patch);refreshAvatars()}}catch(e){err=err||e}
  el.disabled=false;
  if(err)return toast(pErr(err),"bad");
  toast("Profile updated."+note);closePanel();
};
