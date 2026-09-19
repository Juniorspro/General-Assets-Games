// NEON RUSH — pseudo-3D arcade racer. Canvas 2D, fixed timestep, seeded RNG.
import { STR } from "./strings.js";

/* ================= persistence ================= */
const SAVE_KEY = "neonrush.save.v1";
function loadSave() {
  try { return Object.assign(defaults(), JSON.parse(localStorage.getItem(SAVE_KEY) || "{}")); }
  catch { return defaults(); }
}
function defaults() {
  const lang = (navigator.language || "en").toLowerCase().startsWith("es") ? "es" : "en";
  return { lang, sound: true, fx: true, unlocked: 1, best: {}, bestLap: {} };
}
const save = loadSave();
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch {} }
let L = STR[save.lang];

/* ================= config (all tunables live here) ================= */
const CFG = {
  stepMs: 1000 / 60,
  dprCap: 1.5,
  segLen: 200,
  rumble: 3,
  roadW: 2000,             // half-width in world units
  lanes: 3,
  drawDist: 100,           // segments drawn ahead
  fov: 100,
  camH: 1000,
  fogDensity: 6,
  maxSpeed: 12000,
  nitroSpeedMul: 1.22,
  nitroAccelMul: 1.7,
  accel: 2600,
  brake: 9000,
  coast: 1400,
  offroadDecel: 8000,
  offroadLimit: 3400,
  steer: 2.1,              // lateral units/s at full speed
  centrifugal: 0.29,
  crashSpeed: 1600,        // speed after hitting roadside decor
  bumpKeep: 0.55,          // speed kept after rear-ending a rival
  nitroMax: 100,
  nitroUse: 38,            // per second
  nitroGain: 34,           // per pickup
  rivals: 5,
  spriteScale: 0.0026,     // world->screen sprite sizing
  shakeDecay: 4.5,
  kmhTop: 324,             // displayed at maxSpeed
};
CFG.camDepth = 1 / Math.tan((CFG.fov / 2) * Math.PI / 180);
CFG.lateral = 0.72; // horizontal squeeze so both road edges read on widescreen

/* ================= seeded RNG (determinism) ================= */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ================= assets ================= */
const IMG_LIST = ["car_player", "car_rival_a", "car_rival_b", "palm", "billboard", "streetlight", "bg_sky", "logo"];
const SND_LIST = ["music_main", "sfx_engine", "sfx_skid", "sfx_crash", "sfx_nitro", "sfx_chime"];
const IMG = {}, SND = {};
let loadDone = 0, loadTotal = IMG_LIST.length + SND_LIST.length;

function loadImage(name) {
  return new Promise((res) => {
    const im = new Image();
    im.onload = () => { IMG[name] = im; loadDone++; res(); };
    im.onerror = () => { IMG[name] = null; loadDone++; res(); };
    im.src = "./assets/" + name + ".png";
  });
}

/* ================= audio (WebAudio; mix levels per role) ================= */
const AC = window.AudioContext || window.webkitAudioContext;
let actx = null, master = null, musicGain = null, engineSrc = null, engineGain = null, musicSrc = null;
const MIX = { music: 0.14, sfx: 0.35, engine: 0.22 }; // music quiet background, sfx below voice level, no clipping
function audioInit() {
  if (actx || !AC) return;
  actx = new AC();
  master = actx.createGain(); master.gain.value = 0.8; master.connect(actx.destination);
}
const SND_EXT = { music_main: "m4a" }; // music was delivered as AAC; decodeAudioData handles it
async function loadSound(name) {
  try {
    const r = await fetch("./assets/" + name + "." + (SND_EXT[name] || "mp3"));
    const buf = await r.arrayBuffer();
    SND[name] = { raw: buf, buf: null };
  } catch { SND[name] = null; }
  loadDone++;
}
async function decodeAll() {
  if (!actx) return;
  for (const name of SND_LIST) {
    const s = SND[name];
    if (s && s.raw && !s.buf) {
      try { s.buf = await actx.decodeAudioData(s.raw.slice(0)); } catch { /* keep null */ }
    }
  }
}
function playSfx(name, vol = 1, rate = 1) {
  if (!save.sound || !actx || !SND[name] || !SND[name].buf) return;
  const src = actx.createBufferSource();
  src.buffer = SND[name].buf; src.playbackRate.value = rate;
  const g = actx.createGain(); g.gain.value = MIX.sfx * vol;
  src.connect(g); g.connect(master); src.start();
}
function startMusic() {
  if (!save.sound || !actx || !SND.music_main || !SND.music_main.buf || musicSrc) return;
  musicSrc = actx.createBufferSource();
  musicSrc.buffer = SND.music_main.buf; musicSrc.loop = true;
  musicGain = actx.createGain(); musicGain.gain.value = MIX.music;
  musicSrc.connect(musicGain); musicGain.connect(master); musicSrc.start();
}
function stopMusic() { if (musicSrc) { try { musicSrc.stop(); } catch {} musicSrc = null; } }
function startEngine() {
  if (!save.sound || !actx || !SND.sfx_engine || !SND.sfx_engine.buf || engineSrc) return;
  engineSrc = actx.createBufferSource();
  engineSrc.buffer = SND.sfx_engine.buf; engineSrc.loop = true;
  engineGain = actx.createGain(); engineGain.gain.value = 0;
  engineSrc.connect(engineGain); engineGain.connect(master); engineSrc.start();
}
function stopEngine() { if (engineSrc) { try { engineSrc.stop(); } catch {} engineSrc = null; } }
function engineUpdate(speedRatio, on) {
  if (!engineSrc || !engineGain) return;
  engineGain.gain.value = on ? MIX.engine * (0.45 + 0.55 * speedRatio) : 0;
  engineSrc.playbackRate.value = 0.55 + 1.25 * speedRatio;
}
function applySound() {
  if (!save.sound) { stopMusic(); stopEngine(); }
  else { startMusic(); if (screen === "race") startEngine(); }
}

/* ================= input ================= */
const BIND = {
  KeyW: "up", KeyS: "down", KeyA: "left", KeyD: "right",
  ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
  Space: "nitro", Enter: "ok", KeyP: "pause", Escape: "pause",
};
const held = new Set();
const pressedQueue = [];   // edge-triggered commands for menus
addEventListener("keydown", (e) => {
  const c = BIND[e.code];
  if (c) { if (!held.has(c)) pressedQueue.push(c); held.add(c); e.preventDefault(); }
});
addEventListener("keyup", (e) => { const c = BIND[e.code]; if (c) held.delete(c); });

// gamepad — standard mapping; polled every frame
const PADB = { 0: "nitro", 1: "back", 9: "pause", 12: "up", 13: "down", 14: "left", 15: "right" };
let padPrev = {};
let padSteer = 0, padGas = 0, padBrake = 0;
function pollPads() {
  padSteer = 0; padGas = 0; padBrake = 0;
  const cur = {};
  for (const gp of (navigator.getGamepads ? navigator.getGamepads() : [])) {
    if (!gp) continue;
    const ax = gp.axes[0] || 0;
    if (Math.abs(ax) > 0.18) padSteer = ax;
    padGas = Math.max(padGas, gp.buttons[7] ? gp.buttons[7].value : 0);
    padBrake = Math.max(padBrake, gp.buttons[6] ? gp.buttons[6].value : 0);
    for (const i in PADB) {
      const p = gp.buttons[i] && gp.buttons[i].pressed;
      cur[i] = cur[i] || p;
    }
  }
  for (const i in PADB) {
    if (cur[i] && !padPrev[i]) pressedQueue.push(PADB[i] === "nitro" ? "ok" : PADB[i]); // A = confirm in menus
    if (cur[i]) held.add("pad_" + PADB[i]); else held.delete("pad_" + PADB[i]);
    padPrev[i] = cur[i];
  }
}

