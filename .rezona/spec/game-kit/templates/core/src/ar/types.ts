export interface Point2D { x: number; y: number }
export interface Point3D { x: number; y: number; z: number }
export interface BBoxNorm { min: Point2D; max: Point2D }

// ── Generic worker messages ────────────────────────────
export interface WorkerInitMsg {
  type: 'init';
  wasmRoot?: string;
  modelAssetPath?: string;
}
export interface WorkerProcessMsg { type: 'process'; bitmap: ImageBitmap; timestamp: number }
export interface WorkerReadyMsg { type: 'ready' }
export interface WorkerErrorMsg { type: 'error'; error: string }
export type WorkerRequest = WorkerInitMsg | WorkerProcessMsg;

// ── Hand worker protocol ──────────────────────────
export interface HandSample {
  indexTipNorm: Point3D | null;
  thumbTipNorm: Point3D | null;
  pinchCenterNorm: Point3D | null;
  pinchDistance: number;
  landmarksNorm: Point3D[]; // 21 hand landmarks
}
export interface HandResultMsg {
  type: 'hand-result';
  timestamp: number;
  imageWidth: number;
  imageHeight: number;
  hands: HandSample[];
}
export type HandWorkerResponse = WorkerReadyMsg | WorkerErrorMsg | HandResultMsg;

// ── Face worker protocol ──────────────────────────
export interface FaceSample {
  mouthCenterNorm: Point3D | null;
  mouthBoundsNorm: BBoxNorm | null;
  jawOpen: number; // 0..1 from blendshape
  landmarksNorm: Point3D[]; // 468 face landmarks
}
export interface FaceResultMsg {
  type: 'face-result';
  timestamp: number;
  imageWidth: number;
  imageHeight: number;
  faces: FaceSample[];
}
export type FaceWorkerResponse = WorkerReadyMsg | WorkerErrorMsg | FaceResultMsg;

// ── Unified vision state exposed to the main thread ──────────────────
export interface VisionHandState {
  indexTipNorm: Point3D | null;
  thumbTipNorm: Point3D | null;
  pinchCenterNorm: Point3D | null;
  pinch: number;
  velocityNorm: Point2D;
  landmarksNorm: Point3D[];
  updatedAt: number;
}

export interface VisionFaceState {
  mouthCenterNorm: Point3D | null;
  mouthBoundsNorm: BBoxNorm | null;
  jawOpen: number;
  isMouthOpen: boolean;
  landmarksNorm: Point3D[];
  updatedAt: number;
}

export type WorkerStatus = 'idle' | 'initializing' | 'ready' | 'error';

export interface VisionState {
  hand: VisionHandState;
  face: VisionFaceState;
  ready: boolean;
  error: string;
  fps: { hand: number; face: number };
  status: { hand: WorkerStatus; face: WorkerStatus };
}

export const EMPTY_HAND: VisionHandState = {
  indexTipNorm: null,
  thumbTipNorm: null,
  pinchCenterNorm: null,
  pinch: 0,
  velocityNorm: { x: 0, y: 0 },
  landmarksNorm: [],
  updatedAt: 0,
};

export const EMPTY_FACE: VisionFaceState = {
  mouthCenterNorm: null,
  mouthBoundsNorm: null,
  jawOpen: 0,
  isMouthOpen: false,
  landmarksNorm: [],
  updatedAt: 0,
};
