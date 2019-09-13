"use strict"
const options = require('commander')

const Promise = require('bluebird')
const fs = Promise.promisifyAll(require("fs-extra"))
let version = require('./package.json').version
const env = require('./buildSrc/env.js')
const LaunchHtml = require('./buildSrc/LaunchHtml.js')
const spawnSync = require('child_process').spawnSync
const desktopSigner = require('./buildSrc/installerSigner.js')

const path = require("path")
const os = require("os")
const SystemConfig = require('./buildSrc/SystemConfig.js')

const rollup = require("rollup")
const RollupConfig = require("./buildSrc/RollupConfig")
const {terser} = require("rollup-plugin-terser")
const babel = require("rollup-plugin-babel")
const {resolveLibs} = require("./buildSrc/RollupConfig")
const commonjs = require("rollup-plugin-commonjs")
const analyze = require('rollup-plugin-analyzer')

let start = Date.now()

const DistDir = 'build/dist'

let bundles = {}
const bundlesCache = "build/bundles.json"

const distLoc = (filename) => `${DistDir}/${filename}`

options
	.usage('[options] [test|prod|local|release|host <url>], "release" is default')
	.arguments('[stage] [host]')
	.option('-e, --existing', 'Use existing prebuilt Webapp files in /build/dist/')
	.option('-w --win', 'Build desktop client for windows')
	.option('-l --linux', 'Build desktop client for linux')
	.option('-m --mac', 'Build desktop client for mac')
	.option('-d, --deb', 'Build .deb package. Requires -wlm to be set or installers to be present')
	.option('-p, --publish', 'Git tag and upload package, only allowed in release stage. Implies -d.')
	.option('--custom-desktop-release', "use if manually building desktop client from source. doesn't install auto updates, but may still notify about new releases.")
	.option('--unpacked', "don't pack the app into an installer")
	.option('--out-dir <outDir>', "where to copy the client",)
	.action((stage, host) => {
		if (!["test", "prod", "local", "host", "release", undefined].includes(stage)
			|| (stage !== "host" && host)
			|| (stage === "host" && !host)
			|| stage !== "release" && options.publish) {
			options.outputHelp()
			process.exit(1)
		}
		options.stage = stage || "release"
		options.host = host
		options.deb = options.deb || options.publish
		options.desktop = {
			win: options.win ? [] : undefined,
			linux: options.linux ? [] : undefined,
			mac: options.mac ? [] : undefined
		}

		options.desktop = Object.values(options.desktop).some(Boolean)
			? options.desktop
			: !!options.customDesktopRelease // no platform flags given, build desktop for current platform if customDesktopBuild flag is set.
				? {
					win: process.platform === "win32" ? [] : undefined,
					linux: process.platform === "linux" ? [] : undefined,
					mac: process.platform === "darwin" ? [] : undefined
				}
				: undefined
	})
	.parse(process.argv)

Promise.resolve()
       .then(buildWebapp)
       .then(buildDesktopClient)
       .then(signDesktopClients)
       .then(packageDeb)
       .then(publish)
       .then(() => {
	       const now = new Date(Date.now()).toTimeString().substr(0, 5)
	       console.log(`\nBuild time: ${measure()}s (${now})`)
       })
       .catch(e => {
	       console.log("\nBuild error:", e)
	       process.exit(1)
       })

function measure() {
	return (Date.now() - start) / 1000
}

async function clean() {
	await fs.emptyDirAsync("build")
	await fs.ensureDirAsync(DistDir + "/translations")
}

