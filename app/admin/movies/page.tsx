"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import Navbar from "@/components/layout/navbar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Plus, Search, MoreHorizontal, Edit, Trash2, Eye, AlertCircle, ArrowLeft } from "lucide-react"

interface Movie {
  id: number
  title: string
  title_uz: string | null
  release_year: number | null
  rating: number
  view_count: number
  status: "active" | "inactive" | "pending"
  created_at: string
}

export default function AdminMoviesPage() {
  const [movies, setMovies] = useState<Movie[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [isAdmin, setIsAdmin] = useState(false)
  const router = useRouter()

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
      fetchMovies()
    } catch (error) {
      console.error("Auth error:", error)
      router.push("/auth")
    }
  }

  const fetchMovies = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from("movies")
        .select("id, title, title_uz, release_year, rating, view_count, status, created_at")
        .order("created_at", { ascending: false })

      if (searchQuery) {
        query = query.or(`title.ilike.%${searchQuery}%,title_uz.ilike.%${searchQuery}%`)
      }

      const { data, error } = await query

      if (error) throw error
      setMovies(data || [])
    } catch (error) {
      console.error("Error fetching movies:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAdmin) {
      fetchMovies()
    }
  }, [searchQuery, isAdmin])

  const handleDeleteMovie = async (movieId: number) => {
    if (!confirm("Bu kinoni o'chirishni xohlaysizmi?")) return

    try {
      const { error } = await supabase.from("movies").delete().eq("id", movieId)

      if (error) throw error

      fetchMovies() // Refresh the list
    } catch (error) {
      console.error("Error deleting movie:", error)
      alert("Kinoni o'chirishda xatolik yuz berdi")
    }
  }

  const handleStatusChange = async (movieId: number, newStatus: "active" | "inactive" | "pending") => {
    try {
      const { error } = await supabase.from("movies").update({ status: newStatus }).eq("id", movieId)

      if (error) throw error

      fetchMovies() // Refresh the list
    } catch (error) {
      console.error("Error updating movie status:", error)
      alert("Kino holatini o'zgartirishda xatolik yuz berdi")
    }
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
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Admin Panel
              </Link>
            </Button>
            <h1 className="text-3xl font-bold">Kinolarni Boshqarish</h1>
          </div>
          <Button asChild>
            <Link href="/admin/movies/new">
              <Plus className="h-4 w-4 mr-2" />
              Yangi Kino
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Kinolar Ro'yxati</CardTitle>
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Kinolarni qidiring..."
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
            ) : movies.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nomi</TableHead>
                    <TableHead>Yil</TableHead>
                    <TableHead>Reyting</TableHead>
                    <TableHead>Ko'rishlar</TableHead>
                    <TableHead>Holat</TableHead>
                    <TableHead>Yaratilgan</TableHead>
                    <TableHead className="text-right">Amallar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movies.map((movie) => (
                    <TableRow key={movie.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{movie.title_uz || movie.title}</div>
                          {movie.title_uz && movie.title !== movie.title_uz && (
                            <div className="text-sm text-muted-foreground">{movie.title}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{movie.release_year || "—"}</TableCell>
                      <TableCell>{movie.rating.toFixed(1)}</TableCell>
                      <TableCell>{movie.view_count.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            movie.status === "active"
                              ? "default"
                              : movie.status === "pending"
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {movie.status === "active" ? "Faol" : movie.status === "pending" ? "Kutilmoqda" : "Nofaol"}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(movie.created_at).toLocaleDateString("uz-UZ")}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/movies/${movie.id}`}>
                                <Eye className="h-4 w-4 mr-2" />
                                Ko'rish
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/movies/${movie.id}/edit`}>
                                <Edit className="h-4 w-4 mr-2" />
                                Tahrirlash
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                handleStatusChange(movie.id, movie.status === "active" ? "inactive" : "active")
                              }
                            >
                              {movie.status === "active" ? "Nofaol qilish" : "Faol qilish"}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDeleteMovie(movie.id)} className="text-red-600">
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
                {searchQuery ? "Qidiruv natijasi topilmadi" : "Hali kinolar qo'shilmagan"}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
