import { CreditsBalanceQuery, MoodBoardImagesQuery } from "@/convex/query.config"
import { MoodBoardImage } from "@/hooks/use-styles"
import { prompts } from "@/prompts"
import { error } from "console"
import { NextRequest, NextResponse } from "next/server"
// import generateObject  from "ai"
import { generateObject } from 'ai';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const { projectId } = body
        if (!projectId) {
            return NextResponse.json(
                { error: 'Project ID is required' },
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

        const moodBoardImages = await MoodBoardImagesQuery(projectId)

        if (!moodBoardImages || moodBoardImages.images._valueJSON.length === 0) {
            return NextResponse.json(
                {
                    error:
                        'No mood board images found. Please upload images to the mood board first.',
                },
                { status: 400 }
            )
        }

        const images = moodBoardImages.images
            ._valueJSON as unknown as MoodBoardImage[]
        const imageUrls = images.map((img) => img.url).filter(Boolean)
        const systemPrompt = prompts.styleGuide.system

        const userPrompt = `Analyze these ${imageUrls.length} mood board images and generate a design system: Extract colors that work harmoniously together and create typography that matches the aesthetic. Return ONLY the JSON object matching the exact schema structure above.`

        const result = await generateObject({
            model: anthropic('claude-sonnet-4-20250514'),
            schema: StyleGuideSchema,
            system: systemPrompt,
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: userPrompt,
                        },
                        ...imageUrls.map((url) => ({
                            type: 'image' as const,
                            image: url as string, // Fix: ensure image is always a string (URL), not undefined
                        })),
                    ],
                },
            ],
        })
    } catch (error) {

    }
}