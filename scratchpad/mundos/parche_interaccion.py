#!/usr/bin/env python3
"""«WE SHOULD BE ABLE TO PICK UP OBJECTIVES, I TRIED EVERY WAY TO INTERACT BUT
IT ISN'T WORKING».

Se midio con una sonda que juega los capitulos hacia adelante en los trece
mundos, y el reporte es correcto, aunque la causa no es la que parece: EL
MECANISMO ANDA. Poniendo al jugador encima de una flor y apretando USAR, la flor
se levanta y el contador sube. Lo que no anda es que SE PUEDA SABER.

Lo que pasa de verdad, medido:

  · Los trece mundos se traban SIEMPRE en el capitulo cuya mision pide juntar,
    cavar o prender N cosas — dunas cap 4, estepa cap 4, hielo cap 4, senda
    cap 1 —. Ahi el capitulo no se cierra hasta que `MISION.lista(cap)` sea
    cierto, y eso no pasa hasta juntar las cosas.
  · El MOJON del objetivo apunta al sitio del capitulo, nunca a las cosas. En
    hielo las tres fogatas estan repartidas en cuatrocientos metros: llegas al
    faro, no pasa nada, y la unica pista en pantalla es «faro · 0 m».
  · El boton USAR se prende, pero EN PC NO HAY BOTON A LA VISTA, y el renglon de
    aviso (`#aviso`) solo lo escribe el traslado del mundo: para una flor, para
    una fogata o para una persona quedaba VACIO. O sea: estabas encima de la
    cosa, con la tecla correcta debajo del dedo, y nada en la pantalla lo decia.

QUE SE HACE, y es lo mismo en los trece:

  1. EL MOJON APUNTA A LO QUE FALTA. Mientras la mision del capitulo no este
     lista, la marca 3D y los metros del HUD van a la cosa pendiente MAS CERCANA
     en vez de al objetivo, y el titulo dice que hay que juntar. Con esto la
     flecha siempre apunta a lo proximo que hay que hacer y los trece se pueden
     terminar sin adivinar.
  2. UN RENGLON QUE DICE QUE HACE EL BOTON. Nuevo `#pista`, debajo de los metros:
     dice «E · RECOGER» en PC y «◉ · RECOGER» con el dedo, y cambia segun lo que
     haya delante (recoger / hablar / seguir). Es un renglon aparte del `#aviso`
     del traslado a proposito: los dos pueden hacer falta a la vez. Se llama
     `pistaUso` y no `pista` porque acropolis ya tiene un `#pista` propio, el
     cartel del andamio, y pisarselo apagaba la mecanica de la obra.
  3. EL CONTADOR SE PRENDE SOLO cuando falta algo, sin depender de que la mision
     de cada mundo se acuerde de prenderlo. Si el mundo ya escribe el suyo
     («⛏ 1/3») se respeta; si no, se pone cuantas quedan.
"""
import pathlib, sys

A = pathlib.Path('/home/user/mundos/assets')
DEST = ['mundos/dunas.html', 'mundos/jungla.html', 'mundos/volcan.html',
        'mundos/pantano.html', 'mundos/canon.html', 'mundos/estepa.html',
        'mundos/acropolis.html', 'mundos/secuoya.html', 'mundos/marte.html',
        'mundos/luna.html', 'mundos/exo.html', 'mundos/hielo.html',
        'senda/senda.html']

CSS_VIEJO = "  #tarea.on{display:block}"
CSS_NUEVO = """  #tarea.on{display:block}
  /* PISTA: que hace el boton USAR ahora mismo. Sin esto el boton se prendia y
     listo, y en PC ni siquiera hay boton a la vista: estabas encima de la cosa
     sin una sola pista de que se podia levantar ni con que tecla. */
  #pistaUso{font-size:12px;font-weight:900;letter-spacing:.08em;margin-top:3px;
    display:none;color:#ffe9a8;text-shadow:0 1px 3px rgba(0,0,0,.75)}
  #pistaUso.on{display:block}"""

MK_VIEJO = '<div id="objD"></div><div id="tarea"></div></div>'
MK_NUEVO = '<div id="objD"></div><div id="tarea"></div><div id="pistaUso"></div></div>'

