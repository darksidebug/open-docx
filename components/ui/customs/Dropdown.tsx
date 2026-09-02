'use client'

import { useState, useRef, useEffect } from "react";
import { type Editor } from '@tiptap/react'
import { cn } from "@/lib/utils";

export default function Dropdown(
  {
    value = "",
    onChange,
    items = [],
    placeholder = "Select...",
    className = "",
    renderStyle = null,
    title = 'Font Family',
    withIconCheck = false,
    truncateSelection = false
  }: {
    value: string | null | boolean | number,
    onChange: Function,
    items: (string | number | Record<string, any>)[],
    placeholder?: string,
    className?: string,
    renderStyle?: string | null,
    title?: string,
    withIconCheck?: boolean,
    truncateSelection?: boolean
  }) {
  const [isOpen, setIsOpen] = useState(false);
  const selected = typeof items[0] === "string" ? items[0] : (typeof items[0] === "object" ? items[0]?.value : null) || null;
  const [selectedItem, setSelectedItem] = useState<string | null | boolean | number>(selected);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { setSelectedItem(value) }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!dropdownRef) return;

      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div
      ref={dropdownRef}
      className='relative inline-block'
    >
      {/* Dropdown Trigger showing current selection */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "h-7 flex items-center justify-between gap-2 text-xs border border-zinc-200 dark:border-zinc-700 rounded-sm bg-white dark:bg-zinc-800 px-2 focus:outline-none w-full text-zinc-800 dark:text-zinc-200",
          className
        )}
        title={title}
      >
        <span className={cn(truncateSelection && "truncate" || '')}>
          {selectedItem}
        </span>
        <svg className={`relative left-0.5 w-3 h-3 opacity-60 ${isOpen ? 'rotate-180' : ''} transition-transform`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 z-50 mt-1 w-full bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded shadow-lg">
          <ul className="max-h-60 overflow-y-auto overflow-x-hidden">
            {items.map((item: string | number | Record<string, any>) => {
              const isSelected = typeof item === "string" || typeof item === "number" ? item === selectedItem : item.value === selectedItem;
              const currentItem = typeof item === "string" || typeof item === "number" ? item : item.value;
              const style = renderStyle ? { [renderStyle]: currentItem } : {};

              return (
                <li
                  key={typeof item === "string" || typeof item === "number" ? item : item.value}
                  onClick={() => {
                    setSelectedItem(typeof item === "string" || typeof item === "number" ? item : item.value);
                    onChange(item);
                    setIsOpen(false);
                  }}
                  className={`px-3 py-1.5 text-xs cursor-pointer flex items-center justify-between transition-colors duration-150 text-zinc-800 dark:text-zinc-200 ${
                    isSelected
                      ? "bg-zinc-200/70 dark:bg-zinc-700 font-medium"
                      : "hover:bg-zinc-100 dark:hover:bg-zinc-700/50"
                  }`}
                  style={style}
                >
                  <span className="truncate">{typeof item === "string" || typeof item === "number" ? item : item.label}</span>
                  {isSelected && withIconCheck && (
                    <svg className="w-3 h-3 ml-2 shrink-0 text-zinc-600 dark:text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}