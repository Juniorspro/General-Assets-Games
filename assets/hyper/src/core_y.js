/* ============================================================================================
   core_y.js — LA PANTALLA DE AJUSTES Y LA DE CONTROLES, PENSADAS PARA HORIZONTAL
   ============================================================================================
   El usuario pidió tres cosas: que el panel de los experimentos se pueda deslizar (eso está en
   core_u: uiScroll + xpFit), que la interfaz esté pensada para horizontal, y que Ajustes deje de
   ser feo. Acá van las dos pantallas que no son mías de nacimiento:

   1) AJUSTES (#opts/#optcard, de core_b) — se REARMA, no se rehace.
      Los controles son EXACTAMENTE los mismos nodos que ya existían; sólo se MUEVEN a una
      estructura nueva (secciones con título, filas parejas, interruptores de verdad). Se mueven y
      no se recrean por una razón concreta: cada uno tiene listeners vivos de otros cores
      (core_b: applyOpts en 'input' de los 9 de siempre; core_n: el volumen; core_s: Ultra 4K;
      core_h: el tamaño de los botones del HUD) y applyOpts(true) les escribe .checked/.value por
      id. Recrear un <input> mata su listener y rompe todo eso sin que nada avise; moverlo no
      cambia nada del comportamiento — sólo el lugar donde se dibuja.
      El <input type=checkbox> sigue existiendo dentro del interruptor: está transparente encima
      de la pastilla y el <label> que lo envuelve le pasa el toque. Así SV.shadow, SV.desc,
      SV.post, SV.fpsm, SV.hideui, SV.sens, SV.fpslim, SV.texq, SV.maxProps, SV.vol, SV.ultra…
      siguen viajando por donde viajaban.
      #gfxBox (core_s) se deja ENTERO con sus clases .gfxg/.gfxa/.gfxh: gfxUI() prende y apaga
      #gfxBox.off/#gfxBox.na y esas reglas apuntan a esos hijos. Se le cambia la pinta por CSS y
      se le convierten los checkboxes en interruptores, pero la caja no se desarma.

   2) CONTROLES (#sHelp) — el texto de ayuda (T('hB'), un párrafo con <br> y ' · ') se parte en
      fichas "tecla → qué hace" y se acomoda en columnas. Se re-arma detrás de applyLang porque
      core_b escribe $('hBody').innerHTML=T('hB') cada vez que cambia el idioma.

   POR QUÉ TODO SE MIDE CONTRA #stage Y NO CONTRA LA VENTANA
   El juego se ve siempre horizontal: con el teléfono vertical core_a le pone a #stage un
   transform:rotate(90deg) y le fija clientWidth/clientHeight. Entonces vw/vh (y cualquier
   getBoundingClientRect contra el viewport) están CRUZADOS respecto de lo que ve el jugador. Las
   medidas van en vmin (= lado corto del escenario, su alto) y vmax (= lado largo, su ancho), y
   los techos finos se calculan con #stage.clientWidth/clientHeight. Con 94vh de techo la tarjeta
   de Ajustes medía 860 px dentro de un escenario de 412 y se salía por los dos lados.

   DESLIZAR: el gesto lo maneja uiScroll (core_u), que pasa el delta del dedo por dStage(). Está
   medido que el scroll NATIVO no funciona con el escenario rotado (ver el comentario largo de
   uiScroll en core_u): por eso los contenedores llevan touch-action:none y el scroll a mano.

   OJO CON 'font:' Y 'inherit'. En este proyecto hay 40 reglas escritas 'font:800 13px inherit' y
   TODAS están muertas: 'inherit' no es una familia válida, así que el navegador tira la
   declaración entera y el texto queda en 16 px normales (medido: getComputedStyle daba 16px/400).
   Por eso las reglas nuevas de Ajustes y Controles usan font-weight/font-size/line-height
   sueltos. Con las medidas de verdad aplicándose, Ajustes pasó de 487 px de alto a 213.

   Se concatena al final de todos: ya existen $, nsafe, clamp, SV, save, T, I18N, applyOpts,
   applyLang, gfxUI, uiScroll, xpFit, EXT, APP, DEV, __H…
   ============================================================================================ */

