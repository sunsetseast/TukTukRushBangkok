import { Volume2, VolumeX } from 'lucide-react';
import type { GameSnapshot } from './types';

type Q = 'low' | 'medium';

export function Settings({ audio, onAudio, quality, onQuality }: { audio: boolean; onAudio: () => void; quality: Q; onQuality: (q: Q) => void }) {
  return (
    <div className="tt-settings">
      <button className="tt-btn ghost sm" onClick={onAudio} data-testid="button-audio">
        {audio ? <Volume2 size={18} /> : <VolumeX size={18} />} {audio ? 'Sound on' : 'Sound off'}
      </button>
      <div className="tt-seg" role="group" aria-label="Quality">
        {(['low', 'medium'] as Q[]).map((q) => (
          <button key={q} className={quality === q ? 'on' : ''} onClick={() => onQuality(q)} data-testid={`button-quality-${q}`}>{q === 'low' ? 'Fast' : 'Pretty'}</button>
        ))}
      </div>
    </div>
  );
}

export function Title({ onStart, settings, bangkok = false }: { onStart: (m: 'shift' | 'free') => void; settings: React.ReactNode; bangkok?: boolean }) {
  return (
    <div className="tt-title">
      <div className="tt-panel">
        <div className="tt-kicker">{bangkok ? 'BANGKOK · SUNSET SHIFT' : 'เยาวราช · BANGKOK · 18:04'}</div>
        <h1><span>TUK TUK</span><span className="r">RUSH</span></h1>
        <p>{bangkok ? 'Explore compact Bangkok. A 24-minute sunset-to-night shift.' : 'Three wheels. Sunset Chinatown. 180 seconds of fares.'}</p>
        {bangkok && <small>City layout preview · landmark blockouts</small>}
        <div className="tt-title-btns">
          <button className="tt-btn big" onClick={() => onStart('shift')} data-testid="button-start-shift">Start shift</button>
          <button className="tt-btn gold" onClick={() => onStart('free')} data-testid="button-free-roam">Free roam</button>
        </div>
        {settings}
        <a className="tt-world-switch" href={bangkok ? '?world=chinatown' : '?world=bangkok'}>{bangkok ? 'Play the detailed Chinatown district' : 'Explore the Bangkok layout'}</a>
        <div className="tt-how">Drag left thumb to steer · hold GO on the right</div>
        <small style={{ display: 'block', fontSize: 10, marginTop: 5 }}>
          {bangkok ? 'Hand-authored compact map · not for real-world navigation' : <>Road layout adapted from <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a> · ODbL</>}
        </small>
      </div>
    </div>
  );
}

export function PauseMenu({ onResume, onRestart, onRecover, settings }: { onResume: () => void; onRestart: () => void; onRecover: () => void; settings: React.ReactNode }) {
  return (
    <div className="tt-modal">
      <div className="tt-card">
        <h2>Paused</h2>
        <div className="tt-card-btns">
          <button className="tt-btn big" onClick={onResume} data-testid="button-resume">Resume</button>
          <button className="tt-btn gold" onClick={onRecover} data-testid="button-pause-recover">Reset position</button>
          <button className="tt-btn ghost" onClick={onRestart} data-testid="button-restart">Restart</button>
        </div>
        {settings}
      </div>
    </div>
  );
}

export function Results({ s, onAgain, onFree }: { s: GameSnapshot; onAgain: () => void; onFree: () => void }) {
  return (
    <div className="tt-modal">
      <div className="tt-card">
        <div className="tt-kicker">Shift complete</div>
        <h2>฿ {Math.round(s.earnings).toLocaleString()}</h2>
        <div className="tt-results">
          <div><b data-testid="text-result-fares">{s.deliveries}</b><span>fares</span></div>
          <div><b data-testid="text-result-score">{Math.round(s.score).toLocaleString()}</b><span>score</span></div>
        </div>
        <div className="tt-card-btns row">
          <button className="tt-btn big" onClick={onAgain} data-testid="button-again">Another shift</button>
          <button className="tt-btn gold" onClick={onFree} data-testid="button-results-free">Free roam</button>
        </div>
      </div>
    </div>
  );
}
