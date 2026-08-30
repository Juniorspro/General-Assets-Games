/* ══════════════════════════════════════════════════════════════════════════
   LOS TRES IDIOMAS

   NO HAY UNA SOLA CADENA SUELTA EN EL CÓDIGO: todo lo que el jugador lee sale
   de esta tabla. Es la misma regla que ya rige en Maicol y en Eco, y no es
   prolijidad: el día que se agrega un cartel escrito derecho en el código, ese
   cartel queda en castellano para siempre y nadie se entera hasta que alguien
   juega en inglés — que es exactamente lo que pasó en Z Force, donde de 288
   cadenas visibles quedaban 25 sin traducir.

   LA FUNCIÓN SE LLAMA `TX` Y NO `t`. Una función global de una letra es una
   bomba: cualquier script que comparta la página —o un `eval` con un `var t`
   adentro— la pisa, y cuando se pisa no falla el idioma, falla TODO, porque no
   queda un solo texto que no pase por ahí. Ya rompió una prueba entera en este
   repositorio.

   ARRANCA EN INGLÉS, que es lo que se pidió para los otros juegos del portal, y
   se guarda en `localStorage`. La pantalla de idioma va ANTES del menú: elegir
   idioma dentro de un menú ya escrito en un idioma que no entendés no sirve de
   nada.
   ══════════════════════════════════════════════════════════════════════════ */
