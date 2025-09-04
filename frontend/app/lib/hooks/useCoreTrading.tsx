// hooks/useCoreTrading.ts
import { useState, useCallback } from 'react'
import { ethers } from 'ethers'
import { erc20Abi } from 'viem'
import { toast } from 'react-hot-toast'
import coreAbi from '../config/trade-core.json'

// Types
export interface TradeData {
  owner: string
  tokenIn: string
  tokenOut: string
  amountIn: string
  amountRemaining: string
  targetAmountOut: string
  realisedAmountOut: string
  isInstasettlable: boolean
  usePriceBased: boolean
  instasettleBps?: string
}

export interface PlaceTradeParams {
  tokenIn: string
  tokenOut: string
  amountIn: string
  minAmountOut: string
  isInstasettlable: boolean
  usePriceBased: boolean
}

export interface ContractInfo {
  owner: string
  streamDaemon: string
  executor: string
  registry: string
  lastTradeId: string
  maxBps: string
  maxFeeCapBps: string
  streamProtocolFeeBps: string
  streamBotFeeBps: string
  instasettleProtocolFeeBps: string
}

// Constants - You should move these to environment variables
const CORE_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CORE_ADDRESS || ''

export const useCoreTrading = () => {
  const [loading, setLoading] = useState(false)
  const [contractInfo, setContractInfo] = useState<ContractInfo | null>(null)

  // Helper function to get contract instance
  const getContract = useCallback((signer?: ethers.Signer) => {
    if (!CORE_CONTRACT_ADDRESS) {
      throw new Error('Core contract address not configured')
    }

    if (!signer) {
      // For read-only operations
      const provider = new ethers.providers.Web3Provider(
        (window as any).ethereum
      )
      return new ethers.Contract(CORE_CONTRACT_ADDRESS, coreAbi, provider)
    }

    return new ethers.Contract(CORE_CONTRACT_ADDRESS, coreAbi, signer)
  }, [])

  // Helper function to get token decimals
  const getTokenDecimals = useCallback(
    async (tokenAddress: string, signer: ethers.Signer): Promise<number> => {
      try {
        const tokenContract = new ethers.Contract(
          tokenAddress,
          erc20Abi,
          signer
        )
        return await tokenContract.decimals()
      } catch (error) {
        console.error('Error getting token decimals:', error)
        return 18 // Default to 18 decimals
      }
    },
    []
  )

  // Helper function to check token allowance
  const checkTokenAllowance = useCallback(
    async (
      tokenAddress: string,
      spender: string,
      amount: ethers.BigNumber,
      signer: ethers.Signer
    ): Promise<boolean> => {
      try {
        const tokenContract = new ethers.Contract(
          tokenAddress,
          erc20Abi,
          signer
        )
        const userAddress = await signer.getAddress()
        const allowance = await tokenContract.allowance(userAddress, spender)
        return allowance.gte(amount)
      } catch (error) {
        console.error('Error checking token allowance:', error)
        return false
      }
    },
    []
  )

  // Helper function to approve token
  const approveToken = useCallback(
    async (
      tokenAddress: string,
      spender: string,
      amount: ethers.BigNumber,
      signer: ethers.Signer
    ): Promise<boolean> => {
      try {
        toast.loading('Approving tokens...', { id: 'token-approval' })

        const tokenContract = new ethers.Contract(
          tokenAddress,
          erc20Abi,
          signer
        )
        const approveTx = await tokenContract.approve(spender, amount)
        await approveTx.wait()

        toast.success('Token approval successful!', { id: 'token-approval' })
        return true
      } catch (error: any) {
        toast.dismiss('token-approval')
        toast.error(`Token approval failed: ${error.reason || error.message}`)
        return false
      } finally {
        toast.dismiss('token-approval')
      }
    },
    []
  )

  // Get contract information
  const getContractInfo = useCallback(async () => {
    try {
      setLoading(true)
      const contract = getContract()

      const [
        owner,
        streamDaemon,
        executor,
        registry,
        lastTradeId,
        maxBps,
        maxFeeCapBps,
        streamProtocolFeeBps,
        streamBotFeeBps,
        instasettleProtocolFeeBps,
      ] = await Promise.all([
        contract.owner(),
        contract.streamDaemon(),
        contract.executor(),
        contract.registry(),
        contract.lastTradeId(),
        contract.MAX_BPS(),
        contract.MAX_FEE_CAP_BPS(),
        contract.streamProtocolFeeBps(),
        contract.streamBotFeeBps(),
        contract.instasettleProtocolFeeBps(),
      ])

      const info: ContractInfo = {
        owner,
        streamDaemon,
        executor,
        registry,
        lastTradeId: lastTradeId.toString(),
        maxBps: maxBps.toString(),
        maxFeeCapBps: maxFeeCapBps.toString(),
        streamProtocolFeeBps: streamProtocolFeeBps.toString(),
        streamBotFeeBps: streamBotFeeBps.toString(),
        instasettleProtocolFeeBps: instasettleProtocolFeeBps.toString(),
      }

      setContractInfo(info)
      return info
    } catch (error: any) {
      console.error('Error getting contract info:', error)
      toast.error(
        `Failed to get contract info: ${error.reason || error.message}`
      )
      return null
    } finally {
      setLoading(false)
    }
  }, [getContract])

  // Get trade information
  const getTrade = useCallback(
    async (tradeId: number): Promise<TradeData | null> => {
      try {
        const contract = getContract()
        const trade = await contract.getTrade(tradeId)

        return {
          owner: trade.owner,
          tokenIn: trade.tokenIn,
          tokenOut: trade.tokenOut,
          amountIn: ethers.utils.formatUnits(trade.amountIn),
          amountRemaining: ethers.utils.formatUnits(trade.amountRemaining),
          targetAmountOut: ethers.utils.formatUnits(trade.targetAmountOut),
          realisedAmountOut: ethers.utils.formatUnits(trade.realisedAmountOut),
          isInstasettlable: trade.isInstasettlable,
          usePriceBased: trade.usePriceBased,
          instasettleBps: trade.instasettleBps?.toString(),
        }
      } catch (error: any) {
        console.error(`Error getting trade ${tradeId}:`, error)
        toast.error(
          `Failed to get trade info: ${error.reason || error.message}`
        )
        return null
      }
    },
    [getContract]
  )

  // Get recent trades
  const getRecentTrades = useCallback(
    async (count: number = 5): Promise<TradeData[]> => {
      try {
        setLoading(true)
        const contract = getContract()
        const lastTradeId = await contract.lastTradeId()

        const trades: TradeData[] = []
        const tradeCount = Math.min(count, lastTradeId.toNumber())

        for (
          let i = Math.max(1, lastTradeId.toNumber() - tradeCount + 1);
          i <= lastTradeId.toNumber();
          i++
        ) {
          const trade = await getTrade(i)
          if (trade) {
            trades.push(trade)
          }
        }

        return trades
      } catch (error: any) {
        console.error('Error getting recent trades:', error)
        toast.error(
          `Failed to get recent trades: ${error.reason || error.message}`
        )
        return []
      } finally {
        setLoading(false)
      }
    },
    [getContract, getTrade]
  )

  // Place a trade
  const placeTrade = useCallback(
    async (
      params: PlaceTradeParams,
      signer: ethers.Signer
    ): Promise<{ success: boolean; tradeId?: number; txHash?: string }> => {
      try {
        setLoading(true)
        toast.loading('Placing trade...', { id: 'place-trade' })

        const {
          tokenIn,
          tokenOut,
          amountIn,
          minAmountOut,
          isInstasettlable,
          usePriceBased,
        } = params

        console.log('=== Placing Trade ===')
        console.log('Params:', params)
        console.log('Signer:', signer)
        console.log('Core contract address:', CORE_CONTRACT_ADDRESS)

        if (!CORE_CONTRACT_ADDRESS) {
          throw new Error('Core contract address not configured')
        }

        // Get token decimals
        console.log('Getting token decimals...')
        const tokenInDecimals = await getTokenDecimals(tokenIn, signer)
        const tokenOutDecimals = await getTokenDecimals(tokenOut, signer)
        console.log('Token decimals:', { tokenInDecimals, tokenOutDecimals })

        const amountInWei = ethers.utils.parseUnits(amountIn, tokenInDecimals)
        const minAmountOutWei = ethers.utils.parseUnits(
          minAmountOut,
          tokenOutDecimals
        )
        console.log('Amounts in Wei:', {
          amountInWei: amountInWei.toString(),
          minAmountOutWei: minAmountOutWei.toString(),
        })

        // Check and handle token allowance
        console.log('Checking token allowance...')
        const hasAllowance = await checkTokenAllowance(
          tokenIn,
          CORE_CONTRACT_ADDRESS,
          amountInWei,
          signer
        )
        console.log('Has allowance:', hasAllowance)

        if (!hasAllowance) {
          console.log('Approving tokens...')
          const approved = await approveToken(
            tokenIn,
            CORE_CONTRACT_ADDRESS,
            amountInWei,
            signer
          )
          if (!approved) {
            return { success: false }
          }
        }

        // Get contract instance with signer
        console.log('Getting contract instance...')
        const contract = getContract(signer)

        // Encode trade data
        console.log('Encoding trade data...')
        const tradeData = ethers.utils.defaultAbiCoder.encode(
          ['address', 'address', 'uint256', 'uint256', 'bool', 'bool'],
          [
            tokenIn,
            tokenOut,
            amountInWei,
            minAmountOutWei,
            isInstasettlable,
            usePriceBased,
          ]
        )
        console.log('Trade data encoded')

        // Estimate gas
        console.log('Estimating gas...')
        const gasEstimate = await contract.estimateGas.placeTrade(tradeData)
        console.log('Gas estimate:', gasEstimate.toString())

        // Execute place trade
        console.log('Executing place trade...')
        const placeTradeTx = await contract.placeTrade(tradeData, {
          gasLimit: gasEstimate.mul(120).div(100), // 20% buffer
        })

        console.log('Transaction sent:', placeTradeTx.hash)
        toast.loading('Waiting for confirmation...', { id: 'place-trade' })
        const receipt = await placeTradeTx.wait()
        console.log('Transaction confirmed! Block:', receipt.blockNumber)

        // Get trade ID from events
        const tradeCreatedEvent = receipt.events?.find(
          (e: any) => e.event === 'TradeCreated'
        )
        const tradeId = tradeCreatedEvent?.args?.tradeId?.toNumber()

        toast.success(
          `Trade placed successfully! ${tradeId ? `Trade ID: ${tradeId}` : ''}`,
          { id: 'place-trade' }
        )

        return {
          success: true,
          tradeId,
          txHash: placeTradeTx.hash,
        }
      } catch (error: any) {
        console.error('Error placing trade:', error)
        toast.dismiss('place-trade')
        toast.error(`Failed to place trade: ${error.reason || error.message}`)
        return { success: false }
      } finally {
        toast.dismiss('place-trade')
        setLoading(false)
      }
    },
    [getContract, getTokenDecimals, checkTokenAllowance, approveToken]
  )

  // Cancel a trade
  const cancelTrade = useCallback(
    async (
      tradeId: number,
      signer: ethers.Signer
    ): Promise<{ success: boolean; txHash?: string }> => {
      try {
        setLoading(true)
        toast.loading('Cancelling trade...', { id: 'cancel-trade' })

        const contract = getContract(signer)

        // Check if trade exists and get details
        const trade = await contract.getTrade(tradeId)
        const userAddress = await signer.getAddress()

        // Check if the caller is the trade owner
        if (trade.owner.toLowerCase() !== userAddress.toLowerCase()) {
          toast.dismiss('cancel-trade')
          toast.error('Only the trade owner can cancel this trade')
          return { success: false }
        }

        // Estimate gas
        const gasEstimate = await contract.estimateGas._cancelTrade(tradeId)

        // Execute cancel trade
        const cancelTx = await contract._cancelTrade(tradeId, {
          gasLimit: gasEstimate.mul(120).div(100),
        })

        toast.loading('Waiting for confirmation...', { id: 'cancel-trade' })
        await cancelTx.wait()

        toast.success('Trade cancelled successfully!', { id: 'cancel-trade' })

        return {
          success: true,
          txHash: cancelTx.hash,
        }
      } catch (error: any) {
        console.error('Error cancelling trade:', error)
        toast.dismiss('cancel-trade')
        toast.error(`Failed to cancel trade: ${error.reason || error.message}`)
        return { success: false }
      } finally {
        toast.dismiss('cancel-trade')
        setLoading(false)
      }
    },
    [getContract]
  )

  // Instasettle a trade
  const instasettle = useCallback(
    async (
      tradeId: number,
      signer: ethers.Signer
    ): Promise<{ success: boolean; txHash?: string }> => {
      try {
        setLoading(true)
        toast.loading('Processing instasettle...', { id: 'instasettle' })

        const contract = getContract(signer)

        // Get trade details
        const trade = await contract.getTrade(tradeId)

        // Check if the trade is instasettlable
        if (!trade.isInstasettlable) {
          toast.dismiss('instasettle')
          toast.error('This trade is not instasettlable')
          return { success: false }
        }

        // Calculate remaining amount
        const remainingAmountOut = trade.targetAmountOut.sub(
          trade.realisedAmountOut
        )
        if (remainingAmountOut.lte(0)) {
          toast.dismiss('instasettle')
          toast.error('No remaining amount to settle')
          return { success: false }
        }

        // Calculate settler payment
        const settlerPayment = remainingAmountOut
          .mul(10000 - trade.instasettleBps)
          .div(10000)

        // Check balance
        const tokenOutContract = new ethers.Contract(
          trade.tokenOut,
          erc20Abi,
          signer
        )
        const userAddress = await signer.getAddress()
        const tokenOutBalance = await tokenOutContract.balanceOf(userAddress)

        if (tokenOutBalance.lt(settlerPayment)) {
          const tokenOutDecimals = await getTokenDecimals(
            trade.tokenOut,
            signer
          )
          toast.dismiss('instasettle')
          toast.error(
            `Insufficient balance. Required: ${ethers.utils.formatUnits(
              settlerPayment,
              tokenOutDecimals
            )}`
          )
          return { success: false }
        }

        // Check and handle allowance
        const hasAllowance = await checkTokenAllowance(
          trade.tokenOut,
          CORE_CONTRACT_ADDRESS,
          settlerPayment,
          signer
        )
        if (!hasAllowance) {
          const approved = await approveToken(
            trade.tokenOut,
            CORE_CONTRACT_ADDRESS,
            settlerPayment,
            signer
          )
          if (!approved) {
            return { success: false }
          }
        }

        // Estimate gas
        const gasEstimate = await contract.estimateGas.instasettle(tradeId)

        // Execute instasettle
        const instasettleTx = await contract.instasettle(tradeId, {
          gasLimit: gasEstimate.mul(120).div(100),
        })

        toast.loading('Waiting for confirmation...', { id: 'instasettle' })
        await instasettleTx.wait()

        toast.success('Trade instasettled successfully!', { id: 'instasettle' })

        return {
          success: true,
          txHash: instasettleTx.hash,
        }
      } catch (error: any) {
        console.error('Error instasettling trade:', error)
        toast.dismiss('instasettle')
        toast.error(`Failed to instasettle: ${error.reason || error.message}`)
        return { success: false }
      } finally {
        toast.dismiss('instasettle')
        setLoading(false)
      }
    },
    [getContract, getTokenDecimals, checkTokenAllowance, approveToken]
  )

  // Get trades by token pair
  const getTradesByPair = useCallback(
    async (tokenIn: string, tokenOut: string): Promise<TradeData[]> => {
      try {
        setLoading(true)
        const contract = getContract()

        const pairId = ethers.utils.keccak256(
          ethers.utils.defaultAbiCoder.encode(
            ['address', 'address'],
            [tokenIn, tokenOut]
          )
        )

        const tradeIds = await contract.getPairIdTradeIds(pairId)
        const trades: TradeData[] = []

        for (const tradeId of tradeIds) {
          const trade = await getTrade(tradeId.toNumber())
          if (trade) {
            trades.push(trade)
          }
        }

        return trades
      } catch (error: any) {
        console.error('Error getting trades by pair:', error)
        toast.error(
          `Failed to get trades by pair: ${error.reason || error.message}`
        )
        return []
      } finally {
        setLoading(false)
      }
    },
    [getContract, getTrade]
  )

  return {
    // State
    loading,
    contractInfo,

    // Functions
    getContractInfo,
    getTrade,
    getRecentTrades,
    placeTrade,
    cancelTrade,
    instasettle,
    getTradesByPair,

    // Helper functions (exported in case needed)
    getTokenDecimals,
    checkTokenAllowance,
    approveToken,
  }
}
