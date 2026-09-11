#!/usr/bin/env python3
"""Pide a Rezona (Tripo) las PIEZAS 3D de los esqueletos de HUESOS.

    python3 herramientas/huesos/pedir_3d.py

OJO CON LA CUENTA. Esto decía `env -u REZONA_PAT`, que manda a la cuenta NUEVA;
las piezas de este juego están en la VIEJA (la de la variable de entorno, que es
la que heredaron las herramientas `mcp__rezona__*`). Mezclarlas contesta
«Not your project», que se lee a proyecto borrado y no lo es.

═══════════════════════════════════════════════════════════════════════════
POR QUÉ PIEZAS SUELTAS Y NO UN ESQUELETO RIGGEADO ENTERO
═══════════════════════════════════════════════════════════════════════════
Lo obvio sería pedir un esqueleto completo con `submit_rig3d_generation` y sus
clips, y dibujarlo con `SkinnedMesh`. Se descartó por lo que cuesta, y son
cuatro cosas medidas que ya están en el juego:

  1. EL KIT INSTANCIADO. Hoy los catorce esqueletos cuestan CATORCE llamadas de
     dibujo —una por PIEZA, no una por bicho— porque cada pieza es un
     `InstancedMesh`. Un `SkinnedMesh` no se puede instanciar: catorce bichos
     serían catorce mallas con su propio esqueleto y su propia actualización de
     matrices por cuadro.
  2. LAS NUEVE POSES MEDIDAS. `POSE.quieto/camina/corre/golpe0-2/esquiva/dano/
     muere` son funciones del tiempo sobre ESTE rig, con mezcla. Tripo devuelve
     como mucho un puñado de clips de su vocabulario cerrado: no hay esquive, y
     los tres golpes del combo serían el mismo `slash`.
  3. EL PATINAJE CERO. `midePasos()` mide el recorrido del pie EN EL CICLO y de
     ahí sale la cadencia. Con un clip ajeno la zancada la decide el clip y hay
     que volver a medirla contra la velocidad de cada clase.
  4. LA CORONA Y LA CAPA con matriz cero, y el tinte por cuerpo.

Reemplazando sólo la GEOMETRÍA de cada pieza, las cuatro cosas siguen en pie:
`cajas([...])` devuelve una `BufferGeometry` y esto devuelve otra con el mismo
convenio de origen. Y degrada por construcción: el juego arranca con las cajas
y la malla generada las pisa cuando decodifica.

═══════════════════════════════════════════════════════════════════════════
Y DE PASO, LAS CUATRO CLASES DEJAN DE SER LA MISMA SILUETA
═══════════════════════════════════════════════════════════════════════════
`alc` vale 1,85 · 2,85 · 2,35 · 3,05 y las cuatro clases muestran HOY la misma
hoja de 0,62. O sea que el alcance —que es el número con el que el jugador
decide si entra o espera— no se ve por ningún lado. Un arma por clase, con la
misma máquina de matriz cero que ya usan la corona y la capa, hace que el
alcance se LEA.
"""
import json, sys
sys.path.insert(0, 'herramientas/rezona')
import rz

PROY = 'tOMtshuHnZ'

# El de la app se llama «Tripo H3»; el nombre que la API acepta es éste. Los tres
# que existen: v3.0-20250812, v2.5-20250123 y v2.0-20240919 (esta última se recibe
# y después la tarea falla). MESHY NO SALE POR ACÁ — ver herramientas/rezona/estado.json.
MODELO = 'v3.0-20250812'

# El mismo cierre en las once: once tareas son once dibujantes distintos, y sin
# esto salen once estilos. Y «sin base ni peana» no es un detalle: Tripo se la
# agrega sola y después el horneado la toma por parte del hueso al medir la caja.
EST = (" Single object, complete, centered, nothing else in frame. Weathered pale "
       "ivory bone, matte, chipped and pitted with age, dark grime in the crevices. "
       "Museum specimen photographed on a plain white background, even flat lighting. "
       "No base, no stand, no pedestal, no plinth, no ground plane, no shadow.")

ARM = (" Single object, complete, centered, nothing else in frame. Ancient rusted iron, "
       "pitted and notched, dark oxide and dried blood, leather grip worn black. "
       "Photographed on a plain white background, even flat lighting. "
       "No base, no stand, no pedestal, no ground plane, no shadow.")

HER = (" Single object, complete, centered, nothing else in frame. Clean polished steel, "
       "cool grey, lightly scratched but well kept and NOT rusted, dark tan leather. "
       "Photographed on a plain white background, even flat lighting. "
       "No base, no stand, no pedestal, no ground plane, no shadow.")

