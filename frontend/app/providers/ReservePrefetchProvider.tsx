'use client'

import { ReactNode } from 'react'
import { usePrefetchReserves } from '@/app/lib/hooks/usePrefetchReserves'
import { useAppKitState } from '@reown/appkit/react'

interface ReservePrefetchProviderProps {
  children: ReactNode
}

export const ReservePrefetchProvider = ({
  children,
}: ReservePrefetchProviderProps) => {
  // Get current chain from AppKit
  const stateData = useAppKitState()
  const chainIdWithPrefix = stateData?.selectedNetworkId || 'eip155:1'
  const chainId = chainIdWithPrefix.split(':')[1]

  // This will trigger the prefetching in the background
  usePrefetchReserves({
    chainId,
  })

  // Simply render children since this is just for background prefetching
  return <>{children}</>
}
