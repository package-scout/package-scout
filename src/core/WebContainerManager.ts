import { WebContainer } from '@webcontainer/api'
import type { WebContainerFiles } from '../types'

/**
 * Manages WebContainer instances for running Node.js code in the browser
 * WebContainer allows us to run npm install and webpack builds in a browser environment
 */
export class WebContainerManager {
  private webcontainer: WebContainer | null = null
  private isInitialized = false

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      this.webcontainer = await WebContainer.boot()
      this.isInitialized = true
    } catch (error) {
      console.error('Failed to initialize WebContainer:', error)
      throw new Error('WebContainer not supported in this environment')
    }
  }

  async createFileSystem(files: WebContainerFiles): Promise<void> {
    if (!this.webcontainer) {
      throw new Error('WebContainer not initialized')
    }

    await this.webcontainer.mount(files)
  }

  async installPackage(packageName: string, version?: string): Promise<void> {
    if (!this.webcontainer) {
      throw new Error('WebContainer not initialized')
    }

    const packageSpec = version ? `${packageName}@${version}` : packageName
    
    const installProcess = await this.webcontainer.spawn('npm', ['install', packageSpec])
    
    const exitCode = await installProcess.exit
    if (exitCode !== 0) {
      throw new Error(`Failed to install package ${packageSpec}`)
    }
  }

  async runCommand(command: string, args: string[] = []): Promise<string> {
    if (!this.webcontainer) {
      throw new Error('WebContainer not initialized')
    }

    const process = await this.webcontainer.spawn(command, args)
    
    let output = ''
    process.output.pipeTo(new WritableStream({
      write(data) {
        output += data
      }
    }))

    const exitCode = await process.exit
    if (exitCode !== 0) {
      throw new Error(`Command failed with exit code ${exitCode}`)
    }

    return output
  }

  async readFile(path: string): Promise<string> {
    if (!this.webcontainer) {
      throw new Error('WebContainer not initialized')
    }

    const file = await this.webcontainer.fs.readFile(path, 'utf-8')
    return file
  }

  async writeFile(path: string, content: string): Promise<void> {
    if (!this.webcontainer) {
      throw new Error('WebContainer not initialized')
    }

    await this.webcontainer.fs.writeFile(path, content)
  }

  async exists(path: string): Promise<boolean> {
    if (!this.webcontainer) {
      throw new Error('WebContainer not initialized')
    }

    try {
      await this.webcontainer.fs.readFile(path)
      return true
    } catch {
      return false
    }
  }

  async createPackageJson(dependencies: Record<string, string> = {}): Promise<void> {
    const packageJson = {
      name: 'package-scout-analysis',
      version: '1.0.0',
      dependencies,
    }

    await this.writeFile('package.json', JSON.stringify(packageJson, null, 2))
  }

  isSupported(): boolean {
    return typeof Worker !== 'undefined' && 
           'SharedArrayBuffer' in globalThis &&
           crossOriginIsolated
  }

  async teardown(): Promise<void> {
    if (this.webcontainer) {
      await this.webcontainer.teardown()
      this.webcontainer = null
      this.isInitialized = false
    }
  }
}
