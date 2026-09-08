import { useEffect, useRef, useState } from 'react';

import type { CameraFacingMode } from '../common/device';

export type ViewControlMode = 'gyro' | 'touch';
export type GyroPermissionState = 'idle' | 'granted' | 'denied' | 'unsupported';
export type SpatialUiMode = 'world_locked' | 'billboard' | 'head_locked';

export interface SpatialUiAnchor {
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  mode?: SpatialUiMode;
}

export interface PointerHandlers {
  onPointerDown?: (e: React.PointerEvent) => void;
  onPointerMove?: (e: React.PointerEvent) => void;
  onPointerUp?: (e: React.PointerEvent) => void;
  onPointerCancel?: (e: React.PointerEvent) => void;
}

export interface VrViewState {
  mode: ViewControlMode;
  permission: GyroPermissionState;
  gyroAvailable: boolean;
  yaw: number;
  pitch: number;
  roll: number;
  touching: boolean;
}

export interface VrViewControls {
  view: VrViewState;
  viewRef: React.MutableRefObject<VrViewState>;
  handlers: PointerHandlers;
  requestGyroPermission: () => Promise<boolean>;
  stopGyro: () => void;
}

export type VrGestureType =
  | 'tap'
  | 'double_tap'
  | 'long_press'
  | 'swipe_left'
  | 'swipe_right'
  | 'swipe_up'
  | 'swipe_down'
  | 'pinch_in'
  | 'pinch_out'
  | 'two_finger_tap';

export interface VrGestureEvent {
  type: VrGestureType;
  center: { x: number; y: number };
  delta: { x: number; y: number };
  scale: number;
  pointerCount: number;
  durationMs: number;
  velocity: number;
  source?: 'pointer' | 'camera';
}

export interface VrGestureState {
  activePointers: number;
  pinchScale: number;
  lastGesture: VrGestureEvent | null;
  cameraActive: boolean;
  cameraGranted: boolean;
  cameraReady: boolean;
  cameraError: string;
  lastSource: 'pointer' | 'camera' | null;
  trackedHands: Array<{
    handedness: 'left' | 'right' | 'unknown';
    confidence: number;
    indexTipNorm: Point3D | null;
    thumbTipNorm: Point3D | null;
    pinchCenterNorm: Point3D | null;
    pinchDistance: number;
    landmarksNorm: Point3D[];
    updatedAt: number;
  }>;
}

export interface VrGestureControls {
  handlers: PointerHandlers;
  state: VrGestureState;
  stateRef: React.MutableRefObject<VrGestureState>;
  consumeGesture: () => VrGestureEvent | null;
  peekGesture: () => VrGestureEvent | null;
  clearGesture: () => void;
}

interface UseVrViewControlsOptions {
  autoStart?: boolean;
  touchSensitivity?: number;
  pitchLimit?: number;
}

interface CameraGestureOptions {
  enabled?: boolean;
  autoStart?: boolean;
  facingMode?: CameraFacingMode;
  dispatchIntervalMs?: number;
  tapMaxDurationMs?: number;
  stationaryThreshold?: number;
  swipeMinDistance?: number;
  pinchEnterThreshold?: number;
  pinchExitThreshold?: number;
  pinchScaleThreshold?: number;
}

interface UseVrGesturesOptions {
  tapMaxDistance?: number;
  tapMaxDurationMs?: number;
  doubleTapGapMs?: number;
  longPressMs?: number;
  swipeMinDistance?: number;
  pinchThreshold?: number;
  camera?: false | CameraGestureOptions;
}

interface GesturePointer {
  x: number;
  y: number;
  startX: number;
  startY: number;
  startTime: number;
}

interface Point3D {
  x: number;
  y: number;
  z: number;
}

interface CameraGestureHandSample {
  handedness: 'left' | 'right' | 'unknown';
  confidence: number;
  indexTipNorm: Point3D | null;
  thumbTipNorm: Point3D | null;
  pinchCenterNorm: Point3D | null;
  pinchDistance: number;
  landmarksNorm: Point3D[];
}

