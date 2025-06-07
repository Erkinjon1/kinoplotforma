"use client"

import Navbar from "@/components/layout/navbar"
import AdvancedSearch from "@/components/search/advanced-search"
import { LanguageProvider } from "@/components/i18n/language-provider"

export default function AdvancedSearchPage() {
  return (
    <LanguageProvider>
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <AdvancedSearch />
        </main>
      </div>
    </LanguageProvider>
  )
}
