
/* ══════════════════════ MATERIALES Y TEXTURAS DIBUJADAS ══════════════════════
   Todo dibujado por código en lienzos chicos. En un pasillo iluminado por una
   sola linterna, la textura casi no se ve: lo que se ve es cómo cae la luz. Las
   fotos generadas entran después, y cuando entren PISAN a éstas — nunca al
   revés. */
function lienzoTex(n, f){
  const c = document.createElement('canvas');
  c.width = c.height = n;
  f(c.getContext('2d'), n);
  const t = new T.CanvasTexture(c);
  t.wrapS = t.wrapT = T.RepeatWrapping;
  t.anisotropy = 4;
  t.colorSpace = T.SRGBColorSpace;
  return t;
}
/* ── UN LIENZO QUE NO ES CUADRADO, Y HACE FALTA ──
   Una textura cuadrada estirada sobre un plano de 0,78 × 1,85 estira cada texel
   2,37 veces a lo alto: medido en la captura, la silueta de una persona salía
   como tres salchichas negras apiladas. El dibujo tiene que hacerse en un
   lienzo con la MISMA proporción que el plano, y entonces un círculo es un
   círculo. */
function lienzoTexWH(w, h, f){
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  f(c.getContext('2d'), w, h);
  const t = new T.CanvasTexture(c);
  t.anisotropy = 4; t.colorSpace = T.SRGBColorSpace;
  return t;
}
function grano(g, n, a, k){
  const d = g.getImageData(0, 0, n, n), p = d.data;
  for (let i = 0; i < p.length; i += 4){
    const v = (Math.random() - 0.5) * k;
    p[i] += v; p[i+1] += v; p[i+2] += v;
  }
  g.putImageData(d, 0, 0);
}

/* baldosas de hospital viejo: la reja es lo único que da escala y velocidad */
const texPiso = lienzoTex(256, (g, n) => {
  g.fillStyle = '#3a3733'; g.fillRect(0, 0, n, n);
  const p = n / 4;
  for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++){
    const v = 0.86 + Math.random() * 0.24;
    g.fillStyle = 'rgb(' + (58*v|0) + ',' + (55*v|0) + ',' + (50*v|0) + ')';
    g.fillRect(i*p + 1.5, j*p + 1.5, p - 3, p - 3);
  }
  grano(g, n, 0, 16);
});
texPiso.repeat.set(1, 1);

/* la pared: revoque manchado. Las manchas son lo único que hace que dos tramos
   del pasillo no se confundan entre sí */
const texPared = lienzoTex(256, (g, n) => {
  g.fillStyle = '#43403a'; g.fillRect(0, 0, n, n);
  for (let k = 0; k < 26; k++){
    const x = Math.random()*n, y = Math.random()*n, r = 10 + Math.random()*46;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, 'rgba(26,22,18,' + (0.05 + Math.random()*0.16).toFixed(3) + ')');
    gr.addColorStop(1, 'rgba(26,22,18,0)');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
  /* el zócalo: una línea horizontal es lo que dice «esto es una pared» */
  g.fillStyle = 'rgba(20,17,14,.5)'; g.fillRect(0, n - 26, n, 26);
  grano(g, n, 0, 13);
});

const texTecho = lienzoTex(128, (g, n) => {
  g.fillStyle = '#2a2825'; g.fillRect(0, 0, n, n);
  grano(g, n, 0, 10);
});

const texMadera = lienzoTex(256, (g, n) => {
  g.fillStyle = '#6b563d'; g.fillRect(0, 0, n, n);
  for (let k = 0; k < 60; k++){
    g.strokeStyle = 'rgba(48,36,24,' + (0.06 + Math.random()*0.20).toFixed(3) + ')';
    g.lineWidth = 0.6 + Math.random()*2.2;
    g.beginPath();
    const y = Math.random()*n;
    g.moveTo(0, y);
    g.bezierCurveTo(n*0.3, y + (Math.random()-0.5)*13, n*0.7, y + (Math.random()-0.5)*13, n, y);
    g.stroke();
  }
  grano(g, n, 0, 11);
});

/* ══════════ LAS TEXTURAS DE VERDAD, Y POR QUÉ EN ESPEJO ══════════
   Las de arriba están dibujadas por código y son el RESPALDO: si un WebP no
   decodifica, el pasillo sigue teniendo paredes. Las que se ven son fotos
   generadas (Rezona Lab, proyecto WUMdrRxs) — revoque descascarado de asilo,
   baldosas de hospital levantadas, plafones de techo con moho.
   Un pasillo dibujado con dos gradientes no da miedo por más luz que se le
   apague: el miedo de un pasillo está en el detalle que uno reconoce.

   LA COSTURA SE ARREGLA EN EL HORNEADO Y NO ACÁ. El primer intento fue
   `MirroredRepeatWrapping`: saca la costura, pero deja la pared con simetría
   espejo cada dos baldosas y sobre un muro de tres metros eso se ve — las
   manchas de humedad salían formando mariposas. `hornear.py` funde ahora la
   banda de un borde sobre el opuesto, así que la textura embaldosa de verdad y
   acá alcanza con repetición normal. */
