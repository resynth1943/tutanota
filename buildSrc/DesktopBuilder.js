import {resolveDesktopDeps} from "./RollupDebugConfig"

const Promise = require('bluebird')
const fs = Promise.promisifyAll(require("fs-extra"))
const path = require("path")
const rollup = require("rollup")
const {terser} = require("rollup-plugin-terser")
const babel = require("rollup-plugin-babel")
const commonjs = require("rollup-plugin-commonjs")

async function build(dirname, version, targets, updateUrl, nameSuffix) {
	const targetString = Object.keys(targets)
	                           .filter(k => typeof targets[k] !== "undefined")
	                           .join(" ")
	console.log("Building desktop client for v" + version + " (" + targetString + ")...")
	const updateSubDir = "desktop" + nameSuffix
	const distDir = path.join(dirname, '/build/dist/')

	console.log("Updating electron-builder config...")
	const content = require('./electron-package-json-template')(
		nameSuffix,
		version,
		updateUrl,
		path.join(dirname, "/resources/desktop-icons/logo-solo-red.png"),
		nameSuffix !== "-snapshot"
	)
	console.log("updateUrl is", updateUrl)
	await fs.writeFileAsync("./build/dist/package.json", JSON.stringify(content), 'utf-8')

	//prepare files
	await fs.removeAsync(path.join(distDir, "..", updateSubDir))
	console.log("Bundling desktop client")
	const bundle = await rollup.rollup({
		input: ['src/desktop/DesktopMain.js', 'src/desktop/preload.js', 'src/desktop/PreloadImports.js'],
		plugins: [
			resolveDesktopDeps(),
			babel({
				plugins: [
					// Using Flow plugin and not preset to run before class-properties and avoid generating strange property code
					"@babel/plugin-transform-flow-strip-types",
					"@babel/plugin-proposal-class-properties",
					"@babel/plugin-syntax-dynamic-import",
					"@babel/plugin-transform-parameters",
				]
			}),
			commonjs({
				exclude: "src/**",
			}),
			terser(),
		],
		perf: true,
		preserveModules: true,
	})
	await bundle.write({
		sourcemap: true,
		dir: distDir + "desktop",
		format: "cjs",
		exports: "named" // PreloadImports export differ in normal/dist builds without this setting
	})

	console.log("Starting installer build...")
	//package for linux, win, mac
	const electronBuilder = require("electron-builder")
	await electronBuilder.build({
		_: ['build'],
		win: targets.win,
		mac: targets.mac,
		linux: targets.linux,
		p: 'always',
		project: distDir
	})
	console.log("Move output to /build/" + updateSubDir + "/...")
	await Promise.all(
		fs.readdirSync(path.join(distDir, '/installers'))
		  .filter((file => file.startsWith(content.name) || file.endsWith('.yml')))
		  .map(file => fs.moveAsync(
			  path.join(distDir, '/installers/', file),
			  path.join(distDir, `../${updateSubDir}`, file)
			  )
		  )
	)
	await Promise.all([
		fs.removeAsync(path.join(distDir, '/installers/')),
		fs.removeAsync(path.join(distDir, '/node_modules/')),
		fs.removeAsync(path.join(distDir, '/cache.json')),
		fs.removeAsync(path.join(distDir, '/package.json')),
		fs.removeAsync(path.join(distDir, '/package-lock.json')),
		fs.removeAsync(path.join(distDir, '/src/')),
	])
}

module.exports = {
	build,
}
