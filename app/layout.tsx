import type { Metadata } from "next"
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { getAppearancePrefs } from "@/lib/appearance"
import { cn } from "@/lib/utils"
import { Toaster } from "@/components/ui/sonner"

const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
})

const fontDisplay = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
})

const fontFigures = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-figures",
})

export const metadata: Metadata = {
  title: "Duka POS",
  description: "Point of sale for the Kenyan general shop.",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const prefs = await getAppearancePrefs()

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontSans.variable,
        fontDisplay.variable,
        fontFigures.variable,
        prefs.themeMode === "dark" ? "dark" : ""
      )}
      data-accent={prefs.accentIntensity}
      data-density={prefs.density}
    >
      <body>
        <ThemeProvider forcedTheme={prefs.themeMode === "system" ? undefined : prefs.themeMode}>
          {children}
          <Toaster position="top-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  )
}
