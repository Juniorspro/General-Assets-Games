/* ===================== EL LIENZO =====================
   Contexto 2D y no WebGL, y no es pereza: todo lo que se dibuja son rectangulos redondeados, texto y
   circulos, que es exactamente lo que un contexto 2D hace por hardware. WebGL aca no compra nada y
   cuesta mil lineas de shaders para dibujar cartas.

   EL MUNDO SE MIDE EN UNIDADES DE DISEÑO, NO EN PIXELES. Todo se calcula sobre un marco imaginario
   de 720 x 1280 y se escala al final. Sin esto, cada medida del juego —el ancho de una carta, la
   separacion del abanico, el radio del aro— habria que escribirla en funcion del tamaño de pantalla,
   y la primera que se olvide deja el abanico saliendose del marco en un telefono angosto. */
const lienzo=document.getElementById('lienzo');
const ctx=lienzo.getContext('2d');
const marco=document.getElementById('marco');
const DIS_W=720, DIS_H=1280;
let ESC=1, LW=DIS_W, LH=DIS_H, DPR=1;
/* EL DPR TIENE TECHO, y el numero salio de una medicion en otro juego de este repo: dibujar al doble
   de la resolucion de diseño duplica los pixeles a rellenar por cuadro y lo unico que se gana es
   remuestrear hacia arriba dibujos que no tienen mas detalle que dar. Con la camara encendida ese
   presupuesto hace falta para otra cosa. */
const DPR_TOPE=2;
function ajustar(){
  const w=Math.max(2, marco.clientWidth), h=Math.max(2, marco.clientHeight);
  DPR=Math.min(devicePixelRatio||1, DPR_TOPE);
  lienzo.width=Math.round(w*DPR); lienzo.height=Math.round(h*DPR);
  /* el marco ya es 9:16, asi que la escala es la misma en los dos ejes y no hay que recortar nada */
  ESC=(w*DPR)/DIS_W;
  LW=DIS_W; LH=(h*DPR)/ESC;
}
addEventListener('resize', ajustar);
ajustar();

/* de coordenadas de diseño a pixeles del lienzo, y al reves. La inversa hace falta para el toque:
   un dedo llega en pixeles de pagina y hay que saber sobre que carta cayo. */
function aPx(x,y){ return [x*ESC, y*ESC]; }
function dePagina(px,py){
  const r=marco.getBoundingClientRect();
  return [ (px-r.left)*DPR/ESC, (py-r.top)*DPR/ESC ];
}

/* ---------- helpers de dibujo ---------- */
function rr(g,x,y,w,h,r){
  const k=Math.min(r, w/2, h/2);
  g.beginPath();
  g.moveTo(x+k,y); g.lineTo(x+w-k,y); g.quadraticCurveTo(x+w,y,x+w,y+k);
  g.lineTo(x+w,y+h-k); g.quadraticCurveTo(x+w,y+h,x+w-k,y+h);
  g.lineTo(x+k,y+h); g.quadraticCurveTo(x,y+h,x,y+h-k);
  g.lineTo(x,y+k); g.quadraticCurveTo(x,y,x+k,y); g.closePath();
}
function txt(g,s,x,y,px,col,peso,esp,alin){
  g.save();
  g.font=(peso||400)+' '+px+'px "Segoe UI",system-ui,-apple-system,Roboto,Helvetica,Arial,sans-serif';
  g.fillStyle=col; g.textAlign=alin||'center'; g.textBaseline='middle';
  if(esp){
    /* el espaciado de letras no existe en canvas 2D en todos los navegadores, asi que se dibuja
       letra por letra: es la unica forma de que el titulo y los rotulos se vean como en el CSS */
    let tot=0; for(const ch of s) tot+=g.measureText(ch).width+esp;
    tot-=esp;
    let cx = alin==='left'? x : (alin==='right'? x-tot : x-tot/2);
    g.textAlign='left';
    for(const ch of s){ g.fillText(ch,cx,y); cx+=g.measureText(ch).width+esp; }
  } else g.fillText(s,x,y);
  g.restore();
}

