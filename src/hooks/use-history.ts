'use client'
import { useCallback } from 'react'
import { useStore } from 'react-redux'
import { useAppDispatch, useAppSelector } from '@/redux/store'
import { restoreShapes } from '@/redux/slice/shapes'
import { commitUndo, commitRedo } from '@/redux/slice/history'

// Per-user, command-based undo/redo. Each undo/redo applies TARGETED shape
// changes to the current (shared) state — so it only reverts/replays the local
// user's OWN work and never touches what other collaborators have done.
export const useHistory = () => {
    const dispatch = useAppDispatch()
    // Read live state from the SAME store the Provider created (the provider
    // makes a fresh store per mount), not a singleton.
    const reduxStore = useStore()
    const canUndo = useAppSelector((s: any) => (s.history?.undo?.length ?? 0) > 0)
    const canRedo = useAppSelector((s: any) => (s.history?.redo?.length ?? 0) > 0)

    const undo = useCallback(() => {
        const stack = (reduxStore.getState() as any).history?.undo ?? []
        const cmd = stack[stack.length - 1]
        if (!cmd) return
        dispatch(restoreShapes(cmd.map((c: any) => ({ id: c.id, shape: c.before }))))
        dispatch(commitUndo())
    }, [dispatch, reduxStore])

    const redo = useCallback(() => {
        const stack = (reduxStore.getState() as any).history?.redo ?? []
        const cmd = stack[stack.length - 1]
        if (!cmd) return
        dispatch(restoreShapes(cmd.map((c: any) => ({ id: c.id, shape: c.after }))))
        dispatch(commitRedo())
    }, [dispatch, reduxStore])

    return { undo, redo, canUndo, canRedo }
}
