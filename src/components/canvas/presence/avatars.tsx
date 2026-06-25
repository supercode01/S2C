'use client'
import React from 'react'
import { usePresenceList } from '@/hooks/use-presence'
import { Avatar, AvatarImage } from '@/components/ui/avatar'
import { AvatarFallback } from '@radix-ui/react-avatar'

const PresenceAvatars = () => {
    const presences = usePresenceList()
    if (!presences.length) return null

    return (
        <div className="flex items-center -space-x-2">
            {presences.map((p) => (
                <div key={p.userId} title={p.name ?? 'User'}>
                    <Avatar
                        className="size-9 border-2"
                        style={{ borderColor: p.color }}
                    >
                        <AvatarImage src={p.image ?? ''} />
                        <AvatarFallback
                            className="flex items-center justify-center text-[11px] text-white"
                            style={{ background: p.color }}
                        >
                            {(p.name ?? '?').slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                </div>
            ))}
        </div>
    )
}

export default PresenceAvatars