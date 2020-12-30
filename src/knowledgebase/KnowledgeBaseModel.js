//@flow
import type {KnowledgeBaseEntry} from "../api/entities/tutanota/KnowledgeBaseEntry"
import type {EmailTemplate} from "../api/entities/tutanota/EmailTemplate"
import {EventController, isUpdateForTypeRef} from "../api/main/EventController"
import type {EntityEventsListener} from "../api/main/EventController"
import {MailModel} from "../mail/MailModel"
import {EntityClient} from "../api/common/EntityClient"
import {locator} from "../api/main/MainLocator"
import {KnowledgeBaseEntryTypeRef} from "../api/entities/tutanota/KnowledgeBaseEntry"
import {knowledgeBaseSearch} from "./KnowledgeBaseSearchFilter"
import type {LanguageCode} from "../misc/LanguageViewModel"
import stream from "mithril/stream/stream.js"
import {getElementId, isSameId} from "../api/common/EntityFunctions"
import {findAndRemove} from "../api/common/utils/ArrayUtils"
import {OperationType} from "../api/common/TutanotaConstants"

export class KnowledgeBaseModel {
	_allEntries: Array<KnowledgeBaseEntry>
	_displayedEntries: Stream<Array<KnowledgeBaseEntry>>
	_filterKeywords: Array<string>
	_allKeywords: Array<string>
	_selectedEntry: ?KnowledgeBaseEntry
	_isActive: boolean
	_panel: ?HTMLElement
	_showEntryDetailsViewer: boolean
	_showTemplateDetailsViewer: boolean
	+_eventController: EventController;
	+_entityEventReceived: EntityEventsListener;
	+_mailModel: MailModel;
	+_entityClient: EntityClient;

	constructor(eventController: EventController, mailModel: MailModel, entityClient: EntityClient) {
		this._eventController = eventController
		this._mailModel = mailModel
		this._entityClient = entityClient
		this._allEntries = []
		this._allKeywords = []
		this._filterKeywords = []
		this._displayedEntries = stream(this._allEntries)
		this._selectedEntry = null
		this._isActive = false
		this._showEntryDetailsViewer = false
		this._showTemplateDetailsViewer = false
		this._panel = null
		this._entityEventReceived = (updates) => {
			return Promise.each(updates, update => {
				if (isUpdateForTypeRef(KnowledgeBaseEntryTypeRef, update)) {
					if (update.operation === OperationType.CREATE) {
						return this._getKnowledgeBaseListId().then((listId) => {
							if (listId && listId === update.instanceListId) {
								return this._entityClient.load(KnowledgeBaseEntryTypeRef, [listId, update.instanceId])
								           .then((entry) => {
									           this._allEntries.push(entry)
									           this._displayedEntries(this._allEntries)
								           })
							}
						})
					} else if (update.operation === OperationType.UPDATE) {
						return this._getKnowledgeBaseListId().then((listId) => {
							if (listId && listId === update.instanceListId) {
								return this._entityClient.load(KnowledgeBaseEntryTypeRef, [listId, update.instanceId])
								           .then((entry) => {
									           findAndRemove(this._allEntries, (e) => isSameId(getElementId(e), update.instanceId))
									           this._allEntries.push(entry)
									           this._displayedEntries(this._allEntries)
								           })
							}
						})
					} else if (update.operation === OperationType.DELETE) {
						return this._getKnowledgeBaseListId().then((listId) => {
							if (listId && listId === update.instanceListId) {
								findAndRemove(this._allEntries, (e) => isSameId(getElementId(e), update.instanceId))
								this._displayedEntries(this._allEntries)
							}
						})
					}
				}
			}).return()
		}
		this._eventController.addEntityListener(this._entityEventReceived)
	}

	init(): Promise<void> {
		return this._loadEntries().then(entries => {
			this._allEntries = entries
			this._displayedEntries(this._allEntries)
		})
	}

