
/* ══════════════════════════ LAS MISIONES DEL DÍA ══════════════════════════
   Cinco objetivos, en orden. Van EN ORDEN y no sueltos a propósito: cada uno
   deja algo que el siguiente usa —el inflador vive en el auto, el rastro sale
   del campamento, la antorcha necesita una rama de las cinco— así que
   ofrecerlos todos a la vez sería ofrecer cuatro cosas que todavía no se pueden
   hacer, y eso se lee a juego roto y no a libertad.

   TODO PASA POR UNA SOLA LISTA, `COSAS`. Cada cosa del mundo con la que se
   puede hacer algo se anota ahí con su posición, su radio y qué pasa al usarla;
   el bucle busca la más cercana y prende el cartel y el botón. Con un `if` por
   objeto desparramado por el código, el primero que se agregue después va a
   quedar sin cartel y nadie se va a enterar hasta jugarlo. */

const COSAS = [];
let MIS_GRUPO = null;          /* todo lo que las misiones plantan en el mundo */

/* materiales y geometrías de las misiones. Las compartidas se marcan para que
   `soltar()` no las libere: es la misma trampa que ya costó los personajes. */
const geoRama  = new T.CylinderGeometry(0.055, 0.075, 1.15, 5);
const geoBaliza = new T.OctahedronGeometry(0.30, 0);
geoRama.userData.compartida = true;
geoBaliza.userData.compartida = true;
const matRamaM  = new T.MeshLambertMaterial({ color: 0x9a6f42, flatShading: true });
const matBaliza = new T.MeshBasicMaterial({ color: 0xf0c869 });
const matSangre = new T.MeshBasicMaterial({ color: 0x6e0f0c });
/* EL METAL VA CÁLIDO. Es la tercera vez en este juego: con la saturación al
   tope del post-proceso, cualquier gris con un pelo de azul sale CIAN, y la
   llave salía celeste. Un gris tirando a arena queda metálico. */
const matMetal  = new T.MeshLambertMaterial({ color: 0xa89f8e, flatShading: true });
const matFuego2 = new T.MeshBasicMaterial({ color: 0xffb347 });
/* LA LLAVE EN LA MANO VA DE BRONCE Y CON LUZ PROPIA, y es la cuarta vez que
   este juego tropieza con lo mismo. En el momento en que se la agarra la única
   luz es el cielo, que es azul; un gris iluminado sólo por cielo azul y pasado
   por la saturación del post-proceso sale CELESTE, y en la captura la llave
   parecía un pedazo de vidrio. Con un emisivo cálido no depende de qué luz haya
   en ese segundo, que es justo lo que hace falta en el objeto que la cinemática
   está pidiendo que se mire. */
const matLlave  = new T.MeshLambertMaterial({ color: 0xecd07a, emissive: 0x6e5522,
                                              flatShading: true });

/* ── una cosa usable ──
   `r` es el radio en el que se ofrece, y es GENEROSO (2,8 m) por la misma razón
   por la que el blanco de los bichos de RECREO es grande: lo que tiene que
   costar es LLEGAR, no clavar el píxel. */
function cosa(o){
  o.r = o.r || 2.8;
  o.activo = o.activo !== false;
  COSAS.push(o);
  return o;
}
function borraCosas(){
  COSAS.length = 0;
  if (MIS_GRUPO){ soltar(MIS_GRUPO); MIS_GRUPO = null; }
}

/* la baliza: un rombo que gira y flota sobre lo que hay que buscar. Sin esto,
   «juntá cinco ramas» en una isla de 660 m de lado es una búsqueda a ciegas —y
   este juego no es de buscar, es de ir hasta allá. */
function baliza(padre, y){
  const m = new T.Mesh(geoBaliza, matBaliza);
  m.position.y = y || 1.5;
  padre.add(m);
  return m;
}

/* ══════════════════════════ EL RASTRO DE SANGRE ══════════════════════════
   Manchas planas sobre el suelo, del campamento a la cueva. Van pegadas a la
   forma del terreno —cada una toma su altura de `H()` y se apoya— porque un
   rastro que flota a una altura fija se despega en cuanto hay una loma.
   Y se APAGAN las que ya pasaste, como los rastros de Eco: siempre hay una sola
   punta encendida, la que lleva a donde falta. */
function armaRastro(desde, hasta, grupo){
  const trozos = [];
  const N = 34;
  for (let i = 0; i < N; i++){
    const t = i/(N-1);
    /* el camino no va derecho: se curva con un seno, porque un rastro recto se
       lee a línea pintada y no a algo que arrastraron */
    const cur = Math.sin(t*Math.PI) * 16;
    const dx = hasta.x - desde.x, dz = hasta.z - desde.z;
    const d = Math.hypot(dx, dz) || 1;
    const px = desde.x + dx*t - dz/d*cur;
    const pz = desde.z + dz*t + dx/d*cur;
    /* dos o tres manchas por punto, desparramadas */
    const n = 2 + ((Math.random()*2)|0);
    for (let k = 0; k < n; k++){
      const ox = px + (Math.random()-0.5)*2.6, oz = pz + (Math.random()-0.5)*2.6;
      const s = 0.34 + Math.random()*0.62;
      trozos.push({ g: new T.CircleGeometry(s, 7),
                    p: [ox, H(ox, oz) + 0.06, oz],
                    r: [-Math.PI/2, 0, Math.random()*3] });
    }
  }
  const m = new T.Mesh(fundir(trozos), matSangre);
  grupo.add(m);
  return m;
}

/* ══════════════════════════ EL MINIJUEGO DEL INFLADOR ══════════════════════
   Una línea que va y viene por una barra y un bloque verde en un sitio al azar.
   Se toca cuando la línea lo cruza. Siete veces, y el bloque se angosta.

   EL BLOQUE SE ANGOSTA PERO NO SE HACE IMPOSIBLE, que es lo que se pidió: va de
   22 % a 9 % del ancho de la barra. A la velocidad de la línea, 9 % son unos
   170 ms de ventana — más que el tiempo de reacción de cualquiera. Y la línea
   NO acelera: lo que sube es la puntería, no el reflejo, y con las dos cosas a
   la vez el último golpe sería lotería.

   EL ESTADO VIVE EN JS Y NO EN EL DOM. La posición de la línea se guarda en un
   número y se escribe al estilo del elemento; leerla de vuelta del DOM ataría el
   juego a que el navegador haya terminado de aplicar el estilo. */
