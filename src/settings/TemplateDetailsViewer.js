//@flow

import m from "mithril"
import stream from "mithril/stream/stream.js"
import {HtmlEditor} from "../gui/base/HtmlEditor"
import {neverNull, typedEntries} from "../api/common/utils/Utils"
import type {TextFieldAttrs} from "../gui/base/TextFieldN"
import {TextFieldN} from "../gui/base/TextFieldN"
import type {EntityEventsListener, EntityUpdateData} from "../api/main/EventController"
import type {Template} from "../mail/TemplateModel"
import {ButtonN, ButtonType} from "../gui/base/ButtonN"
import type {ButtonAttrs} from "../gui/base/ButtonN"
import {Icons} from "../gui/base/icons/Icons"
import {TemplateEditor} from "./TemplateEditor"
import {Dialog} from "../gui/base/Dialog"
import {elementIdPart, listIdPart} from "../api/common/EntityFunctions"
import {OperationType} from "../api/common/TutanotaConstants"
import {theme} from "../gui/theme"
import {lang, languageByCode} from "../misc/LanguageViewModel"

export class TemplateDetailsViewer {
	view: Function
	_templateContentEditor: HtmlEditor

	constructor(template: Template, keyList: Array<Template>, entityUpdate: EntityEventsListener) {

		const titleAttrs: TextFieldAttrs = {
			label: () => "Title", // TODO: Add TranslationKey
			value: stream(template.title),
			disabled: true
		}

		const tagAttrs: TextFieldAttrs = {
			label: () => "Tag", // TODO: Add TranslationKey
			value: stream(neverNull(template.tag)),
			disabled: true
		}

		const EditButtonAttrs: ButtonAttrs = {
			label: () => "Edit",// TODO: Add TranslationKey
			icon: () => Icons.Edit,
			type: ButtonType.Action,
			click: () => {
				new TemplateEditor(keyList, template, entityUpdate)
			}
		}

		const RemoveButtonAttrs: ButtonAttrs = {
			label: () => "Remove", // TODO: Add TranslationKey
			icon: () => Icons.Trash,
			type: ButtonType.Action,
			click: () => {
				Dialog.confirm(() => "Are you sure you want to delete the Template?").then((confirmed) => { // TODO: Add TranslationKey
					if (confirmed) {
						keyList.splice(template.index, 1)
						localStorage.setItem("Templates", JSON.stringify(keyList))
						entityUpdate([
								{
									application: "tutanota",
									type: "template",
									instanceListId: listIdPart(template._id),
									instanceId: elementIdPart(template._id),
									operation: OperationType.DELETE
								}
							], "fake-owner-id"
						)
					}
				})
			}
		}

		this.view = () => {
			return m("#user-viewer.fill-absolute.scroll.plr-l.pb-floating", [
				m(".h4.mt-l", [
					m("", "Template Settings"), // TODO: Add TranslationKey
					m(ButtonN, EditButtonAttrs),
					m(ButtonN, RemoveButtonAttrs),
				]),
				m("", [
					m(TextFieldN, titleAttrs),
					m(TextFieldN, tagAttrs),
					typedEntries(template.content).map(([language, content]) => m(".flex.flex-column", [
						m(".h4.mt-l", lang.get(languageByCode[language].textId)),
						m(".editor-border", m.trust(content))
					]))
				])
			])
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
