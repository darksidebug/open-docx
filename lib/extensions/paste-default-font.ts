import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Fragment, Slice, Node as PMNode, Mark } from '@tiptap/pm/model'

export interface PasteDefaultFontOptions {
  fontFamily: string
  fontSize: string
}

/**
 * On paste, walks the incoming content and, for any inline/text node
 * that doesn't already carry a `fontFamily` / `fontSize` on its
 * textStyle mark, fills in the given defaults. Existing values (e.g.
 * text you deliberately set to a different font before copying, or a
 * font-family that genuinely came from an external HTML source) are
 * left untouched — this only backfills what's missing.
 *
 * Works at the Slice level (via `transformPasted`) rather than string-
 * replacing the pasted HTML, so it applies correctly regardless of
 * whether the paste came from inside this editor or somewhere else.
 */
export const PasteDefaultFont = Extension.create<PasteDefaultFontOptions>({
  name: 'pasteDefaultFont',

  addOptions() {
    return {
      fontFamily: 'Google Sans',
      fontSize: '14px',
    }
  },

  addProseMirrorPlugins() {
    const { fontFamily, fontSize } = this.options
    const editor = this.editor

    return [
      new Plugin({
        key: new PluginKey('pasteDefaultFont'),
        props: {
          transformPasted: (slice) => {
            const textStyleType = editor.schema.marks.textStyle
            if (!textStyleType) return slice // textStyle not registered — nothing to backfill onto

            const applyDefaults = (mark: Mark): Mark => {
              if (mark.type !== textStyleType) return mark
              const attrs = { ...mark.attrs }
              let changed = false
              if (!attrs.fontFamily) {
                attrs.fontFamily = fontFamily
                changed = true
              }
              if (!attrs.fontSize) {
                attrs.fontSize = fontSize
                changed = true
              }
              return changed ? mark.type.create(attrs) : mark
            }

            const ensureTextStyle = (marks: readonly Mark[]): Mark[] => {
              const hasTextStyle = marks.some((m) => m.type === textStyleType)
              if (!hasTextStyle) {
                // No textStyle mark at all — this text had no explicit
                // font info to begin with, so add one with the defaults.
                return [...marks, textStyleType.create({ fontFamily, fontSize })]
              }
              return marks.map(applyDefaults)
            }

            const mapFragment = (fragment: Fragment): Fragment => {
              const mapped: PMNode[] = []
              fragment.forEach((node) => {
                let newNode = node

                // Text nodes don't have a real child-content fragment to
                // recurse into; only recurse for actual container nodes.
                if (!newNode.isText && newNode.content.size > 0) {
                  newNode = newNode.copy(mapFragment(newNode.content))
                }

                if (newNode.isText || newNode.isInline) {
                  newNode = newNode.mark(ensureTextStyle(newNode.marks))
                }

                mapped.push(newNode)
              })
              return Fragment.fromArray(mapped)
            }

            return new Slice(mapFragment(slice.content), slice.openStart, slice.openEnd)
          },
        },
      }),
    ]
  },
})