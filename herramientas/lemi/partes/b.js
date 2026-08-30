/* ══════════════════════════════════════════════════════════════════════════
   VERGEL · una isla con el look pedido: pixelado, saturado, luz ambiental
   suave, cúmulos gordos y vegetación que se sostiene de cerca.

   Todo es procedural. No hay un solo archivo de textura ni de modelo: las
   hojas, la corteza, el pasto y las nubes se arman con ruido y geometría al
   abrir. Eso lo hace instantáneo y hace que «otra isla» sea un botón.

   EL PIXELADO no es un filtro encima. La escena se dibuja de verdad a una
   fracción de la resolución, en un render target con filtro NEAREST, y recién
   ese cuadro chico se agranda a pantalla completa. Por eso los bordes de las
   sombras y de las hojas quedan escalonados como corresponde, en vez de un
   mosaico borroso pegado sobre una imagen nítida.
   ══════════════════════════════════════════════════════════════════════════ */
'use strict';

const $ = id => document.getElementById(id);
const cl = (v,a,b) => Math.max(a, Math.min(b, v));
const lerp = (a,b,t) => a + (b-a)*t;

/* ───────────────────────── ajustes vivos ───────────────────────── */
const CFG = {
  /* AJUSTE FIJO, el que se pidió: brillo y saturación al tope, píxel en 2,
     contraste 1.10 y nueve niveles de color. Con nueve escalones por canal el
     degradado del cielo se corta en bandas anchas y todo el cuadro se empasta
     como un póster: es lo que da el aire de consola vieja. */
  pix: 2, sat: 2.2, bri: 1.6, con: 1.10, pos: 9,
  nubes: true, sombras: true, viento: true,
  /* fase del día: 0 medianoche · .25 amanecer · .5 mediodía · .75 atardecer */
  sol: 0.42, girar: true
};
/* el ciclo completo, día y noche, en tres minutos */
const CICLO = 180;

/* ══════════════════════════ RUIDO ══════════════════════════
   Value noise con hash entero: determinista, sin dependencias, y con la
   semilla se puede volver a sembrar la misma isla. */
let SEM = (Math.random()*1e9)|0;
/* OJO CON LA ARITMÉTICA. La versión obvia de este hash multiplica por
   constantes de 64 bits, y en JavaScript eso pasa de MAX_SAFE_INTEGER: el
   número pierde los bits bajos —justo los que dan el azar— y el hash devuelve
   casi siempre lo mismo. El resultado era un terreno degenerado, con la isla
   partida en pedazos flotando y el jugador apareciendo bajo el agua.
   Con Math.imul la multiplicación es de 32 bits exactos y el ruido se porta. */
