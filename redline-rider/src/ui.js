/* Capa de interfaz: pantallas y HUD. El juego 3D nunca toca el DOM directamente. */

import { t, LANGS, setLang, getLang, TIP_COUNT } from './i18n.js';
import { state, save, wipe, BIKES, bikeById, bikeStats, buyBike, buyUpgrade,
         UPGRADES, UPGRADE_TIERS, upgradeCost, tierOf, QUALITIES } from './state.js';
import * as audio from './audio.js';
import * as controls from './controls.js';

const $ = id => document.getElementById(id);
const SCREENS = ['boot','lang','quality','menu','garage','settings','credits','pause','results'];

function num(n){
  if (n < 100000) return String(Math.round(n));
  try { return new Intl.NumberFormat(getLang(), { notation:'compact', maximumFractionDigits:1 }).format(n); }
  catch (e) { return String(Math.round(n)); }
}

export class UI {
  constructor(hooks){
    this.h = hooks || {};
    this.screen = 'boot';
    this.tipIdx = 0;
    this.el = {};
    for (const s of SCREENS) this.el[s] = $('s-' + s);
    this.hudEl = $('hud');

    this.buildLangGrid();
    this.buildQualityGrid();
    this.buildSettings();
    this.wire();
    this.applyI18n();
    this.startTips();
  }

  applyI18n(){
    document.querySelectorAll('[data-i18n]').forEach(n => { n.textContent = t(n.dataset.i18n); });
    this.refreshMenu();
    this.refreshGarage();
    this.refreshSettings();
  }

  show(name){
    this.screen = name;
    for (const s of SCREENS) this.el[s].classList.toggle('on', s === name);
    this.hudEl.classList.toggle('on', name === 'game' || name === 'pause');
    if (name === 'menu') this.refreshMenu();
    if (name === 'garage') this.refreshGarage();
    if (name === 'settings') this.refreshSettings();
  }

  toast(msg){
    const el = $('toast');
    el.textContent = msg;
    el.classList.add('on');
    clearTimeout(this.toastT);
    this.toastT = setTimeout(() => el.classList.remove('on'), 1700);
  }

  /* ---------- carga ---------- */
  startTips(){
    const paint = () => { $('boot-tip').textContent = t('boot.tip.' + (this.tipIdx++ % TIP_COUNT)); };
    paint();
    this.tipTimer = setInterval(paint, 3800);
  }
  setProgress(p){
    const pct = Math.round(Math.max(0, Math.min(1, p)) * 100);
    $('bar').firstElementChild.style.width = pct + '%';
    $('boot-pct').textContent = pct + '%';
  }
  bootReady(){
    $('boot-go').classList.add('on');
    const go = () => {
      if (this.screen !== 'boot') return;
      clearInterval(this.tipTimer);
      audio.unlock();
      this.h.onBootDone && this.h.onBootDone();
    };
    this.el.boot.addEventListener('pointerdown', go);
    addEventListener('keydown', e => { if (e.code === 'Space' || e.code === 'Enter') go(); });
  }

  /* ---------- idioma y calidad ---------- */
  buildLangGrid(){
    const g = $('langgrid');
    g.innerHTML = '';
    for (const l of LANGS){
      const b = document.createElement('button');
      b.className = 'card lang';
      b.innerHTML = '<b></b><span></span>';
      b.querySelector('b').textContent = l.flag;
      b.querySelector('span').textContent = l.label;
      b.addEventListener('click', () => {
        setLang(l.id); state.lang = l.id; save();
        this.applyI18n();
        this.h.onLangPicked && this.h.onLangPicked();
      });
      g.appendChild(b);
    }
  }

  buildQualityGrid(){
    const g = $('qgrid');
    g.innerHTML = '';
    for (const q of QUALITIES){
      const b = document.createElement('button');
      b.className = 'card';
      b.dataset.q = q;
      b.innerHTML = '<b></b><span></span>';
      b.addEventListener('click', () => {
        state.quality = q; save();
        this.h.onQuality && this.h.onQuality(q);
        this.paintQuality();
        this.h.onQualityPicked && this.h.onQualityPicked();
      });
      g.appendChild(b);
    }
    this.paintQuality();
  }
  paintQuality(){
    for (const b of $('qgrid').children){
      const q = b.dataset.q;
      b.querySelector('b').textContent = t('q.' + q);
      b.querySelector('span').textContent = t('q.' + q + 'd');
      b.classList.toggle('sel', state.quality === q);
    }
  }

