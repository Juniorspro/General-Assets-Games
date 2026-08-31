
/* ══════════════════════ EL FRASCO Y LAS PASTILLAS ══════════════════════
   LOS DOS VAN POR CODIGO, y el frasco dejo de ser un modelo generado. Pedido:
   «que las pastillas y el frasquito sean modelos 3D procedurales». Es lo
   correcto y no solo mas barato:

   1. UN FRASCO DE PASTILLAS ES UN CILINDRO CON TAPA. No tiene una sola forma
      que un generador pueda inventar mejor que una cuenta: es un tubo ambar
      levemente conico, una tapa blanca acanalada y una etiqueta de papel. El
      GLB generado pesaba 77 KB en base64 y traia 1.935 triangulos para dibujar
      eso.
   2. Y SOBRE TODO: LAS MEDIDAS PASAN A SER MIAS. El defecto que el usuario vio
      —«cuando levanta la mano la botellita atraviesa toda la mano»— sale de no
      saber donde esta el eje ni cuanto mide el modelo que devolvio el
      generador. Con el frasco escrito, el radio y el alto son numeros que puedo
      comparar contra la palma: 17 mm de radio contra 52 de palma.

   CUELGA DEL HUESO DE LA MANO Y NO DE LA ESCENA. Puesto en la escena habria que
   copiarle la posicion de la mano en cada cuadro, y eso es una segunda cuenta
   que se puede desincronizar de la animacion — el mismo defecto que en LEMI
   dejo la llave quieta mientras el brazo subia. Colgado del hueso, la mano lo
   lleva por construccion. */
const FRASCO = { ok: false, grupo: null, past: null, tri: 0 };

/* medidas de un frasco de farmacia de verdad, en metros */
const FR_R = 0.0170;        /* radio del cuerpo */
const FR_H = 0.0620;        /* alto del cuerpo */
const FR_TAPA = 0.0150;     /* alto de la tapa */

function cargaFrasco(){
  if (FRASCO.grupo || !PJ.ok) return;
  const g = new T.Group();
  let tri = 0;
  const suma = (m) => { tri += m.geometry.index
    ? m.geometry.index.count / 3 : m.geometry.attributes.position.count / 3; };

  /* EL CUERPO ES LEVEMENTE CONICO —el de abajo un 4 % mas angosto—, que es como
     sale de un molde de inyeccion y es lo que evita que se lea a lata. Ambar
     opaco y no translucido: la transparencia obligaria a ordenar el dibujo
     contra el cuerpo y contra las pastillas, y a las tres de la manana con un
     farol de costado un ambar oscuro brillante se lee igual de bien. */
  const mCuerpo = new T.MeshPhongMaterial({ color: 0x9a5a1c, shininess: 46,
                                            specular: 0x6b5a3a });
  const cuerpo = new T.Mesh(
    new T.CylinderGeometry(FR_R, FR_R * 0.96, FR_H, 20, 1), mCuerpo);
  g.add(cuerpo); suma(cuerpo);

  /* LA TAPA VA CON DOCE LADOS Y NO CON VEINTE, y no es para ahorrar: las
     acanaladuras de una tapa de seguridad son exactamente eso, facetas. Con
     veinte lados se ve un cilindro liso y con doce se leen las canaletas sin
     dibujar una sola de mas. */
  const mTapa = new T.MeshPhongMaterial({ color: 0xe8e6df, shininess: 18,
                                          specular: 0x201f1c });
  const tapa = new T.Mesh(
    new T.CylinderGeometry(FR_R * 1.06, FR_R * 1.06, FR_TAPA, 12, 1), mTapa);
  tapa.position.y = (FR_H + FR_TAPA) / 2;
  g.add(tapa); suma(tapa);

  /* LA ETIQUETA ES UN ANILLO UN PELO MAS GRANDE QUE EL CUERPO, no una textura:
     medio milimetro de papel encima del vidrio es lo que hace que se vea el
     canto del papel, y el canto es lo que dice «etiqueta». Sin fondos ni tapas,
     asi que son veinte quads. */
  const mEtiq = new T.MeshPhongMaterial({ color: 0xd9d4c6, shininess: 6,
                                          specular: 0x141414 });
  const etiq = new T.Mesh(
    new T.CylinderGeometry(FR_R * 1.012, FR_R * 1.002, FR_H * 0.56, 20, 1, true),
    mEtiq);
  etiq.position.y = -FR_H * 0.06;
  g.add(etiq); suma(etiq);

  /* EL ORIGEN DEL GRUPO QUEDA EN EL MEDIO DEL CUERPO, que es por donde una mano
     lo agarra y por donde se apoya acostado. Escrito asi no hay que adivinar
     donde lo dejo un horno. */
  FRASCO.tri = Math.round(tri);

  /* ── LAS PASTILLAS ──
     Capsulas de 12 mm por 13 de diametro, que es una pastilla de verdad. Tres y
     no dos: una sola en una palma se lee a moneda, y con tres se cuentan de una.
     Van en su propio grupo para poder aparecer y desaparecer sin el frasco. */
  const mp = new T.MeshPhongMaterial({ color: 0xf2f0ea, shininess: 24,
                                       specular: 0x1e2024 });
  PJ.idx['RightHand'].add(g);

  const gp = new T.Group();
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
/* +1, Y AHORA SE DECIDIO MIDIENDO EN VEZ DE FOTOGRAFIANDO.
   Estaba en −1 y era el lado equivocado: la botella y las pastillas se estaban
   apoyando en el DORSO de la mano. La prueba no necesita ojo — la palma es, por
   definicion, el lado hacia el que se cierran los dedos. Se cierra el puno con
   `ponPuno` y se mira hacia donde se movieron las cuatro yemas: el producto
   escalar de esa direccion con la normal cruda da POSITIVO, asi que la normal
   cruda YA apunta hacia la palma y el −1 la estaba dando vuelta.
   (El comentario viejo decia «fotografiado en los dos sentidos». Lo estaba, pero
   con la camara puesta SOBRE la normal, y entonces las dos fotos se ven
   parecidas: en una mirabas la palma y en la otra el dorso, las dos de frente.) */
const PALMA_LADO = 1;
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
/* el eje LARGO de la mano: de la muneca a la base del dedo medio. Es el «arriba»
   natural de la mano, y sirve para que la camara la encuadre siempre igual. */
const _plU = new T.Vector3();
function ejePalma(lado){
  const mn = PJ.idx[(lado || 'Right') + 'Hand'], md = PJ.idx[(lado || 'Right') + 'Medio'];
  if (!mn || !md) return _plU.set(0, 1, 0).clone();
  mn.getWorldPosition(_plC); md.getWorldPosition(_plU);
  return _plU.sub(_plC).normalize().clone();
}

/* dónde está el punto que la cámara del plano tiene que mirar, leído del mundo
   y no supuesto */
function puntoFrasco(){
  if (!FRASCO.grupo) return null;
  FRASCO.grupo.getWorldPosition(_fp);
  return _fp;
}
