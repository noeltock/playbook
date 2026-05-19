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

const groupHeadings: Record<string, string> = {
  unresolved: 'Unresolved',
  recurrent: 'Recurrent',
  workaround: 'Workaround',
  permanent: 'Permanently fixed',
}

// Kind expressed as a symbol + label, no colour
const kindSymbol: Record<ErrorRecord['kind'], string> = {
  error:   '×',
  warning: '!',
  info:    'i',
}

type GroupKey = 'unresolved' | 'recurrent' | 'workaround' | 'permanent'

function ErrorRow({ error }: { error: ErrorRecord }) {
  const symbol = kindSymbol[error.kind]
  const isDimmed = error.resolution === 'permanent'

  return (
    <div
      id={error.id.toLowerCase()}
      className={`py-5 border-t border-fd-border first:border-t-0 ${isDimmed ? 'opacity-50' : ''}`}
    >
      <div className="flex items-start gap-3">
        <span className="font-mono text-sm text-fd-muted-foreground shrink-0 w-4 text-center mt-px" aria-hidden>
          {symbol}
        </span>
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="text-sm font-medium leading-snug">{error.summary}</p>
          <p className="font-mono text-xs text-fd-muted-foreground">
            {error.id}
            <span className="mx-1.5">·</span>
            {error.kind}
            <span className="mx-1.5">·</span>
            {error.ts.slice(0, 10)}
            {error.seen_count && error.seen_count > 1 && (
              <span className="ml-2">seen {error.seen_count}×</span>
            )}
          </p>
          {error.remedy && (
            <p className="text-sm text-fd-muted-foreground">
              <span className="font-mono text-xs uppercase tracking-widest mr-2">Remedy</span>
              {error.remedy}
            </p>
          )}
        </div>
      </div>
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
            <p className="font-mono text-xs text-fd-muted-foreground uppercase tracking-widest mb-1">
              {groupHeadings[group]}
            </p>
            <div>
              {items.map((error) => (
                <ErrorRow key={error.id} error={error} />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
