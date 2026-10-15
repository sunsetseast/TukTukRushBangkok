import * as T from "three";
import type { District } from "../../types";
import { StaticBatch } from "../../staticBatch";
import type { ArtPiece } from "../architecturalBatch";
import { RailService, trainSample } from "./service";
import { sampleRail, type RailSample, type RailStation } from "./network";

export function emitRailInfrastructure(
  d: District,
  emit: (p: ArtPiece) => void,
) {
  const net = d.transit!,
    scratch: RailSample = { x: 0, z: 0, tx: 0, tz: 0, distance: 0, y: 0 },
    next = { ...scratch };
  const put = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    depth: number,
    color: string,
    yaw = 0,
    layer: ArtPiece["layer"] = "core",
    shape: ArtPiece["shape"] = "box",
    pitch = 0,
  ) =>
    emit({
      x,
      y,
      z,
      w,
      h,
      d: depth,
      color,
      yaw,
      layer,
      shape,
      pitch,
      surface: "concrete",
    });
  for (const line of net.lines) {
    for (const direction of [1, -1])
      for (let dist = 0; dist < line.length; dist += 8) {
        const bottleneck = line.stations.find((s) => s.id === "saphan-taksin");
        if (
          direction < 0 &&
          bottleneck &&
          Math.abs(dist + 4 - bottleneck.distance) < 40
        )
          continue;
        trainSample(line, dist, direction, scratch);
        trainSample(line, Math.min(line.length, dist + 8), direction, next);
        const length = Math.hypot(next.x - scratch.x, next.z - scratch.z),
          yaw = Math.atan2(next.x - scratch.x, next.z - scratch.z),
          x = (scratch.x + next.x) / 2,
          z = (scratch.z + next.z) / 2,
          y = (scratch.y + next.y) / 2;
        put(
          x,
          y - 0.9,
          z,
          line.id === "gold" ? 3.4 : 3.8,
          1.4,
          length + 0.18,
          "#8f9e9e",
          yaw,
          "core",
          "box",
          -Math.atan2(next.y - scratch.y, length),
        );
        for (const side of [-1, 1]) {
          const offset = line.id === "gold" ? 1.35 : 0.75;
          put(
            x + Math.cos(yaw) * offset * side,
            y + 0.05,
            z - Math.sin(yaw) * offset * side,
            line.id === "gold" ? 0.16 : 0.1,
            line.id === "gold" ? 0.38 : 0.12,
            length + 0.14,
            "#586a70",
            yaw,
            "core",
            "box",
            -Math.atan2(next.y - scratch.y, length),
          );
          put(
            x + Math.cos(yaw) * 1.7 * side,
            y + 0.25,
            z - Math.sin(yaw) * 1.7 * side,
            0.18,
            0.6,
            length + 0.15,
            "#bbc3b8",
            yaw,
            "core",
            "box",
            -Math.atan2(next.y - scratch.y, length),
          );
        }
        if (line.id !== "gold")
          put(x, y - 0.05, z, 2.1, 0.15, 0.45, "#aeb7ad", yaw, "detail");
      }
    // Explicit terminus buffers; converging paired guideways form crossover throats.
    for (const dist of [0, line.length]) {
      sampleRail(line, dist, scratch);
      put(
        scratch.x,
        scratch.y + 0.4,
        scratch.z,
        2.2,
        0.9,
        0.5,
        "#b54c48",
        Math.atan2(scratch.tx, scratch.tz),
      );
    }
  }
  for (const p of net.supports) {
    put(
      p.x,
      p.height / 2 - (p.water ? 1 : 0),
      p.z,
      1.8,
      p.height + (p.water ? 2 : 0),
      2.1,
      "#9ba4a1",
      p.yaw,
    );
    put(p.x, p.water ? -1.8 : 0.4, p.z, 2.7, 0.8, 3, "#b7bcb1", p.yaw);
    const x = p.x + (Math.cos(p.yaw) * p.arm) / 2,
      z = p.z - (Math.sin(p.yaw) * p.arm) / 2;
    put(x, p.height - 0.2, z, Math.abs(p.arm) + 6, 1.25, 2.9, "#a6b0aa", p.yaw);
    put(p.x, p.height - 2, p.z, 2.5, 2.7, 2.4, "#a1aaa6", p.yaw);
  }
  const krung = net.lines[1]!.stations.find((s) => s.code === "S7")!,
    g1 = net.lines[2]!.stations[0]!;
  const transferLength = Math.hypot(krung.x - g1.x, krung.z - g1.z),
    transferYaw = Math.atan2(g1.x - krung.x, g1.z - krung.z);
  put(
    (krung.x + g1.x) / 2,
    7.8,
    (krung.z + g1.z) / 2,
    4,
    0.6,
    transferLength,
    "#c4bf9f",
    transferYaw,
  );
  for (const side of [-1, 1])
    put(
      (krung.x + g1.x) / 2 + Math.cos(transferYaw) * side * 2,
      8.7,
      (krung.z + g1.z) / 2 - Math.sin(transferYaw) * side * 2,
      0.2,
      1.5,
      transferLength,
      "#bdac72",
      transferYaw,
    );
  const rendered = new Set<string>();
  for (const station of net.lines.flatMap((l) => l.stations)) {
    if (rendered.has(station.id)) continue;
    rendered.add(station.id);
    const s = station,
      c = Math.cos(s.yaw),
      sn = Math.sin(s.yaw),
      L = s.length;
    const at = (
      x: number,
      y: number,
      z: number,
      w: number,
      h: number,
      depth: number,
      color: string,
      layer: ArtPiece["layer"] = "core",
      shape: ArtPiece["shape"] = "box",
      pitch = 0,
    ) =>
      put(
        s.x + c * x + sn * z,
        y,
        s.z - sn * x + c * z,
        w,
        h,
        depth,
        color,
        s.yaw,
        layer,
        shape,
        pitch,
      );
    const gold = s.line === "gold",
      siam = s.id === "siam",
      river = s.id === "saphan-taksin",
      roof = gold
        ? "#d6ac45"
        : s.id === "national-stadium"
          ? "#526f87"
          : "#4c7b79";
    at(0, 7.8, 0, siam ? 22 : gold ? 15 : 18, 0.75, L + 10, "#b6b9ab");
    at(0, 8.9, 0, siam ? 20 : gold ? 13 : 16, 1.5, L, "#b6c2bb");
    for (const level of siam ? [13, 19] : [gold ? 12 : 13]) {
      if (siam) at(0, level - 0.35, 0, 6.2, 0.65, L, "#e1d7bd");
      else
        for (const side of river ? [1] : [-1, 1])
          at(
            side * (river ? 3.2 : gold ? 4.1 : 5.2),
            level - 0.35,
            0,
            gold ? 2.1 : 3,
            0.65,
            L,
            "#d7d6c5",
          );
      for (const side of [-1, 1]) {
        const edge = siam ? 9 : river ? 6 : gold ? 6 : 7;
        at(side * edge, level + 0.12, 0, 0.2, 0.25, L, "#a2b9b2");
        at(side * edge, level + 1.25, 0, 0.14, 0.14, L, "#a2b9b2");
        for(let post=-L/2;post<=L/2;post+=6)
          at(side * edge, level + 0.65, post, 0.14, 1.25, 0.14, "#a2b9b2");
        at(side * edge, level + 0.1, 0, 0.4, 0.25, L, "#f0ce84", "night");
        for (let z = -L / 2 + 4; z < L / 2; z += 9)
          at(
            side * (siam ? 8.8 : gold ? 6.2 : 7.2),
            level + 2.3,
            z,
            0.28,
            4.6,
            0.28,
            "#bdc6bc",
          );
      }
    }
    const roofY = siam ? 23.2 : gold ? 16.1 : 17.2,
      width = siam ? 22 : river ? 13 : gold ? 15 : 18;
    at(0, roofY, 0, width, 2.8, L + 6, roof, "core", "vault");
    for (let z = -L / 2; z <= L / 2; z += 10)
      at(0, roofY + 0.8, z, width, 0.2, 0.22, "#c4c9ba");
    for (const side of [-1, 1])
      at(
        side * (width / 2 - 0.5),
        roofY - 0.1,
        0,
        0.5,
        0.5,
        L + 7,
        gold ? "#e2b947" : "#c2cabc",
      );
    if (siam) {
      // Two island decks, each carrying BOTH lines in one travel direction.
      for (const side of [-1, 1]) {
        at(side * 10.1, 10.2, 0, 1.4, 3, L, "#8f9692");
        at(side * 11.1, 14.8, 0, 0.2, 0.2, L, "#bd3f46");
        at(side * 11.1, 20.8, 0, 0.2, 0.2, L, "#bd3f46");
      }
      // Upper/lower escalators at the island ends; clear of all four tracks.
      for (const z of [-30, 30]) {
        at(0, 15.8, z, 2, 1, 11, "#999f96", "core", "box", -0.53);
        at(0, 21, z + 5, 3, 0.4, 6, "#d3cbb6");
      }
    }
    if (s.id === "chong-nonsi") {
      // Sathorn skywalk's twin white pylons and cable fan are the signature.
      const z = L / 2 + 24;
      at(0, 7.2, z, 32, 0.55, 9, "#c3c6b4");
      at(0, 10.8, z, 32, 12, 0.8, "#e6e2cc", "core", "arch");
      at(0, 10.8, z + 5, 32, 12, 0.8, "#e6e2cc", "core", "arch");
      for (const side of [-1, 1]) {
        at(side * 11, 14, z, 0.65, 14, 0.65, "#e4e0cc");
        for (let k = 0; k < 6; k++)
          at(
            side * 11,
            11.5,
            z - 13 + k * 4,
            0.12,
            8,
            0.12,
            "#dddcc8",
            "detail",
            "box",
            -0.5 + k * 0.2,
          );
      }
    }
    if (s.id === "saphan-taksin") {
      at(0, 9, 0, 17, 0.6, L + 10, "#9cadab");
      // Ferry-access skywalk heads toward Sathorn Pier, above road clearance.
      at(-22, 7.2, L / 2, 32, 0.55, 4, "#b9c4b7");
      at(-22, 8, L / 2 - 2, 32, 1, 0.15, "#c2bb94");
    }
    if (s.id === "asok" || s.id === "sala-daeng") {
      at(0, 7.8, L / 2 + 8, 40, 0.55, 6, "#b8c3b6");
      for (const side of [-1, 1])
        at(side * 19, 9, L / 2 + 8, 0.25, 2, 6, "#678ba1");
    }
    if (s.id === "national-stadium")
      at(0, 8.4, -L / 2 - 12, 43, 0.6, 7, "#b5c0b2");
    // Grounded entrances were fitted against road envelopes and given colliders.
    for (const entrance of s.entrances ?? []) {
      const ec = Math.cos(entrance.yaw),
        es = Math.sin(entrance.yaw);
      const top={x:entrance.x+es*12,z:entrance.z+ec*12};
      const along=Math.max(-L/2+2,Math.min(L/2-2,sn*(top.x-s.x)+c*(top.z-s.z)));
      const end={x:s.x+sn*along,z:s.z+c*along};
      const run=Math.hypot(end.x-top.x,end.z-top.z),yaw=Math.atan2(end.x-top.x,end.z-top.z);
      put((top.x+end.x)/2,7.8,(top.z+end.z)/2,3.3,.55,run,'#bcc6ba',yaw);
      for(const side of [-1,1])put((top.x+end.x)/2+Math.cos(yaw)*side*1.65,8.55,(top.z+end.z)/2-Math.sin(yaw)*side*1.65,.13,1.2,run,'#8daba3',yaw);
      for (let step = 0; step < 19; step++)
        put(
          entrance.x + es * step * 0.62,
          0.25 + step * 0.36,
          entrance.z + ec * step * 0.62,
          2.7,
          0.36,
          0.7,
          "#b9bcb0",
          entrance.yaw,
        );
      put(
        entrance.x + es * 6,
        8,
        entrance.z + ec * 6,
        3,
        0.3,
        13,
        "#56837f",
        entrance.yaw,
      );
      for (const side of [-1, 1])
        put(
          entrance.x + es * 6 + ec * side * 1.5,
          4.4,
          entrance.z + ec * 6 - es * side * 1.5,
          0.13,
          7,
          13,
          "#c2c8b9",
          entrance.yaw,
        );
    }
    // Real mall linkage uses an elevated walkway, never a vehicle road.
    if (
      s.landmark &&
      ["siam", "asok", "charoen-nakhon", "national-stadium"].includes(s.id)
    ) {
      const l = d.landmarks.find((l) => l.id === s.landmark)!,
        p = l.plot!,
        dx = p.x - s.x,
        dz = p.z - s.z,
        len = Math.hypot(dx, dz),
        yaw = Math.atan2(dx, dz),
        trim = l.size! / 2 + 2;
      if (len > trim) {
        const run = len - trim,
          x = s.x + ((dx / len) * run) / 2,
          z = s.z + ((dz / len) * run) / 2;
        put(x, 7.6, z, 4, 0.5, run, "#b8c7bd", yaw);
        for (const side of [-1, 1])
          put(
            x + Math.cos(yaw) * side * 2,
            8.3,
            z - Math.sin(yaw) * side * 2,
            0.12,
            1.2,
            run,
            "#8aada9",
            yaw,
          );
      }
    }
  }
}