  /* ---------- menu ---------- */
  refreshMenu(){
    $('m-cash').textContent = num(state.cash);
    $('m-best').textContent = num(state.best.score);
    $('m-km').textContent = (state.distanceTotal / 1000).toFixed(1);
  }

  /* ---------- garaje ---------- */
  refreshGarage(){
    const list = $('bikelist');
    if (!list) return;
    list.innerHTML = '';
    for (const b of BIKES){
      const owned = state.owned.includes(b.id);
      const sel = state.bike === b.id;
      const st = bikeStats(b.id);
      const d = document.createElement('div');
      d.className = 'bike' + (sel ? ' sel' : '');
      d.innerHTML =
        '<div class="bhead"><span class="bname"></span><span class="btop"></span></div>' +
        bar('garage.top', st.topKmh / 340) + bar('garage.acc', st.amax / 8) +
        bar('garage.brk', st.brake / 15) + bar('garage.grp', st.handling / 1.3) +
        '<div style="margin-top:9px"></div>';
      d.querySelector('.bname').textContent = b.name;
      d.querySelector('.btop').textContent = Math.round(st.topKmh) + ' km/h';
      const foot = d.lastElementChild;

      if (!owned){
        const buy = document.createElement('button');
        buy.className = 'btn small';
        buy.textContent = t('garage.buy', { v:num(b.price) });
        buy.disabled = state.cash < b.price;
        buy.addEventListener('click', () => {
          if (buyBike(b)){ this.refreshGarage(); this.refreshMenu(); this.h.onBike && this.h.onBike(); }
          else this.toast(t('garage.nocash'));
        });
        foot.appendChild(buy);
      } else if (!sel){
        const use = document.createElement('button');
        use.className = 'btn small ghost';
        use.textContent = t('garage.select');
        use.addEventListener('click', () => {
          state.bike = b.id; save();
          this.refreshGarage(); this.h.onBike && this.h.onBike();
        });
        foot.appendChild(use);
      } else {
        const tag = document.createElement('div');
        tag.className = 'btop';
        tag.textContent = t('garage.selected');
        foot.appendChild(tag);
      }

      if (owned){
        const ups = document.createElement('div');
        ups.style.marginTop = '10px';
        const ttl = document.createElement('div');
        ttl.className = 'lab';
        ttl.style.textAlign = 'left';
        ttl.textContent = t('garage.upgrades');
        ups.appendChild(ttl);
        for (const u of UPGRADES){
          const tier = tierOf(b.id, u.id);
          const maxed = tier >= UPGRADE_TIERS;
          const cost = upgradeCost(b, tier);
          const row = document.createElement('div');
          row.className = 'uprow';
          row.innerHTML = '<span style="font-size:11.5px">' + t(u.key) + '</span>' +
            '<span class="pips">' + Array.from({ length:UPGRADE_TIERS },
              (_, i) => '<i class="pip' + (i < tier ? ' on' : '') + '"></i>').join('') + '</span>';
          const btn = document.createElement('button');
          btn.className = 'btn small' + (maxed ? ' ghost' : '');
          btn.textContent = maxed ? t('garage.max') : num(cost);
          btn.disabled = maxed || state.cash < cost;
          btn.addEventListener('click', () => {
            const paid = buyUpgrade(b.id, u.id);
            if (paid){ this.toast('-' + num(paid)); this.refreshGarage(); this.refreshMenu(); this.h.onBike && this.h.onBike(); }
            else this.toast(t('garage.nocash'));
          });
          row.appendChild(btn);
          ups.appendChild(row);
        }
        d.appendChild(ups);
      }
      list.appendChild(d);
    }

    function bar(key, frac){
      const pct = Math.round(Math.max(0, Math.min(1, frac)) * 100);
      return '<div class="barrow"><span>' + t(key) + '</span><span class="track"><i style="width:' +
             pct + '%"></i></span></div>';
    }
  }

