/* La carga de assets, en paralelo y con barra.
   ---------------------------------------------------------------------------
   Antes todo iba EMBEBIDO en el HTML como data URL: las texturas, los doce
   muebles, la langosta, los cuadros y el menú. Eso daba un archivo de 7,1 MB
   que el teléfono tiene que bajar entero —y decodificar de base64, que agrega
   un tercio— antes de pintar el primer píxel. Y no se puede mostrar progreso:
   o está el HTML o no está.

   Ahora los archivos viven en el repo y se bajan de jsDelivr, que sirve
   cualquier repo público de GitHub. El HTML queda en ~600 KB, los assets se
   piden TODOS A LA VEZ y hay barra de verdad, medida en bytes.

   Dos cosas que hay que saber:

   1. El progreso se lee del `body` de la respuesta con un reader, no contando
      archivos terminados. Con doce archivos de tamaños muy distintos, contar
      archivos da una barra que salta de 30 a 70 y se queda.
   2. Lo bajado se guarda como blob y se reemplaza la URL por la del blob. Si
      no, three vuelve a pedir el archivo cuando arma la escena; iría a la
      caché, pero depende de las cabeceras y no quiero depender de eso.

   Si algo no baja, NO se rompe: se deja la URL original y el juego sigue. El
   único asset sin el cual no hay juego es la langosta, y aun así entra —te
   mata algo invisible, que ya sabemos cómo se ve. */

const CONCURRENTES = 8;
const ESPERA = 9000;      // por archivo, en ms
const REINTENTOS = 1;

/* CON TIMEOUT, SIEMPRE. Un fetch sin AbortController puede quedarse colgado
   para siempre —pasa con una conexión que se corta a mitad, que es lo normal
   en un teléfono—, y como el juego esperaba a que TODOS terminaran, un solo
   archivo colgado dejaba la barra clavada y el juego sin arrancar. Se
   reprodujo abriendo el archivo con la red cortada: la barra quedó en 20 % y
   nunca se construyó nada. Ese era el "no entra al juego". */
async function bajarUno(item, sumar) {
    const ctl = new AbortController();
    const reloj = setTimeout(() => ctl.abort(), ESPERA);
    try {
        const r = await fetch(item.url, { mode: 'cors', credentials: 'omit', signal: ctl.signal });
        if (!r.ok) throw new Error(r.status + ' ' + item.url);
        if (!r.body || !r.body.getReader) {
            const b = await r.blob();
            sumar(item.bytes || b.size);
            return b;
        }
        const reader = r.body.getReader();
        const trozos = [];
        let leido = 0;
        for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            trozos.push(value);
            leido += value.length;
            sumar(value.length);
        }
        if (item.bytes && leido < item.bytes) sumar(item.bytes - leido);
        return new Blob(trozos, { type: item.mime || 'application/octet-stream' });
    } finally {
        clearTimeout(reloj);
    }
}

/* `manifiesto` es {clave: {url, bytes, mime}}. Devuelve una promesa que se
   cumple cuando terminaron todos, fallen o no. */
export async function precargar(assets, manifiesto, alProgreso, techo = 12000) {
    const items = Object.keys(manifiesto).map(k => ({ clave: k, ...manifiesto[k] }));
    if (!items.length) { alProgreso && alProgreso(1, 0, 0); return { ok: 0, fallados: [], corte: false } }
    const total = items.reduce((a, i) => a + (i.bytes || 0), 0) || 1;
    let hecho = 0, ok = 0;
    const fallados = [];
    const sumar = n => {
        hecho += n;
        alProgreso && alProgreso(Math.min(1, hecho / total), hecho, total);
    };

    let i = 0;
    const obrero = async () => {
        for (;;) {
            const k = i++;
            if (k >= items.length) return;
            const it = items[k];
            let listo = false;
            for (let intento = 0; intento <= REINTENTOS && !listo; intento++) {
                const antes = hecho;
                try {
                    const b = await bajarUno(it, sumar);
                    assets[it.clave] = URL.createObjectURL(b);
                    ok++; listo = true;
                } catch (e) {
                    // devolver lo que ya se había cobrado, para no pasarse de 100
                    hecho = antes;
                }
            }
            if (!listo) { fallados.push(it.clave); sumar(it.bytes || 0) }
        }
    };

    /* Y ADEMÁS UN TECHO GLOBAL. Aunque cada archivo tenga su timeout, con
       veintiséis archivos y una red mala la suma puede ser eterna. Pasado el
       techo se arranca con lo que haya: más vale entrar al juego con la casa
       a medio vestir que quedarse mirando una barra. */
    const corrida = Promise.all(
        Array.from({ length: Math.min(CONCURRENTES, items.length) }, obrero));
    const corte = await Promise.race([
        corrida.then(() => false),
        new Promise(res => setTimeout(() => res(true), techo)),
    ]);
    if (corte) corrida.catch(() => { });     // que siga bajando de fondo, sin trabar
    return { ok, fallados, corte };
}
