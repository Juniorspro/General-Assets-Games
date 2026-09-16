/* ══════════════════════════════════════════════════════════════════════════
   LA HORA DEL DIA
   ──────────────────────────────────────────────────────────────────────────
   Es la mitad de lo que hace que este genero se vea como se ve: el mismo
   terreno, la misma silueta y el mismo rider, y lo unico que cambia es la
   paleta. Ocho momentos en un ciclo, interpolados.

   LA HORA AVANZA CON LA DISTANCIA Y NO CON EL RELOJ, y no es un detalle: con
   el reloj, quedarse parado en el menu haria pasar la noche, y dos partidas
   que llegan al mismo metro se verian distintas. Con la distancia, avanzar
   ES lo que trae el amanecer.
   Y CADA PARTIDA ARRANCA EN UN MOMENTO SORTEADO del ciclo: si empezaran
   todas al alba, una partida de cuatrocientos metros —que es la primera de
   cualquiera— vería siempre lo mismo y las otras siete paletas no existirian.

   LAS CAPAS NO SE DECLARAN, SE DERIVAN. Cada paleta dice el cielo, la
   silueta y el suelo; las tres cadenas de montanas salen de mezclar la
   silueta hacia el color del horizonte. Eso es literalmente lo que hace el
   aire —perspectiva aerea— y de paso garantiza que las capas no puedan
   quedar de un color que no este en el cielo, que es lo que delata a un
   fondo pintado a mano.                                                   */

const CICLO_M = 3200;   // metros de un dia entero

/* [cieloAlto, cieloBajo, silueta, suelo, astro, haloAstro, estrellas] */
const PALS = [
  { n: 'noche',     ca: [16, 22, 44],   cb: [58, 74, 106],  si: [16, 21, 36],
    su: [150, 166, 196], as: [236, 242, 255], ha: [130, 158, 214], es: 1.00, luna: 1 },
  { n: 'alba',      ca: [42, 44, 84],   cb: [176, 132, 132], si: [34, 32, 50],
    su: [214, 202, 206], as: [255, 214, 178], ha: [226, 150, 132], es: 0.35, luna: 0 },
  { n: 'amanecer',  ca: [104, 122, 176], cb: [246, 190, 148], si: [58, 58, 76],
    su: [250, 236, 220], as: [255, 238, 196], ha: [255, 186, 120], es: 0.00, luna: 0 },
  { n: 'manana',    ca: [126, 178, 196], cb: [216, 236, 226], si: [46, 74, 76],
    su: [250, 252, 250], as: [255, 255, 246], ha: [222, 246, 236], es: 0.00, luna: 0 },
  { n: 'dia',       ca: [122, 186, 178], cb: [214, 238, 224], si: [30, 62, 60],
    su: [252, 254, 252], as: [255, 255, 250], ha: [226, 250, 238], es: 0.00, luna: 0 },
  { n: 'siesta',    ca: [174, 196, 172], cb: [244, 232, 198], si: [62, 66, 54],
    su: [254, 250, 236], as: [255, 250, 224], ha: [250, 240, 196], es: 0.00, luna: 0 },
  { n: 'atardecer', ca: [186, 122, 118], cb: [246, 174, 128], si: [52, 34, 36],
    su: [240, 206, 186], as: [255, 226, 168], ha: [255, 154, 96],  es: 0.00, luna: 0 },
  { n: 'ocaso',     ca: [58, 46, 76],   cb: [178, 100, 104], si: [26, 22, 34],
    su: [188, 168, 176], as: [255, 190, 150], ha: [212, 116, 106], es: 0.45, luna: 0 },
];

/* la paleta viva: se escribe en el mismo objeto todos los cuadros en vez de
   crear uno nuevo, que a 60 por segundo son 3.600 objetos por minuto a la
   basura sólo para guardar seis colores */
const PAL = { ca: [0, 0, 0], cb: [0, 0, 0], si: [0, 0, 0], su: [0, 0, 0],
              as: [0, 0, 0], ha: [0, 0, 0], es: 0, luna: 0, n: '', i: 0, t: 0 };
const _m3 = (d, a, b, t) => { d[0] = a[0] + (b[0] - a[0]) * t; d[1] = a[1] + (b[1] - a[1]) * t;
                              d[2] = a[2] + (b[2] - a[2]) * t; };
function paletaEn(h) {
  h = ((h % 1) + 1) % 1;
  const f = h * PALS.length, i = Math.floor(f) % PALS.length, t = suave(f - Math.floor(f));
  const a = PALS[i], b = PALS[(i + 1) % PALS.length];
  _m3(PAL.ca, a.ca, b.ca, t); _m3(PAL.cb, a.cb, b.cb, t);
  _m3(PAL.si, a.si, b.si, t); _m3(PAL.su, a.su, b.su, t);
  _m3(PAL.as, a.as, b.as, t); _m3(PAL.ha, a.ha, b.ha, t);
  PAL.es = mezcla(a.es, b.es, t); PAL.luna = mezcla(a.luna, b.luna, t);
  PAL.n = t < 0.5 ? a.n : b.n; PAL.i = i; PAL.t = t;
  return PAL;
}
/* rgb() sin crear cadenas de mas: el bucle de dibujo llama a esto decenas de
   veces por cuadro y `.join` alojaria un array cada vez */
const _r = v => (v < 0 ? 0 : v > 255 ? 255 : v) | 0;
function rgb(c, a) {
  return a === undefined
    ? 'rgb(' + _r(c[0]) + ',' + _r(c[1]) + ',' + _r(c[2]) + ')'
    : 'rgba(' + _r(c[0]) + ',' + _r(c[1]) + ',' + _r(c[2]) + ',' + a + ')';
}
/* el color de una capa de fondo: la silueta desvaida hacia el horizonte.
   `k` 0 es el color pleno del primer plano y 1 es el cielo del horizonte. */
const _cap = [0, 0, 0];
function capaColor(k) { _m3(_cap, PAL.si, PAL.cb, k); return rgb(_cap); }
