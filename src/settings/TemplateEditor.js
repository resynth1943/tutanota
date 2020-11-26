// @flow
import {HtmlEditor} from "../gui/base/HtmlEditor"
import stream from "mithril/stream/stream.js"
import {neverNull, typedEntries} from "../api/common/utils/Utils"
import type {TextFieldAttrs} from "../gui/base/TextFieldN"
import {TextFieldN} from "../gui/base/TextFieldN"
import m from "mithril"
import type {DialogHeaderBarAttrs} from "../gui/base/DialogHeaderBar"
import type {ButtonAttrs} from "../gui/base/ButtonN"
import {ButtonN, ButtonType} from "../gui/base/ButtonN"
import {Dialog} from "../gui/base/Dialog"
import type {Template} from "../mail/TemplateModel"
import {createTemplate} from "./TemplateListView"
import type {EntityEventsListener} from "../api/main/EventController"
import {elementIdPart, listIdPart} from "../api/common/EntityFunctions"
import {OperationType} from "../api/common/TutanotaConstants"
import {Icons} from "../gui/base/icons/Icons"
import {createDropdown} from "../gui/base/DropdownN"
import {DropDownSelector} from "../gui/base/DropDownSelector"
import {lang, languageByCode, languages} from "../misc/LanguageViewModel"
import type {Language, LanguageCode} from "../misc/LanguageViewModel"

/*
	Creates an Editor Popup in which you can create a new template or edit an existing one
*/

export class TemplateEditor {
	_templateContentEditor: HtmlEditor
	_templateTag: Stream<string>
	_templateTitle: Stream<string>
	_templateContents: Stream<string>
	_selectedLanguage: Stream<LanguageCode>
	_dialog: Dialog
	newTemplate: Template
	_selectedValue: Stream<string> = stream("Test")
	_allLanguages: Language[]
	view: Function
	_languageContent: {[LanguageCode]: string}
	_addedLanguages: Language[]

	_submitter: (string) => void

	constructor(allImportedTemplates: Array<Template>, template: ?Template, entityUpdate: EntityEventsListener) {
		this._templateTitle = stream("")
		this._templateTag = stream("")
		this._templateContents = stream("")
		this._selectedLanguage = stream()
		this._allLanguages = []
		this._initLanguages()
		this._languageContent = {}
		this._addedLanguages = []

		this._templateContentEditor = new HtmlEditor(() => "Content", {enabled: true})
			.showBorders()
			.setMinHeight(500)
		this._initEditorValues(template)

		// Initialize Attributes for TextFields and Buttons
		const titleAttrs: TextFieldAttrs = {
			label: () => "Title", // TODO: Add TranslationKey
			value: this._templateTitle
		}

		const tagAttrs: TextFieldAttrs = {
			label: () => "Tag", // TODO: Add TranslationKey
			value: this._templateTag
		}

		const languageAttrs: TextFieldAttrs = {
			label: () => "Language", // TODO: Add TranslationKey
			value: this._selectedLanguage.map((code) => this._getTranslatedLanguage(code)),
			injectionsRight: () => [
				this._addedLanguages.length > 1 ? m(ButtonN, removeButtonAttrs) : null,
				m(ButtonN, languageButtonAttrs)
			],
			disabled: true
		}

		const languageButtonAttrs: ButtonAttrs = {
			label: () => "Languages", // TODO: Add TranslationKey
			type: ButtonType.Action,
			icon: () => Icons.More,
			click: createDropdown(() => {
				template ? this._setLanguageContent(template) : this._setLanguageContent()
				let additionalLanguages = this._reorganizeLanguages()
				let buttons = []
				for (let addedLanguage of this._addedLanguages) {
					let tempTranslatedLanguage = lang.get(addedLanguage.textId)
					buttons.push({
						label: () => tempTranslatedLanguage,
						click: () => {
							template ? this._templateContentEditor.setValue(template.content[addedLanguage.code]) : this._templateContentEditor.setValue(this._languageContent[addedLanguage.code])
							this._setLanguageContent()
							this._selectedLanguage(addedLanguage.code)
						},
						type: ButtonType.Dropdown
					})
				}
				buttons.push({
					label: () => "Add Language", // TODO: Add TranslationKey
					click: () => {
						let newLanguageCode: Stream<LanguageCode> = stream(additionalLanguages[0].value)
						let tagName = new DropDownSelector("addLanguage_action", null, additionalLanguages, newLanguageCode, 250)
						let addLanguageOkAction = (dialog) => {
							this._setLanguageContent()
							this._selectedLanguage(newLanguageCode())
							this._addedLanguages.push(languageByCode[newLanguageCode()])
							this._templateContentEditor.setValue("")
							dialog.close()
						}

						Dialog.showActionDialog({
							title: lang.get("addLanguage_action"),
							child: {view: () => m(tagName)},
							allowOkWithReturn: true,
							okAction: addLanguageOkAction
						})
					},
					type: ButtonType.Dropdown
				})
				return buttons
			})
		}

		const removeButtonAttrs: ButtonAttrs = {
			label: () => "Remove language", // TODO: Add TranslationKey
			icon: () => Icons.Trash,
			Type: ButtonType.Action,
			click: () => {

				return Dialog.confirm(() => lang.get("deleteLanguageConfirmation_msg", {"{language}": this._getTranslatedLanguage(this._selectedLanguage())})).then((confirmed) => {
					if (confirmed) {
						delete this._languageContent[this._selectedLanguage()]
						this._addedLanguages.splice(this._addedLanguages.indexOf(this._selectedLanguage()), 1)
						this._selectedLanguage(this._addedLanguages[0].code)
						this._templateContentEditor.setValue(this._languageContent[this._selectedLanguage()])
					}
					return confirmed
				})
			}
		}

		this.view = () => {
			return m("", [
				m(TextFieldN, titleAttrs),
				m(TextFieldN, tagAttrs),
				m(TextFieldN, languageAttrs),
				m(this._templateContentEditor)
			])
		}

		let dialogOkAction = () => { // Dialog action for saving a template
			this._templateContents(this._templateContentEditor.getValue())
			if (!this._templateTitle()) { // check if title or content is empty
				Dialog.error(() => "Title is empty!") // TODO: Add TranslationKey
				return
			}
			this._setLanguageContent()
			const hasContent = this._checkContent()
			if (!hasContent) {
				return
			}

			if (!template) { // if no template exists, create a new one
				this.newTemplate = createTemplate(this._templateTitle(), this._templateTag(), this._languageContent, allImportedTemplates.length)
				allImportedTemplates.push(this.newTemplate)
				localStorage.setItem("Templates", JSON.stringify(allImportedTemplates))
				entityUpdate([
					{
						application: "tutanota",
						type: "template",
						instanceListId: listIdPart(this.newTemplate._id),
						instanceId: elementIdPart(this.newTemplate._id),
						operation: OperationType.CREATE
					}
				], "fake-owner-id")

			} else { // if its an existing template, save new values
				this._writeToLocalstorage(allImportedTemplates, template)
				entityUpdate([
						{
							application: "tutanota",
							type: "template",
							instanceListId: listIdPart(template._id),
							instanceId: elementIdPart(template._id),
							operation: OperationType.UPDATE
						}
					], "fake-owner-id"
				)
			}

			this._dialog.close()
		}

		let dialogCloseAction = () => {
			template ? template.content = allImportedTemplates[template.index].content : null
			this._dialog.close()
		}

		let headerBarAttrs: DialogHeaderBarAttrs = {
			left: [{label: 'cancel_action', click: dialogCloseAction, type: ButtonType.Secondary}],
			right: [{label: 'save_action', click: dialogOkAction, type: ButtonType.Primary}],
			middle: template ? () => "Edit Template" : () => "Create Template" // TODO: Add TranslationKey
		}
		this._dialog = Dialog.largeDialog(headerBarAttrs, this)
		this._dialog.show()
	}

