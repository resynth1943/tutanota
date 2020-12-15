import options from "commander"
import path, {dirname} from "path"
import * as env from "./buildSrc/env.js"
import fs from "fs-extra"
import * as LaunchHtml from "./buildSrc/LaunchHtml.js"
import os from "os"
import {spawn} from "child_process"
import {fileURLToPath} from 'url';
import Promise from "bluebird"
import {config as RollupDebugConfig, writeNollupBundle} from "./buildSrc/RollupDebugConfig.js"
import * as SystemConfig from "./buildSrc/SystemConfig.js"
import nodeResolve from "@rollup/plugin-node-resolve"

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
		"",
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

	const {version} = JSON.parse(await fs.readFile("package.json", "utf8"))

	return Promise.all([
		createHtml(env.create((options.stage === 'local') ? null : restUrl, version, "Browser"), watch),
		createHtml(env.create(restUrl, version, "App"), watch),
		createHtml(env.create(restUrl, version, "Desktop"), watch)
	])
}

async function build({watch, desktop}) {
	if (desktop) {
		await startDesktop()
	} else {
		await prepareAssets(watch)
		const debugConfig = (await import('./buildSrc/RollupDebugConfig.js')).default

		if (watch) {
			let NollupDevServer = (await import('nollup/lib/dev-server.js')).default;
			NollupDevServer({
				hot: true,
				port: 9001,
				config: debugConfig,
				contentBase: "build",
				verbose: true,
				// "fallback" won't redirect but will serve html instead. We want redirect.
				after: (app) => {
					app.use((req, res, next) => {
						if ((req.method === 'GET' || req.method === 'HEAD') && req.accepts('html')) {
							res.redirect('/?r=' + req.url.replace(/\?/g, "&"))
						} else {
							next()
						}
					})
				}
			})
		} else {
			const start = Date.now()
			const nollup = (await import('nollup')).default

			console.log("Bundling...")
			const bundle = await nollup(debugConfig)
			console.log("Generating...")
			const result = await bundle.generate(debugConfig.output)
			result.stats && console.log("Generated in", result.stats.time, result.stats)

			await writeNollupBundle(result)
			console.log("Built in", Date.now() - start)
		}
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

build(options).catch((e) => {
	console.error(e)
	process.exit(1)
})

async function startDesktop() {
	console.log("Building desktop client...")
	const {version} = JSON.parse(await fs.readFile("package.json", "utf8"))

	const packageJSON = (await import('./buildSrc/electron-package-json-template.js')).default({
		nameSuffix: "-debug",
		version,
		updateUrl: "http://localhost:9000",
		iconPath: path.join(__dirname, "/resources/desktop-icons/logo-solo-red.png"),
		sign: false
	})
	const content = JSON.stringify(packageJSON, null, 2)

	await fs.createFile("./build/package.json")
	await fs.writeFile("./build/package.json", content, 'utf-8')

	const nollup = (await import('nollup')).default
	const bundle = await nollup({
		// Preload is technically separate but it doesn't import anything from the desktop anyway so we can bundle it together.
		input: ["src/desktop/DesktopMain.js", "src/desktop/preload.js"],
		plugins: [
			pluginNativeLoader(),
			nativeDepWorkaroundPlugin(),
			nodeResolve({preferBuiltins: true}),
			...RollupDebugConfig.plugins,
			{
				name: "resolve-fallback",
				resolveId(id) {
					if (id === "events") {
						console.log("no one could resolve events?")
					}
				}
			}
		],
	})
	// Electron uses commonjs imports. We could wrap it in our own commonjs module which dynamically imports the rest with import() but
	// it's not supported inside node 12 without --experimental-node-modules.
	const result = await bundle.generate({format: "cjs", sourceMap: true, dir: "./build/desktop", chunkFileNames: "[name].js"})
	await writeNollupBundle(result, "build/desktop")
	console.log("Bundled desktop client")

	spawn("/bin/sh", ["-c", "npm start"], {
		stdio: ['ignore', 'inherit', 'inherit'],
		detached: false
	})
}

function nativeDepWorkaroundPlugin() {
	return {
		name: "native-dep-workaround",
		resolveId(id) {
			if (id === "electron") {
				return false
			}
			// We currently have an import in Rsa.js which we don't want in Desktop as it pulls the whole worker with it
			if (id.endsWith("RsaApp")) {
				return false
			}
		}
	}
}

function pluginNativeLoader() {
	return {
		name: "native-loader",
		resolveId(id) {
			if (id.endsWith(".node")) {

			}
		},
		async load(id) {
			if (id.endsWith(".node")) {
				const name = path.basename(id)
				const content = await fs.promises.readFile(id)
				this.emitFile({
					type: 'asset',
					name,
					fileName: name,
					source: content,
				})
				return `export * from './${name}'`
			}
		},
	}
}