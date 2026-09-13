/* ============================================================
   SUX SANDBOX — core_u: INFRAESTRUCTURA DE LA SECCIÓN "EXPERIMENTOS"
   ------------------------------------------------------------
   Acá NO viven los 75 experimentos: vive la CAÑERÍA que los hace posibles. Un experimento
   es un prop normal (física real, geometría de partes) + una pantalla de control que
   aparece al acercarse. Todo eso se declara con UNA llamada:

   ┌──────────────────────── CONTRATO: XP.add(o) ────────────────────────┐
   XP.add({
     id:'xp_rain',            // OBLIGATORIO. Prefijo xp_. Es también el id del prop.
     name:'Lluvia',           // ≤16 chars (lo pide validate.js si el prop va en props/).
     cat:'clima',             // categoría libre; agrupa en XP.list()/__H.xpList().
     desc:'Hace llover',      // opcional, se muestra bajo el título del panel.
     // -- el prop --
     // (a) si el id YA existe en PDEF (lo declaró un props/*.js) no hace falta nada más;
     // (b) si no, se crea acá mismo con la geometría que pases:
     parts:[{s:'box',d:[1,.2,1],p:[0,.1,0],m:'metal'}, …],   // igual que cualquier prop
     mass:40, tags:['experiment'], col:'box',                // opcionales
     prop:{…def entera…},     // alternativa a parts/mass/tags (gana sobre ellos)
     // -- cercanía --
     near:2.2,                // metros para que aparezca el botón (por defecto 2.2)
     btn:'🌧 Activar',        // texto del botón (por defecto '🔬 '+name)
     // -- ciclo de vida --
     auto:false,              // true = arranca solo en cuanto existe su prop en el mundo
     stopOnGone:false,        // true = se detiene si su prop se borra
     start(ctx){}, stop(ctx){},          // encender / apagar
     step(ctx,dt){},          // cada frame DESPUÉS de world.step (sólo jugando)
     frame(ctx,dt){},         // cada frame SIEMPRE (también en pausa): sólo visual
     // -- pantalla --
     ui:{ title:'Lluvia', controls:[ …ver abajo… ] }
   });
   └─────────────────────────────────────────────────────────────────────┘

   CONTROLES (ui.controls) — cinco tipos + uno de sólo lectura:
     {k:'esc', t:'slider', label:'Escala', min:.15,max:4,step:.05, val:1, unit:'x',
      fmt:v=>v.toFixed(2)+'x',            // opcional: cómo se escribe el número
      on:(ctx,v)=>{ … }}                  // se llama al mover (y al set por hook)
     {k:'on',  t:'switch',  label:'Encendido', val:false, on:(ctx,v)=>{}}
     {        t:'botones', label:'Atajos', items:[{label:'1x',v:1},{label:'4x',v:4}],
      on:(ctx,v,i)=>{}}                   // sin k = fila de acciones; con k = guarda el valor
     {k:'n',   t:'numero', label:'Gotas', min:1,max:900,step:10, val:200, unit:''}
     {k:'m',   t:'lista',  label:'Modo', items:[{label:'Suave',v:'soft'},{label:'Bestia',v:'hard'}], val:'soft'}
     {        t:'texto',   label:'Estado', live:ctx=>'lloviendo '+ctx.get('n')+' gotas'}
   Alias aceptados: range=slider · toggle/interruptor=switch · buttons/btns=botones ·
   number/num=numero · list/select=lista · label/info=texto.

   ctx (lo que recibe start/stop/step/frame y los on de los controles):
     ctx.id ctx.xp        el experimento
     ctx.prop             la instancia de prop que abrió/activó el experimento (o null)
     ctx.mem              CAJÓN PROPIO: guardá acá tus mallas, cuerpos y temporizadores
                          ({} al registrar, sobrevive a start/stop; vaciálo vos si querés)
     ctx.v                objeto con TODOS los valores
     ctx.get(k)           leer un valor      ctx.set(k,v)  escribir (repinta y dispara on)
     ctx.on()             ¿está corriendo?
     ctx.run() ctx.stop() ctx.open() ctx.close()
     ctx.toast(t)         aviso en pantalla  ctx.fx(x,y,z,opts)  fogonazo de partículas
     ctx.point(p,x,y,z,out)  punto local del def -> mundo (para colgar nubes, tornados…)

   EJEMPLO COMPLETO DE OTRO AGENTE (nube con lluvia sobre una palanca) — copiar y cambiar:
     XP.add({
       id:'xp_rain', name:'Palanca Lluvia', cat:'clima', near:2.4, btn:'🌧 Palanca de lluvia',
       ui:{title:'Lluvia',controls:[
         {k:'on',t:'switch',label:'Llover',val:false,
          on:(c,v)=>{ v?c.run():c.stop(); }},
         {k:'n',t:'slider',label:'Gotas',min:20,max:800,step:20,val:200,unit:''},
         {t:'texto',label:'Estado',live:c=>c.on()?'lloviendo':'seco'}]},
       start(c){ c.mem.g=new THREE.Group(); scene.add(c.mem.g); },   // scene es global
       stop(c){ if(c.mem.g){scene.remove(c.mem.g);c.mem.g=null;} },
       step(c,dt){ if(!c.mem.g||!c.prop)return;
         c.point(c.prop,0,3.2,0,_v);           // 3,2 m sobre la BASE del prop, ya girado
         c.mem.g.position.copy(_v);
         // … y acá mover las gotas con dt, NUNCA con constantes por frame …
       }
     });

   RESTO DE LA API
     XP.list()            [{id,name,cat,run,near}]
     XP.get(id) XP.set(id,k,v) XP.run(id[,prop]) XP.stop(id) XP.running(id) XP.of(id)
     XP.open(id[,prop])   abre el panel     XP.close()
     XP.screen(titulo,controles[,opts])     panel a mano, sin prop ni experimento
     XP.propOf(id)        primera instancia viva de ese prop   XP.near()  el más cercano
     XP.point(prop,x,y,z,out)  XP.toast(t)  XP.fx(x,y,z,opts)
     XP.size(k)           escala del jugador (la usa el experimento (a); 0,12 … 5)
     XP.motion()          re-aplica PL.spd/run/jump = XP.M × factor de escala
     XP.M {spd,run,jump}  BASE editable de movimiento — TOCÁ ESTO, no PL directamente
     XP.M0                los valores de fábrica (para los botones "volver a normal")
     XP.Z {k,mv,h0,r0}    estado de la escala del jugador
     XP.sec               la sección "Varios" donde caen los props creados en runtime
     XP.adopt()           re-adopta secciones 'xp*' (ya se llama solo en cada XP.add)

   HOOKS DE MEDICIÓN (sólo con ?dev): __H.xpList xpNear xpOpen xpClose xpSet xpGet xpRun
     xpStop xpPanel xpBtn xpBtnBox xpTap xpSecs xpTabOn xpInfo xpSize xpPl xpScreen xpSlide

   DÓNDE PONER LOS PROPS
   - Lo mejor: un props/xp_algo.js con HP.section('xp_algo','MiCarpeta','ent',[…]) — el tab
     tiene que ser 'ent' porque validate.js sólo acepta acc|veh|ent, y ACÁ se mueve toda
     sección cuyo id empiece con 'xp' a la pestaña "Experimentos". Así cada agente tiene su
     carpeta propia y sus props quedan validados estáticamente.
   - O rápido: XP.add({…, parts:[…]}) crea el def en el momento y lo mete en la carpeta
     "Varios" de la misma pestaña.

   PANTALLA: EL DETALLE QUE IMPORTA EN EL TELÉFONO
   El juego se juega SIEMPRE horizontal: con el teléfono vertical, core_a le pone a #stage un
   transform:rotate(90deg). Por eso el panel:
   - se cuelga de #stage (no de <body>) y se posiciona con position:absolute + %/vmin, jamás
     con position:fixed contra el viewport ni con rects de viewport: en vertical el ancho del
     escenario es innerHeight y un cálculo hecho contra innerWidth manda el panel afuera de la
     pantalla (es el mismo bug que documenta core_r en el menú de spawn). vmin coincide con el
     LADO CORTO del escenario en las dos orientaciones, así que las medidas en vmin dan el
     mismo panel gire o no gire.
   - el fondo NO tapa la pantalla (pointer-events:none) y sólo la tarjeta recibe toques: así
     se puede seguir caminando y ver el efecto del slider en vivo.
   - la tarjeta corta la propagación de touchstart/mousedown porque el "mirar arrastrando" de
     core_b escucha en window y su lista de exclusiones (.rb,#stick,#spawn,…) no me conoce:
     sin el stopPropagation, arrastrar un slider giraba la cámara.
   - además de la barra nativa, cada slider trae −/+ : en una pantalla rotada un arrastre fino
     es incómodo y con los botones el valor siempre se puede ajustar.

   TAMAÑO DEL JUGADOR (el experimento de ejemplo (a)) — qué se toca de verdad
     PL.h y PL.r          medidas lógicas
     plBody               radio y offset de las DOS esferas de la cápsula de cannon, en el
                          lugar (mutar shapes/shapeOffsets, no recrearlos: recrearlos le
                          pierde la pista al SAPBroadphase). La esfera de abajo va a y=r, así
                          que el PISO de la cápsula queda en plBody.position.y para cualquier
                          escala: al encogerse no se cae ni queda enterrado.
     charRoot.scale       charK (la escala que le puso fitModel) × k
     cámara               3ª persona: ojo a PL.h*eyeF y distancia/lateral × k (encuadre
                          proporcional). 1ª persona: fpEyeCalc ya sale de los HUESOS, que
                          escalan solos; sólo se escalan los offsets fijos (16 cm adelante).
     camera.near          se encoge con k<1 (si no, a 0,15x los brazos de 1ª persona caen
                          dentro del plano cercano de 9 cm y desaparecen). Nunca sube.
     PL.spd/run/jump      base × k^0.75 (velocidad) y × √k (salto): así el salto mide una
                          altura proporcional al cuerpo y caminar "se siente" igual.
   Se hace envolviendo camStep (nunca reescribiéndola) y con un cortocircuito: si k===1 no se
   toca NADA de la cámara original — a escala normal el motor queda idéntico a antes.

   Se concatena después de todos (u va al final): ya existen THREE, CANNON, scene, world,
   camera, PROPS, PDEF, SECTS, buildDef, spawnProp, freezeProp, PL, plBody, plDraw, PL.fp,
   camStep, EXT, VHS, burst, QP, SV, save, T, I18N, $, APP, toast, nsafe, clamp, DEV, __H…
   ============================================================ */

