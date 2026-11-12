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
  if(bytes.length>50*1024*1024) throw Error('Wordファイルは50MB以下にしてください。');
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

export function buildZipReview(data, {url, designLabel, customerId, companyId, mvLabels = []}, images = new Map()) {
  const text = value => typeof value === 'string' && value.trim() ? value : '未入力';
  const site = data.site, clinic = data.clinicInfo;
  const details = [
    ['医院名', text(site.clinicName)], ['公開URL', url],
    ['開院日', text(site.openDate)], ['開院のお知らせ', text(site.kokuchiTitle)],
    ['内覧会などの見出し', text(site.kokuchiSubtitle)], ['内覧会などの日時', text(site.kokuchiSubDate)],
    ['電話番号', text(clinic.tel)], ['住所', text(clinic.address)],
    ['デザイン', designLabel], ['お客様ID', customerId], ['自社ID', companyId], ['管理画面URL', url + 'admin/'],
  ].map(([label, value]) => ({label, value}));
  const imageRow = (label, path) => !path
    ? {label, value:'未設定（任意）', state:'empty'}
    : images.has(path)
      ? {label, value:'選択済み・ZIPに同梱', state:'selected'}
      : {label, value:'画像ファイルがありません。選び直してください。', state:'missing'};
  const imageRows = [imageRow('ロゴ画像', site.logoUpload), imageRow('favicon画像', site.faviconUpload)];
  for (const [i, mv] of data.mv.images.entries()) {
    if (mv.upload) imageRows.push(imageRow('メインビジュアル ' + (i + 1), mv.upload));
    else {
      // Match the public renderer: an unknown legacy preset falls back to A.
      const n = Number(/^preset-mv-([123])\.svg$/.exec(mv.preset)?.[1] || 1) - 1;
      imageRows.push({label:'メインビジュアル ' + (i + 1), value:'テンプレート背景 ' + String.fromCharCode(65 + n) + (mvLabels[n] ? '：' + mvLabels[n] : ''), state:'preset'});
    }
  }
  if (!data.greeting.doctors.length) imageRows.push({label:'医師写真', value:'医師紹介の登録なし', state:'empty'});
  for (const [i, doctor] of data.greeting.doctors.entries()) imageRows.push(imageRow('医師写真 ' + (i + 1) + (doctor.name ? '：' + doctor.name : ''), doctor.imageUpload));
  if (!data.background.items.length) imageRows.push({label:'特徴の画像', value:'特徴の登録なし', state:'empty'});
  for (const [i, item] of data.background.items.entries()) imageRows.push(imageRow('特徴の画像 ' + (i + 1) + (item.title ? '：' + item.title : ''), item.imageUpload));
  return {details, images:imageRows, missing:imageRows.filter(row => row.state === 'missing').length};
}
