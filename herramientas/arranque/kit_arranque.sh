#!/bin/bash
# ══════════════════════════════════════════════════════════════════════════════
#  KIT DE ARRANQUE — General-Assets-Games
#
#      bash kit_arranque.sh
#
#  Un solo archivo. Deja la sesión lista: escribe el script de arranque, la skill
#  con las convenciones del repo y el estado de Rezona, y después corre las
#  comprobaciones.
#
#  ────────────────────────────────────────────────────────────────────────────
#  LEER ESTO PRIMERO SI "NO EXISTE NADA EN EL REPO"
#
#  El repo es github.com/Juniorspro/General-Assets-Games, PERO todo el trabajo
#  —los nueve juegos, las herramientas, las 91 skills y CLAUDE.md— vive en UNA
#  rama, no en main:
#
#      main                                    28 commits · sólo el volcado de
#                                              assets sueltos (.glb, .zip, .mp3)
#      claude/billeteras-sin-registro-3z7uvz  563 commits · TODO lo demás
#
#  Si tu sesión te asignó otra rama (p. ej. -ij240g), esa rama salió de `main` y
#  por eso ves sólo los assets: no falta nada, estás en otro lado del árbol.
#  El nombre "billeteras sin registro" es el de la primera sesión y no tiene
#  nada que ver con el contenido.
#
#  TRAERLO:
#      git fetch origin claude/billeteras-sin-registro-3z7uvz
#      git checkout claude/billeteras-sin-registro-3z7uvz
#
#  Si tenés que quedarte en TU rama, traé sólo el contenido encima:
#      git fetch origin claude/billeteras-sin-registro-3z7uvz
#      git merge --allow-unrelated-histories FETCH_HEAD
#
#  Y si no podés alcanzar esa rama, este script igual te deja lo esencial: lo
#  escribe él mismo, más abajo.
#  ══════════════════════════════════════════════════════════════════════════════
set -u
cd "$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
echo "escribiendo el kit en $(pwd)"
mkdir -p herramientas/rezona
cat > herramientas/rezona/rz.py <<'__FIN_HERRAMIENTAS_REZONA_RZ_PY__'
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
    if sys.argv[1] == 'call':
        n = sys.argv[2]
        a = json.loads(sys.argv[3]) if len(sys.argv) > 3 else {}
        for r in sesion([(n, a)]):
            print(texto(r))
        return 0
    print(__doc__); return 1


if __name__ == '__main__':
    sys.exit(main())

