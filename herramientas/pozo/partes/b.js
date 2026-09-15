/* ============================================================
   b.js — constantes, tablas, idiomas, guardado y EL ESTADO.
   Va primero de todo lo que es JS porque acá se DECLARAN las
   cosas que el resto lee. Un `const` leído antes de su linea no
   devuelve undefined: tira, y se lleva el modulo entero.
   ============================================================ */

const $ = s => document.querySelector(s);
const CV = $('#c'), CX = CV.getContext('2d');

/* --- geometria --- */
const CELDA  = 48;          // px de mundo
const SALA_W = 11, SALA_H = 17;   // celdas por sala
const MUNDO_W = SALA_W * CELDA, MUNDO_H = SALA_H * CELDA;
const HUD_ALTO = 72;        // franja de arriba reservada al HUD

/* --- jugador --- */
const J_R      = 13;        // radio de choque

/* EL PASO DEL ABANICO NO SE ELIGE: SALE DE QUE UN CUERPO QUEPA ENTRE DOS BALAS
   a la distancia a la que se pelea. Con 0,17 y ocho balas, el jefe1 ponia las
   balas a 165*0,17 = 28 px una de otra, y el cuerpo mide 26 mas 9 de las dos
   balas: el abanico era IMPASABLE por aritmetica y no por dificultad — no hay
   forma de cruzarlo, gire como gire. Es el mismo defecto que en POMPOM tenia la
   helice pasando por el nodo de aterrizaje.
   Y VA EN UN SOLO SITIO: el paso, el radio de la bala y la distancia de pelea
   los leen el disparo, el dibujo y el bot. Con tres copias, mover una deja a
   las otras dos describiendo un juego que no existe. */
const PELEA_D   = 165;                      // a lo que pelea el bot
const BALA_R    = 4.5;                      // radio de una bala enemiga
/* Y EL AIRE NO ES UN NUMERO: ES UN CUERPO. Con +12 el hueco del medio del
   abanico medía 47 px y el cuerpo mas las dos balas 35, o sea SEIS PIXELES de
   margen a cada lado — y la bala del jefe tarda PELEA_D/vb = 165/240 = 0,69 s
   en llegar. Nadie, ni el bot ni un dedo en un teléfono, sostiene una ventana
   de seis pixeles durante siete décimas mientras lo empujan: medido, de los 58
   golpes que metio el jefe1 en 24 corridas, CERO fueron cuerpo a cuerpo. Con
   un cuerpo de aire (2*J_R) el hueco pasa a 61 px y el margen a trece a cada
   lado, que es lo que le permite a alguien APUNTAR al hueco. */
const ABAN_HUE  = J_R*2 + BALA_R*2 + J_R*2;    // cuerpo + dos balas + un cuerpo de aire
const ABAN_PASO = ABAN_HUE / PELEA_D;       // 61/165 = 0,370 rad = 21,2 grados
/* Y DE AHI SALE CUANTO ABRE CADA ABANICO, que es lo que decide si se puede
   esquivar de costado o hay que pasar POR UN HUECO: (f-1) x ABAN_PASO. La
   torreta abre 42 grados, el jefe1 148 y el jefe2 233 — o sea que el del
   jefe2 se cierra por detras y salirse al costado no existe: lo unico que
   queda es el hueco de un cuerpo de aire que ABAN_HUE garantiza. */
const J_VEL    = 205;       // px/s
const J_PASO   = 34;        // LARGO DE ZANCADA: la cadencia sale de velocidad/paso,
                            // no de un numero al lado, o los pies patinan.
const J_INV    = 0.72;      // invencibilidad al recibir
/* SIETE Y NO CINCO, y el numero sale de una medicion: el juego cobra 1,6
   corazones por piso y la cura solo aparece en el 58% de los sorteos, asi que con
   cinco la economia queda EN EL FILO EXACTO y lo que decide la corrida es la
   varianza. Medido en cincuenta corridas con cinco: el bot honesto muere en el
   piso 3 o 4 SIEMPRE, y ni el bot ni el generador mueven ese numero. */
const J_VIDAS  = 7;         // corazones de arranque
/* QUE CUENTA COMO PESADO, y sale de `danoJug` y no del gusto: ahi el corazon es
   `round(d/9)`, o sea que a partir de 13,5 de dano un toque cuesta DOS. Escrito
   como un numero suelto, el dia que cambie el /9 la generacion sigue creyendo
   que el bruto es liviano y nada falla: sale una sala imposible. */
