#!/usr/bin/env python3
"""
ECO, la vuelta de la puerta: una puerta de verdad que abren las llaves, nadie te guia, una trompeta
que llama a la cosa, y una salida con cinematica y un prado.

Idempotente: correrlo dos veces da el mismo archivo.

    python3 herramientas/eco/parche_puerta.py
"""
import base64, io, os, sys

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
JUEGO = os.path.join(RAIZ, 'juegos-pc', 'Eco.html')
CINE = os.path.join(RAIZ, 'herramientas', 'eco', 'cine', 'salida_web.mp4')
CINE_WEBM = os.path.join(RAIZ, 'herramientas', 'eco', 'cine', 'salida_web.webm')


def cambiar(s, a, b, nombre):
    """Reemplaza UNA vez y comprueba.

    El guardia es `b in s` y nada mas: cuando el texto nuevo CONTIENE al viejo —que es el caso
    normal, porque casi siempre se agrega alrededor de lo que ya estaba— un guardia de la forma
    `b in s and a not in s` no salta nunca y el parche se aplica dos veces. Ya costo dos defectos
    en Maicol.
    """
    if b in s:
        print('  (ya estaba)', nombre)
        return s
    assert s.count(a) == 1, 'no encontrado o repetido: %s (%d)' % (nombre, s.count(a))
    print('  ok', nombre)
    return s.replace(a, b)


# =========================================================================================
# 1. LA PUERTA Y LA TROMPETA
# =========================================================================================
PUERTA = r'''
/* ===================== LA PUERTA DE LA SALIDA =====================
   Antes la salida era un FARO: un punto del mapa que latia con el eco y, al llegar con los cuatro
   sellos, se ganaba. Funcionaba como regla y no existia como cosa — no habia nada que abrir, asi que
   las cuatro llaves no abrian nada: solo contaban.

   Ahora hay una puerta y las cuatro llaves son sus cuatro cerraduras. Va contra la pared que queda
   ENFRENTE de la abertura de la celda de salida: al meterse en el fondo del laberinto, lo que hay
   adelante es la puerta. Si la celda tuviera mas de una abertura se elige la pared mas opuesta al
   promedio de las aberturas, asi que el criterio no depende de que la celda sea un sin salida.

   EL MARCO VA CON EL MATERIAL DEL SONIDO —es piedra, y tiene que aparecer y desaparecer con las
   ondas como todo lo demas— pero LAS CERRADURAS NO: son lo unico que hay que poder mirar estando
   quieto, porque son el marcador de cuantas llaves llevas. Es el mismo reparto que ya usan las
   hojas y las llaves. */
const PUERTA = { g:null, hojaI:null, hojaD:null, cerrs:[], mats:[], abierta:0, abriendo:false,
                 x:0, z:0, nx:0, nz:0, ang:0 };
(function armarPuerta(){
  const i=salida[0], j=salida[1], c=MAPA[j][i];
  const LADOS=[['n',0,-1],['e',1,0],['s',0,1],['o',-1,0]];
  /* el promedio de las aberturas: la puerta va en la pared mas opuesta a por donde se entra */
  let ax=0, az=0, n=0;
  for(const [l,dx,dz] of LADOS) if(!c[l]){ ax+=dx; az+=dz; n++; }
  if(n){ ax/=n; az/=n; }
  let mejor=null, mejorP=-9;
  for(const [l,dx,dz] of LADOS){
    if(!c[l]) continue;                       // sin pared no hay donde apoyarla
    const p = -(dx*ax + dz*az);               // cuanto se opone a la entrada
    if(p>mejorP){ mejorP=p; mejor=[l,dx,dz]; }
  }
  if(!mejor) mejor=['n',0,-1];
  const [lado,dx,dz]=mejor;
  const cx=XC(i), cz=ZC(j);
  /* 0,30 adentro de la cara de la pared: al ras, el marco y la pared se pelean por el mismo pixel y
     aparece el rayado del z-fighting justo en lo unico que hay que mirar */
  const px=cx+dx*(CEL/2-0.30), pz=cz+dz*(CEL/2-0.30);
  /* EL GRUPO MIRA HACIA ADENTRO DE LA CELDA, no hacia la pared. Con `atan2(dx,dz)` el +Z local
     apunta al muro, asi que las cuatro cerraduras —puestas a z=+0,14— y los dos escalones —a +0,72—
     quedaban ENTERRADOS en la pared. En la captura la puerta se veia entera y lisa: no faltaban las
     cerraduras, estaban del otro lado. */
  const ang=Math.atan2(-dx,-dz);
  /* la normal apunta HACIA ADENTRO de la celda, que es de donde se llega */
  PUERTA.x=px; PUERTA.z=pz; PUERTA.nx=-dx; PUERTA.nz=-dz; PUERTA.ang=ang;

  const g=new THREE.Group(); g.position.set(px,0,pz); g.rotation.y=ang;
  const ANCHO=2.70, ALTOP=3.30, GRUE=0.34;
  const piezas=[];
  const caja=(w,h,d,x,y,z)=>{ const q=new THREE.BoxGeometry(w,h,d); q.translate(x,y,z); piezas.push(q); };
  caja(0.42, ALTOP+0.5, GRUE, -ANCHO/2-0.21, (ALTOP+0.5)/2, 0);
  caja(0.42, ALTOP+0.5, GRUE,  ANCHO/2+0.21, (ALTOP+0.5)/2, 0);
  caja(ANCHO+0.84, 0.50, GRUE, 0, ALTOP+0.25, 0);
  /* dos escalones al pie: sin ellos la puerta arranca del piso liso y se lee a calcomania */
  caja(ANCHO+1.5, 0.12, 1.10, 0, 0.06, 0.72);
  caja(ANCHO+1.1, 0.12, 0.70, 0, 0.18, 0.55);
  const gm=mergeGeometries(piezas,false);
  for(const q of piezas) q.dispose();
  const marco=new THREE.Mesh(gm, matMundo); marco.frustumCulled=false; g.add(marco);

  /* las dos hojas: giran sobre su bisagra, no se corren */
  const hoja=(s)=>{
    const piv=new THREE.Group(); piv.position.set(s*ANCHO/2, 0, 0);
    const q=new THREE.BoxGeometry(ANCHO/2, ALTOP, 0.22);
    q.translate(-s*ANCHO/4, ALTOP/2, 0);
    /* los refuerzos en diagonal: una hoja lisa de tres metros no se lee a puerta, se lee a pared */
    const tr=[q];
    for(let k=0;k<3;k++){
      const b=new THREE.BoxGeometry(ANCHO/2-0.12, 0.16, 0.30);
      b.translate(-s*ANCHO/4, 0.45+k*1.15, 0.02); tr.push(b);
    }
    const gg=mergeGeometries(tr,false);
    for(const t of tr) t.dispose();
    const m=new THREE.Mesh(gg, matMundo); m.frustumCulled=false;
    piv.add(m); g.add(piv); return piv;
  };
  PUERTA.hojaI=hoja(-1); PUERTA.hojaD=hoja(1);

  /* UN MATERIAL POR CERRADURA, por lo mismo que las llaves: con uno compartido el brillo se calcula
     cuatro veces y se escribe en el mismo sitio, asi que manda la ultima del bucle. */
  for(let k=0;k<4;k++){
    const mt=new THREE.MeshBasicMaterial({color:0x000000});
    PUERTA.mats.push(mt);
    const gr=new THREE.Group();
    gr.add(new THREE.Mesh(new THREE.TorusGeometry(0.16,0.045,8,18), mt));
    /* el ojo de la cerradura: una ranura en cruz, que es lo que dice "aca entra una llave" */
    gr.add(new THREE.Mesh(new THREE.BoxGeometry(0.05,0.17,0.05), mt));
    const r2=new THREE.Mesh(new THREE.BoxGeometry(0.15,0.05,0.05), mt);
    r2.position.y=-0.02; gr.add(r2);
    gr.position.set((k%2? 0.62 : -0.62), 1.30+Math.floor(k/2)*0.62, 0.14);
    g.add(gr); PUERTA.cerrs.push(gr);
  }
  escena.add(g); PUERTA.g=g;
})();
/* el faro y la puerta pasan a ser el mismo punto: si estuvieran en dos sitios, el latido llamaria a
   un lado y la puerta estaria en el otro */
salidaMundo.set(PUERTA.x, 1.5, PUERTA.z);
matMundo.uniforms.uSalida.value.copy(salidaMundo);

/* ===================== LA TROMPETA =====================
   Pedido: cerca de la puerta suena una trompeta que alerta a la cosa, pero NO la hace mas rapida, y
   solo en una zona chica alrededor de la puerta.

   Que sea alerta y no velocidad es lo que la hace justa: la cosa ya corre cuando te tiene cerca, y
   corriendo se le gana siempre (5,50 contra 3,55). Lo que cambia es que el ultimo tramo del juego
   deja de ser un pasillo tranquilo — la puerta te delata sola, sin que hagas un ruido.
   Y ENCIENDE, como cualquier otro ruido: esa es la unica regla que tiene este juego y no puede tener
   una excepcion. De paso es lo unico que te muestra la puerta entera de una. */
const TROMPETA = { r:8.5, cada:7.0, t:0, dentro:false, veces:0 };
function trompetaTick(dt){
  if(!jugando || ganado || enSala) return;
  const dentro = Math.hypot(jug.x-PUERTA.x, jug.z-PUERTA.z) < TROMPETA.r;
  /* al ENTRAR suena en el acto: esperando al reloj se podria cruzar la zona sin que suene nunca */
  if(dentro && !TROMPETA.dentro) TROMPETA.t=0;
  TROMPETA.dentro=dentro;
  if(!dentro) return;
  TROMPETA.t-=dt;
  if(TROMPETA.t>0) return;
  TROMPETA.t=TROMPETA.cada; TROMPETA.veces++;
  /* sale DE LA PUERTA y no de vos: es la puerta la que grita. Y la cosa va hacia la puerta, que es
     peor para el jugador, porque ahi tiene que llegar igual. */
  ruido('trompeta', PUERTA.x, 1.6, PUERTA.z, 1.0, 46, true);
}
/* el brillo de las cerraduras y la apertura de las hojas */
function puertaTick(dt, eco){
  const ns=nSellos();
  for(let k=0;k<4;k++){
    const tiene = k<ns;
    /* la cerradura vacia se ve poco y solo con eco; la que ya tiene su llave tiene luz propia, que
       es lo que la vuelve un marcador y no un adorno */
    const piso = tiene? 0.075 : 0.012;
    const kk = piso + (tiene? 0.85 : 0.22)*eco;
    PUERTA.mats[k].color.setRGB(kk*0.92, kk*0.99, kk);
  }
  if(PUERTA.abriendo && PUERTA.abierta<1){
    PUERTA.abierta=Math.min(1, PUERTA.abierta+dt/2.6);
    /* la curva suaviza el final y no el principio: una puerta de piedra arranca de golpe y se frena
       al final, no al reves */
    const f=1-Math.pow(1-PUERTA.abierta, 2.2);
    PUERTA.hojaI.rotation.y =  f*1.42;
    PUERTA.hojaD.rotation.y = -f*1.42;
  }
}
'''

