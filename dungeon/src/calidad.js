/* El menu de graficos.
   ---------------------------------------------------------------------------
   Cuatro niveles que tocan lo que de verdad cuesta, no cosas decorativas. En
   orden de cuanto pesan:

   1. LA RESOLUCION. Es la palanca mas grande de todas y la mas barata: bajar
      el `pixelRatio` de 2 a 0,6 son once veces menos pixeles que sombrear.
   2. LAS SOMBRAS. Una luz puntual con sombra cuesta SEIS pases de render —uno
      por cara del cubo—, asi que cada farol que proyecta es como dibujar la
      escena seis veces mas. Por eso el nivel no cambia solo la resolucion del
      mapa de sombras sino CUANTOS faroles proyectan.
   3. CUANTOS NIVELES SE DIBUJAN. El mapa son tres laberintos enteros; en bajo
      se dibuja solo en el que estas.
   4. El contorno del cuerpo, que duplica sus mallas.

   La eleccion se guarda en el navegador. Y arranca en medio y no en alto: mas
   vale que el primer minuto vaya fluido y que suba el que quiera. */

export const NIVELES = {
    bajo: {
        nombre: 'Bajo', pix: 0.6, sombras: false, mapa: 512, faroles: 0, luces: 5,
        niebla: [9, 34], contorno: false, aniso: 1,
    },
    medio: {
        nombre: 'Medio', pix: 1, sombras: true, mapa: 512, faroles: 2, luces: 10,
        niebla: [11, 52], contorno: true, aniso: 4,
    },
    alto: {
        nombre: 'Alto', pix: 1.5, sombras: true, mapa: 1024, faroles: 5, luces: 16,
        niebla: [13, 74], contorno: true, aniso: 8,
    },
    ultra: {
        nombre: 'Ultra', pix: 2, sombras: true, mapa: 2048, faroles: 6, luces: 22,
        niebla: [16, 100], contorno: true, aniso: 16,
    },
};
const ORDEN = ['bajo', 'medio', 'alto', 'ultra'];

export class Calidad {
    constructor(juego) {
        this.juego = juego;
        this.nivel = this.leerGuardado() || 'medio';
        this.fps = 0; this._n = 0; this._t = 0;
        this.armarMenu();
        this.aplicar(this.nivel);
    }

    leerGuardado() {
        /* Puede tirar: en una ventana privada o con el sitio bloqueado,
           tocar localStorage lanza en vez de devolver null. */
        try { const v = localStorage.getItem('lang_calidad'); return NIVELES[v] ? v : null }
        catch (e) { return null }
    }
    guardar(v) { try { localStorage.setItem('lang_calidad', v) } catch (e) { } }

