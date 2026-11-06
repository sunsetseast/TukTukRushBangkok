/** Use committed schema4 geometry for runtime-only QA; no 471-chunk rebuild. */
import fs from 'node:fs';
const dir=new URL('../public/assets/geography/compiled/',import.meta.url);
for(const name of fs.readdirSync(dir))if(name.endsWith('.bin.gz')){
 const dest=new URL(name.replace('.gz','.pack'),dir);
 if(!fs.existsSync(dest))fs.copyFileSync(new URL(name,dir),dest);
}
