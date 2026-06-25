'use client'
import { useCallback } from 'react'
import { useStore } from 'react-redux'
import { useAppDispatch, useAppSelector } from '@/redux/store'
import { restoreShapes } from '@/redux/slice/shapes'
import { commitUndo, commitRedo } from '@/redux/slice/history'

// Per-user, command-based undo/redo. Each undo/redo applies TARGETED shape
// changes to the current (shared) state — so it only reverts/replays the local
// user's OWN work and never touches what other collaborators have done.

// Deep-ish equality between two shape snapshots (handles null + new object refs
// that arrive from remote sync).
const sameShape = (a: unknown, b: unknown): boolean => {
    if (a === b) return true
    if (a == null || b == null) return a == null && b == null
    return JSON.stringify(a) === JSON.stringify(b)
}

export const useHistory = () => {
    const dispatch = useAppDispatch()
    // Read live state from the SAME store the Provider created (the provider
    // makes a fresh store per mount), not a singleton.
    const reduxStore = useStore()
    const canUndo = useAppSelector((s: any) => (s.history?.undo?.length ?? 0) > 0)
    const canRedo = useAppSelector((s: any) => (s.history?.redo?.length ?? 0) > 0)

    const undo = useCallback(() => {
        const state = reduxStore.getState() as any
        const stack = state.history?.undo ?? []
        const cmd = stack[stack.length - 1]
        if (!cmd) return
        const entities = state.shapes?.present?.shapes?.entities ?? {}
        // CONFLICT-AWARE: only revert a shape if its CURRENT state still matches
        // what this command produced (`after`). If a collaborator has since
        // changed or deleted that shape, skip it — so our undo never resurrects
        // or overwrites someone else's work.
        const toRestore = cmd
            .filter((c: any) => sameShape(entities[c.id] ?? null, c.after))
            .map((c: any) => ({ id: c.id, shape: c.before }))
        if (toRestore.length) dispatch(restoreShapes(toRestore))
        dispatch(commitUndo())
    }, [dispatch, reduxStore])

    const redo = useCallback(() => {
        const state = reduxStore.getState() as any
        const stack = state.history?.redo ?? []
        const cmd = stack[stack.length - 1]
        if (!cmd) return
        const entities = state.shapes?.present?.shapes?.entities ?? {}
        // CONFLICT-AWARE: only re-apply if the shape is still in the pre-action
        // state (`before`); otherwise a collaborator owns it now — skip it.
        const toApply = cmd
            .filter((c: any) => sameShape(entities[c.id] ?? null, c.before))
            .map((c: any) => ({ id: c.id, shape: c.after }))
        if (toApply.length) dispatch(restoreShapes(toApply))
        dispatch(commitRedo())
    }, [dispatch, reduxStore])

    return { undo, redo, canUndo, canRedo }
}
