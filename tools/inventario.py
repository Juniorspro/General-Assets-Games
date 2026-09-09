#!/usr/bin/env python3
"""Recorre la raíz del repositorio y genera el catálogo de assets.

Salidas:
  docs/catalogo.html  — catálogo navegable (un solo archivo, datos incrustados)
  ASSETS.md           — el mismo inventario en tabla, para leer desde GitHub

Uso: python3 tools/inventario.py
"""
import json
import os
import re
import sys
from datetime import date
from urllib.parse import quote

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sondas

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO = 'juniorspro/General-Assets-Games'
RAMA = 'main'

EXT_ASSET = {'.glb', '.zip', '.mp3', '.gif', '.gba', '.n64', '.sfc'}
EXT_ROM = {'gba', 'n64', 'sfc', 'smc', 'nes', 'z64', 'bin', 'rom', 'sp1', 'sm1', 'lo', 'sfix'}
# Las bibliotecas de texturas también reparten .blend y .gltf de muestra, así que
# solo estos formatos delatan de verdad a un pack de modelos.
EXT_MALLA = {'fbx', 'obj'}
EXT_MALLA_DEBIL = {'gltf', 'glb', 'rar'}
EXT_AUDIO = {'mp3', 'wav', 'ogg'}
EXT_IMAGEN = {'png', 'jpg', 'jpeg', 'webp'}

CONSOLAS = {'gba': 'Game Boy Advance', 'n64': 'Nintendo 64', 'sfc': 'Super Nintendo',
            'smc': 'Super Nintendo', 'nes': 'NES', 'z64': 'Nintendo 64'}

# Cada mapa PBR y las variantes de nombre con que lo bautiza cada biblioteca.
MAPAS_PBR = [
    ('Color', ('basecolor', 'color', '_col', 'diff', 'albedo')),
    ('Normal', ('normalgl', 'normaldx', 'normal', 'nrm', 'nor_gl', 'nor_dx')),
    ('Rugosidad', ('roughness', 'rough', 'gloss')),
    ('Oclusión', ('ambientocclusion', '_ao', 'ao_')),
    ('Desplazamiento', ('displacement', 'disp', 'bump')),
    ('Metalicidad', ('metallic', 'metalness', 'refl')),
    ('Opacidad', ('opacity', 'alpha')),
    ('Especular', ('specular',)),
    ('ARM', ('_arm',)),
]


def humano(n):
    """Bytes a texto corto: 4.1 MB, 812 kB."""
    if n >= 1024 ** 3:
        return f'{n / 1024 ** 3:.1f} GB'
    if n >= 1024 ** 2:
        return f'{n / 1024 ** 2:.1f} MB'
    return f'{n / 1024:.0f} kB'


def reloj(seg):
    return f'{int(seg) // 60}:{int(seg) % 60:02d}'


def mapas_de(entradas):
    """Qué mapas PBR trae un pack de texturas, en orden canónico."""
    bajas = [e.lower() for e in entradas]
    return [nombre for nombre, claves in MAPAS_PBR
            if any(c in e for c in claves for e in bajas)]


def resolucion_de(entradas, archivo):
    for texto in [archivo] + list(entradas):
        m = re.search(r'(?<![A-Za-z0-9])([1248])[kK](?![A-Za-z0-9])', texto)
        if m:
            return f'{m.group(1)}K'
    return ''


def fuente_de(archivo, zip_info):
    exts = zip_info.get('extensiones', {})
    if archivo.startswith('Poliigon_'):
        return 'Poliigon'
    if 'usdc' in exts and 'tres' in exts:
        return 'ambientCG'
    if any(e.startswith('textures/') for e in zip_info.get('entradas', [])):
        return 'Poly Haven'
    if 'mtlx' in exts or 'tiff' in exts:
        return 'Poliigon'
    return ''


def _proporcion(extensiones, familia):
    total = sum(extensiones.values())
    return sum(n for e, n in extensiones.items() if e in familia) / total if total else 0


def normalizar_fuente(generador):
    """El campo 'generator' del glTF trae la versión pegada; nos basta la herramienta."""
    for marca in ('Sketchfab', 'Blender', 'Substance', 'Maya', 'Cinema 4D', '3ds Max'):
        if marca.lower() in generador.lower():
            return marca
    return ''


