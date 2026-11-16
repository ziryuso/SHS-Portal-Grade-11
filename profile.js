import {S,act,chg,$,esc,db,doc,updateDoc,toast,errMsg,ask,head,tbl,avatar,refreshAvatars,refresh} from "./core.js";

const BIO_MAX=150;
/* resize the chosen picture to a small square and keep it inside the user's profile (no extra storage service needed) */
const toThumb=file=>new Promise((res,rej)=>{
  const img=new Image(),u=URL.createObjectURL(file);
  img.onload=()=>{const s=Math.min(img.width,img.height),c=document.createElement("canvas");c.width=c.height=192;
    c.getContext("2d").drawImage(img,(img.width-s)/2,(img.height-s)/2,s,s,0,0,192,192);URL.revokeObjectURL(u);res(c.toDataURL("image/jpeg",.82))};
  img.onerror=()=>{URL.revokeObjectURL(u);rej(new Error("Could not read that image."))};
  img.src=u;
});

/* ---------- plain profile page (photo saves immediately) ---------- */
export const photoCard=()=>`<div class="card row" style="gap:14px">${avatar(S.me,"xl")}<div style="flex:1;min-width:180px"><b>${esc(S.me.name)}</b><div class="mut sm">${esc(S.me.email)}</div>
  ${S.me.bio?`<p class="sm">${esc(S.me.bio)}</p>`:""}
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

/* ---------- floating profile card (all roles) ----------
   View mode : shows everything saved about the user. Click the avatar again / outside / Esc to close.
   Edit mode : photo + bio become editable. Clicking inside never closes it; Save closes it,
               Cancel (or clicking outside) asks before throwing away unsaved changes. */
export const P={edit:false,pd:null};
const RL=r=>r?r[0].toUpperCase()+r.slice(1):"";
const infoRows=m=>{const r=[["Role",RL(m.role)],["Email",m.email||"–"]];
  if(m.role==="student")r.push(["Section",S.secName||"–"],["LRN",m.lrn||"Not provided"],["Alias",m.alias||"–"]);
  if(m.role==="teacher"&&S.advSecs.length)r.push(["Advisory",S.advSecs.map(s=>s.name).join(", ")]);
  if(S.set.schoolYear)r.push(["School year",S.set.schoolYear]);
  return r};
const dl=m=>`<dl class="pp-dl">${infoRows(m).map(([k,x])=>`<dt>${esc(k)}</dt><dd>${esc(x)}</dd>`).join("")}</dl>`;
export const profDirty=()=>!!(P.edit&&P.pd&&(P.pd.photo!==(S.me.photo||"")||P.pd.bio!==(S.me.bio||"")));
export const profInner=()=>{
  const m=S.me;
  if(!P.edit)return `<div class="pp-top">${avatar(m,"xl")}<div class="pp-i"><b>${esc(m.name)}</b><span class="badge">${esc(RL(m.role))}</span></div></div>
  <p class="pp-bio ${m.bio?"":"mut"}">${m.bio?esc(m.bio):"No bio yet. Tap Edit to add one."}</p>${dl(m)}
  <div class="pp-act"><button class="btn sm" data-a="pedit">Edit profile</button><button class="btn sm ghost" data-a="out">Log out</button></div>`;
  const d=P.pd;
  return `<div class="pp-top">${avatar({...m,photo:d.photo},"xl")}<div class="pp-i"><b>${esc(m.name)}</b><span class="badge">${esc(RL(m.role))}</span></div></div>
  <div class="pp-act" style="margin-top:10px"><button class="btn sm" data-a="pphoto">${d.photo?"Change photo":"Upload photo"}</button>${d.photo?`<button class="btn sm ghost" data-a="prmphoto">Remove</button>`:""}</div>
  <input type="file" id="photoin2" accept="image/*" data-c="pphoto" hidden>
  <label class="f" for="pbio">Bio</label><textarea id="pbio" rows="3" maxlength="${BIO_MAX}" placeholder="Tell your classmates or teachers a little about you">${esc(d.bio)}</textarea>
  <div class="mut sm right" id="pbioc">${d.bio.length}/${BIO_MAX}</div>${dl(m)}
  <p class="mut sm">Name, email and section can only be changed by the administrator.</p>
  <div class="pp-act"><button class="btn sm" data-a="psave">Save</button><button class="btn sm ghost" data-a="pcancel">Cancel</button></div>`;
};
const rer=()=>{const e=$("#pprof");if(e&&!e.hidden)e.innerHTML=profInner()};
const keepBio=()=>{const t=$("#pbio");if(t&&P.pd)P.pd.bio=t.value};
export const closeProf=()=>{P.edit=false;P.pd=null;const e=$("#pprof"),b=$("#pback");if(e)e.hidden=true;if(b)b.hidden=true;$(".chipu")?.setAttribute("aria-expanded","false")};
export const openProf=()=>{const e=$("#pprof"),b=$("#pback");if(!e)return;P.edit=false;P.pd=null;e.innerHTML=profInner();e.hidden=false;if(b)b.hidden=false;$(".chipu")?.setAttribute("aria-expanded","true")};
export const profOpen=()=>{const e=$("#pprof");return !!e&&!e.hidden};
/* close, but never lose unsaved edits silently */
export const tryClose=async()=>{if(profDirty()&&!await ask("Discard your unsaved profile changes?","Discard",true))return;closeProf()};

document.addEventListener("input",e=>{if(e.target.id!=="pbio"||!P.pd)return;P.pd.bio=e.target.value;const c=$("#pbioc");if(c)c.textContent=`${e.target.value.length}/${BIO_MAX}`});
act.pedit=()=>{P.edit=true;P.pd={photo:S.me.photo||"",bio:S.me.bio||""};rer()};
act.pcancel=async()=>{if(profDirty()&&!await ask("Discard your unsaved profile changes?","Discard",true))return;P.edit=false;P.pd=null;rer()};
act.pphoto=()=>document.getElementById("photoin2").click();
act.prmphoto=()=>{keepBio();P.pd.photo="";rer()};
chg.pphoto=async el=>{
  const f=el.files[0];el.value="";if(!f||!P.pd)return;
  if(!f.type.startsWith("image/"))return toast("Please choose an image file.","bad");
  try{const url=await toThumb(f);keepBio();P.pd.photo=url;rer()}catch(e){toast(errMsg(e),"bad")}
};
act.psave=async()=>{
  keepBio();const d=P.pd,bio=d.bio.trim().slice(0,BIO_MAX);
  await updateDoc(doc(db,"users",S.me.uid),{photo:d.photo,bio});
  S.me.photo=d.photo;S.me.bio=bio;refreshAvatars();closeProf();toast("Profile saved.");
};

/* profile page for teachers and admin (students have their own, with section details) */
export const generalProfile=async()=>{
  const m=S.me,rows=[["Role",esc(RL(m.role))],["Email",esc(m.email)]];
  if(m.role==="teacher"&&S.advSecs.length)rows.push(["Advisory",esc(S.advSecs.map(s=>s.name).join(", "))]);
  return head("Profile")+photoCard()+`<div class="card">${tbl(["Field","Details"],rows)}</div><div class="card"><button class="btn ghost" data-a="out">Log out</button></div>`;
};