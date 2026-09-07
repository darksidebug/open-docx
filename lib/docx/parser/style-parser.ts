import type {
    DocxStyles,
    DocxStyle,
} from "@/types/styles";

import {
    attr,
    child,
    children,
} from "../core/xml-helpers";

import { RunPropertiesParser } from "./run-property-parser";
import { ParagraphPropertiesParser } from "./paragraph-properties-parser";

export class StyleParser {
    constructor(
        private readonly runPropertiesParser =
            new RunPropertiesParser(),

        private readonly paragraphPropertiesParser =
            new ParagraphPropertiesParser()
    ) {}

    parse(
        stylesXml: any
    ): DocxStyles {
        const stylesNode =
            this.findStyles(stylesXml);

        if (!stylesNode) {
            return {
                defaults: {},
                paragraphStyles: {} as Map<string, DocxStyle>,
                characterStyles: {} as Map<string, DocxStyle>,
                tableStyles: {} as Map<string, DocxStyle>,
            };
        }

        const result: DocxStyles = {
            defaults: {},
            paragraphStyles: {} as Map<string, DocxStyle>,
            characterStyles: {} as Map<string, DocxStyle>,
            tableStyles: {} as Map<string, DocxStyle>,
        };

        const docDefaults = child(
            stylesNode,
            "docDefaults"
        );

        if (docDefaults) {
            result.defaults = {
                runProperties:
                    this.runPropertiesParser.parse(
                        child(
                            child(
                                docDefaults,
                                "rPrDefault"
                            ),
                            "rPr"
                        )
                    ),

                paragraphProperties:
                    this.paragraphPropertiesParser.parse(
                        child(
                            child(
                                docDefaults,
                                "pPrDefault"
                            ),
                            "pPr"
                        )
                    ),
            };
        }

        for (const node of children(
            stylesNode,
            "style"
        )) {
            const style =
                this.parseStyle(node);

            if (!style) {
                continue;
            }

            switch (style.type) {
                case "paragraph":
                    result.paragraphStyles.set(style.id, style);
                    break;

                case "character":
                    result.characterStyles.set(style.id, style);
                    break;

                case "table":
                    result.tableStyles.set(style.id, style);
                    break;
            }
        }

        return result;
    }

    private parseStyle(
        node: any
    ): DocxStyle | null {
        const id = attr(node, "styleId");
        const type = attr(node, "type");

        if (!id || !type) {
            return null;
        }

        const nameNode = child(
            node,
            "name"
        );

        const basedOnNode = child(
            node,
            "basedOn"
        );

        return {
            id,

            type:
                type === "paragraph"
                    ? "paragraph"
                    : type === "character"
                        ? "character"
                        : type === "table"
                            ? "table"
                            : "other",

            name:
                nameNode
                    ? attr(nameNode, "val") ??
                      id
                    : id,

            basedOn:
                basedOnNode
                    ? attr(
                        basedOnNode,
                        "val"
                    ) ?? undefined
                    : undefined,

            runProperties:
                this.runPropertiesParser.parse(
                    child(node, "rPr")
                ),

            paragraphProperties:
                this.paragraphPropertiesParser.parse(
                    child(node, "pPr")
                ),
        };
    }

    private findStyles(
        node: any
    ): any | null {
        if (!node) {
            return null;
        }

        if (Array.isArray(node)) {
            for (const item of node) {
                const result =
                    this.findStyles(item);

                if (result) {
                    return result;
                }
            }

            return null;
        }

        if (node.name === "styles") {
            return node;
        }

        for (const child of node.children ?? []) {
            const result =
                this.findStyles(child);

            if (result) {
                return result;
            }
        }

        return null;
    }
}