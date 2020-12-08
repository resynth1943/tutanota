// @flow

import type {Language, LanguageCode} from "../misc/LanguageViewModel"
import {lang, languageByCode, languages} from "../misc/LanguageViewModel"
import type {EmailTemplateContent} from "../api/entities/tutanota/EmailTemplateContent"
import type {EmailTemplate} from "../api/entities/tutanota/EmailTemplate"
import {createEmailTemplateContent} from "../api/entities/tutanota/EmailTemplateContent"
import {Dialog} from "../gui/base/Dialog"
import {downcast} from "../api/common/utils/Utils"

export class TemplateEditorModel {
	_allLanguages: Array<Language>
	_addedLanguages: Array<Language>

	constructor() {
		this._allLanguages = []
		this._addedLanguages = []
		this.initAllLanguages()
	}

	initAllLanguages() {
		languages.forEach(language => {
			this._allLanguages.push(language)
		})
	}

	initAddedLanguages(contents: EmailTemplateContent[]) {
		for (const templateContents of contents) {
			this._addedLanguages.push(languageByCode[getLanguageCode(templateContents)])
		}
	}

	pushToAddedLanguages(language: Language) {
		this._addedLanguages.push(language)
	}

	reorganizeLanguages(): Array<Object> { // sorts the languages, removes added languages from additional languages and then returns it
		const sortedArray = this._allLanguages.map((l) => {
			return {name: lang.get(l.textId), value: l.code}
		})
		sortedArray.sort(function (a, b) { // Sort
			var textA = a.name.toUpperCase();
			var textB = b.name.toUpperCase();
			return (textA < textB) ? -1 : (textA > textB) ? 1 : 0
		})
		let j
		for (j = 0; j < this._addedLanguages.length; j++) {
			let k
			for (k = 0; k < sortedArray.length; k++) {
				if (sortedArray[k].value === this._addedLanguages[j].code) {
					sortedArray.splice(k, 1)
				}
			}
		}
		return sortedArray
	}

	removeLanguageFromTemplate(languageCode: LanguageCode, template: EmailTemplate): void {
		for (let i = 0; i < template.contents.length; i++) {
			let contentLangCode = template.contents[i].languageCode
			if (contentLangCode === languageCode) {
				template.contents.splice(i, 1)
				return
			}
		}
	}

	removeLanguageFromAddedLanguages(languageCode: LanguageCode) {
		this._addedLanguages.splice(this._findIndex(languageCode), 1)
	}

	_findIndex(languageCode: LanguageCode): number { // temporary fix
		let i
		for (i = 0; i < this._addedLanguages.length; i++) {
			if (this._addedLanguages[i].code === languageCode) {
				return i
			}
		}
		return -1
	}

	getAddedLanguages(): Array<Language> {
		return this._addedLanguages
	}

	getContentFromLanguage(languageCode: LanguageCode, template: EmailTemplate): string { // returns the value of the content as string
		for (const content of template.contents) {
			if (content.languageCode === languageCode) {
				return content.text
			}
		}
		return ""
	}

	saveLanguageContent(editorValue: string, template: EmailTemplate, languageCode: LanguageCode) {
		const emailTemplateContent = this._getEmailTemplateContent(template, languageCode) // calls function
		emailTemplateContent.text = editorValue // sets new content
	}

	_getEmailTemplateContent(template: EmailTemplate, languageCode: LanguageCode): EmailTemplateContent { // return EmailTemplateContent of current selected Language or creates a new one
		for (const content of template.contents) { // Checks if content for the current language already exists and returns if true
			if (content.languageCode === languageCode) {
				return content
			}
		}
		const content = createEmailTemplateContent({languageCode: languageCode}) // create a new EmailTemplateContent if it doesn't exist for the selected Language
		template.contents.push(content)
		return content
	}

	getTranslatedLanguage(code: LanguageCode): string {
		return lang.get(languageByCode[code].textId)
	}

	isLanguageInContent(languageCode: LanguageCode, template: EmailTemplate): boolean { // checks if passed Language is in content of selected Template
		for (const templateContent of template.contents) {
			if (templateContent.languageCode === languageCode) {
				return true
			}
		}
		return false
	}

	hasContent(template: EmailTemplate): boolean {
		let content
		let languageCode
		let hasContent
		for (const languageContent of template.contents) {
			content = languageContent.text
			languageCode = getLanguageCode(languageContent)
			hasContent = !!content.replace(/(<([^>]+)>)/ig, "").length
			if (!hasContent) {
				Dialog.error(() => lang.get("languageContentEmpty_msg", {"{language}": this.getTranslatedLanguage(languageCode)}))
				return false
			}
		}

		return true
	}
}

export function getLanguageCode(content: EmailTemplateContent): LanguageCode {
	return downcast(content.languageCode)
}