// ══════════════════════════════════════════════
// Tone.js lazy load — import('tone') only on first SFX call
// ══════════════════════════════════════════════

type ToneModule = typeof import('tone');
let _tone: ToneModule | null = null;
let _toneLoading: Promise<ToneModule> | null = null;

function loadTone(): Promise<ToneModule> {
  if (_tone) return Promise.resolve(_tone);
  if (!_toneLoading) {
    _toneLoading = import('tone').then((m) => { _tone = m; return m; });
  }
  return _toneLoading;
}

/** Synchronously get Tone; returns null if not yet loaded (triggers loading as a side effect). */
function T(): ToneModule | null {
  if (!_tone) {
    void loadTone();
  }
  return _tone;
}

// ══════════════════════════════════════════════
// Tone.js routing — sfxChannel / bgmChannel lazy init
// ══════════════════════════════════════════════

let _sfxChannel: any = null;
let _bgmChannel: any = null;

function getSfxChannel(t: ToneModule) {
  if (!_sfxChannel) _sfxChannel = new t.Channel({ volume: 0 }).toDestination();
  return _sfxChannel;
}

function getBgmChannel(t: ToneModule) {
  if (!_bgmChannel) _bgmChannel = new t.Channel({ volume: 0 }).toDestination();
  return _bgmChannel;
}

// ══════════════════════════════════════════════
// AudioContext compatibility
// ══════════════════════════════════════════════

export function getAudioCtx(): AudioContext | null {
  const t = T();
  if (!t) return null;
  return t.getContext().rawContext as AudioContext;
}

// ══════════════════════════════════════════════
// iOS audio-session bypass — keep the process in the MediaPlayback category so WebAudio
// (BGM + SFX) ignores the hardware mute switch (silent mode).
// ══════════════════════════════════════════════

// WebKit picks ONE process-wide audio-session category: pure WebAudio → AmbientSound (respects
// the mute switch → silent in silent mode); an *audible* HTMLMediaElement → MediaPlayback
// (ignores the mute switch). A muted / zero-volume element is treated as inaudible and does NOT
// raise the category — that is why the previous muted-<video> bridge was a no-op for SFX.
// Fix (howler.js / unmute-ios-audio pattern): loop an un-muted but genuinely-silent (all-zero
// PCM) <audio> element with volume>0 for the whole session — its silent samples emit nothing
// while holding the whole process (and thus the shared Tone.js AudioContext) at MediaPlayback.
// 0.1s mono 16-bit silence:
const IOS_SILENT_WAV_DATA_URI = 'data:audio/wav;base64,UklGRmQGAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YUAGAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

function isIOSAudioBypassTarget(): boolean {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';
  // platform is deprecated but still the most reliable signal for iPadOS-desktop-UA detection
  const plat = (navigator as { platform?: string }).platform ?? '';
  const touch = (navigator.maxTouchPoints ?? 0) > 1 || 'ontouchend' in window;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (plat === 'MacIntel' && touch);
  return isIOS && touch;
}

const _iosUnlockEnabled = isIOSAudioBypassTarget();
let _iosKeepAlive: HTMLAudioElement | null = null;
let _iosRearmBound = false;
let _iosStateBound = false;

function createIOSKeepAlive(): HTMLAudioElement {
  const el = document.createElement('audio');
  el.loop = true;
  el.preload = 'auto';
  el.setAttribute('playsinline', 'true');
  el.setAttribute('webkit-playsinline', 'true');
  el.setAttribute('x-webkit-airplay', 'deny'); // keep it out of AirPlay / Now-Playing routing
  try { (el as unknown as { disableRemotePlayback?: boolean }).disableRemotePlayback = true; } catch { /* not supported */ }
  // MUST stay un-muted with volume > 0 — a muted / zero-volume element is "inaudible" to WebKit and
  // will not raise the session to MediaPlayback. Set an explicit tiny-but->0 floor as defense in depth:
  // WebKit only treats an element as silent when volume()===0, so 0.01 still enters MediaPlayback; combined
  // with the all-zero PCM track, nothing is ever audible.
  el.volume = 0.01;
  el.src = IOS_SILENT_WAV_DATA_URI;
  return el; // intentionally NOT appended to the DOM (matches prior convention)
}

