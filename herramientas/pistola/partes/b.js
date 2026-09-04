
/* ══════════════════════════ LAS MEDIDAS DEL JUEGO ══════════════════════════
   Todo en METROS y segundos, y todo derivado de tres decisiones que sí se
   eligen: cuánto mide un piso, cuánto empuja un disparo y cuánto tarda la
   pistola en caer un piso. De ahí sale el resto, así que cambiar la gravedad no
   deja ocho constantes viejas apuntando a otro juego. */
const M = {
  g: 22,                 /* gravedad */
  /* ── EL PISO MIDE LO QUE UN TIRO LEVANTA, Y ESE ES EL NUMERO DE FONDO ──
     Estaba en 4,6 con un retroceso de 9,4: un tiro a fondo sube v²/2g = 1,84 m,
     o sea el 40 % de un piso. Medido con el auto-jugador, la pistola se quedaba
     rebotando debajo de la primera losa (maxY 4,47 contra 4,6) y no mataba a
     NADIE en 600 tiros — el juego no se podia terminar. Ahora un tiro recto
     hacia abajo levanta 11,5²/(2·22) = 3,00 m, o sea EXACTAMENTE un piso: subir
     es una decision de puntería y no una carambola. */
  piso: 3.0,             /* de un piso al siguiente */
  /* ── EL ANCHO DE LA TORRE ES EL QUE LA CAMARA ENCUADRA, Y NO OTRO ──
     Estaba en 9 metros con la camara calculada para 5,4: medido con la sonda de
     proyeccion, los ladrones del primer piso caian en x = −0,05 y 1,23 de
     pantalla, o sea FUERA por los dos lados. Y eso no se ve como «faltan
     ladrones», se ve como un nivel vacio. Los dos numeros son el mismo numero. */
  ancho: 5.4,
  retro: 11.5,           /* el empujón de un disparo, en m/s */
  /* ── LA PISTOLA NO SE CAE DE COSTADO: EL ANGULO ES SOLO PUNTERIA ──
     Estaba en 5,2 rad/s de tiron por disparo mas el giro que le metia cada
     rebote, y eso hace dos cosas malas a la vez: el arma da vueltas de canto
     —que es lo que se pidio sacar— y la mira deja de significar algo, porque
     entre que uno apunta y suelta el caño ya se movio. Con el giro en cero,
     `P.ang` es EXACTAMENTE lo que el dedo dice y la linea es una promesa. */
  /* ── EL GIRO ES CONSECUENCIA DEL DISPARO, Y ESE ES EL JUEGO ──
     La bala sale por la boca, que está a 21 cm del centro de masa: eso es un
     PAR, y un par hace girar. Así que apuntar no es arrastrar el dedo — es
     elegir el MOMENTO. La pistola gira sola después de cada tiro, el giro se
     va frenando, y mantener apretado frena el tiempo para que se pueda soltar
     justo cuando la línea pasa por el ladrón.
     Y eso ordena todo lo demás: el retroceso ya movía la posición, ahora
     también mueve la puntería, así que cada tiro paga dos cosas a la vez y
     gastar uno para acomodarse es un tiro que no mata a nadie. */
  retroGiro: 5.5,        /* el tirón angular de cada disparo, en rad/s */
  bala: 46,              /* velocidad de la bala */
  rebote: 0.42,          /* cuánto conserva la pistola al rebotar */
  /* el roce que frena el giro: con 1,1 cada tiro da unos 5 radianes —cuatro
     quintos de vuelta— antes de quedarse quieto, que es lo que hace que soltar
     tarde signifique otro ángulo y no el mismo */
  roceAng: 1.1,          /* cuánto se frena el giro por segundo */
  /* ── EL ARMA SE DIBUJA MAS GRANDE QUE UNA DE VERDAD, Y ES A PROPOSITO ──
     La camara encuadra 5,4 m de ancho en 412 px: son 76 px por metro, o sea que
     una pistola de tamaño real mide VEINTE PIXELES. Medido con los listeners de
     verdad, un arrastre de 100 px la gira de 0,6 a 1,6 rad — o sea 57 grados— y
     en veinte pixeles eso mueve la punta del cañon diez: desde el asiento del
     jugador se lee «no gira, queda ahi tieso», y tenia razon. El giro no estaba
     roto, estaba abajo del umbral en el que se ve.
     Aca la pistola no es un accesorio: es el PERSONAJE, asi que se dibuja a la
     escala de un personaje. A 0,42 mide 32 px y es el 28 % del alto de un
     ladron — que es exactamente lo que hace este genero. */
  largo: 0.42,           /* el largo de la pistola */
  /* de donde sale la bala, medido desde el centro: es el MISMO numero que usan
     el disparo, la linea de la mira y las chispas del fogonazo, asi que no
     pueden apuntar a sitios distintos */
  boca: 0.21,
  lento: 0.16,           /* el factor de la cámara lenta */
  entraLento: 0.10,      /* cuánto tarda en entrar y salir */
  cadencia: 0.22,        /* mínimo entre dos disparos */
  vidas: 3
};
const NIVELES = 10;

