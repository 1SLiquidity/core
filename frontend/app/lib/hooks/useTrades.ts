'use client'

import { useQuery } from '@apollo/client'
import { GET_TRADES } from '../graphql/queries/trades'
import { TradesResponse } from '../graphql/types/trade'

interface UseTradesOptions {
  first?: number
  skip?: number
}

export function useTrades(options: UseTradesOptions = {}) {
  const { first = 10, skip = 0 } = options

  const { data, loading, error, refetch, fetchMore } = useQuery<TradesResponse>(
    GET_TRADES,
    {
      variables: {
        first,
        skip,
      },
      // Refetch every 30 seconds to keep data fresh
      pollInterval: 30000,
    }
  )

  const loadMore = () => {
    if (!data?.trades.length) return

    return fetchMore({
      variables: {
        first,
        skip: data.trades.length,
      },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult) return prev
        return {
          trades: [...prev.trades, ...fetchMoreResult.trades],
        }
      },
    })
  }

  return {
    trades: data?.trades || [],
    isLoading: loading,
    error,
    refetch,
    loadMore,
  }
}