AYUDA = """/* ================= LO QUE FALTA, Y COMO SE AGARRA =========================
   Los trece mundos se trababan en el capitulo que pide juntar N cosas: el
   mecanismo andaba, pero el mojon apuntaba al sitio del capitulo y no a las
   cosas, y ningun renglon de la pantalla decia que existieran ni con que boton
   se levantan. Estas tres piezas son lo que lo arregla, y son iguales en los
   trece. */
const VERBO = {
  es: { item: 'RECOGER', npc: 'HABLAR', cap: 'SEGUIR',
        junta: 'Junta lo que falta', quedan: n => '◈ faltan ' + n },
  en: { item: 'PICK UP', npc: 'TALK',   cap: 'CONTINUE',
        junta: 'Collect what you need', quedan: n => '◈ ' + n + ' to go' },
  pt: { item: 'PEGAR',   npc: 'FALAR',  cap: 'SEGUIR',
        junta: 'Pega o que falta', quedan: n => '◈ faltam ' + n }
};
/* la cosa pendiente mas cercana: lo unico que los trece mundos tienen igual es
   la lista ITEMS, asi que la guia se arma con eso y no con la mision de cada uno */
function itemPendiente(){
  let mej = null, dm = 1e9;
  for (const it of ITEMS){
    if (!it.activo) continue;
    const d = Math.hypot(px - it.x, pz - it.z);
    if (d < dm){ dm = d; mej = it; }
  }
  return mej;
}
function pistaAccion(acc){
  const e = document.getElementById('pistaUso');
  if (!e) return;
  const V = VERBO[LANG] || VERBO.en;
  const tecla = document.body.classList.contains('sinTactil') ? 'E' : '◉';
  const t = (acc && V[acc.tipo]) ? tecla + ' · ' + V[acc.tipo] : '';
  e.textContent = t;
  e.classList.toggle('on', !!t && !enDlg);
}
"""

VIEJO_CAB = """function pasoObjetivo(){
  const C = CAPS[cap];
  const p = POI[C.obj];
  const d = Math.hypot(px - p.x, pz - p.z);
  $('objD').textContent = Math.round(d) + ' m';
  marca3d.position.set(p.x, H(p.x, p.z) + 6.5 + Math.sin(t0 * 2) * .5, p.z);"""

NUEVO_CAB = """function pasoObjetivo(){
  const C = CAPS[cap];
  const V = VERBO[LANG] || VERBO.en;
  /* EL MOJON APUNTA A LO QUE FALTA. Mientras la mision del capitulo no este
     lista el capitulo no se cierra, asi que apuntar al sitio del capitulo es
     mandar al jugador a un lugar donde no va a pasar nada —y era exactamente lo
     que pasaba: se trababan los trece—. Con la mision pendiente, la marca y los
     metros van a la cosa mas cercana que quede. Es seguro: `pend` solo existe
     cuando `MISION.lista(cap)` es falso, que es justo cuando el disparo
     automatico y la accion 'cap' ya estan apagados. */
  const pend = (MISION && MISION.lista && !MISION.lista(cap)) ? itemPendiente() : null;
  const p = pend || POI[C.obj];
  const d = Math.hypot(px - p.x, pz - p.z);
  $('objD').textContent = Math.round(d) + ' m';
  {
    const oT = $('objT');
    if (pend){
      if (!oT.dataset.orig) oT.dataset.orig = oT.textContent;
      oT.textContent = V.junta;
      const q = ITEMS.filter(i => i.activo).length;
      const ta = $('tarea');
      if (!ta.textContent) ta.textContent = V.quedan(q);
      ta.classList.add('on');
    } else if (oT.dataset.orig){
      oT.textContent = oT.dataset.orig;
      delete oT.dataset.orig;
    }
  }
  marca3d.position.set(p.x, H(p.x, p.z) + 6.5 + Math.sin(t0 * 2) * .5, p.z);"""

VIEJO_BOT = "  $('bUsar').classList.toggle('on', !!acc && !enDlg);"
NUEVO_BOT = ("  $('bUsar').classList.toggle('on', !!acc && !enDlg);\n"
             "  pistaAccion(acc);")

n = 0
for rel in DEST:
    p = A / rel
    s = p.read_text(encoding='utf-8')
    o = s
    err = []
    if "id=\"pistaUso\"" in s:
        print('  -- %s: ya' % rel); continue
    for viejo, nuevo, que in ((CSS_VIEJO, CSS_NUEVO, 'css'),
                              (MK_VIEJO, MK_NUEVO, 'markup'),
                              (VIEJO_CAB, NUEVO_CAB, 'cabecera de pasoObjetivo'),
                              (VIEJO_BOT, NUEVO_BOT, 'toggle del boton')):
        if s.count(viejo) != 1:
            err.append('%s aparece %d veces' % (que, s.count(viejo)))
        else:
            s = s.replace(viejo, nuevo, 1)
    if 'function pasoObjetivo' in s:
        s = s.replace('function pasoObjetivo(){', AYUDA + 'function pasoObjetivo(){', 1)
    else:
        err.append('no encuentro pasoObjetivo')
    if err:
        print('\n'.join('  !! %s: %s' % (rel, e) for e in err)); continue
    p.write_text(s, encoding='utf-8')
    n += 1
    print('  %s: guia a lo que falta + renglon de pista (%+d bytes)' % (rel, len(s) - len(o)))
print('%d de %d' % (n, len(DEST)))
sys.exit(0 if n == len(DEST) else 1)
