//@flow

import m from "mithril"
import {ButtonN, ButtonType} from "../gui/base/ButtonN"
import {Dialog} from "../gui/base/Dialog"
import {lang} from "../misc/LanguageViewModel"
import type {EntityUpdateData} from "../api/main/EventController"
import {List} from "../gui/base/List"
import {size} from "../gui/size"
import {SettingsView} from "./SettingsView"
import {TemplateDetailsViewer} from "./TemplateDetailsViewer"
import {TemplateEditor} from "./TemplateEditor"
import {EmailTemplateTypeRef} from "../api/entities/tutanota/EmailTemplate"
import {locator} from "../api/main/MainLocator"
import type {EmailTemplate} from "../api/entities/tutanota/EmailTemplate"
import {assertMainOrNode} from "../api/Env"
import {isUpdateForTypeRef} from "../api/main/EventController"

assertMainOrNode()

/**
 *  List that is rendered within the template Settings
 */

export class TemplateListView implements UpdatableSettingsViewer {
	_dialog: Dialog
	_list: List<EmailTemplate, TemplateRow>
	_settingsView: SettingsView

	constructor(settingsView: SettingsView) {
		this._settingsView = settingsView
		const entityClient = locator.entityClient
		console.log("tested")

		locator.mailModel.getUserMailboxDetails().then(details => {
			if(details.mailbox.templates) {
				const templateListId = details.mailbox.templates.list
				const listConfig: ListConfig<EmailTemplate, TemplateRow> = {
					rowHeight: size.list_row_height,
					fetch: (startId, count) => {
						console.log("template list fetch", startId, count)
						return entityClient.loadRange(EmailTemplateTypeRef, templateListId, startId, count, true).then(entries => {
							console.log("templates", entries)
							return entries
						})
					},
					loadSingle: (elementId) => {
						return entityClient.load(EmailTemplateTypeRef, [templateListId, elementId])
					},
					sortCompare: (a: EmailTemplate, b: EmailTemplate) => {
						var titleA = a.title.toUpperCase();
						var titleB = b.title.toUpperCase();
						return (titleA < titleB) ? -1 : (titleA > titleB) ? 1 : 0
					},
					elementSelected: (templates: Array<EmailTemplate>, elementClicked) => {
						if (elementClicked) {
							this._settingsView.detailsViewer = new TemplateDetailsViewer(templates[0], entityClient)
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
		})
	}


	view(): Children {
		return m(".flex.flex-column.fill-absolute", [
			m(".flex.flex-column.justify-center.plr-l.list-border-right.list-bg.list-header",
				m(".mr-negative-s.align-self-end", m(ButtonN, {
					label: "addTemplate_label",
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
		locator.mailModel.getUserMailboxDetails().then(details => {
			if (details.mailbox.templates && details.mailbox._ownerGroup) {
				new TemplateEditor(null, details.mailbox.templates.list, details.mailbox._ownerGroup, locator.entityClient)
			}
		})
	}

	entityEventsReceived(updates: $ReadOnlyArray<EntityUpdateData>): Promise<void> {
		console.log("event update received", updates)
		return Promise.each(updates, update => {
			if (isUpdateForTypeRef(EmailTemplateTypeRef, update)) {
				return this._list.entityEventReceived(update.instanceId, update.operation)
			}
		}).then(() => {
			this._settingsView.detailsViewer = null
			m.redraw()
		})
	}
}

export class TemplateRow {
	top: number;
	domElement: ?HTMLElement; // set from List
	entity: ?EmailTemplate;
	_domTemplateTitle: HTMLElement;
	_domTemplateId: HTMLElement;

	constructor() {
		this.top = 0 // is needed because of the list component
	}

	update(template: EmailTemplate, selected: boolean): void {
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





