# -*- coding: utf-8 -*-
"""Le pone vida a Maicol: quieto de verdad, adornos en el suelo, capa de fondo con arboles
   que se mecen, pajaros que cruzan y hojas que caen. Idempotente."""
import sys, re
H=sys.argv[1]
s=open(H,encoding='utf-8').read()
def cambiar(a,b,n=1,marca=None):
    """marca: un pedazo del texto NUEVO que solo existe si el parche ya se puso. Hace falta
       cuando b CONTIENE a a: sin la marca el parche se aplica de nuevo y duplica la linea."""
    global s
    if (marca or b) in s and a not in s: print('  (ya estaba)'); return
    if marca and marca in s: print('  (ya estaba)'); return
    assert a in s, 'no encontre:\n'+a[:200]
    s=s.replace(a,b,n)

# ---------------------------------------------------------------- 1. la hoja del jugador
cambiar(
"""/* CATORCE CUADROS, no siete: ocho de caminar (el ciclo entero, contacto-bajo-pasada-alto por cada
   pierna), dos de quieto que respiran, uno agachado al aterrizar, uno de golpe, uno de salto y uno
   de caida. A 24 por segundo el ciclo de ocho da tres pasos por segundo corriendo, que es lo que
   camina una persona. */
let NCUADROS=14;
let CUA={ corre:[0,1,2,3,4,5,6,7], quieto:[8,9], agachado:10, golpe:11, salto:12, caida:13 };""",
"""/* DIECISEIS CUADROS: ocho de caminar (el ciclo entero, contacto-bajo-pasada-alto por cada pierna),
   CUATRO de quieto que respiran, uno agachado al aterrizar, uno de golpe, uno de salto y uno de
   caida. A 24 por segundo el ciclo de ocho da tres pasos por segundo corriendo, que es lo que
   camina una persona.
   TODOS LOS CUADROS MIDEN LO MISMO. Esto parece obvio y no lo es: cada tanda de dibujos viene con
   su propia escala, y si se recorta cada pose por separado el muneco CAMBIA DE PORTE segun lo que
   este haciendo. Se midio el ancho de la cabeza -que es una parte rigida y no se mueve con la
   pose- en los cuadros de contacto y se escalo todo lo demas para que de igual: parado quedo 118
   px de atlas contra 112 del contacto, o sea 5,8% mas alto, que es lo que mide una persona parada
   contra la misma persona en el apoyo de una zancada. Antes la diferencia era del 24%. */
let NCUADROS=16;
let CUA={ corre:[0,1,2,3,4,5,6,7], quieto:[8,9,10,11], agachado:12, golpe:13, salto:14, caida:15 };
/* la respiracion va y VUELVE: 8 pasos sobre 4 dibujos a 3,5 por segundo son 2,3 segundos de ciclo,
   que es lo que tarda una respiracion tranquila. Un bucle 0-1-2-3-0 daria un tiron al reiniciar. */
const RESPIRA=[0,1,2,3,3,2,1,0], RESPIRA_FPS=3.5;""")

# ---------------------------------------------------------------- 2. el cuadro de quieto
cambiar(
"    else cuadro = CUA.quieto[Math.floor(jug.anim*0.25)%CUA.quieto.length];",
"    else cuadro = CUA.quieto[RESPIRA[Math.floor(jug.quieto*RESPIRA_FPS)%RESPIRA.length]];")

# el reloj de la respiracion, aparte del de correr: si comparten reloj la respiracion se
# acelera cuando venis de correr y se ve a camara rapida
cambiar("            esX:1, esY:1, esV:0, anim:0 };",
        "            esX:1, esY:1, esV:0, anim:0, quieto:0 };")
cambiar("  } else { andando=0; jug.anim += dt*24*0.30; }",
        "  } else { andando=0; jug.anim += dt*24*0.30; }\n  jug.quieto = (Math.abs(jug.vx)>12 || !jug.piso)? 0 : jug.quieto+dt;")
cambiar("  jug.esX=1; jug.esY=1; jug.esV=0; jug.anim=0;",
        "  jug.esX=1; jug.esY=1; jug.esV=0; jug.anim=0; jug.quieto=0;")

open(H,'w',encoding='utf-8').write(s)
print('parche 1 (quieto) puesto')

