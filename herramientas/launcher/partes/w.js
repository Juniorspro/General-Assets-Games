/* ══════════════════════ LOS WIDGETS ══════════════════════

   ── SON CÓDIGO Y NO IMÁGENES, Y NO ES UNA CONCESIÓN ──
   Un widget muestra algo que cambia: la hora, la batería, la fase de la luna, el
   cronómetro andando. Una imagen generada de un reloj es un dibujo de un reloj,
   y a los sesenta segundos miente. Lo que sí sale de Rezona es el fondo detrás;
   la esfera, las agujas y el arco de la batería se dibujan acá y pesan cero.

   ── VIVEN EN LA MISMA FRANJA QUE EL RELOJ, APILADOS ──
   `#capa` es una columna flex donde `#hoja` es lo elástico, así que agregar un
   widget le come filas a la reja de apps SOLO, sin una sola cuenta: `calculaFilas`
   ya mide `#hoja`. Con los widgets metidos adentro de la reja habría que
   reservarle celdas a cada uno y decidir qué pasa cuando no entra.

   ── Y EL DE RELOJ CONSERVA LOS IDS DE SIEMPRE ──
   `#hora`, `#fecha`, `#wArco`, `#wPct` y `#wSaludo` son los que ya escriben
   `pintaReloj` y `pintaBateria`. Renombrándolos habría dos sitios que pintan el
   mismo reloj, y el día que se toque uno el otro queda mintiendo. */

let LUNA_F = -1;                  /* -1 = la de verdad; la sonda la pisa */
let WID = [];                     /* las claves puestas, en orden */
let WID_T = 0;                    /* el reloj de los que se mueven */

const WID_MAX = 4;                /* más que eso y no queda escritorio */

/* ── EL RELOJ DE LOS WIDGETS VIVOS CORRE SOLO SI HAY ALGUNO ──
   Un intervalo abierto en la pantalla de inicio de un teléfono es batería
   regalada; y el cronómetro necesita décimas, así que no puede colgarse del
   segundero que ya existe. */
let WID_INT = 0;

function widLee(){
  const v = lee('widgets', ['reloj']);
  return Array.isArray(v) ? v.filter(k => WIDGETS[k]).slice(0, WID_MAX) : ['reloj'];
}

/* ══════════ EL CATÁLOGO ══════════
   Cada uno declara su nombre, si se mueve (`vivo`), y una función que ARMA su
   cuerpo y otra que lo PINTA. Están separadas a propósito: armar crea nodos y
   pintar sólo escribe texto, así que el que se mueve no reconstruye el DOM diez
   veces por segundo. */

function wEl(cl, txt){
  const d = document.createElement('div');
  if (cl) d.className = cl;
  if (txt != null) d.textContent = txt;
  return d;
}
function wSvg(n, a){
  const e = document.createElementNS('http://www.w3.org/2000/svg', n);
  for (const k in a) e.setAttribute(k, a[k]);
  return e;
}
function w2(n){ return n < 10 ? '0' + n : String(n); }

const W_FRASES = [
  ['El agua siempre encuentra su camino.', 'Water always finds its way.', 'A água sempre acha seu caminho.'],
  ['Lo simple es lo que queda cuando se sacó todo lo demás.', 'Simple is what is left when everything else is gone.', 'O simples é o que sobra quando se tira o resto.'],
  ['Un día a la vez.', 'One day at a time.', 'Um dia de cada vez.'],
  ['Lo que no se mide, no se mejora.', 'What is not measured is not improved.', 'O que não se mede não se melhora.'],
  ['La calma también es velocidad.', 'Calm is also speed.', 'A calma também é velocidade.'],
  ['Empezar es la mitad.', 'Starting is half of it.', 'Começar já é metade.'],
  ['Nada se pierde: todo se transforma.', 'Nothing is lost: everything changes.', 'Nada se perde: tudo se transforma.'],
];

const W_CIUDADES = [['NYC', -5], ['LDN', 0], ['TYO', 9]];

