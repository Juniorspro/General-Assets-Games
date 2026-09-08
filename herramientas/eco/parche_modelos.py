# -*- coding: utf-8 -*-
"""Eco pasa a usar modelos 3D de verdad: la cosa y cuatro props.

   Los cinco se generaron con Higgsfield a partir de imagenes —la cosa, del dibujo que mando el
   usuario— y se podaron con `podar_glb.py`. La cosa viene RIGGEADA Y CON CICLO DE CAMINATA, asi que
   no hay que renunciar a la animacion para ganar la forma.

   TRES COSAS QUE HAY QUE RESOLVER PARA QUE ESTO ENTRE EN ESTE JUEGO Y NO EN OTRO:

   1. ACA NADA TIENE MATERIAL PROPIO. Todo se dibuja con el shader del sonido, o si no se veria sin
      hacer ruido y el juego se cae. A los modelos se les tira el material que traen y se les pone
      matMundo. Para eso el shader tiene que aprender dos cosas que no sabia: ESQUELETO (la cosa es
      una SkinnedMesh) e INSTANCIAS (los props se repiten por el laberinto). Va todo en el MISMO
      material: three.js compila un programa por combinacion de defines, asi que un material sirve
      para la malla suelta, la instanciada y la del esqueleto.
   2. EL PROP REPETIDO VA INSTANCIADO. Un pozo por celda serian veinte llamadas de dibujo por tipo;
      con InstancedMesh son cuatro en total, pase lo que pase.
   3. SE CARGA EN DIFERIDO Y DEGRADA. Decodificar cinco GLB tarda; hasta que llegan, el juego ya se
      puede jugar con lo que habia. Si un GLB falla, la cosa se sigue viendo con el cuerpo de cajas
      de siempre en vez de no verse nada.
"""
import io, sys

RUTA = 'juegos-pc/Eco.html'
s = io.open(RUTA, encoding='utf-8').read()
ORIG = len(s)
hechos, saltados = [], []

def cam(a, b, marca):
    global s
    if marca in s: saltados.append(marca[:48]); return
    if a not in s: print('NO ESTA:', repr(a[:110])); sys.exit(1)
    if s.count(a) != 1: print('APARECE %d VECES:' % s.count(a), repr(a[:110])); sys.exit(1)
    s = s.replace(a, b, 1); hechos.append(marca[:48])

# ============================================== 1. EL SHADER APRENDE ESQUELETO E INSTANCIAS
cam("""  vertexShader:`
    varying vec3 vW; varying vec3 vN;
    void main(){
      vec4 wp=modelMatrix*vec4(position,1.0);
      vW=wp.xyz; vN=normalize(mat3(modelMatrix)*normal);
      gl_Position=projectionMatrix*viewMatrix*wp;
    }`,""",
"""  /* EL MISMO MATERIAL PARA LAS TRES COSAS. three.js pone USE_SKINNING y USE_INSTANCING segun el
     OBJETO que lo usa, no segun el material, y compila un programa por combinacion. O sea que una
     sola definicion cubre el laberinto (malla suelta), los props (instanciados) y la cosa
     (esqueleto), y las tres siguen leyendo los mismos uniformes de las ondas — que es lo que
     importa, porque si un modelo tuviera material propio se veria en silencio. */
  vertexShader:`
    #include <common>
    #include <skinning_pars_vertex>
    varying vec3 vW; varying vec3 vN;
    void main(){
      vec3 objectNormal = normal;
      vec3 transformed = position;
      #include <skinbase_vertex>
      #include <skinnormal_vertex>
      #include <skinning_vertex>
      mat4 mm = modelMatrix;
      #ifdef USE_INSTANCING
        mm = modelMatrix * instanceMatrix;
      #endif
      vec4 wp = mm * vec4(transformed, 1.0);
      vW = wp.xyz; vN = normalize(mat3(mm) * objectNormal);
      gl_Position = projectionMatrix * viewMatrix * wp;
    }`,""",
    "#include <skinning_pars_vertex>")