# ---------------------------------------------------------------- 3. adornos y capas de fondo
BLOQUE = r"""
/* ===================== LO QUE ADORNA ===================== */
/* Un nivel con UNA foto atras y nada mas es un nivel de prueba. Lo que lo vuelve un lugar son tres
   capas que van a velocidades distintas: el fondo lejos casi quieto, una capa media, y COSAS
   APOYADAS EN EL PISO que pasan a la velocidad de la camara. Sin la tercera no hay profundidad,
   hay papel tapiz.
   Las hojas de adornos ya vienen escaladas al tamano que van a tener en el juego, asi que se
   dibujan a im.height y no hace falta una tabla de tamanos por objeto. */
const DECOS=['decobosque','decocueva','decofabrica'];
const HORIZONTE=ALTO*0.92;             // donde apoya la capa del medio
let adornos=[], arboles=[], pajaros=[], hojasV=[], motas=[];

/* Un azar CLAVADO. La decoracion tiene que salir IGUAL cada vez que se entra al nivel: si cambia
   al morir, el nivel se lee a otro nivel y se pierde la referencia de por donde se iba. */
function azar(n){
  n=(n*1103515245+12345)&0x7fffffff; n^=n>>>13; n=(n*1274126177)&0x7fffffff;
  return (n^(n>>>16))/0x7fffffff;
}

function ponerAdornos(){
  adornos.length=0;
  const ocupado=[];
  if(meta) ocupado.push(meta);
  for(const r of resortes) ocupado.push(r);
  for(const f of banderas) ocupado.push(f);
  ocupado.push({x:jug.x, y:jug.y});
  for(let j=0;j<MH;j++) for(let i=0;i<MW;i++){
    if(!solido(i,j) || solido(i,j-1)) continue;        // solo la cara que da al aire
    if(pinche(i,j-1)) continue;
    if(azar(nivel*7919 + i*131 + j*17) > 0.30) continue;
    const x=i*TAM + TAM/2 + (azar(i*977+j*13)-0.5)*TAM*0.44, y=j*TAM;
    if(ocupado.some(o=>Math.abs(o.x-x)<40 && Math.abs(o.y-y)<52)) continue;
    if(adornos.some(a=>Math.abs(a.x-x)<38 && a.y===y)) continue;
    adornos.push({ x:x, y:y, k:Math.floor(azar(nivel*104729 + i*31 + j*7)*6)%6,
                   m: azar(i*613+j*29)<0.5? 1 : -1 });
  }
}

function ponerFondo(){
  arboles.length=0; pajaros.length=0; hojasV.length=0; motas.length=0;
  const largo=MW*TAM;
  if(tema===0){
    for(let n=0; n*196 < largo*0.6+ANCHO*2; n++)
      arboles.push({ x:n*196 + azar(n*4231+nivel)*70, e:0.72+azar(n*911)*0.5,
                     f:azar(n*577)*6.28, v:0.55+azar(n*233)*0.5 });
    for(let n=0;n<5;n++)
      pajaros.push({ x:azar(n*331+nivel*7)*ANCHO*1.6, y:ALTO*(0.10+azar(n*77)*0.34),
                     v:26+azar(n*191)*26, f:azar(n*53)*6.28, d: azar(n*401)<0.5? 1 : -1 });
  } else {
    /* la cueva respira motas que flotan, la fabrica escupe chispas que suben */
    for(let n=0;n<34;n++)
      motas.push({ x:azar(n*137+nivel)*ANCHO, y:azar(n*277)*ALTO,
                   v:(tema===1? 5+azar(n*61)*9 : 16+azar(n*61)*24),
                   r:(tema===1? 1.2+azar(n*97)*2.0 : 1.0+azar(n*97)*1.6), f:azar(n*43)*6.28 });
  }
}

function pasoFondo(dt){
  const t=performance.now()/1000;
  for(const p of pajaros){
    p.x += p.v*p.d*dt; p.f += dt*(6.5+p.v*0.06);
    p.y += Math.sin(t*0.9+p.f*0.1)*7*dt;
    if(p.d>0 && p.x > ANCHO+320) { p.x=-260; p.y=ALTO*(0.08+Math.random()*0.36); }
    if(p.d<0 && p.x < -320)      { p.x=ANCHO+260; p.y=ALTO*(0.08+Math.random()*0.36); }
  }
  /* las hojas SALEN DE LOS ARBOLES, no del borde de la pantalla: una hoja que aparece en el aire
     de la nada se ve a particula; una que se despega de una copa se ve a arbol */
  if(tema===0 && arboles.length && hojasV.length<22 && Math.random() < dt*2.2){
    const a=arboles[Math.floor(Math.random()*arboles.length)];
    hojasV.push({ ax:a.x + (Math.random()-0.5)*130*a.e, y:HORIZONTE-190*a.e-Math.random()*40*a.e,
                  k:Math.floor(Math.random()*4), g:Math.random()*6.28,
                  vy:16+Math.random()*20, vg:1.1+Math.random()*1.7, am:14+Math.random()*22 });
  }
  for(let n=hojasV.length-1;n>=0;n--){
    const h=hojasV[n];
    h.y += h.vy*dt; h.g += h.vg*dt;
    if(h.y > HORIZONTE+18) hojasV.splice(n,1);
  }
  for(const m of motas){
    m.y -= m.v*dt; m.f += dt*1.7;
    if(m.y < -10){ m.y=ALTO+10; m.x=Math.random()*ANCHO; }
  }
}

function dibujarAdornos(){
  const im=IMG[DECOS[tema]]; if(!im) return;
  for(const a of adornos){
    const X=a.x-camX;
    if(X < -70 || X > ANCHO+70) continue;
    dibujarSprite(im, a.k, 6, X, a.y-camY, im.height, a.m);
  }
}
"""
if 'function ponerAdornos' not in s:
    i=s.index('/* ===================== DIBUJAR ===================== */')
    s=s[:i]+BLOQUE.strip()+'\n\n'+s[i:]
    print('bloque de adornos puesto')
