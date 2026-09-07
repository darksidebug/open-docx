import type { DocxRunProperties, DocxInline } from "@/types/run";
import { child, children, text } from "../core/xml-helpers";
import { RunPropertiesParser } from "./run-property-parser";

export class RunParser {
    constructor(
        private readonly propertiesParser = new RunPropertiesParser()
    ) {}

    parse(node: any): DocxRunProperties {
        const rPr = child(node, "rPr");

        const childrenNodes: DocxInline[] = [];

        for (const nodeChild of this.getOrderedChildren(node)) {
            switch (nodeChild.name) {
                case "t":
                    childrenNodes.push({
                        type: "text",
                        text: text(nodeChild),
                    });
                    break;

                case "tab":
                    childrenNodes.push({
                        type: "tab",
                    });
                    break;

                case "br":
                    childrenNodes.push({
                        type: "break",
                        breakType: this.getBreakType(nodeChild),
                    });
                    break;

                case "cr":
                    childrenNodes.push({
                        type: "break",
                        breakType: "line",
                    });
                    break;
            }
        }

        return {
            type: "run",
            properties: this.propertiesParser.parse(rPr),
            children: childrenNodes,
        };
    }

    private getBreakType(
        node: any
    ): "line" | "page" | "column" {
        const type = node.attributes?.["@_type"];

        switch (type) {
            case "page":
                return "page";

            case "column":
                return "column";

            default:
                return "line";
        }
    }

    private getOrderedChildren(node: any): any[] {
        return Array.isArray(node)
            ? node
            : node?.children ?? [];
    }
}