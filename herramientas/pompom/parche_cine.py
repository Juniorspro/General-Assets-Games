# -*- coding: utf-8 -*-
"""
POMPOM, tercera vuelta: un fondo generado por mundo, una cinematica al terminar cada nivel, bloom,
estallidos y clima animado.

IDEMPOTENTE. Guardia: si el texto NUEVO ya esta, no se toca, y nada mas que eso.
Corre DESPUES de parche_grande.py y parche_hub.py.
"""
import io, os, base64, glob

AQUI = os.path.dirname(os.path.abspath(__file__))
RUTA = os.path.normpath(os.path.join(AQUI, '..', '..', 'juegos-pc', 'Pompom.html'))
FONDOS = os.path.normpath(os.path.join(AQUI, '..', '..', 'assets', 'pompom', 'fondos'))

s = io.open(RUTA, encoding='utf8').read()
ANTES = len(s)
hechos = saltados = 0

def cam(a, b, marca=None):
    """
    marca: guardia alternativo. Hace falta para UN bloque -el de los ocho fondos- porque su texto
    nuevo CONTIENE las imagenes en base64: si las imagenes se vuelven a hornear, el texto nuevo ya no
    es el mismo, el guardia normal no lo encuentra, el viejo SI esta (esta adentro del nuevo) y el
    parche inserta el bloque entero una segunda vez. Con una marca corta e invariable no puede pasar.
    """
    global s, hechos, saltados
    if (marca or b) in s:
        saltados += 1; return
    if a not in s: raise SystemExit('NO ENCONTRADO:\n' + a[:220])
    s = s.replace(a, b, 1); hechos += 1

# ---- los ocho fondos, en data URI ----
def datauri(f):
    return 'data:image/webp;base64,' + base64.b64encode(io.open(f,'rb').read()).decode('ascii')
imgs = [datauri(os.path.join(FONDOS,'m%d.webp'%k)) for k in range(1,9)]
FONDO_JS = 'const FONDO_IMG=[\n' + ',\n'.join("'"+u+"'" for u in imgs) + '];'

# =========================================================================================
# 1. LOS TEXTOS
# =========================================================================================
cam(
""" arrastra:{en:'drag Pompom around', es:'arrastrá a Pelusín', pt:'arraste o Pelusin'},""",
""" arrastra:{en:'drag Pompom around', es:'arrastrá a Pelusín', pt:'arraste o Pelusin'},
 saltarCine:{en:'SKIP', es:'SALTAR', pt:'PULAR'},
 mundoHecho:{en:'WORLD {m} BEHIND', es:'MUNDO {m} ATRÁS', pt:'MUNDO {m} PARA TRÁS'},
 /* UNA LINEA POR MUNDO, y se repite en los veinte niveles de ese mundo a proposito: es el capitulo
    en el que estas, no una frase distinta cada vez. Veinte frases por mundo serian ciento sesenta
    frases que nadie lee a partir de la tercera. */
 c1:{en:'The mist has no bottom and no top. Pompom counts the points instead.',
     es:'La niebla no tiene fondo ni techo. Pelusín cuenta los puntos, entonces.',
     pt:'A névoa não tem fundo nem teto. O Pelusin conta os pontos, então.'},
 c2:{en:'Two moons went by. Neither of them looked down.',
     es:'Pasaron dos lunas. Ninguna miró para abajo.',
     pt:'Passaram duas luas. Nenhuma olhou para baixo.'},
 c3:{en:'The dunes repeat themselves. Pompom does not.',
     es:'Las dunas se repiten. Pelusín no.',
     pt:'As dunas se repetem. O Pelusin não.'},
 c4:{en:'The tide climbs up to the points and goes back down. It always comes back.',
     es:'La marea sube hasta los puntos y vuelve a bajar. Siempre vuelve.',
     pt:'A maré sobe até os pontos e desce de novo. Sempre volta.'},
 c5:{en:'The waterfall froze halfway down. So can anything else.',
     es:'La cascada se congeló a mitad de caída. Cualquier cosa puede.',
     pt:'A cachoeira congelou no meio da queda. Qualquer coisa pode.'},
 c6:{en:'The walls came closer. The gap of sky got brighter.',
     es:'Las paredes se acercaron. El pedazo de cielo se puso más claro.',
     pt:'As paredes se aproximaram. O pedaço de céu ficou mais claro.'},
 c7:{en:'The salt goes on for days. The points do not.',
     es:'La sal sigue por días. Los puntos no.',
     pt:'O sal segue por dias. Os pontos não.'},
 c8:{en:'There is nothing above the last white. That was always the point.',
     es:'Arriba del último blanco no hay nada. De eso se trataba.',
     pt:'Acima do último branco não há nada. Era disso que se tratava.'},""")

