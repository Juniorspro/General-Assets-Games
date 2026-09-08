
/* ══════════════════════ EL CIELO: PARKOUR ENTRE NUBES ══════════════════════
   Pedido: *«al pasar la puerta no volvamos al barrio, ya pasemos a un lugar
   súper raro donde es puro cielo y de la nada caemos en una nube y vamos
   viajando entre nubes saltando en parkour y tenemos gravedad baja»*.

   VIVE EN LA MISMA ESCENA QUE EL BARRIO Y QUE EL CUARTO, y por la misma razón
   que el cuarto: una segunda escena obligaría a duplicar el cielo, las luces y
   el post-proceso, que son justo las cuatro cosas que hacen que los tres sitios
   se vean del mismo juego. Lo único que los separa es la altura —las nubes
   viven en y = 400— y una lista que se prende y se apaga.

   Y LA COLISIÓN ES UN DISCO Y NO LA MALLA. Una nube son ocho o diez esferas
   achatadas fundidas: probar contra eso sería un rayo por cuadro contra
   cuatrocientos triángulos para averiguar algo que un centro y un radio ya
   dicen. Además un disco es lo que el jugador LEE: la silueta de la nube vista
   desde arriba. */
const NUB = {
  on: false, grupo: null, ok: false,
  Y: 400,                    /* la altura a la que vive el cielo */
  discos: [],                /* {x, z, y, r} — una por nube */
  ultima: 0,                 /* la última nube pisada: es donde se reaparece */
  meta: 0, tocadas: 0, tFin: 0,
  fase: 'cae',               /* cae · juega · fin */
  t: 0
};
/* ── GRAVEDAD BAJA, Y LOS TRES NÚMEROS SALEN DEL SALTO QUE SE QUIERE ──
   No se eligen por separado: se elige cuánto se sube y cuánto se tarda, y de
   ahí salen la gravedad y el impulso. Con 2,6 m de altura y 1,05 s de subida:
       g = 2h/t² = 4,72        v = 2h/t = 4,95
   Eso da un salto largo y lento —el aire dura 2,1 s— que es exactamente lo que
   se pidió: se siente flotar. Y el alcance con la carrera puesta es
   `v_horizontal · 2t` = 3,2 × 2,1 = **6,7 m**, así que los huecos entre nubes
   se dibujan por debajo de eso. */
const NUB_G = 4.72, NUB_SALTO = 4.95;
/* EL CONTROL EN EL AIRE ES EL 55 % DEL DE TIERRA. En cero, un salto mal
   apuntado no se puede corregir y el parkour se vuelve lotería; en cien, el
   salto deja de tener peso y da lo mismo desde dónde se salte. */
const NUB_AIRE = 0.55;
/* dos indulgencias que todo juego de saltar tiene y que nadie ve:
   COYOTE = se puede saltar hasta 0,12 s DESPUÉS de haberse ido del borde.
   GUARDA = un salto apretado hasta 0,17 s ANTES de tocar el piso, vale igual. */
const NUB_COYOTE = 0.12, NUB_GUARDA = 0.17;

/* una esfera de verdad y no el icosaedro del follaje: una nube hecha de
   icosaedros se lee a montón de piedras. Doce por ocho es de sobra para algo
   que se dibuja a 1/1,7 de resolución. */
const geoBlob2 = new T.SphereGeometry(0.5, 12, 8);
let matNube = null, matNubeB = null;

