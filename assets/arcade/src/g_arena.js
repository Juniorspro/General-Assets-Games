/* ============================================================================
   ARENA — arena de supervivencia en tres cuartos (tipo Archero)
   ----------------------------------------------------------------------------
   LA MECÁNICA: el héroe DISPARA SOLO, pero únicamente cuando está QUIETO. El dedo
   lo mueve (joystick flotante: nace donde tocás, en cualquier parte de la
   pantalla). Moverse = no disparar. Ahí está toda la tensión del género.

   ESTRUCTURA: 8 SALAS por nivel, JEFE en la 4 y en la 8. Entre salas se elige
   UNA de TRES MEJORAS al azar (daño, tiro doble, rebote, atravesar, vida,
   velocidad, imán, crítico, cadencia). Las monedas se guardan entre partidas y
   se gastan en la FRAGUA (botón redondo propio del menú, GAME.extra) en mejoras
   PERMANENTES que arrancan con vos.

   ENEMIGOS con patrones distintos y silueta distinta (se leen de un vistazo):
     mole    (icosaedro)  persigue y golpea al contacto
     torre   (cono)       mantiene distancia y dispara
     púa     (octaedro)   se planta, avisa con un anillo, y EMBISTE
     divisor (icosaedro grande, verde) al morir se parte en dos moles chicos
     JEFE    (modelo 3D)  cicla volea radial / embestida / invocación / espiral

   LO QUE HAY QUE SABER PARA TOCAR ESTE ARCHIVO
   --------------------------------------------
   · VELOCIDAD. Todo lo repetido va en InstancedMesh (enemigos por SILUETA, balas de
     los dos bandos, monedas, sombras, anillos de aviso) y todo lo estático va
     FUSIONADO en una sola geometría con color por vértice: piso+muros+faldón+
     braseros = 1 llamada, decorado de afuera = 1 llamada, cajas de la sala = 1.
     Medido con renderer.info en partida: 1.700 triángulos y 6 llamadas en una sala
     normal, 3.159 / 13 con la sala llena a mano (12 bichos + 60 balas + 30
     monedas) y 7.310 / 9 en la sala del jefe (ahí pesan los dos GLB). Presupuesto
     del pack: 25.000 y 60. Los GLB venían con 29.411 y 29.380 triángulos y el
     shell los baja a 3.311 y 3.041 (GAME.glbTris = 5.000).
   · EL CUELLO DE BOTELLA DE ESTE JUEGO ES EL RELLENO, NO LA MALLA. Es una vista de
     arriba: el piso cubre el 85% del cuadro. Medido sin vsync en el chromium de
     swiftshader, un píxel cubierto cuesta ~72 ns, así que la cuenta se paga en
     PÍXELES y no en triángulos. Lo que se hizo, en orden de lo que rindió:
       -15,0 ms  fuera el plano de suelo de 150x150 (media pantalla de más)
       -13,0 ms  materiales de los GLB: Standard (PBR) -> Lambert con la misma
                 textura y facetado (el shader PBR por píxel es carísimo acá)
       - 2,7 ms  la capa 2D del HUD: menos texto, degradado del jefe cacheado,
                 viñeta de daño en los bordes en vez de un fillRect entero
       - 1,9 ms  las monedas no llevan sombra (eran 56 discos transparentes)
     Total: 42,5 ms por cuadro -> 17-19 ms. Y por si el aparato igual no llega,
     hay RESOLUCIÓN ADAPTATIVA (ver resStep): en un celular real nunca baja.
   · CÁMARA FIJA que encuadra TODA la sala. fitCam() calcula la distancia con el
     aspecto real del escenario, así en 900x430 y en el celular vertical rotado
     (915x412) no se corta ni un muro. La sala mide 21 x 12 justamente para que a
     52° de inclinación llene el cuadro apaisado.
   · MODO ATRACCIÓN (GAME.attract): el menú tiene la arena viva detrás — el héroe
     gira y dispara, los enemigos orbitan y explotan, la cámara se balancea. Es la
     MISMA escena y los MISMOS pools que la partida (cero costo extra de memoria).
   · UNA SOLA VERDAD DE POSICIÓN: hero.x/hero.z son la posición real; el dibujo
     interpola entre el paso anterior y el actual (px/pz) con el alpha del shell.
   · JUSTICIA: los enemigos aparecen con un anillo de aviso 0,55 s antes y nunca
     a menos de 5 unidades del héroe. La sala 1 del nivel 1 arranca con 3 moles
     lentos y sin torres: nadie muere en el primer segundo.
   · EL PILOTO (dbg.autoMove) puntúa 16 direcciones + "quedarse quieto" mirando
     0,35 s adelante: descarta lo que sale de la arena, premia alejarse del enemigo
     más cercano y de la trayectoria de las balas, y si quedarse quieto es seguro
     se queda quieto (porque quieto es cuando dispara). También elige la mejora
     cuando aparecen las cartas, si no la sonda se quedaría trabada ahí.
   ========================================================================== */
const G={
  slug:'arena',name:'ARENA',
  title:'<em>ARENA</em>',
  sub:'El héroe dispara solo cuando está QUIETO. Salas, jefes y mejoras.',
  subKey:'sub',
  acc:'#ffb02e',acc2:'#e0651b',
  levels:8,bestLabel:'SALAS',bestKey:'roomsL',
  three:true,sky:'#0b0713',shadows:false,
  /* PRESUPUESTO DE TRIÁNGULOS POR MODELO. El héroe tiene hueso: el motor no lo
     simplifica (rompería el skin) y se lleva sus 8.776 enteros. Los bichos se
     dibujan de a doce por instancia, así que cada uno paga 12 veces: a 700 son
     8.400 y el cuadro entero queda en ~20.000 de los 25.000 del pack. */
  glbTris:{_:700,heroe:0,heroeR:0,heroeA:0,jefe:2600},
  art:A('art-arena.jpg'),music:A('mus-arena.m4a'),
  sfx:{tap:A('sfx-tap.mp3'),click:A('sfx-click.mp3'),coin:A('sfx-coin.mp3'),win:A('sfx-win.mp3'),
       lose:A('sfx-lose.mp3'),boom:A('sfx-boom.mp3'),power:A('sfx-power.mp3'),chime:A('sfx-chime.mp3'),
       shoot:A('sfx-arena-shoot.mp3'),splat:A('sfx-arena-splat.mp3'),groan:A('sfx-arena-roar.mp3'),
       slash:A('sfx-arena-slash.mp3'),hit:A('sfx-arena-hit.mp3'),hurt:A('sfx-arena-hurt.mp3'),
       door:A('sfx-arena-door.mp3'),up:A('sfx-arena-up.mp3'),charge:A('sfx-arena-charge.mp3'),
       lava:A('sfx-arena-lava.mp3'),ice:A('sfx-arena-ice.mp3')},
  /* heroe = malla con hueso + el clip de guardia; heroeR/heroeA son GLB de SÓLO
     ANIMACIÓN (28 y 54 kB): mismo esqueleto, así que sus pistas se resuelven por
     nombre contra el héroe ya cargado. Medido: las tres ligan sus 72 pistas. */
  glb:{heroe:A('m-arena-heroe.glb'),heroeR:A('m-arena-run.glb'),heroeA:A('m-arena-atk.glb'),
       jefe:A('m-arena-jefe.glb'),
       mole:A('m-arena-mole.glb'),torre:A('m-arena-torre.glb'),
       pua:A('m-arena-pua.glb'),div:A('m-arena-div.glb')},
  i18n:{
    es:{sub:'El héroe dispara solo cuando está <b>QUIETO</b>.<br>8 salas por nivel, jefe en la 4 y en la 8, y una mejora a elección entre salas.',
      roomsL:'SALAS',room:'SALA',bossRoom:'SALA DEL JEFE',wave:'OLEADA',bossHere:'¡JEFE!',
      clear:'¡SALA LIMPIA!',pick:'ELEGÍ UNA MEJORA',pickSub:'toca una carta',
      tutMove:'ARRASTRÁ PARA MOVERTE',tutStop:'QUIETO = DISPARA',
      abil:'RÁFAGA',abilRdy:'RÁFAGA LISTA',
      uDmg:'DAÑO',uDmgD:'+35% de daño',
      uRate:'CADENCIA',uRateD:'+25% de disparos',
      uMult:'TIRO MÚLTIPLE',uMultD:'+1 flecha por disparo',
      uBounce:'REBOTE',uBounceD:'las flechas rebotan +1 vez',
      uPierce:'ATRAVESAR',uPierceD:'las flechas cruzan +1 enemigo',
      uHp:'VIDA',uHpD:'+2 de vida máxima y curás 2',
      uHeal:'CURACIÓN',uHealD:'recuperás 4 de vida',
      uSpd:'VELOCIDAD',uSpdD:'+14% de velocidad',
      uMag:'IMÁN',uMagD:'+70% de alcance del imán',
      uCrit:'CRÍTICO',uCritD:'+14% de golpe doble',
      shop:'FRAGUA',shopSub:'Mejoras PERMANENTES: se aplican en cada partida.',
      sHp:'Corazón extra',sDmg:'Filo eterno',sMag:'Imán del enano',sRate:'Cuerda tensa',
      sHpD:'+1 de vida al empezar',sDmgD:'+8% de daño al empezar',
      sMagD:'+45% de imán al empezar',sRateD:'+7% de cadencia al empezar',
      buy:'MEJORAR',max:'AL MÁXIMO',close:'CERRAR',noCoins:'Te faltan monedas',
      bought:'¡MEJORADO!',coins:'monedas',lvlN:'nivel',
      dTtl:'TE MATARON',wTtl:'¡NIVEL SUPERADO!',
      statRooms:'Salas',statKills:'Bajas',statCoins:'Monedas',statBest:'Mejor',
      hpLbl:'VIDA',newRec:'¡NUEVO RÉCORD!',allUp:'MEJORAS',
      zCripta:'CRIPTA',zFragua:'FRAGUA',zJardin:'JARDÍN',zHielo:'HIELO',zVacio:'VACÍO',
      hLava:'¡CUIDADO CON LAS GRIETAS!',hEspina:'LAS ZARZAS TE FRENAN',
      hHielo:'EL PISO RESBALA',hVacio:'EL PISO SE CAE',
      fire:'DISPARAR',fireHint:'MANTENÉ PARA DISPARAR EN MOVIMIENTO',
      statZones:'Zonas'},
    en:{sub:'The hero only shoots while <b>STANDING STILL</b>.<br>8 rooms per level, a boss on 4 and 8, one upgrade of your choice between rooms.',
      roomsL:'ROOMS',room:'ROOM',bossRoom:'BOSS ROOM',wave:'WAVE',bossHere:'BOSS!',
      clear:'ROOM CLEAR!',pick:'PICK AN UPGRADE',pickSub:'tap a card',
      tutMove:'DRAG TO MOVE',tutStop:'STAND STILL = SHOOT',
      abil:'BURST',abilRdy:'BURST READY',
      uDmg:'DAMAGE',uDmgD:'+35% damage',
      uRate:'FIRE RATE',uRateD:'+25% shots',
      uMult:'MULTISHOT',uMultD:'+1 arrow per shot',
      uBounce:'BOUNCE',uBounceD:'arrows bounce +1 time',
      uPierce:'PIERCE',uPierceD:'arrows go through +1 enemy',
      uHp:'HEALTH',uHpD:'+2 max health, heal 2',
      uHeal:'HEAL',uHealD:'restore 4 health',
      uSpd:'SPEED',uSpdD:'+14% move speed',
      uMag:'MAGNET',uMagD:'+70% magnet range',
      uCrit:'CRIT',uCritD:'+14% double hit',
      shop:'FORGE',shopSub:'PERMANENT upgrades: they apply to every run.',
      sHp:'Extra heart',sDmg:'Eternal edge',sMag:'Dwarf magnet',sRate:'Tight string',
      sHpD:'+1 starting health',sDmgD:'+8% starting damage',
      sMagD:'+45% starting magnet',sRateD:'+7% starting fire rate',
      buy:'UPGRADE',max:'MAXED',close:'CLOSE',noCoins:'Not enough coins',
      bought:'UPGRADED!',coins:'coins',lvlN:'level',
      dTtl:'YOU DIED',wTtl:'LEVEL COMPLETE!',
      statRooms:'Rooms',statKills:'Kills',statCoins:'Coins',statBest:'Best',
      hpLbl:'HEALTH',newRec:'NEW BEST!',allUp:'UPGRADES',
      zCripta:'CRYPT',zFragua:'FORGE',zJardin:'GARDEN',zHielo:'ICE',zVacio:'VOID',
      hLava:'MIND THE VENTS!',hEspina:'THORNS SLOW YOU DOWN',
      hHielo:'THE FLOOR IS SLIPPERY',hVacio:'THE FLOOR FALLS AWAY',
      fire:'FIRE',fireHint:'HOLD TO SHOOT WHILE MOVING',
      statZones:'Zones'},
    pt:{sub:'O herói só atira <b>PARADO</b>.<br>8 salas por nível, chefe na 4 e na 8, e uma melhoria à escolha entre salas.',
      roomsL:'SALAS',room:'SALA',bossRoom:'SALA DO CHEFE',wave:'ONDA',bossHere:'CHEFE!',
      clear:'SALA LIMPA!',pick:'ESCOLHA UMA MELHORIA',pickSub:'toque numa carta',
      tutMove:'ARRASTE PARA MOVER',tutStop:'PARADO = ATIRA',
      abil:'RAJADA',abilRdy:'RAJADA PRONTA',
      uDmg:'DANO',uDmgD:'+35% de dano',
      uRate:'CADÊNCIA',uRateD:'+25% de tiros',
      uMult:'TIRO MÚLTIPLO',uMultD:'+1 flecha por tiro',
      uBounce:'RICOCHETE',uBounceD:'as flechas ricocheteiam +1 vez',
      uPierce:'PERFURAR',uPierceD:'as flechas atravessam +1 inimigo',
      uHp:'VIDA',uHpD:'+2 de vida máxima e cura 2',
      uHeal:'CURA',uHealD:'recupera 4 de vida',
      uSpd:'VELOCIDADE',uSpdD:'+14% de velocidade',
      uMag:'ÍMÃ',uMagD:'+70% de alcance do ímã',
      uCrit:'CRÍTICO',uCritD:'+14% de golpe duplo',
      shop:'FORJA',shopSub:'Melhorias PERMANENTES: valem em todas as partidas.',
      sHp:'Coração extra',sDmg:'Fio eterno',sMag:'Ímã do anão',sRate:'Corda tensa',
      sHpD:'+1 de vida ao começar',sDmgD:'+8% de dano ao começar',
      sMagD:'+45% de ímã ao começar',sRateD:'+7% de cadência ao começar',
      buy:'MELHORAR',max:'NO MÁXIMO',close:'FECHAR',noCoins:'Faltam moedas',
      bought:'MELHORADO!',coins:'moedas',lvlN:'nível',
      dTtl:'VOCÊ MORREU',wTtl:'NÍVEL COMPLETO!',
      statRooms:'Salas',statKills:'Baixas',statCoins:'Moedas',statBest:'Melhor',
      hpLbl:'VIDA',newRec:'NOVO RECORDE!',allUp:'MELHORIAS',
      zCripta:'CRIPTA',zFragua:'FORJA',zJardin:'JARDIM',zHielo:'GELO',zVacio:'VAZIO',
      hLava:'CUIDADO COM AS FENDAS!',hEspina:'OS ESPINHOS TE FREIAM',
      hHielo:'O CHÃO ESCORREGA',hVacio:'O CHÃO DESABA',
      fire:'ATIRAR',fireHint:'SEGURE PARA ATIRAR EM MOVIMENTO',
      statZones:'Zonas'}
  }
};
/* OJO: el shell ya declara `const T=ARC.T` en este mismo ámbito de módulo, y
   build.js declara `const A=f=>BASE+f`. Redeclarar cualquiera de los dos rompe el
   juego entero ("Identifier already declared"). Acá se usan los del shell. */

/* --------------------------------------------------------------- constantes */
/* MEDIDA DE LA SALA. Se elige para que el HÉROE entre ~14 veces a lo ancho (en el
   género el personaje ocupa ~7% del ancho; con la sala de 19 unidades entraba 20
   veces y en 900x430 medía 30 px: una manchita). Y el ALTO PROYECTADO tiene que
   llenar el cuadro apaisado:  2·RW / (2·RH·sen52 + muro·cos52) ~ 2,1  */
