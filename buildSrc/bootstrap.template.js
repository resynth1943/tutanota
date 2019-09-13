window.hotReload = () => {
	for (let [name] of System.entries()) {
		System.delete(name)
	}
	import('./app.js')
}
window.hotReload()