    aplicar(clave) {
        const N = NIVELES[clave];
        if (!N) return;
        this.nivel = clave;
        this.guardar(clave);
        const j = this.juego, r = j.renderer;

        /* La resolucion. Se limita al pixelRatio real del aparato: pedir 2 en
           una pantalla que es 1 es dibujar cuatro veces de gusto. */
        r.setPixelRatio(Math.min(N.pix, devicePixelRatio || 1));
        j.resize();

        /* Prender o apagar sombras obliga a recompilar los materiales: sin el
           needsUpdate el shader viejo sigue puesto y no cambia nada. */
        if (r.shadowMap.enabled !== N.sombras) {
            r.shadowMap.enabled = N.sombras;
            j.scene.traverse(o => {
                if (!o.material) return;
                for (const m of (Array.isArray(o.material) ? o.material : [o.material]))
                    m.needsUpdate = true;
            });
        }
        /* CAMBIAR mapSize NO HACE NADA si el mapa ya está reservado: three lo
           asigna una vez y se queda con esa textura para siempre. Hay que
           tirarla a mano para que la vuelva a crear con el tamaño nuevo. Por
           eso ultra usaba el mapa de sombras del primer nivel que se hubiera
           cargado y las sombras se veían igual en los cuatro. */
        const remapear = (L, lado) => {
            if (!L.shadow || L.shadow.mapSize.x === lado) return;
            L.shadow.mapSize.set(lado, lado);
            if (L.shadow.map) { L.shadow.map.dispose(); L.shadow.map = null }
        };
        j.lamp.castShadow = N.sombras;
        remapear(j.lamp, N.mapa);
        j.farolesConSombra = N.faroles;
        for (const l of j.lamps || []) {
            remapear(l.L, Math.min(N.mapa, 1024));
            if (!N.sombras) l.L.castShadow = false;
        }
        /* El contorno del bicho también entra en el presupuesto: duplica sus
           mallas. En bajo se apaga. */
        const bicho = j.mision && j.mision.bicho;
        if (bicho && bicho.contornos)
            for (const c of bicho.contornos) c.visible = N.contorno;
        /* Cuantas arañas quedan encendidas a la vez. Es lo que mas pesa de
           todo: cada point light se evalua en cada fragmento de lo que se ve. */
        j.lucesVivas = N.luces;
        j.scene.fog.near = N.niebla[0];
        j.scene.fog.far = N.niebla[1];
        j.camera.far = N.niebla[1] * 3;
        j.camera.updateProjectionMatrix();
        if (j.cuerpo && j.cuerpo.contornos)
            for (const c of j.cuerpo.contornos) c.visible = N.contorno;

        this.pintarMenu();
    }

    subir() { const i = ORDEN.indexOf(this.nivel); if (i < ORDEN.length - 1) this.aplicar(ORDEN[i + 1]) }
    bajar() { const i = ORDEN.indexOf(this.nivel); if (i > 0) this.aplicar(ORDEN[i - 1]) }

    armarMenu() {
        this.panel = document.getElementById('graficos');
        this.btn = document.getElementById('btn-graficos');
        this.cerrar = document.getElementById('graficos-cerrar');
        if (!this.panel) return;
        const abrir = e => { e.preventDefault(); e.stopPropagation(); this.abrir(!this.visible) };
        this.btn.addEventListener('touchstart', abrir, { passive: false });
        this.btn.addEventListener('mousedown', abrir);
        this.cerrar.addEventListener('touchstart', abrir, { passive: false });
        this.cerrar.addEventListener('mousedown', abrir);
        for (const k of ORDEN) {
            const el = document.getElementById('cal-' + k);
            if (!el) continue;
            const f = e => { e.preventDefault(); e.stopPropagation(); this.aplicar(k) };
            el.addEventListener('touchstart', f, { passive: false });
            el.addEventListener('mousedown', f);
        }
        // que el panel no le pase los toques al "mirar alrededor"
        for (const ev of ['touchstart', 'touchmove', 'touchend', 'mousedown'])
            this.panel.addEventListener(ev, e => e.stopPropagation());
    }

    abrir(v) {
        this.visible = v;
        this.panel.classList.toggle('ver', v);
        this.juego.menuAbierto = v;
    }

    pintarMenu() {
        for (const k of ORDEN) {
            const el = document.getElementById('cal-' + k);
            if (el) el.classList.toggle('elegido', k === this.nivel);
        }
        const d = document.getElementById('cal-detalle');
        if (!d) return;
        const N = NIVELES[this.nivel];
        const pr = Math.min(N.pix, devicePixelRatio || 1);
        d.textContent = 'resolución ×' + pr.toFixed(2)
            + ' · sombras ' + (N.sombras ? N.mapa : 'no')
            + ' · faroles que proyectan ' + N.faroles;
    }

    /* El contador. Promedia medio segundo: cuadro a cuadro el numero salta
       tanto que no se puede leer. */
    tic(dt) {
        this._n++; this._t += dt;
        if (this._t < 0.5) return;
        this.fps = Math.round(this._n / this._t);
        this._n = 0; this._t = 0;
        const el = document.getElementById('fps');
        if (el) el.textContent = this.fps + ' fps';
    }
}
