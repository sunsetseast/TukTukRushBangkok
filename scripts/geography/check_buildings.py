"""Independent source/runtime geometry, provenance, seam ownership and clearance checks."""

import unittest, sys, json, gzip, hashlib
from pathlib import Path
from shapely.geometry import Polygon, MultiPolygon, shape, LineString, Point
from shapely import ops, prepare
from shapely.strtree import STRtree
from shapely.affinity import translate
from buildings import number, design, Buildings, surface_exclusion
import tempfile, osmium
from import_bangkok import DATA, OUT, readzip, project_geom, EXTENT


class HeightFixtures(unittest.TestCase):
    def test_surface_reference_policy(self):
        self.assertIsNotNone(
            surface_exclusion({"building": "yes", "location": "underground"})
        )
        self.assertIsNotNone(surface_exclusion({"building": "ruins"}))
        self.assertIsNone(surface_exclusion({"building": "yes", "abandoned": "yes"}))
        self.assertIsNone(
            surface_exclusion({"building:part": "yes", "min_height": "20"})
        )

    def test_units_and_bad_tags(self):
        self.assertEqual(number("12 m"), 12)
        self.assertAlmostEqual(number("30'"), 9.144)
        self.assertIsNone(number("unknown"))
        self.assertIsNone(number("4;12"))

    def test_deterministic_historic_and_tag_priority(self):
        b = {
            "id": "osm:way/1",
            "tags": {"building": "yes"},
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [100.51, 13.74],
                        [100.5101, 13.74],
                        [100.5101, 13.7401],
                        [100.51, 13.74],
                    ]
                ],
            },
        }
        p = project_geom(shape(b["geometry"]))
        a = design(b, p)
        self.assertEqual(a, design(b, p))
        self.assertLess(a["height"], 16)
        self.assertEqual(a["family"], "shophouse")
        b["tags"].update(height="80", **{"building:levels": "3"})
        self.assertEqual(design(b, p)["height"], 80)
        b["tags"]["height"] = "9999"
        self.assertEqual(design(b, p)["heightBasis"], "osm:building:levels")

    def test_relation_assembled_before_clipping(self):
        xml = '<osm version="0.6">\n<node id="1" lat="13.74" lon="100.51"/><node id="2" lat="13.74" lon="100.511"/><node id="3" lat="13.741" lon="100.511"/><node id="4" lat="13.741" lon="100.51"/>\n<node id="5" lat="13.7402" lon="100.5102"/><node id="6" lat="13.7402" lon="100.5104"/><node id="7" lat="13.7404" lon="100.5104"/><node id="8" lat="13.7404" lon="100.5102"/>\n<way id="10"><nd ref="1"/><nd ref="2"/><nd ref="3"/></way><way id="11"><nd ref="3"/><nd ref="4"/><nd ref="1"/></way>\n<way id="12"><nd ref="5"/><nd ref="6"/><nd ref="7"/><nd ref="8"/><nd ref="5"/></way>\n<relation id="20"><member type="way" ref="10" role="outer"/><member type="way" ref="11" role="outer"/><member type="way" ref="12" role="inner"/><tag k="type" v="multipolygon"/><tag k="building" v="yes"/></relation></osm>'
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / "relation.osm"
            p.write_text(xml)
            h = Buildings()
            h.apply_file(
                str(p),
                locations=True,
                idx="sparse_mem_array",
                filters=[osmium.filter.KeyFilter("building", "building:part")],
            )
        b = h.items["osm:relation/20"]
        geom = shape(b["geometry"])
        self.assertTrue(geom.is_valid)
        self.assertEqual(sum(len(p.interiors) for p in geom.geoms), 1)
        self.assertEqual(len(b["members"]), 3)
        self.assertEqual(b["memberRoles"][2]["role"], "inner")

    def test_courtyard_and_cross_tile_fixture(self):
        p = Polygon(
            [(1000, 0), (1050, 0), (1050, 40), (1020, 30), (1000, 40)],
            holes=[[(1010, 5), (1010, 10), (1015, 10), (1015, 5)]],
        )
        self.assertTrue(p.is_valid)
        self.assertEqual(len(p.interiors), 1)
        self.assertAlmostEqual(
            translate(translate(p, xoff=-1024), xoff=1024).symmetric_difference(p).area,
            0,
        )


