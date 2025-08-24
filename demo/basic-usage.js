import { BrowserPackageAnalyzer } from '../src/index.js'

/**
 * Basic usage example of the browser package analyzer
 */
async function basicExample() {
  console.log('🚀 Starting basic package analysis...')

  const analyzer = new BrowserPackageAnalyzer({
    minifier: 'esbuild',
    cdn: 'unpkg',
    debug: true
  })

  try {
    // Analyze a popular package
    console.log('📦 Analyzing lodash...')
    const stats = await analyzer.analyzePackage('lodash')
    
    console.log('📊 Results:')
    console.log(`- Package: ${stats.name}`)
    console.log(`- Bundle size: ${formatBytes(stats.size)}`)
    console.log(`- Gzipped size: ${formatBytes(stats.gzipSize)}`)
    console.log(`- Dependencies: ${stats.dependencyCount}`)
    console.log(`- Module type: ${stats.isModuleType ? 'ES Module' : 'CommonJS'}`)
    console.log(`- Has side effects: ${stats.hasSideEffects}`)

    if (stats.parseTime) {
      console.log(`- Parse time: ${stats.parseTime.toFixed(2)}ms`)
    }

  } catch (error) {
    console.error('❌ Analysis failed:', error.message)
  } finally {
    await analyzer.dispose()
  }
}

/**
 * Example with custom imports
 */
async function customImportsExample() {
  console.log('🔧 Analyzing specific lodash imports...')

  const analyzer = new BrowserPackageAnalyzer({
    minifier: 'terser',
    cdn: 'jsDelivr',
    customImports: ['debounce', 'throttle', 'get', 'set'],
    debug: true
  })

  try {
    const stats = await analyzer.analyzePackage('lodash', '4.17.21')
    
    console.log('📊 Custom imports analysis:')
    console.log(`- Bundle size: ${formatBytes(stats.size)}`)
    console.log(`- Gzipped size: ${formatBytes(stats.gzipSize)}`)
    
  } catch (error) {
    console.error('❌ Custom imports analysis failed:', error.message)
  } finally {
    await analyzer.dispose()
  }
}

/**
 * Example comparing different CDN providers
 */
async function cdnComparisonExample() {
  console.log('🌐 Comparing CDN providers...')

  const cdnProviders = ['unpkg', 'jsDelivr', 'skypack']
  const packageName = 'react'

  for (const cdn of cdnProviders) {
    console.log(`\n📡 Testing ${cdn}...`)
    
    const analyzer = new BrowserPackageAnalyzer({
      cdn: cdn,
      minifier: 'esbuild'
    })

    try {
      const start = performance.now()
      const stats = await analyzer.analyzePackage(packageName)
      const duration = performance.now() - start

      console.log(`- ${cdn}: ${formatBytes(stats.size)} (${duration.toFixed(0)}ms)`)
      
    } catch (error) {
      console.log(`- ${cdn}: Failed (${error.message})`)
    } finally {
      await analyzer.dispose()
    }
  }
}

/**
 * Example analyzing export sizes
 */
async function exportSizesExample() {
  console.log('📊 Analyzing export sizes...')

  const analyzer = new BrowserPackageAnalyzer({
    cdn: 'unpkg',
    minifier: 'esbuild'
  })

  try {
    const exportSizes = await analyzer.getPackageExportSizes('date-fns')
    
    console.log(`📦 Export sizes for ${exportSizes.name}@${exportSizes.version}:`)
    
    // Show top 10 largest exports
    const sortedAssets = exportSizes.assets
      .sort((a, b) => b.size - a.size)
      .slice(0, 10)

    sortedAssets.forEach((asset, index) => {
      console.log(`${index + 1}. ${asset.path}: ${formatBytes(asset.size)} (${formatBytes(asset.gzipSize)} gzipped)`)
    })

  } catch (error) {
    console.error('❌ Export analysis failed:', error.message)
  } finally {
    await analyzer.dispose()
  }
}

/**
 * WebContainer example (requires COOP/COEP headers)
 */
async function webContainerExample() {
  console.log('🐳 Testing WebContainer support...')

  const analyzer = new BrowserPackageAnalyzer({
    useWebContainer: true,
    minifier: 'terser',
    debug: true
  })

  try {
    // This requires proper COOP/COEP headers to work
    const stats = await analyzer.analyzePackage('chalk')
    
    console.log('📊 WebContainer analysis:')
    console.log(`- Package: ${stats.name}`)
    console.log(`- Bundle size: ${formatBytes(stats.size)}`)
    console.log(`- Dependencies: ${stats.dependencyCount}`)

  } catch (error) {
    console.log('❌ WebContainer not supported or failed:', error.message)
    console.log('💡 Tip: WebContainer requires Cross-Origin-Embedder-Policy and Cross-Origin-Opener-Policy headers')
  } finally {
    await analyzer.dispose()
  }
}

/**
 * Utility function to format bytes
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Run all examples
 */
async function runExamples() {
  console.log('🧪 Running browser package analysis examples...\n')

  try {
    await basicExample()
    console.log('\n' + '='.repeat(50) + '\n')
    
    await customImportsExample()
    console.log('\n' + '='.repeat(50) + '\n')
    
    await cdnComparisonExample()
    console.log('\n' + '='.repeat(50) + '\n')
    
    await exportSizesExample()
    console.log('\n' + '='.repeat(50) + '\n')
    
    await webContainerExample()
    
  } catch (error) {
    console.error('❌ Example execution failed:', error)
  }

  console.log('\n✅ Examples completed!')
}

// Run examples if this script is executed directly
if (typeof window !== 'undefined') {
  // Browser environment
  window.runExamples = runExamples
  console.log('💡 Run runExamples() to execute all examples')
} else {
  // Node.js environment (for testing)
  runExamples()
}

export { 
  basicExample, 
  customImportsExample, 
  cdnComparisonExample, 
  exportSizesExample, 
  webContainerExample,
  runExamples 
}
