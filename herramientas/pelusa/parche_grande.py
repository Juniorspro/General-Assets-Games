# -*- coding: utf-8 -*-
"""
Pelusa, segunda vuelta. Pedido: "mas pelo y fisicas mejores fondos parallax tambien mas enemigos
niveles mapas etc etc etc y mejor menu we y una historia que aparece siempre al inicio, musica
tranquilizadora sonidos tranquilos todo hermoso".

IDEMPOTENTE. La regla del guardia es la de siempre y es una sola: si el texto NUEVO ya esta, no se
toca. Nada de "y el viejo no esta": cuando el nuevo CONTIENE al viejo -que es el caso normal, porque
casi siempre se agrega alrededor de lo que habia- ese guardia no salta y el parche se aplica dos
veces.
"""
import io, sys, os

RUTA = os.path.join(os.path.dirname(__file__), '..', '..', 'juegos-pc', 'Pelusa.html')
RUTA = os.path.normpath(RUTA)
s = io.open(RUTA, encoding='utf8').read()
ANTES = len(s)
hechos, saltados = 0, 0

def cam(a, b):
    """cambio obligatorio: si no esta ni el viejo ni el nuevo, es que el archivo cambio y hay que enterarse"""
    global s, hechos, saltados
    if b in s:
        saltados += 1
        return
    if a not in s:
        raise SystemExit('NO ENCONTRADO:\n' + a[:200])
    s = s.replace(a, b, 1)
    hechos += 1

def camx(a, b):
    """cambio opcional: el resultado no deja marca buscable, asi que la ausencia del viejo alcanza"""
    global s, hechos, saltados
    if a not in s:
        saltados += 1
        return
    s = s.replace(a, b, 1)
    hechos += 1

# =========================================================================================
# 1. CSS
# =========================================================================================
cam(
"""  .pan{ position:absolute; inset:0; z-index:20; display:none; flex-direction:column;
    align-items:center; justify-content:center; gap:calc(14px * var(--esc));
    background:var(--papel); padding:24px; text-align:center; }""",
"""  /* LOS PANELES SON TRANSLUCIDOS A PROPOSITO. Con el papel opaco encima, el fondo de capas se
     apagaba justo en la pantalla donde el jugador pasa mas tiempo mirando, y un menu sin nada
     moviendose detras se lee a formulario. Translucido, el mismo parallax que hay en el juego sigue
     corriendo debajo del menu, y la pelusa flota ahi con su pelo de verdad. */
  .pan{ position:absolute; inset:0; z-index:20; display:none; flex-direction:column;
    align-items:center; justify-content:center; gap:calc(14px * var(--esc));
    background:rgba(247,246,243,0.87); padding:24px; text-align:center; }
  /* SIN backdrop-filter A PROPOSITO. Lo tenia y desenfocaba TODO lo de atras, la pelusa incluida:
     el unico personaje del juego se veia como una mancha. El velo solo ya separa el texto del
     fondo, y el fondo de capas ya esta al 45% de opacidad, que es su propio desenfoque. */
  #pIdioma, #pHistoria{ background:rgba(247,246,243,0.94); }""")

cam(
"""  #gMundos{ display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px;
    width:min(560px,92%); }""",
"""  #gMundos{ display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:12px;
    width:min(560px,92%); max-height:74vh; overflow-y:auto; padding:2px; }
  @media (min-width:720px){ #gMundos{ grid-template-columns:repeat(4,minmax(0,1fr));
    width:min(880px,94%); } }""")

cam(
"""  #idBotones{ display:flex; gap:9px; flex-wrap:wrap; justify-content:center; }""",
"""  #idBotones{ display:flex; gap:9px; flex-wrap:wrap; justify-content:center; }

  /* ===================== LA HISTORIA =====================
     Cinco planos dibujados en un lienzo aparte. No hay una sola foto en todo el juego y no la va a
     haber: lo que da el tono es la MISMA tinta con la que se dibuja el juego, asi que la historia
     tiene que estar hecha con lo mismo o se lee pegada encima. */
  /* EL LIENZO SE ENCOGE POR LOS DOS LADOS. Con el ancho fijo y el alto libre, en una ventana baja
     -que es como se ve un telefono acostado, y como se ve media notebook- el plano ocupaba 300 px de
     los 460 y el texto y el boton se salian del panel. Un elemento reemplazado con max-width Y
     max-height respeta la proporcion solo, asi que el plano se achica entero en vez de deformarse. */
  #hL{ max-width:min(560px,94%); max-height:46vh; width:auto; height:auto; display:block; }
  #hT{ font-size:max(13px,calc(15px * var(--esc))); font-weight:300; letter-spacing:.10em;
    line-height:1.8; width:min(520px,92%); min-height:4.4em; color:var(--tinta); }
  #hP{ display:flex; gap:6px; }
  #hP b{ width:20px; height:2px; border-radius:9px; background:var(--humo2); display:block;
    transition:.3s ease; }
  #hP b.hay{ background:var(--tinta); width:30px; }""")

# =========================================================================================
# 2. HTML
# =========================================================================================
cam(
"""  <div id="pMenu" class="pan">
    <div class="tit">PELUSA</div>
    <div class="sub" data-i18n="sub"></div>
    <div style="height:6px"></div>
    <button class="bot lleno" id="bJugar" data-i18n="jugar"></button>
    <div class="fila">
      <button class="bot" id="bMundos" data-i18n="mundos"></button>
      <button class="bot" id="bIdioma" data-i18n="idioma"></button>
    </div>
    <div id="creditos">REZONA</div>
  </div>""",
"""  <div id="pHistoria" class="pan">
    <canvas id="hL" width="1040" height="470"></canvas>
    <div id="hT"></div>
    <div id="hP"></div>
    <button class="bot" id="hSaltar" data-i18n="saltar"></button>
  </div>

  <div id="pMenu" class="pan">
    <div class="tit">PELUSA</div>
    <div class="sub" data-i18n="sub"></div>
    <div style="height:6px"></div>
    <button class="bot lleno" id="bJugar" data-i18n="jugar"></button>
    <div class="fila">
      <button class="bot" id="bMundos" data-i18n="mundos"></button>
      <button class="bot" id="bCuento" data-i18n="cuento"></button>
      <button class="bot" id="bIdioma" data-i18n="idioma"></button>
    </div>
    <div id="creditos">REZONA</div>
  </div>""")

# =========================================================================================
# 3. IDIOMAS
# =========================================================================================
cam(
""" m6:{en:'ALL AT ONCE', es:'TODO JUNTO', pt:'TUDO JUNTO'},""",
""" m6:{en:'ALL AT ONCE', es:'TODO JUNTO', pt:'TUDO JUNTO'},
 m7:{en:'THE LONG WAY', es:'EL CAMINO LARGO', pt:'O CAMINHO LONGO'},
 m8:{en:'THE LAST WHITE', es:'EL ÚLTIMO BLANCO', pt:'O ÚLTIMO BRANCO'},
 saltar:{en:'SKIP', es:'SALTAR', pt:'PULAR'},
 cuento:{en:'STORY', es:'HISTORIA', pt:'HISTÓRIA'},
 h1:{en:'There was a small fluff at the bottom of everything, and everything above it was white.',
     es:'Había una pelusa chiquita en el fondo de todo, y todo lo que había encima era blanco.',
     pt:'Havia uma pelúcia pequenina no fundo de tudo, e tudo acima dela era branco.'},
 h2:{en:'A road of quiet points went up through that white, one hop at a time.',
     es:'Un camino de puntos callados subía por ese blanco, de un salto por vez.',
     pt:'Um caminho de pontos calados subia por esse branco, um salto de cada vez.'},
 h3:{en:'Around each point, thorns had learned to spin. They never stop, and they never hurry.',
     es:'Alrededor de cada punto, unas espinas aprendieron a girar. No paran nunca, y nunca se apuran.',
     pt:'Em volta de cada ponto, espinhos aprenderam a girar. Nunca param, e nunca têm pressa.'},
 h4:{en:'The fluff could not fly, or fight, or go back. It could only wait, and let go at the right moment.',
     es:'La pelusa no podía volar, ni pelear, ni volver. Sólo podía esperar y soltarse en el momento justo.',
     pt:'A pelúcia não podia voar, nem lutar, nem voltar. Só podia esperar e se soltar no momento certo.'},
 h5:{en:'It is still going up. This is that climb — take all the time you want.',
     es:'Todavía está subiendo. Esta es esa subida — tomate todo el tiempo que quieras.',
     pt:'Ela ainda está subindo. Esta é essa subida — leve o tempo que quiser.'},""")

cam(
""" finS:{en:'six worlds, one hundred and twenty hops', es:'seis mundos, ciento veinte saltos', pt:'seis mundos, cento e vinte saltos'},""",
""" finS:{en:'eight worlds, one hundred and sixty hops', es:'ocho mundos, ciento sesenta saltos', pt:'oito mundos, cento e sessenta saltos'},""")

