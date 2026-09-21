/**
 * Harper Grammar Checker — Tiptap Extension
 * ------------------------------------------------------------
 * Integrates harper.js (https://writewithharper.com) with Tiptap/ProseMirror
 * for on-device, privacy-first grammar & spell checking.
 *
 * Install:
 *   npm install harper.js
 *
 * Basic usage:
 *   import { HarperGrammar } from './harper-tiptap-extension'
 *
 *   const editor = new Editor({
 *     extensions: [StarterKit, HarperGrammar],
 *   })
 *
 * Suggestion popup: clicking a flagged word opens a floating popup with
 * Harper's message, clickable suggestions, an "Ignore" button, and (for
 * spelling issues) "Add to dictionary" — all wired to Harper's real APIs
 * and persisted across sessions via localStorage.
 *
 * Problems panel (like Harper's own demo sidebar):
 *   import { HarperGrammar, createHarperProblemsPanel } from './harper-tiptap-extension'
 *   const panel = createHarperProblemsPanel(editor)
 *   document.getElementById('my-sidebar').appendChild(panel.element)
 *   // later: panel.destroy()
 *
 * Advanced/raw API access (settings UI, dialect, custom rule packs, etc.):
 *   const linter = await editor.storage.harperGrammar.getLinter()
 *   const config = await linter?.getStructuredLintConfig()
 *   await linter?.setDialect('British')
 *   await linter?.loadWeirpackFromBlob(myWeirpackBlob)
 */

import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import type { Editor } from '@tiptap/core'
import type { Node as PMNode } from '@tiptap/pm/model'
import { WorkerLinter } from 'harper.js'
import { binaryInlined } from 'harper.js/binaryInlined'

// ---------------------------------------------------------------
// 1. Shared Linter instance, reference-counted across editors.
//
//    IMPORTANT #1: WorkerLinter uses the browser Worker API, which does
//    not exist server-side. Created lazily, guarded by typeof window,
//    never at module load time — see ensureLinterReady().
//
//    IMPORTANT #2: this linter is a MODULE-LEVEL SINGLETON shared by every
//    editor instance that uses this extension on the page (so we don't
//    spin up a WASM worker per editor). That means we can't call
//    linter.dispose() the moment any single editor unmounts — a second
//    editor might still be using it. activeEditorCount tracks how many
//    editors currently reference the linter; dispose() only actually
//    runs when the count drops to zero.
// ---------------------------------------------------------------
let linter: WorkerLinter | null = null
let linterReady: Promise<void> | null = null
let activeEditorCount = 0
let persistedStateLoaded = false

const IGNORED_LINTS_STORAGE_KEY = 'harper-ignored-lints'
const CUSTOM_WORDS_STORAGE_KEY = 'harper-custom-words'

function readLocalStorage(key: string): string | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null
  } catch {
    // Private-browsing modes / disabled storage can throw on access.
    return null
  }
}

function writeLocalStorage(key: string, value: string) {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value)
  } catch {
    // Ignore — persistence is a nice-to-have, not required for linting to work.
  }
}

async function ensureLinterReady() {
  if (typeof window === 'undefined') {
    // Running server-side (SSR) — there is nothing to lint yet; the
    // client-side hydration pass will call this again where `window`
    // exists and the real linter gets created then.
    return
  }

  if (!linter) {
    linter = new WorkerLinter({ binary: binaryInlined })
  }
  if (!linterReady) {
    linterReady = linter.setup()
  }
  await linterReady

  // Restore previously ignored lints / custom dictionary words, once per
  // page load (not per editor instance — they share the same linter).
  if (!persistedStateLoaded) {
    persistedStateLoaded = true

    const ignoredJSON = readLocalStorage(IGNORED_LINTS_STORAGE_KEY)
    if (ignoredJSON) {
      try {
        await linter.importIgnoredLints(ignoredJSON)
      } catch {
        // Corrupt/incompatible saved data — safe to ignore and continue.
      }
    }

    const wordsJSON = readLocalStorage(CUSTOM_WORDS_STORAGE_KEY)
    if (wordsJSON) {
      try {
        const words: string[] = JSON.parse(wordsJSON)
        if (Array.isArray(words) && words.length) await linter.importWords(words)
      } catch {
        // Same — ignore corrupt data rather than throwing.
      }
    }
  }
}

