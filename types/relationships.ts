export interface DocxRelationships {
    items: Map<string, DocxRelationship>;
}

export interface DocxRelationship {
    id: string;

    type: string;

    target: string;

    targetMode?: string | null;
}