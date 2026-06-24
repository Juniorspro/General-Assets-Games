import * as THREE from "three/webgpu";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MaterialXLoader } from "three/addons/loaders/MaterialXLoader.js";
import GUI from "lil-gui";

const canvas = document.getElementById("app");
const status = document.getElementById("status");

const renderer = new THREE.WebGPURenderer({
  antialias: true,
  canvas,
});
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x080a0d);
scene.fog = new THREE.Fog(0x080a0d, 9, 24);

const camera = new THREE.PerspectiveCamera(
  33,
  window.innerWidth / window.innerHeight,
  0.1,
  100,
);
camera.position.set(0, 1.85, 9.6);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 1.0, 0);
controls.minDistance = 5.5;
controls.maxDistance = 16;
controls.maxPolarAngle = Math.PI * 0.56;

const pmremGenerator = new THREE.PMREMGenerator(renderer);
scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.045).texture;

const hemiLight = new THREE.HemisphereLight(0xd7ebff, 0x291f16, 0.9);
scene.add(hemiLight);

const keyLight = new THREE.DirectionalLight(0xfff4e6, 2.3);
keyLight.position.set(4.6, 5.2, 4.3);
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0x88b8ff, 0.7);
rimLight.position.set(-5.3, 2.6, -4.8);
scene.add(rimLight);

const fillLight = new THREE.PointLight(0xffc39d, 18, 20, 2);
fillLight.position.set(0, 2.2, 5.6);
scene.add(fillLight);

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(9.5, 96),
  new THREE.MeshStandardMaterial({
    color: 0x10141a,
    roughness: 0.98,
    metalness: 0.02,
  }),
);
floor.rotation.x = -Math.PI * 0.5;
floor.position.y = -0.68;
scene.add(floor);

const pedestalGeometry = new THREE.CylinderGeometry(1.2, 1.4, 0.34, 64, 1, false);
const leftX = -2.6;
const rightX = 2.6;

const labels = [
  makeLabel("glTF + KHR", "physical-material asset route", leftX),
  makeLabel("MaterialX", "standard_surface import route", rightX),
];
labels.forEach((label) => scene.add(label));

const params = {
  rotationSpeed: 0.28,
  exposure: 1.0,
};

let gltfRoot = null;
let materialXMesh = null;

const gui = new GUI({ title: "Ecosystem Fixture" });
const sceneFolder = gui.addFolder("Scene");
sceneFolder.add(params, "rotationSpeed", 0.0, 1.0, 0.01).name("rotation");
sceneFolder
  .add(params, "exposure", 0.55, 1.7, 0.01)
  .name("exposure")
  .onChange((value) => {
    renderer.toneMappingExposure = value;
  });

window.addEventListener("resize", onResize);

boot().catch((error) => {
  status.style.display = "block";
  status.style.borderColor = "rgba(248, 113, 113, 0.35)";
  status.textContent = `Fixture failed to initialize: ${error?.message ?? error}`;
  console.error(error);
});

async function boot() {
  addPedestal(leftX);
  addPedestal(rightX);

  gltfRoot = await buildGltfRoute();
  scene.add(gltfRoot);

  materialXMesh = await buildMaterialXRoute();
  scene.add(materialXMesh);

  renderer.setAnimationLoop(render);
  status.style.display = "none";
}

async function buildGltfRoute() {
  const sourceMesh = new THREE.Mesh(
    new THREE.TorusKnotGeometry(0.78, 0.24, 220, 40, 2, 3),
    new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(0xf3ccb7),
      roughness: 0.16,
      metalness: 0.0,
      clearcoat: 0.88,
      clearcoatRoughness: 0.08,
      transmission: 0.72,
      thickness: 1.4,
      attenuationDistance: 0.58,
      attenuationColor: new THREE.Color(0xf1a07f),
      iridescence: 0.8,
      iridescenceIOR: 1.28,
      iridescenceThicknessRange: [150, 380],
      specularIntensity: 1.0,
      specularColor: new THREE.Color(1.0, 0.92, 0.88),
      sheen: 0.3,
      sheenColor: new THREE.Color(0xffc0a8),
      side: THREE.DoubleSide,
    }),
  );
  sourceMesh.position.set(0, 1.02, 0);
  sourceMesh.rotation.x = -0.18;

  const assetScene = new THREE.Scene();
  assetScene.add(sourceMesh);

  const exporter = new GLTFExporter();
  const gltfData = await exporter.parseAsync(assetScene, {
    binary: false,
    onlyVisible: true,
  });

  const loader = new GLTFLoader();
  const gltf = await new Promise((resolve, reject) => {
    loader.parse(JSON.stringify(gltfData), "", resolve, reject);
  });

  const root = gltf.scene;
  root.position.x = leftX;
  root.traverse((object) => {
    if (object.isMesh) {
      object.castShadow = false;
      object.receiveShadow = false;
    }
  });

  return root;
}

async function buildMaterialXRoute() {
  const materialXText = `<?xml version="1.0"?>
<materialx version="1.39" colorspace="lin_rec709">
  <standard_surface name="RouteSurface" type="surfaceshader">
    <input name="base" type="float" value="1.0" />
    <input name="base_color" type="color3" value="0.87, 0.60, 0.44" />
    <input name="specular" type="float" value="1.0" />
    <input name="specular_color" type="color3" value="1.0, 0.92, 0.88" />
    <input name="specular_roughness" type="float" value="0.18" />
    <input name="coat" type="float" value="0.72" />
    <input name="coat_roughness" type="float" value="0.08" />
    <input name="transmission" type="float" value="0.58" />
    <input name="transmission_color" type="color3" value="1.0, 0.83, 0.74" />
    <input name="thin_film_thickness" type="float" value="360" />
    <input name="thin_film_ior" type="float" value="1.28" />
  </standard_surface>
  <surfacematerial name="RouteMaterial" type="material">
    <input name="surfaceshader" type="surfaceshader" nodename="RouteSurface" />
  </surfacematerial>
</materialx>`;

  const materialDictionary = new MaterialXLoader().parse(materialXText);
  const importedMaterial = Object.values(materialDictionary.materials).pop();
  importedMaterial.side = THREE.DoubleSide;

  const mesh = new THREE.Mesh(
    new THREE.TorusKnotGeometry(0.78, 0.24, 220, 40, 2, 3),
    importedMaterial,
  );
  mesh.position.set(rightX, 1.02, 0);
  mesh.rotation.x = -0.18;

  return mesh;
}

function render(time) {
  const seconds = time * 0.001;

  if (gltfRoot) {
    gltfRoot.rotation.y = seconds * params.rotationSpeed;
    gltfRoot.rotation.z = Math.sin(seconds * 0.7) * 0.05;
  }

  if (materialXMesh) {
    materialXMesh.rotation.y = seconds * params.rotationSpeed;
    materialXMesh.rotation.z = Math.sin(seconds * 0.7 + 0.25) * 0.05;
  }

  controls.update();
  renderer.render(scene, camera);
}

function addPedestal(x) {
  const pedestal = new THREE.Mesh(
    pedestalGeometry,
    new THREE.MeshStandardMaterial({
      color: 0x181e28,
      roughness: 0.92,
      metalness: 0.06,
    }),
  );
  pedestal.position.set(x, -0.48, 0);
  scene.add(pedestal);
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
  sprite.scale.set(3.0, 0.64, 1);
  return sprite;
}

function onResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
