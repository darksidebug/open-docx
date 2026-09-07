export interface DocxParagraphProperties {
    alignment?: string | null;

    styleId?: string | null;

    indentation?: {
        left?: number | null;
        right?: number | null;
        firstLine?: number | null;
        hanging?: number | null;
    };

    spacing?: {
        before?: number | null;
        after?: number | null;
        line?: number | null;
        lineRule?: string | null;
    };

    keepNext?: boolean;

    keepLines?: boolean;

    pageBreakBefore?: boolean;

    widowControl?: boolean;

    outlineLevel?: number | null;

    numbering?: {
        numId?: number | null;
        ilvl?: number | null;
    };

    type?: string;

    properties?: Record<string, any>;

    children?: Record<string, any>
}