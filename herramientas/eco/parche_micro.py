# -*- coding: utf-8 -*-
"""Eco pasa a jugarse CON EL MICROFONO, y con nada mas.

Pedido textual: *"que solamente te puedas mover pero no hagas ruido al caminar, que se use el
microfono y eso es lo unico que debes poder usar para ver alrededor y ya"*.

Las tres cosas, en orden:
  1. CAMINAR NO HACE NADA. Ni onda, ni sonido, ni la cosa se entera. Se fueron la pisada, el
     ruido del salto y el del aterrizaje. Moverse es gratis y es mudo.
  2. NO HAY BOTONES DE VOZ. Se fueron HABLAR y GRITAR, las teclas Q y E, y las dos esperas.
  3. EL MICROFONO ES LA UNICA LUZ. El nivel que entra por el microfono se convierte en el alcance
     de la onda: un susurro llega a seis metros, un grito a cincuenta. Y la cosa oye exactamente
     hasta donde vos ves, que es la regla que ya estaba y ahora es lo unico que hay que entender.

El guarda del parche es `if b in s: saltar` y NADA MAS.
"""
import io, sys

RUTA = 'juegos-pc/Eco.html'
s = io.open(RUTA, encoding='utf-8').read()
ORIG = len(s)
hechos, saltados = [], []

def cam(a, b, marca):
    global s
    if marca in s: saltados.append(marca[:48]); return
    if a not in s: print('NO ESTA:', repr(a[:100])); sys.exit(1)
    if s.count(a) != 1: print('APARECE %d VECES:' % s.count(a), repr(a[:100])); sys.exit(1)
    s = s.replace(a, b, 1); hechos.append(marca[:48])

def corte(desde, hasta, nuevo, marca):
    global s
    if marca in s: saltados.append(marca[:48]); return
    i = s.find(desde); j = s.find(hasta)
    if i < 0 or j < 0 or j <= i:
        print('TRAMO NO ESTA:', repr(desde[:70]), repr(hasta[:70])); sys.exit(1)
    s = s[:i] + nuevo + s[j:]; hechos.append(marca[:48])

def fuera(a, marca):
    cam(a, '', marca)

def camx(a, b):
    """cambio opcional: si el texto de origen ya no esta, es que ya se hizo. Se usa donde el
       resultado no deja una marca util que buscar (por ejemplo, borrar una linea)."""
    global s
    if a not in s: saltados.append(('opcional: '+a.strip()[:40])); return
    s = s.replace(a, b, 1); hechos.append(('opcional: '+a.strip()[:40]))

# ==================================================== 1. EL MICROFONO REEMPLAZA A LAS DOS VOCES
corte(
"""let gritoT=0, gritoMax=6.0;""",
"""/* ===================== EL SONIDO =====================""",
"""/* ===================== EL MICROFONO: LA UNICA LUZ QUE HAY =====================
   Antes habia dos botones, HABLAR y GRITAR, con dos esperas y dos alcances fijos. Eran una
   IMITACION de lo que este juego dice que es: apretar un boton no es hablar. Ahora entra el
   microfono de verdad y el alcance de la onda sale del nivel que entra por el: un susurro llega a
   seis metros y un grito a cincuenta, y todo lo del medio existe.

   DOS DECISIONES QUE NO SON OBVIAS:

   1. EL PISO SE MIDE, NO SE FIJA. Un microfono de telefono en una habitacion callada y uno de
      notebook al lado de un ventilador no dan ni parecido, y un umbral fijo deja el juego o
      encendido para siempre o apagado para siempre. Se escucha segundo y medio al empezar, se saca
      el promedio, y ese es el cero. Todo lo demas es "cuantas veces el piso", que es como funciona
      el oido.
   2. EL MICROFONO NO SE CONECTA AL MAESTRO. Si se conectara, el jugador se oiria a si mismo por los
      parlantes con el retardo del navegador: eso no es un efecto, es un acople. El microfono va
      SOLO al analizador. */
const MIC={ on:false, estado:'no', an:null, buf:null, piso:0.0035, nivel:0, k:0,
            cal:0, calS:0, calN:0, forzado:null, pico:0 };
const MIC_ALC_MIN=6, MIC_ALC_MAX=50;   // metros: de un susurro a un grito
const MIC_UMBRAL=1.9;                  // veces el piso medido. Debajo de esto no pasa nada.
const MIC_TOPE=28;                     // veces el piso: de aca para arriba ya es el alcance maximo
const MIC_CADA=0.22;                   // cada cuanto sale una onda mientras estas hablando
let micCada=0;
function micPintar(){
  const el=document.getElementById('micAviso');
  if(el){ el.textContent = MIC.estado==='si'? '' :
    (MIC.estado==='pidiendo'? TX('micPide') : MIC.estado==='no hay'? TX('micNoHay') : TX('micNo'));
    el.classList.toggle('ver', MIC.estado!=='si'); }
  document.body.classList.toggle('sinmic', MIC.estado!=='si' && MIC.estado!=='pidiendo');
}
function micPedir(){
  if(MIC.estado==='si' || MIC.estado==='pidiendo') return;
  if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){ MIC.estado='no hay'; micPintar(); return; }
  MIC.estado='pidiendo'; micPintar();
  /* las tres correcciones apagadas A PROPOSITO: la cancelacion de eco, el filtro de ruido y el
     control automatico de ganancia estan hechos para una videollamada, o sea para que todo llegue
     al mismo volumen. Acá el volumen ES el juego. */
  navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false, noiseSuppression:false, autoGainControl:false}})
    .then(st=>{
      audioIniciar();
      if(!AUD.ctx){ MIC.estado='no hay'; micPintar(); return; }
      const src=AUD.ctx.createMediaStreamSource(st);
      const an=AUD.ctx.createAnalyser(); an.fftSize=1024; an.smoothingTimeConstant=0.15;
      src.connect(an);
      MIC.an=an; MIC.buf=new Float32Array(an.fftSize);
      MIC.on=true; MIC.estado='si'; MIC.cal=1.5; MIC.calS=0; MIC.calN=0;
      micPintar();
    })
    .catch(()=>{ MIC.estado='no'; micPintar(); });
}
function micRms(){
  if(MIC.forzado!=null) return MIC.forzado;
  if(!MIC.an) return 0;
  MIC.an.getFloatTimeDomainData(MIC.buf);
  let s2=0; for(let i=0;i<MIC.buf.length;i++) s2+=MIC.buf[i]*MIC.buf[i];
  return Math.sqrt(s2/MIC.buf.length);
}
/* de cuantas veces el piso a un 0..1: EN ESCALA LOGARITMICA, porque el oido lo es. Lineal, hablar
   normal y gritar quedan los dos pegados arriba y el susurro no existe. */
function micK(rms){
  const g=rms/Math.max(MIC.piso,1e-6);
  if(g<=MIC_UMBRAL) return 0;
  return Math.max(0, Math.min(1, Math.log(g/MIC_UMBRAL)/Math.log(MIC_TOPE/MIC_UMBRAL)));
}
function micTick(dt){
  if(!MIC.on && MIC.forzado==null) return;
  const rms=micRms();
  MIC.pico=Math.max(rms, MIC.pico*0.92);
  if(MIC.cal>0){
    /* el segundo y medio de escucha: se guarda el promedio y ese pasa a ser el cero */
    MIC.cal-=dt; MIC.calS+=rms; MIC.calN++;
    if(MIC.cal<=0 && MIC.calN>0) MIC.piso=Math.max(0.0022, (MIC.calS/MIC.calN)*1.55);
    return;
  }
  const k=micK(rms);
  MIC.nivel += (k-MIC.nivel)*Math.min(1, dt*14);
  MIC.k=k;
  micCada-=dt;
  if(k<=0 || !jugando || ganado) return;
  if(micCada>0) return;
  micCada=MIC_CADA;
  voz(k);
}
/* UNA ONDA DE VOZ. Es lo unico que enciende el mundo. */
function voz(k){
  k=Math.max(0.02, Math.min(1, k));
  const alcance = MIC_ALC_MIN + (MIC_ALC_MAX-MIC_ALC_MIN)*k;
  /* el fogonazo va con el cuadrado: hablando bajo tiene que ALUMBRAR poco, no alumbrar lo mismo
     por menos tiempo. Y dura lo que dura el grito, no un numero fijo. */
  const niv=0.08+0.92*k*k, dura=0.18+1.5*k;
  if(niv>=flashNivel || flashT<=0){ flashNivel=niv; flashT=dura; flash=niv; }
  else flashT=Math.max(flashT, dura*0.5);
  micVeces++;
  if(k>0.55) micGritos++;
  ruido('eco', jug.x, jug.y, jug.z, 0.22+0.78*k, alcance);
  avisar('');
}
const FLASH_APAGA=0.55;
let flashT=0, flash=0, flashNivel=1;
let micVeces=0, micGritos=0;

""",
"const MIC={ on:false, estado:'no'")

