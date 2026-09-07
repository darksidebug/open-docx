'use client'

import React, { useRef, useState } from 'react';
import { FaCaretDown } from 'react-icons/fa'

const markers = Array.from({ length: 83 }, (_, i) => i);

interface MarkerProps {
  position: number,
  isLeft: boolean,
  isDragging: boolean,
  onMouseDown: () => void,
  onDoubleClick: () => void
}

const Marker = ({ position, isLeft, isDragging, onMouseDown,onDoubleClick}: MarkerProps) => {
  return (
    <div
      className='absolute -top-px w-4 h-full cursor-ew-resize z-5 group -ml-2'
      style={{
        [isLeft ? 'left' : 'right']: `${position}px`
      }}
      onMouseDown={onMouseDown}
      onDoubleClick={onDoubleClick}
    >
      <FaCaretDown className='absolute left-1/2 top-0 h-full fill-blue-500 transform -translate-x-1/2' />
      <div
        className='absolute left-1/2 top-4 transform translate-x-1/2'
        style={{
          height: '100vh',
          width: '1px',
          transform: 'scaleX(0.5)',
          background: '#3b72f6',
          display: isDragging ? 'block' : 'none'
        }}
      />
    </div>
  )
}

const Ruler = () => {
  const [leftMargin, setLeftMargin] = useState(56);
  const [rightMargin, setRightMargin] = useState(50);
  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  const [isDraggingRight, setIsDraggingRight] = useState(false);
  const rulerRef = useRef<HTMLDivElement | null>(null);

  const handleLeftMouseDown = () => {
    setIsDraggingLeft(true);
  }

  const handleRightMouseDown = () => {
    setIsDraggingRight(true);
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    const PAGE_WIDTH = 816;
    const MIN_SPACE = 100;

    if ((isDraggingLeft || isDraggingRight) && rulerRef.current) {
      const container = rulerRef.current.querySelector('#ruler-container');

      if (container) {
        const containerRect = container.getBoundingClientRect();
        const relativeX = e.clientX - containerRect.left;
        const rawPosition = Math.max(0, Math.min(PAGE_WIDTH, relativeX));

        if (isDraggingLeft) {
          const maxLeftPosition = PAGE_WIDTH - rightMargin - MIN_SPACE;
          const newLeftPosition = Math.min(rawPosition, maxLeftPosition);
          setLeftMargin(newLeftPosition);
        } else if (isDraggingRight) {
          const maxRightPosition = PAGE_WIDTH - rightMargin - MIN_SPACE;
          const newRightPosition = Math.max(PAGE_WIDTH - rawPosition, 0);
          const constrainedRightPos = Math.min(newRightPosition, maxRightPosition)
          setRightMargin(constrainedRightPos);
        }
      }
    }
  }

  const handleMouseUp = () => {
    setIsDraggingLeft(false);
    setIsDraggingRight(false);
  }

  const handleLeftMouseDoubleClick = () => {
    setLeftMargin(56);
  }

  const handleRightMouseDoubleClick = () => {
    setRightMargin(50);
  }

  return (
    <div
      ref={rulerRef}
      className='mt-1 h-6 border-b border-gray-300 flex items-end select-none print:hidden'
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div
        id='ruler-container'
        className='max-w-204 mx-auto w-full h-full relative'
      >
        <Marker
          position={leftMargin}
          isLeft
          isDragging={isDraggingLeft}
          onMouseDown={handleLeftMouseDown}
          onDoubleClick={handleLeftMouseDoubleClick}
        />
        <Marker
          position={rightMargin}
          isLeft={false}
          isDragging={isDraggingRight}
          onMouseDown={handleRightMouseDown}
          onDoubleClick={handleRightMouseDoubleClick}
        />

        <div className='absolute inset-0 bottom-0 h-full'>
          <div className='relative h-full w-[816px]'>
            {markers.map(marker => {
              const position = (marker * 816) / 82;

              return (
                <div
                  key={marker}
                  className='absolute bottom-0'
                  style={{
                    left: `${position}px`
                  }}
                >
                  {marker % 10 === 0 && (
                    <>
                      <div className='absolute left-[0.5px] bottom-0 h-2.25 w-px border-l border-neutral-500' />
                      <span className='absolute bottom-2 text-[10px] text-neutral-500 transform -translate-x-1/2'>
                        {marker / 10 + 1}
                      </span>
                    </>
                  )}

                  {marker % 5 === 0 && marker % 10 !== 0 && (
                    <div className='absolute bottom-0 w-px h-1.75 border-l border-neutral-500' />
                  )}

                  {marker % 5 !== 0 && (
                    <div className='absolute bottom-0 w-px h-1 border-l border-neutral-500' />
                  )}
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}

export default Ruler
