# -*- coding: utf-8 -*-
"""Los assets de PISTOLA, generados con Rezona.

LAS REGLAS QUE YA COSTARON SUS VUELTAS Y QUE ESTE ARCHIVO RESPETA:
  · Las texturas se piden EMBALDOSABLES y de frente, sin sombras ni objetos: una
    foto con sombra puesta se repite y la sombra se repite con ella.
  · Y se piden diciendo CUANTO CUBREN —«ocho hiladas de ladrillo», «cuatro
    tablas»— porque de ahi sale la repeticion en el juego. Sin ese numero la
    pared sale de casa de muñecas.
  · Los modelos van con `face_limit`: Tripo devuelve UN MILLON de triangulos y
    bajar eso a dos mil es tirar el 99,8 % — el simplificador se come el gatillo
    y el guardamonte y lo que queda es una mancha.
  · Y los prompts de sonido piden FUERTE, CERCA Y SECO: pedir «un chasquido
    suave» devuelve un archivo con pico 0,005, o sea silencio. El nivel lo pone
    el horneado, nunca el prompt.
"""
import json, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                '..', 'rezona'))
import rz

P = 'YlgCbidN'
TEX = (' Photographic seamless tileable texture seen straight from the front,'
       ' flat even lighting, no shadows, no objects, no text, no border, the'
       ' edges must tile seamlessly on all four sides.')

IMG = {
  # ── LOS METROS QUE CUBRE CADA UNA VAN EN EL PROMPT ──
  # Ese numero es el que despues decide la repeticion, y sin el la pared sale
  # con hiladas de veinte centimetros.
  'p_pared':  'Dark grey painted concrete block wall of an abandoned bank vault,'
              ' EIGHT courses of blocks visible top to bottom, chipped paint,'
              ' damp stains, cold blue-grey tone.' + TEX,
  'p_losa':   'Worn grey concrete floor slab seen from above, THREE metres'
              ' across, hairline cracks, scuff marks and old paint lines.' + TEX,
  'p_acero':  'Riveted dark steel plate, brushed metal with rows of rivets along'
              ' the edges, scratched, industrial, ONE metre across.' + TEX,
  'p_caja':   'Wooden shipping crate panel, FOUR pine planks side by side with'
              ' visible grain and dark nail heads, warm brown.' + TEX,
  'p_suelo':  'Cracked grey warehouse floor with faded yellow hazard stripes'
              ' running across it, dusty, TWO metres across.' + TEX,
}

MOD = {
  'p_pistola': 'A stylised low poly semi-automatic pistol, matte gunmetal grey'
               ' slide with a dark brown grip, clean chunky shapes, seen from'
               ' the side, no hands, no background.',
  'p_ladron':  'A stylised low poly cartoon robber standing straight with arms'
               ' down, black beanie, black mask over the eyes, dark navy'
               ' striped sweater, dark trousers, chunky rounded shapes, full'
               ' body, no background.',
}

SON = {
  # los sonidos van con `s_` y no con `p_`: `p_caja` era a la vez la textura de
  # madera y el sonido de romperla, y el segundo pisaba el task_id del primero
  # en `tareas.json` — o sea perder un asset ya pagado sin que nada falle.
  's_tiro':   'A single loud dry close-up pistol gunshot indoors, sharp crack'
              ' with a short concrete room slap, no music.',
  's_mata':   'A loud short wet impact thud with a metallic ring, close up, dry.',
  's_caja':   'A loud close-up wooden crate shattering, splintering planks, dry.',
  's_ladtira':'A loud flat enemy pistol shot heard from across a room, sharper'
              ' and thinner than a close gunshot, with a short echo.',
  's_dano':   'A loud harsh metallic clang of a bullet hitting steel plus a low'
              ' warning thump, close up, dry.',
  's_gana':   'A short bright victory sting, three rising notes on a synth brass'
              ' with a cymbal, loud and clean.',
  's_pierde': 'A short descending failure sting, two falling low notes, dark and'
              ' loud.',
}

MUS = {
  'm_pistola': 'A tense loopable heist chase instrumental: driving muted electric'
               ' bass, tight rock drums, short stabs of dark synth brass, 120'
               ' BPM. Seamless loop, no intro and no ending, mixed loud and'
               ' clean, no vocals, no speech.',
}


def main():
  """Sin argumentos pide todo; con argumentos pide solo esas claves.
  Hace falta porque el servidor topa en DOCE generaciones en vuelo y contesta
  GENERATION_TOO_MANY_IN_FLIGHT: la primera tanda perdio tres sonidos."""
  solo = set(sys.argv[1:])
  llamadas = []
  claves = []
  for k, p in IMG.items():
    if solo and k not in solo: continue
    claves.append(k)
    llamadas.append(('submit_image_generation', {
      'project_id': P, 'prompt': p, 'aspect_ratio': '1:1',
      'output_path': 'assets/' + k + '.png'}))
  for k, p in MOD.items():
    if solo and k not in solo: continue
    claves.append(k)
    llamadas.append(('submit_model3d_generation', {
      'project_id': P, 'prompt': p, 'output_path': 'assets/' + k + '.glb',
      'texture_quality': 'detailed',
      'extra': {'face_limit': 6000}}))
  for k, p in list(SON.items()) + list(MUS.items()):
    if solo and k not in solo: continue
    claves.append(k)
    llamadas.append(('submit_audio_generation', {
      'project_id': P, 'prompt': p, 'duration': 20 if k.startswith('m_') else 3,
      'output_path': 'assets/' + k + '.mp3'}))

  res = rz.sesion(llamadas, espera=900)
  tareas = {}
  for k, r in zip(claves, res):
    t = json.dumps(r)
    i = t.find('gtask-')
    tareas[k] = t[i:i+26] if i >= 0 else ('ERROR ' + t[:220])
    print('%-11s %s' % (k, tareas[k]))
  d = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'crudo')
  os.makedirs(d, exist_ok=True)
  f = os.path.join(d, 'tareas.json')
  viejo = json.load(open(f)) if os.path.exists(f) else {}
  viejo.update(tareas)
  json.dump(viejo, open(f, 'w'), indent=1, sort_keys=True)
  print('anotadas en ' + f)


main()