const TXT = {
  en: {
    /* pantalla de carga */
    cargando:'Seeding the island…', cSitios:'Looking for a place to camp…',
    cCueva:'Digging…', cTerreno:'Raising the ground…', cAgua:'Pouring the sea…',
    cBosque:'Planting the forest…', cSitiosArm:'Setting up the camp…',
    cNubes:'Hanging the clouds…', cListo:'Ready',
    /* menú */
    mSub:'the camel island', mJugar:'▶ Play', mIdioma:'LANGUAGE', mGraf:'GRAPHICS',
    gBaja:'LOW', gMedia:'MED', gAlta:'HIGH',
    mHist:'You came camping with three friends to an island that is on no map. '+
          'There were footprints in the sand. They were nobody in the group’s.',
    mPie:(a,s,m) => a+' trees · '+s+' places · '+m+' m across',
    /* botones y teclas */
    bCorrer:'RUN', bAgachar:'CROUCH', bSaltar:'JUMP', bUsar:'USE',
    kMover:'move', kCorrer:'run', kAgachar:'crouch', kSaltar:'jump', kUsar:'use',
    /* minijuego */
    miTit:'INFLATING THE TYRE', miBtn:'PUMP',
    miAyuda:(t) => 'Tap when the line crosses the green'+(t?' · <b>Space</b> on PC':''),
    miBien:(n) => 'Good! '+n+' to go', miMal:'Missed… keep pumping',
    miFin:'The tyre is up!',
    /* pausa */
    pTit:'Paused', pSeguir:'Resume', pReinicia:'Restart', pMenu:'Menu',
    pSub:(m,s) => m+' min '+s+' s on the island',
    /* objetivos */
    oNum:(i) => 'OBJECTIVE '+i+' OF 7', oFinN:'IT IS OVER',
    oFinT:'Run', oFinS:'Don’t look back',
    m0n:'Wood for the fire',   m0s:'Gather 5 branches in the forest',
    m1n:'The flat tyre',       m1s:'The pump is in the truck',
    m2n:'The trail',           m2s:'Something was dragged into the woods',
    m3n:'A torch',             m3s:'A branch, canvas from a tent and the lighter',
    m4n:'Into the cave',       m4s:'The torch is lit. Go in.',
    m5n:'The keys',            m5s:'They must be in there somewhere',
    m6n:'Get to the truck',    m6s:'Run. Do not look back.',
    sRamas:(n) => 'You have '+n+' of 5',
    sAntorcha:(r,t,f) => r+' branch   '+t+' canvas   '+f+' lighter',
    sInflar:'Now crouch by the tyre',
    /* carteles de las cosas */
    rRama:'Pick up a branch', rAuto:'Check the truck', rRueda:'Crouch and inflate',
    rCueva:'Look at the cave', rCarpa:'Tear off some canvas', rLlaves:'Take the keys',
    rEntra:'Go into the cave', rEscapa:'Get in and drive',
    /* avisos */
    aRamas:'Five branches. There is fire for tonight.',
    aInflador:'Pump in hand', aEncendedor:'Lighter in hand',
    aFaltaInflador:'You need the pump: it is in the truck',
    aCueva:'Pitch black in there. You would need a light.',
    aCuerpos:'…they are all here.',
    aTrabado:'Your leg gives out',
    aLona:'A piece of canvas, and one of the branches',
    aAntorcha:'Torch ready. Now the keys.',
    aCorre:'RUN!', aAlcanzo:'IT CAUGHT YOU! · back to camp',
    aVuelo:'Free flight', aSuelo:'Back on the ground',
    /* la historia */
    g0:'Four friends. An island on no map.',
    g1:'They pitched the tents and lit the fire before the sun went down.',
    g2:'The camp was ready before dark.',
    g3:'—Did you hear that? Nobody heard anything.',
    g4:'They went to sleep.',
    g5:'When Lemi woke up, there was nobody left.',
    g6:'Only a trail leading out of the camp.',
    f0:'The engine turns over on the second try.',
    f1:'Nobody came looking for them.',
    f2:'LEMI',
    cSaltar:'SKIP ▸'
  },
  es: {
    cargando:'Sembrando la isla…', cSitios:'Buscando dónde acampar…',
    cCueva:'Cavando…', cTerreno:'Levantando el terreno…', cAgua:'Sirviendo el mar…',
    cBosque:'Plantando el bosque…', cSitiosArm:'Armando el campamento…',
    cNubes:'Colgando las nubes…', cListo:'Listo',
    mSub:'la isla del camello', mJugar:'▶ Jugar', mIdioma:'IDIOMA', mGraf:'GRÁFICOS',
    gBaja:'BAJA', gMedia:'MEDIA', gAlta:'ALTA',
    mHist:'Viniste a acampar con tres amigos a una isla que no figura en ningún mapa. '+
          'En la arena había huellas. No eran de nadie del grupo.',
    mPie:(a,s,m) => a+' árboles · '+s+' sitios · '+m+' m de lado',
    bCorrer:'CORRER', bAgachar:'AGACHAR', bSaltar:'SALTAR', bUsar:'USAR',
    kMover:'moverse', kCorrer:'correr', kAgachar:'agacharse', kSaltar:'saltar', kUsar:'usar',
    miTit:'INFLANDO LA RUEDA', miBtn:'BOMBEAR',
    miAyuda:(t) => 'Tocá cuando la línea pase por el verde'+(t?' · <b>Espacio</b> en PC':''),
    miBien:(n) => '¡Bien! '+n+' más', miMal:'Se escapó… seguí bombeando',
    miFin:'¡La rueda está inflada!',
    pTit:'En pausa', pSeguir:'Reanudar', pReinicia:'Reiniciar', pMenu:'Menú',
    pSub:(m,s) => m+' min '+s+' s en la isla',
    oNum:(i) => 'OBJETIVO '+i+' DE 7', oFinN:'SE TERMINÓ',
    oFinT:'Corré', oFinS:'No mires atrás',
    m0n:'Ramas para el fuego',  m0s:'Juntá 5 ramas en el bosque',
    m1n:'La rueda pinchada',    m1s:'El inflador está en la camioneta',
    m2n:'El rastro',            m2s:'Alguien se arrastró hasta el monte',
    m3n:'Una antorcha',         m3s:'Una rama, tela de una carpa y el encendedor',
    m4n:'Entrar a la cueva',    m4s:'La antorcha está prendida. Entrá.',
    m5n:'Las llaves',           m5s:'Tienen que estar ahí adentro',
    m6n:'Llegar a la camioneta', m6s:'Corré. No mires atrás.',
    sRamas:(n) => 'Llevás '+n+' de 5',
    sAntorcha:(r,t,f) => r+' rama   '+t+' lona   '+f+' encendedor',
    sInflar:'Ahora agachate junto a la rueda',
    rRama:'Levantar una rama', rAuto:'Revisar la camioneta', rRueda:'Agacharse a inflar',
    rCueva:'Mirar la cueva', rCarpa:'Arrancar un pedazo de lona', rLlaves:'Agarrar las llaves',
    rEntra:'Entrar a la cueva', rEscapa:'Subirse y arrancar',
    aRamas:'Cinco ramas. Ya hay fuego para la noche.',
    aInflador:'Inflador en la mano', aEncendedor:'Encendedor en la mano',
    aFaltaInflador:'Falta el inflador: está en la camioneta',
    aCueva:'Ahí adentro está negro. Haría falta una luz.',
    aCuerpos:'…están todos acá.',
    aTrabado:'La pierna no responde',
    aLona:'Un pedazo de lona, y una de las ramas',
    aAntorcha:'Antorcha lista. Ahora las llaves.',
    aCorre:'¡CORRÉ!', aAlcanzo:'¡TE ALCANZÓ! · volvés al campamento',
    aVuelo:'Vuelo libre', aSuelo:'De vuelta al suelo',
    g0:'Cuatro amigos. Una isla que no figura en ningún mapa.',
    g1:'Levantaron las carpas y prendieron el fuego antes de que cayera el sol.',
    g2:'El campamento quedó armado antes de que oscureciera.',
    g3:'—¿Escucharon eso? Nadie escuchó nada.',
    g4:'Se fueron a dormir.',
    g5:'Cuando Lemi se despertó, no había nadie.',
    g6:'Sólo un rastro que salía del campamento.',
    f0:'El motor arranca al segundo intento.',
    f1:'Nadie fue a buscarlos.',
    f2:'LEMI',
    cSaltar:'SALTEAR ▸'
  },
  pt: {
    cargando:'Semeando a ilha…', cSitios:'Procurando onde acampar…',
    cCueva:'Cavando…', cTerreno:'Levantando o terreno…', cAgua:'Servindo o mar…',
    cBosque:'Plantando a floresta…', cSitiosArm:'Montando o acampamento…',
    cNubes:'Pendurando as nuvens…', cListo:'Pronto',
    mSub:'a ilha do camelo', mJugar:'▶ Jogar', mIdioma:'IDIOMA', mGraf:'GRÁFICOS',
    gBaja:'BAIXA', gMedia:'MÉDIA', gAlta:'ALTA',
    mHist:'Você veio acampar com três amigos numa ilha que não está em nenhum mapa. '+
          'Havia pegadas na areia. Não eram de ninguém do grupo.',
    mPie:(a,s,m) => a+' árvores · '+s+' lugares · '+m+' m de lado',
    bCorrer:'CORRER', bAgachar:'AGACHAR', bSaltar:'PULAR', bUsar:'USAR',
    kMover:'mover', kCorrer:'correr', kAgachar:'agachar', kSaltar:'pular', kUsar:'usar',
    miTit:'ENCHENDO O PNEU', miBtn:'BOMBEAR',
    miAyuda:(t) => 'Toque quando a linha passar pelo verde'+(t?' · <b>Espaço</b> no PC':''),
    miBien:(n) => 'Boa! Faltam '+n, miMal:'Escapou… continue bombeando',
    miFin:'O pneu está cheio!',
    pTit:'Em pausa', pSeguir:'Continuar', pReinicia:'Reiniciar', pMenu:'Menu',
    pSub:(m,s) => m+' min '+s+' s na ilha',
    oNum:(i) => 'OBJETIVO '+i+' DE 7', oFinN:'ACABOU',
    oFinT:'Corra', oFinS:'Não olhe para trás',
    m0n:'Lenha para o fogo',    m0s:'Junte 5 galhos na floresta',
    m1n:'O pneu furado',        m1s:'A bomba está na caminhonete',
    m2n:'O rastro',             m2s:'Alguém foi arrastado para o mato',
    m3n:'Uma tocha',            m3s:'Um galho, lona de uma barraca e o isqueiro',
    m4n:'Entrar na caverna',    m4s:'A tocha está acesa. Entre.',
    m5n:'As chaves',            m5s:'Têm que estar lá dentro',
    m6n:'Chegar na caminhonete', m6s:'Corra. Não olhe para trás.',
    sRamas:(n) => 'Você tem '+n+' de 5',
    sAntorcha:(r,t,f) => r+' galho   '+t+' lona   '+f+' isqueiro',
    sInflar:'Agora agache ao lado do pneu',
    rRama:'Pegar um galho', rAuto:'Revisar a caminhonete', rRueda:'Agachar e encher',
    rCueva:'Olhar a caverna', rCarpa:'Arrancar um pedaço de lona', rLlaves:'Pegar as chaves',
    rEntra:'Entrar na caverna', rEscapa:'Entrar e dar a partida',
    aRamas:'Cinco galhos. Já tem fogo para a noite.',
    aInflador:'Bomba na mão', aEncendedor:'Isqueiro na mão',
    aFaltaInflador:'Falta a bomba: está na caminhonete',
    aCueva:'Lá dentro está escuro. Precisaria de uma luz.',
    aCuerpos:'…estão todos aqui.',
    aTrabado:'A perna não responde',
    aLona:'Um pedaço de lona, e um dos galhos',
    aAntorcha:'Tocha pronta. Agora as chaves.',
    aCorre:'CORRA!', aAlcanzo:'ELE TE PEGOU! · de volta ao acampamento',
    aVuelo:'Voo livre', aSuelo:'De volta ao chão',
    g0:'Quatro amigos. Uma ilha que não está em nenhum mapa.',
    g1:'Montaram as barracas e acenderam o fogo antes do sol se pôr.',
    g2:'O acampamento ficou pronto antes de escurecer.',
    g3:'—Ouviram isso? Ninguém ouviu nada.',
    g4:'Foram dormir.',
    g5:'Quando Lemi acordou, não havia mais ninguém.',
    g6:'Só um rastro que saía do acampamento.',
    f0:'O motor pega na segunda tentativa.',
    f1:'Ninguém foi procurá-los.',
    f2:'LEMI',
    cSaltar:'PULAR ▸'
  }
};

