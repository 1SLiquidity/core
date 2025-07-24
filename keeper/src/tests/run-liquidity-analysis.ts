import { runLiquidityAnalysis } from './liquidity-analysis';

async function main() {
  try {
    console.log('Starting liquidity analysis...');
    await runLiquidityAnalysis();
    console.log('Liquidity analysis completed successfully!');
  } catch (error) {
    console.error('Error running liquidity analysis:', error);
    process.exit(1);
  }
}

main(); 