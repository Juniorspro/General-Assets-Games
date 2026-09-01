/* banco.js — corre un PLAN sobre una pagina servida en localhost:8098.
   Lo llama run2.sh; no se ejecuta suelto.

   PLAN = lista de pasos:
     {"js": "..."}       evalua en la pagina y anota lo que devuelve
     {"click": "sel"}    click en un selector
     {"tap": [x, y]}     toque en coordenadas de viewport
     {"key": "KeyW", "ms": 400}   mantiene una tecla y la suelta
     {"wait": 800}       espera en milisegundos
     {"n": "nombre"}     captura a out/nombre.png

   Uso: PAGINA=x.html MOVIL=1 node banco.js PLAN.json out/x.log 412 892 */

const fs = require('fs');
const path = require('path');
const { chromium, devices } = require('playwright');

const PLAN  = process.argv[2];
const LOG   = process.argv[3] || 'out/banco.log';
const ANCHO = parseInt(process.argv[4] || '412', 10);
const ALTO  = parseInt(process.argv[5] || '892', 10);
const PAGINA = process.env.PAGINA || 'index.html';
const MOVIL  = process.env.MOVIL === '1';
/* El navegador del contenedor NO sale por el proxy: todo tiene que ser local. */
const BASE = process.env.BASE || 'http://127.0.0.1:8098';

const lineas = [];
function anotar(s) { lineas.push(s); console.log(s); }

function chromeDelContenedor() {
    const raiz = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
    let mejor;
    for (const d of (fs.existsSync(raiz) ? fs.readdirSync(raiz) : [])) {
        /* headless_shell no trae WebGL: se descarta a proposito */
        if (!/^chromium-\d+$/.test(d)) continue;
        const c = path.join(raiz, d, 'chrome-linux', 'chrome');
        if (fs.existsSync(c)) mejor = c;
    }
    if (!mejor) anotar('[aviso] no encontre chromium en ' + raiz + ' — uso el de playwright');
    return mejor;   // undefined = que lo resuelva playwright
}

(async () => {
    const pasos = JSON.parse(fs.readFileSync(PLAN, 'utf8'));
    fs.mkdirSync(path.dirname(LOG), { recursive: true });
    fs.mkdirSync('out', { recursive: true });

    const nav = await chromium.launch({
        /* headless_shell no trae WebGL; el chromium entero si, por SwiftShader.
           La ruta lleva el numero de build, que no coincide con la version de
           playwright del contenedor: se busca, no se escribe a mano. */
        executablePath: chromeDelContenedor(),
        args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader',
               '--disable-dev-shm-usage', '--no-sandbox'],
    });
    const ctx = await nav.newContext({
        viewport: { width: ANCHO, height: ALTO },
        deviceScaleFactor: 1,
        ...(MOVIL ? { isMobile: true, hasTouch: true,
                      userAgent: devices['Pixel 5'].userAgent } : {}),
    });
    const pag = await ctx.newPage();

    pag.on('console', m => anotar('[consola:' + m.type() + '] ' + m.text()));
    pag.on('pageerror', e => anotar('[ERROR] ' + e.message));
    pag.on('requestfailed', r => anotar('[fallo-red] ' + r.url() + ' — ' +
        (r.failure() ? r.failure().errorText : '?')));

    anotar('abriendo ' + BASE + '/' + PAGINA + '  ' + ANCHO + 'x' + ALTO +
           (MOVIL ? ' movil' : ''));
    await pag.goto(BASE + '/' + PAGINA, { waitUntil: 'load', timeout: 120000 });

    for (let i = 0; i < pasos.length; i++) {
        const p = pasos[i];
        try {
            if (p.wait != null) { await pag.waitForTimeout(p.wait); }
            else if (p.click)   { await pag.click(p.click, { timeout: 15000 });
                                  anotar('· click ' + p.click); }
            else if (p.tap)     { await pag.mouse.click(p.tap[0], p.tap[1]);
                                  anotar('· tap ' + p.tap.join(',')); }
            else if (p.key)     { await pag.keyboard.down(p.key);
                                  await pag.waitForTimeout(p.ms || 300);
                                  await pag.keyboard.up(p.key);
                                  anotar('· tecla ' + p.key + ' ' + (p.ms || 300) + 'ms'); }
            else if (p.js)      { const r = await pag.evaluate(p.js);
                                  anotar('· js[' + i + '] ' + JSON.stringify(r)); }
            else if (p.n)       { const f = 'out/' + p.n + '.png';
                                  await pag.screenshot({ path: f });
                                  anotar('· captura ' + f); }
        } catch (e) {
            anotar('[paso ' + i + ' fallo] ' + e.message);
        }
    }

    await nav.close();
    fs.writeFileSync(LOG, lineas.join('\n') + '\n');
    anotar('log en ' + LOG);
})().catch(e => { console.error(e); process.exit(1); });
