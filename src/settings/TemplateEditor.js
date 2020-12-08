// @flow
import m from "mithril"
import {HtmlEditor} from "../gui/base/HtmlEditor"
import stream from "mithril/stream/stream.js"
import {assertNotNull, downcast, neverNull, noOp} from "../api/common/utils/Utils"
import type {TextFieldAttrs} from "../gui/base/TextFieldN"
import {TextFieldN} from "../gui/base/TextFieldN"
import type {DialogHeaderBarAttrs} from "../gui/base/DialogHeaderBar"
import type {ButtonAttrs} from "../gui/base/ButtonN"
import {ButtonN, ButtonType} from "../gui/base/ButtonN"
import {Dialog} from "../gui/base/Dialog"
import {Icons} from "../gui/base/icons/Icons"
import {createDropdown} from "../gui/base/DropdownN"
import {DropDownSelector} from "../gui/base/DropDownSelector"
import {lang, languageByCode} from "../misc/LanguageViewModel"
import type {Language, LanguageCode} from "../misc/LanguageViewModel"
import {createEmailTemplate} from "../api/entities/tutanota/EmailTemplate"
import {clone} from "../api/common/utils/Utils"
import type {EmailTemplate} from "../api/entities/tutanota/EmailTemplate"
import type {EmailTemplateContent} from "../api/entities/tutanota/EmailTemplateContent"
import {createEmailTemplateContent} from "../api/entities/tutanota/EmailTemplateContent"
import {NotFoundError} from "../api/common/error/RestError"
import {EntityClient} from "../api/common/EntityClient"
import {TemplateEditorModel} from "./TemplateEditorModel"

/*
	Creates an Editor Popup in which you can create a new template or edit an existing one
*/

export class TemplateEditor { // TODO: Move to templateEditorModel
	template: EmailTemplate
	view: Function
	_templateContentEditor: HtmlEditor
	_templateTag: Stream<string>
	_templateTitle: Stream<string>
	_selectedLanguage: Stream<LanguageCode>
	_dialog: Dialog
	_entityClient: EntityClient
	_templateListId: Id
	_ownerGroup: Id
	_editorModel: TemplateEditorModel


