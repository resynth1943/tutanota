// @flow
import m from "mithril"
import {DropDownSelectorN} from "../gui/base/DropDownSelectorN"
import stream from "mithril/stream/stream.js"
import type {Template} from "../settings/TemplateListView"
import {lang, languageByCode} from "../misc/LanguageViewModel"
import type {SelectorItem} from "../gui/base/DropDownSelectorN"
import type {LanguageCode} from "../misc/LanguageViewModel"
import {typedKeys} from "../api/common/utils/Utils.js"


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

		return m("flex.flex-column", {
			style: {
				width: "375px"
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
			m("", {style: {marginTop: "-12px"}}, [
				m(DropDownSelectorN, {
					label: () => "Choose Language",
					items: this._returnLanguages(content),
					selectedValue: stream(attrs.language),
					dropdownWidth: 250,
					onButtonCreate: (vnode2) => {
						this._dropDownDom = vnode2.dom
						attrs.onDropdownCreate(vnode2)
					},
					selectionChangedHandler: (value) => {
						console.log("Value: ", value)
						attrs.onLanguageSelected(value)
						attrs.onReturnFocus()
					},
				})
			]),
			m("", {style: {overflow: "scroll", height: "246.8833px", width: "355px", overflowWrap: "break-word"}},
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