const RW=7.8,RH=3.9;               /* media arena: 15,6 x 7,8 unidades */
const TS=1.3;                      /* lado de la baldosa */
const NX=Math.round(RW*2/TS),NZ=Math.round(RH*2/TS);
const FOV=48,PITCH=52*Math.PI/180; /* tres cuartos: 52° sobre el horizonte */
const HR=.48;                      /* radio del héroe */
const CAPE=48,CAPB=72,CAPEB=96,CAPC=56,CAPS=64,CAPT=14;  /* capacidad de los pools */
const HYAW=0;                       /* los GLB de image_to_3d salen mirando a +Z, igual que aim */
const PAL={
  f0:'#4b4074',f1:'#413767',rim:'#a992f0',wall:'#251b40',wallTop:'#54447f',
  strip:'#ffb02e',floorGlow:'#5d4f92',ground:'#1b1333',prop:'#241a3d',propTop:'#3d2f66',
  hero:'#ffc24a',heroD:'#6b3f10',
  e1:'#ff3d68',e2:'#c04bff',e3:'#ff7a1c',e4:'#57e08a',boss:'#ff2e5e',
  hb:'#7df0ff',eb:'#ff5cc8',coin:'#ffd83d',sh:'#07040f',
  tel:'#ff2e5e',door:'#7a5cc0',doorOn:'#57e08a',fog:'#150d24',
  skirt:'#1a1230',skirtD:'#120c22',joint:'#2b2350'
};
/* ============================================================== ZONAS (BIOMAS)
   Cada NIVEL atraviesa DOS zonas: salas 1-4 en una y 5-8 en otra, así una corrida
   siempre cambia de escenario a mitad de camino (y el jefe de la 8 cae en la
   segunda). Cada zona trae su paleta ENTERA y UN peligro propio:
     cripta  nada (la de siempre)
     fragua  grietas que avisan y escupen fuego
     jardín  zarzas que te frenan a la mitad
     hielo   el piso patina (la velocidad tiene inercia)
     vacío   baldosas que se caen y dejan agujeros que no se pueden cruzar
   PAL se sobreescribe con la zona activa y se reconstruye la malla fusionada de
   la arena: no cuesta nada por cuadro porque es geometría horneada UNA vez. */
const ZONES=[
  {k:'cripta',nk:'zCripta',haz:null,sky:'#0b0713',
   f0:'#4b4074',f1:'#413767',rim:'#a992f0',wall:'#251b40',wallTop:'#54447f',
   strip:'#ffb02e',floorGlow:'#5d4f92',prop:'#241a3d',propTop:'#3d2f66',fog:'#150d24',
   skirt:'#1a1230',skirtD:'#120c22',joint:'#2b2350'},
  {k:'fragua',nk:'zFragua',haz:'lava',sky:'#170603',
   f0:'#5a2a20',f1:'#4a231b',rim:'#ff9d5c',wall:'#341008',wallTop:'#7a3218',
   strip:'#ffd166',floorGlow:'#8a3a1e',prop:'#2c0f07',propTop:'#5a2312',fog:'#210805',
   skirt:'#2a1008',skirtD:'#1a0a04',joint:'#3a1a10'},
  {k:'jardin',nk:'zJardin',haz:'espina',sky:'#04120b',
   f0:'#2c5a3c',f1:'#254c33',rim:'#8ef0b0',wall:'#12301f',wallTop:'#3a7a4e',
   strip:'#d8ff6a',floorGlow:'#3a7a52',prop:'#0e2617',propTop:'#255c38',fog:'#06180e',
   skirt:'#0e2a1a',skirtD:'#081a10',joint:'#1a3c26'},
  {k:'hielo',nk:'zHielo',haz:'hielo',sky:'#03101c',
   f0:'#2e5e7e',f1:'#27516d',rim:'#a8ecff',wall:'#122d40',wallTop:'#3d7fa4',
   strip:'#7df0ff',floorGlow:'#3a7ea4',prop:'#0e2434',propTop:'#255d7c',fog:'#051624',
   skirt:'#0e2636',skirtD:'#081824',joint:'#1a3c52'},
  {k:'vacio',nk:'zVacio',haz:'vacio',sky:'#0a0410',
   f0:'#4a2456',f1:'#3d1e48',rim:'#f09aff',wall:'#2a0f33',wallTop:'#6a2c7c',
   strip:'#ff6ae0',floorGlow:'#6a2f7c',prop:'#200a28',propTop:'#4c1c5a',fog:'#12061a',
   skirt:'#24102c',skirtD:'#180a1e',joint:'#341844'}
];
let zone=ZONES[0],zoneI=0,zonesSeen={};
/* la zona depende SÓLO del nivel y de la mitad de la sala: es reproducible, así
   el jugador aprende el orden y el piloto de la sonda ve siempre lo mismo */
function zoneFor(l,r){
  const a=(l-1)%ZONES.length, b=(l+1+((l*3)%2))%ZONES.length;
  return r<=4?a:(b===a?(a+2)%ZONES.length:b);
}
function setZone(i,rebuild){
  if(i===zoneI&&zone&&!rebuild)return false;
  zoneI=i;zone=ZONES[i];
  for(const k of ['f0','f1','rim','wall','wallTop','strip','floorGlow','prop','propTop','fog'])
    PAL[k]=zone[k];
  PAL.skirt=zone.skirt;PAL.skirtD=zone.skirtD;PAL.joint=zone.joint;
  if(scene){
    scene.background=new T3.Color(zone.sky);
    if(scene.fog)scene.fog.color=new T3.Color(zone.fog);
    buildArena();buildDeco();buildObs();
    if(doorM)doorM.material.color.set(PAL.door);
  }
  zonesSeen[zone.k]=1;
  return true;
}
/* ---- PELIGROS ---- */
const HAZ={lava:{r:1.05,n:4,dmg:1},espina:{r:1.15,n:5,slow:.5},
           hielo:{},vacio:{r:.95,n:4}};
let HZL=[],IHZ=null,IHZ2=null;
function clearHaz(){HZL.length=0;}
function buildHaz(pl){
  clearHaz();
  const t=zone.haz;if(!t||t==='hielo')return;
  const C=HAZ[t],R=pl?pl.R:Math.random;
  for(let i=0;i<C.n;i++){
    /* nunca sobre el punto de entrada del héroe (0, RH-1.2) ni pegados entre sí */
    for(let k=0;k<24;k++){
      const x=(-RW+1.6)+R()*(RW*2-3.2), z=(-RH+1.4)+R()*(RH*2-2.8);
      if(Math.hypot(x-0,z-(RH-1.2))<2.4)continue;
      if(HZL.some(h=>Math.hypot(h.x-x,h.z-z)<C.r*2.1))continue;
      if(inObs(x,z,C.r))continue;
      HZL.push({x,z,r:C.r,t,ph:R()*3.4,on:0,warn:0});break;
    }
  }
}
/* devuelve el peligro ACTIVO que pisa (x,z), o null */
function hazAt(x,z){
  for(const h of HZL){
    if(h.t==='espina'){if(Math.hypot(h.x-x,h.z-z)<h.r)return h;}
    else if(h.on>0&&Math.hypot(h.x-x,h.z-z)<h.r)return h;
  }
  return null;
}
function hazStep(dt){
  const t=zone.haz;
  if(t==='lava')for(const h of HZL){
    h.ph+=dt;const c=h.ph%3.6;
    h.warn=c>2.1&&c<=2.9?(c-2.1)/.8:0;      /* 0,8 s de aviso: se puede salir */
    const was=h.on;h.on=c>2.9?1:0;
    if(h.on&&!was){ARC.sfx('lava',{vol:.5,rate:.95+Math.random()*.1});
      if(cam){const p=proj(h.x,.2,h.z);
        ARC.fx.burst(p.x,p.y,{n:Math.round(12*partK),color:PAL.strip,
          speed:150,size:4,life:.45});}}
  }
  else if(t==='vacio')for(const h of HZL){
    h.ph+=dt;const c=h.ph%6.4;
    h.warn=c>3.4&&c<=4.2?(c-3.4)/.8:0;
    h.on=c>4.2?1:0;                          /* abierto: no se puede pasar */
  }
}
/* MEJORAS. cap = cuántas veces se puede tomar (0 = infinitas). */
const UPS=[
  {id:'dmg'   ,ic:'⚔',k:'uDmg'   ,d:'uDmgD'   ,cap:0,fn:()=>{P.dmg*=1.35;}},
  {id:'rate'  ,ic:'⏱',k:'uRate'  ,d:'uRateD'  ,cap:5,fn:()=>{P.rate*=1.25;}},
  {id:'mult'  ,ic:'⋔',k:'uMult'  ,d:'uMultD'  ,cap:3,fn:()=>{P.mult++;}},
  {id:'bounce',ic:'◤',k:'uBounce',d:'uBounceD',cap:2,fn:()=>{P.bounce++;}},
  {id:'pierce',ic:'➤',k:'uPierce',d:'uPierceD',cap:2,fn:()=>{P.pierce++;}},
  {id:'hp'    ,ic:'❤',k:'uHp'    ,d:'uHpD'    ,cap:0,fn:()=>{P.hpMax+=2;hp=Math.min(P.hpMax,hp+2);}},
  {id:'heal'  ,ic:'✚',k:'uHeal'  ,d:'uHealD'  ,cap:0,fn:()=>{hp=Math.min(P.hpMax,hp+4);}},
  {id:'spd'   ,ic:'»',k:'uSpd'   ,d:'uSpdD'   ,cap:4,fn:()=>{P.spd*=1.14;}},
  {id:'mag'   ,ic:'◉',k:'uMag'   ,d:'uMagD'   ,cap:3,fn:()=>{P.mag*=1.7;}},
  {id:'crit'  ,ic:'✸',k:'uCrit'  ,d:'uCritD'  ,cap:5,fn:()=>{P.crit+=.14;}}
];
/* FRAGUA: mejoras permanentes. cost(n) = precio del nivel n. */
const SHOP=[
  {id:'hp'  ,ic:'❤',k:'sHp'  ,d:'sHpD'  ,max:4,c:n=>60+n*70},
  {id:'dmg' ,ic:'⚔',k:'sDmg' ,d:'sDmgD' ,max:5,c:n=>80+n*90},
  {id:'mag' ,ic:'◉',k:'sMag' ,d:'sMagD' ,max:3,c:n=>50+n*60},
  {id:'rate',ic:'⏱',k:'sRate',d:'sRateD',max:4,c:n=>90+n*95}
];

/* ------------------------------------------------------------------ estado */
let T3,scene,cam,CD=20,camA=0,camK=1,camDZ=0;
let arenaM,decoM,obsM,doorM,heroN,heroFB,bossN,bossFB;
let IE=[],IHB,IEB,ICN,ISH,ITL;                 /* mallas instanciadas */
let dum,V0;
let hx=0,hz=3,phx=0,phz=3,vx=0,vz=0,aim=0,paim=0;
let hp=6,inv=0,shotT=0,moving=0,stillT=0,hitFlash=0;
let ens=[],hbs=[],ebs=[],cns=[],tels=[];
let boss=null,bossHpMax=1;
let lvl=1,room=1,ph='fight',phT=0,waveI=0,waveN=1,pend=0,pendT=0;
let kills=0,coinRun=0,roomsRun=0,notice='',noticeT=0,noticeBig=0;
let P=null,taken={},cards=[],cardR=[],abilT=0;
let joy=null,botOn=0,demo=0,tut=0,fireHold=0,shotsN=0;
let partK=1,fogK=1,decoK=1,recTold=false,lastEv='';
/* RESOLUCIÓN ADAPTATIVA. El cuello de botella de este juego es el RELLENO: la
   arena vista de arriba cubre medio cuadro y en el chromium de swiftshader un
   píxel cubierto cuesta ~72 ns (medido sin vsync: escena vacía 8,7 ms, con la
   arena 27 ms). En vez de castigar al celular real bajando la resolución a mano,
   se mide y se ajusta: se arranca con el DPR que pide el shell y si el cuadro no
   llega se recorta hasta 0,55; si sobra, se devuelve. En un teléfono de verdad
   (GPU 50x más rápida en relleno) nunca baja y se ve nítido. */
let resK=1,resT=0,resBase=1,resLock=0;
function resApply(){
  if(!ARC.rnd)return;
  const p=ARC.gfxP?ARC.gfxP():{dpr:1.35};
  resBase=Math.min(window.devicePixelRatio||1,p.dpr);
  ARC.rnd.setPixelRatio(Math.max(.5,resBase*resK));
  ARC.rnd.setSize(ARC.W,ARC.H,false);
}
function resStep(dt){
  if(resLock)return;
  resT-=dt;if(resT>0)return;
  const f=ARC.fps;
  /* BAJA RÁPIDO (0,6 s) y SUBE DESPACIO (2,5 s), y el umbral de subida deja
     margen (58,5) para no quedar rebotando entre 60 y 30: con los umbrales
     anteriores (50/57,5) la media medida se clavaba en 42 fps porque uno de cada
     dos cuadros perdía el vsync. */
  /* el disparador es 42: con vsync los fps salen cuantizados (60/30/20), así que
     por debajo de 42 el cuadro está perdiendo el vsync de verdad. Con 52 (lo que
     había antes) bajaba la resolución en un entorno que ya daba 46-55 fps. */
  if(f<42&&resK>.55){resK=Math.max(.55,resK-.1);resT=.7;resApply();}
  else if(f>56&&resK<1){resK=Math.min(1,resK+.05);resT=2.2;resApply();}
  else resT=.45;
}
const GEO={},MAT={},COL={};
function colOf(h){return COL[h]||(COL[h]=new T3.Color(h));}

/* -------------------------------------------- geometría fusionada (1 llamada) */
function VA(){return{p:[],c:[]};}
function CC(h){const c=new T3.Color(h);return[c.r,c.g,c.b];}
function vq(ac,a,b,c,d,col){
  const t=[a,b,c,a,c,d];
  for(const v of t){ac.p.push(v[0],v[1],v[2]);ac.c.push(col[0],col[1],col[2]);}
}
function vplate(ac,x,z,w,d,y,col){
  vq(ac,[x-w/2,y,z+d/2],[x+w/2,y,z+d/2],[x+w/2,y,z-d/2],[x-w/2,y,z-d/2],col);
}
/* caja de 5 caras (sin fondo: nunca se ve) con el giro correcto, así el
   rasterizador descarta la mitad de los triángulos con FrontSide */
function vbox(ac,x,y,z,w,h,d,ct,cs){
  const x0=x-w/2,x1=x+w/2,y0=y,y1=y+h,z0=z-d/2,z1=z+d/2;
  vq(ac,[x0,y1,z1],[x1,y1,z1],[x1,y1,z0],[x0,y1,z0],ct);
  vq(ac,[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1],cs);
  vq(ac,[x1,y0,z0],[x0,y0,z0],[x0,y1,z0],[x1,y1,z0],cs);
  vq(ac,[x0,y0,z0],[x0,y0,z1],[x0,y1,z1],[x0,y1,z0],cs);
  vq(ac,[x1,y0,z1],[x1,y0,z0],[x1,y1,z0],[x1,y1,z1],cs);
}
function vmesh(ac,fog){
  const g=new T3.BufferGeometry();
  g.setAttribute('position',new T3.Float32BufferAttribute(ac.p,3));
  g.setAttribute('color',new T3.Float32BufferAttribute(ac.c,3));
  g.computeBoundingSphere();
  const m=new T3.MeshBasicMaterial({vertexColors:true,side:T3.FrontSide,fog:fog!==false});
  return new T3.Mesh(g,m);
}
function rng(seed){let s=seed>>>0;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};}
function tris(o){let n=0;o.traverse(k=>{if(k.isMesh&&k.geometry){const g=k.geometry;
  n+=(g.index?g.index.count:(g.attributes.position?g.attributes.position.count:0))/3;}});
  return Math.round(n);}

/* ---------------------------------------------------------- la arena estática
   Piso en damero + muros + tira de neón en la base + almenas + braseros: TODO en
   una sola geometría. Medido: 1.512 triángulos, 1 llamada de dibujo. */
