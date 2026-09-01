/* Audio: dos pistas largas cargadas del bundle (radio y ambiente) y el resto
   sintetizado con WebAudio, que suena mejor que un mp3 corto repetido. */
export class Audio {
    constructor(assets) {
        this.assets = assets;
        this.ctx = null;
        this.buffers = {};
        this.music = null; this.ambience = null;
        this.tension = 0;
        this.muted = false;
    }
    /* El navegador exige un gesto del usuario antes de dejar sonar nada. */
    async unlock() {
        if (this.ctx) { if (this.ctx.state === 'suspended') await this.ctx.resume(); return }
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.9;
        this.master.connect(this.ctx.destination);

        this.musicGain = this.ctx.createGain(); this.musicGain.gain.value = 0; this.musicGain.connect(this.master);
        this.ambGain = this.ctx.createGain(); this.ambGain.gain.value = 0; this.ambGain.connect(this.master);
        this.sfxGain = this.ctx.createGain(); this.sfxGain.gain.value = 0.9; this.sfxGain.connect(this.master);

        // filtro sobre la radio: al mirar el celular suena normal, al chocar se apaga
        this.musicLP = this.ctx.createBiquadFilter();
        this.musicLP.type = 'lowpass'; this.musicLP.frequency.value = 18000;
        this.musicGain.disconnect(); this.musicGain.connect(this.musicLP); this.musicLP.connect(this.master);

        for (const [k, url] of Object.entries({ music: this.assets.music, amb: this.assets.ambience, crash: this.assets.crash })) {
            if (!url) continue;
            try {
                const buf = await (await fetch(url)).arrayBuffer();
                this.buffers[k] = await this.ctx.decodeAudioData(buf);
            } catch (e) { /* si un asset no esta, se sigue sin el */ }
        }
        this.startTension();
    }
    now() { return this.ctx ? this.ctx.currentTime : 0 }