cam("""import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';""",
    """import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';""",
    "import { GLTFLoader }")

# ============================================== 2. LOS PROPS PASAN A SER MODELOS
cam("""    } else if(tipo===5){
      /* EL POZO: un brocal en el medio de la sala. Es el mojon mas fuerte que hay, porque hay que
         rodearlo: una sala en la que caminaste distinto no se olvida. */
      const br=new THREE.CylinderGeometry(0.92,1.00,0.62,16,1,true); br.translate(x,0.31,z); gs.push(br);
      const bo=new THREE.TorusGeometry(0.96,0.09,7,18); bo.rotateX(Math.PI/2); bo.translate(x,0.62,z); gs.push(bo);
      for(const sg of [-1,1]){ const pos=new THREE.BoxGeometry(0.12,1.70,0.12);
        pos.translate(x+sg*0.92, 0.85, z); gs.push(pos); }
      const vg=new THREE.BoxGeometry(2.10,0.13,0.13); vg.translate(x,1.70,z); gs.push(vg);
      OBST.push({x, z, r:1.16});
    } else if(tipo===6){
      /* LA COLUMNA PARTIDA: el fuste cortado y el resto tirado al lado */
      const alto=1.1+1.0*(((h>>6)&7)/7);
      const f=new THREE.CylinderGeometry(0.30,0.36,alto,11,1); f.translate(px,alto/2,pz); gs.push(f);
      const c=new THREE.CylinderGeometry(0.30,0.30,1.35,11,1);
      c.rotateZ(Math.PI/2); c.rotateY(ang+0.4);
      c.translate(px+dir[1]*1.05, 0.30, pz-dir[0]*1.05); gs.push(c);
      OBST.push({x:px, z:pz, r:0.50});
    } else if(tipo===7){
      /* EL BRASERO apagado: un trípode con una copa. Hace siglos que no arde nada acá. */
      for(let k=0;k<3;k++){ const a2=ang+k*2.094;
        const pa=new THREE.BoxGeometry(0.09,1.05,0.09);
        pa.rotateX(0.20*Math.cos(a2)); pa.rotateZ(-0.20*Math.sin(a2));
        pa.translate(px+Math.sin(a2)*0.24, 0.52, pz+Math.cos(a2)*0.24); gs.push(pa); }
      const co=new THREE.CylinderGeometry(0.44,0.26,0.34,13,1); co.translate(px,1.18,pz); gs.push(co);
      OBST.push({x:px, z:pz, r:0.46});
    } else {
      /* LA FIGURA: algo que alguna vez fue una estatua, sin cabeza y sin un brazo. Es el unico prop
         con forma de persona, y a oscuras eso pega distinto que una caja. */
      const pe=new THREE.BoxGeometry(0.80,0.26,0.80); pe.translate(px,0.13,pz); gs.push(pe);
      const cu=new THREE.BoxGeometry(0.42,1.05,0.30); cu.rotateY(ang); cu.translate(px,0.78,pz); gs.push(cu);
      const ho=new THREE.BoxGeometry(0.56,0.20,0.30); ho.rotateY(ang); ho.translate(px,1.34,pz); gs.push(ho);
      const br2=new THREE.BoxGeometry(0.15,0.62,0.15); br2.rotateX(0.30); br2.rotateY(ang);
      br2.translate(px+Math.cos(ang)*0.30, 1.02, pz-Math.sin(ang)*0.30); gs.push(br2);
      const pi=new THREE.BoxGeometry(0.34,0.44,0.30); pi.rotateY(ang); pi.translate(px,0.36,pz); gs.push(pi);
      OBST.push({x:px, z:pz, r:0.52});
    }""",
"""    } else if(tipo===5){
      /* EL POZO va en el MEDIO de la celda y no contra la pared: es el mojon mas fuerte que hay
         justo porque hay que rodearlo, y una sala en la que caminaste distinto no se olvida. */
      PROPS3D.push({k:'pozo', x, z, giro:((h>>11)&15)/15*6.283});
      OBST.push({x, z, r:1.16});
    } else if(tipo===6){
      PROPS3D.push({k:'columna', x:px, z:pz, giro:ang+((h>>11)&7)/7*0.9});
      OBST.push({x:px, z:pz, r:0.50});
    } else if(tipo===7){
      PROPS3D.push({k:'brasero', x:px, z:pz, giro:ang+((h>>11)&7)/7*1.6});
      OBST.push({x:px, z:pz, r:0.46});
    } else {
      /* LA FIGURA es el unico prop con forma de persona, y a oscuras eso pega distinto que una caja.
         Mira hacia el centro de la celda: una estatua contra la pared mirando la pared es un error
         que se lee enseguida. */
      PROPS3D.push({k:'figura', x:px, z:pz, giro:ang+Math.PI});
      OBST.push({x:px, z:pz, r:0.52});
    }""",
    "PROPS3D.push({k:'pozo'")