const MINI = {
  on: false, k: 0, meta: 7, pos: 0, dir: 1, vel: 0.86,
  cubo: 0.5, ancho: 0.22, listo: false, tGolpe: 0,
  abre(){
    this.on = true; this.k = 0; this.pos = 0; this.dir = 1; this.tGolpe = 0;
    $('mini').classList.add('on');
    $('miAviso').textContent = '';
    this.nuevoCubo();
    this.pinta();
  },
  cierra(ok){
    /* IDEMPOTENTE. El cierre llega por un `setTimeout` de 0,7 s, y en ese rato
       el botón sigue vivo: dos toques rápidos al final agendaban DOS cierres y
       cada uno avanzaba una misión. Medido: los siete golpes dejaban el juego
       en la misión 4 en vez de la 2, salteando el rastro y la antorcha enteros. */
    if (!this.on) return;
    this.on = false;
    $('mini').classList.remove('on');
    if (ok) MIS.avanza();
  },
  nuevoCubo(){
    /* el ancho baja de 0,22 a 0,09 a lo largo de los siete */
    this.ancho = 0.22 - (this.k / (this.meta - 1)) * 0.13;
    /* el centro nunca pegado al borde: ahí la línea rebota y la ventana se
       duplica sola, o sea que el golpe más difícil saldría más fácil */
    this.cubo = 0.16 + Math.random() * 0.68;
  },
  paso(dt){
    if (!this.on) return;
    this.pos += this.dir * this.vel * dt;
    if (this.pos > 1){ this.pos = 1; this.dir = -1; }
    if (this.pos < 0){ this.pos = 0; this.dir = 1; }
    if (this.tGolpe > 0) this.tGolpe -= dt;
    this.pinta();
  },
  pinta(){
    $('miLinea').style.left = (this.pos*100) + '%';
    $('miCubo').style.left = ((this.cubo - this.ancho/2)*100) + '%';
    $('miCubo').style.width = (this.ancho*100) + '%';
    $('miCnt').textContent = this.k + ' / ' + this.meta;
  },
  golpe(){
    /* y una vez completo no acepta más: es la otra mitad del mismo defecto */
    if (!this.on || this.tGolpe > 0 || this.k >= this.meta) return null;
    this.tGolpe = 0.22;                 /* no se puede martillar el botón */
    const dentro = Math.abs(this.pos - this.cubo) <= this.ancho/2;
    if (dentro){
      this.k++;
      son2('bomba');
      if (this.k >= this.meta){
        $('miAviso').textContent = TX('miFin');
        setTimeout(() => this.cierra(true), 700);
        return 'fin';
      }
      $('miAviso').textContent = TXF('miBien', this.meta - this.k);
      this.nuevoCubo();
      return 'ok';
    }
    /* FALLAR NO REINICIA. Perder los seis golpes anteriores por uno malo
       convierte un minijuego de treinta segundos en uno de cinco minutos, y
       nada en el pedido dice que esto tenga que castigar. Sólo no suma. */
    $('miAviso').textContent = TX('miMal');
    return 'mal';
  }
};

/* un chasquido para las acciones. El juego no tenía audio; esto es lo mínimo
   que hace que apretar un botón se sienta como haber hecho algo. */
let AUD = null;
function son2(tipo){
  try {
    if (!AUD) AUD = new (window.AudioContext || window.webkitAudioContext)();
    if (AUD.state === 'suspended') AUD.resume();
    const t = AUD.currentTime, o = AUD.createOscillator(), g = AUD.createGain();
    const f = tipo === 'bomba' ? 320 : tipo === 'mal' ? 150 : 520;
    o.type = tipo === 'mal' ? 'sawtooth' : 'triangle';
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(f * (tipo === 'mal' ? 0.6 : 1.7), t + 0.09);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.13, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    o.connect(g); g.connect(AUD.destination);
    o.start(t); o.stop(t + 0.18);
  } catch(e){ /* sin audio se juega igual */ }
}

/* ══════════════════════════ EL INFLADOR ══════════════════════════
   Una bomba de pie, de las de auto: base con dos pedales, cilindro, émbolo con
   manija en T, manómetro y la manguera enroscada. Se arma dos veces —una que
   vive en la caja de la camioneta y otra colgada de la cámara— y las dos salen
   de la MISMA función, con un parámetro de escala: si fueran dos modelos, el
   que se ve en la mano no sería el que se levantó del auto, y eso se nota.

   NO SE FUNDE EN UNA SOLA MALLA como el auto o la cueva, y es a propósito: son
   nueve piezas, o sea nueve llamadas de dibujo contra las 60-90 que ya tiene la
   escena. Fundirlo obligaría a repetir el trabajo de transformar cada pieza
   para ganar ocho llamadas que no se notan. */
const matBomba  = new T.MeshLambertMaterial({ color: 0x2f3a46, flatShading: true });
const matBombaR = new T.MeshLambertMaterial({ color: 0xc23528, flatShading: true });
const matMangue = new T.MeshLambertMaterial({ color: 0x22252b, flatShading: true });
const matDial   = new T.MeshLambertMaterial({ color: 0xe8e2d0, emissive: 0x2a2822,
                                              flatShading: true });
function armaInflador(e){
  e = e || 1;
  const g = new T.Group();
  const pon = (m, x, y, z, rx, ry, rz) => {
    m.position.set(x*e, y*e, z*e);
    if (rx || ry || rz) m.rotation.set(rx||0, ry||0, rz||0);
    m.scale.multiplyScalar(e);
    g.add(m); return m;
  };
  /* LA BASE: dos pedales, que es lo que distingue una bomba de pie de un tubo */
  for (const sx of [-1, 1])
    pon(new T.Mesh(new T.BoxGeometry(0.075, 0.020, 0.115), matBomba), sx*0.062, 0.010, 0);
  pon(new T.Mesh(new T.BoxGeometry(0.055, 0.018, 0.070), matBomba), 0, 0.010, 0);
  /* el cilindro y el émbolo que sale por arriba */
  pon(new T.Mesh(new T.CylinderGeometry(0.030, 0.034, 0.30, 7), matBomba), 0, 0.17, 0);
  pon(new T.Mesh(new T.CylinderGeometry(0.012, 0.012, 0.16, 5), matCromo), 0, 0.38, 0);
  /* la manija en T, roja: es la pieza por la que se agarra y por eso lleva el
     único color vivo del objeto */
  pon(new T.Mesh(new T.BoxGeometry(0.165, 0.028, 0.032), matBombaR), 0, 0.455, 0);
  for (const sx of [-1, 1])
    pon(new T.Mesh(new T.CylinderGeometry(0.014, 0.014, 0.030, 5), matBombaR),
        sx*0.070, 0.437, 0, Math.PI/2, 0, 0);
  /* el manómetro, de costado sobre el cilindro */
  pon(new T.Mesh(new T.CylinderGeometry(0.042, 0.042, 0.014, 8), matDial),
      0.042, 0.24, 0.010, 0, 0, Math.PI/2);
  /* LA MANGUERA, enroscada. Una curva de tubo dice «esto se conecta a algo»;
     un cilindro recto se lee a palo. Va con `TubeGeometry` sobre una hélice
     achatada, que son ocho líneas y no una malla dibujada a mano. */
  const pts = [];
  for (let i = 0; i <= 22; i++){
    const u = i/22, a = u*Math.PI*3.2;
    pts.push(new T.Vector3(Math.cos(a)*0.075*e,
                           (0.055 + u*0.085)*e,
                           Math.sin(a)*0.055*e));
  }
  const cur = new T.CatmullRomCurve3(pts);
  const man = new T.Mesh(new T.TubeGeometry(cur, 22, 0.011*e, 4, false), matMangue);
  g.add(man);
  return g;
}

