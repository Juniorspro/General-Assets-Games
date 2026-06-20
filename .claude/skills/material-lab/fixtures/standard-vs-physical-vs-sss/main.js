import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { SubsurfaceScatteringShader } from "three/addons/shaders/SubsurfaceScatteringShader.js";
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
scene.background = new THREE.Color(0x08090d);
scene.fog = new THREE.Fog(0x08090d, 8, 22);

const camera = new THREE.PerspectiveCamera(
  32,
  window.innerWidth / window.innerHeight,
  0.1,
  100,
);
camera.position.set(0, 1.9, 10.5);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 1.15, 0);
controls.minDistance = 6;
controls.maxDistance = 18;
controls.maxPolarAngle = Math.PI * 0.56;

const pmremGenerator = new THREE.PMREMGenerator(renderer);
scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.045).texture;

const ambientLight = new THREE.HemisphereLight(0xbcd5ff, 0x1d1410, 0.9);
scene.add(ambientLight);

const keyLight = new THREE.DirectionalLight(0xfff1e2, 2.0);
keyLight.position.set(3.2, 5.1, 4.8);
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0xa4d4ff, 0.65);
rimLight.position.set(-4.8, 2.1, -5.1);
scene.add(rimLight);

const backLight = new THREE.PointLight(0xff8a5b, 65, 18, 2);
backLight.position.set(0, 1.15, -2.8);
scene.add(backLight);

const backLightVisual = new THREE.Mesh(
  new THREE.SphereGeometry(0.12, 24, 24),
  new THREE.MeshBasicMaterial({ color: 0xff8a5b }),
);
backLightVisual.position.copy(backLight.position);
scene.add(backLightVisual);

const fillLight = new THREE.PointLight(0xfff0e6, 8, 20, 2);
fillLight.position.set(0, 2.2, 7.2);
scene.add(fillLight);

const stage = new THREE.Mesh(
  new THREE.CylinderGeometry(4.7, 5.15, 0.5, 64, 1, false),
  new THREE.MeshStandardMaterial({
    color: 0x151821,
    roughness: 0.92,
    metalness: 0.08,
  }),
);
stage.position.y = -0.28;
scene.add(stage);

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(9, 96),
  new THREE.MeshStandardMaterial({
    color: 0x0a0b10,
    roughness: 0.98,
    metalness: 0.0,
  }),
);
floor.rotation.x = -Math.PI * 0.5;
floor.position.y = -0.54;
scene.add(floor);

const columnGeometry = new THREE.TorusKnotGeometry(0.78, 0.28, 220, 40, 2, 3);
const positions = [-3.0, 0.0, 3.0];
const meshes = [];

const params = {
  rotationSpeed: 0.32,
  roughness: 0.28,
  standardMetalness: 0.0,
  physicalTransmission: 0.95,
  physicalThickness: 1.5,
  physicalIor: 1.36,
  physicalAttenuationDistance: 0.42,
  backlightIntensity: 65,
  exposure: 1.0,
  sssDistortion: 0.16,
  sssAmbient: 0.2,
  sssAttenuation: 0.85,
  sssPower: 3.0,
  sssScale: 18.0,
};

const baseColor = new THREE.Color(0xd98970);
const standardMaterial = new THREE.MeshStandardMaterial({
  color: baseColor.clone(),
  roughness: params.roughness,
  metalness: params.standardMetalness,
});

const physicalMaterial = new THREE.MeshPhysicalMaterial({
  color: new THREE.Color(0xf2c8b3),
  roughness: 0.08,
  metalness: 0.0,
  transmission: params.physicalTransmission,
  thickness: params.physicalThickness,
  ior: params.physicalIor,
  attenuationDistance: params.physicalAttenuationDistance,
  attenuationColor: new THREE.Color(0xf4a37d),
  specularIntensity: 1.0,
  clearcoat: 0.18,
  clearcoatRoughness: 0.12,
  side: THREE.DoubleSide,
});

const whiteMap = createSolidTexture(255, 255, 255, 255);
const thicknessMap = createThicknessTexture();

const sssShader = SubsurfaceScatteringShader;
const sssUniforms = THREE.UniformsUtils.clone(sssShader.uniforms);
sssUniforms.map.value = whiteMap;
sssUniforms.diffuse.value = new THREE.Vector3(0.82, 0.5, 0.42);
sssUniforms.shininess.value = 120;
sssUniforms.thicknessMap.value = thicknessMap;
sssUniforms.thicknessColor.value = new THREE.Vector3(0.95, 0.47, 0.22);
sssUniforms.thicknessDistortion.value = params.sssDistortion;
sssUniforms.thicknessAmbient.value = params.sssAmbient;
sssUniforms.thicknessAttenuation.value = params.sssAttenuation;
sssUniforms.thicknessPower.value = params.sssPower;
sssUniforms.thicknessScale.value = params.sssScale;

const sssMaterial = new THREE.ShaderMaterial({
  uniforms: sssUniforms,
  vertexShader: sssShader.vertexShader,
  fragmentShader: sssShader.fragmentShader,
  lights: true,
  side: THREE.DoubleSide,
});

[
  { x: positions[0], material: standardMaterial },
  { x: positions[1], material: physicalMaterial },
  { x: positions[2], material: sssMaterial },
].forEach((entry) => {
  const mesh = new THREE.Mesh(columnGeometry, entry.material);
  mesh.position.set(entry.x, 1.15, 0);
  mesh.rotation.x = -0.18;
  scene.add(mesh);
  meshes.push(mesh);
});

