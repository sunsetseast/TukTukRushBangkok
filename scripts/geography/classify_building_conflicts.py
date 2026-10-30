"""Conservative source-evidence policy. Never changes roads/footprints or infers
surveyed widths. Only restore walls beyond a 4.6m protected centreline envelope."""
import json, re
import math
from collections import Counter
from shapely.geometry import shape, LineString, Polygon, MultiPolygon
from shapely import make_valid, difference, unary_union
from shapely.affinity import translate
from shapely.ops import nearest_points
from shapely.strtree import STRtree
from import_bangkok import readzip, writezip, DATA, OUT, ROOT, project_geom, digest, polygons, rings, project, ORIGIN

runtime = readzip(OUT)
roads = {r["id"]: r for r in runtime["roads"]}
lines = {r["id"]: LineString([runtime["nodes"][n] for n in r["nodes"]]) for r in runtime["roads"] if len(r["nodes"]) > 1}
all_lines = list(lines.values())
line_tree = STRtree(all_lines)
source = {b["id"]: b for b in readzip(DATA / "buildings-source.v1.json.gz")["buildings"]}
conflicts = readzip(DATA / "building-exceptions.v1.json.gz")["conflicts"]
counts, safe, examples = Counter(), [], []
needles = ["Yaowarat", "Phadung Dao", "Song Wat / Talat Noi", "Charoen Krung", "Captain Bush", "Si Phraya", "Surawong", "Silom"]
area_labels = {"Song Wat / Talat Noi": "Song Wat", "Captain Bush": "Charoen Krung 30"}
seen = Counter()
for c in conflicts:
    b = source[c["id"]]
    tags = b["tags"]
    rs = [roads[r] for r in c["roads"] if r in lines]
    p = project_geom(shape(b["geometry"]))
    distance = min((p.distance(lines[r["id"]]) for r in rs), default=0)
    inside = sum(p.intersection(lines[r["id"]]).length for r in rs)
    above = bool(re.search(r"[1-9]", tags.get("min_height", "") + tags.get("building:min_level", "")))
    if c["waterAreaM2"] > .1:
        category = "water-overlap-review"
    elif any(r["tags"].get("covered") == "yes" or r["tags"].get("tunnel") == "building_passage" for r in rs):
        category = "covered-passage-portal-review"
    elif above or tags.get("building:part", "no") != "no" or any(r["bridge"] or r["tunnel"] for r in rs):
        category = "vertical-part-or-grade-review"
    elif not rs:
        category = "unresolved-source-overlap"
    elif any(r["widthBasis"] == "tagged" for r in rs):
        category = "explicit-width-review"
    elif inside > .001:
        category = "source-centreline-overlap-review"
    elif distance < 4.6:
        category = "estimated-width-narrow-clearance-review"
    else:
        # Also check roads wholly inside an outline: such roads may never meet an
        # exterior edge and therefore need not appear in the edge-conflict list.
        inside_other = any(p.intersection(all_lines[i]).length > .001 for i in line_tree.query(p))
        category = "source-centreline-overlap-review" if inside_other else "estimated-width-safe-display-trim"
        if not inside_other: safe.append(c["id"])
    counts[category] += 1
    for needle in needles:
        if seen[needle] >= 2: continue
        names = [r["tags"].get("name:en", r["tags"].get("name", "")) for r in rs]
        if any(area_labels.get(needle, needle).lower() in name.lower() for name in names):
            examples.append({"district": needle, "building": c["id"], "category": category,
                             "roads": [r["id"] for r in rs], "names": names,
                             "labelBasis": "Requested area grouping; source street names are retained verbatim" if needle in area_labels else "Mapped street-name match",
                             "centrelineInsideM": round(inside, 6), "minimumCentrelineDistanceM": round(distance, 6)})
            seen[needle] += 1
policy = {"schema": 1, "sourceSha256": digest((DATA / "building-exceptions.v1.json.gz").read_bytes()),
          "protectedCentrelineM": 4.6, "restore": sorted(safe)}
(DATA / "clearance-policy.v1.json").write_text(json.dumps(policy, separators=(",", ":")) + "\n")
report = {"candidateCount": len(conflicts), "counts": dict(counts), "safeBuildingCandidates": len(safe),
          "examples": examples, "notes": [
              "Candidates are not counts of incorrect buildings.",
              "No footprint, road centreline, projection or source width was moved.",
              "Safe policy trims only derived asphalt and restores ground walls; uncertain portals, narrow paths, tagged widths and grade-separated cases remain explicit review exceptions.",
              "4.6m protects the existing lane offset and tuk-tuk radius, not a surveyed legal road width."]}
