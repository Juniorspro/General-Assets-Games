import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { audio, bgm, ensureAudioReady } from './audio';

// ══════════════════════════════════════════════
// Type definitions
// ══════════════════════════════════════════════

export interface EditableNumberField {
  type: 'number';
  label: string;
  default: number;
  min?: number;
  max?: number;
  step?: number;
}

export interface EditableColorField {
  type: 'color';
  label: string;
  default: string;
  /** Synced to a CSS variable such as '--bg-color' */
  cssVar?: string;
}

export interface EditableTextField {
  type: 'text';
  label: string;
  default: string;
}

export interface EditableArrayField {
  type: 'array';
  label: string;
  default: Record<string, unknown>[];
  schema: Record<string, { type: string; required?: boolean }>;
}

export type EditableField =
  | EditableNumberField
  | EditableColorField
  | EditableTextField
  | EditableArrayField;

export type EditableSchema = Record<string, EditableField>;

// ══════════════════════════════════════════════
// Media state
// ══════════════════════════════════════════════

export interface MediaEntry {
  value: string;
  state: 'active' | 'removed';
  type?: 'image' | 'audio' | 'video';
  label?: string;
}

// ══════════════════════════════════════════════
// Global Store (module singleton)
// ══════════════════════════════════════════════

const store = {
  values: {} as Record<string, unknown>,
  schema: null as EditableSchema | null,
  listeners: new Set<() => void>(),
  snapshot: {} as Record<string, unknown>,

  notify: () => {
    store.snapshot = { ...store.values };
    for (const fn of store.listeners) fn();
  },

  subscribe: (fn: () => void) => {
    store.listeners.add(fn);
    return () => { store.listeners.delete(fn); };
  },

  getSnapshot: () => {
    return store.snapshot;
  },
};

// ══════════════════════════════════════════════
// Media state Store
// ══════════════════════════════════════════════

const mediaState: Record<string, MediaEntry> = {};
const muteConfig = { global: false };

type ExternalConfigState = 'pending' | 'success' | 'failed';
let externalConfigState: ExternalConfigState = 'pending';
let externalConfigPromise: Promise<void> | null = null;
const externalConfigListeners = new Set<() => void>();

function notifyExternalConfigListeners(): void {
  for (const fn of externalConfigListeners) fn();
}

function setExternalConfigState(state: ExternalConfigState): void {
  if (externalConfigState === state) return;
  externalConfigState = state;
  notifyExternalConfigListeners();
}

function subscribeExternalConfig(fn: () => void): () => void {
  externalConfigListeners.add(fn);
  return () => { externalConfigListeners.delete(fn); };
}

function getExternalConfigSnapshot(): ExternalConfigState {
  return externalConfigState;
}

type InlineMediaEntry = { type?: string; label?: string; value?: string };
type InlineConfigData = {
  config?: Record<string, unknown>;
  media?: Record<string, InlineMediaEntry>;
};

function readInlineConfig(): InlineConfigData | null {
  if (typeof document === 'undefined') return null;
  const el = document.querySelector<HTMLScriptElement>('script[type="application/x-game-config"]');
  if (!el?.textContent) return null;

  try {
    const json = JSON.parse(el.textContent) as Record<string, unknown>;
    const config = (json.config ?? json) as Record<string, unknown>;
    const media = json.media as Record<string, InlineMediaEntry> | undefined;
    return { config, media };
  } catch {
    return null;
  }
}

function applyConfigEntries(config: Record<string, unknown> | undefined): void {
  if (!config) return;

  for (const [key, entry] of Object.entries(config)) {
    if (!(key in store.values)) {
      console.warn(`[editable] unknown config key in JSON: ${key}`);
      continue;
    }

    const val = (entry as any)?.value ?? entry;
    store.values[key] = val;

    const field = store.schema?.[key];
    if (field?.type === 'color' && field.cssVar) {
      document.documentElement.style.setProperty(field.cssVar, String(val));
    }
  }
}

function applyMediaEntries(
  media: Record<string, InlineMediaEntry> | undefined,
  dispatchChange: boolean,
): void {
  if (!media) return;

  for (const [id, entry] of Object.entries(media)) {
    const url = entry?.value;
    if (!url) continue;
    const mediaType = entry?.type as MediaEntry['type'];
    mediaState[id] = {
      value: url,
      state: 'active',
      ...(mediaType && { type: mediaType }),
      ...(entry?.label && { label: entry.label }),
    };
    if (dispatchChange) {
      window.dispatchEvent(new CustomEvent('mediachange', { detail: { id, src: url } }));
    }
  }
}

