// @flow

import m from "mithril"
import type {KnowledgeBaseEntry} from "../api/entities/tutanota/KnowledgeBaseEntry"
import type {KnowledgeBaseEntryKeywords} from "../api/entities/tutanota/KnowledgeBaseEntryKeywords"
import type {KnowledgeBaseStep} from "../api/entities/tutanota/KnowledgeBaseStep"
import {lang} from "../misc/LanguageViewModel"
import {ButtonN, ButtonType} from "../gui/base/ButtonN"
import {KnowledgeBaseEditor} from "../settings/KnowledgeBaseEditor"
import {memoized, neverNull} from "../api/common/utils/Utils"
import {locator} from "../api/main/MainLocator"
import {Icons} from "../gui/base/icons/Icons"
import {getListId} from "../api/common/EntityFunctions"
import {htmlSanitizer} from "../misc/HtmlSanitizer"

type KnowledgeBaseEntryViewAttrs = {
	entry: KnowledgeBaseEntry,
	onTemplateSelected: (template: IdTuple, step: KnowledgeBaseStep) => void,
	onEntryDeleted: (entry: KnowledgeBaseEntry) => void
}

type SanitizedStep = {
	sanitizedDescription: string,
	step: KnowledgeBaseStep
}

/**
 *  Renders one knowledgebase entry
 */

export class KnowledgeBaseEntryView implements MComponent<KnowledgeBaseEntryViewAttrs> {
	_sanitizedEntry: (KnowledgeBaseEntry) => {useCase: string, steps: Array<SanitizedStep>}

	constructor() {
		this._sanitizedEntry = memoized((entry) => {
			return {
				useCase: htmlSanitizer.sanitize(entry.useCase, true).text,
				steps: entry.steps.map(step => {
					return {
						sanitizedDescription: htmlSanitizer.sanitize(step.description, true).text,
						step
					}

				})
			}
		})
	}

	view({attrs}: Vnode<KnowledgeBaseEntryViewAttrs>): Children {
		return m(".flex.flex-column", [
			this._renderEditRemoveBtn(attrs), // TODO: Discuss
			this._renderContent(attrs)
		])
	}

	_renderEditRemoveBtn(attrs: KnowledgeBaseEntryViewAttrs): Children {
		return m(".flex", [
			m(ButtonN, {
				label: "editEntry_label",
				click: () => {
					new KnowledgeBaseEditor(attrs.entry, getListId(attrs.entry), neverNull(attrs.entry._ownerGroup), locator.entityClient)
				},
				icon: () => Icons.Edit,
				type: ButtonType.Action
			}),
			m(ButtonN, {
				label: "removeEntry_label",
				click: () => {
					attrs.onEntryDeleted(attrs.entry)
				},
				icon: () => Icons.Trash,
				type: ButtonType.Action
			})
		])
	}

	_renderContent(attrs: KnowledgeBaseEntryViewAttrs): Children {
		const {keywords} = attrs.entry
		return m(".flex.flex-column.scroll.mt-s", [ // CONTENT
			m(".h5.mt-s", lang.get("keywords_label")),
			m(".flex.wrap.mt-s", [
				keywords.map(keyword => {
					return this._renderKeywords(keyword)
				})
			]),
			m(".h5.mt-l", lang.get("useCase_label")),
			m(".editor-border", m.trust(this._sanitizedEntry(attrs.entry).useCase)), // TODO: sanitize
			m(".mt-s", [
				this._sanitizedEntry(attrs.entry).steps.map(step => {
					return this._renderStep(step, attrs)
				})
			])
		])
	}

	_renderKeywords(keyword: KnowledgeBaseEntryKeywords): Children {
		return [
			m(".bubbleTag-no-padding.plr-button.pl-s.pr-s.border-radius.no-wrap.mr-s.min-content", keyword.keyword)
		]
	}

	_renderStep({step, sanitizedDescription}: SanitizedStep, attrs: KnowledgeBaseEntryViewAttrs): Children {
		const stepTemplate = step.template
		return [
			m(".h5.mt-s", lang.get("step_label", {"{stepNumber}": step.stepNumber})),
			m(".editor-border", m.trust(sanitizedDescription)), // TODO: sanitize
			stepTemplate
				? m(ButtonN, {
					label: "linkedTemplate_label",
					click: () => {
						attrs.onTemplateSelected(stepTemplate, step)
					},
					type: ButtonType.Primary
				})
				: m(".ml-s.mt-s.primary", lang.get("noLinkedTemplate_label"))
		]
	}

}