import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import GoogleAnalytics from "@/components/analytics/google-analytics"
import { LanguageProvider } from "@/components/i18n/language-provider"
import { Suspense } from "react"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Kino Platformasi - O'zbek va Xalqaro Kinolar",
  description: "O'zbek va xalqaro kinolarni kashf eting. Sevimli filmlaringizni toping va yangi kinolarni ko'ring.",
  keywords: "kino, film, o'zbek kino, xalqaro kino, movie, cinema, uzbek movies, international movies",
  authors: [{ name: "Kino Platformasi" }],
  creator: "Kino Platformasi",
  publisher: "Kino Platformasi",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://kino-platformasi.vercel.app"),
  openGraph: {
    title: "Kino Platformasi - O'zbek va Xalqaro Kinolar",
    description: "O'zbek va xalqaro kinolarni kashf eting. Sevimli filmlaringizni toping va yangi kinolarni ko'ring.",
    url: "https://kino-platformasi.vercel.app",
    siteName: "Kino Platformasi",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Kino Platformasi",
      },
    ],
    locale: "uz_UZ",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kino Platformasi - O'zbek va Xalqaro Kinolar",
    description: "O'zbek va xalqaro kinolarni kashf eting. Sevimli filmlaringizni toping va yangi kinolarni ko'ring.",
    images: ["/og-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="uz" suppressHydrationWarning>
      <head>
        <GoogleAnalytics />
      </head>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <Suspense fallback={null}>
            <LanguageProvider>
              {children}
              <Toaster />
            </LanguageProvider>
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  )
}
