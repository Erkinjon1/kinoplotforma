"use client"

import type React from "react"

import Link from "next/link"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Star, Calendar, Clock, Eye } from "lucide-react"

// Add these imports at the top
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { Heart } from "lucide-react"
import { Button } from "@/components/ui/button"

interface MovieCardProps {
  movie: {
    id: number
    title: string
    title_uz?: string | null
    description?: string | null
    poster_url?: string | null
    release_year?: number | null
    duration?: number | null
    rating: number
    view_count: number
    genres?: Array<{ name: string; name_uz?: string | null }>
    tags?: Array<{ name: string; color: string }>
  }
}

export default function MovieCard({ movie }: MovieCardProps) {
  const displayTitle = movie.title_uz || movie.title
  const posterUrl = movie.poster_url || "/placeholder.svg?height=400&width=300"

  // Add these state variables and functions inside the component
  const [user, setUser] = useState(null)
  const [isInWatchlist, setIsInWatchlist] = useState(false)
  const [userRating, setUserRating] = useState(0)
  const { toast } = useToast()

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
        title: "Kirish talab qilinadi",
        description: "Sevimlilar ro'yxatiga qo'shish uchun tizimga kiring",
        variant: "destructive",
      })
      return
    }

    try {
      if (isInWatchlist) {
        await supabase.from("watchlist").delete().eq("user_id", user.id).eq("movie_id", movie.id)

        setIsInWatchlist(false)
        toast({
          title: "O'chirildi",
          description: "Kino sevimlilar ro'yxatidan o'chirildi",
        })
      } else {
        await supabase.from("watchlist").insert({
          user_id: user.id,
          movie_id: movie.id,
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

          {/* Tags */}
          {movie.tags && movie.tags.length > 0 && (
            <div className="absolute top-2 left-2 flex flex-wrap gap-1">
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
        </div>

        <CardContent className="p-4">
          <h3 className="font-semibold text-lg line-clamp-2 mb-2 group-hover:text-primary transition-colors">
            {displayTitle}
          </h3>

          {movie.description && <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{movie.description}</p>}

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
                  <span>{movie.duration} min</span>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-1">
              <Eye className="h-3 w-3" />
              <span>{movie.view_count}</span>
            </div>
          </div>

          {/* Genres */}
          {movie.genres && movie.genres.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {movie.genres.slice(0, 3).map((genre) => (
                <Badge key={genre.name} variant="outline" className="text-xs">
                  {genre.name_uz || genre.name}
                </Badge>
              ))}
            </div>
          )}
          {/* Add this button in the card content, after the genres section */}
          {user && (
            <div className="mt-3">
              <Button
                variant={isInWatchlist ? "default" : "outline"}
                size="sm"
                onClick={toggleWatchlist}
                className="w-full"
              >
                <Heart className={`h-4 w-4 mr-2 ${isInWatchlist ? "fill-current" : ""}`} />
                {isInWatchlist ? "Sevimlilardan o'chirish" : "Sevimlilarga qo'shish"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}