type CameraGestureWorkerResponse =
  | { type: 'ready' }
  | { type: 'error'; error: string }
  | {
      type: 'hand-result';
      timestamp: number;
      imageWidth: number;
      imageHeight: number;
      hands: CameraGestureHandSample[];
    };

interface CameraGestureSession {
  running: boolean;
  busy: boolean;
  workerReady: boolean;
  worker: Worker | null;
  stream: MediaStream | null;
  video: HTMLVideoElement | null;
  rafId: number;
  lastDispatch: number;
  pinchActive: boolean;
  longPressEmitted: boolean;
  pinchStartTime: number;
  pinchStartPoint: Point3D | null;
  pinchLastPoint: Point3D | null;
  pinchStartDistance: number | null;
  pinchLastDistance: number | null;
}

const DEG_TO_RAD = Math.PI / 180;
const DEFAULT_VIEW_STATE: VrViewState = {
  mode: 'touch',
  permission: 'idle',
  gyroAvailable: false,
  yaw: 0,
  pitch: 0,
  roll: 0,
  touching: false,
};

const DEFAULT_GESTURE_STATE: VrGestureState = {
  activePointers: 0,
  pinchScale: 1,
  lastGesture: null,
  cameraActive: false,
  cameraGranted: false,
  cameraReady: false,
  cameraError: '',
  lastSource: null,
  trackedHands: [],
};

const DEFAULT_CAMERA_GESTURE_OPTIONS: Required<CameraGestureOptions> = {
  enabled: true,
  autoStart: true,
  facingMode: 'user',
  dispatchIntervalMs: 50,
  tapMaxDurationMs: 320,
  stationaryThreshold: 0.035,
  swipeMinDistance: 0.12,
  pinchEnterThreshold: 0.065,
  pinchExitThreshold: 0.09,
  pinchScaleThreshold: 0.18,
};

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