async function persistIgnoredLints() {
  if (!linter) return
  try {
    const json = await linter.exportIgnoredLints()
    writeLocalStorage(IGNORED_LINTS_STORAGE_KEY, json)
  } catch {
    // Best-effort persistence only.
  }
}

async function persistCustomWords(newWord: string) {
  if (!linter) return
  try {
    await linter.importWords([newWord])
    const existingJSON = readLocalStorage(CUSTOM_WORDS_STORAGE_KEY)
    const existing: string[] = existingJSON ? JSON.parse(existingJSON) : []
    if (!existing.includes(newWord)) existing.push(newWord)
    writeLocalStorage(CUSTOM_WORDS_STORAGE_KEY, JSON.stringify(existing))
  } catch {
    // Best-effort persistence only.
  }
}

// ---------------------------------------------------------------
// 2. Flatten the ProseMirror doc to plain text, while recording a
//    parallel array mapping each plain-text character index -> the
//    ProseMirror position of that character. This is what lets us
//    translate Harper's span offsets back into doc positions.
// ---------------------------------------------------------------
interface TextMap {
  text: string
  // charIndexToPos[i] = ProseMirror position of the i-th character in `text`
  charIndexToPos: number[]
}

function buildTextMap(doc: PMNode): TextMap {
  let text = ''
  const charIndexToPos: number[] = []

  doc.descendants((node, pos) => {
    if (node.isText && node.text) {
      for (let i = 0; i < node.text.length; i++) {
        charIndexToPos.push(pos + i)
      }
      text += node.text
    } else if (node.isBlock && text.length > 0 && !text.endsWith('\n')) {
      // Insert a newline between blocks so Harper doesn't run
      // "end of paragraph" into "start of next paragraph" as one sentence.
      text += '\n'
      charIndexToPos.push(pos)
    }
    return true
  })

  return { text, charIndexToPos }
}

// ---------------------------------------------------------------
// 3. Category → visual mapping.
//
//    Two separate mappings, matching the two-tier visual language seen
//    in Harper's own demo: simplified colors for in-text underlines
//    (3 tiers), richer distinct-per-category colors for the Problems
//    list (~20 categories). Both are Claude's own reasonable groupings/
//    palette, not extracted from Harper's actual site CSS (not
//    inspectable from here) — adjust freely to match your brand.
// ---------------------------------------------------------------
type LintTier = 'spelling' | 'grammar' | 'suggestion'

const LINT_KIND_TIER: Record<string, LintTier> = {
  Spelling: 'spelling',
  Typo: 'spelling',

  Agreement: 'grammar',
  BoundaryError: 'grammar',
  Capitalization: 'grammar',
  Nonstandard: 'grammar',
  Malapropism: 'grammar',
  Eggcorn: 'grammar',
  Grammar: 'grammar',

  Style: 'suggestion',
  Enhancement: 'suggestion',
  Readability: 'suggestion',
  Redundancy: 'suggestion',
  Repetition: 'suggestion',
  Punctuation: 'suggestion',
  Formatting: 'suggestion',
  WordChoice: 'suggestion',
  Usage: 'suggestion',
  Regionalism: 'suggestion',
  Miscellaneous: 'suggestion',
}

function tierForLintKind(kind: string): LintTier {
  return LINT_KIND_TIER[kind] ?? 'grammar'
}

// Distinct swatch per category, for the Problems panel's dots/chips and
// the popup's category label — applied as inline style (this is the part
// that was already working; kept exactly as-is).
const LINT_KIND_COLOR: Record<string, string> = {
  Spelling: '#e5484d',
  Typo: '#f5222d',
  Agreement: '#52c41a',
  BoundaryError: '#13a8a8',
  Capitalization: '#722ed1',
  Nonstandard: '#eb2f96',
  Malapropism: '#fa8c16',
  Eggcorn: '#a0d911',
  Grammar: '#1890ff',
  Style: '#e9e907',
  Enhancement: '#36cfc9',
  Readability: '#597ef7',
  Redundancy: '#9254de',
  Repetition: '#ad6800',
  Punctuation: '#fa541c',
  Formatting: '#07cbe9',
  WordChoice: '#1890ff',
  Usage: '#69c0ff',
  Regionalism: '#b37feb',
  Miscellaneous: '#5cdbd3',
}

