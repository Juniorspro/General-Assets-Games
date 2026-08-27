#!/usr/bin/env node
/* ============================================================================
   sndcheck.js — verificación automática de los SONIDOS DE ARMAS de SUX SANDBOX
   ----------------------------------------------------------------------------
   POR QUÉ EXISTE
   El usuario se quejó de que "la ak47 no hace sonido de ak47 y el sniper hace sonido de
   subfusil". Midiendo la envolvente de cada archivo apareció la causa real, que NO era
   el timbre: (a) los archivos traían medio archivo de SILENCIO antes del disparo (el
   golpe de la AKM caía a los 0.638 s), así que el tiro llegaba tarde y flojo; y (b) el
   shot-sniper eran VARIOS GOLPES seguidos de amplitud parecida, o sea una ráfaga, y una
   ráfaga suena a subfusil. Este script vuelve a medir todo eso y falla si vuelve a pasar.

   QUÉ MIDE (sobre la envolvente normalizada de 1000 muestras, igual que el waveform de
   Higgsfield, y SOBRE LA VENTANA QUE REALMENTE SE REPRODUCE, o sea aplicando SOFF/SLEN
   de core_n.js — lo que importa es lo que escucha el jugador, no lo que hay en el .mp3):
     dur   largo de la ventana reproducida
     t_pk  cuándo cae el pico (tiene que ser YA, si no el tiro se siente desacoplado)
     cola  tiempo del pico hasta caer al 10% (el "cuerpo" del arma)
     iso   amplitud más alta FUERA del golpe principal. Un eco decae => iso bajo.
           Una RÁFAGA son golpes de amplitud parecida => iso ~1. Es la métrica que
           delata el bug del sniper (el archivo viejo daba iso 0.96).
     sus   energía media del último 20% de la ventana. Alto = cama de ruido continua
           en vez de un disparo que decae.

   USO
     node sndcheck.js            # verifica y sale 0 (ok) o 1 (algo falló)
     node sndcheck.js -v         # además dibuja la envolvente de cada arma

   REPRODUCIBLE: no toca la red ni decodifica mp3. Lee los JSON de envolvente guardados
   en ./wf/, derivados de los .mp3 YA INSTALADOS en assets/hyper/snd (que es lo que el
   navegador decodifica de verdad). En ./wf_higgsfield/ quedan además los waveformUrl
   originales que devolvió Higgsfield, como respaldo de dónde salió cada toma: NO se usan
   para verificar porque su pico no siempre cae en la misma muestra que el del mp3
   (correlación 0.93-0.96, empates de amplitud que se resuelven distinto), y lo que manda
   es el archivo que suena. Sin dependencias.
   ============================================================================ */
'use strict';
const fs = require('fs');
const path = require('path');

const WF = path.join(__dirname, 'wf');
const VERBOSE = process.argv.includes('-v');

/* ---------- FIRMA ACÚSTICA OBJETIVO ----------------------------------------
   Referencia para aceptar o rechazar una toma. Las colas están escalonadas a propósito
   para que las armas se DISTINGAN entre sí, que es de lo que se quejó el usuario:
   crossbow/smg seco < pistol < akm < shotgun < rpg < sniper.
   t_pk_max: el golpe tiene que caer dentro de los primeros 150 ms de lo que se reproduce
   (el rpg es un whoosh que arranca más suave, se le permite 300 ms).
   iso_max: techo de "amplitud fuera del golpe" = no puede ser una ráfaga.
   sus_max: techo de energía al final = tiene que decaer de verdad.
   NO se pone un rango de duración por arma: lo que se mide es la VENTANA que suena, y
   una ventana corta está bien si le entra la cola entera — eso ya lo chequea
   'no cabe la cola' (dur - t_pk >= cola mínima). Sólo se acota un máximo absurdo.     */
