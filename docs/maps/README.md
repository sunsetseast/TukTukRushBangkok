# Bangkok geographic master map — Stage 1

This map is separate from the current 700m Chinatown arcade game. Do not
change the game world or merge imported OSM ways into world.ts yet.

## Open it

Start the existing Replit/Vite application and visit /bangkok-map.html on the
same preview host. The map is usable on iPhone. Zoom around true
OpenStreetMap streets and Chao Phraya River banks, search 18 landmarks,
filter types and turn on conceptual (not administrative) planning zones.

The map has genuine WGS84 positions with no artificial 0.55 scale reduction.
POI markers represent geographic site centers, not verified driving dropoffs.

Files:
- artifacts/tuk-tuk-rush/bangkok-map.html (interactive standalone viewer)
- artifacts/tuk-tuk-rush/public/maps/bangkok-landmarks.geojson
- artifacts/tuk-tuk-rush/public/maps/bangkok-map-config.json
- artifacts/tuk-tuk-rush/scripts/check-bangkok-map.mjs

## Geographic extraction — later stage

Run manually from the app folder, while internet is available:
  node scripts/import-bangkok-osm.mjs

This responsibly imports real OSM road, bridge and river/canal ways by
limited Overpass requests in geographic tiles. It saves data under
public/maps/imported/. Run --max-tiles 1 for a partial one-tile smoke test.
Responses are cached to avoid unnecessary repeat downloads. The import
must not run per game frame or download a city on every startup.

The extracted data are real geometry but **not yet a playable traffic graph**:
one-way direction, lane access, motorcar restrictions, junction topology,
bridge/tunnel height, ferry services and turn restrictions still require
separate processing. Multipolygon riverbank relations also need further
import before modeling exact river-water surface meshes.

## Suggested map districts

Old Bangkok / Grand Palace / Wat Pho; Wat Arun and Thonburi;
Yaowarat/Chinatown; ICONSIAM and Chao Phraya riverside;
Siam/Pathum Wan; and the Asiatique riverfront.

All geographic distances remain real. Build 3D rendering by streaming small
tiles near the tuk-tuk, not rendering every street/building at once.
River crossings must use real road bridges; crossings by ferry should be
explicit transit gameplay rather than pretending a road exists on water.

## License and sources

Map data © OpenStreetMap contributors under ODbL:
https://www.openstreetmap.org/copyright

Coordinates also link to their individual public sources in GeoJSON.
The OSM standard public tile service is used for low-volume planning
inspection only. A published game needs its own appropriate tile provider
or locally processed licensed vector data; do not bulk download/cache
the standard OSM public tiles. Derived OSM databases can carry share-alike
obligations. No Apple Maps / Google Maps proprietary graphics have been used.

## Deliberate exclusions

This prototype is a real map and sourced landmark *foundation*, NOT a
finished playable Bangkok game. It does not yet ship localized 3D terrain,
ferry piers, entrance-level pickups, traffic routing or building footprints.
