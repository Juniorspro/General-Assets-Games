/* ══════════════════════ EL OÍDO ══════════════════════
   Lo que convierte una voz en un patrón. Dos cosas distintas y separadas:

   ── LOS GOLPES: FLUJO ESPECTRAL CON UMBRAL QUE SE MUEVE ──
   Un golpe no es «se puso fuerte»: es que la energía SUBIÓ de golpe repartida en
   muchas frecuencias. Se mide la suma de los aumentos por banda entre un cuadro
   y el anterior, y se dispara cuando eso pasa por encima de la mediana reciente
   por un factor. El umbral tiene que moverse porque nadie canta al mismo volumen
   los cuatro compases, y porque el micrófono de cada teléfono tiene otro piso.

   ── EL TONO: YIN, QUE NO SE ENGANCHA EN LA OCTAVA ──
   La autocorrelación pura elige el período doble cada tanto —ya costó una vuelta
   horneando las muestras— y en una voz eso hace que la melodía salte una octava
   a mitad de una nota sostenida. La diferencia media acumulada normalizada del
   YIN existe justamente para eso.

   ── Y TODO ESTO NO TOCA NI EL DOM NI EL RELOJ DEL JUEGO ──
   Entra un nodo de audio y sale un objeto por cuadro. Por eso se puede auditar
   metiéndole la batería del propio juego por la entrada: si el oído no distingue
   los tres sonidos que el juego sabe hacer, no va a distinguir los de una boca. */

let ANA_E = null, ANA_T = null, ENT = null;
let ESP = null, ESP_ANT = null, ONDA = null, DEC = null;
/* ── LA HISTORIA VA EN SEGUNDOS, NO EN CUADROS ──
   Con una ventana de 48 cuadros, un teléfono a 60 recuerda 0,8 s y uno a 30
   recuerda 1,6 — o sea que el umbral cambia con los fps, que es lo último que
   tiene que pasar. Y a 96 BPM un golpe cae cada 156 ms: en 1,6 s entran diez, y
   entonces la mediana deja de medir el fondo y pasa a medir los propios golpes.
   Medido: entre el primer bombo y la primera caja el umbral saltaba de 0,55 a
   2,02 y los golpes siguientes dejaban de detectarse. */
let FLUJO = [];
const FL_SEG = 0.70;
let PISO = 0.0025, CAL_T = 0, SENS = 1;
let T_ULT = -9, T_ANT = -9, ULT = null;
/* ── LAS CONSTANTES DE TIEMPO VAN EN SEGUNDOS, NO EN CUADROS ──
   Es el mismo defecto que la historia del flujo y pega más fuerte: con la
   calibración contada en cuadros, a 60 fps dura 0,7 s y termina antes del primer
   golpe, y a 30 dura 1,4 y el golpe cae ADENTRO — o sea que el piso se calibra
   con el golpe puesto y después ese piso lo tapa. Medido en la traza: el umbral
   saltaba de 0,20 a 0,89 en el mismo cuadro del ataque, y 0,69 de esos venían
   del término del piso. */
const CAL_SEG = 0.60, PISO_TAU = 0.09, PISO_TAU_L = 4.0;

const OIDO_DEAD = 0.055;              /* dos golpes de boca no caen a menos de esto */
const DEC_F = 4;                      /* diezmado para el tono: 44,1k -> 11,025k */
const F_MIN = 70, F_MAX = 1100;       /* la voz cantada, con margen */
/* cada cuánto se mira el micrófono. Vive acá y no en el bucle porque la
   cuantización de la melodía necesita saber cuántas lecturas caben en un paso */
const OIDO_MS = 16;

