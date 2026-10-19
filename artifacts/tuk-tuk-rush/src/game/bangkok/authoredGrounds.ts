import type { District } from "../types";
import type { ArtPiece } from "./architecturalBatch";
import { sitePoint } from "./authoredSites";
/** Site-specific paving, river esplanades, planted courts and warm entrance
 * strips. Every surface was validated against water and public asphalt during
 * planning. Reuses the existing spatial/material batches and night shader. */
export function emitAuthoredGrounds(d: District, emit: (p: ArtPiece) => void) {
  for (const s of d.authoredSites ?? []) {
    for (const o of s.furniture ?? []) {
      const put = (
        y: number,
        w: number,
        h: number,
        depth: number,
        color: string,
        shape: ArtPiece["shape"] = "box",
        surface: ArtPiece["surface"] = "plaster",
      ) =>
        emit({
          x: o.x,
          z: o.z,
          y,
          w,
          h,
          d: depth,
          color,
          shape,
          surface,
          yaw: o.yaw ?? 0,
        });
      if (o.planting === "island") {
        put(0.3, 6, 0.6, 6, "#c7b48b");
        put(0.65, 5.5, 0.1, 5.5, "#53925d");
      }
      // Trunks and crowns share tropicalPlan geometry/clearance.
    }
    for (const [i, z] of s.zones.entries()) {
      const p = sitePoint(s.origin, s.yaw, z.x, z.z),
        color =
          z.use === "garden"
            ? "#66916b"
            : z.use === "forecourt"
              ? "#aab4ab"
              : s.district === "bang-rak"
                ? "#c5b390"
                : "#c2c9bc";
      emit({
        ...p,
        y: 0.01,
        w: z.w,
        h: 0.08,
        d: z.d,
        color,
        yaw: s.yaw,
        surface: z.use === "garden" ? "plaster" : "concrete",
      });
      if (z.use === "terrace") {
        for (const side of [-1, 1]) {
          const q = sitePoint(s.origin, s.yaw, z.x + side * (z.w / 2 - 3), z.z);
          emit({
            ...q,
            y: 0.25,
            w: 3,
            h: 0.45,
            d: z.d - 1,
            color: "#b6a987",
            yaw: s.yaw,
            surface: "concrete",
          });
          emit({
            ...q,
            y: 0.53,
            w: 2.7,
            h: 0.1,
            d: z.d - 1,
            color: "#43895e",
            yaw: s.yaw,
            surface: "plaster",
          });
          if (i % 2 === 0) {
            emit({
              ...q,
              y: 2,
              w: 0.35,
              h: 3.4,
              d: 0.35,
              color: "#856947",
              yaw: s.yaw,
              surface: "wood",
              shape: "cylinder",
            });
            emit({
              ...q,
              y: 4.4,
              w: 4.2,
              h: 3.7,
              d: 4.2,
              color: "#47986a",
              yaw: s.yaw,
              surface: "plaster",
              shape: "orb",
            });
          }
        }
        if (i % 2) {
          const q = sitePoint(s.origin, s.yaw, z.x, z.z);
          emit({
            ...q,
            y: 0.65,
            w: 4,
            h: 0.4,
            d: 1,
            color: "#aa7958",
            yaw: s.yaw,
            surface: "wood",
          });
        }
      }
      if (z.use === "forecourt") {
        for (const side of [-1, 1]) {
          const q = sitePoint(s.origin, s.yaw, side * (z.w / 2 - 1), z.z);
          emit({
            ...q,
            y: 0.1,
            w: 0.15,
            h: 0.1,
            d: z.d - 2,
            color: "#d8bf7a",
            yaw: s.yaw,
            surface: "concrete",
          });
        }
      }
    }
  }
}
