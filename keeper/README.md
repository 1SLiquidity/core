# 1SLiquidity Keeper Service

Serverless service for fetching DEX data (prices, reserves) for the 1SLiquidity protocol.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
Create a `.env` file with:
```
INFURA_KEY=your_infura_key
```

## Development

Run the service locally:
```bash
npm run dev
```

The service will be available at:
- http://localhost:3000/dev/reserves?tokenA=0x...&tokenB=0x...

## Testing

Run tests:
```bash
npm test
```

## Deployment

Deploy to development:
```bash
npm run deploy:dev
```

Deploy to production:
```bash
npm run deploy:prod
```

## API Endpoints

### Get Reserves
```
GET /reserves?tokenA=0x...&tokenB=0x...
```

Response:
```json
[
  {
    "dex": "uniswap-v2",
    "pairAddress": "0x...",
    "reserves": {
      "token0": "1000000",
      "token1": "100"
    }
  },
  {
    "dex": "uniswap-v3-3000",
    "pairAddress": "0x...",
    "reserves": {
      "token0": "500000",
      "token1": "0"
    }
  }
]
``` 