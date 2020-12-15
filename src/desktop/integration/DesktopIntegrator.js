// @flow

import type {WindowManager} from "../DesktopWindowManager"

let platformIntegrator: Promise<{
	enableAutoLaunch: ()=>Promise<void>,
	disableAutoLaunch: ()=>Promise<void>,
	isAutoLaunchEnabled: ()=>Promise<boolean>,
	runIntegration: (wm: WindowManager)=>Promise<void>,
	isIntegrated: ()=>Promise<boolean>,
	integrate: ()=>Promise<void>;
	unintegrate: ()=>Promise<void>;
}>

switch (process.platform) {
	case 'win32':
		platformIntegrator = import('./DesktopIntegratorWin32.js')
		break
	case 'darwin':
		platformIntegrator = import('./DesktopIntegratorDarwin.js')
		break
	case 'linux':
		platformIntegrator = import('./DesktopIntegratorLinux.js')
		break
	default:
		throw new Error('Invalid Platform')
}

export async function enableAutoLaunch(): Promise<void> {
	return (await platformIntegrator).enableAutoLaunch().catch(e => {
		console.log("could not enable auto launch:", e)
	})
}

export async function disableAutoLaunch(): Promise<void> {
	return (await platformIntegrator).disableAutoLaunch().catch(e => {
		console.log("could not disable auto launch:", e)
	})
}

export async function isAutoLaunchEnabled(): Promise<boolean> {
	return (await platformIntegrator).isAutoLaunchEnabled().catch(e => {
		console.error("could not check auto launch status:", e)
		return false
	})
}

export async function runIntegration(wm: WindowManager): Promise<void> {
	return (await platformIntegrator).runIntegration(wm)
}

export async function isIntegrated(): Promise<boolean> {
	return (await platformIntegrator).isIntegrated()
}

export async function integrate(): Promise<void> {
	return (await platformIntegrator).integrate()
}

export async function unintegrate(): Promise<void> {
	return (await platformIntegrator).unintegrate()
}