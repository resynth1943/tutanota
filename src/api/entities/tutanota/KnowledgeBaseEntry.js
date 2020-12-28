// @flow

import {create, TypeRef} from "../../common/EntityFunctions"

import type {KnowledgeBaseEntryKeywords} from "./KnowledgeBaseEntryKeywords"
import type {KnowledgeBaseStep} from "./KnowledgeBaseStep"

export const KnowledgeBaseEntryTypeRef: TypeRef<KnowledgeBaseEntry> = new TypeRef("tutanota", "KnowledgeBaseEntry")
export const _TypeModel: TypeModel = {
	"name": "KnowledgeBaseEntry",
	"since": 45,
	"type": "LIST_ELEMENT_TYPE",
	"id": 1152,
	"rootId": "CHR1dGFub3RhAASA",
	"versioned": false,
	"encrypted": true,
	"values": {
		"_format": {
			"name": "_format",
			"id": 1156,
			"since": 45,
			"type": "Number",
			"cardinality": "One",
			"final": false,
			"encrypted": false
		},
		"_id": {
			"name": "_id",
			"id": 1154,
			"since": 45,
			"type": "GeneratedId",
			"cardinality": "One",
			"final": true,
			"encrypted": false
		},
		"_ownerEncSessionKey": {
			"name": "_ownerEncSessionKey",
			"id": 1158,
			"since": 45,
			"type": "Bytes",
			"cardinality": "ZeroOrOne",
			"final": true,
			"encrypted": false
		},
		"_ownerGroup": {
			"name": "_ownerGroup",
			"id": 1157,
			"since": 45,
			"type": "GeneratedId",
			"cardinality": "ZeroOrOne",
			"final": true,
			"encrypted": false
		},
		"_permissions": {
			"name": "_permissions",
			"id": 1155,
			"since": 45,
			"type": "GeneratedId",
			"cardinality": "One",
			"final": true,
			"encrypted": false
		},
		"title": {
			"name": "title",
			"id": 1159,
			"since": 45,
			"type": "String",
			"cardinality": "One",
			"final": false,
			"encrypted": true
		},
		"useCase": {
			"name": "useCase",
			"id": 1160,
			"since": 45,
			"type": "String",
			"cardinality": "One",
			"final": false,
			"encrypted": true
		}
	},
	"associations": {
		"keywords": {
			"name": "keywords",
			"id": 1161,
			"since": 45,
			"type": "AGGREGATION",
			"cardinality": "Any",
			"refType": "KnowledgeBaseEntryKeywords",
			"final": false
		},
		"steps": {
			"name": "steps",
			"id": 1162,
			"since": 45,
			"type": "AGGREGATION",
			"cardinality": "Any",
			"refType": "KnowledgeBaseStep",
			"final": false
		}
	},
	"app": "tutanota",
	"version": "45"
}

export function createKnowledgeBaseEntry(values?: $Shape<$Exact<KnowledgeBaseEntry>>): KnowledgeBaseEntry {
	return Object.assign(create(_TypeModel, KnowledgeBaseEntryTypeRef), values)
}

export type KnowledgeBaseEntry = {
	_type: TypeRef<KnowledgeBaseEntry>;
	_errors: Object;

	_format: NumberString;
	_id: IdTuple;
	_ownerEncSessionKey: ?Uint8Array;
	_ownerGroup: ?Id;
	_permissions: Id;
	title: string;
	useCase: string;

	keywords: KnowledgeBaseEntryKeywords[];
	steps: KnowledgeBaseStep[];
}