async function buildWebapp() {
	if (options.existing) {
		console.log("Found existing option (-e). Skipping Webapp build.")
		return fs.readFileAsync(path.join(__dirname, bundlesCache)).then(bundlesCache => {
			bundles = JSON.parse(bundlesCache)
		})
	}
	console.log("started cleaning", measure())
	await clean()
	console.log("started copying images", measure())
	await fs.copyAsync(path.join(__dirname, '/resources/images'), path.join(__dirname, '/build/dist/images'))
	const bootstrap = await fs.readFileAsync('src/api/worker/WorkerBootstrap.js', 'utf-8')
	let lines = bootstrap.split("\n")
	lines[0] = `importScripts('libs.js')`
	// let code = babelCompile(lines.join("\n")).code
	await fs.writeFileAsync('build/dist/WorkerBootstrap.js', lines.join("\n"), 'utf-8')

	console.log("stared bundling")
	const bundle = await rollup.rollup({
		input: ["src/app.js", "src/api/worker/WorkerImpl.js"],
		plugins: [
			analyze({limit: 10, hideDeps: true}),
			babel({
				plugins: [
					// Using Flow plugin and not preset to run before class-properties and avoid generating strange property code
					"@babel/plugin-transform-flow-strip-types",
					"@babel/plugin-proposal-class-properties",
					"@babel/plugin-syntax-dynamic-import",
					"@babel/plugin-transform-arrow-functions",
					"@babel/plugin-transform-classes",
					"@babel/plugin-transform-computed-properties",
					"@babel/plugin-transform-destructuring",
					"@babel/plugin-transform-for-of",
					"@babel/plugin-transform-parameters",
					"@babel/plugin-transform-shorthand-properties",
					"@babel/plugin-transform-spread",
					"@babel/plugin-transform-template-literals",
				]
			}),
			resolveLibs(),
			commonjs({
				exclude: "src/**",
			}),
			terser(),
		],
		experimentalOptimizeChunks: true,
		chunkGroupingSize: 20000,
		perf: true,
	})
	console.log("bundling timings: ")
	for (let [k, v] of Object.entries(bundle.getTimings())) {
		console.log(k, v[0])
	}
	console.log("started writing bundles")
	await bundle.write(Object.assign({}, RollupConfig.output, {sourcemap: true, dir: "build/dist"}))


	console.log("creating language bundles")
	// await createLanguageBundles(bundles)
	let restUrl
	if (options.stage === 'test') {
		restUrl = 'https://test.tutanota.com'
	} else if (options.stage === 'prod') {
		restUrl = 'https://mail.tutanota.com'
	} else if (options.stage === 'local') {
			              restUrl = "http://" + os.hostname() + ":9000"
	} else if (options.stage === 'release') {
		restUrl = undefined
	} else { // host
		restUrl = options.host
	}
	await Promise.all([
		createHtml(env.create(SystemConfig.distRuntimeConfig(bundles),
			(options.stage === 'release' || options.stage === 'local')
				? null
				: restUrl, version, "Browser", true), bundles),
		(options.stage !== 'release')
			? createHtml(env.create(SystemConfig.distRuntimeConfig(bundles), restUrl, version, "App", true), bundles)
			: null,
	])
	await copyDependencies()

	// return Promise.resolve()
	//               .then(() => console.log("started cleaning", measure()))
	//               .then(() => clean())
	//               .then(() => console.log("started copying images", measure()))
	//               .then(() => fs.copyAsync(path.join(__dirname, '/resources/favicon'), path.join(__dirname, '/build/dist/images')))
	//               .then(() => fs.copyAsync(path.join(__dirname, '/resources/images'), path.join(__dirname, '/build/dist/images')))
	//               .then(() => fs.readFileAsync('src/api/worker/WorkerBootstrap.js', 'utf-8').then(bootstrap => {
	// 	              let lines = bootstrap.split("\n")
	// 	              lines[0] = `importScripts('libs.js')`
	// 	              let code = babelCompile(lines.join("\n")).code
	// 	              return fs.writeFileAsync('build/dist/WorkerBootstrap.js', code, 'utf-8')
	//               }))
	//               .then(() => {
	// 	              console.log("started tracing", measure())
	// 	              return Promise.all([
	// 		              builder.trace('src/api/worker/WorkerImpl.js + src/api/entities/*/* + src/system-resolve.js + libs/polyfill.js'),
	// 		              builder.trace('src/app.js + src/system-resolve.js'),
	// 		              builder.trace('src/gui/theme.js - libs/stream.js'),
	// 		              builder.trace(getAsyncImports('src/app.js')
	// 			              .concat(getAsyncImports('src/native/NativeWrapper.js'))
	// 			              .concat(getAsyncImports('src/native/NativeWrapperCommands.js'))
	// 			              .concat([
	// 				              "src/login/LoginViewController.js",
	// 				              "src/gui/base/icons/Icons.js",
	// 				              "src/search/SearchBar.js",
	// 				              "src/subscription/terms.js"
	// 			              ]).join(" + "))
	// 	              ])
	//               })
	//               .then(([workerTree, bootTree, themeTree, mainTree]) => {
	// 	              console.log("started bundling", measure())
	// 	              let commonTree = builder.intersectTrees(workerTree, mainTree)
	// 	              return Promise.all([
	// 		              bundle(commonTree, distLoc("common.js"), bundles),
	// 		              bundle(builder.subtractTrees(workerTree, commonTree), distLoc("worker.js"), bundles),
	// 		              bundle(builder.subtractTrees(builder.subtractTrees(builder.subtractTrees(mainTree, commonTree), bootTree), themeTree), distLoc("main.js"), bundles),
	// 		              bundle(builder.subtractTrees(themeTree, commonTree), distLoc("theme.js"), bundles),
	// 		              bundle(builder.subtractTrees(bootTree, themeTree), distLoc("main-boot.js"), bundles)
	// 	              ])
	//               })
	//               .then(() => console.log("creating language bundles"))
	//               .then(() => createLanguageBundles(bundles))
	//               .then(() => {
	// 	              let restUrl
	// 	              if (options.stage === 'test') {
	// 		              restUrl = 'https://test.tutanota.com'
	// 	              } else if (options.stage === 'prod') {
	// 		              restUrl = 'https://mail.tutanota.com'
	// 	              } else if (options.stage === 'local') {
	// 		              restUrl = "http://" + os.hostname().split(".")[0] + ":9000"
	// 	              } else if (options.stage === 'release') {
	// 		              restUrl = undefined
	// 	              } else { // host
	// 		              restUrl = options.host
	// 	              }
	// 	              return Promise.all([
	// 		              createHtml(env.create(SystemConfig.distRuntimeConfig(bundles),
	// 			              (options.stage === 'release' || options.stage === 'local')
	// 				              ? null
	// 				              : restUrl, version, "Browser", true), bundles),
	// 		              (options.stage !== 'release')
	// 			              ? createHtml(env.create(SystemConfig.distRuntimeConfig(bundles), restUrl, version, "App", true), bundles)
	// 			              : null,
	// 	              ])
	//               })
	//               .then(() => bundleServiceWorker(bundles))
	//               .then(copyDependencies)
	//               .then(() => _writeFile(path.join(__dirname, bundlesCache), JSON.stringify(bundles)))
}

