import { unzipSync, strFromU8 } from './vendor/fflate.js';
export function domainId(value) {
  try { return new URL(value).hostname.replace(/^www\./i,'').split('.')[0].replace(/[^a-z0-9_-]/gi,'').slice(0,40); } catch { return ''; }
}
export function siteURL(value) {
  const u = new URL(value);
  if (u.protocol !== 'https:' || u.username || u.password || u.search || u.hash || !u.hostname.includes('.')) throw Error('公開URLは https:// から始まるドメイン・設置先フォルダを入力してください。');
  if (!u.pathname.endsWith('/')) u.pathname += '/';
  return u.href;
}
export function randomPassword() {
  const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@-_=+';
  const out=[];
  while(out.length<20) { const bytes=crypto.getRandomValues(new Uint8Array(32)); for(const n of bytes) if(n<Math.floor(256/alphabet.length)*alphabet.length && out.length<20) out.push(alphabet[n%alphabet.length]); }
  return out.join('');
}
export async function credential(id,password,role) {
  if(!/^[a-zA-Z0-9_-]{3,40}$/.test(id)) throw Error('IDは半角英数字・ハイフン・アンダースコアの3〜40文字で入力してください。');
  if(password.length<12 || password.length>128) throw Error('パスワードは12〜128文字で入力してください。');
  const salt=Array.from(crypto.getRandomValues(new Uint8Array(24)),x=>x.toString(16).padStart(2,'0')).join('');
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);
  const hash=await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:new TextEncoder().encode(salt),iterations:600000},key,256);
  return {id,role,salt,iterations:600000,hash:Array.from(new Uint8Array(hash),x=>x.toString(16).padStart(2,'0')).join('')};
}
export function docxXML(bytes) {
  if(bytes.length>10*1024*1024) throw Error('Wordファイルは10MB以下にしてください。');
  let oversized=false;
  const files=unzipSync(bytes,{filter:f=> { if(f.name !== 'word/document.xml') return false; if(f.originalSize>2*1024*1024) {oversized=true;return false;} return true; }});
  if(oversized) throw Error('Wordの本文が大きすぎます。文章を分けて貼り付けてください。');
  if(!files['word/document.xml']) throw Error('対応する.docxファイルを選んでください。');
  return strFromU8(files['word/document.xml']);
}
export function emptySite(sample) {
  const d=structuredClone(sample);
  for(const k of ['clinicName','pageTitle','description','openDate','kokuchiSubtitle','kokuchiSubDate','logoText','logoUpload','analyticsCode']) d.site[k]='';
  d.site.faviconUpload=''; d.site.kokuchiTitle='開院のお知らせ';
  d.clinicInfo.address='';d.clinicInfo.tel='';d.clinicInfo.mapEmbed='';d.clinicInfo.accessItems=[];d.clinicInfo.schedules=[];
  d.greeting.doctors=[];d.services.items=[];d.background.items=[];
  d.freeAreas=d.freeAreas.map(()=>({title:'',en:'',body:''}));
  return d;
}
