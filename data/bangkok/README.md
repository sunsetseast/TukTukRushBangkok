# Bangkok research database v1

OSM-derived reference facts and geometry are © OpenStreetMap contributors, available under the [Open Database License 1.0](https://opendatacommons.org/licenses/odbl/1-0/). See [OSM attribution guidance](https://www.openstreetmap.org/copyright). This public repository supplies the derived research database under the same licence. OSM data is not a warranty of surveyed accuracy. Contributor usernames, UIDs and changeset metadata are excluded.

`osm-reference.v1.geojson` and `osm-places.v1.json` are bounded independent research extracts, not a replacement game road graph. Way centers are arithmetic vertex centroids, **not entrances**. The permanent inventory distinguishes these observations from approved game placements. Source objects, retrieval URLs, dates and raw-response hashes are recorded in `docs/qa/world-blueprint/sources/`.

Reproduce with `python scripts/extract-bangkok-osm.py /tmp/bangkok-osm --download`, then `python scripts/build-bangkok-inventory.py` after running `CITY_LABEL=canonical node --import tsx scripts/snapshot-world-blueprint.ts` in the app. The API data will evolve; hashes identify this review's actual snapshot. Inventory matching uses explicit name aliases and leaves unresolved coordinates null.

`iconic-inventory.v1.json` is a coverage audit, not a second runtime landmark registry. Sub-places identify their existing model owner. A named generic bridge or street is not automatically a verified hero asset. “Requires further research” is deliberately retained where bearing, boundaries or architectural likeness have not been independently checked. Missing sites are not rendered on the player map.

No Google Maps or Street View geometry is incorporated. Overture's schema and identity approach were evaluated; no Overture dataset was imported. BMA portals were investigated but did not provide a reproducibly retrieved geometry set in this pass. Their data must not be represented as a source of this game's geometry.
