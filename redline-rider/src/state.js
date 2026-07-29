/* Estado persistente: ajustes, progreso, motos y mejoras. Todo en localStorage. */

const KEY = 'redline.v1';

/* Tres motos con techos de 180 / 250 / 320 km/h, segun la especificacion. Los precios
   crecen fuerte porque son el objetivo a medio plazo de todo lo que ganas rodando. */
export const BIKES = [
  { id:'street',  name:'STREET 400',  topKmh:180, amax:4.0, brake:11.0, handling:0.90, price:0,     color:0xe8551f },
  { id:'sport',   name:'SPORT 750',   topKmh:250, amax:5.2, brake:11.6, handling:1.00, price:18000, color:0x2f6fd0 },
  { id:'superbike', name:'APEX 1000', topKmh:320, amax:6.4, brake:12.4, handling:1.08, price:65000, color:0x1d2230 }
];
export const bikeById = id => BIKES.find(b => b.id === id) || BIKES[0];

/* Cuatro vias de mejora de 5 niveles cada una. El efecto por nivel sale de la
   especificacion: motor +3% de punta, aceleracion +5%, frenos +4,4%, agarre +3%. */
export const UPGRADES = [
  { id:'engine',  key:'up.engine',  step:0.03,  unit:'%' },
  { id:'accel',   key:'up.accel',   step:0.05,  unit:'%' },
  { id:'brakes',  key:'up.brakes',  step:0.044, unit:'%' },
  { id:'grip',    key:'up.grip',    step:0.03,  unit:'%' }
];
export const UPGRADE_TIERS = 5;
/** Precio del siguiente nivel: geometrico, y escalado por el precio de la moto. */
export const upgradeCost = (bike, tier) =>
  Math.round((600 + bike.price * 0.05) * Math.pow(1.85, tier));

export const QUALITIES = ['low', 'med', 'high', 'ultra'];

const DEFAULTS = () => ({
  lang: null,                  // null -> se pregunta al primer arranque
  quality: null,               // null -> se pregunta al primer arranque
  /* null -> lo decide el aparato en el primer arranque: giroscopio en un movil, arrastre en
     un escritorio. Guardarlo resuelto de fabrica dejaria a medio mundo con el esquema
     equivocado, y guardar la eleccion del jugador es lo que hay que respetar. */
  scheme: null,
  music: 0.5, sfx: 0.85,
  haptics: true, invert: false, sens: 1,
  cash: 0, distanceTotal: 0,
  bike: 'street',
  owned: ['street'],
  upgrades: { street:{}, sport:{}, superbike:{} },
  best: { score:0, distance:0, overtakes:0, topKmh:0, combo:0 },
  runs: 0
});

export const state = DEFAULTS();

export function load(){
  let raw = null;
  try { raw = localStorage.getItem(KEY); } catch (e) { /* modo privado: se juega sin guardar */ }
  if (raw){
    try {
      const s = JSON.parse(raw);
      for (const k in state) if (k in s) state[k] = s[k];
      state.best = Object.assign(DEFAULTS().best, state.best || {});
      state.upgrades = Object.assign(DEFAULTS().upgrades, state.upgrades || {});
      if (!Array.isArray(state.owned) || !state.owned.length) state.owned = ['street'];
      if (!state.owned.includes(state.bike)) state.bike = 'street';
    } catch (e) { /* guardado corrupto: se empieza limpio */ }
  }
  return state;
}

export function save(){
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* sin persistencia */ }
}

export function wipe(){
  const keep = { lang:state.lang, quality:state.quality, scheme:state.scheme,
                 music:state.music, sfx:state.sfx,
                 haptics:state.haptics, invert:state.invert, sens:state.sens };
  Object.assign(state, DEFAULTS(), keep);
  save();
}

export const tierOf = (bikeId, upId) => (state.upgrades[bikeId] && state.upgrades[bikeId][upId]) | 0;

/** Estadisticas efectivas de una moto con sus mejoras aplicadas. */
export function bikeStats(bikeId){
  const b = bikeById(bikeId);
  const t = id => tierOf(bikeId, id);
  return {
    ...b,
    topKmh:   b.topKmh   * (1 + 0.03  * t('engine')),
    amax:     b.amax     * (1 + 0.05  * t('accel')),
    brake:    b.brake    * (1 + 0.044 * t('brakes')),
    handling: b.handling * (1 + 0.03  * t('grip'))
  };
}

export function buyBike(bike){
  if (state.owned.includes(bike.id) || state.cash < bike.price) return false;
  state.cash -= bike.price;
  state.owned.push(bike.id);
  state.bike = bike.id;
  save();
  return true;
}

export function buyUpgrade(bikeId, upId){
  const tier = tierOf(bikeId, upId);
  if (tier >= UPGRADE_TIERS) return 0;
  const cost = upgradeCost(bikeById(bikeId), tier);
  if (state.cash < cost) return 0;
  state.cash -= cost;
  if (!state.upgrades[bikeId]) state.upgrades[bikeId] = {};
  state.upgrades[bikeId][upId] = tier + 1;
  save();
  return cost;
}

/** Cierra una partida: guarda records y suma la caja ganada. */
export function finishRun(r){
  state.runs++;
  state.cash += r.cash;
  state.distanceTotal += r.distance;
  const b = state.best;
  const rec = {
    score: r.score > b.score, distance: r.distance > b.distance,
    overtakes: r.overtakes > b.overtakes, topKmh: r.topKmh > b.topKmh, combo: r.combo > b.combo
  };
  b.score = Math.max(b.score, r.score);
  b.distance = Math.max(b.distance, r.distance);
  b.overtakes = Math.max(b.overtakes, r.overtakes);
  b.topKmh = Math.max(b.topKmh, r.topKmh);
  b.combo = Math.max(b.combo, r.combo);
  save();
  return rec;
}
