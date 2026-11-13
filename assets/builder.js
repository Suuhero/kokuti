import {designSample} from './design-controls.js';
import {renderFields,bindFields} from './builder-fields.js?v=20261111-image-errors';
import {BrowserStore} from './store.js';
import {esc, get, set, palettes, designs, mvNames, mvSVG, mvAsset, validate, jsonFile, download, mediaRefs, setImageError} from './shared.js?v=20261113-type-controls';
import {domainId,siteURL,randomPassword,credential,docxXML,emptySite,buildZipReview} from './builder-core.js?v=20261112-review';
import {zipSync,unzipSync,strToU8} from './vendor/fflate.js';
const $=s=>document.querySelector(s), store=new BrowserStore();
let data, sample, schema, images=new Map(), revision=0, step=1, endpoint=false, csrf='', aiConfigured=false, designVersion=0, designURLs=[], modelIndex=0, busy=false, svgURL='', mediaURLs=[];
const models=['gemini-3.8-flash','gemini-3.6-flash'];
const accountFields=['customer-id','customer-password','company-id','company-password','credentials-saved'];
let urlChecked=false, accountsChecked=false, publishChecked=false;
function fieldErrors(ids,errors,focus=false) {
 for(const id of ids) {
  const input=$('#'+id), errorId=id+'-error';
  let message=$('#'+errorId);
  if(!message) {
   message=document.createElement('span');message.id=errorId;message.className='field-error';message.hidden=true;
   const anchor=input.type==='checkbox' ? input.closest('label') : input.closest('.password-row') || input;
   anchor.insertAdjacentElement('afterend',message);
  }
  message.textContent=errors[id] || '';message.hidden=!errors[id];
  const descriptions=new Set((input.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean));
  if(errors[id]) {input.setAttribute('aria-invalid','true');descriptions.add(errorId);}
  else {input.removeAttribute('aria-invalid');descriptions.delete(errorId);}
  if(descriptions.size)input.setAttribute('aria-describedby',[...descriptions].join(' '));else input.removeAttribute('aria-describedby');
 }
 const invalid=ids.filter(id=>errors[id]);
 if(focus && invalid.length) {
  const input=$('#'+invalid[0]);
  input.focus({preventScroll:true});
  input.scrollIntoView({block:'center',behavior:'auto'});
  $('#validation-status').textContent=invalid.length+'か所の入力を確認してください。最初の入力欄へ移動しました。';
 } else if(!invalid.length) $('#validation-status').textContent='';
 return invalid.length===0;
}
function checkURL(focus=true) {
 urlChecked=true;
 let url='', errors={};
 if(!$('#url').value.trim())errors.url='公開URLを入力してください。';
 else try {url=siteURL($('#url').value);}catch{errors.url='https:// から始まる公開URLを入力してください。認証情報・「?」以降の検索条件・「#」以降のページ内リンクは含められません。';}
 if(focus && errors.url && step!==2)go(2);
 fieldErrors(['url'],errors,focus);
 return url;
}
function checkCredentials(focus=true) {
 accountsChecked=true;
 const errors={},ids=['customer','company'].map(k=>$('#'+k+'-id').value.trim());
 for(const [n,k] of ['customer','company'].entries()) {
  const password=$('#'+k+'-password').value;
  if(!ids[n])errors[k+'-id']='ログインIDを入力してください。';
  else if(!/^[a-zA-Z0-9_-]{3,40}$/.test(ids[n]))errors[k+'-id']='半角英数字・ハイフン・アンダースコアの3〜40文字で入力してください。';
  if(!password)errors[k+'-password']='パスワードを入力してください。';
  else if(password.length<12 || password.length>128)errors[k+'-password']='パスワードは12〜128文字で入力してください。';
 }
 if(!errors['customer-id'] && !errors['company-id'] && ids[0]===ids[1]) {
  errors['customer-id']=errors['company-id']='お客様用と自社用のIDは別にしてください。';
 }
 if(!errors['customer-password'] && !errors['company-password'] && $('#customer-password').value===$('#company-password').value) {
  errors['customer-password']=errors['company-password']='お客様用と自社用のパスワードは別にしてください。';
 }
 if(!$('#credentials-saved').checked)errors['credentials-saved']='両方のログイン情報を安全な場所に控えてから、チェックしてください。';
 if(focus && Object.keys(errors).length && step!==3)go(3);
 return fieldErrors(accountFields,errors,focus);
}
function checkPublish() {
 publishChecked=true;
 return fieldErrors(['publish-reviewed'],$('#publish-reviewed').checked ? {} : {'publish-reviewed':'掲載内容・画像・診療時間・公開URLを確認して、チェックしてください。'},true);
}
function resetFieldErrors() {
 urlChecked=false;accountsChecked=false;publishChecked=false;
 fieldErrors(['url',...accountFields,'publish-reviewed'],{});
}
function aiNotice(text,error=false){const el=$('#ai-status');el.hidden=false;el.textContent=text;el.classList.toggle('error',error);}
function status(text,error=false){$('#status').hidden=false;$('#status').textContent=text;$('#status').classList.toggle('error',error);}
function task(fn){return async ev=>{if(busy)return;busy=true;const b=ev?.currentTarget;if(b?.tagName==='BUTTON')b.disabled=true;try{await fn(ev);}catch(e){if(['ai','retry','downgrade','connect','disconnect'].includes(b?.id))aiNotice(e.message || '処理に失敗しました。',true);else status(e.message || '処理に失敗しました。',true);}finally{busy=false;if(b?.tagName==='BUTTON')b.disabled=b.id==='downgrade' && modelIndex>=models.length-1;}};}
function sync(){const oldName=data.site.clinicName;document.querySelectorAll('[data-path]').forEach(el=>set(data,el.dataset.path,el.value));data.site.logoText=data.site.clinicName;if(oldName && data.site.pageTitle.startsWith(oldName))data.site.pageTitle=data.site.clinicName+data.site.pageTitle.slice(oldName.length);if(!data.site.pageTitle)data.site.pageTitle=data.site.clinicName+'｜開院のお知らせ';}
async function persist(){sync();const r=await store.save(data,images,revision);revision=r.revision;}
function go(n){step=n;$("#validation-status").textContent="";for(let i=1;i<=4;i++)$('#step'+i).hidden=i!==n;document.querySelectorAll('.steps li').forEach((li,i)=>{li.removeAttribute('aria-current');if(i===n-1)li.setAttribute('aria-current','step');});window.scrollTo({top:0,behavior:'smooth'});$('#status').hidden=true;}
function fill(){resetFieldErrors();for(const id of ['logo','favicon']){setImageError($('#'+id),'');$('#'+id).value='';}document.querySelectorAll('[data-path]').forEach(el=>el.value=get(data,el.dataset.path)||'');renderDesign();renderMedia();renderFields($('#extra-fields'),data,schema,images);$('#content-summary').textContent=`診療時間 ${data.clinicInfo.schedules.length}件 · 医師紹介 ${data.greeting.doctors.length}名 · 診療内容 ${data.services.items.length}件 · 特徴 ${data.background.items.length}件`;}
function renderMedia(){mediaURLs.forEach(URL.revokeObjectURL);mediaURLs=[];for(const [id,key]of[['logo','logoUpload'],['favicon','faviconUpload']]){const path=data.site[key];const container=$('#'+id+'-preview');container.replaceChildren();if(images.has(path)){const url=URL.createObjectURL(images.get(path));mediaURLs.push(url);const img=document.createElement('img');img.src=url;img.alt=id==='logo'?'選択したロゴ':'選択したfavicon';container.append(img);const btn=document.createElement('button');btn.type='button';btn.textContent='取り消す';btn.onclick=()=>{data.site[key]='';const input=$('#'+id);input.value='';setImageError(input,'');renderMedia();};container.append(btn);}}}
async function renderDesign(){
 const version=++designVersion;
 $("#font-sizes").innerHTML=`${[["small","小"],["medium","中（標準）"],["large","大"]].map(([value,label])=>`<label><input type="radio" name="fontSize" data-font-size="${value}" value="${value}" ${(data.fontSize || "medium")===value ? "checked" : ""}>${label}</label>`).join("")}`;
 $('#patterns').innerHTML=designs.map(([key,name,desc])=>`<label class="design-choice"><input type="radio" name="design" data-design="${key}" value="${key}" ${data.design===key?'checked':''}>${designSample(key,data.colors)}<strong>${esc(name)}</strong><small>${esc(desc)}</small></label>`).join('');
 $('#palettes').innerHTML=palettes.map(([key,label,main,sub],i)=>`<label class="palette"><input type="radio" name="palette" data-palette="${key}" ${data.colors.preset===key?'checked':''}><span class="palette-name">${String(i+1).padStart(2,'0')} ${label}</span><span class="swatches"><i style="background:${main}"></i><i style="background:${sub}"></i></span></label>`).join('');
 try{const sources=await Promise.all([1,2,3].map(async n=>{const r=await fetch('../assets/'+mvAsset(data.design,`preset-mv-${n}.svg`),{cache:'no-cache'});if(!r.ok)throw Error();return r.text();}));if(version!==designVersion)return;designURLs.forEach(URL.revokeObjectURL);designURLs=[];$('#backgrounds').innerHTML=sources.map((source,i)=>{const preset=`preset-mv-${i+1}.svg`,url=URL.createObjectURL(new Blob([mvSVG(source,data.colors)],{type:'image/svg+xml'}));designURLs.push(url);return `<label class="preset-choice"><input type="radio" name="background" data-preset="${preset}" ${data.mv.images[0]?.preset===preset?'checked':''}><img src="${url}" alt=""><span>${String.fromCharCode(65+i)} · ${mvNames[data.design][i]}</span></label>`;}).join('');}catch{$('#backgrounds').textContent='背景を読み込めませんでした。配色を選び直すと再試行できます。';}
}
async function api(action,body){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),110000);try{const r=await fetch('./api.php?action='+action,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json','X-CSRF-Token':csrf}:{},body:body?JSON.stringify(body):undefined,cache:'no-store',signal:controller.signal});let x;try{x=await r.json();}catch{throw Error('AI接続処理から正常な応答が返りませんでした。サーバーの処理時間制限やPHPエラーを確認してください。');}if(!r.ok){const err=Error(x.error||'接続に失敗しました。');err.status=r.status;throw err;}return x;}catch(e){if(e.name==='AbortError')throw Error('応答が時間内に届きませんでした。再度試すボタンで再試行できます。');throw e;}finally{clearTimeout(timer);}}

async function ai(){sync();if(!endpoint)throw Error('この環境ではAI接続を利用できません。PHP版でAPIキーを設定してください。手入力・JSON読込・ZIP作成は利用できます。');if(!aiConfigured){$('#ai-settings').open=true;$('#api-key').focus();throw Error('Gemini APIキーが未設定です。「Geminiの接続設定」にキーを入力してください。');}if(!$('#reviewed').checked)throw Error('送信内容を確認し、チェックを入れてください。');if(!$('#source').value.trim())throw Error('Wordを選ぶか、文章を貼り付けてください。');aiNotice('Geminiで整理しています。1分ほどかかる場合があります…');try{const x=await api('generate',{text:$('#source').value,model:models[modelIndex]});const errors=validate(x.data,schema);if(errors.length)throw Error('AIの出力形式を確認できませんでした。再試行してください。');const merged=x.data;merged.design=data.design;merged.fontSize=data.fontSize || "medium";merged.colors=data.colors;merged.mv=data.mv;merged.site.logoUpload=data.site.logoUpload;merged.site.faviconUpload=data.site.faviconUpload || '';merged.site.analyticsCode='';merged.site.customCss=data.site.customCss || ''; data=merged;fill();$('#retry-row').hidden=true;go(2);status('情報を整理しました。掲載内容を確認してください。');}catch(e){$('#retry-row').hidden=false;$('#downgrade').disabled=modelIndex>=models.length-1;throw e;}}
$('#ai').onclick=task(ai);$('#retry').onclick=task(ai);$('#downgrade').onclick=task(async()=>{if(modelIndex<models.length-1)modelIndex++;$('#model').textContent=models[modelIndex];await ai();});
$('#connect').onclick=task(async()=>{if(!endpoint)throw Error('APIキーはPHP版の制作ツールで設定してください。');await api('key',{key:$('#api-key').value});aiConfigured=true;$('#api-key').value='';$('#connection').textContent='APIキーを設定しました。ブラウザを閉じるか、消去すると解除されます。';aiNotice('APIキーを設定しました。文章と確認チェックを確認して「Geminiで整理」を押してください。');});
$('#disconnect').onclick=task(async()=>{await api('key',{key:''});aiConfigured=false;$('#api-key').value='';$('#connection').textContent='APIキーは未設定です。';aiNotice('APIキーを消去しました。');});
$('#source').oninput=()=>$('#reviewed').checked=false;
$('#word').onchange=task(async()=>{const f=$('#word').files[0];if(!f)return;if(!/\.docx$/i.test(f.name))throw Error('.docx形式のWordを選んでください。');if(f.size>50*1024*1024)throw Error('Wordファイルは50MB以下にしてください。');const xml=docxXML(new Uint8Array(await f.arrayBuffer()));const doc=new DOMParser().parseFromString(xml,'application/xml');if(doc.querySelector('parsererror'))throw Error('Wordの本文を読み込めませんでした。');const texts=Array.from(doc.getElementsByTagNameNS('*','p'),p=>Array.from(p.getElementsByTagNameNS('*','t'),n=>n.textContent).join('')).filter(Boolean);const text=texts.join('\n');if(text.length>60000)throw Error('本文は60,000文字以下に分けてください。');$('#source').value=text;$('#reviewed').checked=false;status('本文を抽出しました。非公開情報を削除してから、AIで整理してください。まだAIには送信していません。');});
$('#json').onchange=task(async()=>{const f=$('#json').files[0];if(!f)return;if(f.size>2*1024*1024)throw Error('JSONは2MB以下にしてください。');const d=JSON.parse(await f.text());const errors=validate(d,schema);if(errors.length)throw Error(errors.slice(0,5).join('\n'));data=d;fill();status('JSONを読み込みました。画像ファイルは別途設定してください。');});
$('#sample').onclick=task(async()=>{if(data.site.clinicName && !confirm('入力内容を架空データに置き換えますか？'))return;data=structuredClone(sample);images=new Map();$('#url').value='https://sakura-clinic.example/';fill();status('架空データを読み込みました。実際の医院情報ではありません。');});
$('#clear').onclick=task(async()=>{if(!confirm('入力内容をクリアしますか？'))return;data=emptySite(sample);images=new Map();$('#source').value='';$('#url').value='';$('#reviewed').checked=false;fill();});
for(const [id,key]of[['logo','logoUpload'],['favicon','faviconUpload']]) {
 const input=$('#'+id);
 input.onchange=async()=>{
  const f=input.files[0];if(!f)return;
  const currentData=data,currentImages=images,current=()=>input.isConnected && data===currentData && images===currentImages && input.files[0]===f;
  setImageError(input,'');
  try {
   const ext=f.name.split('.').at(-1).toLowerCase();
   if(!(id==='favicon'?['png','ico']:['png','jpg','jpeg','webp']).includes(ext))throw Error(id==='favicon'?'faviconはPNGまたはICOを選んでください。':'画像はPNG・JPG・WebPを選んでください。');
   if(f.size>(id==='favicon'?1:5)*1024*1024)throw Error(id==='favicon'?'faviconは1MB以下にしてください。':'画像は5MB以下にしてください。');
   const bytes=new Uint8Array(await f.arrayBuffer());
   if(ext==='ico') {
    if(bytes[0]!==0||bytes[1]!==0||bytes[2]!==1||bytes[3]!==0)throw Error('ICO画像を確認してください。');
   } else {
    const bitmap=await createImageBitmap(f).catch(()=>{throw Error('画像を読み込めませんでした。別の画像を選び直してください。');});
    bitmap.close();
    if(ext==='png' && !(bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71))throw Error('PNG画像を確認してください。');
   }
   if(!current())return;
   const path='image/'+crypto.randomUUID()+'.'+ext;
   images.set(path,f);data.site[key]=path;setImageError(input,'');renderMedia();
  } catch(e) {if(current())setImageError(input,e?.name==='Error' && e.message ? e.message : '画像を読み込めませんでした。別の画像を選び直してください。');}
 };
}
$('#next1').onclick=task(async()=>{go(2);});
$('#next2').onclick=task(async()=>{sync();const url=checkURL();if(!url)return;const errors=validate(data,schema);if(errors.length)throw Error(errors.slice(0,5).join('\n'));$('#url').value=url;if(!$('#customer-id').value)$('#customer-id').value=domainId(url);await persist();go(3);});
document.querySelectorAll('[data-generate]').forEach(b=>b.onclick=()=>{$('#'+b.dataset.generate+'-password').value=randomPassword();$('#credentials-saved').checked=false;if(accountsChecked)checkCredentials(false);});
document.querySelectorAll('[data-reveal]').forEach(b=>b.onclick=()=>{const el=$('#'+b.dataset.reveal+'-password');el.type=el.type==='password'?'text':'password';b.textContent=el.type==='text'?'隠す':'表示';b.setAttribute('aria-pressed',String(el.type==='text'));});
document.querySelectorAll('#step3 input:not([type=checkbox])').forEach(el=>el.oninput=()=>{$('#credentials-saved').checked=false;if(accountsChecked)checkCredentials(false);});
$('#url').addEventListener('input',()=>{if(urlChecked)checkURL(false);});
$('#credentials-saved').addEventListener('change',()=>{if(accountsChecked)checkCredentials(false);});
$('#publish-reviewed').addEventListener('change',()=>{if(publishChecked)fieldErrors(['publish-reviewed'],$('#publish-reviewed').checked ? {} : {'publish-reviewed':'掲載内容・画像・診療時間・公開URLを確認して、チェックしてください。'});});
function renderReview(){
 const summary=buildZipReview(data,{url:$('#url').value,designLabel:designs.find(d=>d[0]===data.design)[1],customerId:$('#customer-id').value.trim(),companyId:$('#company-id').value.trim(),mvLabels:mvNames[data.design]},images);
 const rows=list=>list.map(row=>`<dt>${esc(row.label)}</dt><dd${row.state ? ' class="review-'+row.state+'"' : ''}>${esc(row.value)}</dd>`).join('');
 $('#review').innerHTML=rows(summary.details);$('#review-images').innerHTML=rows(summary.images);
 $('#review-image-warning').hidden=!summary.missing;
 $('#review-image-warning').textContent=summary.missing ? '画像ファイルがない項目が'+summary.missing+'件あります。「掲載内容・画像を修正する」から選び直してください。' : '';
}
$('#next3').onclick=task(async()=>{if(!checkCredentials())return;sync();renderReview();$('#publish-reviewed').checked=false;go(4);});

document.querySelectorAll('[data-back]').forEach(b=>b.onclick=()=>go(Number(b.dataset.back)));
$('#download').onclick=task(async()=>{if(!checkPublish() || !checkCredentials())return;const errors=validate(data,schema);if(errors.length)throw Error(errors.slice(0,5).join('\n'));for(const path of mediaRefs(data))if(!images.has(path))throw Error('画像がありません：'+path+'。この画面の該当項目から画像を設定してください。');$('#download-state').textContent='パスワードを保護してZIPを生成しています…';const users=await Promise.all(['customer','company'].map(role=>credential($('#'+role+'-id').value.trim(),$('#'+role+'-password').value,role)));const response=await fetch('./template.zip',{cache:'no-cache'});if(!response.ok)throw Error('テンプレートを読み込めませんでした。ページを再読み込みしてください。');const files=unzipSync(new Uint8Array(await response.arrayBuffer()));const config={url:siteURL($('#url').value),users};const encoded=btoa(JSON.stringify(config));files['private/config.php']=strToU8("<?php\nreturn json_decode(base64_decode('"+encoded+"'), true, 512, JSON_THROW_ON_ERROR);\n");files['data/site.json']=strToU8(JSON.stringify(data,null,2));files['robots.txt']=strToU8('User-agent: *\nAllow: /\nDisallow: '+new URL(config.url).pathname+'admin/\nSitemap: '+config.url+'sitemap.xml\n');for(const path of mediaRefs(data))files[path]=new Uint8Array(await images.get(path).arrayBuffer());download('kokuti-'+domainId(config.url)+'.zip',new Blob([zipSync(files,{level:6})],{type:'application/zip'}));$('#download-state').textContent='ダウンロードを開始しました。解凍した中身をFTPで配置してください。';});
async function init(){try{[sample,schema]=await Promise.all([jsonFile('data/sample.json'),jsonFile('data/schema.json')]);const saved=await store.load();revision=saved.revision;data=revision? saved.data:emptySite(sample);images=await store.images();fill();try{const x=await api('status');csrf=x.csrf;endpoint=true;aiConfigured=x.configured;$('#connection').textContent=x.configured?'Gemini APIキーを設定済みです。':'Gemini APIキーを設定するとAI整理を試せます。';}catch{$('#connection').textContent=location.hostname.endsWith('github.io')?'GitHub PagesではAI接続は動作しません。PHP版を開いてください。Word抽出・手入力・ZIP作成はここで利用できます。':'AIの接続確認に失敗しました。PHPサーバーの起動を確認して再読み込みしてください。';$('#api-key').disabled=true;$('#connect').disabled=true;$('#disconnect').disabled=true;}}catch(e){status(e.message,true);}}
$("#font-sizes").onchange=ev=>{if(ev.target.dataset.fontSize)data.fontSize=ev.target.dataset.fontSize;};
$('#patterns').onchange=ev=>{if(ev.target.dataset.design){data.design=ev.target.dataset.design;renderDesign();}};
$('#palettes').onchange=ev=>{if(ev.target.dataset.palette){const [preset,,main,sub]=palettes.find(p=>p[0]===ev.target.dataset.palette);data.colors={preset,main,sub,text:'#333333'};renderDesign();}};
$('#backgrounds').onchange=ev=>{if(ev.target.dataset.preset){data.mv.images=[{preset:ev.target.dataset.preset,upload:''}];}};
bindFields($('#extra-fields'),{getData:()=>data,getSchema:()=>schema,getImages:()=>images,refresh:()=>renderFields($('#extra-fields'),data,schema,images),onError:message=>status(message,true)});
init();
