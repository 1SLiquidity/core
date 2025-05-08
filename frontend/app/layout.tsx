import Web3ModalProvider from '@/context/Web3ModalProvider'
import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { headers } from 'next/headers'
import HomeLayout from './components/layouts'
import './globals.css'
import ReactQueryProvider from './context/ReactQueryProvider'

const afacadVariable = localFont({
  src: './fonts/Afacad-Medium.ttf',
  variable: '--font-afacad-variable',
  weight: '100 900',
})

export const metadata: Metadata = {
  title: 'Deca Swap',
  description: '',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const cookies = (await headers()).get('cookie')

  return (
    <html lang="en">
      <body className={`${afacadVariable.className} antialiased`}>
        <Web3ModalProvider cookies={cookies}>
          <ReactQueryProvider>
            <HomeLayout>{children}</HomeLayout>
          </ReactQueryProvider>
        </Web3ModalProvider>
      </body>
    </html>
  )
}
