/**
 * Ollama Grammar Checker — Tiptap Extension
 * ------------------------------------------------------------
 * Calls a self-hosted gnokit/improve-grammar model (via Ollama, behind
 * the nginx reverse proxy set up earlier) to rewrite selected text with
 * corrected grammar/spelling.
 *
 * Unlike the Harper extension, this is NOT live/inline — LLM calls are
 * too slow (seconds) and don't return character-level spans, only a
 * rewritten block of text. So this works as an on-demand command:
 * select text (or run with nothing selected to check the whole doc),
 * call the command, and — by default — a comparison popup shows the
 * original vs. corrected text with a word-level diff, plus Accept/Reject
 * buttons. Nothing is applied to your document until you click Accept.
 *
 * Usage:
 *   import { OllamaGrammarCheck } from './ollama-grammar-tiptap-extension'
 *
 *   const editor = new Editor({
 *     extensions: [
 *       StarterKit,
 *       OllamaGrammarCheck.configure({
 *         apiUrl: 'http://localhost:8080/api/chat', // your nginx-proxied Ollama
 *         model: 'gnokit/improve-grammar',
 *       }),
 *     ],
 *   })
 *
 *   // Check the current selection (or whole doc if nothing selected):
 *   editor.commands.checkGrammar()
 *
 *   // Read loading/error state anywhere (e.g. to show a spinner):
 *   editor.storage.ollamaGrammarCheck.isChecking
 *   editor.storage.ollamaGrammarCheck.error
 */

import { Extension } from '@tiptap/core'

// ---------------------------------------------------------------
// Word-level diff, used to highlight what changed in the comparison
// popup. Classic LCS (longest common subsequence) over whitespace-
// preserving tokens — O(n*m), fine for a paragraph/selection, but
// worth knowing if you ever run this on a very large whole-document
// check, since it could get slow on thousands of words.
// ---------------------------------------------------------------
type DiffPart = { type: 'same' | 'removed' | 'added'; text: string }

function tokenize(text: string): string[] {
  return text.match(/\S+|\s+/g) ?? []
}

function diffWords(original: string, corrected: string): DiffPart[] {
  const a = tokenize(original)
  const b = tokenize(corrected)
  const n = a.length
  const m = b.length

  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }

  const result: DiffPart[] = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      result.push({ type: 'same', text: a[i] })
      i++
      j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      result.push({ type: 'removed', text: a[i] })
      i++
    } else {
      result.push({ type: 'added', text: b[j] })
      j++
    }
  }
  while (i < n) {
    result.push({ type: 'removed', text: a[i] })
    i++
  }
  while (j < m) {
    result.push({ type: 'added', text: b[j] })
    j++
  }
  return result
}

// ---------------------------------------------------------------
// Comparison popup — plain DOM, framework-agnostic, modal-style (unlike
// Harper's small anchored popup, this shows a potentially multi-line
// diff, so it's a centered dialog with a backdrop rather than something
// anchored to a specific word).
// ---------------------------------------------------------------
let modalOverlayEl: HTMLDivElement | null = null
let modalEscapeHandler: ((e: KeyboardEvent) => void) | null = null

function closeGrammarComparisonModal() {
  modalOverlayEl?.remove()
  modalOverlayEl = null
  if (modalEscapeHandler) {
    document.removeEventListener('keydown', modalEscapeHandler)
    modalEscapeHandler = null
  }
}

