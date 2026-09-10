/* ===========================================================================
   Frutiger Aero — el escritorio

   Cinco cosas, en este orden:
     1. la sesión (invitado o Google)
     2. las ventanas, el menú de inicio y la barra de abajo
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
  $("quien-rol").textContent = usuario.via === "cuenta"
    ? (usuario.correo || "Cuenta de Frutiger Aero")
    : "Cuenta local de este dispositivo";
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

/* --- las tres puertas: llave de acceso, Discord y Google ---
   Las tres terminan en lo mismo: una cuenta de verdad, con el mismo pase que
   la de usuario y contraseña. No son tres sesiones distintas.

   La que manda es LA LLAVE DE ACCESO, porque es la única que no depende de
   nadie: no hay consola de un tercero que registrar, no hay secreto que se
   pueda filtrar, y no hay edad mínima que cumplirle a nadie. La clave privada
   vive en el teléfono o en la computadora y no sale de ahí; acá queda la
   pública, que no sirve para entrar. Y no se puede pescar: la firma lleva
   adentro de qué sitio salió, así que una copia de esta página en otra
   dirección no puede usarla, aunque la persona caiga y apoye el dedo. */
var CLIENTE = null, NUMERO = null, TICKET = null, PUERTA = null;

var HAY_LLAVES = !!(window.PublicKeyCredential && navigator.credentials &&
                    window.AuthenticatorAttestationResponse &&
                    AuthenticatorAttestationResponse.prototype.getPublicKey);

fetch("api/config").then(function(r){ return r.ok ? r.json() : null; }).then(function(c){
  if (c && c.auto) {
    AUTO = c.auto;
    if (AUTO.prueba) avisarPrueba();
    armarPaypal();
  }
  if (c && c.pago) { pago = c.pago; }
  pintarMontos();
  mirarLaVuelta();

  if (HAY_LLAVES){ $("llave-btn").hidden = false; $("pie-llave").hidden = false; }
  if (c && c.discord) $("discord-btn").hidden = false;

  CLIENTE = c && c.google;
  if (!CLIENTE){ if (!HAY_LLAVES && !(c && c.discord)) $("sin-google").hidden = false; return; }
  var g = document.createElement("script");
  g.src = "https://accounts.google.com/gsi/client";
  g.async = true; g.defer = true;
  g.onload = armarGoogle;
  g.onerror = function(){ $("sin-google").hidden = false; };
  document.head.appendChild(g);
}).catch(function(){ $("sin-google").hidden = false; });

/* ------------------------------------------------------- cosas compartidas */
function llamar(ruta, cuerpo){
  var o = { method:"POST", headers:{"content-type":"application/json"},
            body: JSON.stringify(cuerpo) };
  var ses = caja.leer("sesion", null);
  if (ses && ses.pase) o.headers.authorization = "Bearer " + ses.pase;
  return fetch("api/" + ruta, o).then(function(r){
    return r.json().then(function(j){
      if (!r.ok) throw new Error(j.error || ("error " + r.status));
      return j;
    });
  });
}

function avisoG(t){
  var a = $("g-aviso");
  if (!t){ a.hidden = true; return; }
  a.hidden = false; a.textContent = t;
}
function errorG(t){
  $("paso2").hidden = true; $("paso1").hidden = false;
  var n = $("g-error"); n.hidden = false; n.textContent = t;
}

/* la sesión de la cuenta es la MISMA que usa el muro: se guarda donde la
   busca, y se avisa por si esa parte de la página ya se cargó */
function conCuenta(j){
  var ses = { pase: j.pase, yo: j.yo };
  caja.poner("sesion", ses);
  document.dispatchEvent(new CustomEvent("cuenta-lista", { detail: ses }));
  entrar({ nombre: j.yo.nombre, foto: j.foto || null,
           correo: j.correo || null, via: "cuenta" });
}

/* el segundo paso: Google y Discord ya dijeron quién es, pero no cómo quiere
   que lo vean acá. El nombre de usuario es la dirección del perfil. */
