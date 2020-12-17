import options from "commander"
import fs from "fs-extra"
import {spawn, execFileSync} from "child_process"
import {createConnection} from "net"
import flow from "flow-bin"

let opts
options
	.usage('[options] [test|prod|local|host <url>], "local" is default')
	.arguments('[stage] [host]')
	.option('-c, --clean', 'Clean build directory')
	.option('-w, --watch', 'Watch build dir and rebuild if necessary')
	.option('-d, --desktop', 'assemble & start desktop client')
	.action(function (stage, host) {
		opts = options.opts()
		if (!["test", "prod", "local", "host", undefined].includes(stage)
			|| (stage !== "host" && host)
			|| (stage === "host" && !host)) {
			options.outputHelp()
			process.exit(1)
		}
		opts.stage = stage || "local"
		opts.host = host
	})
	.parse(process.argv)

spawn(flow, {stdio: "inherit"})

function connect(restart, attempt = 0) {
	const client = createConnection("/tmp/buildServer")
		.on("connect", () => {
			console.log("Connected to the build server")
			if (restart) {
				console.log("Restarting the build server!")
				client.write("clean")
				setTimeout(() => connect(false, 0), 2000)
			} else {
				client.write(JSON.stringify(opts))
			}
		})
		.on("data", (data) => {
			const msg = data.toString()
			console.log("server:", msg)
			if (msg === "ok") {
				console.log("build completed")
				if (opts.desktop) {
					// we don't want to quit here because we want to keep piping output to our stdout.
					spawn("./start-desktop.sh", {stdio: "inherit"})
				} else {
					process.exit(1)
				}
			} else if (msg === "err") {
				process.exit(1)
			}
		})
		.on("error", (e) => {
			if (attempt > 2) {
				console.error("Failed to start build server")
				process.exit(1)
			}
			console.log("Starting build server")
			spawn(process.argv[0], ["./buildSrc/BuildServer.js"], {detached: true, cwd: process.cwd()})
			console.log("Started build server")
			setTimeout(() => connect(false, attempt + 1), 500)
		})
}

connect(options.clean)

if (options.clean) {
	console.log("cleaning build dir")
	fs.emptyDir("build")
}