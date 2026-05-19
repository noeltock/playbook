#!/usr/bin/env node
'use strict'

const fs = require('fs')
const path = require('path')
const readline = require('readline')

const PLAYBOOK_DIR = path.resolve(__dirname, '..')
const DECISIONS_JSONL = path.join(PLAYBOOK_DIR, 'decisions.jsonl')
const ERRORS_JSONL = path.join(PLAYBOOK_DIR, 'errors.jsonl')
const DECISIONS_MD = path.join(PLAYBOOK_DIR, 'DECISIONS.md')
const ERRORS_MD = path.join(PLAYBOOK_DIR, 'ERRORS.md')
const VIEWER_CONTENT_DIR = path.join(PLAYBOOK_DIR, 'viewer', 'src', 'content')

const useViewer = process.argv.includes('--viewer')

async function readJsonl(filePath) {
  const records = new Map()
  if (!fs.existsSync(filePath)) return records

  const rl = readline.createInterface({
    input: fs.createReadStream(filePath),
    crlfDelay: Infinity,
  })

  let lineNum = 0
  for await (const line of rl) {
    lineNum++
    const trimmed = line.trim()
    if (!trimmed) continue
    let obj
    try {
      obj = JSON.parse(trimmed)
    } catch (err) {
      console.error(`[playbook-render] ERROR: ${path.basename(filePath)} line ${lineNum}: ${err.message}`)
      process.exit(1)
    }
    if (!obj.id) {
      console.error(`[playbook-render] ERROR: ${path.basename(filePath)} line ${lineNum}: missing "id" field`)
      process.exit(1)
    }
    records.set(obj.id, obj)
  }

  return records
}

function formatDate(ts) {
  if (!ts) return ''
  return ts.slice(0, 10)
}

function renderDecisions(records) {
  const STATUS_ORDER = { accepted: 0, proposed: 1, rejected: 2, deprecated: 3, superseded: 4 }

  const sorted = Array.from(records.values()).sort((a, b) => {
    const oa = STATUS_ORDER[a.status] ?? 99
    const ob = STATUS_ORDER[b.status] ?? 99
    if (oa !== ob) return oa - ob
    return a.id.localeCompare(b.id)
  })

  const lines = [
    '# Decisions',
    '',
    '<!-- Auto-generated from decisions.jsonl by playbook-render. Do not edit directly. -->',
    '',
  ]

  if (sorted.length === 0) {
    lines.push('*No decisions recorded yet. Use `/playbook-decide` to record your first one.*', '')
    return lines.join('\n')
  }

  lines.push('| ID | Title | Status | Date |')
  lines.push('|-----|-------|--------|------|')
  for (const rec of sorted) {
    const date = formatDate(rec.ts)
    lines.push(`| ${rec.id} | ${rec.title} | ${rec.status} | ${date} |`)
  }

  lines.push('')
  lines.push('---')

  for (const rec of sorted) {
    const date = formatDate(rec.ts)
    lines.push('')
    lines.push(`## ${rec.id}: ${rec.title}`)
    lines.push('')
    lines.push(`**Status:** ${rec.status}  `)
    lines.push(`**Date:** ${date}`)
    lines.push('')
    lines.push('### Context')
    lines.push('')
    lines.push(rec.context || '')
    lines.push('')
    lines.push('### Decision')
    lines.push('')
    lines.push(rec.decision || '')
    lines.push('')
    lines.push('### Consequences')
    lines.push('')
    lines.push(rec.consequences || '')
    lines.push('')
    lines.push('---')
  }

  return lines.join('\n') + '\n'
}

function renderErrors(records) {
  const unresolved = []
  const workaround = []
  const permanent = []

  for (const rec of records.values()) {
    if (rec.resolution === 'unresolved' || rec.resolution === 'recurrent') {
      unresolved.push(rec)
    } else if (rec.resolution === 'workaround') {
      workaround.push(rec)
    } else {
      permanent.push(rec)
    }
  }

  const byTsDesc = (a, b) => (b.ts || '').localeCompare(a.ts || '')
  unresolved.sort(byTsDesc)
  workaround.sort(byTsDesc)
  permanent.sort(byTsDesc)

  const lines = [
    '# Errors & warnings',
    '',
    '<!-- Auto-generated from errors.jsonl by playbook-render. Do not edit directly. -->',
    '',
  ]

  if (records.size === 0) {
    lines.push('*No errors recorded yet. Use `/playbook-error` to record one.*', '')
    return lines.join('\n')
  }

  lines.push('## ⚠ Unresolved / Recurrent')
  lines.push('')
  if (unresolved.length === 0) {
    lines.push('*None.*')
    lines.push('')
  } else {
    lines.push('| ID | Summary | Kind | Remedy |')
    lines.push('|-----|---------|------|--------|')
    for (const rec of unresolved) {
      lines.push(`| ${rec.id} | ${rec.summary} | ${rec.kind} | ${rec.remedy || ''} |`)
    }
    lines.push('')
  }

  lines.push('## Workarounds')
  lines.push('')
  if (workaround.length === 0) {
    lines.push('*None.*')
    lines.push('')
  } else {
    lines.push('| ID | Summary | Kind | Remedy |')
    lines.push('|-----|---------|------|--------|')
    for (const rec of workaround) {
      lines.push(`| ${rec.id} | ${rec.summary} | ${rec.kind} | ${rec.remedy || ''} |`)
    }
    lines.push('')
  }

  lines.push('## Resolved (permanent)')
  lines.push('')
  if (permanent.length === 0) {
    lines.push('*None.*')
    lines.push('')
  } else {
    lines.push('| ID | Summary | Kind | Remedy |')
    lines.push('|-----|---------|------|--------|')
    for (const rec of permanent) {
      lines.push(`| ${rec.id} | ${rec.summary} | ${rec.kind} | ${rec.remedy || ''} |`)
    }
    lines.push('')
  }

  return lines.join('\n')
}

async function main() {
  const decisionsMap = await readJsonl(DECISIONS_JSONL)
  const errorsMap = await readJsonl(ERRORS_JSONL)

  const decisionsContent = renderDecisions(decisionsMap)
  const errorsContent = renderErrors(errorsMap)

  fs.writeFileSync(DECISIONS_MD, decisionsContent)
  console.log(`[playbook-render] DECISIONS.md updated (${decisionsMap.size} records)`)

  fs.writeFileSync(ERRORS_MD, errorsContent)
  console.log(`[playbook-render] ERRORS.md updated (${errorsMap.size} records)`)

  if (useViewer) {
    if (fs.existsSync(VIEWER_CONTENT_DIR)) {
      const decisionsFrontmatter = '---\ntitle: Decisions\ndescription: Architecture and design decisions recorded by the team.\n---\n\n'
      const errorsFrontmatter = '---\ntitle: Errors & Warnings\ndescription: Errors, warnings, and known issues recorded by the team.\n---\n\n'

      fs.writeFileSync(
        path.join(VIEWER_CONTENT_DIR, 'decisions.mdx'),
        decisionsFrontmatter + decisionsContent
      )
      fs.writeFileSync(
        path.join(VIEWER_CONTENT_DIR, 'errors.mdx'),
        errorsFrontmatter + errorsContent
      )
      console.log('[playbook-render] Viewer MDX files updated.')
    }
  }
}

main()