let IDIOMA = 'en';
try { const g = localStorage.getItem('lemi.idioma');
      if (g && TXT[g]) IDIOMA = g; } catch(e){}

/* devuelve el texto de la clave. Si en un idioma falta, cae al inglés y no a
   `undefined`: un hueco tiene que verse como una frase en otro idioma, no como
   un cartel vacío. */
function TX(clave){
  const d = TXT[IDIOMA];
  const v = (d && d[clave] !== undefined) ? d[clave] : TXT.en[clave];
  return v === undefined ? clave : v;
}
/* y ésta es para las que llevan números adentro: `TX` devuelve la función y
   `TXF` la llama, así quien la usa no tiene que saber cuál de las dos es. */
function TXF(clave, ...args){
  const v = TX(clave);
  return typeof v === 'function' ? v(...args) : v;
}

/* ── repinta TODO el texto de la página ──
   Un barrido por `data-i18n` más los pocos sitios que llevan HTML adentro. Va
   una sola función y no un `if` por elemento: el próximo cartel que se agregue
   se traduce solo con ponerle el atributo, que es lo contrario de lo que pasa
   cuando cada sitio se acuerda de traducirse por su cuenta. */
function pintaIdioma(){
  for (const e of document.querySelectorAll('[data-i18n]'))
    e.textContent = TX(e.getAttribute('data-i18n'));
  const h = document.getElementById('mHist');
  if (h) h.textContent = TX('mHist');
  const mp = document.getElementById('miPie');
  if (mp) mp.innerHTML = TXF('miAyuda', document.body.classList.contains('pc'));
  const tc = document.getElementById('teclas');
  if (tc) tc.innerHTML =
      '<b>W A S D</b> ' + TX('kMover') + ' · <b>' + (IDIOMA === 'en' ? 'mouse' : IDIOMA === 'pt' ? 'mouse' : 'ratón') + '</b> ' +
      (IDIOMA === 'en' ? 'look' : IDIOMA === 'pt' ? 'olhar' : 'mirar') + '<br>' +
      '<b>Shift</b> ' + TX('kCorrer') + ' · <b>Ctrl</b> ' + TX('kAgachar') + '<br>' +
      '<b>' + (IDIOMA === 'en' ? 'Space' : IDIOMA === 'pt' ? 'Espaço' : 'Espacio') + '</b> ' + TX('kSaltar') +
      ' · <b>E</b> ' + TX('kUsar') + ' · <b>Esc</b> ' + (IDIOMA === 'en' ? 'pause' : IDIOMA === 'pt' ? 'pausa' : 'pausa');
  document.title = 'LEMI · ' + TX('mSub');
  /* y lo que el juego ya está mostrando ahora mismo: los objetivos, el cartel
     de lo que hay cerca y el pie del menú. Sin esto, cambiar de idioma en medio
     de una partida deja el panel de misión en el idioma anterior hasta que
     cambie de misión sola. */
  if (window.repintaJuego) window.repintaJuego();
}
function ponIdioma(v){
  if (!TXT[v]) return;
  IDIOMA = v;
  try { localStorage.setItem('lemi.idioma', v); } catch(e){}
  for (const b of document.querySelectorAll('#idioma button'))
    b.classList.toggle('sel', b.getAttribute('data-lang') === v);
  pintaIdioma();
  /* Y LAS FICHAS DEL MENÚ SE MARCAN ACÁ Y NO EN `repintaJuego`. Puesto allá no
     corría nunca en el momento que importa: `window.repintaJuego` se asigna al
     FINAL del arranque —después de sembrar la isla, que son diez segundos— y la
     pantalla de idioma se elige en el primero. Medido: con el castellano puesto,
     la fila del menú seguía mostrando EN resaltada. `pintaAjustes` es una
     declaración de función, o sea que está izada en todo el módulo: llamarla
     desde acá funciona aunque `f.js` todavía no se haya evaluado del todo. */
  if (typeof pintaAjustes === 'function') pintaAjustes();
}

/* los números de la isla se guardan para poder rehacer el pie del menú al
   cambiar de idioma: sin esto, el pie queda con la frase del idioma anterior */
let ISLA_DATOS = null;
