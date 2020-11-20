// @flow
import type {EntityRestInterface} from "./EntityRestClient"
import {typeRefToPath} from "./EntityRestClient"
import type {HttpMethodEnum, ListElement} from "../../common/EntityFunctions"
import {
	firstBiggerThanSecond,
	GENERATED_MAX_ID,
	GENERATED_MIN_ID, getElementId,
	getLetId,
	HttpMethod,
	isSameTypeRef,
	resolveTypeReference,
	TypeRef
} from "../../common/EntityFunctions"
import {OperationType} from "../../common/TutanotaConstants"
import {assertNotNull, clone, containsEventOfType, downcast, getEventOfType, neverNull} from "../../common/utils/Utils"
import {PermissionTypeRef} from "../../entities/sys/Permission"
import {EntityEventBatchTypeRef} from "../../entities/sys/EntityEventBatch"
import {assertWorkerOrNode} from "../../Env"
// $FlowIgnore[untyped-import]
import EC from "../../common/EntityConstants"
import {SessionTypeRef} from "../../entities/sys/Session"
import {StatisticLogEntryTypeRef} from "../../entities/tutanota/StatisticLogEntry"
import {BucketPermissionTypeRef} from "../../entities/sys/BucketPermission"
import {SecondFactorTypeRef} from "../../entities/sys/SecondFactor"
import {RecoverCodeTypeRef} from "../../entities/sys/RecoverCode"
import {NotAuthorizedError, NotFoundError} from "../../common/error/RestError"
import {MailTypeRef} from "../../entities/tutanota/Mail"
import type {EntityUpdate} from "../../entities/sys/EntityUpdate"
import {RejectedSenderTypeRef} from "../../entities/sys/RejectedSender"
import {DbFacade} from "../search/DbFacade"
import type {EntityCacheEntry, EntityCacheListInfoEntry} from "./EntityCacheDb"
import {EntityListInfoOS, EntityRestCacheOS} from "./EntityCacheDb"
import {decryptAndMapToInstance, encryptAndMapToLiteral} from "../crypto/InstanceMapper"
import {uint8ArrayToBitArray} from "../crypto/CryptoUtils"
import {resolveSessionKey} from "../crypto/CryptoFacade"
import {lastThrow} from "../../common/utils/ArrayUtils"

const ValueType = EC.ValueType

assertWorkerOrNode()


/**
 * This implementation provides a caching mechanism to the rest chain.
 * It forwards requests to the entity rest client.
 * The cache works as follows:
 * If a read from the target fails, the request fails.
 * If a read from the target is successful, the cache is written and the element returned.
 * For LETs the cache stores one range per list id. if a range is requested starting in the stored range or at the range ends the missing elements are loaded from the server.
 * Only ranges with elements with generated ids are stored in the cache. Custom id elements are only stored as single element currently. If needed this has to be extended for ranges.
 * Range requests starting outside the stored range are only allowed if the direction is away from the stored range. In this case we load from the range end to avoid gaps in the stored range.
 * Requests for creating or updating elements are always forwarded and not directly stored in the cache.
 * On EventBusClient notifications updated elements are stored in the cache if the element already exists in the cache.
 * On EventBusClient notifications new elements are only stored in the cache if they are LETs and in the stored range.
 * On EventBusClient notifications deleted elements are removed from the cache.
 *
 * Range handling:
 * |          <|>        c d e f g h i j k      <|>             |
 * MIN_ID  lowerRangeId     ids in rage    upperRangeId    MAX_ID
 * lowerRangeId may be anything from MIN_ID to c, upperRangeId may be anything from k to MAX_ID
 */
export class EntityRestCache implements EntityRestInterface {
	_ignoredTypes: TypeRef<any>[];
	_entityRestClient: EntityRestInterface;
	_db: DbFacade;
	_temporarySK: Aes128Key = uint8ArrayToBitArray(
		new Uint8Array([196, 197, 17, 110, 240, 178, 69, 96, 121, 240, 231, 95, 83, 30, 149, 131])
	)

