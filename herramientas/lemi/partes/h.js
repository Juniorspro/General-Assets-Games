/* ══════════════════════════ ARRANQUE Y BUCLE ══════════════════════════ */
function paso(p, txt){
  $('cBar').style.width = (p*100) + '%';
  if (txt) $('cTxt').textContent = txt;
  return new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
}
async function construir(primera){
  await paso(0.10, 'Levantando el terreno…');
  armaTerreno();
  await paso(0.28, 'Llenando el mar…');
  armaAgua();
  /* PRIMERO los sitios: definen los claros donde no se siembra, así el
     campamento no aparece con tres árboles adentro de la fogata */
  await paso(0.36, 'Buscando dónde acampar…');
  eligeSitios();
  await paso(0.44, 'Sembrando…');
  const r = sembrar((p, t) => { $('cBar').style.width = (p*100)+'%'; $('cTxt').textContent = t; });
  await paso(0.78, 'Levantando el campamento…');
  armaSitios();
  await paso(0.88, 'Formando nubes…');
  armaNubes();
  if (nubes) nubes.visible = CFG.nubes;
  CFG.sol = 0.42;                      /* se empieza de mañana */
  ponSol(0);
  await paso(1, r.arboles + ' árboles · ' + SITIOS.length + ' sitios');
  return r;
}
async function resembrar(){
  SEM = (Math.random()*1e9)|0;
  $('carga').classList.remove('ido');
  $('carga').style.display = '';
  await paso(0.02, 'Otra isla…');
  const r = await construir(false);
  aviso(r.arboles + ' árboles nuevos');
  setTimeout(() => { $('carga').classList.add('ido');
    setTimeout(() => $('carga').style.display = 'none', 700); }, 260);
}

let ultimo = performance.now(), fps = 0, cuadros = 0, acum = 0, DIB = 0, TRI = 0;
function bucle(){
  requestAnimationFrame(bucle);
  const ahora = performance.now();
  const dt = Math.min((ahora - ultimo)/1000, 0.08);
  ultimo = ahora;
  RELOJ.value += dt;

  if (MODO === 'menu') CINE.paso(dt);
  else if (MODO === 'cine') INTRO.paso(dt);
  else if (!PAUSA) fisica(dt);
  /* la cinemática pone la hora ella misma cuadro a cuadro: si además corriera
     el reloj del día, el atardecer se le adelantaría al guion */
  ponSol(MODO === 'cine' ? 0 : dt);
  if (MODO !== 'cine') pasoCamello(dt);

  /* el cielo viaja con la cámara: si no, se ve el borde de la esfera */
  cielo.position.set(cam.position.x, 0, cam.position.z);

  /* la fogata: late y parpadea. Es la única luz de la noche y por eso conviene
     que se note que está viva. */
  if (fuegoLuz){
    const t = RELOJ.value;
    const p1 = Math.sin(t*11.3) * 0.5 + Math.sin(t*7.1) * 0.3 + Math.sin(t*23.7) * 0.2;
    fuegoLuz.intensity = (7.5 + p1 * 2.6) * FUEGO_K;
    if (fuegoMalla){
      const e = 0.9 + p1 * 0.12;
      fuegoMalla.scale.set(e, 1 + p1*0.16, e);
      fuegoMalla.rotation.y = t * 1.4;
    }
  }

  /* las nubes se corren despacio y se envuelven alrededor del jugador */
  if (nubes && CFG.nubes){
    nubes.position.x += dt * 1.15;
    if (nubes.position.x > 300) nubes.position.x -= 600;
  }
  /* olas: se mueve el plano del agua por vértice */
  if (agua){
    const p = agua.geometry.attributes.position, b = agua.userData.base;
    for (let i = 0; i < p.count; i++){
      const x = b[i*3], z = b[i*3+2];
      p.array[i*3+1] = Math.sin(RELOJ.value*1.1 + x*0.075) * 0.16
                     + Math.cos(RELOJ.value*0.8 + z*0.061) * 0.13;
    }
    p.needsUpdate = true;
    agua.position.set(cam.position.x, MAR, cam.position.z);
  }

  /* ── el doble pase: escena al target chico, target a la pantalla ── */
  ren.setRenderTarget(rt);
  ren.render(escena, cam);
  /* las cuentas se leen ACÁ: después del segundo pase `ren.info` habla del
     triángulo del post-proceso y decía «1 dib, 1 tri», que no es del mundo */
  DIB = ren.info.render.calls; TRI = ren.info.render.triangles;
  ren.setRenderTarget(null);
  ren.render(postEsc, postCam);

  cuadros++; acum += dt;
  if (acum > 0.5){
    fps = Math.round(cuadros/acum); cuadros = 0; acum = 0;
    const w = rt ? rt.width : 0, h = rt ? rt.height : 0;
    const hh = Math.floor(HORA), mm = Math.floor((HORA % 1) * 60);
    $('fps').textContent = String(hh).padStart(2,'0') + ':' + String(mm).padStart(2,'0') +
      ' · ' + fps + ' fps · ' + w + '×' + h + ' · x' + CFG.pix +
      ' · ' + DIB + ' dib · ' + (TRI/1000).toFixed(0) + 'k tri';
  }
}

