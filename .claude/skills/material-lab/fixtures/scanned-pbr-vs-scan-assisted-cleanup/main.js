import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import GUI from "lil-gui";

const canvas = document.getElementById("app");
const status = document.getElementById("status");

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  canvas,
});
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x090b0f);
scene.fog = new THREE.Fog(0x090b0f, 8.5, 20.5);

const camera = new THREE.PerspectiveCamera(
  34,
  window.innerWidth / window.innerHeight,
  0.1,
  100,
);
camera.position.set(0, 1.8, 9.6);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 1.05, 0);
controls.minDistance = 5.5;
controls.maxDistance = 14;
controls.maxPolarAngle = Math.PI * 0.55;

const pmremGenerator = new THREE.PMREMGenerator(renderer);
scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.05).texture;

const hemiLight = new THREE.HemisphereLight(0xd7e8ff, 0x261d16, 0.9);
scene.add(hemiLight);

const keyLight = new THREE.DirectionalLight(0xfff4ea, 2.3);
keyLight.position.set(4.5, 4.8, 3.9);
scene.add(keyLight);

const rakeLight = new THREE.DirectionalLight(0x9cbfe5, 0.9);
rakeLight.position.set(-3.8, 1.3, 5.6);
scene.add(rakeLight);

const warmBounce = new THREE.PointLight(0xffa573, 22, 18, 2);
warmBounce.position.set(0, 0.8, 4.6);
scene.add(warmBounce);

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(9.2, 96),
  new THREE.MeshStandardMaterial({
    color: 0x10141b,
    roughness: 0.98,
    metalness: 0.02,
  }),
);
floor.rotation.x = -Math.PI * 0.5;
floor.position.y = -0.68;
scene.add(floor);

const pedestalGeometry = new THREE.CylinderGeometry(1.15, 1.35, 0.34, 64, 1, false);
const heroGeometry = new THREE.SphereGeometry(1.08, 144, 144);

const textureSet = createScanTextureSet(renderer, 256);
const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

[
  textureSet.rawColor,
  textureSet.cleanColor,
  textureSet.rawRoughness,
  textureSet.cleanRoughness,
  textureSet.rawNormal,
  textureSet.cleanNormal,
].forEach((texture) => {
  texture.anisotropy = Math.min(maxAnisotropy, 8);
});

const params = {
  rotationSpeed: 0.22,
  exposure: 1.0,
  envIntensity: 1.15,
  rawNormalScale: 1.5,
  rawRoughnessBias: 1.0,
  cleanNormalScale: 0.7,
  cleanRoughnessBias: 1.0,
};

const rawMaterial = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  map: textureSet.rawColor,
  roughnessMap: textureSet.rawRoughness,
  normalMap: textureSet.rawNormal,
  roughness: params.rawRoughnessBias,
  metalness: 0.03,
  envMapIntensity: params.envIntensity,
});
rawMaterial.normalScale.setScalar(params.rawNormalScale);

const cleanMaterial = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  map: textureSet.cleanColor,
  roughnessMap: textureSet.cleanRoughness,
  normalMap: textureSet.cleanNormal,
  roughness: params.cleanRoughnessBias,
  metalness: 0.01,
  envMapIntensity: params.envIntensity,
});
cleanMaterial.normalScale.setScalar(params.cleanNormalScale);

const samples = [
  {
    title: "SCANNED PBR",
    subtitle: "raw scan-like inputs",
    x: -2.5,
    material: rawMaterial,
  },
  {
    title: "SCAN-ASSISTED CLEANUP",
    subtitle: "same route, corrected inputs",
    x: 2.5,
    material: cleanMaterial,
  },
];

const heroes = [];

for (const sample of samples) {
  const pedestal = new THREE.Mesh(
    pedestalGeometry,
    new THREE.MeshStandardMaterial({
      color: 0x171d27,
      roughness: 0.92,
      metalness: 0.06,
    }),
  );
  pedestal.position.set(sample.x, -0.48, 0);
  scene.add(pedestal);

  const hero = new THREE.Mesh(heroGeometry, sample.material);
  hero.position.set(sample.x, 1.02, 0);
  hero.rotation.y = Math.PI;
  scene.add(hero);
  heroes.push(hero);

  scene.add(makeLabel(sample.title, sample.subtitle, sample.x));
}

