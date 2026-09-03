/* =========================================================================================
   EL MOTOR Y EL MUNDO DE NOCHE

   Las texturas son fotos generadas (Higgsfield) horneadas a WebP de 512 con los bordes
   COSIDOS: el generador dice "seamless" y casi nunca lo es, y sobre una calle repetida veinte
   veces cualquier diferencia entre bordes pinta una rejilla. Se funden en el horno, no aca.
   ========================================================================================= */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const lienzo=document.getElementById('lienzo');
const render=new THREE.WebGLRenderer({ canvas:lienzo, antialias:true });
render.setPixelRatio(Math.min(devicePixelRatio||1, 2));
render.setSize(innerWidth, innerHeight);
/* ACES y no lineal: es LA diferencia entre "escena con luces" y "noche filmada". Con salida
   lineal los faroles queman a blanco puro y el resto queda negro; ACES comprime los dos
   extremos y deja vivir los medios, que es donde esta toda la imagen nocturna. */
render.toneMapping=THREE.ACESFilmicToneMapping;
render.toneMappingExposure=1.15;
render.shadowMap.enabled=true;
render.shadowMap.type=THREE.PCFSoftShadowMap;

const escena=new THREE.Scene();
/* la niebla es azul noche y no negra: el negro puro come los faroles de lejos y la calle
   termina en una pared; el azul deja leer profundidad */
escena.fog=new THREE.Fog(0x0a1020, 18, 95);
escena.background=new THREE.Color(0x05070f);

const camara=new THREE.PerspectiveCamera(68, innerWidth/innerHeight, 0.05, 400);
addEventListener('resize', ()=>{
  render.setSize(innerWidth, innerHeight);
  camara.aspect=innerWidth/innerHeight; camara.updateProjectionMatrix();
});

/* ---------- las texturas, pegadas por armar.py ---------- */
const TEX_B64 = @@TEXTURAS@@;
const _cargador=new THREE.TextureLoader();
function tex(n, rx, ry){
  const t=_cargador.load('data:image/webp;base64,'+TEX_B64[n]);
  t.colorSpace=THREE.SRGBColorSpace;
  t.wrapS=t.wrapT=THREE.RepeatWrapping;
  if(rx) t.repeat.set(rx, ry||rx);
  /* la anisotropia es LA diferencia en un plano visto casi de canto —la calle entera se mira
     asi— y ya lo enseño el prado de Eco: sin ella a diez metros la textura es un pure */
  t.anisotropy=render.capabilities.getMaxAnisotropy();
  return t;
}

/* ---------- las luces ---------- */
/* la luna: una direccional azulada con sombras. UNA sola luz con sombra en toda la escena:
   cada luz con sombra es una pasada entera de dibujo. Los faroles alumbran sin sombra y no se
   nota, porque el ojo le atribuye las sombras a la luz dominante. */
const luna=new THREE.DirectionalLight(0x8fb0e8, 0.85);
luna.position.set(30, 48, -20);
luna.castShadow=true;
luna.shadow.mapSize.set(1024,1024);
luna.shadow.camera.near=8; luna.shadow.camera.far=130;
luna.shadow.camera.left=-40; luna.shadow.camera.right=40;
luna.shadow.camera.top=40; luna.shadow.camera.bottom=-40;
luna.shadow.bias=-0.0008;
escena.add(luna);
escena.add(luna.target);
escena.add(new THREE.HemisphereLight(0x24304a, 0x0c0f14, 0.62));

/* ---------- el cielo: la foto generada, en un domo ---------- */
/* La foto es 21:9, no una equirrectangular completa: cubre la franja que de verdad se mira
   —del horizonte hacia arriba— y el cenit repite el borde superior, que es cielo estrellado
   parejo. La luna DE LA FOTO queda al noreste y la direccional apunta igual, para que las
   sombras y el dibujo cuenten la misma historia. */
{
  const t=_cargador.load('data:image/webp;base64,'+TEX_B64.cielo);
  t.colorSpace=THREE.SRGBColorSpace;
  const g=new THREE.SphereGeometry(320, 32, 16, 0, Math.PI*2, 0, Math.PI*0.52);
  const m=new THREE.MeshBasicMaterial({ map:t, side:THREE.BackSide, fog:false });
  const domo=new THREE.Mesh(g, m);
  domo.rotation.y=2.35;      // la luna de la foto, puesta donde esta la direccional
  escena.add(domo);
}

/* ---------- la geografia ----------
   La calle corre por Z. La camara camina por la vereda de la derecha (x≈+4,8) desde z=+4
   hacia z=−34. Las casas lindas van a los dos lados; la abandonada es la ultima de la
   derecha, de frente al remate de la caminata. */
const CALLE_W=7.4, VEREDA_X0=3.7, VEREDA_X1=6.3;
const mCalle =new THREE.MeshStandardMaterial({ map:tex('calle', 4, 26), roughness:0.94 });
const mVereda=new THREE.MeshStandardMaterial({ map:tex('vereda', 2, 34), roughness:0.92 });
const mPasto =new THREE.MeshStandardMaterial({ map:tex('pasto', 10, 40), roughness:1.0 });
{
  const suelo=(w, x, mat)=>{
    const p=new THREE.Mesh(new THREE.PlaneGeometry(w, 130), mat);
    p.rotation.x=-Math.PI/2; p.position.set(x, 0, -25);
    p.receiveShadow=true; escena.add(p); return p;
  };
  suelo(CALLE_W, 0, mCalle);
  suelo(VEREDA_X1-VEREDA_X0, (VEREDA_X0+VEREDA_X1)/2, mVereda).position.y=0.02;
  suelo(VEREDA_X1-VEREDA_X0, -(VEREDA_X0+VEREDA_X1)/2, mVereda).position.y=0.02;
  suelo(30, VEREDA_X1+15, mPasto).position.y=0.01;
  suelo(30, -(VEREDA_X1+15), mPasto).position.y=0.01;
  /* la raya central de la calle, discontinua: es lo que hace que un rectangulo oscuro se lea
     a calle y no a rio de alquitran */
  const rg=[], caja=new THREE.BoxGeometry(0.16, 0.012, 2.2);
  for(let z=2; z>-60; z-=5.5){ const q=caja.clone(); q.translate(0, 0.02, z); rg.push(q); }
  caja.dispose();
  const rm=new THREE.Mesh(mergeGeometries(rg,false),
    new THREE.MeshStandardMaterial({ color:0xb8b090, roughness:0.9 }));
  escena.add(rm);
}
