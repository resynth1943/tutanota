// @flow
import stream from "mithril/stream/stream.js"
import {lang} from "../misc/LanguageViewModel"
import m from "mithril"
import type {ButtonAttrs} from "../gui/base/ButtonN"
import {ButtonN} from "../gui/base/ButtonN"
import {deviceConfig} from "../misc/DeviceConfig"
import type {EntityUpdateData} from "../api/main/EventController"
import type {TextFieldAttrs} from "../gui/base/TextFieldN"
import {TextFieldN, Type as TextFieldType} from "../gui/base/TextFieldN"
import type {TableAttrs, TableLineAttrs} from "../gui/base/TableN"
import {ColumnWidth, TableN} from "../gui/base/TableN"
import {SettingsView} from "./SettingsView"
import {Icons} from "../gui/base/icons/Icons"
import type {InputField} from "../api/entities/tutanota/InputField"
import {Editor} from "../gui/base/Editor"
import type {TemplateDisplayAttrs} from "../mail/TemplateDisplay"
import {assertNotNull} from "../api/common/utils/Utils"

export class TemplateSettingsViewer implements UpdatableSettingsViewer {
	editorDom: HTMLElement;
	editor: Editor;
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
	_templateOpen: boolean = true;
	mentionedInlineImages: Array<string>;

	constructor(settingsView: SettingsView) {

		this._settingsView = settingsView
		if (typeof (deviceConfig.getTemplatesEnabled()) !== "undefined") {
			this._enableTemplates = deviceConfig.getTemplatesEnabled()
		}

		this._templatesExpanded = stream(false)
		this._templateTableLines = stream([])
		this._templateFilter = stream("")
		this._templateTitleName = stream("")
		this._templateID = stream("")
		this._templateContent = stream("")
		this.templateList = this.loadTemplates()
	}

	view(): Children {

		const editTemplateTitleAttrs: TextFieldAttrs = {
			label: "templateTable_title",
			value: this._templateTitleName,
			oninput: (title) => {
				title = title.trim()
				this._titleInput = title
			}
		}

		const editTemplateIDAttrs: TextFieldAttrs = {
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
		}

		const editTemplateContentAttrs: ContentAttrs = {
			value: this._templateContent,
			oncreate: (vnode) => this.editorDom = vnode.dom,
			oninput: () => {
				this._contentInput = this.editorDom.innerText
				console.log(this._contentInput)
			},
		}

		const submitTemplate: ButtonAttrs = {
			label: "templateSubmit_label",
			type: "bubble",
			click: () => {
				console.log("SubmitButton ", this._templateOpen)
				this.pushToList(this.newListObject())
				this.store(this.templateList)
			}
		}

		const filterSettingTemplatesAttrs: TextFieldAttrs = {
			label: "templateFilter_label",
			value: this._templateFilter,
		}

		const templateTableButtonAttrs: ButtonAttrs = {
			label: "addInboxRule_action",
			icon: () => Icons.Add,
			click: () => {
				this._settingsView.detailsViewer = {
					view: () => m(".flex.mlr.col", {
						onkeydown: (e) => {
							e.stopPropagation()
						}
					}, [
						m(".flex.row.flex-grow-shrink-auto", [
							m(TextFieldN, editTemplateTitleAttrs),
							m(".ml-l", [
								m(TextFieldN, editTemplateIDAttrs)
							])
						]),
						m(".pt-s.text.scroll-x.break-word-links", [
							m("", {
								style: {
									height: "500px",
									fontSize: "18px",
								},
								onclick: () => this.editorDom.focus()
							}, [
								m("div[contenteditable=true]", editTemplateContentAttrs)
							])
						]),
						m(ButtonN, submitTemplate),
					]),
					entityEventsReceived: () => Promise.resolve(),
				}
			}
		}

		const templateTableAttrs: TableAttrs = {
			columnHeading: ["templateTable_title", "templateTable_id"],
			columnWidths: [ColumnWidth.Small, ColumnWidth.Small],
			showActionButtonColumn: true,
			addButtonAttrs: templateTableButtonAttrs,
			lines: this._templateTableLines()
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

	store(list: ListObject[]) {
		const stringarray = JSON.stringify(list)

		localStorage.setItem("Templates", stringarray)
	}

	loadTemplates(): ListObject[] {
		let templates = localStorage.getItem("Templates")

		if(templates !== null){
			templates = assertNotNull(templates)
			return JSON.parse(templates)
		}else {
			return []
		}

	}

	entityEventsReceived(updates: $ReadOnlyArray<EntityUpdateData>): Promise<void> {
		return Promise.each(updates, update => {
			let p = Promise.resolve()
			return p.then(() => {
			})
		}).then(() => m.redraw())
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