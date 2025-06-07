"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Search, Filter, X, AlertCircle } from "lucide-react"

interface Genre {
  id: number
  name: string
  name_uz: string | null
}

interface Tag {
  id: number
  name: string
  color: string
}

interface MovieFiltersProps {
  onFiltersChange: (filters: {
    search: string
    genre: string
    year: string
    tag: string
    sortBy: string
  }) => void
  initialFilters?: {
    search?: string
    genre?: string
    year?: string
    tag?: string
    sortBy?: string
  }
}

export default function MovieFilters({ onFiltersChange, initialFilters = {} }: MovieFiltersProps) {
  const [genres, setGenres] = useState<Genre[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    search: initialFilters.search || "",
    genre: initialFilters.genre || "all",
    year: initialFilters.year || "all",
    tag: initialFilters.tag || "all",
    sortBy: initialFilters.sortBy || "newest",
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError(null)

      // Fetch genres and tags in parallel
      const [genresResult, tagsResult] = await Promise.all([
        supabase.from("genres").select("*").order("name"),
        supabase.from("tags").select("*").order("name"),
      ])

      if (genresResult.error) {
        console.error("Error fetching genres:", genresResult.error)
        // Don't throw error, just log it and continue with empty array
        setGenres([])
      } else {
        setGenres(genresResult.data || [])
      }

      if (tagsResult.error) {
        console.error("Error fetching tags:", tagsResult.error)
        // Don't throw error, just log it and continue with empty array
        setTags([])
      } else {
        setTags(tagsResult.data || [])
      }

      // If both failed, show error message
      if (genresResult.error && tagsResult.error) {
        setError("Ma'lumotlar bazasi hali to'liq sozlanmagan. SQL skriptlarni ishga tushiring.")
      }
    } catch (error) {
      console.error("Error fetching data:", error)
      setError("Ma'lumotlarni yuklashda xatolik yuz berdi.")
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onFiltersChange(newFilters)
  }

  const clearFilters = () => {
    const clearedFilters = {
      search: "",
      genre: "all",
      year: "all",
      tag: "all",
      sortBy: "newest",
    }
    setFilters(clearedFilters)
    onFiltersChange(clearedFilters)
  }

  const hasActiveFilters =
    filters.search ||
    filters.genre !== "all" ||
    filters.year !== "all" ||
    filters.tag !== "all" ||
    filters.sortBy !== "newest"

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 50 }, (_, i) => currentYear - i)

  if (error) {
    return (
      <Alert className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  return (
    <Card className="mb-6">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center space-x-2">
          <Filter className="h-5 w-5" />
          <span>Filtrlar</span>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="ml-auto text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4 mr-1" />
              Tozalash
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="space-y-2">
          <Label htmlFor="search">Qidiruv</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              placeholder="Kino nomini kiriting..."
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Genre Filter */}
          <div className="space-y-2">
            <Label>Janr</Label>
            <Select value={filters.genre} onValueChange={(value) => handleFilterChange("genre", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Janrni tanlang" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barcha janrlar</SelectItem>
                {loading ? (
                  <SelectItem value="loading" disabled>
                    Yuklanmoqda...
                  </SelectItem>
                ) : (
                  genres.map((genre) => (
                    <SelectItem key={genre.id} value={genre.id.toString()}>
                      {genre.name_uz || genre.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Year Filter */}
          <div className="space-y-2">
            <Label>Yil</Label>
            <Select value={filters.year} onValueChange={(value) => handleFilterChange("year", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Yilni tanlang" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barcha yillar</SelectItem>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tag Filter */}
          <div className="space-y-2">
            <Label>Teg</Label>
            <Select value={filters.tag} onValueChange={(value) => handleFilterChange("tag", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Tegni tanlang" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barcha teglar</SelectItem>
                {loading ? (
                  <SelectItem value="loading" disabled>
                    Yuklanmoqda...
                  </SelectItem>
                ) : (
                  tags.map((tag) => (
                    <SelectItem key={tag.id} value={tag.id.toString()}>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }} />
                        <span>{tag.name}</span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Sort Filter */}
          <div className="space-y-2">
            <Label>Saralash</Label>
            <Select value={filters.sortBy} onValueChange={(value) => handleFilterChange("sortBy", value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Eng yangi</SelectItem>
                <SelectItem value="oldest">Eng eski</SelectItem>
                <SelectItem value="rating">Reyting bo'yicha</SelectItem>
                <SelectItem value="views">Ko'rishlar soni</SelectItem>
                <SelectItem value="title">Nom bo'yicha</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            {filters.search && (
              <Badge variant="secondary" className="flex items-center space-x-1">
                <span>Qidiruv: {filters.search}</span>
                <X className="h-3 w-3 cursor-pointer" onClick={() => handleFilterChange("search", "")} />
              </Badge>
            )}
            {filters.genre !== "all" && (
              <Badge variant="secondary" className="flex items-center space-x-1">
                <span>
                  Janr:{" "}
                  {genres.find((g) => g.id.toString() === filters.genre)?.name_uz ||
                    genres.find((g) => g.id.toString() === filters.genre)?.name ||
                    "Noma'lum"}
                </span>
                <X className="h-3 w-3 cursor-pointer" onClick={() => handleFilterChange("genre", "all")} />
              </Badge>
            )}
            {filters.year !== "all" && (
              <Badge variant="secondary" className="flex items-center space-x-1">
                <span>Yil: {filters.year}</span>
                <X className="h-3 w-3 cursor-pointer" onClick={() => handleFilterChange("year", "all")} />
              </Badge>
            )}
            {filters.tag !== "all" && (
              <Badge variant="secondary" className="flex items-center space-x-1">
                <span>Teg: {tags.find((t) => t.id.toString() === filters.tag)?.name || "Noma'lum"}</span>
                <X className="h-3 w-3 cursor-pointer" onClick={() => handleFilterChange("tag", "all")} />
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
