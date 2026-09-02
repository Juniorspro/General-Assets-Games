/* El sonido, sintetizado.
   ---------------------------------------------------------------------------
   En el juego original el bicho se ANUNCIA: primero los pasos, despues la
   respiracion, y recien despues lo ves. Esa es la mecanica, no un adorno: te
   da el tiempo de retirarte. Sin sonido, el bicho aparece de la nada y eso no
   asusta, enoja.

   Va sintetizado con WebAudio y no con archivos: cuatro sonidos en mp3 serian
   medio mega en un juego que entero pesa dos, y estos cuatro son ruido y
   envolventes — justo lo que un sintetizador hace bien.

   El navegador no deja sonar hasta que el usuario toca algo, asi que el
   contexto se despierta con el primer toque o tecla. */

let ctx = null, master = null;

/* El puente a la capa de muestras. Se llena desde afuera para no crear una
   dependencia circular: sonido.js no sabe que muestras.js existe. */
export const puente = { tocar: null, bucle: null };

/* El nodo del que cuelga todo. La capa de muestras necesita engancharse acá
   y no en el destino, para que el volumen general valga también para ella. */
export const salida = () => master;
export const contexto = () => ctx;

export function despertarAudio() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);
}

function ruido(dur, repetir) {
    const n = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const s = ctx.createBufferSource();
    s.buffer = buf;
    if (repetir) s.loop = true;      // para el viento, que no se corta
    return s;
}

/* El paso. NO es un pie: son las puas de acero de los zancos contra el piso,
   asi suena en el juego —un golpeteo metalico y ritmico, no un golpe sordo—.
   Sale de un golpe grave con un ping agudo encima, que es lo que hace la
   diferencia entre "algo camina" y "algo camina en zancos". */
/* El paso sobre ALFOMBRA. El análisis del audio del juego real lo describe
   así: "footsteps transition to muffled carpet thuds" al entrar a la casa. Lo
   que había era un golpe metálico con dos armónicos agudos — de otro juego.
   Una alfombra no suena: absorbe. Queda un golpe grave y sordo y nada más. */
export function paso(vol = 1) {
    if (ctx && puente.tocar && puente.tocar('paso', vol)) return;
    if (!ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(118, t);
    o.frequency.exponentialRampToValueAtTime(62, t + 0.06);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.30 * vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0004, t + 0.11);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + 0.13);
    // el roce de la fibra: ruido bajo y corto, nada de brillo
    const n = ruido(0.09), f = ctx.createBiquadFilter(), ng = ctx.createGain();
    f.type = 'lowpass'; f.frequency.value = 420; f.Q.value = 0.7;
    ng.gain.setValueAtTime(0.13 * vol, t);
    ng.gain.exponentialRampToValueAtTime(0.0004, t + 0.075);
    n.connect(f); f.connect(ng); ng.connect(master);
    n.start(t); n.stop(t + 0.09);
}

/* El paso sobre MADERA, para el cajón del arranque: "rapid rhythmic thumping
   of footsteps on wood". Mismo golpe pero más arriba y con el crujido. */
export function pasoMadera(vol = 1) {
    if (ctx && puente.tocar && puente.tocar('pasoMadera', vol)) return;
    if (!ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(240, t);
    o.frequency.exponentialRampToValueAtTime(96, t + 0.05);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.26 * vol, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0004, t + 0.10);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + 0.12);
    const n = ruido(0.07), f = ctx.createBiquadFilter(), ng = ctx.createGain();
    f.type = 'bandpass'; f.frequency.value = 1700; f.Q.value = 1.1;
    ng.gain.setValueAtTime(0.14 * vol, t);
    ng.gain.exponentialRampToValueAtTime(0.0004, t + 0.05);
    n.connect(f); f.connect(ng); ng.connect(master);
    n.start(t); n.stop(t + 0.07);
}

/* EL PASO CORRIENDO. No es el de caminar con mas volumen: el juego dispara uno
   cada 0,242 s contra los 0,370 s de caminar, asi que tiene que ser MAS CORTO
   ademas de mas duro. Con la muestra de caminar sonaba a zumbido continuo
   —0,40 s de sonido cada 0,24 s se apilan— y esa era la queja. */
export function correr(vol = 1) {
    if (ctx && puente.tocar && puente.tocar('correr', vol)) return;
    if (!ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(70, t + 0.04);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.34 * vol, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0004, t + 0.08);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + 0.09);
    const n = ruido(0.07), f = ctx.createBiquadFilter(), ng = ctx.createGain();
    f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 0.8;
    ng.gain.setValueAtTime(0.20 * vol, t);
    ng.gain.exponentialRampToValueAtTime(0.0004, t + 0.055);
    n.connect(f); f.connect(ng); ng.connect(master);
    n.start(t); n.stop(t + 0.07);
}

