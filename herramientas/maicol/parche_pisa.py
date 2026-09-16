# -*- coding: utf-8 -*-
"""El sonido de caminar. Idempotente."""
import sys
H=sys.argv[1]
s=open(H,encoding='utf-8').read()
def cam(a,b,marca=None,n=1):
    global s
    if marca and marca in s: print('  (ya)'); return
    if b in s: print('  (ya)'); return
    assert a in s, 'NO ESTA:\n'+a[:240]
    s=s.replace(a,b,n)

cam("""    if(jug.vy>0){
      const g=Math.min(1, jug.vy/900);
      jug.piso=true; if(andando>0.2) son('pisa');""",
"""    if(jug.vy>0){
      const g=Math.min(1, jug.vy/900);
      /* EL SONIDO DE CAMINAR ERA ESTATICA, Y NO ERA EL SONIDO: ERA EL DISPARADOR.
         Esta rama corre TODOS LOS CUADROS mientras se esta parado en el piso — la gravedad empuja
         la caja dentro del suelo en cada cuadro y el choque se resuelve de nuevo —, asi que
         son('pisa') salia SESENTA VECES POR SEGUNDO. Sesenta pisadas por segundo superpuestas no
         son una pisada: son ruido blanco.
         Ahora la pisada de ATERRIZAR suena solo en la transicion aire->piso, y los pasos de
         caminar van por el ciclo de la animacion, que es lo que de verdad marca cuando el pie
         toca: dos por vuelta de ocho cuadros. */
      const aterrizo = !eraPiso;
      jug.piso=true;
      if(aterrizo && andando>0.2) son('pisa');""")

# el estado anterior del piso
cam("  const techo = chocaCaja(jug.x, jug.y, jug.an, AL_PARADO);",
    "  const eraPiso = jug.piso;\n  const techo = chocaCaja(jug.x, jug.y, jug.an, AL_PARADO);")

# los pasos, por el ciclo de la animacion
cam("""  if(jug.piso && Math.abs(jug.vx)>12){
    jug.anim += dt * 24 * (0.45 + 0.75*Math.min(1, Math.abs(jug.vx)/VEL));
    andando+=dt;""",
"""  if(jug.piso && Math.abs(jug.vx)>12){
    const antes=jug.anim;
    jug.anim += dt * 24 * (0.45 + 0.75*Math.min(1, Math.abs(jug.vx)/VEL));
    /* UN PASO CADA VEZ QUE EL CICLO CRUZA UN CUADRO DE CONTACTO. El ciclo de correr tiene ocho
       cuadros y dos apoyos, el 0 y el 4: ahi es donde el pie toca. Atado a la animacion, la
       cadencia del sonido y la de las piernas son la misma cosa por construccion, y al cambiar
       la velocidad las dos cambian juntas. */
    const c0=Math.floor(antes)%8, c1=Math.floor(jug.anim)%8;
    if(c0!==c1 && (c1===0 || c1===4)) son(jug.agachado? 'agacha' : 'paso');
    andando+=dt;""")

# 'paso' es la misma muestra que 'pisa' pero mas bajita: es un paso, no un aterrizaje
cam("const SON_MAP={ salto:'sSalto', pisa:'sPisa', estrella:'sEstrella', dano:'sDano',",
    "const SON_MAP={ salto:'sSalto', pisa:'sPisa', paso:'sPaso', estrella:'sEstrella', dano:'sDano',")
cam("const VOL={ sSalto:0.5, sPisa:0.4,",
    "const VOL={ sSalto:0.5, sPisa:0.42, sPaso:0.22,")

# el contador, para poder medir la cadencia
cam("  audio2:()=>({ efectos:Object.keys(SFX).length,",
"""  cuenta:(reset)=>{ if(reset){ for(const k in CUENTA) delete CUENTA[k]; } return Object.assign({},CUENTA); },
  audio2:()=>({ efectos:Object.keys(SFX).length,""")
cam("function son(k){\n  const g=SON_MAP[k];",
    "const CUENTA={};   // cuantas veces se pidio cada sonido, para medir la cadencia\nfunction son(k){\n  CUENTA[k]=(CUENTA[k]||0)+1;\n  const g=SON_MAP[k];")
open(H,'w',encoding='utf-8').write(s)
print('pisadas por ciclo de animacion')