const PESA_D   = 13.5;
/* RECUPERARSE DENTRO DEL PISO. Medido: el piso 4 cobra 5,6 corazones de una
   barra de 7 —el 80%— y la unica cura del juego aparecia al BAJAR, o sea
   despues. Una corrida buena se moria por una mala sala y no habia con que
   contestar. El corazon SOLO CAE SI FALTA VIDA: uno tirado con la barra llena
   es un botin que no ocurrio, lo unico que agrega es varianza. */
const P_COR    = 0.12;      // probabilidad por bicho, con la barra no llena
const COR_R    = 26;        // radio para levantarlo (la moneda usa 22)
const ESQ_T    = 0.17;      // dura la esquiva
const ESQ_INV  = 0.15;      // cuadros invencibles de la esquiva
const ESQ_VEL  = 620;
/* EL ENFRIAMIENTO DE LA ESQUIVA SALE DE LA SALA PEOR, no de un numero lindo.
   Medido: de los golpes que meten las tres clases que TIRAN, 87 de 90 del
   tirador, 79 de 81 de la torreta y 57 de 60 del jefe llegan con la esquiva en
   enfriamiento, y CERO llegan tarde — o sea que no es que se esquive mal, es
   que la esquiva no vuelve. Con ESQ_CD 0,78 tarda ESQ_T + 0,78 = 0,95 s en
   estar lista, y una sala trae hasta TRES enemigos: dos tiradores a 1,5 de
   cadencia, desfasados, dejan 0,75 s entre salvas. O sea que por aritmetica la
   esquiva no podia cubrir una sala de dos, y las salas de dos son la mayoria.
   0,56 la deja lista en 0,73 s, justo por debajo de ese peor caso. */
const ESQ_CD   = 0.56;
const E_MAX0   = 100;       // energia de arranque
const E_REC0   = 15;        // energia por segundo

/* --- auto-mira --- */
const MIRA_CONO = 0.75;     // rad a cada lado de donde apunta el joystick
const MIRA_ALC  = 520;

/* --- las diez armas: UNA tabla y ninguna rama por arma --- */
const ARMAS = [
 /* id          dmg cad   vbala disp n  alc  ener retro color      nombre */
  {id:'pistola', d: 9, c:.26, v:640, s:.03, n:1, a:470, e: 5, r:  60, col:'#ffd98a'},
  {id:'rafaga',  d: 6, c:.10, v:700, s:.10, n:1, a:430, e: 4, r:  35, col:'#ffb35c'},
  {id:'escopeta',d: 7, c:.62, v:560, s:.22, n:5, a:300, e:17, r: 220, col:'#ff8a6b'},
  {id:'rifle',   d:26, c:.78, v:980, s:.005,n:1, a:760, e:15, r: 150, col:'#8ce0ff'},
  {id:'astilla', d: 5, c:.34, v:600, s:.15, n:3, a:400, e: 9, r:  90, col:'#c4a6ff'},
  {id:'orbe',    d:15, c:.55, v:330, s:.02, n:1, a:560, e:13, r:  80, col:'#79f2c0'},
  {id:'trueno',  d:12, c:.20, v:880, s:.06, n:1, a:620, e: 8, r:  55, col:'#ffe066'},
  {id:'canon',   d:38, c:1.05,v:420, s:.01, n:1, a:520, e:26, r: 330, col:'#ff6b81'},
  {id:'aguja',   d: 4, c:.07, v:820, s:.13, n:1, a:400, e: 3, r:  25, col:'#a8f0ff'},
  {id:'cruz',    d:11, c:.46, v:520, s:.00, n:4, a:420, e:14, r: 120, col:'#f7a8ff'},
];
const ARMA_ID = {}; ARMAS.forEach((a,i)=>ARMA_ID[a.id]=i);

