'use client'
import { handToolDisable, handToolEnable, panEnd, panMove, panStart, Point, screenToWorld, wheelPan, wheelZoom } from '@/redux/slice/viewport'
import { AppDispatch, useAppDispatch, useAppSelector } from '@/redux/store'
import { useDispatch } from 'react-redux'
import { addArrow, addEllipse, addFrame, addFreeDrawShape, addGeneratedUI, addLine, addRect, addText, clearSelection, commitShapeUpdate, deleteSelected, FrameShape, removeShape, selectShape, setTool, Shape, Tool, updateShape } from '@/redux/slice/shapes'
import { useEffect, useRef, useState } from 'react'
import { generateFrameSnapshot, downloadBlob, exportGeneratedUIAsPNG, getShapesInsideFrame } from '@/lib/frame-snapshot'
import { nanoid } from '@reduxjs/toolkit'
import { toast } from 'sonner'
import { useGenerateWorkflowMutation } from '@/redux/api/generation'
import { useRole } from '@/hooks/use-role'
import { useCursorBroadcast } from '@/hooks/use-presence'
import { useHistory } from '@/hooks/use-history'
import { ActionCreators } from 'redux-undo'
import { addErrorMessage, addUserMessage, clearChat, finishStreamingResponse, initializeChat, startStreamingResponse, updateStreamingContent } from '@/redux/slice/chat'
import { useRouter } from 'next/navigation'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { Id } from '../../convex/_generated/dataModel'
import { combinedSlug } from '@/lib/utils'

const RAF_INTERVAL_MS = 8

interface TouchPointer {
    id: number
    p: Point
}

interface DraftShape {
    type: 'frame' | 'rect' | 'ellipse' | 'arrow' | 'line'
    startWorld: Point
    currentWorld: Point
}

