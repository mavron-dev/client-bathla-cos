import { JobType } from '@bathla-cos/database'
import { Badge } from '@/components/ui/badge'
import { JOB_TYPE_LABEL } from '@/features/jobs/lib/job-outcome-schemas'

export function JobTypeChip({ type }: { type: JobType }) {
  return (
    <Badge variant="outline" className="font-mono text-[10px] font-normal">
      {JOB_TYPE_LABEL[type] ?? type}
    </Badge>
  )
}
