// @flow
import stream from "mithril/stream/stream.js"
import {lang} from "../misc/LanguageViewModel"
import m from "mithril"
import type {ButtonAttrs} from "../gui/base/ButtonN"
import {ButtonN, ButtonType, ButtonColors} from "../gui/base/ButtonN"
import {deviceConfig} from "../misc/DeviceConfig"
import type {EntityUpdateData} from "../api/main/EventController"
import type {TextFieldAttrs} from "../gui/base/TextFieldN"
import {TextFieldN} from "../gui/base/TextFieldN"
import type {TableAttrs, TableLineAttrs} from "../gui/base/TableN"
import {ColumnWidth, TableN} from "../gui/base/TableN"
import {SettingsView} from "./SettingsView"
import {Icons} from "../gui/base/icons/Icons"
import {HtmlEditor} from "../gui/base/HtmlEditor"
import {CryptoError} from "../api/common/error/CryptoError"
import {List} from "../gui/base/List"
import {assertNotNull} from "../api/common/utils/Utils"
import {createDropdown} from "../gui/base/DropdownN"

export class TemplateSettingsViewer implements UpdatableSettingsViewer {
	templateList: ListObject[];
	_templateTableLines: Stream<Array<TableLineAttrs>>;
	_enableTemplates: Stream<?boolean>;
	_templatesExpanded: Stream<boolean>;
	_templateFilter: Stream<string>;
	_templateTitleName: Stream<string>;
	_templateContent: Stream<string>;
	_openTemplateEditor: SettingsView;
	_selectedLanguage: string;
	_checked: boolean;
	_titleInput: string = "";
	_idInput: ?string = "";
	_contentInput: ?string = "";
	_settingsView: SettingsView;
	_templateID: Stream<string>
	mentionedInlineImages: Array<string>;
	_templateOpen: boolean = true
	_existingTitle: Stream<string>
	_existingID: Stream<string>
	_existingContent: Stream<string>
	_editor: HtmlEditor
	_notNull: boolean
	_keyList: Array<any>
	_view: boolean
	_new: boolean

	constructor(settingsView: SettingsView) {
		this._settingsView = settingsView
		if (typeof (deviceConfig.getTemplatesEnabled()) !== "undefined") {
			this._enableTemplates = deviceConfig.getTemplatesEnabled()
		}

		this._templatesExpanded = stream(false)
		this._templateFilter = stream("")
		this._templateTitleName = stream("")
		this._templateID = stream("")
		this._templateContent = stream("")
		this.templateList = []
		if (localStorage.getItem("Templates") !== null) {
			this._notNull = true
		} else {
			this._notNull = false
			console.log("Local Storage is empty, creating empty table")
		}
		this._view = true

	}

	view(): Children {

		const editor = new HtmlEditor("templateTable_content")
			.showBorders()
			.setMinHeight(200)

		const filterSettingTemplatesAttrs: TextFieldAttrs = {
			label: "templateFilter_label",
			value: this._templateFilter,
		}

		const templateTableButtonAttrs: ButtonAttrs = {
			label: "addInboxRule_action",
			icon: () => Icons.Add,
			click: () => {
				this._new = true
				this._view = true
				this._templateTitleName = stream("")
				this._templateID = stream("")
				this._templateContent = stream("")
				this._renderCreateOrEdit(editor)

			}
		}

		const templateTableAttrs: TableAttrs = {
			columnHeading: ["templateTable_title", "templateTable_id"],
			columnWidths: [ColumnWidth.Small, ColumnWidth.Small],
			showActionButtonColumn: true,
			addButtonAttrs: templateTableButtonAttrs,
			lines: this._notNull ? this._returnTableLines(editor) : []
		}

		return [
			m("#user-settings.fill-absolute.scroll.plr-l.pb-xl", [
				m(".h3.mt-l", [
					lang.get("templateMain_label"),
					// m(DropDownSelectorN, enableTemplateAttrs),
				]),
				m(".flex-space-between.items-center.mt-l.mb-s", [
					m("", [
						m(".mb-l", {onkeydown: (e) => e.stopPropagation()},
							m(TextFieldN, filterSettingTemplatesAttrs)),
						m(TableN, templateTableAttrs),
					])
				])
			])
		]
	}

