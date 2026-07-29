/* Estado persistente: ajustes, progreso, pelotas y misiones. Todo en localStorage. */

const KEY = 'helix3d.v1';

/* 27 pelotas, como en el original. Se desbloquean por nivel alcanzado y monedas. */
export const SKINS = [
  { id:'classic',  name:'CLASSIC',  color:0xf4f6fa, metal:0.05, rough:0.28, rarity:'common',    cost:0,    lvl:1  },
  { id:'coral',    name:'CORAL',    color:0xff6b6b, metal:0.05, rough:0.35, rarity:'common',    cost:60,   lvl:1  },
  { id:'mint',     name:'MINT',     color:0x4dd6c8, metal:0.05, rough:0.35, rarity:'common',    cost:60,   lvl:1  },
  { id:'lemon',    name:'LEMON',    color:0xffd23f, metal:0.05, rough:0.35, rarity:'common',    cost:60,   lvl:2  },
  { id:'grape',    name:'GRAPE',    color:0x8f7bf0, metal:0.05, rough:0.35, rarity:'common',    cost:80,   lvl:2  },
  { id:'sky',      name:'SKY',      color:0x4fc3f7, metal:0.05, rough:0.35, rarity:'common',    cost:80,   lvl:3  },
  { id:'lime',     name:'LIME',     color:0xa0e548, metal:0.05, rough:0.35, rarity:'common',    cost:80,   lvl:3  },
  { id:'bubble',   name:'BUBBLE',   color:0xff8fd0, metal:0.05, rough:0.35, rarity:'common',    cost:100,  lvl:4  },

  { id:'steel',    name:'STEEL',    color:0xc9d2dc, metal:0.95, rough:0.22, rarity:'rare',      cost:180,  lvl:4  },
  { id:'copper',   name:'COPPER',   color:0xd98a4b, metal:0.95, rough:0.28, rarity:'rare',      cost:180,  lvl:5  },
  { id:'gold',     name:'GOLD',     color:0xffc23c, metal:1.0,  rough:0.16, rarity:'rare',      cost:220,  lvl:6  },
  { id:'obsidian', name:'OBSIDIAN', color:0x1d2230, metal:0.7,  rough:0.12, rarity:'rare',      cost:220,  lvl:7  },
  { id:'pearl',    name:'PEARL',    color:0xf2e9dd, metal:0.55, rough:0.08, rarity:'rare',      cost:240,  lvl:8  },
  { id:'jade',     name:'JADE',     color:0x2fae7a, metal:0.6,  rough:0.18, rarity:'rare',      cost:240,  lvl:9  },
  { id:'ruby',     name:'RUBY',     color:0xc4213c, metal:0.8,  rough:0.14, rarity:'rare',      cost:260,  lvl:10 },
  { id:'sapphire', name:'SAPPHIRE', color:0x2a55c9, metal:0.8,  rough:0.14, rarity:'rare',      cost:260,  lvl:11 },

  { id:'neon',     name:'NEON',     color:0x18ffd5, metal:0.2,  rough:0.3,  emissive:0x18ffd5, glow:0.7, rarity:'epic', cost:420, lvl:12 },
  { id:'magma',    name:'MAGMA',    color:0xff4d17, metal:0.3,  rough:0.4,  emissive:0xff3300, glow:0.8, rarity:'epic', cost:420, lvl:13 },
  { id:'plasma',   name:'PLASMA',   color:0xc23cff, metal:0.2,  rough:0.3,  emissive:0xa020ff, glow:0.7, rarity:'epic', cost:460, lvl:14 },
  { id:'toxic',    name:'TOXIC',    color:0x9bff2e, metal:0.2,  rough:0.3,  emissive:0x76ff00, glow:0.7, rarity:'epic', cost:460, lvl:15 },
  { id:'frost',    name:'FROST',    color:0xa8e9ff, metal:0.4,  rough:0.1,  emissive:0x40c9ff, glow:0.5, rarity:'epic', cost:500, lvl:16 },
  { id:'ember',    name:'EMBER',    color:0xffb347, metal:0.3,  rough:0.35, emissive:0xff7a00, glow:0.6, rarity:'epic', cost:500, lvl:17 },
  { id:'void',     name:'VOID',     color:0x120c22, metal:0.6,  rough:0.2,  emissive:0x5b21b6, glow:0.6, rarity:'epic', cost:540, lvl:18 },

  { id:'aurora',   name:'AURORA',   color:0x7df9ff, metal:0.5,  rough:0.12, emissive:0x00ffa3, glow:0.9,  rarity:'legendary', cost:900,  lvl:20 },
  { id:'solar',    name:'SOLAR',    color:0xfff1a8, metal:0.4,  rough:0.15, emissive:0xffb300, glow:1.1,  rarity:'legendary', cost:1000, lvl:24 },
  { id:'quantum',  name:'QUANTUM',  color:0xe8f0ff, metal:1.0,  rough:0.04, emissive:0x4fa3ff, glow:0.8,  rarity:'legendary', cost:1200, lvl:28 },
  { id:'helix',    name:'HELIX',    color:0xffffff, metal:0.9,  rough:0.06, emissive:0xff2fb0, glow:1.2,  rarity:'legendary', cost:1500, lvl:32 }
];
export const skinById = id => SKINS.find(s => s.id === id) || SKINS[0];

