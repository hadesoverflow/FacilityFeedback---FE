import { cn } from "@/lib/utils"
import type { TicketStatus } from "@/types/database"

const statusConfig: Record<TicketStatus, { label: string; className: string }> = {
  open: {
    label: "Mở",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  in_progress: {
    label: "Đang xử lý",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
  resolved: {
    label: "Đã giải quyết",
    className: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  },
  closed: {
    label: "Đã đóng",
    className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
  },
}

interface StatusBadgeProps {
  status: TicketStatus
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  )
}
