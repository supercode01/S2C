import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { getAuthUserId } from '@convex-dev/auth/server'

// 👇 Owner YA accepted collaborator dono ko allow karta hai.
// canEdit = true ho to viewer ko block karta hai (sirf editor/owner edit kar sakein).
async function assertCanAccessProject(
    ctx: any,
    project: any,
    userId: string,
    options?: { requireEdit?: boolean }
) {
    // Owner ko hamesha full access
    if (project.userId === userId) return 'owner'

    // Collaborator check
    const collab = await ctx.db
        .query('collaborators')
        .withIndex('by_project_user', (q: any) =>
            q.eq('projectId', project._id).eq('userId', userId)
        )
        .first()

    if (collab && collab.status === 'accepted') {
        if (options?.requireEdit && collab.role !== 'editor') {
            throw new Error('You have view-only access')
        }
        return collab.role
    }

    // Public read access (edit nahi)
    if (project.isPublic && !options?.requireEdit) return 'viewer'

    throw new Error('Access denied')
}

export const getProject = query({
    args: { projectId: v.id('projects') },
    handler: async (ctx, { projectId }) => {
        const userId = await getAuthUserId(ctx)
        if (!userId) throw new Error('Not authenticated')

        const project = await ctx.db.get(projectId)
        if (!project) throw new Error('Project not found')

        // 👇 purana check is line se replace
        await assertCanAccessProject(ctx, project, userId)

        return project
    },
})

export const createProject = mutation({
    args: {
        userId: v.id('users'),
        name: v.optional(v.string()),
        sketchesData: v.any(), // JSON structure from Redux shapes state
        thumbnail: v.optional(v.string()),
    },
    handler: async (ctx, { userId, name, sketchesData, thumbnail }) => {
        console.log('🚀 [Convex] Creating project for user:', userId)

        const projectNumber = await getNextProjectNumber(ctx, userId)
        const projectName = name || `Project ${projectNumber}`

        const projectId = await ctx.db.insert('projects', {
            userId,
            name: projectName,
            sketchesData,
            thumbnail,
            projectNumber,
            lastModified: Date.now(),
            createdAt: Date.now(),
            isPublic: false,
        })
        console.log('✅ [Convex] Project created:', {
            projectId,
            name: projectName,
            projectNumber,
        })

        return {
            projectId,
            name: projectName,
            projectNumber,
        }
    },
})

async function getNextProjectNumber(ctx: any, userId: string): Promise<number> {
    // Get or create project counter for this user
    const counter = await ctx.db
        .query('project_counters')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .withIndex('by_userId', (q: any) => q.eq('userId', userId))
        .first()

    if (!counter) {
        // Create new counter starting at 1
        await ctx.db.insert('project_counters', {
            userId,
            nextProjectNumber: 2, //Next will be 2
        })
        return 1
    }

    const projectNumber = counter.nextProjectNumber

    // Increment counter for next project
    await ctx.db.patch(counter._id, {
        nextProjectNumber: projectNumber + 1,
    })

    return projectNumber
}

export const getUserProjects = query({
    args: {
        userId: v.id('users'),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, { userId, limit = 20 }) => {
        const allProjects = await ctx.db
            .query('projects')
            .withIndex('by_userId_lastModified', (q) => q.eq('userId', userId))
            .order('desc')
            .collect()

        const projects = allProjects.slice(0, limit)

        return projects.map((project) => ({
            _id: project._id,
            name: project.name,
            projectNumber: project.projectNumber,
            thumbnail: project.thumbnail,
            lastModified: project.lastModified,
            createdAt: project.createdAt,
            isPublic: project.isPublic,
        }))

    },
})

export const getProjectStyleGuide = query({
    args: { projectId: v.id('projects') },
    handler: async (ctx, { projectId }) => {
        const userId = await getAuthUserId(ctx)
        if (!userId) throw new Error('Not authenticated')

        const project = await ctx.db.get(projectId)
        if (!project) throw new Error('Project not found')
        await assertCanAccessProject(ctx, project, userId)   // 👈 This line

        // Check ownership or public access
        if (project.userId !== userId && !project.isPublic) {
            throw new Error('Access denied')
        }

        // Return parsed style guide data or null
        try {
            return project.styleGuide ? JSON.parse(project.styleGuide) : null
        }
        catch (error) {
            console.error('Error parsing style guide for project', projectId, error)
            return null
        }
    },
})

