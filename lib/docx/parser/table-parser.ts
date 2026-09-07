import { TableMergeResolver } from "../core/table-merge-resolver";

export class TableParser {
    constructor(
        private readonly mergeResolver =
            new TableMergeResolver()
    ) {}

    parse(node: any): any {
        const properties =
            this.parseProperties(
                child(node, "tblPr")
            );

        const rows = [];

        for (
            const item of node.children ?? []
        ) {
            if (item.name !== "tr") {
                continue;
            }

            rows.push(
                this.parseRow(item)
            );
        }

        return this.mergeResolver.resolve({
            type: "table",
            properties,
            rows,
        });
    }

    private parseRow(node: any): any {
        const cells = [];

        for (
            const item of node.children ?? []
        ) {
            if (item.name !== "tc") {
                continue;
            }

            cells.push(
                this.parseCell(item)
            );
        }

        return {
            type: "tableRow",
            cells,
        };
    }

    private parseCell(node: any): any {
        const tcPr =
            child(node, "tcPr");

        const gridSpan =
            child(tcPr, "gridSpan");

        const colspan = gridSpan
            ? Number(
                attr(gridSpan, "val")
            ) || 1
            : 1;

        return {
            type: "tableCell",

            colspan,

            rowspan: 1,

            verticalMerge:
                this.parseVerticalMerge(
                    tcPr
                ),

            children:
                this.parseCellBlocks(node),
        };
    }

    private parseVerticalMerge(
        tcPr: any
    ): any {
        const node =
            child(tcPr, "vMerge");

        if (!node) {
            return undefined;
        }

        const value =
            attr(node, "val");

        return {
            type:
                value === "restart"
                    ? "restart"
                    : "continue",
        };
    }

    private parseCellBlocks(
        node: any
    ): any[] {
        const blocks = [];

        for (
            const childNode of
            node.children ?? []
        ) {
            if (
                childNode.name === "p"
            ) {
                blocks.push(
                    this.paragraphParser.parse(
                        childNode
                    )
                );
            }

            if (
                childNode.name === "tbl"
            ) {
                blocks.push(
                    this.parse(
                        childNode
                    )
                );
            }
        }

        return blocks;
    }
}