/* --- los enemigos salen de UNA maquina de estados y esta tabla --- */
const ENEM = {
 /*            vida vel   r  dmg alc   cad  avisa tira vbala  xp  color      */
  baba:     {v: 22, s: 62, r:14, d: 8, a: 26, c:.95, t:.30, f:0, vb:  0, col:'#7ee081'},
  corredor: {v: 16, s:148, r:12, d:10, a: 24, c:.80, t:.42, f:0, vb:  0, col:'#ff9f6b'},
  tirador:  {v: 24, s: 70, r:13, d: 7, a:300, c:1.5, t:.50, f:1, vb:300, col:'#7fb2ff'},
  torreta:  {v: 40, s:  0, r:16, d: 7, a:420, c:1.7, t:.55, f:3, vb:260, col:'#c7a2ff'},
  bomba:    {v: 14, s:118, r:13, d:18, a: 44, c:2.4, t:.60, f:0, vb:  0, col:'#ff6f6f', expl:78},
  bruto:    {v: 74, s: 72, r:20, d:16, a: 34, c:1.2, t:.55, f:0, vb:  0, col:'#f2c14e'},
  /* LA CADENCIA DEL JEFE SALE DE LO QUE TARDA LA ESQUIVA EN VOLVER, no de un
     numero lindo. Medido: de los 60 golpes que el jefe1 metio en 24 corridas,
     CINCUENTA Y CUATRO llegaron con la esquiva en enfriamiento y CERO llegaron
     tarde — o sea que el bot esquiva y aun asi come, porque la salva siguiente
     ya esta en el aire antes de que pueda volver a esquivar. La esquiva tardaba
     entonces ESQ_T + ESQ_CD = 0,95 s en estar lista otra vez, y la bala del jefe
     tarda 165/240 = 0,69 s en cruzar la distancia de pelea: hay que
     comprometerse ANTES de que salga la salva, asi que una cadencia por debajo
     de ~1,3 s le pedia al jugador una esquiva que todavia no tenia.
     DESPUES BAJO ESQ_CD Y LA CUENTA QUEDO CON MAS AIRE: hoy la esquiva vuelve en
     0,17 + 0,56 = 0,73 s, asi que entre salva y salva sobran 0,62. El 1,35 se
     queda igual porque el margen no es lo unico que decide —el jefe1 da 37 a 47
     golpes fatales de 200 corridas, que es lo que corresponde a un jefe— y
     apretarlo seria volver a la sala de la que se salio.
     Y NO ALARGA LA PELEA: los 420 de vida los baja el arma, no el reloj — lo
     unico que cambia es cuantas veces ataca en el mismo rato. */
  jefe1:    {v:420, s: 88, r:34, d:18, a: 46, c:1.35,t:.50, f:8, vb:240, col:'#ff5c7a', jefe:1, hitos:[.55]},
  jefe2:    {v:760, s: 96, r:40, d:22, a: 52, c:.85, t:.45, f:12,vb:280, col:'#b06bff', jefe:2, hitos:[.70,.45,.22]},
};

/* mezcla de clases por piso: el 1 no puede tener brutos */
/* CADA OLA TIENE UN CARACTER, y eso hubo que rehacerlo midiendo. El tirador
   estaba en SIETE de las diez y se llevaba el 63% de todo el dano de una
   corrida: la tabla prometia variedad y el juego era, en la practica, esquivar
   balas con algunos cuerpo a cuerpo de adorno.
   Y el piso 3 era un precipicio — medido, los pisos 1 y 2 cobraban 0,6 y 0,4
   corazones y el 3 cobraba 4,9: DOCE VECES de un piso al otro. Ahi entra la
   distancia, o sea que el juego cambia de genero sin transicion.
   Ahora la distancia entra en el 3 acompanada de la baba, que es el cuerpo a
   cuerpo LENTO.
   Y NINGUNA OLA LLEVA MAS DE UNA CLASE PESADA. De las seis clases que no son
   jefe solo dos cobran dos corazones de un toque —el bruto y la bomba— y el 7
   y el 9 llevaban LAS DOS: con la clase sorteada uniforme entre tres, dos
   tercios de cada sala cobraban doble. Medido sobre 400 pisos, la sala mediana
   del 7 salia con CUATRO pesados y 361 de 2000 con seis o siete, contra una
   barra de ocho —o sea salas que se pierden de cuatro toques—. Y se ve en quien
   mata: de 200 corridas, el bruto mete 79 golpes fatales y la bomba 36, mas que
   los dos jefes juntos, y el bot ENTRA al piso que lo mata con la barra llena
   (mediana 8, p10 7). No se muere de a poco: se muere adentro de una sala.
   SE PROBO LO CONTRARIO Y MIDIO PEOR. La hipotesis era que un bicho a distancia
   SE PARA A TIRAR y uno de cuerpo a cuerpo no deja de perseguir nunca, asi que
   una sala de seis cuerpo a cuerpo seria una caceria sin aire; con esa idea se
   le puso una clase a distancia a TODOS los pisos del 3 en adelante. Medido
   sobre 200 corridas, el piso 7 dejo de cobrar —de 62 muertes a 1— y la pared
   se MUDO al 6: de 46 muertes a 110, con su neto de 3,29 a 5,34 y el tirador de
   4,42 a 7,75 corazones. O sea que el costo no es que el cuerpo a cuerpo no de
   aire: es que DOS tiradores mas un bruto de 74 de vida en la misma sala es el
   pico de toda la escalera —con cant 6-7, topeL = floor(cant/3) autoriza dos—.
   pisoMedio 6,50 -> 6,22 y jefe2 desaparecio de la tabla de clases: nadie
   llego al 10. Revertido. */
