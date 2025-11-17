import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
    title: 'Expense Tracker',
    description: 'Track your daily expenses and manage your budget',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    )
}
