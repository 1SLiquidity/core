import { ethers } from 'ethers';

// DEX Factory Addresses
const DEX_ADDRESSES = {
  UNISWAP_V2: {
    FACTORY: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
    ROUTER: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D'
  },
  UNISWAP_V3: {
    FACTORY: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    QUOTER: '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6'
  },
  BALANCER: {
    VAULT: '0xBA12222222228d8Ba445958a75a0704d566BF2C8'
  },
  CURVE: {
    REGISTRY: '0x90E00ACe148ca3b23Ac1bC8C240C2a7Dd9c2d7f5'
  }
};

// Factory ABIs
const FACTORY_ABIS = {
  UNISWAP_V2: [
    'function getPair(address tokenA, address tokenB) external view returns (address pair)'
  ],
  UNISWAP_V3: [
    'function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)'
  ]
};

// Pair ABIs
const PAIR_ABIS = {
  UNISWAP_V2: [
    'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
    'function token0() external view returns (address)',
    'function token1() external view returns (address)'
  ],
  UNISWAP_V3: [
    'function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
    'function liquidity() external view returns (uint128)'
  ]
};

export interface ReserveData {
  dex: string;
  pairAddress: string;
  reserves: {
    token0: string;
    token1: string;
  };
}

export class DEXService {
  private provider: ethers.JsonRpcProvider;

  constructor() {
    const rpcUrl = process.env.RPC_URL;
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
  }

  async getReserves(tokenA: string, tokenB: string): Promise<ReserveData[]> {
    const results: ReserveData[] = [];

    // Uniswap V2
    try {
      const uniswapV2Factory = new ethers.Contract(
        DEX_ADDRESSES.UNISWAP_V2.FACTORY,
        FACTORY_ABIS.UNISWAP_V2,
        this.provider
      );

      const pairAddress = await uniswapV2Factory.getPair(tokenA, tokenB);
      if (pairAddress !== ethers.ZeroAddress) {
        const pair = new ethers.Contract(pairAddress, PAIR_ABIS.UNISWAP_V2, this.provider);
        const [reserve0, reserve1] = await pair.getReserves();
        const token0 = await pair.token0();
        
        results.push({
          dex: 'uniswap-v2',
          pairAddress,
          reserves: {
            token0: reserve0.toString(),
            token1: reserve1.toString()
          }
        });
      }
    } catch (error) {
      console.error('Error fetching Uniswap V2 reserves:', error);
    }

    // Uniswap V3
    try {
      const uniswapV3Factory = new ethers.Contract(
        DEX_ADDRESSES.UNISWAP_V3.FACTORY,
        FACTORY_ABIS.UNISWAP_V3,
        this.provider
      );

      // Try different fee tiers
      const feeTiers = [500, 3000, 10000];
      for (const fee of feeTiers) {
        const poolAddress = await uniswapV3Factory.getPool(tokenA, tokenB, fee);
        if (poolAddress !== ethers.ZeroAddress) {
          const pool = new ethers.Contract(poolAddress, PAIR_ABIS.UNISWAP_V3, this.provider);
          const liquidity = await pool.liquidity();
          
          results.push({
            dex: `uniswap-v3-${fee}`,
            pairAddress: poolAddress,
            reserves: {
              token0: liquidity.toString(),
              token1: '0' // V3 uses different reserve calculation
            }
          });
        }
      }
    } catch (error) {
      console.error('Error fetching Uniswap V3 reserves:', error);
    }

    // Note: Balancer and Curve implementations would go here


    return results;
  }
} 