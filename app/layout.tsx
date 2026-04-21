import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Hudgi Dispatch',
  description: 'Order dispatch management for The S.W.A.D.E.S Style',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,500;1,9..144,300&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
        {/* SheetJS for client-side XLSX generation */}
        <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
      </head>
      <body>{children}</body>
    </html>
  )
}
