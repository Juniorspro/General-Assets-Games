/* ¿DE QUÉ TAMAÑO ES EL CUERPO EN PRIMERA PERSONA?
   La cámara va a OJO metros del suelo y el modelo se pega al suelo sin escalar.
   Si el modelo no mide lo mismo que OJO, la cámara queda dentro del pecho y al
   mirar abajo se ve un amasijo. Esto lo mide en los trece.
   Uso: node cuerpo.mjs [mundo ...] */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { serve } from './serve.mjs';
const TODOS = ['dunas', 'jungla', 'volcan', 'pantano', 'canon', 'estepa', 'acropolis',
  'secuoya', 'marte', 'luna', 'exo', 'hielo', 'senda'];
const MUNDOS = process.argv.length > 2 ? process.argv.slice(2) : TODOS;
const RUTA = m => m === 'senda' ? 'senda/senda.html' : 'mundos/' + m + '.html';
const { server, base } = await serve();
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader',
  '--autoplay-policy=no-user-gesture-required'] });
console.log('mundo      OJO   alto GLB  cabeza(y)  hombro(y)  veredicto');
for (const mundo of MUNDOS){
  const p = await b.newPage({ viewport: { width: 400, height: 260 } });
  try {
    await p.goto(base + 'assets/' + RUTA(mundo) + '?local', { waitUntil: 'domcontentloaded', timeout: 180000 });
    await p.waitForFunction(() => window.__S && document.querySelector('canvas'), null, { timeout: 180000 });
    await p.waitForTimeout(2600);
    await p.evaluate(() => document.getElementById('mJugar').click());
    await p.waitForTimeout(1800);
    for (let i = 0; i < 6; i++){
      await p.evaluate(() => { try { window.__S.cineSkip(); } catch (e) {}
        try { window.__S.dlgOk(); } catch (e) {} });
      await p.waitForTimeout(250);
    }
    await p.waitForTimeout(3500);
    const r = await p.evaluate(() => {
      const T = window.__S.T, cam = window.__S.cam;
      /* el cuerpo cuelga de un Group que sigue al jugador; lo buscamos por el
         GLB cargado, que es lo que de verdad se ve */
      let glb = null;
      window.__S.scene.traverse(o => { if (!glb && o.isSkinnedMesh &&
        o.parent && o.parent.parent && o.parent.parent.type === 'Group') glb = o; });
      const out = { ojoCam: null, alto: null, cabeza: null, hombro: null, raizY: null };
      /* la cámara: su altura sobre el suelo bajo el jugador */
      const g = window.__S.get();
      out.ojoCam = +(cam.position.y - window.__S.H(g.px, g.pz)).toFixed(2);
      if (!glb) return out;
      /* raíz del cuerpo */
      let raiz = glb; while (raiz.parent && raiz.parent.type !== 'Scene') raiz = raiz.parent;
      out.raizY = +raiz.position.y.toFixed(2);
      const bb = new T.Box3().setFromObject(raiz);
      out.alto = +(bb.max.y - bb.min.y).toFixed(2);
      out.min = +bb.min.y.toFixed(2); out.max = +bb.max.y.toFixed(2);
      /* huesos */
      raiz.traverse(o => {
        if (!o.isBone) return;
        const w = new T.Vector3(); o.getWorldPosition(w);
        if (/head|cabeza/i.test(o.name) && out.cabeza == null) out.cabeza = +(w.y - raiz.position.y).toFixed(2);
        if (/shoulder|hombro|LeftArm$/i.test(o.name) && out.hombro == null) out.hombro = +(w.y - raiz.position.y).toFixed(2);
      });
      return out;
    });
    const alto = r.alto;
    const mal = alto != null && (alto < r.ojoCam * .85 || alto > r.ojoCam * 1.25);
    console.log(mundo.padEnd(10) + String(r.ojoCam).padStart(5) + String(alto).padStart(10) +
      String(r.cabeza).padStart(11) + String(r.hombro).padStart(11) + '   ' +
      (alto == null ? 'sin GLB (cuerpo pintado)' : mal ? '*** DESCALIBRADO ***' : 'ok'));
  } catch (e) {
    console.log(mundo.padEnd(10) + ' FALLÓ ' + String(e).slice(0, 90));
  }
  await p.close();
}
await b.close(); server.close();