# ==================================================== 2. CAMINAR NO HACE NADA
cam("""    ruido('salto', jug.x, 0.45, jug.z, 0.45, jug.agachado? 7 : 13, false);""",
    """    /* el salto es MUDO: no emite, no suena y la cosa no se entera */""",
    "/* el salto es MUDO: no emite")

cam("""      /* AGACHADO TAMBIEN SUENA AL CAER. Un aterrizaje es un golpe contra la piedra: que
         agacharse lo silenciara convertia el salto en un teletransporte mudo. */
      ruido('caida', jug.x, 0.25, jug.z, 0.50+0.45*golpe, (16+18*golpe)*(jug.agachado?0.55:1), false);""",
    """      /* y el aterrizaje tampoco suena: el cuerpo entero es mudo, la voz es lo unico que existe */""",
    "y el aterrizaje tampoco suena")

cam("""    if(cruzo) pisada(corriendo, jug.agachado);""",
    """    /* NO PASA NADA AL PISAR, y esa es la regla nueva. Antes una pisada se oia a quince metros y
       correr a veinticuatro, o sea que moverse era el riesgo. Ahora moverse es gratis: lo unico que
       existe en este laberinto es lo que sale de tu boca. */""",
    "NO PASA NADA AL PISAR, y esa es la regla nueva")

cam("""    const ZANC = corriendo? 4.3 : (jug.agachado? 2.6 : 3.4);
    const p0=jug.paso;""",
    """    const ZANC = corriendo? 4.3 : (jug.agachado? 2.6 : 3.4);
    const p0=jug.paso;   // el ciclo sigue: mueve las piernas y el bamboleo, no hace ruido""",
    "el ciclo sigue: mueve las piernas y el bamboleo")

# ==================================================== 3. SE VAN LOS BOTONES Y LAS TECLAS DE VOZ
cam("""  if(k==='e') gritar();
  if(k==='q') hablar();""",
    """  /* la tecla de respaldo: SOLO existe si el microfono no se pudo usar. Si no, el juego queda
     imposible de jugar en un aparato sin permiso, que es peor que tener un boton de mas. */
  if(k==='e' && MIC.estado!=='si' && MIC.estado!=='pidiendo') voz(0.62);""",
    "if(k==='e' && MIC.estado!=='si'")

cam("""tocar('bGrito',()=>gritar());
tocar('bHabla',()=>hablar());""",
    """tocar('bVoz',()=>voz(0.62));""",
    "tocar('bVoz',()=>voz(0.62));")

cam("""  <button id="bGrito" class="btn"><span data-i18n="bGritar"></span><div id="gritoAro"></div></button>
  <button id="bHabla" class="btn"><span data-i18n="bHablar"></span><div id="hablaAro"></div></button>""",
    """  <button id="bVoz" class="btn"><span data-i18n="bVoz"></span></button>""",
    'id="bVoz" class="btn"')

cam("""  #bGrito{ right:20px; bottom:118px; width:86px; height:86px; }
  /* con una hoja sin revelar al lado el boton late: en telefono no hay leyenda de teclas donde
     poner "grita aca", asi que lo dice el boton */
  body.hoja #bGrito{ animation:latirBoton 1.5s ease-in-out infinite; border-color:rgba(255,240,210,.55); }
  @keyframes latirBoton{ 0%,100%{ box-shadow:0 0 0 0 rgba(255,238,205,.00); }
                         50%{ box-shadow:0 0 0 9px rgba(255,238,205,.13); } }
  /* HABLAR VA AL LADO DE GRITAR y no abajo: son la misma accion en dos tamanos, y el pulgar
     derecho tiene que poder ir de una a la otra sin mirar. Mas chico que gritar a proposito. */
  #bHabla{ right:112px; bottom:124px; width:74px; height:74px; font-size:9px; }
  #bSalto{ right:118px; bottom:30px; width:66px; height:66px; }""",
    """  /* EL BOTON DE VOZ ES UN RESPALDO Y NADA MAS. Solo aparece si el microfono no se pudo usar:
     con el microfono andando no existe, porque el juego es el microfono. */
  #bVoz{ right:20px; bottom:118px; width:86px; height:86px; display:none !important; }
  body.sinmic.jugando #bVoz{ display:flex !important; }
  @keyframes latirBoton{ 0%,100%{ box-shadow:0 0 0 0 rgba(255,238,205,.00); }
                         50%{ box-shadow:0 0 0 9px rgba(255,238,205,.13); } }
  /* ---------- EL MEDIDOR DEL MICROFONO ----------
     En un juego a oscuras que se maneja con la voz hace falta ver que el microfono esta entrando:
     sin esto, "no pasa nada" no distingue "no me esta oyendo" de "hablo demasiado bajo", y el
     jugador no tiene forma de saber cual de las dos. Es la unica pieza de HUD que se agrega. */
  #mic{ position:absolute; left:50%; bottom:22px; transform:translateX(-50%); z-index:21;
    width:min(320px, 52%); display:none; flex-direction:column; align-items:center; gap:5px;
    pointer-events:none; }
  body.jugando #mic{ display:flex; }
  body.tutorial #mic{ bottom:auto; top:calc(50% + 96px); }
  #micB{ width:100%; height:7px; border-radius:99px; background:rgba(255,255,255,.07);
    box-shadow:inset 0 0 0 1px rgba(255,255,255,.09); overflow:hidden; }
  #micB i{ display:block; height:100%; width:0%; border-radius:99px;
    background:linear-gradient(90deg, rgba(150,178,205,.75), rgba(255,238,205,.95));
    transition:width .06s linear; }
  /* la marca del umbral: debajo de ahi no sale ninguna onda, y verlo explica el juego solo */
  #micU{ position:absolute; top:0; bottom:0; width:1.5px; background:rgba(255,255,255,.28); }
  #micT{ font-size:max(10px, calc(9.5px * var(--esc,1))); font-weight:900; letter-spacing:.12em;
    color:rgba(214,226,238,.72); text-shadow:0 1px 6px rgba(0,0,0,.95); }
  #micAviso{ position:absolute; left:50%; top:calc(50% + 130px); transform:translateX(-50%);
    z-index:24; max-width:80%; text-align:center; opacity:0; transition:opacity .4s ease;
    font-size:max(12px, calc(11px * var(--esc,1))); font-weight:800; letter-spacing:.06em;
    line-height:1.5; color:rgba(255,226,196,.95); text-shadow:0 1px 8px rgba(0,0,0,.98);
    background:rgba(6,9,14,.62); padding:8px 14px; border-radius:12px; pointer-events:none; }
  #micAviso.ver{ opacity:1; }
  #bSalto{ right:118px; bottom:30px; width:66px; height:66px; }""",
    "#bVoz{ right:20px; bottom:118px;")

