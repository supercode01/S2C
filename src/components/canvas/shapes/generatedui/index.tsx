'use client'
import { LiquidGlassButton } from '@/components/buttons/liquid-glass'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Toggle } from '@/components/ui/toggle'
import { useUpdateContainer } from '@/hooks/use-styles'
import { GeneratedUIShape, updateShape } from '@/redux/slice/shapes'
import { clearDesignSelection, setDesignSelection } from '@/redux/slice/presence'
import { useAppDispatch, useAppSelector } from '@/redux/store'
import {
    AlignCenter,
    AlignLeft,
    AlignRight,
    Bold,
    ChevronUp,
    ChevronsDown,
    ChevronsUp,
    Download,
    GripVertical,
    Image as ImageIcon,
    Italic,
    MessageCircle,
    Palette,
    Trash2,
    Underline,
    Workflow,
} from 'lucide-react'
import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

type Props = {
    shape: GeneratedUIShape
    toggleChat: (generatedUIId: string) => void
    generateWorkflow: (generatedUIId: string) => void
    exportDesign: (generatedUIId: string, element: HTMLElement | null) => void
}

type Overlay = { left: number; top: number; width: number; height: number }
type DragMode = 'move' | 'nw' | 'ne' | 'sw' | 'se'

const rgbToHex = (rgb: string): string => {
    const m = rgb.match(/\d+/g)
    if (!m || m.length < 3) return '#000000'
    const [r, g, b] = m.map(Number)
    return '#' + [r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')
}

const GeneratedUI = ({ shape, toggleChat, generateWorkflow, exportDesign }: Props) => {

    const { containerRef } = useUpdateContainer(shape)
    const dispatch = useAppDispatch()
    const scale = useAppSelector((s) => s.viewport.scale) || 1
    const currentTool = useAppSelector((s) => s.shapes.present?.tool ?? 'select')

    const [overlay, setOverlay] = useState<Overlay | null>(null)
    const [selectedEl, setSelectedEl] = useState<HTMLElement | null>(null)
    const [blockSelected, setBlockSelected] = useState(false)
    const [textDraft, setTextDraft] = useState('')
    const [colorDraft, setColorDraft] = useState('#ffffff')
    const [, setTick] = useState(0)
    const refresh = () => setTick((t) => t + 1)

    const contentRef = useRef<HTMLDivElement>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const panelRef = useRef<HTMLDivElement>(null)
    const lastHtmlRef = useRef<string | null>(null)
    const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const dragRef = useRef<
        | null
        | { mode: DragMode; el: HTMLElement; startX: number; startY: number; startLeft: number; startTop: number; startW: number; startH: number; moved: boolean }
    >(null)
    const blockDragRef = useRef<null | { startX: number; startY: number; origX: number; origY: number; moved: boolean }>(null)
    const blockResizeRef = useRef<
        null | { corner: DragMode; startX: number; origX: number; origW: number }
    >(null)

    // Local sanitizer (kept identical to the hook's behaviour, allowing inline images).
    const sanitize = (html: string) =>
        html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
            .replace(/on\w+="[^"]*"/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/data:(?!image\/)/gi, '')

    // Inject the AI HTML manually so React never re-builds the DOM on our own
    // edits (which would otherwise destroy the current selection). Only an
    // *external* change to uiSpecData (e.g. streaming generation) rebuilds it.
    useEffect(() => {
        const c = contentRef.current
        if (!c || shape.uiSpecData == null) return
        if (shape.uiSpecData === lastHtmlRef.current) return
        c.innerHTML = sanitize(shape.uiSpecData)
        lastHtmlRef.current = shape.uiSpecData
        // Tag every element with its original document order so that, once lifted
        // to absolute, each keeps a stable z-index — dragging a background no
        // longer paints it on top of the text that sits over it.
        const scopeRoot = (c.querySelector('[data-generated-ui]') as HTMLElement | null) || c
        scopeRoot.querySelectorAll<HTMLElement>('*').forEach((e, i) => {
            e.dataset.guiZ = String(i + 1)
        })
        // Freeze the content's layout width so RESIZING THE FRAME does not reflow
        // or move the inner elements — each element stays individual (Figma-style
        // frame resize: the frame box changes, children keep their place).
        c.style.width = ''
        c.style.width = c.offsetWidth + 'px'
        clearSelection()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [shape.uiSpecData])

    // ---- persistence (selection-safe) ----
    const persist = () => {
        const c = contentRef.current
        if (!c) return
        const html = c.innerHTML
        if (html === shape.uiSpecData) return
        lastHtmlRef.current = html // mark as already-in-DOM so the effect won't rebuild
        dispatch(updateShape({ id: shape.id, patch: { uiSpecData: html } }))
    }
    const schedulePersist = () => {
        if (persistTimer.current) clearTimeout(persistTimer.current)
        persistTimer.current = setTimeout(persist, 350)
    }

    // ---- selection + overlay ----
    const computeOverlay = (el: HTMLElement) => {
        const c = contentRef.current
        if (!c) return
        let x = 0
        let y = 0
        let node: HTMLElement | null = el
        while (node && node !== c) {
            x += node.offsetLeft
            y += node.offsetTop
            node = node.offsetParent as HTMLElement | null
        }
        setOverlay({ left: x, top: y, width: el.offsetWidth, height: el.offsetHeight })
    }
    // World-space box of an inner element, for broadcasting to other users.
    const worldBoxOf = (el: HTMLElement) => {
        const c = contentRef.current
        const cont = containerRef.current
        if (!c || !cont) return null
        let lx = 0
        let ly = 0
        let n: HTMLElement | null = el
        while (n && n !== c) {
            lx += n.offsetLeft
            ly += n.offsetTop
            n = n.offsetParent as HTMLElement | null
        }
        let cx = 0
        let cy = 0
        let m: HTMLElement | null = c
        while (m && m !== cont) {
            cx += m.offsetLeft
            cy += m.offsetTop
            m = m.offsetParent as HTMLElement | null
        }
        return { x: shape.x + cx + lx, y: shape.y + cy + ly, w: el.offsetWidth, h: el.offsetHeight }
    }
    const selectEl = (el: HTMLElement) => {
        setBlockSelected(false)
        setSelectedEl(el)
        computeOverlay(el)
        const box = worldBoxOf(el)
        if (box) dispatch(setDesignSelection(box)) // share selection with other users
    }
    function clearSelection() {
        setSelectedEl(null)
        setOverlay(null)
        dispatch(clearDesignSelection())
    }

    const handleExportDesign = () => {
        if (!shape.uiSpecData) return
        exportDesign(shape.id, containerRef.current)
    }
    const handleGenerateWorkflow = () => generateWorkflow(shape.id)
    const handleToggleChat = () => toggleChat(shape.id)

    // Lift an element OUT of normal flow into absolute positioning relative to
    // the content container, preserving its current position/size. This makes
    // every element individually movable/resizable WITHOUT affecting siblings
    // (no leftover slot, no linked resizing). Idempotent per element.
    const liftToAbsolute = (el: HTMLElement) => {
        const c = contentRef.current
        if (!c || el === c) return
        if (el.dataset.guiLifted === '1') return
        // Reparent INTO the scoped design root (`[data-generated-ui]`) — not the
        // outer content wrapper — so the design's scoped CSS (background/text
        // colours like `[data-generated-ui] .c-bg{...}`) keeps applying. Moving
        // the element outside that scope was stripping its background colour.
        const scope = (c.querySelector('[data-generated-ui]') as HTMLElement | null) || c
        if (el === scope) return
        if (window.getComputedStyle(scope).position === 'static') scope.style.position = 'relative'
        // keep the design box from collapsing as elements leave the flow
        if (!c.style.minHeight) c.style.minHeight = c.offsetHeight + 'px'
        // offset of el relative to the scope root
        let x = 0
        let y = 0
        let node: HTMLElement | null = el
        while (node && node !== scope) {
            x += node.offsetLeft
            y += node.offsetTop
            node = node.offsetParent as HTMLElement | null
        }
        const w = el.offsetWidth
        const h = el.offsetHeight
        const elCs = window.getComputedStyle(el)
        // Freeze inherited text properties (esp. colour) inline BEFORE reparenting,
        // so a black text whose colour was inherited from its old parent doesn't
        // flip to the scope root's default (white) once it's moved out.
        ;(['color', 'fontFamily', 'fontWeight', 'fontStyle', 'textAlign', 'letterSpacing', 'textTransform'] as const).forEach(
            (p) => {
                if (!el.style[p]) el.style[p] = elCs[p]
            }
        )
        // Leave an invisible placeholder so the surrounding elements keep their
        // original positions (nothing reflows when this element pops out).
        if (el.parentElement) {
            const ph = document.createElement('div')
            const phId = 'ph-' + Math.random().toString(36).slice(2)
            ph.setAttribute('data-gui-ph', phId)
            ph.style.width = w + 'px'
            ph.style.height = h + 'px'
            ph.style.margin = elCs.margin
            ph.style.flex = elCs.flex && elCs.flex !== '0 1 auto' ? elCs.flex : ''
            ph.style.display = elCs.display === 'inline' ? 'inline-block' : elCs.display
            ph.style.visibility = 'hidden'
            ph.style.pointerEvents = 'none'
            el.dataset.guiPh = phId
            el.parentElement.insertBefore(ph, el)
        }
        el.style.boxSizing = 'border-box'
        el.style.margin = '0'
        el.style.position = 'absolute'
        el.style.left = x + 'px'
        el.style.top = y + 'px'
        el.style.width = w + 'px'
        el.style.height = h + 'px'
        // Initial stacking = original document order. Dragging then brings the
        // element to the front (see onDragMove / onDragEnd) so the thing you are
        // moving stays VISIBLE instead of disappearing behind other elements.
        // Use the Back button to push something (e.g. a big background) behind.
        el.style.zIndex = el.dataset.guiZ || '1'
        el.dataset.guiLifted = '1'
        scope.appendChild(el) // reparent within the scoped root so its CSS still applies
        computeOverlay(el)
    }

    // ---- element interactions (click = select, drag = move) ----
    const handleContentPointerDown = (e: React.PointerEvent) => {
        const target = e.target as HTMLElement
        // Eraser tool active → clicking an element deletes it (instead of select).
        if (currentTool === 'eraser') {
            if (target && target !== contentRef.current) {
                e.preventDefault()
                e.stopPropagation()
                removePlaceholder(target)
                target.remove()
                clearSelection()
                persist()
            }
            return
        }
        if (target === contentRef.current) {
            clearSelection()
            return
        }
        if (e.shiftKey) {
            e.preventDefault()
            removePlaceholder(target)
            target.remove()
            clearSelection()
            persist()
            return
        }
        selectEl(target)
        // prime a potential drag-to-move
        const startLeft = parseFloat(target.style.left) || 0
        const startTop = parseFloat(target.style.top) || 0
        dragRef.current = {
            mode: 'move',
            el: target,
            startX: e.clientX,
            startY: e.clientY,
            startLeft,
            startTop,
            startW: target.offsetWidth,
            startH: target.offsetHeight,
            moved: false,
        }
        window.addEventListener('pointermove', onDragMove)
        window.addEventListener('pointerup', onDragEnd)
    }

    // Drag the currently SELECTED element via the overlay grip. Unlike clicking
    // in the content (which grabs whatever is under the cursor), this always
    // moves the selected element — so containers / sections ("frames") that sit
    // behind their children can be dragged too.
    const startSelectedMove = (e: React.PointerEvent) => {
        const el = selectedEl
        if (!el) return
        e.preventDefault()
        e.stopPropagation()
        dragRef.current = {
            mode: 'move',
            el,
            startX: e.clientX,
            startY: e.clientY,
            startLeft: parseFloat(el.style.left) || 0,
            startTop: parseFloat(el.style.top) || 0,
            startW: el.offsetWidth,
            startH: el.offsetHeight,
            moved: false,
        }
        window.addEventListener('pointermove', onDragMove)
        window.addEventListener('pointerup', onDragEnd)
    }

    const startResize = (mode: DragMode, e: React.PointerEvent) => {
        const el = selectedEl
        if (!el) return
        e.preventDefault()
        e.stopPropagation()
        liftToAbsolute(el) // resize freely without disturbing the layout
        el.style.boxSizing = 'border-box'
        dragRef.current = {
            mode,
            el,
            startX: e.clientX,
            startY: e.clientY,
            startLeft: parseFloat(el.style.left) || 0,
            startTop: parseFloat(el.style.top) || 0,
            startW: el.offsetWidth,
            startH: el.offsetHeight,
            moved: false,
        }
        window.addEventListener('pointermove', onDragMove)
        window.addEventListener('pointerup', onDragEnd)
    }

    const onDragMove = (ev: PointerEvent) => {
        const d = dragRef.current
        if (!d) return
        if (!d.moved) {
            if (Math.abs(ev.clientX - d.startX) < 3 && Math.abs(ev.clientY - d.startY) < 3) return
            d.moved = true
            if (d.mode === 'move') {
                liftToAbsolute(d.el) // pop out of flow on first drag, then move freely
                // rebase the drag origin to the lifted coordinates
                d.startLeft = parseFloat(d.el.style.left) || 0
                d.startTop = parseFloat(d.el.style.top) || 0
                d.startX = ev.clientX
                d.startY = ev.clientY
            }
            // While dragging, sit on top so the element stays visible.
            d.el.style.zIndex = '2147483646'
        }
        const dx = (ev.clientX - d.startX) / scale
        const dy = (ev.clientY - d.startY) / scale
        const el = d.el
        if (d.mode === 'move') {
            el.style.left = d.startLeft + dx + 'px'
            el.style.top = d.startTop + dy + 'px'
        } else {
            if (d.mode === 'se' || d.mode === 'ne') el.style.width = Math.max(20, d.startW + dx) + 'px'
            if (d.mode === 'se' || d.mode === 'sw') el.style.height = Math.max(20, d.startH + dy) + 'px'
            if (d.mode === 'nw' || d.mode === 'sw') {
                el.style.width = Math.max(20, d.startW - dx) + 'px'
                el.style.left = d.startLeft + dx + 'px'
            }
            if (d.mode === 'nw' || d.mode === 'ne') {
                el.style.height = Math.max(20, d.startH - dy) + 'px'
                el.style.top = d.startTop + dy + 'px'
            }
        }
        computeOverlay(el)
    }
    const onDragEnd = () => {
        window.removeEventListener('pointermove', onDragMove)
        window.removeEventListener('pointerup', onDragEnd)
        const d = dragRef.current
        dragRef.current = null
        if (d?.moved) {
            // Keep the just-dropped element on top (visible) instead of letting
            // it fall behind other elements. Compute a z above all other lifted
            // ones; use the Back button to push something behind on purpose.
            if (d.mode === 'move') {
                d.el.style.zIndex = ''
                const scopeRoot = contentRef.current?.querySelector('[data-generated-ui]') as HTMLElement | null
                let maxZ = 0
                ;(scopeRoot || contentRef.current)?.querySelectorAll<HTMLElement>('[data-gui-lifted="1"]').forEach((e) => {
                    if (e !== d.el) maxZ = Math.max(maxZ, parseInt(e.style.zIndex) || 0)
                })
                const newZ = String(maxZ + 1)
                d.el.style.zIndex = newZ
                d.el.dataset.guiZ = newZ
            }
            computeOverlay(d.el)
            persist()
            // After actually dragging an element, deselect it on release.
            if (d.mode === 'move') clearSelection()
        }
        refresh()
    }

    // ---- drag the whole block on the canvas ----
    const onBlockMove = (ev: PointerEvent) => {
        const b = blockDragRef.current
        if (!b) return
        const dx = (ev.clientX - b.startX) / scale
        const dy = (ev.clientY - b.startY) / scale
        if (!b.moved && Math.abs(ev.clientX - b.startX) < 3 && Math.abs(ev.clientY - b.startY) < 3) return
        b.moved = true
        dispatch(updateShape({ id: shape.id, patch: { x: b.origX + dx, y: b.origY + dy } }))
    }
    const onBlockUp = () => {
        window.removeEventListener('pointermove', onBlockMove)
        window.removeEventListener('pointerup', onBlockUp)
        const b = blockDragRef.current
        blockDragRef.current = null
        // a click (no drag) on the handle selects the whole block (frame)
        if (b && !b.moved) {
            clearSelection()
            setBlockSelected(true)
        }
    }
    const handleBlockHandleDown = (e: React.PointerEvent) => {
        e.preventDefault()
        e.stopPropagation()
        blockDragRef.current = { startX: e.clientX, startY: e.clientY, origX: shape.x, origY: shape.y, moved: false }
        window.addEventListener('pointermove', onBlockMove)
        window.addEventListener('pointerup', onBlockUp)
    }

    // ---- resize the whole block (frame) from its corners ----
    const onBlockResizeMove = (ev: PointerEvent) => {
        const r = blockResizeRef.current
        if (!r) return
        const dx = (ev.clientX - r.startX) / scale
        if (r.corner === 'ne' || r.corner === 'se') {
            dispatch(updateShape({ id: shape.id, patch: { w: Math.max(200, r.origW + dx) } }))
        } else {
            const newW = Math.max(200, r.origW - dx)
            dispatch(updateShape({ id: shape.id, patch: { w: newW, x: r.origX + (r.origW - newW) } }))
        }
    }
    const onBlockResizeUp = () => {
        window.removeEventListener('pointermove', onBlockResizeMove)
        window.removeEventListener('pointerup', onBlockResizeUp)
        blockResizeRef.current = null
    }
    const startBlockResize = (corner: DragMode, e: React.PointerEvent) => {
        e.preventDefault()
        e.stopPropagation()
        blockResizeRef.current = { corner, startX: e.clientX, origX: shape.x, origW: shape.w }
        window.addEventListener('pointermove', onBlockResizeMove)
        window.addEventListener('pointerup', onBlockResizeUp)
    }

    // ---- double-click to type, image replace ----
    const handleContentDoubleClick = (e: React.MouseEvent) => {
        const target = e.target as HTMLElement
        if (target.tagName === 'IMG') {
            openImagePicker()
            return
        }
        target.contentEditable = 'true'
        target.focus()
        const onBlur = () => {
            target.contentEditable = 'false'
            target.removeEventListener('blur', onBlur)
            persist()
        }
        target.addEventListener('blur', onBlur)
    }
    const openImagePicker = () => fileInputRef.current?.click()
    const handleImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        const img = (selectedEl && selectedEl.tagName === 'IMG' ? selectedEl : null) as HTMLImageElement | null
        if (!file || !img) {
            e.target.value = ''
            return
        }
        const reader = new FileReader()
        reader.onload = () => {
            img.src = reader.result as string
            computeOverlay(img)
            persist()
            refresh()
        }
        reader.readAsDataURL(file)
        e.target.value = ''
    }

    // ---- property helpers ----
    const LAYOUT_PROPS = ['width', 'height', 'left', 'top']
    const applyStyle = (prop: string, value: string) => {
        if (!selectedEl) return
        if (LAYOUT_PROPS.includes(prop)) liftToAbsolute(selectedEl) // size/pos => individual
        ;(selectedEl.style as any)[prop] = value
        computeOverlay(selectedEl)
        refresh()
        schedulePersist()
    }
    const setText = (value: string) => {
        if (!selectedEl) return
        selectedEl.textContent = value
        computeOverlay(selectedEl)
        refresh()
        schedulePersist()
    }
    // Text color often lives on a child element, so applying it only to the
    // selected node has no visible effect. Set it on the element AND all of its
    // descendants so the colour actually changes.
    const setTextColor = (value: string) => {
        if (!selectedEl) return
        selectedEl.style.color = value
        selectedEl.querySelectorAll<HTMLElement>('*').forEach((c) => {
            c.style.color = value
        })
        refresh()
        schedulePersist()
    }
    const removePlaceholder = (el: HTMLElement) => {
        const id = el.dataset.guiPh
        if (id) contentRef.current?.querySelector(`[data-gui-ph="${id}"]`)?.remove()
    }
    const selectParent = () => {
        const p = selectedEl?.parentElement
        if (p && p !== contentRef.current) selectEl(p)
    }
    const deleteSelected = () => {
        if (!selectedEl) return
        removePlaceholder(selectedEl)
        selectedEl.remove()
        clearSelection()
        persist()
    }
    // Permanent stacking control for the selected element.
    const bringToFront = () => {
        if (!selectedEl) return
        liftToAbsolute(selectedEl)
        const scope = (contentRef.current?.querySelector('[data-generated-ui]') as HTMLElement | null) || contentRef.current
        let max = 1
        scope?.querySelectorAll<HTMLElement>('[data-gui-lifted="1"]').forEach((e) => {
            max = Math.max(max, parseInt(e.style.zIndex) || 0)
        })
        selectedEl.dataset.guiZ = String(max + 1)
        selectedEl.style.zIndex = String(max + 1)
        refresh()
        schedulePersist()
    }
    const sendToBack = () => {
        if (!selectedEl) return
        liftToAbsolute(selectedEl)
        selectedEl.dataset.guiZ = '-1'
        selectedEl.style.zIndex = '-1'
        refresh()
        schedulePersist()
    }

    // Delete key removes selected element (unless typing).
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const ae = document.activeElement as HTMLElement | null
            const typing = !!ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable)
            if ((e.key === 'Delete' || e.key === 'Backspace') && selectedEl && !typing) {
                e.preventDefault()
                e.stopPropagation()
                deleteSelected()
            }
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedEl])

    // Sync the panel's text/colour fields whenever the selection changes.
    useEffect(() => {
        if (selectedEl && selectedEl.children.length === 0 && selectedEl.tagName !== 'IMG') {
            setTextDraft(selectedEl.textContent || '')
        } else {
            setTextDraft('')
        }
        if (selectedEl) {
            setColorDraft(rgbToHex(window.getComputedStyle(selectedEl).color))
        }
    }, [selectedEl])

    // Click anywhere outside this design (and outside its properties panel) to
    // deselect — the usual "click empty space to deselect" behaviour.
    useEffect(() => {
        if (!selectedEl && !blockSelected) return
        const onDown = (e: PointerEvent) => {
            const t = e.target as Node | null
            if (!t) return
            if (containerRef.current?.contains(t)) return // inside this generated UI
            if (panelRef.current?.contains(t)) return // inside the properties panel
            clearSelection()
            setBlockSelected(false)
        }
        window.addEventListener('pointerdown', onDown)
        return () => window.removeEventListener('pointerdown', onDown)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedEl, blockSelected])

    // ---- derived values for the panel ----
    const cs = selectedEl ? window.getComputedStyle(selectedEl) : null
    const isImg = selectedEl?.tagName === 'IMG'
    const isTextLeaf = !!selectedEl && selectedEl.children.length === 0 && !isImg
    const fontSize = cs ? Math.round(parseFloat(cs.fontSize)) || 16 : 16
    const fontWeight = cs ? parseInt(cs.fontWeight) || 400 : 400
    const textColor = cs ? rgbToHex(cs.color) : '#ffffff'
    const bgColor =
        cs && cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)' ? rgbToHex(cs.backgroundColor) : '#ffffff'

    const propertiesPanel = !selectedEl
        ? null
        : createPortal(
              <div
                  ref={panelRef}
                  onPointerDown={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="fixed right-5 top-1/2 -translate-y-1/2 w-72 backdrop-blur-xl bg-white/[0.08] border border-white/[0.12] p-4 saturate-150 rounded-lg z-[9999] text-white"
              >
                  <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium">
                          {isImg ? 'Image' : `<${selectedEl.tagName.toLowerCase()}>`}
                      </span>
                      <div className="flex gap-1">
                          {selectedEl.parentElement && selectedEl.parentElement !== contentRef.current && (
                              <button onClick={selectParent} className="text-white/70 hover:text-white" title="Select parent">
                                  <ChevronUp className="w-4 h-4" />
                              </button>
                          )}
                          <button onClick={bringToFront} className="text-white/70 hover:text-white" title="Bring to front">
                              <ChevronsUp className="w-4 h-4" />
                          </button>
                          <button onClick={sendToBack} className="text-white/70 hover:text-white" title="Send to back">
                              <ChevronsDown className="w-4 h-4" />
                          </button>
                          <button onClick={deleteSelected} className="text-white/70 hover:text-red-400" title="Delete">
                              <Trash2 className="w-4 h-4" />
                          </button>
                      </div>
                  </div>

                  <div className="flex flex-col gap-4 max-h-[70vh] overflow-y-auto pr-1">
                      {isTextLeaf && (
                          <div className="space-y-1">
                              <label className="text-white/70 text-xs">Text</label>
                              <textarea
                                  value={textDraft}
                                  onChange={(e) => {
                                      setTextDraft(e.target.value)
                                      setText(e.target.value)
                                  }}
                                  rows={2}
                                  className="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-sm text-white outline-none"
                              />
                          </div>
                      )}

                      {isImg && (
                          <LiquidGlassButton size="sm" variant="subtle" onClick={openImagePicker}>
                              <ImageIcon size={12} /> Replace image
                          </LiquidGlassButton>
                      )}

                      {!isImg && (
                          <>
                              <div className="space-y-1">
                                  <label className="text-white/70 text-xs">Font size: {fontSize}px</label>
                                  <Slider value={[fontSize]} min={8} max={96} step={1} onValueChange={([v]) => applyStyle('fontSize', v + 'px')} />
                              </div>
                              <div className="space-y-1">
                                  <label className="text-white/70 text-xs">Weight: {fontWeight}</label>
                                  <Slider value={[fontWeight]} min={100} max={900} step={100} onValueChange={([v]) => applyStyle('fontWeight', String(v))} />
                              </div>
                              <div className="flex gap-2">
                                  <Toggle pressed={fontWeight >= 600} onPressedChange={(p) => applyStyle('fontWeight', p ? '700' : '400')} className="data-[state=on]:bg-blue-500">
                                      <Bold className="w-4 h-4" />
                                  </Toggle>
                                  <Toggle pressed={cs?.fontStyle === 'italic'} onPressedChange={(p) => applyStyle('fontStyle', p ? 'italic' : 'normal')} className="data-[state=on]:bg-blue-500">
                                      <Italic className="w-4 h-4" />
                                  </Toggle>
                                  <Toggle pressed={(cs?.textDecorationLine || '').includes('underline')} onPressedChange={(p) => applyStyle('textDecoration', p ? 'underline' : 'none')} className="data-[state=on]:bg-blue-500">
                                      <Underline className="w-4 h-4" />
                                  </Toggle>
                              </div>
                              <div className="flex gap-2">
                                  <Toggle onPressedChange={() => applyStyle('textAlign', 'left')} className="data-[state=on]:bg-blue-500"><AlignLeft className="w-4 h-4" /></Toggle>
                                  <Toggle onPressedChange={() => applyStyle('textAlign', 'center')} className="data-[state=on]:bg-blue-500"><AlignCenter className="w-4 h-4" /></Toggle>
                                  <Toggle onPressedChange={() => applyStyle('textAlign', 'right')} className="data-[state=on]:bg-blue-500"><AlignRight className="w-4 h-4" /></Toggle>
                              </div>
                              <div className="space-y-1">
                                  <label className="text-white/70 text-xs flex items-center gap-1"><Palette className="w-3 h-3" /> Text color</label>
                                  <div className="flex gap-2">
                                      <Input
                                          value={colorDraft}
                                          onChange={(e) => {
                                              setColorDraft(e.target.value)
                                              if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(e.target.value)) setTextColor(e.target.value)
                                          }}
                                          className="bg-white/5 border-white/10 text-white flex-1 h-8"
                                      />
                                      <input
                                          type="color"
                                          value={/^#[0-9a-f]{6}$/i.test(colorDraft) ? colorDraft : textColor}
                                          onChange={(e) => {
                                              setColorDraft(e.target.value)
                                              setTextColor(e.target.value)
                                          }}
                                          className="w-8 h-8 rounded bg-transparent border border-white/20 cursor-pointer"
                                      />
                                  </div>
                              </div>
                          </>
                      )}

                      <div className="space-y-1">
                          <label className="text-white/70 text-xs">Background</label>
                          <div className="flex gap-2">
                              <input type="color" value={bgColor} onChange={(e) => applyStyle('backgroundColor', e.target.value)} className="w-8 h-8 rounded bg-transparent border border-white/20 cursor-pointer" />
                              <button onClick={() => applyStyle('backgroundColor', 'transparent')} className="text-xs text-white/60 hover:text-white px-2 border border-white/10 rounded">Clear</button>
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                              <label className="text-white/70 text-xs">Width</label>
                              <Input type="number" value={overlay ? Math.round(overlay.width) : ''} onChange={(e) => applyStyle('width', e.target.value + 'px')} className="bg-white/5 border-white/10 text-white h-8" />
                          </div>
                          <div className="space-y-1">
                              <label className="text-white/70 text-xs">Height</label>
                              <Input type="number" value={overlay ? Math.round(overlay.height) : ''} onChange={(e) => applyStyle('height', e.target.value + 'px')} className="bg-white/5 border-white/10 text-white h-8" />
                          </div>
                      </div>

                      {!isImg && (
                          <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                  <label className="text-white/70 text-xs">Radius</label>
                                  <Input type="number" value={cs ? parseInt(cs.borderRadius) || 0 : 0} onChange={(e) => applyStyle('borderRadius', e.target.value + 'px')} className="bg-white/5 border-white/10 text-white h-8" />
                              </div>
                              <div className="space-y-1">
                                  <label className="text-white/70 text-xs">Padding</label>
                                  <Input type="number" value={cs ? parseInt(cs.padding) || 0 : 0} onChange={(e) => applyStyle('padding', e.target.value + 'px')} className="bg-white/5 border-white/10 text-white h-8" />
                              </div>
                          </div>
                      )}
                  </div>
              </div>,
              document.body
          )

    return (
        <div
            ref={containerRef}
            className="absolute pointer-events-none"
            style={{ left: shape.x, top: shape.y, width: shape.w, height: 'auto' }}
        >
            <div
                className="w-full h-auto relative rounded-lg border border-white/20 bg-white/5 backdrop-blur-sm"
                style={{ boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)', padding: '16px', height: 'auto', minHeight: Math.max(120, shape.h), boxSizing: 'border-box', position: 'relative' }}
            >
                <div className="h-auto w-full" style={{ pointerEvents: 'auto', height: 'auto', maxWidth: '100%', boxSizing: 'border-box' }}>
                    <div className="absolute -top-8 right-0 flex gap-2">
                        <LiquidGlassButton size="sm" variant="subtle" onClick={handleExportDesign} disabled={!shape.uiSpecData} style={{ pointerEvents: 'auto' }}>
                            <Download size={12} /> Export
                        </LiquidGlassButton>
                        <LiquidGlassButton size="sm" variant="subtle" onClick={handleGenerateWorkflow} style={{ pointerEvents: 'auto' }}>
                            <Workflow size={12} /> Generate Workflow
                        </LiquidGlassButton>
                        <LiquidGlassButton size="sm" variant="subtle" onClick={handleToggleChat} style={{ pointerEvents: 'auto' }}>
                            <MessageCircle size={12} /> Design Chat
                        </LiquidGlassButton>
                    </div>

                    {shape.uiSpecData ? (
                        <div style={{ position: 'relative' }}>
                            <div
                                ref={contentRef}
                                className="h-auto pointer-events-auto gui-editing"
                                style={{ position: 'relative' }}
                                onPointerDown={handleContentPointerDown}
                                onDoubleClick={handleContentDoubleClick}
                                onDragStart={(e) => e.preventDefault()}
                                draggable={false}
                            />

                            {overlay && (
                                <div
                                    className="absolute"
                                    style={{ left: overlay.left, top: overlay.top, width: overlay.width, height: overlay.height, outline: `${2.5 / scale}px solid #6366f1`, outlineOffset: `${1 / scale}px`, pointerEvents: 'none', zIndex: 2147483647 }}
                                >
                                    {/* move grip — drags the selected element (works for containers too) */}
                                    <div
                                        className="pointer-events-auto flex items-center gap-1"
                                        style={{
                                            position: 'absolute', top: -18, left: 0, fontSize: 9, lineHeight: '14px',
                                            padding: '0 6px', color: '#fff', background: '#6366f1', borderRadius: 3, cursor: 'move',
                                        }}
                                        onPointerDown={startSelectedMove}
                                    >
                                        <GripVertical size={9} /> move
                                    </div>
                                    {(['nw', 'ne', 'sw', 'se'] as DragMode[]).map((corner) => (
                                        <div
                                            key={corner}
                                            className="pointer-events-auto"
                                            style={{
                                                position: 'absolute', width: 10, height: 10, background: '#fff', border: '1.5px solid #6366f1', borderRadius: '50%', cursor: `${corner}-resize`,
                                                top: corner[0] === 'n' ? -5 : undefined, bottom: corner[0] === 's' ? -5 : undefined, left: corner[1] === 'w' ? -5 : undefined, right: corner[1] === 'e' ? -5 : undefined,
                                            }}
                                            onPointerDown={(e) => startResize(corner, e)}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center p-8 text-white/60">
                            <div className="animate-pulse">Generating design...</div>
                        </div>
                    )}

                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
                </div>
            </div>

            <style>{`.gui-editing *:hover { outline: 1px dashed rgba(99,102,241,0.5); outline-offset: 2px; cursor: ${currentTool === 'eraser' ? 'crosshair' : 'pointer'}; }`}</style>

            {/* Whole-block move handle */}
            <div
                className="absolute -top-6 left-0 flex items-center gap-1 text-xs px-2 py-1 rounded whitespace-nowrap text-white/70 bg-black/40 pointer-events-auto"
                style={{ fontSize: '10px', cursor: 'move' }}
                onPointerDown={handleBlockHandleDown}
                title="Drag to move the whole design"
            >
                <GripVertical size={10} /> Generated UI
            </div>

            {/* Whole-block (frame) selection + resize handles */}
            {blockSelected && (
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{ outline: `${2.5 / scale}px solid #6366f1`, zIndex: 2147483647 }}
                >
                    {(['nw', 'ne', 'sw', 'se'] as DragMode[]).map((corner) => (
                        <div
                            key={corner}
                            className="pointer-events-auto"
                            style={{
                                position: 'absolute', width: 12, height: 12, background: '#fff',
                                border: '1.5px solid #6366f1', borderRadius: '50%',
                                cursor: corner === 'ne' || corner === 'sw' ? 'nesw-resize' : 'nwse-resize',
                                top: corner[0] === 'n' ? -6 : undefined,
                                bottom: corner[0] === 's' ? -6 : undefined,
                                left: corner[1] === 'w' ? -6 : undefined,
                                right: corner[1] === 'e' ? -6 : undefined,
                            }}
                            onPointerDown={(e) => startBlockResize(corner, e)}
                        />
                    ))}
                </div>
            )}

            {propertiesPanel}
        </div>
    )
}

export default GeneratedUI
