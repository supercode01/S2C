import { ConsumeCreditsQuery, CreditsBalanceQuery, InspirationImagesQuery, StyleGuideQuery } from '@/convex/query.config'
import { prompts } from '@/prompts'
import { streamText } from 'ai'
import { NextRequest, NextResponse } from 'next/server'
import { createGoogleGenerativeAI } from '@ai-sdk/google'

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData()
        const imageFile = formData.get('image') as File
        const projectId = formData.get('projectId') as string

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
        const colors = guide.colorSections || []
        const typography = guide.typographySections || []
        const systemPrompt = prompts.generativeUi.system

        const userPrompt = `Use the user-provided styleGuide for all visual decisions: map its colors, typography scale, spacing, and radii directly to Tailwind v4 utilities (use arbitrary color classes like text-[#RRGGBB] / bg-[#RRGGBB] when hexes are given), enforce WCAG AA contrast (≥4.5:1 body, ≥3:1 large text), and if any token is missing fall back to neutral light defaults. Never invent new tokens; keep usage consistent across components.

Inspiration images (URLs):

You will receive up to 6 image URLs in images[].

Use them only for interpretation (mood/keywords/subject matter) to bias choices within the existing styleGuide tokens (e.g., which primary/secondary to emphasize, where accent appears, light vs. dark sections).

Do not derive new colors or fonts from images; do not create tokens that aren’t in styleGuide.

Do not echo the URLs in the output JSON; use them purely as inspiration.

If an image URL is unreachable/invalid, ignore it without degrading output quality.

If images imply low-contrast contexts, adjust class pairings (e.g., text-[#FFFFFF] on bg-[#0A0A0A], stronger border/ring from tokens) to maintain accessibility while staying inside the styleGuide.

For any required illustrative slots, use a public placeholder image (deterministic seed) only if the schema requires an image field; otherwise don't include images in the JSON.

On conflicts: the styleGuide always wins over image cues.
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

        const google = createGoogleGenerativeAI({
            apiKey: process.env.GEMINI_API_KEY,
        })

        const result = streamText({
            model: google('gemini-3.5-flash'),
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
                        ...imageUrls.map((url) => ({
                            type: 'image' as const,
                            image: url,
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
                    for await (const chunk of result.textStream) {
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