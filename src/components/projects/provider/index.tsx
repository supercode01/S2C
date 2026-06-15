'use client'
import { restoreViewport } from '@/redux/slice/viewport'
import { useAppDispatch } from '@/redux/store'
import { useQuery } from 'convex/react'
import { useSearchParams } from 'next/navigation'
import { ActionCreators } from 'redux-undo'
import React, { useEffect, useRef } from 'react'
import { api } from '../../../../convex/_generated/api'
import { Id } from '../../../../convex/_generated/dataModel'
import { loadProject, applyRemoteShapes } from '@/redux/slice/shapes'
import { isLocalEcho, sketchSignature } from '@/lib/local-echo'

type Props = { children: React.ReactNode; initialProject: any }

const ProjectProvider = ({ children, initialProject }: Props) => {
    const dispatch = useAppDispatch()
    const params = useSearchParams()
    const projectId = params.get('project')

    const isValid =
        projectId && projectId !== 'null' && projectId !== 'undefined'

    // 👇 LIVE subscription — DB badle to yeh khud update ho jayega
    const liveProject = useQuery(
        api.projects.getProject,
        isValid ? { projectId: projectId as Id<'projects'> } : 'skip'
    )

    const lastAppliedRef = useRef<string>('')

    // Pehli dafa server-preloaded data load karo (turant render ke liye)
    useEffect(() => {
        if (!initialProject?._valueJSON) return

        try {
            const projectData =
                typeof initialProject._valueJSON === 'string'
                    ? JSON.parse(initialProject._valueJSON)
                    : initialProject._valueJSON

            if (projectData?.sketchesData) {
                // Sketches data Redux mein load karo
                dispatch(loadProject(projectData.sketchesData))

                // Undo history clear karo taake user blank canvas tak undo na kar sake
                dispatch(ActionCreators.clearHistory())

                // Viewport restore karo (agar mojood ho)
                if (projectData.viewportData) {
                    dispatch(restoreViewport(projectData.viewportData))
                }

                // Live-update dedup ke liye yaad rakho
                lastAppliedRef.current = JSON.stringify(projectData.sketchesData)
            }
        } catch (e) {
            console.error('Failed to parse project data:', e)
        }
    }, [dispatch, initialProject])

    // Phir live updates apply karo (dusre user ke changes)
    useEffect(() => {
        if (!liveProject?.sketchesData) return
        const incoming = JSON.stringify(liveProject.sketchesData)

        // Agar same hai (apna hi save), to skip — warna loop banega
        if (incoming === lastAppliedRef.current) return

        // Agar yeh state local user ne khud save ki thi (autosave ka echo), to
        // present par dobara apply MAT karo — warna undo ke baad shape wapas aa
        // jaati hai aur undo/redo history desync ho jaati hai. Sirf doosre users
        // ke genuine changes apply hote hain.
        const incomingSig = sketchSignature(
            liveProject.sketchesData.shapes,
            liveProject.sketchesData.frameCounter
        )
        if (isLocalEcho(incomingSig)) {
            lastAppliedRef.current = incoming
            return
        }

        lastAppliedRef.current = incoming
        dispatch(
            applyRemoteShapes({
                shapes: liveProject.sketchesData.shapes,
                frameCounter: liveProject.sketchesData.frameCounter,
            })
        )
    }, [liveProject, dispatch])

    return <>{children}</>
}

export default ProjectProvider