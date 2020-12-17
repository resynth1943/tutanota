import Promise from "bluebird"
import child_process from "child_process"
import {buildWithServer} from "../buildSrc/BuildServerClient.js"

// TODO: support changing projects

let project
if (process.argv.indexOf("api") !== -1) {
	project = "api"
} else if (process.argv.indexOf("client") !== -1) {
	project = "client"
} else {
	console.error("must provide 'api' or 'client' to run the tests")
	process.exit(1)
}

buildWithServer({
	clean: false,
	builder: "../test/TestBuilder.js",
	watchFolder: "../test",
	socketPath: "/tmp/testBuildServer",
	buildOpts: {project}
}).then(
	async () => {
		console.log("build finished!")
		const code = await runTest()
		process.exit(code)
	},
	(e) => {
		console.error("Build failed", e)
		process.exit(1)
	}
)


function runTest() {
	return new Promise((resolve) => {
		let testRunner = child_process.fork(`../build/test/bootstrapTests.js`)
		testRunner.on('exit', (code) => {
			resolve(code)
		})
	})
}