cam("""const XC=i=>(i-(N-1)/2)*CEL, ZC=j=>(j-(N-1)/2)*CEL;""",
    """/* donde va cada prop que es un modelo. Se junta al construir el laberinto y se usa recien cuando
   llega el GLB: no se puede instanciar lo que todavia no se decodifico. */
const PROPS3D=[];
const XC=i=>(i-(N-1)/2)*CEL, ZC=j=>(j-(N-1)/2)*CEL;""",
    "const PROPS3D=[];")

# ============================================== 3. LA CARGA DE LOS MODELOS
cam("""/* ===================== EL BUCLE ===================== */""",
"""/* ===================== LOS MODELOS 3D =====================
   Cinco GLB adentro del archivo: la cosa —riggeada y con ciclo de caminata— y cuatro props. Se
   decodifican en diferido y el juego arranca sin esperarlos: hasta que llegan, la cosa se ve con el
   cuerpo de cajas de siempre y las celdas de esos cuatro props quedan vacias. Si un GLB falla, eso
   es exactamente lo que se queda, que es mucho mejor que una pantalla sin nada. */
const MOD3D={ pedidos:0, listos:0, fallados:0, props:{}, cosa:null, error:null };
const PROP_ALTO={ pozo:2.05, columna:2.15, brasero:1.10, figura:1.80 };
const COSA_ALTO=2.45;

/* una sola geometria con las matrices del GLB ya aplicadas, apoyada en y=0 y centrada en x/z.
   Sin esto, cada modelo llega con su propio origen y su propia escala y hay que adivinarlos: asi
   se declara UN alto en metros por prop y el resto sale de la caja envolvente. */
function geoDe(gl, alto){
  gl.scene.updateMatrixWorld(true);
  const gs=[];
  gl.scene.traverse(o=>{
    if(!o.isMesh) return;
    const g=o.geometry.clone();
    g.applyMatrix4(o.matrixWorld);
    for(const at of Object.keys(g.attributes)) if(at!=='position' && at!=='normal') g.deleteAttribute(at);
    if(!g.attributes.normal) g.computeVertexNormals();
    gs.push(g);
  });
  if(!gs.length) return null;
  const g = gs.length===1? gs[0] : mergeGeometries(gs, false);
  if(gs.length>1) for(const q of gs) q.dispose();
  g.computeBoundingBox();
  const b=g.boundingBox, k=alto/Math.max(1e-4, b.max.y-b.min.y);
  g.translate(-(b.min.x+b.max.x)/2, -b.min.y, -(b.min.z+b.max.z)/2);
  g.scale(k,k,k);
  g.computeBoundingBox(); g.computeBoundingSphere();
  return g;
}

/* UN InstancedMesh POR TIPO, no un objeto por celda. Con veinte pozos sueltos serian veinte llamadas
   de dibujo por tipo; asi son cuatro en total, haya los que haya. */
function montarProp(k, gl){
  const donde=PROPS3D.filter(p=>p.k===k);
  if(!donde.length) return;
  const g=geoDe(gl, PROP_ALTO[k]||1.5);
  if(!g) return;
  const im=new THREE.InstancedMesh(g, matMundo, donde.length);
  const m=new THREE.Matrix4(), q=new THREE.Quaternion(), e=new THREE.Euler();
  donde.forEach((p,i)=>{
    e.set(0, p.giro, 0); q.setFromEuler(e);
    m.compose(new THREE.Vector3(p.x, 0, p.z), q, new THREE.Vector3(1,1,1));
    im.setMatrixAt(i, m);
  });
  im.instanceMatrix.needsUpdate=true;
  im.frustumCulled=false;
  escena.add(im);
  MOD3D.props[k]={ malla:im, n:donde.length, tris:g.index? g.index.count/3 : g.attributes.position.count/3 };
}

function montarCosa(gl){
  const raiz=gl.scene;
  raiz.updateMatrixWorld(true);
  const caja=new THREE.Box3().setFromObject(raiz), t=new THREE.Vector3();
  caja.getSize(t);
  const k=COSA_ALTO/Math.max(1e-4, t.y);
  raiz.scale.setScalar(k);
  raiz.position.y = -caja.min.y*k;
  raiz.traverse(o=>{
    if(o.isMesh || o.isSkinnedMesh){ o.material=matMundo; o.frustumCulled=false; }
  });
  /* LOS OJOS SE MUDAN A LA CABEZA DEL MODELO. Son lo unico de la cosa que emite luz propia y de
     cerca: sin ellos no habria forma justa de darse cuenta de que la tenes encima. Van colgados del
     hueso, asi que siguen el cabeceo de la caminata en vez de flotar donde estaba la cabeza vieja. */
  const cabeza = raiz.getObjectByName('Head') || raiz.getObjectByName('head');
  const nido = cabeza || raiz;
  const esc = cabeza? 1/Math.max(1e-4, cabeza.getWorldScale(new THREE.Vector3()).x) : 1;
  for(const sg of [-1,1]){
    const oj=new THREE.Mesh(new THREE.SphereGeometry(0.055*esc, 8, 6), cosaOjosMat);
    oj.position.set(sg*0.085*esc, cabeza? 0.06*esc : 2.1, cabeza? 0.10*esc : 0.18);
    oj.frustumCulled=false; nido.add(oj);
  }
  cosa.g.add(raiz);
  cosa.modelo=raiz;
  /* el cuerpo de cajas se apaga, no se borra: si algo sale mal con el modelo se vuelve a prender */
  cosa.viejo.visible=false;
  if(gl.animations && gl.animations.length){
    cosa.mixer=new THREE.AnimationMixer(raiz);
    cosa.accion=cosa.mixer.clipAction(gl.animations[0]);
    cosa.accion.play();
  }
}

function cargarModelos(){
  if(typeof MOD==='undefined') return;
  const cargador=new GLTFLoader();
  for(const k of Object.keys(MOD)){
    MOD3D.pedidos++;
    try{
      cargador.parse(b64aBytes(MOD[k]), '', gl=>{
        try{ if(k==='cosa') montarCosa(gl); else montarProp(k, gl); MOD3D.listos++; }
        catch(e){ MOD3D.fallados++; MOD3D.error=String(e); }
      }, e=>{ MOD3D.fallados++; MOD3D.error=String(e && e.message || e); });
    }catch(e){ MOD3D.fallados++; MOD3D.error=String(e); }
  }
}
cargarModelos();

/* ===================== EL BUCLE ===================== */""",
    "const MOD3D={ pedidos:0, listos:0")

