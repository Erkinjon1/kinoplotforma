"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import Navbar from "@/components/layout/navbar"
import MovieCard from "@/components/movies/movie-card"
import MovieFilters from "@/components/movies/movie-filters"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ChevronLeft, ChevronRight, Film, TrendingUp, Star, AlertCircle } from "lucide-react"

interface Movie {
  id: number
  title: string
  title_uz: string | null
  description: string | null
  poster_url: string | null
  release_year: number | null
  duration: number | null
  rating: number
  view_count: number
  genres: Array<{ name: string; name_uz: string | null }>
  tags: Array<{ name: string; color: string }>
}

const ITEMS_PER_PAGE = 12

export default function HomePage() {
  const [movies, setMovies] = useState<Movie[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalMovies, setTotalMovies] = useState(0)
  const [filters, setFilters] = useState({
    search: "",
    genre: "",
    year: "",
    tag: "",
    sortBy: "newest",
  })

  useEffect(() => {
    fetchMovies()
  }, [currentPage, filters])

  const fetchMovies = async () => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from("movies")
        .select(
          `
          *,
          genres:movie_genres(
            genres(name, name_uz)
          ),
          tags:movie_tags(
            tags(name, color)
          )
        `,
          { count: "exact" },
        )
        .eq("status", "active")

      // Apply filters
      if (filters.search) {
        query = query.or(
          `title.ilike.%${filters.search}%,title_uz.ilike.%${filters.search}%,description.ilike.%${filters.search}%`,
        )
      }

      if (filters.genre && filters.genre !== "all") {
        query = query.in(
          "id",
          supabase.from("movie_genres").select("movie_id").eq("genre_id", Number.parseInt(filters.genre)),
        )
      }

      if (filters.year && filters.year !== "all") {
        query = query.eq("release_year", Number.parseInt(filters.year))
      }

      if (filters.tag && filters.tag !== "all") {
        query = query.in(
          "id",
          supabase.from("movie_tags").select("movie_id").eq("tag_id", Number.parseInt(filters.tag)),
        )
      }

      // Apply sorting
      switch (filters.sortBy) {
        case "newest":
          query = query.order("created_at", { ascending: false })
          break
        case "oldest":
          query = query.order("created_at", { ascending: true })
          break
        case "rating":
          query = query.order("rating", { ascending: false })
          break
        case "views":
          query = query.order("view_count", { ascending: false })
          break
        case "title":
          query = query.order("title", { ascending: true })
          break
        default:
          query = query.order("created_at", { ascending: false })
      }

      // Apply pagination
      const from = (currentPage - 1) * ITEMS_PER_PAGE
      const to = from + ITEMS_PER_PAGE - 1
      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) {
        console.error("Error fetching movies:", error)
        if (error.message.includes("relation") && error.message.includes("does not exist")) {
          setError("Ma'lumotlar bazasi hali to'liq sozlanmagan. SQL skriptlarni ishga tushiring.")
        } else {
          setError("Kinolarni yuklashda xatolik yuz berdi.")
        }
        setMovies([])
        setTotalMovies(0)
        setTotalPages(1)
        return
      }

      // Transform the data to flatten the relationships
      const transformedMovies =
        data?.map((movie) => ({
          ...movie,
          genres: movie.genres?.map((g: any) => g.genres).filter(Boolean) || [],
          tags: movie.tags?.map((t: any) => t.tags).filter(Boolean) || [],
        })) || []

      setMovies(transformedMovies)
      setTotalMovies(count || 0)
      setTotalPages(Math.ceil((count || 0) / ITEMS_PER_PAGE))
    } catch (error) {
      console.error("Error fetching movies:", error)
      setError("Kinolarni yuklashda xatolik yuz berdi.")
      setMovies([])
      setTotalMovies(0)
      setTotalPages(1)
    } finally {
      setLoading(false)
    }
  }

  const handleFiltersChange = (newFilters: typeof filters) => {
    setFilters(newFilters)
    setCurrentPage(1) // Reset to first page when filters change
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const renderPagination = () => {
    if (totalPages <= 1) return null

    const pages = []
    const maxVisiblePages = 5
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1)
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i)
    }

    return (
      <div className="flex items-center justify-center space-x-2 mt-8">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="h-4 w-4" />
          Oldingi
        </Button>

        {startPage > 1 && (
          <>
            <Button variant="outline" size="sm" onClick={() => handlePageChange(1)}>
              1
            </Button>
            {startPage > 2 && <span className="px-2">...</span>}
          </>
        )}

        {pages.map((page) => (
          <Button
            key={page}
            variant={currentPage === page ? "default" : "outline"}
            size="sm"
            onClick={() => handlePageChange(page)}
          >
            {page}
          </Button>
        ))}

        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span className="px-2">...</span>}
            <Button variant="outline" size="sm" onClick={() => handlePageChange(totalPages)}>
              {totalPages}
            </Button>
          </>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Keyingi
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
            Kino Platformasi
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            O'zbek va xalqaro kinolarni kashf eting. Sevimli filmlaringizni toping va yangi kinolarni ko'ring.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl mx-auto mb-8">
            <Card>
              <CardContent className="p-4 text-center">
                <Film className="h-8 w-8 text-primary mx-auto mb-2" />
                <div className="text-2xl font-bold">{totalMovies}</div>
                <div className="text-sm text-muted-foreground">Kinolar</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Star className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                <div className="text-2xl font-bold">4.8</div>
                <div className="text-sm text-muted-foreground">O'rtacha reyting</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <TrendingUp className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <div className="text-2xl font-bold">1.2M</div>
                <div className="text-sm text-muted-foreground">Ko'rishlar</div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Filters */}
        <MovieFilters onFiltersChange={handleFiltersChange} initialFilters={filters} />

        {/* Results Info */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-semibold">Kinolar</h2>
            <Badge variant="secondary">{totalMovies} ta natija</Badge>
          </div>
          {totalPages > 1 && (
            <div className="text-sm text-muted-foreground">
              Sahifa {currentPage} / {totalPages}
            </div>
          )}
        </div>

        {/* Movies Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="aspect-[3/4] w-full" />
                <CardContent className="p-4">
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-full mb-2" />
                  <Skeleton className="h-3 w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : movies.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {movies.map((movie) => (
                <MovieCard key={movie.id} movie={movie} />
              ))}
            </div>
            {renderPagination()}
          </>
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <Film className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">
                {error ? "Ma'lumotlar bazasi sozlanmagan" : "Kinolar topilmadi"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {error
                  ? "Iltimos, SQL skriptlarni ishga tushiring va sahifani yangilang."
                  : "Qidiruv shartlaringizga mos kino topilmadi. Filtrlarni o'zgartirib ko'ring."}
              </p>
              {!error && (
                <Button
                  onClick={() =>
                    handleFiltersChange({
                      search: "",
                      genre: "",
                      year: "",
                      tag: "",
                      sortBy: "newest",
                    })
                  }
                >
                  Barcha kinolarni ko'rish
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