# =========================================================================================
# 4. EL FONDO DE CAPAS
# =========================================================================================
cam(
"""let U=40;                     // pixeles por unidad
function px(x){ return W/2 + x*U; }""",
"""let U=40;                     // pixeles por unidad
function px(x){ return W/2 + x*U; }

/* ===================== EL FONDO DE CAPAS =====================
   Cuatro capas a cuatro velocidades. Con UNA sola capa quieta detras, subir doce metros y subir uno
   se ven igual: no hay nada respecto de lo cual moverse, y entonces la pelusa no sube, la pantalla
   se desliza. Con cuatro, cada salto produce PARALAJE y eso es lo unico que da distancia en 2D.

   Y SE REPITE POR MODULO, no se genera sin fin. Un nivel del mundo 8 son 40 unidades de alto; una
   lista de discos que no se repita nunca serian cientos de objetos por nivel para algo que esta al
   4% de opacidad. Con la vuelta por modulo sobre 42 unidades -mas alto que la pantalla, que ve
   unas 18- la costura nunca cae adentro del cuadro. */
const FONDO_ALTO=42;
/* LAS OPACIDADES SE BAJARON DESPUES DE MIRAR UNA FOTO DEL JUEGO, no antes. Con 0,55 y 0,62 los
   discos lentos competian con la linea de puntos -que es el enunciado del nivel- y el cuadro se
   leia a burbujas. Un fondo tiene que poder taparse con el pulgar sin que se note que falta algo. */
const CAPAS=[{v:0.045,n:7, r:[1.50,3.00],forma:'disco',a:0.40},
             {v:0.130,n:12,r:[0.90,2.10],forma:'aro',  a:0.46},
             {v:0.300,n:17,r:[0.42,1.05],forma:'aro',  a:0.40},
             {v:0.560,n:24,r:[0.05,0.15],forma:'mota', a:0.34}];
/* un par de grises por mundo: el fondo cambia de temperatura y no de color. Un mundo verde y otro
   naranja en un juego que se llama "lo blanco" seria otro juego. */
const TINTE=[['#DCE0DE','#CBD3D0'],
             ['#DCE3E1','#C9D5D2'],
             ['#E2DCE6','#D0C7D7'],
             ['#E4DED4','#D5CCBD'],
             ['#D6E0E6','#C3D1DA'],
             ['#E6DED9','#D8CBC4'],
             ['#DCE0D6','#CAD1C1'],
             ['#E0DAE2','#CDC5D1'],
             ['#DAD8D4','#C5C2BC']];
let fondo=null, fondoMundo=0;
function armarFondo(m){
  if(fondo && fondoMundo===m) return;
  fondoMundo=m; fondo=[];
  const R=rng(m*7717+331), ancho=MEDIO_MIN*2.7;
  for(const C of CAPAS){
    const it=[];
    for(let i=0;i<C.n;i++)
      it.push({ x:(R()*2-1)*ancho, y:R()*FONDO_ALTO, r:C.r[0]+R()*(C.r[1]-C.r[0]),
                f:R()*Math.PI*2, w:0.08+R()*0.22 });
    fondo.push(it);
  }
}
function dibujarFondo(){
  if(!fondo) armarFondo(1);
  const g=cx, T=TINTE[Math.max(0,Math.min(TINTE.length-1, fondoMundo))];
  for(let c=0;c<CAPAS.length;c++){
    const C=CAPAS[c], base=camY*C.v, col=(c<2)? T[0] : T[1];
    g.strokeStyle=col; g.fillStyle=col; g.globalAlpha=C.a;
    g.lineWidth=Math.max(1, U*0.014);
    for(const o of fondo[c]){
      let yy=((o.y-base)%FONDO_ALTO+FONDO_ALTO)%FONDO_ALTO;
      if(yy>FONDO_ALTO*0.62) yy-=FONDO_ALTO;
      const Y=H*0.76 - yy*U;
      const r=o.r*U;
      if(Y<-r-40||Y>H+r+40) continue;
      const X=px(o.x) + Math.sin(tiempo*o.w+o.f)*U*C.v*0.55;
      g.beginPath(); g.arc(X,Y,r,0,7);
      if(C.forma==='aro') g.stroke(); else g.fill();
    }
  }
  g.globalAlpha=1;
}""")

# =========================================================================================
# 5. LOS ROTORES: CINCO FORMAS, UNA SOLA CUENTA
# =========================================================================================
cam(
"""function rotorPos(ro, nodo, t, sal){
  const a=rotorAng(ro,t), r=rotorRad(ro,t);
  sal.x = nodo.x + Math.cos(a)*r;
  sal.y = nodo.y + Math.sin(a)*r;
  return sal;
}""",
"""function rotorPos(ro, nodo, t, sal){
  const a=rotorAng(ro,t), r=rotorRad(ro,t);
  sal.x = nodo.x + Math.cos(a)*r;
  sal.y = nodo.y + Math.sin(a)*r;
  return sal;
}

/* ---------- LAS CINCO FORMAS ----------
   bola      · la de siempre
   doble     · la misma bola y su antipoda: el hueco pasa a ser medio anillo y no uno entero
   barra     · una helice de dos brazos que NO llega al centro (si llegara, aterrizar en el nodo
               seria chocar SIEMPRE, porque el nodo es el centro de giro)
   satelite  · una bola con una luna chica dando vueltas encima, mas rapido
   cometa    · la bola con tres bolitas de cola pegadas atras sobre la misma orbita

   TODAS PASAN POR chocaRotor Y POR NADA MAS. El validador que decide si un nivel se puede pasar y
   el choque de verdad llaman a esta misma funcion: si fueran dos cuentas, el validador estaria
   aprobando un juego que no existe. Es la razon por la que se puede afirmar que los 160 niveles se
   pasan sin jugarlos a mano. */
const R_BARRA=0.22, BARRA_IN=0.86, R_LUNA=0.20, R_COLA=0.34;
function d2Seg(x,y,ax,ay,bx,by){
  const dx=bx-ax, dy=by-ay, L2=dx*dx+dy*dy||1e-9;
  let u=((x-ax)*dx+(y-ay)*dy)/L2; u=u<0?0:(u>1?1:u);
  const fx=x-(ax+dx*u), fy=y-(ay+dy*u);
  return fx*fx+fy*fy;
}
function chocaRotor(ro, nodo, t, x, y, rad){
  const a=rotorAng(ro,t), rr=rotorRad(ro,t), cs=Math.cos(a), sn=Math.sin(a);
  if(ro.forma==='barra'){
    const l2=(rad+R_BARRA)*(rad+R_BARRA), ex=cs*rr, ey=sn*rr,
          ix=cs*BARRA_IN, iy=sn*BARRA_IN;
    if(d2Seg(x,y, nodo.x+ix, nodo.y+iy, nodo.x+ex, nodo.y+ey) < l2) return true;
    if(d2Seg(x,y, nodo.x-ix, nodo.y-iy, nodo.x-ex, nodo.y-ey) < l2) return true;
    return false;
  }
  const lim=(rad+R_ESP)*(rad+R_ESP);
  const bx=nodo.x+cs*rr, by=nodo.y+sn*rr;
  let dx=x-bx, dy=y-by;
  if(dx*dx+dy*dy<lim) return true;
  if(ro.forma==='doble'){
    dx=x-(nodo.x-cs*rr); dy=y-(nodo.y-sn*rr);
    if(dx*dx+dy*dy<lim) return true;
  } else if(ro.forma==='satelite'){
    const la=a*3.4+ro.fase, l2=(rad+R_LUNA)*(rad+R_LUNA);
    dx=x-(bx+Math.cos(la)*R_ESP*1.55); dy=y-(by+Math.sin(la)*R_ESP*1.55);
    if(dx*dx+dy*dy<l2) return true;
  } else if(ro.forma==='cometa'){
    const sg=(ro.w<0)? 1 : -1;
    for(let i=1;i<=3;i++){
      const aa=a+sg*i*0.30, rc=R_COLA*(1-i*0.18), l2=(rad+rc)*(rad+rc);
      dx=x-(nodo.x+Math.cos(aa)*rr); dy=y-(nodo.y+Math.sin(aa)*rr);
      if(dx*dx+dy*dy<l2) return true;
    }
  }
  return false;
}""")

