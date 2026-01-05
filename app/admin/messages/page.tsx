"use client"

import { useMemo, useState, useEffect } from "react"
import { formatDistanceToNow, parseISO } from "date-fns"
import { vi } from "date-fns/locale"
import { Link, useNavigate } from "react-router-dom"

import { useAuth } from "@/lib/auth-context"
import type { User, Department } from "@/types/database"

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "https://localhost:7010/api"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import {
  LayoutDashboard,
  Ticket as TicketIcon,
  FolderOpen,
  Building2,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Search,
  MessageSquare,
  CalendarDays,
  Send,
  Phone,
  Video,
  MoreVertical,
  DoorOpen,
  Plus,
  UserPlus,
} from "lucide-react"

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

type Conversation = {
  id: string
visitorId: string
  visitorName: string
  visitorRole: string
  departmentName?: string
  lastMessage: string
  lastAt: string
  unread: number
}

const navigation = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Tickets", href: "/admin/tickets", icon: TicketIcon },
  { name: "Danh mục", href: "/admin/categories", icon: FolderOpen },
  { name: "Phòng ban", href: "/admin/departments", icon: Building2 },
  { name: "Phòng", href: "/admin/rooms", icon: DoorOpen },
  { name: "Người dùng", href: "/admin/users", icon: Users },
  { name: "Báo cáo", href: "/admin/reports", icon: BarChart3 },
  { name: "Quản lí lịch", href: "/admin/schedule", icon: CalendarDays },
  { name: "Tin nhắn", href: "/admin/messages", icon: MessageSquare, active: true },
  { name: "Cài đặt", href: "/admin/settings", icon: Settings },
]

