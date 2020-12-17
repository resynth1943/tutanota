import {createServer} from "net"
import {createWriteStream, unlinkSync} from "fs"
import {build} from "./Builder.js"
import chokidar from "chokidar"

const SOCKETFILE = "/tmp/buildServer"

cleanup()

let bundleWrappers = null
const logStream = createWriteStream("build.log")
const log = (...args) => {
	console.log(args)
	logStream.write(args.join(" ") + "\n")
}

async function generateBundles() {
	for (const wrapper of bundleWrappers) {
		await wrapper.generate()
	}
}

process.on("SIGINT", () => {
	// IDEs tend to send SIGINT to all child processes but we want to keep running
	log("SIGINT received, ignoring")
})

let oldConfig
let watcher
const server = createServer((socket) => {
	const outerLog = log
	socket.on("data", async (data) => {
		const log = (...args) => {
			outerLog(...args)
			socket.write(args.join(" "))
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
				socket.write(`config has changed, rebuilding old: ${JSON.stringify(oldConfig)}, new: ${JSON.stringify(newConfig)}`)
				bundleWrappers = null
			}
			oldConfig = newConfig

			if (bundleWrappers == null) {
				log("initial")
				socket.write("initial build")

				bundleWrappers = await build(newConfig, log)
				await generateBundles()
				socket.write("ok")
				watcher && watcher.close()
				watcher = chokidar.watch("src", {
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
				socket.write("generating")
				await generateBundles()
				socket.write("ok")
			}
		} catch (e) {
			socket.write("err: " + String(e))
		}
	})
}).listen(SOCKETFILE)
  .on("connection", () => {
	  log("connection")
  })
  .on("close", () => {
	  log("server closed")
	  cleanup()
  })

log("server listening")

function closeServer() {
	server.close(() => process.exit(0))
}

function cleanup() {
	try {
		unlinkSync(SOCKETFILE)
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