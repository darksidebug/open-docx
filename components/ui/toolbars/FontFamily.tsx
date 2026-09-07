import { useEditorStore } from '@/store/useEditorStore';
import React, { useEffect, useState } from 'react';
import Dropdown from '../customs/Dropdown';
import { cn } from '@/lib/utils';

const FontFamily = ({ modifier = ''}) => {
  const FONT_FAMILIES = [
    'Arial',
    'Calibri',
    'Courier New',
    'Georgia',
    'Google Sans',
    'Geist Mono',
    'Geist Sans',
    'Inter',
    'JetBrains Mono',
    'Poppins',
    'Roboto',
    'Times New Roman',
    'Verdana'
  ];
  const { editor } = useEditorStore();
  const [currentFont, setCurrentFont] = useState<string | null>(null);

  useEffect(() => {
    if (!editor) return;

    const updateFont = () => {
      let fontFamily = editor.getAttributes("textStyle")?.fontFamily;
      let matchedFont = 'Google Sans';

      if (fontFamily) {
        const fontParts = fontFamily.split(',').map((f: string) => f.trim().replace(/['"]/g, ''));

        const foundFont = fontParts.find((part: string) =>
          FONT_FAMILIES.some((font) => font.toLowerCase() === part.toLowerCase())
        );

        if (foundFont) {
          matchedFont = foundFont;
        }
      }

      setCurrentFont(matchedFont || 'Google Sans');
    };

    updateFont();

    editor.on("selectionUpdate", updateFont);
    editor.on("transaction", updateFont);

    return () => {
      editor.off("selectionUpdate", updateFont);
      editor.off("transaction", updateFont);
    };
  }, [editor]);

  return (
    <Dropdown
      value={currentFont || 'Google Sans'}
      onChange={(font: string) => {
        editor?.chain()?.focus()?.setFontFamily(font)?.run()
      }}
      items={FONT_FAMILIES}
      className={cn('min-w-37.5', modifier)}
      renderStyle='fontFamily'
      title='Font Family'
      withIconCheck
      truncateSelection
    />
  );
}

export default FontFamily;
