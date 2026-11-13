/* Read a Word (.docx) file in the browser: text, numbering, bold/underline, and embedded pictures.
   Uses only built-in browser features (no libraries). */

/* shrink any picture to a JPEG data-URL small enough to keep in the database */
export async function imgToData(blob,max=900){
  let bmp;
  try{bmp=await createImageBitmap(blob)}
  catch{bmp=await new Promise((res,rej)=>{const u=URL.createObjectURL(blob),i=new Image();i.onload=()=>res(i);i.onerror=()=>rej(new Error("That picture format is not supported."));i.src=u})}
  const w0=bmp.width||bmp.naturalWidth,h0=bmp.height||bmp.naturalHeight;
  for(const [m,q] of [[max,.8],[720,.7],[560,.6],[420,.55]]){
    const s=Math.min(1,m/Math.max(w0,h0)),c=document.createElement("canvas");
    c.width=Math.max(1,Math.round(w0*s));c.height=Math.max(1,Math.round(h0*s));
    const x=c.getContext("2d");x.fillStyle="#fff";x.fillRect(0,0,c.width,c.height);x.drawImage(bmp,0,0,c.width,c.height);
    const d=c.toDataURL("image/jpeg",q);if(d.length<400000)return d;
  }
  throw new Error("That picture is too large.");
}

async function unzip(buf){
  const dv=new DataView(buf),u8=new Uint8Array(buf),td=new TextDecoder();
  let e=u8.length-22;while(e>=0&&dv.getUint32(e,true)!==0x06054b50)e--;
  if(e<0)throw new Error("This is not a valid .docx file. Save it as .docx from Word and try again.");
  const n=dv.getUint16(e+10,true);let p=dv.getUint32(e+16,true);const files={};
  for(let i=0;i<n;i++){
    if(dv.getUint32(p,true)!==0x02014b50)break;
    const method=dv.getUint16(p+10,true),csize=dv.getUint32(p+20,true),nl=dv.getUint16(p+28,true),el=dv.getUint16(p+30,true),cl=dv.getUint16(p+32,true),lo=dv.getUint32(p+42,true);
    files[td.decode(u8.subarray(p+46,p+46+nl))]={method,csize,lo};p+=46+nl+el+cl;
  }
  return async name=>{
    const f=files[name];if(!f)return null;
    const nl=dv.getUint16(f.lo+26,true),el=dv.getUint16(f.lo+28,true),st=f.lo+30+nl+el,data=u8.subarray(st,st+f.csize);
    if(f.method===0)return data;
    if(f.method!==8)throw new Error("This Word file uses an unsupported format.");
    if(typeof DecompressionStream==="undefined")throw new Error("This browser is too old to read Word files. Use a recent Chrome or Safari (16.4+).");
    const s=new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    return new Uint8Array(await new Response(s).arrayBuffer());
  };
}

function numbering(x){
  const abs={},map={};
  for(const a of x.getElementsByTagName("w:abstractNum")){
    const id=a.getAttribute("w:abstractNumId");abs[id]={};
    for(const l of a.getElementsByTagName("w:lvl")){const f=l.getElementsByTagName("w:numFmt")[0];abs[id][l.getAttribute("w:ilvl")]=f?f.getAttribute("w:val"):"decimal"}
  }
  for(const n of x.getElementsByTagName("w:num")){const a=n.getElementsByTagName("w:abstractNumId")[0];if(a)map[n.getAttribute("w:numId")]=a.getAttribute("w:val")}
  return {abs,map};
}
const on=el=>el&&!["0","false","none"].includes((el.getAttribute("w:val")||"").toLowerCase());

/* returns {lines:[{text,hl,imgs:[dataUrl]}], warns:[]} */
export async function readDocx(file){
  const read=await unzip(await file.arrayBuffer()),td=new TextDecoder();
  const xml=b=>new DOMParser().parseFromString(td.decode(b),"application/xml");
  const body=await read("word/document.xml");
  if(!body)throw new Error("Could not find the text inside this Word file.");
  const doc=xml(body),rels={},warns=[];
  const rb=await read("word/_rels/document.xml.rels");
  if(rb)for(const r of xml(rb).getElementsByTagName("Relationship"))rels[r.getAttribute("Id")]=r.getAttribute("Target");
  const nb=await read("word/numbering.xml"),nums=nb?numbering(xml(nb)):null;
  const counters={},lines=[];
  for(const p of doc.getElementsByTagName("w:p")){
    let text="",chars=0,bold=0,ul=0;
    for(const r of p.getElementsByTagName("w:r")){
      let t="";
      for(const c of r.childNodes){const n=c.nodeName;if(n==="w:t")t+=c.textContent;else if(n==="w:tab")t+=" ";else if(n==="w:br")t+="\n"}
      if(!t)continue;text+=t;
      const k=t.replace(/\s/g,"").length;if(!k)continue;
      const rp=r.getElementsByTagName("w:rPr")[0];chars+=k;
      if(rp&&on(rp.getElementsByTagName("w:b")[0]))bold+=k;
      if(rp&&rp.getElementsByTagName("w:u")[0]&&on(rp.getElementsByTagName("w:u")[0]))ul+=k;
    }
    /* automatic list numbers (1. 2. 3. / A. B. C.) are not stored as text in Word files */
    let label="";
    const np=p.getElementsByTagName("w:numPr")[0];
    if(np&&nums){
      const nid=np.getElementsByTagName("w:numId")[0]?.getAttribute("w:val"),il=np.getElementsByTagName("w:ilvl")[0]?.getAttribute("w:val")||"0";
      if(nid&&nid!=="0"){
        const fmt=nums.abs[nums.map[nid]]?.[il]||"decimal",c=counters[nid]||(counters[nid]={});
        c[il]=(c[il]||0)+1;for(const k of Object.keys(c))if(+k>+il)c[k]=0;
        const n=c[il];
        label=fmt==="decimal"?n+". ":fmt==="upperLetter"?String.fromCharCode(64+((n-1)%26)+1)+". ":fmt==="lowerLetter"?String.fromCharCode(96+((n-1)%26)+1)+". ":"";
      }
    }
    const imgs=[];
    const refs=[...p.getElementsByTagName("a:blip")].map(b=>b.getAttribute("r:embed")).concat([...p.getElementsByTagName("v:imagedata")].map(b=>b.getAttribute("r:id")));
    for(const rid of refs){
      const tg=rels[rid];if(!tg)continue;
      try{
        const bytes=await read("word/"+tg.replace(/^\/?(word\/)?/,""));
        if(bytes)imgs.push(await imgToData(new Blob([bytes])));
      }catch{warns.push("A picture could not be read (unsupported type) and was skipped.")}
    }
    text=text.trim();
    if(!text&&!imgs.length)continue;
    lines.push({text:text?(label+text).trim():"",hl:chars>0&&(bold===chars||ul===chars),imgs});
  }
  return {lines,warns:[...new Set(warns)]};
}
