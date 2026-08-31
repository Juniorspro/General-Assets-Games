
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
const FRASCO = { ok: false, grupo: null, tri: 0 };

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
  /* VAN DEL LADO DE LA CÁMARA. Puestas en +Z local quedaban DETRÁS del frasco
     —el eje local del grupo apunta al revés que la cámara del plano— y en la
     captura no se veía ninguna: la pastilla es lo que el plano tiene que
     mostrar, así que va delante de todo lo demás. */
  /* Y VAN APOYADAS EN LOS DEDOS. Sueltas debajo del frasco quedaban flotando en
     el aire —medido en la captura, dos centímetros por debajo del puño y sin
     tocar nada— y una pastilla que flota no se lee a pastilla que alguien
     tiene: se lee a error. */
  for (const [x, y, z, r] of [[-0.028, -0.006, -0.030, 0.34],
                              [0.000, -0.017, -0.041, -0.55]]){
    const c = new T.Mesh(new T.CapsuleGeometry(0.0055, 0.0098, 3, 10), mp);
    c.rotation.set(Math.PI/2, 0, r);
    c.position.set(x, y, z);
    g.add(c);
  }
  PJ.idx['RightHand'].add(g);
  FRASCO.grupo = g; FRASCO.ok = true;
  g.visible = false;
}

function ponFrasco(v){ if (FRASCO.grupo) FRASCO.grupo.visible = !!v; }

/* el frasco viaja con el personaje, así que tiene que estar en la MISMA capa:
   dejándolo en la 0 mientras el cuerpo pasa a la 1, en el plano de la cara —y
   en el de las pastillas— se dibujaría con el fondo desenfocado */
function capaFrasco(n){
  if (!FRASCO.grupo) return;
  FRASCO.grupo.traverse(o => { o.layers.set(n); });
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
function ponFrascoMundo(p, giro){
  const g = FRASCO.grupo; if (!g || !g.parent) return;
  g.parent.updateMatrixWorld(true);
  g.position.copy(g.parent.worldToLocal(_fp.copy(p)));
  g.parent.getWorldQuaternion(_fq);
  _fe.set(0.12, giro, 0.16);
  g.quaternion.copy(_fq.invert().multiply(_fq2.setFromEuler(_fe)));
}

/* dónde está el punto que la cámara del plano tiene que mirar, leído del mundo
   y no supuesto */
function puntoFrasco(){
  if (!FRASCO.grupo) return null;
  FRASCO.grupo.getWorldPosition(_fp);
  return _fp;
}
