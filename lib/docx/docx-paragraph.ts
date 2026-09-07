import Paragraph from "@tiptap/extension-paragraph";

export const DocxParagraph = Paragraph.extend({
    addAttributes() {
        return {
            ...this.parent?.(),

            textAlign: {
                default: null,

                parseHTML: element =>
                    element.style.textAlign || null,

                renderHTML: attributes => {
                    if (!attributes.textAlign) {
                        return {};
                    }

                    return {
                        style: `text-align: ${attributes.textAlign}`,
                    };
                },
            },

            marginLeft: {
                default: null,

                parseHTML: element =>
                    element.style.marginLeft || null,

                renderHTML: attributes => {
                    if (!attributes.marginLeft) {
                        return {};
                    }

                    return {
                        style: `margin-left: ${attributes.marginLeft}`,
                    };
                },
            },

            marginRight: {
                default: null,

                parseHTML: element =>
                    element.style.marginRight || null,

                renderHTML: attributes => {
                    if (!attributes.marginRight) {
                        return {};
                    }

                    return {
                        style: `margin-right: ${attributes.marginRight}`,
                    };
                },
            },

            textIndent: {
                default: null,

                parseHTML: element =>
                    element.style.textIndent || null,

                renderHTML: attributes => {
                    if (!attributes.textIndent) {
                        return {};
                    }

                    return {
                        style: `text-indent: ${attributes.textIndent}`,
                    };
                },
            },

            lineHeight: {
                default: null,

                parseHTML: element =>
                    element.style.lineHeight || null,

                renderHTML: attributes => {
                    if (!attributes.lineHeight) {
                        return {};
                    }

                    return {
                        style: `line-height: ${attributes.lineHeight}`,
                    };
                },
            },
        };
    },
});