function initials(name?: string) {
  if (!name) return "NV"
  const parts = name.trim().split(" ").filter(Boolean)
  if (parts.length === 0) return "NV"
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

function timeAgo(iso: string) {
  if (!iso) return ""
  try {
    // Server returns UTC, add 7 hours for Vietnam
    const date = new Date(iso)
    date.setHours(date.getHours() + 7)
    const hours = date.getHours().toString().padStart(2, '0')
    const mins = date.getMinutes().toString().padStart(2, '0')
    return `${hours}:${mins}`
  } catch {
    return ""
  }
}

function mapUser(api: any): User {
  return {
    id: String(api.id),
    email: api.email || "",
    full_name: api.fullName || api.full_name || "",
    role: api.role,
    department_id: api.departmentId ? String(api.departmentId) : undefined,
    created_at: api.createdAt || new Date().toISOString(),
    updated_at: api.updatedAt || new Date().toISOString(),
  }
}

function mapDepartment(api: any): Department {
  return {
    id: String(api.id),
    name: api.name || "",
    code: api.code || "",
    description: api.description || "",
    manager_id: api.managerId ? String(api.managerId) : undefined,
    created_at: api.createdAt || new Date().toISOString(),
    updated_at: api.updatedAt || new Date().toISOString(),
  }
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

export default function AdminMessagesPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [users, setUsers] = useState<User[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [allMessages, setAllMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  
  // Get staff and student users for new chat
  const chatableUsers = useMemo(() => users.filter((u) => u.role === "staff" || u.role === "student"), [users])

  const [query, setQuery] = useState("")
  const [staffSearchQuery, setStaffSearchQuery] = useState("")
  const [activeConversationId, setActiveConversationId] = useState<string>("")
  const [draft, setDraft] = useState("")
  const [isNewChatOpen, setIsNewChatOpen] = useState(false)
  const [, setTick] = useState(0) // For re-rendering time

  // Fetch messages function
  const fetchMessages = async () => {
    if (!user?.id) return
    try {
      const res = await fetch(`${API_BASE}/messages/user/${user.id}`)
      if (res.ok) {
        const data = await res.json()
        setAllMessages(Array.isArray(data) ? data.map(mapMessage) : [])
      }
    } catch (err) {
      console.error("Error fetching messages:", err)
    }
  }

  // Initial fetch
  useEffect(() => {
    if (!user?.id) return
    setLoading(true)
    
    Promise.all([
      fetch(`${API_BASE}/users`).then((r) => r.json()),
      fetch(`${API_BASE}/departments`).then((r) => r.json()),
      fetch(`${API_BASE}/messages/user/${user.id}`).then(async (r) => {
        if (!r.ok) return []
        return r.json().catch(() => [])
      }),
    ])
      .then(([usersData, departmentsData, messagesData]) => {
        setUsers(Array.isArray(usersData) ? usersData.map(mapUser) : [])
        setDepartments(Array.isArray(departmentsData) ? departmentsData.map(mapDepartment) : [])
        setAllMessages(Array.isArray(messagesData) ? messagesData.map(mapMessage) : [])
      })
      .catch((err) => console.error("Error fetching data:", err))
      .finally(() => setLoading(false))
  }, [user?.id])

  // Polling for real-time updates (every 3 seconds)
  useEffect(() => {
    if (!user?.id) return
    const interval = setInterval(fetchMessages, 3000)
    return () => clearInterval(interval)
  }, [user?.id])

  // Update time display every minute
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 60000)
    return () => clearInterval(interval)
  }, [])

  // Build conversations from messages (like Messenger)
  const conversations = useMemo(() => {
    if (!user?.id) return []

    const conversationMap = new Map<string, Conversation>()

    allMessages.forEach((msg) => {
      // Determine the other person in conversation
      const otherUserId = msg.senderId === user.id ? msg.receiverId : msg.senderId
      const otherUser = users.find(u => u.id === otherUserId)
      
      if (!otherUser) return

      const existing = conversationMap.get(otherUserId)
      const msgTime = new Date(msg.createdAt).getTime()
      
      if (!existing || new Date(existing.lastAt).getTime() < msgTime) {
        const dept = departments.find(d => d.id === otherUser.department_id)
        const isUnread = msg.receiverId === user.id && !msg.isRead
        
        conversationMap.set(otherUserId, {
          id: otherUserId,
          visitorId: otherUserId,
          visitorName: otherUser.full_name,
          visitorRole: otherUser.role === "staff" ? "Nhân viên" : 
                       otherUser.role === "student" ? "Sinh viên" : 
                       otherUser.role === "department_admin" ? "Quản trị viên" : "Người dùng",
          departmentName: dept?.name,
          lastMessage: msg.content,
          lastAt: msg.createdAt,
          unread: (existing?.unread || 0) + (isUnread ? 1 : 0),
        })
      } else if (existing) {
        // Update unread count
        const isUnread = msg.receiverId === user.id && !msg.isRead
        if (isUnread) {
          existing.unread += 1
        }
      }
    })

    return Array.from(conversationMap.values()).sort(
      (a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime()
    )
  }, [allMessages, users, departments, user?.id])

  const filteredConversations = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return conversations
    return conversations.filter((c) => 
      c.visitorName.toLowerCase().includes(q) ||
      c.lastMessage.toLowerCase().includes(q) ||
      (c.departmentName || "").toLowerCase().includes(q)
    )
  }, [query, conversations])

  // Filter users for new chat dialog
  const filteredStaff = useMemo(() => {
    const q = staffSearchQuery.trim().toLowerCase()
    if (!q) return chatableUsers
    return chatableUsers.filter((s) => 
      s.full_name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q)
    )
  }, [staffSearchQuery, chatableUsers])

  const activeConversation = conversations.find((c) => c.id === activeConversationId)

  // Get messages for active conversation
  const thread = useMemo(() => {
    if (!activeConversation || !user?.id) return []
    
    return allMessages
      .filter(m => 
        (m.senderId === user.id && m.receiverId === activeConversation.visitorId) ||
        (m.receiverId === user.id && m.senderId === activeConversation.visitorId)
      )
      .map((msg) => ({
        id: msg.id,
        senderId: msg.senderId,
        fromMe: msg.senderId === user.id,
        content: msg.content,
        at: msg.createdAt,
        userName: msg.sender?.fullName || msg.sender?.full_name,
      }))
      .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
  }, [activeConversation, allMessages, user?.id])

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  const handleSelectConversation = async (id: string) => {
    setActiveConversationId(id)
    
    // Mark messages as read
    const conv = conversations.find(c => c.id === id)
    if (conv && conv.unread > 0 && user?.id) {
      const unreadMessages = allMessages.filter(
        m => m.senderId === conv.visitorId && m.receiverId === user.id && !m.isRead
      )
      
      // Mark each unread message as read
      for (const msg of unreadMessages) {
        try {
          await fetch(`${API_BASE}/messages/${msg.id}/read`, { method: "PATCH" })
        } catch (err) {
          console.error("Error marking message as read:", err)
        }
      }
      
      // Refresh messages
      fetchMessages()
    }
  }

  // Start new conversation with a staff member
  const handleStartChat = (staff: User) => {
    // Check if conversation already exists
    const existingConv = conversations.find(c => c.visitorId === staff.id)
    if (existingConv) {
      setActiveConversationId(existingConv.id)
    } else {
      // Create a new conversation entry (will be saved when first message is sent)
      setActiveConversationId(staff.id)
    }
    setIsNewChatOpen(false)
    setStaffSearchQuery("")
  }

  const handleSend = async () => {
    const text = draft.trim()
    if (!text || !user?.id) return
    
    // Get receiver ID - either from active conversation or new chat
    const receiverId = activeConversation?.visitorId || activeConversationId
    if (!receiverId) return

    const payload = {
      senderId: String(user.id),
      receiverId: String(receiverId),
      content: text,
    }

    try {
      const res = await fetch(`${API_BASE}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        const newMsg = await res.json()
        setAllMessages(prev => [...prev, mapMessage(newMsg)])
        setDraft("")
        
        // Set active conversation if it's a new chat
        if (!activeConversation) {
          setActiveConversationId(receiverId)
        }
      } else {
        const errorData = await res.json().catch(() => ({}))
        console.error("Failed to send message:", errorData)
      }
    } catch (error) {
      console.error("Error sending message:", error)
    }
  }

  // Auto-select first conversation
  useEffect(() => {
    if (filteredConversations.length > 0 && !activeConversationId) {
      setActiveConversationId(filteredConversations[0].id)
    }
  }, [filteredConversations.length])

  // Get active user info for new chats
  const activeUser = useMemo(() => {
    if (activeConversation) return null
    return users.find(u => u.id === activeConversationId)
  }, [activeConversation, activeConversationId, users])

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-white border-r hidden lg:flex flex-col">
        <div className="p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl">
              <LayoutDashboard className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">Helpdesk</h1>
              <p className="text-xs text-muted-foreground">Admin Panel</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                item.active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-blue-100 text-blue-700">{initials(user?.full_name)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.full_name || "Admin"}</p>
              <p className="text-xs text-muted-foreground">Quản trị viên</p>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-40 bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold">Tin nhắn</h1>
              <p className="text-sm text-muted-foreground">Nhắn tin trực tiếp với nhân viên</p>
            </div>
            <Button onClick={() => setIsNewChatOpen(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Cuộc trò chuyện mới
            </Button>
          </div>
        </header>

        <main className="p-6">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <p className="text-muted-foreground">Đang tải...</p>
            </div>
          ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Conversations List */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-blue-600" />
                    Tin nhắn
                  </CardTitle>
                  <Badge variant="secondary">{filteredConversations.length}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-3">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input 
                      placeholder="Tìm kiếm..." 
                      className="pl-9" 
                      value={query} 
                      onChange={(e) => setQuery(e.target.value)} 
                    />
                  </div>
                </div>
                <ScrollArea className="h-[520px] pr-3">
                  <div className="space-y-2">
                    {filteredConversations.length === 0 ? (
                      <div className="text-center py-8">
                        <MessageSquare className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                        <p className="text-sm text-muted-foreground">Chưa có tin nhắn nào</p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-3"
                          onClick={() => setIsNewChatOpen(true)}
                        >
                          <UserPlus className="w-4 h-4 mr-2" />
                          Bắt đầu trò chuyện
                        </Button>
                      </div>
                    ) : (
                      filteredConversations.map((c) => {
                        const active = c.id === activeConversationId
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => handleSelectConversation(c.id)}
                            className={[
                              "w-full rounded-xl border p-3 text-left transition-all",
                              active ? "border-blue-300 bg-blue-50 shadow-sm" : "bg-white hover:bg-slate-50",
                            ].join(" ")}
                          >
                            <div className="flex items-start gap-3">
                              <Avatar className="h-11 w-11">
                                <AvatarFallback className={active ? "bg-blue-600 text-white" : "bg-slate-100"}>
                                  {initials(c.visitorName)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-2">
                                  <p className={`truncate text-sm ${c.unread > 0 ? "font-bold" : "font-semibold"}`}>{c.visitorName}</p>
                                  <span className="text-[11px] text-muted-foreground whitespace-nowrap">{timeAgo(c.lastAt)}</span>
                                </div>
                                <p className="truncate text-xs text-muted-foreground">{c.visitorRole} {c.departmentName ? `• ${c.departmentName}` : ""}</p>
                                <p className={`mt-1 truncate text-sm ${c.unread > 0 ? "font-medium text-slate-900" : "text-slate-600"}`}>{c.lastMessage}</p>
                              </div>
                              {c.unread > 0 && <Badge className="bg-red-500 text-white">{c.unread}</Badge>}
                            </div>
                          </button>
                        )
                      })
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Chat Area */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    {(activeConversation || activeUser) && (
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-blue-100 text-blue-700">
                          {initials(activeConversation?.visitorName || activeUser?.full_name)}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div className="min-w-0">
                      <CardTitle className="truncate text-base">
                        {activeConversation?.visitorName || activeUser?.full_name || "Chọn người để nhắn tin"}
                      </CardTitle>
                      <p className="truncate text-sm text-muted-foreground">
                        {activeConversation?.visitorRole || (activeUser?.role === "staff" ? "Nhân viên" : "")}
                        {(activeConversation?.departmentName || (activeUser && departments.find(d => d.id === activeUser.department_id)?.name)) && 
                          ` • ${activeConversation?.departmentName || departments.find(d => d.id === activeUser?.department_id)?.name}`
                        }
                      </p>
                    </div>
                  </div>
                  {(activeConversation || activeUser) && (
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" className="bg-transparent">
                        <Phone className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" className="bg-transparent">
                        <Video className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="icon" className="bg-transparent">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-0">
                {(activeConversation || activeUser) ? (
                  <>
                    <ScrollArea className="h-[440px] p-4">
                      <div className="space-y-3">
                        {thread.length === 0 ? (
                          <div className="text-center py-12 text-muted-foreground">
                            <MessageSquare className="w-16 h-16 mx-auto text-slate-200 mb-4" />
                            <p className="text-sm">Chưa có tin nhắn nào</p>
                            <p className="text-xs mt-1">Hãy gửi tin nhắn để bắt đầu cuộc trò chuyện!</p>
                          </div>
                        ) : (
                          thread.map((m) => (
                            <div key={m.id} className={`flex ${m.fromMe ? "justify-end" : "justify-start"}`}>
                              <div
                                className={[
                                  "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm",
                                  m.fromMe 
                                    ? "bg-blue-600 text-white rounded-br-md" 
                                    : "bg-slate-100 text-slate-900 rounded-bl-md",
                                ].join(" ")}
                              >
                                <p className="whitespace-pre-wrap">{m.content}</p>
                                <p className={`mt-1 text-[10px] ${m.fromMe ? "text-blue-200" : "text-muted-foreground"}`}>
                                  {timeAgo(m.at)}
                                </p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </ScrollArea>

                    <div className="p-4 border-t bg-slate-50">
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
                        <Button onClick={handleSend} className="bg-blue-600 hover:bg-blue-700 px-6">
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[500px] text-muted-foreground">
                    <MessageSquare className="w-20 h-20 text-slate-200 mb-4" />
                    <p className="text-lg font-medium text-slate-400">Chọn một cuộc trò chuyện</p>
                    <p className="text-sm mt-1">hoặc bắt đầu cuộc trò chuyện mới</p>
                    <Button 
                      variant="outline" 
                      className="mt-4"
                      onClick={() => setIsNewChatOpen(true)}
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Trò chuyện mới
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          )}
        </main>
      </div>

      {/* New Chat Dialog */}
      <Dialog open={isNewChatOpen} onOpenChange={setIsNewChatOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-blue-600" />
              Cuộc trò chuyện mới
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input 
                placeholder="Tìm kiếm nhân viên, sinh viên..." 
                className="pl-9" 
                value={staffSearchQuery}
                onChange={(e) => setStaffSearchQuery(e.target.value)}
                autoFocus
              />
            </div>
            <ScrollArea className="h-[300px]">
              <div className="space-y-1">
                {filteredStaff.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">Không tìm thấy người dùng</p>
                  </div>
                ) : (
                  filteredStaff.map((targetUser) => {
                    const dept = departments.find(d => d.id === targetUser.department_id)
                    const roleLabel = targetUser.role === "staff" ? "Nhân viên" : "Sinh viên"
                    return (
                      <button
                        key={targetUser.id}
                        type="button"
                        onClick={() => handleStartChat(targetUser)}
                        className="w-full flex items-center gap-4 p-4 rounded-lg hover:bg-slate-50 transition-colors text-left"
                      >
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className={`text-base ${targetUser.role === "staff" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>
                            {initials(targetUser.full_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-base">{targetUser.full_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {roleLabel} {dept?.name ? `• ${dept.name}` : ""}
                          </p>
                          <p className="text-xs text-muted-foreground">{targetUser.email}</p>
                        </div>
                        <MessageSquare className="w-5 h-5 text-blue-500" />
                      </button>
                    )
                  })
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
