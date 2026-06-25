import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { getAuthUserId } from '@convex-dev/auth/server'

// Sirf owner collaborators add/manage kar sakta hai
async function assertOwner(ctx: any, projectId: string, userId: string) {
    const project = await ctx.db.get(projectId)
    if (!project) throw new Error('Project not found')
    if (project.userId !== userId) throw new Error('Only the owner can manage collaborators')
    return project
}
const isValidEmail = (email: string): boolean => {
    const pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}$/
    if (!pattern.test(email)) return false
    if (email.includes('..')) return false
    if (email.length > 254) return false
    return true
}

// Email se invite bhejna
export const addCollaborator = mutation({
    args: {
        projectId: v.id('projects'),
        email: v.string(),
        role: v.union(v.literal('editor'), v.literal('viewer')),
    },
    handler: async (ctx, { projectId, email, role }) => {
        const userId = await getAuthUserId(ctx)
        if (!userId) throw new Error('Not authenticated')

        await assertOwner(ctx, projectId, userId)

        const normalizedEmail = email.trim().toLowerCase()
        if (!isValidEmail(normalizedEmail)) {
            throw new Error('Invalid email address')
        }

        // Kya yeh user pehle se registered hai?
        const existingUser = await ctx.db
            .query('users')
            .withIndex('email', (q) => q.eq('email', normalizedEmail))
            .first()

        // Owner ko khud invite na kare
        if (existingUser && existingUser._id === userId) {
            throw new Error('You are the owner of this project')
        }

        // Duplicate invite check (same project + same email)
        const existing = await ctx.db
            .query('collaborators')
            .withIndex('by_email', (q) => q.eq('email', normalizedEmail))
            .filter((q) => q.eq(q.field('projectId'), projectId))
            .first()

        if (existing) {
            // role update kar do
            await ctx.db.patch(existing._id, { role })
            return { success: true, updated: true }
        }

        await ctx.db.insert('collaborators', {
            projectId,
            userId: existingUser?._id,   
            email: normalizedEmail,
            role,
            status: 'pending',           
            invitedBy: userId,
            createdAt: Date.now(),
        })

        return { success: true, updated: false }
    },
})

// Share modal mein list dikhane ke liye
export const listCollaborators = query({
    args: { projectId: v.id('projects') },
    handler: async (ctx, { projectId }) => {
        const userId = await getAuthUserId(ctx)
        if (!userId) return []

        const collabs = await ctx.db
            .query('collaborators')
            .withIndex('by_project', (q) => q.eq('projectId', projectId))
            .collect()

        // Har collaborator ka naam/image nikaalein
        return await Promise.all(
            collabs.map(async (c) => {
                const u = c.userId ? await ctx.db.get(c.userId) : null
                return {
                    _id: c._id,
                    email: c.email,
                    role: c.role,
                    status: c.status,
                    name: u?.name ?? null,
                    image: u?.image ?? null,
                }
            })
        )
    },
})

// Invite link par aane par call hota hai
export const acceptInvite = mutation({
    args: { projectId: v.id('projects') },
    handler: async (ctx, { projectId }) => {
        const userId = await getAuthUserId(ctx)
        if (!userId) throw new Error('Not authenticated')

        const project = await ctx.db.get(projectId)
        if (!project) throw new Error('Project not found')

        // Owner ko invite ki zaroorat nahi
        if (project.userId === userId) return { success: true, role: 'owner' }

        const me = await ctx.db.get(userId)
        const myEmail = (me as any)?.email?.toLowerCase()

        // Pehle se record hai? → accepted kar do
        const existingByUser = await ctx.db
            .query('collaborators')
            .withIndex('by_project_user', (q) =>
                q.eq('projectId', projectId).eq('userId', userId)
            )
            .first()
        if (existingByUser) {
            if (existingByUser.status !== 'accepted') {
                await ctx.db.patch(existingByUser._id, { status: 'accepted' })
            }
            return { success: true, role: existingByUser.role }
        }

        // Email se pending invite dhoondo
        if (myEmail) {
            const pending = await ctx.db
                .query('collaborators')
                .withIndex('by_email', (q) => q.eq('email', myEmail))
                .filter((q) => q.eq(q.field('projectId'), projectId))
                .first()

            if (pending) {
                await ctx.db.patch(pending._id, {
                    userId,
                    status: 'accepted',
                })
                return { success: true, role: pending.role }
            }
        }

        // Koi invite nahi mila — link-based join (default: viewer).
        await ctx.db.insert('collaborators', {
            projectId,
            userId,
            email: myEmail ?? '',
            role: 'viewer',
            status: 'accepted',
            invitedBy: project.userId,
            createdAt: Date.now(),
        })
        return { success: true, role: 'viewer' }
    },
})

// Collaborator hatana (owner only)
export const removeCollaborator = mutation({
    args: { collaboratorId: v.id('collaborators') },
    handler: async (ctx, { collaboratorId }) => {
        const userId = await getAuthUserId(ctx)
        if (!userId) throw new Error('Not authenticated')

        const collab = await ctx.db.get(collaboratorId)
        if (!collab) throw new Error('Collaborator not found')

        await assertOwner(ctx, collab.projectId, userId)
        await ctx.db.delete(collaboratorId)
        return { success: true }
    },
})