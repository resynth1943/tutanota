//@flow

import m from "mithril"
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
import type {LanguageCode} from "../misc/LanguageViewModel"
import type {Template} from "../mail/TemplateModel"
import {loadTemplates} from "../mail/TemplateModel"

/*

*/

export class TemplateListView implements UpdatableSettingsViewer {
	_keyList: Array<Template>
	_dialog: Dialog
	_list: List<Template, TemplateRow>
	newTemplate: Template
	_settingsView: SettingsView

	constructor(settingsView: SettingsView) {
		this._settingsView = settingsView
		this._keyList = loadTemplates()

		const listConfig: ListConfig<Template, TemplateRow> = {
			rowHeight: size.list_row_height,
			fetch: (startId, count) => {
				this._list.setLoadedCompletely()
				return Promise.resolve(this._keyList)
			},
			loadSingle: (elementId) => {
				return Promise.resolve(this._keyList.find(template => isSameId(elementIdPart(template._id), elementId)))
			},
			sortCompare: (a: Template, b: Template) => {
				var titleA = a.title.toUpperCase();
				var titleB = b.title.toUpperCase();
				return (titleA < titleB) ? -1 : (titleA > titleB) ? 1 : 0
			},
			elementSelected: (templates: Array<Template>, elementClicked) => {
				if (elementClicked) {
					this._settingsView.detailsViewer = new TemplateDetailsViewer(templates[0], this._keyList, (updates) => {
						return this.entityEventsReceived(updates)
					})
					this._settingsView.focusSettingsDetailsColumn()
				} else if (templates.length === 0 && this._settingsView.detailsViewer) {
					this._settingsView.detailsViewer = null
					m.redraw()
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
		this._list = new List(listConfig)
		this._list.loadInitial()
	}


	view(): Children {
		return m(".flex.flex-column.fill-absolute", [
			m(".flex.flex-column.justify-center.plr-l.list-border-right.list-bg.list-header",
				m(".mr-negative-s.align-self-end", m(ButtonN, {
					label: () => "Add template", // TODO: Add TranslationKey
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
		new TemplateEditor(this._keyList, null, (updates) => {
			return this.entityEventsReceived(updates)
		})
	}

	_removeTemplate(index: number) {
		this._keyList.splice(index, 1)
		localStorage.setItem("Templates", JSON.stringify(this._keyList))
	}


	entityEventsReceived(updates: $ReadOnlyArray<EntityUpdateData>): Promise<void> {
		return Promise.each(updates, update => {
			return this._list.entityEventReceived(update.instanceId, update.operation)
		}).then(() => {
			this._settingsView.detailsViewer = null
			m.redraw()
		})
	}

}

export class TemplateRow {
	top: number;
	domElement: ?HTMLElement; // set from List
	entity: ?Template;
	_domTemplateTitle: HTMLElement;
	_domTemplateId: HTMLElement;

	constructor() {
		this.top = 0 // is needed because of the list component
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
		this._domTemplateId.textContent = template.tag ? template.tag : ""
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

export function createTemplate(title: string, tag: string, content: {[LanguageCode]: string}, index: number): Template {
	return {
		_id: ["localstorage", title], // should be replaced to real list id when stored as list in database
		title: title,
		tag: tag,
		content: content,
		index: index
	}
}