function buildArena(){
  if(arenaM){scene.remove(arenaM);arenaM.geometry.dispose();}
  const ac=VA();
  const f0=CC(PAL.f0),f1=CC(PAL.f1),gl=CC(PAL.floorGlow),rim=CC(PAL.rim);
  const wl=CC(PAL.wall),wt=CC(PAL.wallTop),st=CC(PAL.strip);
  for(let ix=0;ix<NX;ix++)for(let iz=0;iz<NZ;iz++){
    const x=-RW+(ix+.5)*TS,z=-RH+(iz+.5)*TS;
    /* el centro lleva un ruedo más claro: da un punto de fuga y ayuda a leer
       las distancias cuando la sala está llena de bichos */
    const cd=Math.hypot(x*.55,z);
    vplate(ac,x,z,TS,TS,0,cd<2.6?gl:(((ix+iz)&1)?f0:f1));
  }
  /* junta de las baldosas: líneas finas oscuras cada 3 unidades */
  for(let ix=-RW+TS*2;ix<RW-.1;ix+=TS*2)vplate(ac,ix,0,.07,RH*2,.006,CC(PAL.joint));
  for(let iz=-RH+TS*2;iz<RH-.1;iz+=TS*2)vplate(ac,0,iz,RW*2,.07,.006,CC(PAL.joint));
  /* borde interior de la arena */
  vplate(ac,0,-RH+.12,RW*2,.24,.012,rim);
  vplate(ac,0, RH-.12,RW*2,.24,.012,rim);
  vplate(ac,-RW+.12,0,.24,RH*2,.012,rim);
  vplate(ac, RW-.12,0,.24,RH*2,.012,rim);
  /* muros: el de atrás alto (se ve), los costados medios, el de adelante un
     zócalo bajo (si fuese alto taparía al héroe) */
  vbox(ac,0,0,-RH-.35,RW*2+1.4,2.5,.7,wt,wl);
  /* hueco de la puerta en el muro del fondo (la puerta baja y se ve el pasillo) */
  vbox(ac,0,0,-RH-.02,3.3,2.15,.12,CC(zone.sky),CC(zone.sky));
  vbox(ac,-RW-.35,0,0,.7,1.7,RH*2,wt,wl);
  vbox(ac, RW+.35,0,0,.7,1.7,RH*2,wt,wl);
  vbox(ac,0,0, RH+.3,RW*2+1.4,.42,.6,wt,wl);
  /* tira de neón en la base de los muros (contornea la sala) */
  vplate(ac,0,-RH+.06,RW*2,.12,.02,st);
  vplate(ac,0, RH-.06,RW*2,.12,.02,st);
  vplate(ac,-RW+.06,0,.12,RH*2,.02,st);
  vplate(ac, RW-.06,0,.12,RH*2,.02,st);
  vbox(ac,0,.72,-RH+.06,RW*2,.16,.1,st,st);   /* franja en la cara del muro */
  /* almenas del muro del fondo */
  for(let x=-RW;x<=RW+.01;x+=1.95)vbox(ac,x,2.5,-RH-.35,.85,.5,.7,wt,wl);
  /* FALDÓN: sin el plano de suelo la arena flota, así que se le ve el canto. Un
     labio oscuro de 1,2 de alto en los tres lados visibles la convierte en una
     plataforma sólida (y cuesta 0,3 ms porque es una tira finita). */
  vbox(ac,0,-1.25,RH+.6,RW*2+1.4,1.25,.5,CC(PAL.skirt),CC(PAL.skirtD));
  vbox(ac,-RW-.6,-1.25,0,.5,1.25,RH*2+1.4,CC(PAL.skirt),CC(PAL.skirtD));
  vbox(ac, RW+.6,-1.25,0,.5,1.25,RH*2+1.4,CC(PAL.skirt),CC(PAL.skirtD));
  /* braseros en las cuatro esquinas */
  for(const sx of [-1,1])for(const sz of [-1,1]){
    vbox(ac,sx*(RW-.42),0,sz*(RH-.42),.3,1.15,.3,CC(PAL.propTop),CC(PAL.prop));
    vbox(ac,sx*(RW-.42),1.15,sz*(RH-.42),.44,.12,.44,CC('#ffe6a0'),CC(PAL.strip));
    vbox(ac,sx*(RW-.42),1.27,sz*(RH-.42),.26,.26,.26,CC('#fff3cf'),CC('#ffd166'));
  }
  arenaM=vmesh(ac,true);scene.add(arenaM);
  /* la puerta del fondo: se abre cuando la sala queda limpia */
  if(!doorM){
    doorM=new T3.Mesh(new T3.BoxGeometry(3.1,2.15,.3),
      new T3.MeshBasicMaterial({color:new T3.Color(PAL.door)}));
    scene.add(doorM);
  }
  doorM.position.set(0,1.1,-RH-.12);
}
/* decorado de AFUERA. MEDIDO SIN VSYNC en el chromium de swiftshader (que cobra
   ~72 ns por píxel cubierto): el plano de suelo de 150x150 que había acá costaba
   15 ms de los 42 ms del cuadro, sólo por pintar la mitad de la pantalla que no
   es la arena. Se fue. Ahora la arena FLOTA en el vacío (como la pista de RUEDA:
   el color de fondo se resuelve con el clear, que es gratis) y lo único que se
   dibuja afuera son siluetas chicas detrás del muro del fondo, que llenan la
   franja de arriba sin cubrir cuadro. Deco: 15 ms -> 1,9 ms. */
function buildDeco(){
  if(decoM){scene.remove(decoM);decoM.geometry.dispose();decoM=null;}
  const ac=VA(),pt=CC(PAL.propTop),pp=CC(PAL.prop);
  const R=rng(20250730),n=Math.round(11*clamp(decoK,.4,1.3));
  /* columnas SÓLO detrás del muro del fondo y a los costados, y siempre por
     encima del horizonte: ocupan la franja negra de arriba y nada más */
  for(let i=0;i<n;i++){
    const x=(-RW-6)+R()*(RW*2+12);
    const z=-RH-2.4-R()*11;
    const w=.8+R()*2,h=2.2+R()*6;
    vbox(ac,x,-1.4,z,w,h,w*(.7+R()*.6),pt,pp);
  }
  /* una sola grada baja detrás del muro: cierra la base sin tapar nada */
  vbox(ac,0,-1.4,-RH-2.2,RW*2+7,1.6,1.7,pt,pp);
  decoM=vmesh(ac,true);scene.add(decoM);
}
/* cajas de la sala (tapan balas y frenan enemigos): 1 llamada de dibujo */
let obs=[],plan=null;
function buildObs(){
  if(obsM){scene.remove(obsM);obsM.geometry.dispose();obsM=null;}
  if(!obs.length)return;
  const ac=VA(),ct=CC(PAL.wallTop),cs=CC(PAL.wall);
  for(const o of obs){vbox(ac,o.x,0,o.z,o.r*1.95,o.h,o.r*1.95,ct,cs);
    vbox(ac,o.x,o.h,o.z,o.r*2.2,.14,o.r*2.2,CC(PAL.rim),CC(PAL.propTop));}
  obsM=vmesh(ac,true);scene.add(obsM);
}

/* ----------------------------------------------------------- pools instanciados
   Un InstancedMesh por forma. Se sube la matriz de cada instancia viva y se pone
   .count: el celular dibuja 40 enemigos en UNA llamada. */
function IM(geo,mat,cap){
  const m=new T3.InstancedMesh(geo,mat,cap);
  m.instanceMatrix.setUsage(T3.DynamicDrawUsage);
  m.frustumCulled=false;m.count=0;
  scene.add(m);return m;
}
function lam(c){return new T3.MeshLambertMaterial({color:new T3.Color(c)});}
function bas(c,o){const m=new T3.MeshBasicMaterial({color:new T3.Color(c)});
  if(o!=null){m.transparent=true;m.opacity=o;m.depthWrite=false;}return m;}
/* GEOMETRÍA DE UN GLB, lista para instanciar: se fusionan todas las mallas del
   modelo en UNA, se centra en el piso y se escala a la altura pedida. Así cada
   tipo de bicho sigue costando UNA llamada de dibujo aunque sean doce, y el color
   de señal lo pone la instancia (que es lo que hace que se lean de un vistazo). */
function glbGeo(key,targetH){
  const S=ARC.glb&&ARC.glb[key];
  if(!S||!S.scene)return null;
  try{
    S.scene.updateMatrixWorld(true);
    const gs=[];
    S.scene.traverse(o=>{
      if(!o.isMesh||!o.geometry||!o.geometry.attributes.position)return;
      const g=o.geometry.clone();
      /* sólo posición y normal: los atributos de más no se pueden fusionar entre
         mallas con distinta cantidad de canales y hacen fallar el merge */
      for(const a in g.attributes)if(a!=='position'&&a!=='normal')g.deleteAttribute(a);
      if(!g.attributes.normal)g.computeVertexNormals();
      g.applyMatrix4(o.matrixWorld);
      gs.push(g);
    });
    if(!gs.length)return null;
    let geo=gs[0];
    if(gs.length>1&&ARC.BGU&&ARC.BGU.mergeGeometries)
      geo=ARC.BGU.mergeGeometries(gs,false)||gs[0];
    else if(gs.length>1)geo=mergeManual(gs)||gs[0];
    geo.computeBoundingBox();
    const bb=geo.boundingBox,sz=new T3.Vector3();bb.getSize(sz);
    if(!(sz.y>1e-4))return null;
    const s=targetH/sz.y;
    geo.translate(-(bb.min.x+bb.max.x)/2,-bb.min.y,-(bb.min.z+bb.max.z)/2);
    geo.scale(s,s,s);
    geo.computeVertexNormals();
    return geo;
  }catch(e){console.warn('glbGeo '+key,e);return null;}
}
/* fusión a mano (sin el addon): sólo position+normal, sin índice */
function mergeManual(gs){
  let n=0;for(const g of gs)n+=g.attributes.position.count;
  const P=new Float32Array(n*3),N=new Float32Array(n*3);let o=0;
  for(const g of gs){
    const p=g.attributes.position,nn=g.attributes.normal;
    const idx=g.index?g.index.array:null;
    if(idx){ /* se expande el índice: el destino va sin índice */ }
    for(let i=0;i<p.count;i++){
      P[(o+i)*3]=p.getX(i);P[(o+i)*3+1]=p.getY(i);P[(o+i)*3+2]=p.getZ(i);
      if(nn){N[(o+i)*3]=nn.getX(i);N[(o+i)*3+1]=nn.getY(i);N[(o+i)*3+2]=nn.getZ(i);}
    }
    o+=p.count;
  }
  const g2=new T3.BufferGeometry();
  g2.setAttribute('position',new T3.BufferAttribute(P,3));
  g2.setAttribute('normal',new T3.BufferAttribute(N,3));
  return g2;
}
/* alturas de cada bicho en unidades de mundo (el héroe mide 1,62) */
const EH={mole:1.02,torre:1.34,pua:.94,div:1.28};
let eGeoOK=0;
function buildPools(){
  dum=new T3.Object3D();V0=new T3.Vector3();
  /* CUATRO siluetas de enemigo, cuatro mallas instanciadas. Si los modelos 3D
     cargaron se usan ésos; si alguno faltó, ese tipo cae al cuerpo geométrico de
     antes y el juego sigue igual. */
  const gm=glbGeo('mole',EH.mole),gt=glbGeo('torre',EH.torre),
        gp=glbGeo('pua',EH.pua),gd=glbGeo('div',EH.div);
  eGeoOK=(gm?1:0)+(gt?2:0)+(gp?4:0)+(gd?8:0);
  IE=[
    IM(gm||new T3.IcosahedronGeometry(.5,0),lam('#ffffff'),CAPE),   /* mole */
    IM(gt||new T3.ConeGeometry(.5,1.15,6),lam('#ffffff'),CAPE),     /* torre */
    IM(gp||new T3.OctahedronGeometry(.56,0),lam('#ffffff'),CAPE),   /* púa */
    IM(gd||new T3.IcosahedronGeometry(.5,0),lam('#ffffff'),CAPE)    /* divisor */
  ];
  /* con modelo el bicho apoya en el piso (yo=0); con la primitiva va flotando a
     media altura como antes, así el cambio no descoloca las siluetas viejas */
  IE.glb=[!!gm,!!gt,!!gp,!!gd];
  /* peligros de la zona: un disco por peligro y un aro de aviso encima */
  IHZ=IM(new T3.CircleGeometry(1,16),bas('#ffffff',.85),8);
  IHZ2=IM(new T3.RingGeometry(.84,1,20),bas('#ffffff',.9),8);
  IHB=IM(new T3.OctahedronGeometry(.17,0),bas(PAL.hb),CAPB);
  IEB=IM(new T3.OctahedronGeometry(.21,0),bas(PAL.eb),CAPEB);
  /* la moneda va con material BASIC (siempre brillante, no depende de la luz) y
     con el eje inclinado el mismo ángulo que la cámara: se ve el disco, no el canto */
  ICN=IM(new T3.CylinderGeometry(.25,.25,.07,10),bas(PAL.coin),CAPC);
  ISH=IM(new T3.CircleGeometry(1,10),bas(PAL.sh,.34),CAPS);
  ITL=IM(new T3.RingGeometry(.82,1,18),bas(PAL.tel,.7),CAPT);
  /* OJO: girar la malla ENTERA no sirve con instancias (la matriz de cada
     instancia pisa la del objeto): el -90 en X va en cada dum.rotation. */
}
/* héroe y jefe: modelo GLB si cargó (ya simplificado por el shell a 800
   triángulos), y si no, geometría propia fusionada — una sola llamada */
function glbNode(key,targetH,yaw,noClone){
  const S=ARC.glb&&ARC.glb[key];
  if(!S||!S.scene)return null;
  try{
    /* MALLA CON HUESO: NO se clona. Object3D.clone() copia la jerarquía pero deja
       el SkinnedMesh apuntando al esqueleto viejo, así que el clon se queda
       congelado en la pose de reposo. Como el héroe es uno solo, se usa la escena
       tal cual y el mixer la anima directamente. */
    const o=noClone?S.scene:S.scene.clone(true);
    const bb=new T3.Box3().setFromObject(o),sz=new T3.Vector3(),c=new T3.Vector3();
    bb.getSize(sz);bb.getCenter(c);
    if(!(sz.y>.0001))return null;
    const s=targetH/sz.y;
    o.scale.setScalar(s);
    o.position.set(-c.x*s,-bb.min.y*s,-c.z*s);
    o.rotation.y=yaw||0;
    /* MATERIAL: los GLB de image_to_3d vienen con MeshStandardMaterial (PBR). En
       este pack todo es mate y plano, y un shader PBR cuesta bastante más por
       píxel; se cambia por Lambert con la MISMA textura y facetado, que además es
       el aspecto del resto del juego. */
    o.traverse(k=>{
      if(!k.isMesh)return;
      k.castShadow=false;k.receiveShadow=false;
      const m=k.material;
      if(m&&!m.userData.arena){
        const n2=new T3.MeshLambertMaterial({
          map:m.map||null,color:m.map?0xffffff:(m.color?m.color.clone():0xffffff),
          flatShading:true,fog:false});
        /* con cámara de arriba el personaje se ve casi todo en sombra y el ámbar
           quedaba marrón barro (medido en la captura). Un rescoldo levanta las
           caras oscuras sin aplanar la forma. */
        if(key==='heroe')n2.emissive=new T3.Color('#54320c');
        if(key==='jefe')n2.emissive=new T3.Color('#3a0a16');
        n2.userData.arena=1;
        k.material=n2;
      }else if(m)m.fog=false;
    });
    const w=new T3.Group();w.add(o);w.inner=o;return w;
  }catch(e){console.warn('glb '+key,e);return null;}
}
/* ================================================== HÉROE CON HUESO Y CLIPS
   El GLB del héroe viene riggeado (24 huesos) con el clip de GUARDIA, y los otros
   dos clips llegan en GLB de sólo-animación (28 y 54 kB) que comparten el mismo
   esqueleto: three resuelve sus pistas por NOMBRE de hueso contra este esqueleto.
   Medido en la prueba: las tres ligan sus 72 pistas y las posturas difieren hasta
   1,06 unidades, así que no es un clip mudo que "parece" andar.
   El clip de ataque dura 2,83 s: se le pone timeScale para que el mandoble entre
   justo en el intervalo de disparo, si no el héroe golpearía en cámara lenta. */
