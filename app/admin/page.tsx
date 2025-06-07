"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import Navbar from "@/components/layout/navbar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import {
  Film,
  Users,
  MessageSquare,
  Plus,
  Shield,
  AlertCircle,
  Eye,
  Star,
  TrendingUp,
  Activity,
  BarChart3,
  Settings,
  Database,
  UserCheck,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react"
import type { User as SupabaseUser } from "@supabase/supabase-js"

interface Profile {
  id: string
  email: string
  full_name: string | null
  role: "user" | "admin"
}

interface Stats {
  totalMovies: number
  totalUsers: number
  totalComments: number
  totalViews: number
  avgRating: number
  recentMovies: number
  activeUsers: number
  pendingComments: number
  totalGenres: number
  totalTags: number
  approvedComments: number
  rejectedComments: number
}

interface RecentActivity {
  id: string
  type: "movie" | "user" | "comment" | "rating"
  title: string
  description: string
  time: string
  status?: "active" | "pending" | "inactive"
  user?: string
}

interface ChartData {
  name: string
  value: number
  color?: string
}

export default function AdminDashboard() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [stats, setStats] = useState<Stats>({
    totalMovies: 0,
    totalUsers: 0,
    totalComments: 0,
    totalViews: 0,
    avgRating: 0,
    recentMovies: 0,
    activeUsers: 0,
    pendingComments: 0,
    totalGenres: 0,
    totalTags: 0,
    approvedComments: 0,
    rejectedComments: 0,
  })
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [chartData, setChartData] = useState<{
    moviesChart: ChartData[]
    usersChart: ChartData[]
    ratingsChart: ChartData[]
  }>({
    moviesChart: [],
    usersChart: [],
    ratingsChart: [],
  })
  const router = useRouter()

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

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()

      if (profileError || !profileData) {
        console.error("Profile error:", profileError)
        router.push("/")
        return
      }

      if (profileData.role !== "admin") {
        router.push("/")
        return
      }

      setProfile(profileData)
      await refreshData()
    } catch (error) {
      console.error("Auth error:", error)
      router.push("/auth")
    } finally {
      setLoading(false)
    }
  }

  const refreshData = async () => {
    setRefreshing(true)
    try {
      await Promise.all([fetchStats(), fetchRecentActivity(), fetchChartData()])
    } catch (error) {
      console.error("Error refreshing data:", error)
    } finally {
      setRefreshing(false)
    }
  }

  const fetchStats = async () => {
    try {
      const [
        moviesResult,
        usersResult,
        commentsResult,
        viewsResult,
        ratingsResult,
        recentMoviesResult,
        activeUsersResult,
        pendingCommentsResult,
        genresResult,
        tagsResult,
        approvedCommentsResult,
      ] = await Promise.all([
        supabase.from("movies").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("comments").select("id", { count: "exact", head: true }),
        supabase.from("movies").select("view_count"),
        supabase.from("movies").select("rating"),
        supabase
          .from("movies")
          .select("id", { count: "exact", head: true })
          .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
        supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
        supabase.from("comments").select("id", { count: "exact", head: true }).eq("is_approved", false),
        supabase.from("genres").select("id", { count: "exact", head: true }),
        supabase.from("tags").select("id", { count: "exact", head: true }),
        supabase.from("comments").select("id", { count: "exact", head: true }).eq("is_approved", true),
      ])

      const totalViews = viewsResult.data?.reduce((sum, movie) => sum + (movie.view_count || 0), 0) || 0
      const avgRating = ratingsResult.data?.length
        ? ratingsResult.data.reduce((sum, movie) => sum + (movie.rating || 0), 0) / ratingsResult.data.length
        : 0

      setStats({
        totalMovies: moviesResult.count || 0,
        totalUsers: usersResult.count || 0,
        totalComments: commentsResult.count || 0,
        totalViews,
        avgRating,
        recentMovies: recentMoviesResult.count || 0,
        activeUsers: activeUsersResult.count || 0,
        pendingComments: pendingCommentsResult.count || 0,
        totalGenres: genresResult.count || 0,
        totalTags: tagsResult.count || 0,
        approvedComments: approvedCommentsResult.count || 0,
        rejectedComments:
          (commentsResult.count || 0) - (approvedCommentsResult.count || 0) - (pendingCommentsResult.count || 0),
      })
    } catch (error) {
      console.error("Error fetching stats:", error)
    }
  }

  const fetchRecentActivity = async () => {
    try {
      const [recentMovies, recentUsers, recentComments, recentRatings] = await Promise.all([
        supabase
          .from("movies")
          .select("id, title, created_at, status, profiles(full_name)")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("profiles")
          .select("id, full_name, email, created_at")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("comments")
          .select("id, content, created_at, is_approved, profiles(full_name), movies(title)")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("ratings")
          .select("rating, created_at, profiles(full_name), movies(title)")
          .order("created_at", { ascending: false })
          .limit(5),
      ])

      const activities: RecentActivity[] = []

      // Add recent movies
      recentMovies.data?.forEach((movie) => {
        activities.push({
          id: `movie-${movie.id}`,
          type: "movie",
          title: `Yangi kino qo'shildi`,
          description: movie.title,
          time: new Date(movie.created_at).toLocaleString("uz-UZ"),
          status: movie.status as "active" | "pending" | "inactive",
          user: (movie.profiles as any)?.full_name || "Admin",
        })
      })

      // Add recent users
      recentUsers.data?.forEach((user) => {
        activities.push({
          id: `user-${user.id}`,
          type: "user",
          title: `Yangi foydalanuvchi ro'yxatdan o'tdi`,
          description: user.full_name || user.email,
          time: new Date(user.created_at).toLocaleString("uz-UZ"),
          status: "active",
        })
      })

      // Add recent comments
      recentComments.data?.forEach((comment) => {
        activities.push({
          id: `comment-${comment.id}`,
          type: "comment",
          title: `Yangi sharh`,
          description: `${(comment.profiles as any)?.full_name || "Foydalanuvchi"} "${(comment.movies as any)?.title}" ga sharh qoldirdi`,
          time: new Date(comment.created_at).toLocaleString("uz-UZ"),
          status: comment.is_approved ? "active" : "pending",
          user: (comment.profiles as any)?.full_name,
        })
      })

      // Add recent ratings
      recentRatings.data?.forEach((rating) => {
        activities.push({
          id: `rating-${rating.created_at}`,
          type: "rating",
          title: `Yangi baho`,
          description: `${(rating.profiles as any)?.full_name || "Foydalanuvchi"} "${(rating.movies as any)?.title}" ga ${rating.rating} yulduz berdi`,
          time: new Date(rating.created_at).toLocaleString("uz-UZ"),
          status: "active",
          user: (rating.profiles as any)?.full_name,
        })
      })

      // Sort by time and take latest 15
      activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      setRecentActivity(activities.slice(0, 15))
    } catch (error) {
      console.error("Error fetching recent activity:", error)
    }
  }

  const fetchChartData = async () => {
    try {
      // Movies by status
      const { data: moviesByStatus } = await supabase.from("movies").select("status")

      const moviesChart = [
        { name: "Faol", value: moviesByStatus?.filter((m) => m.status === "active").length || 0, color: "#10B981" },
        {
          name: "Kutilmoqda",
          value: moviesByStatus?.filter((m) => m.status === "pending").length || 0,
          color: "#F59E0B",
        },
        { name: "Nofaol", value: moviesByStatus?.filter((m) => m.status === "inactive").length || 0, color: "#EF4444" },
      ]

      // Users by month (last 6 months)
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

      const { data: usersByMonth } = await supabase
        .from("profiles")
        .select("created_at")
        .gte("created_at", sixMonthsAgo.toISOString())

      const usersChart = Array.from({ length: 6 }, (_, i) => {
        const date = new Date()
        date.setMonth(date.getMonth() - (5 - i))
        const monthName = date.toLocaleDateString("uz-UZ", { month: "short" })
        const count =
          usersByMonth?.filter((u) => {
            const userDate = new Date(u.created_at)
            return userDate.getMonth() === date.getMonth() && userDate.getFullYear() === date.getFullYear()
          }).length || 0
        return { name: monthName, value: count }
      })

      // Ratings distribution
      const { data: ratingsData } = await supabase.from("ratings").select("rating")

      const ratingsChart = [
        { name: "1 yulduz", value: ratingsData?.filter((r) => r.rating === 1).length || 0 },
        { name: "2 yulduz", value: ratingsData?.filter((r) => r.rating === 2).length || 0 },
        { name: "3 yulduz", value: ratingsData?.filter((r) => r.rating === 3).length || 0 },
        { name: "4 yulduz", value: ratingsData?.filter((r) => r.rating === 4).length || 0 },
        { name: "5 yulduz", value: ratingsData?.filter((r) => r.rating === 5).length || 0 },
      ]

      setChartData({
        moviesChart,
        usersChart,
        ratingsChart,
      })
    } catch (error) {
      console.error("Error fetching chart data:", error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (!profile || profile.role !== "admin") {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Sizda admin paneliga kirish huquqi yo'q. Agar admin bo'lishingiz kerak bo'lsa, SQL skriptda emailingizni
              admin qilib belgilang.
            </AlertDescription>
          </Alert>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center space-x-2">
              <Shield className="h-8 w-8 text-primary" />
              <span>Admin Dashboard</span>
            </h1>
            <p className="text-muted-foreground mt-2">Kino platformasini boshqarish paneli</p>
          </div>
          <div className="flex items-center space-x-4">
            <Badge variant="secondary" className="text-sm">
              Admin: {profile.full_name || profile.email}
            </Badge>
            <Button onClick={refreshData} variant="outline" size="sm" disabled={refreshing}>
              <TrendingUp className="h-4 w-4 mr-2" />
              {refreshing ? "Yangilanmoqda..." : "Yangilash"}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Jami Kinolar</CardTitle>
              <Film className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalMovies}</div>
              <p className="text-xs opacity-80">+{stats.recentMovies} so'nggi 30 kunda</p>
              <Progress
                value={(stats.recentMovies / Math.max(stats.totalMovies, 1)) * 100}
                className="mt-2 bg-blue-400"
              />
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Foydalanuvchilar</CardTitle>
              <Users className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs opacity-80">+{stats.activeUsers} so'nggi haftada</p>
              <Progress
                value={(stats.activeUsers / Math.max(stats.totalUsers, 1)) * 100}
                className="mt-2 bg-green-400"
              />
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sharhlar</CardTitle>
              <MessageSquare className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalComments}</div>
              <p className="text-xs opacity-80">{stats.pendingComments} kutilmoqda</p>
              <Progress
                value={(stats.approvedComments / Math.max(stats.totalComments, 1)) * 100}
                className="mt-2 bg-purple-400"
              />
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ko'rishlar</CardTitle>
              <Eye className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalViews.toLocaleString()}</div>
              <p className="text-xs opacity-80">O'rtacha reyting: {stats.avgRating.toFixed(1)}</p>
              <div className="flex items-center mt-2">
                <Star className="h-3 w-3 mr-1 fill-current" />
                <Progress value={(stats.avgRating / 5) * 100} className="flex-1 bg-orange-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6 text-center">
              <Database className="h-8 w-8 text-blue-500 mx-auto mb-2" />
              <div className="text-2xl font-bold">{stats.totalGenres}</div>
              <div className="text-sm text-muted-foreground">Janrlar</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <Activity className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <div className="text-2xl font-bold">{stats.totalTags}</div>
              <div className="text-sm text-muted-foreground">Teglar</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
              <div className="text-2xl font-bold">{stats.approvedComments}</div>
              <div className="text-sm text-muted-foreground">Tasdiqlangan sharhlar</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <Clock className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
              <div className="text-2xl font-bold">{stats.pendingComments}</div>
              <div className="text-sm text-muted-foreground">Kutilayotgan sharhlar</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Management Tabs */}
          <div className="lg:col-span-2">
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">Umumiy</TabsTrigger>
                <TabsTrigger value="movies">Kinolar</TabsTrigger>
                <TabsTrigger value="users">Foydalanuvchilar</TabsTrigger>
                <TabsTrigger value="analytics">Analitika</TabsTrigger>
                <TabsTrigger value="settings">Sozlamalar</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Tezkor Harakatlar</CardTitle>
                    <CardDescription>Eng ko'p ishlatiladigan funksiyalar</CardDescription>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <Button asChild className="h-20 flex-col">
                      <a href="/admin/movies/new">
                        <Plus className="h-6 w-6 mb-2" />
                        Yangi Kino
                      </a>
                    </Button>
                    <Button asChild variant="outline" className="h-20 flex-col">
                      <a href="/admin/movies">
                        <Film className="h-6 w-6 mb-2" />
                        Kinolarni Boshqarish
                      </a>
                    </Button>
                    <Button asChild variant="outline" className="h-20 flex-col">
                      <a href="/admin/users">
                        <Users className="h-6 w-6 mb-2" />
                        Foydalanuvchilar
                      </a>
                    </Button>
                    <Button asChild variant="outline" className="h-20 flex-col">
                      <a href="/admin/comments">
                        <MessageSquare className="h-6 w-6 mb-2" />
                        Sharhlar
                      </a>
                    </Button>
                    <Button asChild variant="outline" className="h-20 flex-col">
                      <a href="/admin/genres">
                        <Database className="h-6 w-6 mb-2" />
                        Janrlar
                      </a>
                    </Button>
                    <Button asChild variant="outline" className="h-20 flex-col">
                      <a href="/admin/tags">
                        <Activity className="h-6 w-6 mb-2" />
                        Teglar
                      </a>
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Tizim Holati</CardTitle>
                    <CardDescription>Platformaning umumiy holati</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span>Faol kinolar</span>
                      <Badge variant="default">
                        {chartData.moviesChart.find((m) => m.name === "Faol")?.value || 0}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Kutilayotgan kinolar</span>
                      <Badge variant="secondary">
                        {chartData.moviesChart.find((m) => m.name === "Kutilmoqda")?.value || 0}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Tasdiqlangan sharhlar</span>
                      <Badge variant="outline">{stats.approvedComments}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Kutilayotgan sharhlar</span>
                      <Badge variant="destructive">{stats.pendingComments}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Tizim ishlash vaqti</span>
                      <Badge variant="default">99.9%</Badge>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="movies" className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Kinolarni Boshqarish</CardTitle>
                        <CardDescription>Kinolarni qo'shish, tahrirlash va o'chirish</CardDescription>
                      </div>
                      <Button asChild>
                        <a href="/admin/movies/new">
                          <Plus className="h-4 w-4 mr-2" />
                          Yangi Kino
                        </a>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      {chartData.moviesChart.map((item) => (
                        <Card key={item.name}>
                          <CardContent className="p-4 text-center">
                            <div className="text-2xl font-bold" style={{ color: item.color }}>
                              {item.value}
                            </div>
                            <div className="text-sm text-muted-foreground">{item.name}</div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <Button asChild className="w-full">
                        <a href="/admin/movies">Barcha kinolarni ko'rish</a>
                      </Button>
                      <Button asChild variant="outline" className="w-full">
                        <a href="/admin/movies?status=pending">Kutilayotgan kinolarni ko'rish</a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="users" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Foydalanuvchilarni Boshqarish</CardTitle>
                    <CardDescription>Foydalanuvchilar ro'yxati va ularning huquqlarini boshqarish</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <Card>
                        <CardContent className="p-4 text-center">
                          <Users className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                          <div className="text-2xl font-bold">{stats.totalUsers}</div>
                          <div className="text-sm text-muted-foreground">Jami foydalanuvchilar</div>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-4 text-center">
                          <UserCheck className="h-8 w-8 mx-auto mb-2 text-green-500" />
                          <div className="text-2xl font-bold">{stats.activeUsers}</div>
                          <div className="text-sm text-muted-foreground">Yangi foydalanuvchilar (hafta)</div>
                        </CardContent>
                      </Card>
                    </div>
                    <div className="space-y-2">
                      <Button asChild className="w-full">
                        <a href="/admin/users">Barcha foydalanuvchilarni ko'rish</a>
                      </Button>
                      <Button asChild variant="outline" className="w-full">
                        <a href="/admin/users?role=admin">Adminlarni ko'rish</a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="analytics" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Analitika va Hisobotlar</CardTitle>
                    <CardDescription>Platformaning ishlash ko'rsatkichlari</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold mb-3">Foydalanuvchilar o'sishi (6 oy)</h4>
                        <div className="space-y-2">
                          {chartData.usersChart.map((item, index) => (
                            <div key={index} className="flex items-center justify-between">
                              <span className="text-sm">{item.name}</span>
                              <div className="flex items-center space-x-2">
                                <div className="w-20 bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-blue-500 h-2 rounded-full"
                                    style={{
                                      width: `${(item.value / Math.max(...chartData.usersChart.map((u) => u.value), 1)) * 100}%`,
                                    }}
                                  ></div>
                                </div>
                                <span className="text-sm font-medium">{item.value}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-3">Reytinglar taqsimoti</h4>
                        <div className="space-y-2">
                          {chartData.ratingsChart.map((item, index) => (
                            <div key={index} className="flex items-center justify-between">
                              <span className="text-sm">{item.name}</span>
                              <div className="flex items-center space-x-2">
                                <div className="w-20 bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-yellow-500 h-2 rounded-full"
                                    style={{
                                      width: `${(item.value / Math.max(...chartData.ratingsChart.map((r) => r.value), 1)) * 100}%`,
                                    }}
                                  ></div>
                                </div>
                                <span className="text-sm font-medium">{item.value}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="settings" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Janrlar</CardTitle>
                      <CardDescription>Kino janrlarini boshqarish</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center mb-4">
                        <div className="text-2xl font-bold">{stats.totalGenres}</div>
                        <div className="text-sm text-muted-foreground">Jami janrlar</div>
                      </div>
                      <Button asChild variant="outline" className="w-full">
                        <a href="/admin/genres">
                          <Plus className="h-4 w-4 mr-2" />
                          Janrlarni boshqarish
                        </a>
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Teglar</CardTitle>
                      <CardDescription>Kino teglarini boshqarish</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center mb-4">
                        <div className="text-2xl font-bold">{stats.totalTags}</div>
                        <div className="text-sm text-muted-foreground">Jami teglar</div>
                      </div>
                      <Button asChild variant="outline" className="w-full">
                        <a href="/admin/tags">
                          <Plus className="h-4 w-4 mr-2" />
                          Teglarni boshqarish
                        </a>
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Tizim Sozlamalari</CardTitle>
                      <CardDescription>Umumiy tizim sozlamalari</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <Button variant="outline" className="w-full justify-start">
                          <Settings className="h-4 w-4 mr-2" />
                          Umumiy sozlamalar
                        </Button>
                        <Button variant="outline" className="w-full justify-start">
                          <Database className="h-4 w-4 mr-2" />
                          Ma'lumotlar bazasi
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Backup va Export</CardTitle>
                      <CardDescription>Ma'lumotlarni saqlash va eksport qilish</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <Button variant="outline" className="w-full justify-start">
                          <BarChart3 className="h-4 w-4 mr-2" />
                          Hisobotni eksport qilish
                        </Button>
                        <Button variant="outline" className="w-full justify-start">
                          <Database className="h-4 w-4 mr-2" />
                          Backup yaratish
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Recent Activity Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>So'nggi Faoliyat</span>
                  <Activity className="h-5 w-5" />
                </CardTitle>
                <CardDescription>Platformadagi eng so'nggi o'zgarishlar</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 max-h-96 overflow-y-auto">
                {recentActivity.length > 0 ? (
                  recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start space-x-3 p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors"
                    >
                      <div className="flex-shrink-0">
                        {activity.type === "movie" && <Film className="h-4 w-4 text-blue-500" />}
                        {activity.type === "user" && <Users className="h-4 w-4 text-green-500" />}
                        {activity.type === "comment" && <MessageSquare className="h-4 w-4 text-purple-500" />}
                        {activity.type === "rating" && <Star className="h-4 w-4 text-yellow-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{activity.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{activity.description}</p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-muted-foreground">{activity.time}</span>
                          {activity.status && (
                            <Badge
                              variant={
                                activity.status === "active"
                                  ? "default"
                                  : activity.status === "pending"
                                    ? "secondary"
                                    : "destructive"
                              }
                              className="text-xs"
                            >
                              {activity.status === "active" && <CheckCircle className="h-3 w-3 mr-1" />}
                              {activity.status === "pending" && <Clock className="h-3 w-3 mr-1" />}
                              {activity.status === "inactive" && <XCircle className="h-3 w-3 mr-1" />}
                              {activity.status === "active"
                                ? "Faol"
                                : activity.status === "pending"
                                  ? "Kutilmoqda"
                                  : "Nofaol"}
                            </Badge>
                          )}
                        </div>
                        {activity.user && (
                          <p className="text-xs text-muted-foreground mt-1">Foydalanuvchi: {activity.user}</p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Hali faoliyat yo'q</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* System Status */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Tizim Holati</span>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-green-600">Ishlayapti</span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Ma'lumotlar bazasi</span>
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Ishlayapti
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">API</span>
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Ishlayapti
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Fayl saqlash</span>
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Ishlayapti
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Backup</span>
                  <Badge variant="secondary">
                    <Clock className="h-3 w-3 mr-1" />
                    Rejalashtirilgan
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