__FIN_HERRAMIENTAS_REZONA_RZ_PY__
chmod 755 herramientas/rezona/rz.py
echo '  . herramientas/rezona/rz.py'
mkdir -p herramientas/rezona
cat > herramientas/rezona/estado.json <<'__FIN_HERRAMIENTAS_REZONA_ESTADO_JSON__'
{
  "_": [
    "ESTADO DE REZONA LAB — LO QUE NO ES SECRETO.",
    "Acá va todo lo que una sesión nueva necesita para NO tener que redescubrir:",
    "en qué proyecto poner las cosas, qué assets ya existen y con qué parámetros",
    "salieron bien. La CREDENCIAL no está acá y no puede estar: este repo es",
    "público. Vive en ~/.rezona/credentials.json, la escribe `npx rezona@latest",
    "login` con un código de un solo uso, y `.rezona/` está en .gitignore.",
    "Refrescar con: python3 herramientas/rezona/estado.py"
  ],
  "proyectos": {
    "PwVerjWD": {
      "nombre": "BARRIO — texturas y assets",
      "usar_para": "todo lo de juegos-pc/Barrio.html"
    },
    "aCIjanpu": {
      "nombre": "LEMI Assets 3D",
      "usar_para": "assets de LEMI"
    },
    "uSEsgNXL": {
      "nombre": "BARRIO — assets",
      "usar_para": "segundo proyecto de BARRIO; el de las texturas es PwVerjWD — ver la nota de duplicados"
    },
    "ZFiGfVQs": {
      "nombre": "BARRIO personaje",
      "usar_para": "el personaje de BARRIO: cuerpo, cara, rig y ciclo de paso"
    },
    "zQflBRio": {
      "nombre": "LEMI",
      "usar_para": "segundo proyecto de LEMI; el de los assets 3D es aCIjanpu — ver la nota de duplicados"
    }
  },
  "carpeta_de_descarga": {
    "ruta": "/tmp/rez_barrio",
    "por_que_fuera_del_repo": [
      "`fetch_generated_asset` se niega a escribir en una carpeta sin marca",
      "`.rezona/`, y esa marca la pone `npx rezona@latest init`. Si se hiciera el",
      "init DENTRO del repo, quedaría un `.rezona/` en el árbol — que es justo lo",
      "que el .gitignore existe para evitar. Se hace afuera y se copia lo horneado."
    ],
    "init": "cd /tmp/rez_barrio && npx rezona@latest init"
  },
  "assets_generados": {
    "texturas_barrio": {
      "output_paths": [
        "assets/asfalto-g1.png",
        "assets/vereda-g1.png",
        "assets/pasto-g1.png",
        "assets/madera-g1.png",
        "assets/ladrillo-g1.png",
        "assets/tabla-g1.png",
        "assets/teja-g1.png"
      ],
      "en_el_juego": "pasto y madera; las otras cinco ganaron las de Higgsfield",
      "hornea": "TEX_DIR=/tmp/tex3 python3 herramientas/barrio/hornear_tex.py"
    },
    "ciudad": {
      "output_paths": [
        "assets/fachada-g1.png",
        "assets/fachada2-g1.png",
        "assets/calleaerea-g1.png",
        "assets/azotea-g1.png"
      ],
      "hornea": "CIU_DIR=/tmp/ciu python3 herramientas/barrio/hornear_ciudad.py"
    },
    "muebles": {
      "output_paths": [
        "assets/velador2-g1.glb",
        "assets/silla2-g1.glb",
        "assets/mesita2-g1.glb",
        "assets/comoda2-g1.glb"
      ],
      "nota": "la tanda SIN el 2 es la vieja, la que salió corrupta por el decimado",
      "hornea": "MUE_DIR=/tmp/mue2 python3 herramientas/barrio/hornear_muebles.py"
    },
    "ciclo_de_paso": {
      "output_paths": [
        "assets/peaton-g1.glb",
        "assets/peaton_rig-g1.glb"
      ],
      "source_task_id_del_peaton": "gtask-49a4e33f1b244aebb72b",
      "nota": "`submit_rig3d_generation` sólo acepta el task_id de un modelo PROPIO, así que no se puede riggear el personaje que ya tiene el juego: se riggea un peatón y se retargetea el MOVIMIENTO",
      "hornea": "python3 herramientas/barrio/hornear_paso.py"
    }
  },
  "parametros_que_funcionaron": {
    "submit_model3d_generation": {
      "texture": true,
      "pbr": false,
      "texture_quality": "detailed",
      "extra": {
        "face_limit": 6000
      },
      "por_que_face_limit": "sin él Tripo devuelve UN MILLÓN de triángulos y decimarlo a dos mil es tirar el 99,8 % — el simplificador se come los tiradores de los cajones y los muebles salen corruptos",
      "prompt_que_sale_bien": "un objeto solo, formas limpias, foto de producto sobre fondo blanco liso, objeto entero visible, centrado"
    },
    "submit_image_generation": {
      "prompt_que_sale_bien": "seamless tileable texture of …, straight-on orthographic view, flat, no perspective, no shadows, photographic",
      "por_que_sin_sombras": "un pedido de «textura» que no dice «sin sombras» devuelve una foto con la luz horneada, y esa luz pelea con la del juego en cada superficie"
    },
    "submit_rig3d_generation": {
      "animations": [
        "preset:walk",
        "preset:run"
      ],
      "nota": "cada animación se cobra aparte de el rig: pedir las que hacen falta, no una lista especulativa"
    }
  },
  "trampas": {
    "respuestas_desordenadas": "el servidor contesta a medida que termina cada llamada, así que la lista cruda NO viene en el orden en que se pidió. Emparejar por posición cruza los resultados EN SILENCIO — ya pasó: el asfalto llegó con el output_path de la vereda. Hay que ordenar por el `id` del JSON-RPC (rz.py ya lo hace).",
    "publish_to_rezona_app": "ES IRREVERSIBLE. No llamarlo nunca sin pedido explícito.",
    "mcp_no_cargado": "los MCP se cargan al ARRANCAR la sesión. Si no está, se le habla por stdio: python3 herramientas/rezona/rz.py tools"
  },
  "proyectos_duplicados": [
    "HAY DOS PROYECTOS POR JUEGO EN EL SERVIDOR, y la regla es uno por juego.",
    "BARRIO: PwVerjWD (texturas y assets) y uSEsgNXL (assets), mas ZFiGfVQs (personaje).",
    "LEMI:   aCIjanpu (LEMI Assets 3D) y zQflBRio (LEMI).",
    "Los que valen y contra los que esta anotado todo lo horneado son PwVerjWD y",
    "aCIjanpu: generar ahi salvo que el usuario diga otra cosa. Los otros existen en",
    "el servidor y se anotan para que una sesion nueva no crea que son proyectos",
    "nuevos y empiece a repartir assets del mismo juego en dos lados.",
    "El servidor tiene 20 proyectos en total; los que no son de este repo NO se",
    "anotan aca a proposito: no le sirven a nadie y el repo es publico."
  ]
}
__FIN_HERRAMIENTAS_REZONA_ESTADO_JSON__
chmod 644 herramientas/rezona/estado.json
echo '  . herramientas/rezona/estado.json'
mkdir -p herramientas/rezona
cat > herramientas/rezona/estado.py <<'__FIN_HERRAMIENTAS_REZONA_ESTADO_PY__'
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

    # ── SE REFRESCAN LOS CONOCIDOS; LOS AJENOS SE LISTAN, NO SE ESCRIBEN ──
    # La version anterior anotaba TODO lo que devolvia el servidor. Medido: la
    # cuenta tiene 20 proyectos y sólo 5 son de este repo, asi que un refresco
    # metia 15 nombres de proyectos ajenos en un archivo que se commitea a un
    # repo PUBLICO. Y el inventario existe para decir que proyecto es cual
    # PARA LOS JUEGOS DE ACA: los otros no le sirven a una sesion nueva.
    # Los nuevos se muestran igual, para poder anotar a mano el que si haga
    # falta — con su `usar_para`, que es el dato que el servidor no tiene.
    ajenos = []
    for p in items:
        pid = p.get('public_id') or p.get('id')
        if not pid:
            continue
        if pid in d['proyectos']:
            d['proyectos'][pid]['nombre'] = p.get('name', d['proyectos'][pid]['nombre'])
        else:
            ajenos.append((pid, p.get('name', '')))
    io.open(EST, 'w', encoding='utf8').write(
        json.dumps(d, ensure_ascii=False, indent=2) + '\n')
    print('\n%d proyectos en el servidor · %d anotados aca, nombres refrescados'
          % (len(items), len(d['proyectos'])))
    if ajenos:
        print('\n%d en el servidor que NO estan anotados (no se escriben solos:'
              ' si alguno es de este repo, agregalo a mano con su `usar_para`):' % len(ajenos))
        for pid, n in ajenos:
            print('  %-10s %s' % (pid, n))
    return 0


