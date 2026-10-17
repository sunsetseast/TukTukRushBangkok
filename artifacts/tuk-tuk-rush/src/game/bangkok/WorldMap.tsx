import {
  memo,
  useEffect,
  useMemo,
  useId,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import {
  ArrowLeft,
  Building2,
  ChevronDown,
  Compass,
  LocateFixed,
  MapPin,
  Maximize,
  Minus,
  Plus,
  TrainFront,
  X,
} from "lucide-react";
import type { District, Landmark, Point } from "../types";
import type { Frame } from "../Hud";
import { regionAt, SCALE, toMap } from "./world";
import {
  placeMapLabels,
  type MapLabel,
  type LabelBounds,
} from "../ui/mapLabels";
import { useMapMotion } from "../ui/useMapMotion";
import { navigationPath } from "../navigation";
import { cartography, roadPaths } from "./cartography";
import { cityPlaces, type CityPlace } from "./cityPlaces";
const mapPalette: Record<string, string> = {
  paknam: "#c7dea1",
  north: "#b5d4a5",
  khaosan: "#f6c3a5",
  oldtown: "#f3d995",
  westbank: "#afd8bf",
  chinatown: "#f2b4a3",
  siam: "#cbbfe4",
  talatnoi: "#e3c39b",
  sukhumvit: "#b4d9e4",
  icon: "#c2dfd4",
  silom: "#afd2cf",
  south: "#dec9aa",
};
const districtLabels: Record<string, string> = {
  paknam: "Phasi Charoen",
  north: "Chatuchak",
  khaosan: "Banglamphu / Khao San",
  oldtown: "Old Town",
  westbank: "Thonburi",
  chinatown: "Chinatown",
  siam: "Siam / Ratchaprasong",
  talatnoi: "Talat Noi / Song Wat",
  sukhumvit: "Sukhumvit / Asok",
  icon: "Khlong San",
  silom: "Silom / Sathorn",
  south: "Asiatique",
};
const points = (ps: Point[]) =>
  ps
    .map((p) => {
      const m = toMap(p);
      return `${m.x},${m.y}`;
    })
    .join(" ");
const mapName = (l: Landmark) =>
  l.id === "palace"
    ? "Grand Palace"
    : l.id === "terminal"
      ? "Terminal 21"
      : l.name;
const categories: Record<Landmark["kind"], string> = {
  hotel: "Hotel",
  museum: "Museum",
  gate: "Landmark",
  temple: "Temple",
  station: "Railway station",
  palace: "Palace",
  park: "Park",
  mall: "Shopping",
  tower: "Landmark",
  market: "Market",
  wheel: "Landmark",
  monument: "Monument",
};
const glyph: Record<Landmark["kind"], string> = {
  hotel: "M-7 8V-8H7V8ZM-3-4H-1M2-4H4M-3 0H-1M2 0H4M-2 8V4H2V8",
  museum: "M-8-3L0-8L8-3ZM-6-2V6M0-2V6M6-2V6M-8 8H8",
  temple: "M-7 0L0-7L7 0M-8 1H8M-5 2V7M0 2V7M5 2V7M-7 8H7",
  palace: "M-7 8V-2L-3 1L0-6L3 1L7-2V8ZM-2 8V4H2V8",
  mall: "M-6-4H6L8 8H-8ZM-3-4V-6Q0-10 3-6V-4",
  park: "M0-9L-6 0H-3L-7 5H7L3 0H6ZM0 5V9",
  market: "M-8-3L-5-8H5L8-3ZM-6-2V8H6V-2M-2 8V3H3",
  station: "M-6 4V-6Q0-9 6-6V4ZM-6-2H6M-5 8L-2 4M5 8L2 4",
  tower: "M-5 8L-3-7H3L5 8ZM-2-7V-10M-4 1H4",
  gate: "M-8-4H8M-7-6H7M-5-3V8M5-3V8M-7 8H7",
  wheel: "M0-8A8 8 0 1 1-.01-8M0-8V8M-8 0H8M-5 9L0 0L5 9",
  monument: "M-2-8H2L3 5H-3ZM-6 5H6V8H-6Z",
};
function PlaceGlyph({ kind }: { kind: Landmark["kind"] }) {
  return (
    <path
      d={glyph[kind]}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}
const BaseMap = memo(function BaseMap({
  d,
  visited,
  shortcuts,
  detail,
  px,
  pz,
}: {
  d: District;
  visited: string[];
  shortcuts: string[];
  detail: boolean;
  px: number;
  pz: number;
}) {
  const cart = cartography(d),
    fogId = useId().replace(/:/g, "");
  const roads = useMemo(
    () => roadPaths(d, detail, px, pz, shortcuts),
    [d, detail, px, pz, shortcuts.join("|")],
  );
  return (
    <g className="tt-map-base">
      <defs>
        <pattern
          id={fogId}
          patternUnits="userSpaceOnUse"
          width="12"
          height="12"
          patternTransform="rotate(35)"
        >
          <rect width="12" height="12" fill="#e4e7d3" />
          <path d="M0 0V12" stroke="#b5c5b4" strokeWidth="3" />
        </pattern>
      </defs>
      <rect x="-2500" y="-2500" width="6000" height="6000" fill="#c6dfb2" />
      {d.regions?.map((r) => (
        <polygon
          key={r.id}
          points={cart.regions?.[d.regions!.indexOf(r)]}
          fill={
            visited.includes(r.id)
              ? (mapPalette[r.id] ?? r.color)
              : `url(#${fogId})`
          }
          fillOpacity="1"
          stroke="#7a9d84"
          strokeOpacity=".65"
          strokeWidth="1"
        />
      ))}
      {detail && <path d={cart.footprints} fill="#9eae91" opacity=".3" />}
      {d.obstacles
        .filter((o) => o.protected)
        .map((o, i) => {
          const m = toMap(o);
          return (
            <rect
              key={i}
              x={m.x - o.w / SCALE / 2}
              y={m.y - o.d / SCALE / 2}
              width={o.w / SCALE}
              height={o.d / SCALE}
              fill="#7bb86b"
              opacity=".65"
            />
          );
        })}
      <polyline
        points={cart.river}
        stroke="#f6e6b6"
        strokeWidth={(d.riverWidth ?? 0) / SCALE + 7}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        points={cart.river}
        stroke="#40b8cd"
        strokeWidth={(d.riverWidth ?? 0) / SCALE}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {d.canals?.map((c, i) => (
        <polyline
          key={i}
          points={cart.canals?.[i]}
          stroke="#40b8cd"
          strokeWidth={Math.max(1.5, c.width / SCALE)}
          fill="none"
          strokeLinejoin="round"
        />
      ))}
      {roads.map((r, i) => (
        <path
          key={i}
          d={r.path}
          stroke={r.color}
          strokeWidth={r.width}
          strokeLinecap="round"
          fill="none"
          opacity={!r.region || visited.includes(r.region) ? 1 : 0.36}
        />
      ))}
    </g>
  );
});
function MapLayers({
  d,
  f,
  detail = false,
  labelScale = 1,
  placeNames = true,
  transit = true,
  landmarks = true,
  onSelect,
  onSelectPlace,
  labelBounds,
}: {
  d: District;
  f: Frame;
  detail?: boolean;
  labelScale?: number;
  placeNames?: boolean;
  transit?: boolean;
  landmarks?: boolean;
  onSelect?: (l: Landmark) => void;
  onSelectPlace?: (p: CityPlace) => void;
  labelBounds?: LabelBounds;
}) {
  const visited = f.snap.discoveredDistricts ?? [],
    shortcuts = f.snap.discoveredShortcuts ?? [];
  const path = useMemo(
      () => navigationPath(d, { x: f.px, z: f.pz }, f.snap.target),
      [d, f.snap.target.id, Math.round(f.px / 8), Math.round(f.pz / 8)],
    ),
    p = toMap({ x: f.px, z: f.pz }),
    target = toMap(f.snap.target);
  const visibleLandmarks = useMemo(() => {
    const known = d.landmarks.filter(
      (l) => l.kind !== "hotel" && l.id !== "state" && (detail || (l.id && f.snap.discoveredLandmarks?.includes(l.id))),
    );
    if (!detail) return known;
    const priority = (l: Landmark) =>
      l.accessNode === f.snap.target.id ||
      d.destinations?.some(
        (a) => a.landmarkId === l.id && a.arrivalNode === f.snap.target.id,
      )
        ? 100
        : l.kind === "palace"
          ? 8
          : l.kind === "temple"
            ? 6
            : l.kind === "tower"
              ? 5
              : l.kind === "mall"
                ? 4
                : 1;
    const result: Landmark[] = [];
    for (const l of known.sort((a, b) => priority(b) - priority(a))) {
      if (
        result.every(
          (q) => Math.hypot(q.x - l.x, q.z - l.z) >= 30 * labelScale * SCALE,
        )
      )
        result.push(l);
    }
    return result;
  }, [d, detail, f.snap.discoveredLandmarks, f.snap.target.id, labelScale]);
  const labels = useMemo(() => {
    const features: MapLabel[] = [];
    if (!detail) return placeMapLabels(features, labelScale);
    if (landmarks)
      for (const l of visibleLandmarks) {
        const m = toMap(l);
        features.push({
          id: `l:${l.id}`,
          x: m.x,
          y: m.y,
          text: mapName(l),
          showText:
            placeNames ||
            [
              "palace",
              "pho",
              "arun",
              "icon",
              "paragon",
              "gate",
              "khaosan",
              "terminal",
            ].includes(l.id!),
          font: 11,
          priority: 5,
          offset: 18,
        });
      }
    const seen = new Set<string>();
    if (transit && placeNames)
      for (const line of d.transit?.lines ?? [])
        for (const station of line.stations) {
          if (seen.has(station.id)) continue;
          seen.add(station.id);
          const m = toMap(station);
          features.push({
            id: `s:${line.id}:${station.id}`,
            x: m.x,
            y: m.y,
            text: `${station.code} ${station.name}`,
            font: 10,
            priority: station.interchange ? 3 : 1,
            offset: 7,
          });
        }
    if (landmarks && placeNames)
      for (const p of cityPlaces(d)) {
        const m = toMap(p);
        features.push({
          id: p.id,
          x: m.x,
          y: m.y,
          text: p.name,
          font: 10,
          priority: 2,
          offset: 15,
        });
      }
    const reserved = (d.regions ?? []).map((r) => {
      const m = toMap(
          r.polygon.reduce(
            (v, p) => ({
              x: v.x + p.x / r.polygon.length,
              z: v.z + p.z / r.polygon.length,
            }),
            { x: 0, z: 0 },
          ),
        ),
        font = placeNames ? 11 : 9,
        w = (districtLabels[r.id] ?? r.name).length * font * 0.32 * labelScale;
      return {
        minX: m.x - w,
        maxX: m.x + w,
        minY: m.y - font * labelScale,
        maxY: m.y + 3 * labelScale,
      };
    });
    return placeMapLabels(features, labelScale, labelBounds, reserved);
  }, [
    d,
    visibleLandmarks,
    detail,
    placeNames,
    landmarks,
    transit,
    f.snap.discoveredLandmarks,
    labelScale,
    labelBounds?.minX,
    labelBounds?.maxX,
    labelBounds?.minY,
    labelBounds?.maxY,
  ]);
  // At city scale keep minor amenities from covering major landmark symbols.
  // Zooming exposes hotel lobbies and the closely spaced temple piers.
  const visiblePlaces = detail
    ? cityPlaces(d).filter(
        (p) =>
          placeNames ||
          (p.kind === "pier" &&
            visibleLandmarks.every(
              (l) => Math.hypot(p.x - l.x, p.z - l.z) > 26 * labelScale * SCALE,
            )),
      )
    : [];

  return (
    <>
      <BaseMap
        d={d}
        visited={visited}
        shortcuts={shortcuts}
        detail={detail}
        px={Math.round(f.px / 80) * 80}
        pz={Math.round(f.pz / 80) * 80}
      />
      {detail &&
        d.regions
          ?.filter(
            (r, i) =>
              detail ||
              placeNames ||
              [
                "chinatown",
                "oldtown",
                "siam",
                "silom",
                "north",
                "south",
                "paknam",
              ].includes(r.id),
          )
          .map((r) => {
            const center = r.polygon.reduce(
                (p, n) => ({
                  x: p.x + n.x / r.polygon.length,
                  z: p.z + n.z / r.polygon.length,
                }),
                { x: 0, z: 0 },
              ),
              m = toMap(center);
            return (
              <text
                key={r.id}
                x={m.x}
                y={m.y}
                textAnchor="middle"
                className="tt-world-district"
                style={{
                  fontSize: (placeNames ? 11 : 9) * labelScale,
                  strokeWidth: 3 * labelScale,
                }}
                opacity={visited.includes(r.id) ? 1 : 0.8}
              >
                {(districtLabels[r.id] ?? r.name).toUpperCase()}
                {!visited.includes(r.id) && " · ?"}
              </text>
            );
          })}
      {transit &&
        d.transit?.lines.map((line) => (
          <g key={line.id} data-testid={`map-rail-${line.id}`}>
            <polyline
              points={cartography(d).transit?.[d.transit!.lines.indexOf(line)]}
              stroke="#fff7de"
              strokeWidth="7"
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round"
              fill="none"
            />
            <polyline
              points={cartography(d).transit?.[d.transit!.lines.indexOf(line)]}
              stroke={line.color}
              strokeWidth="3"
              vectorEffect="non-scaling-stroke"
              strokeDasharray={line.id === "gold" ? "6 3" : undefined}
              strokeLinejoin="round"
              fill="none"
            />
            {line.stations.map((s) => {
              const m = toMap(s),
                label = labels.get(`s:${line.id}:${s.id}`);
              return (
                <g key={s.id}>
                  <circle
                    cx={m.x}
                    cy={m.y}
                    r={(s.interchange ? 4 : 2.5) * labelScale}
                    fill="#dfede4"
                    stroke={line.color}
                    strokeWidth={1.8 * labelScale}
                  />
                  {detail && placeNames && label && (
                    <text
                      x={label.x}
                      y={label.y}
                      textAnchor={label.anchor}
                      className="tt-world-landmark"
                      style={{
                        fontSize: 10 * labelScale,
                        strokeWidth: 3 * labelScale,
                      }}
                    >
                      {s.code} {s.name}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        ))}
      <polyline
        points={points(path)}
        stroke="#fff4cd"
        strokeWidth="8"
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="none"
      />
      <polyline
        data-testid="map-route"
        points={points(path)}
        stroke={f.snap.stage === "pickup" ? "#d96529" : "#a54dc1"}
        strokeWidth="3.5"
        vectorEffect="non-scaling-stroke"
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="none"
      />
      {landmarks &&
        visibleLandmarks.map((l) => {
          const m = toMap(l),
            label = labels.get(`l:${l.id}`);
          return (
            <g
              key={l.id}
              transform={`translate(${m.x} ${m.y}) scale(${labelScale})`}
              className="tt-map-pin"
              role={detail ? "button" : undefined}
              tabIndex={detail ? 0 : undefined}
              aria-label={
                detail
                  ? `${l.name}, ${categories[l.kind]}, ${f.snap.discoveredLandmarks?.includes(l.id!) ? "discovered" : "unvisited"}`
                  : undefined
              }
              data-testid={detail ? `map-landmark-${l.id}` : undefined}
              onClick={detail ? () => onSelect?.(l) : undefined}
              onKeyDown={
                detail
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        onSelect?.(l);
                      }
                    }
                  : undefined
              }
            >
              <circle r={detail ? 22 : 5} fill="transparent" />
              {detail ? (
                <>
                  <rect
                    x="-13"
                    y="-13"
                    width="26"
                    height="26"
                    rx="9"
                    fill={
                      f.snap.discoveredLandmarks?.includes(l.id!)
                        ? "#fff3d2"
                        : "#e8ebda"
                    }
                    stroke="#b67937"
                    strokeDasharray={
                      f.snap.discoveredLandmarks?.includes(l.id!)
                        ? undefined
                        : "3 2"
                    }
                  />
                  <PlaceGlyph kind={l.kind} />
                </>
              ) : (
                <circle r="3.5" fill="#e8bd77" />
              )}
              {detail && label && (
                <text
                  x={(label.x - m.x) / labelScale}
                  y={(label.y - m.y) / labelScale}
                  textAnchor={label.anchor}
                  className="tt-world-landmark"
                  style={{ fontSize: 11, strokeWidth: 3 }}
                >
                  {mapName(l)}
                </text>
              )}
            </g>
          );
        })}
      {detail &&
        landmarks &&
        visiblePlaces.map((node) => {
          const m = toMap(node),
            label = labels.get(node.id);
          return (
            <g
              key={node.id}
              transform={`translate(${m.x} ${m.y}) scale(${labelScale})`}
              className="tt-map-pin"
              role="button"
              tabIndex={0}
              aria-label={`${node.name}, ${node.kind}`}
              data-testid={`map-place-${node.id}`}
              onClick={() => onSelectPlace?.(node)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  onSelectPlace?.(node);
                }
              }}
            >
              <circle r="22" fill="transparent" />
              <rect
                x="-10"
                y="-10"
                width="20"
                height="20"
                rx="7"
                fill={node.kind === "pier" ? "#d8f3ed" : "#ffebcc"}
                stroke={node.kind === "pier" ? "#157c8f" : "#a26339"}
              />
              <path
                d={
                  node.kind === "pier"
                    ? "M-6 2H6L3 6H-3ZM0-7V1M-4-5H4M-7 8Q-4 5 0 8Q4 5 7 8"
                    : "M-6 6V-7H6V6ZM-2 6V2H2V6M-3-3H-1M2-3H4"
                }
                fill="none"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
              {placeNames && label && (
                <text
                  x={(label.x - m.x) / labelScale}
                  y={(label.y - m.y) / labelScale}
                  textAnchor={label.anchor}
                  className="tt-world-landmark"
                  style={{ fontSize: 10, strokeWidth: 3 }}
                >
                  {node.name}
                </text>
              )}
            </g>
          );
        })}
      <circle
        cx={target.x}
        cy={target.y}
        pointerEvents="none"
        r={8 * labelScale}
        fill="#fff3ce"
        stroke={f.snap.stage === "pickup" ? "#d96529" : "#a54dc1"}
        strokeWidth={2 * labelScale}
      />
      <circle
        pointerEvents="none"
        cx={target.x}
        cy={target.y}
        r={3 * labelScale}
        fill="#e8bd77"
      />
      <g
        transform={`translate(${p.x} ${p.y}) rotate(${180 - (f.ph * 180) / Math.PI}) scale(${labelScale})`}
        data-testid="map-player"
        pointerEvents="none"
      >
        <circle r="16" fill="#157fbd" stroke="#fff4c5" strokeOpacity="1" />
        <path d="M0-23L5-15H-5Z" fill="#167fb9" />
        <rect
          x="-7"
          y="-10"
          width="14"
          height="21"
          rx="5"
          fill="#ffe17e"
          stroke="#0b252b"
          strokeWidth="1.5"
        />
        <path d="M-5-5H5V4H-5Z" fill="#286d68" />
        <path
          d="M-9 4V10M9 4V10"
          stroke="#f2ebdb"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </g>
    </>
  );
}
export function BangkokMinimap({ d, f }: { d: District; f: Frame }) {
  const p = toMap({ x: f.px, z: f.pz }),
    radius = 62;
  return (
    <svg
      className="tt-minimap tt-bangkok-minimap"
      viewBox={`${p.x - radius} ${p.y - radius} ${radius * 2} ${radius * 2}`}
      aria-label="Bangkok local map, north up"
      data-testid="minimap"
    >
      <MapLayers d={d} f={f} transit={false} />
      <text x={p.x - 49} y={p.y - 43} fill="#bfd5cd" fontSize="10">
        N ↑
      </text>
    </svg>
  );
}
export function WorldMap({
  d,
  f,
  onClose,
}: {
  d: District;
  f: Frame;
  onClose: () => void;
}) {
  const player = toMap({ x: f.px, z: f.pz });
  const [view, setView] = useState({ cx: player.x, cy: player.y, span: 360 }),
    [aspect, setAspect] = useState(2),
    [mapWidth, setMapWidth] = useState(812),
    [transit, setTransit] = useState(true),
    [landmarks, setLandmarks] = useState(true),
    [selected, setSelected] = useState<Landmark | null>(null),
    [selectedPlace, setSelectedPlace] = useState<CityPlace | null>(null),
    [station, setStation] = useState(""),
    [stationsOpen, setStationsOpen] = useState(false);
  const pendingPins = useRef(new Set<number>()),
    dragged = useRef(false);
  const spanRef = useRef(view.span);
  spanRef.current = view.span;
  const svg = useRef<SVGSVGElement>(null),
    root = useRef<HTMLDivElement>(null),
    close = useRef<HTMLButtonElement>(null),
    pointers = useRef(new Map<number, { x: number; y: number }>());
  const width = view.span * Math.max(aspect, 1),
    height = view.span * Math.max(1 / aspect, 1),
    labelScale = width / mapWidth;
  const cameraMotion = useRef(false);
  const box = [view.cx - width / 2, view.cy - height / 2, width, height];
  useMapMotion(svg, box, cameraMotion);
  const moveTo = (next: typeof view) => {
    cameraMotion.current = true;
    setView(next);
  };
  const nearbyStations = useMemo(
    () =>
      d.transit?.lines
        .flatMap((l) => l.stations)
        .filter((s, i, a) => a.findIndex((q) => q.id === s.id) === i)
        .sort(
          (a, b) =>
            Math.hypot(a.x - f.px, a.z - f.pz) -
            Math.hypot(b.x - f.px, b.z - f.pz),
        )
        .slice(0, 5) ?? [],
    [d, f.px, f.pz],
  );
  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    const resize = () => {
      const r = el.getBoundingClientRect();
      setAspect(r.width / Math.max(1, r.height));
      setMapWidth(Math.max(1, r.width));
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    close.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (
        (e.key === "Enter" || e.key === " ") &&
        (e.target as Element).closest?.(".tt-map-pin")
      )
        return;
      e.stopPropagation();
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
      if (e.key === "Tab") {
        const a = [
          ...(root.current?.querySelectorAll<HTMLElement>(
            'button:not(:disabled),[tabindex="0"]',
          ) ?? []),
        ];
        if (e.shiftKey && document.activeElement === a[0]) {
          e.preventDefault();
          a.at(-1)?.focus();
        } else if (!e.shiftKey && document.activeElement === a.at(-1)) {
          e.preventDefault();
          a[0]?.focus();
        }
      }
      if (e.target === svg.current) {
        const n = (45 * spanRef.current) / 360;
        if (
          ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)
        ) {
          e.preventDefault();
          setView((v) => ({
            ...v,
            cx:
              v.cx +
              (e.key === "ArrowRight" ? n : e.key === "ArrowLeft" ? -n : 0),
            cy:
              v.cy + (e.key === "ArrowDown" ? n : e.key === "ArrowUp" ? -n : 0),
          }));
        }
        if (e.key === "+" || e.key === "=") zoom(0.75);
        if (e.key === "-") zoom(1.33);
      }
    };
    document.addEventListener("keydown", key, true);
    return () => {
      document.removeEventListener("keydown", key, true);
      previous?.isConnected && previous.focus();
    };
  }, [onClose]);
  const zoom = (factor: number, smooth = true) => {
    cameraMotion.current = smooth;
    setView((v) => ({
      ...v,
      span: Math.max(120, Math.min(1450, v.span * factor)),
    }));
  };
  const down = (e: PointerEvent<SVGSVGElement>) => {
    if (pointers.current.size === 0) dragged.current = false;
    // Preserve pin taps, but transfer a real drag to the canvas after touch slop.
    if ((e.target as Element).closest(".tt-map-pin"))
      pendingPins.current.add(e.pointerId);
    else e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
  };
  const move = (e: PointerEvent<SVGSVGElement>) => {
    cameraMotion.current = false;
    const old = pointers.current.get(e.pointerId);
    if (!old) return;
    if (pendingPins.current.has(e.pointerId)) {
      if (
        pointers.current.size === 1 &&
        Math.hypot(e.clientX - old.x, e.clientY - old.y) < 6
      )
        return;
      pendingPins.current.delete(e.pointerId);
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    dragged.current = true;
    const before = [...pointers.current.values()];
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const matrix = svg.current?.getScreenCTM();
    if (!matrix) return;
    if (before.length === 2) {
      const now = [...pointers.current.values()],
        a = Math.hypot(
          before[0]!.x - before[1]!.x,
          before[0]!.y - before[1]!.y,
        ),
        b = Math.hypot(now[0]!.x - now[1]!.x, now[0]!.y - now[1]!.y);
      if (a > 8 && b > 8) zoom(a / b, false);
    }
    setView((v) => ({
      ...v,
      cx: Math.max(
        -1000,
        Math.min(
          2000,
          v.cx - (e.clientX - old.x) / matrix.a / (before.length === 2 ? 2 : 1),
        ),
      ),
      cy: Math.max(
        -1000,
        Math.min(
          2400,
          v.cy - (e.clientY - old.y) / matrix.d / (before.length === 2 ? 2 : 1),
        ),
      ),
    }));
  };
  const end = (e: PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId);
    pendingPins.current.delete(e.pointerId);
  };
  const select = (l: Landmark) => {
    setSelected(l);
    setSelectedPlace(null);
    setStation("");
    setStationsOpen(false);
    const p = toMap(l);
    moveTo({ cx: p.x, cy: p.y + (aspect < 1 ? 90 : 0), span: 300 });
  };
  const recenter = () => {
    cameraMotion.current = true;
    setView((v) => ({ ...v, cx: player.x, cy: player.y }));
  };
  const region = selected ? regionAt(d, selected) : null;
  return (
    <div
      className="tt-world-map"
      ref={root}
      role="dialog"
      aria-modal="true"
      aria-labelledby="bangkok-map-title"
      data-testid="world-map"
    >
      <header>
        <div>
          <span className="tt-kicker">YOUR CITY TO DISCOVER</span>
          <h2 id="bangkok-map-title">
            Bangkok<span> / กรุงเทพฯ</span>
          </h2>
        </div>
        <div className="tt-map-discovery">
          <b>
            {f.snap.discoveredDistricts?.length ?? 0}
            <span> / {d.regions?.length}</span>
          </b>
          <small>districts discovered</small>
        </div>
        <button
          ref={close}
          className="tt-btn ghost"
          onClick={onClose}
          data-testid="button-close-map"
        >
          <ArrowLeft size={16} />
          Back to driving
        </button>
      </header>
      <div className="tt-world-map-body">
        <svg
          ref={svg}
          tabIndex={0}
          viewBox={`${view.cx - width / 2} ${view.cy - height / 2} ${width} ${height}`}
          onClickCapture={(e) => {
            if (dragged.current && e.detail > 0) {
              e.stopPropagation();
              e.preventDefault();
            }
          }}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
          onLostPointerCapture={(e) => {
            // Touch implicitly captures the pin's child. Transferring that
            // capture to this SVG must not discard the still-active gesture.
            if (e.target === e.currentTarget) end(e);
          }}
          aria-label="Bangkok, north up. Drag to pan; pinch or use plus and minus to zoom. Arrow keys pan."
        >
          <MapLayers
            d={d}
            f={f}
            detail
            labelScale={labelScale}
            placeNames={view.span < 650}
            transit={transit}
            landmarks={landmarks}
            onSelect={select}
            onSelectPlace={(p) => {
              setSelectedPlace(p);
              setSelected(null);
              setStationsOpen(false);
              const m = toMap(p);
              moveTo({ cx: m.x, cy: m.y + (aspect < 1 ? 90 : 0), span: 300 });
            }}
            labelBounds={{
              minX: view.cx - width / 2 + 8 * labelScale,
              maxX: view.cx + width / 2 - 58 * labelScale,
              minY: view.cy - height / 2 + 8 * labelScale,
              maxY: view.cy + height / 2 - 68 * labelScale,
            }}
          />
        </svg>
        <div className="tt-map-filters" role="group" aria-label="Map layers">
          <button
            aria-pressed={landmarks}
            onClick={() => setLandmarks((v) => !v)}
            data-testid="button-landmark-layer"
          >
            <MapPin size={16} />
            Places
          </button>
          <button
            aria-pressed={transit}
            data-testid="button-transit-layer"
            onClick={() => {
              setTransit((v) => !v);
              setStationsOpen(false);
            }}
          >
            <TrainFront size={16} />
            BTS network
          </button>
        </div>
        <div className="tt-map-tools">
          <span className="tt-map-north">
            <Compass size={20} />N
          </span>
          <button
            className="tt-icon-btn"
            aria-label="Zoom in"
            onClick={() => zoom(0.75)}
          >
            <Plus size={20} />
          </button>
          <button
            className="tt-icon-btn"
            aria-label="Zoom out"
            onClick={() => zoom(1.33)}
          >
            <Minus size={20} />
          </button>
          <button
            className="tt-icon-btn"
            aria-label="My tuk-tuk"
            onClick={recenter}
            data-testid="button-map-recenter"
          >
            <LocateFixed size={20} />
          </button>
          <button
            className="tt-icon-btn"
            aria-label="Whole city"
            onClick={() => moveTo({ cx: 490, cy: 600, span: 1250 })}
            data-testid="button-whole-city"
          >
            <Maximize size={19} />
          </button>
        </div>
        <div className="tt-map-bottom">
          <div className="tt-map-mission">
            <MapPin size={18} />
            <div>
              <span className="tt-eyebrow">
                {f.snap.stage === "pickup"
                  ? "NEXT PICKUP"
                  : "PASSENGER DESTINATION"}
              </span>
              <b>{f.snap.target.name}</b>
            </div>
          </div>
          {transit && (
            <button
              className="tt-btn ghost"
              aria-expanded={stationsOpen}
              data-testid="button-nearby-stations"
              onClick={() => {
                setStationsOpen((v) => !v);
                setSelected(null);
                setSelectedPlace(null);
              }}
            >
              <TrainFront size={16} />
              Nearby stations
              <ChevronDown size={14} />
            </button>
          )}
        </div>
        {stationsOpen && (
          <aside className="tt-map-detail tt-map-stations">
            <div className="tt-card-heading">
              <b>Find the Skytrain</b>
              <button
                className="tt-icon-btn"
                aria-label="Close station list"
                onClick={() => setStationsOpen(false)}
              >
                <X size={16} />
              </button>
            </div>
            {nearbyStations.map((s) => (
              <button
                key={s.id}
                data-testid={`map-station-${s.id}`}
                onClick={() => {
                  const p = toMap(s);
                  moveTo({ cx: p.x, cy: p.y, span: 250 });
                  setStation(
                    `${s.code} ${s.name}${s.interchange ? " · interchange" : ""} — elevated railway; use public roads to approach`,
                  );
                  setSelected(null);
                }}
              >
                <span
                  style={{
                    color: d.transit!.lines.find((l) => l.id === s.line)!.color,
                  }}
                >
                  ●
                </span>
                {s.code} {s.name}
              </button>
            ))}
            {station && <p role="status">Viewing {station}</p>}
          </aside>
        )}
        {selected && (
          <aside className="tt-map-detail" data-testid="map-detail">
            <div className="tt-card-heading">
              <span className="tt-kicker">{categories[selected.kind]}</span>
              <button
                className="tt-icon-btn"
                aria-label="Close place details"
                onClick={() => setSelected(null)}
              >
                <X size={17} />
              </button>
            </div>
            <div className="tt-place-title">
              <Building2 size={24} />
              <h3>{selected.name}</h3>
            </div>
            <p>
              {region?.name ?? "Bangkok"} ·{" "}
              <span className="tt-discovered">
                {f.snap.discoveredLandmarks?.includes(selected.id!)
                  ? "Discovered"
                  : "Unvisited"}
              </span>
            </p>
            <span className="tt-detail-note">
              {selected.accessNode === f.snap.target.id ||
              selected.id === f.snap.target.id ||
              d.destinations?.find((a) => a.landmarkId === selected.id)
                ?.arrivalNode === f.snap.target.id
                ? "Your current fare destination"
                : "Explore this landmark from the city streets."}
            </span>
          </aside>
        )}
        {selectedPlace && (
          <aside className="tt-map-detail" data-testid="map-place-detail">
            <div className="tt-card-heading">
              <span className="tt-kicker">
                {selectedPlace.kind === "pier"
                  ? "River transport"
                  : "Hotel district"}
              </span>
              <button
                className="tt-icon-btn"
                aria-label="Close place details"
                onClick={() => setSelectedPlace(null)}
              >
                <X size={17} />
              </button>
            </div>
            <div className="tt-place-title">
              <MapPin size={24} />
              <h3>{selectedPlace.name}</h3>
            </div>
            <p>
              {selectedPlace.region
                ? (districtLabels[selectedPlace.region] ?? selectedPlace.region)
                : "Chao Phraya riverfront"}
            </p>
            <span className="tt-detail-note">{selectedPlace.note}</span>
          </aside>
        )}
      </div>
      <footer>
        <span>
          <i className="tt-legend-route" />
          Fare route
        </span>
        <span>
          <i className="tt-legend-fog" />
          Hatched districts are unexplored
        </span>
        <span>Dashed places are unvisited · Piers &amp; hotels</span>
        {transit && (
          <span className="tt-rail-legend">Sukhumvit · Silom · Gold Line</span>
        )}
        <span className="tt-map-scale">North up · compact game geography</span>
      </footer>
    </div>
  );
}
