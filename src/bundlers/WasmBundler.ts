import * as esbuild from 'esbuild-wasm'
import { minify } from 'terser'

/**
 * WASM-based bundler using ESBuild WASM for browser-compatible bundling
 * Replaces Webpack with ESBuild WASM for fast, browser-native bundling
 */
export class WasmBundler {
  private isInitialized = false

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      await esbuild.initialize({
        wasmURL: new URL('esbuild-wasm/esbuild.wasm', import.meta.url)
      })
      this.isInitialized = true
    } catch (error) {
      console.error('Failed to initialize ESBuild WASM:', error)
      throw new Error('ESBuild WASM initialization failed')
    }
  }

  async bundle(entryPoint: string, files: Map<string, string>): Promise<{
    code: string
    size: number
    gzipSize: number
    assets: Array<{ name: string; size: number; type: string }>
  }> {
    if (!this.isInitialized) {
      await this.initialize()
    }

    try {
      // Create virtual file system for ESBuild
      const result = await esbuild.build({
        entryPoints: [entryPoint],
        bundle: true,
        write: false,
        format: 'esm',
        target: ['es2020'],
        platform: 'browser',
        minify: false, // We'll handle minification separately
        plugins: [
          {
            name: 'virtual-fs',
            setup(build) {
              // Resolve virtual files
              build.onResolve({ filter: /.*/ }, (args) => {
                if (files.has(args.path)) {
                  return { path: args.path, namespace: 'virtual' }
                }
                
                // Try to resolve relative imports
                // @ts-ignore
                const resolved = this.resolveImport(args.path, args.importer, files)
                if (resolved && files.has(resolved)) {
                  return { path: resolved, namespace: 'virtual' }
                }

                return null
              })

              // Load virtual files
              build.onLoad({ filter: /.*/, namespace: 'virtual' }, (args) => {
                const contents = files.get(args.path)
                if (contents) {
                  // @ts-ignore
                  return { contents, loader: this.getLoader(args.path) }
                }
                return null
              })
            },
          },
        ],
      })

      if (result.errors.length > 0) {
        throw new Error(`Build errors: ${result.errors.map(e => e.text).join(', ')}`)
      }

      const code = result.outputFiles[0].text
      const size = new TextEncoder().encode(code).length
      const gzipSize = await this.calculateGzipSize(code)

      return {
        code,
        size,
        gzipSize,
        assets: [
          {
            name: 'main',
            size,
            type: 'js',
          },
        ],
      }
    } catch (error) {
      throw new Error(`Bundling failed: ${error}`)
    }
  }

  async minifyCode(code: string, minifier: 'terser' | 'esbuild' = 'esbuild'): Promise<{
    code: string
    size: number
    gzipSize: number
  }> {
    let minifiedCode: string

    if (minifier === 'esbuild') {
      const result = await esbuild.transform(code, {
        minify: true,
        target: 'es2020',
      })
      minifiedCode = result.code
    } else {
      const result = await minify(code, {
        compress: true,
        mangle: true,
        module: true,
      })
      minifiedCode = result.code || code
    }

    const size = new TextEncoder().encode(minifiedCode).length
    const gzipSize = await this.calculateGzipSize(minifiedCode)

    return {
      code: minifiedCode,
      size,
      gzipSize,
    }
  }

  private resolveImport(importPath: string, importer: string, files: Map<string, string>): string | null {
    // Handle relative imports
    if (importPath.startsWith('./') || importPath.startsWith('../')) {
      const importerDir = importer.split('/').slice(0, -1).join('/')
      const resolved = this.resolvePath(importerDir, importPath)
      
      // Try different extensions
      for (const ext of ['', '.js', '.mjs', '.ts', '/index.js', '/index.mjs', '/index.ts']) {
        const candidate = resolved + ext
        if (files.has(candidate)) {
          return candidate
        }
      }
    }

    // Handle absolute imports (node_modules style)
    if (!importPath.startsWith('.')) {
      // Look for the package in our virtual file system
      const packagePaths = [
        `node_modules/${importPath}`,
        `node_modules/${importPath}/index.js`,
        `node_modules/${importPath}/index.mjs`,
        `node_modules/${importPath}/dist/index.js`,
        `node_modules/${importPath}/lib/index.js`,
      ]

      for (const path of packagePaths) {
        if (files.has(path)) {
          return path
        }
      }
    }

    return null
  }

  private resolvePath(basePath: string, relativePath: string): string {
    const parts = basePath.split('/').filter(p => p !== '')
    const relativeParts = relativePath.split('/').filter(p => p !== '')

    for (const part of relativeParts) {
      if (part === '..') {
        parts.pop()
      } else if (part !== '.') {
        parts.push(part)
      }
    }

    return parts.join('/')
  }

  private getLoader(path: string): esbuild.Loader {
    const ext = path.split('.').pop()?.toLowerCase()
    
    switch (ext) {
      case 'ts':
        return 'ts'
      case 'tsx':
        return 'tsx'
      case 'jsx':
        return 'jsx'
      case 'json':
        return 'json'
      case 'css':
        return 'css'
      default:
        return 'js'
    }
  }

  private async calculateGzipSize(content: string): Promise<number> {
    // Use CompressionStream if available (modern browsers)
    if ('CompressionStream' in globalThis) {
      const stream = new CompressionStream('gzip')
      const writer = stream.writable.getWriter()
      const reader = stream.readable.getReader()

      const chunks: Uint8Array[] = []
      const readPromise = (async () => {
        let result
        while (!(result = await reader.read()).done) {
          chunks.push(result.value)
        }
      })()

      await writer.write(new TextEncoder().encode(content))
      await writer.close()
      await readPromise

      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0)
      return totalLength
    }

    // Fallback: estimate gzip size (roughly 70% of original for typical JS)
    // todo: implement a proper gzip size calculation
    return Math.round(new TextEncoder().encode(content).length * 0.7)
  }

  async dispose(): Promise<void> {
    // ESBuild WASM doesn't need explicit cleanup
    this.isInitialized = false
  }
}