function carPrototype(gold: boolean, cab: boolean) {
  const b = new StaticBatch(40),
    unit = new T.BoxGeometry(),
    body = new T.MeshStandardMaterial({ roughness: 0.44, metalness: 0.18 }),
    lit = new T.MeshStandardMaterial({
      roughness: 0.4,
      emissive: "#cbe3ca",
      emissiveIntensity: 0.7,
    });
  const t = new T.Object3D(),
    length = gold ? 12.4 : 16.5;
  const box = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    color: string,
    glow = false,
  ) => {
    t.position.set(x, y, z);
    t.scale.set(w, h, d);
    t.updateMatrix();
    b.add(unit, glow ? lit : body, [t.matrix.clone()], [new T.Color(color)]);
  };
  box(0, 1.6, 0, gold ? 2.8 : 2.95, 2.9, length, gold ? "#e5e1d0" : "#e7e8df");
  box(0, 0.2, 0, 2.3, 0.4, length - 0.6, "#424f57");
  for (const side of [-1, 1]) {
    box(side * 1.49, 1.5, 0, 0.07, 0.55, length, gold ? "#d6a943" : "#b33748");
    box(side * 1.5, 0.75, 0, 0.07, 0.2, length, gold ? "#c59c3f" : "#2c5d89");
    for (let z = -length / 2 + 1.8; z < length / 2 - 1; z += 2.4) {
      box(side * 1.51, 2.25, z, 0.05, 1.04, 1.65, "#294859");
      box(side * 1.54, 2.25, z, 0.018, 0.78, 1.3, "#afcdc5", true);
    }
    for (const z of (gold ? [-0.28, 0.28] : [-0.36, -0.12, 0.12, 0.36]).map(
      (t) => t * length,
    )) {
      box(side * 1.54, 1.9, z, 0.06, 2, 1.2, gold ? "#b3955d" : "#41688b");
      box(side * 1.58, 2.25, z, 0.03, 0.9, 0.9, "#c9dfd2", true);
      box(side * 1.59, 1.75, z, 0.02, 1.9, 0.06, "#93a9ac");
    }
    for (const z of [-length * 0.3, length * 0.3])
      box(side * 0.95, 0.13, z, 0.45, 0.45, 0.85, "#39484a");
  }
  box(0, 3.15, 0, 2.8, 0.22, length - 0.3, "#aebbb7");
  box(0, 3.43, 0, 1.6, 0.35, 3.7, "#8e9f9f");
  if (!gold) {
    box(0, 3.48, -3, 0.9, 0.18, 1.8, "#44585c");
    box(0, 3.68, -3, 0.65, 0.3, 0.14, "#556b6d");
  }
  if (gold && cab)
    for (const end of [1]) {
      const nose = new T.SphereGeometry(1, 12, 6).scale(1.38, 1.35, 0.7);
      t.position.set(0, 1.65, end * (length / 2));
      t.rotation.set(0, 0, 0);
      t.scale.set(1, 1, 1);
      t.updateMatrix();
      b.add(nose, body, [t.matrix.clone()], [new T.Color("#ddce94")]);
    }
  if (cab)
    for (const end of [1]) {
      box(
        0,
        1.6,
        (end * length) / 2,
        2.85,
        2.8,
        0.3,
        gold ? "#e2cf8d" : "#315a7c",
      );
      box(0, 2.25, end * (length / 2 + 0.18), 2.45, 1.15, 0.08, "#1a384c");
      box(
        0,
        1.35,
        end * (length / 2 + 0.23),
        2.3,
        0.5,
        0.12,
        gold ? "#d2ae44" : "#c34d51",
      );
      for (const side of [-1, 1])
        box(
          side * 0.96,
          0.95,
          end * (length / 2 + 0.25),
          0.35,
          0.2,
          0.08,
          "#ffe5ba",
          true,
        );
      box(
        0,
        2.98,
        end * (length / 2 + 0.2),
        1.9,
        0.22,
        0.08,
        gold ? "#e3be5c" : "#b2d6be",
        true,
      );
    }
  const root = new T.Group();
  for (const g of b.finish()) root.add(g);
  return root;
}