	/**
	 * stores all contents that would be stored on the server, otherwise
	 */
	// _entities: {[key: string]: {[key: Id]: Object}};
	//	Example:
	//	_entities = {
	//		'path': { 		// element type
	//			'element1Id': 'element1',
	//			'element2Id': 'element2'
	//		    // and so on
	//		},
	//      // and so on
	//  }
	// _listEntities: {[key: string]: {[key: Id]: {allRange: Id[], lowerRangeId: Id, upperRangeId: Id, elements: {[key: Id]: Object}}}};
	//	Example:
	//    _listEntities {
	//		'path': { 		// list element type
	//			'listId': {
	//				allRange: ['listElement1Id', 'listElement2Id'],
	//              lowerRangeId: listElement1Id,
	//              upperRangeId: GENERATED_MAX_ID,
	//              elements: {
	//				    'listElement1Id': 'listElement1',
	//				    'listElement2Id': 'listElement2',
	//    				// and so on
	//              }
	//			},
	//          // and so on
	//		},
	//      // and so on
	//	}
	constructor(entityRestClient: EntityRestInterface, db: DbFacade) {
		this._entityRestClient = entityRestClient
		// this._entities = {}
		// this._listEntities = {}
		this._ignoredTypes = [
			EntityEventBatchTypeRef, PermissionTypeRef, BucketPermissionTypeRef, SessionTypeRef,
			StatisticLogEntryTypeRef, SecondFactorTypeRef, RecoverCodeTypeRef, RejectedSenderTypeRef
		]
		this._db = db
		db.open("restCacheTempId")
	}

	entityRequest<T>(typeRef: TypeRef<T>, method: HttpMethodEnum, listId: ?Id, id: ?Id, entity: ?T, queryParameter: ?Params,
	                 extraHeaders?: Params): Promise<any> {
		if (method === HttpMethod.GET && !this._ignoredTypes.find(ref => isSameTypeRef(typeRef, ref))) {
			if ((typeRef.app === "monitor") || (queryParameter && queryParameter["version"])) {
				// monitor app and version requests are never cached
				return this._entityRestClient.entityRequest(typeRef, method, listId, id, entity, queryParameter, extraHeaders)
			} else if (!id && queryParameter && queryParameter["ids"]) {
				return this._loadMultiple(downcast(typeRef), method, assertNotNull(listId), downcast(entity), queryParameter,
					extraHeaders || undefined)
			} else if (this.isRangeRequest(listId, id, queryParameter)) {
				// load range
				return this._loadEntityRange(downcast(typeRef), queryParameter, assertNotNull(listId), method, downcast(entity), extraHeaders)
			} else if (id) {
				return this._loadSingle(typeRef, listId, id, method, entity, queryParameter, extraHeaders)
			} else {
				throw new Error("invalid request params: " + String(listId) + ", " + String(id) + ", "
					+ String(JSON.stringify(queryParameter)))
			}
		} else {
			return this._entityRestClient.entityRequest(typeRef, method, listId, id, entity, queryParameter, extraHeaders)
		}
	}

	async _loadEntityRange<T: ListElement>(typeRef: TypeRef<T>, queryParameter: ?Params, listId: Id, method: HttpMethodEnum, entity: ?T,
	                                       extraHeaders: ?Params): Promise<Array<T>> {
		const typeModel = await resolveTypeReference(typeRef)
		if (typeModel.values["_id"].type === ValueType.GeneratedId) {
			const params = neverNull(queryParameter)
			return this._loadRange(
				downcast(typeRef),
				neverNull(listId),
				params["start"],
				Number(params["count"]),
				params["reverse"] === "true",
			)
		} else {
			// we currently only store ranges for generated ids
			const response = await this._entityRestClient.entityRequest(typeRef, method, listId, undefined, entity, queryParameter, extraHeaders
				|| undefined)
			const typedResponse: Array<T> = downcast(response)
			return typedResponse
		}
	}

