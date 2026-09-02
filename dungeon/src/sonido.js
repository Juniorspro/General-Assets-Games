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

function ruido(dur) {
    const n = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const s = ctx.createBufferSource();
    s.buffer = buf;
    return s;
}

/* Un golpe sordo: el pie de algo pesado sobre alfombra. */
export function paso(vol) {
    if (!ctx || vol <= 0.002) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(92, t);
    o.frequency.exponentialRampToValueAtTime(38, t + 0.13);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0005, t + 0.20);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + 0.22);
    // un poco de cuerpo: el roce de la madera
    const n = ruido(0.09), f = ctx.createBiquadFilter(), gn = ctx.createGain();
    f.type = 'bandpass'; f.frequency.value = 260; f.Q.value = 1.2;
    gn.gain.setValueAtTime(vol * 0.5, t);
    gn.gain.exponentialRampToValueAtTime(0.0005, t + 0.09);
    n.connect(f); f.connect(gn); gn.connect(master);
    n.start(t); n.stop(t + 0.1);
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
