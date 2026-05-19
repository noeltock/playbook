import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

interface DTCGToken {
  $type: string
  $value: string | number
  $description?: string
}

interface TokenNode {
  [key: string]: DTCGToken | TokenNode
}

interface TokenFile {
  $schema?: string
  $metadata?: {
    tokenSetOrder?: string[]
  }
  [key: string]: unknown
}

function isDTCGToken(node: unknown): node is DTCGToken {
  return (
    typeof node === 'object' &&
    node !== null &&
    '$type' in node &&
    '$value' in node
  )
}

interface FlatToken {
  name: string
  type: string
  value: string | number
  description?: string
}

function flattenTokens(node: TokenNode, prefix = ''): FlatToken[] {
  const results: FlatToken[] = []

  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith('$')) continue
    const name = prefix ? `${prefix}.${key}` : key
    if (isDTCGToken(value)) {
      results.push({
        name,
        type: value.$type,
        value: value.$value,
        description: value.$description,
      })
    } else if (typeof value === 'object' && value !== null) {
      results.push(...flattenTokens(value as TokenNode, name))
    }
  }

  return results
}

function loadTokens(): FlatToken[] | null {
  const filePath = resolve(process.cwd(), '..', 'tokens.json')
  if (!existsSync(filePath)) return null

  let data: TokenFile
  try {
    data = JSON.parse(readFileSync(filePath, 'utf8')) as TokenFile
  } catch {
    return null
  }

  const order = data.$metadata?.tokenSetOrder
  if (!order || order.length === 0) return null

  const { $schema: _schema, $metadata: _meta, ...rest } = data
  return flattenTokens(rest as TokenNode)
}

function groupByType(tokens: FlatToken[]): Record<string, FlatToken[]> {
  const groups: Record<string, FlatToken[]> = {}
  for (const token of tokens) {
    if (!groups[token.type]) groups[token.type] = []
    groups[token.type].push(token)
  }
  return groups
}

const typeOrder = ['color', 'dimension', 'fontFamily', 'fontWeight', 'borderRadius', 'shadow']

function ColorSwatch({ token }: { token: FlatToken }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="w-10 h-10 rounded border border-fd-border flex-shrink-0"
        style={{ backgroundColor: String(token.value) }}
      />
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{token.name}</p>
        <p className="text-xs text-fd-muted-foreground font-mono">{token.value}</p>
      </div>
    </div>
  )
}

function ScalarToken({ token }: { token: FlatToken }) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-xs bg-fd-muted px-2 py-1 rounded text-fd-foreground">
        {token.value}
      </span>
      <span className="text-sm text-fd-muted-foreground truncate">{token.name}</span>
    </div>
  )
}

export function TokenGrid() {
  const tokens = loadTokens()

  if (!tokens || tokens.length === 0) {
    return (
      <p className="text-fd-muted-foreground italic">
        No design tokens recorded yet. Run <code>/playbook-styleguide</code> to generate them.
      </p>
    )
  }

  const groups = groupByType(tokens)
  const orderedTypes = [
    ...typeOrder.filter((t) => t in groups),
    ...Object.keys(groups).filter((t) => !typeOrder.includes(t)),
  ]

  return (
    <div className="space-y-10">
      {orderedTypes.map((type) => {
        const items = groups[type]
        return (
          <div key={type}>
            <h3 className="text-sm font-semibold text-fd-muted-foreground uppercase tracking-wide mb-4 capitalize">
              {type}
            </h3>
            <div className={type === 'color' ? 'grid grid-cols-1 sm:grid-cols-2 gap-4' : 'space-y-2'}>
              {items.map((token) =>
                type === 'color' ? (
                  <ColorSwatch key={token.name} token={token} />
                ) : (
                  <ScalarToken key={token.name} token={token} />
                )
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
