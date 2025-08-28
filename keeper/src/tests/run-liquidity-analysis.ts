import {
  runLiquidityAnalysis,
  runLiquidityAnalysisFromJson,
} from './liquidity-analysis'

async function main() {
  try {
    console.log('Starting liquidity analysis...')
    await runLiquidityAnalysisFromJson('src/tests/tokens-list-28-08-2025.json')
    console.log('Liquidity analysis completed successfully!')
  } catch (error) {
    console.error('Error running liquidity analysis:', error)
    process.exit(1)
  }
}

main()
