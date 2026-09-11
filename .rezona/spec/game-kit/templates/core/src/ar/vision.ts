import type {
  FaceWorkerResponse,
  HandWorkerResponse,
  Point2D,
  VisionState,
} from './types';
import { EMPTY_FACE, EMPTY_HAND } from './types';

// ⚠️ Must be a classic worker — MediaPipe's FilesetResolver depends on importScripts()
//    Module workers will throw "Module scripts don't support importScripts()"
//    rolldown-vite dev does not auto-bundle classic workers; we rely on vite.config's
//    classicWorkerPlugin to bundle them via esbuild in the dev middleware
function createHandWorker(): Worker {
  return new Worker(new URL('./hand_worker.ts', import.meta.url), { type: 'classic' });
}
function createFaceWorker(): Worker {
  return new Worker(new URL('./face_worker.ts', import.meta.url), { type: 'classic' });
}

// ── Global mutable singleton (ref-style read) ────────────────
export const visionState: VisionState = {
  hand: { ...EMPTY_HAND },
  face: { ...EMPTY_FACE },
  ready: false,
  error: '',
  fps: { hand: 0, face: 0 },
  status: { hand: 'idle', face: 'idle' },
};

// Tuning parameters
const MIRROR = true;                  // Front-camera mirror
const JAW_OPEN_ENTER = 0.30;          // Mouth-open enter threshold
const JAW_OPEN_EXIT  = 0.18;          // Mouth-open exit threshold (hysteresis)
const VELOCITY_SMOOTHING = 0.35;      // Hand-velocity smoothing coefficient (EMA)
const TARGET_INTERVAL_MS = 40;        // ≈25 fps main-thread dispatch throttle

interface Internals {
  video: HTMLVideoElement | null;
  stream: MediaStream | null;
  handWorker: Worker | null;
  faceWorker: Worker | null;
  handBusy: boolean;
  faceBusy: boolean;
  rafId: number;
  running: boolean;
  lastDispatch: number;
  lastHandRecv: number;
  lastFaceRecv: number;
  handFpsEma: number;
  faceFpsEma: number;
  prevIndexTip: { x: number; y: number } | null;
}

const state: Internals = {
  video: null,
  stream: null,
  handWorker: null,
  faceWorker: null,
  handBusy: false,
  faceBusy: false,
  rafId: 0,
  running: false,
  lastDispatch: 0,
  lastHandRecv: 0,
  lastFaceRecv: 0,
  handFpsEma: 0,
  faceFpsEma: 0,
  prevIndexTip: null,
};

// ══════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════

function mirrorX(x: number): number { return MIRROR ? 1 - x : x; }

function mirrorBounds(
  b: { min: Point2D; max: Point2D } | null,
): { min: Point2D; max: Point2D } | null {
  if (!b) return null;
  if (!MIRROR) return b;
  return { min: { x: 1 - b.max.x, y: b.min.y }, max: { x: 1 - b.min.x, y: b.max.y } };
}

function updateFpsEma(prev: number, dt: number): number {
  if (dt <= 0) return prev;
  const inst = 1000 / dt;
  return prev * 0.85 + inst * 0.15;
}

// ══════════════════════════════════════════════
// Worker message handling
// ══════════════════════════════════════════════

