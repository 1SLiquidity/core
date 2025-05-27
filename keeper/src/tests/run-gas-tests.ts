import { testGasCalculations } from './gas-calculations';

async function runTests() {
  try {
    // Test with WETH/USDC pair
    // console.log('\nTesting WETH/USDC pair:');
    // const wethUsdcResult = await testGasCalculations(
    //   '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
    //   '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
    //   '33.0' // 33 ETH
    // );
    // console.log('WETH/USDC Results:', {
    //   botGasLimit: wethUsdcResult.botGasLimit.toString(),
    //   streamCount: wethUsdcResult.streamCount,
    // });

    const usdcUsdtResult = await testGasCalculations(
      '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
      '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT
      '100.0' // 100 ETH
    );
    console.log('USDC/USDT Results:', {
      botGasLimit: usdcUsdtResult.botGasLimit.toString(),
      streamCount: usdcUsdtResult.streamCount,
    });

    // // Test with different trade volumes
    // console.log('\nTesting different trade volumes:');
    // const volumes = ['0.1', '1.0', '10.0', '100.0'];
    // for (const volume of volumes) {
    //   const result = await testGasCalculations(
    //     '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
    //     '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
    //     volume
    //   );
    //   console.log(`\nVolume: ${volume} ETH`);
    //   console.log('Results:', {
    //     botGasLimit: result.botGasLimit.toString(),
    //     gasPrice: result.gasPrice.toString(),
    //     streamCount: result.streamCount,
    //     tradeVolume: result.tradeVolume.toString()
    //   });
    // }

    // // Test with different token pairs
    // console.log('\nTesting different token pairs:');
    // const pairs = [
    //   {
    //     name: 'WETH/USDT',
    //     tokenA: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
    //     tokenB: '0xdAC17F958D2ee523a2206206994597C13D831ec7', // USDT
    //     volume: '1.0'
    //   },
    //   {
    //     name: 'WETH/DAI',
    //     tokenA: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
    //     tokenB: '0x6B175474E89094C44Da98b954EedeAC495271d0F', // DAI
    //     volume: '1.0'
    //   }
    // ];

    // for (const pair of pairs) {
    //   console.log(`\nTesting ${pair.name}:`);
    //   const result = await testGasCalculations(
    //     pair.tokenA,
    //     pair.tokenB,
    //     pair.volume
    //   );
    //   console.log('Results:', {
    //     botGasLimit: result.botGasLimit.toString(),
    //     gasPrice: result.gasPrice.toString(),
    //     streamCount: result.streamCount,
    //     tradeVolume: result.tradeVolume.toString()
    //   });
    // }

  } catch (error) {
    console.error('Error running tests:', error);
  }
}

// Run the tests
runTests().catch(console.error); 