/* ══════════════════════════ EL SISTEMA ══════════════════════════ */
const MIS = {
  i: -1, on: false, ramas: 0, tieneInflador: false,
  antorcha: { rama: false, tela: false, fuego: false },
  cerca: null, marcaRastro: null, llaves: null, antorchaMalla: null,
  infladorMalla: null, infladorMano: null,

  lista: [
    /* LAS MISIONES GUARDAN LA CLAVE Y NO EL TEXTO. Si guardaran el texto, la
       lista se arma una sola vez al empezar y cambiar de idioma en medio de la
       partida dejaría el panel en el idioma viejo hasta la misión siguiente —el
       mismo defecto que ya costó una vuelta con las tablas de Z Force. */
    { k:'m0' }, { k:'m1' }, { k:'m2' }, { k:'m3' }, { k:'m4' }
  ],

  arranca(){
    borraCosas();
    MIS_GRUPO = new T.Group();
    escena.add(MIS_GRUPO);
    this.i = -1; this.on = true; this.ramas = 0; this.tieneInflador = false;
    this.antorcha = { rama: false, tela: false, fuego: false };
    this.llaves = null; this.antorchaMalla = null;
    this.guardaInflador(); this.infladorMalla = null;
    $('obj').classList.add('on');
    this.arma();
    this.avanza();
  },
  para(){
    this.on = false;
    $('obj').classList.remove('on');
    $('pista').classList.remove('on');
    borraCosas();
  },

  /* ── todo lo que las misiones ponen en el mundo, de una sola vez ──
     Se planta TODO al empezar y se va activando: plantarlo a medida que hace
     falta obligaría a resembrar la escena en medio de la partida, y además
     dejaría el bosque sin las ramas hasta que el juego decida que existen. */
  arma(){
    const c = CAMPO, G = MIS_GRUPO;

    /* LAS CINCO RAMAS, repartidas en un anillo alrededor del campamento.
       En anillo y no al azar por toda la isla: al azar, dos podían caer a
       trescientos metros y la primera misión duraría diez minutos. */
    for (let k = 0; k < 5; k++){
      const a = k/5*6.283 + Math.random()*0.9, r = 26 + Math.random()*26;
      let x = c.x + Math.cos(a)*r, z = c.z + Math.sin(a)*r;
      /* que no caiga en el agua ni en una ladera imposible */
      for (let intento = 0; intento < 12 && (H(x,z) < PLAYA + 0.5 || pendiente(x,z) > 0.5); intento++){
        const a2 = Math.random()*6.283, r2 = 22 + Math.random()*24;
        x = c.x + Math.cos(a2)*r2; z = c.z + Math.sin(a2)*r2;
      }
      const g = new T.Group();
      g.position.set(x, H(x, z), z);
      /* tres palitos cruzados en el piso: una rama sola es un palo perdido en
         el pasto, tres se ven de lejos */
      for (let j = 0; j < 3; j++){
        const m = new T.Mesh(geoRama, matRamaM);
        m.rotation.set(Math.PI/2 + (Math.random()-0.5)*0.3, Math.random()*3, (Math.random()-0.5)*0.5);
        m.position.set((Math.random()-0.5)*0.5, 0.09, (Math.random()-0.5)*0.5);
        m.castShadow = true;
        g.add(m);
      }
      const b = baliza(g, 1.6);
      G.add(g);
      cosa({ tipo:'rama', x, z, malla:g, bal:b, rot:'rRama',
             mision:0, activo:false });
    }

    /* EL INFLADOR Y EL ENCENDEDOR VIVEN EN EL AUTO, o sea en la misma cosa
       usable: el auto se usa una vez para cada mision y el rótulo cambia. */
    if (AUTO){
      cosa({ tipo:'auto', x: AUTO.x, z: AUTO.z, r: 4.2,
             rot:'rAuto', mision:1, activo:false });
      /* EL INFLADOR SE VE EN LA CAJA DE LA CAMIONETA. Antes «buscar el inflador
         en el auto» era tocar un botón y que un cartel dijera que ya lo tenías:
         el objeto de la segunda misión no existía en ninguna parte. Puesto en
         la caja, se lo ve antes de llegar y se ve que desapareció al agarrarlo,
         que es la mitad de lo que hace que juntar algo se sienta. */
      /* LA CAJA ESTÁ DETRÁS DE LA CABINA, y eso hay que transformarlo bien: la
         camioneta mide 4,30 con 2,05 de cabina y el morro sobre su +Z, así que
         el piso de la caja cae en z local −1,3. Con la cuenta anterior el
         inflador quedaba a 1,10 del centro, o sea DENTRO de la cabina, y desde
         afuera no se veía. Una rotación en Y lleva (lx,lz) a
         (lx·cos + lz·sen, −lx·sen + lz·cos): escribirlo mal es meter el objeto
         en cualquier lado, y no se nota hasta que se lo busca. */
      const LX = 0.28, LZ = -1.30;
      const ix = AUTO.x + LX*Math.cos(AUTO.ry) + LZ*Math.sin(AUTO.ry);
      const iz = AUTO.z - LX*Math.sin(AUTO.ry) + LZ*Math.cos(AUTO.ry);
      this.infladorMalla = armaInflador(1);
      this.infladorMalla.position.set(ix, AUTO.y + 0.86, iz);
      this.infladorMalla.rotation.set(0.16, AUTO.ry + 0.5, 0.10);
      G.add(this.infladorMalla);
      /* LA RUEDA PINCHADA es la delantera del lado de afuera. Se marca con la
         baliza propia para que no haya que adivinar de qué lado del auto es. */
      const rx = AUTO.x + Math.cos(AUTO.ry)*1.55 + Math.sin(AUTO.ry)*1.05;
      const rz = AUTO.z - Math.sin(AUTO.ry)*1.55 + Math.cos(AUTO.ry)*1.05;
      const gr = new T.Group();
      gr.position.set(rx, H(rx, rz), rz);
      const b = baliza(gr, 1.9);
      G.add(gr);
      /* LA RUEDA NO EXISTE HASTA QUE TENGAS EL INFLADOR, y no es un detalle:
         parado junto a la camioneta, la rueda queda MÁS CERCA que el centro del
         auto —medido, 1,62 m contra 1,70— así que era ella la que ganaba el
         cartel, y el cartel decía «agachate a inflar» para después contestar
         que falta el inflador. Con `requiere`, hasta que no lo tengas la única
         cosa usable ahí es la camioneta. */
      cosa({ tipo:'rueda', x: rx, z: rz, r: 2.4, malla:gr, bal:b,
             rot:'rRueda', mision:1, requiere:true, activo:false });
    }

    /* EL RASTRO Y LA CUEVA */
    if (CUEVA){
      const desde = { x: c.x + 9, z: c.z - 7 };
      /* dónde empieza el rastro queda guardado: el último plano de la
         cinemática lo necesita para apuntar la cámara, y si lo recalculara por
         su cuenta serían dos cuentas que un día se separan */
      this.rastroDesde = desde;
      this.marcaRastro = armaRastro(desde, CUEVA, G);
      cosa({ tipo:'cueva', x: CUEVA.frenteX, z: CUEVA.frenteZ, r: 6.0,
             rot:'rCueva', mision:2, activo:false });
    }

    /* LA CARPA que se rompe para la tela: la primera, que es la de Lemi */
    if (CARPAS.length){
      const k = CARPAS[0];
      cosa({ tipo:'carpa', x: k.x, z: k.z, r: 3.4,
             rot:'rCarpa', mision:3, activo:false });
    }

    /* LAS LLAVES, tiradas donde termina el rastro pero del lado de acá: no
       adentro de la cueva, que a la cueva no se puede entrar. */
    if (CUEVA){
      const a = CUEVA.mira, d = 13;
      const lx = CUEVA.x + Math.sin(a)*d + Math.cos(a)*6;
      const lz = CUEVA.z + Math.cos(a)*d - Math.sin(a)*6;
      const g = new T.Group();
      g.position.set(lx, H(lx, lz), lz);
      const anillo = new T.Mesh(new T.TorusGeometry(0.13, 0.028, 4, 10), matMetal);
      anillo.rotation.x = Math.PI/2; anillo.position.y = 0.12;
      g.add(anillo);
      for (let j = 0; j < 2; j++){
        const ll = new T.Mesh(new T.BoxGeometry(0.05, 0.012, 0.24), matMetal);
        ll.position.set(0.10 + j*0.05, 0.12, 0.12);
        ll.rotation.y = j*0.4;
        g.add(ll);
      }
      const b = baliza(g, 1.4);
      G.add(g);
      this.llaves = cosa({ tipo:'llaves', x: lx, z: lz, malla:g, bal:b,
                           rot:'rLlaves', mision:4, activo:false });
    }
  },

  /* ── pasar a la siguiente ── */
  avanza(){
    /* al pasar de la rueda al rastro se guarda el inflador: seguir caminando
       por la isla con la bomba colgada del ojo la deja tapando el cuadro toda
       la partida, y su trabajo ya está hecho */
    if (this.i === 1) this.guardaInflador();
    this.i++;
    if (this.i >= this.lista.length){ this.fin(); return; }
    const m = this.lista[this.i];
    $('obj').classList.remove('hecho');
    $('obj').querySelector('.n').textContent = TXF('oNum', this.i+1);
    $('obj').querySelector('.t').textContent = TX(m.k + 'n');
    this.pintaSub();
    /* se activa lo de esta misión y se apaga lo demás */
    for (const o of COSAS) o.activo = (o.mision === this.i) && !o.requiere;
    /* la antorcha usa el auto y una carpa a la vez */
    if (this.i === 3) for (const o of COSAS)
      if (o.tipo === 'auto' || o.tipo === 'carpa') o.activo = true;
    this.balizas();
    son2('ok');
  },
  pintaSub(){
    const m = this.lista[this.i];
    let s = TX(m.k + 's');
    if (this.i === 0) s = TXF('sRamas', this.ramas);
    if (this.i === 3){
      const a = this.antorcha;
      s = TXF('sAntorcha', a.rama ? '✓' : '·', a.tela ? '✓' : '·', a.fuego ? '✓' : '·');
    }
    $('obj').querySelector('.s').textContent = s;
  },
  /* REPINTA LO QUE YA ESTA EN PANTALLA. Cambiar de idioma con el juego abierto
     tiene que cambiar el panel de objetivo y el cartel de lo que hay cerca AHORA,
     no en la próxima misión. Es lo mismo que en Eco con las hojas ya encontradas. */
  repinta(){
    if (!this.on || this.i < 0) return;
    if (this.i >= this.lista.length){ this.fin(); return; }
    const m = this.lista[this.i];
    $('obj').querySelector('.n').textContent = TXF('oNum', this.i+1);
    $('obj').querySelector('.t').textContent = TX(m.k + 'n');
    this.pintaSub();
  },
  balizas(){
    for (const o of COSAS) if (o.bal) o.bal.visible = o.activo;
  },
  fin(){
    $('obj').classList.add('hecho');
    $('obj').querySelector('.n').textContent = TX('oFinN');
    $('obj').querySelector('.t').textContent = TX('oFinT');
    $('obj').querySelector('.s').textContent = TX('oFinS');
  },

  /* qué es lo más cercano que se puede usar AHORA. Lo calculan las dos cosas
     que lo necesitan —el cartel y la acción— llamando acá, y no se guarda en
     una variable que una lea y la otra escriba: `usa()` apoyado en lo que dejó
     el cuadro anterior depende del ORDEN en que corran, y ese es el tipo de
     dependencia que funciona hasta que un día no. */
  buscaCerca(){
    let mejor = null, mejorD = 1e9;
    for (const o of COSAS){
      if (!o.activo) continue;
      const d = Math.hypot(JUG.x - o.x, JUG.z - o.z);
      if (d < o.r && d < mejorD){ mejorD = d; mejor = o; }
    }
    return mejor;
  },

  /* ── usar lo que haya cerca ── */
  usa(){
    const o = this.buscaCerca();
    if (!o) return null;
    if (o.tipo === 'rama'){
      this.ramas++;
      o.activo = false; o.malla.visible = false;
      son2('ok'); this.pintaSub(); this.balizas();
      if (this.ramas >= 5){ aviso(TX('aRamas')); this.avanza(); }
      return 'rama';
    }
    if (o.tipo === 'auto'){
      if (this.i === 1 && !this.tieneInflador){
        this.tieneInflador = true;
        if (this.infladorMalla) this.infladorMalla.visible = false;
        this.ponInfladorEnMano();
        aviso(TX('aInflador'));
        $('obj').querySelector('.s').textContent = TX('sInflar');
        for (const c2 of COSAS) if (c2.tipo === 'rueda') c2.activo = true;
        this.balizas();
        son2('ok');
        return 'inflador';
      }
      if (this.i === 3 && !this.antorcha.fuego){
        this.antorcha.fuego = true;
        aviso(TX('aEncendedor'));
        son2('ok'); this.pintaSub(); this.chequeaAntorcha();
        return 'encendedor';
      }
      return null;
    }
    if (o.tipo === 'rueda'){
      if (!this.tieneInflador){ aviso(TX('aFaltaInflador')); return null; }
      ponAgacha(true);
      MINI.abre();
      return 'mini';
    }
    if (o.tipo === 'cueva'){
      /* NO SE PUEDE PASAR, y eso hay que DECIRLO. Un pasaje invisible que no
         deja avanzar sin explicar por qué se lee a error de colisión. */
      aviso(TX('aCueva'));
      o.activo = false;
      this.avanza();
      return 'cueva';
    }
    if (o.tipo === 'carpa'){
      if (this.i !== 3 || this.antorcha.tela) return null;
      this.antorcha.tela = true;
      if (this.ramas > 0 && !this.antorcha.rama){ this.antorcha.rama = true; this.ramas--; }
      aviso(TX('aLona'));
      son2('ok'); this.pintaSub(); this.chequeaAntorcha();
      return 'lona';
    }
    if (o.tipo === 'llaves'){
      o.activo = false; o.malla.visible = false;
      this.balizas();
      LLAVE.arranca();
      return 'llaves';
    }
    return null;
  },
  /* EL INFLADOR EN LA MANO. Cuelga de la cámara, igual que la antorcha, así que
     va con la vista por construcción y no hay dos cosas que puedan
     desincronizarse. Y sub-escalado por la misma razón que ya costó tres
     intentos con la antorcha: a tamaño real, medio metro delante del ojo, una
     bomba de pie tapa el cuadro entero. */
  ponInfladorEnMano(){
    if (this.infladorMano) return;
    const g = armaInflador(0.34);
    /* MEDIDO Y CORREGIDO: puesta en (−0,34 · −0,46 · −0,66) la bomba caía en
       y 0,83–1,13 del alto, o sea con el 83 % por DEBAJO del borde: en pantalla
       asomaba la manija y nada más. Subida y acercada queda en poco más de un
       cuarto del cuadro, como la antorcha. */
    g.position.set(-0.30, -0.30, -0.58);
    g.rotation.set(0.12, 0.5, 0.32);
    cam.add(g);
    escena.add(cam);
    this.infladorMano = g;
  },
  guardaInflador(){
    if (!this.infladorMano) return;
    cam.remove(this.infladorMano);
    soltar(this.infladorMano);
    this.infladorMano = null;
  },
  chequeaAntorcha(){
    const a = this.antorcha;
    if (a.rama && a.tela && a.fuego){
      aviso(TX('aAntorcha'));
      this.prendeAntorcha();
      this.avanza();
    }
  },
  /* la antorcha encendida se ve en la mano: una rama con una llama arriba,
     colgada de la CÁMARA, así que va con la vista y no hay dos cosas que
     puedan desincronizarse */
  prendeAntorcha(){
    if (this.antorchaMalla) return;
    const g = new T.Group();
    const palo = new T.Mesh(new T.CylinderGeometry(0.035, 0.05, 0.72, 5), matRamaM);
    palo.position.set(0, -0.06, 0);
    palo.rotation.set(0.30, 0, 0.22);
    g.add(palo);
    const tela = new T.Mesh(new T.CylinderGeometry(0.075, 0.062, 0.20, 6), matLona);
    tela.position.set(0.05, 0.26, -0.10);
    tela.rotation.set(0.30, 0, 0.22);
    g.add(tela);
    for (let k = 0; k < 2; k++){
      const f = new T.Mesh(new T.ConeGeometry(0.09 - k*0.03, 0.30 - k*0.09, 5), matFuego2);
      f.position.set(0.06, 0.44 - k*0.03, -0.12);
      g.add(f);
    }
    /* LA LUZ DE LA ANTORCHA VA COLGADA DE LA CÁMARA Y NO DE LA MALLA, y el
       alcance es corto (14 m): es una antorcha, no un reflector. De noche es lo
       único que te deja ver el suelo por el que caminás. */
    const luz = new T.PointLight(0xffa33c, 5.5, 14, 1.6);
    luz.position.set(0.06, 0.34, -0.12);
    g.add(luz);
    /* LA ANTORCHA VA SUB-ESCALADA A PROPÓSITO Y ESO NO ES UN ERROR DE CUENTA.
       Cualquier cosa colgada de la cámara se dibuja a medio metro del ojo, así
       que con proporciones de verdad es gigante en el cuadro: medido, la
       primera versión ocupaba media pantalla de alto y tapaba el lado derecho
       entero. Es la misma trampa que ya costó tres intentos con la espada de
       RECREO y con la hoja de Eco. A 0,46 de escala y empujada al borde queda
       en poco más de un cuarto del alto, que es lo que ocupa algo que uno lleva
       en la mano y mira de reojo. */
    g.scale.setScalar(0.46);
    g.position.set(0.40, -0.42, -0.92);
    cam.add(g);
    escena.add(cam);
    this.antorchaMalla = g;
  },

  /* ── cada cuadro: qué hay cerca ── */
  paso(dt){
    if (!this.on || MODO !== 'juego') return;
    if (MINI.on){ MINI.paso(dt); return; }
    const mejor = this.buscaCerca();
    this.cerca = mejor;
    const p = $('pista');
    if (mejor){
      p.classList.add('on');
      p.innerHTML = (document.body.classList.contains('pc') ? '<b>E</b> · ' : '') + TX(mejor.rot);
      $('acUsar').classList.remove('apagado');
    } else {
      p.classList.remove('on');
      $('acUsar').classList.add('apagado');
    }
    /* las balizas giran y flotan: quietas se leen a objeto del decorado */
    const t = RELOJ.value;
    for (const o of COSAS) if (o.bal && o.bal.visible){
      o.bal.rotation.y = t*1.9;
      o.bal.position.y = (o.tipo === 'rueda' ? 1.9 : o.tipo === 'llaves' ? 1.4 : 1.6)
                       + Math.sin(t*2.2 + o.x)*0.16;
    }
    /* la antorcha late */
    if (this.antorchaMalla)
      this.antorchaMalla.rotation.z = Math.sin(t*2.4)*0.05;
  }
};