/* EL DESLIZAMIENTO DEL JUGADOR. No existia: la rama de deslizarse no llamaba a
   ningun sonido, asi que tirarse al piso era mudo. Dura lo que dura el
   deslizamiento (SLIDE_TIME = 0,85 s) y se dispara una sola vez al arrancar. */
export function deslizar() {
    if (ctx && puente.tocar && puente.tocar('deslizar', 1)) return;
    if (!ctx) return;
    const t = ctx.currentTime, dur = 0.8;
    const n = ruido(dur), f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'bandpass'; f.Q.value = 0.9;
    // el roce frena: el filtro baja igual que la velocidad del cuerpo
    f.frequency.setValueAtTime(1900, t);
    f.frequency.exponentialRampToValueAtTime(360, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.30, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0004, t + dur);
    n.connect(f); f.connect(g); g.connect(master);
    n.start(t); n.stop(t + dur);
}

/* La PISADA DEL BICHO: "heavy, slow footfalls from the creature". Pesada de
   verdad — mide tres metros y camina en zancos: golpe grave largo y un
   chasquido seco de la punta del zanco al apoyar. */
export function pisada(vol = 1) {
    if (ctx && puente.tocar && puente.tocar('pisada', vol)) return;
    if (!ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(84, t);
    o.frequency.exponentialRampToValueAtTime(38, t + 0.22);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.55 * vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0004, t + 0.34);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + 0.36);
    const n = ruido(0.10), f = ctx.createBiquadFilter(), ng = ctx.createGain();
    f.type = 'bandpass'; f.frequency.value = 2600; f.Q.value = 2.2;
    ng.gain.setValueAtTime(0.16 * vol, t);
    ng.gain.exponentialRampToValueAtTime(0.0004, t + 0.06);
    n.connect(f); f.connect(ng); ng.connect(master);
    n.start(t); n.stop(t + 0.1);
}

export function respiro(vol) {
    if (!ctx || vol <= 0.002) return;
    const t = ctx.currentTime;
    const n = ruido(0.55), f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'bandpass'; f.frequency.value = 520; f.Q.value = 0.7;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.18);
    g.gain.exponentialRampToValueAtTime(0.0005, t + 0.52);
    n.connect(f); f.connect(g); g.connect(master);
    n.start(t); n.stop(t + 0.55);
}

/* El latido. Es el ultimo aviso: si lo escuchas, ya estas en problemas. */
export function latido(vol) {
    if (!ctx || vol <= 0.002) return;
    const t = ctx.currentTime;
    for (const [dt, k] of [[0, 1], [0.17, 0.62]]) {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(66, t + dt);
        o.frequency.exponentialRampToValueAtTime(30, t + dt + 0.11);
        g.gain.setValueAtTime(vol * k, t + dt);
        g.gain.exponentialRampToValueAtTime(0.0005, t + dt + 0.16);
        o.connect(g); g.connect(master);
        o.start(t + dt); o.stop(t + dt + 0.18);
    }
}

/* EL SCREAMER: el grito de cuando te AGARRA, que no es el de cuando te ve.
   Antes la embestida reusaba `grito()` y el momento mas fuerte del juego sonaba
   igual que el aviso de veinte segundos antes. Este dura mas, empieza arriba y
   se rompe. Como toda la voz del bicho, sale por radio quebrada. */
export function screamer() {
    if (ctx && puente.tocar && puente.tocar('screamer', 1)) return;
    if (!ctx) return;
    const t = ctx.currentTime, dur = 1.6;
    const n = ruido(dur), f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'bandpass'; f.Q.value = 2.2;
    f.frequency.setValueAtTime(2600, t);
    f.frequency.setValueAtTime(2600, t + 0.7);
    f.frequency.exponentialRampToValueAtTime(520, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.5, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    n.connect(f); f.connect(g); g.connect(master);
    n.start(t); n.stop(t + dur);
    for (const [d, fr] of [[0, 380], [0.1, 610]]) {
        const o = ctx.createOscillator(), og = ctx.createGain();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(fr, t + d);
        o.frequency.exponentialRampToValueAtTime(fr * 0.42, t + dur);
        og.gain.setValueAtTime(0.11, t + d);
        og.gain.exponentialRampToValueAtTime(0.0004, t + dur);
        o.connect(og); og.connect(master);
        o.start(t + d); o.stop(t + dur);
    }
}

/* LA VOZ SUELTA: el bicho hablandose solo mientras camina. Se llama `vozBicho`
   y no `voz` porque `voz` ya es el ayudante de osciladores de mas abajo — dos
   declaraciones del mismo nombre y el modulo entero no compila. */
/* El bicho hablandose solo mientras camina. No es una alarma —
   suena aunque no sepa donde estas— y por eso va bajo y seguido. */
export function vozBicho(vol = 1) {
    if (ctx && puente.tocar && puente.tocar('voz', vol)) return;
    if (!ctx || vol <= 0.002) return;
    const t = ctx.currentTime, dur = 0.9;
    const n = ruido(dur), f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 1.6;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.16 * vol, t + 0.12);
    g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    n.connect(f); f.connect(g); g.connect(master);
    n.start(t); n.stop(t + dur);
}