// touch — multitouch zones for race controls + tap routing for UI buttons
const touches = new Map(); // id -> control name or null
let touchDevice = false;
const touchBtns = [];      // filled each frame by HUD layout: {name,x,y,w,h}
function touchHit(x, y) {
  for (const b of touchBtns) if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b.name;
  return null;
}
const canvas = document.getElementById("c");
canvas.addEventListener("touchstart", (e) => {
  touchDevice = true; interact();
  for (const t of e.changedTouches) {
    const ctl = touchHit(t.clientX, t.clientY);
    touches.set(t.identifier, ctl);
    if (!ctl || ctl === "tap") uiTap(t.clientX, t.clientY);
  }
  e.preventDefault();
}, { passive: false });
canvas.addEventListener("touchmove", (e) => {
  for (const t of e.changedTouches) if (touches.has(t.identifier)) touches.set(t.identifier, touchHit(t.clientX, t.clientY));
  e.preventDefault();
}, { passive: false });
const endTouch = (e) => { for (const t of e.changedTouches) touches.delete(t.identifier); e.preventDefault(); };
canvas.addEventListener("touchend", endTouch, { passive: false });
canvas.addEventListener("touchcancel", endTouch, { passive: false });
canvas.addEventListener("mousedown", (e) => { interact(); uiTap(e.clientX, e.clientY); });
function touchCtl(name) { for (const v of touches.values()) if (v === name) return true; return false; }

// commands snapshot per tick
function commands() {
  return {
    left: held.has("left") || held.has("pad_left") || touchCtl("left") || padSteer < -0.18,
    right: held.has("right") || held.has("pad_right") || touchCtl("right") || padSteer > 0.18,
    up: held.has("up") || padGas > 0.08 || touchCtl("gas"),
    down: held.has("down") || held.has("pad_down") || padBrake > 0.08 || touchCtl("brake"),
    nitro: held.has("nitro") || held.has("pad_nitro") || touchCtl("nitro"),
    steerAnalog: Math.abs(padSteer) > 0.18 ? padSteer : 0,
  };
}

