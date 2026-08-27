
/* =========================================================================================
   LOS DOS FILTROS: SATURACION Y BAJA CALIDAD

   Lo que se pidio es la cara del juego original: colores gritones y pocos pixeles. Las dos cosas se
   hacen en el MISMO sitio y por el mismo precio — la escena no se dibuja en la pantalla, se dibuja
   en un lienzo chico y despues ese lienzo se estira a pantalla completa.

   POR QUE ES ASI Y NO UN FILTRO CSS: `filter: saturate()` sobre el canvas satura, si, pero no baja
   la resolucion —solo la desenfoca— y ademas el navegador lo aplica DESPUES de haber dibujado todos
   los pixeles, o sea que cuesta igual. Dibujando en un destino de 0,34 se dibujan NUEVE VECES MENOS
   pixeles: el filtro de baja calidad no es solo un look, es la razon por la que esto corre en un
   telefono viejo. Y el estirado va con NEAREST, que es lo que da el pixel cuadrado en vez de un
   borron.

   LA CUANTIZACION DE COLOR es el tercer ingrediente y es el que hace la diferencia entre "borroso" y
   "de la epoca": el original guardaba pocos bits por canal, asi que los degradados se rompen en
   escalones. Sin esto, una pared con niebla se ve suave y moderna aunque este pixelada.
   ========================================================================================= */
const FILTROS={
  apagado:{ escala:1.00, sat:1.00, niveles:0   },
  suave:  { escala:0.80, sat:1.14, niveles:44  },
  /* 0,58 Y NO 0,40, y el numero sale de una cuenta que no habia hecho: con 0,40 en un marco de
     790x1400 el destino de render son 148x264 pixeles. El personaje ocupa un tercio de la altura,
     o sea SETENTA Y CUATRO pixeles de alto: su cara son ocho, y un brazo son dos. A ese tamano no
     hay modelo que sobreviva — se ve una mancha verde, y eso es exactamente lo que se veia.
     Con 0,58 el destino son 214x382 y el personaje pasa a 130 pixeles: se le ve la cara.
     La saturacion y los escalones se quedan; lo que estaba mal era la resolucion. */
  fuerte: { escala:0.58, sat:1.28, niveles:26  }
};
let filtro='fuerte';
try{ const g=localStorage.getItem('recreo_filtro'); if(g && FILTROS[g]) filtro=g; }catch(e){}

const postEsc=new THREE.Scene();
const postCam=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
let postRT=null;
const postMat=new THREE.ShaderMaterial({
  uniforms:{ uTex:{value:null}, uSat:{value:1.0}, uNiv:{value:0.0} },
  vertexShader:`
    varying vec2 vUv;
    void main(){ vUv=uv; gl_Position=vec4(position.xy, 0.0, 1.0); }`,
  fragmentShader:`
    precision mediump float;
    varying vec2 vUv;
    uniform sampler2D uTex; uniform float uSat; uniform float uNiv;
    /* LA CONVERSION A sRGB VA ACA Y NO SE PUEDE SALTEAR.
       three.js aplica outputColorSpace solo cuando dibuja en el buffer de pantalla; cuando el
       destino es un WebGLRenderTarget la imagen queda en LINEAL. Mi pasada la copiaba tal cual, asi
       que todo salia oscuro y con un tinte verde-oliva: el techo casi blanco se veia verde musgo y
       el pasillo beige se veia militar. No era la saturacion —saturar un beige lo pone naranja, no
       oliva— era el gamma. Se vio en una foto y se arregla en dos lineas. */
    vec3 aSRGB(vec3 c){
      return mix(c*12.92, 1.055*pow(max(c, vec3(0.0)), vec3(0.41666))-0.055, step(vec3(0.0031308), c));
    }
    void main(){
      vec3 c=aSRGB(texture2D(uTex, vUv).rgb);
      /* la saturacion, contra el gris de LUMINANCIA y no contra el promedio: con el promedio los
         verdes se van de rango antes que los azules y el sueter verde se quema solo.
         Y va DESPUES del sRGB: la epoca que se esta imitando saturaba sobre valores de 8 bits ya
         corregidos, no sobre luz lineal. */
      float l=dot(c, vec3(0.2126, 0.7152, 0.0722));
      c=mix(vec3(l), c, uSat);
      c=clamp(c, 0.0, 1.0);
      /* y los escalones de color. floor(c*n)/n a secas oscurece medio escalon, asi que va el +0.5 */
      if(uNiv > 0.5){ c=floor(c*uNiv + 0.5)/uNiv; }
      gl_FragColor=vec4(c, 1.0);
    }`,
  depthTest:false, depthWrite:false
});
postEsc.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2), postMat));

function postTam(){
  const F=FILTROS[filtro];
  const w=Math.max(2, marco.clientWidth), h=Math.max(2, marco.clientHeight);
  const dpr=render.getPixelRatio();
  const bw=Math.max(2, Math.round(w*dpr*F.escala)), bh=Math.max(2, Math.round(h*dpr*F.escala));
  if(!postRT){
    postRT=new THREE.WebGLRenderTarget(bw,bh,{ depthBuffer:true, stencilBuffer:false });
  } else if(postRT.width!==bw || postRT.height!==bh){
    postRT.setSize(bw,bh);
  }
  /* NEAREST en los dos: el magFilter da el pixel cuadrado al estirar, y el minFilter tiene que ser
     NEAREST tambien o three.js pide mipmaps de un destino de render y la textura sale negra. */
  postRT.texture.magFilter=THREE.NearestFilter;
  postRT.texture.minFilter=THREE.NearestFilter;
  postRT.texture.generateMipmaps=false;
  postMat.uniforms.uTex.value=postRT.texture;
  postMat.uniforms.uSat.value=F.sat;
  postMat.uniforms.uNiv.value=F.niveles;
  return [bw,bh];
}
function aplicarFiltro(f){
  if(!FILTROS[f]) return;
  filtro=f; try{ localStorage.setItem('recreo_filtro', f); }catch(e){}
  postTam(); pintarFiltro();
}
function pintarFiltro(){
  for(const b of document.querySelectorAll('[data-fil]')) b.classList.toggle('si', b.dataset.fil===filtro);
}
for(const b of document.querySelectorAll('[data-fil]')) b.onclick=()=>aplicarFiltro(b.dataset.fil);

/* dibuja la escena a traves del filtro. Con el filtro apagado va derecho a la pantalla y no se paga
   ni el destino de render ni la pasada de pantalla completa. */
function pintarEscena(){
  if(filtro==='apagado'){
    render.setRenderTarget(null);
    render.render(escena, camara);
    return;
  }
  postTam();
  render.setRenderTarget(postRT);
  render.clear();
  render.render(escena, camara);
  render.setRenderTarget(null);
  render.render(postEsc, postCam);
}
