import Web3ModalProvider from '@/context/Web3ModalProvider'
import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { headers } from 'next/headers'
import HomeLayout from './components/layouts'
import './globals.css'
import ReactQueryProvider from './context/ReactQueryProvider'
import { ApolloProvider } from './lib/providers/ApolloProvider'

const afacadVariable = localFont({
  src: './fonts/Afacad-Medium.ttf',
  variable: '--font-afacad-variable',
  weight: '100 900',
})

export const metadata: Metadata = {
  title: 'Decastream',
  description: '',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const cookies = (await headers()).get('cookie')

  return (
    <html lang="en" className="overflow-x-hidden">
      <body
        className={`${afacadVariable.className} antialiased overflow-x-hidden`}
      >
        <Web3ModalProvider cookies={cookies}>
          <ReactQueryProvider>
            <ApolloProvider>
              <HomeLayout>{children}</HomeLayout>
            </ApolloProvider>
          </ReactQueryProvider>
        </Web3ModalProvider>
      </body>
    </html>
  )
}