/** Lazily create and play the keep-alive; returns the underlying play() promise for prime/engage/rearm to reuse. */
function playIOSKeepAlive(): Promise<void> {
  if (!_iosKeepAlive) _iosKeepAlive = createIOSKeepAlive();
  return _iosKeepAlive.play();
}

/** Re-arm the keep-alive: a phone call / Siri interruption, backgrounding, or screen-off pauses the media and
 *  drops the MediaPlayback floor; replay to restore the bypass for subsequent SFX/BGM. Call play() unconditionally
 *  — it is a no-op on an already-playing element (does not reset progress), so it covers both the "paused" and the
 *  "not paused but stalled" post-interruption states (checking only .paused would miss the latter). */
function rearmIOSKeepAlive(): void {
  if (!_iosUnlockEnabled || !_iosKeepAlive) return;
  void _iosKeepAlive.play().catch(() => { /* needs a new user gesture */ });
}

function onIOSVisibilityChange(): void {
  if (!document.hidden) rearmIOSKeepAlive();
}

/** Bind interruption-recovery listeners: visibilitychange + focus (covers backgrounding / screen-off). Pure-audio
 *  interruptions (phone call / Siri) are covered by bindIOSStateListener via AudioContext statechange. Named handlers
 *  so they can be removed. */
function bindIOSRearmListeners(): void {
  if (!_iosUnlockEnabled || _iosRearmBound) return;
  _iosRearmBound = true;
  document.addEventListener('visibilitychange', onIOSVisibilityChange);
  window.addEventListener('focus', rearmIOSKeepAlive);
}

/** Hook the keep-alive re-arm onto the shared AudioContext's statechange (bound only once). Pure-audio interruptions
 *  such as a phone call / Siri go through the non-standard 'interrupted' state while the page stays in the foreground
 *  (no visibility/focus event fires), then return to 'running' when they end — this is the only reliable signal for
 *  recovering from this kind of interruption. */
function bindIOSStateListener(t: ToneModule): void {
  if (!_iosUnlockEnabled || _iosStateBound) return;
  const raw = t.getContext().rawContext as unknown as AudioContext;
  if (typeof raw?.addEventListener !== 'function') return;
  _iosStateBound = true;
  raw.addEventListener('statechange', () => {
    if (raw.state === 'running') rearmIOSKeepAlive();
  });
}

/** Best-effort proactive start (a pre-unlocked WKWebView may allow autoplay). An un-muted element is
 *  usually blocked outside a gesture, so the authoritative start happens in engageIOSKeepAlive(). */
function primeIOSKeepAlive(): void {
  if (!_iosUnlockEnabled) return;
  void playIOSKeepAlive().catch(() => { /* autoplay blocked before a gesture — engaged in the unlock gesture */ });
}

/** Engage inside a user gesture: an un-muted element is only allowed to start from a gesture. Once
 *  playing it holds the whole process at MediaPlayback for its lifetime. Returns the play() promise — on failure
 *  (e.g. the gesture is not a valid media activation) it rejects, so the caller keeps the gesture listeners and
 *  retries on the next gesture. */
function engageIOSKeepAlive(): Promise<void> {
  if (!_iosUnlockEnabled) return Promise.resolve();
  return playIOSKeepAlive();
}

// ══════════════════════════════════════════════
// AudioContext dual-unlock — WKWebView proactive resume + user-gesture fallback + iOS session bypass
// ══════════════════════════════════════════════

let _unlocked = false;
/** BGM that needs replay after unlock (player.start has no effect while suspended). */
let _pendingBgm: { url: string; opts?: { loop?: boolean; volume?: number } } | null = null;