/* ══════════════════════════ LA LLAVE Y EL CAMELLO ══════════════════════════
   La última misión termina en una cinemática EN PRIMERA PERSONA: las manos
   entran en cuadro, agarran la llave del suelo, y al levantar la vista está el
   bicho. Va en primera persona y no en un plano de afuera porque el susto es
   que lo veas VOS: mirándolo desde una cámara externa, lo que se ve es a un
   muñeco asustándose, que no es lo mismo. */
const LLAVE = {
  on: false, t: 0, dur: 7.4, manos: null, yaw0: 0, pitch0: 0, pitchFin: 0.10, luz: null,
  arranca(){
    if (this.on) return;
    this.on = true; this.t = 0;
    MODO = 'llave';
    $('cine').classList.add('on');
    requestAnimationFrame(() => $('cine').classList.add('abre'));
    $('cTexto').textContent = '';
    $('cSaltar').style.display = 'none';
    /* EL HUD SE VA. Durante la cinemática seguían en pantalla el panel de
       objetivo, la leyenda de teclas y el cartel «E · Agarrar las llaves» —o
       sea el juego pidiéndote que hagas lo que estás viendo que ya hiciste. */
    $('hud').classList.remove('on');
    $('pista').classList.remove('on');
    /* Y LA ANTORCHA SE GUARDA. Cuelga de la cámara con una llama sin luz —o sea
       amarillo puro— y en el plano del agarre quedaba justo delante de la mano:
       medido en la captura, el cono de fuego tapaba media pantalla y la mano
       salía como una silueta negra contra él. Aparte tiene sentido: para juntar
       algo del piso con las DOS manos hay que soltar lo que llevabas. Vuelve
       cuando termina la escena. */
    if (this.antorchaGuardada === undefined) this.antorchaGuardada = null;
    if (MIS.antorchaMalla){ MIS.antorchaMalla.visible = false; this.antorchaGuardada = MIS.antorchaMalla; }
    this.yaw0 = JUG.yaw;
    /* mira al suelo: la llave está a los pies */
    this.manos = armaManos();
    cam.add(this.manos);
    escena.add(cam);
    /* EL CAMELLO SE PLANTA DETRÁS Y ARRIBA, en la dirección en la que uno va a
       levantar la vista, y a nueve metros: más cerca no entra entero en el
       cuadro y más lejos deja de ser una amenaza. */
    ponCamello();
    /* EL ADELANTE DE ESTA CÁMARA ES `(-sin yaw, -cos yaw)` Y NO `(+sin, +cos)`.
       Con el signo al revés el camello quedaba plantado siete metros y medio a
       la ESPALDA del jugador, o sea fuera del cuadro, y por eso la escena del
       susto no mostraba nada. Y la sonda no lo denunciaba: un punto detrás de
       la cámara se proyecta igual —dado vuelta, porque w es negativo— y cae
       dentro del rectángulo, así que decía «entra en el cuadro» mientras el
       recorte del frustum ni siquiera lo dibujaba. Es exactamente la misma
       trampa que en RECREO dio un autobús «entero y centrado» con la cámara
       mirando para el otro lado. Ahora `donde()` mira también la profundidad. */
    /* CINCO METROS Y DE TRES CUARTOS, y los dos números salen de medir.
       De frente y a siete metros y medio un camello es una COLUMNA: medido, la
       silueta ocupaba el 1,7 % del cuadro, porque lo que se ve de frente son
       ochenta y seis centímetros de pecho. Lo que hace grande a un camello es
       el largo —dos metros treinta de tronco más el cuello—, así que se lo
       planta girado: a cuarenta grados presenta 2,1 m de ancho, o sea el 70 %
       del cuadro a cinco metros. Y el cuello se gira lo mismo para el otro
       lado, así que el cuerpo está de tres cuartos y la cara sigue mirándote,
       que es lo que se pidió. */
    /* Y LA DIRECCIÓN SE ELIGE MIRANDO SI HAY ALGO EN EL MEDIO. Plantado a ojo
       en la dirección en la que uno venía, el camello salió con un tronco de
       árbol cruzándolo por la mitad: el plano más importante del juego partido
       en dos por un palo. Es el mismo defecto que en Vecindario dejó el farol
       roto justo entre la cámara y la casa fea. Acá se prueban ocho rumbos y se
       toma el primero que tenga la vista libre —o, si ninguno la tiene, el más
       despejado de los ocho—. Sale una sola vez, no por cuadro. */
    this.yaw0 += this.rumboLibre();
    BICHO.x = JUG.x - Math.sin(this.yaw0)*6.5;
    BICHO.z = JUG.z - Math.cos(this.yaw0)*6.5;
    /* su hocico sale por su +Z, así que mirarte de frente sería `yaw0` */
    BICHO.ry = this.yaw0 + 0.70;
    if (CAM3){
      CAM3.userData.cuello.rotation.y = -0.70;
      /* y la cara baja hasta el jugador: la cabeza está a 3,6 m y el ojo a 1,5,
         a 6,5 m de distancia, o sea 18° hacia abajo. Repartidos entre el cuello
         —que además se endereza, y así la silueta crece— y la cabeza. */
      CAM3.userData.miraCuello = 0.10;
      CAM3.userData.miraCabeza = 0.22;
    }
    BICHO.modo = 'quieto'; BICHO.golpe = 0;
    const suelo = H(BICHO.x, BICHO.z);
    if (CAM3){ CAM3.position.set(BICHO.x, suelo, BICHO.z);
               CAM3.rotation.y = BICHO.ry; }
    /* CUÁNTO SE LEVANTA LA VISTA SE CALCULA, NO SE ESCRIBE A MANO.
       Estaba clavado en +0,10 rad, sacado de suponer que el camello y el
       jugador pisan la misma altura. No la pisan: la llave está al lado de la
       cueva, que está en una ladera, y ahí el bicho quedaba parado dos metros
       más arriba —medido, la cabeza terminaba diecisiete centésimas de pantalla
       POR ENCIMA del borde de arriba y en el cuadro se veían cuatro patas—.
       Ahora se apunta al medio del animal: el ángulo a la cabeza y el ángulo a
       las patas, promediados. Así queda encuadrado esté donde esté. */
    const ojo = JUG.y + OJO - 0.12;                 /* el ojo al final del subir */
    const alto = Math.atan2(suelo + ALTO_CAMELLO - ojo, 6.5);
    const bajo = Math.atan2(suelo - ojo, 6.5);
    this.pitchFin = cl((alto + bajo)/2, -0.10, 0.62);
    /* UNA LUZ EN EL OJO, SÓLO EN ESTA ESCENA. El camello se planta contra el
       cielo, o sea a contraluz, y medido en la captura la cara —que es la
       textura que este pedido pide que se vea— salía en un marrón casi negro:
       una silueta con dos puntitos rojos. Una luz colgada de la cámara es
       exactamente el flash de una foto de noche: aplasta el volumen y deja la
       cara plana y visible, que para un susto es lo que se quiere. Se apaga al
       terminar, así que el resto del juego sigue iluminado como siempre. */
    /* LA LUZ VA DOS METROS DELANTE DEL OJO Y NO EN EL OJO. Pegada a la cámara,
       las manos —que están a cuarenta centímetros— reciben dieciséis veces más
       que el camello, que está a seis y medio: medido en la captura, los dos
       brazos salían blancos puros mientras el bicho seguía apenas iluminado.
       Corrida hacia adelante, la distancia a las manos pasa a 2,6 m y al
       camello a 4,3: la relación cae de 16 a 2,7 y las dos cosas se ven. */
    this.luz = new T.PointLight(0xfff2e0, 0.0, 26, 1.0);
    this.luz.position.set(0, 0.20, -2.2);
    cam.add(this.luz);
  },

  /* cuánto hay que girar para que entre la cámara y el camello no haya nada.
     El rayo sale del ojo y va casi horizontal; se descartan de la lista la
     propia cámara —de la que cuelgan las manos y la antorcha, o sea a medio
     metro—, el domo del cielo, el agua, el camello y lo que plantaron las
     misiones, que no son escenario. */
  rumboLibre(){
    const fuera = new Set([cam, CAM3, MIS_GRUPO,
                           typeof cielo !== 'undefined' ? cielo : null,
                           typeof agua  !== 'undefined' ? agua  : null]);
    const lista = escena.children.filter(o => o.visible && !fuera.has(o));
    const rc = new T.Raycaster();
    rc.far = 6.2;
    const o = new T.Vector3(), d = new T.Vector3();
    let mejor = 0, mejorLibre = -1;
    /* TRES RAYOS Y NO UNO, separados el ancho del animal. Con un solo rayo por
       el centro, un tronco parado al costado del camello no lo descarta y el
       plano vuelve a salir partido al medio — que es justo lo que volvió a
       pasar en la captura después del primer arreglo. El camello presenta unos
       2,1 m de frente, así que se prueban el eje y los dos bordes. */
    for (const off of [0, 0.55, -0.55, 1.1, -1.1, 1.9, -1.9, 3.14]){
      const a = this.yaw0 + off;
      const ux = -Math.sin(a), uz = -Math.cos(a);
      let libre = 99;
      for (const lat of [0, -1.0, 1.0]){
        /* el costado es perpendicular al rumbo */
        o.set(JUG.x - uz*lat, JUG.y + OJO, JUG.z + ux*lat);
        d.set(ux, 0.10, uz).normalize();
        rc.set(o, d);
        try { const h = rc.intersectObjects(lista, true);
              if (h.length) libre = Math.min(libre, h[0].distance); }
        catch(e){}
      }
      if (libre > mejorLibre){ mejorLibre = libre; mejor = off; }
      if (libre > 6.1) break;
    }
    return mejor;
  },
  paso(dt){
    this.t += dt;
    const t = this.t;
    /* tres tiempos: se agacha y mira el suelo · agarra · levanta la vista */
    const baja = cl(t/1.5, 0, 1);
    const agarra = cl((t - 1.7)/1.1, 0, 1);
    /* el tramo nuevo: con la llave ya en el puño, la mano sube hasta el ojo y se
       queda un segundo. Recién después empieza a levantarse la vista. */
    const muestra = cl((t - 2.9)/0.9, 0, 1) * (1 - cl((t - 5.1)/0.8, 0, 1));
    const sube = cl((t - 4.3)/1.9, 0, 1);
    /* la vista baja a la llave y después sube hasta el ángulo que `arranca()`
       calculó contra la altura real del terreno donde quedó el camello */
    /* LA VISTA BAJA HASTA −0,78 Y NO HASTA −0,92. A 53° la cámara mira casi a
       plomo y de las manos sólo se ve el DORSO: una loza plana con los dedos
       escondidos detrás. A 45° la mano se ve de tres cuartos y los dedos se
       recortan contra el pasto, que es lo que hace que se lea el agarre. */
    JUG.pitch = lerp(lerp(-0.05, -0.78, baja), this.pitchFin, sube);
    JUG.yaw = this.yaw0;
    AND.ojo = OJO - baja*0.42 + sube*0.30;
    /* LA LUZ ENTRA CON EL LEVANTAR LA VISTA Y NO ANTES. Encendida desde el
       primer cuadro, con la cara pegada al suelo y las manos a medio metro, un
       foco de nueve en el ojo quemaba: medido, los dos brazos salían blancos
       puros y el pasto en primer plano un verde plano sin un pliegue. Es para
       el camello, que está a seis metros y medio, así que sube con `sube`. */
    if (this.luz) this.luz.intensity = 9.0 * sube;
    if (this.manos) ponManos(this.manos, baja, agarra, sube, muestra);
    if (t > 5.6){
      $('cTexto').textContent = '…';
      $('cTexto').classList.add('ver');
    }
    if (t >= this.dur) this.termina();
  },
  termina(){
    this.on = false;
    MODO = 'juego';
    $('cine').classList.remove('abre');
    $('cTexto').classList.remove('ver');
    $('cSaltar').style.display = '';
    setTimeout(() => $('cine').classList.remove('on'), 520);
    if (this.manos){ cam.remove(this.manos); soltar(this.manos); this.manos = null; }
    if (this.antorchaGuardada){ this.antorchaGuardada.visible = true; this.antorchaGuardada = null; }
    if (this.luz){ cam.remove(this.luz); this.luz.dispose && this.luz.dispose(); this.luz = null; }
    $('hud').classList.add('on');
    JUG.pitch = -0.05;
    AND.ojo = OJO;
    /* y sale a correrte: modo caza permanente, sin importar la hora. El cuello
       vuelve a su eje, que si no corre con la cabeza torcida para siempre. */
    if (CAM3){ CAM3.userData.cuello.rotation.y = 0;
               CAM3.userData.miraCuello = null; CAM3.userData.miraCabeza = null; }
    /* SE LO CORRE UN POCO Y SE LE DA UN INSTANTE. Terminando la cinemática con
       el bicho a seis metros y medio y embistiendo a 7,4 m/s, te agarra ANTES de
       que llegues a arrancar: medido en el banco, el primer cuadro de partida ya
       venía con el golpe puesto y el camello a ciento treinta metros, o sea que
       la escena del susto terminaba en un castigo que nadie pudo evitar. A diez
       metros y con nueve décimas de quedarse clavado —que es lo que tarda uno en
       ponerse a correr— la persecución empieza a la par y se le gana. */
    BICHO.x = JUG.x - Math.sin(this.yaw0)*10.5;
    BICHO.z = JUG.z - Math.cos(this.yaw0)*10.5;
    BICHO.modo = 'embiste';
    BICHO.golpe = 0.9;
    BICHO.caza = true;
    /* y de acá en adelante no amanece más: el día terminó */
    clavaNoche();
    MIS.avanza();
    aviso(TX('aCorre'));
  }
};

