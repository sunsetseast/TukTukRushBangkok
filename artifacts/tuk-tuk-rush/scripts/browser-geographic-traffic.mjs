/** Real browser smoke for source-verified Bangkok AI traffic and its UI.
 * It checks actual WebGL React rendering/controls with software Chromium,
 * NOT a claim of physical iPhone GPU performance or measured signal timings.
 */
import fs from "node:fs";
import assert from "node:assert/strict";
import {chromium} from "playwright";
import {startQaServer} from "./browser-vite.mjs";

const output=new URL("../../../docs/qa/geographic-traffic/",import.meta.url);
fs.mkdirSync(output,{recursive:true});
const port=24822;
const server=await startQaServer(port);
let browser;
const report={
  environment:"Headless Chromium SwiftShader WebGL; not a real iPhone",
  checks:[],before:{},on:{},off:{},restarted:{},errors:[],
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
  page.on("pageerror",e=>report.errors.push(e.message));
  await page.goto(`http://127.0.0.1:${port}/?world=geographic&geographyQA=1&geoTraffic=1`);
  await page.getByTestId("button-free-roam").waitFor({timeout:120000});
  const toggle=page.getByTestId("geographic-traffic-toggle");
  await page.getByRole('button',{name:'Settings',exact:true}).click();
  assert.equal(await toggle.getAttribute("aria-pressed"),"true");
  await page.getByRole('button',{name:'Close settings',exact:true}).click();
  await page.getByTestId("button-free-roam").click();
  await page.waitForFunction(()=>window.__geography?.snapshot?.phase==="playing",
    undefined,{timeout:60000});
  await page.waitForFunction(()=>window.__geographicTraffic?.sourceMatchedControls>0,
    undefined,{timeout:90000});
  report.before=await page.evaluate(()=>({
    sources:window.__geographicTraffic.sourceMatchedControls,
    restrictions:window.__geographicTraffic.sourceTurnRestrictions,
    drawBatches:window.__geographicTraffic.drawBatches,
  }));
  assert(report.before.sources>=1,"At least one real OSM signal must control traffic");
  assert(report.before.restrictions>0,"Real OSM turn restrictions required");
  assert(report.before.drawBatches>=18 && report.before.drawBatches<=24);
  report.checks.push("real-OSM-signals-in-runtime","batched-Thai-car-art-in-WebGL");

  await page.waitForFunction(()=>window.__geographicTraffic?.active>0,
    undefined,{timeout:30000});
  report.on=await page.evaluate(()=>({
    fleet:window.__geographicTraffic.active,
    actors:window.__geographicTraffic.actors,
  }));
  assert(report.on.fleet>0&&report.on.fleet<=16,"Mobile traffic count must be bounded");
  assert(report.on.actors.every(v=>Number.isFinite(v.x)&&Number.isFinite(v.z)));
  report.checks.push("actual-road-traffic-spawns");

  await page.screenshot({path:new URL("living-traffic-software-webgl.png",output).pathname});
  await page.getByRole('button',{name:'Settings',exact:true}).click();
  await toggle.click();
  await page.getByRole('button',{name:'Close settings',exact:true}).click();
  await page.getByRole('button',{name:'Resume drive',exact:true}).click();
  assert.equal(await toggle.getAttribute("aria-pressed"),"false");
  await page.waitForFunction(()=>window.__geographicTraffic?.active===0,
    undefined,{timeout:30000});
  report.off=await page.evaluate(()=>({
    fleet:window.__geographicTraffic.active,
    actors:window.__geographicTraffic.actors.length,
  }));
  assert.equal(report.off.fleet,0);
  assert.equal(report.off.actors,0);
  report.checks.push("traffic-off-clears-moving-fleet");

  await page.getByRole('button',{name:'Settings',exact:true}).click();
  await toggle.click();
  await page.getByRole('button',{name:'Close settings',exact:true}).click();
  await page.getByRole('button',{name:'Resume drive',exact:true}).click();
  assert.equal(await toggle.getAttribute("aria-pressed"),"true");
  await page.waitForFunction(()=>window.__geographicTraffic?.active>0,
    undefined,{timeout:30000});
  report.restarted=await page.evaluate(()=>({
    fleet:window.__geographicTraffic.active,
  }));
  report.checks.push("traffic-on-repopulates-roads");
  assert.deepEqual(report.errors,[],"No browser-side uncaught exceptions");
  fs.writeFileSync(new URL("browser-traffic-report.json",output),
    JSON.stringify(report,null,2)+"\n");
  console.log(JSON.stringify(report,null,2));
}finally{
  await browser?.close();
  server.kill();
}
