
/* ══════════════════════════ LA CINEMÁTICA ══════════════════════════
   Dos planos y un corte seco en el medio.

   PLANO A — primera persona, bajando por la calle. Es la cámara del juego pero
   filmada: el mismo cabeceo, la misma lluvia, los mismos faroles.
   PLANO B — la cámara se pone ENFRENTE, con lente largo pegado a la cara y el
   fondo desenfocado: abre los ojos, mira, y los vuelve a cerrar mientras el
   cuerpo sigue caminando.

   NO LLEVA BANDAS NEGRAS ARRIBA Y ABAJO. Es lo primero que se pidió y encima es
   lo correcto: en un marco que ya es apaisado y girado dentro de un teléfono,
   recortarlo más deja el barrio en una ranura. Lo que hace que se lea a
   cinemática no es el recorte sino lo que sí está — el desenfoque, la
   aberración del lente, el grano más alto, la viñeta cerrada y, sobre todo, que
   nadie tenga el control.

   Y ES UNA FUNCIÓN DEL TIEMPO, `pon(t)`, no una máquina de estados: por eso el
   banco puede fotografiar el segundo 17,4 con `__V.cine(17.4)` sin esperar
   diecisiete segundos. Es lo que en LEMI y en Vecindario encontró todos los
   defectos de encuadre, que son los que no se ven leyendo el código. */

/* ── LO ANALÍTICO ──
   `suave` es el smoothstep de siempre y hace de resorte: derivada cero en las
   dos puntas, o sea que un giro de cabeza arranca y termina frenando. Un
   resorte de verdad —integrado— leería igual y rompería la pureza de `pon(t)`. */
const suave = (a, b, t) => { const k = cl((t - a) / (b - a), 0, 1); return k*k*(3 - 2*k); };
const mez = (a, b, k) => a + (b - a) * k;

/* ── CUATRO PLANOS Y TRES CORTES ──
   A · primera persona caminando · S · el plano que lo SIGUE, donde por fin se
   lo ve caminar entero · B · la cara · P · las pastillas.
   Los cortes son constantes con nombre y no números sueltos: mover uno movía
   antes cinco cosas repartidas por el archivo. */
const CINE_T1  = 7.6;             /* primera persona -> el plano que lo sigue */
const CINE_T2  = 13.8;            /* el seguimiento -> la cara */
const CINE_T3  = 24.0;            /* la cara -> las pastillas */
const CINE_DUR = 32.4;
const CINE_CORTE = CINE_T2;       /* el plano de la cara cuenta desde acá */
const CINE_VEL = 1.28;            /* m/s: un paso de madrugada, no una marcha */
const CINE_ZANC = 0.80;           /* metros por medio paso */

/* ── HACIA DÓNDE MIRA EN EL PLANO A ──
   Cuatro miradas y la vuelta al frente. El detalle que hace que se lea a
   persona y no a cámara sobre rieles es que la cabeza NO vuelve exactamente al
   mismo sitio: cada tramo deja su propio residuo. */
const CINE_MIRA = [
  [0.0,  2.1,  0.00, -0.020],
  [2.1,  3.7,  0.42,  0.045],    /* una casa a la izquierda */
  [3.7,  4.6,  0.05, -0.010],
  [4.6,  5.9, -0.17,  0.300],    /* los cables */
  [5.9,  6.9, -0.04, -0.330],    /* el charco de la vereda */
  [6.9, 99.0, 0.02, -0.030]
];

/* ══════════════════════════ LA CABEZA ══════════════════════════
   No hay un modelo: es la misma familia de cajas, cilindros y esferas con la
   que está hecho el barrio, y va a la CAPA 1 — de eso depende todo lo demás,
   porque la cámara del mundo mira la capa 0 y la de la cabeza la 1, así que las
   dos pasadas salen de la misma escena y del MISMO encuadre sin tener que
   mantener dos cámaras sincronizadas.

   Y LAS LUCES DE LA CARA TAMBIÉN VAN EN LA CAPA 1. three.js junta las luces
   comparando `luz.layers` contra las de la CÁMARA, así que una luz en la capa 1
   no existe para el mundo: la cara se ilumina sola, sin que el farol de mentira
   le pinte las casas de atrás. */
let CARA_LUZ = null, CARA_REL = null, CARA_AMB = null;
let LLUCARA = null;

/* ── LAS TRES LUCES DE LA CARA, Y LAS TRES TIENEN UN TRABAJO ──
   1. LA CLAVE sale del farol de verdad que tiene delante: la posición se lee de
      `FAROLES`, así que la sombra en la cara cae del mismo lado que el poste que
      se ve en el fondo. Pero el ÁNGULO lo pone el plano, no el farol: puesta
      sobre la recta al poste —que está adelante y arriba, o sea detrás de la
      cámara— la luz termina en el eje del lente, y una luz frontal NO MODELA:
      medido, cara plana, sin sombra de nariz, sin ceja y sin pómulo.
   2. EL CONTRA es lo que separa la silueta del fondo desenfocado. Sin él, una
      cara de noche contra un barrio oscuro es una mancha — la lección que en
      LEMI costó una vuelta con el screamer adentro de la cueva.
   3. Y EL RELLENO NO PUEDE SER NEGRO ABAJO: con el suelo del hemisférico en
      negro, toda cara que no mire al cielo recibe cero, o sea la mitad de abajo
      del mentón y del cuello.
   LAS TRES VAN EN LA CAPA 1. three.js junta las luces comparando sus capas
   contra las de la CÁMARA, así que una luz de la capa 1 no existe para el
   mundo: la cara se ilumina sola, sin que el farol de mentira le pinte las
   casas de atrás. */
