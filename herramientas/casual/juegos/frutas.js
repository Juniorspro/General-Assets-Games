/* ══════════════════════════════ FRUTAS ══════════════════════════════
   Soltás una fruta en el frasco; dos frutas iguales que se tocan se fusionan en
   la siguiente de la escala. Si el frasco se desborda, se termina.

   POR QUE ESTE GENERO: es el unico casual donde el jugador NO PUEDE planear
   mas de dos movidas, porque las frutas ruedan. O sea que la partida es
   siempre distinta sin que haga falta generar nada, y cada fusion que sale
   sola —una cadena de tres o cuatro— se siente como un regalo. Eso es lo que
   hace que se juegue otra vez.

   ── LA FISICA ES DE CIRCULOS Y NO DE UN MOTOR ──
   Todo lo que hay acá son discos: no hace falta ni un poligono, ni rotacion de
   cuerpo rigido, ni un motor de cuarenta kilobytes. Un solver secuencial de
   impulsos sobre pares de circulos son cuarenta lineas, corre en O(n^2) con
   n<=45 —o sea dos mil pares por iteracion, nada— y es EXACTO en el unico caso
   que importa: dos frutas que se tocan.
   Y VA EN PASO FIJO, que en este juego no es un detalle: con `dt` variable, dos
   frutas que se apoyan una en la otra tiemblan y la torre se derrumba sola en
   un telefono lento. */

/* ── LA ESCALA TIENE NUEVE Y NO DIEZ, Y ESO LO DECIDIO LO QUE VOLVIO ──
   Se pidio una tira de diez frutas y el generador devolvio una reja de 2x5 con
   NUEVE: falta la manzana. Pelear con el generador para que la devuelva costaba
   dos generaciones mas para agregar una fruta redonda y roja que se confunde
   con el caqui, o sea el defecto que la escala existe para evitar. Nueve es un
   largo de escala perfectamente bueno, y el orden es el que trajo la hoja.

   r es el radio en unidades de diseño (ancho 720). El frasco mide 560 de ancho
   por dentro, asi que la mas grande —296 de diametro— entra con aire. La escala
   NO es lineal: cada fruta es ~1,25 veces la anterior, que es lo que hace que
   dos iguales se distingan de una de al lado sin tener que leer el color. */
/* ── LA ESCALA SALIO DE UN BARRIDO, Y DE TRES CONCLUSIONES MIAS QUE ERAN RUIDO ──
   Este es el juego que mas me costo medir, y las tres veces el error fue el
   mismo: **una sola corrida no dice nada en un sistema caotico**. La posicion
   final de una fruta depende del orden en que el solver resuelve los pares, y
   ese orden cambia con milesimas: dos partidas con semillas parecidas divergen
   por completo.

   1. Con UNA semilla, el bot que apunta hizo 41.250 y el que suelta al azar
      83.241. Concluí que el frasco era chico y que la suerte decidia.
   2. Achiqué los radios a 15..88 y entonces NINGUNO de los dos moria en siete
      minutos: 1.428 sueltas y los cuatro vivos. La partida no se terminaba.
   3. Con la escala final y CUATRO semillas, el honesto hizo 79.335 contra
      33.192 y anote «la estrategia viaja». Con OCHO semillas: **43.806 contra
      44.197**, o sea empatados. Lo de cuatro semillas tambien era ruido.

   Lo que el barrido si establece, y es lo unico que voy a afirmar:

   | escala | sueltas antes de morir | sobrevive 30.000 pasos |
   |---|---|---|
   | 15..88   | 1428 | 4 de 4 |
   | 19..114  | 1428 | 3 de 4 |
   | 24..141  |  871 | 0 de 4 |
   | **28..167** | **~310** | **0 de 8** |

   O sea que la escala decide CUANTO DURA la partida, y con la ultima fila
   termina en unas trescientas sueltas —cuatro o cinco minutos, que es el largo
   de una sesion de casual— y el frasco se llena a la vista.

   ── Y LO QUE NO ESTA DEMOSTRADO, DICHO EN VOZ ALTA ──
   Que colocar bien pague. Un bot voraz de UNA jugada no le gana a repartir
   parejo, y eso es una propiedad del genero: repartir parejo ya es una buena
   estrategia porque mantiene la pila plana. La habilidad de verdad es ver una
   cadena de dos o tres antes de soltar, y eso ningun bot de acá lo modela. Lo
   que si esta medido: la partida SE TERMINA, la fisica converge (cero frutas
   solapadas en juego normal) y se llega a la sandia. */
