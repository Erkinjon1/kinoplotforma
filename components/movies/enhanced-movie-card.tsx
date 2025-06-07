"use client"

import type React from "react"
import Link from "next/link"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Star, Calendar, Clock, Eye, Heart, ExternalLink, Play } from "lucide-react"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { useLanguage } from "@/components/i18n/language-provider"

interface EnhancedMovieCardProps {
  movie: {
    id: number
    title: string
    title_uz?: string | null
    title_ru?: string | null
    title_en?: string | null
    description?: string | null
    description_uz?: string | null
    description_ru?: string | null
    description_en?: string | null
    poster_url?: string | null
    release_year?: number | null
    duration?: number | null
    rating: number
    view_count: number
    genres?: Array<{ name: string; name_uz?: string | null; name_ru?: string | null; name_en?: string | null }>
    tags?: Array<{ name: string; color: string }>
  }
  showExternalLinks?: boolean
}

export default function EnhancedMovieCard({ movie, showExternalLinks = false }: EnhancedMovieCardProps) {
  const [user, setUser] = useState(null)
  const [isInWatchlist, setIsInWatchlist] = useState(false)
  const [userRating, setUserRating] = useState(0)
  const { toast } = useToast()
  const { language, t } = useLanguage()

  // Get localized content based on current language
  const getLocalizedContent = () => {
    let title = movie.title
    let description = movie.description

    switch (language) {
      case "uz":
        title = movie.title_uz || movie.title
        description = movie.description_uz || movie.description
        break
      case "ru":
        title = movie.title_ru || movie.title
        description = movie.description_ru || movie.description
        break
      case "en":
        title = movie.title_en || movie.title
        description = movie.description_en || movie.description
        break
    }

    return { title, description }
  }

  const { title: displayTitle, description: displayDescription } = getLocalizedContent()
  const posterUrl = movie.poster_url || "/placeholder.svg?height=400&width=300"

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    setUser(user)
    if (user) {
      checkWatchlistStatus(user.id)
      checkUserRating(user.id)
    }
  }

  const checkWatchlistStatus = async (userId: string) => {
    const { data } = await supabase
      .from("watchlist")
      .select("id")
      .eq("user_id", userId)
      .eq("movie_id", movie.id)
      .single()

    setIsInWatchlist(!!data)
  }

  const checkUserRating = async (userId: string) => {
    const { data } = await supabase
      .from("ratings")
      .select("rating")
      .eq("user_id", userId)
      .eq("movie_id", movie.id)
      .single()

    setUserRating(data?.rating || 0)
  }

  const toggleWatchlist = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!user) {
      toast({
        title: t("error"),
        description: t("loginRequired"),
        variant: "destructive",
      })
      return
    }

    try {
      if (isInWatchlist) {
        await supabase.from("watchlist").delete().eq("user_id", user.id).eq("movie_id", movie.id)

        setIsInWatchlist(false)
        toast({
          title: t("success"),
          description: t("removedFromWatchlist"),
        })
      } else {
        await supabase.from("watchlist").insert({
          user_id: user.id,
          movie_id: movie.id,
        })

        setIsInWatchlist(true)
        toast({
          title: t("success"),
          description: t("addedToWatchlist"),
        })
      }
    } catch (error) {
      console.error("Error toggling watchlist:", error)
    }
  }

  const makeSearchString = (str: string) => {
    return str
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .replace(/\s+/g, "+")
      .trim()
  }

  const getExternalLinks = () => {
    const urlTitle = makeSearchString(movie.title)
    const asilmediaLink = `https://asilmedia.org/index.php?do=search&subaction=search&story=${urlTitle}`

    const links = [
      {
        url: asilmediaLink,
        label: "AsilMedia (asl nom)",
      },
    ]

    if (movie.title_uz && movie.title_uz !== movie.title) {
      const urlUzTitle = makeSearchString(movie.title_uz)
      links.push({
        url: `https://asilmedia.org/index.php?do=search&subaction=search&story=${urlUzTitle}`,
        label: "AsilMedia (o'zbek nom)",
      })
    }

    return links
  }

  return (
    <Link href={`/movies/${movie.id}`}>
      <Card className="group overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-xl">
        <div className="relative aspect-[3/4] overflow-hidden">
          <Image
            src={posterUrl || "/placeholder.svg"}
            alt={displayTitle}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-110"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Rating Badge */}
          <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-sm rounded-full px-2 py-1 flex items-center space-x-1">
            <Star className="h-3 w-3 text-yellow-400 fill-current" />
            <span className="text-white text-xs font-medium">{movie.rating.toFixed(1)}</span>
          </div>

          {/* User Rating */}
          {userRating > 0 && (
            <div className="absolute top-2 left-2 bg-blue-600/80 backdrop-blur-sm rounded-full px-2 py-1 flex items-center space-x-1">
              <Star className="h-3 w-3 text-white fill-current" />
              <span className="text-white text-xs font-medium">{userRating}</span>
            </div>
          )}

          {/* Tags */}
          {movie.tags && movie.tags.length > 0 && (
            <div className="absolute bottom-2 left-2 flex flex-wrap gap-1">
              {movie.tags.slice(0, 2).map((tag) => (
                <Badge
                  key={tag.name}
                  variant="secondary"
                  className="text-xs px-2 py-0.5"
                  style={{ backgroundColor: tag.color, color: "white" }}
                >
                  {tag.name}
                </Badge>
              ))}
            </div>
          )}

          {/* Play Button Overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <Button size="lg" className="rounded-full bg-primary/90 hover:bg-primary">
              <Play className="h-6 w-6 mr-2" />
              {t("watchNow")}
            </Button>
          </div>
        </div>

        <CardContent className="p-4">
          <h3 className="font-semibold text-lg line-clamp-2 mb-2 group-hover:text-primary transition-colors">
            {displayTitle}
          </h3>

          {displayDescription && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{displayDescription}</p>
          )}

          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <div className="flex items-center space-x-3">
              {movie.release_year && (
                <div className="flex items-center space-x-1">
                  <Calendar className="h-3 w-3" />
                  <span>{movie.release_year}</span>
                </div>
              )}
              {movie.duration && (
                <div className="flex items-center space-x-1">
                  <Clock className="h-3 w-3" />
                  <span>
                    {movie.duration} {t("minutes")}
                  </span>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-1">
              <Eye className="h-3 w-3" />
              <span>{movie.view_count.toLocaleString()}</span>
            </div>
          </div>

          {/* Genres */}
          {movie.genres && movie.genres.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {movie.genres.slice(0, 3).map((genre) => {
                let genreName = genre.name
                switch (language) {
                  case "uz":
                    genreName = genre.name_uz || genre.name
                    break
                  case "ru":
                    genreName = genre.name_ru || genre.name
                    break
                  case "en":
                    genreName = genre.name_en || genre.name
                    break
                }
                return (
                  <Badge key={genre.name} variant="outline" className="text-xs">
                    {genreName}
                  </Badge>
                )
              })}
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2">
            {user && (
              <Button
                variant={isInWatchlist ? "default" : "outline"}
                size="sm"
                onClick={toggleWatchlist}
                className="w-full"
              >
                <Heart className={`h-4 w-4 mr-2 ${isInWatchlist ? "fill-current" : ""}`} />
                {isInWatchlist ? t("removeFromWatchlist") : t("addToWatchlist")}
              </Button>
            )}

            {/* External Links */}
            {showExternalLinks && (
              <div className="flex flex-wrap gap-1">
                {getExternalLinks().map((link, index) => (
                  <Button
                    key={index}
                    asChild
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <a href={link.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      {link.label}
                    </a>
                  </Button>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
