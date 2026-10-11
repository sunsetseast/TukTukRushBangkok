import fs from "node:fs/promises";
import path from "node:path";
import {fileURLToPath} from "node:url";
const root=fileURLToPath(new URL("../",import.meta.url));
const get=async p=>fs.readFile(path.join(root,p),"utf8");
let html=await get("bangkok-map.html");
const landmarks=await get("public/maps/bangkok-landmarks.geojson");
const config=await get("public/maps/bangkok-map-config.json");
const start=html.indexOf("const [data, config] = await Promise.all([");
const end=html.indexOf("const categories=",start);
if(start<0||end<start)throw Error("Map viewer's data-loading block changed");
html=html.slice(0,start)+
 "const data="+landmarks+";\nconst config="+config+";\n"+
 html.slice(end);
const dest=path.join(root,"generated-map-preview");
await fs.mkdir(dest,{recursive:true});
await fs.writeFile(path.join(dest,"bangkok-real-map.html"),html);
console.log("Created one-file Bangkok map with "+JSON.parse(landmarks).features.length+" geographic points");
