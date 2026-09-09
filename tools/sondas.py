"""Sondas de metadatos: leen cabeceras binarias sin dependencias externas."""
import io, json, os, struct, zipfile


def sonda_glb(ruta):
    """Lee el trozo JSON de un .glb y resume su contenido."""
    with open(ruta, 'rb') as f:
        magia, _version, _total = struct.unpack('<4sII', f.read(12))
        if magia != b'glTF':
            return {}
        largo, tipo = struct.unpack('<I4s', f.read(8))
        if tipo != b'JSON':
            return {}
        g = json.loads(f.read(largo).decode('utf-8', 'replace'))
    animaciones = [a.get('name') or f'anim{i}' for i, a in enumerate(g.get('animations', []))]
    return {
        'mallas': len(g.get('meshes', [])),
        'nodos': len(g.get('nodes', [])),
        'materiales': len(g.get('materials', [])),
        'texturas': len(g.get('textures', [])),
        'huesos': sum(len(s.get('joints', [])) for s in g.get('skins', [])),
        'animaciones': animaciones,
        'generador': (g.get('asset') or {}).get('generator', ''),
    }


def sonda_gif(ruta):
    """Ancho, alto y número de fotogramas de un GIF."""
    with open(ruta, 'rb') as f:
        datos = f.read()
    if datos[:3] != b'GIF':
        return {}
    ancho, alto = struct.unpack('<HH', datos[6:10])
    return {'ancho': ancho, 'alto': alto, 'fotogramas': datos.count(b'\x00\x21\xf9\x04')}


_TASAS_V1L3 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0]
_MUESTREOS = {0: 44100, 1: 48000, 2: 32000}


def sonda_mp3(ruta):
    """Duración en segundos: usa la cabecera Xing si existe, si no asume tasa constante."""
    tam = os.path.getsize(ruta)
    with open(ruta, 'rb') as f:
        cabeza = f.read(200_000)
    # Saltar una etiqueta ID3v2 si la hay.
    inicio = 0
    if cabeza[:3] == b'ID3':
        # El tamaño va en cuatro bytes «syncsafe»: siete bits útiles en cada uno.
        tamano = 0
        for b in cabeza[6:10]:
            tamano = (tamano << 7) | (b & 0x7F)
        inicio = 10 + tamano
    def marco_en(pos):
        """Longitud del marco MPEG-1 Layer III que empieza en pos, o None."""
        if pos + 4 > len(cabeza):
            return None
        b1, b2 = cabeza[pos + 1], cabeza[pos + 2]
        if (b1 & 0xE0) != 0xE0 or (b1 >> 3) & 3 != 3 or (b1 >> 1) & 3 != 1:
            return None
        tasa = _TASAS_V1L3[b2 >> 4]
        muestreo = _MUESTREOS.get((b2 >> 2) & 3)
        if not tasa or not muestreo:
            return None
        return 144 * tasa * 1000 // muestreo + ((b2 >> 1) & 1), tasa, muestreo

    i = cabeza.find(b'\xff', inicio)
    while i != -1:
        primero = marco_en(i)
        # Un 0xFF suelto dentro de una carátula imita una cabecera; solo es real
        # si en el marco siguiente hay otra cabecera compatible.
        if primero and marco_en(i + primero[0]):
            marco, tasa, muestreo = primero
            for etiqueta in (b'Xing', b'Info'):
                j = cabeza.find(etiqueta, i, i + marco + 40)
                if j != -1:
                    banderas = struct.unpack('>I', cabeza[j + 4:j + 8])[0]
                    if banderas & 1:
                        marcos = struct.unpack('>I', cabeza[j + 8:j + 12])[0]
                        return {'segundos': round(marcos * 1152 / muestreo, 1),
                                'kbps': tasa, 'hz': muestreo}
            return {'segundos': round((tam - i) * 8 / (tasa * 1000), 1),
                    'kbps': tasa, 'hz': muestreo}
        i = cabeza.find(b'\xff', i + 1)
    return {}


def _listar(z, prefijo=''):
    """Nombres de un zip, entrando un nivel en los zips anidados."""
    nombres = []
    for n in z.namelist():
        if n.endswith('/'):
            continue
        nombres.append(prefijo + n)
        if n.lower().endswith('.zip') and not prefijo:
            try:
                with zipfile.ZipFile(io.BytesIO(z.read(n))) as dentro:
                    nombres += _listar(dentro, n + '/')
            except (zipfile.BadZipFile, OSError):
                pass
    return nombres


def sonda_zip(ruta):
    """Entradas del zip agrupadas por extensión, incluidos los zips anidados."""
    try:
        with zipfile.ZipFile(ruta) as z:
            nombres = _listar(z)
            crudo = sum(i.file_size for i in z.infolist())
    except (zipfile.BadZipFile, OSError):
        return {}
    extensiones = {}
    for n in nombres:
        ext = os.path.splitext(n)[1].lower().lstrip('.')
        extensiones[ext] = extensiones.get(ext, 0) + 1
    return {
        'entradas': nombres,
        'total': len([n for n in nombres if not n.lower().endswith('.zip')]),
        'extensiones': dict(sorted(extensiones.items(), key=lambda p: -p[1])),
        'descomprimido': crudo,
    }
