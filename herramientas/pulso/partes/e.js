
/* ══════════════════════ EL GIROSCOPIO ══════════════════════
   Es el mecanismo entero del juego, así que hay cuatro cosas que hacer bien y
   ninguna es obvia.

   1. NO SE MIDE LA INCLINACIÓN ABSOLUTA, SE MIDE LA DESVIACIÓN CONTRA UNA
      POSICIÓN CALIBRADA. Nadie sostiene el teléfono horizontal como una bandeja
      de verdad: se sostiene a sesenta o setenta grados, que es donde se ve la
      pantalla. Si «derecho» fuera el plano horizontal, el bol estaría volcado
      desde el primer cuadro. El jugador dice cómo lo va a llevar y ESO pasa a
      ser el cero.

   2. NO SE SUAVIZA. Es lo contrario de todo lo que se hizo en los otros juegos
      de este repo: acá la señal de alta frecuencia —el respingo, el temblor de
      la mano cuando se asusta— ES EL JUEGO. Filtrarla es sacarle al juego su
      única razón de existir. Lo único que se filtra es la deriva lenta del
      sensor, y con una constante larguísima.

   3. LOS EULER DE `deviceorientation` SE DAN VUELTA CERCA DE LOS POLOS. Con el
      teléfono casi vertical —que es como se juega— `alpha` y `gamma` se pelean
      y `gamma` salta de 90 a -90. Por eso NO se restan ángulos: se arma el
      cuaternión de la orientación, se compone con el inverso del calibrado, y
      se lee la desviación de ESE. Un cuaternión no tiene polos.

   4. Y HAY QUE PEDIR PERMISO, en iOS, DENTRO de un gesto. Sin eso el evento no
      llega nunca y el juego se queda quieto sin decir por qué. */
const GIRO = {
  hay: false, listo: false, permiso: 'sin pedir',
  q: new T.Quaternion(),            /* orientación cruda */
  cal: new T.Quaternion(),          /* la posición «derecho» */
  calInv: new T.Quaternion(),
  incX: 0, incZ: 0,                 /* desviación en radianes: adelante-atrás y costado */
  crudo: { a: 0, b: 0, g: 0 },
  ultimo: 0
};
const _qE = new T.Quaternion(), _eE = new T.Euler(), _qZ = new T.Quaternion();
const _q90 = new T.Quaternion().setFromAxisAngle(new T.Vector3(1, 0, 0), -Math.PI/2);

function qDeOrientacion(a, b, g, orient){
  /* la receta de la especificación: Z(alpha) · X(beta) · Y(gamma), y después el
     giro de la pantalla y los -90 grados que llevan del marco del dispositivo
     al marco del mundo */
  _eE.set(b * Math.PI/180, g * Math.PI/180, -a * Math.PI/180, 'YXZ');
  _qE.setFromEuler(_eE);
  _qE.multiply(_q90);
  _qZ.setFromAxisAngle(new T.Vector3(0, 0, 1), -(orient || 0) * Math.PI/180);
  _qE.multiply(_qZ);
  return _qE;
}

function onOrientacion(ev){
  if (ev.alpha === null && ev.beta === null && ev.gamma === null) return;
  GIRO.hay = true;
  GIRO.ultimo = performance.now();
  GIRO.crudo.a = ev.alpha || 0; GIRO.crudo.b = ev.beta || 0; GIRO.crudo.g = ev.gamma || 0;
  const orient = (screen.orientation && screen.orientation.angle) || window.orientation || 0;
  GIRO.q.copy(qDeOrientacion(GIRO.crudo.a, GIRO.crudo.b, GIRO.crudo.g, orient));
  if (!GIRO.listo) return;
  calculaInclinacion();
}

const _vArriba = new T.Vector3();
function calculaInclinacion(){
  /* la desviación contra el calibrado, EN CUATERNIÓN */
  _qE.copy(GIRO.calInv).multiply(GIRO.q);
  /* ══════ ACÁ ESTABA EL «TODO INVERTIDO», Y ERA EL EJE EQUIVOCADO ══════
     Tomaba el eje **Y** del marco desviado como la normal de la tabla. El eje Y
     de este cuaternión es EL BORDE DE ARRIBA DE LA PANTALLA, no la cara del
     teléfono: `qDeOrientacion` termina en el marco de una cámara —X a la
     derecha de la pantalla, Y arriba de la pantalla, Z saliendo hacia la cara—.
     La consecuencia se puede escribir: girando el teléfono en su propio plano
     (como un volante), la Y desviada se va a −X y el juego lee «la tabla se
     cayó para la izquierda» cuando el jugador no inclinó NADA; y en cambio
     inclinando de verdad hacia un lado —que es girar alrededor del eje de
     arriba de la pantalla— la Y no se mueve y el juego no lee nada.
     El teléfono se lleva COMO UNA BANDEJA, así que la normal de la tabla es la
     PANTALLA: el eje Z. Con la normal bien, «derecha» e «izquierda» salen de
     los ejes de la pantalla y las dos cosas coinciden con la mano.

     Y ESTO NO ES UN CAMBIO DE SIGNO: es cambiar qué eje se mide. Un cambio de
     signo habría arreglado un caso y roto el otro, que es lo que pasa cuando se
     invierten controles a ciegas. */
  _vArriba.set(0, 0, 1).applyQuaternion(_qE);
  const nx = _vArriba.x, ny = _vArriba.y;
  /* de los ejes de la PANTALLA a los ejes de la TABLA. La tabla vive en el
     marco de la cámara: +X a la derecha y +Z hacia el jugador, así que «el
     fondo de la tabla» es −Z y le corresponde el arriba de la pantalla. Y si el
     cuadro se dibuja girado, los dos ejes se giran con él — por eso pasa por
     `GIRO_VIS`, que es el ángulo con el que se está dibujando. */
  const c = Math.cos(GIRO_VIS), s2 = Math.sin(GIRO_VIS);
  const rx = nx*c + ny*s2;          /* componente en el «derecha» que ve el jugador */
  const ry = -nx*s2 + ny*c;         /* componente en el «arriba» que ve el jugador */
  GIRO.incX = rx;
  GIRO.incZ = -ry;
}

