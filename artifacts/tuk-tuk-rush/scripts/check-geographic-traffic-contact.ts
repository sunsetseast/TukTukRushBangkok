import assert from "node:assert/strict";
import {
  playerTrafficContact,
  resolvePlayerTrafficContact,
  type PlayerTrafficPose,
} from "../src/game/bangkok/geographic/trafficContact";
import type { TrafficVehicle } from "../src/game/bangkok/geographic/traffic";

const car:TrafficVehicle={
  id:1,kind:"taxi",edge:4,from:10,to:11,progress:7,
  speed:5,x:100,z:100,y:0,heading:0,stoppedSeconds:0,
};
const pose=(x:number,z:number,y=0,speed=8):PlayerTrafficPose=>({
  x,z,y,heading:0,speed,
});
assert.equal(playerTrafficContact(pose(100,100),[car]),car,
  "Contact with car at same elevation");
assert.equal(playerTrafficContact(pose(100,102),[car]),car,
  "Vehicle front and player nose overlap");
assert.equal(playerTrafficContact(pose(100,104),[car]),undefined,
  "No traffic collisions at a distance");
assert.equal(playerTrafficContact(pose(103,100),[car]),undefined,
  "Opposing separated lanes must not be treated as collisions");
assert.equal(playerTrafficContact(pose(100,100,2),[car]),undefined,
  "A flyover/tunnel at a different grade must not stop the player");
const near=pose(100,98.9),lastSafe={x:100,z:97.3,y:0};
assert.equal(resolvePlayerTrafficContact(near,[car],lastSafe),true);
assert.equal(near.x,lastSafe.x);
assert.equal(near.z,lastSafe.z);
assert(near.speed<=.3,"Impact immediately damps player velocity");
const out=pose(100,99);
assert.equal(resolvePlayerTrafficContact(out,[car],{x:100,z:95,y:0}),true);
assert.equal(out.z,99,"Never teleport the player across a long unsafe distance");
const blockedSafe=pose(100,99);
assert.equal(resolvePlayerTrafficContact(blockedSafe,[car],{x:100,z:100,y:0}),true);
assert.equal(blockedSafe.z,99,"Never replace overlap with another occupied pose");
assert.equal(resolvePlayerTrafficContact(pose(120,100),[car],undefined),false);
const motor:TrafficVehicle={...car,kind:"motorcycle",id:2};
assert.equal(playerTrafficContact(pose(101.3,100),[motor]),undefined,
  "Motorbikes should not use an over-large car-width hitbox");
assert.equal(playerTrafficContact(pose(100,100),[motor]),motor);
const turned:TrafficVehicle={...car,heading:Math.PI/2,id:3};
assert.equal(playerTrafficContact(pose(102,100),[turned]),turned,
  "Collision box must rotate with moving vehicles");
console.log({
  result:"pass",
  intersectsMovingTaxi:true, altitudeAware:true,
  headingAware:true, riderMotorcycleClearance:true,
  lastKnownRoadSafePose:true, noLongDistanceTeleport:true,
  safeTrafficToggle:true,
});