function onHandMessage(ev: MessageEvent<HandWorkerResponse>): void {
  const msg = ev.data;
  if (msg.type === 'ready') {
    visionState.status.hand = 'ready';
    console.log('[vision] hand worker ready');
    return;
  }
  if (msg.type === 'error') {
    visionState.status.hand = 'error';
    visionState.error = `hand: ${msg.error}`;
    console.error('[vision] hand error:', msg.error);
    state.handBusy = false;
    return;
  }

  state.handBusy = false;
  const now = performance.now();
  if (state.lastHandRecv > 0) {
    state.handFpsEma = updateFpsEma(state.handFpsEma, now - state.lastHandRecv);
    visionState.fps.hand = Math.round(state.handFpsEma);
  }
  state.lastHandRecv = now;

  const hand = msg.hands[0];
  if (!hand || !hand.indexTipNorm) {
    visionState.hand = { ...EMPTY_HAND, updatedAt: now };
    state.prevIndexTip = null;
    return;
  }

  const index = { x: mirrorX(hand.indexTipNorm.x), y: hand.indexTipNorm.y, z: hand.indexTipNorm.z };
  const thumb = hand.thumbTipNorm
    ? { x: mirrorX(hand.thumbTipNorm.x), y: hand.thumbTipNorm.y, z: hand.thumbTipNorm.z }
    : null;
  const center = hand.pinchCenterNorm
    ? { x: mirrorX(hand.pinchCenterNorm.x), y: hand.pinchCenterNorm.y, z: hand.pinchCenterNorm.z }
    : null;

  // Velocity: diff of normalized coords / fixed dispatch interval
  let velocity: Point2D = { x: 0, y: 0 };
  if (state.prevIndexTip) {
    const raw = { x: index.x - state.prevIndexTip.x, y: index.y - state.prevIndexTip.y };
    const prev = visionState.hand.velocityNorm;
    velocity = {
      x: prev.x * (1 - VELOCITY_SMOOTHING) + raw.x * VELOCITY_SMOOTHING * (1000 / 40),
      y: prev.y * (1 - VELOCITY_SMOOTHING) + raw.y * VELOCITY_SMOOTHING * (1000 / 40),
    };
  }
  state.prevIndexTip = { x: index.x, y: index.y };

  // pinchDistance → pinch ratio (0..1)
  const pinch = Math.max(0, Math.min(1, 1 - hand.pinchDistance / 0.15));

  const landmarksNorm = hand.landmarksNorm.map((p) => ({
    x: mirrorX(p.x), y: p.y, z: p.z,
  }));

  visionState.hand = {
    indexTipNorm: index,
    thumbTipNorm: thumb,
    pinchCenterNorm: center,
    pinch,
    velocityNorm: velocity,
    landmarksNorm,
    updatedAt: now,
  };
}

function onFaceMessage(ev: MessageEvent<FaceWorkerResponse>): void {
  const msg = ev.data;
  if (msg.type === 'ready') {
    visionState.status.face = 'ready';
    console.log('[vision] face worker ready');
    return;
  }
  if (msg.type === 'error') {
    visionState.status.face = 'error';
    visionState.error = `face: ${msg.error}`;
    console.error('[vision] face error:', msg.error);
    state.faceBusy = false;
    return;
  }

  state.faceBusy = false;
  const now = performance.now();
  if (state.lastFaceRecv > 0) {
    state.faceFpsEma = updateFpsEma(state.faceFpsEma, now - state.lastFaceRecv);
    visionState.fps.face = Math.round(state.faceFpsEma);
  }
  state.lastFaceRecv = now;

  const face = msg.faces[0];
  if (!face || !face.mouthCenterNorm) {
    visionState.face = { ...EMPTY_FACE, updatedAt: now };
    return;
  }

  const center = { x: mirrorX(face.mouthCenterNorm.x), y: face.mouthCenterNorm.y, z: face.mouthCenterNorm.z };
  const bounds = mirrorBounds(face.mouthBoundsNorm);

  // Hysteresis to stabilize the mouth-open boolean
  const prevOpen = visionState.face.isMouthOpen;
  const isMouthOpen = prevOpen
    ? face.jawOpen > JAW_OPEN_EXIT
    : face.jawOpen > JAW_OPEN_ENTER;

  const landmarksNorm = face.landmarksNorm.map((p) => ({
    x: mirrorX(p.x), y: p.y, z: p.z,
  }));

  visionState.face = {
    mouthCenterNorm: center,
    mouthBoundsNorm: bounds,
    jawOpen: face.jawOpen,
    isMouthOpen,
    landmarksNorm,
    updatedAt: now,
  };
}

// ══════════════════════════════════════════════
// Dispatch main loop
// ══════════════════════════════════════════════