if __name__ == '__main__':
    sys.exit(main())
__FIN_HERRAMIENTAS_REZONA_ESTADO_PY__
chmod 755 herramientas/rezona/estado.py
echo '  . herramientas/rezona/estado.py'
mkdir -p herramientas/arranque
cat > herramientas/arranque/preparar.sh <<'__FIN_HERRAMIENTAS_ARRANQUE_PREPARAR_SH__'
#!/bin/bash
# ══════════════════════════════════════════════════════════════════════════════
#  ARRANQUE DE UNA SESIÓN NUEVA
#
#      bash herramientas/arranque/preparar.sh
#
#  Deja lista una sesión recién clonada: dependencias, los MCP declarados, el
#  login de Rezona y el banco de pruebas. Es idempotente — correrlo dos veces no
#  hace daño y no vuelve a bajar lo que ya está.
#
#  POR QUÉ EXISTE: el contenedor es efímero y se revierte solo. En esta misma
#  sesión pasó DOS VECES: el HEAD saltó noventa commits hacia atrás y
#  `herramientas/barrio/` dejó de existir. Todo lo que estaba pusheado sobrevive;
#  lo que estaba en /tmp o sin commitear, no. Esto lo rearma en un comando.
# ══════════════════════════════════════════════════════════════════════════════
set -u
RAIZ="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$RAIZ"
ok(){ printf '  \033[32m✓\033[0m %s\n' "$1"; }
no(){ printf '  \033[31m✗\033[0m %s\n' "$1"; }
eh(){ printf '  \033[33m·\033[0m %s\n' "$1"; }
tit(){ printf '\n\033[1m%s\033[0m\n' "$1"; }

tit "1 · lo que tiene que estar instalado"
for c in node npx python3 git; do
  if command -v $c >/dev/null 2>&1; then ok "$c $($c --version 2>&1 | head -1)"; else no "falta $c"; fi
done
python3 - <<'PY' 2>/dev/null && ok "python: numpy y Pillow" || no "faltan numpy/Pillow → pip install numpy Pillow"
import numpy, PIL
PY

tit "2 · el repo"
if ! git rev-parse HEAD >/dev/null 2>&1; then
  no "no hay commits acá — ¿estás en el repo equivocado, o en un clon vacío?"
  eh "el trabajo vive en: git fetch origin claude/billeteras-sin-registro-3z7uvz"
else
echo "  rama   $(git rev-parse --abbrev-ref HEAD)"
echo "  HEAD   $(git rev-parse --short HEAD)  $(git log -1 --format=%s | cut -c1-60)"
git fetch origin "$(git rev-parse --abbrev-ref HEAD)" -q 2>/dev/null
ATRAS=$(git rev-list --count HEAD..@{u} 2>/dev/null || echo 0)
if [ "$ATRAS" -gt 0 ]; then
  no "el local está $ATRAS commits ATRÁS del remoto — el contenedor se revirtió"
  eh "arreglalo con:  git reset --hard @{u}      (nada local se pierde: todo lo bueno está pusheado)"
else
  ok "al día con el remoto"