function colorForLintKind(kind: string): string {
  return LINT_KIND_COLOR[kind] ?? '#8c8c8c'
}

// Converts a Harper category name into a CSS class, e.g. "WordChoice" ->
// "harper-kind-word-choice", "BoundaryError" -> "harper-kind-boundary-error".
// Used as the fallback for any category that doesn't have its own
// dedicated option below. Applied ALONGSIDE the inline color above, not
// instead of it — so styling still works out of the box, and this class
// gives you a CSS hook to add borders/icons/etc. on top.
function classNameForLintKind(kind: string): string {
  const slug = kind
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .toLowerCase()
  return `harper-kind-${slug}`
}

// Checks the four explicitly-configurable category class names (set via
// addOptions/.configure()) first; anything else falls back to the
// auto-generated slug above. This is what actually gets applied to
// elements — see usage in the popup and Problems panel below.
function resolveKindClassName(
  kind: string,
  options: { miscellaneousClassName: string; typoClassName: string; wordChoiceClassName: string; styleClassName: string },
): string {
  switch (kind) {
    case 'Miscellaneous':
      return options.miscellaneousClassName
    case 'Typo':
      return options.typoClassName
    case 'WordChoice':
      return options.wordChoiceClassName
    case 'Style':
      return options.styleClassName
    default:
      return classNameForLintKind(kind)
  }
}

// ---------------------------------------------------------------
// 4. Plugin state.
//    Each lint record keeps a reference to the ORIGINAL harper.js Lint
//    object (not just its extracted fields) — ignoreLint() and the
//    dictionary flow need the real object, not a plain-data copy.
//    sourceText is the exact plain text that was linted, also required
//    by ignoreLint()'s "source" argument.
// ---------------------------------------------------------------
interface HarperLintRecord {
  message: string
  from: number
  to: number
  suggestions: string[]
  kind: string
  tier: LintTier
  rawLint: any
}

interface HarperPluginState {
  decorations: DecorationSet
  lints: HarperLintRecord[]
  sourceText: string
}

const harperPluginKey = new PluginKey<HarperPluginState>('harperGrammar')

// ---------------------------------------------------------------
// 5. Suggestion popup — plain DOM, framework-agnostic, shared by both
//    clicking a flagged word AND clicking an item in the Problems panel.
//    openSuggestionPopup() takes viewport coordinates directly (from
//    getBoundingClientRect() or ProseMirror's coordsAtPos()) rather than
//    an anchor element, so both call sites can use it uniformly.
// ---------------------------------------------------------------
interface PopupRect {
  left: number
  top: number
  bottom: number
}

let popupEl: HTMLDivElement | null = null
let popupOutsideClickHandler: ((e: MouseEvent) => void) | null = null
let popupEscapeHandler: ((e: KeyboardEvent) => void) | null = null

function closeSuggestionPopup() {
  popupEl?.remove()
  popupEl = null
  if (popupOutsideClickHandler) {
    document.removeEventListener('mousedown', popupOutsideClickHandler)
    popupOutsideClickHandler = null
  }
  if (popupEscapeHandler) {
    document.removeEventListener('keydown', popupEscapeHandler)
    popupEscapeHandler = null
  }
}

