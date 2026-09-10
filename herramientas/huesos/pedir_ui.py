#!/usr/bin/env python3
"""Pide a Rezona la INTERFAZ de HUESOS: el cartel del nombre y los botones.

    python3 herramientas/huesos/pedir_ui.py

═══════════════════════════════════════════════════════════════════════════
EL CARTEL VA EN TRES VARIANTES A PROPÓSITO
═══════════════════════════════════════════════════════════════════════════
Un modelo de imagen NO DELETREA A PEDIDO: el logo de RECREO volvió diciendo
«RECEO» y el de LEMI fue un sello sin letras que obligó a escribir el nombre
al lado con la tipografía del sistema —o sea el nombre del juego cambiando de
forma según el aparato—. La regla que sí funciona es la de RECREO: pedir la
palabra LETRA POR LETRA en el prompt, pedir tres variantes, y ELEGIR la que
esté bien mirando las tres. Si ninguna lo está, se queda la tipografía y no se
publica un cartel que dice otra cosa.

═══════════════════════════════════════════════════════════════════════════
LOS BOTONES: UNA CHAPA COMPARTIDA Y CUATRO SILUETAS
═══════════════════════════════════════════════════════════════════════════
La chapa —el aro— es LA MISMA en los cinco botones, así que va UNA vez y se
estira: cinco imágenes de un aro idéntico serían cinco descargas para dibujar
el mismo aro. Lo que cambia de botón a botón es el glifo, y ésos sí van uno
por uno: en una hoja de 2×2 la reja que devuelve el generador es una sugerencia
—ya costó una vuelta en los casuales— y acá son cuatro cosas con significado,
o sea que una celda corrida pone el icono de atacar en el botón de la cámara.

Y VAN COMO SILUETA PLANA BLANCA. El botón mide 60 px en el marco de 892×412 y
el juego dibuja a un destino reducido que después se estira con NEAREST: un
icono con volumen y luz a ese tamaño es una mancha. Una silueta sobrevive
cualquier achique, y encima se puede TEÑIR desde el CSS —que es lo que hace
que el botón encendido y el apagado sean el mismo dibujo.
"""
import json, sys, os
sys.path.insert(0, 'herramientas/rezona')
import rz

PROY = 'rpvTPzKA'          # tmp — descartable, borrar (cuenta de REZONA_PAT)

# El fondo se recorta por ALFA y no por color, así que se pide transparente y
# no sobre magenta: `transparent:True` devuelve PNG con canal alfa y ahí el
# recorte es exacto — sin halo de clave de color en el contorno de una letra.
CARTEL = ("A carved game logo of the single word HUESOS, spelled with exactly these six "
          "letters in this order: H, U, E, S, O, S. One word only, nothing else written. "
          "The letters are carved out of weathered pale bone, chipped and pitted, with dark "
          "grime in the cuts, standing in a single straight horizontal row. Heavy condensed "
          "slab letterforms, very legible, wide letter spacing. Front view, flat even "
          "lighting, no background, no frame, no border, no shadow, no extra words.")

ICONOS = [
 ('i_atacar',  "a medieval sword pointing diagonally up to the right, with a straight crossguard"),
 ('i_esquiva', "a curved arrow that loops over on itself, like a tumbling roll, with an arrowhead"),
 ('i_remate',  "a six-pointed starburst with sharp tapering rays, like an impact flash"),
 ('i_camara',  "a simple round camera lens seen from the front, a circle inside a circle"),
]
ICO_EST = (". A single flat solid pure white silhouette on a fully transparent background. "
           "Filled solid white, no outline, no colour, no gradient, no shading, no shadow, "
           "no background, no frame, no text. Centered, simple and bold, like a mobile game "
           "interface icon. Thick shapes that stay readable when shrunk to 40 pixels.")

CHAPA = ("A round empty button frame for a dark medieval game interface: a thick ring made of "
         "weathered pale bone with four small dark iron rivets set into it at the top, bottom, "
         "left and right. The centre of the ring is completely empty and transparent. Seen "
         "straight on from the front, perfectly circular. Flat even lighting, no background, "
         "no shadow, no text, nothing inside the ring.")

def main():
    ll = []
    nombres = []
    for i in (1, 2, 3):
        ll.append(('submit_image_generation', {
            'project_id': PROY, 'output_path': 'assets/hu_cartel%d.png' % i,
            'prompt': CARTEL, 'size': '1536x512', 'transparent': True}))
        nombres.append('cartel%d' % i)
    ll.append(('submit_image_generation', {
        'project_id': PROY, 'output_path': 'assets/hu_chapa.png',
        'prompt': CHAPA, 'size': '1024x1024', 'transparent': True}))
    nombres.append('chapa')
    for n, p in ICONOS:
        ll.append(('submit_image_generation', {
            'project_id': PROY, 'output_path': 'assets/hu_%s.png' % n,
            'prompt': 'An icon of ' + p + ICO_EST, 'size': '1024x1024', 'transparent': True}))
        nombres.append(n)

    p = 'assets/huesos/tareasui.json'
    tareas = json.load(open(p)) if os.path.exists(p) else {}
    for nom, r in zip(nombres, rz.sesion(ll, espera=900)):
        t = rz.texto(r)
        try: d = json.loads(t)
        except Exception:
            print('%-10s FALLO %s' % (nom, t[:220])); continue
        tareas[nom] = {'task_id': d.get('task_id'), 'output_path': d.get('output_path')}
        print('%-10s %-28s %s' % (nom, d.get('task_id'), d.get('output_path')))
    json.dump(tareas, open(p, 'w'), ensure_ascii=False, indent=2)
    print('\n->', p)

if __name__ == '__main__':
    main()
