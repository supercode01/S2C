'use client'
import { useGlobalChat, useInfiniteCanvas, useInspiration } from '@/hooks/use-canvas'
import React from 'react'
import TextSidebar from './text-sidebar'
import { cn } from '@/lib/utils'
import shapes from './toolbar/shapes'
import ShapeRenderer from './shapes'
import { RectanglePreview } from './shapes/rectangle/preview'
import { FramePreview } from './shapes/frame/preview'
import { ElipsePreview } from './shapes/elipse/preview'
import { ArrowPreview } from './shapes/arrow/preview'
import { LinePreview } from './shapes/line/preview'
import { FreeDrawStrokePreview } from './shapes/stroke/preview'
import { SelectionOverlay } from './shapes/selection'
import InspirationSidebar from './shapes/inspiration-sidebar'
import RemoteSelections from './presence/remote-selection'
import RemoteCursors from './presence/remote-cursors'
import ChatWindow from './shapes/generatedui/chat'

type Props = {}

const InfiniteCanvas = (props: Props) => {
  const {
    viewport,
    shapes,
    currentTool,
    selectedShapes,

    // handlers
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,

    // helpers
    attachCanvasRef,
    getDraftShape,
    getFreeDrawPoints,
    isSidebarOpen,
    hasSelectedText,
  } = useInfiniteCanvas()

  const { isInspirationOpen, closeInspiration, toggleInspiration } = useInspiration()
  // add "exportDesign" in use GolbalChat
  const { isChatOpen, activeGeneratedUIId, generateWorkflow, exportDesign, toggleChat, closeChat } = useGlobalChat()

  const draftShape = getDraftShape()
  const freeDrawPoints = getFreeDrawPoints()
  return (
    <>
      <TextSidebar isOpen={isSidebarOpen && hasSelectedText} />

      {/* Inspiration */}
      <InspirationSidebar
        isOpen={isInspirationOpen}
        onClose={closeInspiration}
      />

      {/* Chat window */}
      {activeGeneratedUIId && (
        <ChatWindow
          generatedUIId={activeGeneratedUIId}
          isOpen={isChatOpen}
          onClose={closeChat}
        />
      )}

      <div
        ref={attachCanvasRef}
        role="application"
        aria-label="Infinite drawing canvas"
        className={cn(
          'relative w-full h-full overflow-hidden select-none z-0',
          {
            'cursor-grabbing': viewport.mode === 'panning',
            'cursor-grab': viewport.mode === 'shiftPanning',
            'cursor-crosshair':
              currentTool !== 'select' && viewport.mode === 'idle',
            'cursor-default':
              currentTool === 'select' && viewport.mode === 'idle',
          }
        )}
        style={{ touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onContextMenu={(e) => e.preventDefault()}
        draggable={false}
      >

        {/* Render shapes */}

        <div
          className="absolute origin-top-left pointer-events-none z-10"
          style={{
            transform: `translate3d(${viewport.translate.x}px, ${viewport.translate.y}px, 0) scale(${viewport.
              scale})`,
            transformOrigin: '0 0',
            willChange: 'transform',
          }}
        >
          {shapes.map((shape) => (
            <ShapeRenderer
              key={shape.id}
              shape={shape}
              toggleInspiration={toggleInspiration}
              toggleChat={toggleChat}
              generateWorkflow={generateWorkflow}
              exportDesign={exportDesign}
            />
          ))}

          {/* When we select the shape the circles on the will appear to change the shapes size  */}
          {shapes.map((shape) => (
            <SelectionOverlay
              key={`selection-${shape.id}`}
              shape={shape}
              isSelected={!!selectedShapes[shape.id]}
            />
          ))}
          <RemoteSelections />
          <RemoteCursors />
          {/* Draft shapes for showing creating drawings eg. show rectangle being created */}
          {draftShape && draftShape.type === 'frame' && (
            <FramePreview
              startWorld={draftShape.startWorld}
              currentWorld={draftShape.currentWorld}
            />
          )}

          {draftShape && draftShape.type === 'rect' && (
            <RectanglePreview
              startWorld={draftShape.startWorld}
              currentWorld={draftShape.currentWorld}
            />
          )}

          {draftShape && draftShape.type === 'ellipse' && (
            <ElipsePreview
              startWorld={draftShape.startWorld}
              currentWorld={draftShape.currentWorld}
            />
          )}

          {draftShape && draftShape.type === 'arrow' && (
            <ArrowPreview
              startWorld={draftShape.startWorld}
              currentWorld={draftShape.currentWorld}
            />
          )}

          {draftShape && draftShape.type === 'line' && (
            <LinePreview
              startWorld={draftShape.startWorld}
              currentWorld={draftShape.currentWorld}
            />
          )}

          {currentTool === 'freedraw' && freeDrawPoints.length > 1 && (
            <FreeDrawStrokePreview points={freeDrawPoints} />
          )}

        </div>
      </div >
    </>
  )
}

export default InfiniteCanvas