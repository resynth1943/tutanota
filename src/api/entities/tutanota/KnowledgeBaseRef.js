// @flow

import {create, TypeRef} from "../../common/EntityFunctions"


export const KnowledgeBaseRefTypeRef: TypeRef<KnowledgeBaseRef> = new TypeRef("tutanota", "KnowledgeBaseRef")
export const _TypeModel: TypeModel = {
	"name": "KnowledgeBaseRef",
	"since": 46,
	"type": "AGGREGATED_TYPE",
	"id": 1190,
	"rootId": "CHR1dGFub3RhAASm",
	"versioned": false,
	"encrypted": false,
	"values": {
		"_id": {
			"name": "_id",
			"id": 1191,
			"since": 46,
			"type": "CustomId",
			"cardinality": "One",
			"final": true,
			"encrypted": false
		}
	},
	"associations": {
		"list": {
			"name": "list",
			"id": 1192,
			"since": 46,
			"type": "LIST_ASSOCIATION",
			"cardinality": "One",
			"refType": "KnowledgeBaseEntry",
			"final": true,
			"external": false
		}
	},
	"app": "tutanota",
	"version": "46"
}

export function createKnowledgeBaseRef(values?: $Shape<$Exact<KnowledgeBaseRef>>): KnowledgeBaseRef {
	return Object.assign(create(_TypeModel, KnowledgeBaseRefTypeRef), values)
}

export type KnowledgeBaseRef = {
	_type: TypeRef<KnowledgeBaseRef>;

	_id: Id;

	list: Id;
}