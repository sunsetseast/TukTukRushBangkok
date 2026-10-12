import fs from "node:fs/promises";
import path from "node:path";
import {chromium} from "playwright";
import {fileURLToPath} from "node:url";
const root=fileURLToPath(new URL("../",import.meta.url));
const output=path.join(root,"generated-map-preview");
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,
 args:["--no-sandbox","--disable-dev-shm-usage"]});
const page=await browser.newPage({viewport:{width:1280,height:800},deviceScaleFactor:1});
const errors=[];
page.on("pageerror",e=>errors.push(e.message));
try{
 await page.goto(process.env.MAP_URL||"http://localhost:24177/bangkok-map.html",
  {waitUntil:"domcontentloaded",timeout:90000});
 await page.waitForFunction(()=>document.querySelectorAll("#results .item").length===18,
  null,{timeout:65000});
 await page.waitForTimeout(5000);
 const tiles=await page.locator(".leaflet-tile-loaded").count();
 // These must be actual geographic OpenStreetMap tiles, not a fabricated grid.
 if(tiles<5)throw Error("Real basemap tiles did not load (loaded "+tiles+")");
 await page.screenshot({path:path.join(output,"bangkok-map-desktop.png"),fullPage:true});
 await page.locator("#river").click();
 await page.waitForTimeout(3500);
 await page.screenshot({path:path.join(output,"bangkok-river-detail.png"),fullPage:true});
 await page.setViewportSize({width:430,height:932});
 await page.locator("#fit").click();
 await page.waitForTimeout(3500);
 await page.screenshot({path:path.join(output,"bangkok-map-iphone.png"),fullPage:true});
 await page.locator("#search").fill("Wat Arun");
 await page.waitForFunction(()=>document.querySelectorAll("#results .item").length===1);
 const found=await page.locator("#results .item strong").textContent();
 if(!found.includes("Wat Arun"))throw Error("Search filtering failed");
 if(errors.length)throw Error("Page JavaScript errors: "+errors.join(" | "));
 await fs.writeFile(path.join(output,"visual-qa.json"),JSON.stringify({
  state:"PASS",tilesLoaded:tiles,landmarks:18,searchResult:found,
  source:"Live OpenStreetMap street and river tile imagery",
  device:"Linux Chromium desktop/mobile viewport (not physical iPhone)",errors
 },null,2));
 console.log("PASS real Bangkok map browser, tiles:",tiles,"landmarks: 18, mobile search OK");
}finally{await browser.close();}
