type ACtor = typeof AudioContext;

class Sfx {
  private ctx: AudioContext | null = null;
  private gain: GainNode | null = null;
  private osc: OscillatorNode | null = null;
  private filt: BiquadFilterNode | null = null;
  private railGain:GainNode|null=null;
  private streetGain:GainNode|null=null;
  enabled = true;

  unlock() {
    try {
      if (!this.ctx) {
        const AC: ACtor | undefined = window.AudioContext || (window as unknown as { webkitAudioContext?: ACtor }).webkitAudioContext;
        if (!AC) return;
        const ctx = new AC();
        const osc = ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = 40;
        const sub = ctx.createOscillator(); sub.type = 'square'; sub.frequency.value = 20;
        const filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 300;
        const gain = ctx.createGain(); gain.gain.value = 0;
        osc.connect(filt); sub.connect(filt); filt.connect(gain); gain.connect(ctx.destination);
        osc.start(); sub.start();
        const rail=ctx.createOscillator();rail.type='sine';rail.frequency.value=94;const rg=ctx.createGain();rg.gain.value=0;rail.connect(rg);rg.connect(ctx.destination);rail.start();this.railGain=rg;
        this.ctx = ctx; this.osc = osc; this.filt = filt; this.gain = gain;
      }
      void this.ctx?.resume();
    } catch { /* audio is optional */ }
  }

  update(speed: number, gas: boolean, playing: boolean, boost = false,railLevel=0) {
    if (!this.ctx || !this.osc || !this.filt || !this.gain) return;
    const t = this.ctx.currentTime;
    this.railGain?.gain.setTargetAtTime(this.enabled&&playing?railLevel*.012:0,t,.3);
    const s = Math.min(1, Math.abs(speed) / 31);
    this.osc.frequency.setTargetAtTime(38 + s * 70 + (gas ? 10 : 0) + (boost ? 20 : 0), t, 0.08);
    this.filt.frequency.setTargetAtTime(300 + s * 700 + (boost ? 350 : 0), t, 0.1);
    this.gain.gain.setTargetAtTime(this.enabled && playing ? 0.05 + 0.04 * s + (gas ? 0.02 : 0) : 0, t, 0.1);
  }

  /** One reusable, localized cooking/fan bed. No source per pedestrian. */
  street(level:number,playing:boolean) {
    if(!this.ctx)return;
    const ctx=this.ctx;
    if(!this.streetGain&&level>0&&playing&&this.enabled){
      const buffer=ctx.createBuffer(1,ctx.sampleRate,ctx.sampleRate),data=buffer.getChannelData(0);let seed=6143;
      for(let i=0;i<data.length;i++){seed=(Math.imul(seed,1664525)+1013904223)|0;data[i]=((seed>>>0)/4294967296-.5)*.3;}
      const source=ctx.createBufferSource();source.buffer=buffer;source.loop=true;
      const filter=ctx.createBiquadFilter();filter.type='bandpass';filter.frequency.value=1800;filter.Q.value=.5;
      const gain=ctx.createGain();gain.gain.value=0;source.connect(filter);filter.connect(gain);gain.connect(ctx.destination);source.start();
      const fan=ctx.createOscillator();fan.type='sine';fan.frequency.value=76;const fg=ctx.createGain();fg.gain.value=.035;fan.connect(fg);fg.connect(gain);fan.start();this.streetGain=gain;
    }
    this.streetGain?.gain.setTargetAtTime(this.enabled&&playing?Math.min(1,Math.max(0,level))*.18:0,ctx.currentTime,.35);
  }

  horn() {
    if (!this.ctx || !this.enabled) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16, t + 0.02);
    g.gain.setValueAtTime(0.16, t + 0.16);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.34);
    g.connect(ctx.destination);
    [[523, 0], [415, 0.0]].forEach(([f]) => {
      const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = f;
      o.connect(g); o.start(t); o.stop(t + 0.36);
    });
  }
}

export const sfx = new Sfx();
