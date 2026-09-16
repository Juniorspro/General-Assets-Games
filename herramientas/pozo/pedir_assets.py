#!/usr/bin/env python3
"""Pide a Rezona Lab TODOS los assets de POZO, en pixel art.

    python3 herramientas/pozo/pedir_assets.py img [filtro]
    python3 herramientas/pozo/pedir_assets.py son [filtro]
    python3 herramientas/pozo/pedir_assets.py ver
    python3 herramientas/pozo/pedir_assets.py traer

TODO VA AL PROYECTO DESCARTABLE (ver `herramientas/rezona/estado.json`): pedido
del usuario, nada queda a la vista en la app de Rezona como si fuera un trabajo.

LOS `task_id` SE GUARDAN EN `crudo/tareas.json` Y SE VERSIONAN aunque los PNG no:
perder un task_id es perder un asset pagado.

EL ESTILO VA EN UNA SOLA CADENA (`ESTILO`) Y NO REPETIDO EN 34 PROMPTS. Con el
estilo copiado en cada entrada, el dia que se corrige una palabra hay que
corregirla treinta y cuatro veces y una queda distinta — y una pieza con otro
estilo no se lee a defecto, se lee a que el juego tiene dos dibujantes.
"""
import json, os, subprocess, sys

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(RAIZ, 'herramientas', 'rezona'))
import rz

PROY = 'rpvTPzKA'   # «tmp — descartable, borrar». OJO: la skill dice YlgCbidN y ESE ID NO EXISTE en la cuenta (list_projects, 350 proyectos): el descartable de verdad es este.
CRUDO = os.path.join(RAIZ, 'herramientas', 'pozo', 'crudo')
TAREAS = os.path.join(CRUDO, 'tareas.json')

ESTILO = ('pixel art sprite, 16-bit SNES style, crisp hard pixels, no anti-aliasing, '
          'flat cel colors with a dark outline, simple readable silhouette, '
          'orthographic, one single object centered, no background, no shadow, no text')