/* ================= 1. AJUSTES: rearmado en secciones ================= */
/* las cuatro secciones que pidió el usuario (GRÁFICOS, SONIDO, CONTROLES, JUEGO) más la caja de
   Ultra 4K que agrega core_s. El reparto en columnas NO está escrito acá: lo hace oyLayout
   midiendo, así ninguna columna queda el doble de alta que las otras. */
const OYSEC=[
  {t:'oGfx',  ids:['oShadow','oPost','oTex','oLim']},
  {t:'oPlay', ids:['oDesc','oFps','oHide','oMax']},
  {t:'oSnd',  ids:['oVol']},
  {t:'oCtl',  ids:['oSens','oHudK','oHudMove']},
  {t:'oUlt',  ids:['#gfxBox']}
];
Object.assign(I18N.es,{oGfx:'Gráficos',oSnd:'Sonido',oCtl:'Controles',oPlay:'Juego',
  oUlt:'Extra',oHudK:'Tamaño de botones',oSubT:'Todo se guarda solo'});
Object.assign(I18N.en,{oGfx:'Graphics',oSnd:'Sound',oCtl:'Controls',oPlay:'Game',
  oUlt:'Extra',oHudK:'Button size',oSubT:'Everything saves itself'});
Object.assign(I18N.pt,{oGfx:'Gráficos',oSnd:'Som',oCtl:'Controles',oPlay:'Jogo',
  oUlt:'Extra',oHudK:'Tamanho dos botões',oSubT:'Tudo salva sozinho'});

/* ---- CSS propio: va DESPUÉS del de core_s/core_h (se inyectan en el <head> al cargar), así que
   con la misma especificidad gana el mío y puedo reformar #gfxBox sin editar core_s ---- */
nsafe(()=>{
  const st=document.createElement('style');
  st.textContent=
   /* #gfxBox deja de ser "una fila de la grilla de dos columnas" y pasa a ser una columna más */
   '#gfxBox{grid-column:auto;border-top:0;margin:0;padding:0;display:flex;flex-direction:column;'+
   '  gap:4px;min-width:0}'+
   '#gfxBox .gfxt{display:flex;align-items:center;gap:7px;font-weight:900;font-size:10.5px;'+
   '  letter-spacing:.12em;text-transform:uppercase;color:var(--acc);margin:2px 0 0;'+
   '  white-space:nowrap;overflow:hidden}'+
   '#gfxBox .gfxt:after{content:"";flex:1;height:1px;'+
   '  background:linear-gradient(90deg,rgba(242,161,58,.55),rgba(242,161,58,0))}'+
   /* la fila del interruptor maestro usa la misma pinta que las demás (.oRow) */
   '#gfxBox .gfxh{display:flex;align-items:center;gap:7px;min-height:34px;padding:3px 8px;'+
   '  border-radius:6px;background:rgba(40,44,50,.6);border-left:2px solid var(--acc);'+
   '  font-weight:900;font-size:12px}'+
   /* la explicación larga: 3 renglones como techo (en una columna de 200 px eran ocho y se
      comía la pantalla), con su tamaño chico de nota al pie */
   '#gfxBox .gfxs{font-weight:600;font-size:10px;line-height:1.3;opacity:.7;margin:1px 0 2px;'+
   '  display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}'+
   '#gfxBox .gfxg{display:flex;flex-direction:column;gap:4px}'+
   /* LAS SUBOPCIONES SE PLIEGAN CUANDO ULTRA ESTÁ APAGADO. core_s ya les ponía opacity:.42 y
      pointer-events:none con #gfxBox.off (o sea: no se pueden tocar), así que gastar 245 px de
      pantalla en cinco controles muertos era el único motivo por el que Ajustes no entraba sin
      deslizar. Con el interruptor maestro apagado —el caso normal— ahora entra todo; al prenderlo
      aparecen las cinco y, si hace falta, se desliza (y se desliza bien). */
   '#gfxBox.off .gfxg,#gfxBox.off .gfxa{display:none}'+
   '#gfxBox .gfxw{font-weight:800;font-size:10.5px;line-height:1.25;color:#ffd479;display:none}'+
   '#gfxBox .gfxa{margin:0}'+
   /* el nombre del slider de core_h venía con color:var(--dim) inline; ya sin el inline, hereda */
   '#optBody .oNm{color:var(--ink)}';
  document.head.appendChild(st);
},'oycss');