function openSuggestionPopup(
  rect: PopupRect,
  lint: HarperLintRecord,
  sourceText: string,
  categoryClassName: string,
  onApply: (suggestionIndex: number) => void,
  onChanged: () => void,
) {
  closeSuggestionPopup()

  popupEl = document.createElement('div')
  popupEl.className = 'harper-suggestion-popup'
  popupEl.setAttribute('role', 'dialog')

  const categoryEl = document.createElement('div')
  categoryEl.className = `harper-suggestion-category ${categoryClassName}`
  categoryEl.style.color = colorForLintKind(lint.kind)
  categoryEl.textContent = lint.kind
  popupEl.appendChild(categoryEl)

  const messageEl = document.createElement('div')
  messageEl.className = 'harper-suggestion-message'
  messageEl.textContent = lint.message
  popupEl.appendChild(messageEl)

  if (lint.suggestions.length > 0) {
    const list = document.createElement('div')
    list.className = 'harper-suggestion-list'

    lint.suggestions.forEach((suggestionText, suggestionIndex) => {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'harper-suggestion-button'
      button.textContent = suggestionText
      button.addEventListener('click', e => {
        e.stopPropagation()
        onApply(suggestionIndex)
        closeSuggestionPopup()
      })
      list.appendChild(button)
    })

    popupEl.appendChild(list)
  }

  const actionsEl = document.createElement('div')
  actionsEl.className = 'harper-suggestion-actions'

  const ignoreButton = document.createElement('button')
  ignoreButton.type = 'button'
  ignoreButton.className = 'harper-suggestion-action-button'
  ignoreButton.textContent = 'Ignore'
  ignoreButton.addEventListener('click', async e => {
    e.stopPropagation()
    if (linter) {
      try {
        await linter.ignoreLint(sourceText, lint.rawLint)
        await persistIgnoredLints()
      } catch {
        // If ignoreLint fails (e.g. stale lint object after a doc edit),
        // there's nothing more useful to do than just close the popup.
      }
    }
    closeSuggestionPopup()
    onChanged() // triggers a re-lint so the ignored issue disappears now
  })
  actionsEl.appendChild(ignoreButton)

  if (lint.tier === 'spelling') {
    const dictButton = document.createElement('button')
    dictButton.type = 'button'
    dictButton.className = 'harper-suggestion-action-button'
    dictButton.textContent = 'Add to dictionary'
    dictButton.addEventListener('click', async e => {
      e.stopPropagation()
      const word = lint.rawLint?.get_problem_text?.() ?? sourceText.slice(0, 0)
      if (word) await persistCustomWords(word)
      closeSuggestionPopup()
      onChanged()
    })
    actionsEl.appendChild(dictButton)
  }

  popupEl.appendChild(actionsEl)
  document.body.appendChild(popupEl)

  // Position under the anchor, clamped so it never renders off-screen.
  // Flips above the anchor if there isn't room below.
  const popupWidth = popupEl.offsetWidth
  const popupHeight = popupEl.offsetHeight
  const left = Math.min(rect.left + window.scrollX, window.scrollX + window.innerWidth - popupWidth - 8)
  const spaceBelow = window.innerHeight - rect.bottom
  const top =
    spaceBelow > popupHeight + 12
      ? rect.bottom + window.scrollY + 4
      : rect.top + window.scrollY - popupHeight - 4

  popupEl.style.position = 'absolute'
  popupEl.style.left = `${Math.max(left, 8)}px`
  popupEl.style.top = `${Math.max(top, window.scrollY + 8)}px`
  popupEl.style.zIndex = '9999'

  popupOutsideClickHandler = e => {
    if (popupEl && !popupEl.contains(e.target as Node)) closeSuggestionPopup()
  }
  popupEscapeHandler = e => {
    if (e.key === 'Escape') closeSuggestionPopup()
  }
  setTimeout(() => {
    if (popupOutsideClickHandler) document.addEventListener('mousedown', popupOutsideClickHandler)
    if (popupEscapeHandler) document.addEventListener('keydown', popupEscapeHandler)
  }, 0)
}