export const updateProjectSketches = mutation({
    args: {
        projectId: v.id('projects'),
        sketchesData: v.any(),
        viewportData: v.optional(v.any()),
    },
    handler: async (ctx, { projectId, sketchesData, viewportData }) => {
        const userId = await getAuthUserId(ctx)              // 👈 add
        if (!userId) throw new Error('Not authenticated')    // 👈 add
        const project = await ctx.db.get(projectId)
        if (!project) throw new Error('Project not found')
        await assertCanAccessProject(ctx, project, userId, { requireEdit: true }) // 👈 add

        // Safety guard: prevent saving empty shapes over existing data
        const incomingIds = sketchesData?.shapes?.ids
        const existingIds = project.sketchesData?.shapes?.ids
        const incomingEmpty = !incomingIds || incomingIds.length === 0
        const existingHasData = existingIds && existingIds.length > 0

        if (incomingEmpty && existingHasData) {
            console.warn('⚠️ [Convex] Blocked autosave: incoming data has 0 shapes but existing project has', existingIds.length, 'shapes. Skipping to prevent data loss.')
            return { success: false, reason: 'empty_save_blocked' }
        }

        // Backup existing data before overwrite
        const updateData: any = {
            sketchesData,
            lastModified: Date.now(),
            previousSketchesData: project.sketchesData,
        }

        if (viewportData) {
            updateData.viewportData = viewportData
        }

        await ctx.db.patch(projectId, updateData)
        console.log('✅ [Convex] Project auto-saved successfully')
        return { success: true }
    },
})

export const updateProjectStyleGuide = mutation({
    args: {
        projectId: v.id('projects'),
        styleGuideData: v.any(), // JSON structure for AI-generated style guide
    },
    handler: async (ctx, { projectId, styleGuideData }) => {
        console.log('🎨 [Convex] Updating project style guide:', projectId)
        const userId = await getAuthUserId(ctx)
        if (!userId) throw new Error('Not authenticated')

        const project = await ctx.db.get(projectId)
        if (!project) throw new Error('Project not found')
        await assertCanAccessProject(ctx, project, userId, { requireEdit: true })    
        await ctx.db.patch(projectId, {
            styleGuide: JSON.stringify(styleGuideData), // Store as JSON string
            lastModified: Date.now(),
        })

        console.log('✅ [Convex] Project style guide updated successfully')
        return { success: true, styleGuide: styleGuideData }
    },
})

export const getMyRole = query({
    args: { projectId: v.id('projects') },
    handler: async (ctx, { projectId }) => {
        const userId = await getAuthUserId(ctx)
        if (!userId) return null

        const project = await ctx.db.get(projectId)
        if (!project) return null

        if (project.userId === userId) return 'owner'

        const collab = await ctx.db
            .query('collaborators')
            .withIndex('by_project_user', (q) =>
                q.eq('projectId', projectId).eq('userId', userId)
            )
            .first()

        if (collab && collab.status === 'accepted') return collab.role
        if (project.isPublic) return 'viewer'
        return null
    },
})

// Rename a project — SIRF owner (jis ne project banaya) hi rename kar sakta hai
export const renameProject = mutation({
    args: {
        projectId: v.id('projects'),
        name: v.string(),
    },
    handler: async (ctx, { projectId, name }) => {
        const userId = await getAuthUserId(ctx)
        if (!userId) throw new Error('Not authenticated')

        const project = await ctx.db.get(projectId)
        if (!project) throw new Error('Project not found')

        // Ownership check — collaborators/viewers rename nahi kar sakte
        if (project.userId !== userId) {
            throw new Error('Only the project owner can rename this project')
        }

        const trimmed = name.trim()
        if (!trimmed) throw new Error('Project name cannot be empty')

        await ctx.db.patch(projectId, {
            name: trimmed,
            lastModified: Date.now(),
        })

        console.log('✏️ [Convex] Project renamed:', { projectId, name: trimmed })
        return { success: true, name: trimmed }
    },
})

// Delete a project — SIRF owner hi delete kar sakta hai. Related collaborators
// bhi clean up ho jate hain taake orphan rows na rahein.
export const deleteProject = mutation({
    args: {
        projectId: v.id('projects'),
    },
    handler: async (ctx, { projectId }) => {
        const userId = await getAuthUserId(ctx)
        if (!userId) throw new Error('Not authenticated')

        const project = await ctx.db.get(projectId)
        if (!project) throw new Error('Project not found')

        // Ownership check — sirf project banane wala hi delete kar sakta hai
        if (project.userId !== userId) {
            throw new Error('Only the project owner can delete this project')
        }

        // Is project ke saare collaborators hata do
        const collaborators = await ctx.db
            .query('collaborators')
            .withIndex('by_project', (q) => q.eq('projectId', projectId))
            .collect()
        for (const collab of collaborators) {
            await ctx.db.delete(collab._id)
        }

        await ctx.db.delete(projectId)

        console.log('🗑️ [Convex] Project deleted:', projectId)
        return { success: true }
    },
})

// Restore project data from backup (previousSketchesData)
export const restoreProjectFromBackup = mutation({
    args: {
        projectId: v.id('projects'),
    },
    handler: async (ctx, { projectId }) => {
        const userId = await getAuthUserId(ctx)
        if (!userId) throw new Error('Not authenticated')

        const project = await ctx.db.get(projectId)
        if (!project) throw new Error('Project not found')
        if (project.userId !== userId) throw new Error('Access denied')

        if (!project.previousSketchesData) {
            throw new Error('No backup data available to restore')
        }

        // Swap: current becomes backup, backup becomes current
        await ctx.db.patch(projectId, {
            sketchesData: project.previousSketchesData,
            previousSketchesData: project.sketchesData,
            lastModified: Date.now(),
        })

        console.log('🔄 [Convex] Project restored from backup successfully')
        return { success: true }
    },
})