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
                     minZ: Math.min(z1, z2), maxZ: Math.max(z1, z2) });
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
    stMuro(13, 11.7, 23.7, 11.7);

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
    for (let i = 0; i < 7; i++) {
      const x = -19 + i * 6.3;
      stCaja(x - 2.6, -16.85, x + 2.6, -16.55, 0.9, 2.9, vidrio, true);
    }
    // mesas y sillas
    for (let fx = 0; fx < 6; fx++) {
      for (let fz = 0; fz < 3; fz++) {
        const x = -18 + fx * 7.2, z = -13.5 + fz * 5.2;
        stAdd(new THREE.CylinderGeometry(0.09, 0.09, 0.72, 8), stMatCromo, x, 0.36, z);
        stAdd(new THREE.BoxGeometry(1.5, 0.09, 1.5), stMatMesa, x, 0.74, z);
        stObs.push({ x: x, z: z, radius: 0.78 });
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
    for (let i = 0; i < 9; i++) {
      const franja = new THREE.MeshBasicMaterial({ color: i % 3 ? 0xffcf6a : 0xff8b4a });
      stCaja(-13.4 + i * 1.28, 2.79, -12.6 + i * 1.28, 2.83, 2.2 + (i % 3) * 0.28,
             2.32 + (i % 3) * 0.28, franja, true);
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
    stCaja(1, 4.2, 11, 5.0, 0, 2.2, stMatCromo);                 // estanteria alta
    for (let i = 0; i < 3; i++) stCaja(1, 4.2, 11, 5.0, 0.6 + i * 0.55, 0.66 + i * 0.55, stMatAcero, true);
  }

  // ---- camara frigorifica ----
  {
    const frio = new THREE.MeshStandardMaterial({ color: 0xc8d6dc, roughness: 0.55 });
    stCaja(13.3, 3.7, 23.4, 3.9, 0, ST_ALTO, frio, true);
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
      stCaja(x, 13, x + 1.1, 20.5, 0, 2.4, stMatCromo);
      for (let j = 0; j < 3; j++) stCaja(x, 13, x + 1.1, 20.5, 0.7 + j * 0.65, 0.76 + j * 0.65, stMatAcero, true);
      for (let j = 0; j < 6; j++) {
        stAdd(new THREE.BoxGeometry(0.85, 0.6, 0.7), stMatMesa,
              x + 0.55, 1.06 + (j % 3) * 0.65, 14 + Math.floor(j / 3) * 4.4);
      }
    }
  }

  // ---- banos ----
  {
    const loza = new THREE.MeshStandardMaterial({ color: 0xe6e6e2, roughness: 0.42 });
    for (let i = 0; i < 3; i++) {
      stMuro(6.5 + i * 2.2, 13, 6.5 + i * 2.2, 16.6, 2.2);
      stAdd(new THREE.BoxGeometry(0.5, 0.42, 0.6), loza, 7.6 + i * 2.2, 0.21, 13.6);
    }
    stCaja(5.4, 17.2, 12.6, 17.8, 0.75, 0.9, loza);      // piletas
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
    const amb = new THREE.HemisphereLight(0xb9c6d4, 0x30302c, 0.42);
    storeGroup.add(amb);
    stLuces.amb = amb;
  }
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
    const sitios = {
      pan: [-16.5, 17.2],     // deposito
      carne: [-13.5, 6.8],    // cocina, junto a la plancha
      queso: [18.5, 7.4],     // camara frigorifica
      tapa: [8.6, 14.4]       // banos
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
  const ARA = {
    g: new THREE.Group(),
    patas: [],
    estado: 'ronda',      // 'ronda' | 'caza' | 'teje' | 'come'
    vel: 0,
    fase: 0,
    wp: new THREE.Vector3(-16, 0, 8),
    tejeCd: 9,
    comeT: 0,
    aturdida: 0
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
    const ojoMat = new THREE.MeshBasicMaterial({ color: 0xff3a22 });
    const colmillo = new THREE.MeshStandardMaterial({ color: 0x1d1512, roughness: 0.35 });

    // cuerpo: cefalotorax chato y un abdomen mucho mas grande y alto. La
    // proporcion es lo que separa una arana de un bicho de seis patas: el
    // abdomen tiene que pesar.
    const cef = new THREE.Mesh(new THREE.SphereGeometry(0.78, 18, 12), quitina);
    cef.scale.set(1.15, 0.62, 1.0);
    cef.position.set(0, 1.62, 0.55);
    ARA.g.add(cef);
    const abd = new THREE.Mesh(new THREE.SphereGeometry(0.95, 18, 14), quitina);
    abd.scale.set(1.0, 0.92, 1.28);
    abd.position.set(0, 1.78, -1.25);
    ARA.g.add(abd);
    // pelos del abdomen: cuarenta conos cortos. Es lo mas barato que existe para
    // que una esfera deje de leerse a esfera.
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * Math.PI * 2, b = Math.random() * Math.PI;
      const pelo = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.34, 4), quitina);
      const r = 0.92;
      pelo.position.set(Math.sin(b) * Math.cos(a) * r, 1.78 + Math.cos(b) * r * 0.9,
                        -1.25 + Math.sin(b) * Math.sin(a) * r * 1.2);
      pelo.lookAt(pelo.position.x * 3, pelo.position.y + 1.2, pelo.position.z * 3);
      pelo.rotateX(Math.PI / 2);
      ARA.g.add(pelo);
    }
    // ocho ojos en dos filas, que es como los tiene de verdad
    for (let i = 0; i < 8; i++) {
      const fila = i < 4 ? 0 : 1;
      const k = i % 4;
      const o = new THREE.Mesh(new THREE.SphereGeometry(fila ? 0.10 : 0.14, 8, 6), ojoMat);
      o.position.set((k - 1.5) * (fila ? 0.26 : 0.32), 1.78 - fila * 0.2, 1.42);
      ARA.g.add(o);
      ARA.ojos = ARA.ojos || [];
      ARA.ojos.push(o);
    }
    // quelIceros y colmillos
    for (let s = -1; s <= 1; s += 2) {
      const q = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.1, 0.5, 7), juntura);
      q.position.set(s * 0.24, 1.42, 1.34);
      q.rotation.x = 0.5;
      ARA.g.add(q);
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.52, 6), colmillo);
      c.position.set(s * 0.24, 1.12, 1.5);
      c.rotation.x = Math.PI - 0.35;
      ARA.g.add(c);
      ARA.colmillos = ARA.colmillos || [];
      ARA.colmillos.push(c);
    }

    // ---- las ocho patas ----
    // Cada una: pivote en el cuerpo -> femur hacia AFUERA Y ARRIBA -> rodilla ->
    // tibia hacia abajo. Ese codo por encima del lomo es la silueta de arana; con
    // las patas rectas queda un insecto.
    const AZ = [0.55, 1.15, 1.95, 2.55];
    for (let i = 0; i < 8; i++) {
      const lado = i < 4 ? 1 : -1;
      const az = AZ[i % 4] * lado;
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

      ARA.patas.push({ piv: piv, fPiv: fPiv, tPiv: tPiv, az: az,
                       fase: (i % 2 === 0 ? 0 : Math.PI) + (i < 4 ? 0 : Math.PI) });
    }
    ARA.g.position.set(-16, 0.11, 8);
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
    ARA.g.children[0].position.y = 1.62 + Math.sin(t * 2) * 0.045 * (vel > 0.4 ? 1 : 0.3);
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
  function stTelasIniciales() {
    while (stTelas.length) { const w = stTelas.pop(); storeGroup.remove(w.mesh); }
    // LAS DE LOS VANOS SE PONEN DE ENTRADA, y no al azar: son las que garantizan
    // que el jugador se cruce con el mecanismo antes de que la arana lo elija
    // por el.
    stNuevaTela(10, 3.05, 1.9, true, 0);          // el paso del mostrador
    stNuevaTela(1.5, 12, 1.4, true, 0);           // cocina -> pasillo
    stNuevaTela(13, 7.2, 1.0, true, Math.PI / 2); // camara
    stNuevaTela(-9, 19.5, 2.0, true, Math.PI / 2);// deposito
    stNuevaTela(-14, 6.5, 1.7);                   // dos en el piso de la cocina
    stNuevaTela(4, 9.5, 1.5);
  }

  // ---- el grafo por el que anda la arana ----
  // Con una linea recta al jugador se clava en la primera pared. El local tiene
  // seis ambientes unidos por cinco vanos, asi que el camino se resuelve con
  // trece nodos y un BFS: entre dos nodos vecinos SIEMPRE hay linea limpia, por
  // construccion, y eso es lo que hace que no haga falta probar contra paredes.
  const ST_NODOS = [
    [0, -7], [10, 3.05], [6, 7.5], [-12, 7.5], [13, 7.2], [18, 7.5],
    [1.5, 12], [1.5, 15.5], [18, 16], [13, 13.5], [8.5, 15.5], [-6, 19.5], [-16, 18]
  ];
  const ST_ARCOS = [[0,1],[1,2],[2,3],[2,4],[4,5],[2,6],[6,7],[7,8],[8,9],[9,10],[7,11],[11,12]];
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
  function stSiguienteNodo(desde, hasta) {
    if (desde === hasta) return hasta;
    const prev = new Array(ST_NODOS.length).fill(-1);
    const vis = new Array(ST_NODOS.length).fill(false);
    const cola = [desde]; vis[desde] = true;
    while (cola.length) {
      const n = cola.shift();
      if (n === hasta) break;
      for (let i = 0; i < ST_VEC[n].length; i++) {
        const m = ST_VEC[n][i];
        if (!vis[m]) { vis[m] = true; prev[m] = n; cola.push(m); }
      }
    }
    if (!vis[hasta]) return desde;
    let c = hasta;
    while (prev[c] !== -1 && prev[c] !== desde) c = prev[c];
    return prev[c] === -1 ? hasta : c;
  }
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
    atrapado: 0, grace: 0, msgCd: 0, salidaAviso: false
  };

  function stPintaHud() {
    let n = 0;
    ST_ORDEN.forEach(function (id) { if (ST.tengo[id]) n++; });
    stChip.innerHTML = ST.hecho
      ? '&#127828; Lista &#183; sali por atras'
      : '&#127828; Partes ' + (n + ST.puestas) + '/4';
    for (let i = 0; i < 4; i++) {
      const el = document.getElementById('st-p' + i);
      const id = ST_ORDEN[i];
      el.className = i < ST.puestas ? 'puesta' : (ST.tengo[id] ? 'tengo' : '');
      if (i === ST.puestas && !ST.hecho) el.className += ' toca';
    }
  }

  function resetStore(silent) {
    ST.tengo = {}; ST.puestas = 0; ST.hecho = false;
    ST.atrapado = 0; ST.msgCd = 0; ST.salidaAviso = false;
    // GRACIA AL EMPEZAR. Sin esto, reaparecer con la arana encima es una muerte
    // que nadie pudo evitar — la misma leccion que costo una vuelta en LEMI.
    ST.grace = 5;
    stPartes.forEach(function (p) {
      p.tomada = false;
      p.g.visible = true; p.halo.visible = true;
      p.g.position.set(p.x, p.base, p.z);
    });
    while (stPila.length) { const m = stPila.pop(); storeGroup.remove(m); }
    stSalida.group.visible = false;
    stTelasIniciales();
    ARA.estado = 'ronda';
    ARA.cazaT = 0; ARA.comeT = 0; ARA.aturdida = 0; ARA.tejeCd = 11;
    ARA.g.position.set(-16, 0, 8);
    ARA.wp.set(-12, 0, 7.5);
    ARA.g.visible = true;
    stTrap.style.display = 'none';
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
    stampina();
    hideArrow();
    showToast('Un local de comida rapida. Junta las 4 partes, armalas EN ORDEN sobre la bandeja y sali por atras. No pises las telas.', 7200);
    transitioning = false;
  }
  function stampina() { stamina = 100; slowT = 0; }
  function transitionToStore() { fadeTo(enterStore); }

  // ---- la arana, cuadro a cuadro ----
  function araPaso(delta, elapsed) {
    const px = player.position.x, pz = player.position.z;
    const dx = px - ARA.g.position.x, dz = pz - ARA.g.position.z;
    const dist = Math.hypot(dx, dz);

    if (ARA.aturdida > 0) { ARA.aturdida -= delta; ARA.vel = 0; araPose(ARA.fase, 0); return dist; }

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
    const nodoA = stNodoDe(ARA.g.position.x, ARA.g.position.z);
    const nodoB = stNodoDe(objetivo.x, objetivo.z);
    let metaX, metaZ;
    if (nodoA === nodoB) { metaX = objetivo.x; metaZ = objetivo.z; }
    else {
      const n = stSiguienteNodo(nodoA, nodoB);
      metaX = ST_NODOS[n][0]; metaZ = ST_NODOS[n][1];
    }

    const vx = metaX - ARA.g.position.x, vz = metaZ - ARA.g.position.z;
    const d = Math.hypot(vx, vz) || 1;
    // 5,0 contra 4,3 de caminar y 7,7 de correr: caminando NO se le gana y
    // corriendo si. Esa es toda la tension del nivel, y es una resta.
    const velObj = ARA.estado === 'caza' ? 5.0 : 2.2;
    ARA.vel = lerp(ARA.vel, velObj, Math.min(delta * 3, 1));
    ARA.g.position.x += (vx / d) * ARA.vel * delta;
    ARA.g.position.z += (vz / d) * ARA.vel * delta;

    const rumbo = Math.atan2(vx, vz);
    let dr = rumbo - ARA.g.rotation.y;
    while (dr > Math.PI) dr -= Math.PI * 2;
    while (dr < -Math.PI) dr += Math.PI * 2;
    ARA.g.rotation.y += dr * Math.min(delta * 4.5, 1);

    ARA.fase += delta * (2.6 + ARA.vel * 1.35);
    araPose(ARA.fase, ARA.vel);
    ARA.luz.intensity = ARA.estado === 'caza' ? 0.9 + Math.sin(elapsed * 9) * 0.25 : 0.18;

    if (ARA.estado === 'ronda') {
      if (Math.hypot(ARA.g.position.x - ARA.wp.x, ARA.g.position.z - ARA.wp.z) < 2.2) {
        const n = ST_NODOS[Math.floor(Math.random() * ST_NODOS.length)];
        ARA.wp.set(n[0], 0, n[1]);
      }
      ARA.tejeCd -= delta;
      if (ARA.tejeCd <= 0 && stTelas.length < 12) {
        ARA.tejeCd = rand(11, 17);
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
      shakeAmount = Math.max(shakeAmount, 0.09);
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
    if (ST.grace <= 0 && dist < 1.6 && catchGuard <= 0 && !transitioning) {
      triggerScreamer('spider', ARA.g);
    }
    // LA CINTA SE DEGRADA CON LA CERCANIA, y eso ya lo hace el juego: este
    // numero alimenta el glitch del post. Con 1 - dist/16 la arana a cinco
    // metros metia 0,41 de glitch FIJO, y entonces la imagen se rompia justo
    // cuando hay que ver donde esta la cosa que te mata. Se topa en 0,55: se
    // siente que la cinta sufre y el bicho se sigue leyendo.
    entityProximity = Math.min(0.55, Math.max(0, 1 - dist / 13));
  }
"""
