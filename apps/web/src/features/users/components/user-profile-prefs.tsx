'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  IconLanguage,
  IconClock,
  IconVolume,
  IconVolumeOff,
} from '@tabler/icons-react'
import { LANGUAGE_LABELS, type UserProfilePayload } from '../types'

interface UserProfilePrefsProps {
  user: UserProfilePayload['user']
}

export function UserProfilePrefs({ user }: UserProfilePrefsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Preferences</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-3">
            <IconLanguage className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Language</p>
              <p className="text-sm font-medium">
                {LANGUAGE_LABELS[user.languagePref]}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <IconClock className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Timezone</p>
              <p className="text-sm font-medium">{user.timezone}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {user.voiceReplyEnabled ? (
              <IconVolume className="h-5 w-5 text-muted-foreground" />
            ) : (
              <IconVolumeOff className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <p className="text-xs text-muted-foreground">Voice replies</p>
              <Badge variant={user.voiceReplyEnabled ? 'default' : 'secondary'}>
                {user.voiceReplyEnabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
