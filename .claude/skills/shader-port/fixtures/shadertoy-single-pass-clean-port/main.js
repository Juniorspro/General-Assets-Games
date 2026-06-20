import * as THREE from "three/webgpu";
import { color, mix, sin, time, uv } from "three/tsl";

const canvas = document.getElementById("app");
const status = document.getElementById("status");
const routeTag = document.getElementById("route-tag");
const size = new THREE.Vector2();

const params = new URLSearchParams(window.location.search);
const requestedBackend = params.get("backend");
const backendPreference =
  requestedBackend === "webgl2" ? "webgl2" : navigator.gpu ? "webgpu" : "webgl2";

let renderer;

const scene = new THREE.Scene();
scene.background = new THREE.Color("#05070b");

const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

const material = new THREE.MeshBasicNodeMaterial();
const paletteA = color("#67e8f9");
const paletteB = color("#fb7185");
const deepBackground = color("#08111f");

const blend = uv()
  .y.add(sin(uv().x.mul(12.0).add(time.mul(0.8))).mul(0.18))
  .add(sin(uv().y.mul(8.0).sub(time.mul(1.1))).mul(0.12))
  .clamp();

material.colorNode = mix(deepBackground, mix(paletteA, paletteB, blend), blend);

const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
scene.add(quad);

routeTag.textContent =
  backendPreference === "webgl2" ? "TSL on WebGL2 backend" : "TSL on WebGPU";

function setStatus(message, isError = false) {
  status.textContent = message;
  status.style.display = "block";
  status.style.borderColor = isError ? "rgba(248, 113, 113, 0.35)" : "rgba(103, 232, 249, 0.24)";
}

function clearStatus() {
  status.style.display = "none";
}

function withInitTimeout(promise, label, timeoutMs = 12000) {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = window.setTimeout(() => {
      reject(new Error(`${label} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    window.clearTimeout(timer);
  });
}

function resize() {
  size.set(window.innerWidth, window.innerHeight);
  if (!renderer) {
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(size.x, size.y, false);
}

function render() {
  renderer.render(scene, camera);
}

async function detectBackendAvailability() {
  const probeCanvas = document.createElement("canvas");
  const hasWebGL2 = !!probeCanvas.getContext("webgl2");
  let hasWebGPUAdapter = false;

  if (navigator.gpu?.requestAdapter) {
    try {
      hasWebGPUAdapter = !!(await navigator.gpu.requestAdapter());
    } catch (error) {
      hasWebGPUAdapter = false;
    }
  }

  return { hasWebGL2, hasWebGPUAdapter };
}

async function init() {
  try {
    const availability = await detectBackendAvailability();
    let resolvedBackend = backendPreference;

    if (resolvedBackend === "webgpu" && !availability.hasWebGPUAdapter) {
      if (availability.hasWebGL2) {
        resolvedBackend = "webgl2";
        routeTag.textContent = "TSL on WebGL2 backend";
        setStatus("WebGPU adapter unavailable. Falling back to WebGL2 backend...");
      } else {
        routeTag.textContent = "No graphics backend";
        setStatus("This browser context exposes neither a usable WebGPU adapter nor WebGL2.", true);
        return;
      }
    }

    if (resolvedBackend === "webgl2" && !availability.hasWebGL2) {
      routeTag.textContent = "No graphics backend";
      setStatus("WebGL2 is not available in this browser context.", true);
      return;
    }

    const label = resolvedBackend === "webgl2" ? "WebGL2 backend" : "WebGPU";
    setStatus(`Initializing ${label} route...`);

    renderer = new THREE.WebGPURenderer({
      canvas,
      antialias: true,
      alpha: false,
      forceWebGL: resolvedBackend === "webgl2",
      powerPreference: "high-performance",
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    await withInitTimeout(renderer.init(), `${label} renderer init`);

    window.addEventListener("resize", resize);
    resize();
    clearStatus();
    renderer.setAnimationLoop(render);
  } catch (error) {
    setStatus(error.message, true);
    console.error(error);
  }
}

init();
