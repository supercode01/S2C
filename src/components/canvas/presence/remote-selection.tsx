'use client'
import React from 'react'
import { useAppSelector } from '@/redux/store'
import { usePresenceList, useSendPresence } from '@/hooks/use-presence'

const getBounds = (shape: any) => {
    if (!shape) return null
    switch (shape.type) {
        case 'frame':
        case 'rect':
        case 'ellipse':
        case 'generatedui':
            return { x: shape.x, y: shape.y, w: shape.w, h: shape.h }
        case 'text': {
            const w = Math.max(shape.text.length * shape.fontSize * 0.6, 100)
            const h = shape.fontSize * 1.2 + 8
            return { x: shape.x, y: shape.y, w, h }
        }
        case 'freedraw': {
            const xs = shape.points.map((p: any) => p.x)
            const ys = shape.points.map((p: any) => p.y)
            const minX = Math.min(...xs), minY = Math.min(...ys)
            return { x: minX, y: minY, w: Math.max(...xs) - minX, h: Math.max(...ys) - minY }
        }
        case 'arrow':
        case 'line': {
            const minX = Math.min(shape.startX, shape.endX)
            const minY = Math.min(shape.startY, shape.endY)
            return {
                x: minX, y: minY,
                w: Math.abs(shape.endX - shape.startX),
                h: Math.abs(shape.endY - shape.startY),
            }
        }
        default:
            return null
    }
}

const RemoteSelections = () => {
    useSendPresence() // apni presence (selection) bhejta hai

    const me = useAppSelector((s) => s.profile)
    const scale = useAppSelector((s) => s.viewport.scale)   // 👈 border fix ke liye
    const entities = useAppSelector((s) => s.shapes.present.shapes.entities)
    const presences = usePresenceList()

    const others = presences.filter((p) => p.userId !== me?.id)

    return (
        <>
            {others.map((p) =>
                p.selectedIds.map((id) => {
                    // Inner Generated-UI element selection encoded as "box:x,y,w,h"
                    let b: { x: number; y: number; w: number; h: number } | null
                    if (typeof id === 'string' && id.startsWith('box:')) {
                        const [x, y, w, h] = id.slice(4).split(',').map(Number)
                        b = Number.isFinite(x) ? { x, y, w, h } : null
                    } else {
                        b = getBounds(entities[id])
                    }
                    if (!b) return null
                    return (
                        <div
                            key={`${p.userId}-${id}`}
                            className="absolute pointer-events-none"
                            style={{
                                left: b.x,
                                top: b.y,
                                width: b.w,
                                height: b.h,
                                // 👇 border zoom ke saath constant rahega
                                border: `${2 / scale}px solid ${p.color}`,
                                boxSizing: 'border-box',
                            }}
                        >
                            {/* naam tag — constant size (counter-scale) */}
                            <div
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    transform: `translateY(-100%) scale(${1 / scale})`,
                                    transformOrigin: 'left bottom',
                                }}
                            >
                                <span
                                    className="text-[11px] text-white px-1.5 py-0.5 rounded-sm whitespace-nowrap"
                                    style={{ background: p.color }}
                                >
                                    {p.name ?? 'User'}
                                </span>
                            </div>
                        </div>
                    )
                })
            )}
        </>
    )
}

export default RemoteSelections