// ---------------------------------------------------------------
// 6. The extension
// ---------------------------------------------------------------
export interface HarperGrammarOptions {
  /** Debounce delay (ms) after typing stops before linting runs. */
  debounce: number
  /** CSS class for word-level errors (Spelling, Typo). Style: red wavy underline. */
  spellingClassName: string
  /** CSS class for construction-level errors (Agreement, Capitalization, etc.).
   * Style: amber/orange wavy underline. */
  grammarClassName: string
  /** CSS class for optional improvements (Style, Redundancy, WordChoice, etc.).
   * Style: soft background highlight, no underline. */
  suggestionClassName: string
  /** CSS class added to Miscellaneous-category dots/labels (Problems panel + popup),
   * alongside the existing inline color. Default: 'harper-kind-miscellaneous'. */
  miscellaneousClassName: string
  /** CSS class added to Typo-category dots/labels, alongside the existing
   * inline color. Default: 'harper-kind-typo'. */
  typoClassName: string
  /** CSS class added to WordChoice-category dots/labels, alongside the
   * existing inline color. Default: 'harper-kind-word-choice'. */
  wordChoiceClassName: string
  /** CSS class added to Style-category dots/labels, alongside the
   * existing inline color. Default: 'harper-kind-style'. */
  styleClassName: string
}

export interface HarperGrammarStorage {
  /** Resolves once the shared linter is ready. Use this to access any raw
   * harper.js Linter method not already wrapped by this extension —
   * getStructuredLintConfig(), setLintConfig(), setDialect(),
   * loadWeirpackFromBlob(), toTitleCase(), etc. Returns null during SSR. */
  getLinter: () => Promise<WorkerLinter | null>
  /** Resolves the CSS class for a given Harper category, checking the
   * four configurable options (miscellaneousClassName, typoClassName,
   * wordChoiceClassName, styleClassName) first, falling back to an
   * auto-generated class for every other category. */
  classNameForKind: (kind: string) => string
}