function pedirUsuario(j, puerta){
  PUERTA = puerta; TICKET = j.ticket;
  $("paso1").hidden = true; $("paso2").hidden = false;
  $("g-error").hidden = true;
  avisoG("");
  $("g-quien").textContent = j.correo ? "Entraste como " + j.correo + ". Falta una cosa:"
                                      : "Falta una cosa:";
  $("g-conclave").hidden = (puerta === "llave");
  $("g-usuario").value = j.sugerido || "";
  $("g-usuario").dataset.nombre = j.nombre || "";
  verMuestra();
  $("g-usuario").focus(); $("g-usuario").select();
}

function verMuestra(){
  var v = ($("g-usuario").value || "").toLowerCase().trim();
  $("g-muestra").textContent = "@" + (v || "vos");
}

/* ============================================== 1 · llaves de acceso */
var cod = new TextEncoder();
function aB64u(b){
  var s = "", u = new Uint8Array(b);
  for (var i = 0; i < u.length; i++) s += String.fromCharCode(u[i]);
  return btoa(s).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,"");
}
function deB64u(t){
  var s = String(t).replace(/-/g,"+").replace(/_/g,"/");
  while (s.length % 4) s += "=";
  var b = atob(s), u = new Uint8Array(b.length);
  for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
  return u;
}
/* un nombre para poder distinguirla después en la lista y borrar la correcta */
function nombreDelAparato(){
  var u = navigator.userAgent;
  if (/Android/.test(u)) return "Android";
  if (/iPhone|iPad|iPod/.test(u)) return "iPhone o iPad";
  if (/Mac OS X/.test(u)) return "Mac";
  if (/Windows/.test(u)) return "Windows";
  if (/Linux/.test(u)) return "Linux";
  return "Este dispositivo";
}
/* el navegador cancela y avisa igual que si fallara: hay que distinguirlos, o
   el que cierra el diálogo a propósito ve un error de sistema */
function porQueFallo(e){
  if (e && e.name === "NotAllowedError")
    return "Se canceló, o pasó demasiado tiempo. Probá otra vez.";
  if (e && e.name === "InvalidStateError")
    return "Este aparato ya tiene una llave en esa cuenta: entrá con ella.";
  if (e && e.name === "SecurityError")
    return "Las llaves sólo andan en la dirección oficial del sitio.";
  return (e && e.message) || "No se pudo.";
}

function entrarConLlave(){
  $("g-error").hidden = true;
  llamar("llave", { hacer:"reto" }).then(function(j){
    return navigator.credentials.get({ publicKey: {
      challenge: cod.encode(j.reto),
      rpId: location.hostname,
      userVerification: "preferred",
      timeout: 60000
    }});
  }).then(function(c){
    if (!c) throw new Error("No se eligió ninguna llave.");
    var r = c.response;
    return llamar("llave", { hacer:"entrar", cred: aB64u(c.rawId),
      cliente: aB64u(r.clientDataJSON), auth: aB64u(r.authenticatorData),
      firma: aB64u(r.signature) });
  }).then(conCuenta).catch(function(e){ errorG(porQueFallo(e)); });
}

/* La ceremonia en sí: el navegador crea el par de claves, y acá sube sólo la
   pública. La privada no sale del aparato ni pasando por este código. */
function ceremonia(j){
  return navigator.credentials.create({ publicKey: {
    challenge: cod.encode(j.reto),
    rp: { name: "Frutiger Aero", id: location.hostname },
    user: { id: deB64u(j.handle), name: j.usuario, displayName: j.nombre || j.usuario },
    /* los dos tipos que entiende todo el mundo: curva elíptica y RSA */
    pubKeyCredParams: [{ type:"public-key", alg:-7 }, { type:"public-key", alg:-257 }],
    /* «residentKey» es lo que permite entrar SIN escribir el usuario: la llave
       se acuerda a qué cuenta pertenece y el aparato la ofrece sola */
    authenticatorSelection: { residentKey:"required", userVerification:"preferred" },
    /* para que no ofrezca poner una segunda llave del mismo aparato en la
       misma cuenta, que sólo sirve para confundir después al borrarlas */
    excludeCredentials: (j.tiene || []).map(function(id){
      return { type:"public-key", id: deB64u(id) }; }),
    attestation: "none",
    timeout: 60000
  }}).then(function(c){
    if (!c) throw new Error("No se creó la llave.");
    var r = c.response;
    return llamar("llave", { hacer:"guardar", ticket: j.ticket,
      cred: aB64u(c.rawId), cliente: aB64u(r.clientDataJSON),
      clave: aB64u(r.getPublicKey()), alg: r.getPublicKeyAlgorithm(),
      nombre: nombreDelAparato() });
  });
}