	constructor(template: ?EmailTemplate, templateListId: Id, ownerGroup: Id, entityClient: EntityClient) {
		this._editorModel = new TemplateEditorModel()
		this.template = template ? clone(template) : createEmailTemplate()

		this._templateTitle = stream("")
		this._templateTag = stream("")
		this._selectedLanguage = stream()
		this._entityClient = entityClient
		this._templateListId = templateListId
		this._ownerGroup = ownerGroup

		this._templateContentEditor = new HtmlEditor("content_label", {enabled: true})
			.showBorders()
			.setMinHeight(500)

		this._initValues()

		// Initialize Attributes for TextFields and Buttons
		const titleAttrs: TextFieldAttrs = {
			label: "title_label",
			value: this._templateTitle
		}

		const tagAttrs: TextFieldAttrs = {
			label: "tag_label",
			value: this._templateTag
		}

		const languageAttrs: TextFieldAttrs = {
			label: "language_label",
			value: this._selectedLanguage.map((code) => this._editorModel.getTranslatedLanguage(code)),
			injectionsRight: () => [
				this._editorModel.getAddedLanguages().length > 1 ? m(ButtonN, removeButtonAttrs) : null,
				m(ButtonN, languageButtonAttrs)
			],
			disabled: true
		}

		const languageButtonAttrs: ButtonAttrs = {
			label: "languages_label",
			type: ButtonType.Action,
			icon: () => Icons.More,
			click: createDropdown(() => {
				let additionalLanguages = this._editorModel.reorganizeLanguages()
				let buttons = []
				for (let addedLanguage of this._editorModel.getAddedLanguages()) {
					let tempTranslatedLanguage = lang.get(addedLanguage.textId)
					buttons.push({
						label: () => tempTranslatedLanguage,
						click: () => {
							this._editorModel.saveLanguageContent(this._templateContentEditor.getValue(), this.template, this._selectedLanguage()) // needs to be called before .setValue, because otherwise it will set Editor value for wrong language
							this._templateContentEditor.setValue(this._editorModel.getContentFromLanguage(addedLanguage.code, this.template))
							this._selectedLanguage(addedLanguage.code)
						},
						type: ButtonType.Dropdown
					})
				}
				buttons.push({
					label: "addLanguage_action",
					click: () => {
						let newLanguageCode: Stream<LanguageCode> = stream(additionalLanguages[0].value)
						let dropDownSelector = new DropDownSelector("addLanguage_action", null, additionalLanguages, newLanguageCode, 250) // dropdown with all additional languages
						let addLanguageOkAction = (dialog) => {
							this._editorModel.saveLanguageContent(this._templateContentEditor.getValue(), this.template, this._selectedLanguage()) // same as line 101
							this._selectedLanguage(newLanguageCode())
							this._editorModel.pushToAddedLanguages(languageByCode[newLanguageCode()])
							this._templateContentEditor.setValue("")
							dialog.close()
						}

						Dialog.showActionDialog({
							title: lang.get("addLanguage_action"),
							child: {view: () => m(dropDownSelector)},
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
			label: "removeLanguage_action",
			icon: () => Icons.Trash,
			Type: ButtonType.Action,
			click: () => {
				return Dialog.confirm(() => lang.get("deleteLanguageConfirmation_msg", {"{language}": this._editorModel.getTranslatedLanguage(this._selectedLanguage())})).then((confirmed) => {
					if (confirmed) {
						this._editorModel.removeLanguageFromTemplate(this._selectedLanguage(), this.template)
						this._editorModel.removeLanguageFromAddedLanguages(this._selectedLanguage())
						this._selectedLanguage(this._editorModel.getAddedLanguages()[0].code)
						this._templateContentEditor.setValue(this._editorModel.getContentFromLanguage(this._selectedLanguage(), this.template))
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

		let dialogCloseAction = () => { // comment for ourselves: this can just be closed since we aren't saving anything temporarily anymore.
			this._close()
		}

		let headerBarAttrs: DialogHeaderBarAttrs = {
			left: [{label: 'cancel_action', click: dialogCloseAction, type: ButtonType.Secondary}],
			right: [{label: 'save_action', click: () => this._save(), type: ButtonType.Primary}],
			middle: () => lang.get(this.template._id ? "editTemplate_action" : "createTemplate_action")
		}
		this._dialog = Dialog.largeDialog(headerBarAttrs, this)
		this._dialog.show()
	}

	_initValues() { // Selected language get, push to added, set editor values
		const clientLanguageCode = lang.code
		if (this.template._id) {
			// push to added languages
			this._editorModel.initAddedLanguages(this.template.contents)
			// init selected Language
			this._selectedLanguage(this._editorModel.isLanguageInContent(clientLanguageCode, this.template) ? clientLanguageCode : this._editorModel.getAddedLanguages()[0].code)
			// set editor values
			this._templateTitle(this.template.title)
			this._templateTag(this.template.tag || "")
			const content = assertNotNull(this.template.contents.find(templateContent =>
				templateContent.languageCode === this._selectedLanguage()))
				.text
			this._templateContentEditor.setValue(content)
		} else { // if it's a new template set the default language
			this._editorModel.pushToAddedLanguages(languageByCode[clientLanguageCode])
			this._selectedLanguage(clientLanguageCode)
		}
	}

	_save(): void {
		this._editorModel.saveLanguageContent(this._templateContentEditor.getValue(), this.template, this._selectedLanguage()) // we have to call this function to make sure the content is saved when language isn't changed
		if (!this._templateTitle()) { // before saving, check if title or content is empty
			Dialog.error("emptyTitle_msg")
			return
		}
		if (!this._editorModel.hasContent(this.template)) {
			// Error Message is in _hasContent() because language check happens there
			return
		}
		this.template.title = this._templateTitle()
		this.template.tag = this._templateTag()

		let promise
		if (this.template._id) {
			promise = this._entityClient.update(this.template)
			              .catch(NotFoundError, noOp)
		} else {
			// set ownerGroup
			this.template._ownerGroup = neverNull(this._ownerGroup)
			promise = this._entityClient.setup(this._templateListId, this.template).then(templateId => {
				console.log("success template created" + templateId)
			})
		}
		promise.then(() => this._close())
	}

	_close(): void {
		this._dialog.close()
	}
}