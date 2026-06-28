import { ConsumeCreditsQuery, CreditsBalanceQuery, InspirationImagesQuery, StyleGuideQuery } from '@/convex/query.config'
import { prompts } from '@/prompts'
import { NextRequest, NextResponse } from 'next/server'
import { streamTextWithFallback } from '@/lib/ai-fallback'

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()
        const imageFile = formData.get('image') as File
        const projectId = formData.get('projectId') as string
        const frameWidth = Number(formData.get('frameWidth')) || 1440
        const frameHeight = Number(formData.get('frameHeight')) || 900
        const isDesktop = frameWidth >= frameHeight
        const deviceLabel = isDesktop ? 'DESKTOP WEBSITE' : 'MOBILE APP SCREEN'

        if (!imageFile) {
            return NextResponse.json(
                { error: 'No image file provided' },
                { status: 400 }
            )
        }

        // Validate file type
        if (!imageFile.type.startsWith('image/')) {
            return NextResponse.json(
                { error: 'Invalid file type. Only images are allowed.' },
                { status: 400 }
            )
        }

        const { ok: balanceOk, balance: balanceBalance } =
            await CreditsBalanceQuery()

        if (!balanceOk) {
            return NextResponse.json(
                { error: 'Failed to get balance' },
                { status: 500 }
            )
        }

        if (balanceBalance === 0) {
            return NextResponse.json(
                { error: 'No credits available' },
                { status: 400 }
            )
        }

        // Replace

        const imageBuffer = await imageFile.arrayBuffer()
        const base64Image = Buffer.from(imageBuffer).toString('base64')
        const styleGuide = await StyleGuideQuery(projectId)

        if (!styleGuide?.styleGuide?._valueJSON) {
            return NextResponse.json(
                {
                    error: 'Style guide not found. Please create a Style Guide first from the Style tab, then try generating the design again.',
                },
                { status: 400 }
            )
        }

        const guide = styleGuide.styleGuide._valueJSON as unknown as {
            colorSections: string[]
            typographySections: string[]
        }

        const inspirationImages = await InspirationImagesQuery(projectId)

        if (!inspirationImages?.images?._valueJSON) {
            return NextResponse.json(
                {
                    error: 'No inspiration images found. Please upload images to the Inspiration Board first, then try generating the design again.',
                },
                { status: 400 }
            )
        }

        const images = inspirationImages.images._valueJSON as unknown as {
            url: string
        }[]

        const imageUrls = images.map((img) => img.url).filter(Boolean)
        const inspirationBase64 = (
            await Promise.all(
                imageUrls.map(async (url) => {
                    try {
                        const res = await fetch(url)
                        if (!res.ok) return null
                        const buf = await res.arrayBuffer()
                        const mime = res.headers.get('content-type') ?? 'image/png'
                        return `data:${mime};base64,${Buffer.from(buf).toString('base64')}`
                    } catch {
                        return null
                    }
                })
            )
        ).filter(Boolean) as string[]
        const colors = guide.colorSections || []
        const typography = guide.typographySections || []
        const systemPrompt = prompts.generativeUi.system

        const userPrompt = `TARGET DEVICE: ${deviceLabel}.
The attached wireframe is ${frameWidth}px wide × ${frameHeight}px tall (${isDesktop ? 'LANDSCAPE / wide' : 'PORTRAIT / tall'}).
${isDesktop ? `
DESKTOP LAYOUT RULES (CRITICAL — do NOT build a narrow mobile/phone screen):
- Design for a full-width desktop viewport of ~${frameWidth}px. The layout must fill the full horizontal width.
- Top navigation bar spans the FULL width: logo on the left, inline horizontal menu links in the middle/right, action buttons (Sign up / Log in) on the far right — all in ONE horizontal row.
- Hero section is HORIZONTAL: heading + text + CTA on one side, the image/illustration on the OTHER side, side-by-side (two columns), not stacked.
- Use multi-column grids for feature/card sections (grid md:grid-cols-2 lg:grid-cols-3 etc.).
- NEVER stack everything into a single narrow centered column. Use the full width.
- Outermost wrapper: <div class="w-full"> with an inner <div class="container mx-auto max-w-7xl px-8">.
` : `
MOBILE LAYOUT RULES: single-column, stacked, hamburger menu, full-width buttons.
`}
You are converting the attached hand-drawn wireframe SKETCH (first image) into a polished, production-quality web page.

LAYOUT: Follow the wireframe sketch for the structure, sections, and placement of elements.

VISUAL QUALITY (CRITICAL): Match the visual richness, polish, and aesthetic of the attached INSPIRATION images. Reproduce their look and feel — hero illustrations/imagery, gradients, soft shadows, rounded corners, generous spacing, and modern typography. The final design must look as refined as the inspiration, NOT a plain wireframe.

IMAGES: Wherever the wireframe shows an image slot, use the most relevant inspiration image (they are attached). Do NOT use empty/skeleton placeholders when an inspiration image is available.

COLORS & FONTS: Use the style guide below as the primary color palette and typography. You MAY use gradients and tints derived from these colors to match the inspiration's mood. Keep good contrast (WCAG AA: ≥4.5:1 body, ≥3:1 large text).
    colors: ${colors
                .map((color: any) =>
                    color.swatches
                        .map((swatch: any) => {
                            return `${swatch.name}: ${swatch.hexColor}, ${swatch.description}`
                        })
                        .join(', ')
                )
                .join(', ')}
    typography: ${typography
                .map((typography: any) =>
                    typography.styles
                        .map((style: any) => {
                            return `${style.name}: ${style.description}, ${style.fontFamily}, ${style.fontWeight}, ${style.fontSize}, ${style.lineHeight}`
                        })
                        .join(',')
                )
                .join(',')}
    `

        const textStream = streamTextWithFallback({
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: userPrompt,
                        }, {
                            type: 'image',
                            image: base64Image,
                        },
                        ...inspirationBase64.map((image) => ({
                            type: 'image' as const,
                            image,
                        })),
                    ],
                },
            ],

            system: systemPrompt,
            temperature: 0.7,
        })

        const stream = new ReadableStream({
            async start(controller) {
                try {
                    for await (const chunk of textStream) {
                        const encoder = new TextEncoder()
                        controller.enqueue(encoder.encode(chunk))
                    }

                    // Consume credits after successful generation
                    await ConsumeCreditsQuery({ amount: 1 })

                    controller.close()
                } catch (error) {
                    controller.error(error)
                }
            },
        })

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'no-cache',
                Connection: 'keep-alive',
            },
        })
    } catch (error) {
        return NextResponse.json(
            {
                error: 'Failed to generate UI design',
                details: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 } 
        )
    }
}