const SIG = {
  'shot-pistol':   { cola:[0.10,0.35], t_pk_max:0.15, iso_max:0.45, sus_max:0.12 },
  'shot-revolver': { cola:[0.22,0.60], t_pk_max:0.15, iso_max:0.45, sus_max:0.12 },
  'shot-smg':      { cola:[0.04,0.22], t_pk_max:0.15, iso_max:0.45, sus_max:0.12 },
  'shot-akm':      { cola:[0.18,0.60], t_pk_max:0.15, iso_max:0.45, sus_max:0.15 },
  'shot-shotgun':  { cola:[0.35,0.85], t_pk_max:0.15, iso_max:0.50, sus_max:0.15 },
  'shot-sniper':   { cola:[0.60,1.60], t_pk_max:0.15, iso_max:0.55, sus_max:0.15 },
  'shot-rpg':      { cola:[0.55,1.50], t_pk_max:0.30, iso_max:1.00, sus_max:0.35 },
  'shot-crossbow': { cola:[0.04,0.22], t_pk_max:0.15, iso_max:0.45, sus_max:0.12 },
};

/* Desvíos ACEPTADOS a mano, con motivo. No son un pase libre: el valor tolerado se
   chequea igual contra el techo de acá, y el reporte los marca TOLERADO, no OK.
   Se llegó a esto después de 10 tomas de sniper y 9 de revolver: el modelo no da más
   que esto, así que se documenta en vez de fingir que cumple. */
const TOL = {
  'shot-shotgun': { sus: 0.20, motivo:'el retumbe del galpón no termina de morir dentro de ' +
                    'la ventana (queda al 18% del pico); no es un segundo disparo (iso 0.35) y ' +
                    'sPlay corta con fundido de 40 ms, así que no clickea' },
};

/* SOFF/SLEN: tienen que ser LOS MISMOS que en core_n.js. Si alguien los cambia allá y
   no acá, el check deja de reflejar lo que suena; el test de coherencia de abajo avisa. */
const SOFF = {
  'fw-crackle':1.624, 'shot-shotgun':1.086, 'bat-hit':0.987, 'pop':0.945, 'glass':0.926,
  'imp-concrete':0.753, 'trash':0.644, 'step-wood':0.593, 'bat-swing':0.553, 'step-metal':0.456,
  'shot-crossbow':0.453, 'fw-finale':0.381, 'ui':0.320, 'fw-whistle':0.305, 'fw-launch':0.267,
  'fw-fuse':0.241, 'fw-sparkle':0.226, 'land':0.218, 'shot-revolver':0.161, 'shot-smg':0.150,
  'ricochet':0.113, 'phys-shot':0.094, 'shot-akm':0.057,
};
const SLEN = { 'shot-smg':0.28, 'shot-shotgun':0.52, 'shot-sniper':1.10 };

/* ---------- métricas ------------------------------------------------------- */
function medir(dur, data) {
  const N = data.length, step = dur / N;
  let mx = 0;
  for (const v of data) if (v > mx) mx = v;
  if (mx <= 0) return null;
  const e = data.map(v => v / mx);

  let pk = 0;
  for (let i = 0; i < N; i++) if (e[i] > e[pk]) pk = i;
  const t_pk = pk * step;

  // cola: del pico hasta 3 muestras seguidas por debajo del 10%
  let cola = (N - 1 - pk) * step, bajo = 0;
  for (let i = pk; i < N; i++) {
    if (e[i] < 0.10) { if (++bajo >= 3) { cola = (i - 2 - pk) * step; break; } }
    else bajo = 0;
  }

  // suavizado ~5 ms sólo para contar transientes (la envolvente cruda tiene jitter)
  const k = Math.max(1, Math.round(0.005 / step));
  const s = new Array(N);
  for (let i = 0; i < N; i++) {
    let acc = 0, n = 0;
    for (let j = i - (k >> 1); j <= i + (k >> 1); j++) if (j >= 0 && j < N) { acc += e[j]; n++; }
    s[i] = acc / n;
  }
  let sm = 0; for (const v of s) if (v > sm) sm = v;
  for (let i = 0; i < N; i++) s[i] /= (sm || 1);

  let hits = 0, armado = true, last = -1e9;
  for (let i = 0; i < N; i++) {
    if (armado && s[i] >= 0.60) { hits++; armado = false; last = i; }
    else if (!armado && s[i] < 0.25 && (i - last) * step >= 0.040) armado = true;
  }

  // iso: máximo fuera de la ventana del golpe. El borde de atrás no puede cortar el
  // ataque del propio golpe: se camina hacia atrás mientras siga fuerte (tope 0.20 s).
  let ai = pk, lim = Math.max(0, pk - Math.round(0.20 / step));
  while (ai > lim && s[ai - 1] >= 0.25) ai--;
  const a = Math.min(ai, Math.max(0, Math.round((t_pk - 0.12) / step)));
  const b = Math.min(N, Math.round((t_pk + 0.25) / step) + 1);
  let iso = 0;
  for (let i = 0; i < N; i++) if ((i < a || i >= b) && e[i] > iso) iso = e[i];

  let sus = 0, n0 = Math.floor(N * 0.80);
  for (let i = n0; i < N; i++) sus += e[i];
  sus /= Math.max(1, N - n0);

  return { dur, t_pk, cola, iso, sus, hits };
}

