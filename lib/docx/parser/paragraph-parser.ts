import type { DocxParagraphProperties } from "@/types/paragraph";

import {
    child,
    children,
} from "../core/xml-helpers";

import { RunParser } from "./run-parser";
import { ParagraphPropertiesParser } from "./paragraph-properties-parser";

export class ParagraphParser {
    constructor(
        private readonly runParser = new RunParser(),
        private readonly propertiesParser =
            new ParagraphPropertiesParser()
    ) {}

    parse(node: any): DocxParagraphProperties {
        const pPr = child(node, "pPr");

        const children: Record<string, any>[] = [];

        for (const item of node.children ?? []) {
            switch (item.name) {
                case "r":
                    children.push(
                        this.runParser.parse(item)
                    );
                    break;

                case "hyperlink":
                    children.push(
                        this.parseHyperlink(item)
                    );
                    break;

                case "bookmarkStart":
                case "bookmarkEnd":
                    // Preserve later as structural metadata.
                    break;

                case "proofErr":
                    // Formatting metadata only.
                    break;

                case "fldSimple":
                    children.push(
                        ...this.parseField(item)
                    );
                    break;
            }
        }

        return {
            type: "paragraph",
            styleId: this.getStyleId(pPr),
            properties:
                this.propertiesParser.parse(pPr),
            children,
        };
    }

    private getStyleId(
        pPr: any
    ): string | undefined {
        const style = child(
            pPr,
            "pStyle"
        );

        return style
            ? style.attributes?.["@_val"]
            : undefined;
    }

    private parseHyperlink(
        node: any
    ): any {
        return {
            type: "hyperlink",
            relationshipId:
                node.attributes?.["@_id"] ??
                undefined,
            anchor:
                node.attributes?.["@_anchor"] ??
                undefined,
            children: (node.children ?? [])
                .filter(
                    (item: any) =>
                        item.name === "r"
                )
                .map(
                    (item: any) =>
                        this.runParser.parse(item)
                ),
        };
    }

    private parseField(
        node: any
    ): Record<string, any>[][] {
        return (node.children ?? [])
            .filter(
                (item: any) =>
                    item.name === "r"
            )
            .map(
                (item: any) =>
                    this.runParser.parse(item)
            );
    }
}