fi
SUCIO=$(git status --porcelain | wc -l)
[ "$SUCIO" -eq 0 ] && ok "árbol limpio" || eh "$SUCIO archivos sin commitear — MIRALOS antes de commitear, pueden ser de un snapshot viejo"
JUEGOS=$(ls -1 juegos-pc/*.html 2>/dev/null | wc -l)
if [ "$JUEGOS" -eq 0 ]; then
  no "no hay juegos-pc/ — estás en una rama que salió de main"
  eh "main tiene 28 commits y sólo el volcado de assets; el trabajo (563 commits)"
  eh "está en claude/billeteras-sin-registro-3z7uvz. Traelo con:"
  eh "    git fetch origin claude/billeteras-sin-registro-3z7uvz && git checkout FETCH_HEAD"
else
  ok "$JUEGOS juegos en juegos-pc/"
fi
fi

tit "3 · los MCP declarados en .mcp.json"
if [ -f .mcp.json ]; then
  python3 - <<'PY'
import json, io
d = json.load(io.open('.mcp.json', encoding='utf8'))
for n, s in d.get('mcpServers', {}).items():
    print('  · %-18s %s %s' % (n, s.get('command',''), ' '.join(s.get('args', []))))
print('\n  OJO: los MCP se cargan al ARRANCAR la sesión. Si acabás de agregar uno,')
print('  esta sesión NO lo tiene: hay que reiniciar el cliente. Mientras tanto se')
print('  le puede hablar por stdio — ver herramientas/rezona/rz.py.')
PY
else
  no "no hay .mcp.json"
fi

tit "4 · Rezona Lab"
if [ -f "$HOME/.rezona/credentials.json" ]; then
  ok "hay credencial en ~/.rezona/credentials.json"
else
  no "sin credencial"
  eh "corré:  npx rezona@latest login    (código de un solo uso; la llave NUNCA va al repo)"
  eh "el estado NO secreto —proyectos, assets, parámetros— está en herramientas/rezona/estado.json"
fi
python3 herramientas/rezona/estado.py --ver 2>/dev/null | sed 's/^/  /'
echo "  probando el servidor…"
# ── SE GUARDA LA RESPUESTA Y DESPUES SE MIRA, NO SE ENCADENA CON && / || ──
# La version anterior era `… | grep -qi "not authenticated" && no … || ok …`, y
# con eso NO HABER CONTESTADO NADA caia en el verde: la primera corrida de una
# sesion nueva se va en que `npx` baja el paquete, se pasa el timeout, el grep no
# encuentra nada porque no hay nada, y el `||` anuncia "el servidor contesta".
# Medido: dijo el verde con la credencial ausente. Un chequeo que miente en el
# caso que existe para detectar es peor que no tenerlo.
RESP="$(timeout 240 python3 herramientas/rezona/rz.py call list_projects '{}' 2>/dev/null | head -3)"
if [ -z "$RESP" ]; then
  no "el servidor no contesto en 240 s (la primera vez npx baja el paquete: volve a correrlo)"
elif printf '%s' "$RESP" | grep -qi "not authenticated"; then
  no "el servidor responde pero falta el login  →  npx rezona@latest login"
else
  ok "el servidor contesta"
fi

tit "5 · el banco de pruebas"
if [ -f /tmp/ui/run2.sh ] && [ -d /tmp/ui/node_modules/playwright ]; then
  ok "ya está en /tmp/ui"
else
  eh "armándolo (baja playwright, three y acorn la primera vez)…"
  bash herramientas/banco/armar.sh && ok "banco listo en /tmp/ui" || no "falló"
fi
[ -x /opt/pw-browsers/chromium*/chrome-linux/chrome ] 2>/dev/null && ok "chromium del contenedor" \
  || eh "chromium: PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers (no correr 'playwright install')"

tit "6 · skills"
N=$(ls -1 .claude/skills 2>/dev/null | grep -v README | wc -l)
[ "$N" -gt 0 ] && ok "$N skills en .claude/skills/" || no "no hay skills en el repo"
eh "las de creación y animación: game-asset-pipeline · game-character-animation ·"
eh "game-physics-rapier · open-world-streaming · realtime-rendering-quality"

tit "listo"
echo "  Leé la skill 'arranque' para saber cómo se trabaja en este repo:"
echo "      /arranque      (o mirá .claude/skills/arranque/SKILL.md)"
echo

__FIN_HERRAMIENTAS_ARRANQUE_PREPARAR_SH__
chmod 755 herramientas/arranque/preparar.sh
echo '  . herramientas/arranque/preparar.sh'
mkdir -p herramientas/arranque
cat > herramientas/arranque/login_rezona.sh <<'__FIN_HERRAMIENTAS_ARRANQUE_LOGIN_REZONA_SH__'
#!/bin/bash
# ══════════════════════════════════════════════════════════════════════════════
#  LOGIN DE REZONA LAB — el enlace y el código, sin salir de acá
#
#      bash herramientas/arranque/login_rezona.sh
#
#  Arranca el flujo de autenticación, IMPRIME EL ENLACE que hay que abrir y se
#  queda esperando hasta que lo apruebes. No pide ni muestra ninguna llave.
# ══════════════════════════════════════════════════════════════════════════════
set -u
LOG=/tmp/rezona_login.log
ESPERA_MAX=600          # 10 minutos para aprobar
ok(){ printf '  \033[32m✓\033[0m %s\n' "$1"; }
no(){ printf '  \033[31m✗\033[0m %s\n' "$1"; }
eh(){ printf '  \033[33m·\033[0m %s\n' "$1"; }

cat <<'AVISO'

