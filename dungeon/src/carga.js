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

async function bajarUno(item, sumar) {
    const r = await fetch(item.url, { mode: 'cors', credentials: 'omit' });
    if (!r.ok) throw new Error(r.status + ' ' + item.url);
    /* Con reader hay progreso mientras baja; sin reader (o si el servidor no
       manda cuerpo streameable) se cobra todo junto al final. */
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
    // si el archivo pesaba menos de lo declarado, se salda la diferencia
    if (item.bytes && leido < item.bytes) sumar(item.bytes - leido);
    return new Blob(trozos, { type: item.mime || 'application/octet-stream' });
}

/* `manifiesto` es {clave: {url, bytes, mime}}. Devuelve una promesa que se
   cumple cuando terminaron todos, fallen o no. */
export async function precargar(assets, manifiesto, alProgreso) {
    const items = Object.keys(manifiesto).map(k => ({ clave: k, ...manifiesto[k] }));
    if (!items.length) { alProgreso && alProgreso(1, 0, 0); return { ok: 0, fallados: [] } }
    const total = items.reduce((a, i) => a + (i.bytes || 0), 0) || 1;
    let hecho = 0, ok = 0;
    const fallados = [];
    const sumar = n => {
        hecho += n;
        alProgreso && alProgreso(Math.min(1, hecho / total), hecho, total);
    };

    /* De a ocho. Todos a la vez con veinte archivos satura el arranque en un
       teléfono y la barra se queda quieta un rato largo antes de saltar. */
    let i = 0;
    const obrero = async () => {
        for (;;) {
            const k = i++;
            if (k >= items.length) return;
            const it = items[k];
            try {
                const b = await bajarUno(it, sumar);
                assets[it.clave] = URL.createObjectURL(b);
                ok++;
            } catch (e) {
                fallados.push(it.clave);
                sumar(it.bytes || 0);          // que la barra igual llegue
            }
        }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENTES, items.length) }, obrero));
    return { ok, fallados };
}
