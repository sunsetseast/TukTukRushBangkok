/** Local-only career ledger. Gameplay sessions are never reconstructed as earnings. */
export const CAREER_KEY = 'tuktuk:career:v1';
const BACKUP_KEY = CAREER_KEY + ':backup';
type Store = Pick<Storage, 'getItem' | 'setItem'>;
export type Career = {
  version: 1;
  wallet: number;
  lifetimeEarnings: number;
  fares: number;
  shifts: number;
  bestScore: number;
  bestEarnings: number;
  distance: number;
  xp: number;
  achievements: string[];
  districts: string[];
  landmarks: string[];
  sequence: number;
  active?: { id: number; fare: number; completed: boolean };
};
export const RANKS = [
  { name: 'New Driver', xp: 0 },
  { name: 'Neighborhood Regular', xp: 400 },
  { name: 'Trusted Driver', xp: 1600 },
  { name: 'Bangkok Professional', xp: 5000 },
  { name: 'City Legend', xp: 14000 },
];
export function rankFor(xp: number) {
  const index = RANKS.findLastIndex((r) => xp >= r.xp);
  return { ...RANKS[Math.max(0, index)]!, next: RANKS[index + 1] };
}
export const ACHIEVEMENTS = [
  {
    id: 'first-fare',
    name: 'First passenger',
    description: 'Deliver your first fare',
    test: (p: Career) => p.fares >= 1,
  },
  ...[5, 10, 25].map((n) => ({
    id: `fares-${n}`,
    name: `${n} happy arrivals`,
    description: `Complete ${n} fares`,
    test: (p: Career) => p.fares >= n,
  })),
  {
    id: 'first-shift',
    name: 'Clocking out',
    description: 'Finish an Arcade Shift',
    test: (p: Career) => p.shifts >= 1,
  },
  ...[1000, 5000, 10000].map((n) => ({
    id: `earned-${n}`,
    name: `฿${n.toLocaleString()} on the road`,
    description: `Earn ฿${n.toLocaleString()} across sessions`,
    test: (p: Career) => p.lifetimeEarnings >= n,
  })),
  {
    id: 'districts-3',
    name: 'Neighborhood explorer',
    description: 'Discover 3 districts',
    test: (p: Career) => p.districts.length >= 3,
  },
  {
    id: 'landmarks-5',
    name: 'Bangkok postcard',
    description: 'Discover 5 landmarks',
    test: (p: Career) => p.landmarks.length >= 5,
  },
  {
    id: 'strong-shift',
    name: 'A shift to remember',
    description: 'Earn ฿1000 in a completed shift',
    test: (p: Career) => p.bestEarnings >= 1000,
  },
];
const fresh = (): Career => ({
  version: 1,
  wallet: 0,
  lifetimeEarnings: 0,
  fares: 0,
  shifts: 0,
  bestScore: 0,
  bestEarnings: 0,
  distance: 0,
  xp: 0,
  achievements: [],
  districts: [],
  landmarks: [],
  sequence: 0,
});
const ids = (v: unknown): v is string[] =>
  Array.isArray(v) && v.length < 10000 && v.every((x) => typeof x === 'string' && x.length < 200);
const amount = (n: unknown): n is number =>
  typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= Number.MAX_SAFE_INTEGER;
