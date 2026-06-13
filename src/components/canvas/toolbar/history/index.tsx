'use client'
import { Redo2, Undo2 } from 'lucide-react'
import React from 'react'
import { useDispatch } from 'react-redux'
import { ActionCreators } from 'redux-undo'
import { AppDispatch, useAppSelector } from '@/redux/store'

const HistoryPill = () => {
  const dispatch = useDispatch<AppDispatch>()

  // Check if undo/redo is available
  const canUndo = useAppSelector((s) => (s.shapes.past?.length ?? 0) > 0)
  const canRedo = useAppSelector((s) => (s.shapes.future?.length ?? 0) > 0)

  const handleUndo = () => {
    if (canUndo) dispatch(ActionCreators.undo())
  }

  const handleRedo = () => {
    if (canRedo) dispatch(ActionCreators.redo())
  }

  return (
    <div className="col-span-1 flex justify-start items-center">
      <div
        className="inline-flex items-center rounded-full backdrop-blur-xl bg-white/[0.08] border border-white/[0.12] p-2 text-neutral-300 saturate-150"
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