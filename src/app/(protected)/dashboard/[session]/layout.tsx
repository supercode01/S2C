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
    if (!entitlement._valueJSON) {
        //TODO: Remove billing hardcoded path
        redirect('/dashboard/${combinedSlug(profileName!)}')
    }

    return (
        <div className="grid grid-cols-1">
            <Navbar />
            {children}
        </div>

    )
}
export default Layout