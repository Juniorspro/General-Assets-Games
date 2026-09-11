# -*- coding: utf-8 -*-
"""Quinta vuelta de Maicol: agacharse, arboles sobre el terreno, pajaros en el mundo, estrellas
   que sirven, piso con textura, cinematica con voz y menu con arte. Idempotente."""
import sys, re
H=sys.argv[1]
s=open(H,encoding='utf-8').read()
def cam(a,b,marca=None,n=1):
    """El guardia es `b in s` Y NADA MAS. Antes decia `b in s and a not in s`, y esa segunda
       condicion es la que rompia todo: cuando el texto nuevo CONTIENE al viejo -que es el caso
       normal, porque casi siempre se agrega alrededor de lo que ya estaba- despues de parchear
       `a` sigue estando dentro de `b`, el guardia no salta, y el parche se aplica de nuevo.
       Resultado: seis copias de `const EST_X_VIDA` y el juego no arranca."""
    global s
    if marca and marca in s: print('  (ya)'); return
    if b in s: print('  (ya)'); return
    assert a in s, 'NO ESTA:\n'+a[:220]
    s=s.replace(a,b,n)

# ============================================================ 0. el bug de las cuatro lineas
viejo="  jug.quieto = (Math.abs(jug.vx)>12 || !jug.piso)? 0 : jug.quieto+dt;\n"
if s.count(viejo)>1:
    s=s.replace(viejo*s.count(viejo), viejo, 1)
    print('arreglado: jug.quieto estaba CUATRO veces, la respiracion corria a 4x')

# ============================================================ 1. textos
cam(" bSalto:{en:'JUMP', es:'SALTAR', pt:'PULAR'}",
""" bSalto:{en:'JUMP', es:'SALTAR', pt:'PULAR'},
 bAgachar:{en:'DUCK', es:'AGACHAR', pt:'ABAIXAR'},
 kAgachar:{en:'duck · to fit under low ceilings', es:'agacharse · para pasar por lo bajo', pt:'abaixar · para passar por baixo'},
 masVida:{en:'+1 LIFE', es:'+1 VIDA', pt:'+1 VIDA'},
 estVida:{en:'{n} stars = 1 life', es:'{n} estrellas = 1 vida', pt:'{n} estrelas = 1 vida'},
 verCuento:{en:'THE STORY', es:'LA HISTORIA', pt:'A HISTÓRIA'},
 saltarCine:{en:'SKIP', es:'SALTAR', pt:'PULAR'},
 cine1:{en:'Maicol and Maicolito grew up in the woods. Where one went, the other followed.',
        es:'Maicol y Maicolito crecieron en el bosque. Donde iba uno, iba el otro.',
        pt:'Maicol e Maicolito cresceram na floresta. Onde um ia, o outro ia também.'},
 cine2:{en:'One night the machines of the old factory came down to the woods, and Maicolito never came back.',
        es:'Una noche las máquinas de la vieja fábrica bajaron al bosque, y Maicolito no volvió.',
        pt:'Uma noite as máquinas da velha fábrica desceram até a floresta, e Maicolito não voltou.'},
 cine3:{en:'Maicol found his cap in the mud. Nothing else. Not one footprint.',
        es:'Maicol encontró su gorra en el barro. Nada más. Ni una huella.',
        pt:'Maicol encontrou o boné dele na lama. Nada mais. Nenhuma pegada.'},
 cine4:{en:'He pulled on his red hoodie and started walking. Seven places stand between him and his brother.',
        es:'Se puso la campera roja y empezó a caminar. Siete lugares lo separan de su hermano.',
        pt:'Vestiu o moletom vermelho e começou a andar. Sete lugares o separam do irmão.'}""")

# ============================================================ 2. agacharse
cam("const jug={ x:0,y:0,vx:0,vy:0,an:32,al:62, piso:false, mira:1, fase:0, vidas:3,",
"""/* AGACHARSE ES UNA MEDIDA, no un dibujo. Parado el jugador mide 62 px y la casilla 48: ocupa
   DOS filas. Agachado mide 34 y entra en UNA. Un tunel de una casilla de alto se pasa agachado y
   de ninguna otra forma, y adentro va una estrella — asi el boton tiene para que existir. */
const AL_PARADO=62, AL_AGACHADO=34, VEL_AGACHADO=0.42;
const jug={ x:0,y:0,vx:0,vy:0,an:32,al:AL_PARADO, piso:false, mira:1, fase:0, vidas:3, agachado:false,""")

cam("""  let dir=0;
  if(tecla['a']||tecla['arrowleft']||tIzq) dir-=1;
  if(tecla['d']||tecla['arrowright']||tDer) dir+=1;
  if(dir) jug.mira=dir;""",
"""  /* AGACHARSE VA ANTES DE MOVER, porque cambia el alto de la caja y con eso el resultado de
     todos los choques de este cuadro. Y no se puede estirar si hay techo: si se pudiera, el
     jugador saldria disparado hacia arriba atravesando la losa. */
  const techo = chocaCaja(jug.x, jug.y, jug.an, AL_PARADO);
  const pideAg = !!(tecla['s']||tecla['arrowdown']||tAba);
  jug.agachado = jug.piso && (techo || pideAg);
  jug.al = jug.agachado? AL_AGACHADO : AL_PARADO;
  let dir=0;
  if(tecla['a']||tecla['arrowleft']||tIzq) dir-=1;
  if(tecla['d']||tecla['arrowright']||tDer) dir+=1;
  if(dir) jug.mira=dir;""")
