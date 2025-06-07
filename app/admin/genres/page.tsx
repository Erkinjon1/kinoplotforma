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
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  ArrowLeft,
  AlertCircle,
  Database,
  Film,
  Save,
  X,
} from "lucide-react"

interface Genre {
  id: number
  name: string
  name_uz: string | null
  name_ru: string | null
  name_en: string | null
  description: string | null
  created_at: string
  movie_count?: number
}

interface GenreForm {
  name: string
  name_uz: string
  name_ru: string
  name_en: string
  description: string
}

export default function AdminGenresPage() {
  const [genres, setGenres] = useState<Genre[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [isAdmin, setIsAdmin] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingGenre, setEditingGenre] = useState<Genre | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<GenreForm>({
    name: "",
    name_uz: "",
    name_ru: "",
    name_en: "",
    description: "",
  })

  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    checkAdminAccess()
  }, [])

  useEffect(() => {
    if (isAdmin) {
      fetchGenres()
    }
  }, [searchQuery, isAdmin])

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
    } catch (error) {
      console.error("Auth error:", error)
      router.push("/auth")
    } finally {
      setLoading(false)
    }
  }

  const fetchGenres = async () => {
    try {
      setLoading(true)

      let query = supabase.from("genres").select("*").order("name")

      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,name_uz.ilike.%${searchQuery}%`)
      }

      const { data, error } = await query

      if (error) throw error

      // Get movie count for each genre
      const genresWithCount = await Promise.all(
        (data || []).map(async (genre) => {
          const { count } = await supabase
            .from("movie_genres")
            .select("movie_id", { count: "exact", head: true })
            .eq("genre_id", genre.id)

          return {
            ...genre,
            movie_count: count || 0,
          }
        }),
      )

      setGenres(genresWithCount)
    } catch (error) {
      console.error("Error fetching genres:", error)
      toast({
        title: "Xatolik",
        description: "Janrlarni yuklashda xatolik yuz berdi",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setForm({
      name: "",
      name_uz: "",
      name_ru: "",
      name_en: "",
      description: "",
    })
    setEditingGenre(null)
  }

  const openCreateDialog = () => {
    resetForm()
    setIsDialogOpen(true)
  }

  const openEditDialog = (genre: Genre) => {
    setForm({
      name: genre.name,
      name_uz: genre.name_uz || "",
      name_ru: genre.name_ru || "",
      name_en: genre.name_en || "",
      description: genre.description || "",
    })
    setEditingGenre(genre)
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.name.trim()) {
      toast({
        title: "Xatolik",
        description: "Janr nomi majburiy",
        variant: "destructive",
      })
      return
    }

    setSaving(true)

    try {
      const genreData = {
        name: form.name.trim(),
        name_uz: form.name_uz.trim() || null,
        name_ru: form.name_ru.trim() || null,
        name_en: form.name_en.trim() || null,
        description: form.description.trim() || null,
      }

      if (editingGenre) {
        // Update existing genre
        const { error } = await supabase.from("genres").update(genreData).eq("id", editingGenre.id)

        if (error) throw error

        toast({
          title: "Muvaffaqiyat",
          description: "Janr muvaffaqiyatli yangilandi",
        })
      } else {
        // Create new genre
        const { error } = await supabase.from("genres").insert(genreData)

        if (error) throw error

        toast({
          title: "Muvaffaqiyat",
          description: "Yangi janr muvaffaqiyatli qo'shildi",
        })
      }

      setIsDialogOpen(false)
      resetForm()
      await fetchGenres()
    } catch (error) {
      console.error("Error saving genre:", error)
      toast({
        title: "Xatolik",
        description: "Janrni saqlashda xatolik yuz berdi",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (genre: Genre) => {
    if (genre.movie_count && genre.movie_count > 0) {
      toast({
        title: "Xatolik",
        description: `Bu janrda ${genre.movie_count} ta kino bor. Avval kinolarni boshqa janrga o'tkazing.`,
        variant: "destructive",
      })
      return
    }

    if (!confirm(`"${genre.name}" janrini o'chirishni xohlaysizmi?`)) return

    try {
      const { error } = await supabase.from("genres").delete().eq("id", genre.id)

      if (error) throw error

      toast({
        title: "Muvaffaqiyat",
        description: "Janr muvaffaqiyatli o'chirildi",
      })

      await fetchGenres()
    } catch (error) {
      console.error("Error deleting genre:", error)
      toast({
        title: "Xatolik",
        description: "Janrni o'chirishda xatolik yuz berdi",
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
                <Database className="h-8 w-8 text-primary" />
                <span>Janrlarni Boshqarish</span>
              </h1>
              <p className="text-muted-foreground mt-1">Kino janrlarini qo'shish va boshqarish</p>
            </div>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Yangi Janr
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingGenre ? "Janrni Tahrirlash" : "Yangi Janr Qo'shish"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Janr nomi (asosiy) *</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Masalan: Action"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name_uz">O'zbek nomi</Label>
                  <Input
                    id="name_uz"
                    value={form.name_uz}
                    onChange={(e) => setForm({ ...form, name_uz: e.target.value })}
                    placeholder="Masalan: Jangari"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name_ru">Rus nomi</Label>
                  <Input
                    id="name_ru"
                    value={form.name_ru}
                    onChange={(e) => setForm({ ...form, name_ru: e.target.value })}
                    placeholder="Masalan: Боевик"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name_en">Ingliz nomi</Label>
                  <Input
                    id="name_en"
                    value={form.name_en}
                    onChange={(e) => setForm({ ...form, name_en: e.target.value })}
                    placeholder="Masalan: Action"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Tavsif</Label>
                  <Input
                    id="description"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Janr haqida qisqacha ma'lumot"
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} disabled={saving}>
                    <X className="h-4 w-4 mr-2" />
                    Bekor qilish
                  </Button>
                  <Button type="submit" disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? "Saqlanmoqda..." : "Saqlash"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Janrlar Ro'yxati</CardTitle>
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Janrlarni qidiring..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-12 bg-gray-200 rounded animate-pulse"></div>
                ))}
              </div>
            ) : genres.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Janr</TableHead>
                    <TableHead>Tarjimalar</TableHead>
                    <TableHead>Kinolar soni</TableHead>
                    <TableHead>Yaratilgan</TableHead>
                    <TableHead className="text-right">Amallar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {genres.map((genre) => (
                    <TableRow key={genre.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{genre.name}</div>
                          {genre.description && (
                            <div className="text-sm text-muted-foreground">{genre.description}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {genre.name_uz && (
                            <Badge variant="outline" className="mr-1">
                              UZ: {genre.name_uz}
                            </Badge>
                          )}
                          {genre.name_ru && (
                            <Badge variant="outline" className="mr-1">
                              RU: {genre.name_ru}
                            </Badge>
                          )}
                          {genre.name_en && (
                            <Badge variant="outline" className="mr-1">
                              EN: {genre.name_en}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Film className="h-4 w-4 text-muted-foreground" />
                          <span>{genre.movie_count}</span>
                        </div>
                      </TableCell>
                      <TableCell>{new Date(genre.created_at).toLocaleDateString("uz-UZ")}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(genre)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Tahrirlash
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(genre)}
                              className="text-red-600"
                              disabled={genre.movie_count > 0}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              O'chirish
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? "Qidiruv natijasi topilmadi" : "Hali janrlar qo'shilmagan"}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
