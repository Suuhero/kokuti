import fs from 'node:fs/promises';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),out=path.join(root,'dist/pages');
await fs.mkdir(out,{recursive:true});
// Explicit allow-list: publish only demo files.
for(const file of ['index.html','admin','assets','.nojekyll'])await fs.cp(path.join(root,file),path.join(out,file),{recursive:true});
await fs.mkdir(path.join(out,'data'),{recursive:true});
for(const file of ['sample.json','schema.json','AIプロンプト.txt'])await fs.copyFile(path.join(root,'data',file),path.join(out,'data',file));
for(const file of ['site.json','auth.json']){try{await fs.access(path.join(out,'data',file));throw Error('本番用データが配布物に含まれています: '+file);}catch(e){if(e.code!=='ENOENT')throw e;}}
console.log('Pages demo built: dist/pages');