function buildDesktopClient() {
	if (options.desktop) {
		const desktopBuilder = require('./buildSrc/DesktopBuilder.js')
		const desktopBaseOpts = {
			dirname: __dirname,
			version: version,
			targets: options.desktop,
			updateUrl: options.customDesktopRelease
				? ""
				: "https://mail.tutanota.com/desktop",
			nameSuffix: "",
			notarize: !options.customDesktopRelease,
			outDir: options.outDir,
			unpacked: options.unpacked
		}

		if (options.stage === "release") {
			const buildPromise = createHtml(env.create(SystemConfig.distRuntimeConfig(bundles), "https://mail.tutanota.com", version, "Desktop", true), bundles)
				.then(() => desktopBuilder.build(desktopBaseOpts))
			if (!options.customDesktopRelease) { // don't build the test version for manual/custom builds
				const desktopTestOpts = Object.assign({}, desktopBaseOpts, {
					updateUrl: "https://test.tutanota.com/desktop",
					nameSuffix: "-test",
					// Do not notarize test build
					notarize: false
				})
				buildPromise.then(() => createHtml(env.create(SystemConfig.distRuntimeConfig(bundles), "https://test.tutanota.com", version, "Desktop", true), bundles))
				            .then(() => desktopBuilder.build(desktopTestOpts))
			}
			return buildPromise
		} else if (options.stage === "local") {
			const desktopLocalOpts = Object.assign({}, desktopBaseOpts, {
				version,
				updateUrl: "http://localhost:9000/client/build/desktop-snapshot",
				nameSuffix: "-snapshot",
				notarize: false
			})
			return createHtml(env.create(SystemConfig.distRuntimeConfig(bundles), "http://localhost:9000", version, "Desktop", true), bundles)
				.then(() => desktopBuilder.build(desktopLocalOpts))
		} else if (options.stage === "test") {
			const desktopTestOpts = Object.assign({}, desktopBaseOpts, {
				updateUrl: "https://test.tutanota.com/desktop",
				nameSuffix: "-test",
				notarize: false
			})
			return createHtml(env.create(SystemConfig.distRuntimeConfig(bundles), "https://test.tutanota.com", version, "Desktop", true), bundles)
				.then(() => desktopBuilder.build(desktopTestOpts))
		} else if (options.stage === "prod") {
			const desktopProdOpts = Object.assign({}, desktopBaseOpts, {
				version,
				updateUrl: "http://localhost:9000/desktop",
				notarize: false
			})
			return createHtml(env.create(SystemConfig.distRuntimeConfig(bundles), "https://mail.tutanota.com", version, "Desktop", true), bundles)
				.then(() => desktopBuilder.build(desktopProdOpts))
		} else { // stage = host
			const desktopHostOpts = Object.assign({}, desktopBaseOpts, {
				version,
				updateUrl: "http://localhost:9000/desktop-snapshot",
				nameSuffix: "-snapshot",
				notarize: false
			})
			return createHtml(env.create(SystemConfig.distRuntimeConfig(bundles), options.host, version, "Desktop", true), bundles)
				.then(() => desktopBuilder.build(desktopHostOpts))
		}
	}
}
}

