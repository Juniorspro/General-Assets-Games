#!/usr/bin/env python3
"""Prepara el HTML de DUNA para el banco: inyecta el cazador de errores.

DUNA no baja NADA —es un lienzo 2D, sin three.js y sin un solo asset externo—
asi que aca no hay CDN que reescribir.

LO QUE SI HACE FALTA ES QUE `window.__errs` EXISTA ANTES DEL MODULO. El juego
declara el suyo en `z.html`, que es la ULTIMA parte: o sea que se registra al
final del modulo y no puede atrapar lo unico que de verdad rompe este repo
—un `let` leido antes de su linea, que tira mientras el modulo se evalua y se
lo lleva entero—. Registrado en el `<head>` si lo atrapa.
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