/* ================= canvas ================= */
const ctx = canvas.getContext("2d");
let W = innerWidth, H = innerHeight;
function resize() {
  const dpr = Math.min(devicePixelRatio || 1, CFG.dprCap);
  W = innerWidth; H = innerHeight;
  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.style.width = W + "px"; canvas.style.height = H + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
addEventListener("resize", resize);
addEventListener("orientationchange", resize);
resize();

/* ================= palette (from the STYLE FORMULA; procedural art contract) ================= */
const PAL = {
  skyTop: "#1a1040", horizon: "#ff2e97",
  roadA: "#3c3358", roadB: "#2e2746",
  grassA: "#2c1c66", grassB: "#221552",
  rumbleA: "#ff2e97", rumbleB: "#f5ecd7",
  lane: "#f5ecd7",
  fog: "#2a1a55",
  nitroOrb: "#22e6ff",
  hudBg: "rgba(18,11,46,0.72)",
  hudText: "#f5ecd7",
  accent: "#ff2e97",
  cyan: "#22e6ff",
  gold: "#ffb84d",
  dim: "#8f86c9",
};

/* ================= tracks ================= */
function trackBuilder(seed) {
  const segs = [];
  const rng = mulberry32(seed);
  let curY = 0;
  const ease = (a, b, t) => a + (b - a) * (1 - Math.cos(t * Math.PI)) / 2;
  function add(n, curve, toY) {
    const fromY = curY;
    for (let i = 0; i < n; i++) {
      const t = (i + 1) / n;
      segs.push({ curve, y1: ease(fromY, toY, i / n), y2: ease(fromY, toY, t), sprites: [], pickup: null });
    }
    curY = toY;
  }
  function road(enter, hold, leave, curve, hillDelta) {
    const toY = curY + (hillDelta || 0);
    const fromY = curY, total = enter + hold + leave;
    // curve ramps in/out, hill eases across the whole section
    let k = 0;
    const easeAll = (t) => fromY + (toY - fromY) * (1 - Math.cos(t * Math.PI)) / 2;
    for (let i = 0; i < total; i++) {
      const c = i < enter ? curve * (i / enter) : i < enter + hold ? curve : curve * (1 - (i - enter - hold) / leave);
      segs.push({ curve: c, y1: easeAll(i / total), y2: easeAll((i + 1) / total), sprites: [], pickup: null });
      k++;
    }
    curY = toY;
  }
  return { segs, rng, add, road };
}

function decorate(t, cfg) {
  const { segs, rng } = t;
  const N = segs.length;
  // streetlights: periodic, alternating sides
  for (let i = 20; i < N; i += cfg.lightEvery) segs[i].sprites.push({ img: "streetlight", off: (Math.floor(i / cfg.lightEvery) % 2 ? 1.35 : -1.35), flipped: Math.floor(i / cfg.lightEvery) % 2 === 1 });
  // palms / billboards random clusters
  for (let i = 8; i < N; i += 4 + Math.floor(rng() * 7)) {
    if (rng() < cfg.palmP) segs[i].sprites.push({ img: "palm", off: (rng() < 0.5 ? -1 : 1) * (1.8 + rng() * 1.8) });
    if (rng() < cfg.billP) segs[i].sprites.push({ img: "billboard", off: (rng() < 0.5 ? -1 : 1) * (1.9 + rng() * 0.9) });
  }
  // nitro pickups
  for (let i = 150; i < N - 30; i += cfg.pickupEvery + Math.floor(rng() * 80)) {
    segs[i].pickup = { off: (rng() * 2 - 1) * 0.8, taken: false };
  }
}

function buildTrack1() { // COSTA NEÓN — gentle intro track
  const t = trackBuilder(101);
  t.add(60, 0, 0);
  t.road(50, 80, 50, 2.2, 0);
  t.add(40, 0, 0);
  t.road(40, 60, 40, -2.6, 30);
  t.road(60, 90, 60, 0, -30);
  t.road(50, 100, 50, 3.0, 0);
  t.add(60, 0, 0);
  t.road(40, 70, 40, -2.2, 40);
  t.road(40, 70, 40, -3.2, -40);
  t.add(50, 0, 0);
  t.road(60, 120, 60, 2.4, 0);
  t.road(30, 40, 30, -1.6, 0);
  t.add(80, 0, 0);
  decorate(t, { lightEvery: 24, palmP: 0.55, billP: 0.10, pickupEvery: 260 });
  return { name: () => L.track1, laps: 3, segs: t.segs, tint: null, seed: 101 };
}
function buildTrack2() { // CAÑÓN VIOLETA — hills and S-curves
  const t = trackBuilder(202);
  t.add(50, 0, 0);
  t.road(40, 60, 40, -3.4, 60);
  t.road(40, 60, 40, 3.4, -30);
  t.road(50, 80, 50, -2.4, 70);
  t.add(30, 0, 70);
  t.road(60, 80, 60, 0, -140);
  t.road(40, 80, 40, 4.2, 0);
  t.add(40, 0, 0);
  t.road(40, 50, 40, -4.6, 50);
  t.road(40, 50, 40, 4.6, -50);
  t.road(50, 90, 50, 2.8, 80);
  t.road(50, 90, 50, -2.0, -80);
  t.add(60, 0, 0);
  decorate(t, { lightEvery: 30, palmP: 0.25, billP: 0.18, pickupEvery: 240 });
  return { name: () => L.track2, laps: 3, segs: t.segs, tint: "rgba(90,30,160,0.10)", seed: 202 };
}
function buildTrack3() { // AUTOPISTA MEDIANOCHE — fast, sharp, long
  const t = trackBuilder(303);
  t.add(90, 0, 0);
  t.road(30, 40, 30, 5.2, 0);
  t.road(30, 40, 30, -5.2, 0);
  t.add(60, 0, 0);
  t.road(50, 120, 50, 2.0, 90);
  t.road(50, 120, 50, -2.0, -90);
  t.road(30, 30, 30, -5.6, 0);
  t.add(50, 0, 0);
  t.road(40, 80, 40, 3.6, 60);
  t.road(30, 40, 30, -4.8, -60);
  t.road(60, 140, 60, 1.4, 0);
  t.road(30, 40, 30, 5.0, 0);
  t.add(100, 0, 0);
  decorate(t, { lightEvery: 18, palmP: 0.18, billP: 0.22, pickupEvery: 300 });
  return { name: () => L.track3, laps: 3, segs: t.segs, tint: "rgba(8,4,40,0.22)", seed: 303 };
}
const TRACK_BUILDERS = [buildTrack1, buildTrack2, buildTrack3];

/* ================= game state ================= */
let screen = "load"; // load, title, tracks, race, pause, results
let race = null;
let focusIdx = 0;
let uiButtons = [];   // {x,y,w,h,label,cb,disabled}
let shake = 0;
let toast = null;     // {text, t}

function newRace(trackIdx) {
  const track = TRACK_BUILDERS[trackIdx]();
  const N = track.segs.length, len = N * CFG.segLen;
  const rng = mulberry32(1234 + trackIdx);
  const cars = [];
  for (let i = 0; i < CFG.rivals; i++) {
    cars.push({
      img: i % 2 ? "car_rival_b" : "car_rival_a",
      z: (i + 1) * CFG.segLen * 6,           // grid ahead of player
      off: (i % 3 - 1) * 0.62,
      speed: 0,
      top: CFG.maxSpeed * (0.855 + 0.03 * i + rng() * 0.02), // staggered skill
      lap: 0, total: 0, jitterT: rng() * 5,
    });
  }
  return {
    trackIdx, track, N, len,
    z: 0, x: 0, speed: 0, lap: 0,
    nitro: CFG.nitroMax * 0.5, boosting: false,
    time: 0, lapStart: 0, lapTimes: [], bestLapT: null,
    countdown: 3.999, finished: false, finPos: 0, finT: 0,
    pos: CFG.rivals + 1, cars, rng,
    skidCool: 0, crashT: 0, offroadT: 0,
    resultsSaved: false, unlockedNow: false, recordNow: false,
  };
}

/* ================= simulation ================= */
function segAt(track, z) {
  const N = track.segs.length;
  return track.segs[((Math.floor(z / CFG.segLen) % N) + N) % N];
}
function update(dtMs) {
  const dt = dtMs / 1000;
  if (toast) { toast.t -= dt; if (toast.t <= 0) toast = null; }
  shake = Math.max(0, shake - CFG.shakeDecay * dt * shake);

  if (screen !== "race") return;
  const r = race, cmd = commands();

  // countdown
  if (r.countdown > 0) {
    const prev = Math.ceil(r.countdown);
    r.countdown -= dt;
    const now = Math.ceil(Math.max(r.countdown, 0));
    if (now !== prev && now > 0) playSfx("sfx_chime", 0.5, 1.2);
    if (r.countdown <= 0) { playSfx("sfx_chime", 0.9, 1.6); startEngine(); }
    engineUpdate(0.2, true);
    return;
  }
  if (r.countdown > -1.2) r.countdown -= dt; // lets the GO! banner fade out
  if (!r.finished) r.time += dt;

  const seg = segAt(r.track, r.z);
  const speedRatio = r.speed / CFG.maxSpeed;

  // ---- throttle / brake / nitro
  const wantNitro = cmd.nitro && r.nitro > 0 && !r.finished;
  r.boosting = wantNitro;
  const topSpeed = CFG.maxSpeed * (r.boosting ? CFG.nitroSpeedMul : 1);
  if (r.finished) {
    r.speed = Math.max(0, r.speed - CFG.brake * 0.5 * dt); // roll out after the flag
  } else if (cmd.up) {
    r.speed += CFG.accel * (r.boosting ? CFG.nitroAccelMul : 1) * dt;
  } else if (cmd.down) {
    r.speed -= CFG.brake * dt;
  } else {
    r.speed -= CFG.coast * dt;
  }
  if (r.boosting) {
    r.nitro = Math.max(0, r.nitro - CFG.nitroUse * dt);
    r.speed += CFG.accel * 0.5 * dt;
  }
  r.speed = Math.min(Math.max(r.speed, 0), topSpeed);

  // ---- steering + centrifugal
  const steerIn = cmd.steerAnalog !== 0 ? cmd.steerAnalog : (cmd.left ? -1 : 0) + (cmd.right ? 1 : 0);
  const sdx = CFG.steer * dt * (0.35 + 0.65 * speedRatio);
  r.x += steerIn * sdx;
  r.x -= sdx * (speedRatio * seg.curve * CFG.centrifugal);
  r.x = Math.min(Math.max(r.x, -2.4), 2.4);
  r.steerVis = steerIn; // for car lean

  // ---- offroad
  const offroad = Math.abs(r.x) > 1.02;
  if (offroad && r.speed > CFG.offroadLimit) {
    r.speed -= CFG.offroadDecel * dt;
    r.offroadT += dt;
    shake = Math.min(1, shake + dt * 2.5);
    if (r.skidCool <= 0) { playSfx("sfx_skid", 0.45, 0.9); r.skidCool = 0.8; }
  } else r.offroadT = 0;

  // skid squeal on hard cornering at speed
  r.skidCool -= dt;
  if (!offroad && Math.abs(seg.curve) > 3 && speedRatio > 0.78 && Math.abs(steerIn) > 0.5 && r.skidCool <= 0) {
    playSfx("sfx_skid", 0.35, 1.05); r.skidCool = 1.1;
  }

  // ---- roadside decor collision (only when far off the road)
  if (Math.abs(r.x) > 1.25 && r.speed > CFG.crashSpeed) {
    const s2 = segAt(r.track, r.z + CFG.segLen);
    for (const sp of seg.sprites.concat(s2.sprites)) {
      if (Math.abs(sp.off - r.x * 1.0) < 0.5 && Math.sign(sp.off) === Math.sign(r.x)) {
        r.speed = CFG.crashSpeed * 0.5; shake = 1; r.crashT = 0.8;
        playSfx("sfx_crash", 1.0, 1); toast = { text: L.wrecked, t: 1.2 };
        break;
      }
    }
  }
  r.crashT = Math.max(0, r.crashT - dt);

  // ---- advance player
  const prevZ = r.z;
  r.z += r.speed * dt;
  if (r.z >= r.len) {
    r.z -= r.len; r.lap++;
    const lapT = r.time - r.lapStart; r.lapStart = r.time;
    if (r.lap > 0) {
      r.lapTimes.push(lapT);
      if (r.bestLapT === null || lapT < r.bestLapT) r.bestLapT = lapT;
    }
    // reset pickups each lap so nitro stays available
    for (const s of r.track.segs) if (s.pickup) s.pickup.taken = false;
    if (r.lap >= r.track.laps) { finishRace(r); }
    else {
      playSfx("sfx_chime", 0.9, r.lap === r.track.laps - 1 ? 1.5 : 1.0);
      if (r.lap === r.track.laps - 1) toast = { text: L.finalLap, t: 1.6 };
    }
  }

  // ---- pickups (check every segment crossed this tick so none are skipped at speed)
  if (!r.finished) {
    const i0 = Math.floor(prevZ / CFG.segLen), i1 = Math.floor(r.z / CFG.segLen) + 1;
    for (let i = i0; i <= i1; i++) {
      const pseg = r.track.segs[((i % r.N) + r.N) % r.N];
      if (pseg.pickup && !pseg.pickup.taken && Math.abs(pseg.pickup.off - r.x) < 0.42) {
        pseg.pickup.taken = true;
        r.nitro = Math.min(CFG.nitroMax, r.nitro + CFG.nitroGain);
        playSfx("sfx_nitro", 0.5, 1.4); toast = { text: L.pickupNitro, t: 0.8 };
      }
    }
  }

  // ---- rivals AI
  for (const c of r.cars) {
    const cseg = segAt(r.track, c.z);
    c.jitterT += dt;
    const curveSlow = 1 - Math.min(Math.abs(cseg.curve) * 0.045, 0.32);
    // rubber band vs player total distance
    const meTotal = r.lap * r.len + r.z, itTotal = c.lap * r.len + c.z;
    const gap = (meTotal - itTotal) / r.len; // laps of gap
    const band = gap > 0.25 ? 1.09 : gap < -0.25 ? 0.94 : 1;
    const target = c.top * curveSlow * band;
    c.speed += (target - c.speed) * Math.min(1, dt * 1.4);
    // stay on the racing line, drift back to a lane; avoid cars just ahead
    let want = Math.sin(c.jitterT * 0.35) * 0.55 - cseg.curve * 0.05;
    for (const o of r.cars) {
      if (o === c) continue;
      const dz = (o.z - c.z + r.len) % r.len;
      if (dz > 0 && dz < CFG.segLen * 5 && Math.abs(o.off - c.off) < 0.5) want = o.off > c.off ? c.off - 0.7 : c.off + 0.7;
    }
    // avoid the player as well
    {
      const dz = (r.z - c.z + r.len) % r.len;
      if (dz > 0 && dz < CFG.segLen * 5 && Math.abs(r.x - c.off) < 0.5) want = r.x > c.off ? c.off - 0.7 : c.off + 0.7;
    }
    c.off += (Math.min(Math.max(want, -0.95), 0.95) - c.off) * Math.min(1, dt * 1.2);
    c.z += c.speed * dt;
    if (c.z >= r.len) { c.z -= r.len; c.lap++; }
    c.total = c.lap * r.len + c.z;

    // ---- collision with player (bump)
    const dz = c.z - r.z;
    const near = Math.abs(dz) < CFG.segLen * 0.9 || Math.abs(dz + r.len) < CFG.segLen * 0.9 || Math.abs(dz - r.len) < CFG.segLen * 0.9;
    if (!r.finished && near && Math.abs(c.off - r.x) < 0.44) {
      if (r.speed > c.speed) {
        r.speed = Math.max(c.speed * CFG.bumpKeep, CFG.crashSpeed * 0.6);
        shake = Math.min(1, shake + 0.5);
        playSfx("sfx_crash", 0.7, 1.15);
        c.speed *= 1.04;
      }
    }
  }

  // ---- position
  const meTotal = r.lap * r.len + r.z;
  r.pos = 1 + r.cars.filter((c) => c.total > meTotal).length;

  engineUpdate(Math.min(1, r.speed / (CFG.maxSpeed * CFG.nitroSpeedMul)), true);
}

function finishRace(r) {
  r.finished = true; r.finPos = r.pos; r.finT = r.time;
  stopEngine();
  playSfx("sfx_chime", 1.0, 0.8);
  // records + unlocks
  const key = "t" + r.trackIdx;
  if (!r.resultsSaved) {
    r.resultsSaved = true;
    if (save.best[key] === undefined || r.finT < save.best[key]) { save.best[key] = r.finT; r.recordNow = true; }
    if (r.bestLapT !== null && (save.bestLap[key] === undefined || r.bestLapT < save.bestLap[key])) save.bestLap[key] = r.bestLapT;
    if (r.finPos <= 3 && r.trackIdx + 1 < TRACK_BUILDERS.length && save.unlocked < r.trackIdx + 2) {
      save.unlocked = r.trackIdx + 2; r.unlockedNow = true;
    }
    persist();
  }
  setTimeout(() => { if (screen === "race") screen = "results"; }, 1600);
}

/* ================= projection & rendering ================= */
const spriteQ = []; // reused; {img,x,y,w,h,clip, isPickup, pulse}
function project(x, y, z, camX, camY, camZ, w2, h2) {
  const dz = Math.max(z - camZ, 0.01);
  const scale = CFG.camDepth / (dz / CFG.segLen);
  return {
    x: w2 + scale * (x - camX) * w2 / CFG.segLen * CFG.lateral,
    y: h2 - scale * (y - camY) * h2 / CFG.segLen,
    w: scale * CFG.roadW * w2 / CFG.segLen * CFG.lateral,
    scale,
  };
}
let drawCount = 0;

function renderRace() {
  const r = race;
  drawCount = 0;
  const w2 = W / 2, h2 = H / 2;
  const baseI = Math.floor(r.z / CFG.segLen);
  const basePct = (r.z % CFG.segLen) / CFG.segLen;
  const N = r.N, segs = r.track.segs;
  const baseSeg = segs[baseI % N];
  const playerY = baseSeg.y1 + (baseSeg.y2 - baseSeg.y1) * basePct;
  const camY = playerY + CFG.camH;
  const camX = r.x * CFG.roadW;

  // shake offset
  let shx = 0, shy = 0;
  if (save.fx && shake > 0.02) {
    shx = (Math.random() * 2 - 1) * 14 * shake;
    shy = (Math.random() * 2 - 1) * 10 * shake;
  }
  ctx.save();
  ctx.translate(shx, shy);

  // ----- sky
  const bg = IMG.bg_sky;
  const curveNow = baseSeg.curve;
  const skyBottom = h2 * 1.12; // road horizon always sits just below h2, so the sky covers it
  ctx.fillStyle = PAL.skyTop; ctx.fillRect(0, 0, W, skyBottom);
  if (bg) {
    const asp = bg.width / bg.height;
    let bh = skyBottom + 8, bw = bh * asp;
    if (bw < W * 1.25) { bw = W * 1.25; bh = bw / asp; }
    let bx = W / 2 - bw / 2 - curveNow * 16 - r.x * 26;
    bx = Math.min(0, Math.max(W - bw, bx)); // parallax clamped so the sky always covers the screen
    ctx.drawImage(bg, bx, skyBottom - bh, bw, bh); drawCount++;
  } else {
    const g = ctx.createLinearGradient(0, 0, 0, skyBottom);
    g.addColorStop(0, PAL.skyTop); g.addColorStop(1, PAL.horizon);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, skyBottom);
  }

  // ----- road segments
  spriteQ.length = 0;
  let x = 0, dx = -(baseSeg.curve * basePct);
  let maxY = H + 40;
  let prevX = null, prevY = null, prevW = null;
  for (let n = 0; n < CFG.drawDist; n++) {
    const i = (baseI + n) % N;
    const seg = segs[i];
    const worldZ = n * CFG.segLen - basePct * CFG.segLen;

    // project this segment's near and far edges (x/dx accumulate the curve in world units)
    const pf = project(-camX + x + dx, seg.y2, worldZ + CFG.segLen, 0, camY, 0, w2, h2);
    const pn = project(-camX + x, seg.y1, worldZ, 0, camY, 0, w2, h2);
    x += dx; dx += seg.curve;

    if (n === 0) { prevX = pn.x; prevY = Math.min(pn.y, H + 40); prevW = pn.w; }
    const fy = pf.y, fx = pf.x, fw = pf.w;
    const ny = prevY, nx = prevX, nw = prevW;
    prevX = fx; prevY = fy; prevW = fw;

    if (fy >= maxY || fy >= ny) {
      // still queue sprites (they may poke above the hill crest)
      queueSprites(seg, fx, fy, fw, maxY, n, i, r);
      continue;
    }

    const light = Math.floor(i / CFG.rumble) % 2 === 0;
    const fog = save.fx ? Math.min(1, n / CFG.drawDist * 1.15) : Math.min(1, n / CFG.drawDist);

    // grass strip
    ctx.fillStyle = light ? PAL.grassA : PAL.grassB;
    ctx.fillRect(0, fy, W, ny - fy); drawCount++;
    // road trapezoid
    poly(nx - nw, ny, nx + nw, ny, fx + fw, fy, fx - fw, fy, light ? PAL.roadA : PAL.roadB);
    // rumble strips
    const rw1 = nw * 0.14, rw2 = fw * 0.14;
    poly(nx - nw - rw1, ny, nx - nw, ny, fx - fw, fy, fx - fw - rw2, fy, light ? PAL.rumbleA : PAL.rumbleB);
    poly(nx + nw, ny, nx + nw + rw1, ny, fx + fw + rw2, fy, fx + fw, fy, light ? PAL.rumbleA : PAL.rumbleB);
    // lane lines
    if (light) {
      const lanes = CFG.lanes;
      for (let l = 1; l < lanes; l++) {
        const lx1 = nx - nw + (2 * nw) * (l / lanes), lx2 = fx - fw + (2 * fw) * (l / lanes);
        const lw1 = nw * 0.018 + 1, lw2 = fw * 0.018 + 1;
        poly(lx1 - lw1, ny, lx1 + lw1, ny, lx2 + lw2, fy, lx2 - lw2, fy, PAL.lane);
      }
    }
    // start/finish stripe
    if (i < 2) poly(nx - nw, ny, nx + nw, ny, fx + fw, fy, fx - fw, fy, i % 2 ? "#f5ecd7" : "#1a1040");
    // fog
    if (fog > 0.45) {
      ctx.globalAlpha = Math.min(0.5, (fog - 0.45) * 0.9);
      ctx.fillStyle = PAL.fog;
      ctx.fillRect(0, fy, W, ny - fy);
      ctx.globalAlpha = 1;
    }

    queueSprites(seg, fx, fy, fw, maxY, n, i, r);
    maxY = fy;
  }

  // ----- rival cars into the queue
  for (const c of r.cars) {
    let dz = c.z - r.z;
    if (dz < -r.len / 2) dz += r.len;
    if (dz > r.len / 2) dz -= r.len;
    if (dz < CFG.segLen * 0.4 || dz > CFG.drawDist * CFG.segLen * 0.95) continue;
    // accumulate curve offset up to the car's segment
    const cn = Math.floor((dz + basePct * CFG.segLen) / CFG.segLen);
    let cx2 = 0, cdx = -(baseSeg.curve * basePct);
    for (let k = 0; k < cn && k < CFG.drawDist; k++) { cx2 += cdx; cdx += segs[(baseI + k) % N].curve; }
    const cseg = segAt(r.track, c.z);
    const cy = cseg.y1;
    const p = project(-camX + cx2 + c.off * CFG.roadW, cy, dz, 0, camY, 0, w2, h2);
    if (p.y > 0 && p.y < H + 200) {
      const im = IMG[c.img];
      const cw = p.w * 0.42, chh = cw * (im ? im.height / im.width : 0.6);
      spriteQ.push({ img: c.img, x: p.x - cw / 2, y: p.y - chh, w: cw, h: chh, clip: 0, pickup: false, d: dz });
    }
  }

  // draw queued sprites far -> near
  spriteQ.sort((a, b) => b.d - a.d);
  for (const s of spriteQ) {
    if (s.pickup) { drawOrb(s.x, s.y, s.w); drawCount++; continue; }
    const im = IMG[s.img];
    if (!im) continue;
    const clipY = s.clip;
    if (clipY && s.y + s.h > clipY) {
      const vis = Math.max(0, clipY - s.y);
      if (vis <= 1) continue;
      ctx.drawImage(im, 0, 0, im.width, im.height * (vis / s.h), s.x, s.y, s.w, vis);
    } else {
      ctx.drawImage(im, s.x, s.y, s.w, s.h);
    }
    drawCount++;
  }

  // ----- track tint overlay (per-track mood within the formula palette)
  if (r.track.tint) { ctx.fillStyle = r.track.tint; ctx.fillRect(0, 0, W, H); }

  // ----- speed lines while boosting
  if (save.fx && r.boosting && r.countdown <= 0) {
    ctx.strokeStyle = "rgba(34,230,255,0.35)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + (r.time * 7 % (Math.PI * 2));
      const rr = Math.min(W, H) * 0.45;
      ctx.beginPath();
      ctx.moveTo(w2 + Math.cos(a) * rr * 0.62, h2 + Math.sin(a) * rr * 0.62);
      ctx.lineTo(w2 + Math.cos(a) * rr, h2 + Math.sin(a) * rr);
      ctx.stroke();
    }
    drawCount++;
  }

  // ----- player car
  drawPlayer(r, w2);

  ctx.restore();

  // ----- HUD (unshaken)
  drawHud(r);

  // countdown overlay
  if (r.countdown > 0) {
    dim(0.35);
    const n = Math.ceil(r.countdown);
    bigText(n > 3 ? "" : String(n), w2, H * 0.4, Math.min(W, H) * 0.2, PAL.cyan);
  } else if (r.countdown > -1) {
    bigText(L.go, w2, H * 0.4, Math.min(W, H) * 0.16, PAL.accent);
    race.countdown -= 0; // fades via time; handled below
  }
  if (r.finished && screen === "race") {
    dim(0.25);
    bigText(L.finished, w2, H * 0.4, Math.min(W, H) * 0.14, PAL.gold);
  }
  if (toast) bigText(toast.text, w2, H * 0.3, Math.min(W, H) * 0.07, PAL.cyan);
}

