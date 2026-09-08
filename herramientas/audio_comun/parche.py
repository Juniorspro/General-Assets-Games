#!/usr/bin/env python3
"""
METE LA MUSICA Y EL TOQUE DE INTERFAZ GENERADOS EN Eco, POMPOM y RECREO.

Los tres ya tenian sonido procedural bien medido y NO se toca: lo que faltaba era musica —Eco y
POMPOM no tenian una sola nota grabada, RECREO tenia la suya escrita con osciladores— y el toque de
los botones. La capa nueva es la misma en los tres y cuelga del maestro que cada juego ya tiene, asi
que el analizador que cada uno usa para medir la sigue midiendo.

TRES DECISIONES QUE VALEN PARA LOS TRES:

  - LA MUESTRA PRIMERO Y EL SINTETIZADO DESPUES. Si un clip no decodifica —un navegador viejo, un MP3
    que no le gusta— suena el de osciladores de siempre. Un juego mudo por un decodificador es peor
    que un juego con bips.
  - decodeAudioData VACIA el ArrayBuffer que recibe. Sin `slice(0)`, un segundo intento encuentra
    cero bytes. Ya paso en Campo_de_Tiro.
  - EL TOQUE DE BOTON VA DELEGADO EN CAPTURA sobre el documento. Poniendolo en cada onclick hay que
    acordarse en los veinte botones que ya hay y en el proximo que se agregue.

Idempotente.

    python3 herramientas/audio_comun/parche.py
"""
import io, json, os, sys

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SAL = os.path.join(RAIZ, 'herramientas', 'audio_comun', 'salida')


def cambiar(s, a, b, nombre):
    if b in s:
        print('    (ya estaba)', nombre)
        return s
    assert s.count(a) == 1, 'no encontrado o repetido: %s (%d)' % (nombre, s.count(a))
    print('    ok', nombre)
    return s.replace(a, b)


CAPA = r'''
/* ===================== LA MUSICA Y EL TOQUE, GENERADOS =====================
   Cuelgan del mismo maestro que el resto del audio del juego, asi que el analizador que ya existe
   los mide igual que a todo lo demas. La musica va MUY por debajo de lo que el juego usa para
   avisar: en este juego lo que tiene que sobresalir no es el fondo. */
const AX = @@JSON@@;
const AXB = {};                       // 'mus:menu' -> AudioBuffer
const AXM = { k:null, src:null, gan:null };
const AX_VOL = @@VOL@@;                // volumen de la musica
const AX_FUNDE = 1.1;                 // segundos de cruce al cambiar de tema
let axPedido=false;
function axDecodificar(){
  if(axPedido || !@@CTX@@) return; axPedido=true;
  const meter=(cat,k,b64)=>{ try{
    const s=atob(b64), n=s.length, a=new Uint8Array(n);
    for(let i=0;i<n;i++) a[i]=s.charCodeAt(i);
    /* la copia no es por las dudas: decodeAudioData deja el buffer original en cero bytes */
    @@CTX@@.decodeAudioData(a.buffer.slice(0),
      b=>{ AXB[cat+':'+k]=b; if(cat==='mus' && AXM.k===k && !AXM.src) axMusArrancar(k); },
      ()=>{});
  }catch(e){} };
  for(const k in AX.mus) meter('mus',k,AX.mus[k]);
  for(const k in AX.sfx) meter('sfx',k,AX.sfx[k]);
}
function axSon(k, vol){
  const b=AXB['sfx:'+k];
  if(!b || !@@CTX@@ || !@@MAESTRO@@) return false;
  try{
    const s=@@CTX@@.createBufferSource(); s.buffer=b;
    const g=@@CTX@@.createGain(); g.gain.value=(vol==null?1:vol);
    s.connect(g); g.connect(@@MAESTRO@@); s.start();
    return true;
  }catch(e){ return false; }
}
function axMusArrancar(k){
  if(!@@CTX@@ || !@@MAESTRO@@ || !AXB['mus:'+k]) return;
  try{
    const g=@@CTX@@.createGain(); g.gain.value=0;
    const s=@@CTX@@.createBufferSource(); s.buffer=AXB['mus:'+k]; s.loop=true;
    s.connect(g); g.connect(@@MAESTRO@@); s.start();
    g.gain.linearRampToValueAtTime(AX_VOL, @@CTX@@.currentTime+AX_FUNDE);
    AXM.src=s; AXM.gan=g;
  }catch(e){}
}
function axMusica(k){
  if(AXM.k===k) return;
  AXM.k=k;
  if(AXM.src && AXM.gan && @@CTX@@){
    /* se apaga la que estaba y se la deja morir sola: parar una fuente en seco deja un clic, y
       ademas hay que soltarla o queda un nodo vivo por cada cambio de pantalla */
    const s=AXM.src, g=AXM.gan, t=@@CTX@@.currentTime;
    try{ g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value,t);
         g.gain.linearRampToValueAtTime(0.0001, t+AX_FUNDE);
         s.stop(t+AX_FUNDE+0.05); }catch(e){}
    AXM.src=null; AXM.gan=null;
  }
  if(k) axMusArrancar(k);
}
/* EL TOQUE DE CUALQUIER BOTON, EN UN SOLO SITIO */
addEventListener('click', e=>{
  const b=e.target && e.target.closest && e.target.closest('button');
  if(b) axSon('ui');
}, true);
window.__ax=()=>({ clips:Object.keys(AX.mus).length+Object.keys(AX.sfx).length,
                   decodificados:Object.keys(AXB).length,
                   falta:[].concat(Object.keys(AX.mus).map(k=>'mus:'+k),
                                   Object.keys(AX.sfx).map(k=>'sfx:'+k)).filter(k=>!AXB[k]),
                   musica:AXM.k, sonando:!!AXM.src,
                   gan:AXM.gan? +AXM.gan.gain.value.toFixed(4) : null,
                   duraciones:Object.keys(AXB).sort().map(k=>[k, +AXB[k].duration.toFixed(2)]) });
'''


