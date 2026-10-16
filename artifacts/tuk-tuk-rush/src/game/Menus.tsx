import { useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Compass,
  Map,
  RotateCcw,
  Settings2,
  Volume2,
  VolumeX,
  Wrench,
  X,
  Sparkles,
  Flag,
  Trophy,
} from "lucide-react";
import { ACHIEVEMENTS } from "./career";
import type { GameSnapshot } from "./types";
import type { Preferences } from "./ui/preferences";
import { Surface } from "./ui/Surface";
type Q = "low" | "medium";
export function Settings({
  audio,
  onAudio,
  quality,
  onQuality,
  prefs,
  onPreferences,
}: {
  audio: boolean;
  onAudio: () => void;
  quality: Q;
  onQuality: (q: Q) => void;
  prefs: Preferences;
  onPreferences: (p: Partial<Preferences>) => void;
}) {
  return (
    <div className="tt-settings" data-testid="settings">
      <div className="tt-setting-row">
        <div>
          <b>Sound</b>
          <span>Engine, streets & feedback</span>
        </div>
        <button
          className="tt-btn ghost"
          onClick={onAudio}
          data-testid="button-audio"
          aria-pressed={audio}
        >
          {audio ? <Volume2 size={18} /> : <VolumeX size={18} />}
          {audio ? "On" : "Off"}
        </button>
      </div>
      <div className="tt-setting-row">
        <div>
          <b>Visual quality</b>
          <span>
            {quality === "low"
              ? "Fast · longer battery life"
              : "Detailed · richer city lighting"}
          </span>
        </div>
        <div className="tt-seg" role="group" aria-label="Quality">
          {(["low", "medium"] as Q[]).map((q) => (
            <button
              key={q}
              aria-pressed={quality === q}
              onClick={() => onQuality(q)}
              data-testid={`button-quality-${q}`}
            >
              {q === "low" ? "Fast" : "Detailed"}
            </button>
          ))}
        </div>
      </div>
      <div className="tt-setting-row">
        <div>
          <b>Touch controls</b>
          <span>Comfortable thumb reach</span>
        </div>
        <div className="tt-seg" role="group" aria-label="Control size">
          {(["standard", "large"] as const).map((v) => (
            <button
              key={v}
              aria-pressed={prefs.controls === v}
              onClick={() => onPreferences({ controls: v })}
            >
              {v === "standard" ? "Standard" : "Large"}
            </button>
          ))}
        </div>
      </div>
      <label className="tt-setting-row">
        <div>
          <b>Control visibility</b>
          <span>Surfaces only · labels stay readable</span>
        </div>
        <input
          aria-label="Control visibility"
          type="range"
          min="55"
          max="100"
          value={Math.round(prefs.opacity * 100)}
          onChange={(e) =>
            onPreferences({ opacity: Number(e.target.value) / 100 })
          }
        />
      </label>
      <div className="tt-setting-row">
        <div>
          <b>Motion</b>
          <span>System follows your device preference</span>
        </div>
        <div className="tt-seg" role="group" aria-label="Motion">
          {(["system", "reduced"] as const).map((v) => (
            <button
              key={v}
              aria-pressed={prefs.motion === v}
              onClick={() => onPreferences({ motion: v })}
            >
              {v === "system" ? "System" : "Reduced"}
            </button>
          ))}
        </div>
      </div>
      <p className="tt-setting-note">
        Settings save on this device. Visual quality may switch to Fast to keep
        driving responsive.
      </p>
    </div>
  );
}
export function Title({
  onCareer,
  onStart,
  settings,
  bangkok = false,
}: {
  onCareer: () => void;
  onStart: (m: "shift" | "free") => void;
  settings: ReactNode;
  bangkok?: boolean;
}) {
  const [showSettings, setShowSettings] = useState(false);
  return (
    <>
      <div className="tt-title">
        <div className="tt-panel">
          <div className="tt-kicker">
            <Sparkles size={16} /> BANGKOK · ARCADE
          </div>
          <h1>
            <span>TUK TUK</span>
            <span className="r">
              RUSH<span className="tt-title-period">.</span>
            </span>
          </h1>
          <p className="tt-title-description">
            Three wheels. Big city. Your next adventure.
          </p>
          <div className="tt-title-btns">
            <button
              className="tt-mode-card primary"
              onClick={() => onStart("shift")}
              data-testid="button-start-shift"
            >
              <span>
                <b>Start shift</b>
                <small>
                  {bangkok ? "24 minutes" : "3 minutes"} · passengers, fares &
                  the night ahead
                </small>
              </span>
              <Flag size={22} />
            </button>
            <button
              className="tt-mode-card"
              onClick={() => onStart("free")}
              data-testid="button-free-roam"
            >
              <span>
                <b>Free roam</b>
                <small>Your city. Your pace. No shift timer.</small>
              </span>
              <Compass size={22} />
            </button>
          </div>
          <div className="tt-title-meta">
            <button className="tt-text-button" onClick={onCareer} data-testid="button-title-career"><Trophy size={16}/> Driver career</button>
            <button
              className="tt-text-button"
              onClick={() => setShowSettings(true)}
              data-testid="button-title-settings"
            >
              <Settings2 size={16} /> Settings
            </button>
            <a
              className="tt-world-switch"
              href={bangkok ? "?world=chinatown" : "?world=bangkok"}
            >
              {bangkok ? "Original Chinatown" : "Explore Bangkok"}{" "}
              <ArrowRight size={12} />
            </a>
          </div>
          <small className="tt-map-credit">
            {bangkok ? (
              "A handcrafted, compact Bangkok"
            ) : (
              <>
                Road layout ·{" "}
                <a
                  href="https://www.openstreetmap.org/copyright"
                  target="_blank"
                  rel="noreferrer"
                >
                  © OpenStreetMap contributors
                </a>{" "}
                · ODbL
              </>
            )}
          </small>
        </div>
        <div className="tt-title-location">
          <span>กรุงเทพมหานคร</span>
          <b>{bangkok ? "BANGKOK" : "YAOWARAT"}</b>
          <small>From golden hour to neon nights</small>
        </div>
      </div>
      {showSettings && (
        <Surface label="Settings" onBack={() => setShowSettings(false)}>
          <div className="tt-card tt-settings-card">
            <div className="tt-card-heading">
              <div>
                <span className="tt-kicker">MAKE IT YOURS</span>
                <h2>Settings</h2>
              </div>
              <button
                className="tt-icon-btn"
                aria-label="Close settings"
                data-testid="button-close-settings"
                onClick={() => setShowSettings(false)}
              >
                <X size={20} />
              </button>
            </div>
            {settings}
          </div>
        </Surface>
      )}
    </>
  );
}
export function PauseMenu({
  goals,
  onCareer,
  onResume,
  onRestart,
  onRecover,
  onMap,
  onTitle,
  settings,
}: {
  onCareer: () => void;
  goals: GameSnapshot;
  onResume: () => void;
  onRestart: () => void;
  onRecover: () => void;
  onMap?: () => void;
  onTitle: () => void;
  settings: ReactNode;
}) {
  const [view, setView] = useState<"main" | "settings" | "restart" | "title">(
    "main",
  );
  const back = () => (view === "main" ? onResume() : setView("main"));
  return (
    <Surface
      key={view}
      label={
        view === "settings"
          ? "Settings"
          : view === "main"
            ? "Paused"
            : "Confirm leaving shift"
      }
      onBack={back}
    >
      <div
        className={`tt-card ${view === "settings" ? "tt-settings-card" : ""}`}
      >
        <div className="tt-card-heading">
          <div>
            <span className="tt-kicker">BANGKOK ARCADE</span>
            <h2>
              {view === "settings"
                ? "Settings"
                : view === "main"
                  ? "Pit stop!"
                  : view === "restart"
                    ? "Start fresh?"
                    : "Leave this drive?"}
            </h2>
          </div>
          <button
            className="tt-icon-btn"
            aria-label={view === "main" ? "Resume" : "Back to pause menu"}
            onClick={back}
          >
            <X size={20} />
          </button>
        </div>
        {view === "settings" ? (
          settings
        ) : view === "main" ? (
          <>
            <p className="tt-card-description">
              The city will wait. Your drive is paused.
            </p>
            <div className="tt-drive-goals"><b>Try this drive · optional</b><span>{goals.deliveries>=3?'✓':'○'} Complete 3 fares · {Math.min(3,goals.deliveries)}/3</span>{goals.districtName && <span>{(goals.newDistricts??0)>0?'✓':'○'} Discover a new district</span>}</div>
            <button
              className="tt-btn big"
              onClick={onResume}
              data-testid="button-resume"
            >
              Back to the streets <ArrowRight size={18} />
            </button>
            <div className="tt-menu-grid">
              <button className="tt-btn ghost" onClick={onCareer} data-testid="button-pause-career"><Trophy size={18}/> Driver career</button>
              {onMap && (
                <button
                  className="tt-btn ghost"
                  onClick={onMap}
                  data-testid="button-pause-map"
                >
                  <Map size={18} />
                  City map
                </button>
              )}
              <button
                className="tt-btn ghost"
                onClick={() => setView("settings")}
                data-testid="button-pause-settings"
              >
                <Settings2 size={18} />
                Settings
              </button>
              <button
                className="tt-btn ghost"
                onClick={onRecover}
                data-testid="button-pause-recover"
              >
                <Wrench size={18} />
                Recover vehicle
              </button>
              <button
                className="tt-btn ghost"
                onClick={() => setView("restart")}
                data-testid="button-restart"
              >
                <RotateCcw size={18} />
                Restart
              </button>
            </div>
            <button
              className="tt-text-button"
              onClick={() => setView("title")}
              data-testid="button-return-title"
            >
              <ArrowLeft size={14} />
              Title screen
            </button>
          </>
        ) : (
          <>
            <p className="tt-card-description">
              This drive’s score and shift totals will be cleared. Your wallet, career and discovered places stay saved.
            </p>
            <button
              className="tt-btn"
              onClick={view === "restart" ? onRestart : onTitle}
              data-testid="button-confirm-leave"
            >
              {view === "restart" ? "Restart drive" : "Return to title"}
            </button>
            <button className="tt-btn ghost" onClick={() => setView("main")}>
              Keep this drive
            </button>
          </>
        )}
      </div>
    </Surface>
  );
}
export function Results({
  onCareer,
  s,
  onAgain,
  onFree,
}: {
  onCareer: () => void;
  s: GameSnapshot;
  onAgain: () => void;
  onFree: () => void;
}) {
  return (
    <Surface label="Shift complete">
      <div className="tt-card tt-results-card">
        <span className="tt-kicker">THE CITY SAYS THANK YOU</span>
        <h2>What a ride!</h2>
        <div className="tt-earned">
          <span>SHIFT EARNINGS</span>
          <b data-testid="text-result-earnings">
            ฿{Math.round(s.earnings).toLocaleString()}
          </b>
        </div>
        <div className="tt-results">
          <div>
            <b data-testid="text-result-fares">{s.deliveries}</b>
            <span>Completed fares</span>
          </div>
          <div>
            <b data-testid="text-result-score">
              {Math.round(s.score).toLocaleString()}
            </b>
            <span>Total score</span>
          </div>
        </div>
        <div className="tt-results-career"><span><b>+{s.careerXP ?? 0} XP</b> Career experience</span><span><b>฿{(s.wallet ?? 0).toLocaleString()}</b> Wallet balance</span></div>
        {!!s.careerRecords?.length && <p className="tt-career-record">★ {s.careerRecords.join(' · ')}</p>}
        {!!s.careerAchievements?.length && <p className="tt-career-record">{s.careerAchievements.map(id=>ACHIEVEMENTS.find(a=>a.id===id)?.name).join(' · ')}</p>}
        <p className="tt-card-description">Baht includes the time-based fare bonus. Quick deliveries add 150 score points. Shift complete: +100 XP.</p>
        <button className="tt-text-button" onClick={onCareer} data-testid="button-results-career"><Trophy size={16}/> View driver career</button>
        <div className="tt-card-btns">
          <button
            className="tt-btn"
            onClick={onAgain}
            data-testid="button-again"
          >
            Another shift <ArrowRight size={18} />
          </button>
          <button
            className="tt-btn ghost"
            onClick={onFree}
            data-testid="button-results-free"
          >
            Keep exploring
          </button>
        </div>
      </div>
    </Surface>
  );
}
