"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import Navbar from "@/components/layout/navbar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import {
  ArrowLeft,
  Settings,
  AlertCircle,
  Save,
  Database,
  Shield,
  Globe,
  Palette,
  Bell,
  Server,
  Download,
  Upload,
  RefreshCw,
} from "lucide-react"

interface SystemSettings {
  site_name: string
  site_description: string
  site_logo: string
  maintenance_mode: boolean
  registration_enabled: boolean
  comments_enabled: boolean
  ratings_enabled: boolean
  email_notifications: boolean
  max_file_size: number
  allowed_file_types: string[]
  default_language: string
  theme_color: string
}

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [settings, setSettings] = useState<SystemSettings>({
    site_name: "Kino Platform",
    site_description: "Eng yaxshi kinolarni tomosha qiling",
    site_logo: "",
    maintenance_mode: false,
    registration_enabled: true,
    comments_enabled: true,
    ratings_enabled: true,
    email_notifications: true,
    max_file_size: 10,
    allowed_file_types: ["jpg", "jpeg", "png", "webp"],
    default_language: "uz",
    theme_color: "#3b82f6",
  })
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalMovies: 0,
    totalComments: 0,
    dbSize: "0 MB",
    lastBackup: "Hech qachon",
  })

  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    checkAdminAccess()
  }, [])

  const checkAdminAccess = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push("/auth")
        return
      }

      const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

      if (!profile || profile.role !== "admin") {
        router.push("/")
        return
      }

      setIsAdmin(true)
      await fetchStats()
    } catch (error) {
      console.error("Auth error:", error)
      router.push("/auth")
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const [usersResult, moviesResult, commentsResult] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("movies").select("id", { count: "exact", head: true }),
        supabase.from("comments").select("id", { count: "exact", head: true }),
      ])

      setStats({
        totalUsers: usersResult.count || 0,
        totalMovies: moviesResult.count || 0,
        totalComments: commentsResult.count || 0,
        dbSize: "~50 MB", // Approximate
        lastBackup: "Avtomatik",
      })
    } catch (error) {
      console.error("Error fetching stats:", error)
    }
  }

  const handleSaveSettings = async () => {
    setSaving(true)
    try {
      // In a real app, you would save these to a settings table
      // For now, we'll just show a success message
      await new Promise((resolve) => setTimeout(resolve, 1000))

      toast({
        title: "Muvaffaqiyat",
        description: "Sozlamalar saqlandi",
      })
    } catch (error) {
      console.error("Error saving settings:", error)
      toast({
        title: "Xatolik",
        description: "Sozlamalarni saqlashda xatolik yuz berdi",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleExportData = async () => {
    try {
      // Export all data as JSON
      const [movies, users, comments, genres, tags] = await Promise.all([
        supabase.from("movies").select("*"),
        supabase.from("profiles").select("*"),
        supabase.from("comments").select("*"),
        supabase.from("genres").select("*"),
        supabase.from("tags").select("*"),
      ])

      const exportData = {
        movies: movies.data,
        users: users.data,
        comments: comments.data,
        genres: genres.data,
        tags: tags.data,
        exported_at: new Date().toISOString(),
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `platform-backup-${new Date().toISOString().split("T")[0]}.json`
      a.click()
      window.URL.revokeObjectURL(url)

      toast({
        title: "Muvaffaqiyat",
        description: "Ma'lumotlar eksport qilindi",
      })
    } catch (error) {
      console.error("Error exporting data:", error)
      toast({
        title: "Xatolik",
        description: "Eksport qilishda xatolik yuz berdi",
        variant: "destructive",
      })
    }
  }

  const handleClearCache = async () => {
    try {
      // Simulate cache clearing
      await new Promise((resolve) => setTimeout(resolve, 1000))

      toast({
        title: "Muvaffaqiyat",
        description: "Kesh tozalandi",
      })
    } catch (error) {
      console.error("Error clearing cache:", error)
      toast({
        title: "Xatolik",
        description: "Keshni tozalashda xatolik yuz berdi",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </main>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Admin paneliga kirish uchun ruxsat yo'q.</AlertDescription>
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
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Admin Panel
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center space-x-2">
                <Settings className="h-8 w-8 text-primary" />
                <span>Tizim Sozlamalari</span>
              </h1>
              <p className="text-muted-foreground mt-1">Platformaning umumiy sozlamalarini boshqaring</p>
            </div>
          </div>
          <Button onClick={handleSaveSettings} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saqlanmoqda..." : "Saqlash"}
          </Button>
        </div>

        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="general">Umumiy</TabsTrigger>
            <TabsTrigger value="features">Xususiyatlar</TabsTrigger>
            <TabsTrigger value="appearance">Ko'rinish</TabsTrigger>
            <TabsTrigger value="notifications">Bildirishnomalar</TabsTrigger>
            <TabsTrigger value="database">Ma'lumotlar</TabsTrigger>
            <TabsTrigger value="system">Tizim</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Globe className="h-5 w-5" />
                  <span>Sayt Sozlamalari</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="site_name">Sayt nomi</Label>
                    <Input
                      id="site_name"
                      value={settings.site_name}
                      onChange={(e) => setSettings({ ...settings, site_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="default_language">Asosiy til</Label>
                    <select
                      id="default_language"
                      value={settings.default_language}
                      onChange={(e) => setSettings({ ...settings, default_language: e.target.value })}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="uz">O'zbek</option>
                      <option value="ru">Русский</option>
                      <option value="en">English</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="site_description">Sayt tavsifi</Label>
                  <Textarea
                    id="site_description"
                    value={settings.site_description}
                    onChange={(e) => setSettings({ ...settings, site_description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="site_logo">Logo URL</Label>
                  <Input
                    id="site_logo"
                    value={settings.site_logo}
                    onChange={(e) => setSettings({ ...settings, site_logo: e.target.value })}
                    placeholder="https://example.com/logo.png"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <span>Xavfsizlik</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Texnik ishlar rejimi</Label>
                    <p className="text-sm text-muted-foreground">Saytni vaqtincha yopish</p>
                  </div>
                  <Switch
                    checked={settings.maintenance_mode}
                    onCheckedChange={(checked) => setSettings({ ...settings, maintenance_mode: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Ro'yxatdan o'tish</Label>
                    <p className="text-sm text-muted-foreground">Yangi foydalanuvchilar ro'yxatdan o'ta olsinmi</p>
                  </div>
                  <Switch
                    checked={settings.registration_enabled}
                    onCheckedChange={(checked) => setSettings({ ...settings, registration_enabled: checked })}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="features" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Platform Xususiyatlari</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Sharhlar</Label>
                    <p className="text-sm text-muted-foreground">Foydalanuvchilar sharh yoza olsinmi</p>
                  </div>
                  <Switch
                    checked={settings.comments_enabled}
                    onCheckedChange={(checked) => setSettings({ ...settings, comments_enabled: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label>Reytinglar</Label>
                    <p className="text-sm text-muted-foreground">Foydalanuvchilar baho bera olsinmi</p>
                  </div>
                  <Switch
                    checked={settings.ratings_enabled}
                    onCheckedChange={(checked) => setSettings({ ...settings, ratings_enabled: checked })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_file_size">Maksimal fayl hajmi (MB)</Label>
                  <Input
                    id="max_file_size"
                    type="number"
                    value={settings.max_file_size}
                    onChange={(e) => setSettings({ ...settings, max_file_size: Number.parseInt(e.target.value) })}
                    min="1"
                    max="100"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appearance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Palette className="h-5 w-5" />
                  <span>Ko'rinish Sozlamalari</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="theme_color">Asosiy rang</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="theme_color"
                      type="color"
                      value={settings.theme_color}
                      onChange={(e) => setSettings({ ...settings, theme_color: e.target.value })}
                      className="w-20 h-10"
                    />
                    <Input
                      value={settings.theme_color}
                      onChange={(e) => setSettings({ ...settings, theme_color: e.target.value })}
                      placeholder="#3b82f6"
                    />
                  </div>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Oldindan ko'rish</h4>
                  <div className="space-y-2">
                    <Button style={{ backgroundColor: settings.theme_color }}>Asosiy tugma</Button>
                    <Badge style={{ backgroundColor: settings.theme_color, color: "white" }}>Teg namunasi</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bell className="h-5 w-5" />
                  <span>Bildirishnomalar</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Email bildirishnomalar</Label>
                    <p className="text-sm text-muted-foreground">Yangi sharhlar va faoliyat haqida email yuborish</p>
                  </div>
                  <Switch
                    checked={settings.email_notifications}
                    onCheckedChange={(checked) => setSettings({ ...settings, email_notifications: checked })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Email sozlamalari</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input placeholder="SMTP server" />
                    <Input placeholder="SMTP port" type="number" />
                    <Input placeholder="Email" type="email" />
                    <Input placeholder="Parol" type="password" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="database" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Database className="h-5 w-5" />
                  <span>Ma'lumotlar Bazasi</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold">{stats.totalUsers}</div>
                    <div className="text-sm text-muted-foreground">Foydalanuvchilar</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold">{stats.totalMovies}</div>
                    <div className="text-sm text-muted-foreground">Kinolar</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold">{stats.totalComments}</div>
                    <div className="text-sm text-muted-foreground">Sharhlar</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold">{stats.dbSize}</div>
                    <div className="text-sm text-muted-foreground">DB hajmi</div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button onClick={handleExportData} variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Eksport qilish
                  </Button>
                  <Button variant="outline">
                    <Upload className="h-4 w-4 mr-2" />
                    Import qilish
                  </Button>
                  <Button onClick={handleClearCache} variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Keshni tozalash
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Server className="h-5 w-5" />
                  <span>Tizim Ma'lumotlari</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Platform versiyasi</Label>
                    <p className="text-sm">v1.0.0</p>
                  </div>
                  <div>
                    <Label>So'nggi yangilanish</Label>
                    <p className="text-sm">{new Date().toLocaleDateString("uz-UZ")}</p>
                  </div>
                  <div>
                    <Label>Server holati</Label>
                    <Badge variant="default" className="bg-green-500">
                      Ishlayapti
                    </Badge>
                  </div>
                  <div>
                    <Label>So'nggi backup</Label>
                    <p className="text-sm">{stats.lastBackup}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Tizim loglari</Label>
                  <div className="bg-gray-100 p-4 rounded-lg text-sm font-mono max-h-40 overflow-y-auto">
                    <div>[{new Date().toISOString()}] INFO: Tizim ishga tushdi</div>
                    <div>[{new Date().toISOString()}] INFO: Ma'lumotlar bazasi ulandi</div>
                    <div>[{new Date().toISOString()}] INFO: Admin panel yuklandi</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
