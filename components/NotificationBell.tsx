"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Bell } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
// import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import type { Notification } from "@/types/database"

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "https://localhost:7010/api"

export function NotificationBell() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchNotifications = async () => {
    if (!user?.id) return

    try {
      const [notificationsRes, countRes] = await Promise.all([
        fetch(`${API_BASE}/notifications/user/${user.id}?isRead=false`), // Fetch only unread notifications
        fetch(`${API_BASE}/notifications/user/${user.id}/unread-count`),
      ])

      if (notificationsRes.ok) {
        const data = await notificationsRes.json()
        setNotifications(Array.isArray(data) ? data : [])
      }

      if (countRes.ok) {
        const count = await countRes.json()
        setUnreadCount(typeof count === "number" ? count : 0)
      }
    } catch (error) {
      console.error("Error fetching notifications:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.id) {
      fetchNotifications()
      // Poll every 30 seconds for new notifications
      const interval = setInterval(fetchNotifications, 30000)
      return () => clearInterval(interval)
    }
  }, [user?.id])

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const res = await fetch(`${API_BASE}/notifications/${notificationId}/read`, {
        method: "PATCH",
      })

      if (res.ok) {
        // Remove from notifications list (since we only show unread)
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId))
        setUnreadCount((prev) => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error("Error marking notification as read:", error)
    }
  }

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    if (!notification.is_read) {
      handleMarkAsRead(notification.id)
    }

    // Navigate to ticket if available
    if (notification.ticket_id) {
      navigate(`/admin/tickets`)
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "Vừa xong"
    if (diffMins < 60) return `${diffMins} phút trước`
    if (diffHours < 24) return `${diffHours} giờ trước`
    if (diffDays < 7) return `${diffDays} ngày trước`
    return date.toLocaleDateString("vi-VN")
  }

  // Only show unread notifications
  const unreadNotifications = notifications.filter((n) => !n.is_read)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="relative bg-transparent">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-semibold">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>
          <div className="flex items-center justify-between">
            <span>Thông báo</span>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {unreadCount} mới
              </Badge>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Đang tải...
            </div>
          ) : unreadNotifications.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Không có thông báo mới
            </div>
          ) : (
            <div className="divide-y">
              {unreadNotifications.map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  className="flex flex-col items-start p-3 cursor-pointer hover:bg-slate-50"
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start justify-between w-full gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-semibold">
                        {notification.title}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatTimeAgo(notification.created_at)}
                      </p>
                    </div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-1 flex-shrink-0" />
                  </div>
                </DropdownMenuItem>
              ))}
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