╔══════════════════════════════════════════════════════════════════════════════╗
║  ANTES DE EMPEZAR — LO QUE **NO** HAY QUE HACER                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

  ✗ NO pegues la llave en el chat, ni en un commit, ni en un archivo del repo.
      Este repo es PÚBLICO: un token commiteado es un token publicado, y quien
      lo levante genera con tu cuenta. `.rezona/` está en el .gitignore por eso.
      El login de abajo deja la sesión en ~/.rezona/credentials.json y listo.

  ✗ NO corras `npx rezona@latest init` DENTRO del repo.
      `init` deja una marca `.rezona/` en la carpeta donde lo corras, y esa
      carpeta pasa a ser un proyecto de Rezona. Hacelo AFUERA:
          mkdir -p /tmp/rez && cd /tmp/rez && npx rezona@latest init
      Y desde ahí se descargan los assets, que después se hornean al repo.
      `login` (esto) NO toca archivos del proyecto: es sólo la credencial.

  ✗ NO llames a `publish_to_rezona_app`. Es IRREVERSIBLE.
      Publica el juego para todo el mundo. Sólo con pedido explícito y textual.

  ✗ NO esperes que el MCP funcione en ESTA sesión si recién lo agregás.
      Los MCP se cargan al ARRANCAR la sesión. Mientras tanto se le habla por
      stdio:  python3 herramientas/rezona/rz.py tools

  ✗ NO emparejes las respuestas por posición cuando mandes varias llamadas.
      El servidor contesta a medida que termina cada una, así que vuelven
      DESORDENADAS. Ya pasó: una textura llegó con la ruta de otra y no falló
      nada, contestó mal. Hay que ordenar por el `id` del JSON-RPC — `rz.py`
      ya lo hace.

  ✗ NO generes sin pasar `face_limit`. Tripo devuelve UN MILLÓN de triángulos
      y decimarlos después destroza el modelo. Los parámetros que funcionaron
      están en herramientas/rezona/estado.json.

AVISO

echo "──────────────────────────────────────────────────────────────────────────────"
# SE DETECTA POR LO QUE DICE CUANDO **NO** HAY SESIÓN, no por lo que dice cuando
# sí la hay: el texto de éxito trae el nombre y el entorno, que cambian, y el de
# fracaso es una frase fija. Ojo con el patrón — "sign in" NO matchea "signed
# in", y por eso la primera versión daba por buena una sesión que no existía.
printf '\n\033[1m1 · ¿ya estás autenticado?\033[0m\n'
if timeout 120 npx -y rezona@latest status 2>&1 | tee /tmp/rezona_status.log | grep -qiE "not signed in|not authenticated|no credentials|latest.? login|please log ?in"; then
  no "todavía no"
else
  if [ -s /tmp/rezona_status.log ]; then
    ok "ya hay sesión:"
    sed 's/^/     /' /tmp/rezona_status.log | head -8
    echo
    eh "si querés renovarla igual, borrá ~/.rezona y volvé a correr esto."
    exit 0
  fi
  no "no se pudo comprobar; sigo con el login"
fi

printf '\n\033[1m2 · arrancando el flujo\033[0m\n'
rm -f "$LOG"; : > "$LOG"
# --no-browser IMPRIME la URL en vez de intentar abrir un navegador, que es lo
# correcto en un contenedor sin escritorio: sin esto el comando se queda mudo
# esperando un navegador que no existe.
setsid npx -y rezona@latest login --no-browser > "$LOG" 2>&1 &
PID=$!

echo "  esperando el enlace…"
URL=""
for i in $(seq 1 60); do
  sleep 2
  URL=$(grep -oE 'https?://[^ ")]+' "$LOG" | head -1)
  [ -n "$URL" ] && break
  kill -0 $PID 2>/dev/null || break
done

if [ -z "$URL" ]; then
  no "no apareció ningún enlace. Esto es lo que dijo el comando:"
  sed 's/^/     /' "$LOG" | head -20
  eh "alternativa: npx rezona@latest login --paste   (pegás una llave que ya tengas)"
  exit 1
fi

cat <<FIN

╔══════════════════════════════════════════════════════════════════════════════╗
║  ABRÍ ESTE ENLACE Y APROBÁ                                                   ║
╚══════════════════════════════════════════════════════════════════════════════╝

    $URL

FIN
# EL CÓDIGO VA ENTERO. El CLI lo imprime en cuatro grupos —KF7J-RERC-LOEN-MJKS—
# y un patrón de dos grupos se queda con la mitad: eso no sirve para lo único
# para lo que existe, que es COMPARARLO con el que muestra la página antes de
# aprobar. Se toma la línea propia del CLI y, si cambiara, el código del enlace.
COD=$(grep -iE 'confirmation code' "$LOG" | grep -oE '[A-Z0-9]{4}(-[A-Z0-9]{4})+' | head -1)
[ -z "$COD" ] && COD=$(printf '%s' "$URL" | grep -oE 'code=[A-Z0-9-]+' | cut -d= -f2)
[ -n "$COD" ] && echo "    código: $COD"
echo "    (tiene que ser EL MISMO que muestra la página; si no, no aprobés)"
echo "  (podés abrirlo en el celular; el código es de un solo uso y vence solo)"
echo

