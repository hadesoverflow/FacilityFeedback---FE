"use client"

import { useState, useEffect, useMemo } from "react"
import { MessageCircle, X, Send, Minimize2 } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "https://localhost:7010/api"

type Message = {
  id: string
  senderId: string
  receiverId: string
  content: string
  isRead: boolean
  createdAt: string
  sender?: any
  receiver?: any
}

type User = {
  id: string
  email: string
  full_name: string
  role: string
  department_id?: string
}

function mapMessage(api: any): Message {
  return {
    id: String(api.id),
    senderId: String(api.senderId),
    receiverId: String(api.receiverId),
    content: api.content,
    isRead: api.isRead,
    createdAt: api.createdAt,
    sender: api.sender,
    receiver: api.receiver,
  }
}

function mapUser(api: any): User {
  return {
    id: String(api.id),
    email: api.email || "",
    full_name: api.fullName || api.full_name || "",
    role: api.role,
    department_id: api.departmentId ? String(api.departmentId) : undefined,
  }
}

function timeFormat(iso: string) {
  if (!iso) return ""
  try {
    const date = new Date(iso)
    date.setHours(date.getHours() + 7)
    const hours = date.getHours().toString().padStart(2, '0')
    const mins = date.getMinutes().toString().padStart(2, '0')
    return `${hours}:${mins}`
  } catch {
    return ""
  }
}

function initials(name?: string) {
  if (!name) return "AD"
  const parts = name.trim().split(" ").filter(Boolean)
  if (parts.length === 0) return "AD"
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

export function ChatBubble() {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [draft, setDraft] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [admins, setAdmins] = useState<User[]>([])
  const [selectedAdmin, setSelectedAdmin] = useState<User | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)

  // Fetch admin user (admin@edu.vn)
  useEffect(() => {
    if (!user?.id) return

    fetch(`${API_BASE}/users`)
      .then((r) => r.json())
      .then((data) => {
        const allUsers = Array.isArray(data) ? data.map(mapUser) : []
        
        // Find admin by email
        const adminUser = allUsers.find((u: User) => u.email === "admin@edu.vn")
        
        if (adminUser) {
          setAdmins([adminUser])
          setSelectedAdmin(adminUser)
        }
      })
      .catch((err) => console.error("Error fetching users:", err))
  }, [user?.id])

  // Fetch messages
  const fetchMessages = async () => {
    if (!user?.id) return
    try {
      const res = await fetch(`${API_BASE}/messages/user/${user.id}`)
      if (res.ok) {
        const data = await res.json()
        const msgs = Array.isArray(data) ? data.map(mapMessage) : []
        setMessages(msgs)
        
        // Count unread
        const unread = msgs.filter(m => m.receiverId === user.id && !m.isRead).length
        setUnreadCount(unread)
      }
    } catch (err) {
      console.error("Error fetching messages:", err)
    }
  }

  useEffect(() => {
    fetchMessages()
  }, [user?.id])

  // Polling
  useEffect(() => {
    if (!user?.id) return
    const interval = setInterval(fetchMessages, 3000)
    return () => clearInterval(interval)
  }, [user?.id])

  // Filter messages for selected admin
  const thread = useMemo(() => {
    if (!selectedAdmin || !user?.id) return []
    return messages
      .filter(m =>
        (m.senderId === user.id && m.receiverId === selectedAdmin.id) ||
        (m.receiverId === user.id && m.senderId === selectedAdmin.id)
      )
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  }, [messages, selectedAdmin, user?.id])

  // Mark messages as read when opening chat
  const markMessagesAsRead = async () => {
    if (!user?.id || !selectedAdmin) return
    
    const unreadMessages = messages.filter(
      m => m.senderId === selectedAdmin.id && m.receiverId === user.id && !m.isRead
    )
    
    for (const msg of unreadMessages) {
      try {
        await fetch(`${API_BASE}/messages/${msg.id}/read`, { method: "PATCH" })
      } catch (err) {
        console.error("Error marking message as read:", err)
      }
    }
    
    if (unreadMessages.length > 0) {
      fetchMessages()
    }
  }

  // Mark as read when chat opens
  useEffect(() => {
    if (isOpen && selectedAdmin) {
      markMessagesAsRead()
    }
  }, [isOpen, selectedAdmin])

  const handleSend = async () => {
    const text = draft.trim()
    if (!text || !user?.id || !selectedAdmin) {
      console.log("Cannot send:", { text, userId: user?.id, selectedAdmin })
      return
    }

    const payload = {
      senderId: String(user.id),
      receiverId: String(selectedAdmin.id),
      content: text,
    }
    console.log("Sending message:", payload)

    try {
      const res = await fetch(`${API_BASE}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      
      console.log("Response status:", res.status)

      if (res.ok) {
        const newMsg = await res.json()
        console.log("Message sent:", newMsg)
        setMessages(prev => [...prev, mapMessage(newMsg)])
        setDraft("")
      } else {
        const errorData = await res.text()
        console.error("Failed to send:", res.status, errorData)
      }
    } catch (error) {
      console.error("Error sending message:", error)
    }
  }

  if (!user || user.role !== "student") return null

  return (
    <>
      {/* Chat Bubble Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110"
        >
          <MessageCircle className="w-6 h-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-96 h-[500px] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border">
          {/* Header */}
          <div className="bg-blue-600 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border-2 border-white/30">
                <AvatarFallback className="bg-blue-500 text-white">
                  {initials(selectedAdmin?.full_name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{selectedAdmin?.full_name || "Hỗ trợ"}</p>
                <p className="text-xs text-blue-100">Quản trị viên</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-blue-500 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>


          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-3">
              {thread.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageCircle className="w-12 h-12 mx-auto text-slate-200 mb-3" />
                  <p className="text-sm">Xin chào! 👋</p>
                  <p className="text-xs mt-1">Hãy gửi tin nhắn để được hỗ trợ</p>
                </div>
              ) : (
                thread.map((m) => {
                  const fromMe = m.senderId === user?.id
                  return (
                    <div key={m.id} className={`flex ${fromMe ? "justify-end" : "justify-start"}`}>
                      <div
                        className={[
                          "max-w-[80%] rounded-2xl px-4 py-2 text-sm",
                          fromMe
                            ? "bg-blue-600 text-white rounded-br-md"
                            : "bg-slate-100 text-slate-900 rounded-bl-md",
                        ].join(" ")}
                      >
                        <p className="whitespace-pre-wrap">{m.content}</p>
                        <p className={`mt-1 text-[10px] ${fromMe ? "text-blue-200" : "text-muted-foreground"}`}>
                          {timeFormat(m.createdAt)}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </ScrollArea>

          {/* Input */}
          <div className="p-3 border-t bg-slate-50">
            {selectedAdmin ? (
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Nhập tin nhắn..."
                  className="bg-white"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                />
                <Button onClick={handleSend} size="icon" className="bg-blue-600 hover:bg-blue-700">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <p className="text-center text-sm text-muted-foreground">Đang tải...</p>
            )}
          </div>
        </div>
      )}
    </>
  )
}