cam("  if(dir){ jug.vx += dir*ACEL*dt; if(Math.abs(jug.vx)>VEL) jug.vx=dir*VEL; }",
    "  const vTope = jug.agachado? VEL*VEL_AGACHADO : VEL;\n  if(dir){ jug.vx += dir*ACEL*dt; if(Math.abs(jug.vx)>vTope) jug.vx=dir*vTope; }")
cam("  if(jug.pedido>0 && jug.coyote>0){ jug.vy=-SALTO;",
    "  if(jug.pedido>0 && jug.coyote>0 && !techo){ jug.vy=-SALTO;")
cam("  jug.esX=1; jug.esY=1; jug.esV=0; jug.anim=0; jug.quieto=0;",
    "  jug.esX=1; jug.esY=1; jug.esV=0; jug.anim=0; jug.quieto=0;\n  jug.agachado=false; jug.al=AL_PARADO;")

# el boton y la tecla
cam("let tIzq=false, tDer=false;", "let tIzq=false, tDer=false, tAba=false;")
cam("tocar('bSalto',()=>{ jug.pedido=0.14; },()=>soltarSalto());",
    "tocar('bSalto',()=>{ jug.pedido=0.14; },()=>soltarSalto());\ntocar('bAba',()=>tAba=true,()=>tAba=false);")
cam('  <button id="bSalto" class="tb"></button>',
    '  <button id="bAba" class="tb"></button>\n  <button id="bSalto" class="tb"></button>')
