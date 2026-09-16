/// <reference lib="webworker" />

import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';

const MEDIAPIPE_VERSION = '0.10.17';
// Fallback URLs (used only when the main thread does not inject local paths via init msg)
const DEFAULT_WASM_ROOT = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const DEFAULT_HAND_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

let wasmRootOverride: string | null = null;
let modelAssetPathOverride: string | null = null;

const IDX_THUMB_TIP = 4;
const IDX_INDEX_TIP = 8;

interface Point3D {
  x: number;
  y: number;
  z: number;
}

interface HandSample {
  handedness: 'left' | 'right' | 'unknown';
  confidence: number;
  indexTipNorm: Point3D | null;
  thumbTipNorm: Point3D | null;
  pinchCenterNorm: Point3D | null;
  pinchDistance: number;
  landmarksNorm: Point3D[];
}

type WorkerRequest =
  | { type: 'init'; wasmRoot?: string; modelAssetPath?: string }
  | { type: 'process'; bitmap: ImageBitmap; timestamp: number };

type WorkerResponse =
  | { type: 'ready' }
  | { type: 'error'; error: string }
  | {
      type: 'hand-result';
      timestamp: number;
      imageWidth: number;
      imageHeight: number;
      hands: HandSample[];
    };

let landmarker: HandLandmarker | null = null;

function postMessageToMain(message: WorkerResponse): void {
  (self as unknown as Worker).postMessage(message);
}

async function ensureLandmarker(): Promise<HandLandmarker> {
  if (landmarker) return landmarker;
  const vision = await FilesetResolver.forVisionTasks(wasmRootOverride ?? DEFAULT_WASM_ROOT);
  landmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: modelAssetPathOverride ?? DEFAULT_HAND_MODEL_URL },
    runningMode: 'VIDEO',
    numHands: 2,
  });
  return landmarker;
}

function normalizeHandedness(
  handedness:
    | Array<{
        categoryName?: string;
        displayName?: string;
        score?: number;
      }>
    | undefined,
): { handedness: 'left' | 'right' | 'unknown'; confidence: number } {
  const top = handedness?.[0];
  const label = (top?.displayName || top?.categoryName || '').toLowerCase();
  return {
    handedness: label === 'left' || label === 'right' ? label : 'unknown',
    confidence: top?.score ?? 0,
  };
}

function toHandSample(
  landmarks:
    | Array<{
        x?: number;
        y?: number;
        z?: number;
      }>
    | undefined,
  handedness:
    | Array<{
        categoryName?: string;
        displayName?: string;
        score?: number;
      }>
    | undefined,
): HandSample {
  const normalizedHandedness = normalizeHandedness(handedness);
  if (!landmarks || landmarks.length === 0) {
    return {
      ...normalizedHandedness,
      indexTipNorm: null,
      thumbTipNorm: null,
      pinchCenterNorm: null,
      pinchDistance: 1,
      landmarksNorm: [],
    };
  }

  const normalized = landmarks.map((point) => ({
    x: +(point.x ?? 0),
    y: +(point.y ?? 0),
    z: +(point.z ?? 0),
  }));
  const index = normalized[IDX_INDEX_TIP] ?? null;
  const thumb = normalized[IDX_THUMB_TIP] ?? null;

  if (!index || !thumb) {
    return {
      ...normalizedHandedness,
      indexTipNorm: index,
      thumbTipNorm: thumb,
      pinchCenterNorm: null,
      pinchDistance: 1,
      landmarksNorm: normalized,
    };
  }

  const pinchCenterNorm = {
    x: (index.x + thumb.x) / 2,
    y: (index.y + thumb.y) / 2,
    z: (index.z + thumb.z) / 2,
  };
  const dx = index.x - thumb.x;
  const dy = index.y - thumb.y;
  const dz = index.z - thumb.z;

  return {
    ...normalizedHandedness,
    indexTipNorm: index,
    thumbTipNorm: thumb,
    pinchCenterNorm,
    pinchDistance: Math.sqrt(dx * dx + dy * dy + dz * dz),
    landmarksNorm: normalized,
  };
}

self.onmessage = async (event: MessageEvent<WorkerRequest>): Promise<void> => {
  const message = event.data;

  try {
    if (message.type === 'init') {
      if (message.wasmRoot) wasmRootOverride = message.wasmRoot;
      if (message.modelAssetPath) modelAssetPathOverride = message.modelAssetPath;
      await ensureLandmarker();
      postMessageToMain({ type: 'ready' });
      return;
    }

    if (message.type !== 'process') return;

    const currentLandmarker = await ensureLandmarker();
    try {
      const result = currentLandmarker.detectForVideo(message.bitmap, message.timestamp) as {
        landmarks?: Array<Array<{ x?: number; y?: number; z?: number }>>;
        handednesses?: Array<Array<{ categoryName?: string; displayName?: string; score?: number }>>;
      };
      postMessageToMain({
        type: 'hand-result',
        timestamp: message.timestamp,
        imageWidth: message.bitmap.width,
        imageHeight: message.bitmap.height,
        hands: (result.landmarks ?? []).map((landmarks, index) =>
          toHandSample(landmarks, result.handednesses?.[index]),
        ),
      });
    } finally {
      message.bitmap.close();
    }
  } catch (error) {
    postMessageToMain({
      type: 'error',
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
