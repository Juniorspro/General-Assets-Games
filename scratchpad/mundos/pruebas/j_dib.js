/* COSTO ESTRUCTURAL del espejo: dibujados, triangulos y pixeles con y sin la
   segunda pasada, en el mismo cuadro y con el contador en manual (el nested
   render de Reflector resetea ren.info a mitad de cuadro, y por eso la linea de
   fps de la pagina miente cuando el reflejo esta encendido). */
const S = window.__S, P = S.POI.oasis, E = window.__ESPEJO;
for (let i = 0; i < 6; i++) S.dlgOk();
S.cap(3);
for (let i = 0; i < 6; i++) S.dlgOk();
S.tp(P.x, P.z + 26);
S.mira(0, -0.13);
await new Promise(r => setTimeout(r, 1200));
if (!E.malla) return 'SIN REFLECTOR';
const ren = S.ren;
ren.info.autoReset = false;
const uno = () => { ren.info.reset(); ren.render(S.scene, S.cam);
  return { dib: ren.info.render.calls, tri: ren.info.render.triangles }; };
const r = {};
E.malla.visible = false; r.sin = uno();
E.malla.visible = true; E.cada = 1; uno(); r.con = uno();
r.res = E.malla.getRenderTarget().width;
const c = ren.getContext();
r.lienzo = [c.drawingBufferWidth, c.drawingBufferHeight];
r.pixLienzo = c.drawingBufferWidth * c.drawingBufferHeight;
r.pixEspejo = r.res * r.res;
r.pcPixCada1 = +(r.pixEspejo / r.pixLienzo * 100).toFixed(1);
r.pcPixCada2 = +(r.pixEspejo / 2 / r.pixLienzo * 100).toFixed(1);
ren.info.autoReset = true;
return r;
