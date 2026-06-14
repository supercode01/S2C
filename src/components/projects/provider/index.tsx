'use client'
import { restoreViewport } from '@/redux/slice/viewport'
import { useAppDispatch } from '@/redux/store'
import { useQuery } from 'convex/react'
import { useSearchParams } from 'next/navigation'
import React, { useEffect, useRef } from 'react'
import { api } from '../../../../convex/_generated/api'
import { Id } from '../../../../convex/_generated/dataModel'
import { loadProject, applyRemoteShapes } from '@/redux/slice/shapes'

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
        const data = initialProject?._valueJSON
        if (data?.sketchesData) {
            dispatch(loadProject(data.sketchesData))
            if (data.viewportData) dispatch(restoreViewport(data.viewportData))
            lastAppliedRef.current = JSON.stringify(data.sketchesData)
        }
    }, [dispatch, initialProject])

    // Phir live updates apply karo (dusre user ke changes)
    useEffect(() => {
        if (!liveProject?.sketchesData) return
        const incoming = JSON.stringify(liveProject.sketchesData)

        // Agar same hai (apna hi save), to skip — warna loop banega
        if (incoming === lastAppliedRef.current) return

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