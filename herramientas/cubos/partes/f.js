/* ══════════════════════ EL JUEGO ══════════════════════
   Las manos, el reloj, las pantallas y la paleta. Todo lo que hay debajo —la
   reja, el atlas, el juez— ya existe; esto es lo que lo hace jugable. */

/* ══════════ LOS NOMBRES ══════════
   Cincuenta y siete bloques base en tres idiomas, y los cuarenta y ocho de
   color DERIVADOS de `COLORES` mas una palabra: asi el nombre del bloque y su
   entrada en la tabla de bloques no pueden discrepar, que es exactamente lo que
   pasa cuando se escriben dos listas a mano. */
const NOMBRES = {
  pasto:['Pasto','Grass','Grama'], tierra:['Tierra','Dirt','Terra'],
  camino:['Camino','Path','Caminho'], arena:['Arena','Sand','Areia'],
  grava:['Grava','Gravel','Cascalho'], nieve:['Nieve','Snow','Neve'],
  hielo:['Hielo','Ice','Gelo'], hojas:['Hojas','Leaves','Folhas'],
  hojasO:['Hojas de otoño','Autumn leaves','Folhas de outono'],
  cactus:['Cactus','Cactus','Cacto'], calabaza:['Calabaza','Pumpkin','Abóbora'],
  melon:['Melón','Melon','Melancia'], hongo:['Hongo','Mushroom','Cogumelo'],
  musgo:['Musgo','Moss','Musgo'],
  piedra:['Piedra','Stone','Pedra'], adoquin:['Adoquín','Cobblestone','Pedregulho'],
  ladriP:['Ladrillo de piedra','Stone bricks','Tijolo de pedra'],
  ladriPM:['Piedra musgosa','Mossy bricks','Pedra com musgo'],
  ladrillo:['Ladrillo','Bricks','Tijolo'], arenisca:['Arenisca','Sandstone','Arenito'],
  andesita:['Andesita','Andesite','Andesito'], diorita:['Diorita','Diorite','Diorito'],
  granito:['Granito','Granite','Granito'], pizarra:['Pizarra','Deepslate','Ardósia'],
  obsidiana:['Obsidiana','Obsidian','Obsidiana'], basalto:['Basalto','Basalt','Basalto'],
  cuarzo:['Cuarzo','Quartz','Quartzo'], terracota:['Terracota','Terracotta','Terracota'],
  rojiza:['Piedra rojiza','Red rock','Pedra vermelha'],
  prismarina:['Prismarina','Prismarine','Prismarinho'],
  troncoR:['Tronco de roble','Oak log','Tronco de carvalho'],
  troncoO:['Tronco oscuro','Dark log','Tronco escuro'],
  troncoA:['Tronco de abedul','Birch log','Tronco de bétula'],
  tablaR:['Tabla de roble','Oak planks','Tábua de carvalho'],
  tablaO:['Tabla oscura','Dark planks','Tábua escura'],
  tablaA:['Tabla de abedul','Birch planks','Tábua de bétula'],
  tablaN:['Tabla negra','Black planks','Tábua preta'],
  bambu:['Bambú','Bamboo','Bambu'],
  hierro:['Hierro','Iron','Ferro'], oro:['Oro','Gold','Ouro'],
  diamante:['Diamante','Diamond','Diamante'], esmeralda:['Esmeralda','Emerald','Esmeralda'],
  lapis:['Lapislázuli','Lapis','Lápis-lazúli'], cobre:['Cobre','Copper','Cobre'],
  carbon:['Carbón','Coal','Carvão'], redstone:['Redstone','Redstone','Redstone'],
  luminosa:['Piedra luminosa','Glowstone','Pedra luminosa'],
  linterna:['Linterna','Lantern','Lanterna'], lava:['Lava','Lava','Lava'],
  fuego:['Fuego','Fire','Fogo'], agua:['Agua','Water','Água'],
  vidrio:['Vidrio','Glass','Vidro'], farol:['Farol','Sea lantern','Lanterna do mar']
};
const MATCOL = { lana:['Lana','Wool','Lã'], horm:['Hormigón','Concrete','Concreto'],
                 vid:['Vidrio','Glass','Vidro'] };
const CATNOM = {
  nat:  ['NATURAL','NATURE','NATUREZA'], pie: ['PIEDRA','STONE','PEDRA'],
  mad:  ['MADERA','WOOD','MADEIRA'],     met: ['METAL','METAL','METAL'],
  luz:  ['LUZ','LIGHT','LUZ'],           lana:['LANA','WOOL','LÃ'],
  horm: ['HORMIGÓN','CONCRETE','CONCRETO'], vidr:['VIDRIO','GLASS','VIDRO']
};
const IDX_L = { es: 0, en: 1, pt: 2 };
function nombreBloque(b){
  const id = BLOQUES[b].id, i = IDX_L[LANG] || 0;
  if (NOMBRES[id]) return NOMBRES[id][i];
  const p = id.indexOf('_');
  if (p > 0){
    const mat = MATCOL[id.slice(0, p)], col = COLORES.find(c => c[0] === id.slice(p + 1));
    if (mat && col) return mat[i] + ' ' + (i === 0 ? col[0] : i === 1 ? col[2] : col[3]);
  }
  return id;
}

/* ══════════ ESTADO ══════════ */
let LANG = 'es', PANT = 'idioma', GIRADO = true, SUCIA = true;
let MANO = 1, CATV = 'nat', RELOJ_EL = 'normal';
/* ── DONDE APARECE EL JUGADOR SALE DE UNA CUENTA ──
   Tiene que ver la parcela entera Y llegar al centro con el alcance de siete:
   con pitch -0.55 el rayo toca el piso a 6.5 m, o sea justo en (8, 0, 8). Mas
   lejos y el primer bloque no se puede poner; mas cerca y no se ve el terreno. */
