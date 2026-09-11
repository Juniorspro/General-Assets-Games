# -*- coding: utf-8 -*-
"""Sesenta cuadros, efectos grabados y musica. Idempotente."""
import sys
H=sys.argv[1]
s=open(H,encoding='utf-8').read()
def cam(a,b,marca=None,n=1):
    global s
    if marca and marca in s: print('  (ya)'); return
    if b in s: print('  (ya)'); return
    assert a in s, 'NO ESTA:\n'+a[:240]
    s=s.replace(a,b,n)

# ---------------------------------------------------------------- 1. la hoja de 60
i = -1 if 'SESENTA CUADROS' in s else s.index('/* DIECISEIS CUADROS')
j=0 if i<0 else s.index('const RESPIRA=[0,1,2,3,3,2,1,0], RESPIRA_FPS=3.5;')+len('const RESPIRA=[0,1,2,3,3,2,1,0], RESPIRA_FPS=3.5;')
NUEVO = """/* SESENTA CUADROS, en diez tandas. Diez animaciones de verdad en vez de un cuadro por estado:
   correr, respirar parado, caminar agachado, respirar agachado, saltar, caer, recibir el golpe,
   morir, festejar y frenar.
   TODOS MIDEN LO MISMO Y ESTA COMPROBADO. Cada tanda de dibujos vuelve con su propia escala, asi
   que se le declara a cada una cuanto mide su cuadro mas alto en veces "parado" -que son 118 px de
   atlas- y despues se mide el resultado: parado da 72,8 px dibujados y el contacto de correr 68,8,
   o sea 5,8% de diferencia, que es lo que mide una persona parada contra la misma en el apoyo de
   una zancada. Los doce agachados quedan entre 39,3 y 43,6 px, todos por debajo de los 48 del
   tunel: ya no hace falta aplastar el dibujo a mano para que entre.
   POR QUE DECLARADO Y NO MEDIDO: con 16 cuadros la regla del ancho de cabeza alcanzaba. Con 60 se
   rompe — en una pose agachada el tercio de arriba de la figura es la ESPALDA, y la regla devolvia
   429 px de "cabeza" para una figura de 430 de alto. Probe contar zapatilla, rojo de campera y piel
   de la cara: las tres varian con la pose hasta un 111% dentro de la MISMA tanda. Lo que si es
   cierto y esta medido es que dentro de cada tanda la escala se mantiene, y por eso alcanza con un
   numero por tanda. Ver herramientas/maicol/armar_atlas60.py. */
let NCUADROS=60;
const ALTO_SPR=98;                     // era 86 con celda de 140; la celda ahora mide 159
let CUA={
  corre:   [0,1,2,3,4,5,6,7],
  quieto:  [8,9,10,11],
  agCamina:[12,13,14,15,16,17],
  agQuieto:[18,19,20,21,22,23],
  salto:   [24,25,26,27,28,29],
  cae:     [30,31,32,33,34,35],
  golpe:   [36,37,38,39,40,41],
  muere:   [42,43,44,45,46,47],
  festeja: [48,49,50,51,52,53],
  frena:   [54,55,56,57,58,59]
};
/* la respiracion va y VUELVE: 8 pasos sobre 4 dibujos a 3,5 por segundo son 2,3 segundos de ciclo,
   que es lo que tarda una respiracion tranquila. Un bucle 0-1-2-3-0 daria un tiron al reiniciar. */
const RESPIRA=[0,1,2,3,3,2,1,0], RESPIRA_FPS=3.5;
const RESP_AG=[0,1,2,3,4,5,4,3,2,1], RESP_AG_FPS=4.0;"""
if i>=0:
    s=s[:i]+NUEVO+s[j:]
    print('tabla de 60 puesta')
else:
    print('  (tabla ya estaba)')

