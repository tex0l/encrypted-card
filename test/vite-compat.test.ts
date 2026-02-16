import { describe, it, after } from 'node:test'
import assert from 'node:assert/strict'
import { createServer, type ViteDevServer } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { readFile } from 'node:fs/promises'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

/**
 * This test starts a Vite dev server (with dependency pre-bundling disabled) and
 * transforms the component source files exactly as they would be served to the
 * browser. It then checks that every import resolves to a valid ESM module.
 *
 * Why: the package exports source files (./src/components/*) which Vite serves
 * directly. When pre-bundling doesn't cover a transitive dependency (common with
 * linked packages or monorepos), CJS modules get served raw to the browser,
 * causing "doesn't provide an export named" errors at runtime.
 *
 * What this catches:
 * - CJS dependencies imported with `import x from 'pkg'` or `import { x } from 'pkg'`
 * - UMD/IIFE modules that use `module.exports` instead of ESM `export`
 */
describe('Vite ESM compatibility', () => {
  let server: ViteDevServer

  after(async () => {
    if (server) await server.close()
  })

  it('all component dependencies are ESM-compatible', async () => {
    server = await createServer({
      root,
      plugins: [vue()],
      server: { middlewareMode: true },
      optimizeDeps: {
        // Disable pre-bundling to simulate how transitive deps are served
        // when this package is consumed as a linked/source-exported dependency
        noDiscovery: true,
        include: [],
      },
      logLevel: 'silent',
    })

    const componentFiles = [
      '/src/components/encryption.ts',
      '/src/components/EncryptedBusinessCard.client.vue',
      '/src/components/EncryptedImage.client.vue',
      '/src/components/utils.ts',
    ]

    const cjsImports: string[] = []

    for (const file of componentFiles) {
      const result = await server.transformRequest(file)
      assert.ok(result, `Vite failed to transform ${file}`)

      // Extract imports pointing to /node_modules/ (not framework internals)
      const importRegex = /from\s+["'](\/?node_modules\/[^"']+)["']/g
      let match
      while ((match = importRegex.exec(result.code)) !== null) {
        const importPath = match[1]

        // Skip known ESM packages (Vue, Vite internals)
        if (importPath.includes('/vue/') || importPath.includes('/@vite/')) continue
        // Skip peer dependencies — the consumer provides these
        if (importPath.includes('/@iconify/')) continue

        // Resolve to an absolute file path and check if it's ESM
        const absPath = path.resolve(root, importPath.replace(/^\//, ''))
        try {
          const content = await readFile(absPath, 'utf-8')
          const trimmed = content.trimStart()

          // Heuristic: ESM files start with import/export or have no module.exports
          const hasCjsSignals =
            trimmed.includes('module.exports') ||
            (trimmed.startsWith('!function(') || trimmed.startsWith('(function(')) ||
            /^\s*"use strict";\s*\(function/.test(trimmed)
          const hasEsmSignals =
            /^\s*(import |export )/.test(trimmed)

          if (hasCjsSignals && !hasEsmSignals) {
            cjsImports.push(`${file} imports CJS module: ${importPath}`)
          }
        } catch {
          // File doesn't exist or can't be read — skip
        }
      }
    }

    if (cjsImports.length > 0) {
      assert.fail(
        `Found ${cjsImports.length} CJS dependency import(s) that will fail in the browser:\n` +
        cjsImports.map(s => `  - ${s}`).join('\n') +
        '\n\nFix: replace these CJS packages with ESM-compatible alternatives, ' +
        'or vendor them as ESM modules.'
      )
    }
  })
})