function bundleServiceWorker(bundles) {
	return fs.readFileAsync("src/serviceworker/sw.js", "utf8").then((content) => {
		const filesToCache = ["index.js", "WorkerBootstrap.js", "index.html", "libs.js"]
			.concat(Object.keys(bundles).filter(b => !b.startsWith("translations")))
			.concat(["images/logo-favicon.png", "images/logo-favicon-152.png", "images/logo-favicon-196.png", "images/ionicons.ttf"])
		// Using "function" to hoist declaration, var wouldn't work in this case and we cannot prepend because
		// of "declare var"
		const customDomainFileExclusions = ["index.html", "index.js"]
		// This is a hack to use the same build for tests and for prod. This module is not compiled with SystemJS
		// and is just processed with babel so we want to define "module" variable but if we do it with new variable Babel
		// will rename module to _module so we define it on self which has the same effect but is not detected by Babel.
		// See the comment near the end of sw.js
		content = `self.module = {}
${content}
function filesToCache() { return ${JSON.stringify(filesToCache)} }
function version() { return "${version}" }
function customDomainCacheExclusions() { return ${JSON.stringify(customDomainFileExclusions)} }`
		return babelCompile(content).code
	}).then((content) => _writeFile(distLoc("sw.js"), content))
}

function copyDependencies() {
	let libs = SystemConfig.baseProdDependencies.map(file => fs.readFileSync(file, 'utf-8')).join("\n")
	return fs.writeFileAsync('build/dist/libs.js', libs, 'utf-8')
}

function createHtml(env) {
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
	let imports = ["libs.js", `${filenamePrefix}.js`]
	return Promise.all([
		_writeFile(`./build/dist/${filenamePrefix}.js`, [
			`window.whitelabelCustomizations = null`,
			`window.env = ${JSON.stringify(env, null, 2)}`,
			`System.import('./app.js')`,
		].join("\n")),
		LaunchHtml.renderHtml(imports, env).then((content) => _writeFile(`./build/dist/${filenamePrefix}.html`, content))
	])
}