const F_ESCALA = [
  { r: 28,  n:'cereza',   c:'#d1352a', o:'#7a1a14', h:'#ff8a7a' },
  { r: 36,  n:'frutilla', c:'#e8483f', o:'#8d2020', h:'#ff9f92' },
  { r: 46,  n:'uva',      c:'#7b4fb5', o:'#3f2560', h:'#c3a6ea' },
  { r: 57,  n:'naranja',  c:'#f08a1e', o:'#9a5106', h:'#ffd18a' },
  { r: 72,  n:'caqui',    c:'#ee6a1c', o:'#8f3c0a', h:'#ffb277' },
  { r: 91,  n:'pera',     c:'#b6cf3f', o:'#5c6e12', h:'#e6f79a' },
  { r: 113, n:'durazno',  c:'#f2a25a', o:'#a05c22', h:'#ffdcb8' },
  { r: 140, n:'anana',    c:'#e2b52c', o:'#84640c', h:'#ffe89a' },
  { r: 167, n:'sandia',   c:'#2f8f42', o:'#123c1e', h:'#8fdd9c' }
];
/* ── LA ESCALA DE LA ESCALA, Y SE BARRE MIDIENDO ──
   Es un solo numero que multiplica los nueve radios, y decide cuanto AIRE tiene
   el frasco. Con la escala original —sandia de 148— el frasco media menos de
   dos anchos de la fruta grande y la partida la decidia la semilla; con 15..88
   medía 3,7 y NINGUNO de los dos bots moria en siete minutos. La ventana esta
   en el medio y se encuentra corriendo, no eligiendo. */
let F_KR = 1.0;
const F_R = (n) => F_ESCALA[n].r * F_KR;
const F_RMAX = () => 167 * F_KR;
/* los puntos de fusionar dos de nivel i: 1, 3, 6, 10, 15, 21, 28, 36, 45.
   Triangulares a propósito — el salto entre escalones crece, así que llegar una
   fruta más arriba paga MUCHO más que dos fusiones chicas. Es lo que empuja al
   jugador a construir en vez de limpiar. */
const F_PTS = F_ESCALA.map((_, i) => ((i+1)*(i+2))/2);
const F_SUELTA = [0,0,0,0,1,1,1,2,2,3];   /* de qué nivel salen las que caen */

const F_G = 2500;          /* gravedad */
const F_REST = 0.10;       /* rebote: casi nada. Una fruta que rebota no se apila. */
const F_AIRE = 0.9975;     /* roce del aire por paso */
const F_PISO = 0.90;       /* roce contra el piso y las paredes */
const F_ITER = 6;          /* iteraciones del solver */
const F_ESPERA = 0.34;     /* entre dos sueltas */
const F_PELIGRO = 1.25;    /* segundos por encima de la línea antes de perder */
const F_CADENA = 0.60;     /* dos fusiones dentro de esto son una cadena */

const FR = [];             /* las frutas vivas */
let F_gx0 = 80, F_gx1 = 640, F_gyb = 1100, F_gyt = 420;   /* el frasco, lo pone geo() */
let F_id = 0;

const MANO = { x: 360, niv: 0, sig: 0, esp: 0, tira: false };
let F_pel = 0, F_vivo = true, F_maxNiv = 0, F_fus = 0, F_cad = 0, F_cadN = 0;
let F_azar = 12345;

/* ── EL AZAR ES PROPIO Y CON SEMILLA ──
   `Math.random()` haría que dos corridas del auto-jugador no se puedan
   comparar, y comparar dos corridas es la única forma de saber si un cambio
   mejoró algo. Y de paso el jugador puede tener la misma bolsa de frutas. */
function fAz(){ F_azar = (F_azar*1664525 + 1013904223) >>> 0; return F_azar / 4294967296; }

function geo(){
  /* el frasco se ancla ABAJO y su alto sale de lo que sobra: con el alto de
     diseño moviéndose entre 1100 y 1760 según la pantalla, un frasco de alto
     fijo dejaría un hueco en un teléfono largo o se saldría en uno corto */
  F_gx0 = 42; F_gx1 = AN - 42;
  F_gyb = AL - 96;
  F_gyt = Math.max(330, AL*0.30);
}

function fNueva(niv, x, y){
  const f = { id: ++F_id, niv, r: F_R(niv), x, y, vx: 0, vy: 0,
              gi: 0, vgi: 0, tocado: false, nace: 0, muere: 0 };
  FR.push(f);
  if (niv > F_maxNiv) F_maxNiv = niv;
  return f;
}

/* ── LA COLISION CONTRA LAS PAREDES ES UN RECORTE, Y ESO ES EXACTO ──
   Con un rayo o un impulso hay casos en los que una fruta rapida atraviesa la
   pared en un paso. Recortando la posicion no puede pasar nunca, y en un
   frasco —tres planos rectos— no se pierde nada. */
function fParedes(f){
  if (f.x - f.r < F_gx0){ f.x = F_gx0 + f.r; if (f.vx < 0){ f.vx = -f.vx*F_REST; f.vy *= F_PISO; } }
  if (f.x + f.r > F_gx1){ f.x = F_gx1 - f.r; if (f.vx > 0){ f.vx = -f.vx*F_REST; f.vy *= F_PISO; } }
  if (f.y + f.r > F_gyb){
    f.y = F_gyb - f.r;
    if (f.vy > 0){ f.vy = -f.vy*F_REST; f.vx *= F_PISO; f.vgi *= F_PISO; }
    f.tocado = true;
  }
}

