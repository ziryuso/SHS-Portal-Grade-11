import {firebaseConfig,ADMIN_EMAILS,SCHOOL} from "./firebase-config.js";
import {initializeApp} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {getAuth} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {getFirestore,collection,doc,getDoc,getDocs,setDoc,addDoc,updateDoc,deleteDoc,query,where,orderBy,limit,serverTimestamp,writeBatch,getCountFromServer} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export {ADMIN_EMAILS,SCHOOL,collection,doc,getDoc,getDocs,setDoc,addDoc,updateDoc,deleteDoc,query,where,orderBy,limit,serverTimestamp,writeBatch};
export const app=initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app);

/* shared state + action registries (modules add handlers to act / chg) */
export const S={me:null,set:{schoolYear:"",term:""},advSecs:[],after:null,cleanup:null,tmp:null};
export const act={},chg={};

/* ---------- dom helpers ---------- */
export const $=(s,r=document)=>r.querySelector(s);
export const $$=(s,r=document)=>[...r.querySelectorAll(s)];
export const v=id=>($("#"+id)?.value||"").trim();
export const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
export const go=p=>{if(location.hash==="#/"+p)refresh();else location.hash="#/"+p};
export const refresh=()=>dispatchEvent(new Event("hashchange"));

/* ---------- firestore helpers ---------- */
export const list=async(c,...q)=>(await getDocs(query(collection(db,c),...q))).docs.map(d=>({id:d.id,...d.data()}));
export const count=async(c,...q)=>{try{return (await getCountFromServer(query(collection(db,c),...q))).data().count}catch{return 0}};
export const log=a=>addDoc(collection(db,"logs"),{by:S.me?.email||"",action:a,at:serverTimestamp()}).catch(()=>{});
export const errMsg=e=>e?.code==="permission-denied"?"Not allowed: you don't have permission for this action. (If this is unexpected, publish the latest firestore.rules.)":e?.code==="unavailable"?"Network problem. Check your connection and try again.":(e?.message||"Something went wrong.");