    loop(key, gainNode, vol) {
        if (!this.ctx || !this.buffers[key]) return null;
        const s = this.ctx.createBufferSource();
        s.buffer = this.buffers[key];
        s.loop = true;
        s.connect(gainNode);
        s.start();
        gainNode.gain.cancelScheduledValues(this.now());
        gainNode.gain.setValueAtTime(gainNode.gain.value, this.now());
        gainNode.gain.linearRampToValueAtTime(vol, this.now() + 0.8);
        return s;
    }
    playMusic(vol = 0.5) {
        if (this.music || !this.ctx) return;
        this.music = this.loop('music', this.musicGain, vol);
        this.musicLP.frequency.setValueAtTime(18000, this.now());
    }
    duckMusic(vol, secs = 0.5) {
        if (!this.ctx) return;
        this.musicGain.gain.cancelScheduledValues(this.now());
        this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, this.now());
        this.musicGain.gain.linearRampToValueAtTime(vol, this.now() + secs);
        this.musicLP.frequency.linearRampToValueAtTime(vol < 0.2 ? 420 : 18000, this.now() + secs);
    }
    playAmbience(vol = 0.4) {
        if (!this.ctx) return;
        if (!this.ambience) this.ambience = this.loop('amb', this.ambGain, vol);
        else this.ambGain.gain.linearRampToValueAtTime(vol, this.now() + 1);
    }
    stopAll() {
        if (!this.ctx) return;
        this.musicGain.gain.linearRampToValueAtTime(0, this.now() + 0.4);
        this.ambGain.gain.linearRampToValueAtTime(0, this.now() + 0.4);
    }

    /* ---------- helpers de sintesis ---------- */
    noiseBuffer(secs) {
        const n = Math.floor(this.ctx.sampleRate * secs);
        const b = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
        const d = b.getChannelData(0);
        for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
        return b;
    }
    noise(secs, { type = 'bandpass', f0 = 900, f1 = 900, q = 1, gain = 0.5, attack = 0.01 } = {}) {
        if (!this.ctx) return;
        const t = this.now();
        const src = this.ctx.createBufferSource();
        src.buffer = this.noiseBuffer(secs);
        const flt = this.ctx.createBiquadFilter();
        flt.type = type; flt.Q.value = q;
        flt.frequency.setValueAtTime(f0, t);
        flt.frequency.exponentialRampToValueAtTime(Math.max(f1, 20), t + secs);
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(gain, t + attack);
        g.gain.exponentialRampToValueAtTime(0.0001, t + secs);
        src.connect(flt); flt.connect(g); g.connect(this.sfxGain);
        src.start(t); src.stop(t + secs + 0.05);
    }
    tone(f0, f1, secs, { type = 'sine', gain = 0.3, attack = 0.01, delay = 0 } = {}) {
        if (!this.ctx) return;
        const t = this.now() + delay;
        const o = this.ctx.createOscillator();
        o.type = type;
        o.frequency.setValueAtTime(f0, t);
        o.frequency.exponentialRampToValueAtTime(Math.max(f1, 20), t + secs);
        const g = this.ctx.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(gain, t + attack);
        g.gain.exponentialRampToValueAtTime(0.0001, t + secs);
        o.connect(g); g.connect(this.sfxGain);
        o.start(t); o.stop(t + secs + 0.05);
    }
    sample(key, gain = 1) {
        if (!this.ctx || !this.buffers[key]) return false;
        const s = this.ctx.createBufferSource();
        s.buffer = this.buffers[key];
        const g = this.ctx.createGain(); g.gain.value = gain;
        s.connect(g); g.connect(this.sfxGain);
        s.start();
        return true;
    }

    /* ---------- efectos del guion ---------- */
    screech() { this.noise(1.5, { type: 'bandpass', f0: 2400, f1: 1500, q: 7, gain: 0.5 }) }
    crash() {
        if (!this.sample('crash', 1)) {
            this.noise(0.9, { type: 'lowpass', f0: 1800, f1: 90, q: 1, gain: 0.9, attack: 0.002 });
            this.noise(1.4, { type: 'highpass', f0: 3200, f1: 5200, q: 1, gain: 0.35, attack: 0.004 });
            this.tone(120, 38, 1.1, { type: 'sawtooth', gain: 0.45 });
        }
    }
    stinger() {
        this.tone(70, 44, 2.2, { type: 'sawtooth', gain: 0.3 });
        this.tone(1400, 300, 0.5, { type: 'triangle', gain: 0.12 });
    }
    heartbeat(on) {
        if (!this.ctx) return;
        if (on && !this.hbTimer) {
            const beat = () => {
                this.tone(58, 30, 0.16, { type: 'sine', gain: 0.5 });
                this.tone(52, 28, 0.14, { type: 'sine', gain: 0.36, delay: 0.19 });
            };
            beat();
            this.hbTimer = setInterval(beat, 900);
        } else if (!on && this.hbTimer) { clearInterval(this.hbTimer); this.hbTimer = null }
    }
    creak() { this.noise(1.1, { type: 'bandpass', f0: 420, f1: 180, q: 12, gain: 0.22, attack: 0.25 }) }
    pickup() { this.tone(880, 1320, 0.18, { type: 'triangle', gain: 0.22 }); this.tone(1320, 1760, 0.2, { type: 'triangle', gain: 0.14, delay: 0.09 }) }
    doorOpen() { this.noise(1.3, { type: 'bandpass', f0: 300, f1: 140, q: 9, gain: 0.3, attack: 0.2 }) }
    scream() {
        this.tone(700, 260, 1.1, { type: 'sawtooth', gain: 0.32 });
        this.noise(1.0, { type: 'bandpass', f0: 1800, f1: 700, q: 3, gain: 0.28 });
    }
    step(run) { this.noise(0.09, { type: 'lowpass', f0: run ? 900 : 520, f1: 120, q: 1, gain: run ? 0.13 : 0.07, attack: 0.003 }) }

    /* Drone de tension: sube cuando la vieja esta cerca o persiguiendo. */
    startTension() {
        const o = this.ctx.createOscillator();
        o.type = 'sawtooth'; o.frequency.value = 46;
        const o2 = this.ctx.createOscillator();
        o2.type = 'sawtooth'; o2.frequency.value = 69.5;
        const f = this.ctx.createBiquadFilter();
        f.type = 'lowpass'; f.frequency.value = 220; f.Q.value = 3;
        this.tenGain = this.ctx.createGain(); this.tenGain.gain.value = 0;
        o.connect(f); o2.connect(f); f.connect(this.tenGain); this.tenGain.connect(this.master);
        o.start(); o2.start();
        this.tenFilter = f;
    }
    setTension(v) {
        if (!this.tenGain) return;
        this.tension += (v - this.tension) * 0.06;
        this.tenGain.gain.setTargetAtTime(this.tension * 0.16, this.now(), 0.25);
        this.tenFilter.frequency.setTargetAtTime(180 + this.tension * 520, this.now(), 0.3);
    }
    toggleMute() {
        this.muted = !this.muted;
        if (this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : 0.9, this.now(), 0.05);
        return this.muted;
    }
}