/* ---- helpers de armado ---- */
/* una fila "nombre + interruptor": el checkbox ORIGINAL queda adentro, invisible y clickeable */
function oySwitch(inp,lab){
  const row=document.createElement('div');row.className='oRow';
  const nm=document.createElement('span');nm.className='oNm';
  if(lab)nm.appendChild(lab);else nm.textContent=inp.id;
  const sw=document.createElement('label');sw.className='osw';
  sw.appendChild(inp);sw.appendChild(document.createElement('i'));
  row.appendChild(nm);row.appendChild(sw);
  return row;
}
/* una fila de slider: nombre + valor arriba, barra a lo ancho abajo */
function oySlider(inp,lab,val){
  const row=document.createElement('div');row.className='oRow oSlr';
  const top=document.createElement('div');top.className='oTop';
  const nm=document.createElement('span');nm.className='oNm';
  if(lab)nm.appendChild(lab);else nm.textContent=inp.id;
  top.appendChild(nm);
  if(val)top.appendChild(val);
  row.appendChild(top);row.appendChild(inp);
  return row;
}
/* una fila de desplegable */
function oySelect(sel,lab){
  const row=document.createElement('div');row.className='oRow';
  const nm=document.createElement('span');nm.className='oNm';
  if(lab)nm.appendChild(lab);else nm.textContent=sel.id;
  row.appendChild(nm);row.appendChild(sel);
  return row;
}
/* convierte una fila VIEJA (label.chk o div.sl, las que escribieron core_b y core_n) en una fila
   nueva, reutilizando sus nodos. Devuelve el elemento a insertar. */
function oyRowOf(id){
  const e=document.getElementById(id);if(!e)return null;
  if(e.closest('.oRow'))return null;           /* ya convertido: no rehacer */
  /* el <span> del nombre y el <b> del valor son los que traduce/actualiza el resto del juego:
     se mueven tal cual, jamás se recrean */
  const old=e.closest('label.chk,div.sl,div.gfxh')||e.parentElement;
  const lab=old?old.querySelector('span'):null;
  const val=old?old.querySelector('b'):null;
  let row=null;
  if(e.tagName==='SELECT')row=oySelect(e,lab);
  else if(e.type==='checkbox')row=oySwitch(e,lab);
  else if(e.type==='range')row=oySlider(e,lab,val);
  /* el envase viejo queda vacío: si no se saca, es un hijo fantasma que empuja el layout */
  if(row&&old&&old!==row&&!old.querySelector('input,select,span,b'))old.remove();
  return row;
}
/* #gfxBox (core_s) se deja ENTERO —gfxUI() prende #gfxBox.off/.na y esas reglas apuntan a sus
   hijos .gfxg/.gfxa/.gfxh— pero sus checkboxes chatos se convierten en interruptores en el
   lugar: mismo input, mismo id, mismo listener; sólo cambia el envase. */
