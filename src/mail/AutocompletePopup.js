//@flow
import m from "mithril"
import type {ModalComponent} from "../gui/base/Modal"
import {modal} from "../gui/base/Modal"
import {px} from "../gui/size"
import type {Shortcut} from "../misc/KeyManager"
import type {PosRect} from "../gui/base/Dropdown"
import type {TextFieldAttrs} from "../gui/base/TextFieldN"
import {TextFieldN} from "../gui/base/TextFieldN"
import stream from "mithril/stream/stream.js"
import {Keys} from "../api/common/TutanotaConstants"
import type {TemplateDisplayAttrs} from "./TemplateDisplay"
import {TemplateDisplay} from "./TemplateDisplay"
import {searchForID, searchInContent} from "./TemplateSearchFilter.js"
import {assertNotNull} from "../api/common/utils/Utils"

export class AutocompletePopup implements ModalComponent {
	_rect: PosRect
	_filterTextAttrs: TextFieldAttrs
	_shortcuts: Shortcut[]
	_scrollDom: HTMLElement

	_allTemplates: Array<TemplateDisplayAttrs>
	_searchResults: Array<TemplateDisplayAttrs>

	_onSubmit: (string) => void

	_selected: boolean
	_foundResults: boolean
	_cursorHover: boolean
	_height: string
	_currentindex: number = 0


	constructor(rect: PosRect, onSubmit: (string) => void) {
		this._height = "270px"
		this._foundResults = true
		this._allTemplates = this.LoadTemplates()
		this._searchResults = this._allTemplates
		this._setProperties()
		this._rect = rect
		this._onSubmit = onSubmit
		this._filterTextAttrs = {
			label: () => "Filter... (# to search for id's)",
			value: stream(""),
			focusOnCreate: true,
			oninput: (input) => { /* Filter function */
				if (input === "") {
					this._searchResults = this._allTemplates
					this._setProperties()
				} else if (input.charAt(0) === "#") { // search ID
					this._searchResults = searchForID(input, this._allTemplates)
					this._setProperties()
				} else { // search title / content
					this._searchResults = searchInContent(input, this._allTemplates)
					this._setProperties()
				}

			}
		}
		this._shortcuts = [
			{
				key: Keys.ESC,
				enabled: () => true,
				exec: () => {
					this._onSubmit("")
					this._close()
					m.redraw()
				},
				help: "closeSession_action"
			},
			{
				key: Keys.RETURN,
				enabled: () => true,
				exec: () => {
					this._onSubmit(this._searchResults[this._currentindex].content) // TODO: Remove filter text and #
					this._close()
					m.redraw()
				},
				help: "closeSession_action"
			},
		]
	}

	view: () => Children = () => {
		return m(".flex.abs.elevated-bg.plr.border-radius.dropdown-shadow", { // Main Wrapper
				style: {
					width: "600px",
					margin: "1px",
					top: px(this._rect.top),
					left: px(this._rect.left),
					flexDirection: "column",
					height: this._height + "px",
					cursor: this._cursorHover ? "pointer" : "default",
				},
				onclick: (e) => {
					e.stopPropagation() /* stops click from going through component*/
				},
			}, [
				m(".flex", { // Header Wrapper
					style: {
						flexDirection: "row",
						height: "70px",
						marginBottom: "-18px",
					},
					onkeydown: (e) => { /* simulate scroll with arrow keys */
						if (e.keyCode === 27) { // ESC
							this._close
						} else if (e.keyCode === 40) { // DOWN
							this._changeSelection("next")
							this._scrollDom.scroll({
								top: (93 * this._currentindex),
								left: 0,
								behavior: 'smooth'
							})
						} else if (e.keyCode === 38) { // UP
							e.preventDefault()
							this._changeSelection("previous")
							this._scrollDom.scroll({
								top: (93 * this._currentindex),
								left: 0,
								behavior: 'smooth'
							})
						}
					},
				}, [
					m("", {
							style: {
								marginTop: "-10px",
								flex: "1 0 auto"
							},
						}, m(TextFieldN, this._filterTextAttrs)
					), // Filter Text
				]), // Header Wrapper END
				m(".flex.flex-column.scroll", { // Template Text
						style: {
							height: this._height,
							overflowY: "show"
						},
						oncreate: (vnode) => {
							this._scrollDom = vnode.dom
						},
					}, this._foundResults ?
					this._searchResults.map((templateAttrs, index) => {
						this._selected = index === this._currentindex
						return m("", {
							onclick: (e) => {
								this._onSubmit(this._searchResults[index].content)
								this._close()
								e.stopPropagation()
							},
							onmouseover: () => this._cursorHover = true,
							onmouseleave: () => this._cursorHover = false,
							class: this._selected ? "row-selected" : "", /* show row as selected when using arrow keys */
							style: {
								borderLeft: this._selected ? "4px solid" : "4px solid transparent",
							}
						}, m(TemplateDisplay, templateAttrs))
					})
					: m("", "Nothing found")
				), // Template Text END
			]
		)
	}

	_setProperties() { /* calculate height with certain amount of templates and reset selection to first template */
		if (this._searchResults.length === 0) {
			this._foundResults = false
			this._height = "40px"
		} else if (this._searchResults.length === 1) {
			this._height = "110px"
			this._foundResults = true
		} else if (this._searchResults.length === 2) {
			this._height = "190px"
			this._foundResults = true
		} else if (this._searchResults.length >= 3) {
			this._height = "270px"
			this._foundResults = true
		}
		this._currentindex = 0
	}

	_changeSelection(action: string) { /* count up or down in templates */
		if (action === "next" && this._currentindex <= this._searchResults.length - 2) {
			this._currentindex++
		}
		if (action === "previous" && this._currentindex > 0) {
			this._currentindex--
		}
	}

	show() {
		modal.displayUnique(this, false)
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
	}

	shortcuts(): Shortcut[] {
		return this._shortcuts
	}

	popState(e: Event): boolean {
		return true
	}

	LoadTemplates(): Array<TemplateDisplayAttrs> {
		let templates = localStorage.getItem("Templates")
		if (templates !== null) {
			templates = assertNotNull(templates)
			return JSON.parse(templates)
		} else {
			return []
		}
	}
}