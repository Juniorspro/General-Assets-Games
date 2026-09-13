/* props/fireworks.js — Pirotecnia: cohetes, misiles, morteros, baterías, fuentes,
   velas romanas, ruedas giratorias y petardos. Generado con loops (tamaño x color)
   para mantener el archivo chico. Sólo datos, nada de THREE/CANNON acá.
   y=0 = piso del objeto, centrado en X/Z. */
(function(){

var DEFS = [];
var D2R = Math.PI / 180;

// paleta de colores de estallido: [nombreEs, colorCuerpo, [colores de la explosión]]
var COL = {
  rojo:    ['Rojo',    0xb0231b, [0xff3b2b, 0xffcf3b]],
  azul:    ['Azul',    0x1b4f9e, [0x3bb0ff, 0xffffff]],
  verde:   ['Verde',   0x1f7a3a, [0x3bff6a, 0xffffff]],
  dorado:  ['Dorado',  0x9e7a1b, [0xffd23b, 0xff8c1b]],
  violeta: ['Violeta', 0x6a1b9e, [0xb03bff, 0xff3bcf]],
  plata:   ['Plata',   0x8a8f96, [0xe8e8e8, 0xffffff]],
  naranja: ['Naranja', 0xb0521b, [0xff8c1b, 0xffd23b]],
  rosa:    ['Rosa',    0xb03b7a, [0xff6ab0, 0xffffff]],
  cian:    ['Cian',    0x1b8f9e, [0x3bf0ff, 0xffffff]],
  blanco:  ['Blanco',  0xc9c9c9, [0xffffff, 0xe8e8e8]],
  multi:   ['Multi',   0x8a1bb0, [0xff3b2b, 0x3bb0ff, 0xffd23b]],
};
function szNum(L){ return L === 'S' ? 1 : (L === 'M' ? 2 : 3); }

/* ------------------------------------------------------------- cohete de caña */
// palo fino (wood) + tubo (cardboard, color del cuerpo) + cono de punta (paint)
(function(){
  var SZ = [
    {L:'S', ht:.35, r:.028, mass:.55, fly:1.0},
    {L:'M', ht:.58, r:.038, mass:.85, fly:1.6},
    {L:'L', ht:.85, r:.05,  mass:1.3, fly:2.4},
  ];
  var colors = ['rojo','azul','verde','dorado','violeta','cian'];
  var bursts = ['peony','willow','strobe','ring'];
  SZ.forEach(function(sz){
    colors.forEach(function(ck, i){
      var col = COL[ck];
      var stickH = sz.ht*.55, tubeH = sz.ht*.30, coneH = sz.ht*.20;
      var tipY = stickH + tubeH + coneH;
      DEFS.push({ id:'fw_roc_'+ck+'_'+sz.L.toLowerCase(), name:'Coh'+col[0]+sz.L,
        mass:sz.mass, tags:['fw','rocket'], parts:[
          {s:'box', d:[.02,stickH,.02], p:[0,stickH/2,0],        m:'wood',      c:0x6b4a2e},
          {s:'cyl', d:[sz.r,tubeH],     p:[0,stickH+tubeH/2,0],  m:'cardboard', c:col[1]},
          {s:'cone',d:[sz.r*1.15,coneH],p:[0,stickH+tubeH+coneH/2,0], m:'paint', c:col[2][0]},
          {s:'sph', d:[sz.r*.35],       p:[0,tipY+sz.r*.2,0],    m:'paint',     c:col[2][1], nc:1},
        ], fw:{k:'rocket', clr:col[2], fly:sz.fly, burst:bursts[i%bursts.length], size:szNum(sz.L)} });
    });
  });
})();

/* ---------------------------------------------------------------------- misil */
// cuerpo cilíndrico (metal) + cono (paint) + 3-4 aletas radiales (paint, nc)
(function(){
  var SZ = [
    {L:'S', ht:.65,  br:.05,  mass:1.4, fly:1.0},
    {L:'M', ht:1.15, br:.075, mass:3.0, fly:1.8},
    {L:'L', ht:1.75, br:.10,  mass:5.5, fly:2.6},
  ];
  var colors = ['plata','dorado','rojo','azul','naranja','verde'];
  var bursts = ['palm','ring','strobe'];
  SZ.forEach(function(sz){
    colors.forEach(function(ck, i){
      var col = COL[ck];
      var bodyH = sz.ht*.7, noseH = sz.ht*.3;
      var finN = (i%2===0) ? 3 : 4, finH = sz.ht*.22, finLen = sz.br*1.8, finThk = .015;
      var parts = [
        {s:'cyl', d:[sz.br,bodyH],       p:[0,bodyH/2,0],      m:'metal', c:col[1]},
        {s:'cone',d:[sz.br*1.05,noseH],  p:[0,bodyH+noseH/2,0],m:'paint', c:col[2][0]},
        {s:'cyl', d:[sz.br*1.02,.04],    p:[0,.02,0],          m:'chrome', nc:1},
      ];
      for(var f=0; f<finN; f++){
        var ang = f*360/finN, rad = ang*D2R, rr = sz.br + finLen/2;
        parts.push({s:'box', d:[finLen,finH,finThk], p:[Math.cos(rad)*rr, finH/2, Math.sin(rad)*rr],
          r:[0,ang,0], m:'paint', c:col[2][1], nc:1});
      }
      DEFS.push({ id:'fw_mis_'+ck+'_'+sz.L.toLowerCase(), name:'Mis'+col[0]+sz.L,
        mass:sz.mass, tags:['fw','missile'], parts:parts,
        fw:{k:'missile', clr:col[2], fly:sz.fly, burst:bursts[i%bursts.length], size:szNum(sz.L)} });
    });
  });
})();

/* -------------------------------------------------------------------- mortero */
// base (wood) + tubo grueso corto (steel) + borde (steel, nc) + proyectil visible (paint)
(function(){
  var SZ = [
    {L:'S', h:.3,  r:.09, base:.4,  mass:3},
    {L:'M', h:.46, r:.13, base:.55, mass:5.5},
    {L:'L', h:.65, r:.17, base:.7,  mass:9},
  ];
  var colors = ['rojo','dorado','azul','violeta','verde','blanco'];
  var bursts = ['peony','ring','palm'];
  SZ.forEach(function(sz){
    colors.forEach(function(ck, i){
      var col = COL[ck], baseH = .12, tubeTop = baseH + sz.h;
      DEFS.push({ id:'fw_mor_'+ck+'_'+sz.L.toLowerCase(), name:'Mor'+col[0]+sz.L,
        mass:sz.mass, tags:['fw','mortar'], parts:[
          {s:'box', d:[sz.base,baseH,sz.base], p:[0,baseH/2,0],      m:'wood',  c:0x8a6a44},
          {s:'cyl', d:[sz.r,sz.h],             p:[0,baseH+sz.h/2,0], m:'steel'},
          {s:'cyl', d:[sz.r*1.08,.03],         p:[0,tubeTop,0],      m:'steel', nc:1},
          {s:'sph', d:[sz.r*.55],              p:[0,tubeTop+sz.r*.4,0], m:'paint', c:col[2][0]},
        ], fw:{k:'mortar', clr:col[2], shots:1, burst:bursts[i%bursts.length], size:szNum(sz.L)} });
    });
  });
})();

/* --------------------------------------------------------------- batería/torta */
// caja (cardboard) + grilla de tubitos (metal, nc) + franja decorativa (paint, nc)
(function(){
  var SZ = [
    {L:'S', w:.5,  h:.4,  d:.32, rows:2, cols:2, shots:6,  mass:4},
    {L:'M', w:.75, h:.55, d:.4,  rows:2, cols:3, shots:10, mass:7},
    {L:'L', w:1.0, h:.7,  d:.5,  rows:2, cols:4, shots:16, mass:12},
  ];
  var colors = ['multi','dorado','rojo','azul'];
  var bursts = ['multi','crackle','strobe'];
  SZ.forEach(function(sz){
    colors.forEach(function(ck, i){
      var col = COL[ck];
      var parts = [ {s:'box', d:[sz.w,sz.h,sz.d], p:[0,sz.h/2,0], m:'cardboard', c:col[1]} ];
      var tubeR = .03, tubeH = .12;
      for(var ri=0; ri<sz.rows; ri++){
        for(var ci=0; ci<sz.cols; ci++){
          var x = (ci-(sz.cols-1)/2) * (sz.w/sz.cols) * .62;
          var z = (ri-(sz.rows-1)/2) * (sz.d/sz.rows) * .62;
          parts.push({s:'cyl', d:[tubeR,tubeH], p:[x,sz.h+tubeH/2,z], m:'metal', nc:1});
        }
      }
      parts.push({s:'box', d:[sz.w*.9,.05,.02], p:[0,sz.h*.5,sz.d/2+.005], m:'paint', c:col[2][0], nc:1});
      DEFS.push({ id:'fw_cak_'+ck+'_'+sz.L.toLowerCase(), name:'Bat'+col[0]+sz.L,
        mass:sz.mass, tags:['fw','cake'], parts:parts,
        fw:{k:'cake', clr:col[2], shots:sz.shots, burst:bursts[i%bursts.length], size:szNum(sz.L)} });
    });
  });
})();

/* ---------------------------------------------------------------------- fuente */
// base (steel) + tronco ancho y chato (paint, tapering con cyl [rTop,rBot,h]) + boquilla (chrome)
(function(){
  var SZ = [
    {L:'S', h:.32, rt:.28, rb:.14, mass:3,  dur:3},
    {L:'M', h:.5,  rt:.42, rb:.2,  mass:6,  dur:5},
    {L:'L', h:.72, rt:.58, rb:.28, mass:10, dur:8},
  ];
  var colors = ['dorado','plata','rojo','verde','violeta','cian'];
  var bursts = ['willow','strobe','peony'];
  SZ.forEach(function(sz){
    colors.forEach(function(ck, i){
      var col = COL[ck], baseH = .06, topY = baseH + sz.h;
      DEFS.push({ id:'fw_fnt_'+ck+'_'+sz.L.toLowerCase(), name:'Fue'+col[0]+sz.L,
        mass:sz.mass, tags:['fw','fountain'], parts:[
          {s:'cyl', d:[sz.rb*1.1,baseH],   p:[0,baseH/2,0],  m:'steel'},
          {s:'cyl', d:[sz.rt,sz.rb,sz.h],  p:[0,baseH+sz.h/2,0], m:'paint', c:col[1]},
          {s:'cyl', d:[sz.rt*1.05,.03],    p:[0,topY,0],     m:'chrome', nc:1},
          {s:'cyl', d:[.03,.05],           p:[0,topY+.03,0], m:'chrome', c:col[2][0], nc:1},
        ], fw:{k:'fountain', clr:col[2], dur:sz.dur, burst:bursts[i%bursts.length], size:szNum(sz.L)} });
    });
  });
})();

/* ------------------------------------------------------------------ vela romana */
// base (metal) + tubo largo fino vertical (cardboard) + borde (chrome) + mecha (metal, nc)
(function(){
  var SZ = [
    {L:'S', h:.5,  r:.035, base:.16, mass:2,   dur:4, shots:5},
    {L:'M', h:.9,  r:.045, base:.2,  mass:3.5, dur:6, shots:6},
    {L:'L', h:1.4, r:.055, base:.26, mass:6,   dur:8, shots:8},
  ];
  var colors = ['rosa','dorado','azul','verde'];
  var bursts = ['crackle','strobe','multi'];
  SZ.forEach(function(sz){
    colors.forEach(function(ck, i){
      var col = COL[ck], baseH = .1, topY = baseH + sz.h;
      DEFS.push({ id:'fw_can_'+ck+'_'+sz.L.toLowerCase(), name:'Vel'+col[0]+sz.L,
        mass:sz.mass, tags:['fw','candle'], parts:[
          {s:'cyl', d:[sz.base/2,baseH],  p:[0,baseH/2,0],  m:'metal'},
          {s:'cyl', d:[sz.r,sz.h],        p:[0,baseH+sz.h/2,0], m:'cardboard', c:col[1]},
          {s:'cyl', d:[sz.r*1.15,.03],    p:[0,topY,0],      m:'chrome', nc:1},
          {s:'cyl', d:[.006,.04],         p:[0,topY+.02,0],  m:'metal', c:0x2b2015, nc:1},
        ], fw:{k:'candle', clr:col[2], dur:sz.dur, shots:sz.shots, burst:bursts[i%bursts.length], size:szNum(sz.L)} });
    });
  });
})();

/* --------------------------------------------------------------- rueda giratoria */
// poste (metal) + disco chato (paint, girado de canto) + tubitos radiales (metal, nc)
(function(){
  var SZ = [
    {L:'S', r:.35, th:.06, post:.5, mass:5, dur:4},
    {L:'M', r:.55, th:.08, post:.7, mass:8, dur:6},
  ];
  var colors = ['multi','dorado','rojo','azul'];
  var bursts = ['multi','ring'];
  SZ.forEach(function(sz){
    colors.forEach(function(ck, i){
      var col = COL[ck];
      var parts = [
        {s:'cyl', d:[.03,sz.post],   p:[0,sz.post/2,0], m:'metal'},
        {s:'cyl', d:[sz.r,sz.th],    p:[0,sz.post,0],    r:[0,0,90], m:'paint', c:col[1]},
        {s:'sph', d:[.05],           p:[0,sz.post,0],    m:'chrome', nc:1},
      ];
      for(var t=0; t<6; t++){
        var ang = t*60*D2R;
        var y = sz.post + Math.sin(ang)*sz.r*.65, z = Math.cos(ang)*sz.r*.65;
        parts.push({s:'cyl', d:[.02,.12], p:[0,y,z], r:[90,0,0], m:'metal', nc:1});
      }
      DEFS.push({ id:'fw_whe_'+ck+'_'+sz.L.toLowerCase(), name:'Rue'+col[0]+sz.L,
        mass:sz.mass, tags:['fw','wheel'], parts:parts,
        fw:{k:'wheel', clr:col[2], dur:sz.dur, burst:bursts[i%bursts.length], size:szNum(sz.L)} });
    });
  });
})();

/* -------------------------------------------------------------- petardo/bomba de suelo */
// cilindro chico (paint) + 2 vueltas de papel (cardboard, nc) + mecha (wood, nc)
(function(){
  var SZ = [
    {L:'S', h:.16, r:.05,  mass:.55},
    {L:'M', h:.24, r:.075, mass:.9},
  ];
  var colors = ['rojo','naranja','verde','azul'];
  SZ.forEach(function(sz){
    colors.forEach(function(ck){
      var col = COL[ck];
      DEFS.push({ id:'fw_bom_'+ck+'_'+sz.L.toLowerCase(), name:'Pet'+col[0]+sz.L,
        mass:sz.mass, tags:['fw','bomb'], parts:[
          {s:'cyl', d:[sz.r,sz.h],       p:[0,sz.h/2,0],   m:'paint',     c:col[1]},
          {s:'cyl', d:[sz.r*1.02,.02],   p:[0,sz.h*.25,0], m:'cardboard', c:0xd9d2b0, nc:1},
          {s:'cyl', d:[sz.r*1.02,.02],   p:[0,sz.h*.75,0], m:'cardboard', c:0xd9d2b0, nc:1},
          {s:'cyl', d:[.006,.05],        p:[0,sz.h+.025,0],m:'wood',      c:0x2b2015, nc:1},
        ], fw:{k:'bomb', clr:col[2], burst:'crackle', size:szNum(sz.L)} });
    });
  });
})();

HP.section('fw','Pirotecnia','ent',DEFS);

})();
