import { ethers } from 'ethers'

// Free public fallback RPC endpoints
const FALLBACK_RPCS = [
  'https://cloudflare-eth.com',
  'https://rpc.ankr.com/eth',
  'https://eth.drpc.org',
]

/**
 * Creates an optimized JsonRpcProvider with better settings for rate limiting
 * and fallback capability
 */
export function createProvider(): ethers.JsonRpcProvider {
  // Start with the primary RPC from env vars
  const primaryRpcUrl = process.env.RPC_URL

  if (!primaryRpcUrl) {
    throw new Error('RPC_URL environment variable is not set')
  }

  // Provider options to optimize for rate limiting and timeouts
  const providerOptions = {
    polling: false, // Disable polling to reduce requests
    staticNetwork: true,
    batchStallTime: 50, // ms to wait for more requests before sending a batch
    batchMaxSize: 1, // Send individual requests to avoid batch timeouts
    cacheTimeout: 1000, // Shorter cache timeout
    requestTimeout: 12000, // 12 second timeout for individual requests
  }

  const provider = new ethers.JsonRpcProvider(
    primaryRpcUrl,
    undefined,
    providerOptions
  )

  // Add error handling that could switch to fallback RPCs in the future
  provider.on('error', (error) => {
    console.error('Provider error:', error)
    // Could implement fallback logic here in the future
  })

  return provider
}
