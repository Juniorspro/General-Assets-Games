
/* ============================================================
   e.js — EL PINTOR

   Dos cosas y nada mas: primitivas de dibujo y la carta.
   `f.js` arma las pantallas.

   LA REGLA DE ESTE ARCHIVO: **la zona de toque se anota en la
   misma linea que dibuja la cosa**. Con una tabla de rectangulos
   aparte, el dia que una carta se corre dos pixeles el boton
   promete un blanco que el juego no acepta — y eso no falla, miente.
   La lista se vacia en cada cuadro porque las cartas cambian de
   sitio, de cantidad y de orden.

   Y todo lo generado PISA a lo dibujado cuando llega: el dorso, el
   fieltro, el sello del comodin. Un base64 roto cuesta esa pieza y
   no la pantalla.
   ============================================================ */

/* --- el registro de zonas --- */
let ZONAS = [];
const zonaLimpia = () => { ZONAS = []; };
function zona(id, x, y, w, h, dat){
  ZONAS.push({ id, x, y, w, h, dat });
  return ZONAS[ZONAS.length - 1];
}
/* al reves: lo ultimo dibujado esta arriba, asi que gana */
function zonaEn(px, py){
  for (let i = ZONAS.length - 1; i >= 0; i--){
    const z = ZONAS[i];
    if (px >= z.x && px <= z.x + z.w && py >= z.y && py <= z.y + z.h) return z;
  }
  return null;
}

/* --- las imagenes generadas, si llegaron --- */
const IMG = {};
function imgCarga(){
  if (typeof ASSETS === 'undefined' || !HAY_DOM) return;
  Object.keys(ASSETS).forEach(k => {
    const im = new Image();
    im.onload  = () => { IMG[k] = im; };
    im.onerror = () => { IMG.fallan = (IMG.fallan || []).concat(k); };
    im.src = ASSETS[k];
  });
}

/* ============================================================
   PRIMITIVAS
   ============================================================ */
function rr(x, y, w, h, r){
  const g = CX;
  r = Math.min(r, w / 2, h / 2);
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y,     x + w, y + h, r);
  g.arcTo(x + w, y + h, x,     y + h, r);
  g.arcTo(x,     y + h, x,     y,     r);
  g.arcTo(x,     y,     x + w, y,     r);
  g.closePath();
}
function caja(x, y, w, h, r, rell, borde, gr){
  rr(x, y, w, h, r);
  if (rell){ CX.fillStyle = rell; CX.fill(); }
  if (borde){ CX.strokeStyle = borde; CX.lineWidth = gr || 2; CX.stroke(); }
}
function txt(s, x, y, px, col, al, peso){
  CX.font = (peso || 700) + ' ' + px + 'px system-ui, sans-serif';
  CX.fillStyle = col;
  CX.textAlign = al || 'center';
  CX.textBaseline = 'middle';
  CX.fillText(s, x, y);
  CX.textAlign = 'left';
}
/* el texto del HUD vive encima de un fieltro con dibujo: sin borde
   oscuro, una cifra clara sobre una mancha clara no se lee */
function txtB(s, x, y, px, col, al, peso){
  CX.font = (peso || 900) + ' ' + px + 'px system-ui, sans-serif';
  CX.textAlign = al || 'center';
  CX.textBaseline = 'middle';
  CX.lineWidth = Math.max(3, px * 0.22);
  CX.lineJoin = 'round';
  CX.strokeStyle = 'rgba(6,10,11,.85)';
  CX.strokeText(s, x, y);
  CX.fillStyle = col;
  CX.fillText(s, x, y);
  CX.textAlign = 'left';
}
/* cuanto mide un texto, para que una ficha se ajuste a lo que dice
   y no al reves */
function anchoTxt(s, px, peso){
  CX.font = (peso || 700) + ' ' + px + 'px system-ui, sans-serif';
  return CX.measureText(s).width;
}

/* CORTAR UN TEXTO EN LINEAS QUE ENTREN. Vive aca, con las
   medidas, y no en cada sitio que dibuja un parrafo: en tres
   idiomas la misma frase mide distinto, y dos cortes escritos
   por separado terminan cortando distinto el mismo texto. */
function envuelveLineas(s, w, px, peso){
  const pal = String(s).split(' ');
  const ls = []; let ln = '';
  pal.forEach(p => {
    const t = ln ? ln + ' ' + p : p;
    if (anchoTxt(t, px, peso) > w && ln){ ls.push(ln); ln = p; } else ln = t;
  });
  if (ln) ls.push(ln);
  return ls;
}