def capa(juego, ctx, maestro, vol):
    js = io.open(os.path.join(SAL, juego + '.json'), encoding='utf8').read()
    return (CAPA.replace('@@JSON@@', js).replace('@@CTX@@', ctx)
                .replace('@@MAESTRO@@', maestro).replace('@@VOL@@', str(vol)))


def eco():
    p = os.path.join(RAIZ, 'juegos-pc', 'Eco.html')
    s = io.open(p, encoding='utf8').read()
    print('  Eco.html', len(s))
    # LA MUSICA DE ECO VA MUY ABAJO Y NO ES TIMIDEZ: en este juego el sonido ES la vista, y una cama
    # de musica que compita con el eco rompe la unica regla que el juego tiene. Se pone al mismo
    # criterio que ya tenia el ambiente, que esta medido: por debajo del grito.
    s = cambiar(s, 'function audioIniciar(){',
                capa('eco', 'AUD.ctx', 'AUD.maestro', 0.075) + '\nfunction audioIniciar(){',
                'la capa de audio')
    s = cambiar(s, '  AUD.maestro=maestro; AUD.seco=seco; AUD.envio=envio; AUD.ruido=rb;',
                '  AUD.maestro=maestro; AUD.seco=seco; AUD.envio=envio; AUD.ruido=rb;\n'
                '  axDecodificar();',
                'decodificar al arrancar el audio')
    # la muestra primero, el sintetizado despues
    s = cambiar(s, 'function son(tipo, f){\n  if(!AUD.ctx || !AUD.on) return;',
                'function son(tipo, f){\n  if(!AUD.ctx || !AUD.on) return;\n'
                '  /* si hay clip grabado para este sonido, ese; si no, el de osciladores */\n'
                '  if(axSon(tipo, f==null?1:Math.min(1,f))) return;',
                'la trompeta grabada')
    # la musica sigue a la pantalla
    s = cambiar(s, "  audioIniciar(); cargarAmbiente(); ambiente('ambJuego');",
                "  audioIniciar(); cargarAmbiente(); ambiente('ambJuego'); axMusica('juego');",
                'musica del laberinto')
    s = cambiar(s, "  audioIniciar(); cargarVoces(); cargarAmbiente();\n  ambiente('ambMenu');",
                "  audioIniciar(); cargarVoces(); cargarAmbiente(); axMusica('menu');\n"
                "  ambiente('ambMenu');",
                'musica del menu')
    s = cambiar(s, "      try{ musica('finPrado'); }catch(e){}",
                "      axMusica('prado');",
                'musica del prado')
    io.open(p, 'w', encoding='utf8').write(s)
    print('  escrito', len(s))