function fusiona(a, b){
  const niv = a.niv + 1;
  const mx = (a.x + b.x)/2, my = (a.y + b.y)/2;
  const e = F_ESCALA[a.niv];
  a.muere = 1; b.muere = 1;
  /* ── LA CADENA SE MIDE EN TIEMPO Y NO EN CANTIDAD ──
     Cuatro fusiones separadas por diez segundos no son una cadena: son cuatro
     jugadas. Lo que el jugador siente como cadena es que una fusión provoque la
     siguiente, y eso pasa en menos de medio segundo. */
  F_cad = F_CADENA;
  F_cadN++;
  const pts = F_PTS[a.niv] * (F_cadN > 1 ? F_cadN : 1);
  sumaPuntos(pts, mx, my - e.r*0.6);
  chispas(mx, my, Math.min(22, 6 + a.niv*2), e.h, 120 + a.niv*22);
  sacude(0.10 + a.niv*0.035);
  son('bien', 0.7 + a.niv*0.04);
  F_fus++;
  if (niv >= F_ESCALA.length){
    /* dos sandías se van del frasco: es el premio grande y encima libera el
       espacio, que es lo que le da a la partida una segunda vida */
    fogonazo(0.55);
    sacude(0.6);
    sumaPuntos(120, mx, my - 90);
    chispas(mx, my, 40, '#ffe89a', 420);
    return;
  }
  const n = fNueva(niv, mx, my);
  n.nace = 0.22;
  n.tocado = true;
  /* un empujón hacia arriba: sin él, la fruta nueva aparece exactamente donde
     estaban las dos viejas, con la de arriba encima, y el solver la escupe para
     un costado al azar. Con el empujón la torre se asienta hacia arriba, que es
     lo que uno espera ver. */
  n.vy = -110 - niv*8;
  n.vx = (a.vx + b.vx)*0.3;
}

function fPares(){
  const fus = [];
  /* ── EL BARRIDO SE PODA POR ALTURA ──
     Con la escala achicada caben tres o cuatro veces mas frutas, y O(n^2) con
     n=180 son treinta y dos mil pares por iteracion —seis iteraciones, sesenta
     pasos por segundo— o sea once millones de comparaciones por segundo para
     descubrir que casi ninguna se toca. Ordenando por `y` una vez por paso,
     todo lo que este mas abajo que `r + el radio mas grande` no puede tocar a
     la de arriba, y ahi el bucle interno se corta. La poda es EXACTA: no
     descarta un par que se toque, porque usa el radio mas grande que existe. */
  FR.sort((p, q) => p.y - q.y);
  for (let i = 0; i < FR.length; i++){
    const a = FR[i];
    if (a.muere) continue;
    const corte = a.y + a.r + F_RMAX();
    for (let j = i+1; j < FR.length; j++){
      const b = FR[j];
      if (b.y > corte) break;
      if (b.muere) continue;
      let dx = b.x - a.x, dy = b.y - a.y;
      const rr = a.r + b.r;
      let d2 = dx*dx + dy*dy;
      if (d2 >= rr*rr) continue;
      let d = Math.sqrt(d2);
      if (d < 0.0001){ dx = 0.001; dy = 1; d = 1; }   /* dos centros exactos: se separan hacia abajo */
      a.tocado = true; b.tocado = true;
      if (a.niv === b.niv && !a.nace && !b.nace){ fus.push([a, b]); continue; }
      const nx = dx/d, ny = dy/d;
      const pen = rr - d;
      /* la separación se reparte por masa, y la masa es el AREA: si no, una
         cereza empuja una sandía como si pesaran lo mismo y la torre se
         desarma sola */
      const ma = a.r*a.r, mb = b.r*b.r, mt = ma + mb;
      a.x -= nx*pen*(mb/mt); a.y -= ny*pen*(mb/mt);
      b.x += nx*pen*(ma/mt); b.y += ny*pen*(ma/mt);
      const vn = (b.vx - a.vx)*nx + (b.vy - a.vy)*ny;
      if (vn < 0){
        const jj = -(1 + F_REST)*vn / (1/ma + 1/mb);
        a.vx -= (jj/ma)*nx; a.vy -= (jj/ma)*ny;
        b.vx += (jj/mb)*nx; b.vy += (jj/mb)*ny;
        /* el roce tangencial: es lo que hace que una fruta RUEDE por encima de
           otra en vez de deslizarse como sobre hielo */
        const tx = -ny, ty = nx;
        const vt = (b.vx - a.vx)*tx + (b.vy - a.vy)*ty;
        const jt = -vt*0.16 / (1/ma + 1/mb);
        a.vx -= (jt/ma)*tx; a.vy -= (jt/ma)*ty;
        b.vx += (jt/mb)*tx; b.vy += (jt/mb)*ty;
        a.vgi -= vt*0.004; b.vgi += vt*0.004;
      }
    }
  }
  /* ── LAS FUSIONES SE APLICAN DESPUES DEL BARRIDO ──
     Fusionando adentro del bucle se le cambia el largo al array que se está
     recorriendo, y ahí una fruta puede fusionarse dos veces en el mismo paso —
     medido, eso duplicaba puntos y dejaba frutas fantasma con `niv` fuera de la
     escala. */
  for (const [a, b] of fus) if (!a.muere && !b.muere) fusiona(a, b);
}