function armaLucesCara(){
  if (CARA_LUZ) return;
  CARA_LUZ = new T.PointLight(0xffd2a0, 7.5, 12, 1.2);
  CARA_REL = new T.DirectionalLight(0x9dc0ea, 0.58);
  CARA_AMB = new T.HemisphereLight(0x2b3b52, 0x14161c, 0.22);
  for (const l of [CARA_LUZ, CARA_REL, CARA_AMB]){ l.layers.set(1); escena.add(l); }
}

/* ── LA LLUVIA DE CERCA ──
   La lluvia del juego se apaga por debajo de los 70 cm y termina de aparecer a
   los 2,20 m, que es lo correcto para primera persona: una gota a treinta
   centímetros del ojo sería una mancha blanca tapando media pantalla. Pero en
   el plano de la cara la cabeza está a setenta centímetros del lente, o sea
   JUSTO en la franja apagada — y una cara bajo la lluvia sin una sola gota
   pasándole por delante no está bajo la lluvia. Ésta es otra nube, chica,
   pegada al lente y en la capa 1. */
function armaLluviaCara(){
  if (LLUCARA) return;
  const n = 170, caja = 1.5, alto = 2.6;
  const g = new T.InstancedBufferGeometry();
  g.setAttribute('position', new T.BufferAttribute(new Float32Array([
    -0.5,0,0,  0.5,0,0,  0.5,1,0,  -0.5,0,0,  0.5,1,0,  -0.5,1,0 ]), 3));
  const sem = new Float32Array(n*4);
  for (let i = 0; i < n; i++){
    sem[i*4]   = azr(-caja, caja);
    sem[i*4+1] = azr(0, alto);
    sem[i*4+2] = azr(-caja, caja);
    sem[i*4+3] = azr(0.75, 1.35);
  }
  g.setAttribute('semilla', new T.InstancedBufferAttribute(sem, 4));
  g.instanceCount = n;
  const mat = new T.ShaderMaterial({
    uniforms: { t: { value: 0 }, cen: { value: new T.Vector3() }, camPos: { value: new T.Vector3() },
                caja: { value: caja }, alto: { value: alto } },
    vertexShader: `
      attribute vec4 semilla;
      uniform float t, caja, alto;
      uniform vec3 cen, camPos;
      varying float vA;
      void main(){
        vec3 c = floor(cen * 4.0) / 4.0;
        float x = c.x + mod(semilla.x + 0.30*t*semilla.w, caja*2.0) - caja;
        float z = c.z + mod(semilla.z + 0.16*t*semilla.w, caja*2.0) - caja;
        float y = c.y + mod(semilla.y - t*semilla.w*13.0, alto) - alto*0.42;
        vec3 base = vec3(x, y, z);
        vec3 hacia = camPos - base;
        float d = length(hacia);
        vec3 lado = normalize(cross(vec3(0.0,1.0,0.0), hacia/max(d,0.001)));
        /* ── LA GOTA DE CERCA ES CHIQUITA, Y ES UNA CUENTA ──
           A sesenta centímetros del lente y con 26 grados de campo, el cuadro
           mide veintiocho centímetros de alto: una tira de dieciséis
           centímetros y dos de ancho sale de doscientos treinta píxeles por
           treinta, o sea UNA TABLA BLANCA CRUZANDO LA CARA. Medido en la
           captura, tapaba media frente. Con 4,5 cm de largo y 3 mm de ancho
           quedan unos sesenta píxeles por cuatro, que es una gota. */
        vec3 tira = vec3(0.30, -1.0, 0.16) * (0.045 * semilla.w);
        vec3 p = base + lado * position.x * 0.0016 + tira * position.y;
        /* se apaga pegada al lente y a partir de un metro: lo que tiene que
           hacer es cruzar el plano, no llenarlo */
        vA = 0.24 * smoothstep(0.16, 0.34, d) * (1.0 - smoothstep(0.62, 1.35, d));
        gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: 'varying float vA; void main(){ gl_FragColor = vec4(0.66, 0.76, 0.92, vA); }',
    transparent: true, depthWrite: false, side: T.DoubleSide, fog: false
  });
  LLUCARA = new T.Mesh(g, mat);
  LLUCARA.frustumCulled = false;
  LLUCARA.layers.set(1);
  LLUCARA.visible = false;
  escena.add(LLUCARA);
}

/* ══════════════════════════ EL GUION ══════════════════════════ */
const _pB = new T.Vector3();
/* [adelante, costado, alto] desde la muñeca. LA MANO SE ADELANTA MÁS QUE EL
   FRASCO: el hueso está en la muñeca y los dedos llegan quince centímetros más
   allá, así que un frasco puesto a ocho centímetros queda DETRÁS del puño — y
   desde la foto eso se ve igual que un frasco que no se dibuja. */
let FR_OFF = [0.150, 0.010, 0.035];
const CINEMA = {
  on: false, t: 0, x0: 0, z0: 0, yaw0: 0, adx: 0, adz: 0,
  faseAnt: 0, rayoHecho: false, listo: false,

  prepara(){
    if (this.listo) return;
    cargaPersonaje(); armaLucesCara(); armaLluviaCara();
    /* el frasco cuelga del hueso de la mano, así que sólo se puede armar cuando
       el personaje ya está: si el GLB todavía no llegó, el plano P lo intenta
       de nuevo en su primer cuadro */
    cargaFrasco();
    this.listo = true;
  },

  arranca(){
    this.prepara();
    MODO = 'cine';
    this.t = 0; this.faseAnt = 0; this.rayoHecho = false;
    this.on = true;
    /* ── DÓNDE ARRANCA, Y ES UNA DECISIÓN DE FONDO ──
       En el plano B la cámara mira HACIA ATRÁS, o sea que el fondo desenfocado
       es la cuadra que acaba de pasar. Arrancando a dieciséis metros del cruce,
       el plano de la cara caía con la ESQUINA a seis metros por detrás de la
       cabeza — y el flanco de una casa de esquina, a fov 26, ocupa casi
       cincuenta grados: medido en la captura, una tapia negra detrás del
       personaje y ni un punto de luz. Arrancando tres metros ANTES del cruce se
       lo cruza en el segundo dos y para cuando empieza el plano B la esquina
       quedó a dieciséis metros: el fondo es la calle entera con sus faroles, que
       desenfocados son las manchas que un lente largo tiene que dar. */
    this.x0 = EJES[4] + 3.0; this.z0 = EJES[2];
    this.yaw0 = Math.PI/2;                       /* mirando hacia -X */
    this.adx = -Math.sin(this.yaw0); this.adz = -Math.cos(this.yaw0);
    $('menu').classList.remove('on');
    $('hud').classList.remove('on');
    $('cineNeg').classList.add('on');
    $('cineSalta').classList.add('on');
    camaVol(0.85);
    postMat.uniforms.abe.value = 0.018;
    postMat.uniforms.vig.value = 0.80;
    escondePersonaje(); LLUCARA.visible = false;
    this.pon(0);
  },

  /* ── DÓNDE ESTÁ EL CUERPO EN EL SEGUNDO t ──
     Una sola cuenta, y la usan los dos planos: en el A la cámara VA en la
     cabeza y en el B la MIRA. Con dos cuentas, el corte entre planos mostraría
     a alguien que se teletransporta medio metro. */
  cuerpo(t){
    const av = t * CINE_VEL;
    const f = Math.PI * av / CINE_ZANC;
    return {
      x: this.x0 + this.adx*av, z: this.z0 + this.adz*av, f,
      /* el ocho: el vertical va al DOBLE de frecuencia que el lateral, porque
         hay dos pisadas por ciclo y una sola oscilación de cadera */
      sy: Math.abs(Math.sin(f)) * 0.036,
      sx: Math.cos(f) * 0.030,
      rl: Math.cos(f) * 0.017,
      pt: Math.sin(f*2) * 0.007
    };
  },

  pon(t){
    const c = this.cuerpo(t);
    const der = { x: -this.adz, z: this.adx };

    if (t < CINE_T1){
      /* ═══ PLANO A: PRIMERA PERSONA ═══ */
      LLUCARA.visible = false;
      postMat.uniforms.cara.value = 0;
      capaPersonaje(0);
      /* el desenfoque de la entrada: la vista se acomoda en el primer segundo y
         medio. Es lo mismo que hace un ojo al abrirse, y encima anuncia el
         recurso que el plano B va a usar entero. */
      postMat.uniforms.dof.value = (1 - suave(0.0, 1.7, t)) * 0.85;

      let yaw = 0, pit = 0, ant = [0, -0.02];
      for (let i = 0; i < CINE_MIRA.length; i++){
        const m = CINE_MIRA[i];
        if (t >= m[0] && t < m[1]){
          const k = suave(m[0], m[0] + (m[1]-m[0])*0.55, t);
          yaw = mez(ant[0], m[2], k); pit = mez(ant[1], m[3], k);
          break;
        }
        ant = [m[2], m[3]];
      }
      /* LA CABEZA NUNCA ESTÁ QUIETA. Tres senos de frecuencias que no son
         múltiplos entre sí: así el ciclo no se repite y no se lee a animación.
         Sin esto, los tramos en los que mira al frente parecen una cámara
         montada en un trípode que camina. */
      yaw += Math.sin(t*0.83)*0.013 + Math.sin(t*1.97 + 1.3)*0.0075;
      pit += Math.sin(t*0.61 + 2.1)*0.010 + Math.sin(t*1.43)*0.005;

      cam.position.set(c.x + der.x*c.sx, alturaSuelo(c.x, c.z) + OJO + c.sy,
                       c.z + der.z*c.sx);
      cam.rotation.set(pit + c.pt, this.yaw0 + yaw, c.rl);
      const fov = 70 + Math.sin(t*0.37)*0.9;
      if (Math.abs(cam.fov - fov) > 0.01){ cam.fov = fov; cam.updateProjectionMatrix(); }
      JUG.x = c.x; JUG.z = c.z;              /* los faroles y la lluvia lo siguen */
      /* Y SE VE EL CUERPO: es la misma primera persona del juego, así que
         mirando hacia abajo están el pecho, las correas de la mochila y las
         piernas caminando. La fase del paso es la MISMA que mueve la cámara. */
      AND.v = CINE_VEL; AND.fase = c.f; PJ.t = t;
      if (!GESTO.libre){
        GESTO.pitch = pit + c.pt; GESTO.yawRel = 0; GESTO.abre = 1;
        GESTO.autoParp = true; GESTO.expr = 'neutro'; GESTO.bocaExpr = null;
        GESTO.mira = 0; GESTO.miraY = 0; GESTO.mano = 0;
      }
      ponPersonaje(c.x, c.z, this.yaw0, alturaSuelo(c.x, c.z), true);
      pasoPersonaje(0);
      ponFrasco(false);

    } else if (t < CINE_T2){
      /* ═══ PLANO S: EL PLANO QUE LO SIGUE ═══
         «haz que el tipo literalmente esté caminando». En primera persona la
         caminata se DEDUCE del cabeceo, y en el primer plano de la cara ni eso:
         del cuello para abajo no se ve nada. Acá se lo ve entero —la mochila,
         los brazos, las piernas, la sombra— y ése es el único plano de la
         escena en el que la palabra «caminando» se puede comprobar mirando.

         VA DETRÁS Y DE COSTADO Y NO DE FRENTE: de frente el paso casi no se
         lee, porque las piernas se tapan entre ellas; de tres cuartos por
         detrás la zancada se abre en el cuadro. */
      const u = t - CINE_T1, dur = CINE_T2 - CINE_T1;
      LLUCARA.visible = false;
      postMat.uniforms.cara.value = 0;
      postMat.uniforms.dofS.value = 0;
      capaPersonaje(0); capaFrasco(0);
      /* un desenfoque suave y no el del primer plano: acá lo que interesa es la
         figura contra la calle, así que el fondo se ablanda pero se sigue
         leyendo. Y se cierra un poco a lo largo del plano, que es lo que hace
         una cámara que se acerca. */
      postMat.uniforms.dof.value = mez(0.34, 0.20, suave(0, dur, u));

      AND.v = CINE_VEL; AND.fase = c.f; PJ.t = t;
      if (!GESTO.libre){
        /* MELANCÓLICO ES MIRAR AL PISO, no una cara triste: la cabeza va abajo,
           la mirada baja y la boca cerrada. Y parpadea despacio. */
        GESTO.pitch = 0.30 + Math.sin(u*0.53)*0.035;
        GESTO.yawRel = Math.sin(u*0.37 + 0.6)*0.13;
        GESTO.abre = 1; GESTO.autoParp = true;
        GESTO.expr = 'cansado'; GESTO.mira = 0; GESTO.miraY = -0.6;
        GESTO.boca = 0; GESTO.bocaExpr = null; GESTO.mano = 0;
      }
      const suelo = alturaSuelo(c.x, c.z);
      ponPersonaje(c.x, c.z, this.yaw0, suelo, false);
      pasoPersonaje(0);
      PJ.grupo.updateMatrixWorld(true);
      ponFrasco(false);

      /* LA CÁMARA CAMINA CON ÉL Y NO LO PERSIGUE: va enganchada al cuerpo con
         un desfase fijo, así que lo que se mueve en el cuadro es la calle
         pasando y no el personaje escapándose. El acercamiento es de la
         distancia, no del zoom. */
      const dist = mez(4.35, 2.95, suave(0, dur, u));
      const lat  = mez(1.35, 0.95, suave(0, dur, u));
      const cx = c.x - this.adx*dist + der.x*lat;
      const cz = c.z - this.adz*dist + der.z*lat;
      /* el temblor de una cámara en mano: tres senos que no son múltiplos, más
         un resto del propio paso — quien filma también camina */
      const tem = Math.sin(u*1.31)*0.010 + Math.sin(u*2.17 + 1.2)*0.006;
      cam.position.set(cx + tem, suelo + 1.42 + Math.sin(u*1.7)*0.012 + c.sy*0.35,
                       cz + tem*0.6);
      const ax = c.x - cx, az = c.z - cz;
      const ay = (suelo + 1.24) - cam.position.y;
      cam.rotation.set(Math.atan2(ay, Math.hypot(ax, az)),
                       Math.atan2(-ax, -az),
                       Math.sin(u*0.83)*0.008);
      if (Math.abs(cam.fov - 38) > 0.01){ cam.fov = 38; cam.updateProjectionMatrix(); }
      JUG.x = c.x; JUG.z = c.z;

    } else if (t < CINE_T3){
      /* ═══ PLANO B: LA CARA ═══ */
      const u = t - CINE_CORTE;
      postMat.uniforms.dofS.value = 0;
      capaFrasco(1); ponFrasco(false);
      LLUCARA.visible = true; capaPersonaje(1);
      postMat.uniforms.cara.value = 1;
      postMat.uniforms.dof.value = 0.88 + suave(0, 9.0, u)*0.12;

      const suelo = alturaSuelo(c.x, c.z);
      const hx = c.x + der.x*c.sx, hz = c.z + der.z*c.sx;

      /* ── LOS OJOS ──
         Cerrados · se abren · miran · se cierran. La apertura es LENTA (0,8 s) y
         el cierre del final más lento todavía: un párpado que baja en dos
         décimas es un parpadeo, y un parpadeo no dice lo mismo que cerrar los
         ojos. Los dos parpadeos del medio sí son rápidos, y ASIMÉTRICOS —bajan
         en 0,09 s y suben en 0,17—, que es como parpadea alguien.
         Y la apertura no es un párpado de bulto: es el cuadro del atlas que
         corresponde —abierto, a medias o cerrado—, que en una cabeza sin cuenca
         es lo único que se lee.
         `GESTO.libre` ES LA LLAVE DE LA CARA. Mientras la cinemática corre, la
         cara es suya y nadie más puede escribirla; la sonda que fotografía las
         treinta y dos expresiones la toma prestada poniendo esa marca. Sin eso,
         la sonda escribe la expresión y el cuadro siguiente la cinemática la
         pisa — y las seis fotos salen idénticas, que fue exactamente lo que
         pasó. */
      if (!GESTO.libre){
        let abre = suave(1.85, 2.65, u);
        abre *= 1 - 0.97*(suave(4.10, 4.19, u) - suave(4.19, 4.36, u));
        abre *= 1 - 0.97*(suave(6.35, 6.44, u) - suave(6.44, 6.62, u));
        abre *= 1 - suave(7.55, 9.65, u);
        GESTO.abre = abre; GESTO.autoParp = false;
        /* LA MIRADA SE MUEVE, y es lo que separa a alguien de un maniquí. Con
           la cara dibujada eso es cambiar de cuadro —mira a un lado, al otro,
           al frente— y no girar un globo. */
        GESTO.mira = Math.sin(u*0.44);
        /* Y TAMBIÉN EN VERTICAL, que es lo que la segunda hoja habilitó: con
           una sola fila de miradas la vista sólo va de un lado al otro y se lee
           a metrónomo. Los dos senos tienen frecuencias que no son múltiplos
           entre sí, así que el recorrido no se repite. */
        GESTO.miraY = Math.sin(u*0.31 + 1.1) * 0.85;
        /* EL CANSANCIO ENTRA ANTES QUE EL CIERRE, y el número salió de una
           medición: la rampa de apertura manda sobre la expresión —un ojo a
           medio cerrar es un ojo a medio cerrar— así que con el umbral en 7,9,
           que es después de que `abre` empieza a bajar en 7,55, el cuadro
           `cansado` no se veía NUNCA. */
        /* MELANCÓLICO NO ES UNA CARA TRISTE PUESTA TODO EL PLANO: entra
           pesado, después mira alrededor —y ahí es donde las miradas de la
           segunda hoja tienen algo que hacer— y recién al final se le cae la
           cara. Con `neutro` desde el primer cuadro, los ojos grandes y
           redondos se leen a sorpresa, que es lo contrario del plano. */
        GESTO.expr = u < 2.6 ? 'cansado' : (u > 6.75 ? 'triste' : 'neutro');
        /* y la mandíbula respira: un primer plano de una cara con la boca
           clavada se lee a máscara. No habla —no hay nadie a quien hablarle—
           pero traga y entreabre los labios. */
        GESTO.boca = Math.max(0, Math.sin(u*0.63 - 0.4)) * 0.30
                   + Math.max(0, Math.sin(u*2.9)) * 0.10;
        GESTO.bocaExpr = null; GESTO.mano = 0;
        GESTO.pitch = 0.10; GESTO.yawRel = Math.sin(u*0.41)*0.10;
      }

      /* el cuerpo camina y la cabeza va donde el esqueleto la ponga: la cámara
         lo LEE en vez de suponerlo, así que el encuadre no puede despegarse de
         la animación */
      AND.v = CINE_VEL; AND.fase = c.f; PJ.t = t;
      ponPersonaje(hx, hz, this.yaw0, suelo, false);
      pasoPersonaje(0);
      PJ.grupo.updateMatrixWorld(true);
      const _pO = new T.Vector3();
      /* EL PUNTO DE LOS OJOS ES EL ANCLA DE LA PLACA, no dos huesos de globo
         ocular: desde que la cara es un dibujo, `caraOjos` ES donde están los
         ojos, y encima ya viene centrado. */
      if (PJ.ok && PJ.idx['caraOjos']) PJ.idx['caraOjos'].getWorldPosition(_pO);
      else _pO.set(hx, suelo + OJO, hz);
      const hy = _pO.y;

      /* ── LA CÁMARA VA MEDIO ENGANCHADA, Y ESO ES EL PEDIDO ──
         Enganchada del todo, la cara queda clavada en el cuadro y el balanceo
         no se ve en ninguna parte: se ve el fondo moviéndose y la cabeza
         quieta, que es el error clásico de un plano así. Siguiendo sólo el 66 %
         del cabeceo, en la cara queda un tercio de residuo —que es lo que se
         mira— y el fondo se mueve entero. */
      /* LA DISTANCIA SE CALCULA SOBRE LA CABEZA QUE HAY, no sobre la que uno
         imagina. Esta cabeza mide treinta y cinco centímetros —es un personaje
         estilizado— así que a noventa centímetros y con 26 grados el cuadro
         medía cuarenta y dos: medido, la coronilla salía cortada por arriba
         (y 1,38 de 1). A 1,18 m el cuadro mide 54 cm y la cabeza ocupa el 64 %,
         que es un primer plano con aire. */
      const dist = mez(1.180, 1.045, suave(0, 11.0, u));
      /* LA CÁMARA VA ADELANTE Y CAMINA DE ESPALDAS, que es lo que hace una
         cámara que filma a alguien de frente. Estaba DETRÁS —`− adelante·dist`—
         y funcionaba sólo porque la cabeza dibujada por código se giraba media
         vuelta para mirarla: con un cuerpo entero eso es alguien caminando en
         una dirección con la cabeza puesta al revés, y en la captura lo que se
         veía era la nuca. */
      const px = _pO.x + this.adx*dist - der.x*c.sx*0.34;
      const py = suelo + OJO + 0.012 + c.sy*0.66 + Math.sin(u*1.9)*0.0035;
      const pz = _pO.z + this.adz*dist - der.z*c.sx*0.34;
      cam.position.set(px, py, pz);
      /* SE APUNTA UN POCO POR DEBAJO DE LOS OJOS. Apuntando justo a ellos
         quedan clavados en el medio del cuadro, que es donde no van: en un
         primer plano los ojos caen alrededor de los dos tercios del alto, y lo
         que sube el encuadre es bajar el punto al que se mira. Medido, con el
         punto en los ojos la coronilla tocaba el borde de arriba. */
      const ox = _pO.x - px, oy = (hy - 0.032) - py, oz = _pO.z - pz;
      cam.rotation.set(Math.atan2(oy, Math.hypot(ox, oz)),
                       Math.atan2(-ox, -oz),
                       Math.sin(u*0.77)*0.010 - c.rl*0.30);
      /* EL LENTE LARGO ES LA MITAD DEL PLANO. A 26 grados y setenta centímetros
         el cuadro mide 32 cm de alto, o sea que una cabeza de 22 ocupa el 68 %:
         eso es un primer plano. Con los 70 del juego habría que acercarse a
         12 cm y la nariz saldría deformada. */
      if (Math.abs(cam.fov - 26) > 0.01){ cam.fov = 26; cam.updateProjectionMatrix(); }
      JUG.x = c.x; JUG.z = c.z;

      /* ── LA CLAVE SALE DEL FAROL QUE TIENE DELANTE ──
         La DIRECCIÓN es la del poste que de verdad está en el cuadro; el NIVEL
         se corrige por la distancia, porque un farol a doce metros deja una
         cara en penumbra y el plano no muestra nada. Es una decisión de imagen
         y va anotada como tal: lo que el ojo comprueba es de qué lado cae la
         sombra, no cuántos lux hay. */
      let mej = null, dm = 1e9;
      for (const f of FAROLES){
        const dx = f.x - hx, dz = f.z - hz;
        if (dx*this.adx + dz*this.adz < 0) continue;       /* sólo los de adelante */
        const d = dx*dx + dz*dz;
        if (d < dm){ dm = d; mej = f; }
      }
      /* ── LA CLAVE VA A TRES CUARTOS, Y EL FAROL SÓLO ELIGE DE QUÉ LADO ──
         Puesta sobre la recta al poste de verdad, la luz terminaba casi en el
         eje del lente —el farol más cercano está adelante y arriba, o sea
         detrás de la cámara— y una luz frontal NO MODELA: medido en la
         ampliación, la cara salía plana, sin sombra de nariz, sin ceja y sin
         pómulo. Lo que da forma es una clave a cuarenta grados de costado y
         treinta y cinco de alto, que es la posición de siempre.
         Así que el farol decide LO ÚNICO que el ojo puede comprobar contra el
         fondo —de qué lado viene la luz— y el ángulo lo pone el plano. */
      const lado = mej ? (((mej.x - hx)*der.x + (mej.z - hz)*der.z) >= 0 ? 1 : -1) : -1;
      const kx = -this.adx*0.55 + der.x*lado*0.72;
      const kz = -this.adz*0.55 + der.z*lado*0.72;
      const kn = Math.hypot(kx, 0.62, kz) || 1;
      CARA_LUZ.position.set(hx + (kx/kn)*2.0, hy + (0.62/kn)*2.0, hz + (kz/kn)*2.0);
      CARA_LUZ.intensity = 7.5;
      /* el contra viene de atrás y del lado CONTRARIO a la clave: es lo que
         dibuja el filo de la mejilla en sombra contra el fondo desenfocado */
      CARA_REL.position.set(hx + this.adx*2.4 - der.x*lado*1.8, hy + 2.0, hz + this.adz*2.4 - der.z*lado*1.8);
      CARA_REL.target.position.set(hx, hy, hz);
      CARA_REL.target.updateMatrixWorld();

      LLUCARA.material.uniforms.cen.value.set(hx, hy + 0.25, hz);
      LLUCARA.material.uniforms.camPos.value.copy(cam.position);
      LLUCARA.material.uniforms.t.value = RELOJ.value;

    } else {
      /* ═══ PLANO P: LAS PASTILLAS ═══
         «otra vista de cámara desenfocada que después se enfoca en algo que él
         tiene en la mano». El plano entra CON EL SUJETO FUERA DE FOCO —no sólo
         el fondo— y el foco se hace encima de lo que él está mirando. Ésa es la
         diferencia entre un rack focus y un fundido: lo que cambia no es el
         brillo, es qué cosa del cuadro está resuelta.

         Y SIGUE CAMINANDO. El brazo se levanta mezclado sobre el ciclo de la
         caminata, así que las piernas no se enteran: lo que se ve es alguien
         que camina mirándose la mano, que es el plano que se pidió. */
      const u = t - CINE_T3, dur = CINE_DUR - CINE_T3;
      if (!FRASCO.ok) cargaFrasco();
      LLUCARA.visible = true; capaPersonaje(1); capaFrasco(1); ponFrasco(true);
      postMat.uniforms.cara.value = 1;
      postMat.uniforms.dof.value = 1.0;
      /* EL ENFOQUE SE HACE, NO APARECE: 2,6 segundos, y arranca recién en el
         1,2 — un plano que ya está enfocándose desde el primer cuadro no se lee
         a plano nuevo, se lee a error del anterior. */
      postMat.uniforms.dofS.value = 1.0 - suave(1.2, 3.8, u);

      const suelo = alturaSuelo(c.x, c.z);
      AND.v = CINE_VEL; AND.fase = c.f; PJ.t = t;
      if (!GESTO.libre){
        GESTO.mano = suave(0.0, 1.7, u);
        GESTO.pitch = 0.20 + 0.30 * GESTO.mano;   /* le baja la vista a la mano */
        GESTO.yawRel = -0.10 * GESTO.mano;
        GESTO.abre = 1; GESTO.autoParp = true;
        GESTO.expr = u > 5.4 ? 'triste' : 'cansado';
        GESTO.mira = 0; GESTO.miraY = -0.8;
        GESTO.boca = 0; GESTO.bocaExpr = 'sellada';
      }
      ponPersonaje(c.x, c.z, this.yaw0, suelo, false);
      pasoPersonaje(0);
      PJ.grupo.updateMatrixWorld(true);

      /* EL FRASCO VA DELANTE DEL PUÑO. Puesto con un desplazamiento en los
         ejes del hueso quedaba ADENTRO de la mano —medido en la captura, lo
         único que asomaba era una astilla naranja— porque los ejes locales de
         un hueso son los que dejó el bind y no significan nada. */
      const mn = PJ.idx['RightHand'];
      if (mn && FRASCO.ok){
        mn.getWorldPosition(_pB);
        _pB.x += this.adx*FR_OFF[0] + der.x*FR_OFF[1];
        _pB.z += this.adz*FR_OFF[0] + der.z*FR_OFF[1];
        _pB.y += FR_OFF[2];
        ponFrascoMundo(_pB, this.yaw0 + 0.55);
      }
      /* EL PUNTO SE LEE DEL MUNDO. Si la cámara apuntara a una posición
         calculada aparte, el frasco y el encuadre serían dos cuentas distintas
         y en cuanto el brazo se mueva se separan. */
      const pf = puntoFrasco() || _pB.set(c.x, suelo + 1.25, c.z);
      /* LA DISTANCIA SALE DE LA MANO Y NO DEL FRASCO: esta mano estilizada mide
         veinte centímetros, así que encuadrando sólo el frasco lo que llena el
         cuadro es el puño. A 0,55 m y con 30 grados el cuadro mide 29 cm: el
         frasco ocupa el 29 % y la mano entra entera. */
      const dist = mez(0.56, 0.40, suave(0, dur, u));
      /* LA CÁMARA MIRA DESDE ARRIBA, y no es una preferencia: a la altura de la
         mano el fondo del cuadro es SU PROPIA CARA, y como el cuerpo entero va
         en la capa nítida la cara sale enfocada y se lleva la atención del
         plano. Bajando la vista treinta grados, detrás de la mano queda el
         asfalto mojado —capa 0, o sea desenfocado— y lo único resuelto del
         cuadro es lo que tiene en la mano. */
      const px = pf.x + this.adx*dist + der.x*0.20;
      const py = pf.y + 0.32 - 0.04*suave(0, dur, u);
      const pz = pf.z + this.adz*dist + der.z*0.20;
      cam.position.set(px + Math.sin(u*1.23)*0.004,
                       py + Math.sin(u*1.61 + 0.7)*0.003, pz);
      const ox = pf.x - px, oy = pf.y - py, oz = pf.z - pz;
      cam.rotation.set(Math.atan2(oy, Math.hypot(ox, oz)),
                       Math.atan2(-ox, -oz),
                       0.06 + Math.sin(u*0.71)*0.012);
      /* TREINTA GRADOS Y NO VEINTISÉIS: a 34 cm el cuadro mide 18 cm de alto, o
         sea que el frasco de 8,5 ocupa el 47 % y las dos pastillas se cuentan.
         Con el lente de la cara habría que meterse a 25 cm y ahí la mano tapa
         el frasco. */
      if (Math.abs(cam.fov - 30) > 0.01){ cam.fov = 30; cam.updateProjectionMatrix(); }
      JUG.x = c.x; JUG.z = c.z;

      /* la clave viene de arriba y de costado, como el farol que tiene encima,
         y el nivel es bajo: es una mano a las tres de la mañana, no un producto
         en un estudio */
      /* LA LUZ VA LEJOS Y NO CERCA, y es aritmética: una luz puntual cae con el
         cuadrado de la distancia, así que la misma intensidad que modela una
         cara a dos metros QUEMA una mano a ochenta centímetros — medido en la
         primera captura, el antebrazo salía blanco puro y tapaba el frasco. Se
         la deja a la misma distancia que en el plano de la cara. */
      CARA_LUZ.position.set(pf.x - der.x*1.25 + this.adx*0.80, pf.y + 1.45,
                            pf.z - der.z*1.25 + this.adz*0.80);
      /* Y MÁS BAJA QUE EN LA CARA: el frasco es plástico brillante con una
         etiqueta casi blanca, así que con el nivel del retrato el especular lo
         deja blanco puro y la etiqueta deja de existir. */
      CARA_LUZ.intensity = 3.4;
      CARA_REL.position.set(pf.x + this.adx*1.6 + der.x*1.1, pf.y + 1.2,
                            pf.z + this.adz*1.6 + der.z*1.1);
      CARA_REL.target.position.copy(pf);
      CARA_REL.target.updateMatrixWorld();

      LLUCARA.material.uniforms.cen.value.set(pf.x, pf.y + 0.10, pf.z);
      LLUCARA.material.uniforms.camPos.value.copy(cam.position);
      LLUCARA.material.uniforms.t.value = RELOJ.value;
    }

    /* ── EL NEGRO DE LAS PUNTAS ──
       Entra desde negro y se va a negro, y el de la salida empieza ANTES de que
       termine el plano: cortar del último cuadro al menú en el mismo instante se
       lee a que el juego se cerró, no a que la escena terminó. */
    const neg = Math.max(1 - suave(0.15, 1.55, t), suave(CINE_DUR - 1.9, CINE_DUR - 0.15, t));
    $('cineNeg').style.opacity = neg.toFixed(3);
    /* el grano sube y la saturación baja: es la misma imagen del juego filmada
       con una cámara peor, que es exactamente lo que se quiere */
    postMat.uniforms.grano.value = CFG.grano * 1.75;
    postMat.uniforms.sat.value = CFG.sat * mez(0.72, 1.0, suave(0.4, 4.0, t));
  },

  paso(dt){
    if (!this.on) return;
    this.t += dt;
    const c = this.cuerpo(this.t);
    /* LA PISADA VA ATADA A LA FASE DEL PASO y no a un temporizador: es la misma
       regla que el juego, así que el sonido y el cabeceo no se pueden
       desincronizar por construcción. */
    if (Math.floor(c.f / Math.PI) !== Math.floor(this.faseAnt / Math.PI)) son('paso', 0.40);
    this.faseAnt = c.f;
    /* un relámpago puesto donde tiene que estar: a mitad del plano A, con la
       cámara mirando al frente y las casas de los dos lados en el cuadro */
    if (!this.rayoHecho && this.t > 11.3){ this.rayoHecho = true; RAYO.prox = 0; RAYO.t = 0; }
    if (this.t >= CINE_DUR){ this.termina(); return; }
    this.pon(this.t);
  },

  limpia(){
    this.on = false;
    escondePersonaje(); capaPersonaje(0);
    ponFrasco(false); capaFrasco(0);
    GESTO.mano = 0; GESTO.miraY = 0; GESTO.bocaExpr = null;
    postMat.uniforms.dofS.value = 0;
    if (LLUCARA) LLUCARA.visible = false;
    postMat.uniforms.cara.value = 0;
    postMat.uniforms.dof.value = 0;
    postMat.uniforms.abe.value = 0;
    postMat.uniforms.vig.value = 0.62;
    postMat.uniforms.grano.value = CFG.grano;
    postMat.uniforms.sat.value = CFG.sat;
    if (CARA_LUZ) CARA_LUZ.intensity = 0;
    $('cineSalta').classList.remove('on');
  },

  /* ── SE PUEDE SALTEAR ──
     Una cinemática obligatoria que se ve una vez es una escena; vista cinco
     veces es un peaje. Es la lección de POMPOM. */
  saltar(){
    if (!this.on) return;
    /* MEDIO SEGUNDO DE GRACIA. El toque que abre la escena es un `click`, pero
       el que la saltea es un `pointerdown`: sin la guarda, un doble toque sobre
       JUGAR —que en un teléfono pasa todo el tiempo— arranca la cinemática y la
       saltea en el mismo gesto, y desde afuera se ve como que el botón se comió
       la escena. */
    if (this.t < 0.55) return;
    this.termina();
  },

  termina(){
    /* SE ENTRA AL JUEGO DONDE TERMINÓ LA CINEMÁTICA Y MIRANDO PARA EL MISMO
       LADO. Devolviendo al jugador a la esquina de siempre, el último cuadro de
       la escena y el primero del juego son dos sitios distintos y el corte se
       lee a error. */
    const c = this.cuerpo(Math.min(this.t, CINE_DUR));
    this.limpia();
    $('cineNeg').classList.remove('on');
    $('cineNeg').style.opacity = '0';
    try { localStorage.setItem('barrio_cine', '1'); } catch(e){}
    entraJuego({ x: c.x, z: c.z, yaw: this.yaw0 });
  }
};
