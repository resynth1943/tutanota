// @flow

import {create, TypeRef} from "../../common/EntityFunctions"

import type {KnowledgeBaseEntryKeywords} from "./KnowledgeBaseEntryKeywords"
import type {KnowledgeBaseStep} from "./KnowledgeBaseStep"

export const KnowledgeBaseEntryTypeRef: TypeRef<KnowledgeBaseEntry> = new TypeRef("tutanota", "KnowledgeBaseEntry")
export const _TypeModel: TypeModel = {
	"name": "KnowledgeBaseEntry",
	"since": 46,
	"type": "LIST_ELEMENT_TYPE",
	"id": 1179,
	"rootId": "CHR1dGFub3RhAASb",
	"versioned": false,
	"encrypted": true,
	"values": {
		"_format": {
			"name": "_format",
			"id": 1183,
			"since": 46,
			"type": "Number",
			"cardinality": "One",
			"final": false,
			"encrypted": false
		},
		"_id": {
			"name": "_id",
			"id": 1181,
			"since": 46,
			"type": "GeneratedId",
			"cardinality": "One",
			"final": true,
			"encrypted": false
		},
		"_ownerEncSessionKey": {
			"name": "_ownerEncSessionKey",
			"id": 1185,
			"since": 46,
			"type": "Bytes",
			"cardinality": "ZeroOrOne",
			"final": true,
			"encrypted": false
		},
		"_ownerGroup": {
			"name": "_ownerGroup",
			"id": 1184,
			"since": 46,
			"type": "GeneratedId",
			"cardinality": "ZeroOrOne",
			"final": true,
			"encrypted": false
		},
		"_permissions": {
			"name": "_permissions",
			"id": 1182,
			"since": 46,
			"type": "GeneratedId",
			"cardinality": "One",
			"final": true,
			"encrypted": false
		},
		"title": {
			"name": "title",
			"id": 1186,
			"since": 46,
			"type": "String",
			"cardinality": "One",
			"final": false,
			"encrypted": true
		},
		"useCase": {
			"name": "useCase",
			"id": 1187,
			"since": 46,
			"type": "String",
			"cardinality": "One",
			"final": false,
			"encrypted": true
		}
	},
	"associations": {
		"keywords": {
			"name": "keywords",
			"id": 1188,
			"since": 46,
			"type": "AGGREGATION",
			"cardinality": "Any",
			"refType": "KnowledgeBaseEntryKeywords",
			"final": false
		},
		"steps": {
			"name": "steps",
			"id": 1189,
			"since": 46,
			"type": "AGGREGATION",
			"cardinality": "Any",
			"refType": "KnowledgeBaseStep",
			"final": false
		}
	},
	"app": "tutanota",
	"version": "46"
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