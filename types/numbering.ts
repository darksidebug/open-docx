export interface DocxNumbering {
    abstractNumbers: Map<number, DocxAbstractNumbering>;

    numbers: Map<number | string, DocxNumberingInstance>;
}

export interface DocxAbstractNumbering {
    id: number;

    levels: Map<number, DocxNumberingLevel>;
}

export interface DocxNumberingLevel {
    level: number;

    start: number;

    format: string;

    text: string;

    alignment?: string | null;

    indentation?: {
        left?: number | undefined | null;
        hanging?: number | undefined | null;
        firstLine?: number | undefined | null
    };
}

export interface DocxNumberingInstance {
    id: number;

    abstractNumberId: number;
}