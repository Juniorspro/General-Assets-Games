/* ══════════════════════════ MALLA DEL TERRENO ══════════════════════════
   Plano subdividido, desplazado por H(), con color por vértice y flatShading.
   Las caras planas son parte del look: con normales suavizadas el terreno se
   vuelve un globo de goma y se pierde el aire de maqueta. */
/* la malla acompaña al tamaño: 300 cuadros para 660 m son 2,2 m por cuadro,
   parecido al detalle de antes y sin dispararse en vértices */
const SEG = 300;
let terreno = null, agua = null;
function armaTerreno(){
  if (terreno){ escena.remove(terreno); terreno.geometry.dispose(); }
  const g = new T.PlaneGeometry(MITAD*2, MITAD*2, SEG, SEG);
  g.rotateX(-Math.PI/2);
  const p = g.attributes.position, n = p.count;
  const col = new Float32Array(n*3);
  const c = new T.Color();
  for (let i = 0; i < n; i++){
    const x = p.getX(i), z = p.getZ(i);
    const h = H(x, z);
    p.setY(i, h);
    /* la mezcla de color por altura y pendiente: arena abajo, pasto en lo
       llano, roca donde empina, y una variación de ruido para que no queden
       franjas planas de un solo verde */
    const s = pendiente(x, z);
    const v = fbm(x*0.03, z*0.03, 2, SEM+9);
    if (h < PLAYA){
      c.copy(PAL.arena).lerp(PAL.arena2, v);
    } else {
      c.copy(PAL.pasto).lerp(PAL.pasto2, v);
      c.lerp(PAL.pastoSec, cl((h-8)/26, 0, 1) * 0.5);
      c.lerp(PAL.arena, cl((PLAYA + 2.2 - h)/2.2, 0, 1));   /* borde de playa */
    }
    c.lerp(PAL.roca, cl((s - 0.42)/0.5, 0, 1));
    c.lerp(PAL.roca2, cl((s - 0.85)/0.5, 0, 1) * 0.7);
    col[i*3] = c.r; col[i*3+1] = c.g; col[i*3+2] = c.b;
  }
  g.setAttribute('color', new T.BufferAttribute(col, 3));
  g.computeVertexNormals();
  const m = new T.MeshLambertMaterial({ vertexColors: true, flatShading: true, map: texPasto });
  /* la textura se usa sólo como grano fino: el color lo pone el vértice */
  m.map.repeat.set(90, 90);
  m.onBeforeCompile = sh => {
    /* SE REEMPLAZA EL TROZO ENTERO, no se le agrega algo detrás: el nombre de la
       variable que declara `map_fragment` cambió entre versiones de three
       (`texelColor` antes, `sampledDiffuseColor` ahora) y apoyarse en él rompe
       el shader sin decir por qué. Acá se muestrea a mano y no se depende de
       ningún nombre interno. */
    sh.fragmentShader = sh.fragmentShader.replace(
      '#include <map_fragment>',
      `#ifdef USE_MAP
         /* el mapa aporta MOTEADO, no color: se centra en 1.0 y se atenúa, así
            el color sigue viniendo del vértice y la textura sólo da el grano */
         vec4 mota = texture2D(map, vMapUv);
         diffuseColor.rgb *= mix(vec3(1.0), mota.rgb * 1.9, 0.30);
       #endif`);
  };
  terreno = new T.Mesh(g, m);
  terreno.receiveShadow = true;
  escena.add(terreno);
}