/* El grito, cuando te ve. Ruido pasado por un filtro que barre hacia arriba,
   mas dos osciladores desafinados: eso es lo que hace que raspe. */
export function grito() {
    if (ctx && puente.tocar && puente.tocar('grito', 1)) return;
    if (!ctx) return;
    const t = ctx.currentTime;
    const n = ruido(1.1), f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'bandpass'; f.Q.value = 3.5;
    /* Un chillido tiene la energía ARRIBA. Medido, el de antes daba dominante
       en 298 Hz —o sea que sonaba a gruñido agudo, no a chillido— porque subía
       lento y se pasaba casi todo el tiempo abajo. Ahora sube en 0,12 s y se
       queda arriba media vuelta antes de caer. */
    f.frequency.setValueAtTime(700, t);
    f.frequency.exponentialRampToValueAtTime(3100, t + 0.12);
    f.frequency.setValueAtTime(3100, t + 0.5);
    f.frequency.exponentialRampToValueAtTime(420, t + 1.0);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.55, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0005, t + 1.05);
    n.connect(f); f.connect(g); g.connect(master);
    n.start(t); n.stop(t + 1.1);
    for (const d of [0, 7]) {
        const o = ctx.createOscillator(), og = ctx.createGain();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(320 + d, t);
        o.frequency.exponentialRampToValueAtTime(1180 + d * 6, t + 0.14);
        o.frequency.exponentialRampToValueAtTime(240, t + 0.95);
        og.gain.setValueAtTime(0.0001, t);
        og.gain.linearRampToValueAtTime(0.13, t + 0.06);
        og.gain.exponentialRampToValueAtTime(0.0005, t + 1.0);
        o.connect(og); og.connect(master);
        o.start(t); o.stop(t + 1.05);
    }
}

/* El golpe de la embestida. En el video, arriba del chillido hay un GOLPE
   seco y grave —como si te tirara al piso— y es la mitad del susto: el
   chillido solo se lee como un efecto, el golpe se lee como un cuerpo. */
export function golpe() {
    if (ctx && puente.tocar && puente.tocar('golpe', 1)) return;
    if (!ctx) return;
    const t = ctx.currentTime;
    // el cuerpo del golpe: un seno que se desploma de 150 a 34 Hz
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(34, t + 0.42);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.85, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0005, t + 0.55);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + 0.6);
    // y el chasquido de arriba, para que el golpe tenga borde
    const n = ruido(0.22), f = ctx.createBiquadFilter(), ng = ctx.createGain();
    f.type = 'lowpass'; f.frequency.setValueAtTime(2600, t);
    f.frequency.exponentialRampToValueAtTime(240, t + 0.20);
    ng.gain.setValueAtTime(0.5, t);
    ng.gain.exponentialRampToValueAtTime(0.0005, t + 0.24);
    n.connect(f); f.connect(ng); ng.connect(master);
    n.start(t); n.stop(t + 0.25);
}

/* El viento de la caída: ruido rosa filtrado que sube con la velocidad. Se
   enciende una vez y se apaga con el volumen, no creando y destruyendo nodos. */
let vientoNodo = null, vientoGan = null;
export function viento(v) {
    if (!ctx) return;
    if (!vientoNodo) {
        const n = ruido(4, true);
        const f = ctx.createBiquadFilter();
        f.type = 'bandpass'; f.Q.value = 0.7; f.frequency.value = 620;
        vientoGan = ctx.createGain();
        vientoGan.gain.value = 0.0001;
        n.connect(f); f.connect(vientoGan); vientoGan.connect(master);
        n.start(ctx.currentTime);
        vientoNodo = n;
    }
    const t = ctx.currentTime;
    vientoGan.gain.cancelScheduledValues(t);
    vientoGan.gain.setTargetAtTime(Math.max(0.0001, v * 0.34), t, 0.12);
}

/* ------------------------------------- lo que suena todo el tiempo */
/* EL COLCHÓN DE AMBIENTE. El análisis del audio real lo nombra dos veces:
   "ambient low-frequency drone" y "soft mechanical hum". Es lo que hace que
   la casa esté viva aunque no pase nada, y es justo lo que no teníamos: sin
   esto, entre dos pasos hay silencio digital y se nota que es un juego. */
