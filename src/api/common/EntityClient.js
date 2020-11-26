// @flow

import type {EntityRestInterface} from "../worker/rest/EntityRestClient"
import type {RootInstance} from "../entities/sys/RootInstance"
import {RootInstanceTypeRef} from "../entities/sys/RootInstance"
import type {ListElementEntity, SomeEntity} from "./EntityFunctions"
import {
	_eraseEntity,
	_loadEntity,
	_loadEntityRange,
	_loadMultipleEntities,
	_loadReverseRangeBetween,
	_setupEntity,
	_updateEntity,
	GENERATED_MIN_ID,
	getLetId,
	RANGE_ITEM_LIMIT,
	resolveTypeReference,
	TypeRef
} from "./EntityFunctions"

export class EntityClient {
	_target: EntityRestInterface;

	constructor(target: EntityRestInterface) {
		this._target = target
	}

	load<T: SomeEntity>(typeRef: TypeRef<T>, id: Id | IdTuple, queryParams: ?Params, extraHeaders?: Params): Promise<T> {
		return _loadEntity(typeRef, id, queryParams, this._target, extraHeaders)
	}

	setup<T: SomeEntity>(listId: ?Id, instance: T): Promise<Id> {
		return _setupEntity(listId, instance, this._target)
	}

	update<T: SomeEntity>(instance: T): Promise<void> {
		return _updateEntity(instance, this._target)
	}

	erase<T: SomeEntity>(instance: T): Promise<void> {
		return _eraseEntity(instance, this._target)
	}

	loadRoot<T: SomeEntity>(typeRef: TypeRef<T>, groupId: Id): Promise<T> {
		return resolveTypeReference(typeRef).then(typeModel => {
			let rootId = [groupId, typeModel.rootId];
			return _loadEntity(RootInstanceTypeRef, rootId, null, this._target).then((root: RootInstance) => {
				return _loadEntity(typeRef, root.reference, null, this._target)
			})
		})
	}

	loadAll<T: ListElementEntity>(typeRef: TypeRef<T>, listId: Id, start: Id = GENERATED_MIN_ID): Promise<T[]> {
		return _loadEntityRange(typeRef, listId, start, RANGE_ITEM_LIMIT, false, this._target).then(elements => {
			if (elements.length === RANGE_ITEM_LIMIT) {
				let lastElementId = getLetId(elements[elements.length - 1])[1]
				return this.loadAll(typeRef, listId, lastElementId).then(nextElements => {
					return elements.concat(nextElements)
				})
			} else {
				return Promise.resolve(elements)
			}
		})
	}

	loadReverseRangeBetween<T: ListElementEntity>(typeRef: TypeRef<T>, listId: Id, start: Id, end: Id,
	                                              rangeItemLimit: number = RANGE_ITEM_LIMIT
	): Promise<{elements: T[], loadedCompletely: boolean}> {
		return _loadReverseRangeBetween(typeRef, listId, start, end, this._target, rangeItemLimit)
	}

	loadRange<T: ListElementEntity>(typeRef: TypeRef<T>, listId: Id, start: Id, count: number, reverse: boolean): Promise<T[]> {
		return _loadEntityRange(typeRef, listId, start, count, reverse, this._target)
	}

	/**
	 * load multiple does not guarantee order or completeness of returned elements.
	 */
	loadMultipleEntities<T: SomeEntity>(typeRef: TypeRef<T>, listId: ?Id, elementIds: Id[]): Promise<T[]> {
		return _loadMultipleEntities(typeRef, listId, elementIds, this._target)
	}
}