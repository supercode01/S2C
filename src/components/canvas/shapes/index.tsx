import { Shape } from '@/redux/slice/shapes'
// import { Frame } from 'lucide-react'
import React from 'react'
import { Rectangle } from './rectangle'
import { Elipse } from './elipse'
import { Stroke } from './stroke'
import { Arrow } from './arrow'
import { Text } from './text'
import { Line } from './line'
import { Frame } from './frame'

const ShapeRenderer = ({
    shape,
    toggleInspiration,
    toggleChat,
    generateWorkflow,
    exportDesign,
}: {
    shape: Shape
    toggleInspiration: () => void
    toggleChat: (generatedUIId: string) => void
    generateWorkflow: (generatedUIId: string) => void
    exportDesign: (generatedUIId: string, element: HTMLElement | null) => void
}) => {
    // ToDo: Add frame button 
    // Add generated UI
    switch (shape.type) {
        case 'frame':
            return (
                <Frame
                    shape={shape}
                    toggleInspiration={toggleInspiration}
                />
            )
        case 'rect':
            return <Rectangle shape={shape} />
        case 'ellipse':
            return <Elipse shape={shape} />
        case 'freedraw':
            return <Stroke shape={shape} />
        case 'arrow':
            return <Arrow shape={shape} />
        case 'text':
            return <Text shape={shape} />
        case 'line':
            return <Line shape={shape} />
    }
}
export default ShapeRenderer