let MX=null,ACT={},actNow='',heroSk=null;
function heroAnim(node){
  const S=ARC.glb&&ARC.glb.heroe;
  if(!S||!S.animations||!S.animations.length)return false;
  try{
    MX=new T3.AnimationMixer(node);
    node.traverse(o=>{if(o.isSkinnedMesh)heroSk=o;});
    const add=(k,clip,loop)=>{
      if(!clip)return;
      const a=MX.clipAction(clip);
      a.loop=loop===false?T3.LoopOnce:T3.LoopRepeat;
      if(loop===false)a.clampWhenFinished=true;
      a.enabled=true;a.setEffectiveWeight(0);a.play();
      ACT[k]={a,dur:clip.duration};
    };
    add('idle',S.animations[0]);
    const R=ARC.glb.heroeR,Aa=ARC.glb.heroeA;
    add('run',R&&R.animations&&R.animations[0]);
    add('atk',Aa&&Aa.animations&&Aa.animations[0]);
    if(!ACT.idle)return false;
    ACT.idle.a.setEffectiveWeight(1);actNow='idle';
    return true;
  }catch(e){console.warn('heroAnim',e);MX=null;return false;}
}
/* mezcla suave: sube el peso del que toca y baja los otros. Nada de fadeIn/Out,
   que dejan acciones a medio camino cuando se cambia dos veces en un cuadro. */
function heroAct(k,dt){
  if(!MX||!ACT[k])return;
  if(k!=='atk'&&actNow==='atk'&&ACT.atk&&ACT.atk.a.time<ACT.atk.dur*.55)k='atk';
  actNow=k;
  for(const n in ACT){
    const w=ACT[n].a.getEffectiveWeight();
    const to=n===k?1:0;
    ACT[n].a.setEffectiveWeight(w+(to-w)*Math.min(1,dt*11));
  }
}
function heroGeo(){
  const ac=VA(),bd=CC(PAL.hero),dk=CC(PAL.heroD),cy=CC(PAL.hb),hd=CC('#ffd980');
  vbox(ac,0,.18,0,.62,.5,.44,bd,dk);          /* torso */
  vbox(ac,-.16,0,0,.2,.2,.26,dk,dk);          /* piernas */
  vbox(ac, .16,0,0,.2,.2,.26,dk,dk);
  vbox(ac,0,.68,-.02,.52,.44,.48,hd,bd);      /* casco */
  vplate(ac,0,-.26,.42,.06,.86,cy);           /* visor (mira a -Z) */
  vbox(ac,0,.34,-.3,.7,.14,.2,cy,cy);         /* ballesta */
  vbox(ac,-.34,.28,0,.16,.3,.2,dk,dk);        /* hombreras */
  vbox(ac, .34,.28,0,.16,.3,.2,dk,dk);
  return vmesh(ac,false);
}
function bossGeo(){
  const ac=VA(),bd=CC(PAL.boss),dk=CC('#5c0b23'),bn=CC('#ffeccb'),ey=CC('#ffe14d');
  vbox(ac,0,.4,0,1.9,1.7,1.5,bd,dk);
  vbox(ac,0,0,0,.6,.42,.5,dk,dk);
  vbox(ac,0,2.1,0,1.5,1.05,1.2,bd,dk);
  vbox(ac,-.62,3.1,0,.26,.7,.26,bn,bn);
  vbox(ac, .62,3.1,0,.26,.7,.26,bn,bn);
  for(const dx of [-.42,0,.42])vplate(ac,dx,-.62,.26,.06,2.5,ey);
  vbox(ac,-1.15,1.5,0,.5,.9,.5,dk,dk);
  vbox(ac, 1.15,1.5,0,.5,.9,.5,dk,dk);
  vplate(ac,0,-.78,1.2,.08,1.3,CC(PAL.strip));
  return vmesh(ac,false);
}

/* --------------------------------------------------------------- cámara */
/* ENCUADRE. Antes se calculaba con tangentes (extensión/tan(fov/2)), que es la
   aproximación ORTOGRÁFICA: el borde de ADELANTE de la arena está mucho más cerca
   de la cámara que el centro, subtiende más ángulo y se salía del cuadro (medido en
   la captura: el faldón y los muros laterales cortados en 900x430). Ahora se busca
   por bisección la distancia MÍNIMA en la que las ocho esquinas de la caja de la
   sala caen dentro del ±0,94 del NDC. Sale exacto en cualquier aspecto. */
const FITP=[];
function fitPts(){
  if(FITP.length)return FITP;
  const X=RW+.9,Z1=RH+1.1,Z0=-RH-1.0;
  for(const sx of [-1,0,1]){
    FITP.push([sx*X,0,Z1]);          /* borde de adelante y faldón */
    FITP.push([sx*X,2.9,Z0]);        /* alto del muro del fondo + almenas */
    FITP.push([sx*X,1.8,Z1]);
  }
  FITP.push([0,-1.3,Z1]);
  return FITP;
}
function fitCam(){
  const asp=ARC.W/Math.max(1,ARC.H);
  if(!cam){CD=18;return;}
  cam.aspect=asp;cam.fov=FOV;cam.updateProjectionMatrix();
  const pts=fitPts(),v=new T3.Vector3();
  const fits=d=>{
    CD=d;placeCam(0,0,0);cam.updateMatrixWorld(true);
    for(const p of pts){
      v.set(p[0],p[1],p[2]).project(cam);
      if(Math.abs(v.x)>.94||Math.abs(v.y)>.94)return false;
    }
    return true;
  };
  let lo=8,hi=64;
  if(!fits(hi))hi=96;
  for(let i=0;i<26;i++){const m=(lo+hi)/2;if(fits(m))hi=m;else lo=m;}
  CD=hi;
}
function placeCam(cx,cz,ang){
  const D=CD*camK;
  const s=Math.sin(PITCH),c=Math.cos(PITCH);
  const dx=Math.sin(ang)*D*c,dz=Math.cos(ang)*D*c;
  cam.position.set(cx+dx,D*s,cz+dz);
  cam.lookAt(cx,.9,cz);
}
function proj(x,y,z){
  const v=V0.set(x,y,z).project(cam);
  return{x:(v.x*.5+.5)*ARC.W,y:(-v.y*.5+.5)*ARC.H,z:v.z};
}

/* -------------------------------------------------------- salas y enemigos
   Cada sala se arma con una semilla: nivel+sala. La misma sala del mismo nivel
   siempre trae lo mismo (se aprende). El jefe cae en la 4 y en la 8. */
const isBoss=r=>r===4||r===8;
function roomPlan(l,r){
  const R=rng(7919+l*331+r*37);
  const kmul=1+.34*(l-1);                       /* vida de los enemigos por nivel */
  const smul=1+.05*(l-1);                       /* velocidad */
  if(isBoss(r))return{R,boss:true,kmul,smul,waves:1,n:0,types:[]};
  const types=['mole'];
  if(r>=2||l>1)types.push('torre');
  if(r>=3||l>2)types.push('pua');
  if(r>=5||l>3)types.push('div');
  const n=clamp(2+r+Math.floor(l*.8),3,10);
  return{R,boss:false,kmul,smul,waves:r>=3?2:1,n,types};
}
function edgeSpot(R){
  /* aparecen pegados a los muros y nunca a menos de 5 del héroe */
  for(let i=0;i<24;i++){
    const x=(-RW+1.1)+R()*(RW*2-2.2);
    const z=(-RH+1.1)+R()*(RH*2-2.2)*.62;      /* .62: más arriba que el héroe */
    if(Math.hypot(x-hx,z-hz)>4.2&&!inObs(x,z,.8))return{x,z};
  }
  return{x:0,z:-RH+1.6};
}
function mkEnemy(t,pl,x,z,gen){
  const kmul=pl.kmul,smul=pl.smul;
  const B={mole :{shape:0,hp:9 ,sp:1.9,r:.5 ,dmg:1,col:PAL.e1,sc:1  },
           torre:{shape:1,hp:7 ,sp:1.5,r:.52,dmg:1,col:PAL.e2,sc:1  },
           pua  :{shape:2,hp:11,sp:2.2,r:.55,dmg:2,col:PAL.e3,sc:1  },
           div  :{shape:3,hp:16,sp:1.4,r:.72,dmg:1,col:PAL.e4,sc:1.15},
           mini :{shape:0,hp:6 ,sp:2.6,r:.36,dmg:1,col:PAL.e4,sc:.7 }}[t];
  /* con modelo 3D el bicho APOYA en el piso (el pivote quedó en la base al
     hornear la geometría); con la primitiva vieja flota a media altura */
  const yo=(IE.glb&&IE.glb[B.shape])?0:(B.shape===1?.6:(B.shape===2?.56:.5));
  const e={t,shape:B.shape,x,z,px:x,pz:z,r:B.r,sc:B.sc,col:B.col,yo,
    hp:Math.round(B.hp*kmul),hpMax:Math.round(B.hp*kmul),sp:B.sp*smul,dmg:B.dmg,
    st:'in',stT:.55,ph:rnd(0,TAU),flash:0,bob:rnd(0,TAU),gen:gen||0,cd:rnd(.6,1.8)};
  ens.push(e);
  tels.push({x,z,r:e.r*2.2,l:.55,L:.55});
  return e;
}
function spawnWave(){
  const pl=plan||(plan=roomPlan(lvl,room));
  waveI++;
  const per=Math.ceil(pl.n/pl.waves);
  const nn=Math.min(per,CAPE-ens.length-4);
  for(let i=0;i<nn;i++){
    const t=pl.types[Math.floor(pl.R()*pl.types.length)];
    const s=edgeSpot(pl.R);
    mkEnemy(t,pl,s.x,s.z,0);
  }
  if(waveI>1){notice=T('wave')+' '+waveI+'/'+waveN;noticeT=1.5;noticeBig=0;}
}
function spawnBoss(){
  const hpv=Math.round((52+lvl*26+(room===8?38:0)));
  boss={x:0,z:-RH+1.9,px:0,pz:-RH+1.9,r:1.32,hp:hpv,hpMax:hpv,flash:0,
    st:'idle',stT:1.4,pat:0,shots:0,ang:0,dmg:2,sp:1.5+lvl*.06};
  bossHpMax=hpv;
  if(bossN)bossN.visible=true;
  notice=T('bossHere');noticeT=2;noticeBig=1;
  ARC.sfx('groan');ARC.shake(9);ARC.vib([20,60,20]);
}
function newRoom(){
  const pl=plan=roomPlan(lvl,room);
  ens.length=0;hbs.length=0;ebs.length=0;tels.length=0;boss=null;
  if(bossN)bossN.visible=false;
  if(bossFB)bossFB.visible=false;
  waveI=0;waveN=pl.waves;pend=0;pendT=0;ph='fight';phT=0;
  /* cajas: nunca en el centro ni pegadas al héroe */
  obs=[];
  const nb=isBoss(room)?0:(pl.R()<.72?1+Math.floor(pl.R()*3):0);
  for(let i=0;i<nb;i++){
    const x=(-RW+2.2)+pl.R()*(RW*2-4.4),z=(-RH+1.9)+pl.R()*(RH*2-4.4);
    if(Math.hypot(x-hx,z-hz)<2.6)continue;
    obs.push({x,z,r:.62,h:1.45});
  }
  buildObs();
  /* ZONA: cambia a mitad del nivel (salas 1-4 una, 5-8 otra). Si cambió se
     rehornea la arena entera con la paleta nueva y se reparten sus peligros. */
  const zi=zoneFor(lvl,room);
  const changed=setZone(zi);
  buildHaz(pl);
  hx=0;hz=RH-1.25;phx=hx;phz=hz;vx=vz=0;
  if(pl.boss){waveI=waveN=1;spawnBoss();}
  else{spawnWave();notice=T('room')+' '+room+'/8';noticeT=1.4;noticeBig=0;}
  if(changed){
    notice=T(zone.nk);noticeT=2.1;noticeBig=1;
    const hk={lava:'hLava',espina:'hEspina',hielo:'hHielo',vacio:'hVacio'}[zone.haz];
    if(hk)ARC.toast(T(hk));
    ARC.sfx('door',{vol:.45});
  }
  hud();
}
function inObs(x,z,r){
  for(const o of obs)if(Math.hypot(x-o.x,z-o.z)<o.r+r)return true;
  return false;
}

/* ------------------------------------------------------------- disparos */
/* rk = multiplicador de cadencia: 1 quieto (automático), 0,65 con el botón en
   movimiento. El mandoble del héroe se reinicia acá para que el golpe coincida
   con la flecha que sale. */
function fire(rk){
  rk=rk||1;
  const tg=nearestEnemy(hx,hz);
  if(tg)aim=Math.atan2(tg.x-hx,tg.z-hz);
  const n=Math.min(4,P.mult);
  for(let k=0;k<n;k++){
    const a=aim+(k-(n-1)/2)*.15;
    shoot(a,P.dmg);
  }
  ARC.sfx('slash',{vol:.42,rate:1+rnd(-.08,.08)});
  if(MX&&ACT.atk){
    /* el clip dura 2,83 s: se acelera para que el mandoble entre justo en el
       intervalo entre disparos, si no golpearía en cámara lenta */
    ACT.atk.a.timeScale=clamp(ACT.atk.dur/Math.max(.18,1/(P.rate*rk)),1,6);
    ACT.atk.a.reset().play();
    heroAct('atk',1);
  }
  /* FOGONAZO: el disparo es automático, así que si no se ve salir la flecha el
     jugador no entiende por qué le conviene quedarse quieto */
  if(partK>.5){
    /* el ángulo del chispazo se saca proyectando DOS puntos del mundo: el ángulo
       de la pantalla no es el del mundo (la cámara está inclinada 52°) */
    const p=proj(hx+Math.sin(aim)*.62,.78,hz+Math.cos(aim)*.62);
    const p2=proj(hx+Math.sin(aim)*2,.78,hz+Math.cos(aim)*2);
    ARC.fx.burst(p.x,p.y,{n:3,color:PAL.hb,speed:130,size:3,life:.16,g:0,
      a:Math.atan2(p2.y-p.y,p2.x-p.x)});
    ARC.fx.ring(p.x,p.y,{r0:2,r:ARC.H*.032,color:PAL.hb,w:2,life:.14});
  }
  shotT=1/(P.rate*rk);
  shotsN++;
}
function shoot(a,dmg){
  if(hbs.length>=CAPB)return;
  const crit=Math.random()<P.crit;
  hbs.push({x:hx+Math.sin(a)*.55,z:hz+Math.cos(a)*.55,
    vx:Math.sin(a)*13,vz:Math.cos(a)*13,dmg:crit?dmg*2:dmg,crit,
    b:P.bounce,pc:P.pierce,l:1.9,hit:[]});
}
function ability(){
  if(abilT>0||ph!=='fight'||!ARC.alive)return;
  abilT=12;
  for(let k=0;k<10;k++)shoot(aim+(k-4.5)*.13,P.dmg*.8);
  ARC.sfx('power');ARC.shake(5);ARC.vib(18);
  ARC.fx.ring(ARC.W/2,ARC.H*.62,{r:ARC.H*.3,color:PAL.hb,w:5,life:.4});
}
function ebShoot(x,z,a,sp,dmg){
  if(ebs.length>=CAPEB)return;
  ebs.push({x,z,vx:Math.sin(a)*sp,vz:Math.cos(a)*sp,dmg:dmg||1,l:4.5,r:.24});
}
function nearestEnemy(x,z){
  let b=null,bd=1e9;
  if(boss&&boss.hp>0){bd=Math.hypot(boss.x-x,boss.z-z);b=boss;}
  for(const e of ens){
    if(e.st==='in')continue;
    const d=Math.hypot(e.x-x,e.z-z);
    if(d<bd){bd=d;b=e;}
  }
  return b;
}
/* -------------------------------------------------------------- daño y muerte */
function dmgEnemy(e,d,bx,bz,crit){
  e.hp-=d;e.flash=.16;
  ARC.shake(crit?4:2);
  const p=proj(e.x,(e.r*e.sc)+.5,e.z);
  ARC.fx.text(p.x,p.y,(crit?'✸':'')+Math.round(d),
    {color:crit?'#fff07a':'#ffffff',size:Math.max(11,ARC.H*(crit?.055:.042)),life:.6});
  if(partK>.5)ARC.fx.burst(p.x,p.y,{n:crit?7:4,color:PAL.hb,speed:150,size:3,life:.28,g:200});
  if(e.hp<=0)killEnemy(e,bx,bz);
}
function killEnemy(e,bx,bz){
  const p=proj(e.x,.6,e.z);
  ARC.fx.burst(p.x,p.y,{n:Math.round(16*partK),color:e.col,speed:240,size:5,life:.55,sq:true});
  ARC.fx.ring(p.x,p.y,{r:ARC.H*.09,color:e.col,w:3,life:.3});
  ARC.sfx('splat',{vol:.55,rate:1+rnd(-.1,.15)});
  ARC.shake(4);kills++;lastEv='kill:'+e.t;
  dropCoins(e.x,e.z,e.t==='mini'?1:(e.t==='div'?4:2));
  if(e.t==='div'&&!e.gen){
    const pl=plan;
    for(const s of [-1,1]){
      const m=mkEnemy('mini',pl,clamp(e.x+s*.9,-RW+1,RW-1),clamp(e.z,-RH+1,RH-1),1);
      m.st='walk';m.stT=0;tels.pop();
    }
  }
  const i=ens.indexOf(e);if(i>=0)ens.splice(i,1);
}
function dropCoins(x,z,n){
  for(let i=0;i<n&&cns.length<CAPC;i++){
    const a=rnd(0,TAU);
    cns.push({x,z,y:.5,vx:Math.cos(a)*rnd(.5,2),vz:Math.sin(a)*rnd(.5,2),vy:rnd(2.5,4.5),sp:rnd(0,TAU)});
  }
}
function hurtHero(d){
  if(inv>0||ph!=='fight')return;
  hp-=d;inv=.85;hitFlash=.3;
  ARC.sfx('boom',{vol:.5});ARC.shake(11);ARC.vib(45);
  const p=proj(hx,1.3,hz);
  ARC.fx.text(p.x,p.y,'-'+d,{color:'#ff6b8a',size:Math.max(14,ARC.H*.06),life:.7});
  ARC.fx.burst(p.x,p.y,{n:Math.round(10*partK),color:'#ff3d68',speed:190,size:4,life:.4});
  if(hp<=0){hp=0;die();}
}
function die(){
  if(ph==='dead')return;
  ph='dead';phT=0;
  ARC.shake(16);
  const p=proj(hx,.8,hz);
  ARC.fx.burst(p.x,p.y,{n:Math.round(30*partK),color:PAL.hero,speed:300,size:6,life:.9,sq:true});
  setTimeout(()=>{
    if(ph!=='dead')return;
    const sc=(lvl-1)*8+roomsRun;
    ARC.over({win:false,score:sc,stars:0,coins:coinRun,title:T('dTtl'),
      sub:T('statRooms')+': '+roomsRun+'/8 &nbsp;·&nbsp; '+T('statKills')+': '+kills+
        '<br>'+T('statCoins')+': ◉ '+coinRun+' &nbsp;·&nbsp; '+T('statBest')+': '+Math.max(ARC.S.best||0,sc)+
        '<br>'+T('allUp')+': '+upList()});
  },900);
}
function upList(){
  const o=[];for(const u of UPS)if(taken[u.id])o.push(u.ic+' x'+taken[u.id]);
  return o.length?o.join(' '):'—';
}

