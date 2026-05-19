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

const statusColors: Record<string, string> = {
  accepted: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  proposed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  deprecated: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  superseded: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
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
              <th className="py-2 pr-4 text-left font-medium text-fd-muted-foreground">ID</th>
              <th className="py-2 pr-4 text-left font-medium text-fd-muted-foreground">Title</th>
              <th className="py-2 pr-4 text-left font-medium text-fd-muted-foreground">Status</th>
              <th className="py-2 text-left font-medium text-fd-muted-foreground">Date</th>
            </tr>
          </thead>
          <tbody>
            {decisions.map((d) => (
              <tr key={d.id} className="border-b border-fd-border/50">
                <td className="py-2 pr-4 font-mono text-xs text-fd-muted-foreground">
                  <a href={`#${d.id.toLowerCase()}`}>{d.id}</a>
                </td>
                <td className="py-2 pr-4">{d.title}</td>
                <td className="py-2 pr-4">
                  <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${statusColors[d.status] ?? ''}`}>
                    {d.status}
                  </span>
                </td>
                <td className="py-2 text-fd-muted-foreground">
                  {d.ts.slice(0, 10)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Full MADR entries */}
      <div className="space-y-10">
        {decisions.map((d) => (
          <div key={d.id} id={d.id.toLowerCase()} className="border-l-2 border-fd-border pl-6">
            <h3 className="text-base font-semibold mb-1">
              {d.id}: {d.title}
            </h3>
            <p className="text-sm text-fd-muted-foreground mb-4">
              <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium mr-2 ${statusColors[d.status] ?? ''}`}>
                {d.status}
              </span>
              {d.ts.slice(0, 10)}
              {d.supersedes && d.supersedes.length > 0 && (
                <span> · supersedes {d.supersedes.join(', ')}</span>
              )}
            </p>
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-medium mb-1">Context</p>
                <p className="text-fd-muted-foreground">{d.context}</p>
              </div>
              <div>
                <p className="font-medium mb-1">Decision</p>
                <p>{d.decision}</p>
              </div>
              {d.consequences && (
                <div>
                  <p className="font-medium mb-1">Consequences</p>
                  <p className="text-fd-muted-foreground">{d.consequences}</p>
                </div>
              )}
              {d.evidence && d.evidence.length > 0 && (
                <div>
                  <p className="font-medium mb-1">Evidence</p>
                  <ul className="list-disc list-inside text-fd-muted-foreground space-y-0.5">
                    {d.evidence.map((e, i) => <li key={i}>{e}</li>)}
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