/* ---------- contratos con los agentes que vienen después ----------
   Ellos sólo llaman a XP.*; igual se dejan los guards por si alguno quiere REASIGNAR una de
   estas (jamás re-declararla: 'function f(){}' dos veces en el mismo módulo es SyntaxError). */
if(typeof xpOnAdd==='undefined')var xpOnAdd=null;      /* fn(xp) — aviso de "se registró uno" */

Object.assign(I18N.es,{xpTab:'Experimentos',xpOpen:'🔬 Abrir',xpClose:'Cerrar',
  xpMisc:'Varios',xpOn:'ON',xpOff:'OFF',xpReset:'↺ Volver a normal'});
Object.assign(I18N.en,{xpTab:'Experiments',xpOpen:'🔬 Open',xpClose:'Close',
  xpMisc:'Misc',xpOn:'ON',xpOff:'OFF',xpReset:'↺ Back to normal'});
Object.assign(I18N.pt,{xpTab:'Experimentos',xpOpen:'🔬 Abrir',xpClose:'Fechar',
  xpMisc:'Vários',xpOn:'ON',xpOff:'OFF',xpReset:'↺ Voltar ao normal'});

/* ================= 1. CSS (inyectado: head.html trae sólo lo general) ================= */
nsafe(()=>{
  const st=document.createElement('style');
  st.textContent=
   /* capa: cubre el escenario pero NO recibe toques (sólo la tarjeta) */
   '#xpWrap{position:absolute;inset:0;z-index:14;display:none;pointer-events:none}'+
   '#xpWrap.on{display:block}'+
   /* la tarjeta: medidas en vmin = lado corto del escenario en las DOS orientaciones.
      ANCHO SEGÚN CUÁNTOS CONTROLES HAY (clases c1/c2/c3 que pone xpBuild): el juego se ve
      SIEMPRE horizontal (≈2:1), así que una columna larga que hay que deslizar desperdicia
      media pantalla. Con 30 controles se abre en 3 columnas y entra casi todo de una. */
   '#xpCard{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);'+
   '  width:min(94%,88vmin);max-height:90vmin;display:flex;flex-direction:column;'+
   '  pointer-events:auto;background:rgba(17,19,22,.95);border:1px solid rgba(255,255,255,.10);'+
   '  border-left:3px solid var(--acc);border-radius:7px;'+
   '  box-shadow:0 16px 48px rgba(0,0,0,.62);overflow:hidden}'+
   '#xpCard.c2{width:min(94%,126vmin)}'+
   '#xpCard.c3{width:min(95%,172vmin)}'+
   '#xpHead{flex:none;display:flex;align-items:center;gap:8px;padding:1.8vmin 2vmin 1.3vmin;'+
   '  border-bottom:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.03)}'+
   '#xpTit{font-weight:900;font-size:clamp(17.5px,3.4vmin,19px);line-height:1.15;letter-spacing:.02em;flex:1;min-width:0;'+
   '  overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'+
   '#xpTit small{display:block;color:var(--dim);font-weight:700;font-size:clamp(10.5px,2.1vmin,11.5px);'+
   '  letter-spacing:.06em;text-transform:uppercase;margin-top:2px}'+
   /* el ✕ es lo único que se toca del encabezado: 40px de área, no 30 */
   '#xpX{flex:none;width:9vmin;height:9vmin;min-width:38px;min-height:38px;max-width:46px;'+
   '  max-height:46px;border:0;border-radius:6px;background:#c9484c;color:#fff;'+
   '  font-weight:900;font-size:clamp(16.5px,3.4vmin,18px)}'+
   '#xpX:active{background:#f07070}'+
   /* EL CUERPO SE DESLIZA: alto acotado por el flex (el techo real lo pone xpFit midiendo
      #stage.clientHeight) y el gesto de dedo lo mueve uiScroll — ver el comentario largo de
      uiScroll: con el escenario rotado el scroll nativo NO andaba. */
   /* position:relative para que el cuerpo sea el offsetParent de las filas: así offsetTop es la
      coordenada DENTRO del contenido y se puede medir "¿el último control entra?" sin rects del
      viewport (que con el escenario rotado están cruzados) */
   '#xpBody{flex:1;min-height:0;position:relative;overflow-y:auto;overflow-x:hidden;'+
   '  touch-action:none;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;'+
   '  padding:1.4vmin 2vmin 2vmin;display:grid;align-content:start;'+
   '  grid-template-columns:repeat(auto-fill,minmax(min(100%,204px),1fr));gap:1.1vmin 2vmin}'+
   /* barra de scroll fina y ámbar: además de no molestar, AVISA que hay más abajo */
   '#xpBody::-webkit-scrollbar{width:6px}'+
   '#xpBody::-webkit-scrollbar-track{background:rgba(255,255,255,.06);border-radius:3px}'+
   '#xpBody::-webkit-scrollbar-thumb{background:rgba(242,161,58,.6);border-radius:3px}'+
   /* velo de abajo + flecha: el segundo aviso de "seguí deslizando" (lo prende xpMoreUpd) */
   '#xpFade{position:absolute;left:0;right:0;bottom:0;height:5vmin;min-height:22px;'+
   '  pointer-events:none;opacity:0;transition:opacity .18s;'+
   '  background:linear-gradient(180deg,rgba(17,19,22,0),rgba(17,19,22,.92))}'+
   '#xpFade.on{opacity:1}'+
   '#xpFade i{position:absolute;left:50%;bottom:2px;transform:translateX(-50%);font-style:normal;'+
   '  color:var(--acc2);font-weight:900;font-size:clamp(11.5px,2.6vmin,13px);letter-spacing:.1em}'+
   '#xpDesc{grid-column:1/-1;color:var(--dim);font-weight:600;font-size:clamp(11px,2.3vmin,12.5px);line-height:1.4;'+
   '  border-left:2px solid rgba(242,161,58,.5);padding-left:1.2vmin;margin-bottom:.4vmin}'+
   /* cada control es una celda del grid; el hueco lo pone el gap, no un margin */
   '.xpr{min-width:0}'+
   '.xpr.wide{grid-column:1/-1}'+
   '.xpr>label{display:flex;align-items:baseline;gap:8px;font-weight:800;font-size:clamp(11.5px,2.5vmin,13px);'+
   '  margin-bottom:.5vmin}'+
   '.xpr>label>span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'+
   '.xpr>label>b{flex:none;color:var(--acc2);font-variant-numeric:tabular-nums}'+
   /* fila del slider: −  barra  + ; 36px de alto para que se toque con el dedo, no con la uña
      (la barra en sí la pinta head.html para TODO el juego) */
   '.xpsl{display:flex;align-items:center;gap:1.2vmin}'+
   '.xpsl input[type=range]{flex:1;min-width:0}'+
   '.xpb{flex:none;border:0;border-radius:6px;background:rgba(70,76,84,.9);color:var(--ink);'+
   '  font-weight:900;font-size:clamp(14.5px,3vmin,16px);line-height:1;width:36px;min-width:36px;height:36px;padding:0}'+
   '.xpb:active{background:var(--acc);color:#241503}'+
   /* interruptor: fila entera tocable (38px) con la pastilla ON/OFF a la derecha */
   '.xpsw{display:flex;align-items:center;gap:8px;width:100%;min-height:38px;border:0;'+
   '  border-radius:6px;border-left:3px solid transparent;background:rgba(40,44,50,.78);'+
   '  color:var(--ink);font-weight:800;font-size:clamp(11.5px,2.5vmin,13px);padding:1vmin 1.4vmin;text-align:left}'+
   '.xpsw>span{flex:1;min-width:0}'+
   '.xpsw>i{flex:none;font-style:normal;font-weight:900;font-size:clamp(10.5px,2.2vmin,11.5px);color:var(--dim);'+
   '  background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.16);border-radius:999px;'+
   '  min-width:42px;text-align:center;padding:3px 8px}'+
   '.xpsw[data-on="1"]{background:rgba(90,96,104,.95);border-left-color:var(--acc)}'+
   '.xpsw[data-on="1"]>i{color:#241503;background:var(--acc2);border-color:var(--acc2)}'+
   '.xpbs{display:flex;flex-wrap:wrap;gap:1vmin}'+
   '.xpbs>button{flex:1 1 auto;border:0;border-radius:6px;background:rgba(56,62,70,.9);'+
   '  color:var(--ink);font-weight:800;font-size:clamp(11px,2.4vmin,12.5px);padding:0 1.4vmin;min-height:34px;'+
   '  min-width:18%}'+
   '.xpbs>button:active{background:var(--acc);color:#241503}'+
   '.xpbs>button.on{background:linear-gradient(180deg,#5f666f,#3c4148);'+
   '  box-shadow:inset 3px 0 0 var(--acc)}'+
   '.xptx{color:var(--dim);font-weight:700;font-size:clamp(11px,2.3vmin,12.5px);line-height:1.45;'+
   '  background:rgba(0,0,0,.28);border-radius:6px;padding:1vmin 1.3vmin}'+
   '.xptx b{color:var(--ink)}'+
   /* Botón de cercanía: mismo patrón visual que bSit (core_k) y bFw (core_l), pero core_k
      escribe sus estilos con style.cssText (inline) y acá van en una HOJA DE ESTILO. La
      diferencia importa: con 'display:none' en la hoja, hacer style.display='' (que es lo que
      hace core_k para mostrar el botón) BORRA el inline y vuelve a ganar la regla => el botón
      no se veía nunca, aunque style.display!=='none' dijera que sí. Por eso acá se muestra y
      se esconde con una CLASE, igual que #xpWrap.
      30vmin de abajo: bSit está a 16 y bFw a 23, así los tres botones de cercanía nunca se pisan. */
   '#xpBtn{position:absolute;left:50%;bottom:30vmin;transform:translateX(-50%);z-index:12;'+
   '  pointer-events:auto;background:rgba(20,24,30,.82);border:1px solid rgba(108,240,255,.55);'+
   '  border-radius:12px;padding:10px 18px;color:#fff;font:800 14px system-ui,sans-serif;'+
   '  white-space:nowrap;display:none;text-shadow:0 1px 2px #000}'+
   '#xpBtn.on{display:block}'+
   '#xpBtn:active{background:rgba(40,50,62,.94);border-color:var(--acc2)}';
  document.head.appendChild(st);
},'xpcss');

