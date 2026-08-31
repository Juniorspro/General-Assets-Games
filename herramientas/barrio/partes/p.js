
/* ══════════════ LA HABITACIÓN, Y LO QUE HAY POR LA VENTANA ══════════════
   Pedido: *"que una vez despiertes aparezcas en una habitación con una cama y
   en la ventana al ir a ver ves que estás en la cima de un edificio y ciudad
   lloviendo"*.

   POR QUÉ ES UN LUGAR Y NO OTRA CINEMÁTICA. El pedido dice «AL IR A VER»: la
   ventana tiene que costar caminar hasta ella. Contado con la cámara sobre
   rieles, el jugador no descubre nada — se lo muestran. Y el descubrimiento es
   todo lo que esta escena tiene: hasta que uno llega a la ventana, esto es un
   cuarto cualquiera.

   EL BARRIO NO SE BORRA, SE APAGA. Las dos cosas viven en la misma escena y en
   las mismas coordenadas de x y de z; lo único que las separa es la altura —el
   cuarto está noventa y seis metros arriba— y una lista de objetos que se
   prenden y se apagan. Construir una segunda escena obligaría a duplicar la
   lluvia, el cielo, las luces y el post, que son justamente las cuatro cosas
   que hacen que los dos sitios se vean del mismo juego. */

const CU = {
  Y: 96.0,                       /* la losa del techo, o sea el piso del cuarto */
  X0: -2.60, X1: 2.60,           /* el cuarto por dentro */
  Z0: -3.40, Z1: 3.40,
  ALTO: 2.70, MURO: 0.22,
  ok: false, grupo: null, on: false,
  t: 0, fase: 'nada', visto: false, salida: -1, cerca: 0
};
/* el hueco de la ventana, en la pared de -Z: con yaw 0 el frente es -Z, o sea
   que uno se despierta MIRÁNDOLA. Que la primera imagen sea la ventana es lo
   que hace que caminar hasta ella sea lo primero que a uno se le ocurre. */
const CU_V = { x0: -1.75, x1: 1.75, y0: 0.95, y1: 2.18 };
const CU_P = { z0: -2.10, z1: -1.10, alto: 2.06 };     /* la puerta, en +X */
/* la cama contra la pared de +X y con la cabecera al fondo */
const CU_CAMA = { x0: 1.05, x1: 2.55, z0: 0.55, z1: 2.70, alto: 0.52 };
/* LA MESA DE LUZ VA AL COSTADO DE LA CAMA Y NO DETRÁS DE LA CABECERA. Puesta
   contra la pared del fondo, el respaldo de noventa centímetros quedaba entre
   el velador y el cuarto: en la captura, la única luz del sitio proyectaba un
   rectángulo negro de punta a punta de la cama. Al costado, la luz sale limpia
   y el respaldo pasa a recibirla en vez de taparla. */
const CU_MESA = { x0: 0.30, x1: 0.98, z0: 2.26, z1: 2.74, alto: 0.62 };
/* la azotea y la torre. La azotea existe para que por la ventana no se vea el
   vacío pelado: un parapeto mojado a cinco metros es lo que da la ESCALA de los
   noventa y seis que hay debajo — sin nada cerca, una ciudad lejana se lee a
   telón pintado y no a altura. */
/* ── UNA CORNISA ANGOSTA Y UN PARAPETO BAJO, Y ES UNA CUENTA DE ÁNGULOS ──
   La primera versión tenía cinco metros de azotea y un parapeto de 1,05: desde
   la ventana, mirando hacia abajo, lo único que se veía era la losa. Con el ojo
   a 1,66 y el parapeto a 1,05, el parapeto tapa todo lo que esté por debajo de
   los veinte grados y la losa tapa lo que esté por debajo de los veintisiete —
   o sea que la calle noventa y seis metros abajo NO SE VE NUNCA, que es
   exactamente lo que la escena tiene que mostrar.
   Con 1,6 m de cornisa y 0,55 de parapeto, la vista se abre por debajo de los
   treinta y tres grados y ahí sí aparece el suelo, a unos ciento sesenta metros
   de distancia. Sigue habiendo algo cerca —el borde mojado y el parapeto— que
   es lo que da la escala; lo que se fue es lo que tapaba. */
const CU_AZ = { x0: -9.0, x1: 9.0, z0: -5.20, z1: 9.0, par: 0.55, gr: 0.26 };

/* ── LO QUE SE PRENDE Y LO QUE SE APAGA ──
   `MUNDO.barrio` se llena con lo que había en la escena al terminar de
   construir, menos las cuatro cosas que valen para los dos sitios: el cielo, la
   lluvia, las salpicaduras y el cuerpo del jugador. Anotar a mano cuáles son
   las mallas del barrio garantiza que la próxima que se agregue quede sin
   apagar; snapshot es la única forma que no se desactualiza sola. */