cam(
""" sinVidas:{en:'AGAIN, FROM THE TOP', es:'DE NUEVO, DESDE ARRIBA', pt:'DE NOVO, DESDE O COMEÇO'},""",
""" sinVidas:{en:'AGAIN, FROM THE TOP', es:'DE NUEVO, DESDE ARRIBA', pt:'DE NOVO, DESDE O COMEÇO'},
 grafica:{en:'EFFECTS', es:'EFECTOS', pt:'EFEITOS'},""")

# =========================================================================================
# 2. LA PANTALLA DE LA CINEMATICA
# =========================================================================================
cam(
"""  <div id="pTienda" class="pan">""",
"""  <div id="pCine" class="pan">
    <div id="cineT"></div>
    <div id="cineP"><i></i></div>
    <button class="bot" id="cineSaltar" data-i18n="saltarCine"></button>
  </div>

  <div id="pTienda" class="pan">""")

cam(
"""  /* ===================== LAS VIDAS ===================== */""",
"""  /* ===================== LA CINEMATICA =====================
     El panel es TRANSPARENTE salvo por un velo abajo: la cinematica se dibuja en el lienzo de
     siempre —el mismo fondo, el mismo Pelusin, el mismo pelo con fisica— y lo unico que va en DOM
     es el texto, que tiene que ser nitido y traducible. Una cinematica dibujada con texto de lienzo
     se ve borrosa en un telefono y no se puede traducir sin volver a medir todo. */
  #pCine{ background:transparent; backdrop-filter:none; justify-content:flex-end; padding-bottom:0; }
  #pCine::before{ content:''; position:absolute; inset:0; pointer-events:none;
    background:linear-gradient(180deg, rgba(247,246,243,0) 40%, rgba(247,246,243,.86) 78%,
      rgba(247,246,243,.97) 100%); }
  #cineT{ position:relative; z-index:1; font-size:max(13px,calc(16px * var(--esc))); font-weight:300;
    letter-spacing:.09em; line-height:1.85; width:min(540px,90%); min-height:3.6em;
    color:var(--tinta); margin-bottom:calc(10px * var(--esc)); }
  #cineP{ position:relative; z-index:1; width:min(220px,54%); height:2px; border-radius:9px;
    background:var(--humo2); overflow:hidden; margin-bottom:calc(12px * var(--esc)); }
  #cineP i{ display:block; height:100%; width:0%; background:var(--tinta); }
  #cineSaltar{ position:relative; z-index:1; margin-bottom:calc(26px * var(--esc)); }

  /* ===================== LAS VIDAS ===================== */""")

# =========================================================================================
# 3. LOS FONDOS DE MUNDO
# =========================================================================================
cam(
"""let fondo=null, fondoMundo=0;""",
"""/* ===================== EL FONDO DE CADA MUNDO =====================
   Ocho imagenes generadas, una por mundo, de 360x640 y trece kilobytes LAS OCHO JUNTAS. Son manchas
   suaves sin un solo detalle fino —niebla, dos lunas, dunas, mar, una cascada congelada, un canon,
   una salina, un pico— asi que estiradas a pantalla completa se ven igual de bien que a tamano
   original: no hay nada que se pueda ver pixelado porque no hay nada nitido.
   Y van HORNEADAS CONTRA EL PAPEL, mezcladas un 42% con el #F7F6F3 del juego. Bajarles el alfa al
   dibujar daria lo mismo en pantalla pero costaria una composicion por cuadro y el archivo pesaria
   igual; mezclarlas en el horno sale gratis las dos veces.

   SE REPITEN EN ESPEJO. Un nivel del mundo 8 son cuarenta unidades de alto y la imagen cubre unas
   dieciocho: repetirla derecha deja una costura visible cada vuelta, y en espejo NO HAY COSTURA
   POSIBLE, porque el borde de arriba de una copia es exactamente el borde de arriba de la de al
   lado. Es la unica forma de repetir una foto sin fabricarla para que repita. */
""" + FONDO_JS + """
const fondoIm=[];
function cargarFondo(m){
  const k=Math.max(1,Math.min(8,m))-1;
  if(fondoIm[k]) return fondoIm[k];
  const im=new Image(); im.src=FONDO_IMG[k]; fondoIm[k]=im; return im;
}
function dibujarFondoImg(){
  const im=cargarFondo(fondoMundo||1);
  if(!im || !im.complete || !im.naturalWidth) return;
  const g=cx;
  /* la imagen se estira al ancho de la pantalla y sube MUY despacio: es lo mas lejos que hay */
  const alto=W*(im.naturalHeight/im.naturalWidth);
  const base=camY*0.020*U;
  let y0=((base % (alto*2)) + alto*2) % (alto*2) - alto*2;
  g.save();
  for(let y=y0; y<H+alto; y+=alto){
    const i=Math.round((y-y0)/alto);
    if(i%2===0){ g.drawImage(im, 0, y, W, alto); }
    else { g.save(); g.translate(0, y+alto); g.scale(1,-1); g.drawImage(im, 0, 0, W, alto); g.restore(); }
  }
  g.restore();
}
let fondo=null, fondoMundo=0;""", marca='const FONDO_IMG=[')

