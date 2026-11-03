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
  /** Sparse list of OSM source ways that must NOT carry ordinary motor traffic. */
  blockedMotor?: number[];
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

/** Source-backed vehicle access. Never let NPCs drive on tagged footpaths,
 * cycle lanes, private roads, bus-only roads, or other non-motor links.
 * Missing optional data defaults to permissive for synthetic legacy fixtures
 * only; the production pack compiler emits a complete blockedMotor list.
 */
export function motorTrafficAllowed(tags: RoadRuleTags): boolean {
  const highway = tags.highway?.toLowerCase() ?? "";
  if (["footway","pedestrian","path","steps","cycleway","bridleway",
       "corridor","busway","bus_guideway","raceway","escape","proposed",
       "construction","abandoned","disused","razed"].includes(highway)) return false;
  if (["no","private","agricultural","forestry"].includes(
    (tags.motorcar ?? tags.motor_vehicle ?? tags.access ?? "").toLowerCase()
  )) return false;
  if (tags.area === "yes" || tags.tunnel === "yes") return false;
  return true;
}
export function readMotorTrafficAccess(
  rules: GeographicRoadRules | undefined,
  sourceSha256: string,
  wayCount: number,
): Uint8Array {
  const allowed = new Uint8Array(wayCount).fill(1);
  if (!rules) return allowed;
  if (rules.schema !== 1 || rules.sourceSha256 !== sourceSha256 ||
    rules.wayCount !== wayCount)
    throw Error("Geographic motor access rules stale; regenerate source-derived road-rules pack");
  // Older Replit sessions may still have a v1 pack without traffic metadata.
  // Fail closed for the NPC fleet, but never prevent the player's map boot.
  if (rules.blockedMotor === undefined) return allowed.fill(0);
  if (!Array.isArray(rules.blockedMotor)) throw Error("Invalid motor access rules");
  for (const index of rules.blockedMotor) {
    if (!Number.isInteger(index) || index < 0 || index >= wayCount || allowed[index] === 0)
      throw Error("Invalid or duplicate geographic motor restriction");
    allowed[index] = 0;
  }
  return allowed;
}