const MUNDO = { barrio: [], listo: false };
function fotoDelBarrio(){
  if (MUNDO.listo) return;
  /* Y EL GRUPO DEL CUARTO SE EXCLUYE POR NOMBRE Y NO POR ORDEN. Antes alcanzaba
     con sacar la foto antes de construirlo; desde que el cuarto se arma durante
     la carga —para compilar sus shaders ahí y no en el corte de la cinemática—
     ya está en la escena cuando se saca la foto, y quedaría dentro de «lo que es
     barrio». Nombrarlo es exacto; depender del orden de dos líneas no lo es. */
  const salvo = new Set([cielo, LLUVIA.malla, SALPICA.malla, PJ.grupo, cam, CU.grupo]);
  for (const o of escena.children){
    if (o.isLight || salvo.has(o)) continue;
    MUNDO.barrio.push(o);
  }
  MUNDO.listo = true;
}
function esconde(v){
  fotoDelBarrio();
  for (const o of MUNDO.barrio) o.visible = !v;
  if (CU.grupo) CU.grupo.visible = !!v;
}

/* ── LA ALTURA DEL PISO, PARA LOS DOS SITIOS ──
   La lluvia y las salpicaduras preguntan dónde está el suelo, y en el cuarto
   está noventa y seis metros más arriba. Una sola función con el `if` adentro
   —y no un `if` en cada sitio que pregunta— es lo que evita que la próxima cosa
   que necesite el suelo quede clavada al barrio. */
function alturaPiso(x, z){
  if (CU.on) return CU.Y + 0.02;
  return alturaSuelo(x, z);
}

/* ══════════════════════ EL CHOQUE, ADENTRO DEL CUARTO ══════════════════════
   Cuatro paredes y dos muebles: no hace falta la rejilla del barrio, alcanza
   con recortar contra el rectángulo y empujar fuera de dos cajas. Recortar es
   exacto — no hay esquina que raspar— y es la misma decisión que en Eco con la
   sala de práctica. */
const CU_CAJAS = [CU_CAMA, CU_MESA];
function corrigeCuarto(){
  const R = RADIO;
  JUG.x = cl(JUG.x, CU.X0 + R, CU.X1 - R);
  JUG.z = cl(JUG.z, CU.Z0 + R, CU.Z1 - R);
  for (const c of CU_CAJAS){
    const px = cl(JUG.x, c.x0, c.x1), pz = cl(JUG.z, c.z0, c.z1);
    const dx = JUG.x - px, dz = JUG.z - pz;
    const d2 = dx*dx + dz*dz;
    if (d2 > R*R) continue;
    if (d2 > 1e-8){
      const d = Math.sqrt(d2);
      JUG.x = px + dx/d*R; JUG.z = pz + dz/d*R;
    } else {
      const iz = JUG.x - c.x0, de = c.x1 - JUG.x, ar = JUG.z - c.z0, ab = c.z1 - JUG.z;
      const m = Math.min(iz, de, ar, ab);
      if (m === iz) JUG.x = c.x0 - R; else if (m === de) JUG.x = c.x1 + R;
      else if (m === ar) JUG.z = c.z0 - R; else JUG.z = c.z1 + R;
    }
  }
}

/* ══════════════════════ LAS TEXTURAS DE LA CIUDAD ══════════════════════
   Dos lienzos y nada más: la fachada y la calle vista desde arriba. Una foto
   acá no serviría —lo que hace falta es una grilla de ventanas cuya ESCALA se
   pueda escribir en metros— y encima este juego dibuja a 1/1,7 y con
   posterizado, así que un lienzo de 128 píxeles es exactamente el detalle que
   llega. */
let texFach = null, texFachE = null, texCalles = null, texCallesE = null;
/* EL VIDRIO DE LA VENTANA NO PUEDE SER EL DE LAS CASAS. `matVidrio` es opaco a
   propósito —desde la calle una ventana apagada es un hueco oscuro— y acá se
   mira DESDE ADENTRO: con ese material la ciudad no se vería y la escena entera
   se cae. Va casi transparente y con especular alto, que es lo que deja ver a
   través y a la vez devuelve el brillo del velador en el vidrio; y sin escribir
   profundidad, porque si no se dibuja antes que la ciudad y la borra. */
const matVent = new T.MeshPhongMaterial({
  color: 0x8fa6bd, transparent: true, opacity: 0.10,
  specular: 0x8fa6c4, shininess: 120, depthWrite: false });