export const useInfiniteCanvas = (
    { bindGlobalShortcuts = false }: { bindGlobalShortcuts?: boolean } = {}
) => {
    const dispatch = useDispatch<AppDispatch>()
    const { isViewer } = useRole()
    const sendCursor = useCursorBroadcast()
    const { undo: undoHistory, redo: redoHistory } = useHistory()

    const viewport = useAppSelector((s) => s.viewport)
    // NOTE: undoable wraps shapes state in { past, present, future }
    // So we must always read from s.shapes.present
    const entityState = useAppSelector(
        (s) => s.shapes.present?.shapes ?? { ids: [], entities: {} as Record<string, Shape> }
    )

    const shapeList: Shape[] = (entityState.ids as string[])
        .map((id: string) => entityState.entities[id])
        .filter((s: Shape | undefined): s is Shape => Boolean(s))

    const currentTool = useAppSelector((s) => s.shapes.present?.tool ?? 'select')
    const selectedShapes = useAppSelector((s) => s.shapes.present?.selected ?? {})

    // Undo/Redo availability — used to disable buttons when nothing to undo/redo
    const canUndo = useAppSelector((s) => (s.shapes.past?.length ?? 0) > 0)
    const canRedo = useAppSelector((s) => (s.shapes.future?.length ?? 0) > 0)

    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const shapesEntities = useAppSelector((state) => state.shapes.present?.shapes.entities ?? {})

    // Keep a ref so keyboard handlers always read the latest selectedShapes
    // without needing to re-register the event listener
    const selectedShapesRef = useRef(selectedShapes)
    selectedShapesRef.current = selectedShapes // sync on every render

    // When an element INSIDE a Generated UI design is selected, that selection is
    // local to the GeneratedUI component (not a Redux shape). The canvas keyboard
    // handlers must stand down so Delete/etc. act on that inner element, not on
    // the whole canvas (which would otherwise switch to the eraser tool).
    const designSelection = useAppSelector((s) => s.presence?.designSelection ?? null)
    const designSelectionRef = useRef(designSelection)
    designSelectionRef.current = designSelection

    // onKeyDown sirf mount par register hota hai (stale closure), is liye latest
    // shapes ko bhi ref se padhte hain — frame ke children compute karne ke liye.
    const shapeListRef = useRef(shapeList)
    shapeListRef.current = shapeList

    const hasSelectedText = Object.keys(selectedShapes).some((id) => {
        const shape = shapesEntities[id]
        return shape?.type === 'text'
    })


    // If side bar is closed and user selects text, open sidebar. If user deselects text, close sidebar
    useEffect(() => {
        if (hasSelectedText && !isSidebarOpen) {
            setIsSidebarOpen(true)
        } else if (!hasSelectedText) {
            setIsSidebarOpen(false)
        }
    }, [hasSelectedText, selectedShapes])

    const canvasRef = useRef<HTMLDivElement | null>(null)
    const touchMapRef = useRef<Map<number, TouchPointer>>(new Map())

    const draftShapeRef = useRef<DraftShape | null>(null) // Shape that has been drawn before finalizing, used for showing shape while drawing
    const freeDrawPointsRef = useRef<Point[]>([]) // For storing points while free drawing
    const isSpacePressed = useRef(false) //For keyboard shortcuts 
    const isDrawingRef = useRef(false)
    const isMovingRef = useRef(false)
    const moveStartRef = useRef<Point | null>(null)

    const initialShapePositionsRef = useRef<
        Record<
            string,
            {
                x?: number
                y?: number
                points?: Point[]
                startX?: number
                startY?: number
                endX?: number
                endY?: number
            }
        >
    >({})

    const isErasingRef = useRef(false)
    const erasedShapesRef = useRef<Set<string>>(new Set())
    const isResizingRef = useRef(false)
    const resizeDataRef = useRef<{
        shapeId: string
        corner: string
        initialBounds: { x: number; y: number; w: number; h: number }
        startPoint: { x: number; y: number }
    } | null>(null)

    // For animation
    const lastFreehandFrameRef = useRef(0)
    const freehandRafRef = useRef<number | null>(null)
    const panRafRef = useRef<number | null>(null)
    const pendingPanPointRef = useRef<Point | null>(null)

    // Utility Section
    const [, force] = useState(0)
    const requestRender = (): void => {
        force((n) => (n + 1) | 0)
    }

    const localPointFromClient = (clientX: number, clientY: number): Point => {
        const el = canvasRef.current
        if (!el) return { x: clientX, y: clientY }
        const r = el.getBoundingClientRect()
        return { x: clientX - r.left, y: clientY - r.top }
    }

    const blurActiveTextInput = () => {
        const activeElement = document.activeElement
        if (activeElement && activeElement.tagName === 'INPUT') {
            ; (activeElement as HTMLInputElement).blur()
        }
    }

    type WithClientXY = { clientX: number; clientY: number }
    const getLocalPointFromPtr = (e: WithClientXY): Point =>
        localPointFromClient(e.clientX, e.clientY)

    // Shape hit testing
    const getShapeAtPoint = (worldPoint: Point): Shape | null => {
        for (let i = shapeList.length - 1; i >= 0; i--) {
            const shape = shapeList[i]
            if (isPointInShape(worldPoint, shape)) {
                return shape

            }
        }
        return null
    }

    const isPointInShape = (point: Point, shape: Shape): boolean => {
        switch (shape.type) {
            case 'frame':
            case 'rect':
            case 'ellipse':
            case 'generatedui':
                return (
                    point.x >= shape.x &&
                    point.x <= shape.x + shape.w &&
                    point.y >= shape.y &&
                    point.y <= shape.y + shape.h
                )

            case 'freedraw':
                const threshold = 5
                for (let i = 0; i < shape.points.length - 1; i++) {
                    const p1 = shape.points[i]
                    const p2 = shape.points[i + 1]
                    if (distanceToLineSegment(point, p1, p2) <= threshold) {
                        return true
                    }
                }
                return false
            case 'arrow':
            case 'line':
                const lineThreshold = 8
                return (
                    distanceToLineSegment(
                        point,
                        { x: shape.startX, y: shape.startY },
                        { x: shape.endX, y: shape.endY }
                    ) <= lineThreshold
                )

            case 'text':
                const textWidth = Math.max(
                    shape.text.length * (shape.fontSize * 0.6),
                    100
                )
                const textHeight = shape.fontSize * 1.2
                const padding = 8

                return (
                    point.x >= shape.x - 2 &&
                    point.x <= shape.x + textWidth + padding + 2 &&
                    point.y >= shape.y - 2 &&
                    point.y <= shape.y + textHeight + padding + 2
                )

            default:
                return false
        }
    }

    const distanceToLineSegment = (
        point: Point,
        lineStart: Point,
        lineEnd: Point
    ): number => {
        const A = point.x - lineStart.x
        const B = point.y - lineStart.y
        const C = lineEnd.x - lineStart.x
        const D = lineEnd.y - lineStart.y

        const dot = A * C + B * D
        const lenSq = C * C + D * D

        let param = -1
        if (lenSq !== 0) param = dot / lenSq

        let xx, yy
        if (param < 0) {
            xx = lineStart.x
            yy = lineStart.y
        } else if (param > 1) {
            xx = lineEnd.x
            yy = lineEnd.y
        } else {
            xx = lineStart.x + param * C
            yy = lineStart.y + param * D
        }
        const dx = point.x - xx
        const dy = point.y - yy
        return Math.sqrt(dx * dx + dy * dy)
    }
    // Improve Performance with animations
    const schedulePanMove = (p: Point) => {
        pendingPanPointRef.current = p
        if (panRafRef.current != null) return
        panRafRef.current = window.requestAnimationFrame(() => {
            panRafRef.current = null
            const next = pendingPanPointRef.current
            if (next) dispatch(panMove(next))
        })
    }

    const freehandTick = (): void => {
        const now = performance.now()

        if (now - lastFreehandFrameRef.current >= RAF_INTERVAL_MS) {
            if (freeDrawPointsRef.current.length > 0) requestRender()
            lastFreehandFrameRef.current = now
        }
        if (isDrawingRef.current) {
            freehandRafRef.current = window.requestAnimationFrame(freehandTick)
        }
    }

    const onWheel = (e: WheelEvent) => {
        e.preventDefault()
        const originScreen = localPointFromClient(e.clientX, e.clientY)
        if (e.ctrlKey || e.metaKey) {
            dispatch(wheelZoom({ deltaY: e.deltaY, originScreen }))
        } else {
            const dx = e.shiftKey ? e.deltaY : e.deltaX
            const dy = e.shiftKey ? 0 : e.deltaY  //when user click on the canvas then decide which action should be taken
            dispatch(wheelPan({ dx: -dx, dy: -dy }))
        }
    }

    const onPointerDown: React.PointerEventHandler<HTMLDivElement> = (e) => {
        const target = e.target as HTMLElement
        const isButton =
            target.tagName === 'BUTTON' ||
            target.closest('button') ||
            target.classList.contains('pointer-events-auto') ||
            target.closest('.pointer-events-auto')

        if (!isButton) {
            e.preventDefault()
        } else {
            console.log(
                'Not preventing default - clicked on interactive element: ',
                target
            )
            return // Don't handle canvas interactions when clicking buttons
        }
        const local = getLocalPointFromPtr(e.nativeEvent)
        const world = screenToWorld(local, viewport.translate, viewport.scale)
        sendCursor(world)
        if (isViewer) {
            const isPanButton = e.button === 1 || e.button === 2
            const panByShift = isSpacePressed.current && e.button === 0
            if (isPanButton || panByShift) {
                canvasRef.current?.setPointerCapture?.(e.pointerId)
                dispatch(
                    panStart({
                        screen: local,
                        mode: isSpacePressed.current ? 'shiftPanning' : 'panning',
                    })
                )
            }
            return
        }        

        if (touchMapRef.current.size <= 1) {
            canvasRef.current?.setPointerCapture?.(e.pointerId)
            const isPanButton = e.button === 1 || e.button === 2
            const panByShift = isSpacePressed.current && e.button === 0
            if (isPanButton || panByShift) {
                const mode = isSpacePressed.current ? 'shiftPanning' : 'panning'
                dispatch(panStart({ screen: local, mode }))
                return
            }
            if (e.button === 0) {
                if (currentTool === 'select') {
                    const hitShape = getShapeAtPoint(world)
                    if (hitShape) {
                        const isAlreadySelected = selectedShapes[hitShape.id]
                        if (!isAlreadySelected) {
                            if (!e.shiftKey) dispatch(clearSelection())
                            dispatch(selectShape(hitShape.id))
                        }
                        isMovingRef.current = true
                        moveStartRef.current = world

                        initialShapePositionsRef.current = {}
                        Object.keys(selectedShapes).forEach((id) => {
                            const shape = entityState.entities[id]
                            if (shape) {
                                if (
                                    shape.type === 'frame' ||
                                    shape.type === 'rect' ||
                                    shape.type === 'ellipse' ||
                                    shape.type === 'generatedui'
                                ) {
                                    initialShapePositionsRef.current[id] = {
                                        x: shape.x,
                                        y: shape.y,
                                    }
                                }
                                else if (shape.type === 'freedraw') {
                                    initialShapePositionsRef.current[id] = {
                                        points: [...shape.points],
                                    }
                                } else if (shape.type === 'arrow' || shape.type === 'line') {
                                    initialShapePositionsRef.current[id] = {
                                        startX: shape.startX,
                                        startY: shape.startY,
                                        endX: shape.endX,
                                        endY: shape.endY,
                                    }
                                }
                                else if (shape.type === 'text') {
                                    initialShapePositionsRef.current[id] = {
                                        x: shape.x,
                                        y: shape.y,
                                    }
                                }
                            }
                        })
                        if (
                            hitShape.type === 'frame' ||
                            hitShape.type === 'rect' ||
                            hitShape.type === 'ellipse' ||
                            hitShape.type === 'generatedui'
                        ) {
                            initialShapePositionsRef.current[hitShape.id] = {
                                x: hitShape.x,
                                y: hitShape.y,
                            }
                        }
                        else if (hitShape.type === 'freedraw') {
                            initialShapePositionsRef.current[hitShape.id] = {
                                points: [...hitShape.points],
                            }
                        }
                        else if (hitShape.type === 'arrow' || hitShape.type === 'line') {
                            initialShapePositionsRef.current[hitShape.id] = {
                                startX: hitShape.startX,
                                startY: hitShape.startY,
                                endX: hitShape.endX,
                                endY: hitShape.endY,
                            }
                        }
                        else if (hitShape.type === 'text') {
                            initialShapePositionsRef.current[hitShape.id] = {
                                x: hitShape.x,
                                y: hitShape.y,
                            }
                        }

                        // 🔲 Frame select hone par uske andar ki saari shapes uske
                        // SAATH move ho (Figma jaisa group behaviour), lekin unka
                        // apna selection highlight NA dikhe — sirf frame selected lage
                        // taake mehsoos ho ke yeh ek hi unit hai. Is liye children ko
                        // select NAHI karte, sirf unki move-positions record karte hain
                        // (move initialShapePositionsRef se hota hai, selection se nahi).
                        if (hitShape.type === 'frame') {
                            const children = getShapesInsideFrame(shapeList, hitShape)
                            children.forEach((child) => {
                                if (
                                    child.type === 'rect' ||
                                    child.type === 'ellipse' ||
                                    child.type === 'frame' ||
                                    child.type === 'generatedui' ||
                                    child.type === 'text'
                                ) {
                                    initialShapePositionsRef.current[child.id] = {
                                        x: child.x,
                                        y: child.y,
                                    }
                                } else if (child.type === 'freedraw') {
                                    initialShapePositionsRef.current[child.id] = {
                                        points: [...child.points],
                                    }
                                } else if (child.type === 'arrow' || child.type === 'line') {
                                    initialShapePositionsRef.current[child.id] = {
                                        startX: child.startX,
                                        startY: child.startY,
                                        endX: child.endX,
                                        endY: child.endY,
                                    }
                                }
                            })
                        }
                    }
                    else {
                        // Clicked on empty space - clear selection and blur any active text inputs
                        if (!e.shiftKey) {
                            dispatch(clearSelection())
                            blurActiveTextInput()
                        }
                    }
                }
                else if (currentTool === 'eraser') {
                    isErasingRef.current = true
                    erasedShapesRef.current.clear()
                    const hitShape = getShapeAtPoint(world)
                    if (hitShape) {
                        dispatch(removeShape(hitShape.id))
                        erasedShapesRef.current.add(hitShape.id)
                    } else {
                        blurActiveTextInput()
                    }
                }
                else if (currentTool === 'text') {
                    dispatch(addText({ x: world.x, y: world.y }))
                    dispatch(setTool('select'))
                }
                else {
                    isDrawingRef.current = true
                    if (
                        currentTool === 'frame' ||
                        currentTool === 'rect' ||
                        currentTool === 'ellipse' ||
                        currentTool === 'arrow' ||
                        currentTool === 'line'
                    ) {
                        console.log('Starting to draw:', currentTool, 'at:', world)
                        draftShapeRef.current = {
                            type: currentTool,
                            startWorld: world,
                            currentWorld: world,
                        }
                        requestRender()
                    } else if (currentTool === 'freedraw') {
                        freeDrawPointsRef.current = [world]
                        lastFreehandFrameRef.current = performance.now()
                        freehandRafRef.current = window.requestAnimationFrame(freehandTick)
                        requestRender()
                    }
                }
            }
        }
    }

    const onPointerMove: React.PointerEventHandler<HTMLDivElement> = (e) => {
        const local = getLocalPointFromPtr(e.nativeEvent)
        const world = screenToWorld(local, viewport.translate, viewport.scale)

        // Broadcast live cursor on every move (hover + drag), not just on click.
        // The mutation is throttled inside useCursorBroadcast.
        sendCursor(world)

        if (viewport.mode === 'panning' || viewport.mode === 'shiftPanning') {
            schedulePanMove(local)
            return
        }
        if (isErasingRef.current && currentTool === 'eraser') {
            const hitShape = getShapeAtPoint(world)
            if (hitShape && !erasedShapesRef.current.has(hitShape.id)) {
                // Delete the shape if we haven't already deleted it in this drag
                dispatch(removeShape(hitShape.id))
                erasedShapesRef.current.add(hitShape.id)
            }
        }

        if (
            isMovingRef.current &&
            moveStartRef.current &&
            currentTool === 'select'
        ) {
            const deltaX = world.x - moveStartRef.current.x
            const deltaY = world.y - moveStartRef.current.y

            Object.keys(initialShapePositionsRef.current).forEach((id) => {
                const initialPos = initialShapePositionsRef.current[id]
                const shape = entityState.entities[id]

                if (shape && initialPos) {
                    if (
                        shape.type === 'frame' ||
                        shape.type === 'rect' ||
                        shape.type === 'ellipse' ||
                        shape.type === 'text' ||
                        shape.type === 'generatedui'
                    ) {
                        if (
                            typeof initialPos.x === 'number' &&
                            typeof initialPos.y === 'number'
                        ) {
                            // Update the shape's position
                            dispatch(
                                updateShape({
                                    id,
                                    patch: {
                                        x: initialPos.x + deltaX,
                                        y: initialPos.y + deltaY,
                                    },
                                })
                            )
                        }
                    }

                    else if (shape.type === 'freedraw') {
                        const initialPoints = initialPos.points
                        if (initialPoints) {
                            const newPoints = initialPoints.map((point) => ({
                                x: point.x + deltaX,
                                y: point.y + deltaY,
                            }))
                            dispatch(
                                updateShape({
                                    id,
                                    patch: {
                                        points: newPoints,
                                    },
                                })
                            )
                        }
                    }

                    else if (shape.type === 'arrow' || shape.type === 'line') {
                        if (
                            typeof initialPos.startX === 'number' &&
                            typeof initialPos.startY === 'number' &&
                            typeof initialPos.endX === 'number' &&
                            typeof initialPos.endY === 'number'
                        ) {
                            dispatch(
                                updateShape({
                                    id,
                                    patch: {
                                        startX: initialPos.startX + deltaX,
                                        startY: initialPos.startY + deltaY,
                                        endX: initialPos.endX + deltaX,
                                        endY: initialPos.endY + deltaY,
                                    },
                                })
                            )
                        }
                    }
                }
            })
        }
        if (isDrawingRef.current) {
            if (draftShapeRef.current) {
                draftShapeRef.current.currentWorld = world
                requestRender()
            } else if (currentTool === 'freedraw') {
                freeDrawPointsRef.current.push(world)
            }
        }
    }

    const finalizeDrawingIfAny = (): void => {
        if (!isDrawingRef.current) return
        isDrawingRef.current = false

        if (freehandRafRef.current) {
            window.cancelAnimationFrame(freehandRafRef.current)
            freehandRafRef.current = null
        }

        const draft = draftShapeRef.current
        if (draft) {
            const x = Math.min(draft.startWorld.x, draft.currentWorld.x)
            const y = Math.min(draft.startWorld.y, draft.currentWorld.y)
            const w = Math.abs(draft.currentWorld.x - draft.startWorld.x)
            const h = Math.abs(draft.currentWorld.y - draft.startWorld.y)

            if (w > 1 && h > 1) {
                if (draft.type === 'frame') {
                    console.log('Adding frame shape: ', { x, y, w, h })
                    dispatch(addFrame({ x, y, w, h }))
                } else if (draft.type === 'rect') {
                    dispatch(addRect({ x, y, w, h }))
                } else if (draft.type === 'ellipse') {
                    dispatch(addEllipse({ x, y, w, h }))
                } else if (draft.type === 'arrow') {
                    dispatch(
                        addArrow({
                            startX: draft.startWorld.x,
                            startY: draft.startWorld.y,
                            endX: draft.currentWorld.x,
                            endY: draft.currentWorld.y,
                        })
                    )
                } else if (draft.type === 'line') {
                    dispatch(
                        addLine({
                            startX: draft.startWorld.x,
                            startY: draft.startWorld.y,
                            endX: draft.currentWorld.x,
                            endY: draft.currentWorld.y,
                        })
                    )
                }
            }
            draftShapeRef.current = null
        } else if (currentTool === 'freedraw') {
            const pts = freeDrawPointsRef.current
            if (pts.length > 1) {
                dispatch(addFreeDrawShape({ points: pts }))
            }
            freeDrawPointsRef.current = []
        }
        requestRender()
    }
    const onPointerUp: React.PointerEventHandler<HTMLDivElement> = (e) => {
        canvasRef.current?.releasePointerCapture?.(e.pointerId)

        if (viewport.mode === 'panning' || viewport.mode === 'shiftPanning') {
            dispatch(panEnd())
        }

        if (isMovingRef.current) {
            isMovingRef.current = false
            moveStartRef.current = null

            // Commit the final positions as a single undo history entry.
            // Only the first shape needs commitShapeUpdate to create the entry;
            // the actual positions are already set by the intermediate updateShape calls.
            const movedIds = Object.keys(initialShapePositionsRef.current)
            if (movedIds.length > 0) {
                const firstId = movedIds[0]
                const shape = entityState.entities[firstId]
                if (shape) {
                    // Dispatch a no-op commit to snapshot current state into undo history
                    dispatch(commitShapeUpdate({ id: firstId, patch: {} }))
                }
            }

            initialShapePositionsRef.current = {}
        }

        if (isErasingRef.current) {
            isErasingRef.current = false
            erasedShapesRef.current.clear()
        }

        finalizeDrawingIfAny()
    }

    const onPointerCancel: React.PointerEventHandler<HTMLDivElement> = (e) => {
        onPointerUp(e)
    }

    const onKeyDown = (e: KeyboardEvent): void => {
        // Ignore shortcuts when user is typing in an input/textarea
        const tag = (e.target as HTMLElement)?.tagName
        const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable

        if ((e.code === 'ShiftLeft' || e.code === 'ShiftRight') && !e.repeat) {
            e.preventDefault()
            isSpacePressed.current = true
            dispatch(handToolEnable())
        }

        // Ctrl+Z → Undo (text field me type karte waqt ignore — wahan native
        // text undo chale)
        if (!isTyping && (e.ctrlKey || e.metaKey) && e.code === 'KeyZ' && !e.shiftKey) {
            e.preventDefault()
            undoHistory()
        }

        // Ctrl+Y or Ctrl+Shift+Z → Redo
        if (
            !isTyping &&
            ((e.ctrlKey || e.metaKey) && e.code === 'KeyY' ||
                (e.ctrlKey || e.metaKey) && e.shiftKey && e.code === 'KeyZ')
        ) {
            e.preventDefault()
            redoHistory()
        }

        // Delete / Backspace → delete selected shapes OR activate eraser
        if ((e.code === 'Delete' || e.code === 'Backspace') && !isTyping) {
            // An inner Generated-UI element is selected → let that component
            // handle the delete; don't touch canvas shapes or the eraser tool.
            if (designSelectionRef.current) return
            e.preventDefault()
            const hasSelection = Object.keys(selectedShapesRef.current).length > 0
            if (hasSelection) {
                // Frame ko single object ki tarah treat karo: agar koi frame selected
                // hai to delete se pehle uske andar ki saari shapes bhi selection me
                // daal do, taake pura frame (uske children ke saath) ek hi action me
                // delete ho. selectShape history me entry nahi banata, deleteSelected
                // ek hi undo entry banata hai.
                Object.keys(selectedShapesRef.current).forEach((id) => {
                    const shape = shapeListRef.current.find((s) => s.id === id)
                    if (shape?.type === 'frame') {
                        getShapesInsideFrame(shapeListRef.current, shape).forEach((child) =>
                            dispatch(selectShape(child.id))
                        )
                    }
                })
                // Delete all selected shapes, then go back to select tool
                dispatch(deleteSelected())
                dispatch(setTool('select'))
            } else {
                // No shape selected → activate eraser tool
                dispatch(setTool('eraser'))
            }
            // Remove focus from toolbar buttons so focus ring doesn't persist
            ; (document.activeElement as HTMLElement)?.blur()
        }

        // Escape → clear selection + cancel any active drawing tool → back to select
        if (e.code === 'Escape') {
            e.preventDefault()
            // Cancel any in-progress drawing
            if (isDrawingRef.current) {
                isDrawingRef.current = false
                draftShapeRef.current = null
                freeDrawPointsRef.current = []
                if (freehandRafRef.current) {
                    window.cancelAnimationFrame(freehandRafRef.current)
                    freehandRafRef.current = null
                }
            }
            // Clear selection and reset to select tool
            dispatch(clearSelection())
            dispatch(setTool('select'))
                // Remove focus from toolbar buttons so focus ring doesn't persist
                ; (document.activeElement as HTMLElement)?.blur()
        }
    }

    const onKeyUp = (e: KeyboardEvent): void => {
        if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
            e.preventDefault()
            isSpacePressed.current = false
            dispatch(handToolDisable())
        }
    }

    useEffect(() => {
        // useInfiniteCanvas 3 jagah mount hota hai (canvas + 2 toolbars). Agar
        // har instance global keydown listener lagaye to ek Ctrl+Z = multiple
        // undo() dispatch hota hai (2-3 shapes ek saath hat-ti hain). Is liye
        // shortcuts SIRF main canvas instance bind kare (bindGlobalShortcuts).
        if (bindGlobalShortcuts) {
            document.addEventListener('keydown', onKeyDown)
            document.addEventListener('keyup', onKeyUp)
        }

        return () => {
            if (bindGlobalShortcuts) {
                document.removeEventListener('keydown', onKeyDown)
                document.removeEventListener('keyup', onKeyUp)
            }
            if (freehandRafRef.current)
                window.cancelAnimationFrame(freehandRafRef.current)
            if (panRafRef.current) window.cancelAnimationFrame(panRafRef.current)
        }
    }, [])

    useEffect(() => {
        const handleResizeStart = (e: CustomEvent) => {
            const { shapeId, corner, bounds } = e.detail
            isResizingRef.current = true
            resizeDataRef.current = {
                shapeId,
                corner,
                initialBounds: bounds,
                startPoint: { x: e.detail.clientX || 0, y: e.detail.clientY || 0 },
            }
        }

        const handleResizeMove = (e: CustomEvent) => {
            if (!isResizingRef.current || !resizeDataRef.current) return
            const { shapeId, corner, initialBounds } = resizeDataRef.current
            const { clientX, clientY } = e.detail

            const canvasEl = canvasRef.current
            if (!canvasEl) return

            const rect = canvasEl.getBoundingClientRect()
            const localX = clientX - rect.left
            const localY = clientY - rect.top
            const world = screenToWorld(
                { x: localX, y: localY },
                viewport.translate,
                viewport.scale
            )

            const shape = entityState.entities[shapeId]

            if (!shape) return

            const newBounds = { ...initialBounds }

            switch (corner) {
                case 'nw':  //north west corner (top left)
                    newBounds.w = Math.max(
                        10,
                        initialBounds.w + (initialBounds.x - world.x)
                    )

                    newBounds.h = Math.max(
                        10,
                        initialBounds.h + (initialBounds.y - world.y)
                    )
                    newBounds.x = world.x
                    newBounds.y = world.y
                    break

                case 'ne': //north east corner (top right)
                    newBounds.w = Math.max(
                        10,
                        world.x - initialBounds.x
                    )
                    newBounds.h = Math.max(
                        10,
                        initialBounds.h + (initialBounds.y - world.y)
                    )
                    newBounds.y = world.y
                    break

                case 'sw': //south west corner (bottom left)
                    newBounds.w = Math.max(
                        10,
                        initialBounds.w + (initialBounds.x - world.x)
                    )
                    newBounds.h = Math.max(
                        10,
                        world.y - initialBounds.y
                    )
                    newBounds.x = world.x
                    break

                case 'se': //south east corner (bottom right)
                    newBounds.w = Math.max(
                        10,
                        world.x - initialBounds.x
                    )
                    newBounds.h = Math.max(
                        10,
                        world.y - initialBounds.y
                    )
                    break
            }

            if (
                shape.type === 'frame' ||
                shape.type === 'rect' ||
                shape.type === 'ellipse' ||
                shape.type === 'generatedui'
            ) {
                dispatch(
                    updateShape({
                        id: shapeId,
                        patch: {
                            x: newBounds.x,
                            y: newBounds.y,
                            w: newBounds.w,
                            h: newBounds.h
                        },
                    })
                )
            }
            else if (shape.type === 'freedraw') {
                // For free draw, we will scale the points based on the change in width and height
                const xs = shape.points.map((p: { x: number; y: number }) => p.x)
                const ys = shape.points.map((p: { x: number; y: number }) => p.y)
                const actualMinX = Math.min(...xs)
                const actualMaxX = Math.max(...xs)
                const actualMinY = Math.min(...ys)
                const actualMaxY = Math.max(...ys)
                const actualWidth = actualMaxX - actualMinX
                const actualHeight = actualMaxY - actualMinY

                const newActualX = newBounds.x + 5 // Remove padding
                const newActualY = newBounds.y + 5
                const newActualWidth = Math.max(10, newBounds.w - 10) // Minimum size and remove padding
                const newActualHeight = Math.max(10, newBounds.h - 10)

                const scaleX = actualWidth > 0 ? newActualWidth / actualWidth : 1
                const scaleY = actualHeight > 0 ? newActualHeight / actualHeight : 1

                const scaledPoints = shape.points.map(
                    (point: { x: number; y: number }) => ({
                        x: newActualX + (point.x - actualMinX) * scaleX,
                        y: newActualY + (point.y - actualMinY) * scaleY,

                    })
                )
                dispatch(
                    updateShape({
                        id: shapeId,
                        patch: {
                            points: scaledPoints,
                        },
                    })
                )
            }

            else if (shape.type === 'arrow' || shape.type === 'line') {
                // For arrows and lines, we will only scale the start and end points
                const actualMinX = Math.min(shape.startX, shape.endX)
                const actualMaxX = Math.max(shape.startX, shape.endX)
                const actualMinY = Math.min(shape.startY, shape.endY)
                const actualMaxY = Math.max(shape.startY, shape.endY)
                const actualWidth = actualMaxX - actualMinX
                const actualHeight = actualMaxY - actualMinY

                const newActualX = newBounds.x + 5
                const newActualY = newBounds.y + 5
                const newActualWidth = Math.max(10, newBounds.w - 10)
                const newActualHeight = Math.max(10, newBounds.h - 10)

                let newStartX, newStartY, newEndX, newEndY
                if (actualWidth === 0) {
                    newStartX = newActualX + newActualWidth / 2
                    newEndX = newActualX + newActualWidth / 2
                    newStartY =
                        shape.startY < shape.endY
                            ? newActualY
                            : newActualY + newActualHeight
                    newEndY =
                        shape.startY < shape.endY
                            ? newActualY + newActualHeight
                            : newActualY
                }
                else if (actualHeight === 0) {
                    newStartY = newActualY + newActualHeight / 2
                    newEndY = newActualY + newActualHeight / 2
                    newStartX =
                        shape.startX < shape.endX ? newActualX : newActualX + newActualWidth
                    newEndX =
                        shape.startX < shape.endX ? newActualX + newActualWidth : newActualX
                }
                else {
                    const scaleX = newActualWidth / actualWidth
                    const scaleY = newActualHeight / actualHeight

                    newStartX = newActualX + (shape.startX - actualMinX) * scaleX
                    newStartY = newActualY + (shape.startY - actualMinY) * scaleY
                    newEndX = newActualX + (shape.endX - actualMinX) * scaleX
                    newEndY = newActualY + (shape.endY - actualMinY) * scaleY
                }

                dispatch(
                    updateShape({
                        id: shapeId,
                        patch: {
                            startX: newStartX,
                            startY: newStartY,
                            endX: newEndX,
                            endY: newEndY,
                        }
                    })
                )
            }
        }

        const handleResizeEnd = () => {
            // Commit the final resize as a single undo history entry
            if (resizeDataRef.current) {
                const { shapeId } = resizeDataRef.current
                dispatch(commitShapeUpdate({ id: shapeId, patch: {} }))
            }
            isResizingRef.current = false
            resizeDataRef.current = null
        }
        window.addEventListener(
            'shape-resize-start',
            handleResizeStart as EventListener
        )
        window.addEventListener(
            'shape-resize-move',
            handleResizeMove as EventListener
        )
        window.addEventListener(
            'shape-resize-end',
            handleResizeEnd as EventListener
        )

        return () => {
            window.removeEventListener(
                'shape-resize-start',
                handleResizeStart as EventListener
            )
            window.removeEventListener(
                'shape-resize-move',
                handleResizeMove as EventListener
            )
            window.removeEventListener(
                'shape-resize-end',
                handleResizeEnd as EventListener

            )
        }
    }, [dispatch, entityState.entities, viewport.translate, viewport.scale])

    const attachCanvasRef = (ref: HTMLDivElement | null): void => {
        // Clean up any existing event listeners on the old canvas
        if (canvasRef.current) {
            canvasRef.current.removeEventListener('wheel', onWheel)
        }

        // Store the new canvas reference
        canvasRef.current = ref

        // Add wheel event listener to the new canvas (for zoom/pan)
        if (ref) {
            ref.addEventListener('wheel', onWheel, { passive: false })
        }
    }

    const selectTool = (tool: Tool): void => {
        dispatch(setTool(tool))
    }

    const getDraftShape = (): DraftShape | null => draftShapeRef.current
    const getFreeDrawPoints = (): ReadonlyArray<Point> =>
        freeDrawPointsRef.current

    return {
        //states 
        viewport,
        shapes: shapeList,
        currentTool,
        selectedShapes,
        canUndo,
        canRedo,

        // handlers
        onPointerDown,
        onPointerMove,
        onPointerUp,
        onPointerCancel,

        // helpers
        attachCanvasRef,
        selectTool,
        getDraftShape,
        getFreeDrawPoints,
        isSidebarOpen,
        hasSelectedText,
        setIsSidebarOpen,
    }
}

