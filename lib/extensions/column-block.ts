import { Node, mergeAttributes, findParentNode } from '@tiptap/core'

export const Column = Node.create({
  name: 'column',
  content: 'block+',
  isolating: true, // keeps backspace/selection from bleeding into the next column

  addAttributes() {
    return {
      // 0-based position within the columnBlock — lets the global
      // Placeholder extension show "Column 1" / "Column 2" without
      // having to walk sibling nodes to figure out which is which.
      index: {
        default: 0,
        parseHTML: (element) => {
          const value = element.getAttribute('data-index')
          return value ? parseInt(value, 10) : 0
        },
        renderHTML: (attributes) => ({
          'data-index': attributes.index,
        }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'div[data-type="column"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'column', class: 'column' }), 0]
  },
})

export const ColumnBlock = Node.create({
  name: 'columnBlock',
  group: 'block',
  content: 'column{2}', // exactly two columns
  isolating: true,

  parseHTML() {
    return [{ tag: 'div[data-type="column-block"]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'column-block', class: 'column-block' }), 0]
  },

  addCommands() {
    return {
      insertColumns:
        () =>
        ({ chain, state }) => {
          const insertPos = state.selection.from

          return chain()
            .insertContentAt(insertPos, {
              type: this.name,
              content: [
                { type: 'column', attrs: { index: 0 }, content: [{ type: 'paragraph' }] },
                { type: 'column', attrs: { index: 1 }, content: [{ type: 'paragraph' }] },
              ],
            })
            // insertPos + 1 → into columnBlock, +1 → into column 1, +1 → into
            // its paragraph. Lands the cursor inside column 1's empty
            // paragraph instead of after the whole inserted block.
            .focus(insertPos + 3)
            .run()
        },

      // optional convenience: escape the column block by placing cursor after it
      exitColumns:
        () =>
        ({ state, chain }) => {
          const parent = findParentNode((n) => n.type.name === 'columnBlock')(state.selection)
          if (!parent) return false
          const after = parent.pos + parent.node.nodeSize
          return chain().insertContentAt(after, { type: 'paragraph' }).focus(after + 1).run()
        },
    }
  },
})

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    columnBlock: {
      insertColumns: () => ReturnType
      exitColumns: () => ReturnType
    }
  }
}

/**
 * Placeholder text for an empty node, aware of column position.
 * Plug this into your existing global Placeholder extension's
 * `placeholder` callback — see usage note below.
 *
 * Guarded because Placeholder's decorations can be computed against a
 * doc that's momentarily ahead of `editor.state.doc` (e.g. right after
 * a chained insert+focus command) — resolving a position that's valid
 * in the new doc but not yet in editor.state would otherwise throw a
 * RangeError. Worst case here is skipping the placeholder text for one
 * render pass; it self-corrects on the next.
 */
export function columnPlaceholderText(
  node: import('@tiptap/pm/model').Node,
  pos: number,
  editor: import('@tiptap/core').Editor
): string | null {
  try {
    const doc = editor.state.doc
    if (pos < 0 || pos > doc.content.size) return null

    const $pos = doc.resolve(pos)
    if ($pos.parent.type.name === 'column') {
      const index = $pos.parent.attrs.index ?? 0
      return `Column ${index + 1}`
    }
  } catch {
    // doc/pos mismatch during an in-flight transaction — skip rather than crash
  }
  return null
}