let ambNodos = null, ambGan = null;
export function ambiente(v = 1) {
    if (!ctx) return;
    if (puente.bucle && puente.bucle('ambiente', v)) return;
    if (!ambNodos) {
        ambGan = ctx.createGain();
        ambGan.gain.value = 0.0001;
        ambGan.connect(master);
        ambNodos = [];
        // dos senos graves apenas desafinados: el batido lento es el "vivo"
        for (const f of [41, 41.7, 62]) {
            const o = ctx.createOscillator(), g = ctx.createGain();
            o.type = 'sine'; o.frequency.value = f;
            g.gain.value = f > 50 ? 0.22 : 0.5;
            o.connect(g); g.connect(ambGan);
            o.start();
            ambNodos.push(o);
        }
        // y el zumbido mecánico: ruido muy filtrado, arriba
        const n = ruido(4, true), fl = ctx.createBiquadFilter(), ng = ctx.createGain();
        fl.type = 'bandpass'; fl.frequency.value = 1150; fl.Q.value = 6;
        ng.gain.value = 0.05;
        n.connect(fl); fl.connect(ng); ng.connect(ambGan);
        n.start();
        ambNodos.push(n);
        // una respiración lenta del volumen, para que no sea una nota tenida
        const lfo = ctx.createOscillator(), lg = ctx.createGain();
        lfo.frequency.value = 0.07; lg.gain.value = 0.35;
        lfo.connect(lg); lg.connect(ambGan.gain);
        lfo.start();
        ambNodos.push(lfo);
    }
    ambGan.gain.setTargetAtTime(Math.max(0.0001, v * 0.09), ctx.currentTime, 1.5);
}

/* EL GRUÑIDO LEJANO: "a distant, distorted low-pitched groan". No es el
   chillido —ese es cuando te ve—: esto es lo que se oye cuando anda por ahí y
   todavía no sabe dónde estás. Grave, largo y distorsionado. */
export function gruñido(vol = 1) {
    if (ctx && puente.tocar && puente.tocar('gruñido', vol)) return;
    if (!ctx) return;
    const t = ctx.currentTime;
    const forma = ctx.createWaveShaper();
    const curva = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) {
        const x = i / 512 - 1;
        curva[i] = Math.tanh(x * 3.2);       // saturación: es lo "distorted"
    }
    forma.curve = curva;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.30 * vol, t + 0.35);
    g.gain.setValueAtTime(0.30 * vol, t + 0.9);
    g.gain.exponentialRampToValueAtTime(0.0004, t + 1.7);
    forma.connect(g); g.connect(master);
    for (const [f, d] of [[58, 0], [87, 0.5], [116, -1.5]]) {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(f + d, t);
        o.frequency.linearRampToValueAtTime(f * 0.72 + d, t + 1.6);
        const og = ctx.createGain();
        og.gain.value = f > 100 ? 0.18 : 0.45;
        o.connect(og); og.connect(forma);
        o.start(t); o.stop(t + 1.75);
    }
}

/* EL RASPAR DEL CUBO, continuo: "continuous sliding sound of the cube against
   the floor". Antes era un tic cada 55 cm y sonaba a pasos, no a arrastre.
   Ahora es un solo ruido filtrado cuyo volumen sigue al movimiento. */
let rasNodo = null, rasGan = null, rasFil = null;
export function raspar(v) {
    if (!ctx) return;
    if (!rasNodo) {
        rasNodo = ruido(4, true);
        rasFil = ctx.createBiquadFilter();
        rasFil.type = 'bandpass'; rasFil.Q.value = 1.4; rasFil.frequency.value = 900;
        rasGan = ctx.createGain();
        rasGan.gain.value = 0.0001;
        rasNodo.connect(rasFil); rasFil.connect(rasGan); rasGan.connect(master);
        rasNodo.start();
    }
    const t = ctx.currentTime;
    rasGan.gain.setTargetAtTime(Math.max(0.0001, v * 0.22), t, 0.06);
    // más rápido, más agudo: es lo que hace que se lea como roce y no como zumbido
    rasFil.frequency.setTargetAtTime(700 + v * 900, t, 0.1);
}

/* EL CAJÓN DE MADERA al revisar un mueble: "mechanical click sound. Sound of
   wooden drawers opening and closing". Son tres cosas: el clic del picaporte,
   el corredizo, y el golpe al cerrar. */