def clasificar(archivo, ext, zip_info):
    """Devuelve (categoría, subtipo). Se decide por el contenido, no por el nombre."""
    if ext == '.glb':
        return 'modelos', 'Modelo glTF binario'
    if ext in ('.gba', '.n64', '.sfc'):
        return 'juegos', CONSOLAS.get(ext.lstrip('.'), 'ROM')
    if ext == '.mp3':
        return 'audio', 'Pista suelta'
    if ext == '.gif':
        return 'referencias', 'Animación de referencia'

    extensiones = zip_info.get('extensiones', {})
    exts = set(extensiones)
    if not exts:
        return 'otros', 'Archivo comprimido'
    if _proporcion(extensiones, EXT_ROM) >= 0.6:
        consola = next((CONSOLAS[e] for e in exts if e in CONSOLAS), 'Neo Geo')
        return 'juegos', consola
    if exts & EXT_MALLA:
        return 'modelos', 'Pack 3D'
    if 'hdr' in exts:
        return 'texturas', 'Cielo HDRI'
    # Un material de verdad siempre trae mapa de normales; sin él, la coincidencia
    # con 'color' o 'bump' suele venir del nombre de una foto cualquiera.
    if 'Normal' in mapas_de(zip_info.get('entradas', [])):
        return 'texturas', 'Material PBR'
    if exts & EXT_MALLA_DEBIL:
        return 'modelos', 'Pack 3D'
    if _proporcion(extensiones, EXT_AUDIO) >= 0.6:
        return 'audio', 'Pack de sonido'
    if exts <= EXT_IMAGEN:
        return 'referencias', 'Recortes e imágenes'
    return 'otros', 'Archivo comprimido'


def describir(entrada):
    """Línea de detalle que resume lo que hace único a cada asset."""
    d = entrada['datos']
    cat = entrada['categoria']
    if cat == 'modelos' and 'mallas' in d:
        trozos = [f"{d['mallas']} malla{'s' * (d['mallas'] != 1)}",
                  f"{d['materiales']} material{'es' * (d['materiales'] != 1)}"]
        if d['huesos']:
            trozos.append(f"{d['huesos']} huesos")
        if d['animaciones']:
            n = len(d['animaciones'])
            trozos.append(f"{n} {'animación' if n == 1 else 'animaciones'}")
        return ' · '.join(trozos)
    if cat == 'modelos' and d.get('extensiones'):
        return ' · '.join(f'{n} {e.upper()}'
                          for e, n in list(d['extensiones'].items())[:3] if e != 'zip')
    if cat == 'audio' and 'segundos' in d:
        return f"{reloj(d['segundos'])} · {d['kbps']} kbps · {d['hz'] // 1000} kHz"
    if cat == 'audio' and d.get('total'):
        return f"{d['total']} pista{'s' * (d['total'] != 1)}"
    if cat == 'texturas':
        piezas = [m for m in (entrada.get('resolucion'), entrada.get('fuente')) if m]
        if entrada.get('mapas'):
            piezas.append(', '.join(entrada['mapas']))
        return ' · '.join(piezas)
    if cat == 'referencias' and 'ancho' in d:
        return f"{d['ancho']}×{d['alto']} · {d['fotogramas']} fotogramas"
    if cat == 'referencias' and d.get('total'):
        return f"{d['total']} imágenes"
    if cat == 'juegos':
        rom = next((e for e in d.get('entradas', []) if not e.lower().endswith('.zip')), '')
        return f"{entrada['subtipo']} · {rom}" if rom else entrada['subtipo']
    if d.get('total'):
        return f"{d['total']} archivos"
    return ''


def recolectar():
    entradas = []
    for archivo in sorted(os.listdir(RAIZ)):
        ruta = os.path.join(RAIZ, archivo)
        ext = os.path.splitext(archivo)[1].lower()
        if not os.path.isfile(ruta) or ext not in EXT_ASSET:
            continue

        datos, zip_info = {}, {}
        if ext == '.glb':
            datos = sondas.sonda_glb(ruta)
        elif ext == '.gif':
            datos = sondas.sonda_gif(ruta)
        elif ext == '.mp3':
            datos = sondas.sonda_mp3(ruta)
        elif ext == '.zip':
            zip_info = sondas.sonda_zip(ruta)
            datos = zip_info

        categoria, subtipo = clasificar(archivo, ext, zip_info)
        entrada = {
            'archivo': archivo,
            'ext': ext.lstrip('.'),
            'bytes': os.path.getsize(ruta),
            'tam': humano(os.path.getsize(ruta)),
            'categoria': categoria,
            'subtipo': subtipo,
            'datos': datos,
        }
        if categoria == 'texturas':
            entrada['mapas'] = mapas_de(zip_info.get('entradas', []))
            entrada['resolucion'] = resolucion_de(zip_info.get('entradas', []), archivo)
            entrada['fuente'] = fuente_de(archivo, zip_info)
        if categoria == 'modelos':
            entrada['fuente'] = normalizar_fuente(datos.get('generador', ''))
        entrada['detalle'] = describir(entrada)
        entradas.append(entrada)
    return entradas


