// @flow

import type {LanguageCode} from "../misc/LanguageViewModel"
import {lang} from "../misc/LanguageViewModel"
import {searchForTag, searchInContent} from "./TemplateSearchFilter"
import {LazyLoaded} from "../api/common/utils/LazyLoaded"
import {assertNotNull, downcast, neverNull} from "../api/common/utils/Utils"
import type {NavAction} from "./TemplatePopup"
import {SELECT_NEXT_TEMPLATE} from "./TemplatePopup"

export type Template = {
	_id: IdTuple;
	title: string,
	tag: ?string,
	content: {[language: LanguageCode]: string},
	index: number,
}

/*
*   Model that holds main logic for the Template Feature.
*   Handles things like returning the selected Template, selecting Templates, Indexes, scrolling.
*/

export class TemplateModel {
	_allTemplates: Array<Template>
	_searchResults: Array<Template>
	_selectedTemplate: ?Template
	_selectedLanguage: LanguageCode
	_lazyLoadedTemplates: LazyLoaded<void>

	constructor() {
		this._selectedLanguage = downcast(lang.code)
		this._allTemplates = []
		this._searchResults = []
		this._selectedTemplate = null
		this._lazyLoadedTemplates = new LazyLoaded(() => {
			this._allTemplates = loadTemplates()
			this._searchResults = this._allTemplates
			return Promise.resolve()
		})
	}

	init(): Promise<void> {
		return this._lazyLoadedTemplates.getAsync()
	}

	search(text: string): void {
		if (text === "") {
			this._searchResults = this._allTemplates
		} else if (text.charAt(0) === "#") {
			this._searchResults = searchForTag(text, this._allTemplates)
		} else {
			this._searchResults = searchInContent(text, this._allTemplates)
		}
		this.setSelectedTemplate(this.containsResult() ? this._searchResults[0] : null)
	}

	containsResult(): boolean {
		return this._searchResults.length > 0
	}

	isSelectedTemplate(template: Template): boolean {
		return (this._selectedTemplate === template)
	}

	_updateSelectedLanguage() {
		if (this._selectedTemplate && this._searchResults.length) {
			let clientLanguage = lang.code
			this._selectedLanguage = this._isLanguageInContent(clientLanguage) ? clientLanguage : Object.keys(neverNull(this._selectedTemplate).content)[0]
		}
	}

	getSearchResults(): Array<Template> {
		return this._searchResults
	}

	getSelectedLanguage(): LanguageCode {
		return this._selectedLanguage
	}

	getSelectedTemplate(): ?Template {
		return this._selectedTemplate
	}

	getSelectedTemplateIndex(): number {
		return this._searchResults.indexOf(this._selectedTemplate)
	}

	setSelectedLanguage(lang: LanguageCode) { // call function to globally set a language
		this._selectedLanguage = lang
	}

	setSelectedTemplate(template: ?Template) { // call function to globally set a Template
		this._selectedTemplate = template
		this._updateSelectedLanguage()
	}

	selectNextTemplate(action: NavAction): boolean { // returns true if selection is changed
		const selectedIndex = this.getSelectedTemplateIndex()
		const nextIndex = selectedIndex + (action === SELECT_NEXT_TEMPLATE ? 1 : -1)
		if (nextIndex >= 0 && nextIndex < this._searchResults.length) {
			const nextSelectedTemplate = this._searchResults[nextIndex]
			this.setSelectedTemplate(nextSelectedTemplate)
			return true
		}
		return false
	}

	_chooseLanguage(language: LanguageCode) {
		this._selectedLanguage = this._isLanguageInContent(language) ? language : Object.keys(neverNull(this._selectedTemplate).content)[0]
	}

	_isLanguageInContent(language: LanguageCode): boolean { // returns true if passed language is within the contents of the currently selected Template
		return Object.keys(neverNull(this._selectedTemplate).content).includes(language);
	}

	saveTemplate() {

	}
}

export const templateModel: TemplateModel = new TemplateModel()

export function loadTemplates(): Array<Template> {
	if (localStorage.getItem("Templates") !== null) {
		const parsedTemplates = JSON.parse(assertNotNull(localStorage.getItem("Templates"))) // Global variable that represents current Localstorage Array
		if (parsedTemplates instanceof Array) {
			return parsedTemplates.map((storedTemplate, index) => createTemplate(storedTemplate.title, storedTemplate.tag, storedTemplate.content, index))
		} else {
			return []
		}
	} else {
		return []
	}
}

export function createTemplate(title: string, tag: string, content: {[LanguageCode]: string}, index: number): Template { // function to create a Template with passed data
	return {
		_id: ["localstorage", title], // TODO: should be replaced to real list id when stored as list in database
		title: title,
		tag: tag,
		content: content,
		index: index
	}
}



