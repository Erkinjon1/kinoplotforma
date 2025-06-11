"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Star, MessageCircle, Reply, Trash2, Edit } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { uz } from "date-fns/locale"
import type { User } from "@supabase/supabase-js"

interface Comment {
  id: number
  content: string
  rating: number | null
  created_at: string
  updated_at: string
  parent_id: number | null
  profiles: {
    id: string
    full_name: string | null
    avatar_url: string | null
  }
  replies?: Comment[]
}

interface CommentsSectionProps {
  movieId: number
  user: User | null
}

export default function CommentsSection({ movieId, user }: CommentsSectionProps) {
  alert("tttttttttttttt")
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState("")
  const [newRating, setNewRating] = useState<number | null>(null)
  const [replyTo, setReplyTo] = useState<number | null>(null)
  const [replyContent, setReplyContent] = useState("")
  const [editingComment, setEditingComment] = useState<number | null>(null)
  const [editContent, setEditContent] = useState("")

  useEffect(() => {
    fetchComments()
  }, [movieId])

  const fetchComments = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("comments")
        .select(`
          *,
          profiles (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq("movie_id", movieId)
        .eq("is_approved", true)
        .order("created_at", { ascending: false })

      if (error) throw error

      // Organize comments with replies
      const topLevelComments = data?.filter((comment) => !comment.parent_id) || []
      const replies = data?.filter((comment) => comment.parent_id) || []

      const commentsWithReplies = topLevelComments.map((comment) => ({
        ...comment,
        replies: replies.filter((reply) => reply.parent_id === comment.id),
      }))

      setComments(commentsWithReplies)
    } catch (error) {
      console.error("Error fetching comments:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !newComment.trim()) return

    try {
      const { error } = await supabase.from("comments").insert({
        movie_id: movieId,
        user_id: user.id,
        content: newComment.trim(),
        rating: newRating,
        is_approved: true,
      })

      if (error) throw error

      setNewComment("")
      setNewRating(null)
      fetchComments()
    } catch (error) {
      console.error("Error submitting comment:", error)
    }
  }

  const handleSubmitReply = async (parentId: number) => {
    if (!user || !replyContent.trim()) return

    try {
      const { error } = await supabase.from("comments").insert({
        movie_id: movieId,
        user_id: user.id,
        content: replyContent.trim(),
        parent_id: parentId,
        is_approved: true,
      })

      if (error) throw error

      setReplyContent("")
      setReplyTo(null)
      fetchComments()
    } catch (error) {
      console.error("Error submitting reply:", error)
    }
  }

  const handleEditComment = async (commentId: number) => {
    if (!editContent.trim()) return

    try {
      const { error } = await supabase
        .from("comments")
        .update({
          content: editContent.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", commentId)
        .eq("user_id", user?.id)

      if (error) throw error

      setEditingComment(null)
      setEditContent("")
      fetchComments()
    } catch (error) {
      console.error("Error editing comment:", error)
    }
  }

  const handleDeleteComment = async (commentId: number) => {
    if (!user) return

    try {
      const { error } = await supabase.from("comments").delete().eq("id", commentId).eq("user_id", user.id)

      if (error) throw error

      fetchComments()
    } catch (error) {
      console.error("Error deleting comment:", error)
    }
  }

  const renderStars = (rating: number | null, interactive = false, onRatingChange?: (rating: number) => void) => {
    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              rating && star <= rating ? "text-yellow-400 fill-current" : "text-gray-300"
            } ${interactive ? "cursor-pointer hover:text-yellow-400" : ""}`}
            onClick={interactive && onRatingChange ? () => onRatingChange(star) : undefined}
          />
        ))}
      </div>
    )
  }

  const renderComment = (comment: Comment, isReply = false) => (
    <div key={comment.id} className={`${isReply ? "ml-8 mt-4" : "mb-6"}`}>
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-start space-x-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={comment.profiles.avatar_url || ""} />
              <AvatarFallback>{comment.profiles.full_name?.charAt(0) || "U"}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <span className="font-medium text-sm">{comment.profiles.full_name || "Foydalanuvchi"}</span>
                {comment.rating && (
                  <div className="flex items-center space-x-1">
                    {renderStars(comment.rating)}
                    <span className="text-sm text-muted-foreground">({comment.rating}/5)</span>
                  </div>
                )}
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(comment.created_at), {
                    addSuffix: true,
                    locale: uz,
                  })}
                </span>
                {comment.updated_at !== comment.created_at && (
                  <Badge variant="outline" className="text-xs">
                    Tahrirlangan
                  </Badge>
                )}
              </div>

              {editingComment === comment.id ? (
                <div className="space-y-2">
                  <Textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    placeholder="Sharhingizni tahrirlang..."
                    className="min-h-[80px]"
                  />
                  <div className="flex space-x-2">
                    <Button size="sm" onClick={() => handleEditComment(comment.id)} disabled={!editContent.trim()}>
                      Saqlash
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingComment(null)
                        setEditContent("")
                      }}
                    >
                      Bekor qilish
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm mb-3">{comment.content}</p>
                  <div className="flex items-center space-x-2">
                    {!isReply && user && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                        className="text-xs"
                      >
                        <Reply className="h-3 w-3 mr-1" />
                        Javob berish
                      </Button>
                    )}
                    {user?.id === comment.profiles.id && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingComment(comment.id)
                            setEditContent(comment.content)
                          }}
                          className="text-xs"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Tahrirlash
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteComment(comment.id)}
                          className="text-xs text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          O'chirish
                        </Button>
                      </>
                    )}
                  </div>
                </>
              )}

              {/* Reply Form */}
              {replyTo === comment.id && user && (
                <div className="mt-4 space-y-2">
                  <Textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder="Javobingizni yozing..."
                    className="min-h-[80px]"
                  />
                  <div className="flex space-x-2">
                    <Button size="sm" onClick={() => handleSubmitReply(comment.id)} disabled={!replyContent.trim()}>
                      Javob berish
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setReplyTo(null)
                        setReplyContent("")
                      }}
                    >
                      Bekor qilish
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Render Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-4">{comment.replies.map((reply) => renderComment(reply, true))}</div>
      )}
    </div>
  )

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageCircle className="h-5 w-5" />
            <span>Sharhlar ({comments.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {user ? (
            <form onSubmit={handleSubmitComment} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Reyting bering</label>
                {renderStars(newRating, true, setNewRating)}
              </div>
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Sharhingizni yozing..."
                className="min-h-[100px]"
                required
              />
              <Button type="submit" disabled={!newComment.trim()}>
                Sharh qoldirish
              </Button>
            </form>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">Sharh qoldirish uchun tizimga kiring</p>
              <Button asChild>
                <a href="/auth">Kirish</a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comments List */}
      <div>
        {comments.length > 0 ? (
          comments.map((comment) => renderComment(comment))
        ) : (
          <Card>
            <CardContent className="text-center py-8">
              <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Hali sharhlar yo'q. Birinchi bo'lib sharh qoldiring!</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
