'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  IconHistory,
  IconClipboardList,
  IconMessage,
  IconRobot,
} from '@tabler/icons-react'
import { formatDistanceToNow, format } from 'date-fns'
import Link from 'next/link'
import type { UserProfilePayload } from '../types'

interface UserProfileActivityProps {
  recentActivity: UserProfilePayload['recentActivity']
  recentSessions: UserProfilePayload['recentSessions']
}

type Item =
  | {
      kind: 'task'
      id: string
      createdAt: Date
      updateType: string
      source: string
      task: { id: string; title: string }
    }
  | {
      kind: 'session'
      id: string
      createdAt: Date
      channel: string
      messageCount: number
      endedAt: Date | null
    }

export function UserProfileActivity({
  recentActivity,
  recentSessions,
}: UserProfileActivityProps) {
  const items: Item[] = [
    ...recentActivity.map(
      (a): Item => ({
        kind: 'task',
        id: a.id,
        createdAt: a.createdAt,
        updateType: a.updateType,
        source: a.source,
        task: a.task,
      }),
    ),
    ...recentSessions.map(
      (s): Item => ({
        kind: 'session',
        id: s.id,
        createdAt: s.startedAt,
        channel: s.channel,
        messageCount: s.messageCount,
        endedAt: s.endedAt,
      }),
    ),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <IconHistory className="h-4 w-4" /> Recent activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm italic text-muted-foreground">
            No activity yet.
          </p>
        ) : (
          <ul className="divide-y">
            {items.slice(0, 20).map((item) =>
              item.kind === 'task' ? (
                <li
                  key={`task-${item.id}`}
                  className="flex items-start gap-3 py-3"
                >
                  <div className="mt-0.5 rounded-md bg-blue-100 p-1.5 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                    <IconClipboardList className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      <span className="font-medium capitalize">
                        {item.updateType.replace('_', ' ')}
                      </span>{' '}
                      task{' '}
                      <Link
                        href={`/admin/tasks`}
                        className="font-medium underline decoration-dotted underline-offset-4 hover:text-foreground"
                      >
                        {item.task.title}
                      </Link>
                    </p>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      {item.source === 'agent' && <IconRobot className="h-3 w-3" />}
                      <span>via {item.source}</span>
                      <span>·</span>
                      <span title={format(new Date(item.createdAt), 'PPpp')}>
                        {formatDistanceToNow(new Date(item.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  </div>
                </li>
              ) : (
                <li
                  key={`session-${item.id}`}
                  className="flex items-start gap-3 py-3"
                >
                  <div className="mt-0.5 rounded-md bg-green-100 p-1.5 text-green-700 dark:bg-green-950 dark:text-green-300">
                    <IconMessage className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      <Badge variant="outline" className="mr-2 capitalize">
                        {item.channel.replace('_', ' ')}
                      </Badge>
                      session — {item.messageCount} messages
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      <span title={format(new Date(item.createdAt), 'PPpp')}>
                        Started{' '}
                        {formatDistanceToNow(new Date(item.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                      {item.endedAt && (
                        <>
                          {' '}
                          · ended{' '}
                          {formatDistanceToNow(new Date(item.endedAt), {
                            addSuffix: true,
                          })}
                        </>
                      )}
                    </p>
                  </div>
                </li>
              ),
            )}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