/* Y CADA PISO ESTRENA UNA CLASE Y NO DOS. La tabla anterior metia el bomba en
   el 5 —el piso del jefe— y el bruto Y la torreta juntos en el 6, y ahi estaba
   la pared: medido sobre 24 corridas, 19 de las 24 muertes caian en esos dos
   pisos (6 en el 5 y 13 en el 6) mientras el resto de la escalera costaba medio
   corazon por piso. Y no era la economia: el bot ENTRA a cada piso con la barra
   llena —7,00 · 7,13 · 7,21 · 7,33 · 7,50 · 7,76 · 8,00— o sea que no se
   desangra a lo largo de la corrida, se muere ADENTRO de un piso. Lo que mata
   es aprender dos cosas nuevas a la vez, y en el 5 encima con el jefe encima.
   Ahora el bomba entra en el 4, el 5 no estrena NADA —el jefe es lo nuevo— el
   bruto entra solo en el 6 y la torreta espera al 8. Es exactamente la
   correccion que este mismo archivo ya habia hecho con el piso 3, que cobraba
   doce veces lo que el 2: la pared se habia mudado, no arreglado. */
const OLAS = [
  ['baba'],                             // el enjambre lento
  ['baba','corredor'],                  // aparece la velocidad
  ['baba','tirador'],                   // aparece la DISTANCIA, con el lento al lado
  ['corredor','tirador','bomba'],       // aparece el que revienta
  ['baba','corredor','tirador'],        // piso 5 lleva jefe1: NADA nuevo, el jefe es lo nuevo
  ['baba','bruto','corredor'],          // el bruto, con el lento y el rapido
  ['baba','corredor','bomba'],          // el que revienta, ahora con velocidad
  ['corredor','tirador','torreta'],     // aparece el fuego fijo: distancia pura
  ['bruto','torreta','corredor'],       // el bruto bajo fuego fijo
  ['corredor','bruto','tirador'],       // piso 10 lleva jefe2: todo junto
];

/* --- mejoras: una decision por piso --- */
const MEJORAS = [
  {id:'vida',  f:P=>{P.vidaMax++; P.vida=Math.min(P.vidaMax,P.vida+1);}},
  {id:'dano',  f:P=>{P.mDano  += .18;}},
  {id:'vel',   f:P=>{P.mVel   += .12;}},
  {id:'ener',  f:P=>{P.eMax   += 30;}},
  {id:'rec',   f:P=>{P.eRec   += 6;}},
  {id:'esq',   f:P=>{P.mEsq   += .22;}},
  {id:'cad',   f:P=>{P.mCad   += .14;}},
  {id:'bala',  f:P=>{P.mVbala += .22;}},
  {id:'cura',  f:P=>{P.vida = P.vidaMax;}},
];

const PISOS = 10;