/* las dos manos de primera persona: dos brazos que entran desde abajo del
   cuadro. Es el mismo recurso que Vecindario, y con la misma lección: en un
   marco vertical el semiancho visible a medio metro son dieciocho centímetros,
   así que unos hombros a la distancia real dejan las manos por fuera del
   cuadro. Van juntas, cerca del eje. */
/* ══════════════════════════ LAS DOS MANOS DE PRIMERA PERSONA ═══════════════
   DOS ANTEBRAZOS NO SON DOS MANOS, y ése era todo el problema del plano de la
   llave: en la captura se veían dos postes marrones que subían y bajaban
   juntos, con la llave apareciendo de golpe encima de uno. Un gesto de agarrar
   necesita tres cosas que ahí no estaban:

   1. DEDOS QUE SE CIERRAN. Sin dedos no hay agarre posible: la mano llega, la
      llave aparece, y el jugador entiende que se la teletransportaron.
   2. LAS DOS MANOS HACIENDO COSAS DISTINTAS. Dos copias espejadas moviéndose en
      el mismo cuadro se leen a máquina. La derecha agarra; la izquierda entra
      después, más abajo y menos, apoyándose — que es lo que hace cualquiera al
      juntar algo del piso.
   3. LA MUÑECA. El antebrazo baja recto y es la muñeca la que gira para que la
      palma mire el suelo. Sin ese giro la mano llega de canto.

   La jerarquía es la de un brazo: pivote del codo → antebrazo, y colgando de su
   punta el pivote de la MUÑECA → palma y cinco dedos. Así girar la muñeca no
   despega la palma del antebrazo, que es el mismo motivo por el que los cuatro
   personajes tienen pivotes y no cajas sueltas. */
