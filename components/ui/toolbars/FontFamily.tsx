import { useEditorStore } from '@/store/useEditorStore';
import React, { useEffect, useState } from 'react';
import Dropdown from '../customs/Dropdown';

const FontFamily = () => {
  const FONT_FAMILIES = ['Arial', 'Calibri', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana', 'Inter'];
  const { editor } = useEditorStore();
  const [currentFont, setCurrentFont] = useState(null);

  useEffect(() => {
    if (!editor) return;

    const updateFont = () => {
      const fontFamily = editor.getAttributes("textStyle")?.fontFamily;
      setCurrentFont(fontFamily || FONT_FAMILIES[1]);
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
      value={currentFont}
      onChange={(font: string) => {
        editor?.chain()?.focus()?.setFontFamily(font)?.run()
      }}
      items={FONT_FAMILIES}
      className='min-w-32.5'
      renderStyle='fontFamily'
      title='Font Family'
      withIconCheck
      truncateSelection
    />
  );
}

export default FontFamily;
