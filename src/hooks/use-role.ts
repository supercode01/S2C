'use client'
import { useQuery } from 'convex/react'
import { useSearchParams } from 'next/navigation'
import { api } from '../../convex/_generated/api'
import { Id } from '../../convex/_generated/dataModel'

export const useRole = () => {
    const params = useSearchParams()
    const projectId = params.get('project')
    const valid =
        projectId && projectId !== 'null' && projectId !== 'undefined'

    const role = useQuery(
        api.projects.getMyRole,
        valid ? { projectId: projectId as Id<'projects'> } : 'skip'
    )

    return {
        role: role ?? null,
        isViewer: role === 'viewer',
        isOwner: role === 'owner',
        canEdit: role === 'owner' || role === 'editor',
    }
}