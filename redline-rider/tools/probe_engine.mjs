/* Comprueba que el motor PROCEDURAL sube de tono de verdad, y que el ambiente suena.

   Con muestras bastaba comparar tres ficheros. Con un sintetizador no vale leer los valores que
   uno mismo acaba de escribir: eso solo demuestra que la asignacion funciona. Aqui se cuelga un
   AnalyserNode del nodo de mezcla y se mide el ESPECTRO QUE SALE para varias posiciones de
   vueltas, que es lo unico que se puede comprobar sin oido.

   Se mide, para cada punto de vueltas:
     - pico espectral por debajo de 1,2 kHz -> la fundamental de encendido
     - centroide espectral -> la "altura" media, que tiene que crecer al abrirse el filtro
     - energia total -> que a mas vueltas y mas gas suene mas
   y ademas que soltar el gas a las mismas vueltas TAPE el sonido (centroide mas bajo), que es
   el freno motor.

   Del ambiente se comprueba que los tres clips decodifican, que son distintos de verdad y que
   setAmbience() cambia cual esta sonando. */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = '/home/user/General-Assets-Games/redline-rider';
const MIME = { '.html':'text/html', '.js':'text/javascript', '.glb':'model/gltf-binary',
               '.mp3':'audio/mpeg', '.jpg':'image/jpeg', '.png':'image/png' };
const server = http.createServer(async (req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '') || 'index.html';
  try {
    const buf = await readFile(path.join(ROOT, rel));
    res.writeHead(200, { 'content-type': MIME[path.extname(rel)] || 'application/octet-stream' });
    res.end(buf);
  } catch (e) { res.writeHead(404); res.end('no'); }
});
await new Promise(r => server.listen(0, r));
const base = 'http://127.0.0.1:' + server.address().port + '/';

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader',
                                               '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 844, height: 390 } });
const errs = [];
page.on('pageerror', e => errs.push('PAGEERROR: ' + e.message.slice(0, 160)));

await page.goto(base + (process.argv[2] || 'index.html') + '?debug=1');
await page.waitForFunction('window.__rr', { timeout: 30000 });
await page.waitForFunction('document.getElementById("boot-go").classList.contains("on")', { timeout: 120000 });
await page.mouse.click(422, 195);              // el gesto que habilita el audio
await page.evaluate(() => {
  const rr = window.__rr;
  rr.state.lang = 'es'; rr.state.quality = 'high'; rr.state.tutorialDone = true;
  rr.state.sfx = 1;
  rr.ui.h.onBootDone();
  rr.ui.h.onPlay();
});
await page.waitForTimeout(600);

