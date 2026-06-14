import { useRouter, useSearchParams } from "next/navigation"
import { api } from "../../convex/_generated/api"
import { RefObject, useEffect, useRef, useState } from "react"
import { useForm } from "react-hook-form"
import { useMutation } from "convex/react"
import { toast } from "sonner"
import { Id } from "../../convex/_generated/dataModel"
import { useGenerateStyleGuideMutation } from "@/redux/api/style-guide"
import { GeneratedUIShape, updateShape } from "@/redux/slice/shapes"
import { useAppDispatch } from "@/redux/store"

export interface MoodBoardImage {
    id: string
    file?: File // Optional for server-loaded images
    preview: string // Local preview URL or Convex URL
    storageId?: string
    uploaded: boolean
    uploading: boolean
    error?: string
    url?: string // Convex URL for uploaded images
    isFromServer?: boolean // Track if image came from server
}

interface StylesFormData {
    images: MoodBoardImage[]
}

export const useMoodBoard = (guideImages: MoodBoardImage[]) => {
    const uploadingIds = useRef<Set<string>>(new Set())
    const [dragActive, setDragActive] = useState(false)
    const searchParams = useSearchParams()
    const projectId = searchParams.get('project')

    const form = useForm<StylesFormData>({
        defaultValues: {
            images: [],
        },
    })

    const { watch, setValue, getValues } = form
    const images = watch('images')

    const generateUploadUrl = useMutation(api.moodboard.generateUploadUrl)
    const removeMoodBoardImage = useMutation(api.moodboard.removeMoodBoardImage)
    const addMoodBoardImage = useMutation(api.moodboard.addMoodBoardImage)

    const uploadImage = async (
        file: File
    ): Promise<{ storageId: string; url?: string }> => {
        try {
            const uploadUrl = await generateUploadUrl()

            const result = await fetch(uploadUrl, {
                method: 'POST',
                headers: { 'Content-Type': file.type },
                body: file,
            })
            if (!result.ok) {
                throw new Error(`Upload failed: ${result.statusText}`)
            }

            const { storageId } = await result.json()

            // Associate with project if we have a project ID
            if (projectId) {
                await addMoodBoardImage({
                    projectId: projectId as Id<'projects'>,
                    storageId: storageId as Id<'_storage'>,
                })
            }
            return { storageId }
        } catch (error) {
            throw error
        }
    }

    // Sync server images into local form state
    useEffect(() => {
        if (guideImages && guideImages.length > 0) {
            const serverImages: MoodBoardImage[] = guideImages.map((img: any) => ({
                id: img.id,
                preview: img.url,
                storageId: img.storageId,
                uploaded: true,
                uploading: false,
                url: img.url,
                isFromServer: true,
            }))

            const currentImages = getValues('images')

            if (currentImages.length === 0) {
                setValue('images', serverImages)
            } else {
                const mergedImages = [...currentImages]
                serverImages.forEach((serverImg) => {
                    const clientIndex = mergedImages.findIndex(
                        (clientImg) => clientImg.storageId === serverImg.storageId
                    )
                    if (clientIndex !== -1) {
                        // Image found — update it with server data
                        if (mergedImages[clientIndex].preview.startsWith('blob:')) {
                            URL.revokeObjectURL(mergedImages[clientIndex].preview)
                        }
                        mergedImages[clientIndex] = serverImg
                    } else {
                        // Image not yet in local list — add it
                        mergedImages.push(serverImg)
                    }
                })
                setValue('images', mergedImages)
            }
        }
    }, [guideImages, setValue, getValues])

    const addImage = (file: File) => {
        if (images.length >= 5) {
            toast.error('Maximum 5 images allowed')
            return
        }
        const newImage: MoodBoardImage = {
            id: `${Date.now()}-${Math.random()}`,
            file,
            preview: URL.createObjectURL(file),
            uploaded: false,
            uploading: false,
            isFromServer: false,
        }
        const updatedImages = [...images, newImage]
        setValue('images', updatedImages)
        toast.success('Image added to mood board')
    }

    const removeImage = async (imageId: string) => {
        const imageToRemove = images.find((img) => img.id === imageId)
        if (!imageToRemove) return

        // If it's a server image with storageId, remove from Convex
        if (imageToRemove.isFromServer && imageToRemove.storageId && projectId) {
            try {
                await removeMoodBoardImage({
                    projectId: projectId as Id<'projects'>,
                    storageId: imageToRemove.storageId as Id<'_storage'>,
                })
            } catch (error) {
                console.error(error)
                toast.error('Failed to remove image from server')
                return
            }
        }

        const updatedImages = images.filter((img) => {
            if (img.id === imageId) {
                // Clean up preview URL only for local images
                if (!img.isFromServer && img.preview.startsWith('blob:')) {
                    URL.revokeObjectURL(img.preview)
                }
                return false
            }
            return true
        })
        setValue('images', updatedImages)
        toast.success('Image removed from mood board')
    }

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()

        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true)
        } else if (e.type === 'dragleave') {
            setDragActive(false)
        }
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setDragActive(false)

        const files = Array.from(e.dataTransfer.files)
        const imageFiles = files.filter((file) => file.type.startsWith('image/'))

        if (imageFiles.length === 0) {
            toast.error('Please drop image files only')
            return
        }
        imageFiles.forEach((file) => {
            if (images.length < 5) {
                addImage(file)
            }
        })
    }

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || [])
        files.forEach((file) => addImage(file))
        // Reset input
        e.target.value = ''
    }

    // Upload any pending (not yet uploaded) images
    // Uses a ref-based Set to prevent re-entry when images state changes during upload
    useEffect(() => {
        const currentImages = getValues('images')
        const pendingImages = currentImages.filter(
            (img) => !img.uploaded && !img.uploading && !img.error && !uploadingIds.current.has(img.id)
        )

        if (pendingImages.length === 0) return

        const uploadSingleImage = async (image: MoodBoardImage) => {
            // Mark in ref immediately — prevents this image being picked up again on next re-render
            uploadingIds.current.add(image.id)

            // Update state to show spinner
            const snapshotBefore = getValues('images')
            const idx = snapshotBefore.findIndex((img) => img.id === image.id)
            if (idx !== -1) {
                const updated = [...snapshotBefore]
                updated[idx] = { ...updated[idx], uploading: true }
                setValue('images', updated)
            }

            try {
                const { storageId } = await uploadImage(image.file!)
                const snapshotAfter = getValues('images')
                const finalIndex = snapshotAfter.findIndex((img) => img.id === image.id)
                if (finalIndex !== -1) {
                    const finalImages = [...snapshotAfter]
                    finalImages[finalIndex] = {
                        ...finalImages[finalIndex],
                        storageId,
                        uploaded: true,
                        uploading: false,
                        isFromServer: true,
                    }
                    setValue('images', finalImages)
                }
            } catch (error) {
                console.error(error)
                const snapshotErr = getValues('images')
                const errorIndex = snapshotErr.findIndex((img) => img.id === image.id)
                if (errorIndex !== -1) {
                    const errorImages = [...snapshotErr]
                    errorImages[errorIndex] = {
                        ...errorImages[errorIndex],
                        uploading: false,
                        error: 'Upload failed',
                    }
                    setValue('images', errorImages)
                }
            } finally {
                uploadingIds.current.delete(image.id)
            }
        }

        pendingImages.forEach((image) => uploadSingleImage(image))
    }, [images])

    // Cleanup blob URLs on unmount
    useEffect(() => {
        return () => {
            images.forEach((image) => {
                if (!image.isFromServer && image.preview.startsWith('blob:')) {
                    URL.revokeObjectURL(image.preview)
                }
            })
        }
    }, [])

    return {
        form,
        images,
        dragActive,
        addImage,
        removeImage,
        handleDrag,
        handleDrop,
        handleFileInput,
        canAddMore: images.length < 5,
    }
}

