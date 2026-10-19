import type { RailLine, RailNetwork, RailSample } from "./network";
import { sampleRail,SIAM_JUNCTION } from "./network";

type Leg = {
  start: number;
  end: number;
  direction: number;
  at: number;
  duration: number;
  accelTime: number;
  cruiseTime: number;
  peak: number;
  station?: string;
};
export type TrainState = {
  id: string;
  line: RailLine;
  direction: number;
  distance: number;
  speed: number;
  station?: string;
  doors: number;
  sample: RailSample;
};

/** Time-derived schedule: pause freezes the engine's simulation clock; restart
 * returns to identical service. Analytic acceleration has no integration drift.
 * Endpoint run-outs use visible crossovers; no train is recycled/teleported. */
export class RailService {
  readonly trains: TrainState[] = [];
  private schedules = new Map<RailLine, { legs: Leg[]; duration: number }>();
  constructor(net: RailNetwork) {
    for (const line of net.lines) {
      const points = [
        { distance: 35, id: undefined },
        ...line.stations.map((s) => ({ distance: s.distance, id: s.id })),
        { distance: line.length - 35, id: undefined },
      ];
      const legs: Leg[] = [];
      let at = 0;
      const add = (start: number, end: number, station?: string) => {
        const distance = Math.abs(end - start),
          accel = 1.65,
          max = line.id === "gold" ? 13 : 19,
          peak = Math.min(max, Math.sqrt(distance * accel)),
          accelTime = peak / accel,
          cruiseTime = Math.max(0, distance / peak - accelTime),
          duration = 2 * accelTime + cruiseTime;
        if (distance > 0.01) {
          legs.push({
            start,
            end,
            direction: Math.sign(end - start),
            at,
            duration,
            accelTime,
            cruiseTime,
            peak,
          });
          at += duration;
        }
        const dwell = station ? 7 : 5;
        legs.push({
          start: end,
          end,
          direction: Math.sign(end - start) || 1,
          at,
          duration: dwell,
          accelTime: 0,
          cruiseTime: 0,
          peak: 0,
          station,
        });
        at += dwell;
      };
      for (let i = 1; i < points.length; i++)
        add(points[i - 1]!.distance, points[i]!.distance, points[i]!.id);
      for (let i = points.length - 2; i >= 0; i--)
        add(points[i + 1]!.distance, points[i]!.distance, points[i]!.id);
      this.schedules.set(line, { legs, duration: at });
      for (let i = 0; i < 2; i++)
        this.trains.push({
          id: `${line.id}:${i}`,
          line,
          direction: i ? -1 : 1,
          distance: 0,
          speed: 0,
          doors: 0,
          sample: { x: 0, z: 0, tx: 0, tz: 0, distance: 0, y: 0 },
        });
    }
    this.update(0);
  }
  update(time: number) {
    for (let i = 0; i < this.trains.length; i++) {
      const train = this.trains[i]!,
        schedule = this.schedules.get(train.line)!,
        phase =
          (((time + ((i % 2) * schedule.duration) / 2) % schedule.duration) +
            schedule.duration) %
          schedule.duration;
      const leg = schedule.legs.find((l) => phase < l.at + l.duration)!,
        t = phase - leg.at;
      let travel = 0,
        speed = 0;
      if (leg.peak) {
        const accel = leg.peak / leg.accelTime;
        if (t < leg.accelTime) {
          speed = accel * t;
          travel = 0.5 * accel * t * t;
        } else if (t < leg.accelTime + leg.cruiseTime) {
          speed = leg.peak;
          travel =
            0.5 * leg.peak * leg.accelTime + (t - leg.accelTime) * leg.peak;
        } else {
          const remaining = leg.duration - t;
          speed = accel * remaining;
          travel =
            Math.abs(leg.end - leg.start) - 0.5 * accel * remaining * remaining;
        }
      }
      train.distance = leg.start + leg.direction * travel;
      train.speed = speed;
      train.direction = leg.direction;
      train.station = leg.station;
      train.doors = leg.station
        ? Math.min(1, t * 2, (leg.duration - t) * 2)
        : 0;
      trainSample(train.line, train.distance, train.direction, train.sample);
    }
  }
}

/** Direction-separated tracks, with a continuous taper into terminal crossovers.
 * At Siam each level has one track from EACH line beside an island platform. */
export function trainSample(
  line: RailLine,
  distance: number,
  direction: number,
  out: RailSample,
) {
  const siam = line.stations.find((s) => s.id === "siam");
  const blend = siam
    ? Math.max(0, Math.min(1, (SIAM_JUNCTION.offsetApproach - Math.abs(distance - siam.distance)) / SIAM_JUNCTION.offsetRun))
    : 0;
  const normal = line.id === "gold" ? 1.9 : 2.1,
    atSiam = line.id === "silom" ? -4.8 : 4.8;
  const taksin = line.stations.find((s) => s.id === "saphan-taksin");
  const throat = taksin
    ? Math.max(0, Math.min(1, (Math.abs(distance - taksin.distance) - 44) / 55))
    : 1;
  const offset =
    throat *
    (normal * direction * (1 - blend) + atSiam * blend) *
    Math.max(
      0,
      Math.min(1, (distance - 80) / 55, (line.length - distance - 80) / 55),
    );
  return sampleRail(line, distance, out, offset, direction);
}