function oyGfxRows(){
  const box=$('gfxBox');if(!box)return 0;
  let n=0;
  /* el maestro: la fila .gfxh se conserva (tiene la regla .na) y se le reordena el contenido */
  const h=box.querySelector('.gfxh'),mi=$('oUltra');
  if(h&&mi&&!mi.closest('.osw')){
    const sp=h.querySelector('span');
    const nm=document.createElement('span');nm.className='oNm';
    if(sp)nm.appendChild(sp);
    const sw=document.createElement('label');sw.className='osw';
    sw.appendChild(mi);sw.appendChild(document.createElement('i'));
    h.replaceChildren(nm,sw);n++;
  }
  /* los cuatro de abajo: label.chk -> div.oRow (un <label> no puede anidar otro <label>, así que
     el envase viejo se descarta y queda el input, que es el que tiene el listener) */
  for(const lb of [...box.querySelectorAll('label.chk')]){
    const inp=lb.querySelector('input');if(!inp)continue;
    lb.replaceWith(oySwitch(inp,lb.querySelector('span')));n++;
  }
  return n;
}
function oyTitle(key){
  const h=document.createElement('div');h.className='oSec';h.dataset.t=key;
  h.textContent=T(key)||key;return h;
}
/* la fila de core_h (tamaño de botones): viene en un div con estilos inline y en el orden
   span→input→b, así que el valor caía DEBAJO de la barra. Se rearma como cualquier otra. */
function oyHudRow(){
  const k=$('oHudK');if(!k)return null;
  if(k.closest('.oRow'))return k.closest('.oRow');
  const inner=k.parentElement;if(!inner)return null;
  const lab=inner.querySelector('span'),val=inner.querySelector('b');
  for(const e of [lab,val])if(e)e.removeAttribute('style');
  const row=oySlider(k,lab,val);
  if(!inner.querySelector('input,select,span,b'))inner.remove();
  return row;
}
/* el rearmado entero. Idempotente: se puede volver a llamar. */
let oyGrps=null;
function oyBuild(){
  const card=$('optcard'),body=$('optBody');if(!card||!body)return false;
  nsafe(oyGfxRows,'oygfx');
  oyGrps=[];
  for(const s of OYSEC){
    const rows=[];
    for(const id of s.ids){
      if(id[0]==='#'){                        /* una caja entera (el #gfxBox de core_s) */
        const box=document.getElementById(id.slice(1));
        if(box)rows.push(box);
        continue;
      }
      if(id==='oHudK'){const r=oyHudRow();if(r)rows.push(r);continue;}
      if(id==='oHudMove'){
        const b=$('oHudMove');if(!b)continue;
        /* el <div> con el que core_h le hizo appendChild al #optcard (y que por eso caía DEBAJO
           del pie, fuera de la pantalla) queda vacío al sacarle el botón: se va, o estorba en el
           flex de la tarjeta */
        const host=b.parentElement;
        rows.push(b);
        if(host&&host!==b&&host.parentElement===card)
          setTimeout(()=>nsafe(()=>{if(!host.children.length)host.remove();},'oyrm'),0);
        continue;
      }
      const r=oyRowOf(id);if(r)rows.push(r);
    }
    if(!rows.length)continue;                 /* si un core no cargó, su sección no aparece */
    const g=document.createElement('div');g.className='oGrp';g.dataset.sec=s.t;
    /* #gfxBox ya trae su propio título (.gfxt, que core_s traduce): no se le pone otro */
    if(!(rows.length===1&&rows[0].id==='gfxBox'))g.appendChild(oyTitle(s.t));
    for(const r of rows)g.appendChild(r);
    oyGrps.push(g);
  }
  body.replaceChildren();
  oyLayout(4);
  /* pie y velo siempre al final y en ese orden */
  const foot=$('optfoot'),fade=$('optFade');
  if(fade)card.appendChild(fade);
  if(foot)card.appendChild(foot);
  const sub=$('optSub');if(sub)sub.textContent=T('oSubT')||'';
  nsafe(oyFit,'oyfit');
  return true;
}
/* reparte los bloques en N columnas dejándolas PAREJAS de alto (el más alto primero, siempre a
   la columna más corta). Sin esto, con el bloque de Ultra 4K —que mide el doble que los otros—
   la pantalla crecía de alto por una sola columna mientras las otras tres quedaban a medio usar.
   Si los bloques todavía miden 0 (Ajustes cerrado) reparte por orden: al abrirse se vuelve a
   llamar con las medidas de verdad. */
