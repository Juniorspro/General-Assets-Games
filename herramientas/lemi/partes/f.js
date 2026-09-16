/* ══════════════════════════ EL DÍA Y LA NOCHE ══════════════════════════
   Ciclo completo en tres minutos. La fase va de 0 a 1: 0 es medianoche, 0,25 el
   amanecer, 0,5 el mediodía y 0,75 el atardecer. De ahí sale TODO —altura del
   sol, color de la luz, cielo, niebla, estrellas y la luna—, así nunca se
   desincroniza una cosa de la otra. */
const luna = new T.DirectionalLight(0xbcd4ff, 0);
escena.add(luna); escena.add(luna.target);

/* las estrellas: un puñado de puntos en la esfera del cielo que sólo se ven de
   noche. Van sin niebla y sin profundidad para que no las tape nada. */
const estrellas = (() => {
  const N = 900, pos = new Float32Array(N*3), tam = new Float32Array(N);
  for (let i = 0; i < N; i++){
    const u = Math.random()*6.283, v = Math.random()*0.85 + 0.06;
    const r = 820, sy = Math.sin(v*Math.PI/2), rr = Math.cos(v*Math.PI/2);
    pos[i*3] = Math.cos(u)*rr*r; pos[i*3+1] = sy*r; pos[i*3+2] = Math.sin(u)*rr*r;
    tam[i] = 1.6 + Math.random()*3.4;
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.BufferAttribute(pos, 3));
  g.setAttribute('tam', new T.BufferAttribute(tam, 1));
  const m = new T.ShaderMaterial({
    transparent: true, depthWrite: false, fog: false,
    uniforms: { alfa: { value: 0 } },
    vertexShader: `attribute float tam; varying float vT;
      void main(){ vT = tam;
        vec4 mv = modelViewMatrix * vec4(position,1.0);
        gl_PointSize = tam; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float alfa; varying float vT;
      void main(){
        vec2 d = gl_PointCoord - 0.5;
        float f = smoothstep(0.5, 0.06, length(d));
        gl_FragColor = vec4(vec3(1.0, 0.98, 0.92), f * alfa * (0.45 + vT*0.14));
      }`
  });
  const pts = new T.Points(g, m);
  pts.frustumCulled = false;
  escena.add(pts);
  return pts;
})();

const _dir = new T.Vector3(), _foco = new T.Vector3();
/* LA NOCHE SE CLAVA Y NO VUELVE A AMANECER.
   Después de la escena de la llave el juego deja de ser «un día en la isla» y
   pasa a ser una huida: si el reloj siguiera corriendo, a los pocos minutos
   saldría el sol y la persecución quedaría a plena luz con el camello trotando
   por el pasto verde, que es exactamente lo contrario de lo que la escena
   acaba de plantar. Así que a partir de ahí la hora se PROGRAMA: se lleva a
   medianoche cerrada y se queda. No se congela de golpe —eso se ve como un
   corte— sino que baja hasta el valor fijo en unos segundos. */
