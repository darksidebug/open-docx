import { DocxBlock } from "./docx";

export interface DocxTable {
    type: "table";

    properties: DocxTableProperties;

    rows: DocxTableRow[];
}

export interface DocxTableRow {
    type: "tableRow";

    properties: {
        height?: number | null;

        cantSplit?: boolean;
    };

    cells: DocxTableCell[];
}

export interface DocxTableCell {
    type: "tableCell";

    properties: DocxTableCellProperties;

    children: DocxBlock[];
}

export interface DocxTableCellProperties {
    width?: number | null;

    widthType?: string | null;

    colspan?: number;

    rowspan?: number;

    verticalAlignment?: string | null;

    shading?: string | null;

    borders?: DocxBorders;
}

export interface DocxTableProperties {
    width?: number | null;

    widthType?: string | null;

    alignment?: string | null;

    layout?: string | null;

    styleId?: string | null;

    borders?: DocxBorders;
}

export interface DocxBorders {
    top?: DocxBorder;

    bottom?: DocxBorder;

    left?: DocxBorder;

    right?: DocxBorder;

    insideHorizontal?: DocxBorder;

    insideVertical?: DocxBorder;
}

export interface DocxBorder {
    style?: string | null;

    size?: number | null;

    color?: string | null;
}