export function cajon() {
    if (ctx && puente.tocar && puente.tocar('cajon', 1)) return;
    if (!ctx) return;
    const t = ctx.currentTime;
    // clic del herraje
    const c = ruido(0.03), cf = ctx.createBiquadFilter(), cg = ctx.createGain();
    cf.type = 'highpass'; cf.frequency.value = 2600;
    cg.gain.setValueAtTime(0.22, t);
    cg.gain.exponentialRampToValueAtTime(0.0004, t + 0.03);
    c.connect(cf); cf.connect(cg); cg.connect(master);
    c.start(t); c.stop(t + 0.04);
    // el corredizo: ruido que se abre y se cierra
    const n = ruido(0.75), f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'bandpass'; f.Q.value = 1.1;
    f.frequency.setValueAtTime(520, t + 0.05);
    f.frequency.linearRampToValueAtTime(1250, t + 0.34);
    f.frequency.linearRampToValueAtTime(560, t + 0.62);
    g.gain.setValueAtTime(0.0001, t + 0.05);
    g.gain.linearRampToValueAtTime(0.15, t + 0.12);
    g.gain.linearRampToValueAtTime(0.10, t + 0.4);
    g.gain.exponentialRampToValueAtTime(0.0004, t + 0.66);
    n.connect(f); f.connect(g); g.connect(master);
    n.start(t + 0.05); n.stop(t + 0.8);
    // el golpe de cerrar
    const o = ctx.createOscillator(), og = ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(190, t + 0.62);
    o.frequency.exponentialRampToValueAtTime(72, t + 0.72);
    og.gain.setValueAtTime(0.0001, t + 0.62);
    og.gain.linearRampToValueAtTime(0.30, t + 0.63);
    og.gain.exponentialRampToValueAtTime(0.0004, t + 0.8);
    o.connect(og); og.connect(master);
    o.start(t + 0.62); o.stop(t + 0.82);
}

/* EL RISER de la corrida final: "accelerating footstep sounds. Intense
   cinematic riser sound effect" cuando el pasillo se abre a la salida. Un
   barrido que sube dos octavas y media en tres segundos. */
export function riser(dur = 3) {
    if (!ctx) return;
    if (puente.tocar && puente.tocar('riser', 1)) return;
    const t = ctx.currentTime;
    const n = ruido(dur + 0.3), f = ctx.createBiquadFilter(), g = ctx.createGain();
    /* Q baja y ganancia que sube fuerte: con Q alto, al barrer hacia agudos
       pasa cada vez menos energía y el riser se APAGA mientras sube. Medido:
       con Q=4 duraba 1,08 s de los 3 que tenía que durar. */
    f.type = 'bandpass'; f.Q.value = 1.6;
    f.frequency.setValueAtTime(180, t);
    f.frequency.exponentialRampToValueAtTime(5200, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.06, t + dur * 0.3);
    g.gain.linearRampToValueAtTime(0.42, t + dur * 0.97);
    g.gain.exponentialRampToValueAtTime(0.0004, t + dur + 0.25);
    n.connect(f); f.connect(g); g.connect(master);
    n.start(t); n.stop(t + dur + 0.3);
    const o = ctx.createOscillator(), og = ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(55, t);
    o.frequency.exponentialRampToValueAtTime(330, t + dur);
    og.gain.setValueAtTime(0.0001, t);
    og.gain.linearRampToValueAtTime(0.09, t + dur * 0.8);
    og.gain.exponentialRampToValueAtTime(0.0004, t + dur + 0.2);
    o.connect(og); og.connect(master);
    o.start(t); o.stop(t + dur + 0.25);
}

/* EL PORTAZO y la campana. El final del original es "loud slamming door
   sound. Sudden transition to silence, then a distant chime" — el silencio es
   parte del efecto, no un hueco. */
export function portazo() {
    if (ctx && puente.tocar && puente.tocar('portazo', 1)) return;
    if (!ctx) return;
    const t = ctx.currentTime;
    const n = ruido(0.5), f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'lowpass'; f.frequency.setValueAtTime(2400, t);
    f.frequency.exponentialRampToValueAtTime(180, t + 0.3);
    g.gain.setValueAtTime(0.85, t);
    g.gain.exponentialRampToValueAtTime(0.0004, t + 0.45);
    n.connect(f); f.connect(g); g.connect(master);
    n.start(t); n.stop(t + 0.5);
    const o = ctx.createOscillator(), og = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(120, t);
    o.frequency.exponentialRampToValueAtTime(31, t + 0.35);
    og.gain.setValueAtTime(0.9, t);
    og.gain.exponentialRampToValueAtTime(0.0004, t + 0.5);
    o.connect(og); og.connect(master);
    o.start(t); o.stop(t + 0.55);
}

export function campana() {
    if (ctx && puente.tocar && puente.tocar('campana', 1)) return;
    if (!ctx) return;
    const t = ctx.currentTime;
    // una campana lejana: parciales inarmónicos y una cola larga
    for (const [f, v] of [[523, 0.10], [1046, 0.05], [1570, 0.028], [2637, 0.014]]) {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(v, t + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0004, t + 3.2);
        o.connect(g); g.connect(master);
        o.start(t); o.stop(t + 3.3);
    }
}

