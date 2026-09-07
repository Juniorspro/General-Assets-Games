/* Saca una foto del visor con Chromium sin cabeza y SwiftShader, que es
   WebGL por software: en esta máquina no hay GPU y el navegador de la máquina
   virtual se come los cuatro núcleos que hacen falta para Cycles.

     node foto-visor.mjs http://127.0.0.1:8099/index.html salida.png [ms] [vista]

   La ruta de playwright es absoluta a propósito: acá está instalado global.
   Si lo tenés en el proyecto, alcanza con import { chromium } from "playwright". */
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
const [url, salida, ms = "9000", vista = ""] = process.argv.slice(2);
const nav = await chromium.launch({
  args: ["--enable-unsafe-swiftshader", "--use-gl=angle", "--use-angle=swiftshader",
         "--ignore-gpu-blocklist", "--no-sandbox", "--js-flags=--max-old-space-size=4096"],
});
const pag = await nav.newPage({ viewport: { width: 960, height: 600 }, deviceScaleFactor: 1 });
const registro = [];
pag.on("console", (m) => registro.push(m.type() + ": " + m.text()));
pag.on("pageerror", (e) => registro.push("pageerror: " + e.message));
await pag.goto(url, { waitUntil: "load", timeout: 120000 });
await pag.waitForTimeout(+ms);
// SwiftShader dibuja a un par de cuadros por segundo: sin frenar el giro, la
// captura nunca ve la página quieta y se queda esperando
await pag.evaluate(() => { const b = document.querySelector("#btGira");
  if (b && b.getAttribute("aria-pressed") === "true") b.click(); });
await pag.waitForTimeout(3000);
if (vista) { await pag.click(`#encuadres button[data-v="${vista}"]`); await pag.waitForTimeout(2500); }
const info = await pag.evaluate(() => {
  const t = (s) => (document.querySelector(s) || {}).textContent;
  return { n: t("#dN"), caja: t("#dCaja"), grano: t("#dSep"), tomas: t("#dTomas"),
           peso: t("#dPeso"), fps: t("#fps"), orden: t("#ord"),
           falla: getComputedStyle(document.querySelector("#falla")).display,
           info: window.visor ? window.visor.info() : null };
});
console.log(JSON.stringify(info, null, 1));
if (registro.length) console.log("consola:\n" + registro.slice(0, 14).join("\n"));
await pag.screenshot({ path: salida, timeout: 180000, animations: "disabled" });
await nav.close();
