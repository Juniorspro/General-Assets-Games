import * as THREE from 'three';

export class Player {
  constructor(camera, world, dom) {
    this.camera = camera;
    this.world = world;
    this.dom = dom;
    this.eye = 1.7;
    this.yaw = 0;
    this.pitch = 0;
    this.pos = new THREE.Vector3(0, 0, 0);
    this.vel = new THREE.Vector3();
    this.locked = false;
    this.keys = {};
    this.bobPhase = 0;
    this.battery = 1.0;
    this.flashOn = true;
    this.obstacles = []; // {x,z,r}

    // flashlight
    this.flash = new THREE.SpotLight(0xfff0d8, 24, 50, Math.PI / 5.5, 0.5, 1.3);
    this.flash.position.set(0.15, -0.12, 0.2);
    this.flashTarget = new THREE.Object3D();
    this.flashTarget.position.set(0, -0.05, -1);
    camera.add(this.flash);
    camera.add(this.flashTarget);
    this.flash.target = this.flashTarget;

    this._bindInput();
  }

  spawn(x, z, yaw = 0) {
    this.pos.set(x, this.world.getHeight(x, z), z);
    this.yaw = yaw;
  }

  _bindInput() {
    addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'KeyF') this.toggleFlash();
    });
    addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    document.addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      this.yaw -= e.movementX * 0.0022;
      this.pitch -= e.movementY * 0.0022;
      this.pitch = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, this.pitch));
    });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.dom;
    });
  }

  requestLock() { this.dom.requestPointerLock(); }

  toggleFlash() {
    if (this.battery <= 0) return;
    this.flashOn = !this.flashOn;
    if (this.onFlashToggle) this.onFlashToggle(this.flashOn);
  }

  _collide() {
    for (const o of this.obstacles) {
      const dx = this.pos.x - o.x, dz = this.pos.z - o.z;
      const d = Math.hypot(dx, dz);
      if (d < o.r && d > 0.0001) {
        const push = (o.r - d);
        this.pos.x += (dx / d) * push;
        this.pos.z += (dz / d) * push;
      }
    }
  }

  update(dt) {
    const k = this.keys;
    const sprint = k['ShiftLeft'] || k['ShiftRight'];
    const speed = (sprint ? 6.2 : 3.0);
    const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);

    // forward is -Z in view space
    let fx = 0, fz = 0;
    if (k['KeyW']) { fx -= sin; fz -= cos; }
    if (k['KeyS']) { fx += sin; fz += cos; }
    if (k['KeyA']) { fx -= cos; fz += sin; }
    if (k['KeyD']) { fx += cos; fz -= sin; }
    const len = Math.hypot(fx, fz);
    let moving = len > 0.01;
    if (moving) { fx /= len; fz /= len; }

    // smooth accel
    const targetVx = fx * speed, targetVz = fz * speed;
    this.vel.x += (targetVx - this.vel.x) * Math.min(1, dt * 10);
    this.vel.z += (targetVz - this.vel.z) * Math.min(1, dt * 10);

    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;

    // bounds
    const lim = this.world.half - 4;
    this.pos.x = Math.max(-lim, Math.min(lim, this.pos.x));
    this.pos.z = Math.max(-lim, Math.min(lim, this.pos.z));

    this._collide();

    const groundY = this.world.getHeight(this.pos.x, this.pos.z);
    this.pos.y = groundY;

    // head bob
    let bob = 0;
    if (moving) {
      this.bobPhase += dt * (sprint ? 13 : 9);
      bob = Math.sin(this.bobPhase) * (sprint ? 0.085 : 0.05);
      this.camera.position.set(
        this.pos.x + Math.cos(this.bobPhase) * 0.02,
        this.pos.y + this.eye + bob,
        this.pos.z);
    } else {
      this.bobPhase = 0;
      this.camera.position.set(this.pos.x, this.pos.y + this.eye, this.pos.z);
    }

    // orientation
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;

    // flashlight + battery
    if (this.flashOn && this.battery > 0) {
      this.battery = Math.max(0, this.battery - dt * 0.006);
      const flicker = 0.85 + Math.random() * 0.15 + (this.battery < 0.2 ? (Math.random() - 0.5) * 0.6 : 0);
      this.flash.intensity = 24 * flicker * (0.45 + this.battery * 0.55);
      if (this.battery <= 0) this.flashOn = false;
    } else {
      this.flash.intensity = 0;
    }

    return { moving, sprint, footPhase: this.bobPhase };
  }
}
