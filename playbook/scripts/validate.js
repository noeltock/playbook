#!/usr/bin/env node
'use strict'

const fs = require('fs')
const path = require('path')
const readline = require('readline')

const PLAYBOOK_DIR = path.resolve(__dirname, '..')
const PLAYBOOK_YAML = path.join(PLAYBOOK_DIR, 'playbook.yaml')
const DECISIONS_JSONL = path.join(PLAYBOOK_DIR, 'decisions.jsonl')
const ERRORS_JSONL = path.join(PLAYBOOK_DIR, 'errors.jsonl')

let hasErrors = false

function fail(filename, line, message) {
  console.error(`[playbook-validate] ERROR: ${filename} line ${line}: ${message}`)
  hasErrors = true
}

// ── Minimal inline validator ──────────────────────────────────────────────────

function checkString(val, field, filename, line, opts = {}) {
  if (typeof val !== 'string') {
    fail(filename, line, `"${field}" must be a string`)
    return false
  }
  if (opts.minLength && val.length < opts.minLength) {
    fail(filename, line, `"${field}" must be at least ${opts.minLength} chars`)
    return false
  }
  if (opts.pattern && !opts.pattern.test(val)) {
    fail(filename, line, `"${field}" does not match pattern ${opts.pattern}`)
    return false
  }
  return true
}

function checkEnum(val, field, allowed, filename, line) {
  if (!allowed.includes(val)) {
    fail(filename, line, `"${field}" must be one of: ${allowed.join(', ')} (got "${val}")`)
    return false
  }
  return true
}

function checkRequired(obj, fields, filename, line) {
  for (const f of fields) {
    if (obj[f] === undefined || obj[f] === null) {
      fail(filename, line, `missing required field "${f}"`)
    }
  }
}

// ── YAML parser (flat key:value + owners list block) ─────────────────────────

function parsePlaybookYaml(content) {
  const lines = content.split('\n')
  let inFrontmatter = false
  let frontmatterLines = []
  let dashCount = 0

  for (const line of lines) {
    if (line.trim() === '---') {
      dashCount++
      if (dashCount === 1) { inFrontmatter = true; continue }
      if (dashCount === 2) { inFrontmatter = false; continue }
    }
    if (inFrontmatter) frontmatterLines.push(line)
  }

  const result = {}
  let i = 0
  while (i < frontmatterLines.length) {
    const line = frontmatterLines[i]
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) { i++; continue }

    // owners: block (list of objects)
    if (trimmed === 'owners:') {
      const owners = []
      i++
      while (i < frontmatterLines.length) {
        const ownerLine = frontmatterLines[i]
        const ownerTrimmed = ownerLine.trim()
        if (!ownerTrimmed) { i++; continue }
        // new owner entry starts with "- name:"
        if (ownerTrimmed.startsWith('- ')) {
          const owner = {}
          const firstPair = ownerTrimmed.slice(2)
          applyKv(owner, firstPair)
          i++
          // read continuation lines (indented deeper, no leading "- ")
          while (i < frontmatterLines.length) {
            const contLine = frontmatterLines[i]
            const contTrimmed = contLine.trim()
            if (!contTrimmed) { i++; continue }
            if (contTrimmed.startsWith('- ') || !contLine.startsWith(' ')) break
            applyKv(owner, contTrimmed)
            i++
          }
          owners.push(owner)
        } else {
          // no longer in the owners block
          break
        }
      }
      result.owners = owners
      continue
    }

    // provenance: block
    if (trimmed === 'provenance:') {
      const prov = {}
      i++
      while (i < frontmatterLines.length) {
        const provLine = frontmatterLines[i]
        const provTrimmed = provLine.trim()
        if (!provTrimmed) { i++; continue }
        if (!provLine.startsWith(' ') && !provLine.startsWith('\t')) break
        applyKv(prov, provTrimmed)
        i++
      }
      result.provenance = prov
      continue
    }

    // flat key: value
    applyKv(result, trimmed)
    i++
  }

  return result
}

