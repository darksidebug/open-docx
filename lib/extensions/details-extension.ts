import { Command, Node, mergeAttributes } from '@tiptap/core'
import { TextSelection } from '@tiptap/pm/state'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    details: {
      setDetails: () => ReturnType
      unsetDetails: () => ReturnType
      toggleDetails: () => ReturnType
    }
  }
}

// 1. Details Parent Node
export const Details = Node.create({
  name: 'details',
  group: 'block',
  content: 'detailsSummary detailsContent',
  isolating: true,
  defining: true,

  addAttributes() {
    return {
      open: {
        default: false,

        parseHTML: element => element.hasAttribute('open'),

        renderHTML: attributes => {
          return attributes.open ? { open: '' } : {}
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'details',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['details', mergeAttributes(HTMLAttributes), 0]
  },

  addCommands() {
    return {
      setDetails:
        () =>
        ({ state, dispatch }) => {
          const { schema, selection } = state

          const detailsType = schema.nodes.details
          const summaryType = schema.nodes.detailsSummary
          const contentType = schema.nodes.detailsContent
          const paragraphType = schema.nodes.paragraph

          if (!detailsType || !summaryType || !contentType || !paragraphType) {
            return false
          }

          const summaryNode = summaryType.create(
            null,
            schema.text('Summary'),
          )

          // Empty paragraph — don't insert placeholder text as real content.
          const paragraphNode = paragraphType.create()

          const contentNode = contentType.create(null, [
            paragraphNode,
          ])

          const detailsNode = detailsType.create(
            { open: false },
            [summaryNode, contentNode],
          )

          if (dispatch) {
            const tr = state.tr.replaceSelectionWith(detailsNode)

            dispatch(tr.scrollIntoView())
          }

          return true
        },

      unsetDetails:
        () =>
        ({ commands }) => {
          return commands.lift(this.name)
        },

      toggleDetails:
        () =>
        ({ state, dispatch }) => {
          const { $from } = state.selection

          for (let depth = $from.depth; depth > 0; depth--) {
            const node = $from.node(depth)

            if (node.type.name === this.name) {
              const pos = $from.before(depth)

              if (dispatch) {
                dispatch(
                  state.tr.setNodeAttribute(
                    pos,
                    'open',
                    !node.attrs.open,
                  ),
                )
              }

              return true
            }
          }

          return false
        },
    }
  },
})

// 2. Summary Node
export const DetailsSummary = Node.create({
  name: 'detailsSummary',
  content: 'inline*',
  defining: true,
  draggable: false,

  parseHTML() {
    return [
      {
        tag: 'summary',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['summary', mergeAttributes(HTMLAttributes), 0]
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      const dom = document.createElement('summary')

      dom.className = 'details-summary'

      // Render the actual inline content.
      const contentDOM = document.createElement('span')
      contentDOM.className = 'details-summary-text';
      contentDOM.style.fontSize = editor.getAttributes('textStyle').fontSize || '14px';

      dom.appendChild(contentDOM)

      dom.addEventListener('click', event => {
        event.preventDefault()

        const pos = getPos()

        if (typeof pos !== 'number') {
          return
        }

        const $pos = editor.state.doc.resolve(pos)

        // Summary's parent should be the details node.
        const detailsPos = $pos.before($pos.depth)
        const detailsNode = $pos.node($pos.depth)

        if (detailsNode.type.name !== 'details') {
          return
        }

        editor
          .chain()
          .focus()
          .command(({ tr }) => {
            tr.setNodeAttribute(
              detailsPos,
              'open',
              !detailsNode.attrs.open,
            )

            return true
          })
          .run()
      })

      return {
        dom,
        contentDOM,
      }
    }
  },
})

// 3. Details Content
export const DetailsContent = Node.create({
  name: 'detailsContent',
  content: 'block+',
  defining: true,

  parseHTML() {
    return [
      {
        tag: 'div.details-content',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        class: 'details-content',
      }),
      0,
    ]
  },
})