export function buildRailTrains(d: District, sharedService?: RailService) {
  const root = new T.Group();
  root.name = "BangkokMovingTrains";
  const service = sharedService ?? new RailService(d.transit!);
  const standard = carPrototype(false, true),
    middle = carPrototype(false, false),
    gold = carPrototype(true, true),
    scratch: RailSample = { x: 0, z: 0, tx: 0, tz: 0, distance: 0, y: 0 },
    slope = { ...scratch };
  const fleet = service.trains.map((train) => {
    const cars = Array.from(
      { length: train.line.id === "gold" ? 2 : 4 },
      (_, i) => {
        const proto =
          train.line.id === "gold"
            ? gold
            : i === 0 || i === 3
              ? standard
              : middle;
        const car = new T.Group(),
          model = proto.clone(true);
        if (i === 0) model.rotation.y = Math.PI;
        car.add(model);
        car.name = `${train.id}:car${i}`;
        root.add(car);
        return car;
      },
    );
    return { train, cars };
  });
  let last = NaN;
  return {
    root,
    service,
    update(time: number, camera: T.Vector3, quality: string, night: number) {
      if (time !== last) {
        service.update(time);
        last = time;
      }
      for (const { train, cars } of fleet) {
        const visible =
          Math.hypot(camera.x - train.sample.x, camera.z - train.sample.z) <
          (quality === "low" ? 450 : 700);
        for (let i = 0; i < cars.length; i++) {
          const car = cars[i]!;
          car.visible = visible;
          if (!visible) continue;
          const offset =
            (i - (cars.length - 1) / 2) *
            (train.line.id === "gold" ? 13 : 17.2);
          trainSample(
            train.line,
            train.distance + offset,
            train.direction,
            scratch,
          );
          car.position.set(scratch.x, scratch.y + 0.18, scratch.z);
          trainSample(
            train.line,
            train.distance + offset + 2,
            train.direction,
            slope,
          );
          car.rotation.set(
            -Math.atan2(slope.y - scratch.y, 2),
            Math.atan2(scratch.tx, scratch.tz),
            0,
            "YXZ",
          );
        }
      }
      // Shared window materials; no point lights or screen-wide transparency.
      for (const proto of [standard, middle, gold])
        proto.traverse((o) => {
          const m = (o as T.Mesh).material as T.MeshStandardMaterial;
          if (m?.emissive?.getHex()) m.emissiveIntensity = 0.25 + night * 0.7;
        });
    },
  };
}
