
/* ══════════════════════ EL FRASCO Y LAS PASTILLAS ══════════════════════
   El frasco está generado (imagen -> 3D con Higgsfield) y horneado a color por
   vértice; las dos pastillas van por código, porque una pastilla es una cápsula
   blanca de doce milímetros y generar un modelo para eso sería bajar cincuenta
   kilobytes para dibujar un poroto.

   CUELGA DEL HUESO DE LA MANO Y NO DE LA ESCENA. Puesto en la escena habría que
   copiarle la posición de la mano en cada cuadro, y eso es una segunda cuenta
   que se puede desincronizar de la animación — el mismo defecto que en LEMI
   dejó la llave quieta mientras el brazo subía. Colgado del hueso, la mano lo
   lleva por construcción. */
const FRASCO = { ok: false, grupo: null, past: null, tri: 0 };

function cargaFrasco(){
  if (FRASCO.grupo || !PJ.ok) return;
  const g = new T.Group();
  try {
    const r = armaProp(B64(FRASCO_B64), new T.MeshPhongMaterial({
      vertexColors: true, shininess: 20, specular: 0x141618 }));
    /* EL FRASCO SE AGARRA POR EL MEDIO, no por la base: la mano se cierra
       alrededor de su cintura, así que el origen —que el horno dejó en la
       base— tiene que bajar media altura. */
    r.malla.position.set(0, -0.040, 0);
    g.add(r.malla); FRASCO.tri = r.tri;
  } catch(e){ if (window.__errs) window.__errs.push('frasco: ' + e.message); }

  /* LAS DOS PASTILLAS. Van APOYADAS EN LA MANO y no flotando: lo que hace que
     se lean es que estén sobre algo. Y son dos, no una: una sola pastilla en
     una palma se lee a moneda. */
  const mp = new T.MeshPhongMaterial({ color: 0xf2f0ea, shininess: 24,
                                       specular: 0x1e2024 });
  PJ.idx['RightHand'].add(g);

  /* ── LAS PASTILLAS CUELGAN DEL DEDO, NO DEL FRASCO ──
     Colgadas del frasco quedaban flotando al costado, sin tocar nada, y una
     pastilla que flota no se lee a pastilla que alguien tiene: se lee a error.
     Colgadas de la falange de arriba del índice están APOYADAS en algo, y ese
     algo se mueve cuando el dedo se mueve. */
  const gp = new T.Group();
  /* TRES Y NO DOS, Y MAS GRANDES. A 46 cm con lente de 30 grados el cuadro mide
     24,6 cm de alto: una pastilla de 2,1 cm ocupa el 8 % y a dos se las cuenta
     con esfuerzo. Con tres y un milimetro mas de radio se leen de una — y tres
     pastillas sueltas en la palma dicen algo que dos no dicen. */
  for (const [x, y, z, r] of [[-0.014, 0.000, -0.004, 0.30],
                              [ 0.010, -0.002, 0.007, -0.45],
                              [-0.001, 0.001, 0.016, 1.05]]){
    const c = new T.Mesh(new T.CapsuleGeometry(0.0066, 0.0120, 3, 10), mp);
    c.rotation.set(Math.PI/2, 0, r);
    c.position.set(x, y, z);
    gp.add(c);
  }
  const dedo = PJ.idx['RightIndiceB'] || PJ.idx['RightHand'];
  dedo.add(gp);
  FRASCO.past = gp; gp.visible = false;
  FRASCO.grupo = g; FRASCO.ok = true;
  g.visible = false;
}

function ponFrasco(v){
  if (FRASCO.grupo) FRASCO.grupo.visible = !!v;
  if (FRASCO.past) FRASCO.past.visible = !!v;
}

/* las pastillas se colocan igual que el frasco: el punto se dice en el MUNDO
   —«hacia la cámara» y «hacia arriba»— y se lo trae al espacio del dedo */
function ponPastillasMundo(p, giro){
  const g = FRASCO.past; if (!g || !g.parent) return;
  g.parent.updateMatrixWorld(true);
  g.position.copy(g.parent.worldToLocal(_fp.copy(p)));
  g.parent.getWorldQuaternion(_fq);
  _fe.set(0.0, giro, 0.0);
  g.quaternion.copy(_fq.invert().multiply(_fq2.setFromEuler(_fe)));
}

/* el frasco viaja con el personaje, así que tiene que estar en la MISMA capa:
   dejándolo en la 0 mientras el cuerpo pasa a la 1, en el plano de la cara —y
   en el de las pastillas— se dibujaría con el fondo desenfocado */
function capaFrasco(n){
  if (FRASCO.grupo) FRASCO.grupo.traverse(o => { o.layers.set(n); });
  if (FRASCO.past)  FRASCO.past.traverse(o => { o.layers.set(n); });
}