function normalizeAngle(angle: number): number {
  const full = Math.PI * 2;
  let normalized = angle;
  while (normalized > Math.PI) normalized -= full;
  while (normalized < -Math.PI) normalized += full;
  return normalized;
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function centerOf(points: Array<{ x: number; y: number }>): { x: number; y: number } {
  if (points.length === 0) return { x: 0, y: 0 };
  const total = points.reduce(
    (acc, point) => ({ x: acc.x + point.x, y: acc.y + point.y }),
    { x: 0, y: 0 },
  );
  return { x: total.x / points.length, y: total.y / points.length };
}

function centerOf3D(points: Point3D[]): Point3D {
  if (points.length === 0) return { x: 0, y: 0, z: 0 };
  const total = points.reduce(
    (acc, point) => ({
      x: acc.x + point.x,
      y: acc.y + point.y,
      z: acc.z + point.z,
    }),
    { x: 0, y: 0, z: 0 },
  );
  return {
    x: total.x / points.length,
    y: total.y / points.length,
    z: total.z / points.length,
  };
}

function distance3D(a: Point3D, b: Point3D): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function viewportPoint(point: { x: number; y: number }): { x: number; y: number } {
  if (typeof window === 'undefined') return point;
  return {
    x: point.x * window.innerWidth,
    y: point.y * window.innerHeight,
  };
}

function viewportDelta(delta: { x: number; y: number }): { x: number; y: number } {
  if (typeof window === 'undefined') return delta;
  return {
    x: delta.x * window.innerWidth,
    y: delta.y * window.innerHeight,
  };
}

function createHandGestureWorker(): Worker {
  return new Worker(new URL('./hand_gesture_worker.ts', import.meta.url), { type: 'classic' });
}

export function mergePointerHandlers(...handlerSets: Array<PointerHandlers | undefined>): PointerHandlers {
  return {
    onPointerDown: (e) => {
      handlerSets.forEach((set) => set?.onPointerDown?.(e));
    },
    onPointerMove: (e) => {
      handlerSets.forEach((set) => set?.onPointerMove?.(e));
    },
    onPointerUp: (e) => {
      handlerSets.forEach((set) => set?.onPointerUp?.(e));
    },
    onPointerCancel: (e) => {
      handlerSets.forEach((set) => set?.onPointerCancel?.(e));
    },
  };
}

export function useVrViewControls(options: UseVrViewControlsOptions = {}): VrViewControls {
  const { autoStart = true, touchSensitivity = 0.005, pitchLimit = 1.2 } = options;
  const [view, setView] = useState<VrViewState>(DEFAULT_VIEW_STATE);
  const viewRef = useRef<VrViewState>(view);
  const dragRef = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const listeningRef = useRef(false);

  const syncView = (updater: (prev: VrViewState) => VrViewState) => {
    setView((prev) => {
      const next = updater(prev);
      viewRef.current = next;
      return next;
    });
  };

  function onOrientation(e: DeviceOrientationEvent) {
    const alpha = (e.alpha ?? 0) * DEG_TO_RAD;
    const beta = clamp((e.beta ?? 0) * DEG_TO_RAD, -pitchLimit, pitchLimit);
    const gamma = clamp((e.gamma ?? 0) * DEG_TO_RAD, -Math.PI / 2, Math.PI / 2);
    syncView((prev) => ({
      ...prev,
      mode: 'gyro',
      permission: 'granted',
      gyroAvailable: true,
      yaw: normalizeAngle(-alpha),
      pitch: clamp(-beta, -pitchLimit, pitchLimit),
      roll: gamma,
    }));
  }

  const stopGyro = () => {
    if (!listeningRef.current) return;
    window.removeEventListener('deviceorientation', onOrientation);
    listeningRef.current = false;
    syncView((prev) => ({ ...prev, mode: 'touch' }));
  };

  const requestGyroPermission = async (): Promise<boolean> => {
    if (typeof window === 'undefined' || typeof window.DeviceOrientationEvent === 'undefined') {
      syncView((prev) => ({ ...prev, permission: 'unsupported', mode: 'touch', gyroAvailable: false }));
      return false;
    }

    const OrientationCtor = window.DeviceOrientationEvent as typeof DeviceOrientationEvent & {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };

    try {
      if (typeof OrientationCtor.requestPermission === 'function') {
        const permission = await OrientationCtor.requestPermission();
        if (permission !== 'granted') {
          syncView((prev) => ({ ...prev, permission: 'denied', mode: 'touch', gyroAvailable: false }));
          return false;
        }
      }
      if (!listeningRef.current) {
        window.addEventListener('deviceorientation', onOrientation);
        listeningRef.current = true;
      }
      syncView((prev) => ({ ...prev, permission: 'granted', gyroAvailable: true }));
      return true;
    } catch {
      syncView((prev) => ({ ...prev, permission: 'denied', mode: 'touch', gyroAvailable: false }));
      return false;
    }
  };

  useEffect(() => {
    if (!autoStart) return undefined;
    void requestGyroPermission();
    return () => stopGyro();
  }, [autoStart]);

  const handlers: PointerHandlers = {
    onPointerDown: (e) => {
      if (viewRef.current.mode !== 'touch' || !e.isPrimary) return;
      dragRef.current = { pointerId: e.pointerId, x: e.clientX, y: e.clientY };
      syncView((prev) => ({ ...prev, touching: true }));
    },
    onPointerMove: (e) => {
      const drag = dragRef.current;
      if (viewRef.current.mode !== 'touch' || !drag || drag.pointerId !== e.pointerId) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      dragRef.current = { pointerId: e.pointerId, x: e.clientX, y: e.clientY };
      syncView((prev) => ({
        ...prev,
        yaw: normalizeAngle(prev.yaw - dx * touchSensitivity),
        pitch: clamp(prev.pitch - dy * touchSensitivity, -pitchLimit, pitchLimit),
      }));
    },
    onPointerUp: (e) => {
      const drag = dragRef.current;
      if (drag && drag.pointerId === e.pointerId) {
        dragRef.current = null;
        syncView((prev) => ({ ...prev, touching: false }));
      }
    },
    onPointerCancel: (e) => {
      const drag = dragRef.current;
      if (drag && drag.pointerId === e.pointerId) {
        dragRef.current = null;
        syncView((prev) => ({ ...prev, touching: false }));
      }
    },
  };

  return { view, viewRef, handlers, requestGyroPermission, stopGyro };
}

export function useVrGestures(options: UseVrGesturesOptions = {}): VrGestureControls {
  const {
    tapMaxDistance = 18,
    tapMaxDurationMs = 240,
    doubleTapGapMs = 280,
    longPressMs = 420,
    swipeMinDistance = 36,
    pinchThreshold = 0.16,
    camera: cameraOverrides,
  } = options;
  const cameraOptions =
    cameraOverrides === false
      ? { ...DEFAULT_CAMERA_GESTURE_OPTIONS, enabled: false }
      : { ...DEFAULT_CAMERA_GESTURE_OPTIONS, ...cameraOverrides };

  const [state, setState] = useState<VrGestureState>(DEFAULT_GESTURE_STATE);
  const stateRef = useRef<VrGestureState>(state);
  const pointersRef = useRef<Map<number, GesturePointer>>(new Map());
  const queueRef = useRef<VrGestureEvent[]>([]);
  const longPressTimerRef = useRef<number | null>(null);
  const lastTapRef = useRef<number>(0);
  const pinchStartDistanceRef = useRef<number | null>(null);
  const pinchCenterRef = useRef<{ x: number; y: number } | null>(null);
  const gestureStartTimeRef = useRef<number>(0);
  const cameraSessionRef = useRef<CameraGestureSession>({
    running: false,
    busy: false,
    workerReady: false,
    worker: null,
    stream: null,
    video: null,
    rafId: 0,
    lastDispatch: 0,
    pinchActive: false,
    longPressEmitted: false,
    pinchStartTime: 0,
    pinchStartPoint: null,
    pinchLastPoint: null,
    pinchStartDistance: null,
    pinchLastDistance: null,
  });

  const syncState = (updater: (prev: VrGestureState) => VrGestureState) => {
    setState((prev) => {
      const next = updater(prev);
      stateRef.current = next;
      return next;
    });
  };

  const emitGesture = (event: VrGestureEvent) => {
    const next = { ...event, source: event.source ?? 'pointer' } satisfies VrGestureEvent;
    queueRef.current.push(next);
    syncState((prev) => ({
      ...prev,
      lastGesture: next,
      lastSource: next.source ?? null,
    }));
  };

  const syncCameraState = (
    partial: Partial<
      Pick<
        VrGestureState,
        'cameraActive' | 'cameraGranted' | 'cameraReady' | 'cameraError' | 'pinchScale'
      >
    >,
  ) => {
    syncState((prev) => ({ ...prev, ...partial }));
  };

  const clearLongPress = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const refreshPointerCount = () => {
    syncState((prev) => ({ ...prev, activePointers: pointersRef.current.size }));
  };

  useEffect(() => () => clearLongPress(), []);

  const resetCameraTracking = () => {
    const session = cameraSessionRef.current;
    session.pinchActive = false;
    session.longPressEmitted = false;
    session.pinchStartTime = 0;
    session.pinchStartPoint = null;
    session.pinchLastPoint = null;
    session.pinchStartDistance = null;
    session.pinchLastDistance = null;
    syncCameraState({ pinchScale: 1 });
  };

  const emitCameraTapLikeGesture = (
    point: Point3D,
    deltaNorm: { x: number; y: number },
    durationMs: number,
    velocity: number,
  ) => {
    const now = Date.now();
    const center = viewportPoint(point);
    if (now - lastTapRef.current <= doubleTapGapMs) {
      emitGesture({
        type: 'double_tap',
        center,
        delta: viewportDelta(deltaNorm),
        scale: 1,
        pointerCount: 1,
        durationMs,
        velocity,
        source: 'camera',
      });
      lastTapRef.current = 0;
      return;
    }

    emitGesture({
      type: 'tap',
      center,
      delta: viewportDelta(deltaNorm),
      scale: 1,
      pointerCount: 1,
      durationMs,
      velocity,
      source: 'camera',
    });
    lastTapRef.current = now;
  };

  const completeCameraGesture = (timestamp: number) => {
    const session = cameraSessionRef.current;
    if (!session.pinchActive || !session.pinchStartPoint || !session.pinchLastPoint) {
      resetCameraTracking();
      return;
    }

    const durationMs = timestamp - session.pinchStartTime;
    const start = session.pinchStartPoint;
    const end = session.pinchLastPoint;
    const deltaNorm = { x: end.x - start.x, y: end.y - start.y };
    const movement = distance3D(start, end);
    const velocity = movement / Math.max(durationMs, 1);
    const center = viewportPoint(centerOf3D([start, end]));
    const scaleBase = session.pinchStartDistance ?? session.pinchLastDistance ?? 1;
    const scaleCurrent = session.pinchLastDistance ?? scaleBase;
    const pinchScale = scaleBase > 0 ? scaleCurrent / scaleBase : 1;

    if (!session.longPressEmitted && durationMs <= cameraOptions.tapMaxDurationMs && movement <= cameraOptions.stationaryThreshold) {
      emitCameraTapLikeGesture(end, deltaNorm, durationMs, velocity);
    } else if (
      !session.longPressEmitted &&
      Math.abs(pinchScale - 1) >= cameraOptions.pinchScaleThreshold &&
      movement <= cameraOptions.stationaryThreshold
    ) {
      emitGesture({
        type: pinchScale > 1 ? 'pinch_out' : 'pinch_in',
        center,
        delta: viewportDelta(deltaNorm),
        scale: pinchScale,
        pointerCount: 1,
        durationMs,
        velocity,
        source: 'camera',
      });
    } else if (movement >= cameraOptions.swipeMinDistance) {
      const type: VrGestureType =
        Math.abs(deltaNorm.x) > Math.abs(deltaNorm.y)
          ? (deltaNorm.x > 0 ? 'swipe_right' : 'swipe_left')
          : (deltaNorm.y > 0 ? 'swipe_down' : 'swipe_up');
      emitGesture({
        type,
        center,
        delta: viewportDelta(deltaNorm),
        scale: pinchScale,
        pointerCount: 1,
        durationMs,
        velocity,
        source: 'camera',
      });
    }

    resetCameraTracking();
  };

  const handleCameraMessage = (message: CameraGestureWorkerResponse) => {
    const session = cameraSessionRef.current;

    if (message.type === 'ready') {
      session.workerReady = true;
      syncCameraState({ cameraReady: true, cameraError: '' });
      return;
    }

    if (message.type === 'error') {
      session.busy = false;
      syncCameraState({ cameraReady: false, cameraError: `camera gesture worker: ${message.error}` });
      syncState((prev) => ({ ...prev, trackedHands: [] }));
      return;
    }

    session.busy = false;
    const trackedHands = message.hands.map((trackedHand) => ({
      handedness: trackedHand.handedness,
      confidence: trackedHand.confidence,
      indexTipNorm: trackedHand.indexTipNorm
        ? { x: 1 - trackedHand.indexTipNorm.x, y: trackedHand.indexTipNorm.y, z: trackedHand.indexTipNorm.z }
        : null,
      thumbTipNorm: trackedHand.thumbTipNorm
        ? { x: 1 - trackedHand.thumbTipNorm.x, y: trackedHand.thumbTipNorm.y, z: trackedHand.thumbTipNorm.z }
        : null,
      pinchCenterNorm: trackedHand.pinchCenterNorm
        ? { x: 1 - trackedHand.pinchCenterNorm.x, y: trackedHand.pinchCenterNorm.y, z: trackedHand.pinchCenterNorm.z }
        : null,
      pinchDistance: trackedHand.pinchDistance,
      landmarksNorm: trackedHand.landmarksNorm.map((point) => ({
        x: 1 - point.x,
        y: point.y,
        z: point.z,
      })),
      updatedAt: message.timestamp,
    }));
    syncState((prev) => ({ ...prev, trackedHands }));

    const hand = message.hands[0];
    if (!hand || !hand.indexTipNorm) {
      if (session.pinchActive) completeCameraGesture(message.timestamp);
      return;
    }

    const point = hand.pinchCenterNorm ?? hand.indexTipNorm;
    const pinchDistance = hand.pinchDistance;

    if (!session.pinchActive && pinchDistance <= cameraOptions.pinchEnterThreshold) {
      session.pinchActive = true;
      session.longPressEmitted = false;
      session.pinchStartTime = message.timestamp;
      session.pinchStartPoint = point;
      session.pinchLastPoint = point;
      session.pinchStartDistance = Math.max(pinchDistance, 0.0001);
      session.pinchLastDistance = pinchDistance;
      syncCameraState({ pinchScale: 1 });
      return;
    }

    if (!session.pinchActive) return;

    session.pinchLastPoint = point;
    session.pinchLastDistance = pinchDistance;
    const pinchScale =
      session.pinchStartDistance && session.pinchStartDistance > 0
        ? pinchDistance / session.pinchStartDistance
        : 1;
    syncCameraState({ pinchScale });

    const start = session.pinchStartPoint ?? point;
    const durationMs = message.timestamp - session.pinchStartTime;
    const movement = distance3D(start, point);

    if (!session.longPressEmitted && durationMs >= longPressMs && movement <= cameraOptions.stationaryThreshold) {
      emitGesture({
        type: 'long_press',
        center: viewportPoint(point),
        delta: viewportDelta({ x: point.x - start.x, y: point.y - start.y }),
        scale: pinchScale,
        pointerCount: 1,
        durationMs,
        velocity: 0,
        source: 'camera',
      });
      session.longPressEmitted = true;
    }

    if (pinchDistance >= cameraOptions.pinchExitThreshold) {
      completeCameraGesture(message.timestamp);
    }
  };

  const stopCameraGestures = () => {
    const session = cameraSessionRef.current;
    session.running = false;
    session.busy = false;
    session.workerReady = false;
    if (typeof window !== 'undefined') {
      window.cancelAnimationFrame(session.rafId);
    }
    session.worker?.terminate();
    session.stream?.getTracks().forEach((track) => track.stop());
    session.video?.pause();
    if (session.video) session.video.srcObject = null;
    session.worker = null;
    session.stream = null;
    session.video = null;
    session.rafId = 0;
    session.lastDispatch = 0;
    resetCameraTracking();
    syncCameraState({
      cameraActive: false,
      cameraReady: false,
    });
    syncState((prev) => ({ ...prev, trackedHands: [] }));
  };

  const startCameraGestures = async (): Promise<void> => {
    if (!cameraOptions.enabled) return;
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
    if (!navigator.mediaDevices?.getUserMedia) {
      syncCameraState({
        cameraActive: false,
        cameraGranted: false,
        cameraReady: false,
        cameraError: 'camera gestures unavailable: getUserMedia is not supported',
      });
      return;
    }

    const session = cameraSessionRef.current;
    if (session.running) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: cameraOptions.facingMode,
          width: 960,
          height: 540,
        },
        audio: false,
      });
      const video = document.createElement('video');
      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;
      video.setAttribute('playsinline', 'true');
      video.srcObject = stream;
      await video.play().catch(() => {});

      const worker = createHandGestureWorker();
      worker.onmessage = (event: MessageEvent<CameraGestureWorkerResponse>) => {
        handleCameraMessage(event.data);
      };
      worker.onerror = (event) => {
        session.busy = false;
        syncCameraState({
          cameraReady: false,
          cameraError: `camera gesture worker: ${event.message || 'unknown error'}`,
        });
      };

      session.running = true;
      session.worker = worker;
      session.stream = stream;
      session.video = video;
      syncCameraState({
        cameraActive: true,
        cameraGranted: true,
        cameraReady: false,
        cameraError: '',
      });
      // Resolve local MediaPipe asset URLs against the current page so VR templates work
      // offline (templates/vr/public/mediapipe/ is copied into dist/ by Vite public-dir handling).
      // Worker falls back to CDN defaults when these are omitted.
      const baseHref =
        typeof window !== 'undefined' && window.location ? window.location.href : '';
      const wasmRoot = baseHref ? new URL('mediapipe/wasm', baseHref).href : undefined;
      const handModelPath = baseHref
        ? new URL('mediapipe/models/hand_landmarker.task', baseHref).href
        : undefined;
      worker.postMessage({ type: 'init', wasmRoot, modelAssetPath: handModelPath });

      const dispatchFrame = async () => {
        if (!session.running) return;

        const now = performance.now();
        if (
          session.video &&
          session.worker &&
          session.workerReady &&
          !session.busy &&
          session.video.readyState >= 2 &&
          session.video.videoWidth > 0 &&
          now - session.lastDispatch >= cameraOptions.dispatchIntervalMs
        ) {
          session.lastDispatch = now;
          try {
            const bitmap = await createImageBitmap(session.video);
            session.busy = true;
            session.worker.postMessage(
              {
                type: 'process',
                bitmap,
                timestamp: Math.floor(now),
              },
              [bitmap],
            );
          } catch (error) {
            session.busy = false;
            syncCameraState({
              cameraError: error instanceof Error ? error.message : String(error),
            });
          }
        }

        session.rafId = window.requestAnimationFrame(() => {
          void dispatchFrame();
        });
      };

      session.rafId = window.requestAnimationFrame(() => {
        void dispatchFrame();
      });
    } catch (error) {
      syncCameraState({
        cameraActive: false,
        cameraGranted: false,
        cameraReady: false,
        cameraError: error instanceof Error ? error.message : String(error),
      });
    }
  };

  useEffect(() => {
    if (!cameraOptions.enabled || !cameraOptions.autoStart) return undefined;
    void startCameraGestures();
    return () => stopCameraGestures();
  }, [cameraOptions.autoStart, cameraOptions.enabled, cameraOptions.facingMode]);

  const handlers: PointerHandlers = {
    onPointerDown: (e) => {
      const point: GesturePointer = {
        x: e.clientX,
        y: e.clientY,
        startX: e.clientX,
        startY: e.clientY,
        startTime: Date.now(),
      };
      pointersRef.current.set(e.pointerId, point);
      gestureStartTimeRef.current = point.startTime;
      refreshPointerCount();

      const points = Array.from(pointersRef.current.values());
      if (points.length === 1) {
        clearLongPress();
        longPressTimerRef.current = window.setTimeout(() => {
          const current = Array.from(pointersRef.current.values())[0];
          if (!current) return;
          const movement = distance(
            { x: current.startX, y: current.startY },
            { x: current.x, y: current.y },
          );
          if (movement <= tapMaxDistance) {
            emitGesture({
              type: 'long_press',
              center: { x: current.x, y: current.y },
              delta: { x: current.x - current.startX, y: current.y - current.startY },
              scale: 1,
              pointerCount: 1,
              durationMs: Date.now() - current.startTime,
              velocity: 0,
              source: 'pointer',
            });
          }
        }, longPressMs);
      } else if (points.length === 2) {
        clearLongPress();
        pinchStartDistanceRef.current = distance(points[0], points[1]);
        pinchCenterRef.current = centerOf(points);
        syncState((prev) => ({ ...prev, pinchScale: 1 }));
      }
    },
    onPointerMove: (e) => {
      const point = pointersRef.current.get(e.pointerId);
      if (!point) return;
      point.x = e.clientX;
      point.y = e.clientY;
      pointersRef.current.set(e.pointerId, point);

      if (pointersRef.current.size === 2 && pinchStartDistanceRef.current) {
        const points = Array.from(pointersRef.current.values());
        const scale = distance(points[0], points[1]) / pinchStartDistanceRef.current;
        syncState((prev) => ({ ...prev, pinchScale: scale }));
      }
    },
    onPointerUp: (e) => {
      const point = pointersRef.current.get(e.pointerId);
      if (!point) return;
      clearLongPress();

      const durationMs = Date.now() - point.startTime;
      const delta = { x: e.clientX - point.startX, y: e.clientY - point.startY };
      const moveDistance = Math.sqrt(delta.x * delta.x + delta.y * delta.y);
      const pointerCount = pointersRef.current.size;
      const remainingPoints = Array.from(pointersRef.current.entries())
        .filter(([id]) => id !== e.pointerId)
        .map(([, item]) => item);

      if (pointerCount === 1) {
        if (moveDistance <= tapMaxDistance && durationMs <= tapMaxDurationMs) {
          const now = Date.now();
          const center = { x: e.clientX, y: e.clientY };
          if (now - lastTapRef.current <= doubleTapGapMs) {
            emitGesture({
              type: 'double_tap',
              center,
              delta,
              scale: 1,
              pointerCount: 1,
              durationMs,
              velocity: moveDistance / Math.max(durationMs, 1),
              source: 'pointer',
            });
            lastTapRef.current = 0;
          } else {
            emitGesture({
              type: 'tap',
              center,
              delta,
              scale: 1,
              pointerCount: 1,
              durationMs,
              velocity: moveDistance / Math.max(durationMs, 1),
              source: 'pointer',
            });
            lastTapRef.current = now;
          }
        } else if (moveDistance >= swipeMinDistance) {
          const type: VrGestureType =
            Math.abs(delta.x) > Math.abs(delta.y)
              ? (delta.x > 0 ? 'swipe_right' : 'swipe_left')
              : (delta.y > 0 ? 'swipe_down' : 'swipe_up');
          emitGesture({
            type,
            center: { x: e.clientX, y: e.clientY },
            delta,
            scale: 1,
            pointerCount: 1,
            durationMs,
            velocity: moveDistance / Math.max(durationMs, 1),
            source: 'pointer',
          });
        }
      } else if (pointerCount === 2 && pinchStartDistanceRef.current) {
        const released = { x: e.clientX, y: e.clientY };
        const other = remainingPoints[0] ?? released;
        const scale = distance(released, other) / pinchStartDistanceRef.current;
        const center = pinchCenterRef.current ?? centerOf([released, other]);
        if (Math.abs(scale - 1) >= pinchThreshold) {
          emitGesture({
            type: scale > 1 ? 'pinch_out' : 'pinch_in',
            center,
            delta,
            scale,
            pointerCount: 2,
            durationMs: Date.now() - gestureStartTimeRef.current,
            velocity: Math.abs(scale - 1) / Math.max(durationMs, 1),
            source: 'pointer',
          });
        } else if (durationMs <= tapMaxDurationMs) {
          emitGesture({
            type: 'two_finger_tap',
            center,
            delta: { x: 0, y: 0 },
            scale: 1,
            pointerCount: 2,
            durationMs: Date.now() - gestureStartTimeRef.current,
            velocity: 0,
            source: 'pointer',
          });
        }
        pinchStartDistanceRef.current = null;
        pinchCenterRef.current = null;
        syncState((prev) => ({ ...prev, pinchScale: 1 }));
      }

      pointersRef.current.delete(e.pointerId);
      refreshPointerCount();
    },
    onPointerCancel: (e) => {
      clearLongPress();
      pointersRef.current.delete(e.pointerId);
      pinchStartDistanceRef.current = null;
      pinchCenterRef.current = null;
      syncState((prev) => ({
        ...prev,
        activePointers: pointersRef.current.size,
        pinchScale: 1,
      }));
    },
  };

  const consumeGesture = () => {
    const next = queueRef.current.shift() ?? null;
    if (!next && stateRef.current.lastGesture) {
      syncState((prev) => ({ ...prev, lastGesture: null, lastSource: null }));
    }
    return next;
  };

  const peekGesture = () => queueRef.current[0] ?? null;

  const clearGesture = () => {
    queueRef.current = [];
    syncState((prev) => ({ ...prev, lastGesture: null, lastSource: null }));
  };

  return { handlers, state, stateRef, consumeGesture, peekGesture, clearGesture };
}
