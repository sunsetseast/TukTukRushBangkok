import { useState, type ReactNode } from "react";
import { ArrowRight, Compass, Settings2, Trophy, Flag, X } from "lucide-react";
import { rankFor, type Career } from "../career";
import { Surface } from "./Surface";
/** Original line ornament, not a bitmap backdrop or a depiction of a named temple. */
function RoofOrnament() {
  return (
    <svg className="tt-roof-ornament" viewBox="0 0 320 55" aria-hidden="true">
      <path
        d="M8 49Q42 46 56 26L69 39 86 25 104 38 128 18 142 29 160 3 178 29 192 18 216 38 234 25 251 39 264 26Q278 46 312 49Z"
        fill="#165d59"
        stroke="#f6cc72"
        strokeWidth="3"
      />
      <path
        d="m81 48 24-16 15 13 40-30 40 30 15-13 24 16M142 48l18-17 18 17M160 3v-3"
        fill="none"
        stroke="#ffe7a2"
        strokeWidth="2"
      />
      <path d="M32 49h256M48 53h224" stroke="#b67830" strokeWidth="3" />
    </svg>
  );
}
export function ArcadeTitle({
  onCareer,
  onStart,
  settings,
  bangkok,
  profile,
}: {
  onCareer: () => void;
  onStart: (mode: "shift" | "free") => void;
  settings: ReactNode;
  bangkok: boolean;
  profile: Readonly<Career>;
}) {
  const [showSettings, setShowSettings] = useState(false),
    rank = rankFor(profile.xp),
    progress = rank.next
      ? (profile.xp - rank.xp) / (rank.next.xp - rank.xp)
      : 1;
  return (
    <>
      <main
        className="tt-title tt-cinematic-title"
        aria-label="Tuk Tuk Rush main menu"
      >
        <div
          className="tt-arcade-profile"
          aria-label={`Driver career. ${rank.name}. Wallet ${profile.wallet} baht.`}
        >
          <span className="tt-profile-emblem" aria-hidden="true">
            <Compass />
          </span>
          <div>
            <b>{rank.name}</b>
            <span
              className="tt-profile-progress"
              role="progressbar"
              aria-label="Driver rank progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress * 100)}
            >
              <i style={{ transform: `scaleX(${progress})` }} />
            </span>
          </div>
          <strong>
            ฿{profile.wallet.toLocaleString()}
            <small>WALLET</small>
          </strong>
        </div>
        <section className="tt-cinematic-panel">
          <div className="tt-arcade-logo">
            <RoofOrnament />
            <h1 aria-label="Tuk Tuk Rush">
              <span data-text="TUK TUK">TUK TUK</span>
              <span data-text="RUSH" className="rush">
                RUSH
              </span>
            </h1>
            <div className="tt-logo-ribbon">
              <i>◆</i> BANGKOK · ARCADE <i>◆</i>
            </div>
          </div>
          <p className="tt-cinematic-tagline">
            Three wheels. Big city.
            <br />
            Your next adventure.
          </p>
          <div className="tt-arcade-actions">
            <button
              className="tt-arcade-start"
              data-testid="button-start-shift"
              onClick={() => onStart("shift")}
            >
              <span className="tt-action-medallion">
                <Flag />
              </span>
              <span>
                <b>START SHIFT</b>
                <small>
                  {bangkok ? "24" : "3"} minutes · passengers, fares & the night
                  ahead
                </small>
              </span>
              <ArrowRight />
            </button>
            <button
              className="tt-arcade-start roam"
              data-testid="button-free-roam"
              onClick={() => onStart("free")}
            >
              <span className="tt-action-medallion">
                <Compass />
              </span>
              <span>
                <b>FREE ROAM</b>
                <small>Your city. Your pace. No shift timer.</small>
              </span>
              <ArrowRight />
            </button>
          </div>
          <nav className="tt-arcade-secondary" aria-label="Game options">
            <button
              data-testid="button-title-settings"
              onClick={() => setShowSettings(true)}
            >
              <Settings2 />
              <span>Settings</span>
            </button>
            <button data-testid="button-title-career" onClick={onCareer}>
              <Trophy />
              <span>Driver career</span>
            </button>
            <a href={bangkok ? "?world=chinatown" : "?world=bangkok"}>
              {bangkok ? "Original Chinatown" : "Explore Bangkok"}
              <ArrowRight size={14} />
            </a>
          </nav>
          <small className="tt-scene-credit">
            {bangkok ? (
              "Your ride begins on Yaowarat Road."
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
        </section>
        <aside
          className="tt-yaowarat-plaque"
          aria-label="Yaowarat Chinatown, Bangkok"
        >
          <RoofOrnament />
          <span lang="th">เยาวราช</span>
          <b>YAOWARAT</b>
          <strong>CHINATOWN</strong>
          <small>◆ BANGKOK ◆</small>
          <em>From golden hour to neon nights</em>
        </aside>
      </main>
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
                <X />
              </button>
            </div>
            {settings}
          </div>
        </Surface>
      )}
    </>
  );
}