	async _loadSingle<T>(typeRef: TypeRef<T>, listId: ?Id, id: Id, method: HttpMethodEnum, entity: ?T, queryParameter: ?Params,
	                     extraHeaders: ?Params): Promise<T> {
		// load single entity
		const cached = await this._getFromCache(typeRef, listId, id)
		if (cached) {
			return cached
		} else {
			const response = await this._entityRestClient.entityRequest(typeRef, method, listId, id, entity, queryParameter,
				extraHeaders || undefined)
			const responseEntity: T = downcast(response)
			await this._putIntoCache(responseEntity)
			return responseEntity
		}
	}

	isRangeRequest(listId: ?Id, id: ?Id, queryParameter: ?Params): boolean {
		// check for null and undefined because "" and 0 are als falsy
		return listId != null && !id
			&& queryParameter != null
			&& queryParameter["start"] !== null
			&& queryParameter["start"] !== undefined
			&& queryParameter["count"] !== null
			&& queryParameter["count"] !== undefined
			&& queryParameter["reverse"] != null
	}

	async _loadMultiple<T>(typeRef: TypeRef<T>, method: HttpMethodEnum, listId: Id, entity: ?T, queryParameter: Params,
	                       extraHeaders?: Params): Promise<Array<T>> {
		const ids: Array<Id> = queryParameter["ids"].split(",")
		const notInCache: Array<Id> = []
		const cachedEntities: Array<T> = []
		const cachedItems: Array<[Id, ?T]> = await Promise.mapSeries(ids, async (itemId: Id) => {
			const loaded = await this._getFromCache(typeRef, listId, itemId)
			return [itemId, loaded]
		})

		for (const [id, entity] of cachedItems) {
			if (!entity) {
				notInCache.push(id)
			} else {
				cachedEntities.push(entity)
			}
		}
		const newQuery = Object.assign({}, queryParameter, {ids: notInCache.join(",")})
		const fromServer = notInCache.length > 0
			? await this._entityRestClient.entityRequest(typeRef, method, listId, null, entity, newQuery, extraHeaders)
			            .then(async (response) => {
				            const entities: Array<T> = downcast(response)
				            for (const e of entities) {
					            await this._putIntoCache(e)
				            }
				            return entities
			            })
			: []
		return fromServer.concat(cachedEntities)
	}

