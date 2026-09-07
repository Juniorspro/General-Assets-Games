/* Saca una foto del visor con Chromium sin cabeza y SwiftShader, que es
   WebGL por software: en esta máquina no hay GPU y el navegador de la máquina
   virtual se come los cuatro núcleos que hacen falta para Cycles.

     node foto-visor.mjs http://127.0.0.1:8099/index.html salida.png [ms] [vista] [ancho] [alto]

   La ruta de playwright es absoluta a propósito: acá está instalado global.
   Si lo tenés en el proyecto, alcanza con import { chromium } from "playwright". */
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
const [url, salida, ms = "9000", vista = "", an = "960", al = "600", cam = "", suelto = "", pie = ""] = process.argv.slice(2);
// cam es un JSON con campos de la cámara: {"dist":430,"pit":0.4,"blanco":[0,45,0]}
const nav = await chromium.launch({
  args: ["--enable-unsafe-swiftshader", "--use-gl=angle", "--use-angle=swiftshader",
         "--ignore-gpu-blocklist", "--no-sandbox", "--js-flags=--max-old-space-size=4096"],
});
const pag = await nav.newPage({ viewport: { width: +an, height: +al }, deviceScaleFactor: 1 });
const registro = [];
pag.on("console", (m) => registro.push(m.type() + ": " + m.text()));
pag.on("pageerror", (e) => registro.push("pageerror: " + e.message));
await pag.goto(url, { waitUntil: "load", timeout: 120000 });
// un .splat suelto: es como se prueba el visor vacío, el que pide el archivo
if (suelto) { await pag.setInputFiles("#elegir", suelto); }
await pag.waitForTimeout(+ms);
// SwiftShader dibuja a un par de cuadros por segundo: sin frenar el giro, la
// captura nunca ve la página quieta y se queda esperando
await pag.evaluate(() => { const b = document.querySelector("#btGira");
  if (b && b.getAttribute("aria-pressed") === "true") b.click(); });
await pag.waitForTimeout(3000);
if (vista) { await pag.click(`#encuadres button[data-v="${vista}"]`); await pag.waitForTimeout(2500); }
if (cam) {
  await pag.evaluate((c) => {
    const o = JSON.parse(c);
    if ("modo" in o) { window.visor.modo = o.modo; delete o.modo; }
    if ("tam" in o) { const t = document.querySelector("#tam"); t.value = o.tam; delete o.tam; }
    Object.assign(window.visor.cam, o);
  }, cam);
  // SwiftShader puede tardar varios segundos por cuadro con medio millón de
  // gaussianas: si no se espera, la captura sale del cuadro anterior
  await pag.waitForTimeout(60000);
}
if (pie) {
  // primera persona: el click es gesto de usuario, así que el pointer lock sale
  // force: con SwiftShader a dos cuadros por segundo, el chequeo de
  // estabilidad de Playwright se queda esperando
  await pag.click("#btPie", { force: true, timeout: 20000 });
  await pag.waitForTimeout(1500);
  const pasos = pie.split(",");            // p.ej. "w:2500,a:600"
  for (const p of pasos) {
    const [k, ms2] = p.split(":");
    if (k === "look") { await pag.mouse.move(+ms2, 0); continue; }
    await pag.keyboard.down(k);
    await pag.waitForTimeout(+ms2 || 500);
    await pag.keyboard.up(k);
  }
  await pag.waitForTimeout(25000);
}
const info = await pag.evaluate(() => {
  const t = (s) => (document.querySelector(s) || {}).textContent;
  return { n: t("#dN"), caja: t("#dCaja"), grano: t("#dSep"), tomas: t("#dTomas"),
           peso: t("#dPeso"), fps: t("#fps"), orden: t("#ord"),
           falla: getComputedStyle(document.querySelector("#falla")).display,
           info: window.visor ? window.visor.info() : null,
           rejilla: window.visor ? window.visor.rejilla : null,
           fp: window.visor ? { on: window.visor.fp.on,
                pos: window.visor.fp.pos.map((v) => Math.round(v*10)/10) } : null };
});
console.log(JSON.stringify(info, null, 1));
if (registro.length) console.log("consola:\n" + registro.slice(0, 14).join("\n"));
await pag.screenshot({ path: salida, timeout: 180000, animations: "disabled" });
await nav.close();