function oyLayout(n){
  const body=$('optBody');if(!body||!oyGrps||!oyGrps.length)return 0;
  /* cuántas columnas entran DE VERDAD: se le pregunta a la grilla, no se adivina */
  let N=n||4;
  if(body.clientWidth>0){
    const gt=getComputedStyle(body).gridTemplateColumns;
    const k=gt&&gt!=='none'?gt.split(' ').length:0;
    if(k>0)N=Math.min(N,k);
  }
  N=Math.max(1,Math.min(N,oyGrps.length));
  const cols=[];
  for(let i=0;i<N;i++){const c=document.createElement('div');c.className='oCol';
    c.dataset.col=i;cols.push(c);}
  const h=oyGrps.map(g=>g.offsetHeight||0);
  const measured=h.some(v=>v>0);
  const idx=oyGrps.map((g,i)=>i);
  if(measured)idx.sort((a,b)=>h[b]-h[a]);
  const sum=new Array(N).fill(0),put=new Array(N).fill(null).map(()=>[]);
  for(const i of idx){
    let best=0;for(let c=1;c<N;c++)if(sum[c]<sum[best])best=c;
    put[best].push(i);sum[best]+=h[i]+7;
  }
  /* dentro de cada columna se respeta el orden original (leer de arriba a abajo tiene sentido) */
  for(let c=0;c<N;c++){put[c].sort((a,b)=>a-b);
    for(const i of put[c])cols[c].appendChild(oyGrps[i]);}
  body.replaceChildren(...cols);
  return N;
}
/* techo de la tarjeta MEDIDO CONTRA EL ESCENARIO (no innerHeight: ver el encabezado) */
function oyFit(){
  const st=$('stage'),card=$('optcard');if(!st||!card)return null;
  const W=st.clientWidth,H=st.clientHeight;if(!W||!H)return null;
  card.style.maxHeight=Math.round(H*.95)+'px';
  card.style.maxWidth=Math.round(W*.97)+'px';
  nsafe(oyMore,'oymore');
  return {W,H,card:[card.offsetWidth,card.offsetHeight]};
}
/* aviso de "hay más abajo" (el mismo velo que el panel de experimentos) */
function oyMore(){
  const b=$('optBody'),f=$('optFade');if(!b||!f)return false;
  const more=b.scrollHeight-b.clientHeight-b.scrollTop>8;
  f.classList.toggle('on',!!more);
  return more;
}
/* al abrir (o al girar el teléfono) se remide TODO: con la pantalla cerrada los bloques miden 0.
   Dos pasadas de reparto porque la primera cambia el ancho de columna y con eso el alto de los
   bloques: la segunda ya reparte con las medidas definitivas. */
function oyShow(){
  oyLayout(4);oyLayout(4);
  oyFit();
  const b=$('optBody');if(b)b.scrollTop=0;
  oyMore();
  return true;
}
nsafe(()=>{
  oyBuild();
  uiScroll($('optBody'));                    /* deslizar con el dedo, ver core_u */
  $('optBody').addEventListener('scroll',()=>nsafe(oyMore,'oymore2'),{passive:true});
  addEventListener('resize',()=>nsafe(()=>{
    if($('opts').classList.contains('on'))oyShow();else oyFit();},'oyfitr'));
  /* Ajustes se abre desde el menú de pausa (core_b: $('pOpts') le agrega la clase .on) */
  const po=$('pOpts');
  if(po)po.addEventListener('click',()=>nsafe(oyShow,'oyopen'));
  /* prender/apagar Ultra 4K despliega o pliega cinco controles: hay que volver a repartir las
     columnas o queda una torre altísima al lado de tres columnas vacías. Este listener se
     registra DESPUÉS del de core_s, así que corre con el estado ya aplicado. */
  const ul=$('oUltra');
  if(ul)ul.addEventListener('input',()=>nsafe(()=>{
    if($('opts').classList.contains('on'))oyShow();},'oyultra'));
},'oyopts');

