import { Card, CardContent } from '@/components/ui/card'

export function SummaryBodyCard({ summaryText }: { summaryText: string }) {
  return (
    <Card>
      <CardContent className="px-5 py-4">
        {/* `lang='hi'` lets the browser pick the right Devanagari fallback
            font when the OS doesn't ship one in the default stack. */}
        <p
          lang="hi"
          className="text-sm leading-relaxed whitespace-pre-wrap"
        >
          {summaryText}
        </p>
      </CardContent>
    </Card>
  )
}
