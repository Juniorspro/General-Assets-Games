
/* ══════════════════════════ LOS TRES IDIOMAS ══════════════════════════
   Ni un texto suelto en el código: todo sale de esta tabla. La razón no es
   prolijidad — es que en Z Force costó 107 claves descubrir que el juego estaba
   «traducido» y el jugador leía el menú en inglés y todo lo demás en castellano.
   Y LAS COSAS QUE SE ARMAN UNA SOLA VEZ GUARDAN LA CLAVE Y NO EL TEXTO: con el
   texto ya resuelto adentro, cambiar de idioma en medio de la partida deja el
   cartel viejo hasta que la cosa cambie sola. */
const TXT = {
  en: {
    sub:'five by five blocks · 3 am',
    cargando:'Paving the streets…',
    cCalles:'Paving the streets…', cVeredas:'Pouring the sidewalks…',
    cCasas:'Building the houses…', cCercas:'Putting up the fences…',
    cLuces:'Wiring the streetlights…', cLluvia:'Bringing the rain…',
    cListo:'Ready',
    mSub:'five by five blocks · 3 am', mJugar:'▶ Walk',
    mCine:'Watch the opening', cSalta:'tap to skip',
    mIdioma:'LANGUAGE', mGraf:'GRAPHICS', gBaja:'LOW', gMedia:'MED', gAlta:'HIGH',
    mHist:'Three in the morning and it will not stop raining. '+
          'Twenty-five blocks, every window dark, and the streetlights buzzing. '+
          'Nobody is out. Walk.',
    mPie:(c,l,p) => c+' houses · '+l+' streetlights · '+p+' m across',
    pTit:'PAUSED', pSeguir:'Resume', pMenu:'Main menu',
    pSub:(m,s) => 'walking for '+m+':'+s,
    bCorrer:'RUN', bLinterna:'LIGHT',
    kMover:'move', kMirar:'look', kCorrer:'run', kLinterna:'flashlight', kPausa:'pause',
    aLinternaOn:'FLASHLIGHT ON', aLinternaOff:'FLASHLIGHT OFF',
    aTrueno:'THUNDER', aEmpapado:'SOAKED THROUGH',
    calle:(a,b) => a+' & '+b,
    /* los nombres de las calles: las que van al norte son avenidas numeradas y
       las que van al este llevan nombre de árbol, que es como está armado
       cualquier barrio de damero */
    ns:['1st','2nd','3rd','4th','5th','6th'],
    ew:['Oak','Maple','Cedar','Birch','Willow','Ash'],
    pistas:['The streetlights are the only thing awake.',
            'Rain hides the sound of your own steps.',
            'Every block looks the same until you look up.',
            'The wires hum when the wind picks up.',
            'Some windows are still lit. Not many.']
  },
  es: {
    sub:'cinco por cinco cuadras · 3 de la mañana',
    cargando:'Asfaltando las calles…',
    cCalles:'Asfaltando las calles…', cVeredas:'Colando las veredas…',
    cCasas:'Levantando las casas…', cCercas:'Poniendo las cercas…',
    cLuces:'Cableando los faroles…', cLluvia:'Trayendo la lluvia…',
    cListo:'Listo',
    mSub:'cinco por cinco cuadras · 3 de la mañana', mJugar:'▶ Caminar',
    mCine:'Ver la cinemática', cSalta:'tocá para saltear',
    mIdioma:'IDIOMA', mGraf:'GRÁFICOS', gBaja:'BAJA', gMedia:'MEDIA', gAlta:'ALTA',
    mHist:'Las tres de la mañana y no para de llover. '+
          'Veinticinco cuadras, todas las ventanas apagadas y los faroles zumbando. '+
          'No hay nadie afuera. Caminá.',
    mPie:(c,l,p) => c+' casas · '+l+' faroles · '+p+' m de lado',
    pTit:'EN PAUSA', pSeguir:'Seguir', pMenu:'Volver al inicio',
    pSub:(m,s) => 'caminando hace '+m+':'+s,
    bCorrer:'CORRER', bLinterna:'LUZ',
    kMover:'moverse', kMirar:'mirar', kCorrer:'correr', kLinterna:'linterna', kPausa:'pausa',
    aLinternaOn:'LINTERNA ENCENDIDA', aLinternaOff:'LINTERNA APAGADA',
    aTrueno:'TRUENO', aEmpapado:'EMPAPADO',
    calle:(a,b) => a+' y '+b,
    ns:['1ª','2ª','3ª','4ª','5ª','6ª'],
    ew:['Roble','Arce','Cedro','Abedul','Sauce','Fresno'],
    pistas:['Los faroles son lo único despierto.',
            'La lluvia tapa el ruido de tus propios pasos.',
            'Todas las cuadras son iguales hasta que mirás para arriba.',
            'Los cables zumban cuando arrecia el viento.',
            'Algunas ventanas siguen encendidas. Pocas.']
  },
  pt: {
    sub:'cinco por cinco quarteirões · 3 da manhã',
    cargando:'Asfaltando as ruas…',
    cCalles:'Asfaltando as ruas…', cVeredas:'Concretando as calçadas…',
    cCasas:'Levantando as casas…', cCercas:'Colocando as cercas…',
    cLuces:'Ligando os postes…', cLluvia:'Trazendo a chuva…',
    cListo:'Pronto',
    mSub:'cinco por cinco quarteirões · 3 da manhã', mJugar:'▶ Caminhar',
    mCine:'Ver a abertura', cSalta:'toque para pular',
    mIdioma:'IDIOMA', mGraf:'GRÁFICOS', gBaja:'BAIXA', gMedia:'MÉDIA', gAlta:'ALTA',
    mHist:'Três da manhã e não para de chover. '+
          'Vinte e cinco quarteirões, todas as janelas apagadas e os postes zumbindo. '+
          'Não há ninguém na rua. Caminhe.',
    mPie:(c,l,p) => c+' casas · '+l+' postes · '+p+' m de lado',
    pTit:'PAUSADO', pSeguir:'Continuar', pMenu:'Voltar ao início',
    pSub:(m,s) => 'caminhando há '+m+':'+s,
    bCorrer:'CORRER', bLinterna:'LUZ',
    kMover:'mover', kMirar:'olhar', kCorrer:'correr', kLinterna:'lanterna', kPausa:'pausa',
    aLinternaOn:'LANTERNA LIGADA', aLinternaOff:'LANTERNA DESLIGADA',
    aTrueno:'TROVÃO', aEmpapado:'ENCHARCADO',
    calle:(a,b) => a+' e '+b,
    ns:['1ª','2ª','3ª','4ª','5ª','6ª'],
    ew:['Carvalho','Bordo','Cedro','Bétula','Salgueiro','Freixo'],
    pistas:['Os postes são a única coisa acordada.',
            'A chuva abafa o som dos seus próprios passos.',
            'Todos os quarteirões são iguais até você olhar para cima.',
            'Os fios zumbem quando o vento aperta.',
            'Algumas janelas ainda estão acesas. Poucas.']
  }
};