export function ensureAudioReady(): void {
  if (_unlocked) return;
  _unlocked = true;

  bindIOSRearmListeners(); // re-arm the iOS keep-alive after interruptions / backgrounding

  // Layer 1: proactive unlock (WKWebView is pre-unlocked, resume directly) + iOS keep-alive prime
  void loadTone().then((t) => {
    const ctx = t.getContext() as unknown as AudioContext;
    bindIOSStateListener(t); // hook AudioContext statechange to recover after pure-audio interruptions (phone call / Siri)
    // Start the keep-alive first, then resume: let WebAudio resume while the process is already at MediaPlayback so it inherits that category.
    primeIOSKeepAlive();
    if (ctx.state === 'suspended') {
      void ctx.resume().then(() => {
        // If the proactive resume succeeded and there is a pending BGM, retry playing it immediately
        if (_pendingBgm) {
          void bgm.play(_pendingBgm.url, _pendingBgm.opts);
          _pendingBgm = null;
        }
      });
    }
  });

  // Layer 2: user-gesture fallback (browsers require a gesture before resume)
  const UNLOCK_EVENTS = ['touchstart', 'touchend', 'pointerdown', 'pointerup', 'click', 'keydown'] as const;
  const unlock = () => {
    // Start the unmuted keep-alive synchronously within the gesture: an unmuted element must be started from the user
    // gesture itself, and the async loadTone below would lose the user activation. Only remove the gesture listeners
    // after engage succeeds; on failure (e.g. keydown is not a valid media activation on iOS) keep the listeners and
    // retry on the next real gesture (do not use { once }, which would burn the single chance in one shot).
    void engageIOSKeepAlive()
      .then(() => { for (const ev of UNLOCK_EVENTS) document.removeEventListener(ev, unlock); })
      .catch(() => { /* keep listeners — retry on the next user gesture */ });
    void loadTone().then(async (t) => {
      const ctx = t.getContext();
      if (ctx.state === 'suspended') {
        await (ctx as unknown as AudioContext).resume();
      }
      // After resume, replay any BGM that was triggered while suspended
      if (_pendingBgm && (!_currentPlayer || _currentPlayer.state !== 'started')) {
        void bgm.play(_pendingBgm.url, _pendingBgm.opts);
        _pendingBgm = null;
      }
    });
  };
  for (const ev of UNLOCK_EVENTS) {
    document.addEventListener(ev, unlock, { passive: true });
  }
}

// ══════════════════════════════════════════════
// SFX — parameterized synthesis
// ══════════════════════════════════════════════

export interface SfxParams {
  freq: number;
  duration: number;
  wave?: OscillatorType;
  volume?: number;
  attack?: number;
  decay?: number;
  freqTo?: number;
  synth?: 'default' | 'fm' | 'am' | 'membrane' | 'noise';
  harmonicity?: number;
  modulationIndex?: number;
}

function disposeAfter(node: { dispose: () => void }, sec: number) {
  setTimeout(() => node.dispose(), (sec + 0.5) * 1000);
}

export function playSfx(p: SfxParams) {
  ensureAudioReady(); // also covers SFX-only scenes for iOS bypass priming
  const t = T();
  if (!t) return; // Tone not loaded yet — silently skip (first call triggers load, subsequent calls will play)
  try {
    const ch = getSfxChannel(t);
    const vol = t.gainToDb(p.volume ?? 0.3);
    const env = {
      attack: p.attack ?? 0.01,
      decay: p.decay ?? p.duration,
      sustain: 0,
      release: 0.01,
    };

    switch (p.synth ?? 'default') {
      case 'noise': {
        const s = new t.NoiseSynth({ volume: vol, envelope: env }).connect(ch);
        s.triggerAttackRelease(p.duration);
        disposeAfter(s, p.duration);
        return;
      }
      case 'membrane': {
        const s = new t.MembraneSynth({ volume: vol, pitchDecay: p.decay ?? 0.2 }).connect(ch);
        s.triggerAttackRelease(p.freq, p.duration);
        disposeAfter(s, p.duration);
        return;
      }
      case 'fm': {
        const s = new t.FMSynth({
          volume: vol,
          harmonicity: p.harmonicity ?? 3,
          modulationIndex: p.modulationIndex ?? 10,
          envelope: env,
        }).connect(ch);
        if (p.freqTo) s.frequency.rampTo(p.freqTo, p.duration);
        s.triggerAttackRelease(p.freq, p.duration);
        disposeAfter(s, p.duration);
        return;
      }
      case 'am': {
        const s = new t.AMSynth({
          volume: vol,
          harmonicity: p.harmonicity ?? 2,
          envelope: env,
        }).connect(ch);
        s.triggerAttackRelease(p.freq, p.duration);
        disposeAfter(s, p.duration);
        return;
      }
      default: {
        const s = new t.Synth({
          volume: vol,
          oscillator: { type: p.wave ?? 'square' },
          envelope: env,
        }).connect(ch);
        if (p.freqTo) s.frequency.rampTo(p.freqTo, p.duration);
        s.triggerAttackRelease(p.freq, p.duration);
        disposeAfter(s, p.duration);
      }
    }
  } catch {
    // Silent degradation
  }
}