printf '\033[1m3 · esperando que apruebes…\033[0m\n'
T=0
while [ $T -lt $ESPERA_MAX ]; do
  sleep 5; T=$((T+5))
  if ! kill -0 $PID 2>/dev/null; then break; fi
  [ $((T % 60)) -eq 0 ] && echo "  … $((T/60)) min"
done
wait $PID 2>/dev/null

printf '\n\033[1m4 · comprobando\033[0m\n'
if timeout 120 npx -y rezona@latest status 2>&1 | tee /tmp/rezona_status.log \
   | grep -qiE "not signed in|not authenticated|no credentials|latest.? login"; then
  no "sigue sin sesión. Lo que dijo el login:"
  sed 's/^/     /' "$LOG" | tail -15
  exit 1
fi
ok "autenticado"
sed 's/^/     /' /tmp/rezona_status.log | head -8

printf '\n\033[1m5 · los proyectos que hay\033[0m\n'
EST="$(dirname "$0")/../rezona/estado.py"
RZ="$(dirname "$0")/../rezona/rz.py"
if [ -f "$EST" ]; then python3 "$EST" 2>&1 | sed 's/^/  /'
elif [ -f "$RZ" ]; then timeout 180 python3 "$RZ" call list_projects '{}' 2>&1 | head -20 | sed 's/^/  /'
else eh "para ver los proyectos: python3 herramientas/rezona/rz.py call list_projects '{}'"
fi

cat <<'FIN'

  listo. Recordá:
    · los assets se bajan a una carpeta FUERA del repo (/tmp/rez, con `init` ahí)
    · los parámetros que funcionan están en herramientas/rezona/estado.json
    · publish_to_rezona_app NO se llama nunca sin pedido explícito

FIN

__FIN_HERRAMIENTAS_ARRANQUE_LOGIN_REZONA_SH__
chmod 755 herramientas/arranque/login_rezona.sh
echo '  . herramientas/arranque/login_rezona.sh'
mkdir -p .claude/skills/arranque
cat > .claude/skills/arranque/SKILL.md <<'__FIN__CLAUDE_SKILLS_ARRANQUE_SKILL_MD__'
---
name: arranque
description: Cómo se trabaja en este repo de juegos HTML autocontenidos — el arranque de una sesión nueva, los MCP, el banco de pruebas, las tuberías de assets de Rezona Lab y Higgsfield, y las diez reglas que ya costaron una vuelta cada una. Usar al empezar una sesión en General-Assets-Games, al retomar cualquiera de los juegos de juegos-pc/, al generar un asset 3D, una textura, una voz o una animación, y cuando algo del contenedor, del banco de pruebas o del login de Rezona no funcione.
---

# Cómo se trabaja acá

Este repo hace **juegos HTML autocontenidos** para el portal **Rezona**. Un juego = **un archivo**
en `juegos-pc/`, sin dependencias fuera del CDN de three.js. El usuario prueba **en el celular, en
vertical**, y escribe en castellano rioplatense.

## Lo primero, siempre

```bash
bash herramientas/arranque/preparar.sh
```

Comprueba dependencias, el estado del repo contra el remoto, los MCP, el login de Rezona y arma el
banco de pruebas. Es idempotente.

**EL CONTENEDOR SE REVIERTE SOLO, y no avisa.** En una sola sesión pasó dos veces: el `HEAD` saltó
noventa commits hacia atrás y `herramientas/barrio/` dejó de existir. Consecuencias prácticas:

- **Pushear seguido.** Lo pusheado sobrevive; lo demás no.
- **Antes de commitear, MIRAR el diff.** Después de una reversión, `git add -A` agarra un árbol
  viejo y commitearlo *revierte* trabajo bueno. Pasó: el commit se hizo sobre una base de noventa
  commits atrás y el push lo rechazó — eso fue lo único que lo salvó.
- Si el push sale rechazado: `git fetch` y comparar `git log HEAD..@{u}` contra `git log @{u}..HEAD`
  **antes** de rebasear. Si lo de allá ya contiene lo de acá, se descarta lo local.

## Las reglas fijas del usuario

- **Nunca** usar cuadros de `AskUserQuestion`: *«se buguea, uso celular»*. Preguntar en texto plano.
- Desarrollar, commitear y pushear **sólo** a la rama de trabajo indicada.
- **No** abrir pull requests salvo pedido explícito.
- **No** poner el identificador del modelo en commits, PRs, comentarios de código ni nada que se
  pushee.
- **Verificar midiendo antes de afirmar que algo funciona.** Historial textual: *«apenas hacés algo
  nuevo rompés otra cosa»*. Esto no es una formalidad: es el criterio con el que se juzga el trabajo.
- Cuando pide *«dame el HTML»*, quiere el archivo adjunto.
- **«Pope»** = seguir con la lista de pendientes de `CLAUDE.md`.

## Cómo está hecho un juego

Los juegos grandes **viven partidos** en `herramientas/<juego>/partes/` y se arman con
`python3 herramientas/<juego>/armar.py`. **Las partes son la fuente; el HTML es la salida.**

Un HTML de dos megas con base64 adentro no se edita con parches de texto: ya costó un archivo en
cero bytes. Y todo termina siendo **UN módulo ES**, así que:

