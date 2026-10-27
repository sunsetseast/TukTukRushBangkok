"""Source-backed building extension. Kept separate from the immutable PR46 road snapshot.
Full assembled polygons live in a bounded, attributed offline source companion.
One complete building per owner tile: no artificial walls on 1024m seams.
"""

import hashlib, json, math, re, time
import numpy as np
import shapely
import osmium
from shapely import geometry as g, ops, normalize, set_precision, prepare
from shapely.geometry import shape, mapping
from shapely.strtree import STRtree
from import_bangkok import (
    DATA,
    project,
    ORIGIN,
    OUT,
    BBOX,
    EXTENT,
    project_geom,
    readzip,
    writezip,
    digest,
    encode,
    rings,
    polygons,
    xy,
)

PIN = "e8373240cf0be47cc641f2c8627e674064d8c47f4ff2a11f6a33fcbfc9a50949"
SOURCE = DATA / "buildings-source.v1.json.gz"


class Buildings(osmium.SimpleHandler):
    def __init__(self):
        super().__init__()
        self.items = {}
        self.members = {}
        self.roles = {}
        self.candidates = {}
        self.failures = []
        self.factory = osmium.geom.GeoJSONFactory()
        self.scanned = 0

    def way(self, w):
        t = dict(w.tags)
        if not (
            t.get("building", "no") != "no" or t.get("building:part", "no") != "no"
        ):
            return
        pts = [(n.lon, n.lat) for n in w.nodes if n.location.valid()]
        if len(pts) < 2:
            if pts and EXTENT.covers(g.Point(pts[0])):
                self.failures.append(
                    {"id": f"osm:way/{w.id}", "reason": "fewer than two located nodes"}
                )
            return
        xs, ys = zip(*pts)
        if (
            max(xs) < BBOX[0]
            or min(xs) > BBOX[2]
            or max(ys) < BBOX[1]
            or min(ys) > BBOX[3]
        ):
            return
        if g.LineString(pts).intersects(EXTENT):
            self.candidates[f"osm:way/{w.id}"] = {
                "closed": w.is_closed(),
                "version": w.version,
                "tags": t,
            }

    def relation(self, r):
        t = dict(r.tags)
        if t.get("type") == "multipolygon" and (
            t.get("building", "no") != "no" or t.get("building:part", "no") != "no"
        ):
            self.members[f"osm:relation/{r.id}"] = [
                f"osm:way/{m.ref}" for m in r.members if m.type == "w"
            ]
            self.roles[f"osm:relation/{r.id}"] = [
                {"id": f"osm:way/{m.ref}", "role": m.role}
                for m in r.members
                if m.type == "w"
            ]

    def area(self, a):
        t = dict(a.tags)
        if not (
            t.get("building", "no") != "no" or t.get("building:part", "no") != "no"
        ):
            return
        self.scanned += 1
        if self.scanned % 100000 == 0:
            print(
                f"Scanned {self.scanned} country building areas; retained {len(self.items)} bounded footprints",
                flush=True,
            )
        outer = [(n.lon, n.lat) for r in a.outer_rings() for n in r]
        if not outer:
            return
        xs, ys = zip(*outer)
        if (
            max(xs) < BBOX[0]
            or min(xs) > BBOX[2]
            or max(ys) < BBOX[1]
            or min(ys) > BBOX[3]
        ):
            return
        ident = f'osm:{"way" if a.from_way() else "relation"}/{a.orig_id()}'
        try:
            geom = shape(json.loads(self.factory.create_multipolygon(a)))
            if not geom.intersects(EXTENT):
                return
            # Do not silently repair invalid source outlines into apparently surveyed geometry.
            if not geom.is_valid:
                raise ValueError("invalid assembled polygon")
            self.items[ident] = {
                "id": ident,
                "version": a.version,
                "tags": t,
                "geometry": mapping(geom),
                "members": self.members.get(ident, []),
                "memberRoles": self.roles.get(ident, []),
            }
        except Exception as e:
            self.failures.append({"id": ident, "reason": str(e)})


