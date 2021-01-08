//@flow
import type {KnowledgeBaseEntry} from "../api/entities/tutanota/KnowledgeBaseEntry"
import type {EmailTemplate} from "../api/entities/tutanota/EmailTemplate"
import {EventController, isUpdateForTypeRef} from "../api/main/EventController"
import type {EntityEventsListener, EntityUpdateData} from "../api/main/EventController"
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
import {EmailTemplateTypeRef} from "../api/entities/tutanota/EmailTemplate"
import {htmlSanitizer} from "../misc/HtmlSanitizer"
import {lang} from "../misc/LanguageViewModel"
import {downcast} from "../api/common/utils/Utils"

/**
 *   Model that holds main logic for the Knowdledgebase.
 */

export class KnowledgeBaseModel {
	_allEntries: Array<KnowledgeBaseEntry>
	_displayedEntries: Stream<Array<KnowledgeBaseEntry>>
	_filterKeywords: Array<string>
	_allKeywords: Array<string>
	_isActive: boolean
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
		this._isActive = false
		this._entityEventReceived = (updates) => {
			return this._entityUpdate(updates)
		}
		this._eventController.addEntityListener(this._entityEventReceived)
	}

	init(): Promise<void> {
		return this._loadEntries().then(entries => {
			this._allEntries = entries
			this._displayedEntries(this._allEntries)
		})
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

	containsResult(): boolean {
		return this._displayedEntries().length > 0
	}

	setActive() {
		this._isActive = true
	}

	getStatus(): boolean {
		return this._isActive
	}

	getAllEntries(): Array<KnowledgeBaseEntry> {
		return this._allEntries
	}

	getDisplayedEntries(): Stream<Array<KnowledgeBaseEntry>> {
		return this._displayedEntries
	}

	getAllKeywords(): Array<string> {
		return this._allKeywords.sort()
	}

	getFilterKeywords(): Array<string> {
		return this._filterKeywords
	}

	getLanguageFromTemplate(template: EmailTemplate): LanguageCode {
		const clientLanguage = lang.code
		const hasClientLanguage = template.contents.some(
			(content) => content.languageCode === clientLanguage
		)
		if (hasClientLanguage)
			return clientLanguage
		return downcast(template.contents[0].languageCode)
	}

	getContentFromTemplate(languageCode: LanguageCode, template: ?EmailTemplate): string { // returns the value of the content as string
		const content = template && template.contents.find(c => c.languageCode === languageCode)
		const text = content && content.text || ""
		return htmlSanitizer.sanitize(text, true).text
	}

	search(text: string): void {
		this._displayedEntries(knowledgeBaseSearch(text, this.getAllEntries(), this.getFilterKeywords()))
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

	_getKnowledgeBaseListId(): Promise<?Id> {
		return this._mailModel.getUserMailboxDetails().then(details => {
			if (details.mailbox.knowledgeBase) {
				return details.mailbox.knowledgeBase.list
			} else {
				return null
			}
		})
	}

	dispose() {
		this._eventController.removeEntityListener(this._entityEventReceived)
	}

	close() {
		this._isActive = false
	}

	loadTemplate(templateId: IdTuple): Promise<EmailTemplate> {
		return this._entityClient.load(EmailTemplateTypeRef, templateId)
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

	_entityUpdate(updates: $ReadOnlyArray<EntityUpdateData>): Promise<void> {
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
}

export const knowledgebase: KnowledgeBaseModel = new KnowledgeBaseModel(locator.eventController, locator.mailModel, locator.entityClient)

