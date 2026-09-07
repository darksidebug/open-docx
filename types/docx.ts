import { DocxMedia } from "./media";
import { DocxNumbering } from "./numbering";
import { DocxParagraphProperties } from "./paragraph";
import { DocxRelationships } from "./relationships";
import { DocxRunProperties } from "./run";
import { DocxStyles } from "./styles";
import { DocxTable } from "./table";

export interface DocxDocument {
    body: DocxBlock[];
    sections: DocxSection[];
    headers: DocxHeader[];
    footers: DocxFooter[];

    styles: DocxStyles;
    numbering: DocxNumbering;

    relationships: DocxRelationships;
    media: DocxMedia[];

    metadata: DocxMetadata;
    type: string;

    blocks: DocxBlock
}

export type DocxBlock =
    | DocxParagraph
    | DocxTable
    | DocxImage
    | DocxPageBreak;

export type DocxInline =
    | DocxRun
    | DocxHyperlink
    | DocxImage
    | DocxBreak
    | DocxTab;

export interface DocxParagraph {
    type: "paragraph";

    styleId?: string | null;

    properties: DocxParagraphProperties;

    children: DocxInline[];
}

export interface DocxRun {
    type: "run";

    properties: DocxRunProperties;

    text: string;
}

export interface DocxBreak {
    type: "break";

    breakType: "line" | "page" | "column";
}

export interface DocxHyperlink {
    type: "hyperlink";

    relationshipId?: string | null;

    target?: string | null;

    children: DocxInline[];
}

export interface DocxTab {
    type: "tab";
}

export interface DocxSection {
    properties: DocxSectionProperties;

    headerReferences: string[];

    footerReferences: string[];
}

export interface DocxSectionProperties {
    pageWidth: number | null;

    pageHeight: number | null;

    marginTop: number | null;

    marginBottom: number | null;

    marginLeft: number | null;

    marginRight: number | null;

    headerDistance: number | null;

    footerDistance: number | null;

    orientation: string | null;

    columns: number | null;
}

export interface DocxImage {
    type: "image";

    relationshipId?: string | null;

    width?: number | null;

    height?: number | null;

    data?: Uint8Array;

    contentType?: string | null;
}

export interface DocxHeader {
    id: string;

    blocks: DocxBlock[];
}

export interface DocxFooter {
    id: string;

    blocks: DocxBlock[];
}

export interface DocxMetadata {
    title?: string | null;

    subject?: string | null;

    creator?: string | null;

    description?: string | null;

    keywords?: string | null;

    createdAt?: string | null;

    modifiedAt?: string | null;
}