/* ===================== LA CARTA =====================
   MEDIDAS: 96 x 144 de diseño, o sea la proporcion 2:3 de una carta de verdad. El ovalo blanco
   inclinado es lo que la hace leer a carta de este juego y no a ficha de color, y el numero va
   DOS VECES —grande en el ovalo y chico en las esquinas— porque en el abanico las cartas se tapan
   entre si y lo unico que asoma es la esquina. */
const CW=96, CH=144;
function simbolo(v){
  if(v===SALTA) return '⊘';
  if(v===GIRA)  return '⇄';
  if(v===MAS2)  return '+2';
  if(v===MAS4)  return '+4';
  if(v===COMODIN) return '★';
  return String(v);
}
function dibujarCarta(g, c, x, y, w, h, o){
  o=o||{};
  const s=w/CW;
  g.save();
  if(o.sombra){ g.shadowColor='rgba(0,0,0,.55)'; g.shadowBlur=18*s; g.shadowOffsetY=7*s; }
  rr(g,x,y,w,h,11*s);
  g.fillStyle = c.color<4? COLORES[c.color] : '#23252c';
  g.fill();
  g.shadowColor='transparent';
  /* el borde blanco: una carta sin borde sobre un fondo oscuro se lee a mancha de color */
  rr(g,x+3.5*s,y+3.5*s,w-7*s,h-7*s,8*s);
  g.strokeStyle='#f6f7f8'; g.lineWidth=3.2*s; g.stroke();

  if(c.color===4){
    /* EL COMODIN LLEVA LOS CUATRO COLORES, y no un dibujo abstracto: es lo unico que dice "esta
       carta se convierte en cualquiera de estos" sin una linea de texto. */
    const cx=x+w/2, cy=y+h/2, r=w*0.30;
    for(let k=0;k<4;k++){
      g.beginPath(); g.moveTo(cx,cy);
      g.arc(cx,cy,r, (k*90-135)*Math.PI/180, ((k+1)*90-135)*Math.PI/180);
      g.closePath(); g.fillStyle=COLORES[k]; g.fill();
    }
    if(c.valor===MAS4) txt(g,'+4',cx,cy+h*0.30, w*0.26, '#f6f7f8', 800);
  } else {
    g.save();
    g.translate(x+w/2, y+h/2); g.rotate(-Math.PI/8);
    g.beginPath(); g.ellipse(0,0, w*0.40, h*0.30, 0, 0, Math.PI*2);
    g.fillStyle='#f6f7f8'; g.fill();
    g.restore();
    const sim=simbolo(c.valor);
    txt(g, sim, x+w/2, y+h/2, sim.length>1? w*0.42 : w*0.56, COL_OSC[c.color], 800);
  }
  const sim=simbolo(c.valor);
  const cEsq = c.color===4? '#f6f7f8' : '#f6f7f8';
  txt(g, sim, x+w*0.15, y+h*0.11, w*0.19, cEsq, 700, 0, 'center');
  txt(g, sim, x+w*0.85, y+h*0.89, w*0.19, cEsq, 700, 0, 'center');
  g.restore();
}
/* el dorso: la misma silueta con el ovalo, para que una carta dada vuelta se lea como la misma carta */
function dibujarDorso(g, x, y, w, h, o){
  const s=w/CW;
  g.save();
  if(o&&o.sombra){ g.shadowColor='rgba(0,0,0,.5)'; g.shadowBlur=14*s; g.shadowOffsetY=5*s; }
  rr(g,x,y,w,h,11*s); g.fillStyle='#1b1d24'; g.fill();
  g.shadowColor='transparent';
  rr(g,x+3.5*s,y+3.5*s,w-7*s,h-7*s,8*s); g.strokeStyle='#3a3e4a'; g.lineWidth=3.2*s; g.stroke();
  g.save();
  g.translate(x+w/2,y+h/2); g.rotate(-Math.PI/8);
  g.beginPath(); g.ellipse(0,0,w*0.36,h*0.27,0,0,Math.PI*2);
  g.fillStyle='#2a2d36'; g.fill();
  g.restore();
  txt(g,'R', x+w/2, y+h/2, w*0.30, '#4b5060', 800);
  g.restore();
}
