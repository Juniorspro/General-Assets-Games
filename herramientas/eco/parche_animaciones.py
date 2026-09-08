# -*- coding: utf-8 -*-
"""La cosa pasa de un clip a cuatro, y el agarron pasa a ser un screamer.

   Pedido: *"agrégale rig al monstruo y animaciones de búsqueda caminar correr y screamer"*.

   EL ANDAR Y LA VELOCIDAD SON LA MISMA DECISION. Antes habia dos velocidades (ronda y caza) y un
   solo ciclo estirado con un factor: a 3,30 m/s el ciclo de caminata iba al doble y los pies
   patinaban. Ahora hay tres andares y cada uno trae SU velocidad y el ritmo para el que esta hecho
   el clip, asi que el paso avanza lo que avanza el cuerpo por construccion:

     busqueda  1,35 m/s   ronda: camina despacio y va mirando para todos lados
     caminar   2,30 m/s   te oyo y viene, pero todavia no sabe donde estas exactamente
     correr    3,55 m/s   te tiene a menos de trece metros

   Correr sigue siendo 5,50, asi que sigue siendo cierto que corriendo se le gana. Y ahora el andar
   se puede LEER: si la ves caminando todavia hay tiempo, si la ves corriendo no.

   EL SCREAMER ES UN MOMENTO, NO UN SONIDO. Antes el agarron te teletransportaba en el mismo cuadro:
   no se llegaba a ver nada, que en un juego a oscuras es desperdiciar lo unico que da miedo. Ahora
   son 1,35 s en los que la cosa se planta, te mira, grita — y el mundo se enciende entero, porque
   la luz de este juego es el sonido y ese grito es un sonido. Recien despues te tira a la entrada.
"""
import io, sys

RUTA = 'juegos-pc/Eco.html'
s = io.open(RUTA, encoding='utf-8').read()
ORIG = len(s)
hechos, saltados = [], []

def cam(a, b, marca):
    global s
    if marca in s: saltados.append(marca[:48]); return
    if a not in s: print('NO ESTA:', repr(a[:110])); sys.exit(1)
    if s.count(a) != 1: print('APARECE %d VECES:' % s.count(a), repr(a[:110])); sys.exit(1)
    s = s.replace(a, b, 1); hechos.append(marca[:48])

# ================================================= 1. TRES ANDARES CON SU VELOCIDAD
cam("""const COSA_LENTO=1.55, COSA_CAZA=3.30;   // m/s. Correr son 5,5: siempre se le puede ganar corriendo""",
"""/* LOS TRES ANDARES. Cada uno trae su velocidad y el ritmo para el que esta hecho su clip, asi que
   la zancada avanza lo que avanza el cuerpo sin tener que ajustar nada a mano. Correr son 5,50:
   sigue siendo cierto que corriendo se le gana, aun al mas rapido de los tres. */
const COSA_ANDAR={
  busqueda:{ vel:1.35, ritmo:1.20 },   // ronda: camina despacio y mira para todos lados
  caminar :{ vel:2.30, ritmo:1.45 },   // te oyo y viene
  correr  :{ vel:3.55, ritmo:3.40 }    // te tiene cerca
};
const COSA_CERCA_CORRE=13;             // a partir de aca deja de caminar y corre
const SCREAMER_DURA=1.35;              // lo que dura el grito en la cara antes de tirarte a la entrada
const COSA_LENTO=1.35, COSA_CAZA=3.55;   // m/s. Correr son 5,5: siempre se le puede ganar corriendo""",
    "const COSA_ANDAR={")

cam("""  const objetivoVel = cosa.estado==='caza'? COSA_CAZA : COSA_LENTO;""",
"""  /* EL ANDAR SE ELIGE PRIMERO Y LA VELOCIDAD SALE DE AHI, no al reves: si la velocidad y el clip
     se decidieran por separado siempre habria una combinacion en la que los pies patinan. */
  const andar = cosa.estado==='caza'? (cosa.cerca<COSA_CERCA_CORRE? 'correr' : 'caminar') : 'busqueda';
  cosaClip(andar);
  const objetivoVel = COSA_ANDAR[andar].vel;""",
    "  cosaClip(andar);")

cam("""  if(cosa.mixer) cosa.mixer.update(dt * Math.max(0.12, cosa.vel/1.45));""",
"""  /* EL CICLO VA CON LA VELOCIDAD Y CON EL RITMO DE SU PROPIO CLIP. Un ciclo a paso fijo sobre algo
     que va de 1,35 a 3,55 m/s patina los pies, y patinar es lo unico que hace que un monstruo se lea
     a muñeco. */
  if(cosa.mixer && cosa.clip){
    const r=(COSA_ANDAR[cosa.clip]||{}).ritmo || 1.45;
    cosa.mixer.update(dt * Math.max(0.12, Math.min(2.2, cosa.vel/r)));
  }""",
    "const r=(COSA_ANDAR[cosa.clip]||{}).ritmo")

