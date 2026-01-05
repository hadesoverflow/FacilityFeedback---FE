"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useToast } from "@/components/ui/use-toast"
import {
  LayoutDashboard,
  Ticket,
  FolderOpen,
  Building2,
  Users,
  BarChart3,
  CalendarDays,
  MessageSquare,
  Settings,
  LogOut,
  Bell,
  Shield,
  Mail,
  Clock,
  Database,
  Palette,
  Globe,
  Save,
  DoorOpen,
} from "lucide-react"
import { NotificationBell } from "@/components/NotificationBell"

const navigation = [
  { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { name: "Tickets", href: "/admin/tickets", icon: Ticket },
  { name: "Danh mục", href: "/admin/categories", icon: FolderOpen },
  { name: "Phòng ban", href: "/admin/departments", icon: Building2 },
  { name: "Phòng", href: "/admin/rooms", icon: DoorOpen },
  { name: "Người dùng", href: "/admin/users", icon: Users },
  { name: "Báo cáo", href: "/admin/reports", icon: BarChart3 },
  { name: "Quản lí lịch", href: "/admin/schedule", icon: CalendarDays },
  { name: "Tin nhắn", href: "/admin/messages", icon: MessageSquare },
  { name: "Cài đặt", href: "/admin/settings", icon: Settings, active: true },
]

export default function AdminSettingsPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { toast } = useToast()

  // General settings
  const [siteName, setSiteName] = useState("Helpdesk")
  const [siteEmail, setSiteEmail] = useState("support@fpt.edu.vn")
  const [timezone, setTimezone] = useState("Asia/Ho_Chi_Minh")

  // SLA settings
  const [defaultResponseHours, setDefaultResponseHours] = useState(24)
  const [defaultResolutionHours, setDefaultResolutionHours] = useState(72)
  const [enableSlaAlerts, setEnableSlaAlerts] = useState(true)

  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [pushNotifications, setPushNotifications] = useState(true)
  const [notifyOnNewTicket, setNotifyOnNewTicket] = useState(true)
  const [notifyOnStatusChange, setNotifyOnStatusChange] = useState(true)
  const [notifyOnAssignment, setNotifyOnAssignment] = useState(true)

  // Security settings
  const [requireTwoFactor, setRequireTwoFactor] = useState(false)
  const [sessionTimeout, setSessionTimeout] = useState(60)
  const [maxLoginAttempts, setMaxLoginAttempts] = useState(5)

  const handleSave = () => {
    toast({
      title: "✅ Đã lưu cài đặt",
      description: "Các thay đổi đã được áp dụng thành công",
      duration: 3000,
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-white/80 backdrop-blur-xl border-r border-slate-200/50 shadow-xl">
        <div className="flex h-16 items-center gap-2 px-6 border-b border-slate-200/50">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/30">
            <Building2 className="h-5 w-5 text-white" />
          </div>
          <span className="font-bold text-lg bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Helpdesk
          </span>
        </div>
        <nav className="p-4 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/30"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            )
          })}
        </nav>
        <div className="absolute bottom-4 left-4 right-4">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-red-500 hover:text-red-600 hover:bg-red-50"
            onClick={() => {
              logout()
              navigate("/login")
            }}
          >
            <LogOut className="h-5 w-5" />
            Đăng xuất
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="pl-64">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/50">
          <div className="flex h-16 items-center justify-between px-6">
            <div>
              <h1 className="text-xl font-bold text-slate-800">Cài đặt hệ thống</h1>
              <p className="text-sm text-slate-500">Quản lý cấu hình và tùy chỉnh hệ thống</p>
            </div>
            <div className="flex items-center gap-4">
              <NotificationBell />
              <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
                <Avatar className="h-9 w-9 ring-2 ring-blue-500/20">
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-500 text-white font-semibold">
                    {user?.fullName?.charAt(0) || "A"}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:block">
                  <p className="text-sm font-semibold text-slate-700">{user?.fullName}</p>
                  <p className="text-xs text-slate-500">Administrator</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-6">
          <Tabs defaultValue="general" className="space-y-6">
            <TabsList className="bg-white border shadow-sm">
              <TabsTrigger value="general" className="gap-2">
                <Globe className="h-4 w-4" />
                Chung
              </TabsTrigger>
              <TabsTrigger value="sla" className="gap-2">
                <Clock className="h-4 w-4" />
                SLA
              </TabsTrigger>
              <TabsTrigger value="notifications" className="gap-2">
                <Bell className="h-4 w-4" />
                Thông báo
              </TabsTrigger>
              <TabsTrigger value="security" className="gap-2">
                <Shield className="h-4 w-4" />
                Bảo mật
              </TabsTrigger>
            </TabsList>

            {/* General Settings */}
            <TabsContent value="general">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-blue-500" />
                    Cài đặt chung
                  </CardTitle>
                  <CardDescription>Cấu hình thông tin cơ bản của hệ thống</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="siteName">Tên hệ thống</Label>
                      <Input
                        id="siteName"
                        value={siteName}
                        onChange={(e) => setSiteName(e.target.value)}
                        placeholder="Helpdesk"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="siteEmail">Email hệ thống</Label>
                      <Input
                        id="siteEmail"
                        type="email"
                        value={siteEmail}
                        onChange={(e) => setSiteEmail(e.target.value)}
                        placeholder="support@fpt.edu.vn"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Múi giờ</Label>
                    <select
                      id="timezone"
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                    >
                      <option value="Asia/Ho_Chi_Minh">Asia/Ho_Chi_Minh (GMT+7)</option>
                      <option value="Asia/Bangkok">Asia/Bangkok (GMT+7)</option>
                      <option value="Asia/Singapore">Asia/Singapore (GMT+8)</option>
                    </select>
                  </div>
                  <Separator />
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                    <h4 className="font-medium text-blue-800 mb-2">💡 Gợi ý cài đặt</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• Cập nhật email hệ thống để nhận thông báo quan trọng</li>
                      <li>• Đảm bảo múi giờ chính xác để hiển thị thời gian đúng</li>
                      <li>• Tên hệ thống sẽ hiển thị trên các email và thông báo</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* SLA Settings */}
            <TabsContent value="sla">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-orange-500" />
                    Cài đặt SLA (Service Level Agreement)
                  </CardTitle>
                  <CardDescription>Cấu hình thời gian phản hồi và xử lý mặc định</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="responseHours">Thời gian phản hồi mặc định (giờ)</Label>
                      <Input
                        id="responseHours"
                        type="number"
                        value={defaultResponseHours}
                        onChange={(e) => setDefaultResponseHours(Number(e.target.value))}
                        min={1}
                      />
                      <p className="text-xs text-muted-foreground">
                        Thời gian tối đa để phản hồi ticket mới
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="resolutionHours">Thời gian xử lý mặc định (giờ)</Label>
                      <Input
                        id="resolutionHours"
                        type="number"
                        value={defaultResolutionHours}
                        onChange={(e) => setDefaultResolutionHours(Number(e.target.value))}
                        min={1}
                      />
                      <p className="text-xs text-muted-foreground">
                        Thời gian tối đa để hoàn thành xử lý ticket
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div>
                      <Label className="font-medium">Bật cảnh báo SLA</Label>
                      <p className="text-sm text-muted-foreground">
                        Gửi thông báo khi ticket sắp vi phạm SLA
                      </p>
                    </div>
                    <Switch
                      checked={enableSlaAlerts}
                      onCheckedChange={setEnableSlaAlerts}
                    />
                  </div>
                  <Separator />
                  <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
                    <h4 className="font-medium text-orange-800 mb-2">⏰ Gợi ý SLA</h4>
                    <ul className="text-sm text-orange-700 space-y-1">
                      <li>• Ticket ưu tiên cao nên có SLA ngắn hơn (4-8 giờ phản hồi)</li>
                      <li>• Cấu hình SLA riêng cho từng danh mục trong mục "Danh mục"</li>
                      <li>• Bật cảnh báo để nhân viên biết khi ticket sắp quá hạn</li>
                      <li>• Theo dõi báo cáo SLA để cải thiện hiệu suất</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Notification Settings */}
            <TabsContent value="notifications">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-green-500" />
                    Cài đặt thông báo
                  </CardTitle>
                  <CardDescription>Quản lý các loại thông báo trong hệ thống</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Mail className="h-5 w-5 text-blue-500" />
                        <div>
                          <Label className="font-medium">Thông báo Email</Label>
                          <p className="text-sm text-muted-foreground">
                            Gửi email cho các sự kiện quan trọng
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={emailNotifications}
                        onCheckedChange={setEmailNotifications}
                      />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Bell className="h-5 w-5 text-purple-500" />
                        <div>
                          <Label className="font-medium">Thông báo Push</Label>
                          <p className="text-sm text-muted-foreground">
                            Hiển thị thông báo trong ứng dụng
                          </p>
                        </div>
                      </div>
                      <Switch
                        checked={pushNotifications}
                        onCheckedChange={setPushNotifications}
                      />
                    </div>
                  </div>
                  <Separator />
                  <h4 className="font-medium">Thông báo theo sự kiện</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Khi có ticket mới</Label>
                      <Switch
                        checked={notifyOnNewTicket}
                        onCheckedChange={setNotifyOnNewTicket}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Khi trạng thái thay đổi</Label>
                      <Switch
                        checked={notifyOnStatusChange}
                        onCheckedChange={setNotifyOnStatusChange}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Khi được phân công</Label>
                      <Switch
                        checked={notifyOnAssignment}
                        onCheckedChange={setNotifyOnAssignment}
                      />
                    </div>
                  </div>
                  <Separator />
                  <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                    <h4 className="font-medium text-green-800 mb-2">🔔 Gợi ý thông báo</h4>
                    <ul className="text-sm text-green-700 space-y-1">
                      <li>• Bật thông báo push để nhân viên phản hồi nhanh hơn</li>
                      <li>• Email phù hợp cho các thông báo quan trọng, tổng hợp</li>
                      <li>• Thông báo khi được phân công giúp tránh bỏ sót ticket</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Security Settings */}
            <TabsContent value="security">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-red-500" />
                    Cài đặt bảo mật
                  </CardTitle>
                  <CardDescription>Cấu hình các tùy chọn bảo mật hệ thống</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div>
                      <Label className="font-medium">Yêu cầu xác thực 2 bước</Label>
                      <p className="text-sm text-muted-foreground">
                        Bắt buộc người dùng bật 2FA khi đăng nhập
                      </p>
                    </div>
                    <Switch
                      checked={requireTwoFactor}
                      onCheckedChange={setRequireTwoFactor}
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="sessionTimeout">Thời gian phiên đăng nhập (phút)</Label>
                      <Input
                        id="sessionTimeout"
                        type="number"
                        value={sessionTimeout}
                        onChange={(e) => setSessionTimeout(Number(e.target.value))}
                        min={5}
                      />
                      <p className="text-xs text-muted-foreground">
                        Tự động đăng xuất sau thời gian không hoạt động
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maxLoginAttempts">Số lần đăng nhập sai tối đa</Label>
                      <Input
                        id="maxLoginAttempts"
                        type="number"
                        value={maxLoginAttempts}
                        onChange={(e) => setMaxLoginAttempts(Number(e.target.value))}
                        min={3}
                      />
                      <p className="text-xs text-muted-foreground">
                        Khóa tài khoản sau số lần đăng nhập sai
                      </p>
                    </div>
                  </div>
                  <Separator />
                  <div className="p-4 bg-red-50 rounded-lg border border-red-100">
                    <h4 className="font-medium text-red-800 mb-2">🔒 Gợi ý bảo mật</h4>
                    <ul className="text-sm text-red-700 space-y-1">
                      <li>• Bật xác thực 2 bước cho tài khoản admin</li>
                      <li>• Đặt thời gian phiên hợp lý (30-60 phút)</li>
                      <li>• Giới hạn số lần đăng nhập sai để chống brute force</li>
                      <li>• Thường xuyên kiểm tra nhật ký đăng nhập</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Save Button */}
          <div className="mt-6 flex justify-end">
            <Button onClick={handleSave} className="gap-2">
              <Save className="h-4 w-4" />
              Lưu cài đặt
            </Button>
          </div>
        </div>
      </main>
    </div>
  )
}