/* recorta la envolvente igual que src.start(0, off, len) */
function ventana(dur, data, off, len) {
  const N = data.length, step = dur / N;
  const a = Math.round(off / step);
  const b = len ? Math.min(N, a + Math.round(len / step)) : N;
  const sl = data.slice(a, b);
  if (sl.length < 10) return null;
  return { dur: sl.length * step, data: sl };
}

function veredicto(name, m) {
  const s = SIG[name], t = TOL[name] || {}, mal = [], tol = [];
  const push = (arr, msg) => arr.push(msg);
  if (m.t_pk > s.t_pk_max) push(mal, `pico tarde ${m.t_pk.toFixed(3)}>${s.t_pk_max}`);
  const colaMin = t.cola_min != null ? t.cola_min : s.cola[0];
  if (m.cola < colaMin) push(mal, `sin cuerpo ${m.cola.toFixed(3)}<${colaMin}`);
  else if (m.cola < s.cola[0]) push(tol, `cola ${m.cola.toFixed(3)} < objetivo ${s.cola[0]}`);
  if (m.cola > s.cola[1]) push(mal, `cola larga ${m.cola.toFixed(3)}>${s.cola[1]}`);
  const isoMax = t.iso != null ? t.iso : s.iso_max;
  if (m.iso > isoMax) push(mal, `RAFAGA iso=${m.iso.toFixed(2)}>${isoMax}`);
  else if (m.iso > s.iso_max) push(tol, `iso ${m.iso.toFixed(2)} > objetivo ${s.iso_max}`);
  const susMax = t.sus != null ? t.sus : s.sus_max;
  if (m.sus > susMax) push(mal, `no decae sus=${m.sus.toFixed(3)}>${susMax}`);
  else if (m.sus > s.sus_max) push(tol, `sus ${m.sus.toFixed(3)} > objetivo ${s.sus_max}`);
  if (m.dur > 3.0) push(mal, `ventana absurda ${m.dur.toFixed(2)} s`);
  if (m.dur - m.t_pk < colaMin) push(mal, 'no cabe la cola');
  return { mal, tol };
}

function spark(data, n) {
  n = n || 46;
  let mx = 0; for (const v of data) if (v > mx) mx = v;
  const k = Math.floor(data.length / n) || 1, ch = ' .:-=+*#%@';
  let out = '';
  for (let i = 0; i < n; i++) {
    let m = 0;
    for (let j = i * k; j < (i + 1) * k && j < data.length; j++) if (data[j] > m) m = data[j];
    out += ch[Math.min(9, Math.floor((m / (mx || 1)) * 9.99))];
  }
  return out;
}

/* ---------- main ----------------------------------------------------------- */
let fallas = 0, tolerados = 0;
const filas = [];

