import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign In - IndexNow Studio',
  description: 'Sign in to your IndexNow Studio account to manage your URL indexing operations',
}

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}