export const HarperGrammar = Extension.create<HarperGrammarOptions, HarperGrammarStorage>({
  name: 'harperGrammar',

  addOptions() {
    return {
      debounce: 500,
      spellingClassName: 'harper-lint-spelling',
      grammarClassName: 'harper-lint-grammar',
      suggestionClassName: 'harper-lint-suggestion',
      miscellaneousClassName: 'harper-kind-miscellaneous',
      typoClassName: 'harper-kind-typo',
      wordChoiceClassName: 'harper-kind-word-choice',
      styleClassName: 'harper-kind-style',
    }
  },

  addStorage() {
    return {
      getLinter: async () => {
        await ensureLinterReady()
        return linter
      },
      classNameForKind: (kind: string) => resolveKindClassName(kind, this.options),
    }
  },

  addCommands() {
    return {
      applyHarperSuggestion:
        (lintIndex: number, suggestionIndex = 0) =>
        ({ state, dispatch }) => {
          const pluginState = harperPluginKey.getState(state)
          const lint = pluginState?.lints[lintIndex]
          if (!lint) return false

          const suggestionText = lint.suggestions[suggestionIndex]
          if (suggestionText == null) return false

          if (dispatch) {
            const tr = state.tr.insertText(suggestionText, lint.from, lint.to)
            dispatch(tr)
          }
          return true
        },

      clearHarperIgnoredLints:
        () =>
        () => {
          if (linter) {
            linter
              .clearIgnoredLints()
              .then(() => persistIgnoredLints())
              .catch(() => {})
          }
          writeLocalStorage(IGNORED_LINTS_STORAGE_KEY, '')
          return true
        },

      setHarperDialect:
        (dialect: string) =>
        () => {
          if (linter) {
            linter.setDialect(dialect as any).catch(() => {})
          }
          return true
        },
    }
  },

  addProseMirrorPlugins() {
    const options = this.options
    const { debounce, spellingClassName, grammarClassName, suggestionClassName } = options
    const editor = this.editor
    let timeout: ReturnType<typeof setTimeout> | null = null

    return [
      new Plugin<HarperPluginState>({
        key: harperPluginKey,

        state: {
          init: () => ({ decorations: DecorationSet.empty, lints: [], sourceText: '' }),
          apply: (tr, prev) => {
            const mapped = prev.decorations.map(tr.mapping, tr.doc)
            const meta = tr.getMeta(harperPluginKey)
            if (meta) return meta
            return { decorations: mapped, lints: prev.lints, sourceText: prev.sourceText }
          },
        },

        props: {
          decorations(state) {
            return harperPluginKey.getState(state)?.decorations
          },

          handleClick(view, pos, event) {
            const pluginState = harperPluginKey.getState(view.state)
            if (!pluginState) return false

            const lintIndex = pluginState.lints.findIndex(l => pos >= l.from && pos < l.to)
            if (lintIndex === -1) {
              closeSuggestionPopup()
              return false
            }

            const lint = pluginState.lints[lintIndex]
            const rect = (event.target as HTMLElement).getBoundingClientRect()
            openSuggestionPopup(
              rect,
              lint,
              pluginState.sourceText,
              editor.storage.harperGrammar.classNameForKind(lint.kind),
              suggestionIndex => editor.commands.applyHarperSuggestion(lintIndex, suggestionIndex),
              () => (view as any).__harperScheduleLint?.(0),
            )
            return false
          },
        },

        view(editorView) {
          activeEditorCount += 1

          const runLint = async () => {
            await ensureLinterReady()
            if (!linter) return

            const { text, charIndexToPos } = buildTextMap(editorView.state.doc)
            if (!text.trim()) {
              editorView.dispatch(
                editorView.state.tr.setMeta(harperPluginKey, {
                  decorations: DecorationSet.empty,
                  lints: [],
                  sourceText: text,
                }),
              )
              return
            }

            const rawLints = await linter.lint(text)

            const decorations: Decoration[] = []
            const lintRecords: HarperLintRecord[] = []

            for (const rawLint of rawLints) {
              const span = rawLint.span()
              const from = charIndexToPos[span.start]
              const to =
                span.end < charIndexToPos.length
                  ? charIndexToPos[span.end]
                  : editorView.state.doc.content.size

              if (from == null || to == null || from >= to) continue

              const suggestions = (rawLint.suggestions?.() ?? []).map((s: any) =>
                typeof s === 'string' ? s : s.get_replacement_text?.() ?? '',
              )

              const kind = rawLint.lint_kind?.() ?? 'Grammar'
              const tier = tierForLintKind(kind)
              const tierClassName =
                tier === 'spelling'
                  ? spellingClassName
                  : tier === 'suggestion'
                    ? suggestionClassName
                    : grammarClassName
              // The per-category class (harper-kind-*, or one of the four
              // configurable ones) goes on the underline span too, not just
              // the Problems panel / popup — so you can target a specific
              // category's underline in CSS, on top of its tier styling.
              const kindClassName = resolveKindClassName(kind, options)

              decorations.push(
                Decoration.inline(from, to, {
                  class: `${tierClassName} ${kindClassName}`,
                }),
              )
              lintRecords.push({
                message: rawLint.message(),
                from,
                to,
                suggestions,
                kind,
                tier,
                rawLint,
              })
            }

            editorView.dispatch(
              editorView.state.tr.setMeta(harperPluginKey, {
                decorations: DecorationSet.create(editorView.state.doc, decorations),
                lints: lintRecords,
                sourceText: text,
              }),
            )
          }

          function scheduleLint(delay: number) {
            if (timeout) clearTimeout(timeout)
            timeout = setTimeout(runLint, delay)
          }

          // Expose so the Problems panel and popup's Ignore/Add-to-dictionary
          // actions can force a fresh lint pass after they change linter state.
          ;(editorView as any).__harperScheduleLint = scheduleLint

          runLint()

          return {
            update(view, prevState) {
              if (!view.state.doc.eq(prevState.doc)) scheduleLint(debounce)
            },
            destroy() {
              if (timeout) clearTimeout(timeout)
              closeSuggestionPopup()

              activeEditorCount -= 1
              if (activeEditorCount <= 0 && linter) {
                // Last editor using the shared linter — safe to release its
                // WASM resources now. A future editor mount will lazily
                // recreate it via ensureLinterReady().
                linter.dispose().catch(() => {})
                linter = null
                linterReady = null
                persistedStateLoaded = false
              }
            },
          }
        },
      }),
    ]
  },
})

