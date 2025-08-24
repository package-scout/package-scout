/**
 * Browser polyfills for Node.js functionality
 */

// Path polyfill
export const path = {
  join: (...paths: string[]) => {
    return paths
      .join('/')
      .replace(/\/+/g, '/')
      .replace(/\/$/, '') || '/'
  },
  dirname: (path: string) => {
    const parts = path.split('/')
    return parts.slice(0, -1).join('/') || '/'
  },
  basename: (path: string, ext?: string) => {
    const base = path.split('/').pop() || ''
    if (ext && base.endsWith(ext)) {
      return base.slice(0, -ext.length)
    }
    return base
  },
  extname: (path: string) => {
    const base = path.split('/').pop() || ''
    const lastDot = base.lastIndexOf('.')
    return lastDot > 0 ? base.slice(lastDot) : ''
  },
  resolve: (...paths: string[]) => {
    return path.join('/', ...paths)
  },
  sep: '/',
}

// Process polyfill
export const process = {
  env: Object.assign({}, (globalThis as any).process?.env || {}, {
    NODE_ENV: 'production',
    BROWSER: 'true',
  }),
  cwd: () => '/',
  platform: 'browser' as const,
  version: 'v18.0.0',
  versions: {
    node: '18.0.0',
  },
  exit: (code?: number) => {
    console.warn('process.exit() called in browser context with code:', code)
  },
}

// Buffer polyfill (basic implementation)
export class Buffer {
  private data: Uint8Array

  constructor(data: string | Uint8Array | number[]) {
    if (typeof data === 'string') {
      this.data = new TextEncoder().encode(data)
    } else if (data instanceof Uint8Array) {
      this.data = data
    } else {
      this.data = new Uint8Array(data)
    }
  }

  static from(data: string | Uint8Array | number[], encoding?: string): Buffer {
    if (typeof data === 'string') {
      if (encoding === 'base64') {
        const binaryString = atob(data)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        return new Buffer(bytes)
      }
      return new Buffer(data)
    }
    return new Buffer(data)
  }

  toString(encoding?: string): string {
    if (encoding === 'base64') {
      const binaryString = String.fromCharCode(...this.data)
      return btoa(binaryString)
    }
    return new TextDecoder().decode(this.data)
  }

  get length(): number {
    return this.data.length
  }
}

// Global polyfills
if (typeof (globalThis as any).Buffer === 'undefined') {
  (globalThis as any).Buffer = Buffer
}

if (typeof (globalThis as any).process === 'undefined') {
  (globalThis as any).process = process
}

if (typeof (globalThis as any).global === 'undefined') {
  (globalThis as any).global = globalThis
}

// Crypto polyfill for Node.js crypto module functionality
export const crypto = {
  randomBytes: (size: number): Uint8Array => {
    return globalThis.crypto.getRandomValues(new Uint8Array(size))
  },
  createHash: (algorithm: string) => {
    if (algorithm !== 'sha256') {
      throw new Error(`Unsupported hash algorithm: ${algorithm}`)
    }
    return {
      update: (data: string | Uint8Array) => {
        // This is a simplified implementation
        // In a real scenario, you'd use the Web Crypto API
        return {
          digest: (encoding?: string) => {
            if (encoding === 'hex') {
              // Simplified hash for demo purposes
              let hash = 0
              const str = typeof data === 'string' ? data : new TextDecoder().decode(data)
              for (let i = 0; i < str.length; i++) {
                hash = ((hash << 5) - hash + str.charCodeAt(i)) & 0xffffffff
              }
              return Math.abs(hash).toString(16).padStart(8, '0')
            }
            return new Uint8Array(32) // Placeholder
          }
        }
      }
    }
  }
}

export { path as default }
