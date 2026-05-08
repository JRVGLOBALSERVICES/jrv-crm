'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AuthButton({ email }: { email: string }) {
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-neutral-600 hidden lg:inline-block truncate max-w-[120px]">{email}</span>
      <button
        onClick={handleSignOut}
        className="text-xs text-neutral-500 hover:text-red-400 jrv-transition px-2 py-1.5 rounded-lg hover:bg-neutral-800 font-medium"
      >
        Logout
      </button>
    </div>
  )
}
