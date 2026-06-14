'use client'
import { useMutation } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { Id } from '../../../../convex/_generated/dataModel'
import { useAppSelector } from '@/redux/store'
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import React, { useEffect, useRef, useState } from 'react'
import { useRole } from '@/hooks/use-role'

const Autosave = () => {
    const searchParams = useSearchParams()
    const projectId = searchParams.get('project')
    const user = useAppSelector((state) => state.profile)
    const shapesState = useAppSelector((state) => state.shapes)
    const viewportState = useAppSelector((state) => state.viewport)

    const { canEdit } = useRole()   // 👈 YEH LINE MISSING THI

    const updateSketches = useMutation(api.projects.updateProjectSketches)

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const lastSavedRef = useRef<string>('')

    const [saveStatus, setSaveStatus] = useState<
        'idle' | 'saving' | 'saved' | 'error'
    >('idle')

    const isReady = Boolean(projectId && user?.id && canEdit)

    useEffect(() => {
        if (!isReady) return
        const stateString = JSON.stringify({
            shapes: shapesState.shapes,
            frameCounter: shapesState.frameCounter,
            viewport: viewportState,
        })
        if (stateString === lastSavedRef.current) return

        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(async () => {
            lastSavedRef.current = stateString
            setSaveStatus('saving')
            try {
                await updateSketches({
                    projectId: projectId as Id<'projects'>,
                    // 👇 selection/tool save NAHI karte (personal hain)
                    sketchesData: {
                        shapes: shapesState.shapes,
                        tool: 'select',
                        selected: {},
                        frameCounter: shapesState.frameCounter,
                    },
                    viewportData: {
                        scale: viewportState.scale,
                        translate: viewportState.translate,
                    },
                })
                setSaveStatus('saved')
                setTimeout(() => setSaveStatus('idle'), 2000)
            } catch {
                setSaveStatus('error')
                setTimeout(() => setSaveStatus('idle'), 3000)
            }
        }, 600)

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current)
        }
    }, [isReady, shapesState, viewportState, updateSketches, projectId, user?.id])

    if (!isReady) return null
    if (saveStatus === 'saving')
        return <Loader2 className="w-4 h-4 animate-spin" />
    if (saveStatus === 'saved') return <CheckCircle className="w-4 h-4" />
    if (saveStatus === 'error') return <AlertCircle className="w-4 h-4" />
    return null
}

export default Autosave