# =========================================================================================
# 2. EL FINAL
# =========================================================================================
FINAL = r'''
/* =========================================================================================
   EL FINAL: BLANCO, LA CINEMATICA, Y DESPERTAR EN EL PASTO

   Antes ganar era un cartel. Ahora son cuatro tiempos:
     1. la pantalla se va a BLANCO (1,15 s). Blanco y no negro: se sale de un lugar sin luz, asi que
        lo que ciega es la luz.
     2. la cinematica generada: la boca de la cueva, el fogonazo y la caida sobre un mundo verde.
     3. negro corto.
     4. despertas en primera persona tirado en el pasto y te levantas. Los ojos se ABREN —dos
        franjas negras que se separan— porque un fundido normal se lee a transicion y esto tiene que
        leerse a "abriste los ojos".

   Y ES OTRA ESCENA, no el laberinto con luces puestas. El juego entero se dibuja con el shader del
   sonido, donde todo lo que no toco una onda es negro: un prado con ese material seria un prado
   negro. El final tiene sus propios materiales, su propia luz y su propia camara.
   ========================================================================================= */
const FIN_UT={value:0};
/* LA VISTA EN REPOSO MIRA UN POCO ABAJO. Con el ojo a 1,62 m y la vista al ras del horizonte, el
   pasto —que llega a la rodilla— queda casi todo por debajo del borde de abajo del cuadro: medido,
   las cuarenta y dos mil briznas aportaban el 3% de la pantalla mirando derecho y llenan la mitad
   inclinando treinta grados. Alguien que se acaba de levantar en un prado mira el prado. */
const FIN = { fase:'no', t:0, escena:null, cam:null, mira:{x:0,y:-0.22}, listo:false, libre:false };
const FIN_CINE = 5.05;

function finArrancar(){
  if(FIN.fase!=='no') return;
  FIN.fase='blanco'; FIN.t=0;
  /* SE APAGA EL JUEGO ENTERO, y esto salio de una captura: la hoja de la salida se abre sola al
     revelarse, y el fogonazo de la puerta la revela — asi que el final entero se veia POR DETRAS de
     un papel abierto. Y con el papel iban el joystick, el reloj y los botones, que en un prado no
     hacen nada. Todo eso cuelga de una clase: `body.fin`. */
  try{ cerrarNota(); }catch(e){}
  document.body.classList.add('fin');
  document.getElementById('finBl').classList.add('ver');
  try{ ambiente(null); }catch(e){}
}
function finMirar(dx,dy){
  FIN.mira.x -= dx*0.0034;
  FIN.mira.y = Math.max(-0.85, Math.min(1.15, FIN.mira.y - dy*0.0030));
}
function finConstruir(){
  if(FIN.escena) return;
  const es=new THREE.Scene();
  /* EL CIELO ES UN DOMO CON DEGRADE PROPIO. Un `background` de color plano no tiene horizonte, y sin
     horizonte un prado es una alfombra verde debajo de una pared celeste. */
  const cielo=new THREE.Mesh(new THREE.SphereGeometry(400,32,20),
    new THREE.ShaderMaterial({ side:THREE.BackSide, depthWrite:false, fog:false,
      uniforms:{ uSol:{value:new THREE.Vector3(0.42,0.30,-0.85).normalize()} },
      vertexShader:'varying vec3 vD; void main(){ vD=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader:[
        'varying vec3 vD; uniform vec3 uSol;',
        'void main(){',
        '  float h=clamp(vD.y*0.5+0.5, 0.0, 1.0);',
        /* tres franjas y no dos: cenit, cielo medio y horizonte palido. Con dos el degrade sale
           recto y se lee a fondo de aplicacion. */
        '  vec3 c=mix(vec3(0.72,0.82,0.90), vec3(0.29,0.52,0.82), smoothstep(0.50,0.94,h));',
        '  c=mix(vec3(0.90,0.90,0.86), c, smoothstep(0.44,0.60,h));',
        /* el sol y su halo: sin halo el disco se recorta como una calcomania pegada al cielo */
        '  float s=max(dot(normalize(vD), uSol), 0.0);',
        '  c += vec3(1.0,0.94,0.80)*pow(s, 900.0)*1.4;',
        '  c += vec3(1.0,0.92,0.74)*pow(s, 12.0)*0.30;',
        '  gl_FragColor=vec4(c,1.0);',
        '}'].join('\n') }));
  cielo.frustumCulled=false; es.add(cielo);

  /* LA NIEBLA EMPEZABA A 55 METROS Y SE COMIA EL PRADO ENTERO. Con la camara a 1,62 m mirando al
     horizonte, casi todo el suelo que entra en el cuadro esta MAS LEJOS de 55 m: en la captura el
     prado salia blanco azulado de punta a punta y las briznas verdes flotaban sobre nada. La niebla
     de un dia claro empieza donde el ojo deja de distinguir, no a media cuadra. */
  es.fog=new THREE.Fog(0xc9d6dc, 300, 1800);
  const sol=new THREE.DirectionalLight(0xfff0cf, 1.95);
  sol.position.set(0.42,0.30,-0.85).multiplyScalar(100); es.add(sol);
  es.add(new THREE.HemisphereLight(0xc7dcf0, 0x5b7a3a, 0.72));

  let sem=20260828;
  const az=()=>{ sem=(sem*1103515245+12345)&0x7fffffff; return sem/0x7fffffff; };

  /* EL SUELO ES UN PLANO TESELADO Y NO UN CIRCULO. Un CircleGeometry son cincuenta y seis cunas que
     salen del centro, y con Lambert la luz y la niebla se interpolan POR VERTICE: en la captura el
     prado salia con rayas verticales en abanico, que son literalmente los triangulos. Un plano de
     80x80 reparte los vertices parejo y las rayas dejan de existir.
     Y lleva color por vertice: un verde plano de horizonte a horizonte se lee a fieltro. */
  const sg=new THREE.PlaneGeometry(1900, 1900, 80, 80);
  const sp=sg.attributes.position, sc=new Float32Array(sp.count*3);
  for(let k=0;k<sp.count;k++){
    const x=sp.getX(k), y=sp.getY(k);
    /* EL COLOR POR VERTICE ES UNA VARIACION, NO EL COLOR. Con el verde entero aca Y la textura
       verde en el mapa, los dos se multiplican: medido, 0,33 x 0,35 deja el prado en 0,12 y en la
       captura el suelo salia casi negro al lado del pasto. El color base vive en la textura; esto
       solo lo mancha un poco. */
    const v=0.94 + 0.10*Math.sin(x*0.148+y*0.093) + 0.07*Math.sin(x*0.031-y*0.045);
    sc[k*3]=v; sc[k*3+1]=v*1.02; sc[k*3+2]=v*0.94;
  }
  sg.setAttribute('color', new THREE.BufferAttribute(sc,3));
  /* Y CON TEXTURA. Treinta y cuatro mil briznas sobre un radio de veintiseis metros son unas
     dieciseis por metro cuadrado: alcanza para que el suelo se vea peludo de cerca, y no alcanza ni
     de lejos para tapar el suelo. Mirando casi al ras —que es como se mira un prado— lo que ocupa la
     mitad de abajo de la pantalla es SUELO, y un verde plano ahi se lee a fieltro. La textura hace
     ese trabajo y cuesta un lienzo de 256. */
  const tl=document.createElement('canvas'); tl.width=tl.height=256;
  const tx=tl.getContext('2d');
  tx.fillStyle='#537a33'; tx.fillRect(0,0,256,256);
  /* LAS MANCHAS SON GRANDES A PROPOSITO. La primera version pintaba briznas de 1 a 3 pixeles con la
     textura repetida 380 veces: a cinco centimetros por pixel, el mipmap se lo come todo pasados los
     dos metros y el prado vuelve a ser una sabana lisa. Medido en la captura: suelo perfectamente
     plano. Lo que se ve a diez y a cuarenta metros son MANCHONES de medio metro, no briznas. */
  for(let k=0;k<900;k++){
    const v=Math.floor(az()*44)-18;
    tx.fillStyle='rgba('+(83+v)+','+(122+v)+','+(51+v|0)+',0.55)';
    const x=az()*256, y=az()*256, r=6+az()*26;
    tx.beginPath(); tx.ellipse(x,y,r,r*(0.5+az()*0.8),az()*3.14,0,6.283); tx.fill();
  }
  for(let k=0;k<2600;k++){
    const v=Math.floor(az()*60)-26;
    tx.fillStyle='rgb('+(83+v)+','+(122+v)+','+(51+v|0)+')';
    const x=az()*256, y=az()*256, w=2+az()*4, h=5+az()*11;
    tx.save(); tx.translate(x,y); tx.rotate((az()-0.5)*1.4); tx.fillRect(0,0,w,h); tx.restore();
  }
  const ttex=new THREE.CanvasTexture(tl);
  ttex.wrapS=ttex.wrapT=THREE.RepeatWrapping; ttex.repeat.set(118,118);
  ttex.colorSpace=THREE.SRGBColorSpace;
  /* la anisotropia es LA diferencia en un plano visto casi de canto: sin ella, a diez metros la
     textura se vuelve un puré gris y el prado vuelve a ser una sabana lisa */
  try{ ttex.anisotropy=render.capabilities.getMaxAnisotropy(); }catch(e){}
  const sue=new THREE.Mesh(sg, new THREE.MeshLambertMaterial({vertexColors:true, map:ttex}));
  sue.rotation.x=-Math.PI/2; es.add(sue);

  /* las lomas del fondo: sin nada en el horizonte, el prado termina en una linea recta */
  const lomas=[];
  for(let k=0;k<26;k++){
    const a=az()*6.283, d=150+az()*130, r=34+az()*60, h=10+az()*26;
    const q=new THREE.SphereGeometry(r, 10, 6);
    q.scale(1, h/r, 1);
    q.translate(Math.cos(a)*d, -h*0.30, Math.sin(a)*d);
    lomas.push(q);
  }
  const lg=mergeGeometries(lomas,false);
  for(const q of lomas) q.dispose();
  es.add(new THREE.Mesh(lg, new THREE.MeshLambertMaterial({color:0x4a6f38})));

  /* EL PASTO VA INSTANCIADO: quince mil briznas sueltas serian quince mil llamadas de dibujo; en un
     InstancedMesh son UNA, haya las que haya. La brizna son seis triangulos y ni uno mas: lo que la
     hace leer a pasto es la CANTIDAD y el movimiento, no el detalle de algo que mide tres pixeles. */
  const NB=42000;
  const bg=new THREE.BufferGeometry();
  const pos=[], nor=[], idx=[];
  const ANCHOB=0.075, ALTOB=1.0, TRAMOS=3;
  /* LA BRIZNA VA DE OSCURA ABAJO A CLARA ARRIBA, y no es un adorno: es la unica forma de que el
     pasto se distinga del suelo. Medido apagando y prendiendo el pasto sobre la misma imagen, la
     version de un solo color cambiaba TREINTA Y DOS pixeles de 455.400 — o sea que las treinta y
     cuatro mil briznas eran invisibles, no por no dibujarse sino por tener exactamente el color del
     suelo. Abajo la brizna esta en sombra de sus vecinas y arriba le pega el sol; con esa diferencia
     puesta, el prado deja de ser una alfombra. */
  const col0=[], sombra=0.52, luz=1.30;
  for(let t=0;t<=TRAMOS;t++){
    const f=t/TRAMOS, w=ANCHOB*(1-f*0.92), y=ALTOB*f, z=f*f*0.30;
    pos.push(-w,y,z, w,y,z); nor.push(0,0.3,1, 0,0.3,1);
    const c=sombra+(luz-sombra)*f*f;
    col0.push(c,c,c, c,c,c);
  }
  for(let t=0;t<TRAMOS;t++){ const a=t*2; idx.push(a,a+1,a+2, a+1,a+3,a+2); }
  bg.setAttribute('position', new THREE.Float32BufferAttribute(pos,3));
  bg.setAttribute('normal', new THREE.Float32BufferAttribute(nor,3));
  bg.setAttribute('color', new THREE.Float32BufferAttribute(col0,3));
  bg.setIndex(idx);
  /* el color por vertice de la brizna y el color por instancia se MULTIPLICAN, asi que uno da el
     degrade y el otro el tono de cada mata */
  const bm=new THREE.MeshLambertMaterial({color:0xffffff, vertexColors:true, side:THREE.DoubleSide});
  /* EL VIENTO VA EN EL VERTEX SHADER Y NO EN JAVASCRIPT. Mover quince mil matrices por cuadro desde
     JS son quince mil composiciones y la subida entera del buffer a la GPU en cada cuadro; en el
     shader es una cuenta por vertice y no sube nada. Y la fase sale de la POSICION de cada brizna:
     con una fase al azar el pasto tiembla, con la posicion el viento viaja en olas por el campo. */
  bm.onBeforeCompile=(sh)=>{
    sh.uniforms.uT=FIN_UT;
    sh.vertexShader = 'uniform float uT;\n' + sh.vertexShader.replace(
      '#include <begin_vertex>',
      ['#include <begin_vertex>',
       '#ifdef USE_INSTANCING',
       '  vec3 raiz = vec3(instanceMatrix[3][0], 0.0, instanceMatrix[3][2]);',
       '  float ola = sin(raiz.x*0.32 + raiz.z*0.21 + uT*1.65) * 0.5',
       '            + sin(raiz.x*0.11 - raiz.z*0.37 + uT*2.60) * 0.5;',
       '  float k = transformed.y * transformed.y * 0.30;',
       '  transformed.x += ola * k;',
       '  transformed.z += abs(ola) * k * 0.35;',
       '#endif'].join('\n'));
  };
  const pasto=new THREE.InstancedMesh(bg, bm, NB);
  const M=new THREE.Matrix4(), Q=new THREE.Quaternion(), P=new THREE.Vector3(), S=new THREE.Vector3();
  const EJE=new THREE.Vector3(0,1,0), col=new THREE.Color();
  for(let k=0;k<NB;k++){
    /* raiz cuadrada del azar en el radio: sin ella el pasto se amontona en el centro, porque el area
       de un anillo crece con el radio */
    /* EL PASTO SE CONCENTRA CERCA, y sale de una cuenta: repartidas en 26 m, treinta y cuatro mil
       briznas son 16 por metro cuadrado —a esa densidad el suelo se ve entre medio y de cerca se lee
       a plumeros sueltos—; en 16 m son 42, que ya tapa. Lo que esta a mas de veinte metros lo hace la
       textura del suelo, porque a esa distancia una brizna mide menos de un pixel igual. */
    const a=az()*6.283, r=Math.sqrt(az())*13;
    P.set(Math.cos(a)*r, 0, Math.sin(a)*r);
    Q.setFromAxisAngle(EJE, az()*6.283);
    /* ALTURA DE PASTO DE VERDAD: de 18 a 55 cm. Estaba entre 0,55 y 1,50 m, y en la captura del
       momento en que despertas —con el ojo a 24 cm del piso— las briznas cruzaban la pantalla
       entera como canas. El pasto de un prado le llega a alguien tirado a la altura de la cara, no
       tres veces por encima. */
    /* ALTURA: de 35 a 85 cm. Mirando desde arriba con el pasto pintado de rojo se vio que las
       treinta y cuatro mil briznas estaban donde tenian que estar y que la textura del suelo tambien
       funcionaba: lo que fallaba era la vista DE PIE. A 1,62 m de altura, unas briznas de 20 a 55 cm
       se miran casi desde arriba, se tapan entre ellas y no aportan un pixel — que es exactamente lo
       que hace un cesped cortado. Un prado en el que uno se despierta tirado tiene el pasto a la
       altura de la rodilla, y a esa altura se ve de costado y se ve. */
    S.set(0.8+az()*0.5, 0.55+az()*0.70, 0.8+az()*0.5);
    M.compose(P,Q,S); pasto.setMatrixAt(k,M);
    const v=0.72+az()*0.42;
    col.setRGB(0.56*v, 0.78*v, 0.26*v); pasto.setColorAt(k,col);
  }
  pasto.instanceMatrix.needsUpdate=true; pasto.frustumCulled=false; es.add(pasto);

  /* unas flores, poquitas: el ojo va solo a lo que rompe el patron */
  const flo=new THREE.InstancedMesh(new THREE.SphereGeometry(0.055,5,4),
                                    new THREE.MeshLambertMaterial({color:0xffffff}), 420);
  for(let k=0;k<420;k++){
    const a=az()*6.283, r=Math.sqrt(az())*15;
    P.set(Math.cos(a)*r, 0.28+az()*0.30, Math.sin(a)*r);
    Q.identity(); S.set(1,1,1); M.compose(P,Q,S); flo.setMatrixAt(k,M);
    const t=az();
    col.setRGB(t<0.4?0.95:0.98, t<0.4?0.92:0.86, t<0.4?0.55:0.30);
    flo.setColorAt(k,col);
  }
  flo.instanceMatrix.needsUpdate=true; flo.frustumCulled=false; es.add(flo);

  /* ===== LAS NUBES =====
     Van orientadas hacia el origen de una vez y para siempre, sin billboard por cuadro, y eso es
     exacto y no un atajo: en este final la camara GIRA pero no se mueve nunca de (0, y, 0), asi que
     la direccion de cada nube a la camara no cambia. Con eso entran las cuarenta en UNA llamada de
     dibujo, que es lo que un billboard por cuadro no permite.
     La textura se dibuja aca —seis manchas gaussianas sobre un lienzo de 128— porque una nube es
     justamente lo que un degrade radial hace bien, y traerla como archivo serian 30 KB por algo que
     salen ocho lineas. */
  const nl=document.createElement('canvas'); nl.width=nl.height=128;
  const nx=nl.getContext('2d');
  for(let k=0;k<7;k++){
    const cx=24+az()*80, cy=44+az()*40, r=18+az()*30;
    const gr=nx.createRadialGradient(cx,cy,0,cx,cy,r);
    gr.addColorStop(0,'rgba(255,255,255,0.95)');
    gr.addColorStop(0.55,'rgba(255,255,255,0.42)');
    gr.addColorStop(1,'rgba(255,255,255,0)');
    nx.fillStyle=gr; nx.beginPath(); nx.arc(cx,cy,r,0,6.283); nx.fill();
  }
  const ntex=new THREE.CanvasTexture(nl);
  ntex.colorSpace=THREE.SRGBColorSpace;
  const nubes=new THREE.InstancedMesh(new THREE.PlaneGeometry(1,1),
    /* A DOS CARAS, y no es por las dudas. `Matrix4.lookAt(ojo, blanco, arriba)` orienta el objeto
       mirando por su -Z —la convencion de three.js— y un PlaneGeometry tiene la cara en +Z: con
       FrontSide las cuarenta y seis nubes miraban para el otro lado y no se veia NINGUNA, aunque el
       contador dijera que estaban ahi y que se dibujaban. */
    new THREE.MeshBasicMaterial({map:ntex, transparent:true, depthWrite:false,
                                 side:THREE.DoubleSide, fog:false, opacity:0.92}), 46);
  const mira=new THREE.Matrix4(), arriba=new THREE.Vector3(0,1,0), ojo=new THREE.Vector3(0,1.6,0);
  for(let k=0;k<46;k++){
    const a=az()*6.283, d=260+az()*420, h=110+az()*230;
    P.set(Math.cos(a)*d, h, Math.sin(a)*d);
    mira.lookAt(P, ojo, arriba);
    Q.setFromRotationMatrix(mira);
    const w=120+az()*230;
    S.set(w, w*(0.38+az()*0.22), 1);
    M.compose(P,Q,S); nubes.setMatrixAt(k,M);
  }
  /* SIN renderOrder. Con -1 las nubes se dibujaban ANTES que el domo del cielo, y el domo —que no
     escribe profundidad pero si color— las tapaba: en la captura no habia una sola nube. El orden
     por omision ya es el correcto: primero lo opaco, despues lo transparente. */
  nubes.instanceMatrix.needsUpdate=true; nubes.frustumCulled=false; es.add(nubes);

  /* ===== LOS ARBOLES DEL FONDO =====
     Un prado vacio con lomas peladas se lee a maqueta. Cada arbol son dos piezas fundidas —tronco y
     copa— asi que los doscientos cuarenta entran en UNA malla instanciada. */
  const tr=[];
  const tro=new THREE.CylinderGeometry(0.28,0.42,3.2,5); tro.translate(0,1.6,0);
  const cop=new THREE.SphereGeometry(2.6,7,5); cop.scale(1,1.25,1); cop.translate(0,5.0,0);
  tr.push(tro,cop);
  const arg=mergeGeometries(tr,false);
  for(const q of tr) q.dispose();
  const arb=new THREE.InstancedMesh(arg, new THREE.MeshLambertMaterial({color:0xffffff}), 240);
  for(let k=0;k<240;k++){
    const a=az()*6.283, r=70+Math.sqrt(az())*150;
    P.set(Math.cos(a)*r, 0, Math.sin(a)*r);
    Q.setFromAxisAngle(EJE, az()*6.283);
    const e=0.8+az()*1.5; S.set(e,e,e);
    M.compose(P,Q,S); arb.setMatrixAt(k,M);
    const v=0.7+az()*0.5;
    col.setRGB(0.20*v, 0.36*v, 0.16*v); arb.setColorAt(k,col);
  }
  arb.instanceMatrix.needsUpdate=true; arb.frustumCulled=false; es.add(arb);

  FIN.escena=es;
  FIN.cam=new THREE.PerspectiveCamera(camara.fov, camara.aspect, 0.1, 2600);
  FIN.listo=true;
}
function finTick(dt){
  FIN.t+=dt; FIN_UT.value+=dt;
  const bl=document.getElementById('finBl'), vi=document.getElementById('finVid'),
        ng=document.getElementById('finNg');
  if(FIN.fase==='blanco'){
    if(FIN.t>1.15){
      FIN.fase='cine'; FIN.t=0;
      document.getElementById('finVid-w').classList.add('ver');
      try{ vi.currentTime=0; const p=vi.play(); if(p&&p.catch) p.catch(()=>{}); }catch(e){}
      /* el blanco se va ENCIMA del video ya empezado: cortando el blanco y despues arrancando el
         video, en el medio se ve un cuadro de nada */
      setTimeout(()=>bl.classList.remove('ver'), 260);
    }
    return;
  }
  if(FIN.fase==='cine'){
    /* el reloj propio y no el evento 'ended': si el navegador no lo deja reproducir —o lo pausa al
       pasar a segundo plano— el final se quedaria clavado para siempre en un cuadro negro */
    if(vi.ended || FIN.t > FIN_CINE+1.2){ FIN.fase='negro'; FIN.t=0; ng.classList.add('ver'); }
    return;
  }
  if(FIN.fase==='negro'){
    if(FIN.t>0.75){
      finConstruir();
      FIN.fase='prado'; FIN.t=0;
      document.getElementById('finVid-w').classList.remove('ver'); try{ vi.pause(); }catch(e){}
      document.getElementById('finPa').classList.add('ver');
      document.getElementById('finOjos').classList.add('abre');
      setTimeout(()=>ng.classList.remove('ver'), 120);
      /* la musica del prado la agrega el parche de audio; sin el, esta linea no existe y el
         final suena a nada, que es preferible a que reviente */
      try{ musica('finPrado'); }catch(e){}
    }
    return;
  }
  if(FIN.fase==='prado'){
    /* con la camara en modo libre el bucle no la toca: es para poder mirar la escena desde donde uno
       quiera al medirla, y sin esto cualquier camara que se ponga desde afuera dura un cuadro */
    if(FIN.libre){ render.render(FIN.escena, FIN.cam); return; }
    /* DESPERTAR ES LEVANTARSE, y por eso la camara empieza tirada mirando el cielo: a la altura de
       los ojos desde el primer cuadro no hay despertar, hay un corte a un prado. */
    const f=Math.min(1, FIN.t/4.2), s=f*f*(3-2*f);
    FIN.cam.rotation.set(0,0,0,'YXZ');
    FIN.cam.position.set(0, 0.24 + (1.62-0.24)*s, 0);
    FIN.cam.rotation.y=FIN.mira.x;
    FIN.cam.rotation.x=(0.92 + FIN.mira.y)*(1-s) + FIN.mira.y*s;
    FIN.cam.fov=camara.fov; FIN.cam.aspect=camara.aspect; FIN.cam.updateProjectionMatrix();
    if(FIN.t>3.0) document.getElementById('finFin').classList.add('ver');
    render.render(FIN.escena, FIN.cam);
  }
}
'''