# fuera el aro de espera del grito: ya no hay espera que mostrar
camx("""  #gritoAro, #hablaAro{ position:absolute; inset:-4px; border-radius:50%; pointer-events:none;
    background:conic-gradient(rgba(255,255,255,.34) var(--g,0%), rgba(0,0,0,0) 0); }\n""", "")

cam("""    <div id="guia"><div id="guiaF">▲</div><div id="guiaD"></div></div>""",
    """    <div id="guia"><div id="guiaF">▲</div><div id="guiaD"></div></div>
    <div id="mic"><div id="micB"><i></i><div id="micU"></div></div><div id="micT"></div></div>
    <div id="micAviso"></div>""",
    'id="mic"><div id="micB">')

cam("""    ['C / Ctrl',TX('kAgachar')],['Space',TX('kSaltar')],
    ['Q',TX('kHablar')],['E',TX('kGritar')],['F',TX('kLeer')],['Esc',TX('kEsc')]""",
    """    ['C / Ctrl',TX('kAgachar')],['Space',TX('kSaltar')],
    ['🎤',TX('kVoz')],['F',TX('kLeer')],['Esc',TX('kEsc')]""",
    "['🎤',TX('kVoz')]")

# ==================================================== 4. ENGANCHARLO AL BUCLE Y AL ARRANQUE
cam("""  if(gritoT>0){ gritoT-=dt;
    const aro=document.getElementById('gritoAro');
    if(aro) aro.style.setProperty('--g', (100*(1-gritoT/gritoMax)).toFixed(0)+'%');
  }
  if(hablaT>0){ hablaT-=dt;
    const aro=document.getElementById('hablaAro');
    if(aro) aro.style.setProperty('--g', (100*(1-hablaT/HABLA_ESPERA)).toFixed(0)+'%');
  }""",
    """  micTick(dt);
  {
    /* el medidor. La barra es el nivel de ahora; la marca fija es el umbral, o sea donde empieza a
       verse algo. El rotulo dice METROS y no un porcentaje: metros es lo que el jugador usa para
       decidir, y ademas es exactamente lo que la cosa te oye. */
    const bi=document.querySelector('#micB i'), bt=document.getElementById('micT'),
          bu=document.getElementById('micU');
    if(bi){
      const g=micRms()/Math.max(MIC.piso,1e-6);
      const cru=Math.max(0, Math.min(1, Math.log(Math.max(g,0.5)/1)/Math.log(MIC_TOPE*1.6)));
      bi.style.width=(cru*100).toFixed(1)+'%';
      const u=Math.log(MIC_UMBRAL)/Math.log(MIC_TOPE*1.6);
      if(bu) bu.style.left=(u*100).toFixed(1)+'%';
      if(bt) bt.textContent = MIC.cal>0? TX('micCal')
        : (MIC.k>0? TX('micAlc',{n:Math.round(MIC_ALC_MIN+(MIC_ALC_MAX-MIC_ALC_MIN)*MIC.k)})
                  : TX('micCallado'));
    }
  }""",
    "  micTick(dt);")

cam("""  audioIniciar(); cargarAmbiente(); ambiente('ambJuego');
  menuEl.classList.add('ir');""",
    """  audioIniciar(); cargarAmbiente(); ambiente('ambJuego');
  /* EL PERMISO SE PIDE ACA Y NO AL CARGAR. Un navegador solo abre el cartel del microfono desde un
     gesto del usuario, y ademas pedirlo antes de que se sepa para que es garantiza que lo nieguen. */
  micPedir();
  menuEl.classList.add('ir');""",
    "  micPedir();\n  menuEl.classList.add('ir');")

# ==================================================== 5. EL SONIDO DEL ECO
cam("""    /* LA VOZ HABLADA: el mismo aparato del grito pero corto, mas grave y con la mitad de reverb.
       No es un grito bajito: un grito bajito suena a grito lejano y confunde la distancia. */
    else if(tipo==='voz'){""",
    """    /* EL ECO DE TU PROPIA VOZ. Ojo con esto: el jugador YA se oyo a si mismo, con sus orejas y
       sin retardo. Repetirle una voz sintetizada encima suena a doblaje mal hecho. Lo que devuelve
       el juego es solo la COLA: casi nada de seco y casi todo a la reverb, o sea la piedra
       contestando. Y va bajo a proposito — si sale fuerte por el parlante, el microfono lo vuelve a
       tomar y el laberinto se enciende solo. */
    else if(tipo==='eco'){
      const ctx=AUD.ctx, t=ctx.currentTime;
      const src=ctx.createBufferSource(); src.buffer=AUD.ruido; src.loop=true;
      const bq=ctx.createBiquadFilter(); bq.type='bandpass'; bq.Q.value=1.1;
      bq.frequency.setValueAtTime(700+900*f, t);
      bq.frequency.exponentialRampToValueAtTime(300+320*f, t+0.30);
      const g=ctx.createGain();
      g.gain.setValueAtTime(0.0001,t);
      g.gain.exponentialRampToValueAtTime(0.09*f+0.01, t+0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t+0.34);
      src.connect(bq); bq.connect(g);
      const sec=ctx.createGain(); sec.gain.value=0.16; g.connect(sec); sec.connect(AUD.seco);
      const e=ctx.createGain(); e.gain.value=2.4; g.connect(e); e.connect(AUD.envio);
      src.start(t); src.stop(t+0.42);
    }
    else if(tipo==='voz'){""",
    "else if(tipo==='eco'){")

# ==================================================== 6. LOS TEXTOS
cam(""" bGritar:{en:'SHOUT', es:'GRITAR', pt:'GRITAR'},
 bHablar:{en:'TALK', es:'HABLAR', pt:'FALAR'},""",
    """ bVoz:{en:'VOICE', es:'VOZ', pt:'VOZ'},
 /* el microfono */
 micPide:{en:'ALLOW THE MICROPHONE · it is the only way to see', es:'DEJÁ USAR EL MICRÓFONO · es la única forma de ver', pt:'PERMITA O MICROFONE · é o único jeito de ver'},
 micNo:{en:'NO MICROPHONE · the button and E light the way instead', es:'SIN MICRÓFONO · el botón y la E encienden en su lugar', pt:'SEM MICROFONE · o botão e a tecla E acendem no lugar'},
 micNoHay:{en:'THIS DEVICE HAS NO MICROPHONE · use the button or E', es:'ESTE APARATO NO TIENE MICRÓFONO · usá el botón o la E', pt:'ESTE APARELHO NÃO TEM MICROFONE · use o botão ou E'},
 micCal:{en:'LISTENING TO THE ROOM…', es:'ESCUCHANDO LA SALA…', pt:'ESCUTANDO A SALA…'},
 micCallado:{en:'SILENT · make a sound to see', es:'CALLADO · hacé un sonido para ver', pt:'CALADO · faça um som para ver'},
 micAlc:{en:'{n} m · and it hears you that far', es:'{n} m · y te oye hasta ahí', pt:'{n} m · e ela te ouve até lá'},""",
    "bVoz:{en:'VOICE'")

