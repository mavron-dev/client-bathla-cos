'use client'

import * as React from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import {
  reminderSlotNames,
  type ReminderSlotName,
  type ReminderSchedule,
} from '@/lib/dashboard/users'
import { cn } from '@/lib/utils'

const SLOT_LABEL: Record<ReminderSlotName, string> = {
  morning_brief: 'Morning brief',
  midday_check: 'Midday check',
  afternoon_pulse: 'Afternoon pulse',
  evening_wrap: 'Evening wrap',
}

const DEFAULT_HOUR: Record<ReminderSlotName, number> = {
  morning_brief: 9,
  midday_check: 12,
  afternoon_pulse: 16,
  evening_wrap: 19,
}

const DEFAULT_TEMPLATE: Record<ReminderSlotName, string> = {
  morning_brief: 'morning_brief_v1',
  midday_check: 'midday_check_v1',
  afternoon_pulse: 'afternoon_pulse_v1',
  evening_wrap: 'evening_wrap_v1',
}

interface SlotState {
  isEnabled: boolean
  hourLocal: number
  templateName: string
}

export function UserRemindersTab({
  userId,
  initial,
}: {
  userId: string
  initial: ReminderSchedule[]
}) {
  // Build the editable state — every slot has a row, with a default if
  // there's no existing schedule.
  const initialMap = new Map(initial.map((s) => [s.slotName, s]))
  const [slots, setSlots] = React.useState<Record<ReminderSlotName, SlotState>>(
    () => {
      const out = {} as Record<ReminderSlotName, SlotState>
      for (const name of reminderSlotNames) {
        const existing = initialMap.get(name)
        out[name] = existing
          ? {
              isEnabled: existing.isEnabled,
              hourLocal: existing.hourLocal,
              templateName: existing.templateName,
            }
          : {
              isEnabled: false,
              hourLocal: DEFAULT_HOUR[name],
              templateName: DEFAULT_TEMPLATE[name],
            }
      }
      return out
    },
  )

  const [pending, setPending] = React.useState(false)
  const [dirty, setDirty] = React.useState(false)

  const updateSlot = (name: ReminderSlotName, patch: Partial<SlotState>) => {
    setSlots((prev) => ({ ...prev, [name]: { ...prev[name], ...patch } }))
    setDirty(true)
  }

  const onSave = async () => {
    setPending(true)
    try {
      const payload = {
        schedules: reminderSlotNames.map((name) => ({
          slotName: name,
          ...slots[name],
        })),
      }
      const res = await fetch(
        `/api/dashboard/users/${userId}/reminder-schedules`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(
          (err as { error?: string })?.error ?? 'Failed to save',
        )
      }
      toast.success('Reminder schedule saved')
      setDirty(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setPending(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Reminder schedule</CardTitle>
        <CardDescription>
          Per-slot WhatsApp reminders for this user. Hours are local
          (user&apos;s timezone). Disable a slot to skip it entirely.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          {reminderSlotNames.map((name) => {
            const state = slots[name]
            return (
              <div
                key={name}
                className={cn(
                  'border-border/60 bg-card grid grid-cols-1 items-center gap-3 rounded-lg border p-4 transition-opacity sm:grid-cols-[180px_1fr_1fr_auto]',
                  !state.isEnabled && 'opacity-60',
                )}
              >
                <div className="font-medium text-sm">
                  {SLOT_LABEL[name]}
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor={`${name}-hour`}
                    className="text-muted-foreground text-[10px] uppercase tracking-wide"
                  >
                    Hour (local)
                  </Label>
                  <Input
                    id={`${name}-hour`}
                    type="number"
                    min={0}
                    max={23}
                    value={state.hourLocal}
                    disabled={!state.isEnabled}
                    onChange={(e) =>
                      updateSlot(name, {
                        hourLocal: Math.max(
                          0,
                          Math.min(23, Number(e.target.value) || 0),
                        ),
                      })
                    }
                    className="tabular-nums w-24"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label
                    htmlFor={`${name}-template`}
                    className="text-muted-foreground text-[10px] uppercase tracking-wide"
                  >
                    Template
                  </Label>
                  <Input
                    id={`${name}-template`}
                    value={state.templateName}
                    disabled={!state.isEnabled}
                    onChange={(e) =>
                      updateSlot(name, { templateName: e.target.value })
                    }
                    className="font-mono text-xs"
                  />
                </div>

                <div className="flex items-center gap-2 sm:justify-end">
                  <Label
                    htmlFor={`${name}-enabled`}
                    className="text-muted-foreground text-xs"
                  >
                    {state.isEnabled ? 'Enabled' : 'Disabled'}
                  </Label>
                  <Switch
                    id={`${name}-enabled`}
                    checked={state.isEnabled}
                    onCheckedChange={(v) =>
                      updateSlot(name, { isEnabled: v })
                    }
                  />
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex items-center justify-end gap-2">
          {dirty && (
            <span className="text-muted-foreground text-xs">
              Unsaved changes
            </span>
          )}
          <Button onClick={onSave} disabled={pending || !dirty}>
            {pending ? 'Saving…' : 'Save changes'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
