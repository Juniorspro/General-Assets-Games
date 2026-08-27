
/* =========================================================================================
   GANCHOS DE PRUEBA
   Tres cosas que no se ven en una foto y hay que medir: que el modelo generado cargue CON su
   esqueleto y que las animaciones lo muevan de verdad; que contar dedos funcione; y que el guion
   avance sin trabarse en ninguna escena.
   ========================================================================================= */
window.__recreo={
  estado:()=>({ pant, jugando, terminado, escena:(GUION[escena_i]||{}).id||null, i:escena_i,
                t:+escenaT.toFixed(2), espera:+esperaT.toFixed(2),
                libros, aciertos, total:LIBROS_N,
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
    manoVoto(t.hay? t.dedos : -1); MANO.on=true; MANO.estado='lista';
    dibujarManos(lms); pintarCam();
    return { crudo:t, firme:MANO.dedos, votos:MANO.votos }; },
  manos:()=>({ estado:MANO.estado, on:MANO.on, hay:MANO.hay, dedos:MANO.dedos,
               gesto:MANO.gesto, manos:MANO.manos, votos:MANO.votos }),
  manosIniciar:()=>manosIniciar(),
  /* ---- correr el guion sin cuadros de verdad ---- */
  avanzar:(seg,fps)=>{ const n=Math.round((seg||1)*(fps||60));
    for(let k=0;k<n;k++) avanzar(1/(fps||60));
    return window.__recreo.estado(); },
  /* juega el juego entero contestando siempre bien: es la prueba de que el guion no se traba y de
     que los ocho libros se pueden resolver */
  jugarSolo:(tope)=>{
    const log=[]; let vueltas=0;
    while(!terminado && vueltas++<(tope||6000)){
      const E=GUION[escena_i];
      if(E && E.espera){
        if(E.espera.tipo==='dedos'){ MANO.on=false; padPedido=E.espera.n; }
        else { MANO.on=false; padPedido=1; }
      } else if(cuenta && !bloqueo){ MANO.on=false; padPedido=cuenta.res; }
      const antes=escena_i, aL=libros;
      avanzar(1/60);
      if(escena_i!==antes) log.push('escena:'+((GUION[escena_i]||{}).id||'fin'));
      if(libros!==aL) log.push('libro:'+libros);
    }
    return { terminado, libros, aciertos, vueltas, log:log.slice(0,40) };
  },
  saltarA:(id)=>{ const k=GUION.findIndex(e=>e.id===id); if(k<0) return 'no hay '+id;
                  escena_i=k-1; siguienteEscena(); return window.__recreo.estado(); },
  aula:()=>({ i:CLASE_I, j:CLASE_J, x:+CLASE_X.toFixed(2), z:+CLASE_Z.toFixed(2),
              puerta: PUERTA_CLASE? [PUERTA_CLASE.i, PUERTA_CLASE.j, PUERTA_CLASE.abierta] : null,
              libros:LIBROS.length }),
  cuentas:()=>CUENTAS.map(c=>({txt:c.txt, res:c.res})),
  perfil:()=>{ const i=render.info;
    return { llamadas:i.render.calls, tris:i.render.triangles, programas:i.programs?i.programs.length:0,
             geometrias:i.memory.geometries, texturas:i.memory.textures,
             cuadros:cuadrosTotal, pasos:pasosTotal }; },
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
  idioma:(c)=>{ if(c) elegirIdioma(c); return IDIOMA; },
  pantalla:(p)=>{ verPantalla(p); return pant; }
};
</script>
</body>
</html>
