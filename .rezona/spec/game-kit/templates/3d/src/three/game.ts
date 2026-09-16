// ══════════════════════════════════════════════
// three.js runtime entry point.
// React only mounts the canvas (src/App.tsx); this file owns the renderer,
// scene, render loop, resize handling, and dispose path.
// ══════════════════════════════════════════════

import * as THREE from 'three';
import { ensureAudioReady } from '../lib';
import type { GameRuntimeContext } from '../App';

export interface GameRuntimeHandle {
  dispose(): void;
}

export function startGame(canvas: HTMLCanvasElement, runtimeContext: GameRuntimeContext): GameRuntimeHandle {
  const { input, configRef, phaseRef } = runtimeContext;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(configRef.current.bgColor);

  const camera = new THREE.PerspectiveCamera(60, canvas.clientWidth / Math.max(canvas.clientHeight, 1), 0.1, 250);
  camera.position.set(0, 4, 9);
  camera.lookAt(0, 1, 0);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 1.1));
  const sun = new THREE.DirectionalLight(0xffffff, 1.4);
  sun.position.set(-6, 10, -4);
  scene.add(sun);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(24, 24),
    new THREE.MeshLambertMaterial({ color: 0x8899aa }),
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // SCAFFOLD-PLACEHOLDER-BEGIN: starter subject — replace with brief-specific content.
  const subject = new THREE.Mesh(
    new THREE.TorusKnotGeometry(0.8, 0.28, 128, 24),
    new THREE.MeshStandardMaterial({ color: 0x2f6df6, roughness: 0.35 }),
  );
  subject.position.y = 1.6;
  scene.add(subject);
  // SCAFFOLD-PLACEHOLDER-END

  const onResize = () => {
    const w = canvas.clientWidth;
    const h = Math.max(canvas.clientHeight, 1);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  window.addEventListener('resize', onResize);

  let lastTime = 0;
  renderer.setAnimationLoop((now: number) => {
    const dt = Math.min((now - (lastTime || now)) / 1000, 0.05);
    lastTime = now;

    if (input.consumeTap()) ensureAudioReady();

    if (phaseRef.current === 'ACTIVE') {
      subject.rotation.y += configRef.current.rotationRate * dt;
    }

    renderer.render(scene, camera);
  });

  return {
    dispose() {
      renderer.setAnimationLoop(null);
      window.removeEventListener('resize', onResize);
      ground.geometry.dispose();
      (ground.material as THREE.Material).dispose();
      subject.geometry.dispose();
      (subject.material as THREE.Material).dispose();
      renderer.dispose();
    },
  };
}