const WIDGETS = {

  /* ── 1 · EL RELOJ DE SIEMPRE ── */
  reloj: { alto: 100, vivo: false, arma(e){
    e.innerHTML = '<div id="wIzq"><div id="hora">—</div><div id="fecha">—</div></div>'
      + '<div id="wDer"><svg id="wAro" viewBox="0 0 60 60" aria-hidden="true">'
      + '<circle class="wPista" cx="30" cy="30" r="25"/>'
      + '<circle class="wCarga" id="wArco" cx="30" cy="30" r="25"/></svg>'
      + '<div id="wPct">—</div><div id="wSaludo">—</div></div>';
    e.id = 'reloj';
    pintaReloj(true); pintaBateria();   /* la primera vez sí se le pregunta al puente */
  }},

  /* ── 2 · SÓLO LA HORA, GRANDE ── */
  horaGrande: { alto: 96, vivo: false, arma(e){
    e.appendChild(wEl('wgHora', '—')); e.appendChild(wEl('wgSub', '—'));
  }, pinta(e){
    const d = new Date();
    e.children[0].textContent = w2(d.getHours()) + ':' + w2(d.getMinutes());
    /* con «28» solo al lado de «21:18» se lee a temperatura; los dos puntos
       dicen de qué es el número sin una palabra */
    e.children[1].textContent = ':' + w2(d.getSeconds());
  }},

  /* ── 3 · ANALÓGICO ──
     Las agujas no se «animan»: se recalcula su ángulo desde la hora, así que no
     se pueden desincronizar del reloj digital de al lado. */
  analogico: { alto: 132, vivo: false, arma(e){
    const s = wSvg('svg', { viewBox: '0 0 100 100', class: 'wgEsf' });
    s.appendChild(wSvg('circle', { cx: 50, cy: 50, r: 46, class: 'wgEsfB' }));
    for (let i = 0; i < 12; i++){
      const a = i*Math.PI/6, r1 = i % 3 === 0 ? 33 : 38;
      s.appendChild(wSvg('line', { x1: 50 + Math.sin(a)*r1, y1: 50 - Math.cos(a)*r1,
        x2: 50 + Math.sin(a)*42, y2: 50 - Math.cos(a)*42,
        class: i % 3 === 0 ? 'wgM wgMg' : 'wgM' }));
    }
    for (const c of ['wgH', 'wgMin', 'wgS'])
      s.appendChild(wSvg('line', { x1: 50, y1: 50, x2: 50, y2: 20, class: c }));
    s.appendChild(wSvg('circle', { cx: 50, cy: 50, r: 3, class: 'wgEje' }));
    e.appendChild(s);
    const t = wEl('wgLado');
    t.appendChild(wEl('wgLadoH', '—')); t.appendChild(wEl('wgLadoF', '—'));
    e.appendChild(t);
  }, pinta(e){
    const d = new Date();
    const ag = [(d.getHours() % 12 + d.getMinutes()/60)*30,
                (d.getMinutes() + d.getSeconds()/60)*6, d.getSeconds()*6];
    const largo = [26, 34, 37];
    const ln = e.querySelectorAll('.wgH,.wgMin,.wgS');
    for (let i = 0; i < 3; i++){
      const a = ag[i]*Math.PI/180;
      ln[i].setAttribute('x2', 50 + Math.sin(a)*largo[i]);
      ln[i].setAttribute('y2', 50 - Math.cos(a)*largo[i]);
    }
    const t = TXT[LANG] || TXT.es;
    e.querySelector('.wgLadoH').textContent = w2(d.getHours()) + ':' + w2(d.getMinutes());
    e.querySelector('.wgLadoF').textContent = t.dias[d.getDay()];
  }},

  /* ── 4 · LA FECHA ── */
  fecha: { alto: 90, vivo: false, arma(e){
    e.appendChild(wEl('wgDia', '—'));
    const c = wEl('wgFCol');
    c.appendChild(wEl('wgFSem', '—')); c.appendChild(wEl('wgFMes', '—'));
    e.appendChild(c);
  }, pinta(e){
    const d = new Date(), t = TXT[LANG] || TXT.es;
    e.children[0].textContent = d.getDate();
    e.children[1].children[0].textContent = t.dias[d.getDay()];
    e.children[1].children[1].textContent = t.meses[d.getMonth()] + ' ' + d.getFullYear();
  }},

  /* ── 5 · LA SEMANA ── */
  semana: { alto: 84, vivo: false, arma(e){
    const f = wEl('wgSem');
    for (let i = 0; i < 7; i++){
      const c = wEl('wgSemD');
      c.appendChild(wEl('wgSemL', '')); c.appendChild(wEl('wgSemN', ''));
      f.appendChild(c);
    }
    e.appendChild(f);
  }, pinta(e){
    const d = new Date(), t = TXT[LANG] || TXT.es;
    /* la semana arranca el lunes, que es como se lee un calendario acá */
    const lun = new Date(d); lun.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const cs = e.querySelectorAll('.wgSemD');
    for (let i = 0; i < 7; i++){
      const x = new Date(lun); x.setDate(lun.getDate() + i);
      cs[i].children[0].textContent = t.dias[x.getDay()].slice(0, 1).toUpperCase();
      cs[i].children[1].textContent = x.getDate();
      cs[i].classList.toggle('hoy', x.toDateString() === d.toDateString());
    }
  }},

  /* ── 6 · EL MES ── */
  calendario: { alto: 196, vivo: false, arma(e){
    e.appendChild(wEl('wgCalTit', '—'));
    e.appendChild(wEl('wgCal'));
  }, pinta(e){
    const d = new Date(), t = TXT[LANG] || TXT.es;
    e.children[0].textContent = t.meses[d.getMonth()] + ' ' + d.getFullYear();
    const r = e.children[1]; r.textContent = '';
    for (let i = 0; i < 7; i++)
      r.appendChild(wEl('wgCalC wgCalH', t.dias[(i + 1) % 7].slice(0, 1).toUpperCase()));
    const pri = new Date(d.getFullYear(), d.getMonth(), 1);
    const hueco = (pri.getDay() + 6) % 7;
    const dias = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    for (let i = 0; i < hueco; i++) r.appendChild(wEl('wgCalC', ''));
    for (let i = 1; i <= dias; i++){
      const c = wEl('wgCalC', String(i));
      if (i === d.getDate()) c.classList.add('hoy');
      r.appendChild(c);
    }
  }},

  /* ── 7 · LA BATERÍA ── */
  bateria: { alto: 78, vivo: false, arma(e){
    e.appendChild(wEl('wgBatN', '—'));
    const c = wEl('wgBatCol');
    c.appendChild(wEl('wgBatEt', '—'));
    const b = wEl('wgBatBar'); b.appendChild(wEl('wgBatLl')); c.appendChild(b);
    e.appendChild(c);
  }, pinta(e){
    const b = bateriaAhora();
    e.children[0].textContent = b.n + '%';
    e.children[1].children[0].textContent = b.carga ? T('wCargando') : T('wBateria');
    const ll = e.querySelector('.wgBatLl');
    ll.style.width = b.n + '%';
    ll.style.background = b.carga ? '#6fe3ff' : b.n < 15 ? '#ff6b6b' : 'var(--acento)';
  }},

  /* ── 8 · CRONÓMETRO ──
     El tiempo se calcula de `performance.now()` y no se acumula sumando el `dt`
     de cada pintada: acumulando, un cronómetro que corre diez minutos se va
     segundos enteros porque el intervalo del navegador no es exacto. */
  cronometro: { alto: 92, vivo: true, arma(e){
    e.appendChild(wEl('wgCron', '0:00.0'));
    const b = wEl('wgBtns');
    const p = wEl('wgB', '▶'), z = wEl('wgB', '↺');
    p.onclick = () => {
      const s = lee('wCron', { on: false, t0: 0, ac: 0 });
      if (s.on){ s.ac += performance.now() - s.t0; s.on = false; }
      else { s.t0 = performance.now(); s.on = true; }
      guarda('wCron', s); widRitmo();
    };
    z.onclick = () => { guarda('wCron', { on: false, t0: 0, ac: 0 }); widRitmo(); };
    b.appendChild(p); b.appendChild(z); e.appendChild(b);
  }, pinta(e){
    const s = lee('wCron', { on: false, t0: 0, ac: 0 });
    const ms = s.ac + (s.on ? performance.now() - s.t0 : 0);
    const t = Math.floor(ms/100);
    e.children[0].textContent = Math.floor(t/600) + ':' + w2(Math.floor(t/10) % 60)
                              + '.' + (t % 10);
    e.querySelector('.wgB').textContent = s.on ? '❚❚' : '▶';
  }, corre(){ return lee('wCron', { on: false }).on; }},

  /* ── 9 · TEMPORIZADOR ──
     Guarda el INSTANTE en que vence, no los segundos que faltan: guardando los
     segundos, apagar la pantalla congela la cuenta. */
  temporizador: { alto: 92, vivo: true, arma(e){
    e.appendChild(wEl('wgCron', '00:00'));
    const b = wEl('wgBtns');
    const m1 = wEl('wgB', '+1'), m5 = wEl('wgB', '+5'), z = wEl('wgB', '↺');
    const suma = n => {
      const s = lee('wTemp', 0);
      guarda('wTemp', Math.max(Date.now(), s) + n*60000); widRitmo();
    };
    m1.onclick = () => suma(1); m5.onclick = () => suma(5);
    z.onclick = () => { guarda('wTemp', 0); widRitmo(); };
    b.appendChild(m1); b.appendChild(m5); b.appendChild(z); e.appendChild(b);
  }, pinta(e){
    const fin = lee('wTemp', 0);
    const q = Math.max(0, Math.round((fin - Date.now())/1000));
    e.children[0].textContent = w2(Math.floor(q/60)) + ':' + w2(q % 60);
    e.children[0].classList.toggle('wgAlarma', fin > 0 && q === 0);
  }, corre(){ return lee('wTemp', 0) > Date.now(); }},

  /* ── 10 · CONTADOR ── */
  contador: { alto: 92, vivo: false, arma(e){
    e.appendChild(wEl('wgCron', '0'));
    const b = wEl('wgBtns');
    const mas = wEl('wgB', '＋'), men = wEl('wgB', '−'), z = wEl('wgB', '↺');
    const pon = n => { guarda('wCuenta', n); widPinta(); vibra(8); };
    mas.onclick = () => pon(lee('wCuenta', 0) + 1);
    men.onclick = () => pon(Math.max(0, lee('wCuenta', 0) - 1));
    z.onclick = () => pon(0);
    b.appendChild(men); b.appendChild(mas); b.appendChild(z); e.appendChild(b);
  }, pinta(e){ e.children[0].textContent = lee('wCuenta', 0); }},

  /* ── 11 · LA NOTA ──
     Es un `textarea` y no un div editable: un div editable pega HTML al copiar
     de otro lado y hay que limpiarlo. */
  nota: { alto: 112, vivo: false, arma(e){
    const t = document.createElement('textarea');
    t.className = 'wgNota'; t.maxLength = 400;
    t.value = lee('wNota', '');
    t.addEventListener('input', () => guarda('wNota', t.value));
    e.appendChild(t);
  }, pinta(e){
    const t = e.querySelector('.wgNota');
    t.placeholder = T('wNotaPh');
    /* no se le pisa el valor: escribiendo, cada pintada le movería el cursor */
  }},

  /* ── 12 · LA FRASE ──
     Sale del día del año, no de `Math.random`: al azar cambiaría en cada pintada
     y una frase que cambia cada segundo no es una frase del día. */
  frase: { alto: 92, vivo: false, arma(e){ e.appendChild(wEl('wgFrase', '—')); },
  pinta(e){
    const d = new Date();
    const dia = Math.floor((d - new Date(d.getFullYear(), 0, 0))/86400000);
    const f = W_FRASES[dia % W_FRASES.length];
    e.children[0].textContent = '“' + f[LANG === 'en' ? 1 : LANG === 'pt' ? 2 : 0] + '”';
  }},

  /* ── 13 · CUENTA DE DÍAS ── */
  cuenta: { alto: 96, vivo: false, arma(e){
    e.appendChild(wEl('wgDias', '—'));
    const c = wEl('wgFCol');
    c.appendChild(wEl('wgFSem', '—'));
    const i = document.createElement('input');
    i.type = 'date'; i.className = 'wgFecha';
    i.value = lee('wMeta', '');
    i.addEventListener('change', () => { guarda('wMeta', i.value); widPinta(); });
    c.appendChild(i);
    e.appendChild(c);
  }, pinta(e){
    const v = lee('wMeta', '');
    if (!v){ e.children[0].textContent = '—'; e.children[1].children[0].textContent = T('wPone'); return; }
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const m = new Date(v + 'T00:00:00');
    const n = Math.round((m - hoy)/86400000);
    e.children[0].textContent = Math.abs(n);
    e.children[1].children[0].textContent = n === 0 ? T('wHoy') : n > 0 ? T('wFaltan') : T('wPasaron');
  }},

  /* ── 14 · LA LUNA ──
     La fase sale de los días desde una luna nueva conocida dividido el mes
     sinódico (29,530588853 días). No hace falta ni red ni tabla. */
  luna: { alto: 116, vivo: false, arma(e){
    const s = wSvg('svg', { viewBox: '0 0 100 100', class: 'wgLuna' });
    s.appendChild(wSvg('circle', { cx: 50, cy: 50, r: 40, class: 'wgLunaB' }));
    /* ── SE DIBUJA LA PARTE ILUMINADA, NO LA SOMBRA ──
       La sombra pide acertar dos banderas de barrido de SVG que cambian de signo
       en el cuarto creciente y en el menguante: cuatro casos y tres de ellos se
       ven mal antes de encontrar el bueno. La iluminada es una sola fórmula, y
       el cuarto menguante sale de ESPEJARLA — un atributo, y no se puede
       equivocar. */
    const g = wSvg('g', { class: 'wgLunaG' });
    g.appendChild(wSvg('path', { d: '', class: 'wgLunaL' }));
    s.appendChild(g);
    e.appendChild(s);
    const c = wEl('wgFCol');
    c.appendChild(wEl('wgFSem', '—')); c.appendChild(wEl('wgFMes', '—'));
    e.appendChild(c);
  }, pinta(e){
    const SIN = 29.530588853;
    const nueva = Date.UTC(2000, 0, 6, 18, 14);      /* luna nueva del 6/1/2000 */
    /* `LUNA_F` sólo lo escribe la sonda: la forma es lo único de este widget que
       no se puede comprobar con un número, y esperar una semana no es medir */
    const f = LUNA_F >= 0 ? LUNA_F
                          : (((Date.now() - nueva)/86400000) % SIN + SIN) % SIN / SIN;
    const c = Math.cos(f*2*Math.PI);          /* +1 nueva · 0 cuartos · −1 llena */
    const ilum = (1 - c)/2;                   /* la fracción que se ve encendida */
    /* creciente: media luna derecha, y el terminador es media elipse de semieje
       40·|c| que se abomba a la derecha con c>0 y a la izquierda con c<0 */
    e.querySelector('.wgLunaL').setAttribute('d',
      'M50 10 A40 40 0 0 1 50 90 A' + (Math.abs(c)*40).toFixed(2) + ' 40 0 0 '
      + (c > 0 ? 0 : 1) + ' 50 10 Z');
    /* menguante: la misma figura espejada, que es lo que es */
    e.querySelector('.wgLunaG').setAttribute('transform',
      f < .5 ? '' : 'translate(100,0) scale(-1,1)');
    const nom = ['wLunaNueva', 'wLunaCre', 'wLunaCuartoC', 'wLunaGibC', 'wLunaLlena',
                 'wLunaGibM', 'wLunaCuartoM', 'wLunaMen'];
    e.querySelector('.wgFSem').textContent = T(nom[Math.round(f*8) % 8]);
    /* el número es CUÁNTO SE VE ENCENDIDO y no en qué punto del ciclo va:
       «menguante 83 %» al lado de una uña se lee a error */
    e.querySelector('.wgFMes').textContent = Math.round(ilum*100) + '%';
  }},

  /* ── 15 · EL NIVEL ──
     El único que lee un sensor, y por eso es el único que puede decir «no hay».
     `deviceorientation` se registra sin error en una notebook y no dispara
     nunca: hay que comprobar que llegue algo, no que se haya podido registrar. */
  nivel: { alto: 124, vivo: false, arma(e){
    const s = wSvg('svg', { viewBox: '0 0 100 100', class: 'wgNivel' });
    s.appendChild(wSvg('circle', { cx: 50, cy: 50, r: 44, class: 'wgNivAro' }));
    s.appendChild(wSvg('circle', { cx: 50, cy: 50, r: 14, class: 'wgNivAro' }));
    s.appendChild(wSvg('line', { x1: 50, y1: 6, x2: 50, y2: 94, class: 'wgNivCruz' }));
    s.appendChild(wSvg('line', { x1: 6, y1: 50, x2: 94, y2: 50, class: 'wgNivCruz' }));
    s.appendChild(wSvg('circle', { cx: 50, cy: 50, r: 9, class: 'wgNivBur' }));
    e.appendChild(s);
    const c = wEl('wgFCol');
    c.appendChild(wEl('wgFSem', '—')); c.appendChild(wEl('wgFMes', '—'));
    e.appendChild(c);
    nivPide();
  }, pinta(e){
    const b = e.querySelector('.wgNivBur');
    const x = cl(NIV.g/45, -1, 1), y = cl(NIV.b/45, -1, 1);
    b.setAttribute('cx', 50 + x*35); b.setAttribute('cy', 50 + y*35);
    const plano = Math.hypot(NIV.g, NIV.b) < 1.2;
    b.classList.toggle('plano', NIV.hay && plano);
    e.querySelector('.wgFSem').textContent =
      !NIV.hay ? T('wSinSensor') : plano ? T('wPlano') : Math.round(NIV.g) + '° / ' + Math.round(NIV.b) + '°';
    e.querySelector('.wgFMes').textContent = T('wNivel');
  }},

  /* ── 16 · ATAJOS ──
     Las cuatro primeras del dock, que es lo que el dueño ya eligió: pedirle que
     elija otras cuatro es pedirle que arme el dock dos veces. */
  atajos: { alto: 96, vivo: false, arma(e){ e.appendChild(wEl('wgAtajos')); },
  pinta(e){
    const r = e.children[0]; r.textContent = '';
    for (const p of DOCK.slice(0, 4)){
      const a = esCarpeta(p) ? itemApps(p)[0] : POR_PKG[p];
      if (!a) continue;
      const d = nodoApp(a, false);
      d.onclick = () => abreZoom(a.p, d);
      r.appendChild(d);
    }
  }},

  /* ── 17 · TAREAS ──
     Acá había un widget de BUSCAR y se sacó mirando la captura: el escritorio ya
     tiene una barra de búsqueda diez píxeles más abajo, así que eran dos barras
     idénticas apiladas. Un widget que repite lo que está justo debajo no es un
     widget, es una fila de más.
     Cuatro renglones y no una lista sin fin: en 120 px no entran más, y una
     lista con scroll adentro de un widget pelea con el gesto de pasar de página. */
  tareas: { alto: 132, vivo: false, arma(e){
    const c = wEl('wgTar');
    for (let i = 0; i < 4; i++){
      const f = wEl('wgTarF');
      const b = wEl('wgTarB');
      const t = document.createElement('input');
      t.className = 'wgTarT'; t.maxLength = 40;
      b.onclick = () => {
        const l = lee('wTareas', [{}, {}, {}, {}]);
        l[i] = l[i] || {};
        /* tildar dos veces la BORRA: es lo que uno hace con una tarea hecha, y
           así no hace falta un botón de basura por renglón */
        if (l[i].ok){ l[i] = { t: '', ok: false }; } else l[i].ok = !!l[i].t;
        guarda('wTareas', l); widPinta(); vibra(8);
      };
      t.addEventListener('input', () => {
        const l = lee('wTareas', [{}, {}, {}, {}]);
        l[i] = { t: t.value, ok: false };
        guarda('wTareas', l);
        f.classList.remove('ok');
      });
      f.appendChild(b); f.appendChild(t);
      c.appendChild(f);
    }
    e.appendChild(c);
  }, pinta(e){
    const l = lee('wTareas', [{}, {}, {}, {}]);
    const fs = e.querySelectorAll('.wgTarF');
    for (let i = 0; i < 4; i++){
      const x = l[i] || {};
      fs[i].classList.toggle('ok', !!x.ok);
      const t = fs[i].querySelector('.wgTarT');
      /* no se le pisa el valor mientras se escribe: cada pintada movería el
         cursor al final */
      if (document.activeElement !== t) t.value = x.t || '';
      t.placeholder = i === 0 ? T('wTareaPh') : '';
    }
  }},

  /* ── 18 · EL DADO ── */
  /* ── 18 · EL DADO ──
     Dibujado y no con los glifos ⚀-⚅: una tipografía de sistema puede no
     tenerlos y entonces salen seis cuadraditos con un signo de pregunta. Medido
     en el banco: el ⚀ se veía como una caja con un punto. */
  dado: { alto: 104, vivo: false, arma(e){
    const s = wSvg('svg', { viewBox: '0 0 100 100', class: 'wgDado' });
    s.appendChild(wSvg('rect', { x: 8, y: 8, width: 84, height: 84, rx: 20, class: 'wgDadoC' }));
    for (let i = 0; i < 7; i++)
      s.appendChild(wSvg('circle', { r: 8.5, class: 'wgDadoP' }));
    s.onclick = () => { guarda('wDado', 1 + Math.floor(Math.random()*6)); widPinta(); vibra(14); };
    e.appendChild(s);
    e.appendChild(wEl('wgDadoT', '—'));
  }, pinta(e){
    const n = lee('wDado', 1);
    /* los siete sitios de un dado, y qué se enciende con cada número */
    const P = [[28, 28], [72, 28], [28, 50], [72, 50], [28, 72], [72, 72], [50, 50]];
    const CUAL = [[6], [0, 5], [0, 6, 5], [0, 1, 4, 5], [0, 1, 6, 4, 5], [0, 1, 2, 3, 4, 5]];
    const ps = e.querySelectorAll('.wgDadoP');
    const on = CUAL[n - 1];
    for (let i = 0; i < 7; i++){
      ps[i].setAttribute('cx', P[i][0]); ps[i].setAttribute('cy', P[i][1]);
      ps[i].style.opacity = on.indexOf(i) >= 0 ? 1 : 0;
    }
    e.children[1].textContent = T('wDado');
  }},

  /* ── 19 · TRES CIUDADES ──
     Con desplazamiento fijo respecto de UTC y no con zonas horarias: el horario
     de verano de tres ciudades es una tabla que envejece, y acá el widget es una
     referencia de un vistazo, no un reloj de vuelos. */
  mundo: { alto: 104, vivo: false, arma(e){
    const f = wEl('wgMundo');
    for (let i = 0; i < 3; i++){
      const c = wEl('wgMundoC');
      c.appendChild(wEl('wgMundoN', W_CIUDADES[i][0]));
      c.appendChild(wEl('wgMundoH', '—'));
      f.appendChild(c);
    }
    e.appendChild(f);
  }, pinta(e){
    const d = new Date(), u = d.getUTCHours()*60 + d.getUTCMinutes();
    const cs = e.querySelectorAll('.wgMundoC');
    for (let i = 0; i < 3; i++){
      const m = ((u + W_CIUDADES[i][1]*60) % 1440 + 1440) % 1440;
      cs[i].children[1].textContent = w2(Math.floor(m/60)) + ':' + w2(m % 60);
    }
  }},

  /* ── 20 · CUÁNTO VA DEL DÍA, DEL MES Y DEL AÑO ── */
  progreso: { alto: 100, vivo: false, arma(e){
    const c = wEl('wgProg');
    for (let i = 0; i < 3; i++){
      const f = wEl('wgProgF');
      f.appendChild(wEl('wgProgE', '—'));
      const b = wEl('wgProgB'); b.appendChild(wEl('wgProgL')); f.appendChild(b);
      f.appendChild(wEl('wgProgN', '—'));
      c.appendChild(f);
    }
    e.appendChild(c);
  }, pinta(e){
    const d = new Date();
    const dia = (d.getHours()*3600 + d.getMinutes()*60 + d.getSeconds())/86400;
    const dm = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    const mes = (d.getDate() - 1 + dia)/dm;
    const a0 = new Date(d.getFullYear(), 0, 1), a1 = new Date(d.getFullYear() + 1, 0, 1);
    const anio = (d - a0)/(a1 - a0);
    const v = [dia, mes, anio], et = ['wDia', 'wMes', 'wAnio'];
    const fs = e.querySelectorAll('.wgProgF');
    for (let i = 0; i < 3; i++){
      fs[i].children[0].textContent = T(et[i]);
      fs[i].children[1].children[0].style.width = (v[i]*100).toFixed(1) + '%';
      fs[i].children[2].textContent = Math.round(v[i]*100) + '%';
    }
  }},
};

