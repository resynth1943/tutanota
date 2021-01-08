// @flow

import m from "mithril"
import type {KnowledgeBaseStep} from "../api/entities/tutanota/KnowledgeBaseStep"
import type {EmailTemplate} from "../api/entities/tutanota/EmailTemplate"
import {px} from "../gui/size"
import {knowledgebase} from "./KnowledgeBaseModel"
import type {EmailTemplateContent} from "../api/entities/tutanota/EmailTemplateContent"
import {getLanguageCode} from "../settings/TemplateEditorModel"
import {lang, languageByCode} from "../misc/LanguageViewModel"
import type {SelectorItem} from "../gui/base/DropDownSelectorN"
import type {LanguageCode} from "../misc/LanguageViewModel"
import stream from "mithril/stream/stream.js"
import {DropDownSelectorN} from "../gui/base/DropDownSelectorN"
import {getFromMap} from "../api/common/utils/MapUtils"

export type Attrs = {
	step: KnowledgeBaseStep,
	onLanguageSelected: (LanguageCode) => mixed,
	fetchedTemplate: ?EmailTemplate,
	language: LanguageCode,
}

/**
 *  Renders one Template of a knowledgebase entry
 */

export class KnowledgeBaseTemplateView {
	_contents: Map<LanguageCode, string>

	constructor() {
		this._contents = new Map()
	}

	view(vnode: Vnode<Attrs>): Children {
		const {fetchedTemplate, language} = vnode.attrs
		return m(".flex.flex-column.", [
			m(".half-width", [
				fetchedTemplate
					? m(DropDownSelectorN, {
						label: () => lang.get("chooseLanguage_action"),
						items: this._getLanguages(fetchedTemplate.contents),
						selectedValue: stream(language),
						dropdownWidth: 250,
						selectionChangedHandler: (lang) => vnode.attrs.onLanguageSelected(lang)
					})
					: null
			]),
			fetchedTemplate
				? m(".mt-l", m.trust(this._getContent(fetchedTemplate, language)))
				: null
		])

	}

	_getLanguages(contents: Array<EmailTemplateContent>): Array<SelectorItem<LanguageCode>> {
		return contents.map(content => {
			const languageCode = getLanguageCode(content)
			return {
				name: lang.get(languageByCode[languageCode].textId),
				value: languageCode
			}
		})
	}

	_getContent(template: EmailTemplate, language: LanguageCode): string {
		return getFromMap(this._contents, language, () => {
			return knowledgebase.getContentFromTemplate(language, template)
		})
	}
}