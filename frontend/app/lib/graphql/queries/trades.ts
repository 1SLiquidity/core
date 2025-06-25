import { gql } from '@apollo/client'

export const GET_TRADES = gql`
  query MyQuery($first: Int = 10, $skip: Int = 0) {
    trades(first: $first, orderBy: id, orderDirection: asc, skip: $skip) {
      amountIn
      amountRemaining
      botGasAllowance
      createdAt
      cumulativeGasEntailed
      instasettleBps
      isInstasettlable
      lastSweetSpot
      minAmountOut
      tokenIn
      tokenOut
      tradeId
      user
      realisedAmountOut
      id
      executions(first: 10) {
        amountIn
        cumulativeGasEntailed
        id
        lastSweetSpot
        timestamp
        realisedAmountOut
      }
    }
  }
`
