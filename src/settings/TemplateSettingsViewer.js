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
import {ExpanderButtonN, ExpanderPanelN} from "../gui/base/ExpanderN"
import type {TableAttrs, TableLineAttrs} from "../gui/base/TableN"
import {ColumnWidth, TableN} from "../gui/base/TableN"
import {SettingsView} from "./SettingsView"
import {Icons} from "../gui/base/icons/Icons"
import type {InputField} from "../api/entities/tutanota/InputField"

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
	_templateOpen: boolean = true;

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
		this.templateList = []
	}

	view() {
		// const enableTemplateAttrs: DropDownSelectorAttrs<boolean> = {
		// 	label: () => "enableTemplate_label",
		// 	// helpLabel: () => lang.get("enableTemplate_msg"),
		// 	items: [
		// 		{name: lang.get("activated_label"), value: true},
		// 		{name: lang.get("deactivated_label"), value: false}
		// 	],
		// 	selectedValue: this._enableTemplates,
		// 	selectionChangedHandler: templatesEnabled => {
		// 		if (templatesEnabled) {
		// 			deviceConfig.setTemplatesEnabled(this._enableTemplates)
		// 		} else {
		// 			deviceConfig.setTemplatesEnabled(this._enableTemplates)
		// 		}
		// 	},
		// 	dropdownWidth: 250
		// }

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

		const editTemplateContentAttrs: TextFieldAttrs = {
			label: "templateTable_content",
			type: TextFieldType.Area,
			value: this._templateContent,
			oninput: (content) => {
				content = content.trim()
				if (content !== "") {
					this._contentInput = content
				} else {
					this._contentInput = null
				}
			}
		}

		const submitTemplate: ButtonAttrs = {
			label: "templateSubmit_label",
			type: "bubble",
			click: () => {
				this._templateOpen = false
				console.log("SubmitButton ", this._templateOpen)
				this.pushToList(this.newListObject())
				this.store(this.templateList)
			}
		}

		const filterSettingTemplatesAttrs: TextFieldAttrs = {
			label: "templateFilter_label",
			value: this._templateFilter,
		}
		const templateEditor: InputField = {}

		const templateTableButtonAttrs: ButtonAttrs = {
			label: "addInboxRule_action",
			icon: () => Icons.Add,
			click: () => {
				this._templateOpen = true
				console.log("TableButton ", this._templateOpen)
					this._settingsView.detailsViewer = {
						view: () => m(".h3.mt-l", [
							m(TextFieldN, editTemplateTitleAttrs),
							m(TextFieldN, editTemplateIDAttrs),
							m(TextFieldN, editTemplateContentAttrs),
							m(ButtonN, submitTemplate),
							m("div", this.newListObject())
						]),
						entityEventsReceived: () => Promise.resolve(),
					}
				console.log("Open template editor")
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
					m(".h3.mt-l", lang.get("templateEdit_label")),
					m(ExpanderButtonN, {label: "templateExpander_label", expanded: this._templatesExpanded})
				]),
				m(ExpanderPanelN, {expanded: this._templatesExpanded}, [
					m(TextFieldN, filterSettingTemplatesAttrs),
					m(TableN, templateTableAttrs),
				])
			])
		]
	}

	newListObject() {
		const object: ListObject = {
			title: this._titleInput,
			id: this._idInput,
			content: this._contentInput
		}
		return object
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

	entityEventsReceived(updates: $ReadOnlyArray<EntityUpdateData>): Promise<void> {
		return Promise.each(updates, update => {
			let p = Promise.resolve()
			return p.then(() => {
			})
		}).then(() => m.redraw())
	}
}

export type ListObject = {
	title: string,
	id: ?string,
	content: ?string,
}