
/* ══════════════════════════ LOS LADRONES ══════════════════════════
   ── DISPARAN, Y AVISAN ANTES ──
   Sin que disparen, matarlos es un tramite: no hay nada que perder y el juego
   se convierte en una galeria. Y disparando SIN avisar, la camara lenta no
   sirve para nada, que es justo la mecanica que el juego tiene. El aviso es un
   laser rojo que apunta a donde va a salir la bala, y dura casi un segundo. */
const AVISO = 0.45;
/* la bala del ladron es mas lenta que la del jugador: se tiene que poder ver */
const BAL_LAD = 0.75;

function pasoLadrones(dt, alGolpe){
  for (const l of MUNDO.lad){
    if (!l.vivo) continue;
    l.t += dt;
    /* mira al jugador SIEMPRE: es lo unico que dice que esta vivo y atento */
    /* ── Y APUNTA AL CENTRO DE LA PISTOLA, NO A UN PALMO POR ENCIMA ──
       Estaba en `P.y + 0.75`, que es la altura de un cuerpo humano: la pistola
       no tiene cuerpo, es un punto de 13 cm de radio. Medido con la sonda del
       daño, el ladron a metro y medio disparaba dos veces en siete segundos y
       las dos balas pasaban SETENTA Y CINCO CENTIMETROS por encima — cero
       impactos, o sea que las tres vidas no significaban nada. */
    l.mira = Math.atan2(P.y - (l.y + 0.78), P.x - l.x);
    if (l.avisa > 0){
      l.avisa -= dt;
      if (l.avisa <= 0){
        /* ── EL ANGULO SE CONGELO AL EMPEZAR EL AVISO, NO SE ACTUALIZA ──
           Si la bala saliera hacia donde el jugador esta AHORA, el laser habria
           mentido y esquivar seria imposible. El aviso tiene que ser una
           promesa. */
        const dx = Math.cos(l.tira), dy = Math.sin(l.tira);
        BAL.push({ x: l.x + dx*0.5, y: l.y + 0.78 + dy*0.5, dx, dy,
                   v: M.bala*BAL_LAD, t: 1.6, mia: false });
        alGolpe('lad_tira', l.x, l.y + 0.78, l);
        l.cd = l.espera;
      }
      continue;
    }
    l.cd -= dt;
    if (l.cd <= 0){
      /* solo apunta si TIENE linea: un ladron que dispara contra su propia losa
         gasta el aviso y no pasa nada, y el jugador aprende a ignorar el laser */
      /* ── Y APUNTA A DONDE ESTA, NO A DONDE VA A ESTAR ──
         Probe adelantar el tiro y hay que anotar por que se descarto: con la
         gravedad en 22 y casi un segundo entre el laser y el impacto, la
         prediccion balistica manda el punto ONCE METROS abajo — mas de tres
         pisos — asi que el ladron apuntaba contra su propia losa y no encendia
         el laser ni una vez en 900 cuadros. Predecir un segundo de una pistola
         que rebota no es dificil, es que no significa nada.
         Lo que si funciona es acortar el horizonte: el aviso baja a 0,45 s y la
         bala sube a 0,75 de la del jugador, o sea que del laser al impacto pasa
         poco mas de medio segundo. Esquivar deja de ser adivinar y pasa a ser
         reaccionar, que es exactamente para lo que esta la camara lenta. */
      const h = rayo(l.x + Math.cos(l.mira)*0.5, l.y + 0.78 + Math.sin(l.mira)*0.5,
                     Math.cos(l.mira), Math.sin(l.mira), 40, true);
      const d = Math.hypot(P.x - l.x, P.y - l.y);
      if (!h || h.t > d - 0.9){ l.avisa = AVISO; l.tira = l.mira; }
      else l.cd = 0.5;
    }
  }
}

function vivos(){ let n = 0; for (const l of MUNDO.lad) if (l.vivo) n++; return n; }
