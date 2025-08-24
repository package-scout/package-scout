import type {
  PackageStats,
  BrowserPackageAnalyzerOptions,
  PackageExportSizes
} from '../types'
import { WebContainerManager } from './WebContainerManager'
import { CDNPackageManager } from '../packages/CDNPackageManager'
import { WasmBundler } from '../bundlers/WasmBundler'

/**
 * Main class for analyzing npm packages in the browser
 * Orchestrates the CDN package manager, WASM bundler, and WebContainer
 */
export class BrowserPackageAnalyzer {
  private webContainer: WebContainerManager
  private cdnManager: CDNPackageManager
  private bundler: WasmBundler

  constructor(private options: BrowserPackageAnalyzerOptions = {}) {
    this.webContainer = new WebContainerManager()
    this.cdnManager = new CDNPackageManager(options.cdn || 'unpkg')
    this.bundler = new WasmBundler()
  }

  async analyzePackage(packageName: string, version?: string): Promise<PackageStats> {
    try {
      // Initialize bundler
      await this.bundler.initialize()

      // Determine analysis method based on environment and options
      const useWebContainer = this.options.useWebContainer && this.webContainer.isSupported()

      if (useWebContainer) {
        return await this.analyzeWithWebContainer(packageName, version)
      } else {
        return await this.analyzeWithCDN(packageName, version)
      }
    } catch (error) {
      throw new Error(`Failed to analyze package ${packageName}: ${error}`)
    }
  }

  private async analyzeWithWebContainer(packageName: string, version?: string): Promise<PackageStats> {
    await this.webContainer.initialize()

    // Create temporary package.json
    await this.webContainer.createPackageJson({
      [packageName]: version || 'latest'
    })

    // Install the package
    await this.webContainer.installPackage(packageName, version)

    // Read package.json to get metadata
    const packageJsonPath = `node_modules/${packageName}/package.json`
    const packageJsonContent = await this.webContainer.readFile(packageJsonPath)
    const packageJson = JSON.parse(packageJsonContent)

    // Find entry point
    const entryPoint = this.resolveEntryPoint(packageJson)

    // Create a simple entry file that imports the package
    const entryCode = this.options.customImports
      ? this.options.customImports.map(imp => `import '${packageName}/${imp}';`).join('\n')
      : `import '${packageName}';`

    await this.webContainer.writeFile('entry.js', entryCode)

    // For WebContainer, we can use a simplified webpack build
    // This is a placeholder - in practice you'd run webpack via WebContainer
    const mockStats: PackageStats = {
      name: packageJson.name,
      size: 50000, // Placeholder
      gzipSize: 15000, // Placeholder
      dependencyCount: Object.keys(packageJson.dependencies || {}).length,
      hasJSNext: !!packageJson['jsnext:main'],
      hasJSModule: !!packageJson.module,
      isModuleType: packageJson.type === 'module',
      hasSideEffects: packageJson.sideEffects !== false,
      peerDependencies: Object.keys(packageJson.peerDependencies || {}),
      dependencySizes: [],
      assets: [
        {
          name: 'main',
          size: 50000,
          gzipSize: 15000,
          type: 'js',
        },
      ],
    }

    await this.webContainer.teardown()
    return mockStats
  }

  private async analyzeWithCDN(packageName: string, version?: string): Promise<PackageStats> {
    // Get package info from CDN
    const packageInfo = await this.cdnManager.getPackageInfo(packageName, version)

    // Download package files
    const packageFiles = await this.cdnManager.downloadPackage(packageName, version)

    // Find entry point
    const entryPoint = await this.cdnManager.resolveMainFile(packageInfo) || 'index.js'

    // Add entry point to files if not present
    if (!packageFiles.has(entryPoint)) {
      const entryContent = this.options.customImports
        ? this.options.customImports.map(imp => `export * from './${imp}';`).join('\n')
        : `export * from './index.js';`
      packageFiles.set('entry.js', entryContent)
    }

    // Bundle with WASM bundler
    const bundleResult = await this.bundler.bundle(entryPoint, packageFiles)

    // Minify if requested
    const minified = await this.bundler.minifyCode(
      bundleResult.code,
      this.options.minifier || 'esbuild'
    )

    // Calculate parse time (simplified for browser)
    const parseTime = this.options.debug ? await this.calculateParseTime(minified.code) : undefined

    return {
      name: packageInfo.name,
      size: minified.size,
      gzipSize: minified.gzipSize,
      parseTime,
      dependencyCount: Object.keys(packageInfo.dependencies || {}).length,
      hasJSNext: false, // Not available from CDN metadata
      hasJSModule: !!packageInfo.module,
      isModuleType: packageInfo.type === 'module',
      hasSideEffects: packageInfo.sideEffects !== false,
      peerDependencies: Object.keys(packageInfo.peerDependencies || {}),
      dependencySizes: [], // Would need more complex analysis
      assets: [
        {
          name: 'main',
          size: minified.size,
          gzipSize: minified.gzipSize,
          type: 'js',
        },
      ],
    }
  }

  async getPackageExportSizes(packageName: string, version?: string): Promise<PackageExportSizes> {
    const packageInfo = await this.cdnManager.getPackageInfo(packageName, version)
    const packageFiles = await this.cdnManager.downloadPackage(packageName, version)

    // Find all potential export files
    const exportFiles = packageInfo.files.filter(file =>
      file.type === 'file' &&
      (file.path.endsWith('.js') || file.path.endsWith('.mjs') || file.path.endsWith('.ts'))
    )

    const exportSizes = await Promise.all(
      exportFiles.map(async (file) => {
        try {
          const content = packageFiles.get(file.path)
          if (!content) return null

          // Bundle individual export
          const tempFiles = new Map(packageFiles)
          const bundleResult = await this.bundler.bundle(file.path, tempFiles)
          const minified = await this.bundler.minifyCode(bundleResult.code)

          return {
            path: file.path,
            size: minified.size,
            gzipSize: minified.gzipSize,
            exportName: file.path,
          }
        } catch (error) {
          if (this.options.debug) {
            console.warn(`Failed to analyze export ${file.path}:`, error)
          }
          return null
        }
      })
    )

    return {
      name: packageInfo.name,
      version: packageInfo.version,
      assets: exportSizes.filter(Boolean) as any[],
    }
  }

  private resolveEntryPoint(packageJson: any): string {
    return packageJson.module || packageJson.main || 'index.js'
  }

  private async calculateParseTime(code: string): Promise<number> {
    const start = performance.now()

    try {
      // Create a simple eval in a separate context to measure parse time
      const blob = new Blob([code], { type: 'application/javascript' })
      const url = URL.createObjectURL(blob)

      // Use dynamic import to parse the code
      await import(url)
      URL.revokeObjectURL(url)
    } catch (error) {
      // Parsing failed, but we still measure the time
    }

    return performance.now() - start
  }

  async dispose(): Promise<void> {
    await this.bundler.dispose()
    await this.webContainer.teardown()
  }
}
