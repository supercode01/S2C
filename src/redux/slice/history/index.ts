import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { Shape } from '../shapes'

// One change to a single shape (full snapshots; null = didn't / shouldn't exist).
export interface ShapeChange {
    id: string
    before: Shape | null
    after: Shape | null
}

// A command = all shape changes produced by ONE user action.
export type Command = ShapeChange[]

interface HistoryState {
    undo: Command[]
    redo: Command[]
}

const LIMIT = 100
const initialState: HistoryState = { undo: [], redo: [] }

const historySlice = createSlice({
    name: 'history',
    initialState,
    reducers: {
        pushHistory(state, action: PayloadAction<Command>) {
            state.undo.push(action.payload)
            if (state.undo.length > LIMIT) state.undo.shift()
            state.redo = [] // a fresh action clears the redo stack
        },
        commitUndo(state) {
            const cmd = state.undo.pop()
            if (cmd) state.redo.push(cmd)
        },
        commitRedo(state) {
            const cmd = state.redo.pop()
            if (cmd) state.undo.push(cmd)
        },
        clearHistory(state) {
            state.undo = []
            state.redo = []
        },
    },
})

export const { pushHistory, commitUndo, commitRedo, clearHistory } =
    historySlice.actions
export default historySlice.reducer
