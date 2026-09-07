import type {
    DocxNumbering,
    DocxNumberingLevel,
} from "@/types/numbering";

export interface ResolvedNumbering {
    numId: string;
    abstractNumberId: string | number;
    level: number;
    start: number;
    format: string;
    text?: string;
    alignment?: string | null;
    indentation?: {
        left?: number | null;
        hanging?: number | null;
        firstLine?: number | null;
    };
}

export class NumberingResolver {
    constructor(
        private readonly numbering: DocxNumbering
    ) {}

    resolve(
        numId: string,
        level: number
    ): ResolvedNumbering | null {
        const num = this.numbering.numbers.get(numId);

        if (!num) {
            return null;
        }

        const abstractNum =
            this.numbering.abstractNumbers.get(Number(num.abstractNumberId));

        if (!abstractNum) {
            return null;
        }

        const numberingLevel = abstractNum.levels.get(level);

        if (!numberingLevel) {
            return null;
        }

        return {
            numId,
            abstractNumberId: num.abstractNumberId,
            level,
            start: numberingLevel.start ?? 1,
            format: numberingLevel.format ?? "decimal",
            text: numberingLevel.text,
            alignment: numberingLevel.alignment,
            indentation: numberingLevel.indentation,
        };
    }
}