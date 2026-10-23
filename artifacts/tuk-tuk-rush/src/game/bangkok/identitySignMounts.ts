import * as T from "three";
import type { District } from "../types";
import { STOREFRONT } from "./storefrontMounts";
import { REAL_PLACES } from "./realPlaces";

/** Fit text faces after the approved landmark model is built. Its massing,
 * materials, property, supports and historical source contract stay intact. */
export function mountIdentitySigns(root: T.Group, _district: District) {
  for (const child of root.children) {
    if (
      !(child instanceof T.Mesh) ||
      !child.name.startsWith("ArchitecturalIdentity:")
    )
      continue;
    child.position.x += Math.sin(child.rotation.y) * STOREFRONT.faceRelief;
    child.position.z += Math.cos(child.rotation.y) * STOREFRONT.faceRelief;
    if (
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).has("qa")
    ) {
      const id = child.name.slice("ArchitecturalIdentity:".length),
        g = child.geometry as T.PlaneGeometry;
      const faces = (root.userData.signFaces ??= []);
      faces.push({
        owner: "landmark:" + id,
        region: REAL_PLACES.find((p) => p.id === id)?.region,
        key: id,
        position: child.position.toArray(),
        yaw: child.rotation.y,
        width: g.parameters.width,
        height: g.parameters.height,
      });
    }
  }
  return root;
}
