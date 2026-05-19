import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

interface Decision {
  id: string
  ts: string
  title: string
  status: 'proposed' | 'accepted' | 'rejected' | 'deprecated' | 'superseded'
  context: string
  decision: string
  consequences: string
  supersedes?: string[]
  evidence?: string[]
  tags?: string[]
}

function loadDecisions(): Decision[] {
  const filePath = resolve(process.cwd(), '..', 'decisions.jsonl')
  if (!existsSync(filePath)) return []

  const lines = readFileSync(filePath, 'utf8').split('\n').filter(Boolean)
  const map = new Map<string, Decision>()

  for (const line of lines) {
    try {
      const record = JSON.parse(line) as Decision
      map.set(record.id, record)
    } catch {
      // skip malformed lines
    }
  }

  return Array.from(map.values()).sort((a, b) => a.id.localeCompare(b.id))
}

// Status expressed through typography, not colour
function StatusLabel({ status }: { status: Decision['status'] }) {
  const styles: Record<Decision['status'], string> = {
    accepted:   'text-fd-foreground',
    proposed:   'text-fd-muted-foreground',
    rejected:   'text-fd-muted-foreground line-through',
    deprecated: 'text-fd-muted-foreground italic',
    superseded: 'text-fd-muted-foreground italic',
  }
  return (
    <span className={`text-xs font-mono ${styles[status]}`}>
      {status}
    </span>
  )
}

export function DecisionLog() {
  const decisions = loadDecisions()

  if (decisions.length === 0) {
    return (
      <p className="text-fd-muted-foreground italic">
        No decisions recorded yet. Use <code>/playbook-decide</code> to record the first one.
      </p>
    )
  }

  return (
    <div className="space-y-8">
      {/* Summary table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-fd-border">
              <th className="py-2 pr-6 text-left font-mono text-xs text-fd-muted-foreground uppercase tracking-widest">ID</th>
              <th className="py-2 pr-6 text-left font-mono text-xs text-fd-muted-foreground uppercase tracking-widest">Title</th>
              <th className="py-2 pr-6 text-left font-mono text-xs text-fd-muted-foreground uppercase tracking-widest">Status</th>
              <th className="py-2 text-left font-mono text-xs text-fd-muted-foreground uppercase tracking-widest">Date</th>
            </tr>
          </thead>
          <tbody>
            {decisions.map((d) => (
              <tr key={d.id} className="border-b border-fd-border/50">
                <td className="py-2 pr-6">
                  <a href={`#${d.id.toLowerCase()}`} className="font-mono text-xs text-fd-muted-foreground hover:text-fd-foreground">
                    {d.id}
                  </a>
                </td>
                <td className="py-2 pr-6 text-sm">{d.title}</td>
                <td className="py-2 pr-6">
                  <StatusLabel status={d.status} />
                </td>
                <td className="py-2 font-mono text-xs text-fd-muted-foreground">
                  {d.ts.slice(0, 10)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Full MADR entries — separated by horizontal rule, no side-stripe */}
      <div className="space-y-0">
        {decisions.map((d, idx) => (
          <div
            key={d.id}
            id={d.id.toLowerCase()}
            className={`py-8 ${idx > 0 ? 'border-t border-fd-border' : ''}`}
          >
            <div className="flex items-baseline gap-3 mb-4">
              <span className="font-mono text-xs text-fd-muted-foreground shrink-0">{d.id}</span>
              <h3 className="text-base font-semibold leading-snug">{d.title}</h3>
            </div>
            <div className="flex items-center gap-4 mb-5 text-xs font-mono text-fd-muted-foreground">
              <StatusLabel status={d.status} />
              <span>{d.ts.slice(0, 10)}</span>
              {d.supersedes && d.supersedes.length > 0 && (
                <span>supersedes {d.supersedes.join(', ')}</span>
              )}
            </div>
            <div className="space-y-4 text-sm">
              <div>
                <p className="font-mono text-xs text-fd-muted-foreground uppercase tracking-widest mb-1">Context</p>
                <p className="text-fd-muted-foreground leading-relaxed">{d.context}</p>
              </div>
              <div>
                <p className="font-mono text-xs text-fd-muted-foreground uppercase tracking-widest mb-1">Decision</p>
                <p className="leading-relaxed">{d.decision}</p>
              </div>
              {d.consequences && (
                <div>
                  <p className="font-mono text-xs text-fd-muted-foreground uppercase tracking-widest mb-1">Consequences</p>
                  <p className="text-fd-muted-foreground leading-relaxed">{d.consequences}</p>
                </div>
              )}
              {d.evidence && d.evidence.length > 0 && (
                <div>
                  <p className="font-mono text-xs text-fd-muted-foreground uppercase tracking-widest mb-1">Evidence</p>
                  <ul className="space-y-0.5 text-fd-muted-foreground">
                    {d.evidence.map((e, i) => (
                      <li key={i} className="font-mono text-xs">{e}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
