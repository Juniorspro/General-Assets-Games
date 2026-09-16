/* ══════════════════════ EL DIBUJO ══════════════════════
   La grilla es la pantalla principal y es lo único que se dibuja: cuatro filas
   de casillas, la cabeza de lectura, y un medidor de entrada arriba. Todo en un
   lienzo y no en DOM, porque la cabeza se mueve en cada cuadro y escribir en el
   DOM sesenta veces por segundo obliga al navegador a recalcular la maqueta. */

let LZ = null, CX = null, ANC = 0, ALT = 0, PXR = 1;
const ROT_W = 84, MED_H = 12, HUECO = 10;
const COL = { bombo: 22, caja: 340, charles: 190, melo: 268 };
const DEST = [];                 /* destellos de lo que entra mientras se graba */

function lienzoPon(c){ LZ = c; CX = c.getContext('2d', { alpha: false }); lienzoMide(); }
function lienzoMide(){
  if (!LZ) return;
  const r = LZ.getBoundingClientRect();
  PXR = Math.min(2, window.devicePixelRatio || 1);
  ANC = Math.max(1, Math.round(r.width)); ALT = Math.max(1, Math.round(r.height));
  LZ.width = Math.round(ANC*PXR); LZ.height = Math.round(ALT*PXR);
  if (CX) CX.setTransform(PXR, 0, 0, PXR, 0, 0);
}

function filaH(){ return (ALT - MED_H - HUECO)/PISTAS.length; }
function celdaW(){ return (ANC - ROT_W)/PASOS_COMPAS; }
/* ── SE MUESTRA UN COMPÁS POR VEZ, Y ES UNA CUENTA DE DEDOS ──
   Los treinta y dos pasos entran en el ancho, pero a diez píxeles por casilla no
   se pueden tocar. Con dieciséis quedan de veintiuno por sesenta, que es un
   blanco de verdad, y el compás se elige arriba. */
let COMPAS_VER = 0;
function baseCompas(){ return COMPAS_VER*PASOS_COMPAS; }
function verCompas(n){ COMPAS_VER = cl(n, 0, SEC.compases - 1); return COMPAS_VER; }

function celdaEn(px, py){
  if (px < ROT_W || px > ANC) return null;
  const y = py - MED_H - HUECO;
  if (y < 0) return null;
  const f = Math.floor(y/filaH());
  if (f < 0 || f >= PISTAS.length) return null;
  const c = Math.floor((px - ROT_W)/celdaW());
  if (c < 0 || c >= PASOS_COMPAS) return null;
  return { pista: PISTAS[f].id, paso: baseCompas() + c, fila: f, col: c };
}
function rotEn(px, py){
  if (px >= ROT_W) return null;
  const y = py - MED_H - HUECO; if (y < 0) return null;
  const f = Math.floor(y/filaH());
  return (f >= 0 && f < PISTAS.length) ? PISTAS[f].id : null;
}
function destella(pista, paso){ DEST.push({ pista, paso, t: 0 }); while (DEST.length > 40) DEST.shift(); }
function destPaso(dt){ for (let i = DEST.length - 1; i >= 0; i--){ DEST[i].t += dt; if (DEST[i].t > 0.45) DEST.splice(i, 1); } }

function hsl(h, s, l, a){ return 'hsla(' + h.toFixed(0) + ',' + s + '%,' + l + '%,' + a + ')'; }
/* ── EL TAMAÑO DE LETRA SE MIDE, NO SE ELIGE ──
   «CHARLES» a 28 px mide 180 y la columna de rótulos tiene 84: el texto salía
   cruzado por encima de las casillas. Y «MELODÍA» tapaba media grilla. Se baja
   hasta que entre, que además hace que valga en los tres idiomas sin tocar nada. */
function ponFuente(txt, ancho, base, peso){
  let f = base;
  CX.font = (peso || 800) + ' ' + f + 'px system-ui,sans-serif';
  while (f > 6 && CX.measureText(txt).width > ancho){
    f -= 1; CX.font = (peso || 800) + ' ' + f + 'px system-ui,sans-serif';
  }
  return f;
}
function matizMidi(m){ return 195 + cl((m - 40)/44, 0, 1)*145; }