# ---------------------------------------------------------------- 2. elegir el cuadro
cam("""    let cuadro;
    if(jug.muerto>0) cuadro=CUA.golpe;
    else if(jug.invul>0.9) cuadro=CUA.golpe;
    else if(!jug.piso) cuadro = jug.vy<0? CUA.salto : CUA.caida;
    else if(jug.agachado) cuadro = CUA.agachado;
    else if(jug.esY<0.90) cuadro = CUA.agachado;      // el aterrizaje tambien usa el cuadro agachado
    else if(Math.abs(jug.vx)>12) cuadro = CUA.corre[Math.floor(jug.anim)%CUA.corre.length];
    else cuadro = CUA.quieto[RESPIRA[Math.floor(jug.quieto*RESPIRA_FPS)%RESPIRA.length]];
    /* AGACHADO EL DIBUJO TAMBIEN TIENE QUE ENTRAR. El cuadro de agacharse mide 62 px dibujado
       y el tunel tiene 48: sin aplastarlo, la cabeza atraviesa la losa. Se lleva a 46. */
    let eX=jug.esX, eY=jug.esY;
    if(jug.agachado){ eY=0.74; eX=1.14; }
    dibujarSprite(IMG.maicol, cuadro, NCUADROS, px, py+1, 86, jug.mira, eX, eY);""",
"""    dibujarSprite(IMG.maicol, cuadroJug(), NCUADROS, px, py+1, ALTO_SPR, jug.mira, jug.esX, jug.esY);""")

cam("function dibujar(){",
"""/* QUE CUADRO VA. Antes era una cadena de seis if con UN dibujo por estado; ahora hay diez ciclos
   y cada uno se recorre por la variable fisica que le corresponde: el salto por la velocidad
   vertical, la caida por la velocidad de caida, el golpe y la muerte por su reloj, el festejo por
   el reloj del cartel. Un ciclo recorrido por tiempo cuando la fisica va a otra velocidad se ve
   patinando; recorrido por la magnitud que lo causa, se ve pegado. */
function deCiclo(lista, t){ return lista[Math.max(0, Math.min(lista.length-1, Math.floor(t*lista.length))) ]; }
function cuadroJug(){
  if(festejoT>0) return CUA.festeja[Math.floor(festejoT*9)%CUA.festeja.length];
  if(jug.muerto>0) return deCiclo(CUA.muere, 1-jug.muerto/0.9);
  if(jug.invul>0.85) return deCiclo(CUA.golpe, (1.4-jug.invul)/0.55);
  if(!jug.piso){
    if(jug.vy<0) return deCiclo(CUA.salto, 1-(-jug.vy)/SALTO);
    return CUA.cae[Math.max(0,Math.min(3, Math.floor(jug.vy/560*4)))];
  }
  if(jug.aterriza>0) return CUA.cae[jug.aterriza>0.07? 4 : 5];
  if(jug.agachado){
    return Math.abs(jug.vx)>12
      ? CUA.agCamina[Math.floor(jug.anim)%CUA.agCamina.length]
      : CUA.agQuieto[RESP_AG[Math.floor(jug.quieto*RESP_AG_FPS)%RESP_AG.length]];
  }
  if(jug.frenando>0) return deCiclo(CUA.frena, 1-jug.frenando/0.22);
  if(Math.abs(jug.vx)>12) return CUA.corre[Math.floor(jug.anim)%CUA.corre.length];
  return CUA.quieto[RESPIRA[Math.floor(jug.quieto*RESPIRA_FPS)%RESPIRA.length]];
}

function dibujar(){""")

# ---------------------------------------------------------------- 3. los relojes nuevos
cam("            esX:1, esY:1, esV:0, anim:0, quieto:0 };",
    "            esX:1, esY:1, esV:0, anim:0, quieto:0, aterriza:0, frenando:0 };")
