// @flow

import type {KnowledgeBaseEntryKeywords} from "../api/entities/tutanota/KnowledgeBaseEntryKeywords"
import type {KnowledgeBaseStep} from "../api/entities/tutanota/KnowledgeBaseStep"
import {createKnowledgeBaseStep} from "../api/entities/tutanota/KnowledgeBaseStep"
import {Dialog} from "../gui/base/Dialog"
import {lang} from "../misc/LanguageViewModel"
import type {EmailTemplate} from "../api/entities/tutanota/EmailTemplate"
import {templateModel} from "../templates/TemplateModel"
import {elementIdPart} from "../api/common/EntityFunctions"
import {neverNull} from "../api/common/utils/Utils"
import {createKnowledgeBaseEntryKeywords} from "../api/entities/tutanota/KnowledgeBaseEntryKeywords"

/**
 *  Model, which includes the logic of the editor
 */

export class KnowledgeBaseEditorModel {
	_addedKeywords: Array<KnowledgeBaseEntryKeywords>
	_addedSteps: Array<KnowledgeBaseStep>
	_availableTemplates: Array<EmailTemplate>

	constructor() {
		this._addedKeywords = []
		this._addedSteps = []
		templateModel.loadTemplates().then( //  templates to make them available for reference
			(templates) => {
				this._availableTemplates = templates
			})
	}

	addKeyword(keywordInput: string) {
		let keyword
		const keywordString = keywordInput.toLowerCase().replace(/\s/g, "")
		if (keywordString !== "") {
			keyword = createKnowledgeBaseEntryKeywords({keyword: keywordString})
		}
		if (keyword) {
			if (!this.hasKeyword(keyword)) {
				this._addedKeywords.push(keyword)
			} else {
				Dialog.error("keywordExistsErr_msg")
			}
		} else {
			console.log("Cant add empty string")
		}
	}

	addAndReturnEmptyStep(): KnowledgeBaseStep {
		const newStep = createKnowledgeBaseStep({
			description: "",
			stepNumber: String(this._addedSteps.length + 1),
			template: null
		})
		this._addedSteps.push(newStep)
		return newStep
	}

	addAvailableTemplate(template: ?EmailTemplate) {
		if (!this._availableTemplates.includes(template)) {
			if (template) {
				this._availableTemplates.push(template)
			}
		}
	}

	getAddedSteps(): Array<KnowledgeBaseStep> {
		return this._addedSteps
	}

	getAvailableTemplates(): Array<EmailTemplate> {
		console.log("available Templates: ", this._availableTemplates)
		return this._availableTemplates
	}

	getTemplateFromStep(currentStep: KnowledgeBaseStep): ?EmailTemplate {
		const stepTemplate = currentStep.template
		const template = stepTemplate && this._availableTemplates.find(t => elementIdPart(t._id) === elementIdPart(stepTemplate))
		return template && template || null
	}

	updateStepContent(step: KnowledgeBaseStep, editorValue: string) {
		const index = parseInt(step.stepNumber)
		this._addedSteps[(index - 1)].description = editorValue
	}

	updateStepTemplate(step: KnowledgeBaseStep, template: ?EmailTemplate) {
		const index = parseInt(step.stepNumber)
		this._addedSteps[(index - 1)].template = template ? template._id : null
	}

	removeFromAddedSteps() {
		/**
		 *  We can call .pop() because you can only remove the last added step
		 *  Checking if we remove the "correct" step is thus not needed
		 */
		this._addedSteps.pop()
	}

	removeKeyword(keyword: KnowledgeBaseEntryKeywords) {
		const index = this._addedKeywords.indexOf((keyword))
		if (index > -1) {
			this._addedKeywords.splice(index, 1)
		}
	}

	getAddedKeywords(): Array<KnowledgeBaseEntryKeywords> {
		return this._addedKeywords
	}

	hasKeyword(currentKeyword: KnowledgeBaseEntryKeywords): boolean {
		for (const keyword of this._addedKeywords) {
			if (currentKeyword.keyword === keyword.keyword) {
				return true
			}
		}
		return false
	}

	stepHasContent(): boolean {
		for (const step of this._addedSteps) {
			const content = step.description
			const hasContent = !!content.replace(/(<([^>]+)>)/ig, "").length
			if (!hasContent) {
				Dialog.error(() => lang.get("emptyStepContent_msg", {"{step}": step.stepNumber}))
				return false
			}
		}
		return true
	}

	initAddedKeywords(keywords: Array<KnowledgeBaseEntryKeywords>) {
		for (const keyword of keywords) {
			console.log(keyword)
			this._addedKeywords.push(keyword)
		}
	}

	initAddedSteps(steps: Array<KnowledgeBaseStep>) {
		for (const step of steps) {
			this._addedSteps.push(step)
		}
	}

}