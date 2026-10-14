import type { SignatureId } from './signatureCorridor';
export type Point = { x: number; z: number };
export type RoadNode = Point & { id: string; name?: string };
export type Road = { a: string; b: string; width: number; name: string; shortcut?: boolean; oneWay?: boolean; roundabout?: boolean; bridge?: boolean; corridor?: string };
export type Obstacle = { environmentId?: string; artRole?: "background" | "furniture"; protected?: boolean; landmarkId?: string; regionId?: string; x: number; z: number; w: number; d: number; height: number; color: string; yaw?: number; style?: 'gold' | 'noodle' | 'pharmacy' | 'hotel' | 'heritage'; sign?: string; showcase?: boolean; signatureId?: SignatureId; signatureInfillIndex?: number };
export type Landmark = Point & { kind: 'gate' | 'temple' | 'station' | 'palace' | 'park' | 'mall' | 'tower' | 'market' | 'wheel' | 'monument'; name: string; id?: string; size?: number; plot?: Point; yaw?:number; accessNode?: string };
export type Region = { id: string; name: string; color: string; polygon: Point[] };
export type District = { worldId?: 'bangkok'; spawn?: Point & { heading: number }; bounds?: { minX: number; maxX: number; minZ: number; maxZ: number }; river?: Point[]; riverWidth?: number; canals?: { points: Point[]; width: number }[]; regions?: Region[]; nodes: RoadNode[]; roads: Road[]; buildings: Obstacle[]; obstacles: Obstacle[]; landmarks: Landmark[]; roundabout?: Point & { radius: number; laneWidth: number } };
export type Vehicle = Point & { heading: number; speed: number; steer: number; lean: number; wheelSpin: number; collision: number };
export type TrafficCar = Point & { id: number; heading: number; speed: number; kind: 'taxi' | 'car' | 'motorcycle'; color: string; from: string; to: string; wait: number; nearMissCooldown: number };
export type Input = { steer: number; gas: boolean; brake: boolean; boost?: boolean };
export type Mission = { pickup: RoadNode; destination: RoadNode; passenger: string; limit: number };
export type GameSnapshot = {
  viewingLandmark?: 'pho'; boostState?: 'ready' | 'active' | 'recharging'; boostActive?: number; boostRecharge?: number;
  elapsed?: number; districtName?: string; discoveredDistricts?: string[]; discoveredLandmarks?: string[]; discoveredShortcuts?: string[];
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
