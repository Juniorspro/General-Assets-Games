/* mismo sitio que j_pool.js pero con el espejo APAGADO: es el «antes» */
const S = window.__S, H = S.H, P = S.POI.oasis;
for (let i = 0; i < 6; i++) S.dlgOk();
S.cap(3);
for (let i = 0; i < 6; i++) S.dlgOk();
S.tp(P.x, P.z + 26);
S.mira(0, -0.13);
window.__ESPEJO.usar = false;
return { espejo: window.__ESPEJO.usar };
