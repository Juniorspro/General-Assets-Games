// ══════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════

export type VibrateStyle = 'light' | 'medium' | 'heavy';

export type CameraFacingMode = 'user' | 'environment';

export interface CameraAttachOptions {
  mirrored?: boolean;
}

export interface CameraStartOptions {
  facingMode?: CameraFacingMode;
  width?: number;
  height?: number;
}

export interface CameraState {
  active: boolean;
  granted: boolean;
  facingMode: CameraFacingMode;
  width: number;
  height: number;
  error: string;
}

const DEFAULT_CAMERA_STATE: CameraState = {
  active: false,
  granted: false,
  facingMode: 'user',
  width: 0,
  height: 0,
  error: '',
};

// ══════════════════════════════════════════════
// Bridge transport — internal requestId → Promise routing
// ══════════════════════════════════════════════

interface BridgeResponse {
  requestId: string;
  action: string;
  code: number;
  data?: unknown;
}

const _pending = new Map<string, { resolve: (v: unknown) => void; timer: number }>();
let _rid = 0;

/** Generate a short requestId */
function nextId(): string { return `r${++_rid}_${Date.now().toString(36)}`; }

/** Check whether the WebKit bridge exists */
function hasBridge(): boolean {
  try {
    return !!(window as any).webkit?.messageHandlers?.rezonaBridge;
  } catch { return false; }
}

/** Unified bridge invocation — one function to rule all native actions */
function callNative(action: string, params?: Record<string, unknown>, timeoutMs = 3000): Promise<unknown> {
  return new Promise((resolve, reject) => {
    if (!hasBridge()) { reject(new Error('no bridge')); return; }
    const requestId = nextId();
    const timer = window.setTimeout(() => {
      _pending.delete(requestId);
      reject(new Error(`bridge timeout: ${action}`));
    }, timeoutMs);
    _pending.set(requestId, { resolve, timer });
    try {
      (window as any).webkit.messageHandlers.rezonaBridge.postMessage({
        action, requestId, version: '1.0', params: params ?? {},
      });
    } catch (e) {
      window.clearTimeout(timer);
      _pending.delete(requestId);
      reject(e);
    }
  });
}

// Global callback registration — native side calls this to return results
if (typeof window !== 'undefined') {
  ((window as any).RezonaBridge ??= {}).onNativeResponse = (resp: BridgeResponse) => {
    const entry = _pending.get(resp.requestId);
    if (!entry) return;
    window.clearTimeout(entry.timer);
    _pending.delete(resp.requestId);
    entry.resolve(resp.data);
  };
}

// ══════════════════════════════════════════════
// bridge — public namespace
// ══════════════════════════════════════════════

export const bridge = {
  /** Get the app username; returns empty string when the bridge is unavailable */
  async getUsername(): Promise<string> {
    try {
      const data = await callNative('getUsername') as { username?: string } | undefined;
      return data?.username ?? '';
    } catch { return ''; }
  },
};

// ══════════════════════════════════════════════
// vibrate — bridge preferred, Web Vibration fallback
// ══════════════════════════════════════════════

const VIBRATE_MS: Record<VibrateStyle, number> = { light: 10, medium: 30, heavy: 50 };

/** Haptic feedback — guaranteed not to throw */
export function vibrate(style: VibrateStyle = 'medium'): void {
  try {
    if (hasBridge()) {
      callNative('vibrate', { style }).catch(() => {});
      return;
    }
    navigator.vibrate?.(VIBRATE_MS[style]);
  } catch { /* silent */ }
}

// ══════════════════════════════════════════════
// motion — motion input (DeviceOrientation + iOS permission)
// ══════════════════════════════════════════════

let _motionListening = false;
let _alpha = 0, _beta = 0, _gamma = 0;

function clampRange(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

function onOrientation(e: DeviceOrientationEvent) {
  _alpha = e.alpha ?? 0;
  _beta  = e.beta  ?? 0;
  _gamma = e.gamma ?? 0;
}

export const motion = {
  /** Start motion listening (handles iOS permission automatically) */
  async start(): Promise<void> {
    if (_motionListening) return;
    // iOS 13+ requires requestPermission
    const DOE = DeviceOrientationEvent as any;
    if (typeof DOE.requestPermission === 'function') {
      const perm = await DOE.requestPermission();
      if (perm !== 'granted') return;
    }
    window.addEventListener('deviceorientation', onOrientation);
    _motionListening = true;
  },

  stop(): void {
    window.removeEventListener('deviceorientation', onOrientation);
    _motionListening = false;
    _alpha = _beta = _gamma = 0;
  },

  get listening(): boolean { return _motionListening; },

  /** gamma/beta normalized to -1..1 for direct use by the game */
  get tilt(): { x: number; y: number } {
    return {
      x: clampRange(_gamma / 45, -1, 1),
      y: clampRange(_beta / 45, -1, 1),
    };
  },

  get alpha(): number { return _alpha; },
  get beta():  number { return _beta; },
  get gamma(): number { return _gamma; },
};

// ══════════════════════════════════════════════
// mic — microphone input (getUserMedia + AnalyserNode)
// ══════════════════════════════════════════════

let _micListening = false;
let _micLevel = 0, _micFreq = 0;
let _micCtx: AudioContext | null = null;
let _micStream: MediaStream | null = null;
let _micRaf = 0;

export const mic = {
  /** Start microphone listening */
  async start(): Promise<void> {
    if (_micListening) return;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const ctx = new AudioContext();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);

    const timeBuf = new Float32Array(analyser.fftSize);
    const freqBuf = new Uint8Array(analyser.frequencyBinCount);

    _micCtx = ctx;
    _micStream = stream;
    _micListening = true;

    // rAF sampling loop
    const tick = () => {
      if (!_micListening) return;

      // RMS → 0..1
      analyser.getFloatTimeDomainData(timeBuf);
      let sum = 0;
      for (let i = 0; i < timeBuf.length; i++) sum += timeBuf[i] * timeBuf[i];
      _micLevel = Math.sqrt(sum / timeBuf.length);

      // Peak frequency
      analyser.getByteFrequencyData(freqBuf);
      let maxVal = 0, maxIdx = 0;
      for (let i = 0; i < freqBuf.length; i++) {
        if (freqBuf[i] > maxVal) { maxVal = freqBuf[i]; maxIdx = i; }
      }
      _micFreq = maxIdx * ctx.sampleRate / analyser.fftSize;

      _micRaf = requestAnimationFrame(tick);
    };
    _micRaf = requestAnimationFrame(tick);
  },

  stop(): void {
    _micListening = false;
    cancelAnimationFrame(_micRaf);
    _micStream?.getTracks().forEach(t => t.stop());
    _micCtx?.close().catch(() => {});
    _micStream = null;
    _micCtx = null;
    _micLevel = _micFreq = 0;
  },

  get listening(): boolean { return _micListening; },

  /** Volume RMS in 0..1 */
  get level(): number { return _micLevel; },

  /** Peak frequency in Hz */
  get freq(): number { return _micFreq; },
};