	async _loadRange<T: ListElement>(typeRef: TypeRef<T>, listId: Id, start: Id, count: number, reverse: boolean): Promise<T[]> {
		let path = typeRefToPath(typeRef)
		// const listCache = (this._listEntities[path] && this._listEntities[path][listId]) ? this._listEntities[path][listId] : null
		const listInfo: ?EntityCacheListInfoEntry = await this._getListInfo(typeRef, listId)
		// check which range must be loaded from server
		if (!listInfo || (start === GENERATED_MAX_ID && reverse && listInfo.upperRangeId !== GENERATED_MAX_ID)
			|| (start === GENERATED_MIN_ID && !reverse && listInfo.lowerRangeId !== GENERATED_MIN_ID)) {
			// this is the first request for this list or
			// our upper range id is not MAX_ID and we now read the range starting with MAX_ID. we just replace the complete existing range with the new one because we do not want to handle multiple ranges or
			// our lower range id is not MIN_ID and we now read the range starting with MIN_ID. we just replace the complete existing range with the new one because we do not want to handle multiple ranges
			// this can also happen if we just have read a single element before, so the range is only that element and can be skipped
			const result = await this._entityRestClient.entityRequest(typeRef, HttpMethod.GET, listId, null, null, {
				start: start,
				count: String(count),
				reverse: String(reverse)
			})
			let entities: Array<T> = downcast(result)
			// create the list data path in the cache if not existing

			let newListCache: EntityCacheListInfoEntry
			if (!listInfo) {
				newListCache = {upperRangeId: start, lowerRangeId: start}
				// if (!this._listEntities[path]) {
				// 	this._listEntities[path] = {}
				// }
				// newListCache = {allRange: [], lowerRangeId: start, upperRangeId: start, elements: {}}
				// this._listEntities[path][listId] = newListCache
			} else {
				newListCache = listInfo
				// TODO: save new list info here?
				// newListCache = listCache
				// newListCache.allRange = []
				// newListCache.lowerRangeId = start
				// newListCache.upperRangeId = start
			}
			return this._handleElementRangeResult(typeRef, newListCache, listId, start, count, reverse, entities, count)
		} else if (!firstBiggerThanSecond(start, listInfo.upperRangeId)
			&& !firstBiggerThanSecond(listInfo.lowerRangeId, start)) { // check if the requested start element is located in the range

			// count the numbers of elements that are already in allRange to determine the number of elements to read
			let newRequestParams = await this._getNumberOfElementsToRead(listInfo, typeRef, listId, start, count, reverse)
			if (newRequestParams.newCount > 0) {
				return this._entityRestClient.entityRequest(typeRef, HttpMethod.GET, listId, null, null, {
					start: newRequestParams.newStart,
					count: String(newRequestParams.newCount),
					reverse: String(reverse)
				}).then(result => {
					let entities: Array<T> = downcast(result)
					return this._handleElementRangeResult(typeRef, listInfo, listId, start, count, reverse, entities, newRequestParams.newCount)
				})
			} else {
				// all elements are located in the cache.
				return Promise.resolve(this._provideFromCache(typeRef, listId, start, count, reverse))
			}
		} else if ((firstBiggerThanSecond(start, listInfo.upperRangeId) && !reverse) // Start is outside the range.
			|| (firstBiggerThanSecond(listInfo.lowerRangeId, start) && reverse)) {
			let loadStartId
			if (firstBiggerThanSecond(start, listInfo.upperRangeId) && !reverse) {
				// start is higher than range. load from upper range id with same count. then, if all available elements have been loaded or the requested number is in cache, return from cache. otherwise load again the same way.
				loadStartId = listInfo.upperRangeId
			} else {
				// start is lower than range. load from lower range id with same count. then, if all available elements have been loaded or the requested number is in cache, return from cache. otherwise load again the same way.
				loadStartId = listInfo.lowerRangeId
			}
			return this._entityRestClient.entityRequest(typeRef, HttpMethod.GET, listId, null, null, {
				start: loadStartId,
				count: String(count),
				reverse: String(reverse)
			}).then(async entities => {
				// put the new elements into the cache
				await this._handleElementRangeResult(typeRef, listInfo, listId, loadStartId, count, reverse, ((entities: any): T[]), count)
				// provide from cache with the actual start id
				let resultElements = await this._provideFromCache(typeRef, listId, start, count, reverse)
				if (((entities: any): T[]).length < count || resultElements.length === count) {
					// either all available elements have been loaded from target or the requested number of elements could be provided from cache
					return resultElements
				} else {
					// try again with the new elements in the cache
					return this.entityRequest(typeRef, HttpMethod.GET, listId, null, null, {
						start: start,
						count: String(count),
						reverse: String(reverse)
					})
				}
			})
		} else {
			let msg = "invalid range request. path: " + path + " list: " + listId + " start: " + start + " count: "
				+ count + " reverse: " + String(reverse) + " lower: " + listInfo.lowerRangeId + " upper: "
				+ listInfo.upperRangeId
			return Promise.reject(new Error(msg))
		}
	}

	async _getListInfo<T: ListElement>(typeRef: TypeRef<T>, listId: Id): Promise<?EntityCacheListInfoEntry> {
		const transaction = await this._db.createTransaction(true, [EntityListInfoOS])
		return transaction.get(EntityListInfoOS, [typeRef.app, typeRef.type, listId])
	}

