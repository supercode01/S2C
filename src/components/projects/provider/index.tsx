'use client'
import { loadProject } from '@/redux/slice/shapes';
import { restoreViewport } from '@/redux/slice/viewport';
import { useAppDispatch } from '@/redux/store'
import React, { useEffect } from 'react'

type Props = { children: React.ReactNode; initialProject: any }

const ProjectProvider = ({ children, initialProject }: Props) => {
    const dispatch = useAppDispatch()
    useEffect(() => {
        if (!initialProject?._valueJSON) return;
        
        try {
            const projectData = typeof initialProject._valueJSON === 'string' 
                ? JSON.parse(initialProject._valueJSON) 
                : initialProject._valueJSON;

            if (projectData?.sketchesData) {
                // Load the sketches data into the shapes Redux state
                dispatch(loadProject(projectData.sketchesData))

                // Restore viewport position if available
                if (projectData.viewportData) {
                    dispatch(restoreViewport(projectData.viewportData))
                }
            }
        } catch (e) {
            console.error('Failed to parse project data:', e);
        }
    }, [dispatch, initialProject])

return <>{children}</>
}
export default ProjectProvider

