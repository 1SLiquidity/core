// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../interfaces/IUniversalDexInterface.sol";

interface ISushiSwapFactory {
    function getPair(address tokenA, address tokenB) external view returns (address pair);
}

interface ISushiSwapPair {
    function getReserves() external view returns (uint112, uint112, uint32);
    function token0() external view returns (address);
    function token1() external view returns (address);
}

/**
 * @dev dynamically configurable fetcher for SushiSwap pools
 */
contract SushiswapFetcher is IUniversalDexInterface {
    address public factory;
    
    constructor(address _factory) {
        factory = _factory;
    }
    
    /**
     * @dev return reserves for token pair
     * @param tokenA First token in the pair
     * @param tokenB Second token in the pair
     * @return reserveA Reserve of tokenA
     * @return reserveB Reserve of tokenB
     */
    function getReserves(address tokenA, address tokenB) external view override returns (uint256 reserveA, uint256 reserveB) {
        address pair = ISushiSwapFactory(factory).getPair(tokenA, tokenB);
        
        if (pair == address(0)) {
            // @audit this should be a revert or throw a custom error
            // during runtime, a fail here may resul in stale persisting transactions and could bottleneck the protocol
            // if used as an atack vector (dos)
            return (0, 0);
        }
        
        (uint112 reserve0, uint112 reserve1, ) = ISushiSwapPair(pair).getReserves();
        address token0 = ISushiSwapPair(pair).token0();
        if (tokenA == token0) {
            return (uint256(reserve0), uint256(reserve1));
        } else {
            return (uint256(reserve1), uint256(reserve0));
        }
    }
}