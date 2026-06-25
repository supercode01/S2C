import type { Middleware } from '@reduxjs/toolkit'
import { pushHistory, clearHistory, type ShapeChange } from '../slice/history'
import type { Shape } from '../slice/shapes'

// Committed user changes worth recording as ONE undo step. Intermediate
// `updateShape` (live drag/resize) is NOT here — the move is captured once at
// `commitShapeUpdate`.
const RECORDED = new Set([
    'shapes/addRect',
    'shapes/addFrame',
    'shapes/addEllipse',
    'shapes/addLine',
    'shapes/addArrow',
    'shapes/addText',
    'shapes/addImage',
    'shapes/addFreeDrawShape',
    'shapes/addGeneratedUI',
    'shapes/removeShape',
    'shapes/deleteSelected',
    'shapes/clearAll',
    'shapes/commitShapeUpdate',
])

// Changes from somewhere OTHER than the local user's own committed action
// (remote sync, our own undo/redo restore). Baseline follows them but they
// create no undo step.
const SYNC_BASELINE = new Set([
    'shapes/applyRemoteShapes',
    'shapes/mergeRemoteShapes',
    'shapes/restoreShapes',
])

type Entities = Record<string, Shape | undefined>

let baseline: Entities = {}

const getEntities = (state: any): Entities =>
    (state?.shapes?.present?.shapes?.entities ?? {}) as Entities

// generated-UI content edits persist via updateShape({ uiSpecData }). Treat
// those as one undo step too (they're discrete, debounced commits).
const isUiSpecEdit = (action: any) =>
    action?.type === 'shapes/updateShape' &&
    action?.payload?.patch &&
    Object.prototype.hasOwnProperty.call(action.payload.patch, 'uiSpecData')

export const historyMiddleware: Middleware = (store) => (next) => (action: any) => {
    const result = next(action)

    const type: string | undefined = action?.type
    if (!type || typeof type !== 'string' || !type.startsWith('shapes/')) {
        return result
    }

    const cur = getEntities(store.getState())

    if (type === 'shapes/loadProject') {
        baseline = { ...cur }
        store.dispatch(clearHistory())
        return result
    }

    if (RECORDED.has(type) || isUiSpecEdit(action)) {
        const changes: ShapeChange[] = []
        const ids = new Set([...Object.keys(baseline), ...Object.keys(cur)])
        ids.forEach((id) => {
            if (baseline[id] !== cur[id]) {
                changes.push({
                    id,
                    before: (baseline[id] ?? null) as Shape | null,
                    after: (cur[id] ?? null) as Shape | null,
                })
            }
        })
        baseline = { ...cur }
        if (changes.length) store.dispatch(pushHistory(changes))
    } else if (SYNC_BASELINE.has(type)) {
        baseline = { ...cur }
    }
    // updateShape (intermediate drag) + selection/tool leave baseline untouched
    // so a drag is captured as ONE step at commit time.

    return result
}
