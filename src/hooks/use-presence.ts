'use client'
import { useEffect } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { useSearchParams } from 'next/navigation'
import { api } from '../../convex/_generated/api'
import { Id } from '../../convex/_generated/dataModel'
import { useAppSelector } from '@/redux/store'
import { useCallback, useRef } from 'react' 

// Figma-jaise colors — har user ko deterministic color milta hai
const COLORS = [
    '#F24E1E', '#A259FF', '#1ABCFE', '#0ACF83',
    '#FF7262', '#FFC700', '#FF24BD', '#00B5D8',
]
export const colorFromId = (id: string) =>
    COLORS[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length]

const useProjectId = () => {
    const params = useSearchParams()
    const projectId = params.get('project')
    const isValid =
        projectId && projectId !== 'null' && projectId !== 'undefined'
    return isValid ? (projectId as string) : null
}

// Apni presence bhejta hai (selection change par + har 4s)
export const useSendPresence = () => {
    const projectId = useProjectId()
    const me = useAppSelector((s) => s.profile)
    const selected = useAppSelector((s) => s.shapes.present.selected)
    const heartbeat = useMutation(api.presence.heartbeat)
    const leave = useMutation(api.presence.leave)

    const ready = Boolean(projectId && me?.id)
    const selectedIds = Object.keys(selected)
    const key = selectedIds.join(',') // selection badle to effect dobara chale

    useEffect(() => {
        if (!ready) return
        const send = () =>
            heartbeat({
                projectId: projectId as Id<'projects'>,
                selectedIds,
                color: colorFromId(me.id as string),
            }).catch(() => {})

        send()
        const t = setInterval(send, 4000)

        return () => {
            clearInterval(t)
            leave({ projectId: projectId as Id<'projects'> }).catch(() => {})
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ready, key, projectId, me?.id])
}

// Active users ki list padhta hai (read-only)
export const usePresenceList = () => {
    const projectId = useProjectId()
    const presences = useQuery(
        api.presence.list,
        projectId ? { projectId: projectId as Id<'projects'> } : 'skip'
    )
    return presences ?? []
}
// Cursor ko throttle karke bhejta hai (har ~60ms)
export const useCursorBroadcast = () => {
    const projectId = useProjectId()
    const me = useAppSelector((s) => s.profile)
    const cursor = useMutation(api.presence.cursor)
    const lastRef = useRef(0)

    return useCallback(
        (world: { x: number; y: number }) => {
            if (!projectId || !me?.id) return
            const now = performance.now()
            if (now - lastRef.current < 60) return // throttle
            lastRef.current = now
            cursor({
                projectId: projectId as Id<'projects'>,
                x: world.x,
                y: world.y,
                color: colorFromId(me.id as string),
            }).catch(() => {})
        },
        [projectId, me?.id, cursor]
    )
}