function queueSprites(seg, fx, fy, fw, maxY, n, i, r) {
  for (const sp of seg.sprites) {
    const im = IMG[sp.img];
    if (!im) continue;
    const sw = fw * (sp.img === "billboard" ? 0.62 : sp.img === "palm" ? 0.55 : 0.34);
    const sh = sw * (im.height / im.width);
    const sx = fx + fw * sp.off - sw / 2;
    spriteQ.push({ img: sp.img, x: sx, y: fy - sh, w: sw, h: sh, clip: maxY, pickup: false, d: n * CFG.segLen });
  }
  if (seg.pickup && !seg.pickup.taken) {
    const sw = fw * 0.09;
    spriteQ.push({ img: null, x: fx + fw * seg.pickup.off, y: fy - sw * 1.4, w: sw, clip: maxY, pickup: true, d: n * CFG.segLen });
  }
}

function poly(x1, y1, x2, y2, x3, y3, x4, y4, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.lineTo(x4, y4);
  ctx.closePath(); ctx.fill();
  drawCount++;
}

// nitro pickup — procedural, electric-cyan glow per the STYLE FORMULA signal hue
function drawOrb(x, y, s) {
  const t = performance.now() / 300;
  const pulse = 1 + Math.sin(t + x) * 0.12;
  const rr = Math.max(2, s * pulse);
  const g = ctx.createRadialGradient(x, y, 0, x, y, rr * 2);
  g.addColorStop(0, "rgba(210,255,255,0.95)");
  g.addColorStop(0.35, "rgba(34,230,255,0.85)");
  g.addColorStop(1, "rgba(34,230,255,0)");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, rr * 2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#bffcff";
  ctx.beginPath(); ctx.arc(x, y, rr * 0.55, 0, Math.PI * 2); ctx.fill();
}

