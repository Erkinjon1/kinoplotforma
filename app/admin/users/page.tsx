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
  Shield,
  User,
  Ban,
  ArrowLeft,
  AlertCircle,
  Calendar,
  Mail,
  Crown,
  Users,
  ChevronLeft,
  ChevronRight,
  Download,
} from "lucide-react"

interface UserProfile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: "user" | "admin"
  created_at: string
  updated_at: string
  // Computed fields
  total_comments?: number
  total_ratings?: number
  avg_rating?: number
  last_activity?: string
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [sortBy, setSortBy] = useState("created_at")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalUsers, setTotalUsers] = useState(0)
  const [isAdmin, setIsAdmin] = useState(false)
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])

  const router = useRouter()
  const { toast } = useToast()
  const ITEMS_PER_PAGE = 20

  useEffect(() => {
    checkAdminAccess()
  }, [])

  useEffect(() => {
    if (isAdmin) {
      fetchUsers()
    }
  }, [searchQuery, roleFilter, sortBy, sortOrder, currentPage, isAdmin])

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

  const fetchUsers = async () => {
    try {
      setLoading(true)

      let query = supabase.from("profiles").select("*", { count: "exact" })

      // Apply search filter
      if (searchQuery) {
        query = query.or(`email.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%`)
      }

      // Apply role filter
      if (roleFilter !== "all") {
        query = query.eq("role", roleFilter)
      }

      // Apply sorting
      query = query.order(sortBy, { ascending: sortOrder === "asc" })

      // Apply pagination
      const from = (currentPage - 1) * ITEMS_PER_PAGE
      const to = from + ITEMS_PER_PAGE - 1
      query = query.range(from, to)

      const { data, error, count } = await query

      if (error) throw error

      // Fetch additional stats for each user
      const usersWithStats = await Promise.all(
        (data || []).map(async (user) => {
          const [commentsResult, ratingsResult] = await Promise.all([
            supabase.from("comments").select("id", { count: "exact", head: true }).eq("user_id", user.id),
            supabase.from("ratings").select("rating").eq("user_id", user.id),
          ])

          const avgRating = ratingsResult.data?.length
            ? ratingsResult.data.reduce((sum, r) => sum + r.rating, 0) / ratingsResult.data.length
            : 0

          return {
            ...user,
            total_comments: commentsResult.count || 0,
            total_ratings: ratingsResult.data?.length || 0,
            avg_rating: avgRating,
          }
        }),
      )

      setUsers(usersWithStats)
      setTotalUsers(count || 0)
      setTotalPages(Math.ceil((count || 0) / ITEMS_PER_PAGE))
    } catch (error) {
      console.error("Error fetching users:", error)
      toast({
        title: "Xatolik",
        description: "Foydalanuvchilarni yuklashda xatolik yuz berdi",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRoleChange = async (userId: string, newRole: "user" | "admin") => {
    try {
      const { error } = await supabase.from("profiles").update({ role: newRole }).eq("id", userId)

      if (error) throw error

      await fetchUsers()

      toast({
        title: "Muvaffaqiyat",
        description: `Foydalanuvchi roli ${newRole === "admin" ? "admin" : "oddiy foydalanuvchi"} ga o'zgartirildi`,
      })
    } catch (error) {
      console.error("Error updating user role:", error)
      toast({
        title: "Xatolik",
        description: "Foydalanuvchi rolini o'zgartirishda xatolik yuz berdi",
        variant: "destructive",
      })
    }
  }

  const handleBulkAction = async (action: "promote" | "demote" | "delete") => {
    if (selectedUsers.length === 0) {
      toast({
        title: "Xatolik",
        description: "Hech qanday foydalanuvchi tanlanmagan",
        variant: "destructive",
      })
      return
    }

    const confirmMessage =
      action === "promote"
        ? "Tanlangan foydalanuvchilarni admin qilishni xohlaysizmi?"
        : action === "demote"
          ? "Tanlangan adminlarni oddiy foydalanuvchi qilishni xohlaysizmi?"
          : "Tanlangan foydalanuvchilarni o'chirishni xohlaysizmi? Bu amal qaytarilmaydi!"

    if (!confirm(confirmMessage)) return

    try {
      if (action === "delete") {
        const { error } = await supabase.from("profiles").delete().in("id", selectedUsers)

        if (error) throw error
      } else {
        const newRole = action === "promote" ? "admin" : "user"
        const { error } = await supabase.from("profiles").update({ role: newRole }).in("id", selectedUsers)

        if (error) throw error
      }

      setSelectedUsers([])
      await fetchUsers()

      toast({
        title: "Muvaffaqiyat",
        description: `${selectedUsers.length} ta foydalanuvchi ${
          action === "promote" ? "admin qilindi" : action === "demote" ? "oddiy foydalanuvchi qilindi" : "o'chirildi"
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

  const exportUsers = async () => {
    try {
      const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false })

      if (error) throw error

      const csv = [
        ["ID", "Email", "Full Name", "Role", "Created At", "Updated At"].join(","),
        ...(data || []).map((user) =>
          [user.id, user.email, user.full_name || "", user.role, user.created_at, user.updated_at].join(","),
        ),
      ].join("\n")

      const blob = new Blob([csv], { type: "text/csv" })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `users-${new Date().toISOString().split("T")[0]}.csv`
      a.click()
      window.URL.revokeObjectURL(url)

      toast({
        title: "Muvaffaqiyat",
        description: "Foydalanuvchilar ro'yxati eksport qilindi",
      })
    } catch (error) {
      console.error("Error exporting users:", error)
      toast({
        title: "Xatolik",
        description: "Eksport qilishda xatolik yuz berdi",
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
                <Users className="h-8 w-8 text-primary" />
                <span>Foydalanuvchilarni Boshqarish</span>
              </h1>
              <p className="text-muted-foreground mt-1">Jami {totalUsers} ta foydalanuvchi</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={exportUsers}>
              <Download className="h-4 w-4 mr-2" />
              Eksport
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
              <CardTitle>Foydalanuvchilar Ro'yxati</CardTitle>

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

                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Barcha rollar</SelectItem>
                    <SelectItem value="user">Foydalanuvchi</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Saralash" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_at">Yaratilgan vaqt</SelectItem>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="full_name">Ism</SelectItem>
                    <SelectItem value="role">Rol</SelectItem>
                  </SelectContent>
                </Select>

                <Button variant="outline" size="sm" onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}>
                  {sortOrder === "asc" ? "↑" : "↓"}
                </Button>
              </div>
            </div>

            {/* Bulk Actions */}
            {selectedUsers.length > 0 && (
              <div className="flex items-center space-x-2 p-4 bg-muted rounded-lg">
                <span className="text-sm font-medium">{selectedUsers.length} ta foydalanuvchi tanlandi</span>
                <Button size="sm" onClick={() => handleBulkAction("promote")}>
                  Admin qilish
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleBulkAction("demote")}>
                  Oddiy qilish
                </Button>
                <Button size="sm" variant="destructive" onClick={() => handleBulkAction("delete")}>
                  O'chirish
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedUsers([])}>
                  Bekor qilish
                </Button>
              </div>
            )}
          </CardHeader>

          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
                ))}
              </div>
            ) : users.length > 0 ? (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <input
                          type="checkbox"
                          checked={selectedUsers.length === users.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUsers(users.map((u) => u.id))
                            } else {
                              setSelectedUsers([])
                            }
                          }}
                        />
                      </TableHead>
                      <TableHead>Foydalanuvchi</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Faoliyat</TableHead>
                      <TableHead>Ro'yxatdan o'tgan</TableHead>
                      <TableHead className="text-right">Amallar</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            checked={selectedUsers.includes(user.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedUsers([...selectedUsers, user.id])
                              } else {
                                setSelectedUsers(selectedUsers.filter((id) => id !== user.id))
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={user.avatar_url || ""} />
                              <AvatarFallback>
                                {user.full_name?.charAt(0) || user.email?.charAt(0) || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">{user.full_name || "Noma'lum"}</div>
                              <div className="text-sm text-muted-foreground flex items-center">
                                <Mail className="h-3 w-3 mr-1" />
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={user.role === "admin" ? "default" : "secondary"}
                            className="flex items-center space-x-1 w-fit"
                          >
                            {user.role === "admin" ? <Crown className="h-3 w-3" /> : <User className="h-3 w-3" />}
                            <span>{user.role === "admin" ? "Admin" : "Foydalanuvchi"}</span>
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{user.total_comments} ta sharh</div>
                            <div>{user.total_ratings} ta baho</div>
                            {user.avg_rating > 0 && (
                              <div className="text-muted-foreground">O'rtacha: {user.avg_rating.toFixed(1)} ⭐</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3 mr-1" />
                            {new Date(user.created_at).toLocaleDateString("uz-UZ")}
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
                                <Link href={`/profile/${user.id}`}>
                                  <User className="h-4 w-4 mr-2" />
                                  Profilni ko'rish
                                </Link>
                              </DropdownMenuItem>
                              {user.role === "user" ? (
                                <DropdownMenuItem onClick={() => handleRoleChange(user.id, "admin")}>
                                  <Shield className="h-4 w-4 mr-2" />
                                  Admin qilish
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onClick={() => handleRoleChange(user.id, "user")}>
                                  <User className="h-4 w-4 mr-2" />
                                  Oddiy foydalanuvchi qilish
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem className="text-red-600">
                                <Ban className="h-4 w-4 mr-2" />
                                Bloklash
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
                <Users className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">Foydalanuvchilar topilmadi</h3>
                <p>Qidiruv shartlaringizga mos foydalanuvchi yo'q</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
