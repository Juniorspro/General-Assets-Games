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
  /* ---- las zonas: lo que se ve y lo que se pellizca son lo mismo ---- */
  zonas:()=>{ pintarMesa(); return ZONAS.map(z=>({t:z.tipo,i:z.i,activo:z.activo,
                x:+z.x.toFixed(0),y:+z.y.toFixed(0),w:+z.w.toFixed(0),h:+z.h.toFixed(0)})); },
  zonaEn:(x,y)=>{ pintarMesa(); const z=zonaEn(x,y); return z? {t:z.tipo,i:z.i,activo:z.activo} : null; },
  /* pellizca en el centro de una zona, por el mismo camino que la camara */
  pellizcarZona:(tipo, i)=>{
    pintarMesa();
    const z=ZONAS.filter(q=>q.tipo===tipo && (i==null||q.i===i)).pop();
    if(!z) return 'no hay '+tipo;
    return { hizo:activar(z.x+z.w/2, z.y+z.h/2), zona:{t:z.tipo,i:z.i,activo:z.activo} };
  },
  /* ---- la mano de mentira: entra por el mismo camino que la de verdad ---- */
  manoFalsa:(cx, cy, pinza)=>{
    const lm=[];
    for(let k=0;k<21;k++) lm.push({x:cx, y:cy, z:0});
    lm[0]={x:cx, y:cy+0.11, z:0};                    // muñeca
    lm[9]={x:cx, y:cy-0.02, z:0};                    // nudillo del medio: palma = 0,13
    const d=pinza? 0.010 : 0.085;                    // pulgar-indice
    lm[4]={x:cx-d/2, y:cy, z:0};
    lm[8]={x:cx+d/2, y:cy, z:0};
    return lm;
  },
  manoInyectar:(cx, cy, pinza, t)=>{
    MANO.on=true; MANO.espejo=false;
    manosInyectar(window.__rez.manoFalsa(cx,cy,pinza), t==null? performance.now() : t);
    return { x:+MANO.x.toFixed(3), y:+MANO.y.toFixed(3), crudo:+MANO.crudo.toFixed(3),
             pinza:MANO.pinza, nueva:MANO.pinzaNueva };
  },
  /* EL RETARDO EN REGIMEN: se mueve la mano de mentira a velocidad constante y se mide cuanto atras
     va el aro cuando ya se estabilizo. Es el numero que decide si apuntar a una carta se siente
     pegado o pastoso. Se devuelve en fraccion de pantalla y en milisegundos. */
  manoRampa:(vel, cuadros)=>{
    F.x.ini=false; F.y.ini=false;
    const v=vel==null? 0.5 : vel;          // fracciones de pantalla por segundo
    const dt=16, n=cuadros||90;
    let t=performance.now(), x=0.2;
    for(let k=0;k<n;k++){ t+=dt; x+=v*dt/1000; window.__rez.manoInyectar(x,0.5,false,t); }
    const err=Math.abs(x-MANO.x);
    return { vel:v, cuadros:n, real:+x.toFixed(4), aro:+MANO.x.toFixed(4),
             retardoFrac:+err.toFixed(4), retardoMs:+(err/v*1000).toFixed(1) };
  },
  /* EL TEMBLOR: mano quieta con ruido, y cuanto de ese ruido llega al aro. Es la otra mitad de la
     pelea: un filtro que no atenua deja el aro vibrando encima de las cartas. */
  manoTemblor:(ruido, cuadros)=>{
    F.x.ini=false; F.y.ini=false;
    const r=ruido==null? 0.006 : ruido, n=cuadros||240;
    let t=performance.now(), S=12345;
    const az=()=>{ S=(S*1103515245+12345)&0x7fffffff; return S/0x7fffffff*2-1; };
    let sEnt=0, sSal=0, m1=0, m2=0;
    for(let k=0;k<n;k++){
      t+=16; const x=0.5+az()*r;
      window.__rez.manoInyectar(x,0.5,false,t);
      if(k>40){ sEnt+=(x-0.5)*(x-0.5); sSal+=(MANO.x-0.5)*(MANO.x-0.5); m1++; }
      m2++;
    }
    const de=Math.sqrt(sEnt/m1), ds=Math.sqrt(sSal/m1);
    return { ruido:r, cuadros:n, entra:+de.toFixed(5), sale:+ds.toFixed(5),
             atenua:+(de/Math.max(1e-9,ds)).toFixed(2) };
  },
  manoVer:()=>({ on:MANO.on, estado:MANO.estado, error:MANO.error, hay:MANO.hay,
                 x:+MANO.x.toFixed(3), y:+MANO.y.toFixed(3), pinza:MANO.pinza,
                 crudo:+MANO.crudo.toFixed(3), medidas:MANO.medidas, delegado:MANO.delegado,
                 espejo:MANO.espejo, ms:+MANO.msDet.toFixed(2) }),
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
    let n=0, colores=0, ilegales=0;
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
      window.__rez.pellizcarZona('carta',i);
    }
    return { vueltas:n, fase:G.fase, gana:G.gana, colores, ilegales, manos:G.manos.map(x=>x.length) };
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
    for(let k=0;k<v;k++){ const a=performance.now(); pintarMesa(); t.push(performance.now()-a); }
    t.sort((x,y)=>x-y);
    return { cuadros:v, media:+(t.reduce((s,x)=>s+x,0)/v).toFixed(3),
             p50:+t[Math.floor(v*0.5)].toFixed(3), p90:+t[Math.floor(v*0.9)].toFixed(3),
             max:+t[v-1].toFixed(3), zonas:ZONAS.length };
  },
  medidas:()=>({ dis:[DIS_W,DIS_H], lienzo:[lienzo.width,lienzo.height], esc:+ESC.toFixed(3),
                 LH:+LH.toFixed(0), marco:[marco.clientWidth, marco.clientHeight] })
};
</script>
</body>
</html>