function armaNubes(){
  if (NUB.ok) return;
  const g = new T.Group();
  g.visible = false;
  const piezas = [], lejos = [];
  NUB.discos.length = 0;

  /* ── EL CAMINO ──
     Las nubes no están sorteadas al azar por el cielo: forman una CADENA que
     avanza y sube. Con posiciones sueltas, la mitad de los saltos serían
     imposibles y la otra mitad sobrarían; con una cadena, cada hueco se elige
     sabiendo de dónde se viene, y por eso se puede garantizar que el camino se
     puede hacer entero. */
  let x = 0, z = 0, y = NUB.Y, rumbo = 0;
  const rnd = (() => { let s = 20260901; return () => (s = (s*1664525 + 1013904223) >>> 0) / 4294967296; })();
  const rr = (a, b) => a + rnd()*(b - a);
  const N = 42;
  for (let i = 0; i < N; i++){
    const r = i === 0 ? 7.0 : rr(2.6, 5.2);
    NUB.discos.push({ x, z, y, r });

    /* la forma: entre seis y once esferas achatadas, todas dentro del disco.
       LAS DE ARRIBA VAN MÁS ADENTRO, que es lo que hace que una nube se lea a
       nube y no a piedra: el contorno de abajo es plano —es el suelo que se
       pisa— y arriba se amontona. */
    const n = 6 + Math.floor(rnd()*6);
    for (let k = 0; k < n; k++){
      const a = rnd()*Math.PI*2, d = Math.sqrt(rnd()) * r * 0.72;
      const alto = rnd()*rnd();                   /* casi todas abajo */
      const rad = rr(0.42, 0.72) * r * (1 - alto*0.45);
      piezas.push({ g: geoBlob2,
                    p:[x + Math.cos(a)*d*(1 - alto*0.4), y - rad*0.55 + alto*rad*1.5,
                       z + Math.sin(a)*d*(1 - alto*0.4)],
                    s:[rad*2, rad*1.25, rad*2] });
    }

    /* y el próximo eslabón: el rumbo gira poco, así que el camino serpentea en
       vez de ir en zigzag, y el hueco crece con el nivel — el primero es un
       paso y el último un salto largo */
    rumbo += rr(-0.55, 0.55);
    const k = i / (N - 1);
    /* ── EL HUECO SE MIDE CONTRA EL SALTO, NO CONTRA EL GUSTO ──
       Con la carrera en 3,2 m/s y 2,1 s de aire, el alcance es 6,7 m de punta a
       punta. Un hueco de 5,7 —que fue el primer intento— deja un margen de un
       metro para el error de apuntado, la aceleración que falta y el borde
       redondo de la nube: medido con el camino jugado solo, eran 338 caídas
       para dieciocho nubes. Topado en 4,7 el margen pasa a dos metros. */
    const hueco = rr(1.9, 2.5) + k * 1.5;         /* de 2,2 a 4,0 m de borde a borde */
    const paso = r + hueco + 3.2;
    x += Math.cos(rumbo) * paso;
    z += Math.sin(rumbo) * paso;
    /* ── Y LA SUBIDA SE TOPA, PORQUE SE SUMA AL HUECO ──
       El salto llega a 2,6 m de alto y a 6,7 de largo, pero no a las dos cosas
       a la vez: el alcance a media altura es bastante menos. Con la subida
       sorteada aparte del hueco, cada tanto salían las dos grandes juntas y ese
       salto no existía — medido, el camino jugado solo se clavaba en la nube 37
       de 42 y no pasaba de ahí en nueve mil cuadros. */
    y += rr(-0.8, 1.15);                           /* sube, con algún escalón para abajo */
  }
  NUB.meta = N - 1;

  /* nubes de fondo: no se pisan y no colisionan, están para que el cielo tenga
     profundidad. Sin ellas, más allá del camino no hay NADA y el sitio se lee a
     una hilera de plataformas flotando en un degradado. */
  for (let i = 0; i < 120; i++){
    const a = rnd()*Math.PI*2, d = rr(90, 620);
    const cx = Math.cos(a)*d + x*0.5, cz = Math.sin(a)*d + z*0.5;
    const cy = NUB.Y + rr(-70, 120);
    const rad = rr(9, 34);
    const n = 4 + Math.floor(rnd()*4);
    for (let k = 0; k < n; k++){
      const b = rnd()*Math.PI*2, e = Math.sqrt(rnd())*rad*0.7;
      const rr2 = rr(0.45, 0.8)*rad;
      lejos.push({ g: geoBlob2, p:[cx + Math.cos(b)*e, cy + rr(-rad*0.2, rad*0.3),
                                    cz + Math.sin(b)*e],
                   s:[rr2*2, rr2*1.1, rr2*2] });
    }
  }

  /* ── EL MATERIAL: LAMBERT Y NO BASIC ──
     Una nube toda del mismo blanco es un recorte de papel: lo único que le da
     volumen es que la parte de arriba reciba más luz que la de abajo, y eso lo
     hace el hemisférico que el juego ya tiene. El emisivo la sostiene para que
     la de abajo no se vaya a negro. */
  matNube = new T.MeshLambertMaterial({ color: 0xf2f4f8, emissive: 0x6f7d92,
                                        emissiveIntensity: 0.55, flatShading: true });
  matNubeB = new T.MeshLambertMaterial({ color: 0xdfe6f0, emissive: 0x7d8ba2,
                                         emissiveIntensity: 0.7, flatShading: true,
                                         transparent: true, opacity: 0.85,
                                         depthWrite: false });
  const m1 = new T.Mesh(fundir(piezas), matNube);
  m1.frustumCulled = false; m1.receiveShadow = true; m1.castShadow = false;
  g.add(m1);
  const m2 = new T.Mesh(fundir(lejos), matNubeB);
  m2.frustumCulled = false;
  g.add(m2);
  if (luna) escena.add(luna.target);
  escena.add(g);
  NUB.grupo = g;
  NUB.ok = true;
}

