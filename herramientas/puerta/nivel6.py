# -*- coding: utf-8 -*-
"""El nivel 6 de PUERTA BLANCA: el local de comida rapida y la arana.

Vive aparte de armar.py porque son mil lineas de JS y mezclarlas con los parches
del nivel 1 vuelve ilegibles las dos cosas. armar.py lo importa y lo inyecta.

QUE ES: un local grande —salon, mostrador, cocina, camara frigorifica, deposito,
banos y pasillo trasero— donde hay que juntar las CUATRO partes de una
hamburguesa, armarla EN ORDEN sobre la bandeja del mostrador, y salir por la
puerta de atras. Adentro hay una arana gigante que teje: sus telas quedan en el
piso y en los vanos de las puertas, y pisar una deja al jugador clavado tres
segundos — que es justo cuando ella pasa a modo caza.
"""

# ══════════════════════════════════════════════════════════════════════════════
# EL HTML: la ficha del menu y el HUD
# ══════════════════════════════════════════════════════════════════════════════
MENU_FICHA = '''        <div class="lv" data-lv="6">
          <div class="n">NIVEL 6</div>
          <div class="t">El local</div>
          <div class="d">Cuatro partes, una bandeja y algo con ocho patas.</div>
        </div>
'''

HUD = '''    <div id="store-hud">
      <div class="chip" id="st-chip">&#127828; Partes 0/4</div>
      <div id="st-list">
        <span id="st-p0">PAN</span><span id="st-p1">CARNE</span><span id="st-p2">QUESO</span><span id="st-p3">TAPA</span>
      </div>
    </div>
'''

CSS = '''
  /* ---- nivel 6: el local ---- */
  #store-hud {
    display: none; position: absolute; top: 14px; right: 16px;
    flex-direction: column; align-items: flex-end; gap: 6px;
    font-size: 13.5px; font-weight: 600; color: #fff;
    text-shadow: 0 1px 3px rgba(0,0,0,0.85);
  }
  #store-hud .chip { background: rgba(0,0,0,0.42); padding: 7px 13px; border-radius: 18px; }
  #st-list { display: flex; gap: 6px; }
  /* EL ORDEN SE LEE EN EL HUD, no en un cartel que aparece una vez. La bandeja
     rechaza la parte equivocada, asi que el jugador tiene que poder consultar
     cual va ahora sin volver a leer un toast que ya se fue. */
  #st-list span {
    padding: 5px 9px; border-radius: 13px; background: rgba(0,0,0,0.45);
    font-size: 12px; opacity: 0.4; letter-spacing: 0.06em;
  }
  #st-list span.tengo { opacity: 1; color: #ffd95e; }
  #st-list span.puesta { opacity: 1; color: #8ef08a; background: rgba(30,80,30,0.5); }
  #st-list span.toca { box-shadow: 0 0 0 2px rgba(255,217,94,0.75); }
  /* la telarana que atrapa: el aviso tiene que ser IMPOSIBLE de confundir con el
     filtro VHS, asi que va blanco y en el medio */
  #st-trap {
    display: none; position: absolute; inset: 0; pointer-events: none; z-index: 6;
    background: radial-gradient(circle at 50% 50%, rgba(255,255,255,0) 22%, rgba(220,230,240,0.34) 100%);
  }
  #st-trap-txt {
    position: absolute; top: 46%; left: 50%; transform: translate(-50%,-50%);
    font-size: 15px; font-weight: 800; letter-spacing: 0.12em; color: #fff;
    text-shadow: 0 2px 10px rgba(0,0,0,0.9);
  }
'''

TRAP_DIV = '''    <div id="st-trap"><div id="st-trap-txt">ATRAPADO</div></div>
'''


# ══════════════════════════════════════════════════════════════════════════════
# EL JS
# ══════════════════════════════════════════════════════════════════════════════
JS = r"""
  // ==================================================================
  // LOCAL (nivel 6): comida rapida, cuatro partes y una arana
  // ==================================================================
  const storeGroup = new THREE.Group();
  storeGroup.visible = false;
  scene.add(storeGroup);

  const stObs = [];      // choques redondos (mesas, patas, la arana no)
  const stBoxes = [];    // choques de caja (paredes, mostrador, muebles)
  const ST_BOUNDS = { minX: -23.4, maxX: 23.4, minZ: -16.4, maxZ: 21.4 };
  const ST_ALTO = 3.6;

  // ---- materiales: el lienzo dibujado primero, la foto lo pisa cuando llega --
  // Es la regla de siempre: un data URI se decodifica de forma asincronica, asi
  // que el local nace con texturas de codigo —que ya funcionan— y las fotos
  // entran encima. Una que no decodifique cuesta una superficie, no el nivel.
  function stTex(nom, rep, tinte) {
    const m = new THREE.MeshStandardMaterial({
      color: tinte, roughness: 0.86, metalness: 0.02
    });
    const src = window.__PB_N6 && window.__PB_N6[nom];
    if (src) {
      const img = new Image();
      img.onload = function () {
        const t = new THREE.Texture(img);
        t.wrapS = t.wrapT = THREE.MirroredRepeatWrapping;
        t.repeat.set(rep[0], rep[1]);
        t.anisotropy = renderer.capabilities.getMaxAnisotropy();
        if (THREE.sRGBEncoding) t.encoding = THREE.sRGBEncoding;
        t.needsUpdate = true;
        m.map = t;
        m.color.setHex(0xffffff);   // la foto ya trae su color: el tinte sobra
        m.needsUpdate = true;
        stTexPuestas++;
      };
      img.src = 'data:image/webp;base64,' + src;
    }
    return m;
  }
  let stTexPuestas = 0;

  const stMatPiso   = stTex('piso',    [12, 10], 0xb9b9b4);
  const stMatPared  = stTex('azulejo', [14, 2.4], 0xd8d6cc);
  const stMatTecho  = stTex('techo',   [12, 10], 0xbfbcb2);
  const stMatAcero  = stTex('mesada',  [3, 1], 0xb6bcc2);
  const stMatMesa   = stTex('madera6', [2, 2], 0xd08a3a);
  const stMatOscuro = new THREE.MeshStandardMaterial({ color: 0x2a2c31, roughness: 0.7 });
  const stMatRojo   = new THREE.MeshStandardMaterial({ color: 0x9c2b26, roughness: 0.62 });
  const stMatCromo  = new THREE.MeshStandardMaterial({ color: 0x9fa6ad, roughness: 0.34, metalness: 0.72 });

  // ---- helpers de construccion ----
  // Una pared es geometria Y un choque, y salen de la MISMA llamada: escribir la
  // caja de colision aparte garantiza que el dia que se mueva una pared quede
  // una pared invisible donde estaba.
  const stPiezas = [];         // para fundir por material al final
  function stAdd(geo, mat, x, y, z, ry) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    if (ry) m.rotation.y = ry;
    m.castShadow = false; m.receiveShadow = true;
    storeGroup.add(m);
    stPiezas.push(m);
    return m;
  }
  function stCaja(x1, z1, x2, z2, y0, y1, mat, sinChoque) {
    const w = Math.abs(x2 - x1), d = Math.abs(z2 - z1), h = y1 - y0;
    const m = stAdd(new THREE.BoxGeometry(w, h, d), mat,
                    (x1 + x2) / 2, y0 + h / 2, (z1 + z2) / 2);
    if (!sinChoque) {
      stBoxes.push({ minX: Math.min(x1, x2), maxX: Math.max(x1, x2),
                     minZ: Math.min(z1, z2), maxZ: Math.max(z1, z2),
                     y0: y0, y1: y1 });
    }
    return m;
  }
  const GRUESO = 0.3;
  function stMuro(x1, z1, x2, z2, alto) {
    const h = alto || ST_ALTO;
    if (Math.abs(x2 - x1) < 0.01) stCaja(x1 - GRUESO / 2, z1, x1 + GRUESO / 2, z2, 0, h, stMatPared);
    else stCaja(x1, z1 - GRUESO / 2, x2, z1 + GRUESO / 2, 0, h, stMatPared);
  }

  // ---- planta ----
  // El local es grande a proposito: 47 x 38 m de adentro, seis ambientes. Las
  // cuatro partes viven en cuatro ambientes DISTINTOS, asi que recorrerlo entero
  // es el nivel; con todo en una sala, buscar no seria buscar.
  {
    const piso = new THREE.Mesh(new THREE.PlaneGeometry(48, 39), stMatPiso);
    piso.rotation.x = -Math.PI / 2;
    piso.position.set(0, 0, 2.5);
    piso.receiveShadow = true;
    storeGroup.add(piso);

    const techo = new THREE.Mesh(new THREE.PlaneGeometry(48, 39), stMatTecho);
    techo.rotation.x = Math.PI / 2;
    techo.position.set(0, ST_ALTO, 2.5);
    storeGroup.add(techo);

    // perimetro
    stMuro(-23.7, -16.7, 23.7, -16.7);      // frente (sur)
    stMuro(-23.7, 21.7, 23.7, 21.7);        // fondo (norte)
    stMuro(-23.7, -16.7, -23.7, 21.7);      // oeste
    stMuro(23.7, -16.7, 23.7, 21.7);        // este

    // mostrador: bloque bajo + pared alta encima, con el paso a la cocina
    stCaja(-23.7, 2.7, 8, 3.4, 0, 1.15, stMatAcero);          // el mostrador
    stCaja(-23.7, 2.9, 8, 3.2, 1.7, ST_ALTO, stMatPared);     // pared de arriba
    stMuro(12, 3.05, 23.7, 3.05);                             // el resto de la linea
    // el hueco entre x=8 y x=12 es el paso al area de cocina

    // pared cocina / pasillo trasero, con puerta en x 0..3
    stMuro(-23.7, 12, 0, 12);
    stMuro(3, 12, 23.7, 12);

    // camara frigorifica, al este de la cocina
    stMuro(13, 3.4, 13, 6.2);
    stMuro(13, 8.2, 13, 11.7);      // el hueco 6,2..8,2 es su puerta
    // (la pared norte de la camara la hace ya la de cocina/pasillo en z=12, que
    //  cubre x 3..23,7: una segunda en 11,7 era un muro doble de 60 cm que
    //  nadie ve desde ningun lado y una caja de choque de mas)

    // deposito, al oeste del pasillo
    stMuro(-9, 12, -9, 17.5);       // el hueco 17,5..21,7 es su puerta

    // banos
    stMuro(5, 12, 5, 18);
    stMuro(5, 18, 13, 18);
    stMuro(13, 14.6, 13, 18);      // el hueco z 12,3..14,6 es la entrada, y mide
                                   // 2,3 m: con los 0,3 del primer intento el jugador
                                   // —que mide 0,84 de ancho— no entraba al bano
  }
"""

