import { v } from 'convex/values'
import { query } from './_generated/server'
import { getAuthUserId } from '@convex-dev/auth/server'

// It's the order how images are stored in the project document, not the order how they are uploaded
export const getInspirationImages = query({
    args: {
        projectId: v.id('projects'),
    },
    handler: async (ctx, { projectId }) => {
        const userId = await getAuthUserId(ctx)

        if (!userId) {
            return []
        }

        // Get the project and verify ownership
        const project = await ctx.db.get(projectId)
        if (!project || project.userId !== userId) {
            return []
        }

        // Get storage IDs
        const storageIds = project.inspirationImages || []

        // Generate URLs for each image
        const images = await Promise.all(
            storageIds.map(async (storageId, index) => {
                try {
                    const url = await ctx.storage.getUrl(storageId)
                    return {
                        id: `inspiration-${storageId}`, // Unique ID for client-side tracking
                        storageId,
                        url,
                        uploaded: true,
                        uploading: false,
                        index, // Preserve order
                    }
                } catch (error) {
                    console.warn(
                        `⚠️ [convex] Failed to get URL for inspirationstorage ID ${storageId}:`,
                        error
                    )
                    return null
                }
            })
        )

        // Filter out any failed URLs and sort by index
        const validImages = images
            .filter((image) => image !== null)
            .sort((a, b) => a!.index - b!.index)

        return validImages
    },
})