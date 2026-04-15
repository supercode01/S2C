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

    // 1. if (!entitlement._valueJSON) {
    //     //TODO: Remove billing hardcoded path
    //     redirect(`/dashboard/${combinedSlug(profileName!)}`)
    // }

    // 2. add when billing logic is added also add hass access in SubscriptionEntitlementQuery and uncomment below code and query.config.ts code also call "hasAccess" in "dashboard/page.tsx" if needed
    // if (!hasAccess) {
    //     redirect(`/billing`)
    // }

    return (
        <div className="grid grid-cols-1">
            <Navbar />
            {children}
        </div>

    )
}
export default Layout