	_setLanguageContent(template?: Template) {
		const getValue = this._templateContentEditor.getValue()
		if (template) {
			template.content[this._selectedLanguage()] = getValue
		}
		this._languageContent[this._selectedLanguage()] = getValue
	}

	_getDefaultLanguage(): ?Language {
		return this._allLanguages.find(t => t.code === "en")
	}

	_writeToLocalstorage(A: Array<Template>, template: Template) {
		A[(template.index)].title = this._templateTitle()
		A[(template.index)].tag = this._templateTag()
		A[(template.index)].content = this._languageContent
		localStorage.setItem("Templates", JSON.stringify(A))
	}

	_checkContent(): boolean {
		let content
		let languageCode
		let hasContent
		const contentArr = typedEntries(this._languageContent)
		for (let i = 0; i < contentArr.length; i++) {
			content = String(contentArr[i][1])
			languageCode = contentArr[i][0]
			hasContent = !!content.replace(/(<([^>]+)>)/ig, "").length
			if (!hasContent) {
				Dialog.error(() => lang.get("languageContentEmpty_label", {"{language}": this._getTranslatedLanguage(languageCode)}))
				return false
			}
		}
		return true
	}

	_initEditorValues(template: ?Template) {
		if (template) {
			this._templateTitle(neverNull(template).title)
			this._templateTag(neverNull(template).tag || "")
			this._templateContents(neverNull(template).content[this._selectedLanguage()])
			Object.keys(template.content).map(language => { // push existing languages of template to added languages
				this._addedLanguages.push(languageByCode[language])
			})
			for (const [key, value] of typedEntries(template.content)) { // store content for each language
				this._languageContent[key] = value
			}
			this._templateContentEditor.setValue(template.content[this._addedLanguages[0].code])
		} else { // if it's a new template set the default language
			const defaultLanguage = this._getDefaultLanguage()
			if (defaultLanguage) {
				this._addedLanguages.push(defaultLanguage)
				this._templateContentEditor.setValue("")
			}
		}
		this._selectedLanguage(this._addedLanguages[0].code)
	}

	_getTranslatedLanguage(code: LanguageCode): string {
		return lang.get(languageByCode[code].textId)
	}

	_initLanguages() {
		languages.forEach(language => {
			this._allLanguages.push(language)
		})
	}

	_reorganizeLanguages(): Array<Object> { // sorts the languages and removes added languages from additional languages
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
}