# el HTML del final: los tres velos, el video, los parpados y el cartel
# DOS FUENTES Y NO UNA, y la razon es la misma que ya costo una vuelta con el audio de Maicol:
# CHROMIUM NO TRAE LOS CODECS PROPIETARIOS. Medido en el banco, `canPlayType('video/mp4;
# codecs="avc1.42E01E"')` devuelve cadena vacia y el video no arranca nunca — mientras que VP9 da
# "probably". Pero al reves pasa lo mismo en un iPhone viejo, donde WebM no existe y H.264 si.
# Con las dos, cada navegador elige la que puede: WebM primero porque pesa 156 KB contra 236.
FIN_HTML = '''  <div id="finBl"></div>
  <div id="finVid-w"><video id="finVid" playsinline muted preload="auto">
    <source src="@@CINE_WEBM@@" type="video/webm"><source src="@@CINE_MP4@@" type="video/mp4">
  </video></div>
  <div id="finNg"></div>
  <div id="finPa"><div id="finOjos"><i></i><i></i></div>
    <div id="finFin"><span id="finT"></span><span id="finS"></span>
    <button id="finB"></button></div></div>
'''

FIN_CSS = '''
/* ---------- el final ---------- */
#finBl,#finNg{ position:absolute; inset:0; z-index:60; opacity:0; pointer-events:none;
  transition:opacity .95s ease; }
#finBl{ background:#fff; } #finNg{ background:#000; transition:opacity .55s ease; }
#finBl.ver,#finNg.ver{ opacity:1; }
/* EL VIDEO VA EN 'contain' Y NO EN 'cover'. El cuadro del juego es 16:9 y el video tambien, pero en
   un telefono el cuadro va GIRADO: con cover, cualquier diferencia de un pixel recorta justo el
   fogonazo, que es el momento del plano. */
#finVid-w{ position:absolute; inset:0; z-index:55; background:#000; opacity:0; pointer-events:none;
  transition:opacity .35s ease; }
#finVid-w.ver{ opacity:1; }
#finVid{ width:100%; height:100%; object-fit:contain; display:block; }
#finPa{ position:absolute; inset:0; z-index:58; display:none; }
#finPa.ver{ display:block; }
/* LOS PARPADOS: dos franjas negras que se separan. Un fundido desde negro se lee a transicion de
   video; dos franjas que se abren se leen a abrir los ojos, que es lo que esta pasando. */
#finOjos i{ position:absolute; left:0; right:0; height:52%; background:#000; z-index:59;
  transition:transform 2.6s cubic-bezier(.22,.61,.36,1); }
#finOjos i:first-child{ top:0; transform:translateY(0); }
#finOjos i:last-child{ bottom:0; transform:translateY(0); }
#finOjos.abre i:first-child{ transform:translateY(-100%); }
#finOjos.abre i:last-child{ transform:translateY(100%); }
#finFin{ position:absolute; left:0; right:0; bottom:9%; z-index:61; display:flex;
  flex-direction:column; align-items:center; gap:calc(9px * var(--esc));
  opacity:0; transition:opacity 1.5s ease; pointer-events:none; }
#finFin.ver{ opacity:1; pointer-events:auto; }
#finT{ font-size:max(21px, calc(30px * var(--esc))); letter-spacing:.30em; color:#fff;
  text-shadow:0 2px 18px rgba(0,0,0,.65); }
#finS{ font-size:max(11px, calc(13px * var(--esc))); letter-spacing:.22em; color:#e9eef2;
  text-shadow:0 2px 12px rgba(0,0,0,.7); }
#finB{ margin-top:calc(6px * var(--esc)); padding:calc(10px * var(--esc)) calc(26px * var(--esc));
  border:1px solid rgba(255,255,255,.75); background:rgba(0,0,0,.30); color:#fff;
  font-family:inherit; font-size:max(12px, calc(14px * var(--esc))); letter-spacing:.22em;
  cursor:pointer; }
#finB:active{ background:rgba(255,255,255,.22); }
/* con el final puesto no queda nada del juego en pantalla: ni HUD, ni papeles, ni controles */
body.fin #top, body.fin #nota, body.fin #joy, body.fin .btn, body.fin #bLeer, body.fin #bSon,
body.fin #teclas, body.fin #tuto, body.fin #guia, body.fin #mic, body.fin #aviso,
body.fin #leerP, body.fin #punto, body.fin #vineta{ display:none !important; }
'''