function showGrammarComparisonModal(
  original: string,
  corrected: string,
  onAccept: () => void,
  onReject: () => void,
) {
  closeGrammarComparisonModal()

  const overlay = document.createElement('div')
  overlay.className = 'grammar-compare-overlay'

  const card = document.createElement('div')
  card.className = 'grammar-compare-card'
  card.setAttribute('role', 'dialog')
  card.setAttribute('aria-modal', 'true')

  const header = document.createElement('div')
  header.className = 'grammar-compare-header'
  header.textContent = 'Grammar suggestion'
  card.appendChild(header)

  const bodyEl = document.createElement('div')
  bodyEl.className = 'grammar-compare-body'

  // If the text is unchanged, diffWords still returns all "same" parts —
  // worth showing a note rather than an empty-looking diff.
  if (original.trim() === corrected.trim()) {
    const noteEl = document.createElement('div')
    noteEl.className = 'grammar-compare-note'
    noteEl.textContent = 'No changes suggested.'
    bodyEl.appendChild(noteEl)
  } else {
    for (const part of diffWords(original, corrected)) {
      if (part.type === 'same') {
        bodyEl.appendChild(document.createTextNode(part.text))
      } else {
        const span = document.createElement('span')
        span.className =
          part.type === 'removed' ? 'grammar-compare-removed' : 'grammar-compare-added'
        span.textContent = part.text
        bodyEl.appendChild(span)
      }
    }
  }

  card.appendChild(bodyEl)

  const actions = document.createElement('div')
  actions.className = 'grammar-compare-actions'

  const rejectButton = document.createElement('button')
  rejectButton.type = 'button'
  rejectButton.className = 'grammar-compare-button grammar-compare-reject'
  rejectButton.textContent = 'Reject'
  rejectButton.addEventListener('click', () => {
    closeGrammarComparisonModal()
    onReject()
  })
  actions.appendChild(rejectButton)

  const acceptButton = document.createElement('button')
  acceptButton.type = 'button'
  acceptButton.className = 'grammar-compare-button grammar-compare-accept'
  acceptButton.textContent = 'Accept'
  acceptButton.addEventListener('click', () => {
    closeGrammarComparisonModal()
    onAccept()
  })
  actions.appendChild(acceptButton)

  card.appendChild(actions)
  overlay.appendChild(card)
  document.body.appendChild(overlay)
  modalOverlayEl = overlay

  // Clicking the backdrop is treated as Reject — a safe default, since
  // dismissing without an explicit choice should never silently apply
  // an unreviewed AI rewrite to your document.
  overlay.addEventListener('click', e => {
    if (e.target === overlay) {
      closeGrammarComparisonModal()
      onReject()
    }
  })

  modalEscapeHandler = e => {
    if (e.key === 'Escape') {
      closeGrammarComparisonModal()
      onReject()
    }
  }
  document.addEventListener('keydown', modalEscapeHandler)
}

// ---------------------------------------------------------------
// The extension
// ---------------------------------------------------------------
export interface OllamaGrammarCheckOptions {
  /** Full URL to your Ollama-compatible /api/chat endpoint. */
  apiUrl: string
  /** Model name/tag to call. */
  model: string
  /** Request timeout in ms — LLM calls can hang; fail gracefully instead. */
  timeout: number
  /**
   * If true (default) and `onSuggestion` is not set, shows the built-in
   * comparison popup (diff + Accept/Reject) before applying anything.
   * Set to false to skip the popup and apply corrections immediately —
   * not recommended, since LLM output isn't as precise as Harper's
   * rule-based fixes and can occasionally rewrite more than intended.
   */
  showComparisonPopup: boolean
  /**
   * Full override: called after a successful check, before anything is
   * applied. Return `false` to handle the replacement entirely yourself
   * (e.g. your own custom UI) — this takes priority over
   * showComparisonPopup, which won't run if this option is set.
   */
  onSuggestion?: (original: string, corrected: string) => boolean | void
  /** Called if the request fails (network error, timeout, bad response). */
  onError?: (error: Error) => void
  /**
   * Called whenever a check starts/finishes. Mutating
   * editor.storage.ollamaGrammarCheck.isChecking directly does NOT trigger
   * a re-render in React/Vue, since it happens outside a dispatched
   * transaction — use this callback to drive your button's disabled state
   * instead of reading storage reactively.
   */
  onCheckingChange?: (isChecking: boolean) => void
}

export interface OllamaGrammarCheckStorage {
  isChecking: boolean
  error: string | null
  lastOriginal: string | null
  lastCorrected: string | null
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    ollamaGrammarCheck: {
      /**
       * Sends the current selection (or the whole document if the
       * selection is empty) to the grammar model. By default, shows a
       * comparison popup with Accept/Reject rather than applying anything
       * automatically — see showComparisonPopup and onSuggestion options.
       */
      checkGrammar: () => ReturnType
    }
  }
}