	async _handleElementRangeResult<T: ListElement>(typeRef: TypeRef<T>, listCache: EntityCacheListInfoEntry, listId: Id, start: Id,
	                                                count: number, reverse: boolean, elements: T[], targetCount: number): Promise<T[]> {
		let elementsToAdd = elements
		if (elements.length > 0) {
			// Ensure that elements are cached in ascending (not reverse) order
			if (reverse) {
				elementsToAdd = elements.reverse()
				if (elements.length < targetCount) {
					listCache.lowerRangeId = GENERATED_MIN_ID
				} else {
					// After reversing the list the first element in the list is the lower range limit
					listCache.lowerRangeId = getLetId(elements[0])[1]
				}
			} else {
				// Last element in the list is the upper range limit
				if (elements.length < targetCount) {
					// all elements have been loaded, so the upper range must be set to MAX_ID
					listCache.upperRangeId = GENERATED_MAX_ID
				} else {
					listCache.upperRangeId = getLetId(elements[elements.length - 1])[1]
				}
			}
			for (let i = 0; i < elementsToAdd.length; i++) {
				await this._putIntoCache(elementsToAdd[i])
			}
		} else {
			// all elements have been loaded, so the range must be set to MAX_ID / MIN_ID
			if (reverse) {
				listCache.lowerRangeId = GENERATED_MIN_ID
			} else {
				listCache.upperRangeId = GENERATED_MAX_ID
			}
		}
		const transaction = await this._db.createTransaction(false, [EntityListInfoOS])
		transaction.put(EntityListInfoOS, [typeRef.app, typeRef.type, listId], listCache)
		await transaction.wait()
		return this._provideFromCache(typeRef, listId, start, count, reverse)
	}

	/**
	 * Calculates the new start value for the getElementRange request and the number of elements to read in
	 * order to read no duplicate values.
	 * @return returns the new start and count value.
	 */
	async _getNumberOfElementsToRead<T>(listCache: EntityCacheListInfoEntry, typeRef: TypeRef<*>, listId: Id, start: Id, count: number, reverse: boolean): Promise<{newStart: string, newCount: number}> {
		const allRangeList = (await this._provideFromCache(typeRef, listId, start, count, reverse)).map(getElementId)
		let elementsToRead = count
		let startElementId = start

		const startIncluded = allRangeList[0] === start
		if ((!reverse && listCache.upperRangeId === GENERATED_MAX_ID) || (reverse && listCache.lowerRangeId === GENERATED_MIN_ID)) {
			// we have already loaded the complete range in the desired direction, so we do not have to load from server
			elementsToRead = 0
		} else if (allRangeList.length === 0) { // Element range is empty, so read all elements
			elementsToRead = count
		} else if (startIncluded) { // Start element is located in allRange read only elements that are not in allRange.
			// TODO why -1 in non-reverse case
			// elementsToRead = count - (allRangeList.length - 1)
			elementsToRead = count - allRangeList.length
			startElementId = lastThrow(allRangeList) // use the highest/lowest (for reverse) id in allRange as start element
		} else if (listCache.lowerRangeId === start || (firstBiggerThanSecond(start, listCache.lowerRangeId)
			&& (firstBiggerThanSecond(allRangeList[0], start)))
		) { // Start element is not in allRange but has been used as start element for a range request, eg. EntityRestInterface.GENERATED_MIN_ID, or start is between lower range id and lowest element in range
			if (!reverse) { // if not reverse read only elements that are not in allRange
				// use the  highest id in allRange as start element
				startElementId = lastThrow(allRangeList)
				elementsToRead = count - allRangeList.length
			}
			// if reverse read all elements, we don't have it in the range
		} else if (listCache.upperRangeId === start
			|| (firstBiggerThanSecond(start, lastThrow(allRangeList))
				&& (firstBiggerThanSecond(listCache.upperRangeId, start)))
		) { // Start element is not in allRange but has been used as start element for a range request, eg. EntityRestInterface.GENERATED_MAX_ID, or start is between upper range id and highest element in range
			if (reverse) { // if not reverse read only elements that are not in allRange
				startElementId = allRangeList[0] // use the lowest id in allRange as start element
				elementsToRead = count - allRangeList.length
			}
			// if not reverse read all elements, we don't have it in the range
		}
		return {newStart: startElementId, newCount: elementsToRead}
	}

