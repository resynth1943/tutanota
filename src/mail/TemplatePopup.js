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
import {searchForTag, searchInContent} from "./TemplateSearchFilter.js"
import type {Template} from "../settings/TemplateListView"
import {loadTemplates} from "../settings/TemplateListView"
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

export const TEMPLATE_POPUP_HEIGHT = 340;
export const TEMPLATE_POPUP_TWO_COLUMN_MIN_WIDTH = 500;

export class TemplatePopup implements ModalComponent {
	_rect: PosRect
	_filterTextAttrs: TextFieldAttrs
	_shortcuts: Shortcut[]
	_scrollDom: HTMLElement

	_allTemplates: Array<Template>
	_searchResults: Array<Template>
	_selectedTemplate: ?Template

	_onSubmit: (string) => void

	_selected: boolean
	_expanded: boolean
	_currentIndex: number = 0
	_initialWindowWidth: number

	_selectedLanguage: Stream<LanguageCode>
	_availableLanguages: Array<Object>

	_filterTextFieldDom: HTMLElement
	_dropdownDom: HTMLElement

	constructor(rect: PosRect, onSubmit: (string) => void, highlightedText: string) {
		this._initialWindowWidth = window.innerWidth
		this._allTemplates = loadTemplates()
		this._selectedLanguage = stream(Object.keys(this._allTemplates[0].content)[0])
		this._searchResults = this._allTemplates
		this._selectedTemplate = this._searchResults.length ? this._searchResults[0] : null
		this._rect = rect
		this._onSubmit = onSubmit

		// initial search
		this.search(highlightedText)

		this._filterTextAttrs = {
			label: "templateFilter_label",
			value: stream(highlightedText),
			focusOnCreate: true,
			oninput: (input) => { /* Filter function */
				this.search(input)
				this._selectedTemplate = this._searchResults ? this._searchResults[0] : null
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

	search(text: string): void {
		this._currentIndex = 0
		if (text === "") {
			this._searchResults = this._allTemplates
		} else if (text.charAt(0) === "#") {
			this._searchResults = searchForTag(text, this._allTemplates)
		} else {
			this._searchResults = searchInContent(text, this._allTemplates)
		}
		this._updateSelectedLanguage()
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
					if (e.keyCode === 40) { // DOWN
						this._changeSelectionViaKeyboard("next")
					} else if (e.keyCode === 38) { // UP
						e.preventDefault()
						this._changeSelectionViaKeyboard("previous")
					} else if (e.keyCode === 9) { // TAB
						e.preventDefault()
						if (this._isScreenWideEnough()) {
							this._dropdownDom.focus()
						}
					}
				},
			}, m(TextFieldN, this._filterTextAttrs)), // Filter Text
			m(".flex.flex-column.scroll.pt-xs.pb-xs", { // left list
					oncreate: (vnode) => {
						this._scrollDom = vnode.dom
					},
				}, this._containsResult() ?
				this._searchResults.map((template, index) => this._renderTemplateListRow(template, index))
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
				m(".flex.folder-row" + (this._isSelectedTemplate(template) ? ".row-selected" : ""), {
						onclick: (e) => {
							this._currentIndex = index // navigation via mouseclick
							this._filterTextFieldDom.focus()
							this._selectedTemplate = template
							this._selectedLanguage = stream(Object.keys(template.content)[0])
							e.stopPropagation()
						},
					}, [
						m(TemplatePopupResultRow, {template}),
						this._isSelectedTemplate(template) ? m(Icon, {
							icon: Icons.ArrowForward,
							style: {marginTop: "auto", marginBottom: "auto"}
						}) : m("", {style: {width: "17.1px", height: "16px"}}),
					]
				)
			]
		)
	}

	_renderRightColumn(): Children {
		const template = this._selectedTemplate
		if (template) {
			return [
				m(TemplateExpander, {
					template,
					language: this._selectedLanguage(),
					onDropdownCreate: (vnode) => {
						this._dropdownDom = vnode.dom
					},
					onLanguageSelected: (lang) => {
						this._selectedLanguage(lang)
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
							this._onSubmit(template.content[this._selectedLanguage()])
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


	_isSelected(index: number): boolean {
		return (index === this._currentIndex)
	}

	_setSelectedTemplate(template: Template) {
		this._selectedTemplate = template
	}

	_isSelectedTemplate(template: Template): boolean {
		return (this._selectedTemplate === template)
	}

	_containsResult(): boolean {
		return this._searchResults.length > 0
	}

	_updateSelectedLanguage() {
		if (this._selectedTemplate && this._searchResults.length) {
			this._selectedLanguage(Object.keys(this._selectedTemplate.content)[0])
		}
	}

	_isScreenWideEnough(): boolean {
		return window.innerWidth > (TEMPLATE_POPUP_TWO_COLUMN_MIN_WIDTH)
	}

	_getWindowWidthChange(): number {
		return window.innerWidth - this._initialWindowWidth
	}

	_sizeDependingSubmit() {
		if (this._isScreenWideEnough() && this._selectedTemplate) {
			this._onSubmit(this._selectedTemplate.content[this._selectedLanguage()])
			this._close()
			m.redraw()
		} else if (!this._isScreenWideEnough() && this._selectedTemplate) {
			let languages = (Object.keys(this._selectedTemplate.content)).map(code => {
				return {name: lang.get(languageByCode[code].textId), value: code}
			})
			if (languages.length > 1) {
				let selectedLanguage: Stream<LanguageCode> = stream(languages[0].value)
				let languageChooser = new DropDownSelector("chooseLanguage_action", null, languages, selectedLanguage, 250)
				let submitContentAction = (dialog) => {
					if (this._selectedTemplate) {
						this._onSubmit(this._selectedTemplate.content[selectedLanguage()])
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
			} else if (languages.length === 1 && this._selectedTemplate) {
				this._onSubmit(this._selectedTemplate.content[this._selectedLanguage()])
				this._close()
				m.redraw()
			}
		}
	}

	_changeSelectionViaKeyboard(action: string) { /* count up or down in templates */
		if (action === "next" && this._currentIndex <= this._searchResults.length - 2) {
			this._currentIndex++
			this._scrollDom.scroll({
				top: (47.7167 * this._currentIndex),
				left: 0,
				behavior: 'smooth'
			})

		} else if (action === "previous" && this._currentIndex > 0) {
			this._currentIndex--
			this._scrollDom.scroll({
				top: (47.7167 * this._currentIndex),
				left: 0,
				behavior: 'smooth'
			})
		}
		this._setSelectedTemplate(this._searchResults[this._currentIndex])
		this._updateSelectedLanguage()
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