// Frame -> snapshot(Exporting design like a screenshot) -> Ai API -> Generate UI
export const useFrame = (shape: FrameShape) => {
    const dispatch = useAppDispatch()
    const router = useRouter()
    const [isGenerating, setIsGenerating] = useState(false)

    // AbortController se user beech mein generation cancel kar sakta hai. Jo
    // generatedUI shape ban chuki ho usay cancel par hata diya jata hai.
    const abortControllerRef = useRef<AbortController | null>(null)
    const generatedUIIdRef = useRef<string | null>(null)

    const allShapes = useAppSelector((state) =>
        Object.values(state.shapes.present.shapes?.entities || {}).filter(
            (shape): shape is Shape => shape !== undefined
        )
    )

    const userId = useAppSelector((state) => state.profile?.id)
    const userName = useAppSelector((state) => state.profile?.name)

    // Live credit balance — generate karne se pehle yahin se check kar lete hain
    const creditBalance = useQuery(
        api.subscription.getCreditsBalance,
        userId ? { userId: userId as Id<'users'> } : 'skip'
    )

    // Credits khatam hone par user ko message + payment page ka button dikhao
    const notifyInsufficientCredits = () => {
        toast.error(
            "You don't have enough credits. Buy credits to generate with AI.",
            {
                duration: 8000,
                action: {
                    label: 'Buy Credits',
                    onClick: () =>
                        router.push(`/billing/${combinedSlug(userName ?? '')}`),
                },
            }
        )
    }

    // ToDo: save in the backend
    const handleGenerateDesign = async () => {
        // Pre-check: credits 0 (ya kam) hain to seedha message dikha do, AI call
        // karne ki zaroorat nahi
        if (typeof creditBalance === 'number' && creditBalance <= 0) {
            notifyInsufficientCredits()
            return
        }
        const controller = new AbortController()
        abortControllerRef.current = controller
        generatedUIIdRef.current = null
        try {
            setIsGenerating(true)
            const snapshot = await generateFrameSnapshot(shape, allShapes)
            downloadBlob(snapshot, `frame-${shape.frameNumber}-snapshot.png`) //for ai

            const formData = new FormData()
            formData.append('image', snapshot, `frame-${shape.frameNumber}.png`)
            formData.append('frameNumber', shape.frameNumber.toString())
            formData.append('frameWidth', shape.w.toString())
            formData.append('frameHeight', shape.h.toString())            

            const urlParams = new URLSearchParams(window.location.search)
            const projectId = urlParams.get('project')
            if (projectId) {
                formData.append('projectId', projectId)
            }

            const response = await fetch('/api/generate', {
                method: 'POST',
                body: formData,
                signal: controller.signal,
            })

            if (!response.ok) {
                const errorText = await response.text()
                // Server credits na hone par 400 + "credits" wala message deta hai —
                // is case me generic error ke bajaye buy-credits message dikhao
                if (response.status === 400 && /credit/i.test(errorText)) {
                    notifyInsufficientCredits()
                    return
                }
                throw new Error(
                    `API request failed: ${response.status} ${response.statusText} - ${errorText}`
                )
            }

            //If no error, then we can assume the response is correct and contains the generated UI spec. Positioning UI design next to the frame
            const isDesktopFrame = shape.w >= shape.h
            const generatedUIPosition = {
                x: shape.x + shape.w + 50, // 50px spacing from frame
                y: shape.y,
                // Desktop (landscape) sketch ke liye box ko full desktop width do
                // taake AI ka horizontal/multi-column layout sahi render ho,
                // narrow mobile column na bane
                w: isDesktopFrame ? 1280 : Math.max(400, shape.w),
                h: Math.max(300, shape.h),
            }

            const generatedUIId = nanoid()
            generatedUIIdRef.current = generatedUIId

            dispatch(
                addGeneratedUI({
                    ...generatedUIPosition,
                    id: generatedUIId,
                    uiSpecData: null, // Start with null for live rendering
                    sourceFrameId: shape.id,
                })
            )
            const reader = response.body?.getReader()
            const decoder = new TextDecoder()
            let accumulatedMarkup = ''

            let lastUpdateTime = 0
            const UPDATE_THROTTLE_MS = 200

            if (reader) {
                try {
                    while (true) {
                        const { done, value } = await reader.read()
                        if (done) {
                            // Update with final accumulated markup
                            dispatch(
                                updateShape({
                                    id: generatedUIId,
                                    patch: { uiSpecData: accumulatedMarkup },
                                })
                            )
                            break
                        }
                        const chunk = decoder.decode(value)
                        accumulatedMarkup += chunk

                        const now = Date.now()
                        if (now - lastUpdateTime >= UPDATE_THROTTLE_MS) {
                            dispatch(
                                updateShape({
                                    id: generatedUIId,
                                    patch: { uiSpecData: accumulatedMarkup },
                                })
                            )
                            lastUpdateTime = now
                        }
                    }
                } finally {
                    reader.releaseLock()
                }
            }
        } catch (error) {
            // User ne cancel kiya — partial generatedUI shape hata do, error toast mat dikhao
            if (error instanceof DOMException && error.name === 'AbortError') {
                if (generatedUIIdRef.current) {
                    dispatch(removeShape(generatedUIIdRef.current))
                }
                toast.info('Design generation cancelled')
            } else {
                toast.error(
                    `Failed to generate UI design: ${error instanceof Error ? error.message : 'Unknown error'}`
                )
            }
        } finally {
            setIsGenerating(false)
            abortControllerRef.current = null
            generatedUIIdRef.current = null
        }
    }

    // Beech mein chal rahi AI generation rokne ke liye
    const cancelGeneration = () => {
        abortControllerRef.current?.abort()
    }

    // "Frame N" label par click karne se:
    //  1) Tool automatically 'select' ho jata hai (taake foran drag/move ho sake)
    //  2) Sirf frame select hota hai — children select NAHI hote (highlight na ho),
    //     lekin frame ko drag karne par woh frame ke saath move karte hain
    //     (onPointerDown ka frame-children block unki positions record kar leta hai).
    const selectFrameWithChildren = () => {
        dispatch(setTool('select'))
        dispatch(clearSelection())
        dispatch(selectShape(shape.id))
    }

    return {
        isGenerating,
        handleGenerateDesign,
        cancelGeneration,
        selectFrameWithChildren,
    }
}