# ============================================== 4. LA COSA: EL CUERPO VIEJO EN UN GRUPO APARTE
cam("""  const caja=(w,h,d,x,y,z,padre)=>{ const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d), M);
    m.position.set(x,y,z); m.frustumCulled=false; (padre||cosa.g).add(m); return m; };""",
    """  /* TODO EL CUERPO DE CAJAS CUELGA DE UN GRUPO Y NO DE cosa.g. Es lo que permite apagarlo de una
     sola vez cuando llega el modelo, y volver a prenderlo si el modelo no llega. */
  cosa.viejo=new THREE.Group(); cosa.g.add(cosa.viejo);
  const caja=(w,h,d,x,y,z,padre)=>{ const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d), M);
    m.position.set(x,y,z); m.frustumCulled=false; (padre||cosa.viejo).add(m); return m; };""",
    "cosa.viejo=new THREE.Group(); cosa.g.add(cosa.viejo);")

cam("""  cosa.tronco.add(tronco); cosa.g.add(cosa.tronco);""",
    """  cosa.tronco.add(tronco); cosa.viejo.add(cosa.tronco);""",
    "cosa.viejo.add(cosa.tronco);")

# ============================================== 5. LA CAMINATA DEL MODELO
cam("""  cosa.tronco.position.y = 1.62 + Math.sin(f*2)*0.055*amp;
  cosa.tronco.rotation.x = 0.12 + Math.sin(f*2)*0.035*amp;""",
"""  cosa.tronco.position.y = 1.62 + Math.sin(f*2)*0.055*amp;
  cosa.tronco.rotation.x = 0.12 + Math.sin(f*2)*0.035*amp;
  /* EL CICLO DEL MODELO VA CON LA VELOCIDAD, no con el reloj. Un ciclo a velocidad fija sobre un
     bicho que acelera de 1,55 a 3,30 m/s patina los pies contra el piso, y patinar es lo unico que
     hace que un monstruo se lea a muñeco. 1,45 es la velocidad para la que esta hecho el clip:
     dividiendo por ahi, la zancada avanza lo que avanza el cuerpo. */
  if(cosa.mixer) cosa.mixer.update(dt * Math.max(0.12, cosa.vel/1.45));""",
    "if(cosa.mixer) cosa.mixer.update(dt")

