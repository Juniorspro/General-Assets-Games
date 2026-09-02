#!/usr/bin/env python3
"""Cliente mínimo del MCP de Rezona Lab, por stdio.

    python3 herramientas/rezona/rz.py tools
    python3 herramientas/rezona/rz.py call <herramienta> '<json de argumentos>'

POR QUÉ EXISTE: el servidor está declarado en `.mcp.json` pero las herramientas
`mcp__rezona__*` no están cargadas en esta sesión —haría falta reiniciar el
cliente—, y el servidor habla JSON-RPC por stdin/stdout como cualquier MCP. Son
treinta líneas y evita esperar un reinicio.

LA CREDENCIAL NO ESTÁ ACÁ NI PUEDE ESTAR. Vive en `~/.rezona/credentials.json`,
que la pone `npx rezona@latest login` con un código de un solo uso. Este repo es
público: la llave adentro sería la llave publicada. Por eso `.rezona/` está en el
`.gitignore` y este script no la lee ni la imprime nunca.
"""
import json, shutil, subprocess, sys

CMD = ['rezona', 'mcp'] if shutil.which('rezona') else ['npx', '-y', 'rezona@latest', 'mcp']


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
    if sys.argv[1] == 'call':
        n = sys.argv[2]
        a = json.loads(sys.argv[3]) if len(sys.argv) > 3 else {}
        for r in sesion([(n, a)]):
            print(texto(r))
        return 0
    print(__doc__); return 1


if __name__ == '__main__':
    sys.exit(main())