let JUG = { x: N/2, y: 3.4, z: N - 1.5, yaw: 0, pitch: -0.55, vx: 0, vy: 0, vz: 0 };
/* ── LAS TRES FUENTES DE MOVIMIENTO VAN SEPARADAS ──
   El joystick, los botones de subir y bajar y el teclado escriben cada uno lo
   suyo y el bucle los suma. Con una sola variable, el teclado —que se lee TODOS
   los cuadros— le pone cero al boton de subir en el cuadro siguiente al que se
   apreto, y el boton deja de funcionar sin que nada falle. */
let ADE = 0, LAT = 0, SUB = 0;          /* lo que resulta, de -1 a 1 */
let jADE = 0, jLAT = 0;                 /* el joystick */
let bSUB = 0;                           /* los botones de subir y bajar */
let tADE = 0, tLAT = 0, tSUB = 0;       /* el teclado */
let RES = null;                          /* lo que devolvio el juez */
let ULT_AVISO = 999;
const ALCANCE = 7.0;
const VEL = 7.2, VELY = 5.4, ACEL = 26, ROCE = 12;

/* ── LO QUE SE GUARDA PASA POR UNA SOLA PUERTA ──
   Con el `localStorage.setItem` escrito adentro de cada manejador de boton, el
   ajuste se guarda SOLO por ese camino: medido, cambiar la calidad o el idioma
   desde cualquier otro lado y recargar volvia a los valores de fabrica. */
function guarda(k, v){ try { localStorage.setItem(k, v); } catch (e) {} }
function lee(k, d){ try { return localStorage.getItem(k) || d; } catch (e) { return d; } }
function ponCalidad(c){ if (!CALIDADES[c]) return CAL; calidad(c); guarda('cubos_cal', c); return CAL; }
function ponReloj(r){ if (RELOJES[r]) { RELOJ_EL = r; guarda('cubos_reloj', r); } return RELOJ_EL; }
function ponLang(l){ if (!TXT[l]) return LANG; LANG = l; guarda('cubos_lang', l); pintaIdioma(); return LANG; }

/* ══════════ EL MARCO ══════════ */
function acomoda(){
  const W = innerWidth, H = innerHeight, vert = H > W;
  const m = document.getElementById('marco');
  GIRADO = vert;
  m.className = vert ? 'girado' : 'derecho';
  m.style.width  = (vert ? H : W) + 'px';
  m.style.height = (vert ? W : H) + 'px';
  if (render) mide();
}
/* ── UN ARRASTRE DE PANTALLA NO ES UN ARRASTRE DEL CUADRO ──
   Con el marco girado noventa grados, mover el dedo hacia la derecha de la
   pantalla es moverlo hacia ABAJO adentro del juego. Sin esta conversion, el
   joystick manda para el costado equivocado y mirar sale al reves — es el mismo
   defecto que ya costo una medicion en PUERTA BLANCA. */
function aCuadro(dx, dy){ return GIRADO ? [dy, -dx] : [dx, dy]; }

/* ══════════ LA PUNTERIA ══════════ */
function dirCam(){
  const cp = Math.cos(JUG.pitch), sp = Math.sin(JUG.pitch);
  return [-Math.sin(JUG.yaw)*cp, sp, -Math.cos(JUG.yaw)*cp];
}
/* ── EL SUELO TIENE QUE SER APOYO, SI NO EL JUEGO NO ARRANCA ──
   La parcela empieza VACIA, asi que si el bloque nuevo necesitara una cara de
   otro bloque no habria forma de poner el primero. El rayo, cuando no pega en
   nada, se cruza con el plano del piso. */
function apunta(){
  const d = dirCam();
  const h = raya(JUG.x, JUG.y, JUG.z, d[0], d[1], d[2], ALCANCE);
  if (h) return { rompe: { x: h.x, y: h.y, z: h.z },
                  pone: { x: h.x + h.cara[0], y: h.y + h.cara[1], z: h.z + h.cara[2] } };
  if (d[1] < -1e-4){
    const t = -JUG.y/d[1];
    if (t > 0 && t <= ALCANCE){
      const px = Math.floor(JUG.x + d[0]*t), pz = Math.floor(JUG.z + d[2]*t);
      if (px >= 0 && px < N && pz >= 0 && pz < N) return { rompe: null, pone: { x: px, y: 0, z: pz } };
    }
  }
  return { rompe: null, pone: null };
}

/* ══════════ EL CHOQUE ══════════
   El jugador vuela —en un build battle de dos minutos y medio, la gravedad solo
   sirve para caerse de la torre que uno acaba de hacer— pero NO atraviesa lo
   que construyo: adentro de un bloque la camara ve negro y eso se lee a juego
   roto, no a estar adentro de una casa. */
