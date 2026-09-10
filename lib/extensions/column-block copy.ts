import { Node, mergeAttributes, findParentNode } from '@tiptap/core'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import type { Editor } from '@tiptap/core'

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
  content: 'column+', // exactly two columns
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
          console.log('insertPos', insertPos)
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
            .focus(insertPos + 1)
            .run()
        },

      insertColumnBefore:
        () =>
        ({ state, tr, dispatch }) => {
          const columnParent = findParentNode((n) => n.type.name === 'column')(state.selection)
          const blockParent = findParentNode((n) => n.type.name === 'columnBlock')(state.selection)
          if (!columnParent || !blockParent) return false

          // Prevent adding if there are already 3 columns
          if (blockParent.node.childCount >= 3) return false

          if (dispatch) {
            const insertPos = columnParent.pos

            const newColumn = state.schema.nodes.column.create(
              { index: 0 },
              state.schema.nodes.paragraph.create()
            )

            tr.insert(insertPos, newColumn)

            // Work against the document AFTER the insertion.
            const doc = tr.doc

            // The original columnBlock position remains valid because
            // the insertion happens inside the columnBlock.
            const updatedBlockParent = {
              pos: blockParent.pos,
              node: doc.nodeAt(blockParent.pos),
            }

            if (!updatedBlockParent.node) {
              return false
            }

            let idx = 0

            doc.nodesBetween(
              updatedBlockParent.pos,
              updatedBlockParent.pos + updatedBlockParent.node.nodeSize,
              (node, pos) => {
                if (node.type.name === 'column') {
                  tr.setNodeAttribute(pos, 'index', idx)
                  idx++
                  return false
                }

                return true
              }
            )

            dispatch(tr)
          }
          return true
        },

      insertColumnAfter:
        () =>
        ({ state, dispatch }) => {
          const { $from } = state.selection

          let blockParent: {
            pos: number
            node: any
          } | null = null

          for (let depth = $from.depth; depth > 0; depth--) {
            const node = $from.node(depth)

            if (node.type.name === 'columnBlock') {
              blockParent = {
                pos: $from.before(depth),
                node,
              }
              break
            }
          }

          if (!blockParent) {
            return false
          }

          const columnDepth = $from.depth - 1

          let currentColumnPos: number | null = null

          for (let depth = $from.depth; depth > 0; depth--) {
            if ($from.node(depth).type.name === 'column') {
              currentColumnPos = $from.before(depth)
              break
            }
          }

          if (currentColumnPos === null) {
            return false
          }

          const currentColumn = state.doc.nodeAt(currentColumnPos)

          if (!currentColumn) {
            return false
          }

          const newColumn = state.schema.nodes.column.create(
            {
              index: currentColumn.attrs.index + 1,
            },
            state.schema.nodes.paragraph.create()
          )

          const insertPos =
            currentColumnPos + currentColumn.nodeSize

          const tr = state.tr.insert(insertPos, newColumn)

          // Re-read from the NEW transaction document.
          const block = tr.doc.nodeAt(blockParent.pos)

          if (!block || block.type.name !== 'columnBlock') {
            return false
          }

          // Renumber direct column children.
          let columnPos = blockParent.pos + 1

          for (let i = 0; i < block.childCount; i++) {
            const column = block.child(i)

            if (column.type.name === 'column') {
              tr.setNodeAttribute(columnPos, 'index', i)
            }

            columnPos += column.nodeSize
          }

          dispatch?.(tr)

          return true
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
      exitColumns: () => ReturnType,
      insertColumnBefore: () => ReturnType
      insertColumnAfter: () => ReturnType
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
    const $pos = editor.state.doc.resolve(pos)

    for (
      let depth = $pos.depth;
      depth > 0;
      depth--
    ) {
      const ancestor = $pos.node(depth)

      if (ancestor.type.name !== 'column') {
        continue
      }

      const index = ancestor.attrs?.index

      if (
        typeof index === 'number' &&
        Number.isFinite(index)
      ) {
        return `Column ${index + 1}`
      }
    }
  } catch {
    // Placeholder can run during intermediate transactions.
  }

  return null
}