# ── LAS IMAGENES ──
# clave: (prompt, tamano pedido)
# El tamano pedido es SIEMPRE cuadrado y grande: lo que decide como se ve en el
# juego es el horneado, que lo achica al tamano dibujado. Pedir chico le saca
# detalle al generador y no ahorra un byte del HTML.
IMG = {
 # el jugador, por piezas: la animacion que ya existe mueve cada una por
 # separado, asi que las piezas tienen que venir por separado.
 'pj_cabeza':  'the head of a small brave dungeon explorer seen from the front, wearing a dark visor goggle band across the eyes, pale skin, short hair, facing slightly to the RIGHT',
 'pj_cuerpo':  'the torso of a small dungeon explorer, blue armored jacket with a leather strap, no head, no arms, no legs, seen from the front',
 'pj_brazo':   'a single bare forearm and fist of a cartoon hero, horizontal, pointing to the RIGHT, skin tone, cloth cuff at the left end',
 'pj_pierna':  'a single leg and boot of a cartoon hero, vertical, dark blue trouser and brown boot, seen from the side',
 # las diez armas: la que se ve colgada de la mano.
 'arma_pistola':  'a small chunky sci-fi handgun, side view, barrel pointing RIGHT',
 'arma_rafaga':   'a compact submachine gun with a short barrel, side view, barrel pointing RIGHT',
 'arma_escopeta': 'a wide double-barrel shotgun, side view, barrel pointing RIGHT',
 'arma_rifle':    'a long sniper rifle with a scope, side view, barrel pointing RIGHT',
 'arma_astilla':  'a splinter gun with three tiny barrels in a fan, side view, pointing RIGHT',
 'arma_orbe':     'an orb launcher, a fat round-mouthed gun with a glowing purple sphere in the chamber, side view, pointing RIGHT',
 'arma_trueno':   'a lightning rifle with copper coils around the barrel, side view, pointing RIGHT',
 'arma_canon':    'a huge heavy hand cannon with a massive muzzle, side view, pointing RIGHT',
 'arma_aguja':    'a thin needle gun, long very slim barrel, side view, pointing RIGHT',
 'arma_cruz':     'a cross-shaped four-barrel gun that fires in four directions, side view, pointing RIGHT',
 # los ocho bichos: de frente, vistos un poco desde arriba, como el juego.
 'en_baba':     'a small round green slime blob monster with two black eyes, seen from slightly above, wobbly',
 'en_corredor': 'a fast lean red four-legged beast creature crouched and lunging forward, two big glowing yellow eyes, open jaw with teeth, NO wings, NO fins, NO rocket, NO missile, NO vehicle, seen from directly above',
 'en_tirador':  'a squat round cyan robot head with one big glowing eye visor and two small antennae, NO cannon, NO barrel, NO gun, NO weapon, NO wheels, NO tank treads, NOT a tank, NOT a vehicle, seen from directly above',
 'en_torreta':  'a bolted-down circular sentry base with a glowing orange core and three armor plates, no barrels, seen from above',
 'en_bomba':    'a round dark bomb creature with a lit fuse and an angry face, seen from slightly above',
 'en_bruto':    'a big square brown brute monster with heavy shoulders and two small angry eyes, seen from slightly above',
 'en_jefe1':    'a large menacing purple boss monster, round smooth armored body, three glowing eyes, bald rounded top, NO crown, NO horns, NO spikes, NO tentacles, seen from directly above',
 'en_jefe2':    'a huge terrifying crimson final boss monster, round smooth armored body, three burning eyes, bald rounded top, NO crown, NO horns, NO spikes, NO tentacles, seen from directly above',
 # balas: UNA sola, blanca, para poder tenirla con el color de cada arma.
 'bala':        'a single glowing energy bullet bolt, pure WHITE and light grey only, oval with a bright core, pointing RIGHT',
 # el mapa
 'piso':        'a seamless tileable dungeon floor tile, cracked grey-blue stone slab, top-down view, edges match on all four sides',
 'muro':        'a seamless tileable dungeon wall block, dark grey-blue stone bricks, seen from the front, edges match left and right',
 'muro_cima':   'a seamless tileable top face of a dungeon stone wall, lighter grey-blue stone, top-down view, edges match left and right',
 'reja':        'a vertical iron dungeon bar of a closed portcullis gate, rusty brown metal, single bar',
 'cofre_cer':   'a closed wooden treasure chest with iron bands and a golden lock, seen from the front slightly above',
 'cofre_abi':   'an open empty wooden treasure chest, lid tilted back, iron bands, seen from the front slightly above',
 'moneda':      'a single shiny gold coin seen from the front, round, with a highlight',
 'corazon':     'a single bright red pixel heart, solid and symmetric, NO highlight, NO shine, NO notch, NO bite taken out of it',
 'escalera':    'a dark stone staircase going DOWN into a black hole, seen from above, five steps receding',
 # el menu: una chapa por clase de boton, y el nombre
 'boton':       'a blank rectangular stone-and-iron button plate for a fantasy game menu, dark grey, riveted corners, empty centre with no text, wide horizontal plate',
 'boton_oro':   'a blank rectangular golden brass button plate for a fantasy game menu, warm gold, riveted corners, empty centre with no text, wide horizontal plate',
 'logo':        'the word "POZO" in big chunky golden pixel letters with a thick black outline, arcade game logo, exactly four letters P O Z O',
}

