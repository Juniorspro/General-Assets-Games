/// <reference lib="webworker" />

import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import type { BBoxNorm, FaceSample, FaceWorkerResponse, WorkerRequest } from './types';

const MEDIAPIPE_VERSION = '0.10.17';
// Fallback URLs (used only when the main thread does not inject local paths via init msg)
const DEFAULT_WASM_ROOT = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const DEFAULT_FACE_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

let wasmRootOverride: string | null = null;
let modelAssetPathOverride: string | null = null;

// Key mouth landmark indices (MediaPipe Face Mesh 468-point)
const MOUTH_INDICES = [
  61,  // Left mouth corner
  291, // Right mouth corner
  0,   // Upper-lip top-center
  17,  // Lower-lip bottom-center
  13,  // Upper-lip inner
  14,  // Lower-lip inner
  78,  // Left inner mouth
  308, // Right inner mouth
];

let landmarker: FaceLandmarker | null = null;
let lastDetectLogAt = 0;

function post(msg: FaceWorkerResponse): void {
  (self as unknown as Worker).postMessage(msg);
}

async function ensureLandmarker(): Promise<FaceLandmarker> {
  if (landmarker) return landmarker;
  const vision = await FilesetResolver.forVisionTasks(wasmRootOverride ?? DEFAULT_WASM_ROOT);
  landmarker = await FaceLandmarker.createFromOptions(vision, {
    baseOptions: { modelAssetPath: modelAssetPathOverride ?? DEFAULT_FACE_MODEL_URL },
    runningMode: 'VIDEO',
    numFaces: 1,
    outputFaceBlendshapes: true,
    outputFacialTransformationMatrixes: false,
  });
  return landmarker;
}

function computeMouth(
  lm: Array<{ x?: number; y?: number; z?: number }>,
): { center: { x: number; y: number; z: number }; bounds: BBoxNorm } | null {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let sumX = 0, sumY = 0, sumZ = 0, count = 0;
  for (const i of MOUTH_INDICES) {
    const p = lm[i];
    if (!p || p.x == null || p.y == null) continue;
    const x = +p.x, y = +p.y, z = +(p.z ?? 0);
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
    sumX += x; sumY += y; sumZ += z; count++;
  }
  if (count < 4) return null;
  return {
    center: { x: sumX / count, y: sumY / count, z: sumZ / count },
    bounds: { min: { x: minX, y: minY }, max: { x: maxX, y: maxY } },
  };
}

function readJawOpen(
  blendshapes:
    | Array<{ categories?: Array<{ categoryName?: string; score?: number }> }>
    | undefined,
): number {
  const first = blendshapes?.[0]?.categories;
  if (!Array.isArray(first)) return 0;
  for (const cat of first) {
    if (cat.categoryName === 'jawOpen') return +(cat.score ?? 0);
  }
  return 0;
}

function toFaceSample(
  lm: Array<{ x?: number; y?: number; z?: number }> | undefined,
  jawOpen: number,
): FaceSample {
  if (!lm || lm.length < 50) {
    return { mouthCenterNorm: null, mouthBoundsNorm: null, jawOpen: 0, landmarksNorm: [] };
  }
  const landmarksNorm = lm.map((p) => ({
    x: +(p.x ?? 0), y: +(p.y ?? 0), z: +(p.z ?? 0),
  }));
  const mouth = computeMouth(lm);
  if (!mouth) return { mouthCenterNorm: null, mouthBoundsNorm: null, jawOpen, landmarksNorm };
  return {
    mouthCenterNorm: mouth.center,
    mouthBoundsNorm: mouth.bounds,
    jawOpen,
    landmarksNorm,
  };
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
        faceLandmarks?: Array<Array<{ x?: number; y?: number; z?: number }>>;
        faceBlendshapes?: Array<{ categories?: Array<{ categoryName?: string; score?: number }> }>;
      };
      const jawOpen = readJawOpen(result.faceBlendshapes);
      const faces = (result.faceLandmarks ?? []).map((face) => toFaceSample(face, jawOpen));
      // Report face-detection status every 3 s to diagnose "ready but no face detected"
      const now = Date.now();
      if (now - lastDetectLogAt > 3000) {
        lastDetectLogAt = now;
        console.log('[face-worker] detect', {
          faces: faces.length,
          lm: faces[0]?.landmarksNorm.length ?? 0,
          jawOpen: jawOpen.toFixed(2),
          bitmapWH: `${msg.bitmap.width}x${msg.bitmap.height}`,
        });
      }
      post({
        type: 'face-result',
        timestamp: msg.timestamp,
        imageWidth: msg.bitmap.width,
        imageHeight: msg.bitmap.height,
        faces,
      });
    } finally {
      msg.bitmap.close();
    }
  } catch (err) {
    post({ type: 'error', error: err instanceof Error ? err.message : String(err) });
  }
};
