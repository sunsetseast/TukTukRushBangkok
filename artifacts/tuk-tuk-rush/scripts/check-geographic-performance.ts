import assert from "node:assert/strict";
import { GeographicFrameProfiler } from "../src/game/bangkok/geographic/performance";

assert.throws(() => new GeographicFrameProfiler(0), /Invalid/);
const sample = new GeographicFrameProfiler(5);
let t = 1000;
sample.record(t);
for (const ms of [16, 17, 18, 60, 100]) { t += ms; sample.record(t); }
const v = sample.snapshot();
assert.equal(v.samples, 5);
assert.equal(v.medianMs, 18);
assert.equal(v.p95Ms, 60);
assert.equal(v.worstMs, 100);
assert.equal(v.framesOver50Ms, 2);
assert(Math.abs(v.approxFps - 1000/18) < 1e-6);
sample.record(t + 6000, false); // iPhone tab/background suspension should not fake a stall
sample.record(t + 6016);
assert.equal(sample.snapshot().worstMs, 100);
for (const ms of [16,16,16,16,16]) { t += ms; sample.record(t + 6016); }
const fresh = sample.snapshot();
assert.equal(fresh.framesOver50Ms, 0, "Rolling samples evict old spikes");
assert.equal(fresh.medianMs, 16);
sample.reset();
assert.equal(sample.snapshot().samples, 0);
sample.record(1000);
sample.record(1016);
assert.equal(sample.snapshot().samples, 1);
console.log({pass:true,frameSampling:true,backgroundExclusion:true,rollingWindow:true});
