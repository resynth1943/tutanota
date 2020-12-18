// bluebird must be imported here by the build script
// dynamicImport must be declared here by the build script

self.Promise = Promise.config({
	longStackTraces: false,
	warnings: false
})

/**
 * Receives the first message from the client and initializes the WorkerImpl to receive all future messages. Sends a response to the client on this first message.
 */
self.onmessage = function (msg) {
	const data = msg.data
	if (data.type === 'setup') {
		self.env = data.args[0]
		Promise.resolve()
		       .then(() => {
			       dynamicImport("./WorkerImpl.js").then((workerModule) => {
				       const initialRandomizerEntropy = data.args[1]
				       const browserData = data.args[2]
				       if (initialRandomizerEntropy == null || browserData == null) {
					       throw new Error("Invalid Worker arguments")
				       }
				       let workerImpl = new workerModule.WorkerImpl(typeof self !== 'undefined' ? self : null, browserData)
				       workerImpl.addEntropy(initialRandomizerEntropy)
				       self.postMessage({id: data.id, type: 'response', value: {}})
			       })
		       })
		       .catch(e => {
			       self.postMessage({
				       id: data.id, type: 'error', error: JSON.stringify({
					       name: "Error",
					       message: e.message,
					       stack: e.stack
				       })
			       })
		       })
	} else {
		throw new Error("worker not yet ready")
	}
}
