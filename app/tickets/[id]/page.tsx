"use client"

import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { StatusBadge } from "@/components/tickets/status-badge"
import { PriorityBadge } from "@/components/tickets/priority-badge"
import { SLAIndicator } from "@/components/tickets/sla-indicator"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, MapPin, Calendar, User, Building2, Send, MessageSquare, History, Phone } from "lucide-react"
import type { Ticket, TicketComment, TicketHistory, TicketStatus, User as AppUser } from "@/types/database"
import { useAuth } from "@/lib/auth-context"

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "https://localhost:7010/api"

function normalizeStatus(status: any): string {
  if (typeof status === "number") {
    const statusMap: Record<number, string> = { 0: "open", 1: "in_progress", 2: "resolved", 3: "closed" }
    return statusMap[status] || "open"
  }
  if (typeof status === "string") {
    const normalized = status
      // Convert camelCase to snake_case: "inProgress" -> "in_Progress"
      .replace(/([a-z])([A-Z])/g, "$1_$2")
      // Convert to lowercase
      .toLowerCase()
    // Map known status values
    const statusMap: Record<string, string> = {
      "open": "open",
      "inprogress": "in_progress",
      "in_progress": "in_progress",
      "resolved": "resolved",
      "closed": "closed",
    }
    return statusMap[normalized] || "open"
  }
  return "open"
}

function mapTicket(api: any): Ticket {
  return {
    id: String(api.id),
    ticket_number: api.ticketNumber,
    title: api.title,
    description: api.description,
    category_id: String(api.categoryId),
    department_id: String(api.departmentId),
    status: normalizeStatus(api.status),
    priority: api.priority ? api.priority.toLowerCase() : "medium",
    reporter_id: String(api.reporterId),
    assignee_id: api.assigneeId ? String(api.assigneeId) : undefined,
    location: api.location,
    attachment_urls: api.attachmentUrls,
    sla_response_due: api.slaResponseDue,
    sla_resolution_due: api.slaResolutionDue,
    first_response_at: api.firstResponseAt,
    resolved_at: api.resolvedAt,
    closed_at: api.closedAt,
    is_sla_response_breached: api.isSlaResponseBreached,
    is_sla_resolution_breached: api.isSlaResolutionBreached,
    created_at: api.createdAt,
    updated_at: api.updatedAt,
    category: api.category,
    department: api.department,
    reporter: api.reporter,
    assignee: api.assignee,
  }
}

function mapComment(api: any): TicketComment {
  return {
    id: String(api.id),
    ticket_id: String(api.ticketId),
    user_id: String(api.userId),
    content: api.content,
    is_internal: api.isInternal,
    created_at: api.createdAt,
    user: api.user as AppUser | undefined,
  }
}

