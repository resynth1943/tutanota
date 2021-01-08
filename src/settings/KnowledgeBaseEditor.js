// @flow

import m from "mithril"
import type {KnowledgeBaseEntry} from "../api/entities/tutanota/KnowledgeBaseEntry"
import {EntityClient} from "../api/common/EntityClient"
import {createKnowledgeBaseEntry} from "../api/entities/tutanota/KnowledgeBaseEntry"
import stream from "mithril/stream/stream.js"
import {HtmlEditor} from "../gui/base/HtmlEditor"
import type {TextFieldAttrs} from "../gui/base/TextFieldN"
import {ButtonN, ButtonType} from "../gui/base/ButtonN"
import type {ButtonAttrs} from "../gui/base/ButtonN"
import {Icons} from "../gui/base/icons/Icons"
import {KnowledgeBaseEditorModel} from "./KnowledgeBaseEditorModel"
import {clone, downcast, neverNull, noOp} from "../api/common/utils/Utils"
import {TextFieldN} from "../gui/base/TextFieldN"
import type {EmailTemplate} from "../api/entities/tutanota/EmailTemplate"
import type {KnowledgeBaseStep} from "../api/entities/tutanota/KnowledgeBaseStep"
import {createDropdown} from "../gui/base/DropdownN"
import {Dialog} from "../gui/base/Dialog"
import type {DialogHeaderBarAttrs} from "../gui/base/DialogHeaderBar"
import {lang} from "../misc/LanguageViewModel"
import {NotFoundError} from "../api/common/error/RestError"
import {px} from "../gui/size"
import type {KeyPress} from "../misc/KeyManager"
import {EmailTemplateTypeRef} from "../api/entities/tutanota/EmailTemplate"
import {Keys} from "../api/common/TutanotaConstants"

/**
 *  Editor to edit / add a knowledgebase entry
 */

export class KnowledgeBaseEditor {
	_editorModel: KnowledgeBaseEditorModel
	entry: KnowledgeBaseEntry
	_entryTitle: Stream<string>
	_entryKeyword: Stream<string>
	_selectedStep: Stream<KnowledgeBaseStep>
	_selectedTemplate: Stream<?EmailTemplate>
	_entryUseCase: string
	_dialog: Dialog
	_entryContentEditor: HtmlEditor
	_entryUseCaseEditor: HtmlEditor
	view: Function
	+_entityClient: EntityClient
	+_entryListId: Id
	+_ownerGroup: Id