# ================================================= 2. EL CAMBIO DE CLIP, CON FUNDIDO
cam("""function cosaAgarra(){
  cosa.aturdida=11;
  cosa.estado='ronda'; cosa.metaCel=null;
  son('agarron');
  jug.dipV -= 3.2;                     // el sacudon
  emitir(jug.x, 1.2, jug.z, 1.0, 52);
  avisar(TX('aAgarro'), 3.0);
  /* de vuelta a la entrada, con los sellos puestos. No se pierde nada: perder progreso por un
     descuido en un juego a oscuras es la forma mas rapida de que lo cierren. */
  jug.x=XC(0); jug.z=ZC(0); jug.vx=0; jug.vz=0;
  cosaPonerLejos();
}""",
"""/* CAMBIAR DE ANDAR SE FUNDE, NO SE CORTA. Saltar de un clip a otro en un cuadro da un tiron que se
   ve aunque la criatura este a veinte metros y la ilumine una onda por medio segundo. */
function cosaClip(nombre, unaVez){
  if(!cosa.mixer || cosa.clip===nombre) return;
  const a=cosa.acciones[nombre];
  if(!a) return;
  a.reset();
  a.setLoop(unaVez? THREE.LoopOnce : THREE.LoopRepeat, unaVez? 1 : Infinity);
  a.clampWhenFinished = !!unaVez;
  a.enabled=true; a.setEffectiveWeight(1); a.play();
  if(cosa.accion && cosa.accion!==a) a.crossFadeFrom(cosa.accion, unaVez? 0.10 : 0.28, false);
  cosa.accion=a; cosa.clip=nombre;
}

/* EL SCREAMER. Antes esto era una linea: te agarraba y aparecias en la entrada en el mismo cuadro,
   sin ver nada. En un juego que es todo negro eso es tirar a la basura el unico momento que da
   miedo. Ahora se planta, te obliga a mirarla, grita — y el grito ENCIENDE EL MUNDO, porque la luz
   de este juego es el sonido y un grito es un sonido. Recien cuando termina te tira a la entrada. */
function cosaAgarra(){
  if(cosa.grito>0) return;
  cosa.grito=SCREAMER_DURA;
  cosa.vel=0; cosa.metaCel=null;
  cosa.giro=Math.atan2(jug.x-cosa.x, jug.z-cosa.z);
  cosaClip('screamer', true);
  son('screamer');
  jug.dipV -= 3.2;                     // el sacudon
  flashNivel=1; flashT=SCREAMER_DURA+0.20; flash=1;
  emitir(jug.x, 1.2, jug.z, 1.0, 60);
  avisar(TX('aAgarro'), 3.0);
}
function cosaSuelta(){
  cosa.grito=0;
  cosa.aturdida=9;
  cosa.estado='ronda'; cosa.metaCel=null;
  cosa.clip=null;
  /* de vuelta a la entrada, con las llaves puestas. No se pierde nada: perder progreso por un
     descuido en un juego a oscuras es la forma mas rapida de que lo cierren. */
  jug.x=XC(0); jug.z=ZC(0); jug.vx=0; jug.vz=0;
  cosaPonerLejos();
}""",
    "function cosaSuelta(){")

cam("""  if(cosa.aturdida>0){ cosa.aturdida-=dt; cosa.vel=0; return; }""",
"""  /* MIENTRAS GRITA NO SE MUEVE Y VOS TAMPOCO: la vista se te va sola hacia ella. Es lo unico del
     juego que le saca el control al jugador, y dura un segundo y medio. */
  if(cosa.grito>0){
    cosa.grito-=dt; cosa.vel=0;
    const gq=Math.atan2(cosa.x-jug.x, cosa.z-jug.z);
    let d=gq-jug.giro; while(d>Math.PI)d-=2*Math.PI; while(d<-Math.PI)d+=2*Math.PI;
    jug.giro += d*Math.min(1, dt*9);
    pitch += (Math.atan2(2.05-jug.y, Math.max(0.5,cosa.cerca)) - pitch)*Math.min(1, dt*7);
    cosa.g.rotation.y=cosa.giro;
    if(cosa.mixer) cosa.mixer.update(dt);
    if(cosa.grito<=0) cosaSuelta();
    return;
  }
  if(cosa.aturdida>0){ cosa.aturdida-=dt; cosa.vel=0; return; }""",
    "MIENTRAS GRITA NO SE MUEVE Y VOS TAMPOCO")

cam("""const cosa={ g:new THREE.Group(), x:0, z:0, vy:0, giro:0, fase:0, vel:0,
             meta:null, metaCel:null, estado:'duerme', t:0, aturdida:0, cerca:9e9 };""",
"""const cosa={ g:new THREE.Group(), x:0, z:0, vy:0, giro:0, fase:0, vel:0,
             meta:null, metaCel:null, estado:'duerme', t:0, aturdida:0, cerca:9e9,
             grito:0, clip:null, accion:null, acciones:{}, mixer:null };""",
    "grito:0, clip:null, accion:null, acciones:{}")