async function dispatchLoop(): Promise<void> {
  if (!state.running) return;
  const video = state.video;
  const handWorker = state.handWorker;
  const faceWorker = state.faceWorker;

  if (!video || !handWorker || !faceWorker) {
    state.rafId = requestAnimationFrame(() => { void dispatchLoop(); });
    return;
  }

  const now = performance.now();
  const canDispatch =
    video.readyState >= 2 &&
    video.videoWidth > 0 &&
    now - state.lastDispatch >= TARGET_INTERVAL_MS &&
    (!state.handBusy || !state.faceBusy);

  if (canDispatch) {
    state.lastDispatch = now;
    try {
      // timestamp must be an integer (MediaPipe stores it as int64; floats may be dropped by Face)
      const ts = Math.floor(now);
      // Only dispatch frames to workers that are ready and idle (avoid backlog during init)
      if (!state.handBusy && visionState.status.hand === 'ready') {
        const bmp = await createImageBitmap(video);
        state.handBusy = true;
        handWorker.postMessage({ type: 'process', bitmap: bmp, timestamp: ts }, [bmp]);
      }
      if (!state.faceBusy && visionState.status.face === 'ready') {
        const bmp = await createImageBitmap(video);
        state.faceBusy = true;
        faceWorker.postMessage({ type: 'process', bitmap: bmp, timestamp: ts }, [bmp]);
      }
    } catch (err) {
      visionState.error = `dispatch: ${err instanceof Error ? err.message : String(err)}`;
      console.error('[vision] dispatch error:', err);
    }
  }

  state.rafId = requestAnimationFrame(() => { void dispatchLoop(); });
}

// ══════════════════════════════════════════════
// Public API
// ══════════════════════════════════════════════

export async function startVision(videoEl: HTMLVideoElement): Promise<void> {
  if (state.running) return;

  visionState.error = '';

  // 1. Camera
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
    audio: false,
  });
  videoEl.srcObject = stream;
  videoEl.muted = true;
  videoEl.playsInline = true;
  videoEl.setAttribute('playsinline', 'true');
  videoEl.autoplay = true;
  await videoEl.play().catch(() => { /* user-gesture fallback */ });

  state.video = videoEl;
  state.stream = stream;

  // 2. Dual workers (classic script + Vite URL resolve)
  const handWorker = createHandWorker();
  const faceWorker = createFaceWorker();

  handWorker.onmessage = onHandMessage;
  faceWorker.onmessage = onFaceMessage;
  handWorker.onerror = (e) => {
    visionState.status.hand = 'error';
    visionState.error = `hand-worker: ${e.message || 'unknown'}`;
    console.error('[vision] hand worker runtime error:', e);
  };
  faceWorker.onerror = (e) => {
    visionState.status.face = 'error';
    visionState.error = `face-worker: ${e.message || 'unknown'}`;
    console.error('[vision] face worker runtime error:', e);
  };

  visionState.status.hand = 'initializing';
  visionState.status.face = 'initializing';
  // Resolve local MediaPipe asset URLs against the current page so the templates work
  // offline (templates/*/public/mediapipe/ is copied into dist/ by Vite public-dir handling).
  // Falls back to CDN defaults inside the worker when these are omitted.
  const baseHref = typeof window !== 'undefined' && window.location ? window.location.href : '';
  const wasmRoot = baseHref ? new URL('mediapipe/wasm', baseHref).href : undefined;
  const handModelPath = baseHref
    ? new URL('mediapipe/models/hand_landmarker.task', baseHref).href
    : undefined;
  const faceModelPath = baseHref
    ? new URL('mediapipe/models/face_landmarker.task', baseHref).href
    : undefined;
  handWorker.postMessage({ type: 'init', wasmRoot, modelAssetPath: handModelPath });
  faceWorker.postMessage({ type: 'init', wasmRoot, modelAssetPath: faceModelPath });
  console.log('[vision] workers init dispatched, camera', stream.getVideoTracks()[0]?.getSettings());

  state.handWorker = handWorker;
  state.faceWorker = faceWorker;
  state.running = true;
  visionState.ready = true;

  // 3. Start the dispatch loop
  state.rafId = requestAnimationFrame(() => { void dispatchLoop(); });
}

export function stopVision(): void {
  state.running = false;
  cancelAnimationFrame(state.rafId);
  state.handWorker?.terminate();
  state.faceWorker?.terminate();
  state.handWorker = null;
  state.faceWorker = null;
  state.stream?.getTracks().forEach((t) => t.stop());
  state.stream = null;
  state.video = null;
  state.handBusy = state.faceBusy = false;
  state.prevIndexTip = null;
  visionState.hand = { ...EMPTY_HAND };
  visionState.face = { ...EMPTY_FACE };
  visionState.ready = false;
  visionState.fps = { hand: 0, face: 0 };
  visionState.status = { hand: 'idle', face: 'idle' };
}
