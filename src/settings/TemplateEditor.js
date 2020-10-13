// @flow

import {HtmlEditor} from "../gui/base/HtmlEditor"
import stream from "mithril/stream/stream.js"
import {neverNull} from "../api/common/utils/Utils"
import type {TextFieldAttrs} from "../gui/base/TextFieldN"
import {TextFieldN} from "../gui/base/TextFieldN"
import m from "mithril"
import type {DialogHeaderBarAttrs} from "../gui/base/DialogHeaderBar"
import type {ButtonAttrs} from "../gui/base/ButtonN"
import {ButtonN, ButtonType} from "../gui/base/ButtonN"
import {Dialog} from "../gui/base/Dialog"
import type {Template} from "./TemplateListView"
import {createTemplate} from "./TemplateListView"
import type {EntityEventsListener} from "../api/main/EventController"
import {elementIdPart, listIdPart} from "../api/common/EntityFunctions"
import {OperationType} from "../api/common/TutanotaConstants"
import {Icons} from "../gui/base/icons/Icons"
import {createDropdown} from "../gui/base/DropdownN"
import {DropDownSelector} from "../gui/base/DropDownSelector"
import {lang, languages} from "../misc/LanguageViewModel"

export class TemplateEditor {
	_templateContentEditor: HtmlEditor
	_templateTag: Stream<string>
	_templateTitle: Stream<string>
	_templateContents: Stream<string>
	_selectedLanguage: Stream<string>
	_dialog: Dialog
	newTemplate: Template
	_selectedValue: Stream<string> = stream("Test")
	_allLanguages: string[]
	view: Function
	_languageContent: {string: string}
	_addedLanguages: string[]