(async function(){
  medir();
  addEventListener('resize', () => { clearTimeout(window.__rz);
    window.__rz = setTimeout(medir, 240); });
  armaPanel();
  const r = await construir(true);
  /* el HUD no va en el menú: se prende al entrar al juego */
  CINE.arranca();
  bucle();
  /* de la barra de carga al menú de inicio, con la isla ya viva detrás */
  $('mPie').textContent = r.arboles + ' árboles · ' + SITIOS.length + ' sitios · ' +
    Math.round(MITAD*2) + ' m de lado';
  CINE.arranca();
  $('menu').classList.add('on');
  $('carga').classList.add('ido');
  setTimeout(() => $('carga').style.display = 'none', 700);
  window.__V = { CFG, JUG, escena, ren, T, H, cam,
    nan: () => { const malas = [];
      escena.traverse(ob => { const g = ob.geometry; if (!g || !g.attributes.position) return;
        const a = g.attributes.position.array;
        for (let i = 0; i < a.length; i++) if (!Number.isFinite(a[i])){
          malas.push({ tipo: g.type, nombre: ob.name || ob.type, idx: i, de: a.length }); break; } });
      return malas; },
    entrar: () => { const b = document.getElementById('mJugar'); if (b) b.click(); },
    modo: () => MODO,
    /* LA CINEMÁTICA ES UNA FUNCIÓN DEL TIEMPO, así que se la puede fotografiar
       en cualquier segundo sin esperarlo. Sin esto, comprobar el plano del
       segundo 29 costaba veintinueve segundos por intento. */
    cine: (t) => {
      if (!INTRO.activa) INTRO.arranca();
      INTRO.t = t; INTRO.pon(t);
      /* DÓNDE CAE CADA COSA EN LA PANTALLA, PROYECTADO. «El camello es
         visible» no quiere decir que se vea: puede estar detrás de la cámara o
         fuera del cuadro y `visible` sigue diciendo true. Se proyectan la caja
         del bicho y la fogata a coordenadas de pantalla —0 arriba/izquierda,
         1 abajo/derecha— y además se comprueba que estén DELANTE, porque un
         punto detrás de la cámara proyecta igual, dado vuelta, y cae adentro
         del cuadro: es la trampa que ya costó una medición con el autobús. */
      cam.updateMatrixWorld(true);
      const v = new T.Vector3(), caja = new T.Box3();
      const donde = (ob) => {
        if (!ob || !ob.visible) return null;
        caja.setFromObject(ob);
        if (caja.isEmpty()) return null;
        let x0=9, x1=-9, y0=9, y1=-9, delante = true;
        for (let i = 0; i < 8; i++){
          v.set(i&1 ? caja.max.x : caja.min.x,
                i&2 ? caja.max.y : caja.min.y,
                i&4 ? caja.max.z : caja.min.z);
          v.applyMatrix4(cam.matrixWorldInverse);
          if (v.z > -0.05) delante = false;
          v.applyMatrix4(cam.projectionMatrix);
          const sx = v.x*0.5 + 0.5, sy = 0.5 - v.y*0.5;
          x0 = Math.min(x0, sx); x1 = Math.max(x1, sx);
          y0 = Math.min(y0, sy); y1 = Math.max(y1, sy);
        }
        return { x: [+x0.toFixed(3), +x1.toFixed(3)], y: [+y0.toFixed(3), +y1.toFixed(3)],
                 delante, dentro: delante && x1 > 0 && x0 < 1 && y1 > 0 && y0 < 1,
                 altoPct: +((y1-y0)*100).toFixed(1) };
      };
      return { t, sol: +CFG.sol.toFixed(3), fov: +cam.fov.toFixed(1),
               gente: INTRO.gente.length,
               camello: donde(INTRO.camelloCine),
               fuego: donde(fuegoMalla),
               lemi: donde(INTRO.gente[0]) };
    },
    saltar: () => { INTRO.termina(); return MODO; },
    /* dónde cae el auto en la pantalla, con la misma cuenta que el camello */
    verAuto: () => {
      if (!AUTO) return null;
      cam.updateMatrixWorld(true);
      const caja = new T.Box3().setFromObject(AUTO.g), v = new T.Vector3();
      let x0=9,x1=-9,y0=9,y1=-9,delante=true;
      for (let i = 0; i < 8; i++){
        v.set(i&1?caja.max.x:caja.min.x, i&2?caja.max.y:caja.min.y, i&4?caja.max.z:caja.min.z);
        v.applyMatrix4(cam.matrixWorldInverse);
        if (v.z > -0.05) delante = false;
        v.applyMatrix4(cam.projectionMatrix);
        const sx=v.x*0.5+0.5, sy=0.5-v.y*0.5;
        x0=Math.min(x0,sx); x1=Math.max(x1,sx); y0=Math.min(y0,sy); y1=Math.max(y1,sy);
      }
      /* la distancia va contra DONDE ESTÁ el auto y no contra dónde debería
         estar: midiendo contra el lugar de estacionamiento, la sonda decía
         «6,5 m» mientras el auto estaba a setenta y el defecto quedaba tapado */
      const pg = AUTO.g.position;
      return { autoEn: [+pg.x.toFixed(1), +pg.z.toFixed(1)],
               estaciona: [+AUTO.x.toFixed(1), +AUTO.z.toFixed(1)],
               camEn: [+cam.position.x.toFixed(1), +cam.position.z.toFixed(1)],
               dist: +Math.hypot(cam.position.x-pg.x, cam.position.z-pg.z).toFixed(1),
               x:[+x0.toFixed(2),+x1.toFixed(2)], y:[+y0.toFixed(2),+y1.toFixed(2)],
               delante, altoPct: +((y1-y0)*100).toFixed(1) };
    },
    /* prender y apagar el camello sin tocar nada más: con la misma imagen
       antes y después, la diferencia de píxeles dice si SE VE, que no es lo
       mismo que estar en cuadro */
    verCamello: (v) => { if (INTRO.camelloCine) INTRO.camelloCine.visible = v; return v; },
    /* pone el camello a la distancia que se le pida, en la dirección que
       quiera: sin esto, probar el acecho y la embestida exigía esperar a que
       llegara caminando desde ciento cuarenta metros a 2,2 m/s */
    traerBicho: (d) => { const a = Math.random()*6.283;
      BICHO.x = JUG.x + Math.cos(a)*d; BICHO.z = JUG.z + Math.sin(a)*d;
      return { d }; },
    bicho: () => ({ modo: BICHO.modo, v: +BICHO.v.toFixed(2), golpe: +BICHO.golpe.toFixed(1), reloj: +RELOJ.value.toFixed(1),
                    d: +Math.hypot(JUG.x-BICHO.x, JUG.z-BICHO.z).toFixed(1),
                    sol: +CFG.sol.toFixed(3) }),
    /* dónde quedó todo, para poder fotografiarlo sin caminar hasta ahí */
    sitios: () => ({ campo: CAMPO, auto: AUTO && { x:+AUTO.x.toFixed(1), z:+AUTO.z.toFixed(1) },
                     carpas: CARPAS.map(c => ({ x:+c.x.toFixed(1), z:+c.z.toFixed(1) })),
                     sitios: SITIOS.map(s => s.t) }),
    /* planta al jugador donde se le diga, mirando a donde se le diga */
    poner: (x, z, mx, mz, alto) => {
      JUG.x = x; JUG.z = z; JUG.y = H(x, z);
      /* SIN `+π`: con `rotation.y = yaw` en orden YXZ el frente de la cámara es
         (-sin yaw, 0, -cos yaw), así que mirar de (x,z) a (mx,mz) es
         `atan2(x-mx, z-mz)` pelado. Con el π de más el gancho fotografiaba
         justo lo contrario de lo que se le pedía. */
      JUG.yaw = Math.atan2(x - mx, z - mz);
      JUG.pitch = alto == null ? -0.05 : alto;
      JUG.vy = 0; JUG.aire = false;
      return { x: +JUG.x.toFixed(1), y: +JUG.y.toFixed(1), z: +JUG.z.toFixed(1) };
    },
    est: () => ({ fps, pix: CFG.pix, girado: GIRADO, escenario: [W, H2],
                  rt: rt ? [rt.width, rt.height] : null,
                  dib: DIB, tri: TRI,
                  x: +JUG.x.toFixed(1), z: +JUG.z.toFixed(1), y: +JUG.y.toFixed(1) }) };
})();