/* el orden en el que se ofrecen: primero los que más gente pone */
const WID_ORDEN = ['reloj', 'horaGrande', 'analogico', 'fecha', 'semana', 'calendario',
                   'bateria', 'cronometro', 'temporizador', 'contador', 'nota', 'frase',
                   'cuenta', 'luna', 'nivel', 'atajos', 'tareas', 'dado', 'mundo',
                   'progreso'];

/* ══════════ EL NIVEL, QUE ES EL ÚNICO CON SENSOR ══════════ */
const NIV = { hay: false, g: 0, b: 0, pedido: false };
function nivPide(){
  if (NIV.pedido) return;
  NIV.pedido = true;
  const oye = ev => {
    if (ev.beta == null && ev.gamma == null) return;
    NIV.hay = true;
    /* filtrado: una mano nunca está quieta, y sin esto la burbuja tiembla */
    NIV.b += ((ev.beta || 0) - NIV.b)*.22;
    NIV.g += ((ev.gamma || 0) - NIV.g)*.22;
  };
  try {
    const D = window.DeviceOrientationEvent;
    if (D && typeof D.requestPermission === 'function')
      D.requestPermission().then(r => { if (r === 'granted') addEventListener('deviceorientation', oye); })
                           .catch(() => {});
    else addEventListener('deviceorientation', oye);
  } catch (e) {}
}