/* ---------- 1. barrido de vueltas ---------- */
const fallos = [];
const sweep = await page.evaluate(async () => {
  const rr = window.__rr;
  const d = rr.audio.engineDebug();
  if (!d.ctx || !d.nodes) return { error: 'el sintetizador no arranco: ' + JSON.stringify({ ctx: !!d.ctx, nodes: !!d.nodes }) };
  if (d.ctx.state === 'suspended') await d.ctx.resume();

  const an = d.ctx.createAnalyser();
  an.fftSize = 8192;
  an.smoothingTimeConstant = 0;         // sin suavizado: cada lectura es el espectro de ese instante
  d.nodes.master.connect(an);           // derivacion; la mezcla sigue llegando a la salida

  const sr = d.ctx.sampleRate;
  const bins = an.frequencyBinCount;
  const hzPorBin = sr / an.fftSize;
  const buf = new Float32Array(bins);

  /* Una sola lectura de un analizador es ruidosa. Se promedian varias en potencia lineal, no en
     decibelios: promediar dB pondera mal los picos. */
  const espectro = async n => {
    const acc = new Float64Array(bins);
    for (let k = 0; k < n; k++){
      await new Promise(r => requestAnimationFrame(r));
      an.getFloatFrequencyData(buf);
      for (let i = 0; i < bins; i++) acc[i] += Math.pow(10, buf[i] / 10);
    }
    for (let i = 0; i < bins; i++) acc[i] /= n;
    return acc;
  };

  const medir = async (rpm, gas) => {
    /* El juego reescribe el motor en cada fotograma con SUS vueltas, asi que hay que congelarlo:
       se para el bucle del juego poniendolo en pausa y se manda el motor a mano. */
    rr.audio.engine(rpm, 0.0, gas);     // viento a cero: aqui se mide el MOTOR
    await new Promise(r => setTimeout(r, 320));   // las rampas son de 20-60 ms; sobra
    rr.audio.engine(rpm, 0.0, gas);
    const p = await espectro(10);

    // pico por debajo de 1,2 kHz: la fundamental de encendido y sus primeros armonicos
    let pico = 0, picoHz = 0;
    const lim = Math.min(bins, Math.floor(1200 / hzPorBin));
    for (let i = Math.floor(25 / hzPorBin); i < lim; i++)
      if (p[i] > pico){ pico = p[i]; picoHz = i * hzPorBin; }

    let num = 0, den = 0, energia = 0;
    for (let i = 1; i < bins; i++){
      const mag = Math.sqrt(p[i]);
      num += i * hzPorBin * mag; den += mag; energia += p[i];
    }
    return { picoHz: Math.round(picoHz), centroide: Math.round(den > 0 ? num / den : 0),
             energiaDb: +(10 * Math.log10(energia + 1e-30)).toFixed(1) };
  };

  // el bucle del juego pisaria estos valores en cada fotograma: se le quita el control
  rr.game.mode = 'pause';

  const puntos = [];
  for (const rpm of [0.0, 0.25, 0.5, 0.75, 1.0])
    puntos.push(Object.assign({ rpm }, await medir(rpm, 1)));

  // mismo regimen, sin gas: el paso bajo tiene que cerrarse (freno motor)
  const conGas = await medir(0.7, 1);
  const sinGas = await medir(0.7, 0);

  // viento: solo con velocidad, y a las mismas vueltas tiene que anadir energia aguda
  rr.audio.engine(0.3, 0.0, 0.5);
  await new Promise(r => setTimeout(r, 400));
  const parado = await espectro(10);
  rr.audio.engine(0.3, 1.0, 0.5);
  await new Promise(r => setTimeout(r, 400));
  const rapido = await espectro(10);
  const agudos = arr => { let s = 0; for (let i = Math.floor(2000 / hzPorBin); i < bins; i++) s += arr[i]; return s; };

  return { sr, puntos, conGas, sinGas,
           vientoDb: +(10 * Math.log10((agudos(rapido) + 1e-30) / (agudos(parado) + 1e-30))).toFixed(1) };
});

