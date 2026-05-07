import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CopyId } from './copy-id'

export function MetadataCard({
  conversationId,
  agentId,
  mainLanguage,
  textOnly,
  whatsappPhoneNumberId,
  channel,
  timezone,
}: {
  conversationId: string | null
  agentId: string | null
  mainLanguage: string | null
  textOnly: boolean | null
  whatsappPhoneNumberId: string | null
  channel: string
  timezone: string | null
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Metadata</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <Row
          label="Conversation ID"
          render={
            conversationId ? (
              <CopyId value={conversationId} display={conversationId} />
            ) : (
              <Muted>—</Muted>
            )
          }
        />
        <Row
          label="Agent ID"
          render={
            agentId ? (
              <CopyId value={agentId} display={agentId} />
            ) : (
              <Muted>—</Muted>
            )
          }
        />
        <Row
          label="Channel"
          render={
            <Badge variant="outline" className="font-normal">
              {channel}
            </Badge>
          }
        />
        <Row
          label="Language"
          render={
            mainLanguage ? (
              <Badge variant="outline" className="font-normal">
                {mainLanguage}
              </Badge>
            ) : (
              <Muted>auto-detect</Muted>
            )
          }
        />
        <Row
          label="Modality"
          render={
            <Badge variant="outline" className="font-normal">
              {textOnly === true
                ? 'Text only'
                : textOnly === false
                  ? 'Voice + text'
                  : 'Unknown'}
            </Badge>
          }
        />
        {whatsappPhoneNumberId && (
          <Row
            label="WhatsApp number"
            render={
              <CopyId
                value={whatsappPhoneNumberId}
                display={whatsappPhoneNumberId}
              />
            }
          />
        )}
        {timezone && (
          <Row
            label="Timezone"
            render={
              <Badge variant="outline" className="font-mono font-normal">
                {timezone}
              </Badge>
            }
          />
        )}
      </CardContent>
    </Card>
  )
}

function Row({
  label,
  render,
}: {
  label: string
  render: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground text-xs">{label}</span>
      <div className="min-w-0 max-w-[60%] truncate text-right">{render}</div>
    </div>
  )
}

function Muted({ children }: { children: React.ReactNode }) {
  return <span className="text-muted-foreground text-xs italic">{children}</span>
}