  /* ---------- ajustes ---------- */
  seg(host, options, get, set){
    host.innerHTML = '';
    const paint = () => {
      const cur = get();
      [...host.children].forEach((b, i) => b.classList.toggle('on', options[i].value === cur));
    };
    for (const o of options){
      const b = document.createElement('button');
      b.textContent = o.label;
      b.addEventListener('click', () => { set(o.value); save(); paint(); });
      host.appendChild(b);
    }
    paint();
    return paint;
  }

  buildSettings(){
    this.rp = {};
    this.rp.lang = this.seg($('set-lang'), LANGS.map(l => ({ label:l.flag, value:l.id })),
      () => getLang(), v => { setLang(v); state.lang = v; this.applyI18n(); });
    this.rp.quality = this.seg($('set-quality'),
      QUALITIES.map(q => ({ label:t('q.' + q), value:q })),
      () => state.quality, v => { state.quality = v; this.h.onQuality && this.h.onQuality(v); });
    /* Elegir giroscopio tiene que pedir el permiso AQUI, dentro del gesto del toque: iOS
       rechaza requestPermission fuera de uno, y si se intentase al empezar la partida el
       jugador se quedaria sin direccion en plena autopista. */
    this.rp.scheme = this.seg($('set-scheme'),
      controls.SCHEMES.map(s => ({ label:t('sch.' + s), value:s })),
      () => state.scheme || controls.defaultScheme(),
      v => {
        state.scheme = v;
        if (v === 'tilt') controls.enableGyro().then(ok => {
          if (!ok) return this.toast(t('sch.nogyro'));
          /* Conceder el permiso no garantiza lecturas: en un iframe sin allow="gyroscope" el
             evento no llega nunca. Se comprueba pasado un momento en vez de degradar al
             arrastre en silencio, que es exactamente la queja de pedir inclinacion y no
             tenerla sin saber por que. */
          setTimeout(() => {
            if (controls.gyroStatus() !== 'live') this.toast(t('sch.nogyro'));
          }, 1600);
        });
        this.paintPedals();
      });
    $('b-calib').addEventListener('click', () => {
      controls.calibrateGyro();
      this.toast(t('sch.calibrated'));
    });

    this.rp.haptics = this.seg($('set-haptics'),
      [{ label:t('common.on'), value:true }, { label:t('common.off'), value:false }],
      () => state.haptics, v => { state.haptics = v; });
    this.rp.invert = this.seg($('set-invert'),
      [{ label:t('common.on'), value:true }, { label:t('common.off'), value:false }],
      () => state.invert, v => { state.invert = v; });

    const slider = (el, get, set) => {
      el.value = get();
      el.addEventListener('input', () => set(+el.value));
      el.addEventListener('change', save);
    };
    slider($('set-music'), () => Math.round(state.music * 100), v => { state.music = v / 100; audio.refreshVolumes(); });
    slider($('set-sfx'), () => Math.round(state.sfx * 100), v => { state.sfx = v / 100; audio.play('click'); });
    slider($('set-sens'), () => Math.round(state.sens * 100), v => { state.sens = v / 100; });

    $('b-wipe').addEventListener('click', () => {
      if (!confirm(t('set.resetAsk'))) return;
      wipe();
      this.applyI18n();
      this.h.onWipe && this.h.onWipe();
    });
  }

  /** Los pedales de giro solo tienen sentido con el esquema de botones. */
  paintPedals(){
    const p = $('pedals');
    if (p) p.classList.toggle('btns', controls.activeScheme() === 'buttons');
  }

  /** Punto vivo del angulo de inclinacion: es la unica forma de que el jugador vea que el
      giroscopio responde de verdad y hacia donde. */
  tilt(deg, live){
    const bar = $('tiltbar');
    if (!bar || this.screen !== 'settings') return;
    bar.classList.toggle('dead', !live);
    const k = Math.max(-1, Math.min(1, deg / 22));
    bar.firstElementChild.nextElementSibling.style.transform = 'translateX(' + (k * 52) + 'px)';
  }