cam(
"""function dibujarFondo(){
  if(!fondo) armarFondo(1);""",
"""function dibujarFondo(){
  if(!fondo) armarFondo(1);
  dibujarFondoImg();""")


# =========================================================================================
# 4. EL BLOOM, Y POR QUE ES SELECTIVO
# =========================================================================================
cam(
"""const lienzo=document.getElementById('lienzo');""",
"""/* ===================== EL BLOOM =====================
   BLOOM SELECTIVO Y NO DE PANTALLA ENTERA, y en un juego blanco no es una preferencia, es la unica
   opcion que funciona: el bloom de pantalla completa toma lo mas brillante del cuadro y lo derrama,
   y acá lo mas brillante del cuadro ES EL PAPEL. Un bloom global sobre #F7F6F3 devuelve una pantalla
   lavada donde ya no se lee ni la linea de puntos.
   Asi que el brillo no se DEDUCE de la imagen: se DECLARA. Cada cosa que tiene que brillar —el punto
   de llegada, los premios, el escudo, los estallidos— se anota en una lista mientras se dibuja, y al
   final esa lista se pinta en un lienzo a mitad de resolucion como degradados radiales y se suma
   encima con 'lighter'. Son cuatro o cinco degradados por cuadro contra un desenfoque de pantalla
   completa: mas barato Y mas correcto.
   Y NO EN TODOS LOS MUNDOS. Va donde la historia lo pide —el hielo, el canon, la salina y el ultimo
   blanco— porque un brillo que esta siempre deja de significar algo. */
const BLOOM_MUNDO=[false,false,false,false,false,true,true,true,true];
const BLOOM_FUERZA=0.85;
let bloomOn=true;
try{ const g=localStorage.getItem('pompom_bloom'); if(g!=null) bloomOn=(g==='1'); }catch(e){}
const glow=[];
let blCv=null, blG=null, blFiltro=null;
function brillar(X,Y,r,rgb,a){
  if(!bloomOn || !BLOOM_MUNDO[Math.max(0,Math.min(8,fondoMundo))]) return;
  glow.push({X,Y,r,rgb,a});
}
function estallido(X,Y,r,rgb,a){ if(bloomOn) glow.push({X,Y,r,rgb,a}); }  // los estallidos brillan siempre
function bloomPintar(){
  if(!glow.length) return;
  const k=0.5, bw=Math.max(2,Math.round(W*k)), bh=Math.max(2,Math.round(H*k));
  if(!blCv){ blCv=document.createElement('canvas'); blG=blCv.getContext('2d');
    try{ blG.filter='blur(2px)'; blFiltro=(blG.filter!=='none'); blG.filter='none'; }
    catch(e){ blFiltro=false; } }
  if(blCv.width!==bw||blCv.height!==bh){ blCv.width=bw; blCv.height=bh; }
  const b=blG;
  b.setTransform(1,0,0,1,0,0);
  b.clearRect(0,0,bw,bh);
  for(const q of glow){
    const R=Math.max(2,q.r*k), X=q.X*k, Y=q.Y*k;
    if(X<-R||X>bw+R||Y<-R||Y>bh+R) continue;
    const gr=b.createRadialGradient(X,Y,0,X,Y,R);
    gr.addColorStop(0,   'rgba('+q.rgb+','+q.a.toFixed(3)+')');
    gr.addColorStop(0.45,'rgba('+q.rgb+','+(q.a*0.34).toFixed(3)+')');
    gr.addColorStop(1,   'rgba('+q.rgb+',0)');
    b.fillStyle=gr; b.beginPath(); b.arc(X,Y,R,0,7); b.fill();
  }
  const g=cx;
  g.save(); g.setTransform(DPR,0,0,DPR,0,0);
  g.globalCompositeOperation='lighter';
  g.globalAlpha=BLOOM_FUERZA;
  /* el desenfoque de lienzo es un extra: los degradados radiales YA son un halo. Si el navegador no
     soporta ctx.filter no se pierde el efecto, se pierde medio pixel de suavidad. */
  if(blFiltro){ try{ g.filter='blur('+Math.max(2,Math.round(Math.min(W,H)*0.008))+'px)'; }catch(e){} }
  g.drawImage(blCv, 0,0, W,H);
  g.filter='none'; g.globalAlpha=1; g.globalCompositeOperation='source-over';
  g.restore();
}

const lienzo=document.getElementById('lienzo');""")