function solido(b){ return b > 0 && BLOQUES[b].id !== 'agua'; }
function choca(x, y, z){
  const r = 0.30, ry = 0.62;
  for (let ix = Math.floor(x - r); ix <= Math.floor(x + r); ix++)
    for (let iy = Math.floor(y - ry); iy <= Math.floor(y + ry); iy++)
      for (let iz = Math.floor(z - r); iz <= Math.floor(z + r); iz++)
        if (solido(bloqueEn(ix, iy, iz))) return true;
  return false;
}
function pasoJug(dt){
  const cy = Math.cos(JUG.yaw), sy = Math.sin(JUG.yaw);
  const dx = (-sy)*ADE + cy*LAT, dz = (-cy)*ADE + (-sy)*LAT;
  const n = Math.hypot(dx, dz) || 1, k = Math.min(1, Math.hypot(ADE, LAT));
  const ox = dx/n*VEL*k, oz = dz/n*VEL*k, oy = SUB*VELY;
  const f = 1 - Math.exp(-(k || Math.abs(SUB) ? ACEL : ROCE)*dt);
  JUG.vx += (ox - JUG.vx)*f; JUG.vz += (oz - JUG.vz)*f; JUG.vy += (oy - JUG.vy)*f;
  const nx = JUG.x + JUG.vx*dt, ny = JUG.y + JUG.vy*dt, nz = JUG.z + JUG.vz*dt;
  /* eje por eje: asi se desliza contra la pared en vez de clavarse en la esquina */
  if (!choca(nx, JUG.y, JUG.z)) JUG.x = nx; else JUG.vx = 0;
  if (!choca(JUG.x, ny, JUG.z)) JUG.y = ny; else JUG.vy = 0;
  if (!choca(JUG.x, JUG.y, nz)) JUG.z = nz; else JUG.vz = 0;
  JUG.x = cl(JUG.x, -9, N + 9); JUG.z = cl(JUG.z, -9, N + 9);
  JUG.y = cl(JUG.y, 0.62, ALTO + 12);
  JUG.pitch = cl(JUG.pitch, -1.52, 1.52);
}

/* ══════════ PONER Y SACAR ══════════ */
function pon(){
  const a = apunta();
  if (!a.pone || !dentro(a.pone.x, a.pone.y, a.pone.z)) { son('nada'); return false; }
  if (bloqueEn(a.pone.x, a.pone.y, a.pone.z)) { son('nada'); return false; }
  /* no se puede poner un bloque adentro de uno mismo */
  const g = REJA[idx(a.pone.x, a.pone.y, a.pone.z)];
  REJA[idx(a.pone.x, a.pone.y, a.pone.z)] = MANO;
  const mal = choca(JUG.x, JUG.y, JUG.z);
  REJA[idx(a.pone.x, a.pone.y, a.pone.z)] = g;
  if (mal){ son('nada'); return false; }
  ponBloque(a.pone.x, a.pone.y, a.pone.z, MANO);
  SUCIA = true; if (RUN) RUN.puestos++;
  son('pon'); return true;
}
function sac(){
  const a = apunta();
  if (!a.rompe){ son('nada'); return false; }
  ponBloque(a.rompe.x, a.rompe.y, a.rompe.z, 0);
  SUCIA = true; if (RUN) RUN.sacados++;
  son('sac'); return true;
}

/* ══════════ LA PALETA ══════════ */
function texDe(b, cara){ const t = BLOQUES[b].tex; return Array.isArray(t) ? t[cara] : t; }
function dibujaFicha(cv, b){
  const c = cv.getContext('2d'); c.imageSmoothingEnabled = false;
  const W = cv.width, H = cv.height, hT = Math.round(H*0.38);
  c.clearRect(0, 0, W, H);
  /* ── UN FONDO GRIS DEBAJO, PORQUE HAY BLOQUES TRANSLUCIDOS ──
     El vidrio se dibuja al 20 % de opacidad: sobre la ficha casi negra los
     dieciseis vidrios de color salian todos del mismo negro y la pestaña entera
     era ilegible. Los opacos lo tapan entero, asi que no cuesta nada. */
  c.fillStyle = '#6f7b88'; c.fillRect(0, 0, W, H);
  const pon2 = (nom, y0, y1) => {
    const i = TILES[nom]; if (i === undefined) return;
    c.drawImage(atlasCv, (i % ATL)*TL, Math.floor(i/ATL)*TL, TL, TL, 0, y0, W, y1 - y0);
  };
  pon2(texDe(b, 0), 0, hT); pon2(texDe(b, 1), hT, H);
  /* la cara de arriba mas clara y la de al lado mas oscura: es lo unico que
     hace que un cuadrado plano se lea a cubo */
  c.fillStyle = 'rgba(255,255,255,.18)'; c.fillRect(0, 0, W, hT);
  c.fillStyle = 'rgba(0,0,0,.16)';       c.fillRect(0, hT, W, H - hT);
}
let PIEZAS = [];
function armaPaleta(){
  const tabs = document.getElementById('palTabs'), reja = document.getElementById('palReja');
  tabs.innerHTML = ''; reja.innerHTML = ''; PIEZAS = [];
  for (const c of CATS){
    const b = document.createElement('button');
    b.className = 'bt sec'; b.dataset.cat = c;
    b.textContent = CATNOM[c][IDX_L[LANG] || 0];
    b.onclick = () => { CATV = c; son('ui'); pintaPaleta(); };
    tabs.appendChild(b);
  }
  for (let i = 1; i < NBLOQ; i++){
    const d = document.createElement('div');
    d.className = 'pieza'; d.dataset.b = i; d.title = nombreBloque(i);
    const cv = document.createElement('canvas'); cv.width = cv.height = 32;
    dibujaFicha(cv, i); d.appendChild(cv);
    d.onclick = () => { MANO = i; son('pal'); pintaMano(); cierraPaleta(); };
    reja.appendChild(d); PIEZAS.push(d);
  }
  pintaPaleta();
}
function pintaPaleta(){
  for (const b of document.getElementById('palTabs').children)
    b.classList.toggle('sel', b.dataset.cat === CATV);
  for (const d of PIEZAS){
    const b = +d.dataset.b;
    d.style.display = BLOQUES[b].cat === CATV ? '' : 'none';
    d.classList.toggle('sel', b === MANO);
  }
}
function abrePaleta(){ document.getElementById('paleta').classList.add('on'); CATV = BLOQUES[MANO].cat || CATV; pintaPaleta(); }
function cierraPaleta(){ document.getElementById('paleta').classList.remove('on'); }
function pintaMano(){
  dibujaFicha(document.getElementById('manoCv'), MANO);
  document.getElementById('manoNom').textContent = nombreBloque(MANO);
}