/* ── LOS TRES ESCALONES DE CALIDAD ──
   Cambian lo que CUESTA y no lo que el juego es: los mismos diez niveles, los
   mismos ladrones y la misma física en los tres. Lo que se mueve es cuántos
   píxeles hay que rellenar y si hay sombras, que es una pasada entera de la
   escena. */
const CALIDADES = {
  baja:  { esc: 0.55, sombras: false, part: 40 },
  media: { esc: 0.78, sombras: true,  part: 90 },
  alta:  { esc: 1.00, sombras: true,  part: 160 }
};
let CALIDAD = 'media';

const $ = (id) => document.getElementById(id);
const cl = (v, a, b) => v < a ? a : (v > b ? b : v);
const lerp = (a, b, t) => a + (b - a)*t;

/* ── EL AZAR VA CON SEMILLA, SIEMPRE ──
   Un nivel tiene que ser EL MISMO nivel cada vez que se entra: con `Math.random`
   el 7 sería otro nivel en cada intento y no habría nada que aprender. */
let SEM = 1;
function sem(n){ SEM = (n >>> 0) || 1; for (let i = 0; i < 6; i++) az(); }
function az(){ SEM = (SEM*1664525 + 1013904223) >>> 0; return SEM/4294967296; }
const azr = (a, b) => a + az()*(b - a);
const azi = (a, b) => a + ((az()*(b - a + 1))|0);

/* ══════════════════════════ LOS TEXTOS ══════════════════════════ */
const TXT = {
  es: { sub:'DIEZ PISOS Y UNA PISTOLA', jugar:'JUGAR', menu:'MENÚ', sigue:'SIGUIENTE',
        reintenta:'DE NUEVO',
        texto:'Sos la pistola. Cada tiro te empuja para atrás Y te hace girar: la puntería no se arrastra, se elige el momento. Mantené apretado para que el tiempo vaya lento, mirá la línea, y soltá justo cuando pase por el ladrón.',
        nivel:'PISO', vidas:'VIDAS', ladrones:'LADRONES',
        p1:'La pistola gira sola. Mantené apretado: el tiempo se frena.',
        p2:'Soltá cuando la línea apunte al ladrón. El tiro te empuja y te gira.',
        gano:'PISO LIMPIO', perdio:'TE AGARRARON', fin:'BANCO LIMPIO',
        finT:'Los diez pisos, sin ladrones.',
        calidad:'GRÁFICOS', baja:'BAJA', media:'MEDIA', alta:'ALTA',
        pie:'Mantené para frenar el tiempo. Soltá en el ángulo justo.' },
  en: { sub:'TEN FLOORS AND ONE GUN', jugar:'PLAY', menu:'MENU', sigue:'NEXT',
        reintenta:'RETRY',
        texto:'You are the gun. Every shot pushes you back AND spins you: you do not drag to aim, you pick the moment. Hold to slow time down, watch the line, and release right when it crosses a thief.',
        nivel:'FLOOR', vidas:'LIVES', ladrones:'THIEVES',
        p1:'The gun spins on its own. Hold down: time slows.',
        p2:'Release when the line points at a thief. The shot pushes and spins you.',
        gano:'FLOOR CLEARED', perdio:'THEY GOT YOU', fin:'BANK CLEARED',
        finT:'All ten floors, no thieves left.',
        calidad:'GRAPHICS', baja:'LOW', media:'MEDIUM', alta:'HIGH',
        pie:'Hold to slow time. Release at the right angle.' },
  pt: { sub:'DEZ ANDARES E UMA PISTOLA', jugar:'JOGAR', menu:'MENU', sigue:'PRÓXIMO',
        reintenta:'DE NOVO',
        texto:'Você é a pistola. Cada tiro te empurra para trás E te faz girar: mirar não é arrastar, é escolher o momento. Segure para o tempo ficar lento, olhe a linha, e solte bem quando ela passar pelo ladrão.',
        nivel:'ANDAR', vidas:'VIDAS', ladrones:'LADRÕES',
        p1:'A pistola gira sozinha. Segure: o tempo desacelera.',
        p2:'Solte quando a linha apontar ao ladrão. O tiro te empurra e te gira.',
        gano:'ANDAR LIMPO', perdio:'TE PEGARAM', fin:'BANCO LIMPO',
        finT:'Os dez andares, sem ladrões.',
        calidad:'GRÁFICOS', baja:'BAIXA', media:'MÉDIA', alta:'ALTA',
        pie:'Segure para frear o tempo. Solte no ângulo certo.' }
};
let LANG = 'en';
const TX = (k) => (TXT[LANG] && TXT[LANG][k]) || TXT.es[k] || k;