cam(
"""  g.fillStyle='#F7F6F3'; g.fillRect(0,0,W,H);
  if(sacudon>0){ g.translate((Math.random()*2-1)*sacudon*9, (Math.random()*2-1)*sacudon*9); }
  dibujarFondo();""",
"""  g.fillStyle='#F7F6F3'; g.fillRect(0,0,W,H);
  glow.length=0;
  if(sacudon>0){ g.translate((Math.random()*2-1)*sacudon*9, (Math.random()*2-1)*sacudon*9); }
  dibujarFondo();""")

cam(
"""  dibujarPelusa();
}

/* ===================== EL ESPINOSO =====================""",
"""  dibujarPelusa();
  bloomPintar();
}

/* ===================== EL ESPINOSO =====================""")

cam(
"""    const X=px(pelusa.x), Y=py(pelusa.y), k=Math.max(1.25, Math.min(1.70, H/430));
    g.save(); g.translate(X,Y); g.scale(k,k); g.translate(-X,-Y);
    dibujarPelusa(); g.restore(); return;""",
"""    const X=px(pelusa.x), Y=py(pelusa.y), k=Math.max(1.25, Math.min(1.70, H/430));
    g.save(); g.translate(X,Y); g.scale(k,k); g.translate(-X,-Y);
    dibujarPelusa(); g.restore();
    bloomPintar(); return;""")

# lo que brilla: la meta, los premios y el escudo
cam(
"""    if(meta){ g.beginPath(); g.arc(X,Y,r*0.42,0,7); g.fillStyle='rgba(127,178,162,0.85)'; g.fill(); }""",
"""    if(meta){ g.beginPath(); g.arc(X,Y,r*0.42,0,7); g.fillStyle='rgba(127,178,162,0.85)'; g.fill();
      brillar(X, Y, r*4.2, '127,178,162', 0.42+0.10*Math.sin(tiempo*2.2)); }""")

cam(
"""    const la=1+0.09*Math.sin(tiempo*3.1+k);
    g.save(); g.translate(X,Y); g.scale(la,la);""",
"""    const la=1+0.09*Math.sin(tiempo*3.1+k);
    brillar(X, Y, U*1.35, '127,178,162', 0.30*la);
    g.save(); g.translate(X,Y); g.scale(la,la);""")

cam(
"""  if(escudo){
    g.beginPath(); g.arc(X, Y, RP*U*(1.62+0.10*Math.sin(tiempo*3.4)), 0, 7);
    g.strokeStyle='rgba(127,178,162,0.55)'; g.lineWidth=Math.max(1.4,U*0.030); g.stroke();
  }""",
"""  if(escudo){
    const rr=RP*U*(1.62+0.10*Math.sin(tiempo*3.4));
    g.beginPath(); g.arc(X, Y, rr, 0, 7);
    g.strokeStyle='rgba(127,178,162,0.55)'; g.lineWidth=Math.max(1.4,U*0.030); g.stroke();
    brillar(X, Y, rr*2.1, '127,178,162', 0.32);
  }""")

# =========================================================================================
# 5. LOS ESTALLIDOS
# =========================================================================================
cam(
"""function chocar(){""",
"""/* UN ESTALLIDO ES TRES COSAS A LA VEZ y por eso se lee a estallido y no a "unas particulas":
   la onda de choque que sale, las esquirlas que vuelan, y el fogonazo que brilla en el medio. Con
   dos de las tres se ve a medio hacer; el fogonazo es el que hace el trabajo, y dura tres cuadros. */
function estallar(x,y,verde,n,fuerza){
  const F=fuerza||1;
  ondas.push({x, y, r:0, v:1, verde:!!verde, gordo:true});
  for(let i=0;i<(n||18);i++){
    const a=(i/(n||18))*Math.PI*2 + Math.random()*0.4, v=(1.8+Math.random()*3.4)*F;
    chispas.push({x, y, vx:Math.cos(a)*v, vy:Math.sin(a)*v, t:0, T:0.45+Math.random()*0.42, verde:!!verde});
  }
  fogonazos.push({x, y, t:0, T:0.30*F, verde:!!verde, r:U*2.2*F});
}
const fogonazos=[];

function chocar(){""")

