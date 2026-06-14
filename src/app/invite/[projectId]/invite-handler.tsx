'use client'
import React, { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useConvexAuth, useMutation, useQuery } from 'convex/react'
import { Loader2 } from 'lucide-react'
import { api } from '../../../../convex/_generated/api'
import { Id } from '../../../../convex/_generated/dataModel'

const InviteHandler = ({ projectId }: { projectId: string }) => {
    const router = useRouter()
    const { isAuthenticated, isLoading } = useConvexAuth()
    const acceptInvite = useMutation(api.collaboration.acceptInvite)
    const me = useQuery(api.user.getCurrentUser)
    const ran = useRef(false)

    useEffect(() => {
        // 1. Abhi auth status load ho raha hai → ruko
        if (isLoading) return

        // 2. User logged OUT hai → sign-in par bhejo (wapas yahin aayega)
        if (!isAuthenticated) {
            const redirect = encodeURIComponent(`/invite/${projectId}`)
            router.replace(`/auth/sign-in?redirect=${redirect}`)
            return
        }

        // 3. Logged IN hai → invite accept karo (sirf ek dafa)
        if (ran.current || !me) return
        ran.current = true

        ;(async () => {
            try {
                await acceptInvite({ projectId: projectId as Id<'projects'> })
            } catch (e) {
                console.error('acceptInvite failed', e)
            } finally {
                // 4. Canvas par redirect karo
                //    (URL query-param style hai: ?project=...)
                router.replace(
                    `/dashboard/${me.name}/canvas?project=${projectId}`
                )
            }
        })()
    }, [isAuthenticated, isLoading, me, projectId, acceptInvite, router])

    // Jab tak sab ho raha hai, loader dikhao
    return (
        <div className="w-full h-screen flex flex-col items-center justify-center gap-3">
            <Loader2 className="size-6 animate-spin" />
            <p className="text-muted-foreground text-sm">Joining project...</p>
        </div>
    )
}

export default InviteHandler