
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

/* =========================================================================================
   RESOLUCION DINAMICA: LA CALIDAD ALTA DEJA DE SER UN PRIVILEGIO DE LOS APARATOS RAPIDOS

   El pedido fue "mejoralo para graficos altos, asi las gamas bajas pueden disfrutar de buena calidad
   tambien". Y el problema estaba en como estaban armadas las calidades: `calidad` mezclaba DOS cosas
   distintas en una sola perilla — cuantos pixeles se dibujan (px) y que se ve (los lockers, cuanto
   alcanza la niebla). Bajar la calidad en un telefono lento le sacaba las dos, o sea que el aparato
   que menos podia era ademas el unico que veia un colegio mas pobre y mas corto.

   Son cosas independientes y ahora van separadas. Lo que CUESTA es el relleno de pixeles, y eso se
   ajusta solo cuadro a cuadro; lo que se VE se queda puesto. Un telefono lento corre 'alta' con todos
   los lockers y la niebla larga, a menos resolucion — que es exactamente como lo resuelven las
   consolas, y es preferible: la resolucion se nota mucho menos que un pasillo vacio, y encima este
   juego ya dibuja pixelado a proposito, asi que bajarla mas cae dentro de su propio estilo.

   Se mueve DE A POCO y con banda muerta: un ajuste que persigue cada cuadro hace latir la imagen, que
   se ve peor que quedarse un escalon por debajo. */
/* CADA CAMBIO DE RESOLUCION REASIGNA EL DESTINO DE RENDER. postRT.setSize() tira la textura y el
   buffer de profundidad y se los vuelve a pedir a la GPU: un tiron. Asi que lo que hay que minimizar
   no es el error de la resolucion, es la CANTIDAD DE CAMBIOS.

   TRES COSAS, Y LA PRIMERA ES LA QUE DE VERDAD IMPORTA:

   1. LA SEPARACION ENTRE ESCALONES TIENE QUE SER MAS CHICA QUE LA BANDA MUERTA, y esto es
      aritmetica, no gusto. La banda va de 15,86 a 21,55 ms, o sea un factor 1,359. El tiempo de
      cuadro va con los pixeles, o sea con el CUADRADO de la escala. Si dos escalones vecinos estan
      en razon k, saltar de uno al otro multiplica el tiempo por k^2: con k^2 > 1,359 el escalon de
      arriba queda por encima de la banda y el de abajo por debajo, y entonces el control NO PUEDE
      quedarse quieto — sube, baja, sube, para siempre. Mi primera escalera tenia 0,58 y 0,45
      pegados (k = 1,289, k^2 = 1,66) y medido daba 16 cambios por minuto YA ASENTADO. Esta es
      geometrica de razon 1,12: k^2 = 1,25, con margen contra 1,359.
   2. ES ASIMETRICA Y CON ENFRIAMIENTO: bajar necesita una ventana mala, subir necesita ventanas
      buenas seguidas, y despues de cualquier cambio no se toca nada por segundo y medio.
   3. SUBIR CUESTA CADA VEZ MAS. Si el aparato ya demostro una vez que no daba, volver a probar cada
      tres ventanas es garantia de rebote. La racha necesaria se duplica en cada subida (3, 6, 12,
      24, 48 ventanas), asi que recuperar sigue siendo posible —al salir de un aula cargada— pero
      dejar de rebotar esta garantizado.

   MEDIDO EN 336 CORRIDAS DE UN MINUTO (tiempos de 14 a 68 ms, ruido de 0 a ±12 ms, lazo cerrado con
   el tiempo saliendo de los pixeles, que es como oscila de verdad):

                            cambios totales   el peor caso   ya asentado (>20 s)   peor asentado
     regla anterior              2.752             31              701                  16
     esta                        1.460             10              213                   5     */
const RES_ESC=[1.00, 0.89, 0.80, 0.71, 0.64, 0.57, 0.50, 0.45];
let resI=0, resDin=RES_ESC[0];
const RES_MIN=0.45, RES_MAX=1.00;
const RES_OBJ=1000/58;        // ms por cuadro a los que se apunta
let _resN=0, _resSuma=0, _resBuenas=0, _resFrio=0, _resCambios=0, _resSubidas=0;
function resTick(dt){
  if(dt>0.25) return;                       // un cuadro larguisimo no dice nada del aparato
  if(_resFrio>0){ _resFrio-=dt; }
  _resSuma+=dt; _resN++;
  if(_resN<24) return;
  const ms=(_resSuma/_resN)*1000;
  _resN=0; _resSuma=0;
  if(_resFrio>0) return;
  if(ms>RES_OBJ*1.25){
    _resBuenas=0;
    if(resI<RES_ESC.length-1){ resI++; resDin=RES_ESC[resI]; _resFrio=1.5; _resCambios++; }
  } else if(ms<RES_OBJ*0.92){
    const hace=3*Math.pow(2, Math.min(_resSubidas,4));
    if(++_resBuenas>=hace && resI>0){
      resI--; resDin=RES_ESC[resI]; _resBuenas=0; _resFrio=1.5; _resCambios++; _resSubidas++;
    }
  } else _resBuenas=0;
}
function postTam(){
  const F=FILTROS[filtro];
  const w=marcoW, h=marcoH;              // guardado por ajustar(): no se toca el layout por cuadro
  const dpr=render.getPixelRatio();
  const e=F.escala*resDin;
  const bw=Math.max(2, Math.round(w*dpr*e)), bh=Math.max(2, Math.round(h*dpr*e));
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

/* IDEM manosTam: pintarIdioma() la llama con `if(window.pintarFiltro)` y nadie la asignaba, asi que
   al cambiar de idioma los botones del filtro no se repintaban nunca. El guard esta para saltear la
   llamada del arranque —cuando `filtro` de este archivo todavia no existe y leerlo rompe el modulo
   entero—, no para desactivarla siempre. */
window.pintarFiltro=pintarFiltro;
