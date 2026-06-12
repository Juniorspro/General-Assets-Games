// Lightweight synthesized atmosphere — no audio files needed.
export class AudioFX {
  constructor() { this.ctx = null; this.started = false; }

  start() {
    if (this.started) return;
    this.started = true;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    const ctx = this.ctx;

    // master
    this.master = ctx.createGain();
    this.master.gain.value = 0.6;
    this.master.connect(ctx.destination);

    // --- wind: filtered noise with a slow swelling LFO ---
    const noise = ctx.createBufferSource();
    const buf = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;     // brown-ish noise
      data[i] = last * 3.0;
    }
    noise.buffer = buf; noise.loop = true;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 480;
    const windGain = ctx.createGain(); windGain.gain.value = 0.12;
    noise.connect(lp); lp.connect(windGain); windGain.connect(this.master);
    noise.start();

    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.06;
    const lfoGain = ctx.createGain(); lfoGain.gain.value = 0.09;
    lfo.connect(lfoGain); lfoGain.connect(windGain.gain); lfo.start();

    // --- low ominous drone ---
    const drone = ctx.createOscillator(); drone.type = 'sine'; drone.frequency.value = 42;
    const dGain = ctx.createGain(); dGain.gain.value = 0.05;
    drone.connect(dGain); dGain.connect(this.master); drone.start();

    this.noiseBuf = buf;
  }

  _noiseBurst(dur, freq, q, gain) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.playbackRate.value = 0.6 + Math.random() * 0.4;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    src.connect(bp); bp.connect(g); g.connect(this.master);
    src.start(); src.stop(ctx.currentTime + dur);
  }

  footstep(sprint) {
    this._noiseBurst(sprint ? 0.16 : 0.22, 180 + Math.random() * 80, 1.2, sprint ? 0.35 : 0.22);
  }
  click() { this._noiseBurst(0.04, 2200, 3, 0.25); }
  setMaster(v) { if (this.master) this.master.gain.value = v; }
}
