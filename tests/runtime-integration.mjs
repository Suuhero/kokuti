// Local disposable fixture only; never deploy these credentials.
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {unzipSync} from 'fflate';import {credential} from '../assets/builder-core.js';
const root=path.resolve('dist/acceptance');await fs.mkdir(root,{recursive:true});
for(const [file,bytes]of Object.entries(unzipSync(new Uint8Array(await fs.readFile('builder/template.zip'))))){await fs.mkdir(path.dirname(path.join(root,file)),{recursive:true});await fs.writeFile(path.join(root,file),bytes);}
const users=await Promise.all(['customer','company'].map(role=>credential(role,'Local-test-'+role+'-2026!',role)));
await fs.writeFile(path.join(root,'private/config.php'),"<?php return json_decode(base64_decode('"+Buffer.from(JSON.stringify({url:'https://clinic.example/notice/',users})).toString('base64')+"'),true);");
const seed=JSON.parse(await fs.readFile('data/sample.json'));seed.mv.images[0].upload='media/protected-mv.png';
await fs.writeFile(path.join(root,'data/site.json'),JSON.stringify(seed));
const base='http://127.0.0.1:8791/dist/acceptance/';
let cookie='';async function req(p,options={}){const r=await fetch(base+p,{...options,redirect:'manual',headers:{...options.headers,...(cookie?{Cookie:cookie}:{})}});const set=r.headers.get('set-cookie');if(set)cookie=set.split(';')[0];return r;}
assert.equal((await req('admin/api.php')).status,401);
let r=await req('admin/');let text=await r.text();let csrf=text.match(/name="csrf" value="([^"]+)"/)[1];
assert.equal((await req('admin/',{method:'POST',body:new URLSearchParams({id:'customer',password:'wrong',csrf:'bad'})})).status,403);
r=await req('admin/',{method:'POST',body:new URLSearchParams({id:'customer',password:'Local-test-customer-2026!',csrf})});assert.equal(r.status,302);
r=await req('admin/');text=await r.text();csrf=JSON.parse(text.match(/<script id="kokuti-runtime"[^>]*>(.*?)<\/script>/s)[1]).csrf;
const saved=await (await req('admin/api.php')).json();
const post=async body=>req('admin/api.php',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify(body)});
assert.equal((await req('admin/api.php',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,403);
let altered=structuredClone(saved.data);altered.site.analyticsCode='<script>alert(1)</script>';
assert.equal((await post({data:altered,revision:saved.revision})).status,403);
for(const change of [d=>d.design='pattern2',d=>d.colors.main='#112233',d=>d.mv.images[0].preset='preset-mv-2.svg',d=>d.site.customCss='body{display:none}']) {
 const candidate=structuredClone(saved.data);change(candidate);assert.equal((await post({data:candidate,revision:saved.revision})).status,403);
}
assert.equal((await post({data:saved.data,revision:saved.revision,images:{'media/protected-mv.png':'aGVsbG8='}})).status,403);
altered=structuredClone(saved.data);altered.site.clinicName='保存確認クリニック';
assert.equal((await post({data:altered,revision:'stale'})).status,409);
assert.equal((await post({data:altered,revision:saved.revision,images:{'media/../../evil.php':'bad'}})).status,422);
assert.equal((await post({data:altered,revision:saved.revision,images:{'media/fake.png':Buffer.from('<?php echo 1;').toString('base64')}})).status,422);
assert.equal((await post({data:altered,revision:saved.revision,images:{'image/test.png':'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='}})).status,200);
assert.ok((await fs.stat(path.join(root,'image/test.png'))).size>0);
assert.equal((await(await req('admin/api.php')).json()).data.site.clinicName,'保存確認クリニック');
const publicHtml=await(await req('')).text();assert.equal(JSON.parse(publicHtml.match(/<script id="kokuti-site-data"[^>]*>(.*?)<\/script>/s)[1]).site.clinicName,'保存確認クリニック');assert.ok(!publicHtml.includes('noindex,nofollow'));
const sitemap=await(await req('sitemap.php')).text();assert.ok(sitemap.includes('https://clinic.example/notice/'));
await req('admin/',{method:'POST',body:new URLSearchParams({logout:'1',csrf})});assert.equal((await req('admin/api.php')).status,401);
r=await req('admin/');text=await r.text();csrf=text.match(/name="csrf" value="([^"]+)"/)[1];
assert.equal((await req('admin/',{method:'POST',body:new URLSearchParams({id:'company',password:'Local-test-company-2026!',csrf})})).status,302);
text=await(await req('admin/')).text();csrf=JSON.parse(text.match(/<script id="kokuti-runtime"[^>]*>(.*?)<\/script>/s)[1]).csrf;
const companyRecord=await(await req('admin/api.php')).json();companyRecord.data.design='pattern3';companyRecord.data.site.customCss='.site h2{letter-spacing:.06em}';
assert.equal((await post({data:companyRecord.data,revision:companyRecord.revision,images:{}})).status,200);
assert.equal((await(await req('admin/api.php')).json()).data.site.customCss,'.site h2{letter-spacing:.06em}');
await req('admin/',{method:'POST',body:new URLSearchParams({logout:'1',csrf})});
console.log('PASS: login, CSRF, customer design/colors/MV/CSS/analytics restrictions, MV overwrite rejection, company CSS save, stale-save conflict, traversal/image rejection, save/reload, public data, sitemap, logout');
// Leave only fictional demo state. Passwords are local test fixtures in ignored dist/.