function armaManos(){
  const g = new T.Group();
  const mat = matPiel;
  g.userData.br = [];
  /* LAS MEDIDAS SALEN DE UNA CUENTA, NO DEL TANTEO.
     Los brazos cuelgan del ojo, y el ojo abre 66° en vertical, o sea 33° para
     arriba y 33° para abajo del eje. Un brazo puesto a 30 cm por debajo del ojo
     y a 30 cm de profundidad queda a atan(0,30/0,30) = 45° hacia abajo: FUERA
     del cuadro. Medido, la primera versión no mostraba una sola mano.
     Para que las manos caigan alrededor del 70 % del alto hace falta un ángulo
     de unos 13°, o sea `y = z · tan(13°) = 0,23·z`. A 52 cm de profundidad eso
     son 12 cm por debajo del eje. */
  for (const sx of [-1, 1]){
    const b = new T.Object3D();
    b.position.set(sx*0.150, -0.12, -0.50);
    const ante = new T.Mesh(geoCaja, mat);
    ante.scale.set(0.074, 0.215, 0.080);
    ante.position.y = -0.108;
    b.add(ante);

    /* la muñeca, en la PUNTA del antebrazo */
    const mun = new T.Object3D();
    mun.position.y = 0.005;
    b.add(mun);
    const palma = new T.Mesh(geoCaja, mat);
    palma.scale.set(0.112, 0.038, 0.112);
    palma.position.set(0, 0.058, -0.040);
    mun.add(palma);

    /* CUATRO DEDOS Y UN PULGAR, cada uno con su pivote en el nudillo: doblar el
       dedo es girar el pivote, y así la punta describe un arco en vez de
       hundirse dentro de la palma. El pulgar va del otro lado y cierra CONTRA
       los otros cuatro, que es lo único que hace que un puño se lea a agarre y
       no a mano cerrada. */
    const dedos = [];
    for (let d = 0; d < 4; d++){
      const piv = new T.Object3D();
      piv.position.set((-1.5 + d)*0.030, 0.058, -0.094);
      mun.add(piv);
      const m = new T.Mesh(geoCaja, mat);
      m.scale.set(0.023, 0.030, 0.098);
      m.position.z = -0.049;
      piv.add(m);
      dedos.push(piv);
    }
    const pul = new T.Object3D();
    pul.position.set(sx*0.052, 0.052, -0.048);
    mun.add(pul);
    const mp = new T.Mesh(geoCaja, mat);
    mp.scale.set(0.028, 0.030, 0.074);
    mp.position.z = -0.037;
    pul.add(mp);

    b.userData = { mun, dedos, pul };
    g.add(b);
    g.userData.br.push(b);
  }

  /* LA LLAVE CUELGA DE LA MANO DERECHA Y NO DEL GRUPO. Puesta suelta en el
     grupo se quedaba quieta mientras el brazo subía y bajaba: en el cuadro se
     veía una chapita flotando al lado de una mano, que es lo contrario de
     «agarrás la llave». Ahora cuelga de la MUÑECA derecha, así que además la
     acompaña cuando la muñeca gira. Y va con anillo: dos chapitas sueltas no se
     leen a llavero. */
  const k = new T.Group();
  const paleta = new T.Mesh(new T.BoxGeometry(0.055, 0.014, 0.21), matLlave);
  paleta.position.z = -0.10;
  k.add(paleta);
  for (let j = 0; j < 2; j++){
    const dien = new T.Mesh(new T.BoxGeometry(0.020, 0.014, 0.030), matLlave);
    dien.position.set(0.026, 0, -0.16 + j*0.045);
    k.add(dien);
  }
  const aro = new T.Mesh(new T.TorusGeometry(0.036, 0.009, 4, 10), matLlave);
  aro.rotation.y = Math.PI/2;
  aro.position.z = 0.02;
  k.add(aro);
  /* Y ATRAVESADA, no apuntando hacia adelante. Con la paleta sobre su propio
     −Z el jugador la ve DE PUNTA: medido en la captura, dos píxeles de canto
     asomando por encima del puño. Girada un cuarto de vuelta se ve de costado y
     ahí sí se lee a llave. */
  k.position.set(0.014, 0.070, -0.072);
  k.rotation.set(0.25, 1.40, 0);
  k.visible = false;
  g.userData.br[1].userData.mun.add(k);
  g.userData.llave = k;
  return g;
}