/* ================= 2. registro ================= */
const XPL=[];                  /* experimentos en orden de registro */
const XPI={};                  /* id -> experimento */
const XPRUN=new Set();         /* los que están corriendo (step/frame) */
if(!SV.xp)SV.xp={};            /* valores guardados: {idExperimento:{clave:valor}} */
let xpSaveT=0;                 /* guardado diferido: mover un slider no escribe localStorage 60 veces */

/* alias de tipos: el enunciado los nombra en castellano, los agentes pueden usar los dos */
const XPTY={slider:'slider',range:'slider',
  switch:'switch',toggle:'switch',interruptor:'switch',
  botones:'btns',buttons:'btns',btns:'btns',
  numero:'num',number:'num',num:'num',
  lista:'list',list:'list',select:'list',
  texto:'text',label:'text',info:'text'};
const xpTy=c=>XPTY[(c&&c.t)||'slider']||'slider';
const xpDec=s=>{s=Math.abs(+s||1);return s>=1?0:(s>=.1?1:2);};

/* sección "Varios": donde caen los props creados en tiempo de ejecución por XP.add */
const XPSEC={id:'xp_misc',name:T('xpMisc')||'Varios',tab:'xp',props:[]};
/* Toda sección cuyo id empiece con 'xp' pasa a la pestaña Experimentos. Los archivos de
   props la declaran con tab 'ent' porque validate.js sólo acepta acc|veh|ent. */
function xpAdopt(){
  let n=0;
  for(const s of SECTS)if(/^xp/.test(s.id)&&s.tab!=='xp'){
    s.tab='xp';for(const p of s.props){p.tab='xp';p.xpsec=1;}n++;}
  return n;
}
xpAdopt();

/* ---- normalizar un valor contra su control (clamp + paso + tipo) ---- */
function xpCoerce(c,v){
  const t=xpTy(c);
  if(t==='switch')return !!v;
  if(t==='list'){
    const it=(c.items||[]).find(i=>i.v===v);
    return it?it.v:((c.items&&c.items.length)?(c.val!==undefined?c.val:c.items[0].v):v);
  }
  if(t==='slider'||t==='num'){
    let n=+v;if(!isFinite(n))n=+c.val||0;
    const mn=c.min===undefined?0:+c.min,mx=c.max===undefined?1:+c.max,sp=+c.step||((mx-mn)/100);
    n=clamp(n,mn,mx);
    if(sp>0)n=mn+Math.round((n-mn)/sp)*sp;
    return +clamp(n,mn,mx).toFixed(5);
  }
  return v;
}
const xpCtl=(xp,k)=>((xp.ui&&xp.ui.controls)||[]).find(c=>c.k===k)||null;

/* ---- alta de un experimento ---- */
function xpAdd(o){
  if(!o||!o.id)return null;
  if(XPI[o.id])return XPI[o.id];                       /* idempotente: registrar dos veces no duplica */
  xpAdopt();                                           /* por si alguien agregó su carpeta recién */
  let def=PDEF[o.id];
  if(!def){
    const parts=(o.prop&&o.prop.parts)||o.parts;
    if(!parts||!parts.length)return null;              /* sin geometría no hay prop que spawnear */
    def=Object.assign({mass:40,tags:['experiment']},o.prop||{},
      {id:o.id,name:o.name||o.id,parts:parts});
    if(!o.prop||!o.prop.mass)def.mass=o.mass||def.mass;
    if(o.tags)def.tags=o.tags;
    if(o.col)def.col=o.col;
    def.sec=XPSEC.id;def.tab='xp';
    PDEF[o.id]=def;XPSEC.props.push(def);
    /* la carpeta "Varios" recién entra al menú cuando tiene su primer prop: una carpeta
       vacía en el menú de spawn se ve como un bug */
    if(SECTS.indexOf(XPSEC)<0)SECTS.push(XPSEC);
  }
  def.xp=o.id;                                          /* marca para el escaneo de cercanía */
  const ui=o.ui&&o.ui.controls?o.ui:(Array.isArray(o.ui)?{controls:o.ui}:{controls:[]});
  const xp={id:o.id,name:o.name||def.name||o.id,cat:o.cat||'general',desc:o.desc||'',
    def,near:+o.near>0?+o.near:2.2,btn:o.btn||null,auto:!!o.auto,stopOnGone:!!o.stopOnGone,
    ui,start:o.start||null,stop:o.stop||null,step:o.step||null,frame:o.frame||null,
    v:{},_in:{},ctx:null};
  /* valores iniciales: por defecto los del control, y si hay algo guardado en SV.xp manda eso.
     OJO: acá NO se aplica nada — recién start() los baja al juego. Así abrir el juego no cambia
     el tamaño del jugador sólo porque quedó guardado de la partida anterior. */
  const sav=SV.xp[xp.id]||{};
  for(const c of ui.controls||[]){
    if(!c.k)continue;
    const d=c.val!==undefined?c.val:(xpTy(c)==='switch'?false:(c.min!==undefined?c.min:0));
    xp.v[c.k]=xpCoerce(c,sav[c.k]!==undefined?sav[c.k]:d);
  }
  xp.ctx={id:xp.id,xp,prop:null,v:xp.v,
    /* mem: cajón propio del experimento para guardar SUS cosas (mallas, temporizadores,
       cuerpos) sin ensuciar el módulo ni pisarse con los otros 74 experimentos.
       Sobrevive a start/stop: si querés arrancar limpio, vaciálo vos en start(). */
    mem:{},
    get:k=>xp.v[k],set:(k,v)=>xpSetV(xp,k,v),
    on:()=>XPRUN.has(xp),
    run:p=>xpRun(xp.id,p),stop:()=>xpStop(xp.id),
    open:p=>xpOpen(xp.id,p),close:()=>xpClose(),
    toast:t=>{toast(t);return true;},fx:(x,y,z,op)=>XP.fx(x,y,z,op),
    point:(p,x,y,z,out)=>XP.point(p,x,y,z,out)};
  XPL.push(xp);XPI[xp.id]=xp;
  if(typeof xpOnAdd==='function')nsafe(()=>xpOnAdd(xp),'xponadd');
  return xp;
}

/* ---- escribir un valor: guarda, repinta y dispara el on del control ---- */
function xpSetV(xp,k,v){
  if(!xp)return null;
  const c=xpCtl(xp,k);
  const nv=c?xpCoerce(c,v):v;
  xp.v[k]=nv;
  /* los paneles a mano (XP.screen) NO se guardan: son de usar y tirar y ensuciarían SV.xp
     con una entrada '__xpScreen' que nadie vuelve a leer nunca */
  if(!xp.ui0){(SV.xp[xp.id]=SV.xp[xp.id]||{})[k]=nv;xpSaveT=.5;}  /* localStorage en medio segundo */
  nsafe(()=>xpPaintCtl(xp,k),'xppaint');
  /* re-entrada: si el on() vuelve a llamar set() con la MISMA clave sólo se guarda el valor
     (si no, un on que "corrige" su propio valor se llamaría para siempre) */
  if(c&&c.on&&!xp._in[k]){
    xp._in[k]=1;
    nsafe(()=>c.on(xp.ctx,nv),'xpon_'+xp.id+'_'+k);
    xp._in[k]=0;
  }
  return nv;
}

/* ---- correr / parar ---- */
function xpRun(id,prop){
  const xp=XPI[id];if(!xp)return false;
  if(prop)xp.ctx.prop=prop;
  else if(!xp.ctx.prop)xp.ctx.prop=XP.propOf(id);
  if(XPRUN.has(xp))return true;
  XPRUN.add(xp);
  if(xp.start)nsafe(()=>xp.start(xp.ctx),'xpstart_'+id);
  return true;
}
function xpStop(id){
  const xp=XPI[id];if(!xp||!XPRUN.has(xp))return false;
  XPRUN.delete(xp);
  if(xp.stop)nsafe(()=>xp.stop(xp.ctx),'xpstop_'+id);
  return true;
}

/* ================= 3. la pantalla ================= */
const xpWrap=document.createElement('div');xpWrap.id='xpWrap';
xpWrap.innerHTML='<div id="xpCard"><div id="xpHead"><div id="xpTit"></div>'+
  '<button id="xpX">✕</button></div><div id="xpBody"></div>'+
  '<div id="xpFade"><i>▼ ▼ ▼</i></div></div>';