// FIXME: languages?
// function createLanguageBundles(bundles) {
// 	const languageFiles = options.stage === 'release' || options.stage === 'prod'
// 		? glob.sync('src/translations/*.js')
// 		: ['src/translations/en.js', 'src/translations/de.js', 'src/translations/de_sie.js', 'src/translations/ru.js']
// 	return Promise.all(languageFiles.map(translation => {
// 		let filename = path.basename(translation)
// 		return builder.bundle(translation, {
// 			minify: false,
// 			mangle: false,
// 			runtime: false,
// 			sourceMaps: false
// 		}).then(function (output) {
// 			const bundle = `${DistDir}/translations/${filename}`
// 			bundles["translations/" + filename] = output.modules.sort()
// 			fs.writeFileSync(bundle, output.source, 'utf-8')
// 			console.log(`  > bundled ${bundle}`);
// 		})
// 	})).then(() => bundles)
// }

// FIXME: remove?
// function createExtraLibBundle(bundles) {
// 	return builder.bundle('libs/jszip.js', {
// 		minify: false,
// 		mangle: false,
// 		runtime: false,
// 		sourceMaps: false
// 	}).then(function (output) {
// 		const bundle = `${DistDir}/extra-libs.js`
// 		bundles["extra-libs.js"] = output.modules.sort()
// 		fs.writeFileSync(bundle, output.source, 'utf-8')
// 		console.log(`  > bundled ${bundle}`);
// 	}).then(() => bundles)
// }

function _writeFile(targetFile, content) {
	return fs.mkdirsAsync(path.dirname(targetFile)).then(() => fs.writeFileAsync(targetFile, content, 'utf-8'))
}

function signDesktopClients() {
	if (options.deb) {
		if (options.stage === "release" || options.stage === "prod") {
			desktopSigner('./build/desktop/tutanota-desktop-mac.zip', 'mac-sig-zip.bin', 'latest-mac.yml')
			desktopSigner('./build/desktop/tutanota-desktop-mac.dmg', 'mac-sig-dmg.bin', /*ymlFileName*/ null)
			desktopSigner('./build/desktop/tutanota-desktop-win.exe', 'win-sig.bin', 'latest.yml')
			desktopSigner('./build/desktop/tutanota-desktop-linux.AppImage', 'linux-sig.bin', 'latest-linux.yml')
		}
		if (options.stage === "release" || options.stage === "test") {
			desktopSigner('./build/desktop-test/tutanota-desktop-test-mac.zip', 'mac-sig-zip.bin', 'latest-mac.yml')
			desktopSigner('./build/desktop-test/tutanota-desktop-test-mac.dmg', 'mac-sig-dmg.bin', /*ymlFileName*/ null)
			desktopSigner('./build/desktop-test/tutanota-desktop-test-win.exe', 'win-sig.bin', 'latest.yml')
			desktopSigner('./build/desktop-test/tutanota-desktop-test-linux.AppImage', 'linux-sig.bin', 'latest-linux.yml')
		}
	}
}

let webAppDebName = `tutanota_${version}_amd64.deb`
let desktopDebName = `tutanota-desktop_${version}_amd64.deb`
let desktopTestDebName = `tutanota-desktop-test_${version}_amd64.deb`

function packageDeb() {
	if (options.deb) {
		const target = `/opt/tutanota`
		exitOnFail(spawnSync("/usr/bin/find", `. ( -name *.js -o -name *.html ) -exec gzip -fkv --best {} \;`.split(" "), {
			cwd: __dirname + '/build/dist',
			stdio: [process.stdin, process.stdout, process.stderr]
		}))

		console.log("create " + webAppDebName)
		exitOnFail(spawnSync("/usr/local/bin/fpm", `-f -s dir -t deb --deb-user tutadb --deb-group tutadb -n tutanota -v ${version} dist/=${target}`.split(" "), {
			cwd: __dirname + '/build',
			stdio: [process.stdin, process.stdout, process.stderr]
		}))

		if (options.stage === "release" || options.stage === "prod") {
			console.log("create " + desktopDebName)
			exitOnFail(spawnSync("/usr/local/bin/fpm", `-f -s dir -t deb --deb-user tutadb --deb-group tutadb -n tutanota-desktop -v ${version} desktop/=${target}-desktop`.split(" "), {
				cwd: __dirname + '/build',
				stdio: [process.stdin, process.stdout, process.stderr]
			}))
		}

		if (options.stage === "release" || options.stage === "test") {
			console.log("create " + desktopTestDebName)
			exitOnFail(spawnSync("/usr/local/bin/fpm", `-f -s dir -t deb --deb-user tutadb --deb-group tutadb -n tutanota-desktop-test -v ${version} desktop-test/=${target}-desktop`.split(" "), {
				cwd: __dirname + '/build',
				stdio: [process.stdin, process.stdout, process.stderr]
			}))
		}
	}
}

