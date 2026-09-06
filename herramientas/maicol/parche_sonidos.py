# -*- coding: utf-8 -*-
"""Engancha los sonidos que no se disparaban y suma los dos que faltaban. Idempotente."""
import sys
H=sys.argv[1]
s=open(H,encoding='utf-8').read()
def cam(a,b,marca=None,n=1):
    global s
    if marca and marca in s: print('  (ya)'); return
    if b in s: print('  (ya)'); return
    assert a in s, 'NO ESTA:\n'+a[:240]
    s=s.replace(a,b,n)

# 1) el mapa: el pisoton y el final pasan a tener sonido propio
cam("""const SON_MAP={ salto:'sSalto', pisa:'sPisa', estrella:'sEstrella', dano:'sDano',
                muerte:'sMuerte', resorte:'sResorte', meta:'sMeta', final:'sMeta',
                agacha:'sAgacha' };""",
"""const SON_MAP={ salto:'sSalto', pisa:'sPisa', estrella:'sEstrella', dano:'sDano',
                muerte:'sMuerte', resorte:'sResorte', meta:'sMeta', final:'sFinal',
                agacha:'sAgacha', 'pisotón':'sPison', pison:'sPison' };""")

# 2) EL SONIDO DE AGACHARSE NO LO DISPARABA NADIE. Estaba el archivo, estaba en el mapa, y no
#    habia una sola llamada en todo el juego: un sonido que nunca suena es un sonido que no existe.
cam("""  jug.agachado = jug.piso && (techo || pideAg);
  jug.al = jug.agachado? AL_AGACHADO : AL_PARADO;""",
"""  const agAntes=jug.agachado;
  jug.agachado = jug.piso && (techo || pideAg);
  jug.al = jug.agachado? AL_AGACHADO : AL_PARADO;
  /* al AGACHARSE suena el roce de la ropa. El efecto estaba cargado y mapeado desde la vuelta
     pasada y no lo llamaba nadie: un sonido que nunca se dispara es un sonido que no existe. */
  if(jug.agachado && !agAntes) son('agacha');""")

open(H,'w',encoding='utf-8').write(s)
print('sonidos enganchados')
