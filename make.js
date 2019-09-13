import options from "commander"
import path from "path"
import * as env from "./buildSrc/env.js"
import fs from "fs-extra"
import * as LaunchHtml from "./buildSrc/LaunchHtml.js"
import * as SystemConfig from "./buildSrc/SystemConfig.js"
import os from "os"
import {spawn} from "child_process"
import * as RollupConfig from "./buildSrc/RollupConfig.js"
import {fileURLToPath} from 'url';
import {dirname} from 'path';
import Promise from "bluebird"
import {default as RollupDebugConfig, writeNollupBundle} from "./buildSrc/RollupDebugConfig.js"

const __dirname = dirname(fileURLToPath(import.meta.url))

async function createHtml(env, watch) {
	let filenamePrefix
	switch (env.mode) {
		case "App":
			filenamePrefix = "app"
			break
		case "Browser":
			filenamePrefix = "index"
			break
		case "Desktop":
			filenamePrefix = "desktop"
	}
	let imports = SystemConfig.baseDevDependencies.concat([`${filenamePrefix}Bootstrap.js`])
	const template = fs.readFileSync("./buildSrc/bootstrap.template.js", "utf8")
	await _writeFile(`./build/${filenamePrefix}Bootstrap.js`, [
		`window.whitelabelCustomizations = null`,
		`window.env = ${JSON.stringify(env, null, 2)}`,
		watch ? "new WebSocket('ws://localhost:8080').addEventListener('message', (e) => window.hotReload())" : "",
	].join("\n") + "\n" + template)
	const html = await LaunchHtml.renderHtml(imports, env)
	await _writeFile(`./build/${filenamePrefix}.html`, html)
}

function _writeFile(targetFile, content) {
	return fs.mkdirs(path.dirname(targetFile)).then(() => fs.writeFile(targetFile, content, 'utf-8'))
}

async function prepareAssets(watch) {
	let restUrl
	await Promise.all([
		await fs.emptyDir("build/images"),
		fs.copy(path.join(__dirname, '/resources/favicon'), path.join(__dirname, '/build/images')),
		fs.copy(path.join(__dirname, '/resources/images/'), path.join(__dirname, '/build/images')),
		fs.copy(path.join(__dirname, '/libs'), path.join(__dirname, '/build/libs'))
	])
	if (options.stage === 'test') {
		restUrl = 'https://test.tutanota.com'
	} else if (options.stage === 'prod') {
		restUrl = 'https://mail.tutanota.com'
	} else if (options.stage === 'local') {
		restUrl = "http://" + os.hostname().split(".")[0] + ":9000"
	} else { // host
		restUrl = options.host
	}

	await fs.copyFile(path.join(__dirname, "/src/api/worker/WorkerBootstrap.js"), path.join(__dirname, '/build/WorkerBootstrap.js'))

	const version = JSON.parse(await fs.readFile("package.json", "utf8"))

	return Promise.all([
		createHtml(env.create((options.stage === 'local') ? null : restUrl, version, "Browser"), watch),
		createHtml(env.create(restUrl, version, "App"), watch),
		createHtml(env.create(restUrl, version, "Desktop"), watch)
	])
}

async function startFlowCheck() {
	let flow
	// We can't use flow in F-Droid builds because it uses prebuilt binary.
	try {
		flow = await import("flow-bin")
		spawn(flow, [], {stdio: [process.stdin, process.stdout, process.stderr]})
	} catch (e) {
		console.log("flow was not found")
	}
}

/** Returns cache or null. */
function readCache(cacheLocation) {
	try {
		// *must not* return boolean. Returning "false" will disable caching which is bad.
		return fs.existsSync(cacheLocation) ? JSON.parse(fs.readFileSync(cacheLocation, {encoding: "utf8"})) : null
	} catch (e) {
		return null
	}
}

