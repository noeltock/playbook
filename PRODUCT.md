# Product

## Register

product

## Users

Human engineers and team leads who need a single glance-and-go view of a project's agentic framework: its north star, decisions already taken, errors already hit, and design tokens in use. The viewer is consulted mid-task, not browsed leisurely. Users arrive knowing what they're looking for; the viewer's job is to surface it without friction.

AI agents do not use the viewer. They read the source files directly. The viewer exists for the humans behind the agents.

## Product Purpose

The playbook viewer makes an invisible system visible. A project's agentic context lives in YAML, JSONL, and Markdown files that are purposeful but unreadable at a glance. The viewer renders them into a coherent reference surface — one place to understand the project's recorded reasoning and its current state. Success: a developer opens the viewer, finds what they need in under 10 seconds, and closes it.

## Brand Personality

Precise. Minimal. Functional. No decoration that doesn't carry information. Confidence through restraint. Feels like a well-considered tool, not a polished product.

## Anti-references

- ReadTheDocs, GitBook — generic docs aesthetic; too much structural chrome, too little hierarchy
- Datadog, Grafana — dashboard density; too many competing visual elements
- SaaS landing pages — hero sections, gradient text, metric cards, marketing patterns
- Unstyled GitHub wikis — no visual system at all

## Design Principles

1. **Information density over decoration** — every visual element either carries data or creates structure for data. Nothing decorative.
2. **Greyscale is the constraint, not the aesthetic** — no colour unless colour IS the data (a token swatch, a status that only makes sense in colour). Status should be expressed through shape and label, not hue.
3. **Typography does the heavy lifting** — hierarchy through scale and weight contrast, not background fills or borders.
4. **Glance legibility** — layouts that work at 60% attention. The user is mid-task, not focused reading.
5. **Practice what you preach** — the viewer is part of the playbook. It should exemplify the same precision and restraint the playbook asks of the projects it serves.

## Accessibility & Inclusion

WCAG AA minimum. No colour-only status signals — always paired with a text label. Reduced motion: no animated transitions. Monospace font for all code, IDs, and commit hashes.
