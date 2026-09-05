/* ---------------------------------------------------------------------------
   Las pantallas de error.

   Van escritas con CSS, no generadas como imagen, porque son texto: un
   generador de imágenes devuelve letras deformadas y una pantalla de error mal
   escrita no es una pantalla de error, es una mancha. Acá el texto es texto y
   se lee igual en la miniatura y a pantalla completa.

   Cada una se dibuja UNA vez a 960x600 y se escala: la miniatura y la vista
   grande son literalmente el mismo nodo con otro `scale`. Así no hay dos
   versiones que se desincronicen.

   El contenido dice «Frutiger Aero» en todas a propósito: son recreaciones de
   una estética, y nadie tiene que confundirlas ni un segundo con un error de
   su propia máquina.

   Nada de esto puede llevar un <button>: cada pantalla se dibuja DENTRO del
   botón que la abre, y el parser cierra el de afuera al encontrar el de adentro.
   El «Cancelar» de la ventana de Vista es un <span> disfrazado.
   --------------------------------------------------------------------------- */

export const PANTALLAS = [
  {
    id:"bsod", nombre:"Pantalla azul", pie:"Windows NT · 1993–2012",
    html:`<div class="p-bsod"><pre>A problem has been detected and Windows has been shut down
to prevent damage to your computer.

FRUTIGER_AERO_NOT_LESS_OR_EQUAL

If this is the first time you've seen this stop error screen,
restart your computer. If this screen appears again, follow
these steps:

Check to be sure you have adequate disk space. If a driver is
identified in the stop message, disable the driver or check
with the manufacturer for driver updates.

Technical information:

*** STOP: 0x0000004A (0x00002004, 0x00002012, 0x00000000)

***  aero.sys - Address F86B5A89 base at F86B5000

Beginning dump of physical memory
Physical memory dump complete.</pre></div>`,
  },
  {
    id:"panic", nombre:"Kernel panic", pie:"Mac OS X · 2001–2012",
    html:`<div class="p-panic"><div class="caja">
      <div class="icono">⏻</div>
      <p><b>You need to restart your computer.</b> Hold down the Power button
        for several seconds or press the Restart button.</p>
      <p lang="ja"><b>コンピュータを再起動する必要があります。</b>パワーボタンを
        数秒間押し続けるか、リセットボタンを押してください。</p>
      <p lang="de"><b>Sie müssen Ihren Computer neu starten.</b> Halten Sie
        die Ein-/Aus-Taste einige Sekunden gedrückt.</p>
      <p lang="fr"><b>Vous devez redémarrer votre ordinateur.</b> Maintenez la
        touche de démarrage enfoncée pendant plusieurs secondes.</p>
    </div></div>`,
  },
  {
    id:"nosignal", nombre:"Sin señal", pie:"Todo monitor · siempre",
    html:`<div class="p-señal">
      <div class="barras"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
      <div class="cartel"><b>NO SIGNAL</b><small>Check video cable connection</small></div>
      <div class="reloj">INPUT 1 · VGA · 1024×768 60Hz</div>
    </div>`,
  },
  {
    id:"guru", nombre:"Guru Meditation", pie:"Amiga · 1985",
    html:`<div class="p-guru"><div class="borde">
      <p>Software Failure.&nbsp;&nbsp;Press left mouse button to continue.</p>
      <p>Guru Meditation #00000004.48454C50</p>
    </div></div>`,
  },
  {
    id:"vista", nombre:"Dejó de funcionar", pie:"Windows Vista · 2006",
    html:`<div class="p-vista"><div class="dialogo">
      <div class="tit">Aero.exe</div>
      <div class="cuerpo">
        <div class="ico">✕</div>
        <div>
          <p class="fuerte">Aero.exe ha dejado de funcionar</p>
          <p>Windows está comprobando si existe una solución al problema…</p>
        </div>
      </div>
      <div class="barrap"><span class="boton">Cancelar</span></div>
    </div></div>`,
  },
];
