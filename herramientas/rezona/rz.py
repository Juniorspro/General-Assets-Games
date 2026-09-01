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
import json, queue, subprocess, sys, threading, time

CMD = ['npx', '-y', 'rezona@latest', 'mcp']


def rpc(mensajes, espera=300):
    """Manda los mensajes por stdin y devuelve las respuestas JSON.

    ── SE CORTA CUANDO LLEGARON LAS RESPUESTAS PEDIDAS, NO CUANDO MUERE EL PROCESO ──
    La version anterior era un `subprocess.run(...)`, que espera a que el proceso
    termine. Con `list_projects` andaba porque el servidor cierra solo; con
    `fetch_generated_asset` NO: escribe el archivo y se queda vivo. Medido: la
    descarga tardo dos segundos, el archivo quedo en disco, y el cliente se comio
    los 230 s de timeout y despues tiro `TimeoutExpired` — un asset bajado
    reportado como fallado, que es la peor forma de contestar mal.

    Ahora se lee la salida a medida que llega y se corta apenas estan las
    respuestas de todos los `id` que se mandaron; despues se mata el proceso.
    """
    esperados = set(m['id'] for m in mensajes if 'id' in m)
    p = subprocess.Popen(CMD, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                         stderr=subprocess.DEVNULL, text=True)
    cola = queue.Queue()

    def leer():
        try:
            for linea in p.stdout:
                cola.put(linea)
        except Exception:
            pass
        cola.put(None)

    threading.Thread(target=leer, daemon=True).start()
    try:
        p.stdin.write('\n'.join(json.dumps(m) for m in mensajes) + '\n')
        p.stdin.flush()
    except Exception:
        pass

    salida, vistos, limite = [], set(), time.time() + espera
    while not (esperados and esperados <= vistos):
        resto = limite - time.time()
        if resto <= 0:
            break
        try:
            linea = cola.get(timeout=min(resto, 1.0))
        except queue.Empty:
            continue
        if linea is None:
            break
        linea = linea.strip()
        if not linea.startswith('{'):
            continue
        try:
            m = json.loads(linea)
        except Exception:
            continue
        salida.append(m)
        if 'id' in m:
            vistos.add(m['id'])

    try:
        p.stdin.close()
    except Exception:
        pass
    p.terminate()
    try:
        p.wait(timeout=10)
    except Exception:
        p.kill()
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