	async _provideFromCache<T>(typeRef: TypeRef<T>, listId: Id, start: Id, count: number, reverse: boolean): Promise<Array<T>> {
		const transaction = await this._db.createTransaction(true, [EntityRestCacheOS])
		const entries = await transaction.getRange(EntityRestCacheOS, [typeRef.app, typeRef.type, listId], start, count, reverse)
		const model = await resolveTypeReference(typeRef)
		// TODO: filter by listInfo here so that elements outside of range are not returned
		return Promise.mapSeries(entries, async (e) => {
			const sessionKey = await resolveSessionKey(model, e)
			return decryptAndMapToInstance(model, e, sessionKey)
		})
		// let range = listCache.allRange
		// let ids: Id[] = []
		// if (reverse) {
		// 	let i
		// 	for (i = range.length - 1; i >= 0; i--) {
		// 		if (firstBiggerThanSecond(start, range[i])) {
		// 			break
		// 		}
		// 	}
		// 	if (i >= 0) {
		// 		let startIndex = i + 1 - count
		// 		if (startIndex < 0) { // start index may be negative if more elements have been requested than available when getting elements reverse.
		// 			startIndex = 0
		// 		}
		// 		ids = range.slice(startIndex, i + 1)
		// 		ids.reverse()
		// 	} else {
		// 		ids = []
		// 	}
		// } else {
		// 	let i
		// 	for (i = 0; i < range.length; i++) {
		// 		if (firstBiggerThanSecond(range[i], start)) {
		// 			break
		// 		}
		// 	}
		// 	ids = range.slice(i, i + count)
		// }
		// let result: T[] = []
		// for (let a = 0; a < ids.length; a++) {
		// 	result.push(clone((listCache.elements[ids[a]]: any)))
		// }
		// return result
	}

	/**
	 * Resolves when the entity is loaded from the server if necessary
	 * @pre The last call of this function must be resolved. This is needed to avoid that e.g. while
	 * loading a created instance from the server we receive an update of that instance and ignore it because the instance is not in the cache yet.
	 *
	 * @return Promise, which resolves to the array of valid events (if response is NotFound or NotAuthorized we filter it out)
	 */
	entityEventsReceived(data: Array<EntityUpdate>): Promise<Array<EntityUpdate>> {
		return Promise
			.map(data, (update) => {
				const {instanceListId, instanceId, operation, type, application} = update
				if (application === "monitor") return

				const typeRef = new TypeRef(application, type)
				switch (operation) {
					case OperationType.UPDATE:
						return this._processUpdateEvent(typeRef, update)

					case OperationType.DELETE:
						if (isSameTypeRef(MailTypeRef, typeRef) && containsEventOfType(data, OperationType.CREATE, instanceId)) {
							// move for mail is handled in create event.
						} else {
							this._tryRemoveFromCache(typeRef, instanceListId, instanceId)
						}
						return update

					case OperationType.CREATE:
						return this._processCreateEvent(typeRef, update, data)
				}
			})
			.filter(Boolean)
	}

	async _processCreateEvent(typeRef: TypeRef<*>, update: EntityUpdate, batch: Array<EntityUpdate>): $Promisable<EntityUpdate | null> { // do not return undefined
		const {instanceListId, instanceId} = update
		if (instanceListId) {
			const path = typeRefToPath(typeRef)
			const deleteEvent = getEventOfType(batch, OperationType.DELETE, instanceId)
			if (deleteEvent && isSameTypeRef(MailTypeRef, typeRef)) { // It is a move event
				const element = await this._getFromCache(typeRef, deleteEvent.instanceListId, instanceId)
				if (element) {
					this._tryRemoveFromCache(typeRef, deleteEvent.instanceListId, instanceId)
					element._id = [instanceListId, instanceId]
					await this._putIntoCache(element)
					return update
				}
			} else if (this._isInCacheRange(path, instanceListId, instanceId)) {
				return this._entityRestClient.entityRequest(typeRef, HttpMethod.GET, instanceListId, instanceId)
				           .then(entity => this._putIntoCache(entity))
				           .return(update)
				           .catch(this._handleProcessingError)
			}
		}
		return update
	}

	async _processUpdateEvent(typeRef: TypeRef<*>, update: EntityUpdate): $Promisable<EntityUpdate | null> {
		const {instanceListId, instanceId} = update
		const cached = await this._getFromCache(typeRef, instanceListId, instanceId)
		if (cached) {
			return this._entityRestClient.entityRequest(typeRef, HttpMethod.GET, instanceListId, instanceId)
			           .then(entity => this._putIntoCache(entity))
			           .return(update)
			           .catch(this._handleProcessingError)
		}
		return update
	}