cam("""      if(g>0.30){ jug.esY=1-0.34*g; jug.esV=0;""",
"""      if(g>0.30){ jug.esY=1-0.34*g; jug.esV=0; jug.aterriza=0.14;""")
cam("  jug.quieto = (Math.abs(jug.vx)>12 || !jug.piso)? 0 : jug.quieto+dt;",
"""  jug.quieto = (Math.abs(jug.vx)>12 || !jug.piso)? 0 : jug.quieto+dt;
  if(jug.aterriza>0) jug.aterriza-=dt;
  /* FRENAR es pedir el lado contrario al que se va, rapido. No es un estado que haya que guardar:
     es una condicion instantanea, y se le pone un reloj corto para que el ciclo alcance a verse. */
  if(jug.piso && dir && Math.sign(dir)!==Math.sign(jug.vx) && Math.abs(jug.vx)>VEL*0.45) jug.frenando=0.22;
  else if(jug.frenando>0) jug.frenando-=dt;""")
cam("  jug.esX=1; jug.esY=1; jug.esV=0; jug.anim=0; jug.quieto=0;\n  jug.agachado=false; jug.al=AL_PARADO;",
    "  jug.esX=1; jug.esY=1; jug.esV=0; jug.anim=0; jug.quieto=0;\n  jug.agachado=false; jug.al=AL_PARADO;\n  jug.aterriza=0; jug.frenando=0; festejoT=0;")
cam("let avisoT=0, avisoTxt='';",
    "let avisoT=0, avisoTxt='';\nlet festejoT=0;   // mientras dura, el muneco festeja en vez de quedarse quieto")
cam("    vigia(dt);\n    pasoFondo(dt);",
    "    vigia(dt);\n    if(festejoT>0) festejoT-=dt;\n    pasoFondo(dt);")
cam("function ganar(){\n  if(finMostrado) return;", "function ganar(){\n  if(finMostrado) return;\n  festejoT=3.2;")

open(H,'w',encoding='utf-8').write(s)
print('bloque 1-3 (60 cuadros) puesto')

# ---------------------------------------------------------------- 4. efectos grabados y musica
cam("function son(k){\n  if(!AUD.ctx||!AUD.on) return;",
"""/* LOS EFECTOS Y LA MUSICA SON GRABADOS. Lo que habia eran osciladores: sirven para probar que
   suena algo, no para que suene bien.
   CADA EFECTO ES UNA PILA DE TRES. Un solo elemento Audio no puede sonar encima de si mismo: al
   segundo disparo salta al principio y corta el primero, y en un juego de plataformas dos monedas
   seguidas pasan todo el tiempo. Con tres en rotacion se superponen. */
const PILA={}, PILA_N=3;
const VOL={ sSalto:0.55, sPisa:0.45, sEstrella:0.62, sDano:0.7, sMuerte:0.72, sResorte:0.62,
            sMeta:0.7, sAgacha:0.4 };
function sonar(k){
  const d=(typeof SFX!=='undefined')? SFX[k] : null;
  if(!d || !AUD.on) return false;
  let p=PILA[k];
  if(!p){ p=PILA[k]=[]; p.i=0; for(let n=0;n<PILA_N;n++){ const a=new Audio(d); a.preload='auto'; p.push(a); } }
  const a=p[(p.i++)%PILA_N];
  try{ a.currentTime=0; a.volume=VOL[k]||0.6; const q=a.play(); if(q&&q.catch) q.catch(()=>{}); }catch(e){}
  return true;
}
/* LA MUSICA SE GUARDA UNA VEZ POR TEMA. Creando un Audio nuevo en cada cambio hay que volver a
   decodificar 65 KB de base64, y eso es un tironazo justo cuando arranca el nivel. */
const MUS_CACHE={};
let musK='';
function musica(k){
  if(musK===k && MUS_CACHE[k] && !MUS_CACHE[k].paused) return;
  for(const n in MUS_CACHE){ if(n!==k){ try{ MUS_CACHE[n].pause(); }catch(e){} } }
  musK=k;
  if(!k || !AUD.on || typeof MUS==='undefined' || !MUS[k]) return;
  let a=MUS_CACHE[k];
  if(!a){ a=MUS_CACHE[k]=new Audio(MUS[k]); a.loop=true; a.preload='auto'; }
  a.volume=0.30;
  try{ const q=a.play(); if(q&&q.catch) q.catch(()=>{}); }catch(e){}
}
function musicaParar(){ for(const n in MUS_CACHE){ try{ MUS_CACHE[n].pause(); }catch(e){} } }

const SON_MAP={ salto:'sSalto', pisa:'sPisa', estrella:'sEstrella', dano:'sDano',
                muerte:'sMuerte', resorte:'sResorte', meta:'sMeta', final:'sMeta',
                agacha:'sAgacha' };
function son(k){
  const g=SON_MAP[k];
  if(g && sonar(g)) return;              // grabado si lo hay, sintetizado si no
  if(!AUD.ctx||!AUD.on) return;""")

