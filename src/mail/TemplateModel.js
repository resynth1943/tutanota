

class TemplateModel {

	_listeners: Array<()=>void>

	addTemplate() {
// add

		// 
		this._listeners.forEach( listener => listener())
	}

	removeTemplate(){
		// remove

		// notify listeners
		this._listeners.forEach( listener => listener())
	}

	addTemplatesChangeListener( listener:() =>void) {
this._listeners.push(listener)
	}

}