/* applyLang() rehace los textos de core_b y core_s/core_h reescriben los suyos: los títulos de
   sección se traducen a mano y las fichas de Controles se rearman (core_b acaba de pisar
   #hBody con el párrafo crudo). */
const _oyLang=applyLang;
applyLang=function(){
  const r=_oyLang.apply(this,arguments);
  nsafe(()=>{
    for(const h of document.querySelectorAll('#optBody .oSec'))
      if(h.dataset.t)h.textContent=T(h.dataset.t)||h.dataset.t;
    const sub=$('optSub');if(sub)sub.textContent=T('oSubT')||'';
    /* el nombre del slider de core_h no está en su I18N: se traduce acá */
    const kl=$('oHudKL');if(kl&&T('oHudK'))kl.textContent=T('oHudK');
    oyHelp();
  },'oylang');
  return r;
};

/* ================= 2. CONTROLES (#sHelp): fichas en columnas ================= */
/* T('hB') es un párrafo: renglones separados por <br> y dentro fichas separadas por ' · ', cada
   una con la tecla/botón en <b>. Se parte en fichas de verdad para que en horizontal se lean en
   varias columnas en vez de cinco renglones larguísimos con media pantalla vacía al lado. */
function oyHelp(){
  const box=$('hBody');if(!box)return false;
  const src=T('hB')||'';
  const g=document.createElement('div');g.className='hkg';
  let n=0;
  for(const line of src.split(/<br\s*\/?>/i)){
    for(const raw of line.split('·')){
      const s=raw.trim();if(!s)continue;
      const d=document.createElement('div');d.className='hkc';
      /* la ficha "buena" empieza con <b>tecla</b> y sigue con lo que hace. La pastilla crece si
         la "tecla" es una frase ("arrastrá la pantalla"): antes esas caían en el molde de prosa
         y se comían un renglón entero cada una. */
      const m=s.match(/^<b>(.*?)<\/b>\s*([\s\S]*)$/i);
      if(m&&m[2].trim()){
        const b=document.createElement('b');b.innerHTML=m[1];
        const sp=document.createElement('span');sp.innerHTML=m[2].trim();
        d.appendChild(b);d.appendChild(sp);
      } else {
        /* renglón de prosa (el de la PhysicsGun): de ancho entero y sin pastilla */
        d.className='hkc full';
        const sp=document.createElement('span');sp.innerHTML=s;
        d.appendChild(sp);
      }
      g.appendChild(d);n++;
    }
  }
  box.classList.remove('sub');                /* .sub le metía un margen de párrafo */
  box.replaceChildren(g);
  return n;
}
nsafe(oyHelp,'oyhelp0');
/* las tarjetas de las pantallas (idioma, gráficos, mapa, controles) también tienen que poder
   deslizarse con el dedo cuando no entran: mismo motor que el panel de experimentos */
nsafe(()=>{for(const c of document.querySelectorAll('.screen .card'))uiScroll(c);},'oycards');

