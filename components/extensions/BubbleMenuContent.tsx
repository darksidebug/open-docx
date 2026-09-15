'use client'

import React, { useEffect, useState } from 'react';
import { BubbleMenu } from '@tiptap/react/menus';
import { useEditorStore } from '@/store/useEditorStore';
import TableBubbleMenu from './TableBubbleMenu';
import ColumnBubbleMenu from './ColumnBubbleMenu';
import TextBubbleMenu from './TextBubbleMenu';

const BubbleMenuContent = () => {
  const { editor, enableTableBubble, enableImageBubble, enableTextBubble } = useEditorStore();
  const [isScrolling, setIsScrolling] = useState(false);

  const isBlockEmpty = () => {
    if (!editor) return true;
    const { $from } = editor.state.selection;
    const parent = $from.parent;
    
    if (parent.type.name === "paragraph" || parent.type.name === "heading") {
      return parent.textContent.trim() === "";
    }
    return true;
  };

  useEffect(() => {
    const handleScroll = () => {
      if (editor && editor.isFocused) {
        editor.commands.blur();
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true, capture: true });

    return () => {
      window.removeEventListener('scroll', handleScroll, { capture: true });
    };
  }, [editor]);

  useEffect(() => {
    const handlePointerDown = () => {
      setTimeout(() => {
        setIsScrolling(isBlockEmpty());
      }, 100)
    };

    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  if (!editor) return;

  return (
    <BubbleMenu
      editor={editor}
      className='z-20'
    >
      {(() => {
        // if (isBlockEmpty()) return <></>

        if (enableTableBubble && editor?.isActive('table')) {
          return <TableBubbleMenu />
        }

        if (
          editor?.isActive('columnBlock') && !editor?.isActive('table') ||
          editor?.isActive('columnBlock') && !editor?.isActive('customImage')
        ) {
          return <ColumnBubbleMenu />
        }

        if (
          enableTextBubble && !editor?.isActive('columnBlock') ||
          enableTextBubble && !editor?.isActive('customImage') ||
          enableTextBubble && !editor?.isActive('table')
        ) {
          return <TextBubbleMenu />
        }

        return null;
      })()}
    </BubbleMenu>
  )
}

export default BubbleMenuContent