// ══════════════════════════════════════════════
// camera — camera input (unified wrapper over getUserMedia + preview mount)
// ══════════════════════════════════════════════

let _cameraStream: MediaStream | null = null;
let _cameraVideo: HTMLVideoElement | null = null;
let _attachedVideo: { element: HTMLVideoElement; mirrored: boolean } | null = null;
let _cameraState: CameraState = { ...DEFAULT_CAMERA_STATE };

function ensureCameraVideo(): HTMLVideoElement {
  if (_cameraVideo) return _cameraVideo;
  const video = document.createElement('video');
  video.autoplay = true;
  video.muted = true;
  video.playsInline = true;
  video.setAttribute('playsinline', 'true');
  video.style.display = 'none';
  _cameraVideo = video;
  return video;
}

async function bindVideoElement(
  element: HTMLVideoElement,
  stream: MediaStream | null,
  mirrored: boolean,
): Promise<void> {
  element.autoplay = true;
  element.muted = true;
  element.playsInline = true;
  element.setAttribute('playsinline', 'true');
  element.style.transform = mirrored ? 'scaleX(-1)' : 'none';
  element.srcObject = stream;
  if (!stream) {
    element.removeAttribute('src');
    return;
  }
  try {
    await element.play();
  } catch {
    // Camera permission is driven by host gesture; silently wait for an external play trigger
  }
}

async function syncAttachedVideo(): Promise<void> {
  if (!_attachedVideo) return;
  await bindVideoElement(
    _attachedVideo.element,
    _cameraStream,
    _attachedVideo.mirrored,
  );
}

function cameraErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error || 'camera unavailable');
}

export const camera = {
  async start(options: CameraStartOptions = {}): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) {
      _cameraState = {
        ...DEFAULT_CAMERA_STATE,
        error: 'getUserMedia is not supported in this browser',
      };
      throw new Error(_cameraState.error);
    }

    const facingMode: CameraFacingMode = options.facingMode ?? 'user';
    const constraints: MediaStreamConstraints = {
      video: {
        facingMode,
        width: options.width,
        height: options.height,
      },
      audio: false,
    };

    try {
      if (_cameraStream) {
        _cameraStream.getTracks().forEach((track) => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      const video = ensureCameraVideo();
      _cameraStream = stream;
      await bindVideoElement(video, stream, facingMode === 'user');
      await syncAttachedVideo();

      _cameraState = {
        active: true,
        granted: true,
        facingMode,
        width: video.videoWidth || 0,
        height: video.videoHeight || 0,
        error: '',
      };
    } catch (error) {
      _cameraState = {
        active: false,
        granted: false,
        facingMode,
        width: 0,
        height: 0,
        error: cameraErrorMessage(error),
      };
      throw error;
    }
  },

  stop(): void {
    _cameraStream?.getTracks().forEach((track) => track.stop());
    _cameraStream = null;
    if (_cameraVideo) {
      _cameraVideo.pause();
      _cameraVideo.srcObject = null;
    }
    if (_attachedVideo) {
      _attachedVideo.element.pause();
      _attachedVideo.element.srcObject = null;
    }
    _cameraState = { ...DEFAULT_CAMERA_STATE, facingMode: _cameraState.facingMode };
  },

  attach(element: HTMLVideoElement, options: CameraAttachOptions = {}): void {
    _attachedVideo = {
      element,
      mirrored: options.mirrored ?? _cameraState.facingMode === 'user',
    };
    void syncAttachedVideo();
  },

  detach(): void {
    if (_attachedVideo) {
      _attachedVideo.element.pause();
      _attachedVideo.element.srcObject = null;
    }
    _attachedVideo = null;
  },

  get active(): boolean { return _cameraState.active; },
  get granted(): boolean { return _cameraState.granted; },
  get facingMode(): CameraFacingMode { return _cameraState.facingMode; },
  get error(): string { return _cameraState.error; },
  get state(): CameraState { return { ..._cameraState }; },
  get video(): HTMLVideoElement | null { return _cameraVideo; },
};
