"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Search, X, Calendar, Film, Star, ExternalLink, Loader2 } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

interface TMDbMovie {
  id: number
  title: string
  original_title: string
  overview: string
  poster_path: string | null
  release_date: string
  vote_average: number
  genre_ids: number[]
}

interface ProcessedMovie {
  id: string
  title: string
  translatedTitle?: string
  year: string
  genre: string
  plot: string
  poster: string
  rating: string
  tmdbId?: number
  isLocal?: boolean
}

const genreMap: Record<number, string> = {
  28: "Jangari",
  12: "Sarguzasht",
  16: "Animatsiya",
  35: "Komediya",
  80: "Jinoyat",
  99: "Hujjatli",
  18: "Drama",
  10751: "Oila",
  14: "Fantastika",
  36: "Tarixiy",
  27: "Qo'rqinchli",
  10402: "Musiqiy",
  9648: "Sirli",
  10749: "Romantik",
  878: "Ilmiy fantastika",
  10770: "TV Film",
  53: "Triller",
  10752: "Urush",
  37: "Vestern",
}

const TMDB_API_KEY = "a25f430cd9f39d7e8627f022724312d4"

export default function AdvancedSearch() {
  const [searchQuery, setSearchQuery] = useState("")
  const [yearFilter, setYearFilter] = useState("")
  const [genreFilter, setGenreFilter] = useState("")
  const [movies, setMovies] = useState<ProcessedMovie[]>([])
  const [loading, setLoading] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const { toast } = useToast()

  const resultsPerPage = 12

  // Translation function using Google Translate API
  const translateToUzbek = async (text: string): Promise<string> => {
    try {
      const response = await fetch(
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=uz&dt=t&q=${encodeURIComponent(text)}`,
      )
      const data = await response.json()
      return data[0][0][0] || text
    } catch (error) {
      console.error("Translation error:", error)
      return text
    }
  }

  // Search function
  const searchMovies = async (page = 1) => {
    if (!searchQuery.trim()) {
      toast({
        title: "Qidiruv so'zi kiriting",
        description: "Kino nomini kiriting",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    setCurrentPage(page)

    try {
      // First search in local database
      let query = supabase
        .from("movies")
        .select("*")
        .eq("status", "active")
        .or(`title.ilike.%${searchQuery}%,title_uz.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`)

      if (yearFilter) {
        const [startYear, endYear] = yearFilter.split("-").map(Number)
        query = query.gte("release_year", startYear).lte("release_year", endYear)
      }

      const { data: localMovies, error } = await query

      if (error) throw error

      let allMovies: ProcessedMovie[] = []

      // Process local movies
      if (localMovies && localMovies.length > 0) {
        allMovies = localMovies.map((movie) => ({
          id: `local-${movie.id}`,
          title: movie.title,
          translatedTitle: movie.title_uz,
          year: movie.release_year?.toString() || "N/A",
          genre: "Drama", // You can enhance this by joining with genres table
          plot: movie.description || movie.description_uz || "Ta'rif yo'q",
          poster: movie.poster_url || "/placeholder.svg?height=450&width=300",
          rating: movie.rating.toFixed(1),
          isLocal: true,
        }))
      }

      // If no local results, search TMDb
      if (allMovies.length === 0) {
        const tmdbResponse = await fetch(
          `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(
            searchQuery,
          )}&page=${page}&language=ru`,
        )
        const tmdbData = await tmdbResponse.json()

        if (tmdbData.results && tmdbData.results.length > 0) {
          const [startYear, endYear] = yearFilter ? yearFilter.split("-").map(Number) : [0, Number.POSITIVE_INFINITY]

          // Process TMDb movies with translation
          const moviePromises = tmdbData.results
            .filter((movie: TMDbMovie) => {
              const movieYear = Number.parseInt(movie.release_date?.split("-")[0] || "0")
              return movieYear >= startYear && movieYear <= endYear
            })
            .slice(0, resultsPerPage)
            .map(async (movie: TMDbMovie) => {
              const [translatedTitle, translatedPlot] = await Promise.all([
                translateToUzbek(movie.title),
                translateToUzbek(movie.overview || "Ta'rif yo'q"),
              ])

              return {
                id: `tmdb-${movie.id}`,
                title: movie.title,
                translatedTitle: translatedTitle,
                year: movie.release_date?.split("-")[0] || "N/A",
                genre: movie.genre_ids.map((id) => genreMap[id] || "N/A").join(", "),
                plot: translatedPlot,
                poster: movie.poster_path
                  ? `https://image.tmdb.org/t/p/w500${movie.poster_path}`
                  : "/placeholder.svg?height=450&width=300",
                rating: (movie.vote_average / 2).toFixed(1),
                tmdbId: movie.id,
                isLocal: false,
              }
            })

          allMovies = await Promise.all(moviePromises)
          setTotalPages(Math.ceil(tmdbData.total_results / resultsPerPage))
        }
      } else {
        setTotalPages(Math.ceil(allMovies.length / resultsPerPage))
      }

      setMovies(allMovies)

      if (allMovies.length === 0) {
        toast({
          title: "Natija topilmadi",
          description: "Boshqa kalit so'zlar bilan qidiring",
        })
      }
    } catch (error) {
      console.error("Search error:", error)
      toast({
        title: "Xatolik",
        description: "Qidirishda xatolik yuz berdi",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const clearSearch = () => {
    setSearchQuery("")
    setYearFilter("")
    setGenreFilter("")
    setMovies([])
    setCurrentPage(1)
    setTotalPages(1)
  }

  const makeSearchString = (str: string) => {
    return str
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .replace(/\s+/g, "+")
      .trim()
  }

  const MovieCard = ({ movie }: { movie: ProcessedMovie }) => {
    const urlTitle = makeSearchString(movie.title)
    const asilmediaLink = `https://asilmedia.org/index.php?do=search&subaction=search&story=${urlTitle}`
    const uzbekLinks = movie.translatedTitle
      ? `https://asilmedia.org/index.php?do=search&subaction=search&story=${makeSearchString(movie.translatedTitle)}`
      : null

    return (
      <Card className="group overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-xl">
        <div className="relative aspect-[2/3] overflow-hidden">
          <Image
            src={movie.poster || "/placeholder.svg"}
            alt={movie.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-110"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-sm rounded-full px-2 py-1 flex items-center space-x-1">
            <Star className="h-3 w-3 text-yellow-400 fill-current" />
            <span className="text-white text-xs font-medium">{movie.rating}</span>
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>

        <CardContent className="p-4">
          <h3 className="font-semibold text-lg line-clamp-2 mb-2">
            {movie.title}
            {movie.translatedTitle && (
              <span className="block text-sm text-muted-foreground font-normal mt-1">{movie.translatedTitle}</span>
            )}
          </h3>

          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
            <div className="flex items-center space-x-1">
              <Calendar className="h-3 w-3" />
              <span>{movie.year}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Film className="h-3 w-3" />
              <span>{movie.genre}</span>
            </div>
          </div>

          <p className="text-sm text-muted-foreground line-clamp-3 mb-4">{movie.plot}</p>

          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline" className="text-xs">
              <a href={asilmediaLink} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3 w-3 mr-1" />
                AsilMedia (asl nom)
              </a>
            </Button>
            {uzbekLinks && (
              <Button asChild size="sm" variant="outline" className="text-xs">
                <a href={uzbekLinks} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3 w-3 mr-1" />
                  AsilMedia (o'zbek nom)
                </a>
              </Button>
            )}
            {movie.isLocal && (
              <Button asChild size="sm" variant="default" className="text-xs">
                <Link href={`/movies/${movie.id.replace("local-", "")}`}>
                  <Film className="h-3 w-3 mr-1" />
                  Batafsil
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  const Pagination = () => {
    if (totalPages <= 1) return null

    return (
      <div className="flex items-center justify-center space-x-2 mt-8">
        {currentPage > 1 && (
          <Button variant="outline" onClick={() => searchMovies(currentPage - 1)}>
            Oldingi
          </Button>
        )}

        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          const page = i + 1
          return (
            <Button
              key={page}
              variant={currentPage === page ? "default" : "outline"}
              onClick={() => searchMovies(page)}
            >
              {page}
            </Button>
          )
        })}

        {currentPage < totalPages && (
          <Button variant="outline" onClick={() => searchMovies(currentPage + 1)}>
            Keyingi
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          O'zbek va Xalqaro Kinolarni Qidirish
        </h1>
        <p className="text-muted-foreground">Sevimli filmlaringizni toping va yangi kinolarni kashf eting</p>
      </div>

      {/* Search Controls */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Kino nomini kiriting..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  onKeyPress={(e) => e.key === "Enter" && searchMovies(1)}
                />
              </div>
            </div>

            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Yilni tanlang" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barcha yillar</SelectItem>
                <SelectItem value="2020-2025">2020-2025</SelectItem>
                <SelectItem value="2010-2019">2010-2019</SelectItem>
                <SelectItem value="2000-2009">2000-2009</SelectItem>
                <SelectItem value="1990-1999">1990-1999</SelectItem>
              </SelectContent>
            </Select>

            <Select value={genreFilter} onValueChange={setGenreFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Janrni tanlang" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Barcha janrlar</SelectItem>
                <SelectItem value="drama">Drama</SelectItem>
                <SelectItem value="comedy">Komediya</SelectItem>
                <SelectItem value="action">Jangari</SelectItem>
                <SelectItem value="romance">Romantik</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-2">
              <Button onClick={() => searchMovies(1)} disabled={loading} className="flex items-center gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Qidirish
              </Button>
              <Button variant="outline" onClick={clearSearch} className="flex items-center gap-2">
                <X className="h-4 w-4" />
                Tozalash
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {loading ? (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Kinolar qidirilmoqda...</p>
        </div>
      ) : movies.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {movies.map((movie) => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
          <Pagination />
        </>
      ) : searchQuery ? (
        <Card>
          <CardContent className="text-center py-12">
            <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Hech narsa topilmadi</h3>
            <p className="text-muted-foreground">Boshqa kalit so'zlar bilan qidiring</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
