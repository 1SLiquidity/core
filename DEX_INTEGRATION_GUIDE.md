# DEX Integration Guide - Retroactive Addition

This guide explains how to retroactively add new DEXs to decastream.

## 🎯 **Current Architecture**

✅ **Eternal Pattern - No Core Redeployments**  
✅ **Dynamic DEX Addition/Removal**  
✅ **Plug-and-Play Fetchers**  
✅ **Owner Controlled Config**  
✅ **Gas Efficient: ~420k Gas Per New DEX**

## 🏗️ **Architecture Overview**

```
Core.sol → StreamDaemon.sol → DEX Fetchers → Registry.sol → Executor.sol
    ↓              ↓              ↓              ↓           ↓
Storage    DEX Management   Reserve Fetching   Router Config   Trade Execution
```

## 📋 **Current Supported DEXes**

| DEX       | Fetcher | Router | Status |
| --------- | ------- | ------ | ------ |
| UniswapV2 | ✅      | ✅     | Active |
| UniswapV3 | ✅      | ✅     | Active |
| Sushiswap | ✅      | ✅     | Active |
| Balancer  | ✅      | ✅     | Active |
| Curve     | ✅      | ✅     | Active |

## 🚀 **Adding New DEXs**

### **Step 1: Create DEX Fetcher**

```solidity
// this example is solely for making a PancakeSwap fetcher. Different DEXs require custom implementations!!!
contract PancakeSwapFetcher is IUniversalDexInterface {
    address public factory;

    constructor(address _factory) {
        factory = _factory;
    }

    function getReserves(address tokenA, address tokenB)
        external
        view
        override
        returns (uint256 reserveA, uint256 reserveB)
    {
        // N.B this is DEX specific, the following is simply an example for Pancake swap
        address pair = IUniswapV2Factory(factory).getPair(tokenA, tokenB);
        require(pair != address(0), "Pair does not exist");

        (uint112 reserve0, uint112 reserve1,) = IUniswapV2Pair(pair).getReserves();
        address token0 = IUniswapV2Pair(pair).token0();

        if (tokenA == token0) {
            return (uint256(reserve0), uint256(reserve1));
        } else {
            return (uint256(reserve1), uint256(reserve0));
        }
    }

    function getPoolAddress(address tokenIn, address tokenOut)
        external
        view
        override
        returns (address)
    {
        return IUniswapV2Factory(factory).getPair(tokenIn, tokenOut);
    }

    function getDexType() external pure override returns (string memory) {
        return "PancakeSwap"; // Must match Registry configuration
    }

    function getDexVersion() external pure override returns (string memory) {
        return "V2";
    }
}
```

### **Step 2: Deploy Fetcher**

```bash
# deploy to mainnet
forge create src/adapters/PancakeSwapFetcher.sol:PancakeSwapFetcher \
    --rpc-url $MAINNET_RPC_URL \
    --private-key $PRIVATE_KEY \
    --constructor-args 0x10ED43C718714eb63d5aA57B78B54704E256024E
```

### **Step 3: Register DEX in StreamDaemon**

```solidity
// calling all followings as owner

streamDaemon.registerDex(address(pancakeSwapFetcher));
```

### **Step 4: Configure Router in Registry**

```solidity
registry.setRouter("PancakeSwap", 0x10ED43C718714eb63d5aA57B78B54704E256024E);
```

### **Step 5: Add Registry Support (if needed)**

```solidity
// In Registry.sol, add new DEX type handling
} else if (_compareStrings(dexType, "PancakeSwap")) {
    tradeData = _preparePancakeSwapTrade(tokenIn, tokenOut, amount, minOut, recipient, router);
}

function _preparePancakeSwapTrade(
    address tokenIn,
    address tokenOut,
    uint256 amount,
    uint256 minOut,
    address recipient,
    address router
) internal pure returns (TradeData memory) {
    bytes memory params = abi.encode(
        tokenIn,
        tokenOut,
        amount,
        minOut,
        recipient,
        router
    );

    return TradeData({
        selector: Executor.executeUniswapV2Trade.selector, // Same as UniswapV2
        router: router,
        params: params
    });
}
```

## 🔧 **DEX Integration Patterns**

