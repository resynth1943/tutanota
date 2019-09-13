// ES5 as it is used from the build process, too
// ATTENTION: cannot be imported with {} from CJS modules is not supported for dist-builds currently (must be a systemjs builder bug)

export var Type = {
	Element: "ELEMENT_TYPE",
	ListElement: "LIST_ELEMENT_TYPE",
	DataTransfer: "DATA_TRANSFER_TYPE",
	Aggregated: "AGGREGATED_TYPE"
}

export var Cardinality = {
	ZeroOrOne: "ZeroOrOne",
	Any: "Any",
	One: "One"
}

export var AssociationType = {
	ElementAssociation: "ELEMENT_ASSOCIATION",
	ListAssociation: "LIST_ASSOCIATION",
	ListElementAssociation: "LIST_ELEMENT_ASSOCIATION",
	Aggregation: "AGGREGATION",
}

export var ValueType = {
	String: "String",
	Number: "Number",
	Bytes: "Bytes",
	Date: "Date",
	Boolean: "Boolean",
	GeneratedId: "GeneratedId",
	CustomId: "CustomId",
	CompressedString: "CompressedString",
}

export var ResourceType = {
	Persistence: "Persistence",
	Service: "Service"
}

export var ValueToFlowTypes = {
	String: "string",
	Number: "NumberString",
	Bytes: "Uint8Array",
	Date: "Date",
	Boolean: "boolean",
	GeneratedId: "Id",
	CustomId: "Id",
	CompressedString: "string",
}
