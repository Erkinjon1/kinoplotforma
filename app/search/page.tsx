"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import Navbar from "@/components/layout/navbar"
import MovieCard from "@/components/movies/movie-card"
import MovieFilters from "@/components/movies/movie-filters"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Search, ChevronLeft, ChevronRight } from "lucide-react"

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

export default function SearchPage() {
  const searchParams = useSearchParams()
  const query = searchParams.get("q") || ""

  const [movies, setMovies] = useState<Movie[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalMovies, setTotalMovies] = useState(0)
  const [filters, setFilters] = useState({
    search: query,
    genre: "",
    year: "",
    tag: "",
    sortBy: "newest",
  })

  useEffect(() => {
    setFilters((prev) => ({ ...prev, search: query }))
    setCurrentPage(1)
  }, [query])

  useEffect(() => {
    fetchMovies()
  }, [currentPage, filters])

  const fetchMovies = async () => {
    try {
      setLoading(true)

      let queryBuilder = supabase
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

      // Apply search filter
      if (filters.search) {
        queryBuilder = queryBuilder.or(
          `title.ilike.%${filters.search}%,title_uz.ilike.%${filters.search}%,description.ilike.%${filters.search}%,description_uz.ilike.%${filters.search}%`,
        )
      }

      // Apply other filters
      if (filters.genre && filters.genre !== "all") {
        queryBuilder = queryBuilder.in(
          "id",
          supabase.from("movie_genres").select("movie_id").eq("genre_id", Number.parseInt(filters.genre)),
        )
      }

      if (filters.year && filters.year !== "all") {
        queryBuilder = queryBuilder.eq("release_year", Number.parseInt(filters.year))
      }

      if (filters.tag && filters.tag !== "all") {
        queryBuilder = queryBuilder.in(
          "id",
          supabase.from("movie_tags").select("movie_id").eq("tag_id", Number.parseInt(filters.tag)),
        )
      }

      // Apply sorting
      switch (filters.sortBy) {
        case "newest":
          queryBuilder = queryBuilder.order("created_at", { ascending: false })
          break
        case "oldest":
          queryBuilder = queryBuilder.order("created_at", { ascending: true })
          break
        case "rating":
          queryBuilder = queryBuilder.order("rating", { ascending: false })
          break
        case "views":
          queryBuilder = queryBuilder.order("view_count", { ascending: false })
          break
        case "title":
          queryBuilder = queryBuilder.order("title", { ascending: true })
          break
        default:
          queryBuilder = queryBuilder.order("created_at", { ascending: false })
      }

      // Apply pagination
      const from = (currentPage - 1) * ITEMS_PER_PAGE
      const to = from + ITEMS_PER_PAGE - 1
      queryBuilder = queryBuilder.range(from, to)

      const { data, error, count } = await queryBuilder

      if (error) throw error

      // Transform the data
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
    } finally {
      setLoading(false)
    }
  }

  const handleFiltersChange = (newFilters: typeof filters) => {
    setFilters(newFilters)
    setCurrentPage(1)
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
        {/* Search Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-2 mb-4">
            <Search className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold">Qidiruv Natijalari</h1>
          </div>
          {query && (
            <p className="text-muted-foreground">
              <span className="font-medium">"{query}"</span> uchun qidiruv natijalari
            </p>
          )}
        </div>

        {/* Filters */}
        <MovieFilters onFiltersChange={handleFiltersChange} initialFilters={filters} />

        {/* Results Info */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <h2 className="text-2xl font-semibold">Natijalar</h2>
            <Badge variant="secondary">{totalMovies} ta kino topildi</Badge>
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
              <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Hech narsa topilmadi</h3>
              <p className="text-muted-foreground mb-4">
                {query
                  ? `"${query}" uchun hech qanday kino topilmadi. Boshqa kalit so'zlar bilan qidiring.`
                  : "Qidiruv so'zini kiriting."}
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  )
}
