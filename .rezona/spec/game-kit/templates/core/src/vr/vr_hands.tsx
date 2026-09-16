import { RoundedBox, Text } from '@react-three/drei';
import * as THREE from 'three';

import type { VrGestureControls } from './vr';

type TrackedHand = VrGestureControls['state']['trackedHands'][number];

export type VrVirtualHandsFallbackPose = 'demo' | 'none';

export interface VrVirtualHandsProps {
  hands: VrGestureControls['state']['trackedHands'];
  boardDistance?: number;
  scale?: number;
  labelMode?: 'full' | 'short' | 'none';
  /**
   * When `hands` is empty, render a static demo pose so the scene never shows
   * an invisible component while MediaPipe is still warming up. Set to
   * `'none'` in shipping builds if you only want to render real tracked data.
   * Defaults to `'demo'` — safer default for screenshots / smoke tests.
   */
  fallbackPose?: VrVirtualHandsFallbackPose;
}

const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
] as const;

const HAND_JOINTS = [0, 1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15, 17, 18, 19] as const;
const HAND_FINGERTIPS = [4, 8, 12, 16, 20] as const;

// 21-landmark open-palm pose, normalized to MediaPipe's (x,y) in [0,1] with z=0.
// Used as a fallback while real hand tracking is still initializing so that
// VrVirtualHands always has something visible to render.
const DEMO_HAND_LANDMARKS: Array<{ x: number; y: number; z: number }> = [
  { x: 0.50, y: 0.82, z: 0.00 }, // 0  wrist
  { x: 0.40, y: 0.74, z: 0.00 }, // 1  thumb cmc
  { x: 0.33, y: 0.66, z: 0.00 }, // 2  thumb mcp
  { x: 0.29, y: 0.58, z: 0.00 }, // 3  thumb ip
  { x: 0.26, y: 0.51, z: 0.00 }, // 4  thumb tip
  { x: 0.42, y: 0.58, z: 0.00 }, // 5  index mcp
  { x: 0.40, y: 0.48, z: 0.00 }, // 6  index pip
  { x: 0.39, y: 0.40, z: 0.00 }, // 7  index dip
  { x: 0.38, y: 0.33, z: 0.00 }, // 8  index tip
  { x: 0.49, y: 0.56, z: 0.00 }, // 9  middle mcp
  { x: 0.49, y: 0.45, z: 0.00 }, // 10 middle pip
  { x: 0.49, y: 0.36, z: 0.00 }, // 11 middle dip
  { x: 0.49, y: 0.28, z: 0.00 }, // 12 middle tip
  { x: 0.55, y: 0.57, z: 0.00 }, // 13 ring mcp
  { x: 0.57, y: 0.47, z: 0.00 }, // 14 ring pip
  { x: 0.58, y: 0.39, z: 0.00 }, // 15 ring dip
  { x: 0.59, y: 0.31, z: 0.00 }, // 16 ring tip
  { x: 0.62, y: 0.60, z: 0.00 }, // 17 pinky mcp
  { x: 0.64, y: 0.52, z: 0.00 }, // 18 pinky pip
  { x: 0.66, y: 0.44, z: 0.00 }, // 19 pinky dip
  { x: 0.68, y: 0.37, z: 0.00 }, // 20 pinky tip
];

