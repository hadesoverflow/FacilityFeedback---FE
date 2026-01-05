// Database Schema Types - Facility Feedback & Helpdesk System

export type UserRole = "student" | "staff" | "department_admin"

export type TicketStatus = "open" | "in_progress" | "resolved" | "closed"

export type TicketPriority = "low" | "medium" | "high" | "critical"

export interface User {
  id: string
  email: string
  full_name: string
  role: UserRole
  department_id?: string
  created_at: string
  updated_at: string
}

export interface Department {
  id: string
  name: string
  code: string
  description?: string
  manager_id?: string
  created_at: string
  updated_at: string
}

export interface Room {
  id: string
  department_id: string
  name: string
  code: string
  building: string
  floor: string
  created_at: string
  updated_at: string
}

export interface FeedbackCategory {
  id: string
  name: string
  code: string
  description?: string
  department_id: string // Department responsible for this category
  sla_response_hours: number // SLA: time to first response
  sla_resolution_hours: number // SLA: time to resolution
  priority_default: TicketPriority
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Ticket {
  id: string
  ticket_number: string // e.g., TKT-2024-0001
  title: string
  description: string
  category_id: string
  category?: FeedbackCategory
  department_id: string
  department?: Department
  status: TicketStatus
  priority: TicketPriority
  reporter_id: string
  reporter?: User
  assignee_id?: string
  assignee?: User
  location?: string // Room/building location
  attachment_urls?: string[]
  sla_response_due: string
  sla_resolution_due: string
  first_response_at?: string
  resolved_at?: string
  closed_at?: string
  is_sla_response_breached: boolean
  is_sla_resolution_breached: boolean
  created_at: string
  updated_at: string
}

export interface TicketComment {
  id: string
  ticket_id: string
  user_id: string
  user?: User
  content: string
  is_internal: boolean // Internal notes only visible to staff
  created_at: string
}

export interface TicketHistory {
  id: string
  ticket_id: string
  user_id: string
  user?: User
  action: string // e.g., 'status_changed', 'assigned', 'priority_changed'
  old_value?: string
  new_value?: string
  created_at: string
}

// SLA Report Types
export interface SLAReport {
  total_tickets: number
  resolved_within_sla: number
  sla_breach_count: number
  average_response_time_hours: number
  average_resolution_time_hours: number
  by_category: CategorySLAStats[]
  by_department: DepartmentSLAStats[]
}

export interface CategorySLAStats {
  category_id: string
  category_name: string
  total: number
  within_sla: number
  breached: number
  compliance_rate: number
}

export interface DepartmentSLAStats {
  department_id: string
  department_name: string
  total: number
  within_sla: number
  breached: number
  compliance_rate: number
}

export interface Notification {
  id: string
  user_id: string
  ticket_id?: string
  title: string
  message: string
  type: "info" | "success" | "warning" | "error"
  is_read: boolean
  created_at: string
  read_at?: string
  ticket?: Ticket
}