  refreshSettings(){
    if (!this.rp) return;
    for (const k in this.rp) this.rp[k]();
    this.paintPedals();
    const q = $('set-quality').children;
    QUALITIES.forEach((x, i) => { if (q[i]) q[i].textContent = t('q.' + x); });
    const sc = $('set-scheme').children;
    controls.SCHEMES.forEach((x, i) => { if (sc[i]) sc[i].textContent = t('sch.' + x); });
    for (const host of [$('set-haptics'), $('set-invert')]){
      if (host.children[0]) host.children[0].textContent = t('common.on');
      if (host.children[1]) host.children[1].textContent = t('common.off');
    }
    $('set-music').value = Math.round(state.music * 100);
    $('set-sfx').value = Math.round(state.sfx * 100);
    $('set-sens').value = Math.round(state.sens * 100);
  }

  /* ---------- HUD ---------- */
  hud(d){
    $('h-kmh').textContent = d.kmh;
    $('h-gear').textContent = t('hud.gear') + ' ' + d.gear;
    $('h-dist').textContent = (d.distance / 1000).toFixed(2) + ' km';
    $('h-score').textContent = num(d.score);
    $('rpm').firstElementChild.style.width = Math.round(Math.min(1, d.rpm) * 100) + '%';
    const c = $('combo');
    c.classList.toggle('on', d.combo >= 3);
    if (d.combo >= 3) c.textContent = 'x' + d.mult + '  (' + d.combo + ')';
  }

  popup(title, points){
    const el = $('popup');
    el.querySelector('.t').textContent = title;
    el.querySelector('.p').textContent = points ? '+' + points : '';
    el.style.transition = 'none';
    el.style.opacity = '1';
    el.style.transform = 'translate(-50%,-50%) scale(1.18)';
    requestAnimationFrame(() => {
      el.style.transition = 'opacity .6s ease, transform .6s cubic-bezier(.2,.9,.2,1)';
      el.style.opacity = '0';
      el.style.transform = 'translate(-50%,-60%) scale(1)';
    });
  }

  showResults(r, rec){
    $('r-score').textContent = num(r.score);
    $('r-dist').textContent = (r.distance / 1000).toFixed(2) + ' km';
    $('r-over').textContent = r.overtakes;
    $('r-close').textContent = r.closes;
    $('r-top').textContent = r.topKmh + ' km/h';
    $('r-combo').textContent = 'x' + (1 + Math.floor(r.combo / 3));
    $('r-cash').textContent = '+' + num(r.cash);
    $('r-rec').textContent = (rec && (rec.score || rec.distance)) ? t('res.newbest') : '';
    this.show('results');
  }

  wire(){
    const ui = $('ui');
    ui.addEventListener('pointerdown', e => { if (e.target.closest('button')) audio.play('click'); });
    controls.bindPedals({ gas:$('p-gas'), brake:$('p-brake'),
                          left:$('p-left'), right:$('p-right'), horn:$('p-horn') });
    const on = (id, fn) => { const el = $(id); if (el) el.addEventListener('click', fn); };
    on('b-play',     () => this.h.onPlay && this.h.onPlay());
    on('b-garage',   () => this.show('garage'));
    on('b-settings', () => this.show('settings'));
    on('b-credits',  () => this.show('credits'));
    document.querySelectorAll('[data-back]').forEach(b => b.addEventListener('click', () => this.show('menu')));
    on('pausebtn',  () => this.h.onPause && this.h.onPause());
    on('b-resume',  () => this.h.onResume && this.h.onResume());
    on('b-restart', () => this.h.onRestart && this.h.onRestart());
    on('b-tomenu',  () => this.h.onMenu && this.h.onMenu());
    on('b-again',   () => this.h.onRestart && this.h.onRestart());
    on('b-rmenu',   () => this.h.onMenu && this.h.onMenu());
  }
}