/* ══════════ LA OBRA DEL MENU ══════════
   Un menu con la parcela VACIA detras muestra exactamente lo que el juego no
   es. Esta escena se levanta al arrancar y se borra al tocar JUGAR, asi que lo
   primero que se ve es una obra terminada girando: el juego explicado sin una
   sola palabra. */
function demoMenu(){
  limpiaReja();
  const p = (x, y, z, b) => ponBloque(x, y, z, b);
  /* la casa */
  for (let z = 2; z <= 8; z++) for (let x = 2; x <= 8; x++) p(x, 0, z, 16);
  for (let y = 1; y <= 3; y++) for (let z = 2; z <= 8; z++) for (let x = 2; x <= 8; x++)
    if (x === 2 || x === 8 || z === 2 || z === 8) p(x, y, z, 34);
  for (let y = 1; y <= 3; y++) for (const [x, z] of [[2,2],[8,2],[2,8],[8,8]]) p(x, y, z, 31);
  for (const [x, z] of [[4,2],[6,2],[2,5],[8,5],[5,8]]) p(x, 2, z, 52);
  p(5, 1, 2, 0); p(5, 2, 2, 0);                      /* la puerta */
  for (let k = 0; k <= 3; k++) for (let z = 2 + k; z <= 8 - k; z++) for (let x = 2 + k; x <= 8 - k; x++){
    const b2 = x === 2 + k || x === 8 - k || z === 2 + k || z === 8 - k;
    if (b2 || k === 3) p(x, 4 + k, z, 19);
  }
  p(3, 8, 3, 31); p(3, 7, 3, 31);                    /* la chimenea */
  /* el arbol */
  for (let y = 1; y <= 4; y++) p(12, y, 11, 31);
  for (let y = 4; y <= 6; y++) for (let z = -2; z <= 2; z++) for (let x = -2; x <= 2; x++){
    const r = Math.abs(x) + Math.abs(z) + (y - 4)*2;
    if (r <= 3 && !(x === 0 && z === 0 && y < 6)) p(12 + x, y + 1, 11 + z, 8);
  }
  /* el camino, el charco y el farol */
  for (let z = 9; z <= 15; z++) p(5, 0, z, 3);
  for (let x = 6; x <= 10; x++) p(x, 0, 12, 3);
  for (let z = 2; z <= 4; z++) for (let x = 11; x <= 13; x++) p(x, 0, z, 51);
  p(9, 1, 10, 31); p(9, 2, 10, 31); p(9, 3, 10, 47);
  for (const [x, z] of [[3,11],[6,14],[14,8],[2,13]]) p(x, 0, z, 13);
  SUCIA = true;
}
/* ── LA CAMARA DEL MENU ORBITA, Y ES LA MISMA ESCENA DEL JUEGO ──
   No hay una segunda animacion que mantener: se mueve el mismo lente. */
let ORB = 0.9;
function camMenu(dt){
  ORB += dt*0.075;
  const r = 20.0;
  /* ── SE APUNTA POR ENCIMA DE LA OBRA, NO A ELLA ──
     La columna del menu vive centrada, asi que una obra en el medio del cuadro
     queda justo detras de los botones: medido, la casa salia tapada por JUGAR.
     Apuntando doce metros por encima, la obra cae en el tercio de abajo —donde
     el velo esta abierto— y el titulo queda sobre el cielo. */
  cam.position.set(N/2 + Math.sin(ORB)*r, 10.5 + Math.sin(ORB*0.63)*2.0, N/2 + Math.cos(ORB)*r);
  cam.lookAt(N/2, 13.2, N/2);
  cam.updateMatrixWorld(true);
}

/* ══════════ PANTALLAS ══════════ */
const PANS = ['pMenu', 'pAjustes', 'pPausa', 'pTema', 'pPunt', 'pFin', 'pIdioma'];
function verPantalla(p){
  if (p === 'menu' && !RUN) demoMenu();
  PANT = p;
  for (const id of PANS) document.getElementById(id).classList.toggle('on', id === 'p' + p[0].toUpperCase() + p.slice(1));
  document.body.classList.toggle('jugando', p === 'juega');
  if (p !== 'juega') cierraPaleta();
  /* la cama suena en todas las pantallas menos la del idioma, que es anterior
     al primer gesto: medido, con la lista corta la pantalla del final quedaba
     en silencio absoluto (pico 0,0007) justo despues de la fanfarria */
  camaOn(p !== 'idioma');
}
function TX(k){ return (TXT[LANG] || TXT.es)[k]; }

