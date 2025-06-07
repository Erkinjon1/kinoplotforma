"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Image from "next/image"
import { supabase } from "@/lib/supabase"
import Navbar from "@/components/layout/navbar"
import CommentsSection from "@/components/movies/comments-section"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Star, Calendar, Clock, Eye, Play, Share2, Heart, Bookmark, MapPin, Globe } from "lucide-react"
import type { User as SupabaseUser } from "@supabase/supabase-js"
import { useToast } from "@/hooks/use-toast"

interface MovieDetails {
  id: number
  title: string
  title_uz: string | null
  title_ru: string | null
  title_en: string | null
  description: string | null
  description_uz: string | null
  description_ru: string | null
  description_en: string | null
  poster_url: string | null
  trailer_url: string | null
  release_year: number | null
  duration: number | null
  rating: number
  imdb_rating: number | null
  director: string | null
  actors: string[] | null
  country: string | null
  language: string | null
  view_count: number
  created_at: string
  genres: Array<{ name: string; name_uz: string | null }>
  tags: Array<{ name: string; color: string }>
}

export default function MovieDetailPage() {
  const params = useParams()
  const movieId = Number.parseInt(params.id as string)

  const [movie, setMovie] = useState<MovieDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [userRating, setUserRating] = useState<number>(0)
  const [isInWatchlist, setIsInWatchlist] = useState(false)
  const { toast } = useToast()

  const checkUserInteractions = async (userId: string) => {
    try {
      const [ratingResult, watchlistResult] = await Promise.all([
        supabase.from("ratings").select("rating").eq("user_id", userId).eq("movie_id", movieId).single(),
        supabase.from("watchlist").select("id").eq("user_id", userId).eq("movie_id", movieId).single(),
      ])

      setUserRating(ratingResult.data?.rating || 0)
      setIsInWatchlist(!!watchlistResult.data)
    } catch (error) {
      console.error("Error checking user interactions:", error)
    }
  }

  const handleRating = async (rating: number) => {
    if (!user) {
      toast({
        title: "Kirish talab qilinadi",
        description: "Baho berish uchun tizimga kiring",
        variant: "destructive",
      })
      return
    }

    try {
      await supabase.from("ratings").upsert({
        user_id: user.id,
        movie_id: movieId,
        rating: rating,
      })

      setUserRating(rating)
      toast({
        title: "Baho berildi",
        description: `Siz ${rating} yulduz baho berdingiz`,
      })
    } catch (error) {
      console.error("Error rating movie:", error)
    }
  }

  const toggleWatchlist = async () => {
    if (!user) {
      toast({
        title: "Kirish talab qilinadi",
        description: "Sevimlilar ro'yxatiga qo'shish uchun tizimga kiring",
        variant: "destructive",
      })
      return
    }

    try {
      if (isInWatchlist) {
        await supabase.from("watchlist").delete().eq("user_id", user.id).eq("movie_id", movieId)

        setIsInWatchlist(false)
        toast({
          title: "O'chirildi",
          description: "Kino sevimlilar ro'yxatidan o'chirildi",
        })
      } else {
        await supabase.from("watchlist").insert({
          user_id: user.id,
          movie_id: movieId,
        })

        setIsInWatchlist(true)
        toast({
          title: "Qo'shildi",
          description: "Kino sevimlilar ro'yxatiga qo'shildi",
        })
      }
    } catch (error) {
      console.error("Error toggling watchlist:", error)
    }
  }

  useEffect(() => {
    // Get current user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (user) {
        checkUserInteractions(user.id)
      }
    })

    fetchMovie()
    incrementViewCount()
  }, [movieId])

  const fetchMovie = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("movies")
        .select(`
          *,
          genres:movie_genres(
            genres(name, name_uz)
          ),
          tags:movie_tags(
            tags(name, color)
          )
        `)
        .eq("id", movieId)
        .eq("status", "active")
        .single()

      if (error) throw error

      // Transform the data
      const transformedMovie = {
        ...data,
        genres: data.genres?.map((g: any) => g.genres).filter(Boolean) || [],
        tags: data.tags?.map((t: any) => t.tags).filter(Boolean) || [],
      }

      setMovie(transformedMovie)
    } catch (error) {
      console.error("Error fetching movie:", error)
    } finally {
      setLoading(false)
    }
  }

  const incrementViewCount = async () => {
    try {
      await supabase.rpc("increment_view_count", { movie_id: movieId })
    } catch (error) {
      console.error("Error incrementing view count:", error)
    }
  }

  const handleShare = async () => {
    if (navigator.share && movie) {
      try {
        await navigator.share({
          title: movie.title_uz || movie.title,
          text: movie.description_uz || movie.description || "",
          url: window.location.href,
        })
      } catch (error) {
        console.error("Error sharing:", error)
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <Skeleton className="aspect-[3/4] w-full rounded-lg" />
            </div>
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-20 w-full" />
              <div className="flex space-x-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-16" />
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (!movie) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="text-center py-12">
              <h1 className="text-2xl font-semibold mb-2">Kino topilmadi</h1>
              <p className="text-muted-foreground">Kechirasiz, bu kino mavjud emas yoki o'chirilgan.</p>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  const displayTitle = movie.title_uz || movie.title
  const displayDescription = movie.description_uz || movie.description
  const posterUrl = movie.poster_url || "/placeholder.svg?height=600&width=400"

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Movie Poster */}
          <div className="lg:col-span-1">
            <Card className="overflow-hidden">
              <div className="relative aspect-[3/4]">
                <Image
                  src={posterUrl || "/placeholder.svg"}
                  alt={displayTitle}
                  fill
                  className="object-cover"
                  priority
                />
                {movie.trailer_url && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity">
                    <Button size="lg" className="rounded-full">
                      <Play className="h-6 w-6 mr-2" />
                      Treyler
                    </Button>
                  </div>
                )}
              </div>
            </Card>

            {/* Action Buttons */}
            <div className="mt-4 space-y-2">
              <Button className="w-full" size="lg">
                <Play className="h-5 w-5 mr-2" />
                Tomosha qilish
              </Button>
              <div className="grid grid-cols-3 gap-2">
                <Button variant="outline" size="sm" onClick={handleShare}>
                  <Share2 className="h-4 w-4" />
                </Button>
                {user && (
                  <Button variant={isInWatchlist ? "default" : "outline"} size="sm" onClick={toggleWatchlist}>
                    <Heart className={`h-4 w-4 ${isInWatchlist ? "fill-current" : ""}`} />
                  </Button>
                )}
                <Button variant="outline" size="sm">
                  <Bookmark className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Movie Details */}
          <div className="lg:col-span-2">
            <div className="space-y-6">
              {/* Title and Basic Info */}
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-2">{displayTitle}</h1>
                {movie.title_uz && movie.title !== movie.title_uz && (
                  <p className="text-xl text-muted-foreground mb-4">{movie.title}</p>
                )}

                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
                  {movie.release_year && (
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>{movie.release_year}</span>
                    </div>
                  )}
                  {movie.duration && (
                    <div className="flex items-center space-x-1">
                      <Clock className="h-4 w-4" />
                      <span>{movie.duration} daqiqa</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-1">
                    <Eye className="h-4 w-4" />
                    <span>{movie.view_count.toLocaleString()} ko'rishlar</span>
                  </div>
                  {movie.country && (
                    <div className="flex items-center space-x-1">
                      <MapPin className="h-4 w-4" />
                      <span>{movie.country}</span>
                    </div>
                  )}
                  {movie.language && (
                    <div className="flex items-center space-x-1">
                      <Globe className="h-4 w-4" />
                      <span>{movie.language}</span>
                    </div>
                  )}
                </div>

                {/* Rating */}
                <div className="flex items-center space-x-4 mb-4">
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1">
                      <Star className="h-5 w-5 text-yellow-400 fill-current" />
                      <span className="text-lg font-semibold">{movie.rating.toFixed(1)}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">Platform reytingi</span>
                  </div>
                  {movie.imdb_rating && (
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">IMDb</Badge>
                      <span className="font-semibold">{movie.imdb_rating.toFixed(1)}</span>
                    </div>
                  )}
                </div>

                {user && (
                  <div className="mt-4">
                    <h3 className="font-semibold mb-2">Sizning bahongiz:</h3>
                    <div className="flex items-center space-x-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-6 w-6 cursor-pointer transition-colors ${
                            star <= userRating ? "text-yellow-400 fill-current" : "text-gray-300 hover:text-yellow-400"
                          }`}
                          onClick={() => handleRating(star)}
                        />
                      ))}
                      {userRating > 0 && (
                        <span className="ml-2 text-sm text-muted-foreground">
                          Siz {userRating} yulduz baho berdingiz
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Tags */}
                {movie.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {movie.tags.map((tag) => (
                      <Badge key={tag.name} variant="secondary" style={{ backgroundColor: tag.color, color: "white" }}>
                        {tag.name}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Genres */}
                {movie.genres.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {movie.genres.map((genre) => (
                      <Badge key={genre.name} variant="outline">
                        {genre.name_uz || genre.name}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Description */}
              {displayDescription && (
                <div>
                  <h2 className="text-xl font-semibold mb-3">Tavsif</h2>
                  <p className="text-muted-foreground leading-relaxed">{displayDescription}</p>
                </div>
              )}

              <Separator />

              {/* Cast and Crew */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {movie.director && (
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center">
                      <MapPin className="h-4 w-4 mr-2" />
                      Rejissyor
                    </h3>
                    <p className="text-muted-foreground">{movie.director}</p>
                  </div>
                )}
                {movie.actors && movie.actors.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-2">Aktyorlar</h3>
                    <p className="text-muted-foreground">{movie.actors.join(", ")}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <Separator className="my-12" />

        {/* Comments Section */}
        <CommentsSection movieId={movieId} user={user} />
      </main>
    </div>
  )
}
