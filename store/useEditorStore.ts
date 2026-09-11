import { create } from "zustand";
import { type Editor } from "@tiptap/react";
import type { HocuspocusProvider } from "@hocuspocus/provider";

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
  collabProvider: HocuspocusProvider | null;
  setCollabProvider: (provider: HocuspocusProvider | null) => void;
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
  colorSet: string[][];
  documentName: string,
  setDocumentName: (documentName: string) => void;
  fontSizes: number[];
  typographies: { label: string, value: number }[]
};

export const useEditorStore = create<EditorState>((set, get) => ({
  editor: null,
  setEditor: (editor) => set({ editor }),
  collabProvider: null,
  setCollabProvider: (collabProvider) => set({ collabProvider }),
  documentName: 'Untitled document',
  setDocumentName: (documentName: string) => set({ documentName }),
  formatBuffer: null,
  setFormatBuffer: (formatBuffer) => set({ formatBuffer }),
  colorSet: [
    [
      '#FFFFFF',
      '#F3F3F3',
      '#EFEFEF',
      '#D9D9D9',
      '#CCCCCC',
      '#B7B7B7',
      '#999999',
      '#666666',
      '#434343',
      '#000000'
    ],
    [
      '#EA33F7',
      '#8C1AF5',
      '#0000F5',
      '#5885E1',
      '#75FBFD',
      '#75FB4C',
      '#FFFF54',
      '#F19E38',
      '#EA3323',
      '#8B1A10'
    ],
    [
      '#E6D2DB',
      '#D8D2E7',
      '#D3E1F1',
      '#CCD9F5',
      '#D3DFE2',
      '#DCE9D5',
      '#FDF2D0',
      '#F8E6D0',
      '#EECDCD',
      '#DFBAB1'
    ],
    [
      '#CEA8BC',
      '#B2A7D2',
      '#A7C4E5',
      '#AAC1F0',
      '#A9C3C8',
      '#BCD6AC',
      '#FBE6A3',
      '#F2CDA2',
      '#DE9D9B',
      '#D08370',
    ],
    [
      '#B87E9E',
      '#8B7DBE',
      '#7CA6D7',
      '#789DE5',
      '#80A4AE',
      '#9DC384',
      '#F9DA78',
      '#ECB576',
      '#D16D6A',
      '#BD4B31',
    ],
    [
      '#9B5277',
      '#634FA2',
      '#5083C1',
      '#4B77D1',
      '#54808C',
      '#78A65A',
      '#EAC451',
      '#DA954B',
      '#BB271A',
      '#982B15',
    ],
    [
      '#6B2246',
      '#321D70',
      '#25528F',
      '#2854C5',
      '#264E5A',
      '#48752C',
      '#B89230',
      '#A96324',
      '#8C1A11',
      '#7A2917',
    ],
    [
      '#46162F',
      '#1E134A',
      '#173660',
      '#274482',
      '#18333C',
      '#314D1C',
      '#7A611D',
      '#704216',
      '#5D0E07',
      '#531607',
    ]
  ],
  fontSizes: [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 36, 48, 72, 96],
  typographies: [
    {
      label: 'Heading 1',
      value: 1
    },
    {
      label: 'Heading 2',
      value: 2
    },
    {
      label: 'Heading 3',
      value: 3
    },
    {
      label: 'Heading 4',
      value: 4
    },
    {
      label: 'Heading 5',
      value: 5
    },
    {
      label: 'Paragraph',
      value: 0
    }
  ],
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
  setEnableToolbar: (enableToolbar: boolean) => set({ enableToolbar }),
}));