/* ── el agua: plano con olas por vértice, dos azules y algo de transparencia ── */
function armaAgua(){
  if (agua){ escena.remove(agua); agua.geometry.dispose(); }
  const g = new T.PlaneGeometry(MITAD*2.9, MITAD*2.9, 60, 60);
  g.rotateX(-Math.PI/2);
  const col = new Float32Array(g.attributes.position.count*3);
  const c = new T.Color();
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++){
    const prof = cl((MAR - H(p.getX(i), p.getZ(i))) / 12, 0, 1);
    c.copy(PAL.agua).lerp(PAL.aguaHon, prof);
    col[i*3]=c.r; col[i*3+1]=c.g; col[i*3+2]=c.b;
  }
  g.setAttribute('color', new T.BufferAttribute(col, 3));
  const m = new T.MeshLambertMaterial({ vertexColors: true, flatShading: true,
    transparent: true, opacity: 0.86 });
  agua = new T.Mesh(g, m);
  agua.position.y = MAR;
  agua.receiveShadow = false;
  escena.add(agua);
  agua.userData.base = g.attributes.position.array.slice();
}

/* ══════════════════════════ VEGETACIÓN ══════════════════════════
   Tres especies de árbol, arbustos, rocas y matas de pasto. Todo va por
   InstancedMesh: un solo draw call por pieza, así entran miles sin que el
   teléfono se caiga. */
/* NADA DE `vertexColors` ACÁ. El color va POR INSTANCIA, y para eso three usa
   `instanceColor`, que es otra cosa: con `vertexColors:true` el shader además
   espera un atributo `color` en la geometría, y como las copas y los conos no
   lo tienen, leía basura y TODA la vegetación salía negra. Con `setColorAt` y
   sin `vertexColors` three define `USE_INSTANCING_COLOR` solo y multiplica bien. */
const matCorteza = new T.MeshLambertMaterial({ map: texCorteza, flatShading: true });
const matHoja    = new T.MeshLambertMaterial({ map: texHoja, flatShading: true });
const matRoca    = new T.MeshLambertMaterial({ map: texRoca, flatShading: true });

/* copa: un icosaedro achatado y deformado, para que no sean bolas perfectas.
   `chato` decide la silueta: 0,78 es la copa redonda de siempre y 0,34 es la
   copa de sombrilla de las acacias. */
function geoCopa(r, semilla, chato){
  const g = new T.IcosahedronGeometry(r, 1);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++){
    const x=p.getX(i), y=p.getY(i), z=p.getZ(i);
    const k = 0.82 + hash2((x*31)|0, (z*37)|0, semilla) * 0.42;
    p.setXYZ(i, x*k, y*k*(chato || 0.78), z*k);
  }
  g.computeVertexNormals();
  return g;
}
/* LA SOMBRILLA de la acacia: la copa chata, pero además CORTADA POR ABAJO.
   Una copa achatada a secas sigue siendo una lenteja y desde el suelo se le ve
   la panza redonda; lo que hace la silueta de acacia es que la base sea PLANA,
   como si el ramaje se abriera de golpe a una altura. Se aplasta contra un
   plano en vez de escalar, así los vértices de arriba no se mueven. */
function geoSombrilla(r, semilla){
  const g = geoCopa(r, semilla, 0.40);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++){
    const y = p.getY(i);
    if (y < -r*0.06) p.setY(i, -r*0.06 + (y + r*0.06)*0.18);
  }
  g.computeVertexNormals();
  return g;
}
/* fronda de palmera: una tira que se abre y cae, hecha con un plano curvado */
function geoFronda(largo, ancho){
  const seg = 7;
  const g = new T.PlaneGeometry(ancho, largo, 1, seg);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++){
    const y = p.getY(i);
    /* SE ACOTA A [0,1] Y NO ES POR PROLIJIDAD. `PlaneGeometry` arma la última
       fila como `seg * (largo/seg) - largo/2`, y eso en coma flotante da un
       pelo MENOS que -largo/2: `t` salía en -1.3e-16, y `Math.pow(negativo,
       2.1)` es NaN. Los dos vértices de la punta de cada fronda quedaban en
       NaN, la palmera se dibujaba rota y la consola tiraba «Computed radius is
       NaN» sin decir de qué. */
    const t = cl((y + largo/2) / largo, 0, 1);     /* 0 en la base, 1 en la punta */
    p.setZ(i, -Math.pow(t, 2.1) * largo * 0.42);   /* la caída */
    p.setX(i, p.getX(i) * (0.35 + Math.sin(t*Math.PI) * 0.95));
  }
  g.rotateX(-Math.PI/2);
  g.translate(0, 0, largo/2);
  g.computeVertexNormals();
  return g;
}