function oidoInit(nodo){
  if (!AC) return false;
  /* ── DOS ANALIZADORES, Y EL SUAVIZADO EN CERO ──
     `smoothingTimeConstant` viene en 0,8: promedia con el cuadro anterior, que
     es exactamente lo que borra un transitorio. Con eso puesto no hay golpe que
     detectar. Y el espectro va corto (23 ms) porque una ventana larga desparrama
     el ataque, mientras que el tono necesita una larga para ver un período de
     70 Hz: son dos ventanas distintas, no una de compromiso. */
  ANA_E = AC.createAnalyser(); ANA_E.fftSize = 1024; ANA_E.smoothingTimeConstant = 0;
  ANA_E.minDecibels = -100; ANA_E.maxDecibels = -10;
  ANA_T = AC.createAnalyser(); ANA_T.fftSize = 2048; ANA_T.smoothingTimeConstant = 0;
  ESP = new Float32Array(ANA_E.frequencyBinCount);
  ESP_ANT = new Float32Array(ANA_E.frequencyBinCount);
  ONDA = new Float32Array(ANA_T.fftSize);
  DEC = new Float32Array(Math.floor(ANA_T.fftSize/DEC_F));
  oidoEntrada(nodo);
  oidoCalibra();
  return true;
}
function oidoEntrada(nodo){
  if (ENT){ try { ENT.disconnect(ANA_E); ENT.disconnect(ANA_T); } catch (e) {} }
  ENT = nodo || null;
  if (ENT && ANA_E){ ENT.connect(ANA_E); ENT.connect(ANA_T); }
}
function oidoCalibra(){ CAL_T = (AC ? AC.currentTime : 0) + CAL_SEG; PISO = 0.0025; FLUJO = []; T_ANT = -9; ESP_ANT.fill(-100); }
function oidoSens(v){ SENS = cl(v, 0.35, 3); return SENS; }
function oidoListo(){ return !!ANA_E; }

/* ── LAS TRES BANDAS SON LO QUE SEPARA UN «BOM» DE UN «TSS» ── */
const B_G = [40, 260], B_M = [260, 2200], B_A = [2200, 12000];
function sumaBanda(a, b, hzPorBin){
  let s = 0;
  const i0 = Math.max(1, Math.floor(a/hzPorBin)), i1 = Math.min(ESP.length - 1, Math.ceil(b/hzPorBin));
  for (let i = i0; i <= i1; i++) s += Math.pow(10, ESP[i]/20);
  return s;
}

/* ── LA CLASE SALE DE LA FORMA DEL ESPECTRO, NO DEL VOLUMEN ──
   Las proporciones se normalizan a uno, así que gritar más fuerte no cambia de
   qué golpe se trata — que es lo que pasaría comparando energías absolutas. */
/* Los tres umbrales salen de medir la batería del propio juego, que es lo único
   que se puede medir sin una persona: bombo G 0,77 · A 0,04 — caja G 0,18 ·
   A 0,49 — charles G 0,00 · A 0,99. La caja es justamente la que no tiene un
   extremo propio, así que es lo que queda cuando no es ninguna de las otras dos. */
function clasifica(G, M, A){
  if (G >= 0.38) return 'bombo';
  if (A >= 0.72) return 'charles';
  return 'caja';
}

/* ── YIN ──
   `d[tau]` es cuánto se parece la onda a sí misma corrida tau muestras, y la
   media acumulada normalizada castiga los tau chicos, que es lo que impide que
   elija el armónico. La ventana va diezmada por cuatro: el fundamental de una
   voz no pasa de 1,1 kHz, así que 11 kHz de muestreo sobra y la cuenta cuesta
   dieciséis veces menos. */
