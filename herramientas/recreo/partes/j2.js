
/* =========================================================================================
   GANCHOS DE PRUEBA
   Tres cosas que no se ven en una foto y hay que medir: que el modelo generado cargue CON su
   esqueleto y que las animaciones lo muevan de verdad; que contar dedos funcione; y que el guion
   avance sin trabarse en ninguna escena.
   ========================================================================================= */
window.__recreo={
  estado:()=>({ pant, jugando, terminado, escena:(GUION[escena_i]||{}).id||null, i:escena_i,
                t:+escenaT.toFixed(2), espera:+esperaT.toFixed(2),
                aula:aulaN, aulaIdx, aulaK, bichos:bichosVivos, muertes,
                grito:+gritoT.toFixed(2),
                libros, aciertos, total:TOTAL_CUENTAS,
                cuenta: cuenta? {txt:cuenta.txt, res:cuenta.res} : null,
                cam:[+cam.x.toFixed(2), +cam.z.toFixed(2), +cam.giro.toFixed(2)],
                profe:[+PROFE.x.toFixed(2), +PROFE.z.toFixed(2)], anim:PROFE.anim,
                dialogo:(document.getElementById('dTxt')||{}).textContent||'' }),
  empezar:()=>{ empezar(); return window.__recreo.estado(); },
  /* ---- EL MODELO GENERADO ---- */
  modelo:()=>{
    const R=baldiGLB? baldi : null;
    const o={ glb:baldiGLB, faltan: R? R.faltan : null, huesos:{} };
    if(R){ for(const k in HUESO_DE) o.huesos[k]= R[k]? HUESO_DE[k] : null; }
    let tris=0, mallas=0, huesos=0;
    (baldiGLB? baldi.raiz : profe.raiz).traverse(q=>{
      if(q.isMesh){ mallas++; const g=q.geometry;
        tris += g.index? g.index.count/3 : (g.attributes.position? g.attributes.position.count/3 : 0); }
      if(q.isBone) huesos++;
    });
    o.mallas=mallas; o.tris=Math.round(tris); o.huesosEnEscena=huesos;
    if(baldiGLB){ const c=new THREE.Box3().setFromObject(baldi.raiz);
      o.alto=+(c.max.y-c.min.y).toFixed(3); o.pieY=+c.min.y.toFixed(3); }
    return o;
  },
  /* mide el recorrido de las manos y las rodillas en un ciclo: es la unica prueba de que la
     animacion mueve algo, y de que las cinco son distintas entre si */
  animMedir:(nombre, pasos)=>{
    const R=baldiGLB? baldi : profe;
    const partes=['manoD','manoI','rodillaD','rodillaI','cabeza'].filter(k=>R[k]);
    const n=pasos||60, mm={}, v=new THREE.Vector3();
    for(const k of partes) mm[k]={min:[1e9,1e9,1e9], max:[-1e9,-1e9,-1e9]};
    for(let s=0;s<n;s++){
      animarBaldi(nombre, null, 0, s/n*(Math.PI*4));
      R.raiz.updateMatrixWorld(true);
      for(const k of partes){ R[k].getWorldPosition(v);
        const a=[v.x,v.y,v.z];
        for(let q=0;q<3;q++){ if(a[q]<mm[k].min[q]) mm[k].min[q]=a[q];
                              if(a[q]>mm[k].max[q]) mm[k].max[q]=a[q]; } }
    }
    const r={};
    for(const k of partes) r[k]=mm[k].max.map((x,q)=>+(x-mm[k].min[q]).toFixed(3));
    return { anim:nombre, glb:baldiGLB, recorrido:r };
  },
  anim:(n,t)=>{ if(n){ PROFE.animOtro=PROFE.anim; PROFE.anim=n; PROFE.mezcla=0; }
                if(t!=null) PROFE.at=t;
                animarBaldi(PROFE.anim, PROFE.animOtro, PROFE.mezcla, PROFE.at);
                return PROFE.anim; },
  animLista:()=>ANIM_NOMBRES,
  /* VOLCADO DE HUESOS: la rotacion con la que vino el hueso (bind) contra la que tiene puesta ahora,
     y donde caen manos y pies en el mundo. Es la unica forma de ver si mis poses SUMAN a la pose de
     reposo del rig o la PISAN. */
  huesosDump:()=>{
    const R=baldiGLB? baldi : profe;
    const o={}, v=new THREE.Vector3();
    R.raiz.updateMatrixWorld(true);
    for(const k in HUESO_DE){
      const q=R[k]; if(!q) continue;
      o[k]={ bind: q.userData.bind? q.userData.bind.map(x=>+x.toFixed(3)) : null,
             ahora:[+q.rotation.x.toFixed(3), +q.rotation.y.toFixed(3), +q.rotation.z.toFixed(3)] };
      if(q.userData.abdBind!=null) o[k].abdBind=+q.userData.abdBind.toFixed(3);
    }
    const p={};
    for(const k of ['manoD','manoI','rodillaD','rodillaI','cabeza']){
      if(!R[k]) continue; R[k].getWorldPosition(v);
      p[k]=[+v.x.toFixed(3), +v.y.toFixed(3), +v.z.toFixed(3)];
    }
    return { huesos:o, mundo:p };
  },
  /* PARA MEDIR LOS EJES DEL RIG. Los ejes locales de un hueso dependen de como quedo el bind, asi
     que el desvio de reposo no se adivina: se gira el hueso en un eje y se mira para donde se fue la
     mano en el mundo. */
  probarHueso:(hueso, eje, ang)=>{
    const R=baldiGLB? baldi : profe;
    const o=R[hueso]; if(!o) return 'no hay '+hueso;
    const v=new THREE.Vector3(), antes=new THREE.Vector3();
    const mano = hueso.indexOf('hombro')===0||hueso.indexOf('codo')===0? (hueso.slice(-1)==='D'?'manoD':'manoI')
               : (hueso.indexOf('cadera')===0||hueso.indexOf('rodilla')===0? (hueso.slice(-1)==='D'?'rodillaD':'rodillaI') : 'cabeza');
    const ref=R[mano]||R.cabeza;
    const r0=o.rotation.clone();
    const bi=o.userData.bind||[0,0,0];
    R.raiz.updateMatrixWorld(true); ref.getWorldPosition(antes);
    /* el angulo se mide como DELTA sobre el bind, que es como lo aplica animarGLB */
    o.rotation.set(bi[0]+(eje==='x'?ang:0), bi[1]+(eje==='y'?ang:0), bi[2]+(eje==='z'?ang:0));
    R.raiz.updateMatrixWorld(true); ref.getWorldPosition(v);
    o.rotation.copy(r0); R.raiz.updateMatrixWorld(true);
    return { hueso, eje, ang, ref:mano,
             de:[+antes.x.toFixed(3),+antes.y.toFixed(3),+antes.z.toFixed(3)],
             a:[+v.x.toFixed(3),+v.y.toFixed(3),+v.z.toFixed(3)],
             delta:[+(v.x-antes.x).toFixed(3),+(v.y-antes.y).toFixed(3),+(v.z-antes.z).toFixed(3)] };
  },
  reposo:(hueso, xyz)=>{ const R=baldiGLB? baldi : profe; const o=R[hueso];
    if(!o) return 'no hay '+hueso;
    if(xyz){ o.userData.rep=xyz; REPOSO[hueso]=xyz; }
    return o.userData.rep||[0,0,0]; },
  /* ---- EL ENCUADRE ----
     Mover la camara y LEER DONDE CAE EL PERSONAJE EN PIXELES. Sin esto el encuadre se ajusta a ojo
     sobre capturas, que es exactamente como se me paso que el tercio de abajo de la pantalla era
     piso vacio. */
  encuadre:(o)=>{
    if(o){
      if(o.z!=null){ cam.z=o.z; cam.az=o.z; }
      if(o.x!=null){ cam.x=o.x; cam.ax=o.x; }
      if(o.pitch!=null){ cam.pitch=o.pitch; cam.apitch=o.pitch; }
      if(o.ojo!=null){ cam.ojo=o.ojo; cam.aojo=o.ojo; }
      if(o.fov!=null){ camara.fov=o.fov; camara.updateProjectionMatrix(); }
    }
    return { z:+cam.z.toFixed(2), x:+cam.x.toFixed(2), pitch:+cam.pitch.toFixed(3),
             ojo:+cam.ojo.toFixed(2), fov:camara.fov,
             marco:[lienzo.clientWidth, lienzo.clientHeight] };
  },
  /* la caja del personaje EN PIXELES de pantalla, y los libros tambien: es la medida del encuadre */
  caja:()=>{
    const R=baldiGLB? baldi : profe;
    const W=lienzo.clientWidth, H=lienzo.clientHeight;
    const v=new THREE.Vector3();
    const aPx=(x,y,z)=>{ v.set(x,y,z).project(camara);
      return [+((v.x*0.5+0.5)*W).toFixed(0), +((-v.y*0.5+0.5)*H).toFixed(0)]; };
    const enCaja=(obj)=>{
      const c=new THREE.Box3().setFromObject(obj);
      let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
      for(let i=0;i<8;i++){
        const q=aPx(i&1?c.max.x:c.min.x, i&2?c.max.y:c.min.y, i&4?c.max.z:c.min.z);
        if(q[0]<x0)x0=q[0]; if(q[0]>x1)x1=q[0]; if(q[1]<y0)y0=q[1]; if(q[1]>y1)y1=q[1];
      }
      return [x0,y0,x1,y1];
    };
    const r={ marco:[W,H], profe:enCaja(R.raiz) };
    r.altoPct=+((r.profe[3]-r.profe[1])/H*100).toFixed(1);
    const pts={};
    for(const k of ['cabeza','manoD','manoI','rodillaD']){ if(!R[k]) continue;
      R.raiz.updateMatrixWorld(true); R[k].getWorldPosition(v);
      pts[k]=aPx(v.x,v.y,v.z); }
    r.puntos=pts;
    const l=LIBROS.find(q=>q.g && q.g.visible);
    if(l) r.libro=enCaja(l.g);
    return r;
  },
  /* pone una pose cruda y devuelve donde cayeron las manos: para medir UN eje a la vez */
  poseCruda:(o)=>{
    _poseFija = o || null;
    const R=baldiGLB? baldi : profe;
    animarBaldi(PROFE.anim, null, 0, PROFE.at);
    R.raiz.updateMatrixWorld(true);
    const v=new THREE.Vector3(), r={};
    for(const k of ['manoD','manoI','hombroD','hombroI']){ if(!R[k]) continue;
      R[k].getWorldPosition(v);
      r[k]=[+v.x.toFixed(3), +v.y.toFixed(3), +v.z.toFixed(3)]; }
    if(R.hombroD && R.manoD){ r.abdBindD=+(R.hombroD.userData.abdBind||0).toFixed(3); }
    return r;
  },
  /* ---- LOS BICHOS ---- */
  /* el estado de la actividad de pasillo, sea cual sea */
  actVer:()=>({ vivos:bichosVivos, bichos:BICHOS.filter(b=>b.viva).length,
                tizas:TIZAS.filter(z=>z.viva).length,
                casilleros:CASILL.filter(c=>!c.abierto).length,
                rompe:ROMPE.filter(p=>!p.puesta).length, rompeSel,
                globos:GLOBOS.filter(b=>b.viva && b.verde).length,
                globosRojos:GLOBOS.filter(b=>b.viva && !b.verde).length,
                tableta:TABLETA.on? { forma:TABLETA.formas[TABLETA.k]||null, k:TABLETA.k,
                                      total:TABLETA.formas.length, ok:TABLETA.ok,
                                      trazo:TABLETA.trazo.length, dibujando:TABLETA.dibujando } : null,
                casillBueno, esquirlas:ESQ.length }),
  /* =========================================================================================
     EL PUNTUADOR DE LA TABLETA, PROBADO CON TRAZOS SINTETICOS

     Es la unica forma de probar esto a fondo: un puntuador que solo se prueba jugando bien demuestra
     que acepta lo correcto, y lo que hay que demostrar ademas es que RECHAZA lo incorrecto. Se le
     pasan trazos armados a mano —el circulo perfecto, el circulo a medias, la raya cuando pide
     circulo, el garabato— y se mira el veredicto.
     ========================================================================================= */
  /* mover el dedo como lo mueve una persona sin camara: es el camino por el que se dibuja */
  dedo:(x,y,apoya)=>{ DEDO.activo=apoya!==false; DEDO.x=x; DEDO.y=y; return {x:DEDO.x,y:DEDO.y,apoya:DEDO.activo}; },
  tabPuntuar:(tipo, pts)=>tabPuntuar(tipo, pts),
  tabMedir:(tipo, pts)=>tabMedir(tipo, pts),
  tabTrazo:(clase, ruido, sem)=>{
    /* trazos de mentira en fracciones del marco, con el mismo ruido pseudoaleatorio repetible que
       usan las otras pruebas */
    let S=sem||12345;
    const az=()=>{ S=(S*1103515245+12345)&0x7fffffff; return (S/0x7fffffff*2-1)*(ruido||0); };
    const cx=0.5, cy=0.44, rx=0.095, ry=0.056;
    const P=[];
    if(clase==='circulo')       for(let k=0;k<=26;k++){ const a=k/24*6.2832;
                                  P.push([cx+Math.cos(a)*rx+az(), cy+Math.sin(a)*ry+az()]); }
    else if(clase==='medioCirculo') for(let k=0;k<=13;k++){ const a=k/24*6.2832;
                                  P.push([cx+Math.cos(a)*rx+az(), cy+Math.sin(a)*ry+az()]); }
    else if(clase==='circuloChico') for(let k=0;k<=26;k++){ const a=k/24*6.2832;
                                  P.push([cx+Math.cos(a)*0.02+az(), cy+Math.sin(a)*0.014+az()]); }
    else if(clase==='raya')     for(let k=0;k<=18;k++) P.push([0.26+k/18*0.48+az(), cy+az()]);
    else if(clase==='rayaCorta') for(let k=0;k<=18;k++) P.push([0.48+k/18*0.10+az(), cy+az()]);
    else if(clase==='rayaTorcida') for(let k=0;k<=18;k++){ const t=k/18;
                                  P.push([0.26+t*0.48+az(), cy+Math.sin(t*3.14)*0.075+az()]); }
    else if(clase==='zigzag')   for(let k=0;k<=26;k++){ const t=k/26;
                                  P.push([0.26+t*0.48+az(), cy+Math.sin(t*9.42)*0.050+az()]); }
    else if(clase==='garabato') for(let k=0;k<=26;k++){ const t=k/26;
                                  P.push([cx+Math.sin(t*31)*0.03+az(), cy+Math.cos(t*27)*0.02+az()]); }
    return P;
  },
  /* el rompecabezas en fracciones del marco: pieza, hueco y si esta puesta */
  rompeVer:()=>ROMPE.map(p=>({ pieza:[+p.cx.toFixed(3), +p.cy.toFixed(3)],
                               hueco:[+p.sx.toFixed(3), +p.sy.toFixed(3)],
                               dist:+Math.hypot(p.cx-p.sx, p.cy-p.sy).toFixed(3),
                               puesta:p.puesta, tomada:p.tomada })),
  /* UNA PINZA SOSTENIDA DE MENTIRA: es la unica forma de probar el ARRASTRE sin camara ni mano. Se
     inyecta una mano de verdad por las ranuras y despues se le pisa el punto de la pinza, asi el
     agarre entra por el mismo camino que usa la camara. */
  manoArrastrar:(x,y,pinza,k)=>{
    MANO.pausa=true; MANO.on=true; MANO.estado='lista';
    MANO.pinzas=[{ x, y, px:x, py:y, k:k||0, pinza:!!pinza, nueva:false }];
    MANO.hay=true; MANO.manos=1;
    return { x, y, pinza:!!pinza, k:k||0 };
  },
  /* poner el espejo a mano: sin camara el banco arranca en true (camara frontal), y el caso que
     rompio —y el que corre en un telefono— es el de la camara TRASERA, o sea false */
  /* =========================================================================================
     LA PINZA DE VERDAD: PULGAR E INDICE JUNTOS Y LOS OTROS TRES DONDE QUIERAN

     manoFalsa() no puede armar esta pose, y eso no es un detalle del banco: es LA RAZON de que el
     defecto sobreviviera. Su parametro `pinza` cuenta los dedos estirados desde el indice hacia
     afuera, asi que para juntar el pulgar con el indice tiene que cerrar tambien el indice Y todo lo
     que venga despues — o sea que la unica pinza que el banco sabia dibujar era la de puño cerrado,
     que es justo la que el codigo aceptaba. La prueba y el codigo compartian el mismo error.

     Esta arma el indice DOBLADO hacia el pulgar y deja el medio, el anular y el menique estirados o
     no, a eleccion. `afuera` es cuantos de esos tres quedan estirados: 3 es la pinza que hace
     cualquiera sin pensarlo.
     ========================================================================================= */
  manoFalsaPinza:(cx, cy, afuera)=>{
    const X=cx==null?0.5:cx, Y=cy==null?0.5:cy, S=0.16;
    const n=Math.max(0, Math.min(3, afuera==null? 3 : afuera|0));
    const lm=[]; for(let k=0;k<21;k++) lm.push({x:X,y:Y,z:0});
    lm[0]={x:X, y:Y+S, z:0};
    const nud=[[5,-0.055],[9,0],[13,0.050],[17,0.098]];
    nud.forEach(([nu,off],idx)=>{
      lm[nu]={x:X+off, y:Y+0.02, z:0};
      /* idx 0 es el INDICE y va siempre doblado: es el que se junta con el pulgar */
      const estirado = idx>0 && idx<=n;
      if(estirado){
        const L=0.118;
        lm[nu+1]={x:X+off, y:Y+0.02-L*0.34, z:0};
        lm[nu+2]={x:X+off, y:Y+0.02-L*0.66, z:0};
        lm[nu+3]={x:X+off, y:Y+0.02-L, z:0};
      } else {
        /* doblado: la punta se recoge hacia la palma, sin llegar a meterse adentro */
        lm[nu+1]={x:X+off, y:Y+0.02-0.040, z:0};
        lm[nu+2]={x:X+off*0.75, y:Y+0.02-0.052, z:0};
        lm[nu+3]={x:X+off*0.45, y:Y+0.02-0.040, z:0};
      }
    });
    /* el pulgar sale al costado y su punta va a tocar la del indice */
    lm[1]={x:X-0.058, y:Y+0.120, z:0};
    lm[2]={x:X-0.072, y:Y+0.082, z:0};
    lm[3]={x:X-0.050, y:Y+0.040, z:0};
    lm[4]={x:lm[8].x-0.006, y:lm[8].y+0.006, z:0};
    return lm;
  },
  /* los numeros CRUDOS con los que manoLeer() decide, para poder calibrar en vez de adivinar:
     cuanto miden pulgar-a-indice y pulgar-a-menique en palmas, y que dedos da por estirados */
  manoLeerVer:(lm)=>{
    const d=(a,b)=>Math.hypot(a.x-b.x, a.y-b.y, (a.z||0)-(b.z||0));
    const palma=Math.max(1e-6, d(lm[0], lm[9]));
    const largos=[[8,5],[12,9],[16,13],[20,17]].map(([pt,n])=>
      +(d(lm[pt],lm[0]) / Math.max(1e-6,d(lm[n],lm[0]))).toFixed(3));
    const q=manoLeer(lm);
    return { pulgarIndice:+(d(lm[4],lm[8])/palma).toFixed(3),
             pulgarMenique:+(d(lm[4],lm[17])/palma).toFixed(3),
             razones:largos, estirados:q? q.estirados : null,
             dedos:q? q.dedos : null, pinza:q? q.pinza : null };
  },
  manoEspejoPoner:(v)=>{ MANO.espejo=!!v; return MANO.espejo; },
  manoEspejo:()=>{
    MANO.pausa=true; MANO.on=true; MANO.estado='lista';
    const guard=MANO.espejo;
    const r=[];
    for(const esp of [true,false]){
      MANO.espejo=esp;
      MANO.ranuras[0].hay=false; MANO.ranuras[1].hay=false;
      const lm=window.__recreo.manoFalsa(2,true,0.30,0.50);
      manosInyectar([lm], 1000);
      manosAvanzar(1/60);
      manos3DDibujar();
      const L=MANO.ranuras[0].sal;
      /* donde se DIBUJA la muñeca en el marco, con la misma cuenta que usa manos3DDibujar */
      const dibujo = MANO.espejo? 1-L[0] : L[0];
      const p=(MANO.pinzas||[])[0];
      r.push({ espejo:esp, dibujoX:+dibujo.toFixed(3),
               agarraX:p? +p.x.toFixed(3) : null,
               palmaX:p? +p.px.toFixed(3) : null,
               difDibujoAgarre: p? +Math.abs(dibujo-p.x).toFixed(3) : null });
    }
    MANO.espejo=guard; MANO.pausa=false;
    /* el veredicto en una sola linea: los dos casos tienen que dar la mano y el agarre en el mismo
       lado del marco. Antes, con espejo:false, la diferencia era de 0,4 del ancho. */
    return { casos:r, ok: r.every(c=>c.difDibujoAgarre!=null && c.difDibujoAgarre<0.06) };
  },
  /* el aro de punteria: donde esta, que tamaño tiene y si dice que hay blanco debajo */
  miraVer:()=>{
    dibujar(1);
    const r=[];
    for(let q=0;q<2;q++){
      const el=document.getElementById('manoMira'+q); if(!el) continue;
      r.push({ q, ver:el.classList.contains('ver'), hit:el.classList.contains('hit'),
               cerrada:el.classList.contains('cerrada'),
               izq:el.style.left, arr:el.style.top, ancho:el.style.width });
    }
    return r;
  },
  manoSoltarTodo:()=>{ MANO.pinzas=[]; MANO.on=false; MANO.pausa=false; MANO.hay=false;
                       MANO.manos=0; return true; },
  bichosVer:()=>{
    const W=lienzo.clientWidth||1, H=lienzo.clientHeight||1;
    return { vivos:bichosVivos, esquirlas:ESQ.length, marco:[W,H],
             lista: BICHOS.filter(b=>b.viva).map(b=>{
               const s=aPantalla(b.x,b.y,b.z);
               return { mundo:[+b.x.toFixed(2), +b.y.toFixed(2), +b.z.toFixed(2)],
                        px:[Math.round(s.x*W), Math.round(s.y*H)], delante:s.delante,
                        dist:+Math.hypot(cam.x-b.x, cam.z-b.z).toFixed(2) }; }) };
  },
  /* una pinza de mentira en coordenadas del marco (0..1): es la unica forma de probar el apuntado
     sin camara ni mano */
  pinzaFalsa:(x,y)=>{ TOQUES.push({x,y}); return TOQUES.length; },
  bichosSoltar:(n,tipo)=>{ actSoltar(tipo||'bichos', n||3); return bichosVivos; },
  /* ---- LA MUERTE ---- */
  matar:()=>{ morir(); return { grito:gritoT, muertes }; },
  reintentar:()=>{ reintentar(); return window.__recreo.estado(); },
  /* ---- EL MAPA Y LAS RUTAS ---- */
  aulas:()=>Object.keys(AULA_SITIO).map(k=>{ const S=AULA_SITIO[k];
    return { n:S.n, dir:S.dir, x:+S.x.toFixed(2), zPiza:+S.zPiza.toFixed(2),
             zProfe:+S.zProfe.toFixed(2), zCam:+S.zCam.toFixed(2), boca:S.boca,
             frente:frenteDe(S.n) }; }),
  /* el mapa entero en una cadena, para poder MIRARLO en vez de deducirlo de ocho rectangulos */
  mapa:()=>({ GW, GH, filas:MAPA.map(f=>f.map(c=>'.#'[0]===0?'':'').join('')||f.join('')),
              dibujo:MAPA.map(f=>f.map(c=>c===0?'#':(c===1?'.':'A')).join('')),
              salidas:SALIDAS.map(s=>[s.i,s.j]),
              tramoMax:(()=>{ let m=0; for(let k=0;k<TOUR.length-1;k++){
                  const r=rutaCeldas(frenteDe(TOUR[k]), frenteDe(TOUR[k+1]));
                  m=Math.max(m, r? r.length-1 : -1); } return m; })() }),
  ruta:(a,b)=>{ const r=rutaCeldas(a,b); return { largo:r?r.length:0, esquinas:esquinas(r) }; },
  /* ---- LOS DEDOS ---- */
  leer:(lm)=>manoLeer(lm),
  contar:(lms)=>manoTotal(lms),
  manoFalsa:(dedos, pinza, cx, cy, esc)=>{
    /* arma una mano de 21 puntos con N dedos estirados. Los indices son los de MediaPipe:
       0 muneca, 1-4 pulgar, 5-8 indice, 9-12 medio, 13-16 anular, 17-20 menique.
       `esc` es LO LEJOS QUE ESTA: 1 es la distancia comoda y 0,4 es una mano chica en el marco, o sea
       lejos. Sin este parametro no habia forma de probar el caso que reporto el jugador —"que no se
       buguee ni desaparezca a lo lejos"— porque todas las manos falsas median exactamente lo mismo. */
    const E=(esc==null?1:esc);
    const X=cx==null?0.5:cx, Y=cy==null?0.5:cy, S=0.16*E;
    const lm=[]; for(let k=0;k<21;k++) lm.push({x:X,y:Y,z:0});
    lm[0]={x:X, y:Y+S, z:0};
    const nud=[[5,-0.055],[9,0],[13,0.050],[17,0.098]];
    const cuantos=Math.max(0,Math.min(5,dedos|0));
    const largos = Math.min(4, pinza? Math.max(0,cuantos-1) : cuantos);
    nud.forEach(([n,off],idx)=>{
      const O=off*E;
      lm[n]={x:X+O, y:Y+0.02*E, z:0};
      const estirado = idx<largos;
      const L = (estirado? 0.118 : -0.02)*E;
      lm[n+1]={x:X+O, y:Y+0.02*E-(estirado?L*0.34:-0.04*E), z:0};
      lm[n+2]={x:X+O, y:Y+0.02*E-(estirado?L*0.66:-0.08*E), z:0};
      lm[n+3]={x:X+O, y:Y+0.02*E-(estirado?L:-0.10*E), z:0};
    });
    /* el pulgar: abierto se va lejos del nudillo del menique; cerrado se le cruza por delante */
    const pulgarAbierto = pinza? false : (cuantos>=5 || (cuantos>0 && largos<cuantos));
    if(pinza){ lm[1]={x:X-0.05*E,y:Y+0.11*E,z:0}; lm[2]={x:X-0.06*E,y:Y+0.07*E,z:0};
               lm[3]={x:X-0.055*E,y:Y+0.03*E,z:0};
               lm[4]={x:lm[8].x+0.005*E, y:lm[8].y+0.005*E, z:0}; }
    else if(pulgarAbierto){ lm[1]={x:X-0.06*E,y:Y+0.12*E,z:0}; lm[2]={x:X-0.11*E,y:Y+0.09*E,z:0};
               lm[3]={x:X-0.155*E,y:Y+0.06*E,z:0}; lm[4]={x:X-0.195*E,y:Y+0.035*E,z:0}; }
    else { lm[1]={x:X-0.05*E,y:Y+0.12*E,z:0}; lm[2]={x:X-0.02*E,y:Y+0.09*E,z:0};
           lm[3]={x:X+0.02*E,y:Y+0.075*E,z:0}; lm[4]={x:X+0.055*E,y:Y+0.065*E,z:0}; }
    return lm;
  },
  /* inyecta manos y corre el conteo entero, voto incluido */
  mano:(lms)=>{ const t=manoTotal(lms);
    MANO.hay=t.hay; MANO.manos=t.manos; MANO.gesto=t.pinza?'pinza':'';
    MANO.crudo=t.hay? t.dedos : 0;
    /* TAMBIEN LAS PINZAS. Sin esta linea el gancho probaba contar dedos pero no apuntar, que es
       justo la mitad nueva del juego. */
    MANO.pinzas=manoPinzas(lms);
    manoVoto(t.hay? t.dedos : -1); MANO.on=true; MANO.estado='lista';
    /* se empujan a las ranuras para que la interpolacion y las manos 3D las vean como una medicion
       de verdad: probar el dibujo por un camino distinto al del juego no probaria el dibujo */
    manosInyectar(lms);
    pintarCam();
    return { crudo:t, firme:MANO.dedos, votos:MANO.votos,
             pinzas:MANO.pinzas.map(p=>({x:+p.x.toFixed(3), y:+p.y.toFixed(3),
                                         pinza:p.pinza, nueva:p.nueva})) }; },
  manos:()=>({ estado:MANO.estado, on:MANO.on, hay:MANO.hay, dedos:MANO.dedos,
               gesto:MANO.gesto, manos:MANO.manos, votos:MANO.votos }),
  manosIniciar:()=>manosIniciar(),
  manoPausa:(v)=>{ MANO.pausa=!!v; return !!MANO.pausa; },
  /* =========================================================================================
     COMO SE MIDE EL TEMBLOR, que es lo unico que permite ajustar un filtro sin adivinar.
     Se inyecta una mano QUIETA con ruido conocido y se mira cuanto se mueve la salida. Si el filtro
     sirve, la salida se mueve mucho menos que la entrada; el numero que importa es el cociente.
     Y como un filtro puede matar todo el temblor a cambio de llegar tarde, va junto con la medida de
     RETARDO: se inyecta un salto y se cuenta cuantos milisegundos tarda la salida en cubrir el 90%.
     Los dos numeros juntos son la unica forma de saber si un cambio mejoro o solo movio el problema.
     ========================================================================================= */
  manoTemblor:(opts)=>{
    const o=opts||{};
    const ruido=o.ruido==null? 0.004 : o.ruido;
    const hz=o.hz||24, cuadros=o.cuadros||90, render=o.render||60;
    MANO.pausa=true; MANO.on=true; MANO.estado='lista';
    MANO.ranuras[0].hay=false; MANO.ranuras[1].hay=false;
    const base=window.__recreo.manoFalsa(5,false,0.5,0.5,(o.esc==null?1:o.esc));
    /* ruido pseudoaleatorio REPETIBLE: con Math.random cada corrida da otro numero y no se pueden
       comparar dos ajustes del filtro */
    let sem=12345;
    const az=()=>{ sem=(sem*1103515245+12345)&0x7fffffff; return sem/0x7fffffff*2-1; };
    let t=1000;
    const entradas=[], salidas=[], escalas=[];
    const dtR=1000/render, dtM=1000/hz;
    let proxMed=t;
    for(let c=0;c<cuadros*render/hz;c++){
      if(t>=proxMed){
        const lm=base.map(p=>({ x:p.x+az()*ruido, y:p.y+az()*ruido, z:p.z }));
        manosInyectar([lm], t);
        entradas.push([lm[0].x, lm[0].y]);
        proxMed+=dtM;
      }
      /* se avanza el reloj a mano: performance.now() no se puede mover, asi que la caducidad se
         desactiva con la pausa y la interpolacion recibe su dt directo */
      manosAvanzar(dtR/1000);
      manos3DDibujar();                    // para que la escala suavizada se actualice de verdad
      const R=MANO.ranuras[0];
      if(R.hay){ salidas.push([R.sal[0], R.sal[1]]); if(R.escSal>0) escalas.push(R.escSal); }
      t+=dtR;
    }
    const des=(A)=>{
      if(A.length<4) return 0;
      const mx=A.reduce((s,p)=>s+p[0],0)/A.length, my=A.reduce((s,p)=>s+p[1],0)/A.length;
      return Math.sqrt(A.reduce((s,p)=>s+(p[0]-mx)**2+(p[1]-my)**2,0)/A.length);
    };
    const de=des(entradas), ds=des(salidas);
    /* EL LATIDO DE GROSOR, que es la otra mitad del temblor y no se ve en la posicion: se mide la
       desviacion de la escala reconstruida contra su promedio, en porcentaje. */
    const ze=escalas.length>3? (()=>{ const m=escalas.reduce((s,v)=>s+v,0)/escalas.length;
        return Math.sqrt(escalas.reduce((s,v)=>s+(v-m)**2,0)/escalas.length)/Math.max(1e-9,m)*100; })() : 0;
    MANO.pausa=false;
    return { ruido, hz, esc:(o.esc==null?1:o.esc), entrada:+de.toFixed(5), salida:+ds.toFixed(5),
             atenuacion:+(de>0? de/Math.max(1e-9,ds) : 0).toFixed(2),
             latidoPct:+ze.toFixed(2),
             muestras:{entrada:entradas.length, salida:salidas.length} };
  },
  manoRetardo:(opts)=>{
    const o=opts||{};
    const hz=o.hz||24, render=o.render||60, salto=o.salto==null? 0.20 : o.salto;
    MANO.pausa=true; MANO.on=true; MANO.estado='lista';
    MANO.ranuras[0].hay=false; MANO.ranuras[1].hay=false;
    const A=window.__recreo.manoFalsa(5,false,0.40,0.50);
    const B=window.__recreo.manoFalsa(5,false,0.40+salto,0.50);
    const dtR=1000/render, dtM=1000/hz;
    let t=1000, proxMed=t;
    for(let c=0;c<20;c++){                       // se asienta en A
      if(t>=proxMed){ manosInyectar([A], t); proxMed+=dtM; }
      manosAvanzar(dtR/1000); t+=dtR;
    }
    const x0=MANO.ranuras[0].sal[0];
    const t0=t; let ms90=-1, pico=0;
    /* NO SE CORTA AL LLEGAR AL 90%, y eso importa: la prediccion adelanta la salida, asi que un
       ajuste puede cruzar el 90% antes Y PASARSE DE LARGO. Cortando ahi el sobrepico no se ve, y un
       sobrepico es exactamente lo que se siente como "la mano rebota". Se corre la ventana entera. */
    for(let c=0;c<200;c++){
      if(t>=proxMed){ manosInyectar([B], t); proxMed+=dtM; }
      manosAvanzar(dtR/1000);
      const x=MANO.ranuras[0].sal[0];
      const av=(x-x0)/salto;
      if(av>pico) pico=av;
      if(ms90<0 && Math.abs(x-x0)>=Math.abs(salto)*0.90) ms90=t-t0;
      t+=dtR;
    }
    MANO.pausa=false;
    return { salto, hz, ms90: ms90<0? null : +ms90.toFixed(0),
             sobrepicoPct:+((pico-1)*100).toFixed(1),
             desde:+x0.toFixed(4), hasta:+MANO.ranuras[0].sal[0].toFixed(4) };
  },
  /* =========================================================================================
     LA MEDIDA QUE DE VERDAD CORRESPONDE A "LAS MANOS VAN LENTAS"

     El salto mide un escalon, y una mano no da escalones: se mueve. Lo que el jugador siente es que
     la mano dibujada va ATRAS de la suya mientras la mueve, y eso es el error de seguimiento en un
     movimiento sostenido. Se arrastra una mano a velocidad constante por el marco, se mide cuanto
     queda atras la salida y se divide por la velocidad: el resultado esta EN MILISEGUNDOS, que es
     lo unico comparable entre ajustes y lo que hay que dividir por tres.
     ========================================================================================= */
  manoRampa:(opts)=>{
    const o=opts||{};
    const hz=o.hz||24, render=o.render||60;
    const vel=o.vel==null? 0.55 : o.vel;          // fraccion de marco por segundo
    MANO.pausa=true; MANO.on=true; MANO.estado='lista';
    MANO.ranuras[0].hay=false; MANO.ranuras[1].hay=false;
    const F=window.__recreo.manoFalsa;
    const E=o.esc==null? 1 : o.esc;
    const dtR=1000/render, dtM=1000/hz;
    let t=1000, proxMed=t, x=0.18;
    for(let c=0;c<20;c++){                        // asentar quieta
      if(t>=proxMed){ manosInyectar([F(5,false,x,0.5,E)], t); proxMed+=dtM; }
      manosAvanzar(dtR/1000); t+=dtR;
    }
    const errs=[];
    for(let c=0;c<90;c++){
      x += vel*dtR/1000;
      if(t>=proxMed){ manosInyectar([F(5,false,x,0.5,E)], t); proxMed+=dtM; }
      manosAvanzar(dtR/1000);
      if(c>25) errs.push(x-MANO.ranuras[0].sal[0]);   // los primeros son el arranque, no el regimen
      t+=dtR;
    }
    MANO.pausa=false;
    const m=errs.reduce((s,v)=>s+v,0)/Math.max(1,errs.length);
    return { vel, hz, esc:E, errorMedio:+m.toFixed(5), retardoMs:+(m/vel*1000).toFixed(0),
             muestras:errs.length };
  },
  /* cuantas detecciones duplicadas se descartaron: si esto sube, MediaPipe esta viendo dos veces la
     misma mano y sin el descarte el conteo de dedos saldria al doble */
  /* =========================================================================================
     LA PRUEBA DEL DEFECTO QUE REPORTO EL USUARIO: "se crean dos manos y el conteo esta mal".
     Se inyectan detecciones por el MISMO reparto que usa la camara y se mira cuantas ranuras quedan
     vivas y cuantos dedos suma el juego. Dos detecciones encimadas tienen que contar UNA mano.
     ========================================================================================= */
  manoReparto:(caso)=>{
    MANO.pausa=true; MANO.on=true; MANO.estado='lista';
    MANO.ranuras[0].hay=false; MANO.ranuras[1].hay=false;
    MANO.dupes=0;
    const F=window.__recreo.manoFalsa;
    let crudas=[], lados=[];
    if(caso==='encimadas'){
      /* la misma mano vista dos veces: las munecas a 0,04 una de la otra */
      crudas=[F(5,false,0.50,0.50), F(5,false,0.54,0.51)];
      lados=[[{categoryName:'Left'}],[{categoryName:'Right'}]];
    } else if(caso==='separadas'){
      crudas=[F(5,false,0.28,0.50), F(5,false,0.72,0.50)];
      lados=[[{categoryName:'Left'}],[{categoryName:'Right'}]];
    } else if(caso==='ladoParpadea'){
      /* UNA sola mano cuya etiqueta Left/Right se da vuelta cuadro a cuadro, que es lo que hace la
         camara trasera. Con reparto por handedness caia alternadamente en las dos ranuras y las dos
         quedaban vivas: el juego veia dos manos. */
      let t=1000;
      for(let k=0;k<8;k++){
        manosRepartir([F(4,false,0.50+k*0.002,0.50)],
                      [[{categoryName:(k%2? 'Left':'Right')}]], t);
        t+=42;
      }
      manosAvanzar(1/60);
      const r={ caso, ranuras:MANO.ranuras.map(R=>R.hay), manos:MANO.manos, dedos:MANO.crudo,
                dupes:MANO.dupes };
      MANO.pausa=false; return r;
    }
    manosRepartir(crudas, lados, 1000);
    manosAvanzar(1/60);
    const r={ caso, ranuras:MANO.ranuras.map(R=>R.hay), manos:MANO.manos, dedos:MANO.crudo,
              dupes:MANO.dupes };
    MANO.pausa=false; return r;
  },
  manoDupes:()=>({ dupes:MANO.dupes, medidas:MANO.medidas,
                   filtro:{ fcMin:OE.fcMin, beta:OE.beta, fcD:OE.fcD, tau:MANO_TAU },
                   sep:MANO_SEP, empareja:MANO_EMPAREJA }),
  manoFiltro:(o)=>{ if(o){ if(o.fcMin!=null) OE.fcMin=o.fcMin;
                           if(o.beta!=null) OE.beta=o.beta;
                           if(o.fcD!=null) OE.fcD=o.fcD;
                           if(o.dz!=null) OE.dz=o.dz;
                           if(o.dzZ!=null) OE.dzZ=o.dzZ;
                           if(o.fcMinZ!=null) OE.fcMinZ=o.fcMinZ;
                           if(o.betaZ!=null) OE.betaZ=o.betaZ;
                           if(o.pred!=null) MANO_PRED=o.pred;
                           if(o.vQ!=null) V_QUIETA=o.vQ;
                           if(o.vR!=null) V_RAPIDA=o.vR;
                           if(o.tau!=null) MANO_TAU=o.tau; }
                    return { fcMin:OE.fcMin, beta:OE.beta, fcD:OE.fcD, dz:OE.dz, fcMinZ:OE.fcMinZ,
                             betaZ:OE.betaZ, pred:MANO_PRED, vQ:V_QUIETA, vR:V_RAPIDA,
                             tau:MANO_TAU }; },
  /* cuanto cuesta dibujar las dos manos encima del juego, en milisegundos por cuadro */
  /* =========================================================================================
     DONDE SE VA EL TIEMPO CUANDO APARECE LA MANO

     El jugador lo reporto en un aparato de verdad: "en mi Poco X8 Pro me va a 30-25 cuando aparece la
     mano". Antes de tocar nada hay que saber QUE parte cuesta, porque hay cuatro sospechosos y solo
     uno se puede medir a ojo. Se corre cada etapa sola, muchas veces, con y sin manos.
     ========================================================================================= */
  costoPartes:(n)=>{
    const v=n||300;
    const medir=(f)=>{ f(); const t0=performance.now(); for(let k=0;k<v;k++) f();
                       return +((performance.now()-t0)/v).toFixed(4); };
    const sinManos={ avanzar:medir(()=>avanzar(1/60)), dibujar:medir(()=>dibujar(1)),
                     manos3D:medir(()=>manos3DDibujar()), miras:medir(()=>pintarMiras()) };
    manosInyectar([window.__recreo.manoFalsa(4,false,0.3,0.5),
                   window.__recreo.manoFalsa(3,true,0.7,0.6)]);
    MANO.pausa=true; MANO.on=true; MANO.estado='lista';
    manosAvanzar(1/60);
    const conManos={ avanzar:medir(()=>manosAvanzar(1/60)), dibujar:medir(()=>dibujar(1)),
                     manos3D:medir(()=>manos3DDibujar()), miras:medir(()=>pintarMiras()) };
    MANO.pausa=false;
    return { sinManos, conManos, veces:v };
  },
  /* cuanto cuesta armar las dos manos 3D, en milisegundos por cuadro */
  manoCosto:(n)=>{
    manosInyectar([window.__recreo.manoFalsa(4,false,0.3,0.5), window.__recreo.manoFalsa(3,true,0.7,0.6)]);
    const v=n||200, t0=performance.now();
    for(let k=0;k<v;k++){ manosAvanzar(1/60); manos3DDibujar(); }
    return { ms:+((performance.now()-t0)/v).toFixed(3), veces:v };
  },
  /* el ritmo real: cuantas mediciones por segundo y cuanto tarda cada una */
  manos3D:()=>manos3DVer(),
  /* =========================================================================================
     EL RITMO ADAPTATIVO, PROBADO SIN TELEFONO

     No hay forma de correr MediaPipe de verdad en el banco, pero la decision que hay que probar no es
     "cuanto tarda el detector" sino "dado lo que tarda, que ritmo elige". Se le inyecta un tiempo de
     deteccion y se mira el ritmo al que converge: un aparato rapido tiene que quedarse en el tope y
     uno lento tiene que bajar hasta que la carga del hilo vuelva a estar acotada.
     ========================================================================================= */
  /* =========================================================================================
     EL MANOTAZO Y LA VUELTA: las dos cosas que se pelean cuando se sube la prediccion

     `manoRampa` mide una mano que va derecho a velocidad constante, y ahi predecir siempre acierta.
     Lo que hay que medir para poder subir la prediccion es el caso contrario: la mano que VA Y VUELVE.
     Ahi la velocidad de hace un instante apunta al reves de donde la mano va a estar, y una prediccion
     sin freno se pasa de largo — que es lo que se siente como rebote.
     Devuelve cuanto se paso del punto de giro, en fraccion del marco Y en porcentaje del recorrido.
     ========================================================================================= */
  manoVuelta:(opts)=>{
    const o=opts||{};
    const hz=o.hz||24, render=o.render||60;
    const largo=o.largo==null? 0.30 : o.largo;      // cuanto se mueve la mano antes de volver
    const vel=o.vel==null? 1.60 : o.vel;            // fraccion de marco por segundo: un manotazo
    MANO.pausa=true; MANO.on=true; MANO.estado='lista';
    MANO.ranuras[0].hay=false; MANO.ranuras[1].hay=false;
    const F=window.__recreo.manoFalsa;
    const dtR=1000/render, dtM=1000/hz;
    let t=1000, proxMed=t, x=0.35;
    for(let c=0;c<20;c++){                          // asentar quieta
      if(t>=proxMed){ manosInyectar([F(5,false,x,0.5,E)], t); proxMed+=dtM; }
      manosAvanzar(dtR/1000); t+=dtR;
    }
    const x0=x, xTope=x+largo;
    let subiendo=true, maxSal=-1e9, pasos=0;
    while(pasos++<600){
      if(subiendo){ x += vel*dtR/1000; if(x>=xTope){ x=xTope; subiendo=false; } }
      else x -= vel*dtR/1000;
      if(t>=proxMed){ manosInyectar([F(5,false,x,0.5,E)], t); proxMed+=dtM; }
      manosAvanzar(dtR/1000);
      if(MANO.ranuras[0].hay) maxSal=Math.max(maxSal, MANO.ranuras[0].sal[0]);
      t+=dtR;
      if(!subiendo && x<=x0) break;
    }
    MANO.pausa=false;
    const paso=Math.max(0, maxSal-xTope);
    return { hz, largo, vel, tope:+xTope.toFixed(4), pico:+maxSal.toFixed(4),
             sePasa:+paso.toFixed(4), sePasaPct:+(paso/largo*100).toFixed(1) };
  },
  manoRitmoProbar:(msDet, tope)=>{
    const gMs=MANO.msDet, gHz=MANO.hz, gTope=MANO.hzTope;
    MANO.hzTope=tope||24; MANO.hz=MANO.hzTope; MANO.msDet=msDet;
    for(let k=0;k<60;k++) manoRitmoAjustar();
    const r={ msDet, tope:MANO.hzTope, hz:+MANO.hz.toFixed(1),
              cargaPct:+(MANO.hz*msDet/10).toFixed(1) };
    MANO.msDet=gMs; MANO.hz=gHz; MANO.hzTope=gTope;
    return r;
  },
  /* =========================================================================================
     LOS TIRONES: NO ALCANZA CON EL PROMEDIO

     "el juego a veces se puede poner lag de la nada" no es un problema de cuadros por segundo medios
     —esos pueden estar perfectos— sino de UNOS POCOS CUADROS MUY LARGOS: el recolector de basura
     entrando, un shader que se compila la primera vez que se usa, un audio que se decodifica. Un
     promedio los esconde por definicion. Lo que hay que mirar es la COLA: el peor 1% y el maximo.
     ========================================================================================= */
  calentar:()=>calentarShaders(),
  /* el final: en que tramo va, cuanto deslumbra y donde esta la camara */
  finVer:()=>({ on:FIN.on, fase:FIN.fase, t:+FIN.t.toFixed(2), brillo:+FIN.brillo.toFixed(3),
                giro:+cam.giro.toFixed(3),
                rumboBus:+Math.atan2(BUS_X-cam.x, BUS_Z-cam.z).toFixed(3),
                errorGrados:+((()=>{ let g=Math.atan2(BUS_X-cam.x,BUS_Z-cam.z)-cam.giro;
                   while(g>Math.PI)g-=2*Math.PI; while(g<-Math.PI)g+=2*Math.PI;
                   return g*180/Math.PI; })()).toFixed(1),
                saludado:FIN.saludado, cam:[+cam.x.toFixed(1), +cam.z.toFixed(1)],
                afuera:afueraGrupo.visible, tapa:_tapaOeste? _tapaOeste.visible : null }),
  finEmpezar:()=>{ finEmpezar(); return window.__recreo.finVer(); },
  /* EL ENCUADRE DEL AUTOBUS SE MIDE, NO SE ESTIMA. Proyecta las ocho esquinas de su caja a pixeles y
     dice cuanto del ancho ocupa y cuanto se sale por cada borde. Un autobus cortado por la izquierda
     no se distingue de uno bien encuadrado en una captura chica. */
  busVer:()=>({ hay:!!busMalla, vis:busMalla&&busMalla.visible, grupo:afueraGrupo.visible,
                tri:busMalla&&busMalla.geometry? busMalla.geometry.attributes.position.count/3 : 0,
                pos:busMalla? [+busMalla.position.x.toFixed(1),+busMalla.position.z.toFixed(1)]:null,
                mat:busMalla? busMalla.material.type : null }),
  busProbar:(o)=>{ if(!busMalla) return null;
    if(o&&o.basico){ busMalla.material=new THREE.MeshBasicMaterial({color:0xff00ff}); }
    if(o&&o.x!=null) busMalla.position.x=o.x;
    if(o&&o.niebla!=null) escena.fog.far=o.niebla;
    return { pos:[busMalla.position.x, busMalla.position.z], mat:busMalla.material.type,
             far:escena.fog.far, capas:busMalla.layers.mask, camCapas:camara.layers.mask,
             render:busMalla.renderOrder, mv:busMalla.matrixWorldNeedsUpdate }; },
  afueraPiezas:(o)=>{ const r={}; afueraGrupo.children.forEach((c,i)=>{ if(o&&o[i]!=null) c.visible=!!o[i]; r[i]=[c.geometry&&c.geometry.type, c.visible, +c.position.x.toFixed(1), +c.position.y.toFixed(1)]; }); return r; },
  fotos:()=>({ listas:fotosListas, pedidas:fotosPedidas, hay:Object.keys(TEX_FOTO||{}),
               mapas:[['piso',M_PISO],['pared',M_PARED],['techo',M_TECHO],['locker',M_LOCKER],
                      ['piza',M_PIZA],['mad1',M_MAD1],['asfalto',M_ASFALTO],['pasto',M_PASTO],
                      ['fachada',M_FACHADA]]
                 .map(([n,m])=>[n, !!(m&&m.map&&m.map.image&&m.map.image.width),
                                m&&m.map? [m.map.repeat.x, m.map.repeat.y] : null]) }),
  /* =========================================================================================
     EL PROFESOR NO PUEDE RETROCEDER NI ATRAVESARTE, Y ESO SE MIDE

     Se juega la partida entera y en CADA paso se anotan dos cosas: cuanto retrocedio respecto del
     rumbo en el que venia caminando, y a que distancia paso de la camara. Un "se viene devuelta y
     te atraviesa" dura dos segundos y en una captura no se ve; en numeros es un retroceso de varios
     metros y un cruce a menos de medio metro.
     ========================================================================================= */
  auditarProfe:(tope)=>{
    empezar();
    let px=PROFE.x, pz=PROFE.z;
    /* EL METRO QUE IMPORTA ES CUANTO CAMINA EN TOTAL. Contar los pasos en los que se DA VUELTA es
       una medida floja: un ida y vuelta de tres metros son dos pasos de 7 cm en los que el rumbo se
       invierte, o sea 0,14 m en la cuenta, y eso no distingue un rebote de un redondeo. El camino
       total si: caminar de mas se paga metro a metro. */
    let retroMax=0, retroTotal=0, cercaMin=1e9, cruces=0, pasos=0, caminado=0;
    const casos=[], porEscena={};
    let dirX=0, dirZ=0;
    while(!terminado && pasos++<(tope||80000)){
      const E=GUION[escena_i];
      if(E && E.espera){ MANO.on=false; padPedido=(E.espera.tipo==='dedos')? E.espera.n : 1; }
      else if(cuenta && !bloqueo){ MANO.on=false; padPedido=cuenta.res; }
      if(bichosVivos>0){ if(TABLETA.on) tabAuto();
                         else if(!(pasos%8)){ const g=actPuntoAuto(); if(g) TOQUES.push(g); } }
      if(FIN.on && FIN.fase===3 && !FIN.saludado) padPedido=5;
      avanzar(1/60);
      if(FIN.on) continue;
      const dx=PROFE.x-px, dz=PROFE.z-pz, d=Math.hypot(dx,dz);
      /* UN SALTO GRANDE NO ES CAMINAR: es el juego poniendolo en su sitio al empezar una escena.
         A 4,2 m/s y 60 pasos por segundo, caminando avanza 7 cm por paso; medido, el "retroceso"
         mas grande daba 15,5 m EN UN PASO, que es un teleport y no un defecto de ruta. */
      if(d<0.5) caminado+=d;
      if(d>1e-4 && d<0.5){
        if(dirX||dirZ){
          /* producto escalar con el rumbo anterior: negativo = camina para atras */
          const p=(dx*dirX+dz*dirZ)/d;
          if(p<-0.5){ retroTotal+=d; if(d>retroMax) retroMax=d; }
        }
        dirX=dx/d; dirZ=dz/d;
      } else if(d>=0.5){ dirX=0; dirZ=0; }
      px=PROFE.x; pz=PROFE.z;
      const dc=Math.hypot(PROFE.x-cam.x, PROFE.z-cam.z);
      if(dc<cercaMin) cercaMin=dc;
      const id=(GUION[escena_i]||{}).id||'?';
      if(!porEscena[id] || dc<porEscena[id]) porEscena[id]=+dc.toFixed(2);
      if(dc<0.55){ cruces++; if(casos.length<5)
        casos.push({ escena:id, d:+dc.toFixed(2), profe:[+PROFE.x.toFixed(1),+PROFE.z.toFixed(1)],
                     cam:[+cam.x.toFixed(1),+cam.z.toFixed(1)] }); }
    }
    return { pasos, caminado:+caminado.toFixed(1),
             retroMax:+retroMax.toFixed(3), retroTotal:+retroTotal.toFixed(2),
             masCerca:+cercaMin.toFixed(2), crucesEncima:cruces, casos, porEscena };
  },
  /* donde esta el profesor y donde la camara, ahora mismo */
  profeVer:()=>({ profe:[+PROFE.x.toFixed(2), +PROFE.z.toFixed(2)], anim:PROFE.anim,
                  cam:[+cam.x.toFixed(2), +cam.z.toFixed(2)],
                  distancia:+Math.hypot(PROFE.x-cam.x, PROFE.z-cam.z).toFixed(2),
                  riel:profeRiel? profeRiel.pts.length-profeRiel.k : 0,
                  escena:(GUION[escena_i]||{}).id||'?' }),
  /* la voz: cuantas fuentes hay sonando a la vez. Con una sola boca tiene que ser 0 o 1. */
  vozVer:()=>({ sonando:!!vozFuente, clave:vozClave, bipsEncendidos:dBip,
                clips:Object.keys(VOZ||{}).length }),
  sombraVer:()=>{ let proy=0, rec=0, tot=0;
    escena.traverse(o=>{ if(o.isMesh||o.isInstancedMesh){ tot++; if(o.castShadow)proy++; if(o.receiveShadow)rec++; } });
    const c=luzS.shadow.camera;
    return { on:render.shadowMap.enabled, luz:luzS.castShadow, mapa:luzS.shadow.mapSize.width,
             proyectan:proy, reciben:rec, mallas:tot, lado:[c.left,c.right],
             luzPos:[+luzS.position.x.toFixed(1),+luzS.position.y.toFixed(1),+luzS.position.z.toFixed(1)],
             blanco:[+luzS.target.position.x.toFixed(1),+luzS.target.position.z.toFixed(1)],
             texelPorMetro:+(luzS.shadow.mapSize.width/(c.right-c.left)).toFixed(1) }; },
  congelar:(si)=>{ CONGELADO=!!si; return CONGELADO; },
  cajaBus:()=>{
    if(!busMalla) return null;
    /* LA CAMARA SOLO SE ACOMODA AL DIBUJAR, asi que corriendo con avanzar() —que simula sin dibujar
       un solo cuadro— todavia tiene la posicion del menu y la proyeccion da numeros absurdos: medido,
       el autobus salia ocupando el 3.094% del ancho. Se sincroniza antes de proyectar. */
    ponerCamara(1);
    const W=lienzo.clientWidth, H=lienzo.clientHeight;
    const v=new THREE.Vector3();
    const c=new THREE.Box3().setFromObject(busMalla);
    let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9, delante=true;
    /* UN PUNTO DETRAS DE LA CAMARA PROYECTA IGUAL, dado vuelta, y cae adentro del cuadro: sin esta
       comprobacion el autobus daba "entero" con la camara mirando justo para el otro lado. */
    for(let i=0;i<8;i++){
      v.set(i&1?c.max.x:c.min.x, i&2?c.max.y:c.min.y, i&4?c.max.z:c.min.z);
      camara.worldToLocal(v); if(v.z>=0) delante=false;
      v.project? 0 : 0;
      const w=new THREE.Vector3(i&1?c.max.x:c.min.x, i&2?c.max.y:c.min.y, i&4?c.max.z:c.min.z).project(camara);
      const px=(w.x*0.5+0.5)*W, py=(-w.y*0.5+0.5)*H;
      if(px<x0)x0=px; if(px>x1)x1=px; if(py<y0)y0=py; if(py>y1)y1=py;
    }
    return { marco:[W,H], caja:[x0,y0,x1,y1].map(q=>+q.toFixed(0)),
             anchoPct:+((x1-x0)/W*100).toFixed(1), altoPct:+((y1-y0)/H*100).toFixed(1),
             centroPct:[+((x0+x1)/2/W*100).toFixed(1), +((y0+y1)/2/H*100).toFixed(1)],
             delante, entero:(delante && x0>=0 && x1<=W && y0>=0 && y1<=H) };
  },
  /* juega el final entero solo, saludando cuando se lo piden */
  finJugar:(tope)=>{
    finEmpezar();
    const log=[]; let n=0, ult=-1;
    while(FIN.on && n++<(tope||8000)){
      if(FIN.fase!==ult){ ult=FIN.fase;
        log.push('fase'+FIN.fase+' cam['+cam.x.toFixed(1)+','+cam.z.toFixed(1)+'] brillo'+FIN.brillo.toFixed(2)); }
      if(FIN.fase===3 && !FIN.saludado) padPedido=5;
      avanzar(1/60);
    }
    return { pasos:n, termino:!FIN.on, pantalla:pant, log };
  },
  /* para bisecar de donde sale el tiron: se apagan partes del cuadro de a una y se vuelve a medir */
  cuadroPartes:(o)=>{ if(o){ if(o.manos3D!=null) PRUEBA.sinManos3D=!o.manos3D;
                             if(o.miras!=null) PRUEBA.sinMiras=!o.miras;
                             if(o.escena!=null) PRUEBA.sinEscena=!o.escena; }
                      return { manos3D:!PRUEBA.sinManos3D, miras:!PRUEBA.sinMiras,
                               escena:!PRUEBA.sinEscena }; },
  /* =========================================================================================
     LA BASURA POR CUADRO, QUE ES LO QUE SI SE PUEDE MEDIR ACA

     Los tirones no se pueden medir en este banco: el render es por software y el contenedor comparte
     procesador, asi que el maximo de una tanda da 79 ms, 118 o 627 en corridas identicas — es ruido
     de la maquina, no del juego. Lo que SI se mide es cuanta memoria se pide por cuadro, y esa es la
     causa clasica de "se pone lag de la nada": todo lo que se aloja cuadro a cuadro se acumula hasta
     que el recolector entra, y cuando entra se lleva un cuadro entero por delante.
     Un juego que no aloja nada en su bucle no puede tener esa clase de tiron.
     ========================================================================================= */
  perfilBasura:(n)=>{
    if(!performance.memory) return 'sin performance.memory';
    const v=n||600;
    for(let k=0;k<20;k++){ avanzar(1/60); dibujar(1); }      // asentar
    const a=performance.memory.usedJSHeapSize;
    for(let k=0;k<v;k++){ avanzar(1/60); dibujar(1); }
    const b=performance.memory.usedJSHeapSize;
    return { cuadros:v, bytes:b-a, porCuadro:+((b-a)/v).toFixed(1) };
  },
  perfilTirones:(n)=>{
    const v=n||400, t=[];
    for(let k=0;k<v;k++){
      const a=performance.now();
      avanzar(1/60); dibujar(1);
      t.push(performance.now()-a);
    }
    t.sort((x,y)=>x-y);
    const q=(p)=>+t[Math.min(t.length-1, Math.floor(t.length*p))].toFixed(3);
    const media=+(t.reduce((s,x)=>s+x,0)/t.length).toFixed(3);
    return { cuadros:v, media, p50:q(0.50), p90:q(0.90), p99:q(0.99),
             max:+t[t.length-1].toFixed(3), razonMaxMedia:+(t[t.length-1]/media).toFixed(1) };
  },
  /* la resolucion dinamica: donde esta y a cuantos pixeles equivale */
  resVer:()=>({ resDin:+resDin.toFixed(3), escalon:resI, escalera:RES_ESC, cambios:_resCambios,
                min:RES_MIN, max:RES_MAX,
                objetivoMs:+RES_OBJ.toFixed(2), destino:postTam(),
                pixeles:postTam()[0]*postTam()[1], calidad, px:CAL[calidad].px, filtro }),
  /* la POLITICA de la resolucion, probada sin un telefono lento: se le inyectan tiempos de cuadro y
     se mira a donde llega. Es lo unico que se puede probar aca, porque el aparato no se puede fingir */
  resProbar:(msPorCuadro, cuadros)=>{
    const g=resDin;
    const R=[];
    for(const ms of msPorCuadro){
      for(let k=0;k<(cuadros||120);k++) resTick(ms/1000);
      R.push({ ms, resDin:+resDin.toFixed(3) });
    }
    const fin=+resDin.toFixed(3); resDin=g;
    return { pasos:R, fin };
  },
  /* EL LAZO CERRADO, QUE ES LO UNICO QUE PRUEBA SI OSCILA. Alimentarle tiempos fijos no sirve: el
     control oscila justamente porque bajar la resolucion ACELERA el cuadro y eso lo hace subir otra
     vez. Aca el tiempo simulado sale de los pixeles: ms = msPleno * resDin^2, que es como se comporta
     algo limitado por relleno. Lo que se cuenta es cuantas veces cambio de escalon, o sea cuantas
     veces se reasigno el destino de render. */
  resLazo:(msPleno, segundos, ruido)=>{
    const gD=resDin, gI=resI, gN=_resN, gS=_resSuma, gB=_resBuenas, gF=_resFrio, gC=_resCambios, gU=_resSubidas;
    resI=0; resDin=RES_ESC[0]; _resN=0; _resSuma=0; _resBuenas=0; _resFrio=0; _resCambios=0; _resSubidas=0;
    const vistos={};
    let t=0; const tope=(segundos||60);
    while(t<tope){
      /* CON RUIDO, QUE ES EL CASO DE VERDAD. Un telefono no entrega 21,4 ms clavados: entrega 18 y
         despues 25. Sin ruido casi cualquier regla se queda quieta; el ruido es lo que hace que una
         regla sin racha y sin enfriamiento cambie de tamaño en cada ventana. */
      const ms=Math.max(1, msPleno*resDin*resDin + (ruido? (Math.random()*2-1)*ruido : 0));
      resTick(ms/1000); t+=ms/1000;
      vistos[resDin.toFixed(2)]=(vistos[resDin.toFixed(2)]||0)+1;
    }
    const r={ msPleno, segundos:tope, cambios:_resCambios, resFinal:+resDin.toFixed(2),
              msFinal:+(msPleno*resDin*resDin).toFixed(1), escalonesVisitados:Object.keys(vistos).length,
              reparto:vistos };
    resDin=gD; resI=gI; _resN=gN; _resSuma=gS; _resBuenas=gB; _resFrio=gF; _resCambios=gC; _resSubidas=gU;
    return r;
  },
  manoRitmo:()=>({ hz:MANO.hz, medidas:MANO.medidas, msDeteccion:+MANO.msDet.toFixed(2),
                   espejo:MANO.espejo, camara:MANO.camaraUsada,
                   ranuras:MANO.ranuras.map(R=>({ hay:R.hay, dedos:R.dedos, lado:R.lado,
                     muneca:R.hay? [+R.sal[0].toFixed(3), +R.sal[1].toFixed(3)] : null })) }),
  manoEstado:()=>({ estado:MANO.estado, on:MANO.on, error:MANO.error, delegado:MANO.delegado,
                    cdn:MANO.cdn? MANO.cdn.js.slice(0,42) : null,
                    seguro:!!window.isSecureContext,
                    lienzo:(()=>{ const c=document.getElementById('manosCv');
                                  return c? [c.width,c.height] : null; })(),
                    video:(()=>{ const v=document.getElementById('camVid');
                                 return v? [v.videoWidth, v.videoHeight, v.readyState] : null; })(),
                    aviso:(document.getElementById('camAviso')||{}).textContent||'' }),
  /* ---- correr el guion sin cuadros de verdad ---- */
  avanzar:(seg,fps)=>{ const n=Math.round((seg||1)*(fps||60));
    for(let k=0;k<n;k++) avanzar(1/(fps||60));
    return window.__recreo.estado(); },
  /* juega el juego entero contestando siempre bien: es la prueba de que el guion no se traba y de
     que los ocho libros se pueden resolver */
  jugarSolo:(tope, mal, pararEn)=>{
    const log=[]; let vueltas=0, W=lienzo.clientWidth||1, H=lienzo.clientHeight||1;
    while(!terminado && vueltas++<(tope||60000)){
      const E=GUION[escena_i];
      if(E && E.espera){
        if(E.espera.tipo==='dedos'){ MANO.on=false; padPedido=E.espera.n; }
        else { MANO.on=false; padPedido=1; }
      } else if(cuenta && !bloqueo){
        MANO.on=false;
        /* con `mal` contesta cualquier cosa MENOS la buena: es la unica forma de probar el grito
           dentro de una partida de verdad */
        padPedido = mal? (cuenta.res===1? 2 : cuenta.res-1) : cuenta.res;
      }
      /* los bichos se revientan por el MISMO camino que el jugador: se empuja un toque en el pixel
         donde cae el bicho. Probar esto con una llamada directa a bichoReventar() no probaria nada
         de lo que puede estar mal, que es la proyeccion y el radio del blanco. */
      if(pararEn && (GUION[escena_i]||{}).id===pararEn) break;
      /* LAS TRES ACTIVIDADES SE JUEGAN POR EL MISMO CAMINO QUE USA EL JUGADOR: se empuja un toque en
         el pixel donde cae el blanco. Llamar directo a la funcion que lo revienta no probaria nada de
         lo que puede estar mal, que es la proyeccion, el radio del blanco y —en los casilleros— que
         el que tiembla sea el que se abre. */
      /* EL RITMO DEPENDE DE LA ACTIVIDAD. Cada 8 cuadros alcanza para todo lo que espera quieto,
         pero los bloques del mundo neon vienen a dos metros por segundo y con 8 cuadros de espera se
         pasan de largo entre toque y toque: el jugador automatico perdia la tanda una y otra vez y la
         escena no terminaba nunca. Ahi se apunta todos los cuadros. */
      if(bichosVivos>0 && !pararEn){
        /* la tableta se dibuja, no se toca: va por su propio camino y todos los cuadros */
        if(TABLETA.on) tabAuto();
        else if(!(vueltas%8)){ const g=actPuntoAuto(); if(g) TOQUES.push(g); }
      }
      /* EL FINAL TAMBIEN SE JUEGA SOLO: en la vereda hay que saludar con la mano abierta, y sin esto
         la partida automatica se queda parada delante del profesor hasta que se acaba el tope. */
      if(FIN.on && FIN.fase===3 && !FIN.saludado) padPedido=5;
      const antes=escena_i, aL=libros, mu=muertes;
      avanzar(1/60);
      if(escena_i!==antes) log.push('escena:'+((GUION[escena_i]||{}).id||'fin'));
      if(libros!==aL) log.push('cuenta:'+libros);
      if(muertes!==mu) log.push('MUERTE');
      if(terminado===2) break;
      if(pararEn && (GUION[escena_i]||{}).id===pararEn) break;   // para poder mirar una escena
    }
    return { terminado, libros, aciertos, muertes, vueltas, log:log.slice(0,80) };
  },
  /* =========================================================================================
     AUDITORIA DE RUMBO: se juega la partida entera y en CADA paso se pregunta si la celda donde
     esta el profesor es pisable. Es la unica prueba de "no atraviesa paredes" que no depende de
     mirar: una diagonal por dentro de una pared dura dos segundos y en una captura no se ve.
     ========================================================================================= */
  auditarRumbo:(tope)=>{
    empezar();
    const malas=[]; let pasos=0, fuera=0;
    while(!terminado && pasos++<(tope||60000)){
      const E=GUION[escena_i];
      if(E && E.espera){ MANO.on=false; padPedido=(E.espera.tipo==='dedos')? E.espera.n : 1; }
      else if(cuenta && !bloqueo){ MANO.on=false; padPedido=cuenta.res; }
      if(bichosVivos>0){
        if(TABLETA.on) tabAuto();
        else if(!(pasos%8)){ const g=actPuntoAuto(); if(g) TOQUES.push(g); }
      }
      if(FIN.on && FIN.fase===3 && !FIN.saludado) padPedido=5;
      avanzar(1/60);
      /* DURANTE EL FINAL NO SE AUDITA, y no es hacer la vista gorda: el profesor sale a la vereda,
         o sea FUERA de la grilla, donde "celda pisable" no quiere decir nada — toda celda de afuera
         es pared por definicion. La auditoria mide que no atraviese paredes CAMINANDO por el
         colegio, y en el final no camina: se queda parado saludando. */
      if(FIN.on) continue;
      const c=celda(PROFE.x, PROFE.z);
      if(!pisableProf(c[0], c[1])){
        fuera++;
        if(malas.length<6) malas.push({ celda:c, pos:[+PROFE.x.toFixed(1), +PROFE.z.toFixed(1)],
                                        escena:(GUION[escena_i]||{}).id||'?' });
      }
    }
    return { terminado, pasos, fueraDePared:fuera, malas };
  },
  saltarA:(id)=>{ const k=GUION.findIndex(e=>e.id===id); if(k<0) return 'no hay '+id;
                  escena_i=k-1; siguienteEscena(); return window.__recreo.estado(); },
  aulaVieja:()=>({ i:CLASE_I, j:CLASE_J, x:+CLASE_X.toFixed(2), z:+CLASE_Z.toFixed(2),
              puerta: PUERTA_CLASE? [PUERTA_CLASE.i, PUERTA_CLASE.j, PUERTA_CLASE.abierta] : null,
              libros:LIBROS.length }),
  cuentas:()=>CUENTAS.map(c=>({txt:c.txt, res:c.res})),
  /* OJO CON render.info: three.js lo pone a CERO al empezar cada render(), y con el filtro puesto la
     escena se dibuja en dos pasadas —al destino y despues el blit a pantalla—, asi que leerlo despues
     de un cuadro devolvia SOLO el blit: "1 llamada, 2 triangulos". Con autoReset apagado se suman
     las dos y el numero pasa a significar algo. */
  /* EL COSTO DE N CUADROS SEGUIDOS, y no de uno. Con la sombra a 30 Hz un cuadro lleva la pasada de
     sombra y el siguiente no: mirando UN cuadro se ve el doble o la mitad segun cual toque. */
  costoCuadros:(n)=>{
    render.info.autoReset=false;
    const R=[];
    for(let k=0;k<(n||6);k++){ render.info.reset(); dibujar(1);
      R.push([render.info.render.calls, render.info.render.triangles]); }
    render.info.autoReset=true;
    const c=R.map(r=>r[0]);
    return { cuadros:R, llamadasMedia:+(c.reduce((a,b)=>a+b,0)/c.length).toFixed(1),
             min:Math.min(...c), max:Math.max(...c) };
  },
  perfil:()=>{
    render.info.autoReset=false; render.info.reset();
    dibujar(1);
    const i=render.info;
    const r={ llamadas:i.render.calls, tris:i.render.triangles,
              programas:i.programs?i.programs.length:0,
              geometrias:i.memory.geometries, texturas:i.memory.textures,
              cuadros:cuadrosTotal, pasos:pasosTotal };
    render.info.autoReset=true;
    return r; },
  filtro:(f)=>{ if(f) aplicarFiltro(f);
    const F=FILTROS[filtro];
    return { filtro, escala:F.escala, sat:F.sat, niveles:F.niveles,
             destino: postRT? [postRT.width, postRT.height] : null,
             pantalla: [marco.clientWidth, marco.clientHeight],
             pixeles: postRT? postRT.width*postRT.height : null,
             pixelesPantalla: Math.round(marco.clientWidth*marco.clientHeight*
                                         render.getPixelRatio()*render.getPixelRatio()) }; },
  cal:(c)=>{ if(c) aplicarCal(c);
    return { cal:calidad, px:+render.getPixelRatio().toFixed(2), niebla:escena.fog.far }; },
  medidas:()=>({ marco:[marco.clientWidth, marco.clientHeight],
                 vertical: marco.clientHeight>marco.clientWidth,
                 fov:camara.fov, aspecto:+camara.aspect.toFixed(3),
                 fovHoriz:+(2*Math.atan(Math.tan(camara.fov*Math.PI/360)*camara.aspect)*180/Math.PI).toFixed(1),
                 dpr:+render.getPixelRatio().toFixed(2) }),
  audio:()=>{ let pico=0, rms=0;
    if(AUD.an&&AUD.buf){ AUD.an.getFloatTimeDomainData(AUD.buf);
      for(let i=0;i<AUD.buf.length;i++){ const v=Math.abs(AUD.buf[i]); if(v>pico)pico=v; rms+=v*v; }
      rms=Math.sqrt(rms/AUD.buf.length); }
    return { hay:!!AUD.ctx, pico:+pico.toFixed(4), rms:+rms.toFixed(4) }; },
  son:(k)=>{ son(k); return true; },
  /* que ladridos quedaron decodificados: un data URI que no decodifica deja al personaje mudo sin
     que nada falle ni aparezca en la consola */
  voces:()=>{ let listos=0, faltan=[], seg=0;
    for(const k in VOZ_DATOS){ const b=VOZ[k];
      if(b){ listos++; seg+=b.duration; } else faltan.push(k); }
    const porIdi={};
    for(const k in VOZ_DATOS){ const i=k.indexOf(':');
      const g=i<0? '--' : k.slice(0,i); porIdi[g]=(porIdi[g]||0)+(VOZ[k]?1:0); }
    return { lista:vozLista, clips:Object.keys(VOZ_DATOS).length, listos,
             faltan:faltan.slice(0,6), segundos:+seg.toFixed(1), porIdioma:porIdi,
             idioma:IDIOMA,
             musica:{ on:MUS.on, nivel:MUS.nivel, paso:MUS.paso,
                      gan:MUS.gan? +MUS.gan.gain.value.toFixed(4) : null,
                      ctx:AUD.ctx? AUD.ctx.state : 'no',
                      reloj:AUD.ctx? +AUD.ctx.currentTime.toFixed(2) : 0,
                      prox:+MUS.prox.toFixed(2),
                      nBajar:MUS.nBajar, nParar:MUS.nParar, nNotas:MUS.nNotas } }; },
  /* cancela la automatizacion y pone el volumen a mano: separa "la musica no suena" de "la rampa
     del volumen no llega" */
  /* EL NIVEL DE UNA MUSICA NO SE MIDE CON UNA MUESTRA. El analizador devuelve una ventana de 2.048
     muestras, o sea 43 ms: cae entre dos notas y da cero, cae encima del bajo y da 0,15. Para saber
     como suena una cama de fondo hay que mirar un rato. Se muestrea en un bucle cerrado —el hilo de
     audio sigue corriendo aunque el principal este ocupado— y se devuelve el maximo, el promedio y
     cuantas muestras salieron en silencio. */
  audioVentana:(ms)=>{
    if(!AUD.an) return 'sin analizador';
    const fin=performance.now()+(ms||500);
    let pico=0, suma=0, n=0, mudas=0;
    while(performance.now()<fin){
      AUD.an.getFloatTimeDomainData(AUD.buf);
      let p=0, s=0;
      for(let i=0;i<AUD.buf.length;i++){ const v=Math.abs(AUD.buf[i]); if(v>p)p=v; s+=v*v; }
      const r=Math.sqrt(s/AUD.buf.length);
      if(p>pico) pico=p;
      if(p<0.002) mudas++;
      suma+=r; n++;
    }
    return { pico:+pico.toFixed(4), rmsMedio:+(suma/Math.max(1,n)).toFixed(4),
             muestras:n, mudasPct:+(mudas/Math.max(1,n)*100).toFixed(0) };
  },
  /* la musica por aula: que progresion y que tempo toca en cada una */
  musAulas:()=>{
    const g={prog:MUS.prog, bpm:MUS.bpm, on:MUS.on};
    const on=MUS.on; MUS.on=false;
    const r=[];
    for(let k=0;k<8;k++){ musicaAula(k); musicaNivel(Math.floor(k/2));
      r.push({ aula:k+1, prog:MUS.prog, bpm:MUS.bpm, nivel:MUS.nivel,
               bajo0:MUS_BAJO[0], bajo1:MUS_BAJO[1] }); }
    MUS.on=on; MUS.prog=g.prog; MUS.bpm=g.bpm;
    MUS_BAJO=MUS_PROGS[MUS.prog].bajo; MUS_ACORDE=MUS_PROGS[MUS.prog].ac;
    return r;
  },
  /* la musica generada: cuantos temas decodificaron y cual esta sonando */
  musGVer:()=>({ decodificados:MUSG.n, temas:Object.keys(MUSG.buf),
                 sonando:MUSG.nombre, deberia:musGDeEscena(),
                 duraciones:Object.keys(MUSG.buf).reduce((o,k)=>(o[k]=+MUSG.buf[k].duration.toFixed(2),o),{}),
                 procedural:MUS.on }),
  musGPoner:(n)=>({ puesto:musGPoner(n), sonando:MUSG.nombre }),
  musProbar:(v)=>{ if(!MUS.gan) return 'no hay';
    const t=AUD.ctx.currentTime;
    MUS.gan.gain.cancelScheduledValues(t);
    MUS.gan.gain.setValueAtTime(v==null?1:v, t);
    return +MUS.gan.gain.value.toFixed(3); },
  hablar:(k)=>{ hablar(k, 1.0); return !!VOZ[k]; },
  /* dice una linea por clave, igual que el juego: comprueba que subtitulo y voz salgan juntos */
  dice:(clave)=>{ dice(clave); return { clave, idioma:IDIOMA,
                   suena:!!VOZ[IDIOMA+':'+clave],
                   subtitulo:(document.getElementById('dTxt')||{}).textContent||'' }; },
  musica:(n)=>{ if(n!=null) musicaNivel(n); return { on:MUS.on, nivel:MUS.nivel }; },
  idioma:(c)=>{ if(c) elegirIdioma(c); return IDIOMA; },
  pantalla:(p)=>{ verPantalla(p); return pant; }
};
</script>
</body>
</html>
