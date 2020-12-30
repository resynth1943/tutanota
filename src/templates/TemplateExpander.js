// @flow
import m from "mithril"
import type {SelectorItem} from "../gui/base/DropDownSelectorN"
import {DropDownSelectorN} from "../gui/base/DropDownSelectorN"
import stream from "mithril/stream/stream.js"
import type {LanguageCode} from "../misc/LanguageViewModel"
import {lang, languageByCode} from "../misc/LanguageViewModel"
import {TEMPLATE_POPUP_HEIGHT} from "./TemplatePopup"
import {px} from "../gui/size"
import {Keys} from "../api/common/TutanotaConstants"
import {ButtonN, ButtonType} from "../gui/base/ButtonN"
import {templateModel, TemplateModel} from "./TemplateModel"
import {isKeyPressed} from "../misc/KeyManager"
import type {EmailTemplate} from "../api/entities/tutanota/EmailTemplate"
import {getLanguageCode} from "../settings/TemplateEditorModel"
import type {EmailTemplateContent} from "../api/entities/tutanota/EmailTemplateContent"
import {TemplateEditor} from "../settings/TemplateEditor"
import {listIdPart} from "../api/common/EntityFunctions"
import {neverNull} from "../api/common/utils/Utils"
import {locator} from "../api/main/MainLocator"
import {Dialog} from "../gui/base/Dialog"

/**
 * TemplateExpander is the right side that is rendered within the Popup. Consists of Dropdown, Content and Button.
 * The Popup handles whether the Expander should be rendered or not, depending on available width-space.
 */

export type TemplateExpanderAttrs = {
	template: EmailTemplate,
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
					label: "chooseLanguage_action",
					items: this._returnLanguages(template.contents),
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
				m.trust(model.getContentFromLanguage(selectedLanguage))
			),
			m(".flex.justify-right", [
				m(ButtonN, {
					label: "submit_label",
					click: (e) => {
						attrs.onSubmitted(model.getContentFromLanguage(selectedLanguage))
						e.stopPropagation()
					},
					type: ButtonType.Primary,
				}),
				m(ButtonN, {
					label: "edit_action",
					click: () => {
						new TemplateEditor(template, listIdPart(template._id), neverNull(template._ownerGroup), locator.entityClient)
					},
					type: ButtonType.Primary

				}),
				m(ButtonN, {
					label: "remove_action",
					click: () => {
						Dialog.confirm("deleteTemplate_msg").then((confirmed) => {
							if (confirmed) {
								const promise = locator.entityClient.erase(template)
								promise.then(() => console.log("removed"))
							}
						})
					},
					type: ButtonType.Primary
				})
			])
		])
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