export const useInspiration = () => {
    const [isInspirationOpen, setIsInspirationOpen] = useState(true)

    const toggleInspiration = () => {
        setIsInspirationOpen(!isInspirationOpen)
    }

    const openInspiration = () => {
        setIsInspirationOpen(true)
    }

    const closeInspiration = () => {
        setIsInspirationOpen(false)
    }

    return {
        isInspirationOpen,
        toggleInspiration,
        openInspiration,
        closeInspiration,
    }
}

// For Workflow
export const useWorkflowGeneration = () => {
    const dispatch = useAppDispatch()
    const [, { isLoading: isGeneratingWorkflow }] = useGenerateWorkflowMutation()

    const allShapes = useAppSelector((state) =>
        Object.values(state.shapes.present.shapes?.entities || {}).filter(
            (shape): shape is Shape => shape !== undefined
        )
    )
    const generateWorkflow = async (generatedUIId: string) => {
        try {
            const currentShape = allShapes.find((shape) => shape.id === generatedUIId)

            if (!currentShape || currentShape.type !== 'generatedui') {
                toast.error('Generated UI not found')
                return
            }

            if (!currentShape.uiSpecData) {
                toast.error('No design data to generate workflow from')
                return
            }
            const urlParams = new URLSearchParams(window.location.search)
            const projectId = urlParams.get('project')

            if (!projectId) {
                toast.error('Project ID not found')
                return
            }

            const pageCount = 4
            toast.loading('Generating workflow pages... ', {
                id: 'workflow-generation',
            })

            const baseX = currentShape.x + currentShape.w + 100
            const spacing = Math.max(currentShape.w + 50, 450)

            const workflowPromises = Array.from({ length: pageCount }).map(
                async (_, index) => {
                    try {
                        const response = await fetch('/api/generate/workflow', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                generatedUIId,
                                currentHTML: currentShape.uiSpecData,
                                projectId,
                                pageIndex: index,
                            }),
                        })

                        if (!response.ok) {
                            throw new Error(
                                `Failed to generate page ${index + 1}: ${response.status}`
                            )
                        }
                        const workflowPosition = {
                            x: baseX + index * spacing,
                            y: currentShape.y,
                            w: Math.max(400, currentShape.w), // At least 400px wide
                            h: Math.max(300, currentShape.h), // At Least 300px high
                        }

                        const workflowId = nanoid()
                        dispatch(
                            addGeneratedUI({
                                ...workflowPosition,
                                id: workflowId,
                                uiSpecData: null, // Start with null for live rendering
                                sourceFrameId: currentShape.sourceFrameId,
                                isWorkflowPage: true, // Mark as workflow page
                            })
                        )

                        const reader = response.body?.getReader()
                        const decoder = new TextDecoder()
                        let accumulatedHTML = ''

                        if (reader) {
                            while (true) {
                                const { done, value } = await reader.read()
                                if (done) break

                                const chunk = decoder.decode(value)
                                accumulatedHTML += chunk

                                // update local state for live rendering. Update the workflow page with the accumulated HTML
                                dispatch(
                                    updateShape({
                                        id: workflowId,
                                        patch: { uiSpecData: accumulatedHTML },
                                    })
                                )
                            }
                        }

                        return { pageIndex: index, success: true }
                    } catch (error) {
                        console.error(`Error generating workflow page ${index + 1}:`, error)
                        return { pageIndex: index, success: false, error }
                    }
                }
            )

            const results = await Promise.all(workflowPromises)
            const successCount = results.filter((r) => r.success).length
            const failureCount = results.length - successCount

            if (successCount === 4) {
                toast.success('✨ All 4 workflow pages generated successfully!', {
                    id: 'workflow-generation',
                })
            } else if (successCount > 0) {
                toast.success(
                    `✨ Generated ${successCount}/4 workflow pages successfully!`,
                    { id: 'workflow-generation' }
                )
                if (failureCount > 0) {
                    toast.error(`Failed to generate ${failureCount} workflow pages`)
                }
            }

            else {
                toast.error('Failed to generate workflow pages', {
                    id: 'workflow-generation',
                })
            }
        } catch (error) {
            console.error('Workflow generation error:', error)
            toast.error('Failed to generate workflow pages', {
                id: 'workflow-generation',
            })
        }
    }
    return {
        generateWorkflow,
        isGeneratingWorkflow,
    }
}