/* ── SE COLOCA EN COORDENADAS DE MUNDO Y NO EN LAS DE LA MANO ──
   El frasco tiene que quedar DELANTE del puño y parado, y las dos cosas se
   dicen en el mundo: «delante» es la dirección en la que camina y «parado» es
   la vertical. Los ejes locales del hueso de la mano son los que dejó el bind
   —o sea, nada— así que un desplazamiento escrito ahí es adivinar. Se calcula
   el punto en el mundo y se lo trae al espacio del padre, que es exacto y se
   corrige solo cuando la mano gira.
   SIGUE COLGADO DEL HUESO: lo que se calcula es su transformación local, así
   que entre cuadro y cuadro lo lleva la mano y no hay dos cuentas que se puedan
   desincronizar. */
const _fp = new T.Vector3(), _fq = new T.Quaternion(), _fe = new T.Euler();
const _fq2 = new T.Quaternion();
/* `incX` e `incZ` son opcionales y por omision valen la inclinacion floja de
   siempre. Hacen falta porque el frasco ya no siempre va PARADO: apoyado en la
   palma abierta va ACOSTADO, y eso es un cuarto de vuelta sobre Z. Sin poder
   decirlo, la unica forma de acostarlo seria girar el hueso de la mano, que
   mueve tambien los dedos. */
function ponFrascoMundo(p, giro, incX, incZ){
  const g = FRASCO.grupo; if (!g || !g.parent) return;
  g.parent.updateMatrixWorld(true);
  g.position.copy(g.parent.worldToLocal(_fp.copy(p)));
  g.parent.getWorldQuaternion(_fq);
  _fe.set(incX == null ? 0.12 : incX, giro, incZ == null ? 0.16 : incZ);
  g.quaternion.copy(_fq.invert().multiply(_fq2.setFromEuler(_fe)));
}

/* ── EL CENTRO DE LA PALMA, LEIDO DE LOS HUESOS ──
   El hueso de la mano esta en la MUNECA, no en la palma: apoyar algo ahi lo
   deja colgando del antebrazo. La palma es el tramo entre la muneca y la base
   del dedo medio, asi que su centro es un punto sobre esa recta — y sale de los
   huesos, o sea que sigue siendo cierto con la mano en cualquier pose.
   `alto` levanta el objeto por encima de la piel a lo largo de la normal de la
   palma, que se saca del propio hueso y no se supone vertical: si se supusiera,
   con la mano apenas inclinada las pastillas se hunden. */
const _plA = new T.Vector3(), _plB = new T.Vector3(), _plN = new T.Vector3();
const _plQ = new T.Quaternion();
function puntoPalma(lado, haciaDedos, alto){
  const mn = PJ.idx[(lado || 'Right') + 'Hand'];
  const md = PJ.idx[(lado || 'Right') + 'Medio'];
  if (!mn) return null;
  mn.getWorldPosition(_plA);
  if (md){ md.getWorldPosition(_plB); }
  else { _plB.copy(_plA); _plB.y += 0.08; }
  _plA.lerp(_plB, haciaDedos == null ? 0.55 : haciaDedos);
  /* la normal de la palma es el +Z del hueso de la mano llevado al mundo: los
     dedos corren sobre su +Y —medido, de 0 a 0,188— asi que lo que sale de la
     palma es el eje que queda. */
  calcNormalPalma(lado || 'Right');
  _plA.addScaledVector(_plN, alto == null ? 0.03 : alto);
  return _plA;
}

/* ── LA NORMAL DE LA PALMA SALE DE TRES HUESOS, NO DE UN EJE DEL BIND ──
   La palma es un plano y tres puntos lo definen: la muneca, la base del dedo
   medio y el ancho entre indice y menique. Su normal es el producto cruz de
   esos dos vectores, o sea que es correcta en cualquier pose y no depende de
   como quedaron los ejes locales del rig.
   EL SIGNO SE COMPRUEBA, NO SE DEDUCE —lo mismo que con `DEDO_SIGNO`—: cual de
   los dos lados del plano es la palma depende del orden en que se detectaron
   los dedos, y eso lo decide el histograma. Fotografiado en los dos sentidos.
   `PALMA_LADO` guarda el que dio la palma de frente. */
const PALMA_LADO = -1;
const _plC = new T.Vector3(), _plD = new T.Vector3(), _plE = new T.Vector3();
function calcNormalPalma(lado){
  const mn = PJ.idx[lado + 'Hand'], md = PJ.idx[lado + 'Medio'];
  const ix = PJ.idx[lado + 'Indice'], mq = PJ.idx[lado + 'Menique'];
  if (!mn || !md || !ix || !mq){ _plN.set(0, 1, 0); return _plN; }
  mn.getWorldPosition(_plC); md.getWorldPosition(_plD);
  _plD.sub(_plC);                                    /* muneca -> dedo medio */
  ix.getWorldPosition(_plC); mq.getWorldPosition(_plE);
  _plE.sub(_plC);                                    /* indice -> menique */
  _plN.crossVectors(_plD, _plE).normalize().multiplyScalar(PALMA_LADO);
  return _plN;
}
function normalPalma(lado){ return calcNormalPalma(lado || 'Right').clone(); }

/* dónde está el punto que la cámara del plano tiene que mirar, leído del mundo
   y no supuesto */
function puntoFrasco(){
  if (!FRASCO.grupo) return null;
  FRASCO.grupo.getWorldPosition(_fp);
  return _fp;
}