/* ---------- idiomas ---------- */
const LANG = {
 es:{
  idT:'Elegí tu idioma', jugar:'BAJAR AL POZO', tuto:'CÓMO SE JUEGA', idioma:'IDIOMA',
  sub:'Diez pisos. Nadie volvió.',
  pie:'todo dibujado por código · sin un solo asset',
  rec:'Mejor: piso {0}',
  mjT:'ELEGÍ UNA', mjS:'Sólo una, y es para toda la bajada.',
  paT:'EN PAUSA', sigue:'SEGUIR', menu:'AL MENÚ',
  muerto:'TE QUEDASTE ABAJO', muertoS:'El pozo no devuelve nada.',
  gana:'SALISTE', ganaS:'Diez pisos, y la luz otra vez.',
  otra:'OTRA VEZ',
  fiD:'piso {0} · {1} bajas · {2} monedas · {3}',
  piso:'PISO {0}', salaLimpia:'¡DESPEJADA!', abre:'LA PUERTA SE ABRE',
  escalera:'LA ESCALERA', jefeAhi:'ALGO GRANDE',
  tomaste:'{0}', cofre:'COFRE', usar:'USAR',
  pTuto1:'MOVÉ con el dedo izquierdo',
  pTuto2:'FUEGO apunta solo al más cercano',
  pTuto3:'ESQ te esquiva y te hace invencible un instante',
  pTuto4:'Limpiá la sala para abrir las puertas',
  pTuto5:'Buscá la escalera y bajá',
  tutoFin:'ESO ES TODO',
  armas:{pistola:'PISTOLA',rafaga:'RÁFAGA',escopeta:'ESCOPETA',rifle:'RIFLE',astilla:'ASTILLA',
         orbe:'ORBE',trueno:'TRUENO',canon:'CAÑÓN',aguja:'AGUJA',cruz:'CRUZ'},
  mej:{vida:['UN CORAZÓN MÁS','sube el máximo y te cura uno'],
       dano:['MÁS DAÑO','+18% a todo lo que dispares'],
       vel:['PIES LIGEROS','+12% de velocidad'],
       ener:['MÁS ENERGÍA','+30 al tanque'],
       rec:['RECARGA RÁPIDA','+6 de energía por segundo'],
       esq:['ESQUIVA FRESCA','la esquiva se enfría 22% más rápido'],
       cad:['GATILLO SUELTO','+14% de cadencia'],
       bala:['BALA VELOZ','+22% de velocidad de bala'],
       cura:['UN RESPIRO','te cura entero']},
 },
 en:{
  idT:'Pick your language', jugar:'GO DOWN', tuto:'HOW TO PLAY', idioma:'LANGUAGE',
  sub:'Ten floors. Nobody came back.',
  pie:'all drawn in code · not a single asset',
  rec:'Best: floor {0}',
  mjT:'PICK ONE', mjS:'Only one, and it lasts the whole run.',
  paT:'PAUSED', sigue:'RESUME', menu:'MENU',
  muerto:'YOU STAYED DOWN', muertoS:'The pit gives nothing back.',
  gana:'YOU MADE IT OUT', ganaS:'Ten floors, and daylight again.',
  otra:'AGAIN',
  fiD:'floor {0} · {1} kills · {2} coins · {3}',
  piso:'FLOOR {0}', salaLimpia:'CLEAR!', abre:'THE DOOR OPENS',
  escalera:'THE STAIRS', jefeAhi:'SOMETHING BIG',
  tomaste:'{0}', cofre:'CHEST', usar:'USE',
  pTuto1:'MOVE with your left thumb',
  pTuto2:'FIRE aims at the closest one by itself',
  pTuto3:'DODGE rolls you and makes you briefly untouchable',
  pTuto4:'Clear the room to open the doors',
  pTuto5:'Find the stairs and go down',
  tutoFin:'THAT IS ALL',
  armas:{pistola:'PISTOL',rafaga:'BURST',escopeta:'SHOTGUN',rifle:'RIFLE',astilla:'SPLINTER',
         orbe:'ORB',trueno:'THUNDER',canon:'CANNON',aguja:'NEEDLE',cruz:'CROSS'},
  mej:{vida:['ONE MORE HEART','raises the cap and heals one'],
       dano:['MORE DAMAGE','+18% on everything you shoot'],
       vel:['LIGHT FEET','+12% movement speed'],
       ener:['BIGGER TANK','+30 energy'],
       rec:['FAST RECHARGE','+6 energy per second'],
       esq:['COOL DODGE','dodge cools down 22% faster'],
       cad:['LOOSE TRIGGER','+14% fire rate'],
       bala:['FAST BULLET','+22% bullet speed'],
       cura:['A BREATHER','heals you fully']},
 },
 pt:{
  idT:'Escolha o idioma', jugar:'DESCER', tuto:'COMO JOGAR', idioma:'IDIOMA',
  sub:'Dez andares. Ninguém voltou.',
  pie:'tudo desenhado em código · sem um único asset',
  rec:'Melhor: andar {0}',
  mjT:'ESCOLHA UMA', mjS:'Só uma, e vale a descida inteira.',
  paT:'PAUSADO', sigue:'CONTINUAR', menu:'MENU',
  muerto:'VOCÊ FICOU LÁ EMBAIXO', muertoS:'O poço não devolve nada.',
  gana:'VOCÊ SAIU', ganaS:'Dez andares, e a luz de novo.',
  otra:'DE NOVO',
  fiD:'andar {0} · {1} abates · {2} moedas · {3}',
  piso:'ANDAR {0}', salaLimpia:'LIMPA!', abre:'A PORTA ABRE',
  escalera:'A ESCADA', jefeAhi:'ALGO GRANDE',
  tomaste:'{0}', cofre:'BAÚ', usar:'USAR',
  pTuto1:'MOVA com o dedo esquerdo',
  pTuto2:'FOGO mira sozinho no mais próximo',
  pTuto3:'ESQ te esquiva e te deixa invencível um instante',
  pTuto4:'Limpe a sala para abrir as portas',
  pTuto5:'Ache a escada e desça',
  tutoFin:'É SÓ ISSO',
  armas:{pistola:'PISTOLA',rafaga:'RAJADA',escopeta:'ESCOPETA',rifle:'RIFLE',astilla:'LASCA',
         orbe:'ORBE',trueno:'TROVÃO',canon:'CANHÃO',aguja:'AGULHA',cruz:'CRUZ'},
  mej:{vida:['MAIS UM CORAÇÃO','sobe o máximo e cura um'],
       dano:['MAIS DANO','+18% em tudo que atirar'],
       vel:['PÉS LEVES','+12% de velocidade'],
       ener:['MAIS ENERGIA','+30 no tanque'],
       rec:['RECARGA RÁPIDA','+6 de energia por segundo'],
       esq:['ESQUIVA FRESCA','a esquiva esfria 22% mais rápido'],
       cad:['GATILHO SOLTO','+14% de cadência'],
       bala:['BALA VELOZ','+22% de velocidade de bala'],
       cura:['UM RESPIRO','cura você por completo']},
 },
};
let IDIOMA = 'en';
function T(k, ...a){
  let s = (LANG[IDIOMA] && LANG[IDIOMA][k]) || LANG.es[k] || k;
  if (typeof s !== 'string') return s;
  a.forEach((v,i)=>{ s = s.split('{'+i+'}').join(v); });
  return s;
}
const TARMA = id => (LANG[IDIOMA].armas[id] || LANG.es.armas[id] || id);
const TMEJ  = id => (LANG[IDIOMA].mej[id]   || LANG.es.mej[id]   || [id,'']);