const JT = {
  es: { sub:'Soltá frutas y fusioná las iguales. Cada par sube un escalón.',
        c1:'Un frasco, nueve frutas.',
        c2:'Dos iguales que se tocan se vuelven la siguiente.',
        c3:'Si se desborda, se termina. Llegá a la sandía.',
        sigT:'SIGUE', pel:'¡SE DESBORDA!' },
  en: { sub:'Drop fruit and merge the matching ones. Each pair moves up a step.',
        c1:'One jar, nine fruits.',
        c2:'Two of a kind that touch become the next one.',
        c3:'Overflow and it is over. Get to the watermelon.',
        sigT:'NEXT', pel:'OVERFLOWING!' },
  pt: { sub:'Solte frutas e junte as iguais. Cada par sobe um degrau.',
        c1:'Um pote, nove frutas.',
        c2:'Duas iguais que se tocam viram a seguinte.',
        c3:'Se transbordar, acabou. Chegue na melancia.',
        sigT:'PRÓXIMA', pel:'TRANSBORDANDO!' }
};
const PIEL = { ac:'#ff9a2e', tela:'fondo' };
const SON_ALIAS = { bien:'fusion', toque:'suelta', pierde:'perder',
                    gana:'gana', clic:'clic' };

/* ══════════ EL DIBUJO DE UNA FRUTA ══════════
   Arranca dibujada por código y la hoja generada la PISA cuando decodifica, que
   es la regla del repo. Y lo dibujado no es un círculo plano: un disco de un
   solo color se lee a ficha de damas. Van cuatro cosas y las cuatro se ven —
   sombra de contacto, cuerpo con degradado desplazado (que es lo que da el
   volumen), brillo especular arriba a la izquierda, y contorno oscuro. */
/* devuelve false si la hoja todavia no decodifico, y ahi manda lo dibujado por
   codigo — que es la regla del repo: nada reemplaza nada hasta que llega */
function fSprite(g, niv, r){
  const o = IMG.frutas;
  if (!o || !o.ok) return false;
  const m = AS.img.frutas;
  const esc = (m.esc && m.esc[niv]) || 1;
  const cy = (m.cy && m.cy[niv] != null) ? m.cy[niv] : 0.5;
  const lado = r*2*esc;
  g.drawImage(o.im, niv*o.w, 0, o.w, o.h,
              -lado/2, -cy*lado, lado, lado);
  return true;
}

function fDibuja(f, g){
  const e = F_ESCALA[f.niv];
  const r = f.r * (f.nace ? 1 + f.nace*0.9 : 1);
  g.save();
  g.translate(f.x, f.y);
  g.rotate(f.gi);
  /* ── EL SPRITE SE DIBUJA POR SU CUERPO Y NO POR SU ALTO ──
     `dibCuadro` ajusta el ALTO del cuadro al diametro, y el alto incluye la
     hoja: en la cereza el cabito es un tercio de la imagen, asi que la fruta
     salia bastante mas chica que el circulo con el que choca y dos frutas que
     se estaban tocando se veian SEPARADAS. En un juego que consiste en juntar
     cosas iguales eso es lo peor que puede pasar.
     El horneado mide el cuerpo de cada pieza —su fila mas ancha— y guarda
     cuanto hay que agrandarla (`esc`) y donde esta su centro vertical (`cy`).
     Con eso el cuerpo mide exactamente `2r` y su centro cae en el centro del
     circulo, o sea que lo dibujado y lo que choca son la misma cosa. */
  if (fSprite(g, f.niv, r)){ g.restore(); return; }
  /* el degradado tiene el foco corrido hacia arriba y a la izquierda: centrado
     devuelve una esfera de manual y se lee a bola de billar, no a fruta */
  const gr = g.createRadialGradient(-r*0.32, -r*0.36, r*0.08, 0, 0, r*1.06);
  gr.addColorStop(0, e.h);
  gr.addColorStop(0.42, e.c);
  gr.addColorStop(1, e.o);
  g.beginPath(); g.arc(0, 0, r, 0, 7); g.fillStyle = gr; g.fill();
  g.lineWidth = Math.max(1.6, r*0.055); g.strokeStyle = e.o; g.stroke();
  /* el brillo: una elipse girada y no un círculo. Un círculo blanco se lee a
     agujero; una elipse inclinada se lee a reflejo de una ventana. */
  g.beginPath();
  g.ellipse(-r*0.34, -r*0.40, r*0.30, r*0.17, -0.7, 0, 7);
  g.fillStyle = 'rgba(255,255,255,.42)'; g.fill();
  /* la hojita: es lo único que dice «esto es una fruta» y no «esto es una
     pelota», y cuesta cuatro líneas */
  g.beginPath();
  g.moveTo(0, -r*0.98);
  g.quadraticCurveTo(r*0.30, -r*1.30, r*0.62, -r*1.06);
  g.quadraticCurveTo(r*0.28, -r*0.86, 0, -r*0.98);
  g.fillStyle = '#3f7a2c'; g.fill();
  g.beginPath(); g.moveTo(0, -r*0.98); g.lineTo(-r*0.05, -r*1.22);
  g.lineWidth = Math.max(1.4, r*0.06); g.strokeStyle = '#5a4023'; g.stroke();
  g.restore();
}