/* ---------- formatting ---------- */
export const ts=x=>x?.toMillis?x.toMillis():(typeof x==="number"?x:0);
export const fdate=ms=>ms?new Date(ms).toLocaleString("en-PH",{month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"}):"—";
export const fday=ms=>ms?new Date(ms).toLocaleDateString("en-PH",{weekday:"long",month:"long",day:"numeric",year:"numeric"}):"";
export const pct=(n,d)=>d?Math.round(100*n/d):0;
export const greet=()=>{const h=new Date().getHours();return h<12?"Good morning":h<18?"Good afternoon":"Good evening"};
export const toLocalInput=ms=>ms?new Date(ms-new Date(ms).getTimezoneOffset()*6e4).toISOString().slice(0,16):"";
export const fromLocalInput=s=>s?new Date(s).getTime():0;
export const mmss=ms=>{const t=Math.max(0,Math.floor(ms/1000)),h=Math.floor(t/3600),m=Math.floor(t%3600/60),s=t%60,p=n=>String(n).padStart(2,"0");return (h?h+":":"")+p(m)+":"+p(s)};

/* ---------- answers: normalize, salted hash, points ---------- */
export const norm=s=>String(s??"").toLowerCase().replace(/\s+/g," ").trim().replace(/\.+$/,"");
export const sha=async(salt,s)=>{const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(salt+"|"+norm(s)));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")};
export const newSalt=()=>[...crypto.getRandomValues(new Uint8Array(12))].map(x=>x.toString(16).padStart(2,"0")).join("");
export const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
export const qMax=q=>(q.t==="mt"?q.l.length:1)*(q.pts||1);

/* ---------- ui ---------- */
const P={
home:'<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
book:'<path d="M4 4h12a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4z"/><path d="M4 16a4 4 0 0 1 4-4h12"/>',
check:'<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>',
users:'<circle cx="9" cy="8" r="3"/><path d="M3 20c0-4 3-6 6-6s6 2 6 6"/><circle cx="17" cy="9" r="2"/><path d="M17 14c2.5 0 4 1.5 4 4"/>',
bell:'<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>',
chart:'<path d="M4 20V10M10 20V4M16 20v-8M22 20H2"/>',
file:'<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>',
cog:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
out:'<path d="M9 4H5v16h4M16 8l4 4-4 4M20 12H9"/>',
clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
grid:'<rect x="4" y="4" width="7" height="7"/><rect x="13" y="4" width="7" height="7"/><rect x="4" y="13" width="7" height="7"/><rect x="13" y="13" width="7" height="7"/>',
shield:'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.500-1-8-4-8-9V6z"/>',
list:'<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
star:'<path d="M12 3l2.800 5.700 6.200.9-4.500 4.400 1.100 6.200L12 17.200 6.400 20.200l1.100-6.200L3 9.600l6.200-.9z"/>'};
export const ic=n=>`<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n]||""}</svg>`;
export const badge=(t,k="")=>`<span class="badge ${k}">${esc(t)}</span>`;
export const bar=(p,k="")=>`<div class="bar" role="progressbar" aria-valuenow="${p}" aria-valuemin="0" aria-valuemax="100"><i class="${k}" style="width:${Math.max(0,Math.min(100,p))}%"></i></div>`;
export const stat=(label,value,sub="",icon="chart",tone="")=>`<div class="card"><div class="stat ${tone}"><div class="si">${ic(icon)}</div><div><div class="sv">${value}</div><div class="sl">${esc(label)}</div>${sub?`<div class="ss">${esc(sub)}</div>`:""}</div></div></div>`;
export const head=(title,sub="",actions="")=>`<div class="ph"><div><h1>${esc(title)}</h1>${sub?`<p class="mut">${esc(sub)}</p>`:""}</div><div class="row noprint">${actions}</div></div>`;
export const empty=(msg,icon="file")=>`<div class="empty">${ic(icon)}<p>${esc(msg)}</p></div>`;
export const tbl=(h,rows,emptyMsg="No records yet.",cls="")=>rows.length?`<div class="tw"><table class="${cls}"><thead><tr>${h.map(x=>`<th>${x}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr ${Array.isArray(r)?"":r.attr||""}>${(Array.isArray(r)?r:r.c).map(c=>`<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`:empty(emptyMsg);
export const btn=(a,l,id="",cls="",extra="")=>`<button class="btn sm ${cls}" data-a="${a}" data-id="${esc(id)}" ${extra}>${l}</button>`;

export function toast(msg,kind="ok"){
  let b=$("#toasts");if(!b){b=document.createElement("div");b.id="toasts";b.setAttribute("role","status");document.body.append(b)}
  const t=document.createElement("div");t.className="toast "+kind;t.textContent=msg;b.append(t);
  setTimeout(()=>t.classList.add("out"),3600);setTimeout(()=>t.remove(),4000);
}
export const ask=(msg,ok="Confirm",danger=false)=>new Promise(res=>{
  const d=document.createElement("dialog");d.className="modal";
  d.innerHTML=`<p>${esc(msg)}</p><div class="end"><button class="btn ghost" value="0">Cancel</button><button class="btn ${danger?"danger":""}" value="1">${esc(ok)}</button></div>`;
  let done=false;const fin=r=>{if(done)return;done=true;d.close();d.remove();res(r)};
  d.addEventListener("click",e=>{const b=e.target.closest("button");if(b)fin(b.value==="1")});
  d.addEventListener("cancel",e=>{e.preventDefault();fin(false)});
  document.body.append(d);d.showModal();
});

export function saveCsv(name,rows){
  const q=c=>{let s=String(c??"");if(/^[=+@]/.test(s)||/^-[^0-9]/.test(s))s="'"+s;return `"${s.replace(/"/g,'""')}"`};
  const b=new Blob(["\ufeff"+rows.map(r=>r.map(q).join(",")).join("\r\n")],{type:"text/csv;charset=utf-8"});
  const a=document.createElement("a");a.href=URL.createObjectURL(b);a.download=name;document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),1500);
}

/* announcements list (shared by all roles) */
export async function annHtml(n=20,manage=false){
  const a=await list("announcements",orderBy("at","desc"),limit(n));
  return a.length?a.map(x=>`<div class="card ann"><div class="row between"><b>${esc(x.title||"Announcement")}</b>${manage?btn("delann","Delete",x.id,"danger"):""}</div><p>${esc(x.text).replace(/\n/g,"<br>")}</p><div class="mut sm">${fdate(ts(x.at))}${x.by?" · "+esc(x.by):""}</div></div>`).join(""):`<div class="card">${empty("No announcements yet.","bell")}</div>`;
}