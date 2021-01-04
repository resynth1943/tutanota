// @flow

import {create, TypeRef} from "../../common/EntityFunctions"


export const OutOfOfficeNotificationRecipientTypeRef: TypeRef<OutOfOfficeNotificationRecipient> = new TypeRef("tutanota", "OutOfOfficeNotificationRecipient")
export const _TypeModel: TypeModel = {
	"name": "OutOfOfficeNotificationRecipient",
	"since": 44,
	"type": "LIST_ELEMENT_TYPE",
	"id": 1141,
	"rootId": "CHR1dGFub3RhAAR1",
	"versioned": false,
	"encrypted": false,
	"values": {
		"_format": {
			"name": "_format",
			"id": 1145,
			"since": 44,
			"type": "Number",
			"cardinality": "One",
			"final": false,
			"encrypted": false
		},
		"_id": {
			"name": "_id",
			"id": 1143,
			"since": 44,
			"type": "CustomId",
			"cardinality": "One",
			"final": true,
			"encrypted": false
		},
		"_ownerGroup": {
			"name": "_ownerGroup",
			"id": 1146,
			"since": 44,
			"type": "GeneratedId",
			"cardinality": "ZeroOrOne",
			"final": true,
			"encrypted": false
		},
		"_permissions": {
			"name": "_permissions",
			"id": 1144,
			"since": 44,
			"type": "GeneratedId",
			"cardinality": "One",
			"final": true,
			"encrypted": false
		}
	},
	"associations": {},
	"app": "tutanota",
	"version": "46"
}

export function createOutOfOfficeNotificationRecipient(values?: $Shape<$Exact<OutOfOfficeNotificationRecipient>>): OutOfOfficeNotificationRecipient {
	return Object.assign(create(_TypeModel, OutOfOfficeNotificationRecipientTypeRef), values)
}

export type OutOfOfficeNotificationRecipient = {
	_type: TypeRef<OutOfOfficeNotificationRecipient>;

	_format: NumberString;
	_id: IdTuple;
	_ownerGroup: ?Id;
	_permissions: Id;
}