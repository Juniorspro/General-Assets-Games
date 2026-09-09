#!/usr/bin/env python3
"""Descarga las tipografías del dossier a fonts/.

Chromium imprime el PDF desde file://, y en este entorno no llega a
fonts.googleapis.com en tiempo de render: las fuentes tienen que estar en disco
antes de maquetar.
"""
import os
import re
import subprocess

BASE = os.path.dirname(os.path.abspath(__file__))
DESTINO = os.path.join(BASE, 'fonts')
AGENTE = ('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) '
          'Chrome/120.0.0.0 Safari/537.36')

FAMILIAS = {
    'fraunces': 'Fraunces:opsz,wght@9..144,400;9..144,600;9..144,900',
    'inter': 'Inter:wght@400;500;600;700',
    'plexmono': 'IBM+Plex+Mono:wght@400;500;600',
}


def traer(url, destino):
    hecho = subprocess.run(['curl', '-sSfL', '-A', AGENTE, '-o', destino, url],
                           capture_output=True, text=True)
    return hecho.returncode == 0 and os.path.getsize(destino) > 1000


def main():
    os.makedirs(DESTINO, exist_ok=True)
    caras = []
    for clave, familia in FAMILIAS.items():
        css = subprocess.run(
            ['curl', '-sSfL', '-A', AGENTE,
             f'https://fonts.googleapis.com/css2?family={familia}&display=swap'],
            capture_output=True, text=True).stdout
        # Solo el bloque latino: el resto son subconjuntos que no vamos a usar.
        bloques = re.findall(r'/\*\s*(latin[^*]*)\*/\s*@font-face\s*{([^}]+)}', css)
        for etiqueta, cuerpo in bloques:
            if etiqueta.strip() != 'latin':
                continue
            url = re.search(r'url\((https://[^)]+)\)', cuerpo).group(1)
            peso = re.search(r'font-weight:\s*([\d\s]+);', cuerpo).group(1).strip()
            estilo = re.search(r'font-style:\s*(\w+);', cuerpo).group(1)
            nombre = f"{clave}-{peso.replace(' ', '_')}-{estilo}.woff2"
            if traer(url, os.path.join(DESTINO, nombre)):
                familia_css = re.search(r"font-family:\s*'([^']+)'", cuerpo).group(1)
                caras.append((familia_css, peso, estilo, nombre))
                print(f'  {nombre}')
    with open(os.path.join(BASE, 'fuentes.css'), 'w', encoding='utf-8') as f:
        for familia_css, peso, estilo, nombre in caras:
            f.write(f"@font-face{{font-family:'{familia_css}';font-style:{estilo};"
                    f"font-weight:{peso};font-display:block;"
                    f"src:url('fonts/{nombre}') format('woff2')}}\n")
    print(f'{len(caras)} caras -> fuentes.css')


if __name__ == '__main__':
    main()
