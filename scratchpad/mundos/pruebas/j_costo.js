/* COSTO DEL ESPEJO. El contador de fps de la pagina no sirve para comparar dos
   corridas distintas: en este contenedor (swiftshader, 4 nucleos y varios
   chromium de otros agentes a la vez) la misma escena da 24 o 60 segun la carga
   de la maquina. Asi que se miden las cuatro ventanas EN LA MISMA CARGA de
   pagina y una detras de otra, contando cuadros de rAF, y se repite la ventana
   «sin espejo» al final: la diferencia entre las dos iguales es el ruido, y solo
   se puede creer una diferencia mayor que eso. */
const S = window.__S, P = S.POI.oasis, E = window.__ESPEJO;
for (let i = 0; i < 6; i++) S.dlgOk();
S.cap(3);
for (let i = 0; i < 6; i++) S.dlgOk();
S.tp(P.x, P.z + 26);
S.mira(0, -0.13);
if (!E.malla) return 'SIN REFLECTOR';
const MS = 6000;
const cuenta = () => new Promise(res => {
  let n = 0; const t0 = performance.now();
  const f = () => { n++;
    if (performance.now() - t0 < MS) requestAnimationFrame(f);
    else res(+(n / ((performance.now() - t0) / 1000)).toFixed(1)); };
  requestAnimationFrame(f);
});
const r = { res: E.malla.getRenderTarget().width, gfx: S.gfx(),
  pix: +S.ren.getPixelRatio().toFixed(2) };
await cuenta();                                  /* calentar */
E.usar = false; r.sinEspejo = await cuenta();
E.usar = true; E.cada = 2; r.espejoCada2 = await cuenta();
E.cada = 1; r.espejoCada1 = await cuenta();
E.usar = false; r.sinEspejo2 = await cuenta();
r.ruido = +(r.sinEspejo2 - r.sinEspejo).toFixed(1);
r.costoCada2pc = +((1 - r.espejoCada2 / ((r.sinEspejo + r.sinEspejo2) / 2)) * 100).toFixed(1);
r.costoCada1pc = +((1 - r.espejoCada1 / ((r.sinEspejo + r.sinEspejo2) / 2)) * 100).toFixed(1);
return r;
