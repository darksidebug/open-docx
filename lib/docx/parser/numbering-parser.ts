import {
    attr,
    child,
    intAttr,
} from "../xml";

import {
    DocxAbstractNumbering,
    DocxNumbering,
    DocxNumberingInstance,
    DocxNumberingLevel,
} from "@/types/numbering";

export class NumberingParser {
    parse(
        root: any
    ): DocxNumbering {
        const result: DocxNumbering = {
            abstractNumbers: new Map(),

            numbers: new Map(),
        };

        if (!root) {
            return result;
        }

        for (
            const abstractNode of
            this.getChildren(
                root,
                "w:abstractNum"
            )
        ) {
            const id =
                intAttr(
                    abstractNode,
                    "abstractNumId"
                );

            if (id === null) {
                continue;
            }

            const abstractNumber:
                DocxAbstractNumbering = {
                id,

                levels: new Map(),
            };

            for (
                const levelNode of
                this.getChildren(
                    abstractNode,
                    "w:lvl"
                )
            ) {
                const level =
                    intAttr(
                        levelNode,
                        "ilvl"
                    );

                if (level === null) {
                    continue;
                }

                const start =
                    intAttr(
                        child(
                            levelNode,
                            "w:start"
                        ),
                        "val"
                    ) ?? 1;

                const format =
                    attr(
                        child(
                            levelNode,
                            "w:numFmt"
                        ),
                        "val"
                    ) ?? "decimal";

                const levelText =
                    attr(
                        child(
                            levelNode,
                            "w:lvlText"
                        ),
                        "val"
                    ) ?? "%1.";

                const alignment =
                    attr(
                        child(
                            levelNode,
                            "w:lvlJc"
                        ),
                        "val"
                    );

                const indentation =
                    child(
                        child(
                            levelNode,
                            "w:pPr"
                        ),
                        "w:ind"
                    );

                const numberingLevel:
                    DocxNumberingLevel = {
                    level,

                    start,

                    format,

                    text: levelText,

                    alignment,

                    indentation: {
                        left: intAttr(
                            indentation,
                            "left"
                        ),

                        hanging: intAttr(
                            indentation,
                            "hanging"
                        ),
                    },
                };

                abstractNumber.levels.set(
                    level,
                    numberingLevel
                );
            }

            result.abstractNumbers.set(
                id,
                abstractNumber
            );
        }

        for (
            const numNode of
            this.getChildren(
                root,
                "w:num"
            )
        ) {
            const id =
                intAttr(
                    numNode,
                    "numId"
                );

            const abstractId =
                intAttr(
                    child(
                        numNode,
                        "w:abstractNumId"
                    ),
                    "val"
                );

            if (
                id === null ||
                abstractId === null
            ) {
                continue;
            }

            const instance:
                DocxNumberingInstance = {
                id,

                abstractNumberId:
                    abstractId,
            };

            result.numbers.set(
                id,
                instance
            );
        }

        return result;
    }

    private getChildren(
        node: any,
        name: string
    ): any[] {
        const value = node?.[name];

        if (!value) {
            return [];
        }

        return Array.isArray(value)
            ? value
            : [value];
    }
}