let IDIOMA = 'en';
/* SE LLAMA `TX` Y NO `t`. Una función global de una letra es una bomba: la pisa
   cualquier cosa que comparta la página, y cuando se pisa no falla el idioma —
   falla TODO, porque no queda un solo texto que no pase por acá. Ya pasó de
   verdad en otro juego de este repo. */
function TX(k){ const d = TXT[IDIOMA] || TXT.en; return (d[k] !== undefined ? d[k] : (TXT.en[k] !== undefined ? TXT.en[k] : k)); }
function TXF(k, ...a){ const v = TX(k); return typeof v === 'function' ? v(...a) : v; }

function pintaIdioma(){
  for (const e of document.querySelectorAll('[data-i18n]')){
    const v = TX(e.getAttribute('data-i18n'));
    if (typeof v === 'string') e.textContent = v;
  }
  const h = document.getElementById('mHist');
  if (h) h.textContent = TX('mHist');
  document.title = 'BARRIO · ' + TX('mSub');
  /* y lo que ya se está mostrando ahora mismo */
  if (window.repintaJuego) window.repintaJuego();
}
function ponIdioma(v){
  if (!TXT[v]) return;
  IDIOMA = v;
  try { localStorage.setItem('barrio.idioma', v); } catch(e){}
  for (const b of document.querySelectorAll('#idioma button'))
    b.classList.toggle('sel', b.getAttribute('data-lang') === v);
  pintaIdioma();
  /* LAS FICHAS DEL MENÚ SE MARCAN ACÁ y no desde el gancho de repintado: ése se
     cuelga al final del arranque —después de construir el barrio, que son
     segundos— mientras que la pantalla de idioma se toca en el primero. */
  if (typeof pintaAjustes === 'function') pintaAjustes();
}
