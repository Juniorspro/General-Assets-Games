/* Capa de interfaz: pantallas, menus y HUD. El juego 3D nunca toca el DOM directamente. */

import { t, LANGS, setLang, getLang, TIP_COUNT } from './i18n.js';
import { state, save, SKINS, TRACKS, skinById, skinLocked, buySkin, missionReady, claimMission, missionDef, wipe } from './state.js';
import * as audio from './audio.js';

const $ = id => document.getElementById(id);
const SCREENS = ['boot','lang','menu','skins','missions','settings','credits','pause','over','win'];

export class UI {
  constructor(hooks){
    this.h = hooks || {};
    this.screen = 'boot';
    this.tipIdx = 0;
    this.comboTimer = null;
    this.toastTimer = null;

    this.el = {};
    for (const s of SCREENS) this.el[s] = $('s-' + s);
    this.hudEl = $('hud');

    this.buildLangGrid();
    this.buildSettings();
    this.wire();
    this.applyI18n();
    this.startTips();
  }

  /* ---------- utilidades ---------- */
  applyI18n(){
    document.querySelectorAll('[data-i18n]').forEach(n => { n.textContent = t(n.dataset.i18n); });
    this.refreshMenu();
    this.refreshSkins();
    this.refreshMissions();
    this.refreshSettings();
  }

  setAccent(hex){ document.documentElement.style.setProperty('--accent', hex); }

  show(name){
    this.screen = name;
    for (const s of SCREENS) this.el[s].classList.toggle('on', s === name);
    this.hudEl.classList.toggle('on', name === 'game' || name === 'pause');
    if (name === 'menu') this.refreshMenu();
    if (name === 'skins') this.refreshSkins();
    if (name === 'missions') this.refreshMissions();
    if (name === 'settings') this.refreshSettings();
  }

