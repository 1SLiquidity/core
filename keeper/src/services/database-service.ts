import { PrismaClient } from '../../generated/prisma'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config()

class DatabaseService {
  private static instance: DatabaseService
  private prisma: PrismaClient

  private constructor() {
    this.prisma = new PrismaClient({
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'info', 'warn', 'error']
          : ['error'],
    })
  }

  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService()
    }
    return DatabaseService.instance
  }

  public getClient(): PrismaClient {
    return this.prisma
  }

  public async connect(): Promise<void> {
    try {
      await this.prisma.$connect()
      console.log('✅ Database connected successfully')
    } catch (error) {
      console.error('❌ Database connection failed:', error)
      throw error
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await this.prisma.$disconnect()
      console.log('✅ Database disconnected successfully')
    } catch (error) {
      console.error('❌ Database disconnection failed:', error)
      throw error
    }
  }

  public async healthCheck(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`
      return true
    } catch (error) {
      console.error('❌ Database health check failed:', error)
      return false
    }
  }

  public async testConnection(): Promise<void> {
    try {
      await this.connect()
      const isHealthy = await this.healthCheck()
      if (isHealthy) {
        console.log('✅ Database test connection successful')
      } else {
        throw new Error('Health check failed')
      }
    } catch (error) {
      console.error('❌ Database test connection failed:', error)
      throw error
    } finally {
      await this.disconnect()
    }
  }

  // Liquidity data specific methods
  public async saveLiquidityData(data: any) {
    try {
      const result = await this.prisma.liquidityData.upsert({
        where: {
          tokenAAddress_tokenBAddress_timestamp: {
            tokenAAddress: data.tokenAAddress,
            tokenBAddress: data.tokenBAddress,
            timestamp: data.timestamp,
          },
        },
        update: {
          marketCap: data.marketCap,
          reservesAUniswapV2: data.reservesAUniswapV2,
          reservesBUniswapV2: data.reservesBUniswapV2,
          reservesASushiswap: data.reservesASushiswap,
          reservesBSushiswap: data.reservesBSushiswap,
          reservesAUniswapV3_500: data.reservesAUniswapV3_500,
          reservesBUniswapV3_500: data.reservesBUniswapV3_500,
          reservesAUniswapV3_3000: data.reservesAUniswapV3_3000,
          reservesBUniswapV3_3000: data.reservesBUniswapV3_3000,
          reservesAUniswapV3_10000: data.reservesAUniswapV3_10000,
          reservesBUniswapV3_10000: data.reservesBUniswapV3_10000,
          updatedAt: new Date(),
        },
        create: data,
      })
      return result
    } catch (error) {
      console.error('❌ Error saving liquidity data:', error)
      throw error
    }
  }

  public async saveBatchLiquidityData(dataArray: any[]) {
    try {
      const results = await this.prisma.$transaction(
        dataArray.map((data) =>
          this.prisma.liquidityData.upsert({
            where: {
              tokenAAddress_tokenBAddress_timestamp: {
                tokenAAddress: data.tokenAAddress,
                tokenBAddress: data.tokenBAddress,
                timestamp: data.timestamp,
              },
            },
            update: {
              marketCap: data.marketCap,
              reservesAUniswapV2: data.reservesAUniswapV2,
              reservesBUniswapV2: data.reservesBUniswapV2,
              reservesASushiswap: data.reservesASushiswap,
              reservesBSushiswap: data.reservesBSushiswap,
              reservesAUniswapV3_500: data.reservesAUniswapV3_500,
              reservesBUniswapV3_500: data.reservesBUniswapV3_500,
              reservesAUniswapV3_3000: data.reservesAUniswapV3_3000,
              reservesBUniswapV3_3000: data.reservesBUniswapV3_3000,
              reservesAUniswapV3_10000: data.reservesAUniswapV3_10000,
              reservesBUniswapV3_10000: data.reservesBUniswapV3_10000,
              updatedAt: new Date(),
            },
            create: data,
          })
        )
      )
      return results
    } catch (error) {
      console.error('❌ Error saving batch liquidity data:', error)
      throw error
    }
  }

  public async getLiquidityData(
    tokenAAddress?: string,
    tokenBAddress?: string,
    startDate?: Date,
    endDate?: Date,
    limit: number = 100
  ) {
    try {
      const where: any = {}

      if (tokenAAddress) where.tokenAAddress = tokenAAddress
      if (tokenBAddress) where.tokenBAddress = tokenBAddress
      if (startDate || endDate) {
        where.timestamp = {}
        if (startDate) where.timestamp.gte = startDate
        if (endDate) where.timestamp.lte = endDate
      }

      const result = await this.prisma.liquidityData.findMany({
        where,
        orderBy: {
          timestamp: 'desc',
        },
        take: limit,
      })

      return result
    } catch (error) {
      console.error('❌ Error getting liquidity data:', error)
      throw error
    }
  }

  public async getLatestLiquidityData(limit: number = 50) {
    try {
      const result = await this.prisma.liquidityData.findMany({
        orderBy: {
          timestamp: 'desc',
        },
        take: limit,
      })

      return result
    } catch (error) {
      console.error('❌ Error getting latest liquidity data:', error)
      throw error
    }
  }

  public async cleanupOldData(daysToKeep: number = 90) {
    try {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

      const result = await this.prisma.liquidityData.deleteMany({
        where: {
          timestamp: {
            lt: cutoffDate,
          },
        },
      })

      console.log(
        `🧹 Cleaned up ${result.count} old liquidity records older than ${daysToKeep} days`
      )
      return result
    } catch (error) {
      console.error('❌ Error cleaning up old data:', error)
      throw error
    }
  }
}

export default DatabaseService
export { DatabaseService }
