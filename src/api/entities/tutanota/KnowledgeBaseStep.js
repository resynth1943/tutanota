// @flow

import {create, TypeRef} from "../../common/EntityFunctions"


export const KnowledgeBaseStepTypeRef: TypeRef<KnowledgeBaseStep> = new TypeRef("tutanota", "KnowledgeBaseStep")
export const _TypeModel: TypeModel = {
	"name": "KnowledgeBaseStep",
	"since": 46,
	"type": "AGGREGATED_TYPE",
	"id": 1171,
	"rootId": "CHR1dGFub3RhAAST",
	"versioned": false,
	"encrypted": false,
	"values": {
		"_id": {
			"name": "_id",
			"id": 1172,
			"since": 46,
			"type": "CustomId",
			"cardinality": "One",
			"final": true,
			"encrypted": false
		},
		"description": {
			"name": "description",
			"id": 1174,
			"since": 46,
			"type": "String",
			"cardinality": "One",
			"final": false,
			"encrypted": true
		},
		"stepNumber": {
			"name": "stepNumber",
			"id": 1173,
			"since": 46,
			"type": "Number",
			"cardinality": "One",
			"final": false,
			"encrypted": true
		}
	},
	"associations": {
		"template": {
			"name": "template",
			"id": 1175,
			"since": 46,
			"type": "LIST_ELEMENT_ASSOCIATION",
			"cardinality": "ZeroOrOne",
			"refType": "EmailTemplate",
			"final": false,
			"external": false
		}
	},
	"app": "tutanota",
	"version": "46"
}

export function createKnowledgeBaseStep(values?: $Shape<$Exact<KnowledgeBaseStep>>): KnowledgeBaseStep {
	return Object.assign(create(_TypeModel, KnowledgeBaseStepTypeRef), values)
}

export type KnowledgeBaseStep = {
	_type: TypeRef<KnowledgeBaseStep>;

	_id: Id;
	description: string;
	stepNumber: NumberString;

	template: ?IdTuple;
}