export const TRACKS = [
  { id:'none',    key:'track.none' },
  { id:'aero',    key:'track.aero' },
  { id:'rooftop', key:'track.rooftop' }
];

/* Cada mision escala su objetivo cada vez que se cobra, asi nunca se agotan. */
const MISSION_POOL = [
  { key:'mission.rings',  stat:'rings',  base:40, step:25, reward:70  },
  { key:'mission.coins',  stat:'coins',  base:25, step:15, reward:80  },
  { key:'mission.combo',  stat:'combo',  base:4,  step:1,  reward:120, single:true },
  { key:'mission.levels', stat:'levels', base:2,  step:2,  reward:150 },
  { key:'mission.fire',   stat:'fire',   base:3,  step:2,  reward:110 },
  { key:'mission.smash',  stat:'smash',  base:10, step:8,  reward:100 }
];
export const missionDef = key => MISSION_POOL.find(m => m.key === key);

const DEFAULTS = () => ({
  lang: null,                       // null = aun no elegido -> se muestra el selector
  music: 0.55, sfx: 0.8, track: 'aero',
  quality: 'high', haptics: true, invert: false, sens: 1,
  level: 1, best: 0, coins: 0,
  skin: 'classic', owned: ['classic'],
  tier: 0,                          // cuantas veces se ha reciclado cada mision
  missions: null,
  totals: { rings:0, coins:0, levels:0, fire:0, smash:0, bestCombo:0 }
});

export const state = DEFAULTS();

export function load(){
  let raw = null;
  try { raw = localStorage.getItem(KEY); } catch (e) { /* modo privado: se juega sin guardar */ }
  if (raw){
    try {
      const saved = JSON.parse(raw);
      for (const k in state) if (k in saved) state[k] = saved[k];
      state.totals = Object.assign(DEFAULTS().totals, state.totals || {});
      if (!Array.isArray(state.owned) || !state.owned.length) state.owned = ['classic'];
      if (!skinById(state.skin) || !state.owned.includes(state.skin)) state.skin = 'classic';
    } catch (e) { /* guardado corrupto: se empieza limpio */ }
  }
  if (!state.missions || !state.missions.length) rollMissions();
  return state;
}

export function save(){
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* sin persistencia */ }
}

export function wipe(){
  const keep = { lang: state.lang, music: state.music, sfx: state.sfx, track: state.track,
                 quality: state.quality, haptics: state.haptics, invert: state.invert, sens: state.sens };
  Object.assign(state, DEFAULTS(), keep);
  rollMissions();
  save();
}

function makeMission(def, tier){
  return { key: def.key, target: def.base + def.step * tier, progress: 0, claimed: false };
}
export function rollMissions(){
  const pool = MISSION_POOL.slice();
  const picked = [];
  // tres misiones distintas, elegidas de forma estable a partir del tier
  for (let i = 0; i < 3 && pool.length; i++){
    const idx = (state.tier * 2 + i * 3 + 1) % pool.length;
    picked.push(makeMission(pool.splice(idx, 1)[0], state.tier));
  }
  state.missions = picked;
}

/** Suma progreso de mision. 'single' guarda el maximo alcanzado en una sola vez (combos). */
export function bumpMissions(stat, value){
  let changed = false;
  for (const m of state.missions){
    const def = missionDef(m.key);
    if (!def || def.stat !== stat || m.claimed) continue;
    const next = def.single ? Math.max(m.progress, value) : m.progress + value;
    if (next !== m.progress){ m.progress = next; changed = true; }
  }
  return changed;
}
export const missionReady = m => !m.claimed && m.progress >= m.target;

export function claimMission(m){
  if (!missionReady(m)) return 0;
  const def = missionDef(m.key);
  const reward = def ? def.reward : 50;
  m.claimed = true;
  state.coins += reward;
  if (state.missions.every(x => x.claimed)){ state.tier++; rollMissions(); }
  save();
  return reward;
}

export function skinLocked(skin){
  if (state.owned.includes(skin.id)) return null;
  if (state.level < skin.lvl) return { reason:'level', v:skin.lvl };
  return { reason:'cost', v:skin.cost };
}
export function buySkin(skin){
  const lock = skinLocked(skin);
  if (!lock || lock.reason !== 'cost' || state.coins < skin.cost) return false;
  state.coins -= skin.cost;
  state.owned.push(skin.id);
  save();
  return true;
}
