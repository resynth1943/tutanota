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
import {Icons} from "../gui/base/icons/Icons"
import {Icon} from "../gui/base/Icon"
import {TemplateExpander} from "./TemplateExpander"
import {theme} from "../gui/theme"
import type {LanguageCode} from "../misc/LanguageViewModel"
import {lang, languageByCode} from "../misc/LanguageViewModel"
import {Dialog} from "../gui/base/Dialog"
import {DropDownSelector} from "../gui/base/DropDownSelector"
import {windowFacade} from "../misc/WindowFacade"
import {templateModel} from "./TemplateModel"
import {isKeyPressed} from "../misc/KeyManager"
import type {EmailTemplate} from "../api/entities/tutanota/EmailTemplate"
import {getLanguageCode} from "../settings/TemplateEditorModel"
import type {ButtonAttrs} from "../gui/base/ButtonN"
import {ButtonN, ButtonType} from "../gui/base/ButtonN"
import {locator} from "../api/main/MainLocator"
import {TemplateEditor} from "../settings/TemplateEditor"

export const TEMPLATE_POPUP_HEIGHT = 340;
export const TEMPLATE_POPUP_TWO_COLUMN_MIN_WIDTH = 600;
export const TEMPLATE_LIST_ENTRY_HEIGHT = 47;
export const TEMPLATE_LIST_ENTRY_WIDTH = 354;
export const SELECT_NEXT_TEMPLATE = "next";
export const SELECT_PREV_TEMPLATE = "previous";
export type NavAction = "previous" | "next";

/**
*	Creates a Modal/Popup that allows user to paste templates directly into the MailEditor.
*	Also allows user to change desired language when pasting.
*/

export class TemplatePopup implements ModalComponent {
	_rect: PosRect
	_filterTextAttrs: TextFieldAttrs
	_addTemplateButtonAttrs: ButtonAttrs
	_shortcuts: Shortcut[]
	_scrollDom: HTMLElement
	_onSubmit: (string) => void
	_initialWindowWidth: number
	_filterTextFieldDom: HTMLElement
	_dropdownDom: HTMLElement
	_resizeListener: windowSizeListener
	_redrawStream: Stream<*>

	constructor(rect: PosRect, onSubmit: (string) => void, highlightedText: string) {
		this._rect = rect
		this._onSubmit = onSubmit
		this._initialWindowWidth = window.innerWidth
		this._resizeListener = () => {
			console.log("popup resize listener")
			this._close()
		}

		// initial search
		templateModel.search(highlightedText)

		this._filterTextAttrs = {
			label: "templateFilter_label",
			value: stream(highlightedText),
			focusOnCreate: true,
			oninput: (input) => { /* Filter function */
				templateModel.search(input)
				this._scroll()
			},
			onInputCreate: (vnode) => {
				this._filterTextFieldDom = vnode.dom
			},
			injectionsRight: () => m(ButtonN, this._addTemplateButtonAttrs)
		}
		this._addTemplateButtonAttrs = {
			label: "createTemplate_action",
			type: ButtonType.Action,
			click: () => {
				locator.mailModel.getUserMailboxDetails().then(details => {
					if (details.mailbox.templates && details.mailbox._ownerGroup) {
						new TemplateEditor(null, details.mailbox.templates.list, details.mailbox._ownerGroup, locator.entityClient)
					}
				})
			},
			icon: () => Icons.Add,
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
		this._redrawStream = templateModel.getSearchResults().map(() => m.redraw())
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
					e.stopPropagation()
				},
				oncreate: () => {
					windowFacade.addResizeListener(this._resizeListener)
				},
				onremove: () => {
					windowFacade.removeResizeListener(this._resizeListener)
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
					if (isKeyPressed(e.keyCode, Keys.DOWN, Keys.UP)) { // DOWN
						const changedSelection = templateModel.selectNextTemplate(isKeyPressed(e.keyCode, Keys.UP)
							? SELECT_PREV_TEMPLATE
							: SELECT_NEXT_TEMPLATE)
						if (changedSelection) {
							this._scroll()
						}
					} else if (isKeyPressed(e.keyCode, Keys.TAB)) { // TAB
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
				templateModel.getSearchResults()().map((template, index) => this._renderTemplateListRow(template, index))
				: m(".row-selected.text-center.pt", lang.get(templateModel.hasLoaded() ? "nothingFound_label" : "loadingTemplates_label"))
			), // left end
		]
	}

	_renderTemplateListRow(template: EmailTemplate, index: number): Children {
		return m(".flex.flex-column.click", {
				style: {
					maxWidth: this._isScreenWideEnough() ? px(TEMPLATE_LIST_ENTRY_WIDTH) : px(this._rect.width - 20), // subtract 20px because of padding left and right
					backgroundColor: (index % 2) ? theme.list_bg : theme.list_alternate_bg
				}
			}, [
				m(".flex.template-list-row" + (templateModel.isSelectedTemplate(template) ? ".row-selected" : ""), {
						onclick: (e) => {
							this._filterTextFieldDom.focus()
							templateModel.setSelectedTemplate(template)
							e.stopPropagation()
						},
					}, [
						m(TemplatePopupResultRow, {template: template}),
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
					template: template,
					model: templateModel,
					onDropdownCreate: (vnode) => {
						this._dropdownDom = vnode.dom
					},
					onReturnFocus: () => {
						this._filterTextFieldDom.focus()
					},
					onSubmitted: (text) => {
						this._onSubmit(text)
						this._close()
					}
				})
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
			this._onSubmit(templateModel.getContentFromLanguage(language))
			this._close()
			m.redraw()
		} else if (!this._isScreenWideEnough() && selectedTemplate) { // if screen isn't wide enough get all languages from the selected template
			let languages = selectedTemplate.contents.map(content => {
				const languageCode = getLanguageCode(content)
				return {
					name: lang.get(languageByCode[languageCode].textId),
					value: languageCode
				}
			})
			if (languages.length > 1) { // if you have multiple languages for the selected template show a dropdown where you have to select a language and then submit
				let selectedLanguage: Stream<LanguageCode> = stream(languages[0].value)
				let languageChooser = new DropDownSelector("chooseLanguage_action", null, languages, selectedLanguage, 250)
				let submitContentAction = (dialog) => {
					if (selectedTemplate) {
						this._onSubmit(templateModel.getContentFromLanguage(selectedLanguage()))
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
				this._onSubmit(templateModel.getContentFromLanguage(language))
				this._close()
				m.redraw()
			}
		}
	}

	_scroll() {
		this._scrollDom.scroll({
			top: (TEMPLATE_LIST_ENTRY_HEIGHT * templateModel.getSelectedTemplateIndex()),
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
	}

	hideAnimation(): Promise<void> {
		return Promise.resolve()
	}

	onClose(): void {
		templateModel.dispose()
		this._redrawStream.end(true)
	}

	shortcuts(): Shortcut[] {
		return this._shortcuts
	}

	popState(e: Event): boolean {
		return true
	}
}