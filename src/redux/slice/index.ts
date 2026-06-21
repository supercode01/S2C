import { Reducer } from "@reduxjs/toolkit";
import profile from "./profile";
import projects from "./projects";
import shapesReducer from "./shapes";
import viewport from "./viewport";
import undoable from "redux-undo";
import chat from './chat'
import presence from './presence'
import history from './history'

// The `undoable` wrapper is kept ONLY so the rest of the app can keep reading
// `s.shapes.present`. Actual undo/redo is now PER-USER and command-based
// (src/redux/middleware/history.ts + src/redux/slice/history). redux-undo's own
// snapshot history is disabled (filter returns false) because snapshot-based
// undo on a SHARED document brought back other users' work.
const shapes = undoable(shapesReducer, {
    limit: 1,
    filter: () => false, // never snapshot — command history handles undo/redo
    initTypes: ["@@INIT", "@@redux/INIT"], // handle SSR init
});

export const slices: Record<string, Reducer> = {
    profile,
    projects,
    shapes,
    viewport,
    chat,
    presence,
    history,
};
