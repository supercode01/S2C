import MoodBoard from '@/components/style/mood-board'
import { ThemeContent } from '@/components/style/theme'
import StyleGuideTypography from '@/components/style/typography'
import { TabsContent } from '@/components/ui/tabs'
import { MoodBoardImagesQuery, StyleGuideQuery } from '@/convex/query.config'
import { MoodBoardImage } from '@/hooks/use-styles'
import { StyleGuide } from '@/redux/api/style-guide'
import { Palette } from 'lucide-react'
import React from 'react'

// Force fresh data on every request — prevents stale cache after image uploads
export const dynamic = 'force-dynamic'
export const revalidate = 0


type Props = {
  searchParams: Promise<{
    project: string
  }>
}

const Page = async ({ searchParams }: Props) => {
  const projectId = (await searchParams).project

  // Canvas page jaisa hi guard — project id na ho ya "null"/"undefined" (string)
  // ho to query mat chalao (warna v.id("projects") validator throw karta hai),
  // user ko select karne ka message dikhao.
  if (!projectId || projectId === 'null' || projectId === 'undefined') {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">
          No project selected. Please select a project.
        </p>
      </div>
    )
  }

  const existingStyleGuide = await StyleGuideQuery(projectId)
  const guide = existingStyleGuide.styleGuide
    ?._valueJSON as unknown as StyleGuide

  const colorGuide = guide?.colorSections || []
  const typographyGuide = guide?.typographySections || []

  const moodBoardImages = await MoodBoardImagesQuery(projectId)
  const guideImages = moodBoardImages.images
    ?._valueJSON as unknown as MoodBoardImage[]

  return (
    <div>
      {/* For mock data */}
      {/* <TabsContent value="colours" className="space-y-8">
        <ThemeContent
          colorGuide={
            guide?.colorSections ||
            mockStyleGuide.colorSections.flatMap(section => Object.values(section))
          }
        />
      </TabsContent> */}

      <TabsContent
        value="colours"
        className="space-y-8"
      >
        {(!guide || !guideImages.length) ? (
          <div className="space-y-8">
            <div className="text-center py-20">
              <div className="w-16 h-16 mx-auto mb-4 rounded-lg bg-muted flex items-center justify-center">
                <Palette className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-2">
                No colors generated yet
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
                Upload images to your mood board and generate an AI-powered style guide with colors and typography.
              </p>
            </div>
          </div>
        ) : (
          <ThemeContent colorGuide={colorGuide} />
        )}
      </TabsContent>

      <TabsContent value='typography'>
        <StyleGuideTypography typographyGuide={typographyGuide} />
      </TabsContent>

      <TabsContent value="moodboard">
        <MoodBoard guideImages={guideImages} />
      </TabsContent>
    </div>
  )
}

export default Page