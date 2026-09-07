import { Node, mergeAttributes } from '@tiptap/core';

export interface VerticalAlignOptions {
  HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    verticalAlign: {
      /**
       * Set or update the vertical alignment for the current block(s)
       */
      setVerticalAlign: (alignment: 'top' | 'middle' | 'bottom') => ReturnType;
      /**
       * Remove the vertical alignment wrapper (lift content out)
       */
      unsetVerticalAlign: () => ReturnType;
    };
  }
}

export const VerticalAlign = Node.create<VerticalAlignOptions>({
  name: 'verticalAlign',

  group: 'block',
  content: 'block+',
  defining: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      alignment: {
        default: 'top',
        parseHTML: element => element.getAttribute('data-vertical-align') || 'top',
        renderHTML: attributes => {
          return {
            'data-vertical-align': attributes.alignment,
            class: `vertical-align-box vertical-align-${attributes.alignment}`,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-vertical-align]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0];
  },

  addCommands() {
    return {
      setVerticalAlign:
        (alignment) =>
        ({ tr, state, dispatch, chain }) => {
          const { selection } = state;
          const { $from } = selection;
          
          // Check if parent or current depth already contains the verticalAlign node
          let foundNodePos = -1;
          let foundNode = null;

          for (let d = $from.depth; d > 0; d--) {
            const node = $from.node(d);
            if (node.type.name === this.name) {
              foundNodePos = $from.before(d);
              foundNode = node;
              break;
            }
          }

          // If it already exists, update its attributes directly instead of toggling
          if (foundNode && foundNodePos !== -1) {
            if (dispatch) {
              tr.setNodeMarkup(foundNodePos, undefined, {
                ...foundNode.attrs,
                alignment,
              });
              dispatch(tr);
            }
            return true;
          }

          // Otherwise, wrap the selection normally
          return chain()
            .wrapIn(this.name, { alignment })
            .run();
        },

      unsetVerticalAlign:
        () =>
        ({ chain }) => {
          return chain()
            .lift(this.name)
            .run();
        },
    };
  },
});