// @flow

import m from "mithril"
import type {KnowledgeBaseEntry} from "../api/entities/tutanota/KnowledgeBaseEntry"
import {EntityClient} from "../api/common/EntityClient"
import type {EntityUpdateData} from "../api/main/EventController"
import {HtmlEditor} from "../gui/base/HtmlEditor"
import type {ButtonAttrs} from "../gui/base/ButtonN"
import {ButtonType} from "../gui/base/ButtonN"
import {ButtonN} from "../gui/base/ButtonN"
import {Icons} from "../gui/base/icons/Icons"
import {Dialog} from "../gui/base/Dialog"
import {KnowledgeBaseEditor} from "./KnowledgeBaseEditor"
import {elementIdPart, listIdPart} from "../api/common/EntityFunctions"
import {neverNull} from "../api/common/utils/Utils"
import {locator} from "../api/main/MainLocator"
import {px} from "../gui/size"
import {EmailTemplateTypeRef} from "../api/entities/tutanota/EmailTemplate"
import {lang} from "../misc/LanguageViewModel"
import type {EmailTemplate} from "../api/entities/tutanota/EmailTemplate"

/**
 *  Renders one knowledgebase entry in the settings
 */

export class KnowledgeBaseDetailsViewer {
	view: Function
	_contentEditor: HtmlEditor
	_entityClient: EntityClient
	_templates: {[id: Id]: EmailTemplate}

	constructor(entry: KnowledgeBaseEntry, entityClient: EntityClient) {

		this._entityClient = entityClient
		this._templates = {}

		// fetch templates
		this._fetchTemplates(entry)

		const EditButtonAttrs: ButtonAttrs = {
			label: "edit_action",
			icon: () => Icons.Edit,
			type: ButtonType.Action,
			click: () => {
				new KnowledgeBaseEditor(entry, listIdPart(entry._id), neverNull(entry._ownerGroup), locator.entityClient)
			}
		}

		const RemoveButtonAttrs: ButtonAttrs = {
			label: "remove_action",
			icon: () => Icons.Trash,
			type: ButtonType.Action,
			click: () => {
				Dialog.confirm("deleteEntryConfirm_msg").then((confirmed) => {
					if (confirmed) {
						const promise = entityClient.erase(entry)
						promise.then(() => console.log("removed"))
					}
				})
			}
		}

		this.view = () => {
			return m("#user-viewer.fill-absolute.scroll.plr-l.pb-floating", [
				m(".h4.mt-l", [
					m("", entry.title),
					m(ButtonN, EditButtonAttrs),
					m(ButtonN, RemoveButtonAttrs)
				]),
				m("", [
					m(".h5.mt-s", lang.get("keywords_label")),
					m(".flex.mt-s", [
						entry.keywords.map(entryKeyword => {
							return m(".bubbleTag", entryKeyword.keyword)
						})
					]),
					m(".flex.flex-column.mt-l", [
						m(".h5", lang.get("useCase_label")),
						m(".editor-border", m.trust(entry.useCase)),
					]),
					entry.steps.map(entryStep => {
						const entryStepTemplate = entryStep.template && this._templates[elementIdPart(entryStep.template)]
						return m(".flex.flex-column.mt-l", [
							m(".h5.mt-s", lang.get("step_label", {"{stepNumber}": entryStep.stepNumber})),
							m(".editor-border", m.trust(entryStep.description)),
							m(".ml-s", lang.get("linkedTemplateTag_label") + (
								entryStepTemplate
									? String(entryStepTemplate.tag)
									: lang.get("noTemplateSelected_label")))
						])
					})
				])
			])
		}
	}

	_fetchTemplates(entry: KnowledgeBaseEntry) {
		for (const step of entry.steps) {
			const entryStepTemplateId = step.template
			if (entryStepTemplateId) {
				this._entityClient.load(EmailTemplateTypeRef, entryStepTemplateId).then(template => {
					this._templates[elementIdPart(entryStepTemplateId)] = template
					m.redraw()
				})
			}
		}
	}

	entityEventsReceived(updates: $ReadOnlyArray<EntityUpdateData>): Promise<void> {
		return Promise.each(updates, update => {
			let p = Promise.resolve()
			return p.then(() => {
			})
		}).then(() => m.redraw())
	}
}