import { analyzeTokenPairLiquidityComprehensive } from './liquidity-analysis'

async function testComprehensiveAnalysis() {
  console.log('🚀 Testing Comprehensive Liquidity Analysis...\n')

  // Example
  console.log('=== Testing Pair ===')
  const result1 = await analyzeTokenPairLiquidityComprehensive(
    '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
    '0x4d224452801aced8b2f0aebe155379bb5d594381' // AAVE
  )

  if (result1.success) {
    console.log('✅ Analysis completed!')
    console.log(`Found ${result1.data!.dexes.length} DEXes with liquidity`)
    console.log(`Sweet spot: ${result1.data!.sweetSpot} streams`)
    console.log(`Best DEX: ${result1.data!.summary.bestDex}`)
    console.log(
      `Slippage savings: ${result1.data!.slippageAnalysis.percentageSavings.toFixed(
        3
      )}%`
    )
  } else {
    console.log('❌ Analysis failed:', result1.error)
  }

  console.log('\n' + '='.repeat(50) + '\n')
}

// Run the test
// if (require.main === module) {
//   testComprehensiveAnalysis().catch(console.error)
// }

testComprehensiveAnalysis()

// export { testComprehensiveAnalysis }
