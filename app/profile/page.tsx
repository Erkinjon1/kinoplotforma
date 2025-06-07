"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import Navbar from "@/components/layout/navbar"
import MovieCard from "@/components/movies/movie-card"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { User, Heart, Star, Eye, Calendar, Mail, Edit, Save, X } from "lucide-react"
import type { User as SupabaseUser } from "@supabase/supabase-js"

interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: "user" | "admin"
  created_at: string
}

interface Movie {
  id: number
  title: string
  title_uz: string | null
  poster_url: string | null
  rating: number
  release_year: number | null
}

interface UserStats {
  watchlistCount: number
  ratingsCount: number
  commentsCount: number
  avgRating: number
}

export default function ProfilePage() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [stats, setStats] = useState<UserStats>({
    watchlistCount: 0,
    ratingsCount: 0,
    commentsCount: 0,
    avgRating: 0,
  })
  const [watchlist, setWatchlist] = useState<Movie[]>([])
  const [ratings, setRatings] = useState<(Movie & { user_rating: number })[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    full_name: "",
    email: "",
  })

  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth")
        return
      }

      setUser(user)
      await fetchProfile(user.id)
      await fetchUserStats(user.id)
      await fetchWatchlist(user.id)
      await fetchRatings(user.id)
    } catch (error) {
      console.error("Auth error:", error)
      router.push("/auth")
    } finally {
      setLoading(false)
    }
  }

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single()

      if (error) throw error

      setProfile(data)
      setEditForm({
        full_name: data.full_name || "",
        email: data.email || "",
      })
    } catch (error) {
      console.error("Error fetching profile:", error)
    }
  }

  const fetchUserStats = async (userId: string) => {
    try {
      const [watchlistResult, ratingsResult, commentsResult] = await Promise.all([
        supabase.from("watchlist").select("id", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("ratings").select("rating").eq("user_id", userId),
        supabase.from("comments").select("id", { count: "exact", head: true }).eq("user_id", userId),
      ])

      const avgRating = ratingsResult.data?.length
        ? ratingsResult.data.reduce((sum, r) => sum + r.rating, 0) / ratingsResult.data.length
        : 0

      setStats({
        watchlistCount: watchlistResult.count || 0,
        ratingsCount: ratingsResult.data?.length || 0,
        commentsCount: commentsResult.count || 0,
        avgRating,
      })
    } catch (error) {
      console.error("Error fetching stats:", error)
    }
  }

  const fetchWatchlist = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("watchlist")
        .select(`
          movies (
            id,
            title,
            title_uz,
            poster_url,
            rating,
            release_year
          )
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      if (error) throw error

      const movies = data?.map((item: any) => item.movies).filter(Boolean) || []
      setWatchlist(movies)
    } catch (error) {
      console.error("Error fetching watchlist:", error)
    }
  }

  const fetchRatings = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("ratings")
        .select(`
          rating,
          movies (
            id,
            title,
            title_uz,
            poster_url,
            rating,
            release_year
          )
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })

      if (error) throw error

      const moviesWithRatings =
        data
          ?.map((item: any) => ({
            ...item.movies,
            user_rating: item.rating,
          }))
          .filter(Boolean) || []

      setRatings(moviesWithRatings)
    } catch (error) {
      console.error("Error fetching ratings:", error)
    }
  }

  const handleUpdateProfile = async () => {
    if (!user) return

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: editForm.full_name,
          email: editForm.email,
        })
        .eq("id", user.id)

      if (error) throw error

      await fetchProfile(user.id)
      setEditing(false)

      toast({
        title: "Muvaffaqiyat",
        description: "Profil ma'lumotlari yangilandi",
      })
    } catch (error) {
      console.error("Error updating profile:", error)
      toast({
        title: "Xatolik",
        description: "Profil yangilanmadi",
        variant: "destructive",
      })
    }
  }

  const removeFromWatchlist = async (movieId: number) => {
    if (!user) return

    try {
      const { error } = await supabase.from("watchlist").delete().eq("user_id", user.id).eq("movie_id", movieId)

      if (error) throw error

      await fetchWatchlist(user.id)
      await fetchUserStats(user.id)

      toast({
        title: "O'chirildi",
        description: "Kino sevimlilar ro'yxatidan o'chirildi",
      })
    } catch (error) {
      console.error("Error removing from watchlist:", error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <Alert>
            <AlertDescription>Profil ma'lumotlari topilmadi.</AlertDescription>
          </Alert>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        {/* Profile Header */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={profile.avatar_url || ""} />
                  <AvatarFallback className="text-2xl">
                    {profile.full_name?.charAt(0) || profile.email?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-2xl">{profile.full_name || "Foydalanuvchi"}</CardTitle>
                  <CardDescription className="flex items-center space-x-2 mt-1">
                    <Mail className="h-4 w-4" />
                    <span>{profile.email}</span>
                  </CardDescription>
                  <div className="flex items-center space-x-2 mt-2">
                    <Calendar className="h-4 w-4" />
                    <span className="text-sm text-muted-foreground">
                      {new Date(profile.created_at).toLocaleDateString("uz-UZ")} dan beri a'zo
                    </span>
                  </div>
                  {profile.role === "admin" && (
                    <Badge variant="secondary" className="mt-2">
                      Administrator
                    </Badge>
                  )}
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditing(!editing)}
                className="flex items-center space-x-2"
              >
                {editing ? <X className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
                <span>{editing ? "Bekor qilish" : "Tahrirlash"}</span>
              </Button>
            </div>

            {editing && (
              <div className="mt-6 space-y-4 border-t pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">To'liq ism</Label>
                    <Input
                      id="full_name"
                      value={editForm.full_name}
                      onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                      placeholder="Ismingiz va familiyangiz"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      placeholder="email@example.com"
                    />
                  </div>
                </div>
                <Button onClick={handleUpdateProfile} className="flex items-center space-x-2">
                  <Save className="h-4 w-4" />
                  <span>Saqlash</span>
                </Button>
              </div>
            )}
          </CardHeader>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6 text-center">
              <Heart className="h-8 w-8 text-red-500 mx-auto mb-2" />
              <div className="text-2xl font-bold">{stats.watchlistCount}</div>
              <div className="text-sm text-muted-foreground">Sevimli kinolar</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <Star className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
              <div className="text-2xl font-bold">{stats.ratingsCount}</div>
              <div className="text-sm text-muted-foreground">Baholangan kinolar</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <User className="h-8 w-8 text-blue-500 mx-auto mb-2" />
              <div className="text-2xl font-bold">{stats.commentsCount}</div>
              <div className="text-sm text-muted-foreground">Yozilgan sharhlar</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <Eye className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <div className="text-2xl font-bold">{stats.avgRating.toFixed(1)}</div>
              <div className="text-sm text-muted-foreground">O'rtacha reyting</div>
            </CardContent>
          </Card>
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="watchlist" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="watchlist">Sevimli Kinolar</TabsTrigger>
            <TabsTrigger value="ratings">Baholangan Kinolar</TabsTrigger>
          </TabsList>

          <TabsContent value="watchlist">
            <Card>
              <CardHeader>
                <CardTitle>Sevimli Kinolar</CardTitle>
                <CardDescription>Siz sevimli deb belgilagan kinolar ro'yxati</CardDescription>
              </CardHeader>
              <CardContent>
                {watchlist.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {watchlist.map((movie) => (
                      <div key={movie.id} className="relative">
                        <MovieCard movie={{ ...movie, genres: [], tags: [] }} />
                        <Button
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => removeFromWatchlist(movie.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Heart className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p>Hali sevimli kinolar yo'q</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ratings">
            <Card>
              <CardHeader>
                <CardTitle>Baholangan Kinolar</CardTitle>
                <CardDescription>Siz baho bergan kinolar ro'yxati</CardDescription>
              </CardHeader>
              <CardContent>
                {ratings.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {ratings.map((movie) => (
                      <div key={movie.id} className="relative">
                        <MovieCard movie={{ ...movie, genres: [], tags: [] }} />
                        <div className="absolute top-2 left-2 bg-black/80 backdrop-blur-sm rounded-full px-2 py-1 flex items-center space-x-1">
                          <Star className="h-3 w-3 text-yellow-400 fill-current" />
                          <span className="text-white text-xs font-medium">{movie.user_rating}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Star className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <p>Hali kinolarga baho bermagan</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
