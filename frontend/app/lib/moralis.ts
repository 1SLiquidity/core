import Moralis from 'moralis'
import { EvmChain } from 'moralis/common-evm-utils'

// Initialize Moralis
export const initMoralis = async () => {
  if (!Moralis.Core.isStarted) {
    await Moralis.start({
      apiKey: process.env.NEXT_PUBLIC_MORALIS_API_KEY,
    })
  }
}

// Chain mapping to convert string identifiers to EvmChain objects
export const CHAIN_MAPPING: { [key: string]: typeof EvmChain.ETHEREUM } = {
  eth: EvmChain.ETHEREUM,
  ethereum: EvmChain.ETHEREUM,
  bsc: EvmChain.BSC,
  polygon: EvmChain.POLYGON,
  avalanche: EvmChain.AVALANCHE,
  fantom: EvmChain.FANTOM,
  cronos: EvmChain.CRONOS,
  arbitrum: EvmChain.ARBITRUM,
}

export interface TokenData {
  token_address: string
  name: string
  symbol: string
  logo?: string
  thumbnail?: string
  decimals: number
  balance: string
  possible_spam: boolean
  verified_collection?: boolean
  value?: number
  status: 'increase' | 'decrease'
  statusAmount: number
  usd_price: number
  usdPrice24hrPercentChange?: number
}

interface TokenPriceData {
  usd_price: number
  percent_change_24h: number
}

interface TokenPrices {
  [key: string]: TokenPriceData
}

/**
 * Fetch tokens for a wallet address
 * @param address Wallet address
 * @param chain Chain to fetch tokens from (e.g., 'eth', 'bsc', 'polygon')
 * @returns Array of token data
 */
