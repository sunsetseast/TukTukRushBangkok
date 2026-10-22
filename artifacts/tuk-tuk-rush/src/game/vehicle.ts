import type { District, Input, TrafficCar, Vehicle } from './types';
import { nearestRoad, obstacleLocal, obstacleDistance } from './world';
import { blockedByRiver } from './bangkok/world';
import { physicsObstacleIndex } from './bangkok/clearanceIndex';
import { BOOST_ACCELERATION, BOOST_SPEED_CAP } from './boost';
import { VEHICLE_COLLISION_RADIUS, STEERING_RESPONSE, steeringYawRate } from './vehicleEnvelope';
import { YAOWARAT_TRACE } from './mapData';

export function createVehicle(district?: District): Vehicle {
  if (district?.spawn) return { ...district.spawn, speed: 0, steer: 0, lean: 0, wheelSpin: 0, collision: 0 };
  const a = YAOWARAT_TRACE[2]!, b = YAOWARAT_TRACE[3]!;
  const heading = Math.atan2(b.x - a.x, b.z - a.z);
  return { x: a.x, z: a.z, heading, speed: 0, steer: 0, lean: 0, wheelSpin: 0, collision: 0 };
}

export type VehicleContact = {
  kind: 'static' | 'traffic' | 'water' | 'boundary';
  x: number; z: number; heading: number; speed: number;
  obstacle?: District['obstacles'][number]; trafficId?: number;
  normal?: { x: number; z: number }; penetration?: number;
};

