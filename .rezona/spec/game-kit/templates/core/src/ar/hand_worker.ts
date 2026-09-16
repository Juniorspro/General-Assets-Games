/// <reference lib="webworker" />

import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import type { HandSample, HandWorkerResponse, WorkerRequest } from './types';

const MEDIAPIPE_VERSION = '0.10.17';
// Fallback URLs (used only when the main thread does not inject local paths via init msg)
const DEFAULT_WASM_ROOT = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const DEFAULT_HAND_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

let wasmRootOverride: string | null = null;
let modelAssetPathOverride: string | null = null;

// Landmark indices (MediaPipe HandLandmarker)
const IDX_THUMB_TIP = 4;
const IDX_INDEX_TIP = 8;

let landmarker: HandLandmarker | null = null;

function post(msg: HandWorkerResponse): void {
  (self as unknown as Worker).postMessage(msg);
}

async function ensureLandmarker(): Promise<HandLandmarker> {
  if (landmarker) return landmarker;
  const vision = await FilesetResolver.forVisionTasks(wasmRootOverride ?? DEFAULT_WASM_ROOT);
  landmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: modelAssetPathOverride ?? DEFAULT_HAND_MODEL_URL },
    runningMode: 'VIDEO',
    numHands: 1,
  });
  return landmarker;
}

function toHandSample(
  lm: Array<{ x?: number; y?: number; z?: number }> | undefined,
): HandSample {
  if (!lm || lm.length === 0) {
    return { indexTipNorm: null, thumbTipNorm: null, pinchCenterNorm: null, pinchDistance: 1, landmarksNorm: [] };
  }
  const landmarksNorm = lm.map((p) => ({
    x: +(p.x ?? 0), y: +(p.y ?? 0), z: +(p.z ?? 0),
  }));
  const indexTipNorm = landmarksNorm[IDX_INDEX_TIP] ?? null;
  const thumbTipNorm = landmarksNorm[IDX_THUMB_TIP] ?? null;
  const pinchCenter =
    indexTipNorm && thumbTipNorm
      ? {
          x: (indexTipNorm.x + thumbTipNorm.x) * 0.5,
          y: (indexTipNorm.y + thumbTipNorm.y) * 0.5,
          z: (indexTipNorm.z + thumbTipNorm.z) * 0.5,
        }
      : null;
  const dist =
    indexTipNorm && thumbTipNorm
      ? Math.hypot(indexTipNorm.x - thumbTipNorm.x, indexTipNorm.y - thumbTipNorm.y)
      : 1;
  return { indexTipNorm, thumbTipNorm, pinchCenterNorm: pinchCenter, pinchDistance: dist, landmarksNorm };
}

self.onmessage = async (e: MessageEvent<WorkerRequest>): Promise<void> => {
  const msg = e.data;
  try {
    if (msg.type === 'init') {
      if (msg.wasmRoot) wasmRootOverride = msg.wasmRoot;
      if (msg.modelAssetPath) modelAssetPathOverride = msg.modelAssetPath;
      await ensureLandmarker();
      post({ type: 'ready' });
      return;
    }
    if (msg.type !== 'process') return;

    const lm = await ensureLandmarker();
    try {
      const result = lm.detectForVideo(msg.bitmap, msg.timestamp) as unknown as {
        landmarks?: Array<Array<{ x?: number; y?: number; z?: number }>>;
      };
      const hands = (result.landmarks ?? []).map(toHandSample);
      post({
        type: 'hand-result',
        timestamp: msg.timestamp,
        imageWidth: msg.bitmap.width,
        imageHeight: msg.bitmap.height,
        hands,
      });
    } finally {
      msg.bitmap.close();
    }
  } catch (err) {
    post({ type: 'error', error: err instanceof Error ? err.message : String(err) });
  }
};
