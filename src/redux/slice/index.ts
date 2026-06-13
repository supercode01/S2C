import { Reducer } from "@reduxjs/toolkit";
import profile from "./profile";
import projects from "./projects";
import shapesReducer from "./shapes";
import viewport from "./viewport";
import undoable, { excludeAction } from "redux-undo";
import chat from './chat'

// Wrap shapes reducer with undoable to enable undo/redo
// excludeAction: these actions will NOT create history entries
// clearHistoryType: when loadProject fires, clear the undo history
//   (no point undoing back to a blank canvas after loading a project)
const shapes = undoable(shapesReducer, {
    limit: 50, // max 50 history entries
    clearHistoryType: "shapes/loadProject", // reset history on project load
    filter: excludeAction([
        "shapes/setTool",
        "shapes/selectShape",
        "shapes/deselectShape",
        "shapes/clearSelection",
        "shapes/selectAll",
        "shapes/loadProject", // also exclude from creating a history entry
        "shapes/updateShape", // exclude drag/move/resize intermediate updates
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