let NOCHE_FIJA = false;
const NOCHE_HORA = 0.965;        /* casi medianoche: la luna alta y nada de sol */
function clavaNoche(){ NOCHE_FIJA = true; }
function ponSol(dt){
  if (NOCHE_FIJA){
    /* el camino más corto hasta el valor fijo, para no cruzar el mediodía */
    let d = NOCHE_HORA - CFG.sol;
    if (d >  0.5) d -= 1;
    if (d < -0.5) d += 1;
    if (Math.abs(d) > 0.0008) CFG.sol = (CFG.sol + d * Math.min(1, (dt||0) * 0.55) + 1) % 1;
    else CFG.sol = NOCHE_HORA;
  }
  else if (dt && !PAUSA) CFG.sol = (CFG.sol + dt / CICLO) % 1;
  const f = CFG.sol;
  const ang = (f - 0.25) * 6.283185;
  const alt = Math.sin(ang), az = Math.cos(ang);
  const dia = cl(alt / 0.22, 0, 1);            /* 0 de noche, 1 con el sol alto */
  const filo = 1 - Math.abs(cl(alt / 0.30, -1, 1));   /* 1 justo en el horizonte */

  _foco.set(JUG.x, 0, JUG.z);
  /* EL SOL. Bajo el horizonte se apaga, y la luna toma el relevo con su propia
     dirección: si se dejara el mismo foco, de noche las sombras seguirían
     saliendo del suelo hacia arriba. */
  _dir.set(az*0.86, Math.max(0.05, alt), -0.40).normalize();
  sol.position.copy(_dir).multiplyScalar(230).add(_foco);
  sol.target.position.copy(_foco); sol.target.updateMatrixWorld();
  sol.visible = alt > -0.02;
  sol.intensity = 2.55 * dia;
  /* dorado cuando roza el horizonte, blanco cuando está alto */
  sol.color.setHSL(0.09 + dia*0.045, 0.62 - dia*0.5, 0.52 + dia*0.14);
  sol.castShadow = CFG.sombras && alt > 0.06;

  /* LA LUNA: fría, floja y sin sombra, para que la noche se vea y no ciegue */
  _dir.set(-az*0.86, Math.max(0.05, -alt), 0.40).normalize();
  luna.position.copy(_dir).multiplyScalar(230).add(_foco);
  luna.target.position.copy(_foco); luna.target.updateMatrixWorld();
  luna.visible = alt < 0.02;
  luna.intensity = 0.42 * cl(-alt / 0.25, 0, 1);

  /* el relleno viaja opuesto al sol y sube con el día */
  relleno.position.set(-az*0.7, 0.55, 0.34).normalize().multiplyScalar(200).add(_foco);
  relleno.target.position.copy(_foco); relleno.target.updateMatrixWorld();
  relleno.intensity = 0.12 + dia*0.62;
  relleno.color.setHSL(0.58, 0.42, 0.62);

  /* el rebote: de noche baja mucho pero no a cero, o no se vería nada */
  ambiente.intensity = 0.20 + dia*1.32;
  ambiente.color.setHSL(0.60 - dia*0.04, 0.50, 0.22 + dia*0.36);
  ambiente.groundColor.setHSL(0.28, 0.35, 0.07 + dia*0.24);

  const c = cieloMat.uniforms;
  c.sol.value.copy(_dir.set(az*0.86, alt, -0.40).normalize());
  /* de azul noche a azul día, con el naranja del horizonte metido por `filo` */
  c.arriba.value.setHSL(0.62 - dia*0.035, 0.55 + dia*0.15, 0.045 + dia*0.44);
  c.medio.value.setHSL(0.60 - dia*0.035, 0.50 + dia*0.17, 0.09 + dia*0.53);
  c.abajo.value.setHSL(0.60 - filo*0.53, 0.40 + filo*0.50, 0.12 + dia*0.66);
  c.calor.value.setHSL(0.07, 0.90, 0.20 + dia*0.42);
  escena.fog.color.copy(c.medio.value).lerp(c.abajo.value, 0.55);
  /* de noche se ve MENOS lejos: sin esto la isla nocturna es una silueta plana */
  escena.fog.near = 120 + dia*110; escena.fog.far = 300 + dia*340;

  /* las nubes se apagan con el sol: con el emisivo fijo quedaban celestes y
     luminosas a medianoche, flotando sobre un mundo negro */
  if (matNube){
    matNube.emissiveIntensity = 0.10 + dia*0.50;
    matNube.color.setHSL(0.60, 0.16 + (1-dia)*0.20, 0.16 + dia*0.80);
  }
  estrellas.material.uniforms.alfa.value = cl(-alt*2.6, 0, 1);
  estrellas.position.copy(cam.position);

  HORA = f * 24;
}
let HORA = 10;