cam(""" kGritar:{en:'shout · you see far, it hears far', es:'gritar · ves lejos, te oye lejos', pt:'gritar · vê longe, ela ouve longe'},
 kHablar:{en:'talk · you see one room', es:'hablar · ves una sala', pt:'falar · vê uma sala'},""",
    """ kVoz:{en:'your voice · the louder, the further you see', es:'tu voz · cuanto más fuerte, más lejos ves', pt:'sua voz · quanto mais alto, mais longe você vê'},""",
    "kVoz:{en:'your voice · the louder")

cam(""" kAgachar:{en:'crouch · almost silent', es:'agacharse · casi mudo', pt:'agachar · quase mudo'},""",
    """ kAgachar:{en:'crouch · fit through low places', es:'agacharse · pasar por lo bajo', pt:'agachar · passar por baixo'},""",
    "kAgachar:{en:'crouch · fit through low places'")

cam(""" kSaltar:{en:'jump · it makes a lot of noise', es:'saltar · hace mucho ruido', pt:'pular · faz muito barulho'},""",
    """ kSaltar:{en:'jump', es:'saltar', pt:'pular'},""",
    "kSaltar:{en:'jump', es:'saltar', pt:'pular'},")

cam(""" hAgachado:{en:'CROUCHED · ALMOST SILENT', es:'AGACHADO · CASI MUDO', pt:'AGACHADO · QUASE MUDO'},
 hOye:{en:'IT HEARS YOU {n} m AWAY', es:'TE OYE A {n} m', pt:'TE OUVE A {n} m'},""",
    """ hAgachado:{en:'CROUCHED', es:'AGACHADO', pt:'AGACHADO'},""",
    "hAgachado:{en:'CROUCHED', es:'AGACHADO', pt:'AGACHADO'},")

cam(""" hSilencio:{en:'SILENCE', es:'SILENCIO', pt:'SILÊNCIO'},""",
    """ hSilencio:{en:'YOUR STEPS MAKE NO SOUND', es:'TUS PASOS NO SUENAN', pt:'SEUS PASSOS NÃO SOAM'},""",
    "hSilencio:{en:'YOUR STEPS MAKE NO SOUND'")

# ---- las fichas del menu ----
cam(""" f1b:{en:'Your feet do not light anything. <b>Only your voice does.</b> <b>Talk</b> and you see one room for a moment; <b>shout</b> and the whole maze lights up for two seconds.',
      es:'Los pies no encienden nada. <b>Solo la voz.</b> <b>Hablá</b> y ves una sala por un momento; <b>gritá</b> y se te enciende el laberinto entero dos segundos.',
      pt:'Os pés não acendem nada. <b>Só a voz.</b> <b>Fale</b> e vê uma sala por um instante; <b>grite</b> e o labirinto inteiro acende por dois segundos.'},""",
    """ f1b:{en:'There are no buttons. The game uses <b>your real microphone</b>: whatever you say out loud is the only light there is. A whisper draws six metres of stone; a shout draws fifty.',
      es:'No hay botones. El juego usa <b>tu micrófono de verdad</b>: lo que decís en voz alta es la única luz que hay. Un susurro dibuja seis metros de piedra; un grito, cincuenta.',
      pt:'Não há botões. O jogo usa <b>seu microfone de verdade</b>: o que você diz em voz alta é a única luz que existe. Um sussurro desenha seis metros de pedra; um grito, cinquenta.'},""",
    "f1b:{en:'There are no buttons")

cam(""" f2b:{en:'There is <b>a thing</b> down here and it hunts by sound. It hears exactly as far as you see: a shout shows you the maze and hands it your address. <b>Crouched you are almost silent</b> — blind, but almost silent.',
      es:'Hay <b>una cosa</b> acá abajo y caza por el ruido. Oye exactamente lo mismo que vos ves: un grito te muestra el laberinto y le da tu dirección. <b>Agachado casi no hacés ruido</b> — a ciegas, pero casi mudo.',
      pt:'Há <b>uma coisa</b> aqui embaixo e ela caça pelo som. Ouve exatamente o quanto você vê: um grito te mostra o labirinto e dá o seu endereço a ela. <b>Agachado você é quase mudo</b> — às cegas, mas quase mudo.'},""",
    """ f2b:{en:'There is <b>a thing</b> down here and it hunts by sound. It hears <b>exactly as far as you see</b>. Walking costs nothing — your feet make no sound at all. Only your voice does, and every time you use it you are also telling it where you are.',
      es:'Hay <b>una cosa</b> acá abajo y caza por el ruido. Oye <b>exactamente hasta donde ves</b>. Caminar no cuesta nada: tus pies no hacen ningún sonido. Sólo la voz, y cada vez que la usás también le estás diciendo dónde estás.',
      pt:'Há <b>uma coisa</b> aqui embaixo e ela caça pelo som. Ouve <b>exatamente até onde você vê</b>. Andar não custa nada: seus pés não fazem som nenhum. Só a voz, e cada vez que você a usa também está dizendo a ela onde você está.'},""",
    "f2b:{en:'There is <b>a thing</b> down here and it hunts by sound. It hears <b>exactly")

cam(""" f3b:{en:'There are <b>four keys</b>, one in each of the four big rooms. A key <b>answers</b> when your voice reaches it: shout, wait, and if something rings you know where to go. Four keys open the door.',
      es:'Hay <b>cuatro llaves</b>, una en cada una de las cuatro salas grandes. La llave <b>contesta</b> cuando tu voz llega hasta ella: gritá, esperá, y si algo suena ya sabés para dónde ir. Cuatro llaves abren la puerta.',
      pt:'Há <b>quatro chaves</b>, uma em cada uma das quatro salas grandes. A chave <b>responde</b> quando sua voz chega até ela: grite, espere, e se algo soar você já sabe para onde ir. Quatro chaves abrem a porta.'},""",
    """ f3b:{en:'There are <b>four keys</b>, one in each of the four big rooms. A key <b>rings back</b> when your voice reaches it — late, because the sound has to travel there and back. Shout, then shut up and listen. Four keys open the door.',
      es:'Hay <b>cuatro llaves</b>, una en cada una de las cuatro salas grandes. La llave <b>contesta</b> cuando tu voz llega hasta ella — tarde, porque el sonido tiene que ir y volver. Gritá, después callate y escuchá. Cuatro llaves abren la puerta.',
      pt:'Há <b>quatro chaves</b>, uma em cada uma das quatro salas grandes. A chave <b>responde</b> quando sua voz chega até ela — tarde, porque o som tem que ir e voltar. Grite, depois cale-se e escute. Quatro chaves abrem a porta.'},""",
    "f3b:{en:'There are <b>four keys</b>, one in each of the four big rooms. A key <b>rings back</b>")