// ══════════════════════════════════════════════
// BGM — Tone.Player wrapper
// ══════════════════════════════════════════════

const _playerCache = new Map<string, any>();
let _currentPlayer: any = null;
let _bgmStartTime = 0;
let _bgmPauseTime = 0;

export const bgm = {
  async play(url: string, opts?: { loop?: boolean; volume?: number }) {
    bgm.stop();
    _pendingBgm = { url, opts };
    ensureAudioReady();
    const t = await loadTone();
    const ctx = t.getContext() as unknown as AudioContext;
    const ch = getBgmChannel(t);
    let player = _playerCache.get(url);
    if (!player) {
      player = new t.Player({ url, loop: opts?.loop ?? true }).connect(ch);
      _playerCache.set(url, player);
    } else {
      player.loop = opts?.loop ?? true;
    }
    // Always await buffer readiness — cache hits must not fast-path into start() before decode,
    // otherwise a concurrent play() (e.g. unlock-triggered replay) would fire on an unloaded
    // Player and Tone's state-timeline would mark it 'started' without producing audio.
    await t.loaded();
    if (opts?.volume !== undefined) {
      player.volume.value = t.gainToDb(opts.volume);
    }
    // Only play if AudioContext is unlocked; otherwise wait for the unlock callback to replay
    if (ctx.state === 'running') {
      if (player.state === 'started') player.stop();
      player.start();
      _currentPlayer = player;
      _bgmStartTime = t.now();
      _bgmPauseTime = 0;
      _pendingBgm = null;
    }
  },

  stop() {
    if (_currentPlayer?.state === 'started') _currentPlayer.stop();
    _currentPlayer = null;
    _bgmStartTime = 0;
    _bgmPauseTime = 0;
  },

  pause() {
    const t = T();
    if (t && _currentPlayer?.state === 'started') {
      _bgmPauseTime = bgm.currentTime;
      getBgmChannel(t).mute = true;
    }
  },

  resume() {
    const t = T();
    if (t) {
      _bgmStartTime = t.now() - _bgmPauseTime;
      getBgmChannel(t).mute = false;
    }
  },

  setVolume(v: number) {
    const t = T();
    if (t) getBgmChannel(t).volume.value = t.gainToDb(v);
  },

  get playing(): boolean {
    const t = T();
    return !!(_currentPlayer?.state === 'started' && t && !getBgmChannel(t).mute);
  },

  get currentTime(): number {
    if (!bgm.playing) return _bgmPauseTime;
    const t = T();
    if (!t) return _bgmPauseTime;
    return t.now() - _bgmStartTime;
  },

  get duration(): number {
    return _currentPlayer?.buffer?.duration ?? 0;
  },

  togglePlay(force?: boolean): boolean {
    const next = force ?? !bgm.playing;
    if (next) bgm.resume(); else bgm.pause();
    return bgm.playing;
  },

  seek(time: number) {
    const t = T();
    if (!t || !_currentPlayer) return;
    const wasPlaying = bgm.playing;
    _currentPlayer.stop();
    _currentPlayer.start(0, time);
    _bgmStartTime = t.now() - time;
    _bgmPauseTime = time;
    if (!wasPlaying) {
      getBgmChannel(t).mute = true;
    }
  },
};