function texturasCiudad(){
  /* LAS DOS SALEN DEL MISMO SORTEO. La fachada dice de qué color es la pared y
     el mapa emisivo dice cuáles ventanas están prendidas: si cada uno sorteara
     por su cuenta, habría ventanas que brillan sin estar dibujadas. Con la
     semilla compartida —recorrida en el mismo orden— no puede pasar. */
  const N = 128, COLS = 4, FIL = 4;   /* 4 ventanas de ancho, 4 pisos */
  const prende = [];
  for (let i = 0; i < COLS*FIL; i++) prende.push(Math.random() < 0.34);
  const dibuja = (g, n, emis) => {
    pinta(g, 0, 0, n, n, emis ? '#000' : '#14171d');
    if (!emis) granulado(g, n, 0x1a, 10);
    const cw = n / COLS, ch = n / FIL;
    for (let j = 0; j < FIL; j++) for (let i = 0; i < COLS; i++){
      const on = prende[j*COLS + i];
      const x = i*cw + cw*0.22, y = j*ch + ch*0.20;
      const w = cw*0.56, h = ch*0.46;
      if (emis){ if (on) pinta(g, x, y, w, h, '#ffd9a0'); }
      else pinta(g, x, y, w, h, on ? '#ffcf90' : '#0b0d11');
    }
  };
  texFach  = lienzoTex(N, (g, n) => dibuja(g, n, false), 1, 1);
  texFachE = lienzoTex(N, (g, n) => dibuja(g, n, true), 1, 1);
  /* espejada: la copia de al lado va dada vuelta, así que los dos bordes que se
     tocan son EL MISMO borde y la costura no puede existir. La misma decisión
     que con las siete texturas del barrio. */
  for (const t of [texFach, texFachE]) t.wrapS = t.wrapT = T.MirroredRepeatWrapping;
  /* la calle vista desde noventa y seis metros: asfalto oscuro, la trama de
     calles, y los faroles como puntos naranjas. A esa distancia un farol no es
     un objeto, es un punto — modelar noventa y seis mil faroles para eso sería
     pagar una ciudad entera por cuatro píxeles. */
  /* Y LA CALLE VA CON MAPA EMISIVO, POR LA MISMA RAZÓN QUE LAS VENTANAS. Los
     faroles pintados en el difuso sólo se ven tan claros como la luz que les
     llegue, y a noventa y seis metros de altura no les llega ninguna: en la
     captura, el suelo entre los edificios era una mancha negra sin un punto.
     Emisivos son puntos de luz, que es lo que son. */
  const calle = (g, n, emis) => {
    if (emis){ pinta(g, 0, 0, n, n, '#000'); }
    else { pinta(g, 0, 0, n, n, '#0a0c10'); granulado(g, n, 0x0e, 8); }
    const paso = n / 4;
    for (let k = 0; k <= 4; k++){
      if (!emis){ pinta(g, k*paso - 3, 0, 6, n, '#171a20');
                  pinta(g, 0, k*paso - 3, n, 6, '#171a20'); }
      for (let m = 0; m < 10; m++){
        const t = (m + 0.5) * (n/10);
        const c = emis ? '#ffb469' : '#ffb469';
        pinta(g, k*paso - 1, t - 1, 2, 2, c);
        pinta(g, t - 1, k*paso - 1, 2, 2, c);
      }
    }
  };
  texCalles  = lienzoTex(256, (g, n) => calle(g, n, false), 26, 26);
  texCallesE = lienzoTex(256, (g, n) => calle(g, n, true), 26, 26);
}

/* ══════════════════════ LA CIUDAD ══════════════════════
   Doscientas cajas fundidas en dos mallas. Y las UV van EN METROS, con el
   factor por pieza: sin eso, un edificio de setenta metros y uno de veinte
   comparten la misma grilla estirada y las ventanas del alto miden tres pisos.
   Es la misma cuenta que en el barrio dejó las hiladas de ladrillo en 5,5 cm y
   no en 22. */
const CIU_W = 12.8, CIU_H = 13.6;   /* lo que cubre una copia de la fachada */
function armaCiudad(g){
  const fach = [], losa = [], antena = [];
  const R = CU_AZ.x1 + 8;
  /* NUESTRA TORRE PRIMERO, y es la única cuyo tamaño no se sortea: la azotea
     tiene que caer justo donde está el cuarto. */
  const tw = CU_AZ.x1 - CU_AZ.x0, td = CU_AZ.z1 - CU_AZ.z0;
  const tcx = (CU_AZ.x0 + CU_AZ.x1)/2, tcz = (CU_AZ.z0 + CU_AZ.z1)/2;
  fach.push({ g: geoCaja, p:[tcx, CU.Y/2, tcz], s:[tw, CU.Y, td],
              u:[tw/CIU_W, CU.Y/CIU_H] });

  for (let i = -11; i <= 11; i++) for (let j = -11; j <= 11; j++){
    const cx = i*30 + azr(-6, 6), cz = j*30 + azr(-6, 6);
    if (Math.abs(cx) < R + 10 && Math.abs(cz) < R + 10) continue;
    if (az() < 0.34) continue;
    const d = Math.hypot(cx, cz);
    /* NADA ALTO AL LADO. Un vecino más alto a treinta metros deshace de un
       cuadro lo único que esta escena tiene que decir, que es que uno está
       arriba de todo. De ciento veinte metros para afuera sí, porque ahí lo que
       aportan es fondo. */
    /* Y UNA DE CADA CUATRO, DE LAS LEJANAS, ES UNA TORRE. Con todas entre
       dieciséis y cien metros repartidas parejo, la ciudad sale como una manta
       chata y el horizonte es una línea: lo que hace que se lea a ciudad es que
       haya cuatro o cinco que suban por encima del resto. */
    const hmax = d < 120 ? 62 : 104;
    const h = (d > 150 && az() < 0.25) ? azr(62, 112) : azr(16, hmax);
    const an = azr(12, 26), fo = azr(12, 26);
    fach.push({ g: geoCaja, p:[cx, h/2, cz], s:[an, h, fo],
                u:[an/CIU_W, h/CIU_H] });
    losa.push({ g: geoCaja, p:[cx, h + 0.35, cz], s:[an + 0.8, 0.7, fo + 0.8] });
    if (az() < 0.30){
      const ax = cx + azr(-an*0.3, an*0.3), az2 = cz + azr(-fo*0.3, fo*0.3);
      const ah = azr(4, 11);
      antena.push({ g: geoCil, p:[ax, h + 0.7 + ah/2, az2], s:[0.28, ah, 0.28] });
    }
    if (az() < 0.35){
      losa.push({ g: geoCaja, p:[cx + azr(-an*0.25, an*0.25), h + 1.9,
                                 cz + azr(-fo*0.25, fo*0.25)],
                  s:[azr(2.4, 4.4), 2.4, azr(2.4, 4.4)] });
    }
  }
  const matFach = new T.MeshLambertMaterial({
    map: texFach, emissive: 0xffffff, emissiveMap: texFachE, emissiveIntensity: 0.9,
    flatShading: true });
  const m1 = new T.Mesh(fundir(fach), matFach);
  m1.receiveShadow = false; g.add(m1);
  const matLosa = new T.MeshLambertMaterial({ color: 0x171b21, flatShading: true });
  const m2 = new T.Mesh(fundir(losa.concat(antena)), matLosa);
  g.add(m2);

  /* el suelo de la ciudad, noventa y seis metros abajo */
  const suelo = new T.Mesh(new T.PlaneGeometry(1400, 1400),
    new T.MeshLambertMaterial({ map: texCalles, color: 0x8a8f98,
      emissive: 0xffffff, emissiveMap: texCallesE, emissiveIntensity: 0.85 }));
  suelo.rotation.x = -Math.PI/2;
  suelo.position.y = 0.02;
  g.add(suelo);
}

