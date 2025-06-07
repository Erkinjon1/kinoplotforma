"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CalendarDays, MapPin, Globe, Star, Film, MessageSquare, Heart, Trophy, Edit, Camera } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Navbar from "@/components/layout/navbar"

interface Profile {
  id: string
  full_name: string
  username: string
  email: string
  avatar_url: string
  bio: string
  location: string
  website: string
  birth_date: string
  created_at: string
}

interface UserStats {
  total_ratings: number
  total_comments: number
  total_favorites: number
  average_rating: number
  movies_watched: number
  reviews_written: number
}

interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  earned: boolean
  progress: number
  max_progress: number
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [stats, setStats] = useState<UserStats | null>(null)
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
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
      fetchProfile()
      fetchStats()
      fetchAchievements()
    } catch (error) {
      console.error("Auth error:", error)
      router.push("/auth")
    } finally {
      setLoading(false)
    }
  }

  const fetchProfile = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single()

      if (error) throw error
      setProfile(data)
    } catch (error) {
      console.error("Error fetching profile:", error)
      toast({
        title: "Xatolik",
        description: "Profil ma'lumotlarini yuklashda xatolik yuz berdi",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      // Fetch user statistics
      const [ratingsResult, commentsResult, favoritesResult] = await Promise.all([
        supabase.from("ratings").select("rating").eq("user_id", user.id),
        supabase.from("comments").select("id").eq("user_id", user.id),
        supabase.from("favorites").select("id").eq("user_id", user.id),
      ])

      const ratings = ratingsResult.data || []
      const comments = commentsResult.data || []
      const favorites = favoritesResult.data || []

      const averageRating = ratings.length > 0 ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length : 0

      setStats({
        total_ratings: ratings.length,
        total_comments: comments.length,
        total_favorites: favorites.length,
        average_rating: averageRating,
        movies_watched: ratings.length,
        reviews_written: comments.length,
      })
    } catch (error) {
      console.error("Error fetching stats:", error)
    }
  }

  const fetchAchievements = () => {
    // Mock achievements data
    const mockAchievements: Achievement[] = [
      {
        id: "1",
        name: "Kino Sevuvchi",
        description: "10 ta filmni baholang",
        icon: "🎬",
        earned: (stats?.total_ratings || 0) >= 10,
        progress: stats?.total_ratings || 0,
        max_progress: 10,
      },
      {
        id: "2",
        name: "Tanqidchi",
        description: "25 ta sharh yozing",
        icon: "✍️",
        earned: (stats?.total_comments || 0) >= 25,
        progress: stats?.total_comments || 0,
        max_progress: 25,
      },
      {
        id: "3",
        name: "Kolleksioner",
        description: "50 ta filmni sevimlilarga qo'shing",
        icon: "❤️",
        earned: (stats?.total_favorites || 0) >= 50,
        progress: stats?.total_favorites || 0,
        max_progress: 50,
      },
      {
        id: "4",
        name: "Ekspert",
        description: "O'rtacha 4+ baho bering",
        icon: "⭐",
        earned: (stats?.average_rating || 0) >= 4,
        progress: Math.round((stats?.average_rating || 0) * 10),
        max_progress: 50,
      },
    ]
    setAchievements(mockAchievements)
  }

  const updateProfile = async (updatedData: Partial<Profile>) => {
    setSaving(true)
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase.from("profiles").update(updatedData).eq("id", user.id)

      if (error) throw error

      setProfile((prev) => (prev ? { ...prev, ...updatedData } : null))
      setIsEditing(false)
      toast({
        title: "Muvaffaqiyat",
        description: "Profil muvaffaqiyatli yangilandi",
      })
    } catch (error) {
      console.error("Error updating profile:", error)
      toast({
        title: "Xatolik",
        description: "Profilni yangilashda xatolik yuz berdi",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const updatedData = {
      full_name: formData.get("full_name") as string,
      username: formData.get("username") as string,
      bio: formData.get("bio") as string,
      location: formData.get("location") as string,
      website: formData.get("website") as string,
      birth_date: formData.get("birth_date") as string,
    }
    updateProfile(updatedData)
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 rounded-lg"></div>
          <div className="h-64 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <p>Profil topilmadi</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Profile Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="relative">
                <Avatar className="w-32 h-32">
                  <AvatarImage src={profile.avatar_url || "/placeholder.svg"} alt={profile.full_name} />
                  <AvatarFallback className="text-2xl">
                    {profile.full_name?.charAt(0) || profile.username?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute bottom-0 right-0 rounded-full w-8 h-8 p-0"
                  onClick={() => setIsEditing(true)}
                >
                  <Camera className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex-1 space-y-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <h1 className="text-3xl font-bold">{profile.full_name}</h1>
                    <p className="text-muted-foreground">@{profile.username}</p>
                  </div>
                  <Button onClick={() => setIsEditing(!isEditing)} variant={isEditing ? "outline" : "default"}>
                    <Edit className="w-4 h-4 mr-2" />
                    {isEditing ? "Bekor qilish" : "Tahrirlash"}
                  </Button>
                </div>

                {profile.bio && <p className="text-gray-600">{profile.bio}</p>}

                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  {profile.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {profile.location}
                    </div>
                  )}
                  {profile.website && (
                    <div className="flex items-center gap-1">
                      <Globe className="w-4 h-4" />
                      <a href={profile.website} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        {profile.website}
                      </a>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <CalendarDays className="w-4 h-4" />
                    {new Date(profile.created_at).toLocaleDateString("uz-UZ")} dan beri
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Umumiy</TabsTrigger>
            <TabsTrigger value="stats">Statistika</TabsTrigger>
            <TabsTrigger value="achievements">Yutuqlar</TabsTrigger>
            <TabsTrigger value="edit">Tahrirlash</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <Film className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                  <div className="text-2xl font-bold">{stats?.movies_watched || 0}</div>
                  <div className="text-sm text-muted-foreground">Ko'rilgan filmlar</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Star className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
                  <div className="text-2xl font-bold">{stats?.average_rating?.toFixed(1) || "0.0"}</div>
                  <div className="text-sm text-muted-foreground">O'rtacha baho</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 text-green-500" />
                  <div className="text-2xl font-bold">{stats?.total_comments || 0}</div>
                  <div className="text-sm text-muted-foreground">Sharhlar</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Heart className="w-8 h-8 mx-auto mb-2 text-red-500" />
                  <div className="text-2xl font-bold">{stats?.total_favorites || 0}</div>
                  <div className="text-sm text-muted-foreground">Sevimlilar</div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>So'nggi faoliyat</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Star className="w-5 h-5 text-yellow-500" />
                    <div>
                      <p className="font-medium">"Inception" filmiga 5 yulduz berdi</p>
                      <p className="text-sm text-muted-foreground">2 soat oldin</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <MessageSquare className="w-5 h-5 text-green-500" />
                    <div>
                      <p className="font-medium">"The Dark Knight" filmiga sharh yozdi</p>
                      <p className="text-sm text-muted-foreground">1 kun oldin</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Heart className="w-5 h-5 text-red-500" />
                    <div>
                      <p className="font-medium">"Pulp Fiction" filmini sevimlilarga qo'shdi</p>
                      <p className="text-sm text-muted-foreground">3 kun oldin</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stats" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Sevimli janrlar</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Action</span>
                      <span className="text-sm">85%</span>
                    </div>
                    <Progress value={85} />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Drama</span>
                      <span className="text-sm">72%</span>
                    </div>
                    <Progress value={72} />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Comedy</span>
                      <span className="text-sm">68%</span>
                    </div>
                    <Progress value={68} />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm">Thriller</span>
                      <span className="text-sm">54%</span>
                    </div>
                    <Progress value={54} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Oylik faoliyat</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {["Yan", "Fev", "Mar", "Apr", "May", "Iyun"].map((month, index) => (
                      <div key={month} className="flex items-center gap-3">
                        <span className="w-8 text-sm">{month}</span>
                        <Progress value={Math.random() * 100} className="flex-1" />
                        <span className="w-8 text-sm text-right">{Math.floor(Math.random() * 50)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="achievements" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              {achievements.map((achievement) => (
                <Card key={achievement.id} className={achievement.earned ? "border-green-200 bg-green-50" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="text-2xl">{achievement.icon}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold">{achievement.name}</h3>
                          {achievement.earned && <Trophy className="w-4 h-4 text-yellow-500" />}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{achievement.description}</p>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span>
                              {achievement.progress}/{achievement.max_progress}
                            </span>
                            <span>{Math.round((achievement.progress / achievement.max_progress) * 100)}%</span>
                          </div>
                          <Progress value={(achievement.progress / achievement.max_progress) * 100} />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="edit" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Profil ma'lumotlarini tahrirlash</CardTitle>
                <CardDescription>Shaxsiy ma'lumotlaringizni yangilang</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">To'liq ism</Label>
                      <Input id="full_name" name="full_name" defaultValue={profile.full_name} required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="username">Foydalanuvchi nomi</Label>
                      <Input id="username" name="username" defaultValue={profile.username} required />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      name="bio"
                      defaultValue={profile.bio}
                      placeholder="O'zingiz haqingizda qisqacha..."
                      rows={3}
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="location">Joylashuv</Label>
                      <Input
                        id="location"
                        name="location"
                        defaultValue={profile.location}
                        placeholder="Shahar, Mamlakat"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="website">Veb-sayt</Label>
                      <Input
                        id="website"
                        name="website"
                        type="url"
                        defaultValue={profile.website}
                        placeholder="https://example.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="birth_date">Tug'ilgan sana</Label>
                    <Input id="birth_date" name="birth_date" type="date" defaultValue={profile.birth_date} />
                  </div>

                  <Button type="submit" disabled={saving}>
                    {saving ? "Saqlanmoqda..." : "Saqlash"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
