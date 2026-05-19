import { DocsLayout } from 'fumadocs-ui/layout'
import { source } from '@/lib/source'
import type { ReactNode } from 'react'

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={source.pageTree}
      nav={{
        title: 'Playbook',
        transparentMode: 'none',
      }}
      sidebar={{
        collapsible: false,
        defaultOpenLevel: 1,
      }}
    >
      {children}
    </DocsLayout>
  )
}