const gui = new GUI({ title: "Scan Fixture" });
const sceneFolder = gui.addFolder("Scene");
sceneFolder.add(params, "rotationSpeed", 0.0, 0.8, 0.01).name("rotation");
sceneFolder
  .add(params, "exposure", 0.6, 1.6, 0.01)
  .name("exposure")
  .onChange((value) => {
    renderer.toneMappingExposure = value;
  });
sceneFolder
  .add(params, "envIntensity", 0.2, 2.0, 0.01)
  .name("env intensity")
  .onChange((value) => {
    rawMaterial.envMapIntensity = value;
    cleanMaterial.envMapIntensity = value;
  });

const rawFolder = gui.addFolder("Scanned PBR");
rawFolder
  .add(params, "rawNormalScale", 0.0, 2.5, 0.01)
  .name("normal scale")
  .onChange((value) => {
    rawMaterial.normalScale.setScalar(value);
  });
rawFolder
  .add(params, "rawRoughnessBias", 0.3, 1.6, 0.01)
  .name("roughness bias")
  .onChange((value) => {
    rawMaterial.roughness = value;
  });

const cleanFolder = gui.addFolder("Cleanup");
cleanFolder
  .add(params, "cleanNormalScale", 0.0, 2.0, 0.01)
  .name("normal scale")
  .onChange((value) => {
    cleanMaterial.normalScale.setScalar(value);
  });
cleanFolder
  .add(params, "cleanRoughnessBias", 0.3, 1.6, 0.01)
  .name("roughness bias")
  .onChange((value) => {
    cleanMaterial.roughness = value;
  });

window.addEventListener("resize", onResize);
renderer.setAnimationLoop(render);