function buildConfigPayload(): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  const schema = store.schema;
  if (!schema) return payload;

  for (const [key, field] of Object.entries(schema)) {
    payload[key] = {
      type: field.type,
      label: field.label,
      value: store.values[key],
      ...(field.type === 'number' && {
        min: field.min,
        max: field.max,
        step: field.step,
      }),
      ...(field.type === 'color' && { cssVar: field.cssVar }),
      ...(field.type === 'array' && { schema: field.schema }),
    };
  }

  return payload;
}

function safeJSONStringify(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function writeInlineConfigScript(script: HTMLScriptElement): void {
  script.textContent = safeJSONStringify({ config: buildConfigPayload(), media: mediaState });
}

function refreshInlineConfigScript(): void {
  if (typeof document === 'undefined') return;
  const script = document.querySelector<HTMLScriptElement>('script[type="application/x-game-config"]');
  if (!script) return;
  writeInlineConfigScript(script);
}

// ══════════════════════════════════════════════
// Config global API
// ══════════════════════════════════════════════

function registerConfigAPI() {
  // External editor call: live-update a single config value
  (window as any).updateGameConfig = (key: string, value: unknown) => {
    if (!store.schema || !(key in store.schema)) {
      console.warn(`[editable] unknown config key: ${key}`);
      return;
    }
    store.values[key] = value;

    // Sync CSS variables
    const field = store.schema[key];
    if (field.type === 'color' && field.cssVar) {
      document.documentElement.style.setProperty(field.cssVar, value as string);
    }

    store.notify();
    refreshInlineConfigScript();
  };

  // Read-only snapshot
  Object.defineProperty(window, 'gameConfig', {
    get: () => ({ ...store.values }),
    configurable: true,
  });
}

// ══════════════════════════════════════════════
// Media global API
// ══════════════════════════════════════════════

function registerMediaAPI() {
  (window as any).mediaState = mediaState;

  (window as any).setMute = (scope: string, value: boolean) => {
    if (scope === 'global') {
      muteConfig.global = value;
      if (value) {
        audio.mute();
      } else {
        audio.unmute();
      }
      // Sync HTML media elements
      document.querySelectorAll<HTMLMediaElement>('audio, video').forEach(el => {
        el.muted = value;
      });
    }
  };

  (window as any).muteConfig = muteConfig;

  (window as any).isMuted = (_id: string): boolean => muteConfig.global;

  (window as any).setMediaVolume = (id: string, v: number) => {
    if (id === 'bgm') {
      bgm.setVolume(v);
      return;
    }
    const el = document.getElementById(id) as HTMLMediaElement | null;
    if (el && 'volume' in el) el.volume = v;
  };

  (window as any).removeMedia = (id: string) => {
    const entry = mediaState[id];
    if (!entry) return;
    entry.state = 'removed';

    if (id === 'bgm') {
      bgm.stop();
    } else {
      const el = document.getElementById(id);
      if (el) {
        if ('pause' in el) {
          (el as HTMLMediaElement).pause();
          el.removeAttribute('src');
          (el as HTMLMediaElement).load();
        } else if ('src' in el) {
          (el as HTMLImageElement).src = '';
        }
      }
    }
    refreshInlineConfigScript();
    window.dispatchEvent(new CustomEvent('mediachange', { detail: { id, src: '', action: 'remove' } }));
  };

  (window as any).restoreMedia = (id: string) => {
    const entry = mediaState[id];
    if (!entry) return;
    entry.state = 'active';

    if (id === 'bgm') {
      void bgm.play(entry.value);
    } else {
      const el = document.getElementById(id) as HTMLMediaElement | null;
      if (el && 'src' in el) el.src = entry.value;
    }
    refreshInlineConfigScript();
    window.dispatchEvent(new CustomEvent('mediachange', { detail: { id, src: entry.value, action: 'restore' } }));
  };

  // Called when the external editor replaces a media src
  (window as any).updateMediaSrc = (id: string, src: string) => {
    const entry = mediaState[id];
    if (entry) {
      entry.value = src;
      entry.state = 'active';
    } else {
      mediaState[id] = { value: src, state: 'active' };
    }

    if (id === 'bgm') {
      bgm.stop();
      if (src) void bgm.play(src, { loop: true });
    } else {
      const el = document.getElementById(id) as HTMLMediaElement | null;
      if (el && 'src' in el) {
        el.src = src;
        if (el instanceof HTMLVideoElement) el.load();
      }
    }
    refreshInlineConfigScript();
    window.dispatchEvent(new CustomEvent('mediachange', { detail: { id, src, action: 'update' } }));
  };
}

// ══════════════════════════════════════════════
// DOM injection — <script type="application/x-game-config">
// ══════════════════════════════════════════════

function injectConfigScript(): (() => void) {
  let createdHere = false;
  let script = document.querySelector<HTMLScriptElement>('script[type="application/x-game-config"]');

  if (!script) {
    script = document.createElement('script');
    script.type = 'application/x-game-config';
    document.head.appendChild(script);
    createdHere = true;
  }

  writeInlineConfigScript(script);

  return () => {
    if (createdHere && script.parentNode) script.remove();
  };
}

// ══════════════════════════════════════════════
// Media element scan
// ══════════════════════════════════════════════

function scanMediaElements() {
  document.querySelectorAll<HTMLElement>('[data-editable]').forEach(el => {
    const id = el.id;
    if (!id) return;
    const type = el.getAttribute('data-editable') as 'image' | 'audio' | 'video' | null;
    const label = el.getAttribute('data-label') ?? id;
    const src = el.getAttribute('src') ?? (el as HTMLMediaElement).src ?? '';
    const existing = mediaState[id];

    if (existing) {
      if (!existing.value && src) existing.value = src;
      if (!existing.type && type) existing.type = type;
      if (!existing.label && label) existing.label = label;
      return;
    }

    mediaState[id] = {
      value: src,
      state: 'active',
      ...(type && { type }),
      ...(label && { label }),
    };
  });
}

// ══════════════════════════════════════════════
// Auto-complete media elements — audio/video registered in JSON but lacking a DOM counterpart
// ══════════════════════════════════════════════

/** Auto-created hidden element; cleaned up on unmount */
const _createdMediaEls = new Set<HTMLElement>();

function ensureMediaElements() {
  for (const [id, entry] of Object.entries(mediaState)) {
    if (id === 'bgm') continue; // BGM is controlled by Tone.js — no DOM element needed
    const mType = entry.type;
    if (!mType || mType === 'image') continue; // Images are created as <img> by the coder
    if (document.getElementById(id)) continue; // DOM element already exists

    const tag = mType === 'video' ? 'video' : 'audio';
    const el = document.createElement(tag);
    el.id = id;
    el.src = entry.value;
    el.setAttribute('data-editable', mType);
    if (entry.label) el.setAttribute('data-label', entry.label);
    el.preload = 'metadata';
    el.style.display = 'none';
    document.body.appendChild(el);
    _createdMediaEls.add(el);
  }
}

// ══════════════════════════════════════════════
// External JSON loading
// ══════════════════════════════════════════════

async function fetchAndApplyExternalConfig(): Promise<boolean> {
  try {
    const res = await fetch('./game.config.json', { cache: 'no-store' });
    if (!res.ok) return false;
    const json = await res.json();
    const config = json.config ?? json;

    applyConfigEntries(config);
    store.notify();

    // ── media section loading + BGM auto-play ──
    const media = json.media as Record<string, InlineMediaEntry> | undefined;
    if (media) {
      applyMediaEntries(media, true);
      const bgmUrl = media.bgm?.value;
      if (bgmUrl) {
        ensureAudioReady();
        void bgm.play(bgmUrl, { loop: true });
      }
    }

    refreshInlineConfigScript();
    return true;
  } catch {
    // 静默降级：加载尝试结束后再回退到 EDITABLE 默认值。
    return false;
  }
}

function startExternalConfigLoad(): Promise<void> {
  if (externalConfigPromise) return externalConfigPromise;

  if (typeof window === 'undefined' || typeof fetch === 'undefined') {
    externalConfigPromise = Promise.resolve();
    setExternalConfigState('failed');
    return externalConfigPromise;
  }

  externalConfigPromise = (async () => {
    const loaded = await fetchAndApplyExternalConfig();
    setExternalConfigState(loaded ? 'success' : 'failed');
  })();

  return externalConfigPromise;
}

// ══════════════════════════════════════════════
// useGameConfig — the single-entry Hook
// ══════════════════════════════════════════════

type ConfigValues<T extends EditableSchema> = { [K in keyof T]: T[K]['default'] };

export function useGameConfig<T extends EditableSchema>(
  schema: T,
): {
  config: ConfigValues<T>;
  configRef: React.MutableRefObject<ConfigValues<T>>;
} {
  // Initialize the store (synchronous; first call takes effect immediately)
  if (!store.schema) {
    store.schema = schema;
    const defaults: Record<string, unknown> = {};
    for (const [key, field] of Object.entries(schema)) {
      defaults[key] = field.default;
    }
    store.values = defaults;

    const inlineConfig = readInlineConfig();
    applyConfigEntries(inlineConfig?.config);
    applyMediaEntries(inlineConfig?.media, false);

    store.snapshot = { ...store.values };
    void startExternalConfigLoad();
  }

  const configRef = useRef(store.values as ConfigValues<T>);

  // Mount side effects: JSON load + DOM injection + global API registration + media scan
  useEffect(() => {
    registerConfigAPI();
    registerMediaAPI();

    let removeScript: (() => void) | undefined;
    let cancelled = false;

    // Await JSON load first, then scan media + fill missing elements + inject script so the snapshot reflects final values
    (async () => {
      await startExternalConfigLoad();
      if (cancelled) return;
      scanMediaElements();
      ensureMediaElements();
      removeScript = injectConfigScript();
    })();

    return () => {
      cancelled = true;
      removeScript?.();
      // Clean up auto-created hidden media elements
      for (const el of _createdMediaEls) el.remove();
      _createdMediaEls.clear();
      delete (window as any).updateGameConfig;
      delete (window as any).gameConfig;
      delete (window as any).mediaState;
      delete (window as any).setMute;
      delete (window as any).muteConfig;
      delete (window as any).isMuted;
      delete (window as any).setMediaVolume;
      delete (window as any).removeMedia;
      delete (window as any).restoreMedia;
      delete (window as any).updateMediaSrc;
    };
  }, []);

  // Sync configRef
  useEffect(() => {
    const unsub = store.subscribe(() => {
      configRef.current = store.values as ConfigValues<T>;
    });
    return unsub;
  }, []);

  // useSyncExternalStore — external store → React state
  const config = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
  ) as ConfigValues<T>;

  return { config, configRef };
}

