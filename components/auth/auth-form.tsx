"use client"

import type React from "react"

import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Mail, Lock, User, CheckCircle, AlertCircle } from "lucide-react"

export default function AuthForm() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const fullName = formData.get("fullName") as string

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      })

      if (error) throw error

      if (data.user) {
        // The trigger will automatically create the profile
        // Check if user needs email confirmation
        if (!data.session) {
          setMessage({
            type: "success",
            text: "Ro'yxatdan o'tish muvaffaqiyatli! Emailingizga tasdiqlash havolasi yuborildi.",
          })
        } else {
          setMessage({
            type: "success",
            text: "Ro'yxatdan o'tish muvaffaqiyatli! Tizimga kirildi.",
          })

          // Small delay to ensure profile is created
          setTimeout(() => {
            window.location.href = "/"
          }, 1500)
        }
      }
    } catch (error: any) {
      console.error("Signup error:", error)

      let errorMessage = "Ro'yxatdan o'tishda xatolik yuz berdi"

      if (error.message?.includes("already registered")) {
        errorMessage = "Bu email manzil allaqachon ro'yxatdan o'tgan"
      } else if (error.message?.includes("Password")) {
        errorMessage = "Parol kamida 6 ta belgidan iborat bo'lishi kerak"
      } else if (error.message?.includes("email")) {
        errorMessage = "Email manzil noto'g'ri formatda"
      } else if (error.message?.includes("User already registered")) {
        errorMessage = "Bu email manzil allaqachon ro'yxatdan o'tgan"
      }

      setMessage({
        type: "error",
        text: errorMessage,
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      if (data.user) {
        setMessage({
          type: "success",
          text: "Muvaffaqiyatli kirildi!",
        })

        // Redirect after successful signin
        setTimeout(() => {
          window.location.href = "/"
        }, 1000)
      }
    } catch (error: any) {
      console.error("Signin error:", error)

      let errorMessage = "Kirish xatoligi"

      if (error.message?.includes("Invalid login credentials")) {
        errorMessage = "Email yoki parol noto'g'ri"
      } else if (error.message?.includes("Email not confirmed")) {
        errorMessage = "Emailingizni tasdiqlang"
      } else if (error.message?.includes("Invalid credentials")) {
        errorMessage = "Email yoki parol noto'g'ri"
      }

      setMessage({
        type: "error",
        text: errorMessage,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Kino Platformasi
          </CardTitle>
          <CardDescription>Hisobingizga kiring yoki ro'yxatdan o'ting</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Kirish</TabsTrigger>
              <TabsTrigger value="signup">Ro'yxat</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signin-email"
                      name="email"
                      type="email"
                      placeholder="email@example.com"
                      className="pl-10"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Parol</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signin-password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      className="pl-10"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Kirish
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">To'liq ism</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-name"
                      name="fullName"
                      type="text"
                      placeholder="Ismingiz Familiyangiz"
                      className="pl-10"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-email"
                      name="email"
                      type="email"
                      placeholder="email@example.com"
                      className="pl-10"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Parol</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      className="pl-10"
                      minLength={6}
                      required
                      disabled={loading}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Kamida 6 ta belgi bo'lishi kerak</p>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Ro'yxatdan o'tish
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          {message && (
            <Alert className={`mt-4 ${message.type === "error" ? "border-red-500" : "border-green-500"}`}>
              {message.type === "error" ? <AlertCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
              <AlertDescription className={message.type === "error" ? "text-red-600" : "text-green-600"}>
                {message.text}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