/* se cuelga de #stage (no de <body>): con el teléfono vertical #stage está rotado 90° y todo
   lo que viva afuera queda con la geometría del viewport REAL, o sea al revés. */
nsafe(()=>{const s=$('stage')||document.body;s.appendChild(xpWrap);},'xpwrap');
const xpCard=xpWrap.querySelector('#xpCard');
const xpBodyEl=xpWrap.querySelector('#xpBody');
const xpTitEl=xpWrap.querySelector('#xpTit');
const xpFadeEl=xpWrap.querySelector('#xpFade');
/* cortar la propagación: el "mirar arrastrando" de core_b escucha en window y no conoce esta
   tarjeta, así que sin esto arrastrar un slider giraba la cámara. */
nsafe(()=>{
  const eat=e=>e.stopPropagation();
  for(const ev of ['touchstart','touchmove','touchend','mousedown','click'])
    xpCard.addEventListener(ev,eat,ev==='touchmove'?{passive:true}:undefined);
  xpWrap.querySelector('#xpX').addEventListener('click',()=>nsafe(xpClose,'xpx'));
},'xpcard');

/* ========== DESLIZAR CON EL DEDO (el bug que reportó el usuario) ==========
   MEDIDO antes de tocar nada, con un arrastre REAL (CDP Input.dispatchTouchEvent, que pasa por
   el compositor igual que un dedo):
     · 900x430 (escenario sin rotar): arrastre vertical -> scrollTop 0 → 125.  Andaba.
     · 412x915 (teléfono vertical, #stage con transform:rotate(90deg)): arrastre vertical -> 0,
       arrastre horizontal -> 0. NO SE MOVÍA NI UN PÍXEL, y con 1331 px de contenido en 293 px
       de alto los últimos 25 controles eran inalcanzables.
   Por qué: el compositor decide si el gesto puede scrollear comparando su dirección EN PANTALLA
   contra touch-action, y la rotación de 90° cruza los ejes: el eje que scrollea el panel es
   horizontal en pantalla, así que 'pan-y' lo rechazaba… y el horizontal también, porque pan-y
   sólo habilita el vertical.
   Solución: no depender del gesto nativo. touch-action:none en el contenedor y el scroll a mano,
   pasando el delta del dedo por dStage() (core_a) — la misma función que usa "mirar
   arrastrando" —, que es exactamente lo que convierte pantalla → escenario gire o no gire.
   Queda overflow-y:auto igual, así la rueda del mouse, el teclado y scrollTop siguen andando. */
const UIS={el:null,v:0,t:0,raf:0};        /* inercia: un solo contenedor a la vez */
function uiGlide(){
  UIS.raf=0;
  const el=UIS.el;if(!el||!UIS.v)return;
  const now=performance.now(),dt=Math.min(.05,(now-UIS.t)/1000);UIS.t=now;
  /* UIS.v está en unidades de scrollTop por segundo y CON el mismo signo que scrollTop: el
     touchmove hace scrollTop -= d.y y guarda v = -d.y/dt, o sea "cuánto sube scrollTop por
     segundo". Por eso acá se SUMA. Restarlo (como estaba) mandaba la inercia al revés: el dedo
     llevaba la lista al fondo y al soltar se volvía sola para arriba ~35 px, así que el último
     control nunca quedaba alcanzable de verdad — medido con __H.xpScroll(): 207 (el máximo) al
     levantar el dedo y 173 medio segundo después. */
  const b=el.scrollTop;el.scrollTop=b+UIS.v*dt;
  /* frenada exponencial con dt (nada por frame sin dt: a 30 o a 120 fps frena igual) */
  UIS.v*=Math.pow(.006,dt);
  if(Math.abs(UIS.v)<16||el.scrollTop===b){UIS.v=0;return;}
  UIS.raf=requestAnimationFrame(uiGlide);
}
/* hace deslizable con el dedo cualquier contenedor con overflow-y:auto */
function uiScroll(el){
  if(!el||el._uiScr)return el;el._uiScr=1;
  let id=null,lx=0,ly=0;
  /* los controles se quedan con su gesto: arrastrar un slider mueve el slider, no la lista.
     Los <canvas> (miniaturas de mapa) NO están en la lista: ahí sí queremos deslizar. */
  const ctl=t=>{const e=t&&t.target;
    return !!(e&&e.closest&&e.closest('input,select,textarea'));};
  el.addEventListener('touchstart',e=>{
    if(id!==null)return;
    const t=e.changedTouches[0];if(!t||ctl(t))return;
    id=t.identifier;lx=t.clientX;ly=t.clientY;
    UIS.el=el;UIS.v=0;UIS.t=performance.now();     /* tocar corta la inercia anterior */
  },{passive:true});
  el.addEventListener('touchmove',e=>{
    if(id===null)return;
    for(const t of e.changedTouches){
      if(t.identifier!==id)continue;
      const d=dStage(t.clientX-lx,t.clientY-ly);   /* pantalla -> escenario (core_a) */
      lx=t.clientX;ly=t.clientY;
      const b=el.scrollTop;el.scrollTop=b-d.y;
      const now=performance.now(),dt=Math.max(.008,(now-UIS.t)/1000);
      UIS.el=el;UIS.v=clamp(-d.y/dt,-4200,4200);UIS.t=now;
      /* si de verdad movimos la lista, el gesto es nuestro */
      if(el.scrollTop!==b&&e.cancelable)e.preventDefault();
    }
  },{passive:false});
  const end=e=>{
    if(id===null)return;
    let mine=false;for(const t of e.changedTouches)if(t.identifier===id)mine=true;
    if(!mine)return;
    id=null;
    if(UIS.el===el&&Math.abs(UIS.v)>60&&!UIS.raf){UIS.t=performance.now();
      UIS.raf=requestAnimationFrame(uiGlide);}
  };
  el.addEventListener('touchend',end);el.addEventListener('touchcancel',end);
  /* arrastrar con el mouse (PC y sondas): mismo camino, sin depender de la rueda */
  el.addEventListener('mousedown',e=>{
    if(e.target&&e.target.closest&&e.target.closest('input,select,textarea,button,canvas'))return;
    let px=e.clientX,py=e.clientY;
    const mv=ev=>{const d=dStage(ev.clientX-px,ev.clientY-py);px=ev.clientX;py=ev.clientY;
      el.scrollTop-=d.y;};
    const up=()=>{removeEventListener('mousemove',mv);removeEventListener('mouseup',up);};
    addEventListener('mousemove',mv);addEventListener('mouseup',up);
  });
  return el;
}
nsafe(()=>uiScroll(xpBodyEl),'xpscr');
/* techo de la tarjeta MEDIDO CONTRA EL ESCENARIO. Con el teléfono vertical #stage está rotado y
   su alto es innerWidth: usar vh/innerHeight (lo que hacía .card de head.html) daba una tarjeta
   más alta que la pantalla y la mitad de los controles quedaba fuera del vidrio. */
function xpFit(){
  const st=$('stage');if(!st||!xpCard)return null;
  const W=st.clientWidth,H=st.clientHeight;
  if(!W||!H)return null;
  xpCard.style.maxHeight=Math.round(H*.92)+'px';
  xpCard.style.maxWidth=Math.round(W*.95)+'px';
  nsafe(xpMoreUpd,'xpmore1');
  return {W,H,maxH:Math.round(H*.92)};
}
addEventListener('resize',()=>nsafe(xpFit,'xpfitr'));
/* aviso de "hay más abajo": se apaga al llegar al final */
function xpMoreUpd(){
  if(!xpFadeEl||!xpBodyEl)return false;
  const more=xpBodyEl.scrollHeight-xpBodyEl.clientHeight-xpBodyEl.scrollTop>8;
  xpFadeEl.classList.toggle('on',!!more);
  return more;
}
nsafe(()=>xpBodyEl.addEventListener('scroll',()=>nsafe(xpMoreUpd,'xpmore2'),{passive:true}),'xpscl');

/* estado del panel */
const XPP={open:false,xp:null,adhoc:null,liveT:0,vis:false};

