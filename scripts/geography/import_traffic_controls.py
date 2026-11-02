#!/usr/bin/env python3
"""Import REAL tagged road controls from the same immutable Thailand PBF.

No inferred signals, sign locations or traffic schedules. Re-run only against
the checksum-pinned 2026-10-24 Geofabrik Thailand extraction; never mix a
later OSM snapshot with the game's 2026-10-24 road graph.
"""
import argparse, datetime, gzip, hashlib, json, pathlib, osmium

ROOT = pathlib.Path(__file__).resolve().parents[2]
GEOGRAPHY = ROOT / "artifacts/tuk-tuk-rush/public/assets/geography"
OUTPUT = ROOT / "data/bangkok/real-scale/traffic-controls.v1.json"
PBF_SHA = "e8373240cf0be47cc641f2c8627e674064d8c47f4ff2a11f6a33fcbfc9a50949"
CONTROL_TAGS = {"highway", "traffic_sign", "traffic_sign:forward",
                "traffic_sign:backward", "traffic_signals:direction",
                "traffic_signals", "direction", "stop", "give_way",
                "crossing", "crossing:signals", "traffic_signals:sound"}
RESTRICTION_TAGS = {"type", "restriction", "restriction:motorcar",
                    "restriction:motor_vehicle", "except", "conditional"}

def controls(tags):
    highway = tags.get("highway")
    if highway == "traffic_signals":
        return "signal"
    if highway == "stop":
        return "stop"
    if highway == "give_way":
        return "yield"
    traffic_sign = tags.get("traffic_sign", "").lower()
    if any(code in traffic_sign for code in ("stop", "th:stop")):
        return "stop"
    if any(code in traffic_sign for code in ("give_way", "yield", "th:give_way")):
        return "yield"
    if traffic_sign: return "sign"  # Preserve actual tagged signs without assigning unverified legal effect.
    return None

class Extract(osmium.SimpleHandler):
    def __init__(self, bbox, way_ids):
        super().__init__()
        self.bbox, self.way_ids = bbox, way_ids
        self.nodes, self.relations = [], []
        self.counts = {"signals": 0, "stops": 0, "yields": 0, "otherSigns": 0, "restrictions": 0}
    def node(self, node):
        if not node.location.valid():
            return
        lon, lat = node.lon, node.lat
        if not (self.bbox[0] <= lon <= self.bbox[2] and
                self.bbox[1] <= lat <= self.bbox[3]):
            return
        tags = dict(node.tags)
        kind = controls(tags)
        if not kind:
            return
        self.nodes.append({
            "id": f"osm:node/{node.id}", "kind": kind,
            "coordinate": [lon, lat],
            "tags": {k: v for k, v in tags.items() if k in CONTROL_TAGS},
        })
        self.counts[{"signal":"signals", "stop":"stops", "yield":"yields", "sign":"otherSigns"}[kind]] += 1
    def relation(self, rel):
        tags = dict(rel.tags)
        if tags.get("type") not in {"restriction", "restriction:motorcar", "restriction:motor_vehicle"}:
            return
        from_ways = [f"osm:way/{m.ref}" for m in rel.members
                     if m.role == "from" and m.type == "w"]
        to_ways = [f"osm:way/{m.ref}" for m in rel.members
                   if m.role == "to" and m.type == "w"]
        via = [{"id": f"osm:{'node' if m.type == 'n' else 'way' if m.type == 'w' else 'relation'}/{m.ref}",
                "role": m.role} for m in rel.members if m.role == "via"]
        if not from_ways or not to_ways or not via:
            return
        if not any(w in self.way_ids for w in from_ways) or not any(w in self.way_ids for w in to_ways):
            return
        self.relations.append({
            "id": f"osm:relation/{rel.id}", "from": from_ways,
            "to": to_ways, "via": via,
            "tags": {k: v for k, v in tags.items() if
                     k in RESTRICTION_TAGS or k.startswith("restriction:")},
        })
        self.counts["restrictions"] += 1

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--pbf", required=True, type=pathlib.Path)
    parser.add_argument("--output", type=pathlib.Path, default=OUTPUT)
    parser.add_argument("--allow-newer-controls", action="store_true",
                        help="Explicitly import newer OSM signs; runtime will match only pre-existing graph node IDs and close coordinates")
    parser.add_argument("--source-url", default="https://download.geofabrik.de/asia/thailand-261024.osm.pbf")
    args = parser.parse_args()
    sha = hashlib.file_digest(args.pbf.open("rb"), "sha256").hexdigest()
    if sha != PBF_SHA and not args.allow_newer_controls:
        raise SystemExit(f"Wrong Thailand source checksum: {sha}; expected {PBF_SHA}; --allow-newer-controls required")
    with gzip.open(GEOGRAPHY / "runtime.v1.json.gz", "rt") as f:
        runtime = json.load(f)
    bbox = runtime["bbox"]
    way_ids = {road["id"] for road in runtime["roads"]}
    handler = Extract(bbox, way_ids)
    handler.apply_file(str(args.pbf), locations=False)
    result = {
        "schema": 1, "source": args.source_url,
        "pbfSha256": sha,
        "baselinePbfSha256": PBF_SHA,
        "matchesBaselineSnapshot": sha == PBF_SHA,
        "extractedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "geographicSourceSha256": hashlib.sha256(
            (GEOGRAPHY / "runtime.v1.json.gz").read_bytes()).hexdigest(),
        "bbox": bbox,
        "nodes": sorted(handler.nodes, key=lambda n: n["id"]),
        "restrictions": sorted(handler.relations, key=lambda n: n["id"]),
    }
    if not result["nodes"]:
        raise SystemExit("Import returned no traffic controls: source or filter is wrong")
    # Different vintages are safe only if mapped to unchanged original OSM
    # vertex IDs with close coordinates during the runtime compile step.
    if sha != PBF_SHA:
        print("Different controls snapshot: spatial/source-ID match REQUIRED before runtime use.", flush=True)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, separators=(",",":"), sort_keys=True,
                                      ensure_ascii=False) + "\n")
    print("Traffic controls extracted from pinned PBF:", handler.counts, flush=True)
    print("Source IDs and original tags preserved; no phase/timing data inferred.", flush=True)

if __name__ == "__main__":
    main()
