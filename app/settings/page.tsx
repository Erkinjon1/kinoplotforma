"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import Navbar from "@/components/layout/navbar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import {
  Shield,
  Bell,
  Palette,
  Download,
  Trash2,
  Key,
  Smartphone,
  Monitor,
  Moon,
  Sun,
  Lock,
  AlertTriangle,
  CheckCircle,
  SettingsIcon,
  Save,
  User,
} from "lucide-react"
import type { User as SupabaseUser } from "@supabase/supabase-js"

interface UserSettings {
  id: string
  profile_visibility: "public" | "private" | "friends"
  show_email: boolean
  show_activity: boolean
  show_watchlist: boolean
  email_notifications: boolean
  push_notifications: boolean
  comment_notifications: boolean
  rating_notifications: boolean
  newsletter: boolean
  language: "uz" | "ru" | "en"
  theme: "light" | "dark" | "system"
  movies_per_page: number
  default_quality: "720p" | "1080p" | "4k"
  two_factor_enabled: boolean
  login_notifications: boolean
  session_timeout: number
  autoplay_trailers: boolean
  sound_effects: boolean
  created_at: string
  updated_at: string
}

interface SecuritySession {
  id: string
  device: string
  location: string
  last_active: string
  current: boolean
}

interface PasswordForm {
  current: string
  new: string
  confirm: string
}