# ---- el tutorial ----
corte(
""" /* tutorial */
 t0:""",
"""};
/* SE LLAMA TX Y NO t A PROPOSITO.""",
""" /* tutorial */
 t0:{en:'MOVE', es:'MOVETE', pt:'ANDE'},
 t0s:{en:'walk all you want: your feet make no sound and light nothing', es:'caminá todo lo que quieras: tus pies no suenan ni encienden nada', pt:'ande o quanto quiser: seus pés não soam nem acendem nada'},
 t0kPC:{en:'W A S D', es:'W A S D', pt:'W A S D'},
 t0kMov:{en:'drag the joystick', es:'arrastrá el joystick', pt:'arraste o joystick'},
 t1:{en:'NOW SAY SOMETHING OUT LOUD', es:'AHORA DECÍ ALGO EN VOZ ALTA', pt:'AGORA DIGA ALGO EM VOZ ALTA'},
 t1s:{en:'your real voice, into the microphone · it is the only light down here', es:'tu voz de verdad, al micrófono · es la única luz que hay acá abajo', pt:'sua voz de verdade, no microfone · é a única luz que existe aqui embaixo'},
 t1kPC:{en:'speak', es:'hablá', pt:'fale'},
 t1kMov:{en:'speak', es:'hablá', pt:'fale'},
 t2:{en:'NOW SHOUT', es:'AHORA GRITÁ', pt:'AGORA GRITE'},
 t2s:{en:'the louder you are, the further you see · fifty metres at the top of your lungs', es:'cuanto más fuerte, más lejos ves · cincuenta metros a todo pulmón', pt:'quanto mais alto, mais longe você vê · cinquenta metros a plenos pulmões'},
 t2kMov:{en:'shout', es:'gritá', pt:'grite'},
 t3:{en:'SHUT UP AND LISTEN', es:'CALLATE Y ESCUCHÁ', pt:'CALE-SE E ESCUTE'},
 t3s:{en:'if a key was in range it rings back a moment later · then the arrow knows where it is · go and take it', es:'si una llave quedó al alcance, contesta un momento después · ahí la flecha ya sabe dónde está · andá y agarrala', pt:'se uma chave ficou ao alcance, ela responde um instante depois · aí a seta já sabe onde está · vá e pegue'},
 t4:{en:'FOUR KEYS AND THE DOOR OPENS', es:'CUATRO LLAVES Y LA PUERTA ABRE', pt:'QUATRO CHAVES E A PORTA ABRE'},
 t4s:{en:'from here on something is hunting you · it hears exactly as far as you see, so the loudest shout is also the most expensive one', es:'de acá en más algo te caza · te oye exactamente hasta donde ves, así que el grito más fuerte es también el más caro', pt:'daqui em diante algo te caça · te ouve exatamente até onde você vê, então o grito mais alto é também o mais caro'}
};
/* SE LLAMA TX Y NO t A PROPOSITO.""",
"t1:{en:'NOW SAY SOMETHING OUT LOUD'")

corte(
"""const TUTO=[
  { t:()=>TX('t0')""",
"""function tutoTick(dt){""",
"""const TUTO=[
  { t:()=>TX('t0'), s:()=>TX('t0s'), k:()=>plataf==='pc'? TX('t0kPC') : TX('t0kMov'),
    p:()=>Math.min(1, tutoAndado/4), ok:()=>tutoAndado>4 },
  { t:()=>TX('t1'), s:()=>TX('t1s'), k:()=>plataf==='pc'? TX('t1kPC') : TX('t1kMov'),
    p:()=>Math.min(1, micVeces/3), ok:()=>micVeces>=3 },
  { t:()=>TX('t2'), s:()=>TX('t2s'), k:()=>TX('t2kMov'),
    p:()=>Math.min(1, micGritos/2), ok:()=>micGritos>=2 },
  { t:()=>TX('t3'), s:()=>TX('t3s'), k:()=>'',
    p:()=>Math.min(1, nSellos()? 1 : tutoT/70), ok:()=>nSellos()>0 || tutoT>70 },
  { t:()=>TX('t4'), s:()=>TX('t4s'), k:()=>'',
    p:()=>Math.min(1, tutoT/6), ok:()=>tutoT>6 }
];
""",
"p:()=>Math.min(1, micVeces/3), ok:()=>micVeces>=3 },")

cam("""let tutoPaso=0, tutoT=0, tutoAndado=0, tutoGritos=0, tutoHablas=0, tutoListo=false;""",
    """let tutoPaso=0, tutoT=0, tutoAndado=0, tutoListo=false;""",
    "let tutoPaso=0, tutoT=0, tutoAndado=0, tutoListo=false;")

# ==================================================== 7. EL ROTULO DE ARRIBA
cam("""  const ecoEl=document.getElementById('eco');
  if(ecoEl){ jug.ruido += (((jug.agachado?0:velH)/5.5) - jug.ruido)*Math.min(1,dt*4);
    ecoEl.style.color='rgba(190,205,220,'+(0.22+jug.ruido*0.62).toFixed(2)+')';
    if(cosa.estado!=='duerme' && cosa.aturdida<=0 && cosa.cerca<14){
      ecoEl.style.color='rgba(255,120,96,'+(0.45+0.55*Math.max(0,1-cosa.cerca/14)).toFixed(2)+')';
      ecoEl.textContent = cosa.cerca<6? TX('hEncima') : TX('hSigue');
    } else if(!ganado && velH>0.30){
      /* EL ROTULO DICE UN NUMERO, no un adjetivo. "RUIDO" no le sirve a nadie para decidir; "te oye
         a 24 m" es la unica lectura con la que se puede elegir entre correr y agacharse. Y es el
         MISMO numero que usa la cosa, no una estimacion: sale de la misma tabla. */
      ecoEl.textContent = TX('hOye', {n: jug.agachado? 4 : (corriendo? 24 : 15)});
    } else
    ecoEl.textContent = ganado? TX('hSalida') : jug.agachado? TX('hAgachado') : TX('hSilencio'); }""",
"""  const ecoEl=document.getElementById('eco');
  if(ecoEl){
    /* EL RUIDO YA NO SALE DE LA VELOCIDAD, sale del microfono: caminar no hace ruido, asi que
       medirlo por lo rapido que vas seria mentir en la unica linea que el jugador mira. */
    jug.ruido += (MIC.nivel - jug.ruido)*Math.min(1,dt*8);
    ecoEl.style.color='rgba(190,205,220,'+(0.22+jug.ruido*0.62).toFixed(2)+')';
    if(cosa.estado!=='duerme' && cosa.aturdida<=0 && cosa.cerca<14){
      ecoEl.style.color='rgba(255,120,96,'+(0.45+0.55*Math.max(0,1-cosa.cerca/14)).toFixed(2)+')';
      ecoEl.textContent = cosa.cerca<6? TX('hEncima') : TX('hSigue');
    } else
    ecoEl.textContent = ganado? TX('hSalida') : jug.agachado? TX('hAgachado') : TX('hSilencio'); }""",
    "EL RUIDO YA NO SALE DE LA VELOCIDAD, sale del microfono")

