import { Navigate, Route, Routes } from "react-router-dom"

import HomePage from "@/app/page"
import LoginPage from "@/app/login/page"
import SettingsPage from "@/app/settings/page"
import TicketsPage from "@/app/tickets/page"
import TicketNewPage from "@/app/tickets/new/page"
import TicketDetailPage from "@/app/tickets/[id]/page"
import DepartmentsPage from "@/app/departments/page"
import CategoriesPage from "@/app/categories/page"
import ReportsPage from "@/app/reports/page"
import UsersPage from "@/app/users/page"

import StudentHomePage from "@/app/student/page"
import StudentTicketsPage from "@/app/student/tickets/page"
import StaffHomePage from "@/app/staff/page"
import StaffTasksPage from "@/app/staff/tasks/page"
import StaffCalendarPage from "@/app/staff/calendar/page"
import StaffMessagesPage from "@/app/staff/messages/page"
import StaffStatsPage from "@/app/staff/stats/page"
import AdminDashboard from "@/app/admin/page"
import AdminTicketsPage from "@/app/admin/tickets/page"
import AdminCategoriesPage from "@/app/admin/categories/page"
import AdminDepartmentsPage from "@/app/admin/departments/page"
import AdminUsersPage from "@/app/admin/users/page"
import AdminReportsPage from "@/app/admin/reports/page"
import AdminSchedulePage from "@/app/admin/schedule/page"
import AdminMessagesPage from "@/app/admin/messages/page"
import AdminSettingsPage from "@/app/admin/settings/page"
import AdminRoomsPage from "@/app/admin/rooms/page"
import { AdminRouteGuard } from "@/components/AdminRouteGuard"

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />

      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/tickets" element={<TicketsPage />} />
      <Route path="/tickets/new" element={<TicketNewPage />} />
      <Route path="/tickets/:id" element={<TicketDetailPage />} />
      <Route path="/departments" element={<DepartmentsPage />} />
      <Route path="/categories" element={<CategoriesPage />} />
      <Route path="/reports" element={<ReportsPage />} />
      <Route path="/users" element={<UsersPage />} />

      <Route path="/student" element={<StudentHomePage />} />
      <Route path="/student/tickets" element={<StudentTicketsPage />} />
      <Route path="/staff" element={<StaffHomePage />} />
      <Route path="/staff/tasks" element={<StaffTasksPage />} />
      <Route path="/staff/calendar" element={<StaffCalendarPage />} />
      <Route path="/staff/messages" element={<StaffMessagesPage />} />
      <Route path="/staff/stats" element={<StaffStatsPage />} />

      <Route
        path="/admin"
        element={
          <AdminRouteGuard>
            <AdminDashboard />
          </AdminRouteGuard>
        }
      />
      <Route
        path="/admin/tickets"
        element={
          <AdminRouteGuard>
            <AdminTicketsPage />
          </AdminRouteGuard>
        }
      />
      <Route
        path="/admin/categories"
        element={
          <AdminRouteGuard>
            <AdminCategoriesPage />
          </AdminRouteGuard>
        }
      />
      <Route
        path="/admin/departments"
        element={
          <AdminRouteGuard>
            <AdminDepartmentsPage />
          </AdminRouteGuard>
        }
      />
      <Route
        path="/admin/users"
        element={
          <AdminRouteGuard>
            <AdminUsersPage />
          </AdminRouteGuard>
        }
      />
      <Route
        path="/admin/reports"
        element={
          <AdminRouteGuard>
            <AdminReportsPage />
          </AdminRouteGuard>
        }
      />
      <Route
        path="/admin/schedule"
        element={
          <AdminRouteGuard>
            <AdminSchedulePage />
          </AdminRouteGuard>
        }
      />
      <Route
        path="/admin/messages"
        element={
          <AdminRouteGuard>
            <AdminMessagesPage />
          </AdminRouteGuard>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <AdminRouteGuard>
            <AdminSettingsPage />
          </AdminRouteGuard>
        }
      />
      <Route
        path="/admin/rooms"
        element={
          <AdminRouteGuard>
            <AdminRoomsPage />
          </AdminRouteGuard>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
