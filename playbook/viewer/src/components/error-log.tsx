import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

interface ErrorRecord {
  id: string
  ts: string
  kind: 'error' | 'warning' | 'info'
  summary: string
  remedy?: string
  resolution?: 'unresolved' | 'workaround' | 'permanent' | 'recurrent'
  seen_count?: number
  tags?: string[]
}

function loadErrors(): ErrorRecord[] {
  const filePath = resolve(process.cwd(), '..', 'errors.jsonl')
  if (!existsSync(filePath)) return []

  const lines = readFileSync(filePath, 'utf8').split('\n').filter(Boolean)
  const map = new Map<string, ErrorRecord>()

  for (const line of lines) {
    try {
      const record = JSON.parse(line) as ErrorRecord
      map.set(record.id, record)
    } catch {
      // skip malformed lines
    }
  }

  return Array.from(map.values()).sort((a, b) => a.id.localeCompare(b.id))
}

const kindColors: Record<string, string> = {
  error: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  info: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
}

const groupBorderColors: Record<string, string> = {
  unresolved: 'border-red-400 dark:border-red-600',
  recurrent: 'border-red-300 dark:border-red-700',
  workaround: 'border-yellow-400 dark:border-yellow-600',
  permanent: 'border-green-300 dark:border-green-800',
}

const groupHeadings: Record<string, string> = {
  unresolved: 'Unresolved',
  recurrent: 'Recurrent',
  workaround: 'Workaround',
  permanent: 'Permanently fixed',
}

type GroupKey = 'unresolved' | 'recurrent' | 'workaround' | 'permanent'

function ErrorCard({ error }: { error: ErrorRecord }) {
  const borderColor = groupBorderColors[error.resolution ?? 'unresolved']
  return (
    <div className={`border-l-2 ${borderColor} pl-6`} id={error.id.toLowerCase()}>
      <div className="flex items-start gap-3 mb-1">
        <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium mt-0.5 ${kindColors[error.kind] ?? ''}`}>
          {error.kind}
        </span>
        <p className="font-medium text-sm">{error.summary}</p>
      </div>
      <p className="text-xs text-fd-muted-foreground mb-2 pl-0">
        {error.id} · {error.ts.slice(0, 10)}
        {error.seen_count && error.seen_count > 1 && (
          <span className="ml-2 text-fd-muted-foreground">seen {error.seen_count}×</span>
        )}
      </p>
      {error.remedy && (
        <p className="text-sm text-fd-muted-foreground">
          <span className="font-medium text-fd-foreground">Remedy:</span> {error.remedy}
        </p>
      )}
    </div>
  )
}

export function ErrorLog() {
  const errors = loadErrors()

  if (errors.length === 0) {
    return (
      <p className="text-fd-muted-foreground italic">
        No errors recorded yet. Use <code>/playbook-error</code> to record one.
      </p>
    )
  }

  const groups: Record<GroupKey, ErrorRecord[]> = {
    unresolved: [],
    recurrent: [],
    workaround: [],
    permanent: [],
  }

  for (const error of errors) {
    const key = (error.resolution ?? 'unresolved') as GroupKey
    if (key in groups) {
      groups[key].push(error)
    } else {
      groups.unresolved.push(error)
    }
  }

  const groupOrder: GroupKey[] = ['unresolved', 'recurrent', 'workaround', 'permanent']

  return (
    <div className="space-y-10">
      {groupOrder.map((group) => {
        const items = groups[group]
        if (items.length === 0) return null
        return (
          <div key={group}>
            <h3 className="text-sm font-semibold text-fd-muted-foreground uppercase tracking-wide mb-4">
              {groupHeadings[group]}
            </h3>
            <div className="space-y-6">
              {items.map((error) => (
                <ErrorCard key={error.id} error={error} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