const JUEGO = {
  id: 'frutas',
  tipo: 'puntos',
  vivo: true, gano: false,
  get marca(){ return PUNTOS; },
  get sub(){ return TX('pts'); },
  get ficI(){ return null; },
  get ficD(){ return TX('sigT') + ' ' + (MANO.sig + 1); },
  resta: null,

  /* ── LOS SUJETOS VAN POR ENCIMA DEL PIE, Y ESO SE MIDIO EN UNA FOTO ──
     El pie de la cinematica vive en el 9 % de abajo del marco, o sea de
     `AL-230` para abajo contando las dos lineas. Los sujetos estaban en
     `F_gyb-120` —o sea `AL-216`— asi que la frase les caia ENCIMA: en la
     captura del segundo plano las dos naranjas salian atravesadas por el
     texto. Todo lo que hay que ver va arriba de `AL-260`. */
  planos: [
    { dur: 3.0, pie: 'c1', dibuja(g, u){
        geo();
        fondoBase(g);
        frascoDibuja(g, 0.5 + u*0.5);
        /* cuatro de la escala en fila, entrando de a una: dice «hay una escala»
           sin escribir la palabra escala */
        for (let i = 0; i < 4; i++){
          const k = Math.max(0, Math.min(1, u*4 - i*0.7));
          if (k <= 0) continue;
          fDibuja({ niv: i+1, x: AN/2 - 168 + i*112,
                    y: F_gyb - 330 + (1-suave(k))*140,
                    r: F_R(i+1), gi: (1-k)*1.2, nace: 0 }, g);
        }
      } },
    { dur: 3.2, pie: 'c2', dibuja(g, u){
        geo();
        fondoBase(g);
        frascoDibuja(g, 1);
        /* dos iguales que se juntan y se vuelven una: es la regla entera del
           juego contada sin una palabra */
        const s = suave(Math.min(1, u*1.35));
        const d = 150*(1 - s);
        const y = (F_gyt + F_gyb)/2 - 40;
        if (s < 0.99){
          fDibuja({ niv:4, x: AN/2 - d, y, r: F_R(4), gi:-s*0.7, nace:0 }, g);
          fDibuja({ niv:4, x: AN/2 + d, y, r: F_R(4), gi: s*0.7, nace:0 }, g);
        } else {
          const q = Math.max(0, u - 0.74);
          disco(AN/2, y, F_R(5)*(1 + q*2.4), 'rgba(255,226,138,.20)');
          fDibuja({ niv:5, x: AN/2, y, r: F_R(5), gi:0, nace: q*1.6 }, g);
        }
      } },
    { dur: 3.4, pie: 'c3', dibuja(g, u){
        geo();
        fondoBase(g);
        frascoDibuja(g, 1);
        /* el frasco lleno HASTA EL BORDE: se dibuja de la linea de peligro para
           abajo y no del piso para arriba, asi lo que se ve es justamente lo
           que amenaza —el borde a punto de desbordar— y no el fondo, que es lo
           unico que el pie tapa */
        const fila = [[8,0.30],[6,0.72],[7,0.16],[4,0.55],[5,0.86],[3,0.40],[2,0.66],[1,0.22],[0,0.78]];
        let y = F_gyt + 120;
        for (let i = 0; i < fila.length; i++){
          const [n, fx] = fila[i];
          const x = F_gx0 + 40 + fx*(F_gx1 - F_gx0 - 80);
          fDibuja({ niv: n, x, y, r: F_R(n), gi: (i*0.83)%1.5 - 0.75, nace: 0 }, g);
          if (i % 2 === 1) y += 120;
        }
        /* y la linea late: es la unica cosa de la cinematica que dice «se
           termina», y una linea quieta se lee a adorno */
        const p = 0.35 + 0.65*Math.abs(Math.sin(u*7));
        g.strokeStyle = 'rgba(224,85,63,' + p.toFixed(2) + ')';
        g.lineWidth = 5; g.setLineDash([18, 14]);
        g.beginPath(); g.moveTo(F_gx0, F_gyt); g.lineTo(F_gx1, F_gyt); g.stroke();
        g.setLineDash([]);
        texto(TX('pel'), AN/2, F_gyt - 26, 30, '#e0553f', '800', 'center');
      } }
  ],

  arranca(){
    geo();
    FR.length = 0; F_id = 0;
    F_pel = 0; F_vivo = true; F_maxNiv = 0; F_fus = 0; F_cad = 0; F_cadN = 0;
    F_azar = (Date.now() ^ 0x9e3779b9) >>> 0;
    MANO.x = AN/2; MANO.esp = 0.5; MANO.tira = false;
    MANO.niv = F_SUELTA[Math.floor(fAz()*F_SUELTA.length)];
    MANO.sig = F_SUELTA[Math.floor(fAz()*F_SUELTA.length)];
    this.vivo = true; this.gano = false;
  },

  paso(dt){
    geo();
    if (MANO.esp > 0) MANO.esp = Math.max(0, MANO.esp - dt);
    if (F_cad > 0){ F_cad -= dt; if (F_cad <= 0) F_cadN = 0; }

    for (const f of FR){
      if (f.nace > 0) f.nace = Math.max(0, f.nace - dt*4.5);
      f.vy += F_G*dt;
      f.vx *= F_AIRE; f.vy *= F_AIRE;
      f.x += f.vx*dt; f.y += f.vy*dt;
      f.gi += f.vgi*dt; f.vgi *= 0.985;
    }
    for (let k = 0; k < F_ITER; k++){
      for (const f of FR) if (!f.muere) fParedes(f);
      fPares();
    }
    for (let i = FR.length - 1; i >= 0; i--) if (FR[i].muere) FR.splice(i, 1);

    /* ── PERDER PIDE QUE LA FRUTA ESTE QUIETA, NO SOLO ARRIBA ──
       Sin la condición de reposo, una fruta recién soltada —que cruza la línea
       en el aire, porque nace por encima— terminaba la partida en el primer
       cuadro. Y sin el temporizador, un rebote de un cuadro por encima de la
       línea también. Tienen que ser las dos cosas a la vez y sostenidas. */
    let sobre = false;
    for (const f of FR){
      if (!f.tocado) continue;
      const q = Math.abs(f.vx) + Math.abs(f.vy);
      if (f.y - f.r < F_gyt && q < 90){ sobre = true; break; }
    }
    if (sobre){
      F_pel += dt;
      if (F_pel > F_PELIGRO){ F_vivo = false; this.vivo = false; }
    } else F_pel = Math.max(0, F_pel - dt*1.6);
  },

  /* el dedo apunta y al soltarlo cae. Un toque suelto también sirve, que es lo
     que hace que se pueda jugar rápido con el pulgar. */
  baja(x){ MANO.tira = true; MANO.x = x; },
  mueve(x){ if (MANO.tira) MANO.x = x; },
  sube(){ if (MANO.tira) this.suelta(); MANO.tira = false; },

  suelta(){
    if (MANO.esp > 0) return false;
    geo();
    const r = F_R(MANO.niv);
    const x = Math.max(F_gx0 + r, Math.min(F_gx1 - r, MANO.x));
    const f = fNueva(MANO.niv, x, F_gyt - r - 40);
    f.vy = 60;
    f.vgi = (fAz() - 0.5)*3;
    son('toque');
    MANO.niv = MANO.sig;
    MANO.sig = F_SUELTA[Math.floor(fAz()*F_SUELTA.length)];
    MANO.esp = F_ESPERA;
    return true;
  },

  fondo(g){ geo(); fondoBase(g); },

  pinta(g){
    frascoDibuja(g, 1);
    /* la línea de peligro se ve SOLO cuando hay peligro: dibujada siempre, es
       una raya que el jugador aprende a ignorar y entonces no avisa nada */
    if (F_pel > 0.02){
      const k = Math.min(1, F_pel/F_PELIGRO);
      g.strokeStyle = 'rgba(224,85,63,' + (0.30 + 0.65*k).toFixed(2) + ')';
      g.lineWidth = 3 + k*4; g.setLineDash([18, 14]);
      g.beginPath(); g.moveTo(F_gx0, F_gyt); g.lineTo(F_gx1, F_gyt); g.stroke();
      g.setLineDash([]);
      if (k > 0.45) texto(TX('pel'), AN/2, F_gyt - 22, 26, '#e0553f', '800', 'center');
    }
    for (const f of FR) fDibuja(f, g);
    /* la que está por caer: colgada arriba, con una guía punteada hasta el
       fondo. Sin la guía, en un frasco de 560 de ancho el jugador no sabe dónde
       va a caer y suelta a ciegas. */
    const r = F_R(MANO.niv);
    const x = Math.max(F_gx0 + r, Math.min(F_gx1 - r, MANO.x));
    g.save();
    g.globalAlpha = 0.26;
    g.strokeStyle = '#f2eee6'; g.lineWidth = 2; g.setLineDash([10, 12]);
    g.beginPath(); g.moveTo(x, F_gyt - 8); g.lineTo(x, F_gyb - 6); g.stroke();
    g.setLineDash([]);
    g.restore();
    const alfa = MANO.esp > 0 ? 0.35 : 1;
    g.save(); g.globalAlpha = alfa;
    fDibuja({ niv: MANO.niv, x, y: F_gyt - r - 40, r, gi: 0, nace: 0 }, g);
    g.restore();
    /* la escala, chica y al costado: es la unica ayuda que este juego necesita
       —saber que viene despues de la que tenes— y va como fichas y no como
       texto, porque el nombre de la fruta no le dice nada a nadie */
    const y0 = 118;
    for (let i = 0; i <= Math.min(F_ESCALA.length - 1, F_maxNiv + 1); i++){
      const rr = 13 + i*1.6, xx = 34, yy = y0 + i*34;
      const e = F_ESCALA[i];
      g.beginPath(); g.arc(xx, yy, rr*0.72, 0, 7);
      g.fillStyle = i <= F_maxNiv ? e.c : 'rgba(255,255,255,.10)'; g.fill();
      if (i === MANO.niv){
        g.beginPath(); g.arc(xx, yy, rr*0.72 + 5, 0, 7);
        g.strokeStyle = '#f2eee6'; g.lineWidth = 2; g.stroke();
      }
    }
  },

  /* ══════════ EL AUTO-JUGADOR ══════════
     No es para hacer trampa: es la unica forma de saber si el juego SE PUEDE
     jugar y si jugarlo bien paga. Comparado con uno que suelta al azar, la
     diferencia dice si la estrategia viaja; si el azar empata o gana, el juego
     es una tragamonedas.

     ── Y LA PRIMERA VERSION PERDIA CONTRA EL AZAR ──
     Medido despues de que la escala pasara de diez frutas a nueve —o sea con
     las frutas mas grandes contra el mismo frasco—: el honesto hacia 41.250
     puntos con 329 sueltas y el azaroso 83.241 con 547. El azar durando el
     doble no es casualidad: es que el «honesto» miraba UNA cosa —pegarse a una
     fruta del mismo nivel, y del lado derecho si habia lugar— y no miraba la
     ALTURA. Con eso apila todo en una columna y el frasco se desborda mucho
     antes, o sea que la estrategia era peor que no tener ninguna.

     Ahora barre veintiun columnas y puntua cada una por dos cosas a la vez:
     que haya una del mismo nivel donde la fruta va a APOYARSE —no donde esta
     el centro de la otra— y que la superficie ahi este baja. Es lo que hace una
     persona: busca el par, y si no hay, tira al pozo. */
  juegaSolo(n, azar){
    this.arranca();
    /* la semilla es fija para que dos corridas se puedan comparar, y ajustable
       para poder correr VARIAS: con una sola, la diferencia entre dos bots es
       ruido —medido, el mismo bot al azar dio 44.850 y 83.241 en dos corridas—
       y de un numero asi no se puede concluir nada. */
    F_azar = F_SEM;
    let sueltas = 0;
    for (let i = 0; i < n && this.vivo; i++){
      if (MANO.esp <= 0){
        MANO.x = azar ? (F_gx0 + fAz()*(F_gx1 - F_gx0)) : fApunta();
        if (this.suelta()) sueltas++;
      }
      this.paso(1/60);
    }
    return { puntos: PUNTOS, sueltas, fusiones: F_fus, maxNiv: F_maxNiv,
             maxFruta: F_ESCALA[F_maxNiv].n, frutas: FR.length,
             vivo: !!this.vivo, pasos: n };
  },

  /* lo unico ajustable, y solo para el banco: la escala de la escala, el peso
     de la heuristica del bot y la semilla. Vive adentro del modulo porque desde
     afuera no se puede tocar un `let` de un modulo ES. */
  cfg(o){
    if (o.kr != null) F_KR = o.kr;
    if (o.ady != null) F_PESO_ADY = o.ady;
    if (o.sem != null) F_SEM = o.sem;
    return { kr: F_KR, ady: F_PESO_ADY, sem: F_SEM, rMax: F_RMAX() };
  },

  /* la sonda propia: el estado del frasco sin tener que mirar una captura */
  ver(){
    return { frutas: FR.length, maxNiv: F_maxNiv, fusiones: F_fus,
             pel: +F_pel.toFixed(2), mano: MANO.niv, sig: MANO.sig,
             /* la altura de la pila: es lo que dice si el frasco se está
                llenando, y no se puede leer de ninguna otra variable */
             alto: FR.length ? +(F_gyb - Math.min.apply(null, FR.map(f => f.y - f.r))).toFixed(0) : 0,
             frasco: [F_gx0, F_gyt, F_gx1, F_gyb],
             /* dos frutas superpuestas más de un 12 % serían un solver que no
                converge, y eso no se ve en una foto: se ve como una torre que
                tiembla. Acá se cuenta. */
             solapadas: (() => { let k = 0;
               for (let i = 0; i < FR.length; i++) for (let j = i+1; j < FR.length; j++){
                 const a = FR[i], b = FR[j], rr = a.r + b.r;
                 const d = Math.hypot(b.x - a.x, b.y - a.y);
                 if (d < rr*0.88) k++;
               } return k; })() };
  }
};