/* LA MÚSICA DE PERSECUCIÓN. Las dos fuentes la nombran igual: "fast-paced
   synth chase music" apenas te ve, y "tempo of the ambient music increases"
   cuando se acerca. Es lo que le faltaba al juego: acá el bicho te corría en
   silencio y eso es menos tenso, no más.

   Un pulso de corchea en la menor, con la nota grave alternando. Arranca y
   para sola con el estado del bicho, y se apaga con un fundido corto para que
   cortar no suene a bug. */
let persNodos = [], persLoop = null, persGan = null;
export function musicaPersecucion(on) {
    if (!ctx) return;
    if (puente.bucle && puente.bucle('persecucion', on ? 1 : 0)) return;
    if (on) {
        if (persLoop) return;
        persGan = ctx.createGain();
        persGan.gain.value = 0.0001;
        persGan.connect(master);
        persGan.gain.setTargetAtTime(0.5, ctx.currentTime, 0.25);
        const notas = [110, 110, 130.81, 110, 146.83, 110, 164.81, 146.83];
        let i = 0;
        const pulso = () => {
            if (!ctx || !persGan) return;
            const t = ctx.currentTime;
            const f = notas[i++ % notas.length];
            const o = ctx.createOscillator(), g = ctx.createGain();
            o.type = 'square';
            o.frequency.value = f;
            const lp = ctx.createBiquadFilter();
            lp.type = 'lowpass'; lp.frequency.value = 900;
            g.gain.setValueAtTime(0.0001, t);
            g.gain.linearRampToValueAtTime(0.075, t + 0.01);
            g.gain.exponentialRampToValueAtTime(0.0004, t + 0.17);
            o.connect(lp); lp.connect(g); g.connect(persGan);
            o.start(t); o.stop(t + 0.2);
            // y un golpe de bombo cada cuatro
            if (i % 4 === 1) {
                const b = ctx.createOscillator(), bg = ctx.createGain();
                b.type = 'sine';
                b.frequency.setValueAtTime(120, t);
                b.frequency.exponentialRampToValueAtTime(44, t + 0.12);
                bg.gain.setValueAtTime(0.22, t);
                bg.gain.exponentialRampToValueAtTime(0.0004, t + 0.18);
                b.connect(bg); bg.connect(persGan);
                b.start(t); b.stop(t + 0.2);
            }
        };
        pulso();
        persLoop = setInterval(pulso, 190);
    } else {
        if (persLoop) { clearInterval(persLoop); persLoop = null }
        if (persGan) {
            const g = persGan;
            persGan = null;
            g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.3);
            setTimeout(() => { try { g.disconnect() } catch (e) { } }, 1500);
        }
    }
}

/* ------------------------------------------------------- los botones */
/* Un botón sin sonido en un celular se siente roto: no hay resistencia, no hay
   nada. Tres sonidos distintos, cortos, y ninguno musical — la casa no tiene
   por qué sonar a menú de app. */

/* El toque de cualquier botón: un golpecito de madera. */
export function boton(v = 1) {
    if (!ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(390, t);
    o.frequency.exponentialRampToValueAtTime(160, t + 0.055);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.16 * v, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0005, t + 0.09);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + 0.1);
    const n = ruido(0.05), f = ctx.createBiquadFilter(), ng = ctx.createGain();
    f.type = 'bandpass'; f.frequency.value = 2100; f.Q.value = 1.2;
    ng.gain.setValueAtTime(0.10 * v, t);
    ng.gain.exponentialRampToValueAtTime(0.0004, t + 0.055);
    n.connect(f); f.connect(ng); ng.connect(master);
    n.start(t); n.stop(t + 0.06);
}

/* Confirmar: dos notas que suben. Es el JUGAR y el subir la calidad. */
export function confirmar() {
    if (!ctx) return;
    const t = ctx.currentTime;
    [[294, 0], [440, 0.075]].forEach(([f, d]) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'triangle'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t + d);
        g.gain.linearRampToValueAtTime(0.13, t + d + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0005, t + d + 0.26);
        o.connect(g); g.connect(master);
        o.start(t + d); o.stop(t + d + 0.3);
    });
}

/* Y el que baja: cerrar el panel, bajar la calidad. */
export function cancelar() {
    if (!ctx) return;
    const t = ctx.currentTime;
    [[392, 0], [262, 0.07]].forEach(([f, d]) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'triangle'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t + d);
        g.gain.linearRampToValueAtTime(0.10, t + d + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0005, t + d + 0.22);
        o.connect(g); g.connect(master);
        o.start(t + d); o.stop(t + d + 0.26);
    });
}

