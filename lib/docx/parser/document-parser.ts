import type {
    DocxDocument,
    DocxBlock,
} from "@/types/docx";

import { ParagraphParser } from "./paragraph-parser";
import { TableParser } from "./table-parser";

export class DocxDocumentParser {
    constructor(
        private readonly paragraphParser = new ParagraphParser(),
        private readonly tableParser = new TableParser()
    ) {}

    parse(documentXml: any): DocxDocument {
        const body = this.findBody(documentXml);

        if (!body) {
            throw new Error(
                "Invalid DOCX: w:body was not found."
            );
        }

        const blocks: DocxBlock[] = [];

        for (const node of this.getOrderedChildren(body)) {
            switch (node.name) {
                case "p":
                    blocks.push(
                        this.paragraphParser.parse(node)
                    );
                    break;

                case "tbl":
                    blocks.push(
                        this.tableParser.parse(node)
                    );
                    break;

                case "sectPr":
                    // Section properties belong to the
                    // document structure and are handled separately.
                    break;

                default:
                    // Do not silently destroy unknown content.
                    // Diagnostics will handle unsupported elements later.
                    break;
            }
        }

        return {
            type: "document",
            blocks,
        } as DocxDocument;
    }

    private findBody(
        documentXml: any
    ): any | null {
        return this.findNode(
            documentXml,
            "body"
        );
    }

    private findNode(
        node: any,
        targetName: string
    ): any | null {
        if (!node) {
            return null;
        }

        if (node.name === targetName) {
            return node;
        }

        if (!Array.isArray(node.children)) {
            return null;
        }

        for (const child of node.children) {
            const result = this.findNode(
                child,
                targetName
            );

            if (result) {
                return result;
            }
        }

        return null;
    }

    private getOrderedChildren(
        node: any
    ): any[] {
        return node?.children ?? [];
    }
}