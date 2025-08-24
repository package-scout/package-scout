import type { CDNPackageInfo, CDNFile } from '../types'

/**
 * Manages package fetching from CDNs instead of npm install
 * Supports multiple CDN providers for better reliability
 */
export class CDNPackageManager {
  private cdnProviders = {
    'unpkg': 'https://unpkg.com',
    'jsDelivr': 'https://cdn.jsdelivr.net/npm',
    'skypack': 'https://cdn.skypack.dev',
    'esm.sh': 'https://esm.sh',
  }

  constructor(private defaultCDN: keyof typeof this.cdnProviders = 'unpkg') {}

  async getPackageInfo(packageName: string, version = 'latest'): Promise<CDNPackageInfo> {
    const packageSpec = version === 'latest' ? packageName : `${packageName}@${version}`
    
    try {
      // Try to get package.json from the CDN
      const packageJsonUrl = this.buildUrl(packageSpec, 'package.json')
      const response = await fetch(packageJsonUrl)
      
      if (!response.ok) {
        throw new Error(`Package not found: ${packageSpec}`)
      }

      const packageJson = await response.json()
      
      // Get file listing
      const files = await this.getFileList(packageSpec)

      return {
        name: packageJson.name,
        version: packageJson.version,
        files,
        dependencies: packageJson.dependencies,
        peerDependencies: packageJson.peerDependencies,
        main: packageJson.main,
        module: packageJson.module,
        type: packageJson.type,
        sideEffects: packageJson.sideEffects,
      }
    } catch (error) {
      throw new Error(`Failed to fetch package info for ${packageSpec}: ${error}`)
    }
  }

  async getFileContent(packageName: string, filePath: string, version = 'latest'): Promise<string> {
    const packageSpec = version === 'latest' ? packageName : `${packageName}@${version}`
    const fileUrl = this.buildUrl(packageSpec, filePath)
    
    const response = await fetch(fileUrl)
    if (!response.ok) {
      throw new Error(`File not found: ${filePath} in ${packageSpec}`)
    }

    return response.text()
  }

  async downloadPackage(packageName: string, version = 'latest'): Promise<Map<string, string>> {
    const packageInfo = await this.getPackageInfo(packageName, version)
    const packageFiles = new Map<string, string>()

    // Download all files in parallel
    const downloadPromises = packageInfo.files
      .filter(file => file.type === 'file')
      .map(async (file) => {
        try {
          const content = await this.getFileContent(packageName, file.path, version)
          packageFiles.set(file.path, content)
        } catch (error) {
          console.warn(`Failed to download ${file.path}:`, error)
        }
      })

    await Promise.allSettled(downloadPromises)
    return packageFiles
  }

  private buildUrl(packageSpec: string, filePath: string = ''): string {
    const baseUrl = this.cdnProviders[this.defaultCDN]
    
    switch (this.defaultCDN) {
      case 'unpkg':
        return `${baseUrl}/${packageSpec}/${filePath}`
      case 'jsDelivr':
        return `${baseUrl}/${packageSpec}/${filePath}`
      case 'skypack':
        return `${baseUrl}/${packageSpec}/${filePath}`
      case 'esm.sh':
        return `${baseUrl}/${packageSpec}/${filePath}`
      default:
        return `${baseUrl}/${packageSpec}/${filePath}`
    }
  }

  private async getFileList(packageSpec: string): Promise<CDNFile[]> {
    try {
      // For unpkg, we can get file listing
      if (this.defaultCDN === 'unpkg') {
        const listUrl = `${this.cdnProviders.unpkg}/${packageSpec}/?meta`
        const response = await fetch(listUrl)
        
        if (response.ok) {
          const data = await response.json()
          return this.parseUnpkgListing(data)
        }
      }

      // For other CDNs, we'll try common file patterns
      return await this.discoverCommonFiles(packageSpec)
    } catch (error) {
      console.warn('Failed to get file listing, using common patterns:', error)
      return await this.discoverCommonFiles(packageSpec)
    }
  }

  private parseUnpkgListing(data: any): CDNFile[] {
    const files: CDNFile[] = []
    
    const traverse = (obj: any, basePath = '') => {
      if (obj.type === 'file') {
        files.push({
          path: basePath,
          size: obj.size || 0,
          type: 'file',
        })
      } else if (obj.type === 'directory' && obj.files) {
        for (const [name, fileObj] of Object.entries(obj.files)) {
          const filePath = basePath ? `${basePath}/${name}` : name
          traverse(fileObj, filePath)
        }
      }
    }

    traverse(data)
    return files
  }

  private async discoverCommonFiles(packageSpec: string): Promise<CDNFile[]> {
    const commonFiles = [
      'package.json',
      'index.js',
      'index.mjs',
      'index.ts',
      'dist/index.js',
      'dist/index.mjs',
      'dist/index.umd.js',
      'lib/index.js',
      'src/index.js',
      'src/index.ts',
      'README.md',
      'LICENSE',
    ]

    const existingFiles: CDNFile[] = []

    const checkPromises = commonFiles.map(async (filePath) => {
      try {
        const url = this.buildUrl(packageSpec, filePath)
        const response = await fetch(url, { method: 'HEAD' })
        
        if (response.ok) {
          const size = parseInt(response.headers.get('content-length') || '0', 10)
          existingFiles.push({
            path: filePath,
            size,
            type: 'file',
          })
        }
      } catch (error) {
        // File doesn't exist, ignore
      }
    })

    await Promise.allSettled(checkPromises)
    return existingFiles
  }

  async resolveMainFile(packageInfo: CDNPackageInfo): Promise<string | null> {
    // Try different entry points in order of preference
    const entryPoints = [
      packageInfo.module,
      packageInfo.main,
      'index.js',
      'index.mjs',
      'dist/index.js',
      'lib/index.js',
    ].filter(Boolean) as string[]

    for (const entryPoint of entryPoints) {
      try {
        await this.getFileContent(packageInfo.name, entryPoint)
        return entryPoint
      } catch {
        continue
      }
    }

    return null
  }

  switchCDN(provider: keyof typeof this.cdnProviders): void {
    this.defaultCDN = provider
  }
}
