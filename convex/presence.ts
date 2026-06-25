import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { getAuthUserId } from '@convex-dev/auth/server'

const STALE_MS = 10000 // 10s tak na bole to "offline" maan lo

// User apni presence (selection + alive) update karta hai
export const heartbeat = mutation({
    args: {
        projectId: v.id('projects'),
        selectedIds: v.array(v.string()),
        color: v.string(),
    },
    handler: async (ctx, { projectId, selectedIds, color }) => {
        const userId = await getAuthUserId(ctx)
        if (!userId) return

        const user = await ctx.db.get(userId)

        const existing = await ctx.db
            .query('presence')
            .withIndex('by_project_user', (q) =>
                q.eq('projectId', projectId).eq('userId', userId)
            )
            .first()

        const data = {
            projectId,
            userId,
            name: user?.name,
            image: (user as any)?.image,
            color,
            selectedIds,
            lastSeen: Date.now(),
        }

        if (existing) await ctx.db.patch(existing._id, data)
        else await ctx.db.insert('presence', data)
    },
})

// Active users ki list (jo recently alive the)
export const list = query({
    args: { projectId: v.id('projects') },
    handler: async (ctx, { projectId }) => {
        const all = await ctx.db
            .query('presence')
            .withIndex('by_project', (q) => q.eq('projectId', projectId))
            .collect()

        const cutoff = Date.now() - STALE_MS
        return all
            .filter((p) => p.lastSeen > cutoff)
            .map((p) => ({
                userId: p.userId,
                name: p.name ?? null,
                image: p.image ?? null,
                color: p.color,
                cursor: p.cursor ?? null,
                selectedIds: p.selectedIds,
            }))
    },
})

// (Optional) project chhodne par presence hatao
export const leave = mutation({
    args: { projectId: v.id('projects') },
    handler: async (ctx, { projectId }) => {
        const userId = await getAuthUserId(ctx)
        if (!userId) return
        const existing = await ctx.db
            .query('presence')
            .withIndex('by_project_user', (q) =>
                q.eq('projectId', projectId).eq('userId', userId)
            )
            .first()
        if (existing) await ctx.db.delete(existing._id)
    },
})

// Sirf cursor position update (heartbeat se halka, frequent)
export const cursor = mutation({
    args: {
        projectId: v.id('projects'),
        x: v.number(),
        y: v.number(),
        color: v.string(),
    },
    handler: async (ctx, { projectId, x, y, color }) => {
        const userId = await getAuthUserId(ctx)
        if (!userId) return

        const existing = await ctx.db
            .query('presence')
            .withIndex('by_project_user', (q) =>
                q.eq('projectId', projectId).eq('userId', userId)
            )
            .first()

        if (existing) {
            await ctx.db.patch(existing._id, {
                cursor: { x, y },
                lastSeen: Date.now(),
            })
        } else {
            const user = await ctx.db.get(userId)
            await ctx.db.insert('presence', {
                projectId,
                userId,
                name: user?.name,
                image: (user as any)?.image,
                color,
                selectedIds: [],
                cursor: { x, y },
                lastSeen: Date.now(),
            })
        }
    },
})