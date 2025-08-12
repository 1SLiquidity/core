// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../interfaces/IUniversalDexInterface.sol";

/**
 * @title PancakeSwap Fetcher
 * @notice Fetches reserves and pool data from PancakeSwap
 * @dev Based on DEXTemplate, customized for PancakeSwap
 */
contract PancakeSwapFetcher is IUniversalDexInterface {
    address public factory;
    
    constructor(address _factory) {
        factory = _factory;
    }

    /**
     * @notice Get reserves for a token pair from PancakeSwap
     * @param tokenA First token address
     * @param tokenB Second token address
     * @return reserveA Reserve of tokenA
     * @return reserveB Reserve of tokenB
     */
    function getReserves(address tokenA, address tokenB)
        external
        view
        override
        returns (uint256 reserveA, uint256 reserveB)
    {
        // PancakeSwap uses the same interface as UniswapV2
        address pair = IPancakeSwapFactory(factory).getPair(tokenA, tokenB);
        require(pair != address(0), "PancakeSwap: Pair does not exist");
        
        (uint112 reserve0, uint112 reserve1,) = IPancakeSwapPair(pair).getReserves();
        address token0 = IPancakeSwapPair(pair).token0();

        // Return reserves in the correct order
        if (tokenA == token0) {
            return (uint256(reserve0), uint256(reserve1));
        } else {
            return (uint256(reserve1), uint256(reserve0));
        }
    }

    /**
     * @notice Get pool address for a token pair
     * @param tokenIn Input token address
     * @param tokenOut Output token address
     * @return pool address
     */
    function getPoolAddress(address tokenIn, address tokenOut) 
        external 
        view 
        override 
        returns (address) 
    {
        return IPancakeSwapFactory(factory).getPair(tokenIn, tokenOut);
    }

    /**
     * @notice Get DEX type identifier
     * @return DEX type string (used in Registry.sol)
     */
    function getDexType() external pure override returns (string memory) {
        return "PancakeSwap";
    }

    /**
     * @notice Get DEX version
     * @return DEX version string
     */
    function getDexVersion() external pure override returns (string memory) {
        return "V2";
    }
}

// PancakeSwap-specific interfaces
interface IPancakeSwapFactory {
    function getPair(address tokenA, address tokenB) external view returns (address pair);
}

interface IPancakeSwapPair {
    function getReserves() external view returns (uint112, uint112, uint32);
    function token0() external view returns (address);
    function token1() external view returns (address);
} 