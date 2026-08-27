/* RECORRE LA RUTA DE LAS COPAS de punta a punta como la jugaria una persona:
   camina al pie del tronco, mira que salga el aviso y el boton USAR, sube por
   los escalones con la palanca, se lanza en las tres tirolesas y aterriza.
   Devuelve la altura y la velocidad en cada tramo, que es lo unico que dice si
   funciono de verdad. */
const S = window.__S, C = window.__COPAS, H = S.H;
const log = [];
const dur = ms => new Promise(r => setTimeout(r, ms));
const alto = () => +(S.cam.position.y).toFixed(1);
for (let i = 0; i < 6; i++) S.dlgOk();
S.cap(3);
for (let i = 0; i < 6; i++) S.dlgOk();
/* camina de verdad hacia un punto (no teleportado encima): mira y aprieta W
   hasta llegar, con tope de intentos por si algo lo frena */
const camina = async (tx, tz, cerca, tope) => {
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
  for (let k = 0; k < (tope || 60); k++){
    const g = S.get();
    if (Math.hypot(g.px - tx, g.pz - tz) < cerca) break;
    S.mira(Math.atan2(-(tx - g.px), -(tz - g.pz)), -0.12);
    await dur(150);
  }
  window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }));
  await dur(250);
};
/* al pie */
const E0 = C.EST[0];
S.tp(E0.pieX + 9, E0.pieZ + 9);
await dur(3000);                       /* que compile los shaders nuevos */
await camina(E0.pieX, E0.pieZ, 3.0, 70);
log.push('al pie: d=' + Math.hypot(S.get().px - E0.pieX, S.get().pz - E0.pieZ).toFixed(1) +
  ' usar=' + S.get().usar + ' aviso="' + (document.getElementById('aviso').textContent || '') + '"');
if (!S.get().usar) return log.concat('NO SE ENCENDIO USAR AL PIE');
S.usar();
log.push('modo=' + C.modo + ' y=' + alto());
/* subir: adelante con W */
window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' }));
for (let k = 0; k < 12; k++){
  await dur(1000);
  if (!C.modo) break;
}
window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' }));
await dur(300);
log.push('arriba: modo=' + C.modo + ' sop=' + C.est().sop + ' y=' + alto() +
  ' (plataforma ' + C.est().alturas[0] + ')');
/* las tres tirolesas */
for (let n = 0; n < 3; n++){
  /* caminar hasta el nudo del cable: se va derecho al ancla */
  const E = C.EST[n];
  await camina(E.ancX, E.ancZ, 2.4, 50);
  log.push('copa ' + n + ': d al nudo=' +
    Math.hypot(S.get().px - E.ancX, S.get().pz - E.ancZ).toFixed(1) +
    ' usar=' + S.get().usar + ' aviso="' + (document.getElementById('aviso').textContent || '') + '"');
  if (!S.get().usar) return log.concat('NO SE ENCENDIO USAR EN LA COPA ' + n);
  S.usar();
  let vmax = 0, ymin = 999;
  for (let k = 0; k < 90 && C.modo === 'vuela'; k++){
    vmax = Math.max(vmax, C.vel); ymin = Math.min(ymin, alto());
    await dur(100);
  }
  log.push('  vuelo ' + n + ': vMax=' + vmax.toFixed(1) + ' m/s  yMin=' + ymin.toFixed(1) +
    '  ahora y=' + alto() + ' sop=' + C.est().sop + ' aire=' +
    (+(S.cam.position.y - H(S.get().px, S.get().pz) - 1.7).toFixed(1)));
}
await dur(1500);
log.push('final: y=' + alto() + ' suelo=' + H(S.get().px, S.get().pz).toFixed(1) +
  ' pos=' + S.get().px + ',' + S.get().pz + ' dObj=' + S.get().dObj + ' m');
return log;
