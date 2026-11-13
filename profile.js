import {S,act,chg,esc,db,doc,updateDoc,toast,errMsg,head,tbl,avatar,refreshAvatars,refresh} from "./core.js";

/* resize the chosen picture to a small square and keep it inside the user's profile (no extra storage service needed) */
const toThumb=file=>new Promise((res,rej)=>{
  const img=new Image(),u=URL.createObjectURL(file);
  img.onload=()=>{const s=Math.min(img.width,img.height),c=document.createElement("canvas");c.width=c.height=192;
    c.getContext("2d").drawImage(img,(img.width-s)/2,(img.height-s)/2,s,s,0,0,192,192);URL.revokeObjectURL(u);res(c.toDataURL("image/jpeg",.82))};
  img.onerror=()=>{URL.revokeObjectURL(u);rej(new Error("Could not read that image."))};
  img.src=u;
});
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
