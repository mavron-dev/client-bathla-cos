import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { cn } from '@/lib/utils'

/**
 * Renders the LLM / call / TTS / ASR breakdown from `metadata.charging`.
 * Loose shape — the agent layer evolves and we'd rather show what's there
 * than throw on unknown fields.
 */
type ModelUsage = {
  input?: { price?: number; tokens?: number }
  output_total?: { price?: number; tokens?: number }
  input_cache_read?: { price?: number; tokens?: number }
  input_cache_write?: { price?: number; tokens?: number }
}

type ChargingShape = {
  llm_charge?: number
  call_charge?: number
  llm_usage?: {
    irreversible_generation?: { model_usage?: Record<string, ModelUsage> }
    initiated_generation?: { model_usage?: Record<string, ModelUsage> }
  }
  asr_usage?: {
    asr_model?: string
    total_audio_input_seconds?: number
    total_transcription_calls?: number
  }
  tts_usage?: {
    primary_tts_model?: string
    total_characters?: number
    total_audio_output_seconds?: number
  }
}

export function CostBreakdownCard({
  chargingRaw,
  costCredits,
}: {
  chargingRaw: unknown
  costCredits: number | null
}) {
  const charging = (chargingRaw ?? null) as ChargingShape | null

  // Combine "irreversible" + "initiated" model usage. Most conversations
  // only carry one — but if both exist we sum the prices for the USD total
  // and keep the per-model rows separate.
  const llmModels = mergeModelUsage(charging)
  const totalUsd = computeTotalUsd(llmModels)
  const cacheStats = computeCacheStats(llmModels)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Cost breakdown</CardTitle>
        <CardDescription>
          Total{' '}
          <span className="text-foreground tabular-nums font-medium">
            {costCredits != null
              ? `${costCredits.toLocaleString('en-IN')} credits`
              : '—'}
          </span>
          {totalUsd > 0 && (
            <>
              {' '}
              ·{' '}
              <span className="text-foreground tabular-nums">
                {formatUsd(totalUsd)}
              </span>{' '}
              spent on LLM
            </>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {/* LLM models */}
        {llmModels.length > 0 && (
          <div className="space-y-2">
            <SectionLabel>LLM</SectionLabel>
            {llmModels.map((m) => (
              <ModelRow key={m.name} model={m} />
            ))}
          </div>
        )}

        {/* Call charge */}
        {(charging?.call_charge ?? 0) > 0 && (
          <Row
            label="Call charge"
            value={`${charging?.call_charge?.toLocaleString('en-IN')} credits`}
          />
        )}

        {/* TTS */}
        {charging?.tts_usage && (
          <div className="space-y-1">
            <SectionLabel>TTS</SectionLabel>
            <Row
              label={charging.tts_usage.primary_tts_model || 'TTS'}
              value={`${charging.tts_usage.total_characters ?? 0} chars · ${charging.tts_usage.total_audio_output_seconds ?? 0}s`}
            />
          </div>
        )}

        {/* ASR */}
        {charging?.asr_usage && (
          <div className="space-y-1">
            <SectionLabel>ASR</SectionLabel>
            <Row
              label={charging.asr_usage.asr_model || 'ASR'}
              value={`${charging.asr_usage.total_audio_input_seconds ?? 0}s · ${charging.asr_usage.total_transcription_calls ?? 0} calls`}
            />
          </div>
        )}

        {/* Cache hit ratio */}
        {cacheStats.totalInput > 0 && (
          <div className="space-y-1.5">
            <SectionLabel>Cache hit ratio</SectionLabel>
            <CacheBar hitRate={cacheStats.hitRate} />
            <div className="text-muted-foreground text-xs">
              {Math.round(cacheStats.hitRate * 100)}% of input tokens were
              cache hits ·{' '}
              {cacheStats.cacheRead.toLocaleString('en-IN')} read /{' '}
              {cacheStats.totalInput.toLocaleString('en-IN')} total
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wider">
      {children}
    </div>
  )
}

function Row({
  label,
  value,
  indent,
}: {
  label: string
  value: string
  indent?: boolean
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-2 text-sm',
        indent && 'pl-4',
      )}
    >
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  )
}

interface MergedModel {
  name: string
  input: { tokens: number; price: number }
  output: { tokens: number; price: number }
  cacheRead: { tokens: number; price: number }
  cacheWrite: { tokens: number; price: number }
  totalUsd: number
}

function ModelRow({ model }: { model: MergedModel }) {
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between gap-2 text-sm font-medium">
        <span className="font-mono">{model.name}</span>
        <span className="tabular-nums">{formatUsd(model.totalUsd)}</span>
      </div>
      {model.input.tokens > 0 && (
        <Row
          indent
          label={`Input · ${model.input.tokens.toLocaleString('en-IN')} tok`}
          value={formatUsd(model.input.price)}
        />
      )}
      {model.output.tokens > 0 && (
        <Row
          indent
          label={`Output · ${model.output.tokens.toLocaleString('en-IN')} tok`}
          value={formatUsd(model.output.price)}
        />
      )}
      {model.cacheRead.tokens > 0 && (
        <Row
          indent
          label={`Cache read · ${model.cacheRead.tokens.toLocaleString('en-IN')} tok`}
          value={formatUsd(model.cacheRead.price)}
        />
      )}
      {model.cacheWrite.tokens > 0 && (
        <Row
          indent
          label={`Cache write · ${model.cacheWrite.tokens.toLocaleString('en-IN')} tok`}
          value={formatUsd(model.cacheWrite.price)}
        />
      )}
    </div>
  )
}