else:
    print('  (bloque ya estaba)')

# ---------------------------------------------------------------- 4. el fondo con capas
VIEJO = """function dibujarFondo(){
  const im=IMG[FONDOS[tema]];
  const W=ANCHO, H=ALTO;
  if(im){
    /* parallax: el fondo se mueve a un tercio de la camara y se repite */
    const esc=H/im.height, an=im.width*esc;
    let off=(-camX*0.30)%an; if(off>0) off-=an;
    for(let x=off; x<W; x+=an) cx.drawImage(im, x, 0, an, H);
  } else { cx.fillStyle='#16202e'; cx.fillRect(0,0,W,H); }
  cx.fillStyle='rgba(10,13,20,0.22)'; cx.fillRect(0,0,W,H);
}"""
NUEVO = r"""function dibujarFondo(){
  const im=IMG[FONDOS[tema]];
  const W=ANCHO, H=ALTO, t=performance.now()/1000;
  if(im){
    /* la capa LEJOS: se mueve a un tercio de la camara y se repite */
    const esc=H/im.height, an=im.width*esc;
    let off=(-camX*0.30)%an; if(off>0) off-=an;
    for(let x=off; x<W; x+=an) cx.drawImage(im, x, 0, an, H);
  } else { cx.fillStyle='#16202e'; cx.fillRect(0,0,W,H); }
  cx.fillStyle='rgba(10,13,20,0.22)'; cx.fillRect(0,0,W,H);

  /* la capa DEL MEDIO, a 0,55: es la que da la profundidad. La de lejos sola no alcanza porque
     al no tener nada a media distancia el ojo no tiene con que comparar y el fondo se lee a
     telon pintado. */
  const base=HORIZONTE - camY*0.55;
  if(tema===0){
    const arb=IMG.arbol;
    if(arb) for(const a of arboles){
      const X=a.x - camX*0.55;
      if(X < -180 || X > W+180) continue;
      const alto=arb.height*a.e, an=arb.width*a.e;
      /* el meneo es un SESGO desde la base, no una rotacion entera: un arbol no se despega del
         suelo para inclinarse, se dobla, y la copa se mueve mucho mas que el tronco */
      const k=Math.sin(t*a.v + a.f)*0.030 + Math.sin(t*a.v*2.3 + a.f*1.7)*0.010;
      cx.save();
      cx.translate(Math.round(X), Math.round(base));
      cx.transform(1,0,k,1,0,0);
      cx.globalAlpha=0.90;
      cx.drawImage(arb, -an/2, -alto, an, alto);
      cx.restore();
    }
    cx.globalAlpha=1;
    const paj=IMG.pajaro;
    if(paj) for(const p of pajaros){
      const c=Math.floor(p.f)%3;
      cx.save(); cx.translate(Math.round(p.x), Math.round(p.y - camY*0.22));
      if(p.d<0) cx.scale(-1,1);
      cx.globalAlpha=0.85;
      const cw=paj.width/3;
      cx.drawImage(paj, c*cw, 0, cw, paj.height, -cw/2, -paj.height/2, cw, paj.height);
      cx.restore();
    }
    cx.globalAlpha=1;
    const hj=IMG.hoja;
    if(hj) for(const h of hojasV){
      const X=h.ax - camX*0.55 + Math.sin(h.g)*h.am;
      if(X < -30 || X > W+30) continue;
      const cw=hj.width/4;
      cx.save(); cx.translate(Math.round(X), Math.round(h.y - camY*0.55));
      cx.rotate(h.g*0.9);
      cx.scale(Math.cos(h.g*1.3)<0? -1:1, 1);       // la hoja gira y muestra el envés
      cx.drawImage(hj, h.k*cw, 0, cw, hj.height, -cw/2, -hj.height/2, cw, hj.height);
      cx.restore();
    }
  } else {
    /* la cueva y la fabrica no tienen arboles, pero SI tienen que tener capa del medio: se arma
       con los mismos adornos, oscurecidos, que es como se hace una silueta sin pedir dibujos nuevos */
    const im2=IMG[DECOS[tema]];
    if(im2){
      const cw=im2.width/6, sil=(tema===1? [2,4,2,5,4,2] : [0,1,4,2,1,0]);
      cx.save(); cx.globalAlpha=0.42;
      for(let n=0;n<26;n++){
        const X=n*168 + (n%3)*37 - ((camX*0.55)%(26*168));
        const e=1.5+((n*7)%5)*0.35;
        const c=sil[n%6];
        if(X < -200 || X > W+200) continue;
        cx.drawImage(im2, c*cw, 0, cw, im2.height,
                     X-cw*e/2, base-im2.height*e, cw*e, im2.height*e);
      }
      cx.restore();
    }
    cx.save();
    for(const m of motas){
      const b=0.35+0.45*Math.abs(Math.sin(m.f));
      cx.fillStyle = tema===1? 'rgba(150,220,255,'+b.toFixed(2)+')'
                             : 'rgba(255,168,80,'+b.toFixed(2)+')';
      cx.beginPath(); cx.arc(m.x, m.y, m.r, 0, 6.284); cx.fill();
    }
    cx.restore();
  }
  cx.fillStyle='rgba(10,13,20,0.16)'; cx.fillRect(0,0,W,H);
}"""
cambiar(VIEJO, NUEVO)

