import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Lead CRM — JRV Systems',
  description: 'Lead tracking for JRV Systems Seremban',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-950 text-white">
        <nav className="bg-neutral-900 border-b border-neutral-800 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16 items-center">
              <a href="/" className="text-xl font-bold text-orange-500 tracking-tight">
                🧠 Lead CRM
              </a>
              <div className="flex gap-4 items-center">
                <a
                  href="/"
                  className="text-sm text-neutral-400 hover:text-orange-400 jrv-transition"
                >
                  Dashboard
                </a>
                <a
                  href="/leads/new"
                  className="bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-orange-700 jrv-transition"
                >
                  + Add Lead
                </a>
              </div>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </body>
    </html>
  )
}