def extract(pbf):
    if hashlib.file_digest(pbf.open("rb"), "sha256").hexdigest() != PIN:
        raise ValueError("Pinned PBF checksum mismatch")
    h = Buildings()
    h.apply_file(
        str(pbf),
        locations=True,
        idx="sparse_file_array",
        filters=[osmium.filter.KeyFilter("building", "building:part")],
    )
    member_ids = {
        m
        for ident in h.items
        if ident.startswith("osm:relation/")
        for m in h.members.get(ident, [])
    }
    for ident in member_ids:
        h.items.pop(ident, None)
    missing = [
        {
            "id": ident,
            "reason": (
                "multipolygon member"
                if ident in member_ids
                else "open or unassembled way"
            ),
        }
        for ident in h.candidates
        if ident not in h.items and ident not in member_ids
    ]
    missing += [
        {"id": ident, "reason": "unassembled building relation"}
        for ident, members in h.members.items()
        if ident not in h.items and any(m in h.candidates for m in members)
    ]
    snap = {
        "schema": 1,
        "bbox": BBOX,
        "source": {
            "url": "https://download.geofabrik.de/asia/thailand-261024.osm.pbf",
            "pbfSha256": PIN,
            "snapshotDate": "2026-10-24",
            "extractedAt": "2026-10-27",
            "license": "ODbL-1.0",
            "attribution": "© OpenStreetMap contributors",
        },
        "buildings": sorted(h.items.values(), key=lambda b: b["id"]),
        "rejected": h.failures + missing,
        "suppressedMemberWays": sorted(member_ids & h.candidates.keys()),
    }
    writezip(SOURCE, snap)
    print(
        "Building source",
        len(snap["buildings"]),
        "rejected",
        len(snap["rejected"]),
        flush=True,
    )


def number(value):
    if not value:
        return None
    value = value.strip().lower()
    try:
        if re.fullmatch(r"\d+(\.\d+)?'", value):
            return float(value[:-1]) * 0.3048
        if re.fullmatch(r"\d+(\.\d+)?\s*(m|meters|metres)?", value):
            return float(re.match(r"[\d.]+", value)[0])
    except ValueError:
        pass
    return None


def surface_exclusion(tags):
    """An outline is not evidence of a standing surface building."""
    if tags.get("location") == "underground":
        return "underground source reference; no surface volume"
    if tags.get("building") in {"ruins", "demolished", "collapsed", "proposed"}:
        return "non-standing source reference; no assumed completed volume"
    return None


