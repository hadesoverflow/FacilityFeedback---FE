import { cn } from "@/lib/utils"
import type { TicketPriority } from "@/types/database"

const priorityConfig: Record<TicketPriority, { label: string; className: string }> = {
  low: {
    label: "Thấp",
    className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400",
  },
  medium: {
    label: "Trung bình",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  high: {
    label: "Cao",
    className: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  },
  critical: {
    label: "Khẩn cấp",
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
}

interface PriorityBadgeProps {
  priority: TicketPriority
  className?: string
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const config = priorityConfig[priority]

  if (!config) {
    console.warn(`Invalid priority: ${priority}. Using default 'medium'.`)
    const defaultConfig = priorityConfig.medium
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
          defaultConfig.className,
          className,
        )}
      >
        {defaultConfig.label}
      </span>
    )
  }

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