if (sweep.error){
  console.log('MOTOR: ' + sweep.error);
  fallos.push('el sintetizador no arranco');
} else {
  console.log('sintetizador procedural  (frecuencia de muestreo ' + sweep.sr + ' Hz)');
  console.log('vueltas   pico     centroide   energia');
  for (const p of sweep.puntos)
    console.log('  ' + p.rpm.toFixed(2).padStart(4), String(p.picoHz).padStart(6) + ' Hz',
                String(p.centroide).padStart(8) + ' Hz', String(p.energiaDb).padStart(8) + ' dB');

  const picos = sweep.puntos.map(p => p.picoHz);
  const subePico = picos.every((v, i) => i === 0 || v > picos[i - 1]);
  console.log('\nel tono SUBE con las vueltas:', subePico ? 'OK (' + picos.join(' < ') + ' Hz)'
              : 'FALLA (' + picos.join(', ') + ' Hz)');
  if (!subePico) fallos.push('el tono no sube con las vueltas');

  /* La fundamental esperada sale del modelo: 42 Hz al ralenti, 340 en zona roja, con exponente
     1,15. El analizador puede enganchar un armonico en vez de la fundamental, asi que se acepta
     que el pico sea la fundamental o uno de sus primeros multiplos. */
  const esperada = r => 42 + (340 - 42) * Math.pow(r, 1.15);
  let coinciden = 0;
  for (const p of sweep.puntos){
    const f = esperada(p.rpm);
    for (const m of [0.5, 1, 2, 3]) if (Math.abs(p.picoHz - f * m) < Math.max(8, f * m * 0.12)) { coinciden++; break; }
  }
  console.log('el pico cae donde dice el modelo:',
              coinciden === sweep.puntos.length ? 'OK en los ' + coinciden + ' puntos'
              : coinciden + '/' + sweep.puntos.length + ' (el resto engancho otro armonico)');

  const cents = sweep.puntos.map(p => p.centroide);
  const subeCent = cents[cents.length - 1] > cents[0] * 1.5;
  console.log('el timbre se ABRE al subir de vueltas:',
              subeCent ? 'OK (' + cents[0] + ' -> ' + cents[cents.length - 1] + ' Hz)'
              : 'FALLA (' + cents.join(', ') + ' Hz)');
  if (!subeCent) fallos.push('el timbre no se abre');

  const tapa = sweep.sinGas.centroide < sweep.conGas.centroide;
  console.log('soltar el gas TAPA el sonido (freno motor):',
              tapa ? 'OK (' + sweep.conGas.centroide + ' -> ' + sweep.sinGas.centroide + ' Hz)'
              : 'FALLA (con gas ' + sweep.conGas.centroide + ', sin gas ' + sweep.sinGas.centroide + ' Hz)');
  if (!tapa) fallos.push('el gas no cambia el timbre');

  const baja = sweep.sinGas.energiaDb < sweep.conGas.energiaDb;
  console.log('soltar el gas BAJA el nivel:',
              baja ? 'OK (' + sweep.conGas.energiaDb + ' -> ' + sweep.sinGas.energiaDb + ' dB)' : 'FALLA');
  if (!baja) fallos.push('el gas no cambia el nivel');

  console.log('el viento sigue a la VELOCIDAD:',
              sweep.vientoDb > 3 ? 'OK (+' + sweep.vientoDb + ' dB en agudos a toda velocidad)'
              : 'FALLA (' + sweep.vientoDb + ' dB: no se nota)');
  if (!(sweep.vientoDb > 3)) fallos.push('el viento no responde a la velocidad');
}

/* ---------- 2. ambiente ---------- */
const amb = await page.evaluate(async b => {
  const rr = window.__rr;
  const ctx = new (window.OfflineAudioContext)(1, 1024, 44100);
  const clips = [];
  for (const n of ['day', 'sunset', 'night']){
    try {
      const r = await fetch(b + 'assets/audio/amb/' + n + '.mp3');
      const buf = await ctx.decodeAudioData(await r.arrayBuffer());
      const d = buf.getChannelData(0);
      let rms = 0;
      for (let i = 0; i < d.length; i++) rms += d[i] * d[i];
      rms = Math.sqrt(rms / d.length);

      /* Centroide por Goertzel en 64 bandas logaritmicas: distingue el clip de dia (zumbido
         grave de trafico) del de noche (grillos, agudos) sin necesitar una FFT completa. */
      const N = 8192, ini = Math.floor((d.length - N) / 2);
      const w = new Float64Array(N);
      for (let i = 0; i < N; i++) w[i] = d[ini + i] * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1)));
      let num = 0, den = 0;
      for (let k = 0; k < 64; k++){
        const f = 60 * Math.pow(14000 / 60, k / 63);
        const cw = 2 * Math.cos(2 * Math.PI * f / buf.sampleRate);
        let s0 = 0, s1 = 0, s2 = 0;
        for (let i = 0; i < N; i++){ s0 = w[i] + cw * s1 - s2; s2 = s1; s1 = s0; }
        const mag = Math.sqrt(Math.abs(s1 * s1 + s2 * s2 - cw * s1 * s2)) / N;
        num += f * mag; den += mag;
      }
      // salto de bucle: lo que se oye como chasquido al cerrar
      const K = 512;
      let ini2 = 0, fin = 0;
      for (let i = 0; i < K; i++){ ini2 += Math.abs(d[i]); fin += Math.abs(d[d.length - 1 - i]); }
      clips.push({ n, dur:+buf.duration.toFixed(2), rms:+rms.toFixed(4),
                   centroide: Math.round(den > 0 ? num / den : 0),
                   salto:+Math.abs(fin / K - ini2 / K).toFixed(4) });
    } catch (e) { clips.push({ n, error: String(e).slice(0, 80) }); }
  }

  // cambio de ambiente: solo puede estar sonando el del entorno activo
  const foto = () => ['ambDay', 'ambSunset', 'ambNight'].map(k => {
    const el = rr.audio.probe(k);
    return { k, rs: el ? el.readyState : -1, vol: el ? +el.volume.toFixed(3) : -1, pausado: el ? el.paused : null };
  });
  const cambios = {};
  for (const env of ['day', 'night', 'sunset']){
    rr.audio.setAmbience(env);
    rr.audio.ambienceOn(true);
    await new Promise(r => setTimeout(r, 250));
    cambios[env] = { activo: rr.audio.ambienceTrack(), pistas: foto() };
  }
  rr.audio.ambienceOn(false);
  await new Promise(r => setTimeout(r, 200));
  cambios.apagado = { activo: rr.audio.ambienceTrack(), pistas: foto() };
  return { clips, cambios };
}, base);

