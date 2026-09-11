/* =========================================================================================
   LOS GANCHOS DE PRUEBA

   Nada de esto lo usa el juego. Estan para poder AFIRMAR cosas con numeros en vez de mirar una
   captura: que las 108 cartas estan, que una partida entera termina, que el boton apagado y la regla
   son la misma cuenta, que un pellizco de mentira cae en la zona que se ve, y que el tutorial se
   puede completar de punta a punta sin camara.
   ========================================================================================= */
/* el desvio de la forma de la mano, medido con la mano QUIETA: ver manoFrenar */
function _frenarDesvio(PM){
  fpReset();
  let t=performance.now(), tMed=t;
  for(let k=0;k<200;k++){
    t+=1000/60;
    while(tMed+PM<=t){ tMed+=PM; window.__rez.manoInyectar(0.5,0.5,false,tMed); }
    manosFiltrar(t);
  }
  return MANO.x-0.5;
}
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
    /* ===== LAS FALANGES MIDEN LO QUE MIDEN EN UNA MANO =====
       La primera version daba a los tres tramos de cada dedo el MISMO largo, y corto: 0,30 del largo
       de la palma cada uno. Con los radios nuevos —que salen de una mano adulta— eso deja cada tramo
       midiendo dos veces su propio grosor, y un cilindro de relacion 2 entre dos esferas se ve como
       una CUENTA, no como una falange. O sea que la mano de mentira se veia a collar aunque la de
       verdad no, y una prueba que no representa lo que se mira no sirve para mirarlo.
       Ahora los tres tramos van 0,45 · 0,27 · 0,18 de la palma, que es la proporcion de un dedo de
       verdad: el de la base es el largo y la punta es la corta. */
    const PL=0.115;                                         // el largo de la palma, en el marco
    lm[0]=P(0, PL, 0);                                      // muñeca
    /* los cuatro nudillos con su arco: el del medio es el mas alto, el menique el mas bajo */
    const nud=[[-0.052,0.012],[-0.018,-0.005],[0.016,-0.001],[0.048,0.018]];
    /* el largo de cada dedo en unidades de palma; el menique es notablemente mas corto */
    const largo=[[0.44,0.26,0.17],[0.48,0.29,0.18],[0.45,0.27,0.17],[0.34,0.21,0.15]];
    for(let d=0; d<4; d++){
      const b=5+d*4, ang=(-0.16+d*0.11);
      let x=nud[d][0], y=nud[d][1];
      lm[b]=P(x, y, -0.01);
      for(let k=0;k<3;k++){
        const t=largo[d][k]*PL;
        x+=Math.sin(ang)*t; y-=Math.cos(ang)*t;
        lm[b+k+1]=P(x, y, -0.012*(k+1));
      }
    }
    /* el pulgar sale hacia el costado y hacia adelante, que es lo que lo distingue de los otros */
    {
      let x=-0.048, y=0.082;
      lm[1]=P(x, y, 0.004);
      const dx=-0.66, dy=-0.75, lg=[0.42,0.28,0.22];
      for(let k=0;k<3;k++){
        x+=dx*lg[k]*PL; y+=dy*lg[k]*PL;
        lm[2+k]=P(x, y, 0.006*(k+1));
      }
    }
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
  /* ===== Y SE MIDE AL RITMO DE VERDAD, QUE ES LA CORRECCION IMPORTANTE =====
     Esta prueba inyectaba una medicion cada 16 ms, o sea a 62 Hz — un ritmo que el juego no alcanza
     nunca en un telefono. Asi medido, el retardo daba 6,4 ms y ese numero no describia nada de lo que
     el jugador siente: a 62 Hz el retardo es casi todo filtro, y en el juego de verdad es casi todo
     ESPERA DEL PROXIMO DATO. Ahora se le pasa el ritmo y se mide lo que pasa a ese ritmo. */
  manoRampa:(vel, cuadros, hz)=>{
    fpReset();
    MANO.hueco=0;
    const v=vel==null? 0.5 : vel;          // fracciones de pantalla por segundo
    const dt=1000/(hz||62.5), n=cuadros||90;
    let t=performance.now(), x=0.2;
    /* SE CALIBRA EL DESVIO ANTES DE MEDIR EL RETARDO. El punto que apunta es el medio entre el pulgar
       y el indice, y en una mano abierta ese medio NO cae en el centro de la mano: esta corrido unos
       centesimos. Sin calibrar, ese corrimiento constante se sumaba al retardo y el gancho reportaba
       193 ms de atraso donde hay 6 — o sea que la prueba media la forma de la mano y no el filtro. */
    for(let k=0;k<70;k++){ t+=dt; window.__rez.manoInyectar(x,0.5,false,t); }
    const off=MANO.x-x;
    for(let k=0;k<n;k++){ t+=dt; x+=v*dt/1000; window.__rez.manoInyectar(x,0.5,false,t); }
    const err=Math.abs((x+off)-MANO.x);
    return { vel:v, hz:+(1000/dt).toFixed(1), cuadros:n,
             real:+(x+off).toFixed(4), aro:+MANO.x.toFixed(4), desvio:+off.toFixed(4),
             retardoFrac:+err.toFixed(4), retardoMs:+(err/v*1000).toFixed(1) };
  },
  /* ===== LA INTERPOLACION: LA MANO SE MUEVE ENTRE MEDICION Y MEDICION =====
     Es LA prueba de la optimizacion. Se inyecta UNA sola medicion nueva —o sea, se simula que la
     camara entrego un cuadro y despues se calla— y se corren n cuadros de dibujo sin ninguna
     medicion mas. Si el punto se queda quieto, bajar el detector a 24 Hz dejaria la mano moviendose
     a tirones; si sigue acercandose al destino, la mano va a 60 aunque se la mida a 24. */
  /* ===== LA INTERPOLACION: LA MANO SE MUEVE ENTRE MEDICION Y MEDICION =====
     Es LA prueba de la optimizacion, y se hace en REGIMEN y no con un salto: se mueve la mano de
     mentira a velocidad constante, se la MIDE cada 42 ms —los 24 Hz del detector— y se DIBUJA cada
     16,7 —los 60 del juego—. Despues se mira, cuadro de dibujo por cuadro de dibujo, cuantos movieron
     el punto y cuanto lo movieron.
     Sin interpolacion solo pueden moverse los cuadros que caen justo despues de una medicion, o sea
     24 de cada 60: el 40%, y a saltos de dos cuadros y medio. Con interpolacion se mueven todos y el
     paso es parejo. `pasoMax/pasoMedio` es el numero que lo dice: 1 es perfectamente parejo. */
  manoInterp:(vel, pred, hz)=>{
    const antes=PRED_ON, perAntes=MANO.periodo;
    if(pred!=null) PRED_ON=!!pred;
    fpReset();
    const v=vel==null? 0.6 : vel;
    /* SE MIDE AL RITMO QUE SE LE PASA. El filtro no hay que avisarle: el tope de prediccion sale del
       hueco MEDIDO entre inyecciones, asi que se entera solo — que es justamente lo que se quiere
       comprobar. Se arranca con el hueco en cero para que lo aprenda de esta corrida. */
    MANO.hueco=0;
    const PM=1000/(hz||24), PD=1000/60;
    let t=performance.now(), x=0.2, tMed=t;
    let ant=null, mueven=0, n=0, sum=0, mx=0;
    for(let k=0;k<180;k++){
      t+=PD;
      while(tMed+PM<=t){ tMed+=PM; x+=v*PM/1000; window.__rez.manoInyectar(x,0.5,false,tMed); }
      manosFiltrar(t);
      if(k>90){
        if(ant!==null){ const d=Math.abs(MANO.x-ant); if(d>1e-6) mueven++; sum+=d; mx=Math.max(mx,d); n++; }
        ant=MANO.x;
      }
    }
    PRED_ON=antes; MANO.periodo=perAntes;
    const medio=sum/Math.max(1,n);
    return { vel:v, hz:hz||24, prediccion:(pred==null? antes : !!pred), cuadros:n, mueven,
             pctMueven:+(mueven/Math.max(1,n)).toFixed(3),
             pasoMedio:+medio.toFixed(5), pasoMax:+mx.toFixed(5),
             desparejo:+(mx/Math.max(1e-9,medio)).toFixed(2) };
  },
  hz:()=>({ tope:MANO_HZ_TOPE, min:MANO_HZ_MIN, reposo:MANO_HZ_REPOSO, carga:MANO_CARGA,
            usa:+MANO.hz.toFixed(1) }),
  /* ===== EL FRENAZO, QUE ES LO QUE SE SIENTE COMO "LA MANO VA ATRAS" =====
     La rampa mide con velocidad CONSTANTE, y a velocidad constante la prediccion compensa el muestreo
     entero: medido, el retardo da 6,4 ms lo mismo a 62 Hz que a 12. Ese numero es cierto y no
     describe nada, porque una mano de verdad no se mueve a velocidad constante: acelera, para y
     cambia de direccion. En esos instantes la prediccion apunta a donde la mano YA NO VA, y ahi si se
     paga el muestreo entero.
     Esta prueba mueve la mano, la FRENA en seco, y cuenta cuanto tarda el punto dibujado en quedar a
     menos de un umbral del sitio real. Es el numero que el jugador siente cuando llega a una carta y
     el aro se pasa de largo. */
  manoFrenar:(hz, vel, tol)=>{
    fpReset();
    const H=hz||24, v=vel==null? 0.9 : vel, T=tol==null? 0.012 : tol;
    const PM=1000/H, PD=1000/60;
    const off=_frenarDesvio(PM);
    fpReset();
    let t=performance.now(), x=0.25, tMed=t;
    /* primero se mueve un rato para que el filtro y la prediccion esten en regimen */
    for(let k=0;k<120;k++){
      t+=PD;
      while(tMed+PM<=t){ tMed+=PM; x+=v*PM/1000; window.__rez.manoInyectar(x,0.5,false,tMed); }
      manosFiltrar(t);
    }
    /* EL DESVIO SE CALIBRA CON LA MANO QUIETA Y NO EN MOVIMIENTO, y esto costo una medicion entera.
       Midiendolo al final del tramo en movimiento, `off` se lleva puesto EL ADELANTO DE LA PREDICCION
       ademas del desvio de la forma de la mano; despues, con la mano parada, ese adelanto ya no esta
       y el error se queda clavado en menos el adelanto — hasta 0,09 de pantalla, o sea que nunca
       entra en la tolerancia. El gancho devolvia "no paro nunca" en ritmos donde para en 33 ms.
       Con la mano quieta la prediccion vale cero por construccion, asi que lo que queda es solo la
       forma. */
    const xFin=x;
    let msPara=-1, sobre=0;
    for(let k=0;k<180;k++){                      // tres segundos de sobra
      t+=PD;
      while(tMed+PM<=t){ tMed+=PM; window.__rez.manoInyectar(xFin,0.5,false,tMed); }
      manosFiltrar(t);
      const e=MANO.x-(xFin+off);
      sobre=Math.max(sobre, e);                  // cuanto se paso de largo
      if(msPara<0 && Math.abs(e)<T) msPara=(k+1)*PD;
    }
    return { hz:H, vel:v, tolerancia:T, msHastaParar:+((msPara<0? 3000 : msPara)).toFixed(1),
             sobrepicoFrac:+sobre.toFixed(4) };
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
  puntos:()=>{ armarMesa(); escena.updateMatrixWorld(true);
    const v=new THREE.Vector3();
    return PICK.map(o=>{ o.updateMatrixWorld(true);
      v.setFromMatrixPosition(o.matrixWorld).project(camara);
      return [o.userData.tipo+':'+o.userData.i, +(v.x*0.5+0.5).toFixed(3)]; }); },
  /* ---- LAS MANOS DIBUJADAS ---- */
  manos3D:()=>(manosPintar(1/60), { articulaciones:artMalla.count, huesos:hueMalla.count,
                 palmas:palMalla.count, tope:[M_ART, M_HUE, M_PAL],
                 tuya:!!(MANO.on&&MANO.hay&&MANO.hayPts),
                 alcance:[J_IZQ,J_DER].map(j=>RIV[j]? +RIV[j].alc.toFixed(2) : 0),
                 cierre:[J_IZQ,J_DER].map(j=>RIV[j]? +RIV[j].cierre.toFixed(2) : 0) }),
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
  /* ===== LOS RIVALES, EN COORDENADAS DE PANTALLA =====
     Un rival "se ve bien" no es una opinion: es que su abanico entre entero en el cuadro y que la
     mano que agarra llegue a la carta que el bot eligio. Las dos cosas son numeros. */
  rivales:()=>{
    manosPintar(1/60); armarMesa();
    escena.updateMatrixWorld(true); camara.updateMatrixWorld(true);
    const v=new THREE.Vector3();
    const pr=(x,y,z)=>{ v.set(x,y,z).project(camara);
                        return [ +(v.x*0.5+0.5).toFixed(3), +(-v.y*0.5+0.5).toFixed(3) ]; };
    const out=[];
    for(const [,, j, lado] of RIVALES()){
      const R=RIV[j]; if(!R) continue;
      const q2=G.manos[j].length;
      /* la caja del abanico: la primera y la ultima carta, arriba y abajo */
      const caj={x:[9,-9], y:[9,-9]};
      for(const i of [0, q2-1]){
        const st=sitioRival(i,q2,lado,G.t);
        for(const dy of [-CARTA_H/2, CARTA_H/2]) for(const dx of [-CARTA_W/2, CARTA_W/2]){
          const w=pr(st.x+dx, st.y+dy*Math.cos(st.rx), st.z-dy*Math.sin(st.rx));
          caj.x[0]=Math.min(caj.x[0],w[0]); caj.x[1]=Math.max(caj.x[1],w[0]);
          caj.y[0]=Math.min(caj.y[0],w[1]); caj.y[1]=Math.max(caj.y[1],w[1]);
        }
      }
      /* la caja de la cabeza en pantalla: de ahi sale si choca con los rotulos y si hay que mirar
         arriba para verla entera */
      const M=(MP.jugando? cabMalla : monMalla), im=new THREE.Matrix4(),
            mp=new THREE.Vector3(), mq=new THREE.Quaternion(), me=new THREE.Vector3();
      let cab=null;
      if(M.count>0){
        M.getMatrixAt(RIVALES().findIndex(r=>r[2]===j), im); im.decompose(mp,mq,me);
        /* LA ESFERA TIENE RADIO 1 Y LA CAJA MEDIO LADO 0,5: la escala de una no significa lo mismo
           que la de la otra. Midiendo las dos igual, el monitor salia el DOBLE de ancho de lo que es y
           la prueba de solapamiento denunciaba un choque que no existe. */
        const semi=(M===cabMalla)? 1 : 0.5;
        const ar=pr(mp.x, mp.y+me.y*semi, mp.z), ab=pr(mp.x, mp.y-me.y*semi, mp.z);
        const iz=pr(mp.x-me.x*semi, mp.y, mp.z), de=pr(mp.x+me.x*semi, mp.y, mp.z);
        cab={ x:[+iz[0].toFixed(3), +de[0].toFixed(3)], y:[+ar[1].toFixed(3), +ab[1].toFixed(3)],
              entera: ar[1]>0.005 && ab[1]<0.995 };
      }
      out.push({ j, cabeza:cab, cabezaTipo:(MP.jugando?'humana':'monitor'),
                 abanico:{ x:[+caj.x[0].toFixed(3), +caj.x[1].toFixed(3)],
                              y:[+caj.y[0].toFixed(3), +caj.y[1].toFixed(3)],
                              entra: caj.x[0]>0.01 && caj.x[1]<0.99 },
                 garra:pr(R.garra.x,R.garra.y,R.garra.z), alc:+R.alc.toFixed(3),
                 cierre:+R.cierre.toFixed(3),
                 /* LA MANO DEL OTRO, PROYECTADA. Que lleguen 63 numeros no prueba que se vean: hay
                    que saber DONDE caen en la pantalla. _pr2 son los puntos que acaba de dibujar
                    rivalesPintar(), o sea exactamente los que se estan viendo. */
                 manoReal: (MP.jugando && MP.manoRival && (performance.now()-MP.manoRivalT)<600)?
                   (()=>{ const c={x:[9,-9],y:[9,-9]};
                     for(let k=0;k<21;k++){ const w=pr(_pr2[k].x,_pr2[k].y,_pr2[k].z);
                       c.x[0]=Math.min(c.x[0],w[0]); c.x[1]=Math.max(c.x[1],w[0]);
                       c.y[0]=Math.min(c.y[0],w[1]); c.y[1]=Math.max(c.y[1],w[1]); }
                     return { x:[+c.x[0].toFixed(3),+c.x[1].toFixed(3)],
                              y:[+c.y[0].toFixed(3),+c.y[1].toFixed(3)],
                              entra: c.x[0]>0 && c.x[1]<1 && c.y[0]>0 && c.y[1]<1 }; })() : null });
    }
    return out;
  },
  /* juega hasta que un rival este en la fase que se pide, y devuelve cuantas vueltas tardo: asi se
     puede fotografiar el instante exacto en que una mano esta agarrando una carta */
  hastaBot:(fase, tope)=>{
    let n=0;
    while(n++<(tope||3000)){
      if(G.turno!==J_VOS && G.bot.fase===fase && G.bot.j>=0) return { vueltas:n, bot:{...G.bot} };
      if(G.turno===J_VOS){
        if(G.colorPide){ elegirColor(botColor(J_VOS)); continue; }
        const i=botElegir(J_VOS);
        if(i<0){ if(!G.robo) robarJugador(); else { G.turno=siguiente(J_VOS); G.robo=false; } continue; }
        seleccionar(i); tirarSel(); if(G.colorPide) elegirColor(botColor(J_VOS));
        if(G.sel>=0) soltar();
        continue;
      }
      partidaTick(1/60);
    }
    return { vueltas:n, bot:{...G.bot}, fallo:true };
  },
  botVer:()=>({...G.bot}),
  /* ---- el multijugador, para poder comprobarlo con dos paginas y un broker de verdad ---- */
  mp:()=>({ on:MP.on, estado:MP.estado, sala:MP.sala, id:MP.id, reparte:MP.reparte,
            jugando:MP.jugando, rival:MP.rivalNom, rivalId:MP.rivalId, errores:MP.errores,
            chat:MP.chat.map(c=>(c.mio?'>':'<')+c.txt), nJug:N_JUG,
            ronda:MP.ronda, rondaRival:MP.rondaRival, huella:mpHuella(), huellaRival:MP.huellaRival }),
  mpSala:(cod)=>{ mpConectar(cod,''); return MP.sala; },
  mpDecir:(t)=>{ mpDecir(t); return MP.chat.length; },
  mpCortar:()=>{ mpCortar(); return MP.estado; },
  mpNueva:()=>mpRepartirYo(),
  /* la mano del rival: cuantos puntos llegaron y hace cuanto. Es la unica forma de comprobar que lo
     que se dibuja del otro lado es lo que el otro midio y no una pose inventada. */
  /* mete una mano de rival SIN red, para poder fotografiar lo que el otro ve. Entra por el mismo
     sitio que el mensaje de MQTT, o sea que dibuja exactamente lo mismo. */
  manoRivalPoner:(cx,cy,pinza)=>{
    const lm=window.__rez.manoFalsa(cx==null?0.5:cx, cy==null?0.5:cy, pinza==null?0.9:pinza);
    const p=new Array(63); for(let k=0;k<21;k++){ p[k*3]=+lm[k].x.toFixed(3);
      p[k*3+1]=+lm[k].y.toFixed(3); p[k*3+2]=+lm[k].z.toFixed(3); }
    MP.jugando=true; MP.manoRival=p; MP.manoRivalT=performance.now();
    return p.length;
  },
  manoRivalVer:()=>({ hay:!!MP.manoRival, n:MP.manoRival? MP.manoRival.length : 0,
                      edadMs:MP.manoRival? +(performance.now()-MP.manoRivalT).toFixed(0) : -1,
                      p0:MP.manoRival? MP.manoRival.slice(0,6) : null }),
  dosJug:(n)=>{ ponerJugadores(n); return N_JUG; },
  /* juega SOLO las jugadas propias: en multijugador un cliente no puede mover al rival */
  mpJugarMio:(tope)=>{
    let n=0, il=0, jug=0;
    while(G.fase==='juego' && n++<(tope||400)){
      if(G.turno!==J_VOS) break;
      if(G.colorPide){ elegirColor(botColor(J_VOS)); continue; }
      const i=botElegir(J_VOS);
      if(i<0){ if(!G.robo) robarJugador(); else { G.turno=siguiente(J_VOS); G.robo=false; mpPaso(); } continue; }
      const c=G.manos[J_VOS][i], deb=pega(c,G.color,G.valor);
      seleccionar(i); const a=G.pila.length; tirarSel();
      if(G.colorPide) elegirColor(botColor(J_VOS));
      const bajo=G.pila.length>a;
      if(bajo){ jug++; if(!deb) il++; }
      if(!bajo && G.sel>=0) soltar();
    }
    return { vueltas:n, jugadas:jug, ilegales:il, turno:G.turno, fase:G.fase,
             manos:G.manos.slice(0,2).map(m=>m.length), pila:G.pila.length, mazo:G.mazo.length,
             color:G.color, valor:G.valor };
  },
  pausa:(b)=>{ CONGELADO=!!b; return CONGELADO; },
  manoVer:()=>({ on:MANO.on, estado:MANO.estado, error:MANO.error, hay:MANO.hay,
                 x:+MANO.x.toFixed(3), y:+MANO.y.toFixed(3), pinza:MANO.pinza,
                 crudo:+MANO.crudo.toFixed(3), medidas:MANO.medidas, delegado:MANO.delegado,
                 espejo:MANO.espejo, usa:MANO.usa, ms:+MANO.msDet.toFixed(2) }),
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
  audio:()=>({ hay:!!AUD.ctx, on:AUD.on, estado:AUD.ctx? AUD.ctx.state : 'no',
               clips:Object.keys(AUDIO_B64).length,
               decodificados:Object.keys(BUF).length,
               falta:Object.keys(AUDIO_B64).filter(k=>!BUF[k]),
               duraciones:Object.keys(BUF).sort().map(k=>[k, +BUF[k].duration.toFixed(2)]),
               musica:MUS.nombre, sonando:!!MUS.fuente,
               ganMus:MUS.gan? +MUS.gan.gain.value.toFixed(4) : null }),
  son:(k)=>{ son(k); return true; },
  /* ===== LO UNICO QUE PRUEBA QUE SONO =====
     Se lee el buffer del analizador colgado del maestro durante una ventana y se devuelve el pico y
     el rms. Sin esto, "el sonido anda" significa "la llamada no tiro excepcion" — y eso ya dejo pasar
     una musica muda una vuelta entera en Campo_de_Tiro. */
  medirSon:(k, ms)=>new Promise(res=>{
    if(!AUD.an) return res(null);
    const N=AUD.an.fftSize, buf=new Float32Array(N);
    let pico=0, sum=0, n=0;
    const t0=performance.now();
    if(k) son(k);
    const paso=()=>{
      AUD.an.getFloatTimeDomainData(buf);
      for(let i=0;i<N;i++){ const v=Math.abs(buf[i]); if(v>pico) pico=v; sum+=buf[i]*buf[i]; }
      n+=N;
      if(performance.now()-t0 < (ms||700)) requestAnimationFrame(paso);
      else res({ k:k||'(fondo)', pico:+pico.toFixed(4), rms:+Math.sqrt(sum/n).toFixed(4) });
    };
    requestAnimationFrame(paso);
  }),
  musica:(k)=>{ musica(k); return MUS.nombre; },
  /* ---- costo ---- */
  /* ===== EL DESGLOSE DEL CUADRO =====
     `costo()` dice cuanto tarda un cuadro entero; esto dice EN QUE. Sin el desglose, "va lento con la
     mano" se arregla adivinando. Se corre cada parte por separado el mismo numero de veces y se toma
     la mediana, que no se deja arrastrar por el primer cuadro —que siempre paga compilaciones. */
  perfil:(n)=>{
    const v=n||200;
    const med=(f)=>{ const t=[]; for(let k=0;k<v;k++){ const a=performance.now(); f(); t.push(performance.now()-a); }
                     t.sort((x,y)=>x-y); return +t[Math.floor(v*0.5)].toFixed(4); };
    const r={ mesa:med(()=>armarMesa()),
              manos:med(()=>manosPintar(1/60)),
              aro:med(()=>pintarAro()),
              rayo:med(()=>pickEn(0.5,0.5)),
              dibujo:med(()=>render.render(escena,camara)),
              filtro:med(()=>manosFiltrar()) };
    r.hay=!!(MANO.on&&MANO.hay&&MANO.hayPts);
    r.total=+Object.keys(r).filter(k=>k!=='hay'&&k!=='rayo').reduce((a,k)=>a+r[k],0).toFixed(4);
    return r;
  },
  /* ===== EL COSTO DE MEDIR, QUE ES LO QUE SE PUEDE MEDIR DE VERDAD =====
     El tiempo de cuadro en este banco no sirve —render por software y `performance.now()` recortado—
     pero `detectForVideo()` SI se puede cronometrar, y es exactamente lo que el jugador reporta como
     "entra la mano y se laguea". Este gancho cambia el tamaño de entrada de la camara, tira n
     detecciones y devuelve el promedio medido. */
  entrada:(w,h)=>{
    const tr=MANO.vid && MANO.vid.srcObject && MANO.vid.srcObject.getVideoTracks()[0];
    if(!tr) return 'sin camara';
    MANO.msDet=0; MANO.medidas=0;
    return tr.applyConstraints({ width:{ideal:w}, height:{ideal:h} })
             .then(()=>({ pedido:[w,h], real:[tr.getSettings().width, tr.getSettings().height] }))
             .catch(e=>'no: '+e.name);
  },
  /* fuerza un costo de medicion para poder ver la regla del presupuesto sin un telefono lento a mano */
  msFalso:(ms, hay)=>{ MANO.msDet=ms; if(hay!=null) MANO.hay=!!hay;
                       /* se deja asentar el suavizado: el ritmo se mueve de a poco a proposito, asi
                          que una sola pasada no dice a donde va a parar */
                       for(let k=0;k<80;k++) manoRitmo();
                       return +MANO.hz.toFixed(1); },
  /* la calidad: se cambia y se mide, que es la unica forma de saber si el ajuste ajusta algo */
  calidad:(k)=>{ if(k) aplicarCalidad(k);
    const b=render.getDrawingBufferSize(new THREE.Vector2());
    armarMesa(); manosPintar(1/60);
    /* EL CUADRO ENTERO Y NO LA ULTIMA PASADA. three.js pone `info` a cero al empezar cada render(), y
       la pasada de sombra es OTRA pasada: leyendo sin apagar el reset automatico, las llamadas de la
       sombra no aparecen y apagar las sombras parece no cambiar nada. Es la misma trampa que ya habia
       costado una medicion en Campo_de_Tiro. */
    const inf=render.info; inf.autoReset=false; inf.reset();
    render.render(escena,camara);
    const r={ cal:CAL, lienzo:[lienzo.width, lienzo.height], buffer:[b.x,b.y],
              pixeles:b.x*b.y, sombras:render.shadowMap.enabled,
              mapa:luz.shadow.mapSize.x, niebla:!!escena.fog,
              llamadas:inf.render.calls, tris:inf.render.triangles };
    inf.autoReset=true;
    return r; },
  /* EL CONTROL DE 60 CUADROS: se le inyecta un tiempo de cuadro y se mira a donde converge.
     Es la unica forma de probarlo en un banco donde el tiempo real no sirve. */
  res:()=>({ i:resI, esc:resDin, sombra:resSombra, cambios:_resCambios, subidas:_resSubidas,
             objMs:+RES_OBJ.toFixed(2) }),
  resProbar:(ms, ventanas)=>{
    /* se alimenta el lazo con ventanas de 24 cuadros del tiempo pedido. El enfriamiento es de 1,5 s
       de reloj de juego, asi que hay que pasarle dt de verdad. */
    const dt=ms/1000;
    for(let v=0; v<(ventanas||60); v++) for(let k=0;k<24;k++) resTick(dt);
    return { pedidoMs:ms, i:resI, esc:+resDin.toFixed(2), sombra:resSombra, cambios:_resCambios };
  },
  resCero:()=>{ aplicarCalidad(CAL); return { i:resI, esc:resDin, sombra:resSombra }; },
  /* la vista: se le pide un giro y una alzada y se la deja asentar, como si el aparato se hubiera
     movido. Es el mismo camino que usa el sensor. */
  vista:(giro, alza)=>{ for(let k=0;k<400;k++) camaraGiro(giro||0, alza||0, 1/60);
                        return { giro:+camGiro.toFixed(3), alza:+camAlza.toFixed(3) }; },
  orVer:()=>({ on:OR.on, hay:OR.hay, permiso:OR.permiso, ev:OR.ev,
               giro:+OR.giro.toFixed(3), alza:+OR.alza.toFixed(3) }),
  /* se inyecta un evento de orientacion crudo, que es lo que manda el aparato */
  orInyectar:(alpha, beta, n)=>{
    OR.on=true;
    for(let k=0;k<(n||30);k++){ orLeer({alpha, beta}); orTick(1/60); }
    return { giro:+OR.giro.toFixed(3), alza:+OR.alza.toFixed(3),
             camGiro:+orGiro().toFixed(3), camAlza:+orAlza().toFixed(3) };
  },
  orCero:()=>{ OR.a0=null; OR.b0=null; OR.hay=false; OR.giro=0; OR.alza=0;
               OR.giroObj=0; OR.alzaObj=0; return true; },
  /* ===== EL LAZO CERRADO, QUE ES LA UNICA PRUEBA QUE VALE =====
     Alimentar el control con un tiempo FIJO solo demuestra que se mueve para el lado correcto. Lo
     que hay que demostrar es que SE QUEDA QUIETO, y para eso el tiempo tiene que salir de lo que el
     control hizo: el relleno de pixeles va con el cuadrado de la escala, la sombra suma su pasada, y
     encima hay un costo fijo que el control no puede tocar (la deteccion de manos, el JS del juego).
     Se cuenta cuantas veces cambia YA ASENTADO, que es lo que el jugador veria como parpadeo. */
  resLazo:(pico, fijo, ruido, ventanas)=>{
    const P=pico==null? 26 : pico, F=fijo==null? 6 : fijo, R=ruido==null? 2 : ruido;
    const N=ventanas||120;
    let S=98765; const az=()=>{ S=(S*1103515245+12345)&0x7fffffff; return (S/0x7fffffff*2-1)*R; };
    const c0=_resCambios; let cAsent=0, iAsent=[];
    for(let v=0; v<N; v++){
      const e=resDin, som=resSombra && CALS[CAL].sombras;
      const ms=F + P*e*e*(som? 1.55 : 1) + az();
      const antes=_resCambios;
      for(let k=0;k<24;k++) resTick(ms/1000);
      if(v>N*0.5){ cAsent += (_resCambios-antes); iAsent.push(resI+(resSombra?0:0.5)); }
    }
    const fin=F + P*resDin*resDin*((resSombra&&CALS[CAL].sombras)? 1.55:1);
    return { pico:P, fijo:F, ventanas:N, cambios:_resCambios-c0, cambiosAsentado:cAsent,
             i:resI, esc:+resDin.toFixed(2), sombra:resSombra,
             msFinal:+fin.toFixed(2), objMs:+RES_OBJ.toFixed(2),
             llega60: fin<=RES_OBJ*1.25 };
  },
  /* ===== EL RITMO QUE SE CONSIGUE DE VERDAD, QUE NO ES EL QUE SE PIDE =====
     Se simulan cuadros de camara a un intervalo fijo y se cuenta cuantos pasan la reja. Con la reja
     dura, un periodo pedido apenas por encima del intervalo de camara deja pasar la MITAD.
     `dura:true` restaura la regla vieja para poder medir el antes y el despues en la misma corrida. */
  reja:(fpsCam, hzPedido, seg, dura)=>{
    const dtC=1000/(fpsCam||30), n=Math.round((seg||3)*(fpsCam||30));
    _ultMed=0; _ultCuadro=0; _dtCuadro=dtC;
    /* se pide el ritmo por el mismo camino que el juego —msDet y manoRitmo— para que el redondeo al
       cuadro de camara entre en la prueba; poniendo MANO.periodo a mano se probaria otra cosa */
    MANO.hay=true; MANO.msDet=(1000*MANO_CARGA)/(hzPedido||30);
    for(let k=0;k<200;k++) manoRitmo();
    if(dura) MANO.periodo=1000/(hzPedido||30);
    let t=performance.now(), pasan=0; const huecos=[]; let ult=0;
    for(let k=0;k<n;k++){
      t+=dtC;
      let ok;
      if(dura){ ok = (t-_ultMed >= MANO.periodo); if(ok) _ultMed=t; }
      else ok = manoTocaMedir(t);
      if(ok){ pasan++; if(ult) huecos.push(+(t-ult).toFixed(1)); ult=t; }
    }
    const hz=pasan/((n*dtC)/1000);
    const m=huecos.reduce((a,b)=>a+b,0)/Math.max(1,huecos.length);
    const dv=Math.sqrt(huecos.reduce((a,b)=>a+(b-m)*(b-m),0)/Math.max(1,huecos.length));
    return { fpsCam:fpsCam||30, pedido:hzPedido||30, logrado:+hz.toFixed(1),
             huecoMedio:+m.toFixed(1), huecoDesvio:+dv.toFixed(1),
             parejo:+(dv/Math.max(1e-9,m)).toFixed(3) };
  },
  det:()=>({ ms:+MANO.msDet.toFixed(2), medidas:MANO.medidas, hay:MANO.hay,
             fpsCam:+(1000/_dtCuadro).toFixed(1), bajo:MANO.bajo||null,
             hzUsa:+MANO.hz.toFixed(1), periodo:+MANO.periodo.toFixed(1),
             ent:[MANO.vid&&MANO.vid.videoWidth, MANO.vid&&MANO.vid.videoHeight] }),
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
