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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useToast } from "@/hooks/use-toast"
import {
  Search,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Eye,
  ArrowLeft,
  AlertCircle,
  Calendar,
  MessageSquare,
  Star,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from "lucide-react"

interface Comment {
  id: number
  content: string
  rating: number | null
  created_at: string
  updated_at: string
  is_approved: boolean
  parent_id: number | null
  profiles: {
    id: string
    full_name: string | null
    email: string
    avatar_url: string | null
  }
  movies: {
    id: number
    title: string
    title_uz: string | null
  }
  replies_count?: number
}

export default function AdminCommentsPage() {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [sortBy, setSortBy] = useState("created_at")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalComments, setTotalComments] = useState(0)
  const [isAdmin, setIsAdmin] = useState(false)
  const [selectedComments, setSelectedComments] = useState<number[]>([])

  const router = useRouter()
  const { toast } = useToast()
  const ITEMS_PER_PAGE = 20

  useEffect(() => {
    checkAdminAccess()
  }, [])

  useEffect(() => {
    if (isAdmin) {
      fetchComments()
    }
  }, [searchQuery, statusFilter, sortBy, sortOrder, currentPage, isAdmin])

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

  const fetchComments = async () => {
    try {
      setLoading(true)

      let query = supabase.from("comments").select(
        `
          *,
          profiles (
            id,
            full_name,
            email,
            avatar_url
          ),
          movies (
            id,
            title,
            title_uz
          )
        `,
        { count: "exact" },
      )

      // Apply search filter
      if (searchQuery) {
        query = query.or(
          `content.ilike.%${searchQuery}%,profiles.full_name.ilike.%${searchQuery}%,profiles.email.ilike.%${searchQuery}%`,
        )
      }

      // Apply status filter
      if (statusFilter === "approved") {
        query = query.eq("is_approved", true)
      } else if (statusFilter === "pending") {
        query = query.eq("is_approved", false)
      }

      // Apply sorting
      query = query.order(sortBy, { ascending: sortOrder === "asc" })

      // Apply pagination
      const from = (currentPage - 1) * ITEMS_PER_PAGE
      const to = from + ITEMS_PER_PAGE - 1
      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) throw error

      // Get replies count for each comment
      const commentsWithReplies = await Promise.all(
        (data || []).map(async (comment) => {
          const { count: repliesCount } = await supabase
            .from("comments")
            .select("id", { count: "exact", head: true })
            .eq("parent_id", comment.id)

          return {
            ...comment,
            replies_count: repliesCount || 0,
          }
        }),
      )

      setComments(commentsWithReplies)
      setTotalComments(count || 0)
      setTotalPages(Math.ceil((count || 0) / ITEMS_PER_PAGE))
    } catch (error) {
      console.error("Error fetching comments:", error)
      toast({
        title: "Xatolik",
        description: "Sharhlarni yuklashda xatolik yuz berdi",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleApproveComment = async (commentId: number, approve: boolean) => {
    try {
      const { error } = await supabase.from("comments").update({ is_approved: approve }).eq("id", commentId)

      if (error) throw error

      await fetchComments()

      toast({
        title: "Muvaffaqiyat",
        description: `Sharh ${approve ? "tasdiqlandi" : "rad etildi"}`,
      })
    } catch (error) {
      console.error("Error updating comment:", error)
      toast({
        title: "Xatolik",
        description: "Sharhni yangilashda xatolik yuz berdi",
        variant: "destructive",
      })
    }
  }

  const handleDeleteComment = async (commentId: number) => {
    if (!confirm("Bu sharhni o'chirishni xohlaysizmi?")) return

    try {
      const { error } = await supabase.from("comments").delete().eq("id", commentId)

      if (error) throw error

      await fetchComments()

      toast({
        title: "Muvaffaqiyat",
        description: "Sharh o'chirildi",
      })
    } catch (error) {
      console.error("Error deleting comment:", error)
      toast({
        title: "Xatolik",
        description: "Sharhni o'chirishda xatolik yuz berdi",
        variant: "destructive",
      })
    }
  }

  const handleBulkAction = async (action: "approve" | "reject" | "delete") => {
    if (selectedComments.length === 0) {
      toast({
        title: "Xatolik",
        description: "Hech qanday sharh tanlanmagan",
        variant: "destructive",
      })
      return
    }

    const confirmMessage =
      action === "approve"
        ? "Tanlangan sharhlarni tasdiqlashni xohlaysizmi?"
        : action === "reject"
          ? "Tanlangan sharhlarni rad etishni xohlaysizmi?"
          : "Tanlangan sharhlarni o'chirishni xohlaysizmi? Bu amal qaytarilmaydi!"

    if (!confirm(confirmMessage)) return

    try {
      if (action === "delete") {
        const { error } = await supabase.from("comments").delete().in("id", selectedComments)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from("comments")
          .update({ is_approved: action === "approve" })
          .in("id", selectedComments)

        if (error) throw error
      }

      setSelectedComments([])
      await fetchComments()

      toast({
        title: "Muvaffaqiyat",
        description: `${selectedComments.length} ta sharh ${
          action === "approve" ? "tasdiqlandi" : action === "reject" ? "rad etildi" : "o'chirildi"
        }`,
      })
    } catch (error) {
      console.error("Error performing bulk action:", error)
      toast({
        title: "Xatolik",
        description: "Amalni bajarishda xatolik yuz berdi",
        variant: "destructive",
      })
    }
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const renderPagination = () => {
    if (totalPages <= 1) return null

    const pages = []
    const maxVisiblePages = 5
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1)
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i)
    }

    return (
      <div className="flex items-center justify-center space-x-2 mt-6">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="h-4 w-4" />
          Oldingi
        </Button>

        {startPage > 1 && (
          <>
            <Button variant="outline" size="sm" onClick={() => handlePageChange(1)}>
              1
            </Button>
            {startPage > 2 && <span className="px-2">...</span>}
          </>
        )}

        {pages.map((page) => (
          <Button
            key={page}
            variant={currentPage === page ? "default" : "outline"}
            size="sm"
            onClick={() => handlePageChange(page)}
          >
            {page}
          </Button>
        ))}

        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span className="px-2">...</span>}
            <Button variant="outline" size="sm" onClick={() => handlePageChange(totalPages)}>
              {totalPages}
            </Button>
          </>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Keyingi
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    )
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
                <MessageSquare className="h-8 w-8 text-primary" />
                <span>Sharhlarni Boshqarish</span>
              </h1>
              <p className="text-muted-foreground mt-1">Jami {totalComments} ta sharh</p>
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
              <CardTitle>Sharhlar Ro'yxati</CardTitle>

              {/* Filters */}
              <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Qidirish..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Holat" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Barcha sharhlar</SelectItem>
                    <SelectItem value="approved">Tasdiqlangan</SelectItem>
                    <SelectItem value="pending">Kutilayotgan</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Saralash" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_at">Yaratilgan vaqt</SelectItem>
                    <SelectItem value="updated_at">Yangilangan vaqt</SelectItem>
                    <SelectItem value="rating">Reyting</SelectItem>
                  </SelectContent>
                </Select>

                <Button variant="outline" size="sm" onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}>
                  {sortOrder === "asc" ? "↑" : "↓"}
                </Button>
              </div>
            </div>

            {/* Bulk Actions */}
            {selectedComments.length > 0 && (
              <div className="flex items-center space-x-2 p-4 bg-muted rounded-lg">
                <span className="text-sm font-medium">{selectedComments.length} ta sharh tanlandi</span>
                <Button size="sm" onClick={() => handleBulkAction("approve")}>
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Tasdiqlash
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleBulkAction("reject")}>
                  <XCircle className="h-4 w-4 mr-1" />
                  Rad etish
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleBulkAction("delete")}>
                  <Trash2 className="h-4 w-4 mr-1" />
                  O'chirish
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedComments([])}>
                  Bekor qilish
                </Button>
              </div>
            )}
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-20 bg-gray-200 rounded animate-pulse"></div>
                ))}
              </div>
            ) : comments.length > 0 ? (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <input
                          type="checkbox"
                          checked={selectedComments.length === comments.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedComments(comments.map((c) => c.id))
                            } else {
                              setSelectedComments([])
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead>Sharh</TableHead>
                      <TableHead>Kino</TableHead>
                      <TableHead>Foydalanuvchi</TableHead>
                      <TableHead>Holat</TableHead>
                      <TableHead>Sana</TableHead>
                      <TableHead className="text-right">Amallar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comments.map((comment) => (
                      <TableRow key={comment.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedComments.includes(comment.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedComments([...selectedComments, comment.id])
                              } else {
                                setSelectedComments(selectedComments.filter((id) => id !== comment.id))
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell className="max-w-md">
                          <div className="space-y-2">
                            <p className="text-sm line-clamp-3">{comment.content}</p>
                            {comment.rating && (
                              <div className="flex items-center space-x-1">
                                <Star className="h-3 w-3 text-yellow-400 fill-current" />
                                <span className="text-xs">{comment.rating}/5</span>
                              </div>
                            )}
                            {comment.replies_count > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {comment.replies_count} ta javob
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Link href={`/movies/${comment.movies.id}`} className="text-sm font-medium hover:underline">
                            {comment.movies.title_uz || comment.movies.title}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={comment.profiles.avatar_url || ""} />
                              <AvatarFallback className="text-xs">
                                {comment.profiles.full_name?.charAt(0) || comment.profiles.email?.charAt(0) || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="text-sm font-medium">{comment.profiles.full_name || "Noma'lum"}</div>
                              <div className="text-xs text-muted-foreground">{comment.profiles.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={comment.is_approved ? "default" : "secondary"}
                            className="flex items-center space-x-1 w-fit"
                          >
                            {comment.is_approved ? (
                              <CheckCircle className="h-3 w-3" />
                            ) : (
                              <XCircle className="h-3 w-3" />
                            )}
                            <span>{comment.is_approved ? "Tasdiqlangan" : "Kutilmoqda"}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3 mr-1" />
                            {new Date(comment.created_at).toLocaleDateString("uz-UZ")}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/movies/${comment.movies.id}#comment-${comment.id}`}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  Ko'rish
                                </Link>
                              </DropdownMenuItem>
                              {!comment.is_approved ? (
                                <DropdownMenuItem onClick={() => handleApproveComment(comment.id, true)}>
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Tasdiqlash
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => handleApproveComment(comment.id, false)}>
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Rad etish
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem
                                onClick={() => handleDeleteComment(comment.id)}
                                className="text-red-600"
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
                {renderPagination()}
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">Sharhlar topilmadi</h3>
                <p>Qidiruv shartlaringizga mos sharh yo'q</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
