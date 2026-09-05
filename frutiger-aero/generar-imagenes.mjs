/* ---------------------------------------------------------------------------
   El dibujante de canvas.

   OJO: ya NO hace las ilustraciones del sitio. Esas están generadas con Rezona
   (ver `imagenes.json`) y viven en `sitio/img/`. Este archivo escribe en
   `pruebas-canvas/`, a propósito: si siguiera apuntando a `sitio/img/`, correrlo
   una vez pisaría en silencio las quince ilustraciones buenas.

   Sigue acá porque es el mismo código que corre en vivo dentro de la página, en
   el taller de «Hacé el tuyo», y porque es la forma de probar una escena nueva
   antes de meterla ahí.

       node generar-imagenes.mjs

   El sitio que se publica es la carpeta `sitio/` y nada más. Este archivo y las
   notas quedan afuera a propósito: son del repo, no de la web.
   --------------------------------------------------------------------------- */
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const AQUI = path.dirname(new URL(import.meta.url).pathname);
const SALIDA = path.join(AQUI, "pruebas-canvas");
fs.mkdirSync(SALIDA, { recursive: true });

/* Las piezas del lenguaje Frutiger, para componer escenas con ellas. Todo esto
   corre adentro del navegador. */
const TALLER = `
function azar(a,b){ return a + Math.random()*(b-a); }
function entero(a,b){ return Math.floor(azar(a,b+1)); }
function elegir(l){ return l[entero(0,l.length-1)]; }

/* cielo: tres paradas y un sol con halo. Sin el halo queda plano. */
function cielo(c,an,al,cols,solX,solY){
  const g=c.createLinearGradient(0,0,0,al);
  g.addColorStop(0,cols[0]); g.addColorStop(.5,cols[1]); g.addColorStop(1,cols[2]);
  c.fillStyle=g; c.fillRect(0,0,an,al);
  if(solX==null) return;
  const s=c.createRadialGradient(solX,solY,0,solX,solY,Math.max(an,al)*.62);
  s.addColorStop(0,"rgba(255,255,255,.98)");
  s.addColorStop(.08,"rgba(255,255,255,.7)");
  s.addColorStop(.3,"rgba(255,255,255,.22)");
  s.addColorStop(1,"rgba(255,255,255,0)");
  c.fillStyle=s; c.fillRect(0,0,an,al);
}

/* los rayos de sol: triángulos finitos que se suman, no se pintan */
function rayos(c,an,al,x,y,cuantos,alfa){
  c.save(); c.globalCompositeOperation="lighter";
  for(let i=0;i<cuantos;i++){
    const ang=azar(-1.5,1.5), largo=Math.max(an,al)*azar(.6,1.4), ancho=azar(6,52);
    c.save(); c.translate(x,y); c.rotate(ang);
    const g=c.createLinearGradient(0,0,0,largo);
    g.addColorStop(0,"rgba(255,255,255,"+alfa+")"); g.addColorStop(1,"rgba(255,255,255,0)");
    c.fillStyle=g; c.beginPath();
    c.moveTo(-ancho/7,0); c.lineTo(ancho/7,0); c.lineTo(ancho,largo); c.lineTo(-ancho,largo);
    c.closePath(); c.fill(); c.restore();
  }
  c.restore();
}

/* nubes de mediodía: montoncitos de círculos con degradado, nunca un óvalo */
function nubes(c,an,alTope,cuantas,escala){
  for(let n=0;n<cuantas;n++){
    const nx=azar(-60,an+60), ny=azar(alTope*.05,alTope*.7), e=azar(.6,1.6)*(escala||1);
    c.save(); c.globalAlpha=azar(.4,.85);
    for(let b=0;b<9;b++){
      const bx=nx+azar(-110,110)*e, by=ny+azar(-20,20)*e, br=azar(26,68)*e;
      const g=c.createRadialGradient(bx,by-br*.35,br*.08,bx,by,br);
      g.addColorStop(0,"rgba(255,255,255,.99)"); g.addColorStop(.6,"rgba(255,255,255,.55)");
      g.addColorStop(1,"rgba(255,255,255,0)");
      c.fillStyle=g; c.beginPath(); c.arc(bx,by,br,0,7); c.fill();
    }
    c.restore();
  }
}

/* una burbuja: aro de luz, brillo arriba a la izquierda y refracción abajo */
function burbuja(c,x,y,r,alfa){
  const g=c.createRadialGradient(x-r*.28,y-r*.34,r*.04,x,y,r);
  g.addColorStop(0,"rgba(255,255,255,"+(.95*alfa)+")");
  g.addColorStop(.22,"rgba(255,255,255,"+(.28*alfa)+")");
  g.addColorStop(.7,"rgba(180,240,255,"+(.10*alfa)+")");
  g.addColorStop(.93,"rgba(255,255,255,"+(.16*alfa)+")");
  g.addColorStop(1,"rgba(255,255,255,"+(.55*alfa)+")");
  c.fillStyle=g; c.beginPath(); c.arc(x,y,r,0,7); c.fill();
  c.strokeStyle="rgba(255,255,255,"+(.45*alfa)+")"; c.lineWidth=Math.max(1,r*.02); c.stroke();
  c.fillStyle="rgba(255,255,255,"+(.9*alfa)+")";
  c.beginPath(); c.ellipse(x-r*.34,y-r*.4,r*.24,r*.14,-.6,0,7); c.fill();
  c.fillStyle="rgba(255,255,255,"+(.35*alfa)+")";
  c.beginPath(); c.ellipse(x+r*.22,y+r*.42,r*.18,r*.1,.5,0,7); c.fill();
}

/* agua vista de arriba, con sus caústicas */
function agua(c,an,desde,hasta,cols){
  const g=c.createLinearGradient(0,desde,0,hasta);
  g.addColorStop(0,cols[0]); g.addColorStop(1,cols[1]);
  c.fillStyle=g; c.fillRect(0,desde,an,hasta-desde);
  c.save(); c.beginPath(); c.rect(0,desde,an,hasta-desde); c.clip();
  c.globalCompositeOperation="lighter";
  for(let i=0;i<90;i++){
    const y=desde+Math.pow(Math.random(),1.6)*(hasta-desde);
    const prof=(y-desde)/Math.max(1,hasta-desde);
    c.strokeStyle="rgba(255,255,255,"+(.30-prof*.2).toFixed(3)+")";
    c.lineWidth=azar(1,3+prof*6);
    const x=azar(-120,an), largo=azar(50,300)*(1+prof);
    c.beginPath(); c.moveTo(x,y);
    c.bezierCurveTo(x+largo*.3,y-5,x+largo*.7,y+5,x+largo,y); c.stroke();
  }
  c.restore();
}

/* lomas de pasto, en capas: la de atrás más clara */
function pasto(c,an,al,base,cols,capas){
  for(let k=0;k<capas;k++){
    const b=base+(al-base)*(k*.3);
    const g=c.createLinearGradient(0,b-120,0,al);
    g.addColorStop(0,cols[0]); g.addColorStop(1,cols[1]);
    c.fillStyle=g; c.globalAlpha=k===0?.9:1;
    c.beginPath(); c.moveTo(-20,al); c.lineTo(-20,b+azar(-40,40));
    const paso=an/6;
    for(let x=0;x<=an+paso;x+=paso)
      c.quadraticCurveTo(x+paso/2,b+azar(-90,50),x+paso,b+azar(-40,40));
    c.lineTo(an+20,al); c.closePath(); c.fill(); c.globalAlpha=1;
  }
}

/* una placa de vidrio Aero: fondo aclarado, borde de luz y brillo arriba */
function vidrio(c,x,y,an,al,r){
  c.save();
  c.beginPath();
  c.moveTo(x+r,y); c.arcTo(x+an,y,x+an,y+al,r); c.arcTo(x+an,y+al,x,y+al,r);
  c.arcTo(x,y+al,x,y,r); c.arcTo(x,y,x+an,y,r); c.closePath();
  c.save(); c.clip();
  c.fillStyle="rgba(255,255,255,.22)"; c.fillRect(x,y,an,al);
  const g=c.createLinearGradient(0,y,0,y+al*.55);
  g.addColorStop(0,"rgba(255,255,255,.65)"); g.addColorStop(1,"rgba(255,255,255,0)");
  c.fillStyle=g; c.fillRect(x,y,an,al*.55);
  c.restore();
  c.strokeStyle="rgba(255,255,255,.85)"; c.lineWidth=Math.max(1,an*.004); c.stroke();
  c.restore();
}

/* el orbe de caramelo: la pieza más repetida de la época */
function orbe(c,x,y,r,tono){
  const g=c.createRadialGradient(x-r*.3,y-r*.4,r*.05,x,y,r);
  g.addColorStop(0,"#ffffff"); g.addColorStop(.2,tono[0]);
  g.addColorStop(.72,tono[1]); g.addColorStop(1,tono[2]);
  c.fillStyle=g; c.beginPath(); c.arc(x,y,r,0,7); c.fill();
  const b=c.createLinearGradient(0,y-r,0,y+r*.1);
  b.addColorStop(0,"rgba(255,255,255,.92)"); b.addColorStop(1,"rgba(255,255,255,0)");
  c.fillStyle=b; c.beginPath(); c.ellipse(x,y-r*.36,r*.72,r*.46,0,0,7); c.fill();
  c.fillStyle="rgba(255,255,255,.30)";
  c.beginPath(); c.ellipse(x,y+r*.55,r*.6,r*.22,0,0,7); c.fill();
  c.strokeStyle="rgba(255,255,255,.6)"; c.lineWidth=Math.max(1,r*.03);
  c.beginPath(); c.arc(x,y,r,0,7); c.stroke();
}

/* gotas de agua sobre una superficie */
function gotas(c,an,al,cuantas){
  for(let i=0;i<cuantas;i++){
    const x=azar(0,an), y=azar(0,al), r=azar(3,22);
    c.save();
    c.fillStyle="rgba(255,255,255,.14)";
    c.beginPath(); c.ellipse(x,y,r,r*azar(.75,1),azar(0,3),0,7); c.fill();
    c.strokeStyle="rgba(255,255,255,.4)"; c.lineWidth=1; c.stroke();
    c.fillStyle="rgba(255,255,255,.85)";
    c.beginPath(); c.ellipse(x-r*.3,y-r*.35,r*.24,r*.16,-.5,0,7); c.fill();
    c.fillStyle="rgba(0,60,90,.12)";
    c.beginPath(); c.ellipse(x+r*.25,y+r*.4,r*.4,r*.2,.4,0,7); c.fill();
    c.restore();
  }
}

/* siluetas de peces, para el acuario */
function pez(c,x,y,l,alfa){
  c.save(); c.translate(x,y); c.globalAlpha=alfa;
  c.fillStyle="rgba(10,60,90,.9)";
  c.beginPath(); c.moveTo(0,0);
  c.quadraticCurveTo(l*.5,-l*.26,l,0);
  c.quadraticCurveTo(l*.5,l*.26,0,0); c.fill();
  c.beginPath(); c.moveTo(0,0); c.lineTo(-l*.28,-l*.2); c.lineTo(-l*.28,l*.2); c.closePath(); c.fill();
  c.restore();
}

/* aluminio cepillado: la mitad «tecnología» de la estética */
function aluminio(c,an,al){
  const g=c.createLinearGradient(0,0,0,al);
  g.addColorStop(0,"#f4f8fb"); g.addColorStop(.42,"#c9d6e0");
  g.addColorStop(.5,"#aebecb"); g.addColorStop(.58,"#d6e2ea"); g.addColorStop(1,"#eef4f8");
  c.fillStyle=g; c.fillRect(0,0,an,al);
  c.save(); c.globalAlpha=.5;
  for(let i=0;i<al*2;i++){
    c.strokeStyle="rgba(255,255,255,"+azar(.02,.14).toFixed(3)+")";
    const y=azar(0,al); c.beginPath(); c.moveTo(0,y); c.lineTo(an,y); c.stroke();
  }
  c.restore();
}

/* el velo final: sin esto todo parece un dibujo plano */
function velo(c,an,al,arriba,abajo){
  const g=c.createLinearGradient(0,0,0,al);
  g.addColorStop(0,"rgba(255,255,255,"+arriba+")");
  g.addColorStop(.5,"rgba(255,255,255,0)");
  g.addColorStop(1,"rgba(0,40,80,"+abajo+")");
  c.fillStyle=g; c.fillRect(0,0,an,al);
}
`;

