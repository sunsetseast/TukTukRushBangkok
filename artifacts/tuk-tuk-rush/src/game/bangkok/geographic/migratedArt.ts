import * as T from "three";
import { disposeObject } from "../../assets";
import { buildRealArchitecture } from "../realArchitecture";
import { realCommercial } from "../realCommercial";
import { reviewedLandmark } from "../landmarkSites";
import { buildCommercialLandmark } from "../landmarkArchitecture";
import type { GeographicPlace } from "./places";
import type { Obstacle } from "../../types";
/** Existing local meshes, fitted inside a conservative source-road-free envelope.
 * No historic compressed placement, road widening or new facade generator. */
export function buildMigratedArt(place: GeographicPlace) {
  const l = place.landmark,
    local = { ...l, x: 0, z: 0 },
    art =
      buildRealArchitecture(local) ??
      realCommercial(local) ??
      reviewedLandmark(local) ??
      buildCommercialLandmark(local);
  const root = new T.Group();
  root.name = `GeographicLandmark:${l.id}`;
  root.add(art);
  root.rotation.y = l.yaw ?? 0;
  root.updateMatrixWorld(true);
  const bound = new T.Box3().setFromObject(root),
    size = bound.getSize(new T.Vector3());
  const radius = Math.hypot(
    Math.max(Math.abs(bound.min.x), Math.abs(bound.max.x)),
    Math.max(Math.abs(bound.min.z), Math.abs(bound.max.z)),
  );
  const scale = Math.min(1, place.radius / Math.max(1, radius));
  root.scale.setScalar(scale);
  root.position.set(l.x, -bound.min.y * scale, l.z);
  root.updateMatrixWorld(true);
  const box = new T.Box3().setFromObject(root),
    center = box.getCenter(new T.Vector3()),
    actual = box.getSize(new T.Vector3());
  const obstacle: Obstacle = {
    x: center.x,
    z: center.z,
    w: actual.x,
    d: actual.z,
    height: actual.y,
    color: "#d0b48a",
    landmarkId: l.id,
  };
  root.userData.geographicAnchor = place.coordinate;
  root.userData.assetScale = scale;
  root.userData.localSize = size.toArray();
  return { root, obstacle };
}

/** Disposal must also detach the root: a disposed mesh still attached to the
 * live scene is rendered and uploaded again on a later frame. */
export function disposeMigratedArt(root: T.Group) {
  root.removeFromParent();
  disposeObject(root);
  root.clear();
}