function yin(x, sr, umbral){
  const tMin = Math.max(2, Math.floor(sr/F_MAX)), tMax = Math.min(x.length - 2, Math.floor(sr/F_MIN));
  if (tMax <= tMin) return null;
  const n = x.length - tMax;
  if (n < 32) return null;
  const d = new Float32Array(tMax + 1);
  for (let tau = 1; tau <= tMax; tau++){
    let s = 0;
    for (let j = 0; j < n; j++){ const q = x[j] - x[j + tau]; s += q*q; }
    d[tau] = s;
  }
  let run = 0, mejor = -1, mejorV = 1e9;
  const dp = new Float32Array(tMax + 1);
  for (let tau = 1; tau <= tMax; tau++){
    run += d[tau];
    dp[tau] = run > 0 ? d[tau]*tau/run : 1;
    if (tau >= tMin){
      if (dp[tau] < mejorV){ mejorV = dp[tau]; mejor = tau; }
      /* ── EL PRIMER MÍNIMO BAJO EL UMBRAL, Y SE LO RECONOCE MIRANDO HACIA ATRÁS ──
         Ésta es la mitad del algoritmo: el mínimo MÁS PROFUNDO suele ser un
         múltiplo del período, porque un período que no cae en un número entero
         de muestras —12,53 a 11 kHz— tiene su doble cayendo casi exacto en 25, y
         ahí la diferencia da menos. Medido con armónicos: el fundamental de un MI4
         daba dp 0,006 y su octava abajo 0,000.
         Y hay que mirar `dp[tau-1]`, no `dp[tau+1]`: en esta iteración el de
         adelante TODAVÍA NO SE CALCULÓ y vale cero, así que `0 >= dp[tau]` es
         siempre falso y el corte no ocurre nunca — el YIN se degrada a la
         autocorrelación que venía a reemplazar. Medido: 8 de 13 notas con saltos
         de hasta 3369 cents mirando adelante, 13 de 13 dentro de 2 cents mirando
         atrás, y con 15 % de ruido encima. */
      if (tau > tMin && dp[tau - 1] < umbral && dp[tau] >= dp[tau - 1]){ mejor = tau - 1; mejorV = dp[tau - 1]; break; }
    }
  }
  if (mejor < 0) return null;
  /* interpolación parabólica: sin ella el tono se cuantiza al período entero y
     a 800 Hz eso son casi dos semitonos de error */
  let t = mejor;
  if (mejor > 1 && mejor < tMax){
    const a = dp[mejor - 1], b = dp[mejor], c = dp[mejor + 1], den = a - 2*b + c;
    if (Math.abs(den) > 1e-9) t = mejor + 0.5*(a - c)/den;
  }
  const f = sr/t;
  if (!(f > F_MIN*0.9 && f < F_MAX*1.1)) return null;
  return { f, claridad: cl(1 - mejorV, 0, 1) };
}

