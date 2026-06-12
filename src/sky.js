import * as THREE from 'three';

function glowSprite(color, size) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, color); g.addColorStop(0.3, color); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const s = new THREE.Sprite(mat); s.scale.setScalar(size);
  return s;
}

export function buildSky(scene, world) {
  // gradient dome
  const skyGeo = new THREE.SphereGeometry(world.half * 2.2, 32, 16);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: {
      top: { value: new THREE.Color(0x05070d) },
      mid: { value: new THREE.Color(0x0c1320) },
      bot: { value: new THREE.Color(0x161410) },
    },
    vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
    fragmentShader: `
      uniform vec3 top, mid, bot; varying vec3 vP;
      void main(){
        float h = normalize(vP).y;
        vec3 c = mix(bot, mid, smoothstep(-0.1,0.25,h));
        c = mix(c, top, smoothstep(0.2,0.7,h));
        gl_FragColor = vec4(c,1.0);
      }`,
  });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  scene.add(sky);

  // stars
  const N = 1400;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const u = Math.random(), v = Math.random() * 0.5; // upper hemisphere mostly
    const theta = u * Math.PI * 2, phi = Math.acos(1 - v);
    const r = world.half * 2.0;
    pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    pos[i * 3 + 1] = r * Math.cos(phi);
    pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xb8c4e0, size: 1.4, sizeAttenuation: false, transparent: true, opacity: 0.85 }));
  scene.add(stars);

  // moon
  const moonDir = new THREE.Vector3(0.5, 0.55, -0.6).normalize();
  const moonPos = moonDir.clone().multiplyScalar(world.half * 1.8);
  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(14, 24, 16),
    new THREE.MeshBasicMaterial({ color: 0xdfe6ef }));
  moon.position.copy(moonPos);
  scene.add(moon);
  const halo = glowSprite('rgba(180,200,235,0.85)', 90);
  halo.position.copy(moonPos);
  scene.add(halo);

  // fog
  scene.fog = new THREE.FogExp2(0x0a0e14, 0.02);

  // ---- lighting ----
  const amb = new THREE.AmbientLight(0x2a3340, 0.5);
  scene.add(amb);
  const hemi = new THREE.HemisphereLight(0x2b3a52, 0x0a0908, 0.6);
  scene.add(hemi);

  const moonLight = new THREE.DirectionalLight(0x8fa6cf, 0.7);
  moonLight.position.copy(moonDir.clone().multiplyScalar(80));
  moonLight.castShadow = true;
  moonLight.shadow.mapSize.set(2048, 2048);
  const d = 70;
  moonLight.shadow.camera.left = -d; moonLight.shadow.camera.right = d;
  moonLight.shadow.camera.top = d; moonLight.shadow.camera.bottom = -d;
  moonLight.shadow.camera.near = 1; moonLight.shadow.camera.far = 260;
  moonLight.shadow.bias = -0.0006;
  scene.add(moonLight);
  scene.add(moonLight.target);

  return {
    moonLight,
    update(playerPos) {
      // keep the shadow frustum centred on the player
      moonLight.target.position.copy(playerPos);
      moonLight.position.copy(playerPos).addScaledVector(moonDir, 80);
    },
  };
}