	constructor(entry: ?KnowledgeBaseEntry, entryListId: Id, ownerGroup: Id, entityClient: EntityClient) {
		this._editorModel = new KnowledgeBaseEditorModel()
		this.entry = entry ? clone(entry) : createKnowledgeBaseEntry()

		this._entryTitle = stream("")
		this._entryKeyword = stream("")
		this._entryUseCase = ""
		this._selectedStep = stream()
		this._selectedTemplate = stream(null)
		this._entityClient = entityClient
		this._entryListId = entryListId
		this._ownerGroup = ownerGroup

		this._entryContentEditor = new HtmlEditor("content_label", {enabled: true})
			.showBorders()
			.setMinHeight(500)

		this._entryUseCaseEditor = new HtmlEditor("useCase_label")
			.showBorders()
			.setMinHeight(200)

		this._initValues()

		const titleAttrs: TextFieldAttrs = {
			label: "title_label",
			value: this._entryTitle
		}

		const addKeywordAttrs: ButtonAttrs = {
			label: "addKeyword_action",
			type: ButtonType.Action,
			click: () => {
				this._editorModel.addKeyword(this._entryKeyword())
				this._entryKeyword("")
			},
			icon: () => Icons.Add
		}

		const keywordAttrs: TextFieldAttrs = {
			label: "keywords_label",
			value: this._entryKeyword,
			injectionsRight: () => m(ButtonN, addKeywordAttrs),
			keyHandler: (key: KeyPress) => {
				if (key.keyCode === Keys.RETURN.code) {
					this._editorModel.addKeyword(this._entryKeyword())
					this._entryKeyword("")
					return false
				}
				return true
			}
		}

		const stepButtonAttrs: ButtonAttrs = {
			label: "more_label",
			type: ButtonType.Action,
			icon: () => Icons.More,
			click: createDropdown(() => {
				let buttons
				buttons = this._editorModel.getAddedSteps().map(stepObject => {
					return {
						label: () => lang.get("step_label", {"{stepNumber}": stepObject.stepNumber}),
						click: () => {
							//save current step editor value
							this._editorModel.updateStepContent(this._selectedStep(), this._entryContentEditor.getValue())
							this._editorModel.updateStepTemplate(this._selectedStep(), this._selectedTemplate())
							this._selectedStep(stepObject)
							this._selectedTemplate(this._editorModel.getTemplateFromStep(stepObject))
							//set editor value
							this._entryContentEditor.setValue(stepObject.description)
						},
						type: ButtonType.Dropdown
					}
				})
				buttons.push({
					label: "addStep_action",
					click: () => {
						// save current step editor value
						this._editorModel.updateStepContent(this._selectedStep(), this._entryContentEditor.getValue())
						this._editorModel.updateStepTemplate(this._selectedStep(), this._selectedTemplate())
						// create step
						const newStep = this._editorModel.addAndReturnEmptyStep()
						this._selectedStep(newStep)
						this._selectedTemplate(null)
						// set editor value
						this._entryContentEditor.setValue("")
					},
					type: ButtonType.Dropdown
				})
				return buttons
			})
		}

		const removeStepButtonAttrs: ButtonAttrs = {
			label: () => "remove step", // TODO: Translationkey
			type: ButtonType.Action,
			icon: () => Icons.Trash,
			click: () => {
				this._editorModel.removeLastStep()
				// update selectedStep and editor
				this._selectedStep(this._editorModel.getLastStep())
				this._entryContentEditor.setValue(this._selectedStep().description)
			}
		}

		const addTemplateButtonAttrs: ButtonAttrs = {
			label: () => "Add template", // TODO: Translationkey
			type: ButtonType.Action,
			icon: () => Icons.Edit,
			click: createDropdown(() => {
				let buttons
				buttons = this._editorModel.getAvailableTemplates().map(template => {
					return {
						label: () => downcast(template).tag,
						click: () => {
							// show content
							this._editorModel.updateStepTemplate(this._selectedStep(), template)
							this._selectedTemplate(template)
						},
						type: ButtonType.Dropdown
					}
				})
				buttons.unshift({
					label: "noTemplateSelected_label",
					click: () => {
						this._editorModel.addAvailableTemplate(this._selectedTemplate())
						this._selectedTemplate(null)
					},
					type: ButtonType.Dropdown
				})

				return buttons
			})
		}

		const stepAttrs: TextFieldAttrs = {
			label: "currentStep_label", // TODO: Translationkey
			value: this._selectedStep.map(step => lang.get("step_label", {"{stepNumber}": step.stepNumber})),
			injectionsRight: () => {
				return [
					this._editorModel.isLastStep(this._selectedStep())
						? m(ButtonN, removeStepButtonAttrs)
						: null,
					m(ButtonN, stepButtonAttrs)
				]
			},
			disabled: true
		}

		const templateAttrs: TextFieldAttrs = {
			label: () => "linked Template", //TODO: Translationkey
			value: this._selectedTemplate.map(template => {
				if (template) {
					return template.tag
				} else {
					return lang.get("noTemplateSelected_label")
				}
			}),
			injectionsRight: () => m(ButtonN, addTemplateButtonAttrs),
			disabled: true
		}

		this.view = () => {
			return m("", [
				m(TextFieldN, titleAttrs),
				m(TextFieldN, keywordAttrs),
				m(".editor-border.flex.wrap.scroll-y", {
					style: {
						width: px(760),
						height: px(100),
					}
				}, [
					this._editorModel.getAddedKeywords().map(keyword => {
						return m(".bubbleTag.plr-button.pl-s.pr-s.border-radius.no-wrap.mr-s.min-content.click", {
							onclick: () => {
								this._editorModel.removeKeyword(keyword)
							},
						}, [
							m(".text-ellipsis", keyword.keyword) // nice to have: show delete on hover
						])
					})
				]),
				m(this._entryUseCaseEditor),
				m(".flex", [
					m("", {
						style: {
							flex: "1 0 0",
							marginRight: px(5)
						}
					}, m(TextFieldN, stepAttrs)),
					m("", {
						style: {
							flex: "1 0 0",
							marginLeft: px(5)
						}
					}, m(TextFieldN, templateAttrs))
				]),
				m(this._entryContentEditor)
			])
		}

		let dialogCloseAction = () => {
			this._close()
		}

		let headerBarAttrs: DialogHeaderBarAttrs = {
			left: [{label: 'cancel_action', click: dialogCloseAction, type: ButtonType.Secondary}],
			right: [{label: 'save_action', click: () => this._save(), type: ButtonType.Primary}],
			middle: () => lang.get(this.entry._id ? "editEntry_label" : "createEntry_action")
		}
		this._dialog = Dialog.largeDialog(headerBarAttrs, this)
		this._dialog.show()

	}