# ── LOS SONIDOS ──
# PEDIR UN SONIDO "SUAVE" DEVUELVE SILENCIO. Tres juegos de este repo pagaron la
# misma leccion (RezUno, LEMI, los casuales): el prompt describe el OBJETO FISICO
# y pide fuerte, cerca y seco. El nivel lo pone el horneado, nunca el prompt.
# OJO: el generador RECHAZA duration < 1.0 (VALIDATION_ERROR terminal). Medido: los
# cuatro pedidos por debajo fallaron y los quince de 1,0 para arriba salieron. Pedir de
# mas es gratis: hornear_audio recorta por energia, asi que el sobrante se tira al cortar.
SON = {
 'tira':    ('a short dry punchy sci-fi blaster shot, close-up, loud, no reverb tail', 1.0, 'sound'),
 'pega':    ('a short wet impact thud of a bullet hitting flesh, loud and close', 1.2, 'sound'),
 'muere':   ('a monster dying squelch and pop, loud and close, short', 1.2, 'sound'),
 'dano':    ('a harsh metallic hit on armour with a low thump, loud and close', 1.2, 'sound'),
 'esquiva': ('a quick cloth whoosh of a body dodging fast, loud and close', 1.2, 'sound'),
 'moneda':  ('a bright metallic coin pickup chime, two notes rising, loud and close', 1.0, 'sound'),
 'cura':    ('a warm healing shimmer chime, rising, loud and close', 1.2, 'sound'),
 'cofre':   ('a wooden chest lid creaking open with a metal latch click, loud and close', 1.4, 'sound'),
 'puerta':  ('a heavy iron portcullis gate grinding open on stone, loud and close', 1.6, 'sound'),
 'limpia':  ('a short triumphant three-note chime, bright, loud and close', 1.4, 'sound'),
 'baja':    ('footsteps descending stone stairs into a deep well with a low rumble, loud and close', 1.8, 'sound'),
 'jefe':    ('a deep monstrous roar of a huge boss creature, loud and close', 2.0, 'sound'),
 'gana':    ('a short triumphant victory fanfare, brass and bells, loud', 3.0, 'sound'),
 'pierde':  ('a descending sad defeat sting, low strings and a dull gong, loud', 2.6, 'sound'),
 'ui':      ('a single dry wooden menu click, loud and close', 1.0, 'sound'),
 'mejora':  ('a magical power-up chime with a rising sparkle, loud and close', 1.2, 'sound'),
 'm_menu':  ('slow ominous dungeon crawler menu music loop, dark synth pad, a distant bell, '
             'steady quiet pulse, no drums, chiptune flavour, loops seamlessly', 20, 'music'),
 'm_pelea': ('driving 16-bit dungeon battle music loop, fast arpeggiated bass, punchy drums, '
             'minor key, heroic, loops seamlessly', 20, 'music'),
 'm_jefe':  ('heavy menacing 16-bit boss battle music loop, low brass stabs, fast drums, '
             'dissonant minor key, loops seamlessly', 20, 'music'),
}


def carga():
    if os.path.exists(TAREAS):
        return json.load(open(TAREAS))
    return {}


def guarda(d):
    os.makedirs(CRUDO, exist_ok=True)
    json.dump(d, open(TAREAS, 'w'), indent=1, ensure_ascii=False, sort_keys=True)


# EL TOPE ES DOCE GENERACIONES EN VUELO, POR CUENTA. Mandando las treinta y
# cuatro de una, veintidos vuelven GENERATION_TOO_MANY_IN_FLIGHT y ademas no
# falla ruidosamente: el script dice "pedido" y esos assets no existen. Se manda
# de a poco y se espera a que bajen.
TOPE_VUELO = 6


def en_vuelo():
    t = carga()
    ids = [v['task_id'] for v in t.values() if v.get('task_id')]
    if not ids: return 0, t
    res = rz.sesion([('check_generation_tasks', {'task_ids': ids[i:i+100], 'project_id': PROY})
                     for i in range(0, len(ids), 100)], espera=300)
    est = {}
    for r in res:
        try: d = json.loads(rz.texto(r))
        except Exception: continue
        for it in (d.get('items') or d.get('tasks') or []):
            est[it.get('task_id')] = it
    n = 0
    for k, v in t.items():
        it = est.get(v.get('task_id')) or {}
        s2 = it.get('status', v.get('estado', '?'))
        v['estado'] = s2
        if it.get('asset_path'): v['output_path'] = it['asset_path']
        if s2 in ('pending', 'running', 'queued', 'in_progress'): n += 1
    guarda(t)
    return n, t


def pedir_img(filtro=''):
    t = carga()
    llam, claves = [], []
    for k, p in IMG.items():
        if filtro and filtro not in k: continue
        kk = 'img/' + k
        if kk in t and t[kk].get('task_id'): continue
        claves.append(kk)
        llam.append(('submit_image_generation', {
            'project_id': PROY, 'output_path': 'assets/pozo_' + k + '.png',
            'prompt': p + '. ' + ESTILO, 'size': '1024x1024', 'transparent': True}))
    manda(llam, claves, 'img')


def pedir_son(filtro=''):
    t = carga()
    llam, claves = [], []
    for k, (p, dur, kind) in SON.items():
        if filtro and filtro not in k: continue
        kk = 'son/' + k
        if kk in t and t[kk].get('task_id'): continue
        claves.append(kk)
        llam.append(('submit_audio_generation', {
            'project_id': PROY, 'output_path': 'assets/pozo_' + k + '.mp3',
            'prompt': p, 'duration': dur, 'kind': kind, 'output_format': 'mp3'}))
    manda(llam, claves, 'son')


