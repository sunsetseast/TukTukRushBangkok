import { Trophy, Wallet, MapPin, Star, X, Check } from 'lucide-react';
import { ACHIEVEMENTS, rankFor, type CareerStore } from './career';
import { Surface } from './ui/Surface';
const baht = (n: number) => `฿${n.toLocaleString()}`;
export function DriverCareer({
  store,
  landmarkCount,
  districtCount,
  onClose,
}: {
  store: CareerStore;
  landmarkCount: number;
  districtCount: number;
  onClose: () => void;
}) {
  const p = store.profile,
    rank = rankFor(p.xp),
    progress = rank.next ? (p.xp - rank.xp) / (rank.next.xp - rank.xp) : 1;
  return (
    <Surface label="Driver career" onBack={onClose}>
      <div className="tt-card tt-career" data-testid="driver-career">
        <div className="tt-card-heading">
          <div>
            <span className="tt-kicker">YOUR BANGKOK STORY</span>
            <h2>Driver career</h2>
          </div>
          <button
            className="tt-icon-btn"
            onClick={onClose}
            aria-label="Close career"
            data-testid="button-close-career"
          >
            <X size={20} />
          </button>
        </div>
        <div className="tt-career-hero">
          <div className="tt-career-medallion">
            <Star size={32} />
          </div>
          <div>
            <small>DRIVER RANK</small>
            <h3>{rank.name}</h3>
            <p>
              {p.xp.toLocaleString()} XP
              {rank.next ? ` · ${rank.next.xp - p.xp} to ${rank.next.name}` : ' · Top rank'}
            </p>
            <progress aria-label="Driver rank progress" value={progress} max={1} />
          </div>
          <div className="tt-career-wallet">
            <Wallet size={22} />
            <small>WALLET</small>
            <b data-testid="career-wallet">{baht(p.wallet)}</b>
          </div>
        </div>
        <div className="tt-career-stats">
          {[
            [baht(p.lifetimeEarnings), 'Lifetime earned'],
            [p.fares, 'Completed fares'],
            [p.shifts, 'Completed shifts'],
            [`${(p.distance / 1000).toFixed(1)} km`, 'Distance driven'],
            [baht(p.bestEarnings), 'Best shift earnings'],
            [p.bestScore.toLocaleString(), 'Best shift score'],
          ].map(([n, label]) => (
            <div key={label}>
              <b>{n}</b>
              <span>{label}</span>
            </div>
          ))}
        </div>
        <div className="tt-career-discovery">
          <MapPin size={20} />
          <b>City explorer</b>
          <span>
            {p.districts.length}/{districtCount} districts · {p.landmarks.length}/{landmarkCount}{' '}
            landmarks
          </span>
        </div>
        <h3 className="tt-career-section">
          <Trophy size={18} /> Achievements{' '}
          <small>
            {p.achievements.length}/{ACHIEVEMENTS.length}
          </small>
        </h3>
        <div className="tt-achievements">
          {ACHIEVEMENTS.map((a) => {
            const earned = p.achievements.includes(a.id);
            return (
              <div key={a.id} className={earned ? 'earned' : ''}>
                <span className="tt-achievement-icon">
                  {earned ? <Check size={18} /> : <Trophy size={18} />}
                </span>
                <div>
                  <b>{a.name}</b>
                  <small>{a.description}</small>
                </div>
                <span className="tt-achievement-state">{earned ? 'Earned' : 'To unlock'}</span>
              </div>
            );
          })}
        </div>
        <p className="tt-setting-note" role="status">
          {store.status === 'memory'
            ? 'Storage is unavailable. This session’s progress is held in memory; keep this page open.'
            : store.status === 'protected'
              ? 'An unreadable or newer save was preserved. Progress here is temporary; your stored data has not been replaced.'
              : store.status === 'recovered'
                ? 'A damaged save was recovered from backup, or preserved before starting this career.'
                : 'Saved on this browser and device. Fare earnings go straight to your wallet.'}
        </p>
      </div>
    </Surface>
  );
}
