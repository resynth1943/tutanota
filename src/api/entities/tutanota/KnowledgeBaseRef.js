// @flow

import {create, TypeRef} from "../../common/EntityFunctions"


export const KnowledgeBaseRefTypeRef: TypeRef<KnowledgeBaseRef> = new TypeRef("tutanota", "KnowledgeBaseRef")
export const _TypeModel: TypeModel = {
	"name": "KnowledgeBaseRef",
	"since": 45,
	"type": "AGGREGATED_TYPE",
	"id": 1163,
	"rootId": "CHR1dGFub3RhAASL",
	"versioned": false,
	"encrypted": false,
	"values": {
		"_id": {
			"name": "_id",
			"id": 1164,
			"since": 45,
			"type": "CustomId",
			"cardinality": "One",
			"final": true,
			"encrypted": false
		}
	},
	"associations": {
		"list": {
			"name": "list",
			"id": 1165,
			"since": 45,
			"type": "LIST_ASSOCIATION",
			"cardinality": "One",
			"refType": "KnowledgeBaseEntry",
			"final": true,
			"external": false
		}
	},
	"app": "tutanota",
	"version": "45"
}

export function createKnowledgeBaseRef(values?: $Shape<$Exact<KnowledgeBaseRef>>): KnowledgeBaseRef {
	return Object.assign(create(_TypeModel, KnowledgeBaseRefTypeRef), values)
}

export type KnowledgeBaseRef = {
	_type: TypeRef<KnowledgeBaseRef>;

	_id: Id;

	list: Id;
}