#!/usr/bin/env python3
"""Prepara el HTML para el banco: inyecta el cazador de errores.

FLECHAS no baja NADA —no hay three.js ni un solo asset— asi que aca no hay
CDN que reescribir; lo unico que hace falta es que `window.__errs` exista
antes que cualquier otra linea del modulo.
"""
import sys, pathlib

CAZA = """<script>window.__errs=[];
addEventListener('error',e=>window.__errs.push(''+(e.message||e.error)));
addEventListener('unhandledrejection',e=>window.__errs.push('promesa: '+e.reason));
</script>
"""

def main():
    ent = pathlib.Path(sys.argv[1]); sal = pathlib.Path(sys.argv[2])
    s = ent.read_text(encoding='utf-8')
    assert '</head>' in s
    s = s.replace('</head>', CAZA + '</head>', 1)
    sal.write_text(s, encoding='utf-8')
    print('ok ->', sal)

if __name__ == '__main__':
    main()