cam(
"""  for(let i=0;i<n;i++){
    const a=conEscudo? (i/n)*Math.PI*2 : Math.random()*Math.PI*2;
    const v=conEscudo? 3.2 : 1.6+Math.random()*2.6;
    chispas.push({x:pelusa.x, y:pelusa.y, vx:Math.cos(a)*v, vy:Math.sin(a)*v,
                  t:0, T:0.5+Math.random()*0.3, verde:conEscudo});
  }
  ondas.push({x:A.x, y:A.y, r:0, v:1, verde:conEscudo});""",
"""  estallar(pelusa.x, pelusa.y, conEscudo, n, conEscudo? 0.85 : 1.15);""")

cam(
"""  for(let i=0;i<16;i++){ const a=(i/16)*Math.PI*2;
    chispas.push({x:nivel.nodos[k].x, y:nivel.nodos[k].y, vx:Math.cos(a)*2.6, vy:Math.sin(a)*2.6,
                  t:0, T:0.55, verde:true}); }""",
"""  estallar(nivel.nodos[k].x, nivel.nodos[k].y, true, 16, 0.9);""")

cam(
"""  for(let i=ondas.length-1;i>=0;i--){ const o=ondas[i]; o.r+=dt*4.2; o.v-=dt*1.5;
    if(o.v<=0) ondas.splice(i,1); }""",
"""  for(let i=ondas.length-1;i>=0;i--){ const o=ondas[i]; o.r+=dt*(o.gordo? 9.5 : 4.2);
    o.v-=dt*(o.gordo? 2.2 : 1.5);
    if(o.v<=0) ondas.splice(i,1); }
  for(let i=fogonazos.length-1;i>=0;i--){ const f=fogonazos[i]; f.t+=dt;
    if(f.t>=f.T) fogonazos.splice(i,1); }""")

cam(
"""  /* LOS PREMIOS, dibujados en su nodo:""",
"""  /* el fogonazo de cada estallido: va por bloom y por eso brilla aunque el mundo no tenga bloom */
  for(const f of fogonazos){
    const a=1-f.t/f.T;
    estallido(px(f.x), py(f.y), f.r*(0.6+0.9*(1-a)), f.verde? '127,178,162' : '217,105,90', 0.80*a);
  }
  /* LOS PREMIOS, dibujados en su nodo:""")

cam(
"""  jugando=true;""",
"""  fogonazos.length=0;
  jugando=true;""")


