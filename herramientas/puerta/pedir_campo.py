#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Pide a Rezona Lab las texturas del campo del nivel 1: los petalos, el disco
de florecillas del centro y las mariposas.

POR QUE VAN APARTE DE LA TUBERIA PBR: esas veinticuatro texturas son
SUPERFICIES QUE SE REPITEN, y todo lo que hace `pbr.py` —medir los metros que
cubre un mosaico y reescalar la repeticion— sale de que se repitan. Un petalo no
se repite: la foto se mapea UNA vez sobre la geometria del petalo (u a lo ancho,
v de la base a la punta), asi que reescalarla seria estirar el dibujo. Y una
mariposa necesita ALFA, que las otras no.

EL ENCUADRE ES PARTE DEL PEDIDO, no del gusto:
  · el petalo tiene que LLENAR el cuadro y no traer su propia silueta —la
    silueta ya la pone la geometria—, con la base abajo y la punta arriba;
  · el disco del centro va sobre una esfera achatada con UV de esfera, asi que
    tiene que ser un CAMPO de florecillas y no un disco dibujado: un disco
    mapeado a UV de esfera se embadurna;
  · la mariposa va de frente y sobre BLANCO, porque el alfa se saca de la
    distancia al blanco y con un fondo con color se recorta el ala.
"""
import io, json, os, sys, time
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'rezona'))
import rz

PROY = 'rpvTPzxP'
ESTADO = '/tmp/campo_tareas.json'

PLANO = ('photographic, high detail, straight-on flat view, no perspective, '
         'even neutral diffuse lighting, no cast shadows, no vignette')

PET = ('extreme macro of the SURFACE of one single flower petal, filling the '
       'entire frame edge to edge with petal tissue only — no petal outline, no '
       'silhouette, no background, no stem, no other petals. Delicate veins '
       'radiate from the bottom centre of the frame and fan out towards the top '
       'edge. Soft translucent tissue. ')

TEX = {
 'petal_a': PET + ('Pale ivory white with a faint warm pink blush towards the '
                   'top edge and a greenish tinge along the very bottom edge. ') + PLANO,
 'petal_b': PET + ('Deep magenta pink with a pale cream streak up the middle and '
                   'darker crimson radial veins. ') + PLANO,
 'centro':  ('seamless tileable macro texture of the packed disc florets at the '
             'centre of a sunflower: hundreds of tiny tubular florets in a dense '
             'even field, golden amber and warm brown, some still closed, '
             'fills the whole frame, no outline, no petals, no background. ') + PLANO,
 'bf_monarca': ('one single monarch butterfly seen from DIRECTLY ABOVE with its '
                'wings fully spread open and flat and perfectly symmetric, deep '
                'orange wings with thick black veins and a black border dotted '
                'with small white spots, slender dark body and two antennae, '
                'centred, on a PURE WHITE completely empty background, no shadow. ') + PLANO,
 'bf_azul':    ('one single blue morpho butterfly seen from DIRECTLY ABOVE with '
                'its wings fully spread open and flat and perfectly symmetric, '
                'iridescent metallic blue wings with a dark brown border and small '
                'white marks, slender dark body and two antennae, centred, on a '
                'PURE WHITE completely empty background, no shadow. ') + PLANO,
 'bf_cola':    ('one single yellow swallowtail butterfly seen from DIRECTLY ABOVE '
                'with its wings fully spread open and flat and perfectly '
                'symmetric, pale lemon yellow wings with black tiger stripes and '
                'blue and orange spots near the tails of the hindwings, slender '
                'dark body and two antennae, centred, on a PURE WHITE completely '
                'empty background, no shadow. ') + PLANO,
}


def carga():
    try: return json.load(io.open(ESTADO, encoding='utf8'))
    except Exception: return {}


def guarda(d):
    io.open(ESTADO, 'w', encoding='utf8').write(json.dumps(d, ensure_ascii=False, indent=1))


def json_de(t):
    if not t: return None
    i = t.find('{')
    if i < 0: return None
    try: return json.loads(t[i:])
    except Exception: return None


def main():
    d = carga()
    faltan = [n for n in sorted(TEX) if n not in d]
    if faltan:
        res = rz.sesion([('submit_image_generation', {
                'project_id': PROY,
                'output_path': 'assets/campo_%s.png' % n,
                'prompt': TEX[n],
                'size': '1024x1024'}) for n in faltan], espera=900)
        for n, r in zip(faltan, res):
            j = json_de(rz.texto(r))
            if j and j.get('task_id'):
                d[n] = {'task_id': j['task_id'], 'output_path': j['output_path'],
                        'estado': j.get('status', 'pending')}
                print('  ->', n, j['task_id'], flush=True)
        guarda(d)
    for vuelta in range(50):
        pend = [n for n, v in d.items() if v.get('estado') == 'pending']
        if not pend: break
        r = rz.sesion([('check_generation_tasks',
                        {'task_ids': [d[n]['task_id'] for n in pend],
                         'project_id': PROY})], espera=600)
        # LA CLAVE ES `items`; con otra el lazo polea sin ver nunca nada listo
        for it in (json_de(rz.texto(r[0])) or {}).get('items') or []:
            for n in pend:
                if d[n]['task_id'] == it.get('task_id'):
                    d[n]['estado'] = it.get('status', 'pending')
                    if it.get('asset_path'): d[n]['output_path'] = it['asset_path']
        guarda(d)
        print('vuelta %2d · pendientes %d' % (vuelta, sum(
            1 for v in d.values() if v.get('estado') == 'pending')), flush=True)
        time.sleep(20)
    for n in sorted(d): print('%-12s %-10s %s' % (n, d[n].get('estado'), d[n].get('output_path')))

main()
