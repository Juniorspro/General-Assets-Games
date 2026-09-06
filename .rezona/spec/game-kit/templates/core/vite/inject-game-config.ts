import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import type { Plugin } from 'vite'

export interface InjectGameConfigPluginOptions {
  filename?: string
}

export function injectGameConfigPlugin(
  options: InjectGameConfigPluginOptions = {},
): Plugin {
  const filename = options.filename ?? 'game.config.json'
  let publicDir = ''

  return {
    name: 'rezona-inject-game-config',
    apply: 'build',
    configResolved(config) {
      publicDir = config.publicDir
    },
    transformIndexHtml(html) {
      const configPath = join(publicDir, filename)
      if (!existsSync(configPath)) return html

      try {
        const rawConfig = readFileSync(configPath, 'utf8')
        const payload = JSON.stringify(JSON.parse(rawConfig)).replace(/</g, '\\u003c')

        return {
          html,
          tags: [
            {
              tag: 'script',
              attrs: {
                id: 'game-config',
                type: 'application/x-game-config',
              },
              children: payload,
              injectTo: 'head',
            },
          ],
        }
      } catch {
        return html
      }
    },
  }
}

export default injectGameConfigPlugin