/* crear la cuenta: primero el nombre de usuario, DESPUÉS la llave. La cuenta se
   crea recién cuando la llave ya existe, para no dejar cuentas huérfanas a las
   que nadie pueda entrar si se cancela el diálogo del navegador. */
function hacerLlave(usuario){
  avisoG("Pedile a tu dispositivo que la cree…");
  return llamar("llave", { hacer:"empezar", usuario: usuario,
                           nombre: $("g-usuario").dataset.nombre })
    .then(ceremonia).then(conCuenta);
}

/* desde adentro, para el que ya tiene cuenta con contraseña y quiere dejar de
   escribirla, o para sumar el segundo aparato */
window.FA = window.FA || {};
window.FA.hayLlaves = HAY_LLAVES;
window.FA.agregarLlave = function(){
  return llamar("llave", { hacer:"empezar" }).then(ceremonia);
};
window.FA.porQueFallo = porQueFallo;

if ($("llave-btn")) $("llave-btn").addEventListener("click", entrarConLlave);
if ($("crear-llave")) $("crear-llave").addEventListener("click", function(){
  pedirUsuario({ sugerido:"", nombre:"" }, "llave");
  $("g-quien").textContent = "Elegí tu nombre de usuario y listo:";
});

/* ============================================== 2 · Discord */
if ($("discord-btn")) $("discord-btn").addEventListener("click", function(){
  location.href = "api/discord";
});

/* La vuelta de Discord llega por la dirección. Viene en el pedacito de después
   del `#`, que NO se manda a ningún servidor; igual se borra apenas se lee,
   para que no quede en el historial ni en un enlace compartido. */
(function volvioDeDiscord(){
  var h = location.hash || "";
  if (h.length < 2) return;
  var m = /^#(entra|nuevo|mal)=(.*)$/.exec(h);
  if (!m) return;
  history.replaceState(null, "", location.pathname + location.search);
  var dato = decodeURIComponent(m[2]);
  if (m[1] === "mal"){ errorG(dato); return; }
  var j; try { j = JSON.parse(dato); } catch(e){ return; }
  if (m[1] === "entra") conCuenta(j); else pedirUsuario(j, "discord");
})();

/* ============================================== 3 · Google */
function pedirNumero(){
  return fetch("api/entrar").then(function(r){ return r.json(); })
    .then(function(j){ NUMERO = j.numero; return NUMERO; });
}
function armarGoogle(){
  if (!window.google || !google.accounts || !google.accounts.id) return;
  pedirNumero().then(dibujarGoogle).catch(function(){ $("sin-google").hidden = false; });
  /* el número vence: mientras la pantalla siga abierta se pide otro */
  setInterval(function(){
    if ($("logon").hidden) return;
    pedirNumero().then(dibujarGoogle).catch(function(){});
  }, 20 * 60000);
}
function dibujarGoogle(){
  google.accounts.id.initialize({
    client_id: CLIENTE, nonce: NUMERO,
    callback: function(resp){
      $("g-error").hidden = true;
      llamar("entrar", { credential: resp.credential, numero: NUMERO })
        .then(function(j){
          if (j.pase) conCuenta(j); else if (j.nuevo) pedirUsuario(j, "google");
        })
        .catch(function(e){ errorG(e.message); });
    }
  });
  $("gbt").hidden = true;
  $("gsi").textContent = "";
  google.accounts.id.renderButton($("gsi"), {
    theme:"outline", size:"large", shape:"rectangular", width:330,
    text:"continue_with", locale:"es"
  });
}
$("gbt").addEventListener("click", function(){
  if (!CLIENTE) { $("sin-google").hidden = false; $("sin-google").scrollIntoView({block:"nearest"}); }
});