async function callOllamaChat(
  apiUrl: string,
  model: string,
  text: string,
  timeoutMs: number,
): Promise<string> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: text }],
        stream: false,
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`Ollama request failed: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    const corrected: string | undefined = data?.message?.content

    if (!corrected) {
      throw new Error('Ollama response did not contain message.content')
    }

    return corrected.trim()
  } finally {
    clearTimeout(timeoutId)
  }
}

export const OllamaGrammarCheck = Extension.create<
  OllamaGrammarCheckOptions,
  OllamaGrammarCheckStorage
>({
  name: 'ollamaGrammarCheck',

  addOptions() {
    return {
      apiUrl: 'http://localhost:8080/api/chat',
      model: 'gnokit/improve-grammar',
      timeout: 15000,
      showComparisonPopup: true,
      onSuggestion: undefined,
      onError: undefined,
      onCheckingChange: undefined,
    }
  },

  addStorage() {
    return {
      isChecking: false,
      error: null,
      lastOriginal: null,
      lastCorrected: null,
    }
  },

  addCommands() {
    return {
      checkGrammar:
        () =>
        ({ state, editor }) => {
          // Refuse to start a second check while one is already in flight —
          // without this, clicking the button twice fires two overlapping
          // requests, and whichever resolves last silently overwrites the
          // other's popup/result.
          if (editor.storage.ollamaGrammarCheck.isChecking) return false

          const { from, to, empty } = state.selection
          const range = empty ? { from: 0, to: state.doc.content.size } : { from, to }

          const original = state.doc.textBetween(range.from, range.to, '\n', '\n')

          if (!original.trim()) return false

          // Fire the async work outside the synchronous command return.
          // Tiptap commands must return a boolean synchronously; the actual
          // doc edit (if any) happens later, once the user accepts.
          editor.storage.ollamaGrammarCheck.isChecking = true
          editor.storage.ollamaGrammarCheck.error = null
          this.options.onCheckingChange?.(true)

          callOllamaChat(this.options.apiUrl, this.options.model, original, this.options.timeout)
            .then(corrected => {
              editor.storage.ollamaGrammarCheck.isChecking = false
              editor.storage.ollamaGrammarCheck.lastOriginal = original
              editor.storage.ollamaGrammarCheck.lastCorrected = corrected
              this.options.onCheckingChange?.(false)

              const applyCorrection = () => {
                // Guard against the doc having changed shape (e.g. user
                // kept typing while the request was in flight) — re-clamp
                // the range to the current doc size.
                const docSize = editor.state.doc.content.size
                const safeFrom = Math.min(range.from, docSize)
                const safeTo = Math.min(range.to, docSize)

                // Preserve marks (bold/italic/links) that were on the
                // original range — the model returns plain text with no
                // formatting info, so a naive string replace would
                // silently drop them.
                const marks = editor.state.doc.resolve(safeFrom).marks()

                editor
                  .chain()
                  .focus()
                  .insertContentAt(
                    { from: safeFrom, to: safeTo },
                    marks.length
                      ? [{ type: 'text', text: corrected, marks: marks.map(m => m.toJSON()) }]
                      : corrected,
                  )
                  .run()
              }

              // Full override takes priority — if set, this extension's
              // own popup never runs, matching the documented option order.
              if (this.options.onSuggestion) {
                const shouldAutoApply = this.options.onSuggestion(original, corrected)
                if (shouldAutoApply === false) return
                applyCorrection()
                return
              }

              if (this.options.showComparisonPopup) {
                showGrammarComparisonModal(
                  original,
                  corrected,
                  applyCorrection, // Accept
                  () => {}, // Reject — do nothing, leave the document untouched
                )
                return
              }

              // Neither a custom handler nor the popup is enabled — old
              // auto-apply behavior, for anyone who explicitly wants it.
              applyCorrection()
            })
            .catch((err: Error) => {
              editor.storage.ollamaGrammarCheck.isChecking = false
              editor.storage.ollamaGrammarCheck.error = err.message
              this.options.onCheckingChange?.(false)
              this.options.onError?.(err)
            })

          return true
        },
    }
  },
})