export const getWalletTokens = async (
  address: string,
  chain: string = 'eth'
): Promise<TokenData[]> => {
  try {
    await initMoralis()

    // Convert string chain to EvmChain object
    const evmChain = CHAIN_MAPPING[chain.toLowerCase()] || EvmChain.ETHEREUM

    // Get token balances
    const response = await Moralis.EvmApi.token.getWalletTokenBalances({
      address,
      chain: evmChain,
    })

    console.log('Token balances response ====>', response)

    // Get native balance (ETH, BNB, MATIC, etc.) - important to include native token
    const nativeBalanceResponse = await Moralis.EvmApi.balance.getNativeBalance(
      {
        address,
        chain: evmChain,
      }
    )

    console.log('Native balance response ====>', nativeBalanceResponse)

    const nativeBalance = nativeBalanceResponse.toJSON()

    // Get token balances from response
    let tokenBalances = response.toJSON()

    // Get token prices to calculate USD values
    const tokenAddresses = tokenBalances.map((token) => token.token_address)
    let tokenPrices: TokenPrices = {}

    // Get native token price (e.g., ETH, BNB)
    let nativeTokenPrice = {
      usd_price: 0,
      percent_change_24h: 0,
    }

    // Native token symbols map for different chains
    const nativeTokens: { [key: string]: { symbol: string; name: string } } = {
      eth: { symbol: 'ETH', name: 'Ethereum' },
      bsc: { symbol: 'BNB', name: 'Binance Coin' },
      polygon: { symbol: 'MATIC', name: 'Polygon' },
      avalanche: { symbol: 'AVAX', name: 'Avalanche' },
      arbitrum: { symbol: 'ETH', name: 'Ethereum' }, // Arbitrum uses ETH
    }

    // Fetch native token price
    try {
      // For ETH, we use a special endpoint
      let priceResponse

      if (
        chain.toLowerCase() === 'eth' ||
        chain.toLowerCase() === 'ethereum' ||
        chain.toLowerCase() === 'arbitrum'
      ) {
        priceResponse = await Moralis.EvmApi.token.getTokenPrice({
          chain: evmChain,
          address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH contract address
        })
      } else {
        // For other chains, use their native wrapped token
        const nativeTokenAddresses: { [key: string]: string } = {
          bsc: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c', // WBNB
          polygon: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270', // WMATIC
          avalanche: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7', // WAVAX
        }

        const nativeWrappedAddress = nativeTokenAddresses[chain.toLowerCase()]
        if (nativeWrappedAddress) {
          priceResponse = await Moralis.EvmApi.token.getTokenPrice({
            chain: evmChain,
            address: nativeWrappedAddress,
          })
        }
      }

      if (priceResponse) {
        const priceData = priceResponse.toJSON()
        nativeTokenPrice = {
          usd_price: priceData.usdPrice || 0,
          percent_change_24h: priceData['24hrPercentChange']
            ? parseFloat(priceData['24hrPercentChange'])
            : 0,
        }
      }
    } catch (nativePriceError) {
      console.warn(
        `Error fetching native token price for ${chain}:`,
        nativePriceError
      )
    }

    // Add native token to the list of tokens
    const nativeTokenData: TokenData = {
      token_address: '0x0000000000000000000000000000000000000000', // Use zero address for native token
      name: nativeTokens[chain.toLowerCase()]?.name || 'Native Token',
      symbol: nativeTokens[chain.toLowerCase()]?.symbol || 'NATIVE',
      decimals: 18, // Most native tokens have 18 decimals
      balance: nativeBalance.balance,
      possible_spam: false,
      usd_price: nativeTokenPrice.usd_price || 0, // Ensure it's always a number
      status:
        nativeTokenPrice.percent_change_24h >= 0 ? 'increase' : 'decrease',
      statusAmount: Math.abs(nativeTokenPrice.percent_change_24h),
    }

    if (tokenAddresses.length > 0) {
      // Using getTokenPrice for each token since getTokensPrice may not be available
      for (const tokenAddress of tokenAddresses) {
        try {
          const priceResponse = await Moralis.EvmApi.token.getTokenPrice({
            chain: evmChain,
            address: tokenAddress,
          })

          const priceData = priceResponse.toJSON()

          // Since we may not have percent change data from the API,
          // We'll set a default value
          tokenPrices[tokenAddress] = {
            usd_price: priceData.usdPrice || 0,
            percent_change_24h: priceData['24hrPercentChange']
              ? parseFloat(priceData['24hrPercentChange'])
              : 0, // Parse string to number
          }
        } catch (individualPriceError: any) {
          // Don't log 404 errors for insufficient liquidity - this is normal for many tokens
          if (
            individualPriceError?.message?.includes('404') &&
            individualPriceError?.message?.includes('Insufficient liquidity')
          ) {
            // For tokens with insufficient liquidity, set price to 0 but don't log error
            tokenPrices[tokenAddress] = {
              usd_price: 0,
              percent_change_24h: 0,
            }
          } else {
            // Log other errors
            console.warn(
              `Error fetching price for token ${tokenAddress}:`,
              individualPriceError
            )

            // Still set price to 0 for error cases
            tokenPrices[tokenAddress] = {
              usd_price: 0,
              percent_change_24h: 0,
            }
          }
        }
      }
    }

    // Combine token balances with prices and filter out tokens with no price or insufficient liquidity
    let tokensWithPrices = tokenBalances.map((token) => {
      const priceData = tokenPrices[token.token_address]
      return {
        ...token,
        usd_price: priceData?.usd_price || 0,
        status:
          (priceData?.percent_change_24h || 0) >= 0
            ? ('increase' as const)
            : ('decrease' as const),
        statusAmount: Math.abs(priceData?.percent_change_24h || 0),
      }
    })

    // Add the native token to the beginning of the array
    tokensWithPrices = [nativeTokenData, ...tokensWithPrices]

    // Filter out tokens with no price (insufficient liquidity)
    const validTokens = tokensWithPrices.filter((token) => {
      // Blacklist - tokens to always exclude
      const blacklistedTokens = [
        // Explicitly blacklist the tokens mentioned in your example
        '0xfaf87e196a29969094be35dfb0ab9d0b8518db84', // ACHIVX
        '0xca51cf6867c156347fcc63531fb18e808f427e12', // $3800
        '0xbac4cb8e7dd60f868cbc14b21a6dc249177d8bbe', // pepe
        '0x95e8799b6c3c7942e321ff95ee0a656fefe20bda', // UNI
        '0x8328ac89bffb92c928f0d60aecc593b801ed4c0b', // ETH-Tokens.us
      ]

      // Always exclude blacklisted tokens
      if (blacklistedTokens.includes(token.token_address.toLowerCase())) {
        return false
      }

      // Todo: Remove this once we have a proper whitelist
      // Whitelist - tokens to always include regardless of other filters
      const whitelistedTokens = [
        // Alienzone token address
        '0x888aaa48ebea87c74f690189e947d2c679705972',
        // Common standard tokens
        '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9', // USDT
        '0x82af49447d8a07e3bd95bd0d56f35241523fbab1', // WETH
        '0x561877b6b3dd7651313794e5f2894b2f18be0766', // MATIC
      ]

      // Always include whitelisted tokens
      if (whitelistedTokens.includes(token.token_address.toLowerCase())) {
        return true
      }

      // Skip tokens that are marked as possible spam
      if (token.possible_spam === true) {
        return false
      }

      // Skip tokens with suspicious names or symbols that contain URLs or common spam patterns
      const suspiciousPatterns = [
        'visit',
        'swap',
        'claim',
        'airdrop',
        'http',
        '.xyz',
        '.pro',
        '.io',
        '.us',
        'get',
        'free',
        'bonus',
        'win',
        'lucky',
        'prize',
        'giveaway',
      ]

      const symbolLower = (token.symbol || '').toLowerCase()
      const nameLower = (token.name || '').toLowerCase()

      const hasSpamPattern = suspiciousPatterns.some(
        (pattern) =>
          symbolLower.includes(pattern.toLowerCase()) ||
          nameLower.includes(pattern.toLowerCase())
      )

      if (hasSpamPattern) {
        return false
      }

      // Keep tokens with price data or native token or tokens with actual balance that passed spam checks
      return (
        token.usd_price > 0 ||
        token.token_address === '0x0000000000000000000000000000000000000000' ||
        parseFloat(token.balance) > 0
      )
    })

    return validTokens
  } catch (error) {
    console.warn('Error fetching wallet tokens:', error)
    return []
  }
}

