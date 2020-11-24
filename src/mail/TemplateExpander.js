// @flow
import m from "mithril"
import {DropDownSelectorN} from "../gui/base/DropDownSelectorN"
import stream from "mithril/stream/stream.js"
import type {Template} from "../settings/TemplateListView"
import {lang, languageByCode} from "../misc/LanguageViewModel"
import type {SelectorItem} from "../gui/base/DropDownSelectorN"
import type {LanguageCode} from "../misc/LanguageViewModel"
import {typedKeys} from "../api/common/utils/Utils.js"
import {TEMPLATE_POPUP_HEIGHT} from "./TemplatePopup"
import {px, size} from "../gui/size"


export type TemplateExpanderAttrs = {
	template: Template,
	onDropdownCreate: (vnode: Vnode<*>) => void,
	language: LanguageCode,
	onLanguageSelected: (LanguageCode) => void,
	onReturnFocus: () => void,
}

export class TemplateExpander implements MComponent<TemplateExpanderAttrs> {
	_dropDownDom: HTMLElement

	view({attrs}: Vnode<TemplateExpanderAttrs>): Children {
		const {content} = attrs.template
		return m(".flex.flex-column.flex-grow", {
			style: {
				maxHeight: px(TEMPLATE_POPUP_HEIGHT - size.button_height) // subtract footer-button height to prevent overflow of content
			},
			onkeydown: (e) => {
				if (e.keyCode === 9) {
					e.preventDefault()
					if (document.activeElement === this._dropDownDom) {
						attrs.onReturnFocus()
					}
				}
			}
		}, [
			m(".mt-negative-s", [
				m(DropDownSelectorN, {
					label: () => "Choose Language",
					items: this._returnLanguages(content),
					selectedValue: stream(attrs.language),
					dropdownWidth: 250,
					onButtonCreate: (buttonVnode) => {
						this._dropDownDom = buttonVnode.dom
						attrs.onDropdownCreate(buttonVnode)
					},
					selectionChangedHandler: (value) => {
						attrs.onLanguageSelected(value)
						attrs.onReturnFocus()
					},
				})
			]),
			m(".scroll.pt", {style: {overflowWrap: "anywhere"}},
				m.trust(content[attrs.language])
			)
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