# ==================================================== 8. LAS HOJAS
corte(
"""const HOJAS={
 n0:""",
"""};

/* ===================== QUE APARATO ES ESTE =====================""",
"""const HOJAS={
 n0:{en:'There is no light down here. There never was, so stop looking for it.<br>'+
        'And do not count on your feet: <b>walking makes no sound at all</b>. You can run this whole place end to end and never see a wall, and nothing will ever hear you doing it.<br>'+
        'What you see is <b>your own voice coming back</b>. Speak out loud and the stone answers. That is the only light there is.<br>'+
        'The door at the end has four locks. There are <b>four keys</b>, one in each of the big rooms.<br>'+
        'Read the next pages before you shout again. There is a reason I stopped shouting.',
     es:'No hay luz acá abajo. Nunca hubo, y no la busques.<br>'+
        'Y no cuentes con los pies: <b>caminar no hace ningún ruido</b>. Podés cruzar todo esto corriendo de punta a punta y no ver una pared, y nada te va a oír hacerlo.<br>'+
        'Lo que ves es <b>tu propia voz que vuelve</b>. Hablá en voz alta y la piedra contesta. Es la única luz que hay.<br>'+
        'La puerta del final tiene cuatro cerraduras. Hay <b>cuatro llaves</b>, una en cada sala grande.<br>'+
        'Leé las hojas que siguen antes de volver a gritar. Por algo yo dejé de gritar.',
     pt:'Não há luz aqui embaixo. Nunca houve, e não a procure.<br>'+
        'E não conte com os pés: <b>andar não faz barulho nenhum</b>. Você pode atravessar isto correndo de ponta a ponta e não ver uma parede, e nada vai te ouvir fazendo isso.<br>'+
        'O que você vê é <b>sua própria voz voltando</b>. Fale em voz alta e a pedra responde. É a única luz que existe.<br>'+
        'A porta do fim tem quatro fechaduras. Há <b>quatro chaves</b>, uma em cada sala grande.<br>'+
        'Leia as folhas seguintes antes de gritar de novo. Por algo eu parei de gritar.'},
 n1:{en:'It is not <i>whether</i> you speak. It is <b>how loud</b>.<br>'+
        'A whisper reaches about six metres: the room you are standing in, and nothing else. Talking normally reaches maybe twenty. A real shout, everything you have, reaches fifty — and fifty is the whole maze.<br>'+
        'Everything in between exists too. You are not choosing between two buttons; you are choosing a distance, and you choose it with your throat.<br>'+
        'So learn to be quiet. Most of the time six metres is all you need, and six metres is almost free.',
     es:'No es <i>si</i> hablás. Es <b>qué tan fuerte</b>.<br>'+
        'Un susurro llega a unos seis metros: la sala en la que estás, y nada más. Hablando normal llegás a veinte. Un grito de verdad, con todo, llega a cincuenta — y cincuenta es el laberinto entero.<br>'+
        'Todo lo del medio también existe. No estás eligiendo entre dos botones: estás eligiendo una distancia, y la elegís con la garganta.<br>'+
        'Así que aprendé a hablar bajo. Casi siempre seis metros alcanzan, y seis metros no cuestan casi nada.',
     pt:'Não é <i>se</i> você fala. É <b>quão alto</b>.<br>'+
        'Um sussurro chega a uns seis metros: a sala onde você está, e nada mais. Falando normal chega a vinte. Um grito de verdade, com tudo, chega a cinquenta — e cinquenta é o labirinto inteiro.<br>'+
        'Tudo o que está no meio também existe. Você não escolhe entre dois botões: escolhe uma distância, e escolhe com a garganta.<br>'+
        'Então aprenda a falar baixo. Quase sempre seis metros bastam, e seis metros quase não custam nada.'},
 n2:{en:'It hears exactly as far as you see. That is the whole trade, and once you understand it there is nothing else to learn here.<br>'+
        'Fifty metres of maze for fifty metres of address. Six for six.<br>'+
        'And notice what is <b>not</b> on that list: your feet. Walking, running, jumping, landing — <b>none of it makes a sound</b>. You can cross a room at a dead run while it stands in the doorway, and if you keep your mouth shut it will not know.<br>'+
        'That is the only advantage you have. Do not throw it away by narrating.',
     es:'Te oye exactamente hasta donde ves. Ese es todo el trato, y cuando lo entendés no queda nada más que aprender acá.<br>'+
        'Cincuenta metros de laberinto por cincuenta metros de dirección. Seis por seis.<br>'+
        'Y fijate qué <b>no</b> está en esa lista: tus pies. Caminar, correr, saltar, aterrizar — <b>nada de eso suena</b>. Podés cruzar una sala a la carrera con la cosa parada en la puerta, y si tenés la boca cerrada no se entera.<br>'+
        'Es la única ventaja que tenés. No la tires hablando de más.',
     pt:'Ela ouve exatamente até onde você vê. Esse é todo o trato, e quando você entende não sobra mais nada para aprender aqui.<br>'+
        'Cinquenta metros de labirinto por cinquenta metros de endereço. Seis por seis.<br>'+
        'E repare no que <b>não</b> está nessa lista: seus pés. Andar, correr, pular, cair — <b>nada disso soa</b>. Você pode atravessar uma sala correndo com a coisa parada na porta, e se ficar de boca fechada ela não percebe.<br>'+
        'É a única vantagem que você tem. Não a jogue fora falando demais.'},
 n3:{en:'I never got a good look at it, and I looked at it more than I wanted to.<br>'+
        'It walks. It does not come out of nowhere — it walks toward the last thing it heard, and it keeps walking after you go quiet, because it remembers where the sound was.<br>'+
        '<b>You are faster than it.</b> And running costs you nothing now. That is the trick and it is the whole trick: <b>make a noise, then leave without making another one</b>. It goes to the noise. You are not there.<br>'+
        'If it catches you it does not kill you. It throws you back to the entrance. You keep the keys, you lose the walk.',
     es:'Nunca la vi bien, y la miré más de lo que quise.<br>'+
        'Camina. No aparece de la nada: camina hacia lo último que oyó, y sigue caminando después de que te callaste, porque se acuerda de dónde estaba el sonido.<br>'+
        '<b>Sos más rápido que ella.</b> Y correr ahora no te cuesta nada. Ese es el truco y es todo el truco: <b>hacé un ruido y después andate sin hacer otro</b>. Ella va al ruido. Vos ya no estás ahí.<br>'+
        'Si te agarra no te mata. Te tira de vuelta a la entrada. Las llaves te las quedás; lo que perdés es la caminata.',
     pt:'Nunca a vi direito, e olhei mais do que queria.<br>'+
        'Ela anda. Não aparece do nada: anda até a última coisa que ouviu, e continua andando depois que você se cala, porque lembra onde o som estava.<br>'+
        '<b>Você é mais rápido que ela.</b> E correr agora não custa nada. Esse é o truque e é o truque inteiro: <b>faça um barulho e depois vá embora sem fazer outro</b>. Ela vai ao barulho. Você já não está lá.<br>'+
        'Se ela te pega, não te mata. Te joga de volta para a entrada. As chaves você mantém; o que perde é a caminhada.'},
 n4:{en:'The keys ring back. That is the only reason I found any of them.<br>'+
        'When your voice reaches a key, the key <b>answers</b> — a short bright ring, a moment after you speak, because the sound has to travel there and back. A ring three seconds later means twenty metres. A ring straight away means it is beside you.<br>'+
        'Each one sits in the middle of one of the <b>four big rooms</b>, the ones with a column in the centre.<br>'+
        'So searching is not walking everywhere. It is walking somewhere new, <b>shouting once</b>, and then keeping absolutely quiet for two seconds.<br>'+
        'And then getting out of there, because you just told it where you are standing.',
     es:'Las llaves contestan. Es la única razón por la que encontré alguna.<br>'+
        'Cuando tu voz llega hasta una llave, la llave <b>contesta</b> — un tintineo corto y claro, un momento después de que hablás, porque el sonido tiene que ir y volver. Un tintineo a los tres segundos quiere decir veinte metros. Uno inmediato quiere decir que la tenés al lado.<br>'+
        'Cada una está en el medio de una de las <b>cuatro salas grandes</b>, las que tienen una columna en el centro.<br>'+
        'Así que buscar no es caminar por todos lados. Es caminar hasta algún lugar nuevo, <b>gritar una vez</b>, y después quedarse absolutamente callado dos segundos.<br>'+
        'Y después irte de ahí, porque acabás de decirle dónde estás parado.',
     pt:'As chaves respondem. É a única razão pela qual achei alguma.<br>'+
        'Quando sua voz chega a uma chave, ela <b>responde</b> — um tinido curto e claro, um instante depois de você falar, porque o som tem que ir e voltar. Um tinido três segundos depois quer dizer vinte metros. Um imediato quer dizer que está ao seu lado.<br>'+
        'Cada uma fica no meio de uma das <b>quatro salas grandes</b>, as que têm uma coluna no centro.<br>'+
        'Então procurar não é andar por todo lado. É andar até algum lugar novo, <b>gritar uma vez</b>, e depois ficar absolutamente calado por dois segundos.<br>'+
        'E depois sair dali, porque você acabou de dizer onde está parado.'},
 n5:{en:'This is where it ends, and this is where I stayed.<br>'+
        'The door has <b>four locks</b> and it does not open with three. The four dots at the top of the screen are the keys: they light up one by one.<br>'+
        'With the four in place the door <b>pulses</b> every time you use your voice, and you feel it from far away. You will know which way to go without looking for it.<br>'+
        'I had three. I shouted at the door because I was angry, and it heard me, and I did not get to look for the fourth.<br>'+
        'Do not shout at the door. Walk to it in silence — and you can, because your feet do not make a sound.',
     es:'Acá termina, y acá me quedé.<br>'+
        'La puerta tiene <b>cuatro cerraduras</b> y no se abre con tres. Los cuatro puntos de arriba de la pantalla son las llaves: se van encendiendo de a una.<br>'+
        'Con las cuatro puestas, la puerta <b>late</b> cada vez que usás la voz, y se siente desde lejos. Vas a saber para dónde ir sin buscarla.<br>'+
        'Yo tenía tres. Le grité a la puerta de rabia, y me oyó, y no llegué a buscar la cuarta.<br>'+
        'No le grites a la puerta. Andá hasta ella en silencio — y podés, porque tus pies no hacen ningún ruido.',
     pt:'Aqui termina, e aqui eu fiquei.<br>'+
        'A porta tem <b>quatro fechaduras</b> e não abre com três. Os quatro pontos no alto da tela são as chaves: acendem uma a uma.<br>'+
        'Com as quatro postas, a porta <b>pulsa</b> cada vez que você usa a voz, e se sente de longe. Você vai saber para onde ir sem procurar.<br>'+
        'Eu tinha três. Gritei para a porta de raiva, e ela me ouviu, e não cheguei a procurar a quarta.<br>'+
        'Não grite para a porta. Vá até ela em silêncio — e você pode, porque seus pés não fazem barulho nenhum.'}
};

/* ===================== QUE APARATO ES ESTE =====================""",
"n1:{en:'It is not <i>whether</i> you speak")

