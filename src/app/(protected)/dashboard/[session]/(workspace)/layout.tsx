import { SubscriptionEntitlementQuery } from '@/convex/query.config'
import { combinedSlug } from '@/lib/utils'
import { redirect } from 'next/navigation'
import React from 'react'
import Navbar from '@/components/navbar'

type Props = {
    children: React.ReactNode
}

const Layout = async ({ children }: Props) => {
    const { profileName, entitlement } = await SubscriptionEntitlementQuery()
    
    const slug = combinedSlug(profileName ?? '')
    if (!entitlement?._valueJSON) {
        redirect(`/billing/${slug}`)
    }

    return (
        <div className="grid grid-cols-1">
            <Navbar />
            {children}
        </div>

    )
}
export default Layout