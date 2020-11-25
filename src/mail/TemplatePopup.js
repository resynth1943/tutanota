//@flow
import m from "mithril"
import type {ModalComponent} from "../gui/base/Modal"
import {modal} from "../gui/base/Modal"
import {px} from "../gui/size"
import type {Shortcut} from "../misc/KeyManager"
import type {PosRect} from "../gui/base/Dropdown"
import {TextFieldN} from "../gui/base/TextFieldN"
import type {TextFieldAttrs} from "../gui/base/TextFieldN"
import stream from "mithril/stream/stream.js"
import {Keys} from "../api/common/TutanotaConstants"
import {TemplatePopupResultRow} from "./TemplatePopupResultRow"
import type {Template} from "./TemplateModel"
import {Icons} from "../gui/base/icons/Icons"
import {Icon} from "../gui/base/Icon"
import {ButtonN, ButtonType} from "../gui/base/ButtonN"
import {TemplateExpander} from "./TemplateExpander"
import {theme} from "../gui/theme"
import type {LanguageCode} from "../misc/LanguageViewModel"
import {lang, languageByCode} from "../misc/LanguageViewModel"
import {Dialog} from "../gui/base/Dialog"
import {DropDownSelector} from "../gui/base/DropDownSelector"
import {windowFacade} from "../misc/WindowFacade"
import {templateModel} from "./TemplateModel"

export const TEMPLATE_POPUP_HEIGHT = 340;
export const TEMPLATE_POPUP_TWO_COLUMN_MIN_WIDTH = 600;
export const TEMPLATE_LIST_ENTRY_HEIGHT = 47;//47.7167;
export type NavAction = string;

export class TemplatePopup implements ModalComponent {
	_rect: PosRect
	_filterTextAttrs: TextFieldAttrs
	_shortcuts: Shortcut[]
	_scrollDom: HTMLElement

	_onSubmit: (string) => void

	_currentIndex: number = 0
	_initialWindowWidth: number

	_selectedLanguage: Stream<LanguageCode>
	_availableLanguages: Array<Object>

	_filterTextFieldDom: HTMLElement
	_dropdownDom: HTMLElement

	constructor(rect: PosRect, onSubmit: (string) => void, highlightedText: string) {
		this._initialWindowWidth = window.innerWidth
		templateModel.setSelectedTemplate(templateModel.containsResult() ? templateModel.getSearchResults()[0] : null) // -> calls search results -> search results arent initialized without search()
		templateModel.setSelectedLanguage(templateModel.containsResult() ? Object.keys(templateModel.getSearchResults()[0].content)[0] : "en")
		this._rect = rect
		this._onSubmit = onSubmit

		// initial search
		templateModel.search(highlightedText)

		this._filterTextAttrs = {
			label: "templateFilter_label",
			value: stream(highlightedText),
			focusOnCreate: true,
			oninput: (input) => { /* Filter function */
				this._currentIndex = 0
				templateModel.search(input)
				templateModel.setSelectedTemplate(templateModel.getSearchResults() ? templateModel.getSearchResults()[0] : null)
			},
			onInputCreate: (vnode) => {
				this._filterTextFieldDom = vnode.dom
			}
		}
		this._shortcuts = [
			{
				key: Keys.ESC,
				enabled: () => true,
				exec: () => {
					this._close()
					m.redraw()
				},
				help: "closeTemplate_action"
			},
			{
				key: Keys.RETURN,
				enabled: () => true,
				exec: () => {
					this._sizeDependingSubmit()
				},
				help: "insertTemplate_action"
			},
		]

		windowFacade.addResizeListener(() => {
			this._close()
		})
	}

	view: () => Children = () => {
		const showTwoColumns = this._isScreenWideEnough()
		return m(".flex.abs.elevated-bg.plr.border-radius.dropdown-shadow", { // Main Wrapper
				style: {
					width: px(this._rect.width),
					height: px(TEMPLATE_POPUP_HEIGHT),
					top: px(this._rect.top),
					left: px(this._rect.left)
				},
				onclick: (e) => {
					// prevent closing pop up
					e.stopPropagation()
				},
			}, [
				m(".flex.flex-column.flex-grow-shrink-half" + (showTwoColumns ? ".pr" : ""), this._renderLeftColumn()),
				showTwoColumns ? m(".flex.flex-column.flex-grow-shrink-half", this._renderRightColumn()) : null,
			],
		)
	}

	_renderLeftColumn(): Children {
		return [
			m(".mt-negative-s", { // Header Wrapper
				onkeydown: (e) => { /* simulate scroll with arrow keys */
					if (e.keyCode === Keys.DOWN.code) { // DOWN
						this._changeSelectionViaKeyboard("next")
					} else if (e.keyCode === Keys.UP.code) { // UP
						e.preventDefault()
						this._changeSelectionViaKeyboard("previous")
					} else if (e.keyCode === Keys.TAB.code) { // TAB
						e.preventDefault()
						if (this._isScreenWideEnough()) {
							this._dropdownDom.focus()
						}
					}
				},
			}, m(TextFieldN, this._filterTextAttrs)), // Filter Text
			m(".flex.flex-column.scroll.", { // left list
					oncreate: (vnode) => {
						this._scrollDom = vnode.dom
					},
				}, templateModel.containsResult() ?
				templateModel.getSearchResults().map((template, index) => this._renderTemplateListRow(template, index))
				: m(".row-selected.text-center.pt", "Nothing found")
			), // left end
		]
	}