	_returnTableLines(editor: HtmlEditor): Function {
		this._keyList = JSON.parse(assertNotNull(localStorage.getItem("Templates")))
		if (this._notNull) {
			return this._keyList.map((key, index) => {
				return {
					cells: [key.title, key.id],
					actionButtonAttrs: {
						label: () => "Custom Label",
						icon: () => Icons.More,
						click: createDropdown(() => {
							let twoButtons = []
							twoButtons.push({
								colors: ButtonColors.Header,
								label: () => "Edit",
								click: () => {
									this._view = true
									this._existingTitle = stream(this._keyList[index].title)
									this._existingID = stream(this._keyList[index].id)
									this._existingContent = stream(this._keyList[index].content)
									this._new = false
									this._renderCreateOrEdit( editor, index)
									editor.setValue(this._existingContent())
								},
								icon: () => Icons.Edit,
								type: ButtonType.Dropdown
							})
							twoButtons.push({
								colors: ButtonColors.Header,
								label: () => "Remove",
								click: () => this.removeTemplate(index),
								icon: () => Icons.Trash,
								type: ButtonType.Dropdown
							})
							return twoButtons
						})
					}
				}
			})
		}
	}

	submitEdit(index: number, title: string, id: string, content: string) {
		this._keyList[index].title = title
		this._keyList[index].id = id
		this._keyList[index].content = content
		localStorage.setItem("Templates", JSON.stringify(this._keyList))
	}

	removeTemplate(index: number) {
		this._view = false
		this._keyList.splice(index, 1)
		localStorage.setItem("Templates", JSON.stringify(this._keyList))
	}

	newListObject(): ListObject {
		return {
			title: this._titleInput,
			id: this._idInput,
			content: this._contentInput
		}
	}

	pushToList(object: ListObject) {
		if (object.title !== "" && typeof (object.title) !== "undefined") {
			this.templateList.push(object)
			console.log(this.templateList)
		} else {
			alert("Title can't be empty")
		}
	}

	store(item: ListObject) {
		const previousArray = localStorage.getItem("Templates")
		let newArray = []
		if (previousArray) {
			newArray = JSON.parse(previousArray)
			newArray.push(item)
			localStorage.setItem("Templates", JSON.stringify(newArray))
		} else {
			newArray.push(item)
			localStorage.setItem("Templates", JSON.stringify(newArray))
		}
	}

	entityEventsReceived(updates: $ReadOnlyArray<EntityUpdateData>): Promise<void> {
		return Promise.each(updates, update => {
			let p = Promise.resolve()
			return p.then(() => {
			})
		}).then(() => m.redraw())
	}

	_renderCreateOrEdit(editor: HtmlEditor, index?: number) {
		this._templateTitleName = stream("")
		this._templateID = stream("")
		this._templateContent = stream("")
		this._settingsView.detailsViewer = {
			view: () => this._view ? m(".flex.mlr.col", {
				onkeydown: (e) => {
					e.stopPropagation()
				}
			}, [
				m(".flex.row.flex-grow-shrink-auto", [
					m(TextFieldN, this._new ? {
						label: "templateTable_title",
						value: this._templateTitleName,
						oninput: (title) => {
							title = title.trim()
							this._titleInput = title
						}
					} : {
						label: () => "Title",
						value: this._existingTitle,
						oninput: () => console.log("input")
					}),
					m(".ml-l", [
						m(TextFieldN, this._new ? {
							label: "templateTable_id",
							value: this._templateID,
							oninput: (id) => {
								id = id.trim()
								if (id !== "") {
									this._idInput = id
								} else {
									this._idInput = null
								}
							}
						} : {
							label: () => "ID",
							value: this._existingID,
							oninput: () => console.log("input")
						})
					])
				]),
				m(".pt-s.text.scroll-x.break-word-links", {style: {width: "800px"}}, [
					m(editor)
				]),
				m("", {
					style: {
						width: "320px"
					}
				}, m(ButtonN, this._new ? {
					label: "templateSubmit_label",
					type: "bubble",
					click: () => {
						if (this._templateTitleName !== "") {
							this._templateTitleName = stream("")
							this._templateID = stream("")
							this._templateContent = stream("")
							this._contentInput = editor.getValue()
							console.log("SubmitButton ", this._templateOpen)
							this.store(this.newListObject())
							this._notNull = true
							this._view = false
						} else {
							alert("Title can't be empty!")
						}
					}
				} : {
					label: () => "Edit",
					type: "bubble",
					click: () => { // submit edit
						this._view = false
						this.submitEdit(assertNotNull(index), this._existingTitle(), this._existingID(), editor.getValue())
						this._existingContent = stream("")
						this._existingID = stream("")
						editor.setValue("")
					}
				})),
			]) : null,
			entityEventsReceived: () => Promise.resolve(),
		}
	}
}

export type ContentAttrs = {
	value: Stream<string>,
}

export type ListObject = {
	title: string,
	id: ?string,
	content: ?string,
}