/* ============================================== el 2º paso, para las tres */
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
    if (PUERTA === "llave"){
      hacerLlave(u).catch(function(e){ avisoG(porQueFallo(e)); });
      return;
    }
    avisoG("Creando tu cuenta…");
    llamar("entrar", { hacer:"registrar", ticket: TICKET, usuario: u,
                       nombre: $("g-usuario").dataset.nombre })
      .then(conCuenta).catch(function(e){ avisoG(e.message); });
  });

  $("g-vincular").addEventListener("click", function(){
    avisoG("Pegando tu cuenta…");
    llamar("entrar", { hacer:"vincular", ticket: TICKET,
                       usuario: $("g-vi-us").value, clave: $("g-vi-cl").value })
      .then(conCuenta).catch(function(e){ avisoG(e.message); });
  });
  $("g-vi-cl").addEventListener("keydown", function(e){
    if (e.key === "Enter") $("g-vincular").click();
  });

  $("g-volver").addEventListener("click", function(){
    TICKET = null; PUERTA = null; avisoG("");
    $("paso2").hidden = true; $("paso1").hidden = false;
  });
}

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

/* ================================================= 2 · las ventanas
   LA CRUZ CIERRA. Antes minimizaba: la ventana se iba a una fila de botones
   abajo, y esa fila se llenaba de cosas que nadie iba a volver a abrir. Cerrar
   y minimizar hacían exactamente lo mismo, así que había dos botones para una
   sola acción y ninguno hacía lo que decía.

   Se puede cerrar todo sin quedar encerrado: cada ventana tiene de dónde volver
   a abrirse —las aplicaciones desde el menú de inicio, el muro, los avisos y el
   perfil desde la barra de arriba, las secciones desde el menú de «Frutiger
   Aero», y la zona de donantes desde su ícono del escritorio— así que no hace
   falta guardarlas en ningún lado por las dudas. */
function cerrarVentana(id){
  var v = $(id); if (!v) return;
  v.hidden = true;
}

function abrir(id){
  var v = $(id); if (!v) return;
  v.hidden = false;
  cerrarInicio();
  v.scrollIntoView({ behavior: quieto ? "auto" : "smooth", block:"start" });
}