JS += r"""
  // ---- muebles del salon ----
  {
    // ventanales del frente: son lo unico que deja entrar luz de afuera, y por
    // eso el salon se lee distinto de la cocina sin cambiar una sola lampara
    const vidrio = new THREE.MeshStandardMaterial({
      color: 0x9fc4d8, roughness: 0.12, metalness: 0.0,
      transparent: true, opacity: 0.30
    });
    // EL FRENTE ERA UNA PARED DE AZULEJO Y NADA MAS. Los siete ventanales
    // estaban puestos desde el primer dia y no se veian: un plano celeste al
    // 30 % de opacidad delante de una pared gris, con la pared OPACA detras y
    // la noche del otro lado. Fotografiado desde el salon, el frente del local
    // era un muro liso — y el comentario decia que eran "lo unico que deja
    // entrar luz de afuera", que es una descripcion de algo que no pasaba.
    // UN VENTANAL DE NOCHE NO ES UN VIDRIO TRANSPARENTE: es un rectangulo
    // OSCURO con el marco claro. Eso se lee de una sin tocar la pared, y ademas
    // es lo que se ve de verdad — la pared es opaca, asi que el panel oscuro ES
    // el afuera.
    const noche = (function () {
      const c = document.createElement('canvas'); c.width = 32; c.height = 64;
      const g = c.getContext('2d');
      const gr = g.createLinearGradient(0, 0, 0, 64);
      gr.addColorStop(0, '#04060b');
      gr.addColorStop(0.60, '#070a11');
      gr.addColorStop(1, '#161d26');          // el asfalto mojado de la calle
      g.fillStyle = gr; g.fillRect(0, 0, 32, 64);
      // tres luces lejanas: es lo unico que dice que del otro lado hay algo, y
      // cuestan un lienzo de 32 pixeles
      [[6, 45, 6], [19, 41, 4], [27, 48, 3]].forEach(function (p) {
        const h = g.createRadialGradient(p[0], p[1], 0, p[0], p[1], p[2]);
        h.addColorStop(0, 'rgba(255,212,148,0.95)');
        h.addColorStop(1, 'rgba(255,212,148,0)');
        g.fillStyle = h; g.beginPath(); g.arc(p[0], p[1], p[2], 0, 6.3); g.fill();
      });
      const t = new THREE.CanvasTexture(c);
      if (THREE.sRGBEncoding) t.encoding = THREE.sRGBEncoding;
      return new THREE.MeshBasicMaterial({ map: t });
    })();
    // carpinteria pintada y no cromo: con metalness alto y sin mapa de entorno
    // no hay nada que reflejar y el marco sale mas oscuro que la pared, o sea
    // al reves de lo que tiene que pasar
    const carp = new THREE.MeshStandardMaterial({ color: 0xbcc2c9, roughness: 0.46, metalness: 0.12 });
    for (let i = 0; i < 7; i++) {
      const x = -19 + i * 6.3;
      stCaja(x - 2.6, -16.53, x + 2.6, -16.49, 0.9, 2.9, noche, true);   // la noche
      stCaja(x - 2.6, -16.47, x + 2.6, -16.44, 0.9, 2.9, vidrio, true);  // el brillo del vidrio
      stCaja(x - 2.74, -16.54, x + 2.74, -16.38, 0.76, 0.9, carp, true); // antepecho
      stCaja(x - 2.74, -16.54, x + 2.74, -16.38, 2.9, 3.04, carp, true); // dintel
      stCaja(x - 2.74, -16.54, x - 2.6, -16.38, 0.76, 3.04, carp, true); // jamba oeste
      stCaja(x + 2.6, -16.54, x + 2.74, -16.38, 0.76, 3.04, carp, true); // jamba este
      stCaja(x - 0.07, -16.55, x + 0.07, -16.40, 0.9, 2.9, carp, true);  // parteluz
    }
    // mesas y sillas
    for (let fx = 0; fx < 6; fx++) {
      for (let fz = 0; fz < 3; fz++) {
        const x = -18 + fx * 7.2, z = -13.5 + fz * 5.2;
        stAdd(new THREE.CylinderGeometry(0.09, 0.09, 0.72, 8), stMatCromo, x, 0.36, z);
        stAdd(new THREE.BoxGeometry(1.5, 0.09, 1.5), stMatMesa, x, 0.74, z);
        // 0,78 es el radio de la MESA, y las sillas viven a 1,25: el jugador
        // frenaba en 1,20 del centro, o sea con el cuerpo metido dentro de la
        // silla. El obstaculo es el conjunto —mesa mas las cuatro sillas—, y va
        // como UN circulo y no cinco: cinco circulos superpuestos se empujan
        // entre ellos y dejan al jugador trabado, porque el resolutor hace una
        // sola pasada.
        stObs.push({ x: x, z: z, radius: 1.55 });
        for (let s = 0; s < 4; s++) {
          const a = s * Math.PI / 2 + 0.4;
          const sx = x + Math.cos(a) * 1.25, sz = z + Math.sin(a) * 1.25;
          stAdd(new THREE.CylinderGeometry(0.07, 0.07, 0.44, 6), stMatCromo, sx, 0.22, sz);
          stAdd(new THREE.CylinderGeometry(0.22, 0.22, 0.07, 10), stMatRojo, sx, 0.47, sz);
        }
      }
    }
    // dos hileras de reservados contra el oeste
    for (let i = 0; i < 4; i++) {
      const z = -13 + i * 4.6;
      stCaja(-23.4, z - 1.5, -21.4, z + 1.5, 0, 0.45, stMatRojo);
      stCaja(-23.4, z - 1.5, -22.9, z + 1.5, 0.45, 1.45, stMatRojo);
    }
    // cartel de menu sobre el mostrador
    const menu = new THREE.MeshStandardMaterial({
      color: 0x14161a, roughness: 0.5, emissive: 0x2a1c06, emissiveIntensity: 0.9
    });
    stCaja(-14, 2.85, -2, 2.95, 2.05, 3.25, menu, true);
    // DOS materiales y no uno por franja: cada material es una llamada de
    // dibujo propia, asi que nueve rectangulos de veinte centimetros costaban
    // nueve llamadas para pintar dos colores
    const franjaA = new THREE.MeshBasicMaterial({ color: 0xffcf6a });
    const franjaB = new THREE.MeshBasicMaterial({ color: 0xff8b4a });
    for (let i = 0; i < 9; i++) {
      stCaja(-13.4 + i * 1.28, 2.79, -12.6 + i * 1.28, 2.83, 2.2 + (i % 3) * 0.28,
             2.32 + (i % 3) * 0.28, i % 3 ? franjaA : franjaB, true);
    }
    // cajas registradoras
    for (let i = 0; i < 3; i++) {
      const x = -16 + i * 6;
      stAdd(new THREE.BoxGeometry(0.7, 0.34, 0.5), stMatOscuro, x, 1.32, 3.0);
      stAdd(new THREE.BoxGeometry(0.62, 0.02, 0.34), stMatCromo, x, 1.5, 2.92);
    }
  }

  // ---- cocina ----
  {
    // plancha, freidoras, mesada y campana: lo que hace que se lea a cocina no
    // son los bultos sino la campana, que es lo unico que cuelga del techo
    stCaja(-22, 4.2, -8, 5.4, 0, 0.95, stMatAcero);              // mesada larga
    stCaja(-22, 4.4, -8, 5.2, 2.35, 3.1, stMatCromo);            // campana
    for (let i = 0; i < 4; i++) {
      stCaja(-21 + i * 3.4, 4.4, -19.4 + i * 3.4, 5.2, 0.95, 1.02, stMatOscuro);  // planchas
    }
    stCaja(-6, 4.2, -1, 5.4, 0, 0.95, stMatAcero);               // freidoras
    for (let i = 0; i < 3; i++) {
      stCaja(-5.6 + i * 1.7, 4.5, -4.6 + i * 1.7, 5.1, 0.95, 1.0, stMatOscuro);
    }
    stCaja(-20, 8.4, -4, 9.6, 0, 0.95, stMatAcero);              // mesa de armado
    // termina en x=7,5 y no en 11: con 11 el tramo del grafo que va del paso
    // del mostrador a la cocina la cruzaba por el medio, y mide 2,2 m de alto
    stCaja(1, 4.2, 7.5, 5.0, 0, 2.2, stMatCromo);                // estanteria alta
    for (let i = 0; i < 3; i++) stCaja(1, 4.2, 7.5, 5.0, 0.6 + i * 0.55, 0.66 + i * 0.55, stMatAcero, true);
  }

  // ---- camara frigorifica ----
  {
    const frio = new THREE.MeshStandardMaterial({ color: 0xc8d6dc, roughness: 0.55 });
    // CON `true` NO TENIA CHOQUE: una pared de 3,6 m de alto que se cruzaba
    // caminando, y del otro lado hay una franja muerta de 65 cm entre ella y la
    // linea del mostrador.
    stCaja(13.3, 3.7, 23.4, 3.9, 0, ST_ALTO, frio);
    for (let i = 0; i < 3; i++) {
      stCaja(14.5, 5 + i * 2.2, 22.5, 5.6 + i * 2.2, 0, 1.9, frio);      // estantes
      stCaja(14.5, 5 + i * 2.2, 22.5, 5.6 + i * 2.2, 1.9, 1.98, stMatCromo, true);
    }
    for (let i = 0; i < 9; i++) {
      stAdd(new THREE.BoxGeometry(0.7, 0.5, 0.5), stMatOscuro,
            15 + (i % 5) * 1.7, 2.25, 5.3 + Math.floor(i / 5) * 2.2);
    }
  }

  // ---- deposito ----
  {
    for (let i = 0; i < 4; i++) {
      const x = -21 + i * 3.6;
      // IBAN DE z=13 A 20,5 y dejaban 85 cm al sur y 1,05 al norte: con el
      // jugador en 84 cm de ancho, entrar al deposito era quedarse trabado
      // entre dos cajas de choque que empujan en sentidos opuestos. De 13,5 a
      // 19,5 el pasillo del norte pasa a 2,05 m y el del sur a 1,35.
      stCaja(x, 13.5, x + 1.1, 19.5, 0, 2.4, stMatCromo);
      for (let j = 0; j < 3; j++) stCaja(x, 13.5, x + 1.1, 19.5, 0.7 + j * 0.65, 0.76 + j * 0.65, stMatAcero, true);
      for (let j = 0; j < 6; j++) {
        stAdd(new THREE.BoxGeometry(0.85, 0.6, 0.7), stMatMesa,
              x + 0.55, 1.06 + (j % 3) * 0.65, 14 + Math.floor(j / 3) * 4.4);
      }
    }
  }

  // ---- banos ----
  {
    const loza = new THREE.MeshStandardMaterial({ color: 0xe6e6e2, roughness: 0.42 });
    // EL BANO NO SE PODIA RECORRER, y es una resta. Los tabiques iban de z=13
    // a 16,6 y la puerta entra por x=13 entre z 12,15 y 14,6: el unico paso
    // hacia los otros compartimientos era la franja z 12,15..13, o sea 85 cm
    // contra un jugador que mide 84. Y por el norte tampoco, porque las piletas
    // cruzaban de pared a pared dejando 60 cm. Con los tabiques de 14,2 a 17,2
    // el corredor de entrada pasa a 2,05 m, y las piletas se van al primer
    // compartimiento, que es donde va un lavatorio.
    for (let i = 0; i < 3; i++) {
      stMuro(6.5 + i * 2.2, 14.2, 6.5 + i * 2.2, 17.2, 2.2);
      stAdd(new THREE.BoxGeometry(0.5, 0.42, 0.6), loza, 7.6 + i * 2.2, 0.21, 16.4);
    }
    // PEGADAS A LA PARED DEL NORTE: con las piletas terminando en z=17,0 y la
    // pared en 17,85 quedaba una franja de 85 cm detras de ellas que el relleno
    // de la auditoria marcaba como libre y no alcanzaba —un hueco de dos celdas
    // al que no se puede entrar—. Pegadas, no hay hueco.
    stCaja(5.4, 15.0, 6.1, 17.7, 0.75, 0.9, loza);      // piletas, contra el oeste
  }

  // ---- luces: fluorescentes en fila, y uno que parpadea ----
  const stLuces = [];
  {
    const tubo = new THREE.MeshBasicMaterial({ color: 0xf2f6ff });
    const sitios = [[-14, -10], [0, -10], [14, -10], [-14, -2], [0, -2], [14, -2],
                    [-14, 7], [-2, 7], [18, 7], [-14, 17], [1, 17], [12, 15], [19, 17]];
    sitios.forEach(function (p, i) {
      stCaja(p[0] - 1.5, p[1] - 0.25, p[0] + 1.5, p[1] + 0.25, ST_ALTO - 0.14, ST_ALTO - 0.06, tubo, true);
      const l = new THREE.PointLight(0xdfe9ff, 0.72, 17, 1.5);
      l.position.set(p[0], ST_ALTO - 0.35, p[1]);
      storeGroup.add(l);
      // UNO SOLO PARPADEA, y es el de la cocina. Con todos parpadeando el local
      // se lee a discoteca; con uno, se lee a que algo anda mal ahi.
      stLuces.push({ luz: l, base: 0.72, parpadea: i === 7 });
    });
    storeGroup.add(new THREE.HemisphereLight(0xb9c6d4, 0x30302c, 0.42));
  }

  // ==================================================================
  // FUNDIR EL LOCAL POR MATERIAL
  // ==================================================================
  // `stPiezas` se venia llenando desde la primera linea con el comentario "para
  // fundir por material al final" Y NADIE FUNDIA NADA: era un array vivo que no
  // leia nadie y un comentario que describia algo que no pasaba. Medido, con
  // las cajas sueltas el local costaba 331 LLAMADAS DE DIBUJO mirando hacia el
  // deposito y 328 en el salon — una caja suelta es una llamada, y con las
  // sombras se paga dos veces.
  // NO HAY BufferGeometryUtils: el juego baja three.min.js de un CDN y nada mas,
  // asi que la fusion va a mano en vez de agregar otra descarga que puede no
  // llegar. Son treinta lineas y no cambia un solo pixel.
  function stFundir() {
    const grupos = [], mats = [];
    stPiezas.forEach(function (m) {
      let k = mats.indexOf(m.material);
      if (k < 0) { k = mats.length; mats.push(m.material); grupos.push([]); }
      grupos[k].push(m);
    });
    let mallas = 0;
    const piezas = stPiezas.length;
    for (let k = 0; k < mats.length; k++) {
      const lista = grupos[k];
      if (lista.length < 2) { mallas++; continue; }
      const malla = stUnir(lista, mats[k]);
      lista.forEach(function (m) { storeGroup.remove(m); });
      storeGroup.add(malla);
      mallas++;
    }
    stPiezas.length = 0;
    return { piezas: piezas, mallas: mallas };
  }

  // ---- la fusion propiamente dicha, que sirve para cualquier lista ----
  function stUnir(lista, mat, recorta) {
      let nv = 0, ni = 0;
      lista.forEach(function (m) {
        const p = m.geometry.attributes.position;
        nv += p.count;
        ni += m.geometry.index ? m.geometry.index.count : p.count;
      });
      const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2);
      // Uint32 y no Uint16: el salon solo pasa de 65.535 vertices, y el desborde
      // no avisa — dibuja triangulos que apuntan a cualquier lado
      const idx = new Uint32Array(ni);
      const nm = new THREE.Matrix3(), v = new THREE.Vector3();
      let vo = 0, io = 0;
      lista.forEach(function (m) {
        m.updateMatrix();
        const g = m.geometry, p = g.attributes.position, nn = g.attributes.normal, u = g.attributes.uv;
        nm.getNormalMatrix(m.matrix);
        for (let i = 0; i < p.count; i++) {
          v.fromBufferAttribute(p, i).applyMatrix4(m.matrix);
          pos[(vo + i) * 3] = v.x; pos[(vo + i) * 3 + 1] = v.y; pos[(vo + i) * 3 + 2] = v.z;
          if (nn) {
            v.fromBufferAttribute(nn, i).applyMatrix3(nm).normalize();
            nor[(vo + i) * 3] = v.x; nor[(vo + i) * 3 + 1] = v.y; nor[(vo + i) * 3 + 2] = v.z;
          }
          if (u) { uv[(vo + i) * 2] = u.getX(i); uv[(vo + i) * 2 + 1] = u.getY(i); }
        }
        if (g.index) {
          for (let i = 0; i < g.index.count; i++) idx[io + i] = g.index.getX(i) + vo;
          io += g.index.count;
        } else {
          for (let i = 0; i < p.count; i++) idx[io + i] = vo + i;
          io += p.count;
        }
        vo += p.count;
        g.dispose();
      });
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      geo.setIndex(new THREE.BufferAttribute(idx, 1));
      const malla = new THREE.Mesh(geo, mat);
      // FRUSTUM CULLED APAGADO para el local: la malla fundida lo abarca entero,
      // asi que su esfera envolvente esta siempre a la vista y probarla es
      // trabajo que no descarta nada. Para los pelos de la arana si conviene,
      // porque la arana casi nunca esta en cuadro.
      malla.frustumCulled = !!recorta;
      malla.receiveShadow = true;
      return malla;
    }
  const stFusion = stFundir();
"""

