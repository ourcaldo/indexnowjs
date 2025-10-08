'use client'

import FastIndexingWebSocketProvider from '@/components/FastIndexingWebSocketProvider'

export default function FastIndexingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <FastIndexingWebSocketProvider>
      {children}
    </FastIndexingWebSocketProvider>
  )
}