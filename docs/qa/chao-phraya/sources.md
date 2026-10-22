# Sources, licensing and reproduction

All retained OSM-derived geographic data is **© OpenStreetMap contributors, ODbL 1.0**. [Copyright/license](https://www.openstreetmap.org/copyright). Keep attribution with redistributed derived data. No restricted commercial mapping imagery or generated image is used as implementation proof.

## Retained geographic inputs

| Input | Source and purpose |
|---|---|
| [Riverbank GeoJSON](reference/riverbanks-osm.geojson) | Complete OSM water multipolygons [14038958](https://www.openstreetmap.org/relation/14038958), [14038959](https://www.openstreetmap.org/relation/14038959), [18576208](https://www.openstreetmap.org/relation/18576208). Source banks and water-covered area. |
| [Non-terrain structures](reference/non-terrain-structures.geojson) | Five OSM inner ways tagged `bridge:support=yes` or `building=boathouse`. Retained as boat-clearance exclusions rather than terrain islands. |
| [Centerline GeoJSON](reference/centerline-osm.geojson) | Main-stream member ways of [227317](https://www.openstreetmap.org/relation/227317), bounded to the playable research reach. Direction and ambient boat metadata, not the bank authority. |
| [Bridge GeoJSON](reference/bridges-osm.geojson) | OSM bbox extracts around Pinklao, Memorial/Prajadhipok and Taksin; exact requests/hashes in [bridge retrieval](reference/bridge-retrieval.json). Named roadways and crossing context; nearby canal crossings are retained as context. |
| [Asiatique observations](reference/asiatique-observation.json) | Marketplace way 196107455, wheel way 342522015 and ferry node 2074694261. Object classes remain distinct; a ferry stop is not treated as the market's surveyed center. |
| Existing repository research | `data/bangkok/osm-reference.v1.geojson`, `osm-places.v1.json`, canonical geographic references and PR34/35 QA snapshots. Reused for streets, operator sources and nominal landmark locations. |
| [Provenance](reference/provenance.json) | API URLs, raw XML SHA-256/byte counts, retrieval completion times, query fallbacks and software versions. Contributor-account metadata is not retained. |

Overpass API returned 502 and the alternate endpoint timed out. OSM API bbox discovery followed by `relation/{id}/full` retrieval supplied complete bank topology. The frozen GeoJSON, rather than today's mutable API response, reproduces this PR exactly. The centerline and bank relation classes were checked separately. Legacy `waterway=riverbank` tagging was considered rather than assumed absent from the OSM model.

## Primary reference checks

- [OSM rivers documentation](https://wiki.openstreetmap.org/wiki/Rivers), [legacy riverbank tag](https://wiki.openstreetmap.org/wiki/Tag:waterway%3Driverbank), [natural water](https://wiki.openstreetmap.org/wiki/Tag:natural%3Dwater): physical water area versus main-stream line.
- [ICONSIAM getting here](https://www.iconsiam.com/en/getting-here): Charoen Nakhon/Khlong San access, boat and street arrivals.
- [River City plan your visit](https://rivercitybangkok.com/plan-your-visit/): Si Phraya/River City boat stops and Saphan Taksin/Sathorn connection.
- [Anantara official resort](https://www.anantara.com/en/riverside-bangkok) and [contact/location](https://www.anantara.com/en/riverside-bangkok/contact): west bank and existing resort location. The repository retains the official resort-map reference.
- [Asiatique official site](https://www.asiatiquethailand.com/) and [contact](https://www.asiatiquethailand.com/contact-us): Charoen Krung riverfront destination.
- Existing primary hotel/operator/architect links in `geographicReferences`, `realPlaces.ts` and PR35's source inventory remain applicable. This PR preserves those models; it does not relicense third-party photos or claim a new architectural survey.

## Commands

Install the versions in [requirements](reference/requirements.txt), then run from repository root:

```bash
python scripts/reconstruct-chao-reference.py
```

This regenerates A/B/C and the proposed data from the retained inputs. `--approve` updates only the canonical river geometry after review; it does not approve road topology. `scripts/fetch-chao-reference.py` refreshes research over the network and writes separate refresh provenance; compare changes before accepting them. Regenerating from a later OSM database is not expected to have the same raw hashes as this frozen snapshot.