cam("  #bSalto{ right:20px; bottom:22px; width:88px; height:88px; font-size:16px; letter-spacing:.06em; }",
    "  #bSalto{ right:20px; bottom:22px; width:88px; height:88px; font-size:16px; letter-spacing:.06em; }\n  /* con TEXTO y no con una flecha. Los botones viven en un cuadro girado 90 grados, asi que
     el glifo gira con ellos: el ▼ salia ◀ y se leia a TERCERA flecha de direccion. */
  #bAba{ right:120px; bottom:24px; width:74px; height:74px; font-size:11px; letter-spacing:.04em; }")
cam("""    ['A D / ←→', TX('kMover')], ['Space / W', TX('kSaltar')], ['Esc', TX('kPausa')]""",
"""    ['A D / ←→', TX('kMover')], ['Space / W', TX('kSaltar')],
    ['S / ↓', TX('kAgachar')], ['Esc', TX('kPausa')]""")

# el cuadro y el aplaste del dibujo
cam("""    else if(jug.esY<0.90) cuadro = CUA.agachado;      // el cuadro de agacharse sale del aplaste""",
"""    else if(jug.agachado) cuadro = CUA.agachado;
    else if(jug.esY<0.90) cuadro = CUA.agachado;      // el aterrizaje tambien usa el cuadro agachado""")
cam("    dibujarSprite(IMG.maicol, cuadro, NCUADROS, px, py+1, 86, jug.mira, jug.esX, jug.esY);",
"""    /* AGACHADO EL DIBUJO TAMBIEN TIENE QUE ENTRAR. El cuadro de agacharse mide 62 px dibujado
       y el tunel tiene 48: sin aplastarlo, la cabeza atraviesa la losa. Se lleva a 46. */
    let eX=jug.esX, eY=jug.esY;
    if(jug.agachado){ eY=0.74; eX=1.14; }
    dibujarSprite(IMG.maicol, cuadro, NCUADROS, px, py+1, 86, jug.mira, eX, eY);""")

open(H,'w',encoding='utf-8').write(s)
print('bloque 1-2 (agacharse) puesto')

# ============================================================ 3. pajaros en el mundo
cam("""  for(const p of pajaros){
    p.x += p.v*p.d*dt; p.f += dt*(6.5+p.v*0.06);
    p.y += Math.sin(t*0.9+p.f*0.1)*7*dt;
    if(p.d>0 && p.x > ANCHO+320) { p.x=-260; p.y=ALTO*(0.08+Math.random()*0.36); }
    if(p.d<0 && p.x < -320)      { p.x=ANCHO+260; p.y=ALTO*(0.08+Math.random()*0.36); }
  }""",
"""  /* LOS PAJAROS VIVEN EN EL MUNDO, no en la pantalla. Guardados en coordenadas de pantalla
     viajaban PEGADOS a la camara: por mas que corrieras nunca salian del cuadro, y un pajaro que
     te sigue a todos lados no se lee a pajaro. Ahora la x es del mundo y se dibuja a 0,45 de la
     camara, asi corriendo se van para atras y entran otros. Se reciclan CONTRA LA CAMARA, que es
     lo unico que sabe donde esta el borde. */
  for(const p of pajaros){
    p.x += p.v*p.d*dt; p.f += dt*(6.5+p.v*0.06);
    p.y += Math.sin(t*0.9+p.f*0.1)*7*dt;
    const X=p.x - camX*PAJARO_V;
    if(X > ANCHO+340){ p.x = camX*PAJARO_V - 300; p.y=ALTO*(0.06+Math.random()*0.38); p.d=1; }
    if(X < -340)     { p.x = camX*PAJARO_V + ANCHO+300; p.y=ALTO*(0.06+Math.random()*0.38); p.d=-1; }
  }""")
cam("    for(let n=0;n<5;n++)\n      pajaros.push({ x:azar(n*331+nivel*7)*ANCHO*1.6, y:ALTO*(0.10+azar(n*77)*0.34),",
    "    for(let n=0;n<6;n++)\n      pajaros.push({ x:camX*PAJARO_V + azar(n*331+nivel*7)*ANCHO*1.5 - ANCHO*0.2, y:ALTO*(0.10+azar(n*77)*0.34),")
cam("      cx.save(); cx.translate(Math.round(p.x), Math.round(p.y - camY*0.22));",
    "      cx.save(); cx.translate(Math.round(p.x - camX*PAJARO_V), Math.round(p.y - camY*0.22));")
cam("const TECHO_V=0.14;", "const TECHO_V=0.14, PAJARO_V=0.45;")

# ============================================================ 4. arboles SOBRE el terreno
cam("let adornos=[], arboles=[], pajaros=[], hojasV=[], motas=[];",
    "let adornos=[], arboles=[], arbolesT=[], pajaros=[], hojasV=[], motas=[];")
cam("""function ponerFondo(){""",
"""/* ARBOLES SOBRE EL TERRENO, a velocidad de camara. Los del fondo estan a 0,55 y por eso se leen
   a fondo: pasan mas despacio que el piso. Un arbol PLANTADO tiene que pasar exactamente igual
   que la casilla donde apoya, o el ojo lo saca del mundo.
   LA REGLA PARA NO ARRUINAR EL NIVEL: solo donde hay CINCO FILAS DE AIRE limpias y dos columnas a
   cada lado. Un arbol de tres casillas y media tapa lo que hay detras, asi que se pone unicamente
   donde no hay nada detras que tapar — ni plataforma, ni estrella, ni bicho, ni la meta. */
function ponerArbolesTerreno(){
  arbolesT.length=0;
  if(tema!==0) return;                       // arboles solo en el bosque
  for(let j=0;j<MH;j++) for(let i=2;i<MW-3;i++){
    if(!solido(i,j) || solido(i,j-1)) continue;
    if(azar(nivel*3301 + i*79 + j*11) > 0.17) continue;
    let limpio=true;
    for(let dj=-5; dj<=-1 && limpio; dj++)
      for(let di=-2; di<=2; di++){
        const f=MAPA[j+dj];
        if(f && f[i+di] && f[i+di]!=='.') { limpio=false; break; }
      }
    if(!limpio) continue;
    const X=i*TAM+TAM/2;
    if(arbolesT.some(a=>Math.abs(a.x-X)<TAM*5)) continue;
    if(estrellas.some(e=>Math.abs(e.x-X)<80)) continue;
    if(bichos.some(b=>Math.abs(b.x-X)<80)) continue;
    if(resortes.some(r=>Math.abs(r.x-X)<70)) continue;
    if(banderas.some(f=>Math.abs(f.x-X)<70)) continue;
    if(meta && Math.abs(meta.x-X)<140) continue;
    if(Math.abs(jug.x-X)<150) continue;
    /* la mitad van espejados. Es UN solo dibujo de arbol: cuatro copias identicas en pantalla se
       leen a copia y pega, y darle la vuelta a la mitad cuesta cero bytes. */
    arbolesT.push({ x:X, y:j*TAM, e:0.60+azar(i*911+j*7)*0.26,
                    f:azar(i*577+j*3)*6.28, v:0.5+azar(i*233+j)*0.4,
                    m: azar(i*443+j*17)<0.5? 1 : -1 });
  }
}

function dibujarArbolesTerreno(){
  const ca=cacheArbol(); if(!ca || !CAPAS.arT) return;
  const t=performance.now()/1000;
  for(const a of arbolesT){
    const X=a.x-camX;
    if(X < -200 || X > ANCHO+200) continue;
    const n=Math.floor((((t*a.v + a.f)/6.28318)%1+1)%1 * ca.n)%ca.n;
    cx.save();
    cx.translate(Math.round(X), Math.round(a.y-camY));
    if(a.m<0) cx.scale(-1,1);
    cx.drawImage(ca.c, n*ca.an, 0, ca.an, ca.al,
                 -Math.round(ca.an*a.e/2), -Math.round(ca.al*a.e),
                 Math.round(ca.an*a.e), Math.round(ca.al*a.e));
    cx.restore();
  }
}

function ponerFondo(){""")
cam("const CAPAS={arb:1, paj:1, hoj:1, ado:1, sil:1, lej:1, mon:1, lom:1};  // interruptores para medir que cuesta cada capa",
    "const CAPAS={arb:1, paj:1, hoj:1, ado:1, sil:1, lej:1, mon:1, lom:1, arT:1};  // interruptores para medir que cuesta cada capa")
cam("  ponerAdornos(); ponerFondo();", "  ponerAdornos(); ponerFondo(); ponerArbolesTerreno();")
cam("  dibujarCasillas();\n  dibujarAdornos();", "  dibujarCasillas();\n  dibujarArbolesTerreno();\n  dibujarAdornos();")

open(H,'w',encoding='utf-8').write(s)
print('bloque 3-4 (pajaros y arboles) puesto')

# ============================================================ 5. las estrellas sirven
cam("""      e.tomada=true; tomadas++; son('estrella'); pintarHUD();
      chispas(e.x, e.y, 12, 'rgba(255,224,140,');""",
"""      e.tomada=true; tomadas++; son('estrella');
      /* CUATRO ESTRELLAS, UNA VIDA. Una estrella que solo sube un numero no es un premio, es
         decoracion: se junta la cuarta, la barra de corazones CRECE, y eso si se siente. */
      paraVida++;
      if(paraVida>=EST_X_VIDA){
        paraVida=0;
        if(jug.vidas<VIDAS_MAX){ jug.vidas++; son('meta'); avisar(TX('masVida')); }
      }
      pintarHUD();
      chispas(e.x, e.y, 12, 'rgba(255,224,140,');""")
cam("let bichos=[], estrellas=[], meta=null, camX=0, camY=0, tomadas=0, totales=0, andando=0;",
"""let bichos=[], estrellas=[], meta=null, camX=0, camY=0, tomadas=0, totales=0, andando=0;
const EST_X_VIDA=4, VIDAS_MAX=5;
let paraVida=0;
/* un cartelito arriba que dura poco: para "+1 vida" hace falta algo que se vea SIN mirar el HUD */
let avisoT=0, avisoTxt='';
function avisar(t){ avisoTxt=t; avisoT=1.7; }""")
cam("  jug.esX=1; jug.esY=1; jug.esV=0; jug.anim=0; jug.quieto=0;\n  jug.agachado=false; jug.al=AL_PARADO;",
    "  jug.esX=1; jug.esY=1; jug.esV=0; jug.anim=0; jug.quieto=0;\n  jug.agachado=false; jug.al=AL_PARADO;\n  paraVida=0; avisoT=0;")
# el cartelito, dibujado y descontado
cam("  dibujarHojas();\n  dibujarParticulas();\n  dibujarCartel();",
"""  dibujarHojas();
  dibujarParticulas();
  dibujarCartel();
  if(avisoT>0){
    const a=Math.min(1, avisoT*2.2);
    cx.save(); cx.globalAlpha=a; cx.textAlign='center';
    cx.font='900 '+Math.round(ALTO*0.052)+'px Segoe UI, system-ui, sans-serif';
    cx.fillStyle='rgba(0,0,0,.55)'; cx.fillText(avisoTxt, ANCHO/2+3, ALTO*0.20+3);
    cx.fillStyle='#ffd76a';         cx.fillText(avisoTxt, ANCHO/2,   ALTO*0.20);
    cx.restore(); cx.textAlign='left';
  }""")
cam("    pasoFondo(dt);\n    pasoMoviles(dt);", "    pasoFondo(dt);\n    if(avisoT>0) avisoT-=dt;\n    pasoMoviles(dt);")
# el registro por nivel
cam("function progreso(){",
"""/* CUANTAS ESTRELLAS SE SACARON EN CADA NIVEL. Sin esto la estrella se junta y se olvida: con el
   numero guardado el selector de niveles pasa a ser una lista de cuentas pendientes. */
function estrellasDe(n){ try{ return +(localStorage.getItem('maicol_est'+n)||0); }catch(e){ return 0; } }
function guardarEstrellas(n,c){ try{ if(c>estrellasDe(n)) localStorage.setItem('maicol_est'+n,String(c)); }catch(e){} }
function totalesDe(n){ return (NIVELES[n]||[]).join('').split('*').length-1; }
function progreso(){""")
cam("  if(nivel+1>progreso()) guardarProgreso(Math.min(NIVELES.length-1, nivel+1));",
    "  guardarEstrellas(nivel, tomadas);\n  if(nivel+1>progreso()) guardarProgreso(Math.min(NIVELES.length-1, nivel+1));")
cam("""    const b=document.createElement('button'); b.className='niv'+(k<abierto?' hecho':'')+(k>abierto?' trabado':'');
    b.textContent=k+1;""",
"""    const b=document.createElement('button'); b.className='niv'+(k<abierto?' hecho':'')+(k>abierto?' trabado':'');
    const tot=totalesDe(k), hay=estrellasDe(k);
    b.innerHTML='<b>'+(k+1)+'</b>'+(k<=abierto? '<u>★'+hay+'/'+tot+'</u>' : '');""")
cam("  .niv:active{ transform:translateY(3px); }",
    "  .niv{ display:flex; flex-direction:column; align-items:center; justify-content:center; line-height:1; }\n"
    "  .niv u{ text-decoration:none; font-size:max(8px,calc(9px * var(--esc,1))); opacity:.78; margin-top:2px; font-weight:700; }\n"
    "  .niv:active{ transform:translateY(3px); }")

open(H,'w',encoding='utf-8').write(s)
print('bloque 5 (estrellas) puesto')

# ============================================================ 6. el piso con textura
cam("""  { pasto:'#6db33f', pastoOsc:'#4c8a2b', tierra:'#8a5a2b', tierraOsc:'#6b4420', borde:'#3d2a14' },
  { pasto:'#4a7d94', pastoOsc:'#33596b', tierra:'#2f4759', tierraOsc:'#223543', borde:'#16222c' },
  { pasto:'#8a6a3a', pastoOsc:'#6b5029', tierra:'#4a4038', tierraOsc:'#37302a', borde:'#211c18' }""",
"""  { pasto:'#6db33f', pastoOsc:'#4c8a2b', tierra:'#8a5a2b', tierraOsc:'#6b4420', borde:'#3d2a14', velo:'rgba(60,30,0,.14)' },
  { pasto:'#4a7d94', pastoOsc:'#33596b', tierra:'#2f4759', tierraOsc:'#223543', borde:'#16222c', velo:'rgba(10,26,44,.34)' },
  { pasto:'#8a6a3a', pastoOsc:'#6b5029', tierra:'#4a4038', tierraOsc:'#37302a', borde:'#211c18', velo:'rgba(26,14,4,.20)' }""")

cam("""function dibujarCasillas(){
  const C=COLORES[tema];
  const i0=Math.max(0,Math.floor(camX/TAM)-1), i1=Math.min(MW-1,Math.ceil((camX+ANCHO)/TAM)+1);
  const j0=Math.max(0,Math.floor(camY/TAM)-1), j1=Math.min(MH-1,Math.ceil((camY+ALTO)/TAM)+1);
  for(let j=j0;j<=j1;j++) for(let i=i0;i<=i1;i++){
    const c=MAPA[j][i]; if(c==='.') continue;
    const X=Math.round(i*TAM-camX), Y=Math.round(j*TAM-camY);""",
"""/* LA TEXTURA DEL PISO. Un relleno de color plano con dos manchitas encima se lee a casilla de
   prueba; una textura que repite se lee a terreno.
   VA CON EL LIENZO CORRIDO A COORDENADAS DE MUNDO, no dibujando en pantalla. Un patron de canvas
   esta clavado al origen de la transformacion: dibujando las casillas en pantalla, las casillas se
   mueven con la camara y la textura NO, o sea que el piso se desliza por debajo de si mismo. Con
   el lienzo corrido -camX,-camY el patron queda pegado al mundo y viaja con el. */
let PAT=null, PAT_T=-1;
function patron(){
  const im=IMG['piso'+FONDOS[tema]]; if(!im) return null;
  if(PAT && PAT_T===tema) return PAT;
  try{ PAT=cx.createPattern(im,'repeat'); }catch(e){ PAT=null; }
  PAT_T=tema; return PAT;
}
function dibujarCasillas(){
  const C=COLORES[tema], pat=patron();
  const i0=Math.max(0,Math.floor(camX/TAM)-1), i1=Math.min(MW-1,Math.ceil((camX+ANCHO)/TAM)+1);
  const j0=Math.max(0,Math.floor(camY/TAM)-1), j1=Math.min(MH-1,Math.ceil((camY+ALTO)/TAM)+1);
  cx.save(); cx.translate(-Math.round(camX), -Math.round(camY));
  for(let j=j0;j<=j1;j++) for(let i=i0;i<=i1;i++){
    const c=MAPA[j][i]; if(c==='.') continue;
    const X=i*TAM, Y=j*TAM;""")

cam("""      const arr=!solido(i,j-1), izq=!solido(i-1,j), der=!solido(i+1,j), aba=!solido(i,j+1);
      cx.fillStyle=arr? C.pasto : C.tierra;
      cx.fillRect(X,Y,TAM,TAM);
      if(arr){
        cx.fillStyle=C.pastoOsc; cx.fillRect(X,Y+TAM*0.34,TAM,TAM*0.14);
        cx.fillStyle=C.tierra;   cx.fillRect(X,Y+TAM*0.48,TAM,TAM*0.52);""",
"""      const arr=!solido(i,j-1), izq=!solido(i-1,j), der=!solido(i+1,j), aba=!solido(i,j+1);
      if(pat){ cx.fillStyle=pat; cx.fillRect(X,Y,TAM,TAM);
               cx.fillStyle=C.velo; cx.fillRect(X,Y,TAM,TAM); }
      else { cx.fillStyle=arr? C.pasto : C.tierra; cx.fillRect(X,Y,TAM,TAM); }
      if(arr){
        cx.fillStyle=C.pasto;    cx.fillRect(X,Y,TAM,TAM*0.34);
        cx.fillStyle=C.pastoOsc; cx.fillRect(X,Y+TAM*0.34,TAM,TAM*0.14);
        if(!pat){ cx.fillStyle=C.tierra; cx.fillRect(X,Y+TAM*0.48,TAM,TAM*0.52); }""")
cam("""      } else {
        cx.fillStyle=C.tierraOsc;
        cx.fillRect(X+5+((i*5+j*3)%10), Y+7+((i*3+j*7)%13), 10, 8);
        cx.fillRect(X+23+((i*11+j*5)%13), Y+25+((i*7+j*2)%11), 8, 7);
        cx.fillStyle='rgba(0,0,0,.10)'; cx.fillRect(X, Y, TAM, 4);
      }""",
"""      } else {
        if(!pat){
          cx.fillStyle=C.tierraOsc;
          cx.fillRect(X+5+((i*5+j*3)%10), Y+7+((i*3+j*7)%13), 10, 8);
          cx.fillRect(X+23+((i*11+j*5)%13), Y+25+((i*7+j*2)%11), 8, 7);
        }
        cx.fillStyle='rgba(0,0,0,.10)'; cx.fillRect(X, Y, TAM, 4);
      }""")
# cerrar el save
cam("""        cx.beginPath(); cx.moveTo(bx+w/2,Y+TAM*0.18); cx.lineTo(bx+w,Y+TAM); cx.lineTo(bx+w*0.62,Y+TAM); cx.closePath(); cx.fill(); }
    }
  }
}""",
"""        cx.beginPath(); cx.moveTo(bx+w/2,Y+TAM*0.18); cx.lineTo(bx+w,Y+TAM); cx.lineTo(bx+w*0.62,Y+TAM); cx.closePath(); cx.fill(); }
    }
  }
  cx.restore();
}""")
open(H,'w',encoding='utf-8').write(s)
print('bloque 6 (piso con textura) puesto')

# ============================================================ 7. la cinematica
cam("""  <div id="fin" class="pant">""",
"""  <div id="cine" class="pant">
    <div id="cineFoto"></div>
    <div id="cinePie"></div>
    <div id="cinePuntos"></div>
    <button id="cineSalta" class="bt bt2" data-i18n="saltarCine"></button>
  </div>

  <div id="fin" class="pant">""")

cam("""  #cargando{ position:absolute; inset:0; z-index:60; display:flex; align-items:center;""",
"""  /* LA CINEMATICA. El dibujo ocupa todo y se mueve despacio: una foto quieta con texto abajo se
     lee a pantalla de carga, la misma foto con un acercamiento de ocho segundos se lee a plano. */
  /* overflow:hidden NO ES DECORACION. El acercamiento lleva la foto a scale(1.10), o sea 1032 px
     de ancho en un cuadro de 1024: sin recortar, ese sobrante hace la pagina desplazable, aparecen
     barras, y el cuadro de 16:9 deja de entrar en la ventana — el pie de la cinematica quedaba
     87 px por debajo del borde de abajo y no se veia. */
  #cine{ z-index:48; background:#05070c; padding:0; display:none; overflow:hidden; }
  #cine.ver{ display:block; }
  #cineFoto{ position:absolute; inset:0; background-position:center; background-size:cover;
    background-repeat:no-repeat; animation:acerca 9s linear both; }
  @keyframes acerca{ from{ transform:scale(1.00) translateX(0); } to{ transform:scale(1.10) translateX(-1.2%); } }
  #cine::after{ content:''; position:absolute; inset:0; pointer-events:none;
    background:linear-gradient(to bottom, rgba(5,7,12,.55) 0%, rgba(5,7,12,0) 26%,
      rgba(5,7,12,0) 44%, rgba(5,7,12,.86) 82%, rgba(5,7,12,.96) 100%); }
  #cinePie{ position:absolute; left:8%; right:8%; bottom:max(46px,calc(58px * var(--esc,1)));
    z-index:3; text-align:center; color:#f2e6cf; line-height:1.5;
    font-size:max(13px,calc(19px * var(--esc,1))); font-weight:700;
    text-shadow:2px 2px 0 #000, 0 0 18px rgba(0,0,0,.9); }
  #cinePuntos{ position:absolute; left:0; right:0; bottom:max(22px,calc(28px * var(--esc,1)));
    z-index:3; display:flex; gap:9px; justify-content:center; }
  #cinePuntos i{ width:max(7px,calc(9px * var(--esc,1))); height:max(7px,calc(9px * var(--esc,1)));
    background:#4b4383; box-shadow:0 0 0 2px #12102c; }
  #cinePuntos i.on{ background:#ffd23f; box-shadow:0 0 0 2px #12102c; }
  #cineSalta{ position:absolute; top:max(12px,calc(16px * var(--esc,1)));
    right:max(12px,calc(16px * var(--esc,1))); z-index:4; margin:0;
    padding:max(6px,calc(8px * var(--esc,1))) max(10px,calc(14px * var(--esc,1)));
    font-size:max(10px,calc(12px * var(--esc,1))); }
  #cargando{ position:absolute; inset:0; z-index:60; display:flex; align-items:center;""")

cam("  capasFondo:()=>{",
"""  cine:()=>({ k:cineK, hecha:cineHecha(), n:CINE_N, ver:document.getElementById('cine').classList.contains('ver'),
              voces:Object.keys(VOZ).length, tieneVoz:!!VOZ[IDIOMA+'1'] }),
  agachar:(v)=>{ tAba=!!v; return { tAba, agachado:jug.agachado, al:jug.al }; },
  jugAlto:()=>({ al:jug.al, agachado:jug.agachado, parado:AL_PARADO, agach:AL_AGACHADO }),
  arbolesT:()=>arbolesT.map(a=>[Math.round(a.x),Math.round(a.y),+a.e.toFixed(2)]),
  vidas2:()=>({ vidas:jug.vidas, paraVida, porVida:EST_X_VIDA, max:VIDAS_MAX, tomadas }),
  capasFondo:()=>{""", marca="  cine:()=>({ k:cineK")
cam("""/* ===================== GANCHOS DE PRUEBA ===================== */""",
"""/* ===================== LA CINEMATICA ===================== */
/* Cuatro dibujos, cuatro lineas y cuatro voces POR IDIOMA. La voz manda el tiempo: cada plano dura
   lo que dura la linea, no un numero fijo, porque en tres idiomas la misma frase dura distinto.
   Si el audio no arranca -telefono en silencio, autoplay bloqueado- hay un plazo de respaldo, si no
   la cinematica se queda clavada para siempre en el primer plano. */
const CINE_N=4, CINE_TOPE=9000;
let cineK=-1, cineAudio=null, cineReloj=null, cineAlSalir=null;
function cineHecha(){ try{ return localStorage.getItem('maicol_cine')==='1'; }catch(e){ return true; } }
function marcarCine(){ try{ localStorage.setItem('maicol_cine','1'); }catch(e){} }
function cineParar(){
  if(cineAudio){ try{ cineAudio.pause(); }catch(e){} cineAudio=null; }
  if(cineReloj){ clearTimeout(cineReloj); cineReloj=null; }
}
function cinePlano(k){
  cineParar();
  cineK=k;
  if(k>=CINE_N){ cerrarCine(); return; }
  const foto=document.getElementById('cineFoto');
  const im=IMG['cine'+(k+1)];
  foto.style.backgroundImage = im? 'url('+im.src+')' : 'none';
  foto.style.animation='none'; void foto.offsetWidth; foto.style.animation='';
  document.getElementById('cinePie').textContent=TX('cine'+(k+1));
  const p=document.getElementById('cinePuntos'); p.innerHTML='';
  for(let n=0;n<CINE_N;n++){ const i=document.createElement('i'); if(n<=k) i.className='on'; p.appendChild(i); }
  const d=VOZ[IDIOMA+(k+1)];
  if(d && AUD.on){
    try{
      const a=new Audio(d); a.volume=0.98; cineAudio=a;
      a.onended=()=>{ if(cineK===k) cinePlano(k+1); };
      a.play().catch(()=>{});
    }catch(e){}
  }
  cineReloj=setTimeout(()=>{ if(cineK===k) cinePlano(k+1); }, CINE_TOPE);
}
function abrirCine(alSalir){
  cineAlSalir=alSalir||null;
  document.getElementById('cine').classList.add('ver');
  cinePlano(0);
}
function cerrarCine(){
  cineParar(); cineK=-1; marcarCine();
  document.getElementById('cine').classList.remove('ver');
  const f=cineAlSalir; cineAlSalir=null;
  if(f) f();
}
(function armarCine(){
  const b=document.getElementById('cineSalta');
  const salir=()=>cerrarCine();
  b.addEventListener('click',e=>{ e.stopPropagation(); salir(); });
  b.addEventListener('touchstart',e=>{ e.preventDefault(); e.stopPropagation(); salir(); },{passive:false});
  const c=document.getElementById('cine');
  const seguir=()=>{ if(cineK>=0) cinePlano(cineK+1); };
  c.addEventListener('click',seguir);
  c.addEventListener('touchstart',e=>{ e.preventDefault(); seguir(); },{passive:false});
})();

/* ===================== GANCHOS DE PRUEBA ===================== */""")

# el boton en el menu y el disparo la primera vez
cam("""    <button id="jugar" class="bt" data-i18n="jugar"></button>""",
"""    <button id="jugar" class="bt" data-i18n="jugar"></button>
    <button id="verCuento" class="bt bt2" data-i18n="verCuento"></button>""",
    marca='id="verCuento"')
cam("""const bj=document.getElementById('jugar');""",
"""const bvc=document.getElementById('verCuento');
if(bvc){
  const vc=()=>{ audioIniciar(); abrirCine(null); };
  bvc.addEventListener('click',vc);
  bvc.addEventListener('touchstart',e=>{ e.preventDefault(); vc(); },{passive:false});
}
const bj=document.getElementById('jugar');""")
cam("""    const ir=()=>{ elegirIdioma(cod);
      const e=document.getElementById('idioma'); e.classList.add('ir');
      setTimeout(()=>{ e.style.display='none'; },400); };""",
"""    const ir=()=>{ elegirIdioma(cod);
      const e=document.getElementById('idioma'); e.classList.add('ir');
      setTimeout(()=>{ e.style.display='none';
        /* la primera vez la historia se cuenta sola: un juego que arranca en un menu sin decir
           quien es Maicol ni a quien va a buscar arranca sin motivo */
        if(!cineHecha()){ audioIniciar(); abrirCine(null); }
      },400); };""")

open(H,'w',encoding='utf-8').write(s)
print('bloque 7 (cinematica) puesto')

# ============================================================ 8. el menu con arte
cam("""  <div id="menu" class="pant">
    <div id="tit">MAICOL</div>""",
"""  <div id="menu" class="pant">
    <div id="arteMenu"></div>
    <div id="tit">MAICOL</div>""")
cam("""  #tit{ position:relative; z-index:2;""",
"""  /* EL ARTE DEL MENU. Va CON UN DEGRADE ENCIMA y no solo con opacidad: bajandole nada mas la
     opacidad el dibujo compite con el titulo en todo el cuadro y no se lee ninguno de los dos.
     Con el degrade el dibujo queda entero abajo -donde no hay texto- y se apaga hacia arriba. */
  #arteMenu{ position:absolute; inset:0; z-index:1; pointer-events:none;
    background-position:center bottom; background-size:cover; background-repeat:no-repeat;
    opacity:.92; image-rendering:auto;
    -webkit-mask-image:linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,.55) 26%, #000 62%, #000 100%);
    mask-image:linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,.55) 26%, #000 62%, #000 100%); }
  #menu .pantVelo{ position:absolute; inset:0; z-index:1; pointer-events:none;
    background:linear-gradient(to bottom, rgba(26,16,64,.62) 0%, rgba(26,16,64,.24) 42%, rgba(13,8,36,.32) 100%); }
  #tit{ position:relative; z-index:2;""")
cam("""    <div id="arteMenu"></div>""", """    <div id="arteMenu"></div>
    <div class="pantVelo"></div>""")
# los botones del menu, uno al lado del otro
cam("""  .bt2{ background:#3a2a86; color:#e6ecff;""",
    """  #menu .fila{ position:relative; z-index:2; display:flex; gap:clamp(8px,1.4vw,16px);
    align-items:center; justify-content:center; flex-wrap:wrap; }
  .bt2{ background:#3a2a86; color:#e6ecff;""", marca="#menu .fila{")
cam("""    <button id="jugar" class="bt" data-i18n="jugar"></button>
    <button id="verCuento" class="bt bt2" data-i18n="verCuento"></button>""",
"""    <div class="fila">
      <button id="jugar" class="bt" data-i18n="jugar"></button>
      <button id="verCuento" class="bt bt2" data-i18n="verCuento"></button>
    </div>""")

# ============================================================ 9. las voces y el arranque
cam("""cargarTodo(CARGA).then(()=>{
  const c=document.getElementById('cargando'); if(c) c.remove();
  pintarTeclas(); pintarNiveles();
  window.__listo=true;
});""",
"""cargarTodo(CARGA).then(()=>{
  const c=document.getElementById('cargando'); if(c) c.remove();
  pintarTeclas(); pintarNiveles();
  const am=document.getElementById('arteMenu');
  if(am && IMG.arte) am.style.backgroundImage='url('+IMG.arte.src+')';
  window.__listo=true;
});""")

open(H,'w',encoding='utf-8').write(s)
print('bloque 8-9 (menu con arte) puesto')

cam("""  #pie{ position:relative; z-index:2;
    font-size:max(9px,calc(10px * var(--esc,1))); letter-spacing:.20em; color:#6b7bb8;
    animation:parpadeo 1.6s steps(2) infinite; }""",
"""  /* el pie es el que cambia el idioma: sobre el arte del menu, un violeta apagado al 72% se
     borraba. Va con fondo propio, porque un boton que no se ve no es un boton. */
  #pie{ position:relative; z-index:2;
    font-size:max(9px,calc(10px * var(--esc,1))); letter-spacing:.20em; color:#c9d4f5;
    background:rgba(13,8,36,.78); padding:5px 12px; box-shadow:0 0 0 2px rgba(127,106,224,.55);
    animation:parpadeo 1.6s steps(2) infinite; }
  #cambiaIdioma{ color:#ffd23f; cursor:pointer; }""")
open(H,'w',encoding='utf-8').write(s)
print('pie legible puesto')

cam("""  #teclas{ position:absolute; left:calc(14px * var(--esc,1)); bottom:calc(14px * var(--esc,1));
    z-index:22; display:none; grid-template-columns:auto auto; gap:4px 9px; pointer-events:none; }""",
"""  /* CON FONDO PROPIO. Cuatro filas de texto gris al 60% encima de una textura de piedras no se
     leen: el ojo no separa la letra del fondo. Un panel oscuro atras y se lee de una. */
  #teclas{ position:absolute; left:calc(14px * var(--esc,1)); bottom:calc(14px * var(--esc,1));
    z-index:22; display:none; grid-template-columns:auto auto; gap:4px 9px; pointer-events:none;
    align-items:center; background:rgba(8,11,18,.58); padding:7px 10px; border-radius:7px; }""")
cam("  #teclas span{ font-size:max(9.5px,calc(10px * var(--esc,1))); font-weight:700; color:rgba(190,208,228,.6); }",
    "  #teclas span{ font-size:max(9.5px,calc(10px * var(--esc,1))); font-weight:700; color:rgba(214,228,244,.86); white-space:nowrap; }")
open(H,'w',encoding='utf-8').write(s)
print('teclas legibles')

cam("  const bs=document.getElementById('bSalto'); if(bs) bs.textContent=TX('bSalto');",
    "  const bs=document.getElementById('bSalto'); if(bs) bs.textContent=TX('bSalto');\n"
    "  const ba=document.getElementById('bAba');   if(ba) ba.textContent=TX('bAgachar');")
open(H,'w',encoding='utf-8').write(s)
print('texto del boton de agacharse')
