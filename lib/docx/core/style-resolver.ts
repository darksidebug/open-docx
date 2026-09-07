import {
    DocxStyle,
    DocxStyles,
} from "@/types/styles";

import {
    DocxRunProperties,
} from "@/types/run";

export class StyleResolver {
    constructor(
        private readonly styles: DocxStyles
    ) {}

    resolveRunProperties(
        styleId?: string,
        direct?: DocxRunProperties
    ): DocxRunProperties {
        const defaults =
            this.styles.defaults?.run ?? {};

        const styleProperties =
            styleId
                ? this.resolveStyleRunProperties(
                    styleId
                )
                : {};

        return this.merge(
            defaults,
            styleProperties,
            direct ?? {}
        );
    }

    resolveStyleRunProperties(
        styleId: string,
        visited = new Set<string>()
    ): DocxRunProperties {
        if (visited.has(styleId)) {
            return {};
        }

        visited.add(styleId);

        const style =
            this.styles.paragraphStyles.get(styleId) ??
            this.styles.characterStyles.get(styleId);

        if (!style) {
            return {};
        }

        const inherited =
            style.basedOn
                ? this.resolveStyleRunProperties(
                    style.basedOn,
                    visited
                )
                : {};

        return this.merge(
            inherited,
            style.runProperties ?? {}
        );
    }

    private merge(
        ...objects: DocxRunProperties[]
    ): DocxRunProperties {
        const result: DocxRunProperties = {};

        for (const object of objects) {
            for (const [
                key,
                value,
            ] of Object.entries(object)) {
                if (
                    value !== undefined &&
                    value !== null
                ) {
                    (result as any)[key] =
                        value;
                }
            }
        }

        return result;
    }
}