// ══════════════════════════════════════════════
// useEditableMedia — reactive media-URL hook
// ══════════════════════════════════════════════

function resolveEditableMediaSrc(id: string, defaultSrc: string): string {
  const entry = mediaState[id];

  // 编辑器显式移除：始终不渲染
  if (entry?.state === 'removed') return '';
  // 存在「有效值」的覆盖：覆盖优先于打包默认图
  if (entry && entry.value) return entry.value;
  // 其余情况（无覆盖 / 空值覆盖 / 配置仍在加载或抓取失败）一律回退打包默认图，
  // 避免 media 为空（未被编辑器改过图）时把 defaultSrc 丢成 src=""。
  return defaultSrc;
}

export function useEditableMedia(id: string, defaultSrc: string): string {
  // 订阅外部配置加载状态：仅用于配置抓取完成后触发重渲染，拾取异步落地的媒体覆盖
  useSyncExternalStore(subscribeExternalConfig, getExternalConfigSnapshot);
  const [, refreshMediaSnapshot] = useState(0);
  const src = resolveEditableMediaSrc(id, defaultSrc);
  const prevSrcRef = useRef(src);

  useEffect(() => {
    void startExternalConfigLoad();
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.id === id) refreshMediaSnapshot(version => version + 1);
    };
    window.addEventListener('mediachange', handler);
    return () => window.removeEventListener('mediachange', handler);
  }, [id]);

  // When src changes, ensure video/audio elements reload + autoplay
  useEffect(() => {
    if (src === prevSrcRef.current) return;
    prevSrcRef.current = src;

    const el = document.getElementById(id) as HTMLMediaElement | null;
    if (!el || !('load' in el)) return;

    if (src) {
      // Only set src + load if the DOM isn't already up-to-date
      // (updateMediaSrc may have already done this via direct DOM)
      if (el.getAttribute('src') !== src) {
        el.src = src;
      }
      el.load();
      if (el instanceof HTMLVideoElement || el instanceof HTMLAudioElement) {
        void el.play().catch(() => {});
      }
    } else {
      // Removed: pause and clear
      el.pause();
      el.removeAttribute('src');
      el.load();
    }
  }, [src, id]);

  return src;
}