function pintaIdioma(){
  const g = id => document.getElementById(id);
  g('mSub').textContent = TX('sub');
  g('bJugar').textContent = TX('jugar');  g('bAjustes').textContent = TX('ajustes');
  g('mJuez').textContent = hayLlave() ? TX('conLlave') : TX('sinLlave');
  g('mPie').textContent = TX('pie');
  g('aTit').textContent = TX('ajustes'); g('aGrafL').textContent = TX('graficos');
  g('aRelojL').textContent = TX('reloj'); g('aIdiL').textContent = TX('idioma');
  g('aLlaveL').textContent = TX('llave'); g('inLlave').placeholder = TX('pegar');
  g('bGuardar').textContent = TX('guardar'); g('bQuitar').textContent = TX('quitar');
  g('aAviso').textContent = TX('avisoLlave'); g('bVolver').textContent = TX('volver');
  g('puTit').textContent = TX('pausa'); g('bSeguir').textContent = TX('seguir');
  g('bBorrar').textContent = TX('borrar'); g('bMenu').textContent = TX('menu');
  g('bMenu2').textContent = TX('menu'); g('tCons').textContent = TX('construi');
  g('bEmpieza').textContent = TX('listo'); g('bSig').textContent = TX('siguiente');
  g('cTexto').textContent = TX('pensando'); g('fTit').textContent = TX('final');
  g('fTotal').textContent = TX('total'); g('bOtra').textContent = TX('otra');
  g('hBueno').textContent = TX('bien'); g('hMejor').textContent = TX('mejorar');
  g('hTitulo').textContent = TX('tema');
  filas();
  if (PIEZAS.length) { armaPaleta(); pintaMano(); }
  /* ── LO QUE YA SE ESCRIBIO UNA VEZ HAY QUE VOLVER A ESCRIBIRLO ──
     El tema del HUD, el cartel de la ronda y la pantalla de puntaje los escribe
     quien los muestra, una sola vez. Sin esto, cambiar de idioma en partida deja
     el juego en ingles con el tema en castellano: medido, los tres idiomas
     devolvian «Una cascada». Es el mismo defecto que costo 107 claves en Z Force. */
  pintaTema(); pintaPunt(); pintaFin();
}
function pintaTema(){
  if (!RUN || !temaActual()) return;
  const t = temaActual(), i = IDX_L[LANG] || 0;
  const r = TX('ronda') + ' ' + (RUN.ronda + 1) + ' / ' + RONDAS;
  document.getElementById('tema').textContent = t[1 + i];
  document.getElementById('subronda').textContent = r;
  document.getElementById('tRonda').textContent = r;
  const n = document.getElementById('tNom');
  n.textContent = t[1 + i];
  entra(n, Math.min(52, Math.round(innerHeight*0.062)));
}
/* ── EL TAMAÑO DEL TEMA SALE DE LO QUE MIDE, NO DE UN NUMERO ──
   Los cincuenta temas van de «Un gato» a «Una torta de cumpleaños» y encima en
   tres idiomas: con un tamaño fijo, medido, «Una hamburguesa» salia cortada por
   el borde derecho. Se achica hasta que la palabra mas larga entra de verdad. */
function entra(el, max){
  let s2 = max;
  el.style.fontSize = s2 + 'px';
  for (let k = 0; k < 24 && el.scrollWidth > el.clientWidth + 1; k++){
    s2 -= 2; el.style.fontSize = s2 + 'px';
  }
  return s2;
}
/* las tres filas de ajustes se dibujan de una lista: agregar una calidad o un
   reloj no puede obligar a acordarse de un boton en otro sitio */
function filas(){
  const arma = (cont, ops, act, cb) => {
    cont.innerHTML = '';
    for (const [v, txt] of ops){
      const b = document.createElement('button');
      b.className = 'bt sec' + (v === act() ? ' sel' : '');
      b.textContent = txt;
      b.onclick = () => { son('ui'); cb(v); filas(); };
      cont.appendChild(b);
    }
  };
  arma(document.getElementById('fGraf'),
       [['baja', TX('baja')], ['media', TX('media')], ['alta', TX('alta')]],
       () => CAL, ponCalidad);
  arma(document.getElementById('fReloj'),
       [['corto', TX('corto')], ['normal', TX('normal')], ['largo', TX('largo')]],
       () => RELOJ_EL, ponReloj);
  arma(document.getElementById('fIdioma'),
       [['es', 'ESPAÑOL'], ['en', 'ENGLISH'], ['pt', 'PORTUGUÊS']],
       () => LANG, ponLang);
  arma(document.getElementById('fModelo'),
       MODELOS.map(m => [m, m.replace('claude-', '').replace(/-\d+$/, '').toUpperCase()]),
       () => MODELO, v => ponModelo(v));
  document.getElementById('inLlave').value = hayLlave() ? '••••••••••••••••' : '';
  /* sin llave, elegir modelo no significa nada: la fila se va entera */
  document.getElementById('fModelo').style.display = hayLlave() ? '' : 'none';
}

/* ══════════ LO QUE EL JUEZ DE LA CASA SI PUEDE DECIR ══════════
   No puede decir si se parece al tema —no lo mira— pero SI puede decir que
   midio, y eso es informacion de verdad: «de lejos es una mancha plana» sale de
   que la desviacion del mapa de alturas dio cero. Un numero pelado no le enseña
   nada a nadie; estas dos frases son lo unico que el jugador puede accionar. */
const FRASE = {
  vol:    [['el tamaño está bien elegido','the size is right','o tamanho está certo'],
           ['apuntá a unos trescientos bloques','aim for about three hundred blocks','mire uns trezentos blocos']],
  varied: [['usaste muchas clases de bloque','you used a lot of different blocks','você usou muitos tipos de bloco'],
           ['meté más clases de bloque','mix in more kinds of block','misture mais tipos de bloco']],
  huella: [['ocupa bien la parcela','it fills the plot well','ocupa bem o terreno'],
           ['usá más parcela, a lo ancho y a lo alto','use more of the plot, wider and taller','use mais terreno, em largura e altura']],
  sim:    [['cierra bien por su eje','it reads symmetrical','fecha bem no seu eixo'],
           ['probá que cierre por algún eje','try making it symmetrical on one axis','tente fechar em algum eixo']],
  sup:    [['tiene detalle en la superficie','the surface has detail','a superfície tem detalhe'],
           ['vaciala por dentro y dale más detalle','hollow it out and add detail','esvazie por dentro e dê mais detalhe']],
  silueta:[['la silueta se lee de lejos','the silhouette reads from far away','a silhueta se lê de longe'],
           ['variá más la altura: es lo que más se lee de lejos','vary the height more: it is what reads from far away','varie mais a altura: é o que mais se lê de longe']]
};
function fraseCasa(k, mal){ const f = FRASE[k]; return f ? f[mal ? 1 : 0][IDX_L[LANG] || 0] : ''; }