function xpFmt(c,v){
  if(c.fmt){const r=nsafe(()=>c.fmt(v),'xpfmt');if(r!=null)return String(r);}
  const t=xpTy(c);
  if(t==='switch')return v?(T('xpOn')||'ON'):(T('xpOff')||'OFF');
  if(t==='list'){const it=(c.items||[]).find(i=>i.v===v);return it?it.label:String(v);}
  if(t==='slider'||t==='num')return (+v).toFixed(xpDec(c.step))+(c.unit||'');
  return v==null?'':String(v);
}
/* repinta SÓLO el control de esa clave (mover un slider no rearma el panel entero) */
function xpPaintCtl(xp,k){
  if(!XPP.open||XPP.xp!==xp)return;
  for(const c of (xp.ui.controls||[])){
    if(!c._el)continue;
    if(c.k===k||(!k&&c.k)){
      const v=xp.v[c.k],t=xpTy(c);
      if(c._val)c._val.textContent=xpFmt(c,v);
      if(c._in&&+c._in.value!==+v)c._in.value=v;
      if(t==='switch'&&c._sw){c._sw.dataset.on=v?'1':'0';
        if(c._val)c._val.textContent=xpFmt(c,v);}
      if(t==='list'&&c._chips)for(const b of c._chips)
        b.classList.toggle('on',b._v===v);
      if(t==='btns'&&c.k&&c._chips)for(const b of c._chips)
        b.classList.toggle('on',b._v===v);
    }
  }
}
/* arma la tarjeta de un experimento (o de un XP.screen a mano) */
function xpBuild(xp){
  xpBodyEl.replaceChildren();
  xpBodyEl.scrollTop=0;UIS.v=0;              /* panel nuevo, lista arriba y sin inercia vieja */
  xpTitEl.innerHTML='';
  const h=document.createElement('span');
  h.textContent=(xp.ui&&xp.ui.title)||xp.name||'';
  xpTitEl.appendChild(h);
  if(xp.cat){const s=document.createElement('small');s.textContent=xp.cat;xpTitEl.appendChild(s);}
  if(xp.desc){const d=document.createElement('div');d.id='xpDesc';d.textContent=xp.desc;
    xpBodyEl.appendChild(d);}
  const cs=(xp.ui&&xp.ui.controls)||[];
  /* ANCHO SEGÚN LA CARGA: con 3 controles una tarjeta de 700 px queda ridícula, y con 30 una de
     350 px obliga a deslizar cuatro pantallas. 1 columna hasta 5 controles, 2 hasta 11, 3 arriba
     de eso (el grid del cuerpo hace el resto y colapsa solo si el escenario es angosto). */
  const cols=cs.length>11?3:(cs.length>5?2:1);
  xpCard.classList.toggle('c2',cols===2);
  xpCard.classList.toggle('c3',cols===3);
  for(const c of cs)nsafe(()=>xpBuildCtl(xp,c),'xpctl_'+xp.id);
  nsafe(xpFit,'xpfitb');
}
function xpMkBtn(txt,cls){
  const b=document.createElement('button');b.className=cls||'xpb';b.textContent=txt;return b;
}
function xpBuildCtl(xp,c){
  const t=xpTy(c);
  c._el=null;c._val=null;c._in=null;c._sw=null;c._chips=null;
  /* --- interruptor: una fila entera que se prende/apaga --- */
  if(t==='switch'){
    const b=document.createElement('button');b.className='xpsw';
    const s=document.createElement('span');s.textContent=c.label||c.k||'';
    const i=document.createElement('i');
    b.appendChild(s);b.appendChild(i);
    c._el=b;c._sw=b;c._val=i;
    b.dataset.on=xp.v[c.k]?'1':'0';i.textContent=xpFmt(c,xp.v[c.k]);
    b.addEventListener('click',()=>nsafe(()=>xpSetV(xp,c.k,!xp.v[c.k]),'xpsw'));
    const row=document.createElement('div');row.className='xpr';row.appendChild(b);
    xpBodyEl.appendChild(row);return;
  }
  const row=document.createElement('div');row.className='xpr';c._el=row;
  if(c.label!=null||t==='slider'||t==='num'){
    const lb=document.createElement('label');
    const sp=document.createElement('span');sp.textContent=c.label||c.k||'';
    const bv=document.createElement('b');
    lb.appendChild(sp);
    /* el número de la derecha sólo lo llevan los que tienen un valor que mostrar ahí:
       'numero' lo muestra en el medio de la fila y 'texto' en su propio bloque */
    if(t==='slider'||t==='list'){lb.appendChild(bv);c._val=bv;}
    row.appendChild(lb);
  }
  /* --- slider: barra nativa + − / + (imprescindible en pantalla rotada) --- */
  if(t==='slider'||t==='num'){
    const wrap=document.createElement('div');wrap.className='xpsl';
    const sp=+c.step||((+c.max-+c.min)/100)||.1;
    const bump=d=>nsafe(()=>xpSetV(xp,c.k,(+xp.v[c.k]||0)+d*sp),'xpbump');
    const bm=xpMkBtn('−'),bp=xpMkBtn('+');
    bm.addEventListener('click',()=>bump(-1));bp.addEventListener('click',()=>bump(1));
    wrap.appendChild(bm);
    if(t==='slider'){
      const inp=document.createElement('input');inp.type='range';
      inp.min=c.min===undefined?0:c.min;inp.max=c.max===undefined?1:c.max;inp.step=sp;
      inp.value=xp.v[c.k];
      inp.addEventListener('input',()=>nsafe(()=>xpSetV(xp,c.k,+inp.value),'xpslide'));
      c._in=inp;wrap.appendChild(inp);
    } else {
      const mid=document.createElement('div');mid.className='xptx';mid.style.flex='1';
      mid.style.textAlign='center';mid.textContent=xpFmt(c,xp.v[c.k]);
      c._val=mid;wrap.appendChild(mid);
    }
    wrap.appendChild(bp);row.appendChild(wrap);
    if(c._val)c._val.textContent=xpFmt(c,xp.v[c.k]);
    xpBodyEl.appendChild(row);return;
  }
  /* --- botones / lista: la misma fila de chips; 'lista' además marca el elegido --- */
  if(t==='btns'||t==='list'){
    /* con 3 o más chips (o etiquetas largas) la fila necesita el ancho entero: en una columna
       de 200 px "⏹ Apagar todos los climas" se partía en tres renglones */
    if((c.items||[]).length>2)row.classList.add('wide');
    const box=document.createElement('div');box.className='xpbs';c._chips=[];
    for(let i=0;i<(c.items||[]).length;i++){
      const it=c.items[i],b=xpMkBtn(it.label==null?String(it.v):it.label,'');
      b._v=it.v;
      if(t==='list'&&it.v===xp.v[c.k])b.classList.add('on');
      if(t==='btns'&&c.k&&it.v===xp.v[c.k])b.classList.add('on');
      b.addEventListener('click',()=>nsafe(()=>{
        if(c.k)xpSetV(xp,c.k,it.v);
        /* fila de acciones (sin k): el on recibe el valor y el índice del botón */
        if(!c.k&&c.on)nsafe(()=>c.on(xp.ctx,it.v,i),'xpact_'+xp.id);
        if(t==='list'||(t==='btns'&&c.k))xpPaintCtl(xp,c.k);
      },'xpchip'));
      box.appendChild(b);c._chips.push(b);
    }
    row.appendChild(box);
    if(c._val&&c.k)c._val.textContent=xpFmt(c,xp.v[c.k]);
    xpBodyEl.appendChild(row);return;
  }
  /* --- texto de sólo lectura (con live() se refresca 4 veces por segundo) --- */
  /* los bloques de texto son párrafos: en una columna angosta quedan altísimos, van a lo ancho */
  row.classList.add('wide');
  const tx=document.createElement('div');tx.className='xptx';
  tx.innerHTML=c.html||'';if(!c.html)tx.textContent=c.val==null?'':String(c.val);
  c._tx=tx;row.appendChild(tx);xpBodyEl.appendChild(row);
}

function xpOpen(id,prop){
  const xp=XPI[id];if(!xp)return false;
  XPP.xp=xp;XPP.adhoc=null;XPP.open=true;
  if(prop)xp.ctx.prop=prop;
  nsafe(()=>xpBuild(xp),'xpbuild');
  /* abrir el panel ACTIVA el experimento: es lo que espera cualquiera al tocar el botón.
     Cerrarlo NO lo apaga (la lluvia sigue lloviendo): eso se hace con XP.stop o con su switch. */
  xpRun(id,prop);
  xpPaint();
  return true;
}
function xpClose(){
  XPP.open=false;XPP.adhoc=null;xpPaint();return true;
}
/* panel a mano: sin prop ni ciclo de vida, sólo controles */
function xpScreen(title,controls,opt){
  const o=opt||{};
  const xp={id:o.id||'__xpScreen',name:title||'',cat:o.cat||'',desc:o.desc||'',
    ui:{title:title||'',controls:controls||[]},v:{},_in:{},ctx:null,ui0:1};
  for(const c of xp.ui.controls){if(!c.k)continue;
    xp.v[c.k]=xpCoerce(c,c.val!==undefined?c.val:(xpTy(c)==='switch'?false:c.min||0));}
  xp.ctx={id:xp.id,xp,prop:o.prop||null,v:xp.v,get:k=>xp.v[k],set:(k,v)=>xpSetV(xp,k,v),
    run:()=>false,stop:()=>false,open:()=>true,close:()=>xpClose(),
    toast:t=>{toast(t);return true;},fx:(x,y,z,op)=>XP.fx(x,y,z,op),
    point:(p,x,y,z,out)=>XP.point(p,x,y,z,out)};
  XPP.xp=xp;XPP.adhoc=xp;XPP.open=true;
  nsafe(()=>xpBuild(xp),'xpscreen');
  xpPaint();
  return xp;
}
/* visibilidad: igual que bSit/bFw, el panel sólo se ve jugando (en pausa o con el menú de
   spawn abierto se esconde y vuelve solo al salir) */
function xpPaint(){
  const vis=XPP.open&&APP==='play';
  xpWrap.classList.toggle('on',!!vis);
  /* al PASAR a visible hay que volver a medir: con display:none el cuerpo mide 0 y el aviso de
     "hay más abajo" salía siempre apagado aunque el contenido midiera el doble. Sólo en el
     cambio de estado: xpPaint corre 4 veces por segundo y no vamos a forzar layout de gratis. */
  if(vis&&!XPP.vis)nsafe(xpFit,'xpfitv');
  XPP.vis=!!vis;
  xpBtnPaint();
}
/* El repintado normal va con el escaneo de cercanía, 4 veces por segundo. Eso alcanza para el
   botón, pero NO para entrar y salir de la pausa: togglePause dibuja la miniatura del
   personaje (drawObjThumb) y ese frame puede tardar más que el intervalo, así que el panel se
   quedaba un rato visible ENCIMA del menú de pausa. Se envuelven las tres funciones que
   cambian APP para repintar en el mismo instante. Envolver, nunca reescribir: core_r y core_i
   ya envolvieron openSpawn/closeSpawn antes. */