/* ¿sobre qué nube estoy, y a qué altura está su lomo? Devuelve el índice de la
   nube más alta que esté por debajo de los pies, o −1. */
function nubeBajo(x, z, y){
  let mejor = -1, alt = -1e9;
  for (let i = 0; i < NUB.discos.length; i++){
    const d = NUB.discos[i];
    const dx = x - d.x, dz = z - d.z;
    if (dx*dx + dz*dz > d.r*d.r) continue;
    /* medio metro de tolerancia hacia arriba: sin ella, subir un escalón de
       nube cuesta un salto perfecto y el camino se vuelve una escalera */
    if (d.y <= y + 0.55 && d.y > alt){ alt = d.y; mejor = i; }
  }
  return mejor;
}

function entraNubes(){
  armaNubes();
  fotoDelBarrio();
  MODO = 'nubes';
  NUB.on = true; NUB.fase = 'cae'; NUB.t = 0; NUB.ultima = 0; NUB.tocadas = 1;
  for (const o of MUNDO.barrio) o.visible = false;
  if (CU.grupo) CU.grupo.visible = false;
  NUB.grupo.visible = true;
  $('menu').classList.remove('on');
  $('hud').classList.add('on');
  /* SE ENTRA CAYENDO, que es lo que se pidió: «de la nada caemos en una nube».
     Veinte metros por encima de la primera, que con esta gravedad son 2,9 s de
     caída — lo suficiente para que el sitio se vea antes de tocarlo. */
  const d = NUB.discos[0];
  JUG.x = d.x; JUG.z = d.z; JUG.y = d.y + 20;
  JUG.vx = JUG.vz = 0; JUG.vy = 0;
  JUG.yaw = Math.atan2(-(NUB.discos[1].x - d.x), -(NUB.discos[1].z - d.z));
  JUG.pitch = -0.35;
  AND.fase = 0; AND.ojo = OJO; AND.fov = 70;
  JUG.aire = true; JUG.coyote = 0; JUG.guarda = 0;
  cieloNubes(true);
  ponVista(false);
  aviso(TX('aNubes'));
  $('calle').textContent = TX('cNubes');
}

function salNubes(){
  NUB.on = false;
  if (NUB.grupo) NUB.grupo.visible = false;
  cieloNubes(false);
  JUG.vy = 0; JUG.aire = false;
}

/* ── EL CIELO CAMBIA, Y NO ES SÓLO EL COLOR DE FONDO ──
   Acá no llueve, no hay faroles y no es de noche: si se dejaran la niebla del
   barrio y las seis luces, las nubes saldrían grises y a treinta metros no
   habría nada. Se guardan los valores de antes para poder volver. */