export class VehicleController {
  /** Optional QA/inspector observer. No event allocation when not observed;
   * collision resolution, cooldown and steering remain production physics. */
  constructor(private readonly observeContact?: (contact: VehicleContact) => void) {}
  private vx = 0;
  private vz = 0;
  update(player: Vehicle, input: Input, district: District, traffic: TrafficCar[], dt: number) {
    // Fixed small substeps avoid tunnelling through narrow walls at arcade speed.
    const steps = Math.max(1, Math.ceil(dt / (1 / 90)));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) this.step(player, input, district, traffic, h);
  }
  private step(p: Vehicle, input: Input, district: District, traffic: TrafficCar[], dt: number) {
    p.collision = Math.max(0, p.collision - dt * 2);
    p.steer += (input.steer - p.steer) * Math.min(1, dt * STEERING_RESPONSE);
    const oldX = p.x, oldZ = p.z;
    let speed = this.vx * Math.sin(p.heading) + this.vz * Math.cos(p.heading);
    if (input.brake) speed += (speed > 0.6 ? -27 : -9) * dt;
    else if (input.gas) speed += 14 * (input.boost ? BOOST_ACCELERATION : 1) * dt;
    else speed *= Math.exp(-dt * 0.7);
    speed *= Math.exp(-dt * 0.16);
    speed = Math.max(-8, Math.min(input.boost ? BOOST_SPEED_CAP : Math.max(31, speed * Math.exp(-dt * .65)), speed));
    if (Math.abs(speed) < 0.08 && !input.gas && !input.brake) speed = 0;
    // A blocked tuk-tuk must still be steerable while creeping or reversing.
    const steeringSpeed = Math.max(Math.abs(speed), p.collision > 0.05 && (input.gas || input.brake) ? 2.2 : 0);
    const turn = p.steer * Math.min(steeringSpeed / 5, 1) * steeringYawRate(speed) * Math.sign(speed || (input.brake ? -1 : 1));
    p.heading -= turn * dt;
    const forwardX = Math.sin(p.heading), forwardZ = Math.cos(p.heading);
    const sideX = Math.cos(p.heading), sideZ = -Math.sin(p.heading);
    // A little lateral momentum creates a controllable skid, not a tipping trike.
    const lateral = (this.vx * sideX + this.vz * sideZ) * Math.exp(-dt * (input.brake ? 3.2 : 6.5));
    this.vx = forwardX * speed + sideX * lateral;
    this.vz = forwardZ * speed + sideZ * lateral;
    p.x += this.vx * dt; p.z += this.vz * dt;
    const radius = VEHICLE_COLLISION_RADIUS;
    let collided = false;
    const index=district.worldId==='bangkok'?physicsObstacleIndex(district):undefined;
    let candidates=index?.query(p),cursor=0,last=-1;
    while(cursor<(candidates?.length??district.obstacles.length)){
      const item=candidates?candidates[cursor++]!:cursor++;if(item<=last)continue;last=item;const b=district.obstacles[item]!;
      const q = obstacleLocal(p, b);
      if (Math.abs(q.x) > b.w / 2 + radius || Math.abs(q.z) > b.d / 2 + radius) continue;
      const nearestX = Math.max(-b.w / 2, Math.min(q.x, b.w / 2));
      const nearestZ = Math.max(-b.d / 2, Math.min(q.z, b.d / 2));
      const dx = q.x - nearestX, dz = q.z - nearestZ;
      const distance = Math.hypot(dx, dz);
      if (distance >= radius) continue;
      // Resolve overlap along a contact normal, never teleport back into the wall.
      // A deeply embedded circle uses the closest exit face of the oriented box.
      let lx: number, lz: number, penetration: number;
      if (distance > 0.001) {
        lx = dx / distance; lz = dz / distance;
        penetration = radius - distance;
      } else {
        const gapX = Math.max(0, b.w / 2 - Math.abs(q.x));
        const gapZ = Math.max(0, b.d / 2 - Math.abs(q.z));
        if (gapX <= gapZ) {
          lx = Math.sign(q.x || oldX - b.x || 1); lz = 0;
          penetration = radius + gapX;
        } else {
          lx = 0; lz = Math.sign(q.z || oldZ - b.z || 1);
          penetration = radius + gapZ;
        }
      }
      const c = Math.cos(b.yaw ?? 0), s = Math.sin(b.yaw ?? 0);
      const nx = c * lx + s * lz, nz = -s * lx + c * lz;
      p.x += nx * (penetration + 0.002);
      p.z += nz * (penetration + 0.002);
      // Remove only velocity into the obstacle. Retain the tangential component
      // so the player can slide along walls and slowly steer/reverse to escape.
      const inward = this.vx * nx + this.vz * nz;
      if (inward < 0) {
        this.vx -= inward * nx;
        this.vz -= inward * nz;
      }
      collided = true;
      this.observeContact?.({kind:'static',x:p.x,z:p.z,heading:p.heading,speed,obstacle:b,normal:{x:nx,z:nz},penetration});
      if(index){candidates=index.query(p);cursor=0;}
    }
    for (const car of traffic) {
      const dx = p.x - car.x, dz = p.z - car.z;
      const distance = Math.hypot(dx, dz);
      const safe = car.kind === 'motorcycle' ? 2.2 : 3.1;
      if (distance < safe) {
        const nx = distance > 0.001 ? dx / distance : -Math.sin(car.heading);
        const nz = distance > 0.001 ? dz / distance : -Math.cos(car.heading);
        p.x += nx * (safe - distance + 0.002);
        p.z += nz * (safe - distance + 0.002);
        // Never halve all velocity each physics substep: that effectively freezes
        // the player against traffic. Remove inward velocity, not escape velocity.
        const inward = this.vx * nx + this.vz * nz;
        if (inward < 0) {
          this.vx -= inward * nx;
          this.vz -= inward * nz;
        }
        car.wait = Math.max(car.wait, 0.35);
        collided = true;
        this.observeContact?.({kind:'traffic',x:p.x,z:p.z,heading:p.heading,speed,trafficId:car.id,normal:{x:nx,z:nz},penetration:safe-distance});
      }
    }
    if (blockedByRiver(district, p)) { this.observeContact?.({kind:'water',x:p.x,z:p.z,heading:p.heading,speed});p.x = oldX; p.z = oldZ; this.vx = 0; this.vz = 0; collided = true; }
    const bounds = district.bounds ?? { minX: -342, maxX: 342, minZ: -342, maxZ: 342 };
    if (p.x < bounds.minX || p.x > bounds.maxX || p.z < bounds.minZ || p.z > bounds.maxZ) {
      this.observeContact?.({kind:'boundary',x:p.x,z:p.z,heading:p.heading,speed});
      p.x = Math.max(bounds.minX, Math.min(bounds.maxX, p.x)); p.z = Math.max(bounds.minZ, Math.min(bounds.maxZ, p.z));
      this.vx *= -.2; this.vz *= -.2; collided = true;
    }
    if (collided) p.collision = 1;
    p.speed = this.vx * forwardX + this.vz * forwardZ;
    p.lean += (-p.steer * Math.min(Math.abs(p.speed) / 30, 1) * 0.16 - p.lean) * Math.min(dt * 7, 1);
    p.wheelSpin += p.speed * dt / 0.38;
  }
  recover(p: Vehicle, district: District, traffic: TrafficCar[] = []) {
    const road = nearestRoad(district, p);
    p.x = road.point.x; p.z = road.point.z; p.heading = road.heading;
    // Avoid resetting directly inside a traffic vehicle.
    if (traffic.some(t => Math.hypot(t.x - p.x, t.z - p.z) < 5)) {
      p.x += Math.cos(p.heading) * 3; p.z -= Math.sin(p.heading) * 3;
    }
    p.speed = 0; p.steer = 0; p.lean = 0; p.collision = 0;
    this.vx = 0; this.vz = 0;
  }
  /** Existing career/discovery saves do not serialize a vehicle position. This
   * boundary also protects a resumed/imported session whose old pose is water
   * after an approved geography migration, without touching its progress. */
  reconcileGeography(p:Vehicle,district:District){
    if(!blockedByRiver(district,p))return false;
    const nodes=new Map(district.nodes.map(n=>[n.id,n]));
    const candidates=district.roads.flatMap(r=>{
      const a=nodes.get(r.a)!,b=nodes.get(r.b)!;
      return [0,.25,.5,.75,1].map(t=>({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,heading:Math.atan2(b.x-a.x,b.z-a.z)}));
    });
    candidates.sort((a,b)=>Math.hypot(a.x-p.x,a.z-p.z)-Math.hypot(b.x-p.x,b.z-p.z)||a.x-b.x||a.z-b.z);
    const index=district.worldId==='bangkok'?physicsObstacleIndex(district):undefined;
    const safe=candidates.find(q=>!blockedByRiver(district,q)&&(index?index.query(q).every(i=>obstacleDistance(q,district.obstacles[i]!)>=2):district.obstacles.every(o=>obstacleDistance(q,o)>=2)));if(!safe)throw Error('No dry connected road available for geography recovery');
    Object.assign(p,safe,{speed:0,steer:0,lean:0,collision:0});this.reset();return true;
  }
  reset() { this.vx = 0; this.vz = 0; }
}