for (const name of Object.keys(SIG)) {
  const p = path.join(WF, name + '.json');
  if (!fs.existsSync(p)) {
    console.log(`FALTA  ${name}: no hay ${path.relative(process.cwd(), p)}`);
    fallas++; continue;
  }
  const d = JSON.parse(fs.readFileSync(p, 'utf8'));
  const off = SOFF[name] || 0, len = SLEN[name] || 0;
  const v = ventana(d.duration, d.data, off, len);
  if (!v) { console.log(`ERROR  ${name}: ventana vacía`); fallas++; continue; }
  const m = medir(v.dur, v.data);
  if (!m) { console.log(`ERROR  ${name}: envolvente en cero`); fallas++; continue; }
  const { mal, tol } = veredicto(name, m);
  const estado = mal.length ? 'FAIL' : (tol.length ? 'TOLERADO' : 'OK');
  if (mal.length) fallas++;
  if (!mal.length && tol.length) tolerados++;
  filas.push({ name, off, len, m, estado, mal, tol, data: v.data, raw: d });
}

const W = 15;
console.log('\nSONIDOS DE ARMAS — SUX SANDBOX');
console.log('metricas de la VENTANA QUE SUENA (archivo + SOFF/SLEN de core_n.js)\n');
console.log('arma'.padEnd(W) + ['dur','t_pico','cola','iso','sus'].map(h => h.padStart(8)).join('') +
            '   estado');
console.log('-'.repeat(W + 40 + 11));
for (const f of filas) {
  const { m } = f;
  console.log(
    f.name.padEnd(W) +
    [m.dur, m.t_pk, m.cola, m.iso, m.sus].map(x => x.toFixed(3).padStart(8)).join('') +
    '   ' + f.estado +
    (f.mal.length ? '  ' + f.mal.join('; ') : '') +
    (f.tol.length ? '  (' + f.tol.join('; ') + ')' : '')
  );
  if (VERBOSE) {
    console.log(' '.repeat(W) + `|${spark(f.data)}|  off=${f.off} len=${f.len || '-'} ` +
                `fuente=${f.raw.source || '?'}`);
  }
}

/* motivos de los desvíos tolerados */
if (tolerados) {
  console.log('\ndesvios tolerados (documentados, no silenciosos):');
  for (const f of filas) if (f.estado === 'TOLERADO')
    console.log(`  ${f.name}: ${(TOL[f.name] || {}).motivo || '-'}`);
}

/* ---------- coherencia con core_n.js -------------------------------------- */
console.log('\ncoherencia SOFF/SLEN con core_n.js:');
const core = path.join(__dirname, 'hyper', 'core_n.js');
if (!fs.existsSync(core)) {
  console.log('  core_n.js no encontrado, salteado');
} else {
  const src = fs.readFileSync(core, 'utf8');
  const leer = (tabla) => {
    const m = src.match(new RegExp('const ' + tabla + '\\s*=\\s*\\{([\\s\\S]*?)\\};'));
    if (!m) return null;
    const o = {};
    for (const mm of m[1].matchAll(/'?([\w-]+)'?\s*:\s*([0-9.]+)/g)) o[mm[1]] = parseFloat(mm[2]);
    return o;
  };
  const cs = leer('SOFF'), cl = leer('SLEN');
  let dif = 0;
  if (!cs) { console.log('  no se pudo leer SOFF de core_n.js'); dif++; }
  else {
    for (const k of new Set([...Object.keys(SOFF), ...Object.keys(cs)]))
      if ((SOFF[k] || 0).toFixed(3) !== (cs[k] || 0).toFixed(3)) {
        console.log(`  DIFIERE SOFF[${k}]: check=${SOFF[k] || 0} core_n=${cs[k] || 0}`); dif++;
      }
    for (const k of new Set([...Object.keys(SLEN), ...Object.keys(cl || {})]))
      if ((SLEN[k] || 0).toFixed(3) !== ((cl || {})[k] || 0).toFixed(3)) {
        console.log(`  DIFIERE SLEN[${k}]: check=${SLEN[k] || 0} core_n=${(cl || {})[k] || 0}`); dif++;
      }
  }
  if (!dif) console.log(`  ok — ${Object.keys(SOFF).length} offsets y ` +
                       `${Object.keys(SLEN).length} largo(s) iguales en los dos lados`);
  else fallas += dif;
}

console.log(`\nresultado: ${filas.length - fallas - tolerados} OK, ${tolerados} tolerado(s), ` +
            `${fallas} falla(s)`);
process.exit(fallas ? 1 : 0);
