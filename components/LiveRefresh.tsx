'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Re-fetches the server-rendered page on an interval while a game is live.
export default function LiveRefresh({ intervalMs = 5000 }: { intervalMs?: number }) {
  const router = useRouter()
  useEffect(() => {
    const t = setInterval(() => router.refresh(), intervalMs)
    return () => clearInterval(t)
  }, [router, intervalMs])
  return null
}