/* ══════════ EL FRASCO Y EL FONDO ══════════
   El frasco es vidrio, o sea que lo único que se ve de él son sus BORDES y un
   velo. Dibujado como un rectángulo relleno tapa las frutas; dibujado sólo con
   línea se lee a marco de una foto. Van las tres cosas: el velo del interior,
   los tres cantos gruesos, y un reflejo vertical en la pared izquierda. */
function frascoDibuja(g, k){
  const w = F_gx1 - F_gx0, h = F_gyb - F_gyt;
  g.save();
  g.globalAlpha = 0.20*k;
  const gr = g.createLinearGradient(F_gx0, F_gyt, F_gx1, F_gyb);
  gr.addColorStop(0, '#7fd8ff'); gr.addColorStop(1, '#1d3b52');
  g.fillStyle = gr;
  g.fillRect(F_gx0, F_gyt, w, h);
  g.restore();
  g.save();
  g.lineWidth = 12; g.lineJoin = 'round';
  g.strokeStyle = 'rgba(214,240,255,' + (0.55*k).toFixed(2) + ')';
  g.beginPath();
  g.moveTo(F_gx0, F_gyt); g.lineTo(F_gx0, F_gyb);
  g.lineTo(F_gx1, F_gyb); g.lineTo(F_gx1, F_gyt);
  g.stroke();
  /* el labio: dos trazos cortos hacia afuera arriba. Sin ellos el frasco es una
     U y se lee a copa; con ellos se lee a frasco abierto. */
  g.lineWidth = 9;
  g.beginPath();
  g.moveTo(F_gx0 - 16, F_gyt - 4); g.lineTo(F_gx0 + 6, F_gyt + 10);
  g.moveTo(F_gx1 + 16, F_gyt - 4); g.lineTo(F_gx1 - 6, F_gyt + 10);
  g.stroke();
  g.globalAlpha = 0.30*k;
  g.lineWidth = 5; g.strokeStyle = '#ffffff';
  g.beginPath();
  g.moveTo(F_gx0 + 26, F_gyt + 40); g.lineTo(F_gx0 + 26, F_gyb - 60);
  g.stroke();
  g.restore();
}