const GRUPOS = [];   /* para poder borrar todo al resembrar */
/* claros: alrededor del campamento y de cada sitio no crece nada, para que se
   llegue caminando y no haya que abrirse paso entre árboles */
let CLAROS = [];
function enClaro(x, z){
  for (const c of CLAROS) if (Math.hypot(x-c.x, z-c.z) < c.r) return true;
  return false;
}
function instanciar(geo, mat, lista, sombra){
  if (!lista.length) return null;
  const im = new T.InstancedMesh(geo, mat, lista.length);
  im.castShadow = !!sombra; im.receiveShadow = true;
  const m = new T.Matrix4(), q = new T.Quaternion(), e = new T.Euler();
  const blanco = new T.Color(1,1,1);
  lista.forEach((o, i) => {
    e.set(o.rx||0, o.ry||0, o.rz||0);
    q.setFromEuler(e);
    m.compose(new T.Vector3(o.x, o.y, o.z), q, new T.Vector3(o.sx||o.s||1, o.sy||o.s||1, o.sz||o.s||1));
    im.setMatrixAt(i, m);
    im.setColorAt(i, o.c || blanco);      /* crea `instanceColor` la primera vez */
  });
  im.instanceMatrix.needsUpdate = true;
  if (im.instanceColor) im.instanceColor.needsUpdate = true;
  im.computeBoundingSphere();
  escena.add(im); GRUPOS.push(im);
  return im;
}

/* variación de verde por instancia: sin esto el bosque es de plástico */
function verde(t){
  /* claridad alta a propósito: el material es Lambert y la cara en sombra ya
     baja sola. Si la base es oscura, el lado sombreado se va a negro. */
  return new T.Color().setHSL(0.255 + (Math.random()-0.5)*0.05,
                              0.62 + Math.random()*0.20,
                              0.46 + t*0.17 + Math.random()*0.08);
}

let pastoMesh = null, matPasto = null, floresMesh = null, matFlor = null;
const RELOJ = { value: 0 };

/* SOLTAR UN OBJETO Y TODO LO QUE CUELGA DE ÉL.
   Antes acá decía `g.geometry.dispose()` a secas, y en `GRUPOS` no hay sólo
   mallas: el campamento, el mojón, el círculo y el arco se guardan como Group,
   y un Group NO TIENE `geometry`. O sea que la primera vuelta de este bucle
   tiraba un TypeError, y como está adentro de un `forEach` dentro de una
   función async, el error se llevaba puesto el sembrado ENTERO sin decir nada:
   `window.__errs` quedaba vacío porque una promesa rechazada no dispara el
   evento `error` de la ventana.
   El efecto era que «Otra isla» devolvía una isla SIN UN SOLO ÁRBOL. Medido:
   96 llamadas de dibujo y 747k triángulos antes de tocar el botón, 23 y 282k
   después. Los materiales NO se sueltan: son compartidos y viven todo el juego.
   Verificado que la prueba detecta el defecto: con la línea vieja puesta, las
   cuentas después de resembrar son 23/282k; con ésta, 97/762k. */