// ToDo: add chat window complete the open chat close and toggle functions
export const useGlobalChat = () => {
    const [isChatOpen, setIsChatOpen] = useState(false)
    const [activeGeneratedUIId, setActiveGeneratedUIId] = useState<string | null>(
        null
    )
    const { generateWorkflow } = useWorkflowGeneration()

    const exportDesign = async (
        generatedUIId: string,
        element: HTMLElement | null
    ) => {
        if (!element) {
            console.warn('❌ No element to export for shape:', generatedUIId)
            toast.error('No design element found for export.')
            return
        }

        try {
            const filename = `generated-ui-${generatedUIId.slice(0, 8)}.png`
            console.log(' Starting snapshot export:', { filename })

            await exportGeneratedUIAsPNG(element, filename)

            toast.success('Design exported successfully!')
        } catch (error) {
            console.error('❌ Failed to export GeneratedUI:', error)
            toast.error('Failed to export design. Please try again.')
        }
    }

    const openChat = (generatedUIId: string) => {
        setActiveGeneratedUIId(generatedUIId)
        setIsChatOpen(true)
    }

    const closeChat = () => {
        setIsChatOpen(false)
        setActiveGeneratedUIId(null)
    }

    const toggleChat = (generatedUIId: string) => {
        if (isChatOpen && activeGeneratedUIId === generatedUIId) {
            closeChat()
        } else {
            openChat(generatedUIId)
        }
    }

    return {
        isChatOpen,
        activeGeneratedUIId,
        openChat,
        closeChat,
        toggleChat,
        generateWorkflow,
        exportDesign,
    }
}

