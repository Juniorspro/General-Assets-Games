#!/usr/bin/env python3
"""Cliente mínimo del MCP de Rezona Lab, por stdio.

    python3 herramientas/rezona/rz.py tools
    python3 herramientas/rezona/rz.py esquema [filtro]
    python3 herramientas/rezona/rz.py openapi [patron]
    python3 herramientas/rezona/rz.py call <herramienta> '<json de argumentos>'

`tools` imprime UNA LÍNEA por herramienta y eso ya costó una vuelta: leyendo el
resumen di por sentado que `submit_model3d_generation` no tenía selector de
modelo, y sí lo tiene —`model_version`, que el schema del paquete npm no declara
y hay que mandar por `extra`—. Antes de afirmar que un parámetro no existe, va
`esquema` (el schema entero del MCP) y sobre todo `openapi`, que baja el schema
del PROPIO SERVIDOR: ahí están los campos que el paquete no expone.

POR QUÉ EXISTE: el servidor está declarado en `.mcp.json` pero las herramientas
`mcp__rezona__*` no están cargadas en esta sesión —haría falta reiniciar el
cliente—, y el servidor habla JSON-RPC por stdin/stdout como cualquier MCP. Son
treinta líneas y evita esperar un reinicio.

LA CREDENCIAL NO ESTÁ ACÁ NI PUEDE ESTAR. Vive en `~/.rezona/credentials.json`,
que la pone `npx rezona@latest login` con un código de un solo uso. Este repo es
público: la llave adentro sería la llave publicada. Por eso `.rezona/` está en el
`.gitignore` y este script no la lee ni la imprime nunca.
"""
import json, subprocess, sys

CMD = ['npx', '-y', 'rezona@latest', 'mcp']


def rpc(mensajes, espera=300):
    ent = '\n'.join(json.dumps(m) for m in mensajes) + '\n'
    p = subprocess.run(CMD, input=ent, capture_output=True, text=True, timeout=espera)
    salida = []
    for linea in p.stdout.splitlines():
        linea = linea.strip()
        if not linea.startswith('{'):
            continue
        try:
            salida.append(json.loads(linea))
        except Exception:
            pass
    return salida


def sesion(llamadas, espera=300):
    """`llamadas` es una lista de (herramienta, argumentos). Devuelve las respuestas."""
    ms = [{'jsonrpc': '2.0', 'id': 1, 'method': 'initialize',
           'params': {'protocolVersion': '2024-11-05', 'capabilities': {},
                      'clientInfo': {'name': 'rz', 'version': '1'}}},
          {'jsonrpc': '2.0', 'method': 'notifications/initialized'}]
    for i, (n, a) in enumerate(llamadas):
        ms.append({'jsonrpc': '2.0', 'id': 10 + i, 'method': 'tools/call',
                   'params': {'name': n, 'arguments': a}})
    out = rpc(ms, espera)
    # ── SE ORDENA POR `id`, NO POR EL ORDEN EN QUE LLEGARON ──
    # El servidor contesta a medida que termina cada llamada, así que la lista
    # cruda NO viene en el orden en que se pidió: medido, mandando siete
    # generaciones seguidas la respuesta de la primera traía el `output_path` de
    # la segunda. Emparejar por posición cruza los resultados en silencio, que es
    # la peor clase de error — no falla, contesta mal.
    res = [m for m in out if m.get('id', 0) >= 10]
    res.sort(key=lambda m: m['id'])
    return res


def texto(res):
    """el texto de una respuesta de herramienta, ya desanidado"""
    try:
        return res['result']['content'][0]['text']
    except Exception:
        return json.dumps(res)


def main():
    if len(sys.argv) < 2:
        print(__doc__); return 1
    if sys.argv[1] == 'tools':
        ms = [{'jsonrpc': '2.0', 'id': 1, 'method': 'initialize',
               'params': {'protocolVersion': '2024-11-05', 'capabilities': {},
                          'clientInfo': {'name': 'rz', 'version': '1'}}},
              {'jsonrpc': '2.0', 'method': 'notifications/initialized'},
              {'jsonrpc': '2.0', 'id': 2, 'method': 'tools/list'}]
        for m in rpc(ms):
            if m.get('id') == 2:
                for t in m['result']['tools']:
                    print('%-34s %s' % (t['name'], t['description'].split('.')[0]))
        return 0
    if sys.argv[1] == 'esquema':
        filtro = sys.argv[2] if len(sys.argv) > 2 else ''
        ms = [{'jsonrpc': '2.0', 'id': 1, 'method': 'initialize',
               'params': {'protocolVersion': '2024-11-05', 'capabilities': {},
                          'clientInfo': {'name': 'rz', 'version': '1'}}},
              {'jsonrpc': '2.0', 'method': 'notifications/initialized'},
              {'jsonrpc': '2.0', 'id': 2, 'method': 'tools/list'}]
        for m in rpc(ms):
            if m.get('id') == 2:
                for t in m['result']['tools']:
                    if filtro and filtro not in t['name']:
                        continue
                    print('=' * 70)
                    print(t['name'])
                    print('-' * 70)
                    print(t['description'])
                    print(json.dumps(t.get('inputSchema'), indent=2, ensure_ascii=False))
        return 0
    if sys.argv[1] == 'openapi':
        # EL SERVIDOR PUBLICA SU PROPIO SCHEMA, y es la fuente de verdad cuando el
        # del MCP no alcanza: el paquete npm escribe los suyos A MANO y su propio
        # comentario avisa que van a derivar del servidor. Ahí aparecen model_version,
        # negative_prompt, quad, style, smart_low_poly, los tres seed… todos por `extra`.
        import os, ssl, urllib.request
        c = json.load(open(os.path.expanduser('~/.rezona/credentials.json')))
        base = c['baseUrl'].rstrip('/')
        req = urllib.request.Request(base + '/openapi.json',
                                     headers={'Authorization': 'Bearer %s' % c['token']})
        ctx = ssl.create_default_context(cafile='/root/.ccr/ca-bundle.crt')
        d = json.loads(urllib.request.urlopen(req, timeout=60, context=ctx).read())
        pat = (sys.argv[2] if len(sys.argv) > 2 else '').lower()
        for k, v in sorted(d['components']['schemas'].items()):
            if pat and pat not in k.lower():
                continue
            print('=' * 70)
            print(k)
            print(json.dumps(v, indent=2, ensure_ascii=False))
        return 0
    if sys.argv[1] == 'call':
        n = sys.argv[2]
        a = json.loads(sys.argv[3]) if len(sys.argv) > 3 else {}
        for r in sesion([(n, a)]):
            print(texto(r))
        return 0
    print(__doc__); return 1


if __name__ == '__main__':
    sys.exit(main())