const _xpPause=togglePause,_xpOpenSp=openSpawn,_xpCloseSp=closeSpawn;
togglePause=function(){const r=_xpPause.apply(this,arguments);nsafe(xpPaint,'xppz');return r;};
openSpawn=function(){const r=_xpOpenSp.apply(this,arguments);nsafe(xpPaint,'xpsp');return r;};
closeSpawn=function(){const r=_xpCloseSp.apply(this,arguments);nsafe(xpPaint,'xpcs');return r;};

/* ================= 4. botón de cercanía ================= */
const xpBtn=document.createElement('div');xpBtn.id='xpBtn';
nsafe(()=>{const h=$('hud');if(h)h.appendChild(xpBtn);},'xpbtn');
let xpNearP=null,xpScanT=0;
function xpBtnPaint(){
  const show=!!(!XPP.open&&APP==='play'&&xpNearP&&XPI[xpNearP.def.xp]);
  xpBtn.classList.toggle('on',show);
  if(show){const xp=XPI[xpNearP.def.xp];
    xpBtn.textContent=xp.btn||((T('xpOpen')||'🔬 Abrir')+' · '+xp.name);}
  return show;
}
const xpTap=e=>{if(e){e.preventDefault();e.stopPropagation();}
  if(!xpNearP)return false;
  const xp=XPI[xpNearP.def.xp];if(!xp)return false;
  return xpOpen(xp.id,xpNearP);};
xpBtn.addEventListener('touchstart',xpTap,{passive:false});
xpBtn.addEventListener('mousedown',xpTap);
/* cercanía: 4 veces por segundo, igual que seatScan (core_k) y fwScan (core_l).
   De paso, en la MISMA pasada se anota qué props de experimento hay vivos (XPHAVE): con 75
   experimentos registrados, el arranque automático buscando cada uno con propOf() sería
   75 × PROPS recorridos cuatro veces por segundo. Con el mapa anotado acá queda O(PROPS+XPL). */
const XPHAVE=new Map();          /* id de experimento -> su primera instancia viva */
function xpScan(){
  xpNearP=null;XPHAVE.clear();
  if(APP!=='play'||PL.rag)return null;
  let best=Infinity;
  const px=plBody.position.x,py=plBody.position.y,pz=plBody.position.z;
  for(const p of PROPS){
    const id=p.def&&p.def.xp;if(!id||!XPI[id])continue;
    if(!XPHAVE.has(id))XPHAVE.set(id,p);
    const R=XPI[id].near,dx=p.body.position.x-px,dy=p.body.position.y-py,dz=p.body.position.z-pz;
    const dd=dx*dx+dz*dz;
    if(dd>R*R||Math.abs(dy)>2.4||dd>=best)continue;
    best=dd;xpNearP=p;
  }
  return xpNearP;
}

/* ================= 5. pestaña "Experimentos" en el menú de spawn ================= */
/* buildTabs de core_b rearma la fila entera con innerHTML='' y su lista de pestañas está
   escrita a mano, así que acá se ENVUELVE (core_i y core_r ya la envolvieron antes) y se
   agrega la pestaña al final. Después se vuelve a llamar a spFitLayout de core_r porque la
   fila puede haber pasado a dos renglones y el techo del panel se mide de verdad. */
const _xpTabs=buildTabs;
buildTabs=function(){
  const r=_xpTabs.apply(this,arguments);
  nsafe(xpTabAdd,'xptab');
  if(typeof spFitLayout==='function')nsafe(spFitLayout,'xpfit');
  return r;
};
function xpTabAdd(){
  const t=$('sptabs');if(!t)return false;
  if(!SECTS.some(s=>s.tab==='xp'&&s.props.length))return false;   /* sin experimentos, sin pestaña */
  if(t.querySelector('[data-tab="xp"]'))return true;
  const b=document.createElement('button');
  b.className='sptab'+(spTab==='xp'?' on':'');
  b.dataset.tab='xp';
  /* el <i> va SIN class="ic": así body.gicons no lo apaga (no hay imagen generada para esta
     pestaña) y el emoji se ve siempre — ver core_i */
  b.innerHTML='<i>🔬</i>'+(T('xpTab')||'Experimentos');
  b.addEventListener('click',()=>nsafe(()=>{spTab='xp';spFold=null;buildTabs();buildFolders();},'xptabc'));
  t.appendChild(b);
  return true;
}
nsafe(xpTabAdd,'xptab0');

/* ================= 6. TAMAÑO DEL JUGADOR (motor del experimento (a)) ================= */
/* medidas base: se leen UNA vez, antes de que ningún experimento las toque */
const XPZ={k:1,mv:true,h0:PL.h,r0:PL.r,near0:camera.near,
  eyeF:(PL.h-.28)/PL.h,          /* la cámara va al 84,4 % de la altura: a 1x da exacto py+1.52 */
  kmin:.12,kmax:5};
const XPM0={spd:PL.spd,run:PL.run,jump:PL.jump};   /* valores de fábrica */
const XPM={spd:PL.spd,run:PL.run,jump:PL.jump};    /* base editable (experimento de velocidad) */

/* velocidad y salto: base × factor de escala. k^0.75 para caminar (a 0,15x no queda
   inmanejablemente lento) y √k para el salto (así el salto mide una altura PROPORCIONAL al
   cuerpo: v²/2g escala con k). A k=1 los dos factores valen 1 y PL queda igual que siempre. */
function xpMotion(){
  const k=XPZ.k,fs=XPZ.mv?Math.pow(k,.75):1,fj=XPZ.mv?Math.sqrt(k):1;
  PL.spd=XPM.spd*fs;PL.run=XPM.run*fs;PL.jump=XPM.jump*fj;
  return {spd:PL.spd,run:PL.run,jump:PL.jump};
}
/* cápsula de cannon: se MUTAN radio y offset de las dos esferas. La de abajo va a y=r, así el
   piso de la cápsula queda en plBody.position.y para cualquier escala y encogerse no hunde ni
   levanta al jugador. Recrear los shapes en vez de mutarlos le pierde la pista al broadphase. */
function xpCapsule(){
  const r=PL.r,top=Math.max(r*1.02,PL.h-r-.06*XPZ.k),sh=plBody.shapes;
  for(let i=0;i<sh.length&&i<2;i++){
    const s=sh[i];
    if(s&&s.radius!=null){s.radius=r;if(s.updateBoundingSphereRadius)s.updateBoundingSphereRadius();}
    const o=plBody.shapeOffsets&&plBody.shapeOffsets[i];
    if(o)o.set(0,i?top:r,0);
  }
  if(plBody.updateBoundingRadius)plBody.updateBoundingRadius();
  plBody.updateMassProperties();
  plBody.aabbNeedsUpdate=true;      /* el AABB se recalcula en el próximo world.step */
  return {r,top};
}
/* el modelo: charK es la escala que le puso fitModel para medir PL.h; se multiplica por k */
function xpCharScale(){
  if(!charRoot)return false;
  const s=(charK||1)*XPZ.k;
  if(Math.abs(charRoot.scale.x-s)>1e-5)charRoot.scale.setScalar(s);
  charH=PL.h;
  return true;
}
/* plano cercano: a 0,15x los brazos de 1ª persona caen dentro de los 9 cm del near y
   desaparecen. Sólo se baja; con k>=1 vuelve EXACTO al valor original del motor. */
function xpCamNear(){
  const w=XPZ.k<1?Math.max(.012,XPZ.near0*XPZ.k):XPZ.near0;
  if(Math.abs(camera.near-w)<1e-5)return false;
  camera.near=w;camera.updateProjectionMatrix();return true;
}
function xpSize(k){
  XPZ.k=clamp(+k||1,XPZ.kmin,XPZ.kmax);
  PL.h=XPZ.h0*XPZ.k;PL.r=XPZ.r0*XPZ.k;
  xpCapsule();xpCharScale();xpCamNear();xpMotion();
  return XPZ.k;
}
/* ---- cámara: se ENVUELVE camStep (core_m ya la envolvió antes) ----
   Cortocircuito duro: con k===1 no se toca nada y el motor queda idéntico al de siempre. */
const _xpCamStep=camStep;
camStep=function(dt){
  const r=_xpCamStep.apply(this,arguments);
  if(XPZ.k!==1)nsafe(()=>xpCamFix(dt),'xpcam');
  return r;
};
const _xpRr=new CANNON.RaycastResult();
function xpCamFix(){
  if(freeCam)return false;                 /* cámara libre: se quiere ver el personaje entero */
  if(typeof VHS!=='undefined'&&VHS)return false;  /* manejando: la cámara la pone core_e */
  const k=XPZ.k,d=plDraw(),px=d.x,py=d.y,pz=d.z;
  const ys=Math.sin(PL.yaw),yc=Math.cos(PL.yaw);
  if(PL.fp){
    /* fpEyeCalc ya sale de los HUESOS (que escalan con charRoot): lo único que no escala son
       los 16 cm de adelanto y los 4,5 cm de alto, que acá se llevan a k. */
    camera.position.x+=ys*.16*(1-k);
    camera.position.z+=yc*.16*(1-k);
    camera.position.y+=.045*(k-1);
    return true;
  }
  /* 3ª persona: mismo encuadre pero proporcional (distancia y lateral × k) */
  const eye=py+(PL.rag?.4*k:PL.h*XPZ.eyeF);
  const dist=4.05*k,side=.72*k,cp=Math.cos(PL.pitch),sp=Math.sin(PL.pitch);
  const ox=ys*dist*cp+yc*side,oy=-sp*dist+.28*k,oz=yc*dist*cp-ys*side;
  const y0=eye+.1*k;
  const f=new CANNON.Vec3(px,y0,pz),t=new CANNON.Vec3(px+ox,y0+oy,pz+oz);
  _xpRr.reset();world.raycastClosest(f,t,RAY,_xpRr);
  let kk=1;
  if(_xpRr.hasHit&&_xpRr.body!==plBody){
    const hp=_xpRr.hitPointWorld,dd=Math.hypot(hp.x-px,hp.y-y0,hp.z-pz);
    kk=clamp((dd-.35*k)/Math.hypot(ox,oy,oz),.25,1);
  }
  camera.position.set(px+ox*kk,y0+oy*kk,pz+oz*kk);
  return true;
}
/* el arma en la mano: holdWeapon la normaliza a tamaño 1 del mundo (divide por la escala del
   hueso), así que con el jugador chico quedaba una physgun gigante en una mano diminuta. Acá
   se la vuelve a multiplicar por k DESPUÉS de holdWeapon (EXT.frame corre después). Sólo en
   3ª persona: en 1ª el arma la maneja el viewmodel de core_m y no hay que tocarla. */