# =========================================================================================
# 6. EL GENERADOR: 8 MUNDOS, CUATRO TRAZADOS, CINCO FORMAS
# =========================================================================================
cam(
"""const MUNDOS=6, NIVELES=20;
function generar(mundo, nivel){
  const R=rng(mundo*1009 + nivel*7919 + 1013);
  const d=(nivel-1)/(NIVELES-1);                    // 0..1 dentro del mundo
  const saltos=Math.min(10, 2 + Math.round(d*3) + Math.floor(mundo/2));
  const nodos=[{x:0, y:0}];
  for(let k=0;k<saltos;k++){
    const sep=SEP_MIN + R()*(SEP_MAX-SEP_MIN);
    /* el zigzag: nunca dos veces para el mismo lado seguido, y nunca tan al costado que la columna
       se salga del papel */
    let dx=(R()*2-1)*(BANDA*1.55);
    const ant=nodos[nodos.length-1];
    if(Math.abs(ant.x+dx)>BANDA) dx=-dx*0.6;
    const nx=Math.max(-BANDA, Math.min(BANDA, ant.x+dx));
    const dy=Math.sqrt(Math.max(0.6, sep*sep - (nx-ant.x)*(nx-ant.x)));
    nodos.push({x:nx, y:ant.y+dy});
  }
  const anillos=[];
  for(let k=1;k<nodos.length;k++) anillos.push(anilloDe(R, mundo, d, k));
  const niv={ mundo, nivel, nodos, anillos, ventanas:[] };
  ajustarDificultad(niv, mundo, d, R);
  return niv;
}""",
"""const MUNDOS=8, NIVELES=20;

/* ---------- EL TRAZADO ----------
   Cuatro formas de camino, y el mundo no elige una: eligen el mundo Y el nivel juntos, asi que
   dentro de un mundo los veinte no se parecen entre si. Un mundo entero de zigzag son veinte
   niveles que se sienten uno. */
const TRAZADOS=['zigzag','ancho','columna','espiral'];
/* la forma que ESTRENA cada mundo, declarada y no deducida. Sacandola de la lista de formas del
   mundo salian cuatro iconos iguales del 5 al 8, porque los cuatro terminan en la helice: el icono
   dejaba de ser noticia justo en la mitad del juego donde mas noticias hay. */
const ICONO_FORMA=['bola','bola','bola','doble','doble','barra','barra','satelite','cometa'];
function caminoDe(forma, R, saltos){
  const nodos=[{x:0,y:0}];
  let lado = R()<0.5? -1 : 1;
  for(let k=0;k<saltos;k++){
    const ant=nodos[nodos.length-1];
    let sep=SEP_MIN + R()*(SEP_MAX-SEP_MIN), nx;
    if(forma==='ancho'){ lado=-lado; nx=lado*(BANDA*(0.74+R()*0.26)); }
    else if(forma==='columna'){ nx=Math.max(-BANDA, Math.min(BANDA, ant.x+(R()*2-1)*0.80));
                                sep*=0.86; }
    else if(forma==='espiral'){ nx=Math.sin((k+1)*1.15+R()*0.22)*BANDA*0.92; }
    else { let dx=(R()*2-1)*(BANDA*1.55);
           if(Math.abs(ant.x+dx)>BANDA) dx=-dx*0.6;
           nx=Math.max(-BANDA, Math.min(BANDA, ant.x+dx)); }
    /* SIEMPRE SE SUBE. Con un salto casi horizontal la camara no acompana y el nivel se lee a
       pasillo; el paso de costado se paga alargando la separacion, no achatando la subida. */
    const hor=Math.abs(nx-ant.x);
    if(sep < hor+2.2) sep = hor+2.2;
    const dy=Math.sqrt(Math.max(0.6, sep*sep - hor*hor));
    nodos.push({x:nx, y:ant.y+dy});
  }
  return nodos;
}

function generar(mundo, nivel){
  const R=rng(mundo*1009 + nivel*7919 + 1013);
  const d=(nivel-1)/(NIVELES-1);                    // 0..1 dentro del mundo
  const saltos=Math.min(11, 2 + Math.round(d*3) + Math.floor(mundo/2));
  const nodos=caminoDe(TRAZADOS[(mundo+nivel)%4], R, saltos);
  const anillos=[];
  for(let k=1;k<nodos.length;k++) anillos.push(anilloDe(R, mundo, d, k));
  const niv={ mundo, nivel, trazado:TRAZADOS[(mundo+nivel)%4], nodos, anillos, ventanas:[] };
  ajustarDificultad(niv, mundo, d, R);
  return niv;
}""")

cam(
"""function anilloDe(R, mundo, d, k){
  const cuantos = 1 + ((mundo>=2 && d>0.25)?1:0) + ((mundo>=4 && d>0.55)?1:0) + ((mundo>=6 && d>0.8)?1:0);
  const base = 1.55 + mundo*0.20 + d*0.85;
  const ro=[];
  for(let i=0;i<Math.min(3,cuantos);i++){
    let r = ORB_MIN + (ORB_MAX-ORB_MIN)*((mundo>=3)? ((i%2)? 0.92 : 0.14) + R()*0.08 : R());
    let tipo='fijo', amp=0, pa=0, pw=0;
    if(mundo>=4 && (i===0) && d>0.3){ tipo='vaiven'; amp=1.1+R()*1.5; }
    if(mundo>=5 && (i===(cuantos>1?1:0)) && d>0.2){ tipo='pulso'; pa=0.28+R()*0.3; pw=0.9+R()*1.1; }
    const w = (base*(0.82+R()*0.42)) * ((i%2)? -1 : 1);
    ro.push({ r, w, fase:R()*Math.PI*2, tipo, amp, pa, pw });
  }
  return ro;
}""",
"""/* que formas se ha visto ya cada mundo. Se agregan de a UNA y nunca en el nivel 1: la forma nueva
   aparece cuando el jugador ya entendio el mundo, no cuando entra. */
const FORMAS_MUNDO=[['bola'],
  ['bola'],                                          // 1
  ['bola'],                                          // 2
  ['bola','doble'],                                  // 3
  ['bola','doble'],                                  // 4
  ['bola','doble','barra'],                          // 5
  ['bola','doble','barra'],                          // 6
  ['bola','satelite','cometa','barra'],              // 7
  ['bola','doble','satelite','cometa','barra']];     // 8
function formaDe(R, mundo, d, i){
  const P=FORMAS_MUNDO[Math.max(0,Math.min(FORMAS_MUNDO.length-1,mundo))];
  if(P.length===1 || d<0.18) return 'bola';
  return P[Math.floor(R()*P.length)];
}

function anilloDe(R, mundo, d, k){
  const cuantos = 1 + ((mundo>=2 && d>0.25)?1:0) + ((mundo>=4 && d>0.55)?1:0) + ((mundo>=6 && d>0.7)?1:0);
  const base = 1.55 + mundo*0.17 + d*0.85;
  const ro=[];
  for(let i=0;i<Math.min(3,cuantos);i++){
    let r = ORB_MIN + (ORB_MAX-ORB_MIN)*((mundo>=3)? ((i%2)? 0.92 : 0.14) + R()*0.08 : R());
    let tipo='fijo', amp=0, pa=0, pw=0;
    const forma=formaDe(R, mundo, d, i);
    /* la helice necesita orbita larga: sus brazos arrancan a 0,86 del centro y un brazo mas corto
       que eso no existe */
    if(forma==='barra') r=Math.max(r, 1.62);
    if(mundo>=4 && (i===0) && d>0.3){ tipo='vaiven'; amp=1.1+R()*1.5; }
    if(mundo>=5 && (i===(cuantos>1?1:0)) && d>0.2 && forma!=='barra'){
      tipo='pulso'; pa=0.28+R()*0.3; pw=0.9+R()*1.1;
      /* EL PULSO NO PUEDE COMERSE EL NODO. Si el radio minimo baja de 1,05 la bola pasa por encima
         del punto de llegada y aterrizar seria chocar siempre, gire como gire: el nivel quedaria
         imposible y el ajuste de dificultad -que solo toca la velocidad- no lo podria arreglar. */
      pa=Math.min(pa, Math.max(0, r-1.05));
      if(pa<0.05) tipo='fijo';
    }
    const w = (base*(0.82+R()*0.42)) * ((i%2)? -1 : 1);
    ro.push({ r, w, fase:R()*Math.PI*2, tipo, amp, pa, pw, forma });
  }
  return ro;
}""")