/* ══════════ LA RONDA ══════════ */
function muestraTema(){ pintaTema(); verPantalla('tema'); }
function empiezaRonda(){
  ULT_AVISO = 999;
  JUG = { x: N/2, y: 3.4, z: N - 1.5, yaw: 0, pitch: -0.55, vx: 0, vy: 0, vz: 0 };
  jADE = jLAT = bSUB = tADE = tLAT = tSUB = ADE = LAT = SUB = 0; ponPulgar(0, 0);
  pintaTema();
  SUCIA = true;
  verPantalla('juega');
}
async function terminaRonda(){
  verPantalla('punt');
  document.getElementById('cargando').classList.toggle('on', hayLlave());
  document.getElementById('resu').style.display = hayLlave() ? 'none' : '';
  const t = temaActual(), i = IDX_L[LANG] || 0;
  const r = await juzga(t[1 + i], LANG);
  RES = r;
  anotaRonda(r.puntaje, r.juez, r);
  document.getElementById('cargando').classList.remove('on');
  document.getElementById('resu').style.display = '';
  pintaPunt();
  son('fin');
}
function pintaPunt(){
  const r = RES; if (!r || !RUN) return;
  const g = id => document.getElementById(id);
  g('rTema').textContent = TEMAS[RUN.temas[Math.min(RUN.ronda, RONDAS - 1)]][1 + (IDX_L[LANG] || 0)];
  g('pnum').textContent = r.puntaje;
  g('pjuez').textContent = r.vacio ? TX('vacio') : (r.juez === 'ia' ? TX('juezIA') : TX('juezLocal'));
  const tarj = (caja, txt, val) => {
    const d = g(caja); d.style.display = val ? '' : 'none';
    if (val) g(txt).textContent = val;
  };
  const cl2 = r.clave;
  tarj('tTitulo', 'xTitulo', r.titulo);
  tarj('tBueno', 'xBueno', r.bueno || (cl2 ? fraseCasa(cl2.fuerte, false) : ''));
  tarj('tMejor', 'xMejor', r.mejorar || (cl2 ? fraseCasa(cl2.flojo, true) : ''));
  const m = r.medida, pie = [];
  if (m && !m.vacio) pie.push(m.n + ' ' + TX('bloques').toLowerCase() + ' · ' + m.clases + ' ' + TX('clases').toLowerCase());
  if (r.fallo) pie.push(TX('error') + ': ' + r.fallo);
  g('rNota').textContent = pie.join(' — ');
  g('bSig').textContent = RUN.fase === 'final' ? TX('total') : TX('siguiente');
}
function pintaFin(){
  if (!RUN || !RUN.puntajes.length) return;
  const g = id => document.getElementById(id);
  g('pnum2').textContent = totalRun();
  const l = g('fLista'); l.innerHTML = '';
  for (let k = 0; k < RUN.puntajes.length; k++){
    const d = document.createElement('div');
    d.className = 'tarj uno';
    const h = document.createElement('h4'); h.textContent = TEMAS[RUN.temas[k]][1 + (IDX_L[LANG] || 0)];
    const p2 = document.createElement('p');
    p2.textContent = RUN.puntajes[k] + ' · ' + (RUN.jueces[k] === 'ia' ? TX('juezIA') : TX('juezLocal'));
    d.appendChild(h); d.appendChild(p2); l.appendChild(d);
  }
}
function sigue(){
  if (RUN.fase === 'final'){ pintaFin(); verPantalla('fin'); }
  else { RES = null; rondaSiguiente(); SUCIA = true; muestraTema(); }
}
function partidaNueva(){
  arrancaRun(0, RELOJES[RELOJ_EL]);
  SUCIA = true; muestraTema();
}

/* ══════════ ENTRADA ══════════ */
const DEDOS = new Map();
let DPAL = -1, DMIRA = -1, TOCO = null;
let REP_PON = 0, REP_SAC = 0;
const REP = 0.12;