	constructor(keyList: Array<Template>, template: ?Template, entityUpdate: EntityEventsListener) {
		this._templateTitle = stream("")
		this._templateTag = stream("")
		this._templateContents = stream("")
		this._selectedLanguage = stream("")
		this._allLanguages = []
		this._initLanguages()
		this._languageContent = {}
		this._addedLanguages = []

		this._templateContentEditor = new HtmlEditor(() => "Content", {enabled: true})
			.showBorders()
			.setMinHeight(500)

		if (template) {
			this._templateTitle(neverNull(template).title)
			this._templateTag(neverNull(template).tag || "")
			this._templateContents(neverNull(template).content[this._selectedLanguage()])
			Object.keys(template.content).map(language => {
				this._addedLanguages.push(language)
			})
			for (const [key, value] of Object.entries(template.content)) {
				this._languageContent[key] = value
			}
			this._templateContentEditor.setValue(template.content[this._addedLanguages[0]])
		} else {
			this._addedLanguages.push("English") // replace with default language
			this._templateContentEditor.setValue("")
		}
		this._selectedLanguage(this._addedLanguages[0])

		const titleAttrs: TextFieldAttrs = {
			label: () => "Title",
			value: this._templateTitle
		}

		const tagAttrs: TextFieldAttrs = {
			label: () => "Tag",
			value: this._templateTag
		}

		const languageAttrs: TextFieldAttrs = {
			label: () => "Language",
			value: this._selectedLanguage,
			injectionsRight: () => [
				this._addedLanguages.length > 1 ? m(ButtonN, removeButtonAttrs) : null,
				m(ButtonN, languageButtonAttrs)
			],
			disabled: true
		}

		const languageButtonAttrs: ButtonAttrs = {
			label: () => "More",
			type: ButtonType.Action,
			icon: () => Icons.More,
			click: createDropdown(() => {
				template ? template.content[this._selectedLanguage()] = this._templateContentEditor.getValue() : this._languageContent[this._selectedLanguage()] = this._templateContentEditor.getValue()
				let toSortLanguages = this._reorganizeLanguages()
				let buttons = []
				let i
				for (i = 0; i < this._addedLanguages.length; i++) {
					let temp = this._addedLanguages[i]
					buttons.push({
						label: () => temp,
						click: () => {
							template ? this._templateContentEditor.setValue(template.content[temp]) : this._templateContentEditor.setValue(this._languageContent[temp])
							this._languageContent[this._selectedLanguage()] = this._templateContentEditor.getValue()
							this._selectedLanguage(temp)
							console.log("temp: ", temp, "LanguageContent: ", this._languageContent)
						},
						type: ButtonType.Dropdown
					})
				}
				buttons.push({
					label: () => "Add Language",
					click: () => {
						let newLanguageCode: Stream<string> = stream(toSortLanguages[0].value)
						let tagName = new DropDownSelector("addLanguage_action", null, toSortLanguages, newLanguageCode, 250)
						let addLanguageOkAction = (dialog) => {
							this._languageContent[this._selectedLanguage()] = this._templateContentEditor.getValue()
							this._selectedLanguage(newLanguageCode())
							this._addedLanguages.push(newLanguageCode())
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
			label: () => "Remove language",
			icon: () => Icons.Trash,
			Type: ButtonType.Action,
			click: () => {

				return Dialog.confirm(() => lang.get("deleteLanguageConfirmation_msg", {"{language}" : this._selectedLanguage()})).then((confirmed) => {
					if (confirmed) {
						delete this._languageContent[this._selectedLanguage()]
						this._addedLanguages.splice(this._addedLanguages.indexOf(this._selectedLanguage()), 1)
						this._selectedLanguage(this._addedLanguages[0])
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

		let dialogOkAction = () => {
			this._templateContents(this._templateContentEditor.getValue())
			if (!this._templateTitle()) {
				Dialog.error(() => "Title is empty!")
				return
			}

			if (!template) {
				this._languageContent[this._selectedLanguage()] = this._templateContentEditor.getValue()
				const hasContent = this._checkContent()
				if(!hasContent){return}
				this.newTemplate = createTemplate(this._templateTitle(), this._templateTag(), this._languageContent, keyList.length)
				keyList.push(this.newTemplate)
				localStorage.setItem("Templates", JSON.stringify(keyList))
				entityUpdate([
					{
						application: "tutanota",
						type: "template",
						instanceListId: listIdPart(this.newTemplate._id),
						instanceId: elementIdPart(this.newTemplate._id),
						operation: OperationType.CREATE
					}
				], "fake-owner-id")

			} else {
				template.content[this._selectedLanguage()] = this._templateContentEditor.getValue()
				this._languageContent[this._selectedLanguage()] = this._templateContentEditor.getValue()
				const hasContent = this._checkContent()
				if(!hasContent){return}
				console.log("selected Language", this._selectedLanguage(), "content:", this._templateContentEditor.getValue())
				keyList[(template.index)].title = this._templateTitle()
				keyList[(template.index)].tag = this._templateTag()
				keyList[(template.index)].content = this._languageContent
				localStorage.setItem("Templates", JSON.stringify(keyList))
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
			template ? template.content = keyList[template.index].content : null
			this._dialog.close()
		}

		let headerBarAttrs: DialogHeaderBarAttrs = {
			left: [{label: 'cancel_action', click: dialogCloseAction, type: ButtonType.Secondary}],
			right: [{label: 'save_action', click: dialogOkAction, type: ButtonType.Primary}],
			middle: template ? () => "Edit Template" : () => "Create Template"
		}
		this._dialog = Dialog.largeDialog(headerBarAttrs, this)
		this._dialog.show()
	}

	_checkContent(): boolean {
		const regex = /(<([^>]+)>)/ig
		const contentArr = Object.entries(this._languageContent)
		for (let i = 0; i < contentArr.length; i++) {
			let content = String(contentArr[i][1])
			const langErr = contentArr[i][0]
			const hasContent = !!content.replace(regex, "").length
			if (!hasContent) {
				Dialog.error(() => lang.get("languageContentEmpty_label", {"{language}" : langErr}))
				return false
			}
		}
		return true
	}

	_initLanguages() {
		languages.map(language => {
			this._allLanguages.push(lang.get(language.textId))
		})
	}

	_reorganizeLanguages(): Array<Object> {
		const sortedArray = this._allLanguages.map((language) => {
			return {name: language, value: language}
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
				if (sortedArray[k].value === this._addedLanguages[j]) {
					sortedArray.splice(k, 1)
				}
			}
		}
		return sortedArray
	}
}