function CacheBar({ hitRate }: { hitRate: number }) {
  const pct = Math.max(0, Math.min(1, hitRate)) * 100
  return (
    <div className="bg-muted h-2 w-full overflow-hidden rounded-full">
      <div
        className="bg-emerald-500 h-full rounded-full transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}

function mergeModelUsage(charging: ChargingShape | null): MergedModel[] {
  if (!charging) return []
  const sources = [
    charging.llm_usage?.irreversible_generation?.model_usage,
    charging.llm_usage?.initiated_generation?.model_usage,
  ]
  const map = new Map<string, MergedModel>()
  for (const source of sources) {
    if (!source) continue
    for (const [name, usage] of Object.entries(source)) {
      const existing =
        map.get(name) ??
        ({
          name,
          input: { tokens: 0, price: 0 },
          output: { tokens: 0, price: 0 },
          cacheRead: { tokens: 0, price: 0 },
          cacheWrite: { tokens: 0, price: 0 },
          totalUsd: 0,
        } as MergedModel)
      add(existing.input, usage.input)
      add(existing.output, usage.output_total)
      add(existing.cacheRead, usage.input_cache_read)
      add(existing.cacheWrite, usage.input_cache_write)
      existing.totalUsd =
        existing.input.price +
        existing.output.price +
        existing.cacheRead.price +
        existing.cacheWrite.price
      map.set(name, existing)
    }
  }
  return Array.from(map.values()).sort((a, b) => b.totalUsd - a.totalUsd)
}

function add(
  target: { tokens: number; price: number },
  src: { tokens?: number; price?: number } | undefined,
) {
  if (!src) return
  target.tokens += Number(src.tokens ?? 0)
  target.price += Number(src.price ?? 0)
}

function computeTotalUsd(models: MergedModel[]): number {
  return models.reduce((s, m) => s + m.totalUsd, 0)
}

function computeCacheStats(models: MergedModel[]) {
  const cacheRead = models.reduce((s, m) => s + m.cacheRead.tokens, 0)
  const inputTokens = models.reduce((s, m) => s + m.input.tokens, 0)
  const totalInput = cacheRead + inputTokens
  const hitRate = totalInput > 0 ? cacheRead / totalInput : 0
  return { cacheRead, inputTokens, totalInput, hitRate }
}

function formatUsd(usd: number): string {
  if (usd === 0) return '$0'
  if (usd < 0.001) return '<$0.001'
  if (usd < 0.01) return `$${usd.toFixed(4)}`
  if (usd < 1) return `$${usd.toFixed(3)}`
  return `$${usd.toFixed(2)}`
}