function pinta(nivel, pico){
  if (!CX) return;
  CX.fillStyle = '#08070d'; CX.fillRect(0, 0, ANC, ALT);

  /* ── EL MEDIDOR ES LO PRIMERO QUE SE MIRA CUANDO NO ANDA ──
     Sin él, «no me detecta» y «no me escucha» son indistinguibles. */
  const n = cl(nivel, 0, 1);
  CX.fillStyle = 'rgba(255,255,255,.06)'; CX.fillRect(ROT_W, 2, ANC - ROT_W, MED_H - 4);
  CX.fillStyle = n > 0.85 ? '#ff5a6e' : n > 0.35 ? '#8ee06a' : '#5aa9e0';
  CX.fillRect(ROT_W, 2, (ANC - ROT_W)*n, MED_H - 4);
  if (pico > 0){
    CX.fillStyle = 'rgba(255,255,255,.55)';
    CX.fillRect(ROT_W + (ANC - ROT_W)*cl(pico, 0, 1) - 1, 1, 2, MED_H - 2);
  }

  const fh = filaH(), cw = celdaW(), b = baseCompas();
  const pa = SEC.tocando ? secPasoAhora() : -1;
  const fs = Math.max(9, Math.round(fh*0.20));
  /* ── O TODOS LOS NOMBRES O NINGUNO ──
     Decidido casilla por casilla, «FA» entra y «SOL#» no, y la fila sale con una
     casilla rotulada y tres mudas — que se lee a error y no a decisión. Se
     resuelve una vez con el nombre más largo que puede tocar. */
  const conNombre = ponFuente('SOL#', cw - 4, Math.min(fs, Math.round((fh - 6)*0.5))) >= 9;

  for (let f = 0; f < PISTAS.length; f++){
    const P = PISTAS[f], y0 = MED_H + HUECO + f*fh, h = COL[P.id];
    const muda = SEC.mudas[P.id];

    const rot = P.n[LI()], anchoRot = ROT_W - 14;
    CX.textBaseline = 'middle'; CX.textAlign = 'left';
    ponFuente(rot, anchoRot, Math.min(17, Math.round(fh*0.19)));
    CX.fillStyle = muda ? 'rgba(180,175,200,.30)' : hsl(h, 70, 72, 0.95);
    CX.fillText(rot, 8, y0 + fh*0.42);
    const pie = muda ? '·MUDA·' : (P.perc ? '' : nombreMidi(notaVista()));
    if (pie){
      ponFuente(pie, anchoRot, Math.min(13, Math.round(fh*0.15)), 600);
      CX.fillStyle = 'rgba(180,175,200,.42)';
      CX.fillText(pie, 8, y0 + fh*0.42 + 16);
    }

    for (let c = 0; c < PASOS_COMPAS; c++){
      const p = b + c, v = SEC.pistas[P.id][p];
      const x = ROT_W + c*cw, w = cw - 2, hh = fh - 6;
      const yy = y0 + 3;
      const enTiempo = (c % 4) === 0;
      CX.fillStyle = enTiempo ? 'rgba(255,255,255,.075)' : 'rgba(255,255,255,.035)';
      CX.fillRect(x, yy, w, hh);
      if (v){
        const hue = P.perc ? h : matizMidi(v);
        CX.fillStyle = muda ? hsl(hue, 25, 34, 0.55) : hsl(hue, 88, 58, 0.95);
        CX.fillRect(x, yy, w, hh);
        if (!P.perc){
          /* el nombre también se mide: una casilla de diecinueve píxeles no
             aguanta «SOL#» a treinta, y lo que se veía era media letra */
          if (conNombre){
            const nm = NOTA_NOM[((v % 12) + 12) % 12];
            CX.textAlign = 'center';
            ponFuente(nm, w - 2, Math.min(fs, Math.round(hh*0.5)));
            CX.fillStyle = 'rgba(6,5,12,.86)';
            CX.fillText(nm, x + w/2, yy + hh/2);
            CX.textAlign = 'left';
          }
        }
      }
    }
    /* lo que está entrando por el micrófono, en el acto */
    for (const d of DEST){
      if (d.pista !== P.id) continue;
      const c = d.paso - b; if (c < 0 || c >= PASOS_COMPAS) continue;
      const k = 1 - d.t/0.45;
      CX.strokeStyle = 'rgba(255,255,255,' + (0.9*k).toFixed(3) + ')';
      CX.lineWidth = 2;
      CX.strokeRect(ROT_W + c*cw + 1, y0 + 4, cw - 4, fh - 8);
    }
  }

  /* la cabeza de lectura: una columna, no una línea — una línea de un píxel se
     pierde entre las separaciones de las casillas */
  if (pa >= b && pa < b + PASOS_COMPAS){
    const x = ROT_W + (pa - b)*cw;
    CX.fillStyle = 'rgba(255,255,255,.16)';
    CX.fillRect(x, MED_H + HUECO, cw - 2, ALT - MED_H - HUECO);
    CX.fillStyle = 'rgba(255,255,255,.55)';
    CX.fillRect(x, MED_H + HUECO, 2, ALT - MED_H - HUECO);
  }
}
function notaVista(){
  const a = SEC.pistas.melo, b = baseCompas();
  for (let c = 0; c < PASOS_COMPAS; c++) if (a[b + c]) return a[b + c];
  for (let i = 0; i < a.length; i++) if (a[i]) return a[i];
  return 60;
}