function calibrar(){
  GIRO.cal.copy(GIRO.q);
  GIRO.calInv.copy(GIRO.cal).invert();
  GIRO.listo = true;
  calculaInclinacion();
}

async function pedirGiro(){
  const D = window.DeviceOrientationEvent;
  if (!D){ GIRO.permiso = 'no existe'; return false; }
  try {
    if (typeof D.requestPermission === 'function'){
      /* iOS: tiene que ser DENTRO del gesto que lo pidió, si no lo rechaza sin
         mostrar el cartel */
      const r = await D.requestPermission();
      GIRO.permiso = r;
      if (r !== 'granted') return false;
    } else {
      GIRO.permiso = 'no hace falta';
    }
  } catch(e){ GIRO.permiso = 'error: ' + e.message; return false; }
  addEventListener('deviceorientation', onOrientacion, true);
  return true;
}

/* ── EL RESPALDO, QUE NO ES UN ADORNO ──
   En una notebook, o con el permiso negado, no hay giroscopio. Sin respaldo el
   juego es injugable y no se puede ni probar. Se arrastra el dedo y eso inclina
   la tabla; la sensación no es la misma —no hay respingo involuntario— pero el
   juego existe. */
const DEDO = { on: false, x: 0, y: 0, ix: 0, iz: 0 };
function arrastreInicio(e){
  if (GIRO.hay) return;
  const t = e.touches ? e.touches[0] : e;
  DEDO.on = true; DEDO.x = t.clientX; DEDO.y = t.clientY;
}
function arrastreMueve(e){
  if (!DEDO.on || GIRO.hay) return;
  const t = e.touches ? e.touches[0] : e;
  const k = 1 / Math.max(240, Math.min(W, H));
  /* ── EL DEDO TAMBIÉN SE GIRA CON EL CUADRO ──
     `clientX/clientY` vienen en coordenadas de la VENTANA, y el juego puede
     estar dibujado 90° girado adentro. Sin esta rotación, con el teléfono de
     costado arrastrar «a la derecha» —que para el jugador es a la derecha—
     mueve la tabla hacia adelante. Es el mismo cruce de ejes que tenía el
     giroscopio, en la otra entrada. */
  const c = Math.cos(GIRO_VIS), s2 = Math.sin(GIRO_VIS);
  const px = t.clientX - DEDO.x, py = t.clientY - DEDO.y;
  const rx = px*c + py*s2, ry = -px*s2 + py*c;
  DEDO.ix += rx * k * 1.6;
  DEDO.iz += ry * k * 1.6;
  DEDO.ix = Math.max(-0.9, Math.min(0.9, DEDO.ix));
  DEDO.iz = Math.max(-0.9, Math.min(0.9, DEDO.iz));
  DEDO.x = t.clientX; DEDO.y = t.clientY;
  e.preventDefault();
}
function arrastreFin(){ DEDO.on = false; }
addEventListener('touchstart', arrastreInicio, { passive: true });
addEventListener('touchmove', arrastreMueve, { passive: false });
addEventListener('touchend', arrastreFin, { passive: true });
addEventListener('mousedown', arrastreInicio);
addEventListener('mousemove', arrastreMueve);
addEventListener('mouseup', arrastreFin);

/* la inclinación que el juego consume, venga de donde venga.
   Devuelve LA NORMAL DE LA TABLA proyectada: (x, z) es hacia dónde se recuesta
   el «arriba» de la tabla. Todo lo que la usa —la física del bol y el dibujo de
   la tabla— tiene que leerla con ese significado y no como «pendiente». */
function inclinacion(){
  const s = CFG.sens === 'suave' ? 0.72 : CFG.sens === 'dura' ? 1.5 : 1.0;
  if (GIRO.hay && GIRO.listo) return { x: GIRO.incX * s, z: GIRO.incZ * s };
  /* el dedo: arrastrar a la derecha recuesta la tabla a la derecha, y arrastrar
     hacia abajo la recuesta hacia el jugador (+Z de la tabla) */
  return { x: DEDO.ix * s, z: DEDO.iz * s };
}
