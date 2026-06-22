'use client'
import { Input } from '@/components/ui/input'
import { Select, SelectItem, SelectTrigger, SelectValue, SelectContent } from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Toggle } from '@/components/ui/toggle'
import { cn } from '@/lib/utils'
import { TextShape, updateShape } from '@/redux/slice/shapes'
import { useAppDispatch, useAppSelector } from '@/redux/store'
import { Bold, Italic, Palette, Strikethrough, Underline } from 'lucide-react'
import React, { useState } from 'react'

type Props = {
    isOpen: boolean
}

const TextSidebar = ({ isOpen }: Props) => {
    const dispatch = useAppDispatch()
    const selectedShapes = useAppSelector((state) => state.shapes.present?.selected ?? {})
    const shapesEntities = useAppSelector((state) => state.shapes.present?.shapes.entities ?? {})

    const fontFamilies = [
        'Inter, sans-serif',
        'Arial, sans-serif',
        'Helvetica, sans-serif',
        'Georgia, serif',
        'Times New Roman, serif',
        'Courier New, monospace',
        'Monaco, monospace',
        'system-ui, sans-serif',
    ]

    const selectedTextShape = Object.keys(selectedShapes)
        .map((id) => shapesEntities[id])
        .find((shape) => shape?.type === 'text') as TextShape | undefined

    const [colorInput, setColorInput] = useState(
        selectedTextShape?.fill || '#ffffff'
    )

    // Helper function to update a specific property of the selected text shape
    const updateTextProperty = (property: keyof TextShape, value: any) => {
        if (!selectedTextShape) return

        dispatch(
            updateShape({
                id: selectedTextShape.id,
                patch: { [property]: value },
            })
        )
    }

    // Handle color change with validation
    const handleColorChange = (color: string) => {
        setColorInput(color)
        if (/^#[0-9A-F]{6}$/i.test(color) || /^#[0-9A-F]{3}$/i.test(color)) {
            updateTextProperty('fill', color)
        }
    }

    if (!isOpen || !selectedTextShape) return null

    return (
        <div
            className={cn(
                'fixed right-5 top-1/2 transform -translate-y-1/2 w-80 backdrop-blur-xl bg-zinc-900/90 border-white/10 shadow-2xl shadow-black/40 gap- 2 p-3 saturate-150 border rounded-lg z-50 transition-transform duration - 300',
                isOpen ? 'translate-x-0' : 'translate-x-full'
            )}
        >

            <div className="p-4 flex flex-col gap-10 overflow-y-auto max-h-[calc(100vh-8rem)]">
                <div className="space-y-2">
                    <label className="text-white/80 flex items-center gap-2">Font Family</label>
                    <Select
                        value={selectedTextShape?.fontFamily}
                        onValueChange={(value) => updateTextProperty('fontFamily', value)}
                    >
                        <SelectTrigger className="bg-white/5 border-white/10 w-full text-white">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-black/90 border-white/10">
                            {fontFamilies.map((font) => (
                                <SelectItem
                                    key={font}
                                    value={font}
                                    className="text-white hover:bg-white/10"
                                >

                                    <span style={{ fontFamily: font }}>{font.split(',')[0]}</span>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div >

                <div className="space-y-2">
                    <label className="text-white/80 flex items-center gap-2">
                        Font Size: {selectedTextShape?.fontSize}px
                    </label>
                    <Slider
                        value={[selectedTextShape?.fontSize]}
                        onValueChange={([value]) => updateTextProperty('fontSize', value)}
                        min={8}
                        max={128}
                        step={1}
                        className="w-full"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-white/80 flex items-center gap-2">
                        Font Weight: {selectedTextShape?.fontWeight}
                    </label>
                    <Slider
                        value={[selectedTextShape?.fontWeight]}
                        onValueChange={([value]) => updateTextProperty('fontWeight', value)}
                        min={100}
                        max={900}
                        step={100}
                        className="w-full"
                    />
                </div>

                <div className="space-y-3">
                    <label className="text-white/80 flex items-center gap-2">Style</label>
                    <div className="flex gap-2">

                        {/* Bold */}
                        <Toggle
                            pressed={selectedTextShape.fontWeight >= 600}
                            onPressedChange={(pressed) =>
                                updateTextProperty("fontWeight", pressed ? 700 : 400)
                            }
                            className="data-[state=on]:bg-blue-500 data-[state=on]:text-white">
                            <Bold className="w-4 h-4" />
                        </Toggle>

                        {/* Italic */}
                        <Toggle
                            pressed={selectedTextShape.fontStyle === "italic"}
                            onPressedChange={(pressed) =>
                                updateTextProperty("fontStyle", pressed ? "italic" : "normal")
                            }
                            className="data-[state=on]:bg-blue-500 data-[state=on]:text-white">
                            <Italic className="w-4 h-4" />
                        </Toggle>

                        {/* Underline */}
                        <Toggle
                            pressed={selectedTextShape.textDecoration === "underline"}
                            onPressedChange={(pressed) =>
                                updateTextProperty(
                                    "textDecoration",
                                    pressed ? "underline" : "none"
                                )
                            }
                            className="data-[state=on]:bg-blue-500 data-[state=on]:text-white">
                            <Underline className="w-4 h-4" />
                        </Toggle>

                        {/* line-through */}
                        <Toggle
                            pressed={selectedTextShape.textDecoration === "line-through"}
                            onPressedChange={(pressed) =>
                                updateTextProperty(
                                    "textDecoration",
                                    pressed ? "line-through" : "none"
                                )
                            }
                            className="data-[state=on]:bg-blue-500 data-[state=on]:text-white">
                            <Strikethrough className="w-4 h-4" />
                        </Toggle>
                    </div>
                </div>

                {/* Line Height */}
                <div className="space-y-2">
                    <label className="text-white/80 flex items-center gap-2">
                        Line Height: {selectedTextShape.lineHeight}
                    </label>
                    <Slider
                        value={[selectedTextShape.lineHeight]}
                        onValueChange={([value]) => updateTextProperty('lineHeight', value)}
                        min={0.8}
                        max={3}
                        step={0.1}
                        className="w-full"
                    />
                </div>

                {/* Letter Spacing */}
                <div className="space-y-2">
                    <label className="text-white/80 flex items-center gap-2">
                        Letter Spacing: {selectedTextShape.letterSpacing}px
                    </label>
                    <Slider
                        value={[selectedTextShape.letterSpacing]}
                        onValueChange={([value]) =>
                            updateTextProperty('letterSpacing', value)
                        }
                        min={-2}
                        max={10}
                        step={0.1}
                        className="w-full"
                    />
                </div>

                {/* Text color */}
                <div className="space-y-2">
                    <label className="text-white/80 flex items-center gap-2">
                        <Palette className="w-4 h-4" />
                        Text Color
                    </label>
                    <div className="flex gap-2">
                        <Input
                            value={colorInput}
                            onChange={(e) => handleColorChange(e.target.value)}
                            placeholder="#ffffff"
                            className="bg-white/5 border-white/10 text-whitę flex-1"
                        />
                        <div className="relative w-10 h-10 shrink-0">
                            {/* Sirf rang dikhane ke liye swatch */}
                            <div
                                className="w-10 h-10 rounded border border-white/20 pointer-events-none"
                                style={{ backgroundColor: selectedTextShape.fill || "#ffffff" }}
                            />
                            {/* Native color picker ko swatch ke upar hi anchor karne ke
                                liye yahan ek real (invisible) input rakha hai. Pehle
                                detached input (DOM se bahar, 0,0 par) tha is liye picker
                                screen ke top-left me khulta tha. */}
                            <input
                                type="color"
                                aria-label="Text color"
                                value={selectedTextShape.fill || "#ffffff"}
                                onChange={(e) => {
                                    const color = e.target.value
                                    setColorInput(color)
                                    updateTextProperty('fill', color)
                                }}
                                className="absolute inset-0 w-full h-full cursor-pointer opacity-0"
                            />
                        </div>

                    </div>
                </div>
            </div>
        </div>

    );
}

export default TextSidebar