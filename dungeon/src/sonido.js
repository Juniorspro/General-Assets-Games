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
export function paso(vol) {
    if (!ctx || vol <= 0.002) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(120, t);
    o.frequency.exponentialRampToValueAtTime(52, t + 0.10);
    g.gain.setValueAtTime(vol * 0.8, t);
    g.gain.exponentialRampToValueAtTime(0.0005, t + 0.15);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + 0.16);
    // el ping del acero: dos parciales inarmonicos, cortos
    for (const [fr, k] of [[1850, 1], [2790, 0.55]]) {
        const oo = ctx.createOscillator(), gg = ctx.createGain();
        oo.type = 'triangle';
        oo.frequency.setValueAtTime(fr, t);
        gg.gain.setValueAtTime(vol * 0.42 * k, t);
        gg.gain.exponentialRampToValueAtTime(0.0004, t + 0.09);
        oo.connect(gg); gg.connect(master);
        oo.start(t); oo.stop(t + 0.1);
    }
}

/* La respiracion. Aparece cuando ya esta cerca: es el segundo aviso. */
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

/* El grito, cuando te ve. Ruido pasado por un filtro que barre hacia arriba,
   mas dos osciladores desafinados: eso es lo que hace que raspe. */
export function grito() {
    if (!ctx) return;
    const t = ctx.currentTime;
    const n = ruido(1.1), f = ctx.createBiquadFilter(), g = ctx.createGain();
    f.type = 'bandpass'; f.Q.value = 3.5;
    f.frequency.setValueAtTime(420, t);
    f.frequency.exponentialRampToValueAtTime(2600, t + 0.35);
    f.frequency.exponentialRampToValueAtTime(300, t + 1.0);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.55, t + 0.05);
    g.gain.exponentialRampToValueAtTime(0.0005, t + 1.05);
    n.connect(f); f.connect(g); g.connect(master);
    n.start(t); n.stop(t + 1.1);
    for (const d of [0, 7]) {
        const o = ctx.createOscillator(), og = ctx.createGain();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(180 + d, t);
        o.frequency.exponentialRampToValueAtTime(760 + d * 4, t + 0.30);
        o.frequency.exponentialRampToValueAtTime(150, t + 0.95);
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
