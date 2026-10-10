export type Point = { x: number; z: number };
export type RoadNode = Point & { id: string; name?: string };
export type Road = { a: string; b: string; width: number; name: string; shortcut?: boolean };
export type Obstacle = { x: number; z: number; w: number; d: number; height: number; color: string };
export type Landmark = Point & { kind: 'gate' | 'temple' | 'station'; name: string };
export type District = { nodes: RoadNode[]; roads: Road[]; buildings: Obstacle[]; obstacles: Obstacle[]; landmarks: Landmark[] };
export type Vehicle = Point & { heading: number; speed: number; steer: number; lean: number; wheelSpin: number; collision: number };
export type TrafficCar = Point & { id: number; heading: number; speed: number; kind: 'taxi' | 'car' | 'motorcycle'; color: string; from: string; to: string; wait: number; nearMissCooldown: number };
export type Input = { steer: number; gas: boolean; brake: boolean };
export type Mission = { pickup: RoadNode; destination: RoadNode; passenger: string; limit: number };
export type GameSnapshot = {
  phase: 'title' | 'playing' | 'paused' | 'ended';
  mode: 'shift' | 'free'; stage: 'pickup' | 'delivery';
  shiftTime: number; tripTime: number; score: number; earnings: number; deliveries: number;
  speed: number; target: RoadNode; passenger: string; distance: number; bearing: number;
  message: string; boarding: number; quality: 'low' | 'medium'; fps: number;
};
export type GameModel = {
  district: District; player: Vehicle; traffic: TrafficCar[]; input: Input;
  snapshot: GameSnapshot; mission: Mission; missionIndex: number;
};
