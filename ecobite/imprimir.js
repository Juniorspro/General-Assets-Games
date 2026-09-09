/* Imprime dossier.html a PDF y avisa si alguna página se desborda del A4. */
const { chromium } = require('playwright');
const BASE = '/tmp/claude-0/-home-user-General-Assets-Games/1597a097-1b56-567e-824b-de5c2a7f2b53/scratchpad/ecobite';

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const p = await b.newPage();
  const problemas = [];
  p.on('pageerror', e => problemas.push('JS: ' + e.message));
  p.on('requestfailed', r => problemas.push('NO CARGÓ: ' + r.url().split('/').pop()));

  await p.goto('file://' + BASE + '/dossier.html', { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(800);

  /* Cada .cuerpo tiene alto fijo: si el contenido lo excede, se corta al imprimir. */
  const desbordes = await p.evaluate(() =>
    [...document.querySelectorAll('.pagina')].map((pag, i) => {
      const c = pag.querySelector('.cuerpo');
      if (!c) return null;
      const sobra = c.scrollHeight - c.clientHeight;
      return sobra > 2 ? { pagina: i + 1, sobra } : null;
    }).filter(Boolean));

  const fuentes = await p.evaluate(() =>
    [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family + ' ' + f.weight));

  await p.pdf({ path: BASE + '/ECOBITE-dossier.pdf', format: 'A4',
                printBackground: true, preferCSSPageSize: true });
  await b.close();

  console.log('fuentes cargadas:', [...new Set(fuentes)].join(', ') || 'ninguna');
  console.log('desbordes:', desbordes.length ? JSON.stringify(desbordes) : 'ninguno');
  console.log('problemas:', problemas.length ? problemas.join('\n  ') : 'ninguno');
})();