async function build({watch, desktop}) {
	// noinspection ES6MissingAwait
	startFlowCheck()
	await prepareAssets(watch)

	const inputOptions = {
		input: ["src/app.js", "src/api/worker/WorkerImpl.js"],
		plugins: RollupConfig.rollupDebugPlugins(path.resolve(".")),
		treeshake: false, // disable tree-shaking for faster development builds
		preserveModules: true,
	}
	const outputOptions = {format: "system", sourcemap: "inline", dir: "build"}

	if (watch) {
		// const WebSocket = require("ws")
		// const server = new WebSocket.Server({
		// 	port: 8080
		// })
		// let startTime
		// nollup.watch(Object.assign({}, inputOptions, {output: outputOptions})).on("event", (e) => {
		// 	switch (e.code) {
		// 		case "START":
		// 			console.log("Started bundling")
		// 			startTime = Date.now()
		// 			break
		// 		case "BUNDLE_START":
		// 			console.log("Started bundle", e.input)
		// 			break
		// 		case "BUNDLE_END":
		// 			console.log("Finished bundle ", e.input, " in ", e.duration)
		// 			server.clients.forEach((c) => c.send("reload"))
		// 			break
		// 		case "END":
		// 			console.log("Finished bundling", Date.now() - startTime)
		// 			break
		// 		case "ERROR":
		// 			console.warn("Error during bundling", e)
		// 			break
		// 		case "FATAL":
		// 			console.error("Fatal error duing bundling", e)
		// 			break
		// 	}
		// })
		let NollupDevServer = await import('nollup/lib/dev-server');
		NollupDevServer({
			hot: true,
			port: 9001,
			config: path.resolve(process.cwd(), "./buildSrc/RollupDebugConfig.js"),
			contentBase: "build",
			verbose: true,
		})
	} else {
		const start = Date.now()
		const nollup = (await import('nollup')).default
		const debugConfig = (await import('./buildSrc/RollupDebugConfig.js')).default
		console.log("Bundling...")
		const bundle = await nollup(debugConfig)
		console.log("Generating...")
		const result = await bundle.generate(debugConfig.output)
		result.stats && console.log("Generated in", result.stats.time)

		writeNollupBundle(result)
		console.log("Built in", Date.now() - start)
		// // const cacheLocation = "./build/main-bundle-cache"
		// // console.log("Reading cache")
		// // const readCacheStart = Date.now()
		// // const cache = readCache(cacheLocation)
		// // cache && console.log("using cache for web bundle")
		// const startBundle = Date.now()
		// // console.log("Finished reading cache in", startBundle - readCacheStart)
		//
		// console.log("Started bundling")
		// const bundle = await nollup(Object.assign({}, inputOptions, {}))
		// const endBundle = Date.now()
		// // console.log("Finished bundling in ", endBundle - startBundle, bundle.getTimings())
		//
		// const {output} = await bundle.generate(outputOptions)
		// const endWrite = Date.now()
		// console.log("Finished writing bundles in ", endWrite - endBundle)
		// //
		// // await fs.writeFileAsync(cacheLocation, JSON.stringify(bundle.cache))
		// // console.log("Finished writing cache in ", Date.now() - endBundle)

	}
	if (desktop) {
		await startDesktop()
	}
}

options
	.usage('[options] [test|prod|local|host <url>], "local" is default')
	.arguments('[stage] [host]')
	.option('-c, --clean', 'Clean build directory')
	.option('-w, --watch', 'Watch build dir and rebuild if necessary')
	.option('-d, --desktop', 'assemble & start desktop client')
	.action(function (stage, host) {
		if (!["test", "prod", "local", "host", undefined].includes(stage)
			|| (stage !== "host" && host)
			|| (stage === "host" && !host)) {
			options.outputHelp()
			process.exit(1)
		}
		options.stage = stage || "local"
		options.host = host
	})
	.parse(process.argv)

if (options.clean) {
	console.log("cleaning build dir")
	fs.emptyDir("build")
}

build(options)
async function startDesktop() {
	console.log("Building desktop client...")
	const packageJSON = (await import('./buildSrc/electron-package-json-template.js')).default(
		"",
		"0.0.1",
		"http://localhost:9000",
		path.join(__dirname, "/resources/desktop-icons/logo-solo-red.png"),
		false
	)
	const content = JSON.stringify(packageJSON)

	await fs.createFile("./build/package.json")
	await fs.writeFile("./build/package.json", content, 'utf-8')

	const cacheLocation = "./build/desktop-bundle-cache"
	const cache = readCache(cacheLocation)
	cache && console.log("using cache for desktop bundle")
	const nollup = (await import('nollup')).default
	const bundle = await nollup({
		input: ["src/desktop/DesktopMain.js", "src/desktop/preload.js"],
		plugins: RollupDebugConfig.plugins,
		treeshake: false, // disable tree-shaking for faster development builds
		preserveModules: true,
		cache,
	})
	// await fs.writeFile(cacheLocation, JSON.stringify(bundle.cache))


	// await bundle.write({
	// 	format: "cjs",
	// 	sourcemap: "inline",
	// 	dir: "build/desktop"
	// })
	console.log("Bundled desktop client")

	spawn("/bin/sh", ["-c", "npm start"], {
		stdio: ['ignore', 'inherit', 'inherit'],
		detached: false
	})
}

// function prepareAssets() {
// 	let restUrl
// 	return Promise.resolve()
// 	              .then(() => fs.copyAsync(path.join(__dirname, '/resources/favicon'), path.join(__dirname, '/build/images')))
// 	              .then(() => fs.copyAsync(path.join(__dirname, '/resources/images/'), path.join(__dirname, '/build/images')))
// 	              .then(() => fs.copyAsync(path.join(__dirname, '/libs'), path.join(__dirname, '/build/libs')))
// 	              .then(() => {
// 		              if (options.stage === 'test') {
// 			              restUrl = 'https://test.tutanota.com'
// 		              } else if (options.stage === 'prod') {
// 			              restUrl = 'https://mail.tutanota.com'
// 		              } else if (options.stage === 'local') {
// 			              restUrl = "http://" + os.hostname().split(".")[0] + ":9000"
// 		              } else { // host
// 			              restUrl = options.host
// 		              }
//
// 		              return Promise.all([
// 			              createHtml(env.create(SystemConfig.devConfig(true), (options.stage === 'local') ? null : restUrl, version, "Browser")),
// 			              createHtml(env.create(SystemConfig.devConfig(true), restUrl, version, "App")),
// 			              createHtml(env.create(SystemConfig.devConfig(false), restUrl, version, "Desktop"))
// 		              ])
// 	              })
// }