# ============================================== 6. LOS GANCHOS
cam("""  cosa:()=>({ estado:cosa.estado,""",
"""  /* los modelos: cuantos entraron, con cuantos triangulos y cuantas llamadas de dibujo cuestan */
  modelos:()=>({ pedidos:MOD3D.pedidos, listos:MOD3D.listos, fallados:MOD3D.fallados,
                 error:MOD3D.error,
                 cosa: cosa.modelo? { alto:+new THREE.Box3().setFromObject(cosa.modelo).getSize(new THREE.Vector3()).y.toFixed(2),
                                      huesos:(()=>{ let n=0; cosa.modelo.traverse(o=>{ if(o.isBone) n++; }); return n; })(),
                                      anim:!!cosa.mixer, viejoVisible:cosa.viejo.visible } : null,
                 props: Object.keys(MOD3D.props).map(k=>({ k, n:MOD3D.props[k].n,
                        tris:MOD3D.props[k].tris, visible:MOD3D.props[k].malla.visible })),
                 puestos: PROPS3D.reduce((a,p)=>{ a[p.k]=(a[p.k]||0)+1; return a; }, {}) }),
  /* apagar el modelo y volver al cuerpo de cajas: sirve para comparar los dos en la misma partida */
  modeloCosa:(v)=>{ if(cosa.modelo) cosa.modelo.visible = v==null? !cosa.modelo.visible : !!v;
                    cosa.viejo.visible = cosa.modelo? !cosa.modelo.visible : true;
                    return { modelo:!!(cosa.modelo && cosa.modelo.visible), viejo:cosa.viejo.visible }; },
  cosa:()=>({ estado:cosa.estado,""",
    "  modelos:()=>({ pedidos:MOD3D.pedidos")

