import type { GameModel, GameSnapshot, Mission } from './types';
import { createBangkokWorld, regionAt, SHIFT_SECONDS } from './bangkok/world';
import { readDiscovery, discover, type Discovery } from './bangkok/discovery';
import { createDistrict } from './world';
import { VehicleController, createVehicle } from './vehicle';
import { TrafficSystem } from './traffic';
import { createMissions } from './missions';

export class GameEngine {
  readonly model: GameModel;
  private controller = new VehicleController();
  private trafficSystem: TrafficSystem;
  private missions: Mission[];
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
  private storage: Storage | undefined;
  constructor(options: { world?: 'bangkok' | 'chinatown' } = {}) {
    const district = options.world === 'chinatown' ? createDistrict() : createBangkokWorld();
    try { this.storage = window.localStorage; } catch { /* Browser storage is optional. */ }
    this.discovery = readDiscovery(this.storage);
    this.trafficSystem = new TrafficSystem(district);
    this.missions = createMissions(district);
    const mission = this.missions[0]!;
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
  }
  private onKeyDown = (e: KeyboardEvent) => {
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyW','KeyA','KeyS','KeyD'].includes(e.code)) e.preventDefault();
    if (e.code === 'Escape' || e.code === 'KeyP') {
      if (!e.repeat) { if (this.model.snapshot.phase === 'playing') this.pause(); else if (this.model.snapshot.phase === 'paused') this.resume(); }
    }
    if (e.code === 'KeyR' && !e.repeat) this.recover();
    this.keyboard.add(e.code);
  };
  private onKeyUp = (e: KeyboardEvent) => { this.keyboard.delete(e.code); };
  private onBlur = () => { this.clearInput(); this.pause(); };
  private onVisibility = () => { if (document.hidden) { this.clearInput(); this.pause(); } };
  clearInput() { this.keyboard.clear(); Object.assign(this.model.input, { gas: false, brake: false, steer: 0 }); }
  subscribe(callback: (s: GameSnapshot) => void) {
    this.listeners.add(callback); callback({ ...this.model.snapshot });
    return () => { this.listeners.delete(callback); };
  }
  private publish() { for (const cb of this.listeners) cb({ ...this.model.snapshot }); }
  start(mode: 'shift' | 'free') {
    this.clearInput(); this.controller.reset();
    Object.assign(this.model.player, createVehicle(this.model.district));
    this.model.traffic = this.trafficSystem.create();
    this.model.missionIndex = 0; this.model.mission = this.missions[0]!;
    Object.assign(this.model.snapshot, {
      elapsed: 0, phase: 'playing', mode, stage: 'pickup', shiftTime: this.model.district.worldId === 'bangkok' ? SHIFT_SECONDS : 180, tripTime: this.model.mission.limit,
      score: 0, earnings: 0, deliveries: 0, boarding: 0, target: this.model.mission.pickup,
      passenger: this.model.mission.passenger, speed: 0,
    });
    this.message('Follow the beacon. Stop inside the ring to board.', 5); this.updateTarget(); this.publish();
  }
  pause() {
    if (this.model.snapshot.phase !== 'playing') return;
    this.model.snapshot.phase = 'paused'; this.clearInput(); this.publish();
  }
  resume() {
    if (this.model.snapshot.phase !== 'paused') return;
    this.clearInput(); this.model.snapshot.phase = 'playing'; this.publish();
  }
  restart() { this.start(this.model.snapshot.mode); }
  recover() {
    if (this.model.snapshot.phase !== 'playing' && this.model.snapshot.phase !== 'paused') return;
    this.controller.recover(this.model.player, this.model.district, this.model.traffic);
    this.clearInput(); this.model.snapshot.boarding = 0;
    this.message('Back on the road', 2); this.updateTarget(); this.publish();
  }
  get intersectionHorizontalGreen() { return this.trafficSystem.horizontalGreen; }
  setQuality(quality: 'low' | 'medium') { this.model.snapshot.quality = quality; this.slowTime = 0; this.publish(); }
  private message(text: string, seconds = 3) { this.model.snapshot.message = text; this.messageTime = seconds; }
  private nextPassenger() {
    this.model.missionIndex = (this.model.missionIndex + 1) % this.missions.length;
    this.model.mission = this.missions[this.model.missionIndex]!;
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
      this.controller.update(player, { gas, brake, steer: keys || input.steer }, this.model.district, this.model.traffic, dt);
      this.updateTarget();
      s.elapsed = (s.elapsed ?? 0) + dt;
      if (this.model.district.worldId === 'bangkok') {
        this.discoveryTime += dt;
        if (this.discoveryTime > .3) {
          this.discoveryTime = 0;
          const entered = discover(this.model.district, player, this.discovery, this.storage);
          s.districtName = entered.region?.name ?? 'Bangkok connector';
          if (entered.newRegion) this.message(`Discovered ${entered.region!.name}`, 3);
          if (entered.changed) { s.discoveredDistricts = [...this.discovery.regions]; s.discoveredLandmarks = [...this.discovery.landmarks]; s.discoveredShortcuts = [...this.discovery.shortcuts]; }
        }
      }
      this.messageTime = Math.max(0, this.messageTime - dt);
      if (!this.messageTime) s.message = '';
      if (s.mode === 'shift') {
        s.shiftTime = Math.max(0, s.shiftTime - dt);
        if (s.shiftTime === 0) { s.phase = 'ended'; this.clearInput(); this.message(this.model.district.worldId === 'bangkok' ? 'Bangkok shift complete!' : 'Shift complete. Chinatown says thanks!', 10); }
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
              const fare = 60 + Math.round(s.tripTime * 2);
              const quickBonus = s.tripTime > this.model.mission.limit * 0.45 ? 150 : 0;
              s.earnings += fare; s.score += fare * 5 + quickBonus; s.deliveries++;
              this.nextPassenger(); this.message(`Delivered! +฿${fare}${quickBonus ? ' · Quick delivery +150' : ''}`, 4);
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
    this.disposed = true; this.listeners.clear();
    window.removeEventListener('keydown', this.onKeyDown); window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur); document.removeEventListener('visibilitychange', this.onVisibility);
  }
}
