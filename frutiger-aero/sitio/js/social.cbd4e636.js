/* ===========================================================================
   Frutiger Aero — lo social

   Muro, perfiles y cuentas. Va aparte de escritorio.js porque son dos cosas
   distintas: una es el escritorio de adorno, esta habla con un servidor.

   TRES REGLAS QUE ESTAN EN EL CODIGO PORQUE SE OLVIDAN:

   1. TODO LO QUE ESCRIBE OTRA PERSONA SE INSERTA COMO TEXTO, nunca como HTML.
      Un muro donde cualquiera publica es exactamente el lugar donde alguien
      prueba con <script>. Se arma con createElement y textContent; no hay un
      solo innerHTML con datos del servidor.

   2. EL DINERO NO PASA POR ACA. Cada publicación lleva el enlace de cobro de
      quien la escribió y el botón va directo ahí. El sitio pone la vidriera.

   3. LOS APOYOS NO SON PLATA. El contador dice cuánta gente apoya, no cuánto
      se juntó: este servidor no tiene forma de saber lo segundo, y mostrarlo
      como dinero sería inventar una cifra.
   =========================================================================== */
(function(){
"use strict";

var $ = function(i){ return document.getElementById(i); };
var API = "api/";
var caja = {
  leer: function(k, x){ try{ var v = localStorage.getItem("fa."+k); return v===null?x:JSON.parse(v); }catch(e){ return x; } },
  poner: function(k,v){ try{ localStorage.setItem("fa."+k, JSON.stringify(v)); }catch(e){} },
  sacar: function(k){ try{ localStorage.removeItem("fa."+k); }catch(e){} }
};

var sesion = caja.leer("sesion", null);   /* { pase, yo } */
var POSES = ["m-saludando","m-paz","m-burbuja","m-agua","m-surf","m-nube","m-juego","m-dormido"];
var ARCHIVOS = {
  "m-saludando":"m-saludando.463f6804.webp", "m-paz":"m-paz.b7d4f491.webp",
  "m-burbuja":"m-burbuja.b9fcd8c5.webp", "m-agua":"m-agua.f3af4fab.webp",
  "m-surf":"m-surf.b7132097.webp", "m-nube":"m-nube.684daf29.webp",
  "m-juego":"m-juego.66c8b81c.webp", "m-dormido":"m-dormido.13aeff0c.webp"
};
function retratoUrl(r){
  if (r && /^https?:/.test(r)) return r;
  return "img/mascota/" + (ARCHIVOS[r] || ARCHIVOS["m-saludando"]);
}

function pedir(ruta, opciones){
  opciones = opciones || {};
  opciones.headers = opciones.headers || {};
  if (sesion && sesion.pase) opciones.headers.authorization = "Bearer " + sesion.pase;
  if (opciones.body) opciones.headers["content-type"] = "application/json";
  return fetch(API + ruta, opciones).then(function(r){
    return r.json().catch(function(){ return {}; }).then(function(j){
      if (!r.ok) throw new Error(j.error || ("error " + r.status));
      return j;
    });
  });
}

/* --- fabrica de nodos: texto SIEMPRE por textContent --- */
function nodo(tag, clase, texto){
  var n = document.createElement(tag);
  if (clase) n.className = clase;
  if (texto != null) n.textContent = texto;
  return n;
}

function cuando(ms){
  var d = Math.floor((Date.now() - ms) / 1000);
  if (d < 60) return "recién";
  if (d < 3600) return "hace " + Math.floor(d/60) + " min";
  if (d < 86400) return "hace " + Math.floor(d/3600) + " h";
  if (d < 604800) return "hace " + Math.floor(d/86400) + " días";
  return new Date(ms).toLocaleDateString("es-AR", {day:"numeric", month:"long"});
}

/* ------------------------------------------------------------ la barra */
function pintarBarra(){
  if (sesion && sesion.yo){
    $("bsNombre").textContent = sesion.yo.nombre;
    $("bsRetrato").src = retratoUrl(sesion.yo.retrato);
  } else {
    $("bsNombre").textContent = "Entrar";
    $("bsRetrato").src = retratoUrl(null);
  }
}

function abrirVentana(id){
  var v = $(id); if (!v) return;
  v.hidden = false;
  var t = document.querySelector('#tareas [data-para="'+id+'"]');
  if (t) t.remove();
  v.scrollIntoView({ behavior:"smooth", block:"start" });
}

/* ------------------------------------------------------------- el muro */
var masViejo = 0;

function tarjeta(p){
  var art = nodo("article", "pub");

  var q = nodo("div", "quien");
  var im = nodo("img"); im.src = retratoUrl(p.retrato); im.alt = ""; im.loading = "lazy";
  im.width = 760; im.height = 760;
  q.appendChild(im);
  var qd = nodo("div");
  var a = nodo("a", null, p.nombre || p.usuario);
  a.href = "#"; a.dataset.perfil = p.usuario;
  var b = nodo("b"); b.appendChild(a);
  qd.appendChild(b);
  qd.appendChild(nodo("time", null, "@" + p.usuario + " · " + cuando(p.creado)));
  q.appendChild(qd);
  art.appendChild(q);

  var c = nodo("div", "cuerpo2");
  c.appendChild(nodo("h3", null, p.titulo));
  c.appendChild(nodo("p", null, p.cuerpo));
  if (p.meta) c.appendChild(nodo("span", "meta", "Para: " + p.meta));
  art.appendChild(c);

  var pa = nodo("div", "patas");
  if (p.cobro){
    var ap = nodo("a", "bt oro", "Apoyar este proyecto");
    ap.href = p.cobro; ap.target = "_blank"; ap.rel = "noopener nofollow";
    ap.dataset.apoyo = p.id;
    pa.appendChild(ap);
  } else {
    pa.appendChild(nodo("span", "cuenta", "Sin enlace para apoyar"));
  }
  if (sesion && sesion.yo && sesion.yo.id === p.autor){
    var bo = nodo("button", "bt", "Borrar");
    bo.type = "button"; bo.dataset.borrar = p.id;
    pa.appendChild(bo);
  }
  pa.appendChild(nodo("span", "cuenta", p.apoyos + (p.apoyos === 1 ? " apoyo" : " apoyos")));
  art.appendChild(pa);
  return art;
}

function cargarMuro(mas){
  var lista = $("muroLista");
  if (!mas){ lista.textContent = ""; masViejo = 0;
             lista.appendChild(nodo("p", null, "Cargando…")); }
  pedir("muro" + (masViejo ? "?antes=" + masViejo : ""))
    .then(function(j){
      if (!mas) lista.textContent = "";
      if (!j.publicaciones.length && !mas){
        var g = nodo("div", "grupo");
        g.appendChild(nodo("h2", null, "Todavía no hay proyectos"));
        g.appendChild(nodo("p", null, "Sé el primero: contá qué querés hacer y pedí apoyo."));
        lista.appendChild(g);
        return;
      }
      j.publicaciones.forEach(function(p){
        lista.appendChild(tarjeta(p));
        masViejo = p.creado;
      });
      $("muroMas").hidden = j.publicaciones.length < 20;
    })
    .catch(function(e){
      lista.textContent = "";
      lista.appendChild(nodo("p", null, "No se pudo cargar: " + e.message));
    });
}

/* ---------------------------------------------------------- el perfil */
function verPerfil(usuario){
  var c = $("perfilCuerpo");
  c.textContent = "";
  abrirVentana("v-perfil");

  /* sin cuenta, el perfil es la puerta para hacerse una */
  if (!usuario && !sesion){ formularioCuenta(); return; }
  usuario = usuario || sesion.yo.usuario;
  $("perfilTitulo").textContent = "Perfil de @" + usuario;
  c.appendChild(nodo("p", null, "Cargando…"));

  pedir("muro?perfil=" + encodeURIComponent(usuario))
    .then(function(j){
      c.textContent = "";
      var u = j.perfil;
      c.appendChild(nodo("div", "tapa"));
      var f = nodo("div", "fichaP");
      var im = nodo("img"); im.src = retratoUrl(u.retrato); im.alt = "";
      im.width = 760; im.height = 760;
      f.appendChild(im);
      var d = nodo("div", "dat");
      d.appendChild(nodo("h2", null, u.nombre));
      d.appendChild(nodo("div", "arroba", "@" + u.usuario + " · desde " +
        new Date(u.creado).toLocaleDateString("es-AR", {month:"long", year:"numeric"})));
      if (u.sobre) d.appendChild(nodo("p", null, u.sobre));
      f.appendChild(d);
      c.appendChild(f);

      var bots = nodo("div", "bots");
      if (u.cobro){
        var ap = nodo("a", "bt oro", "Apoyar a " + u.nombre);
        ap.href = u.cobro; ap.target = "_blank"; ap.rel = "noopener nofollow";
        bots.appendChild(ap);
      }
      if (sesion && sesion.yo && sesion.yo.id === u.id){
        var ed = nodo("button", "bt", "Editar mi perfil"); ed.type = "button";
        ed.addEventListener("click", formularioPerfil);
        bots.appendChild(ed);
        var pu = nodo("button", "bt p", "Publicar un proyecto"); pu.type = "button";
        pu.addEventListener("click", formularioPublicar);
        bots.appendChild(pu);
      }
      c.appendChild(bots);

      var t = nodo("h2"); t.style.cssText = "margin-top:16px;font-size:16px";
      t.textContent = "Sus proyectos";
      c.appendChild(t);
      var lista = nodo("div", "pubs"); lista.style.marginTop = "8px";
      if (!j.publicaciones.length) lista.appendChild(nodo("p", null, "Todavía no publicó nada."));
      j.publicaciones.forEach(function(p){
        p.usuario = u.usuario; p.nombre = u.nombre; p.retrato = u.retrato;
        lista.appendChild(tarjeta(p));
      });
      c.appendChild(lista);
    })
    .catch(function(e){
      c.textContent = "";
      c.appendChild(nodo("p", null, e.message));
    });
}

/* ------------------------------------------------------- formularios */
function campo(id, etiqueta, tipo, ayuda, valor){
  var w = nodo("div", "campo" + "S");
  var l = nodo("label", null, etiqueta); l.htmlFor = id;
  w.appendChild(l);
  var e = document.createElement(tipo === "area" ? "textarea" : "input");
  e.id = id; if (tipo !== "area") e.type = tipo;
  if (valor) e.value = valor;
  w.appendChild(e);
  if (ayuda) w.appendChild(nodo("small", null, ayuda));
  return w;
}

function elegirRetrato(actual){
  var w = nodo("div", "campoS");
  w.appendChild(nodo("label", null, "Tu retrato"));
  var f = nodo("div", "retratos"); f.id = "retratos";
  POSES.forEach(function(r){
    var b = nodo("button"); b.type = "button"; b.dataset.r = r;
    b.setAttribute("aria-pressed", String(r === (actual || "m-saludando")));
    var i = nodo("img"); i.src = retratoUrl(r); i.alt = r; i.loading = "lazy";
    b.appendChild(i);
    b.addEventListener("click", function(){
      [].forEach.call(f.children, function(o){ o.setAttribute("aria-pressed", String(o === b)); });
    });
    f.appendChild(b);
  });
  w.appendChild(f);
  return w;
}
function retratoElegido(){
  var s = document.querySelector('#retratos [aria-pressed="true"]');
  return s ? s.dataset.r : "m-saludando";
}

function formularioCuenta(){
  var c = $("perfilCuerpo");
  c.textContent = "";
  $("perfilTitulo").textContent = "Entrar o crear cuenta";

  var g = nodo("div", "grupo blanco"); g.style.marginTop = "0";
  g.appendChild(nodo("h2", null, "Tu cuenta en Frutiger Aero"));
  g.appendChild(nodo("p", null,
    "Con una cuenta podés publicar tus proyectos y pedir apoyo. " +
    "No pedimos correo ni teléfono: usuario y contraseña, nada más."));
  g.appendChild(campo("cuUsuario", "Usuario", "text", "En minúsculas, de 3 a 20. Es la dirección de tu perfil."));
  g.appendChild(campo("cuNombre", "Cómo querés que te llamen", "text", "Sólo para crear la cuenta."));
  g.appendChild(campo("cuClave", "Contraseña", "password", "8 caracteres o más."));
  g.appendChild(elegirRetrato());
  var av = nodo("p", "avisoS"); av.id = "cuAviso"; av.hidden = true;
  var bots = nodo("div", "bots");
  var bE = nodo("button", "bt p", "Entrar"); bE.type = "button";
  var bC = nodo("button", "bt", "Crear cuenta"); bC.type = "button";
  bots.appendChild(bE); bots.appendChild(bC);
  g.appendChild(bots); g.appendChild(av);
  c.appendChild(g);

  function decir(t, mal){ av.hidden = false; av.style.color = mal ? "#a3231b" : "#0e5a2c"; av.textContent = t; }
  function mandar(hacer){
    var cuerpo = { hacer: hacer,
      usuario: $("cuUsuario").value, clave: $("cuClave").value,
      nombre: $("cuNombre").value, retrato: retratoElegido() };
    decir(hacer === "crear" ? "Creando…" : "Entrando…", false);
    pedir("cuenta", { method:"POST", body: JSON.stringify(cuerpo) })
      .then(function(j){
        sesion = { pase: j.pase, yo: j.yo };
        caja.poner("sesion", sesion);
        pintarBarra();
        verPerfil();
        pedir("cuenta").then(function(k){
          if (k.pase) document.dispatchEvent(new CustomEvent("hay-pase-de-cuenta", {detail: k.pase}));
        }).catch(function(){});
      })
      .catch(function(e){ decir(e.message, true); });
  }
  bE.addEventListener("click", function(){ mandar("entrar"); });
  bC.addEventListener("click", function(){ mandar("crear"); });
  $("cuClave").addEventListener("keydown", function(e){ if (e.key === "Enter") mandar("entrar"); });
}

function formularioPerfil(){
  var c = $("perfilCuerpo"); c.textContent = "";
  $("perfilTitulo").textContent = "Editar mi perfil";
  var y = sesion.yo;
  var g = nodo("div", "grupo blanco"); g.style.marginTop = "0";
  g.appendChild(nodo("h2", null, "Tu perfil"));
  g.appendChild(campo("peNombre", "Nombre", "text", null, y.nombre));
  g.appendChild(campo("peSobre", "Sobre vos", "area", "Qué hacés, qué te gusta del Frutiger Aero.", y.sobre || ""));
  g.appendChild(campo("peCobro", "Tu enlace para recibir apoyo", "text",
    "Tu PayPal.me, tu link de Mercado Pago, Cafecito… El dinero va DIRECTO a vos: el sitio no lo toca.",
    y.cobro || ""));
  g.appendChild(elegirRetrato(y.retrato));
  var av = nodo("p", "avisoS"); av.hidden = true;
  var bots = nodo("div", "bots");
  var bG = nodo("button", "bt p", "Guardar"); bG.type = "button";
  var bV = nodo("button", "bt", "Volver"); bV.type = "button";
  bots.appendChild(bG); bots.appendChild(bV);
  g.appendChild(bots); g.appendChild(av);
  c.appendChild(g);

  bV.addEventListener("click", function(){ verPerfil(); });
  bG.addEventListener("click", function(){
    av.hidden = false; av.style.color = "var(--tinta-2)"; av.textContent = "Guardando…";
    pedir("cuenta", { method:"POST", body: JSON.stringify({
      hacer:"editar", nombre:$("peNombre").value, sobre:$("peSobre").value,
      cobro:$("peCobro").value, retrato:retratoElegido() }) })
      .then(function(){
        sesion.yo.nombre = $("peNombre").value.trim() || sesion.yo.nombre;
        sesion.yo.sobre = $("peSobre").value;
        sesion.yo.cobro = $("peCobro").value;
        sesion.yo.retrato = retratoElegido();
        caja.poner("sesion", sesion); pintarBarra(); verPerfil();
      })
      .catch(function(e){ av.style.color = "#a3231b"; av.textContent = e.message; });
  });
}

function formularioPublicar(){
  if (!sesion){ verPerfil(); return; }
  var c = $("perfilCuerpo"); c.textContent = "";
  $("perfilTitulo").textContent = "Publicar un proyecto";
  abrirVentana("v-perfil");

  var g = nodo("div", "grupo blanco"); g.style.marginTop = "0";
  g.appendChild(nodo("h2", null, "¿Qué querés hacer?"));
  g.appendChild(campo("puTitulo", "Título", "text", "Una línea. Qué es el proyecto."));
  g.appendChild(campo("puCuerpo", "Contalo", "area", "Qué querés hacer, para qué necesitás el apoyo, cuándo lo tendrías."));
  g.appendChild(campo("puMeta", "Para qué es la plata", "text", "Ej: «un mes de servidor», «una tableta usada». Corto.", ""));
  g.appendChild(campo("puCobro", "Enlace para recibir apoyo", "text",
    "Si lo dejás vacío se usa el de tu perfil. El dinero va DIRECTO a vos.",
    (sesion.yo && sesion.yo.cobro) || ""));
  var av = nodo("p", "avisoS"); av.hidden = true;
  var bots = nodo("div", "bots");
  var bP = nodo("button", "bt p", "Publicar"); bP.type = "button";
  var bV = nodo("button", "bt", "Cancelar"); bV.type = "button";
  bots.appendChild(bP); bots.appendChild(bV);
  g.appendChild(bots); g.appendChild(av);
  c.appendChild(g);

  bV.addEventListener("click", function(){ verPerfil(); });
  bP.addEventListener("click", function(){
    av.hidden = false; av.style.color = "var(--tinta-2)"; av.textContent = "Publicando…";
    pedir("muro", { method:"POST", body: JSON.stringify({
      hacer:"publicar", titulo:$("puTitulo").value, cuerpo:$("puCuerpo").value,
      meta:$("puMeta").value, cobro:$("puCobro").value }) })
      .then(function(){ cargarMuro(); abrirVentana("v-muro"); })
      .catch(function(e){ av.style.color = "#a3231b"; av.textContent = e.message; });
  });
}


/* ------------------------------------------------ «ya transferí»
   La única verificación posible en pesos es que una persona mire el
   comprobante: ninguna billetera para menores de edad da credenciales de
   cobro. Lo que sí se puede es que eso no cueste una conversación: el que
   transfirió deja el número acá, queda en una cola, y se resuelve de un botón.

   Este formulario NO da acceso. Sólo pide turno. */
var fotoLista = null;
function engancharReclamo(){
  var b = $("rc-btn"); if (!b) return;
  var av = $("rc-aviso");

  var f = $("rc-foto");
  if (f) f.addEventListener("change", function(){
    var a = this.files && this.files[0];
    if (!a) { fotoLista = null; $("rc-previa").hidden = true; return; }
    achicar(a).then(function(d){
      fotoLista = d;
      $("rc-previa").src = d; $("rc-previa").hidden = false;
    }).catch(function(){ fotoLista = null; });
  });
  function decir(t, mal){
    av.hidden = false; av.style.color = mal ? "#a3231b" : "#0e5a2c"; av.textContent = t;
  }
  b.addEventListener("click", function(){
    if (!sesion){
      decir("Primero entrá con tu cuenta: el acceso queda pegado a ella.", true);
      setTimeout(verPerfil, 1200);
      return;
    }
    var refer = ($("rc-refer").value || "").trim();
    if (refer.length < 4){ $("rc-refer").focus(); decir("Falta el número de operación.", true); return; }
    b.disabled = true; decir("Mandando…", false);
    pedir("reclamo", { method:"POST", body: JSON.stringify({
      refer: refer, monto: $("rc-monto").value, moneda: $("rc-moneda").value,
      foto: fotoLista }) })
      .then(function(j){
        b.disabled = false;
        $("rc-refer").value = ""; $("rc-monto").value = "";
        fotoLista = null; $("rc-previa").hidden = true;
        if (j.ya){ decir("Ya tenías el acceso habilitado.", false); return; }
        if (j.enCola){
          decir("¡Completaste " + (j.moneda === "USD" ? "US$ " : "$ ") + j.juntado +
                "! Ya quedó pedido: te avisamos por la campanita apenas lo miremos.", false);
        } else {
          decir("Sumado. Llevás " + (j.moneda === "USD" ? "US$ " : "$ ") + j.juntado +
                " de " + (j.moneda === "USD" ? "US$ " : "$ ") + j.piso +
                ". Te faltan " + (j.moneda === "USD" ? "US$ " : "$ ") + j.falta +
                " para el acceso.", false);
        }
        mirarTramos();
      })
      .catch(function(e){ b.disabled = false; decir(e.message, true); });
  });

  $("rc-moneda").addEventListener("change", mirarTramos);
  mirarTramos();

  /* cuánto lleva juntado y cuánto le falta. Se pide al servidor: el navegador
     no lleva la cuenta de la plata de nadie. */
  function plataDe(m, n){
    return (m === "USD" ? "US$ " : "$ ") +
      n.toLocaleString("es-AR", {maximumFractionDigits: m === "USD" ? 2 : 0});
  }
  function mirarTramos(){
    if (!sesion) return;
    pedir("reclamo").then(function(j){
      var m = $("rc-moneda").value;
      var piso = j.pisos[m];
      $("rc-piso").textContent = plataDe(m, piso);
      var esperando = j.tramos.filter(function(t){ return t.estado === "espera"; })[0];
      if (esperando){
        $("rc-barra").hidden = true;
        decir("Ya mandaste " + plataDe(esperando.moneda, esperando.t) +
              " y está esperando revisión. Te avisamos por la campanita.", false);
        return;
      }
      var jun = j.tramos.filter(function(t){ return t.estado === "juntando" && t.moneda === m; })[0];
      var llevo = jun ? jun.t : 0;
      if (!llevo){ $("rc-barra").hidden = true; return; }
      $("rc-barra").hidden = false;
      $("rc-llevas").textContent = "Llevás " + plataDe(m, llevo);
      $("rc-falta").textContent = "Faltan " + plataDe(m, Math.max(0, piso - llevo));
      $("rc-lleno").style.width = Math.min(100, llevo / piso * 100).toFixed(1) + "%";
    }).catch(function(){});
  }
  engancharReclamo.mirar = mirarTramos;
}


/* ------------------------------------------------------------- avisos
   Aprobar tiene que NOTIFICAR. Sin esto la persona pagó y le queda adivinar
   cuándo volver a mirar, que es la peor parte de comprar en un lugar chico. */
function verAvisos(){
  var c = $("avisosLista"); c.textContent = "";
  abrirVentana("v-avisos");
  c.appendChild(nodo("p", null, "Cargando…"));
  pedir("avisos").then(function(j){
    c.textContent = "";
    if (!j.avisos.length){
      c.appendChild(nodo("p", null, "Todavía no hay avisos.")); return;
    }
    var ul = nodo("ul", "lista");
    j.avisos.forEach(function(a){
      var li = nodo("li"); var f = nodo("div", "fila");
      var b = nodo("span", "bola");
      b.style.background = a.tipo === "bueno"
        ? "radial-gradient(circle at 32% 26%,#e8ffd9,#7cc242 45%,#3f7a17)"
        : a.tipo === "malo"
        ? "radial-gradient(circle at 32% 26%,#ffdcd4,#e0402a 45%,#9a1e0c)"
        : "radial-gradient(circle at 32% 26%,#dff6ff,#57b8e8 45%,#1a6ea8)";
      f.appendChild(b);
      var d = nodo("div");
      d.appendChild(nodo("b", null, a.texto));
      d.appendChild(nodo("span", null, cuando(a.creado)));
      f.appendChild(d); li.appendChild(f); ul.appendChild(li);
    });
    c.appendChild(ul);
    pedir("avisos", { method:"POST", body:"{}" }).then(function(){
      $("bsPunto").hidden = true;
    }).catch(function(){});
  }).catch(function(e){
    c.textContent = ""; c.appendChild(nodo("p", null, e.message));
  });
}

function mirarAvisos(){
  if (!sesion) return;
  pedir("avisos").then(function(j){
    var n = j.sinLeer || 0;
    $("bsPunto").hidden = !n;
    $("bsPunto").textContent = n > 9 ? "9+" : String(n);
    /* si le acaban de habilitar el acceso, que se note ya, sin recargar */
    if (n) pedir("cuenta").then(function(k){
      if (k.pase) document.dispatchEvent(new CustomEvent("hay-pase-de-cuenta", {detail:k.pase}));
    }).catch(function(){});
  }).catch(function(){});
}

/* achicar la captura antes de subirla: una foto de celular son 4 MB y lo que
   hace falta es que se lea un número */
function achicar(archivo){
  return new Promise(function(listo, mal){
    var lector = new FileReader();
    lector.onerror = mal;
    lector.onload = function(){
      var im = new Image();
      im.onerror = mal;
      im.onload = function(){
        var esc = Math.min(1, 1100 / Math.max(im.width, im.height));
        var cv = document.createElement("canvas");
        cv.width = Math.round(im.width * esc); cv.height = Math.round(im.height * esc);
        cv.getContext("2d").drawImage(im, 0, 0, cv.width, cv.height);
        listo(cv.toDataURL("image/jpeg", 0.72));
      };
      im.src = lector.result;
    };
    lector.readAsDataURL(archivo);
  });
}

/* ------------------------------------------------------------ enganches */
document.addEventListener("click", function(e){
  var a = e.target.closest("[data-perfil]");
  if (a){ e.preventDefault(); verPerfil(a.dataset.perfil); return; }

  var bo = e.target.closest("[data-borrar]");
  if (bo){
    if (!confirm("¿Borrar esta publicación?")) return;
    pedir("muro", { method:"POST", body: JSON.stringify({hacer:"borrar", pub:+bo.dataset.borrar}) })
      .then(function(){ cargarMuro(); })
      .catch(function(err){ alert(err.message); });
    return;
  }

  /* apoyar: se abre el enlace de la persona Y se cuenta el apoyo. El conteo no
     dice que pagó —eso no lo sabemos— dice que fue a apoyar */
  var ap = e.target.closest("[data-apoyo]");
  if (ap && sesion){
    pedir("muro", { method:"POST", body: JSON.stringify({hacer:"apoyar", pub:+ap.dataset.apoyo}) })
      .catch(function(){});
  }

  var va = e.target.closest("#cajon [data-va]");
  if (va){
    $("cajon").hidden = true;
    var d = va.dataset.va;
    if (d === "muro"){ abrirVentana("v-muro"); cargarMuro(); }
    if (d === "perfil") verPerfil();
    if (d === "publicar") formularioPublicar();
    if (d === "salir"){ caja.sacar("sesion"); location.reload(); }
    return;
  }
  var ab = e.target.closest("#cajon [data-abrir]");
  if (ab){ $("cajon").hidden = true; abrirVentana(ab.dataset.abrir); }
});

$("bsMenu").addEventListener("click", function(){
  var c = $("cajon"); c.hidden = !c.hidden;
  this.setAttribute("aria-expanded", String(!c.hidden));
});
$("cajon").addEventListener("click", function(e){ if (e.target === this) this.hidden = true; });
document.addEventListener("keydown", function(e){ if (e.key === "Escape") $("cajon").hidden = true; });
$("bsMuro").addEventListener("click", function(){ abrirVentana("v-muro"); cargarMuro(); });
$("bsPerfil").addEventListener("click", function(){ verPerfil(); });
$("bsAjustes").addEventListener("click", function(){ abrirVentana("v-control"); });
$("bsAvisos").addEventListener("click", verAvisos);
$("bsInicio").addEventListener("click", function(e){ e.preventDefault(); scrollTo({top:0, behavior:"smooth"}); });
$("irPublicar").addEventListener("click", formularioPublicar);
$("muroMas").addEventListener("click", function(){ cargarMuro(true); });

/* al entrar al escritorio: comprobar la sesión contra el servidor y abrir el muro */
document.addEventListener("hay-sesion", arrancar);
if (!$("escritorio").hidden) arrancar();

function arrancar(){
  pintarBarra();
  engancharReclamo();
  mirarAvisos();
  setInterval(mirarAvisos, 60000);
  if (sesion){
    /* el pase puede haber vencido o la cuenta estar suspendida: se pregunta */
    pedir("cuenta").then(function(j){
      sesion.yo = j.yo; caja.poner("sesion", sesion); pintarBarra();
      /* el pase de acceso anticipado viaja con la cuenta, no con el navegador */
      if (j.pase) document.dispatchEvent(new CustomEvent("hay-pase-de-cuenta", {detail: j.pase}));
    }).catch(function(){ sesion = null; caja.sacar("sesion"); pintarBarra(); });
  }
  abrirVentana("v-muro");
  cargarMuro();
}
})();