# ==================================================== 9. LOS GANCHOS DE PRUEBA
cam("""  hablar:(respetar)=>{ if(!respetar) hablaT=0; const antes=hablaT; hablar();
                       return {habiaEspera:+antes.toFixed(2), espera:+hablaT.toFixed(2)}; },""",
"""  /* EL MICROFONO, DESDE UNA PRUEBA. En el banco no hay nadie hablando, asi que se inyecta el nivel
     crudo: micNivel(rms) hace que micRms() devuelva ese numero y el resto de la cadena corre igual
     que con una voz de verdad. Sin esto, de lo unico que se podria dar fe es de que getUserMedia
     no tiro excepcion, que no es lo mismo que "el juego se puede jugar hablando". */
  mic:()=>({ estado:MIC.estado, on:MIC.on, piso:+MIC.piso.toFixed(5), k:+MIC.k.toFixed(3),
             nivel:+MIC.nivel.toFixed(3), calibrando:+Math.max(0,MIC.cal).toFixed(2),
             forzado:MIC.forzado, veces:micVeces, gritos:micGritos,
             alcance:+(MIC_ALC_MIN+(MIC_ALC_MAX-MIC_ALC_MIN)*MIC.k).toFixed(1),
             rotulo:(document.getElementById('micT')||{}).textContent||'',
             aviso:(document.getElementById('micAviso')||{}).textContent||'' }),
  micNivel:(rms)=>{ MIC.forzado = rms==null? null : rms; return MIC.forzado; },
  micPiso:(v)=>{ if(v!=null){ MIC.piso=v; MIC.cal=0; } return MIC.piso; },
  micYa:()=>{ MIC.cal=0; MIC.calN=0; return true; },
  /* una sola onda de voz al nivel que se pida, sin pasar por el microfono */
  voz:(k)=>{ const a0=ondas.length; voz(k==null?0.6:k);
             return { ondas:ondas.length-a0, alcance:+ondas[ondas.length-1].alcance.toFixed(1),
                      flash:+flash.toFixed(2), cosa:cosa.estado }; },""",
    "  micNivel:(rms)=>{ MIC.forzado")

cam("""                espera:{grito:+gritoT.toFixed(2), habla:+hablaT.toFixed(2)},""",
    """                mic:MIC.estado, micK:+MIC.k.toFixed(2),""",
    "                mic:MIC.estado, micK:")

cam("""  gritar:(respetar)=>{ if(!respetar) gritoT=0; const antes=gritoT; gritar();
                       return {habiaEspera:+antes.toFixed(2), espera:+gritoT.toFixed(2)}; },""",
    """  gritar:()=>{ voz(1.0); return {alcance:MIC_ALC_MAX}; },""",
    "  gritar:()=>{ voz(1.0); return {alcance:MIC_ALC_MAX}; },")

cam("""  tutorial:()=>({ paso:tutoPaso, listo:tutoListo, andado:+tutoAndado.toFixed(2), gritos:tutoGritos,
                  hablas:tutoHablas,""",
    """  tutorial:()=>({ paso:tutoPaso, listo:tutoListo, andado:+tutoAndado.toFixed(2),
                  veces:micVeces, gritos:micGritos,""",
    "                  veces:micVeces, gritos:micGritos,")

cam("""                bGritar:document.querySelector('#bGrito span').textContent,
                bHablar:document.querySelector('#bHabla span').textContent }),""",
    """                bVoz:document.querySelector('#bVoz span').textContent }),""",
    "bVoz:document.querySelector('#bVoz span').textContent })")