	getAllEntries(): Array<KnowledgeBaseEntry> {
		return this._allEntries
	}

	getDisplayedEntries(): Stream<Array<KnowledgeBaseEntry>> {
		return this._displayedEntries
	}

	getSelectedEntry(): ?KnowledgeBaseEntry {
		return this._selectedEntry
	}

	getSelectedEntryIndex(): number {
		return this._displayedEntries().indexOf(this._selectedEntry)
	}

	isEntryViewActive(): boolean {
		return this._showEntryDetailsViewer
	}

	isTemplateViewActive(): boolean {
		return this._showTemplateDetailsViewer
	}

	setEntryView(status: boolean) { // TODO: create type instead of bool, something like "on" | "off"
		this._showEntryDetailsViewer = status
	}

	setTemplateView(status: boolean) {
		this._showTemplateDetailsViewer = status
	}

	initAllKeywords() {
		this._allKeywords = []
		for (const entry of this._allEntries) {
			for (const keyword of entry.keywords) {
				if (!this._allKeywords.includes(keyword.keyword)) {
					this._allKeywords.push(keyword.keyword)
				}
			}
		}
	}

	search(text: string): void {
		this._displayedEntries(knowledgeBaseSearch(text, this.getAllEntries(), this.getFilterKeywords()))
	}

	getAllKeywords(): Array<string> {
		return this._allKeywords.sort()
	}

	getFilterKeywords(): Array<string> {
		return this._filterKeywords
	}

	addFilterKeyword(keyword: string) {
		if (!this._filterKeywords.includes(keyword)) {
			this._filterKeywords.push(keyword)
			this._removeFromAllKeywords(keyword)
		}
	}

	removeFromAddedKeyword(keyword: string) {
		const index = this._filterKeywords.indexOf(keyword)
		if (index > -1) {
			this._filterKeywords.splice(index, 1)
			this._allKeywords.push(keyword)
		}
	}

	_removeFromAllKeywords(keyword: string) {
		const index = this._allKeywords.indexOf(keyword)
		if (index > -1) {
			this._allKeywords.splice(index, 1)
		}
	}

	containsResult(): boolean {
		return this._displayedEntries().length > 0
	}

	isSelectedEntry(entry: KnowledgeBaseEntry): boolean {
		return (this._selectedEntry === entry)
	}

	setSelectedEntry(entry: ?KnowledgeBaseEntry) {
		this._selectedEntry = entry
	}

	selectNextEntry(): boolean { // returns true if selection is changed
		const selectedIndex = this.getSelectedEntryIndex()
		return true
	}

	setActive() { // TODO: instead write callback
		this._isActive = true
	}

	_loadEntries(): Promise<Array<KnowledgeBaseEntry>> {
		return this._getKnowledgeBaseListId().then((listId) => {
			if (listId) {
				return this._entityClient.loadAll(KnowledgeBaseEntryTypeRef, listId)
			} else {
				return []
			}
		})
	}

	_getKnowledgeBaseListId(): Promise<?Id> {
		return this._mailModel.getUserMailboxDetails().then(details => {
			if (details.mailbox.knowledgeBase) {
				return details.mailbox.knowledgeBase.list
			} else {
				return null
			}
		})
	}

	getContentFromTemplate(languageCode: LanguageCode, template: ?EmailTemplate): string { // returns the value of the content as string
		const content = template && template.contents.find(c => c.languageCode === languageCode)
		return content && content.text || ""
	}

	returnStatus(): boolean {
		return this._isActive
	}

	dispose() {
		this._eventController.removeEntityListener(this._entityEventReceived)
	}

	close() {
		this._showEntryDetailsViewer = false
		this._showTemplateDetailsViewer = false
		this._isActive = false
	}
}

export const knowledgebase: KnowledgeBaseModel = new KnowledgeBaseModel(locator.eventController, locator.mailModel, locator.entityClient)