/* ------------------------------------------------------------- las cartas */
function layoutCards(){
  const W=ARC.W,H=ARC.H;
  const n=cards.length||3;
  const cw=Math.min(W*.26,H*.46),gap=Math.max(8,W*.022);
  const ch=cw*1.34;
  const tot=n*cw+(n-1)*gap;
  const y=H*.5-ch*.42;
  cardR=[];
  for(let i=0;i<n;i++)cardR.push({x:(W-tot)/2+i*(cw+gap),y,w:cw,h:ch});
}
function openPick(){
  ph='pick';phT=0;
  const pool=UPS.filter(u=>!u.cap||(taken[u.id]||0)<u.cap)
                .filter(u=>u.id!=='heal'||hp<P.hpMax-1);
  cards=[];
  const bag=pool.slice();
  for(let i=0;i<3&&bag.length;i++)cards.push(bag.splice(Math.floor(Math.random()*bag.length),1)[0]);
  while(cards.length<3)cards.push(UPS[0]);
  layoutCards();
  ARC.sfx('chime');
}
function pickCard(i){
  const u=cards[i];if(!u)return;
  taken[u.id]=(taken[u.id]||0)+1;
  u.fn();
  ARC.sfx('power');ARC.vib(20);
  ARC.fx.ring(ARC.W/2,ARC.H/2,{r:ARC.H*.5,color:G.acc,w:6,life:.45});
  cards=[];cardR=[];
  room++;roomsRun=room-1;
  newRoom();
}
function roomCleared(){
  ph='clear';phT=0;
  roomsRun=room;
  /* aspiradora: lo que quedó en el piso es tuyo */
  if(cns.length){
    coinRun+=cns.length;
    ARC.sfx('coin',{rate:1.3});
    const p=proj(hx,1,hz);
    ARC.fx.text(p.x,p.y-ARC.H*.06,'+'+cns.length+' ◉',
      {color:PAL.coin,size:Math.max(12,ARC.H*.05),life:.9});
    cns.length=0;hud();
  }
  ARC.sfx('win',{vol:.4});
  doorM.material.color.set(PAL.doorOn);
  notice=T('clear');noticeT=1.3;noticeBig=1;
  if(!recTold&&(lvl-1)*8+room>(ARC.S.best||0)&&(ARC.S.best||0)>3){recTold=true;ARC.toast(T('newRec'));}
}
function winLevel(){
  ph='won';
  const frac=hp/P.hpMax;
  const st=frac>=.7?3:(frac>=.34?2:1);
  ARC.fx.burst(ARC.W/2,ARC.H*.5,{n:Math.round(40*partK),color:G.acc,speed:320,size:6,life:1});
  setTimeout(()=>ARC.over({win:true,score:lvl*8,stars:st,coins:coinRun+20,title:T('wTtl'),
    sub:T('statKills')+': '+kills+' &nbsp;·&nbsp; '+T('statCoins')+': ◉ '+(coinRun+20)+
      '<br>'+T('hpLbl')+': '+hp+'/'+P.hpMax+'<br>'+T('allUp')+': '+upList()}),700);
}

/* --------------------------------------------------------------- la FRAGUA */
function shopState(){
  if(!ARC.S.shop)ARC.S.shop={hp:0,dmg:0,mag:0,rate:0};
  return ARC.S.shop;
}
function shopOpen(){
  const S=shopState();
  let el=document.getElementById('arShop');
  if(!el){
    el=document.createElement('div');el.id='arShop';el.className='scr';
    document.getElementById('stage').appendChild(el);
  }
  const row=(it)=>{
    const n=S[it.id]|0,mx=n>=it.max,c=it.c(n);
    return '<div class="opt" style="gap:1.2vmin">'+
      '<div class="sm" style="text-align:left;flex:1;opacity:1">'+
        '<b style="font-size:1.15em">'+it.ic+' '+T(it.k)+'</b>'+
        '<div style="opacity:.7">'+T(it.d)+' · '+T('lvlN')+' '+n+'/'+it.max+'</div></div>'+
      '<div class="btn'+(mx?' gh':'')+'" data-buy="'+it.id+'" style="min-width:9em">'+
        (mx?T('max'):(T('buy')+' ◉'+c))+'</div></div>';
  };
  el.innerHTML='<div class="card" style="max-width:92vmin;gap:1.1vmin">'+
    '<div class="h2">⚒ '+T('shop')+'</div>'+
    '<div class="sm">'+T('shopSub')+'</div>'+
    '<div class="sm" style="opacity:1"><b style="font-size:1.3em;color:var(--acc)">◉ '+
      (ARC.S.coins||0)+'</b> '+T('coins')+'</div>'+
    SHOP.map(row).join('')+
    '<div class="btn" id="arShopX">'+T('close')+'</div></div>';
  el.classList.add('on');
  el.querySelectorAll('[data-buy]').forEach(b=>{
    b.addEventListener('pointerdown',e=>{
      e.preventDefault();
      const it=SHOP.find(s=>s.id===b.getAttribute('data-buy'));
      const n=S[it.id]|0;
      if(n>=it.max){ARC.sfx('click');return;}
      const c=it.c(n);
      if((ARC.S.coins||0)<c){ARC.sfx('lose',{vol:.4});ARC.toast(T('noCoins'));return;}
      ARC.S.coins-=c;S[it.id]=n+1;ARC.save();
      ARC.sfx('power');ARC.vib(18);ARC.toast(T('bought'));
      const mc=document.getElementById('mCoins');if(mc)mc.textContent=ARC.S.coins;
      shopOpen();
    });
  });
  const x=document.getElementById('arShopX');
  x.addEventListener('pointerdown',e=>{e.preventDefault();ARC.sfx('tap');
    el.classList.remove('on');});
}
G.extra={icon:'⚒',fn:shopOpen};

/* ------------------------------------------------------------------ entrada */
function joyVec(){
  if(!joy)return null;
  const dx=joy.x-joy.ox,dy=joy.y-joy.oy;
  const d=Math.hypot(dx,dy);
  if(d<ARC.H*.035)return null;
  const k=Math.min(1,d/(ARC.H*.16));
  return{x:dx/d*k,y:dy/d*k};
}
G.down=function(p){
  if(ph==='pick'){
    for(let i=0;i<cardR.length;i++){
      const r=cardR[i];
      if(p.x>=r.x&&p.x<=r.x+r.w&&p.y>=r.y&&p.y<=r.y+r.h){pickCard(i);return;}
    }
    return;
  }
  botOn=0;joy={ox:p.x,oy:p.y,x:p.x,y:p.y};
};
G.move=function(p){if(joy){joy.x=p.x;joy.y=p.y;}};
G.up=function(){joy=null;};
G.key=function(c,d){
  const k={ArrowLeft:[-1,0],KeyA:[-1,0],ArrowRight:[1,0],KeyD:[1,0],
           ArrowUp:[0,-1],KeyW:[0,-1],ArrowDown:[0,1],KeyS:[0,1]}[c];
  if(k){
    botOn=0;
    if(d)joy={ox:0,oy:0,x:k[0]*ARC.H*.2,y:k[1]*ARC.H*.2};
    else joy=null;
    return;
  }
  if(c==='KeyJ'||c==='ShiftLeft'||c==='ShiftRight'){fireHold=d?1:0;
    if(d&&shotT>.12)shotT=.12;return;}
  if(d&&(c==='Space'))ability();
  if(d&&c==='Digit1'&&ph==='pick')pickCard(0);
};

/* -------------------------------------------------------------------- ciclo */
function menuCss(){
  if(document.getElementById('arCss'))return;
  const st=document.createElement('style');st.id='arCss';
  st.textContent=
    '#menu.hasart.live .ttl{display:block}'+
    '#menu.live .ttl{font-size:clamp(30px,10.5vmin,86px);'+
      'background:linear-gradient(180deg,#ffe8a8 0%,#ffb02e 52%,#e0651b 100%);'+
      '-webkit-background-clip:text;background-clip:text;color:transparent;'+
      'filter:drop-shadow(0 3px 0 rgba(60,20,0,.55)) drop-shadow(0 10px 26px rgba(0,0,0,.8))}'+
    '#menu.live .ttl em{color:inherit}'+
    '#menu.live .mMid{justify-content:flex-start;padding-top:1vmin}'+
    '#menu.live .sub{max-width:min(70vmin,560px)}'+
    '#menu.live .sub{text-shadow:0 2px 10px rgba(4,2,10,.95),0 0 22px rgba(4,2,10,.9)}';
  document.head.appendChild(st);
}
G.init=function(){
  T3=ARC.THREE;if(!T3)return;
  menuCss();
  const gp=ARC.gfxP?ARC.gfxP():{part:1,fog:1};
  partK=gp.part;fogK=gp.fog;decoK=clamp(gp.part,.4,1.3);
  scene=new T3.Scene();
  scene.background=new T3.Color(G.sky);
  scene.fog=new T3.Fog(new T3.Color(PAL.fog).getHex(),34*fogK,96*fogK);
  cam=new T3.PerspectiveCamera(FOV,ARC.W/Math.max(1,ARC.H),.1,220);
  scene.add(new T3.HemisphereLight(0xf3e2ff,0x2a1c40,1.5));
  const d=new T3.DirectionalLight(0xffffff,.95);d.position.set(4,10,7);scene.add(d);
  buildPools();
  buildArena();buildDeco();
  heroN=glbNode('heroe',2.3,HYAW,true);
  if(!heroN){heroFB=new T3.Group();const hm=heroGeo();hm.scale.setScalar(1.34);
    heroFB.add(hm);scene.add(heroFB);}
  else{scene.add(heroN);heroAnim(heroN.inner);}
  bossN=glbNode('jefe',3.0,HYAW);
  if(!bossN){bossFB=new T3.Group();const bm=bossGeo();bm.scale.setScalar(.92);
    bossFB.add(bm);scene.add(bossFB);bossFB.visible=false;}
  else{scene.add(bossN);bossN.visible=false;}
  P=basePerks();
  fitCam();
};
G.resize=function(){fitCam();resApply();if(ph==='pick')layoutCards();};
G.gfxApply=function(gp){
  partK=gp.part;fogK=gp.fog;
  const nd=clamp(gp.part,.4,1.3);
  if(scene&&scene.fog){scene.fog.near=34*fogK;scene.fog.far=96*fogK;}
  if(scene&&nd!==decoK){decoK=nd;buildDeco();}
  resApply();
};
function basePerks(){
  const S=shopState();
  return{dmg:6*(1+.08*(S.dmg|0)),rate:2.4*(1+.07*(S.rate|0)),spd:5.2,
    hpMax:6+(S.hp|0),mult:1,bounce:0,pierce:0,mag:2.2*(1+.45*(S.mag|0)),crit:.05};
}
G.start=function(l){
  if(!T3)return;
  demo=0;camK=1;camDZ=0;
  lvl=clamp(l||1,1,8);
  P=basePerks();taken={};
  hp=P.hpMax;inv=0;shotT=0;kills=0;coinRun=0;roomsRun=0;abilT=0;
  cns.length=0;hbs.length=0;ebs.length=0;tels.length=0;
  room=1;recTold=false;botOn=0;joy=null;tut=1;lastEv='';
  hitFlash=0;camA=0;
  doorM.material.color.set(PAL.door);
  fireHold=0;
  newRoom();
  /* BOTÓN DE DISPARO propio, aparte del automático: sostenido dispara también en
     movimiento (a 65% de cadencia). El del rayo queda al lado, como estaba. */
  ARC.tray([{id:'ab',txt:'⚡',sq:1,fn:ability},
            {id:'fi',txt:'⚔',sq:1,cls:'big',hold:d=>{fireHold=d;
              if(d&&shotT>.12)shotT=.12;}}]);
  hud();
};
function hud(){
  ARC.hud(coinRun,T('level')+' '+lvl+' · '+(isBoss(room)?T('bossRoom'):T('room')+' '+room+'/8'));
}
G.i18nDone=function(){if(ARC.scr==='game')hud();};
G.pause=function(){joy=null;fireHold=0;};

