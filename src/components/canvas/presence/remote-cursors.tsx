'use client'
import React from 'react'
import { useAppSelector } from '@/redux/store'
import { usePresenceList } from '@/hooks/use-presence'

const RemoteCursors = () => {
    const me = useAppSelector((s) => s.profile)
    const scale = useAppSelector((s) => s.viewport.scale)
    const presences = usePresenceList()

    const others = presences.filter((p) => p.userId !== me?.id && p.cursor)

    return (
        <>
            {others.map((p) => (
                <div
                    key={p.userId}
                    className="absolute pointer-events-none z-50"
                    style={{
                        left: p.cursor!.x,
                        top: p.cursor!.y,
                        // zoom ke baghair constant size (counter-scale)
                        transform: `scale(${1 / scale})`,
                        transformOrigin: 'top left',
                    }}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path
                            d="M3 2l7 18 2.5-7.5L20 10 3 2z"
                            fill={p.color}
                            stroke="white"
                            strokeWidth="1.5"
                            strokeLinejoin="round"
                        />
                    </svg>
                    <span
                        className="absolute text-[11px] text-white px-1.5 py-0.5 rounded-sm whitespace-nowrap"
                        style={{ background: p.color, top: 16, left: 12 }}
                    >
                        {p.name ?? 'User'}
                    </span>
                </div>
            ))}
        </>
    )
}

export default RemoteCursors