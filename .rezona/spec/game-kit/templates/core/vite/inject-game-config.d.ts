import type { Plugin } from 'vite'

export interface InjectGameConfigPluginOptions {
  filename?: string
}

export declare function injectGameConfigPlugin(
  options?: InjectGameConfigPluginOptions,
): Plugin

export default injectGameConfigPlugin