/* ---------- guardado ---------- */
const GUARDA = {rec:0, visto:0, idioma:''};
function guardaLee(){
  try{
    const s = localStorage.getItem('pozo_v1');
    if (s) Object.assign(GUARDA, JSON.parse(s));
  }catch(e){}
  /* el tutorial se ve cada vez que se abre el juego: se descarta a proposito,
     igual que en ARCO, MEKO y DUNA. Es el unico dato que no sobrevive. */
  GUARDA.visto = 0;
}
function guardaEscribe(){
  if (DEMO) return;
  try{ localStorage.setItem('pozo_v1', JSON.stringify(GUARDA)); }catch(e){}
}

/* ---------- EL ESTADO ---------- */
/* todo lo mutable vive aca y se declara antes de que nadie lo lea */
const JU = {
  modo:'menu',          // menu | juega | mejora | pausa | fin
  piso:1, pisoObj:null, sala:null, salaIx:0,
  t:0, lento:0, hitstop:0,
  bajas:0, monedas:0, seg:0,
  gano:false,
  P:null,               // el jugador
  enemV:[],             // los enemigos VIVOS de la sala actual
  bal:[], eba:[], par:[], flot:[],
  sacX:0, sacY:0, sac:0,
  fog:0,                // fogonazo del arma
  rojo:0,               // velo rojo al recibir
  puerta:0,             // animacion de apertura
};
let ESC = 1, OX = 0, OY = 0, AN = 412, AL = 892;

/* DETRAS DEL MENU CORRE EL JUEGO. Con esta bandera puesta la partida es
   una demo: no abre paneles, no avisa y NO TOCA EL RECORD — si lo tocara,
   el numero del jugador saldria de una partida que no jugo nadie. */
let DEMO = false;