/* ══════════════════════════ AVISOS ══════════════════════════ */
let tAviso;
function aviso(m){
  let e = $('avisoCaja');
  if (!e){
    e = document.createElement('div'); e.id = 'avisoCaja';
    e.style.cssText = 'position:absolute;left:50%;bottom:14%;transform:translateX(-50%);z-index:30;'+
      'padding:10px 18px;border-radius:99px;background:rgba(8,18,28,.72);border:1px solid rgba(255,255,255,.14);'+
      'font:600 12px ui-monospace,monospace;letter-spacing:.04em;opacity:0;transition:opacity .3s;pointer-events:none';
    document.getElementById('escenario').appendChild(e);
  }
  e.textContent = m; e.style.opacity = 1;
  clearTimeout(tAviso); tAviso = setTimeout(() => e.style.opacity = 0, 1900);
}

/* ══════════════════════════ PANTALLA COMPLETA Y ORIENTACIÓN ══════════════
   Las dos cosas sólo se conceden DENTRO DE UN GESTO del usuario: por eso hay un
   botón al terminar de cargar y no se intenta solo al abrir, que es la forma
   segura de que el navegador lo rechace en silencio.

   El bloqueo de orientación no existe en iOS y en escritorio suele fallar. No
   importa: el giro por CSS del escenario cubre igual el caso, y por eso se
   intenta bloquear pero nunca se depende de que salga bien. */
function enPantallaCompleta(){
  return !!(document.fullscreenElement || document.webkitFullscreenElement);
}
async function pantallaCompleta(){
  const el = document.documentElement;
  try {
    if (!enPantallaCompleta()){
      if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    }
  } catch(e){ /* puede negarse; no es motivo para no jugar */ }
  try {
    if (screen.orientation && screen.orientation.lock)
      await screen.orientation.lock('landscape');
  } catch(e){ /* iOS no lo tiene: queda el giro por CSS */ }
  setTimeout(medir, 280);
}
async function salirPantallaCompleta(){
  try {
    if (document.exitFullscreen) await document.exitFullscreen();
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
  } catch(e){}
  try { if (screen.orientation && screen.orientation.unlock) screen.orientation.unlock(); } catch(e){}
  setTimeout(medir, 280);
}
/* al salir con la tecla de escape hay que volver a medir: cambia la ventana */
for (const ev of ['fullscreenchange','webkitfullscreenchange','orientationchange'])
  addEventListener(ev, () => setTimeout(medir, 300));

/* ══════════════════════════ LA CÁMARA DE CINE DEL MENÚ ══════════════════
   Mientras el menú está abierto la isla sigue viva detrás, filmada con un campo
   de visión de 30° en vez de los 66 de juego. El teleobjetivo aplasta la
   perspectiva —las copas se apilan unas sobre otras y el fondo se acerca—, y
   junto con un movimiento MUY lento eso es lo que da el aire de grúa de cine.
   Va rotando entre los sitios de la isla, unos segundos en cada uno. */
let MODO = 'menu';
/* declarados ACÁ ARRIBA y no «donde corresponde temáticamente»: es la séptima
   vez en este proyecto que un `const` leído antes de su línea no rompe una
   función sino el módulo entero. */
