import { Node, mergeAttributes } from '@tiptap/core';

// Extend Tiptap commands interface so TypeScript recognizes `setPageBreak`
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    pageBreak: {
      setPageBreak: () => ReturnType;
    };
  }
}

export const PageBreak = Node.create({
  name: 'pageBreak',

  group: 'block',

  // Treat the page break as an atomic single unit element
  atom: true,

  parseHTML() {
    return [
      {
        tag: 'div.page-break',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { class: 'page-break' })];
  },

  addCommands() {
    return {
      setPageBreak:
        () =>
        ({ chain }) => {
          return chain()
            .insertContent({ type: this.name })
            .run();
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      // Matches Microsoft Word & Google Docs shortcut convention for page breaks
      'Mod-Enter': () => this.editor.commands.setPageBreak(),
    };
  },
});