C_PAN = '0xd8a05a'
C_SESAMO = '0xf2e3c0'
C_CARNE = '0x5a3524'
C_QUESO = '0xf0b429'
C_LECHUGA = '0x69a63c'

JS += r"""
  // ---- las cuatro partes de la hamburguesa ----
  // Dibujadas por codigo y no generadas: un pan y una feta de queso son dos
  // formas de veinte lineas, y de un objeto que hay que juntar lo que importa es
  // que se RECONOZCA de un vistazo, no que tenga poros. Cada una vive en un
  // ambiente DISTINTO: recorrer el local entero es el nivel.
  const ST_ORDEN = ['pan', 'carne', 'queso', 'tapa'];
  const ST_NOMBRE = { pan: 'PAN', carne: 'CARNE', queso: 'QUESO', tapa: 'TAPA' };
  const stMatPan = new THREE.MeshStandardMaterial({ color: __C_PAN__, roughness: 0.85 });
  const stMatSesamo = new THREE.MeshStandardMaterial({ color: __C_SESAMO__, roughness: 0.8 });
  const stMatCarne = new THREE.MeshStandardMaterial({ color: __C_CARNE__, roughness: 0.9 });
  const stMatQueso = new THREE.MeshStandardMaterial({ color: __C_QUESO__, roughness: 0.6 });
  const stMatLechuga = new THREE.MeshStandardMaterial({ color: __C_LECHUGA__, roughness: 0.75 });

  function stFormaParte(id) {
    const g = new THREE.Group();
    if (id === 'pan') {
      g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.32, 0.13, 16), stMatPan));
    } else if (id === 'tapa') {
      const cup = new THREE.SphereGeometry(0.34, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5);
      const m = new THREE.Mesh(cup, stMatPan);
      m.scale.y = 0.62;
      g.add(m);
      for (let i = 0; i < 7; i++) {
        const a = i * 0.9, r = 0.09 + (i % 3) * 0.07;
        const s = new THREE.Mesh(new THREE.SphereGeometry(0.022, 5, 4), stMatSesamo);
        s.position.set(Math.cos(a) * r, 0.2 - r * 0.25, Math.sin(a) * r);
        g.add(s);
      }
    } else if (id === 'carne') {
      g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.1, 16), stMatCarne));
    } else {
      const q = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.02, 0.56), stMatQueso);
      g.add(q);
      const l = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.05, 14), stMatLechuga);
      l.position.y = -0.04;
      g.add(l);
    }
    return g;
  }

  const stPartes = [];
  {
    // TRES DE LAS CUATRO ESTABAN DENTRO DE UN MUEBLE, y eso no se ve como un
    // objeto tapado: se ve como un objeto que NO EXISTE, porque flota a 1,15 m
    // dentro de una caja opaca. El pan caia dentro de la segunda estanteria del
    // deposito (x -17,4..-16,3), el queso dentro del estante del medio de la
    // camara (z 7,2..7,8) y la tapa dentro del tabique del bano (x 8,55..8,85).
    // Las tres pasan al pasillo de su ambiente.
    const sitios = {
      pan: [-15.0, 17.2],     // deposito, pasillo entre la 2a y la 3a estanteria
      carne: [-13.5, 6.8],    // cocina, entre la mesada y la mesa de armado
      queso: [18.5, 8.6],     // camara, pasillo entre el 2o y el 3er estante
      tapa: [9.8, 15.5]       // bano, dentro del compartimiento del medio
    };
    ST_ORDEN.forEach(function (id) {
      const p = sitios[id];
      const g = stFormaParte(id);
      g.position.set(p[0], 1.15, p[1]);
      storeGroup.add(g);
      // un halo bajo cada parte: en un local con trece tubos, un objeto de
      // treinta centimetros en el piso no se distingue de la basura
      const halo = new THREE.Mesh(
        new THREE.CircleGeometry(0.85, 20),
        new THREE.MeshBasicMaterial({ color: 0xffd070, transparent: true,
                                      opacity: 0.30, depthWrite: false })
      );
      halo.rotation.x = -Math.PI / 2;
      halo.position.set(p[0], 0.03, p[1]);
      storeGroup.add(halo);
      stPartes.push({ id: id, g: g, halo: halo, x: p[0], z: p[1], tomada: false, base: 1.15 });
    });
  }

  // ---- la bandeja del mostrador: donde se arma, y EN ORDEN ----
  const ST_BANDEJA = { x: 0, z: 2.35 };
  const stPila = [];        // lo que ya esta puesto, en orden
  {
    const b = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.05, 0.9),
                             new THREE.MeshStandardMaterial({ color: 0x8c1f1a, roughness: 0.5 }));
    b.position.set(ST_BANDEJA.x, 1.18, ST_BANDEJA.z);
    storeGroup.add(b);
    const halo = new THREE.Mesh(
      new THREE.RingGeometry(0.75, 1.05, 24),
      new THREE.MeshBasicMaterial({ color: 0x8ef08a, transparent: true, opacity: 0.34,
                                    side: THREE.DoubleSide, depthWrite: false })
    );
    halo.rotation.x = -Math.PI / 2;
    halo.position.set(ST_BANDEJA.x, 1.22, ST_BANDEJA.z);
    storeGroup.add(halo);
    window.__stBandejaHalo = halo;
  }

  // ---- la puerta de atras ----
  const ST_SALIDA = { x: 18.5, z: 21.2 };
  const stSalida = buildDoorway({ frameColor: 0x8d9096 });
  stSalida.group.position.set(ST_SALIDA.x, 0, ST_SALIDA.z);
  stSalida.group.rotation.y = Math.PI;
  stSalida.group.visible = false;
  stSalida.portalMat.color.set(0xdff0ff);
  stSalida.haloMat.color.set(0x9fd8ff);
  stSalida.poolMat.color.set(0x9fd8ff);
  storeGroup.add(stSalida.group);
"""
JS = JS.replace('__C_PAN__', C_PAN).replace('__C_SESAMO__', C_SESAMO) \
       .replace('__C_CARNE__', C_CARNE).replace('__C_QUESO__', C_QUESO) \
       .replace('__C_LECHUGA__', C_LECHUGA)

