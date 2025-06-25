import { testGasCalculations, testSlippageSavings } from './gas-calculations';

async function runTests() {
  try {

    // console.log('\nTesting USDC/WBTC pair:');
    // const wethUsdcResult = await testGasCalculations(
    //   '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
    //   '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', // WBTC
    //   '10000' // 10000 USDC
    // );
    // console.log('USDC/WBTC Results:', {
    //   botGasLimit: wethUsdcResult.botGasLimit.toString(),
    //   streamCount: wethUsdcResult.streamCount,
    // });

    // console.log('\nTesting WBTC/USDC pair:');
    // const wethUsdcResult2 = await testGasCalculations(
    //   '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', // WBTC
    //   '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
    //   '1' // 1 WBTC
    // );
    // console.log('WBTC/USDC Results:', {
    //   botGasLimit: wethUsdcResult2.botGasLimit.toString(),
    //   streamCount: wethUsdcResult2.streamCount,
    // });

    // console.log('\nTesting PEPE/WBTC pair:');
    // const wethUsdcResult3 = await testGasCalculations(
    //   '0x6982508145454Ce325dDbE47a25d4ec3d2311933', // PEPE
    //   '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', // WBTC
    //   '10000' // 10000 PEPE
    // );
    // console.log('PEPE/WBTC Results:', {
    //   botGasLimit: wethUsdcResult3.botGasLimit.toString(),
    //   streamCount: wethUsdcResult3.streamCount,
    // });

    // console.log('\nTesting WETH/USDC pair:');
    // const wethUsdcResult4 = await testGasCalculations(
    //   '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
    //   '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
    //   '10' // 10 WETH
    // );
    // console.log('WETH/USDC Results:', {
    //   botGasLimit: wethUsdcResult4.botGasLimit.toString(),
    //   streamCount: wethUsdcResult4.streamCount,
    // });

    console.log('\nTesting slippage savings for USDC/WBTC pair:');
    const slippageSavings = await testSlippageSavings(
      '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
      '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', // WBTC
      '100000' // 10000 USDC
    );
    console.log('Slippage savings:', slippageSavings);

  } catch (error) {
    console.error('Error running tests:', error);
  }
}

// Run the tests
runTests().catch(console.error); 