def main():
    s = io.open(JUEGO, encoding='utf8').read()
    print('Eco.html', len(s), 'caracteres')

    # ---------- 1. la puerta y la trompeta ----------
    ancla = ("const salidaMundo=new THREE.Vector3((salida[0]-(N-1)/2)*CEL, 1.2, (salida[1]-(N-1)/2)*CEL);\n"
             "matMundo.uniforms.uSalida.value.copy(salidaMundo);")
    s = cambiar(s, ancla, ancla.replace('const salidaMundo', 'let salidaMundo') + '\n' + PUERTA,
                'la puerta y la trompeta')

    # ---------- 2. el final ----------
    s = cambiar(s, '/* ===================== EL BUCLE ===================== */',
                FINAL + '\n/* ===================== EL BUCLE ===================== */',
                'el final')

    # ---------- 3. el HTML y el CSS del final ----------
    mp4 = base64.b64encode(io.open(CINE, 'rb').read()).decode('ascii')
    webm = base64.b64encode(io.open(CINE_WEBM, 'rb').read()).decode('ascii')
    s = cambiar(s, '<div id="menu" class="tapado">',
                FIN_HTML.replace('@@CINE_MP4@@', 'data:video/mp4;base64,' + mp4)
                        .replace('@@CINE_WEBM@@', 'data:video/webm;base64,' + webm) +
                '  <div id="menu" class="tapado">',
                'el HTML del final')
    s = cambiar(s, '</style>', FIN_CSS + '</style>', 'el CSS del final')

    # ---------- 4. NADIE TE GUIA ----------
    # Pedido: "nada se te guia, vos encontras las notas y las llaves por tu cuenta una vez pasas el
    # tutorial". Eran dos cosas distintas y las dos se van cuando el tutorial termina:
    #   - la FLECHA, que decia donde estaba lo que faltaba;
    #   - los RASTROS ROJOS del suelo, que llevaban de una hoja a la siguiente.
    # Durante el tutorial la flecha se queda, y no es una excepcion caprichosa: el tutorial ENSENA a
    # despertar una llave a los gritos, y para eso hay que poder llegar a la de practica.
    s = cambiar(s,
        "  if(!jugando || notaAbierta){ el.classList.remove('ver'); return; }",
        "  if(!jugando || notaAbierta){ el.classList.remove('ver'); return; }\n"
        "  /* SE APAGA AL TERMINAR EL TUTORIAL. En la sala sigue —ahi la flecha es parte de la\n"
        "     leccion— y en el laberinto no hay nada que te diga donde esta nada. */\n"
        "  if(tutoListo && !enSala){ el.classList.remove('ver'); return; }",
        'la flecha se apaga')

    s = cambiar(s, 'construirRastros();',
        "/* LOS RASTROS NO SE CONSTRUYEN. Llevaban de una hoja a la siguiente y esa era exactamente su\n"
        "   razon de existir; con el pedido de que nada guie, lo unico coherente es que no esten. Se deja\n"
        "   la funcion armada: si algun dia vuelven, vuelve una linea. */\n"
        "// construirRastros();",
        'sin rastros')

    # el subtitulo del objetivo hablaba de la flecha, que ya no existe
    s = s.replace("es:'faltan {n} · la flecha apunta a la que oíste'", "es:'faltan {n} · escuchá dónde contestó'")
    s = s.replace("en:'{n} still missing · the arrow points at the one you heard'", "en:'{n} still missing · listen for where it answered'")
    s = s.replace("pt:'faltam {n} · a seta aponta para a que você ouviu'", "pt:'faltam {n} · escute onde respondeu'")

    # ---------- 5. LLEGAR A LA PUERTA ----------
    viejo = """  if(jugando && !ganado){
    const d=Math.hypot(jug.x-salidaMundo.x, jug.z-salidaMundo.z);
    if(d<1.7){
      if(nSellos()>=4){
        ganado=true;
        const m=Math.floor(tiempo/60), sg=Math.floor(tiempo%60);
        avisar(TX('aSaliste',{t:m+':'+(sg<10?'0':'')+sg}), 999);
        son('salida');
        emitir(jug.x, jug.y, jug.z, 1.0, 78);
      } else if(selloAviso<=0){"""
    nuevo = """  if(jugando && !ganado){
    const d=Math.hypot(jug.x-salidaMundo.x, jug.z-salidaMundo.z);
    if(d<2.4){
      if(nSellos()>=4){
        if(!PUERTA.abriendo){
          /* LA PUERTA SE ABRE PRIMERO Y SE GANA DESPUES. Ganar en el mismo cuadro en que se toca la
             puerta tira a la basura lo unico que las cuatro llaves construyeron: hay que VERLA
             abrirse. Son 2,6 s de piedra moviendose, con el fogonazo de la propia puerta. */
          PUERTA.abriendo=true;
          son('salida');
          emitir(PUERTA.x, 1.5, PUERTA.z, 1.0, 78);
          avisar(TX('aAbre'), 2.6);
        }
        if(PUERTA.abierta>=1){
          ganado=true;
          const m=Math.floor(tiempo/60), sg=Math.floor(tiempo%60);
          document.getElementById('finT').textContent=TX('oSaliste');
          document.getElementById('finS').textContent=m+':'+(sg<10?'0':'')+sg;
          document.getElementById('finB').textContent=TX('menu');
          finArrancar();
        }
      } else if(selloAviso<=0){"""
    s = cambiar(s, viejo, nuevo, 'la puerta se abre y despues se gana')

    # ---------- 6. EL BUCLE ----------
    s = cambiar(s,
        "  tutoTick(dt);\n  guiaTick(dt);",
        "  tutoTick(dt);\n  guiaTick(dt);\n  trompetaTick(dt);\n  puertaTick(dt, eco);",
        'la trompeta y la puerta en el bucle')

    # el final se dibuja EN LUGAR del laberinto: dibujar los dos es dibujar el laberinto para nadie
    s = cambiar(s,
        "  render.render(escena,camara);\n}\nanimar();",
        "  /* EL FINAL SE DIBUJA EN LUGAR DEL LABERINTO Y NO ENCIMA. Con el velo blanco puesto, seguir\n"
        "     dibujando el laberinto son 29 llamadas y 80.000 triangulos tapados por un div opaco — es\n"
        "     el mismo defecto que ya habia costado el menu a 8 cuadros por segundo. */\n"
        "  if(FIN.fase==='prado'){ finTick(dt); return; }\n"
        "  if(FIN.fase!=='no'){ finTick(dt); }\n"
        "  render.render(escena,camara);\n}\nanimar();",
        'el final en el bucle')

    # ---------- 7. MIRAR EN EL PRADO Y EL BOTON ----------
    s = cambiar(s, 'animar();\n\n/* ===================== GANCHOS DE PRUEBA',
        """animar();

/* en el prado se mira arrastrando, y por el mismo camino en PC y en telefono: el juego ya no esta
   escuchando el joystick ni el puntero bloqueado, asi que lo unico que queda es el arrastre. */
(function finEntrada(){
  let ult=null;
  const dentro=()=>FIN.fase==='prado';
  addEventListener('pointerdown', e=>{ if(dentro()) ult=[e.clientX,e.clientY]; }, {passive:true});
  addEventListener('pointermove', e=>{
    if(!dentro() || !ult) return;
    const [dx,dy]=dCuadro(e.clientX-ult[0], e.clientY-ult[1]);
    finMirar(dx,dy); ult=[e.clientX,e.clientY];
  }, {passive:true});
  addEventListener('pointerup', ()=>{ ult=null; }, {passive:true});
  addEventListener('pointercancel', ()=>{ ult=null; }, {passive:true});
  const b=document.getElementById('finB');
  /* VOLVER AL MENU RECARGA. El laberinto, las hojas, las llaves y la cosa se arman UNA vez al cargar
     el modulo: volver al menu sin recargar dejaria el mismo laberinto ya resuelto y las cuatro hojas
     abiertas. Recargar es la unica forma honesta de empezar de nuevo. */
  if(b) b.onclick=()=>{ location.reload(); };
})();

/* ===================== GANCHOS DE PRUEBA""",
        'la entrada del prado y el boton')

    # ---------- 8. LOS TEXTOS ----------
    s = cambiar(s, " aSaliste:{",
        " aAbre:{en:'THE FOUR LOCKS TURN', es:'LAS CUATRO CERRADURAS GIRAN', pt:'AS QUATRO FECHADURAS GIRAM'},\n"
        " menu:{en:'MENU', es:'MENÚ', pt:'MENU'},\n"
        " aSaliste:{",
        'los textos del final')

    # ---------- 9. LOS GANCHOS ----------
    s = cambiar(s, '  salas:()=>SALAS.map(s2=>s2.slice()),',
        """  salas:()=>SALAS.map(s2=>s2.slice()),
  /* LA PUERTA: donde esta, cuanto abrio y cuanto brilla cada cerradura. Sin esto, "la puerta se abre
     con las llaves" es una afirmacion sobre una animacion que nadie puede comprobar en una foto. */
  puerta:()=>({ pos:[+PUERTA.x.toFixed(2), +PUERTA.z.toFixed(2)], celda:salida.slice(),
                nor:[PUERTA.nx, PUERTA.nz],
                abriendo:PUERTA.abriendo, abierta:+PUERTA.abierta.toFixed(3),
                hojas:[+PUERTA.hojaI.rotation.y.toFixed(3), +PUERTA.hojaD.rotation.y.toFixed(3)],
                cerrs:PUERTA.mats.map(m=>+m.color.g.toFixed(3)),
                dist:+Math.hypot(jug.x-PUERTA.x, jug.z-PUERTA.z).toFixed(2) }),
  /* despierta a la cosa sin esperar los doce segundos de gracia y la pone donde uno quiera: sin
     esto, comprobar que la trompeta la llama son treinta segundos de reloj por prueba */
  cosaDespertar:(i,j)=>{ cosa.estado='ronda'; cosa.aturdida=0; cosa.t=0;
    if(i!=null){ cosa.x=XC(i); cosa.z=ZC(j); cosa.metaCel=null; }
    return { estado:cosa.estado, pos:[+cosa.x.toFixed(1), +cosa.z.toFixed(1)] }; },
  trompeta:()=>({ radio:TROMPETA.r, cada:TROMPETA.cada, dentro:TROMPETA.dentro,
                  veces:TROMPETA.veces, prox:+TROMPETA.t.toFixed(2) }),
  /* el final, paso a paso: se puede pedir cada tramo sin jugar veinte minutos */
  fin:()=>({ fase:FIN.fase, t:+FIN.t.toFixed(2), listo:FIN.listo,
             mira:[+FIN.mira.x.toFixed(3), +FIN.mira.y.toFixed(3)],
             camY:FIN.cam? +FIN.cam.position.y.toFixed(3) : null,
             pitch:FIN.cam? +FIN.cam.rotation.x.toFixed(3) : null,
             video:(()=>{ const v=document.getElementById('finVid');
                          return { dur:+(v.duration||0).toFixed(2), t:+(v.currentTime||0).toFixed(2),
                                   ver:document.getElementById('finVid-w').classList.contains('ver') }; })(),
             ojos:document.getElementById('finOjos').classList.contains('abre'),
             cartel:document.getElementById('finFin').classList.contains('ver') }),
  ganarYa:()=>{ for(let k=0;k<4;k++) SELLOS[k]=true;
                jug.x=PUERTA.x+PUERTA.nx*1.4; jug.z=PUERTA.z+PUERTA.nz*1.4; return nSellos(); },
  finIr:(f,t)=>{ if(f==='prado'){ finConstruir(); document.body.classList.add('fin');
                                  document.getElementById('finPa').classList.add('ver');
                                  document.getElementById('finOjos').classList.add('abre'); }
                 FIN.fase=f; FIN.t=(t==null?0:t); return FIN.fase; },
  /* cuantas cosas hay en el prado y en cuantas llamadas de dibujo: la unica forma de decir que las
     nubes ESTAN es contarlas, porque mirando al cielo no siempre entra una */
  /* el suelo, por dentro: si la textura no esta atada no hay foto que lo diga */
  suelo:()=>{ if(!FIN.escena) return null;
    let m=null; FIN.escena.traverse(o=>{ if(o.isMesh && !o.isInstancedMesh && o.rotation.x<-1) m=o; });
    if(!m) return 'no hay';
    const g=m.geometry, mt=m.material;
    return { geo:g.type, uv:!!g.attributes.uv, color:!!g.attributes.color,
             vert:mt.vertexColors, map:!!mt.map,
             repite:mt.map? [mt.map.repeat.x, mt.map.repeat.y] : null,
             img:mt.map&&mt.map.image? [mt.map.image.width, mt.map.image.height] : null,
             aniso:mt.map? mt.map.anisotropy : null,
             col:'#'+mt.color.getHexString() }; },
  /* EL BRILLO POR FRANJAS DEL PRADO, leido del buffer de verdad. Mirando la captura yo no podia
     decidir si el suelo cerca sale oscuro por el suelo o por el pasto encima; con el pasto apagado
     y prendido, los numeros lo dicen en una linea. */
  pradoPixeles:()=>{ render.render(FIN.escena, FIN.cam);
    const gl=render.getContext(), w=gl.drawingBufferWidth, h=gl.drawingBufferHeight;
    const px=new Uint8Array(w*h*4); gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,px);
    /* readPixels devuelve de abajo hacia arriba: la franja 0 es el pie de la pantalla */
    const fr=[];
    for(let f=0;f<5;f++){
      let r=0,g=0,b=0,n=0;
      for(let y=Math.floor(f*h/5); y<Math.floor((f+1)*h/5); y+=3)
        for(let x=0;x<w;x+=3){ const i=(y*w+x)*4; r+=px[i]; g+=px[i+1]; b+=px[i+2]; n++; }
      fr.push([Math.round(r/n), Math.round(g/n), Math.round(b/n)]);
    }
    return { franjasDeAbajoArriba:fr };
  },
  /* el pasto por dentro: cuantas briznas, donde caen y como se proyectan. Sin esto, "el pasto no se
     ve" es una impresion sobre una captura. */
  pasto:()=>{ if(!FIN.escena) return null;
    let m=null; FIN.escena.traverse(o=>{ if(o.isInstancedMesh && o.count>1000) m=o; });
    if(!m) return 'no hay';
    const M=new THREE.Matrix4(), P=new THREE.Vector3(), S=new THREE.Vector3(), Q=new THREE.Quaternion();
    const muestras=[];
    FIN.cam.updateMatrixWorld(true);
    for(const k of [0, 1, 2, 100, 5000]){
      m.getMatrixAt(k, M); M.decompose(P,Q,S);
      const p2=P.clone(); p2.y+=S.y*0.5; p2.project(FIN.cam);
      muestras.push({ k, pos:[+P.x.toFixed(2),+P.y.toFixed(2),+P.z.toFixed(2)],
                      esc:[+S.x.toFixed(3),+S.y.toFixed(3),+S.z.toFixed(3)],
                      pant:[+(p2.x*0.5+0.5).toFixed(3), +(-p2.y*0.5+0.5).toFixed(3)],
                      dist:+P.distanceTo(FIN.cam.position).toFixed(2) });
    }
    return { n:m.count, visible:m.visible, tri:m.geometry.index? m.geometry.index.count/3 : 0,
             prog:!!(m.material.program), muestras };
  },
  finCam:(x,y,z,px,py)=>{ if(!FIN.cam) return null;
    FIN.libre=true;
    FIN.cam.position.set(x,y,z); FIN.cam.rotation.set(0,0,0,'YXZ');
    FIN.cam.rotation.y=py||0; FIN.cam.rotation.x=px||0;
    FIN.cam.updateMatrixWorld(true); render.render(FIN.escena, FIN.cam);
    return { pos:[x,y,z], rot:[px||0, py||0], fov:FIN.cam.fov, asp:+FIN.cam.aspect.toFixed(3) }; },
  pastoRojo:()=>{ let m=null; FIN.escena.traverse(o=>{ if(o.isInstancedMesh && o.count>1000) m=o; });
                  if(!m) return 'no hay';
                  m.material.vertexColors=false; m.material.color.setRGB(1,0,0);
                  m.instanceColor=null; m.material.needsUpdate=true; return 'rojo'; },
  pastoVer:(v)=>{ let n=0; FIN.escena.traverse(o=>{ if(o.isInstancedMesh && o.count>1000){ o.visible=!!v; n++; } });
                  return n; },
  prado:()=>{ if(!FIN.escena) return null;
    const c={}; let mallas=0;
    FIN.escena.traverse(o=>{ if(o.isMesh){ mallas++;
      const n = o.isInstancedMesh? 'inst'+o.count : 'malla';
      c[n]=(c[n]||0)+1; } });
    render.render(FIN.escena, FIN.cam);
    return { mallas, tipos:c, llamadas:render.info.render.calls,
             tris:render.info.render.triangles, niebla:[FIN.escena.fog.near, FIN.escena.fog.far] }; },
  finMirar:(dx,dy)=>{ finMirar(dx,dy); return FIN.mira; },""",
        'los ganchos de la puerta y el final')

    io.open(JUEGO, 'w', encoding='utf8').write(s)
    print('escrito', len(s))
    return 0


if __name__ == '__main__':
    sys.exit(main())