def design(b, geom, coordinate=None):
    t = b["tags"]
    seed = int(hashlib.sha256(b["id"].encode()).hexdigest()[:8], 16)
    lon, lat = (
        coordinate
        if coordinate is not None
        else shape(b["geometry"]).centroid.coords[0]
    )
    historic = 100.493 < lon < 100.523 and 13.717 < lat < 13.752
    kind = t.get("building:part", t.get("building", "yes"))
    if kind in {"warehouse", "industrial", "manufacture"}:
        family = "warehouse" if kind == "warehouse" else "industrial"
    elif kind == "hotel" or t.get("tourism") == "hotel":
        family = "hotel"
    elif kind in {"office", "commercial"}:
        family = "office" if kind == "office" else "mixed-use"
    elif kind in {"apartments", "dormitory"}:
        family = "apartment"
    elif (
        kind in {"retail", "shop", "shophouse"}
        or historic
        and kind == "yes"
        and geom.area < 700
    ):
        family = "shophouse" if geom.area < 700 else "commercial"
    elif kind in {"house", "detached", "residential", "terrace", "bungalow"}:
        family = "residential"
    elif kind in {"temple", "church", "mosque", "religious", "shrine"}:
        family = "religious"
    else:
        family = "commercial" if geom.area > 1000 else "residential"
    tagged = number(t.get("height"))
    levels = number(t.get("building:levels"))
    minimum = number(t.get("min_height"))
    if minimum is None:
        minimum = (number(t.get("building:min_level")) or 0) * 3.2
    minimum = minimum if 0 <= minimum <= 340 else 0
    floor = 3.8 if family in {"office", "hotel", "mixed-use"} else 3.2
    estimated = {
        "shophouse": 3,
        "commercial": 3 if historic else 4,
        "mixed-use": 4 if historic else 6,
        "office": 6,
        "hotel": 5,
        "apartment": 5,
        "residential": 2,
        "warehouse": 2,
        "industrial": 2,
        "religious": 3,
    }[family]
    # Estimates have no random towers. Large generic footprints do not imply high rise.
    estimated += (
        seed % 2 if family not in {"warehouse", "industrial", "religious"} else 0
    )
    valid_height = tagged is not None and 2 <= tagged <= 350 and tagged > minimum
    valid_levels = levels is not None and 1 <= levels <= 90
    height = (
        tagged
        if valid_height
        else levels * floor if valid_levels else estimated * floor
    )
    if (
        kind in {"roof", "carport", "garage", "garages", "shed", "hut"}
        and not valid_height
        and not valid_levels
    ):
        height = 4.2 if kind in {"roof", "carport"} else 3.2
    height = max(minimum + 2, height)
    if height > 65:
        family = "high-rise"
    ring = max(polygons(geom), key=lambda p: p.area).exterior
    a, c = max(zip(ring.coords, list(ring.coords)[1:]), key=lambda e: math.dist(*e))
    orientation = math.atan2(c[1] - a[1], c[0] - a[0])
    roof = t.get(
        "roof:shape",
        (
            "flat"
            if family not in {"residential", "warehouse", "industrial", "religious"}
            else "gabled"
        ),
    )
    unsupported_roof = roof not in {"flat", "gabled", "hipped", "pyramidal", "skillion"}
    if unsupported_roof:
        roof = "flat"
    rh = number(t.get("roof:height"))
    rh = min(
        (height - minimum) * 0.45,
        (
            rh
            if rh is not None and 0 <= rh <= 30
            else min(3, height * 0.18) if roof != "flat" else 0
        ),
    )
    return {
        "seed": seed,
        "orientation": round(orientation, 6),
        "neighborhood": "historic-core" if historic else "metropolitan",
        "roofRenderedAs": (
            "flat-approximation"
            if unsupported_roof
            else (
                "flat"
                if roof == "flat"
                else (
                    "skillion"
                    if roof == "skillion"
                    else "ridge-approximation" if roof != "gabled" else "gabled"
                )
            )
        ),
        "family": family,
        "classification": kind,
        "height": round(height, 3),
        "minHeight": round(minimum, 3),
        "floors": (
            round(levels) if valid_levels else max(1, round((height - minimum) / floor))
        ),
        "heightBasis": (
            "osm:height"
            if valid_height
            else (
                "osm:building:levels"
                if valid_levels
                else "estimated:type+historic-context:v1"
            )
        ),
        "roof": roof,
        "roofHeight": round(rh, 3),
        "roofBasis": (
            "unsupported-source-shape:flat-approximation"
            if unsupported_roof
            else "osm:roof:shape" if "roof:shape" in t else "estimated:type:v1"
        ),
        "material": (
            "metal"
            if family in {"warehouse", "industrial"}
            else "panel" if family in {"office", "high-rise"} else "plaster"
        ),
        "confidence": (
            "tagged-height"
            if valid_height
            else "tagged-levels" if valid_levels else "estimated-height"
        ),
        "provenance": "osm-footprint",
        "inferred": False,
    }