function applyKv(obj, line) {
  const colonIdx = line.indexOf(':')
  if (colonIdx === -1) return
  const key = line.slice(0, colonIdx).trim()
  const raw = line.slice(colonIdx + 1).trim()
  // strip surrounding quotes
  const val = raw.replace(/^["']|["']$/g, '')
  if (val === 'true') { obj[key] = true; return }
  if (val === 'false') { obj[key] = false; return }
  obj[key] = val
}

// ── Validate playbook.yaml ────────────────────────────────────────────────────

function validatePlaybookYaml() {
  const filename = 'playbook.yaml'
  if (!fs.existsSync(PLAYBOOK_YAML)) {
    fail(filename, 0, 'file not found')
    return
  }

  const content = fs.readFileSync(PLAYBOOK_YAML, 'utf8')
  const obj = parsePlaybookYaml(content)

  const REQUIRED = ['schema_version', 'id', 'north_star', 'owners', 'styleguide_present', 'design_present', 'provenance']
  checkRequired(obj, REQUIRED, filename, 1)

  if (obj.schema_version !== undefined) {
    checkString(obj.schema_version, 'schema_version', filename, 1, { pattern: /^\d+\.\d+\.\d+$/ })
  }

  if (obj.id !== undefined) {
    checkString(obj.id, 'id', filename, 1, {
      minLength: 3,
      pattern: /^playbook\.[a-z0-9][a-z0-9-]*(\.[a-z0-9][a-z0-9-]*)*$/,
    })
  }

  if (obj.north_star !== undefined) {
    checkString(obj.north_star, 'north_star', filename, 1, { minLength: 10 })
  }

  if (obj.owners !== undefined) {
    if (!Array.isArray(obj.owners) || obj.owners.length < 1) {
      fail(filename, 1, '"owners" must be an array with at least one item')
    } else {
      for (const owner of obj.owners) {
        if (typeof owner.name !== 'string') fail(filename, 1, 'owner "name" must be a string')
        if (typeof owner.role !== 'string') fail(filename, 1, 'owner "role" must be a string')
      }
    }
  }

  if (obj.styleguide_present !== undefined && typeof obj.styleguide_present !== 'boolean') {
    fail(filename, 1, '"styleguide_present" must be a boolean')
  }
  if (obj.design_present !== undefined && typeof obj.design_present !== 'boolean') {
    fail(filename, 1, '"design_present" must be a boolean')
  }

  if (obj.provenance !== undefined && typeof obj.provenance === 'object') {
    if (obj.provenance.git_commit === undefined) fail(filename, 1, 'provenance missing "git_commit"')
    if (obj.provenance.updated_at === undefined) fail(filename, 1, 'provenance missing "updated_at"')
  }
}

// ── Validate decisions.jsonl ──────────────────────────────────────────────────

async function validateDecisions() {
  const filename = 'decisions.jsonl'
  if (!fs.existsSync(DECISIONS_JSONL)) return

  const rl = readline.createInterface({
    input: fs.createReadStream(DECISIONS_JSONL),
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
      fail(filename, lineNum, `invalid JSON: ${err.message}`)
      continue
    }

    const REQUIRED = ['id', 'ts', 'title', 'status', 'context', 'decision', 'consequences']
    checkRequired(obj, REQUIRED, filename, lineNum)

    if (obj.id !== undefined) {
      checkString(obj.id, 'id', filename, lineNum, { pattern: /^DEC-\d+$/ })
    }
    if (obj.title !== undefined) {
      checkString(obj.title, 'title', filename, lineNum, { minLength: 5 })
    }
    if (obj.status !== undefined) {
      checkEnum(obj.status, 'status', ['proposed', 'accepted', 'rejected', 'deprecated', 'superseded'], filename, lineNum)
    }
    if (obj.context !== undefined) {
      checkString(obj.context, 'context', filename, lineNum, { minLength: 10 })
    }
    if (obj.decision !== undefined) {
      checkString(obj.decision, 'decision', filename, lineNum, { minLength: 10 })
    }
    if (obj.consequences !== undefined && typeof obj.consequences !== 'string') {
      fail(filename, lineNum, '"consequences" must be a string')
    }
  }
}

// ── Validate errors.jsonl ─────────────────────────────────────────────────────

async function validateErrors() {
  const filename = 'errors.jsonl'
  if (!fs.existsSync(ERRORS_JSONL)) return

  const rl = readline.createInterface({
    input: fs.createReadStream(ERRORS_JSONL),
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
      fail(filename, lineNum, `invalid JSON: ${err.message}`)
      continue
    }

    const REQUIRED = ['id', 'ts', 'kind', 'summary', 'resolution', 'resolved']
    checkRequired(obj, REQUIRED, filename, lineNum)

    if (obj.id !== undefined) {
      checkString(obj.id, 'id', filename, lineNum, { pattern: /^ERR-\d+$/ })
    }
    if (obj.kind !== undefined) {
      checkEnum(obj.kind, 'kind', ['error', 'warning', 'info'], filename, lineNum)
    }
    if (obj.summary !== undefined) {
      checkString(obj.summary, 'summary', filename, lineNum, { minLength: 5 })
    }
    if (obj.resolution !== undefined) {
      checkEnum(obj.resolution, 'resolution', ['unresolved', 'permanent', 'workaround', 'recurrent'], filename, lineNum)
    }
    if (obj.resolved !== undefined && typeof obj.resolved !== 'boolean') {
      fail(filename, lineNum, '"resolved" must be a boolean')
    }
    if (obj.resolved === true && !obj.resolved_ts) {
      fail(filename, lineNum, '"resolved_ts" is required when "resolved" is true')
    }
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  validatePlaybookYaml()
  await validateDecisions()
  await validateErrors()

  if (hasErrors) {
    process.exit(1)
  } else {
    console.log('[playbook-validate] All checks passed.')
  }
}

main()