# `cara` dice qué eje del modelo mira hacia adelante cuando el horneado ya lo
# paró: se COMPRUEBA en la hoja de contactos y se corrige con un número, porque
# de la caja envolvente sola no sale para dónde mira una calavera.
PIEZAS = [
 ('craneo',    "A human skull with the lower jaw attached and the mouth closed. Deep empty "
               "eye sockets, triangular nasal opening, full row of teeth, cheekbones." + EST),
 ('costillar', "A human ribcage: the thoracic spine with the twelve pairs of curved ribs and "
               "the flat sternum in front. No skull, no arms, no pelvis." + EST),
 ('pelvis',    "A human pelvis bone seen from the front: the two flaring hip blades, the "
               "sacrum between them and the two hip sockets. No spine, no legs." + EST),
 ('femur',     "A single human femur, the long thigh bone: round ball head at one end, "
               "two knuckle-like condyles at the other, slightly bowed shaft." + EST),
 ('humero',    "A single human humerus, the long upper arm bone: rounded head at one end, "
               "a flared hinge at the other, straight slender shaft." + EST),
 ('mano',      "A skeletal human hand, bones only: the wrist, five metacarpals and the finger "
               "bones, fingers slightly curled as if gripping. No arm bone." + EST),
 ('pie',       "A skeletal human foot, bones only: the heel bone, the arch and the toe bones, "
               "seen from the side. No leg bone." + EST),
 ('espada',    "A short medieval sword, badly damaged: the blade is chipped and notched along "
               "both edges with the tip broken off, simple straight crossguard." + ARM),
 ('lanza',     "A long medieval spear: a slender wooden shaft with a narrow leaf-shaped iron "
               "spearhead at one end, an iron ferrule at the other. Very long and thin." + ARM),
 ('mazo',      "A huge two-handed executioner cleaver: a massive wide rectangular iron blade "
               "on a short thick handle, brutally heavy, notched edge." + ARM),
 ('espadon',   "A king's greatsword: a long broad double-edged blade, a wide crossguard with "
               "curled tips and a round pommel. Regal but ancient and pitted, gold inlay "
               "worn away in the fuller." + ARM),
 ('corona',    "A king's crown: a heavy gold band with five tall pointed spikes rising from it "
               "and a single dark red gemstone set in the front. Battered, tarnished, ancient. "
               "Single object, complete, centered, nothing else in frame. Photographed on a "
               "plain white background, even flat lighting. No base, no stand, no head, no "
               "cushion, no ground plane, no shadow."),

 # LAS DOS DEL HÉROE. Van del OTRO lado del vocabulario a propósito: los esqueletos
 # son hierro comido y hueso viejo, así que si el héroe saliera del mismo cierre se
 # leería a uno más de la turba. Acero limpio y cuero curtido — se distingue a diez
 # metros y sin leer un rótulo, que es lo único que un jugador puede hacer.
 ('esphero',   "A hero's arming sword: a straight double-edged steel blade with a shallow "
               "fuller, a plain straight crossguard, a leather-wrapped grip and a round steel "
               "pommel. Clean polished steel with a few honest scratches, well kept, not rusted."
               + HER),
 ('yelmo',     "A medieval open-faced knight's helmet: a rounded steel skull with a raised "
               "nasal bar down the front and a short flared neck guard at the back, no visor, "
               "the face open. Clean polished steel with a few dents." + HER),
]

def main():
    ll = [('submit_model3d_generation', {
              'project_id': PROY, 'output_path': 'assets/h3_%s.glb' % n, 'prompt': p,
              'texture': True, 'pbr': False, 'texture_quality': 'detailed',
              # `model_version` es un campo de verdad del servidor y el paquete npm
              # no lo declara, así que va por `extra`. Se pide explícito aunque hoy
              # coincida con el de por omisión: medido, sin pedir nada salen 974.596
              # triángulos y con v3.0-20250812 salen 988.300 —o sea que el default YA
              # es la más nueva— pero el día que el servidor mueva el default, esta
              # línea es lo único que impide que las piezas cambien de modelo solas.
              'extra': {'face_limit': 6000, 'model_version': MODELO,
                        # ── LA PALANCA QUE ESTE REPO NO USABA ──
                        # Tripo tiene remallador propio y nunca se lo había pedido.
                        # Medido el 2026-09-09 sobre el cráneo: sin él la malla llega
                        # con 5.795 triángulos y se planta en 540 al decimar; con él
                        # llega con 2.544 y se planta en 417 — un 23 % más abajo, o sea
                        # unas 104 islas sueltas contra 135 (el piso es 4 × islas).
                        # Y trae PBR: tres imágenes en vez de una.
                        # NO RESPETA `face_limit`: pedido 1.100 devolvió 2.544 y pedido
                        # 1.000 devolvió 5.117. Con esto el face_limit es una sugerencia,
                        # así que el presupuesto lo sigue poniendo el horneado.
                        'smart_low_poly': True}})
          for n, p in PIEZAS]
    tareas = {}
    for (n, _), r in zip(PIEZAS, rz.sesion(ll, espera=900)):
        d = json.loads(rz.texto(r))
        tareas[n] = {'task_id': d.get('task_id'), 'output_path': d.get('output_path'),
                     # OJO: `ignored_params: null` NO prueba nada. Medido el 2026-09-09
                     # mandando dos nombres INVENTADOS por `extra` —`provider` y
                     # `engine`—: los dos devolvieron null igual y las tareas
                     # arrancaron. Viene null siempre al recibir. Que face_limit
                     # llegó se comprueba contando triángulos del GLB, no acá.
                     'ignored_params': d.get('ignored_params')}
        print('%-10s %-28s %-24s ign=%s' % (n, d.get('task_id'), d.get('output_path'),
                                            d.get('ignored_params')))
    p = 'assets/huesos/tareas3d.json'
    json.dump(tareas, open(p, 'w'), ensure_ascii=False, indent=2)
    print('\n->', p)

if __name__ == '__main__':
    main()
