/* ======================== RETARGET DE LOS CLIPS ===========================
   Los 11 personajes de per/*.glb no traen animacion y se les presta uno de los
   tres clips de anim/*.glb. Comparten los MISMOS 26 nombres de hueso, pero NO la
   pose de reposo: el rig sale ajustado a cada malla y los marcos de cada
   articulacion quedan girados de cualquier manera. Medido sobre los GLB, la
   rotacion local de reposo de Hips va de 2,4 grados en canon-cuerdas a 133,5 en
   volcan-obrero, y la de Spine02 de 6,0 a 133,5.

   POR QUE NO ALCANZA UNA CORRECCION FIJA POR HUESO (lo que habia antes)
   Se hacia  q_donante * inv(reposoDonante) * reposoDestino , o sea una constante
   por hueso. Eso puede acertar UN fotograma pero no todos: la rotacion local se
   compone en el marco del PADRE, y ese marco cambia en cada fotograma cuando el
   padre se mueve. Con las caderas a cien grados de diferencia una constante no
   puede ser correcta a la vez para el reposo y para el movimiento, y por eso el
   personaje quedaba derecho quieto pero encorvado al caminar.

   LO QUE SE HACE AHORA: espacio de MUNDO, que es donde "girar el brazo treinta
   grados hacia adelante" significa lo mismo en los dos rigs. Por hueso b y
   fotograma f:
       delta   = mundoAnimadoDonante(b) * inv(mundoReposoDonante(b))
       mundoDestino(b) = delta * mundoReposoDestino(b)
       localDestino(b) = inv(mundoDestino(padre)) * mundoDestino(b)
   El pase va de padre a hijo porque mundoDestino(padre) es el resultado YA
   corregido: ahi esta justamente la parte que una constante no puede reproducir.

   El cero del donante viaja dentro del propio GLB: mk_anim.py le dejo como pose
   de reposo de los nodos la POSE NEUTRA del clip (el promedio de sus fotogramas),
   asi que aca no hay que promediar nada. Eso importa porque los clips de la
   libreria vienen con un sesgo constante grande (Idle tiene la cadera 40 grados
   fuera de su bind, Run_02 la columna 27) y si se tomara ese sesgo como cero se
   le sumaria al personaje, que es la joroba que se veia.

   Costo: 26 huesos x ~70-127 fotogramas x 3 clips por personaje, una sola vez al
   cargarlo. Son unos pocos milisegundos y no toca el bucle de dibujado, asi que
   no depende de GFX. */
const _rtQ = new T.Quaternion(), _rtI = new T.Quaternion(),
      _rtD = new T.Quaternion(), _rtL = new T.Quaternion();
/* El rig de un GLB por NOMBRE de hueso: rotacion y posicion locales de reposo
   mas el nombre del PADRE. El padre hace falta porque el retarget pasa por
   mundo; la version anterior solo guardaba q y p y por eso no podia hacerlo. */