def manda(llam, claves, tipo):
    """Manda respetando el tope de generaciones en vuelo y espera entre tandas."""
    import time
    if not llam: print('nada que pedir'); return
    print('pidiendo', len(llam), tipo + '...')
    i = 0
    while i < len(llam):
        n, t = en_vuelo()
        hueco = TOPE_VUELO - n
        if hueco <= 0:
            print('  ...', n, 'en vuelo, espero'); time.sleep(45); continue
        lote = min(hueco, 4, len(llam) - i)
        res = rz.sesion(llam[i:i+lote], espera=600)
        for k, r in zip(claves[i:i+lote], res):
            txt = rz.texto(r)
            d = json.loads(txt) if txt.startswith('{') else {}
            if not d.get('task_id'):
                print(' ', k, txt[:70]); continue
            t[k] = {'task_id': d['task_id'], 'output_path': d.get('output_path'),
                    'tipo': tipo, 'estado': d.get('status', '?')}
            print(' ', k, d['task_id'])
        guarda(t)
        i += lote
        if i < len(llam): time.sleep(30)


def ver():
    t = carga()
    ids = [v['task_id'] for v in t.values() if v.get('task_id')]
    if not ids: print('sin tareas'); return
    res = rz.sesion([('check_generation_tasks',
                      {'task_ids': ids[i:i+100], 'project_id': PROY})
                     for i in range(0, len(ids), 100)], espera=300)
    est = {}
    for r in res:
        try: d = json.loads(rz.texto(r))
        except Exception: continue
        for it in (d.get('items') or d.get('tasks') or []):
            est[it.get('task_id')] = it
    cta = {}
    for k, v in t.items():
        it = est.get(v.get('task_id')) or {}
        s = it.get('status', '?')
        cta[s] = cta.get(s, 0) + 1
        if s in ('ready', 'completed') and it.get('asset_path'):
            v['output_path'] = it['asset_path']
        v['estado'] = s
        if s == 'failed': print(' FALLO', k, it.get('error') or it.get('message') or '')
    guarda(t)
    print(cta)


def traer():
    """Trae lo que este listo a herramientas/pozo/crudo/.

    `fetch_generated_asset` IGNORA el `destination_dir` y escribe en la carpeta
    marcada con `.rezona/`; hay que leer `absolute_path` de la respuesta y copiar.
    Por eso la carpeta de descarga va FUERA del repo."""
    import shutil
    t = carga()
    base = '/tmp/rez_pozo'
    if not os.path.isdir(os.path.join(base, '.rezona')):
        os.makedirs(base, exist_ok=True)
        subprocess.run(['npx', '-y', 'rezona@latest', 'init'], cwd=base,
                       capture_output=True, text=True, timeout=300)
    os.makedirs(CRUDO, exist_ok=True)
    pend = [(k, v) for k, v in t.items()
            if v.get('output_path') and v.get('estado') in ('ready', 'completed')
            and not v.get('local')]
    for i in range(0, len(pend), 8):
        lote = pend[i:i+8]
        res = rz.sesion([('fetch_generated_asset',
                          {'project_id': PROY, 'output_path': v['output_path'], 'dir': base})
                         for _, v in lote], espera=600)
        for (k, v), r in zip(lote, res):
            txt = rz.texto(r)
            try: d = json.loads(txt)
            except Exception: d = {}
            ap = d.get('absolute_path') or d.get('path')
            if not ap or not os.path.exists(ap):
                print(' sin traer', k, txt[:110]); continue
            dst = os.path.join(CRUDO, k.split('/')[-1] + os.path.splitext(ap)[1])
            shutil.copy(ap, dst)
            v['local'] = os.path.basename(dst)
            print(' ', k, '->', v['local'], os.path.getsize(dst), 'B')
        guarda(t)


if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'ver'
    fil = sys.argv[2] if len(sys.argv) > 2 else ''
    {'img': lambda: pedir_img(fil), 'son': lambda: pedir_son(fil),
     'ver': ver, 'traer': traer}.get(cmd, ver)()