const _qRoll = new T.Quaternion(), _ejeZ = new T.Vector3(0, 0, 1);
const CINE = {
  i: 0, t: 0, ang: 0, alto: 0,
  arranca(){
    this.i = 0; this.t = 0; this.ang = Math.random()*6.283; this.pon();
  },
  pon(){
    const s2 = (SITIOS && SITIOS.length) ? SITIOS[this.i % SITIOS.length]
             : { c: { x: 0, z: 0, h: 10 } };
    this.obj = s2.c;
    /* EL ENCUADRE SALE DE UNA CUENTA, NO DEL GUSTO.
       Con la altura anterior —11 a 24 m sobre un radio de 34 a 56— la cámara
       cabeceaba entre 20° y 30° hacia abajo, y como el teleobjetivo abre 30° en
       vertical, o sea 15° para arriba del eje, el borde de ARRIBA del cuadro
       caía por debajo del horizonte: no entraba un solo píxel de cielo y el
       menú era una alfombra verde. Un fondo de portada necesita las tres
       franjas —cielo, isla, primer plano—, y para eso el horizonte tiene que
       caer alrededor de un cuarto del alto.
       Si el horizonte va a la fracción f desde arriba, el cabeceo vale
       `mediaAbertura*(1 - 2f)`; con f = 0,26 y media abertura 15° son 6,6°, o
       sea alto = radio * tan(6,6°) = radio * 0,116 POR ENCIMA DEL PUNTO AL QUE
       MIRA, que no es lo mismo que por encima del suelo. */
    this.rad = 48 + Math.random()*26;
    this.alto = this.rad * (0.10 + Math.random()*0.055);
    this.vel = (Math.random() < 0.5 ? -1 : 1) * (0.035 + Math.random()*0.030);
  },
  paso(dt){
    /* el bucle arranca antes de que nadie haya elegido sitio: si `obj` no está,
       se elige acá y no se tira todo abajo cuadro a cuadro */
    if (!this.obj) this.pon();
    this.t += dt;
    if (this.t > 11){ this.t = 0; this.i++; this.pon(); }
    this.ang += this.vel * dt;
    const o = this.obj;
    const x = o.x + Math.cos(this.ang)*this.rad;
    const z = o.z + Math.sin(this.ang)*this.rad;
    /* la altura que pide el encuadre, y el terreno sólo como PISO: si el suelo
       de este lado de la órbita es más alto que el sitio, la cámara sube lo
       justo para no enterrarse, y ahí sí se pierde un poco de cielo. Sumar la
       altura ENCIMA del terreno —como estaba— hacía que el cabeceo dependiera
       de por dónde pasara la órbita, o sea que el encuadre cambiaba solo. */
    const mira = o.h + 5.5;
    const y = Math.max(mira + this.alto, H(x, z) + 4.5, MAR + 5);
    cam.position.set(x, y, z);
    cam.lookAt(o.x, mira, o.z);
    /* LA DERIVA VA COMO CUATERNIÓN LOCAL Y NO COMO `rotation.z`, Y ESA ES LA
       DIFERENCIA ENTRE UN HORIZONTE DERECHO Y UNO TORCIDO.
       `lookAt` deja la cámara sin inclinación —medido: 0,00°—. Pero escribir
       `cam.rotation.z` recompone la rotación ENTERA desde el Euler, y el orden
       del Euler acá es el de fábrica, `XYZ`, o sea R = Rx·Ry·Rz: el cabeceo se
       aplica alrededor del eje X DEL MUNDO después del giro, y eso ladea el
       horizonte tanto más cuanto más grande sea el giro. Medido en el mismo
       cuadro: `lookAt` 0,00° y la línea siguiente 29,81°. Y como la cámara del
       menú ORBITA, el giro barre la vuelta entera y la inclinación va y viene
       —17° en un instante, 30° en otro—: eso es lo que se ve como que la
       cinemática está dada vuelta.
       El juego no lo sufría porque `ponCam` pone `rotation.order='YXZ'`, que es
       el orden correcto para una cámara de girar-y-cabecear; pero el menú corre
       antes de que `ponCam` haya existido siquiera una vez.
       Multiplicando por la derecha se gira alrededor del eje Z DE LA CÁMARA, o
       sea sobre su propio eje óptico: no puede tocar hacia dónde mira, y no
       depende de ningún orden de Euler. */
    _qRoll.setFromAxisAngle(_ejeZ, Math.sin(this.t*0.19) * 0.012);
    cam.quaternion.multiply(_qRoll);
    if (cam.fov !== 30){ cam.fov = 30; cam.updateProjectionMatrix(); }
    AND.fov = 30;
  }
};
function entraJuego(){
  MODO = 'juego';
  $('menu').classList.remove('on');
  $('hud').classList.add('on');
  /* SE EMPIEZA A SIETE METROS DEL FUEGO Y NO A DIECISIETE. La cinemática deja
     al jugador en plena noche, y en la primera captura nocturna la fogata era
     un puntito al fondo: sin un punto de referencia encendido, el primer cuadro
     de la partida es una pantalla negra con estrellas. A siete metros el fuego
     ocupa el centro del cuadro y ahí se entiende dónde está uno parado. */
  JUG.x = CAMPO.x + 5; JUG.z = CAMPO.z + 5; JUG.y = H(JUG.x, JUG.z);
  JUG.vy = 0; JUG.aire = false; JUG.vuela = false; JUG.agacha = false;
  JUG.yaw = Math.atan2(JUG.x - CAMPO.x, JUG.z - CAMPO.z);
  JUG.pitch = -0.05;
  AND.ojo = OJO; AND.fase = 0; AND.golpe = 0; AND.fov = 66;
  cam.fov = 66; cam.updateProjectionMatrix();
  cam.rotation.z = 0;
}
/* ── LO QUE HAY QUE APAGAR AL SALIR DE UNA PARTIDA ──
   Una sola función, y la llaman los DOS caminos de salida: el botón de menú del
   panel de pausa y el final de la cinemática del escape. Repartido en los dos
   sitios, el día que se agregue un tercero va a quedar sin apagar algo — que es
   literalmente lo que acaba de pasar con `BICHO.caza`, que sobrevivía a un
   reinicio porque nadie lo apagaba en ninguno de los dos. */
