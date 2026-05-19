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
    return parseSimpleYaml(readFileSync(filePath, 'utf8'))
  } catch {
    return null
  }
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs text-fd-muted-foreground mb-1.5 font-medium">
      {children}
    </p>
  )
}

function Artefact({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      style={active ? {} : { borderStyle: 'dashed' }}
      className={`inline-block border rounded px-2.5 py-1 text-sm ${
        active
          ? 'border-fd-foreground text-fd-foreground'
          : 'border-fd-border text-fd-muted-foreground'
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
      <p className="text-fd-muted-foreground">
        No playbook.yaml found in the parent directory.
      </p>
    )
  }

  const isPlaceholderNorthStar =
    !data.north_star || data.north_star === NORTH_STAR_PLACEHOLDER

  return (
    <div className="space-y-8">
      {/* North star */}
      <div className="rounded-lg border border-fd-border p-8">
        <FieldLabel>North Star</FieldLabel>
        {isPlaceholderNorthStar ? (
          <p className="text-fd-muted-foreground text-base">
            Not set. Open playbook.yaml and replace the north_star placeholder.
          </p>
        ) : (
          <p className="text-xl leading-snug font-medium">{data.north_star}</p>
        )}
      </div>

      {/* Meta */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
        {data.id && (
          <div>
            <FieldLabel>Project ID</FieldLabel>
            <p className="font-mono text-sm">{data.id}</p>
          </div>
        )}

        {data.owners && data.owners.length > 0 && (
          <div>
            <FieldLabel>Owners</FieldLabel>
            <ul className="list-none space-y-1">
              {data.owners.map((o, i) => (
                <li key={i} className="text-sm">
                  {o.name || '—'}
                  {o.role && (
                    <span className="text-fd-muted-foreground ml-1.5">({o.role})</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <FieldLabel>Artefacts</FieldLabel>
          <div className="flex gap-2 flex-wrap">
            <Artefact label="Styleguide" active={data.styleguide_present ?? false} />
            <Artefact label="Design" active={data.design_present ?? false} />
          </div>
        </div>

        {data.provenance?.updated_at && (
          <div>
            <FieldLabel>Last updated</FieldLabel>
            <p className="font-mono text-sm">{data.provenance.updated_at}</p>
          </div>
        )}
      </div>
    </div>
  )
}
