import {
    XMLParser,
    X2jOptions
} from "fast-xml-parser";

export class DocxXmlParser {
    private parser: XMLParser;

    constructor() {
         this.parser = new XMLParser({
            ignoreAttributes: false,
            attributeNamePrefix: "@_",
            removeNSPrefix: true,
            textNodeName: "#text",
            trimValues: false,
            preserveOrder: true,
        });
    }

    parse(xml: string): unknown {
        return this.parser.parse(xml);
    }
}