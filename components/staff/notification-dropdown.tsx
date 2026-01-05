"use client"

import { useState, useEffect } from "react"
import { Bell, Check, Trash2, Ticket } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "https://localhost:7010/api"

type Notification = {
  id: string
  userId: string
  ticketId?: string
  title: string
  message: string
  type: string
  isRead: boolean
  createdAt: string
}

function mapNotification(api: any): Notification {
  return {
    id: String(api.id),
    userId: String(api.userId),
    ticketId: api.ticketId ? String(api.ticketId) : undefined,
    title: api.title,
    message: api.message,
    type: api.type,
    isRead: api.isRead,
    createdAt: api.createdAt,
  }
}

function timeAgo(iso: string) {
  if (!iso) return ""
  try {
    const date = new Date(iso)
    date.setHours(date.getHours() + 7) // Vietnam timezone
    const now = new Date()
    now.setHours(now.getHours() + 7)
    
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "Vừa xong"
    if (diffMins < 60) return `${diffMins} phút trước`
    if (diffHours < 24) return `${diffHours} giờ trước`
    if (diffDays < 7) return `${diffDays} ngày trước`
    
    const hours = date.getHours().toString().padStart(2, '0')
    const mins = date.getMinutes().toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    return `${day}/${month} ${hours}:${mins}`
  } catch {
    return ""
  }
}

export function NotificationDropdown() {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)

  const fetchNotifications = async () => {
    if (!user?.id) return
    try {
      const res = await fetch(`${API_BASE}/notifications/user/${user.id}`)
      if (res.ok) {
        const data = await res.json()
        const notifs = Array.isArray(data) ? data.map(mapNotification) : []
        setNotifications(notifs.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ))
        setUnreadCount(notifs.filter(n => !n.isRead).length)
      }
    } catch (err) {
      console.error("Error fetching notifications:", err)
    }
  }

  useEffect(() => {
    fetchNotifications()
  }, [user?.id])

  // Polling every 3 seconds for real-time updates
  useEffect(() => {
    if (!user?.id) return
    const interval = setInterval(fetchNotifications, 3000)
    return () => clearInterval(interval)
  }, [user?.id])

  const markAsRead = async (id: string) => {
    try {
      await fetch(`${API_BASE}/notifications/${id}/read`, { method: "PATCH" })
      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      )
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch (err) {
      console.error("Error marking notification as read:", err)
    }
  }

  const markAllAsRead = async () => {
    const unreadNotifs = notifications.filter(n => !n.isRead)
    for (const notif of unreadNotifs) {
      try {
        await fetch(`${API_BASE}/notifications/${notif.id}/read`, { method: "PATCH" })
      } catch (err) {
        console.error("Error marking notification as read:", err)
      }
    }
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    setUnreadCount(0)
  }

  const deleteNotification = async (id: string) => {
    try {
      await fetch(`${API_BASE}/notifications/${id}`, { method: "DELETE" })
      const notif = notifications.find(n => n.id === id)
      setNotifications(prev => prev.filter(n => n.id !== id))
      if (notif && !notif.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (err) {
      console.error("Error deleting notification:", err)
    }
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative bg-transparent">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center animate-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96">
        <div className="flex items-center justify-between p-3 border-b">
          <h3 className="font-semibold">Thông báo</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead} className="text-xs text-blue-600">
              <Check className="w-3 h-3 mr-1" />
              Đánh dấu tất cả đã đọc
            </Button>
          )}
        </div>
        
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="w-12 h-12 mx-auto text-slate-200 mb-3" />
              <p className="text-sm">Không có thông báo</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-3 hover:bg-slate-50 transition-colors ${!notif.isRead ? "bg-blue-50" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-full ${
                      notif.type === "assignment" ? "bg-violet-100" : "bg-blue-100"
                    }`}>
                      <Ticket className={`w-4 h-4 ${
                        notif.type === "assignment" ? "text-violet-600" : "text-blue-600"
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm ${!notif.isRead ? "font-semibold" : "font-medium"}`}>
                          {notif.title}
                        </p>
                        {!notif.isRead && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                        {notif.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {timeAgo(notif.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {!notif.isRead && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => markAsRead(notif.id)}
                        >
                          <Check className="w-3 h-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-red-500 hover:text-red-600"
                        onClick={() => deleteNotification(notif.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

