import { ConsumeCreditsQuery, CreditsBalanceQuery, MoodBoardImagesQuery } from "@/convex/query.config"
import { MoodBoardImage } from "@/hooks/use-styles"
import { prompts } from "@/prompts"
import { NextRequest, NextResponse } from "next/server"
import { generateObjectWithFallback } from "@/lib/ai-fallback"
import z from "zod"
import { api } from "../../../../../convex/_generated/api"
import { Id } from "../../../../../convex/_generated/dataModel"
import { fetchMutation } from "convex/nextjs"
import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server"

const ColorSwatchSchema = z.object({
    name: z.string(),
    hexColor: z.string().describe('Valid hex color in #RRGGBB format'),
    description: z.string().optional(),
})

// Gemini-compatible: single generic schema instead of z.tuple() + z.literal()
// z.tuple() generates "items" as an array in JSON Schema which Gemini rejects
const ColorSectionSchema = z.object({
    title: z.string().describe(
        'One of: "Primary Colours" | "Secondary & Accent Colors" | "UI Component Colors" | "Utility & Form Colors" | "Status & Feedback Colors"'
    ),
    swatches: z.array(ColorSwatchSchema),
})

const TypographyStyleSchema = z.object({
    name: z.string(),
    fontFamily: z.string(),
    fontSize: z.string(),
    fontWeight: z.string(),
    lineHeight: z.string(),
    letterSpacing: z.string().optional(),
    description: z.string().optional(),
})

const TypographySectionSchema = z.object({
    title: z.string(),
    styles: z.array(TypographyStyleSchema),
})

const StyleGuideSchema = z.object({
    theme: z.string(),
    description: z.string(),
    // z.array() instead of z.tuple() — Gemini only supports items as single object schema
    colorSections: z.array(ColorSectionSchema).describe(
        'Exactly 5 color sections: Primary Colours (4 swatches), Secondary & Accent Colors (4 swatches), UI Component Colors (6 swatches), Utility & Form Colors (3 swatches), Status & Feedback Colors (2 swatches)'
    ),
    typographySections: z.array(TypographySectionSchema).describe('Exactly 3 typography sections'),
})

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

        const userPrompt = `Analyze these ${imageUrls.length} mood board images and generate a complete design system.

REQUIRED OUTPUT STRUCTURE (strictly follow these counts):
- colorSections: array of EXACTLY 5 objects:
  1. title: "Primary Colours" — 4 swatches
  2. title: "Secondary & Accent Colors" — 4 swatches
  3. title: "UI Component Colors" — 6 swatches
  4. title: "Utility & Form Colors" — 3 swatches
  5. title: "Status & Feedback Colors" — 2 swatches
- typographySections: array of EXACTLY 3 typography sections
- Each hexColor MUST be a valid 6-digit hex (e.g. #1A2B3C)

Extract colors that work harmoniously together and create typography that matches the aesthetic. Return ONLY valid JSON matching the schema.`

        const result = await generateObjectWithFallback({
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

        //  consume credits after successful generation
        const { ok, balance } = await ConsumeCreditsQuery({ amount: 1 })
        if (!ok) {
            return NextResponse.json(
                { error: 'Failed to generate style guide' },
                { status: 500 }
            )
        }
        // save in database
        await fetchMutation(
            api.projects.updateProjectStyleGuide,
            {
                projectId: projectId as Id<'projects'>,
                styleGuideData: result.object,
            },
            { token: await convexAuthNextjsToken() }
        )

        // return Response
        return NextResponse.json({
            success: true,
            styleGuide: result.object,
            message: 'Style guide generated successfully',
            balance,
        })

    } catch (error) {
        console.error('Error generating style guide:', error)
        return NextResponse.json(
            {
                error: 'Failed to generate style guide',
                details: error instanceof Error ? error.message : String(error),
            },
            { status: 500 }
        )
    }
}