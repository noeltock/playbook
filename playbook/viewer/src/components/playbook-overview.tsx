import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

interface PlaybookData {
  schema_version?: string
  id?: string
  north_star?: string
  owners?: Array<{ name?: string; role?: string }>
  styleguide_present?: boolean
  design_present?: boolean
  provenance?: {
    git_commit?: string
    updated_at?: string
  }
}

const NORTH_STAR_PLACEHOLDER = 'Replace with one sentence describing the outcome your project optimises for.'

function parseSimpleYaml(text: string): PlaybookData {
  const data: PlaybookData = {}
  // Strip YAML front-matter delimiters
  const content = text.replace(/^---\n/, '').replace(/\n---\s*$/, '')
  const lines = content.split('\n')

  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    const match = line.match(/^(\w[\w_]*):\s*(.*)$/)
    if (!match) { i++; continue }

    const key = match[1]
    const val = match[2].trim()

    if (key === 'owners') {
      const owners: Array<{ name?: string; role?: string }> = []
      i++
      while (i < lines.length && lines[i].match(/^\s+-/)) {
        const ownerBlock: { name?: string; role?: string } = {}
        // grab name/role lines under this entry
        i++
        while (i < lines.length && lines[i].match(/^\s{4,}/)) {
          const ownerLine = lines[i].trim()
          const ownerMatch = ownerLine.match(/^(\w+):\s*"?(.*?)"?\s*$/)
          if (ownerMatch) {
            ownerBlock[ownerMatch[1] as 'name' | 'role'] = ownerMatch[2]
          }
          i++
        }
        owners.push(ownerBlock)
      }
      data.owners = owners
      continue
    }

    if (key === 'provenance') {
      const prov: { git_commit?: string; updated_at?: string } = {}
      i++
      while (i < lines.length && lines[i].match(/^\s+/)) {
        const provLine = lines[i].trim()
        const provMatch = provLine.match(/^(\w+):\s*"?(.*?)"?\s*$/)
        if (provMatch) {
          prov[provMatch[1] as 'git_commit' | 'updated_at'] = provMatch[2]
        }
        i++
      }
      data.provenance = prov
      continue
    }

    // Scalar values
    const cleaned = val.replace(/^["']|["']$/g, '')
    if (key === 'styleguide_present' || key === 'design_present') {
      (data as Record<string, unknown>)[key] = cleaned === 'true'
    } else {
      (data as Record<string, unknown>)[key] = cleaned
    }
    i++
  }

  return data
}

function loadPlaybook(): PlaybookData | null {
  const filePath = resolve(process.cwd(), '..', 'playbook.yaml')
  if (!existsSync(filePath)) return null

  try {
    const text = readFileSync(filePath, 'utf8')
    return parseSimpleYaml(text)
  } catch {
    return null
  }
}

function StatusBadge({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${
        active
          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
          : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
      }`}
    >
      {label}
    </span>
  )
}

export function PlaybookOverview() {
  const data = loadPlaybook()

  if (!data) {
    return (
      <p className="text-fd-muted-foreground italic">
        No <code>playbook.yaml</code> found in the parent directory.
      </p>
    )
  }

  const isPlaceholderNorthStar =
    !data.north_star || data.north_star === NORTH_STAR_PLACEHOLDER

  return (
    <div className="space-y-6">
      {/* North star */}
      <div className="rounded-lg border border-fd-border bg-fd-card p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-fd-muted-foreground mb-2">
          North Star
        </p>
        {isPlaceholderNorthStar ? (
          <p className="text-fd-muted-foreground italic text-sm">
            Not set — open <code>playbook.yaml</code> and replace the{' '}
            <code>north_star</code> placeholder.
          </p>
        ) : (
          <p className="text-lg font-medium leading-snug">{data.north_star}</p>
        )}
      </div>

      {/* Meta grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
        {data.id && (
          <div>
            <p className="text-xs text-fd-muted-foreground mb-1 font-medium">Project ID</p>
            <p className="font-mono text-xs">{data.id}</p>
          </div>
        )}

        {data.owners && data.owners.length > 0 && (
          <div>
            <p className="text-xs text-fd-muted-foreground mb-1 font-medium">Owners</p>
            <ul className="space-y-0.5">
              {data.owners.map((o, i) => (
                <li key={i} className="text-xs">
                  {o.name || '—'}
                  {o.role && (
                    <span className="text-fd-muted-foreground ml-1">({o.role})</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <p className="text-xs text-fd-muted-foreground mb-1 font-medium">Artefacts</p>
          <div className="flex gap-2 flex-wrap">
            <StatusBadge label="Styleguide" active={data.styleguide_present ?? false} />
            <StatusBadge label="Design" active={data.design_present ?? false} />
          </div>
        </div>

        {data.provenance?.updated_at && (
          <div>
            <p className="text-xs text-fd-muted-foreground mb-1 font-medium">Last updated</p>
            <p className="text-xs font-mono">{data.provenance.updated_at}</p>
          </div>
        )}
      </div>
    </div>
  )
}
