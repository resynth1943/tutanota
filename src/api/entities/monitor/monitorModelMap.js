//@flow
const map: {[string]: () => Promise<{_TypeModel: any}>} = {
	ReadCounterData: () => import('./ReadCounterData'),
	ReadCounterReturn: () => import('./ReadCounterReturn')
}
export default map