import * as SystemConfig from "./SystemConfig.js"
import pluginBabel from "@rollup/plugin-babel"
import commonjs from "@rollup/plugin-commonjs"
import path from "path"
import Promise from "bluebird"
import fs from "fs-extra"

const {babel} = pluginBabel

function resolveLibs(baseDir = ".") {
	return {
		name: "resolve-libs",
		resolveId(source) {
			const resolved = SystemConfig.dependencyMap[source]
			return resolved && path.join(baseDir, resolved)
		}
	}
}

function rollupDebugPlugins(baseDir) {
	return [
		babel({
			plugins: [
				// Using Flow plugin and not preset to run before class-properties and avoid generating strange property code
				"@babel/plugin-transform-flow-strip-types",
				"@babel/plugin-proposal-class-properties",
				"@babel/plugin-syntax-dynamic-import"
			],
			inputSourceMap: false,
		}),
		resolveLibs(baseDir),
		commonjs({
			exclude: ["src/**"],
			ignore: ["util"]
		}),
	]
}

export default {
	input: ["src/app.js", "src/api/worker/WorkerImpl.js"],
	plugins: rollupDebugPlugins(path.resolve(".")),
	treeshake: false, // disable tree-shaking for faster development builds
	output: {format: "es", sourceMap: true, dir: "build"},
}

export function writeNollupBundle(generatedBundle) {
	return Promise.map(generatedBundle.output, (o) => fs.writeFile(path.join("build", o.fileName), o.code))
}