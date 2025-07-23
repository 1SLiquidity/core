import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { headers } from 'next/headers'
import './globals.css'
import { TooltipProvider } from '@/components/ui/tooltip'
import {
  ApolloProvider,
  HomeProviders,
  ReactQueryProvider,
  Web3ModalProvider,
} from './providers'

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
        <TooltipProvider>
          <Web3ModalProvider cookies={cookies}>
            <ReactQueryProvider>
              <ApolloProvider>
                <HomeProviders>{children}</HomeProviders>
              </ApolloProvider>
            </ReactQueryProvider>
          </Web3ModalProvider>
        </TooltipProvider>
      </body>
    </html>
  )
}