document.addEventListener("click", function(e){
  var b = e.target.closest("[data-cerrar],[data-abrir]");
  if (!b) return;
  if (b.dataset.abrir) { abrir(b.dataset.abrir); return; }
  cerrarVentana(b.dataset.cerrar);
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

/* Las direcciones van desde la raíz y no relativas. Un `url()` que se mete en
   una variable de CSS no se resuelve desde el documento sino desde la hoja de
   estilos donde la variable SE USA —que está en /css/—, así que «img/fondo»
   terminaba pidiendo «/css/img/fondo» y el escritorio se quedaba sin fondo,
   con el azul liso de abajo. No daba error en pantalla: sólo faltaba el pasto. */
var FONDOS = {
  pasto:  { ancho:'url("/img/fondo.06222548.webp")', alto:'url("/img/fondo-alto.550e8e84.webp")' },
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
      /* la ventana vieja de la zona ya no se abre: la reemplazó Aero+, que es
         una interfaz entera. Lo único que queda de ella es el ícono. */
      $("ic-zona").hidden = false;
      amPintarIcono();
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


/* ================================================= 5 · Aero+
   La zona de donantes. No es una ventana más: es otra interfaz a pantalla
   completa, con su barra, sus aplicaciones y su fondo. Lo que se desbloquea
   tiene que SENTIRSE distinto, no ser la misma pantalla con un cartel.

   QUIÉN DECIDE SI ENTRÁS: el servidor, no esta página. Acá no hay ningún
   `if (esDonante)` que alguien pueda dar vuelta desde la consola del navegador;
   se le pide `api/aeromas` y si contesta 403 no hay nada que pintar. Poner esa
   decisión de este lado sería dejar la puerta cerrada con un cartel en vez de
   con llave. */
var AM = null;                 /* lo que contestó el servidor */
var amTema = { fondo:"cristal", tono:210, sat:52, vidrio:82 };

var AM_FONDOS = {
  cristal:  "Cristal",   pasto: "Pasto",     nocturno: "Aurora",
  oceano:   "Océano",    cielo: "Cielo"
};
var AM_MARCOS = { agua:"Agua", oro:"Oro", vidrio:"Vidrio" };
/* Íconos de verdad y no los aros: tres anillos casi iguales en la columna no
   distinguen una aplicación de otra, que es para lo único que sirve un ícono. */
var AM_LAMS = { "i-vidrio":"img/zona/ico-temas.webp",
                "i-personaje":"img/zona/ico-perfil.webp",
                "i-ventana":"img/zona/ico-galeria.webp" };

function amPedir(cuerpo){
  var o = { headers:{} };
  var ses = caja.leer("sesion", null);
  if (ses && ses.pase) o.headers.authorization = "Bearer " + ses.pase;
  if (cuerpo){ o.method = "POST"; o.headers["content-type"] = "application/json";
               o.body = JSON.stringify(cuerpo); }
  return fetch("api/aeromas", o).then(function(r){
    return r.json().then(function(j){
      if (!r.ok) throw new Error(j.error || ("error " + r.status));
      return j; });
  });
}

/* --- el ícono del escritorio: instalar la primera vez, abrir después --- */
function amInstalado(){ return !!caja.leer("aeromas", false); }

function amPintarIcono(){
  var t = $("ic-zona-txt");
  if (t) t.textContent = amInstalado() ? "Aero+" : "Instalar Aero+";
}

/* El instalador. Es teatro —una barra que avanza— pero no miente: cada paso
   espera a que la cosa que nombra haya terminado de verdad. Un progreso que
   corre solo mientras atrás no pasa nada es de las cosas que más rápido hacen
   desconfiar de un programa. */
function amInstalar(){
  var caja1 = $("am-instalar"), lleno = $("am-lleno"), paso = $("am-paso");
  caja1.hidden = false;
  var pasos = [
    ["Comprobando tu acceso…", function(){ return amPedir(null).then(function(j){ AM = j; }); }],
    ["Bajando los fondos…", function(){ return amPrecargar(); }],
    ["Escribiendo en el escritorio…", function(){
        return new Promise(function(r){ caja.poner("aeromas", true); setTimeout(r, quieto?0:450); }); }]
  ];
  var i = 0;
  function seguir(){
    if (i >= pasos.length){
      lleno.style.width = "100%"; paso.textContent = "Listo.";
      setTimeout(function(){ caja1.hidden = true; amPintarIcono(); amAbrir(); }, quieto?0:600);
      return;
    }
    paso.textContent = pasos[i][0];
    lleno.style.width = Math.round(i / pasos.length * 100) + "%";
    pasos[i][1]().then(function(){ i++; seguir(); })
      .catch(function(e){
        paso.textContent = e.message;
        lleno.style.background = "#d6432a";
        setTimeout(function(){ caja1.hidden = true; }, 2600);
      });
  }
  seguir();
}

/* que el fondo no aparezca a pedazos la primera vez que se elige */
function amPrecargar(){
  return Promise.all(Object.keys(AM_FONDOS).map(function(f){
    return new Promise(function(r){
      var im = new Image(); im.onload = im.onerror = r; im.src = "img/zona/f-" + f + ".webp";
    });
  }));
}

function amAbrir(){
  (AM ? Promise.resolve(AM) : amPedir(null).then(function(j){ AM = j; }))
    .then(function(){
      if (AM.yo.tema){ try { amTema = JSON.parse(AM.yo.tema); } catch(e){} }
      $("aeromas").hidden = false;
      document.body.style.overflow = "hidden";
      $("am-quien").textContent = "@" + AM.yo.usuario +
        (AM.cuantos > 1 ? "  ·  " + AM.cuantos + " la tienen" : "");
      amPintarApps();
      amAplicarFondo();
      amVer(AM.estrena ? "bienvenida" : "temas");
    })
    .catch(function(e){ alert(e.message); });
}

function amCerrar(){
  $("aeromas").hidden = true;
  document.body.style.overflow = "";
}

function amPintarApps(){
  var n = $("am-apps"); n.textContent = "";
  AM.apps.forEach(function(a){
    var b = document.createElement("button");
    b.type = "button"; b.dataset.app = a.id;
    var im = document.createElement("img");
    im.className = "lam"; im.src = AM_LAMS[a.icono] || "img/zona/app.webp"; im.alt = "";
    var t = document.createElement("div");
    var bb = document.createElement("b"); bb.textContent = a.nombre;
    var sp = document.createElement("span"); sp.textContent = a.que;
    t.appendChild(bb); t.appendChild(sp);
    b.appendChild(im); b.appendChild(t);
    b.addEventListener("click", function(){ amVer(a.id); });
    n.appendChild(b);
  });
}

function amAplicarFondo(){
  $("am-fondo").style.backgroundImage = 'url("img/zona/f-' + amTema.fondo + '.webp")';
}

function amVer(cual){
  Array.prototype.forEach.call($("am-apps").children, function(b){
    b.setAttribute("aria-current", String(b.dataset.app === cual));
  });
  var p = $("am-panel"); p.textContent = "";
  if (cual === "bienvenida") return amBienvenida(p);
  if (cual === "temas")   return amTemas(p);
  if (cual === "perfil")  return amPerfil(p);
  if (cual === "galeria") return amGaleria(p);
}

function amTitulo(p, t, b){
  var h = document.createElement("h2"); h.textContent = t; p.appendChild(h);
  var q = document.createElement("p"); q.className = "baja"; q.textContent = b; p.appendChild(q);
}
function amCaja(p, t){
  var c = document.createElement("div"); c.className = "am-caja";
  if (t){ var h = document.createElement("h3"); h.textContent = t; c.appendChild(h); }
  p.appendChild(c); return c;
}

function amBienvenida(p){
  amTitulo(p, "Bienvenido a Aero+",
    "Se instaló. Desde ahora el ícono del escritorio te trae directo acá.");
  var c = amCaja(p, null);
  var q = document.createElement("p");
  q.style.cssText = "margin:0;font-size:14.5px;line-height:1.6";
  q.textContent = "Hay tres cosas adentro: un estudio de temas con fondos que no " +
    "están en el escritorio común, marcos para tu retrato que se ven en el muro, " +
    "y la galería para bajarte los fondos en grande. Todo lo que elijas queda " +
    "guardado en tu cuenta, así que te sigue si entrás desde el teléfono.";
  c.appendChild(q);
  var b = document.createElement("button");
  b.className = "am-bt"; b.type = "button"; b.textContent = "Empezar por los temas";
  b.style.marginTop = "12px";
  b.addEventListener("click", function(){ amVer("temas"); });
  c.appendChild(b);
}

/* ------------------------------------------------------- estudio de temas */
function amTemas(p){
  amTitulo(p, "Estudio de temas",
    "El fondo es de acá adentro. El color del vidrio y la transparencia también " +
    "pintan el escritorio de afuera, en vivo.");

  var c = amCaja(p, "Fondo");
  var r = document.createElement("div"); r.className = "am-rej";
  Object.keys(AM_FONDOS).forEach(function(f){
    var b = document.createElement("button"); b.type = "button";
    b.setAttribute("aria-pressed", String(amTema.fondo === f));
    var im = document.createElement("img");
    im.src = "img/zona/f-" + f + ".webp"; im.alt = AM_FONDOS[f]; im.loading = "lazy";
    var pie = document.createElement("span"); pie.className = "pie"; pie.textContent = AM_FONDOS[f];
    b.appendChild(im); b.appendChild(pie);
    b.addEventListener("click", function(){
      amTema.fondo = f;
      Array.prototype.forEach.call(r.children, function(x){
        x.setAttribute("aria-pressed", String(x === b)); });
      amAplicarFondo(); amGuardar();
    });
    r.appendChild(b);
  });
  c.appendChild(r);

  var c2 = amCaja(p, "El vidrio");
  [["tono","Color", 0, 360], ["sat","Saturación", 0, 100], ["vidrio","Transparencia", 40, 100]]
    .forEach(function(x){
      var l = document.createElement("label"); l.textContent = x[1];
      var i = document.createElement("input");
      i.type = "range"; i.min = x[2]; i.max = x[3]; i.value = amTema[x[0]];
      i.addEventListener("input", function(){
        amTema[x[0]] = +this.value;
        /* el escritorio de afuera usa las mismas variables: se retiñe solo */
        var raiz = document.documentElement.style;
        raiz.setProperty("--tono", amTema.tono);
        raiz.setProperty("--sat", amTema.sat + "%");
        raiz.setProperty("--vidrio", amTema.vidrio + "%");
      });
      i.addEventListener("change", amGuardar);
      c2.appendChild(l); c2.appendChild(i);
    });
}

/* ------------------------------------------------------------- Perfil+ */
function amPerfil(p){
  amTitulo(p, "Perfil+",
    "El marco y el lema se ven en el muro, así que los ve el resto. " +
    "La banda es el fondo de tu perfil.");

  var c = amCaja(p, "Marco del retrato");
  var fila = document.createElement("div"); fila.className = "am-fila";
  var prev = document.createElement("div"); prev.className = "am-previa";
  var rt = document.createElement("img"); rt.className = "rt"; rt.alt = "";
  var ses = caja.leer("sesion", null);
  rt.src = (ses && ses.yo) ? retratoDe2(ses.yo.retrato) : "img/mascota/m-saludando.463f6804.webp";
  var ar = document.createElement("img"); ar.className = "ar"; ar.alt = "";
  prev.appendChild(rt); prev.appendChild(ar);
  fila.appendChild(prev);
  c.appendChild(fila);

  function pintarAro(){
    ar.src = AM.yo.marco ? "img/zona/marco-" + AM.yo.marco + ".webp" : "";
    ar.style.display = AM.yo.marco ? "" : "none";
  }
  pintarAro();

  var r = document.createElement("div"); r.className = "am-rej aros";
  r.style.marginTop = "12px";
  [""].concat(Object.keys(AM_MARCOS)).forEach(function(m){
    var b = document.createElement("button"); b.type = "button";
    b.setAttribute("aria-pressed", String((AM.yo.marco || "") === m));
    b.title = m ? AM_MARCOS[m] : "Sin marco";
    if (m){
      var im = document.createElement("img");
      im.alt = b.title; im.loading = "lazy";
      im.src = "img/zona/marco-" + m + ".webp";
      b.appendChild(im);
    } else {
      /* el «sin marco» es un hueco, no otra opción de aro: con la mascota
         adentro parecía un cuarto marco y no la forma de sacárselos */
      var v = document.createElement("span");
      v.style.cssText = "display:grid;place-items:center;aspect-ratio:1;font-size:12.5px;" +
        "color:rgba(226,242,255,.75);border-radius:50%;" +
        "background:repeating-linear-gradient(45deg,rgba(255,255,255,.05) 0 7px," +
        "rgba(255,255,255,.11) 7px 14px)";
      v.textContent = "Sin marco";
      b.appendChild(v);
    }
    b.addEventListener("click", function(){
      AM.yo.marco = m;
      Array.prototype.forEach.call(r.children, function(x){
        x.setAttribute("aria-pressed", String(x === b)); });
      pintarAro(); amGuardar();
    });
    r.appendChild(b);
  });
  c.appendChild(r);

  var c2 = amCaja(p, "Tu lema");
  var l = document.createElement("label");
  l.htmlFor = "am-lema"; l.textContent = "Una línea, la que quieras";
  var i = document.createElement("input");
  i.type = "text"; i.id = "am-lema"; i.maxLength = 80; i.value = AM.yo.lema || "";
  i.placeholder = "Hago cosas con vidrio y burbujas";
  i.addEventListener("change", function(){ AM.yo.lema = this.value; amGuardar(); });
  c2.appendChild(l); c2.appendChild(i);

  var c3 = amCaja(p, "Banda del perfil");
  var r2 = document.createElement("div"); r2.className = "am-rej";
  [""].concat(Object.keys(AM_FONDOS)).forEach(function(f){
    var b = document.createElement("button"); b.type = "button";
    b.setAttribute("aria-pressed", String((AM.yo.banda || "") === f));
    if (f){
      var im = document.createElement("img");
      im.src = "img/zona/f-" + f + ".webp"; im.alt = AM_FONDOS[f]; im.loading = "lazy";
      b.appendChild(im);
    } else {
      var v = document.createElement("span");
      v.style.cssText = "display:block;aspect-ratio:16/9;background:rgba(255,255,255,.08)";
      b.appendChild(v);
    }
    var pie = document.createElement("span");
    pie.className = "pie"; pie.textContent = f ? AM_FONDOS[f] : "Sin banda";
    b.appendChild(pie);
    b.addEventListener("click", function(){
      AM.yo.banda = f;
      Array.prototype.forEach.call(r2.children, function(x){
        x.setAttribute("aria-pressed", String(x === b)); });
      amGuardar();
    });
    r2.appendChild(b);
  });
  c3.appendChild(r2);
}

/* el mismo mapa de retratos que usa el muro, sin duplicar la lista */
function retratoDe2(r){
  if (r && /^https?:/.test(r)) return r;
  var e = document.querySelector('#retratos [data-r="' + r + '"] img');
  return e ? e.src : "img/mascota/m-saludando.463f6804.webp";
}

/* ------------------------------------------------------------- galería */
function amGaleria(p){
  amTitulo(p, "Galería",
    "Los cinco fondos en grande. Son tuyos: usalos donde quieras.");
  var c = amCaja(p, null);
  var r = document.createElement("div"); r.className = "am-rej";
  Object.keys(AM_FONDOS).forEach(function(f){
    var a = document.createElement("a");
    a.href = "img/zona/f-" + f + ".webp"; a.target = "_blank"; a.rel = "noopener";
    a.className = "";
    a.style.cssText = "display:block;border-radius:5px;overflow:hidden;" +
      "border:2px solid rgba(255,255,255,.22);text-decoration:none;color:inherit";
    var im = document.createElement("img");
    im.src = "img/zona/f-" + f + ".webp"; im.alt = AM_FONDOS[f]; im.loading = "lazy";
    im.style.cssText = "display:block;width:100%;aspect-ratio:16/9;object-fit:cover";
    var pie = document.createElement("span");
    pie.className = "pie"; pie.style.display = "block";
    pie.textContent = AM_FONDOS[f] + " — abrir en grande";
    a.appendChild(im); a.appendChild(pie);
    r.appendChild(a);
  });
  c.appendChild(r);
}

/* Se guarda solo, en cuanto se toca algo. Un botón «Guardar» en una pantalla de
   personalización es una forma de que alguien pruebe cinco fondos, cierre, y
   pierda el que le gustaba. */
var amReloj = null;
function amGuardar(){
  clearTimeout(amReloj);
  amReloj = setTimeout(function(){
    amPedir({ hacer:"guardar", marco: AM.yo.marco || "", banda: AM.yo.banda || "",
              lema: AM.yo.lema || "", tema: JSON.stringify(amTema) })
      .then(function(){ caja.poner("ajustes", { tono:amTema.tono, sat:amTema.sat,
              vidrio:amTema.vidrio, fondo:ajustes.fondo, burbujas:ajustes.burbujas }); })
      .catch(function(){});
  }, 600);
}

if ($("ic-zona")){
  amPintarIcono();
  $("ic-zona").addEventListener("click", function(){
    if (amInstalado()) amAbrir(); else amInstalar();
  });
}
if ($("am-salir")) $("am-salir").addEventListener("click", amCerrar);
document.addEventListener("keydown", function(e){
  if (e.key === "Escape" && !$("aeromas").hidden) amCerrar();
});

})();