function foto(dato, respaldo){
  if (typeof AS === 'undefined' || !dato) return respaldo;
  const t = new T.TextureLoader().load(dato);
  t.wrapS = t.wrapT = T.RepeatWrapping;
  t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
/* ── EL TAMAÑO DE LA BALDOSA Y EL TONO SE MIDIERON EN LA FOTO, NO A OJO ──
   Con las fotos recién puestas el pasillo salió BLANCO: la pared descascarada
   es casi papel y el revoque, iluminado de frente por una linterna a un metro,
   devolvía un muro liso y brillante donde no se distinguía una esquina de otra.
   Un pasillo de terror tiene que ser un charco de luz rodeado de nada; si se ve
   todo, no hay dónde esconder un susto.
   Dos correcciones, y las dos son multiplicaciones: el tono baja a dos tercios
   —el material tiñe la foto, así que esto es exposición y no repintar— y la
   repetición sube, porque la geometría trae la UV a 1,4 m por baldosa y a ese
   tamaño una escama de pintura mide veinte centímetros y se lee a mapa de
   Marte. Con `repeat` 0,95 la baldosa de la pared mide metro y medio: la escama
   queda del tamaño de una escama y el dibujo no se repite tres veces en el
   mismo muro. (1,7 fue el primer intento y se veía la repetición vertical.) */
const matPiso  = new T.MeshStandardMaterial({ map: foto(AS.tex_piso,  texPiso),  roughness: 0.88, metalness: 0.0, color: 0x63615c });
const matPared = new T.MeshStandardMaterial({ map: foto(AS.tex_pared, texPared), roughness: 0.96, metalness: 0.0, color: 0x504d47 });
const matTecho = new T.MeshStandardMaterial({ map: foto(AS.tex_techo, texTecho), roughness: 1.0,  metalness: 0.0, color: 0x4a4845 });
if (matPared.map) matPared.map.repeat.set(0.95, 0.95);
if (matPiso.map)  matPiso.map.repeat.set(1.15, 1.15);
if (matTecho.map) matTecho.map.repeat.set(1.3, 1.3);
/* la tabla estaba en un naranja de mueble nuevo y era LO MÁS CLARO DEL CUADRO:
   en un pasillo negro, el ojo se va a lo más claro, y lo más claro tiene que
   ser lo que aparece — no la tabla que uno lleva siempre encima */
const matMadera= new T.MeshStandardMaterial({ map: texMadera, roughness: 0.78, metalness: 0.0, color: 0x4c4032 });
const matMetal = new T.MeshStandardMaterial({ color: 0x8a8f96, roughness: 0.34, metalness: 0.85 });
/* el bol estaba en 0xdcd7cc y a treinta centímetros de la linterna se iba a
   254 de 255: un disco blanco quemado en el medio de la pantalla, sin forma. Un
   cuenco de loza vieja no es blanco de papel. */
const matCeram = new T.MeshStandardMaterial({ color: 0x8b867d, roughness: 0.46, metalness: 0.02 });
/* ── EL AGUA VA CON `MeshPhysicalMaterial` Y ES EL ÚNICO CASO ──
   Es lo que el jugador mira todo el juego: si no refleja la linterna, no se lee
   a agua sino a pintura celeste. `transmission` cuesta una pasada más, pero
   sobre un disco de cinco centímetros eso es nada. */
/* ── Y `transmission` SE FUE, PORQUE SE MIDIÓ LO QUE COSTABA ──
   Estaba puesto con la excusa de que «sobre un disco de cinco centímetros eso
   es nada». Es falso, y de la peor manera: `transmission` renderiza la ESCENA
   ENTERA a un destino aparte una vez por cuadro, y el tamaño del objeto no
   entra en la cuenta. Medido con la misma partida, apagándolo y volviéndolo a
   prender: **7 cuadros por segundo con transmisión y 13 sin ella**, o sea que
   la mitad del presupuesto del juego se iba en el reflejo de un disco de cinco
   centímetros. La pasada extra aparece en el contador: 18 llamadas de dibujo
   contra 10, y 596 triángulos contra 336 — las mismas paredes dibujadas dos
   veces. Es la clase de costo que hay que medir apagándolo, porque no se ve en
   ningún número hasta que se apaga.
   Lo que la reemplaza hace el trabajo que el agua tiene que hacer acá: una
   superficie MUY lisa y translúcida que devuelve el reflejo especular de la
   linterna. El reflejo es lo que dice «esto es agua»; la refracción de lo que
   hay detrás de un bol opaco no la ve nadie. */
const matAgua = new T.MeshStandardMaterial({
  color: 0x8ecbe0, roughness: 0.05, metalness: 0.12,
  transparent: true, opacity: 0.88
});
