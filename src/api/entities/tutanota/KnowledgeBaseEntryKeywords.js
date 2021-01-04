// @flow

import {create, TypeRef} from "../../common/EntityFunctions"


export const KnowledgeBaseEntryKeywordsTypeRef: TypeRef<KnowledgeBaseEntryKeywords> = new TypeRef("tutanota", "KnowledgeBaseEntryKeywords")
export const _TypeModel: TypeModel = {
	"name": "KnowledgeBaseEntryKeywords",
	"since": 46,
	"type": "AGGREGATED_TYPE",
	"id": 1176,
	"rootId": "CHR1dGFub3RhAASY",
	"versioned": false,
	"encrypted": false,
	"values": {
		"_id": {
			"name": "_id",
			"id": 1177,
			"since": 46,
			"type": "CustomId",
			"cardinality": "One",
			"final": true,
			"encrypted": false
		},
		"keyword": {
			"name": "keyword",
			"id": 1178,
			"since": 46,
			"type": "String",
			"cardinality": "One",
			"final": false,
			"encrypted": true
		}
	},
	"associations": {},
	"app": "tutanota",
	"version": "46"
}

export function createKnowledgeBaseEntryKeywords(values?: $Shape<$Exact<KnowledgeBaseEntryKeywords>>): KnowledgeBaseEntryKeywords {
	return Object.assign(create(_TypeModel, KnowledgeBaseEntryKeywordsTypeRef), values)
}

export type KnowledgeBaseEntryKeywords = {
	_type: TypeRef<KnowledgeBaseEntryKeywords>;

	_id: Id;
	keyword: string;
}