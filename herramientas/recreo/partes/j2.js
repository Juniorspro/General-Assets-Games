
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
                casillBueno, esquirlas:ESQ.length }),
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
  aulas:()=>Object.keys(AULA_SITIO).map(k=>{ const S=AULA_SITIO[k], p=puertaDe(S.n);
    return { n:S.n, x:+S.x.toFixed(2), zPiza:+S.zPiza.toFixed(2), zProfe:+S.zProfe.toFixed(2),
             zCam:+S.zCam.toFixed(2), puerta:p? [p.i,p.j] : null, frente:frenteDe(S.n) }; }),
  ruta:(a,b)=>{ const r=rutaCeldas(a,b); return { largo:r?r.length:0, esquinas:esquinas(r) }; },
  /* ---- LOS DEDOS ---- */
  leer:(lm)=>manoLeer(lm),
  contar:(lms)=>manoTotal(lms),
  manoFalsa:(dedos, pinza, cx, cy)=>{
    /* arma una mano de 21 puntos con N dedos estirados. Los indices son los de MediaPipe:
       0 muneca, 1-4 pulgar, 5-8 indice, 9-12 medio, 13-16 anular, 17-20 menique. */
    const X=cx==null?0.5:cx, Y=cy==null?0.5:cy, S=0.16;
    const lm=[]; for(let k=0;k<21;k++) lm.push({x:X,y:Y,z:0});
    lm[0]={x:X, y:Y+S, z:0};
    const nud=[[5,-0.055],[9,0],[13,0.050],[17,0.098]];
    const cuantos=Math.max(0,Math.min(5,dedos|0));
    const largos = Math.min(4, pinza? Math.max(0,cuantos-1) : cuantos);
    nud.forEach(([n,off],idx)=>{
      lm[n]={x:X+off, y:Y+0.02, z:0};
      const estirado = idx<largos;
      const L = estirado? 0.118 : -0.02;
      lm[n+1]={x:X+off, y:Y+0.02-(estirado?L*0.34:-0.04), z:0};
      lm[n+2]={x:X+off, y:Y+0.02-(estirado?L*0.66:-0.08), z:0};
      lm[n+3]={x:X+off, y:Y+0.02-(estirado?L:-0.10), z:0};
    });
    /* el pulgar: abierto se va lejos del nudillo del menique; cerrado se le cruza por delante */
    const pulgarAbierto = pinza? false : (cuantos>=5 || (cuantos>0 && largos<cuantos));
    if(pinza){ lm[1]={x:X-0.05,y:Y+0.11,z:0}; lm[2]={x:X-0.06,y:Y+0.07,z:0};
               lm[3]={x:X-0.055,y:Y+0.03,z:0};
               lm[4]={x:lm[8].x+0.005, y:lm[8].y+0.005, z:0}; }
    else if(pulgarAbierto){ lm[1]={x:X-0.06,y:Y+0.12,z:0}; lm[2]={x:X-0.11,y:Y+0.09,z:0};
               lm[3]={x:X-0.155,y:Y+0.06,z:0}; lm[4]={x:X-0.195,y:Y+0.035,z:0}; }
    else { lm[1]={x:X-0.05,y:Y+0.12,z:0}; lm[2]={x:X-0.02,y:Y+0.09,z:0};
           lm[3]={x:X+0.02,y:Y+0.075,z:0}; lm[4]={x:X+0.055,y:Y+0.065,z:0}; }
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
    const base=window.__recreo.manoFalsa(5,false,0.5,0.5);
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
    return { ruido, hz, entrada:+de.toFixed(5), salida:+ds.toFixed(5),
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
    const t0=t; let ms90=-1;
    for(let c=0;c<200;c++){
      if(t>=proxMed){ manosInyectar([B], t); proxMed+=dtM; }
      manosAvanzar(dtR/1000);
      const x=MANO.ranuras[0].sal[0];
      if(ms90<0 && Math.abs(x-x0)>=Math.abs(salto)*0.90){ ms90=t-t0; break; }
      t+=dtR;
    }
    MANO.pausa=false;
    return { salto, hz, ms90: ms90<0? null : +ms90.toFixed(0),
             desde:+x0.toFixed(4), hasta:+MANO.ranuras[0].sal[0].toFixed(4) };
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
                           if(o.tau!=null) MANO_TAU=o.tau; }
                    return { fcMin:OE.fcMin, beta:OE.beta, fcD:OE.fcD, tau:MANO_TAU }; },
  /* cuanto cuesta dibujar las dos manos encima del juego, en milisegundos por cuadro */
  /* cuanto cuesta armar las dos manos 3D, en milisegundos por cuadro */
  manoCosto:(n)=>{
    manosInyectar([window.__recreo.manoFalsa(4,false,0.3,0.5), window.__recreo.manoFalsa(3,true,0.7,0.6)]);
    const v=n||200, t0=performance.now();
    for(let k=0;k<v;k++){ manosAvanzar(1/60); manos3DDibujar(); }
    return { ms:+((performance.now()-t0)/v).toFixed(3), veces:v };
  },
  /* el ritmo real: cuantas mediciones por segundo y cuanto tarda cada una */
  manos3D:()=>manos3DVer(),
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
      if(bichosVivos>0 && !(vueltas%8) && !pararEn){
        let p=null;
        const b=BICHOS.find(q=>q.viva);
        const z=TIZAS.find(q=>q.viva && q.espera<=0);
        if(b) p=[b.x,b.y,b.z];
        else if(z) p=[z.x,z.y,z.z];
        else if(casillBueno>=0 && CASILL[casillBueno] && !CASILL[casillBueno].abierto){
          const c=CASILL[casillBueno]; p=[c.x, c.y+0.35, c.z];
        }
        if(p){ const s=aPantalla(p[0],p[1],p[2]); if(s.delante) TOQUES.push({x:s.x, y:s.y}); }
      }
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
      if(bichosVivos>0 && !(pasos%8)){
        let p=null;
        const b=BICHOS.find(q=>q.viva);
        const z=TIZAS.find(q=>q.viva && q.espera<=0);
        if(b) p=[b.x,b.y,b.z];
        else if(z) p=[z.x,z.y,z.z];
        else if(casillBueno>=0 && CASILL[casillBueno] && !CASILL[casillBueno].abierto){
          const c=CASILL[casillBueno]; p=[c.x, c.y+0.35, c.z];
        }
        if(p){ const s=aPantalla(p[0],p[1],p[2]); if(s.delante) TOQUES.push({x:s.x,y:s.y}); }
      }
      avanzar(1/60);
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
