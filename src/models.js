import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as skeletonClone } from 'three/addons/utils/SkeletonUtils.js';

const BASE = './assets/models/';

export const ASSETS = {
  ozoneHouse: 'psx_-_ozone_house.glb',
  japanHouse: 'psx_traditional_japanease_house_1.glb',
  rustyCar: 'old_rusty_car.glb',
  truck: 'psx_-_truck.glb',
  carPack: 'generic_passenger_car_pack.glb',
  highSchool: 'ps1_psx_high_school_character.glb',
  rigged: 'ps1_rigged_character_model.glb',
  clergy: 'clergy__catacombs_ps1-style_asset_pack.glb',
  pines: 'pine_trees_pack__ps1_low_poly.glb',
};

// crunchy PS1-style texture filtering
function ps1ify(root) {
  root.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        if (!m) continue;
        if (m.map) {
          m.map.magFilter = THREE.NearestFilter;
          m.map.minFilter = THREE.NearestMipmapNearestFilter;
          m.map.anisotropy = 1;
          m.map.needsUpdate = true;
        }
        m.roughness = m.roughness ?? 1;
        if (m.metalness === undefined) m.metalness = 0;
        m.side = THREE.DoubleSide;
      }
    }
  });
}

export function loadAssets(manager, onItem) {
  const loader = new GLTFLoader(manager);
  const out = {};
  const entries = Object.entries(ASSETS);
  return Promise.all(entries.map(([key, file]) =>
    loader.loadAsync(BASE + file).then((gltf) => {
      ps1ify(gltf.scene);
      out[key] = gltf;
      onItem && onItem(key);
    }).catch((e) => {
      console.warn('No se pudo cargar', file, e);
      out[key] = null;
    })
  )).then(() => out);
}

// Compute a normalized instance sitting on y=0, scaled so its height == targetH.
export function makeInstance(gltf, { targetH = null, scale = null, skinned = false } = {}) {
  if (!gltf) return null;
  const obj = skinned ? skeletonClone(gltf.scene) : gltf.scene.clone(true);
  const box = new THREE.Box3().setFromObject(obj);
  const size = new THREE.Vector3(); box.getSize(size);
  let s = scale ?? 1;
  if (targetH) s = targetH / (size.y || 1);
  obj.scale.setScalar(s);
  // recompute after scaling to plant base on ground
  const box2 = new THREE.Box3().setFromObject(obj);
  obj.position.y -= box2.min.y;
  const wrap = new THREE.Group();
  wrap.add(obj);
  wrap.userData.animations = gltf.animations || [];
  wrap.userData.inner = obj;
  return wrap;
}