function reposoDe(raiz){
  const R = {};
  raiz.traverse(o => {
    if (!o.name || R[o.name] !== undefined) return;
    const pa = o.parent;
    R[o.name] = { q: o.quaternion.clone(), p: o.position.clone(),
                  padre: (pa && pa.name && R[pa.name]) ? pa.name : null };
  });
  return R;
}
/* rotaciones de mundo de la pose de reposo, mas el orden padre-antes-que-hijo */
function mundoDe(rig){
  const W = {}, orden = [];
  const sube = nom => {
    if (W[nom]) return W[nom];
    const h = rig[nom];
    W[nom] = (h.padre && rig[h.padre]) ? sube(h.padre).clone().multiply(h.q)
                                       : h.q.clone();
    orden.push(nom);
    return W[nom];
  };
  for (const nom in rig) sube(nom);
  return { W, orden };
}
function retargetClip(clip, rigDon, modelo){
  if (!clip || !rigDon) return clip;
  /* el reposo se lee UNA vez y se guarda: si un personaje ya tiene acciones
     sonando, sus huesos no estan en reposo y leerlos daria un cero falso */
  const rigDst = modelo.userData._rig || (modelo.userData._rig = reposoDe(modelo));
  const A = mundoDe(rigDon), B = mundoDe(rigDst);
  const c2 = clip.clone();
  const rot = {}, pos = [];
  for (const tr of c2.tracks){
    const i = tr.name.lastIndexOf('.');
    if (i < 0) continue;
    const nom = tr.name.slice(0, i), prop = tr.name.slice(i + 1);
    if (prop === 'quaternion' && rigDon[nom] && rigDst[nom]) rot[nom] = tr;
    else if (prop === 'position') pos.push([nom, tr]);
  }
  /* mk_anim.py deja todas las pistas con el MISMO reloj, asi que se recorre por
     indice de fotograma. Si alguna vez no fuera asi, mejor devolver el clip sin
     tocar que escribir cualquier cosa. */
  let nf = -1, mezcla = false;
  for (const n in rot){
    const c = rot[n].values.length / 4;
    if (nf < 0) nf = c; else if (c !== nf) mezcla = true;
  }
  if (nf <= 0 || mezcla) return c2;

  const orden = A.orden.filter(n => rigDst[n]);
  const Wd = {}, Wt = {}, prev = {};
  for (const n of orden){ Wd[n] = new T.Quaternion(); Wt[n] = new T.Quaternion(); }
  for (let f = 0; f < nf; f++){
    // 1) pose del donante, de local a mundo
    for (const n of orden){
      const tr = rot[n];
      if (tr){ const k = f * 4;
        _rtQ.set(tr.values[k], tr.values[k+1], tr.values[k+2], tr.values[k+3]); }
      else _rtQ.copy(rigDon[n].q);
      const pa = rigDon[n].padre;
      if (pa && Wd[pa]) Wd[n].copy(Wd[pa]).multiply(_rtQ); else Wd[n].copy(_rtQ);
    }
    // 2) el giro de mundo del donante, aplicado al reposo del destino
    for (const n of orden){
      if (rot[n]){
        _rtD.copy(Wd[n]).multiply(_rtI.copy(A.W[n]).invert());
        Wt[n].copy(_rtD).multiply(B.W[n]);
      } else {
        const pa = rigDst[n].padre;
        if (pa && Wt[pa]) Wt[n].copy(Wt[pa]).multiply(rigDst[n].q);
        else Wt[n].copy(B.W[n]);
      }
    }
    // 3) de vuelta a local, que es lo que consume el AnimationMixer
    for (const n of orden){
      const tr = rot[n]; if (!tr) continue;
      const pa = rigDst[n].padre;
      if (pa && Wt[pa]) _rtL.copy(_rtI.copy(Wt[pa]).invert()).multiply(Wt[n]);
      else _rtL.copy(Wt[n]);
      /* continuidad de signo: dos cuaterniones opuestos son la misma rotacion
         pero interpolados dan la vuelta larga, y se ve un tironeo */
      const p = prev[n];
      if (p && (p[0]*_rtL.x + p[1]*_rtL.y + p[2]*_rtL.z + p[3]*_rtL.w) < 0){
        _rtL.set(-_rtL.x, -_rtL.y, -_rtL.z, -_rtL.w);
      }
      const k = f * 4;
      tr.values[k] = _rtL.x; tr.values[k+1] = _rtL.y;
      tr.values[k+2] = _rtL.z; tr.values[k+3] = _rtL.w;
      prev[n] = [_rtL.x, _rtL.y, _rtL.z, _rtL.w];
    }
  }
  /* Solo la cadera trae traslacion: mk_anim.py tiro las otras 23, que eran
     constantes y llevaban los LARGOS DE HUESO del donante (aplicadas al
     personaje le pisaban sus proporciones y le estiraban la malla). Va en delta
     y escalada por la relacion de alturas de cadera, si no un personaje bajo
     flota y uno alto se hunde. */
  for (const par of pos){
    const h = rigDon[par[0]], hd = rigDst[par[0]];
    if (!h || !hd) continue;
    const tr = par[1], k = h.p.y ? (hd.p.y / h.p.y) : 1;
    for (let i = 0; i < tr.values.length; i += 3){
      tr.values[i]     = hd.p.x + (tr.values[i]     - h.p.x) * k;
      tr.values[i + 1] = hd.p.y + (tr.values[i + 1] - h.p.y) * k;
      tr.values[i + 2] = hd.p.z + (tr.values[i + 2] - h.p.z) * k;
    }
  }
  return c2;
}
