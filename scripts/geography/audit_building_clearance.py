import sys, json, gzip
from pathlib import Path
from collections import Counter
from import_bangkok import readzip, DATA, OUT, ROOT, project_geom
from shapely.geometry import shape, LineString

runtime = readzip(OUT)
roads = {r["id"]: r for r in runtime["roads"]}
conflicts = readzip(DATA / "building-exceptions.v1.json.gz")["conflicts"]
counts = Counter()
for c in conflicts:
    rs = [roads[r] for r in c["roads"]]
    if c["waterAreaM2"] > 0.1:
        counts["mappedWaterIntersection"] += 1
    if any(r["widthBasis"] != "tagged" for r in rs):
        counts["estimatedRoadWidthInvolved"] += 1
    if any(r["widthBasis"] == "tagged" for r in rs):
        counts["taggedRoadWidthInvolved"] += 1
    if any(
        r["tags"].get("tunnel") == "building_passage"
        or r["tags"].get("covered") == "yes"
        for r in rs
    ):
        counts["taggedCoveredPassageInvolved"] += 1
source = readzip(DATA / "buildings-source.v1.json.gz")
byid = {b["id"]: b for b in source["buildings"]}
cases = []
for label, needle in [
    ("Yaowarat", "Yaowarat"),
    ("Song Wat", "Song Wat"),
    ("Charoen Krung", "Charoen Krung"),
    ("Si Phraya", "Si Phraya"),
    ("Silom", "Silom"),
]:
    found = 0
    for c in conflicts:
        matches = [
            roads[r]
            for r in c["roads"]
            if needle.lower()
            in roads[r]["tags"].get("name:en", roads[r]["tags"].get("name", "")).lower()
        ]
        if not matches:
            continue
        b = byid[c["id"]]
        p = project_geom(shape(b["geometry"]))
        measure = []
        for r in matches:
            line = LineString([runtime["nodes"][n] for n in r["nodes"]])
            inside = p.intersection(line).length
            covered = (
                r["tags"].get("tunnel") == "building_passage"
                or r["tags"].get("covered") == "yes"
            )
            diagnosis = (
                "mapped covered passage; portal opening/vertical clearance unverified"
                if covered
                else (
                    "estimated-width ribbon near source wall; centerline clear"
                    if inside < 0.01 and r["widthBasis"] != "tagged"
                    else (
                        "source centerline/outline overlap needs mapping/overhang review"
                        if inside >= 0.01
                        else "tagged-width ribbon/outline exception; real clearance unverified"
                    )
                )
            )
            measure.append(
                {
                    "roadId": r["id"],
                    "name": r["tags"].get("name:en", r["tags"].get("name")),
                    "width": r["width"],
                    "widthBasis": r["widthBasis"],
                    "tunnel": r["tags"].get("tunnel"),
                    "covered": r["tags"].get("covered"),
                    "centerlineInsideFootprintM": round(inside, 3),
                    "diagnosis": diagnosis,
                }
            )
        cases.append(
            {
                "district": label,
                "buildingId": b["id"],
                "buildingTags": b["tags"],
                "roads": measure,
                "action": "source footprint preserved; road-conflicting wall colliders withheld",
            }
        )
        found += 1
        if found >= 2:
            break
report = {
    "counts": dict(counts),
    "countsOverlap": True,
    "sampleCases": cases,
    "scope": "Automated geometric diagnosis of pinned source records, not surveyed real-world clearance. No road or building was moved.",
}
(ROOT / "docs/qa/geographic-buildings/clearance-audit.json").write_text(
    json.dumps(report, indent=2, ensure_ascii=False) + "\n"
)
print(json.dumps(report, indent=2, ensure_ascii=False))