function drawPlayer(r, w2) {
  const im = IMG.car_player;
  const base = Math.min(W, H);
  const cw = base * 0.42;
  const chh = im ? cw * (im.height / im.width) : cw * 0.55;
  const bounce = (save.fx ? 1 : 0) * Math.sin(performance.now() / 45) * (r.speed / CFG.maxSpeed) * 2.2;
  const cx = w2, cy = H - chh * 0.5 - H * 0.02 + bounce;
  const lean = (r.steerVis || 0) * 0.055 + segAt(r.track, r.z).curve * 0.006 * (r.speed / CFG.maxSpeed);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(lean);
  // shadow
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath(); ctx.ellipse(0, chh * 0.42, cw * 0.44, chh * 0.1, 0, 0, Math.PI * 2); ctx.fill();
  if (im) ctx.drawImage(im, -cw / 2, -chh / 2, cw, chh);
  else { ctx.fillStyle = "#ff5a4d"; ctx.fillRect(-cw / 2, -chh / 4, cw, chh / 2); }
  // nitro flame
  if (r.boosting && r.countdown <= 0 && !r.finished) {
    const f = ctx.createRadialGradient(0, chh * 0.42, 0, 0, chh * 0.42, cw * 0.2);
    f.addColorStop(0, "rgba(210,255,255,0.9)"); f.addColorStop(1, "rgba(34,230,255,0)");
    ctx.fillStyle = f;
    ctx.beginPath(); ctx.arc(0, chh * 0.42, cw * 0.2, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
  drawCount += 2;
}

/* ================= HUD & UI helpers ================= */
function font(px, bold = true, italic = false) {
  ctx.font = `${italic ? "italic " : ""}${bold ? "900 " : ""}${Math.round(px)}px "Arial Black","Segoe UI",Arial,sans-serif`;
}
function bigText(t, x, y, px, color) {
  if (!t) return;
  font(px, true, true);
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(18,11,46,0.8)";
  ctx.fillText(t, x + px * 0.045, y + px * 0.045);
  ctx.fillStyle = color;
  ctx.fillText(t, x, y);
}
function dim(a) { ctx.fillStyle = `rgba(10,6,30,${a})`; ctx.fillRect(0, 0, W, H); }
function fmtT(s) {
  if (s === undefined || s === null) return "--:--.--";
  const m = Math.floor(s / 60), ss = s - m * 60;
  return `${m}:${ss.toFixed(2).padStart(5, "0")}`;
}

function drawHud(r) {
  const base = Math.min(W, H);
  const pad = base * 0.02;
  font(base * 0.055, true, true);
  ctx.textBaseline = "top";
  // speed
  const kmh = Math.round(r.speed / CFG.maxSpeed * CFG.kmhTop);
  ctx.textAlign = "right";
  ctx.fillStyle = PAL.hudText;
  ctx.fillText(String(kmh), W - pad - base * 0.09, H - pad - base * 0.075);
  font(base * 0.028, true, false);
  ctx.fillStyle = PAL.dim;
  ctx.fillText(L.kmh, W - pad, H - pad - base * 0.06);
  // top bar: lap / pos / time
  font(base * 0.036, true, false);
  ctx.textAlign = "left";
  ctx.fillStyle = PAL.hudBg;
  ctx.fillRect(0, 0, W, base * 0.062);
  ctx.fillStyle = PAL.hudText;
  ctx.fillText(`${L.lap} ${Math.min(r.lap + 1, r.track.laps)}/${r.track.laps}`, pad, base * 0.014);
  ctx.textAlign = "center";
  ctx.fillStyle = r.pos <= 3 ? PAL.gold : PAL.hudText;
  ctx.fillText(`${L.pos} ${r.pos}/${CFG.rivals + 1}`, W / 2, base * 0.014);
  ctx.textAlign = "right";
  ctx.fillStyle = PAL.hudText;
  ctx.fillText(fmtT(r.time), W - pad, base * 0.014);
  // nitro bar
  const nw = base * 0.3, nh = base * 0.022, nx = pad, ny = H - pad - nh;
  ctx.fillStyle = PAL.hudBg; ctx.fillRect(nx - 2, ny - 2, nw + 4, nh + 4);
  ctx.fillStyle = PAL.cyan;
  ctx.fillRect(nx, ny, nw * (r.nitro / CFG.nitroMax), nh);
  font(base * 0.024, true, false);
  ctx.textAlign = "left"; ctx.fillStyle = PAL.dim;
  ctx.fillText(L.nitro, nx, ny - base * 0.032);

  // touch controls
  touchBtns.length = 0;
  if (touchDevice && !r.finished) {
    const bs = Math.min(W, H) * 0.15, m = pad;
    const y = H - bs - m - nh - pad * 1.5;
    touchBtn("left", m, y, bs, "◀");
    touchBtn("right", m + bs * 1.15, y, bs, "▶");
    touchBtn("brake", W - bs * 2.3 - m, y, bs, L.brake, base * 0.026);
    touchBtn("gas", W - bs * 1.15 - m, y, bs, L.gas, base * 0.026);
    touchBtn("nitro", W - bs * 1.15 - m, y - bs * 1.2, bs, "⚡");
  }
  // pause button
  touchBtn("pauseBtn", W - base * 0.075, base * 0.075 + 6, base * 0.06, "II", base * 0.03);
}
function touchBtn(name, x, y, s, label, lpx) {
  touchBtns.push({ name, x, y, w: s, h: s });
  ctx.fillStyle = "rgba(18,11,46,0.55)";
  ctx.strokeStyle = touchCtl(name) ? PAL.cyan : "rgba(245,236,215,0.5)";
  ctx.lineWidth = 2;
  roundRect(x, y, s, s, s * 0.2); ctx.fill(); ctx.stroke();
  font(lpx || s * 0.4, true, false);
  ctx.fillStyle = PAL.hudText; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(label, x + s / 2, y + s / 2);
  ctx.textBaseline = "top";
}
function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/* ================= menu screens ================= */
function uiTap(x, y) {
  if (screen === "race") {
    // pause button handled through touchBtns; taps elsewhere ignored during race
    const hit = touchHit(x, y);
    if (hit === "pauseBtn") togglePause();
    return;
  }
  for (let i = 0; i < uiButtons.length; i++) {
    const b = uiButtons[i];
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
      if (b.disabled) return;
      focusIdx = i; interact(); b.cb();
      return;
    }
  }
}
function menuNav() {
  while (pressedQueue.length) {
    const c = pressedQueue.shift();
    if (screen === "race") {
      if (c === "pause") togglePause();
      continue;
    }
    const en = uiButtons.filter((b) => !b.disabled);
    if (!en.length) continue;
    if (c === "up" || c === "left") { focusIdx = (focusIdx - 1 + uiButtons.length) % uiButtons.length; while (uiButtons[focusIdx].disabled) focusIdx = (focusIdx - 1 + uiButtons.length) % uiButtons.length; playSfx("sfx_chime", 0.15, 2); }
    if (c === "down" || c === "right") { focusIdx = (focusIdx + 1) % uiButtons.length; while (uiButtons[focusIdx].disabled) focusIdx = (focusIdx + 1) % uiButtons.length; playSfx("sfx_chime", 0.15, 2); }
    if (c === "ok") { const b = uiButtons[focusIdx]; if (b && !b.disabled) b.cb(); }
    if (c === "pause" || c === "back") {
      if (screen === "pause") togglePause();
      else if (screen === "tracks") { screen = "title"; focusIdx = 0; }
    }
  }
}
function button(label, x, y, w, h, cb, opts = {}) {
  const i = uiButtons.length;
  uiButtons.push({ x, y, w, h, cb, disabled: !!opts.disabled });
  const focused = i === focusIdx;
  ctx.fillStyle = opts.disabled ? "rgba(30,22,63,0.6)" : focused ? "rgba(255,46,151,0.25)" : PAL.hudBg;
  ctx.strokeStyle = opts.disabled ? "rgba(143,134,201,0.35)" : focused ? PAL.accent : "rgba(245,236,215,0.45)";
  ctx.lineWidth = focused ? 3 : 2;
  roundRect(x, y, w, h, h * 0.24); ctx.fill(); ctx.stroke();
  font(opts.px || h * 0.4, true, false);
  ctx.fillStyle = opts.disabled ? PAL.dim : PAL.hudText;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(label, x + w / 2, y + h / 2 + 1);
  if (opts.sub) {
    font(h * 0.2, false, false);
    ctx.fillStyle = PAL.dim;
    ctx.fillText(opts.sub, x + w / 2, y + h + h * 0.18);
  }
  ctx.textBaseline = "top";
}

function drawBgMenu() {
  touchBtns.length = 0; // no race touch zones may linger over menus
  const bg = IMG.bg_sky;
  if (bg) {
    const s = Math.max(W / bg.width, H / bg.height);
    ctx.drawImage(bg, (W - bg.width * s) / 2, (H - bg.height * s) / 2, bg.width * s, bg.height * s);
  } else { ctx.fillStyle = PAL.skyTop; ctx.fillRect(0, 0, W, H); }
  dim(0.35);
}

function renderTitle() {
  uiButtons.length = 0;
  drawBgMenu();
  const base = Math.min(W, H);
  const logo = IMG.logo;
  let logoBottom = H * 0.34;
  if (logo) {
    const ratio = logo.height / logo.width;
    let lh = H * 0.38, lw = lh / ratio;
    if (lw > W * 0.8) { lw = W * 0.8; lh = lw * ratio; }
    ctx.drawImage(logo, W / 2 - lw / 2, H * 0.04, lw, lh);
    logoBottom = H * 0.04 + lh;
  } else bigText("NEON RUSH", W / 2, H * 0.2, base * 0.11, PAL.accent);
  font(base * 0.028, false, true);
  ctx.textAlign = "center"; ctx.fillStyle = PAL.hudText;
  ctx.fillText(L.tagline, W / 2, logoBottom + base * 0.012);

  const bw = Math.min(W * 0.7, base * 0.75), bh = base * 0.072, bx = W / 2 - bw / 2;
  let by = Math.max(H * 0.5, logoBottom + base * 0.06);
  button(L.play, bx, by, bw, bh, () => { screen = "tracks"; focusIdx = 0; }); by += bh * 1.28;
  button(save.lang === "es" ? STR.es.language : STR.en.language, bx, by, bw, bh, () => {
    save.lang = save.lang === "es" ? "en" : "es"; L = STR[save.lang]; persist();
  }); by += bh * 1.28;
  button(save.sound ? L.sound_on : L.sound_off, bx, by, bw, bh, () => { save.sound = !save.sound; persist(); applySound(); }); by += bh * 1.28;
  button(save.fx ? L.fx_on : L.fx_off, bx, by, bw, bh, () => { save.fx = !save.fx; persist(); }); by += bh * 1.28;

  font(base * 0.022, false, false);
  ctx.fillStyle = PAL.dim; ctx.textAlign = "center";
  ctx.fillText(touchDevice ? L.controlsTouch : L.controlsKeys, W / 2, H - base * 0.062);
  if (!touchDevice) ctx.fillText(L.controlsPad, W / 2, H - base * 0.038);
  ctx.fillText(L.madeWith, W / 2, H - base * 0.014);
}

function renderTracks() {
  uiButtons.length = 0;
  drawBgMenu();
  const base = Math.min(W, H);
  bigText(L.selectTrack, W / 2, H * 0.1, base * 0.06, PAL.hudText);
  const names = [L.track1, L.track2, L.track3];
  const bw = Math.min(W * 0.78, base * 0.9), bh = base * 0.1, bx = W / 2 - bw / 2;
  let by = H * 0.22;
  for (let i = 0; i < TRACK_BUILDERS.length; i++) {
    const locked = i + 1 > save.unlocked;
    const best = save.best["t" + i];
    const sub = locked ? L.lockedHint : `${L.best}: ${best !== undefined ? fmtT(best) : L.noBest}`;
    button(locked ? `🔒 ${names[i]}` : names[i], bx, by, bw, bh, () => startRace(i), { disabled: locked, sub, px: bh * 0.32 });
    by += bh * 1.6;
  }
  button(L.back, bx, by + bh * 0.2, bw, bh * 0.8, () => { screen = "title"; focusIdx = 0; }, { px: bh * 0.3 });
}

function renderPause() {
  renderRace();
  dim(0.55);
  uiButtons.length = 0;
  const base = Math.min(W, H);
  bigText(L.paused, W / 2, H * 0.22, base * 0.08, PAL.cyan);
  const bw = Math.min(W * 0.6, base * 0.7), bh = base * 0.085, bx = W / 2 - bw / 2;
  let by = H * 0.38;
  button(L.resume, bx, by, bw, bh, togglePause); by += bh * 1.35;
  button(L.restart, bx, by, bw, bh, () => startRace(race.trackIdx)); by += bh * 1.35;
  button(save.sound ? L.sound_on : L.sound_off, bx, by, bw, bh, () => { save.sound = !save.sound; persist(); applySound(); }); by += bh * 1.35;
  button(L.exit, bx, by, bw, bh, exitToMenu);
}

function renderResults() {
  drawBgMenu();
  uiButtons.length = 0;
  const r = race, base = Math.min(W, H);
  bigText(L.results, W / 2, H * 0.1, base * 0.065, PAL.hudText);
  font(base * 0.075, true, true);
  ctx.textAlign = "center";
  ctx.fillStyle = r.finPos === 1 ? PAL.gold : r.finPos <= 3 ? PAL.cyan : PAL.hudText;
  ctx.fillText(`${L.position}: ${r.finPos}/${CFG.rivals + 1}`, W / 2, H * 0.2);
  font(base * 0.042, true, false);
  ctx.fillStyle = PAL.hudText;
  ctx.fillText(`${L.totalTime}: ${fmtT(r.finT)}`, W / 2, H * 0.32);
  ctx.fillText(`${L.bestLap}: ${fmtT(r.bestLapT)}`, W / 2, H * 0.38);
  let msgY = H * 0.46;
  if (r.recordNow) { bigText(L.newRecord, W / 2, msgY, base * 0.045, PAL.gold); msgY += base * 0.06; }
  if (r.unlockedNow) bigText(L.unlocked, W / 2, msgY, base * 0.045, PAL.cyan);

  const bw = Math.min(W * 0.6, base * 0.7), bh = base * 0.08, bx = W / 2 - bw / 2;
  let by = H * 0.58;
  button(L.retry, bx, by, bw, bh, () => startRace(r.trackIdx)); by += bh * 1.3;
  const hasNext = r.trackIdx + 1 < TRACK_BUILDERS.length;
  if (hasNext) { button(L.next, bx, by, bw, bh, () => startRace(r.trackIdx + 1), { disabled: r.trackIdx + 2 > save.unlocked }); by += bh * 1.3; }
  button(L.menu, bx, by, bw, bh, exitToMenu);
}

function renderLoad() {
  ctx.fillStyle = PAL.skyTop; ctx.fillRect(0, 0, W, H);
  const base = Math.min(W, H);
  const p = loadDone / loadTotal;
  bigText("NEON RUSH", W / 2, H * 0.4, base * 0.09, PAL.accent);
  const bw = W * 0.5, bh = base * 0.02, bx = W / 2 - bw / 2, by = H * 0.55;
  ctx.fillStyle = PAL.hudBg; ctx.fillRect(bx - 2, by - 2, bw + 4, bh + 4);
  ctx.fillStyle = PAL.cyan; ctx.fillRect(bx, by, bw * p, bh);
  font(base * 0.03, true, false);
  ctx.textAlign = "center"; ctx.fillStyle = PAL.dim;
  ctx.fillText(p >= 1 ? L.tapToStart : L.loading, W / 2, by + bh + base * 0.03);
  if (p >= 1) { uiButtons.length = 0; uiButtons.push({ x: 0, y: 0, w: W, h: H, cb: enterTitle }); }
}

function enterTitle() {
  if (screen !== "load" || loadDone < loadTotal) return;
  audioInit();
  decodeAll().then(() => { startMusic(); });
  screen = "title"; focusIdx = 0;
}
function interact() { if (screen === "load" && loadDone >= loadTotal) { /* handled by uiTap */ } }

function startRace(idx) {
  race = newRace(idx);
  screen = "race"; focusIdx = 0; toast = null; shake = 0;
  stopEngine();
}
function exitToMenu() { stopEngine(); race = null; screen = "tracks"; focusIdx = 0; }
function togglePause() {
  if (screen === "race" && race && !race.finished) { screen = "pause"; focusIdx = 0; stopEngine(); }
  else if (screen === "pause") { screen = "race"; startEngine(); }
}

/* ================= main loop ================= */
let acc = 0, last = performance.now(), blurPaused = false;
let frames = 0, fpsAt = last, fps = 0, frameMs = 0;
addEventListener("blur", () => { blurPaused = true; if (screen === "race") togglePause(); });
addEventListener("focus", () => { blurPaused = false; last = performance.now(); });
document.addEventListener("visibilitychange", () => {
  if (document.hidden && screen === "race") togglePause();
  last = performance.now();
});

const dev = new URLSearchParams(location.search).has("dev");
const devEl = document.getElementById("dev");
if (dev) {
  devEl.style.display = "block";
  // dev-only test hook: warp near the finish line to exercise lap/finish flow
  window.__nr = {
    warp() { if (race) { race.lap = race.track.laps - 1; race.z = race.len - 2500; } },
    state: () => ({ screen, lap: race && race.lap, pos: race && race.pos, fin: race && race.finished }),
  };
}

function frame(now) {
  requestAnimationFrame(frame);
  const t0 = performance.now();
  acc += now - last; last = now;
  if (acc > 250) acc = 250; // spiral-of-death guard
  pollPads();
  menuNav();
  while (acc >= CFG.stepMs) { update(CFG.stepMs); acc -= CFG.stepMs; }

  ctx.clearRect(0, 0, W, H);
  switch (screen) {
    case "load": renderLoad(); break;
    case "title": renderTitle(); break;
    case "tracks": renderTracks(); break;
    case "race": renderRace(); break;
    case "pause": renderPause(); break;
    case "results": renderResults(); break;
  }
  frameMs = performance.now() - t0;
  if (dev) {
    frames++;
    if (now - fpsAt >= 500) { fps = Math.round(frames * 1000 / (now - fpsAt)); frames = 0; fpsAt = now; }
    devEl.textContent = `${fps} fps  ${frameMs.toFixed(1)} ms\ndraws ${drawCount}  sprites ${spriteQ.length}`;
  }
}

/* ================= boot ================= */
Promise.all([...IMG_LIST.map(loadImage), ...SND_LIST.map(loadSound)]).then(() => {});
requestAnimationFrame(frame);