### **Pattern 1: UniswapV2-Compatible DEXes**

- **Examples**: PancakeSwap, SushiSwap, TraderJoe
- **Implementation**: Use same interface as UniswapV2
- **Executor**: `executeUniswapV2Trade`

### **Pattern 2: UniswapV3-Compatible DEXes**

- **Examples**: PancakeSwapV3, SushiSwapV3
- **Implementation**: Use same interface as UniswapV3
- **Executor**: `executeUniswapV3Trade`

### **Pattern 3: Custom DEXes**

- **Examples**: 1inch, 0x Protocol
- **Implementation**: Custom interface and executor
- **Requirement**: Implement `IUniversalDexInterface`

## 📊 **Gas Costs for DEX Addition**

| Operation      | Gas Cost       | Cost (20 gwei) |
| -------------- | -------------- | -------------- |
| Deploy Fetcher | ~200K-500K     | $4-10          |
| Register DEX   | ~50K-100K      | $1-2           |
| Set Router     | ~30K-50K       | $0.6-1         |
| **Total**      | **~280K-650K** | **$5.6-13**    |

## 🧪 **Testing New DEX Integration**

### **1. Local Testing**

```bash
# Test on local fork
npm run deploy:mainnet:simulate
```

### **2. Testnet Testing**

```bash
# Deploy to testnet first
forge script script/DeployTestnet.s.sol --rpc-url $TESTNET_RPC_URL
```

### **3. Mainnet Testing**

```bash
# Test with small amounts
# Verify reserve fetching works
# Test trade execution
```

## ⚠️ **Important Considerations**

### **1. DEX Type String Matching**

```solidity
// for fetcher
function getDexType() external pure override returns (string memory) {
    return "PancakeSwap"; // Must match exactly
}

// fro registry
registry.setRouter("PancakeSwap", routerAddress); // Must match exactly
```

### **2. Router Address Validation**

```solidity
// verify router address always
require(router != address(0), "Invalid router address");
```

### **3. Error Handling**

```solidity
// implement proper error handling in fetchers
try fetcher.getReserves(tokenA, tokenB) returns (uint256, uint256) {
    // Success
} catch {
    // Handle failure gracefully
}
```

## 🔄 **Removing DEXes**

```solidity
streamDaemon.removeDex(address(oldFetcher));

// & clear router mapping
registry.setRouter("OldDEX", address(0));
```

## 📈 **Scaling Considerations**

### **Current Limits**

- **DEX Array**: Dynamic (no hard limit)
- **Router Mapping**: Dynamic (no hard limit)
- **Gas Impact**: Minimal for additional DEXes

### **Optimization Tips**

- Batch DEX additions in single transaction
- Use events for off-chain monitoring
- Consider DEX prioritization for gas efficiency

## 🎯 **Example: Adding PancakeSwap**

```bash
# 1. Deploy Fetcher
forge create src/adapters/PancakeSwapFetcher.sol:PancakeSwapFetcher \
    --rpc-url $MAINNET_RPC_URL \
    --private-key $PRIVATE_KEY \
    --constructor-args 0x10ED43C718714eb63d5aA57B78B54704E256024E

# 2. Set environment variables
export PANCAKESWAP_FETCHER=0x... # Deployed address
export PANCAKESWAP_ROUTER=0x10ED43C718714eb63d5aA57B78B54704E256024E

# 3. Register DEX
cast send $STREAM_DAEMON_ADDRESS "registerDex(address)" $PANCAKESWAP_FETCHER \
    --rpc-url $MAINNET_RPC_URL \
    --private-key $PRIVATE_KEY

# 4. Configure Router
cast send $REGISTRY_ADDRESS "setRouter(string,address)" "PancakeSwap" $PANCAKESWAP_ROUTER \
    --rpc-url $MAINNET_RPC_URL \
    --private-key $PRIVATE_KEY
```

## 🏁 **Verification Checklist**

- [ ] Fetcher contract deployed successfully
- [ ] DEX registered in StreamDaemon
- [ ] Router configured in Registry
- [ ] Reserve fetching works for test pairs
- [ ] Trade execution works
- [ ] Error handling implementations operate

--
