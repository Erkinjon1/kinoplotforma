"use client"

import type React from "react"

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Plus, X, Save, Eye, AlertCircle, Film, Star } from "lucide-react"

interface Genre {
  id: number
  name: string
  name_uz: string | null
}

interface Tag {
  id: number
  name: string
  color: string
}

interface MovieForm {
  title: string
  title_uz: string
  title_ru: string
  title_en: string
  description: string
  description_uz: string
  description_ru: string
  description_en: string
  poster_url: string
  trailer_url: string
  release_year: number | null
  duration: number | null
  director: string
  actors: string[]
  country: string
  language: string
  status: "active" | "inactive" | "pending"
  selectedGenres: number[]
  selectedTags: number[]
}

export default function NewMoviePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [genres, setGenres] = useState<Genre[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [newActor, setNewActor] = useState("")
  const [form, setForm] = useState<MovieForm>({
    title: "",
    title_uz: "",
    title_ru: "",
    title_en: "",
    description: "",
    description_uz: "",
    description_ru: "",
    description_en: "",
    poster_url: "",
    trailer_url: "",
    release_year: null,
    duration: null,
    director: "",
    actors: [],
    country: "",
    language: "",
    status: "pending",
    selectedGenres: [],
    selectedTags: [],
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
      await fetchData()
    } catch (error) {
      console.error("Auth error:", error)
      router.push("/auth")
    } finally {
      setLoading(false)
    }
  }

  const fetchData = async () => {
    try {
      const [genresResult, tagsResult] = await Promise.all([
        supabase.from("genres").select("*").order("name"),
        supabase.from("tags").select("*").order("name"),
      ])

      if (genresResult.data) setGenres(genresResult.data)
      if (tagsResult.data) setTags(tagsResult.data)
    } catch (error) {
      console.error("Error fetching data:", error)
    }
  }

  const handleInputChange = (field: keyof MovieForm, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const addActor = () => {
    if (newActor.trim() && !form.actors.includes(newActor.trim())) {
      setForm((prev) => ({
        ...prev,
        actors: [...prev.actors, newActor.trim()],
      }))
      setNewActor("")
    }
  }

  const removeActor = (actor: string) => {
    setForm((prev) => ({
      ...prev,
      actors: prev.actors.filter((a) => a !== actor),
    }))
  }

  const toggleGenre = (genreId: number) => {
    setForm((prev) => ({
      ...prev,
      selectedGenres: prev.selectedGenres.includes(genreId)
        ? prev.selectedGenres.filter((id) => id !== genreId)
        : [...prev.selectedGenres, genreId],
    }))
  }

  const toggleTag = (tagId: number) => {
    setForm((prev) => ({
      ...prev,
      selectedTags: prev.selectedTags.includes(tagId)
        ? prev.selectedTags.filter((id) => id !== tagId)
        : [...prev.selectedTags, tagId],
    }))
  }

  const validateForm = () => {
    if (!form.title.trim()) {
      toast({
        title: "Xatolik",
        description: "Kino nomi majburiy",
        variant: "destructive",
      })
      return false
    }

    if (!form.description.trim()) {
      toast({
        title: "Xatolik",
        description: "Kino tavsifi majburiy",
        variant: "destructive",
      })
      return false
    }

    if (form.selectedGenres.length === 0) {
      toast({
        title: "Xatolik",
        description: "Kamida bitta janr tanlang",
        variant: "destructive",
      })
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setSaving(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      // Insert movie
      const { data: movie, error: movieError } = await supabase
        .from("movies")
        .insert({
          title: form.title,
          title_uz: form.title_uz || null,
          title_ru: form.title_ru || null,
          title_en: form.title_en || null,
          description: form.description,
          description_uz: form.description_uz || null,
          description_ru: form.description_ru || null,
          description_en: form.description_en || null,
          poster_url: form.poster_url || null,
          trailer_url: form.trailer_url || null,
          release_year: form.release_year,
          duration: form.duration,
          director: form.director || null,
          actors: form.actors.length > 0 ? form.actors : null,
          country: form.country || null,
          language: form.language || null,
          status: form.status,
          created_by: user?.id,
        })
        .select()
        .single()

      if (movieError) throw movieError

      // Insert movie genres
      if (form.selectedGenres.length > 0) {
        const genreInserts = form.selectedGenres.map((genreId) => ({
          movie_id: movie.id,
          genre_id: genreId,
        }))

        const { error: genresError } = await supabase.from("movie_genres").insert(genreInserts)

        if (genresError) throw genresError
      }

      // Insert movie tags
      if (form.selectedTags.length > 0) {
        const tagInserts = form.selectedTags.map((tagId) => ({
          movie_id: movie.id,
          tag_id: tagId,
        }))

        const { error: tagsError } = await supabase.from("movie_tags").insert(tagInserts)

        if (tagsError) throw tagsError
      }

      toast({
        title: "Muvaffaqiyat",
        description: "Kino muvaffaqiyatli qo'shildi",
      })

      router.push("/admin/movies")
    } catch (error) {
      console.error("Error creating movie:", error)
      toast({
        title: "Xatolik",
        description: "Kinoni qo'shishda xatolik yuz berdi",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveAsDraft = async () => {
    setForm((prev) => ({ ...prev, status: "pending" }))
    await handleSubmit(new Event("submit") as any)
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
              <Link href="/admin/movies">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Kinolar ro'yxati
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold flex items-center space-x-2">
                <Film className="h-8 w-8 text-primary" />
                <span>Yangi Kino Qo'shish</span>
              </h1>
              <p className="text-muted-foreground mt-1">Platformaga yangi kino qo'shing</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={handleSaveAsDraft} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              Qoralama sifatida saqlash
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? "Saqlanmoqda..." : "Nashr qilish"}
            </Button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Asosiy Ma'lumotlar</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Kino nomi (asosiy) *</Label>
                      <Input
                        id="title"
                        value={form.title}
                        onChange={(e) => handleInputChange("title", e.target.value)}
                        placeholder="Kino nomini kiriting"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="title_uz">O'zbek nomi</Label>
                      <Input
                        id="title_uz"
                        value={form.title_uz}
                        onChange={(e) => handleInputChange("title_uz", e.target.value)}
                        placeholder="O'zbek tilidagi nom"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title_ru">Rus nomi</Label>
                      <Input
                        id="title_ru"
                        value={form.title_ru}
                        onChange={(e) => handleInputChange("title_ru", e.target.value)}
                        placeholder="Rus tilidagi nom"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="title_en">Ingliz nomi</Label>
                      <Input
                        id="title_en"
                        value={form.title_en}
                        onChange={(e) => handleInputChange("title_en", e.target.value)}
                        placeholder="Ingliz tilidagi nom"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Tavsif (asosiy) *</Label>
                    <Textarea
                      id="description"
                      value={form.description}
                      onChange={(e) => handleInputChange("description", e.target.value)}
                      placeholder="Kino haqida qisqacha ma'lumot"
                      rows={4}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description_uz">O'zbek tavsifi</Label>
                    <Textarea
                      id="description_uz"
                      value={form.description_uz}
                      onChange={(e) => handleInputChange("description_uz", e.target.value)}
                      placeholder="O'zbek tilidagi tavsif"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="description_ru">Rus tavsifi</Label>
                      <Textarea
                        id="description_ru"
                        value={form.description_ru}
                        onChange={(e) => handleInputChange("description_ru", e.target.value)}
                        placeholder="Rus tilidagi tavsif"
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description_en">Ingliz tavsifi</Label>
                      <Textarea
                        id="description_en"
                        value={form.description_en}
                        onChange={(e) => handleInputChange("description_en", e.target.value)}
                        placeholder="Ingliz tilidagi tavsif"
                        rows={3}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Media */}
              <Card>
                <CardHeader>
                  <CardTitle>Media Fayllar</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="poster_url">Poster URL</Label>
                    <Input
                      id="poster_url"
                      value={form.poster_url}
                      onChange={(e) => handleInputChange("poster_url", e.target.value)}
                      placeholder="https://example.com/poster.jpg"
                    />
                    {form.poster_url && (
                      <div className="mt-2">
                        <img
                          src={form.poster_url || "/placeholder.svg"}
                          alt="Poster preview"
                          className="w-32 h-48 object-cover rounded-lg border"
                          onError={(e) => {
                            e.currentTarget.src = "/placeholder.svg?height=192&width=128"
                          }}
                        />
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="trailer_url">Treyler URL</Label>
                    <Input
                      id="trailer_url"
                      value={form.trailer_url}
                      onChange={(e) => handleInputChange("trailer_url", e.target.value)}
                      placeholder="https://youtube.com/watch?v=..."
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Batafsil Ma'lumotlar</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="release_year">Chiqarilgan yil</Label>
                      <Input
                        id="release_year"
                        type="number"
                        value={form.release_year || ""}
                        onChange={(e) =>
                          handleInputChange("release_year", e.target.value ? Number.parseInt(e.target.value) : null)
                        }
                        placeholder="2024"
                        min="1900"
                        max="2030"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="duration">Davomiyligi (daqiqa)</Label>
                      <Input
                        id="duration"
                        type="number"
                        value={form.duration || ""}
                        onChange={(e) =>
                          handleInputChange("duration", e.target.value ? Number.parseInt(e.target.value) : null)
                        }
                        placeholder="120"
                        min="1"
                        max="500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status">Holat</Label>
                      <Select value={form.status} onValueChange={(value) => handleInputChange("status", value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Faol</SelectItem>
                          <SelectItem value="pending">Kutilmoqda</SelectItem>
                          <SelectItem value="inactive">Nofaol</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="director">Rejissyor</Label>
                      <Input
                        id="director"
                        value={form.director}
                        onChange={(e) => handleInputChange("director", e.target.value)}
                        placeholder="Rejissyor ismi"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country">Mamlakat</Label>
                      <Input
                        id="country"
                        value={form.country}
                        onChange={(e) => handleInputChange("country", e.target.value)}
                        placeholder="Mamlakat nomi"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="language">Til</Label>
                    <Input
                      id="language"
                      value={form.language}
                      onChange={(e) => handleInputChange("language", e.target.value)}
                      placeholder="O'zbek, Ingliz, Rus..."
                    />
                  </div>

                  {/* Actors */}
                  <div className="space-y-2">
                    <Label>Aktyorlar</Label>
                    <div className="flex space-x-2">
                      <Input
                        value={newActor}
                        onChange={(e) => setNewActor(e.target.value)}
                        placeholder="Aktyor ismini kiriting"
                        onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addActor())}
                      />
                      <Button type="button" onClick={addActor} variant="outline">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {form.actors.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {form.actors.map((actor, index) => (
                          <Badge key={index} variant="secondary" className="flex items-center space-x-1">
                            <span>{actor}</span>
                            <X className="h-3 w-3 cursor-pointer" onClick={() => removeActor(actor)} />
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              {/* Genres */}
              <Card>
                <CardHeader>
                  <CardTitle>Janrlar *</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {genres.map((genre) => (
                      <div key={genre.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`genre-${genre.id}`}
                          checked={form.selectedGenres.includes(genre.id)}
                          onCheckedChange={() => toggleGenre(genre.id)}
                        />
                        <Label htmlFor={`genre-${genre.id}`} className="text-sm">
                          {genre.name_uz || genre.name}
                        </Label>
                      </div>
                    ))}
                  </div>
                  {form.selectedGenres.length === 0 && (
                    <p className="text-sm text-red-500 mt-2">Kamida bitta janr tanlang</p>
                  )}
                </CardContent>
              </Card>

              {/* Tags */}
              <Card>
                <CardHeader>
                  <CardTitle>Teglar</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {tags.map((tag) => (
                      <div key={tag.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`tag-${tag.id}`}
                          checked={form.selectedTags.includes(tag.id)}
                          onCheckedChange={() => toggleTag(tag.id)}
                        />
                        <Label htmlFor={`tag-${tag.id}`} className="text-sm flex items-center space-x-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }} />
                          <span>{tag.name}</span>
                        </Label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Preview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Eye className="h-5 w-5" />
                    <span>Oldindan ko'rish</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden">
                      {form.poster_url ? (
                        <img
                          src={form.poster_url || "/placeholder.svg"}
                          alt="Poster"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = "/placeholder.svg?height=200&width=150"
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <Film className="h-12 w-12" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold line-clamp-2">{form.title || "Kino nomi"}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-3 mt-1">
                        {form.description || "Kino tavsifi..."}
                      </p>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{form.release_year || "Yil"}</span>
                      <span>{form.duration ? `${form.duration} min` : "Davomiyligi"}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Star className="h-4 w-4 text-yellow-400 fill-current" />
                      <span className="text-sm">0.0</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </main>
    </div>
  )
}