function fondoBase(g){
  if (dibCubre('fondo')) return;
  const gr = g.createLinearGradient(0, 0, 0, AL);
  gr.addColorStop(0, '#2b1a3d');
  gr.addColorStop(0.52, '#3d2138');
  gr.addColorStop(1, '#1a1020');
  g.fillStyle = gr; g.fillRect(0, 0, AN, AL);
  /* la mesa: una banda más clara abajo. Sin ella el frasco flota en un
     degradado y no se apoya en nada. */
  const m = g.createLinearGradient(0, AL - 150, 0, AL);
  m.addColorStop(0, '#5a3a2c'); m.addColorStop(1, '#2e1c15');
  g.fillStyle = m; g.fillRect(0, AL - 150, AN, 150);
  g.fillStyle = 'rgba(0,0,0,.30)';
  g.fillRect(0, AL - 150, AN, 5);
}

/* donde apuntaria una persona: el par si lo hay, y si no el hueco mas bajo */
/* el peso relativo de «pegarse a una igual» contra «tirar al hueco mas bajo».
   Es lo unico que el auto-jugador tiene de ajustable y se barre midiendo, no se
   elige: ver la tabla en el comentario de `juegaSolo`. */
let F_PESO_ADY = 60;
let F_SEM = 777;
function fApunta(){
  const R = F_R(MANO.niv);
  const x0 = F_gx0 + R, x1 = F_gx1 - R;
  let mejorX = (x0 + x1)/2, mejorP = -1e9;
  for (let k = 0; k <= 20; k++){
    const x = x0 + (k/20)*(x1 - x0);
    /* la superficie en esa columna: la fruta mas alta cuya sombra la toca */
    let sup = F_gyb;
    for (const f of FR)
      if (Math.abs(f.x - x) < f.r + R*0.92) sup = Math.min(sup, f.y - f.r);
    /* cuantas del mismo nivel quedarian pegadas AHI, o sea donde la fruta va a
       apoyarse y no donde esta el centro de la otra */
    const cy = sup - R;
    let ady = 0;
    for (const f of FR){
      if (f.niv !== MANO.niv) continue;
      if (Math.hypot(f.x - x, f.y - cy) < (f.r + R)*1.32) ady++;
    }
    /* pegarse a una igual manda; a igualdad, el hueco mas bajo */
    const p = ady*F_PESO_ADY + (sup - F_gyt);
    if (p > mejorP){ mejorP = p; mejorX = x; }
  }
  return mejorX;
}
