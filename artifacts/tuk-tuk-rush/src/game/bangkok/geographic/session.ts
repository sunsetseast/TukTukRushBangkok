import { GameEngine } from "../../engine";
import type { District } from "../../types";
import type { GeographicDataset } from "./dataset";
/** Compatibility name for the preview. All input, boost, fare, shift and career
 * transitions are owned by the production engine. */
export class GeographicSession extends GameEngine {
  constructor(district: District, _reference?: GeographicDataset) {
    super({ district });
  }
  get player() {
    return this.model.player;
  }
  get district() {
    return this.model.district;
  }
  get height() {
    return this.district.driving?.height ?? 0;
  }
  override viewLandmark(id = this.inspectableLandmark?.id) {
    if (!super.viewLandmark(id)) return false;
    const subject = this.inspection.subject!,
      box = this.district.obstacles.find((o) => o.landmarkId === id);
    if (box) {
      const radius = Math.hypot(box.w, box.d) / 2,
        height = box.height;
      for (const view of subject.views) {
        view.target = [0, height * 0.5, 0];
        view.distance = Math.max(20, radius * 3, height * 1.5);
        view.minDistance = Math.max(8, radius * 1.2);
        view.maxDistance = view.distance * 2;
        view.pan = Math.min(6, radius * 0.3);
      }
      this.inspection.open(subject);
    }
    return true;
  }
  attach() {
    return () => this.clearInput();
  }
  reset() {
    this.start(this.model.snapshot.mode);
  }
}
