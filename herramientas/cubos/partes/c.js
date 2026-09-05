/* ══════════════════════ EL SONIDO ══════════════════════
   Todo procedural y sin un solo byte de archivo, y acá eso no es una limitación
   sino lo correcto: los dos sonidos que este juego dispara mil veces por
   partida son poner y sacar un bloque, y los dos son un golpe corto. Un clip
   grabado costaría kilobytes por algo que son cuatro osciladores, y encima
   repetido mil veces se aprende: el sintetizado se puede desafinar un poco cada
   vez y deja de sonar a la misma muestra.

   ── EL CONTEXTO DESPIERTA CON EL PRIMER GESTO, NO AL CARGAR ──
   Ningún navegador deja sonar nada antes de un gesto de verdad, y el primer
   gesto de este juego es el botón de idioma, no JUGAR. Va colgado del
   documento en captura: en cada botón habría que acordarse en los que hay y en
   el próximo que se agregue. */
let AC = null, MAE = null, CAMA = null, camaG = null, SON_ON = true;

function audioDespierta(){
  if (AC) { if (AC.state === 'suspended') AC.resume(); return AC; }
  try { AC = new (window.AudioContext || window.webkitAudioContext)(); }
  catch (e){ AC = null; return null; }
  MAE = AC.createGain(); MAE.gain.value = 0.9; MAE.connect(AC.destination);
  return AC;
}
function ruidoBuf(seg){
  const n = Math.max(1, Math.floor(AC.sampleRate*seg));
  const b = AC.createBuffer(1, n, AC.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random()*2 - 1;
  return b;
}
let BUF_RUIDO = null;

/* ── UN GOLPE DE BLOQUE SON DOS COSAS ──
   El cuerpo (un oscilador grave que cae) y el grano (ruido filtrado corto). Con
   sólo el oscilador suena a bip de arcade; con sólo el ruido, a estática. */
function golpe(f0, f1, dur, vol, q, tipo){
  if (!AC || !SON_ON) return;
  const t = AC.currentTime;
  const o = AC.createOscillator(); o.type = tipo || 'triangle';
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
  const g = AC.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
  o.connect(g); g.connect(MAE); o.start(t); o.stop(t + dur + 0.02);

  if (!BUF_RUIDO) BUF_RUIDO = ruidoBuf(0.25);
  const s = AC.createBufferSource(); s.buffer = BUF_RUIDO;
  const bp = AC.createBiquadFilter(); bp.type = 'bandpass';
  bp.frequency.value = f0*1.8; bp.Q.value = q || 1.1;
  const g2 = AC.createGain();
  g2.gain.setValueAtTime(vol*0.55, t);
  g2.gain.exponentialRampToValueAtTime(0.0006, t + dur*0.6);
  s.connect(bp); bp.connect(g2); g2.connect(MAE);
  s.start(t); s.stop(t + dur);
}

/* la afinación se mueve un poco en cada golpe: mil golpes idénticos se
   escuchan a mil copias del mismo archivo, que es justo lo que se quería evitar */
function tono(k){ return 1 + (Math.random() - 0.5)*k; }

function son(que){
  if (!AC || !SON_ON) return false;
  if (que === 'pon')    golpe(240*tono(0.14), 130, 0.09, 0.22, 1.4);
  else if (que === 'sac') golpe(150*tono(0.16), 70,  0.13, 0.24, 0.8);
  else if (que === 'nada') golpe(90, 70, 0.06, 0.07, 0.6, 'sine');
  else if (que === 'ui')   golpe(520*tono(0.05), 480, 0.05, 0.13, 3.0, 'sine');
  else if (que === 'pal')  golpe(700, 900, 0.07, 0.11, 4.0, 'sine');
  else if (que === 'reloj') golpe(880, 880, 0.10, 0.16, 6.0, 'square');
  else if (que === 'fin'){
    /* la fanfarria es lo más fuerte del juego y tiene que serlo: es el único
       momento en que el juego habla más fuerte que el jugador */
    const t = AC.currentTime;
    [0, 4, 7, 12].forEach((s, i) => {
      const o = AC.createOscillator(); o.type = 'triangle';
      o.frequency.value = 261.6*Math.pow(2, s/12);
      const g = AC.createGain();
      g.gain.setValueAtTime(0, t + i*0.10);
      g.gain.linearRampToValueAtTime(0.20, t + i*0.10 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0008, t + i*0.10 + 0.55);
      o.connect(g); g.connect(MAE); o.start(t + i*0.10); o.stop(t + i*0.10 + 0.6);
    });
  }
  else return false;
  return true;
}

/* ══════════ LA CAMA ══════════
   Tres osciladores desafinados un pelo entre sí, con un pasabajos que se abre y
   se cierra cada veintitrés segundos. El desajuste minúsculo es todo el truco:
   dos senos idénticos suenan a tono de prueba y dos que baten cada pocos
   segundos suenan a instrumento. Va MUY por debajo del golpe de un bloque —el
   sonido que importa acá es el que dice que el bloque entró. */
function camaOn(v){
  if (!AC) return;
  if (v && !CAMA){
    CAMA = [];
    camaG = AC.createGain(); camaG.gain.value = 0.0;
    const lp = AC.createBiquadFilter(); lp.type = 'lowpass';
    lp.frequency.value = 520; lp.Q.value = 0.7;
    const lfo = AC.createOscillator(); lfo.frequency.value = 1/23;
    const lg = AC.createGain(); lg.gain.value = 260;
    lfo.connect(lg); lg.connect(lp.frequency); lfo.start();
    camaG.connect(lp); lp.connect(MAE);
    for (const [f, d] of [[110, 0], [164.8, 0.0023], [220, -0.0019]]){
      const o = AC.createOscillator(); o.type = 'sine';
      o.frequency.value = f*(1 + d);
      const g = AC.createGain(); g.gain.value = 0.33;
      o.connect(g); g.connect(camaG); o.start();
      CAMA.push(o);
    }
    CAMA.push(lfo);
  }
  if (camaG){
    const t = AC.currentTime;
    camaG.gain.cancelScheduledValues(t);
    camaG.gain.setValueAtTime(camaG.gain.value, t);
    /* ── LA CAMA VA BIEN POR DEBAJO DEL GOLPE DE UN BLOQUE ──
       Medido con el analizador colgado del maestro, a 0.055 la cama daba rms
       0.019 contra 0.023 de poner un bloque: en este juego se pone un bloque
       trescientas veces por ronda y ese golpe es el acuse de recibo. */
    camaG.gain.linearRampToValueAtTime(v && SON_ON ? 0.030 : 0.0, t + 1.1);
  }
}
function sonidoOn(v){ SON_ON = !!v; if (MAE) MAE.gain.value = SON_ON ? 0.9 : 0; return SON_ON; }