if __name__ == "__main__":
    result = unittest.TextTestRunner().run(
        unittest.defaultTestLoader.loadTestsFromTestCase(HeightFixtures)
    )
    if not result.wasSuccessful():
        sys.exit(1)
    if not (DATA / "buildings-source.v1.json.gz").exists():
        sys.exit("Missing pinned building source")
    source = readzip(DATA / "buildings-source.v1.json.gz")
    runtime = readzip(OUT)
    byid = {b["id"]: b for b in source["buildings"]}
    assert (
        source["source"]["pbfSha256"]
        == "e8373240cf0be47cc641f2c8627e674064d8c47f4ff2a11f6a33fcbfc9a50949"
    )
    assert runtime["origin"] == [660000, 1520000] and runtime["crs"] == "EPSG:32647"
    seen = set()
    courtyards = cross = colliders = 0
    roads = [
        (r, LineString([runtime["nodes"][n] for n in r["nodes"]]))
        for r in runtime["roads"]
        if not r["tunnel"]
    ]
    tree = STRtree([p for _, p in roads])
    water = MultiPolygon([Polygon(p[0], p[1:]) for p in runtime["waterUnion"]])
    prepare(water)
    protected = json.loads((DATA / "building-replacements.v1.json").read_text())
    from import_bangkok import xy

    guards = [
        Point(xy(*b["coordinate"])).buffer(b["radius"] - 0.002)
        for b in protected["sites"]
    ]
    members = set(source["suppressedMemberWays"])
    for ref in runtime["chunks"]:
        path = OUT.parent / ref["file"]
        assert hashlib.sha256(path.read_bytes()).hexdigest() == ref["sha256"]
        chunk = readzip(path)
        x, z = chunk["origin"]
        for b in chunk.get("buildings", []):
            assert b["id"] not in seen and b["id"] not in members, b["id"]
            seen.add(b["id"])
            src = byid[b["id"]]
            assert b["tags"] == src["tags"] and b["sourceVersion"] == src["version"]
            assert not b["inferred"] and b["provenance"] == "osm-footprint"
            source_geom = project_geom(shape(src["geometry"])).intersection(
                project_geom(EXTENT)
            )
            original = translate(
                MultiPolygon([Polygon(p[0], p[1:]) for p in b["sourceFootprint"]]),
                xoff=x,
                yoff=z,
            )
            assert original.is_valid and original.symmetric_difference(
                source_geom
            ).area < max(0.5, source_geom.length * 0.002), b["id"]
            generated = translate(
                MultiPolygon([Polygon(p[0], p[1:]) for p in b["polygons"]]),
                xoff=x,
                yoff=z,
            )
            assert generated.is_valid and generated.area > 0
            assert all(not original.intersects(p) for p in guards), b["id"]
            assert b["height"] > b["minHeight"] and b["height"] <= 350
            courtyards += sum(len(p[1:]) for p in b["polygons"])
            cross += not Polygon(
                [(x, z), (x + 1024, z), (x + 1024, z + 1024), (x, z + 1024)]
            ).covers(original)
            for edge in b["edges"]:
                if not edge["collision"]:
                    continue
                a, c = edge["a"], edge["b"]
                line = LineString([(a[0] + x, a[1] + z), (c[0] + x, c[1] + z)])
                assert not water.intersects(line)
                for i in tree.query(line.buffer(30)):
                    r, p = roads[i]
                    assert line.distance(p) >= r["width"] / 2 + 0.398, (
                        b["id"],
                        r["id"],
                    )
                colliders += 1
    report = json.loads((DATA / "buildings-report.v1.json").read_bytes())
    excluded_ids = {b["id"] for b in report["excluded"]}
    rejected_ids = {b["id"] for b in report["runtimeRejected"]}
    assert not (seen & excluded_ids or seen & rejected_ids or excluded_ids & rejected_ids)
    assert seen | excluded_ids | rejected_ids == set(byid), (
        "Every usable source footprint has a documented runtime disposition"
    )
    ledger = DATA / report["exceptionsFile"]
    assert hashlib.sha256(ledger.read_bytes()).hexdigest() == report["exceptionsSha256"]
    exception_records = readzip(ledger)["conflicts"]
    assert len(exception_records) == report["clearanceExceptionCount"]
    assert all(c["id"] in seen for c in exception_records)
    assert (
        report["maxOwnerChunkReach"] <= 1
    ), "Every complete footprint owner remains in the 3x3 neighborhood"
    assert (
        len(seen) == report["renderedCount"]
        and courtyards == report["courtyards"]
        and cross == report["crossChunkBuildings"]
    )
    assert all(
        b["id"] in byid and b["reason"] == "invalid or sub-meter clipped geometry"
        for b in report["runtimeRejected"]
    ), report["runtimeRejected"][:4]
    print(
        json.dumps(
            {
                "pass": True,
                "uniqueRendered": len(seen),
                "courtyards": courtyards,
                "crossChunk": cross,
                "safeCollisionEdges": colliders,
            },
            indent=2,
        )
    )