function mapHistory(api: any): TicketHistory {
  return {
    id: String(api.id),
    ticket_id: String(api.ticketId),
    user_id: String(api.userId),
    action: api.action,
    old_value: api.oldValue,
    new_value: api.newValue,
    created_at: api.createdAt,
    user: api.user as AppUser | undefined,
  }
}

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [comments, setComments] = useState<TicketComment[]>([])
  const [history, setHistory] = useState<TicketHistory[]>([])
  const [newComment, setNewComment] = useState("")
  const [activeTab, setActiveTab] = useState<"comments" | "history">("comments")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [chatMessage, setChatMessage] = useState("")
  const [chatMessages, setChatMessages] = useState<any[]>([])

  useEffect(() => {
    if (!id) return

    const fetchTicketData = async (showLoading = false) => {
      try {
        if (showLoading) setLoading(true)
        const [t, c, h] = await Promise.all([
      fetch(`${API_BASE}/tickets/${id}`).then((r) => r.json()),
      fetch(`${API_BASE}/tickets/${id}/comments`).then((r) => r.json()),
      fetch(`${API_BASE}/tickets/${id}/history`).then((r) => r.json()),
    ])
        setTicket(mapTicket(t))
        setComments((c || []).map(mapComment))
        setHistory((h || []).map(mapHistory))
        setError(null)
      } catch {
        setError("Không tải được ticket hoặc bình luận")
      } finally {
        if (showLoading) setLoading(false)
      }
    }

    // Initial load
    fetchTicketData(true)

    // Auto-refresh ticket data every 5 seconds to get status updates
    const interval = setInterval(() => {
      fetchTicketData(false)
    }, 5000) // Refresh every 5 seconds

    // Also refresh when window regains focus
    const handleFocus = () => {
      fetchTicketData(false)
    }
    window.addEventListener("focus", handleFocus)

    return () => {
      clearInterval(interval)
      window.removeEventListener("focus", handleFocus)
    }
  }, [id])

  const handleSendComment = async () => {
    if (!newComment.trim() || !user || !id) return
    try {
      await fetch(`${API_BASE}/tickets/${id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          content: newComment,
          isInternal: false,
        }),
      })
      setNewComment("")
      const res = await fetch(`${API_BASE}/tickets/${id}/comments`)
      const data = await res.json()
      setComments((data || []).map(mapComment))
    } catch {
      setError("Gửi bình luận thất bại")
    }
  }

  // Load chat messages when dialog opens
  useEffect(() => {
    if (isChatOpen && ticket?.assignee && user?.id && id) {
      fetch(`${API_BASE}/messages/ticket/${id}/conversation?userId1=${user.id}&userId2=${ticket.assignee.id}`)
        .then(async (r) => {
          if (r.ok) {
            const data = await r.json()
            setChatMessages(Array.isArray(data) ? data : [])
          }
        })
        .catch(() => setChatMessages([]))
    }
  }, [isChatOpen, ticket?.assignee?.id, user?.id, id])

  const handleSendChatMessage = async () => {
    if (!chatMessage.trim() || !user || !id || !ticket?.assignee) return
    try {
      await fetch(`${API_BASE}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId: id,
          senderId: user.id,
          receiverId: ticket.assignee.id,
          content: chatMessage,
        }),
      })
      setChatMessage("")
      
      // Refresh chat messages
      const res = await fetch(`${API_BASE}/messages/ticket/${id}/conversation?userId1=${user.id}&userId2=${ticket.assignee.id}`)
      const data = await res.json()
      setChatMessages(Array.isArray(data) ? data : [])
    } catch {
      setError("Gửi tin nhắn thất bại")
    }
  }

  if (loading) {
    return <div className="p-6">Đang tải...</div>
  }

  if (error) {
    return (
      <div className="p-6 space-y-4">
        <p className="text-red-600 text-sm">{error}</p>
        <Button asChild variant="link">
          <Link to="/tickets">Quay lại danh sách</Link>
        </Button>
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-muted-foreground">Không tìm thấy ticket</p>
        <Button asChild variant="link">
          <Link to="/tickets">Quay lại danh sách</Link>
        </Button>
      </div>
    )
  }

  const staffUsers: AppUser[] = [] // Student view không cần gán người xử lý tại đây

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon">
          <Link to="/tickets">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">{ticket.ticket_number}</span>
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
          </div>
          <h1 className="text-xl font-bold tracking-tight">{ticket.title}</h1>
        </div>
      </div>

      {/* Giao diện cho Student - đơn giản, gọn gàng */}
      {(user?.role === "Student" || user?.role === "student") ? (
        <div className="max-w-2xl mx-auto space-y-4">
          {/* Mô tả sự cố */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Mô tả vấn đề</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{ticket.description}</p>
            </CardContent>
          </Card>

          {/* Thông tin chi tiết - gọn */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Thông tin chi tiết</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <span>{ticket.location || "Không xác định"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Building2 className="h-4 w-4 text-blue-600 flex-shrink-0" />
                <span>{ticket.department?.name || "Chưa xác định"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-orange-600 flex-shrink-0" />
                <span>{formatDate(ticket.created_at)}</span>
              </div>
              {ticket.assignee && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span>Người xử lý: <strong>{ticket.assignee.full_name || (ticket.assignee as any)?.fullName}</strong></span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ghi chú từ nhân viên */}
          <Card className="border-blue-200 bg-blue-50/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-blue-600" />
                Ghi chú từ nhân viên
              </CardTitle>
            </CardHeader>
            <CardContent>
              {comments.filter(c => !c.is_internal).length > 0 ? (
                <div className="space-y-2">
                  {comments.filter(c => !c.is_internal).map((comment) => {
                    const commentUser = comment.user
                    const userName = commentUser?.full_name || (commentUser as any)?.fullName || "Nhân viên"
                    return (
                      <div key={comment.id} className="p-3 bg-white rounded-lg border border-blue-100">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-blue-700">{userName}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(comment.created_at)}
                          </span>
                        </div>
                        <p className="text-sm">{comment.content}</p>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-3">
                  Chưa có ghi chú từ nhân viên xử lý
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        /* Giao diện cho Staff/Admin - đầy đủ */
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Mô tả sự cố</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{ticket.description}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <Button
                  variant={activeTab === "comments" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab("comments")}
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Bình luận ({comments.length})
                </Button>
                <Button
                  variant={activeTab === "history" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveTab("history")}
                >
                  <History className="mr-2 h-4 w-4" />
                  Lịch sử ({history.length})
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {activeTab === "comments" && (
                <div className="space-y-4">
                  {comments.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground">Chưa có bình luận nào</p>
                  ) : (
                    comments.map((comment) => {
                        const cUser = comment.user
                      return (
                        <div key={comment.id} className="flex gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                                {cUser?.full_name
                                ?.split(" ")
                                .map((n) => n[0])
                                .join("") || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{cUser?.full_name || "Người dùng"}</span>
                              {comment.is_internal && (
                                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-700">
                                  Nội bộ
                                </span>
                              )}
                              <span className="text-xs text-muted-foreground">{formatDate(comment.created_at)}</span>
                            </div>
                            <p className="mt-1 text-sm">{comment.content}</p>
                          </div>
                        </div>
                      )
                    })
                  )}

                  <div className="mt-4 flex gap-2">
                    <Textarea
                      placeholder="Thêm bình luận..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      rows={2}
                    />
                    <Button size="icon" onClick={handleSendComment}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {activeTab === "history" && (
                <div className="space-y-3">
                  {history.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground">Chưa có lịch sử thay đổi</p>
                  ) : (
                    history.map((item) => {
                        const hUser = item.user
                      return (
                        <div key={item.id} className="flex items-start gap-3 rounded-lg bg-muted/50 p-3">
                          <div className="flex-1">
                            <p className="text-sm">
                                <span className="font-medium">{hUser?.full_name || "Người dùng"}</span>{" "}
                              {item.action === "status_changed" && (
                                <>
                                  đã thay đổi trạng thái từ <StatusBadge status={item.old_value as TicketStatus} />{" "}
                                  thành <StatusBadge status={item.new_value as TicketStatus} />
                                </>
                              )}
                              {item.action === "assigned" && (
                                <>
                                  đã gán cho <strong>{item.new_value}</strong>
                                </>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">{formatDate(item.created_at)}</p>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Thông tin chi tiết</CardTitle>
            </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="h-4 w-4 text-emerald-600" />
                  <span className="font-medium">{ticket.location || "Không xác định"}</span>
                </div>
                <Separator />
              <div className="flex items-center gap-3 text-sm">
                  <Building2 className="h-4 w-4 text-blue-600" />
                  <span>{ticket.department?.name || "Chưa xác định"}</span>
              </div>
                <Separator />
              <div className="flex items-center gap-3 text-sm">
                  <User className="h-4 w-4 text-purple-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Người gửi</p>
                    <p className="font-medium">{ticket.reporter?.full_name || (ticket.reporter as any)?.fullName || "Không xác định"}</p>
                  </div>
              </div>
                <Separator />
              <div className="flex items-center gap-3 text-sm">
                  <Calendar className="h-4 w-4 text-orange-600" />
                  <div>
                    <p className="text-xs text-muted-foreground">Ngày tạo</p>
                    <p className="font-medium">{formatDate(ticket.created_at)}</p>
                  </div>
              </div>
                {ticket.assignee && (
                  <>
                    <Separator />
              <div className="flex items-center gap-3 text-sm">
                      <User className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="text-xs text-muted-foreground">Người xử lý</p>
                        <p className="font-medium">{ticket.assignee.full_name || (ticket.assignee as any)?.fullName || "Chưa phân công"}</p>
                      </div>
              </div>
                  </>
                )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>SLA Tracking</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground">Thời hạn phản hồi</p>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-sm">{formatDate(ticket.sla_response_due)}</span>
                  <SLAIndicator
                    dueDate={ticket.sla_response_due}
                    isBreached={ticket.is_sla_response_breached}
                    completedAt={ticket.first_response_at}
                  />
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Thời hạn xử lý</p>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-sm">{formatDate(ticket.sla_resolution_due)}</span>
                  <SLAIndicator
                    dueDate={ticket.sla_resolution_due}
                    isBreached={ticket.is_sla_resolution_breached}
                    completedAt={ticket.resolved_at}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Thao tác</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Gán cho</label>
                <Select defaultValue={ticket.assignee_id || ""}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn người xử lý" />
                  </SelectTrigger>
                  <SelectContent>
                      {staffUsers.map((sUser) => (
                        <SelectItem key={sUser.id} value={sUser.id}>
                          {sUser.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Trạng thái</label>
                <Select defaultValue={ticket.status}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Mở</SelectItem>
                    <SelectItem value="in_progress">Đang xử lý</SelectItem>
                    <SelectItem value="resolved">Đã giải quyết</SelectItem>
                    <SelectItem value="closed">Đã đóng</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button className="w-full">Cập nhật Ticket</Button>
            </CardContent>
          </Card>
        </div>
      </div>
      )}

      {/* Chat Dialog */}
      {ticket.assignee && (
        <Dialog open={isChatOpen} onOpenChange={setIsChatOpen}>
          <DialogContent className="sm:max-w-2xl h-[600px] flex flex-col">
            <DialogHeader>
              <DialogTitle>Nhắn tin với {ticket.assignee.full_name}</DialogTitle>
              <DialogDescription>
                Trao đổi về ticket: {ticket.ticket_number}
              </DialogDescription>
            </DialogHeader>

            <ScrollArea className="flex-1 pr-4 mb-4">
              <div className="space-y-3">
                {chatMessages.map((message: any) => {
                  const isFromMe = message.senderId === user?.id
                  const sender = message.sender
                  return (
                    <div key={message.id} className={`flex ${isFromMe ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                          isFromMe
                            ? "bg-blue-600 text-white"
                            : "bg-slate-100 text-slate-900"
                        }`}
                      >
                        {!isFromMe && sender && (
                          <p className="text-xs font-medium mb-1 opacity-70">
                            {sender.fullName || sender.full_name}
                          </p>
                        )}
                        <p className="whitespace-pre-wrap">{message.content}</p>
                        <p
                          className={`mt-1 text-[11px] ${
                            isFromMe ? "text-blue-100" : "text-muted-foreground"
                          }`}
                        >
                          {formatDate(message.createdAt)}
                        </p>
                      </div>
                    </div>
                  )
                })}
                {chatMessages.length === 0 && (
                  <div className="text-center text-sm text-muted-foreground py-8">
                    Chưa có tin nhắn nào. Hãy bắt đầu cuộc trò chuyện!
                  </div>
                )}
              </div>
            </ScrollArea>

            <Separator />

            <div className="flex items-center gap-2">
              <Input
                placeholder="Nhập tin nhắn..."
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSendChatMessage()
                  }
                }}
              />
              <Button onClick={handleSendChatMessage} className="bg-blue-600 hover:bg-blue-700">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
