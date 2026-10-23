import { CareerStore, ACHIEVEMENTS } from './career';
import {InspectionCamera,inspectionSubject} from './inspection';
import { TurboBoost } from './boost';
import type { GameModel, GameSnapshot, Mission } from './types';
import { createBangkokWorld, regionAt, SHIFT_SECONDS } from './bangkok/world';
import { readDiscovery, discover, type Discovery } from './bangkok/discovery';
import { destinationAt } from './bangkok/destinationAccess';
import { RailService } from './bangkok/transit/service';
import { createDistrict } from './world';
import { VehicleController, createVehicle, type VehicleContact } from './vehicle';
import { TrafficSystem } from './traffic';
import { FareDispatcher, seededRandom } from './missions';

export class GameEngine {
  readonly model: GameModel;
  readonly career: CareerStore;
  private careerSession = 0;
  private careerCheckpoint = 0;
  private sessionDistricts = 0;
  cameraRevision = 0;
  private resetCamera() { this.cameraRevision++; delete (window as typeof window & {__artCamera?: unknown}).__artCamera; }
  readonly boost = new TurboBoost();
  readonly inspection = new InspectionCamera();
  readonly railService?:RailService;
  private controller: VehicleController;
  private trafficSystem: TrafficSystem;
  private fares: FareDispatcher;
  private readonly missionSeed?: number;
  private sessions=0;
  private listeners = new Set<(s: GameSnapshot) => void>();
  private keyboard = new Set<string>();
  private publishTime = 0;
  private messageTime = 0;
  private frames = 0;
  private frameTime = 0;
  private slowTime = 0;
  private disposed = false;
  private discovery: Discovery = { regions: [], landmarks: [], shortcuts: [] };
  private discoveryTime = 0;
  private arrivalId = '';
  private storage: Storage | undefined;
  constructor(options: { world?: 'bangkok' | 'chinatown'; seed?:number; observeContact?: (contact: VehicleContact) => void } = {}) {
    this.controller = new VehicleController(options.observeContact);
    const district = options.world === 'chinatown' ? createDistrict() : createBangkokWorld();
    if(district.transit)this.railService=new RailService(district.transit);
    try { this.storage = window.localStorage; } catch { /* Browser storage is optional. */ }
    this.discovery = readDiscovery(this.storage);
    this.career = new CareerStore(this.storage);
    this.career.syncDiscovery(this.discovery.regions, this.discovery.landmarks);
    this.discovery.regions = [...new Set([...this.discovery.regions,...this.career.profile.districts])];
    this.discovery.landmarks = [...new Set([...this.discovery.landmarks,...this.career.profile.landmarks])];
    this.trafficSystem = new TrafficSystem(district);
    this.missionSeed=options.seed;
    this.fares=new FareDispatcher(district,options.seed===undefined?undefined:seededRandom(options.seed));
    const mission = this.fares.next(createVehicle(district));
    this.model = {
      district, player: createVehicle(district), traffic: this.trafficSystem.create(),
      input: { steer: 0, gas: false, brake: false }, mission, missionIndex: 0,
      snapshot: {
        elapsed: 0, districtName: regionAt(district, district.spawn ?? { x: 0, z: 0 })?.name, discoveredDistricts: [...this.discovery.regions], discoveredLandmarks: [...this.discovery.landmarks], discoveredShortcuts: [...this.discovery.shortcuts],
        phase: 'title', mode: 'shift', stage: 'pickup', shiftTime: district.worldId === 'bangkok' ? SHIFT_SECONDS : 180, tripTime: mission.limit,
        score: 0, earnings: 0, deliveries: 0, speed: 0, target: mission.pickup,
        passenger: mission.passenger, distance: 61, bearing: 0,
        message: district.worldId === 'bangkok' ? 'Explore compact Bangkok' : 'Your Chinatown shift starts here', boarding: 0, quality: 'medium', fps: 60,
      },
    };
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    document.addEventListener('visibilitychange', this.onVisibility);
    window.addEventListener('pagehide', this.onPageHide);
  }
  private onKeyDown = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null;
    if (target?.closest?.('input,select,textarea') || (target?.closest?.('button,a') && ['Enter','Space'].includes(e.code))) return;
    if(this.model.snapshot.viewingLandmark){if(e.code==='Escape'&&!e.repeat)this.resume();return;}
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyW','KeyA','KeyS','KeyD'].includes(e.code)) e.preventDefault();
    if (e.code === 'Escape' || e.code === 'KeyP') {
      if (!e.repeat) { if (this.model.snapshot.phase === 'playing') this.pause(); else if (this.model.snapshot.phase === 'paused') this.resume(); }
    }
    if (['ShiftLeft','ShiftRight','KeyB'].includes(e.code) && !e.repeat) { e.preventDefault(); this.triggerBoost(); }
    if (e.code === 'KeyR' && !e.repeat) this.recover();
    this.keyboard.add(e.code);
  };
  private onKeyUp = (e: KeyboardEvent) => { this.keyboard.delete(e.code); };
  private onPageHide = () => this.career.flush();
  private onBlur = () => { this.clearInput(); this.pause(); };
  private onVisibility = () => { if (document.hidden) { this.clearInput(); this.pause(); } };
  clearInput() { this.keyboard.clear(); Object.assign(this.model.input, { gas: false, brake: false, steer: 0 }); }
  subscribe(callback: (s: GameSnapshot) => void) {
    this.listeners.add(callback); callback({ ...this.model.snapshot });
    return () => { this.listeners.delete(callback); };
  }
  private publish() { for (const cb of this.listeners) cb({ ...this.model.snapshot }); }
  start(mode: 'shift' | 'free') {
    this.careerSession = this.career.beginSession();
    this.sessionDistricts = this.discovery.regions.length;
    this.careerNoticeTime=0;this.careerCheckpoint=0;
    this.clearInput(); this.controller.reset(); this.boost.reset(); this.trafficSystem.reset();
    this.arrivalId=''; this.inspection.close(); this.resetCamera();
    this.railService?.update(0);
    Object.assign(this.model.player, createVehicle(this.model.district));
    this.model.traffic = this.trafficSystem.create();
    this.fares=new FareDispatcher(this.model.district,this.missionSeed===undefined?undefined:seededRandom(this.missionSeed+this.sessions++));
    this.model.missionIndex = 0; this.model.mission = this.fares.next(this.model.player);
    Object.assign(this.model.snapshot, {
      careerNotice: undefined, careerXP: 0, careerAchievements: [], careerRecords: [], wallet: this.career.profile.wallet, newDistricts: 0,
      session: (this.model.snapshot.session ?? 0) + 1, viewingLandmark: undefined, boostState:'ready',boostActive:0,boostRecharge:0, elapsed: 0, phase: 'playing', mode, stage: 'pickup', shiftTime: this.model.district.worldId === 'bangkok' ? SHIFT_SECONDS : 180, tripTime: this.model.mission.limit,
      score: 0, earnings: 0, deliveries: 0, boarding: 0, target: this.model.mission.pickup,
      passenger: this.model.mission.passenger, speed: 0,
    });
    this.message('Follow the beacon. Stop inside the ring to board.', 5); this.updateTarget(); this.publish();
  }
  pause() {
    if (this.model.snapshot.phase !== 'playing') return;
    this.career.flush(); this.model.snapshot.phase = 'paused'; this.clearInput(); this.publish();
  }
  resume() {
    if (this.model.snapshot.phase !== 'paused') return;
    if(this.controller.reconcileGeography(this.model.player,this.model.district))this.resetCamera();
    const wasInspecting=!!this.model.snapshot.viewingLandmark;if(wasInspecting)this.resetCamera();this.clearInput();this.inspection.close();this.model.snapshot.viewingLandmark=undefined;const portrait=typeof window.matchMedia==='function'&&window.matchMedia('(orientation: portrait)').matches;if(wasInspecting&&(document.hidden||portrait)){this.publish();return;}this.model.snapshot.phase='playing';this.publish();
  }
  returnToTitle() { this.career.flush(); this.resetCamera(); this.clearInput(); this.inspection.close(); Object.assign(this.model.player, createVehicle(this.model.district)); this.model.snapshot.viewingLandmark = undefined; this.model.snapshot.elapsed = 0; this.model.snapshot.phase = 'title'; this.publish(); }
  restart() { this.start(this.model.snapshot.mode); }
  recover() {
    if (this.model.snapshot.phase !== 'playing' && this.model.snapshot.phase !== 'paused') return;
    this.resetCamera();
    if (![this.model.player.x,this.model.player.z,this.model.player.heading].every(Number.isFinite)) Object.assign(this.model.player,createVehicle(this.model.district));
    this.controller.recover(this.model.player, this.model.district, this.model.traffic);
    this.clearInput(); this.model.snapshot.boarding = 0;
    this.message('Back on the road', 2); this.updateTarget(); this.publish();
  }
  triggerBoost() {
    if(this.model.snapshot.phase!=='playing'||!this.boost.trigger())return false;
    Object.assign(this.model.snapshot,{boostState:this.boost.state,boostActive:this.boost.active,boostRecharge:this.boost.recharge});this.publish();return true;
  }
  get inspectableLandmark(){
    if(Math.abs(this.model.player.speed)>=2||this.model.player.collision>.1)return;
    const d=this.model.district,p=this.model.player;
    const arrival=destinationAt(d,p);
    if(arrival)return d.landmarks.find(l=>l.id===arrival.landmarkId);
    return d.landmarks.find(l=>{if(d.destinations?.some(a=>a.landmarkId===l.id))return false;const n=d.nodes.find(n=>n.id===l.accessNode);return n&&Math.hypot(p.x-n.x,p.z-n.z)<16;});
  }
  viewLandmark(id=this.inspectableLandmark?.id){
    const l=this.inspectableLandmark;if(this.model.snapshot.phase!=='playing'||!l||l.id!==id)return false;
    this.pause();this.inspection.open(inspectionSubject(l,this.model.district));this.model.snapshot.viewingLandmark=l.id;this.publish();return true;
  }
  canViewPho(){return this.inspectableLandmark?.id==='pho';}
  viewPho(){return this.viewLandmark('pho');}
  canViewPalace(){return this.inspectableLandmark?.id==='palace';}
  viewPalace(){return this.viewLandmark('palace');}
  get intersectionHorizontalGreen() { return this.trafficSystem.horizontalGreen; }
  get railSoundLevel(){let level=0;const p=this.model.player;for(const t of this.railService?.trains??[])level=Math.max(level,Math.max(0,1-Math.hypot(p.x-t.sample.x,p.z-t.sample.z)/110)*Math.min(1,t.speed/15));return level;}
  setQuality(quality: 'low' | 'medium') { this.model.snapshot.quality = quality; this.slowTime = 0; this.publish(); }
  private message(text: string, seconds = 3) { this.model.snapshot.message = text; this.messageTime = seconds; }
  private careerFeedback(ids: string[]) {
    if(!ids.length)return;const s=this.model.snapshot;
    s.careerAchievements=[...new Set([...(s.careerAchievements??[]),...ids])];
    s.careerNotice=ACHIEVEMENTS.find(a=>a.id===ids[0])?.name;this.careerNoticeTime=5;
  }
  private careerNoticeTime=0;
  private nextPassenger() {
    this.model.missionIndex++;
    this.model.mission = this.fares.next(this.model.player);
    Object.assign(this.model.snapshot, { stage: 'pickup', tripTime: this.model.mission.limit, target: this.model.mission.pickup, passenger: this.model.mission.passenger, boarding: 0 });
  }
  private updateTarget() {
    const { player, snapshot } = this.model;
    snapshot.distance = Math.hypot(snapshot.target.x - player.x, snapshot.target.z - player.z);
    const angle = Math.atan2(snapshot.target.x - player.x, snapshot.target.z - player.z) - player.heading;
    snapshot.bearing = Math.atan2(Math.sin(angle), Math.cos(angle));
    snapshot.speed = Math.abs(player.speed) * 3.6;
  }
  update(delta: number) {
    if (this.disposed) return;
    const dt = Math.max(0, Math.min(delta, 0.05));
    const { snapshot: s, player, input } = this.model;
    if(![player.x,player.z,player.heading,player.speed].every(Number.isFinite)){ Object.assign(player,createVehicle(this.model.district));this.controller.reset();this.clearInput();this.resetCamera();this.updateTarget();this.publish();return; }
    this.frames++; this.frameTime += delta;
    if (this.frameTime >= 2) {
      s.fps = Math.round(this.frames / this.frameTime);
      this.slowTime = s.fps < 28 ? this.slowTime + this.frameTime : 0;
      if (this.slowTime > 5 && s.quality === 'medium') { s.quality = 'low'; this.message('Low quality enabled for smoother driving'); this.slowTime = 0; }
      this.frames = 0; this.frameTime = 0;
    }
    if (s.phase === 'title') this.trafficSystem.update(this.model.traffic, player, dt);
    if (s.phase === 'playing') {
      const gas = input.gas || this.keyboard.has('ArrowUp') || this.keyboard.has('KeyW');
      const brake = input.brake || this.keyboard.has('ArrowDown') || this.keyboard.has('KeyS') || this.keyboard.has('Space');
      const keys = Number(this.keyboard.has('ArrowRight') || this.keyboard.has('KeyD')) - Number(this.keyboard.has('ArrowLeft') || this.keyboard.has('KeyA'));
      this.trafficSystem.update(this.model.traffic, player, dt);
      const oldX=player.x, oldZ=player.z;
      const boosted=this.boost.advance(dt), steer=keys || input.steer;
      if(boosted>0)this.controller.update(player,{gas,brake,steer,boost:true},this.model.district,this.model.traffic,boosted);
      if(dt>boosted)this.controller.update(player,{gas,brake,steer},this.model.district,this.model.traffic,dt-boosted);
      this.career.drive(Math.hypot(player.x-oldX,player.z-oldZ));
      this.careerCheckpoint+=dt;if(this.careerCheckpoint>=5){this.careerCheckpoint=0;this.career.flush();}
      s.boostState=this.boost.state;s.boostActive=this.boost.active;s.boostRecharge=this.boost.recharge;
      this.updateTarget();
      s.elapsed = (s.elapsed ?? 0) + dt;
      this.railService?.update(s.elapsed);
      if (this.model.district.worldId === 'bangkok') {
        this.discoveryTime += dt;
        if (this.discoveryTime > .3) {
          this.discoveryTime = 0;
          const entered = discover(this.model.district, player, this.discovery, this.storage);
          s.districtName = entered.region?.name ?? 'Bangkok connector';
          if (entered.newRegion) this.message(`Discovered ${entered.region!.name}`, 3);
          const arrival=destinationAt(this.model.district,player);
          if(arrival&&arrival.id!==this.arrivalId&&Math.abs(player.speed)<3){this.arrivalId=arrival.id;this.message(`Arrived · ${this.model.district.landmarks.find(l=>l.id===arrival.landmarkId)!.name}`,4);}
          if(!arrival)this.arrivalId='';
          if (entered.changed) {
            const before=this.career.profile.xp;const earned=this.career.syncDiscovery(this.discovery.regions,this.discovery.landmarks,true);s.careerXP=(s.careerXP??0)+this.career.profile.xp-before;this.careerFeedback(earned);s.newDistricts=this.discovery.regions.length-this.sessionDistricts;
            s.discoveredDistricts = [...this.discovery.regions]; s.discoveredLandmarks = [...this.discovery.landmarks]; s.discoveredShortcuts = [...this.discovery.shortcuts]; }
        }
      }
      this.careerNoticeTime=Math.max(0,this.careerNoticeTime-dt);if(!this.careerNoticeTime)s.careerNotice=undefined;
      this.messageTime = Math.max(0, this.messageTime - dt);
      if (!this.messageTime) s.message = '';
      if (s.mode === 'shift') {
        s.shiftTime = Math.max(0, s.shiftTime - dt);
        if (s.shiftTime === 0) {
          const result=this.career.finishShift(this.careerSession,Math.round(s.score),Math.round(s.earnings));
          if(result.applied){s.careerXP=(s.careerXP??0)+100;this.careerFeedback(result.achievements);s.careerRecords=result.records;}
          s.wallet=this.career.profile.wallet;s.phase = 'ended'; this.clearInput(); this.message(this.model.district.worldId === 'bangkok' ? 'Bangkok shift complete!' : 'Shift complete. Chinatown says thanks!', 10); }
      }
      if (s.phase === 'playing') {
        if (s.stage === 'delivery') {
          s.tripTime = Math.max(0, s.tripTime - dt);
          if (s.tripTime === 0) { this.nextPassenger(); this.updateTarget(); this.message('Passenger missed their stop. Find your next fare.', 4); }
        }
        if (s.distance < 9 && Math.abs(player.speed) < 1.8) {
          s.boarding = Math.min(1, s.boarding + dt / 1.1);
          if (s.boarding >= 1) {
            if (s.stage === 'pickup') {
              s.stage = 'delivery'; s.target = this.model.mission.destination; s.tripTime = this.model.mission.limit; s.boarding = 0;
              this.message(`${this.model.mission.passenger.split(' · ')[0]} is aboard. Go to ${s.target.name}!`, 4);
            } else {
              const fare = this.model.mission.baseFare === undefined ? 60 + Math.round(s.tripTime * 2) : this.model.mission.baseFare + Math.round(30 * s.tripTime / this.model.mission.limit);
              const quickBonus = s.tripTime > this.model.mission.limit * 0.45 ? 150 : 0;
              const xp=40+Math.round((this.model.mission.routeDistance??0)/50);
              const reward=this.career.rewardFare(this.careerSession,this.model.missionIndex,fare,xp);
              if(reward.applied){s.careerXP=(s.careerXP??0)+xp;s.wallet=this.career.profile.wallet;this.careerFeedback(reward.achievements);}
              s.earnings += fare; s.score += fare * 5 + quickBonus; s.deliveries++;
              this.nextPassenger(); this.message(`Delivered! +฿${fare}${quickBonus ? ' · Quick delivery +150 points' : ''}`, 4);
            }
            this.updateTarget();
          }
        } else s.boarding = 0;
        if (Math.abs(player.speed) > 12 && player.collision === 0) {
          for (const car of this.model.traffic) {
            const distance = Math.hypot(player.x - car.x, player.z - car.z);
            if (distance > 3.4 && distance < 6 && car.nearMissCooldown === 0) {
              car.nearMissCooldown = 8; s.score += 25;
              if (this.messageTime < 1) this.message('Close pass! +25', 1.5);
            }
          }
        }
      }
    }
    this.publishTime += dt;
    if (this.publishTime > 0.1) { this.publishTime = 0; this.publish(); }
  }
  dispose() {
    this.career.flush();this.resetCamera(); this.disposed = true; this.listeners.clear();
    window.removeEventListener('keydown', this.onKeyDown); window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('pagehide',this.onPageHide);
    window.removeEventListener('blur', this.onBlur); document.removeEventListener('visibilitychange', this.onVisibility);
  }
}