function publish() {
	if (options.publish) {
		console.log("Create git tag and copy .deb")
		exitOnFail(spawnSync("/usr/bin/git", `tag -a tutanota-release-${version} -m ''`.split(" "), {
			stdio: [process.stdin, process.stdout, process.stderr]
		}))

		exitOnFail(spawnSync("/usr/bin/git", `push origin tutanota-release-${version}`.split(" "), {
			stdio: [process.stdin, process.stdout, process.stderr]
		}))

		exitOnFail(spawnSync("/bin/cp", `-f build/${webAppDebName} /opt/repository/tutanota/`.split(" "), {
			cwd: __dirname,
			stdio: [process.stdin, process.stdout, process.stderr]
		}))

		exitOnFail(spawnSync("/bin/cp", `-f build/${desktopDebName} /opt/repository/tutanota-desktop/`.split(" "), {
			cwd: __dirname,
			stdio: [process.stdin, process.stdout, process.stderr]
		}))
		exitOnFail(spawnSync("/bin/cp", `-f build/${desktopTestDebName} /opt/repository/tutanota-desktop-test/`.split(" "), {
			cwd: __dirname,
			stdio: [process.stdin, process.stdout, process.stderr]
		}))

		// copy appimage for dev_clients
		exitOnFail(spawnSync("/bin/cp", `-f build/desktop/tutanota-desktop-linux.AppImage /opt/repository/dev_client/tutanota-desktop-linux-new.AppImage`.split(" "), {
			cwd: __dirname,
			stdio: [process.stdin, process.stdout, process.stderr]
		}))

		// user puppet needs to read the deb file from jetty
		exitOnFail(spawnSync("/bin/chmod", `o+r /opt/repository/tutanota/${webAppDebName}`.split(" "), {
			cwd: __dirname + '/build/',
			stdio: [process.stdin, process.stdout, process.stderr]
		}))

		exitOnFail(spawnSync("/bin/chmod", `o+r /opt/repository/tutanota-desktop/${desktopDebName}`.split(" "), {
			cwd: __dirname + '/build/',
			stdio: [process.stdin, process.stdout, process.stderr]
		}))
		exitOnFail(spawnSync("/bin/chmod", `o+r /opt/repository/tutanota-desktop-test/${desktopTestDebName}`.split(" "), {
			cwd: __dirname + '/build/',
			stdio: [process.stdin, process.stdout, process.stderr]
		}))
		// in order to release this new version locally, execute:
		// mv /opt/repository/dev_client/tutanota-desktop-linux-new.AppImage /opt/repository/dev_client/tutanota-desktop-linux.AppImage
		exitOnFail(spawnSync("/bin/chmod", `o+r /opt/repository/dev_client/tutanota-desktop-linux-new.AppImage`.split(" "), {
			cwd: __dirname + '/build/',
			stdio: [process.stdin, process.stdout, process.stderr]
		}))
	}
}

function exitOnFail(result) {
	if (result.status !== 0) {
		throw new Error("error invoking process" + JSON.stringify(result))
	}
}

function printTraceReport(trace) {
	function formatNumber(number) {
		number = number + ""
		while (number.length < 6) {
			number = '0' + number
		}
		return number
	}

	let size = 0
	let filesAndSizes = Object.keys(trace).map(file => {
		return {
			file,
			length: trace[file].source.length
		}
	}).sort((a, b) => a.length - b.length)

	console.log(filesAndSizes.map(o => formatNumber(o.length) + ": " + o.file).join("\n" + "  > "))
}