# Robust GEOS fixed-grid operations, offline only. polygon-clipping's sweep-line
# difference fails on some large adjoining road unions; do not catch and hide it.
safe = set(safe)
patches, masks, applied = {}, {}, set()
for ref in runtime["chunks"]:
    chunk = readzip(OUT.parent / ref["file"])
    for b in chunk.get("buildings", []):
        if b["id"] not in safe or b["minHeight"] > 0 or b["classification"] in ["roof", "carport"]: continue
        for poly in b["polygons"]:
            p = translate(Polygon(poly[0], poly[1:]), xoff=chunk["origin"][0], yoff=chunk["origin"][1])
            if p.is_empty: continue
            applied.add(b["id"])
            xmin, zmin, xmax, zmax = p.bounds
            for x in range(math.floor(xmin / 1024), math.floor(xmax / 1024) + 1):
                for z in range(math.floor(zmin / 1024), math.floor(zmax / 1024) + 1):
                    masks.setdefault(f"{x*1024}:{z*1024}", []).append(translate(p, xoff=-x*1024, yoff=-z*1024))
for ref in runtime["chunks"]:
    cut = masks.get(ref["id"])
    if not cut: continue
    chunk = readzip(OUT.parent / ref["file"])
    road = make_valid(MultiPolygon([Polygon(p[0], p[1:]) for p in chunk["roads"]]))
    result = difference(road, unary_union([make_valid(p) for p in cut]), grid_size=.001)
    assert result.is_valid
    patches[ref["id"]] = [rings(p) for p in polygons(result)]
writezip(DATA / "clearance-roads.v1.json.gz", {"schema": 1, "policySha256": digest((DATA / "clearance-policy.v1.json").read_bytes()), "chunks": patches})
report["correctedRoadChunks"] = len(patches)
report["appliedBuildingCandidates"] = len(applied)
def gps(p):
    return list(project.transform(p[0]+ORIGIN[0], ORIGIN[1]-p[1], direction="INVERSE"))
anchor = project_geom(shape({"type": "Point", "coordinates": [100.508, 13.741]}))
fixed_id = min(applied, key=lambda key: project_geom(shape(source[key]["geometry"])).distance(anchor))
fixed = project_geom(shape(source[fixed_id]["geometry"]))
case = next(c for c in conflicts if c["id"] == fixed_id)
line = min((lines[r] for r in case["roads"]), key=lambda l: l.distance(fixed))
wall, road = nearest_points(fixed, line)
report["fixedViewBuilding"] = fixed_id
report["reviewViews"] = [["fixed-conflict", *gps(road.coords[0]), *gps(wall.coords[0]), 4]]
crossings = []
for r in runtime["roads"]:
    if r["bridge"] or r["tunnel"] or r["width"] < 10: continue
    for a, b in zip(r["nodes"], r["nodes"][1:]):
        a, b = runtime["nodes"][a], runtime["nodes"][b]
        for axis in range(2):
            if math.floor(a[axis]/1024) == math.floor(b[axis]/1024): continue
            boundary = (math.floor(min(a[axis],b[axis])/1024)+1)*1024
            t = (boundary-a[axis])/(b[axis]-a[axis])
            q = [a[j]+t*(b[j]-a[j]) for j in range(2)]
            length = math.dist(a,b)
            if length < 40: continue
            direction = [(b[j]-a[j])/length for j in range(2)]
            eye = [q[j]-direction[j]*40 for j in range(2)]
            target = [q[j]+direction[j]*100 for j in range(2)]
            crossings.append((math.dist(q,anchor.coords[0]), r["id"], eye, target))
_, way, eye, target = min(crossings)
report["crossChunkWay"] = way
report["reviewViews"].append(["cross-chunk-seam", *gps(eye), *gps(target), 28])
out = ROOT / "docs/qa/geographic-stabilization"
out.mkdir(parents=True, exist_ok=True)
(out / "conflict-classification.json").write_text(json.dumps(report, indent=2) + "\n")
print(json.dumps({"counts": dict(counts), "safe": len(safe)}))
