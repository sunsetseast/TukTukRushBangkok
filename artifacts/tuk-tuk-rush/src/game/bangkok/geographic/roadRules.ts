/** A single directed GPS constraint, in the original OpenStreetMap way order.
 * Positive is the OSM node sequence; negative is the reverse sequence.
 * Zero is two-way / unspecified. This DOES NOT restrict free-roam physics.
 */
export type RoadDirection = -1 | 0 | 1;
export type RoadRuleTags = Record<string, string | undefined>;

export function roadDirectionFromTags(tags: RoadRuleTags): RoadDirection {
  const explicit = tags.oneway?.trim().toLowerCase();
  if (explicit === "yes" || explicit === "true" || explicit === "1") return 1;
  if (explicit === "-1" || explicit === "reverse") return -1;
  if (explicit === "no" || explicit === "false" || explicit === "0") return 0;
  // Source-implied directions. An explicitly tagged "no" overrides them.
  if (!explicit && (tags.junction === "roundabout" || tags.highway === "motorway")) return 1;
  // Reversible, alternating, conditional and unknown restrictions need a
  // time-aware rule engine. Never invent a permanent direction for those tags.
  return 0;
}

export type GeographicRoadRules = {
  schema: 1;
  sourceSha256: string;
  wayCount: number;
  /** Sparse [index in gameplay metadata.ways, OSM source direction]. */
  directed: Array<[number, -1 | 1]>;
};

export function readRoadRuleDirections(
  rules: GeographicRoadRules | undefined,
  sourceSha256: string,
  wayCount: number,
): Int8Array {
  const directions = new Int8Array(wayCount);
  if (!rules) return directions; // Synthetic fixtures / explicitly unrestricted networks.
  if (rules.schema !== 1 || rules.sourceSha256 !== sourceSha256 ||
      rules.wayCount !== wayCount || !Array.isArray(rules.directed))
    throw Error("Geographic road-rule pack does not match the pinned map source");
  const seen = new Set<number>();
  for (const entry of rules.directed) {
    if (!Array.isArray(entry) || entry.length !== 2 ||
        !Number.isInteger(entry[0]) || entry[0] < 0 || entry[0] >= wayCount ||
        (entry[1] !== -1 && entry[1] !== 1) || seen.has(entry[0]))
      throw Error("Invalid or duplicate geographic one-way rule");
    seen.add(entry[0]);
    directions[entry[0]] = entry[1];
  }
  return directions;
}
