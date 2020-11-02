//@flow

import m from "mithril"
import stream from "mithril/stream/stream.js"
import {assertNotNull} from "../api/common/utils/Utils"
import {ButtonN, ButtonType} from "../gui/base/ButtonN"
import {Dialog} from "../gui/base/Dialog"
import {lang} from "../misc/LanguageViewModel"
import type {EntityUpdateData} from "../api/main/EventController"
import {List} from "../gui/base/List"
import {size} from "../gui/size"
import {elementIdPart, isSameId} from "../api/common/EntityFunctions"
import {SettingsView} from "./SettingsView"
import {TemplateDetailsViewer} from "./TemplateDetailsViewer"
import {TemplateEditor} from "./TemplateEditor"

export class TemplateViewList implements UpdatableSettingsViewer {
	_templateFilter: Stream<string>
	_existingTitle: string
	_keyList: Array<Template>
	_existingContent: string
	_templateTitle: string
	_templateId: string
	_templateContent: string
	_dialog: Dialog
	_list: List<Template, TemplateRow>
	newTemplate: Template
	_settingsView: SettingsView

	constructor(settingsView: SettingsView) {
		this._settingsView = settingsView
		console.log("new Template list view")
		this._keyList = loadTemplates()

		const listConfig: ListConfig<Template, TemplateRow> = {
			rowHeight: size.list_row_height,
			fetch: (startId, count) => {
				console.log("fetch templates before loaded completely", this._keyList)
				this._list.setLoadedCompletely()
				console.log("fetch templates", this._keyList)
				return Promise.resolve(this._keyList)
			},
			loadSingle: (elementId) => {
				return Promise.resolve(this._keyList.find(template => isSameId(elementIdPart(template._id), elementId)))
			},
			sortCompare: (a: Template, b: Template) => {
				// See compare function of Array.sort
				return 0
			},
			elementSelected: (templates: Array<Template>, elementClicked, selectionChanged, multiSelectionActive) => {
				if (elementClicked) {
					this._settingsView.detailsViewer = new TemplateDetailsViewer(templates[0], this._keyList, (updates) => {
						return this.entityEventsReceived(updates)
					})
					this._settingsView.focusSettingsDetailsColumn()
				}
			},
			createVirtualRow: () => {
				return new TemplateRow()
			},
			showStatus: false,
			className: "template-list",
			swipe: {
				renderLeftSpacer: () => [],
				renderRightSpacer: () => [],
				swipeLeft: (listElement) => Promise.resolve(),
				swipeRight: (listElement) => Promise.resolve(),
				enabled: false
			},
			elementsDraggable: false,
			multiSelectionAllowed: false,
			emptyMessage: lang.get("noEntries_msg"),
		}
		this._templateFilter = stream("")
		this._list = new List(listConfig)
		this._list.loadInitial()
	}


	view(): Children {
		return m(".flex.flex-column.fill-absolute", [
			m(".flex.flex-column.justify-center.plr-l.list-border-right.list-bg.list-header",
				m(".mr-negative-s.align-self-end", m(ButtonN, {
					label: () => "Add template",
					type: ButtonType.Primary,
					click: () => {
						this._showDialogWindow()
					}
				}))
			),
			m(".rel.flex-grow", m(this._list))
		])
	}


	_showDialogWindow(existingTitle?: string, existingID?: string, existingContent?: string, index?: number, allowCancel: boolean = true) {
		new TemplateEditor(this._keyList,null, (updates) => {
			return this.entityEventsReceived(updates)
		})
	}

	_removeTemplate(index: number) {
		this._keyList.splice(index, 1)
		localStorage.setItem("Templates", JSON.stringify(this._keyList))
	}


	entityEventsReceived(updates: $ReadOnlyArray<EntityUpdateData>): Promise<void> {
		return Promise.each(updates, update => {
			return this._list.entityEventReceived( update.instanceId, update.operation)
		}).then(() => m.redraw())
	}

	/*reloadList(newTemplate: Template) {
		this._list._addToLoadedEntities(newTemplate)
	}*/

}

export class TemplateRow {
	top: number;
	domElement: ?HTMLElement; // set from List
	entity: ?Template;
	_domTemplateTitle: HTMLElement;
	_domTemplateId: HTMLElement;

	constructor() {
		this.top = 0
	}

	update(template: Template, selected: boolean): void {
		if (!this.domElement) {
			return
		}
		if (selected) {
			this.domElement.classList.add("row-selected")
		} else {
			this.domElement.classList.remove("row-selected")
		}

		this._domTemplateTitle.textContent = template.title
		this._domTemplateId.textContent = template.id ? template.id : ""
	}


	render(): Children {
		return [
			m(".top", [
				m(".name.text-ellipsis", {oncreate: (vnode) => this._domTemplateTitle = vnode.dom}),
			]),
			m(".bottom.flex-space-between", [
				m("small.templateContent", {oncreate: (vnode) => this._domTemplateId = vnode.dom}),
			])
		]
	}

}

export function createTemplate(title: string, id: string, content: string, index: number): Template {
	return {
		_id: ["localstorage", title], // should be replaced to real list id when stored as list in database
		title: title,
		id: id,
		content: content,
		index: index
	}
}

export function loadTemplates(): Array<Template> {
	console.log("load templates", localStorage.getItem("Templates"))
	if (localStorage.getItem("Templates") !== null) {
		const parsedTemplates = JSON.parse(assertNotNull(localStorage.getItem("Templates"))) // Global variable that represents current Localstorage Array
		if (parsedTemplates instanceof Array) {
			return parsedTemplates.map((storedTemplate, index) => createTemplate(storedTemplate.title, storedTemplate.id, storedTemplate.content, index))
		} else {
			return []
		}
	} else {
		return []
	}
}


export type Template = {
	_id: IdTuple;
	title: string,
	id: ?string,
	content: string,
	index: number
}