function limpiaPartida(){
  NOCHE_FIJA = false;
  ROTO.on = false; ROTO.cae = 0; ROJO.on = false;
  cuevaReinicia();
  ponCamello();
  /* y la camioneta vuelve a donde estaba estacionada: la cinemática del escape
     la mueve noventa metros y el menú orbita justo por ahí */
  if (AUTO){
    AUTO.g.position.set(AUTO.x, AUTO.y, AUTO.z);
    AUTO.g.rotation.set(0, AUTO.ry, 0);
    if (AUTO.g.userData.faros) for (const f of AUTO.g.userData.faros) f.intensity = 0;
  }
  if (MIS.antorchaMalla) MIS.antorchaMalla.visible = false;
  $('obj').classList.remove('on');
  $('pista').classList.remove('on');
}
function vuelveMenu(){
  MODO = 'menu';
  pausa(false);
  limpiaPartida();
  $('hud').classList.remove('on');
  $('menu').classList.add('on');
  CINE.arranca();
}

/* ══════════════════════════ MENÚ DE PAUSA ══════════════════════════
   Tres botones y nada más: reanudar, reiniciar y volver a la portada. Los
   deslizadores de imagen se fueron porque los valores quedaron fijos. */
let PAUSA = false;
function pausa(v){
  if (MODO === 'cine') return;    /* no hay nada que pausar mientras se mira */
  PAUSA = v;
  document.getElementById('pausa').classList.toggle('on', v);
  if (v && document.pointerLockElement) document.exitPointerLock();
  if (v){
    const t = Math.floor(RELOJ.value);
    document.getElementById('pSub').textContent =
      TXF('pSub', Math.floor(t/60), String(t%60).padStart(2,'0'));
  }
}
/* ── APLICAR UNA CALIDAD, EN CALIENTE ──
   Sin recargar la página: un ajuste que pide reiniciar el juego no se prueba —el
   jugador lo toca una vez, no ve nada y no vuelve—. Es la misma lección que en
   RezUno con la selección gráfica.
   Y EL MAPA DE SOMBRA HAY QUE SOLTARLO A MANO: three.js no recrea la textura
   porque cambie `mapSize`, se queda con la de antes y el cambio no hace nada. */
function ponCalidad(q){
  const c = CALIDADES[q]; if (!c) return CALIDAD;
  CALIDAD = q;
  CFG.pix = c.pix; CFG.sombras = c.sombras; CFG.nubes = c.nubes; CFG.viento = c.viento;
  VIENTO.value = c.viento ? 1 : 0;
  ren.shadowMap.enabled = c.sombras;
  if (sol.shadow.mapSize.x !== c.mapa){
    sol.shadow.mapSize.set(c.mapa, c.mapa);
    if (sol.shadow.map){ sol.shadow.map.dispose(); sol.shadow.map = null; }
  }
  sol.castShadow = c.sombras;
  if (nubes) nubes.visible = c.nubes;
  medir();
  try { localStorage.setItem('lemi_cal', q); } catch(e){}
  pintaAjustes();
  return CALIDAD;
}
/* marca cuál está elegida en las dos filas de fichas del menú */
function pintaAjustes(){
  for (const b of document.querySelectorAll('#mCal .chip'))
    b.classList.toggle('sel', b.dataset.cal === CALIDAD);
  for (const b of document.querySelectorAll('#mIdi .chip'))
    b.classList.toggle('sel', b.dataset.lang === IDIOMA);
}

