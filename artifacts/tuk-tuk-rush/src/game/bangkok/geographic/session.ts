import { GeographicSurface } from "./surface";
import { riverClearance } from "../waterGeometry";
import type { GeographicDataset } from "./dataset";
import type { District, GameSnapshot, Input } from "../../types";
import type { DrivingControlHost } from "../../Controls";
import { VehicleController, createVehicle } from "../../vehicle";
import { TurboBoost } from "../../boost";
/** Geography proof has no career/missions/save writes. Production physics and input widgets are shared. */
export class GeographicSession implements DrivingControlHost {
  readonly player;
  readonly controller = new VehicleController();
  readonly boost = new TurboBoost();
  readonly model: { input: Input; snapshot: GameSnapshot };
  readonly inspectableLandmark = undefined;
  private publishTime = 0;
  private listeners = new Set<(s: GameSnapshot) => void>();
  private keys = new Set<string>();
  height = 0;
  readonly surfaces?: GeographicSurface;
  constructor(
    readonly district: District,
    data?: GeographicDataset,
  ) {
    if (data) this.surfaces = new GeographicSurface(data);
    this.player = createVehicle(district);
    this.model = {
      input: { gas: false, brake: false, steer: 0 },
      snapshot: {
        phase: "playing",
        mode: "free",
        stage: "pickup",
        shiftTime: 0,
        tripTime: 0,
        score: 0,
        earnings: 0,
        deliveries: 0,
        speed: 0,
        target: district.nodes[0]!,
        passenger: "",
        distance: 0,
        bearing: 0,
        message: "Geographic proof",
        boarding: 0,
        quality: "medium",
        fps: 60,
        boostState: "ready",
      },
    };
  }
  subscribe = (fn: (s: GameSnapshot) => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };
  viewLandmark = () => false;
  triggerBoost = () =>
    this.model.snapshot.phase === "playing" && this.boost.trigger();
  clearInput = () => {
    this.keys.clear();
    Object.assign(this.model.input, { gas: false, brake: false, steer: 0 });
  };
  attach() {
    const down = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLElement &&
        e.target.closest("input,button,select")
      )
        return;
      if (
        ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(
          e.code,
        )
      )
        e.preventDefault();
      this.keys.add(e.code);
      if (e.code === "KeyB" && !e.repeat) this.triggerBoost();
    };
    const up = (e: KeyboardEvent) => this.keys.delete(e.code);
    const hide = () => {
      if (document.hidden) this.clearInput();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", this.clearInput);
    document.addEventListener("visibilitychange", hide);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", this.clearInput);
      document.removeEventListener("visibilitychange", hide);
      this.clearInput();
    };
  }
  update(dt: number) {
    if (this.model.snapshot.phase !== "playing") return;
    const input = this.model.input;
    this.boost.advance(dt);
    const before = { x: this.player.x, z: this.player.z };
    this.controller.update(
      this.player,
      {
        gas: input.gas || this.keys.has("KeyW") || this.keys.has("ArrowUp"),
        brake:
          input.brake ||
          this.keys.has("KeyS") ||
          this.keys.has("ArrowDown") ||
          this.keys.has("Space"),
        steer:
          input.steer ||
          Number(this.keys.has("KeyD") || this.keys.has("ArrowRight")) -
            Number(this.keys.has("KeyA") || this.keys.has("ArrowLeft")),
        boost: this.boost.state === "active",
      },
      this.district,
      [],
      dt,
    );
    if (this.surfaces) {
      const surface = this.surfaces.sample(this.player, this.height);
      if (surface) this.height = surface.height;
      else if (
        this.height > 0.65 ||
        riverClearance(this.district, this.player) < 1.5
      ) {
        Object.assign(this.player, before, { speed: 0, collision: 1 });
        this.controller.reset();
      } else this.height = 0;
    }
    Object.assign(this.model.snapshot, {
      speed: Math.abs(this.player.speed) * 3.6,
      boostState: this.boost.state,
      boostActive: this.boost.active,
      boostRecharge: this.boost.recharge,
    });
    this.publishTime += dt;
    if (this.publishTime >= 0.1) {
      this.publishTime = 0;
      for (const listener of this.listeners)
        listener({ ...this.model.snapshot });
    }
  }
  reset() {
    this.height = 0;
    Object.assign(this.player, createVehicle(this.district));
    this.controller.reset();
    this.clearInput();
  }
}
