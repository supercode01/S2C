import { createSlice, PayloadAction } from '@reduxjs/toolkit'

// World-space box of the element currently selected INSIDE a Generated UI
// design. These elements aren't Redux shapes, so we keep their bounds here to
// broadcast them to other users (collaborative selection highlight).
export interface DesignSelectionBox {
    x: number
    y: number
    w: number
    h: number
}

interface PresenceState {
    designSelection: DesignSelectionBox | null
}

const initialState: PresenceState = {
    designSelection: null,
}

const presenceSlice = createSlice({
    name: 'presence',
    initialState,
    reducers: {
        setDesignSelection(state, action: PayloadAction<DesignSelectionBox | null>) {
            state.designSelection = action.payload
        },
        clearDesignSelection(state) {
            state.designSelection = null
        },
    },
})

export const { setDesignSelection, clearDesignSelection } = presenceSlice.actions
export default presenceSlice.reducer