/* ---------------------------------------------------------------- simulación */
G.step=function(dt){
  if(!T3)return;
  if(MX)MX.update(dt);
  /* los peligros laten en CUALQUIER fase: si sólo latieran en 'fight', entre
     oleadas y mientras se elige la mejora el piso quedaba congelado (y la sonda
     no veía nunca el aviso de la grieta). */
  hazStep(dt);
  phx=hx;phz=hz;paim=aim;
  for(const e of ens){e.px=e.x;e.pz=e.z;}
  if(boss){boss.px=boss.x;boss.pz=boss.z;}
  if(abilT>0){const q=Math.ceil(abilT);abilT=Math.max(0,abilT-dt);
    const q2=abilT>0?Math.ceil(abilT):0;
    if(q2!==q)ARC.trayTxt('ab',q2?q2:'⚡');}
  resStep(dt);
  if(noticeT>0)noticeT-=dt;
  if(hitFlash>0)hitFlash-=dt;
  if(inv>0)inv-=dt;
  for(let i=tels.length-1;i>=0;i--){tels[i].l-=dt;if(tels[i].l<=0)tels.splice(i,1);}
  stepCoins(dt);
  if(ph==='dead'){phT+=dt;stepBullets(dt,true);return;}
  if(ph==='won')return;
  if(ph==='clear'){
    phT+=dt;
    stepBullets(dt,true);
    if(phT>1.05){
      if(room>=8)winLevel();
      else openPick();
    }
    return;
  }
  if(ph==='pick'){phT+=dt;stepBullets(dt,true);return;}
  /* ---- pelea ---- */
  phT+=dt;
  if(botOn)botThink();
  const jv=joyVec();
  moving=0;
  /* ZARZAS: el jardín frena a la mitad mientras estés dentro de la mata */
  const hzOn=hazAt(hx,hz);
  const slow=(hzOn&&hzOn.t==='espina')?HAZ.espina.slow:1;
  let tvx=0,tvz=0;
  if(jv){
    /* la pantalla apunta a -Z arriba: el vector del dedo se mapea directo */
    tvx=jv.x*P.spd*slow;tvz=jv.y*P.spd*slow;
    moving=1;stillT=0;
  }else stillT+=dt;
  /* HIELO: el piso patina. La velocidad no salta al valor del dedo, lo persigue,
     así que frenar lleva medio segundo y hay que anticipar. En las otras zonas la
     respuesta es instantánea como siempre (tau=0). */
  if(zone.haz==='hielo'){
    const k=Math.min(1,dt*3.4);
    vx+=(tvx-vx)*k;vz+=(tvz-vz)*k;
    if(Math.hypot(vx,vz)>.25)moving=1,stillT=0;   /* patinando NO se dispara solo */
  }else{vx=tvx;vz=tvz;}
  if(moving||Math.hypot(vx,vz)>.05)aim=Math.atan2(vx,vz);
  const ohx=hx,ohz=hz;
  hx=clamp(hx+vx*dt,-RW+HR,RW-HR);
  hz=clamp(hz+vz*dt,-RH+HR,RH-HR);
  for(const o of obs){                        /* empujar fuera de las cajas */
    const d=Math.hypot(hx-o.x,hz-o.z),m=o.r+HR;
    if(d<m&&d>.0001){hx=o.x+(hx-o.x)/d*m;hz=o.z+(hz-o.z)/d*m;}
  }
  /* VACÍO: el agujero abierto no se puede cruzar (empuja para afuera como una caja) */
  if(zone.haz==='vacio')for(const h of HZL){
    if(!h.on)continue;
    const d=Math.hypot(hx-h.x,hz-h.z),m=h.r+HR*.8;
    if(d<m&&d>.0001){hx=h.x+(hx-h.x)/d*m;hz=h.z+(hz-h.z)/d*m;vx*=.2;vz*=.2;}
  }
  hx=clamp(hx,-RW+HR,RW-HR);hz=clamp(hz,-RH+HR,RH-HR);
  /* FRAGUA: la grieta encendida quema (con los 0,8 s de aviso para salir) */
  if(zone.haz==='lava'&&inv<=0){
    const h=hazAt(hx,hz);
    if(h&&h.t==='lava'){hurtHero(HAZ.lava.dmg);
      const p=proj(hx,.5,hz);
      ARC.fx.burst(p.x,p.y,{n:Math.round(14*partK),color:PAL.strip,
        speed:180,size:5,life:.5});}
  }
  if(zone.haz==='hielo'&&moving&&Math.random()<dt*1.6)
    ARC.sfx('ice',{vol:.16,rate:1.1+Math.random()*.3});
  /* DISPARO. AUTOMÁTICO quieto (la mecánica del género) y MANUAL con el botón
     sostenido, que sí dispara en movimiento pero a 65% de cadencia: así el botón
     agrega opciones sin borrar la tensión de tener que plantarse. */
  shotT-=dt;
  const tg0=nearestEnemy(hx,hz);
  if(!moving&&stillT>.08){
    if(tg0){
      aim=Math.atan2(tg0.x-hx,tg0.z-hz);
      if(shotT<=0)fire(1);
    }
  }else if(fireHold){
    /* con blanco apunta solo; sin blanco tira para donde mira. Si exigiera blanco,
       apretar el botón en una sala vacía no haría NADA y se sentiría roto. */
    if(tg0)aim=Math.atan2(tg0.x-hx,tg0.z-hz);
    if(shotT<=0)fire(.65);
  }
  /* ANIMACIÓN DEL HÉROE: corre si se mueve, guardia si está plantado. El ataque lo
     dispara fire() y heroAct lo protege hasta la mitad del mandoble. */
  heroAct(moving?'run':'idle',dt);
  stepEnemies(dt);
  stepBoss(dt);
  stepBullets(dt,false);
  /* ¿sala limpia? */
  if(!ens.length&&!boss){
    if(waveI<waveN){
      pendT-=dt;
      if(pendT<=0){pendT=1.1;spawnWave();}
    }else if(phT>.4)roomCleared();
  }else pendT=1.1;
  if(tut&&(phT>7||kills>0))tut=0;
};
function stepCoins(dt){
  for(let i=cns.length-1;i>=0;i--){
    const c=cns[i];
    c.vy-=13*dt;c.y+=c.vy*dt;
    if(c.y<.22){c.y=.22;c.vy=0;c.vx*=.7;c.vz*=.7;}
    c.x=clamp(c.x+c.vx*dt,-RW+.4,RW-.4);
    c.z=clamp(c.z+c.vz*dt,-RH+.4,RH-.4);
    c.sp+=dt*5;
    const d=Math.hypot(c.x-hx,c.z-hz);
    if(d<P.mag&&ph!=='dead'){                 /* imán: tirón proporcional */
      const k=Math.min(.55,7*dt/Math.max(.8,d));
      c.x+=(hx-c.x)*k;c.z+=(hz-c.z)*k;
    }
    if(d<.62){
      cns.splice(i,1);coinRun++;
      ARC.sfx('coin',{vol:.4,rate:1+Math.min(.5,coinRun*.01)});
      const p=proj(hx,1,hz);
      ARC.fx.text(p.x,p.y,'+1',{color:PAL.coin,size:Math.max(10,ARC.H*.034),life:.45});
      hud();
    }
  }
}
function stepEnemies(dt0){
  const t=ARC.t;
  for(let i=ens.length-1;i>=0;i--){
    const e=ens[i];
    /* las ZARZAS frenan a TODOS: si sólo frenaran al héroe serían un castigo, y
       así en cambio son terreno que conviene usar a favor. OJO: el paso frenado
       es LOCAL de este enemigo (si se tocara el dt de la función, el freno se le
       pegaría a todos los que vienen después en el mismo cuadro). */
    if(zone.haz==='espina'){
      const h=hazAt(e.x,e.z);
      e.slow=(h&&h.t==='espina')?HAZ.espina.slow:1;
    }else e.slow=1;
    const dt=dt0*e.slow;
    if(e.flash>0)e.flash-=dt0;
    e.bob+=dt*6;
    if(e.st==='in'){                            /* apareciendo (aviso) */
      e.stT-=dt;
      if(e.stT<=0){e.st='walk';e.stT=0;}
      continue;
    }
    const dx=hx-e.x,dz=hz-e.z,d=Math.hypot(dx,dz)||.001;
    if(e.t==='torre'){
      /* mantiene distancia y dispara */
      const want=4.9;
      const s=(d<want-1?-1:(d>want+1.4?1:0))*e.sp;
      e.x+=dx/d*s*dt;e.z+=dz/d*s*dt;
      e.x+=-dz/d*e.sp*.5*dt*Math.sin(t*.8+e.ph);
      e.z+= dx/d*e.sp*.5*dt*Math.sin(t*.8+e.ph);
      e.cd-=dt;
      if(e.cd<=0&&d<11){e.cd=1.6;ebShoot(e.x,e.z,Math.atan2(dx,dz),6.6,1);
        ARC.sfx('click',{vol:.25,rate:.7});}
    }else if(e.t==='pua'){
      /* se planta, avisa con un anillo, y embiste en línea recta */
      if(e.st==='walk'){
        e.x+=dx/d*e.sp*.55*dt;e.z+=dz/d*e.sp*.55*dt;
        if(d<5.8){e.st='wind';e.stT=.65;
          tels.push({x:e.x,z:e.z,r:1.1,l:.65,L:.65});}
      }else if(e.st==='wind'){
        e.stT-=dt;
        if(e.stT<=0){e.st='dash';e.stT=.5;e.dvx=dx/d*12;e.dvz=dz/d*12;
          ARC.sfx('swipe',{vol:.3});}
      }else if(e.st==='dash'){
        e.stT-=dt;e.x+=e.dvx*dt;e.z+=e.dvz*dt;
        if(e.stT<=0){e.st='rest';e.stT=.7;}
      }else{e.stT-=dt;if(e.stT<=0)e.st='walk';}
    }else{
      /* mole / divisor / mini: van al héroe */
      const s=e.sp*(e.t==='div'?.85:1);
      e.x+=dx/d*s*dt;e.z+=dz/d*s*dt;
    }
    /* separación: sin esto se apilan y parecen un solo bicho */
    for(let j=0;j<ens.length;j++){
      if(j===i)continue;
      const o=ens[j];
      const ddx=e.x-o.x,ddz=e.z-o.z,dd=Math.hypot(ddx,ddz),m=(e.r*e.sc+o.r*o.sc)*.95;
      if(dd<m&&dd>.0001){e.x+=ddx/dd*(m-dd)*.5;e.z+=ddz/dd*(m-dd)*.5;}
    }
    for(const o of obs){
      const ddx=e.x-o.x,ddz=e.z-o.z,dd=Math.hypot(ddx,ddz),m=o.r+e.r*e.sc;
      if(dd<m&&dd>.0001){e.x=o.x+ddx/dd*m;e.z=o.z+ddz/dd*m;}
    }
    e.x=clamp(e.x,-RW+.5,RW-.5);e.z=clamp(e.z,-RH+.5,RH-.5);
    /* contacto */
    if(d<e.r*e.sc+HR+.05){
      hurtHero(e.dmg);
      const k=e.t==='pua'?1.6:.9;
      e.x-=dx/d*k;e.z-=dz/d*k;
      if(e.t==='pua'&&e.st==='dash'){e.st='rest';e.stT=.8;}
    }
  }
}
function stepBoss(dt){
  if(!boss)return;
  const b=boss;
  if(b.flash>0)b.flash-=dt;
  const dx=hx-b.x,dz=hz-b.z,d=Math.hypot(dx,dz)||.001;
  b.stT-=dt;
  if(b.st==='idle'){
    b.x+=dx/d*b.sp*.5*dt;b.z+=dz/d*b.sp*.5*dt;
    if(b.stT<=0){
      b.pat=(b.pat+1)%4;b.shots=0;
      if(b.pat===0){b.st='volley';b.stT=.35;}
      else if(b.pat===1){b.st='wind';b.stT=.85;
        tels.push({x:b.x,z:b.z,r:2.1,l:.85,L:.85});}
      else if(b.pat===2){b.st='summon';b.stT=.5;}
      else{b.st='spiral';b.stT=.1;b.ang=0;}
    }
  }else if(b.st==='volley'){
    if(b.stT<=0){
      const n=10+lvl;
      for(let k=0;k<n;k++)ebShoot(b.x,b.z,k/n*TAU+b.shots*.3,5.6,1);
      ARC.sfx('groan',{vol:.45,rate:1.3});ARC.shake(6);
      b.shots++;b.stT=.55;
      if(b.shots>=2){b.st='idle';b.stT=1.5;}
    }
  }else if(b.st==='wind'){
    if(b.stT<=0){b.st='charge';b.stT=1.15;b.dvx=dx/d*9.5;b.dvz=dz/d*9.5;
      ARC.sfx('groan',{vol:.5});}
  }else if(b.st==='charge'){
    b.x+=b.dvx*dt;b.z+=b.dvz*dt;
    if(b.x<-RW+b.r||b.x>RW-b.r){b.dvx*=-1;ARC.shake(8);}
    if(b.z<-RH+b.r||b.z>RH-b.r){b.dvz*=-1;ARC.shake(8);}
    if(b.stT<=0){b.st='idle';b.stT=1.3;}
  }else if(b.st==='summon'){
    if(b.stT<=0){
      const pl=plan;
      for(let k=0;k<3;k++){
        const a=k/3*TAU;
        mkEnemy('mole',pl,clamp(b.x+Math.cos(a)*1.9,-RW+1,RW-1),
                          clamp(b.z+Math.sin(a)*1.9,-RH+1,RH-1),1);
      }
      ARC.sfx('power',{rate:.7});
      b.st='idle';b.stT=1.6;
    }
  }else if(b.st==='spiral'){
    if(b.stT<=0){
      b.ang+=.55;
      for(const o of [0,Math.PI])ebShoot(b.x,b.z,b.ang+o,5.2,1);
      b.stT=.075;b.shots++;
      if(b.shots>26){b.st='idle';b.stT=1.4;}
    }
  }
  b.x=clamp(b.x,-RW+b.r,RW-b.r);b.z=clamp(b.z,-RH+b.r,RH-b.r);
  if(d<b.r+HR+.1)hurtHero(b.dmg);
}
function stepBullets(dt,calmOnly){
  /* balas del héroe */
  for(let i=hbs.length-1;i>=0;i--){
    const b=hbs[i];
    b.l-=dt;
    b.x+=b.vx*dt;b.z+=b.vz*dt;
    let out=false;
    if(b.x<-RW+.1||b.x>RW-.1){if(b.b>0){b.b--;b.vx*=-1;b.x=clamp(b.x,-RW+.15,RW-.15);}else out=true;}
    if(b.z<-RH+.1||b.z>RH-.1){if(b.b>0){b.b--;b.vz*=-1;b.z=clamp(b.z,-RH+.15,RH-.15);}else out=true;}
    for(const o of obs){
      if(Math.hypot(b.x-o.x,b.z-o.z)<o.r+.15){
        if(b.b>0){b.b--;const nx=(b.x-o.x),nz=(b.z-o.z),nn=Math.hypot(nx,nz)||1;
          const dot=(b.vx*nx+b.vz*nz)/nn/nn*2;
          b.vx-=dot*nx;b.vz-=dot*nz;b.x+=b.vx*dt*2;b.z+=b.vz*dt*2;}
        else out=true;
      }
    }
    if(!calmOnly){
      if(boss&&boss.hp>0&&b.hit.indexOf('B')<0&&Math.hypot(b.x-boss.x,b.z-boss.z)<boss.r+.2){
        boss.hp-=b.dmg;boss.flash=.14;b.hit.push('B');
        const p=proj(boss.x,2.4,boss.z);
        ARC.fx.text(p.x,p.y,(b.crit?'✸':'')+Math.round(b.dmg),
          {color:b.crit?'#fff07a':'#ffffff',size:Math.max(11,ARC.H*(b.crit?.055:.042)),life:.6});
        if(partK>.5)ARC.fx.burst(p.x,p.y,{n:4,color:PAL.hb,speed:150,size:3,life:.25,g:200});
        ARC.shake(3);
        if(boss.hp<=0)bossDie();
        if(b.pc>0)b.pc--;else out=true;
      }
      for(const e of ens){
        if(e.st==='in')continue;
        if(b.hit.indexOf(e)>=0)continue;
        if(Math.hypot(b.x-e.x,b.z-e.z)<e.r*e.sc+.2){
          b.hit.push(e);
          dmgEnemy(e,b.dmg,b.x,b.z,b.crit);
          if(b.pc>0)b.pc--;else out=true;
          break;
        }
      }
    }
    if(out||b.l<=0)hbs.splice(i,1);
  }
  /* balas enemigas */
  for(let i=ebs.length-1;i>=0;i--){
    const b=ebs[i];
    b.l-=dt;b.x+=b.vx*dt;b.z+=b.vz*dt;
    let out=b.l<=0||b.x<-RW||b.x>RW||b.z<-RH||b.z>RH;
    for(const o of obs)if(Math.hypot(b.x-o.x,b.z-o.z)<o.r+.2)out=true;
    if(!out&&!calmOnly&&ph==='fight'&&Math.hypot(b.x-hx,b.z-hz)<HR+b.r){
      hurtHero(b.dmg);out=true;
    }
    if(out)ebs.splice(i,1);
  }
}
function bossDie(){
  const b=boss;boss=null;
  if(bossN)bossN.visible=false;
  if(bossFB)bossFB.visible=false;
  const p=proj(b.x,1.6,b.z);
  for(let k=0;k<3;k++)setTimeout(()=>{
    ARC.fx.burst(p.x+rnd(-40,40),p.y+rnd(-30,30),
      {n:Math.round(18*partK),color:PAL.boss,speed:280,size:6,life:.7,sq:true});
    ARC.sfx('boom',{rate:.8+k*.15});
  },k*130);
  ARC.shake(18);ARC.vib([25,50,25]);
  dropCoins(b.x,b.z,16+lvl*2);
  kills++;lastEv='boss';
}

