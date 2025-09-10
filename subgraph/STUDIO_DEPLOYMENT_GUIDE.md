# The Graph Studio Deployment Guide

## Prerequisites

1. **The Graph Studio Account**: Create an account at [The Graph Studio](https://thegraph.com/studio/)
2. **Deploy Key**: Get your deploy key from The Graph Studio
3. **GRT Tokens**: Have sufficient GRT tokens for deployment costs

## Step 1: Get Your Deploy Key

1. Go to [The Graph Studio](https://thegraph.com/studio/)
2. Sign in with your wallet
3. Create a new subgraph named `decastream-mainnet`
4. Copy the **Deploy Key** from the subgraph dashboard


## Step 2: Deploy to The Graph Studio

### Method 1: Using npm scripts (Recommended)
```bash
cd subgraph

# 1. Generate code
npm run codegen-mainnet

# 2. Build subgraph
npm run build-mainnet

# 3. Authenticate graph node
npm run auth-mainnet

# 3. Deploy to mainnet
npm run deploy-mainnet
```

### Method 2: Using direct commands
```bash
cd subgraph

# 1. Generate code
npx graph codegen subgraph-mainnet.yaml

# 2. Build subgraph
npx graph build subgraph-mainnet.yaml

# 3. Authenticate graph node
npx graph auth <GRAPH_ACCESS_TOKEN>

# 4. Deploy to mainnet
npx graph deploy --node https://api.thegraph.com/deploy/ decastream-mainnet subgraph-mainnet.yaml
```

## Step 4: Verify Deployment

1. Go to [The Graph Studio](https://thegraph.com/studio/)
2. Find your `decastream-mainnet` subgraph
3. Check that it shows "Syncing" status
4. Wait for initial indexing to complete

## Troubleshooting

### Common Issues:

#### "Authentication failed"
- Make sure your deploy key is correct
- Ensure the environment variable is set properly
- Try logging out and back into The Graph Studio

#### "Subgraph already exists"
- If you get this error on create, the subgraph already exists
- Skip the create step and go directly to deploy

#### "Insufficient GRT"
- Add more GRT tokens to your wallet
- Check your balance in The Graph Studio

#### "Invalid start block"
- Ensure start blocks are not in the future
- Make sure start blocks are after contract deployment

### Useful Commands:

```bash
# Check subgraph status
npx graph status --node https://api.thegraph.com/deploy/ decastream-mainnet

# Remove and redeploy (if needed)
npx graph remove --node https://api.thegraph.com/deploy/ decastream-mainnet
npx graph deploy --node https://api.thegraph.com/deploy/ decastream-mainnet subgraph-mainnet.yaml
```

## Next Steps After Deployment

1. **Monitor Indexing**: Watch the subgraph sync progress in The Graph Studio
2. **Test Queries**: Use the GraphQL playground to test your queries
3. **Update Frontend**: Point your frontend to the new subgraph endpoint
4. **Set Up Monitoring**: Configure alerts for subgraph health

## Subgraph Endpoint

Once deployed, your subgraph will be available at:
```
https://api.thegraph.com/subgraphs/name/your-username/decastream-mainnet
```

Replace `your-username` with your actual Graph Studio username.