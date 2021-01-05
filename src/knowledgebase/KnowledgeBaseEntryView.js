// @flow

import m from "mithril"
import {KNOWLEDGEBASE_PANEL_HEIGHT, KNOWLEDGEBASE_PANEL_WIDTH, KnowledgeBaseView, renderHeaderBar} from "./KnowledgeBaseView"
import {px} from "../gui/size"
import type {KnowledgeBaseEntry} from "../api/entities/tutanota/KnowledgeBaseEntry"
import type {KnowledgeBaseEntryKeywords} from "../api/entities/tutanota/KnowledgeBaseEntryKeywords"
import type {KnowledgeBaseStep} from "../api/entities/tutanota/KnowledgeBaseStep"
import {lang} from "../misc/LanguageViewModel"
import type {EmailTemplate} from "../api/entities/tutanota/EmailTemplate"
import {ButtonN, ButtonType} from "../gui/base/ButtonN"
import {KnowledgeBaseTemplateView} from "./KnowledgeBaseTemplateView"
import {DISABLE_VIEW, ENABLE_VIEW, knowledgebase} from "./KnowledgeBaseModel"
import {KnowledgeBaseEditor} from "../settings/KnowledgeBaseEditor"
import {listIdPart} from "../api/common/EntityFunctions"
import {neverNull} from "../api/common/utils/Utils"
import {locator} from "../api/main/MainLocator"
import {Dialog} from "../gui/base/Dialog"
import {Icons} from "../gui/base/icons/Icons"
import {EntityClient} from "../api/common/EntityClient"

type KnowledgeBaseEntryViewAttrs = {
	entry: KnowledgeBaseEntry,
	onSubmit: (string) => void,
}

/**
 *  Renders one knowledgebase entry
 */

export class KnowledgeBaseEntryView implements MComponent<KnowledgeBaseEntryViewAttrs> {
	_templates: {[id: Id]: EmailTemplate}
	_step: KnowledgeBaseStep
	_entityClient: EntityClient

	constructor() {
		this._entityClient = locator.entityClient
	}

	view({attrs}: Vnode<KnowledgeBaseEntryViewAttrs>): Children {
		const {title, keywords, steps, useCase} = attrs.entry
		if (knowledgebase.isEntryViewActive()) {
			return m(".flex.flex-column.abs.elevated-bg", {
				style: {
					height: px(KNOWLEDGEBASE_PANEL_HEIGHT),
					width: px(KNOWLEDGEBASE_PANEL_WIDTH),
					top: px(120),
				},
				// removed stopPropagation here, didn't break when testing, but if it does, just add it back
			}, m(".ml-s.mr-s", [
				renderHeaderBar(title, () => {
					knowledgebase.setTemplateView(DISABLE_VIEW)
					knowledgebase.setEntryView(DISABLE_VIEW)
				}, false),
				m(".flex", [
					m(ButtonN, {
						label: "editEntry_label",
						click: () => {
							new KnowledgeBaseEditor(attrs.entry, listIdPart(attrs.entry._id), neverNull(attrs.entry._ownerGroup), locator.entityClient)
						},
						icon: () => Icons.Edit,
						type: ButtonType.Action
					}),
					m(ButtonN, {
						label: "removeEntry_label",
						click: () => {
							Dialog.confirm( "deleteEntryConfirm_msg").then((confirmed) => {
								if (confirmed) {
									const promise = this._entityClient.erase(attrs.entry)
									promise.then(() => {
										knowledgebase.setTemplateView(DISABLE_VIEW)
										knowledgebase.setEntryView(DISABLE_VIEW)
									})
								}
							})
						},
						icon: () => Icons.Trash,
						type: ButtonType.Action
					})
				]),
				m(".flex.flex-column.mr-s.ml-s.scroll.mt-s", [ // CONTENT
					m(".h5.mt-l", lang.get("keywords_label")),
					m(".flex.wrap.mt-s", [
						keywords
							? keywords.map(keyword => {
								return this._renderKeywords(keyword)
							})
							: null
					]),
					m(".h5.mt-l", lang.get("useCase_label")),
					m(".editor-border", m.trust(useCase)),
					m(".mt-l", [
						steps
							? steps.map(step => {
								return this._renderSteps(step)
							})
							: null
					])
				])
			]))
		} else if (knowledgebase.isTemplateViewActive()) {
			return m(KnowledgeBaseTemplateView, {
				step: this._step,
				entryView: this,
				onSubmit: attrs.onSubmit,
			})
		} else if (!knowledgebase.isTemplateViewActive() && !knowledgebase.isEntryViewActive()) {
			return m(KnowledgeBaseView, {
				onSubmit: attrs.onSubmit,
			})
		} else {
			return null
		}
	}

	_renderKeywords(keyword: KnowledgeBaseEntryKeywords): Children {
		return [
			m(".bubbleTag-no-padding.plr-button.pl-s.pr-s.border-radius.no-wrap.mr-s.min-content", keyword.keyword)
		]
	}

	_renderSteps(step: KnowledgeBaseStep): Children {
		return [
			m(".h5.mt-s", lang.get("step_label", {"{stepNumber}": step.stepNumber})),
			m(".editor-border", m.trust(step.description)),
			step.template
				? m(ButtonN, {
					label: "linkedTemplate_label",
					click: () => {
						// open template details view
						this._step = step
						knowledgebase.setTemplateView(ENABLE_VIEW)
						knowledgebase.setEntryView(DISABLE_VIEW)
					},
					type: ButtonType.Primary
				})
				: m(".ml-s.mt-s.primary", lang.get("noLinkedTemplate_label"))
		]
	}
}