/* ══════════════════════ EL CUARTO ══════════════════════ */
function armaCuarto(){
  if (CU.ok) return;
  texturasCiudad();
  const g = new T.Group();
  g.visible = false;

  const P = { pared:[], madera:[], carp:[], vidrio:[], emisivo:[], hormigon:[], tela:[] };
  const M = CU.MURO, A = CU.ALTO, Y = CU.Y;
  const cx = (CU.X0 + CU.X1)/2, cz = (CU.Z0 + CU.Z1)/2;
  const an = CU.X1 - CU.X0, fo = CU.Z1 - CU.Z0;

  /* el piso de tablas y el cielorraso */
  P.madera.push({ g: geoCaja, p:[cx, Y + 0.01, cz], s:[an, 0.04, fo],
                  u:[an/METROS.tabla, fo/METROS.tabla] });
  P.pared.push({ g: geoCaja, p:[cx, Y + A + 0.06, cz], s:[an + M*2, 0.12, fo + M*2],
                 u:[an/METROS.ladrillo, fo/METROS.ladrillo], c: 0x9a958c });

  /* ── LAS CUATRO PAREDES ──
     La de la ventana va en cuatro pedazos alrededor del hueco y no como una
     pared con un agujero: recortar una caja obliga a una geometría propia, y
     cuatro cajas son cuatro cajas. */
  const pared = (x, y, z, sx, sy, sz) =>
    P.pared.push({ g: geoCaja, p:[x, y, z], s:[sx, sy, sz],
                   u:[Math.max(sx, sz)/METROS.ladrillo, sy/METROS.ladrillo], c: 0xa8a297 });
  /* +Z (la cabecera) y las dos laterales, con el hueco de la puerta en +X */
  pared(cx, Y + A/2, CU.Z1 + M/2, an + M*2, A, M);
  pared(CU.X0 - M/2, Y + A/2, cz, M, A, fo);
  /* +X: dos tramos y un dintel, para dejar la puerta */
  pared(CU.X1 + M/2, Y + A/2, (CU.Z1 + CU_P.z1)/2, M, A, CU.Z1 - CU_P.z1);
  pared(CU.X1 + M/2, Y + A/2, (CU.Z0 + CU_P.z0)/2, M, A, CU_P.z0 - CU.Z0);
  pared(CU.X1 + M/2, Y + (CU_P.alto + A)/2, (CU_P.z0 + CU_P.z1)/2,
        M, A - CU_P.alto, CU_P.z1 - CU_P.z0);
  /* -Z: alrededor de la ventana */
  pared(cx, Y + A/2, CU.Z0 - M/2, an + M*2, A, M);   /* se reemplaza abajo */
  P.pared.pop();
  const zw = CU.Z0 - M/2;
  pared((CU.X0 - M + CU_V.x0)/2, Y + A/2, zw, CU_V.x0 - CU.X0 + M, A, M);
  pared((CU.X1 + M + CU_V.x1)/2, Y + A/2, zw, CU.X1 + M - CU_V.x1, A, M);
  pared((CU_V.x0 + CU_V.x1)/2, Y + CU_V.y0/2, zw, CU_V.x1 - CU_V.x0, CU_V.y0, M);
  pared((CU_V.x0 + CU_V.x1)/2, Y + (CU_V.y1 + A)/2, zw,
        CU_V.x1 - CU_V.x0, A - CU_V.y1, M);

  /* ── LA VENTANA ──
     El vidrio va con el material de los vidrios del barrio, que no escribe
     profundidad y deja pasar la ciudad; el marco y el crucero son lo que hace
     que se lea a ventana y no a agujero. */
  const vx = (CU_V.x0 + CU_V.x1)/2, vy = Y + (CU_V.y0 + CU_V.y1)/2;
  const vw = CU_V.x1 - CU_V.x0, vh = CU_V.y1 - CU_V.y0;
  P.vidrio.push({ g: geoCaja, p:[vx, vy, zw], s:[vw - 0.08, vh - 0.08, 0.02] });
  for (const [px, py, sx, sy] of [[vx, Y + CU_V.y0, vw + 0.10, 0.10],
                                  [vx, Y + CU_V.y1, vw + 0.10, 0.10],
                                  [CU_V.x0, vy, 0.10, vh], [CU_V.x1, vy, 0.10, vh],
                                  [vx, vy, 0.06, vh]])
    P.carp.push({ g: geoCaja, p:[px, py, zw], s:[sx, sy, M + 0.06], c: 0x8f897d });
  /* el alféizar por dentro: es lo que uno mira al apoyarse */
  /* EL ALFÉIZAR NO VA BLANCO. `C_BLANCO` es el de la carpintería de las casas
     del barrio, que se mira de noche desde la calle y a diez metros; acá está a
     medio metro del ojo y con una luz al lado. */
  P.carp.push({ g: geoCaja, p:[vx, Y + CU_V.y0 - 0.06, CU.Z0 + 0.06],
                s:[vw + 0.24, 0.06, 0.28], c: 0x8f897d });

  /* ── LA PUERTA ── */
  const pz = (CU_P.z0 + CU_P.z1)/2;
  P.madera.push({ g: geoCaja, p:[CU.X1 + M/2, Y + CU_P.alto/2, pz],
                  s:[0.06, CU_P.alto - 0.06, CU_P.z1 - CU_P.z0 - 0.06],
                  u:[1, CU_P.alto/METROS.madera], c: 0x6b5a48 });
  P.carp.push({ g: geoCaja, p:[CU.X1 + M/2, Y + CU_P.alto/2, pz],
                s:[0.10, CU_P.alto, CU_P.z1 - CU_P.z0 + 0.10], c: C_MARCO });
  P.emisivo.push({ g: geoCil, p:[CU.X1 + 0.02, Y + 1.02, pz - 0.30],
                   r:[0, 0, Math.PI/2], s:[0.05, 0.10, 0.05], c: 0xb9a271 });

  /* ── LA CAMA ──
     Cinco cajas: el somier, el colchón, la almohada, la manta revuelta y el
     respaldo. La manta va CORRIDA y más corta que el colchón: una manta que
     cubre la cama entera se lee a cama hecha, y esta cama la acaba de dejar
     alguien. */
  const bx = (CU_CAMA.x0 + CU_CAMA.x1)/2, bz = (CU_CAMA.z0 + CU_CAMA.z1)/2;
  const bw = CU_CAMA.x1 - CU_CAMA.x0, bl = CU_CAMA.z1 - CU_CAMA.z0;
  P.madera.push({ g: geoCaja, p:[bx, Y + 0.16, bz], s:[bw, 0.30, bl],
                  u:[bw/METROS.madera, bl/METROS.madera], c: 0x5c4b3c });
  P.tela.push({ g: geoCaja, p:[bx, Y + 0.42, bz], s:[bw - 0.06, 0.22, bl - 0.06],
                c: 0xb9b4a8 });
  P.tela.push({ g: geoCaja, p:[bx, Y + 0.58, CU_CAMA.z1 - 0.34],
                s:[bw - 0.34, 0.14, 0.44], c: 0xd6d2c8 });
  P.tela.push({ g: geoCaja, p:[bx - 0.10, Y + 0.56, bz - 0.34],
                r:[0, 0.09, 0], s:[bw - 0.14, 0.14, bl*0.62], c: 0x4c5a63 });
  P.madera.push({ g: geoCaja, p:[bx, Y + 0.66, CU_CAMA.z1 + 0.04], s:[bw, 0.90, 0.08],
                  u:[bw/METROS.madera, 0.9/METROS.madera], c: 0x5c4b3c });

  /* ── LA MESA DE LUZ Y EL VELADOR ──
     El velador es la única luz del cuarto y por eso está: un cuarto iluminado
     por nada se lee a maqueta, y uno iluminado desde un solo punto bajo tiene
     sombras largas, que es lo que hace que se lea a las tres de la mañana. */
  const mx = (CU_MESA.x0 + CU_MESA.x1)/2, mz = (CU_MESA.z0 + CU_MESA.z1)/2;
  P.madera.push({ g: geoCaja, p:[mx, Y + CU_MESA.alto/2, mz],
                  s:[CU_MESA.x1 - CU_MESA.x0, CU_MESA.alto, CU_MESA.z1 - CU_MESA.z0],
                  u:[0.7/METROS.madera, CU_MESA.alto/METROS.madera], c: 0x6b5a48 });
  P.carp.push({ g: geoCil, p:[mx, Y + CU_MESA.alto + 0.10, mz], s:[0.05, 0.20, 0.05],
                c: 0x3a3a3e });
  /* LA PANTALLA VA CON LA BOCA PARA ABAJO —el cono sin girar, o sea ancho abajo
     y en punta arriba— y LA LUZ VA POR DEBAJO DEL BORDE. Con la luz adentro de
     la pantalla, y como ésta es la única de las seis que proyecta sombra, el
     cono le tapaba el cuarto entero: medido, el brillo medio del cuadro daba
     3 sobre 255 con el velador encendido. */
  P.emisivo.push({ g: geoCono, p:[mx, Y + CU_MESA.alto + 0.30, mz],
                   s:[0.17, 0.22, 0.17], c: 0xffd9a0 });
  CU.lampara = [mx, Y + CU_MESA.alto + 0.14, mz];

  /* ── LO QUE HACE QUE UN CUARTO SE LEA A CUARTO Y NO A CAJA ──
     Una alfombra, una silla y el frasco sobre la mesa de luz. Los tres son
     cuatro cajas cada uno y no cambian nada de lo que se puede hacer; lo que
     cambian es que el sitio tenga dueño. Y el frasco es el mismo de la
     cinemática: es la única cosa del cuarto que dice cómo llegó uno acá. */
  P.tela.push({ g: geoCaja, p:[-0.55, Y + 0.035, 0.20], r:[0, 0.10, 0],
                s:[2.30, 0.03, 1.70], c: 0x4a4740 });
  {
    const sx = -1.55, sz = -1.35, sh = 0.46;
    for (const [dx, dz] of [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]])
      P.madera.push({ g: geoCaja, p:[sx + dx, Y + sh/2, sz + dz], s:[0.05, sh, 0.05],
                      u:[0.05, sh], c: 0x5c4b3c });
    P.madera.push({ g: geoCaja, p:[sx, Y + sh + 0.02, sz], s:[0.46, 0.05, 0.46],
                    u:[0.46/METROS.madera, 0.46/METROS.madera], c: 0x6b5a48 });
    P.madera.push({ g: geoCaja, p:[sx, Y + sh + 0.28, sz - 0.20], s:[0.44, 0.46, 0.05],
                    u:[0.44/METROS.madera, 0.46/METROS.madera], c: 0x6b5a48 });
  }
  /* el frasco: un cilindro ámbar, la tapa blanca y dos cápsulas al lado. Las
     medidas son las mismas que las del que se lleva en la mano (17 mm de radio
     y 62 de alto), así que es el mismo objeto y no uno parecido. */
  {
    const fx = mx - 0.13, fz = mz - 0.06, fy = Y + CU_MESA.alto;
    P.emisivo.push({ g: geoCil, p:[fx, fy + FR_H/2, fz], s:[FR_R*2, FR_H, FR_R*2],
                     c: 0x7a4a12 });
    P.carp.push({ g: geoCil, p:[fx, fy + FR_H + FR_TAPA/2, fz],
                  s:[FR_R*2.14, FR_TAPA, FR_R*2.14], c: 0xd8d4cc });
    for (const [dx, dz] of [[0.055, 0.012], [0.071, -0.021]])
      P.carp.push({ g: geoCil, p:[fx + dx, fy + 0.006, fz + dz], r:[0, 0, Math.PI/2],
                    s:[0.012, 0.022, 0.012], c: 0xe6e2da });
  }

  /* ── LA AZOTEA Y EL PARAPETO ── */
  const az0 = CU_AZ, aw = az0.x1 - az0.x0, af = az0.z1 - az0.z0;
  /* EL HORMIGÓN VA OSCURO Y NO CON LA VEREDA DEL BARRIO. Medido en la captura,
     con el material de la vereda —que es un gris claro pensado para leerse bajo
     un farol— la cornisa era LO MÁS BRILLANTE DEL CUADRO y se comía la ciudad
     de atrás. Una azotea de noche está más oscura que las ventanas encendidas
     que tiene enfrente. */
  P.hormigon.push({ g: geoCaja, p:[(az0.x0+az0.x1)/2, Y - 0.10, (az0.z0+az0.z1)/2],
                    s:[aw, 0.20, af], u:[aw, af], c: 0x3f4348 });
  const par = (x, y, z, sx, sz) =>
    P.hormigon.push({ g: geoCaja, p:[x, y, z], s:[sx, az0.par, sz],
                      u:[Math.max(sx, sz), az0.par], c: 0x4a4d52 });
  par((az0.x0+az0.x1)/2, Y + az0.par/2, az0.z0 + az0.gr/2, aw, az0.gr);
  par((az0.x0+az0.x1)/2, Y + az0.par/2, az0.z1 - az0.gr/2, aw, az0.gr);
  par(az0.x0 + az0.gr/2, Y + az0.par/2, (az0.z0+az0.z1)/2, az0.gr, af);
  par(az0.x1 - az0.gr/2, Y + az0.par/2, (az0.z0+az0.z1)/2, az0.gr, af);
  /* dos cosas de azotea: un tanque y una caja de máquinas. No son adorno — son
     lo único que le da profundidad al plano entre la ventana y el parapeto. */
  P.hormigon.push({ g: geoCil, p:[-7.1, Y + 1.05, -4.30], s:[1.4, 2.10, 1.4], c: 0x4a4d52 });
  P.hormigon.push({ g: geoCaja, p:[7.3, Y + 0.55, -4.05], s:[2.0, 1.10, 1.5],
                    u:[2.0, 1.1], c: 0x4a4d52 });

  const pon = (piezas, mat, sombra) => {
    const geo = fundir(piezas); if (!geo) return;
    const m = new T.Mesh(geo, mat);
    m.castShadow = !!sombra; m.receiveShadow = true;
    g.add(m);
  };
  pon(P.pared, matPared, true);
  pon(P.hormigon, matPared, true);
  pon(P.madera, matMaderaV, true);
  pon(P.carp, matCarp, true);
  pon(P.tela, matPared, true);
  pon(P.vidrio, matVent, false);
  pon(P.emisivo, matEmisivo, false);

  armaCiudad(g);
  escena.add(g);
  CU.grupo = g;
  CU.ok = true;
}

