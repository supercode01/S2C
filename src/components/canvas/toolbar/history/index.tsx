'use client'
import { Redo2, Undo2 } from 'lucide-react'
import React from 'react'
import { useHistory } from '@/hooks/use-history'

const HistoryPill = () => {
  // Per-user, command-based undo/redo (only affects your own work).
  const { undo, redo, canUndo, canRedo } = useHistory()

  const handleUndo = () => {
    if (canUndo) undo()
  }

  const handleRedo = () => {
    if (canRedo) redo()
  }

  return (
    <div className="col-span-1 flex justify-start items-center">
      <div
        className="inline-flex items-center rounded-full backdrop-blur-xl bg-zinc-900/90 border border-white/10 shadow-2xl shadow-black/40 p-2 text-neutral-300 saturate-150"
      >
        {/* Undo Button */}
        <button
          onClick={handleUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
          className={`
            inline-grid h-9 w-9 place-items-center rounded-full transition-all
            ${canUndo
              ? 'hover:bg-white/[0.12] cursor-pointer opacity-90 hover:opacity-100'
              : 'cursor-not-allowed opacity-25'
            }
          `}
        >
          <Undo2 size={18} className="stroke-[1.75]" />
        </button>

        <span className="mx-1 h-5 w-px rounded bg-white/[0.16]" />

        {/* Redo Button */}
        <button
          onClick={handleRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
          aria-label="Redo"
          className={`
            inline-grid h-9 w-9 place-items-center rounded-full transition-all
            ${canRedo
              ? 'hover:bg-white/[0.12] cursor-pointer opacity-90 hover:opacity-100'
              : 'cursor-not-allowed opacity-25'
            }
          `}
        >
          <Redo2 size={18} className="stroke-[1.75]" />
        </button>
      </div>
    </div>
  )
}

export default HistoryPill