# los enganches de musica
cam("  ponerAdornos(); ponerFondo(); ponerArbolesTerreno();\n  vigEspera=1.0; vigN=0; vigT=0;",
    "  ponerAdornos(); ponerFondo(); ponerArbolesTerreno();\n  vigEspera=1.0; vigN=0; vigT=0;\n  musica('mus'+['Bosque','Cueva','Fabrica'][tema]);")
cam("function alMenu(){\n  jugando=false; document.body.classList.remove('jugando');",
    "function alMenu(){\n  jugando=false; document.body.classList.remove('jugando');\n  musica('musMenu');")
cam("const jugarYa=()=>{ audioIniciar(); irANivel(progreso()); };",
    "const jugarYa=()=>{ audioIniciar(); irANivel(progreso()); };")
cam("const mudo=()=>{ AUD.on=!AUD.on; bs2.classList.toggle('mudo',!AUD.on); bs2.textContent=AUD.on?'♪':'×'; };",
    "const mudo=()=>{ AUD.on=!AUD.on; bs2.classList.toggle('mudo',!AUD.on); bs2.textContent=AUD.on?'♪':'×';\n  if(AUD.on){ const k=musK; musK=''; musica(k||'musMenu'); } else musicaParar(); };")
# el resorte no tenia sonido
cam("      r.t=0.30; son('salto'); sacudir(2.0);", "      r.t=0.30; son('resorte'); sacudir(2.0);", marca="son('resorte')")
# arrancar la musica del menu con el primer toque, que es cuando el navegador lo permite
cam("""(function armarCine(){""",
"""/* La musica arranca con el PRIMER TOQUE, no al cargar: ningun navegador deja sonar nada sin un
   gesto, y llamarlo antes solo deja una promesa rechazada en la consola. */
(function primerToque(){
  const ir=()=>{ audioIniciar(); if(!jugando) musica('musMenu');
    removeEventListener('pointerdown',ir); removeEventListener('keydown',ir); };
  addEventListener('pointerdown',ir); addEventListener('keydown',ir);
})();

(function armarCine(){""")
# y que la cinematica baje la musica mientras habla
cam("function abrirCine(alSalir){\n  cineAlSalir=alSalir||null;",
    "function abrirCine(alSalir){\n  cineAlSalir=alSalir||null;\n  for(const n in MUS_CACHE) try{ MUS_CACHE[n].volume=0.08; }catch(e){}")
cam("function cerrarCine(){\n  cineParar(); cineK=-1; marcarCine();",
    "function cerrarCine(){\n  cineParar(); cineK=-1; marcarCine();\n  for(const n in MUS_CACHE) try{ MUS_CACHE[n].volume=0.30; }catch(e){}")
# ganchos
cam("  capasFondo:()=>{",
"""  audio2:()=>({ efectos:(typeof SFX!=='undefined')? Object.keys(SFX).length : 0,
                temas:(typeof MUS!=='undefined')? Object.keys(MUS).length : 0,
                sonando:musK, on:AUD.on }),
  cuadros60:()=>({ n:NCUADROS, ciclos:Object.keys(CUA).reduce((o,k)=>{o[k]=CUA[k].length;return o;},{}),
                   total:Object.keys(CUA).reduce((n,k)=>n+CUA[k].length,0), alto:ALTO_SPR }),
  capasFondo:()=>{""")
open(H,'w',encoding='utf-8').write(s)
print('bloque 4 (audio grabado) puesto')
