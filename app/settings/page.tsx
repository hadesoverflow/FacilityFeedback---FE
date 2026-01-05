"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Bell, Mail, Clock, Shield, Save } from "lucide-react"

export default function SettingsPage() {
  const [notificationSettings, setNotificationSettings] = useState({
    emailNewTicket: true,
    emailAssigned: true,
    emailSlaWarning: true,
    emailResolved: false,
    browserNotifications: true,
  })

  const [slaSettings, setSlaSettings] = useState({
    warningThreshold: 80,
    escalationEnabled: true,
    autoCloseAfterDays: 7,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Cài đặt</h1>
        <p className="text-muted-foreground">Quản lý cấu hình hệ thống Helpdesk</p>
      </div>

      <Tabs defaultValue="notifications" className="space-y-6">
        <TabsList>
          <TabsTrigger value="notifications">
            <Bell className="mr-2 h-4 w-4" />
            Thông báo
          </TabsTrigger>
          <TabsTrigger value="sla">
            <Clock className="mr-2 h-4 w-4" />
            SLA
          </TabsTrigger>
          <TabsTrigger value="email">
            <Mail className="mr-2 h-4 w-4" />
            Email
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="mr-2 h-4 w-4" />
            Bảo mật
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Cài đặt thông báo</CardTitle>
              <CardDescription>Cấu hình cách bạn nhận thông báo từ hệ thống</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-sm font-medium">Thông báo Email</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="email-new">Ticket mới được tạo</Label>
                    <Switch
                      id="email-new"
                      checked={notificationSettings.emailNewTicket}
                      onCheckedChange={(checked) =>
                        setNotificationSettings({
                          ...notificationSettings,
                          emailNewTicket: checked,
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="email-assigned">Ticket được gán cho bạn</Label>
                    <Switch
                      id="email-assigned"
                      checked={notificationSettings.emailAssigned}
                      onCheckedChange={(checked) =>
                        setNotificationSettings({
                          ...notificationSettings,
                          emailAssigned: checked,
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="email-sla">Cảnh báo SLA sắp hết hạn</Label>
                    <Switch
                      id="email-sla"
                      checked={notificationSettings.emailSlaWarning}
                      onCheckedChange={(checked) =>
                        setNotificationSettings({
                          ...notificationSettings,
                          emailSlaWarning: checked,
                        })
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="email-resolved">Ticket đã được giải quyết</Label>
                    <Switch
                      id="email-resolved"
                      checked={notificationSettings.emailResolved}
                      onCheckedChange={(checked) =>
                        setNotificationSettings({
                          ...notificationSettings,
                          emailResolved: checked,
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-medium">Thông báo trình duyệt</h4>
                <div className="flex items-center justify-between">
                  <Label htmlFor="browser-notif">Bật thông báo trình duyệt</Label>
                  <Switch
                    id="browser-notif"
                    checked={notificationSettings.browserNotifications}
                    onCheckedChange={(checked) =>
                      setNotificationSettings({
                        ...notificationSettings,
                        browserNotifications: checked,
                      })
                    }
                  />
                </div>
              </div>

              <Button>
                <Save className="mr-2 h-4 w-4" />
                Lưu thay đổi
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sla">
          <Card>
            <CardHeader>
              <CardTitle>Cài đặt SLA</CardTitle>
              <CardDescription>Cấu hình quy tắc và ngưỡng SLA cho hệ thống</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Ngưỡng cảnh báo SLA (%)</Label>
                  <Input
                    type="number"
                    value={slaSettings.warningThreshold}
                    onChange={(e) =>
                      setSlaSettings({
                        ...slaSettings,
                        warningThreshold: Number.parseInt(e.target.value) || 0,
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">Cảnh báo khi đạt % thời gian SLA</p>
                </div>
                <div className="space-y-2">
                  <Label>Tự động đóng sau (ngày)</Label>
                  <Input
                    type="number"
                    value={slaSettings.autoCloseAfterDays}
                    onChange={(e) =>
                      setSlaSettings({
                        ...slaSettings,
                        autoCloseAfterDays: Number.parseInt(e.target.value) || 0,
                      })
                    }
                  />
                  <p className="text-xs text-muted-foreground">Tự động đóng ticket đã resolved sau số ngày</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label>Bật tính năng escalation</Label>
                  <p className="text-xs text-muted-foreground">Tự động escalate khi vi phạm SLA</p>
                </div>
                <Switch
                  checked={slaSettings.escalationEnabled}
                  onCheckedChange={(checked) =>
                    setSlaSettings({
                      ...slaSettings,
                      escalationEnabled: checked,
                    })
                  }
                />
              </div>

              <Button>
                <Save className="mr-2 h-4 w-4" />
                Lưu thay đổi
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email">
          <Card>
            <CardHeader>
              <CardTitle>Cấu hình Email</CardTitle>
              <CardDescription>Thiết lập template và cấu hình gửi email</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Email hệ thống</Label>
                  <Input type="email" placeholder="helpdesk@example.com" defaultValue="helpdesk@edu.vn" />
                </div>
                <div className="space-y-2">
                  <Label>Tên hiển thị</Label>
                  <Input placeholder="Helpdesk Support" defaultValue="Hệ thống Helpdesk" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Chữ ký email</Label>
                <Textarea
                  rows={4}
                  placeholder="Chữ ký sẽ được thêm vào cuối email..."
                  defaultValue="Trân trọng,&#10;Hệ thống Helpdesk&#10;Phòng Quản trị CSVC"
                />
              </div>

              <Button>
                <Save className="mr-2 h-4 w-4" />
                Lưu thay đổi
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Cài đặt bảo mật</CardTitle>
              <CardDescription>Quản lý các tùy chọn bảo mật hệ thống</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Xác thực hai yếu tố (2FA)</Label>
                    <p className="text-xs text-muted-foreground">Yêu cầu 2FA cho tất cả admin</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Khóa tài khoản sau đăng nhập sai</Label>
                    <p className="text-xs text-muted-foreground">Khóa sau 5 lần đăng nhập thất bại</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Ghi log hoạt động</Label>
                    <p className="text-xs text-muted-foreground">Lưu lại tất cả thao tác quan trọng</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Thời gian hết hạn session (phút)</Label>
                <Input type="number" defaultValue={60} className="w-32" />
              </div>

              <Button>
                <Save className="mr-2 h-4 w-4" />
                Lưu thay đổi
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
