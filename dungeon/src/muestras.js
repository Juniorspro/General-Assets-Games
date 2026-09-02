/* La capa de MUESTRAS: archivos de audio por encima del sintetizador.
   ---------------------------------------------------------------------------
   Todo el audio del juego está sintetizado, y eso tiene una ventaja enorme —no
   pesa nada— y un techo: un colchón de ambiente hecho con tres senos es un
   colchón de tres senos, y se nota.

   Esta capa deja poner archivos SIN tirar nada de lo que hay. Cada sonido
   pregunta primero si existe su muestra; si está, la reproduce, y si no, cae
   al sintetizador de siempre. Se puede reemplazar de a UNO: poner sólo el
   ambiente y dejar el resto sintetizado es una decisión válida y no rompe
   nada.

   Los archivos van en `sonidos/` y entran al empaquetador como cualquier otro
   asset: por CDN, con su barra de carga. */
import * as S from './sonido.js';

/* Qué muestra corresponde a cada sonido, y cómo se reproduce.
   `bucle` = se enciende y se apaga con un volumen, como el ambiente.
   `variantes` = si hay varias, se elige una al azar; un paso repetido
   exactamente igual veinte veces se lee como un error, no como un paso. */
export const MAPA = {
    ambiente:   { clave: 'snd_ambiente',  bucle: true,  vol: 0.55 },
    persecucion:{ clave: 'snd_persecucion', bucle: true, vol: 0.5 },
    paso:       { clave: 'snd_paso',      variantes: 3, vol: 0.9 },
    correr:     { clave: 'snd_correr',    variantes: 3, vol: 0.95 },
    deslizar:   { clave: 'snd_deslizar',  vol: 0.85 },
    pasoMadera: { clave: 'snd_paso_madera', variantes: 2, vol: 0.9 },
    pisada:     { clave: 'snd_pisada',    variantes: 2, vol: 1 },
    grito:      { clave: 'snd_grito',     vol: 1 },
    gruñido:    { clave: 'snd_grunido',   vol: 0.9 },
    golpe:      { clave: 'snd_golpe',     vol: 1 },
    cajon:      { clave: 'snd_cajon',     vol: 0.9 },
    portazo:    { clave: 'snd_portazo',   vol: 1 },
    campana:    { clave: 'snd_campana',   vol: 0.8 },
    riser:      { clave: 'snd_riser',     vol: 0.9 },
};

const buffers = {};       // clave → AudioBuffer ya decodificado
const bucles = {};        // clave → { fuente, gan }
let ctxRef = null;

/* Decodifica todo lo que haya llegado. Se llama una vez, después de la carga.
   Devuelve cuántas muestras entraron: cero es un resultado válido —el juego
   suena igual— y por eso no avisa por consola como si fuera un error. */
export async function cargarMuestras(assets, ctx) {
    ctxRef = ctx;
    if (!ctx) return 0;
    let n = 0;
    await Promise.all(Object.values(MAPA).map(async m => {
        const claves = m.variantes
            ? Array.from({ length: m.variantes }, (_, i) => `${m.clave}_${i + 1}`)
            : [m.clave];
        await Promise.all(claves.map(async k => {
            const url = assets[k];
            if (!url) return;
            try {
                const r = await fetch(url);
                const ab = await r.arrayBuffer();
                buffers[k] = await ctx.decodeAudioData(ab);
                n++;
            } catch (e) { /* si una no decodifica, esa cae al sintetizador */ }
        }));
    }));
    return n;
}

const claveDe = (nombre) => {
    const m = MAPA[nombre];
    if (!m) return null;
    if (!m.variantes) return buffers[m.clave] ? m.clave : null;
    const hay = [];
    for (let i = 1; i <= m.variantes; i++) {
        const k = `${m.clave}_${i}`;
        if (buffers[k]) hay.push(k);
    }
    return hay.length ? hay[(Math.random() * hay.length) | 0] : null;
};

export const hayMuestra = nombre => !!claveDe(nombre);

/* Un disparo. Devuelve true si sonó la muestra; false significa "usá el
   sintetizador", que es lo que hace quien llama. */
export function tocar(nombre, vol = 1) {
    if (!ctxRef) return false;
    const m = MAPA[nombre];
    const k = claveDe(nombre);
    if (!k) return false;
    const f = ctxRef.createBufferSource();
    f.buffer = buffers[k];
    // un poco de variación de tono: veinte pasos idénticos suenan a bucle
    f.playbackRate.value = 0.94 + Math.random() * 0.12;
    const g = ctxRef.createGain();
    g.gain.value = vol * (m.vol || 1);
    f.connect(g); g.connect(S.salida());
    f.start();
    return true;
}

/* Un bucle con volumen, para el ambiente y la persecución. */
export function bucle(nombre, v) {
    if (!ctxRef) return false;
    const m = MAPA[nombre];
    const k = claveDe(nombre);
    if (!k || !m || !m.bucle) return false;
    let b = bucles[k];
    if (!b) {
        const f = ctxRef.createBufferSource();
        f.buffer = buffers[k];
        f.loop = true;
        const g = ctxRef.createGain();
        g.gain.value = 0.0001;
        f.connect(g); g.connect(S.salida());
        f.start();
        b = bucles[k] = { fuente: f, gan: g };
    }
    b.gan.gain.setTargetAtTime(Math.max(0.0001, v * (m.vol || 1)), ctxRef.currentTime, 0.4);
    return true;
}