export function validateCareer(value: unknown): Career | undefined {
  if (!value || typeof value !== 'object') return;
  const p = value as Career;
  if (
    p.version !== 1 ||
    ![
      'wallet',
      'lifetimeEarnings',
      'fares',
      'shifts',
      'bestScore',
      'bestEarnings',
      'distance',
      'xp',
      'sequence',
    ].every((k) => amount(p[k as keyof Career]))
  )
    return;
  if (
    ![
      'wallet',
      'lifetimeEarnings',
      'fares',
      'shifts',
      'bestScore',
      'bestEarnings',
      'xp',
      'sequence',
    ].every((k) => Number.isSafeInteger(p[k as keyof Career]))
  )
    return;
  if (p.wallet > p.lifetimeEarnings || ![p.achievements, p.districts, p.landmarks].every(ids))
    return;
  if (
    p.active &&
    (!Number.isSafeInteger(p.active.id) ||
      p.active.id < 1 ||
      p.active.id > p.sequence ||
      !Number.isSafeInteger(p.active.fare) ||
      p.active.fare < -1 ||
      typeof p.active.completed !== 'boolean')
  )
    return;
  return structuredClone(p);
}
export class CareerStore {
  profile: Career;
  status: 'saved' | 'memory' | 'recovered' | 'protected' = 'saved';
  private writable = true;
  private pendingDistance = 0;
  constructor(private storage?: Store) {
    let raw: string | null = null,
      backup: string | null = null;
    try {
      raw = storage?.getItem(CAREER_KEY) ?? null;
      backup = storage?.getItem(BACKUP_KEY) ?? null;
    } catch {
      this.status = 'memory';
      this.writable = false;
    }
    const parse = (s: string | null) => {
      try {
        return s ? JSON.parse(s) : undefined;
      } catch {
        return undefined;
      }
    };
    const primary = parse(raw),
      restored = validateCareer(primary) ?? validateCareer(parse(backup));
    this.profile = restored ?? fresh();
    // Never overwrite unsupported future versions or corrupt saves without a valid fallback.
    if (raw && !validateCareer(primary)) {
      if (primary?.version > 1) {
        this.writable = false;
        this.status = 'protected';
      } else if (restored) this.status = 'recovered';
      else {
        // Preserve the unreadable bytes before starting a clean ledger. If even
        // that fails, keep the original slot untouched and play in memory.
        try {
          const key = CAREER_KEY + ':unreadable';
          if (storage?.getItem(key)) throw Error('Recovery copy already present');
          storage?.setItem(key, raw);
          this.status = 'recovered';
        } catch {
          this.writable = false;
          this.status = 'protected';
        }
      }
    }
    if (!storage && this.status === 'saved') this.status = 'memory';
  }
  private refresh() {
    if (!this.writable || !this.storage || this.status === 'memory') return;
    try {
      const raw = this.storage.getItem(CAREER_KEY);
      if (!raw) return;
      const latest = validateCareer(JSON.parse(raw));
      if (latest) this.profile = latest;
    } catch {
      /* Keep the last validated in-memory ledger. */
    }
  }
  private save() {
    if (!this.writable) return;
    try {
      if (!this.storage) {
        this.status = 'memory';
        return;
      }
      const json = JSON.stringify(this.profile);
      // Both slots hold the latest complete ledger, so a damaged primary loses no acknowledged rewards.
      this.storage.setItem(CAREER_KEY, json);
      this.storage.setItem(BACKUP_KEY, json);
      this.status = 'saved';
    } catch {
      this.status = 'memory';
    }
  }
  private unlock() {
    const earned = ACHIEVEMENTS.filter(
      (a) => !this.profile.achievements.includes(a.id) && a.test(this.profile),
    ).map((a) => a.id);
    this.profile.achievements.push(...earned);
    return earned;
  }
  beginSession() {
    this.flush();
    this.profile.active = { id: ++this.profile.sequence, fare: -1, completed: false };
    this.save();
    return this.profile.sequence;
  }
  /** External callers must retain the session identity; old, repeated and closed transactions are rejected. */
  rewardFare(session: number, ordinal: number, baht: number, xp: number) {
    this.refresh();
    const a = this.profile.active;
    if (
      !a ||
      a.id !== session ||
      a.completed ||
      !Number.isSafeInteger(ordinal) ||
      ordinal <= a.fare ||
      !Number.isSafeInteger(baht) ||
      !amount(baht) ||
      !Number.isSafeInteger(xp) ||
      !amount(xp)
    )
      return { applied: false, achievements: [] as string[] };
    if (!amount(this.profile.lifetimeEarnings + baht) || !amount(this.profile.xp + xp))
      return { applied: false, achievements: [] as string[] };
    a.fare = ordinal;
    this.profile.wallet += baht;
    this.profile.lifetimeEarnings += baht;
    this.profile.xp += xp;
    this.profile.fares++;
    const achievements = this.unlock();
    this.commit();
    return { applied: true, achievements };
  }
  finishShift(session: number, score: number, earnings: number) {
    this.refresh();
    const a = this.profile.active;
    if (
      !a ||
      a.id !== session ||
      a.completed ||
      ![score, earnings].every((n) => amount(n) && Number.isSafeInteger(n))
    )
      return { applied: false, achievements: [] as string[], records: [] as string[] };
    a.completed = true;
    this.profile.shifts++;
    this.profile.xp += 100;
    const records: string[] = [];
    if (score > this.profile.bestScore) {
      this.profile.bestScore = score;
      records.push('Best shift score');
    }
    if (earnings > this.profile.bestEarnings) {
      this.profile.bestEarnings = earnings;
      records.push('Best shift earnings');
    }
    const achievements = this.unlock();
    this.commit();
    return { applied: true, achievements, records };
  }
  syncDiscovery(districts: string[], landmarks: string[], reward = false) {
    this.refresh();
    const p = this.profile,
      before = p.districts.length + p.landmarks.length;
    p.districts = [...new Set([...p.districts, ...districts])];
    p.landmarks = [...new Set([...p.landmarks, ...landmarks])];
    const added = p.districts.length + p.landmarks.length - before;
    if (!added) return [];
    if (reward) p.xp += added * 20;
    const earned = this.unlock();
    this.save();
    return earned;
  }
  drive(metres: number) {
    if (Number.isFinite(metres) && metres >= 0 && metres < 10) this.pendingDistance += metres;
  }
  private commit() {
    this.profile.distance += this.pendingDistance;
    this.pendingDistance = 0;
    this.save();
  }
  flush() {
    this.refresh();
    this.commit();
  }
}
