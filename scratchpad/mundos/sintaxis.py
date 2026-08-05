#!/usr/bin/env python3
"""Chequeo de sintaxis del script de cada mundo, sin navegador: se saca el
<script> del HTML y se lo pasa por node --check. Barato y atrapa el 90% de lo
que rompe un parche (comillas, llaves, saltos de linea metidos en un literal)."""
import re, subprocess, sys, tempfile, os

M = '/home/user/mundos/assets/mundos/'
SLUGS = ['dunas', 'jungla', 'volcan', 'pantano', 'canon', 'estepa', 'acropolis', 'secuoya']

mal = 0
for s in (sys.argv[1:] or SLUGS):
    t = open(M + s + '.html', encoding='utf8').read()
    bl = re.findall(r"<script[^>]*>(.*?)</script>", t, re.S)
    if not bl:
        print(f'{s:10} SIN SCRIPT'); mal += 1; continue
    ok = True
    for i, b in enumerate(bl):
        f = tempfile.NamedTemporaryFile('w', suffix='.mjs', delete=False, encoding='utf8')
        f.write(b); f.close()
        r = subprocess.run(['node', '--check', f.name], capture_output=True, text=True)
        os.unlink(f.name)
        if r.returncode:
            err = [l for l in r.stderr.splitlines() if 'Error' in l or '^' in l][:2]
            print(f'{s:10} bloque {i} MAL: ' + ' | '.join(x.strip()[:110] for x in err))
            ok = False; mal += 1
    if ok:
        print(f'{s:10} sintaxis OK ({len(bl)} bloque/s, {len(t)//1024} KB)')
sys.exit(1 if mal else 0)