function render(time) {
  const seconds = time * 0.001;

  heroes[0].rotation.y = Math.PI + seconds * params.rotationSpeed;
  heroes[1].rotation.y = Math.PI + seconds * params.rotationSpeed;
  heroes[0].rotation.z = Math.sin(seconds * 0.55) * 0.03;
  heroes[1].rotation.z = Math.sin(seconds * 0.55 + 0.2) * 0.02;

  controls.update();
  renderer.render(scene, camera);
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function createScanTextureSet(rendererInstance, size) {
  const rawColorCanvas = document.createElement("canvas");
  const cleanColorCanvas = document.createElement("canvas");
  const rawRoughnessCanvas = document.createElement("canvas");
  const cleanRoughnessCanvas = document.createElement("canvas");

  rawColorCanvas.width = cleanColorCanvas.width = size;
  rawColorCanvas.height = cleanColorCanvas.height = size;
  rawRoughnessCanvas.width = cleanRoughnessCanvas.width = size;
  rawRoughnessCanvas.height = cleanRoughnessCanvas.height = size;

  const rawColorContext = rawColorCanvas.getContext("2d");
  const cleanColorContext = cleanColorCanvas.getContext("2d");
  const rawRoughnessContext = rawRoughnessCanvas.getContext("2d");
  const cleanRoughnessContext = cleanRoughnessCanvas.getContext("2d");

  const rawColorImage = rawColorContext.createImageData(size, size);
  const cleanColorImage = cleanColorContext.createImageData(size, size);
  const rawRoughnessImage = rawRoughnessContext.createImageData(size, size);
  const cleanRoughnessImage = cleanRoughnessContext.createImageData(size, size);

  const rawHeight = new Float32Array(size * size);
  const cleanHeight = new Float32Array(size * size);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const u = x / (size - 1);
      const v = y / (size - 1);
      const idx = y * size + x;
      const pixel = idx * 4;

      const base = fbm(u * 3.2, v * 3.2, 1.7);
      const micro = fbm(u * 18.0 + 6.0, v * 18.0 - 3.0, 3.1);
      const stain = smoothstep(0.56, 0.88, fbm(u * 2.5 - 1.4, v * 2.5 + 3.2, 4.7));
      const band = 0.5 + 0.5 * Math.sin(u * 15.0 + v * 4.6 + base * 3.8);
      const contamination = smoothstep(0.52, 0.9, fbm(u * 1.9 + 4.5, v * 1.9 - 2.4, 7.9));

      const rawMix = clamp(base * 0.72 + band * 0.28, 0, 1);
      const cleanMix = clamp(base * 0.82 + band * 0.18, 0, 1);

      const rawBase = mixColor([124, 91, 71], [187, 141, 106], rawMix);
      const cleanBase = mixColor([133, 100, 79], [195, 151, 116], cleanMix);

      const rawTint = contamination * 0.18;
      const cleanedTint = contamination * 0.05;

      const rawColor = [
        rawBase[0] * (1.0 - stain * 0.34) + 18 * rawTint,
        rawBase[1] * (1.0 - stain * 0.23) + 26 * rawTint,
        rawBase[2] * (1.0 - stain * 0.18) + 22 * rawTint,
      ];

      const cleanedColor = [
        cleanBase[0] * (1.0 - stain * 0.12) + 6 * cleanedTint,
        cleanBase[1] * (1.0 - stain * 0.08) + 8 * cleanedTint,
        cleanBase[2] * (1.0 - stain * 0.05) + 6 * cleanedTint,
      ];

      rawColorImage.data[pixel + 0] = clampByte(rawColor[0]);
      rawColorImage.data[pixel + 1] = clampByte(rawColor[1]);
      rawColorImage.data[pixel + 2] = clampByte(rawColor[2]);
      rawColorImage.data[pixel + 3] = 255;

      cleanColorImage.data[pixel + 0] = clampByte(cleanedColor[0]);
      cleanColorImage.data[pixel + 1] = clampByte(cleanedColor[1]);
      cleanColorImage.data[pixel + 2] = clampByte(cleanedColor[2]);
      cleanColorImage.data[pixel + 3] = 255;

      const rawRoughness = clamp(0.22 + base * 0.24 + stain * 0.3 + micro * 0.22, 0.04, 0.98);
      const cleanRoughness = clamp(0.39 + base * 0.12 + stain * 0.08 + fbm(u * 8.0, v * 8.0, 5.3) * 0.05, 0.14, 0.84);

      const rawRoughnessByte = clampByte(rawRoughness * 255);
      const cleanRoughnessByte = clampByte(cleanRoughness * 255);

      rawRoughnessImage.data[pixel + 0] = rawRoughnessByte;
      rawRoughnessImage.data[pixel + 1] = rawRoughnessByte;
      rawRoughnessImage.data[pixel + 2] = rawRoughnessByte;
      rawRoughnessImage.data[pixel + 3] = 255;

      cleanRoughnessImage.data[pixel + 0] = cleanRoughnessByte;
      cleanRoughnessImage.data[pixel + 1] = cleanRoughnessByte;
      cleanRoughnessImage.data[pixel + 2] = cleanRoughnessByte;
      cleanRoughnessImage.data[pixel + 3] = 255;

      rawHeight[idx] = base * 0.54 + micro * 0.32 + stain * 0.25;
      cleanHeight[idx] = base * 0.36 + fbm(u * 8.5 + 1.2, v * 8.5 - 0.8, 6.1) * 0.11 + stain * 0.08;
    }
  }

  rawColorContext.putImageData(rawColorImage, 0, 0);
  cleanColorContext.putImageData(cleanColorImage, 0, 0);
  rawRoughnessContext.putImageData(rawRoughnessImage, 0, 0);
  cleanRoughnessContext.putImageData(cleanRoughnessImage, 0, 0);

  const rawColor = new THREE.CanvasTexture(rawColorCanvas);
  rawColor.colorSpace = THREE.SRGBColorSpace;
  rawColor.wrapS = THREE.ClampToEdgeWrapping;
  rawColor.wrapT = THREE.ClampToEdgeWrapping;
  rawColor.needsUpdate = true;

  const cleanColor = new THREE.CanvasTexture(cleanColorCanvas);
  cleanColor.colorSpace = THREE.SRGBColorSpace;
  cleanColor.wrapS = THREE.ClampToEdgeWrapping;
  cleanColor.wrapT = THREE.ClampToEdgeWrapping;
  cleanColor.needsUpdate = true;

  const rawRoughnessMap = new THREE.CanvasTexture(rawRoughnessCanvas);
  rawRoughnessMap.colorSpace = THREE.NoColorSpace;
  rawRoughnessMap.wrapS = THREE.ClampToEdgeWrapping;
  rawRoughnessMap.wrapT = THREE.ClampToEdgeWrapping;
  rawRoughnessMap.needsUpdate = true;

  const cleanRoughnessMap = new THREE.CanvasTexture(cleanRoughnessCanvas);
  cleanRoughnessMap.colorSpace = THREE.NoColorSpace;
  cleanRoughnessMap.wrapS = THREE.ClampToEdgeWrapping;
  cleanRoughnessMap.wrapT = THREE.ClampToEdgeWrapping;
  cleanRoughnessMap.needsUpdate = true;

  const rawNormal = createNormalTextureFromHeight(rawHeight, size, 2.9);
  const cleanNormal = createNormalTextureFromHeight(cleanHeight, size, 1.2);

  return {
    rawColor,
    cleanColor,
    rawRoughness: rawRoughnessMap,
    cleanRoughness: cleanRoughnessMap,
    rawNormal,
    cleanNormal,
  };
}