function stickCentro(){
  const r = document.getElementById('stick').getBoundingClientRect();
  return [r.left + r.width/2, r.top + r.height/2, r.width/2];
}
function ponPulgar(lx, ly){
  document.getElementById('pulgar').style.transform = 'translate(' + lx + 'px,' + ly + 'px)';
}
function armaEntrada(){
  const m = document.getElementById('marco'), st = document.getElementById('stick');

  st.addEventListener('pointerdown', e => {
    e.preventDefault(); DPAL = e.pointerId;
    try { st.setPointerCapture(e.pointerId); } catch (x) {}
    moviStick(e);
  });
  const moviStick = e => {
    const [cx, cy, R] = stickCentro();
    let [lx, ly] = aCuadro(e.clientX - cx, e.clientY - cy);
    const d = Math.hypot(lx, ly);
    if (d > R){ lx = lx/d*R; ly = ly/d*R; }
    jADE = -ly/R; jLAT = lx/R;
    ponPulgar(lx, ly);
  };
  /* ── EL SEGUIMIENTO DEL JOYSTICK CUELGA DE LA VENTANA, NO DEL JOYSTICK ──
     `setPointerCapture` es lo que hace que un dedo que se sale del circulo siga
     mandando eventos al elemento, y puede FALLAR —tira si el puntero no esta
     activo, y en el banco falla siempre—. Colgado de la ventana el seguimiento
     no depende de que la captura haya funcionado: medido, con el dedo a 72 px
     del centro de un joystick de 71,5 de radio, el escucha del elemento no
     recibia nada y la palanca se quedaba clavada en cero. */
  addEventListener('pointermove', e => { if (e.pointerId === DPAL) moviStick(e); });
  const suelta = e => {
    if (e.pointerId !== DPAL) return;
    DPAL = -1; jADE = jLAT = 0; ponPulgar(0, 0);
  };
  addEventListener('pointerup', suelta);
  addEventListener('pointercancel', suelta);

  /* ── MIRAR: ARRASTRAR SOBRE EL LIENZO ──
     Y el mismo dedo hace las otras dos cosas, que es como funciona cualquier
     Minecraft de telefono: un toque corto pone un bloque y uno sostenido lo
     rompe. Si el dedo se movio, era mirar y no toco nada. */
  m.addEventListener('pointerdown', e => {
    if (PANT !== 'juega') return;
    if (e.target.closest && e.target.closest('.ac, #stick, .pan, #paleta')) return;
    DMIRA = e.pointerId;
    TOCO = { x: e.clientX, y: e.clientY, t: performance.now(), movio: 0, hizo: false };
  }, true);
  m.addEventListener('pointermove', e => {
    if (e.pointerId !== DMIRA || !TOCO) return;
    const [dx, dy] = aCuadro(e.clientX - TOCO.x, e.clientY - TOCO.y);
    TOCO.movio += Math.hypot(dx, dy);
    JUG.yaw   -= dx*0.0042;
    JUG.pitch -= dy*0.0042;
    JUG.pitch = cl(JUG.pitch, -1.52, 1.52);
    TOCO.x = e.clientX; TOCO.y = e.clientY;
    if (!TOCO.hizo && TOCO.movio < 14 && performance.now() - TOCO.t > 380){ TOCO.hizo = true; sac(); }
  }, true);
  const fin = e => {
    if (e.pointerId !== DMIRA) return;
    if (TOCO && !TOCO.hizo){
      const dur = performance.now() - TOCO.t;
      if (TOCO.movio < 14){ if (dur > 380) sac(); else pon(); }
    }
    DMIRA = -1; TOCO = null;
  };
  m.addEventListener('pointerup', fin, true);
  m.addEventListener('pointercancel', fin, true);

  /* ── Y SOLTAR UN BOTON TAMBIEN ──
     Si el dedo se corre del boton antes de levantarlo, el `pointerup` no llega
     nunca al elemento y el estado queda puesto: el jugador sube para siempre o
     el ponedor automatico no para mas. La lista dice que puntero tiene cada
     boton y la ventana los suelta a todos. */
  const SOLT = [];
  const boton = (id, abajo, arriba) => {
    const el = document.getElementById(id); el._pid = -1;
    el.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation();
      try { el.setPointerCapture(e.pointerId); } catch (x) {}
      el._pid = e.pointerId; abajo(); });
    SOLT.push(pid => { if (pid === undefined || el._pid === pid){ el._pid = -1; if (arriba) arriba(); } });
  };
  boton('bPon', () => { pon(); REP_PON = REP*2; }, () => REP_PON = 0);
  boton('bSac', () => { sac(); REP_SAC = REP*2; }, () => REP_SAC = 0);
  boton('bSube', () => bSUB = 1,  () => bSUB = 0);
  boton('bBaja', () => bSUB = -1, () => bSUB = 0);
  boton('bPal',  () => { son('ui'); abrePaleta(); });
  boton('bPausa',() => { son('ui'); verPantalla('pausa'); });

  const suelto = e => { for (const f of SOLT) f(e.pointerId); };
  addEventListener('pointerup', suelto);
  addEventListener('pointercancel', suelto);
  /* y si la pagina se va a segundo plano con un boton apretado, tambien: sin
     argumento, cada boton se suelta sin fijarse de que puntero venia */
  addEventListener('blur', () => { for (const f of SOLT) f(); bSUB = 0; REP_PON = REP_SAC = 0; });

  document.getElementById('bCierraPal').onclick = () => { son('ui'); cierraPaleta(); };
  document.getElementById('paleta').addEventListener('pointerdown', e => {
    if (e.target.id === 'paleta') cierraPaleta();
  });

  /* teclado, que en una notebook es lo unico que hay */
  const tec = {};
  addEventListener('keydown', e => {
    tec[e.code] = 1;
    if (e.code === 'Escape' && PANT === 'juega'){ verPantalla('pausa'); }
    else if (e.code === 'KeyE' && PANT === 'juega'){ abrePaleta(); }
  });
  addEventListener('keyup', e => { tec[e.code] = 0; });
  addEventListener('blur', () => { for (const k in tec) tec[k] = 0; tADE = tLAT = tSUB = 0; bSUB = 0; });
  TECLAS = tec;
}
let TECLAS = {};
function juntaEntrada(){
  tADE = (TECLAS.KeyW ? 1 : 0) - (TECLAS.KeyS ? 1 : 0);
  tLAT = (TECLAS.KeyD ? 1 : 0) - (TECLAS.KeyA ? 1 : 0);
  tSUB = (TECLAS.Space ? 1 : 0) - (TECLAS.ShiftLeft ? 1 : 0);
  ADE = cl(jADE + tADE, -1, 1);
  LAT = cl(jLAT + tLAT, -1, 1);
  SUB = cl(bSUB + tSUB, -1, 1);
}

/* ══════════ EL BUCLE ══════════
   Paso fijo de sesenta con interpolacion en el dibujo: un telefono a 30 y una
   notebook a 144 tienen que jugar el mismo juego, si no la velocidad de vuelo
   sale distinta y eso no es rendimiento, es otro juego. */