/* ══════════════════════ ENTRAR Y SALIR ══════════════════════ */
let _nieblaBarrio = 0, _ambI = 0, _lunaI = 0;
function entraCuarto(){
  /* LA FOTO DEL BARRIO SE SACA ANTES DE CONSTRUIR EL CUARTO. Al revés, el grupo
     del cuarto queda adentro de la lista de «lo que es barrio» y `esconde()` lo
     apaga y lo prende dos veces en la misma pasada — funciona por el orden en
     que están escritas las dos líneas, que es exactamente la clase de cosa que
     se rompe la próxima vez que alguien las toca. */
  fotoDelBarrio();
  armaCuarto();
  MODO = 'cuarto';
  CU.on = true; CU.t = 0; CU.fase = 'despierta'; CU.visto = false; CU.salida = -1;
  esconde(true);
  $('menu').classList.remove('on');
  $('hud').classList.add('on');
  T0JUEGO = RELOJ.value;
  /* SE DESPIERTA EN LA CAMA Y MIRANDO LA VENTANA. Es lo único que la escena
     tiene que decir sin decirlo: hay una ventana ahí. */
  JUG.x = 1.80; JUG.z = 1.90; JUG.y = CU.Y + 0.02;
  JUG.vx = JUG.vz = 0; JUG.yaw = 0; JUG.pitch = 0.62;
  AND.fase = 0; AND.ojo = OJO; AND.fov = 70;
  cam.fov = 70; cam.updateProjectionMatrix();
  /* LA NIEBLA SE ABRE. Con la del barrio —0,0165— a ciento veinte metros no
     queda un píxel, y una ciudad que se termina a ciento veinte metros no es
     una ciudad: es un decorado. Con 0,0045 el suelo que se ve por debajo del
     parapeto —que cae a unos ciento sesenta metros— conserva la mitad de su
     color, y a trescientos ya es niebla: la ciudad se pierde en la lluvia en
     vez de terminar en un borde. */
  _nieblaBarrio = escena.fog.density;
  escena.fog.density = 0.0045;
  _ambI = ambiente.intensity; _lunaI = luna.intensity;
  ambiente.intensity = 1.20; luna.intensity = 0.34;
  LLUVIA.mat.uniforms.baseY.value = CU.Y - 9.0;
  LLUVIA.mat.uniforms.cuartoOn.value = 1;
  camaVol(1);
  $('calle').textContent = TX('cuCalle');
  $('cineNeg').style.opacity = '1';
  $('cineNeg').classList.add('on');
  son('trueno', 0.30);
}