let _nubGuarda = null;
function cieloNubes(v){
  if (v && !_nubGuarda){
    _nubGuarda = { niebla: escena.fog ? escena.fog.density : 0,
                   amb: ambiente ? ambiente.intensity : 0,
                   ambC: ambiente ? ambiente.color.clone() : null,
                   ambG: ambiente ? ambiente.groundColor.clone() : null,
                   luna: luna ? luna.intensity : 0,
                   fondo: escena.background ? escena.background.clone() : null,
                   lluvia: LLUVIA.malla ? LLUVIA.malla.visible : false,
                   domo: cielo ? cielo.visible : false,
                   sat: postMat.uniforms.sat.value };
  }
  if (v){
    if (escena.fog) escena.fog.density = 0.0016;
    /* ── Y EL HEMISFÉRICO CAMBIA DE COLOR, NO SÓLO DE INTENSIDAD ──
       El del barrio es azul de noche arriba y casi negro abajo, que es lo
       correcto para las tres de la mañana. Subiéndole sólo la intensidad, el
       personaje sigue recibiendo azul oscuro por arriba y nada por abajo:
       medido en la captura, contra un cielo casi blanco los hombros salían
       negros. Acá arriba hay cielo claro y ABAJO TAMBIÉN, porque lo que hay
       debajo son nubes blancas — el rebote es la mitad del sitio. */
    if (ambiente){
      ambiente.intensity = 2.05;
      ambiente.color.setHex(0xdce9f7);
      ambiente.groundColor.setHex(0x9fb0c4);
    }
    if (luna) luna.intensity = 1.25;
    escena.background = new T.Color(0x9fc4e8);
    if (LLUVIA.malla) LLUVIA.malla.visible = false;
    if (SALPICA.malla) SALPICA.malla.visible = false;
    /* EL DOMO DEL CIELO SE APAGA, Y NO ESTÁ EN LA LISTA DEL BARRIO. `esconde()`
       lo saltea a propósito —de noche el cielo es el cielo en los tres sitios—
       así que apagar el barrio lo dejaba puesto: medido en la captura, una
       banda negra cruzando el horizonte por delante del azul. Acá el fondo es
       un color y no un domo. */
    if (cielo) cielo.visible = false;
    for (const l of LUCES) l.intensity = 0;
  } else if (_nubGuarda){
    if (escena.fog) escena.fog.density = _nubGuarda.niebla;
    if (ambiente){
      ambiente.intensity = _nubGuarda.amb;
      if (_nubGuarda.ambC) ambiente.color.copy(_nubGuarda.ambC);
      if (_nubGuarda.ambG) ambiente.groundColor.copy(_nubGuarda.ambG);
    }
    if (luna) luna.intensity = _nubGuarda.luna;
    escena.background = _nubGuarda.fondo;
    if (LLUVIA.malla) LLUVIA.malla.visible = _nubGuarda.lluvia;
    if (SALPICA.malla) SALPICA.malla.visible = _nubGuarda.lluvia;
    if (cielo) cielo.visible = _nubGuarda.domo;
    if (luna){ luna.castShadow = false; }
    _nubGuarda = null;
  }
}

/* ── LA FÍSICA DEL CIELO ──
   Es la única parte del juego con eje vertical: en el barrio y en el cuarto la
   altura se pega al suelo y no hay nada que integrar. */
/* ── LA SOMBRA DEL PERSONAJE, QUE ES LO ÚNICO QUE LO APOYA EN LA NUBE ──
   Pedido: *«pero que sí demos sombra del personaje real»*. Acá no hay faroles,
   así que la luz que proyecta es la luna convertida en sol: una direccional con
   una caja de sombra CHICA que sigue al jugador. Chica y no la del mundo: la
   resolución del mapa se reparte sobre el área que cubre, y una caja de
   trescientos metros para una sombra de dos deja el contorno hecho un peine. */
