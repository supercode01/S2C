import { fetchMutation, fetchQuery } from 'convex/nextjs'
import { api } from '../../convex/_generated/api'
import { inngest } from './client'
import { Inngest } from 'inngest'
import { extractOrderLike, extractSubscriptionLike, isPolarWebhookEvent, PolarOrder, PolarSubscription, ReceivedEvent } from '@/types/polar'
import { Id } from '../../convex/_generated/dataModel'
import { metadata } from '@/app/layout'
import { toMs } from '../../convex/user'


export const autosaveProjectWorkflow = inngest.createFunction(
    { id: 'autosave-project-workflow' },
    { event: 'project/autosave.requested' },
    async ({ event }) => {
        const { projectId, shapesData, viewportData } = event.data
        try {
            await fetchMutation(api.projects.updateProjectSketches, {
                projectId,
                sketchesData: shapesData,
                viewportData,
            })
            return { success: true }
        } catch (error) {
            throw error
        }
    }
)

// Polar Events
export const handlePolarEvent = inngest.createFunction(
    { id: 'polar-webhook-handler' },
    { event: 'polar/webhook.received' },
    async ({ event, step }) => {
        console.log('[Inngest] Starting Polar webhook handler')
        console.log(
            '[Inngest] Raw event data:',
            JSON.stringify(event.data, null, 2)
        )
        if (!isPolarWebhookEvent(event.data)) {
            return
        }

        const incoming = event.data as ReceivedEvent
        const type = incoming.type
        const dataUnknown = incoming.data

        const sub: PolarSubscription | null = extractSubscriptionLike(dataUnknown)
        const order: PolarOrder | null = extractOrderLike(dataUnknown)

        if (!sub && !order) {
            return
        }

        const userId: Id<'users'> | null = await step.run(
            'resolve-user',
            async () => {
                const metaUserId =
                    (sub?.metadata?.userId as string | undefined) ??
                    (order?.metadata?.userId as string | undefined)

                if (metaUserId) {
                    console.log('[Inngest] Using metadata userId: ', metaUserId)
                    return metaUserId as unknown as Id<'users'>
                }

                const email = sub?.customer?.email ?? order?.customer?.email ?? null
                console.log('[Inngest] Customer email:', email)
                if (email) {
                    try {
                        console.log('[Inngest] Looking up user by email:', email)
                        const foundUserId = await fetchQuery(api.user.getUserIdByEmail, {
                            email,
                        })

                        console.log('✅[Inngest] Found user ID by email:', foundUserId)
                        return foundUserId
                    }
                    catch (error) {
                        console.error('❌[Inngest] Failed to resolve user by email: ', error)
                        console.error('❌ [Inngest] Email lookup failed for:', email)
                        return null
                    }
                }

                console.log('❌ [Inngest] No email found to lookup user')
                return null
            }
        )

        console.log('[Inngest] Resolved user ID:', userId)
        if (!userId) {
            console.log('❌ [Inngest] No user ID resolved, skipping webhook processing')
            return
        }

        const polarSubscriptionId = sub?.id ?? order?.subscription_id ?? ''
        console.log('[Inngest] Polar subscription ID:', polarSubscriptionId)
        if (!polarSubscriptionId) {
            console.log('❌ [Inngest] No polar subscription ID found, skipping')
            return
        }
        const currentPeriodEnd = toMs(sub?.current_period_end)

        const payload = {
            userId,
            polarCustomerId:
                sub?.customer?.id ?? sub?.customer_id ?? order?.customer_id ?? '',
            polarSubscriptionId,
            productId: sub?.product_id ?? sub?.product?.id ?? undefined,
            priceId: sub?.prices?.[0]?.id ?? undefined,
            planCode: sub?.plan_code ?? sub?.product?.name ?? undefined,
            status: sub?.status ?? 'updated',
            currentPeriodEnd,
            trialEndsAt: toMs(sub?.trial_ends_at),
            cancelAt: toMs(sub?.cancel_at),
            canceledAt: toMs(sub?.canceled_at),
            seats: sub?.seats ?? undefined,
            metadata: dataUnknown, // Keep as any to match Convex schema
            creditsGrantPerPeriod: 10,
            creditsRolloverLimit: 100,
        }

        console.log(
            '[Inngest] Subscription payload:',
            JSON.stringify(payload, null, 2)
        )

        const subscriptionId = await step.run('upsert-subscription', async () => {
            try {
                console.log('[Inngest] Upserting subscription to Convex...')
                console.log('[Inngest] Checking for existing subscriptions first...')

                const existingByPolar = await fetchQuery(
                    api.subscription.getByPolarId,
                    {
                        polarSubscriptionId: payload.polarSubscriptionId,
                    }
                )

                console.log(
                    '[Inngest] Existing subscription by Polar ID:',
                    existingByPolar ? 'Found' : 'None'
                )

                const existingByUser = await fetchQuery(
                    api.subscription.getSubscriptionForUser,
                    {
                        userId: payload.userId,
                    }
                )

                console.log(
                    '[Inngest] Existing subscription by Polar ID:',
                    existingByPolar ? 'Found' : 'None'
                )

                if (
                    existingByPolar &&
                    existingByUser &&
                    existingByPolar._id !== existingByUser._id
                ) {
                    console.warn('⚠️ [Inngest] DUPLICATE DETECTED: User has different subscription by Polar ID vs User ID!')

                    console.warn('By Polar ID', existingByPolar?._id)
                    console.warn('By User ID', existingByUser?._id)
                }

                const result = await fetchMutation(
                    api.subscription.upsertFromPolar,
                    payload
                )
            }
            catch (error) {
                console.error('❌ [Inngest] Error occurred while fetching existing subscriptions:', error)
            }
        })
    }
)