const columnLabels = [
  makeLabel("STANDARD", "opaque approximation", positions[0]),
  makeLabel("PHYSICAL", "transmission route", positions[1]),
  makeLabel("SSS", "backlit internal spread", positions[2]),
];
columnLabels.forEach((label) => scene.add(label));

const gui = new GUI({ title: "Material Fixture" });
const sceneFolder = gui.addFolder("Scene");
sceneFolder.add(params, "rotationSpeed", 0.0, 1.2, 0.01).name("rotation");
sceneFolder
  .add(params, "backlightIntensity", 0, 90, 1)
  .name("backlight")
  .onChange((value) => {
    backLight.intensity = value;
  });
sceneFolder
  .add(params, "exposure", 0.5, 1.6, 0.01)
  .name("exposure")
  .onChange((value) => {
    renderer.toneMappingExposure = value;
  });

const standardFolder = gui.addFolder("Standard");
standardFolder
  .add(params, "roughness", 0.02, 0.9, 0.01)
  .name("roughness")
  .onChange((value) => {
    standardMaterial.roughness = value;
  });
standardFolder
  .add(params, "standardMetalness", 0.0, 0.25, 0.01)
  .name("metalness")
  .onChange((value) => {
    standardMaterial.metalness = value;
  });

const physicalFolder = gui.addFolder("Physical");
physicalFolder
  .add(params, "physicalTransmission", 0.0, 1.0, 0.01)
  .name("transmission")
  .onChange((value) => {
    physicalMaterial.transmission = value;
  });
physicalFolder
  .add(params, "physicalThickness", 0.0, 3.0, 0.01)
  .name("thickness")
  .onChange((value) => {
    physicalMaterial.thickness = value;
  });
physicalFolder
  .add(params, "physicalIor", 1.0, 2.0, 0.01)
  .name("ior")
  .onChange((value) => {
    physicalMaterial.ior = value;
  });
physicalFolder
  .add(params, "physicalAttenuationDistance", 0.1, 2.0, 0.01)
  .name("attenuation")
  .onChange((value) => {
    physicalMaterial.attenuationDistance = value;
  });

const sssFolder = gui.addFolder("SSS");
sssFolder
  .add(params, "sssDistortion", 0.0, 0.6, 0.01)
  .name("distortion")
  .onChange((value) => {
    sssUniforms.thicknessDistortion.value = value;
  });
sssFolder
  .add(params, "sssAmbient", 0.0, 1.2, 0.01)
  .name("ambient")
  .onChange((value) => {
    sssUniforms.thicknessAmbient.value = value;
  });
sssFolder
  .add(params, "sssAttenuation", 0.0, 2.0, 0.01)
  .name("attenuation")
  .onChange((value) => {
    sssUniforms.thicknessAttenuation.value = value;
  });
sssFolder
  .add(params, "sssPower", 0.5, 8.0, 0.1)
  .name("power")
  .onChange((value) => {
    sssUniforms.thicknessPower.value = value;
  });
sssFolder
  .add(params, "sssScale", 1.0, 32.0, 0.1)
  .name("scale")
  .onChange((value) => {
    sssUniforms.thicknessScale.value = value;
  });

window.addEventListener("resize", onResize);
renderer.setAnimationLoop(render);

function render(time) {
  const seconds = time * 0.001;

  for (let index = 0; index < meshes.length; index += 1) {
    const mesh = meshes[index];
    const phase = index * 0.55;
    mesh.rotation.y = seconds * params.rotationSpeed + phase;
    mesh.rotation.z = Math.sin(seconds * 0.65 + phase) * 0.05;
  }

  backLightVisual.material.opacity = 0.7 + Math.sin(seconds * 2.4) * 0.1;
  backLightVisual.material.transparent = true;
  backLightVisual.scale.setScalar(1 + Math.sin(seconds * 2.4) * 0.06);

  controls.update();
  renderer.render(scene, camera);
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function createSolidTexture(r, g, b, a) {
  const data = new Uint8Array([r, g, b, a]);
  const texture = new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createThicknessTexture() {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");

  const gradient = context.createRadialGradient(
    size * 0.5,
    size * 0.5,
    size * 0.14,
    size * 0.5,
    size * 0.5,
    size * 0.5,
  );
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.38, "rgba(255,220,220,0.92)");
  gradient.addColorStop(0.72, "rgba(255,178,178,0.46)");
  gradient.addColorStop(1, "rgba(120,40,40,0.18)");

  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

function makeLabel(title, subtitle, x) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const context = canvas.getContext("2d");

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "rgba(255,255,255,0.95)";
  context.font = '600 38px "IBM Plex Sans", sans-serif';
  context.textAlign = "center";
  context.fillText(title, canvas.width * 0.5, 48);
  context.fillStyle = "rgba(220,224,232,0.86)";
  context.font = '28px "IBM Plex Sans", sans-serif';
  context.fillText(subtitle, canvas.width * 0.5, 88);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  });

  const sprite = new THREE.Sprite(material);
  sprite.position.set(x, 3.02, 0);
  sprite.scale.set(2.4, 0.6, 1);
  return sprite;
}

status.style.display = "none";