# =========================================================================================
# 6. EL CLIMA: cada mundo tiene su cosa moviendose
# =========================================================================================
cam(
"""function dibujarFondo(){
  if(!fondo) armarFondo(1);
  dibujarFondoImg();""",
"""/* ===================== EL CLIMA =====================
   Una cosa en movimiento por mundo: niebla, polvo, arena, espuma, nieve, brasas, calor y aurora.
   LAS PARTICULAS VIVEN EN LA PANTALLA Y NO EN EL MUNDO, y es a proposito: el clima no es geometria
   —no hay que poder aprenderselo, ni tiene que ser igual en todos los telefonos— asi que se guarda
   en coordenadas de 0 a 1 y se envuelve por modulo. Ponerlo en unidades de mundo obligaria a toda
   la maquinaria de repeticion del parallax para algo que el jugador no mira nunca de frente.
   Lo unico que las ata al juego es un arrastre chico con la camara: sin eso se leen a calcomania
   pegada al vidrio. */
const CLIMA=['niebla','niebla','lunas','arena','agua','nieve','brasas','calor','aurora'];
let clima=null, climaMundo=-1;
function armarClima(m){
  if(clima && climaMundo===m) return;
  climaMundo=m; clima=[];
  const R=rng(m*3313+77), n=(CLIMA[m]==='aurora')? 34 : 62;
  for(let i=0;i<n;i++) clima.push({ x:R(), y:R(), r:R(), f:R()*6.283, v:0.35+R()*0.9 });
}
function dibujarClima(){
  const m=Math.max(0,Math.min(8,fondoMundo));
  armarClima(m);
  const t=CLIMA[m], g=cx, T=tiempo, arr=(camY*0.055)/Math.max(1,ALTO_CAM);
  const env=(v)=>((v%1)+1)%1;
  g.save();
  if(t==='nieve' || t==='arena' || t==='lunas'){
    const cae = t==='nieve'? 0.055 : (t==='arena'? 0.030 : 0.008);
    const lado= t==='arena'? 0.055 : 0.012;
    g.fillStyle = t==='arena'? 'rgba(150,130,100,0.20)' : 'rgba(120,140,160,0.26)';
    for(const p of clima){
      const yy=env(p.y + T*cae*p.v + arr)*1.12-0.06;
      const xx=env(p.x + T*lado*p.v)*1.12-0.06;
      const rr=(0.7+p.r*2.1)*(t==='nieve'?1.5:1)*Math.max(1,U*0.028);
      g.beginPath(); g.arc(xx*W, yy*H, rr, 0, 7); g.fill();
    }
  } else if(t==='brasas' || t==='calor'){
    const sube = t==='brasas'? -0.070 : -0.045;
    for(const p of clima){
      const yy=env(p.y + T*sube*p.v + arr)*1.12-0.06;
      const xx=env(p.x + Math.sin(T*0.5+p.f)*0.012)*1.12-0.06;
      const a=(t==='brasas'? 0.34 : 0.16)*(0.4+0.6*Math.sin(T*2.2+p.f)*0.5+0.5);
      g.fillStyle = t==='brasas'? 'rgba(217,105,90,'+a.toFixed(3)+')' : 'rgba(160,150,140,'+a.toFixed(3)+')';
      const rr=(0.6+p.r*1.7)*Math.max(1,U*0.026);
      g.beginPath(); g.arc(xx*W, yy*H, rr, 0, 7); g.fill();
      if(t==='brasas') estallido(xx*W, yy*H, rr*7, '217,105,90', a*0.34);
    }
  } else if(t==='agua'){
    g.strokeStyle='rgba(120,160,180,0.20)'; g.lineWidth=Math.max(1,U*0.020); g.lineCap='round';
    for(const p of clima){
      const yy=env(p.y + T*0.020*p.v + arr)*1.12-0.06;
      const xx=env(p.x + T*0.055*p.v)*1.2-0.10;
      const l=(0.05+p.r*0.13)*W;
      g.beginPath(); g.moveTo(xx*W, yy*H); g.lineTo(xx*W+l, yy*H); g.stroke();
    }
  } else if(t==='aurora'){
    /* la aurora son cintas y no puntos: seis curvas anchas que se ondulan y brillan. Es el unico
       clima que pasa por el bloom, y por eso el mundo 8 se siente distinto de los otros siete. */
    g.lineCap='round';
    for(let i=0;i<6;i++){
      const yb=(0.10+i*0.055)*H + Math.sin(T*0.34+i)*H*0.020 - camY*0.9;
      const a=0.10+0.07*Math.sin(T*0.7+i*1.3);
      g.strokeStyle='rgba(127,178,162,'+a.toFixed(3)+')';
      g.lineWidth=Math.max(3, H*(0.014+0.010*Math.sin(i*2.1)));
      g.beginPath();
      for(let q=0;q<=10;q++){
        const X=q/10*W, Y=yb + Math.sin(T*0.55 + q*0.7 + i)*H*0.028;
        q? g.lineTo(X,Y) : g.moveTo(X,Y);
      }
      g.stroke();
      estallido(W*0.5, yb, W*0.55, '127,178,162', a*0.55);
    }
  } else {
    /* niebla: bandas anchas y lentas. Casi no se ven, y esa es la idea */
    for(const p of clima){
      if(p.r>0.42) continue;
      const yy=env(p.y + T*0.010*p.v + arr)*1.12-0.06;
      const xx=env(p.x + T*0.016*p.v)*1.3-0.15;
      g.fillStyle='rgba(150,150,150,'+(0.030+p.r*0.045).toFixed(3)+')';
      g.beginPath();
      g.ellipse(xx*W, yy*H, W*(0.14+p.r*0.5), H*(0.012+p.r*0.030), 0, 0, 7);
      g.fill();
    }
  }
  g.restore();
}

function dibujarFondo(){
  if(!fondo) armarFondo(1);
  dibujarFondoImg();""")

