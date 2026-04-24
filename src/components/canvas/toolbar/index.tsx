"use client";

import  HistoryPill  from "./history";
// import { ToolbarShapes } from "./shapes";
import ZoomBar from "./zoombar";

export const Toolbar = () => {
  return (
    <div className="fixed bottom-0 w-full grid grid-cols-3 z-50 p-5">
      {/* Undo/Redo Controls */}
      <HistoryPill />

      {/* Main Drawing Tools */}
      {/* <div className="bg-background/80 backdrop-blur-md border border-border shadow-lg rounded-2xl flex items-center p-2 gap-1">
        <ToolbarShapes />
      </div> */}

      {/* Zoom Controls */}
      <ZoomBar />
    </div>
  );
};

export default Toolbar