/* ------------------------------------------------------------------- dibujo */
function setInst(im,n){
  im.count=n;im.visible=n>0;
  if(n>0)im.instanceMatrix.needsUpdate=true;
}
function drawScene(a){
  const ihx=lerp(phx,hx,a),ihz=lerp(phz,hz,a);
  /* héroe */
  const hn=heroN||heroFB;
  if(hn){
    hn.position.set(ihx,ph==='dead'?-.4:0,ihz);
    hn.rotation.y=aim+(heroN?HYAW:Math.PI);
    hn.visible=ph!=='dead'||phT<.5;
    /* el rebote de caminar sólo hace falta SIN esqueleto: con el clip de corrida
       el brinco ya lo hace la animación y sumarle otro lo hace saltar doble */
    if(!MX){const bounce=moving?Math.abs(Math.sin(ARC.t*11))*.09:0;hn.position.y+=bounce;}
    hn.scale.setScalar(inv>0&&((ARC.frame>>2)&1)?.86:1);
  }
  /* jefe */
  const bn=bossN||bossFB;
  if(bn){
    if(boss){
      bn.visible=true;
      bn.position.set(lerp(boss.px,boss.x,a),0,lerp(boss.pz,boss.z,a));
      bn.rotation.y=Math.atan2(hx-boss.x,hz-boss.z)+(bossN?HYAW:Math.PI);
      const k=boss.flash>0?1.06:1;bn.scale.setScalar(k*(boss.st==='wind'?1.1:1));
    }else bn.visible=false;
  }
  /* PELIGROS DE LA ZONA: un disco tirado en el piso por peligro y, cuando avisa,
     un aro que se cierra encima. Dos llamadas de dibujo para todos. */
  if(IHZ){
    let nh=0,nw=0;
    for(const h of HZL){
      if(nh>=8)break;
      let col,op,sc=h.r;
      if(h.t==='espina'){col=PAL.e4;op=.5;}
      else if(h.t==='lava'){
        const k=h.on?1:(h.warn>0?.35+h.warn*.5:.22);
        col=h.on?'#ffd166':(h.warn>0?PAL.strip:'#7a2a10');op=k;
        sc=h.r*(h.on?1.06:1);
      }else{ /* vacío: el agujero se abre */
        col=h.on?zone.sky:(h.warn>0?PAL.rim:PAL.f0);
        op=h.on?1:(h.warn>0?.75:.45);
        sc=h.r*(h.on?1:.9+h.warn*.1);
      }
      dum.position.set(h.x,.03,h.z);dum.rotation.set(-Math.PI/2,0,0);
      dum.scale.setScalar(sc);dum.updateMatrix();
      IHZ.setMatrixAt(nh,dum.matrix);IHZ.setColorAt(nh,colOf(col));
      IHZ.material.opacity=.85;nh++;
      if(h.warn>0&&nw<8){
        dum.position.set(h.x,.05,h.z);dum.rotation.set(-Math.PI/2,0,0);
        dum.scale.setScalar(h.r*(1.9-h.warn));dum.updateMatrix();
        IHZ2.setMatrixAt(nw,dum.matrix);
        IHZ2.setColorAt(nw,colOf(h.t==='lava'?'#ffe6a0':PAL.rim));nw++;
      }
      /* mientras hace efecto, un poco de brasa/escarcha */
      if(h.on&&h.t==='lava'&&partK>.5&&Math.random()<.10){
        const p=proj(h.x,.25,h.z);
        ARC.fx.burst(p.x,p.y,{n:3,color:PAL.strip,speed:90,size:3,life:.35,g:-40});}
    }
    setInst(IHZ,nh);setInst(IHZ2,nw);
    if(IHZ.instanceColor)IHZ.instanceColor.needsUpdate=true;
    if(IHZ2.instanceColor)IHZ2.instanceColor.needsUpdate=true;
  }
  /* enemigos: una matriz por instancia, agrupados por silueta */
  const cnt=[0,0,0,0];
  let sh=0;
  for(const e of ens){
    const im=IE[e.shape];
    if(cnt[e.shape]>=CAPE)continue;
    const ex=lerp(e.px,e.x,a),ez=lerp(e.pz,e.z,a);
    const grow=e.st==='in'?clamp(1-e.stT/.55,.05,1):1;
    const bob=e.st==='in'?0:Math.sin(e.bob)*.06;
    dum.position.set(ex,e.yo*e.sc*grow+bob+.04,ez);
    dum.rotation.set(0,Math.atan2(hx-e.x,hz-e.z),0);
    const s=e.sc*grow*(e.flash>0?1.22:1)*(e.st==='wind'?1.16:1);
    dum.scale.setScalar(s);
    dum.updateMatrix();
    im.setMatrixAt(cnt[e.shape],dum.matrix);
    im.setColorAt(cnt[e.shape],colOf(e.flash>0?'#ffffff':e.col));
    cnt[e.shape]++;
    /* sombra */
    if(sh<CAPS){
      dum.position.set(ex,.02,ez);dum.rotation.set(-Math.PI/2,0,0);
      dum.scale.setScalar(e.r*e.sc*1.1*grow);dum.updateMatrix();
      ISH.setMatrixAt(sh++,dum.matrix);
    }
  }
  for(let i=0;i<4;i++){
    setInst(IE[i],cnt[i]);
    if(IE[i].instanceColor)IE[i].instanceColor.needsUpdate=true;
  }
  /* sombras del héroe y del jefe */
  if(sh<CAPS){dum.position.set(ihx,.02,ihz);dum.rotation.set(-Math.PI/2,0,0);
    dum.scale.setScalar(.55);dum.updateMatrix();ISH.setMatrixAt(sh++,dum.matrix);}
  if(boss&&sh<CAPS){dum.position.set(boss.x,.02,boss.z);dum.rotation.set(-Math.PI/2,0,0);
    dum.scale.setScalar(boss.r*1.05);dum.updateMatrix();ISH.setMatrixAt(sh++,dum.matrix);}
  /* OJO: las monedas NO llevan sombra. Con 56 monedas en el piso eran 56 discos
     transparentes (sin depthWrite = relleno puro, y el relleno es LO que cuesta
     acá): 1,9 ms del cuadro por un detalle de 4 px. */
  setInst(ISH,sh);
  /* balas */
  let n=0;
  for(const b of hbs){
    if(n>=CAPB)break;
    dum.position.set(b.x,.6,b.z);
    dum.rotation.set(0,Math.atan2(b.vx,b.vz),ARC.t*9);
    dum.scale.set(1,1,2.1);dum.updateMatrix();
    IHB.setMatrixAt(n++,dum.matrix);
  }
  setInst(IHB,n);
  n=0;
  for(const b of ebs){
    if(n>=CAPEB)break;
    dum.position.set(b.x,.55,b.z);
    dum.rotation.set(ARC.t*5,ARC.t*7,0);
    dum.scale.setScalar(1);dum.updateMatrix();
    IEB.setMatrixAt(n++,dum.matrix);
  }
  setInst(IEB,n);
  /* monedas */
  n=0;
  for(const c of cns){
    if(n>=CAPC)break;
    dum.position.set(c.x,c.y+.06,c.z);
    dum.rotation.set(Math.PI/2-PITCH,c.sp,0);   /* la cara MIRA a la cámara (con el
       signo al revés se veía el canto y la moneda parecía un aro gris) */
    dum.scale.setScalar(1);dum.updateMatrix();
    ICN.setMatrixAt(n++,dum.matrix);
  }
  setInst(ICN,n);
  /* anillos de aviso */
  n=0;
  for(const t of tels){
    if(n>=CAPT)break;
    const k=1-t.l/t.L;
    dum.position.set(t.x,.03,t.z);dum.rotation.set(-Math.PI/2,0,0);
    dum.scale.setScalar(t.r*(.5+k*.75));dum.updateMatrix();
    ITL.setMatrixAt(n++,dum.matrix);
  }
  setInst(ITL,n);
  /* puerta: se abre cuando la sala queda limpia */
  if(doorM){
    const open=(ph==='clear'||ph==='pick'||ph==='won');
    doorM.position.y=lerp(doorM.position.y,open?-1.35:1.1,.09);
  }
  /* cámara: sigue un poco al héroe, y se sacude sola en la embestida del jefe */
  const fx=clamp(ihx*.1,-1.4,1.4),fz=clamp((ihz-.4)*.08,-.8,.8);
  placeCam(fx,fz+camDZ,camA);
  ARC.rnd.render(scene,cam);
}
G.draw=function(g,alpha){
  if(!ARC.rnd||!scene||!P)return;
  const a=clamp(alpha||0,0,1);
  drawScene(a);
  drawHUD(g);
};
/* ---- capa 2D: vida, jefe, avisos, joystick, cartas ---- */
function rr(g,x,y,w,h,r){
  g.beginPath();
  g.moveTo(x+r,y);g.lineTo(x+w-r,y);g.quadraticCurveTo(x+w,y,x+w,y+r);
  g.lineTo(x+w,y+h-r);g.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  g.lineTo(x+r,y+h);g.quadraticCurveTo(x,y+h,x,y+h-r);
  g.lineTo(x,y+r);g.quadraticCurveTo(x,y,x+r,y);
  g.closePath();
}
let bossGrd=null,bossGrdW=0;
function drawHUD(g){
  const W=ARC.W,H=ARC.H;
  /* destello rojo al recibir daño */
  /* VIÑETA de daño en los cuatro bordes. Antes era un fillRect de TODA la
     pantalla en el lienzo 2D (0,4 Mpx por cuadro durante 0,3 s): además de costar,
     tapaba el juego justo cuando más hay que ver. */
  if(hitFlash>0){
    g.globalAlpha=clamp(hitFlash*2.4,0,.62);
    g.fillStyle='#ff2244';
    const mx=W*.1,my=H*.13;
    g.fillRect(0,0,W,my);g.fillRect(0,H-my,W,my);
    g.fillRect(0,my,mx,H-my*2);g.fillRect(W-mx,my,mx,H-my*2);
    g.globalAlpha=1;
  }
  /* barra de vida del héroe, arriba a la izquierda debajo del marcador */
  const bw=Math.min(W*.3,H*.62),bh=Math.max(7,H*.028);
  const bx=W*.03,by=H*.13;
  g.fillStyle='rgba(8,5,16,.72)';rr(g,bx-3,by-3,bw+6,bh+6,bh*.6);g.fill();
  const seg=Math.max(1,Math.round(P.hpMax));
  for(let i=0;i<seg;i++){
    const sw=(bw-(seg-1)*2)/seg;
    g.fillStyle=i<hp?(hp<=2?'#ff3d68':'#57e08a'):'rgba(255,255,255,.14)';
    g.fillRect(bx+i*(sw+2),by,sw,bh);
  }
  /* el texto "VIDA 6/6" se fue: la barra segmentada ya lo dice y cada fillText en
     el lienzo 2D de software cuesta. La capa 2D bajó de 4,1 ms a 1,4 ms. */
  g.textAlign='left';
  /* mejoras tomadas, en fila abajo a la izquierda */
  /* FICHAS de las mejoras tomadas. Antes era una línea de glifos a 13 px que en la
     captura se leía como una cruz suelta en la esquina. */
  const ups=[];for(const u of UPS)if(taken[u.id])ups.push([u.ic,taken[u.id]]);
  if(ups.length){
    const cs=Math.max(16,H*.055),cy=H-cs-H*.03;
    g.font='900 '+cs*.58+'px system-ui,sans-serif';g.textAlign='center';
    for(let i=0;i<ups.length;i++){
      const cx=bx+i*(cs+cs*.16);
      g.fillStyle='rgba(10,6,20,.72)';rr(g,cx,cy,cs,cs,cs*.28);g.fill();
      g.strokeStyle='rgba(255,176,46,.5)';g.lineWidth=1.2;g.stroke();
      g.fillStyle=G.acc;g.fillText(ups[i][0],cx+cs/2,cy+cs*.68);
      if(ups[i][1]>1){g.fillStyle='#fff';g.font='900 '+cs*.34+'px system-ui,sans-serif';
        g.fillText(ups[i][1],cx+cs*.84,cy+cs*.28);
        g.font='900 '+cs*.58+'px system-ui,sans-serif';}
    }
    g.textAlign='left';
  }
  /* barra de vida del JEFE */
  if(boss){
    const w2=W*.5,x2=(W-w2)/2,y2=H*.075,h2=Math.max(8,H*.03);
    g.fillStyle='rgba(8,5,16,.8)';rr(g,x2-4,y2-4,w2+8,h2+8,h2*.7);g.fill();
    const k=clamp(boss.hp/bossHpMax,0,1);
    g.fillStyle='rgba(255,255,255,.12)';g.fillRect(x2,y2,w2,h2);
    /* el degradado se arma UNA vez (createLinearGradient por cuadro era 0,6 ms) */
    if(!bossGrd||bossGrdW!==W){bossGrd=g.createLinearGradient(x2,0,x2+w2,0);
      bossGrd.addColorStop(0,'#ff2e5e');bossGrd.addColorStop(.6,'#ff7a1c');
      bossGrd.addColorStop(1,'#ffd166');bossGrdW=W;}
    g.fillStyle=bossGrd;g.fillRect(x2,y2,w2*k,h2);
    g.fillStyle='#fff';g.font='900 '+Math.max(9,H*.028)+'px system-ui,sans-serif';
    g.textAlign='center';g.fillText('☠ '+Math.ceil(boss.hp)+'/'+bossHpMax,W/2,y2+h2+Math.max(10,H*.033));
    g.textAlign='left';
  }
  /* barras de vida de los enemigos golpeados */
  let nb=0;
  for(const e of ens){
    if(e.hp>=e.hpMax||e.st==='in')continue;
    if(++nb>8)break;
    const p=proj(e.x,e.r*e.sc*2+.45,e.z);
    if(p.z>1)continue;
    const w3=Math.max(16,H*.07),h3=Math.max(3,H*.011);
    g.fillStyle='rgba(0,0,0,.55)';g.fillRect(p.x-w3/2-1,p.y-1,w3+2,h3+2);
    g.fillStyle='#ff5c7a';g.fillRect(p.x-w3/2,p.y,w3*clamp(e.hp/e.hpMax,0,1),h3);
  }
  /* joystick flotante */
  const jv=joyVec();
  if(joy){
    const R0=H*.16;
    g.globalAlpha=.28;g.strokeStyle='#fff';g.lineWidth=Math.max(2,H*.008);
    g.beginPath();g.arc(joy.ox,joy.oy,R0,0,TAU);g.stroke();
    g.globalAlpha=.5;g.fillStyle=G.acc;
    const kx=jv?joy.ox+jv.x*R0:joy.ox,ky=jv?joy.oy+jv.y*R0:joy.oy;
    g.beginPath();g.arc(kx,ky,R0*.34,0,TAU);g.fill();
    g.globalAlpha=1;
  }
  /* aviso grande de sala / oleada / jefe */
  if(noticeT>0&&notice){
    const k=clamp(noticeT/.5,0,1);
    g.globalAlpha=k;
    g.textAlign='center';
    /* el cuerpo se ajusta al ANCHO: "ROOM CLEAR!" a H*0,11 medía 380 px y tapaba
       la sala entera. Nunca pasa del 74% del ancho. */
    let fs=Math.max(14,H*(noticeBig?.105:.07));
    g.font='900 '+fs+'px system-ui,sans-serif';
    const tw=g.measureText(notice).width;
    if(tw>W*.74){fs=Math.max(12,fs*W*.74/tw);g.font='900 '+fs+'px system-ui,sans-serif';}
    g.lineWidth=Math.max(3,fs*.16);g.strokeStyle='rgba(4,2,10,.85)';
    g.strokeText(notice,W/2,H*.3);
    g.fillStyle=noticeBig?(notice===T('bossHere')?PAL.boss:G.acc):'#fff';
    g.fillText(notice,W/2,H*.3);
    g.globalAlpha=1;g.textAlign='left';
  }
  /* ayuda al empezar */
  if(tut&&ph==='fight'&&room===1&&lvl===1){
    g.globalAlpha=clamp(1-phT/7,0,1)*.95;
    g.textAlign='center';g.fillStyle='#fff';
    g.font='900 '+Math.max(12,H*.05)+'px system-ui,sans-serif';
    g.fillText(T('tutMove'),W/2,H*.62);
    g.font='800 '+Math.max(10,H*.036)+'px system-ui,sans-serif';
    g.fillStyle=G.acc;g.fillText(T('tutStop'),W/2,H*.69);
    g.globalAlpha=1;g.textAlign='left';
  }
  /* CARTAS DE MEJORA */
  if(ph==='pick'&&cards.length){
    g.fillStyle='rgba(6,4,14,.78)';g.fillRect(0,0,W,H);
    g.textAlign='center';
    g.fillStyle='#fff';g.font='900 '+Math.max(13,H*.058)+'px system-ui,sans-serif';
    g.fillText(T('pick'),W/2,H*.16);
    g.fillStyle='rgba(255,255,255,.6)';g.font='800 '+Math.max(9,H*.03)+'px system-ui,sans-serif';
    g.fillText(T('pickSub'),W/2,H*.22);
    for(let i=0;i<cards.length;i++){
      const r=cardR[i],u=cards[i];
      const pop=Math.sin(ARC.t*3+i)*.01+1;
      g.save();
      g.translate(r.x+r.w/2,r.y+r.h/2);g.scale(pop,pop);g.translate(-r.w/2,-r.h/2);
      g.fillStyle='rgba(20,14,34,.98)';rr(g,0,0,r.w,r.h,r.w*.1);g.fill();
      g.strokeStyle=G.acc;g.lineWidth=Math.max(2,r.w*.018);g.stroke();
      g.fillStyle=G.acc;g.font='900 '+r.w*.42+'px system-ui,sans-serif';
      g.fillText(u.ic,r.w/2,r.h*.42);
      g.fillStyle='#fff';g.font='900 '+Math.max(9,r.w*.135)+'px system-ui,sans-serif';
      g.fillText(T(u.k),r.w/2,r.h*.62);
      g.fillStyle='rgba(255,255,255,.66)';
      g.font='700 '+Math.max(7,r.w*.093)+'px system-ui,sans-serif';
      wrap(g,T(u.d),r.w/2,r.h*.75,r.w*.86,Math.max(9,r.w*.115));
      const n=taken[u.id]||0;
      if(n){g.fillStyle=G.acc;g.font='900 '+Math.max(8,r.w*.1)+'px system-ui,sans-serif';
        g.fillText('x'+n,r.w/2,r.h*.94);}
      g.restore();
    }
    g.textAlign='left';
  }
}
function wrap(g,txt,cx,cy,w,lh){
  const ws=String(txt).split(' ');let line='',y=cy;
  for(const wd of ws){
    const t=line?line+' '+wd:wd;
    if(g.measureText(t).width>w&&line){g.fillText(line,cx,y);y+=lh;line=wd;}
    else line=t;
  }
  if(line)g.fillText(line,cx,y);
}

