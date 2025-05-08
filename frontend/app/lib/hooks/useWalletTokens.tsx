import { useState, useEffect } from 'react'
import { formatTokensData, getWalletTokens, TokenData } from '../moralis'
import { useQuery } from '@tanstack/react-query'

// Define the TOKENS_TYPE interface here since we can't import it from constant-types.tsx
export interface TOKENS_TYPE {
  name: string
  symbol: string
  icon: string
  popular: boolean
  value?: number
  status: 'increase' | 'decrease'
  statusAmount: number
  // Additional properties from TokenData
  token_address: string
  decimals: number
  balance: string
  possible_spam: boolean
  usd_price: number
}

interface UseWalletTokensResult {
  tokens: TOKENS_TYPE[]
  rawTokens: TokenData[]
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
  isFetching: boolean
}

// Cache time in milliseconds (5 minutes)
const CACHE_TIME = 5 * 60 * 1000

// Stale time in milliseconds (1 minute)
const STALE_TIME = 1 * 60 * 1000

/**
 * Hook to fetch wallet tokens using Moralis API with React Query for caching
 * @param address Wallet address
 * @param chain Chain to fetch tokens from (e.g., 'eth', 'bsc', 'polygon')
 * @returns Object containing tokens, loading state, error, and refetch function
 */
export const useWalletTokens = (
  address?: string,
  chain: string = 'eth'
): UseWalletTokensResult => {
  // Use React Query to fetch and cache token data
  const queryKey = ['wallet-tokens', address, chain]

  const {
    data: rawTokens = [],
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!address) return []
      return await getWalletTokens(address, chain)
    },
    enabled: !!address, // Only fetch if address is provided
    staleTime: STALE_TIME, // Consider data stale after 1 minute
    gcTime: CACHE_TIME, // Keep cache for 5 minutes
    retry: 2, // Retry failed requests twice
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
  })

  // Format tokens data and filter out tokens with insufficient liquidity
  // except for native tokens (token_address = 0x0...)
  const tokens =
    rawTokens.length > 0 ? (formatTokensData(rawTokens) as TOKENS_TYPE[]) : []

  return {
    tokens,
    rawTokens,
    isLoading,
    error: isError ? (error as Error) : null,
    refetch: async () => {
      await refetch()
    },
    isFetching,
  }
}
