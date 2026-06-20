import type { Metadata } from "next";
import { Geist, Geist_Mono, Plus_Jakarta_Sans, Sora } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/theme/provider";
import { Toaster } from "@/components/ui/sonner";
import { ConvexAuthNextjsServerProvider } from "@convex-dev/auth/nextjs/server";
import { ConvexClientProvider } from "@/convex/provider";
import ReduxProvider from "../redux/provider"
import { ProfileQuery } from "@/convex/query.config";
import { normalize } from "path";
import { ConvexUserRaw, normalizeProfile } from "@/types/user";
import profile from "@/redux/slice/profile";

// Landing Page
const sora = Sora({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700", "800"],
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
});

// Dashboard
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sketch2Design — Turn Moodboards & Sketches into Real UI with AI",
  description:
    "Sketch2Design generates color palettes and typography from your moodboards, turns inspiration and canvas sketches into real UI, and lets you refine everything with an AI design chat. Generate entire website workflows in one click.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const rawProfile = await ProfileQuery()
  const profile = normalizeProfile(
    rawProfile._valueJSON as unknown as ConvexUserRaw | null
  )
  return (

    <ConvexAuthNextjsServerProvider>
      <html lang="en"
        className="bg-background">
        <body
          className={`${geistSans.variable} ${geistMono.variable} ${sora.variable} ${jakarta.variable} antialiased`}
        >
          <ConvexClientProvider>
            <ThemeProvider
              attribute='class'
              defaultTheme="dark"
              enableSystem
              disableTransitionOnChange
            >
              <ReduxProvider preloadedState={{ profile }}>
                {children}
                <Toaster /> {/* To show confirmation messages or arrow messages */}
              </ReduxProvider>
            </ThemeProvider>
          </ConvexClientProvider>
        </body>
      </html>
    </ConvexAuthNextjsServerProvider>
  );
}