# =========================================================================================
# 7. EL VALIDADOR usa chocaRotor
# =========================================================================================
cam(
"""const BARRIDO=4.0, PASO_BARRIDO=1/120, PASO_VUELO=1/300;
function velDe(mundo){ return 8.6 + mundo*0.55; }

function seguro(nodoA, nodoB, anillo, t0, vel){
  const dx=nodoB.x-nodoA.x, dy=nodoB.y-nodoA.y;
  const largo=Math.hypot(dx,dy), ux=dx/largo, uy=dy/largo;
  const T=largo/vel, lim=(RP+R_ESP)*(RP+R_ESP);
  const p={x:0,y:0};
  for(let t=0;t<=T;t+=PASO_VUELO){
    const x=nodoA.x+ux*vel*t, y=nodoA.y+uy*vel*t;
    for(const ro of anillo){
      rotorPos(ro, nodoB, t0+t, p);
      const ex=x-p.x, ey=y-p.y;
      if(ex*ex+ey*ey < lim) return false;
    }
  }
  return true;
}""",
"""/* El barrido y el paso de vuelo son un presupuesto, no un gusto: con ocho mundos, cinco formas y
   hasta once saltos, generar un nivel es lo que tarda en cargar. PASO_VUELO=1/220 sigue siendo casi
   cuatro veces mas fino que los 60 cuadros por segundo a los que corre el juego de verdad, o sea que
   el validador ve MAS que el jugador: si el se salva, el jugador se salva. El error va para el lado
   seguro por construccion. */
const BARRIDO=3.6, PASO_BARRIDO=1/96, PASO_VUELO=1/220;
function velDe(mundo){ return 8.6 + mundo*0.42; }

function seguro(nodoA, nodoB, anillo, t0, vel){
  const dx=nodoB.x-nodoA.x, dy=nodoB.y-nodoA.y;
  const largo=Math.hypot(dx,dy), ux=dx/largo, uy=dy/largo;
  const T=largo/vel;
  for(let t=0;t<=T;t+=PASO_VUELO){
    const x=nodoA.x+ux*vel*t, y=nodoA.y+uy*vel*t;
    for(const ro of anillo) if(chocaRotor(ro, nodoB, t0+t, x, y, RP)) return false;
  }
  return true;
}""")

cam(
"""function ventanaMinima(mundo, d){ return Math.max(0.090, 0.30 - mundo*0.026 - d*0.045); }""",
"""function ventanaMinima(mundo, d){ return Math.max(0.090, 0.30 - mundo*0.021 - d*0.040); }""")

cam(
"""    while(v.mejor<min && intentos++<14){""",
"""    while(v.mejor<min && intentos++<12){""")
cam(
"""    while(v.fraccion>0.82 && ap++<10){""",
"""    while(v.fraccion>0.82 && ap++<7){""")

# =========================================================================================
# 8. EL PELO
# =========================================================================================
cam(
"""const PELOS=62, PELO_N=3, PELO_LARGO=0.105;
const pelusa={
  x:0, y:0, vx:0, vy:0, en:0, viajando:false, t:0, T:0, ax:0, ay:0, bx:0, by:0,
  ang:0, sq:0, sqv:0, pelo:[], mira:0, guiño:0, sacude:0
};
function armarPelo(){
  pelusa.pelo.length=0;
  for(let i=0;i<PELOS;i++){
    const a=(i/PELOS)*Math.PI*2 + (i%2)*0.06;
    const p=[];
    for(let k=0;k<=PELO_N;k++){
      const rr=RP + k*PELO_LARGO;
      p.push({ x:pelusa.x+Math.cos(a)*rr, y:pelusa.y+Math.sin(a)*rr, px:0, py:0, init:false });
    }
    pelusa.pelo.push({ a, p, largo:PELO_LARGO*(0.72+((i*37)%13)/13*0.6) });
  }
}
const PELO_G=-2.1, PELO_RIG=0.34;""",
"""/* MAS PELO Y MAS ARTICULADO: 118 mechones de cuatro tramos contra 62 de tres. El numero importa
   por una razon concreta: con 62 mechones sobre un circulo de 0,42 hay un mechon cada 6 grados y en
   el contorno se cuentan las cerdas de a una; con 118 el borde deja de ser un peine y pasa a ser
   pelusa, que es la palabra del titulo. Y con cuatro tramos el mechon puede formar una S -raiz
   tiesa, medio que sigue, punta que se atrasa- que con tres no entra. */
const PELOS=118, PELO_N=4, PELO_LARGO=0.082;
const GROSORES=[0.70,1.00,1.36];
const pelusa={
  x:0, y:0, vx:0, vy:0, ux:0, uy:0, en:0, viajando:false, t:0, T:0, ax:0, ay:0, bx:0, by:0,
  ang:0, sq:0, sqv:0, pelo:[], mira:0, parpadeo:2.0, sacude:0
};
function armarPelo(){
  pelusa.pelo.length=0;
  for(let i=0;i<PELOS;i++){
    const a=(i/PELOS)*Math.PI*2 + ((i*7)%5)*0.012;
    const p=[];
    for(let k=0;k<=PELO_N;k++){
      const rr=RP + k*PELO_LARGO;
      p.push({ x:pelusa.x+Math.cos(a)*rr, y:pelusa.y+Math.sin(a)*rr, px:0, py:0, init:false });
    }
    pelusa.pelo.push({ a, p, largo:PELO_LARGO*(0.70+((i*37)%17)/17*0.66), gr:i%3 });
  }
}
const PELO_G=-2.0, PELO_RIG=0.30, PELO_ROCE=0.885;""")

cam(
"""function peloTick(dt){
  for(const m of pelusa.pelo){
    const ang=m.a+pelusa.ang, cs=Math.cos(ang), sn=Math.sin(ang);
    const base=m.p[0];
    base.x = pelusa.x + cs*RP;
    base.y = pelusa.y + sn*RP;
    for(let k=1;k<m.p.length;k++){
      const q=m.p[k];
      if(!q.init){ q.px=q.x; q.py=q.y; q.init=true; }
      const vx=(q.x-q.px)*0.86, vy=(q.y-q.py)*0.86;
      q.px=q.x; q.py=q.y;
      q.x+=vx; q.y+=vy + PELO_G*dt*dt;
    }""",
"""function peloTick(dt){
  /* DOS COSAS NUEVAS Y LAS DOS SALEN DE LA VELOCIDAD DEL CUERPO.
     1. VIENTO: el aire empuja al pelo para atras mientras la pelusa avanza. Sin esto el mechon solo
        se atrasa por inercia, y la inercia se agota en dos cuadros: el latigo dura un pestaneo y
        despues el pelo va tieso a 12 unidades por segundo, que es exactamente lo que no hace el pelo.
     2. LA RIGIDEZ AFLOJA CON LA VELOCIDAD: quieta, la pelusa es un cardo -las cerdas salen derechas-;
        disparada, se peina sola hacia atras. Es la misma cerda con menos ganas de volver. */
  const vel=Math.hypot(pelusa.vx,pelusa.vy);
  const wx=-pelusa.vx*0.010, wy=-pelusa.vy*0.010;
  const blando=1-Math.min(0.55, vel*0.055);
  for(const m of pelusa.pelo){
    const ang=m.a+pelusa.ang, cs=Math.cos(ang), sn=Math.sin(ang);
    const base=m.p[0];
    base.x = pelusa.x + cs*RP;
    base.y = pelusa.y + sn*RP;
    for(let k=1;k<m.p.length;k++){
      const q=m.p[k];
      if(!q.init){ q.px=q.x; q.py=q.y; q.init=true; }
      const vx=(q.x-q.px)*PELO_ROCE, vy=(q.y-q.py)*PELO_ROCE;
      q.px=q.x; q.py=q.y;
      q.x+=vx+wx*dt*60*0.016; q.y+=vy+wy*dt*60*0.016 + PELO_G*dt*dt;
    }""")

cam(
"""      for(let k=1;k<m.p.length;k++){
        const q=m.p[k], rr=RP + k*m.largo;
        const ox=pelusa.x + cs*rr, oy=pelusa.y + sn*rr;
        const rig=PELO_RIG/k;
        q.x += (ox-q.x)*rig; q.y += (oy-q.y)*rig;
      }""",
"""      for(let k=1;k<m.p.length;k++){
        const q=m.p[k], rr=RP + k*m.largo;
        const ox=pelusa.x + cs*rr, oy=pelusa.y + sn*rr;
        const rig=(PELO_RIG/k)*blando;
        q.x += (ox-q.x)*rig; q.y += (oy-q.y)*rig;
      }""")