def pompom():
    p = os.path.join(RAIZ, 'juegos-pc', 'Pompom.html')
    s = io.open(p, encoding='utf8').read()
    print('  Pompom.html', len(s))
    s = cambiar(s, 'function audioIniciar(){',
                capa('pompom', 'AUD.ctx', 'AUD.maestro', 0.115) + '\nfunction audioIniciar(){',
                'la capa de audio')
    s = cambiar(s, '  AUD.maestro=m; AUD.seco=seco; AUD.envio=env;\n  musicaIniciar();',
                '  AUD.maestro=m; AUD.seco=seco; AUD.envio=env;\n  musicaIniciar();\n'
                '  axDecodificar();',
                'decodificar al arrancar el audio')
    # LA MUSICA CUELGA DE verPantalla() Y DE NINGUN OTRO SITIO. Repartiendo llamadas por cada boton
    # que cambia de pantalla, la proxima pantalla que se agregue queda muda y nadie se entera hasta
    # jugarla; aca es imposible por construccion.
    s = cambiar(s, "function verPantalla(p){\n  pant=p;",
                "function verPantalla(p){\n  pant=p;\n"
                "  /* el hub y el juego tienen tema propio: son dos estados distintos y el jugador\n"
                "     tiene que oir que algo cambio al empezar a jugar */\n"
                "  axMusica(p==='juego'? 'juego' : 'menu');",
                'la musica sigue a la pantalla')
    io.open(p, 'w', encoding='utf8').write(s)
    print('  escrito', len(s))


def recreo():
    # RECREO SE ARMA DE PARTES, asi que el parche va en la PARTE y no en el HTML: parchear la salida
    # la borra el proximo `python3 herramientas/recreo/armar.py`.
    p = os.path.join(RAIZ, 'herramientas', 'recreo', 'partes', 'h2b.js')
    s = io.open(p, encoding='utf8').read()
    print('  partes/h2b.js', len(s))
    s = cambiar(s, 'function audioIniciar(){',
                capa('recreo', 'AUD.ctx', 'AUD.m', 0.055) + '\nfunction audioIniciar(){',
                'la capa de audio')
    s = cambiar(s, '  const m=c.createGain(); m.gain.value=0.8; m.connect(c.destination); AUD.m=m;',
                '  const m=c.createGain(); m.gain.value=0.8; m.connect(c.destination); AUD.m=m;\n'
                '  axDecodificar();',
                'decodificar al arrancar el audio')
    # RECREO YA TIENE MUSICA, ESCRITA CON OSCILADORES, y esa se queda: se agacha sola cuando Baldi
    # habla y cambia de intensidad segun el aula, cosas que un archivo suelto no puede hacer. Lo que
    # entra es un tema grabado para el MENU, que es donde no habia nada.
    s = cambiar(s, "function verPantalla(p){\n  pant=p;",
                "function verPantalla(p){\n  pant=p;\n"
                "  axMusica(p==='juego'? null : 'juego');",
                'la musica del menu')
    io.open(p, 'w', encoding='utf8').write(s)
    print('  escrito', len(s))


def main():
    print('Eco:'); eco()
    print('POMPOM:'); pompom()
    print('RECREO:'); recreo()
    return 0


if __name__ == '__main__':
    sys.exit(main())
