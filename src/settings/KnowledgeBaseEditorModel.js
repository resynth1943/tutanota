// @flow

import type {KnowledgeBaseEntryKeywords} from "../api/entities/tutanota/KnowledgeBaseEntryKeywords"
import {createKnowledgeBaseEntryKeywords} from "../api/entities/tutanota/KnowledgeBaseEntryKeywords"
import type {KnowledgeBaseStep} from "../api/entities/tutanota/KnowledgeBaseStep"
import {createKnowledgeBaseStep} from "../api/entities/tutanota/KnowledgeBaseStep"
import {Dialog} from "../gui/base/Dialog"
import {lang} from "../misc/LanguageViewModel"
import type {EmailTemplate} from "../api/entities/tutanota/EmailTemplate"
import {templateModel} from "../templates/TemplateModel"
import {elementIdPart} from "../api/common/EntityFunctions"
import {filterInt} from "../calendar/CalendarUtils"
import {remove} from "../api/common/utils/ArrayUtils"

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

	initAddedKeywords(keywords: Array<KnowledgeBaseEntryKeywords>) {
		this._addedKeywords.push(...keywords)
	}

	initAddedSteps(steps: Array<KnowledgeBaseStep>) {
		this._addedSteps.push(...steps)
	}

	getAddedSteps(): Array<KnowledgeBaseStep> {
		return this._addedSteps
	}

	getAvailableTemplates(): Array<EmailTemplate> {
		return this._availableTemplates
	}

	getLastStep(): KnowledgeBaseStep {
		const lastIndex = this._addedSteps.length - 1
		return this._addedSteps[lastIndex]
	}

	getTemplateFromStep(currentStep: KnowledgeBaseStep): ?EmailTemplate {
		const stepTemplate = currentStep.template
		return stepTemplate && this._availableTemplates.find(t => elementIdPart(t._id) === elementIdPart(stepTemplate))
	}

	getAddedKeywords(): Array<KnowledgeBaseEntryKeywords> {
		return this._addedKeywords
	}

	isLastStep(step: KnowledgeBaseStep): boolean {
		const stepNumber = filterInt(step.stepNumber)
		return (stepNumber > 1 && stepNumber === this._addedSteps.length)
	}

	addKeyword(keywordInput: string) {
		let keyword
		const keywordString = keywordInput.toLowerCase().replace(/\s/g, "")
		if (keywordString !== "") {
			keyword = createKnowledgeBaseEntryKeywords({keyword: keywordString})
			if (!this.hasKeyword(keyword)) {
				this._addedKeywords.push(keyword)
			}
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

	updateStepContent(step: KnowledgeBaseStep, editorValue: string) {
		const index = filterInt(step.stepNumber)
		this._addedSteps[(index - 1)].description = editorValue
	}

	updateStepTemplate(step: KnowledgeBaseStep, template: ?EmailTemplate) {
		const index = filterInt(step.stepNumber)
		this._addedSteps[(index - 1)].template = template ? template._id : null
	}

	removeLastStep() {
		/**
		 *  We can call .pop() because you can only remove the last added step
		 *  Checking if we remove the "correct" step is thus not needed
		 */
		this._addedSteps.pop()
	}

	removeKeyword(keyword: KnowledgeBaseEntryKeywords) {
		remove(this._addedKeywords, keyword)
	}

	hasKeyword(currentKeyword: KnowledgeBaseEntryKeywords): boolean {
		return this._addedKeywords.some(keyword => {
			return currentKeyword.keyword === keyword.keyword
		})
	}

	stepHasContent(): ?KnowledgeBaseStep { // returns step which has no content
		for (const step of this._addedSteps) {
			const content = step.description
			const hasContent = !!content.replace(/(<([^>]+)>)/ig, "").length
			if (!hasContent) {
				return step
			}
		}
		return null
	}
}