def enlaces(archivo):
    ruta = quote(archivo)
    return (f'https://raw.githubusercontent.com/{REPO}/{RAMA}/{ruta}',
            f'https://github.com/{REPO}/blob/{RAMA}/{ruta}')


def contar_pistas(entradas):
    total = 0
    for e in entradas:
        if e['ext'] == 'mp3':
            total += 1
        elif e['categoria'] == 'audio':
            total += sum(1 for n in e['datos'].get('entradas', [])
                         if n.lower().endswith(('.mp3', '.wav', '.ogg')))
    return total


def render_html(entradas, resumen):
    plantilla = open(os.path.join(RAIZ, 'tools', 'catalogo.plantilla.html'),
                     encoding='utf-8').read()
    ligero = []
    for e in entradas:
        crudo, blob = enlaces(e['archivo'])
        d = e['datos']
        ligero.append({
            'archivo': e['archivo'], 'ext': e['ext'], 'bytes': e['bytes'], 'tam': e['tam'],
            'categoria': e['categoria'], 'subtipo': e['subtipo'], 'detalle': e['detalle'],
            'fuente': e.get('fuente', ''), 'mapas': e.get('mapas', []),
            'crudo': crudo, 'blob': blob,
            'datos': {k: d[k] for k in ('entradas', 'animaciones') if k in d},
        })
    datos = json.dumps(ligero, ensure_ascii=False, separators=(',', ':'))
    return (plantilla.replace('/*__DATOS__*/', datos)
                     .replace('/*__CRUDO__*/', json.dumps(resumen, ensure_ascii=False)))


def render_md(entradas, resumen):
    lineas = [
        '# Inventario de assets', '',
        f"{resumen['total']} archivos · {humano(resumen['bytes'])} · "
        f"inventario del {resumen['fecha']}.", '',
        'Catálogo navegable con buscador (entra dentro de los zips): ',
        f'**https://{REPO.split("/")[0]}.github.io/{REPO.split("/")[1]}/catalogo.html**', '',
        'Generado por `tools/inventario.py`; vuelve a ejecutarlo al añadir archivos.', '',
    ]
    titulos = {'modelos': 'Modelos 3D', 'texturas': 'Texturas y HDRI', 'audio': 'Audio',
               'juegos': 'Juegos retro', 'referencias': 'Referencias', 'otros': 'Otros'}
    for cat, titulo in titulos.items():
        grupo = [e for e in entradas if e['categoria'] == cat]
        if not grupo:
            continue
        peso = humano(sum(e['bytes'] for e in grupo))
        lineas += [f'## {titulo}', '', f'{len(grupo)} archivos · {peso}', '',
                   '| Archivo | Tipo | Tamaño | Detalle |', '| --- | --- | ---: | --- |']
        for e in sorted(grupo, key=lambda x: x['archivo'].lower()):
            _, blob = enlaces(e['archivo'])
            nombre = e['archivo'].replace('|', '\\|')
            detalle = (e['detalle'] or '').replace('|', '\\|')
            lineas.append(f"| [`{nombre}`]({blob}) | {e['subtipo']} | {e['tam']} | {detalle} |")
        lineas.append('')
    return '\n'.join(lineas)


def main():
    entradas = recolectar()
    resumen = {
        'total': len(entradas),
        'bytes': sum(e['bytes'] for e in entradas),
        'pistas': contar_pistas(entradas),
        'fecha': date.today().isoformat(),
    }
    salidas = {
        os.path.join(RAIZ, 'docs', 'catalogo.html'): render_html(entradas, resumen),
        os.path.join(RAIZ, 'ASSETS.md'): render_md(entradas, resumen),
    }
    for ruta, texto in salidas.items():
        with open(ruta, 'w', encoding='utf-8') as f:
            f.write(texto)
        print(f'{os.path.relpath(ruta, RAIZ)}  ({len(texto):,} caracteres)')
    print(f"{resumen['total']} assets · {humano(resumen['bytes'])} · "
          f"{resumen['pistas']} pistas de audio")


if __name__ == '__main__':
    main()