const PASO = 1/60;
let ACUM = 0, TPREV = 0;
function bucle(ms){
  requestAnimationFrame(bucle);
  const t = ms/1000;
  let dt = TPREV ? t - TPREV : PASO; TPREV = t;
  if (dt > 0.25) dt = 0.25;
  ACUM += dt;
  let n = 0;
  while (ACUM >= PASO && n++ < 8){
    ACUM -= PASO;
    if (PANT === 'juega'){
      juntaEntrada();
      pasoJug(PASO);
      if (REP_PON > 0){ REP_PON -= PASO; if (REP_PON <= 0){ pon(); REP_PON = REP; } }
      if (REP_SAC > 0){ REP_SAC -= PASO; if (REP_SAC <= 0){ sac(); REP_SAC = REP; } }
      pasoRun(PASO);
      if (RUN && RUN.fase === 'juzga'){ RUN.fase = 'esperando'; terminaRonda(); }
    }
  }
  if (SUCIA && armaMalla) { armaMalla(); SUCIA = false; }
  ponCam(dt);
  if (PANT === 'juega') hud();
  pinta();
}
function ponCam(dt){
  if (PANT !== 'juega' && PANT !== 'pausa'){
    camMenu(dt || 0); gMira.visible = false; gFantasma.visible = false; return;
  }
  cam.rotation.order = 'YXZ';
  cam.position.set(JUG.x, JUG.y, JUG.z);
  cam.rotation.y = JUG.yaw; cam.rotation.x = JUG.pitch; cam.rotation.z = 0;
  cam.updateMatrixWorld(true);
  const a = apunta();
  gMira.visible = PANT === 'juega' && !!a.rompe;
  if (a.rompe) gMira.position.set(a.rompe.x + 0.5, a.rompe.y + 0.5, a.rompe.z + 0.5);
  const ok = PANT === 'juega' && a.pone && dentro(a.pone.x, a.pone.y, a.pone.z) && !bloqueEn(a.pone.x, a.pone.y, a.pone.z);
  gFantasma.visible = !!ok;
  if (ok) gFantasma.position.set(a.pone.x + 0.5, a.pone.y + 0.5, a.pone.z + 0.5);
}
function hud(){
  if (!RUN) return;
  const q = Math.max(0, RUN.reloj - RUN.t);
  const mm = Math.floor(q/60), ss = Math.floor(q % 60);
  document.getElementById('reloj').textContent = mm + ':' + (ss < 10 ? '0' : '') + ss;
  const rel = document.getElementById('relleno');
  rel.style.width = (100*q/RUN.reloj).toFixed(1) + '%';
  rel.classList.toggle('poco', q < 30);
  const e = Math.ceil(q);
  if (e !== ULT_AVISO && (e === 30 || e === 10 || (e <= 5 && e >= 1))){ ULT_AVISO = e; son('reloj'); }
}

/* ══════════ ARRANQUE ══════════ */
function arranca(){
  LANG = lee('cubos_lang', '');
  RELOJ_EL = RELOJES[lee('cubos_reloj', 'normal')] ? lee('cubos_reloj', 'normal') : 'normal';
  cargaLlave();
  acomoda();
  armaEscena(document.getElementById('cv'));
  calidad(CALIDADES[lee('cubos_cal', 'media')] ? lee('cubos_cal', 'media') : 'media');
  demoMenu(); armaMalla();
  armaEntrada();
  armaPaleta(); pintaMano();
  addEventListener('resize', acomoda);
  addEventListener('orientationchange', () => setTimeout(acomoda, 120));
  /* el audio despierta con el PRIMER gesto de verdad, que es el boton de
     idioma y no JUGAR: ningun navegador deja sonar nada antes de uno */
  const desp = () => { audioDespierta(); };
  document.addEventListener('pointerdown', desp, { capture: true });
  document.addEventListener('keydown', desp, { capture: true });

  for (const b of document.querySelectorAll('#pIdioma [data-lang]'))
    b.onclick = () => { ponLang(b.dataset.lang); verPantalla('menu'); son('ui'); };
  document.getElementById('bJugar').onclick   = () => { son('ui'); partidaNueva(); };
  document.getElementById('bAjustes').onclick = () => { son('ui'); verPantalla('ajustes'); };
  document.getElementById('bVolver').onclick  = () => { son('ui'); verPantalla(RUN && RUN.fase === 'juega' ? 'pausa' : 'menu'); };
  document.getElementById('bEmpieza').onclick = () => { son('ui'); empiezaRonda(); };
  document.getElementById('bSeguir').onclick  = () => { son('ui'); verPantalla('juega'); };
  document.getElementById('bBorrar').onclick  = () => { son('sac'); limpiaReja(); SUCIA = true; verPantalla('juega'); };
  document.getElementById('bMenu').onclick    = () => { son('ui'); RUN = null; verPantalla('menu'); };
  document.getElementById('bMenu2').onclick   = () => { son('ui'); RUN = null; verPantalla('menu'); };
  document.getElementById('bSig').onclick     = () => { son('ui'); sigue(); };
  document.getElementById('bOtra').onclick    = () => { son('ui'); partidaNueva(); };
  document.getElementById('bGuardar').onclick = () => {
    const v = document.getElementById('inLlave').value.trim();
    if (v && v.indexOf('•') < 0) guardaLlave(v);
    son('ui'); pintaIdioma(); };
  document.getElementById('bQuitar').onclick  = () => { guardaLlave(''); son('ui'); pintaIdioma(); };

  if (LANG && TXT[LANG]){ pintaIdioma(); verPantalla('menu'); }
  else { LANG = 'es'; pintaIdioma(); verPantalla('idioma'); }
  requestAnimationFrame(bucle);
}
