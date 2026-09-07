import { DocxParagraphProperties } from "./paragraph";
import { DocxRunProperties } from "./run";

export interface DocxStyles {
    defaults: DocxStyleDefaults;

    paragraphStyles: Map<string, DocxStyle>;

    characterStyles: Map<string, DocxStyle>;

    tableStyles: Map<string, DocxStyle>;
}

export interface DocxStyleDefaults {
    run?: DocxRunProperties;

    paragraph?: DocxParagraphProperties;

    runProperties?: DocxRunProperties;

    paragraphProperties?: DocxParagraphProperties;
}

export interface DocxStyle {
    id: string;

    name?: string | null;

    type: "paragraph" | "character" | "table" | "other" | "unknown";

    basedOn?: string | null;

    runProperties?: DocxRunProperties;

    paragraphProperties?: DocxParagraphProperties;
}