	_renderTemplateListRow(template: Template, index: number): Children {
		return m(".flex.flex-column.click", {
				style: {
					backgroundColor: (index % 2) ? theme.list_bg : theme.list_alternate_bg
				}
			}, [
				m(".flex.folder-row-no-margin" + (templateModel.isSelectedTemplate(template) ? ".row-selected" : ""), {
						onclick: (e) => {
							this._currentIndex = index // navigation via mouseclick
							this._filterTextFieldDom.focus()
							templateModel.setSelectedTemplate(template)
							templateModel.updateSelectedLanguage()
							e.stopPropagation()
						},
					}, [
						m(TemplatePopupResultRow, {template}),
						templateModel.isSelectedTemplate(template) ? m(Icon, {
							icon: Icons.ArrowForward,
							style: {marginTop: "auto", marginBottom: "auto"}
						}) : m("", {style: {width: "17.1px", height: "16px"}}),
					]
				)
			]
		)
	}

	_renderRightColumn(): Children {
		const template = templateModel.getSelectedTemplate()
		if (template) {
			return [
				m(TemplateExpander, {
					template,
					language: templateModel.getSelectedLanguage(),
					onDropdownCreate: (vnode) => {
						this._dropdownDom = vnode.dom
					},
					onLanguageSelected: (lang) => {
						templateModel.setSelectedLanguage(lang)
					},
					onReturnFocus: () => {
						this._filterTextFieldDom.focus()
					}
				}),
				m(".flex", {
					style: {
						justifyContent: "right"
					}
				}, [
					m(ButtonN, {
						label: () => "Submit",
						click: (e) => {
							this._onSubmit(template.content[templateModel.getSelectedLanguage()])
							this._close()
							e.stopPropagation()
						},
						type: ButtonType.Primary,
					}),
				])
			]
		} else {
			return null
		}
	}

	_isScreenWideEnough(): boolean {
		return window.innerWidth > (TEMPLATE_POPUP_TWO_COLUMN_MIN_WIDTH)
	}

	_getWindowWidthChange(): number {
		return window.innerWidth - this._initialWindowWidth
	}

	_sizeDependingSubmit() { // Allow option for when screen isn't wide enough, open a Dialog to confirm language
		const selectedTemplate = templateModel.getSelectedTemplate()
		const language = templateModel.getSelectedLanguage()
		if (this._isScreenWideEnough() && selectedTemplate) { // if screen is wide enough, submit content
			this._onSubmit(selectedTemplate.content[language])
			this._close()
			m.redraw()
		} else if (!this._isScreenWideEnough() && selectedTemplate) { // if screen isn't wide enough get all languages from the selected template
			let languages = (Object.keys(selectedTemplate.content)).map(code => {
				return {name: lang.get(languageByCode[code].textId), value: code}
			})
			if (languages.length > 1) { // if you have multiple languages for the selected template show a dropdown where you have to select a language and then submit
				let selectedLanguage: Stream<LanguageCode> = stream(languages[0].value)
				let languageChooser = new DropDownSelector("chooseLanguage_action", null, languages, selectedLanguage, 250)
				let submitContentAction = (dialog) => {
					if (selectedTemplate) {
						this._onSubmit(selectedTemplate.content[selectedLanguage()])
						dialog.close()
						this._close()
						m.redraw()
					}
				}
				Dialog.showActionDialog({
					title: lang.get("chooseLanguage_action"),
					child: {view: () => m(languageChooser)},
					allowOkWithReturn: true,
					okAction: submitContentAction
				})
			} else if (languages.length === 1 && selectedTemplate) { // if you only have one language for the selected template, submit without showing the dropdown
				this._onSubmit(selectedTemplate.content[language])
				this._close()
				m.redraw()
			}
		}
	}

	_changeSelectionViaKeyboard(action: NavAction) { /* count up or down in templates */
		if (action === "next" && this._currentIndex <= templateModel.getSearchResults().length - 2) {
			this._currentIndex++
			this._scroll()

		} else if (action === "previous" && this._currentIndex > 0) {
			this._currentIndex--
			this._scroll()
		}
		templateModel.setSelectedTemplate(templateModel.getSearchResults()[this._currentIndex])
		templateModel.updateSelectedLanguage()

	}

	_scroll() {
		this._scrollDom.scroll({
			top: (TEMPLATE_LIST_ENTRY_HEIGHT * this._currentIndex),
			left: 0,
			behavior: 'smooth'
		})
	}

	show() {
		modal.display(this, false)
	}

	_close(): void {
		modal.remove(this)
	}

	backgroundClick(e: MouseEvent): void {
		this._close()
		console.log(e.target)
	}

	hideAnimation(): Promise<void> {
		return Promise.resolve()
	}

	onClose(): void {
	}

	shortcuts(): Shortcut[] {
		return this._shortcuts
	}

	popState(e: Event): boolean {
		return true
	}
}