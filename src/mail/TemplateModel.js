// @flow

import m from "mithril"
import type {LanguageCode} from "../misc/LanguageViewModel"
import {lang} from "../misc/LanguageViewModel"
import {searchForTag, searchInContent} from "./TemplateSearchFilter"
import {downcast, neverNull} from "../api/common/utils/Utils"
import type {NavAction} from "./TemplatePopup"
import {SELECT_NEXT_TEMPLATE} from "./TemplatePopup"
import type {EmailTemplate} from "../api/entities/tutanota/EmailTemplate"
import {locator} from "../api/main/MainLocator"
import {EmailTemplateTypeRef} from "../api/entities/tutanota/EmailTemplate"

export type Template = {
	_id: IdTuple;
	title: string,
	tag: ?string,
	content: {[language: LanguageCode]: string},
	index: number,
}

/*
*   Model that holds main logic for the Template Feature.
*   Handles things like returning the selected Template, selecting Templates, indexes, scrolling.
*/

export class TemplateModel {
	_allTemplates: Array<EmailTemplate>
	_searchResults: Array<EmailTemplate>
	_selectedTemplate: ?EmailTemplate
	_selectedLanguage: LanguageCode
	_templateListId: Id
	_hasLoaded: boolean

	constructor() {
		this._selectedLanguage = downcast(lang.code)
		this._allTemplates = []
		this._searchResults = []
		this._selectedTemplate = null
		this._hasLoaded = false
	}

	init(): Promise<void> {
		return loadTemplates().then(templates => {
			this._allTemplates = templates
			this._searchResults = this._allTemplates
			m.redraw()
			this._hasLoaded = true
			this.setSelectedTemplate(this.containsResult() ? this._searchResults[0] : null) // needs to be called, because otherwise the selection would be null, even when templates are loaded. (fixes bug)
		})
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

	isSelectedTemplate(template: EmailTemplate): boolean {
		return (this._selectedTemplate === template)
	}

	_updateSelectedLanguage() {
		if (this._selectedTemplate && this._searchResults.length) {
			let clientLanguage = lang.code
			this._selectedLanguage = this._isLanguageInContent(clientLanguage) ? clientLanguage : downcast(neverNull(this._selectedTemplate).contents[0].languageCode)
		}
	}

	getSearchResults(): Array<EmailTemplate> {
		return this._searchResults
	}

	getSelectedLanguage(): LanguageCode {
		return this._selectedLanguage
	}

	getSelectedTemplate(): ?EmailTemplate {
		return this._selectedTemplate
	}

	hasLoaded(): boolean {
		return this._hasLoaded
	}

	getSelectedTemplateIndex(): number {
		return this._searchResults.indexOf(this._selectedTemplate)
	}

	setSelectedLanguage(lang: LanguageCode) { // call function to globally set a language
		this._selectedLanguage = lang
	}

	setSelectedTemplate(template: ?EmailTemplate) { // call function to globally set a Template
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
		this._selectedLanguage = this._isLanguageInContent(language) ? language : downcast(neverNull(this._selectedTemplate).contents[0].languageCode)
	}

	_isLanguageInContent(languageCode: LanguageCode): boolean { // returns true if passed language is within the contents of the currently selected Template
		if (this._selectedTemplate) {
			for (const templateContent of this._selectedTemplate.contents) {
				if (templateContent.languageCode === languageCode) {
					return true
				}
			}
		}
		return false
	}

	getContentFromLanguage(languageCode: LanguageCode): string { // returns the value of the content as string
		if (this._selectedTemplate) {
			for (const content of this._selectedTemplate.contents) {
				if (content.languageCode === languageCode) {
					return content.text
				}
			}
		}
		return ""
	}

}

export const templateModel: TemplateModel = new TemplateModel()

function loadTemplates(): Promise<Array<EmailTemplate>> {
	return locator.mailModel.getUserMailboxDetails().then(details => {
		if (details.mailbox.templates) {
			const listId = details.mailbox.templates.list
			const entityClient = locator.entityClient
			return entityClient.loadAll(EmailTemplateTypeRef, listId)
		} else {
			return Promise.resolve([])
		}
	})
}