/* --------------------------------------------------------- MODO ATRACCIÓN
   El menú NO puede verse vacío. Se usa la misma arena, los mismos pools y el
   mismo héroe: los enemigos orbitan, el héroe gira y dispara de verdad, la
   cámara se balancea 28° a cada lado. Cuesta lo mismo que una partida floja. */
let dmT=0;
function demoInit(){
  demo=1;dmT=0;camK=1.1;camDZ=-1.15;ph='fight';phT=0;moving=0;inv=0;hitFlash=0;joy=null;shotT=0;
  P=P||basePerks();
  ens.length=0;hbs.length=0;ebs.length=0;cns.length=0;tels.length=0;
  boss=null;if(bossN)bossN.visible=false;if(bossFB)bossFB.visible=false;
  obs=[];buildObs();
  hx=-3.2;hz=.9;phx=hx;phz=hz;aim=0;hp=P.hpMax;
  const pl=plan=roomPlan(1,1);
  for(let i=0;i<7;i++){
    const a=i/7*TAU;
    const e=mkEnemy(['mole','torre','pua','div'][i&3],pl,Math.cos(a)*5.2,Math.sin(a)*2.4-.9,0);
    e.st='walk';e.stT=0;e.orb=a;e.hp=e.hpMax=999;
  }
  tels.length=0;
}
G.attract=function(dt,g){
  if(!T3||!ARC.rnd||!scene)return;
  if(!demo)demoInit();
  dmT+=dt;resStep(dt);
  /* enemigos en órbita, con bamboleo */
  for(const e of ens){
    e.px=e.x;e.pz=e.z;
    e.orb+=dt*.42*(e.shape===1?-.7:1);
    const rad=4.6+Math.sin(dmT*.6+e.orb*2)*1.4;
    e.x=Math.cos(e.orb)*rad;e.z=Math.sin(e.orb)*rad*.52-.9;
    e.bob+=dt*6;
    if(e.flash>0)e.flash-=dt;
  }
  /* el héroe gira y dispara al que tenga más cerca */
  const tg=nearestEnemy(hx,hz);
  if(tg)aim=lerp(aim,Math.atan2(tg.x-hx,tg.z-hz),.14);
  shotT-=dt;
  if(shotT<=0&&tg){
    shotT=.28;
    for(let k=0;k<2;k++)shoot(aim+(k-.5)*.13,1);
  }
  for(let i=hbs.length-1;i>=0;i--){
    const b=hbs[i];b.l-=dt;b.x+=b.vx*dt;b.z+=b.vz*dt;
    let out=b.l<=0||Math.abs(b.x)>RW||Math.abs(b.z)>RH;
    for(const e of ens){
      if(Math.hypot(b.x-e.x,b.z-e.z)<e.r*e.sc+.25){
        out=true;e.flash=.16;
        const p=proj(e.x,.9,e.z);
        ARC.fx.burst(p.x,p.y,{n:Math.round(6*partK),color:e.col,speed:170,size:4,life:.35,sq:true});
        break;
      }
    }
    if(out)hbs.splice(i,1);
  }
  /* monedas que caen solas, para que el cuadro tenga brillo */
  if(Math.random()<dt*1.4)dropCoins(rnd(-5,5),rnd(-2.6,2.2),1);
  for(let i=cns.length-1;i>=0;i--){
    const c=cns[i];c.vy-=13*dt;c.y+=c.vy*dt;c.sp+=dt*5;
    if(c.y<.22){c.y=.22;c.vy=0;}
    if(cns.length>16&&i===0)cns.splice(0,1);
  }
  /* el vaivén es de ±0,3 rad: con ±0,5 la esquina de la arena se salía del cuadro */
  camA=Math.sin(dmT*.16)*.3;
  drawScene(1);
};

/* ---------------------------------------------------------------- el piloto
   Puntúa 16 direcciones + "quedarse quieto" mirando 0,35 s adelante. Quieto es
   la jugada BUENA (es cuando dispara), así que sólo se mueve si quieto es
   peligroso. Sin esto el bot caminaba siempre y nunca disparaba: la sonda
   terminaba con 0 bajas y el juego parecía roto. */
function threatScore(x,z,tAhead){
  let s=0;
  if(x<-RW+HR+.15||x>RW-HR-.15||z<-RH+HR+.15||z>RH-HR-.15)return -1e6;
  for(const o of obs){const d=Math.hypot(x-o.x,z-o.z);if(d<o.r+HR+.1)return -1e6;}
  let dn=1e9;
  for(const e of ens){
    if(e.st==='in')continue;
    let ex=e.x,ez=e.z;
    if(e.st==='dash'){ex+=e.dvx*tAhead;ez+=e.dvz*tAhead;}
    else{const dx=hx-e.x,dz=hz-e.z,d=Math.hypot(dx,dz)||1;
      ex+=dx/d*e.sp*tAhead;ez+=dz/d*e.sp*tAhead;}
    dn=Math.min(dn,Math.hypot(x-ex,z-ez)-e.r*e.sc);
  }
  if(boss){
    let bx2=boss.x,bz2=boss.z;
    if(boss.st==='charge'){bx2+=boss.dvx*tAhead;bz2+=boss.dvz*tAhead;}
    dn=Math.min(dn,Math.hypot(x-bx2,z-bz2)-boss.r);
  }
  if(dn<1e8)s+=Math.min(dn,7)*10;
  /* balas: distancia al punto donde va a estar la bala */
  for(const b of ebs){
    const bx2=b.x+b.vx*tAhead,bz2=b.z+b.vz*tAhead;
    const d=Math.hypot(x-bx2,z-bz2);
    if(d<1.5)s-=(1.5-d)*90;
  }
  /* PELIGROS DE LA ZONA. Sin esto el piloto se paraba tranquilo encima de una
     grieta y la sonda medía "el juego mata sin motivo": la grieta avisa 0,8 s
     antes, así que la esquiva es parte de jugar bien y el piloto tiene que verla. */
  for(const h of HZL){
    const d=Math.hypot(x-h.x,z-h.z);
    if(h.t==='espina'){if(d<h.r+HR)s-=26;}                     /* frena: molesta */
    else if(h.t==='vacio'){if(h.on&&d<h.r+HR)return -1e6;       /* agujero: no se pisa */
      if(h.warn>0&&d<h.r+HR+.3)s-=120;}
    else if(h.t==='lava'){                                     /* se paga desde el aviso */
      if(d<h.r+HR+.25)s-=(h.on?900:(h.warn>0?420:70));}
  }
  /* monedas fuera del imán: un empujoncito para juntarlas */
  for(const c of cns){
    const d=Math.hypot(x-c.x,z-c.z);
    if(d<5)s+=(5-d)*.7;
  }
  /* quedarse cerca del centro: menos chance de quedar acorralado */
  s-=Math.hypot(x*.35,z*.6)*.9;
  return s;
}
function botThink(){
  if(ph==='pick'){
    /* elige lo que más rinde: daño, tiro múltiple, y curación si está flojo */
    let bi=0,bs=-1;
    for(let i=0;i<cards.length;i++){
      const id=cards[i].id;
      let v={dmg:9,mult:8,rate:7,pierce:6,bounce:5,crit:5,spd:4,mag:3,hp:6,heal:hp<P.hpMax-2?8:1}[id]||4;
      if(v>bs){bs=v;bi=i;}
    }
    pickCard(bi);
    return;
  }
  if(ph!=='fight')return;
  const tA=.35;
  const stay=threatScore(hx,hz,tA);
  let best=stay,bx2=0,bz2=0,mv=false;
  const step=P.spd*tA;
  for(let k=0;k<16;k++){
    const a=k/16*TAU;
    const nx=hx+Math.cos(a)*step,nz=hz+Math.sin(a)*step;
    const s=threatScore(nx,nz,tA)-6;          /* 6 = lo que "vale" quedarse quieto */
    if(s>best){best=s;bx2=Math.cos(a);bz2=Math.sin(a);mv=true;}
  }
  if(mv)joy={ox:0,oy:0,x:bx2*ARC.H*.2,y:bz2*ARC.H*.2};
  else joy=null;
}
G.dbg={
  state:()=>({lvl,room,ph,hp,hpMax:P?P.hpMax:0,ens:ens.length,boss:boss?Math.ceil(boss.hp):0,
    kills,coins:coinRun,rooms:roomsRun,hbs:hbs.length,ebs:ebs.length,cns:cns.length,
    bot:botOn,ev:lastEv,ups:upList(),
    zona:zone.k,haz:zone.haz||'-',hz:HZL.length,hzOn:HZL.filter(h=>h.on).length,
    shots:shotsN,mv:moving,shotT:+shotT.toFixed(2),
    zonas:Object.keys(zonesSeen).length,fire:fireHold,
    anim:MX?(actNow+' '+Object.keys(ACT).join('/')):'sin-hueso',
    eGlb:eGeoOK,
    perks:P?{dmg:+P.dmg.toFixed(1),rate:+P.rate.toFixed(2),mult:P.mult,
      bounce:P.bounce,pierce:P.pierce,spd:+P.spd.toFixed(1),mag:+P.mag.toFixed(1)}:null,
    gfx:{part:partK,deco:decoK,resK:+resK.toFixed(2),dpr:+(resBase*resK).toFixed(2),cd:+CD.toFixed(1)}}),
  /* enganches para las sondas: forzar zona, saltar de sala y sostener el disparo */
  zone:i=>{setZone(((i|0)%ZONES.length+ZONES.length)%ZONES.length,1);buildHaz(plan);
    if(ph!=='fight'){ph='fight';phT=0;}
    return {zona:zone.k,haz:zone.haz||'-',hz:HZL.length,ph};},
  goRoom:n=>{room=clamp(n|0,1,8);newRoom();return{room,zona:zone.k,haz:zone.haz||'-'};},
  fire:d=>{fireHold=d?1:0;if(d&&shotT>.12)shotT=.12;return fireHold;},
  put:(x,z)=>{hx=clamp(x,-RW+HR,RW-HR);hz=clamp(z,-RH+HR,RH-HR);phx=hx;phz=hz;
    vx=vz=0;return{hx:+hx.toFixed(2),hz:+hz.toFixed(2)};},
  hazAt:()=>HZL.map(h=>({t:h.t,x:+h.x.toFixed(2),z:+h.z.toFixed(2),on:h.on,
    warn:+h.warn.toFixed(2)})),
  heroPose:()=>{                      /* posición mundial de los huesos: prueba que la animación mueve el mesh */
    if(!heroN||!heroN.inner)return null;
    heroN.inner.updateMatrixWorld(true);
    const v=new T3.Vector3(),o=[];
    heroN.inner.traverse(b=>{if(b.isBone){b.getWorldPosition(v);
      o.push(+v.x.toFixed(4),+v.y.toFixed(4),+v.z.toFixed(4));}});
    return o;},
  perf:()=>{
    const i=ARC.rnd?ARC.rnd.info:null;
    return i?{tris:i.render.triangles,calls:i.render.calls,
      geos:i.memory.geometries,fps:Math.round(ARC.fps)}:null;
  },
  glb:()=>({heroe:ARC.glb&&ARC.glb.heroe?tris(ARC.glb.heroe.scene):0,
            jefe:ARC.glb&&ARC.glb.jefe?tris(ARC.glb.jefe.scene):0,
            simpl:ARC.glbTris||null,usa:{heroe:!!heroN,jefe:!!bossN}}),
  heroScreen:()=>{const p=proj(hx,.6,hz);
    return{sx:+(p.x/ARC.W*100).toFixed(1),sy:+(p.y/ARC.H*100).toFixed(1)};},
  /* apagar piezas para medir de dónde sale el costo de relleno */
  hide:(k,v)=>{const m={deco:decoM,arena:arenaM,obs:obsM,door:doorM,
      hero:heroN||heroFB,boss:bossN||bossFB};
    if(m[k])m[k].visible=(v===undefined?!m[k].visible:!!v);return !!(m[k]&&m[k].visible);},
  /* fija la resolución a mano y APAGA el control automático (para las capturas:
     así se ve lo que ve un celular real, no el modo degradado de swiftshader) */
  res:k=>{resLock=1;resK=clamp(k,.3,1);resApply();return{resK,dpr:resBase*resK};},
  dpr:v=>{ARC.rnd.setPixelRatio(v);ARC.rnd.setSize(ARC.W,ARC.H,false);return v;},
  fog:v=>{scene.fog=v?new T3.Fog(new T3.Color(PAL.fog).getHex(),34*fogK,96*fogK):null;
    scene.traverse(o=>{if(o.material)o.material.needsUpdate=true;});return !!scene.fog;},
  /* sólo la escena 3D, sin la capa 2D (para medir dónde se va el cuadro) */
  only3d:a=>drawScene(clamp(a||0,0,1)),
  /* limpia la sala de golpe (para llegar a las cartas en las capturas) */
  hurt:()=>{inv=0;hurtHero(1);return hp;},
  wipe:()=>{for(let i=ens.length-1;i>=0;i--)killEnemy(ens[i]);if(boss)bossDie();
    return{ens:ens.length,boss:!!boss};},
  /* abre las cartas de mejora a mano */
  pick:()=>{openPick();return cards.map(c=>c.id);},
  /* fuerza la sala n (para revisar el jefe y las cartas sin jugar 4 salas) */
  goRoom:n=>{room=clamp(n|0,1,8);roomsRun=room-1;newRoom();return room;},
  fill:()=>{const pl=plan||(plan=roomPlan(lvl,room));for(let i=0;i<12;i++){
    const s=edgeSpot(pl.R);mkEnemy(['mole','torre','pua','div'][i&3],pl,s.x,s.z,0);}
    for(let i=0;i<60;i++)ebShoot(rnd(-RW,RW),rnd(-RH,RH),rnd(0,TAU),4,1);
    dropCoins(0,0,30);return{ens:ens.length,ebs:ebs.length,cns:cns.length};},
  i18n:()=>{const ks=Object.keys(G.i18n.es),out={};
    for(const l of ['es','en','pt']){const f=ks.filter(k=>!G.i18n[l][k]);
      out[l]=f.length?('FALTAN '+f.join(',')):'ok';}
    return out;},
  autoMove:()=>{
    if(ph==='dead'||ph==='won')return false;
    botOn=1;botThink();
    return true;
  }
};
window.GAME=G;
