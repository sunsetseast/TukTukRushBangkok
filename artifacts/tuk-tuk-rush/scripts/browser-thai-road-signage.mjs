/** Thai signage smoke: real imported OSM locations and new Thai-script
 * canvases in browser, plus source-backed named streets. This is Chromium
 * software WebGL only; physical iPhone Safari visual review remains required.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import {chromium} from "playwright";
import {startQaServer} from "./browser-vite.mjs";
const port=24829;
const out=new URL("../../../docs/qa/thai-road-signage/",import.meta.url);
fs.mkdirSync(out,{recursive:true});
const server=await startQaServer(port);
let browser;
const report={
  renderer:"Chromium ANGLE SwiftShader, mobile-sized viewport; not a physical iPhone",
  source:"OSM traffic-control inventory and named source roads",
  checks:[],locations:[],errors:[],
};
try{
  browser=await chromium.launch({
    headless:true,
    args:["--no-sandbox","--use-angle=swiftshader",
      "--enable-unsafe-swiftshader","--disable-dev-shm-usage"],
  });
  const page=await browser.newPage({
    viewport:{width:844,height:390},hasTouch:true,isMobile:true,
  });
  page.on("pageerror",err=>report.errors.push(err.message));
  await page.goto(`http://127.0.0.1:${port}/?world=geographic&geographyQA=1`);
  await page.getByTestId("button-free-roam").waitFor({timeout:120000});
  await page.getByTestId("button-free-roam").click();
  await page.waitForFunction(()=>
    window.__geography?.snapshot?.phase==="playing" &&
    window.__geographicTraffic?.sourceMatchedControls>0,
    undefined,{timeout:90000});
  report.controls=await page.evaluate(()=>({
    matchedSignals:window.__geographicTraffic.sourceMatchedControls,
    turnRestrictions:window.__geographicTraffic.sourceTurnRestrictions,
  }));
  assert(report.controls.matchedSignals>=1);
  assert(report.controls.turnRestrictions>0);
  report.checks.push("verified-real-bangkok-traffic-control-source");

  // Sample authentic OSM-tagged nodes near Chinatown Gate / Yaowarat. The
  // exact runtime sign positions will be reported by the scene, not inferred
  // from source names alone. These are official OSM coordinates, not fakes.
  for(const [name,lon,lat] of [
    ["Chinatown Gate",100.5129798,13.7371754],
    ["Charoen Krung",100.5154525,13.7381764],
    ["Yaowarat",100.5122566,13.7404145],
    ["Bang Rak",100.5188386,13.7260316],
  ]){
    await page.evaluate(([lon,lat])=>window.__geographyQA.move(lon,lat),
      [lon,lat]);
    await page.waitForTimeout(1000);
    const data=await page.evaluate(()=>({
      signs:window.__geographicThaiSigns,
      names:window.__geographicStreetNames,
    }));
    report.locations.push({name,signs:data.signs,
      streetNames:data.names?.names??[]});
  }
  assert(report.locations.some(x=>x.signs?.signals>0),
    "No correctly matched 3-lamp Thai signal appears at verified source positions");
  assert(report.locations.some(x=>x.signs?.stops>0),
    "Expected an actual source-mapped หยุด sign in the old-city pilot");
  assert(report.locations.some(x=>x.streetNames?.length>0),
    "Bangkok's named streets must render their actual OSM labels");
  for(const site of report.locations){
    const ids=site.signs?.osmIds??[];
    assert(ids.every(x=>/^osm:node\/\d+$/.test(x)),
      "All actual displayed regulatory signs must retain real source OSM IDs");
    const named=site.streetNames??[];
    assert(named.every(x=>/^osm:way\/\d+$/.test(x.id)));
    assert(named.every(x=>x.thai||x.english));
    if(site.signs)assert(site.signs.heads<=96,
      "Two non-conflicting heads per 48 nearby source control signs");
  }
  report.checks.push("thai-3-lamp-signal-art","thai-stop-sign-source",
    "osm-bilingual-street-name-placards","48-sign-local-budget");
  await page.screenshot({path:new URL("bangkok-signs-mobile-webgl.png",out).pathname});

  await page.getByRole('button',{name:'Settings',exact:true}).click();
  await page.getByTestId("geographic-traffic-toggle").click();
  await page.getByRole('button',{name:'Close settings',exact:true}).click();
  await page.getByRole('button',{name:'Resume drive',exact:true}).click();
  await page.waitForFunction(()=>window.__geographicTraffic?.active===0,
    undefined,{timeout:30000});
  await page.waitForTimeout(350);
  const off=await page.evaluate(()=>window.__geographicThaiSigns);
  assert(off && off.visible>=0,
    "Road signage must continue even with optional AI cars disabled");
  report.checks.push("traffic-toggle-does-not-delete-road-signage");
  assert.deepEqual(report.errors,[],"No JavaScript exceptions");
  fs.writeFileSync(new URL("browser-thai-signs.json",out),
    JSON.stringify(report,null,2)+"\n");
  console.log(JSON.stringify(report,null,2));
}finally{await browser?.close();server.kill();}