/* Las escenas. Cada una es una composición pensada, no ruido al azar. */
const ESCENAS = {
  portada: (an, al) => `
    const h=al*.62, sx=an*.72, sy=al*.20;
    cielo(c,an,h,["#dff6ff","#63cdf6","#1379c0"],sx,sy);
    nubes(c,an,h,5,1.3); rayos(c,an,al,sx,sy,12,.26);
    agua(c,an,h,al,["#2ec8ea","#075f9e"]);
    pasto(c,an,al,h+(al-h)*.30,["#93e85c","#1d8f2c"],2);
    for(let i=0;i<26;i++) burbuja(c,azar(0,an),azar(0,al),azar(al*.012,al*.075),azar(.5,1));
    velo(c,an,al,.14,.26);`,

  burbujas: (an, al) => `
    cielo(c,an,al,["#eafcff","#5fd8f5","#0d74b8"],an*.3,al*.2);
    rayos(c,an,al,an*.3,al*.2,9,.20);
    for(let i=0;i<34;i++) burbuja(c,azar(-20,an+20),azar(-20,al+20),azar(al*.02,al*.20),azar(.45,1));
    velo(c,an,al,.10,.18);`,

  acuario: (an, al) => `
    cielo(c,an,al,["#7fe4f5","#1a9fd6","#03395f"],an*.5,-al*.15);
    rayos(c,an,al,an*.5,-al*.1,14,.22);
    c.save(); c.globalAlpha=.5;
    for(let i=0;i<7;i++){ const x=azar(0,an); c.fillStyle="rgba(20,120,90,.6)";
      c.beginPath(); c.moveTo(x,al);
      c.quadraticCurveTo(x+azar(-70,70),al*.55,x+azar(-40,40),al*.15);
      c.lineWidth=azar(6,26); c.strokeStyle="rgba(25,140,100,.55)"; c.stroke(); }
    c.restore();
    for(let i=0;i<9;i++) pez(c,azar(an*.08,an*.9),azar(al*.2,al*.85),azar(al*.05,al*.14),azar(.25,.7));
    for(let i=0;i<20;i++) burbuja(c,azar(0,an),azar(0,al),azar(al*.008,al*.05),azar(.4,.95));
    velo(c,an,al,.06,.34);`,

  vidrio: (an, al) => `
    cielo(c,an,al,["#e8f9ff","#7cd6f2","#1f7fbe"],an*.8,al*.1);
    for(let i=0;i<14;i++) burbuja(c,azar(0,an),azar(0,al),azar(al*.02,al*.12),azar(.3,.7));
    vidrio(c,an*.08,al*.16,an*.84,al*.30,al*.05);
    vidrio(c,an*.08,al*.54,an*.40,al*.28,al*.05);
    vidrio(c,an*.52,al*.54,an*.40,al*.28,al*.05);
    orbe(c,an*.5,al*.31,al*.09,["#bff0ff","#2fa8e8","#0a5286"]);
    velo(c,an,al,.12,.20);`,

  pasto: (an, al) => `
    const h=al*.58;
    cielo(c,an,h,["#eaf9ff","#7fd0f5","#2f86c8"],an*.2,h*.28);
    nubes(c,an,h,7,1.5);
    pasto(c,an,al,h,["#a6f06a","#22932f"],3);
    for(let i=0;i<12;i++) burbuja(c,azar(0,an),azar(0,h),azar(al*.01,al*.05),azar(.3,.7));
    velo(c,an,al,.14,.22);`,

  orbes: (an, al) => `
    cielo(c,an,al,["#f6fdff","#bfe9fb","#5aa8d8"],an*.5,al*.1);
    const tonos=[["#d8f5ff","#3fb8f0","#0b5f96"],["#e6ffd8","#6ddc3f","#1d7a1a"],
                 ["#ffe8d8","#f79b3f","#a84f0b"],["#f2d8ff","#a95cf0","#4a1a86"],
                 ["#ffd8e8","#f04f8f","#8a0d40"]];
    const n=5, paso=an/(n+1);
    for(let i=0;i<n;i++) orbe(c,paso*(i+1),al*.5,Math.min(paso*.36,al*.30),tonos[i]);
    velo(c,an,al,.10,.14);`,

  hojas: (an, al) => `
    const g=c.createLinearGradient(0,0,an*.4,al);
    g.addColorStop(0,"#d6f9b8"); g.addColorStop(.5,"#4fbf3a"); g.addColorStop(1,"#0d5e22");
    c.fillStyle=g; c.fillRect(0,0,an,al);
    for(let i=0;i<11;i++){
      const x=azar(-40,an+40), y=azar(-40,al+40), lr=azar(al*.18,al*.62), ang=azar(0,6.28);
      c.save(); c.translate(x,y); c.rotate(ang);
      const hg=c.createLinearGradient(0,-lr*.3,0,lr*.3);
      hg.addColorStop(0,"rgba(190,255,150,.9)"); hg.addColorStop(1,"rgba(20,110,40,.9)");
      c.fillStyle=hg; c.beginPath(); c.ellipse(0,0,lr,lr*azar(.22,.4),0,0,7); c.fill();
      c.strokeStyle="rgba(255,255,255,.35)"; c.lineWidth=Math.max(1,lr*.012);
      c.beginPath(); c.moveTo(-lr,0); c.lineTo(lr,0); c.stroke();
      c.restore();
    }
    rayos(c,an,al,an*.75,-al*.1,8,.24);
    gotas(c,an,al,70);
    velo(c,an,al,.14,.28);`,

  aurora: (an, al) => `
    cielo(c,an,al,["#ffe3b0","#ff9ecb","#4b53c8"],an*.15,al*.72);
    c.save(); c.globalCompositeOperation="lighter";
    for(let i=0;i<9;i++){
      const y=azar(al*.05,al*.7), alto=azar(al*.04,al*.20);
      const g=c.createLinearGradient(0,y,0,y+alto);
      g.addColorStop(0,"rgba(120,255,220,0)");
      g.addColorStop(.5,"rgba("+entero(90,180)+",255,"+entero(190,255)+",.30)");
      g.addColorStop(1,"rgba(120,200,255,0)");
      c.fillStyle=g; c.beginPath(); c.moveTo(-20,y);
      for(let x=-20;x<=an+40;x+=an/8) c.lineTo(x,y+Math.sin(x/an*6+i)*alto*.5);
      c.lineTo(an+40,y+alto); 
      for(let x=an+40;x>=-20;x-=an/8) c.lineTo(x,y+alto+Math.sin(x/an*6+i)*alto*.4);
      c.closePath(); c.fill();
    }
    c.restore();
    for(let i=0;i<70;i++){ c.fillStyle="rgba(255,255,255,"+azar(.2,.9).toFixed(2)+")";
      c.beginPath(); c.arc(azar(0,an),azar(0,al*.7),azar(.6,2.2),0,7); c.fill(); }
    for(let i=0;i<10;i++) burbuja(c,azar(0,an),azar(0,al),azar(al*.02,al*.09),azar(.3,.7));
    velo(c,an,al,.06,.30);`,

  aluminio: (an, al) => `
    aluminio(c,an,al);
    orbe(c,an*.26,al*.5,al*.22,["#d8f2ff","#3fb0ea","#0a5286"]);
    orbe(c,an*.5,al*.5,al*.22,["#e6ffd8","#6ddc3f","#1d7a1a"]);
    orbe(c,an*.74,al*.5,al*.22,["#ffd8e8","#f04f8f","#8a0d40"]);
    gotas(c,an,al,28);
    const g=c.createLinearGradient(0,0,an,al);
    g.addColorStop(0,"rgba(255,255,255,.35)"); g.addColorStop(.5,"rgba(255,255,255,0)");
    g.addColorStop(1,"rgba(120,170,210,.22)");
    c.fillStyle=g; c.fillRect(0,0,an,al);`,

  medusas: (an, al) => `
    cielo(c,an,al,["#9df0ff","#1f9fd8","#062b52"],an*.5,-al*.2);
    rayos(c,an,al,an*.5,-al*.15,12,.18);
    for(let i=0;i<8;i++){
      const x=azar(an*.08,an*.92), y=azar(al*.12,al*.82), r=azar(al*.05,al*.15);
      c.save(); c.globalAlpha=azar(.4,.85);
      const g=c.createRadialGradient(x,y-r*.3,r*.1,x,y,r);
      g.addColorStop(0,"rgba(255,255,255,.95)"); g.addColorStop(.6,"rgba(190,240,255,.55)");
      g.addColorStop(1,"rgba(140,220,255,.05)");
      c.fillStyle=g; c.beginPath(); c.ellipse(x,y,r,r*.78,0,Math.PI,0); c.fill();
      c.strokeStyle="rgba(255,255,255,.55)"; c.lineWidth=Math.max(1,r*.05);
      for(let t=0;t<7;t++){
        const tx=x-r*.7+t*(r*1.4/6);
        c.beginPath(); c.moveTo(tx,y);
        c.bezierCurveTo(tx+azar(-r*.3,r*.3),y+r*1.1,tx+azar(-r*.4,r*.4),y+r*1.6,tx+azar(-r*.3,r*.3),y+r*2.3);
        c.stroke();
      }
      c.restore();
    }
    for(let i=0;i<16;i++) burbuja(c,azar(0,an),azar(0,al),azar(al*.008,al*.04),azar(.4,.9));
    velo(c,an,al,.06,.34);`
};