	_initValues() {
		if (this.entry._id) { // if existing entry
			// init existing keywords, steps and title
			this._entryTitle(this.entry.title)
			this._editorModel.initAddedKeywords(this.entry.keywords)
			this._editorModel.initAddedSteps(this.entry.steps)
			this._selectedStep(this.entry.steps[0])
			const content = this._selectedStep().description
			this._entryContentEditor.setValue(content)
			const useCase = this.entry.useCase
			this._entryUseCaseEditor.setValue(useCase)
			let stepTemplate = null
			const tempTemplateListId = this._selectedStep().template // is id
			if (tempTemplateListId) {
				this._entityClient.load(EmailTemplateTypeRef, tempTemplateListId).then(template => {
					stepTemplate = template
					this._selectedTemplate(stepTemplate)
					m.redraw()
				})
			}

		} else { // if new entry
			const newStep = this._editorModel.addAndReturnEmptyStep()
			this._selectedStep(newStep)
		}
	}

	_save() {
		this._editorModel.updateStepContent(this._selectedStep(), this._entryContentEditor.getValue())
		this._editorModel.updateStepTemplate(this._selectedStep(), this._selectedTemplate())
		// check for empty content
		if (!this._entryTitle()) {
			Dialog.error("emptyTitle_msg")
			return
		}
		if (!this._entryUseCaseEditor.getValue()) {
			Dialog.error("emptyUseCase_msg")
			return
		}
		const stepWithNoContent = this._editorModel.stepHasContent()
		if (stepWithNoContent) {
			Dialog.error(() => lang.get("emptyStepContent_msg", {"{step}": stepWithNoContent.stepNumber}))
			return
		}
		this.entry.title = this._entryTitle()
		this.entry.keywords = this._editorModel.getAddedKeywords()
		this.entry.useCase = this._entryUseCaseEditor.getValue()
		this.entry.steps = this._editorModel.getAddedSteps()

		let promise
		if (this.entry._id) {
			promise = this._entityClient.update(this.entry)
			              .catch(NotFoundError, noOp)
		} else {
			// set ownerGroup
			this.entry._ownerGroup = neverNull(this._ownerGroup)
			promise = this._entityClient.setup(this._entryListId, this.entry).then(entryId => {
				console.log("success entry created" + entryId)
			})
		}
		console.log("Entry save", this.entry)
		promise.then(() => {
			this._close()
		})
	}

	_close(): void {
		this._dialog.close()
	}
}