> **Un `let`/`const` leído antes de su línea no devuelve `undefined`: TIRA, y se lleva el módulo
> entero.** Ya pasó ocho veces en este repo. Las declaraciones van **antes del primer uso**, no
> «donde corresponde temáticamente». El orden de `ORDEN` en `armar.py` es el orden en que hacen
> falta, no el alfabético.

Comprobar la sintaxis después de armar:

```bash
node -e "const a=require('/tmp/ui/node_modules/acorn'),f=require('fs');
const s=f.readFileSync('juegos-pc/X.html','utf8');
const m=s.match(/<script type=\"module\">([\s\S]*)<\/script>/);
try{a.parse(m[1],{ecmaVersion:'latest',sourceType:'module'});console.log('ok')}catch(e){console.log('ERROR',e.message)}"
```

## El banco de pruebas

```bash
bash herramientas/banco/armar.sh                      # lo rearma en /tmp/ui
python3 herramientas/<juego>/prep_banco.py juegos-pc/X.html /tmp/ui/x.html
cd /tmp/ui && fuser -k 8098/tcp; PAGINA=x.html MOVIL=1 bash run2.sh PLAN.json out/x.log 412 892
```

`prep_banco.py` reescribe los CDN a `node_modules` local: **Chromium en el contenedor no usa el
proxy de salida** (curl sí), así que un import a jsdelivr falla.

Un plan es una lista de `{"js": …}`, `{"click": …}`, `{"wait": ms}`, `{"n": "nombre"}` (captura).
Las capturas salen a `/tmp/ui/out/` en **412×892 vertical y giradas**: hay que enderezarlas con
`Image.rotate(90, expand=True)`.

**Cada juego expone sus sondas en `window.__X`** y ahí está la mitad del valor del repo: `est()`
para el costo del cuadro, `anda(n)` para caminar de verdad, `brillo()` que lee el búfer con
`readPixels`, `ejeH()` que dice para dónde mueve un hueso a otro. **Una afirmación sin número no
vale.** Y ojo:

> **La sonda puede estar mal antes que el juego.** Señal: números demasiado redondos. Midiendo el
> temblor de una cámara salieron 10,00 · 14,14 · 17,32 mm, que son 10·√1, √2 y √3 — era el
> `toFixed(2)` de la sonda, no la cámara.

## Los assets

### Rezona Lab (Tripo + imagen)

MCP declarado en `.mcp.json`. **Los MCP se cargan al arrancar la sesión**, así que si no está
cargado se le habla por stdio con el cliente chiquito del repo:

```bash
python3 herramientas/rezona/rz.py tools
python3 herramientas/rezona/rz.py call submit_model3d_generation '{"project_id":"…","output_path":"assets/x.glb","prompt":"…"}'
```

- `submit_image_generation` · `submit_model3d_generation` · `submit_rig3d_generation` (rig +
  animaciones sobre **un modelo propio**, no sobre uno que ya esté en el juego) · `submit_audio_generation`
  · `check_generation_tasks` · `fetch_generated_asset`.
- **El estado que NO es secreto está en `herramientas/rezona/estado.json`**: en qué proyecto va
  cada cosa (`PwVerjWD` para BARRIO), qué assets ya existen con su `output_path`, y **con qué
  parámetros salieron bien**. Leerlo antes de generar nada. Se refresca con
  `python3 herramientas/rezona/estado.py`.
- **La credencial vive en `~/.rezona/credentials.json`**, la escribe `npx rezona@latest login` con
  un código de un solo uso. `.rezona/` está en `.gitignore`: **el cliente puede vivir en el repo, la
  llave no.** Este repo es público.
- `fetch_generated_asset` no escribe en una carpeta sin marca `.rezona/`: hacer `npx rezona@latest
  init` en una carpeta **fuera del repo** (p. ej. `/tmp/rez_x`).
- **Las respuestas vuelven desordenadas.** Emparejar por posición cruza los resultados en silencio
  — hay que ordenar por el `id` del JSON-RPC. Ya pasó: el asfalto llegó con el `output_path` de la
  vereda.
- **`publish_to_rezona_app` es IRREVERSIBLE.** No llamarlo nunca sin pedido explícito.

### Higgsfield

MCP a nivel de cuenta: `generate_image`, `generate_video`, `generate_audio` (TTS y efectos),
`generate_3d`. Sirve para lo mismo; conviene generar con los dos y **comparar dentro del juego**.

### Y las diez reglas de horneado que ya costaron una vuelta cada una

1. **Pedir `face_limit` al generar.** Tripo devuelve **un millón** de triángulos; bajar eso a dos
   mil es tirar el 99,8 % y el simplificador se come los tiradores de los cajones — los muebles
   salen «corruptos». Con `extra:{face_limit:6000}` entran con 5.000 y se bajan a 3.000.
2. **El objetivo es un número de triángulos, no un ratio.** `-si 0.06` parecía trabado y hacía
   exactamente el 6 % de lo que se le daba.
3. **`gltfpack` va con `-noq`**: la cuantización entra como `KHR_mesh_quantization` en
   `extensionsRequired` y un lector que no la soporte no muestra **nada**.
