# Contract Structure Changes - Subgraph Update

## Overview

The subgraph has been updated to reflect the new contract architecture. The main changes are:

1. **Consolidated Contracts**: Router and Fees contracts are no longer separate - their functionality has been moved into the Core contract
2. **New Fee Events**: Core contract now emits additional fee-related events
3. **Updated Event Signatures**: Some event signatures have changed to match the new contract structure

## Contract Changes

### Before (Old Structure)
- **Core Contract**: TradeCreated, TradeStreamExecuted, TradeCancelled, TradeSettled
- **Router Contract**: InstaSettleConfigured
- **StreamDaemon Contract**: DEXRouteAdded, DEXRouteRemoved  
- **Fees Contract**: FeesClaimed

### After (New Structure)
- **Core Contract**: 
  - TradeCreated (updated signature)
  - TradeStreamExecuted (same)
  - TradeCancelled (same)
  - TradeSettled (same)
  - **NEW**: StreamFeesTaken, InstasettleFeeTaken, FeesClaimed, FeeRatesUpdated
- **StreamDaemon Contract**: DEXRouteAdded, DEXRouteRemoved (same)
- **Executor Contract**: TradeExecuted (internal event, not indexed)
- **Registry Contract**: No events

## Schema Changes

### New Entities Added
- `StreamFee` - Tracks stream execution fees
- `InstasettleFee` - Tracks instasettle fees
- `FeeRateUpdate` - Tracks fee rate changes

### Entities Removed
- `InstaSettleConfig` - No longer needed (InstaSettleConfigured event removed)

### Entities Updated
- `Trade` - Added `usePriceBased` field, removed `botGasAllowance` and `cumulativeGasEntailed`
- `TradeExecution` - Removed `cumulativeGasEntailed` field
- `FeeClaim` - Updated to match new event signature

## Event Signature Changes

### TradeCreated Event
**Old**: `TradeCreated(indexed uint256,indexed address,address,address,uint256,uint256,uint256,uint256,bool,uint256,uint256,uint96,uint256)`

**New**: `TradeCreated(indexed uint256,indexed address,address,address,uint256,uint256,uint256,uint256,bool,uint256,uint256,bool)`

**Changes**:
- Removed `botGasAllowance` parameter
- Removed `cumulativeGasEntailed` parameter  
- Added `usePriceBased` parameter (bool)

### TradeStreamExecuted Event
**Old**: `TradeStreamExecuted(indexed uint256,uint256,uint256,uint256,uint256)`

**New**: `TradeStreamExecuted(indexed uint256,uint256,uint256,uint256)`

**Changes**:
- Removed `cumulativeGasEntailed` parameter

### FeesClaimed Event
**Old**: `FeesClaimed(indexed address,indexed address,uint256)`

**New**: `FeesClaimed(indexed address,indexed address,uint256,bool)`

**Changes**:
- Added `isProtocol` parameter (bool)
- Parameter names changed: `bot` → `recipient`, `feeToken` → `token`

## New Events

### StreamFeesTaken
```solidity
event StreamFeesTaken(
    uint256 indexed tradeId, 
    address indexed bot, 
    address indexed token, 
    uint256 protocolFee, 
    uint256 botFee
);
```

### InstasettleFeeTaken
```solidity
event InstasettleFeeTaken(
    uint256 indexed tradeId, 
    address indexed settler, 
    address indexed token, 
    uint256 protocolFee
);
```

### FeeRatesUpdated
```solidity
event FeeRatesUpdated(
    uint16 streamProtocolFeeBps, 
    uint16 streamBotFeeBps, 
    uint16 instasettleProtocolFeeBps
);
```

## Migration Notes

1. **ABI Files**: Only `Core.json` and `StreamDaemon.json` are needed now
2. **Contract Addresses**: Only need Core and StreamDaemon contract addresses
3. **Start Blocks**: Only need deployment blocks for Core and StreamDaemon
4. **Event Handlers**: All fee-related events are now handled from Core contract

## Deployment Impact

- **Reduced Complexity**: Only 2 contracts to monitor instead of 4
- **Better Fee Tracking**: More granular fee tracking with separate entities
- **Simplified Configuration**: Fewer contract addresses and start blocks to manage

## Backward Compatibility

This is a **breaking change** - the new subgraph structure is not compatible with the old contract structure. You must:

1. Update contract addresses in configuration files
2. Regenerate ABI files if contracts have changed
3. Update any frontend queries that reference the old entity structure
4. Redeploy the subgraph with the new configuration