/* ══════════ ARMAR Y PINTAR ══════════ */

function widArma(){
  WID = widLee();
  const c = $('#wid');
  c.textContent = '';
  let n = 0;
  for (const k of WID){
    const W = WIDGETS[k];
    const d = document.createElement('div');
    d.className = 'vid refr wCard';
    /* la tarjeta nace después de `vidrioInit`, así que se registra ella */
    if (typeof vidrioPieza === 'function') vidrioPieza(d);
    d.dataset.k = k;
    d.style.minHeight = W.alto + 'px';
    d.style.setProperty('--i', n++);
    d.classList.add('entra');
    c.appendChild(d);
    W.arma(d);
  }
  widPinta();
  widRitmo();
}

function widPinta(){
  for (const d of $$('#wid .wCard')){
    const W = WIDGETS[d.dataset.k];
    if (W && W.pinta) { try { W.pinta(d); } catch (e) {} }
  }
  /* el de reloj se pinta con las funciones de siempre — con la ÚLTIMA lectura
     de batería y no pidiéndola de nuevo, que sería cruzar el puente diez veces
     por segundo con el cronómetro andando */
  if (WID.indexOf('reloj') >= 0){ pintaReloj(true); ponBateria(BAT_ULT); }
}

/* ── EL RITMO SALE DE LO QUE HAY PUESTO ──
   Sin ningún widget vivo no hay intervalo; con el cronómetro andando va a diez
   por segundo, que es lo que su propia resolución pide; con el segundero del
   analógico, a uno. */
function widRitmo(){
  let ms = 0;
  for (const k of WID){
    const W = WIDGETS[k];
    if (!W) continue;
    if (W.vivo && W.corre && W.corre()) ms = 100;
    else if ((k === 'analogico' || k === 'horaGrande' || k === 'progreso') && !ms) ms = 1000;
  }
  if (WID_T === ms) return;
  WID_T = ms;
  if (WID_INT) { clearInterval(WID_INT); WID_INT = 0; }
  if (ms) WID_INT = setInterval(widPinta, ms);
}

function widPone(lista){
  WID = lista.filter(k => WIDGETS[k]).slice(0, WID_MAX);
  guarda('widgets', WID);
  widArma();
  pintaInicio();     /* cambia el alto de `#hoja`, o sea cuántas filas entran */
}

function widInit(){ widArma(); }
