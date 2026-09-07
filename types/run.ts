export interface DocxRunProperties {
    bold?: boolean;

    italic?: boolean;

    underline?: string | null;

    strike?: boolean;

    doubleStrike?: boolean;

    color?: string | null;

    highlight?: string | null;

    fontFamily?: string | null;

    fontSize?: number | null;

    fontSizeCs?: number | null;

    subscript?: boolean;

    superscript?: boolean;

    smallCaps?: boolean;

    allCaps?: boolean;

    hidden?: boolean;

    characterSpacing?: number | null;

    verticalAlignment?: string | null;

    language?: string | null;

    runProperties?: Record<string, any>;

    type?: string;

    properties?: Record<string, any>;

    children?: Record<string, any>;
}

export interface DocxInline {
  type?: string,
  text?: string,
  breakType?: string
}