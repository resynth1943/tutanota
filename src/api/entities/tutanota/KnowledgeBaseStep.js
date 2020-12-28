// @flow

import {create, TypeRef} from "../../common/EntityFunctions"


export const KnowledgeBaseStepTypeRef: TypeRef<KnowledgeBaseStep> = new TypeRef("tutanota", "KnowledgeBaseStep")
export const _TypeModel: TypeModel = {
	"name": "KnowledgeBaseStep",
	"since": 45,
	"type": "AGGREGATED_TYPE",
	"id": 1144,
	"rootId": "CHR1dGFub3RhAAR4",
	"versioned": false,
	"encrypted": false,
	"values": {
		"_id": {
			"name": "_id",
			"id": 1145,
			"since": 45,
			"type": "CustomId",
			"cardinality": "One",
			"final": true,
			"encrypted": false
		},
		"description": {
			"name": "description",
			"id": 1147,
			"since": 45,
			"type": "String",
			"cardinality": "One",
			"final": false,
			"encrypted": true
		},
		"stepNumber": {
			"name": "stepNumber",
			"id": 1146,
			"since": 45,
			"type": "Number",
			"cardinality": "One",
			"final": false,
			"encrypted": true
		}
	},
	"associations": {
		"template": {
			"name": "template",
			"id": 1148,
			"since": 45,
			"type": "LIST_ELEMENT_ASSOCIATION",
			"cardinality": "ZeroOrOne",
			"refType": "EmailTemplate",
			"final": false,
			"external": false
		}
	},
	"app": "tutanota",
	"version": "45"
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