cam(
"""      dibujarFig(g, X, Y, r, DECOR[Math.max(0,Math.min(DECOR.length-1,fondoMundo))],
                 C.forma==='aro', tiempo*0.10+o.f);
    }
  }
  g.globalAlpha=1;
}""",
"""      dibujarFig(g, X, Y, r, DECOR[Math.max(0,Math.min(DECOR.length-1,fondoMundo))],
                 C.forma==='aro', tiempo*0.10+o.f);
    }
  }
  g.globalAlpha=1;
  dibujarClima();
}""")

# =========================================================================================
# 7. LA CINEMATICA DE CADA NIVEL
# =========================================================================================
cam(
"""/* ===================== EL TUTORIAL =====================""",
"""/* ===================== LA CINEMATICA =====================
   UNA AL TERMINAR CADA NIVEL, y la linea es del MUNDO y no del nivel: veinte frases distintas por
   mundo serian ciento sesenta frases que nadie lee a partir de la tercera. Lo que cambia nivel a
   nivel es la barra —cuanto de este capitulo llevas— y lo que cambia de mundo a mundo es el
   capitulo. Asi la historia avanza sin que el juego se convierta en un libro.
   Se dibuja EN EL LIENZO DE SIEMPRE: el mismo fondo generado, el mismo clima, el mismo Pelusin con
   su pelo de verdad cruzando el plano. Lo unico que va en DOM es el texto, porque tiene que ser
   nitido en un telefono y tiene que poder traducirse.
   Y se saltea con un toque en cualquier lado. Una cinematica que no se puede saltear, repetida
   ciento sesenta veces, deja de ser una historia y pasa a ser un peaje. */
const CINE_NIVEL=2.8, CINE_MUNDO=4.6;
let cine=null, cineDespues=null;
function cineVer(tipo, m, n, luego){
  cine={ tipo, m, n, t:0, dur:(tipo==='mundo'? CINE_MUNDO : CINE_NIVEL) };
  cineDespues=luego||null;
  const T=document.getElementById('cineT');
  if(T) T.textContent = (tipo==='mundo')? (TX('mundoHecho',{m})+' · '+TX('c'+m)) : TX('c'+m);
  verPantalla('cine');
  if(tipo==='mundo') son('mundo'); else son('toque');
}
function cineFin(){
  const f=cineDespues; cine=null; cineDespues=null;
  if(f) f(); else { pintarHub(); verPantalla('menu'); }
}
function cineDibujar(){
  const g=cx, f=Math.min(1, cine.t/cine.dur);
  /* la figura del mundo, enorme y girando despacio detras de todo */
  const fig=DECOR[Math.max(0,Math.min(DECOR.length-1, cine.m))];
  const R=Math.min(W,H)*(0.26+0.05*Math.sin(tiempo*0.5));
  g.save(); g.globalAlpha=0.16; g.fillStyle='#24242B'; g.strokeStyle='#24242B';
  g.lineWidth=Math.max(1.5, R*0.012);
  dibujarFig(g, W*0.5, H*0.40, R, fig, true, tiempo*0.16);
  g.restore();
  brillar(W*0.5, H*0.40, R*1.9, '127,178,162', 0.20*(1-Math.abs(f-0.5)*1.4));
  /* y Pelusin cruzando el plano de izquierda a derecha, a saltitos */
  dibujarPelusa();
  bloomPintar();
}

/* ===================== EL TUTORIAL =====================""")

cam(
"""  if(pant==='historia'){ histDibujar(); return; }""",
"""  if(pant==='historia'){ histDibujar(); return; }
  if(pant==='cine' && cine){ cineDibujar(); return; }""")

cam(
"""  if(pant!=='juego' && pant!=='historia'){
    camObj=0; camY += (0-camY)*Math.min(1, dt*3.0);""",
"""  if(pant==='cine' && cine){
    cine.t+=dt;
    const f=Math.min(1, cine.t/cine.dur);
    const b=document.querySelector('#cineP i'); if(b) b.style.width=(f*100).toFixed(0)+'%';
    /* cruza el plano dando saltitos. El pelo hace el resto solo: el viento sale de la velocidad del
       cuerpo, y esta cruzando de verdad. */
    const cy=camY + (0.76-0.52)*H/Math.max(1,U);
    pelusa.x = -3.6 + f*7.2;
    pelusa.y = cy + Math.abs(Math.sin(f*Math.PI*6))*(-0.40);
    if(cine.t>=cine.dur) cineFin();
  } else if(pant!=='juego' && pant!=='historia'){
    camObj=0; camY += (0-camY)*Math.min(1, dt*3.0);""")

