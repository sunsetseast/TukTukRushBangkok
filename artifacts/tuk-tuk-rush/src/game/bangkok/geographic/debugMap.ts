import type { GeographicDataset } from "./dataset";
import { geographicToMeters } from "./projection";
/** Draw once per map opening; no 100,000-element SVG/React tree or per-frame road scan. */
export function drawGeographicMap(
  ctx: CanvasRenderingContext2D,
  data: GeographicDataset,
  width: number,
  height: number,
) {
  const b = data.bounds,
    scale = Math.min(width / (b.maxX - b.minX), height / (b.maxZ - b.minZ)),
    ox = (width - (b.maxX - b.minX) * scale) / 2,
    oz = (height - (b.maxZ - b.minZ) * scale) / 2;
  const screen = (p: number[]) => [
    ox + (p[0]! - b.minX) * scale,
    oz + (p[1]! - b.minZ) * scale,
  ];
  const path = (points: number[][]) => {
    ctx.beginPath();
    points.forEach((p, i) => {
      const q = screen(p);
      if (i) ctx.lineTo(q[0]!, q[1]!);
      else ctx.moveTo(q[0]!, q[1]!);
    });
  };
  ctx.fillStyle = "#cad5c8";
  ctx.fillRect(0, 0, width, height);
  for (const polygon of data.waterUnion) {
    ctx.beginPath();
    for (const ring of polygon) {
      ring.forEach((p, i) => {
        const q = screen(p);
        if (i) ctx.lineTo(q[0]!, q[1]!);
        else ctx.moveTo(q[0]!, q[1]!);
      });
      ctx.closePath();
    }
    ctx.fillStyle = "#227e95";
    ctx.fill("evenodd");
  }
  for (const r of data.roads) {
    path(r.nodes.map((n) => data.nodes[n]!));
    ctx.lineWidth = Math.max(r.width * scale, 0.45);
    ctx.strokeStyle = ["path", "footway", "steps", "pedestrian"].includes(
      r.tags.highway!,
    )
      ? "#aa9459"
      : "#52646a";
    ctx.stroke();
  }
  for (const a of data.boundaries)
    for (const polygon of a.geometry.coordinates)
      for (const ring of polygon) {
        path(
          ring.map(([lon, lat]) => {
            const p = geographicToMeters({ lon: lon!, lat: lat! });
            return [p.x, p.z];
          }),
        );
        ctx.strokeStyle = "#8b6cab";
        ctx.lineWidth = 0.6;
        ctx.setLineDash([3, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
      }
  for (const l of data.rail.catalog.lines) {
    ctx.strokeStyle = l.color;
    ctx.lineWidth = 2;
    for (const r of data.rail.tracks.filter(
      (r) => r.playable && r.lines.includes(l.id),
    )) {
      path(r.points);
      ctx.setLineDash(
        r.status === "operational"
          ? r.level === "underground"
            ? [3, 2]
            : []
          : [1, 5],
      );
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }
  for (const s of data.rail.stations.filter(
    (s) =>
      s.playable &&
      s.status === "operational" &&
      s.tags.railway !== "subway_entrance",
  )) {
    const p = screen(s.point);
    ctx.beginPath();
    ctx.arc(p[0]!, p[1]!, s.lines.length > 1 ? 3.2 : 2, 0, Math.PI * 2);
    ctx.fillStyle = "white";
    ctx.fill();
    ctx.strokeStyle = "#263a4d";
    ctx.lineWidth = 0.7;
    ctx.stroke();
  }
  return { screen };
}