export const useChatWindow = (generatedUIId: string, isOpen: boolean) => {
    const [inputValue, setInputValue] = useState('')
    const scrollAreaRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const dispatch = useAppDispatch()
    const chatState = useAppSelector((state) => state.chat.chats[generatedUIId])
    const currentShape = useAppSelector(
        (state) => state.shapes.present?.shapes.entities[generatedUIId]
    )
    const allShapes = useAppSelector((state) => state.shapes.present?.shapes.entities ?? {})

    const getSourceFrame = (): FrameShape | null => {
        if (!currentShape || currentShape.type !== 'generatedui') {
            return null
        }
        const sourceFrameId = currentShape.sourceFrameId
        if (!sourceFrameId) {
            return null
        }

        const sourceFrame = allShapes[sourceFrameId]
        if (!sourceFrame || sourceFrame.type !== 'frame') {
            return null
        }
        return sourceFrame as FrameShape
    }

    useEffect(() => {
        if (isOpen) {
            dispatch(initializeChat(generatedUIId))
        }
    }, [dispatch, generatedUIId, isOpen])

    // For chat scrolling
    useEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
        }
    }, [chatState?.messages])

    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 100)
        }
    }, [isOpen])

    const handleSendMessage = async () => {
        if (!inputValue.trim() || chatState?.isStreaming) return

        const message = inputValue.trim()
        setInputValue('')
        try {
            dispatch(addUserMessage({ generatedUIId, content: message }))
            const responseId = `response-${Date.now()}`
            dispatch(startStreamingResponse({ generatedUIId, messageId: responseId }))

            const isWorkflowPage =
                currentShape?.type === 'generatedui' && currentShape.isWorkflowPage

            const urlParams = new URLSearchParams(window.location.search)
            const projectId = urlParams.get('project')

            if (!projectId) {
                throw new Error('Project ID not found in URL')
            }

            const baseRequestData = {
                userMessage: message,
                generatedUIId: generatedUIId,
                currentHTML:
                    currentShape?.type === 'generatedui' ? currentShape.uiSpecData : null,
                projectId: projectId, // Pass projectId in body
            }

            let apiEndpoint = '/api/generate/redesign'
            let wireframeSnapshot: string | null = null
            if (isWorkflowPage) {
                apiEndpoint = '/api/generate/workflow-redesign'
            } else {
                const sourceFrame = getSourceFrame()

                if (sourceFrame && sourceFrame.type === 'frame') {
                    try {
                        const allShapesArray = Object.values(allShapes).filter(
                            Boolean
                        ) as Shape[]

                        const snapshot = await generateFrameSnapshot(
                            sourceFrame,
                            allShapesArray
                        )

                        const arrayBuffer = await snapshot.arrayBuffer()
                        const base64 = btoa(
                            String.fromCharCode(...new Uint8Array(arrayBuffer))
                        )
                        wireframeSnapshot = base64

                    } catch (error) {
                        console.warn(
                            '⚠️ Failed to capture source wireframe snapshot:',
                            error
                        )
                    }
                }
                else {
                    console.warn('⚠️ No source frame available for wireframe snapshot')
                }
            }

            const requestData = isWorkflowPage
                ? baseRequestData
                : { ...baseRequestData, wireframeSnapshot }

            const response = await fetch(apiEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestData),
            })

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status}`)
            }

            const reader = response.body?.getReader()
            const decoder = new TextDecoder()
            let accumulatedHTML = ''

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read()
                    if (done) break

                    const chunk = decoder.decode(value)
                    accumulatedHTML += chunk

                    // Update streaming message with "Regenerating design..."
                    dispatch(
                        updateStreamingContent({
                            generatedUIId,
                            messageId: responseId,
                            content: 'Regenerating your design...',
                        })
                    )

                    // Update the GeneratedUI shape with new HTML in real-time
                    dispatch(
                        updateShape({
                            id: generatedUIId,
                            patch: { uiSpecData: accumulatedHTML },
                        })
                    )
                }
            }

            dispatch(
                finishStreamingResponse({
                    generatedUIId,
                    messageId: responseId,
                    finalContent: '✨ Design regenerated successfully!',

                })
            )
        } catch (error) {
            console.error('Chat error:', error)
            dispatch(
                addErrorMessage({
                    generatedUIId,
                    error: error instanceof Error ? error.message : 'Unknown error',
                })
            )
            toast.error('Failed to regenerate design')

        }
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSendMessage()
        }
    }

    const handleClearChat = () => {
        dispatch(clearChat(generatedUIId))
    }

    return {
        inputValue,
        setInputValue,
        scrollAreaRef,
        inputRef,
        handleSendMessage,
        handleKeyPress,
        handleClearChat,
        chatState,
    }
}