let _nubSol = false;
function solNubes(){
  if (!luna) return;
  if (!_nubSol){
    luna.castShadow = true;
    luna.shadow.mapSize.set(1024, 1024);
    const c = luna.shadow.camera;
    c.left = -9; c.right = 9; c.top = 9; c.bottom = -9;
    c.near = 1; c.far = 80;
    c.updateProjectionMatrix();
    luna.shadow.bias = -0.0016;
    luna.shadow.normalBias = 0.03;
    _nubSol = true;
  }
  /* la luz viaja con el jugador; el objetivo también, o la caja se queda atrás */
  luna.position.set(JUG.x - 16, JUG.y + 30, JUG.z + 11);
  luna.target.position.set(JUG.x, JUG.y, JUG.z);
  luna.target.updateMatrixWorld();
}

function pasoNubes(dt){
  NUB.t += dt;
  solNubes();
  const d0 = NUB.discos[NUB.ultima];

  JUG.vy -= NUB_G * dt;
  JUG.y += JUG.vy * dt;

  const i = nubeBajo(JUG.x, JUG.z, JUG.y);
  if (i >= 0 && JUG.vy <= 0 && JUG.y <= NUB.discos[i].y + 0.02){
    JUG.y = NUB.discos[i].y;
    JUG.vy = 0;
    if (JUG.aire){
      son('paso', 0.5);
      if (NUB.fase === 'cae'){ NUB.fase = 'juega'; aviso(TX('aNubes2')); }
    }
    JUG.aire = false;
    JUG.coyote = NUB_COYOTE;
    if (i > NUB.ultima){ NUB.ultima = i; NUB.tocadas = Math.max(NUB.tocadas, i + 1); }
    if (i >= NUB.meta && NUB.fase !== 'fin'){
      NUB.fase = 'fin'; NUB.tFin = 0; aviso(TX('aNubes3'));
    }
  } else {
    JUG.aire = true;
    JUG.coyote = Math.max(0, JUG.coyote - dt);
  }

  /* el salto: vale el FLANCO y no el estado, y con las dos indulgencias */
  JUG.guarda = Math.max(0, JUG.guarda - dt);
  if (JUG.guarda > 0 && JUG.coyote > 0){
    JUG.vy = NUB_SALTO; JUG.aire = true;
    JUG.coyote = 0; JUG.guarda = 0;
    son('clic', 0.55);
  }

  /* ── Y LA ÚLTIMA NUBE DEVUELVE AL BARRIO ──
     Si la puerta lleva al cielo y el cielo no lleva a ninguna parte, el barrio
     —doscientas treinta y cuatro casas y noventa y seis faroles— deja de ser
     jugable y pasa a verse sólo en la cinemática. El camino de nubes tiene que
     terminar en algún lado, y terminar donde empezó la historia es lo único que
     cierra: se cae del cielo al barrio. */
  if (NUB.fase === 'fin'){
    NUB.tFin += dt;
    $('cineNeg').style.opacity = Math.min(1, NUB.tFin / 2.2);
    $('cineNeg').classList.add('on');
    if (NUB.tFin > 2.6){
      salNubes();
      entraJuego();
      $('cineNeg').classList.remove('on');
      $('cineNeg').style.opacity = '';
    }
    return;
  }

  /* ── CAERSE NO ES PERDER, ES VOLVER A LA ÚLTIMA NUBE ──
     Un parkour en el que un error cuesta el nivel entero es un parkour que se
     cierra a los cinco minutos. Se vuelve a la última que se pisó, que además
     es lo que hace que el camino se pueda leer como una serie de intentos. */
  if (JUG.y < NUB.Y - 90){
    const d = NUB.discos[NUB.ultima];
    JUG.x = d.x; JUG.z = d.z; JUG.y = d.y + 3;
    JUG.vx = JUG.vz = 0; JUG.vy = 0;
    son('mal', 0.5);
  }
  return d0;
}

function saltoNubes(){
  if (!NUB.on) return false;
  JUG.guarda = NUB_GUARDA;
  return true;
}
