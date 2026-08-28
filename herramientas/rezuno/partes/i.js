/* =========================================================================================
   LOS GANCHOS DE PRUEBA

   Nada de esto lo usa el juego. Estan para poder AFIRMAR cosas con numeros en vez de mirar una
   captura: que las 108 cartas estan, que una partida entera termina, que el boton apagado y la regla
   son la misma cuenta, que un pellizco de mentira cae en la zona que se ve, y que el tutorial se
   puede completar de punta a punta sin camara.
   ========================================================================================= */
window.__rez={
  estado:()=>({ pant, fase:G.fase, turno:G.turno, gana:G.gana, color:G.color, valor:G.valor,
                manos:G.manos.map(m=>m.length), mazo:G.mazo.length, pila:G.pila.length,
                sel:G.sel, colorPide:G.colorPide, robo:G.robo, giro:G.giro,
                tut:{ on:TUT.on, paso:TUT.paso, hecho:TUT.hecho } }),
  idioma:(c)=>{ IDIOMA=c; pintarIdioma(); return IDIOMA; },
  pantalla:(p)=>{ verPantalla(p); return pant; },
  /* ---- el mazo ---- */
  mazoVer:()=>{
    const m=mazoNuevo();
    const cuenta={};
    for(const c of m){ const k=(c.color===4?'W':NOMBRE_COL[c.color])+':'+c.valor;
                       cuenta[k]=(cuenta[k]||0)+1; }
    return { total:m.length, ceros:m.filter(c=>c.valor===0).length,
             comodines:m.filter(c=>c.color===4).length,
             mas4:m.filter(c=>c.valor===MAS4).length,
             porColor:[0,1,2,3].map(k=>m.filter(c=>c.color===k).length), cuenta };
  },
  /* ---- la regla, aislada ---- */
  pega:(c, col, val)=>pega(c, col, val),
  /* ---- una partida ---- */
  repartir:(s)=>{ repartir(s||1); G.fase='juego'; verPantalla('juego'); return window.__rez.estado(); },
  /* pone una mano y una pila a mano, para poder fotografiar y probar un caso concreto —el comodin,
     la ultima carta— sin tener que buscar una semilla que lo produzca */
  poner:(mano, colorMesa, valorMesa)=>{
    if(mano) G.manos[J_VOS]=mano.map(c=>({color:c.color, valor:c.valor}));
    if(colorMesa!=null) G.color=colorMesa;
    if(valorMesa!=null) G.valor=valorMesa;
    /* la pila TAMBIEN, o el gancho mentiria: en el juego de verdad el color activo y la carta de
       arriba salen los dos de jugarCarta() y no pueden discrepar */
    if(colorMesa!=null && valorMesa!=null && colorMesa<4) G.pila.push({color:colorMesa, valor:valorMesa});
    G.sel=-1; G.colorPide=false; G.turno=J_VOS; G.fase='juego';
    return window.__rez.estado();
  },
  mano:(j)=>G.manos[j||0].map(c=>({color:c.color, valor:c.valor,
                                   pega:pega(c,G.color,G.valor)})),
  /* JUEGA LA PARTIDA ENTERA SOLA, y el jugador automatico usa EL MISMO CAMINO que una persona:
     seleccionar() y tirarSel(), no jugarCarta() directo. Llamando a la funcion de adentro no se
     probaria nada de lo que puede estar mal, que es justamente si el boton apagado deja pasar. */
  jugarSolo:(tope)=>{
    const log=[]; let n=0, ilegales=0;
    while(G.fase==='juego' && n++<(tope||6000)){
      if(G.turno!==J_VOS){ partidaTick(1/60); continue; }
      if(G.colorPide){ elegirColor(botColor(J_VOS)); continue; }
      const i=botElegir(J_VOS);
      if(i<0){
        if(!G.robo){ robarJugador(); }
        else { G.turno=siguiente(J_VOS); G.robo=false; }
        continue;
      }
      seleccionar(i);
      const antes=G.pila.length;
      const c=G.manos[J_VOS][i];
      const deberia=pega(c,G.color,G.valor);
      tirarSel();
      if(G.colorPide){ elegirColor(botColor(J_VOS)); }
      const bajo=G.pila.length>antes;
      /* LA COMPROBACION QUE IMPORTA: nunca puede bajar una carta que la regla dice que no pega */
      if(bajo && !deberia) ilegales++;
      if(!bajo && G.sel>=0) soltar();
    }
    return { vueltas:n, fase:G.fase, gana:G.gana, ilegales,
             manos:G.manos.map(m=>m.length), log };
  },
  /* ---- LO QUE SE VE Y LO QUE SE PELLIZCA SON EL MISMO OBJETO ----
     En 3D no hay rectangulos: hay objetos, y el rayo devuelve el objeto. Estos ganchos PROYECTAN el
     centro de cada objeto a la pantalla y despues tiran el rayo por ahi, o sea que recorren el
     camino entero —mundo, camara, proyeccion, rayo— y no un atajo. Si la camara mirara a otro lado,
     esta prueba fallaria, que es exactamente lo que tiene que hacer. */
  zonas:()=>{ armarMesa();
    /* EL ARBOL ENTERO, NO SOLO EL OBJETO. updateMatrixWorld() sobre un hijo NO actualiza a su padre,
       y desde que el abanico vive en un grupo que gira con el jugador, actualizar solo la carta la
       proyecta con la matriz VIEJA del grupo. Es el mismo defecto que ya habia costado una prueba en
       el rayo, con otro disfraz: medir sin poner el arbol al dia. */
    escena.updateMatrixWorld(true); camara.updateMatrixWorld(true);
    const v=new THREE.Vector3();
    return PICK.map(o=>{ o.updateMatrixWorld(true);
      v.setFromMatrixPosition(o.matrixWorld).project(camara);
      return { t:o.userData.tipo, i:o.userData.i, activo:!!o.userData.activo,
               px:+((v.x*0.5+0.5)).toFixed(3), py:+((-v.y*0.5+0.5)).toFixed(3) }; }); },
  pantallaDe:(tipo,i)=>{
    /* SE DEJA ASENTAR LA ANIMACION ANTES DE PROYECTAR. Las cartas se acercan a su sitio con un lerp,
       asi que en el cuadro siguiente a repartir todavia estan a mitad de camino: apuntar ahi es
       apuntar a donde la carta ESTUVO. Una persona espera a que se acomoden; la prueba tambien. */
    /* SESENTA Y NO DIECISEIS. Con 16 pasadas el lerp queda al 1,5% del camino, y cuando la mano
       cambia de tamaño una carta se mueve tres unidades: ese 1,5% son 0,046, o sea DEL MISMO TAMAÑO
       que el escalon de 0,05 que decide cual carta esta delante. Medido: apuntar a la carta 3 daba
       la 4 en la primera jugada de algunas partidas y no en otras — la diferencia era de donde venia
       la carta. Con 60 pasadas el residuo es 4 diezmillonesimas. */
    for(let k=0;k<60;k++) armarMesa();
    camara.updateMatrixWorld(true);
    const o=PICK.filter(q=>q.userData.tipo===tipo && (i==null||q.userData.i===i)).pop();
    if(!o) return null;
    o.updateMatrixWorld(true);
    /* PARA UNA CARTA SE APUNTA A SU FRANJA VISIBLE Y NO A SU CENTRO, que es donde apunta una persona:
       con el abanico superpuesto el centro de una carta esta debajo de la siguiente. El punto sale de
       la misma geometria que dibuja el abanico, no de un numero puesto a mano. */
    const v=new THREE.Vector3();
    if(tipo==='carta') v.copy(puntoMano(o, o.userData.i, G.manos[J_VOS].length));
    else v.setFromMatrixPosition(o.matrixWorld);
    v.project(camara);
    return { x:v.x*0.5+0.5, y:-v.y*0.5+0.5, activo:!!o.userData.activo };
  },
  zonaEn:(fx,fy)=>{ armarMesa(); const o=pickEn(fx,fy);
                    return o? {t:o.userData.tipo,i:o.userData.i,activo:!!o.userData.activo} : null; },
  /* pellizca EN LA PANTALLA, sobre el centro proyectado del objeto: el mismo camino que la camara */
  pellizcarZona:(tipo, i)=>{
    const p=window.__rez.pantallaDe(tipo,i);
    if(!p) return 'no hay '+tipo;
    const o=pickEn(p.x,p.y);
    return { hizo:activar(p.x,p.y), apunta:o? o.userData.tipo+':'+o.userData.i : null,
             pantalla:[+p.x.toFixed(3),+p.y.toFixed(3)], activo:p.activo };
  },
  /* ---- la mano de mentira: entra por el mismo camino que la de verdad ---- */
  /* UNA MANO DE MENTIRA CON LOS VEINTIUN PUNTOS EN SU SITIO. La primera version ponia todos los
     puntos encima del mismo lugar salvo cuatro, y servia para probar el pellizco —que solo mira
     esos cuatro— pero al dibujarla en 3D salia un palito: no se podia juzgar nada de la mano. Esta
     tiene la muñeca, la palma y los cinco dedos con sus falanges, con las proporciones de una mano
     abierta de verdad. */
  manoFalsa:(cx, cy, pinza, esc)=>{
    const S=esc==null? 1 : esc;
    const lm=new Array(21);
    const P=(x,y,z)=>({x:cx+x*S, y:cy+y*S, z:(z||0)*S});
    lm[0]=P(0, 0.115, 0);                                   // muñeca
    /* los cuatro nudillos, abiertos en abanico */
    const nud=[[ -0.052,0.010],[-0.018,-0.005],[0.016,-0.002],[0.048,0.014]];
    const largo=[0.052,0.058,0.054,0.042];
    for(let d=0; d<4; d++){
      const b=5+d*4, nx=nud[d][0], ny=nud[d][1];
      const ang=(-0.30+d*0.20);
      lm[b]=P(nx, ny, -0.01);
      for(let k=1;k<=3;k++){
        const t=largo[d]*k*0.62;
        lm[b+k]=P(nx+Math.sin(ang)*t, ny-Math.cos(ang)*t, -0.012*k);
      }
    }
    /* el pulgar sale hacia el costado y hacia adelante, que es lo que lo distingue de los otros */
    lm[1]=P(-0.055, 0.078, 0.004);
    lm[2]=P(-0.086, 0.048, 0.010);
    lm[3]=P(-0.100, 0.020, 0.016);
    lm[4]=P(-0.106,-0.004, 0.020);
    if(pinza){
      /* pellizcar es llevar la punta del pulgar a la punta del indice: se mueven LAS DOS puntas al
         punto medio, que es lo que hace una mano */
      const mx=(lm[4].x+lm[8].x)/2, my=(lm[4].y+lm[8].y)/2, mz=(lm[4].z+lm[8].z)/2;
      lm[4]={x:mx-0.004*S, y:my, z:mz}; lm[8]={x:mx+0.004*S, y:my, z:mz};
      lm[3]={x:(lm[2].x+lm[4].x)/2, y:(lm[2].y+lm[4].y)/2, z:(lm[2].z+lm[4].z)/2};
      lm[7]={x:(lm[6].x+lm[8].x)/2, y:(lm[6].y+lm[8].y)/2, z:(lm[6].z+lm[8].z)/2};
    }
    return lm;
  },
  /* EL ESPEJO ES UN PARAMETRO Y NO UNA CONSTANTE, desde que la camara puede ser la trasera. Por
     omision va SIN espejo, que es el caso de la trasera —la de por omision del juego—; pasando true
     se prueba el camino de la frontal por el mismo gancho. */
  manoInyectar:(cx, cy, pinza, t, esp)=>{
    MANO.on=true; MANO.espejo=!!esp;
    manosInyectar(window.__rez.manoFalsa(cx,cy,pinza), t==null? performance.now() : t);
    return { x:+MANO.x.toFixed(3), y:+MANO.y.toFixed(3), crudo:+MANO.crudo.toFixed(3),
             pinza:MANO.pinza, nueva:MANO.pinzaNueva };
  },
  /* EL RETARDO EN REGIMEN: se mueve la mano de mentira a velocidad constante y se mide cuanto atras
     va el aro cuando ya se estabilizo. Es el numero que decide si apuntar a una carta se siente
     pegado o pastoso. Se devuelve en fraccion de pantalla y en milisegundos. */
  manoRampa:(vel, cuadros)=>{
    fpReset();
    const v=vel==null? 0.5 : vel;          // fracciones de pantalla por segundo
    const dt=16, n=cuadros||90;
    let t=performance.now(), x=0.2;
    /* SE CALIBRA EL DESVIO ANTES DE MEDIR EL RETARDO. El punto que apunta es el medio entre el pulgar
       y el indice, y en una mano abierta ese medio NO cae en el centro de la mano: esta corrido unos
       centesimos. Sin calibrar, ese corrimiento constante se sumaba al retardo y el gancho reportaba
       193 ms de atraso donde hay 6 — o sea que la prueba media la forma de la mano y no el filtro. */
    for(let k=0;k<70;k++){ t+=dt; window.__rez.manoInyectar(x,0.5,false,t); }
    const off=MANO.x-x;
    for(let k=0;k<n;k++){ t+=dt; x+=v*dt/1000; window.__rez.manoInyectar(x,0.5,false,t); }
    const err=Math.abs((x+off)-MANO.x);
    return { vel:v, cuadros:n, real:+(x+off).toFixed(4), aro:+MANO.x.toFixed(4),
             desvio:+off.toFixed(4),
             retardoFrac:+err.toFixed(4), retardoMs:+(err/v*1000).toFixed(1) };
  },
  /* EL TEMBLOR: mano quieta con ruido, y cuanto de ese ruido llega al aro. Es la otra mitad de la
     pelea: un filtro que no atenua deja el aro vibrando encima de las cartas. */
  manoTemblor:(ruido, cuadros)=>{
    fpReset();
    const r=ruido==null? 0.006 : ruido, n=cuadros||240;
    let t=performance.now(), S=12345;
    const az=()=>{ S=(S*1103515245+12345)&0x7fffffff; return S/0x7fffffff*2-1; };
    /* EL RUIDO SE MIDE ALREDEDOR DE LA MEDIA MEDIDA Y NO ALREDEDOR DE 0,5. El punto que apunta esta
       corrido respecto del centro de la mano —el medio entre pulgar e indice no es el centro— asi que
       restarle 0,5 mete ese corrimiento constante adentro de la desviacion: el gancho reportaba que
       el filtro AMPLIFICABA el temblor veinticinco veces cuando lo atenua tres. Se recogen las dos
       series y se calcula su desviacion sobre su propia media. */
    const ent=[], sal=[];
    for(let k=0;k<n;k++){
      t+=16; const x=0.5+az()*r;
      window.__rez.manoInyectar(x,0.5,false,t);
      if(k>60){ ent.push(x); sal.push(MANO.x); }
    }
    const desv=(A)=>{ const m=A.reduce((a,b)=>a+b,0)/A.length;
                      return Math.sqrt(A.reduce((a,b)=>a+(b-m)*(b-m),0)/A.length); };
    const de=desv(ent), ds=desv(sal);
    return { ruido:r, cuadros:n, entra:+de.toFixed(5), sale:+ds.toFixed(5),
             atenua:+(de/Math.max(1e-9,ds)).toFixed(2) };
  },
  /* ---- LA CARA: SOLO MUEVE LA VISTA ---- */
  caraVer:()=>({ on:CARA.on, hay:CARA.hay, giro:+CARA.giro.toFixed(4), crudo:+CARA.crudo.toFixed(4),
                 medidas:CARA.medidas, ms:+CARA.msDet.toFixed(2), error:CARA.error,
                 camGiro:+camGiro.toFixed(4), grados:+(camGiro*180/Math.PI).toFixed(1),
                 cam:[+camara.position.x.toFixed(2), +camara.position.z.toFixed(2)] }),
  /* se inyecta un giro de cabeza y se deja que la vista lo siga, para poder medir hasta donde llega
     y comprobar que la mesa no se sale del cuadro en los extremos */
  caraInyectar:(giro, cuadros)=>{
    CARA.on=true; CARA.hay=true; CARA.crudo=giro; CARA.giro=giro;
    for(let k=0;k<(cuadros||120);k++) camaraGiro(giro*1.6, 1/60);
    armarMesa();
    return { pedido:giro, camGiro:+camGiro.toFixed(4), grados:+(camGiro*180/Math.PI).toFixed(1),
             encuadre:window.__rez.extremos(true) };
  },
  /* donde cae en pantalla cada blanco, uno por uno: para poder ver CUAL se sale del cuadro al girar
     en vez de deducirlo del rectangulo que los envuelve a todos */
  puntos:()=>{ armarMesa(); escena.updateMatrixWorld(true);
    const v=new THREE.Vector3();
    return PICK.map(o=>{ o.updateMatrixWorld(true);
      v.setFromMatrixPosition(o.matrixWorld).project(camara);
      return [o.userData.tipo+':'+o.userData.i, +(v.x*0.5+0.5).toFixed(3)]; }); },
  caraSoltar:()=>{ CARA.hay=false; CARA.giro=0;
                   for(let k=0;k<160;k++) camaraGiro(0,1/60); return window.__rez.caraVer(); },
  /* ---- LAS MANOS DIBUJADAS ---- */
  manos3D:()=>(manosPintar(1/60), { articulaciones:artMalla.count, huesos:hueMalla.count,
                 tope:[M_ART, M_HUE], tuya:!!(MANO.on&&MANO.hay&&MANO.hayPts),
                 alcance:RIV_ALC.map(v=>+v.toFixed(2)) }),
  /* proyecta la punta del indice dibujada y la compara con el punto que APUNTA: si se separan, el
     jugador ve su pinza en un lugar y agarra en otro */
  manoCoincide:()=>{
    if(!MANO.hayPts) return null;
    manosPintar(1/60); camara.updateMatrixWorld(true);
    const h=2*Math.tan(camara.fov*Math.PI/360)*Math.abs(MANO_Z), w=h*camara.aspect;
    const z0=MANO.pts[2];
    const pun=(k)=>{ const fz=MANO.pts[k*3+2]-z0, prof=MANO_Z-fz*MANO_PROF;
      const hz=2*Math.tan(camara.fov*Math.PI/360)*Math.abs(prof), wz=hz*camara.aspect;
      return new THREE.Vector3((MANO.pts[k*3]-0.5)*wz, -(MANO.pts[k*3+1]-0.5)*hz, prof)
        .applyMatrix4(camara.matrixWorld).project(camara); };
    const a=pun(4), b=pun(8);
    const px=((a.x+b.x)/2)*0.5+0.5, py=-((a.y+b.y)/2)*0.5+0.5;
    return { dibujo:[+px.toFixed(4), +py.toFixed(4)], apunta:[+MANO.x.toFixed(4), +MANO.y.toFixed(4)],
             separacion:+Math.hypot(px-MANO.x, py-MANO.y).toFixed(5) };
  },
  manoVer:()=>({ on:MANO.on, estado:MANO.estado, error:MANO.error, hay:MANO.hay,
                 x:+MANO.x.toFixed(3), y:+MANO.y.toFixed(3), pinza:MANO.pinza,
                 crudo:+MANO.crudo.toFixed(3), medidas:MANO.medidas, delegado:MANO.delegado,
                 espejo:MANO.espejo, usa:MANO.usa, pref:CAM_PREF, ms:+MANO.msDet.toFixed(2) }),
  /* EL FLANCO: una pinza sostenida tiene que valer UNA vez. Se empujan n cuadros seguidos con la
     pinza cerrada y se cuentan los flancos. */
  flancoProbar:(n)=>{
    let t=performance.now(), f=0;
    window.__rez.manoInyectar(0.5,0.5,false,t);
    for(let k=0;k<(n||10);k++){ t+=16; window.__rez.manoInyectar(0.5,0.5,true,t); if(tomarPinza()) f++; }
    return { cuadros:n||10, flancos:f };
  },
  /* la histeresis: se barre la distancia cruda de abierta a cerrada y al reves, y se anota donde
     cambia. Con un umbral solo, los dos cambios caerian en el mismo valor y no habria histeresis. */
  histProbar:()=>{
    const r={cierra:null, abre:null};
    let t=performance.now();
    window.__rez.manoInyectar(0.5,0.5,false,t);
    for(let d=0.09; d>0.0; d-=0.002){
      t+=16; const lm=window.__rez.manoFalsa(0.5,0.5,false);
      lm[4]={x:0.5-d/2,y:0.5,z:0}; lm[8]={x:0.5+d/2,y:0.5,z:0};
      manosInyectar(lm,t);
      if(MANO.pinza && r.cierra==null) r.cierra=+MANO.crudo.toFixed(3);
    }
    for(let d=0.0; d<0.12; d+=0.002){
      t+=16; const lm=window.__rez.manoFalsa(0.5,0.5,false);
      lm[4]={x:0.5-d/2,y:0.5,z:0}; lm[8]={x:0.5+d/2,y:0.5,z:0};
      manosInyectar(lm,t);
      if(!MANO.pinza && r.abre==null && r.cierra!=null) r.abre=+MANO.crudo.toFixed(3);
    }
    return r;
  },
  /* ---- el tutorial jugado solo ---- */
  tutJugar:(tope)=>{
    tutorialEmpezar();
    const log=[]; let n=0, ult=-1;
    MANO.on=false;                      // sin camara: los pasos 0 y 1 se dan por vistos
    while(TUT.on && n++<(tope||4000)){
      if(TUT.paso!==ult){ ult=TUT.paso; log.push('paso'+TUT.paso); }
      if(TUT.paso===2) window.__rez.pellizcarZona('carta',0);
      else if(TUT.paso===3) window.__rez.pellizcarZona('tirar');
      else if(TUT.paso===4){
        const o=tutObjetivo();
        if(G.sel<0 && o>=0) window.__rez.pellizcarZona('carta',o);
        else if(G.sel>=0) window.__rez.pellizcarZona('dejar');
      }
      else if(TUT.paso===5) window.__rez.pellizcarZona('mazo');
      partidaTick(1/60); tutTick(1/60);
    }
    return { vueltas:n, paso:TUT.paso, on:TUT.on, hecho:TUT.hecho, pant, log };
  },
  /* arranca el tutorial y lo deja en el paso que se pida, para poder fotografiar cada uno */
  /* deja correr el reloj de la partida sin dibujar: los rivales piensan y las cartas vuelan */
  correr:(seg)=>{ const n=Math.round((seg||1)*60); for(let k=0;k<n;k++) partidaTick(1/60);
                  return window.__rez.estado(); },
  /* JUEGA UNA PARTIDA ENTERA SOLO POR ZONAS, que es literalmente el camino del jugador: buscar la
     zona en el mismo sitio donde se dibuja, pellizcar el centro y ver que pasa. Es la prueba que
     cubre lo unico que no cubre jugarSolo(): que el boton apagado y la regla sean la misma cuenta. */
  porZonas:(sem, tope)=>{
    repartir(sem||1); G.fase='juego';
    let n=0, colores=0, ilegales=0; const fallos=[];
    while(G.fase==='juego' && n++<(tope||9000)){
      if(G.turno!==J_VOS){ partidaTick(1/60); continue; }
      if(G.colorPide){ window.__rez.pellizcarZona('color',1); colores++; continue; }
      if(G.sel>=0){
        const c=G.manos[J_VOS][G.sel], deberia=pega(c,G.color,G.valor), antes=G.pila.length;
        const r=window.__rez.pellizcarZona('tirar');
        if(G.pila.length>antes && !deberia) ilegales++;
        if(G.sel>=0 && !G.colorPide) window.__rez.pellizcarZona('dejar');
        continue;
      }
      const m=G.manos[J_VOS];
      let i=-1; for(let k=0;k<m.length;k++) if(pega(m[k],G.color,G.valor)){ i=k; break; }
      if(i<0){
        const q=window.__rez.pellizcarZona('mazo');
        if(!q || !q.hizo){ G.turno=siguiente(J_VOS); G.robo=false; }
        continue;
      }
      const r=window.__rez.pellizcarZona('carta',i);
      /* SI EL RAYO NO AGARRA LA CARTA QUE SE APUNTO, SE ANOTA. Es el unico modo de fallo que importa
         aca: significa que lo que se ve y lo que se pellizca no coinciden. */
      if(!r || !r.hizo || G.sel!==i){
        const det={n, i, mano:m.length, apunta:r&&r.apunta, sel:G.sel, p:r&&r.pantalla, ptos:[]};
        const selG=G.sel; G.sel=-1;
        for(let k=0;k<m.length;k++){ const q=window.__rez.pantallaDe('carta',k);
          det.ptos.push(q? [k, +q.x.toFixed(3), +q.y.toFixed(3),
                            (o=>o?o.userData.tipo+':'+o.userData.i:'x')(pickEn(q.x,q.y))] : [k,'null']); }
        G.sel=selG;
        det.z=PICK.filter(o=>o.userData.tipo==='carta')
                  .map(o=>[o.userData.i, +o.position.x.toFixed(3), +o.position.z.toFixed(3)]);
        fallos.push(det);
        if(fallos.length>60) break; }
    }
    return { vueltas:n, fase:G.fase, gana:G.gana, colores, ilegales, manos:G.manos.map(x=>x.length),
             fallos:fallos.length, ejemplos:fallos.slice(0,4) };
  },
  tutIr:(paso)=>{
    tutorialEmpezar();
    let n=0;
    while(TUT.paso<(paso||0) && n++<3000){
      if(TUT.paso===0||TUT.paso===1){ MANO.on=false; }
      else if(TUT.paso===2) window.__rez.pellizcarZona('carta',0);
      else if(TUT.paso===3) window.__rez.pellizcarZona('tirar');
      else if(TUT.paso===4){ const o=tutObjetivo();
        if(G.sel<0 && o>=0) window.__rez.pellizcarZona('carta',o); else window.__rez.pellizcarZona('dejar'); }
      else if(TUT.paso===5) window.__rez.pellizcarZona('mazo');
      partidaTick(1/60); tutTick(1/60);
    }
    return window.__rez.tutVer();
  },
  tutVer:()=>({ on:TUT.on, paso:TUT.paso, hecho:TUT.hecho, objetivo:tutObjetivo(),
                guia:(document.getElementById('guiaT')||{}).textContent||'' }),
  /* ---- el audio: lo unico que prueba que sono es medirlo ---- */
  audio:()=>({ hay:!!AUD.ctx, on:AUD.on, estado:AUD.ctx? AUD.ctx.state : 'no' }),
  son:(k)=>{ son(k); return true; },
  /* ---- costo ---- */
  costo:(n)=>{
    const v=n||300, t=[];
    for(let k=0;k<v;k++){ const a=performance.now();
      armarMesa(); pintarTut(); pintarAro(); render.render(escena,camara);
      t.push(performance.now()-a); }
    t.sort((x,y)=>x-y);
    const inf=render.info;
    return { cuadros:v, media:+(t.reduce((s,x)=>s+x,0)/v).toFixed(3),
             p50:+t[Math.floor(v*0.5)].toFixed(3), p90:+t[Math.floor(v*0.9)].toFixed(3),
             max:+t[v-1].toFixed(3), pick:PICK.length,
             llamadas:inf.render.calls, tris:inf.render.triangles,
             texturas:inf.memory.textures, geometrias:inf.memory.geometries };
  },
  /* EL ENCUADRE SE MIDE, NO SE ESTIMA. Devuelve el rectangulo que ocupan TODAS las piezas de la mesa
     proyectadas a la pantalla, en fraccion de 0 a 1. Si algo se sale, aca da menos que 0 o mas que 1
     — y eso en una captura chica no se ve, porque lo que se sale simplemente no esta. */
  /* CON `mios` SOLO SE MIDE LO QUE EL JUGADOR TIENE QUE PODER ALCANZAR: su abanico, el mazo y los
     botones. Los abanicos de los rivales quedan afuera de la cuenta a proposito — al asomarse a un
     lado es NATURAL que el rival del otro lado se salga del cuadro, y exigir que entre todo con la
     vista girada obliga a alejar la camara casi un 50%, o sea a dejar las cartas del tamaño de un
     sello para poder ver dos abanicos que ni se tocan. */
  extremos:(mios)=>{
    armarMesa();
    /* EL ARBOL ENTERO, NO SOLO EL OBJETO. updateMatrixWorld() sobre un hijo NO actualiza a su padre,
       y desde que el abanico vive en un grupo que gira con el jugador, actualizar solo la carta la
       proyecta con la matriz VIEJA del grupo. Es el mismo defecto que ya habia costado una prueba en
       el rayo, con otro disfraz: medir sin poner el arbol al dia. */
    escena.updateMatrixWorld(true); camara.updateMatrixWorld(true);
    const v=new THREE.Vector3();
    let x0=9,y0=9,x1=-9,y1=-9;
    const lista = mios? PICK.filter(o=>o.userData.tipo).concat([mazoMalla]).filter(Boolean)
                      : PICK.concat([mazoMalla]).filter(Boolean);
    for(const o of lista){
      o.updateMatrixWorld(true);
      /* SE PROYECTAN LAS OCHO ESQUINAS DEL OBJETO EN SU PROPIO ESPACIO, NO SU CAJA DE MUNDO.
         Box3.setFromObject devuelve la caja ALINEADA A LOS EJES: para una carta inclinada y girada
         esa caja es bastante mas grande que la carta, y crece cuando la vista rota — asi que el
         barrido decia que el abanico se salia del cuadro cuando lo que se salia era una caja
         imaginaria. Medido despues: con doce grados de giro las siete cartas caen EXACTAMENTE en la
         misma fraccion de pantalla que sin girar. */
      const g=o.geometry; if(!g) continue;
      if(!g.boundingBox) g.computeBoundingBox();
      const caja=g.boundingBox;
      for(let i=0;i<8;i++){
        v.set(i&1?caja.max.x:caja.min.x, i&2?caja.max.y:caja.min.y, i&4?caja.max.z:caja.min.z)
         .applyMatrix4(o.matrixWorld).project(camara);
        const px=v.x*0.5+0.5, py=-v.y*0.5+0.5;
        if(px<x0)x0=px; if(px>x1)x1=px; if(py<y0)y0=py; if(py>y1)y1=py;
      }
    }
    return { x:[+x0.toFixed(3),+x1.toFixed(3)], y:[+y0.toFixed(3),+y1.toFixed(3)],
             entra:(x0>=0.01&&x1<=0.99&&y0>=0.01&&y1<=0.99),
             ancho:+(x1-x0).toFixed(3), alto:+(y1-y0).toFixed(3) };
  },
  /* mueve la camara en vivo para poder buscar el encuadre midiendo en vez de recompilando */
  encuadre:(o)=>{
    if(o){
      if(o.fov!=null){ camara.fov=o.fov; camara.updateProjectionMatrix(); }
      if(o.y!=null) camara.position.y=o.y;
      if(o.z!=null) camara.position.z=o.z;
      if(o.miraY!=null || o.miraZ!=null){ CAM_MIRA[0]=o.miraY!=null?o.miraY:CAM_MIRA[0];
                                          CAM_MIRA[1]=o.miraZ!=null?o.miraZ:CAM_MIRA[1]; }
      camara.lookAt(0, CAM_MIRA[0], CAM_MIRA[1]);
    }
    return { pos:[+camara.position.y.toFixed(2), +camara.position.z.toFixed(2)],
             fov:camara.fov, mira:CAM_MIRA.slice() };
  },
  escenaVer:()=>{ armarMesa(); render.render(escena,camara);
    let mallas=0; escena.traverse(o=>{ if(o.isMesh) mallas++; });
    return { mallas, pick:PICK.length, llamadas:render.info.render.calls,
             tris:render.info.render.triangles,
             camara:[+camara.position.x.toFixed(1),+camara.position.y.toFixed(1),+camara.position.z.toFixed(1)],
             fov:camara.fov, sombra:render.shadowMap.enabled,
             fondo:'#'+escena.background.getHexString() }; },
  medidas:()=>({ lienzo:[lienzo.width,lienzo.height], marco:[marco.clientWidth, marco.clientHeight],
                 dpr:render.getPixelRatio(), aspecto:+camara.aspect.toFixed(3) })
};
</script>
</body>
</html>