/* El crujido de la puerta que se abre al final. */
export function puerta() {
    if (!ctx) return;
    const t = ctx.currentTime;
    const n = ruido(1.5), f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'bandpass'; f.Q.value = 8;
    f.frequency.setValueAtTime(210, t);
    f.frequency.linearRampToValueAtTime(680, t + 1.1);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.24, t + 0.15);
    g.gain.setValueAtTime(0.24, t + 0.85);
    g.gain.exponentialRampToValueAtTime(0.0005, t + 1.4);
    n.connect(f); f.connect(g); g.connect(master);
    n.start(t); n.stop(t + 1.5);
}

/* --------------------------------------------------------------- la música */
/* Todo sintetizado. Un mp3 de menú son 700 KB para algo que son cuatro notas
   y un colchón; acá es un acorde sostenido con un arpegio encima. */
let musicaNodos = [];
function pararMusica(fade = 0.8) {
    if (!ctx) return;
    const t = ctx.currentTime;
    for (const n of musicaNodos) {
        try { n.gain.gain.cancelScheduledValues(t); n.gain.gain.setTargetAtTime(0.0001, t, fade / 3) } catch (e) { }
        try { n.osc.stop(t + fade) } catch (e) { }
    }
    musicaNodos = [];
    if (musicaLoop) { clearInterval(musicaLoop); musicaLoop = null }
}
let musicaLoop = null;
export function callarMusica() { pararMusica(0.5) }

function voz(freq, tipo, vol, t0, dur, dest) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = tipo; o.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + Math.min(0.4, dur * 0.25));
    g.gain.setTargetAtTime(0.0001, t0 + dur * 0.7, dur * 0.25);
    o.connect(g); g.connect(dest || master);
    o.start(t0); o.stop(t0 + dur + 0.4);
    return { osc: o, gain: g };
}

/* El menú: un colchón grave en la menor y un arpegio lento y desafinado
   encima. Desafinado a propósito — afinado suena a menú de app. */
export function musicaMenu() {
    if (!ctx) return;
    pararMusica(0.3);
    const base = [55, 82.41, 110, 164.81];          // la, mi, la, mi
    for (const f of base) {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sawtooth';
        o.frequency.value = f * (1 + (Math.random() - .5) * 0.004);
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass'; lp.frequency.value = 420;
        g.gain.setValueAtTime(0.0001, ctx.currentTime);
        g.gain.setTargetAtTime(0.055, ctx.currentTime, 1.4);
        o.connect(lp); lp.connect(g); g.connect(master);
        o.start();
        musicaNodos.push({ osc: o, gain: g });
    }
    const notas = [880, 659.25, 587.33, 493.88, 440, 493.88];
    let i = 0;
    musicaLoop = setInterval(() => {
        if (!ctx) return;
        const t = ctx.currentTime;
        const n = notas[i++ % notas.length];
        const v = voz(n * (1 + (Math.random() - .5) * 0.006), 'triangle', 0.045, t, 1.5);
        setTimeout(() => { try { v.osc.stop() } catch (e) { } }, 2600);
    }, 1450);
}

/* El final: cuatro acordes que suben, con un bajo que los sostiene. Épico
   quiere decir tercera mayor y quinta, sostenidas, y que el bajo no se mueva. */
export function musicaFinal() {
    if (!ctx) return;
    pararMusica(0.25);
    const t0 = ctx.currentTime + 0.05;
    const acordes = [[110, 138.59, 164.81], [123.47, 155.56, 185],
                     [146.83, 185, 220], [164.81, 207.65, 246.94]];
    acordes.forEach((ac, k) => {
        const t = t0 + k * 1.5;
        for (const f of ac) {
            musicaNodos.push(voz(f, 'sawtooth', 0.05, t, 1.9));
            musicaNodos.push(voz(f * 2, 'triangle', 0.028, t, 1.9));
        }
    });
    // el bajo, sostenido debajo de todo
    musicaNodos.push(voz(55, 'sine', 0.10, t0, 7.2));
    // y un platillo de ruido en cada acorde
    acordes.forEach((_, k) => {
        const t = t0 + k * 1.5;
        const n = ruido(1.6), f = ctx.createBiquadFilter(), g = ctx.createGain();
        f.type = 'highpass'; f.frequency.value = 3400;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(0.11, t + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0005, t + 1.5);
        n.connect(f); f.connect(g); g.connect(master);
        n.start(t); n.stop(t + 1.6);
    });
}

