"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import LanguageSelector from "@/components/layout/language-selector"
import { Search, Film, User, LogOut, Settings, Shield, Zap } from "lucide-react"
import type { User as SupabaseUser } from "@supabase/supabase-js"

interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: "user" | "admin"
}

export default function Navbar() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (userId: string) => {
    try {
      setLoading(true)

      // Try to get existing profile
      let { data: profile, error } = await supabase.from("profiles").select("*").eq("id", userId).single()

      if (error && error.code === "PGRST116") {
        // Profile doesn't exist, create it
        const { data: user } = await supabase.auth.getUser()
        if (user.user) {
          const { data: newProfile, error: createError } = await supabase
            .from("profiles")
            .insert({
              id: user.user.id,
              email: user.user.email!,
              full_name: user.user.user_metadata?.full_name || "",
              role: user.user.email === "erkinjonrabbimov1@gmail.com" ? "admin" : "user",
            })
            .select()
            .single()

          if (!createError) {
            profile = newProfile
          }
        }
      }

      setProfile(profile)
    } catch (error) {
      console.error("Error in fetchProfile:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/" className="flex items-center space-x-2">
            <Film className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              KinoPlatforma
            </span>
          </Link>
        </div>

        <div className="flex-1 max-w-md mx-4">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Kinolarni qidiring..."
              className="pl-10 pr-4"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </form>
        </div>

        <div className="flex items-center space-x-4">
          {/* Advanced Search Button */}
          <Button variant="ghost" size="sm" asChild>
            <Link href="/advanced-search" className="flex items-center space-x-2">
              <Zap className="h-4 w-4" />
              <span className="hidden md:inline">Kengaytirilgan Qidiruv</span>
            </Link>
          </Button>

          {/* Language Selector */}
          <LanguageSelector />

          {user && !loading ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile?.avatar_url || ""} alt={profile?.full_name || ""} />
                    <AvatarFallback>
                      {profile?.full_name?.charAt(0) || profile?.email?.charAt(0) || user.email?.charAt(0) || "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {profile?.full_name || user.user_metadata?.full_name || "Foydalanuvchi"}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">{profile?.email || user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profil</span>
                  </Link>
                </DropdownMenuItem>
                {profile?.role === "admin" && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin" className="flex items-center">
                      <Shield className="mr-2 h-4 w-4" />
                      <span>Admin Panel</span>
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="flex items-center">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Sozlamalar</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="flex items-center">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Chiqish</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : loading ? (
            <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse" />
          ) : (
            <div className="flex items-center space-x-2">
              <Button variant="ghost" asChild>
                <Link href="/auth">Kirish</Link>
              </Button>
              <Button asChild>
                <Link href="/auth">Ro'yxat</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