JS += r"""
  // ==================================================================
  // LA ARANA
  // ==================================================================
  // Va dibujada por codigo y no generada, y es una decision, no una comodidad:
  // esta cosa tiene que CAMINAR con ocho patas, encabritarse y arrinconar al
  // jugador. Una malla generada llega estatica; riggear ocho patas a mano es
  // mas trabajo que construirlas articuladas de entrada. Lo que da miedo aca es
  // el movimiento y la silueta, no el poro de la piel.
  // 0,04 y no 0,11: medida la caja envolvente con el grupo en 0,11 el piso
  // daba 0,07, o sea que la arana flotaba siete centimetros. El numero sale de
  // la medicion y no de una cuenta a mano —la punta de la tibia queda en 0,003
  // local y el radio del cono se la lleva un poco mas abajo.
  const ARA_Y = 0.04;
  const ARA = {
    g: new THREE.Group(),
    patas: [],
    estado: 'ronda',      // 'ronda' | 'caza'
    vel: 0,
    fase: 0,
    wp: new THREE.Vector3(-16, 0, 8),
    tejeCd: 16,
    // EL NODO SE RECUERDA, NO SE DEDUCE DE LA POSICION EN CADA CUADRO. Ese era
    // el defecto que dejaba a la arana clavada: `stNodoDe` devuelve el nodo mas
    // CERCANO, asi que caminando entre dos nodos cruza la frontera y el nodo de
    // salida cambia — y con el cambia el primer salto del BFS. Medido en el
    // corredor del bano: en x > 10,875 el mas cercano es el 21 y el salto hacia
    // el salon es el 15, que esta al OESTE; un centimetro mas alla el mas
    // cercano es el 15 y el salto es el 14, que esta al ESTE. La arana iba y
    // venia sobre esa linea: 143 de 180 segundos en el mismo sitio, recorriendo
    // 396 metros sin moverse de lugar. Y en caza, 117 de 120 — o sea que NO
    // LLEGABA NUNCA al jugador.
    nodo: -1,       // el nodo que ocupa de verdad
    sig: -1         // el nodo al que se comprometio a llegar
  };
  {
    // EL NEGRO ABSOLUTO NO TIENE SOMBREADO QUE MOSTRAR. Con quitina en 0x14100f
    // —que es lo que uno escribe pensando en una arana— el bicho salia como una
    // MANCHA negra sobre un local en penumbra: ni patas, ni volumen, ni
    // silueta. Un gris pardo con brillo humedo si recibe la luz de los tubos, y
    // el emisivo bajo garantiza que nunca caiga a negro puro ni en la esquina
    // mas oscura del deposito. Es el mismo defecto que ya costo una vuelta con
    // el camello de LEMI y con las ruedas del auto.
    const quitina = new THREE.MeshStandardMaterial({
      color: 0x413630, roughness: 0.42, metalness: 0.30,
      emissive: 0x140b08, emissiveIntensity: 1.0
    });
    const juntura = new THREE.MeshStandardMaterial({
      color: 0x6a1a12, roughness: 0.5, emissive: 0x180402, emissiveIntensity: 1.0
    });
    // toneMapped EN FALSE: three.js pasa por el tone mapping TODOS los
    // materiales, tambien los MeshBasic, y ACESFilmic convierte este rojo en un
    // rosa palido. Medido en la captura del susto, los ocho ojos salian del
    // mismo valor que la quitina iluminada. Sin tone mapping el rojo sale rojo,
    // que es lo unico que un ojo encendido tiene que hacer.
    const ojoMat = new THREE.MeshBasicMaterial({ color: 0xff2a10, toneMapped: false });
    const colmillo = new THREE.MeshStandardMaterial({ color: 0x1d1512, roughness: 0.35 });
    ARA.colmillos = [];

    // cuerpo: cefalotorax chato y un abdomen mucho mas grande y alto. La
    // proporcion es lo que separa una arana de un bicho de seis patas: el
    // abdomen tiene que pesar.
    const cef = new THREE.Mesh(new THREE.SphereGeometry(0.78, 18, 12), quitina);
    cef.scale.set(1.15, 0.62, 1.0);
    cef.position.set(0, 1.62, 0.55);
    ARA.g.add(cef);
    // POR NOMBRE Y NO POR children[0]: la altura del cefalotorax se escribia
    // como ARA.g.children[0].position.y, o sea apoyada en el ORDEN en que se
    // construye el bicho. Fundir los pelos o agregar una pieza antes movia el
    // indice y el cabeceo pasaba a mover otra cosa, sin fallar.
    ARA.cef = cef;
    const abd = new THREE.Mesh(new THREE.SphereGeometry(0.95, 18, 14), quitina);
    abd.scale.set(1.0, 0.92, 1.28);
    abd.position.set(0, 1.78, -1.25);
    ARA.g.add(abd);
    // pelos del abdomen: cuarenta conos cortos. Es lo mas barato que existe para
    // que una esfera deje de leerse a esfera — y VAN FUNDIDOS EN UNA MALLA,
    // porque no se mueven respecto del cuerpo y cuarenta conos sueltos eran
    // cuarenta llamadas de dibujo. Medido, la arana entera costaba unas ochenta.
    const pelos = [];
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * Math.PI * 2, b = Math.random() * Math.PI;
      const pelo = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.34, 4), quitina);
      const r = 0.92;
      pelo.position.set(Math.sin(b) * Math.cos(a) * r, 1.78 + Math.cos(b) * r * 0.9,
                        -1.25 + Math.sin(b) * Math.sin(a) * r * 1.2);
      pelo.lookAt(pelo.position.x * 3, pelo.position.y + 1.2, pelo.position.z * 3);
      pelo.rotateX(Math.PI / 2);
      pelos.push(pelo);
    }
    ARA.g.add(stUnir(pelos, quitina, true));
    // ---- LA CARA: un bulto que SALE del cefalotorax ----
    // El intento anterior era una placa oscura plana en z=1,38, y eso no se
    // apoya en nada: el cefalotorax es un elipsoide que TERMINA EN PUNTA en
    // z=1,33, asi que en el centro la placa asomaba un centimetro y en sus
    // esquinas —calculado sobre la ecuacion del elipsoide— quedaba a 18 cm de
    // la superficie, y las de arriba directamente fuera de la cabeza. Un cartel
    // negro flotando delante de una punta. Se lee bien de frente, que es donde
    // yo la habia fotografiado, y mal desde cualquier otro angulo.
    // Un bulto elipsoidal ancho y CHATO cabe dentro del contorno del
    // cefalotorax a la altura de su ecuador y asoma 11 cm por la punta: por
    // construccion no puede flotar, y ademas es la cara que tiene una arana.
    // Los cinco numeros salen de resolver tres condiciones sobre la ecuacion
    // del cefalotorax, no de tantear: el bulto tiene que caber dentro de su
    // contorno en su punto mas bajo, su ecuador y su punto mas alto (0,00 <
    // 0,591 · 0,560 < 0,682 · 0,00 < 0,203), asomar unos diez centimetros por
    // la punta (0,110), y dejar sitio para que los ocho ojos caigan en la parte
    // CURVA y no en el borde. Con ay = 0,34 el bulto salia por arriba de la
    // cabeza y los dos ojos de las puntas caian justo en el rim (q = 0,000).
    const CARA = { x: 0, y: 1.70, z: 1.04, ax: 0.56, ay: 0.28, az: 0.40 };
    const cara = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10),
      new THREE.MeshStandardMaterial({ color: 0x16100d, roughness: 0.4,
                                       emissive: 0x080403, emissiveIntensity: 1.0 }));
    cara.scale.set(CARA.ax, CARA.ay, CARA.az);
    cara.position.set(CARA.x, CARA.y, CARA.z);
    ARA.g.add(cara);

    // ocho ojos en dos filas, que es como los tiene de verdad. Van fundidos por
    // lo mismo que los pelos: no se mueven y no los toca nadie.
    // Y SE APOYAN EN LA SUPERFICIE DEL BULTO, no en un z fijo: con una fila
    // plana los de los extremos quedaban 15 cm por delante de la cabeza —el
    // elipsoide baja de z=1,27 en el centro a 1,12 en el borde— o sea flotando.
    // El z sale de la ecuacion del propio bulto, hundido un 12 % para que se
    // vean medio metidos y no pegados encima.
    const ojos = [];
    for (let i = 0; i < 8; i++) {
      const fila = i < 4 ? 0 : 1;
      const k = i % 4;
      const r = fila ? 0.10 : 0.15;
      const ox = (k - 1.5) * (fila ? 0.19 : 0.24);
      const oy = fila ? 1.61 : 1.78;
      const u = (ox - CARA.x) / CARA.ax, v = (oy - CARA.y) / CARA.ay;
      const q = Math.max(0, 1 - u * u - v * v);
      const o = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), ojoMat);
      o.position.set(ox, oy, CARA.z + CARA.az * Math.sqrt(q) * 0.88);
      ojos.push(o);
    }
    ARA.g.add(stUnir(ojos, ojoMat, true));
    // quelIceros y colmillos
    for (let s = -1; s <= 1; s += 2) {
      const q = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.1, 0.5, 7), juntura);
      q.position.set(s * 0.24, 1.42, 1.34);
      q.rotation.x = 0.5;
      ARA.g.add(q);
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.52, 6), colmillo);
      c.position.set(s * 0.24, 1.12, 1.5);
      c.rotation.x = Math.PI - 0.35;
      // el signo de apertura se guarda con el colmillo y no se deduce del
      // indice del array, que es lo que ya salio mal una vez
      c.userData.afuera = -s;
      ARA.g.add(c);
      ARA.colmillos.push(c);
    }

    // ---- las ocho patas ----
    // Cada una: pivote en el cuerpo -> femur hacia AFUERA Y ARRIBA -> rodilla ->
    // tibia hacia abajo. Ese codo por encima del lomo es la silueta de arana; con
    // las patas rectas queda un insecto.
    // OJO CON `az`: el femur sale por el +X local del pivote, y con
    // rotation.y = az eso apunta a (cos az · −sin az). O sea que az POSITIVO
    // manda la pata HACIA ATRAS y az negativo hacia adelante — el rumbo en
    // grados es phi = 90 + az. Medido, los ocho quedan asi:
    //   i=0,1  az +0,55 +1,15  ->  121 y 156 grados  ->  ATRAS-derecha
    //   i=2,3  az +1,95 +2,55  ->  202 y 236         ->  ATRAS-izquierda
    //   i=4,5  az -0,55 -1,15  ->   58 y  24         ->  ADELANTE-derecha
    //   i=6,7  az -1,95 -2,55  ->  338 y 304         ->  ADELANTE-izquierda
    // Cuatro adelante y cuatro atras, dos por lado: es la planta correcta. Lo
    // que esta mal es el NOMBRE `lado`, que no es un lado sino el signo de az.
    const AZ = [0.55, 1.15, 1.95, 2.55];
    for (let i = 0; i < 8; i++) {
      const atras = i < 4 ? 1 : -1;
      const az = AZ[i % 4] * atras;
      const piv = new THREE.Object3D();
      piv.position.set(0, 1.55, 0.35);
      piv.rotation.y = az;
      ARA.g.add(piv);

      const fPiv = new THREE.Object3D();
      piv.add(fPiv);
      const fem = new THREE.Mesh(new THREE.CylinderGeometry(0.135, 0.10, 1.5, 8), quitina);
      fem.position.x = 0.75;
      fem.rotation.z = Math.PI / 2;
      fPiv.add(fem);

      const rod = new THREE.Object3D();
      rod.position.x = 1.5;
      fPiv.add(rod);
      rod.add(new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), juntura));
      const tPiv = new THREE.Object3D();
      rod.add(tPiv);
      const tib = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.032, 3.2, 7), quitina);
      tib.position.x = 1.6;
      tib.rotation.z = Math.PI / 2;
      tPiv.add(tib);

      // `delantera` se guarda AQUI, donde se sabe de que pata se trata, en vez
      // de recalcularse con un indice: araGrito usaba `(i % 4) < 2`, que
      // selecciona i = 0,1,4,5 — o sea DOS DE ATRAS Y DOS DE ADELANTE, las
      // cuatro del lado derecho. El susto levantaba media arana en vez de la
      // mitad de adelante, y eso se lee a que se cae de costado.
      // `afuera` dice para donde hay que girar el pivote para que la pata se
      // ABRA, y sale de una cuenta y no de tantear: abrir es aumentar el
      // |componente lateral| = |cos az|, cuya derivada tiene el signo de
      // −sin(2·az). Con az −0,55 y −1,15 (adelante-derecha) hay que subir az;
      // con −1,95 y −2,55 (adelante-izquierda) hay que bajarlo.
      ARA.patas.push({ piv: piv, fPiv: fPiv, tPiv: tPiv, az: az,
                       delantera: i >= 4,
                       afuera: Math.sin(2 * az) < 0 ? 1 : -1,
                       fase: (i % 2 === 0 ? 0 : Math.PI) + (i < 4 ? 0 : Math.PI) });
    }
    ARA.g.position.set(-16, ARA_Y, 8);
    ARA.g.visible = false;
    storeGroup.add(ARA.g);

    // una luz roja tenue pegada a ella: en un local con tubos blancos es lo
    // unico que avisa que esta cerca antes de verla doblar la esquina
    ARA.luz = new THREE.PointLight(0xff2a18, 0.0, 9, 2);
    ARA.luz.position.set(0, 1.6, 0.9);
    ARA.g.add(ARA.luz);
  }

  // ---- la pose de las patas, por fase ----
  // La marcha es de tetrapodo alterno: cuatro patas apoyadas mientras las otras
  // cuatro avanzan. Si se moviesen todas juntas se leeria a titiritero.
  function araPose(t, vel) {
    const amp = 0.20 + Math.min(vel, 6) * 0.045;
    for (let i = 0; i < 8; i++) {
      const p = ARA.patas[i];
      const f = t + p.fase;
      const paso = Math.sin(f);
      const alza = Math.max(0, Math.sin(f + Math.PI / 2));
      p.piv.rotation.y = p.az + paso * amp;
      // EL CODO VA POR ENCIMA DEL LOMO Y EL PIE EN EL PISO, y los dos angulos
      // salen de una cuenta, no de tantear: con el pivote en y=1,55 y un femur
      // de 1,5 a 0,96 rad la rodilla queda en 2,78, y una tibia de 3,2 a -1,05
      // rad de horizontal baja justo esos 2,78 hasta el suelo.
      p.fPiv.rotation.z = 0.96 + alza * 0.16;
      p.tPiv.rotation.z = -2.01 + alza * 0.42;
    }
    // el cuerpo cabecea al doble de la frecuencia del paso, porque hay dos
    // apoyos por ciclo
    ARA.cef.position.y = 1.62 + Math.sin(t * 2) * 0.045 * (vel > 0.4 ? 1 : 0.3);
    // Y LOS COLMILLOS VUELVEN A SU SITIO. araGrito los abre y no los cerraba
    // nadie: araPose no los tocaba, asi que despues de un agarron la arana se
    // quedaba con los colmillos abiertos y torcidos PARA TODA LA PARTIDA. El
    // reposo se escribe aca y no en el reinicio, por la regla de siempre en este
    // proyecto: una linea que corre todos los cuadros gana contra una que corre
    // una vez.
    for (let i = 0; i < ARA.colmillos.length; i++) {
      ARA.colmillos[i].rotation.x = Math.PI - 0.35;
      ARA.colmillos[i].rotation.z = 0;
    }
  }

  // ---- la pose del agarron ----
  // El screamer la pone a ochenta centimetros del ojo, y ahi la pose de caminar
  // no dice nada: lo que hace una arana encima tuyo es LEVANTAR LAS CUATRO
  // PATAS DE ADELANTE y abrir los colmillos. Las cuatro de atras se quedan
  // apoyadas —si se levantan las ocho el bicho flota— y tiemblan a otra
  // frecuencia, que es lo que impide que las ocho se lean como una sola pieza.
  function araGrito(k, elapsed) {
    const kk = clamp(k * 1.7, 0, 1);
    for (let i = 0; i < 8; i++) {
      const p = ARA.patas[i];
      if (p.delantera) {
        p.fPiv.rotation.z = lerp(0.96, 1.62, kk) + Math.sin(elapsed * 23 + i) * 0.07;
        p.tPiv.rotation.z = lerp(-2.01, -0.62, kk);
        // Y SE ABREN HACIA AFUERA. Con el signo anterior las cuatro se movian
        // hacia az = 0, o sea CONVERGIAN sobre el eje de la mirada: se cruzaban
        // delante de la cara justo en el plano donde hay que ver la cara.
        p.piv.rotation.y = p.az + p.afuera * 0.40 * kk;
      } else {
        // Y LAS DE ATRAS SE ESTIRAN LO QUE EL CUERPO SUBE, asi que siguen
        // APOYADAS mientras la arana se encabrita. Medido, con la tibia en
        // −2,01 los cuatro pies quedaban a 46 cm del piso —el grupo sube 0,42—
        // o sea el bicho flotando de atras. El angulo sale de la cuenta: con la
        // rodilla en 2,778 hace falta bajar 3,198 para dejar el pie en −0,42
        // local, y 3,2·sin(0,96+t) = −3,198 da t = −2,50.
        p.fPiv.rotation.z = 0.96 + Math.sin(elapsed * 13 + i) * 0.05;
        p.tPiv.rotation.z = lerp(-2.01, -2.50, kk);
        p.piv.rotation.y = p.az;
      }
    }
    // los colmillos se abren y bajan: es lo unico que queda en el centro del
    // cuadro cuando las patas ya se fueron por los bordes
    // Y LOS COLMILLOS TAMBIEN SE ABREN Y NO SE CIERRAN. El Euler es XYZ, o sea
    // R = Rx·Ry·Rz: la Z se aplica PRIMERO, en el marco del colmillo, y con la
    // X en 2,24 rad la punta termina yendo hacia −x cuando z es positivo.
    // Medido asi, el signo anterior hacia converger los dos colmillos sobre el
    // eje en vez de separarlos, al reves de lo que dice este comentario.
    ARA.colmillos.forEach(function (c) {
      c.rotation.x = Math.PI - 0.35 - 0.55 * kk;
      c.rotation.z = c.userData.afuera * 0.45 * kk;
    });
    // y se encabrita: sube el cuerpo entero en vez de inclinarlo, porque
    // inclinar el grupo alrededor de su origen mete las patas traseras un metro
    // bajo el piso
    ARA.g.position.y = ARA_Y + kk * 0.42;
    // y su luz roja BAJA en vez de subir: es una luz de ambiente para verla
    // doblar una esquina a diez metros, y a dos la tine de rojo entera
    ARA.luz.intensity = 1.5 + Math.sin(elapsed * 31) * 0.4;
  }
"""

