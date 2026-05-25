import type { Metadata } from 'next'
import './globals.css'
import { createClient } from '@/lib/supabase/server'
import AuthButton from './auth-button'

export const metadata: Metadata = {
  title: 'Lead CRM — JRV Systems',
  description: 'Lead tracking for JRV Systems Seremban',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-950 text-white antialiased">
        <nav className="bg-neutral-900/80 backdrop-blur-lg border-b border-neutral-800 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <a href="/" className="flex items-center gap-3 group">
                <span className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center group-hover:bg-orange-500 jrv-transition">
                  <span className="text-[10px] font-black text-white tracking-tighter leading-none">JRV</span>
                </span>
                <div className="hidden sm:flex items-center gap-2.5">
                  <span className="text-base font-bold text-white tracking-tight">Lead CRM</span>
                  <span className="text-neutral-700 text-sm font-light">•</span>
                  <span className="text-[11px] text-neutral-500 font-medium tracking-widest uppercase">JRV SYSTEMS</span>
                </div>
              </a>
              <div className="flex items-center gap-2 sm:gap-3">
                {user && (
                  <>
                    <a
                      href="/"
                      className="text-sm text-neutral-400 hover:text-orange-400 jrv-transition px-3 py-2 rounded-lg hover:bg-neutral-800 font-medium hidden sm:inline-block"
                    >
                      Dashboard
                    </a>
                    <a
                      href="/logs"
                      className="text-sm text-neutral-400 hover:text-orange-400 jrv-transition px-3 py-2 rounded-lg hover:bg-neutral-800 font-medium hidden sm:inline-block"
                    >
                      Logs
                    </a>
                    <a
                      href="/leads/new"
                      className="bg-orange-600 hover:bg-orange-700 text-white px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium jrv-transition press-feedback"
                    >
                      + Add
                    </a>
                    <AuthButton email={user.email || ''} />
                  </>
                )}
              </div>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {children}
        </main>
      </body>
    </html>
  )
}
