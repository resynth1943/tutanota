import {resolveLibs} from "./RollupConfig.js"
import {nativeDepWorkaroundPlugin, pluginNativeLoader} from "./Builder.js"
import nodeResolve from "@rollup/plugin-node-resolve"
import Promise from "bluebird"
import fs from "fs"
import path from "path"
import {rollup} from "rollup"
import {terser} from "rollup-plugin-terser"
import pluginBabel from "@rollup/plugin-babel"
import commonjs from "@rollup/plugin-commonjs"
import electronBuilder from "electron-builder"
import generatePackgeJson from "./electron-package-json-template.js"

const {babel} = pluginBabel


export async function buildDesktop({
	                                   dirname, // directory this was called from
	                                   version, // application version that gets built
	                                   targets, // which desktop targets to build and how to package them
	                                   updateUrl, // where the client should pull its updates from, if any
	                                   nameSuffix, // suffix used to distinguish test-, prod- or snapshot builds on the same machine
	                                   notarize, // for the MacOs notarization feature
	                                   outDir, // where to copy the finished artifacts
	                                   unpacked // output desktop client without packing it into an installer
                                   }) {
	const targetString = Object.keys(targets)
	                           .filter(k => typeof targets[k] !== "undefined")
	                           .join(" ")
	console.log("Building desktop client for v" + version + " (" + targetString + ")...")
	const updateSubDir = "desktop" + nameSuffix
	const distDir = path.join(dirname, '/build/dist/')
	outDir = path.join(outDir || path.join(distDir, ".."), 'desktop' + nameSuffix)


	console.log("Updating electron-builder config...")
	const content = generatePackgeJson({
		nameSuffix,
		version,
		updateUrl,
		iconPath: path.join(dirname, "/resources/desktop-icons/logo-solo-red.png"),
		notarize,
		unpacked,
	})
	console.log("updateUrl is", updateUrl)
	await fs.promises.writeFile("./build/dist/package.json", JSON.stringify(content), 'utf-8')

	// prepare files
	try {
		await fs.promises.unlink(path.join(distDir, "..", updateSubDir))
	} catch (e) {
		if (e.code !== 'ENOENT') {
			throw e
		}
	}
	console.log("Bundling desktop client")
	await rollupDesktop(dirname, outDir)

	console.log("Starting installer build...")
	// package for linux, win, mac
	await electronBuilder.build({
		_: ['build/desktop'],
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
		  .map(file => fs.promises.rename(
			  path.join(distDir, '/installers/', file),
			  path.join(distDir, `../${updateSubDir}`, file)
			  )
		  )
	)
	await Promise.all([
		fs.promises.rmdir(path.join(distDir, '/installers/'), {recursive: true}),
		fs.promises.rmdir(path.join(distDir, '/node_modules/'), {recursive: true}),
		fs.promises.unlink(path.join(distDir, '/package.json')),
		fs.promises.unlink(path.join(distDir, '/package-lock.json'), ),
	])
}

async function rollupDesktop(dirname, outDir) {
	function babelPreset() {
		return babel({
			plugins: [
				// Using Flow plugin and not preset to run before class-properties and avoid generating strange property code
				"@babel/plugin-transform-flow-strip-types",
				"@babel/plugin-proposal-class-properties",
				"@babel/plugin-syntax-dynamic-import",
			],
			babelHelpers: "bundled",
		})
	}

	const mainBundle = await rollup({
		input: path.join(dirname, "src/desktop/DesktopMain.js"),
		plugins: [
			babelPreset(),
			resolveLibs(),
			nativeDepWorkaroundPlugin(true),
			pluginNativeLoader(),
			nodeResolve({preferBuiltins: true}),
			commonjs({exclude: "src/**"}),
			terser(),
		]
	})
	await mainBundle.write({sourcemap: true, format: "commonjs", dir: outDir})

	const preloadBundle = await rollup({
		input: path.join(dirname, "src/desktop/preload.js"),
		plugins: [
			babelPreset(),
			{
				name: "dynamicRequire",
				banner() {
					// see preload.js for explanation
					return "const dynamicRequire = require"
				},
			}
		],
	})
	await preloadBundle.write({sourcemap: true, format: "commonjs", dir: outDir})
}
