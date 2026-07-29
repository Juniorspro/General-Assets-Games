/* Textos de interfaz. Ningun string visible vive en el codigo del juego. */

export const LANGS = [
  { id:'es', label:'Español',   flag:'ES' },
  { id:'en', label:'English',   flag:'EN' },
  { id:'pt', label:'Português', flag:'PT' },
  { id:'fr', label:'Français',  flag:'FR' }
];

const D = {
  es: {
    'boot.ready':'TOCA PARA CONTINUAR',
    'boot.tip.0':'Acelera con el gatillo derecho y gira arrastrando o con las flechas.',
    'boot.tip.1':'Adelantar rozando puntúa mucho más que adelantar de lejos.',
    'boot.tip.2':'Tres pases seguidos suben el multiplicador; se corta a los 2 segundos.',
    'boot.tip.3':'Por encima de 100 km/h cada metro puntúa más.',
    'boot.tip.4':'En el garaje puedes mejorar motor, aceleración, frenos y agarre.',
    'lang.title':'IDIOMA', 'lang.sub':'Puedes cambiarlo luego en Ajustes.',
    'q.title':'CALIDAD GRÁFICA', 'q.sub':'Si va a tirones, baja un nivel. Se cambia en Ajustes.',
    'q.low':'BAJA', 'q.med':'MEDIA', 'q.high':'ALTA', 'q.ultra':'MÁXIMA',
    'q.lowd':'Para móviles antiguos', 'q.medd':'Equilibrado',
    'q.highd':'Recomendado', 'q.ultrad':'Para equipos potentes',
    'menu.play':'CONDUCIR', 'menu.garage':'GARAJE', 'menu.settings':'AJUSTES',
    'menu.credits':'CRÉDITOS', 'menu.cash':'CAJA', 'menu.best':'RÉCORD', 'menu.km':'KM TOTALES',
    'garage.title':'GARAJE', 'garage.select':'SELECCIONAR', 'garage.selected':'EN USO',
    'garage.buy':'COMPRAR {v}', 'garage.nocash':'Caja insuficiente',
    'garage.top':'Punta', 'garage.acc':'Aceleración', 'garage.brk':'Frenos', 'garage.grp':'Agarre',
    'garage.upgrades':'MEJORAS', 'garage.max':'MÁXIMO',
    'up.engine':'Motor', 'up.accel':'Aceleración', 'up.brakes':'Frenos', 'up.grip':'Agarre',
    'hud.gear':'MARCHA', 'hud.dist':'DISTANCIA', 'hud.score':'PUNTOS',
    'hud.close':'¡ROCE!', 'hud.overtake':'ADELANTAMIENTO',
    'pause.title':'PAUSA', 'pause.resume':'CONTINUAR', 'pause.restart':'REINICIAR', 'pause.menu':'MENÚ',
    'res.title':'FIN DEL RECORRIDO', 'res.score':'PUNTOS', 'res.dist':'Distancia',
    'res.over':'Adelantamientos', 'res.close':'Roces', 'res.top':'Punta', 'res.combo':'Mejor combo',
    'res.cash':'Caja ganada', 'res.newbest':'¡NUEVO RÉCORD!', 'res.again':'OTRA VEZ', 'res.menu':'MENÚ',
    'set.title':'AJUSTES', 'set.lang':'Idioma', 'set.quality':'Calidad', 'set.music':'Música',
    'set.sfx':'Efectos', 'set.sens':'Sensibilidad', 'set.haptics':'Vibración',
    'set.invert':'Invertir giro', 'set.reset':'BORRAR PROGRESO',
    'set.resetAsk':'¿Borrar caja, motos, mejoras y récords?',
    'cred.title':'CRÉDITOS',
    'cred.body':'Juego original del género de conducción en moto en primera persona.\nNo es un clon de ningún título comercial: se replican mecánicas, con arte y sonido propios.\nMotor: three.js. Modelos, texturas y audio generados para este proyecto.',
    'common.back':'VOLVER', 'common.on':'SÍ', 'common.off':'NO', 'common.tap':'TOCA PARA EMPEZAR'
  },
  en: {
    'boot.ready':'TAP TO CONTINUE',
    'boot.tip.0':'Throttle with the right trigger, steer by dragging or with the arrows.',
    'boot.tip.1':'Passing close scores far more than passing wide.',
    'boot.tip.2':'Three passes in a row raise the multiplier; it drops after 2 seconds.',
    'boot.tip.3':'Above 100 km/h every metre is worth more.',
    'boot.tip.4':'In the garage you can upgrade engine, acceleration, brakes and grip.',
    'lang.title':'LANGUAGE', 'lang.sub':'You can change it later in Settings.',
    'q.title':'GRAPHICS QUALITY', 'q.sub':'If it stutters, drop a level. Changeable in Settings.',
    'q.low':'LOW', 'q.med':'MEDIUM', 'q.high':'HIGH', 'q.ultra':'ULTRA',
    'q.lowd':'For older phones', 'q.medd':'Balanced',
    'q.highd':'Recommended', 'q.ultrad':'For powerful machines',
    'menu.play':'RIDE', 'menu.garage':'GARAGE', 'menu.settings':'SETTINGS',
    'menu.credits':'CREDITS', 'menu.cash':'CASH', 'menu.best':'BEST', 'menu.km':'TOTAL KM',
    'garage.title':'GARAGE', 'garage.select':'SELECT', 'garage.selected':'IN USE',
    'garage.buy':'BUY {v}', 'garage.nocash':'Not enough cash',
    'garage.top':'Top speed', 'garage.acc':'Acceleration', 'garage.brk':'Brakes', 'garage.grp':'Grip',
    'garage.upgrades':'UPGRADES', 'garage.max':'MAX',
    'up.engine':'Engine', 'up.accel':'Acceleration', 'up.brakes':'Brakes', 'up.grip':'Grip',
    'hud.gear':'GEAR', 'hud.dist':'DISTANCE', 'hud.score':'SCORE',
    'hud.close':'CLOSE PASS!', 'hud.overtake':'OVERTAKE',
    'pause.title':'PAUSED', 'pause.resume':'RESUME', 'pause.restart':'RESTART', 'pause.menu':'MENU',
    'res.title':'RUN OVER', 'res.score':'SCORE', 'res.dist':'Distance',
    'res.over':'Overtakes', 'res.close':'Close passes', 'res.top':'Top speed', 'res.combo':'Best combo',
    'res.cash':'Cash earned', 'res.newbest':'NEW BEST!', 'res.again':'RIDE AGAIN', 'res.menu':'MENU',
    'set.title':'SETTINGS', 'set.lang':'Language', 'set.quality':'Quality', 'set.music':'Music',
    'set.sfx':'Effects', 'set.sens':'Sensitivity', 'set.haptics':'Haptics',
    'set.invert':'Invert steering', 'set.reset':'WIPE PROGRESS',
    'set.resetAsk':'Wipe cash, bikes, upgrades and records?',
    'cred.title':'CREDITS',
    'cred.body':'An original game in the first-person motorcycle riding genre.\nNot a clone of any commercial title: mechanics are replicated, with original art and sound.\nEngine: three.js. Models, textures and audio generated for this project.',
    'common.back':'BACK', 'common.on':'ON', 'common.off':'OFF', 'common.tap':'TAP TO START'
  },
  pt: {
    'boot.ready':'TOQUE PARA CONTINUAR',
    'boot.tip.0':'Acelere com o gatilho direito e vire arrastando ou com as setas.',
    'boot.tip.1':'Passar raspando pontua muito mais que passar longe.',
    'boot.tip.2':'Três passagens seguidas aumentam o multiplicador; cai após 2 segundos.',
    'boot.tip.3':'Acima de 100 km/h cada metro vale mais.',
    'boot.tip.4':'Na garagem você melhora motor, aceleração, freios e aderência.',
    'lang.title':'IDIOMA', 'lang.sub':'Pode mudar depois em Ajustes.',
    'q.title':'QUALIDADE GRÁFICA', 'q.sub':'Se travar, baixe um nível. Muda em Ajustes.',
    'q.low':'BAIXA', 'q.med':'MÉDIA', 'q.high':'ALTA', 'q.ultra':'MÁXIMA',
    'q.lowd':'Para celulares antigos', 'q.medd':'Equilibrado',
    'q.highd':'Recomendado', 'q.ultrad':'Para máquinas potentes',
    'menu.play':'PILOTAR', 'menu.garage':'GARAGEM', 'menu.settings':'AJUSTES',
    'menu.credits':'CRÉDITOS', 'menu.cash':'CAIXA', 'menu.best':'RECORDE', 'menu.km':'KM TOTAIS',
    'garage.title':'GARAGEM', 'garage.select':'SELECIONAR', 'garage.selected':'EM USO',
    'garage.buy':'COMPRAR {v}', 'garage.nocash':'Caixa insuficiente',
    'garage.top':'Velocidade', 'garage.acc':'Aceleração', 'garage.brk':'Freios', 'garage.grp':'Aderência',
    'garage.upgrades':'MELHORIAS', 'garage.max':'MÁXIMO',
    'up.engine':'Motor', 'up.accel':'Aceleração', 'up.brakes':'Freios', 'up.grip':'Aderência',
    'hud.gear':'MARCHA', 'hud.dist':'DISTÂNCIA', 'hud.score':'PONTOS',
    'hud.close':'RASPOU!', 'hud.overtake':'ULTRAPASSAGEM',
    'pause.title':'PAUSA', 'pause.resume':'CONTINUAR', 'pause.restart':'REINICIAR', 'pause.menu':'MENU',
    'res.title':'FIM DO PERCURSO', 'res.score':'PONTOS', 'res.dist':'Distância',
    'res.over':'Ultrapassagens', 'res.close':'Raspadas', 'res.top':'Velocidade', 'res.combo':'Melhor combo',
    'res.cash':'Caixa ganha', 'res.newbest':'NOVO RECORDE!', 'res.again':'DE NOVO', 'res.menu':'MENU',
    'set.title':'AJUSTES', 'set.lang':'Idioma', 'set.quality':'Qualidade', 'set.music':'Música',
    'set.sfx':'Efeitos', 'set.sens':'Sensibilidade', 'set.haptics':'Vibração',
    'set.invert':'Inverter direção', 'set.reset':'APAGAR PROGRESSO',
    'set.resetAsk':'Apagar caixa, motos, melhorias e recordes?',
    'cred.title':'CRÉDITOS',
    'cred.body':'Jogo original do gênero de pilotagem de moto em primeira pessoa.\nNão é clone de nenhum título comercial: as mecânicas são replicadas, com arte e som próprios.\nMotor: three.js. Modelos, texturas e áudio gerados para este projeto.',
    'common.back':'VOLTAR', 'common.on':'SIM', 'common.off':'NÃO', 'common.tap':'TOQUE PARA COMEÇAR'
  },
  fr: {
    'boot.ready':'TOUCHEZ POUR CONTINUER',
    'boot.tip.0':'Accélérez avec la gâchette droite, tournez en glissant ou avec les flèches.',
    'boot.tip.1':'Frôler en dépassant rapporte bien plus que dépasser au large.',
    'boot.tip.2':'Trois dépassements de suite augmentent le multiplicateur ; il retombe après 2 s.',
    'boot.tip.3':'Au-dessus de 100 km/h chaque mètre vaut plus.',
    'boot.tip.4':'Au garage vous améliorez moteur, accélération, freins et adhérence.',
    'lang.title':'LANGUE', 'lang.sub':'Modifiable ensuite dans les Réglages.',
    'q.title':'QUALITÉ GRAPHIQUE', 'q.sub':'Si ça saccade, baissez d’un niveau. Modifiable dans les Réglages.',
    'q.low':'BASSE', 'q.med':'MOYENNE', 'q.high':'HAUTE', 'q.ultra':'MAXIMALE',
    'q.lowd':'Pour téléphones anciens', 'q.medd':'Équilibré',
    'q.highd':'Recommandé', 'q.ultrad':'Pour machines puissantes',
    'menu.play':'ROULER', 'menu.garage':'GARAGE', 'menu.settings':'RÉGLAGES',
    'menu.credits':'CRÉDITS', 'menu.cash':'CAISSE', 'menu.best':'RECORD', 'menu.km':'KM TOTAUX',
    'garage.title':'GARAGE', 'garage.select':'SÉLECTIONNER', 'garage.selected':'EN COURS',
    'garage.buy':'ACHETER {v}', 'garage.nocash':'Caisse insuffisante',
    'garage.top':'Vitesse max', 'garage.acc':'Accélération', 'garage.brk':'Freins', 'garage.grp':'Adhérence',
    'garage.upgrades':'AMÉLIORATIONS', 'garage.max':'MAX',
    'up.engine':'Moteur', 'up.accel':'Accélération', 'up.brakes':'Freins', 'up.grip':'Adhérence',
    'hud.gear':'VITESSE', 'hud.dist':'DISTANCE', 'hud.score':'POINTS',
    'hud.close':'FRÔLÉ !', 'hud.overtake':'DÉPASSEMENT',
    'pause.title':'PAUSE', 'pause.resume':'REPRENDRE', 'pause.restart':'RECOMMENCER', 'pause.menu':'MENU',
    'res.title':'PARCOURS TERMINÉ', 'res.score':'POINTS', 'res.dist':'Distance',
    'res.over':'Dépassements', 'res.close':'Frôlements', 'res.top':'Vitesse max', 'res.combo':'Meilleur combo',
    'res.cash':'Caisse gagnée', 'res.newbest':'NOUVEAU RECORD !', 'res.again':'ENCORE', 'res.menu':'MENU',
    'set.title':'RÉGLAGES', 'set.lang':'Langue', 'set.quality':'Qualité', 'set.music':'Musique',
    'set.sfx':'Effets', 'set.sens':'Sensibilité', 'set.haptics':'Vibration',
    'set.invert':'Inverser la direction', 'set.reset':'EFFACER LA PROGRESSION',
    'set.resetAsk':'Effacer caisse, motos, améliorations et records ?',
    'cred.title':'CRÉDITS',
    'cred.body':'Jeu original du genre moto en vue subjective.\nCe n’est pas un clone d’un titre commercial : les mécaniques sont reprises, avec art et son originaux.\nMoteur : three.js. Modèles, textures et audio générés pour ce projet.',
    'common.back':'RETOUR', 'common.on':'OUI', 'common.off':'NON', 'common.tap':'TOUCHEZ POUR COMMENCER'
  }
};

let lang = 'es';
const listeners = new Set();

export function detectLang(){
  const want = (navigator.languages || [navigator.language || 'en']).map(s => String(s).slice(0, 2).toLowerCase());
  for (const w of want) if (D[w]) return w;
  return 'en';
}
export function setLang(id){
  if (!D[id]) return;
  lang = id;
  document.documentElement.lang = id;
  listeners.forEach(fn => fn(id));
}
export const getLang = () => lang;
export const onLangChange = fn => { listeners.add(fn); return () => listeners.delete(fn); };

export function t(key, params){
  const table = D[lang] || D.en;
  let s = table[key];
  if (s === undefined) s = D.en[key] !== undefined ? D.en[key] : key;
  if (params) for (const k in params) s = s.split('{' + k + '}').join(params[k]);
  return s;
}
export const TIP_COUNT = 5;
