import {
    attr,
    boolAttr,
    child,
    intAttr,
} from "../xml";

import {
    DocxParagraphProperties,
} from "@/types/paragraph";

export class ParagraphPropertiesParser {
    parse(
        node: any
    ): DocxParagraphProperties {
        if (!node) {
            return {};
        }

        const result:
            DocxParagraphProperties = {};

        const style =
            child(node, "w:pStyle");

        if (style) {
            result.styleId =
                attr(style, "val");
        }

        const alignment =
            child(node, "w:jc");

        if (alignment) {
            result.alignment =
                attr(alignment, "val");
        }

        const indentation =
            child(node, "w:ind");

        if (indentation) {
            result.indentation = {
                left: intAttr(
                    indentation,
                    "left"
                ),

                right: intAttr(
                    indentation,
                    "right"
                ),

                firstLine: intAttr(
                    indentation,
                    "firstLine"
                ),

                hanging: intAttr(
                    indentation,
                    "hanging"
                ),
            };
        }

        const spacing =
            child(node, "w:spacing");

        if (spacing) {
            result.spacing = {
                before: intAttr(
                    spacing,
                    "before"
                ),

                after: intAttr(
                    spacing,
                    "after"
                ),

                line: intAttr(
                    spacing,
                    "line"
                ),

                lineRule: attr(
                    spacing,
                    "lineRule"
                ),
            };
        }

        if (child(node, "w:keepNext")) {
            result.keepNext =
                boolAttr(
                    child(node, "w:keepNext"),
                    "val"
                );
        }

        if (child(node, "w:keepLines")) {
            result.keepLines =
                boolAttr(
                    child(node, "w:keepLines"),
                    "val"
                );
        }

        if (
            child(
                node,
                "w:pageBreakBefore"
            )
        ) {
            result.pageBreakBefore =
                boolAttr(
                    child(
                        node,
                        "w:pageBreakBefore"
                    ),
                    "val"
                );
        }

        if (
            child(
                node,
                "w:widowControl"
            )
        ) {
            result.widowControl =
                boolAttr(
                    child(
                        node,
                        "w:widowControl"
                    ),
                    "val"
                );
        }

        const outline =
            child(node, "w:outlineLvl");

        if (outline) {
            result.outlineLevel =
                intAttr(
                    outline,
                    "val"
                );
        }

        const numPr =
            child(node, "w:numPr");

        if (numPr) {
            result.numbering = {
                numId: intAttr(
                    child(numPr, "w:numId"),
                    "val"
                ),

                ilvl: intAttr(
                    child(numPr, "w:ilvl"),
                    "val"
                ),
            };
        }

        return result;
    }
}