function xpWeapScale(){
  if(XPZ.k===1||!wModel||PL.fp)return false;
  const b=bones.rHand||bones.rFore;
  if(!b||wModel.parent!==b)return false;
  /* IDEMPOTENTE a propósito: en pausa holdWeapon no corre pero EXT.frame sí, y un
     multiplyScalar por frame haría explotar el arma. Se recuerda el valor que dejamos y
     sólo se vuelve a escalar cuando holdWeapon escribió uno nuevo. */
  if(wModel._xpS!==undefined&&Math.abs(wModel.scale.x-wModel._xpS)<1e-6)return false;
  wModel._xpS=wModel.scale.x*XPZ.k;
  wModel.scale.setScalar(wModel._xpS);
  return true;
}

/* ================= 7. enganche al bucle ================= */
/* step() de los experimentos: DESPUÉS de world.step y sólo jugando (es el slot de la lógica
   de juego, el mismo que usa la pirotecnia de core_l). */
/* XPIT: la copia de XPRUN sobre la que se itera. Hay que iterar una COPIA porque un step()
   puede llamar a stop() (o a run() de otro) y mutar el Set en el medio; pero se reusa el mismo
   array en vez de hacer Array.from por frame — con el motor a 60 Hz eso era basura nueva en
   cada frame y en cada uno de los DOS ganchos, o sea 120 arrays por segundo para nada. */
const XPIT=[];
function xpIter(){XPIT.length=0;for(const xp of XPRUN)XPIT.push(xp);return XPIT;}
EXT.post.push(dt=>{
  if(!XPRUN.size)return;
  for(const xp of xpIter()){
    if(xp.stopOnGone&&xp.ctx.prop&&PROPS.indexOf(xp.ctx.prop)<0){xpStop(xp.id);continue;}
    if(xp.step)nsafe(()=>xp.step(xp.ctx,dt),'xpstep_'+xp.id);
  }
});
EXT.frame.push(dt=>{
  /* escaneo de cercanía + repintado: 4 veces por segundo, nunca por frame */
  xpScanT+=dt;
  if(xpScanT>=.25){
    xpScanT=0;xpScan();xpPaint();
    /* arranque automático de los que lo pidieron, en cuanto su prop existe (lista de xpScan) */
    if(XPHAVE.size)for(const xp of XPL)
      if(xp.auto&&!XPRUN.has(xp)&&XPHAVE.has(xp.id))xpRun(xp.id,XPHAVE.get(xp.id));
    /* textos vivos del panel abierto */
    if(XPP.open&&XPP.xp)for(const c of (XPP.xp.ui.controls||[]))
      if(c._tx&&c.live){const s=nsafe(()=>c.live(XPP.xp.ctx),'xplive');
        if(s!=null&&c._tx.innerHTML!==String(s))c._tx.innerHTML=String(s);}
  }
  /* el modelo del personaje puede llegar DESPUÉS de haber cambiado la escala (el GLB carga
     asíncrono): un compare de floats por frame lo repone sin costo medible */
  if(XPZ.k!==1)nsafe(()=>{xpCharScale();if(APP==='play')xpWeapScale();},'xpscale');
  /* frame() de los experimentos: siempre, también en pausa (cosas puramente visuales) */
  if(XPRUN.size)for(const xp of xpIter())
    if(xp.frame)nsafe(()=>xp.frame(xp.ctx,dt),'xpframe_'+xp.id);
  /* guardado diferido de los valores */
  if(xpSaveT>0){xpSaveT-=dt;if(xpSaveT<=0)nsafe(save,'xpsave');}
});

/* ================= 8. la API pública ================= */
const XP={
  add:xpAdd,
  list:()=>XPL.map(x=>({id:x.id,name:x.name,cat:x.cat,run:XPRUN.has(x),near:x.near})),
  get:id=>{const x=XPI[id];return x?x.v:null;},
  set:(id,k,v)=>{const x=XPI[id];return x?xpSetV(x,k,v):null;},
  run:xpRun,stop:xpStop,
  running:id=>!!(XPI[id]&&XPRUN.has(XPI[id])),
  open:xpOpen,close:xpClose,screen:xpScreen,
  of:id=>XPI[id]||null,
  sec:XPSEC,adopt:xpAdopt,
  near:()=>xpNearP,
  propOf:id=>{for(const p of PROPS)if(p.id===id)return p;return null;},
  toast:t=>{toast(t);return true;},
  /* fogonazo de partículas reutilizando la pirotecnia de core_l (si no está, no rompe nada) */
  fx:(x,y,z,op)=>{if(typeof burst!=='function')return false;
    nsafe(()=>burst(x,y,z,op||{burst:'peony',size:.8,clr:[0x6cf0ff,0xffc24d]}),'xpfx');return true;},
  /* punto local del DEF (y=0 = piso del objeto) llevado al mundo: para colgar nubes, tornados
     o cualquier cosa arriba del prop aunque esté girado */
  point:(p,x,y,z,out)=>{
    if(!p||!p.body)return null;
    const b=buildDef(p.def);
    _xpLp.set(x||0,(y||0)-b.dy,z||0);
    p.body.pointToWorldFrame(_xpLp,_xpWp);
    const o=out||new THREE.Vector3();
    o.set(_xpWp.x,_xpWp.y,_xpWp.z);
    return o;
  },
  size:xpSize,                 /* escala del jugador (la usa el experimento (a)) */
  motion:xpMotion,
  Z:XPZ,M:XPM,M0:XPM0
};
const _xpLp=new CANNON.Vec3(),_xpWp=new CANNON.Vec3();
window.XP=XP;                  /* también en window: sirve para la consola y las sondas */

/* ================= 9. EXPERIMENTO (a): TU TAMAÑO ================= */
/* Plantilla completa: prop declarado en props/experiments.js (por eso acá no va parts),
   slider + fila de atajos + interruptor, y start/stop que aplican y revierten. */
XP.add({
  id:'xp_size',name:'Escaner Talla',cat:'jugador',near:2.6,
  desc:'Cambia tu tamaño de verdad: modelo, cápsula de física, cámara, velocidad y salto.',
  btn:'🔬 Elegir tu tamaño',
  ui:{title:'Tu tamaño',controls:[
    {k:'k',t:'slider',label:'Escala del jugador',min:.15,max:4,step:.05,val:1,unit:'x',
     on:(c,v)=>{xpSize(v);}},
    {t:'botones',label:'Atajos',items:[{label:'0.15x',v:.15},{label:'0.5x',v:.5},
      {label:'1x',v:1},{label:'2x',v:2},{label:'4x',v:4}],
     on:(c,v)=>{c.set('k',v);}},
    {k:'mv',t:'switch',label:'Velocidad y salto proporcionales',val:true,
     on:(c,v)=>{XPZ.mv=v;xpMotion();}},
    {t:'texto',label:'Medidas',live:c=>'alto <b>'+PL.h.toFixed(2)+' m</b> · cápsula r <b>'+
      PL.r.toFixed(2)+' m</b> · cámara <b>'+(camera.position.y-plBody.position.y).toFixed(2)+
      ' m</b><br>caminar <b>'+PL.spd.toFixed(1)+'</b> · correr <b>'+PL.run.toFixed(1)+
      '</b> · salto <b>'+PL.jump.toFixed(1)+'</b> m/s'},
    {t:'botones',items:[{label:T('xpReset')||'↺ Volver a normal',v:1}],
     on:c=>{c.set('mv',true);c.set('k',1);c.toast('🧍 tamaño normal');}}
  ]},
  start:c=>{XPZ.mv=c.get('mv')!==false;xpSize(c.get('k'));},
  stop:()=>{XPZ.mv=true;xpSize(1);}
});

/* ================= 10. EXPERIMENTO (b): TU VELOCIDAD ================= */
/* Otro prop, otra pantalla: tres sliders y un reset. Escribe la BASE (XPM), no PL, para que
   convivir con el experimento de tamaño sea trivial: PL = base × factor de escala. */
