import test from 'node:test';
import assert from 'node:assert/strict';
import {domainId,siteURL,randomPassword,credential,docxXML,emptySite,buildZipReview} from '../assets/builder-core.js';
import {zipSync,strToU8,unzipSync} from 'fflate';
import fs from 'node:fs/promises';
import {validate} from '../assets/shared.js';
test('domain default and public URL reject unsafe forms',()=>{assert.equal(domainId('https://www.sakura-clinic.jp/'),'sakura-clinic');assert.equal(siteURL('https://clinic.example/notice'),'https://clinic.example/notice/');for(const u of ['http://clinic.example','https://user:pass@clinic.example/','https://clinic.example/#x','javascript:alert(1)'])assert.throws(()=>siteURL(u));});
test('password digest interoperates with PBKDF2, random passwords distinct',async()=>{const a=randomPassword(),b=randomPassword();assert.equal(a.length,20);assert.notEqual(a,b);const c=await credential('starter',a,'company');assert.equal(c.hash.length,64);assert.equal(c.iterations,600000);assert.equal(c.password,undefined);await assert.rejects(credential('bad/id',a,'customer'));});
test('DOCX extracts only bounded main document XML',()=>{const zip=zipSync({'word/document.xml':strToU8('<test>本文</test>'),'extra':strToU8('ignore')});assert.equal(docxXML(zip),'<test>本文</test>');assert.throws(()=>docxXML(zipSync({'notword':strToU8('x')})));assert.throws(()=>docxXML(zipSync({'word/document.xml':new Uint8Array(2*1024*1024+1)})));});
test('blank template removes fictitious patient-facing data',async()=>{const sample=JSON.parse(await fs.readFile(new URL('../data/sample.json',import.meta.url)));const schema=JSON.parse(await fs.readFile(new URL('../data/schema.json',import.meta.url)));const d=emptySite(sample);d.site.clinicName='テスト医院';assert.deepEqual(validate(d,schema),[]);assert.equal(JSON.stringify(d).includes('さくらまち'),false);assert.equal(d.greeting.doctors.length,0);});
test('FTP template has protected production paths and excludes builder/key/sample',async()=>{const files=unzipSync(new Uint8Array(await fs.readFile(new URL('../builder/template.zip',import.meta.url))));for(const f of ['admin/index.php','admin/api.php','private/.htaccess','data/.htaccess','media/.htaccess','image/.htaccess','sitemap.php'])assert.ok(files[f],f);for(const f of ['builder/api.php','data/sample.json','private/config.php','data/site.json'])assert.equal(files[f],undefined);assert.ok(!Object.keys(files).some(k=>k.includes('builder')||k.includes('node_modules')));});

test('DOCX accepts 50MB including media and rejects larger files',()=>{const limit=50*1024*1024;const xml=strToU8('<test>本文</test>');const pack=n=>zipSync({'word/document.xml':xml,'word/media/image.bin':new Uint8Array(n)},{level:0});const overhead=pack(0).length;const exact=pack(limit-overhead);assert.equal(exact.length,limit);assert.equal(docxXML(exact),'<test>本文</test>');assert.throws(()=>docxXML(new Uint8Array(limit+1)),/50MB/);});


test('ZIP review reports current publication details without exposing passwords',async()=>{
 const data=JSON.parse(await fs.readFile(new URL('../data/sample.json',import.meta.url)));
 data.site.openDate='2028年5月6日';data.site.kokuchiSubDate='5月1日 10:00〜';data.clinicInfo.tel='012-345-6789';data.clinicInfo.address='変更した住所';
 const opts={url:'https://clinic.example/notice/',designLabel:'パターン2',customerId:'clinic',companyId:'starter',customerPassword:'private-customer-password',companyPassword:'private-company-password'};
 const review=buildZipReview(data,opts),values=Object.fromEntries(review.details.map(row=>[row.label,row.value]));
 assert.equal(values['開院日'],'2028年5月6日');assert.equal(values['内覧会などの日時'],'5月1日 10:00〜');assert.equal(values['電話番号'],'012-345-6789');assert.equal(values['住所'],'変更した住所');assert.equal(values['管理画面URL'],'https://clinic.example/notice/admin/');
 assert.equal(JSON.stringify(review).includes('private-'),false);
 data.site.openDate='2030年1月1日';assert.equal(buildZipReview(data,opts).details.find(row=>row.label==='開院日').value,'2030年1月1日');
});

test('ZIP review distinguishes optional, selected, missing images and MV presets',async()=>{
 const data=JSON.parse(await fs.readFile(new URL('../data/sample.json',import.meta.url)));
 data.site.logoUpload='image/logo.png';data.site.faviconUpload='';data.mv.images=[{preset:'preset-mv-2.svg',upload:''},{preset:'preset-mv-3.svg',upload:'image/mv.png'}];data.greeting.doctors[0].imageUpload='image/doctor.png';data.background.items[0].imageUpload='image/feature.png';
 const options={url:'https://clinic.example/',designLabel:'パターン1',customerId:'clinic',companyId:'starter',mvLabels:['背景A','背景B','背景C']};
 const review=buildZipReview(data,options,new Map([['image/logo.png',new Blob()],['image/feature.png',new Blob()]])),rows=review.images;
 assert.equal(rows.find(row=>row.label==='ロゴ画像').state,'selected');assert.equal(rows.find(row=>row.label==='favicon画像').state,'empty');assert.equal(rows.find(row=>row.label==='メインビジュアル 1').value,'テンプレート背景 B：背景B');assert.equal(rows.find(row=>row.label==='メインビジュアル 2').state,'missing');assert.equal(rows.find(row=>row.label.startsWith('医師写真 1')).state,'missing');assert.equal(rows.find(row=>row.label.startsWith('特徴の画像 1')).state,'selected');assert.equal(review.missing,2);
 const blank=buildZipReview(emptySite(data),options);assert.equal(blank.details.find(row=>row.label==='開院日').value,'未入力');assert.equal(blank.images.find(row=>row.label==='医師写真').value,'医師紹介の登録なし');
});