JS += r"""
  // ==================================================================
  // LAS TELAS
  // ==================================================================
  // Una tela es una MANCHA EN EL PISO con radio, no una malla contra la que se
  // choque: lo que hace es clavar al jugador tres segundos, y para eso alcanza
  // un circulo. Probar contra la geometria seria un rayo por cuadro para
  // averiguar algo que un centro y un radio ya dicen.
  const stTelas = [];
  let stTelaTex = null;
  {
    if (window.__PB_N6 && window.__PB_N6.tela) {
      const img = new Image();
      img.onload = function () {
        const t = new THREE.Texture(img);
        t.needsUpdate = true;
        if (THREE.sRGBEncoding) t.encoding = THREE.sRGBEncoding;
        stTelaTex = t;
        stTelas.forEach(function (w) { w.mesh.material.map = t; w.mesh.material.needsUpdate = true; });
      };
      img.src = 'data:image/webp;base64,' + window.__PB_N6.tela;
    }
  }
  function stNuevaTela(x, z, r, vertical, rotY) {
    const mat = new THREE.MeshBasicMaterial({
      color: 0xeef4f8, map: stTelaTex, transparent: true, opacity: 0.82,
      depthWrite: false, side: THREE.DoubleSide
    });
    // alphaTest y no transparencia pura para el vano: una tela de puerta
    // transparente no escribe profundidad y se dibuja en el orden equivocado
    // contra el marco
    if (vertical) { mat.alphaTest = 0.22; mat.depthWrite = true; }
    const g = vertical ? new THREE.PlaneGeometry(r * 2, 2.9)
                       : new THREE.CircleGeometry(r, 20);
    const m = new THREE.Mesh(g, mat);
    if (vertical) { m.position.set(x, 1.45, z); m.rotation.y = rotY || 0; }
    else { m.rotation.x = -Math.PI / 2; m.position.set(x, 0.035, z); }
    storeGroup.add(m);
    const w = { x: x, z: z, r: r, mesh: m, usada: false, vertical: !!vertical };
    stTelas.push(w);
    return w;
  }
  // LOS SITIOS DONDE UNA TELA SERIA UN PEAJE Y NO UN MECANISMO. La arana teje
  // donde esta parada, y desde que el deposito y el bano tienen nodos ese sitio
  // puede caer justo encima de una parte —el nodo 26 esta a 1,2 m del pan— o de
  // la bandeja, donde el jugador tiene que volver CUATRO veces. Es el mismo
  // defecto que ya tenia la tela del piso de la cocina a 58 cm de la carne, y
  // ahora se evita por construccion en vez de moviendo una constante.
  const stNoTela = stPartes.map(function (p) { return [p.x, p.z]; })
    .concat([[ST_BANDEJA.x, ST_BANDEJA.z], [ST_SALIDA.x, ST_SALIDA.z]]);
  function stSitioDeTela(x, z) {
    for (let i = 0; i < stNoTela.length; i++) {
      if (Math.hypot(x - stNoTela[i][0], z - stNoTela[i][1]) < 3.4) return false;
    }
    return true;
  }

  function stTelasIniciales() {
    // Y SE SUELTAN LOS BUFFERS. `remove` saca del grafo pero deja la geometria y
    // el material en la GPU: cada vez que la arana te agarraba, el reinicio
    // dejaba seis geometrias y seis materiales huerfanos, y una partida con
    // veinte muertes son ciento veinte. La textura de la tela NO se toca: es una
    // sola, compartida por todas.
    while (stTelas.length) {
      const w = stTelas.pop();
      storeGroup.remove(w.mesh);
      w.mesh.geometry.dispose();
      w.mesh.material.dispose();
    }
    // ── DOS VANOS Y NO CUATRO, Y ES UNA CUENTA DEL RECORRIDO ──
    // El local tiene seis ambientes unidos por CINCO vanos, y habia tela en
    // cuatro de los cinco: o sea que casi todo paso de una sala a otra costaba
    // tres segundos. Y no se cruzan una vez — las cuatro partes se juntan de a
    // una y hay que volver a la bandeja CUATRO VECES, asi que el mismo vano se
    // pasa seis u ocho veces por partida. Eso deja de ser un mecanismo y pasa a
    // ser un peaje, que es exactamente lo que este mismo archivo ya habia
    // anotado sobre la tela que estaba encima de la carne.
    //
    // Quedan las dos que hacen falta: la del mostrador, que es el primer paso de
    // la partida y garantiza que el jugador se cruce con el mecanismo antes de
    // que la arana lo elija por el; y la del deposito, que es el ambiente mas
    // profundo. La de la cocina y la de la camara se van.
    stNuevaTela(10, 3.05, 1.9, true, 0);          // el paso del mostrador
    stNuevaTela(-9, 19.5, 2.0, true, Math.PI / 2);// deposito
    // Y UNA SOLA EN EL PISO. No encima de una parte: la que estaba en
    // (-14 · 6,5) caia a 58 cm de la carne y agacharse a juntarla te dejaba
    // pegado tres segundos SIEMPRE.
    stNuevaTela(-19, 7.2, 1.7);                   // el piso de la cocina
  }

  // ---- el grafo por el que anda la arana ----
  // Con una linea recta al jugador se clava en la primera pared. El local tiene
  // seis ambientes unidos por cinco vanos, asi que el camino se resuelve con
  // trece nodos y un BFS: entre dos nodos vecinos SIEMPRE hay linea limpia, por
  // construccion, y eso es lo que hace que no haga falta probar contra paredes.
  // LA PROMESA DEL GRAFO ES QUE ENTRE DOS NODOS VECINOS HAY LINEA LIMPIA, y
  // cuatro de los doce arcos no la cumplian —o sea que la promesa era falsa y
  // la arana atravesaba paredes en cuatro sitios distintos—:
  //   · 7-8, de (1,5 · 15,5) a (18 · 16), cruzaba EL BANO ENTERO: sus dos
  //     paredes y los tres tabiques. El pasillo trasero no pasa por ahi: el
  //     bano ocupa x 5..13 de z 12 a 18, y el paso libre es por z 18..21,7.
  //   · 1-2 cruzaba la estanteria alta de la cocina (2,2 m).
  //   · 4-5 cruzaba el estante del medio de la camara (1,9 m).
  //   · 11-12 cruzaba dos estanterias del deposito (2,4 m).
  // Diecisiete nodos, y los diecisiete arcos verificados uno por uno contra
  // cada caja del local. De paso la camara gana sus dos pasillos, asi que la
  // arana llega hasta el queso por donde se camina y no por encima de un
  // estante.
  const ST_NODO_FIJO = /(\?|&)nodofijo/.test(location.search);
  const ST_NODOS = [
    [0, -7],        //  0 salon
    [10, 3.05],     //  1 el paso del mostrador
    [9, 7.0],       //  2 cocina, lado este
    [-12, 7.5],     //  3 cocina, lado oeste
    [13, 7.0],      //  4 la puerta de la camara
    [14, 6.4],      //  5 camara, boca del pasillo sur
    [20, 6.4],      //  6 camara, fondo del pasillo sur
    [14, 8.6],      //  7 camara, boca del pasillo norte
    [20, 8.6],      //  8 camara, fondo del pasillo norte
    [1.5, 12],      //  9 la puerta al pasillo trasero
    [1.5, 15.5],    // 10 pasillo trasero, tramo oeste
    [1.5, 19.8],    // 11 pasillo del fondo, oeste
    [18, 19.8],     // 12 pasillo del fondo, este  (la salida esta al lado)
    [18, 16],       // 13 pasillo este
    [13, 13.2],     // 14 la puerta del bano
    [9.8, 13.2],    // 15 bano, corredor de entrada
    [-6, 19.8],     // 16 camino al deposito
    [-11.45, 20.5], // 17 deposito, pasillo del norte, boca del 3er corredor
    // LOS DIEZ DE ABAJO SON PARA QUE LA ARANA NO CRUCE MUEBLES EN EL ULTIMO
    // TRAMO. Cuando el nodo mas cercano a ella y el mas cercano al jugador son
    // EL MISMO, va derecho al jugador — y ahi el grafo ya no protege nada:
    // medido, con el jugador metido en el compartimiento del oeste del bano
    // (6 · 15) el tramo recto desde el corredor cruzaba un tabique, y con el
    // jugador en el primer pasillo del deposito (-18,6 · 16) cruzaba una
    // estanteria de 2,4 m. Un nodo por bolsillo alcanzable arregla la clase
    // entera de defecto sin tocar el algoritmo.
    [7.6, 13.2],    // 18 bano, corredor frente al compartimiento oeste
    [7.6, 15.7],    // 19 bano, compartimiento oeste
    [9.8, 15.7],    // 20 bano, compartimiento del medio (donde esta la TAPA)
    [11.95, 13.2],  // 21 bano, corredor frente al compartimiento este
    [11.95, 15.7],  // 22 bano, compartimiento este
    [-15.05, 20.5], // 23 deposito, pasillo del norte, boca del 2do corredor
    [-18.65, 20.5], // 24 deposito, pasillo del norte, boca del 1er corredor
    [-11.45, 16],   // 25 deposito, 3er corredor
    [-15.05, 16],   // 26 deposito, 2do corredor (donde esta el PAN)
    [-18.65, 16]    // 27 deposito, 1er corredor
  ];
  const ST_ARCOS = [[0,1],[1,2],[2,3],[2,4],[4,5],[5,6],[5,7],[7,8],[2,9],
                    [9,10],[10,11],[11,12],[12,13],[13,14],[14,15],[11,16],[16,17],
                    [15,18],[18,19],[15,20],[15,21],[21,22],
                    [17,23],[23,24],[17,25],[23,26],[24,27]];
  const ST_VEC = ST_NODOS.map(function () { return []; });
  ST_ARCOS.forEach(function (a) { ST_VEC[a[0]].push(a[1]); ST_VEC[a[1]].push(a[0]); });
  function stNodoDe(x, z) {
    let mej = 0, d = 1e9;
    for (let i = 0; i < ST_NODOS.length; i++) {
      const dd = (ST_NODOS[i][0] - x) * (ST_NODOS[i][0] - x) + (ST_NODOS[i][1] - z) * (ST_NODOS[i][1] - z);
      if (dd < d) { d = dd; mej = i; }
    }
    return mej;
  }
  // LA TABLA DE SALTOS SE CALCULA UNA VEZ, no un BFS por cuadro. El que habia
  // corria en cada vuelta del bucle y alojaba tres arrays cada vez —dos
  // Array(n).fill() y una cola con shift(), que en un array es O(n)— o sea
  // basura para el recolector sesenta veces por segundo para contestar algo que
  // NO CAMBIA NUNCA: el grafo es fijo desde que se construye el local. Con
  // veintiocho nodos son 784 bytes y una sola pasada al arrancar.
  const ST_SIG = ST_NODOS.map(function () { return new Int16Array(ST_NODOS.length); });
  {
    const N = ST_NODOS.length;
    for (let s0 = 0; s0 < N; s0++) {
      const prev = new Int16Array(N).fill(-1), vis = new Uint8Array(N);
      const cola = [s0]; vis[s0] = 1;
      for (let qi = 0; qi < cola.length; qi++) {
        const nn = cola[qi];
        for (let j = 0; j < ST_VEC[nn].length; j++) {
          const m = ST_VEC[nn][j];
          if (!vis[m]) { vis[m] = 1; prev[m] = nn; cola.push(m); }
        }
      }
      for (let d0 = 0; d0 < N; d0++) {
        if (d0 === s0 || !vis[d0]) { ST_SIG[s0][d0] = d0; continue; }
        let c = d0, guarda = 0;
        while (prev[c] !== s0 && prev[c] >= 0 && guarda++ < N) c = prev[c];
        ST_SIG[s0][d0] = prev[c] === s0 ? c : d0;
      }
    }
  }
  function stSiguienteNodo(desde, hasta) { return ST_SIG[desde][hasta]; }
"""