# el dibujo del pelo: trazo afinado y en tres tandas
cam(
"""  /* el pelo, un trazo por mechon */
  g.strokeStyle='rgba(36,36,43,0.80)'; g.lineWidth=Math.max(1.0,U*0.022); g.lineCap='round';
  g.beginPath();
  for(const m of pelusa.pelo){
    const p=m.p;
    g.moveTo(px(p[0].x),py(p[0].y));
    for(let k=1;k<p.length;k++) g.lineTo(px(p[k].x),py(p[k].y));
  }
  g.stroke();""",
"""  /* EL PELO, EN TRES TANDAS Y CON CURVA.
     Tres grosores, porque 118 cerdas del mismo ancho se leen a rayado de lapiz; y curva de Bezier
     por tramo, porque una polilinea de cuatro segmentos en un mechon de 25 pixeles muestra los tres
     codos y el pelo queda de alambre. Van agrupadas por grosor para que sean TRES trazos por cuadro
     y no 118: cada stroke() es una orden de dibujo, y 118 por cuadro a 60 por segundo son siete mil
     ordenes por segundo para lo mismo. */
  g.strokeStyle='rgba(36,36,43,0.78)'; g.lineCap='round'; g.lineJoin='round';
  for(let gi=0; gi<GROSORES.length; gi++){
    g.lineWidth=Math.max(0.7, U*0.019*GROSORES[gi]);
    g.beginPath();
    for(const m of pelusa.pelo){
      if(m.gr!==gi) continue;
      const p=m.p, n=p.length;
      g.moveTo(px(p[0].x),py(p[0].y));
      for(let k=1;k<n-1;k++){
        const X=px(p[k].x), Y=py(p[k].y);
        g.quadraticCurveTo(X, Y, (X+px(p[k+1].x))/2, (Y+py(p[k+1].y))/2);
      }
      g.lineTo(px(p[n-1].x),py(p[n-1].y));
    }
    g.stroke();
  }""")

# ojos que parpadean
cam(
"""  const oj=RP*U*0.30, se=RP*U*0.34;
  for(const sg of [-1,1]){
    g.beginPath();
    g.arc(sg*se + mx*oj*0.5, -my*oj*0.5, RP*U*0.15, 0, 7);
    g.fillStyle='#F7F6F3'; g.fill();
  }
  g.restore();""",
"""  const oj=RP*U*0.30, se=RP*U*0.34;
  /* el parpadeo: el ojo se aplasta, no se apaga. Apagarlo lee a error de dibujo */
  const cerr = pelusa.parpadeo<0.11? Math.max(0.10, Math.abs(pelusa.parpadeo-0.055)/0.055) : 1;
  g.fillStyle='#F7F6F3';
  for(const sg of [-1,1]){
    g.beginPath();
    g.ellipse(sg*se + mx*oj*0.5, -my*oj*0.5, RP*U*0.15, RP*U*0.15*cerr, 0, 0, 7);
    g.fill();
  }
  g.restore();""")

# =========================================================================================
# 9. EL BUCLE: velocidad del cuerpo, parpadeo, choque por chocaRotor, menu vivo
# =========================================================================================
cam(
"""      const B=nivel.nodos[pelusa.en+1], an=nivel.anillos[pelusa.en];
      const lim=(RP+R_ESP)*(RP+R_ESP), p={x:0,y:0};
      if(an) for(const ro of an){
        if(ro.duerme) continue;
        rotorPos(ro, B, tiempo, p);
        const ex=pelusa.x-p.x, ey=pelusa.y-p.y;
        if(ex*ex+ey*ey<lim){ chocar(); break; }
      }""",
"""      const B=nivel.nodos[pelusa.en+1], an=nivel.anillos[pelusa.en];
      if(an) for(const ro of an){
        if(ro.duerme) continue;
        if(chocaRotor(ro, B, tiempo, pelusa.x, pelusa.y, RP)){ chocar(); break; }
      }""")

cam(
"""  camY += (camObj-camY)*Math.min(1, dt*3.4);
  peloTick(dt);""",
"""  /* EN EL MENU LA PELUSA SIGUE VIVA. No es adorno: el pelo es fisica, y la unica forma de que se
     vea que lo es antes de tocar nada es que este flotando ahi, respirando, con las cerdas
     cayendo de verdad. */
  if(pant!=='juego' && pant!=='historia'){
    camObj=0; camY += (0-camY)*Math.min(1, dt*3.0);
    pelusa.x = Math.sin(tiempo*0.55)*0.30;
    /* abajo del todo y no en el medio: en el medio queda justo detras de los botones y no se ve */
    pelusa.y = camY - 0.058*H/Math.max(1,U) + Math.sin(tiempo*1.15)*0.16;
  } else camY += (camObj-camY)*Math.min(1, dt*3.4);

  pelusa.parpadeo-=dt; if(pelusa.parpadeo<-0.02) pelusa.parpadeo=2.2+Math.random()*3.4;

  /* la velocidad del cuerpo, medida y no supuesta: el vuelo es una interpolacion, asi que la unica
     forma honesta de saber a que velocidad va es restar la posicion del cuadro anterior */
  pelusa.vx=(pelusa.x-pelusa.ux)/Math.max(1e-4,dt);
  pelusa.vy=(pelusa.y-pelusa.uy)/Math.max(1e-4,dt);
  pelusa.ux=pelusa.x; pelusa.uy=pelusa.y;
  peloTick(dt);
  musicaTick(dt);
  if(pant==='historia'){ histT+=dt; if(histT>=HIST_DUR) histPasar(1); }""")

# =========================================================================================
# 10. EL DIBUJO: fondo siempre, nivel solo en juego
# =========================================================================================
cam(
"""  g.fillStyle='#F7F6F3'; g.fillRect(0,0,W,H);
  if(sacudon>0){ g.translate((Math.random()*2-1)*sacudon*9, (Math.random()*2-1)*sacudon*9); }
  if(!nivel){ return; }""",
"""  g.fillStyle='#F7F6F3'; g.fillRect(0,0,W,H);
  if(sacudon>0){ g.translate((Math.random()*2-1)*sacudon*9, (Math.random()*2-1)*sacudon*9); }
  dibujarFondo();
  if(pant==='historia'){ histDibujar(); return; }
  if(pant!=='juego'){
    /* EN EL MENU LA PELUSA VA AGRANDADA, y se agranda con una transformacion del lienzo y no con un
       radio distinto: asi el pelo, la sombra y los ojos crecen todos juntos y con el mismo grosor de
       trazo relativo. A la escala del juego mide once pixeles de radio en un telefono, o sea que en
       el menu -donde es lo unico que hay que mirar- seria una mosca. */
    const X=px(pelusa.x), Y=py(pelusa.y), k=Math.max(1.7, Math.min(3.0, H/260));
    g.save(); g.translate(X,Y); g.scale(k,k); g.translate(-X,-Y);
    dibujarPelusa(); g.restore(); return;
  }
  if(!nivel){ return; }""")

# las formas dibujadas
cam(
"""      const rr=rotorRad(ro, tiempo);
      /* la orbita: un circulo finisimo. Sin el, la bola aparece de la nada y no se puede prever */
      g.beginPath(); g.arc(px(nodo.x),Y,rr*U,0,7);
      g.strokeStyle='rgba(217,105,90,'+(0.16*alfa).toFixed(3)+')'; g.lineWidth=1; g.stroke();
      rotorPos(ro, nodo, tiempo, p);
      dibujarEspinosa(px(p.x), py(p.y), U, rotorAng(ro,tiempo)*1.6, alfa);""",
"""      const rr=rotorRad(ro, tiempo), a=rotorAng(ro, tiempo);
      /* la orbita: un circulo finisimo. Sin el, la bola aparece de la nada y no se puede prever */
      g.beginPath(); g.arc(px(nodo.x),Y,rr*U,0,7);
      g.strokeStyle='rgba(217,105,90,'+(0.16*alfa).toFixed(3)+')'; g.lineWidth=1; g.stroke();
      const cs=Math.cos(a), sn=Math.sin(a), NX=px(nodo.x);
      if(ro.forma==='barra'){
        g.strokeStyle='rgba(217,105,90,'+(0.92*alfa).toFixed(3)+')';
        g.lineWidth=Math.max(2, R_BARRA*2*U); g.lineCap='round';
        g.beginPath();
        g.moveTo(NX+cs*BARRA_IN*U, Y-sn*BARRA_IN*U); g.lineTo(NX+cs*rr*U, Y-sn*rr*U);
        g.moveTo(NX-cs*BARRA_IN*U, Y+sn*BARRA_IN*U); g.lineTo(NX-cs*rr*U, Y+sn*rr*U);
        g.stroke();
        for(const sg of [1,-1]){
          g.beginPath(); g.arc(NX+sg*cs*rr*U, Y-sg*sn*rr*U, R_BARRA*1.35*U, 0, 7);
          g.fillStyle='rgba(217,105,90,'+(0.95*alfa).toFixed(3)+')'; g.fill();
        }
      } else {
        rotorPos(ro, nodo, tiempo, p);
        const BX=px(p.x), BY=py(p.y);
        if(ro.forma==='cometa'){
          const sg=(ro.w<0)? 1 : -1;
          for(let i=3;i>=1;i--){
            const aa=a+sg*i*0.30, rc=R_COLA*(1-i*0.18);
            g.beginPath(); g.arc(NX+Math.cos(aa)*rr*U, Y-Math.sin(aa)*rr*U, rc*0.62*U, 0, 7);
            g.fillStyle='rgba(217,105,90,'+((0.30+0.16*(3-i))*alfa).toFixed(3)+')'; g.fill();
          }
        }
        dibujarEspinosa(BX, BY, U, a*1.6, alfa);
        if(ro.forma==='doble') dibujarEspinosa(px(2*nodo.x-p.x), py(2*nodo.y-p.y), U, a*1.6+1.1, alfa);
        if(ro.forma==='satelite'){
          const la=a*3.4+ro.fase;
          g.beginPath(); g.arc(BX+Math.cos(la)*R_ESP*1.55*U, BY-Math.sin(la)*R_ESP*1.55*U, R_LUNA*U, 0, 7);
          g.fillStyle='rgba(217,105,90,'+(0.90*alfa).toFixed(3)+')'; g.fill();
          g.beginPath(); g.arc(BX,BY,R_ESP*1.55*U,0,7);
          g.strokeStyle='rgba(217,105,90,'+(0.13*alfa).toFixed(3)+')'; g.lineWidth=1; g.stroke();
        }
      }""")

