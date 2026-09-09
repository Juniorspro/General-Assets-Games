/* ===========================================================================
   Frutiger Aero — el escritorio

   Cinco cosas, en este orden:
     1. la sesión (invitado o Google)
     2. las ventanas, la barra de tareas y el menú de inicio
     3. el panel de control, que retiñe el vidrio de verdad
     4. buscaminas, el bloc y el reproductor
     5. los adornos: reloj y burbujas

   NADA SE GUARDA EN UN SERVIDOR. El perfil de Google se verifica del lado del
   servidor —para que nadie entre con un token inventado— pero después vive en
   el navegador de quien entró. Las notas, el color del vidrio y el récord del
   buscaminas también. Es un escritorio de adorno: no hay nada que proteger, y
   una base de datos acá sería pedir datos de gente a cambio de nada.
   =========================================================================== */
(function(){
"use strict";

var $  = function(i){ return document.getElementById(i); };
var $$ = function(s, r){ return [].slice.call((r||document).querySelectorAll(s)); };
var quieto = matchMedia("(prefers-reduced-motion:reduce)").matches;

/* almacenamiento que no explota: en pestaña privada localStorage tira, y una
   página que se cae por no poder guardar una preferencia es una página rota */
var caja = {
  leer: function(k, x){ try{ var v = localStorage.getItem("fa."+k); return v===null?x:JSON.parse(v); }catch(e){ return x; } },
  poner: function(k, v){ try{ localStorage.setItem("fa."+k, JSON.stringify(v)); }catch(e){} },
  sacar: function(k){ try{ localStorage.removeItem("fa."+k); }catch(e){} }
};

/* =========================================================== 1 · la sesión */
var usuario = caja.leer("usuario", null);

function retratoDe(u){
  if (u && u.foto) return '<img class="r" src="'+u.foto+'" alt="" referrerpolicy="no-referrer">';
  return '<img class="r" src="img/mascota/m-saludando.463f6804.webp" alt="">';
}

function entrar(u){
  usuario = u;
  caja.poner("usuario", u);
  var b = $("bienvenida");
  b.hidden = false;
  $("logon").classList.add("yendo");
  setTimeout(function(){
    $("logon").hidden = true;
    b.hidden = true;
    document.body.classList.remove("sinsesion");
    $("escritorio").hidden = false;
    pintarUsuario();
    quizasColaborar();
    document.dispatchEvent(new CustomEvent("hay-sesion"));
  }, quieto ? 60 : 1500);
}

function salir(){
  caja.sacar("usuario");
  location.reload();
}

function pintarUsuario(){
  if (!usuario) return;
  $("quien-nombre").textContent = usuario.nombre;
  $("quien-rol").textContent = usuario.via === "google" ? usuario.correo : "Cuenta local de este dispositivo";
  $("quien-retrato").innerHTML = retratoDe(usuario);
  $("hola").textContent = "Hola, " + usuario.nombre.split(" ")[0];
}

/* --- invitado --- */
function comoInvitado(){
  var n = ($("nombre").value || "").trim().slice(0, 28);
  if (!n){ $("nombre").focus(); $("nombre").placeholder = "Escribí un nombre, el que quieras"; return; }
  entrar({ nombre:n, via:"local" });
}
$("flecha").addEventListener("click", comoInvitado);
$("nombre").addEventListener("keydown", function(e){ if (e.key === "Enter") comoInvitado(); });

/* --- Google ---
   El identificador de cliente NO está en el código: lo sirve /api/config desde
   una variable de entorno, así se cambia desde el panel de Cloudflare sin
   volver a publicar. Si no hay ninguno, el botón lo dice en lugar de fallar.

   ENTRAR CON GOOGLE DA UNA CUENTA DE VERDAD, la misma que se crea a mano con
   usuario y contraseña: se puede publicar, tener perfil y pedir el acceso.
   Antes devolvía un nombre y una foto que vivían sólo acá, así que entrar con
   Google era entrar a un escritorio de adorno y nada más.

   El token NO se lee acá. Un JWT es texto firmado: leerlo sin comprobar la
   firma es creerle a quien lo mandó. Lo comprueba el servidor. */
var CLIENTE = null, NUMERO = null, TICKET = null;

fetch("api/config").then(function(r){ return r.ok ? r.json() : null; }).then(function(c){
  if (c && c.auto) {
    AUTO = c.auto;
    if (AUTO.prueba) avisarPrueba();
    armarPaypal();
  }
  if (c && c.pago) { pago = c.pago; }
  pintarMontos();
  mirarLaVuelta();
  CLIENTE = c && c.google;
  if (!CLIENTE){ $("sin-google").hidden = false; return; }
  var s = document.createElement("script");
  s.src = "https://accounts.google.com/gsi/client";
  s.async = true; s.defer = true;
  s.onload = armarGoogle;
  s.onerror = function(){ $("sin-google").hidden = false; };
  document.head.appendChild(s);
}).catch(function(){ $("sin-google").hidden = false; });

/* El número de un solo uso. Va DENTRO del token que firma Google, así que ata
   ese token a este inicio de sesión: uno robado de otro lado no entra. Vence,
   por eso se pide otro cada tanto mientras la pantalla sigue abierta. */
function pedirNumero(){
  return fetch("api/entrar").then(function(r){ return r.json(); })
    .then(function(j){ NUMERO = j.numero; return NUMERO; });
}

function armarGoogle(){
  if (!window.google || !google.accounts || !google.accounts.id) return;
  pedirNumero().then(dibujar).catch(function(){ $("sin-google").hidden = false; });
  setInterval(function(){
    if ($("logon").hidden) return;      /* ya entró: no hay nada que refrescar */
    pedirNumero().then(dibujar).catch(function(){});
  }, 20 * 60000);
}

function dibujar(){
  google.accounts.id.initialize({
    client_id: CLIENTE,
    nonce: NUMERO,
    callback: function(resp){ mandarToken(resp.credential); }
  });
  $("gbt").hidden = true;
  $("gsi").textContent = "";
  google.accounts.id.renderButton($("gsi"), {
    theme:"outline", size:"large", shape:"rectangular", width:330,
    text:"continue_with", locale:"es"
  });
}

function avisoG(t){
  var a = $("g-aviso");
  if (!t){ a.hidden = true; return; }
  a.hidden = false; a.textContent = t;
}

/* de acá salen los dos finales: o ya tiene cuenta y entra, o hay que pedirle
   el nombre de usuario */
function mandarToken(credential){
  $("g-error").hidden = true;
  llamarEntrar({ credential: credential, numero: NUMERO }).then(function(j){
    if (j.pase) return conCuenta(j);
    if (j.nuevo){
      TICKET = j.ticket;
      $("paso1").hidden = true;
      $("paso2").hidden = false;
      $("g-quien").textContent = j.correo
        ? "Entraste como " + j.correo + ". Falta una cosa:"
        : "Falta una cosa:";
      $("g-usuario").value = j.sugerido || "";
      $("g-usuario").dataset.nombre = j.nombre || "";
      if (j.foto) $("g-usuario").dataset.foto = j.foto;
      verMuestra();
      $("g-usuario").focus();
      $("g-usuario").select();
    }
  }).catch(function(e){
    /* el error vuelve a la pantalla de entrada, que es donde está mirando */
    $("paso2").hidden = true; $("paso1").hidden = false;
    var n = $("g-error"); n.hidden = false; n.textContent = e.message;
  });
}

function llamarEntrar(cuerpo){
  return fetch("api/entrar", {
    method:"POST", headers:{"content-type":"application/json"},
    body: JSON.stringify(cuerpo)
  }).then(function(r){
    return r.json().then(function(j){
      if (!r.ok) throw new Error(j.error || ("error " + r.status));
      return j;
    });
  });
}

/* la sesión de la cuenta es la MISMA que usa el muro: se guarda donde la
   busca, y se avisa por si esa parte ya se cargó */
function conCuenta(j){
  var ses = { pase: j.pase, yo: j.yo };
  caja.poner("sesion", ses);
  document.dispatchEvent(new CustomEvent("cuenta-lista", { detail: ses }));
  entrar({ nombre: j.yo.nombre, foto: j.foto || null,
           correo: j.correo || null, via: "google" });
}

function verMuestra(){
  var v = ($("g-usuario").value || "").toLowerCase().trim();
  $("g-muestra").textContent = "@" + (v || "vos");
}

if ($("g-usuario")) {
  $("g-usuario").addEventListener("input", verMuestra);
  $("g-usuario").addEventListener("keydown", function(e){
    if (e.key === "Enter") $("g-listo").click();
  });

  $("g-listo").addEventListener("click", function(){
    var u = ($("g-usuario").value || "").toLowerCase().trim();
    if (!/^[a-z0-9](?:[a-z0-9_.]{1,18}[a-z0-9])$/.test(u)){
      avisoG("En minúsculas, de 3 a 20, sin espacios ni acentos."); return;
    }
    avisoG("Creando tu cuenta…");
    llamarEntrar({ hacer:"registrar", ticket: TICKET, usuario: u,
                   nombre: $("g-usuario").dataset.nombre })
      .then(conCuenta).catch(function(e){ avisoG(e.message); });
  });

  $("g-vincular").addEventListener("click", function(){
    avisoG("Pegando tu Google…");
    llamarEntrar({ hacer:"vincular", ticket: TICKET,
                   usuario: $("g-vi-us").value, clave: $("g-vi-cl").value })
      .then(conCuenta).catch(function(e){ avisoG(e.message); });
  });
  $("g-vi-cl").addEventListener("keydown", function(e){
    if (e.key === "Enter") $("g-vincular").click();
  });

  $("g-volver").addEventListener("click", function(){
    TICKET = null; avisoG("");
    $("paso2").hidden = true; $("paso1").hidden = false;
  });
}

$("gbt").addEventListener("click", function(){
  if (!CLIENTE) { $("sin-google").hidden = false; $("sin-google").scrollIntoView({block:"nearest"}); }
});

/* --- apagar --- */
$("apagar").addEventListener("click", function(){
  var n = document.createElement("div");
  n.style.cssText = "position:fixed;inset:0;z-index:400;background:#000;opacity:0;" +
    "transition:opacity .8s ease;display:grid;place-items:center;color:#8ea6c0;" +
    "font:300 20px/1 var(--tipo)";
  n.textContent = "Cerrando sesión…";
  document.body.appendChild(n);
  requestAnimationFrame(function(){ n.style.opacity = "1"; });
  setTimeout(function(){ location.reload(); }, 2600);
});

if (usuario){
  $("logon").hidden = true;
  document.body.classList.remove("sinsesion");
  $("escritorio").hidden = false;
  pintarUsuario();
} else {
  document.body.classList.add("sinsesion");
}

/* ================================================= 2 · ventanas y tareas */
var abajo = $("tareas");

function guardarVentana(id){
  var v = $(id); if (!v || v.hidden) return;
  var nombre = v.querySelector(".titulo .txt").textContent;
  v.hidden = true;
  var b = document.createElement("button");
  b.className = "tarea"; b.type = "button"; b.textContent = nombre;
  b.dataset.para = id;
  b.addEventListener("click", function(){ abrir(id); });
  abajo.appendChild(b);
}

function abrir(id){
  var v = $(id); if (!v) return;
  v.hidden = false;
  var t = abajo.querySelector('[data-para="'+id+'"]');
  if (t) t.remove();
  cerrarInicio();
  v.scrollIntoView({ behavior: quieto ? "auto" : "smooth", block:"start" });
}

document.addEventListener("click", function(e){
  var b = e.target.closest("[data-cerrar],[data-min],[data-abrir]");
  if (!b) return;
  if (b.dataset.abrir) { abrir(b.dataset.abrir); return; }
  guardarVentana(b.dataset.cerrar || b.dataset.min);
});

/* --- menú de inicio --- */
function cerrarInicio(){ $("inicio").hidden = true; $("orbe").setAttribute("aria-expanded","false"); }
$("orbe").addEventListener("click", function(e){
  e.stopPropagation();
  var m = $("inicio");
  m.hidden = !m.hidden;
  $("orbe").setAttribute("aria-expanded", String(!m.hidden));
});
document.addEventListener("click", function(e){
  if (!$("inicio").hidden && !e.target.closest("#inicio") && !e.target.closest("#orbe")) cerrarInicio();
});
document.addEventListener("keydown", function(e){ if (e.key === "Escape") cerrarInicio(); });
$("cerrar-sesion").addEventListener("click", salir);

/* ============================================== 3 · el panel de control */
var ajustes = caja.leer("ajustes", { tono:210, sat:52, vidrio:82, fondo:"pasto", burbujas:true });

var FONDOS = {
  pasto:  { ancho:'url("img/fondo.06222548.webp")', alto:'url("img/fondo-alto.550e8e84.webp")' },
  aurora: { ancho:"linear-gradient(180deg,#04203f,#0c4a7e 40%,#1e8fa8 70%,#7fe0cf)",
            alto:  "linear-gradient(180deg,#04203f,#0c4a7e 40%,#1e8fa8 70%,#7fe0cf)" },
  vidrio: { ancho:"radial-gradient(120% 90% at 30% 10%,#bfe9ff,#2f7fd0 45%,#0a3a6b)",
            alto:  "radial-gradient(120% 90% at 30% 10%,#bfe9ff,#2f7fd0 45%,#0a3a6b)" }
};

function aplicar(){
  var r = document.documentElement.style;
  r.setProperty("--tono", ajustes.tono);
  r.setProperty("--sat", ajustes.sat + "%");
  r.setProperty("--vidrio", ajustes.vidrio + "%");
  var f = FONDOS[ajustes.fondo] || FONDOS.pasto;
  r.setProperty("--fondo", f.ancho);
  r.setProperty("--fondo-alto", f.alto);
  document.querySelector('meta[name="theme-color"]')
    .setAttribute("content", "hsl(" + ajustes.tono + " " + ajustes.sat + "% 34%)");
  caja.poner("ajustes", ajustes);
}
aplicar();

function conectarControl(){
  var t = $("c-tono"), s = $("c-sat"), v = $("c-vidrio");
  t.value = ajustes.tono; s.value = ajustes.sat; v.value = ajustes.vidrio;
  function cambia(){
    ajustes.tono = +t.value; ajustes.sat = +s.value; ajustes.vidrio = +v.value;
    aplicar();
  }
  [t,s,v].forEach(function(x){ x.addEventListener("input", cambia); });

  $$("#c-fondos button").forEach(function(b){
    b.setAttribute("aria-pressed", String(b.dataset.fondo === ajustes.fondo));
    b.addEventListener("click", function(){
      ajustes.fondo = b.dataset.fondo; aplicar();
      $$("#c-fondos button").forEach(function(o){
        o.setAttribute("aria-pressed", String(o === b));
      });
    });
  });

  var bu = $("c-burbujas");
  bu.checked = !!ajustes.burbujas;
  bu.addEventListener("change", function(){
    ajustes.burbujas = bu.checked; caja.poner("ajustes", ajustes); burbujas();
  });

  $("c-reset").addEventListener("click", function(){
    ajustes = { tono:210, sat:52, vidrio:82, fondo:"pasto", burbujas:true };
    aplicar(); conectarControl(); burbujas();
  });
}

/* ==================================================== 4 · el buscaminas */
var MINAS = (function(){
  var L = 9, BOMBAS = 10;
  var campo, tapa, bandera, viva, empezado, t0, reloj, marcadas;

  function vecinos(i){
    var f = Math.floor(i/L), c = i%L, r = [];
    for (var df=-1; df<=1; df++) for (var dc=-1; dc<=1; dc++){
      if (!df && !dc) continue;
      var nf = f+df, nc = c+dc;
      if (nf>=0 && nf<L && nc>=0 && nc<L) r.push(nf*L+nc);
    }
    return r;
  }

  function nuevo(){
    campo = new Array(L*L).fill(0);
    tapa = new Array(L*L).fill(true);
    bandera = new Array(L*L).fill(false);
    viva = true; empezado = false; marcadas = 0;
    clearInterval(reloj); $("m-tiempo").textContent = "000";
    $("m-minas").textContent = String(BOMBAS).padStart(3,"0");
    $("m-estado").textContent = "Tocá una casilla para empezar";
    dibujar();
  }

  /* las bombas se reparten DESPUÉS del primer toque y nunca sobre él: si no,
     se puede perder en el primer clic, que es lo único que no se perdona */
  function sembrar(libre){
    var prohibidas = vecinos(libre).concat([libre]);
    var puestas = 0;
    while (puestas < BOMBAS){
      var i = Math.floor(Math.random()*L*L);
      if (campo[i] === -1 || prohibidas.indexOf(i) >= 0) continue;
      campo[i] = -1; puestas++;
    }
    for (var j=0; j<L*L; j++){
      if (campo[j] === -1) continue;
      campo[j] = vecinos(j).filter(function(v){ return campo[v] === -1; }).length;
    }
  }

  function destapar(i){
    if (!viva || !tapa[i] || bandera[i]) return;
    tapa[i] = false;
    if (campo[i] === -1){ perder(); return; }
    if (campo[i] === 0) vecinos(i).forEach(destapar);
  }

  function perder(){
    viva = false; clearInterval(reloj);
    for (var i=0;i<L*L;i++) if (campo[i] === -1) tapa[i] = false;
    $("m-estado").textContent = "Explotó. Probá de nuevo.";
  }

  function ganar(){
    viva = false; clearInterval(reloj);
    var seg = Math.floor((Date.now()-t0)/1000);
    var rec = caja.leer("minas-record", null);
    if (rec === null || seg < rec){ caja.poner("minas-record", seg); rec = seg; }
    $("m-estado").textContent = "¡Ganaste en " + seg + " s! Récord: " + rec + " s";
  }

  function dibujar(){
    var g = $("m-campo"), h = "";
    for (var i=0;i<L*L;i++){
      if (tapa[i]){
        h += '<button type="button" data-i="'+i+'">' + (bandera[i] ? "⚑" : "") + "</button>";
      } else if (campo[i] === -1){
        h += '<button type="button" class="abierta boom" disabled>✳</button>';
      } else {
        h += '<button type="button" class="abierta n'+campo[i]+'" disabled>' +
             (campo[i] || "") + "</button>";
      }
    }
    g.style.gridTemplateColumns = "repeat("+L+",auto)";
    g.innerHTML = h;
    $("m-minas").textContent = String(Math.max(0, BOMBAS - marcadas)).padStart(3,"0");
  }

  function tocar(i, conBandera){
    if (!viva) return;
    if (!empezado){
      sembrar(i); empezado = true; t0 = Date.now();
      reloj = setInterval(function(){
        $("m-tiempo").textContent =
          String(Math.min(999, Math.floor((Date.now()-t0)/1000))).padStart(3,"0");
      }, 500);
      $("m-estado").textContent = "En juego · mantené apretado para la bandera";
    }
    if (conBandera){
      if (!tapa[i]) return;
      bandera[i] = !bandera[i];
      marcadas += bandera[i] ? 1 : -1;
    } else {
      destapar(i);
      if (viva && tapa.filter(Boolean).length === BOMBAS) ganar();
    }
    dibujar();
  }

  return { nuevo:nuevo, tocar:tocar };
})();

function conectarMinas(){
  MINAS.nuevo();
  $("m-nuevo").addEventListener("click", MINAS.nuevo);
  var largo = null;
  var g = $("m-campo");
  g.addEventListener("contextmenu", function(e){ e.preventDefault(); });
  g.addEventListener("pointerdown", function(e){
    var b = e.target.closest("button[data-i]"); if (!b) return;
    var i = +b.dataset.i;
    if (e.button === 2){ MINAS.tocar(i, true); largo = "hecho"; return; }
    /* en el celular no hay clic derecho: la bandera es mantener apretado */
    largo = setTimeout(function(){ largo = "hecho"; MINAS.tocar(i, true); }, 420);
  });
  g.addEventListener("pointerup", function(e){
    var b = e.target.closest("button[data-i]");
    if (largo && largo !== "hecho"){ clearTimeout(largo); if (b) MINAS.tocar(+b.dataset.i, false); }
    largo = null;
  });
  g.addEventListener("pointercancel", function(){ if (largo && largo !== "hecho") clearTimeout(largo); largo = null; });
}

/* ========================================================= el bloc */
function conectarBloc(){
  var t = $("bloc"), aviso = $("bloc-ok"), tid;
  t.value = caja.leer("notas", "");
  t.addEventListener("input", function(){
    clearTimeout(tid);
    tid = setTimeout(function(){
      caja.poner("notas", t.value);
      aviso.textContent = "Guardado " + new Date().toLocaleTimeString("es-AR",{hour:"2-digit",minute:"2-digit"});
    }, 400);
  });
  $("bloc-borrar").addEventListener("click", function(){
    if (!t.value || confirm("¿Borrar todas las notas?")){ t.value = ""; caja.poner("notas",""); aviso.textContent = "Vacío."; }
  });
}

/* ==================================================== el reproductor */
function conectarRepro(){
  var a = $("audio"), cv = $("visor"), X = cv.getContext("2d");
  var barra = $("r-barra"), vol = $("r-vol"), tt = $("r-t"), bp = $("r-play");
  var ctx, an, datos, lazo;

  function reloj(s){
    if (!isFinite(s)) return "0:00";
    var m = Math.floor(s/60), q = Math.floor(s%60);
    return m + ":" + (q<10?"0":"") + q;
  }
  function icono(tocando){
    bp.innerHTML = tocando
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="4.5" width="4.2" height="15" rx="1" fill="currentColor"/><rect x="13.8" y="4.5" width="4.2" height="15" rx="1" fill="currentColor"/></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.6l12 7.4-12 7.4z" fill="currentColor"/></svg>';
    bp.setAttribute("aria-label", tocando ? "Pausar" : "Reproducir");
  }
  icono(false);

  /* el analizador se crea al primer toque: un AudioContext armado antes de que
     la persona interactúe arranca suspendido y no vuelve solo */
  function analizar(){
    if (ctx) return;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    an = ctx.createAnalyser(); an.fftSize = 128;
    ctx.createMediaElementSource(a).connect(an);
    an.connect(ctx.destination);
    datos = new Uint8Array(an.frequencyBinCount);
  }

  function pintar(){
    var w = cv.width = cv.clientWidth * (devicePixelRatio > 1 ? 2 : 1);
    var h = cv.height = 152;
    X.clearRect(0,0,w,h);
    var g = X.createLinearGradient(0,0,0,h);
    g.addColorStop(0,"#8ff0e0"); g.addColorStop(.5,"#4fc3ea"); g.addColorStop(1,"#1a6ea8");
    X.fillStyle = g;
    var n = 32, an2 = an;
    if (an2) an2.getByteFrequencyData(datos);
    var ancho = w/n;
    for (var i=0;i<n;i++){
      var v = an2 ? datos[i]/255 : 0.06 + 0.05*Math.sin(i*0.7 + Date.now()/700);
      var alto = Math.max(3, v*h*0.92);
      X.fillRect(i*ancho+ancho*0.18, h-alto, ancho*0.64, alto);
    }
    lazo = requestAnimationFrame(pintar);
  }

  bp.addEventListener("click", function(){
    analizar();
    if (ctx && ctx.state === "suspended") ctx.resume();
    if (a.paused){ a.play(); } else { a.pause(); }
  });
  a.addEventListener("play", function(){ icono(true); if (!lazo && !quieto) pintar(); });
  a.addEventListener("pause", function(){ icono(false); cancelAnimationFrame(lazo); lazo = null; });
  a.addEventListener("timeupdate", function(){
    if (!a.duration) return;
    barra.value = (a.currentTime / a.duration * 1000) | 0;
    tt.textContent = reloj(a.currentTime) + " / " + reloj(a.duration);
  });
  barra.addEventListener("input", function(){
    if (a.duration) a.currentTime = barra.value / 1000 * a.duration;
  });
  vol.value = Math.round((caja.leer("volumen", 0.7)) * 100);
  a.volume = vol.value/100;
  vol.addEventListener("input", function(){
    a.volume = vol.value/100; caja.poner("volumen", a.volume);
  });
  pintar(); cancelAnimationFrame(lazo); lazo = null;   /* un cuadro en reposo */
}

/* ================================================== 5 · reloj y burbujas */
var DIAS = ["domingo","lunes","martes","miércoles","jueves","viernes","sábado"];
var MESES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto",
             "septiembre","octubre","noviembre","diciembre"];
function dos(n){ return (n<10?"0":"") + n; }
function hora(){
  var f = new Date(), hm = dos(f.getHours()) + ":" + dos(f.getMinutes());
  if ($("reloj")) $("reloj").textContent = hm;
  if ($("t-hora")) $("t-hora").textContent = hm;
  var d = DIAS[f.getDay()] + ", " + f.getDate() + " de " + MESES[f.getMonth()];
  /* mayúscula sólo en la primera letra: `capitalize` las pone en cada palabra
     y quedaba «Miércoles, 9 De Septiembre» */
  if ($("fecha")) $("fecha").textContent = d.charAt(0).toUpperCase() + d.slice(1);
  if ($("t-dia")) $("t-dia").textContent = f.getDate() + "/" + dos(f.getMonth()+1);
}
hora(); setInterval(hora, 15000);

function burbujas(){
  var c = $("burbujas");
  if (quieto || !ajustes.burbujas){ c.innerHTML = ""; return; }
  var h = "";
  for (var i=0;i<16;i++){
    var d = 10 + Math.random()*46;
    h += '<span class="bu" style="left:'+(Math.random()*100).toFixed(1)+'%;'+
         'width:'+d.toFixed(0)+'px;height:'+d.toFixed(0)+'px;'+
         '--dx:'+(Math.random()*90-45).toFixed(0)+'px;'+
         'animation-duration:'+(13+Math.random()*16).toFixed(1)+'s;'+
         'animation-delay:-'+(Math.random()*24).toFixed(1)+'s"></span>';
  }
  c.innerHTML = h;
}
burbujas();

/* ==================================================== la paleta y las poses */
var COLORES = [
  ["#4580c4","Aero"], ["#1c4f8f","Profundo"], ["#7fd6e8","Agua"],
  ["#bff0f6","Espuma"], ["#7cc242","Pasto"], ["#2b9c62","Hoja"],
  ["#ffd23f","Sol"], ["#f0f0f0","Cara"], ["#0b1420","Dark Aero"]
];
$("paleta").innerHTML = COLORES.map(function(c){
  return '<li><button type="button" data-hex="'+c[0]+'" title="'+c[1]+'">'+
         '<i style="background:'+c[0]+'"></i><small>'+c[0]+'</small></button></li>';
}).join("");
$("paleta").addEventListener("click", function(e){
  var b = e.target.closest("button[data-hex]"); if (!b) return;
  var hex = b.dataset.hex, aviso = $("copiado");
  var listo = function(){
    aviso.textContent = "Copiado " + hex; aviso.hidden = false;
    clearTimeout(listo.t); listo.t = setTimeout(function(){ aviso.hidden = true; }, 1800);
  };
  if (navigator.clipboard && navigator.clipboard.writeText)
    navigator.clipboard.writeText(hex).then(listo, listo);
  else listo();
});

var POSES = [
  ["m-saludando.463f6804.webp","saludando"], ["m-paz.b7d4f491.webp","haciendo la V"],
  ["m-burbuja.b9fcd8c5.webp","con una burbuja"], ["m-agua.f3af4fab.webp","en el agua"],
  ["m-surf.b7132097.webp","haciendo surf"], ["m-nube.684daf29.webp","en una nube"],
  ["m-juego.66c8b81c.webp","jugando"], ["m-dormido.13aeff0c.webp","dormida"]
];
$("poses").innerHTML = POSES.map(function(p,i){
  return '<li><button type="button" data-src="img/mascota/'+p[0]+'" aria-pressed="'+(i===0)+'" '+
         'title="La mascota '+p[1]+'"><img src="img/mascota/'+p[0]+'" alt="La mascota '+p[1]+'" '+
         'loading="lazy" width="760" height="760"></button></li>';
}).join("");
$("poses").addEventListener("click", function(e){
  var b = e.target.closest("button[data-src]"); if (!b) return;
  var l = $("lienzo");
  if (l && !l.hidden) return;      /* si el 3D ya tomó el mando, no lo pisamos */
  $("respaldo").src = b.dataset.src;
  $$("button", this).forEach(function(o){ o.setAttribute("aria-pressed", String(o === b)); });
});

/* =========================================================== 6 · colaborar
   Aparece una vez, DESPUÉS de entrar, y siempre se puede cerrar. Un muro de
   donaciones que no deja pasar no recauda: espanta. Por eso «Ahora no» es un
   botón normal, del mismo tamaño que el otro, y la respuesta se recuerda:

     · «Ahora no»          -> no vuelve por 30 días
     · «Ya colaboré»       -> no vuelve más
     · el icono y el menú  -> se puede abrir cuando se quiera

   Los datos de cobro NO están en el código: los sirve /api/config desde
   variables de entorno, igual que el identificador de Google. Así se cambian
   desde el panel de Cloudflare sin volver a publicar, y si no hay ninguno la
   pantalla lo dice en vez de mostrar botones que no llevan a ningún lado. */
var MONTOS = {
  ars: { simbolo: "$",   pasos: [1000, 2500, 5000, 10000], porDefecto: 2500 },
  usd: { simbolo: "US$", pasos: [3, 5, 10, 25],            porDefecto: 5 }
};
var pago = null, moneda = "ars", monto = MONTOS.ars.porDefecto;

function plata(n){ return n.toLocaleString("es-AR"); }

function pintarMontos(){
  var m = MONTOS[moneda];
  $("dona-simbolo").textContent = m.simbolo;
  $("dona-montos").innerHTML = m.pasos.map(function(v){
    return '<button type="button" data-monto="' + v + '" aria-pressed="' +
           (v === monto) + '">' + m.simbolo + " " + plata(v) + "</button>";
  }).join("");
  $$("#dona-monedas button").forEach(function(b){
    b.setAttribute("aria-pressed", String(b.dataset.moneda === moneda));
  });
  enlacesDePago();
}

function enlacesDePago(){
  var mp = $("dona-mp"), pp = $("dona-pp");

  /* Mercado Pago cobra en pesos y PayPal en dólares. Ofrecer el que no
     corresponde es mandar a alguien a una pantalla que no le va a servir. */
  var autoMP = AUTO && AUTO.mp && moneda === "ars";
  var autoPP = AUTO && AUTO.paypal && moneda === "usd";
  var hayMP = (autoMP || (pago && (pago.mpLink || pago.mpAlias))) && moneda === "ars";
  var hayPP = (autoPP || (pago && pago.paypal)) && moneda === "usd";

  /* con PayPal automático mandan los botones propios de PayPal, no el enlace */
  if ($("pp-botones")) $("pp-botones").hidden = !autoPP;
  if (autoPP && window.paypal) pintarPaypal();
  $("dona-pp").hidden = !!autoPP;

  mp.setAttribute("aria-disabled", String(!hayMP));
  pp.setAttribute("aria-disabled", String(!hayPP));

  if (hayMP){
    mp.href = pago.mpLink || "#";
    $("dona-mp-pie").textContent = autoMP
      ? "Pagás y entrás solo · " + MONTOS.ars.simbolo + " " + plata(monto)
      : (pago.mpLink ? "Link de pago · " + MONTOS.ars.simbolo + " " + plata(monto)
                     : "Copiá el alias de acá abajo · " + MONTOS.ars.simbolo + " " + plata(monto));
  } else {
    mp.href = "#";
    $("dona-mp-pie").textContent = moneda === "usd"
      ? "Es en pesos — pasá a pesos" : "Sin datos cargados";
  }

  if (hayPP){
    /* paypal.me sí acepta el monto en la dirección, así que llega escrito */
    pp.href = "https://www.paypal.com/paypalme/" +
              encodeURIComponent(pago.paypal) + "/" + monto + "USD";
    $("dona-pp-pie").textContent = "Tarjeta o saldo · US$ " + plata(monto);
  } else {
    pp.href = "#";
    $("dona-pp-pie").textContent = moneda === "ars"
      ? "Cobra en dólares — pasá a dólares" : "Sin datos cargados";
  }

  var fila = $("dona-alias");
  if (pago && pago.mpAlias && moneda === "ars" && !autoMP){
    fila.hidden = false; $("dona-alias-txt").textContent = pago.mpAlias;
  } else fila.hidden = true;

  $("dona-nada").hidden = !!(hayMP || hayPP || (pago && (pago.mpAlias || pago.paypal)));
}

function cerrarDona(recordar){
  $("fondoDona").hidden = true;
  if (recordar === "listo") caja.poner("colaboro", 1);
  else if (recordar === "luego") caja.poner("donaVisto", Date.now());
}

function abrirDona(){
  $("fondoDona").hidden = false;
  cerrarInicio();
  pintarMontos();
}

function quizasColaborar(){
  if (caja.leer("colaboro", 0)) return;              // ya dijo que sí
  var visto = caja.leer("donaVisto", 0);
  if (Date.now() - visto < 30*24*3600*1000) return;  // dijo «ahora no» hace poco
  setTimeout(abrirDona, 900);
}

$("dona-x").addEventListener("click", function(){ cerrarDona("luego"); });
$("dona-luego").addEventListener("click", function(){ cerrarDona("luego"); });
$("dona-listo").addEventListener("click", function(){ cerrarDona("listo"); });
$("ic-dona").addEventListener("click", abrirDona);
$("mi-dona").addEventListener("click", abrirDona);
$("fondoDona").addEventListener("click", function(e){
  if (e.target === this) cerrarDona("luego");
});
document.addEventListener("keydown", function(e){
  if (e.key === "Escape" && !$("fondoDona").hidden) cerrarDona("luego");
});

$("dona-monedas").addEventListener("click", function(e){
  var b = e.target.closest("button[data-moneda]"); if (!b) return;
  moneda = b.dataset.moneda;
  monto = MONTOS[moneda].porDefecto;
  $("dona-otro").value = "";
  pintarMontos();
});
$("dona-montos").addEventListener("click", function(e){
  var b = e.target.closest("button[data-monto]"); if (!b) return;
  monto = +b.dataset.monto; $("dona-otro").value = "";
  pintarMontos();
});
$("dona-otro").addEventListener("input", function(){
  var v = Math.floor(+this.value);
  if (v > 0){ monto = v; pintarMontos();
    $$("#dona-montos button").forEach(function(b){ b.setAttribute("aria-pressed","false"); });
  }
});
$("dona-copiar").addEventListener("click", function(){
  var t = $("dona-alias-txt").textContent, b = this;
  var ok = function(){ b.textContent = "Copiado"; setTimeout(function(){ b.textContent = "Copiar"; }, 1600); };
  if (navigator.clipboard && navigator.clipboard.writeText)
    navigator.clipboard.writeText(t).then(ok, ok);
  else ok();
});
["dona-mp","dona-pp"].forEach(function(id){
  $(id).addEventListener("click", function(e){
    if (this.getAttribute("aria-disabled") === "true"){ e.preventDefault(); return; }
    /* con cobro automático el botón no lleva a un enlace: arranca el trámite */
    if (id === "dona-mp" && AUTO && AUTO.mp){ e.preventDefault(); irAMercadoPago(); }
  });
});
pintarMontos();

/* ==================================================== 7 · zona de donantes
   El pase lo firma el servidor y el navegador solo lo guarda. Acá no se decide
   nada: se pregunta. Si alguien se inventa un pase en el localStorage, la lista
   vuelve 403 y no hay nada que mostrar.

   Lo que este candado SÍ hace: que la lista y sus enlaces no estén en el HTML
   de la página, donde cualquiera los lee con ver-código-fuente.
   Lo que NO hace: impedir que un donante pase el archivo. Con un APK eso no
   tiene solución, y prometerlo sería mentir. */
var pase = caja.leer("pase", null);

/* Si la cuenta ya pago alguna vez, el servidor manda el pase junto con el
   perfil. Asi entrar desde otro telefono no obliga a pagar de nuevo: el acceso
   viaja con la cuenta y no con el navegador donde se pago. */
document.addEventListener("hay-pase-de-cuenta", function(e){
  if (!e.detail) return;
  pase = e.detail; caja.poner("pase", pase); revisarPase();
});

function pintarZona(datos){
  var caja2 = $("zona-lista");
  if (!datos || !datos.items || !datos.items.length){
    caja2.innerHTML =
      '<div class="grupo"><h2>Todavía no hay nada para bajar</h2>' +
      '<p>Tu acceso ya quedó guardado. Lo primero que va a aparecer acá es el ' +
      '<b>launcher de Android</b>, que está en desarrollo — cuando salga, lo ' +
      'vas a ver en esta ventana sin tener que hacer nada.</p></div>';
    return;
  }
  caja2.innerHTML = '<ul class="lista">' + datos.items.map(function(i){
    return '<li><a href="' + i.url + '" target="_blank" rel="noopener">' +
      '<span class="bola" style="background:radial-gradient(circle at 32% 26%,#fff3d0,#ffd23f 45%,#c98f10)"></span>' +
      '<span><b>' + i.nombre + '</b><span>' + (i.desc || "") + '</span></span></a></li>';
  }).join("") + "</ul>";
}

function revisarPase(){
  if (!pase) return;
  fetch("api/zona?pase=" + encodeURIComponent(pase))
    .then(function(r){ return r.ok ? r.json() : null; })
    .then(function(d){
      if (!d){ pase = null; caja.sacar("pase"); return; }   /* venció o ya no vale */
      $("v-zona").hidden = false;
      $("ic-zona").hidden = false;
      caja.poner("colaboro", 1);        /* no le pedimos plata a quien ya puso */
      pintarZona(d);
    })
    .catch(function(){});
}

$("cod-btn").addEventListener("click", function(){
  var v = ($("cod-txt").value || "").trim().toUpperCase();
  var av = $("cod-aviso"), bt = this;
  if (!v){ $("cod-txt").focus(); return; }
  bt.disabled = true; av.hidden = false; av.style.color = "var(--tinta-2)";
  av.textContent = "Comprobando…";
  fetch("api/acceso", { method:"POST", headers:{"content-type":"application/json"},
                        body: JSON.stringify({ codigo: v }) })
    .then(function(r){ return r.json().then(function(j){ return {ok:r.ok, j:j}; }); })
    .then(function(res){
      bt.disabled = false;
      if (!res.ok){ av.style.color = "#a3231b"; av.textContent = res.j.error || "No se pudo."; return; }
      pase = res.j.pase; caja.poner("pase", pase);
      av.style.color = "#0e5a2c"; av.textContent = "Listo. Ya tenés acceso.";
      revisarPase();
      setTimeout(function(){ cerrarDona("listo"); abrir("v-zona"); }, 900);
    })
    .catch(function(){
      bt.disabled = false; av.style.color = "#a3231b";
      av.textContent = "No se pudo conectar. Probá de nuevo.";
    });
});
$("cod-txt").addEventListener("keydown", function(e){
  if (e.key === "Enter") $("cod-btn").click();
});
$("ic-zona").addEventListener("click", function(){ abrir("v-zona"); });
revisarPase();

/* ================================================ 8 · cobro automático
   Las dos vías terminan igual: el que paga vuelve con un identificador, y ese
   identificador se manda a /api/acceso, que lo verifica CONTRA EL SERVIDOR DE
   LA PASARELA. Acá no se decide nada. Si esta parte mintiera —«pagó, dale el
   pase»— el servidor igual diría que no.

   El monto tampoco viaja como verdad: /api/pagar arma la orden con el precio
   del lado del servidor. Lo que se manda desde acá es una intención. */
var AUTO = null;

/* el cartel de modo de prueba. Va arriba de todo, en rojo, y no se puede
   cerrar: cobrar con plata que no existe y no darse cuenta es el error caro
   de este montaje. */
function avisarPrueba(){
  if ($("aviso-prueba")) return;
  var d = document.createElement("div");
  d.id = "aviso-prueba";
  d.style.cssText = "margin:0 0 12px;padding:10px 13px;border-radius:4px;" +
    "border:1px solid #d98b7a;background:linear-gradient(180deg,#fff1ec,#ffdfd6);" +
    "color:#8a2412;font-size:13.5px;line-height:1.45";
  d.innerHTML = "<b>Modo de prueba de PayPal.</b> Los pagos son simulados: " +
    "<b>no entra dinero de verdad</b>. Sirve para probar el circuito, no para " +
    "cobrar. Cambiar las credenciales a Live antes de anunciar nada.";
  var cuerpo = document.querySelector("#fondoDona .cuerpo");
  if (cuerpo) cuerpo.insertBefore(d, cuerpo.firstChild);
}

function decirEspera(t, mal){
  var e = $("pp-espera"); e.hidden = false;
  e.style.color = mal ? "#a3231b" : "var(--tinta-2)"; e.textContent = t;
}

function entregarPase(j){
  pase = j.pase; caja.poner("pase", pase);
  revisarPase();
  decirEspera("¡Listo! Ya tenés acceso anticipado.", false);
  setTimeout(function(){ cerrarDona("listo"); abrir("v-zona"); }, 1200);
}

/* --- PayPal: se paga adentro de la página, sin salir --- */
function armarPaypal(){
  if (!AUTO || !AUTO.paypal || window.paypal) return;
  var sc = document.createElement("script");
  sc.src = "https://www.paypal.com/sdk/js?client-id=" + encodeURIComponent(AUTO.paypal) +
           "&currency=USD&intent=capture&components=buttons&locale=es_AR";
  sc.onload = pintarPaypal;
  sc.onerror = function(){ decirEspera("No se pudo cargar PayPal.", true); };
  document.head.appendChild(sc);
}

function pintarPaypal(){
  if (!window.paypal || !$("pp-botones")) return;
  $("pp-botones").innerHTML = "";
  paypal.Buttons({
    style: { layout:"vertical", shape:"rect", height:44, label:"pay" },
    createOrder: function(){
      decirEspera("Preparando el pago…", false);
      return fetch("api/pagar", { method:"POST", headers:{"content-type":"application/json"},
                                  body: JSON.stringify({ via:"paypal", monto: monto }) })
        .then(function(r){ return r.json(); })
        .then(function(j){ if (!j.orden) throw new Error(j.error || "sin orden"); return j.orden; });
    },
    onApprove: function(datos){
      decirEspera("Confirmando el pago…", false);
      return fetch("api/acceso", { method:"POST", headers:{"content-type":"application/json"},
                                   body: JSON.stringify({ orden: datos.orderID }) })
        .then(function(r){ return r.json().then(function(j){ return {ok:r.ok, j:j}; }); })
        .then(function(res){
          if (!res.ok){ decirEspera(res.j.error || "No se pudo confirmar.", true); return; }
          entregarPase(res.j);
        });
    },
    onCancel: function(){ decirEspera("Cancelaste el pago. No se cobró nada.", false); },
    onError: function(){ decirEspera("PayPal tuvo un problema. Probá de nuevo.", true); }
  }).render("#pp-botones");
  $("pp-botones").hidden = false;
}

/* --- Mercado Pago: se va y vuelve --- */
function irAMercadoPago(){
  decirEspera("Abriendo Mercado Pago…", false);
  fetch("api/pagar", { method:"POST", headers:{"content-type":"application/json"},
                       body: JSON.stringify({ via:"mp", monto: monto }) })
    .then(function(r){ return r.json(); })
    .then(function(j){
      if (!j.ir) throw new Error(j.error || "sin enlace");
      /* se recuerda que salimos a pagar, para reconocer la vuelta */
      caja.poner("volviendo", 1);
      location.href = j.ir;
    })
    .catch(function(e){ decirEspera("No se pudo abrir Mercado Pago.", true); });
}

/* la vuelta: Mercado Pago devuelve el identificador en la dirección */
function mirarLaVuelta(){
  var q = new URLSearchParams(location.search);
  if (q.get("pago") !== "mp") return;
  var id = q.get("payment_id") || q.get("collection_id");
  /* se limpia la dirección para que recargar no repita el trámite */
  history.replaceState(null, "", location.pathname);
  caja.sacar("volviendo");
  if (!id) return;
  abrirDona();
  decirEspera("Confirmando el pago…", false);
  fetch("api/acceso", { method:"POST", headers:{"content-type":"application/json"},
                        body: JSON.stringify({ mpPago: id }) })
    .then(function(r){ return r.json().then(function(j){ return {ok:r.ok, j:j}; }); })
    .then(function(res){
      if (!res.ok){ decirEspera(res.j.error || "No se pudo confirmar.", true); return; }
      entregarPase(res.j);
    })
    .catch(function(){ decirEspera("No se pudo confirmar. Escribinos.", true); });
}

conectarControl();
conectarMinas();
conectarBloc();
conectarRepro();

})();