// ---------------------------------------------------------------
// 7. Problems panel — a standalone sidebar summarizing every current
//    lint, grouped with category counts up top (like Harper's own demo),
//    then a per-issue list. Not auto-mounted anywhere; call this and
//    append the returned element wherever your layout wants a sidebar.
// ---------------------------------------------------------------
export interface HarperProblemsPanel {
  element: HTMLDivElement
  destroy: () => void
}

export function createHarperProblemsPanel(editor: Editor): HarperProblemsPanel {
  const root = document.createElement('div')
  root.className = 'harper-problems-panel'

  function scrollToAndOpen(lint: HarperLintRecord, lintIndex: number, sourceText: string) {
    editor.commands.setTextSelection({ from: lint.from, to: lint.to })
    editor.commands.scrollIntoView()

    // coordsAtPos gives on-screen coordinates directly — no DOM lookup
    // needed, unlike the click-handler path which reads getBoundingClientRect
    // off the clicked element.
    const coords = editor.view.coordsAtPos(lint.from)
    openSuggestionPopup(
      { left: coords.left, top: coords.top, bottom: coords.bottom },
      lint,
      sourceText,
      editor.storage.harperGrammar.classNameForKind(lint.kind),
      suggestionIndex => editor.commands.applyHarperSuggestion(lintIndex, suggestionIndex),
      () => (editor.view as any).__harperScheduleLint?.(0),
    )
  }

  function render() {
    const pluginState = harperPluginKey.getState(editor.state)
    const lints = pluginState?.lints ?? []
    const sourceText = pluginState?.sourceText ?? ''

    root.innerHTML = ''

    const header = document.createElement('div')
    header.className = 'harper-problems-header'

    const titleEl = document.createElement('div')
    titleEl.className = 'harper-problems-title'
    titleEl.textContent = 'Problems'

    const countBadge = document.createElement('span')
    countBadge.className = 'harper-problems-count'
    countBadge.textContent = String(lints.length)
    titleEl.appendChild(countBadge)
    header.appendChild(titleEl)

    const counts = new Map<string, number>()
    for (const lint of lints) counts.set(lint.kind, (counts.get(lint.kind) ?? 0) + 1)

    const summaryEl = document.createElement('div')
    summaryEl.className = 'harper-problems-summary'
    for (const [kind, count] of counts) {
      const chip = document.createElement('span')
      chip.className = 'harper-problems-chip'
      const dot = document.createElement('span')
      dot.className = `harper-problems-dot ${editor.storage.harperGrammar.classNameForKind(kind)}`
      dot.style.backgroundColor = colorForLintKind(kind)
      chip.appendChild(dot)
      chip.append(`${kind} ${count}`)
      summaryEl.appendChild(chip)
    }
    header.appendChild(summaryEl)
    root.appendChild(header)

    const listEl = document.createElement('div')
    listEl.className = 'harper-problems-list'

    lints.forEach((lint, lintIndex) => {
      const row = document.createElement('button')
      row.type = 'button'
      row.className = 'harper-problems-row'

      const dot = document.createElement('span')
      dot.className = `harper-problems-dot ${editor.storage.harperGrammar.classNameForKind(lint.kind)}`
      dot.style.backgroundColor = colorForLintKind(lint.kind)
      row.appendChild(dot)

      const label = document.createElement('span')
      label.className = 'harper-problems-row-label'
      label.textContent = lint.kind
      row.appendChild(label)

      row.addEventListener('click', () => scrollToAndOpen(lint, lintIndex, sourceText))
      listEl.appendChild(row)
    })

    root.appendChild(listEl)
  }

  render()
  editor.on('transaction', render)

  return {
    element: root,
    destroy: () => editor.off('transaction', render),
  }
}

// ---------------------------------------------------------------
// TypeScript module augmentation so editor.commands.* is typed correctly.
// ---------------------------------------------------------------
declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    harperGrammar: {
      applyHarperSuggestion: (lintIndex: number, suggestionIndex?: number) => ReturnType
      clearHarperIgnoredLints: () => ReturnType
      setHarperDialect: (dialect: string) => ReturnType
    }
  }
}
