import { create } from "zustand";
import { type Editor } from "@tiptap/react";

interface ActiveMarks {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  code: boolean;
  fontFamily?: string;
  textColor?: string;
  highlightColor?: string;
}

interface EditorState {
  editor: Editor | null;
  setEditor: (editor: Editor | null) => void;
  formatBuffer: ActiveMarks | null;
  setFormatBuffer: (buffer: ActiveMarks | null) => void;
  handleCopyFormat: () => void;
  handlePasteFormat: () => void;
  changeFontSizeStep: (delta: number) => void;
  applyCaseChange: (caseType: string) => void;
  clearCurrentBlockText: () => void;
  selectCurrentText: () => void;
  enableImageBubble: boolean;
  setEnableImageBubble: (enableImageBubble: boolean) => void;
  enableTableBubble: boolean,
  setEnableTableBubble: (enableImageBubble: boolean) => void;
  enableTextBubble: boolean;
  setEnableTextBubble: (enableTextBubble: boolean) => void;
  enableRuler: boolean;
  setEnableRuler: (enableRuler: boolean) => void;
  enableToolbar: boolean;
  setEnableToolbar: (enableToolbar: boolean) => void;
};

export const useEditorStore = create<EditorState>((set, get) => ({
  editor: null,
  setEditor: (editor) => set({ editor }),
  formatBuffer: null,
  setFormatBuffer: (formatBuffer) => set({ formatBuffer }),
  handleCopyFormat: () => {
    const editor = get().editor;

    if (!editor) return;

    const textStyle = editor.getAttributes("textStyle");
    const highlight = editor.getAttributes("highlight");

    const activeMarks = {
      bold: editor.isActive("bold"),
      italic: editor.isActive("italic"),
      underline: editor.isActive("underline"),
      strike: editor.isActive("strike"),
      code: editor.isActive("code"),
      fontFamily: textStyle?.fontFamily,
      textColor: textStyle?.color,
      highlightColor: highlight?.color,
    };

    set({ formatBuffer: activeMarks });
  },
  handlePasteFormat: () => {
    const editor = get().editor;
    const formatBuffer = get().formatBuffer;

    if (!editor || !formatBuffer) return;

    const { from, to } = editor.state.selection;

    if (from === to) return;

    const chain = editor.chain().focus();

    if (formatBuffer.bold) chain.setBold(); else chain.unsetBold();
    if (formatBuffer.italic) chain.setItalic(); else chain.unsetItalic();
    if (formatBuffer.underline) chain.setUnderline(); else chain.unsetUnderline();
    if (formatBuffer.strike) chain.setStrike(); else chain.unsetStrike();

    if (formatBuffer.fontFamily) {
      chain.setFontFamily(formatBuffer.fontFamily);
    } else {
      chain.unsetFontFamily();
    }

    if (formatBuffer.textColor) {
      chain.setColor(formatBuffer.textColor);
    } else {
      chain.unsetColor();
    }

    if (formatBuffer.highlightColor) {
      chain.setHighlight({ color: formatBuffer.highlightColor });
    } else {
      chain.unsetHighlight();
    }

    chain.run();
    set({ formatBuffer: null });
  },
  changeFontSizeStep: (delta: number) => {
    const editor = get().editor;

    if (!editor) return;

    const currentSize = editor.getAttributes('textStyle').fontSize || '13px';
    const numericSize = parseInt(currentSize, 10);
    const newSize = Math.max(8, numericSize + delta);

    editor?.chain()?.focus()?.setFontSize(`${newSize}px`).run();
  },
  applyCaseChange: (caseType: string) => {
    const editor = get().editor;

    if (!editor) return;

    const { from, to } = editor?.state?.selection;
    const selectedText = editor?.state?.doc?.textBetween(from, to, ' ');
    if (!selectedText) return;

    let transformedText = selectedText;
    switch (caseType) {
      case 'lowercase':
        transformedText = selectedText?.toLowerCase();
        break;
      case 'uppercase':
        transformedText = selectedText?.toUpperCase();
        break;
      case 'capitalize':
        transformedText = selectedText?.replace(/\b\w/g, (char) => char.toUpperCase());
        break;
      case 'toggle':
        transformedText = selectedText
          .split('')
          .map((char) => (char === char?.toUpperCase() ? char?.toLowerCase() : char?.toUpperCase()))
          .join('');
        break;
      case 'sentence':
      default:
        transformedText = selectedText?.toLowerCase().replace(/(^\s*\w|[\.\!\?]\s*\w)/g, (c) => c?.toUpperCase());
        break;
    }

    editor?.chain()?.focus()?.insertContentAt({ from, to }, transformedText).run();
  },
  clearCurrentBlockText: () => {
    const editor = get().editor;
    if (!editor) return;

    const { $from } = editor.state.selection;
    const parent = $from.parent;


    if (parent.type.name === "paragraph" || parent.type.name === "heading") {
      const start = $from.start();
      const end = $from.end();
      editor.chain().focus().deleteRange({ from: start, to: end }).run();
    }
  },
  selectCurrentText: () => {
    const editor = get().editor;

    if (!editor) return;

    const { $from } = editor.state.selection;
    const start = $from.start();
    const end = $from.end();

    editor.chain().setTextSelection({ from: start, to: end }).run();
  },
  enableImageBubble: true,
  setEnableImageBubble: (enableImageBubble: boolean) => set({ enableImageBubble }),
  enableTableBubble: true,
  setEnableTableBubble: (enableTableBubble: boolean) => set({ enableTableBubble }),
  enableTextBubble: true,
  setEnableTextBubble: (enableTextBubble: boolean) => set({ enableTextBubble }),
  enableRuler: true,
  setEnableRuler: (enableRuler: boolean) => set({ enableRuler }),
  enableToolbar: true,
  setEnableToolbar: (enableToolbar: boolean) => set({ enableToolbar })
}));