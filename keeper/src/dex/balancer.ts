import { ethers } from 'ethers';
import { CONTRACT_ABIS, COMMON } from '../config/dex';
import { DecimalUtils } from '../utils/decimals';
import { TokenService } from '../services/token-service';

export interface BalancerPoolInfo {
  poolId: string;
  poolAddress: string;
  tokens: string[];
  balances: string[];
  totalSupply: string;
  swapFee: string;
  poolType: string;
}

export class BalancerService {
  private provider: ethers.Provider;
  private poolAddress: string;
  private vaultAddress: string;
  private tokenService: TokenService;

  constructor(provider: ethers.Provider, poolAddress: string, vaultAddress: string = '0xBA12222222228d8Ba445958a75a0704d566BF2C8') {
    this.provider = provider;
    this.poolAddress = poolAddress;
    this.vaultAddress = vaultAddress;
    this.tokenService = TokenService.getInstance(provider);
  }

  /**
   * Derive pool ID from pool address (pool address + 12 zero bytes)
   */
  private derivePoolId(): string {
    return this.poolAddress.toLowerCase() + '000000000000000000000000';
  }

  /**
   * Get pool information including tokens and balances
   */
  async getPoolInfo(): Promise<BalancerPoolInfo | null> {
    try {
      const vault = new ethers.Contract(this.vaultAddress, CONTRACT_ABIS.BALANCER.VAULT, this.provider);
      const pool = new ethers.Contract(this.poolAddress, CONTRACT_ABIS.BALANCER.POOL, this.provider);

      // Try to get pool ID from the pool contract first
      let poolId: string;
      try {
        poolId = await pool.getPoolId();
      } catch (e) {
        // If getPoolId() fails, derive pool ID from pool address
        poolId = this.derivePoolId();
      }
      
      // Get pool tokens and balances
      const [tokens, balances, lastChangeBlock] = await vault.getPoolTokens(poolId);
      
      // Get additional pool info from the pool contract
      let swapFee = '0';
      let poolType = 'Unknown';
      
      try {
        swapFee = await pool.getSwapFeePercentage();
      } catch (e) {
        // Some pools might not have this method
      }
      
      try {
        poolType = await pool.getPoolType();
      } catch (e) {
        // Some pools might not have this method
      }

      return {
        poolId,
        poolAddress: this.poolAddress,
        tokens: tokens.filter((token: string) => token !== COMMON.ZERO_ADDRESS),
        balances: balances.filter((balance: string, index: number) => tokens[index] !== COMMON.ZERO_ADDRESS),
        totalSupply: '0', // Balancer doesn't have totalSupply like Uniswap
        swapFee,
        poolType
      };
    } catch (error) {
      console.error(`Error getting Balancer pool info for ${this.poolAddress}:`, error);
      return null;
    }
  }

  /**
   * Get reserves for a specific token pair
   */
  async getReserves(tokenA: string, tokenB: string): Promise<{ reserves: { token0: string; token1: string }; dex: string; pairAddress: string; timestamp: number } | null> {
    try {
      const poolInfo = await this.getPoolInfo();
      if (!poolInfo) return null;

      // Find token indices
      const tokenAIndex = poolInfo.tokens.findIndex(token => token.toLowerCase() === tokenA.toLowerCase());
      const tokenBIndex = poolInfo.tokens.findIndex(token => token.toLowerCase() === tokenB.toLowerCase());

      if (tokenAIndex === -1 || tokenBIndex === -1) {
        console.log(`Tokens not found in pool ${this.poolAddress}: ${tokenA}, ${tokenB}`);
        return null;
      }

      console.log('Balancer reserves:', {
        token0: poolInfo.balances[tokenAIndex].toString(),
        token1: poolInfo.balances[tokenBIndex].toString()
      })

      // Return reserves in the order they appear in the pool
      return {
        reserves: {
          token0: poolInfo.balances[tokenAIndex].toString(),
          token1: poolInfo.balances[tokenBIndex].toString()
        },
        dex: `balancer-${this.poolAddress}`,
        pairAddress: this.poolAddress,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error(`Error getting Balancer reserves for ${tokenA}/${tokenB}:`, error);
      return null;
    }
  }

  /**
   * Get price for a token pair using Balancer's spot price calculation
   */
  async getPrice(tokenA: string, tokenB: string): Promise<{ price: string; dex: string; timestamp: number } | null> {
    try {
      const poolInfo = await this.getPoolInfo();
      if (!poolInfo) return null;

      // Find token indices
      const tokenAIndex = poolInfo.tokens.findIndex(token => token.toLowerCase() === tokenA.toLowerCase());
      const tokenBIndex = poolInfo.tokens.findIndex(token => token.toLowerCase() === tokenB.toLowerCase());

      if (tokenAIndex === -1 || tokenBIndex === -1) {
        console.log(`Tokens not found in pool ${this.poolAddress}: ${tokenA}, ${tokenB}`);
        return null;
      }

      // Get token decimals
      const [token0Info, token1Info] = await Promise.all([
        this.tokenService.getTokenInfo(tokenA),
        this.tokenService.getTokenInfo(tokenB)
      ]);

      // Calculate spot price: balanceB / balanceA
      const balanceA = BigInt(poolInfo.balances[tokenAIndex]);
      const balanceB = BigInt(poolInfo.balances[tokenBIndex]);

      if (balanceA === 0n) {
        console.log(`Zero balance for tokenA in pool ${this.poolAddress}`);
        return null;
      }

      // Use DecimalUtils to properly calculate price with correct decimals
      const price = DecimalUtils.calculatePrice(
        balanceA,
        balanceB,
        token0Info.decimals,
        token1Info.decimals
      );

      return {
        price,
        dex: `balancer-${this.poolAddress}`,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error(`Error getting Balancer price for ${tokenA}/${tokenB}:`, error);
      return null;
    }
  }

  /**
   * Check if a pool contains both tokens
   */
  async hasTokens(tokenA: string, tokenB: string): Promise<boolean> {
    try {
      const poolInfo = await this.getPoolInfo();
      if (!poolInfo) return false;

      const hasTokenA = poolInfo.tokens.some(token => token.toLowerCase() === tokenA.toLowerCase());
      const hasTokenB = poolInfo.tokens.some(token => token.toLowerCase() === tokenB.toLowerCase());

      return hasTokenA && hasTokenB;
    } catch (error) {
      console.error(`Error checking tokens in pool ${this.poolAddress}:`, error);
      return false;
    }
  }
}