const DEMO_FALLBACK_HANDS: VrGestureControls['state']['trackedHands'] = [
  {
    handedness: 'right',
    confidence: 0.35,
    indexTipNorm: DEMO_HAND_LANDMARKS[8],
    thumbTipNorm: DEMO_HAND_LANDMARKS[4],
    pinchCenterNorm: {
      x: (DEMO_HAND_LANDMARKS[4].x + DEMO_HAND_LANDMARKS[8].x) / 2,
      y: (DEMO_HAND_LANDMARKS[4].y + DEMO_HAND_LANDMARKS[8].y) / 2,
      z: 0,
    },
    pinchDistance: 0.18,
    landmarksNorm: DEMO_HAND_LANDMARKS,
    updatedAt: 0,
  },
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function averagePoints(points: Array<[number, number, number]>): [number, number, number] {
  if (points.length === 0) return [0, 0, 0];
  const total = points.reduce<[number, number, number]>(
    (acc, point) => [acc[0] + point[0], acc[1] + point[1], acc[2] + point[2]],
    [0, 0, 0],
  );
  return [total[0] / points.length, total[1] / points.length, total[2] / points.length];
}

function subtractVec(a: [number, number, number], b: [number, number, number]): [number, number, number] {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function lengthVec(vector: [number, number, number]): number {
  return Math.sqrt((vector[0] ** 2) + (vector[1] ** 2) + (vector[2] ** 2));
}

function normalizeVec(vector: [number, number, number]): [number, number, number] {
  const length = lengthVec(vector);
  if (length <= 1e-5) return [0, 1, 0];
  return [vector[0] / length, vector[1] / length, vector[2] / length];
}

function crossVec(a: [number, number, number], b: [number, number, number]): [number, number, number] {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function midpointVec(a: [number, number, number], b: [number, number, number]): [number, number, number] {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2];
}

function projectTrackedHandPoint(
  point: { x: number; y: number; z: number },
  boardDistance: number,
  handedness: 'left' | 'right' | 'unknown',
  scale: number,
): [number, number, number] {
  const lateralBias = handedness === 'left' ? -0.42 : handedness === 'right' ? 0.42 : 0;
  return [
    ((point.x - 0.5) * 3.4 + lateralBias) * scale,
    (1.7 + (0.5 - point.y) * 2.2) * scale,
    (-(boardDistance - 1.1) + clamp(point.z * 1.8, -0.45, 0.45)) * scale,
  ];
}

function handPalette(handedness: TrackedHand['handedness']) {
  if (handedness === 'left') {
    return { accent: '#8fdcff', shell: '#17364a', fingertip: '#effbff' };
  }
  if (handedness === 'right') {
    return { accent: '#63ffc7', shell: '#123d2f', fingertip: '#f1fff8' };
  }
  return { accent: '#ffd78a', shell: '#4d3720', fingertip: '#fff6e8' };
}

function buildPalmQuaternion(
  wrist: [number, number, number],
  indexBase: [number, number, number],
  middleBase: [number, number, number],
  pinkyBase: [number, number, number],
) {
  const across = normalizeVec(subtractVec(pinkyBase, indexBase));
  const forwardSeed = normalizeVec(subtractVec(middleBase, wrist));
  const normal = normalizeVec(crossVec(across, forwardSeed));
  const forward = normalizeVec(crossVec(normal, across));
  const matrix = new THREE.Matrix4();
  matrix.makeBasis(
    new THREE.Vector3(across[0], across[1], across[2]),
    new THREE.Vector3(forward[0], forward[1], forward[2]),
    new THREE.Vector3(normal[0], normal[1], normal[2]),
  );
  return new THREE.Quaternion().setFromRotationMatrix(matrix);
}

function HandBone({
  start,
  end,
  radius,
  color,
  opacity = 0.96,
}: {
  start: [number, number, number];
  end: [number, number, number];
  radius: number;
  color: string;
  opacity?: number;
}) {
  const startVec = new THREE.Vector3(...start);
  const endVec = new THREE.Vector3(...end);
  const direction = endVec.clone().sub(startVec);
  const length = direction.length();
  if (length <= 1e-5) return null;

  const midpoint = startVec.clone().add(endVec).multiplyScalar(0.5);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.normalize(),
  );

  return (
    <group position={midpoint.toArray()} quaternion={quaternion}>
      <mesh castShadow receiveShadow>
        <capsuleGeometry args={[radius, Math.max(length - radius * 2, 0.001), 6, 12]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.42}
          metalness={0.45}
          roughness={0.24}
          transparent
          opacity={opacity}
        />
      </mesh>
    </group>
  );
}

function VrVirtualHand({
  hand,
  boardDistance,
  scale,
  labelMode,
}: {
  hand: TrackedHand;
  boardDistance: number;
  scale: number;
  labelMode: NonNullable<VrVirtualHandsProps['labelMode']>;
}) {
  const points = hand.landmarksNorm.map((point) =>
    projectTrackedHandPoint(point, boardDistance, hand.handedness, scale),
  );
  if (points.length < 21) return null;

  const palette = handPalette(hand.handedness);
  const palmCenter = averagePoints([points[0], points[5], points[9], points[13], points[17]]);
  const palmWidth = Math.max(0.18, lengthVec(subtractVec(points[17], points[5])) * 0.95);
  const palmHeight = Math.max(0.2, lengthVec(subtractVec(points[9], points[0])) * 1.15);
  const palmQuaternion = buildPalmQuaternion(points[0], points[5], points[9], points[17]);
  const wristAnchor = midpointVec(points[0], averagePoints([points[0], points[5], points[17]]));
  const label =
    labelMode === 'none'
      ? ''
      : hand.handedness === 'left'
        ? labelMode === 'short' ? 'L' : 'LEFT HAND'
        : hand.handedness === 'right'
          ? labelMode === 'short' ? 'R' : 'RIGHT HAND'
          : 'HAND';

  return (
    <group>
      <group position={palmCenter} quaternion={palmQuaternion}>
        <RoundedBox args={[palmWidth, palmHeight, 0.12]} radius={0.05} smoothness={4}>
          <meshStandardMaterial
            color={palette.shell}
            emissive={palette.accent}
            emissiveIntensity={0.22 + hand.confidence * 0.2}
            metalness={0.58}
            roughness={0.2}
            transparent
            opacity={0.94}
          />
        </RoundedBox>
        <mesh position={[0, palmHeight * 0.06, 0.055]}>
          <boxGeometry args={[palmWidth * 0.62, palmHeight * 0.18, 0.035]} />
          <meshStandardMaterial color={palette.accent} emissive={palette.accent} emissiveIntensity={0.54} metalness={0.72} roughness={0.18} />
        </mesh>
      </group>

      <group position={wristAnchor} quaternion={palmQuaternion}>
        <RoundedBox args={[palmWidth * 0.7, 0.12, 0.11]} radius={0.04} smoothness={4}>
          <meshStandardMaterial
            color="#0a1016"
            emissive={palette.accent}
            emissiveIntensity={0.18}
            metalness={0.82}
            roughness={0.32}
            transparent
            opacity={0.92}
          />
        </RoundedBox>
      </group>

      {HAND_CONNECTIONS.map(([from, to], connectionIndex) => {
        const isPalmBone = from === 0 || from === 5 || from === 9 || from === 13 || from === 17;
        return (
          <HandBone
            key={`${hand.handedness}-${connectionIndex}`}
            start={points[from]}
            end={points[to]}
            radius={isPalmBone ? 0.034 : 0.022}
            color={isPalmBone ? palette.accent : palette.shell}
            opacity={isPalmBone ? 0.96 : 0.98}
          />
        );
      })}

      {HAND_JOINTS.map((index) => (
        <mesh key={`${hand.handedness}-joint-${index}`} position={points[index]} castShadow>
          <sphereGeometry args={[index === 0 ? 0.042 : 0.028, 14, 14]} />
          <meshStandardMaterial
            color={index === 0 ? palette.accent : '#f0f8ff'}
            emissive={palette.accent}
            emissiveIntensity={index === 0 ? 0.58 : 0.26}
            metalness={0.4}
            roughness={0.22}
            transparent
            opacity={0.97}
          />
        </mesh>
      ))}

      {HAND_FINGERTIPS.map((index) => (
        <mesh key={`${hand.handedness}-tip-${index}`} position={points[index]} castShadow>
          <sphereGeometry args={[index === 8 ? 0.053 : 0.04, 16, 16]} />
          <meshStandardMaterial
            color={palette.fingertip}
            emissive={palette.accent}
            emissiveIntensity={0.95}
            metalness={0.18}
            roughness={0.12}
          />
        </mesh>
      ))}

      {labelMode !== 'none' ? (
        <Text position={[palmCenter[0], palmCenter[1] + 0.22, palmCenter[2]]} fontSize={labelMode === 'short' ? 0.09 : 0.075} color={palette.accent} anchorX="center">
          {label}
        </Text>
      ) : null}
    </group>
  );
}

export function VrVirtualHands({
  hands,
  boardDistance = 4.2,
  scale = 1,
  labelMode = 'full',
  fallbackPose = 'demo',
}: VrVirtualHandsProps) {
  const effectiveHands =
    hands.length > 0
      ? hands
      : fallbackPose === 'demo'
        ? DEMO_FALLBACK_HANDS
        : [];

  return (
    <>
      {effectiveHands.map((hand, handIndex) => (
        <VrVirtualHand
          key={`${hand.handedness}-${handIndex}`}
          hand={hand}
          boardDistance={boardDistance}
          scale={scale}
          labelMode={labelMode}
        />
      ))}
    </>
  );
}
