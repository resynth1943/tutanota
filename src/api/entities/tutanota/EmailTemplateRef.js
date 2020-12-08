// @flow

import {create, TypeRef} from "../../common/EntityFunctions"


export const EmailTemplateRefTypeRef: TypeRef<EmailTemplateRef> = new TypeRef("tutanota", "EmailTemplateRef")
export const _TypeModel: TypeModel = {
	"name": "EmailTemplateRef",
	"since": 44,
	"type": "AGGREGATED_TYPE",
	"id": 1140,
	"rootId": "CHR1dGFub3RhAAR0",
	"versioned": false,
	"encrypted": false,
	"values": {
		"_id": {
			"name": "_id",
			"id": 1141,
			"since": 44,
			"type": "CustomId",
			"cardinality": "One",
			"final": true,
			"encrypted": false
		}
	},
	"associations": {
		"list": {
			"name": "list",
			"id": 1142,
			"since": 44,
			"type": "LIST_ASSOCIATION",
			"cardinality": "One",
			"refType": "EmailTemplate",
			"final": true,
			"external": false
		}
	},
	"app": "tutanota",
	"version": "44"
}

export function createEmailTemplateRef(values?: $Shape<$Exact<EmailTemplateRef>>): EmailTemplateRef {
	return Object.assign(create(_TypeModel, EmailTemplateRefTypeRef), values)
}

export type EmailTemplateRef = {
	_type: TypeRef<EmailTemplateRef>;

	_id: Id;

	list: Id;
}