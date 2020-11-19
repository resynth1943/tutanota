//@flow

import type {IndexName, ObjectStoreName} from "../search/DbFacade"
import {DbFacade} from "../search/DbFacade"

const DB_VERSION = 1

export const EntityRestCacheOS: ObjectStoreName = "EntityRestCache"
export const EntityListInfoOS: ObjectStoreName = "EntityListInfo"

export type EntityCacheEntry = {[string]: any}

/** Key is type and list id */
export type EntityCacheListInfoEntry = {|
	upperRangeId: Id,
	lowerRangeId: Id,
|}

export function newEntityCacheDb(): DbFacade {
	return new DbFacade(DB_VERSION, (_, db) => {
		db.createObjectStore(EntityRestCacheOS)
		// We include elementId in the index because when we do range requests we want to only have values which match typeAndListId but
		// we want to filter based on elementId
		// Basically we want to do
		// WHERE listId = X AND elementId > something
		// both listId and elementId must be part of the index key then so that we can specify things for N-dimensional selection
		// restCacheOS.createIndex(EntityListIdIndex, COMPOSITE_KEY, {unique: false})
		db.createObjectStore(EntityListInfoOS)
	})
}