cam("""  alcances:()=>({ agachado:4, caminando:15, hablando:HABLA_ALC, corriendo:24, saltando:13,
                  gritando:GRITO_ALC, tope:COSA_OYE }),""",
    """  /* la tabla entera del juego nuevo: el cuerpo no suena y la voz es una rampa */
  alcances:()=>({ caminando:0, corriendo:0, agachado:0, saltando:0, cayendo:0,
                  susurro:+(MIC_ALC_MIN+(MIC_ALC_MAX-MIC_ALC_MIN)*0.15).toFixed(1),
                  hablando:+(MIC_ALC_MIN+(MIC_ALC_MAX-MIC_ALC_MIN)*0.5).toFixed(1),
                  gritando:MIC_ALC_MAX, tope:COSA_OYE }),""",
    "la tabla entera del juego nuevo: el cuerpo no suena")

cam("""  pisada:(fuerte,agachado)=>{ const a0=ondas.length; pisada(fuerte,agachado);
                              return { ondasDeLuz:ondas.length-a0, cosa:cosa.estado,
                                       dist:+cosa.cerca.toFixed(1) }; },""",
"""  /* CAMINAR DE VERDAD Y MIRAR SI PASO ALGO. Ya no hay funcion de pisada que llamar: lo que hay
     que comprobar es que andar n cuadros no produce NI una onda NI una reaccion de la cosa. */
  andar:(n,correr,agachado)=>{ const e0=cosa.estado, o0=ondas.length;
    const a=agacharBoton; if(agachado!=null){ agacharBoton=!!agachado; pintarAgachar(); }
    const r=window.__eco.caminar(n||90, 0, -1, correr);
    if(agachado!=null){ agacharBoton=a; pintarAgachar(); }
    return { andado:+Math.hypot(r.a[0]-r.de[0], r.a[1]-r.de[1]).toFixed(2),
             ondasDeLuz:ondas.length-o0+r.ondasEmitidas, cosaAntes:e0, cosaDespues:cosa.estado,
             dist:+cosa.cerca.toFixed(1) }; },""",
    "  andar:(n,correr,agachado)=>{")


# ---- el cartel de la hoja ya no nombra una tecla ----
cam("""        lp.innerHTML=TX('pHoja')+'<br><b>'+(plataf==='pc'?'E':TX('bGritar'))+'</b> · '+
                     TX('pGritos',{n:sinAbrir.cargas, m:NOTA_GRITOS});""",
"""        /* ya no dice una tecla: la hoja se revela HABLANDOLE, y eso no tiene tecla */
        lp.innerHTML=TX('pHoja')+'<br><b>'+TX('pHabla')+'</b> · '+
                     TX('pGritos',{n:sinAbrir.cargas, m:NOTA_GRITOS});""",
    "lp.innerHTML=TX('pHoja')+'<br><b>'+TX('pHabla')")
cam(""" pGritos:{en:'{n} OF {m} SHOUTS', es:'{n} DE {m} GRITOS', pt:'{n} DE {m} GRITOS'},""",
""" pGritos:{en:'{n} OF {m}', es:'{n} DE {m}', pt:'{n} DE {m}'},
 pHabla:{en:'SPEAK TO IT', es:'HABLALE', pt:'FALE COM ELA'},""",
    "pHabla:{en:'SPEAK TO IT'")

cam("""const COSA_OYE=46;                       // el tope: lo que le llega de un grito, o sea lo que ves vos""",
"""/* EL TOPE ES EXACTAMENTE EL ALCANCE MAXIMO DE LA VOZ. Con 46 contra 50 la frase "te oye hasta
   donde ves" dejaba de ser cierta justo en el grito mas fuerte, que es cuando el jugador la
   comprueba. Un numero, no dos. */
const COSA_OYE=50;""",
    "const COSA_OYE=50;")

# ---- el medidor y el aviso, sin pisarse con el tutorial ----
camx("""  body.tutorial #mic{ bottom:auto; top:calc(50% + 96px); }\n""", "")
cam("""  body.jugando #mic{ display:flex; }""",
"""  body.jugando #mic{ display:flex; }
  /* en telefono el boton LEER vive en el borde de abajo y se pisaba con el medidor */
  body.movil #mic{ bottom:78px; }""",
    "body.movil #mic{ bottom:78px; }")
cam("""  #micAviso{ position:absolute; left:50%; top:calc(50% + 130px); transform:translateX(-50%);
    z-index:24; max-width:80%; text-align:center; opacity:0; transition:opacity .4s ease;
    font-size:max(12px, calc(11px * var(--esc,1))); font-weight:800; letter-spacing:.06em;
    line-height:1.5; color:rgba(255,226,196,.95); text-shadow:0 1px 8px rgba(0,0,0,.98);
    background:rgba(6,9,14,.62); padding:8px 14px; border-radius:12px; pointer-events:none; }""",
"""  /* EL AVISO DEL MICROFONO VA DENTRO DE LA COLUMNA DE ARRIBA y no flotando en el medio.
     Suelto se pisaba con el tutorial, que ocupa justo esa franja; en la columna el solapamiento es
     imposible por construccion, que es la misma leccion que ya habia costado una vuelta con el HUD. */
  #micAviso{ display:none; max-width:100%; text-align:center;
    font-size:max(11px, calc(10.5px * var(--esc,1))); font-weight:800; letter-spacing:.06em;
    line-height:1.5; color:rgba(255,226,196,.95); text-shadow:0 1px 8px rgba(0,0,0,.98);
    background:rgba(28,16,8,.72); padding:5px 12px; border-radius:999px; pointer-events:none; }
  #micAviso.ver{ display:block; }""",
    "#micAviso.ver{ display:block; }")
camx("""    <div id="mic"><div id="micB"><i></i><div id="micU"></div></div><div id="micT"></div></div>
    <div id="micAviso"></div>""",
"""    <div id="mic"><div id="micB"><i></i><div id="micU"></div></div><div id="micT"></div></div>""")
camx("""      <div id="meta"></div>
    </div>""",
"""      <div id="meta"></div>
      <div id="micAviso"></div>
    </div>""")
cam("""  const k=micK(rms);
  MIC.nivel += (k-MIC.nivel)*Math.min(1, dt*14);""",
"""  const k=micK(rms);
  /* EL PISO SE SIGUE AJUSTANDO, DESPACIO Y SOLO EN SILENCIO. Medirlo una vez al empezar alcanza para
     el primer minuto; despues arranca un ventilador, alguien abre una ventana, el jugador se cambia
     de cuarto — y con el piso clavado el juego queda encendido para siempre o apagado para siempre.
     Ocho segundos de constante de tiempo: sigue al cuarto y no sigue a una frase. */
  if(k<=0) MIC.piso += (Math.max(0.0022, rms*1.55) - MIC.piso)*Math.min(1, dt*0.12);
  MIC.nivel += (k-MIC.nivel)*Math.min(1, dt*14);""",
    "EL PISO SE SIGUE AJUSTANDO, DESPACIO Y SOLO EN SILENCIO")

# ==================================================== GUARDAR
io.open(RUTA,'w',encoding='utf-8').write(s)
print('CAMBIOS (%d):' % len(hechos))
for h in hechos: print('  +', h)
if saltados:
    print('YA ESTABAN (%d):' % len(saltados))
    for h in saltados: print('  =', h)
print('bytes: %d -> %d' % (ORIG, len(s)))