function soltar(obj){
  /* LAS GEOMETRÍAS MARCADAS COMO COMPARTIDAS NO SE SUELTAN. Los cuatro
     personajes de la cinemática están hechos con la MISMA caja unitaria —una
     sola geometría para los cuarenta huesos—, así que soltar al primero dejaba
     sin geometría a los otros tres y al camello. Una geometría liberada no
     avisa: deja de dibujarse y ya. */
  obj.traverse(o => { if (o.geometry && !o.geometry.userData.compartida) o.geometry.dispose(); });
  escena.remove(obj);
}
function sembrar(prog){
  /* limpiar lo anterior */
  GRUPOS.forEach(soltar);
  GRUPOS.length = 0;
  if (pastoMesh){ escena.remove(pastoMesh); pastoMesh.geometry.dispose(); pastoMesh = null; }
  if (floresMesh){ escena.remove(floresMesh); floresMesh.geometry.dispose(); floresMesh = null; }

  const troncos=[], copas=[], somb=[], conos=[], frondas=[], cocos=[],
        arbustos=[], rocas=[], matas=[], flores=[], troncosCaidos=[];
  const geoTronco = new T.CylinderGeometry(0.34, 0.52, 1, 6, 1);
  geoTronco.translate(0, 0.5, 0);
  const geoCono = new T.ConeGeometry(1, 1, 7);
  geoCono.translate(0, 0.5, 0);
  const geoCopa1 = geoCopa(1, 11);
  const geoSomb = geoSombrilla(1, 23);
  const geoArb = geoCopa(1, 77);
  const geoRoca = new T.IcosahedronGeometry(1, 0);
  const geoFr = geoFronda(3.4, 0.85);
  const geoCoco = new T.IcosahedronGeometry(0.22, 0);
  const geoCaido = new T.CylinderGeometry(0.30, 0.38, 1, 6, 1);
  /* la flor: la misma cruz de dos planos que el pasto, así se ve de cualquier
     lado sin ser un cartel que gira */
  const geoFlor = (() => {
    const a = new T.PlaneGeometry(0.30, 0.30); a.translate(0, 0.15, 0);
    const b = a.clone(); b.rotateY(Math.PI/2);
    return mezclar([a, b]);
  })();

  /* un candidato cada tantos metros, aceptado según altura, pendiente y ruido:
     así los árboles se agrupan en bosques en vez de quedar sueltos y parejos */
  const N = 62000;
  for (let i = 0; i < N; i++){
    const x = (Math.random()*2-1)*MITAD*0.97;
    const z = (Math.random()*2-1)*MITAD*0.97;
    const h = H(x, z);
    if (h < PLAYA - 0.4 || h > 46) continue;
    if (enClaro(x, z)) continue;
    const s = pendiente(x, z);
    if (s > 0.62) continue;

    const bosque = fbm(x*0.011, z*0.011, 3, SEM+404);
    const playa = h < PLAYA + 2.4;
    const r = Math.random();

    if (playa){
      /* la costa es de palmeras, y con menos densidad */
      if (r < 0.030){
        const alto = 5.2 + Math.random()*4.2;
        const incl = (Math.random()-0.5)*0.30;
        troncos.push({ x, y:h, z, s:1, sx:0.62, sy:alto, sz:0.62,
                       rx:incl, rz:(Math.random()-0.5)*0.30, c:new T.Color(0.95,0.9,0.85) });
        const n = 7 + ((Math.random()*3)|0);
        const cy = h + alto*0.97, cx = x + Math.sin(incl)*alto*0.5;
        for (let k = 0; k < n; k++){
          frondas.push({ x:cx, y:cy, z, ry: (k/n)*6.283 + Math.random()*0.3,
                         rx: -0.30 - Math.random()*0.34, s: 0.85 + Math.random()*0.4,
                         c: verde(0.55) });
        }
        for (let k = 0; k < 3; k++)
          cocos.push({ x:cx + Math.cos(k*2.1)*0.42, y:cy-0.35, z: z + Math.sin(k*2.1)*0.42,
                       s:1, c:new T.Color('#7a5a2a') });
      } else if (r < 0.055){
        arbustos.push({ x, y:h, z, s: 0.5 + Math.random()*0.5, ry: Math.random()*6.28, c: verde(0.4) });
      }
    } else {
      const dens = 0.020 + bosque*0.085;
      if (r < dens){
        if (bosque > 0.58 && h > 16 && Math.random() < 0.6){
          /* CONÍFERAS ARRIBA, y ahora de CINCO pisos y no de tres. Con tres, los
             conos son gordos y separados y el árbol se lee a pila de sombreros;
             con cinco pisos delgados y superpuestos la silueta se cierra y queda
             el perfil dentado que tiene un pino visto de lejos, que es donde se
             lo ve. Cuestan lo mismo: son instancias de la misma malla. */
          const alto = 5.0 + Math.random()*6.4;
          troncos.push({ x, y:h, z, sx:0.5, sy:alto*0.42, sz:0.5, c:new T.Color(0.9,0.85,0.8) });
          const c = verde(0.18);
          const NP = 5;
          for (let k = 0; k < NP; k++){
            const t = k/NP;
            conos.push({ x, y: h + alto*(0.24 + t*0.60), z,
                         sx: (2.35-t*1.55)*(0.82+Math.random()*0.22),
                         sy: alto*0.30, sz: (2.35-t*1.55)*(0.82+Math.random()*0.22),
                         ry: Math.random()*6.28,
                         c: c.clone().offsetHSL(0, 0, (Math.random()-0.5)*0.05) });
          }
        } else if (Math.random() < 0.24){
          /* LA ACACIA: tronco alto y limpio con la copa abierta en sombrilla.
             Es la que le da variedad a la silueta del bosque —y la que le da
             sentido al bicho que anda por acá—: entre bolas y conos, una copa
             plana y ancha se reconoce desde el otro lado de la isla. */
          const alto = 5.6 + Math.random()*4.0;
          const anc = 2.6 + Math.random()*2.0;
          troncos.push({ x, y:h, z, sx:0.50, sy:alto, sz:0.50,
                         rz:(Math.random()-0.5)*0.16, c:new T.Color(1,0.94,0.86) });
          const c = verde(0.40);
          for (let k = 0; k < 2; k++){
            const a = Math.random()*6.283, rr = Math.random()*anc*0.20;
            somb.push({ x: x + Math.cos(a)*rr, y: h + alto - k*0.42,
                        z: z + Math.sin(a)*rr,
                        sx: anc*(0.85 + Math.random()*0.35), sy: anc*(0.8+Math.random()*0.4),
                        sz: anc*(0.85 + Math.random()*0.35),
                        ry: Math.random()*6.28,
                        c: c.clone().offsetHSL(0, 0, (Math.random()-0.5)*0.06) });
          }
        } else {
          /* frondoso: tronco y tres o cuatro copas superpuestas.
             EL RANGO DE TAMAÑOS SE ABRE, que es lo que faltaba: un bosque donde
             todos los árboles miden casi lo mismo se lee a plantación. Ahora hay
             arbolitos de tres metros y ejemplares de once. */
          const gigante = Math.random() < 0.11;
          const alto = gigante ? 8.5 + Math.random()*3.2 : 3.0 + Math.random()*4.2;
          const anc = (gigante ? 2.8 : 1.4) + Math.random()*1.6;
          troncos.push({ x, y:h, z, sx:0.62*(gigante?1.35:1), sy:alto, sz:0.62*(gigante?1.35:1),
                         rz:(Math.random()-0.5)*0.12, c:new T.Color(1,0.96,0.92) });
          const c = verde(0.32);
          const nb = (gigante ? 5 : 3) + ((Math.random()*2)|0);
          for (let k = 0; k < nb; k++){
            const a = Math.random()*6.283, rr = Math.random()*anc*0.5;
            copas.push({ x: x + Math.cos(a)*rr, y: h + alto + Math.random()*anc*0.42,
                         z: z + Math.sin(a)*rr, s: anc*(0.62 + Math.random()*0.5),
                         ry: Math.random()*6.28,
                         c: c.clone().offsetHSL(0, 0, (Math.random()-0.5)*0.07) });
          }
        }
      } else if (r < dens + 0.055){
        arbustos.push({ x, y: h, z, s: 0.55 + Math.random()*0.75,
                        ry: Math.random()*6.28, c: verde(0.26) });
      } else if (r < dens + 0.070){
        const g = 0.55 + Math.random()*0.35;
        rocas.push({ x, y: h + 0.1, z, s: 0.5 + Math.random()*1.5,
                     rx: Math.random()*3, ry: Math.random()*6.28, rz: Math.random()*3,
                     c: new T.Color(g, g*0.98, g*0.92) });
      } else if (r < dens + 0.0745 && bosque > 0.45){
        /* UN TRONCO CAÍDO cada tanto: es lo más barato que hay para que un
           bosque deje de ser un campo de postes verticales. Acostado y medio
           hundido, con la punta rota más gruesa que la fina. */
        troncosCaidos.push({ x, y: h + 0.28, z, sx: 1, sy: 2.4 + Math.random()*3.0, sz: 1,
                             rx: Math.PI/2 + (Math.random()-0.5)*0.16,
                             ry: Math.random()*6.28, rz: (Math.random()-0.5)*0.2,
                             c: new T.Color(0.86, 0.84, 0.80) });
      }
    }
    /* EL PASTO SE ESPESA de 0,30 a 0,44 y le crece un pelo de altura. Con la
       densidad vieja, mirando el suelo de frente se veían las matas SUELTAS,
       cada una con su aire alrededor, y eso se lee a matorral y no a prado. */
    if (r < 0.44 && h > PLAYA - 0.2 && s < 0.5)
      matas.push({ x, y: h, z, ry: Math.random()*6.28, s: 0.75 + Math.random()*1.05 });
    /* las flores van SÓLO donde hay pasto y son pocas: una flor cada tantas
       matas es un prado florecido; una por mata es un cantero */
    if (r > 0.44 && r < 0.468 && h > PLAYA + 0.4 && h < 34 && s < 0.34)
      flores.push({ x, y: h, z, ry: Math.random()*6.28, s: 0.7 + Math.random()*0.7 });
  }
  prog && prog(0.55, 'Plantando ' + (troncos.length) + ' árboles…');

  instanciar(geoTronco, matCorteza, troncos, true);
  instanciar(geoCopa1, matHoja, copas, true);
  instanciar(geoSomb, matHoja, somb, true);
  instanciar(geoCono, matHoja, conos, true);
  instanciar(geoFr, matHoja, frondas, true);
  instanciar(geoCoco, matCorteza, cocos, true);
  instanciar(geoArb, matHoja, arbustos, true);
  instanciar(geoRoca, matRoca, rocas, true);
  instanciar(geoCaido, matCorteza, troncosCaidos, true);

  /* ── el pasto: cruces de dos planos con alfa recortada ──
     alphaTest y no transparencia: sin orden que resolver, se puede meter
     mucho y encima queda el borde duro que combina con el pixelado. */
  matPasto = new T.MeshLambertMaterial({
    map: texPastoAlfa, alphaTest: 0.5, side: T.DoubleSide, flatShading: true
  });
  matPasto.onBeforeCompile = sh => {
    sh.uniforms.reloj = RELOJ;
    sh.uniforms.viento = VIENTO;
    sh.vertexShader = 'uniform float reloj; uniform float viento;\n' + sh.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
       /* el vaivén crece con la altura del vértice: la base queda clavada */
       float alt = max(0.0, position.y);
       vec3 wp = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
       transformed.x += sin(reloj*1.7 + wp.x*0.32 + wp.z*0.21) * alt * 0.20 * viento;
       transformed.z += cos(reloj*1.35 + wp.z*0.28) * alt * 0.13 * viento;`);
  };
  const gp = new T.PlaneGeometry(0.9, 0.9);
  gp.translate(0, 0.45, 0);
  const gp2 = gp.clone(); gp2.rotateY(Math.PI/2);
  const cruz = mezclar([gp, gp2]);
  pastoMesh = new T.InstancedMesh(cruz, matPasto, matas.length);
  pastoMesh.castShadow = false; pastoMesh.receiveShadow = true;
  const m4 = new T.Matrix4(), qq = new T.Quaternion(), ee = new T.Euler();
  const cMata = new T.Color();
  matas.forEach((o, i) => {
    ee.set(0, o.ry, 0); qq.setFromEuler(ee);
    m4.compose(new T.Vector3(o.x, o.y, o.z), qq, new T.Vector3(o.s, o.s*(0.8+Math.random()*0.6), o.s));
    pastoMesh.setMatrixAt(i, m4);
    /* EL COLOR POR MATA ES LO QUE MÁS SE NOTA Y ES LO QUE NO ESTABA. Todas las
       matas salían del mismo verde de la textura, así que el prado era UNA
       mancha lisa por más briznas que tuviera la silueta. Con el tono y la
       claridad movidos por mata, el suelo se llena de parches como un pasto de
       verdad; y una de cada nueve tira a amarillo, que son los manchones secos.
       Se mantiene CLARO a propósito: el material es Lambert y multiplica, así
       que un color de base oscuro deja la cara en sombra en negro. */
    const seca = Math.random() < 0.11;
    cMata.setHSL(seca ? 0.13 + Math.random()*0.03 : 0.255 + (Math.random()-0.5)*0.055,
                 seca ? 0.52 : 0.55 + Math.random()*0.22,
                 0.60 + Math.random()*0.26);
    pastoMesh.setColorAt(i, cMata);
  });
  pastoMesh.instanceMatrix.needsUpdate = true;
  if (pastoMesh.instanceColor) pastoMesh.instanceColor.needsUpdate = true;
  escena.add(pastoMesh);

  /* ── las flores ──
     Mismo material y mismo viento que el pasto: si tuvieran su propio shader se
     quedarían quietas mientras el pasto se mueve, y eso se ve. */
  floresMesh = null;
  if (flores.length){
    matFlor = new T.MeshLambertMaterial({
      map: texFlor, alphaTest: 0.5, side: T.DoubleSide, flatShading: true
    });
    matFlor.onBeforeCompile = matPasto.onBeforeCompile;
    floresMesh = new T.InstancedMesh(geoFlor, matFlor, flores.length);
    floresMesh.castShadow = false; floresMesh.receiveShadow = true;
    const cf = new T.Color();
    /* cuatro colores de flor y no un arcoíris: un prado con flores de todos los
       colores se lee a caramelos. Amarillo, blanco, violeta y rojo pálido. */
    const PALFLOR = [[0.14,0.85,0.68],[0.10,0.10,0.94],[0.78,0.42,0.72],[0.98,0.55,0.70]];
    flores.forEach((o, i) => {
      ee.set(0, o.ry, 0); qq.setFromEuler(ee);
      m4.compose(new T.Vector3(o.x, o.y, o.z), qq, new T.Vector3(o.s, o.s, o.s));
      floresMesh.setMatrixAt(i, m4);
      const p = PALFLOR[(Math.random()*PALFLOR.length)|0];
      cf.setHSL(p[0], p[1], p[2]);
      floresMesh.setColorAt(i, cf);
    });
    floresMesh.instanceMatrix.needsUpdate = true;
    if (floresMesh.instanceColor) floresMesh.instanceColor.needsUpdate = true;
    escena.add(floresMesh);
  }

  return { arboles: troncos.length + somb.length, matas: matas.length, flores: flores.length };
}

/* mezcla de geometrías sin depender de BufferGeometryUtils: sólo necesito
   unir dos planos idénticos en atributos, y así el HTML no importa nada más */
function mezclar(gs){
  let nv = 0, ni = 0;
  gs.forEach(g => { nv += g.attributes.position.count; ni += g.index ? g.index.count : 0; });
  const pos = new Float32Array(nv*3), nor = new Float32Array(nv*3), uv = new Float32Array(nv*2);
  const idx = new Uint16Array(ni);
  let vo = 0, io = 0;
  gs.forEach(g => {
    const p = g.attributes.position, n = g.attributes.normal, u = g.attributes.uv;
    pos.set(p.array, vo*3); nor.set(n.array, vo*3); uv.set(u.array, vo*2);
    const gi = g.index.array;
    for (let i = 0; i < gi.length; i++) idx[io+i] = gi[i] + vo;
    vo += p.count; io += gi.length;
  });
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.BufferAttribute(pos, 3));
  g.setAttribute('normal', new T.BufferAttribute(nor, 3));
  g.setAttribute('uv', new T.BufferAttribute(uv, 2));
  g.setIndex(new T.BufferAttribute(idx, 1));
  return g;
}
const VIENTO = { value: 1 };

/* ── FUNDIR PIEZAS EN UNA SOLA MALLA ──
   Una carpa son quince piezas y un auto son cuarenta. Sueltas, cada una es una
   llamada de dibujo, y con las sombras encendidas se pagan DOS veces: la carpa
   nueva sola había subido el cuadro de 70 a 96 llamadas. Fundidas por material,
   una carpa cuesta tres y el auto cuatro, midan lo que midan.
   Cada pieza se transforma ANTES de fundirse, así que las posiciones quedan
   horneadas en los vértices y no hace falta ni un solo Group.
   El índice va en Uint32 y no en Uint16 como `mezclar`: dos planos entran en
   65.535 vértices, un auto entero no necesariamente, y el desborde no avisa —
   dibuja triángulos que apuntan a cualquier lado. */
const _mFund = new T.Matrix4(), _eFund = new T.Euler(), _qFund = new T.Quaternion(),
      _vFund = new T.Vector3(), _v3Fund = new T.Vector3(), _nFund = new T.Matrix3();
function fundir(piezas){
  let nv = 0, ni = 0;
  const prep = piezas.map(z => {
    const g = z.g.index ? z.g : z.g.toNonIndexed();
    nv += g.attributes.position.count;
    ni += g.index ? g.index.count : g.attributes.position.count;
    return g;
  });
  const pos = new Float32Array(nv*3), nor = new Float32Array(nv*3), uv = new Float32Array(nv*2);
  const idx = new Uint32Array(ni);
  let vo = 0, io = 0;
  piezas.forEach((z, k) => {
    const g = prep[k];
    const p = z.p || [0,0,0], r = z.r || [0,0,0], s = z.s || [1,1,1];
    _eFund.set(r[0], r[1], r[2]); _qFund.setFromEuler(_eFund);
    _mFund.compose(_vFund.set(p[0], p[1], p[2]), _qFund, _v3Fund.set(s[0], s[1], s[2]));
    _nFund.getNormalMatrix(_mFund);
    const ap = g.attributes.position, an = g.attributes.normal, au = g.attributes.uv;
    for (let i = 0; i < ap.count; i++){
      _vFund.fromBufferAttribute(ap, i).applyMatrix4(_mFund);
      pos[(vo+i)*3] = _vFund.x; pos[(vo+i)*3+1] = _vFund.y; pos[(vo+i)*3+2] = _vFund.z;
      if (an){ _vFund.fromBufferAttribute(an, i).applyMatrix3(_nFund).normalize();
        nor[(vo+i)*3] = _vFund.x; nor[(vo+i)*3+1] = _vFund.y; nor[(vo+i)*3+2] = _vFund.z; }
      if (au){ uv[(vo+i)*2] = au.getX(i); uv[(vo+i)*2+1] = au.getY(i); }
    }
    if (g.index){ const gi = g.index.array;
      for (let i = 0; i < gi.length; i++) idx[io+i] = gi[i] + vo;
      io += gi.length;
    } else { for (let i = 0; i < ap.count; i++) idx[io+i] = vo + i; io += ap.count; }
    vo += ap.count;
  });
  const out = new T.BufferGeometry();
  out.setAttribute('position', new T.BufferAttribute(pos, 3));
  out.setAttribute('normal', new T.BufferAttribute(nor, 3));
  out.setAttribute('uv', new T.BufferAttribute(uv, 2));
  out.setIndex(new T.BufferAttribute(idx, 1));
  return out;
}

