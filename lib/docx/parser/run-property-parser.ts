import type { DocxRunProperties } from "@/types/run";
import {
    attr,
    child,
    intAttr,
} from "../core/xml-helpers";

export class RunPropertiesParser {
    parse(node: any): DocxRunProperties {
        if (!node) {
            return {};
        }

        const rFonts = child(node, "rFonts");
        const color = child(node, "color");
        const highlight = child(node, "highlight");
        const underline = child(node, "u");
        const spacing = child(node, "spacing");
        const vertAlign = child(node, "vertAlign");
        const lang = child(node, "lang");

        return {
            bold: this.booleanProperty(node, "b"),
            italic: this.booleanProperty(node, "i"),

            underline: underline
                ? attr(underline, "val") ?? "single"
                : undefined,

            strike: this.booleanProperty(node, "strike"),
            doubleStrike: this.booleanProperty(node, "dstrike"),

            color: color
                ? attr(color, "val") ?? undefined
                : undefined,

            highlight: highlight
                ? attr(highlight, "val") ?? undefined
                : undefined,

            fontFamily: this.resolveFontFamily(rFonts),

            fontSize: this.parseHalfPointSize(child(node, "sz")),
            fontSizeCs: this.parseHalfPointSize(child(node, "szCs")),

            smallCaps: this.booleanProperty(node, "smallCaps"),
            allCaps: this.booleanProperty(node, "caps"),
            hidden: this.booleanProperty(node, "vanish"),

            subscript:
                vertAlign && attr(vertAlign, "val") === "subscript"
                    ? true
                    : undefined,

            superscript:
                vertAlign && attr(vertAlign, "val") === "superscript"
                    ? true
                    : undefined,

            characterSpacing: spacing
                ? intAttr(spacing, "val") ?? undefined
                : undefined,

            verticalAlignment: vertAlign
                ? attr(vertAlign, "val") ?? undefined
                : undefined,

            language: lang
                ? (
                    attr(lang, "val") ??
                    attr(lang, "eastAsia") ??
                    attr(lang, "bidi")
                )
                : undefined,
        };
    }

    private booleanProperty(
        parent: any,
        name: string
    ): boolean | undefined {
        const node = child(parent, name);

        if (!node) {
            return undefined;
        }

        const value = attr(node, "val");

        if (value === null) {
            return true;
        }

        return ![
            "0",
            "false",
            "off",
            "none",
        ].includes(value.toLowerCase());
    }

    private parseHalfPointSize(
        node: any
    ): number | undefined {
        if (!node) {
            return undefined;
        }

        const value = intAttr(node, "val");

        if (value === null) {
            return undefined;
        }

        return value / 2;
    }

    private resolveFontFamily(
        node: any
    ): string | undefined {
        if (!node) {
            return undefined;
        }

        return (
            attr(node, "ascii") ??
            attr(node, "hAnsi") ??
            attr(node, "eastAsia") ??
            attr(node, "cs") ??
            undefined
        );
    }
}