/* EL GESTO, EN CUATRO TIEMPOS Y NO EN UNO.
   `baja` es agacharse, `agarra` es el brazo llegando, `sube` es enderezarse. De
   `agarra` salen DOS curvas distintas y ahí está casi todo: la mano llega
   primero (`alcanza`) y recién cuando llegó se cierran los dedos (`cierra`).
   Con una sola curva la mano se cierra mientras todavía está bajando, o sea que
   agarra el aire y llega con el puño hecho. */
function ponManos(g, baja, agarra, sube, muestra){
  const br = g.userData.br;
  const alcanza = cl(agarra / 0.55, 0, 1);
  const cierra  = cl((agarra - 0.50) / 0.35, 0, 1);
  const mu = muestra || 0;
  for (let i = 0; i < 2; i++){
    const b = br[i], u = b.userData;
    const der = (i === 1);
    /* LA IZQUIERDA VA MENOS Y LLEGA DESPUÉS. Las dos haciendo lo mismo se leen
       a máquina; con la derecha adelante y la izquierda apoyándose, se lee a
       persona. */
    const k = der ? 1 : 0.55;
    const ret = der ? 0 : 0.10;                  /* la izquierda se atrasa */
    const al = cl((alcanza - ret) / (1 - ret), 0, 1);
    /* Y DESPUÉS LA SUBE A LA CÁMARA, que es el plano que de verdad muestra la
       llave. Mirada desde arriba, una mano hecha de cajas a cuarenta píxeles es
       una caja: probé cuatro encuadres del agarre a ras del suelo y ninguno se
       leía. Lo que sí se lee es lo que hacen todos los juegos en primera
       persona: agarrar abajo —donde no importa que se vea poco— y LEVANTAR el
       objeto hasta el ojo, donde ocupa un tercio del cuadro. La derecha sube
       con la llave; la izquierda se queda abajo y sale de cuadro. */
    const sube2 = der ? mu : 0;
    b.position.y = -0.26 + baja*0.14 + al*0.03*k - sube*0.16 + sube2*0.11;
    b.position.z = -0.46 - baja*0.10 - al*0.07*k + sube*0.06 + sube2*0.07;
    if (!der) b.position.y -= mu*0.22;
    b.rotation.x = -0.35 + baja*0.55 - al*0.18*k - sube*0.40 + sube2*0.34;
    b.rotation.z = (der ? -1 : 1) * (0.16 + al*0.30*k);
    /* PROBÉ GIRAR LOS DOS BRAZOS HACIA ADENTRO para que convergieran sobre la
       llave, y midiendo la captura salió PEOR: con medio radián de guiñada la
       palma se separa visualmente del antebrazo y las dos piezas se leen como
       dos bloques flotando, no como un brazo. A esta resolución —el destino de
       render mide 298×138, o sea que una mano son unos cuarenta píxeles— lo
       único que se lee es el CONTORNO, y un contorno partido en dos no se lee.
       Los brazos entran rectos desde abajo y lo que converge es la inclinación
       lateral, que no rompe la continuidad. */
    b.rotation.y = (der ? -1 : 1) * al * 0.10 * k;
    /* la muñeca gira para poner la palma mirando el suelo mientras baja, y
       vuelve al enderezarse */
    u.mun.rotation.x = -0.08 - baja*0.16 - al*0.20*k + sube*0.30;
    u.mun.rotation.z = (der ? 1 : -1) * al * 0.22 * k;
    u.mun.rotation.y = (der ? -1 : 1) * al * 0.12 * k;
    /* los dedos: abiertos mientras llega, cerrados sobre la llave al final.
       Se abren un poco de más en el camino —la mano se prepara— que es lo que
       hace que el cierre se note. */
    const abre = -0.30 * al * k;
    const cerr = (der ? 1.05 : 0.70) * cierra;
    for (let d = 0; d < 4; d++){
      /* el meñique cierra un pelo más que el índice: una mano en la que los
         cuatro dedos hacen exactamente lo mismo se ve de plástico */
      u.dedos[d].rotation.x = abre + cerr * (0.88 + d*0.09);
    }
    u.pul.rotation.x = abre*0.6 + cerr*0.75;
    u.pul.rotation.y = (der ? -1 : 1) * (0.35 + cerr*0.45);
  }
  /* LA LLAVE APARECE CUANDO LOS DEDOS YA SE ESTÁN CERRANDO, no antes: si
     aparece con la mano abierta se la ve materializarse en el aire. */
  g.userData.llave.visible = cierra > 0.35;
}
