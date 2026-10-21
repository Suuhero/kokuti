import {asset, mediaRefs} from './shared.js?v=20261021';
export class ServerStore {
  async load() { const r=await fetch('api.php',{cache:'no-store'});const x=await r.json();if(!r.ok)throw Error(x.error);this.protectedMedia=new Set(x.data.mv.images.map(i=>i.upload).filter(Boolean));return x; }
  async images() {const {data}=await this.load();const result=new Map();for(const ref of mediaRefs(data)){const r=await fetch(asset(ref),{cache:'no-store'});if(r.ok)result.set(ref,await r.blob());}return result;}
  async save(data,images,revision) {
    const encoded={};
    const isCustomer=JSON.parse(document.getElementById('kokuti-runtime').textContent).role==='customer';
    for(const path of mediaRefs(data)) if(images.has(path) && !(isCustomer && this.protectedMedia?.has(path))) encoded[path]=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result.split(',')[1]);r.onerror=reject;r.readAsDataURL(images.get(path));});
    const token=JSON.parse(document.getElementById('kokuti-runtime').textContent).csrf;
    const r=await fetch('api.php',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':token},body:JSON.stringify({data,images:encoded,revision})});
    const x=await r.json();if(!r.ok)throw Error(x.error);return x;
  }
  async reset() {throw Error('公開サイトは初期化できません。');}
}