# =========================================================================================
# 11. LA HISTORIA
# =========================================================================================
cam(
"""/* ===================== EL TUTORIAL =====================""",
"""/* ===================== LA HISTORIA =====================
   Cinco planos, siempre al arrancar, y salteable en un toque. POR QUE SIEMPRE: el juego no dice una
   sola palabra mientras se juega -no hay reloj, ni puntaje, ni texto- y sin la historia lo unico que
   el jugador sabe es que hay una bolita y unas espinas. Treinta segundos de cuento son la unica
   parte del juego que explica para que.
   Y esta DIBUJADA, no fotografiada: la misma tinta y el mismo color de peligro que el juego. Una
   foto pegada arriba de un juego de dos colores se ve pegada arriba. */
const HIST=['h1','h2','h3','h4','h5'], HIST_DUR=6.4;
let histI=0, histT=0;
function histVer(){ histI=0; histT=0; histPintar(); verPantalla('historia'); }
function histPasar(n){
  histI+=n; histT=0;
  if(histI>=HIST.length){ verPantalla('menu'); return; }
  histPintar(); son('toque');
}
function histPintar(){
  const t=document.getElementById('hT'); if(t) t.textContent=TX(HIST[histI]);
  const p=document.getElementById('hP');
  if(p){ p.innerHTML=''; for(let i=0;i<HIST.length;i++){ const b=document.createElement('b');
    if(i===histI) b.className='hay'; p.appendChild(b); } }
}
/* una pelusa de adorno, con el pelo dibujado a mano: la del juego vive en unidades de mundo y aca
   hace falta una en pixeles, a cualquier tamano */
function peluchito(g,X,Y,r,t,n){
  g.save(); g.translate(X,Y);
  g.strokeStyle='rgba(36,36,43,0.72)'; g.lineWidth=Math.max(1,r*0.085); g.lineCap='round';
  g.beginPath();
  const N=n||40;
  for(let i=0;i<N;i++){
    const a=i/N*Math.PI*2, l=r*(1.30+0.26*Math.sin(i*2.7+t*1.5));
    g.moveTo(Math.cos(a)*r*0.95, Math.sin(a)*r*0.95);
    g.lineTo(Math.cos(a)*l, Math.sin(a)*l + Math.sin(t*1.2+i)*r*0.05);
  }
  g.stroke();
  g.beginPath(); g.arc(0,0,r,0,7); g.fillStyle='#24242B'; g.fill();
  g.fillStyle='#F7F6F3';
  g.beginPath(); g.arc(-r*0.33,-r*0.08,r*0.15,0,7); g.fill();
  g.beginPath(); g.arc( r*0.33,-r*0.08,r*0.15,0,7); g.fill();
  g.restore();
}
function histEspina(g,X,Y,r,giro){
  g.save(); g.translate(X,Y); g.rotate(giro);
  g.strokeStyle='rgba(217,105,90,0.92)'; g.lineWidth=Math.max(1.2,r*0.26); g.lineCap='round';
  g.beginPath();
  for(let i=0;i<8;i++){ const a=i/8*Math.PI*2;
    g.moveTo(Math.cos(a)*r*0.86, Math.sin(a)*r*0.86);
    g.lineTo(Math.cos(a)*r*1.75, Math.sin(a)*r*1.75); }
  g.stroke();
  g.beginPath(); g.arc(0,0,r,0,7); g.fillStyle='#D9695A'; g.fill();
  g.restore();
}
function histDibujar(){
  const cv=document.getElementById('hL'); if(!cv) return;
  const g=cv.getContext('2d'), w=cv.width, h=cv.height, t=tiempo, f=Math.min(1,histT/0.7);
  g.setTransform(1,0,0,1,0,0);
  g.clearRect(0,0,w,h);
  g.globalAlpha=f;
  const R=rng(4321+histI*97);
  if(histI===0){
    /* sola en el fondo de todo, y todo lo de arriba vacio */
    g.fillStyle='rgba(36,36,43,0.055)';
    for(let i=0;i<70;i++){ const x=R()*w, y=R()*h*0.86, r=2+R()*9;
      g.beginPath(); g.arc(x,y,r,0,7); g.fill(); }
    peluchito(g, w*0.5, h*0.78, 34, t);
  } else if(histI===1){
    /* el camino de puntos, subiendo */
    let x=w*0.5, y=h*0.94;
    const pts=[];
    for(let k=0;k<6;k++){ pts.push([x,y]); x=w*0.5+Math.sin(k*1.25)*w*0.26; y-=h*0.155; }
    g.strokeStyle='rgba(36,36,43,0.30)'; g.lineWidth=2.6; g.setLineDash([7,11]);
    g.beginPath(); g.moveTo(pts[0][0],pts[0][1]);
    for(const q of pts) g.lineTo(q[0],q[1]);
    g.stroke(); g.setLineDash([]);
    for(let i=0;i<pts.length;i++){
      g.beginPath(); g.arc(pts[i][0],pts[i][1], i===pts.length-1? 20:15, 0, 7);
      g.fillStyle='#FFFFFF'; g.fill();
      g.lineWidth=2.4; g.strokeStyle= i===pts.length-1? 'rgba(127,178,162,0.95)':'rgba(36,36,43,0.28)';
      g.stroke();
    }
    peluchito(g, pts[0][0], pts[0][1], 26, t);
  } else if(histI===2){
    /* las espinas, girando alrededor de tres puntos */
    for(let k=0;k<3;k++){
      const X=w*(0.22+k*0.28), Y=h*(0.32+((k%2)?0.34:0)), rr=62+k*15;
      g.beginPath(); g.arc(X,Y,rr,0,7);
      g.strokeStyle='rgba(217,105,90,0.18)'; g.lineWidth=1.4; g.stroke();
      g.beginPath(); g.arc(X,Y,14,0,7); g.fillStyle='#FFFFFF'; g.fill();
      g.lineWidth=2.2; g.strokeStyle='rgba(36,36,43,0.25)'; g.stroke();
      const a=t*(0.7+k*0.35)*(k%2?-1:1);
      histEspina(g, X+Math.cos(a)*rr, Y+Math.sin(a)*rr, 15, a*1.6);
      if(k===1) histEspina(g, X-Math.cos(a)*rr, Y-Math.sin(a)*rr, 15, a*1.6+1.1);
    }
  } else if(histI===3){
    /* soltarse: la pelusa a mitad de camino y el pelo tirado para atras */
    const A=[w*0.20,h*0.86], B=[w*0.78,h*0.22];
    g.strokeStyle='rgba(36,36,43,0.28)'; g.lineWidth=2.6; g.setLineDash([7,11]);
    g.beginPath(); g.moveTo(A[0],A[1]); g.lineTo(B[0],B[1]); g.stroke(); g.setLineDash([]);
    g.beginPath(); g.arc(B[0],B[1],20,0,7); g.fillStyle='#FFFFFF'; g.fill();
    g.lineWidth=2.4; g.strokeStyle='rgba(217,105,90,0.30)'; g.stroke();
    const a=t*1.25;
    g.beginPath(); g.arc(B[0],B[1],58,0,7); g.strokeStyle='rgba(217,105,90,0.18)'; g.lineWidth=1.4; g.stroke();
    histEspina(g, B[0]+Math.cos(a)*58, B[1]+Math.sin(a)*58, 13, a*1.6);
    const u=0.42+Math.sin(t*0.8)*0.06;
    const X=A[0]+(B[0]-A[0])*u, Y=A[1]+(B[1]-A[1])*u;
    g.strokeStyle='rgba(36,36,43,0.13)'; g.lineWidth=2;
    for(let i=0;i<7;i++){ g.beginPath();
      g.moveTo(X-(B[0]-A[0])*0.03*i, Y-(B[1]-A[1])*0.03*i);
      g.lineTo(X-(B[0]-A[0])*0.05*i, Y-(B[1]-A[1])*0.05*i); g.stroke(); }
    peluchito(g, X, Y, 29, t);
  } else {
    /* todavia subiendo: el ultimo punto, en calma */
    g.fillStyle='rgba(36,36,43,0.05)';
    for(let i=0;i<48;i++){ const x=R()*w, y=R()*h, r=2+R()*7;
      g.beginPath(); g.arc(x,y,r,0,7); g.fill(); }
    const X=w*0.5, Y=h*0.40;
    for(let i=3;i>=1;i--){ g.beginPath();
      g.arc(X, Y, 34+i*30+Math.sin(t*0.9-i*0.6)*8, 0, 7);
      g.strokeStyle='rgba(127,178,162,'+(0.30/i).toFixed(3)+')'; g.lineWidth=2; g.stroke(); }
    g.beginPath(); g.arc(X,Y,24,0,7); g.fillStyle='#FFFFFF'; g.fill();
    g.lineWidth=2.6; g.strokeStyle='rgba(127,178,162,0.95)'; g.stroke();
    g.beginPath(); g.arc(X,Y,10,0,7); g.fillStyle='rgba(127,178,162,0.85)'; g.fill();
    peluchito(g, X, h*0.80, 31, t);
  }
  g.globalAlpha=1;
}

/* ===================== EL TUTORIAL =====================""")