def build():
    if not SOURCE.exists():
        return
    started = time.perf_counter()
    snap = readzip(SOURCE)
    runtime = readzip(OUT)
    manifest = json.loads((DATA / "manifest.v1.json").read_bytes())
    water = ops.unary_union([g.Polygon(p[0], p[1:]) for p in runtime["waterUnion"]])
    prepare(water)
    roads = [
        g.LineString([runtime["nodes"][n] for n in r["nodes"]])
        for r in runtime["roads"]
        if not r["tunnel"]
    ]
    road_refs = [r for r in runtime["roads"] if not r["tunnel"]]
    tree = STRtree(roads)
    road_array = np.array(roads, dtype=object)
    widths = np.array([r["width"] for r in road_refs])
    max_clearance = float(widths.max() / 2 + 0.4)
    protected = json.loads((DATA / "building-replacements.v1.json").read_text())
    guards = [
        (
            r,
            (
                project_geom(g.Polygon(r["polygon"]))
                if r.get("polygon")
                else g.Point(xy(*r["coordinate"])).buffer(r["radius"])
            ),
        )
        for r in protected["sites"]
    ]
    extent = project_geom(EXTENT)
    entries = []
    excluded = []
    rejected = []
    seen = {}
    conflicts = []
    parts = []

    def authority(b):
        h = number(b["tags"].get("height"))
        levels = number(b["tags"].get("building:levels"))
        return (
            -(
                2
                if h is not None and 2 <= h <= 350
                else 1 if levels is not None and 1 <= levels <= 90 else 0
            ),
            b["id"],
        )

    # Transform all source vertices in one pyproj/Shapely array operation. The
    # coordinates and precision contract are identical to the road projection;
    # this avoids hundreds of thousands of Python geometry reconstruction calls.
    source_shapes = np.array(
        [shape(b["geometry"]) for b in snap["buildings"]], dtype=object
    )
    centers = shapely.get_coordinates(shapely.centroid(source_shapes))

    def projected_axes(x, y):
        east, north = project.transform(x, y)
        return east - ORIGIN[0], ORIGIN[1] - north

    projected = shapely.intersection(
        shapely.transform(source_shapes, projected_axes, interleaved=False), extent
    )
    source_index = {b["id"]: i for i, b in enumerate(snap["buildings"])}
    source_tree = STRtree(source_shapes)
    source_holes = int(
        shapely.get_num_interior_rings(shapely.get_parts(source_shapes)).sum()
    )
    for b in sorted(snap["buildings"], key=authority):
        exclusion = surface_exclusion(b['tags'])
        if exclusion:
            excluded.append({'id': b['id'], 'reason': exclusion})
            continue
        index = source_index[b["id"]]
        geom = projected[index]
        if not geom.is_valid or geom.is_empty or geom.area < 1:
            rejected.append(
                {"id": b["id"], "reason": "invalid or sub-meter clipped geometry"}
            )
            continue
        geom = set_precision(geom, 0.001)
        key = (
            normalize(geom).wkb,
            b["tags"].get("building:part", "no") != "no",
            b["tags"].get("min_height", "0"),
        )
        if key in seen:
            excluded.append(
                {"id": b["id"], "reason": "duplicate geometry", "replacedBy": seen[key]}
            )
            continue
        seen[key] = b["id"]
        guard = next(
            (
                r
                for r, p in guards
                if geom.intersects(p) or b["id"] in r.get("sourceIds", [])
            ),
            None,
        )
        if guard:
            excluded.append(
                {
                    "id": b["id"],
                    "reason": "handcrafted replacement",
                    "replacedBy": guard["id"],
                }
            )
            continue
        entry = (b, geom, design(b, geom, centers[index]))
        entries.append(entry)
        if b["tags"].get("building:part", "no") != "no":
            parts.append(entry)
    del projected, centers, source_index
    print(
        f"Classified {len(entries)} buildings in {time.perf_counter()-started:.1f}s",
        flush=True,
    )
    whole = [e for e in entries if e[0]["tags"].get("building:part", "no") == "no"]
    whole_tree = STRtree([p for _, p, _ in whole])
    for b, p, meta in parts:
        if not meta["heightBasis"].startswith("estimated:"):
            continue
        parents = [
            whole[i]
            for i in whole_tree.query(p)
            if whole[i][1].intersection(p).area > p.area * 0.9
            and not whole[i][2]["heightBasis"].startswith("estimated:")
        ]
        if not parents:
            continue
        parent, _, pm = min(parents, key=lambda e: e[1].area)
        if pm["height"] <= meta["minHeight"] + 2:
            continue
        meta.update(
            height=pm["height"],
            floors=pm["floors"],
            heightBasis="inherited:osm-parent",
            confidence="inherited-height",
            parentId=parent["id"],
        )
        if b["tags"].get("building:part") == "yes":
            meta.update(family=pm["family"], material=pm["material"])
    part_tree = STRtree([p for _, p, _ in parts])
    overlap_tree = STRtree([p for _, p, _ in entries])
    overlaps = []
    for i, (b, p, meta) in enumerate(entries):
        for j in overlap_tree.query(p):
            if j <= i:
                continue
            other, q, om = entries[j]
            if (
                b["tags"].get("building:part", "no") != "no"
                or other["tags"].get("building:part", "no") != "no"
            ):
                continue
            area = p.intersection(q).area
            if area > 1:
                overlaps.append(
                    {
                        "a": b["id"],
                        "b": other["id"],
                        "areaM2": round(area, 2),
                        "action": "source overlap retained; manual mapping review needed",
                    }
                )
    chunks = {tuple(c["origin"]): [] for c in runtime["chunks"]}
    counts = {}
    cross = holes = collision_edges = 0
    max_owner_reach = 0
    for index, (b, original, meta) in enumerate(entries):
        if index % 10000 == 0:
            print(
                f"Building runtime {index}/{len(entries)} at {time.perf_counter()-started:.1f}s",
                flush=True,
            )
        geom = original
        if b["tags"].get("building:part", "no") == "no" and parts:
            children = [
                parts[i][1]
                for i in part_tree.query(geom)
                if geom.intersection(parts[i][1]).area > parts[i][1].area * 0.9
            ]
            if children:
                geom = geom.difference(ops.unary_union(children))
        if geom.is_empty:
            excluded.append(
                {
                    "id": b["id"],
                    "reason": "whole footprint represented by building parts",
                }
            )
            continue
        # Complete source outline retained separately; generated parent volumes subtract parts.
        ps = polygons(geom)
        ps = [normalize(p) for p in ps if p.area >= 0.1]
        if not ps:
            excluded.append({
                "id": b["id"],
                "reason": "residual polygons below 0.1 m2; no supported volume",
            })
            continue
        owner = original.representative_point()
        origin = (math.floor(owner.x / 1024) * 1024, math.floor(owner.y / 1024) * 1024)
        if origin not in chunks:
            rejected.append({"id": b["id"], "reason": "no existing owner chunk"})
            continue
        max_owner_reach = max(
            max_owner_reach,
            max(
                max(
                    abs(math.floor(a / 1024) - origin[0] // 1024),
                    abs(math.floor(c / 1024) - origin[1] // 1024),
                )
                for p in polygons(original)
                for a, c in p.exterior.coords
            ),
        )

        def local(p):
            p = normalize(p)
            return [
                [
                    [round(x - origin[0], 3), round(y - origin[1], 3)]
                    for x, y in r.coords
                ]
                for r in [p.exterior, *p.interiors]
            ]

        edge_records = []
        for pi, p in enumerate(ps):
            holes += len(p.interiors)
            for ri, ring in enumerate([p.exterior, *p.interiors]):
                coords = list(ring.coords)
                edge_records.extend(
                    (pi, ri, ei, a, c)
                    for ei, (a, c) in enumerate(zip(coords, coords[1:]))
                )
        # Bulk spatial queries preserve exact source edges while removing the
        # per-edge Python/GEOS call and 40m buffer allocations.
        coordinates = np.array([[e[3], e[4]] for e in edge_records])
        segments = shapely.linestrings(coordinates)
        mids = shapely.line_interpolate_point(segments, 0.5, normalized=True)
        nearest = tree.nearest(mids)
        near_roads = road_array[nearest]
        closest = shapely.get_coordinates(
            shapely.line_interpolate_point(
                near_roads, shapely.line_locate_point(near_roads, mids)
            )
        )
        mid_xy = coordinates.mean(axis=1)
        delta = coordinates[:, 1] - coordinates[:, 0]
        facing = (
            -delta[:, 1] * (closest[:, 0] - mid_xy[:, 0])
            + delta[:, 0] * (closest[:, 1] - mid_xy[:, 1])
        ) > 0
        distances = shapely.distance(mids, near_roads)
        pairs = tree.query(segments, predicate="dwithin", distance=max_clearance)
        blocked_edges = {}
        if pairs.shape[1]:
            collision_dist = shapely.distance(segments[pairs[0]], road_array[pairs[1]])
            for edge_index, road_index in pairs[
                :, collision_dist < widths[pairs[1]] / 2 + 0.4
            ].T:
                blocked_edges.setdefault(int(edge_index), set()).add(
                    road_refs[int(road_index)]["id"]
                )
        wet = shapely.intersects(water, segments)
        edges = []
        blocked = []
        for i, (pi, ri, ei, a, c) in enumerate(edge_records):
            r = road_refs[int(nearest[i])]
            close = (
                facing[i]
                and not r["bridge"]
                and min(r["heights"]) < 1
                and distances[i] < r["width"] / 2 + 25
            )
            blocked.extend(blocked_edges.get(i, ()))
            edges.append(
                {
                    "polygon": pi,
                    "ring": ri,
                    "edge": ei,
                    "a": [round(a[0] - origin[0], 3), round(a[1] - origin[1], 3)],
                    "b": [round(c[0] - origin[0], 3), round(c[1] - origin[1], 3)],
                    "street": r["id"] if close and ri == 0 else None,
                    "collision": i not in blocked_edges
                    and not bool(wet[i])
                    and meta["minHeight"] < 0.5
                    and meta["classification"] not in {"roof", "carport"},
                }
            )
        wc = water.intersection(original).area if water.intersects(original) else 0
        if blocked or wc > 0.1:
            conflicts.append(
                {
                    "id": b["id"],
                    "roads": sorted(set(blocked)),
                    "waterAreaM2": round(wc, 2),
                    "action": "geometry preserved; unsafe wall collisions withheld",
                }
            )
        collision_edges += sum(e["collision"] for e in edges)
        cross += not g.box(
            origin[0], origin[1], origin[0] + 1024, origin[1] + 1024
        ).covers(original)
        counts[meta["family"]] = counts.get(meta["family"], 0) + 1
        chunks[origin].append(
            {
                "id": b["id"],
                "sourceVersion": b["version"],
                "tags": b["tags"],
                **meta,
                "polygons": [local(p) for p in ps],
                "sourceFootprint": [local(p) for p in polygons(original)],
                "edges": edges,
            }
        )
    for ref in runtime["chunks"]:
        path = OUT.parent / ref["file"]
        chunk = readzip(path)
        chunk["buildings"] = chunks[tuple(ref["origin"])]
        writezip(path, chunk)
        ref.update(sha256=digest(path.read_bytes()), bytes=path.stat().st_size)
    runtime["buildingSourceSha256"] = digest(SOURCE.read_bytes())
    writezip(OUT, runtime)
    manifest.update(
        runtimeSha256=digest(OUT.read_bytes()),
        runtimeBytes=OUT.stat().st_size,
        chunkBytes=sum(c["bytes"] for c in runtime["chunks"]),
    )
    manifest["buildings"] = {
        "sourceSha256": runtime["buildingSourceSha256"],
        "sourceCount": len(snap["buildings"]),
        "renderedCount": sum(map(len, chunks.values())),
        "infillEnabled": False,
    }
    (DATA / "manifest.v1.json").write_bytes(encode(manifest) + b"\n")
    coverage = []
    for name, bounds in [
        ("Yaowarat", [100.503, 13.735, 100.515, 13.745]),
        ("Bang Rak", [100.511, 13.720, 100.526, 13.734]),
        ("north", [100.46, 13.78, 100.65, 13.825]),
        ("east", [100.58, 13.63, 100.65, 13.78]),
        ("southwest", [100.46, 13.63, 100.51, 13.71]),
    ]:
        bb = g.box(*bounds)
        indices = source_tree.query(bb, predicate="intersects")
        items = [snap["buildings"][i] for i in indices]
        coverage.append(
            {
                "area": name,
                "bbox": bounds,
                "sourceFootprints": len(items),
                "footprintCoveragePercent": round(
                    float(
                        shapely.area(
                            shapely.transform(
                                shapely.intersection(source_shapes[indices], bb),
                                projected_axes,
                                interleaved=False,
                            )
                        ).sum()
                    )
                    / project_geom(bb).area
                    * 100,
                    2,
                ),
            }
        )
    report = {
        "source": snap["source"],
        "bbox": BBOX,
        "sourceCount": len(snap["buildings"]),
        "sourceRejected": snap["rejected"],
        "suppressedMultipolygonMembers": len(snap["suppressedMemberWays"]),
        "sourceWholeBuildings": sum(
            b["tags"].get("building:part", "no") == "no" for b in snap["buildings"]
        ),
        "sourceParts": sum(
            b["tags"].get("building:part", "no") != "no" for b in snap["buildings"]
        ),
        "sourceRelations": sum(
            b["id"].startswith("osm:relation/") for b in snap["buildings"]
        ),
        "heightBasisCounts": {
            basis: sum(
                b["heightBasis"] == basis for items in chunks.values() for b in items
            )
            for basis in sorted(
                {b["heightBasis"] for items in chunks.values() for b in items}
            )
        },
        "taggedHeight": sum(
            number(b["tags"].get("height")) is not None for b in snap["buildings"]
        ),
        "taggedLevels": sum(
            number(b["tags"].get("building:levels")) is not None
            for b in snap["buildings"]
        ),
        "renderedCount": sum(map(len, chunks.values())),
        "renderedFamilies": counts,
        "maxOwnerChunkReach": max_owner_reach,
        "crossChunkBuildings": cross,
        "courtyards": holes,
        "sourceCourtyardRings": source_holes,
        "collisionEdges": collision_edges,
        "excluded": excluded,
        "runtimeRejected": rejected,
        "conflicts": conflicts,
        "sourceOverlaps": overlaps,
        "coverage": coverage,
        "chunkBytes": manifest["chunkBytes"],
        "sourceBytes": SOURCE.stat().st_size,
        "inferredBuildings": 0,
    }
    compact_report(report)
    (DATA / "buildings-report.v1.json").write_bytes(encode(report) + b"\n")
    print(
        "Buildings",
        report["renderedCount"],
        "families",
        counts,
        "conflicts",
        len(conflicts),
        flush=True,
    )


def compact_report(report):
    """Keep the reviewable summary small; preserve every exception in a gzip ledger."""
    conflicts = report.pop("conflicts")
    path = DATA / "building-exceptions.v1.json.gz"
    writezip(path, {"schema": 1, "source": report["source"], "conflicts": conflicts})
    report.update(
        clearanceExceptionCount=len(conflicts),
        roadExceptionCount=sum(bool(c["roads"]) for c in conflicts),
        waterExceptionCount=sum(c["waterAreaM2"] > 0.1 for c in conflicts),
        conflictExamples=conflicts[:20],
        exceptionsFile=path.name,
        exceptionsSha256=digest(path.read_bytes()),
    )