/* ══════════ UN CUADRO ══════════ */
function oidoCuadro(t){
  if (!ANA_E) return null;
  ANA_E.getFloatFrequencyData(ESP);
  ANA_T.getFloatTimeDomainData(ONDA);

  let s2 = 0;
  for (let i = 0; i < ONDA.length; i++) s2 += ONDA[i]*ONDA[i];
  const rms = Math.sqrt(s2/ONDA.length);

  const hz = AC.sampleRate/ANA_E.fftSize;
  let flujo = 0;
  for (let i = 2; i < ESP.length; i++){
    const q = Math.pow(10, ESP[i]/20) - Math.pow(10, ESP_ANT[i]/20);
    if (q > 0) flujo += q;
  }
  ESP_ANT.set(ESP);

  /* el piso se mide al empezar y después se sigue corrigiendo DESPACIO y sólo
     mientras hay silencio: si siguiera también mientras se canta, cantar mucho
     rato dejaría el oído sordo. Los dos suavizados van por constante de tiempo,
     así que valen lo mismo a cualquier cantidad de cuadros por segundo. */
  const dt = (T_ANT < 0 || t <= T_ANT) ? 0.017 : Math.min(0.25, t - T_ANT);
  T_ANT = t;
  if (t < CAL_T) PISO = PISO + (rms - PISO)*(1 - Math.exp(-dt/PISO_TAU));
  else if (rms < PISO*2.2) PISO = PISO + (rms - PISO)*(1 - Math.exp(-dt/PISO_TAU_L));

  /* ── EL FONDO SE MIDE SOBRE LO QUE NO ES ATAQUE ──
     Un golpe y su cola son justamente lo que el umbral tiene que dejar pasar: si
     entran en la historia, la referencia sube y el golpe siguiente queda por
     debajo. A 60 cuadros un golpe ocupa cinco de cuarenta muestras y casi no se
     nota; a 30 ocupa cinco de veinte y el umbral se triplica. Medido: el umbral
     pasaba de 0,26 a 1,69 entre el primer golpe y el siguiente. */
  if (t - T_ULT > 0.13){
    FLUJO.push([t, flujo]);
    while (FLUJO.length && t - FLUJO[0][0] > FL_SEG) FLUJO.shift();
  }
  const h = FLUJO.map(q => q[1]).sort((a, b) => a - b);
  /* ── EL PERCENTIL 20, QUE ES UN MÍNIMO ROBUSTO ──
     La mediana supone que menos de la mitad de los cuadros son ataque, y eso es
     falso apenas los fps bajan: a 30 cuadros un golpe de 300 ms ocupa nueve de
     los veintiuno que entran en la ventana. Y ahí se arma un espiral, porque el
     golpe que no se detecta tampoco se excluye del fondo: el umbral sube, se
     detecta menos, sube más. Medido: a 30 cuadros el umbral trepaba a 1,66 y no
     bajaba nunca. El 20 % aguanta que ocho de cada diez cuadros sean ataque, y
     no es el mínimo absoluto —que lo movería un solo cuadro raro. */
  const med = h.length ? h[Math.floor(h.length*0.20)] : 0;
  /* el término constante se midió: los golpes de la batería del propio juego
     dan flujo de 0,26 a 0,87 con la ventana del analizador a 23 ms, y el más
     flojo de los tres es el BOMBO, que concentra su energía en dos bines. */
  const umbral = med*(1.85/SENS) + 0.20/SENS + PISO*24;

  let onset = false, tipo = null, G = 0, M = 0, A = 0;
  const fuerte = rms > Math.max(PISO*3.0, 0.006)/SENS;
  if (flujo > umbral && fuerte && FLUJO.length > 6 && t - T_ULT > OIDO_DEAD){
    const g = sumaBanda(B_G[0], B_G[1], hz), m = sumaBanda(B_M[0], B_M[1], hz), a = sumaBanda(B_A[0], B_A[1], hz);
    const tot = g + m + a || 1e-9;
    G = g/tot; M = m/tot; A = a/tot;
    tipo = clasifica(G, M, A);
    onset = true; T_ULT = t;
  }

  /* el tono sólo se busca si hay algo que oír: YIN sobre silencio devuelve el
     período del ruido del micrófono */
  let midi = null, claridad = 0, f0 = 0;
  if (rms > Math.max(PISO*2.6, 0.004)){
    for (let i = 0; i < DEC.length; i++){
      let q = 0; for (let k = 0; k < DEC_F; k++) q += ONDA[i*DEC_F + k];
      DEC[i] = q/DEC_F;
    }
    const r = yin(DEC, AC.sampleRate/DEC_F, 0.16);
    if (r && r.claridad > 0.55){ f0 = r.f; midi = 69 + 12*Math.log2(r.f/440); claridad = r.claridad; }
  }

  ULT = { t, rms, piso: PISO, flujo, umbral, onset, tipo, G, M, A, midi, f0, claridad };
  return ULT;
}
function oidoUlt(){ return ULT; }

/* ── PEGAR LA NOTA A UNA ESCALA ES UN CORRECTOR ──
   Nadie canta afinado a la primera; sin esto la melodía sale con las notas de al
   lado y no se parece a lo que uno tarareó. En «ninguna» se deja el semitono. */
function aEscala(midi, esc, tonica){
  const E = ESCALAS[cl(esc, 0, ESCALAS.length - 1)];
  const m = Math.round(midi);
  if (!E.g) return m;
  const oct = Math.floor((m - tonica)/12), r = ((m - tonica) % 12 + 12) % 12;
  let mej = E.g[0], d = 99;
  for (const g of E.g){ const q = Math.min(Math.abs(g - r), 12 - Math.abs(g - r)); if (q < d){ d = q; mej = g; } }
  /* el grado más cercano puede estar en la octava de arriba (r=11 contra g=0) */
  let cand = tonica + oct*12 + mej;
  for (const dd of [-12, 0, 12]) if (Math.abs(tonica + oct*12 + mej + dd - m) < Math.abs(cand - m)) cand = tonica + oct*12 + mej + dd;
  return cand;
}
