#!/usr/bin/env ts-node

/**
 * CLI script to analyze liquidity for any token pair
 * 
 * Usage:
 *   npx ts-node src/tests/analyze-liquidity-test.ts <tokenAAddress> <tokenBAddress>
 * 
 * Examples:
 *   npx ts-node src/tests/analyze-liquidity.ts 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2
 *   npx ts-node src/tests/analyze-liquidity.ts 0x514910771AF9Ca656af840dff83E8264EcF986CA 0x6B175474E89094C44Da98b954EedeAC495271d0F
 */

import { analyzeTokenPairLiquidityComprehensive } from './liquidity-analysis'

async function main() {
  const args = process.argv.slice(2)
  
  if (args.length < 2) {
    console.log('Usage: npx ts-node src/tests/analyze-liquidity-test.ts <tokenAAddress> <tokenBAddress>')
    console.log('')
    console.log('Examples:')
    console.log('  npx ts-node src/tests/analyze-liquidity-test.ts 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2')
    console.log('  npx ts-node src/tests/analyze-liquidity-test.ts 0x514910771AF9Ca656af840dff83E8264EcF986CA 0x6B175474E89094C44Da98b954EedeAC495271d0F')
    console.log('')
    console.log('Common Token Addresses:')
    console.log('  USDC: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48')
    console.log('  WETH: 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2')
    console.log('  USDT: 0xdAC17F958D2ee523a2206206994597C13D831ec7')
    console.log('  WBTC: 0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599')
    console.log('  DAI:  0x6B175474E89094C44Da98b954EedeAC495271d0F')
    console.log('  LINK: 0x514910771AF9Ca656af840dff83E8264EcF986CA')
    process.exit(1)
  }
  
  const tokenAAddress = args[0]
  const tokenBAddress = args[1]
  
  console.log('🚀 Starting liquidity analysis...')
  console.log(`Token A: ${tokenAAddress}`)
  console.log(`Token B: ${tokenBAddress}`)
  console.log('')
  
  try {
    const result = await analyzeTokenPairLiquidityComprehensive(
      tokenAAddress,
      tokenBAddress
    )
    
    if (result.success) {
      console.log('\n✅ Analysis completed successfully!')
      console.log('=' .repeat(50))
      console.log(`Token Pair: ${result.data!.tokenA.symbol}/${result.data!.tokenB.symbol}`)
      console.log(`Total DEXes: ${result.data!.summary.totalDexes}`)
      console.log(`Sweet Spot: ${result.data!.sweetSpot} streams`)
      console.log(`Best DEX: ${result.data!.summary.bestDex}`)
      console.log(`Slippage Savings: ${result.data!.slippageAnalysis.percentageSavings.toFixed(3)}%`)
      console.log(`Total Liquidity: ${result.data!.summary.totalLiquidityUSD.toFixed(2)}`)
      
      console.log('\nDEX Breakdown:')
      result.data!.dexes.forEach(dex => {
        console.log(`  ${dex.name}: ${dex.reservesNormal.tokenA.toFixed(2)} ${result.data!.tokenA.symbol} / ${dex.reservesNormal.tokenB.toFixed(6)} ${result.data!.tokenB.symbol}`)
      })
    } else {
      console.log('\n❌ Analysis failed:', result.error)
      process.exit(1)
    }
  } catch (error) {
    console.error('\n❌ Unexpected error:', error)
    process.exit(1)
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main().catch(console.error)
}

export { main }