function createNormalTextureFromHeight(height, size, strength) {
  const data = new Uint8Array(size * size * 4);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const left = height[y * size + Math.max(x - 1, 0)];
      const right = height[y * size + Math.min(x + 1, size - 1)];
      const up = height[Math.max(y - 1, 0) * size + x];
      const down = height[Math.min(y + 1, size - 1) * size + x];

      const dx = (right - left) * strength;
      const dy = (down - up) * strength;

      const nx = -dx;
      const ny = -dy;
      const nz = 1.0;
      const length = Math.hypot(nx, ny, nz) || 1.0;

      const pixel = (y * size + x) * 4;
      data[pixel + 0] = clampByte(((nx / length) * 0.5 + 0.5) * 255);
      data[pixel + 1] = clampByte(((ny / length) * 0.5 + 0.5) * 255);
      data[pixel + 2] = clampByte(((nz / length) * 0.5 + 0.5) * 255);
      data[pixel + 3] = 255;
    }
  }

  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.colorSpace = THREE.NoColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

function makeLabel(title, subtitle, x) {
  const canvasLabel = document.createElement("canvas");
  canvasLabel.width = 640;
  canvasLabel.height = 140;
  const context = canvasLabel.getContext("2d");

  context.clearRect(0, 0, canvasLabel.width, canvasLabel.height);
  context.fillStyle = "rgba(255,255,255,0.95)";
  context.font = '600 38px "IBM Plex Sans", sans-serif';
  context.textAlign = "center";
  context.fillText(title, canvasLabel.width * 0.5, 52);
  context.fillStyle = "rgba(220,224,232,0.84)";
  context.font = '28px "IBM Plex Sans", sans-serif';
  context.fillText(subtitle, canvasLabel.width * 0.5, 96);

  const texture = new THREE.CanvasTexture(canvasLabel);
  texture.colorSpace = THREE.SRGBColorSpace;

  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
    }),
  );
  sprite.position.set(x, 2.92, 0);
  sprite.scale.set(2.9, 0.64, 1);
  return sprite;
}

function fbm(x, y, seed) {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1.0;

  for (let octave = 0; octave < 4; octave += 1) {
    value += amplitude * valueNoise(x * frequency, y * frequency, seed + octave * 17.0);
    amplitude *= 0.5;
    frequency *= 2.0;
  }

  return value;
}

function valueNoise(x, y, seed) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = x0 + 1;
  const y1 = y0 + 1;

  const tx = smooth(x - x0);
  const ty = smooth(y - y0);

  const a = hash(x0, y0, seed);
  const b = hash(x1, y0, seed);
  const c = hash(x0, y1, seed);
  const d = hash(x1, y1, seed);

  const ab = THREE.MathUtils.lerp(a, b, tx);
  const cd = THREE.MathUtils.lerp(c, d, tx);

  return THREE.MathUtils.lerp(ab, cd, ty);
}

function hash(x, y, seed) {
  const value = Math.sin(x * 127.1 + y * 311.7 + seed * 91.7) * 43758.5453123;
  return value - Math.floor(value);
}

function smooth(value) {
  return value * value * (3.0 - 2.0 * value);
}

function smoothstep(edge0, edge1, value) {
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3.0 - 2.0 * t);
}

function mixColor(a, b, t) {
  return [
    THREE.MathUtils.lerp(a[0], b[0], t),
    THREE.MathUtils.lerp(a[1], b[1], t),
    THREE.MathUtils.lerp(a[2], b[2], t),
  ];
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function clampByte(value) {
  return Math.round(clamp(value, 0, 255));
}

status.style.display = "none";
