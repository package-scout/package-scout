# Package Scout

Hi! I'm Maifee Ul Asad, and this is **Package Scout** - a browser-based tool for analyzing npm packages, powered by WebAssembly and modern web APIs. My goal was to bring the power of Node.js package analysis tools directly to the browser, making it easy for anyone to inspect bundle sizes, dependencies, and module formats without leaving their browser.

## 🚀 What is Package Scout?
Package Scout lets you analyze npm packages in your browser. It fetches packages from popular CDNs (like unpkg, jsDelivr, Skypack, esm.sh), bundles them using WebAssembly-powered tools, and reports:

- **Bundle size** and **gzipped size**
- **Dependency count**
- **Module type** (ES Module/CommonJS)
- **Side effects**
- **Export sizes**
- **Parse time** (debug mode)

You can customize the analysis by choosing the CDN provider, minifier (esbuild/terser), and even specify custom imports for tree-shaking.

## 🧑‍💻 Features
- Analyze any npm package in the browser
- Compare bundle sizes across CDNs
- Inspect export sizes and module formats
- Debug mode for performance insights
- WebContainer support (experimental, requires COOP/COEP headers)
- Interactive demo UI and code examples

## 🌐 Browser Requirements
- Modern browser (Chrome 88+, Firefox 89+, Safari 15+)
- WebAssembly support
- SharedArrayBuffer for WebContainer (optional)

## 🛠️ Installation & Development
To get started locally:

```sh
pnpm install
pnpm run dev
```

Other scripts:
- `pnpm run build`  -  Build for production
- `pnpm run type-check`  -  TypeScript type checking
- `pnpm run test`  -  Run tests (vitest)

## 🎮 Demo
Try the interactive demo:
- [demo/demo.html](./demo/demo.html)  -  Analyze packages with a web UI
- [demo/basic-usage.js](./demo/basic-usage.js)  -  See code examples for API usage

## 📦 Usage Example
Here's how you can analyze a package in your browser:

```js
import { BrowserPackageAnalyzer } from '../src/index.js'

const analyzer = new BrowserPackageAnalyzer({
	minifier: 'esbuild',
	cdn: 'unpkg',
	debug: true
})

const stats = await analyzer.analyzePackage('lodash')
console.log(stats)
```

See [demo/basic-usage.js](./demo/basic-usage.js) for more examples: custom imports, CDN comparison, export sizes, and WebContainer analysis.

## 📚 Documentation
Full API docs and implementation details are available in the [source code](https://github.com/package-scout/package-scout/).

## 👤 Author
[Maifee Ul Asad](https://github.com/maifeeulasad)

## 📝 License
MIT License

<a href="https://launchigniter.com/product/package-scout?ref=badge-package-scout" target="_blank">
  <img src="https://launchigniter.com/api/badge/package-scout?theme=neutral" alt="Featured on LaunchIgniter" width="212" height="55" />
</a>
