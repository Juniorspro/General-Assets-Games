#!/usr/bin/env python3
"""Refresca `estado.json` con lo que Rezona Lab tiene ahora mismo.

    python3 herramientas/rezona/estado.py            # muestra y actualiza
    python3 herramientas/rezona/estado.py --ver      # sólo muestra

QUÉ ESCRIBE Y QUÉ NO: escribe la lista de proyectos —public_id y nombre— que es
lo que una sesión nueva necesita para saber dónde poner las cosas. NO escribe, ni
puede, la credencial: vive en `~/.rezona/credentials.json` y `.rezona/` está en
el .gitignore porque este repo es público.

Lo escrito a mano —los parámetros que funcionaron, las trampas, los assets ya
horneados— NO se pisa: eso no está en el servidor, está en lo que costó
averiguarlo.
"""
import io, json, os, sys

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
EST = os.path.join(AQUI, 'estado.json')


def main():
    d = json.load(io.open(EST, encoding='utf8'))
    print('proyectos anotados:')
    for k, v in d['proyectos'].items():
        print('  %-10s %s' % (k, v['nombre']))
    print('\ncarpeta de descarga: %s' % d['carpeta_de_descarga']['ruta'])
    print('assets horneados:    %s' % ', '.join(d['assets_generados']))

    if '--ver' in sys.argv:
        return 0

    import rz
    try:
        r = rz.sesion([('list_projects', {})], espera=240)
        t = rz.texto(r[0])
    except Exception as e:
        print('\nno se pudo hablar con el servidor: %s' % e)
        return 1
    if 'Not authenticated' in t or 'not authenticated' in t.lower():
        print('\nfalta el login:  npx rezona@latest login')
        print('(código de un solo uso; la llave no pasa por el chat ni por git)')
        return 1

    try:
        lista = json.loads(t)
        items = lista.get('projects') or lista.get('items') or []
    except Exception:
        print('\nel servidor contestó algo que no es la lista:\n' + t[:400])
        return 1

    nuevos = 0
    for p in items:
        pid = p.get('public_id') or p.get('id')
        if not pid:
            continue
        if pid not in d['proyectos']:
            d['proyectos'][pid] = {'nombre': p.get('name', ''), 'usar_para': ''}
            nuevos += 1
        else:
            d['proyectos'][pid]['nombre'] = p.get('name', d['proyectos'][pid]['nombre'])
    io.open(EST, 'w', encoding='utf8').write(
        json.dumps(d, ensure_ascii=False, indent=2) + '\n')
    print('\n%d proyectos en el servidor · %d nuevos anotados' % (len(items), nuevos))
    return 0


if __name__ == '__main__':
    sys.exit(main())