# ---------------------------------------------------------------- 5. engancharlo
cambiar("  dibujarFondo();\n  dibujarCasillas();",
        "  dibujarFondo();\n  dibujarCasillas();\n  dibujarAdornos();", marca="  dibujarAdornos();")
cambiar("  document.body.classList.add('jugando');\n  pintarHUD();",
        "  ponerAdornos(); ponerFondo();\n  document.body.classList.add('jugando');\n  pintarHUD();",
        marca="  ponerAdornos(); ponerFondo();")
cambiar("  if(jugando && !pausa){\n    pasoMoviles(dt);",
        "  if(jugando && !pausa){\n    pasoFondo(dt);\n    pasoMoviles(dt);", marca="    pasoFondo(dt);")

open(H,'w',encoding='utf-8').write(s)
print('parche 2 (adornos y fondo) puesto')

# ---------------------------------------------------------------- 6. ganchos para medir
if 'adornos:()=>' not in s:
    cambiar("  pintar:()=>{ dibujar(); return true; },",
            """  pintar:()=>{ dibujar(); return true; },
  adornos:()=>({ n:adornos.length, tipos:adornos.reduce((o,a)=>{o[a.k]=(o[a.k]||0)+1;return o;},{}),
                 xs:adornos.slice(0,6).map(a=>[Math.round(a.x),Math.round(a.y),a.k]) }),
  fondo:()=>({ tema, arboles:arboles.length, pajaros:pajaros.map(p=>[Math.round(p.x),Math.round(p.y),Math.floor(p.f)%3]),
               hojas:hojasV.length, motas:motas.length, horizonte:HORIZONTE }),
  correrFondo:(n)=>{ for(let k=0;k<(n||60);k++) pasoFondo(1/60); return { hojas:hojasV.length, pajaros:pajaros.map(p=>Math.round(p.x)) }; },
  cuadroJug:()=>{ let c; if(jug.muerto>0||jug.invul>0.9) c=CUA.golpe;
    else if(!jug.piso) c = jug.vy<0? CUA.salto : CUA.caida;
    else if(jug.esY<0.90) c=CUA.agachado;
    else if(Math.abs(jug.vx)>12) c=CUA.corre[Math.floor(jug.anim)%CUA.corre.length];
    else c=CUA.quieto[RESPIRA[Math.floor(jug.quieto*RESPIRA_FPS)%RESPIRA.length]];
    return { cuadro:c, quieto:+jug.quieto.toFixed(2), anim:+jug.anim.toFixed(2), n:NCUADROS }; },""")
    open(H,'w',encoding='utf-8').write(s)
    print('ganchos puestos')
else:
    print('  (ganchos ya estaban)')
