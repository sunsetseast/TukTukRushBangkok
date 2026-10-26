import type { SignatureId } from './signatureCorridor';
export type Point = { x: number; z: number };
export type RoadNode = Point & { id: string; name?: string };
export type Road = { spawnTraffic?: boolean; a: string; b: string; width: number; name: string; shortcut?: boolean; oneWay?: boolean; roundabout?: boolean; bridge?: boolean; corridor?: string; destinationId?: string; surface?: 'asphalt' | 'arrival'; noTraffic?: boolean };
export type Obstacle = { frontageRoad?: string; bangRak?: { family: "warehouse" | "merchant" | "gallery" | "timber" | "workshop" | "cafe"; trade: "gallery" | "coffee" | "workshop" | "food" | "residence" | "retail"; road: string }; chinatown?: { role?: "rear"; owner?: string; exposedSides?: number[]; identity?: string; block: string; corridor: string; character: "yaowarat" | "songwat" | "talatnoi" | "commercial" }; environmentId?: string; artRole?: "background" | "furniture"; protected?: boolean; landmarkId?: string; regionId?: string; x: number; z: number; w: number; d: number; height: number; color: string; yaw?: number; style?: 'gold' | 'noodle' | 'pharmacy' | 'hotel' | 'heritage'; sign?: string; showcase?: boolean; signatureId?: SignatureId; signatureInfillIndex?: number };
export type Landmark = Point & { kind: 'hotel' | 'museum' | 'church' | 'gate' | 'temple' | 'station' | 'palace' | 'park' | 'mall' | 'tower' | 'market' | 'wheel' | 'monument'; name: string; id?: string; size?: number; plot?: Point; yaw?:number; accessNode?: string };
export type Region = { id: string; name: string; color: string; polygon: Point[] };
export type DestinationAccess = {
  id: string; landmarkId: string; kind: 'temple' | 'mall' | 'palace' | 'waterfront';
  publicNode: string; entrance: Point & { yaw: number; width: number }; arrivalNode: string;
  origin: Point; yaw: number; roadNodes: string[]; restricted: Obstacle[];
  arrivalRadius: number; adaptation: string; curbside?: boolean;
};
/** World adapters expose topology/physics without duplicating the career or fare state machine. */
export type WorldNavigation = {
  stops: RoadNode[];
  path(p: Point, target: RoadNode): Point[];
  distances(p: Point, targets: RoadNode[]): Map<string, number>;
  nearest(p: Point): { point: Point; heading: number; distance: number; name: string; thai?: string };
};
export type DrivingSurface = {
  height: number;
  blocked(p: Point, before: Point): boolean;
  reset(p: Point): void;
};
export type District = { navigation?: WorldNavigation; driving?: DrivingSurface; waterPolygons?: Point[][][]; publicSpaces?: import('./bangkok/publicSpaces').PublicSpace[]; authoredSites?: import('./bangkok/authoredSites').AuthoredSite[]; destinations?: DestinationAccess[]; transit?: import('./bangkok/transit/network').RailNetwork; worldId?: 'bangkok'; spawn?: Point & { heading: number }; bounds?: { minX: number; maxX: number; minZ: number; maxZ: number }; river?: Point[]; riverPolygon?: Point[][]; riverStructures?: Point[][]; waterVersion?: string; riverWidth?: number; canals?: { points: Point[]; width: number }[]; regions?: Region[]; nodes: RoadNode[]; roads: Road[]; buildings: Obstacle[]; obstacles: Obstacle[]; landmarks: Landmark[]; roundabout?: Point & { radius: number; laneWidth: number } };
export type Vehicle = Point & { heading: number; speed: number; steer: number; lean: number; wheelSpin: number; collision: number };
export type TrafficCar = Point & { id: number; heading: number; speed: number; kind: 'taxi' | 'car' | 'motorcycle'; color: string; from: string; to: string; wait: number; nearMissCooldown: number };
export type Input = { steer: number; gas: boolean; brake: boolean; boost?: boolean };
export type Mission = { pickup: RoadNode; destination: RoadNode; passenger: string; limit: number; routeDistance?: number; baseFare?: number };
export type GameSnapshot = {
  session?: number;
  wallet?: number; careerXP?: number; careerAchievements?: string[]; careerRecords?: string[]; careerNotice?: string; newDistricts?: number;
  viewingLandmark?: string; boostState?: 'ready' | 'active' | 'recharging'; boostActive?: number; boostRecharge?: number;
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