4. **La textura se hornea en los vértices** antes de decimar: con UV puestas el simplificador tiene
   que respetar las costuras y se planta. Y al muestrear se convierte **de sRGB a lineal**, porque
   glTF trata `COLOR_0` como lineal.
5. **Leer `COLOR_0` como venga, no como uno supone.** gltfpack lo devuelve en VEC4 de bytes
   normalizados aunque se le pase `-noq`; leído como tres floats sin normalizar, los muebles salen
   **blanco puro con motas de colores**. Ni falla ni avisa.
6. **Contar los metros que cubre cada foto** —hiladas de ladrillo, filas de teja, tablas— y usar ese
   número para la repetición. Sin eso salen hiladas de 22 cm y la casa se lee a casa de muñecas.
   Y si hay un lienzo de respaldo, la repetición se **escala** por `metros_lienzo / metros_foto`, no
   se copia.
7. **El tinte se recalcula cuando cambia la foto.** three.js multiplica `map × vertexColor ×
   material.color`: el color del material es un tinte sobre la imagen. Se divide **en lineal** el
   promedio viejo por el nuevo.
8. **El mapa emisivo se DERIVA de la propia foto** (lo que pasa un percentil de luminancia), no se
   pide como segunda imagen: si no, hay ventanas que brillan sin estar dibujadas.
9. **Las costuras se resuelven con `MirroredRepeatWrapping`**, no cosiéndolas a mano: la copia de al
   lado va dada vuelta, así que los dos bordes que se tocan son el mismo borde.
10. **Los ejes de un hueso no se adivinan, se giran y se mira dónde quedó la punta.** Los ejes
    locales son los que dejó el bind y no significan nada. En BARRIO el muslo se movía **más de
    costado que hacia adelante** porque estaba en X y la flexión era Y — 7,0 cm contra 57,3.

## Las reglas de diseño que se repiten

- **Paso fijo con interpolación.** Un teléfono a 30 y una notebook a 144 tienen que jugar el mismo
  juego, si no la velocidad y el alcance salen distintos y eso no es rendimiento, es **otro juego**.
- **Un nivel generado y no jugado es un nivel roto que todavía no se sabe.** El generador tira, un
  validador comprueba, y un auto-jugador lo termina de punta a punta. Costó siete niveles imposibles
  en Maicol y una nube 37 de 42 en BARRIO.
- **El validador y el juego usan la MISMA cuenta.** Con dos, el validador aprueba un juego que no
  existe.
- **Los assets generados NO reemplazan nada hasta que llegan.** Se arranca con lo dibujado por
  código y la foto o la malla lo pisa cuando decodifica. Un base64 roto cuesta una pieza, no una
  pantalla vacía.
- **La cadencia es un dato del cuerpo:** `pasos por segundo = velocidad ÷ paso`. Un humano camina a
  1,9-2,4. Y el paso lo pone el ciclo de animación, no una constante al lado — si no, los pies
  patinan.
- **Lo que se lee a «tiembla» es la FRECUENCIA, no la amplitud.** Por encima de un hertz, cualquier
  amplitud tiembla aunque mida un milímetro.

## Las skills que ya están en el repo

91 en `.claude/skills/`. Las cinco de creación y animación:

| skill | cuándo |
|---|---|
| `game-asset-pipeline` | generar y optimizar modelos y texturas; algo se ve oscuro, gigante o roto |
| `game-character-animation` | esqueletos, mezcla de clips, retarget entre rigs, pies que patinan |
| `game-physics-rapier` | colisión, gravedad, salto, vehículos, ragdolls; tiembla o atraviesa |
| `open-world-streaming` | mundos grandes, chunks, LOD, procedural con semilla, persistencia |
| `realtime-rendering-quality` | se ve plano o de prototipo; tone mapping, HDRI, sombras, post |

Y ~85 de three.js específicas (`threejs-*`), de geometría a WebGPU. `.claude/skills/README.md`
dice de dónde salió cada una.

## Los juegos que ya existen

`juegos-pc/`: **Campo_de_Tiro.html** (Z Force, FPS — *no se toca ni se borra*), **Maicol** (2D),
**Pompom** (2D de tranquilidad, 8×20 niveles), **Recreo** (manos con MediaPipe), **Eco**
(ecolocación), **Barrio** (barrio de noche + cuarto + parkour en nubes), **Lemi**, **Vecindario**,
**Visor3D**. `CLAUDE.md` tiene la bitácora completa, vuelta por vuelta, con lo que salió mal y por
qué — **es el documento más valioso del repo y hay que escribirlo después de cada vuelta.**

__FIN__CLAUDE_SKILLS_ARRANQUE_SKILL_MD__
chmod 644 .claude/skills/arranque/SKILL.md
echo '  . .claude/skills/arranque/SKILL.md'

echo
echo "listo. Ahora:"
echo "    bash herramientas/arranque/preparar.sh      # comprobaciones"
echo "    bash herramientas/arranque/login_rezona.sh  # el enlace de Rezona"
echo "y lee .claude/skills/arranque/SKILL.md antes de tocar nada."
echo
bash herramientas/arranque/preparar.sh
