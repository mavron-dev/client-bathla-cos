import * as React from 'react'
import Link from 'next/link'
import type { IconProps } from '@tabler/icons-react'
import { Button } from '@/components/ui/button'

export interface EmptyStateProps {
  icon?: React.ComponentType<IconProps>
  title: string
  description: string
  action?:
    | { label: string; href: string }
    | { label: string; onClick: () => void }
}

/**
 * Generic empty state. Centered, generous whitespace, helpful tone. Use
 * inside a Card or section when a list / chart has no data yet.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-10 text-center">
      {Icon && (
        <div className="bg-muted/50 text-muted-foreground rounded-full p-3">
          <Icon className="size-5" />
        </div>
      )}
      <div className="space-y-1">
        <h3 className="text-sm font-medium">{title}</h3>
        <p className="text-muted-foreground max-w-sm text-sm">{description}</p>
      </div>
      {action && (
        <Button size="sm" variant="outline" asChild={'href' in action}>
          {'href' in action ? (
            <Link href={action.href}>{action.label}</Link>
          ) : (
            <button type="button" onClick={action.onClick}>
              {action.label}
            </button>
          )}
        </Button>
      )}
    </div>
  )
}
