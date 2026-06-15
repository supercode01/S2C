import { Reducer } from "@reduxjs/toolkit";
import profile from "./profile";
import projects from "./projects";
import shapesReducer from "./shapes";
import viewport from "./viewport";
import undoable, { excludeAction } from "redux-undo";
import chat from './chat'

// Wrap shapes reducer with undoable to enable undo/redo
// excludeAction: these actions will NOT create history entries.
// NOTE: loadProject must NOT be set as `clearHistoryType`. redux-undo
// intercepts the clearHistoryType action and only resets history WITHOUT
// running the inner reducer, so loadProject would never actually load the
// data into `present` (canvas stays empty on refresh). Instead loadProject
// is excluded from history here, and the undo history is cleared explicitly
// via ActionCreators.clearHistory() right after loading in ProjectProvider.
const shapes = undoable(shapesReducer, {
    limit: 50, // max 50 history entries
    filter: excludeAction([
        "shapes/setTool",
        "shapes/selectShape",
        "shapes/deselectShape",
        "shapes/clearSelection",
        "shapes/selectAll",
        "shapes/loadProject", // update present but don't create a history entry
        "shapes/updateShape", // exclude drag/move/resize intermediate updates
        // Real-time collaboration: doosre user/server ke remote updates present
        // ko sync karte hain — yeh user ka apna action nahi, isliye history entry
        // NAHI banni chahiye. Warna autosave→live-subscription loop har remote
        // apply pe `future` stack clear kar deta hai aur Redo tootta hai.
        "shapes/applyRemoteShapes",
    ]),
    initTypes: ["@@INIT", "@@redux/INIT"], // handle SSR init
});

export const slices: Record<string, Reducer> = {
    profile,
    projects,
    shapes,
    viewport,
    chat,
};