function armaPanel(){
  $('bPanel').onclick = () => pausa(!PAUSA);
  $('pSeguir').onclick = () => pausa(false);
  /* REINICIAR ES VOLVER A EMPEZAR LA PARTIDA, NO CAMBIAR DE ISLA. Llamaba a
     `resembrar()`, o sea que sembraba una isla nueva —era el botón «otra isla»
     con otro nombre, y ése se acaba de sacar del menú porque no se pidió— y
     encima dejaba puesto todo lo de la partida vieja: las misiones ya hechas,
     los objetos plantados en coordenadas que ya no existen, y desde la vuelta
     pasada también la pierna rota y la viñeta roja. Reiniciar en medio de la
     huida te dejaba cojeando en una isla recién sembrada.
     Los tres pasos son los mismos que usa el arranque normal, en el mismo
     orden: apagar lo de la partida anterior, replantar las misiones y volver a
     poner al jugador en el campamento. */
  $('pReinicia').onclick = () => {
    pausa(false); limpiaPartida(); MIS.arranca(); entraJuego();
  };
  $('pMenu').onclick = () => vuelveMenu();
  /* JUGAR abre la CINEMÁTICA, no el juego: el juego arranca cuando ella
     termina, que es lo que se pidió. Y se puede saltear en cualquier momento
     —una apertura obligatoria vista por segunda vez es un peaje—. */
  $('mJugar').onclick = async () => { await pantallaCompleta(); INTRO.arranca(); };
  $('cSaltar').onclick = () => INTRO.termina();
  /* las dos filas de ajustes del menú: idioma y gráficos. Van ACÁ y no sólo en
     la pantalla previa porque cambiar de idioma o de calidad después de haber
     empezado obligaba a recargar la página entera. */
  for (const b of document.querySelectorAll('#mCal .chip'))
    b.onclick = () => ponCalidad(b.dataset.cal);
  for (const b of document.querySelectorAll('#mIdi .chip'))
    b.onclick = () => { ponIdioma(b.dataset.lang); pintaAjustes(); };
  try { const g = localStorage.getItem('lemi_cal'); if (g && CALIDADES[g]) CALIDAD = g; } catch(e){}
  ponCalidad(CALIDAD);
  $('bFull').onclick = () => {
    if (enPantallaCompleta()) salirPantallaCompleta(); else pantallaCompleta();
  };
  /* los tres de acción: el de correr y el de agacharse quedan fijados mientras
     se los mantenga, que es como se espera de un botón de acción */
  const sostener = (id, abajo, arriba) => {
    const e = $(id);
    e.addEventListener('pointerdown', ev => { ev.preventDefault(); modoPC(false); abajo(); });
    for (const k of ['pointerup','pointercancel','pointerleave'])
      e.addEventListener(k, () => arriba && arriba());
  };
  sostener('acSalta', () => saltar());
  sostener('acAgacha', () => ponAgacha(true), () => ponAgacha(false));
  $('acCorre').addEventListener('pointerdown', ev => { ev.preventDefault(); modoPC(false);
    corre = !corre; $('acCorre').classList.toggle('on', corre); });
  /* USAR: un solo botón para todo lo que se pueda hacer cerca. Con un botón por
     tipo de cosa, la pantalla se llenaría de botones apagados. */
  sostener('acUsar', () => MIS.usa());
  /* el minijuego se juega con un botón grande o con la barra espaciadora */
  $('miBtn').addEventListener('pointerdown', ev => { ev.preventDefault(); MINI.golpe(); });
}

