import { child } from "../xml";

import {
    DocxBlock,
} from "@/types/docx";

import { ParagraphParser } from "./paragraph-parser";
import { TableParser } from "./table-parser";

export class DocumentBodyParser {
    constructor(
        private readonly paragraphParser:
            ParagraphParser,

        private readonly tableParser:
            TableParser
    ) {}

    parse(
        body: any
    ): DocxBlock[] {
        const blocks: DocxBlock[] = [];

        if (!body) {
            return blocks;
        }

        for (
            const paragraph of
            this.getChildren(
                body,
                "w:p"
            )
        ) {
            blocks.push(
                this.paragraphParser.parse(
                    paragraph
                )
            );
        }

        for (
            const table of
            this.getChildren(
                body,
                "w:tbl"
            )
        ) {
            blocks.push(
                this.tableParser.parse(
                    table
                )
            );
        }

        return blocks;
    }

    private getChildren(
        node: any,
        name: string
    ): any[] {
        const value = node?.[name];

        if (!value) {
            return [];
        }

        return Array.isArray(value)
            ? value
            : [value];
    }
}