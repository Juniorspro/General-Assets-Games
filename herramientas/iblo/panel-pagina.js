/* La pantalla «La página»: lo que deja cambiar la web sin tocar código.
 *
 * Vive aparte del guion grande del panel a propósito. Usa lo que ya está
 * —`$`, `pedir`, `irA`, `decir`— y se engancha sin editar nada de adentro, así
 * que se puede volver a generar con el script sin riesgo de romper lo que
 * funciona.
 *
 * DOS DECISIONES QUE IMPORTAN:
 *
 * · Se trabaja sobre una copia. Nada se manda al servidor hasta «Publicar los
 *   cambios», y el servidor guarda la versión anterior antes de pisarla. Entre
 *   las dos cosas, equivocarse no cuesta nada.
 * · Los colores se eligen con el selector del teléfono, no escribiendo
 *   hexadecimales, y cada uno tiene el nombre de lo que hace —«Fondo»,
 *   «Tarjetas», «Bordes»— en vez del nombre de la variable CSS.
 */
(function () {
  var TONOS = [
    ["ac", "Acento", "El color fuerte: botones, títulos, luces."],
    ["ac2", "Acento 2", "El secundario, más apagado."],
    ["ac3", "Detalle", "Un tercero claro, para remates."],
    ["tinta", "Fondo", "El fondo de la página. Va oscuro."],
    ["tinta2", "Fondo 2", "Un escalón más claro que el fondo."],
    ["humo", "Tarjetas", "El relleno de las cajas."],
    ["linea", "Bordes", "Las líneas finitas."],
    ["papel", "Texto", "El color de las letras. Va claro."],
  ];
  var estado = { esteticas: [], marca: null, abierta: null, cargado: false };

  var esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  var aviso = function (t, c) {
    var n = document.getElementById("pgAviso");
    if (!t) { n.hidden = true; return; }
    n.hidden = false; n.textContent = t; n.className = "aviso" + (c ? " " + c : "");
  };

  /* ------------------------------------------------------------ dibujar */
  function tonos(p, prefijo) {
    var h = "";
    for (var i = 0; i < TONOS.length; i++) {
      var t = TONOS[i];
      h += '<label class="tono" title="' + esc(t[2]) + '">' +
           '<input type="color" data-tono="' + t[0] + '" data-pref="' + prefijo + '" value="' +
             esc(p[t[0]] || "#000000") + '">' +
           '<span>' + esc(t[1]) + '</span></label>';
    }
    return h;
  }
  var paleta = function (p, pref) { return '<div class="paleta">' + tonos(p, pref) + "</div>"; };

  function fichas(e, i) {
    var h = '<div class="fichasEd" data-i="' + i + '">';
    for (var k = 0; k < e.f.length; k++)
      h += '<div class="fichaFila"><input class="fk" value="' + esc(e.f[k][0]) +
           '" placeholder="Lugar" maxlength="30"><input class="fv" value="' + esc(e.f[k][1]) +
           '" placeholder="Club Juventud" maxlength="90">' +
           '<button type="button" class="mini" data-fuera="' + k + '" aria-label="Sacar">×</button></div>';
    return h + '<button type="button" class="chip" data-masficha="1">+ Otro dato</button></div>';
  }

  function tarjeta(e, i) {
    var abierta = estado.abierta === i;
    var h = '<div class="estCard' + (e.oculta ? " apagada" : "") + '" data-i="' + i + '">' +
      '<div class="estCab">' +
        '<span class="punto" style="background:' + esc(e.paleta.ac) + '"></span>' +
        '<div class="estNom"><b>' + esc(e.n || "Sin nombre") + '</b>' +
          '<span>' + esc(e.sub || "—") + '</span></div>' +
        '<button type="button" class="mini" data-sube="1" aria-label="Subir">▲</button>' +
        '<button type="button" class="mini" data-baja="1" aria-label="Bajar">▼</button>' +
        '<button type="button" class="mini" data-ojo="1" aria-label="Mostrar o esconder">' +
          (e.oculta ? "◌" : "●") + '</button>' +
        '<button type="button" class="mini" data-abre="1" aria-label="Editar">' +
          (abierta ? "▴" : "▾") + '</button>' +
      '</div>';
    if (abierta) {
      h += '<div class="estCuerpo">' +
        '<div class="campo"><label>Nombre</label>' +
          '<input data-c="n" value="' + esc(e.n) + '" maxlength="40"></div>' +
        '<div class="campo"><label>Bajada</label>' +
          '<input data-c="sub" value="' + esc(e.sub) + '" maxlength="90" ' +
          'placeholder="Cowboy Night · 06.06.2026"></div>' +
        '<div class="campo"><label>Descripción</label>' +
          '<textarea data-c="des" maxlength="700" style="min-height:96px">' + esc(e.des) + '</textarea></div>' +
        '<div class="campo"><label>Los datos que se listan</label>' + fichas(e, i) + '</div>' +
        '<div class="campo"><label>Mensaje de WhatsApp</label>' +
          '<input data-c="wsp" value="' + esc(e.wsp) + '" maxlength="300"></div>' +
        '<div class="campo"><label>Foto del flyer</label>' +
          '<input type="file" accept="image/*" data-flyer="1">' +
          (e.flyerUrl ? '<img class="previaFlyer" src="' + esc(e.flyerUrl) + '" alt="">' : "") +
          '<p class="baja">Si no subís ninguna, queda la que ya tenía.</p></div>' +
        '<label>Colores de esta fiesta</label>' + paleta(e.paleta, "e" + i) +
        '<button type="button" class="bt malo" data-borra="1" style="margin-top:14px">' +
          'Sacar esta estética</button>' +
      "</div>";
    }
    return h + "</div>";
  }

  function pintar() {
    var l = document.getElementById("pgLista");
    l.innerHTML = estado.esteticas.map(tarjeta).join("");
    document.getElementById("pgVacio").hidden = estado.esteticas.length > 0;
  }

  function pintarMarca() {
    var m = estado.marca || {};
    document.getElementById("pgPalMarca").innerHTML = tonos(m.paleta || {}, "m");
    document.getElementById("pgCurva").value = m.curva == null ? 18 : m.curva;
    document.getElementById("pgCurvaV").textContent = (m.curva == null ? 18 : m.curva) + " px";
    var g = Math.round((m.grano == null ? 0.045 : m.grano) * 1000);
    document.getElementById("pgGrano").value = g;
    document.getElementById("pgGranoV").textContent = (g / 10).toFixed(1).replace(".", ",") + " %";
  }

  /* --------------------------------------------------------- traer/guardar */
  function cargarPagina() {
    if (estado.cargado) return;
    aviso("");
    pedir("/sitio").then(function (d) {
      var a = (d && d.areas) || {};
      estado.esteticas = Array.isArray(a.esteticas) ? a.esteticas : [];
      /* Si la base todavía no tiene nada, se arranca de los colores que ya trae
         la web, no de negro: abrir el panel no tiene que ofrecer romper todo. */
      estado.marca = a.marca || { paleta: {
        ac: "#ff1e8e", ac2: "#8b2fd6", ac3: "#ffd23f", tinta: "#08070c",
        tinta2: "#100d18", humo: "#1a1622", linea: "#2b2436", papel: "#f4f1f6" },
        curva: 18, grano: 0.045 };
      if (!estado.marca.paleta) estado.marca.paleta = {};
      estado.cargado = true;
      /* La base arranca vacía: hasta que el dueño publique algo, la web sigue
         mostrando lo que trae el HTML. Se avisa, porque si no parece un error. */
      if (!estado.esteticas.length)
        aviso("La web está mostrando las estéticas que vienen de fábrica. En cuanto " +
              "publiques desde acá, pasan a mandar estas.", "");
      pintar(); pintarMarca();
    }).catch(function (e) { aviso(e.message, "mal"); });
  }

  function guardar() {
    var bt = document.getElementById("pgBtGuardar");
    bt.disabled = true;
    var antes = bt.textContent; bt.textContent = "Publicando…";
    pedir("/sitio", { metodo: "PUT", cuerpo: { area: "esteticas", valor: estado.esteticas } })
      .then(function () {
        return pedir("/sitio", { metodo: "PUT", cuerpo: { area: "marca", valor: estado.marca } });
      })
      .then(function () { aviso("Listo, la web ya está cambiada.", "bien"); })
      .catch(function (e) { aviso(e.message, "mal"); })
      .then(function () { bt.disabled = false; bt.textContent = antes; });
  }

  function deshacer() {
    if (!confirm("¿Volver la página a como estaba antes del último cambio?")) return;
    pedir("/sitio", { metodo: "POST", cuerpo: { area: "esteticas" } })
      .then(function (d) {
        if (d && d.valor) estado.esteticas = d.valor;
        return pedir("/sitio", { metodo: "POST", cuerpo: { area: "marca" } }).catch(function () { return null; });
      })
      .then(function (d) {
        if (d && d.valor) estado.marca = d.valor;
        pintar(); pintarMarca(); aviso("Volvió a como estaba.", "bien");
      })
      .catch(function (e) { aviso(e.message, "mal"); });
  }

  /* --------------------------------------------------------------- la IA */
  function porIA() {
    var idea = document.getElementById("pgIdea").value.trim();
    if (!idea) { aviso("Contame de qué va la fiesta.", "mal"); return; }
    var bt = document.getElementById("pgBtIA");
    bt.disabled = true; var antes = bt.textContent; bt.textContent = "Pensando…";
    pedir("/estilo", { metodo: "POST", cuerpo: { idea: idea } })
      .then(function (d) {
        estado.esteticas.push(d.estetica);
        estado.abierta = estado.esteticas.length - 1;
        pintar();
        document.getElementById("pgIdea").value = "";
        aviso("La escribió " + (d.de || "la IA") + ". Miralo bien y corregí lo que quieras: " +
              "todavía no está publicada.", "bien");
      })
      .catch(function (e) { aviso(e.message, "mal"); })
      .then(function () { bt.disabled = false; bt.textContent = antes; });
  }

  /* ------------------------------------------------------------- eventos */
  function idx(n) {
    var c = n.closest("[data-i]");
    return c ? +c.dataset.i : -1;
  }

  document.addEventListener("click", function (ev) {
    var b = ev.target.closest("button"); if (!b) return;
    if (b.id === "pgBtGuardar") return guardar();
    if (b.id === "pgBtDeshacer") return deshacer();
    if (b.id === "pgBtIA") return porIA();
    if (b.id === "pgBtNueva") {
      var base = {}; for (var i = 0; i < TONOS.length; i++) base[TONOS[i][0]] =
        (estado.marca && estado.marca.paleta && estado.marca.paleta[TONOS[i][0]]) || "#888888";
      estado.esteticas.push({ k: "nueva-" + Date.now().toString(36).slice(-4), n: "Nueva",
        sub: "", des: "", wsp: "", f: [], paleta: base, flyer: "", flyerUrl: "",
        pieza: null, dec: null, clip: null, mov: "flota", oculta: false });
      estado.abierta = estado.esteticas.length - 1;
      return pintar();
    }
    var s = b.closest("#pgSolapas");
    if (s) {
      [].forEach.call(s.children, function (x) { x.classList.toggle("viva", x === b); });
      document.getElementById("pgEst").hidden = b.dataset.s !== "est";
      document.getElementById("pgMarca").hidden = b.dataset.s !== "marca";
      return;
    }
    var i = idx(b); if (i < 0) return;
    var e = estado.esteticas[i]; if (!e) return;
    if (b.dataset.abre) { estado.abierta = estado.abierta === i ? null : i; return pintar(); }
    if (b.dataset.ojo) { e.oculta = !e.oculta; return pintar(); }
    if (b.dataset.sube && i > 0) {
      estado.esteticas.splice(i - 1, 0, estado.esteticas.splice(i, 1)[0]);
      estado.abierta = null; return pintar();
    }
    if (b.dataset.baja && i < estado.esteticas.length - 1) {
      estado.esteticas.splice(i + 1, 0, estado.esteticas.splice(i, 1)[0]);
      estado.abierta = null; return pintar();
    }
    if (b.dataset.borra) {
      if (!confirm("¿Sacar «" + (e.n || "esta") + "» de la web?")) return;
      estado.esteticas.splice(i, 1); estado.abierta = null; return pintar();
    }
    if (b.dataset.masficha) { e.f.push(["", ""]); return pintar(); }
    if (b.dataset.fuera != null) { e.f.splice(+b.dataset.fuera, 1); return pintar(); }
  });

  /* Los textos se anotan al salir del campo y no en cada tecla: volver a
     dibujar la tarjeta en cada letra le saca el foco al que está escribiendo. */
  document.addEventListener("input", function (ev) {
    var n = ev.target;
    if (n.id === "pgCurva") {
      estado.marca.curva = +n.value;
      document.getElementById("pgCurvaV").textContent = n.value + " px";
      document.documentElement.style.setProperty("--curva", n.value + "px");
      return;
    }
    if (n.id === "pgGrano") {
      estado.marca.grano = +n.value / 1000;
      document.getElementById("pgGranoV").textContent = (+n.value / 10).toFixed(1).replace(".", ",") + " %";
      return;
    }
    if (n.dataset && n.dataset.tono) {
      var p = n.dataset.pref;
      if (p === "m") {
        estado.marca.paleta = estado.marca.paleta || {};
        estado.marca.paleta[n.dataset.tono] = n.value;
        /* se ve en el panel mismo: es la forma más rápida de saber si un color
           se lee o no, sin ir a la web y volver */
        document.documentElement.style.setProperty("--" + n.dataset.tono, n.value);
      } else {
        var j = +p.slice(1);
        if (estado.esteticas[j]) {
          estado.esteticas[j].paleta[n.dataset.tono] = n.value;
          var pt = document.querySelector('.estCard[data-i="' + j + '"] .punto');
          if (pt && n.dataset.tono === "ac") pt.style.background = n.value;
        }
      }
      return;
    }
    var i = idx(n); if (i < 0) return;
    var e = estado.esteticas[i]; if (!e) return;
    if (n.dataset.c) { e[n.dataset.c] = n.value; return; }
    if (n.classList.contains("fk") || n.classList.contains("fv")) {
      var fila = n.closest(".fichaFila");
      var k = [].indexOf.call(fila.parentNode.querySelectorAll(".fichaFila"), fila);
      if (e.f[k]) e.f[k][n.classList.contains("fk") ? 0 : 1] = n.value;
    }
  });

  /* La foto del flyer se sube al depósito que ya usa el archivo y queda como
     dirección: meterla en base64 adentro del contenido lo haría pesar megas. */
  document.addEventListener("change", function (ev) {
    var n = ev.target;
    if (!n.dataset || !n.dataset.flyer || !n.files || !n.files[0]) return;
    var i = idx(n); if (i < 0) return;
    var f = n.files[0];
    if (f.size > 6e6) { aviso("Esa foto pesa mucho. Mandá una más liviana.", "mal"); return; }
    aviso("Subiendo la foto…");
    var lector = new FileReader();
    lector.onload = function () {
      pedir("/archivo", { metodo: "POST", cuerpo: { nuevaSeccion: "Flyers" } })
        .catch(function () { return null; })
        .then(function () {
          return pedir("/archivo", { metodo: "POST", cuerpo: {
            seccion: "flyers", titulo: estado.esteticas[i].n || "Flyer", medio: lector.result } });
        })
        .then(function (d) {
          estado.esteticas[i].flyerUrl = API + "/archivo?id=" + d.id;
          pintar(); aviso("Foto lista. Falta publicar los cambios.", "bien");
        })
        .catch(function (e) { aviso(e.message, "mal"); });
    };
    lector.readAsDataURL(f);
  });

  /* --------------------------------------------------------- engancharse */
  if (typeof PANTALLAS !== "undefined" && PANTALLAS.indexOf("pPagina") < 0)
    PANTALLAS.push("pPagina");
  if (typeof irA === "function") {
    var original = irA;
    irA = function (p) { original(p); if (p === "pPagina") cargarPagina(); };
  }
  window.cargarPagina = cargarPagina;
})();