/* ================= 3. hooks de medición ================= */
if(DEV&&window.__H)Object.assign(window.__H,{
  /* TODO lo de Ajustes en un objeto. Se mide en LAYOUT (offsets) porque con el teléfono vertical
     los rects del viewport están rotados. 'zero' = controles sin dibujar; 'reach' = con el
     cuerpo deslizado al fondo, el último bloque entra en la ventana. */
  optUI:()=>{
    const card=$('optcard'),body=$('optBody'),st=$('stage');
    const on=$('opts').classList.contains('on');
    const off=e=>{let y=0,x=0;for(let o=e;o;o=o.offsetParent){y+=o.offsetTop;x+=o.offsetLeft;}
      return {x,y};};
    const c=off(card);
    const ids=['oShadow','oDesc','oPost','oFps','oHide','oSens','oLim','oTex','oMax','oVol',
      'oUltra','oMblur','oGsh','oDli','oGenv','oMbA','oHudK','oHudMove'];
    const miss=ids.filter(i=>!document.getElementById(i));
    const zero=[];
    if(on)for(const i of ids){const e=document.getElementById(i);if(!e)continue;
      const r=e.getBoundingClientRect();if(r.width<2||r.height<2)zero.push(i);}
    const last=(()=>{let ymax=-1;
      for(const col of body.querySelectorAll('.oCol')){
        const k=col.lastElementChild;if(!k)continue;
        const y=k.offsetTop+k.offsetHeight;if(y>ymax)ymax=y;}
      return {y:ymax,ok:ymax>=0&&ymax<=body.scrollTop+body.clientHeight+2};})();
    return {on,ids:ids.length,miss,zero,reach:last.ok,lastY:last.y,
      cols:[...body.querySelectorAll('.oCol')].map(k=>k.children.length),
      secs:[...body.querySelectorAll('.oSec')].map(k=>k.textContent),
      switches:body.querySelectorAll('.osw').length,
      gfxIn:!!$('gfxBox')&&!!$('gfxBox').closest('#optBody'),
      hudIn:!!$('oHudK')&&!!$('oHudK').closest('#optBody'),
      volIn:!!$('oVol')&&!!$('oVol').closest('#optBody'),
      footLast:card.lastElementChild===$('optfoot'),
      card:[card.offsetWidth,card.offsetHeight],lay:[c.x,c.y],
      stage:st?[st.clientWidth,st.clientHeight]:null,
      inside:!!st&&c.x>=0&&c.y>=0&&c.x+card.offsetWidth<=st.clientWidth+1&&
        c.y+card.offsetHeight<=st.clientHeight+1,
      scroll:{top:Math.round(body.scrollTop),client:body.clientHeight,h:body.scrollHeight,
        max:Math.max(0,body.scrollHeight-body.clientHeight),more:oyMore()}};
  },
  optOpen:v=>{$('opts').classList.toggle('on',v!==false);
    if(v!==false)nsafe(oyShow,'oyh1');
    return $('opts').classList.contains('on');},
  optScrollTo:v=>{$('optBody').scrollTop=v;nsafe(oyMore,'oyh2');return $('optBody').scrollTop;},
  /* toca el interruptor como un dedo: click en el <label>, que es lo que hay en pantalla */
  optTap:id=>{const e=document.getElementById(id);if(!e)return null;
    (e.closest('label')||e).click();
    return e.type==='checkbox'?e.checked:e.value;},
  helpUI:()=>{const b=$('hBody'),card=$('sHelp').querySelector('.card'),st=$('stage');
    const chips=[...b.querySelectorAll('.hkc')];
    const off=e=>{let y=0,x=0;for(let o=e;o;o=o.offsetParent){y+=o.offsetTop;x+=o.offsetLeft;}
      return {x,y};};
    const c=off(card);
    return {chips:chips.length,full:chips.filter(k=>k.classList.contains('full')).length,
      cols:getComputedStyle(b.querySelector('.hkg')||b).gridTemplateColumns.split(' ').length,
      txt:chips.slice(0,4).map(k=>k.textContent.slice(0,26)),
      card:[card.offsetWidth,card.offsetHeight],
      stage:st?[st.clientWidth,st.clientHeight]:null,
      inside:!!st&&c.x>=0&&c.y>=0&&c.x+card.offsetWidth<=st.clientWidth+1&&
        c.y+card.offsetHeight<=st.clientHeight+1,
      scrollable:card.scrollHeight>card.clientHeight+2};},
  oyRebuild:()=>oyBuild()
});
