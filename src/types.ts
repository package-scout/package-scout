export interface PackageStats {
  name: string
  size: number
  gzipSize: number
  parseTime?: number
  dependencyCount: number
  hasJSNext: boolean
  hasJSModule: boolean
  isModuleType: boolean
  hasSideEffects: boolean | string[]
  peerDependencies: string[]
  dependencySizes: DependencySize[]
  assets: Asset[]
}

export interface DependencySize {
  name: string
  approximateSize: number
}

export interface Asset {
  name: string
  size: number
  gzipSize: number
  type: 'js' | 'css' | 'other'
  path?: string
}

export interface BrowserPackageAnalyzerOptions {
  minifier?: 'terser' | 'esbuild'
  debug?: boolean
  customImports?: string[]
  esm?: boolean
  includeDependencySizes?: boolean
  cdn?: 'unpkg' | 'jsDelivr' | 'skypack' | 'esm.sh'
  useWebContainer?: boolean
}

export interface PackageExportSizes {
  name: string
  version: string
  assets: ExportAsset[]
}

export interface ExportAsset {
  path: string
  size: number
  gzipSize: number
  exportName?: string
}

export interface WebContainerFiles {
  [path: string]: {
    file: {
      contents: string
    }
  } | {
    directory: WebContainerFiles
  }
}

export interface CDNPackageInfo {
  name: string
  version: string
  files: CDNFile[]
  dependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  main?: string
  module?: string
  type?: 'module' | 'commonjs'
  sideEffects?: boolean | string[]
}

export interface CDNFile {
  path: string
  size: number
  content?: string
  type: 'file' | 'directory'
}
