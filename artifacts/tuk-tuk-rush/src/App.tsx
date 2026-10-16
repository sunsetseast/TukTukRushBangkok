import type { CSSProperties } from "react";
import { usePreferences } from "./game/ui/preferences";
import { learn } from "./game/ui/Onboarding";
import bangkokLayout from "./game/bangkok/layout.json";
import { DriverCareer } from "./game/Career";
import { Inspection } from "./game/Inspection";
import {
  Component,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { WorldMap } from "./game/bangkok/WorldMap";
import { GameEngine } from "./game/engine";
import GameCanvas from "./game/Renderer";
import { Hud, type Frame } from "./game/Hud";
import { Controls } from "./game/Controls";
import { PauseMenu, Results, Settings, Title } from "./game/Menus";
import { sfx } from "./game/audio";

let engineSingleton: GameEngine | null = null;
function getEngine() {
  if (!engineSingleton)
    engineSingleton = new GameEngine({
      world:
        new URLSearchParams(window.location.search).get("world") === "chinatown"
          ? "chinatown"
          : "bangkok",
    });
  return engineSingleton;
}

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!c.getContext("webgl2");
  } catch {
    return false;
  }
}

function read(e: GameEngine): Frame {
  const m = e.model;
  return {
    snap: { ...m.snapshot },
    px: m.player.x,
    pz: m.player.z,
    ph: m.player.heading,
    hit: m.player.collision,
  };
}

function Fail({ msg }: { msg: string }) {
  return (
    <div className="tt-fail" data-testid="text-webgl-error">
      <h2>Can't start the 3D city</h2>
      <p>{msg}</p>
      <button className="tt-btn big" onClick={() => location.reload()}>
        Try again
      </button>
    </div>
  );
}

class Boundary extends Component<{ children: ReactNode }, { err: boolean }> {
  state = { err: false };
  static getDerivedStateFromError() {
    return { err: true };
  }
  render() {
    return this.state.err ? (
      <Fail msg="WebGL failed while drawing the scene. Close other tabs or restart Safari, then retry." />
    ) : (
      this.props.children
    );
  }
}

