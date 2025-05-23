'use client'
import GlobalStreamSidebar from '@/app/components/sidebar/globalStreamSidebar'
import SelectTokenSidebar from '@/app/components/sidebar/selectTokenSidebar'
import WalletDetailsSidebar from '@/app/components/sidebar/walletDetailsSidebar'
import React, { createContext, useContext, useState } from 'react'

type SidebarContextType = {
  showSelectTokenSidebar: (isOpen: boolean) => void
  showWalletDetailsSidebar: (isOpen: boolean) => void
  showGlobalStreamSidebar: (isOpen: boolean) => void
  isSelectTokenSidebarOpen: boolean
  isWalletDetailsSidebarOpen: boolean
  isGlobalStreamSidebarOpen: boolean
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export const useSidebar = () => {
  const context = useContext(SidebarContext)
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider')
  }
  return context
}

type SidebarProviderProps = {
  children: React.ReactNode
}

export const SidebarProvider: React.FC<SidebarProviderProps> = ({
  children,
}) => {
  const [isSelectTokenSidebarOpen, setIsSelectTokenSidebarOpen] =
    useState(false)
  const [isWalletDetailsSidebarOpen, setIsWalletDetailsSidebarOpen] =
    useState(false)
  const [isGlobalStreamSidebarOpen, setIsGlobalStreamSidebarOpen] =
    useState(false)

  const showSelectTokenSidebar = (isOpen: boolean) => {
    setIsSelectTokenSidebarOpen(isOpen)
  }

  const showWalletDetailsSidebar = (isOpen: boolean) => {
    setIsWalletDetailsSidebarOpen(isOpen)
  }

  const showGlobalStreamSidebar = (isOpen: boolean) => {
    setIsGlobalStreamSidebarOpen(isOpen)
  }

  return (
    <SidebarContext.Provider
      value={{
        showSelectTokenSidebar,
        showWalletDetailsSidebar,
        showGlobalStreamSidebar,
        isSelectTokenSidebarOpen,
        isWalletDetailsSidebarOpen,
        isGlobalStreamSidebarOpen,
      }}
    >
      {children}
      {isSelectTokenSidebarOpen && (
        <SelectTokenSidebar
          isOpen={isSelectTokenSidebarOpen}
          onClose={() => setIsSelectTokenSidebarOpen(false)}
        />
      )}
      {isWalletDetailsSidebarOpen && (
        <WalletDetailsSidebar
          isOpen={isWalletDetailsSidebarOpen}
          onClose={() => setIsWalletDetailsSidebarOpen(false)}
        />
      )}
      {isGlobalStreamSidebarOpen && (
        <GlobalStreamSidebar
          isOpen={isGlobalStreamSidebarOpen}
          onClose={() => setIsGlobalStreamSidebarOpen(false)}
        />
      )}
    </SidebarContext.Provider>
  )
}