export const useStyleGuide = (
    projectId: string,
    images: MoodBoardImage[],
    fileInputRef: RefObject<HTMLInputElement | null>
) => {
    const [generateStyleGuide, { isLoading: isGenerating }] =
        useGenerateStyleGuideMutation()
    const router = useRouter()
    const handleUploadClick = () => fileInputRef.current?.click()

    const handleGenerateStyleGuide = async () => {
        if (!projectId) {
            toast.error('No project selected')
            return
        }
        if (images.length === 0) {
            toast.error('Please upload at least one image to generate a style guide')
            return
        }

        if (images.some((img) => img.uploading)) {
            toast.error('Please wait for all images to finish uploading')
            return
        }

        try {
            toast.loading('Analyzing mood board images...', {
                id: 'style-guide-generation',
            })
            const result = await generateStyleGuide({ projectId }).unwrap()

            if (!result.success) {
                toast.error(result.message, { id: 'style-guide-generation' })
                return
            }

            router.refresh()
            toast.success('Style guide generated successfully!', {
                id: 'style-guide-generation',
            })

            setTimeout(() => {
                toast.success(
                    'Style guide generated! Switch to the Colours tab to see the results.',
                    { duration: 5000 }
                )
            }, 1000)
        }

        catch (error) {
            const errorMessage =
                error && typeof error === 'object' && 'error' in error
                    ? (error as { error: string }).error
                    : 'Failed to generate style guide'
            toast.error(errorMessage, { id: 'style-guide-generation' })
        }
    }

    return {
        handleGenerateStyleGuide,
        isGenerating,
        handleUploadClick,
    }
}

export const useUpdateContainer = (shape: GeneratedUIShape) => {
    const dispatch = useAppDispatch()
    const containerRef = useRef<HTMLDivElement>(null)
    useEffect(() => {
        if (containerRef.current && shape.uiSpecData) {
            const timeoutId = setTimeout(() => {
                const actualHeight = containerRef.current?.offsetHeight || 0
                if (actualHeight > 0 && Math.abs(actualHeight - shape.h) > 10) {
                    dispatch(
                        updateShape({
                            id: shape.id,
                            patch: { h: actualHeight },
                        })
                    )
                }
            }, 100)

            return () => clearTimeout(timeoutId)
        }
    }, [shape.uiSpecData, shape.h, dispatch, shape.id])

    // Enhanced HTML sanitization function for basic safety
    const sanitizeHtml = (html: string) => {
        const sanitized = html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
            .replace(/on\w+="[^"]*"/gi, '') // Remove event handlers
            .replace(/javascript:/gi, '') // Remove javascript: protocols
            .replace(/data:/gi, '') // Remove data: protocols for safety

        return sanitized
    }
    return {
        sanitizeHtml,
        containerRef,
    }
}