export default function SettingsPage() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [sessions, setSessions] = useState<SecuritySession[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    current: "",
    new: "",
    confirm: "",
  })
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

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
      await Promise.all([fetchSettings(user.id), fetchSessions()])
    } catch (error) {
      console.error("Auth error:", error)
      router.push("/auth")
    } finally {
      setLoading(false)
    }
  }

  const fetchSettings = async (userId: string) => {
    try {
      // First, try to get existing settings
      const { data, error } = await supabase.from("user_settings").select("*").eq("id", userId).single()

      if (error && error.code !== "PGRST116") {
        throw error
      }

      if (data) {
        setSettings(data)
      } else {
        // Create default settings if they don't exist
        const defaultSettings = {
          id: userId,
          profile_visibility: "public" as const,
          show_email: false,
          show_activity: true,
          show_watchlist: true,
          email_notifications: true,
          push_notifications: true,
          comment_notifications: true,
          rating_notifications: false,
          newsletter: false,
          language: "uz" as const,
          theme: "system" as const,
          movies_per_page: 20,
          default_quality: "1080p" as const,
          two_factor_enabled: false,
          login_notifications: true,
          session_timeout: 30,
          autoplay_trailers: true,
          sound_effects: true,
        }

        const { data: newSettings, error: createError } = await supabase
          .from("user_settings")
          .insert(defaultSettings)
          .select()
          .single()

        if (createError) {
          console.error("Error creating settings:", createError)
          // Set default settings locally if database insert fails
          setSettings({
            ...defaultSettings,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
        } else {
          setSettings(newSettings)
        }
      }
    } catch (error) {
      console.error("Error fetching settings:", error)
      toast({
        title: "Xatolik",
        description: "Sozlamalarni yuklashda xatolik yuz berdi",
        variant: "destructive",
      })
    }
  }

  const fetchSessions = () => {
    // Mock sessions data
    setSessions([
      {
        id: "1",
        device: "Chrome on Windows",
        location: "Toshkent, O'zbekiston",
        last_active: "Hozir",
        current: true,
      },
      {
        id: "2",
        device: "Safari on iPhone",
        location: "Toshkent, O'zbekiston",
        last_active: "2 soat oldin",
        current: false,
      },
      {
        id: "3",
        device: "Firefox on Linux",
        location: "Samarqand, O'zbekiston",
        last_active: "1 kun oldin",
        current: false,
      },
    ])
  }

  const updateSettings = async (updates: Partial<UserSettings>) => {
    if (!user || !settings) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from("user_settings")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", user.id)

      if (error) throw error

      setSettings({ ...settings, ...updates })
      toast({
        title: "Muvaffaqiyat",
        description: "Sozlamalar saqlandi",
      })
    } catch (error) {
      console.error("Error updating settings:", error)
      toast({
        title: "Xatolik",
        description: "Sozlamalarni saqlashda xatolik yuz berdi",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordChange = async () => {
    if (passwordForm.new !== passwordForm.confirm) {
      toast({
        title: "Xatolik",
        description: "Yangi parollar mos kelmaydi",
        variant: "destructive",
      })
      return
    }

    if (passwordForm.new.length < 6) {
      toast({
        title: "Xatolik",
        description: "Parol kamida 6 ta belgidan iborat bo'lishi kerak",
        variant: "destructive",
      })
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({ password: passwordForm.new })
      if (error) throw error

      setPasswordForm({ current: "", new: "", confirm: "" })
      toast({
        title: "Muvaffaqiyat",
        description: "Parol muvaffaqiyatli o'zgartirildi",
      })
    } catch (error) {
      console.error("Error changing password:", error)
      toast({
        title: "Xatolik",
        description: "Parolni o'zgartirishda xatolik yuz berdi",
        variant: "destructive",
      })
    }
  }

  const handleExportData = async () => {
    try {
      if (!user) return

      // Fetch all user data
      const [profileData, ratingsData, commentsData, favoritesData] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id),
        supabase.from("ratings").select("*").eq("user_id", user.id),
        supabase.from("comments").select("*").eq("user_id", user.id),
        supabase.from("favorites").select("*").eq("user_id", user.id),
      ])

      const exportData = {
        user: {
          id: user.id,
          email: user.email,
          created_at: user.created_at,
        },
        profile: profileData.data?.[0] || null,
        settings: settings,
        ratings: ratingsData.data || [],
        comments: commentsData.data || [],
        favorites: favoritesData.data || [],
        exported_at: new Date().toISOString(),
      }

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `movie-platform-data-${new Date().toISOString().split("T")[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: "Muvaffaqiyat",
        description: "Ma'lumotlar eksport qilindi",
      })
    } catch (error) {
      console.error("Error exporting data:", error)
      toast({
        title: "Xatolik",
        description: "Ma'lumotlarni eksport qilishda xatolik yuz berdi",
        variant: "destructive",
      })
    }
  }

  const handleDeleteAccount = async () => {
    try {
      // In a real app, this would be a server action that properly deletes all user data
      toast({
        title: "Ogohlantirish",
        description: "Hisob o'chirish funksiyasi hali ishlab chiqilmoqda",
        variant: "destructive",
      })
      setShowDeleteConfirm(false)
    } catch (error) {
      console.error("Error deleting account:", error)
    }
  }

  const terminateSession = async (sessionId: string) => {
    try {
      setSessions(sessions.filter((s) => s.id !== sessionId))
      toast({
        title: "Muvaffaqiyat",
        description: "Session tugatildi",
      })
    } catch (error) {
      console.error("Error terminating session:", error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </main>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>Sozlamalar yuklanmadi. Sahifani yangilang.</AlertDescription>
          </Alert>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-2">
            <SettingsIcon className="h-8 w-8" />
            <div>
              <h1 className="text-3xl font-bold">Sozlamalar</h1>
              <p className="text-muted-foreground">Hisobingiz va ilovangiz sozlamalarini boshqaring</p>
            </div>
          </div>
          <Button onClick={() => updateSettings({})} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saqlanmoqda..." : "Saqlash"}
          </Button>
        </div>

        <Tabs defaultValue="privacy" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="privacy">Maxfiylik</TabsTrigger>
            <TabsTrigger value="notifications">Bildirishnomalar</TabsTrigger>
            <TabsTrigger value="appearance">Ko'rinish</TabsTrigger>
            <TabsTrigger value="security">Xavfsizlik</TabsTrigger>
            <TabsTrigger value="data">Ma'lumotlar</TabsTrigger>
            <TabsTrigger value="account">Hisob</TabsTrigger>
          </TabsList>

          {/* Privacy Settings */}
          <TabsContent value="privacy">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Shield className="h-5 w-5" />
                  <span>Maxfiylik Sozlamalari</span>
                </CardTitle>
                <CardDescription>Kim sizning ma'lumotlaringizni ko'rishi mumkinligini boshqaring</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Profil ko'rinishi</Label>
                      <p className="text-sm text-muted-foreground">Kim sizning profilingizni ko'rishi mumkin</p>
                    </div>
                    <Select
                      value={settings.profile_visibility}
                      onValueChange={(value: "public" | "friends" | "private") =>
                        updateSettings({ profile_visibility: value })
                      }
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="public">Hammaga</SelectItem>
                        <SelectItem value="friends">Do'stlarga</SelectItem>
                        <SelectItem value="private">Faqat menga</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Email manzilini ko'rsatish</Label>
                      <p className="text-sm text-muted-foreground">Boshqalar sizning email manzilingizni ko'rishi</p>
                    </div>
                    <Switch
                      checked={settings.show_email}
                      onCheckedChange={(checked) => updateSettings({ show_email: checked })}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Faoliyatni ko'rsatish</Label>
                      <p className="text-sm text-muted-foreground">So'nggi faoliyatingiz boshqalarga ko'rinadi</p>
                    </div>
                    <Switch
                      checked={settings.show_activity}
                      onCheckedChange={(checked) => updateSettings({ show_activity: checked })}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Sevimli kinolarni ko'rsatish</Label>
                      <p className="text-sm text-muted-foreground">Sevimli filmlaringiz boshqalarga ko'rinadi</p>
                    </div>
                    <Switch
                      checked={settings.show_watchlist}
                      onCheckedChange={(checked) => updateSettings({ show_watchlist: checked })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Bell className="h-5 w-5" />
                  <span>Bildirishnoma Sozlamalari</span>
                </CardTitle>
                <CardDescription>Qanday bildirishnomalar olishni tanlang</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Email bildirishnomalar</Label>
                      <p className="text-sm text-muted-foreground">Muhim yangiliklar haqida email orqali xabar</p>
                    </div>
                    <Switch
                      checked={settings.email_notifications}
                      onCheckedChange={(checked) => updateSettings({ email_notifications: checked })}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Push bildirishnomalar</Label>
                      <p className="text-sm text-muted-foreground">Brauzer orqali bildirishnomalar</p>
                    </div>
                    <Switch
                      checked={settings.push_notifications}
                      onCheckedChange={(checked) => updateSettings({ push_notifications: checked })}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Sharh bildirishnomalari</Label>
                      <p className="text-sm text-muted-foreground">Yangi sharhlar haqida xabar</p>
                    </div>
                    <Switch
                      checked={settings.comment_notifications}
                      onCheckedChange={(checked) => updateSettings({ comment_notifications: checked })}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Reyting bildirishnomalari</Label>
                      <p className="text-sm text-muted-foreground">Yangi baholar haqida xabar</p>
                    </div>
                    <Switch
                      checked={settings.rating_notifications}
                      onCheckedChange={(checked) => updateSettings({ rating_notifications: checked })}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Newsletter</Label>
                      <p className="text-sm text-muted-foreground">Haftalik yangiliklar va tavsiyalar</p>
                    </div>
                    <Switch
                      checked={settings.newsletter}
                      onCheckedChange={(checked) => updateSettings({ newsletter: checked })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance */}
          <TabsContent value="appearance">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Palette className="h-5 w-5" />
                  <span>Ko'rinish Sozlamalari</span>
                </CardTitle>
                <CardDescription>Interfeys ko'rinishini sozlang</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Tema</Label>
                      <p className="text-sm text-muted-foreground">Yorug' yoki qorong'u rejimni tanlang</p>
                    </div>
                    <Select
                      value={settings.theme}
                      onValueChange={(value: "light" | "dark" | "system") => updateSettings({ theme: value })}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">
                          <div className="flex items-center space-x-2">
                            <Sun className="h-4 w-4" />
                            <span>Yorug'</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="dark">
                          <div className="flex items-center space-x-2">
                            <Moon className="h-4 w-4" />
                            <span>Qorong'u</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="system">
                          <div className="flex items-center space-x-2">
                            <Monitor className="h-4 w-4" />
                            <span>Tizim</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Til</Label>
                      <p className="text-sm text-muted-foreground">Interfeys tilini tanlang</p>
                    </div>
                    <Select
                      value={settings.language}
                      onValueChange={(value: "uz" | "ru" | "en") => updateSettings({ language: value })}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="uz">O'zbekcha</SelectItem>
                        <SelectItem value="ru">Русский</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Sahifadagi kinolar soni</Label>
                      <p className="text-sm text-muted-foreground">Bir sahifada ko'rsatiladigan kinolar soni</p>
                    </div>
                    <Select
                      value={settings.movies_per_page.toString()}
                      onValueChange={(value) => updateSettings({ movies_per_page: Number.parseInt(value) })}
                    >
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Video sifati</Label>
                      <p className="text-sm text-muted-foreground">Standart video sifatini tanlang</p>
                    </div>
                    <Select
                      value={settings.default_quality}
                      onValueChange={(value: "720p" | "1080p" | "4k") => updateSettings({ default_quality: value })}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="720p">720p</SelectItem>
                        <SelectItem value="1080p">1080p</SelectItem>
                        <SelectItem value="4k">4K</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Avtomatik ijro</Label>
                      <p className="text-sm text-muted-foreground">Treilerlarni avtomatik ijro qilish</p>
                    </div>
                    <Switch
                      checked={settings.autoplay_trailers}
                      onCheckedChange={(checked) => updateSettings({ autoplay_trailers: checked })}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Ovoz effektlari</Label>
                      <p className="text-sm text-muted-foreground">Interfeys ovoz effektlari</p>
                    </div>
                    <Switch
                      checked={settings.sound_effects}
                      onCheckedChange={(checked) => updateSettings({ sound_effects: checked })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security */}
          <TabsContent value="security">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Lock className="h-5 w-5" />
                    <span>Parol va Xavfsizlik</span>
                  </CardTitle>
                  <CardDescription>Hisobingizni himoya qiling</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="current-password">Joriy parol</Label>
                      <Input
                        id="current-password"
                        type="password"
                        value={passwordForm.current}
                        onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                        placeholder="Joriy parolingizni kiriting"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-password">Yangi parol</Label>
                      <Input
                        id="new-password"
                        type="password"
                        value={passwordForm.new}
                        onChange={(e) => setPasswordForm({ ...passwordForm, new: e.target.value })}
                        placeholder="Yangi parolni kiriting"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-password">Parolni tasdiqlang</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        value={passwordForm.confirm}
                        onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                        placeholder="Yangi parolni qayta kiriting"
                      />
                    </div>
                    <Button
                      onClick={handlePasswordChange}
                      disabled={!passwordForm.new || !passwordForm.confirm}
                      className="w-full"
                    >
                      <Key className="h-4 w-4 mr-2" />
                      Parolni o'zgartirish
                    </Button>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Ikki bosqichli autentifikatsiya</Label>
                        <p className="text-sm text-muted-foreground">Qo'shimcha xavfsizlik qatlami</p>
                      </div>
                      <div className="flex items-center space-x-2">
                        {settings.two_factor_enabled ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        )}
                        <Switch
                          checked={settings.two_factor_enabled}
                          onCheckedChange={(checked) => updateSettings({ two_factor_enabled: checked })}
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Login bildirishnomalar</Label>
                        <p className="text-sm text-muted-foreground">Yangi kirishlar haqida xabar</p>
                      </div>
                      <Switch
                        checked={settings.login_notifications}
                        onCheckedChange={(checked) => updateSettings({ login_notifications: checked })}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Smartphone className="h-5 w-5" />
                    <span>Faol Sessionlar</span>
                  </CardTitle>
                  <CardDescription>Hisobingizga kirgan qurilmalar</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {sessions.map((session) => (
                      <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <p className="font-medium">{session.device}</p>
                            {session.current && (
                              <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">Joriy</span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{session.location}</p>
                          <p className="text-xs text-muted-foreground">So'nggi faollik: {session.last_active}</p>
                        </div>
                        {!session.current && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => terminateSession(session.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            Tugatish
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Data Management */}
          <TabsContent value="data">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Download className="h-5 w-5" />
                  <span>Ma'lumotlar Boshqaruvi</span>
                </CardTitle>
                <CardDescription>Shaxsiy ma'lumotlaringizni boshqaring</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Ma'lumotlarni eksport qilish</Label>
                      <p className="text-sm text-muted-foreground">Barcha ma'lumotlaringizni JSON formatida yuklang</p>
                    </div>
                    <Button variant="outline" onClick={handleExportData}>
                      <Download className="h-4 w-4 mr-2" />
                      Eksport
                    </Button>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Keshni tozalash</Label>
                      <p className="text-sm text-muted-foreground">Saqlangan ma'lumotlarni tozalash</p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => {
                        localStorage.clear()
                        sessionStorage.clear()
                        toast({
                          title: "Muvaffaqiyat",
                          description: "Kesh tozalandi",
                        })
                      }}
                    >
                      Tozalash
                    </Button>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Faoliyat tarixi</Label>
                      <p className="text-sm text-muted-foreground">So'nggi 30 kunlik faoliyat</p>
                    </div>
                    <Button variant="outline" asChild>
                      <a href="/profile">Ko'rish</a>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Account Management */}
          <TabsContent value="account">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <User className="h-5 w-5" />
                    <span>Hisob Ma'lumotlari</span>
                  </CardTitle>
                  <CardDescription>Asosiy hisob sozlamalari</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email manzil</Label>
                    <Input id="email" type="email" value={user?.email || ""} disabled />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="created">Ro'yxatdan o'tgan sana</Label>
                    <Input
                      id="created"
                      value={user?.created_at ? new Date(user.created_at).toLocaleDateString("uz-UZ") : ""}
                      disabled
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last-signin">So'nggi kirish</Label>
                    <Input
                      id="last-signin"
                      value={user?.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString("uz-UZ") : ""}
                      disabled
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-red-200">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2 text-red-600">
                    <Trash2 className="h-5 w-5" />
                    <span>Xavfli Zona</span>
                  </CardTitle>
                  <CardDescription>Qaytarib bo'lmaydigan amallar</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!showDeleteConfirm ? (
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-red-600">Hisobni o'chirish</Label>
                        <p className="text-sm text-muted-foreground">
                          Bu amal qaytarib bo'lmaydi. Barcha ma'lumotlaringiz o'chiriladi.
                        </p>
                      </div>
                      <Button variant="destructive" onClick={() => setShowDeleteConfirm(true)}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        O'chirish
                      </Button>
                    </div>
                  ) : (
                    <Alert className="border-red-200">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="space-y-3">
                          <p>Hisobingizni o'chirishni tasdiqlaysizmi? Bu amal qaytarib bo'lmaydi.</p>
                          <div className="flex space-x-2">
                            <Button variant="destructive" size="sm" onClick={handleDeleteAccount}>
                              Ha, o'chirish
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setShowDeleteConfirm(false)}>
                              Bekor qilish
                            </Button>
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