/* ============================================================
   LOS PALOS

   Dibujados por codigo y no como imagen: son cuatro formas de
   veinte lineas que tienen que verse nitidas a catorce pixeles,
   y una foto a ese tamano es una mancha.
   ============================================================ */
function palo(p, x, y, s, col){
  const g = CX;
  g.fillStyle = col;
  g.beginPath();
  if (p === 0){                       /* picas */
    g.moveTo(x, y - s);
    g.bezierCurveTo(x + s * .95, y - s * .1, x + s * .62, y + s * .5, x + s * .16, y + s * .22);
    g.lineTo(x + s * .34, y + s * .86);
    g.lineTo(x - s * .34, y + s * .86);
    g.lineTo(x - s * .16, y + s * .22);
    g.bezierCurveTo(x - s * .62, y + s * .5, x - s * .95, y - s * .1, x, y - s);
  } else if (p === 1){                /* corazones */
    g.moveTo(x, y + s * .92);
    g.bezierCurveTo(x - s * 1.05, y + s * .1, x - s * .72, y - s * .98, x, y - s * .34);
    g.bezierCurveTo(x + s * .72, y - s * .98, x + s * 1.05, y + s * .1, x, y + s * .92);
  } else if (p === 2){                /* diamantes */
    g.moveTo(x, y - s);
    g.lineTo(x + s * .70, y);
    g.lineTo(x, y + s);
    g.lineTo(x - s * .70, y);
  } else {                            /* treboles */
    const r = s * .40;
    g.arc(x, y - s * .42, r, 0, 7);
    g.closePath(); g.fill(); g.beginPath();
    g.arc(x - s * .46, y + s * .20, r, 0, 7);
    g.closePath(); g.fill(); g.beginPath();
    g.arc(x + s * .46, y + s * .20, r, 0, 7);
    g.closePath(); g.fill(); g.beginPath();
    g.moveTo(x - s * .20, y + s * .18);
    g.lineTo(x + s * .20, y + s * .18);
    g.lineTo(x + s * .34, y + s * .92);
    g.lineTo(x - s * .34, y + s * .92);
  }
  g.closePath();
  g.fill();
}

/* ============================================================
   LA CARTA

   El rango y el palo son el dato; la mejora, la edicion y el sello
   son TRES capas que se pueden dar juntas, asi que ninguna puede
   reemplazar a la carta: una piedra sigue teniendo su marco, un
   holografico sigue mostrando su numero.
   ============================================================ */
const ME_COL = {
  bonus:'#3fa9f5', mult:'#fe5f55', comodin:'#c47bff', cristal:'#7be0ff',
  acero:'#b8c4c2', piedra:'#6f7d7a', oro:'#ffd166', suerte:'#6ece8a',
};
const ED_COL = { foil:'#8fd0ff', holo:'#ff8fd4', poli:'#ffe08a' };