function hash2(x, y, s){
  let h = Math.imul(x|0, 374761393) ^ Math.imul(y|0, 668265263) ^ Math.imul(s|0, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}
const suave = t => t*t*(3-2*t);
function ruido(x, y, s){
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x-xi, yf = y-yi;
  const u = suave(xf), v = suave(yf);
  return lerp(lerp(hash2(xi,yi,s), hash2(xi+1,yi,s), u),
              lerp(hash2(xi,yi+1,s), hash2(xi+1,yi+1,s), u), v);
}
function fbm(x, y, oct, s){
  let a = 0.5, f = 1, sum = 0, norm = 0;
  for (let i = 0; i < oct; i++){
    sum += a * ruido(x*f, y*f, s + i*97);
    norm += a; a *= 0.5; f *= 2;
  }
  return sum / norm;
}

/* ══════════════════════════ EL TERRENO ══════════════════════════
   Una isla: fbm por encima, y una máscara radial que la hunde en el agua
   en los bordes. La máscara no es un círculo limpio —se le suma ruido— así
   la costa entra y sale y aparecen bahías. */
/* ISLA GRANDE: 660 metros de lado. Con 190 se cruzaba caminando en menos de un
   minuto y no quedaba nada por descubrir. */
const MITAD = 330;         /* medio lado del mundo, en metros */
const MAR = 0;              /* nivel del agua */
let PLAYA = 1.6;            /* hasta acá es arena */

function alturaCruda(x, z){
  const s = SEM;
  const cont = fbm(x*0.0042, z*0.0042, 4, s) * 30;         /* colinas grandes */
  const det  = fbm(x*0.021,  z*0.021,  4, s+311) * 5.2;    /* rugosidad */
  const mont = Math.pow(fbm(x*0.0026, z*0.0026, 3, s+733), 2.4) * 34;
  return cont + det + mont;
}
function mascaraIsla(x, z){
  const d = Math.hypot(x, z) / MITAD;
  /* el borde de la isla ondula: sin esto es una moneda */
  const on = (fbm(x*0.0075, z*0.0075, 3, SEM+55) - 0.5) * 0.42;
  const t = cl((0.86 - d + on) / 0.38, 0, 1);
  return t*t*(3-2*t);
}
/* ══ LA CUEVA, EXCAVADA EN LA PROPIA FUNCIÓN DE ALTURA ══
   La boca de la cueva NO es una malla apoyada contra una loma: es un hueco de
   verdad hundido en el terreno. Y tiene que estar ACÁ ADENTRO, en `H()`, porque
   `H()` es la única fuente de la altura del suelo: la malla del terreno, las
   colisiones del jugador, dónde se planta cada árbol y dónde camina el camello
   salen todas de ella. Excavando la malla por un lado y el suelo por otro, uno
   caminaría por el aire sobre la boca o chocaría contra un hueco visible.

   El hueco es un CUENCO de coseno elevado —suave en el borde, hondo en el
   centro— que se recuesta contra la ladera. El coseno elevado y no una campana
   gaussiana porque tiene borde finito: fuera del radio vale exactamente cero y
   no hay que preguntarse a partir de dónde se puede despreciar.
   `CUEVA` se elige ANTES de armar el terreno; mientras sea null esto no cuesta
   más que una comparación. */
let CUEVA = null;
function H(x, z){
  const m = mascaraIsla(x, z);
  let h = alturaCruda(x, z) * m - (1 - m) * 9 - 3.2;
  if (CUEVA){
    /* PRIMERO EL CERRO Y DESPUÉS LA BOCA, en ese orden.
       Una boca de cueva necesita monte ENCIMA; sin eso es un pozo en un prado,
       que es exactamente como se veía cuando esto era sólo el cuenco: en la
       captura, un montículo de piedra apoyado sobre el pasto.
       El terreno de esta isla es suave y no siempre hay una ladera donde haga
       falta, así que la ladera se LEVANTA: una loma de coseno elevado centrada
       veinte metros DETRÁS de la boca. Al llegar caminando de frente, lo que se
       ve es un cerro con un agujero negro en el pie.
       Va multiplicada por la máscara de la isla: sin eso, una cueva cerca de la
       costa levantaría una montaña saliendo del mar. */
    const dm = Math.hypot(x - CUEVA.mx, z - CUEVA.mz);
    if (dm < CUEVA.mr){
      const t = 0.5 + 0.5*Math.cos(Math.PI * dm / CUEVA.mr);
      h += CUEVA.malto * t * t * m;
    }
    const d = Math.hypot(x - CUEVA.x, z - CUEVA.z);
    if (d < CUEVA.r){
      const t = 0.5 + 0.5*Math.cos(Math.PI * d / CUEVA.r);
      h -= CUEVA.hondo * t * t;
    }
  }
  return h;
}
/* normal por diferencias finitas: la usan la cámara y el sembrado */
function pendiente(x, z){
  const e = 1.4;
  const gx = H(x+e, z) - H(x-e, z), gz = H(x, z+e) - H(x, z-e);
  return Math.hypot(gx, gz) / (2*e);
}

/* ══════════════════════════ PALETA ══════════════════════════
   Colores saturados a propósito: el grado de color de después los levanta
   todavía más, pero si la base ya es apagada no hay filtro que la salve. */
const PAL = {
  arena:   new T.Color('#efdcae'),
  arena2:  new T.Color('#e0c78e'),
  pasto:   new T.Color('#63c33f'),
  pasto2:  new T.Color('#4aa32e'),
  pastoSec:new T.Color('#8fd24a'),
  roca:    new T.Color('#8b8478'),
  roca2:   new T.Color('#6e685e'),
  tierra:  new T.Color('#7a5a38'),
  agua:    new T.Color('#2aa8d8'),
  aguaHon: new T.Color('#116a9e')
};

/* ══════════════════════════ ESCENA ══════════════════════════ */
const lienzo = document.createElement('canvas');
document.getElementById('escenario').appendChild(lienzo);
const ren = new T.WebGLRenderer({ canvas: lienzo, antialias: false, powerPreference: 'high-performance' });
ren.setPixelRatio(1);                       /* el pixelado manda: nada de DPR */
ren.outputColorSpace = T.SRGBColorSpace;
ren.toneMapping = T.NoToneMapping;          /* el grado de color lo hago yo */
ren.shadowMap.enabled = true;
ren.shadowMap.type = T.PCFSoftShadowMap;

const escena = new T.Scene();
const cam = new T.PerspectiveCamera(66, 1, 0.1, 2200);
escena.fog = new T.Fog(0x9fd0ef, 230, 640);

/* ── el cielo: una esfera con degradé vertical, nada de textura ── */
const cieloMat = new T.ShaderMaterial({
  side: T.BackSide, depthWrite: false, fog: false,
  uniforms: {
    arriba: { value: new T.Color('#2f7fd6') },
    medio:  { value: new T.Color('#79c4f2') },
    abajo:  { value: new T.Color('#cfe9f7') },
    sol:    { value: new T.Vector3(0,1,0) },
    calor:  { value: new T.Color('#ffe9b0') }
  },
  vertexShader: `varying vec3 vD;
    void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
  fragmentShader: `
    uniform vec3 arriba, medio, abajo, calor; uniform vec3 sol; varying vec3 vD;
    void main(){
      float h = clamp(vD.y*0.5+0.5, 0.0, 1.0);
      vec3 c = mix(abajo, medio, smoothstep(0.42, 0.60, h));
      c = mix(c, arriba, smoothstep(0.58, 0.95, h));
      /* halo alrededor del sol: da la sensación de aire caliente sin costar nada */
      float d = max(0.0, dot(normalize(vD), normalize(sol)));
      c += calor * pow(d, 8.0) * 0.55 + calor * pow(d, 2.0) * 0.10;
      gl_FragColor = vec4(c, 1.0);
    }`
});
const cielo = new T.Mesh(new T.SphereGeometry(1400, 24, 16), cieloMat);
escena.add(cielo);

/* ── luces ── */
const sol = new T.DirectionalLight(0xfff2d0, 2.35);
sol.castShadow = true;
sol.shadow.mapSize.set(2048, 2048);
sol.shadow.camera.near = 1; sol.shadow.camera.far = 460;
const SOMBRA_R = 78;
sol.shadow.camera.left = -SOMBRA_R; sol.shadow.camera.right = SOMBRA_R;
sol.shadow.camera.top = SOMBRA_R; sol.shadow.camera.bottom = -SOMBRA_R;
sol.shadow.bias = -0.0004;
/* NORMAL BIAS CHICO. Con 0.42 los troncos salían NEGROS: el desplazamiento a lo
   largo de la normal es más grueso que el propio cilindro, así que cada tronco
   se auto-sombreaba entero. Las copas y los arbustos zafaban por ser bultos
   grandes, y por eso parecía un problema de color y no de sombra. */
sol.shadow.normalBias = 0.045;
escena.add(sol); escena.add(sol.target);

/* EL AMBIENTE ES LA MITAD DEL LOOK. Un hemisférico fuerte —cielo arriba,
   rebote del pasto abajo— es lo que hace que las sombras no sean pozos negros
   y que todo se vea bañado en luz de mediodía. */
const ambiente = new T.HemisphereLight(0xa8dcff, 0x76b84a, 1.30);
escena.add(ambiente);
/* RELLENO. Una segunda direccional, fría, floja y sin sombra, apuntando desde
   el lado contrario al sol. En la realidad eso lo hace el cielo rebotando en el
   suelo; sin ella la cara en sombra de cada árbol y de cada carpa es un plano
   liso del mismo color, y el bosque se ve recortado en cartulina. */
const relleno = new T.DirectionalLight(0xbcd8ff, 0);
escena.add(relleno); escena.add(relleno.target);

/* ══════════════════════════ TEXTURAS PROCEDURALES ══════════════════════════
   Chiquitas y con filtro NEAREST: a esta resolución de render, una textura
   grande y suave se pierde. El grano tiene que ser del tamaño del píxel. */
function lienzoTex(n, pinta){
  const c = document.createElement('canvas'); c.width = c.height = n;
  pinta(c.getContext('2d'), n);
  const t = new T.CanvasTexture(c);
  t.magFilter = T.NearestFilter; t.minFilter = T.NearestMipmapNearestFilter;
  t.wrapS = t.wrapT = T.RepeatWrapping; t.colorSpace = T.SRGBColorSpace;
  t.generateMipmaps = true;
  return t;
}
/* moteado genérico: la base de casi todo */
const moteado = (g, n, base, luz, osc, densidad) => {
  g.fillStyle = base; g.fillRect(0,0,n,n);
  for (let i = 0; i < n*n*densidad; i++){
    const x = (Math.random()*n)|0, y = (Math.random()*n)|0;
    g.fillStyle = Math.random() < 0.5 ? luz : osc;
    g.fillRect(x, y, 1, 1);
  }
};
const texPasto = lienzoTex(64, (g,n) => {
  moteado(g, n, '#5cbb39', '#7fd94e', '#3f8f27', 0.55);
  for (let i = 0; i < 90; i++){                      /* matas más claras */
    const x=(Math.random()*n)|0, y=(Math.random()*n)|0;
    g.fillStyle='#8ee158'; g.fillRect(x,y,1,2);
  }
});
const texArena = lienzoTex(64, (g,n) => moteado(g,n,'#e9d3a0','#f7e9c6','#d3b57e',0.4));
const texRoca  = lienzoTex(64, (g,n) => {
  moteado(g,n,'#867f73','#a49c8d','#5f594f',0.5);
  g.fillStyle='#6d675c';
  for(let i=0;i<12;i++){ const y=(Math.random()*n)|0; g.fillRect(0,y,n,1); }
});
/* CORTEZA CLARA. La primera versión era #6b4a2c y los troncos se veían NEGROS:
   medido en un caso aislado, un cilindro con esa textura daba (59,43,23) —ya de
   por sí oscuro—, y encima el tronco vive bajo la sombra de su propia copa. La
   cara lateral de un cilindro además recibe poco sol cuando el sol está alto,
   porque su normal es horizontal. Con una base clara el tronco se lee incluso
   en sombra, que es como se ve un árbol de verdad a plena luz. */
const texCorteza = lienzoTex(32, (g,n) => {
  g.fillStyle='#a87a4c'; g.fillRect(0,0,n,n);
  for(let x=0;x<n;x++) for(let y=0;y<n;y++){
    const v=Math.random();
    if(v<0.24){ g.fillStyle='#8a6038'; g.fillRect(x,y,1,1); }
    else if(v<0.40){ g.fillStyle='#c69a67'; g.fillRect(x,y,1,1); }
  }
  /* vetas verticales: es lo que hace que se lea como corteza y no como barro */
  for(let i=0;i<10;i++){ const x=(Math.random()*n)|0;
    g.fillStyle='#7d5730'; g.fillRect(x,0,1,n); }
});
/* GRANO NEUTRO, no verde. Esta textura MULTIPLICA al color de la instancia: si
   además es verde oscuro, se multiplican dos oscuros y el bosque entero sale
   casi negro, que es justo lo que pasaba. Centrada en blanco sólo aporta
   textura y deja que el tono lo decida cada árbol. */
const texHoja = lienzoTex(32, (g,n) => moteado(g,n,'#e6e6e6','#ffffff','#bdbdbd',0.6));

/* LA MATA DE PASTO: silueta con alfa, para las cruces.
   Va a 48 píxeles y no a 32, y no es por lujo: la mata se dibuja de un metro de
   alto y a dos pasos ocupa buena parte de la pantalla, así que a 32 cada brizna
   medía un píxel y medio de ancho y el borde escalonado se leía a error y no a
   estilo. Tres cosas que la vuelven pasto y no un peine:
     · ONCE briznas y no siete, con alturas de la mitad al total: un mechón de
       verdad tiene hojas nuevas cortas y hojas viejas largas;
     · CURVA, no inclinación recta. La hoja se dobla con el cuadrado de la
       altura, así que sale vertical del suelo y cae en la punta;
     · una de cada cinco va SECA y una de cada seis lleva ESPIGA. Un pasto de un
       solo verde es una alfombra; lo que lo hace pasto es que no todas las
       hojas estén igual de vivas. */
function texBrizna(){
  const N = 48;
  const c = document.createElement('canvas'); c.width = N; c.height = N;
  const g = c.getContext('2d');
  g.clearRect(0,0,N,N);
  const briznas = 11;
  for (let i = 0; i < briznas; i++){
    const bx = 2 + i*(N-6)/briznas + ((Math.random()*3)|0);
    const alto = Math.round(N*(0.45 + Math.random()*0.53));
    const curva = (Math.random()-0.5) * 11;
    const seca = Math.random() < 0.20;
    const espiga = Math.random() < 0.17;
    let px = bx, py = 0;
    for (let y = 0; y < alto; y++){
      const t = y/alto;
      const w = Math.max(1, Math.round(2.6*(1-t*0.8)));
      px = Math.round(bx + curva*t*t);
      py = N-1-y;
      /* la punta más clara que la base: es como le pega la luz a un mechón.
         LA BASE ARRANCA EN 0,74 Y NO EN 0,52, y eso salió de mirar una captura:
         con la base oscura, las briznas contra un suelo verde clarísimo —este
         juego satura al tope— se leían como PALITOS SECOS clavados en el pasto
         en vez de como pasto. Una brizna tiene que ser más clara que la tierra,
         no más oscura. */
      const lum = 0.74 + t*0.34;
      const col = seca
        ? 'rgb('+Math.round(168*lum+46)+','+Math.round(152*lum+38)+','+Math.round(66*lum+18)+')'
        : 'rgb('+Math.round(96*lum+22)+','+Math.round(206*lum+34)+','+Math.round(62*lum+16)+')';
      g.fillStyle = col;
      g.fillRect(px, py, w, 1);
    }
    if (espiga){
      g.fillStyle = seca ? '#d8c47a' : '#b9e07a';
      for (let k = 0; k < 5; k++) g.fillRect(px - (k&1), py - k, 2, 1);
    }
  }
  const t = new T.CanvasTexture(c);
  t.magFilter = T.NearestFilter; t.minFilter = T.NearestFilter;
  t.colorSpace = T.SRGBColorSpace; t.generateMipmaps = false;
  return t;
}
const texPastoAlfa = texBrizna();

/* LA FLOR: cuatro pétalos y un centro, en un cuadrito con alfa. Es lo más
   barato que existe —una sola malla instanciada para toda la isla— y es lo que
   saca al prado de ser una sola mancha verde. El color va POR INSTANCIA, así
   que con una textura blanca salen amarillas, blancas y violetas. */
const texFlor = (() => {
  const N = 16;
  const c = document.createElement('canvas'); c.width = N; c.height = N;
  const g = c.getContext('2d');
  g.clearRect(0,0,N,N);
  g.fillStyle = '#ffffff';
  /* los cuatro pétalos, como una cruz de bloques */
  g.fillRect(6, 2, 4, 5); g.fillRect(6, 9, 4, 5);
  g.fillRect(2, 6, 5, 4); g.fillRect(9, 6, 5, 4);
  g.fillStyle = '#f2f2f2';
  g.fillRect(6, 6, 4, 4);
  g.fillStyle = '#8a7a2a';                       /* el centro, siempre oscuro */
  g.fillRect(7, 7, 2, 2);
  const t = new T.CanvasTexture(c);
  t.magFilter = T.NearestFilter; t.minFilter = T.NearestFilter;
  t.colorSpace = T.SRGBColorSpace; t.generateMipmaps = false;
  return t;
})();