// ══════════════════════════════════════════════
// BGM Window API — the editor controls via window.toggleBgm/seekBgm/getMediaProgress
// ══════════════════════════════════════════════

function registerBgmWindowApi() {
  (window as any).toggleBgm = (force?: boolean) => bgm.togglePlay(force);
  (window as any).seekBgm = (time: number) => bgm.seek(time);
  (window as any).getMediaProgress = (id: string) => {
    const ms = (window as any).mediaState;
    if (ms?.[id]?.state === 'removed') return null;
    if (id === 'bgm') {
      return { playing: bgm.playing, currentTime: bgm.currentTime, duration: bgm.duration };
    }
    const el = document.getElementById(id) as HTMLMediaElement | null;
    if (!el || !('paused' in el)) return null;
    return { playing: !el.paused, currentTime: el.currentTime, duration: el.duration ?? 0 };
  };
}
registerBgmWindowApi();

// ══════════════════════════════════════════════
// Master panel — global mute + per-channel volume
// ══════════════════════════════════════════════

export const audio = {
  mute() { const t = T(); if (t) t.getDestination().mute = true; },
  unmute() { const t = T(); if (t) t.getDestination().mute = false; },

  setMasterVolume(v: number) {
    const t = T(); if (t) t.getDestination().volume.value = t.gainToDb(v);
  },
  setSfxVolume(v: number) {
    const t = T(); if (t) getSfxChannel(t).volume.value = t.gainToDb(v);
  },
  setBgmVolume(v: number) {
    const t = T(); if (t) getBgmChannel(t).volume.value = t.gainToDb(v);
  },

  get muted(): boolean {
    const t = T(); return t ? t.getDestination().mute : false;
  },
};

// ══════════════════════════════════════════════
// Backward compat — playTone / playSweep delegate to playSfx
// ══════════════════════════════════════════════

export function playTone(freq: number, duration: number, type: OscillatorType = 'square', volume = 0.3) {
  playSfx({ freq, duration, wave: type, volume });
}

export function playSweep(startFreq: number, endFreq: number, duration: number, type: OscillatorType = 'sine', volume = 0.3) {
  playSfx({ freq: startFreq, freqTo: endFreq, duration, wave: type, volume });
}

// ── Preset SFX library ──

export const sfx = {
  score: () => {
    playSfx({ freq: 880, duration: 0.1, wave: 'square', volume: 0.3 });
    setTimeout(() => playSfx({ freq: 1320, duration: 0.15, wave: 'square', volume: 0.3 }), 80);
  },
  hit: () => playSfx({ freq: 150, duration: 0.2, wave: 'sawtooth', volume: 0.4 }),
  jump: () => playSfx({ freq: 300, freqTo: 600, duration: 0.15, wave: 'sine', volume: 0.3 }),
  collect: () => {
    playSfx({ freq: 1200, duration: 0.08, wave: 'sine', volume: 0.25 });
    setTimeout(() => playSfx({ freq: 1600, duration: 0.1, wave: 'sine', volume: 0.25 }), 60);
  },
  click: () => playSfx({ freq: 800, duration: 0.05, wave: 'square', volume: 0.15 }),
  gameOver: () => {
    [400, 300, 200, 150].forEach((freq, i) => {
      setTimeout(() => playSfx({ freq, duration: 0.2, wave: 'sawtooth', volume: 0.4 }), i * 150);
    });
  },
  levelUp: () => {
    [523, 659, 784, 1047].forEach((freq, i) => {
      setTimeout(() => playSfx({ freq, duration: 0.15, wave: 'square', volume: 0.3 }), i * 100);
    });
  },
};

// ── SFX throttling ──

const _lastPlayed: Record<string, number> = {};

export function throttledSfx(name: keyof typeof sfx, minGapMs = 50) {
  const now = Date.now();
  if (now - (_lastPlayed[name] ?? 0) < minGapMs) return;
  _lastPlayed[name] = now;
  sfx[name]();
}
