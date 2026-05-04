import { inngest } from './client'

export const testFun = inngest.createFunction(
    { id: 'autosave-project-workflow' },
    { event: 'project/autosave.requested' },
    async ({ event }) => {
        console.log('[Inngest] Project autosave requested:', event)
    }
)