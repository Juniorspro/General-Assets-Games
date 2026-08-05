import * as THREE from 'three';
import { WorldGen } from './worldgen.js';
import { buildSky } from './sky.js';
import { buildWorld } from './world.js';
import { Player } from './player.js';
import { loadAssets } from './models.js';
import { windUniform } from './trees.js';
import { AudioFX } from './audio.js';

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const world = new WorldGen(20260612, 240);
const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.1, world.half * 3);
scene.add(camera);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ---------------- loading ----------------
const loadBar = document.getElementById('load-bar');
const loadPct = document.getElementById('load-pct');
const manager = new THREE.LoadingManager();
manager.onProgress = (url, loaded, total) => {
  const p = Math.round((loaded / total) * 100);
  loadBar.style.width = p + '%';
  loadPct.textContent = `Cargando assets… ${p}%`;
};

const audio = new AudioFX();
let game = null;

async function boot() {
  const sky = buildSky(scene, world);
  const assets = await loadAssets(manager);
  loadBar.style.width = '100%';
  loadPct.textContent = 'Tejiendo los maizales…';
  // let the heavy procedural generation happen after a paint
  await new Promise(r => setTimeout(r, 60));

  const built = buildWorld(scene, world, assets);

  const player = new Player(camera, world, canvas);
  player.obstacles = built.obstacles;
  // spawn on the road just behind the broken-down car, facing up the road
  player.spawn(world.roadInfo(0, -4).centerX, -4, Math.PI);
  player.onFlashToggle = () => audio.click();

  game = { sky, built, player };

  document.getElementById('loading').classList.add('hidden');
  document.getElementById('title').classList.remove('hidden');
  startLoop();
  setTimeout(showIntroSubtitle, 1200);
}

// ---------------- intro / subtitles ----------------
const subtitle = document.getElementById('subtitle');
function say(text, dur = 4500) {
  subtitle.textContent = text;
  subtitle.style.opacity = '1';
  clearTimeout(say._t);
  say._t = setTimeout(() => { subtitle.style.opacity = '0'; }, dur);
}
const introLines = [
  'El motor murió. El silencio aquí es… distinto.',
  'Los postes zumban. Las luces parpadean entre el maíz.',
  'Hay alguien ahí, junto a la cerca. No se mueve.',
  'Sal del camino si te atreves. Busca una salida.',
];
let introIdx = 0;
function showIntroSubtitle() {
  if (!game || !game.player.locked) return;
  if (introIdx < introLines.length) {
    say(introLines[introIdx++], 5000);
    setTimeout(showIntroSubtitle, 6000);
  }
}

// ---------------- play button ----------------
document.getElementById('play-btn').addEventListener('click', () => {
  document.getElementById('title').classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');
  audio.start();
  game.player.requestLock();
  introIdx = 0;
  setTimeout(showIntroSubtitle, 800);
});

// ---------------- HUD ----------------
const batteryFill = document.querySelector('#battery > i');

// ---------------- loop ----------------
const clock = new THREE.Clock();
let lastStep = 0;
let looping = false;
const _pp = new THREE.Vector3();

function startLoop() {
  if (looping) return;
  looping = true;
  renderer.setAnimationLoop(tick);
}

// debug handle (also handy from the browser console)
window.__renderer = renderer;
window.__pause = () => renderer.setAnimationLoop(null);

function tick() {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  windUniform.value = t;

  const { player, built, sky } = game;
  const st = player.update(dt);
  built.update(dt, player.pos);
  sky.update(player.pos);

  // footsteps
  if (st.moving) {
    const step = Math.floor(player.bobPhase / Math.PI);
    if (step !== lastStep) { audio.footstep(st.sprint); lastStep = step; }
  }

  // lamp flicker + distance culling
  _pp.copy(player.pos);
  for (let i = 0; i < built.lamps.length; i++) {
    const lamp = built.lamps[i];
    const d2 = lamp.worldPos.distanceToSquared(_pp);
    const near = d2 < 90 * 90;
    lamp.light.visible = near;
    if (near) {
      const f = 0.55 + 0.45 * Math.sin(t * (3 + i) + i);
      const dip = (Math.sin(t * 13 + i * 7) > 0.93) ? 0.15 : 1.0; // occasional stutter
      lamp.light.intensity = lamp.base * f * dip;
      lamp.bulb.material.emissiveIntensity = 1.0 + f * 1.5 * dip;
    }
  }

  // HUD battery
  batteryFill.style.width = (player.battery * 100).toFixed(0) + '%';

  renderer.render(scene, camera);
}

boot();
