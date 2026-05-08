'use client'

import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(key: string) {
          if (typeof document === 'undefined') return null
          const match = document.cookie.match(new RegExp(`(^| )${key}=([^;]+)`))
          return match ? decodeURIComponent(match[2]) : null
        },
        set(key: string, value: string, options: any) {
          if (typeof document === 'undefined') return
          let cookie = `${key}=${encodeURIComponent(value)}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
          if (options?.domain) cookie += `; domain=${options.domain}`
          if (options?.sameSite) cookie += `; samesite=${options.sameSite}`
          document.cookie = cookie
        },
        remove(key: string) {
          if (typeof document === 'undefined') return
          document.cookie = `${key}=; path=/; max-age=0`
        },
      },
    }
  )
}
