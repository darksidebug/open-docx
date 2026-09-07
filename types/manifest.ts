export interface DocxPackageManifest {
    hasDocument: boolean;

    hasStyles: boolean;

    hasNumbering: boolean;

    hasSettings: boolean;

    hasTheme: boolean;

    headers: string[];

    footers: string[];

    media: string[];

    footnotes: boolean;

    endnotes: boolean;
}