	_handleProcessingError(e: Error): ?EntityUpdate {
		// skip event if NotFoundError. May occur if an entity is removed in parallel.
		// Skip event if. May occur if the user was removed from the owner group.
		if (e instanceof NotFoundError || e instanceof NotAuthorizedError) {
			return null
		} else {
			throw e
		}
	}

	async _getFromCache<T>(typeRef: TypeRef<T>, listId: ?Id, id: Id): Promise<?T> {
		const transaction = await this._db.createTransaction(true, [EntityRestCacheOS])
		const data = await transaction.get(EntityRestCacheOS, [typeRef.app, typeRef.type, listId || "", id])
		if (data) {
			const typeModel = await resolveTypeReference(typeRef)
			return decryptAndMapToInstance(typeModel, data, this._temporarySK)
		} else {
			return null
		}
	}

	_isInCacheRange(path: string, listId: Id, id: Id): boolean {
		return false
		// return this._listEntities[path] != null && this._listEntities[path][listId] != null
		// 	&& !firstBiggerThanSecond(id, this._listEntities[path][listId].upperRangeId)
		// 	&& !firstBiggerThanSecond(this._listEntities[path][listId].lowerRangeId, id)
	}

	async _putIntoCache(originalEntity: any): Promise<void> {
		let entity = clone(originalEntity)
		let elementId, listId
		if (originalEntity._id instanceof Array) {
			[listId, elementId] = originalEntity._id
		} else {
			listId = null
			elementId = originalEntity._id
		}
		const typeModel = await resolveTypeReference(entity._type)
		const transaction = await this._db.createTransaction(false, [EntityRestCacheOS, EntityListInfoOS])
		const sessionKey = await resolveSessionKey(typeModel, entity)
		const data: EntityCacheEntry = await encryptAndMapToLiteral(typeModel, entity, sessionKey)

		const typeRef = entity._type
		// noinspection ES6MissingAwait
		transaction.put(EntityRestCacheOS, [typeRef.app, typeRef.type, listId || "", elementId], data)

		if (listId) {
			const oldListInfo = await transaction.get(EntityListInfoOS, [typeRef.app, typeRef.type, listId])
			if (!oldListInfo) {
				const newListInfo: EntityCacheListInfoEntry = {upperRangeId: elementId, lowerRangeId: elementId}
				// noinspection ES6MissingAwait
				transaction.put(EntityListInfoOS, [typeRef.app, typeRef.type, listId || ""], newListInfo)
			}
		}

		return transaction.wait()
		// if (entity._id instanceof Array) {
		// 	if (!this._listEntities[path]) {
		// 		this._listEntities[path] = {}
		// 	}
		// 	let listId = entity._id[0]
		// 	let id = entity._id[1]
		// 	if (!this._listEntities[path][listId]) {
		// 		// first element in this list
		// 		this._listEntities[path][listId] = {allRange: [id], lowerRangeId: id, upperRangeId: id, elements: {}}
		// 		this._listEntities[path][listId].elements[id] = entity
		// 	} else {
		// 		// if the element already exists in the cache, overwrite it
		// 		// add new element to existing list if necessary
		// 		this._listEntities[path][listId].elements[id] = entity
		// 		if (this._isInCacheRange(path, listId, id)) {
		// 			this._insertIntoRange(this._listEntities[path][listId].allRange, id)
		// 		}
		// 	}
		// } else {
		// 	if (!this._entities[path]) {
		// 		this._entities[path] = {}
		// 	}
		// 	this._entities[path][entity._id] = entity
		// }
	}

	async _tryRemoveFromCache(typeRef: TypeRef<any>, listId: ?Id, id: Id): Promise<void> {
		const transaction = await this._db.createTransaction(false, [EntityRestCacheOS])
		transaction.delete(EntityRestCacheOS, [typeRef.app, typeRef.type, listId || "", id])
		await transaction.wait()
	}
}
