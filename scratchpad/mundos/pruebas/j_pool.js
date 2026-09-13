/* Al borde del remanso mirando al agua: el sitio donde el reflejo se paga.
   Con --js j_pooloff.js se mide lo mismo con el espejo apagado. */
const S = window.__S, H = S.H, P = S.POI.oasis;
for (let i = 0; i < 6; i++) S.dlgOk();
S.cap(3);
for (let i = 0; i < 6; i++) S.dlgOk();
S.tp(P.x, P.z + 26);
S.mira(0, -0.13);
if (window.__SINESPEJO) window.__ESPEJO.usar = false;
return { fondo: +H(P.x, P.z).toFixed(2), nivel: +(H(P.x, P.z) + 0.55).toFixed(2),
  espejo: window.__ESPEJO ? { usar: window.__ESPEJO.usar, cada: window.__ESPEJO.cada,
    res: window.__ESPEJO.malla ? window.__ESPEJO.malla.getRenderTarget().width : 0 } : 'SIN REFLECTOR' };
