'use client'
import { useMutation } from 'convex/react'
import { api } from '../../../../convex/_generated/api'
import { Id } from '../../../../convex/_generated/dataModel'
import { useAppSelector } from '@/redux/store'
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import React, { useEffect, useRef, useState } from 'react'
import { useRole } from '@/hooks/use-role'
import { rememberLocalWrite, sketchSignature } from '@/lib/local-echo'

const Autosave = () => {
    const searchParams = useSearchParams()
    const projectId = searchParams.get('project')
    const user = useAppSelector((state) => state.profile)
    const shapesState = useAppSelector((state) => state.shapes.present)
    const viewportState = useAppSelector((state) => state.viewport)

    const { canEdit } = useRole()   // 👈 YEH LINE MISSING THI

    const updateSketches = useMutation(api.projects.updateProjectSketches)

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const lastSavedRef = useRef<string>('')

    const [saveStatus, setSaveStatus] = useState<
        'idle' | 'saving' | 'saved' | 'error'
    >('idle')

    const isReady = Boolean(projectId && user?.id && canEdit)

    // Guard: Don't autosave until project data has been loaded into Redux
    // This prevents the race condition where autosave fires with empty initial state
    // before ProjectProvider's loadProject dispatch has completed
    const projectLoaded = useRef(false)
    const shapesIds = shapesState?.shapes?.ids
    useEffect(() => {
        if (shapesIds && shapesIds.length > 0) {
            projectLoaded.current = true
        }
    }, [shapesIds])

    useEffect(() => {
        if (!isReady || !projectLoaded.current) return
        const stateString = JSON.stringify({
            shapes: shapesState.shapes,
            frameCounter: shapesState.frameCounter,
            viewport: viewportState,
        })
        if (stateString === lastSavedRef.current) return

        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(async () => {
            lastSavedRef.current = stateString
            // Apne is write ki signature yaad rakho taake live-subscription se
            // aaya iska echo dobara store par apply na ho (undo/redo bachao).
            rememberLocalWrite(
                sketchSignature(shapesState.shapes, shapesState.frameCounter)
            )
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
        }, 350)

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