function limpiaCuarto(){
  if (!CU.on) return;
  CU.on = false; CU.fase = 'nada';
  esconde(false);
  escena.fog.density = _nieblaBarrio || CFG.niebla;
  ambiente.intensity = _ambI || 1.30; luna.intensity = _lunaI || 0.80;
  LLUVIA.mat.uniforms.baseY.value = 0;
  LLUVIA.mat.uniforms.cuartoOn.value = 0;
  $('cineNeg').classList.remove('on');
  $('cineNeg').style.opacity = '0';
}

/* al cruzar la puerta se vuelve al barrio: la escena termina donde empezó */
function salCuarto(){
  limpiaCuarto();
  entraJuego();
}

/* ══════════════════════ EL PASO ══════════════════════ */
const CUARTO = {
  /* ── DESPERTARSE ──
     Dos segundos y medio en los que el juego tiene el control: la cámara sube
     de acostado a sentado y los párpados se abren en tres tiempos, cada uno
     abriendo MÁS que el anterior — que es exactamente el pestañeo con el que
     termina la cinemática, dado vuelta. Que sean la misma forma es lo que hace
     que los dos planos se lean como un solo corte y no como dos escenas
     distintas pegadas. */
  DESP: 2.9,
  paso(dt){
    if (!CU.on) return;
    CU.t += dt;
    const t = CU.t;

    if (CU.fase === 'despierta'){
      const u = cl(t / this.DESP, 0, 1);
      const k = u*u*(3 - 2*u);
      JUG.x = mez(1.80, 0.58, k); JUG.z = mez(1.90, 1.62, k);
      JUG.pitch = mez(0.62, -0.06, k);
      AND.ojo = mez(0.58, OJO, k);
      let neg = 1;
      for (const [t0, w, abre] of [[0.35, 0.30, 0.42], [1.05, 0.26, 0.16],
                                   [1.85, 0.55, 0.00]]){
        if (t < t0) continue;
        const q = Math.min(1, (t - t0) / w);
        neg = Math.min(neg, mez(1, abre, q));
      }
      $('cineNeg').style.opacity = neg.toFixed(3);
      if (t > 0.30 && !this._r1){ this._r1 = 1; voz('inh', 0.075); }
      if (t > 1.90 && !this._r2){ this._r2 = 1; voz('resp', 0.06); }
      if (u >= 1){
        CU.fase = 'juega';
        $('cineNeg').classList.remove('on');
        $('cineNeg').style.opacity = '0';
        aviso(TX('cuDesp'), 3200);
      }
      ponCam(0);
      return;
    }

    /* ── LA VENTANA ──
       El aviso salta una sola vez y salta por CERCANÍA, no por mirar: mirar ya
       lo hizo el jugador solo, y un cartel que espera a que además se apunte
       con la cabeza se lee a que el juego no se enteró. */
    const dv = Math.hypot(JUG.x - 0, JUG.z - (CU.Z0 + 0.5));
    if (!CU.visto && dv < 1.35){
      CU.visto = true;
      aviso(TX('cuVent'), 4200);
      voz('inh', 0.07);
      /* y un relámpago, que es lo único que muestra la ciudad ENTERA de una */
      RAYO.prox = 0.35;
    }

    /* ── LA PUERTA ──
       Se cruza caminando: no hay botón de usar en este juego y agregarlo para
       una puerta sería un botón que sirve una vez. Un segundo y medio de negro
       antes de soltar al jugador en el barrio, porque cortar en el mismo cuadro
       se lee a que el juego se rompió. */
    const dp = Math.abs(JUG.x - CU.X1) < 0.62 &&
               JUG.z > CU_P.z0 - 0.2 && JUG.z < CU_P.z1 + 0.2;
    CU.cerca = dp ? 1 : 0;
    if (dp && CU.salida < 0){ CU.salida = 0; aviso(TX('cuPuerta'), 1800); }
    if (CU.salida >= 0){
      CU.salida += dt;
      const n = cl(CU.salida / 1.5, 0, 1);
      $('cineNeg').classList.add('on');
      $('cineNeg').style.opacity = n.toFixed(3);
      if (n >= 1) salCuarto();
    }
  },

  /* las dos luces del cuarto NO son luces nuevas: son dos de las seis que el
     barrio mueve entre sus faroles. Sumar dos `PointLight` a la escena
     recompila los materiales con dos luces más y eso se paga también en el
     barrio, donde no hacen falta. Acá el barrio está apagado y las seis están
     libres. */
  luces(){
    if (!LUCES.length) return;
    const l0 = LUCES[0];
    l0.position.set(CU.lampara[0], CU.lampara[1], CU.lampara[2]);
    l0.color.setHex(0xffc98a);
    l0.distance = 9.5;
    /* VEINTIDÓS Y NO CINCO, y el número no es de gusto: estas seis luces se
       crearon con `decay 1.9`, así que la intensidad cae casi con el cuadrado —
       a tres metros, un 5 se convierte en 0,6. Los faroles del barrio usan 26 a
       cinco o seis metros; un velador a dos tiene que estar en el mismo orden o
       el cuarto sale negro. Medido: con 5,4 el brillo medio del cuadro era 6 de
       255. */
    l0.intensity = 22 + Math.sin(RELOJ.value*3.1)*0.6;
    if (LUCES[1]){
      /* la de la ciudad: fría, afuera de la ventana y baja, así que entra por el
         hueco y se apoya en el piso del cuarto. Es lo que hace que la ventana se
         note desde el fondo del cuarto sin tener que mirarla. */
      const l1 = LUCES[1];
      /* EN EL PLANO DE LA VENTANA Y NO AFUERA. Esta luz no proyecta sombra —de
         las seis, sólo la primera lo hace— así que atraviesa la pared: puesta a
         un metro y medio afuera, lo que más iluminaba era la cornisa, y en la
         captura la cornisa salía como una banda blanca delante de la ciudad. En
         el hueco de la ventana reparte parejo hacia adentro y hacia afuera. */
      /* Y ARRIBA DEL HUECO, NO EN EL MEDIO. Medido en la captura: a la altura
         del antepecho quedaba a sesenta centímetros del alféizar, y con `decay
         1,9` eso multiplica por veinte — el alféizar salía blanco puro y era la
         banda más brillante del cuadro, delante de la ciudad. Desde el dintel
         está a metro y medio de todo lo que hay cerca. */
      l1.position.set(0, CU.Y + 2.35, CU.Z0 - 0.05);
      l1.color.setHex(0x86a6cc);
      l1.distance = 14;
      l1.intensity = 11;
    }
    for (let k = 2; k < LUCES.length; k++) LUCES[k].intensity = 0;
  }
};
