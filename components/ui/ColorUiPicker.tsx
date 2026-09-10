"use client";
import {
  Button,
  ColorArea,
  ColorField,
  ColorPicker,
  ColorSlider,
  ColorSwatch,
  ColorSwatchPicker,
  Label,
  parseColor,
} from "@heroui/react";
import {Icon} from "@iconify/react";
import {Ref, RefObject, useState} from "react";
import { cn } from '@/lib/utils';

const ColorUiPicker = (
  {
    className = '',
    labelModifier = '',
    colorAreaClass = '',
    boundaryRef = null,
    onClick = () => {},
    isOpen = true
  }:
  {
    className?: string;
    labelModifier?: string;
    boundaryRef?: RefObject<HTMLDivElement> | null;
    onClick?: () => void;
    isOpen?: boolean;
    colorAreaClass?: string
  }
) => {
  const [color, setColor] = useState(parseColor("#325578"));
  const colorPresets = [
    "#ef4444",
    "#f97316",
    "#eab308",
    "#22c55e",
    "#06b6d4",
    "#3b82f6",
    "#8b5cf6",
    "#ec4899",
    "#f43f5e",
  ];
  const shuffleColor = () => {
    const randomHue = Math.floor(Math.random() * 360);
    const randomSaturation = 50 + Math.floor(Math.random() * 50); // 50-100%
    const randomLightness = 40 + Math.floor(Math.random() * 30); // 40-70%
    setColor(parseColor(`hsl(${randomHue}, ${randomSaturation}%, ${randomLightness}%)`));
  };
  return (
    <div className='h-fit flex flex-col gap-0'>
      <ColorPicker value={color} onChange={setColor}>
        <ColorPicker.Trigger className='w-full'>
          <div
            className={labelModifier}
            onClick={onClick}
          >
            Custom Color
          </div>
        </ColorPicker.Trigger>
        {/* {isOpen && ( */}
        <ColorPicker.Popover
          className={cn("gap-2", className)}
          boundaryElement={boundaryRef && boundaryRef?.current || undefined}
          isOpen={isOpen}
        >
          <ColorSwatchPicker className="justify-center pt-2" size="xs">
            {colorPresets.map((preset) => (
              <ColorSwatchPicker.Item key={preset} color={preset}>
                <ColorSwatchPicker.Swatch />
              </ColorSwatchPicker.Item>
            ))}
          </ColorSwatchPicker>
          <ColorArea
            aria-label="Color area"
            className={cn("max-w-full", colorAreaClass)}
            colorSpace="hsb"
            xChannel="saturation"
            yChannel="brightness"
          >
            <ColorArea.Thumb />
          </ColorArea>
          <div className="flex items-center gap-2 px-1">
            <ColorSlider aria-label="Hue slider" channel="hue" className="flex-1" colorSpace="hsb">
              <ColorSlider.Track>
                <ColorSlider.Thumb />
              </ColorSlider.Track>
            </ColorSlider>
            <Button
              isIconOnly
              aria-label="Shuffle color"
              size="sm"
              variant="tertiary"
              onPress={shuffleColor}
            >
              <Icon className="size-4" icon="gravity-ui:shuffle" />
            </Button>
          </div>
          <div className='flex items-center gap-1'>
            <button
              onClick={onClick}
              className='w-full border border-gray-300 rounded-lg bg-gray-50 hover:bg-gray-100 px-2.5 py-1 text-[13px] cursor-pointer cancel-btn'
            >
              Close
            </button>
            <button
              className='w-full text-center bg-blue-500 text-white text-[13px] border border-blue-500 font-semibold px-2.5 py-1 rounded-lg hover:bg-blue-600/90 cursor-pointer select-btn'
              onClick={onClick}
            >
              Select
            </button>
          </div>
        </ColorPicker.Popover>
      </ColorPicker>
    </div>
  );
}

export default ColorUiPicker;