# =========================================================================================
# 12. LA MUSICA
# =========================================================================================
cam(
"""const PENTA=[0,2,4,7,9,12,14,16,19,21,24];""",
"""/* ===================== LA MUSICA =====================
   Un acorde que no termina nunca. No hay compas, no hay tambor y no hay melodia: cuatro senos en
   fundamental, quinta, octava y novena, cada uno DOBLADO y desafinado un 0,23 por mil respecto de su
   gemelo. Ese desajuste minusculo es todo el truco: dos senos identicos suenan a tono de prueba de
   audio, y dos que baten cada pocos segundos suenan a instrumento.
   Encima, un filtro pasabajos que se abre y se cierra a 0,055 Hz -una vuelta cada dieciocho
   segundos- que es lo que hace que respire en vez de zumbar.
   Y el volumen es 0,052, o sea la mitad de lo que suena una nota del juego: la musica tiene que
   quedar POR DEBAJO del sonido de llegar a un punto, porque llegar a un punto es la recompensa. */
const MUS_VOL=0.052;
const RAIZ_MUNDO=[0,0,-2,3,5,-4,2,7,-5];
const MUS={ voces:[], g:null, filtro:null, raiz:0, t:0, prox:5 };
function musicaIniciar(){
  if(!AUD.ctx || MUS.g) return;
  const ctx=AUD.ctx;
  const g=ctx.createGain(); g.gain.value=0.0001;
  const f=ctx.createBiquadFilter(); f.type='lowpass'; f.frequency.value=520; f.Q.value=0.55;
  g.connect(f); f.connect(AUD.maestro);
  const lfo=ctx.createOscillator(); lfo.type='sine'; lfo.frequency.value=0.055;
  const lg=ctx.createGain(); lg.gain.value=210;
  lfo.connect(lg); lg.connect(f.frequency); lfo.start();
  let i=0;
  for(const s of [0,7,12,19]) for(const dd of [1, 1.0023]){
    const o=ctx.createOscillator(); o.type='sine';
    o.frequency.value=130.81*Math.pow(2,s/12)*dd;
    const og=ctx.createGain(); og.gain.value=0.26/(1+i*0.14);
    o.connect(og); og.connect(g); o.start();
    MUS.voces.push({o, s, dd}); i++;
  }
  /* cuatro segundos y medio de entrada. Que la musica APAREZCA se nota; que empiece, no. */
  g.gain.setValueAtTime(0.0001, ctx.currentTime);
  g.gain.linearRampToValueAtTime(MUS_VOL, ctx.currentTime+4.5);
  MUS.g=g; MUS.filtro=f;
}
function musicaVol(v){
  if(!MUS.g||!AUD.ctx) return;
  MUS.g.gain.cancelScheduledValues(AUD.ctx.currentTime);
  MUS.g.gain.setValueAtTime(Math.max(0.0001,MUS.g.gain.value), AUD.ctx.currentTime);
  MUS.g.gain.linearRampToValueAtTime(Math.max(0.0001,v), AUD.ctx.currentTime+0.8);
}
/* CADA MUNDO CAMBIA DE RAIZ Y NO DE TEMA. Ocho temas distintos en un juego de tranquilidad son ocho
   cortes; la misma tela transportada se siente otro lugar sin que nada se corte. Y el traslado tarda
   tres segundos, asi que no hay un instante en el que suene el salto de tono. */
function musicaMundo(m){
  if(!MUS.g||!AUD.ctx) return;
  const r=RAIZ_MUNDO[Math.max(0,Math.min(RAIZ_MUNDO.length-1,m))];
  if(r===MUS.raiz) return;
  MUS.raiz=r;
  const t=AUD.ctx.currentTime;
  for(const v of MUS.voces)
    v.o.frequency.linearRampToValueAtTime(130.81*Math.pow(2,(v.s+r)/12)*v.dd, t+3.0);
}
function musicaTick(dt){
  if(!MUS.g||!AUD.on) return;
  MUS.t+=dt;
  if(MUS.t>=MUS.prox){
    MUS.t=0; MUS.prox=4.5+Math.random()*6.5;
    nota(PENTA[Math.floor(Math.random()*7)]+MUS.raiz+12, 3.0, 0.028);
  }
}

const PENTA=[0,2,4,7,9,12,14,16,19,21,24];""")

cam(
"""  AUD.maestro=m; AUD.seco=seco; AUD.envio=env;
}""",
"""  AUD.maestro=m; AUD.seco=seco; AUD.envio=env;
  musicaIniciar();
}""")

cam(
"""document.getElementById('son').onclick=(e)=>{ e.stopPropagation(); AUD.on=!AUD.on;
  document.getElementById('son').classList.toggle('mudo', !AUD.on); };""",
"""document.getElementById('son').onclick=(e)=>{ e.stopPropagation(); AUD.on=!AUD.on;
  musicaVol(AUD.on? MUS_VOL : 0);
  document.getElementById('son').classList.toggle('mudo', !AUD.on); };""")

# =========================================================================================
# 13. FLUJO: historia al arrancar, fondo y musica por mundo
# =========================================================================================
cam(
"""    b.onclick=()=>{ audioIniciar(); elegirIdioma(cod); verPantalla('menu'); };""",
"""    b.onclick=()=>{ audioIniciar(); elegirIdioma(cod);
                    if(vioHistoria) verPantalla('menu'); else { vioHistoria=true; histVer(); } };""")

cam(
"""function cargarNivel(m,n){
  mundoAct=m; nivelAct=n;
  nivel=generar(m,n);""",
"""let vioHistoria=false;
function cargarNivel(m,n){
  mundoAct=m; nivelAct=n;
  armarFondo(m); musicaMundo(m);
  nivel=generar(m,n);""")

cam(
"""document.getElementById('bMundos').onclick=()=>{ pintarMundos(); verPantalla('mundos'); };""",
"""document.getElementById('bMundos').onclick=()=>{ pintarMundos(); verPantalla('mundos'); };
document.getElementById('bCuento').onclick=()=>{ audioIniciar(); histVer(); };
document.getElementById('hSaltar').onclick=(e)=>{ e.stopPropagation(); verPantalla('menu'); };""")

cam(
"""  for(const [id,n] of [['pIdioma','idioma'],['pMenu','menu'],['pMundos','mundos'],
                       ['pNiveles','niveles'],['pFin','fin']])""",
"""  for(const [id,n] of [['pIdioma','idioma'],['pHistoria','historia'],['pMenu','menu'],
                       ['pMundos','mundos'],['pNiveles','niveles'],['pFin','fin']])""")

cam(
"""function tocar(e){
  if(pant!=='juego') return;
  if(e && e.target && e.target.closest && e.target.closest('button')) return;
  audioIniciar();
  saltar();
}""",
"""function tocar(e){
  if(e && e.target && e.target.closest && e.target.closest('button')) return;
  if(pant==='historia'){ audioIniciar(); histPasar(1); return; }
  if(pant!=='juego') return;
  audioIniciar();
  saltar();
}""")

cam(
"""  if(e.key===' '||e.key==='Enter'){ e.preventDefault(); tocar(null); }""",
"""  if(e.key===' '||e.key==='Enter'){ e.preventDefault(); tocar(null); }
  if(e.key==='Escape' && pant==='historia') verPantalla('menu');""")

cam(
"""ajustar(); armarPelo();""",
"""ajustar(); armarPelo(); armarFondo(1);""")