/* Un click seco para las interacciones, y un golpe para el cubo que se arrastra. */
export function click(vol = 0.25) {
    if (!ctx) return;
    const t = ctx.currentTime;
    const n = ruido(0.05), f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'highpass'; f.frequency.value = 1400;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0005, t + 0.05);
    n.connect(f); f.connect(g); g.connect(master);
    n.start(t); n.stop(t + 0.06);
}

export function arrastre(vol) {
    if (!ctx || vol <= 0.002) return;
    const t = ctx.currentTime;
    const n = ruido(0.14), f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'lowpass'; f.frequency.value = 700;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0005, t + 0.14);
    n.connect(f); f.connect(g); g.connect(master);
    n.start(t); n.stop(t + 0.15);
}


/* ------------------------------------------------------- BANCO DE MEDICION */
/* Renderiza un sonido SIN reproducirlo, en un contexto offline, y devuelve un
   resumen medible: cuánto dura de verdad, dónde tiene el pico, cómo cae, y en
   qué frecuencias está la energía.

   Es la única forma que tengo de comprobar lo que sintetizo: no puedo
   escuchar. Con esto al menos puedo comparar contra una descripción —"golpe
   grave que se desploma", "chillido que sube a dos mil y pico"— con números
   en vez de con fe. */
export async function medir(nombre, dur = 2.0, sr = 22050) {
    const API = {
        paso, pasoMadera, pisada, respiro, latido, grito, click, arrastre,
        golpe, viento, boton, confirmar, cancelar, puerta,
        gruñido, cajon, riser, portazo, campana,
    };
    const f = API[nombre];
    if (!f) return { error: 'no existe ' + nombre };
    const OAC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const off = new OAC(1, Math.ceil(sr * dur), sr);
    const pctx = ctx, pmaster = master;
    ctx = off;
    master = off.createGain();
    master.gain.value = 1;
    master.connect(off.destination);
    /* El argumento no es el mismo en todos: casi todos toman VOLUMEN, pero
       `riser` toma DURACIÓN. Llamarlos a todos con 1 daba dos falsos
       positivos seguidos — primero cuatro sonidos mudos (`0.34 * undefined`
       = NaN), y después un riser de un segundo cuando en el juego dura tres. */
    try { f(nombre === 'riser' ? 3 : 1) } catch (e) { }
    const buf = await off.startRendering();
    ctx = pctx; master = pmaster;
    const d = buf.getChannelData(0);

    // envolvente: RMS en 40 tramos
    const B = 40, paso2 = Math.floor(d.length / B);
    const env = [];
    for (let i = 0; i < B; i++) {
        let sum = 0;
        for (let k = i * paso2; k < (i + 1) * paso2; k++) sum += d[k] * d[k];
        env.push(Math.sqrt(sum / paso2));
    }
    const pico = Math.max(...env);
    const iPico = env.indexOf(pico);
    // cuanto tarda en caer a la decima parte del pico
    let iCae = B - 1;
    for (let i = iPico; i < B; i++) if (env[i] < pico * 0.1) { iCae = i; break }
    // el ultimo tramo con algo de senal: la duracion util
    let iFin = 0;
    for (let i = 0; i < B; i++) if (env[i] > pico * 0.02) iFin = i;

    /* Espectro por Goertzel en 30 bandas logaritmicas de 40 Hz a 8 kHz. Es
       barato y alcanza: lo que interesa es DONDE esta la energia, no el
       detalle fino. */
    const bandas = [];
    for (let i = 0; i < 30; i++) bandas.push(40 * Math.pow(8000 / 40, i / 29));
    const N = Math.min(d.length, sr);   // el primer segundo
    const esp = bandas.map(fr => {
        const w = 2 * Math.PI * fr / sr;
        const coef = 2 * Math.cos(w);
        let s0 = 0, s1 = 0, s2 = 0;
        for (let n = 0; n < N; n++) { s0 = d[n] + coef * s1 - s2; s2 = s1; s1 = s0 }
        return Math.sqrt(s1 * s1 + s2 * s2 - coef * s1 * s2) / N;
    });
    const maxE = Math.max(...esp);
    const dom = bandas[esp.indexOf(maxE)];
    // ancho de banda: hasta donde llega la mitad de la energia del pico
    const fuertes = bandas.filter((_, i) => esp[i] > maxE * 0.5);

    return {
        nombre,
        durUtil: +((iFin + 1) / B * dur).toFixed(2),
        tPico: +(iPico / B * dur).toFixed(3),
        caidaA10: +((iCae - iPico) / B * dur).toFixed(3),
        picoRms: +pico.toFixed(4),
        fDominante: Math.round(dom),
        banda: [Math.round(fuertes[0] || dom), Math.round(fuertes[fuertes.length - 1] || dom)],
        envolvente: env.map(v => +(v / (pico || 1)).toFixed(2)),
    };
}