cam(
"""  for(const [id,n] of [['pIdioma','idioma'],['pHistoria','historia'],['pHub','menu'],
                       ['pMundos','mundos'],['pNiveles','niveles'],['pTienda','tienda'],['pFin','fin']])""",
"""  for(const [id,n] of [['pIdioma','idioma'],['pHistoria','historia'],['pHub','menu'],
                       ['pMundos','mundos'],['pNiveles','niveles'],['pTienda','tienda'],
                       ['pCine','cine'],['pFin','fin']])""")

cam(
"""  const eraUltimo = nivelAct>=NIVELES;
  setTimeout(()=>{
    if(!jugando) return;
    if(eraUltimo){
      son('mundo');
      if(mundoAct>=MUNDOS){ verPantalla('fin'); jugando=false; }
      else { mundoAct++; nivelAct=1; cargarNivel(mundoAct,1); }
    } else cargarNivel(mundoAct, nivelAct+1);
  }, 1450);""",
"""  estallar(pelusa.x, pelusa.y, true, 26, 1.5);
  const eraUltimo = nivelAct>=NIVELES;
  const m=mundoAct, n=nivelAct;
  setTimeout(()=>{
    if(!jugando) return;
    if(eraUltimo){
      cineVer('mundo', m, n, ()=>{
        if(m>=MUNDOS){ pintarHub(); verPantalla('fin'); jugando=false; }
        else { mundoAct=m+1; nivelAct=1; cargarNivel(m+1,1); }
      });
    } else cineVer('nivel', m, n, ()=>cargarNivel(m, n+1));
  }, 1250);""")

cam(
"""function tocar(e){
  if(e && e.target && e.target.closest && e.target.closest('button')) return;
  if(pant==='historia'){ audioIniciar(); histPasar(1); return; }""",
"""function tocar(e){
  if(e && e.target && e.target.closest && e.target.closest('button')) return;
  if(pant==='cine'){ cineFin(); return; }
  if(pant==='historia'){ audioIniciar(); histPasar(1); return; }""")

cam(
"""document.getElementById('bVolver3').onclick=()=>{ pintarHub(); verPantalla('menu'); };""",
"""document.getElementById('bVolver3').onclick=()=>{ pintarHub(); verPantalla('menu'); };
document.getElementById('cineSaltar').onclick=(e)=>{ e.stopPropagation(); cineFin(); };
document.getElementById('bEfe').onclick=()=>{ bloomOn=!bloomOn;
  try{ localStorage.setItem('pompom_bloom', bloomOn?'1':'0'); }catch(e){}
  document.getElementById('bEfe').style.opacity = bloomOn? '1' : '0.42'; };
document.getElementById('bEfe').style.opacity = bloomOn? '1' : '0.42';""")

cam(
"""      <button class="pieB" id="bCuento" data-i18n="cuento"></button>""",
"""      <button class="pieB" id="bCuento" data-i18n="cuento"></button>
      <button class="pieB" id="bEfe" data-i18n="grafica"></button>""")

# =========================================================================================
# 8. GANCHOS
# =========================================================================================
cam(
"""  hub:()=>({ pant, ultimo:ultimoNivel(), hechos:hechosTotal(), total:MUNDOS*NIVELES,""",
"""  cine:()=>({ pant, hay:!!cine, tipo:cine&&cine.tipo, m:cine&&cine.m, n:cine&&cine.n,
               t:cine? +cine.t.toFixed(2):0, dur:cine? cine.dur:0,
               texto:(document.getElementById('cineT')||{}).textContent||'' }),
  cineSaltar:()=>{ cineFin(); return pant; },
  fx:(v)=>{ if(v!=null){ bloomOn=!!v; } return { bloom:bloomOn, brillos:glow.length,
             mundoConBloom:BLOOM_MUNDO[Math.max(0,Math.min(8,fondoMundo))],
             fogonazos:fogonazos.length, filtro:blFiltro }; },
  clima:()=>({ mundo:fondoMundo, tipo:CLIMA[Math.max(0,Math.min(8,fondoMundo))],
               particulas:clima? clima.length:0,
               fondoCargado:!!(fondoIm[Math.max(1,Math.min(8,fondoMundo))-1]||{}).complete }),
  estallar:(n)=>{ estallar(pelusa.x, pelusa.y, false, n||20, 1.4); return fogonazos.length; },
  hub:()=>({ pant, ultimo:ultimoNivel(), hechos:hechosTotal(), total:MUNDOS*NIVELES,""")

io.open(RUTA,'w',encoding='utf8').write(s)
print('parche_cine: %d cambios, %d ya estaban. %d -> %d' % (hechos, saltados, ANTES, len(s)))