# el mundo 7 y 8 en el iconito
cam(
"""function icono(cv, m){
  const g=cv.getContext('2d'); const s=68;
  g.clearRect(0,0,s,s); g.translate(s/2,s/2);
  g.strokeStyle='rgba(36,36,43,0.30)'; g.lineWidth=1;
  const radios = (m>=3)? [12,25] : [21];
  for(const r of radios){ g.beginPath(); g.arc(0,0,r,0,7); g.stroke(); }
  g.fillStyle='#24242B'; g.beginPath(); g.arc(0,0,7,0,7); g.fill();
  const n = 1 + ((m>=2)?1:0) + ((m>=4)?1:0);
  g.fillStyle='#D9695A';
  for(let i=0;i<n;i++){
    const a=i/n*Math.PI*2 + 0.5, r=radios[i%radios.length];
    g.beginPath(); g.arc(Math.cos(a)*r, Math.sin(a)*r, 4.6, 0, 7); g.fill();
  }
  g.setTransform(1,0,0,1,0,0);
}""",
"""function icono(cv, m){
  const g=cv.getContext('2d'); const s=68;
  g.clearRect(0,0,s,s); g.translate(s/2,s/2);
  g.strokeStyle='rgba(36,36,43,0.30)'; g.lineWidth=1;
  const radios = (m>=3)? [12,25] : [21];
  for(const r of radios){ g.beginPath(); g.arc(0,0,r,0,7); g.stroke(); }
  g.fillStyle='#24242B'; g.beginPath(); g.arc(0,0,7,0,7); g.fill();
  /* EL ICONO DIBUJA LA FORMA QUE TRAE EL MUNDO, que es la unica noticia que da un mundo nuevo. Un
     numero adentro de un circulo no dice nada que no diga ya el rotulo de al lado. */
  const fm=ICONO_FORMA[Math.max(0,Math.min(ICONO_FORMA.length-1,m))];
  g.fillStyle='#D9695A'; g.strokeStyle='#D9695A';
  if(fm==='barra'){
    g.lineWidth=5; g.lineCap='round';
    g.beginPath(); g.moveTo(-9,0); g.lineTo(-25,0); g.moveTo(9,0); g.lineTo(25,0); g.stroke();
  } else {
    const n = 1 + ((m>=2)?1:0) + ((m>=4)?1:0);
    for(let i=0;i<n;i++){
      const a=i/n*Math.PI*2 + 0.5, r=radios[i%radios.length];
      const X=Math.cos(a)*r, Y=Math.sin(a)*r;
      g.beginPath(); g.arc(X, Y, 4.6, 0, 7); g.fill();
      if(fm==='doble' && i===0){ g.beginPath(); g.arc(-X,-Y,4.6,0,7); g.fill(); }
      if(fm==='satelite' && i===0){ g.beginPath(); g.arc(X+7,Y-6,2.6,0,7); g.fill(); }
      if(fm==='cometa' && i===0){ for(let q=1;q<=3;q++){ const aa=a-q*0.30;
        g.globalAlpha=0.55-q*0.11;
        g.beginPath(); g.arc(Math.cos(aa)*r, Math.sin(aa)*r, 3.4-q*0.5, 0, 7); g.fill(); }
        g.globalAlpha=1; }
    }
  }
  g.setTransform(1,0,0,1,0,0);
}""")

# =========================================================================================
# 14. GANCHOS
# =========================================================================================
cam(
"""  pelo:()=>({ mechones:pelusa.pelo.length, puntos:pelusa.pelo.length*(PELO_N+1),
              largo:+(pelusa.pelo[0]?Math.hypot(pelusa.pelo[0].p[3].x-pelusa.pelo[0].p[0].x,
                     pelusa.pelo[0].p[3].y-pelusa.pelo[0].p[0].y):0).toFixed(3) }),
  progreso:()=>({ prog:Object.keys(prog).length, mundosAbiertos:[1,2,3,4,5,6].filter(mundoAbierto) }),""",
"""  /* DESVIO: cuanto se aparta la punta de donde estaria un pelo tieso. Es la unica medida que
     distingue "hay fisica" de "hay un dibujo de pelo": quieta tiene que dar casi cero y disparada
     tiene que dar varios centesimos de unidad. */
  pelo:()=>{ let des=0, n=0;
    for(const m of pelusa.pelo){
      const ang=m.a+pelusa.ang, k=PELO_N, rr=RP+k*m.largo;
      const ox=pelusa.x+Math.cos(ang)*rr, oy=pelusa.y+Math.sin(ang)*rr;
      des+=Math.hypot(m.p[k].x-ox, m.p[k].y-oy); n++;
    }
    return { mechones:pelusa.pelo.length, tramos:PELO_N, puntos:pelusa.pelo.length*(PELO_N+1),
             trazos:GROSORES.length,
             largo:+(pelusa.pelo[0]?Math.hypot(pelusa.pelo[0].p[PELO_N].x-pelusa.pelo[0].p[0].x,
                    pelusa.pelo[0].p[PELO_N].y-pelusa.pelo[0].p[0].y):0).toFixed(3),
             vel:+Math.hypot(pelusa.vx,pelusa.vy).toFixed(2),
             desvio:+(des/Math.max(1,n)).toFixed(4) }; },
  fondo:()=>({ mundo:fondoMundo, capas:fondo? fondo.map((c,i)=>({v:CAPAS[i].v, n:c.length})):null,
               objetos:fondo? fondo.reduce((a,c)=>a+c.length,0):0, alto:FONDO_ALTO }),
  historia:()=>({ pant, i:histI, de:HIST.length, t:+histT.toFixed(2), dur:HIST_DUR,
                  texto:(document.getElementById('hT')||{}).textContent||'' }),
  verHistoria:()=>{ histVer(); return histI; },
  musica:()=>({ hay:!!MUS.g, voces:MUS.voces.length, raiz:MUS.raiz, vol:MUS_VOL,
                filtro: MUS.filtro? Math.round(MUS.filtro.frequency.value):0 }),
  formas:()=>{ const c={};
    for(let m=1;m<=MUNDOS;m++) for(let n=1;n<=NIVELES;n++){
      const nv=generar(m,n);
      for(const an of nv.anillos) for(const r of an) c[r.forma]=(c[r.forma]||0)+1; }
    return c; },
  progreso:()=>({ prog:Object.keys(prog).length,
                  mundosAbiertos:Array.from({length:MUNDOS},(_,i)=>i+1).filter(mundoAbierto) }),""")

cam(
"""  medidas:()=>({ W, H, U:+U.toFixed(2), DPR, banda:BANDA, medioMin:+MEDIO_MIN.toFixed(2),""",
"""  costo:(n)=>{ const t0=performance.now();
    for(let i=0;i<(n||120);i++){ paso(1/60); dibujar(); }
    return { cuadros:n||120, msPorCuadro:+((performance.now()-t0)/(n||120)).toFixed(2) }; },
  medidas:()=>({ W, H, U:+U.toFixed(2), DPR, banda:BANDA, medioMin:+MEDIO_MIN.toFixed(2),""")

# =========================================================================================
# 15. EL MENU, DESPUES DE MIRARLO
# =========================================================================================
cam(
"""  #pIdioma, #pHistoria{ background:rgba(247,246,243,0.94); }""",
"""  #pIdioma, #pHistoria{ background:rgba(247,246,243,0.94); }
  /* EL MENU NO SE TAPA CON OPACIDAD PAREJA, SE TAPA CON UN DEGRADE. Con un velo parejo al 87% pasan
     dos cosas malas a la vez: el fondo de capas queda a la mitad de contraste en todas partes, y la
     pelusa que flota abajo se ve turbia. Con el velo cerrado en la franja del texto y abierto arriba
     y abajo, el titulo se lee con el contraste entero y el juego se ve moverse a los dos lados. */
  #pMenu{ background:linear-gradient(180deg, rgba(247,246,243,0.50) 0%,
    rgba(247,246,243,0.94) 22%, rgba(247,246,243,0.94) 58%, rgba(247,246,243,0.38) 100%); }""")

cam(
"""  #creditos{ position:absolute; bottom:16px; left:0; right:0; text-align:center;""",
"""  #creditos{ position:absolute; bottom:8px; left:0; right:0; text-align:center;""")

cam(
"""                        rotores:nivel.anillos.map(a=>a.map(r=>({ r:+r.r.toFixed(2), w:+r.w.toFixed(2),
                                 tipo:r.tipo, duerme:r.duerme!==undefined })))}),""",
"""                        trazado:nivel.trazado,
                        rotores:nivel.anillos.map(a=>a.map(r=>({ r:+r.r.toFixed(2), w:+r.w.toFixed(2),
                                 tipo:r.tipo, forma:r.forma, duerme:r.duerme!==undefined })))}),""")

io.open(RUTA,'w',encoding='utf8').write(s)
print('parche_grande: %d cambios, %d ya estaban. %d -> %d bytes' % (hechos, saltados, ANTES, len(s)))
