/**
 * Browser-compatible version of package-build-stats
 * 
 * This version replaces Node.js-specific functionality with browser-compatible alternatives:
 * - File system operations → IndexedDB/MemFS
 * - Child process execution → WebContainer/Service Workers  
 * - Webpack compilation → ESBuild WASM/Rollup Browser
 * - NPM package installation → CDN-based package fetching
 */

export { BrowserPackageAnalyzer } from './core/BrowserPackageAnalyzer'
export { WebContainerManager } from './core/WebContainerManager'
export { WasmBundler } from './bundlers/WasmBundler'
export { CDNPackageManager } from './packages/CDNPackageManager'
export * from './types'
export * from './utils/browser-polyfills'
