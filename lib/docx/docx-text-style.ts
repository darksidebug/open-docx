import { TextStyle } from "@tiptap/extension-text-style";

export const DocxTextStyle = TextStyle.extend({
    addAttributes() {
        return {
            ...this.parent?.(),

            fontFamily: {
                default: null,

                parseHTML: element =>
                    element.style.fontFamily || null,

                renderHTML: attributes => {
                    if (!attributes.fontFamily) {
                        return {};
                    }

                    return {
                        style: `font-family: ${attributes.fontFamily}`,
                    };
                },
            },

            fontSize: {
                default: null,

                parseHTML: element =>
                    element.style.fontSize || null,

                renderHTML: attributes => {
                    if (!attributes.fontSize) {
                        return {};
                    }

                    return {
                        style: `font-size: ${attributes.fontSize}`,
                    };
                },
            },

            color: {
                default: null,

                parseHTML: element =>
                    element.style.color || null,

                renderHTML: attributes => {
                    if (!attributes.color) {
                        return {};
                    }

                    return {
                        style: `color: ${attributes.color}`,
                    };
                },
            },

            backgroundColor: {
                default: null,

                parseHTML: element =>
                    element.style.backgroundColor || null,

                renderHTML: attributes => {
                    if (!attributes.backgroundColor) {
                        return {};
                    }

                    return {
                        style: `background-color: ${attributes.backgroundColor}`,
                    };
                },
            },
        };
    },
});