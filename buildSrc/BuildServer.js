import {createServer} from "net"
import {createWriteStream, unlinkSync} from "fs"
import chokidar from "chokidar"

const logStream = createWriteStream("build.log")

process.on("SIGINT", () => {
	// IDEs tend to send SIGINT to all child processes but we want to keep running
	log("SIGINT received, ignoring")
})
process.on("uncaughtException", (e) => {
	log("Uncaught exception: ", e)
})

const args = process.argv.slice(2)
const [builderPath, watchFolder, addr] = args
if (!builderPath || !watchFolder || !addr) {
	console.log("Invalid arguments!", args)
	process.exit(1)
}

cleanup()


runServer().catch((e) => {
	log("Failed to run server", e)
	process.exit(1)
})


async function runServer() {
	log("Starting the server", args)
	const {build} = await import(builderPath)
	let oldConfig = null
	let watcher = null
	let bundleWrappers = null

	const server = createServer((socket) => {
		const outerLog = log
		socket.on("data", async (data) => {
			const log = (...args) => {
				outerLog(...args)
				socket.write(args.join(" ") + "\n")
			}
			log("new build request")
			try {
				const msg = data.toString()
				if (msg === "clean") {
					log("clean")
					closeServer()
					return
				}
				const newConfig = JSON.parse(msg)
				if (!oldConfig || !isSameConfig(newConfig, oldConfig)) {
					log(`config has changed, rebuilding old: ${JSON.stringify(oldConfig)}, new: ${JSON.stringify(newConfig)}`)
					bundleWrappers = null
				}
				oldConfig = newConfig

				if (bundleWrappers == null) {
					log("initial build")

					bundleWrappers = await build(newConfig, log)
					await generateBundles(bundleWrappers)
					socket.write("ok\n")
					watcher && watcher.close()
					watcher = chokidar.watch(watchFolder, {
						ignoreInitial: true,
						ignored: path => path.includes('/node_modules/') || path.includes('/.git/'),
					}).on("all", (event, path) => {
						log("invalidating", path)
						bundleWrappers.forEach(wrapper => wrapper.bundle.invalidate(path))
					})
					chokidar.watch("buildSrc", {ignoreInitial: true})
					        .on("all", () => {
						        // If any build-related things have changed, we want to restart
						        closeServer()
					        })
				} else {
					await generateBundles(bundleWrappers)
					socket.write("ok\n")
				}
			} catch (e) {
				log("error:", e)
				socket.write("err: " + String(e) + "\n")
			}
		}).on("error", (e) => {
			outerLog("socket error: ", e)
		})
	}).listen(addr)
	  .on("connection", () => {
		  log("connection")
	  })
	  .on("close", () => {
		  log("server closed")
		  cleanup()
	  })

	log("server listening")

	function closeServer() {
		log("stopping the serverP")
		server.close(() => process.exit(0))
	}
}

function cleanup() {
	try {
		unlinkSync(addr)
	} catch (e) {
		if (e.code !== "ENOENT") {
			throw e
		}
	}
}

function isSameConfig(oldConfig, newConfig) {
	// Assuming all keys are specified in both
	for (const [oldKey, oldValue] of Object.entries(oldConfig)) {
		if (newConfig[oldKey] !== oldValue) {
			return false
		}
	}
	return true
}

async function generateBundles(bundleWrappers) {
	for (const wrapper of bundleWrappers) {
		await wrapper.generate()
	}
}

function log(...args) {
	console.log.apply(console.log, args)
	logStream.write(args.join(" ") + "\n")
}