  toast(msg){
    const el = $('toast');
    el.textContent = msg;
    el.classList.add('on');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => el.classList.remove('on'), 1800);
  }

  /* ---------- carga ---------- */
  startTips(){
    const paint = () => {
      $('boot-tip').textContent = t('boot.tip.' + (this.tipIdx % TIP_COUNT));
      this.tipIdx++;
    };
    paint();
    this.tipTimer = setInterval(paint, 3600);
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

  /* ---------- idioma ---------- */
  buildLangGrid(){
    const g = $('langgrid');
    g.innerHTML = '';
    for (const l of LANGS){
      const b = document.createElement('button');
      b.className = 'lang';
      b.innerHTML = '<b></b><span></span>';
      b.querySelector('b').textContent = l.flag;
      b.querySelector('span').textContent = l.label;
      b.addEventListener('click', () => {
        setLang(l.id);
        state.lang = l.id;
        save();
        this.applyI18n();
        this.h.onLangPicked && this.h.onLangPicked(l.id);
      });
      g.appendChild(b);
    }
  }

  /* ---------- menu ---------- */
  refreshMenu(){
    $('m-level').textContent = state.level;
    $('m-best').textContent = state.best;
    $('m-coins').textContent = state.coins;
  }

  /* ---------- pelotas ---------- */
  refreshSkins(){
    const g = $('skingrid');
    if (!g) return;
    g.innerHTML = '';
    for (const sk of SKINS){
      const lock = skinLocked(sk);
      const b = document.createElement('button');
      b.className = 'skin' + (state.skin === sk.id ? ' sel' : '') + (lock ? ' locked' : '');
      const hex = '#' + sk.color.toString(16).padStart(6, '0');
      const st = state.skin === sk.id ? t('skins.equipped')
        : !lock ? t('skins.equip')
        : lock.reason === 'level' ? t('skins.needlevel', { v:lock.v })
        : t('skins.buy', { v:lock.v });
      b.innerHTML =
        '<div class="orb" style="background:radial-gradient(circle at 33% 28%,#fff6,' + hex + ' 62%,#0006)"></div>' +
        '<div class="nm"></div><div class="rr r-' + sk.rarity + '"></div><div class="st"></div>';
      b.querySelector('.nm').textContent = sk.name;
      b.querySelector('.rr').textContent = t('rarity.' + sk.rarity);
      b.querySelector('.st').textContent = st;
      b.addEventListener('click', () => {
        const l = skinLocked(sk);
        if (!l){
          state.skin = sk.id; save();
          this.h.onSkin && this.h.onSkin(skinById(sk.id));
          this.refreshSkins();
        } else if (l.reason === 'cost'){
          if (buySkin(sk)){
            state.skin = sk.id; save();
            this.h.onSkin && this.h.onSkin(skinById(sk.id));
            this.refreshSkins(); this.refreshMenu();
          } else this.toast(t('skins.nocoins'));
        } else this.toast(t('skins.needlevel', { v:l.v }));
      });
      g.appendChild(b);
    }
  }

  /* ---------- misiones ---------- */
  refreshMissions(){
    const list = $('missionlist');
    if (!list) return;
    list.innerHTML = '';
    for (const m of state.missions){
      const def = missionDef(m.key);
      const ready = missionReady(m);
      const pct = Math.min(100, Math.round(m.progress / m.target * 100));
      const d = document.createElement('div');
      d.className = 'mission';
      d.innerHTML =
        '<div class="tx"></div><div class="mtrack"><i style="width:' + pct + '%"></i></div>' +
        '<div class="mfoot"><span class="n"></span><span class="reward">+' + (def ? def.reward : 50) + '</span></div>';
      d.querySelector('.tx').textContent = t(m.key, { v:m.target });
      d.querySelector('.n').textContent = Math.min(m.progress, m.target) + ' / ' + m.target;
      if (ready || m.claimed){
        const b = document.createElement('button');
        b.className = 'btn small' + (m.claimed ? ' ghost' : ' primary');
        b.textContent = m.claimed ? t('missions.done') : t('missions.claim');
        b.disabled = m.claimed;
        b.addEventListener('click', () => {
          const r = claimMission(m);
          if (r){ this.toast('+' + r); this.refreshMissions(); this.refreshMenu(); }
        });
        d.querySelector('.mfoot').appendChild(b);
      }
      list.appendChild(d);
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
    this.repaint = {};

    this.repaint.lang = this.seg($('set-lang'),
      LANGS.map(l => ({ label:l.flag, value:l.id })),
      () => getLang(),
      v => { setLang(v); state.lang = v; this.applyI18n(); });

    // en la version de un solo fichero no viajan todas las pistas
    this.tracks = TRACKS.filter(x => audio.trackAvailable(x.id));
    this.repaint.track = this.seg($('set-track'),
      this.tracks.map(x => ({ label:t(x.key), value:x.id })),
      () => state.track,
      v => { state.track = v; this.h.onTrack && this.h.onTrack(v); });

    this.repaint.quality = this.seg($('set-quality'),
      [{ label:t('quality.low'), value:'low' }, { label:t('quality.med'), value:'med' }, { label:t('quality.high'), value:'high' }],
      () => state.quality,
      v => { state.quality = v; this.h.onQuality && this.h.onQuality(v); });

    this.repaint.haptics = this.seg($('set-haptics'),
      [{ label:t('common.on'), value:true }, { label:t('common.off'), value:false }],
      () => state.haptics, v => { state.haptics = v; });

    this.repaint.invert = this.seg($('set-invert'),
      [{ label:t('common.on'), value:true }, { label:t('common.off'), value:false }],
      () => state.invert, v => { state.invert = v; });

    const slider = (el, get, set) => {
      el.value = get();
      el.addEventListener('input', () => { set(+el.value); });
      el.addEventListener('change', save);
    };
    slider($('set-music'), () => Math.round(state.music * 100),
      v => { state.music = v / 100; audio.refreshVolumes(); });
    slider($('set-sfx'), () => Math.round(state.sfx * 100),
      v => { state.sfx = v / 100; audio.play('click'); });
    slider($('set-sens'), () => Math.round(state.sens * 100), v => { state.sens = v / 100; });

    $('b-wipe').addEventListener('click', () => {
      if (!confirm(t('settings.resetAsk'))) return;
      wipe();
      this.applyI18n();
      this.h.onWipe && this.h.onWipe();
    });
  }

  refreshSettings(){
    if (!this.repaint) return;
    for (const k in this.repaint) this.repaint[k]();
    // los textos de las opciones dependen del idioma activo
    const tr = $('set-track').children, q = $('set-quality').children;
    (this.tracks || TRACKS).forEach((x, i) => { if (tr[i]) tr[i].textContent = t(x.key); });
    ['quality.low','quality.med','quality.high'].forEach((k, i) => { if (q[i]) q[i].textContent = t(k); });
    [$('set-haptics'), $('set-invert')].forEach(host => {
      if (host.children[0]) host.children[0].textContent = t('common.on');
      if (host.children[1]) host.children[1].textContent = t('common.off');
    });
    $('set-music').value = Math.round(state.music * 100);
    $('set-sfx').value = Math.round(state.sfx * 100);
    $('set-sens').value = Math.round(state.sens * 100);
  }

  /* ---------- HUD ---------- */
  hud(d){
    $('h-level').textContent = d.level;
    $('h-score').textContent = d.score;
    $('prog').firstElementChild.style.width = Math.round(d.progress * 100) + '%';
    const fb = $('firebar');
    fb.classList.toggle('on', !!d.fire);
    if (d.fire) fb.querySelector('.tr').firstElementChild.style.width =
      Math.max(0, Math.min(100, d.fireFrac * 100)) + '%';
  }

  combo(n, bonus){
    const el = $('combo');
    el.textContent = t('hud.combo') + ' ×' + n + '  +' + bonus;
    el.style.transition = 'none';
    el.style.opacity = '1';
    el.style.transform = 'translate(-50%,-50%) scale(1.25)';
    requestAnimationFrame(() => {
      el.style.transition = 'opacity .7s ease, transform .7s cubic-bezier(.2,.9,.2,1)';
      el.style.opacity = '0';
      el.style.transform = 'translate(-50%,-50%) scale(1)';
    });
  }

  showOver(d){
    $('o-score').textContent = d.score;
    $('o-record').textContent = d.newBest ? t('over.newbest') : '';
    $('o-best').textContent = t('over.best', { v:d.best });
    this.show('over');
  }

  showWin(d){
    $('w-title').textContent = t('win.title', { v:d.level });
    $('w-score').textContent = d.score;
    $('w-rings').textContent = d.rings + ' / ' + d.ringsTotal;
    $('w-coins').textContent = d.coins;
    $('w-bonus').textContent = '+' + d.bonus;
    this.show('win');
  }

  /* ---------- cableado ---------- */
  wire(){
    const ui = $('ui');
    // sonido de interfaz por delegacion: cubre tambien los botones creados despues
    ui.addEventListener('pointerdown', e => {
      if (e.target.closest('button')) audio.play('click');
    });
    ui.addEventListener('pointerover', e => {
      const b = e.target.closest('button');
      if (b && b !== this.lastHover){ this.lastHover = b; audio.play('hover'); }
    });

    const on = (id, fn) => { const el = $(id); if (el) el.addEventListener('click', fn); };
    on('b-play',     () => this.h.onPlay && this.h.onPlay());
    on('b-skins',    () => this.show('skins'));
    on('b-missions', () => this.show('missions'));
    on('b-settings', () => this.show('settings'));
    on('b-credits',  () => this.show('credits'));
    document.querySelectorAll('[data-back]').forEach(b => b.addEventListener('click', () => this.show('menu')));

    on('pausebtn',  () => this.h.onPause && this.h.onPause());
    on('b-resume',  () => this.h.onResume && this.h.onResume());
    on('b-restart', () => this.h.onRestart && this.h.onRestart());
    on('b-tomenu',  () => this.h.onMenu && this.h.onMenu());
    on('b-retry',   () => this.h.onRestart && this.h.onRestart());
    on('b-omenu',   () => this.h.onMenu && this.h.onMenu());
    on('b-next',    () => this.h.onNext && this.h.onNext());
    on('b-wmenu',   () => this.h.onMenu && this.h.onMenu());
  }
}