cam("""  /* apagar el modelo y volver al cuerpo de cajas: sirve para comparar los dos en la misma partida */""",
"""  /* los huesos del modelo y donde cae la cabeza, en coordenadas de la cosa. Hace falta para poder
     COLGAR LOS OJOS donde va la cabeza en vez de adivinarlo: los rigs vienen en centimetros o en
     metros segun el dia, y una constante puesta a ojo deja los ojos flotando en el pecho. */
  huesos:()=>{ if(!cosa.modelo) return null;
    const v=new THREE.Vector3(), n=[];
    cosa.modelo.updateMatrixWorld(true);
    cosa.modelo.traverse(o=>{ if(o.isBone) n.push(o.name); });
    const h=cosa.modelo.getObjectByName('Head')||cosa.modelo.getObjectByName('head');
    let cab=null;
    if(h){ h.getWorldPosition(v); const l=cosa.g.worldToLocal(v.clone());
           cab={ nombre:h.name, local:[+l.x.toFixed(3),+l.y.toFixed(3),+l.z.toFixed(3)],
                 escala:+h.getWorldScale(new THREE.Vector3()).x.toFixed(4) }; }
    const c=new THREE.Box3().setFromObject(cosa.modelo);
    return { n:n.length, nombres:n.slice(0,30), cabeza:cab,
             caja:{ min:[+c.min.x.toFixed(2),+c.min.y.toFixed(2),+c.min.z.toFixed(2)],
                    max:[+c.max.x.toFixed(2),+c.max.y.toFixed(2),+c.max.z.toFixed(2)] } }; },
  /* apagar el modelo y volver al cuerpo de cajas: sirve para comparar los dos en la misma partida */""",
    "  huesos:()=>{ if(!cosa.modelo) return null;")

cam("""  traerCosa:(i,j)=>{ cosa.x=XC(i==null?celdaDe(jug.x,jug.z)[0]:i); cosa.z=ZC(j==null?celdaDe(jug.x,jug.z)[1]:j);
                     return [+cosa.x.toFixed(1),+cosa.z.toFixed(1)]; },""",
"""  traerCosa:(i,j,mirando)=>{ cosa.x=XC(i==null?celdaDe(jug.x,jug.z)[0]:i); cosa.z=ZC(j==null?celdaDe(jug.x,jug.z)[1]:j);
                     /* y opcionalmente se la da vuelta hacia el jugador: sin esto, fotografiarla de
                        frente depende de por donde venia caminando, o sea de la suerte */
                     if(mirando){ cosa.giro=Math.atan2(jug.x-cosa.x, jug.z-cosa.z);
                                  cosa.g.rotation.y=cosa.giro; }
                     return [+cosa.x.toFixed(1),+cosa.z.toFixed(1)]; },""",
    "traerCosa:(i,j,mirando)=>{")

cam("""  /* apagar el modelo y volver al cuerpo de cajas: sirve para comparar los dos en la misma partida */""",
"""  /* donde quedo cada prop, en celdas: sin esto no hay forma de ir a fotografiar uno, porque el
     laberinto es distinto en cada partida y caminar hasta encontrarlo es cuestion de suerte */
  props3d:()=>PROPS3D.map(p=>({ k:p.k, cel:celdaDe(p.x,p.z), pos:[+p.x.toFixed(1),+p.z.toFixed(1)],
                                giro:+p.giro.toFixed(2) })),
  /* apagar el modelo y volver al cuerpo de cajas: sirve para comparar los dos en la misma partida */""",
    "  props3d:()=>PROPS3D.map(")

# ============================================== GUARDAR
io.open(RUTA,'w',encoding='utf-8').write(s)
print('CAMBIOS (%d):' % len(hechos))
for h in hechos: print('  +', h)
if saltados:
    print('YA ESTABAN (%d):' % len(saltados))
    for h in saltados: print('  =', h)
print('bytes: %d -> %d' % (ORIG, len(s)))