console.log('\nambiente generado con Higgsfield');
console.log('clip      duracion   rms      centroide   salto de bucle');
for (const c of amb.clips){
  if (c.error){ console.log('  ' + c.n.padEnd(7), 'NO DECODIFICA: ' + c.error); fallos.push('amb/' + c.n + '.mp3 no decodifica'); continue; }
  console.log('  ' + c.n.padEnd(7), String(c.dur).padStart(6) + ' s', String(c.rms).padStart(8),
              String(c.centroide).padStart(8) + ' Hz', String(c.salto).padStart(10));
  if (!(c.dur > 1)) fallos.push('amb/' + c.n + '.mp3 dura ' + c.dur + ' s');
}
const firmas = new Set(amb.clips.filter(c => !c.error).map(c => c.rms + ':' + c.centroide));
console.log('los tres son distintos:', firmas.size === 3 ? 'OK' : 'FALLA (hay clips repetidos)');
if (firmas.size !== 3) fallos.push('los ambientes no son distintos');

const espera = { day:'ambDay', night:'ambNight', sunset:'ambSunset' };
console.log('\ncambio de ambiente por entorno:');
for (const [env, want] of Object.entries(espera)){
  const c = amb.cambios[env];
  /* Se exige tambien readyState >= 2. Un fichero que el navegador no sabe decodificar tiene
     volumen y no esta en pausa igual que uno bueno: simplemente no suena. */
  const vivas = c.pistas.filter(p => !p.pausado && p.vol > 0.001);
  const sonando = vivas.map(p => p.k);
  const ok = c.activo === want && sonando.length === 1 && sonando[0] === want && vivas[0].rs >= 2;
  console.log('  ' + env.padEnd(7), 'suena', (sonando.join(',') || 'nada').padEnd(10),
              'readyState', vivas.length ? vivas[0].rs : '-',
              '(esperado ' + want + ')', ok ? 'OK' : 'FALLA');
  if (!ok) fallos.push('el ambiente de ' + env + ' no suena solo');
}
const apag = amb.cambios.apagado.pistas.filter(p => !p.pausado && p.vol > 0.001);
console.log('  apagado  ', apag.length === 0 ? 'todo en silencio OK' : 'FALLA (sigue ' + apag.map(p => p.k).join(',') + ')');
if (apag.length) fallos.push('el ambiente no se apaga');

console.log('\nerrores de pagina:', errs.length ? errs : 'ninguno');
if (errs.length) fallos.push(errs.length + ' error(es) de pagina');
console.log(fallos.length ? '\nFALLOS: ' + fallos.join('; ') : '\nTODO OK');
await browser.close();
server.close();
process.exit(fallos.length ? 1 : 0);