XP.add({
  id:'xp_speed',name:'Consola Veloz',cat:'jugador',near:2.6,
  desc:'Caminar, correr y fuerza de salto. Se combinan con la escala del otro experimento.',
  btn:'⚡ Ajustar velocidad',
  ui:{title:'Tu velocidad',controls:[
    {k:'spd',t:'slider',label:'Caminar',min:1,max:26,step:.2,val:XPM0.spd,unit:' m/s',
     on:(c,v)=>{XPM.spd=v;xpMotion();}},
    {k:'run',t:'slider',label:'Correr',min:1,max:40,step:.2,val:XPM0.run,unit:' m/s',
     on:(c,v)=>{XPM.run=v;xpMotion();}},
    {k:'jump',t:'slider',label:'Fuerza de salto',min:2,max:28,step:.2,val:XPM0.jump,unit:' m/s',
     on:(c,v)=>{XPM.jump=v;xpMotion();}},
    {k:'pre',t:'lista',label:'Preajuste',val:'norm',
     items:[{label:'🐢 Tortuga',v:'slow'},{label:'🚶 Normal',v:'norm'},
            {label:'🏃 Rápido',v:'fast'},{label:'🚀 Bestia',v:'wild'}],
     on:(c,v)=>{const P={slow:[2.4,4,5.5],norm:[XPM0.spd,XPM0.run,XPM0.jump],
        fast:[11,18,12],wild:[20,34,20]}[v];
       if(P){c.set('spd',P[0]);c.set('run',P[1]);c.set('jump',P[2]);}}},
    {t:'texto',label:'Ahora',live:()=>'PL.spd <b>'+PL.spd.toFixed(2)+'</b> · PL.run <b>'+
      PL.run.toFixed(2)+'</b> · PL.jump <b>'+PL.jump.toFixed(2)+'</b>'+
      (XPZ.k!==1?' · escala ×'+XPZ.k.toFixed(2):'')},
    {t:'botones',items:[{label:T('xpReset')||'↺ Volver a normal',v:1}],
     on:c=>{c.set('pre','norm');c.toast('⚡ velocidad normal');}}
  ]},
  start:c=>{XPM.spd=c.get('spd');XPM.run=c.get('run');XPM.jump=c.get('jump');xpMotion();},
  stop:()=>{XPM.spd=XPM0.spd;XPM.run=XPM0.run;XPM.jump=XPM0.jump;xpMotion();}
});

/* ================= 11. hooks de medición ================= */
if(DEV&&window.__H)Object.assign(window.__H,{
  xpList:()=>XP.list(),
  xpNear:()=>xpNearP?{id:xpNearP.def.xp,prop:xpNearP.id,
    d:+Math.hypot(xpNearP.body.position.x-plBody.position.x,
                  xpNearP.body.position.z-plBody.position.z).toFixed(2)}:null,
  xpOpen:id=>xpOpen(id),
  xpClose:()=>xpClose(),
  xpSet:(id,k,v)=>XP.set(id,k,v),
  xpGet:id=>{const x=XPI[id];return x?Object.assign({_run:XPRUN.has(x)},x.v):null;},
  xpRun:(id,useNear)=>xpRun(id,useNear?XP.propOf(id):null),
  xpStop:id=>xpStop(id),
  /* TODO lo del deslizamiento en un objeto: alto del contenido, cuánto se ve, dónde está y si
     el ÚLTIMO control cae dentro del cuerpo (que es lo que el usuario no podía alcanzar).
     Se mide en layout del escenario con offsetTop, no con rects del viewport. */
  xpScroll:()=>{
    const rows=[...xpBodyEl.children],last=rows[rows.length-1];
    const btn=last?(last.querySelector('button,input,select')||last):null;
    const off=e=>{let y=0;for(let o=e;o&&o!==xpBodyEl;o=o.offsetParent)y+=o.offsetTop;return y;};
    const st=$('stage');
    return {top:Math.round(xpBodyEl.scrollTop),client:xpBodyEl.clientHeight,
      scroll:xpBodyEl.scrollHeight,max:xpBodyEl.scrollHeight-xpBodyEl.clientHeight,
      more:xpFadeEl.classList.contains('on'),rows:rows.length,
      cols:getComputedStyle(xpBodyEl).gridTemplateColumns.split(' ').length,
      card:[xpCard.offsetWidth,xpCard.offsetHeight],
      stage:st?[st.clientWidth,st.clientHeight]:null,
      fitsStage:!!st&&xpCard.offsetHeight<=st.clientHeight&&xpCard.offsetWidth<=st.clientWidth,
      lastTop:last?off(last):null,lastH:last?last.offsetHeight:null,
      /* visible = el control de la última fila entra entero en la ventana del cuerpo */
      lastVis:!!btn&&off(btn)>=xpBodyEl.scrollTop-1&&
        off(btn)+btn.offsetHeight<=xpBodyEl.scrollTop+xpBodyEl.clientHeight+1,
      /* y tocable de verdad: elementFromPoint en el centro del control cae en él */
      lastHit:(()=>{if(!btn)return null;const r=btn.getBoundingClientRect();
        if(r.width<2||r.height<2)return false;
        const e=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
        return !!e&&(e===btn||btn.contains(e)||e.contains(btn));})()};
  },
  xpScrollTo:v=>{xpBodyEl.scrollTop=v;nsafe(xpMoreUpd,'xpmh');return xpBodyEl.scrollTop;},
  xpFit:()=>xpFit(),
  xpPanel:()=>({open:XPP.open,vis:xpWrap.classList.contains('on'),
    id:XPP.xp?XPP.xp.id:null,
    title:xpTitEl.firstChild?xpTitEl.firstChild.textContent:'',   /* sólo el <span> del título */
    cat:XPP.xp?(XPP.xp.cat||''):'',
    controls:XPP.xp?((XPP.xp.ui.controls||[]).map(c=>({k:c.k||null,t:xpTy(c),
      label:c.label||null,val:c.k?XPP.xp.v[c.k]:null,txt:c._val?c._val.textContent:null}))):[],
    rect:(()=>{const r=xpCard.getBoundingClientRect();
      return [Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height)];})(),
    /* Medido en LAYOUT del escenario (offsets), que NO se entera de la rotación de 90°: es la
       única forma de comprobar desde un chromium horizontal que en un teléfono vertical la
       tarjeta cae adentro (ver el encabezado y core_r).
       OJO: la tarjeta se centra con left/top:50% + transform:translate(-50%,-50%) y el
       transform no aparece en los offsets, así que la esquina real es (left-w/2, top-h/2).
       Medir sin restar eso daba 'inside:false' incluso con el panel perfectamente centrado. */
    lay:(()=>{let top=0,left=0;for(let o=xpCard;o;o=o.offsetParent){top+=o.offsetTop;left+=o.offsetLeft;}
      const st=$('stage'),w=xpCard.offsetWidth,h=xpCard.offsetHeight;
      const x=Math.round(left-w/2),y=Math.round(top-h/2);
      return {left:x,top:y,w,h,cx:left,cy:top,
        stW:st?st.clientWidth:0,stH:st?st.clientHeight:0,
        inside:!!st&&x>=0&&y>=0&&x+w<=st.clientWidth+1&&y+h<=st.clientHeight+1};})()}),
  /* se mira el estilo CALCULADO, no el inline: el inline decía "visible" mientras la hoja lo
     tenía en display:none y la sonda daba por bueno un botón que no se veía en la captura */
  xpBtn:()=>{const s=getComputedStyle(xpBtn);
    return (s.display!=='none'&&s.visibility!=='hidden')?xpBtn.textContent:null;},
  xpBtnBox:()=>{const r=xpBtn.getBoundingClientRect();
    return {vis:getComputedStyle(xpBtn).display!=='none',
      x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2),
      w:Math.round(r.width),h:Math.round(r.height)};},
  xpTap:()=>{xpScan();return xpTap(null);},
  xpSecs:()=>SECTS.filter(s=>s.tab==='xp').map(s=>({id:s.id,name:s.name,n:s.props.length})),
  xpTabOn:()=>{const b=$('sptabs')&&$('sptabs').querySelector('[data-tab="xp"]');
    return b?{txt:b.textContent,on:b.classList.contains('on')}:null;},
  /* TODO lo que hay que medir del tamaño, en un solo objeto */
  xpInfo:()=>({k:+XPZ.k.toFixed(3),mv:XPZ.mv,
    plH:+PL.h.toFixed(3),plR:+PL.r.toFixed(3),
    capR:+(plBody.shapes[0]&&plBody.shapes[0].radius||0).toFixed(3),
    capBot:+(plBody.position.y+ (plBody.shapeOffsets[0]?plBody.shapeOffsets[0].y:0)
             -(plBody.shapes[0]?plBody.shapes[0].radius:0)).toFixed(3),
    capTop:+(plBody.shapeOffsets[1]?plBody.shapeOffsets[1].y:0).toFixed(3),
    camY:+camera.position.y.toFixed(3),camEye:+(camera.position.y-plBody.position.y).toFixed(3),
    camNear:+camera.near.toFixed(4),
    charScale:charRoot?+charRoot.scale.x.toFixed(4):null,charK:+(charK||0).toFixed(4),
    spd:+PL.spd.toFixed(2),run:+PL.run.toFixed(2),jump:+PL.jump.toFixed(2),
    py:+plBody.position.y.toFixed(3),fp:PL.fp}),
  xpSize:k=>xpSize(k),
  /* estado crudo del jugador: para medir el avance en m/s sin adivinar */
  xpPl:()=>({pos:[+plBody.position.x.toFixed(3),+plBody.position.y.toFixed(3),
      +plBody.position.z.toFixed(3)],
    vel:[+plBody.velocity.x.toFixed(3),+plBody.velocity.y.toFixed(3),+plBody.velocity.z.toFixed(3)],
    hor:+Math.hypot(plBody.velocity.x,plBody.velocity.z).toFixed(3),
    grounded:!!grounded,inWater:!!inWater,K:{f:K.f,s:K.s,run:K.run,jump:K.jump},
    spd:+PL.spd.toFixed(2),run:+PL.run.toFixed(2),jump:+PL.jump.toFixed(2),
    mass:plBody.mass,type:plBody.type}),
  xpScreen:(t,c)=>{xpScreen(t||'Prueba',c||[{k:'a',t:'slider',label:'A',min:0,max:10,step:1,val:5}]);
    return XPP.open;},
  /* mueve el slider como lo haría un dedo: devuelve el valor que quedó */
  xpSlide:(id,k,v)=>{const x=XPI[id];if(!x)return null;const c=xpCtl(x,k);
    if(c&&c._in){c._in.value=v;c._in.dispatchEvent(new Event('input',{bubbles:true}));}
    else xpSetV(x,k,v);
    return x.v[k];}
});
