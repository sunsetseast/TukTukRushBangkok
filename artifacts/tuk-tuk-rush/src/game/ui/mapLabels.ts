export type MapLabel = {
  id: string;
  x: number;
  y: number;
  text: string;
  font: number;
  priority: number;
  offset: number;
};
export type LabelBounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};
export type LabelPlacement = { x: number; y: number; anchor: "start" | "end" };
/** Greedy cartographic label placement in map units. Markers remain even when text is culled. */
export function placeMapLabels(
  features: MapLabel[],
  scale: number,
  bounds?: LabelBounds,
  reserved: LabelBounds[] = [],
) {
  const placed = new Map<string, LabelPlacement>();
  const occupied: (LabelBounds & { id: string })[] = features.map((f) => ({
    id: f.id,
    minX: f.x - (f.offset - 3) * scale,
    maxX: f.x + (f.offset - 3) * scale,
    minY: f.y - (f.offset - 3) * scale,
    maxY: f.y + (f.offset - 3) * scale,
  }));
  occupied.push(...reserved.map((b,i)=>({...b,id:`reserved:${i}`})));
  const overlaps = (a: LabelBounds, b: LabelBounds) =>
    a.minX < b.maxX + 2 * scale &&
    a.maxX > b.minX - 2 * scale &&
    a.minY < b.maxY + 2 * scale &&
    a.maxY > b.minY - 2 * scale;
  for (const f of [...features].sort((a, b) => b.priority - a.priority)) {
    const width = (f.text.length * f.font * 0.61 + 4) * scale,
      height = f.font * 1.2 * scale;
    for (const [side, vertical] of [
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ]) {
      const x = f.x + side! * f.offset * scale,
        y = f.y + (vertical === 1 ? f.font + 4 : -8) * scale;
      const box = {
        minX: side === 1 ? x : x - width,
        maxX: side === 1 ? x + width : x,
        minY: y - height,
        maxY: y + 2 * scale,
      };
      if (
        bounds &&
        (box.minX < bounds.minX ||
          box.maxX > bounds.maxX ||
          box.minY < bounds.minY ||
          box.maxY > bounds.maxY)
      )
        continue;
      if (occupied.some((b) => b.id !== f.id && overlaps(box, b))) continue;
      placed.set(f.id, { x, y, anchor: side === 1 ? "start" : "end" });
      occupied.push({ ...box, id: `label:${f.id}` });
      break;
    }
  }
  return placed;
}