function pintaCarta(x, y, w, h, c, o){
  o = o || {};
  const g  = CX;
  const rd = Math.round(w * .13);
  const rojo = ROJO(c.p);

  if (o.alza){ g.save(); g.translate(0, -o.alza); }

  /* sombra: es lo unico que dice "esto esta encima de la mesa" */
  g.save();
  g.shadowColor = 'rgba(0,0,0,.55)';
  g.shadowBlur = o.sel ? 14 : 8;
  g.shadowOffsetY = o.sel ? 6 : 3;

  /* el cuerpo */
  let base = '#f4f1e8';
  if (c.me === 'piedra') base = '#8a9794';
  else if (c.me === 'oro') base = '#f0d79a';
  caja(x, y, w, h, rd, base, null);
  g.restore();

  /* la mejora tine el cuerpo, no lo tapa */
  if (c.me && c.me !== 'piedra' && c.me !== 'oro'){
    g.save(); rr(x, y, w, h, rd); g.clip();
    g.globalAlpha = .28; g.fillStyle = ME_COL[c.me] || '#fff';
    g.fillRect(x, y, w, h);
    g.restore();
  }

  /* la cara */
  if (c.me === 'piedra'){
    /* la piedra no tiene rango ni palo: por eso no entra en la
       deteccion. Dibujarle un numero seria mentir. */
    g.save(); rr(x, y, w, h, rd); g.clip();
    g.fillStyle = 'rgba(40,48,46,.5)';
    for (let i = 0; i < 5; i++){
      const a = (c.id * 7 + i * 13) % 100 / 100;
      g.beginPath();
      g.ellipse(x + w * (.2 + a * .6), y + h * (.15 + ((i * 29) % 70) / 100),
                w * .16, h * .07, a * 3, 0, 7);
      g.fill();
    }
    g.restore();
  } else {
    const col = rojo ? '#d9403a' : '#1d2629';
    const t = rtxt(c.r);
    txt(t, x + w * .19, y + h * .16, Math.round(w * .30), col, 'center', 900);
    palo(c.p, x + w * .19, y + h * .33, w * .11, col);
    /* el pip grande es lo que se ve de reojo con la mano solapada */
    palo(c.p, x + w * .62, y + h * .66, w * .26, col);
  }

  /* la edicion: un brillo por encima de todo lo de adentro */
  if (c.ed){
    g.save(); rr(x, y, w, h, rd); g.clip();
    const gr = g.createLinearGradient(x, y, x + w, y + h);
    gr.addColorStop(0,   'rgba(255,255,255,0)');
    gr.addColorStop(.42, ED_COL[c.ed] + (c.ed === 'poli' ? 'cc' : '99'));
    gr.addColorStop(.58, 'rgba(255,255,255,.45)');
    gr.addColorStop(1,   'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(x, y, w, h);
    g.restore();
  }

  /* el sello: un punto en la esquina, que es donde no tapa nada */
  if (c.se){
    g.fillStyle = c.se === 'oro' ? '#ffd166' : '#fe5f55';
    g.beginPath(); g.arc(x + w * .82, y + h * .13, w * .10, 0, 7); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1.5; g.stroke();
  }

  /* el marco va ULTIMO: con la edicion encima, un marco dibujado
     antes queda tapado justo en las cartas que mas se miran */
  caja(x, y, w, h, rd, null,
       o.sel ? '#ffd166' : (o.muerta ? '#fe5f55' : 'rgba(20,26,28,.42)'),
       o.sel ? 3 : (o.muerta ? 2.5 : 1.5));
  if (o.muerta){
    g.save(); rr(x, y, w, h, rd); g.clip();
    g.fillStyle = 'rgba(10,14,15,.55)'; g.fillRect(x, y, w, h);
    g.restore();
  }

  if (o.alza) g.restore();
}

function pintaDorso(x, y, w, h){
  const rd = Math.round(w * .13);
  if (IMG.dorso){
    CX.save(); rr(x, y, w, h, rd); CX.clip();
    CX.drawImage(IMG.dorso, x, y, w, h);
    CX.restore();
  } else {
    caja(x, y, w, h, rd, '#1f4a6d', null);
    CX.save(); rr(x, y, w, h, rd); CX.clip();
    CX.strokeStyle = 'rgba(255,255,255,.14)'; CX.lineWidth = 2;
    for (let i = -h; i < w; i += 9){
      CX.beginPath(); CX.moveTo(x + i, y); CX.lineTo(x + i + h, y + h); CX.stroke();
    }
    CX.restore();
  }
  caja(x, y, w, h, rd, null, 'rgba(244,241,232,.55)', 2);
}

/* ============================================================
   COMODINES Y CONSUMIBLES

   Cada uno lleva su INICIAL y su color de rareza, no un dibujo:
   veintiseis dibujos serian veintiseis descargas para veintiseis
   fichas de setenta pixeles. Lo que hace falta es distinguirlos de
   un vistazo, y una letra grande con un color lo hace.
   Si el arte generado llega, la pisa.
   ============================================================ */
const RAR_COL = ['#6ece8a', '#3fa9f5', '#fe5f55'];

function pintaRanura(x, y, w, h, vacia){
  caja(x, y, w, h, 9, vacia ? 'rgba(10,18,16,.35)' : null,
       'rgba(244,241,232,.16)', 1.5);
}

function pintaComodin(x, y, w, h, k, o){
  o = o || {};
  const J = COM[k] || {};
  const col = RAR_COL[J.rar || 0];
  if (IMG['com_' + k]){
    CX.save(); rr(x, y, w, h, 9); CX.clip();
    CX.drawImage(IMG['com_' + k], x, y, w, h);
    CX.restore();
  } else {
    caja(x, y, w, h, 9, '#1a2528', null);
    CX.save(); rr(x, y, w, h, 9); CX.clip();
    CX.globalAlpha = .22; CX.fillStyle = col;
    CX.fillRect(x, y, w, h * .55);
    CX.restore();
    txt(tt('comN', k).slice(0, 1).toUpperCase(),
        x + w / 2, y + h * .36, Math.round(h * .40), col, 'center', 900);
  }
  /* el nombre, achicado hasta que entre: en tres idiomas la misma
     ficha recibe palabras de largos muy distintos */
  const n = tt('comN', k);
  let px = 9;
  while (px > 5 && anchoTxt(n, px, 700) > w - 6) px -= 0.5;
  txt(n, x + w / 2, y + h - 9, px, '#cfe0dc', 'center', 700);
  caja(x, y, w, h, 9, null, o.sel ? '#ffd166' : col, o.sel ? 2.5 : 1.5);
}

/* recibe la ficha entera (`{t,k}`) y no la clave: un planeta y un
   tarot se guardan igual y solo el campo `t` los separa */
function pintaCons(x, y, w, h, C, o){
  o = o || {};
  const k = C.k, esPlaneta = C.t === 'planeta';
  const col = esPlaneta ? '#7be0ff' : '#c47bff';
  caja(x, y, w, h, 9, '#1a2528', null);
  CX.save(); rr(x, y, w, h, 9); CX.clip();
  CX.globalAlpha = .20; CX.fillStyle = col; CX.fillRect(x, y, w, h * .6);
  CX.restore();
  if (esPlaneta){
    CX.fillStyle = col;
    CX.beginPath(); CX.arc(x + w / 2, y + h * .34, h * .15, 0, 7); CX.fill();
    CX.strokeStyle = col; CX.lineWidth = 2;
    CX.save(); CX.translate(x + w / 2, y + h * .34); CX.rotate(-.5);
    CX.beginPath(); CX.ellipse(0, 0, h * .27, h * .08, 0, 0, 7); CX.stroke();
    CX.restore();
  } else {
    txt('★', x + w / 2, y + h * .34, Math.round(h * .34), col, 'center', 900);
  }
  /* la clave de un planeta ES el nombre de la mano que sube */
  const n = esPlaneta ? tt('manosN', k) : tt('tarN', k);
  let px = 9;
  while (px > 5 && anchoTxt(n, px, 700) > w - 6) px -= 0.5;
  txt(n, x + w / 2, y + h - 9, px, '#cfe0dc', 'center', 700);
  caja(x, y, w, h, 9, null, o.sel ? '#ffd166' : col, o.sel ? 2.5 : 1.5);
}

/* ============================================================
   FICHAS DE INTERFAZ
   ============================================================ */
function pintaBoton(x, y, w, h, s, col, apag){
  const g = CX;
  g.save();
  if (!apag){ g.shadowColor = 'rgba(0,0,0,.45)'; g.shadowBlur = 8; g.shadowOffsetY = 3; }
  caja(x, y, w, h, 10, apag ? 'rgba(30,40,38,.55)' : col, null);
  g.restore();
  let px = 13;
  while (px > 8 && anchoTxt(s, px, 900) > w - 14) px -= 0.5;
  txt(s, x + w / 2, y + h / 2 + 1, px,
      apag ? 'rgba(200,214,210,.40)' : '#0e1618', 'center', 900);
}

function pintaPanel(x, y, w, h, tono){
  caja(x, y, w, h, 12, tono || 'rgba(10,18,20,.62)', 'rgba(244,241,232,.10)', 1.5);
}

/* el fieltro: si llega la foto, la foto; si no, el verde con su
   grano, que es lo que impide que la mesa se lea a rectangulo */
function pintaFieltro(){
  if (IMG.fieltro){
    CX.drawImage(IMG.fieltro, 0, 0, AN, AL);
  } else {
    const gr = CX.createLinearGradient(0, 0, 0, AL);
    gr.addColorStop(0, '#2f5e49'); gr.addColorStop(.55, '#26503e'); gr.addColorStop(1, '#1b3b2d');
    CX.fillStyle = gr; CX.fillRect(0, 0, AN, AL);
  }
  /* la vineta empuja la vista al medio, que es donde estan las cartas */
  const v = CX.createRadialGradient(AN / 2, AL * .52, AN * .28, AN / 2, AL * .52, AL * .70);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.52)');
  CX.fillStyle = v; CX.fillRect(0, 0, AN, AL);
}