/**
 * Calculate the total wallet balance in USD
 * @param tokens Array of token data from Moralis
 * @returns Total wallet balance in USD
 */
export const calculateWalletBalance = (tokens: TokenData[]): number => {
  return tokens.reduce((total, token) => {
    const tokenBalance = parseFloat(token.balance) / 10 ** token.decimals
    const tokenValue = tokenBalance * (token.usd_price || 0)
    return total + tokenValue
  }, 0)
}

/**
 * Format tokens data to match the app's token format
 * @param tokens Array of token data from Moralis
 * @returns Formatted token data matching the app's TOKENS_TYPE structure
 */
export const formatTokensData = (tokens: TokenData[]) => {
  return tokens.map((token) => {
    // Calculate token value in native units
    const tokenValue = parseFloat(token.balance) / 10 ** token.decimals

    return {
      name: token.name || 'Unknown Token',
      symbol: token.symbol || 'UNKNOWN',
      icon:
        token.thumbnail ||
        token.logo ||
        `/tokens/${token.symbol?.toLowerCase()}.svg`,
      popular: false, // Default value, you may want to customize this based on your app logic
      value: tokenValue, // Value in native token units (e.g., ETH, not USD)
      status: token.status || 'increase', // Use token status from price data or default
      statusAmount: token.statusAmount || 0, // Use status amount from price data or default
      token_address: token.token_address,
      decimals: token.decimals,
      balance: token.balance,
      possible_spam: token.possible_spam,
      usd_price: token.usd_price || 0,
    }
  })
}
