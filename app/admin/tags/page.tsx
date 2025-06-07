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
  Tag,
  Film,
  Save,
  X,
  Palette,
} from "lucide-react"

interface TagItem {
  id: number
  name: string
  color: string
  created_at: string
  movie_count?: number
}

interface TagForm {
  name: string
  color: string
}

const PRESET_COLORS = [
  "#ef4444", // red
  "#f97316", // orange
  "#eab308", // yellow
  "#22c55e", // green
  "#06b6d4", // cyan
  "#3b82f6", // blue
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#6b7280", // gray
  "#1f2937", // dark
]

export default function AdminTagsPage() {
  const [tags, setTags] = useState<TagItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [isAdmin, setIsAdmin] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingTag, setEditingTag] = useState<TagItem | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<TagForm>({
    name: "",
    color: "#3b82f6",
  })

  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    checkAdminAccess()
  }, [])

  useEffect(() => {
    if (isAdmin) {
      fetchTags()
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

  const fetchTags = async () => {
    try {
      setLoading(true)

      let query = supabase.from("tags").select("*").order("name")

      if (searchQuery) {
        query = query.ilike("name", `%${searchQuery}%`)
      }

      const { data, error } = await query

      if (error) throw error

      // Get movie count for each tag
      const tagsWithCount = await Promise.all(
        (data || []).map(async (tag) => {
          const { count } = await supabase
            .from("movie_tags")
            .select("movie_id", { count: "exact", head: true })
            .eq("tag_id", tag.id)

          return {
            ...tag,
            movie_count: count || 0,
          }
        }),
      )

      setTags(tagsWithCount)
    } catch (error) {
      console.error("Error fetching tags:", error)
      toast({
        title: "Xatolik",
        description: "Teglarni yuklashda xatolik yuz berdi",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setForm({
      name: "",
      color: "#3b82f6",
    })
    setEditingTag(null)
  }

  const openCreateDialog = () => {
    resetForm()
    setIsDialogOpen(true)
  }

  const openEditDialog = (tag: TagItem) => {
    setForm({
      name: tag.name,
      color: tag.color,
    })
    setEditingTag(tag)
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!form.name.trim()) {
      toast({
        title: "Xatolik",
        description: "Teg nomi majburiy",
        variant: "destructive",
      })
      return
    }

    setSaving(true)

    try {
      const tagData = {
        name: form.name.trim(),
        color: form.color,
      }

      if (editingTag) {
        // Update existing tag
        const { error } = await supabase.from("tags").update(tagData).eq("id", editingTag.id)

        if (error) throw error

        toast({
          title: "Muvaffaqiyat",
          description: "Teg muvaffaqiyatli yangilandi",
        })
      } else {
        // Create new tag
        const { error } = await supabase.from("tags").insert(tagData)

        if (error) throw error

        toast({
          title: "Muvaffaqiyat",
          description: "Yangi teg muvaffaqiyatli qo'shildi",
        })
      }

      setIsDialogOpen(false)
      resetForm()
      await fetchTags()
    } catch (error) {
      console.error("Error saving tag:", error)
      toast({
        title: "Xatolik",
        description: "Tegni saqlashda xatolik yuz berdi",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (tag: TagItem) => {
    if (tag.movie_count && tag.movie_count > 0) {
      toast({
        title: "Xatolik",
        description: `Bu tegda ${tag.movie_count} ta kino bor. Avval kinolardan bu tegni olib tashlang.`,
        variant: "destructive",
      })
      return
    }

    if (!confirm(`"${tag.name}" tegini o'chirishni xohlaysizmi?`)) return

    try {
      const { error } = await supabase.from("tags").delete().eq("id", tag.id)

      if (error) throw error

      toast({
        title: "Muvaffaqiyat",
        description: "Teg muvaffaqiyatli o'chirildi",
      })

      await fetchTags()
    } catch (error) {
      console.error("Error deleting tag:", error)
      toast({
        title: "Xatolik",
        description: "Tegni o'chirishda xatolik yuz berdi",
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
                <Tag className="h-8 w-8 text-primary" />
                <span>Teglarni Boshqarish</span>
              </h1>
              <p className="text-muted-foreground mt-1">Kino teglarini qo'shish va boshqarish</p>
            </div>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Yangi Teg
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingTag ? "Tegni Tahrirlash" : "Yangi Teg Qo'shish"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Teg nomi *</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Masalan: Mashhur"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="color">Rang</Label>
                  <div className="space-y-3">
                    <Input
                      id="color"
                      type="color"
                      value={form.color}
                      onChange={(e) => setForm({ ...form, color: e.target.value })}
                      className="w-full h-10"
                    />
                    <div className="grid grid-cols-5 gap-2">
                      {PRESET_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          className={`w-8 h-8 rounded-full border-2 ${
                            form.color === color ? "border-gray-900" : "border-gray-300"
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() => setForm({ ...form, color })}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 p-3 bg-muted rounded-lg">
                  <Palette className="h-4 w-4" />
                  <span className="text-sm">Oldindan ko'rish:</span>
                  <Badge style={{ backgroundColor: form.color, color: "white" }}>{form.name || "Teg nomi"}</Badge>
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
              <CardTitle>Teglar Ro'yxati</CardTitle>
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Teglarni qidiring..."
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
            ) : tags.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Teg</TableHead>
                    <TableHead>Rang</TableHead>
                    <TableHead>Kinolar soni</TableHead>
                    <TableHead>Yaratilgan</TableHead>
                    <TableHead className="text-right">Amallar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tags.map((tag) => (
                    <TableRow key={tag.id}>
                      <TableCell>
                        <Badge style={{ backgroundColor: tag.color, color: "white" }}>{tag.name}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 rounded-full border" style={{ backgroundColor: tag.color }} />
                          <span className="text-sm font-mono">{tag.color}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Film className="h-4 w-4 text-muted-foreground" />
                          <span>{tag.movie_count}</span>
                        </div>
                      </TableCell>
                      <TableCell>{new Date(tag.created_at).toLocaleDateString("uz-UZ")}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(tag)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Tahrirlash
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(tag)}
                              className="text-red-600"
                              disabled={tag.movie_count > 0}
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
                {searchQuery ? "Qidiruv natijasi topilmadi" : "Hali teglar qo'shilmagan"}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