function App() {
  const engine = getEngine();
  const [gl] = useState(hasWebGL);
  const [frame, setFrame] = useState<Frame>(() => read(engine));
  const [careerOpen, setCareerOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const resumeAfterMap = useRef(false);
  const [prefs, updatePreferences] = usePreferences();
  const audio = prefs.audio;
  useEffect(() => engine.setQuality(prefs.quality), [engine, prefs.quality]);
  const root = useRef<HTMLDivElement>(null);
  const signature = useRef("");

  useEffect(() => {
    sfx.enabled = audio;
  }, [audio]);

  useEffect(() => {
    const id = setInterval(() => {
      const f = read(engine);
      if (f.snap.phase === "playing") setFrame(f);
      sfx.update(
        f.snap.speed / 3.6,
        engine.model.input.gas,
        f.snap.phase === "playing",
        f.snap.boostState === "active",
        engine.railSoundLevel,
      );
    }, 100);
    const unsub = engine.subscribe((s) => {
      const key = `${s.phase}:${s.quality}:${s.viewingLandmark ?? ""}`;
      if (key !== signature.current) {
        signature.current = key;
        setFrame(read(engine));
      }
    });
    return () => {
      clearInterval(id);
      unsub();
    };
  }, [engine]);

  useEffect(() => {
    const el = root.current;
    const stop = (e: Event) => {
      if (
        !(e.target as HTMLElement).closest?.(
          ".tt-world-map,.tt-card,.tt-title,.tt-inspection nav",
        )
      )
        e.preventDefault();
    };
    el?.addEventListener("touchmove", stop, { passive: false });
    el?.addEventListener("contextmenu", stop);
    document.addEventListener("gesturestart", stop);
    const mq = window.matchMedia("(orientation: portrait)");
    const onO = () => {
      if (mq.matches && engine.model.snapshot.phase === "playing") {
        engine.clearInput();
        engine.pause();
      }
    };
    mq.addEventListener("change", onO);
    return () => {
      el?.removeEventListener("touchmove", stop);
      el?.removeEventListener("contextmenu", stop);
      document.removeEventListener("gesturestart", stop);
      mq.removeEventListener("change", onO);
    };
  }, [engine, gl]);

  const start = useCallback(
    (m: "shift" | "free") => {
      sfx.unlock();
      engine.start(m);
      if (window.matchMedia("(orientation: portrait)").matches) engine.pause();
    },
    [engine],
  );
  const openMap = useCallback(() => {
    learn("map");
    resumeAfterMap.current = engine.model.snapshot.phase === "playing";
    engine.clearInput();
    engine.pause();
    setMapOpen(true);
  }, [engine]);
  const closeMap = useCallback(() => {
    setMapOpen(false);
    if (
      resumeAfterMap.current &&
      !document.hidden &&
      window.matchMedia("(orientation: landscape)").matches
    )
      engine.resume();
  }, [engine]);
  const settings = (
    <Settings
      audio={audio}
      onAudio={() => {
        sfx.unlock();
        updatePreferences({ audio: !audio });
      }}
      quality={frame.snap.quality}
      onQuality={(q) => {
        engine.setQuality(q);
        updatePreferences({ quality: q });
      }}
      prefs={prefs}
      onPreferences={updatePreferences}
    />
  );
  const s = frame.snap;
  const [cameraReturn, setCameraReturn] = useState(false),
    wasViewing = useRef(false);
  useEffect(() => {
    if (wasViewing.current && !s.viewingLandmark) {
      setCameraReturn(true);
      const t = setTimeout(() => setCameraReturn(false), 350);
      wasViewing.current = false;
      return () => clearTimeout(t);
    }
    wasViewing.current = !!s.viewingLandmark;
    return undefined;
  }, [s.viewingLandmark]);

  if (!gl)
    return (
      <div className="tt-root">
        <Fail msg="The 3D city needs WebGL 2, which this browser or device did not provide. Enable hardware acceleration or try a current browser." />
      </div>
    );

  return (
    <div
      className={`tt-root ${mapOpen || s.viewingLandmark || careerOpen ? "tt-map-open" : ""} ${s.phase === "title" || s.phase === "ended" ? "tt-entry" : ""} ${s.phase === "paused" && !s.viewingLandmark ? "tt-menu-open" : ""} ${prefs.motion === "reduced" ? "tt-reduced-motion" : ""} tt-controls-${prefs.controls}`}
      style={{ "--control-opacity": prefs.opacity } as CSSProperties}
      ref={root}
    >
      <Boundary>
        <GameCanvas
          engine={engine}
          quality={frame.snap.quality}
          mapOpen={mapOpen}
        />
      </Boundary>
      <div
        className={`tt-ui ${mapOpen || s.phase === "paused" ? "tt-overlay-active" : ""}`}
      >
        {(s.phase === "playing" || s.phase === "paused") && (
          <Hud
            d={engine.model.district}
            f={frame}
            shift={s.mode === "shift"}
            onMap={
              engine.model.district.worldId === "bangkok" ? openMap : undefined
            }
            active={s.phase === "playing" && !mapOpen}
            onPause={() => {
              engine.clearInput();
              engine.pause();
            }}
          />
        )}
        {s.viewingLandmark && (
          <Inspection key={s.viewingLandmark} engine={engine} />
        )}

        {s.phase === "playing" && !mapOpen && (
          <Controls engine={engine} onHorn={() => sfx.horn()} />
        )}
        {s.phase === "title" && !careerOpen && (
          <Title
            onCareer={() => setCareerOpen(true)}
            profile={engine.career.profile}
            onStart={start}
            settings={settings}
            bangkok={engine.model.district.worldId === "bangkok"}
          />
        )}
        {s.phase === "paused" &&
          !s.viewingLandmark &&
          !mapOpen &&
          !careerOpen && (
            <PauseMenu
              goals={s}
              onCareer={() => setCareerOpen(true)}
              onResume={() => engine.resume()}
              onRestart={() => engine.restart()}
              onRecover={() => {
                engine.recover();
                engine.resume();
              }}
              onMap={
                engine.model.district.worldId === "bangkok"
                  ? openMap
                  : undefined
              }
              onTitle={() => engine.returnToTitle()}
              settings={settings}
            />
          )}
        {s.phase === "ended" && !careerOpen && (
          <Results
            s={s}
            onCareer={() => setCareerOpen(true)}
            onAgain={() => start("shift")}
            onFree={() => start("free")}
          />
        )}
      </div>
      {careerOpen && (
        <DriverCareer
          store={engine.career}
          landmarkCount={bangkokLayout.landmarks.length}
          districtCount={bangkokLayout.districts.length}
          onClose={() => setCareerOpen(false)}
        />
      )}
      {cameraReturn && <div className="tt-camera-return" aria-hidden="true" />}
      {mapOpen && (
        <WorldMap d={engine.model.district} f={frame} onClose={closeMap} />
      )}
      <div className="tt-rotate" data-testid="hint-rotate">
        <div className="tt-phone" />
        <b>Turn your phone sideways</b>
        <span>หมุนจอเป็นแนวนอน</span>
      </div>
    </div>
  );
}

export default App;
