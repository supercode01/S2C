import React from 'react'
import InviteHandler from './invite-handler'

interface InvitePageProps {
    params: Promise<{ projectId: string }>
}

const InvitePage = async ({ params }: InvitePageProps) => {
    const { projectId } = await params
    return <InviteHandler projectId={projectId} />
}

export default InvitePage