JS += r"""
  // ==================================================================
  // LOGICA DEL NIVEL 6
  // ==================================================================
  const stHud = document.getElementById('store-hud');
  const stChip = document.getElementById('st-chip');
  const stTrap = document.getElementById('st-trap');
  const ST = {
    tengo: {}, puestas: 0, hecho: false,
    atrapado: 0, grace: 0, msgCd: 0
  };

  function stPintaHud() {
    let n = 0;
    ST_ORDEN.forEach(function (id) { if (ST.tengo[id]) n++; });
    if (ST.hecho) pbUI(stChip, 'partesLista');
    else pbUI(stChip, 'partes', n + ST.puestas);
    for (let i = 0; i < 4; i++) {
      const el = document.getElementById('st-p' + i);
      const id = ST_ORDEN[i];
      el.className = i < ST.puestas ? 'puesta' : (ST.tengo[id] ? 'tengo' : '');
      if (i === ST.puestas && !ST.hecho) el.className += ' toca';
    }
  }

  function resetStore(silent) {
    ST.tengo = {}; ST.puestas = 0; ST.hecho = false;
    ST.atrapado = 0; ST.msgCd = 0;
    // GRACIA AL EMPEZAR. Sin esto, reaparecer con la arana encima es una muerte
    // que nadie pudo evitar — la misma leccion que costo una vuelta en LEMI.
    ST.grace = 5;
    stPartes.forEach(function (p) {
      p.tomada = false;
      p.g.visible = true; p.halo.visible = true;
      p.g.position.set(p.x, p.base, p.z);
    });
    // lo mismo con la hamburguesa a medio armar: cada parte puesta es un grupo
    // con geometria propia, y hasta cuatro por vida. Los materiales son
    // compartidos (stMatPan, stMatCarne...) y no se sueltan.
    while (stPila.length) {
      const m = stPila.pop();
      storeGroup.remove(m);
      m.traverse(function (o) { if (o.geometry) o.geometry.dispose(); });
    }
    stSalida.group.visible = false;
    stTelasIniciales();
    ARA.estado = 'ronda';
    // Y EN REPOSO. Sin esto la vida nueva arrancaba con la velocidad del agarron
    // —el lerp tarda un segundo en bajar de 5,0 a 2,2— o sea con la arana
    // rondando a velocidad de caza, y con la luz roja en 1,5 que le dejo el
    // grito hasta el primer cuadro de araPaso.
    ARA.cazaT = 0; ARA.tejeCd = 16; ARA.vel = 0; ARA.fase = 0;
    ARA.nodo = -1; ARA.sig = -1;   // el camino se replanea desde donde reaparece
    ARA.luz.intensity = 0.18;
    // CON 0 REAPARECIA HUNDIDA: se construye en ARA_Y —la caja envolvente da
    // negativo con el grupo en cero— y el reinicio lo pisaba, asi que la
    // primera vida la tenia apoyada y todas las demas enterradas hasta el
    // tobillo. El numero vive en un solo sitio.
    ARA.g.position.set(-16, ARA_Y, 8);
    ARA.g.rotation.set(0, 0, 0);
    ARA.wp.set(-12, 0, 7.5);
    ARA.g.visible = true;
    stTrap.style.display = 'none';
    // LO QUE DEJABA PUESTO EL SCREAMER. resetStore no pasa por hideAllLevels
    // —solo lo llaman el agarron y el arranque del nivel— asi que el foco del
    // susto, la flecha que apunta a la salida, la viñeta y la cercania se
    // quedaban encendidos en la vida siguiente. Los otros cinco reinicios ya
    // hacen exactamente esto.
    hideArrow();
    flashSpot.intensity = 0;
    flashFill.intensity = 0;
    entityProximity = 0;
    shakeAmount = 0;
    vignetteEl.style.opacity = '0';
    // Y SE VUELVE A LA ENTRADA, como en los otros cinco niveles. Sin esto el
    // reinicio te deja parado donde la arana te agarro: medido, uno reaparecia
    // ENCIMA de la parte que acababa de perder y la volvia a juntar al cuadro
    // siguiente —el reinicio corria y no se notaba—, y ademas con el bicho a
    // medio metro.
    player.position.set(0, 0, -13);
    yaw = 0; lastYaw = 0; pitch = 0;
    stamina = 100; slowT = 0;
    stPintaHud();

    if (!silent) showToast('El local vuelve a empezar. La bandeja esta vacia otra vez.', 4600);
  }

  function enterStore() {
    resetStore(true);
    gameState = 'store';
    hideAllLevels();
    storeGroup.visible = true;
    setEnvironment('store');
    player.position.set(0, 0, -13);
    groundY = 0;
    yaw = 0; lastYaw = 0; pitch = 0;
    obstacles = stObs;
    boxObstacles = stBoxes;
    boundary = ST_BOUNDS;
    boundaryType = 'box';
    stHud.style.display = 'flex';
    hideArrow();
    showToast('Un local de comida rapida. Junta las 4 partes, armalas EN ORDEN sobre la bandeja y sali por atras. No pises las telas.', 7200);
    transitioning = false;
  }
  function transitionToStore() { fadeTo(enterStore); }

  // ---- la arana, cuadro a cuadro ----
  function araPaso(delta, elapsed) {
    const px = player.position.x, pz = player.position.z;
    const dx = px - ARA.g.position.x, dz = pz - ARA.g.position.z;
    const dist = Math.hypot(dx, dz);

    // el modo caza tambien se apaga solo: una arana que te persigue para siempre
    // convierte el nivel en una carrera y no en una busqueda
    if (ARA.cazaT > 0) { ARA.cazaT -= delta; if (ARA.cazaT <= 0 && !ST.hecho) ARA.estado = 'ronda'; }
    // ...salvo cuando la hamburguesa ya esta armada: ahi el nivel ES la huida
    if (ST.hecho) ARA.estado = 'caza';

    // te huele de cerca aunque no hayas pisado una tela
    if (ST.grace <= 0 && dist < 11 && ARA.estado === 'ronda') {
      ARA.estado = 'caza'; ARA.cazaT = 9;
    }

    const objetivo = ARA.estado === 'caza' ? { x: px, z: pz } : { x: ARA.wp.x, z: ARA.wp.z };
    const nodoB = stNodoDe(objetivo.x, objetivo.z);
    if (ARA.nodo < 0) ARA.nodo = stNodoDe(ARA.g.position.x, ARA.g.position.z);
    // Y SI LA MOVIERON, EL CAMINO SE SUELTA DONDE LA MOVIERON, no con un umbral
    // de distancia: el arco mas largo del local mide 21 m —del 2 al 3, la
    // cocina— asi que cualquier umbral que no la moleste caminando tampoco
    // atrapa un teletransporte corto. Los dos unicos sitios que la mueven de
    // golpe son `resetStore` y la sonda, y los dos ponen `ARA.nodo = -1`.
    // EL CONTROL DE LA VUELTA: `?nodofijo` deduce el nodo de la posicion en
    // cada cuadro, que es lo que se hacia antes. Sirve para comprobar que la
    // sonda DETECTA el atasco y no solo aprueba el arreglo.
    if (ST_NODO_FIJO) { ARA.nodo = stNodoDe(ARA.g.position.x, ARA.g.position.z); ARA.sig = -1; }
    // SE COMPROMETE A UN NODO Y NO LO SUELTA HASTA LLEGAR. Mientras hay un
    // salto pendiente el rumbo no se recalcula, asi que cruzar la frontera
    // entre dos nodos no puede dar vuelta la marcha; y al llegar se ADOPTA ese
    // nodo, o sea que el proximo salto se planea desde un sitio del grafo y no
    // desde una posicion intermedia. El radio de llegada (0,6 m) es menos de la
    // mitad del arco mas corto que hay (1,17 m entre el 4 y el 5), asi que no
    // puede saltearse un nodo.
    if (ARA.sig >= 0) {
      const sx = ST_NODOS[ARA.sig][0], sz = ST_NODOS[ARA.sig][1];
      if (Math.hypot(sx - ARA.g.position.x, sz - ARA.g.position.z) < 0.6) {
        ARA.nodo = ARA.sig; ARA.sig = -1;
      }
    }
    // y un salto A SI MISMO seria un lazo de cero metros que no termina nunca:
    // solo puede pasar con la tabla rota, y prefiero que la arana camine
    // derecho un tramo antes que se quede clavada otra vez.
    if (ARA.sig < 0 && ARA.nodo !== nodoB) {
      const sg = stSiguienteNodo(ARA.nodo, nodoB);
      if (sg >= 0 && sg !== ARA.nodo) ARA.sig = sg;
    }
    let metaX, metaZ;
    if (ARA.sig < 0) { metaX = objetivo.x; metaZ = objetivo.z; }
    else { metaX = ST_NODOS[ARA.sig][0]; metaZ = ST_NODOS[ARA.sig][1]; }

    const vx = metaX - ARA.g.position.x, vz = metaZ - ARA.g.position.z;
    const d = Math.hypot(vx, vz) || 1;
    // EL RUMBO SE CONGELA CUANDO LA META ESTA ENCIMA. Al pasar por un nodo
    // intermedio `d` cae casi a cero un cuadro antes de que el BFS entregue el
    // siguiente, y ahi vx/d y vz/d son ruido: la arana giraba de golpe y
    // volvia. Por debajo de 35 cm se sigue con el rumbo que traia.
    const rumboVale = d > 0.35;
    // 5,0 contra 4,3 de caminar y 7,7 de correr: caminando NO se le gana y
    // corriendo si. Esa es toda la tension del nivel, y es una resta.
    const velObj = ARA.estado === 'caza' ? 5.0 : 2.2;
    ARA.vel = lerp(ARA.vel, velObj, Math.min(delta * 3, 1));
    ARA.g.position.x += (vx / d) * ARA.vel * delta;
    ARA.g.position.z += (vz / d) * ARA.vel * delta;
    ARA.g.position.y = ARA_Y;

    if (rumboVale) {
      const rumbo = Math.atan2(vx, vz);
      let dr = rumbo - ARA.g.rotation.y;
      while (dr > Math.PI) dr -= Math.PI * 2;
      while (dr < -Math.PI) dr += Math.PI * 2;
      ARA.g.rotation.y += dr * Math.min(delta * 4.5, 1);
    }

    ARA.fase += delta * (2.6 + ARA.vel * 1.35);
    araPose(ARA.fase, ARA.vel);
    ARA.luz.intensity = ARA.estado === 'caza' ? 0.9 + Math.sin(elapsed * 9) * 0.25 : 0.18;

    if (ARA.estado === 'ronda') {
      if (Math.hypot(ARA.g.position.x - ARA.wp.x, ARA.g.position.z - ARA.wp.z) < 2.2) {
        // Y NO PUEDE SORTEAR EL QUE YA TIENE: cayendo en el mismo nodo la
        // condicion se cumple otra vez al cuadro siguiente y la arana se queda
        // sorteando en el sitio hasta que la suerte le da otro.
        let k2 = Math.floor(Math.random() * (ST_NODOS.length - 1));
        for (let t2 = 0; t2 < ST_NODOS.length; t2++) {
          const cand = ST_NODOS[(k2 + t2) % ST_NODOS.length];
          if (Math.abs(cand[0] - ARA.wp.x) > 0.01 || Math.abs(cand[1] - ARA.wp.z) > 0.01) {
            ARA.wp.set(cand[0], 0, cand[1]);
            break;
          }
        }
      }
      ARA.tejeCd -= delta;
      // Y NO LA TEJE ENCIMA DEL JUGADOR. Durante los cinco segundos de gracia
      // la arana sigue en ronda aunque este al lado, asi que podia dejar una
      // tela bajo los pies: tres segundos clavado por algo que aparecio debajo
      // no es una trampa, es un castigo sin aviso.
      // EL TOPE BAJA DE DOCE A SIETE Y EL RITMO SE ESTIRA. Doce telas en un
      // local de 47 x 38 m es una cada ciento cincuenta metros cuadrados, y
      // tejiendo cada 11-17 s se llegaba al tope en menos de tres minutos —
      // antes de terminar de juntar las cuatro partes. Con siete y cada 18-26 s,
      // la ultima aparece pasados los dos minutos y medio y el local no se
      // termina de tapar. Ojo: las USADAS siguen contando para el tope, asi que
      // pisar telas hace que la arana teja menos, no mas.
      if (ARA.tejeCd <= 0 && stTelas.length < 7 && dist > 7 &&
          stSitioDeTela(ARA.g.position.x, ARA.g.position.z)) {
        ARA.tejeCd = rand(18, 26);
        stNuevaTela(ARA.g.position.x, ARA.g.position.z, rand(1.3, 1.9));
      }
    }
    return dist;
  }

  function updateStoreLogic(delta, elapsed) {
    if (ST.grace > 0) ST.grace -= delta;
    if (ST.msgCd > 0) ST.msgCd -= delta;

    // el tubo que parpadea
    stLuces.forEach(function (l) {
      l.luz.intensity = l.parpadea
        ? l.base * (Math.sin(elapsed * 17) > 0.72 ? 0.12 : 1)
        : l.base;
    });

    const dist = araPaso(delta, elapsed);

    // ---- las telas ----
    if (ST.atrapado > 0) {
      ST.atrapado -= delta;
      stTrap.style.display = 'block';
      if (ST.atrapado <= 0) { stTrap.style.display = 'none'; showToast('Te soltaste.', 1400); }
    } else {
      for (let i = 0; i < stTelas.length; i++) {
        const w = stTelas[i];
        if (w.usada) continue;
        if (Math.hypot(player.position.x - w.x, player.position.z - w.z) < w.r * 0.8) {
          w.usada = true;
          w.mesh.material.opacity = 0.26;
          ST.atrapado = 3;
          // Y ESTO ES EL MECANISMO ENTERO: quedar pegado no mata, lo que mata es
          // que la arana se entera. Sin este renglon la tela seria una molestia.
          ARA.estado = 'caza'; ARA.cazaT = 12;
          stTrap.style.display = 'block';
          showToast('Telarana. Estas pegado 3 segundos y te oyo.', 2600);
          break;
        }
      }
    }

    // ---- juntar las partes ----
    stPartes.forEach(function (p) {
      if (p.tomada) return;
      p.g.position.y = p.base + Math.sin(elapsed * 1.6 + p.x) * 0.06;
      p.g.rotation.y += delta * 0.5;
      if (Math.hypot(player.position.x - p.x, player.position.z - p.z) < 2.2) {
        p.tomada = true;
        p.g.visible = false; p.halo.visible = false;
        ST.tengo[p.id] = true;
        stPintaHud();
        showToast(ST_NOMBRE[p.id] + ' en la bandeja de mano.', 2000);
      }
    });

    // ---- la bandeja: se arma EN ORDEN ----
    if (!ST.hecho) {
      const db = Math.hypot(player.position.x - ST_BANDEJA.x, player.position.z - ST_BANDEJA.z);
      window.__stBandejaHalo.material.opacity = db < 3.5 ? 0.55 : 0.28;
      if (db < 2.3) {
        const toca = ST_ORDEN[ST.puestas];
        if (ST.tengo[toca]) {
          delete ST.tengo[toca];
          const m = stFormaParte(toca);
          m.position.set(ST_BANDEJA.x, 1.26 + ST.puestas * 0.12, ST_BANDEJA.z);
          storeGroup.add(m);
          stPila.push(m);
          ST.puestas++;
          stPintaHud();
          if (ST.puestas === 4) {
            ST.hecho = true;
            stSalida.group.visible = true;
            ARA.estado = 'caza'; ARA.cazaT = 999;
            showToast('Hamburguesa armada. La puerta de atras se abrio y ella lo sabe: CORRE.', 5200);
          } else {
            showToast(ST_NOMBRE[toca] + ' puesta. Ahora va ' + ST_NOMBRE[ST_ORDEN[ST.puestas]] + '.', 2200);
          }
        } else if (ST.msgCd <= 0) {
          ST.msgCd = 3;
          showToast('Falta ' + ST_NOMBRE[toca] + ': es la que va ahora.', 2400);
        }
      }
    } else {
      pointArrowAt(ST_SALIDA.x, ST_SALIDA.z - 1.4, 3);
      const pulso = 0.9 + Math.sin(elapsed * 2) * 0.1;
      stSalida.haloMat.opacity = 0.7 * pulso;
      stSalida.poolMat.opacity = 0.4 * pulso;
      if (!transitioning &&
          Math.hypot(player.position.x - ST_SALIDA.x, player.position.z - ST_SALIDA.z) < 2.2) {
        transitioning = true;
        endTitle.innerHTML = '&#127828; Saliste del local';
        endText.textContent = 'Armaste la hamburguesa entera con esa cosa pisandote los talones y cruzaste la puerta de servicio. Fin de esta version de la demo.';
        transitionToEnd();
        return;
      }
    }

    // ---- te alcanza ----
    // 2,6 Y NO 1,6, y es la misma resta que corrigio el encuadre del susto:
    // `dist` se mide contra el ORIGEN del grupo y la cara vive 1,44 m mas
    // adelante. Con 1,6 los ultimos cuadros antes del agarron tenian el ojo del
    // jugador A DIECISEIS CENTIMETROS de los colmillos, o sea dentro de la
    // cabeza. Con 2,6 la cara queda a 1,16 m: se ve venir.
    if (ST.grace <= 0 && dist < 2.6 && catchGuard <= 0 && !transitioning) {
      triggerScreamer('spider', ARA.g);
    }
    // LA CINTA SE DEGRADA CON LA CERCANIA, y eso ya lo hace el juego: este
    // numero alimenta el glitch del post. Con 1 - dist/16 la arana a cinco
    // metros metia 0,41 de glitch FIJO, y entonces la imagen se rompia justo
    // cuando hay que ver donde esta la cosa que te mata. Se topa en 0,55: se
    // siente que la cinta sufre y el bicho se sigue leyendo.
    entityProximity = Math.min(0.55, Math.max(0, 1 - dist / 13));
    // Y LA VIÑETA Y EL SACUDON, QUE ERAN LO QUE FALTABA. Los otros cinco
    // niveles escriben las dos todos los cuadros; el local no escribia ninguna,
    // asi que la unica manera de saber que la tenias detras era darte vuelta.
    // La viñeta va sobre el mismo numero, escalada aparte porque el tope de
    // 0,55 esta puesto para el glitch y no para el oscurecimiento.
    vignetteEl.style.opacity = String(clamp(entityProximity * 1.45, 0, 0.82));
    // SE ASIGNA Y NO SE ACUMULA CON max(): nadie pone shakeAmount en cero por
    // cuadro —cada nivel lo ESCRIBE una vez y ya— asi que un Math.max solo
    // puede subir, y el temblor de la tela se quedaba puesto para siempre.
    shakeAmount = entityProximity * 0.05 + (ST.atrapado > 0 ? 0.09 : 0);
  }
"""
