import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { GameEngine } from './game/engine';
import GameCanvas from './game/Renderer';
import { Hud, type Frame } from './game/Hud';
import { Controls } from './game/Controls';
import { PauseMenu, Results, Settings, Title } from './game/Menus';
import { sfx } from './game/audio';

let engineSingleton: GameEngine | null = null;
function getEngine() {
  if (!engineSingleton) engineSingleton = new GameEngine();
  return engineSingleton;
}

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2'));
  } catch { return false; }
}

function read(e: GameEngine): Frame {
  const m = e.model;
  return { snap: { ...m.snapshot }, px: m.player.x, pz: m.player.z, ph: m.player.heading, hit: m.player.collision };
}

function Fail({ msg }: { msg: string }) {
  return (
    <div className="tt-fail" data-testid="text-webgl-error">
      <h2>Can't start the 3D city</h2>
      <p>{msg}</p>
      <button className="tt-btn big" onClick={() => location.reload()}>Try again</button>
    </div>
  );
}

class Boundary extends Component<{ children: ReactNode }, { err: boolean }> {
  state = { err: false };
  static getDerivedStateFromError() { return { err: true }; }
  render() {
    return this.state.err ? <Fail msg="WebGL failed while drawing the scene. Close other tabs or restart Safari, then retry." /> : this.props.children;
  }
}

function App() {
  const engine = getEngine();
  const [gl] = useState(hasWebGL);
  const [frame, setFrame] = useState<Frame>(() => read(engine));
  const [audio, setAudio] = useState(true);
  const root = useRef<HTMLDivElement>(null);
  const phase = useRef(frame.snap.phase);

  useEffect(() => { sfx.enabled = audio; }, [audio]);

  useEffect(() => {
    const id = setInterval(() => {
      const f = read(engine);
      setFrame(f);
      sfx.update(f.snap.speed / 3.6, engine.model.input.gas, f.snap.phase === 'playing');
    }, 100);
    const unsub = engine.subscribe((s) => {
      if (s.phase !== phase.current) { phase.current = s.phase; setFrame(read(engine)); }
    });
    return () => { clearInterval(id); unsub(); };
  }, [engine]);

  useEffect(() => {
    const el = root.current;
    const stop = (e: Event) => e.preventDefault();
    el?.addEventListener('touchmove', stop, { passive: false });
    el?.addEventListener('contextmenu', stop);
    document.addEventListener('gesturestart', stop);
    const mq = window.matchMedia('(orientation: portrait)');
    const onO = () => { if (mq.matches && engine.model.snapshot.phase === 'playing') { engine.clearInput(); engine.pause(); } };
    mq.addEventListener('change', onO);
    return () => {
      el?.removeEventListener('touchmove', stop);
      el?.removeEventListener('contextmenu', stop);
      document.removeEventListener('gesturestart', stop);
      mq.removeEventListener('change', onO);
    };
  }, [engine, gl]);

  const start = useCallback((m: 'shift' | 'free') => { sfx.unlock(); engine.start(m); }, [engine]);
  const settings = (
    <Settings audio={audio} onAudio={() => { sfx.unlock(); setAudio((a) => !a); }} quality={frame.snap.quality} onQuality={(q) => engine.setQuality(q)} />
  );
  const s = frame.snap;

  if (!gl) return <div className="tt-root"><Fail msg="The 3D city needs WebGL 2, which this browser or device did not provide. Enable hardware acceleration or try a current browser." /></div>;

  return (
    <div className="tt-root" ref={root}>
      <Boundary><GameCanvas engine={engine} quality={frame.snap.quality} /></Boundary>
      <div className="tt-ui">
        {(s.phase === 'playing' || s.phase === 'paused') && (
          <Hud d={engine.model.district} f={frame} shift={s.mode === 'shift'} onPause={() => { engine.clearInput(); engine.pause(); }} />
        )}
        {s.phase === 'playing' && <Controls engine={engine} onHorn={() => sfx.horn()} />}
        {s.phase === 'title' && <Title onStart={start} settings={settings} />}
        {s.phase === 'paused' && (
          <PauseMenu onResume={() => engine.resume()} onRestart={() => engine.restart()} onRecover={() => { engine.recover(); engine.resume(); }} settings={settings} />
        )}
        {s.phase === 'ended' && <Results s={s} onAgain={() => engine.restart()} onFree={() => start('free')} />}
      </div>
      <div className="tt-rotate" data-testid="hint-rotate">
        <div className="tt-phone" />
        <b>Turn your phone sideways</b>
        <span>หมุนจอเป็นแนวนอน</span>
      </div>
    </div>
  );
}

export default App;
