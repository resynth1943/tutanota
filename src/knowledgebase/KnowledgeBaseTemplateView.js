// @flow

import m from "mithril"
import type {KnowledgeBaseStep} from "../api/entities/tutanota/KnowledgeBaseStep"
import {EntityClient} from "../api/common/EntityClient"
import type {EmailTemplate} from "../api/entities/tutanota/EmailTemplate"
import {EmailTemplateTypeRef} from "../api/entities/tutanota/EmailTemplate"
import {px} from "../gui/size"
import {KNOWLEDGEBASE_PANEL_HEIGHT, KNOWLEDGEBASE_PANEL_WIDTH, renderHeaderBar} from "./KnowledgeBaseView"
import {locator} from "../api/main/MainLocator"
import {KnowledgeBaseEntryView} from "./KnowledgeBaseEntryView"
import {DISABLE_VIEW, ENABLE_VIEW, knowledgebase} from "./KnowledgeBaseModel"
import type {EmailTemplateContent} from "../api/entities/tutanota/EmailTemplateContent"
import {getLanguageCode} from "../settings/TemplateEditorModel"
import {lang, languageByCode} from "../misc/LanguageViewModel"
import type {SelectorItem} from "../gui/base/DropDownSelectorN"
import type {LanguageCode} from "../misc/LanguageViewModel"
import stream from "mithril/stream/stream.js"
import {downcast} from "../api/common/utils/Utils"
import {DropDownSelectorN} from "../gui/base/DropDownSelectorN"
import {ButtonType} from "../gui/base/ButtonN"
import type {ButtonAttrs} from "../gui/base/ButtonN"

export type Attrs = {step: KnowledgeBaseStep, entryView: KnowledgeBaseEntryView, onSubmit: (string) => void}

/**
 *  Renders one Template of a knowledgebase entry
 */

export class KnowledgeBaseTemplateView {
	_templateId: IdTuple
	_entityClient: EntityClient
	_fetchedTemplate: ?EmailTemplate
	_showEntryDetailsViewer: boolean = false
	_showTemplateDetailsViewer: boolean = true
	_entryView: KnowledgeBaseEntryView
	_selectedLanguage: Stream<LanguageCode>
	_submitButtonAttrs: ButtonAttrs

	constructor(vnode: Vnode<Attrs>) { // step doesn't change
		const {step, entryView, onSubmit} = vnode.attrs
		const templateId = step.template
		if (templateId) {
			this._templateId = templateId
		}
		this._fetchedTemplate = null
		this._fetchTemplate()
		this._entryView = entryView
		this._selectedLanguage = stream("en")
		this._submitButtonAttrs = {
			label: "submit_label",
			click: () => {
				const content =  knowledgebase.getContentFromTemplate(this._selectedLanguage(), this._fetchedTemplate)
				onSubmit(content)
				knowledgebase.setTemplateView(DISABLE_VIEW)
				knowledgebase.setEntryView(ENABLE_VIEW)
			},
			type: ButtonType.Primary
		}
	}

	view(): Children {
		if (knowledgebase.isTemplateViewActive()) {
			const template = this._fetchedTemplate
			return m(".flex.flex-column.abs.elevated-bg", {
				style: {
					height: px(KNOWLEDGEBASE_PANEL_HEIGHT),
					width: px(KNOWLEDGEBASE_PANEL_WIDTH),
					top: px(120),
				},
			}, m(".mr-s.ml-s", [
				renderHeaderBar(template ? template.title : "", () => {
									knowledgebase.setTemplateView(DISABLE_VIEW)
									knowledgebase.setEntryView(ENABLE_VIEW)
								}, true, this._submitButtonAttrs),
				m(".ml-s", {
					style: {
						width: px(300)
					}
				}, [
					template
						? m(DropDownSelectorN, {
							label: () => lang.get("chooseLanguage_action"),
							items: this._returnLanguages(template.contents),
							selectedValue: this._selectedLanguage,
							dropdownWidth: 250,
						})
						: null
				]),
				template
					? m(".mt-l.ml-s", m.trust(knowledgebase.getContentFromTemplate(this._selectedLanguage(), template)))
					: null
			]))
		} else {
			return m(this._entryView)
		}
	}

	_fetchTemplate() {
		if (this._templateId) {
			locator.entityClient.load(EmailTemplateTypeRef, this._templateId).then((template) => {
				this._fetchedTemplate = template
				this._selectedLanguage(downcast(template.contents[0].languageCode))
				m.redraw()
			})
		}
	}

	_returnLanguages(contents: EmailTemplateContent[]): Array<SelectorItem<LanguageCode>> {
		return contents.map(content => {
			const languageCode = getLanguageCode(content)
			return {
				name: lang.get(languageByCode[languageCode].textId),
				value: languageCode
			}
		})
	}

}