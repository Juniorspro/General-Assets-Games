import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const poleMat = new THREE.MeshStandardMaterial({ color: 0x4a3f33, roughness: 0.9, metalness: 0.05 });
const metalMat = new THREE.MeshStandardMaterial({ color: 0x2b2b2e, roughness: 0.6, metalness: 0.7 });
const cableMat = new THREE.MeshStandardMaterial({ color: 0x0c0c0c, roughness: 0.8, metalness: 0.1 });

function catenary(p0, p1, sag, segs = 14) {
  const pts = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const x = THREE.MathUtils.lerp(p0.x, p1.x, t);
    const z = THREE.MathUtils.lerp(p0.z, p1.z, t);
    const y = THREE.MathUtils.lerp(p0.y, p1.y, t) - Math.sin(t * Math.PI) * sag;
    pts.push(new THREE.Vector3(x, y, z));
  }
  return new THREE.CatmullRomCurve3(pts);
}

export function buildLightPoles(world) {
  const group = new THREE.Group();
  group.name = 'poles';
  const lamps = [];
  const cableGeos = [];
  const poleH = 6.2;

  const poleTops = [];   // attach points for cables (top of crossarm, road side)
  const spacing = 30;

  for (let z = -world.half + 14, i = 0; z < world.half - 14; z += spacing, i++) {
    const cx = world.roadInfo(0, z).centerX;
    const side = i % 2 === 0 ? 1 : -1;
    const px = cx + side * (world.roadWidth / 2 + 2.6);
    const gy = world.getHeight(px, z);

    const pole = new THREE.Group();
    pole.position.set(px, gy, z);

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.22, poleH, 7), poleMat);
    trunk.position.y = poleH / 2; trunk.castShadow = true;
    trunk.rotation.z = (Math.random() - 0.5) * 0.04;
    pole.add(trunk);

    // crossarm reaching over the road
    const arm = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.12, 0.12), poleMat);
    arm.position.set(-side * 1.0, poleH - 0.5, 0);
    arm.castShadow = true;
    pole.add(arm);

    // lamp fixture at the road end of the arm
    const lampX = -side * 2.0;
    const fixture = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.5, 8, 1, true), metalMat);
    fixture.position.set(lampX, poleH - 0.7, 0);
    fixture.rotation.x = Math.PI;
    pole.add(fixture);

    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0xffe6b0, emissive: 0xffd28a, emissiveIntensity: 2.0 }));
    bulb.position.set(lampX, poleH - 0.9, 0);
    pole.add(bulb);

    const light = new THREE.PointLight(0xffd49a, 6.0, 26, 2.0);
    light.position.copy(bulb.position);
    pole.add(light);

    lamps.push({ light, bulb, base: 6.0, worldPos: new THREE.Vector3(px + lampX, gy + poleH - 0.9, z) });
    group.add(pole);

    poleTops.push({
      cableTop: new THREE.Vector3(px, gy + poleH - 0.15, z),
      armTip: new THREE.Vector3(px - side * 2.4, gy + poleH - 0.5, z),
    });
  }

  // weave cables between consecutive poles — several lines for a tangled look
  for (let i = 0; i < poleTops.length - 1; i++) {
    const a = poleTops[i], b = poleTops[i + 1];
    const pairs = [
      [a.cableTop, b.cableTop, 1.6],
      [a.armTip, b.armTip, 1.9],
      [a.cableTop.clone().add(new THREE.Vector3(0, -0.5, 0)),
       b.cableTop.clone().add(new THREE.Vector3(0, -0.5, 0)), 2.4],
    ];
    for (const [p0, p1, sag] of pairs) {
      const curve = catenary(p0, p1, sag);
      cableGeos.push(new THREE.TubeGeometry(curve, 14, 0.035, 4, false));
    }
    // an occasional sagging drooping wire to the ground (broken line)
    if (Math.random() < 0.18) {
      const drop = a.cableTop.clone();
      const end = drop.clone().add(new THREE.Vector3((Math.random() - 0.5) * 4, -(poleH - 0.5), (Math.random() - 0.5) * 4));
      const curve = catenary(drop, end, 0.6, 8);
      cableGeos.push(new THREE.TubeGeometry(curve, 8, 0.03, 4, false));
    }
  }

  if (cableGeos.length) {
    const merged = mergeGeometries(cableGeos, false);
    group.add(new THREE.Mesh(merged, cableMat));
  }

  return { group, lamps };
}
