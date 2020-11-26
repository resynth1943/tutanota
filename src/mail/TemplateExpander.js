// @flow
import m from "mithril"
import type {SelectorItem} from "../gui/base/DropDownSelectorN"
import {DropDownSelectorN} from "../gui/base/DropDownSelectorN"
import stream from "mithril/stream/stream.js"
import type {LanguageCode} from "../misc/LanguageViewModel"
import {lang, languageByCode} from "../misc/LanguageViewModel"
import {typedKeys} from "../api/common/utils/Utils.js"
import {TEMPLATE_POPUP_HEIGHT} from "./TemplatePopup"
import {px} from "../gui/size"
import {Keys} from "../api/common/TutanotaConstants"
import {ButtonN, ButtonType} from "../gui/base/ButtonN"
import type {Template} from "./TemplateModel"
import {TemplateModel} from "./TemplateModel"
import {isKeyPressed} from "../misc/KeyManager"

/**
 * TemplateExpander is the right side that is rendered within the Popup. Consists of Dropdown, Content and Button.
 * The Popup handles whether the Expander should be rendered or not, depending on available width-space.
 */
export type TemplateExpanderAttrs = {
	template: Template,
	onDropdownCreate: (vnode: Vnode<*>) => void,
	onReturnFocus: () => void,
	onSubmitted: (string) => void,
	model: TemplateModel
}

export class TemplateExpander implements MComponent<TemplateExpanderAttrs> {
	_dropDownDom: HTMLElement

	view({attrs}: Vnode<TemplateExpanderAttrs>): Children {
		const {template, model} = attrs
		const selectedLanguage = model.getSelectedLanguage()
		return m(".flex.flex-column.flex-grow", {
			style: {
				maxHeight: px(TEMPLATE_POPUP_HEIGHT) // maxHeight has to be set, because otherwise the content would overflow outside the flexbox
			},
			onkeydown: (e) => {
				if (isKeyPressed(e.keyCode, Keys.TAB)) {
					e.preventDefault()
					if (document.activeElement === this._dropDownDom) {
						attrs.onReturnFocus()
					}
				}
			}
		}, [
			m(".mt-negative-s", [
				m(DropDownSelectorN, {
					label: () => "Choose Language", // TODO: Add TranslationKey
					items: this._returnLanguages(template.content),
					selectedValue: stream(selectedLanguage),
					dropdownWidth: 250,
					onButtonCreate: (buttonVnode) => {
						this._dropDownDom = buttonVnode.dom
						attrs.onDropdownCreate(buttonVnode)
					},
					selectionChangedHandler: (value) => {
						model.setSelectedLanguage(value)
						attrs.onReturnFocus()
					},
				})
			]),
			m(".scroll.pt.flex-grow.overflow-wrap",
				m.trust(template.content[selectedLanguage])
			),
			m(".flex.justify-right", [
				m(ButtonN, {
					label: () => "Submit", // TODO: Add TranslationKey
					click: (e) => {
						attrs.onSubmitted(template.content[selectedLanguage])
						e.stopPropagation()
					},
					type: ButtonType.Primary,
				}),
			])
		])
	}

	_returnLanguages(content: Object): Array<SelectorItem<LanguageCode>> {
		return typedKeys(content).map((languageCode) => {
			return {
				name: lang.get(languageByCode[languageCode].textId),
				value: languageCode
			}
		})
	}
}