// src/lib/docx/DocxParser.ts

import mammoth from "mammoth";
import sanitizeHtml from "sanitize-html";

export interface ParsedDocx {
    html: string;
    messages: Awaited<ReturnType<typeof mammoth.convertToHtml>>["messages"];
}

export class DocxParser {
    async parse(file: File): Promise<ParsedDocx> {
        const arrayBuffer = await file.arrayBuffer();

        const result = await mammoth.convertToHtml(
            {
                arrayBuffer,
            },
            {
                includeDefaultStyleMap: true,
                styleMap: [
                    "p[style-name='Title'] => h1.title",
                    "p[style-name='Heading 1'] => h1",
                    "p[style-name='Heading 2'] => h2",
                    "p[style-name='Heading 3'] => h3",
                ],
            }
        );

        const html = sanitizeHtml(result.value, {
            allowedTags: [
                "p",
                "br",
                "strong",
                "b",
                "em",
                "i",
                "u",
                "s",
                "sub",
                "sup",
                "span",
                "div",
                "h1",
                "h2",
                "h3",
                "h4",
                "h5",
                "h6",
                "ul",
                "ol",
                "li",
                "blockquote",
                "a",
                "img",
                "table",
                "thead",
                "tbody",
                "tr",
                "th",
                "td",
            ],

            allowedAttributes: {
                "*": [
                    "class",
                    "style",
                ],

                a: [
                    "href",
                    "target",
                    "rel",
                ],

                img: [
                    "src",
                    "alt",
                    "width",
                    "height",
                ],
            },

            allowedStyles: {
                "*": {
                    "font-family": [/^[^;]+$/],
                    "font-size": [/^[\d.]+(px|pt|em|rem)?$/],
                    "font-weight": [/^[\w-]+$/],
                    "font-style": [/^[\w-]+$/],
                    "text-decoration": [/^[^;]+$/],
                    "color": [/^#[0-9a-fA-F]{3,8}$/],
                    "background-color": [/^#[0-9a-fA-F]{3,8}$/],
                    "text-align": [/^(left|right|center|justify)$/],
                    "vertical-align": [/^(top|middle|bottom)$/],
                    "line-height": [/^[\d.]+(px|pt|em|rem|%)?$/],
                    "margin-left": [/^[\d.]+(px|pt|em|rem)?$/],
                    "margin-right": [/^[\d.]+(px|pt|em|rem)?$/],
                    "text-indent": [/^[\d.]+(px|pt|em|rem)?$/],
                    "width": [/^[\d.]+(px|pt|em|rem|%)?$/],
                    "height": [/^[\d.]+(px|pt|em|rem|%)?$/],
                },
            },
        });

        return {
            html,
            messages: result.messages,
        };
    }
}