const PEDIDOS = [
  ["portada",  1600, 760], ["portada-chica", 900, 640, "portada"],
  ["burbujas",  900, 640], ["acuario",   900, 640], ["vidrio", 900, 640],
  ["pasto",     900, 640], ["orbes",     900, 520], ["hojas",  900, 640],
  ["aurora",    900, 640], ["aluminio",  900, 520], ["medusas", 900, 640],
  ["galeria-1", 640, 640, "burbujas"], ["galeria-2", 640, 640, "acuario"],
  ["galeria-3", 640, 640, "pasto"],    ["galeria-4", 640, 640, "aurora"],
  ["galeria-5", 640, 640, "medusas"],  ["galeria-6", 640, 640, "vidrio"],
  ["galeria-7", 640, 640, "hojas"],    ["galeria-8", 640, 640, "orbes"]
];

const b = await chromium.launch({
  executablePath: "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
  args: ["--no-sandbox"]
});
const pg = await (await b.newContext()).newPage();
await pg.setContent("<canvas id='l'></canvas>");
await pg.addScriptTag({ content: TALLER });

let total = 0;
for (const [nombre, an, al, escenaAlias] of PEDIDOS) {
  const escena = ESCENAS[escenaAlias || nombre];
  if (!escena) { console.log("sin escena:", nombre); continue; }
  const datos = await pg.evaluate(({ an, al, cuerpo }) => {
    const l = document.getElementById("l");
    l.width = an; l.height = al;
    const c = l.getContext("2d");
    new Function("c", "an", "al", cuerpo)(c, an, al);
    return l.toDataURL("image/webp", 0.86);
  }, { an, al, cuerpo: escena(an, al) });
  const archivo = path.join(SALIDA, nombre + ".webp");
  fs.writeFileSync(archivo, Buffer.from(datos.split(",")[1], "base64"));
  console.log(String(Math.round(fs.statSync(archivo).size / 1024)).padStart(4) + " KB  " + nombre + ".webp  (" + an + "×" + al + ")");
  total += fs.statSync(archivo).size;
}
console.log("\n" + PEDIDOS.length + " imágenes · " + Math.round(total / 1024) + " KB en total");
await b.close();