# ================================================= 3. LAS CUATRO ACCIONES AL CARGAR EL MODELO
cam("""  if(gl.animations && gl.animations.length){
    cosa.mixer=new THREE.AnimationMixer(raiz);
    cosa.accion=cosa.mixer.clipAction(gl.animations[0]);
    cosa.accion.play();
  }""",
"""  if(gl.animations && gl.animations.length){
    cosa.mixer=new THREE.AnimationMixer(raiz);
    for(const c of gl.animations) cosa.acciones[c.name]=cosa.mixer.clipAction(c);
    /* si el archivo no trajera alguno de los cuatro, se usa el primero para todos: mejor un andar
       repetido que un estado sin animacion, que se ve como una estatua deslizandose */
    for(const k of ['busqueda','caminar','correr','screamer'])
      if(!cosa.acciones[k]) cosa.acciones[k]=cosa.mixer.clipAction(gl.animations[0]);
    cosa.clip=null;
    cosaClip('busqueda');
  }""",
    "for(const c of gl.animations) cosa.acciones[c.name]")

# ================================================= 4. EL JUGADOR NO SE MUEVE MIENTRAS GRITA
cam("""  let ax=0, az=0;
  if(jugando && !notaAbierta){""",
"""  let ax=0, az=0;
  if(jugando && !notaAbierta && cosa.grito<=0){""",
    "if(jugando && !notaAbierta && cosa.grito<=0){")

# ================================================= 5. EL SONIDO DEL GRITO
cam("""    else if(tipo==='agarron'){""",
"""    /* EL GRITO DE LA COSA. Es el sonido mas fuerte del juego y tiene que serlo: es el unico momento
       en el que el juego habla mas fuerte que el jugador. Tres formantes que BAJAN —un grito que
       sube suena a persona, uno que baja suena a animal grande— sobre ruido aspero, con muy poca
       reverb en el ataque para que arranque pegado a la nuca y la cola larga despues. */
    else if(tipo==='screamer'){
      const ctx=AUD.ctx, t=ctx.currentTime;
      for(const [fr,q,v,dur] of [[520,2.2,0.62,1.15],[900,3.0,0.40,1.05],[1750,4.2,0.22,0.9]]){
        const src=ctx.createBufferSource(); src.buffer=AUD.ruido; src.loop=true;
        const bq=ctx.createBiquadFilter(); bq.type='bandpass'; bq.Q.value=q;
        bq.frequency.setValueAtTime(fr*1.35, t);
        bq.frequency.exponentialRampToValueAtTime(fr*0.55, t+dur);
        const g=ctx.createGain();
        g.gain.setValueAtTime(0.0001,t);
        g.gain.exponentialRampToValueAtTime(v, t+0.03);
        g.gain.setValueAtTime(v, t+dur*0.55);
        g.gain.exponentialRampToValueAtTime(0.0001, t+dur);
        src.connect(bq); bq.connect(g); g.connect(AUD.seco);
        const e=ctx.createGain(); e.gain.value=1.1; g.connect(e); e.connect(AUD.envio);
        src.start(t); src.stop(t+dur+0.05);
      }
      golpeRuido(0.7,'lowpass', 700, 60, 1.0, 0.8, 1.0);
      tono(58, 1.1, 0.34, 0.9, 'sawtooth');
    }
    else if(tipo==='agarron'){""",
    "else if(tipo==='screamer'){")

# ================================================= 6. LOS GANCHOS
cam("""  cosa:()=>({ estado:cosa.estado,""",
"""  /* los clips que trae el modelo y cual esta sonando: sin esto no hay forma de comprobar que el
     andar cambia con la distancia, que es justamente lo nuevo */
  clips:()=>({ hay:Object.keys(cosa.acciones),
               sonando:cosa.clip, grito:+cosa.grito.toFixed(2),
               ritmo:cosa.clip&&COSA_ANDAR[cosa.clip]? +(cosa.vel/COSA_ANDAR[cosa.clip].ritmo).toFixed(2) : null,
               dur:Object.keys(cosa.acciones).reduce((a,k)=>{ const c=cosa.acciones[k].getClip();
                     a[k]=+c.duration.toFixed(2); return a; }, {}) }),
  agarrar:()=>{ cosaAgarra(); return { grito:+cosa.grito.toFixed(2), clip:cosa.clip }; },
  cosa:()=>({ estado:cosa.estado, andar:cosa.clip, grito:+cosa.grito.toFixed(2),""",
    "  clips:()=>({ hay:Object.keys(cosa.acciones),")

io.open(RUTA,'w',encoding='utf-8').write(s)
print('CAMBIOS (%d):' % len(hechos))
for h in hechos: print('  +', h)
if saltados:
    print('YA ESTABAN (%d):' % len(saltados))
    for h in saltados: print('  =', h)
print('bytes: %d -> %d' % (ORIG, len(s)))
